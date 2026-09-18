// ---------- Настройки дашборда: категория/маркетплейс/гео + период просмотра ----------
import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    category: null,
    marketplace: null,
    geo: null,
    period: 'month', // month | halfyear | year | custom
    customFrom: '',
    customTo: '',
  },
  reducers: {
    setSelection: (state, action) => {
      state.category = action.payload.category;
      state.marketplace = action.payload.marketplace;
      state.geo = action.payload.geo;
    },
    setPeriod: (state, action) => {
      state.period = action.payload;
    },
    setCustomRange: (state, action) => {
      state.customFrom = action.payload.from;
      state.customTo = action.payload.to;
    },
  },
});

export const { setSelection, setPeriod, setCustomRange } = dashboardSlice.actions;
export default dashboardSlice.reducer;