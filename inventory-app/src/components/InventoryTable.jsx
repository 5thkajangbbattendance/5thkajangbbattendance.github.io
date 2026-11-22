import { useEffect, useRef, useState } from 'react';
import { totalSen, statusOf, formatRM, readDraft, draftOf, parseCount, draftTotal } from '../inventory.js';

import StatusBadge from './StatusBadge.jsx';

function EditInput({ id, field, label, value, error, mode, list, onChange, autoFocus }) {
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
        list={list}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
      />
      {error && <small id={id + '-err'} className="err">{error}</small>}
    </>
  );
}

function EditRow({ item, items, categories, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => draftOf(item));
  const [tried, setTried] = useState(false);
  const { errors, item: clean } = readDraft(draft, items, item.id);
  const shown = tried ? errors : {};
  const set = k => v => setDraft(d => ({ ...d, [k]: v }));
  const s = parseCount(draft.stock), t = parseCount(draft.threshold);
  const liveStatus = Number.isNaN(s) || Number.isNaN(t) ? null : statusOf(s, t);
  const p = 'edit-' + item.id;

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
      <td data-label="Item name"><EditInput id={p + '-name'} field="name" label="Item name" value={draft.name} error={shown.name} mode="text" onChange={set('name')} autoFocus /></td>
      <td data-label="Category"><EditInput id={p + '-category'} field="category" label="Category" value={draft.category} error={shown.category} mode="text" list={p + '-cats'} onChange={set('category')} />
        <datalist id={p + '-cats'}>{categories.map(c => <option key={c} value={c} />)}</datalist></td>
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

export default function InventoryTable({ items, categories, editingId, onEdit, onSave, onCancelEdit, onAskDelete }) {
  const editBtn = useRef({});
  const lastEdited = useRef(null);
  // After Save or Cancel, put focus back on that row's Edit button.
  useEffect(() => {
    if (editingId === null && lastEdited.current) {
      editBtn.current[lastEdited.current]?.focus();
      lastEdited.current = null;
    }
  }, [editingId]);

  if (!items.length) return <p className="empty">No items yet. Add your first item above.</p>;

  return (
    <div className="table-wrap">
      <table className="inv">
        <thead>
          <tr>
            <th scope="col">Item Name</th>
            <th scope="col">Category</th>
            <th scope="col" className="num">Stock Level</th>
            <th scope="col" className="num">Reorder Threshold</th>
            <th scope="col" className="num">Unit Price</th>
            <th scope="col" className="num">Total Value</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map(it => it.id === editingId ? (
            <EditRow key={it.id} item={it} items={items} categories={categories}
              onSave={v => { lastEdited.current = it.id; onSave(v); }}
              onCancel={() => { lastEdited.current = it.id; onCancelEdit(); }} />
          ) : (
            <tr key={it.id}>
              <th scope="row" data-label="Item name">{it.name}</th>
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

