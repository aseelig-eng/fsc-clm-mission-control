import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for GitHub Pages project site:
  // https://aseelig-eng.github.io/fsc-clm-mission-control/
  base: '/fsc-clm-mission-control/',
})
