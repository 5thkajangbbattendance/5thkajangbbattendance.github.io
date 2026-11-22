import { useEffect, useState } from 'react';

// Same setting as Parade HQ ("bb-theme"), so the choice carries across the website.
const KEY = 'bb-theme';
const OPTIONS = [['system', 'Match device'], ['light', 'Light'], ['dark', 'Dark']];

function read() {
  try { const v = localStorage.getItem(KEY); return OPTIONS.some(o => o[0] === v) ? v : 'system'; } catch { return 'system'; }
}

function applyTheme(v) {
  if (v === 'light' || v === 'dark') document.documentElement.setAttribute('data-theme', v);
  else document.documentElement.removeAttribute('data-theme');
}

export default function ThemePicker() {
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    applyTheme(theme);
    try { if (theme === 'system') localStorage.removeItem(KEY); else localStorage.setItem(KEY, theme); } catch { /* private window: the choice lasts for this visit */ }
  }, [theme]);
  return (
    <div className="seg" role="group" aria-label="Colour theme">
      {OPTIONS.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={theme === v} onClick={() => setTheme(v)}>{label}</button>
      ))}
    </div>
  );
}
