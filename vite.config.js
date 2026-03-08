import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/scts-192.png','icons/scts-512.png'],
      manifest: {
        name: 'SCTS',
        short_name: 'SCTS',
        description: 'Sistema de Controle de Tripulação e Segurança (offline)',
        theme_color: '#0B3D91',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/scts-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/scts-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        navigateFallback: '/index.html'
      }
    })
  ],
  server: { port: 5173, host: true }
});
