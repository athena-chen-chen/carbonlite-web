import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Test-only source mapping; supports independently located reviewed API checkouts.
const apiSourceDir = resolve(process.env.CARBONLITE_API_SOURCE_DIR ?? process.env.CARBONLITE_API_DIR ?? '../carbonlite-api');

export default defineConfig({
  resolve: { alias: [{ find: /^\.\.\/\.\.\/\.\.\/carbonlite-api\//, replacement: `${apiSourceDir}/` },
    { find: /^@prisma\/client$/, replacement: resolve(process.env.CARBONLITE_API_DIR ?? apiSourceDir, 'node_modules/@prisma/client/default.js') }] },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['apps/web-e2e/**', 'scripts/**/*.test.mjs', 'node_modules/**', 'dist/**'],
  },
});
