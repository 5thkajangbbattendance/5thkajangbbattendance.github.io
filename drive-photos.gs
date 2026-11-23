/**
 * 5th Kajang BB · Parade HQ uniform order photos → Google Drive
 *
 * Saves payment proofs and handover photos from the Uniform orders page of Parade HQ into a folder in the Google
 * Drive of whoever deploys this script. Photos stay private to that Drive: Parade HQ shows them by asking this
 * script, and this script only answers officers whose Parade HQ login may open that order.
 *
 * How it checks: Parade HQ sends the officer's sign-in token (never a password). Before saving, showing or removing
 * a photo, the script reads the order from the Parade HQ database with that token. The database rules allow it only
 * for Owner, Admin, Website and Uniform logins, so anyone else is turned away. A photo can only be shown or removed
 * if that order lists it.
 *
 * Set up once (full steps in DRIVE-SETUP.md):
 *   1. Go to script.google.com > New project. Delete what is there, paste this whole file, Save.
 *   2. Choose the function "setup" at the top and press Run. Allow access when Google asks.
 *      The log shows the link to the new Drive folder.
 *   3. Deploy > New deployment > Web app. Execute as: Me. Who has access: Anyone. Copy the web app link.
 *   4. In Parade HQ (Owner or Admin): Uniform orders > Photo storage > Connect Google Drive, paste the link.
 */

var CFG = {
  projectId: 'thkjbb-attendance',                       // from firebase-config.js
  dbUrl: 'https://firestore.googleapis.com/v1',
  timeZone: 'Asia/Kuala_Lumpur'
};
var ROOT_NAME = '5th Kajang BB · Uniform order photos';
var KINDS = { pay: { field: 'payProof', label: 'payment proof' }, handover: { field: 'handover', label: 'handover' } };
var TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
var MAX_BYTES = 10 * 1024 * 1024;                       // 10 MB per file (photos are shrunk before upload)
var ID_RE = /^[A-Za-z0-9_-]{1,120}$/;

/** Run once from the editor: asks for Drive access and makes the folder. */
function setup() {
  var f = root_();
  Logger.log('Photos will be saved in: ' + f.getName() + '  ' + f.getUrl());
}

function doGet() { return out_({ ok: true, app: '5th Kajang BB uniform photos' }); }

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var token = String(b.token || '');
    if (!token) throw new Error('Sign in to Parade HQ again, then retry.');
    // only logins that may handle uniform orders can list them, so this checks the officer before answering
    if (b.action === 'ping') { fsGet_('orders?pageSize=1', token); var r = root_(); return out_({ ok: true, folder: r.getUrl(), folderName: r.getName() }); }
    if (b.action === 'upload') return out_(upload_(b, token));
    if (b.action === 'get') return out_(get_(b, token));
    if (b.action === 'delete') return out_(remove_(b, token));
    throw new Error('Unknown request.');
  } catch (x) {
    return out_({ ok: false, error: x.message || String(x) });
  }
}

/* ---------------- actions ---------------- */
function upload_(b, token) {
  var kind = KINDS[b.kind]; if (!kind) throw new Error('Unknown photo type.');
  var ext = TYPES[b.mime]; if (!ext) throw new Error('Only photos (JPG, PNG) and PDF files can be saved.');
  var order = order_(b.order, token);
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length) throw new Error('The file was empty.');
  if (bytes.length > MAX_BYTES) throw new Error('That file is over 10 MB. Take a screenshot instead.');
  var ref = clean_(order.ref) || b.order, when = Utilities.formatDate(new Date(), CFG.timeZone, 'yyyy-MM-dd HHmm ss');
  var name = ref + ' ' + kind.label + ' ' + when + '.' + ext;
  var file = folder_(b.order, order).createFile(Utilities.newBlob(bytes, b.mime, name));
  file.setDescription('Uniform order ' + ref + ' · ' + clean_(order.childName) + ' · ' + kind.label + ' · added by ' + clean_(b.by || 'Parade HQ'));
  return { ok: true, id: file.getId(), url: file.getUrl(), name: name };
}

function get_(b, token) {
  var order = order_(b.order, token), id = listed_(order, b.file);
  var file; try { file = DriveApp.getFileById(id); } catch (e) { file = null; }
  if (!file || file.isTrashed()) throw new Error('This photo was deleted from Google Drive. Remove it here too.');
  var blob = file.getBlob();
  return { ok: true, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) };
}

function remove_(b, token) {
  var order = order_(b.order, token), id = listed_(order, b.file);
  var file; try { file = DriveApp.getFileById(id); } catch (e) { return { ok: true, gone: true }; }   // already deleted in Drive
  file.setTrashed(true);                               // goes to the Drive bin, which keeps it for 30 days
  return { ok: true };
}

/* ---------------- checks ---------------- */
/** Reads the order with the officer's own token, so the database rules decide who may continue. */
function order_(id, token) {
  id = String(id || ''); if (!ID_RE.test(id)) throw new Error('Unknown order.');
  var o = fsGet_('orders/' + id, token);
  if (!o) throw new Error('That order no longer exists.');
  return o;
}
function listed_(order, file) {
  file = String(file || ''); if (!ID_RE.test(file)) throw new Error('Unknown photo.');
  var all = [].concat(order.payProof || [], order.handover || []);
  for (var i = 0; i < all.length; i++) if (all[i] && all[i].id === file) return file;
  throw new Error('That photo is not part of this order.');
}

/* ---------------- folders ---------------- */
function root_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('rootId');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var it = DriveApp.getFoldersByName(ROOT_NAME), r = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_NAME);
  r.setDescription('Payment proofs and handover photos from Parade HQ uniform orders. One folder per order.');
  p.setProperty('rootId', r.getId());
  return r;
}
/** One folder per order, named "U-ABC12 · Child Name". Remembered so a renamed folder is still used. */
function folder_(orderId, order) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var p = PropertiesService.getScriptProperties(), key = 'f:' + orderId, id = p.getProperty(key);
    if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
    var nf = root_().createFolder([clean_(order.ref) || orderId, clean_(order.childName)].filter(String).join(' · '));
    p.setProperty(key, nf.getId());
    return nf;
  } finally { lock.releaseLock(); }
}
function clean_(s) { return String(s || '').replace(/[\\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80); }

/* ---------------- database (read only) ---------------- */
function fsGet_(path, token) {
  var res = UrlFetchApp.fetch(CFG.dbUrl + '/projects/' + CFG.projectId + '/databases/(default)/documents/' + path,
    { method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 200) return decodeFields_(JSON.parse(res.getContentText()).fields);
  if (code === 404) return null;
  if (code === 401) throw new Error('Your sign-in has expired. Reload Parade HQ and try again.');
  if (code === 403) throw new Error('Your login is not allowed to handle uniform orders.');
  throw new Error('Could not reach the Parade HQ database (' + code + '). Try again in a minute.');
}
function decode_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return +v.integerValue;
  if ('doubleValue' in v) return +v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decode_);
  if ('mapValue' in v) return decodeFields_(v.mapValue.fields);
  return null;
}
function decodeFields_(f) { var o = {}; Object.keys(f || {}).forEach(function (k) { o[k] = decode_(f[k]); }); return o; }

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
