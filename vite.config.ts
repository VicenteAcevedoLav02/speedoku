import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base so assets resolve under /speedoku/ on GitHub Pages
// and also when opening nested paths.
export default defineConfig({
  base: './',
  plugins: [react()],
})
