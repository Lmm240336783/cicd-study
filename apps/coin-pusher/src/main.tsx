import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './style.css';
import { App } from './App';

createRoot(document.querySelector('#app')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
