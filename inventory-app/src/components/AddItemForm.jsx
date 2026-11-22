import { useState } from 'react';
import { EMPTY_DRAFT, readDraft, draftTotal, totalHint, formatRM, newId } from '../inventory.js';
import ItemFields from './ItemFields.jsx';

export default function AddItemForm({ items, categories, onAdd }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [tried, setTried] = useState(false);
  const { errors, item } = readDraft(draft, items, null);
  const shown = tried ? errors : {};
  const total = draftTotal(draft);

  function submit(e) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) {
      const first = e.currentTarget.querySelector('[aria-invalid="true"], [data-field="' + Object.keys(errors)[0] + '"]');
      if (first) first.focus();
      return;
    }
    onAdd({ id: newId(), ...item });
    setDraft(EMPTY_DRAFT);
    setTried(false);
    e.currentTarget.querySelector('[data-field="name"]').focus();
  }

  return (
    <section className="card" aria-labelledby="add-h">
      <h2 id="add-h">Add an item</h2>
      <form className="add-form" onSubmit={submit} noValidate>
        <ItemFields idPrefix="add" draft={draft} errors={shown} categories={categories} onChange={setDraft} />
        <div className="add-foot">
          <p className={'total-preview ' + total.state} aria-live="polite">
            Total value <strong>{total.state === 'bad' ? '–' : formatRM(total.sen)}</strong>
            <span>{totalHint(total)}</span>
          </p>
          <button type="submit" className="btn primary">Add item</button>
        </div>
      </form>
    </section>
  );
}
