import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    host: '0.0.0.0',
    allowedHosts: ['professor-ax-pro.onrender.com', 'ax-pro.tecace.com', 'localhost', '127.0.0.1']
  }
})
