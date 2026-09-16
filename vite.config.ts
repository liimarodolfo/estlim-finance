import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // injectManifest em vez de generateSW: o service worker e escrito a mao em
      // src/sw.ts, porque push precisa de handler proprio e o gerado nao aceita.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      includeAssets: ['icone.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ESTLIM · Planejamento Financeiro',
        short_name: 'ESTLIM',
        description: 'Planejamento e controle financeiro do casal.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#12a06e',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Formato classico, nao modulo ES. Service worker como modulo tem
        // suporte irregular, e o Safari, que e justamente o alvo do push aqui,
        // recusa registrar.
        rollupFormat: 'iife',
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa o que quase nunca muda do codigo do app, para a atualizacao do
        // service worker baixar so o pedaco que mudou de verdade.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          dados: ['@tanstack/react-query', '@tanstack/react-query-persist-client'],
        },
      },
    },
  },
  server: { port: 5173 },
})
