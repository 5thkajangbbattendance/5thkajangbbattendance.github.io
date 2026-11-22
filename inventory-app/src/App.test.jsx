import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { totalSen, statusOf, formatRM, parsePriceSen, parseCount } from './inventory.js';

const rows = () => screen.getAllByRole('row').slice(1);
const rowOf = name => rows().find(r => within(r).queryByRole('rowheader', { name }));
const cell = (row, label) => row.querySelector('[data-label="' + label + '"]');
const panel = () => screen.getByRole('region', { name: 'Reorder Alert' });
const alerts = () => within(panel()).queryAllByRole('listitem').map(li => li.querySelector('b').textContent + ': ' + li.querySelector('.status').textContent);
const editRow = () => screen.getAllByRole('row').find(x => x.classList.contains('editing'));
async function setStock(u, name, n) {
  await u.click(screen.getByRole('button', { name: 'Edit ' + name }));
  const f = within(editRow()).getByLabelText('Stock level');
  await u.clear(f); await u.type(f, String(n));
  await u.click(within(editRow()).getByRole('button', { name: 'Save' }));
}

beforeEach(() => { try { localStorage.clear(); } catch { /* none */ } });

describe('inventory rules', () => {
  it('Total Value is Stock Level × Unit Price, in whole sen', () => {
    expect(totalSen(6, 3500)).toBe(21000);
    expect(totalSen(3, 1140)).toBe(3420);       // 3 × 11.40 = 34.20 exactly, no 34.199999
    expect(totalSen(0, 650)).toBe(0);
    expect(formatRM(13750)).toBe('RM\u00a0137.50');
    expect(formatRM(123456789)).toBe('RM\u00a01,234,567.89');
  });
  it('Status: out at 0, low at or below the threshold, otherwise in stock', () => {
    expect(statusOf(0, 5)).toBe('out');
    expect(statusOf(3, 3)).toBe('low');
    expect(statusOf(4, 3)).toBe('ok');
    expect(statusOf(1, 3)).toBe('low');
    expect(statusOf(1, 0)).toBe('ok');      // threshold 0: any stock is In Stock
    expect(statusOf(0, 0)).toBe('out');
  });
  it('reads prices and counts strictly', () => {
    expect(parsePriceSen('12.5')).toBe(1250);
    expect(parsePriceSen('0.1')).toBe(10);
    expect(Number.isNaN(parsePriceSen('1.234'))).toBe(true);
    // the ways people actually type prices
    expect(parsePriceSen('12,50')).toBe(1250);
    expect(parsePriceSen('RM 12')).toBe(1200);
    expect(parsePriceSen('rm12.50')).toBe(1250);
    expect(parsePriceSen('1,200')).toBe(120000);
    expect(parsePriceSen('1,200.50')).toBe(120050);
    expect(parsePriceSen('12.')).toBe(1200);
    expect(parsePriceSen('.5')).toBe(50);
    expect(Number.isNaN(parsePriceSen('abc'))).toBe(true);
    expect(parseCount('1,000')).toBe(1000);
    expect(Number.isNaN(parsePriceSen('-1'))).toBe(true);
    expect(Number.isNaN(parseCount('2.5'))).toBe(true);
    expect(parseCount('0')).toBe(0);
  });
});

describe('the app', () => {
  it('opens with 5 sample items, with the right totals and statuses', () => {
    render(<App />);
    expect(rows()).toHaveLength(5);
    const headers = screen.getAllByRole('columnheader').map(h => h.textContent).slice(0, 7);
    expect(headers).toEqual(['Item Name', 'Category', 'Stock Level', 'Reorder Threshold', 'Unit Price', 'Total Value', 'Status']);
    expect(cell(rowOf('Junior Shirt'), 'Total value')).toHaveTextContent('RM 210.00');
    expect(cell(rowOf('Field Service Cap'), 'Total value')).toHaveTextContent('RM 137.50');
    expect(cell(rowOf('Senior Cap Badge'), 'Status')).toHaveTextContent('Low Stock');
    expect(cell(rowOf('Handbook (English)'), 'Status')).toHaveTextContent('Out of Stock');
    expect(cell(rowOf('Junior Shirt'), 'Status')).toHaveTextContent('In Stock');
  });

  it('has no field for Total Value: it cannot be typed in', () => {
    render(<App />);
    expect(screen.queryByLabelText(/total value/i)).toBeNull();
  });

  it('adds an item, showing the total live while typing', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText('Item name'), 'Brigade Tee');
    await u.type(screen.getByLabelText('Category'), 'Uniform');
    await u.type(screen.getByLabelText('Stock level'), '12');
    await u.type(screen.getByLabelText('Reorder threshold'), '4');
    const preview = screen.getByText(/^Total value/).closest('p');
    expect(preview).toHaveTextContent('RM 0.00');
    expect(preview).toHaveTextContent('Fill in the unit price');
    await u.type(screen.getByLabelText('Unit price (RM)'), '25');
    expect(preview).toHaveTextContent('RM 300.00');
    expect(preview).toHaveTextContent('12 × RM 25.00');
    await u.clear(screen.getByLabelText('Stock level')); await u.type(screen.getByLabelText('Stock level'), '3');
    expect(preview).toHaveTextContent('RM 75.00');
    await u.click(screen.getByRole('button', { name: 'Add item' }));
    expect(rows()).toHaveLength(6);
    const r = rowOf('Brigade Tee');
    expect(cell(r, 'Total value')).toHaveTextContent('RM 75.00');
    expect(cell(r, 'Status')).toHaveTextContent('Low Stock');
    expect(screen.getByLabelText('Item name')).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('Brigade Tee added.');
  });

  it('refuses an incomplete or invalid item and says why', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByLabelText('Item name'), 'junior shirt');
    await u.type(screen.getByLabelText('Stock level'), '2.5');
    await u.type(screen.getByLabelText('Unit price (RM)'), 'abc');
    await u.click(screen.getByRole('button', { name: 'Add item' }));
    expect(rows()).toHaveLength(5);
    expect(screen.getByText('An item with this name already exists.')).toBeInTheDocument();
    expect(screen.getByText('Choose or type a category.')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a whole number, 0 or more.')).toHaveLength(2);
    expect(screen.getByText('Enter a price such as 12.50 (up to 2 decimals).')).toBeInTheDocument();
    expect(screen.getByText(/^Total value/).closest('p')).toHaveTextContent('Check the stock level and the unit price');
  });

  it('the total works with prices typed as 12,50 or RM 12 and quantities like 1,000', async () => {
    const u = userEvent.setup();
    render(<App />);
    const preview = screen.getByText(/^Total value/).closest('p');
    expect(preview).toHaveTextContent('Fill in the stock level and the unit price');
    await u.type(screen.getByLabelText('Stock level'), '6');
    await u.type(screen.getByLabelText('Unit price (RM)'), '12,50');
    expect(preview).toHaveTextContent('RM 75.00');
    await u.clear(screen.getByLabelText('Unit price (RM)')); await u.type(screen.getByLabelText('Unit price (RM)'), 'RM 12');
    expect(preview).toHaveTextContent('RM 72.00');
    await u.clear(screen.getByLabelText('Stock level')); await u.type(screen.getByLabelText('Stock level'), '1,000');
    expect(preview).toHaveTextContent('RM 12,000.00');
    await u.clear(screen.getByLabelText('Unit price (RM)')); await u.type(screen.getByLabelText('Unit price (RM)'), 'twelve');
    expect(preview).toHaveTextContent('Check the unit price, e.g. 12.50');
  });

  it('edits a row; Total Value and Status update instantly as Stock or Price change', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Edit Haversack' }));
    const r = screen.getAllByRole('row').find(x => x.classList.contains('editing'));
    const stock = within(r).getByLabelText('Stock level'), price = within(r).getByLabelText('Unit price (RM)');
    expect(cell(r, 'Total value')).toHaveTextContent('RM 22.80');
    await u.clear(stock); await u.type(stock, '10');
    expect(cell(r, 'Total value')).toHaveTextContent('RM 114.00');
    expect(cell(r, 'Status')).toHaveTextContent('In Stock');
    await u.clear(price); await u.type(price, '12');
    expect(cell(r, 'Total value')).toHaveTextContent('RM 120.00');
    await u.click(within(r).getByRole('button', { name: 'Save' }));
    const saved = rowOf('Haversack');
    expect(cell(saved, 'Stock level')).toHaveTextContent('10');
    expect(cell(saved, 'Unit price')).toHaveTextContent('RM 12.00');
    expect(cell(saved, 'Total value')).toHaveTextContent('RM 120.00');
    expect(screen.getByRole('button', { name: 'Edit Haversack' })).toHaveFocus();
  });

  it('Cancel (or Esc) leaves the row as it was', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Edit Junior Shirt' }));
    const r = screen.getAllByRole('row').find(x => x.classList.contains('editing'));
    await u.clear(within(r).getByLabelText('Stock level')); await u.type(within(r).getByLabelText('Stock level'), '99');
    await u.keyboard('{Escape}');
    expect(cell(rowOf('Junior Shirt'), 'Stock level')).toHaveTextContent('6');
  });

  it('asks before deleting; Cancel keeps the item, Delete removes it', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Delete Senior Cap Badge' }));
    let dlg = screen.getByRole('alertdialog');
    expect(dlg).toHaveTextContent('Delete Senior Cap Badge?');
    expect(within(dlg).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await u.click(within(dlg).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(rows()).toHaveLength(5);

    await u.click(screen.getByRole('button', { name: 'Delete Senior Cap Badge' }));
    await u.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(rows()).toHaveLength(5);

    await u.click(screen.getByRole('button', { name: 'Delete Senior Cap Badge' }));
    dlg = screen.getByRole('alertdialog');
    await u.click(within(dlg).getByRole('button', { name: 'Delete item' }));
    expect(rows()).toHaveLength(4);
    expect(rowOf('Senior Cap Badge')).toBeUndefined();
    expect(screen.getByRole('status')).toHaveTextContent('Senior Cap Badge deleted.');
  });

  it('every row has a green, amber or red badge with the exact wording', () => {
    render(<App />);
    const badges = rows().map(r => cell(r, 'Status').querySelector('.status'));
    expect(badges.map(b => b.textContent)).toEqual(['In Stock', 'In Stock', 'Low Stock', 'Low Stock', 'Out of Stock']);
    expect(badges.map(b => b.className)).toEqual(['status ok', 'status ok', 'status low', 'status low', 'status out']);
    expect(screen.queryByLabelText(/^status$/i)).toBeNull();   // no field to type a status in
  });

  it('the badge changes the moment the stock level is typed, before saving', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Edit Junior Shirt' }));     // 6, reorder at 3
    const f = within(editRow()).getByLabelText('Stock level');
    await u.clear(f); await u.type(f, '3');
    expect(cell(editRow(), 'Status')).toHaveTextContent('Low Stock');
    await u.clear(f); await u.type(f, '0');
    expect(cell(editRow(), 'Status')).toHaveTextContent('Out of Stock');
    await u.clear(f); await u.type(f, '4');
    expect(cell(editRow(), 'Status')).toHaveTextContent('In Stock');
  });

  it('Reorder Alert sits above the table and lists every Low Stock and Out of Stock item, Out of Stock first', () => {
    render(<App />);
    const p = panel(), table = screen.getByRole('table');
    expect(p.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(alerts()).toEqual(['Handbook (English): Out of Stock', 'Senior Cap Badge: Low Stock', 'Haversack: Low Stock']);
    expect(p).toHaveTextContent('3 items need reordering');
    expect(within(p).getByText('Senior Cap Badge').closest('li')).toHaveTextContent('7 in stock · reorder at 10');
  });

  it('badges and the alert update by themselves when stock changes (edit, add, delete)', async () => {
    const u = userEvent.setup();
    render(<App />);
    await setStock(u, 'Haversack', 10);                      // restocked: leaves the alert
    expect(cell(rowOf('Haversack'), 'Status')).toHaveTextContent('In Stock');
    expect(alerts()).toEqual(['Handbook (English): Out of Stock', 'Senior Cap Badge: Low Stock']);
    await setStock(u, 'Junior Shirt', 0);                    // sold out: joins the alert
    expect(cell(rowOf('Junior Shirt'), 'Status')).toHaveTextContent('Out of Stock');
    expect(alerts()[0]).toMatch(/: Out of Stock$/);
    expect(alerts()).toContain('Junior Shirt: Out of Stock');
    await setStock(u, 'Field Service Cap', 5);               // exactly at the threshold: Low Stock
    expect(alerts()).toContain('Field Service Cap: Low Stock');

    await u.type(screen.getByLabelText('Item name'), 'Lanyard');
    await u.type(screen.getByLabelText('Category'), 'Equipment');
    await u.type(screen.getByLabelText('Stock level'), '1');
    await u.type(screen.getByLabelText('Reorder threshold'), '2');
    await u.type(screen.getByLabelText('Unit price (RM)'), '3');
    await u.click(screen.getByRole('button', { name: 'Add item' }));
    expect(alerts()).toContain('Lanyard: Low Stock');

    await u.click(screen.getByRole('button', { name: 'Delete Lanyard' }));
    await u.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete item' }));
    expect(alerts()).not.toContain('Lanyard: Low Stock');
  });

  it('says so when nothing needs reordering', async () => {
    const u = userEvent.setup();
    render(<App />);
    await setStock(u, 'Senior Cap Badge', 20);
    await setStock(u, 'Haversack', 9);
    await setStock(u, 'Handbook (English)', 12);
    expect(alerts()).toEqual([]);
    expect(panel()).toHaveTextContent('Nothing to reorder');
    expect(panel()).toHaveTextContent('Every item is above its reorder threshold.');
  });
});
