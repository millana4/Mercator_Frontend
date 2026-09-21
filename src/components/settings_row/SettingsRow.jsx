// ---------- Одна строка настроек: категория → маркетплейс → гео ----------
import { CATEGORY_LABELS, MARKETPLACE_LABELS } from '../../constants/labels';
import Dropdown from '../dropdown/Dropdown';
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
      <Dropdown
        value={row.category}
        placeholder="— категория —"
        options={categories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
        onChange={(value) => onChange(index, 'category', value)}
      />

      <Dropdown
        value={row.marketplace}
        placeholder="— маркетплейс —"
        disabled={!row.category}
        options={marketplaces.map((m) => ({ value: m, label: MARKETPLACE_LABELS[m] || m }))}
        onChange={(value) => onChange(index, 'marketplace', value)}
      />

      <Dropdown
        value={row.geo}
        placeholder="— гео —"
        disabled={!row.marketplace}
        options={geos.map((g) => ({ value: g, label: g }))}
        onChange={(value) => onChange(index, 'geo', value)}
      />

      <button className={styles.remove} onClick={() => onRemove(index)} title="Удалить строку">
        ×
      </button>
    </div>
  );
}

export default SettingsRow;