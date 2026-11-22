import { SECTIONS, sectionCounts } from '../inventory.js';

/** All sections, or one section at a time. The choice applies to the whole page: cards, alert and table. */
export default function SectionTabs({ items, value, onChange }) {
  const n = sectionCounts(items);
  const tabs = [{ id: '', label: 'All sections', n: items.length }].concat(SECTIONS.map(s => ({ ...s, n: n[s.id] })));
  return (
    <nav className="sections" aria-label="Sections">
      {tabs.map(t => (
        <button key={t.id || 'all'} type="button" aria-pressed={value === t.id}
          onClick={e => { onChange(t.id); e.currentTarget.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }}>
          {t.label}<span className="n">{t.n}</span>
        </button>
      ))}
    </nav>
  );
}
