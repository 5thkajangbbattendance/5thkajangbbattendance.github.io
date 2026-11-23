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
  return h && h.mode === 'firebase' && h.db ? firebaseStore(h) : localStore();
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
  // one save = the item change + the sheet's change counter, together
  function commit(write) {
    let b;
    try { b = db.batch(); write(b); } catch (e) { return Promise.reject(e); }
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
      return commit(b => b.set(db.collection(ITEMS).doc(item.id), plain({ ...clean(item), createdAt: t, updatedAt: t, by: String(me.name || '').slice(0, 80), byUid: me.uid })));
    },
    save(item) {
      return commit(b => b.update(db.collection(ITEMS).doc(item.id), plain({ ...clean(item), updatedAt: stamp(), by: String(me.name || '').slice(0, 80), byUid: me.uid })));
    },
    remove(id) { return commit(b => b.delete(db.collection(ITEMS).doc(id))); },
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
