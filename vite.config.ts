import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/teleparty-socket/', // Replace <your-repo-name> with the name of your GitHub repository
})
