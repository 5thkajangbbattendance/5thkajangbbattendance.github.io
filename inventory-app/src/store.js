// Where inventory items are kept.
//
// Inside Parade HQ with Firebase connected, items live in the database (collection "inventoryItems"), so every officer
// sees the same list and changes appear on everyone's screen straight away. The page uses Parade HQ's own signed-in
// database connection (window.parent.BB_INV), so there is no second login.
//
// Everywhere else (Parade HQ demo mode, a local preview, the automatic tests) items are kept in the page and start
// with the 5 sample items, as before.
//
// Every save also adds 1 to inventoryMeta/sync.rev and tells the Google Sheet (if one is connected) to copy again.
import { SAMPLE_ITEMS } from './inventory.js';

export const ITEMS = 'inventoryItems';
export const SYNC = 'inventoryMeta/sync';
export const SHEET = 'inventoryMeta/sheet';
export const HOOK_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;

function host() {
  try { return window.parent !== window ? window.parent.BB_INV || null : null; } catch { return null; }
}

/** Picks the database when Parade HQ offers it, otherwise the in-page list. */
export function connect() {
  const h = host();
  if (h && h.mode === 'firebase' && h.db) return firebaseStore(h);
  // Parade HQ's demo still says who is signed in, so its "Preview as" shows the right buttons.
  return h && h.me ? { ...localStore(), me: h.me } : localStore();
}

const clean = it => ({
  name: it.name, section: it.section, category: it.category,
  stock: it.stock, threshold: it.threshold, priceSen: it.priceSen,
});

/** The Google Sheet's web app link, only if it is a real Apps Script link. */
export function sheetHook(sheet) { const h = (sheet && sheet.hook) || ''; return HOOK_RE.test(h) ? h : ''; }

/** Tells the Google Sheet to copy again. Fire-and-forget: the sheet reads the database itself. */
export function pingSheet(sheet) {
  const h = sheetHook(sheet);
  if (!h) return false;
  try { fetch(h, { method: 'POST', mode: 'no-cors', body: 'sync', keepalive: true }).catch(() => {}); } catch { /* offline: the next save or visit sends it */ }
  return true;
}

export function localStore(initial = SAMPLE_ITEMS) {
  let items = initial.map(i => ({ ...i }));
  const subs = new Set();
  const emit = () => subs.forEach(s => s.cb(items));
  return {
    mode: 'local',
    subscribe(cb) { const s = { cb }; subs.add(s); cb(items); return () => subs.delete(s); },
    subscribeMeta(cb) { cb({ sync: null, sheet: null }); return () => {}; },
    add(item) { items = [...items, { ...item }]; emit(); return Promise.resolve(); },
    save(item) { items = items.map(i => (i.id === item.id ? { ...i, ...item } : i)); emit(); return Promise.resolve(); },
    remove(id) { items = items.filter(i => i.id !== id); emit(); return Promise.resolve(); },
    /** Import CSV: rows = [{ item, action: 'new' | 'update' }] */
    importItems(rows) {
      rows.forEach(r => {
        if (r.action === 'new') items = [...items, { ...r.item }];
        else if (r.action === 'update') items = items.map(i => (i.id === r.item.id ? { ...i, ...r.item } : i));
      });
      emit();
      return Promise.resolve();
    },
    ping() { return false; },
  };
}

export function firebaseStore(h) {
  const db = h.db, FV = h.FieldValue, me = h.me || {};
  // The database code belongs to Parade HQ (the parent page) and only accepts plain objects made there,
  // so every object handed to it is rebuilt with Parade HQ's own Object.
  const HostObject = h.Object || Object;
  const plain = o => Object.assign(new HostObject(), o);
  let sheet = null;
  const stamp = () => new Date().toISOString();
  // Activity log: Parade HQ builds the entry (who, when, what changed); it goes in the same save as the change.
  const cache = new Map();
  const logTo = (b, items) => { const e = items && h.log ? h.log(items) : null; if (e) b.set(db.collection('activity').doc(), e); };
  const FIELDS = [['name', 'Name'], ['section', 'Section'], ['category', 'Category'], ['stock', 'Stock'], ['threshold', 'Reorder level'], ['priceSen', 'Price']];
  const show = (k, v) => (v === undefined || v === null || v === '' ? '—' : k === 'priceSen' ? 'RM ' + (v / 100).toFixed(2) : String(v));
  const what = it => 'Item “' + String(it.name || '').slice(0, 50) + '”';
  const diffs = (a, b) => FIELDS.filter(([k]) => show(k, a && a[k]) !== show(k, b[k])).map(([k, f]) => ({ f, from: a ? show(k, a[k]) : '', to: show(k, b[k]) }));
  // one save = the item change + the sheet's change counter (+ its activity entry), together
  function commit(write, log) {
    let b;
    try { b = db.batch(); write(b); logTo(b, log); } catch (e) { return Promise.reject(e); }
    b.set(db.doc(SYNC), plain({ rev: FV.increment(1), at: stamp() }), plain({ merge: true }));
    // The screen updates at once from the local copy; this promise settles when the database accepts or refuses it.
    return b.commit().then(() => { pingSheet(sheet); });
  }
  return {
    mode: 'firebase',
    me,
    subscribe(cb, onError) {
      return db.collection(ITEMS).onSnapshot(snap => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        cache.clear(); list.forEach(i => cache.set(i.id, i));
        // "as entered": oldest first
        list.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || a.id.localeCompare(b.id));
        cb(list);
      }, err => onError && onError(err));
    },
    subscribeMeta(cb) {
      let sync = null; sheet = null;
      const a = db.doc(SYNC).onSnapshot(d => { sync = d.exists ? d.data() : null; cb({ sync, sheet }); }, () => {});
      const c = db.doc(SHEET).onSnapshot(d => { sheet = d.exists ? d.data() : null; cb({ sync, sheet }); }, () => {});
      return () => { a(); c(); };
    },
    add(item) {
      const t = stamp();
      return commit(b => b.set(db.collection(ITEMS).doc(item.id), plain({ ...clean(item), createdAt: t, updatedAt: t, by: String(me.name || '').slice(0, 80), byUid: me.uid })),
        [{ area: 'inv', what: what(item), kind: 'add', diffs: diffs(null, item).filter(d => d.to !== '—').slice(0, 6) }]);
    },
    save(item) {
      const d = diffs(cache.get(item.id), item);
      return commit(b => b.update(db.collection(ITEMS).doc(item.id), plain({ ...clean(item), updatedAt: stamp(), by: String(me.name || '').slice(0, 80), byUid: me.uid })),
        d.length ? [{ area: 'inv', what: what(item), kind: 'edit', diffs: d }] : null);
    },
    remove(id) { return commit(b => b.delete(db.collection(ITEMS).doc(id)), [{ area: 'inv', what: what(cache.get(id) || { name: id }), kind: 'delete', diffs: [] }]); },
    /** Import CSV: saves in groups of 400 (a database save holds at most 500 changes), then tells the sheet once. */
    importItems(rows, onProgress) {
      const todo = rows.filter(r => r.action === 'new' || r.action === 'update');
      const groups = [];
      for (let i = 0; i < todo.length; i += 400) groups.push(todo.slice(i, i + 400));
      const by = String(me.name || '').slice(0, 80);
      return groups.reduce((p, g, gi) => p.then(() => {
        let b;
        try {
          b = db.batch();
          const t = stamp();
          g.forEach(r => {
            const ref = db.collection(ITEMS).doc(r.item.id);
            if (r.action === 'new') b.set(ref, plain({ ...clean(r.item), createdAt: t, updatedAt: t, by, byUid: me.uid }));
            else b.update(ref, plain({ ...clean(r.item), updatedAt: t, by, byUid: me.uid }));
          });
          b.set(db.doc(SYNC), plain({ rev: FV.increment(1), at: t }), plain({ merge: true }));
          const nNew = g.filter(r => r.action === 'new').length;
          logTo(b, [{ area: 'inv', what: 'CSV import' + (groups.length > 1 ? ' (part ' + (gi + 1) + ' of ' + groups.length + ')' : ''), kind: 'edit',
            diffs: [{ f: 'Items', from: '', to: nNew + ' added, ' + (g.length - nNew) + ' updated' }] }]);
        } catch (e) { return Promise.reject(e); }
        return b.commit().then(() => onProgress && onProgress(Math.min(todo.length, (gi + 1) * 400), todo.length));
      }), Promise.resolve()).then(() => { pingSheet(sheet); });
    },
    ping() { return pingSheet(sheet); },
  };
}

/** Plain words for a database error. */
export function friendlyError(e) {
  const c = (e && e.code) || '';
  if (/permission-denied/.test(c)) return 'Parade HQ did not allow this. If Inventory is new, the Owner needs to publish the latest database rules.';
  if (/unavailable|network/.test(c)) return 'No internet connection. It will save when you are back online.';
  return (e && e.message) || 'Something went wrong.';
}
