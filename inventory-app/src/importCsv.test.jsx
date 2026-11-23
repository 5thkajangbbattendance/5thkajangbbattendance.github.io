import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { readImport, parseRows, TEMPLATE_CSV } from './importCsv.js';
import { SAMPLE_ITEMS, toCSV } from './inventory.js';
import { localStore } from './store.js';

const summary = res => res.rows.map(r => r.action + ':' + r.item.name + '/' + r.item.section + '/' + r.item.category + '/' + r.item.stock + '/' + r.item.threshold + '/' + r.item.priceSen);

describe('reading a CSV file', () => {
  it('reads a file made by Export CSV, matching items already in the inventory', () => {
    const csv = toCSV(SAMPLE_ITEMS).replace('Haversack,Senior,Equipment,2,3,11.40', 'Haversack,Senior,Equipment,9,3,12.00');
    const res = readImport(csv, SAMPLE_ITEMS);
    expect(res.problems).toEqual([]);
    expect(res.rows.map(r => r.action)).toEqual(['update', 'update', 'update', 'update', 'update']);
    const hav = res.rows.find(r => r.item.name === 'Haversack');
    expect(hav.item.id).toBe('s4');                       // the same item, not a copy
    expect([hav.existing.stock, hav.item.stock, hav.item.priceSen]).toEqual([2, 9, 1200]);
    expect(readImport(csv, SAMPLE_ITEMS, { onExisting: 'skip' }).rows.every(r => r.action === 'skip')).toBe(true);
  });

  it('reads the template', () => {
    const res = readImport(TEMPLATE_CSV, []);
    expect(summary(res)).toEqual(['new:Brigade Tee (M)/junior/Uniform/5/3/3500', 'new:Target Badge/senior/Badges/21/5/250']);
  });

  it('reads a simple Item, Size, Qty list: sizes go into the name, section and category are worked out from the name', () => {
    const res = readImport('Item,Size,Qty\nJunior Shirt,XS,3\nUsed Senior Boots,UK 6,1\nSenior badge: Target,,21\nLanyard,,4\n', []);
    expect(summary(res)).toEqual(['new:Used Senior Boots (UK 6)/senior/Used Uniform/1/0/0', 'new:Senior badge: Target/senior/Badges/21/0/0']);
    // Junior Shirt has no category and Lanyard no section: they need a choice
    expect(res.problems.map(p => p.line)).toEqual([2, 5]);
    expect(res.needs).toEqual({ section: true, category: true });
    expect(res.notes.join(' ')).toMatch(/No price column/);
    const filled = readImport('Item,Size,Qty\nJunior Shirt,XS,3\nLanyard,,4\n', [], { defaultSection: 'officers', defaultCategory: 'Equipment' });
    expect(summary(filled)).toEqual(['new:Junior Shirt (XS)/junior/Equipment/3/0/0', 'new:Lanyard/officers/Equipment/4/0/0']);
  });

  it('says exactly which lines have problems, and leaves only those out', () => {
    const csv = [
      'Item Name,Section,Category,Stock Level,Reorder Threshold,Unit Price (RM)',
      'Good Tee,Junior,Uniform,5,2,10',
      'Bad Section,Cubs,Uniform,1,0,0',
      'Bad Stock,Junior,Uniform,2.5,0,0',
      'Bad Price,Junior,Uniform,1,0,abc',
      ',Junior,Uniform,1,0,0',
      'good tee,junior,uniform,9,9,9',
      'Second Tee,Senior,Uniform,,,',
    ].join('\n');
    const res = readImport(csv, []);
    expect(res.rows.map(r => r.item.name)).toEqual(['Good Tee', 'Second Tee']);
    expect(res.rows[1].item).toMatchObject({ stock: 0, threshold: 0, priceSen: 0 });       // empty numbers are 0
    expect(res.problems).toEqual([
      { line: 3, message: '"Cubs" is not a section. Use Pre-Junior, Junior, Senior, Officers or Primers.' },
      { line: 4, message: 'Stock "2.5" is not a whole number from 0 to 100000.' },
      { line: 5, message: 'Unit price "abc" is not a price such as 12.50.' },
      { line: 6, message: 'No item name.' },
      { line: 7, message: 'Same item as line 2 (good tee, Junior, Uniform); only the first is used.' },
    ]);
  });

  it('copes with Excel and Google Sheets files: semicolons, tabs, quotes, a BOM, RM prices and protected cells', () => {
    expect(parseRows('a;b;c\n1;2;3').map(r => r.cells)).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
    expect(parseRows('a\tb\n"x, y"\t2').map(r => r.cells)).toEqual([['a', 'b'], ['x, y', '2']]);
    const res = readImport('﻿Item Name;Section;Category;Stock Level;Unit Price (RM)\n"Shirt, ""XL""";Senior;Uniform;2;RM 1,200.50\n\'=Sum;Junior;Uniform;1;0', []);
    expect(summary(res)).toEqual(['new:Shirt, "XL"/senior/Uniform/2/0/120050', 'new:=Sum/junior/Uniform/1/0/0']);
  });

  it('works without a header row (Export CSV column order)', () => {
    const res = readImport('Belt,Junior,Uniform,4,1,8.00', []);
    expect(summary(res)).toEqual(['new:Belt/junior/Uniform/4/1/800']);
    expect(res.notes[0]).toMatch(/no header row/);
  });

  it('a whole previous list: 75 rows, all new, nothing left out', () => {
    const lines = ['Item Name,Section,Category,Stock Level,Reorder Threshold,Unit Price (RM)'];
    for (let i = 0; i < 75; i++) lines.push('Item ' + i + ',' + ['Pre-Junior', 'Junior', 'Senior', 'Officers', 'Primers'][i % 5] + ',' + ['Uniform', 'Used Uniform', 'Badges'][i % 3] + ',' + (i % 7) + ',0,0.00');
    const res = readImport(lines.join('\r\n'), []);
    expect(res.rows).toHaveLength(75);
    expect(res.problems).toEqual([]);
    expect(new Set(res.rows.map(r => r.item.id)).size).toBe(75);
  });
});

describe('Import CSV on the page', () => {
  const paste = async (u, text) => {
    await u.click(screen.getByText('Or paste rows copied from a spreadsheet'));
    const box = screen.getByLabelText('Rows to import');
    await u.click(box);
    await u.paste(text);
  };

  it('shows what will happen, then imports: new rows are added and matching items updated', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Import CSV' }));
    const dlg = screen.getByRole('dialog', { name: 'Import CSV' });
    expect(within(dlg).getByRole('button', { name: 'Import' })).toBeDisabled();
    await paste(u, 'Item Name,Section,Category,Stock Level,Reorder Threshold,Unit Price (RM)\nBrigade Tee (M),Junior,Uniform,5,3,35\nHaversack,Senior,Equipment,9,3,11.40\nOops,Cubs,Uniform,1,0,0');
    expect(within(dlg).getByText(/2 items ready/).closest('p')).toHaveTextContent('2 items ready: 1 new, 1 updated · 1 row has a problem and is left out');
    expect(within(dlg).getByText(/Line 4:/).closest('li')).toHaveTextContent('"Cubs" is not a section');
    expect(within(dlg).getByText('Update (stock 2 → 9)')).toBeInTheDocument();
    await u.click(within(dlg).getByRole('button', { name: 'Import 2 items' }));
    expect(screen.queryByRole('dialog', { name: 'Import CSV' })).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Imported: 1 added, 1 updated, 1 left out.');
    const rows = screen.getAllByRole('row').slice(1).map(r => within(r).getByRole('rowheader').textContent);
    expect(rows).toEqual(['Junior Shirt', 'Field Service Cap', 'Senior Cap Badge', 'Haversack', 'Handbook (English)', 'Brigade Tee (M)']);
    const hav = screen.getAllByRole('row').find(r => within(r).queryByRole('rowheader', { name: 'Haversack' }));
    expect(hav.querySelector('[data-label="Stock level"]')).toHaveTextContent('9');
    expect(hav.querySelector('[data-label="Status"]')).toHaveTextContent('In Stock');
  });

  it('Cancel imports nothing; "Leave it as it is" keeps existing items unchanged', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Import CSV' }));
    await paste(u, 'Item Name,Section,Category,Stock Level\nHaversack,Senior,Equipment,50\nNew Thing,Primers,Books,1');
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getAllByRole('row')).toHaveLength(6);
    await u.click(screen.getByRole('button', { name: 'Import CSV' }));
    await paste(u, 'Item Name,Section,Category,Stock Level\nHaversack,Senior,Equipment,50\nNew Thing,Primers,Books,1');
    await u.click(screen.getByLabelText('Leave it as it is'));
    expect(screen.getByText(/1 item ready/).closest('p')).toHaveTextContent('1 item ready: 1 new · 1 already there, left as they are');
    await u.click(screen.getByRole('button', { name: 'Import 1 item' }));
    const hav = screen.getAllByRole('row').find(r => within(r).queryByRole('rowheader', { name: 'Haversack' }));
    expect(hav.querySelector('[data-label="Stock level"]')).toHaveTextContent('2');
  });

  it('rows without a section can be given one in the window', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Import CSV' }));
    await paste(u, 'Item,Qty\nLanyard,4\nWhistle,2');
    expect(screen.getByText(/Nothing to import yet/)).toBeInTheDocument();
    await u.selectOptions(screen.getByLabelText('Rows with no section go to'), 'officers');
    await u.selectOptions(screen.getByLabelText('Rows with no category go to'), 'Equipment');
    await u.click(screen.getByRole('button', { name: 'Import 2 items' }));
    expect(screen.getByRole('status')).toHaveTextContent('Imported: 2 added, 0 updated.');
  });

  it('the template downloads from the window', async () => {
    const u = userEvent.setup();
    const files = [];
    URL.createObjectURL = vi.fn(b => { files.push(b); return 'blob:t'; });
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = vi.fn(function () { files[files.length - 1].name = this.download; });
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Import CSV' }));
    await u.click(screen.getByRole('button', { name: 'Download template' }));
    expect(files[0].name).toBe('inventory-template.csv');
  });

  it('only the Owner, Admin and Uniform logins get Import CSV', () => {
    const mk = duty => ({ ...localStore(), mode: 'firebase', me: { duty }, subscribeMeta: cb => { cb({}); return () => {}; } });
    const { unmount } = render(<App store={mk('leader')} />);
    expect(screen.queryByRole('button', { name: 'Import CSV' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    unmount();
    render(<App store={mk('uni')} />);
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
  });
});
