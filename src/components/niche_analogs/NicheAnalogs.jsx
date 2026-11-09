// ---------- Товары-аналоги ниши: до 30 самых близких к референсу карточек ----------
// Строка «Товары-аналоги по степени схожести — 30 шт.» и кнопка «Показать»; список с
// прокруткой и график цены скрыты, пока кнопку не нажмут.
import { useEffect, useRef, useState } from 'react';
import { getNicheAnalogs } from '../../services/api';
import { NICHE_ANALOGS_LABELS, nicheAnalogsTitle } from '../../constants/labels';
import ParticipantRow from '../participant_row/ParticipantRow';
import CardDynamicsChart from '../card_dynamics_chart/CardDynamicsChart';
import { collapseSmoothly } from '../../utils/collapse';
import styles from './NicheAnalogs.module.css';

// periodRange - период дашборда из AnalyticsBlock ({ from, to } или null, если графика рынка нет)
function NicheAnalogs({ nicheId, periodRange }) {
  // Список, выбранная карточка и раскрытие привязаны к нише: при смене ниши старое состояние
  // не совпадает по ключу и считается сброшенным - без setState в эффекте.
  const [loaded, setLoaded] = useState({ nicheId: null, items: null });
  const [selection, setSelection] = useState({ nicheId: null, sku: null });
  const [openState, setOpenState] = useState({ nicheId: null, open: false });
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
  const open = openState.nicheId === nicheId && openState.open;
  const selectedSku = selection.nicheId === nicheId ? selection.sku : null;
  const selectedItem = (items && selectedSku !== null && items.find((a) => a.sku === selectedSku)) || null;

  // Скрытие списка - плавное, показ - сразу
  const toggleOpen = (e) => {
    const next = () => setOpenState({ nicheId, open: !open });
    if (open) collapseSmoothly(e.currentTarget, next);
    else next();
  };  const hasItems = Boolean(items && items.length > 0);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.label}>
          {hasItems ? nicheAnalogsTitle(items.length) : NICHE_ANALOGS_LABELS.title}
        </span>
        {hasItems && (
          <button type="button" className={styles.btnSecondary} onClick={toggleOpen}>
            {open ? NICHE_ANALOGS_LABELS.hide : NICHE_ANALOGS_LABELS.show}
          </button>
        )}
      </div>

      {items === null && <p className={styles.muted}>{NICHE_ANALOGS_LABELS.loading}</p>}
      {items && items.length === 0 && <p className={styles.muted}>{NICHE_ANALOGS_LABELS.empty}</p>}

      {hasItems && open && (
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

      {open && selectedItem && periodRange && (
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
              onClick={(e) => collapseSmoothly(e.currentTarget, () => setSelection({ nicheId, sku: null }))}
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