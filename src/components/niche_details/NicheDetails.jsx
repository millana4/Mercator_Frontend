// ---------- Подробности товарной ниши: описание и ссылка на референс, как их задал пользователь ----------
import styles from './NicheDetails.module.css';

function NicheDetails({ niche }) {
  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <span className={styles.label}>Описание</span>
        <span>{niche.description || '—'}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Ссылка на референс</span>
        {niche.reference_url ? (
          <a className={styles.link} href={niche.reference_url} target="_blank" rel="noopener noreferrer">
            {niche.reference_url}
          </a>
        ) : (
          <span>—</span>
        )}
      </div>
    </div>
  );
}

export default NicheDetails;