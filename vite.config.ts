import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['mac-mini'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) return 'firebase';
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'chartjs';
            if (id.includes('@dnd-kit')) return 'dnd-kit';
            return 'vendor';
          }
        },
      },
    },
  },
});
