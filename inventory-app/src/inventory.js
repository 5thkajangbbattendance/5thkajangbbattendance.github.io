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

/** Out of stock at 0, Low stock at or below the reorder threshold, otherwise In stock. */
export function statusOf(stock, threshold) {
  if (stock <= 0) return 'out';
  if (stock <= threshold) return 'low';
  return 'ok';
}
export const STATUS_LABEL = { ok: 'In stock', low: 'Low stock', out: 'Out of stock' };

export function formatRM(sen) {
  return 'RM\u00a0' + (sen / 100).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** "12.5" -> 1250. Returns NaN for anything that is not a price with at most 2 decimals. */
export function parsePriceSen(text) {
  const t = String(text ?? '').trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return NaN;
  return Math.round(parseFloat(t) * 100);
}

/** A whole number from 0 to 100000, or NaN. */
export function parseCount(text) {
  const t = String(text ?? '').trim();
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
  if (Number.isNaN(priceSen)) errors.price = 'Enter a price such as 12.50.';
  return { errors, item: { name, category, stock, threshold, priceSen } };
}

export function draftOf(item) {
  return { name: item.name, category: item.category, stock: String(item.stock), threshold: String(item.threshold), price: (item.priceSen / 100).toFixed(2) };
}

export const EMPTY_DRAFT = { name: '', category: '', stock: '', threshold: '', price: '' };

/** Total for a draft while it is being typed (0 until both numbers are valid). */
export function draftTotalSen(draft) {
  const s = parseCount(draft.stock), p = parsePriceSen(draft.price);
  return Number.isNaN(s) || Number.isNaN(p) ? 0 : totalSen(s, p);
}

export function newId() {
  try { return crypto.randomUUID(); } catch { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}
