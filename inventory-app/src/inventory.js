// Inventory rules shared by the table, the add form and the tests.
// Money is kept in sen (whole numbers) so totals never pick up floating-point errors.

export const CATEGORIES = ['Uniform', 'Badges', 'Books', 'Equipment'];

export const SAMPLE_ITEMS = [
  { id: 's1', name: 'Junior Shirt', category: 'Uniform', stock: 6, threshold: 3, priceSen: 3500 },
  { id: 's2', name: 'Field Service Cap', category: 'Uniform', stock: 11, threshold: 5, priceSen: 1250 },
  { id: 's3', name: 'Senior Cap Badge', category: 'Badges', stock: 7, threshold: 10, priceSen: 500 },
  { id: 's4', name: 'Haversack', category: 'Equipment', stock: 2, threshold: 3, priceSen: 1140 },
  { id: 's5', name: 'Handbook (English)', category: 'Books', stock: 0, threshold: 5, priceSen: 650 },
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
  const category = String(draft.category ?? '').trim().replace(/\s+/g, ' ');
  const stock = parseCount(draft.stock);
  const threshold = parseCount(draft.threshold);
  const priceSen = parsePriceSen(draft.price);
  if (!name) errors.name = 'Enter the item name.';
  else if (name.length > 80) errors.name = 'Keep the name under 80 characters.';
  else if (items.some(i => i.id !== editingId && i.name.toLowerCase() === name.toLowerCase())) errors.name = 'An item with this name already exists.';
  if (!category) errors.category = 'Choose or type a category.';
  else if (category.length > 40) errors.category = 'Keep the category under 40 characters.';
  if (Number.isNaN(stock)) errors.stock = 'Enter a whole number, 0 or more.';
  if (Number.isNaN(threshold)) errors.threshold = 'Enter a whole number, 0 or more.';
  if (Number.isNaN(priceSen)) errors.price = 'Enter a price such as 12.50 (up to 2 decimals).';
  return { errors, item: { name, category, stock, threshold, priceSen } };
}

export function draftOf(item) {
  return { name: item.name, category: item.category, stock: String(item.stock), threshold: String(item.threshold), price: (item.priceSen / 100).toFixed(2) };
}

export const EMPTY_DRAFT = { name: '', category: '', stock: '', threshold: '', price: '' };

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
    case 'category': return it.category;
    case 'stock': return it.stock;
    case 'threshold': return it.threshold;
    case 'price': return it.priceSen;
    case 'total': return totalSen(it.stock, it.priceSen);
    case 'status': return STATUS_RANK[statusOf(it.stock, it.threshold)];
    default: return 0;
  }
}

const DIR_WORDS = { text: ['A to Z', 'Z to A'], number: ['low to high', 'high to low'], status: ['most urgent first', 'least urgent first'] };
/** "Unit Price, low to high" */
export function sortDescription(key, dir) {
  const w = key === 'status' ? DIR_WORDS.status : SORT_KEYS[key].text ? DIR_WORDS.text : DIR_WORDS.number;
  return SORT_KEYS[key].label + ', ' + w[dir === 'desc' ? 1 : 0];
}

/** True when every word typed appears in the item name or category (any order, any case). */
export function matchesSearch(it, query) {
  const words = String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = (it.name + ' ' + it.category).toLowerCase();
  return words.every(w => hay.includes(w));
}

/**
 * The rows to show: search, then Category, then Status, then sort.
 * view = { query, category ('' = all), status ('' = all, or 'ok' | 'low' | 'out'), sortKey ('' = as entered), sortDir ('asc' | 'desc') }
 */
export function viewItems(items, view) {
  const { query = '', category = '', status = '', sortKey = '', sortDir = 'asc' } = view || {};
  const cat = category.toLowerCase();
  const out = items.filter(it =>
    matchesSearch(it, query)
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
