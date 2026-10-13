// ---------- Одна строка списка участников: название + ссылка + кнопка динамики ----------
// note - необязательная подпись под названием (у аналогов ниши - цена за штуку)
import styles from './ParticipantRow.module.css';

function ParticipantRow({ participant, isSelected, onShowDynamics, note = null }) {
  return (
    <div className={`${styles.row} ${isSelected ? styles.active : ''}`}>
      <div className={styles.main}>
        <a href={participant.url} target="_blank" rel="noopener noreferrer">
          {participant.name}
        </a>
        {note && <span className={styles.note}>{note}</span>}
      </div>
      <button className={styles.btnToggle} onClick={() => onShowDynamics(participant.sku)}>
        Посмотреть динамику
      </button>
    </div>
  );
}

export default ParticipantRow;