// ---------- Авторизация: токен пользователя, сохраняется между перезагрузками ----------
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getMe } from '../../services/api';

// После повторного открытия вкладки токен есть (localStorage), а имени нет.
// Восстанавливаем его по /auth/me; статус ошибки нужен, чтобы отличить отказ от недоступности.
export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      return await getMe();
    } catch (err) {
      return rejectWithValue(err?.response?.status ?? null);
    }
  },
);

const clearAuth = (state) => {
  state.token = null;
  state.username = null;
  state.isAdmin = false;
  localStorage.removeItem('token');
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: localStorage.getItem('token') || null,
    username: null,
    // администратор (управление сетами); null - токен есть, /auth/me ещё не ответил
    isAdmin: localStorage.getItem('token') ? null : false,
  },
  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.isAdmin = Boolean(action.payload.isAdmin);
      localStorage.setItem('token', action.payload.token);
    },
    logOut: clearAuth,
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.username = action.payload.username;
        state.isAdmin = Boolean(action.payload.is_admin);
      })
      .addCase(restoreSession.rejected, (state, action) => {
        // 401 - токен истёк или недействителен: выходим. Сервер недоступен - токен не трогаем.
        if (action.payload === 401) clearAuth(state);
      });
  },
});

export const { setCredentials, logOut } = authSlice.actions;
export default authSlice.reducer;

export const selectIsLoggedIn = (state) => Boolean(state.auth.token);