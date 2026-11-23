import { useState } from 'react';

const OTHER = '__other';

/**
 * Category as a real dropdown (the same on every browser and phone): the built-in categories, any others in use,
 * and "Other…", which opens a box to type a new one. value is the category text.
 */
export default function CategoryPicker({ id, value, onChange, categories, invalid, describedBy, label, autoFocusOther }) {
  const match = categories.find(c => c.toLowerCase() === String(value || '').trim().toLowerCase());
  const [typing, setTyping] = useState(!!value && !match);
  const other = typing || (!!value && !match);
  return (
    <div className="cat-pick">
      <select id={id} data-field="category" className="input" aria-label={label} aria-invalid={invalid ? 'true' : undefined} aria-describedby={describedBy}
        value={other ? OTHER : (match || '')}
        onChange={e => {
          if (e.target.value === OTHER) { setTyping(true); onChange(''); }
          else { setTyping(false); onChange(e.target.value); }
        }}>
        <option value="" disabled>Choose…</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
        <option value={OTHER}>Other…</option>
      </select>
      {other && (
        <input id={id + '-new'} className="input" type="text" autoComplete="off" maxLength={40} placeholder="Type the new category…"
          aria-label={'New ' + (label || 'category').toLowerCase()} aria-invalid={invalid ? 'true' : undefined}
          value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocusOther !== false} />
      )}
    </div>
  );
}
