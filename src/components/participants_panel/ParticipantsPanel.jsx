// ---------- Раскрывающийся список участников тренда/события ----------
import { useEffect, useRef, useState } from 'react';
import { getEventParticipants } from '../../services/api';
import { PARTICIPANTS_PANEL_LABELS as L, titleWithCount } from '../../constants/labels';
import ParticipantRow from '../participant_row/ParticipantRow';
import { collapseSmoothly } from '../../utils/collapse';
import CardDynamicsChart from '../card_dynamics_chart/CardDynamicsChart';
import styles from './ParticipantsPanel.module.css';

function ParticipantsPanel({ title, colorVar, eventId, periodFrom, periodTo, onClose }) {
  const [participants, setParticipants] = useState(null);
  const requestIdRef = useRef(0);

  // Выбранная карточка привязана к событию: при смене события старый выбор
  // не совпадает по ключу и считается сброшенным - без setState внутри эффекта.
  const [selection, setSelection] = useState({ eventId: null, sku: null });
  const selectedSku = selection.eventId === eventId ? selection.sku : null;
  const setSelectedSku = (next) => setSelection((cur) => {
    const current = cur.eventId === eventId ? cur.sku : null;
    return { eventId, sku: typeof next === 'function' ? next(current) : next };
  });

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    // participants не сбрасываем в null здесь намеренно — старый список
    // остаётся на экране, пока не придут новые данные, чтобы высота
    // панели не скакала между "Загрузка..." и полным списком.
    getEventParticipants(eventId)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setParticipants(data);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setParticipants([]);
      });
  }, [eventId]);

  const selected = participants && participants.find((p) => p.sku === selectedSku);

  return (
    <div className={styles.panel}>
      <div className={styles.title} style={{ color: `var(${colorVar})` }}>
        {participants && participants.length > 0 ? titleWithCount(title, participants.length) : title}
      </div>

      {participants === null && <p className={styles.muted}>{L.loading}</p>}
      {participants && participants.length === 0 && (
        <p className={styles.muted}>{L.empty}</p>
      )}

      {participants && participants.length > 0 && (
        <div className={styles.list}>
          {participants.map((p) => (
            <ParticipantRow
              key={p.sku}
              participant={p}
              isSelected={p.sku === selectedSku}
              onShowDynamics={setSelectedSku}
            />
          ))}
        </div>
      )}

      {/* закрывает всю панель - и список, и график цены, если он открыт */}
      <div className={styles.actions}>
        <button className={styles.btnSecondary}
          onClick={(e) => collapseSmoothly(e.currentTarget, onClose)}>
          {L.hideParticipants}
        </button>
      </div>

      {selected && (
        <>
          <CardDynamicsChart sku={selected.sku} name={selected.name} url={selected.url}
            periodFrom={periodFrom} periodTo={periodTo} />
          <div className={styles.actions}>
            <button className={styles.btnSecondary}
              onClick={(e) => collapseSmoothly(e.currentTarget, () => setSelectedSku(null))}>
              {L.hideChart}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ParticipantsPanel;