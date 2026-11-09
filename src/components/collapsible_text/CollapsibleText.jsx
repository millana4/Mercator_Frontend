// ---------- Текст с ограничением по высоте: первые N строк, «…» и кнопка «Подробнее» ----------
// Свёрнуто: обрезанный текст, под ним «…» и кнопка «Подробнее». Развёрнуто: весь текст,
// дополнительное содержимое extra (список карточек) и в самом низу кнопка «Свернуть».
// Кнопка «Подробнее» есть, если текст длиннее N строк или передан extra; многоточие -
// только у обрезанного текста. Высота содержимого измеряется ResizeObserver: пересчёт
// при смене ширины окна и при смене текста.
import { useEffect, useRef, useState } from 'react';
import { PROD_SPECS_LABELS as L } from '../../constants/labels';
import { collapseSmoothly } from '../../utils/collapse';
import styles from './CollapsibleText.module.css';

const LINE_HEIGHT_PX = 25.6;   // 16 px x 1,6 - межстрочный интервал текста блока
const MAX_LINES = 7;

function CollapsibleText({ children, extra = null, maxLines = MAX_LINES }) {
  const contentRef = useRef(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const limit = maxLines * LINE_HEIGHT_PX;

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(() => setOverflows(node.offsetHeight > limit + 1));
    observer.observe(node);
    return () => observer.disconnect();
  }, [limit]);

  const clipped = overflows && !expanded;
  const hasMore = overflows || Boolean(extra);

  return (
    <div>
      <div
        className={clipped ? `${styles.clip} ${styles.fade}` : styles.clip}
        style={clipped ? { maxHeight: limit } : undefined}
      >
        <div ref={contentRef}>{children}</div>
      </div>

      {!expanded && hasMore && (
        <div className={styles.more}>
          {clipped && <span className={styles.ellipsis}>…</span>}
          <button type="button" className={styles.btn} onClick={() => setExpanded(true)}>
            {L.more}
          </button>
        </div>
      )}

      {expanded && (
        <>
          {extra && <div className={styles.extra}>{extra}</div>}
          <div className={styles.less}>
            <button type="button" className={styles.btn}
              onClick={(e) => collapseSmoothly(e.currentTarget, () => setExpanded(false))}>
              {L.less}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default CollapsibleText;