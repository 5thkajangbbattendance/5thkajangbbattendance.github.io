/**
 * 5th Kajang BB · Parade HQ Inventory → Google Sheet
 *
 * Copies the Inventory page of Parade HQ into this spreadsheet. There is no timer: each time someone adds, edits
 * or deletes an item, Parade HQ tells this script (through its web app link) and it copies the inventory again
 * within a few seconds. Parade HQ stays the place to make changes: the tabs below are replaced at every update.
 * Your own extra tabs are never touched.
 *
 * Set up once (full steps in SHEET-SETUP.md):
 *   1. In this spreadsheet open Extensions > Apps Script, delete what is there, paste this whole file, Save.
 *   2. Deploy > New deployment > Web app, Execute as: Me, Who has access: Anyone. Copy the web app link.
 *   3. Reload the spreadsheet, then Inventory > Connect to Parade HQ: sign in with the Parade HQ login made for
 *      the sheet and paste the web app link.
 */

var CFG = {
  apiKey: 'AIzaSyDqds_sGPiD138X4E32YnRl136a-xWVK6I',   // the public web key from firebase-config.js
  projectId: 'thkjbb-attendance',
  emailDomain: '@staff.5thkj.app',
  authUrl: 'https://identitytoolkit.googleapis.com/v1',
  dbUrl: 'https://firestore.googleapis.com/v1'
};
var HOOK_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;
var ITEMS = 'inventoryItems', SYNC = 'inventoryMeta/sync', SHEET = 'inventoryMeta/sheet';
var TABS = ['Summary', 'Inventory', 'Reorder', 'All items'];
// tabs made by an earlier version of this script; removed so nothing out of date is left behind
var OLD_TABS = ['Stock', 'Stock list', 'Owed to officers', 'Collected', 'Stock in', 'Sold & issued', 'Member payments', 'Repayments'];

var MONEY = '"RM "#,##0.00', STAMP = 'd mmm yyyy, h:mm am/pm';
var SECTIONS = [['prejunior', 'Pre-Junior'], ['junior', 'Junior'], ['senior', 'Senior'], ['officers', 'Officers'], ['primers', 'Primers']];
var CATEGORIES = ['Uniform', 'Used Uniform', 'Badges', 'Books', 'Equipment'];
var STATUS = { ok: 'In Stock', low: 'Low Stock', out: 'Out of Stock' };
var COLOURS = { navy: '#1f3a8a', band: '#16275e', group: '#e3e9fb', groupInk: '#1f3a8a', ink: '#1f2937', white: '#ffffff',
  ok: '#067647', low: '#b45309', out: '#b42318', muted: '#6b7280' };

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
    '<p>Sign in with the Parade HQ login made for this spreadsheet (duty: <b>Uniform</b>), then paste the web app link.</p>' +
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
  CacheService.getUserCache().remove('idToken');
  var t = signIn_(username, password);       // throws a clear message if wrong
  fsList_(ITEMS, t, 1);                      // throws if this login cannot see the Inventory page
  PropertiesService.getUserProperties().setProperties({ username: username, password: password, hook: hook, sheetId: SpreadsheetApp.getActive().getId() });
  var r = sync_(true);
  return 'Connected. Copied ' + r.rows + (r.rows === 1 ? ' item' : ' items') + '. From now on it updates each time someone saves on the Inventory page.';
}

function updateNow() {
  var r = sync_(true);
  SpreadsheetApp.getActive().toast('Copied ' + r.rows + (r.rows === 1 ? ' item' : ' items') + ' from Parade HQ.', 'Inventory', 5);
}

function disconnect() {
  try { fsPatch_(SHEET, { hook: '' }, token_()); } catch (e) {}   // Parade HQ stops sending updates
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
  try { r = sync_(false); r = r.skipped ? 'up to date' : 'copied ' + r.rows + ' items'; } catch (e) { r = 'error: ' + e.message; }
  return ContentService.createTextOutput('Inventory sheet: ' + r);
}

/* ---------------- copying ---------------- */
function sync_(force) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { rows: 0, skipped: true };
  try {
    var token = token_();
    var meta = fsGet_(SYNC, token) || {};
    var rev = +meta.rev || 0, docProps = PropertiesService.getDocumentProperties();
    if (!force && docProps.getProperty('lastRev') === String(rev)) return { rows: 0, skipped: true };

    var items = fsList_(ITEMS, token);
    writeAll_(ss_(), items);

    docProps.setProperty('lastRev', String(rev));
    // Tell Parade HQ where the spreadsheet is and that it is up to date (shown on the Inventory page).
    fsPatch_(SHEET, { url: ss_().getUrl(), syncedAt: new Date().toISOString(), rev: rev,
      hook: PropertiesService.getUserProperties().getProperty('hook') || '' }, token);
    return { rows: items.length, skipped: false };
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

/* ---------------- the same rules as the Inventory page ---------------- */
function statusOf(it) { var s = +it.stock || 0, t = +it.threshold || 0; return s <= 0 ? 'out' : s <= t ? 'low' : 'ok'; }
function totalSen(it) { return Math.max(0, Math.round(+it.stock || 0)) * Math.max(0, Math.round(+it.priceSen || 0)); }
function rm(sen) { return Math.round(sen) / 100; }
function sectionLabel(id) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i][0] === id) return SECTIONS[i][1]; return ''; }
function sectionRank(id) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i][0] === id) return i; return 99; }
function categoryRank(c) { var i = CATEGORIES.indexOf(c); return i < 0 ? 50 : i; }
function stamp(s) { var t = Date.parse(s || ''); return isNaN(t) ? '' : new Date(t); }
function byName(a, b) { return String(a.name).toLowerCase() < String(b.name).toLowerCase() ? -1 : String(a.name).toLowerCase() > String(b.name).toLowerCase() ? 1 : 0; }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

/** Writes every tab. Returns nothing; the counts are in the Summary tab. */
function writeAll_(ss, items) {
  items = items.slice().sort(function (a, b) {
    return sectionRank(a.section) - sectionRank(b.section) || categoryRank(a.category) - categoryRank(b.category)
      || String(a.category).localeCompare(String(b.category)) || byName(a, b);
  });
  var low = items.filter(function (it) { return statusOf(it) === 'low'; }).length;
  var out = items.filter(function (it) { return statusOf(it) === 'out'; }).length;
  var value = items.reduce(function (s, it) { return s + totalSen(it); }, 0);
  var units = items.reduce(function (s, it) { return s + Math.max(0, +it.stock || 0); }, 0);

  // Summary: the four numbers on the Inventory page
  tab_(ss, 'Summary', ['', ''], [
    ['Total items', items.length],
    ['Units in stock', units],
    ['Total inventory value', rm(value)],
    ['Low stock items', low],
    ['Out of stock items', out],
    ['Last copied from Parade HQ', new Date()],
    ['', ''],
    ['Change items on Parade HQ > Inventory. This spreadsheet is a copy and updates by itself each time someone saves.', '']
  ], {});
  var sum = ss.getSheetByName('Summary');
  sum.getRange(1, 1, 1, 2).setValues([['Inventory summary', '']]);
  sum.getRange(4, 2).setNumberFormat(MONEY); sum.getRange(7, 2).setNumberFormat(STAMP);
  sum.getRange(5, 2).setFontColor(low ? COLOURS.low : COLOURS.ink); sum.getRange(6, 2).setFontColor(out ? COLOURS.out : COLOURS.ink);
  sum.getRange(9, 1).setFontStyle('italic').setFontColor(COLOURS.muted);
  sum.setColumnWidth(1, 260); sum.setColumnWidth(2, 200);

  inventoryTab_(ss, items);

  // Reorder: Low Stock and Out of Stock, most urgent first
  var urgent = items.filter(function (it) { return statusOf(it) !== 'ok'; }).sort(function (a, b) {
    var sa = statusOf(a), sb = statusOf(b);
    return (sa === sb ? 0 : sa === 'out' ? -1 : 1) || ((+a.stock - +a.threshold) - (+b.stock - +b.threshold)) || byName(a, b);
  });
  tab_(ss, 'Reorder', ['Item', 'Section', 'Category', 'In stock', 'Reorder at', 'Status'],
    urgent.map(function (it) { return [it.name, sectionLabel(it.section), it.category, +it.stock || 0, +it.threshold || 0, STATUS[statusOf(it)]]; }), {});
  colourStatus_(ss.getSheetByName('Reorder'), 6, urgent);

  // All items: one plain row per item, for sorting, filters or Excel
  tab_(ss, 'All items', ['Item Name', 'Section', 'Category', 'Stock Level', 'Reorder Threshold', 'Unit Price (RM)', 'Total Value (RM)', 'Status', 'Last changed', 'Changed by'],
    items.map(function (it) {
      return [it.name, sectionLabel(it.section), it.category, +it.stock || 0, +it.threshold || 0, rm(+it.priceSen || 0), rm(totalSen(it)), STATUS[statusOf(it)], stamp(it.updatedAt), it.by || ''];
    }), { 6: MONEY, 7: MONEY, 9: STAMP });
  colourStatus_(ss.getSheetByName('All items'), 8, items);

  OLD_TABS.forEach(function (n) { var sh = ss.getSheetByName(n); if (sh && ss.getSheets().length > 1) ss.deleteSheet(sh); });
  TABS.forEach(function (n, i) { var sh = ss.getSheetByName(n); if (sh) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName('Inventory'));
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

/** Inventory: a band for each section, a heading for each category, then the items, with totals. */
function inventoryTab_(ss, items) {
  var sh = ss.getSheetByName('Inventory') || ss.insertSheet('Inventory');
  sh.clear();
  var head = ['Item', 'In stock', 'Reorder at', 'Unit price', 'Total value', 'Status'];
  var C = COLOURS, rows = [head], bg = [C.navy], ink = [six(C.white)], wt = ['bold'];
  function six(c) { return [c, c, c, c, c, c]; }
  function add(r, b, i, w) { rows.push(r); bg.push(b); ink.push(i); wt.push(w); }
  SECTIONS.forEach(function (sec) {
    var inSec = items.filter(function (it) { return it.section === sec[0]; });
    if (!inSec.length) return;
    if (rows.length > 1) add(['', '', '', '', '', ''], C.white, six(C.ink), 'normal');
    var secValue = inSec.reduce(function (s, it) { return s + totalSen(it); }, 0);
    add([sec[1] + '  ·  ' + plural(inSec.length, 'item', 'items'), '', '', '', rm(secValue), ''], C.band, six(C.white), 'bold');
    var cats = [];
    inSec.forEach(function (it) { if (cats.indexOf(it.category) < 0) cats.push(it.category); });
    cats.forEach(function (c) {
      add([c, '', '', '', '', ''], C.group, six(C.groupInk), 'bold');
      inSec.filter(function (it) { return it.category === c; }).forEach(function (it) {
        var st = statusOf(it);
        add([it.name, +it.stock || 0, +it.threshold || 0, rm(+it.priceSen || 0), rm(totalSen(it)), STATUS[st]], C.white,
          [C.ink, C.ink, C.ink, C.ink, C.ink, C[st]], 'normal');
      });
    });
  });
  if (rows.length === 1) add(['No items yet. Add them on Parade HQ > Inventory.', '', '', '', '', ''], C.white, six(C.muted), 'normal');
  var n = rows.length;
  var rg = sh.getRange(1, 1, n, 6);
  rg.setValues(rows);
  rg.setBackgrounds(bg.map(six));
  rg.setFontColors(ink);
  rg.setFontWeights(wt.map(six));
  sh.getRange(2, 4, n - 1, 2).setNumberFormat(MONEY);
  sh.getRange(1, 2, n, 2).setHorizontalAlignment('center');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 280); sh.setColumnWidth(2, 90); sh.setColumnWidth(3, 100); sh.setColumnWidth(4, 110); sh.setColumnWidth(5, 120); sh.setColumnWidth(6, 120);
}

/** Status text in green, amber or red, like the badges on the Inventory page. */
function colourStatus_(sh, col, items) {
  if (!items.length) return;
  sh.getRange(2, col, items.length, 1).setFontColors(items.map(function (it) { return [COLOURS[statusOf(it)]]; })).setFontWeight('bold');
}

function tab_(ss, name, head, rows, formats) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clear();
  var all = [head].concat(rows);
  sh.getRange(1, 1, all.length, head.length).setValues(all);
  sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground(COLOURS.navy).setFontColor(COLOURS.white);
  sh.setFrozenRows(1);
  if (rows.length) Object.keys(formats || {}).forEach(function (c) { sh.getRange(2, +c, rows.length, 1).setNumberFormat(formats[c]); });
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
  if (code === 403) throw new Error('This Parade HQ login cannot see the Inventory page. Use a login with the Uniform duty (or Owner, Admin, Parade Commander or Squad Leader), and check the latest database rules are published.');
  if (code === 401) { CacheService.getUserCache().remove('idToken'); throw new Error('The sign-in expired. It will retry at the next update.'); }
  if (code >= 300) throw new Error('Parade HQ database error ' + code + ': ' + res.getContentText().slice(0, 200));
  return JSON.parse(res.getContentText() || '{}');
}
function fsGet_(path, token) { var d = call_(docUrl_(path), { method: 'get' }, token); return d ? decodeFields_(d.fields) : null; }
function fsList_(coll, token, max) {
  var out = [], page = '';
  do {
    var d = call_(docUrl_(coll) + '?pageSize=' + (max || 300) + (page ? '&pageToken=' + encodeURIComponent(page) : ''), { method: 'get' }, token) || {};
    (d.documents || []).forEach(function (doc) { var o = decodeFields_(doc.fields); o.id = doc.name.split('/').pop(); out.push(o); });
    page = max ? '' : d.nextPageToken || '';
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
