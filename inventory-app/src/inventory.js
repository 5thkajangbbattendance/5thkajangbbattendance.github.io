// Inventory rules shared by the table, the add form and the tests.
// Money is kept in sen (whole numbers) so totals never pick up floating-point errors.

/** Built-in categories. Every section has all of them (Used Uniform included); people can still type a new one. */
export const CATEGORIES = ['Uniform', 'Used Uniform', 'Badges', 'Books', 'Equipment'];

/** "used uniform" -> "Used Uniform": a typed category that matches a built-in one uses its spelling. */
export function canonicalCategory(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  return CATEGORIES.find(c => c.toLowerCase() === t.toLowerCase()) || t;
}

/** The company's sections, in this order everywhere (tabs, dropdowns, sorting). */
export const SECTIONS = [
  { id: 'prejunior', label: 'Pre-Junior' },
  { id: 'junior', label: 'Junior' },
  { id: 'senior', label: 'Senior' },
  { id: 'officers', label: 'Officers' },
  { id: 'primers', label: 'Primers' },
];
export const SECTION_LABEL = Object.fromEntries(SECTIONS.map(s => [s.id, s.label]));
const SECTION_RANK = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]));

export const SAMPLE_ITEMS = [
  { id: 's1', name: 'Junior Shirt', section: 'junior', category: 'Uniform', stock: 6, threshold: 3, priceSen: 3500 },
  { id: 's2', name: 'Field Service Cap', section: 'senior', category: 'Uniform', stock: 11, threshold: 5, priceSen: 1250 },
  { id: 's3', name: 'Senior Cap Badge', section: 'senior', category: 'Badges', stock: 7, threshold: 10, priceSen: 500 },
  { id: 's4', name: 'Haversack', section: 'senior', category: 'Equipment', stock: 2, threshold: 3, priceSen: 1140 },
  { id: 's5', name: 'Handbook (English)', section: 'senior', category: 'Books', stock: 0, threshold: 5, priceSen: 650 },
];

/** Total Value is always Stock Level × Unit Price. It is worked out, never typed in. */
export function totalSen(stock, priceSen) {
  const s = Number(stock), p = Number(priceSen);
  if (!Number.isFinite(s) || !Number.isFinite(p) || s < 0 || p < 0) return 0;
  return Math.round(s) * Math.round(p);
}

/** Out of Stock at 0, Low Stock at or below the reorder threshold (but above 0), otherwise In Stock. */
export function statusOf(stock, threshold) {
  if (stock <= 0) return 'out';
  if (stock <= threshold) return 'low';
  return 'ok';
}
export const STATUS_LABEL = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };

export function formatRM(sen) {
  return 'RM\u00a0' + (sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Reads a price the way people type it: "12.50", "12,50", "RM 12", "1,200.50", "12." or ".5" -> sen (1250...).
    Returns NaN when it cannot be read, or has more than 2 decimals. */
export function parsePriceSen(text) {
  let t = String(text ?? '').trim().replace(/^rm\s*/i, '').replace(/\s+/g, '');
  if (/^\d{1,3}(,\d{3})+(\.\d*)?$/.test(t)) t = t.replace(/,/g, '');   // 1,200 or 1,200.50: thousands
  else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');            // 12,50: decimal comma
  if (!/^(\d{1,6}(\.\d{0,2})?|\.\d{1,2})$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100);
}

/** A whole number from 0 to 100000 ("6", " 6 ", "1,000"), or NaN. */
export function parseCount(text) {
  let t = String(text ?? '').trim();
  if (/^\d{1,3}(,\d{3})+$/.test(t)) t = t.replace(/,/g, '');
  if (!/^\d{1,6}$/.test(t)) return NaN;
  const n = Number(t);
  return n <= 100000 ? n : NaN;
}

/** Checks a draft (the text in the form fields). Returns { item, errors }. */
export function readDraft(draft, items, editingId) {
  const errors = {};
  const name = String(draft.name ?? '').trim().replace(/\s+/g, ' ');
  const category = canonicalCategory(draft.category);
  const section = SECTION_LABEL[draft.section] ? draft.section : '';
  const stock = parseCount(draft.stock);
  const threshold = parseCount(draft.threshold);
  const priceSen = parsePriceSen(draft.price);
  if (!name) errors.name = 'Enter the item name.';
  else if (name.length > 80) errors.name = 'Keep the name under 80 characters.';
  // the same name may exist once per section and category: a Brigade Tee for Pre-Junior and for Junior,
  // or a Junior Shirt as Uniform and as Used Uniform in Junior
  else if (section && category && items.some(i => i.id !== editingId && i.section === section
    && i.category.toLowerCase() === category.toLowerCase() && i.name.toLowerCase() === name.toLowerCase())) errors.name = 'This section already has an item with this name and category.';
  if (!section) errors.section = 'Choose a section.';
  if (!category) errors.category = 'Choose or type a category.';
  else if (category.length > 40) errors.category = 'Keep the category under 40 characters.';
  if (Number.isNaN(stock)) errors.stock = 'Enter a whole number, 0 or more.';
  if (Number.isNaN(threshold)) errors.threshold = 'Enter a whole number, 0 or more.';
  if (Number.isNaN(priceSen)) errors.price = 'Enter a price such as 12.50 (up to 2 decimals).';
  return { errors, item: { name, section, category, stock, threshold, priceSen } };
}

export function draftOf(item) {
  return { name: item.name, section: item.section, category: item.category, stock: String(item.stock), threshold: String(item.threshold), price: (item.priceSen / 100).toFixed(2) };
}

export const EMPTY_DRAFT = { name: '', section: '', category: '', stock: '', threshold: '', price: '' };

/** Total for a draft while it is being typed.
    state: 'ok' (sen is the total), 'missing' (stock or price still empty) or 'bad' (one of them cannot be read). */
export function draftTotal(draft) {
  const st = String(draft.stock ?? '').trim(), pr = String(draft.price ?? '').trim();
  const s = parseCount(st), p = parsePriceSen(pr);
  const bad = [], missing = [];
  if (!st) missing.push('stock level'); else if (Number.isNaN(s)) bad.push('stock level');
  if (!pr) missing.push('unit price'); else if (Number.isNaN(p)) bad.push('unit price');
  if (bad.length) return { state: 'bad', sen: 0, bad, missing };
  if (missing.length) return { state: 'missing', sen: 0, bad, missing };
  return { state: 'ok', sen: totalSen(s, p), stock: s, priceSen: p, bad, missing };
}
export function draftTotalSen(draft) { return draftTotal(draft).sen; }

/** The line under the total: the sum itself, or what still needs filling in or fixing. */
export function totalHint(t) {
  if (t.state === 'ok') return t.stock + ' × ' + formatRM(t.priceSen);
  if (t.state === 'bad') return 'Check the ' + t.bad.join(' and the ') + (t.bad.includes('unit price') ? ', e.g. 12.50' : ', e.g. 6');
  return 'Fill in the ' + t.missing.join(' and the ');
}

export function newId() {
  try { return crypto.randomUUID(); } catch { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

/* ---------- Search, filters and sorting (they all apply together) ---------- */

export const SORT_KEYS = {
  name: { label: 'Item Name', text: true },
  section: { label: 'Section' },
  category: { label: 'Category', text: true },
  stock: { label: 'Stock Level' },
  threshold: { label: 'Reorder Threshold' },
  price: { label: 'Unit Price' },
  total: { label: 'Total Value' },
  status: { label: 'Status' },
};
// Status sorts from most urgent: Out of Stock, then Low Stock, then In Stock.
const STATUS_RANK = { out: 0, low: 1, ok: 2 };
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function sortValue(it, key) {
  switch (key) {
    case 'name': return it.name;
    case 'section': return SECTION_RANK[it.section] ?? 99;
    case 'category': return it.category;
    case 'stock': return it.stock;
    case 'threshold': return it.threshold;
    case 'price': return it.priceSen;
    case 'total': return totalSen(it.stock, it.priceSen);
    case 'status': return STATUS_RANK[statusOf(it.stock, it.threshold)];
    default: return 0;
  }
}

const DIR_WORDS = { text: ['A to Z', 'Z to A'], number: ['low to high', 'high to low'], status: ['most urgent first', 'least urgent first'], section: ['Pre-Junior first', 'Primers first'] };
/** "Unit Price, low to high" */
export function sortDescription(key, dir) {
  const w = DIR_WORDS[key] || (SORT_KEYS[key].text ? DIR_WORDS.text : DIR_WORDS.number);
  return SORT_KEYS[key].label + ', ' + w[dir === 'desc' ? 1 : 0];
}

/** True when every word typed appears in the item name, section or category (any order, any case). */
export function matchesSearch(it, query) {
  const words = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = (it.name + ' ' + (SECTION_LABEL[it.section] || '') + ' ' + it.category).toLowerCase();
  return words.every(w => hay.includes(w));
}

/**
 * The rows to show: search, then Category, then Status, then sort.
 * view = { query, section ('' = all, or a section id), category ('' = all), status ('' = all, or 'ok' | 'low' | 'out'), sortKey ('' = as entered), sortDir ('asc' | 'desc') }
 */
export function viewItems(items, view) {
  const { query = '', section = '', category = '', status = '', sortKey = '', sortDir = 'asc' } = view || {};
  const cat = category.toLowerCase();
  const out = items.filter(it =>
    matchesSearch(it, query)
    && (!section || it.section === section)
    && (!cat || it.category.toLowerCase() === cat)
    && (!status || statusOf(it.stock, it.threshold) === status));
  if (!SORT_KEYS[sortKey]) return out;
  const dir = sortDir === 'desc' ? -1 : 1, text = SORT_KEYS[sortKey].text;
  return out
    .map((it, i) => ({ it, i }))
    .sort((a, b) => {
      const x = sortValue(a.it, sortKey), y = sortValue(b.it, sortKey);
      const c = text ? collator.compare(x, y) : x - y;
      // ties: by name, then the order they were entered, so the order never jumps around
      return c * dir || collator.compare(a.it.name, b.it.name) || a.i - b.i;
    })
    .map(x => x.it);
}

/** Categories in use, A to Z, with how many items each has. */
export function categoryCounts(items) {
  const m = new Map();
  items.forEach(it => { const k = it.category.toLowerCase(); const e = m.get(k) || { name: it.category, n: 0 }; e.n++; m.set(k, e); });
  return [...m.values()].sort((a, b) => collator.compare(a.name, b.name));
}

/** The four dashboard numbers, worked out from every item (search and filters do not change them). */
export function summarize(items) {
  const s = { items: items.length, units: 0, valueSen: 0, low: 0, out: 0 };
  items.forEach(it => {
    s.units += it.stock;
    s.valueSen += totalSen(it.stock, it.priceSen);
    const st = statusOf(it.stock, it.threshold);
    if (st === 'low') s.low++;
    if (st === 'out') s.out++;
  });
  return s;
}

/** How many items each section has. */
export function sectionCounts(items) {
  const n = Object.fromEntries(SECTIONS.map(s => [s.id, 0]));
  items.forEach(it => { if (it.section in n) n[it.section]++; });
  return n;
}

/** Every category to offer: the built-in ones in their order, then any others in use, A to Z (no case duplicates). */
export function categoryList(items) {
  const seen = new Set(CATEGORIES.map(c => c.toLowerCase()));
  const extra = [];
  items.forEach(it => { const k = it.category.toLowerCase(); if (!seen.has(k)) { seen.add(k); extra.push(it.category); } });
  return CATEGORIES.concat(extra.sort((a, b) => collator.compare(a, b)));
}

/* ---------- Export CSV (only the rows the table is showing) ---------- */

export const CSV_COLUMNS = ['Item Name', 'Section', 'Category', 'Stock Level', 'Reorder Threshold', 'Unit Price (RM)', 'Total Value (RM)', 'Status'];

function csvCell(v) {
  let t = String(v ?? '');
  // a cell starting with = + - @ could run as a formula in Excel or Google Sheets: make it plain text
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
  return /[",\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

/** The rows exactly as shown (same order), as CSV text with Windows line endings so Excel opens it cleanly. */
export function toCSV(rows) {
  const money = sen => (sen / 100).toFixed(2);
  const lines = [CSV_COLUMNS].concat(rows.map(it => [
    it.name, SECTION_LABEL[it.section] || '', it.category, it.stock, it.threshold,
    money(it.priceSen), money(totalSen(it.stock, it.priceSen)), STATUS_LABEL[statusOf(it.stock, it.threshold)],
  ]));
  return lines.map(l => l.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** inventory-senior-2026-11-22.csv (or inventory-all-sections-…) */
export function csvFilename(sectionId, date = new Date()) {
  const d = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  return 'inventory-' + (sectionId && SECTION_LABEL[sectionId] ? SECTION_LABEL[sectionId].toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'all-sections') + '-' + d + '.csv';
}

/** Starts a download of the CSV in the browser (a BOM first, so Excel reads RM and accents correctly). */
export function downloadCSV(text, filename) {
  const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return blob;
}
