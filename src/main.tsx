
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './auth/AuthProvider'; // from earlier step

import './index.css';


const qc = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <AuthProvider>
        
      
      <ToastProvider>
     
        <App />
      </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
