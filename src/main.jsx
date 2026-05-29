import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initAdapter } from './utils/storageAdapter';
import './index.css';
import App from './App.jsx';

initAdapter().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
