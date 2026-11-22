import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { totalSen, statusOf, formatRM, parsePriceSen, parseCount, viewItems, SAMPLE_ITEMS, summarize } from './inventory.js';

const rows = () => screen.queryAllByRole('row').slice(1);
const rowOf = name => rows().find(r => within(r).queryByRole('rowheader', { name }));
const cell = (row, label) => row.querySelector('[data-label="' + label + '"]');
const panel = () => screen.getByRole('region', { name: 'Reorder Alert' });
const alerts = () => within(panel()).queryAllByRole('listitem').map(li => li.querySelector('b').textContent + ': ' + li.querySelector('.status').textContent);
const names = () => rows().map(r => within(r).getByRole('rowheader').textContent);
const header = name => screen.getByRole('button', { name: new RegExp('^' + name.replace(/[()]/g, '\\$&') + '$') });
const summary = () => document.querySelector('.tools-sum').textContent;
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
    await u.type(screen.getByLabelText('Category', { selector: 'input' }), 'Uniform');
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
    expect(screen.queryByRole('textbox', { name: /status/i })).toBeNull();   // no field to type a status in
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
    await u.type(screen.getByLabelText('Category', { selector: 'input' }), 'Equipment');
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

  it('search filters as you type, by name or category, any case, no button', async () => {
    const u = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole('button', { name: /^search$/i })).toBeNull();
    const box = screen.getByRole('searchbox', { name: 'Search items' });
    await u.type(box, 'c');
    expect(names()).toEqual(['Field Service Cap', 'Senior Cap Badge', 'Haversack']);
    await u.type(box, 'ap');                                   // "cap"
    expect(names()).toEqual(['Field Service Cap', 'Senior Cap Badge']);
    expect(summary()).toContain('Showing 2 of 5 items');
    await u.clear(box); await u.type(box, 'UNIFORM');          // matches the category
    expect(names()).toEqual(['Junior Shirt', 'Field Service Cap']);
    await u.clear(box); await u.type(box, 'badge senior');     // every word, any order
    expect(names()).toEqual(['Senior Cap Badge']);
    await u.type(box, '{Escape}');
    expect(box).toHaveValue('');
    expect(rows()).toHaveLength(5);
  });

  it('Category and Status dropdowns show only matching items', async () => {
    const u = userEvent.setup();
    render(<App />);
    const cat = screen.getByLabelText('Category', { selector: 'select' }), st = screen.getByLabelText('Status', { selector: 'select' });
    expect([...cat.options].map(o => o.textContent)).toEqual(['All categories (5)', 'Badges (1)', 'Books (1)', 'Equipment (1)', 'Uniform (2)']);
    expect([...st.options].map(o => o.textContent)).toEqual(['All (5)', 'In Stock (2)', 'Low Stock (2)', 'Out of Stock (1)']);
    await u.selectOptions(cat, 'Uniform');
    expect(names()).toEqual(['Junior Shirt', 'Field Service Cap']);
    await u.selectOptions(cat, '');
    await u.selectOptions(st, 'low');
    expect(names()).toEqual(['Senior Cap Badge', 'Haversack']);
    await u.selectOptions(st, 'out');
    expect(names()).toEqual(['Handbook (English)']);
  });

  it('column headers sort ascending, then descending', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(header('Item Name'));
    expect(names()).toEqual(['Field Service Cap', 'Handbook (English)', 'Haversack', 'Junior Shirt', 'Senior Cap Badge']);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'ascending');
    await u.click(header('Item Name'));
    expect(names()).toEqual(['Senior Cap Badge', 'Junior Shirt', 'Haversack', 'Handbook (English)', 'Field Service Cap']);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'descending');
    await u.click(header('Total Value'));                       // a new column starts ascending
    expect(names()).toEqual(['Handbook (English)', 'Haversack', 'Senior Cap Badge', 'Field Service Cap', 'Junior Shirt']);
    expect(screen.getAllByRole('columnheader')[0]).toHaveAttribute('aria-sort', 'none');
    await u.click(header('Stock Level')); await u.click(header('Stock Level'));
    expect(names()).toEqual(['Field Service Cap', 'Senior Cap Badge', 'Junior Shirt', 'Haversack', 'Handbook (English)']);
    await u.click(header('Status'));                            // most urgent first
    expect(names()).toEqual(['Handbook (English)', 'Haversack', 'Senior Cap Badge', 'Field Service Cap', 'Junior Shirt']);
    await u.click(header('Unit Price'));
    expect(names()[0]).toBe('Senior Cap Badge');               // RM 5.00
    await u.click(header('Category'));
    expect(names()).toEqual(['Senior Cap Badge', 'Handbook (English)', 'Haversack', 'Field Service Cap', 'Junior Shirt']);
    await u.click(header('Reorder Threshold')); await u.click(header('Reorder Threshold'));
    expect(names()[0]).toBe('Senior Cap Badge');               // reorder at 10
  });

  it('search, Category, Status and sorting all work together', async () => {
    const u = userEvent.setup();
    render(<App />);
    // add two more uniform items so the combination has something to narrow down
    for (const [n, st, th, pr] of [['Senior Shirt', '1', '2', '38'], ['Brigade Tee', '0', '3', '25']]) {
      await u.type(screen.getByLabelText('Item name'), n); await u.type(screen.getByLabelText('Category', { selector: 'input' }), 'Uniform');
      await u.type(screen.getByLabelText('Stock level'), st); await u.type(screen.getByLabelText('Reorder threshold'), th);
      await u.type(screen.getByLabelText('Unit price (RM)'), pr);
      await u.click(screen.getByRole('button', { name: 'Add item' }));
    }
    await u.selectOptions(screen.getByLabelText('Category', { selector: 'select' }), 'Uniform');
    expect(names()).toEqual(['Junior Shirt', 'Field Service Cap', 'Senior Shirt', 'Brigade Tee']);
    await u.type(screen.getByRole('searchbox'), 'shirt');
    expect(names()).toEqual(['Junior Shirt', 'Senior Shirt']);
    await u.click(header('Unit Price')); await u.click(header('Unit Price'));   // high to low
    expect(names()).toEqual(['Senior Shirt', 'Junior Shirt']);
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), 'low');
    expect(names()).toEqual(['Senior Shirt']);
    expect(summary()).toContain('Showing 1 of 7 items');
    expect(summary()).toContain('sorted by Unit Price, high to low');
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), 'out');
    expect(rows()).toHaveLength(0);
    expect(screen.getByText('No items match your search and filters.')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(rows()).toHaveLength(7);
    expect(names()[0]).toBe('Senior Shirt');                   // the sort is kept: RM 38 first
    await u.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(names()).toEqual(['Junior Shirt', 'Field Service Cap', 'Senior Cap Badge', 'Haversack', 'Handbook (English)', 'Senior Shirt', 'Brigade Tee']);
  });

  it('filters follow stock changes: an edited item moves in or out of a Status filter', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), 'low');
    expect(names()).toEqual(['Senior Cap Badge', 'Haversack']);
    await setStock(u, 'Haversack', 9);
    expect(names()).toEqual(['Senior Cap Badge']);
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), '');
    await setStock(u, 'Junior Shirt', 2);
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), 'low');
    expect(names()).toEqual(['Junior Shirt', 'Senior Cap Badge']);
  });

  it('the phone Sort by menu does the same as the headers', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.selectOptions(screen.getByLabelText('Sort by'), 'total:desc');
    expect(names()[0]).toBe('Junior Shirt');
    expect(screen.getAllByRole('columnheader')[5]).toHaveAttribute('aria-sort', 'descending');
    await u.selectOptions(screen.getByLabelText('Sort by'), '');
    expect(names()[0]).toBe('Junior Shirt');
    expect(screen.getAllByRole('columnheader')[5]).toHaveAttribute('aria-sort', 'none');
  });
});

describe('dropdown counts', () => {
  const opts = el => [...el.options].map(o => o.textContent);
  it('follow the other dropdown and the search (the Uniform + Low Stock case)', async () => {
    const u = userEvent.setup();
    render(<App />);
    const cat = screen.getByLabelText('Category', { selector: 'select' }), st = screen.getByLabelText('Status', { selector: 'select' });
    await setStock(u, 'Field Service Cap', 4);                // the item in the screenshot: 4, reorder at 5
    expect(opts(st)).toEqual(['All (5)', 'In Stock (1)', 'Low Stock (3)', 'Out of Stock (1)']);
    await u.selectOptions(cat, 'Uniform');
    expect(opts(st)).toEqual(['All (2)', 'In Stock (1)', 'Low Stock (1)', 'Out of Stock (0)']);
    await u.selectOptions(st, 'low');
    expect(names()).toEqual(['Field Service Cap']);
    expect(opts(st)[2]).toBe('Low Stock (1)');
    // and the Category numbers follow the Status choice
    expect(opts(cat)).toEqual(['All categories (3)', 'Badges (1)', 'Books (0)', 'Equipment (1)', 'Uniform (1)']);
    // the search narrows both
    await u.selectOptions(cat, '');
    await u.type(screen.getByRole('searchbox'), 'cap');
    expect(opts(st)).toEqual(['All (2)', 'In Stock (0)', 'Low Stock (2)', 'Out of Stock (0)']);
    expect(opts(cat)).toEqual(['All categories (2)', 'Badges (1)', 'Books (0)', 'Equipment (0)', 'Uniform (1)']);
  });

  it('a count always equals the rows that choice would show', async () => {
    const u = userEvent.setup();
    render(<App />);
    const cat = screen.getByLabelText('Category', { selector: 'select' }), st = screen.getByLabelText('Status', { selector: 'select' });
    await u.type(screen.getByRole('searchbox'), 'e');
    for (const c of [...cat.options].map(o => o.value)) {
      await u.selectOptions(cat, c);
      for (const o of [...st.options]) {
        const n = Number(o.textContent.match(/\((\d+)\)$/)[1]);
        await u.selectOptions(st, o.value);
        expect(rows().length, (c || 'All') + ' / ' + o.textContent).toBe(n);
      }
      await u.selectOptions(st, '');
    }
  });
});

describe('summary dashboard', () => {
  const kpi = key => document.querySelector('[data-kpi="' + key + '"] .kpi-v').textContent.replace(/\u00a0/g, ' ');
  const all = () => ({ items: kpi('items'), value: kpi('value'), low: kpi('low'), out: kpi('out') });

  it('works the numbers out from the data', () => {
    expect(summarize(SAMPLE_ITEMS)).toEqual({ items: 5, units: 26, valueSen: 40530, low: 2, out: 1 });
    expect(summarize([])).toEqual({ items: 0, units: 0, valueSen: 0, low: 0, out: 0 });
  });

  it('shows four cards above the table with the right numbers', () => {
    render(<App />);
    const region = screen.getByRole('region', { name: 'Inventory summary' });
    expect(within(region).getAllByText(/^(Total Items|Total Inventory Value|Low Stock Items|Out of Stock Items)$/).map(e => e.textContent))
      .toEqual(['Total Items', 'Total Inventory Value', 'Low Stock Items', 'Out of Stock Items']);
    expect(region.compareDocumentPosition(screen.getByRole('table')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(all()).toEqual({ items: '5', value: 'RM 405.30', low: '2', out: '1' });
    expect(region).toHaveTextContent('26 units in stock');
  });

  it('updates the moment the inventory changes: edit, add, delete', async () => {
    const u = userEvent.setup();
    render(<App />);
    await setStock(u, 'Haversack', 10);              // 2 -> 10 at RM 11.40: +RM 91.20, no longer low
    expect(all()).toEqual({ items: '5', value: 'RM 496.50', low: '1', out: '1' });
    await setStock(u, 'Junior Shirt', 0);            // -RM 210.00, now out of stock
    expect(all()).toEqual({ items: '5', value: 'RM 286.50', low: '1', out: '2' });

    await u.type(screen.getByLabelText('Item name'), 'Brigade Tee');
    await u.type(screen.getByLabelText('Category', { selector: 'input' }), 'Uniform');
    await u.type(screen.getByLabelText('Stock level'), '3');
    await u.type(screen.getByLabelText('Reorder threshold'), '4');
    await u.type(screen.getByLabelText('Unit price (RM)'), '25');
    await u.click(screen.getByRole('button', { name: 'Add item' }));
    expect(all()).toEqual({ items: '6', value: 'RM 361.50', low: '2', out: '2' });

    await u.click(screen.getByRole('button', { name: 'Delete Handbook (English)' }));
    await u.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete item' }));
    expect(all()).toEqual({ items: '5', value: 'RM 361.50', low: '2', out: '1' });
  });

  it('counts every item, whatever the search and filters show', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.type(screen.getByRole('searchbox'), 'shirt');
    await u.selectOptions(screen.getByLabelText('Status', { selector: 'select' }), 'ok');
    expect(rows()).toHaveLength(1);
    expect(all()).toEqual({ items: '5', value: 'RM 405.30', low: '2', out: '1' });
  });

  it('the edit row typing does not change the cards until Save', async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Edit Junior Shirt' }));
    const f = within(editRow()).getByLabelText('Stock level');
    await u.clear(f); await u.type(f, '0');
    expect(all().out).toBe('1');
    await u.click(within(editRow()).getByRole('button', { name: 'Save' }));
    expect(all().out).toBe('2');
  });
});

describe('viewItems', () => {
  it('never changes the list it is given', () => {
    const before = JSON.stringify(SAMPLE_ITEMS);
    viewItems(SAMPLE_ITEMS, { query: 'a', sortKey: 'name', sortDir: 'desc' });
    expect(JSON.stringify(SAMPLE_ITEMS)).toBe(before);
  });
});
