import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // Vercel serve na raiz; o GitHub Pages (demo antiga) continua no subcaminho
  base: process.env.VERCEL ? '/' : '/navis-com-voce-mockup/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
