// ---------- Временная проверка темы — заменится роутингом и Header на следующих шагах ----------
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from './store/slices/themeSlice';
import './App.css';

function App() {
  const theme = useSelector((state) => state.theme.value);
  const dispatch = useDispatch();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <div style={{ padding: 24 }}>
      <p>Текущая тема: {theme}</p>
      <button onClick={() => dispatch(setTheme('light'))}>Светлая</button>
      <button onClick={() => dispatch(setTheme('dark'))}>Тёмная</button>
    </div>
  );
}

export default App;