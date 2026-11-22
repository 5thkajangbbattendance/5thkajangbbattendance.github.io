import { summarize, formatRM } from '../inventory.js';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/** Total Items, Total Inventory Value, Low Stock Items and Out of Stock Items, from the live list. */
export default function SummaryCards({ items, scope }) {
  const s = summarize(items);
  const cards = [
    { key: 'items', label: 'Total Items', value: String(s.items), note: plural(s.units, 'unit', 'units') + ' in stock', tone: '' },
    { key: 'value', label: 'Total Inventory Value', value: formatRM(s.valueSen), note: 'Stock level × unit price' + (scope ? ', ' + scope : ', all items'), tone: '' },
    { key: 'low', label: 'Low Stock Items', value: String(s.low), note: s.low ? 'At or below their reorder threshold' : 'None at or below the threshold', tone: s.low ? 'low' : '' },
    { key: 'out', label: 'Out of Stock Items', value: String(s.out), note: s.out ? 'None left: reorder now' : 'Everything has stock', tone: s.out ? 'out' : '' },
  ];
  return (
    <section className="kpis" aria-label={'Inventory summary' + (scope ? ', ' + scope : '')}>
      {cards.map(c => (
        <div key={c.key} className={'kpi' + (c.tone ? ' ' + c.tone : '')} data-kpi={c.key}>
          <span className="kpi-l">{c.label}</span>
          <strong className="kpi-v" aria-live="polite">{c.value}</strong>
          <span className="kpi-n">{c.note}</span>
        </div>
      ))}
    </section>
  );
}
