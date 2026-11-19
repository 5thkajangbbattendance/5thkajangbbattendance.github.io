#!/usr/bin/env node
// Attendance server: shared SQLite database + staff sign-in. No npm dependencies (Node 22.13+).
//   node server.js                         start the website (PORT, default 3000)
//   node server.js add-staff <user> <password> ["Display Name"]
//   node server.js set-password <user> <password>
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'data', 'attendance.db');
const APP_FILE = path.join(__dirname, 'app.html');
const SEED_SAMPLE = process.env.SEED_SAMPLE !== '0';
const DEFAULT_ORG = process.env.ORG_NAME || "The 5th Kajang Boys' Brigade Company";
const DEFAULT_GROUPS = (process.env.GROUPS || 'Pre-Junior,Junior,Senior').split(',').map(s => s.trim()).filter(Boolean);
const SESSION_DAYS = 30;
const STATUSES = new Set(['P', 'L', 'A', 'E', 'U']);

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS groups_(id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, sort INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY, name TEXT NOT NULL, group_id TEXT NOT NULL REFERENCES groups_(id),
  rank TEXT NOT NULL DEFAULT '', joined_on TEXT, contact TEXT NOT NULL DEFAULT '', archived INTEGER NOT NULL DEFAULT 0, archived_on TEXT);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, name TEXT NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  group_id TEXT REFERENCES groups_(id), created_at TEXT, created_by TEXT);
CREATE TABLE IF NOT EXISTS records(session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id), status TEXT NOT NULL CHECK(status IN ('P','L','A','E','U')),
  updated_at TEXT NOT NULL, updated_by TEXT, PRIMARY KEY(session_id, member_id));
CREATE TABLE IF NOT EXISTS staff(id INTEGER PRIMARY KEY, username TEXT NOT NULL COLLATE NOCASE UNIQUE, display_name TEXT NOT NULL, pass_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY, staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
`);

const q = (sql) => db.prepare(sql);
function tx(fn) { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } }
const uid = (p) => p + '-' + crypto.randomBytes(6).toString('hex');
function klToday() {
  const o = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date()).forEach(p => { o[p.type] = p.value; });
  return `${o.year}-${o.month}-${o.day}`;
}

// ---------- passwords ----------
function hashPassword(pw) { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); }
function checkPassword(pw, stored) {
  const [s, h] = String(stored).split(':'); if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function upsertStaff(username, password, display) {
  if (!username || !password || password.length < 8) throw new Error('Username and a password of at least 8 characters are required.');
  const ex = q('SELECT id FROM staff WHERE username=?').get(username);
  if (ex) q('UPDATE staff SET pass_hash=?, display_name=COALESCE(?,display_name) WHERE id=?').run(hashPassword(password), display || null, ex.id);
  else q('INSERT INTO staff(username, display_name, pass_hash) VALUES (?,?,?)').run(username, display || username, hashPassword(password));
}

// ---------- CLI ----------
const [, , cmd, ...args] = process.argv;
if (cmd === 'add-staff' || cmd === 'set-password') {
  try { upsertStaff(args[0], args[1], args[2]); console.log(`Staff account "${args[0]}" saved.`); process.exit(0); }
  catch (e) { console.error(e.message); process.exit(1); }
}

// ---------- first run ----------
if (!q('SELECT 1 FROM settings WHERE key=?').get('orgName')) q('INSERT INTO settings VALUES (?,?)').run('orgName', DEFAULT_ORG);
if (!q('SELECT 1 FROM groups_ LIMIT 1').get()) {
  if (SEED_SAMPLE) {
    const html = fs.readFileSync(APP_FILE, 'utf8');
    const code = html.match(/<script id="bb-seed">([\s\S]*?)<\/script>/)[1];
    const data = vm.runInNewContext(code + ';bbSeed(today)', { today: klToday() });
    tx(() => {
      data.groups.forEach(g => q('INSERT INTO groups_ VALUES (?,?,?)').run(g.id, g.name, g.sort));
      data.members.forEach(m => q('INSERT INTO members VALUES (?,?,?,?,?,?,?,?)').run(m.id, m.name, m.groupId, m.rank, m.joinedOn, m.contact, m.archived ? 1 : 0, m.archivedOn));
      data.sessions.forEach(s => q('INSERT INTO sessions VALUES (?,?,?,?,?,?,?)').run(s.id, s.name, s.date, s.time, s.groupId, s.createdAt || null, 'Sample data'));
      data.records.forEach(r => q('INSERT INTO records VALUES (?,?,?,?,?)').run(r.sessionId, r.memberId, r.status, r.updatedAt, r.updatedBy));
    });
    console.log('Loaded sample data (set SEED_SAMPLE=0 on first run to start empty).');
  } else {
    DEFAULT_GROUPS.forEach((g, i) => q('INSERT INTO groups_ VALUES (?,?,?)').run(uid('g'), g, i + 1));
  }
}
if (!q('SELECT 1 FROM staff LIMIT 1').get()) {
  const user = process.env.ADMIN_USERNAME || 'admin';
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  upsertStaff(user, pw, process.env.ADMIN_NAME || 'Company Captain');
  console.log(`\nCreated first staff account -> username: ${user}  password: ${process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD)' : pw}\n`);
}

// ---------- state ----------
function getState(user) {
  return {
    orgName: q("SELECT value FROM settings WHERE key='orgName'").get().value,
    groups: q('SELECT id, name, sort FROM groups_ ORDER BY sort').all(),
    members: q('SELECT id, name, group_id AS groupId, rank, joined_on AS joinedOn, contact, archived, archived_on AS archivedOn FROM members').all()
      .map(m => ({ ...m, archived: !!m.archived })),
    sessions: q('SELECT id, name, date, time, group_id AS groupId, created_at AS createdAt FROM sessions').all(),
    records: q('SELECT session_id AS sessionId, member_id AS memberId, status, updated_at AS updatedAt, updated_by AS updatedBy FROM records').all(),
    user: { name: user.display_name, username: user.username },
  };
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = (msg) => { throw new HttpError(400, msg); };
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '');

function validMember(b) {
  const name = clean(b.name, 120); if (!name) bad('Enter the member’s full name.');
  if (!q('SELECT 1 FROM groups_ WHERE id=?').get(b.groupId)) bad('Choose a group.');
  return { name, groupId: b.groupId, rank: clean(b.rank, 40), joinedOn: isDate(b.joinedOn) ? b.joinedOn : klToday(), contact: clean(b.contact, 200) };
}
function validSession(b, id) {
  const name = clean(b.name, 80); if (!name) bad('Enter a session name.');
  if (!isDate(b.date)) bad('Choose a date.');
  if (!/^\d{2}:\d{2}$/.test(b.time || '')) bad('Choose a time.');
  const gid = b.groupId || null;
  if (gid && !q('SELECT 1 FROM groups_ WHERE id=?').get(gid)) bad('Choose a group.');
  const dup = q('SELECT id FROM sessions WHERE date=? AND time=? AND lower(name)=lower(?) AND IFNULL(group_id,\'\')=? AND id<>?').get(b.date, b.time, name, gid || '', id || '');
  if (dup) bad('That session already exists at the same date and time.');
  return { name, date: b.date, time: b.time, groupId: gid };
}

function handleApi(method, route, body, user) {
  let m;
  if (method === 'GET' && route === 'state') return getState(user);
  if (method === 'PUT' && route === 'settings') {
    const n = clean(body.orgName, 120); if (!n) bad('Enter an organisation name.');
    q("UPDATE settings SET value=? WHERE key='orgName'").run(n); return { ok: true };
  }
  if (method === 'PUT' && route === 'groups') {
    const list = (Array.isArray(body.groups) ? body.groups : []).map(g => ({ id: g.id || null, name: clean(g.name, 60) }));
    if (!list.length) bad('Keep at least one group.');
    const seen = new Set();
    for (const g of list) { if (!g.name) bad('Group names cannot be blank.'); const k = g.name.toLowerCase(); if (seen.has(k)) bad(`Two groups are both called "${g.name}".`); seen.add(k); }
    return tx(() => {
      const keep = new Set(list.filter(g => g.id).map(g => g.id));
      for (const g of q('SELECT id, name FROM groups_').all()) {
        if (keep.has(g.id)) continue;
        if (q('SELECT 1 FROM members WHERE group_id=?').get(g.id)) bad(`"${g.name}" still has members. Move them to another group first.`);
        if (q('SELECT 1 FROM sessions WHERE group_id=?').get(g.id)) bad(`"${g.name}" is used by past sessions, so it cannot be removed. Rename it instead.`);
        q('DELETE FROM groups_ WHERE id=?').run(g.id);
      }
      // temporary names avoid UNIQUE clashes when two groups swap names
      list.forEach(g => { if (g.id) q('UPDATE groups_ SET name=? WHERE id=?').run('~' + g.id, g.id); });
      list.forEach((g, i) => {
        if (g.id && q('SELECT 1 FROM groups_ WHERE id=?').get(g.id)) q('UPDATE groups_ SET name=?, sort=? WHERE id=?').run(g.name, i + 1, g.id);
        else q('INSERT INTO groups_ VALUES (?,?,?)').run(uid('g'), g.name, i + 1);
      });
      return { ok: true };
    });
  }
  if (method === 'POST' && route === 'members') {
    const v = validMember(body), id = uid('m');
    q('INSERT INTO members(id,name,group_id,rank,joined_on,contact) VALUES (?,?,?,?,?,?)').run(id, v.name, v.groupId, v.rank, v.joinedOn, v.contact);
    return { id, ...v };
  }
  if ((m = route.match(/^members\/([\w-]+)$/)) && method === 'PUT') {
    if (!q('SELECT 1 FROM members WHERE id=?').get(m[1])) throw new HttpError(404, 'Member not found.');
    if ('archived' in body && Object.keys(body).length === 1) {
      q('UPDATE members SET archived=?, archived_on=? WHERE id=?').run(body.archived ? 1 : 0, body.archived ? klToday() : null, m[1]);
    } else {
      const v = validMember(body);
      q('UPDATE members SET name=?, group_id=?, rank=?, joined_on=?, contact=? WHERE id=?').run(v.name, v.groupId, v.rank, v.joinedOn, v.contact, m[1]);
    }
    return { ok: true };
  }
  if (method === 'POST' && route === 'sessions') {
    const v = validSession(body), id = uid('s');
    q('INSERT INTO sessions VALUES (?,?,?,?,?,?,?)').run(id, v.name, v.date, v.time, v.groupId, new Date().toISOString(), user.display_name);
    return { id, ...v };
  }
  if ((m = route.match(/^sessions\/([\w-]+)$/))) {
    if (!q('SELECT 1 FROM sessions WHERE id=?').get(m[1])) throw new HttpError(404, 'Session not found.');
    if (method === 'PUT') { const v = validSession(body, m[1]); q('UPDATE sessions SET name=?, date=?, time=?, group_id=? WHERE id=?').run(v.name, v.date, v.time, v.groupId, m[1]); return { ok: true }; }
    if (method === 'DELETE') { q('DELETE FROM sessions WHERE id=?').run(m[1]); return { ok: true }; }
  }
  if ((m = route.match(/^sessions\/([\w-]+)\/records$/)) && method === 'PUT') {
    if (!q('SELECT 1 FROM sessions WHERE id=?').get(m[1])) throw new HttpError(404, 'Session not found.');
    const recs = Array.isArray(body.records) ? body.records : [];
    const now = new Date().toISOString();
    // One row per member per session (primary key); a re-save updates instead of duplicating.
    const up = q(`INSERT INTO records(session_id, member_id, status, updated_at, updated_by) VALUES (?,?,?,?,?)
      ON CONFLICT(session_id, member_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at, updated_by=excluded.updated_by
      WHERE records.status <> excluded.status`);
    let saved = 0;
    tx(() => {
      for (const r of recs) {
        if (!STATUSES.has(r.status)) bad('Unknown status.');
        if (!q('SELECT 1 FROM members WHERE id=?').get(r.memberId)) bad('Unknown member.');
        saved += Number(up.run(m[1], r.memberId, r.status, now, user.display_name).changes);
      }
    });
    return { saved };
  }
  throw new HttpError(404, 'Not found');
}

// ---------- auth ----------
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
function parseCookies(h) { const o = {}; (h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return o; }
function currentUser(req) {
  const tok = parseCookies(req.headers.cookie).bb_session; if (!tok) return null;
  return q('SELECT s.id, s.username, s.display_name FROM auth_sessions a JOIN staff s ON s.id=a.staff_id WHERE a.token_hash=? AND a.expires_at>?').get(sha(tok), Date.now()) || null;
}
function cookie(req, value, maxAge) {
  const secure = process.env.COOKIE_SECURE === '1' || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `bb_session=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
const failures = new Map(); // ip -> {n, until}

// ---------- http ----------
function shell() {
  const frag = fs.readFileSync(APP_FILE, 'utf8');
  return '<!doctype html><html lang="en-MY"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<meta name="theme-color" content="#14294f"><script>window.BB_SERVER=true</script></head><body>' + frag + '</body></html>';
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
const json = (res, status, obj, headers) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return send(res, 200, shell(), { 'Content-Type': 'text/html; charset=utf-8' });
  if (url.pathname === '/healthz') return send(res, 200, 'ok');
  if (!url.pathname.startsWith('/api/')) return send(res, 404, 'Not found');
  const route = url.pathname.slice(5);
  if (req.method !== 'GET' && !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Expected JSON.' });
  let raw = '';
  req.on('data', c => { raw += c; if (raw.length > 2e6) req.destroy(); });
  req.on('end', () => {
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return json(res, 400, { error: 'Invalid JSON.' }); }
    try {
      if (route === 'login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress, f = failures.get(ip);
        if (f && f.n >= 8 && f.until > Date.now()) return json(res, 429, { error: 'Too many failed attempts. Try again in 15 minutes.' });
        const s = q('SELECT * FROM staff WHERE username=?').get(clean(body.username, 80));
        if (!s || !checkPassword(String(body.password || ''), s.pass_hash)) {
          const n = (f && f.until > Date.now() ? f.n : 0) + 1; failures.set(ip, { n, until: Date.now() + 15 * 60e3 });
          return json(res, 401, { error: 'Username or password is incorrect.' });
        }
        failures.delete(ip);
        const tok = crypto.randomBytes(32).toString('base64url');
        q('DELETE FROM auth_sessions WHERE expires_at<?').run(Date.now());
        q('INSERT INTO auth_sessions VALUES (?,?,?)').run(sha(tok), s.id, Date.now() + SESSION_DAYS * 864e5);
        return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(req, tok, SESSION_DAYS * 86400) });
      }
      if (route === 'logout' && req.method === 'POST') {
        const tok = parseCookies(req.headers.cookie).bb_session; if (tok) q('DELETE FROM auth_sessions WHERE token_hash=?').run(sha(tok));
        return json(res, 200, { ok: true }, { 'Set-Cookie': cookie(req, '', 0) });
      }
      const user = currentUser(req);
      if (!user) return json(res, 401, { error: 'Please sign in.' });
      return json(res, 200, handleApi(req.method, route, body, user));
    } catch (e) {
      if (e instanceof HttpError) return json(res, e.status, { error: e.message });
      console.error(e); return json(res, 500, { error: 'Something went wrong on the server.' });
    }
  });
});
server.listen(PORT, () => console.log(`Attendance website running at http://localhost:${PORT}`));
