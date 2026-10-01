// ---------- Настройки дашборда: категория/маркетплейс/гео + период просмотра ----------
// Выбор сохраняется в localStorage: после перезагрузки открывается тот же дашборд.
// Сверку с подписками (связку могли удалить) делает DashboardControls.
import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'dashboard';

const DEFAULTS = {
  category: null,
  marketplace: null,
  geo: null,
  period: 'month', // month | halfyear | year | custom
  customFrom: '',
  customTo: '',
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? { ...DEFAULTS, ...saved } : DEFAULTS;
  } catch {
    return DEFAULTS; // запись повреждена - начинаем с умолчаний
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: state.category,
      marketplace: state.marketplace,
      geo: state.geo,
      period: state.period,
      customFrom: state.customFrom,
      customTo: state.customTo,
    }));
  } catch {
    // хранилище недоступно - выбор просто не переживёт перезагрузку
  }
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: loadState(),
  reducers: {
    setSelection: (state, action) => {
      state.category = action.payload.category;
      state.marketplace = action.payload.marketplace;
      state.geo = action.payload.geo;
      saveState(state);
    },
    setPeriod: (state, action) => {
      state.period = action.payload;
      saveState(state);
    },
    setCustomRange: (state, action) => {
      state.customFrom = action.payload.from;
      state.customTo = action.payload.to;
      saveState(state);
    },
  },
});

export const { setSelection, setPeriod, setCustomRange } = dashboardSlice.actions;
export default dashboardSlice.reducer;