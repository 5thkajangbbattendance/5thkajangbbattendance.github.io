/**
 * 5th Kajang BB · Parade HQ Inventory → Google Sheet
 *
 * Copies everything on the Inventory page of Parade HQ into this spreadsheet. There is no timer: each time
 * someone saves on the Inventory page, Parade HQ tells this script (through its web app link) and it copies
 * the records again. The website stays the place to make changes: anything typed into the copied tabs is
 * replaced at the next update.
 *
 * Set up once (full steps in SHEET-SETUP.md):
 *   1. In this spreadsheet open Extensions > Apps Script, delete what is there, paste this whole file, Save.
 *   2. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Copy the web app link.
 *   3. Reload the spreadsheet, then Inventory > Connect to Parade HQ: sign in with a Parade HQ login that can
 *      see the Inventory page and paste the web app link.
 */

var CFG = {
  apiKey: 'AIzaSyDqds_sGPiD138X4E32YnRl136a-xWVK6I',   // public web key from firebase-config.js
  projectId: 'thkjbb-attendance',
  emailDomain: '@staff.5thkj.app',
  authUrl: 'https://identitytoolkit.googleapis.com/v1',
  dbUrl: 'https://firestore.googleapis.com/v1'
};
var HOOK_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;

var MONEY = '"RM "#,##0.00', DAY = 'd mmm yyyy', STAMP = 'd mmm yyyy, h:mm am/pm';
var COLLS = ['invStock', 'invPurchases', 'invSales', 'invPayments', 'invRepays'];

/* ---------------- menu ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Inventory')
    .addItem('Connect to Parade HQ', 'showConnect')
    .addItem('Update now', 'updateNow')
    .addSeparator()
    .addItem('Disconnect', 'disconnect')
    .addToUi();
}

function showConnect() {
  var html = HtmlService.createHtmlOutput(
    '<style>body{font:14px Arial,sans-serif;margin:0 4px}label{display:block;margin:10px 0 4px;font-weight:bold}' +
    'input{width:100%;box-sizing:border-box;padding:8px;font-size:14px}button{margin-top:14px;padding:9px 16px;font-size:14px;background:#1f3a8a;color:#fff;border:0;border-radius:6px;cursor:pointer}' +
    '#m{margin-top:10px;color:#b42318}p{color:#555;margin:0 0 6px}</style>' +
    '<p>Sign in with a Parade HQ login that can open the Inventory page. We recommend a separate login with the <b>Uniform</b> duty just for this spreadsheet.</p>' +
    '<label for="u">Username</label><input id="u" autocomplete="username">' +
    '<label for="p">Password</label><input id="p" type="password" autocomplete="current-password">' +
    '<label for="h">Web app link</label><input id="h" placeholder="https://script.google.com/macros/s/…/exec">' +
    '<button id="b" onclick="go()">Connect and copy now</button><div id="m"></div>' +
    '<script>function go(){var b=document.getElementById("b"),m=document.getElementById("m");b.disabled=true;m.style.color="#555";m.textContent="Signing in and copying…";' +
    'google.script.run.withSuccessHandler(function(t){m.style.color="#067647";m.textContent=t;setTimeout(function(){google.script.host.close();},2500);})' +
    '.withFailureHandler(function(e){b.disabled=false;m.style.color="#b42318";m.textContent=e.message;})' +
    '.connect(document.getElementById("u").value,document.getElementById("p").value,document.getElementById("h").value);}</script>'
  ).setWidth(400).setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, 'Connect to Parade HQ');
}

/** Called from the dialog: check the login and link, remember them and copy everything now. */
function connect(username, password, hook) {
  username = String(username || '').trim().toLowerCase(); hook = String(hook || '').trim();
  if (!username || !password) throw new Error('Enter the username and password.');
  if (!HOOK_RE.test(hook)) throw new Error('Paste the web app link from Deploy > New deployment. It starts with https://script.google.com/macros/s/ and ends with /exec.');
  var props = PropertiesService.getUserProperties();
  CacheService.getUserCache().remove('idToken');
  var t = signIn_(username, password);       // throws a clear message if wrong
  fsGet_('invMeta/sync', t);                 // throws if this login cannot see the Inventory page
  props.setProperties({ username: username, password: password, hook: hook, sheetId: SpreadsheetApp.getActive().getId() });
  removeTimers_();
  var r = sync_(true);
  return 'Connected. Copied ' + r.rows + ' records. From now on it updates each time someone saves on the Inventory page.';
}

function updateNow() {
  var r = sync_(true);
  SpreadsheetApp.getActive().toast('Copied ' + r.rows + ' records from Parade HQ.', 'Inventory', 5);
}

function disconnect() {
  removeTimers_();
  try { fsPatch_('invMeta/sheet', { hook: '' }, token_()); } catch (e) {}   // Parade HQ stops sending updates
  PropertiesService.getUserProperties().deleteAllProperties();
  CacheService.getUserCache().remove('idToken');
  SpreadsheetApp.getActive().toast('Disconnected. The spreadsheet will no longer update.', 'Inventory', 5);
}

/** Parade HQ calls the web app link after every inventory save. Nothing else runs on a schedule.
 *  If nothing changed since the last copy it reads one small record and stops. */
function doPost() { return answer_(); }
function doGet() { return answer_(); }
function answer_() {
  var r;
  try { r = sync_(false); r = r.skipped ? 'up to date' : 'copied ' + r.rows + ' records'; } catch (e) { r = 'error: ' + e.message; }
  return ContentService.createTextOutput('Inventory sheet: ' + r);
}
/** Older versions of this script used a 5-minute timer; remove it if it is still there. */
function removeTimers_() { ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'autoUpdate') ScriptApp.deleteTrigger(t); }); }

/* ---------------- copying ---------------- */
function sync_(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { rows: 0, skipped: true };
  try {
    var token = token_();
    var meta = fsGet_('invMeta/sync', token) || {};
    var rev = +meta.rev || 0, docProps = PropertiesService.getDocumentProperties();
    if (!force && docProps.getProperty('lastRev') === String(rev)) return { rows: 0, skipped: true };

    var data = {};
    COLLS.forEach(function (c) { data[c] = fsList_(c, token); });
    var rows = writeAll_(ss_(), data);

    docProps.setProperty('lastRev', String(rev));
    // Tell Parade HQ where the spreadsheet is and that it is up to date (shows on the Inventory page).
    fsPatch_('invMeta/sheet', { url: ss_().getUrl(), syncedAt: new Date().toISOString(), rev: rev,
      hook: PropertiesService.getUserProperties().getProperty('hook') || '' }, token);
    return { rows: rows, skipped: false };
  } finally {
    lock.releaseLock();
  }
}

function ss_() {
  var ss = SpreadsheetApp.getActive(); if (ss) return ss;
  var id = PropertiesService.getUserProperties().getProperty('sheetId');
  if (!id) throw new Error('Not connected yet. Use Inventory > Connect to Parade HQ.');
  return SpreadsheetApp.openById(id);
}

function sen(n) { return Math.round((+n || 0) * 100); }
function rm(c) { return Math.round(c) / 100; }
function pName(s) { return String(s || '').toLowerCase().replace(/\./g, ' ').replace(/\s+/g, ' ').trim(); }
function day(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : (s || ''); }
function stamp(s) { var t = Date.parse(s || ''); return isNaN(t) ? '' : new Date(t); }
function newestFirst(a, b) { return String(b.date || '').localeCompare(String(a.date || '')) || String(b.at || '').localeCompare(String(a.at || '')); }
var SIZE_ORDER = ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
function sizeRank(s) { s = String(s || '').toUpperCase().trim(); var i = SIZE_ORDER.indexOf(s); if (i >= 0) return i; var n = parseFloat(s); return isNaN(n) ? 999 : 100 + n; }

/** Works out the same balances as the Inventory page and writes every tab. Returns how many records were copied. */
function writeAll_(ss, d) {
  var stock = d.invStock.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)) || sizeRank(a.size) - sizeRank(b.size) || String(a.size).localeCompare(String(b.size)); });
  var buys = d.invPurchases.slice().sort(newestFirst), sales = d.invSales.slice().sort(newestFirst);
  var pays = d.invPayments.slice().sort(newestFirst), reps = d.invRepays.slice().sort(newestFirst);

  // what each officer paid upfront, minus what was paid back to them
  var owed = {}, order = [];
  function row(n) { var k = pName(n); if (!k) return null; if (!owed[k]) { owed[k] = { name: String(n).trim(), paid: 0, repaid: 0 }; order.push(k); } return owed[k]; }
  buys.slice().reverse().forEach(function (p) { if (!p.company) { var r = row(p.paidBy); if (r) r.paid += sen(p.total); } });
  reps.slice().reverse().forEach(function (p) { var r = row(p.to); if (r) r.repaid += sen(p.amount); });
  var owedRows = order.map(function (k) { var r = owed[k]; return [r.name, rm(r.paid), rm(r.repaid), rm(r.paid - r.repaid)]; })
    .sort(function (a, b) { return b[3] - a[3] || String(a[0]).localeCompare(String(b[0])); });

  // who is holding the money members paid
  var col = {}, corder = [];
  pays.slice().reverse().forEach(function (p) { var k = pName(p.collectedBy) || '?'; if (!col[k]) { col[k] = { name: String(p.collectedBy || 'Unknown').trim(), n: 0, amt: 0 }; corder.push(k); } col[k].n++; col[k].amt += sen(p.amount); });
  var colRows = corder.map(function (k) { return [col[k].name, col[k].n, rm(col[k].amt)]; }).sort(function (a, b) { return b[2] - a[2]; });

  var units = stock.reduce(function (s, x) { return s + Math.max(0, +x.qty || 0); }, 0);
  var collected = pays.reduce(function (s, p) { return s + sen(p.amount); }, 0);
  var owedTotal = owedRows.reduce(function (s, r) { return s + Math.max(0, sen(r[3])); }, 0);
  var spent = buys.reduce(function (s, p) { return s + sen(p.total); }, 0);

  var buyRows = [];
  buys.forEach(function (p) {
    (p.lines || []).forEach(function (l, i) {
      buyRows.push([day(p.date), p.company ? 'Company money' : p.paidBy, l.name, l.size || 'One size', +l.qty || 0, rm(sen(l.cost)), rm((+l.qty || 0) * sen(l.cost)),
        i === 0 ? rm(sen(p.shipping)) : '', i === 0 ? rm(sen(p.total)) : '', i === 0 ? (p.note || '') : '', i === 0 ? (p.by || '') : '']);
    });
  });

  tab_(ss, 'Summary', ['What', 'Amount'], [
    ['Last copied from Parade HQ', new Date()],
    ['Items in stock', units],
    ['Collected from members', rm(collected)],
    ['Owed to officers', rm(owedTotal)],
    ['Spent on stock (items and shipping)', rm(spent)],
    ['', ''],
    ['This spreadsheet is copied from Parade HQ automatically. Make changes in Parade HQ: anything typed here is replaced at the next update.', '']
  ], { 2: 'mixed' });
  var sum = ss.getSheetByName('Summary');
  sum.setColumnWidth(1, 300); sum.getRange(8, 1).setWrap(true).setFontStyle('italic');
  sum.getRange(2, 2).setNumberFormat(STAMP); sum.getRange(3, 2).setNumberFormat('0'); sum.getRange(4, 2, 3, 1).setNumberFormat(MONEY);

  tab_(ss, 'Stock', ['Item', 'Size', 'In stock', 'Last changed'],
    stock.map(function (s) { return [s.name, s.size || 'One size', +s.qty || 0, stamp(s.updatedAt)]; }), { 4: STAMP });
  tab_(ss, 'Owed to officers', ['Officer', 'Paid upfront', 'Repaid', 'Still owed'], owedRows, { 2: MONEY, 3: MONEY, 4: MONEY });
  tab_(ss, 'Collected', ['Collected by', 'Payments', 'Amount'], colRows, { 3: MONEY });
  tab_(ss, 'Stock in', ['Date', 'Paid by', 'Item', 'Size', 'Qty', 'Unit cost', 'Line total', 'Shipping', 'Purchase total', 'Note', 'Entered by'],
    buyRows, { 1: DAY, 6: MONEY, 7: MONEY, 8: MONEY, 9: MONEY });
  tab_(ss, 'Sold & issued', ['Date', 'Item', 'Size', 'Qty', 'Type', 'To', 'Note', 'Entered by'],
    sales.map(function (s) { return [day(s.date), s.name, s.size || 'One size', +s.qty || 0, s.kind === 'issued' ? 'Issued free' : 'Sold', s.to || '', s.note || '', s.by || '']; }), { 1: DAY });
  tab_(ss, 'Member payments', ['Date', 'From', 'Amount', 'Collected by', 'For', 'Entered by'],
    pays.map(function (p) { return [day(p.date), p.from || '', rm(sen(p.amount)), p.collectedBy || '', p.note || '', p.by || '']; }), { 1: DAY, 3: MONEY });
  tab_(ss, 'Repayments', ['Date', 'Repaid to', 'Amount', 'Paid by', 'Note', 'Entered by'],
    reps.map(function (p) { return [day(p.date), p.to || '', rm(sen(p.amount)), p.paidBy || '', p.note || '', p.by || '']; }), { 1: DAY, 3: MONEY });

  // remove the empty starter tab once ours exist
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  return stock.length + buys.length + sales.length + pays.length + reps.length;
}

function tab_(ss, name, head, rows, formats) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  var all = [head].concat(rows);
  sh.getRange(1, 1, all.length, head.length).setValues(all);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#1f3a8a').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  if (rows.length) Object.keys(formats || {}).forEach(function (c) { if (formats[c] !== 'mixed') sh.getRange(2, +c, rows.length, 1).setNumberFormat(formats[c]); });
  sh.autoResizeColumns(1, head.length);
}

/* ---------------- Parade HQ sign-in and database ---------------- */
function token_() {
  var cache = CacheService.getUserCache(), t = cache.get('idToken');
  if (t) return t;
  var p = PropertiesService.getUserProperties();
  if (!p.getProperty('username')) throw new Error('Not connected yet. Use Inventory > Connect to Parade HQ.');
  return signIn_(p.getProperty('username'), p.getProperty('password'));
}

function signIn_(username, password) {
  var login = fsGet_('logins/' + encodeURIComponent(username), null);
  var email = (login && login.email) || (username + CFG.emailDomain);
  var res = UrlFetchApp.fetch(CFG.authUrl + '/accounts:signInWithPassword?key=' + CFG.apiKey, {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    payload: JSON.stringify({ email: email, password: password, returnSecureToken: true })
  });
  var body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() !== 200) {
    var why = (body.error && body.error.message) || '';
    if (/INVALID|NOT_FOUND|PASSWORD|EMAIL/.test(why)) throw new Error('Username or password is incorrect.');
    if (/TOO_MANY/.test(why)) throw new Error('Too many tries. Wait a few minutes, then try again.');
    throw new Error('Could not sign in to Parade HQ (' + (why || res.getResponseCode()) + ').');
  }
  CacheService.getUserCache().put('idToken', body.idToken, 50 * 60);
  return body.idToken;
}

function docUrl_(path) { return CFG.dbUrl + '/projects/' + CFG.projectId + '/databases/(default)/documents/' + path; }
function call_(url, opt, token) {
  opt = opt || {}; opt.muteHttpExceptions = true; opt.headers = token ? { Authorization: 'Bearer ' + token } : {};
  var res = UrlFetchApp.fetch(url, opt), code = res.getResponseCode();
  if (code === 404) return null;
  if (code === 403) throw new Error('This Parade HQ login cannot see the Inventory page. Connect again with an Owner, Admin, Parade Commander, Squad Leader or Uniform login.');
  if (code === 401) { CacheService.getUserCache().remove('idToken'); throw new Error('The sign-in expired. It will retry at the next update.'); }
  if (code >= 300) throw new Error('Parade HQ database error ' + code + ': ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText() || '{}');
}
function fsGet_(path, token) { var d = call_(docUrl_(path), { method: 'get' }, token); return d ? decodeFields_(d.fields) : null; }
function fsList_(coll, token) {
  var out = [], page = '';
  do {
    var d = call_(docUrl_(coll) + '?pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { method: 'get' }, token) || {};
    (d.documents || []).forEach(function (doc) { var o = decodeFields_(doc.fields); o.id = doc.name.split('/').pop(); out.push(o); });
    page = d.nextPageToken || '';
  } while (page);
  return out;
}
function fsPatch_(path, obj, token) {
  var fields = {}, mask = Object.keys(obj).map(function (k) { fields[k] = encode_(obj[k]); return 'updateMask.fieldPaths=' + k; }).join('&');
  return call_(docUrl_(path) + '?' + mask, { method: 'patch', contentType: 'application/json', payload: JSON.stringify({ fields: fields }) }, token);
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
function encode_(v) {
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}
