// The five fields a person types in. Total Value and Status are never typed: they are worked out.
const FIELDS = [
  { key: 'name', label: 'Item name', placeholder: 'e.g. Junior Shirt', mode: 'text' },
  { key: 'category', label: 'Category', placeholder: 'e.g. Uniform', mode: 'text', list: true },
  { key: 'stock', label: 'Stock level', placeholder: '0', mode: 'numeric' },
  { key: 'threshold', label: 'Reorder threshold', placeholder: '0', mode: 'numeric' },
  { key: 'price', label: 'Unit price (RM)', placeholder: '0.00', mode: 'decimal' },
];

export default function ItemFields({ idPrefix, draft, errors, categories, onChange, compact = false }) {
  const listId = idPrefix + '-cats';
  return (
    <>
      {FIELDS.map(f => {
        const id = idPrefix + '-' + f.key, err = errors[f.key];
        return (
          <label key={f.key} className={'field field-' + f.key} htmlFor={id}>
            <span className={compact ? 'sr-only' : undefined}>{f.label}</span>
            <input
              id={id}
              data-field={f.key}
              className="input"
              type="text"
              inputMode={f.mode}
              autoComplete="off"
              placeholder={f.placeholder}
              value={draft[f.key]}
              list={f.list ? listId : undefined}
              aria-invalid={err ? 'true' : undefined}
              aria-describedby={err ? id + '-err' : undefined}
              aria-label={compact ? f.label : undefined}
              onChange={e => onChange({ ...draft, [f.key]: e.target.value })}
            />
            {err && <small id={id + '-err'} className="err">{err}</small>}
          </label>
        );
      })}
      <datalist id={listId}>{categories.map(c => <option key={c} value={c} />)}</datalist>
    </>
  );
}
