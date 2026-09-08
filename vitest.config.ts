import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // e2e/**: specs do Playwright, rodam com `npm run test:e2e`, não com vitest
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
