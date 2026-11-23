import { useState } from 'react';
import { EMPTY_DRAFT, readDraft, draftTotal, totalHint, formatRM, newId, SECTION_LABEL } from '../inventory.js';
import ItemFields from './ItemFields.jsx';

/**
 * sectionTab: the section being viewed ('' = all).
 * section / onSectionChange: the form's Section, kept by the page so that choosing a section tab sets it
 * in the same moment (not one step later).
 */
export default function AddItemForm({ items, categories, onAdd, sectionTab, section = '', onSectionChange = () => {} }) {
  const [rest, setRest] = useState(EMPTY_DRAFT);
  const draft = { ...rest, section };
  const [tried, setTried] = useState(false);
  const [added, setAdded] = useState('');
  const [round, setRound] = useState(0);   // bumps after each add, so the Category picker starts fresh
  const { errors, item } = readDraft(draft, items, null);
  const shown = tried ? errors : {};
  const total = draftTotal(draft);

  function change(next, key) {
    if (key === 'section') onSectionChange(next.section);
    else setRest({ ...next, section: '' });
    setAdded('');
  }

  function submit(e) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) {
      const first = e.currentTarget.querySelector('[data-field="' + Object.keys(errors)[0] + '"]');
      if (first) first.focus();
      return;
    }
    onAdd({ id: newId(), ...item });
    setAdded(item.name + ' added to ' + SECTION_LABEL[item.section] + '.' + (sectionTab && sectionTab !== item.section ? ' Choose the ' + SECTION_LABEL[item.section] + ' tab to see it.' : ''));
    // the section stays for the next item: people usually add several for the same section
    setRest(EMPTY_DRAFT);
    setRound(r => r + 1);
    setTried(false);
    e.currentTarget.querySelector('[data-field="name"]').focus();
  }

  return (
    <section className="card" aria-labelledby="add-h">
      <div className="card-h">
        <div>
          <h2 id="add-h">Add an item</h2>
          <p className="card-sub">Choose the section and category. Total value and status are worked out for you.</p>
        </div>
      </div>
      <form className="add-form" onSubmit={submit} noValidate>
        <ItemFields idPrefix="add" draft={draft} errors={shown} categories={categories} onChange={change} round={round} />
        <div className="add-foot">
          <p className={'total-preview ' + total.state} aria-live="polite">
            Total value <strong>{total.state === 'bad' ? '–' : formatRM(total.sen)}</strong>
            <span>{totalHint(total)}</span>
          </p>
          <button type="submit" className="btn primary">Add item</button>
        </div>
        {added && <p className="added">{added}</p>}
      </form>
    </section>
  );
}
