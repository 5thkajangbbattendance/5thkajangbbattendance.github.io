import { STATUS_LABEL } from '../inventory.js';

/** Green In Stock, amber Low Stock or red Out of Stock. Worked out from the numbers, never typed in. */
export default function StatusBadge({ status }) {
  return <span className={'status ' + status}>{STATUS_LABEL[status]}</span>;
}
