import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GameProvider } from './context/GameContext';
import { ToastProvider } from './components/common/Toast';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GameProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GameProvider>
  </React.StrictMode>,
);
