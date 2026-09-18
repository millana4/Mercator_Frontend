// ---------- Раскрывающийся список участников тренда/события ----------
import { useEffect, useState } from 'react';
import { getEventParticipants } from '../../services/api';
import ParticipantRow from '../participant_row/ParticipantRow';
import CardDynamicsChart from '../card_dynamics_chart/CardDynamicsChart';
import styles from './ParticipantsPanel.module.css';

function ParticipantsPanel({ title, colorVar, eventId, onClose }) {
  const [participants, setParticipants] = useState(null);
  const [selectedSku, setSelectedSku] = useState(null);

  useEffect(() => {
    getEventParticipants(eventId)
      .then(setParticipants)
      .catch(() => setParticipants([]));
  }, [eventId]);

  const selected = participants && participants.find((p) => p.sku === selectedSku);

  return (
    <div className={styles.panel}>
      <div className={styles.title} style={{ color: `var(${colorVar})` }}>{title}</div>

      {participants === null && <p className={styles.muted}>Загрузка…</p>}
      {participants && participants.length === 0 && (
        <p className={styles.muted}>Список участников пуст.</p>
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

      {selected && <CardDynamicsChart sku={selected.sku} name={selected.name} />}

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={onClose}>
          Скрыть участников
        </button>
      </div>
    </div>
  );
}

export default ParticipantsPanel;