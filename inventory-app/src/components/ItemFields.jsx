import { SECTIONS } from '../inventory.js';

// The fields a person fills in. Total Value and Status are never typed: they are worked out.
const FIELDS = [
  { key: 'name', label: 'Item name', placeholder: 'e.g. Junior Shirt', mode: 'text' },
  { key: 'section', label: 'Section', select: true },
  { key: 'category', label: 'Category', placeholder: 'e.g. Uniform', mode: 'text', list: true },
  { key: 'stock', label: 'Stock level', placeholder: '0', mode: 'numeric' },
  { key: 'threshold', label: 'Reorder threshold', placeholder: '0', mode: 'numeric' },
  { key: 'price', label: 'Unit price (RM)', placeholder: '0.00', mode: 'decimal' },
];

export default function ItemFields({ idPrefix, draft, errors, categories, onChange }) {
  const listId = idPrefix + '-cats';
  return (
    <>
      {FIELDS.map(f => {
        const id = idPrefix + '-' + f.key, err = errors[f.key];
        const common = {
          id, 'data-field': f.key, className: 'input', value: draft[f.key],
          'aria-invalid': err ? 'true' : undefined, 'aria-describedby': err ? id + '-err' : undefined,
          onChange: e => onChange({ ...draft, [f.key]: e.target.value }, f.key),
        };
        return (
          <div key={f.key} className={'field field-' + f.key}>
            <label htmlFor={id}>{f.label}</label>
            {f.select ? (
              <select {...common}>
                <option value="" disabled>Choose…</option>
                {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            ) : (
              <input {...common} type="text" inputMode={f.mode} autoComplete="off" placeholder={f.placeholder} list={f.list ? listId : undefined} />
            )}
            {err && <small id={id + '-err'} className="err">{err}</small>}
          </div>
        );
      })}
      <datalist id={listId}>{categories.map(c => <option key={c} value={c} />)}</datalist>
    </>
  );
}
