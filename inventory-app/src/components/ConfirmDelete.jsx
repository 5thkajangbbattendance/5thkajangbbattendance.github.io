import { useEffect, useRef } from 'react';
import { formatRM, totalSen, SECTION_LABEL } from '../inventory.js';

/** Asks before an item is deleted. Esc, Cancel or a click outside keeps the item. */
export default function ConfirmDelete({ item, onCancel, onConfirm }) {
  const cancelRef = useRef(null), boxRef = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    cancelRef.current?.focus();
    function key(e) {
      if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      if (e.key === 'Tab') {
        const f = boxRef.current.querySelectorAll('button');
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', key);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', key);
      document.body.classList.remove('modal-open');
      if (before && before.isConnected) before.focus();
    };
  }, [onCancel]);

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="del-h" aria-describedby="del-d" ref={boxRef}>
        <h2 id="del-h">Delete {item.name}?</h2>
        <p id="del-d">
          This removes {item.name} ({SECTION_LABEL[item.section]}, {item.stock} in stock, worth {formatRM(totalSen(item.stock, item.priceSen))}) from the inventory. This cannot be undone.
        </p>
        <div className="dialog-acts">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn danger" onClick={onConfirm}>Delete item</button>
        </div>
      </div>
    </div>
  );
}
