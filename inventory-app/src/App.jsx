import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoryList, viewItems, SECTION_LABEL, STATUS_LABEL, toCSV, csvFilename, downloadCSV } from './inventory.js';
import AddItemForm from './components/AddItemForm.jsx';
import InventoryTable from './components/InventoryTable.jsx';
import ConfirmDelete from './components/ConfirmDelete.jsx';
import ReorderAlert from './components/ReorderAlert.jsx';
import TableTools from './components/TableTools.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import SectionTabs from './components/SectionTabs.jsx';
import SheetBar from './components/SheetBar.jsx';
import { connect, friendlyError } from './store.js';

const NO_FILTERS = { query: '', category: '', status: '', sortKey: '', sortDir: 'asc' };

/** store: where items are kept (see store.js). Tests pass their own; normally it is picked automatically. */
export default function App({ store: given }) {
  const [store] = useState(() => given || connect());
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [meta, setMeta] = useState({ sync: null, sheet: null });
  useEffect(() => store.subscribe(
    list => { setItems(list); setLoaded(true); setLoadError(''); },
    e => { setLoaded(true); setLoadError(friendlyError(e)); },
  ), [store]);
  useEffect(() => store.subscribeMeta(setMeta), [store]);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState('');
  const [view, setView] = useState(NO_FILTERS);
  const [section, setSection] = useState('');            // '' = all sections
  const [addSection, setAddSection] = useState('');      // the add form's Section; a section tab sets it
  const scoped = useMemo(() => (section ? items.filter(i => i.section === section) : items), [items, section]);
  const shown = useMemo(() => viewItems(scoped, view), [scoped, view]);
  const scope = section ? SECTION_LABEL[section] : '';
  // what is narrowing the table, for the "no results" message: “cap” · Uniform · Low Stock, in Senior
  const filterWords = [view.query.trim() && '“' + view.query.trim() + '”', view.category, view.status && STATUS_LABEL[view.status]].filter(Boolean);
  const emptyDetail = filterWords.length ? 'Looking for ' + filterWords.join(' · ') + (scope ? ' in ' + scope : '') + '. Try fewer words or another filter.' : '';

  function exportCSV() {
    if (!shown.length) return;
    downloadCSV(toCSV(shown), csvFilename(section));
    setNotice('Exported ' + shown.length + (shown.length === 1 ? ' row' : ' rows') + ' to CSV.');
  }

  const categories = useMemo(() => categoryList(items), [items]);

  const toDelete = items.find(i => i.id === deleteId) || null;
  const cancelDelete = useCallback(() => setDeleteId(null), []);

  // The list updates at once; if the database refuses a change, it is undone and a message says why.
  const failed = what => e => setSaveError(what + ' ' + friendlyError(e));
  function add(item) {
    setSaveError('');
    store.add(item).catch(failed('Could not add ' + item.name + '.'));
    setNotice(item.name + ' added to ' + SECTION_LABEL[item.section] + '.');
  }
  function save(item) {
    setSaveError('');
    store.save(item).catch(failed('Could not save ' + item.name + '.'));
    setEditingId(null);
    setNotice(item.name + ' saved.');
  }
  function remove() {
    const name = toDelete.name;
    setSaveError('');
    store.remove(deleteId).catch(failed('Could not delete ' + name + '.'));
    setDeleteId(null);
    setNotice(name + ' deleted.');
  }

  return (
    <div className="page">
      <main>
        <SectionTabs items={items} value={section} onChange={v => { setSection(v); if (v) setAddSection(v); setEditingId(null); }} />

        {loadError && <p className="banner bad" role="alert">{loadError}</p>}
        {saveError && (
          <p className="banner bad" role="alert">
            <span>{saveError}</span>
            <button type="button" className="linkbtn" onClick={() => setSaveError('')}>Dismiss</button>
          </p>
        )}

        <SummaryCards items={scoped} scope={scope} />

        {store.mode === 'firebase' && <SheetBar meta={meta} store={store} />}

        <AddItemForm items={items} categories={categories} onAdd={add} sectionTab={section} section={addSection} onSectionChange={setAddSection} />

        <ReorderAlert items={scoped} scope={scope} />

        <section className="card" aria-labelledby="list-h">
          <div className="card-h">
            <div>
              <h2 id="list-h">{scope ? scope + ' items' : 'Items'}</h2>
              <p className="card-sub">Search by name, section or category, filter and sort. Tap Edit to change an item.</p>
            </div>
          </div>
          <TableTools items={scoped} view={view} onChange={setView} shown={shown.length} onExport={exportCSV} />
          <InventoryTable
            items={shown}
            allItems={scoped}
            everyItem={items}
            oneSection={!!section}
            emptyText={!loaded ? 'Loading inventory…' : loadError ? 'The inventory could not be loaded.' : scope ? 'No items in ' + scope + ' yet. Add one above.' : ''}
            emptyDetail={emptyDetail}
            sortKey={view.sortKey}
            sortDir={view.sortDir}
            onSort={(k, d) => setView(v => ({ ...v, sortKey: k, sortDir: d }))}
            onClearFilters={() => setView(v => ({ ...NO_FILTERS, sortKey: v.sortKey, sortDir: v.sortDir }))}
            categories={categories}
            editingId={editingId}
            onEdit={setEditingId}
            onSave={save}
            onCancelEdit={() => setEditingId(null)}
            onAskDelete={setDeleteId}
          />
        </section>
        <p className="sr-only" role="status" aria-live="polite">{notice}</p>
      </main>

      {toDelete && <ConfirmDelete item={toDelete} onCancel={cancelDelete} onConfirm={remove} />}
    </div>
  );
}
