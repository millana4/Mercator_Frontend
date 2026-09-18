// ---------- Redux-стор ----------
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import dashboardReducer from './slices/dashboardSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    auth: authReducer,
    settings: settingsReducer,
    dashboard: dashboardReducer,
  },
});