import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router-dom/')) {
            return 'vendor-react';
          }

          if (id.includes('/html2canvas/')) {
            return 'vendor-html2canvas';
          }

          if (id.includes('/jspdf/') || id.includes('/jspdf-autotable/')) {
            return 'vendor-pdf';
          }

          if (id.includes('/xlsx/')) {
            return 'vendor-spreadsheet';
          }

          if (id.includes('/@sentry/')) {
            return 'vendor-monitoring';
          }

          if (id.includes('/posthog-js/')) {
            return 'vendor-analytics';
          }

          return undefined;
        },
      },
    },
  },
  server: {
     host: true,
    port: 5173,
    proxy: {
      
      // proxy API requests during dev to your Nest server on 3333
      '/api': 'http://localhost:3333',
    },
      hmr: {
      overlay: false,
    },
  },
});
