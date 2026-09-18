// ---------- Универсальная всплывающая подсказка по наведению на значок ⓘ ----------
import { useState } from 'react';
import styles from './InfoTooltip.module.css';

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={styles.wrap}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      <span className={styles.icon}>ⓘ</span>
      {visible && <span className={styles.bubble} dangerouslySetInnerHTML={{ __html: text }} />}
    </span>
  );
}

export default InfoTooltip;