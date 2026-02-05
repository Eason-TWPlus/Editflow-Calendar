import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Editflow-Calendar/',  // 👈 加上這一行！(你的專案名稱)
})
