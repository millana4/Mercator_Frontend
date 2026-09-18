// ---------- Одна строка настроек: категория → маркетплейс → гео ----------
import { CATEGORY_LABELS, MARKETPLACE_LABELS } from '../../constants/labels';
import styles from './SettingsRow.module.css';

function SettingsRow({ row, index, catalog, onChange, onRemove }) {
  const categories = [...new Set(catalog.map((c) => c.category))];
  const marketplaces = [...new Set(
    catalog.filter((c) => c.category === row.category).map((c) => c.marketplace),
  )];
  const geos = [...new Set(
    catalog
      .filter((c) => c.category === row.category && c.marketplace === row.marketplace)
      .map((c) => c.geo),
  )];

  return (
    <div className={styles.row}>
      <select value={row.category} onChange={(e) => onChange(index, 'category', e.target.value)}>
        <option value="">— категория —</option>
        {categories.map((c) => (
          <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
        ))}
      </select>

      <select
        value={row.marketplace}
        disabled={!row.category}
        onChange={(e) => onChange(index, 'marketplace', e.target.value)}
      >
        <option value="">— маркетплейс —</option>
        {marketplaces.map((m) => (
          <option key={m} value={m}>{MARKETPLACE_LABELS[m] || m}</option>
        ))}
      </select>

      <select
        value={row.geo}
        disabled={!row.marketplace}
        onChange={(e) => onChange(index, 'geo', e.target.value)}
      >
        <option value="">— гео —</option>
        {geos.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      <button className={styles.remove} onClick={() => onRemove(index)} title="Удалить строку">
        ×
      </button>
    </div>
  );
}

export default SettingsRow;