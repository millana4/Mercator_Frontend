// ---------- Товары-аналоги ниши: до 30 самых близких к референсу карточек, список с прокруткой ----------
import { useEffect, useRef, useState } from 'react';
import { getNicheAnalogs } from '../../services/api';
import { NICHE_ANALOGS_LABELS, nicheAnalogsTitle } from '../../constants/labels';
import ParticipantRow from '../participant_row/ParticipantRow';
import CardDynamicsChart from '../card_dynamics_chart/CardDynamicsChart';
import styles from './NicheAnalogs.module.css';

// periodRange - период дашборда из AnalyticsBlock ({ from, to } или null, если графика рынка нет)
function NicheAnalogs({ nicheId, periodRange }) {
  // Список и выбранная карточка привязаны к нише: при смене ниши старое состояние
  // не совпадает по ключу и считается сброшенным - без setState в эффекте.
  const [loaded, setLoaded] = useState({ nicheId: null, items: null });
  const [selection, setSelection] = useState({ nicheId: null, sku: null });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    getNicheAnalogs(nicheId)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setLoaded({ nicheId, items: data });
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setLoaded({ nicheId, items: [] });
      });
  }, [nicheId]);

  const items = loaded.nicheId === nicheId ? loaded.items : null;
  const selectedSku = selection.nicheId === nicheId ? selection.sku : null;
  const selectedItem = (items && selectedSku !== null && items.find((a) => a.sku === selectedSku)) || null;

  return (
    <div className={styles.root}>
      <span className={styles.label}>
        {items && items.length > 0 ? nicheAnalogsTitle(items.length) : NICHE_ANALOGS_LABELS.title}
      </span>

      {items === null && <p className={styles.muted}>{NICHE_ANALOGS_LABELS.loading}</p>}
      {items && items.length === 0 && <p className={styles.muted}>{NICHE_ANALOGS_LABELS.empty}</p>}

      {items && items.length > 0 && (
        <div className={styles.list}>
          {items.map((a) => (
            <ParticipantRow
              key={a.sku}
              participant={a}
              isSelected={a.sku === selectedSku}
              onShowDynamics={(sku) => setSelection({ nicheId, sku })}
            />
          ))}
        </div>
      )}

      {selectedItem && periodRange && (
        <>
          <CardDynamicsChart
            sku={selectedItem.sku}
            name={selectedItem.name}
            url={selectedItem.url}
            periodFrom={periodRange.from}
            periodTo={periodRange.to}
          />
          <div className={styles.actions}>
            <button
              className={styles.btnSecondary}
              onClick={() => setSelection({ nicheId, sku: null })}
            >
              {NICHE_ANALOGS_LABELS.hideChart}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NicheAnalogs;