// What the signed-in login may do in Inventory. Parade HQ passes the login's access (worked out from its roles);
// an older Parade HQ passes only the duty, so the old duty table is the fallback.
const DUTY = { admin: ['inv', 'invImport', 'invSheet'], commander: ['inv'], leader: ['inv'], uni: ['inv', 'invImport'] };

/** can(me, 'inv' | 'invImport' | 'invSheet'): change stock, import CSV, set up the Google Sheet. */
export function can(me, area) {
  if (!me) return false;
  if (me.duty === 'owner') return true;
  if (Array.isArray(me.write)) return me.write.includes(area);
  return (DUTY[me.duty] || []).includes(area);
}
