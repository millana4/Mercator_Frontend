// ---------- Блок «Признаки товаров-маячков»: рекомендации по закупкам по выбранной подкатегории ----------
// Показывается, только если для связки есть страты с готовым анализом. Страты одной
// подкатегории - один пункт списка (название точно как в блоке «Подкатегория»), кластеры
// всех её страт идут подряд. Для каждого кластера: описание типичного изделия, типичные
// признаки, признаки с частотами (текст обрезается до 7 строк с кнопкой «Подробнее»),
// список карточек с кнопкой «Динамика цен».
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getProdSpecsStrata, getProdSpecsStratum } from '../../services/api';
import { getCardPeriodRange, getPeriodRange } from '../../utils/analytics';
import {
  PROD_SPECS_LABELS as L, prodSpecsFeatureLabel, prodSpecsFeaturesIntro, prodSpecsMore,
} from '../../constants/labels';
import Dropdown from '../dropdown/Dropdown';
import CollapsibleText from '../collapsible_text/CollapsibleText';
import ProdSpecsCards from '../prod_specs_cards/ProdSpecsCards';
import styles from './ProdSpecsBlock.module.css';

const VALUES_SHOWN = 8;   // значений признака в списке частот; остальное - «и ещё N»
const NO_STRATA = [];

function featureLine(feature) {
  const shown = feature.values.slice(0, VALUES_SHOWN)
    .map((v) => `${v.value} (${v.count})`).join(', ');
  const rest = feature.values.length - VALUES_SHOWN;
  return { label: prodSpecsFeatureLabel(feature.field), shown, more: rest > 0 ? prodSpecsMore(rest) : null };
}

// Страты по подкатегориям, порядок как в ответе API: [{ key: название подкатегории, ids: [...] }]
function groupBySubcategory(strata) {
  const groups = [];
  const byKey = new Map();
  strata.forEach((s) => {
    const key = s.subcategory || s.label;
    if (!byKey.has(key)) {
      const group = { key, ids: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).ids.push(s.stratum_id);
  });
  return groups;
}

function ProdSpecsBlock() {
  const { category, marketplace, geo, period, customFrom, customTo } = useSelector((s) => s.dashboard);

  // Ответы хранятся вместе с ключом запроса: при смене связки или подкатегории старый ответ
  // не совпадает по ключу и считается сброшенным - без setState внутри эффекта.
  const requestKey = `${category}|${marketplace}|${geo}`;
  const [list, setList] = useState({ key: null, strata: NO_STRATA });
  const [selectedKey, setSelectedKey] = useState(null);
  const [detailState, setDetailState] = useState({ key: null, data: null });

  useEffect(() => {
    if (!category || !marketplace || !geo) return;
    let cancelled = false;
    getProdSpecsStrata({ category, marketplace, geo })
      .then((data) => {
        if (!cancelled) setList({ key: requestKey, strata: data.ready ? data.strata : NO_STRATA });
      })
      .catch(() => { if (!cancelled) setList({ key: requestKey, strata: NO_STRATA }); });
    return () => { cancelled = true; };
  }, [category, marketplace, geo, requestKey]);

  const strata = list.key === requestKey ? list.strata : NO_STRATA;
  const groups = useMemo(() => groupBySubcategory(strata), [strata]);
  const chosen = groups.find((g) => g.key === selectedKey) || groups[0] || null;
  const idsKey = chosen ? chosen.ids.join(',') : '';

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;
    Promise.all(idsKey.split(',').map((id) => getProdSpecsStratum(id)))
      .then((data) => { if (!cancelled) setDetailState({ key: idsKey, data }); })
      .catch(() => { if (!cancelled) setDetailState({ key: idsKey, data: null }); });
    return () => { cancelled = true; };
  }, [idsKey]);

  const detailLoaded = detailState.key === idsKey;
  const details = detailLoaded ? detailState.data : null;

  // Период графиков цены - общий с дашбордом, до текущего момента (как у аналогов ниши).
  // Мемоизирован: новые объекты дат на каждой отрисовке перезапускали бы загрузку замеров.
  const cardPeriod = useMemo(
    () => getCardPeriodRange(getPeriodRange(period, customFrom, customTo, []), period),
    [period, customFrom, customTo]);

  // Нет страт с анализом - блок не показывается
  if (groups.length === 0) return null;

  const clusters = details
    ? details.flatMap((d) => d.clusters.map((cluster, index) => ({ ...cluster, id: `${d.stratum_id}:${index}` })))
    : [];
  const otherCards = details ? details.flatMap((d) => d.other_cards) : [];

  return (
    <div className={styles.block} data-collapse-root>
      <div className={styles.header}>
        <span className={styles.headerLabel}>{L.header}</span>
      </div>
      <div className={styles.subheader}>
        <span className={styles.subLabel}>{L.subcategory}</span>
        <Dropdown
          value={chosen.key}
          options={groups.map((g) => ({ value: g.key, label: g.key }))}
          onChange={setSelectedKey}
        />
      </div>

      {!detailLoaded && <p className={styles.muted}>{L.loading}</p>}
      {detailLoaded && !details && <p className={styles.muted}>{L.error}</p>}

      {details && (
        <div className={styles.clusters}>
          {clusters.map((cluster) => (
            <section key={cluster.id} className={styles.cluster}>
              <h3 className={styles.clusterTitle}>{cluster.title}</h3>

              <CollapsibleText extra={(
                <>
                  <h4 className={styles.sectionTitle}>{L.cardsTitle}</h4>
                  <ProdSpecsCards key={cluster.id} cards={cluster.cards}
                    periodFrom={cardPeriod?.from} periodTo={cardPeriod?.to} />
                </>
              )}>
                {cluster.summary && (
                  <>
                    <h4 className={styles.sectionTitle}>{L.summaryTitle}</h4>
                    <p className={styles.text}>{cluster.summary}</p>
                  </>
                )}

                {cluster.typical.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>{L.typicalTitle}</h4>
                    <ul className={styles.bullets}>
                      {cluster.typical.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </>
                )}

                {cluster.features.length > 0 && (
                  <>
                    <h4 className={styles.sectionTitle}>{prodSpecsFeaturesIntro(cluster.n_cards)}</h4>
                    <ul className={styles.bullets}>
                      {cluster.features.map((feature) => {
                        const line = featureLine(feature);
                        return (
                          <li key={feature.field}>
                            {line.label}: {line.shown}
                            {line.more && <span className={styles.more}>, {line.more}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </CollapsibleText>
            </section>
          ))}

          {otherCards.length > 0 && (
            <section className={styles.cluster}>
              <h4 className={styles.sectionTitle}>{L.otherTitle}</h4>
              <ProdSpecsCards key={`${idsKey}:other`} cards={otherCards}
                periodFrom={cardPeriod?.from} periodTo={cardPeriod?.to} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ProdSpecsBlock;