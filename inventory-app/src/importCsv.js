// Reading a CSV file into inventory items (Import CSV).
//
// Accepts the file Export CSV makes (so a download can be edited in Excel or Google Sheets and uploaded again),
// a file made from the template, and simpler lists such as "Item, Size, Qty". Columns are found by their names,
// in any order; Total Value, Status and other extra columns are ignored, because they are worked out.
import { SECTIONS, SECTION_LABEL, CATEGORIES, canonicalCategory, parseCount, parsePriceSen, newId } from './inventory.js';

export const MAX_ROWS = 2000;
export const TEMPLATE_COLUMNS = ['Item Name', 'Section', 'Category', 'Stock Level', 'Reorder Threshold', 'Unit Price (RM)'];
export const TEMPLATE_CSV = TEMPLATE_COLUMNS.join(',') + '\r\n'
  + 'Brigade Tee (M),Junior,Uniform,5,3,35.00\r\n'
  + 'Target Badge,Senior,Badges,21,5,2.50\r\n';

const ALIASES = {
  name: ['item name', 'item', 'name', 'item / description', 'description'],
  size: ['size'],
  section: ['section'],
  category: ['category', 'type'],
  stock: ['stock level', 'stock', 'qty', 'quantity', 'in stock', 'count'],
  threshold: ['reorder threshold', 'reorder at', 'reorder level', 'threshold', 'reorder', 'minimum', 'min'],
  price: ['unit price (rm)', 'unit price', 'price (rm)', 'price', 'u/price', 'unit cost (rm)', 'unit cost', 'cost'],
};
const norm = s => String(s ?? '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Splits CSV text into rows. Handles quotes, commas or semicolons (Excel in some countries) or tabs (pasted cells). */
export function parseRows(text) {
  text = String(text ?? '').replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/, 1)[0] || '';
  const count = ch => (first.match(new RegExp('\\' + ch, 'g')) || []).length;
  const sep = count('\t') > Math.max(count(','), count(';')) ? '\t' : count(';') > count(',') ? ';' : ',';
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
    else if (ch === '"' && f === '') q = true;
    else if (ch === sep) { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.map((r, i) => ({ line: i + 1, cells: r })).filter(r => r.cells.some(c => String(c).trim()));
}

/** Which column holds what, from the header row. */
function mapColumns(header) {
  const cols = {};
  header.forEach((h, i) => {
    const n = norm(h);
    Object.keys(ALIASES).forEach(k => { if (cols[k] === undefined && ALIASES[k].includes(n)) cols[k] = i; });
  });
  return cols;
}

export function sectionFrom(text) {
  const n = norm(text).replace(/[\s_-]+/g, '');
  if (!n) return '';
  const hit = SECTIONS.find(s => s.id === n || norm(s.label).replace(/[\s_-]+/g, '') === n || norm(s.label).replace(/[\s_-]+/g, '') === n + 's');
  return hit ? hit.id : null;           // null = written but not a section
}
/** "Junior Shirt" → junior, "Used Senior Boots" → senior, "Officer Polo Tee" → officers. Empty when unclear. */
export function guessSection(name) {
  const n = norm(name).replace(/^used\s+/, '');
  if (/^pre-?\s?junior\b/.test(n)) return 'prejunior';
  if (/^junior\b/.test(n)) return 'junior';
  if (/^senior\b/.test(n)) return 'senior';
  if (/^officers?\b/.test(n)) return 'officers';
  if (/^primers?\b/.test(n)) return 'primers';
  return '';
}
/** "Used …" → Used Uniform, "… badge" → Badges, handbooks → Books. Empty when unclear. */
export function guessCategory(name) {
  const n = norm(name);
  if (/^used\b/.test(n)) return 'Used Uniform';
  if (/\bbadges?\b/.test(n)) return 'Badges';
  if (/\b(hand)?books?\b|\bprimer\b/.test(n)) return 'Books';
  return '';
}

const keyOf = it => [norm(it.name), it.section, norm(it.category)].join('|');

/**
 * Reads the file. opts: { defaultSection, defaultCategory, onExisting: 'update' | 'skip' }.
 * Returns { rows: [{ line, item, action: 'new' | 'update' | 'skip', existing }], problems: [{ line, message }] (rows left out),
 *   notes: [text] (worth knowing, nothing left out), columns, needs }.
 * needs.section / needs.category: some rows had no section/category and no default was chosen.
 */
export function readImport(text, existingItems, opts = {}) {
  const { defaultSection = '', defaultCategory = '', onExisting = 'update' } = opts;
  const all = parseRows(text);
  const problems = [], rows = [], notes = [];
  const needs = { section: false, category: false };
  if (!all.length) return { rows, notes, problems: [{ line: 0, message: 'The file is empty.' }], columns: {}, needs };
  let cols = mapColumns(all[0].cells), body = all.slice(1);
  if (cols.name === undefined) {
    // no header row: take the columns in the order Export CSV writes them
    cols = { name: 0, section: 1, category: 2, stock: 3, threshold: 4, price: 5 };
    body = all;
    if (all[0].cells.length < 2) return { rows, notes, problems: [{ line: 1, message: 'No "Item Name" column found. Download the template to see the columns to use.' }], columns: {}, needs };
    notes.push('There is no header row, so the columns are read in the Export CSV order: Item Name, Section, Category, Stock Level, Reorder Threshold, Unit Price.');
  }
  if (cols.stock === undefined) notes.push('No stock column ("Stock Level" or "Qty") was found, so every item is imported with 0 in stock.');
  if (cols.price === undefined) notes.push('No price column was found, so unit prices are RM 0.00. You can fill them in later with Edit.');
  if (cols.threshold === undefined) notes.push('No reorder threshold column was found, so it is 0: items only show in the Reorder Alert when they run out.');
  if (body.length > MAX_ROWS) return { rows, notes, problems: [{ line: 0, message: 'The file has ' + body.length + ' rows. Import at most ' + MAX_ROWS + ' at a time.' }], columns: cols, needs };

  const existing = new Map(existingItems.map(it => [keyOf(it), it]));
  const seen = new Map();
  const cell = (r, k) => (cols[k] === undefined ? '' : String(r.cells[cols[k]] ?? '').trim());
  const unguard = s => s.replace(/^'(?=[=+\-@])/, '');   // Export CSV adds ' before = + - @ so spreadsheets keep them as text

  body.forEach(r => {
    const bad = m => problems.push({ line: r.line, message: m });
    let name = unguard(cell(r, 'name')).replace(/\s+/g, ' ');
    const size = cell(r, 'size');
    if (!name) return bad('No item name.');
    if (size && !new RegExp('\\(' + size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)$', 'i').test(name)) name += ' (' + size + ')';
    if (name.length > 80) return bad('"' + name.slice(0, 30) + '…" is longer than 80 characters.');

    const secText = cell(r, 'section');
    let section = sectionFrom(secText);
    if (section === null) return bad('"' + secText + '" is not a section. Use Pre-Junior, Junior, Senior, Officers or Primers.');
    if (!section) section = guessSection(name) || defaultSection;
    if (!section) { needs.section = true; return bad('No section for "' + name + '". Add a Section column or choose one for these rows below.'); }

    let category = canonicalCategory(unguard(cell(r, 'category')));
    if (!category) category = guessCategory(name) || defaultCategory;
    if (!category) { needs.category = true; return bad('No category for "' + name + '". Add a Category column or choose one for these rows below.'); }
    if (category.length > 40) return bad('The category "' + category.slice(0, 30) + '…" is longer than 40 characters.');

    const num = (k, label) => {
      const t = cell(r, k);
      if (t === '') return 0;
      const n = parseCount(t);
      if (Number.isNaN(n)) { bad(label + ' "' + t + '" is not a whole number from 0 to 100000.'); return null; }
      return n;
    };
    const stock = num('stock', 'Stock'); if (stock === null) return;
    const threshold = num('threshold', 'Reorder threshold'); if (threshold === null) return;
    const priceText = cell(r, 'price');
    const priceSen = priceText === '' ? 0 : parsePriceSen(priceText);
    if (Number.isNaN(priceSen)) return bad('Unit price "' + priceText + '" is not a price such as 12.50.');

    const item = { name, section, category, stock, threshold, priceSen };
    const k = keyOf(item);
    if (seen.has(k)) return bad('Same item as line ' + seen.get(k) + ' (' + name + ', ' + SECTION_LABEL[section] + ', ' + category + '); only the first is used.');
    seen.set(k, r.line);
    const old = existing.get(k);
    rows.push({ line: r.line, item: old ? { ...old, ...item } : { id: newId(), ...item }, action: old ? (onExisting === 'skip' ? 'skip' : 'update') : 'new', existing: old || null });
  });
  return { rows, problems, notes, columns: cols, needs };
}

export const DEFAULT_CATEGORY_CHOICES = CATEGORIES;
