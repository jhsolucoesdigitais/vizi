import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(), 
        
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          
          // ── 1. RESTAURAMOS O MANIFESTO BASE (COMO NO SENSEI) ──
          manifest: {
            name: 'VIZI | Vendas e Serviços',
            short_name: 'VIZI',
            description: 'A plataforma completa de vendas do seu condomínio.',
            theme_color: '#ffffff',
            background_color: '#f8fafc',
            display: 'standalone',
            start_url: '/',
            icons: [
              {
                src: '/assets/logo.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          },
          workbox: {
            navigateFallback: '/index.html',
            navigateFallbackAllowlist: [/^(?!\/__).*/] 
          },
          devOptions: {
            enabled: true 
          }
        })
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './'),
        },
      },
    };
});