import { useEffect, useRef, useState } from 'react';
import { totalSen, statusOf, formatRM, SORT_KEYS, sortDescription, SECTIONS, SECTION_LABEL, readDraft, draftOf, parseCount, draftTotal } from '../inventory.js';

import StatusBadge from './StatusBadge.jsx';
import CategoryPicker from './CategoryPicker.jsx';

function EditInput({ id, field, label, value, error, mode, onChange, autoFocus }) {
  return (
    <>
      <input
        id={id}
        data-field={field}
        className="input"
        type="text"
        inputMode={mode}
        autoComplete="off"
        aria-label={label}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? id + '-err' : undefined}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
      />
      {error && <small id={id + '-err'} className="err">{error}</small>}
    </>
  );
}

function EditRow({ item, items, categories, onSave, onCancel, oneSection }) {
  const [draft, setDraft] = useState(() => draftOf(item));
  const [tried, setTried] = useState(false);
  const { errors, item: clean } = readDraft(draft, items, item.id);
  const shown = tried ? errors : {};
  const set = k => v => setDraft(d => ({ ...d, [k]: v }));
  const s = parseCount(draft.stock), t = parseCount(draft.threshold);
  const liveStatus = Number.isNaN(s) || Number.isNaN(t) ? null : statusOf(s, t);
  const p = 'edit-' + item.id;

  // Inside one section's tab the Section column is hidden, so the picker sits under the item name instead.
  const sectionPicker = (
    <>
        <select id={p + '-section'} data-field="section" className="input" aria-label="Section" value={draft.section}
          aria-invalid={shown.section ? 'true' : undefined} onChange={e => set('section')(e.target.value)}>
          {SECTIONS.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        {shown.section && <small className="err">{shown.section}</small>}
    </>
  );

  function save() {
    setTried(true);
    if (Object.keys(errors).length) return;
    onSave({ ...item, ...clean });
  }
  function key(e) {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  }

  return (
    <tr className="editing" onKeyDown={key}>
      <td data-label="Item name"><EditInput id={p + '-name'} field="name" label="Item name" value={draft.name} error={shown.name} mode="text" onChange={set('name')} autoFocus />
        {oneSection && <div className="sec-in-name">{sectionPicker}</div>}</td>
      {!oneSection && <td data-label="Section" className="col-sec">{sectionPicker}</td>}
      <td data-label="Category">
        <CategoryPicker id={p + '-category'} label="Category" value={draft.category} categories={categories} invalid={!!shown.category}
          onChange={set('category')} />
        {shown.category && <small className="err">{shown.category}</small>}
      </td>
      <td data-label="Stock level" className="num"><EditInput id={p + '-stock'} field="stock" label="Stock level" value={draft.stock} error={shown.stock} mode="numeric" onChange={set('stock')} /></td>
      <td data-label="Reorder threshold" className="num"><EditInput id={p + '-threshold'} field="threshold" label="Reorder threshold" value={draft.threshold} error={shown.threshold} mode="numeric" onChange={set('threshold')} /></td>
      <td data-label="Unit price" className="num"><EditInput id={p + '-price'} field="price" label="Unit price (RM)" value={draft.price} error={shown.price} mode="decimal" onChange={set('price')} /></td>
      <td data-label="Total value" className="num total" aria-live="polite">{(() => { const t = draftTotal(draft); return t.state === 'ok' ? formatRM(t.sen) : <span className="muted" title={t.state === 'bad' ? 'Check the ' + t.bad.join(' and ') : 'Fill in ' + t.missing.join(' and ')}>–</span>; })()}</td>
      <td data-label="Status">{liveStatus ? <StatusBadge status={liveStatus} /> : <span className="muted">–</span>}</td>
      <td className="acts">
        <button type="button" className="btn sm primary" onClick={save}>Save</button>
        <button type="button" className="btn sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  );
}

/** A column header that sorts: first click A to Z / low to high, next click the other way. */
function SortHeader({ k, sortKey, sortDir, onSort, num, className }) {
  const on = sortKey === k, label = SORT_KEYS[k].label;
  const next = on && sortDir === 'asc' ? 'desc' : 'asc';
  return (
    <th scope="col" className={[num ? 'num' : '', className || ''].join(' ').trim() || undefined} aria-sort={on ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className={'sort' + (on ? ' on' : '')} onClick={() => onSort(k, next)} title={'Sort by ' + sortDescription(k, next)}>
        {label}
        <svg viewBox="0 0 12 16" aria-hidden="true">
          <path className={on && sortDir === 'asc' ? 'lit' : ''} d="M6 2 10 7H2z" />
          <path className={on && sortDir === 'desc' ? 'lit' : ''} d="M6 14 2 9h8z" />
        </svg>
      </button>
    </th>
  );
}

export default function InventoryTable({ items, allItems, everyItem, categories, editingId, onEdit, onSave, onCancelEdit, onAskDelete, sortKey, sortDir, onSort, onClearFilters, emptyText, oneSection }) {
  const editBtn = useRef({});
  const lastEdited = useRef(null);
  // After Save or Cancel, put focus back on that row's Edit button.
  useEffect(() => {
    if (editingId === null && lastEdited.current) {
      editBtn.current[lastEdited.current]?.focus();
      lastEdited.current = null;
    }
  }, [editingId]);

  if (!allItems.length) return <p className="empty">{emptyText || 'No items yet. Add your first item above.'}</p>;
  if (!items.length) return (
    <div className="empty">
      <p>No items match your search and filters.</p>
      <button type="button" className="btn sm" onClick={onClearFilters}>Clear search and filters</button>
    </div>
  );
  const sh = { sortKey, sortDir, onSort };

  return (
    <div className="table-wrap">
      <table className={'inv' + (oneSection ? ' one-section' : '')}>
        <thead>
          <tr>
            <SortHeader k="name" {...sh} />
            <SortHeader k="section" className="col-sec" {...sh} />
            <SortHeader k="category" {...sh} />
            <SortHeader k="stock" num {...sh} />
            <SortHeader k="threshold" num {...sh} />
            <SortHeader k="price" num {...sh} />
            <SortHeader k="total" num {...sh} />
            <SortHeader k="status" {...sh} />
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => it.id === editingId ? (
            <EditRow key={it.id} item={it} items={everyItem || allItems} categories={categories} oneSection={oneSection}
              onSave={v => { lastEdited.current = it.id; onSave(v); }}
              onCancel={() => { lastEdited.current = it.id; onCancelEdit(); }} />
          ) : (
            <tr key={it.id}>
              <th scope="row" data-label="Item name">{it.name}</th>
              <td data-label="Section" className="col-sec">{SECTION_LABEL[it.section] || '–'}</td>
              <td data-label="Category">{it.category}</td>
              <td data-label="Stock level" className="num">{it.stock}</td>
              <td data-label="Reorder threshold" className="num">{it.threshold}</td>
              <td data-label="Unit price" className="num">{formatRM(it.priceSen)}</td>
              <td data-label="Total value" className="num total">{formatRM(totalSen(it.stock, it.priceSen))}</td>
              <td data-label="Status"><StatusBadge status={statusOf(it.stock, it.threshold)} /></td>
              <td className="acts">
                <button type="button" className="btn sm" ref={el => { editBtn.current[it.id] = el; }}
                  disabled={editingId !== null} onClick={() => onEdit(it.id)} aria-label={'Edit ' + it.name}>Edit</button>
                <button type="button" className="btn sm danger-ghost" disabled={editingId !== null}
                  onClick={() => onAskDelete(it.id)} aria-label={'Delete ' + it.name}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

