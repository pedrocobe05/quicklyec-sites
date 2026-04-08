import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PublicNotificationProvider } from './shared/notifications/notification-context';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PublicNotificationProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PublicNotificationProvider>
  </React.StrictMode>,
);
