import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, API calls to /api go to the server started with `npm run local` (or `npm start`).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
