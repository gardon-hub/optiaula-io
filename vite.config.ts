import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icono-192.png', 'icono-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        /*
         * Las actividades sueltas de `/actividades/` son páginas propias, no
         * rutas de la aplicación. Sin esta exclusión, el respaldo de navegación
         * del service worker devolvía `index.html` —la aplicación entera— a
         * quien abriera la dirección terminada en barra, que es justamente la
         * forma en que se comparte el enlace. Solo le pasaba a quien ya hubiera
         * visitado el sitio y tuviera el service worker instalado, que es el
         * caso de los estudiantes a los que se les manda.
         */
        navigateFallbackDenylist: [/\/actividades\//],
      },
      manifest: {
        name: 'OPTIAULA IO — Laboratorio Interactivo de Investigación de Operaciones',
        short_name: 'OPTIAULA IO',
        description:
          'Laboratorio educativo de Investigación de Operaciones: productividad, localización, distribución física, punto de equilibrio, CPM, PERT, asignación y transporte.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#faf8f4',
        theme_color: '#123a5e',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['pruebas/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['pruebas/e2e/**', 'node_modules/**'],
  },
});
