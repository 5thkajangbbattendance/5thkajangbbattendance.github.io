import { statusOf, SECTION_LABEL } from '../inventory.js';
import StatusBadge from './StatusBadge.jsx';

/** Every Low Stock and Out of Stock item, worked out from the saved stock levels. Out of Stock first. */
export default function ReorderAlert({ items, scope }) {
  const alerts = items
    .map(it => ({ it, status: statusOf(it.stock, it.threshold) }))
    .filter(a => a.status !== 'ok')
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'out' ? -1 : 1)
      || (a.it.stock - a.it.threshold) - (b.it.stock - b.it.threshold)
      || a.it.name.localeCompare(b.it.name));

  return (
    <section className={'card alert-panel' + (alerts.length ? '' : ' clear')} aria-labelledby="alert-h">
      <div className="card-h">
        <div>
          <h2 id="alert-h">Reorder Alert</h2>
          <p className="card-sub">Low Stock and Out of Stock items, most urgent first.</p>
        </div>
        <span className="count" aria-live="polite">
          {alerts.length ? alerts.length + (alerts.length === 1 ? ' item needs' : ' items need') + ' reordering' : 'Nothing to reorder'}
        </span>
      </div>
      {alerts.length ? (
        <ul className="alert-list">
          {alerts.map(({ it, status }) => (
            <li key={it.id}>
              <div className="al-t">
                <b>{it.name}</b>
                <span>{SECTION_LABEL[it.section]} · {it.category}</span>
              </div>
              <div className="al-n">
                <b>{it.stock}</b> in stock<span> · reorder at {it.threshold}</span>
              </div>
              <StatusBadge status={status} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="alert-ok">{items.length ? 'Every item' + (scope ? ' in ' + scope : '') + ' is above its reorder threshold.' : 'No items' + (scope ? ' in ' + scope : '') + ' yet.'}</p>
      )}
    </section>
  );
}
