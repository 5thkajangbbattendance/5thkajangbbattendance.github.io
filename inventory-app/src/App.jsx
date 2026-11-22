import { useCallback, useMemo, useState } from 'react';
import { SAMPLE_ITEMS, CATEGORIES } from './inventory.js';
import AddItemForm from './components/AddItemForm.jsx';
import InventoryTable from './components/InventoryTable.jsx';
import ConfirmDelete from './components/ConfirmDelete.jsx';

export default function App() {
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => {
    const seen = new Map();
    CATEGORIES.concat(items.map(i => i.category)).forEach(c => { if (!seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c); });
    return [...seen.values()];
  }, [items]);

  const toDelete = items.find(i => i.id === deleteId) || null;
  const cancelDelete = useCallback(() => setDeleteId(null), []);

  function add(item) { setItems(list => [...list, item]); setNotice(item.name + ' added.'); }
  function save(item) { setItems(list => list.map(i => (i.id === item.id ? item : i))); setEditingId(null); setNotice(item.name + ' saved.'); }
  function remove() {
    const name = toDelete.name;
    setItems(list => list.filter(i => i.id !== deleteId));
    setDeleteId(null);
    setNotice(name + ' deleted.');
  }

  return (
    <div className="page">
      <main>
        <AddItemForm items={items} categories={categories} onAdd={add} />

        <section className="card" aria-labelledby="list-h">
          <div className="card-h">
            <h2 id="list-h">Items</h2>
            <span className="count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
          </div>
          <InventoryTable
            items={items}
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
