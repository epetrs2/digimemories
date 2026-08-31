import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteEmailPlugin } from './server/viteEmailPlugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteEmailPlugin()],
})

