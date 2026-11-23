import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { firebaseStore, localStore, sheetHook, friendlyError } from './store.js';

/* A small stand-in for Parade HQ's Firestore (compat API): records what is written. */
function fakeDb({ failCommit } = {}) {
  const writes = [];
  const ref = path => ({ path, collection: c => ({ doc: id => ref(path + '/' + c + '/' + id) }) });
  const db = {
    writes,
    collection: c => ({ doc: id => ref(c + '/' + id), onSnapshot: () => () => {} }),
    doc: p => ({ ...ref(p), onSnapshot: () => () => {} }),
    batch: () => {
      const ops = [];
      return {
        set: (r, data, opt) => ops.push({ op: 'set', path: r.path, data, opt }),
        update: (r, data) => ops.push({ op: 'update', path: r.path, data }),
        delete: r => ops.push({ op: 'delete', path: r.path }),
        commit: () => (failCommit ? Promise.reject({ code: 'permission-denied' }) : (writes.push(...ops), Promise.resolve())),
      };
    },
  };
  return db;
}
// Objects "made by Parade HQ": a different constructor, like the parent page's Object
function HostObject() {}
const FieldValue = { increment: n => ({ inc: n }) };
const item = { id: 'a1', name: 'Brigade Tee', section: 'junior', category: 'Uniform', stock: 5, threshold: 3, priceSen: 3500 };

describe('database store', () => {
  beforeEach(() => { globalThis.fetch = vi.fn(() => Promise.resolve()); });

  it('saves an item with who changed it, adds 1 to the sync counter, all as Parade HQ objects', async () => {
    const db = fakeDb();
    const s = firebaseStore({ db, FieldValue, Object: HostObject, me: { uid: 'u1', name: 'Mr. Wong' } });
    await s.add(item);
    const [w, sync] = db.writes;
    expect(w.op).toBe('set');
    expect(w.path).toBe('inventoryItems/a1');
    expect(w.data).toBeInstanceOf(HostObject);
    expect({ ...w.data }).toMatchObject({ name: 'Brigade Tee', section: 'junior', category: 'Uniform', stock: 5, threshold: 3, priceSen: 3500, by: 'Mr. Wong', byUid: 'u1' });
    expect(w.data.createdAt).toBe(w.data.updatedAt);
    expect(Object.keys(w.data)).not.toContain('id');
    expect(sync.path).toBe('inventoryMeta/sync');
    expect(sync.data).toBeInstanceOf(HostObject);
    expect(sync.data.rev).toEqual({ inc: 1 });
    expect({ ...sync.opt }).toEqual({ merge: true });

    await s.save({ ...item, stock: 2 });
    expect(db.writes[2].op).toBe('update');
    expect(db.writes[2].data.stock).toBe(2);
    expect('createdAt' in db.writes[2].data).toBe(false);      // the first-added time is kept
    await s.remove('a1');
    expect(db.writes[4]).toEqual({ op: 'delete', path: 'inventoryItems/a1' });
  });

  it('tells the Google Sheet after each save, only when a real Apps Script link is connected', async () => {
    const hook = 'https://script.google.com/macros/s/AKfycbTESTdeploymentId0123456789/exec';
    expect(sheetHook({ hook })).toBe(hook);
    expect(sheetHook({ hook: 'https://evil.example/x' })).toBe('');
    let metaCb;
    const db = fakeDb();
    db.doc = p => ({ path: p, onSnapshot: cb => { if (p === 'inventoryMeta/sheet') metaCb = cb; return () => {}; } });
    const s = firebaseStore({ db, FieldValue, me: { uid: 'u1' } });
    s.subscribeMeta(() => {});
    await s.add(item);
    expect(fetch).not.toHaveBeenCalled();
    metaCb({ exists: true, data: () => ({ hook }) });
    await s.add({ ...item, id: 'a2' });
    expect(fetch).toHaveBeenCalledWith(hook, expect.objectContaining({ method: 'POST', mode: 'no-cors' }));
  });

  it('puts database errors in plain words', () => {
    expect(friendlyError({ code: 'permission-denied' })).toMatch(/publish the latest database rules/);
    expect(friendlyError({ code: 'unavailable' })).toMatch(/No internet/);
  });
});

describe('the page with a database', () => {
  it('shows "Loading inventory…" until the first list arrives', () => {
    const store = { ...localStore([]), mode: 'firebase', subscribe: () => () => {}, subscribeMeta: () => () => {}, me: { duty: 'leader' } };
    render(<App store={store} />);
    expect(screen.getByText('Loading inventory…')).toBeInTheDocument();
  });

  it('says why when the inventory cannot be read', () => {
    const store = { ...localStore([]), mode: 'firebase', subscribe: (cb, onError) => { onError({ code: 'permission-denied' }); return () => {}; }, subscribeMeta: () => () => {}, me: {} };
    render(<App store={store} />);
    expect(screen.getByRole('alert')).toHaveTextContent('publish the latest database rules');
    expect(screen.getByText('The inventory could not be loaded.')).toBeInTheDocument();
  });

  it('shows a message when the database refuses a change', async () => {
    const u = userEvent.setup();
    const base = localStore();
    const store = { ...base, mode: 'firebase', me: { duty: 'owner' }, subscribeMeta: cb => { cb({ sync: null, sheet: null }); return () => {}; },
      save: () => Promise.reject({ code: 'permission-denied' }) };
    render(<App store={store} />);
    await u.click(screen.getByRole('button', { name: 'Edit Haversack' }));
    await u.click(within(screen.getAllByRole('row').find(r => r.classList.contains('editing'))).getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save Haversack. Parade HQ did not allow this.');
    await u.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the Google Sheet bar: Owner sees how to connect; then up to date / updating / late, with Open spreadsheet', () => {
    const mk = (meta, duty = 'owner') => ({ ...localStore(), mode: 'firebase', me: { duty }, ping: () => true, subscribeMeta: cb => { cb(meta); return () => {}; } });
    const { unmount } = render(<App store={mk({ sync: null, sheet: null })} />);
    expect(screen.getByRole('link', { name: 'How to connect' })).toHaveAttribute('href', expect.stringContaining('SHEET-SETUP.md'));
    unmount();
    const r2 = render(<App store={mk({ sync: null, sheet: null }, 'leader')} />);
    expect(screen.queryByText(/Google Sheet/)).toBeNull();          // others only see it once it is connected
    r2.unmount();
    const url = 'https://docs.google.com/spreadsheets/d/X/edit', now = new Date().toISOString(), old = new Date(Date.now() - 10 * 60000).toISOString();
    const r3 = render(<App store={mk({ sync: { rev: 3, at: now }, sheet: { url, rev: 3, syncedAt: now } }, 'leader')} />);
    expect(screen.getByText(/up to date \(copied just now\)/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open spreadsheet' })).toHaveAttribute('href', url);
    r3.unmount();
    const r4 = render(<App store={mk({ sync: { rev: 4, at: now }, sheet: { url, rev: 3, syncedAt: now } })} />);
    expect(screen.getByText(/updating now/)).toBeInTheDocument();
    r4.unmount();
    render(<App store={mk({ sync: { rev: 4, at: old }, sheet: { url, rev: 3, syncedAt: old } })} />);
    expect(screen.getByText(/not updated since 10 min ago\. Open it and use Inventory › Update now\./)).toBeInTheDocument();
  });
});
