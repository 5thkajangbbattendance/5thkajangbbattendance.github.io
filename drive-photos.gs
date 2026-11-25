/**
 * 5th Kajang BB · Parade HQ uniform order photos and form uploads → Google Drive
 *
 * Also keeps Parade HQ backups: the Owner's "Back up to Google Drive" saves them in "5th Kajang BB · Backups".
 *
 * Also emails you the moment someone sends an enquiry on the website (turn it on under Parade HQ → Enquiries).
 * The email goes from this Google account to ALERT_TO below, or to this account itself if ALERT_TO is empty.
 *
 * Also takes files people send with Parade HQ forms (a "File upload" question). Those go into
 * "5th Kajang BB · Form uploads", one folder per form. Anyone with the form link can send a file, so the script
 * only accepts it while that form is open, for a File upload question on it, of the allowed type and size.
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

// Where enquiry emails go. Leave empty to send them to the Google account that runs this script.
// For more than one address, separate them with commas: 'a@gmail.com, b@gmail.com'
var ALERT_TO = '';

var CFG = {
  projectId: 'thkjbb-attendance',                       // from firebase-config.js
  hqUrl: 'https://5thkajangbbattendance.github.io/attendance/#enquiries',
  dbUrl: 'https://firestore.googleapis.com/v1',
  timeZone: 'Asia/Kuala_Lumpur'
};
var ROOT_NAME = '5th Kajang BB · Uniform order photos';
var KINDS = { pay: { field: 'payProof', label: 'payment proof' }, handover: { field: 'handover', label: 'handover' } };
var TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
var MAX_BYTES = 10 * 1024 * 1024;                       // 10 MB per file (photos are shrunk before upload)
var ID_RE = /^[A-Za-z0-9_-]{1,120}$/;
var FORMS_ROOT = '5th Kajang BB · Form uploads';
var BACKUP_ROOT = '5th Kajang BB · Backups';
var FORM_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  pdf: ['application/pdf'],
  docs: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
};
FORM_TYPES['images+pdf'] = FORM_TYPES.images.concat(FORM_TYPES.pdf);
var FORM_HOURLY = 300;                                  // most files one form takes in an hour
var ALERT_HOURLY = 30;                                  // most enquiry emails in an hour (stops someone flooding your inbox)

/** Run once from the editor: asks for Drive access and makes the folder. */
function setup() {
  var f = root_();
  Logger.log('Photos will be saved in: ' + f.getName() + '  ' + f.getUrl());
  Logger.log('Enquiry emails go to: ' + alertTo_() + ' (you can send ' + MailApp.getRemainingDailyQuota() + ' more emails today)');
}

/** Open the web app link in a browser to check it: shows whether it can send email, and where emails go. */
function doGet() {
  var r = { ok: true, app: '5th Kajang BB uniform photos', version: '2026-11-26', forms: true, enquiryEmails: true, backups: true };
  try { r.emailsLeftToday = MailApp.getRemainingDailyQuota(); r.emailsTo = alertTo_(); r.email = 'ready'; }
  catch (e) { r.email = 'NOT ALLOWED YET: in the script editor choose "setup", press Run and allow it, then Deploy > Manage deployments > Edit > New version.'; }
  return out_(r);
}

function doPost(e) {
  try {
    var b = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (b.action === 'formUpload') return out_(formUpload_(b));   // from the public form: no sign-in, checked against the form itself
    if (b.action === 'enquiryAlert') return out_(enquiryAlert_(b)); // from the website's join form: no sign-in, limited per hour
    var token = String(b.token || '');
    if (!token) throw new Error('Sign in to Parade HQ again, then retry.');
    // only logins that may handle uniform orders can list them, so this checks the officer before answering
    if (b.action === 'ping') { fsGet_('orders?pageSize=1', token); var r = root_(); return out_({ ok: true, folder: r.getUrl(), folderName: r.getName() }); }
    if (b.action === 'upload') return out_(upload_(b, token));
    if (b.action === 'get') return out_(get_(b, token));
    if (b.action === 'delete') return out_(remove_(b, token));
    if (b.action === 'formFolder') return out_(formFolderLink_(b, token));
    if (b.action === 'backupSave') return out_(backupSave_(b, token));
    if (b.action === 'backupFolder') { owner_(token); var bf = backupRoot_(); return out_({ ok: true, folder: bf.getUrl() }); }
    if (b.action === 'alertTest') { fsGet_('enquiries?pageSize=1', token, 'Your login is not allowed to see enquiries.'); return out_(alertTest_(b)); }
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

/* ---------------- backups (Owner only) ---------------- */
/** Only the Owner: reads their own staff post with their own sign-in, so the database confirms who they are. */
function owner_(token) {
  var uid = ''; try { uid = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(String(token).split('.')[1])).getDataAsString()).user_id || ''; } catch (e) {}
  if (!ID_RE.test(uid)) throw new Error('Sign in to Parade HQ again, then retry.');
  var me = fsGet_('staff/' + uid, token, 'Only the Owner can make backups.');
  if (!me || me.duty !== 'owner' || me.active === false) throw new Error('Only the Owner can make backups.');
  return me;
}
function backupRoot_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('backupRootId');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var it = DriveApp.getFoldersByName(BACKUP_ROOT), r = it.hasNext() ? it.next() : DriveApp.createFolder(BACKUP_ROOT);
  r.setDescription('Parade HQ backups: an Excel file to read and a restore file for each backup. Private: they contain personal details.');
  p.setProperty('backupRootId', r.getId());
  return r;
}
function backupSave_(b, token) {
  owner_(token);
  var base = clean_(b.name) || ('5th Kajang BB backup ' + Utilities.formatDate(new Date(), CFG.timeZone, 'yyyy-MM-dd HHmm'));
  var xl = Utilities.base64Decode(String(b.xlsx || '')), js = String(b.json || '');
  if (!xl.length || !js.length) throw new Error('The backup was empty. Try again.');
  var root = backupRoot_();
  var f1 = root.createFile(Utilities.newBlob(xl, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base + '.xlsx'));
  var f2 = root.createFile(Utilities.newBlob(js, 'application/json', base + ' (restore file).json'));
  f1.setDescription('Parade HQ backup to read. Made by ' + clean_(b.by || 'the Owner') + '.');
  f2.setDescription('Parade HQ restore file: every record exactly as stored. Keep it with the Excel file of the same name.');
  return { ok: true, folder: root.getUrl(), excel: f1.getUrl(), restore: f2.getUrl(), name: base };
}

/* ---------------- enquiry emails ---------------- */
function alertTo_() { return String(ALERT_TO || '').trim() || Session.getEffectiveUser().getEmail(); }
function short_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n); }
function enquiryAlert_(b) {
  var d = { parent: short_(b.parentName, 80), phone: short_(b.phone, 30), email: short_(b.email, 120), child: short_(b.childName, 80), age: short_(b.age, 3), school: short_(b.school, 100), msg: short_(b.message, 1000) };
  if (!d.parent || d.phone.replace(/\D/g, '').length < 7) throw new Error('Missing name or phone.');
  var cache = CacheService.getScriptCache(), n = +(cache.get('ea') || 0);
  if (n >= ALERT_HOURLY) throw new Error('Too many enquiry emails this hour.');
  cache.put('ea', String(n + 1), 3600);
  var lines = ['A new enquiry came in from the website.', '', 'Parent or guardian: ' + d.parent, 'Phone: ' + d.phone];
  if (d.email) lines.push('Email: ' + d.email);
  if (d.child) lines.push('Child: ' + d.child + (d.age ? ' (age ' + d.age + ')' : ''));
  else if (d.age) lines.push('Age: ' + d.age);
  if (d.school) lines.push('School: ' + d.school);
  if (d.msg) lines.push('', 'Message:', d.msg);
  lines.push('', 'Open it in Parade HQ: ' + CFG.hqUrl, '', 'WhatsApp: https://wa.me/' + waNum_(d.phone));
  var o = { to: alertTo_(), subject: 'New enquiry: ' + d.parent + (d.child ? ' (for ' + d.child + ')' : ''), body: lines.join('\n'), name: '5th Kajang BB website' };
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) o.replyTo = d.email;
  MailApp.sendEmail(o);
  return { ok: true };
}
function waNum_(p) { var x = String(p).replace(/\D/g, ''); return x.charAt(0) === '0' ? '6' + x : x; }
function alertTest_(b) {
  var to = alertTo_(); if (!to) throw new Error('No email address: put yours in ALERT_TO at the top of the script, Save, then deploy a new version.');
  MailApp.sendEmail({ to: to, subject: 'Enquiry emails are on', name: '5th Kajang BB website',
    body: 'From now on, every enquiry sent on the 5th Kajang BB website is emailed to this address straight away.\n\nTurned on by ' + short_(b.by || 'an officer', 80) + ' in Parade HQ.\n\nTo change where these emails go, edit ALERT_TO at the top of the photo script (script.google.com), then deploy a new version.' });
  return { ok: true, to: alertTo_() };
}

/* ---------------- form uploads ---------------- */
function formUpload_(b) {
  var fid = String(b.form || ''), qid = String(b.q || '');
  if (!ID_RE.test(fid) || !ID_RE.test(qid)) throw new Error('Unknown form.');
  var form = fsPublic_('forms/' + fid);
  if (!form) throw new Error('This form no longer exists.');
  if (form.status !== 'open' || (form.closesAtMs && Date.now() >= +form.closesAtMs)) throw new Error('This form is closed, so files cannot be sent.');
  var q = (form.questions || []).filter(function (x) { return x && x.id === qid && x.type === 'file'; })[0];
  if (!q) throw new Error('This question does not take files.');
  var allowed = FORM_TYPES[q.accept || 'images+pdf'] || FORM_TYPES['images+pdf'];
  if (allowed.indexOf(b.mime) < 0) throw new Error('That type of file cannot be sent here.');
  var bytes = Utilities.base64Decode(String(b.data || ''));
  if (!bytes.length) throw new Error('The file was empty.');
  if (bytes.length > Math.min(MAX_BYTES, (+q.maxMB || 10) * 1024 * 1024)) throw new Error('That file is over ' + (+q.maxMB || 10) + ' MB.');
  var cache = CacheService.getScriptCache(), key = 'fu:' + fid, n = +(cache.get(key) || 0);
  if (n >= FORM_HOURLY) throw new Error('This form has received a lot of files in the last hour. Please try again later.');
  cache.put(key, String(n + 1), 3600);
  var when = Utilities.formatDate(new Date(), CFG.timeZone, 'yyyy-MM-dd HHmm ss');
  var name = when + ' · ' + (clean_(b.name) || 'file');
  var file = formFolder_(fid, form).createFile(Utilities.newBlob(bytes, b.mime, name));
  file.setDescription('Sent with the form "' + clean_(form.title) + '" · question: ' + clean_(q.label));
  return { ok: true, id: file.getId(), url: file.getUrl(), name: clean_(b.name) || name };
}
/* The folder link for officers: only logins that may read form responses get it. */
function formFolderLink_(b, token) {
  var fid = String(b.form || ''); if (!ID_RE.test(fid)) throw new Error('Unknown form.');
  fsGet_('formResponses?pageSize=1', token, 'Your login is not allowed to see form responses.');
  var form = fsPublic_('forms/' + fid) || { title: fid };
  var f = formFolder_(fid, form);
  return { ok: true, folder: f.getUrl(), name: f.getName() };
}
function formsRoot_() {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty('formsRootId');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var it = DriveApp.getFoldersByName(FORMS_ROOT), r = it.hasNext() ? it.next() : DriveApp.createFolder(FORMS_ROOT);
  r.setDescription('Files people sent with Parade HQ forms. One folder per form.');
  p.setProperty('formsRootId', r.getId());
  return r;
}
function formFolder_(fid, form) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var p = PropertiesService.getScriptProperties(), key = 'ff:' + fid, id = p.getProperty(key);
    if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
    var nf = formsRoot_().createFolder(clean_(form.title) || fid);
    p.setProperty(key, nf.getId());
    return nf;
  } finally { lock.releaseLock(); }
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
function fsGet_(path, token, denied) {
  var res = UrlFetchApp.fetch(CFG.dbUrl + '/projects/' + CFG.projectId + '/databases/(default)/documents/' + path,
    { method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 200) return decodeFields_(JSON.parse(res.getContentText()).fields);
  if (code === 404) return null;
  if (code === 401) throw new Error('Your sign-in has expired. Reload Parade HQ and try again.');
  if (code === 403) throw new Error(denied || 'Your login is not allowed to handle uniform orders.');
  throw new Error('Could not reach the Parade HQ database (' + code + '). Try again in a minute.');
}
/** Reads something the database lets anyone read (a form people fill in). */
function fsPublic_(path) {
  var res = UrlFetchApp.fetch(CFG.dbUrl + '/projects/' + CFG.projectId + '/databases/(default)/documents/' + path, { method: 'get', muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 200) return decodeFields_(JSON.parse(res.getContentText()).fields);
  if (code === 404) return null;
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
