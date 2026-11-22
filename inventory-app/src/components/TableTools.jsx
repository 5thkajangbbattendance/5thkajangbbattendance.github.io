import { SORT_KEYS, STATUS_LABEL, statusOf, categoryCounts, sortDescription, viewItems } from '../inventory.js';

/** Search, Category, Status and (on phones, where the column headers are hidden) Sort by. All apply together. */
export default function TableTools({ items, view, onChange, shown }) {
  // Each dropdown's numbers count the items left after the search and the OTHER dropdown,
  // so with Uniform chosen, "Low Stock (1)" means one uniform item is low.
  const forCats = viewItems(items, { ...view, category: '', sortKey: '' });
  const forStatus = viewItems(items, { ...view, status: '', sortKey: '' });
  const inView = new Map(categoryCounts(forCats).map(c => [c.name.toLowerCase(), c.n]));
  // every category stays in the list (with 0 when nothing matches), so the dropdown never jumps
  const cats = categoryCounts(items).map(c => ({ name: c.name, n: inView.get(c.name.toLowerCase()) || 0 }));
  if (view.category && !cats.some(c => c.name.toLowerCase() === view.category.toLowerCase())) cats.push({ name: view.category, n: 0 });
  const statusN = { ok: 0, low: 0, out: 0 };
  forStatus.forEach(it => { statusN[statusOf(it.stock, it.threshold)]++; });
  const active = view.query.trim() || view.category || view.status;
  const set = patch => onChange({ ...view, ...patch });

  return (
    <div className="tools">
      <div className="tools-row">
        <label className="search" htmlFor="inv-search">
          <span className="sr-only">Search items</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input id="inv-search" className="input" type="search" placeholder="Search items or categories…" autoComplete="off"
            value={view.query} onChange={e => set({ query: e.target.value })}
            onKeyDown={e => { if (e.key === 'Escape' && view.query) { e.preventDefault(); set({ query: '' }); } }} />
        </label>
        <label className="pick" htmlFor="inv-cat">
          <span>Category</span>
          <select id="inv-cat" className="input" value={view.category} onChange={e => set({ category: e.target.value })}>
            <option value="">All categories ({forCats.length})</option>
            {cats.map(c => <option key={c.name} value={c.name}>{c.name} ({c.n})</option>)}
          </select>
        </label>
        <label className="pick" htmlFor="inv-status">
          <span>Status</span>
          <select id="inv-status" className="input" value={view.status} onChange={e => set({ status: e.target.value })}>
            <option value="">All ({forStatus.length})</option>
            {['ok', 'low', 'out'].map(s => <option key={s} value={s}>{STATUS_LABEL[s]} ({statusN[s]})</option>)}
          </select>
        </label>
        <label className="pick sort-pick" htmlFor="inv-sort">
          <span>Sort by</span>
          <select id="inv-sort" className="input" value={view.sortKey ? view.sortKey + ':' + view.sortDir : ''}
            onChange={e => { const [k, d] = e.target.value.split(':'); set({ sortKey: k || '', sortDir: d || 'asc' }); }}>
            <option value="">As entered</option>
            {Object.keys(SORT_KEYS).flatMap(k => ['asc', 'desc'].map(d => <option key={k + d} value={k + ':' + d}>{sortDescription(k, d)}</option>))}
          </select>
        </label>
      </div>
      <div className="tools-sum" aria-live="polite">
        <span>{active ? `Showing ${shown} of ${items.length} items` : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}{view.sortKey ? ' · sorted by ' + sortDescription(view.sortKey, view.sortDir) : ''}</span>
        {(active || view.sortKey) && <button type="button" className="linkbtn" onClick={() => onChange({ query: '', category: '', status: '', sortKey: '', sortDir: 'asc' })}>Clear all</button>}
      </div>
    </div>
  );
}
