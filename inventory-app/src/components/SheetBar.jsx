import { useEffect, useRef, useState } from 'react';
import { agoText } from '../inventory.js';
import { can } from '../access.js';

const SETUP = 'https://github.com/5thkajangbbattendance/5thkajangbbattendance.github.io/blob/main/SHEET-SETUP.md';

/**
 * The Google Sheet copy: up to date, updating, or late (with what to do), and a button to open it.
 * If a phone lost signal before its message reached the sheet, the next person to open Inventory sends it again.
 */
export default function SheetBar({ meta, store }) {
  const [, tick] = useState(0);
  const pinged = useRef(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const sheet = meta.sheet || {}, sync = meta.sync || {};
  const url = /^https:\/\/docs\.google\.com\/spreadsheets\//.test(sheet.url || '') ? sheet.url : '';
  const behind = (sheet.rev || 0) < (sync.rev || 0);
  const quietFor = Date.now() - Date.parse(sync.at || 0);
  useEffect(() => {
    if (url && behind && quietFor > 60000 && Date.now() - pinged.current > 60000 && store.ping()) pinged.current = Date.now();
  });

  if (!url) {
    const boss = can(store.me, 'invSheet');
    return boss ? (
      <div className="sheet-bar">
        <SheetIcon />
        <span><b>Google Sheet:</b> not connected yet. It can copy this inventory into a spreadsheet every time someone saves.</span>
        <a className="btn sm" href={SETUP} target="_blank" rel="noopener noreferrer">How to connect</a>
      </div>
    ) : null;
  }
  const late = behind && quietFor > 3 * 60000;
  return (
    <div className={'sheet-bar' + (late ? ' late' : '')} aria-live="polite">
      <SheetIcon />
      <span>
        <b>Google Sheet</b> ·{' '}
        {!behind ? 'up to date (copied ' + agoText(sheet.syncedAt) + ')'
          : late ? 'not updated since ' + agoText(sheet.syncedAt) + '. Open it and use Inventory › Update now.'
            : 'updating now…'}
      </span>
      <a className="btn sm" href={url} target="_blank" rel="noopener noreferrer">Open spreadsheet</a>
    </div>
  );
}

function SheetIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18" /></svg>;
}
