import { useEffect, useMemo, useRef, useState } from 'react';
import { readImport, TEMPLATE_CSV, DEFAULT_CATEGORY_CHOICES } from '../importCsv.js';
import { SECTIONS, SECTION_LABEL, formatRM, downloadCSV } from '../inventory.js';

const SHOW_ROWS = 100, SHOW_PROBLEMS = 25;

/**
 * Import CSV: choose a file (or paste rows), see exactly what will happen to each row, then import.
 * Nothing is saved until "Import" is pressed.
 */
export default function ImportDialog({ items, onImport, onClose }) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [defaultSection, setDefaultSection] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [onExisting, setOnExisting] = useState('update');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const boxRef = useRef(null), fileRef = useRef(null);

  const res = useMemo(() => (text.trim() ? readImport(text, items, { defaultSection, defaultCategory, onExisting }) : null),
    [text, items, defaultSection, defaultCategory, onExisting]);
  const count = a => (res ? res.rows.filter(r => r.action === a).length : 0);
  const nNew = count('new'), nUpd = count('update'), nSkip = count('skip'), nSave = nNew + nUpd;

  useEffect(() => {
    const before = document.activeElement;
    fileRef.current?.focus();
    const key = e => { if (e.key === 'Escape' && !busy) { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', key);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', key); document.body.classList.remove('modal-open'); if (before && before.isConnected) before.focus(); };
  }, [busy, onClose]);

  function pick(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setError('');
    const fr = new FileReader();
    fr.onload = () => { setText(String(fr.result || '')); setFileName(f.name); };
    fr.onerror = () => setError('That file could not be read.');
    fr.readAsText(f);
  }

  function go() {
    if (!nSave || busy) return;
    setBusy(true); setError('');
    onImport(res.rows, (done, all) => setProgress('Saved ' + done + ' of ' + all + '…'))
      .then(() => onClose({ added: nNew, updated: nUpd, skipped: nSkip + res.problems.length }))
      .catch(e => { setBusy(false); setProgress(''); setError(e && e.message ? e.message : String(e)); });
  }

  const what = r => r.action === 'new' ? 'New'
    : r.action === 'skip' ? 'Already there: left as it is'
      : 'Update' + (r.existing.stock !== r.item.stock ? ' (stock ' + r.existing.stock + ' → ' + r.item.stock + ')' : '');

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className="dialog dialog-wide" role="dialog" aria-modal="true" aria-labelledby="imp-h" ref={boxRef}>
        <div className="dialog-head">
          <h2 id="imp-h">Import CSV</h2>
          <button type="button" className="btn sm" onClick={() => onClose()} disabled={busy} aria-label="Close">Close</button>
        </div>
        <div className="dialog-body">
          <p className="dialog-lead">
            Add or update many items at once from a spreadsheet: one row per item with the columns <b>Item Name, Section, Category, Stock Level, Reorder Threshold, Unit Price (RM)</b>.
            A file from <b>Export CSV</b> works too, so you can download, change it in Excel or Google Sheets, and upload it again.
          </p>
          <div className="imp-pick">
            <label className="btn primary" htmlFor="imp-file">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M5 20h14" /></svg>
              Choose CSV file
            </label>
            <input id="imp-file" ref={fileRef} className="sr-only" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={pick} disabled={busy} />
            <button type="button" className="btn" onClick={() => downloadCSV(TEMPLATE_CSV, 'inventory-template.csv')}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
              Download template
            </button>
            {fileName && <span className="imp-file">{fileName}</span>}
          </div>
          <details className="imp-paste">
            <summary>Or paste rows copied from a spreadsheet</summary>
            <label className="sr-only" htmlFor="imp-text">Rows to import</label>
            <textarea id="imp-text" className="input" rows="5" value={text} onChange={e => { setText(e.target.value); setFileName(''); }}
              placeholder={'Item Name,Section,Category,Stock Level,Reorder Threshold,Unit Price (RM)\nBrigade Tee (M),Junior,Uniform,5,3,35.00'} disabled={busy} />
          </details>

          {res && (
            <>
              <div className="imp-opts">
                <div className="field">
                  <label htmlFor="imp-sec">Rows with no section go to</label>
                  <select id="imp-sec" className="input" value={defaultSection} onChange={e => setDefaultSection(e.target.value)} disabled={busy}>
                    <option value="">Ask me (leave them out)</option>
                    {SECTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="imp-cat">Rows with no category go to</label>
                  <select id="imp-cat" className="input" value={defaultCategory} onChange={e => setDefaultCategory(e.target.value)} disabled={busy}>
                    <option value="">Ask me (leave them out)</option>
                    {DEFAULT_CATEGORY_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <fieldset className="field imp-exist">
                  <legend>If an item is already in the inventory (same name, section and category)</legend>
                  <label><input type="radio" name="imp-ex" value="update" checked={onExisting === 'update'} onChange={() => setOnExisting('update')} disabled={busy} /> Update its stock, reorder threshold and price</label>
                  <label><input type="radio" name="imp-ex" value="skip" checked={onExisting === 'skip'} onChange={() => setOnExisting('skip')} disabled={busy} /> Leave it as it is</label>
                </fieldset>
              </div>

              <p className="imp-sum" aria-live="polite">
                <b>{nSave ? nSave + (nSave === 1 ? ' item' : ' items') + ' ready' : 'Nothing to import yet'}</b>
                {nSave > 0 && ': ' + [nNew && nNew + ' new', nUpd && nUpd + ' updated'].filter(Boolean).join(', ')}
                {nSkip > 0 && ' · ' + nSkip + ' already there, left as they are'}
                {res.problems.length > 0 && <span className="imp-bad"> · {res.problems.length} {res.problems.length === 1 ? 'row has a problem and is' : 'rows have problems and are'} left out</span>}
              </p>
              {res.notes.length > 0 && <ul className="imp-notes">{res.notes.map(n => <li key={n}>{n}</li>)}</ul>}
              {res.problems.length > 0 && (
                <ul className="imp-problems">
                  {res.problems.slice(0, SHOW_PROBLEMS).map((p, i) => <li key={i}>{p.line ? <b>Line {p.line}: </b> : null}{p.message}</li>)}
                  {res.problems.length > SHOW_PROBLEMS && <li>…and {res.problems.length - SHOW_PROBLEMS} more.</li>}
                </ul>
              )}
              {res.rows.length > 0 && (
                <div className="imp-table">
                  <table>
                    <thead><tr><th scope="col">Line</th><th scope="col">Item</th><th scope="col">Section</th><th scope="col">Category</th><th scope="col" className="num">Stock</th><th scope="col" className="num">Reorder</th><th scope="col" className="num">Unit price</th><th scope="col">What happens</th></tr></thead>
                    <tbody>
                      {res.rows.slice(0, SHOW_ROWS).map(r => (
                        <tr key={r.line} className={'imp-' + r.action}>
                          <td>{r.line}</td><th scope="row">{r.item.name}</th><td>{SECTION_LABEL[r.item.section]}</td><td>{r.item.category}</td>
                          <td className="num">{r.item.stock}</td><td className="num">{r.item.threshold}</td><td className="num">{formatRM(r.item.priceSen)}</td><td>{what(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {res.rows.length > SHOW_ROWS && <p className="imp-more">Showing the first {SHOW_ROWS} of {res.rows.length} rows. All of them are imported.</p>}
                </div>
              )}
            </>
          )}
          {error && <p className="banner bad" role="alert">Nothing more was imported: {error}</p>}
        </div>
        <div className="dialog-acts">
          {progress && <span className="imp-progress" aria-live="polite">{progress}</span>}
          <button type="button" className="btn" onClick={() => onClose()} disabled={busy}>Cancel</button>
          <button type="button" className="btn primary" onClick={go} disabled={!nSave || busy}>
            {busy ? 'Importing…' : nSave ? 'Import ' + nSave + (nSave === 1 ? ' item' : ' items') : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
