// ---------- Кастомный выпадающий список — единый стиль, не зависит от системного рендера <select> ----------
import { useEffect, useRef, useState } from 'react';
import styles from './Dropdown.module.css';

function Dropdown({ value, options, placeholder = '—', disabled = false, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerText}>{selected ? selected.label : placeholder}</span>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ''}`}>▾</span>
      </button>

      {open && !disabled && (
        <div className={styles.menu}>
          {options.map((o) => (
            <div
              key={o.value}
              className={`${styles.option} ${o.value === value ? styles.optionSelected : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dropdown;