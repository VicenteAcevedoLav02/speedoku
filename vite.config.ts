import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Project Pages URL: https://vicenteacevedolav02.github.io/speedoku/
  base: process.env.VITE_BASE ?? '/speedoku/',
  plugins: [react()],
})
