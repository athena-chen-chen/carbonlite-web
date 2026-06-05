
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './auth/AuthProvider'; // from earlier step
import { AppErrorFallback } from './components/AppErrorFallback';
import { initSentry, SentryErrorBoundary } from './sentry';

import './index.css';

initSentry();

const qc = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SentryErrorBoundary fallback={<AppErrorFallback />}>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SentryErrorBoundary>
  </React.StrictMode>
);
