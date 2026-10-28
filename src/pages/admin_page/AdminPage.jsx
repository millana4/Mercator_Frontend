// ---------- Управление сетами (только администратор): активный сет, черновик, сбор ----------
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from '../../components/header/Header';
import ProtectedRoute from '../../components/protected_route/ProtectedRoute';
import AssignmentTable from '../../components/assignment_table/AssignmentTable';
import EditableCell from '../../components/editable_cell/EditableCell';
import { DraftGuardContext } from '../../components/editable_cell/draftGuard';
import {
  ADMIN_LABELS, CATEGORY_LABELS, MARKETPLACE_LABELS, SEASON_TYPE_OPTIONS, adminErrorText,
  confirmDeleteDraft, confirmNewDraft, confirmStartCollecting, readinessText,
  validatePositiveInt, validateRotation, validateYear,
} from '../../constants/labels';
import { fetchCatalog } from '../../store/slices/settingsSlice';
import {
  createDraft, editDraft, fetchActiveView, fetchDraftView, fetchOverview, removeDraft,
  startCollecting,
} from '../../store/slices/adminSlice';
import { fmtShare } from '../../utils/format';
import styles from './AdminPage.module.css';

const PROGRESS_REFRESH_MS = 60_000;   // ход сбора - раз в минуту
const comboKey = (c) => `${c.category}|${c.marketplace}|${c.geo}`;
const comboLabel = (c) => `${CATEGORY_LABELS[c.category] || c.category} · `
  + `${MARKETPLACE_LABELS[c.marketplace] || c.marketplace} · ${c.geo}`;
// по умолчанию - детская одежда (единственная категория с сезонной заменой), иначе первая связка
const defaultCombo = (catalog) => catalog.find((c) => c.category === 'kids_clothing') || catalog[0];

// Шапка сета: сезон, параметры, итоги задания
function SetSummary({ summary }) {
  return (
    <div className={styles.summary}>
      <span>{ADMIN_LABELS.season}: <b>{summary.season_title || ADMIN_LABELS.noSeason}</b></span>
      {summary.analysis_cards !== null && (
        <span>
          {ADMIN_LABELS.params}: <b>{summary.analysis_cards} / {summary.min_subcategory_cards}
          {' / '}{fmtShare(summary.rotation_factor)}</b>
        </span>
      )}
      <span>{ADMIN_LABELS.trackedSubcategories}: <b>{summary.tracked_subcategories}</b></span>
      <span>{ADMIN_LABELS.strata}: <b>{summary.strata}</b></span>
      <span>{ADMIN_LABELS.plannedCards}: <b>{summary.planned_cards}</b></span>
      <span>{ADMIN_LABELS.analysisQuota}: <b>{summary.analysis_quota}</b></span>
    </div>
  );
}

// Сезон и параметры черновика: правка с пересчётом
function DraftParams({ summary, onEdit }) {
  const id = summary.id;
  const [seasonError, setSeasonError] = useState(null);
  const saveSeasonType = async (e) => {
    try {
      await onEdit('draft', id, { season_type: e.target.value });
      setSeasonError(null);
    } catch (status) {
      setSeasonError(adminErrorText(status));
    }
  };
  return (
    <div className={styles.params}>
      <label className={styles.param}>
        {ADMIN_LABELS.seasonType}
        <select className={styles.select} value={summary.season_type || ''} onChange={saveSeasonType}>
          {SEASON_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {seasonError && <span className={styles.errorNote}>{seasonError}</span>}
      </label>
      <label className={styles.param}>
        {ADMIN_LABELS.seasonYear}
        <EditableCell key={`year-${summary.season_year}`} value={summary.season_year} kind="int"
                      validate={validateYear}
                      onSave={(v) => onEdit('draft', id, { season_year: v })} />
      </label>
      <label className={styles.param}>
        {ADMIN_LABELS.analysisCards}
        <EditableCell key={`cards-${summary.analysis_cards}`} value={summary.analysis_cards} kind="int"
                      validate={validatePositiveInt}
                      onSave={(v) => onEdit('draft', id, { analysis_cards: v })} />
      </label>
      <label className={styles.param}>
        {ADMIN_LABELS.minSubcategoryCards}
        <EditableCell key={`min-${summary.min_subcategory_cards}`} value={summary.min_subcategory_cards}
                      kind="int" validate={validatePositiveInt}
                      onSave={(v) => onEdit('draft', id, { min_subcategory_cards: v })} />
      </label>
      <label className={styles.param}>
        {ADMIN_LABELS.rotationFactor}
        <EditableCell key={`rot-${summary.rotation_factor}`} value={summary.rotation_factor} kind="decimal"
                      validate={validateRotation}
                      onSave={(v) => onEdit('draft', id, { rotation_factor: v })} />
      </label>
    </div>
  );
}

// Ход сбора нового сезонного сета (обновляется сам раз в минуту)
function CollectingProgress({ summary, progress }) {
  return (
    <div className={styles.block}>
      <h2 className={styles.sectionTitle}>
        {ADMIN_LABELS.collectingTitle}: {summary.season_title}
      </h2>
      <SetSummary summary={summary} />
      {progress && (
        <div className={styles.progress}>
          <p>{ADMIN_LABELS.strataSent}: <b>{progress.strata_sent}</b> {ADMIN_LABELS.of} {progress.strata_total}</p>
          <p>{ADMIN_LABELS.cardsCollected}: <b>{progress.collected_cards}</b> {ADMIN_LABELS.of} {progress.planned_cards}</p>
          {progress.readiness ? (
            <>
              <p>EWMA: {readinessText(progress.readiness.ewma, progress.readiness.ewma_cards)}</p>
              <p>MACD: {readinessText(progress.readiness.macd, progress.readiness.macd_cards)}</p>
            </>
          ) : (
            <p className={styles.muted}>{ADMIN_LABELS.readinessUnavailable}</p>
          )}
        </div>
      )}
      <p className={styles.muted}>{ADMIN_LABELS.switchNote}</p>
      <p className={styles.muted}>{ADMIN_LABELS.progressAutoRefresh}</p>
    </div>
  );
}

// Черновик: параметры, таблица, кнопки. Поля с неверным значением и правки в пути
// блокируют «Запустить сбор» и «Удалить черновик». Состояние сбрасывается со сменой
// черновика (key = id черновика).
function DraftBlock({ draft, draftTable, onEdit, busy, onStart, onDelete }) {
  const [invalid, setInvalid] = useState(() => new Set());
  const [inFlight, setInFlight] = useState(0);

  const guard = useMemo(() => ({
    report: (id, hasError) => setInvalid((prev) => {
      if (prev.has(id) === hasError) return prev;
      const next = new Set(prev);
      if (hasError) next.add(id); else next.delete(id);
      return next;
    }),
  }), []);

  const guardedEdit = (...args) => {
    setInFlight((n) => n + 1);
    return onEdit(...args).finally(() => setInFlight((n) => n - 1));
  };

  const blocked = busy || invalid.size > 0 || inFlight > 0;

  return (
    <DraftGuardContext.Provider value={guard}>
      <div className={styles.block}>
        <h2 className={styles.sectionTitle}>
          {ADMIN_LABELS.draftTitle}: {draft.season_title || ADMIN_LABELS.noSeason}
        </h2>
        <p className={styles.muted}>{ADMIN_LABELS.draftNote}</p>
        {draftTable && (
          <>
            <DraftParams summary={draftTable.set} onEdit={guardedEdit} />
            <SetSummary summary={draftTable.set} />
            <AssignmentTable view={draftTable} editable onEdit={guardedEdit} />
          </>
        )}
        <div className={styles.actionsRow}>
          <button className={styles.btnPrimary} onClick={onStart} disabled={blocked}>
            {ADMIN_LABELS.startCollecting}
          </button>
          <button className={styles.btnDanger} onClick={onDelete} disabled={blocked}>
            {ADMIN_LABELS.deleteDraft}
          </button>
        </div>
        {(invalid.size > 0 || inFlight > 0) && (
          <p className={styles.blockedNote}>{ADMIN_LABELS.draftBlocked}</p>
        )}
      </div>
    </DraftGuardContext.Provider>
  );
}

function AdminPage() {
  const dispatch = useDispatch();
  const isAdmin = useSelector((s) => s.auth.isAdmin);
  const catalog = useSelector((s) => s.settings.catalog);
  const { overview, activeView, draftView, busy, error } = useSelector((s) => s.admin);
  const [selected, setSelected] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const combo = selected || defaultCombo(catalog);
  const key = combo ? comboKey(combo) : null;

  useEffect(() => {
    if (isAdmin) dispatch(fetchCatalog());
  }, [isAdmin, dispatch]);

  useEffect(() => {
    if (!isAdmin || !key) return;
    const [category, marketplace, geo] = key.split('|');
    dispatch(fetchOverview({ category, marketplace, geo }));
  }, [isAdmin, key, dispatch]);

  const draftId = overview?.draft?.id ?? null;
  useEffect(() => {
    if (draftId) dispatch(fetchDraftView(draftId));
  }, [draftId, dispatch]);

  // пока идёт сбор, ход сбора и готовность обновляются раз в минуту
  const collectingId = overview?.collecting?.id ?? null;
  useEffect(() => {
    if (!collectingId || !key) return undefined;
    const [category, marketplace, geo] = key.split('|');
    const timer = setInterval(
      () => dispatch(fetchOverview({ category, marketplace, geo })), PROGRESS_REFRESH_MS,
    );
    return () => clearInterval(timer);
  }, [collectingId, key, dispatch]);

  const reloadOverview = () => {
    if (combo) dispatch(fetchOverview(combo));
  };
  const onEdit = (action, ...args) => dispatch(editDraft({ action, args })).unwrap();

  const active = overview?.active;
  const draft = overview?.draft;
  const collecting = overview?.collecting;
  const activeTable = active && activeView?.set.id === active.id ? activeView : null;
  const draftTable = draft && draftView?.set.id === draft.id ? draftView : null;

  const toggleTable = () => {
    if (!showTable && active && !activeTable) dispatch(fetchActiveView(active.id));
    setShowTable((v) => !v);
  };

  const handleNewDraft = () => {
    if (window.confirm(confirmNewDraft(active.season_title))) {
      dispatch(createDraft(active.id)).then(reloadOverview);
    }
  };
  const handleStart = () => {
    if (window.confirm(confirmStartCollecting(draft, active?.season_title))) {
      dispatch(startCollecting(draft.id)).then(reloadOverview);
    }
  };
  const handleDeleteDraft = () => {
    if (window.confirm(confirmDeleteDraft(draft.season_title))) {
      dispatch(removeDraft(draft.id)).then(reloadOverview);
    }
  };

  const content = () => {
    if (isAdmin === null) return null;
    if (!isAdmin) return <p className={styles.muted}>{ADMIN_LABELS.noAccess}</p>;
    return (
      <>
        <div className={styles.combos}>
          {catalog.map((c) => (
            <button
              key={comboKey(c)}
              className={`${styles.segBtn} ${key === comboKey(c) ? styles.active : ''}`}
              onClick={() => {
                setSelected(c);
                setShowTable(false);
              }}
            >
              {comboLabel(c)}
            </button>
          ))}
        </div>

        {error !== null && <p className={styles.errorNote}>{adminErrorText(error)}</p>}

        {overview && !draft && (
          <div className={styles.block}>
            <h2 className={styles.sectionTitle}>{ADMIN_LABELS.activeTitle}</h2>
            {active ? (
              <>
                <SetSummary summary={active} />
                <div className={styles.actionsRow}>
                  <button className={styles.btnSecondary} onClick={toggleTable}>
                    {showTable ? ADMIN_LABELS.hideSet : ADMIN_LABELS.showSet}
                  </button>
                  {overview.seasonal_switch && !collecting && (
                    <button className={styles.btnPrimary} onClick={handleNewDraft} disabled={busy}>
                      {ADMIN_LABELS.newDraft}
                    </button>
                  )}
                </div>
                {!overview.seasonal_switch && (
                  <p className={styles.muted}>{ADMIN_LABELS.noSeasonalSwitch}</p>
                )}
                {showTable && activeTable && <AssignmentTable view={activeTable} />}
              </>
            ) : (
              <p className={styles.muted}>{ADMIN_LABELS.noActive}</p>
            )}
          </div>
        )}

        {collecting && (
          <CollectingProgress summary={collecting} progress={overview.progress} />
        )}

        {draft && (
          <DraftBlock
            key={draft.id}
            draft={draft}
            draftTable={draftTable}
            onEdit={onEdit}
            busy={busy}
            onStart={handleStart}
            onDelete={handleDeleteDraft}
          />
        )}
      </>
    );
  };

  return (
    <div>
      <Header />
      <ProtectedRoute>
        <div className={styles.pageWrap}>
          <h1 className={styles.pageTitle}>{ADMIN_LABELS.pageTitle}</h1>
          {content()}
        </div>
      </ProtectedRoute>
    </div>
  );
}

export default AdminPage;