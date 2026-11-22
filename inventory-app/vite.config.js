import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Built into ../inventory so GitHub Pages serves it at /inventory/ on the website.
export default defineConfig({
  plugins: [react()],
  base: '/inventory/',
  build: { outDir: '../inventory', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    css: false,
  },
})
