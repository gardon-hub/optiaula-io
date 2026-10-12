import { defineConfig } from 'vitest/config';
import type { PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

/*
 * Compilación por alcance: la misma base de código produce la aplicación
 * completa o una copia de un solo módulo. Lo decide `VITE_TEMAS`, que
 * `config/alcance.ts` lee del lado del navegador y aquí sirve para darle a cada
 * copia su propia carpeta, su propio nombre instalable y su propio icono.
 *
 *   npm run build                       → los trece módulos, en dist/
 *   npm run build:equilibrio            → solo el módulo 5, en dist/equilibrio/
 */
const TEMAS_PEDIDOS = (process.env['VITE_TEMAS'] ?? '').trim();
const esParcial = TEMAS_PEDIDOS !== '';

/** Nombre instalable de cada copia parcial. Sin entrada, cae a uno genérico. */
const NOMBRES_PARCIALES: Readonly<Record<string, { nombre: string; corto: string; descripcion: string }>> = {
  equilibrio: {
    nombre: 'Punto de equilibrio — OPTIAULA IO',
    corto: 'Punto de equilibrio',
    descripcion:
      'Laboratorio de punto de equilibrio: un producto y multiproducto, comisiones, valor de recuperación, ' +
      'utilidad objetivo y margen de seguridad. Universidad Nacional de Agricultura.',
  },
};

const PARCIAL = NOMBRES_PARCIALES[TEMAS_PEDIDOS] ?? {
  nombre: `OPTIAULA IO — ${TEMAS_PEDIDOS}`,
  corto: 'OPTIAULA IO',
  descripcion: 'Laboratorio educativo de Investigación de Operaciones.',
};

/**
 * Las actividades sueltas de `/actividades/` se generan dentro de `public/`, así
 * que Vite las copia a **toda** compilación. En una copia por módulo no pintan
 * nada: son del módulo 1 y quedarían accesibles bajo `/equilibrio/actividades/`,
 * duplicadas y en el sitio equivocado. Se retiran al terminar.
 */
function sinActividadesAjenas(): PluginOption {
  return {
    name: 'optiaula-sin-actividades-ajenas',
    apply: 'build',
    async closeBundle() {
      if (!esParcial) return;
      await rm(join(process.cwd(), 'dist', TEMAS_PEDIDOS, 'actividades'), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  base: './',
  build: esParcial ? { outDir: `dist/${TEMAS_PEDIDOS}` } : {},
  plugins: [
    react(),
    tailwindcss(),
    sinActividadesAjenas(),
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
         *
         * Las copias por módulo de `/equilibrio/` están igual de fuera: son
         * aplicaciones propias, con su service worker y su manifiesto. Sin la
         * exclusión, la aplicación completa se las tragaría en cuanto el
         * estudiante hubiera visitado el sitio grande alguna vez.
         *
         * La exclusión de las copias por módulo solo la pone la aplicación
         * completa. Si la copia se excluyera a sí misma, su propio respaldo de
         * navegación no respondería a su propia dirección y **sin conexión no
         * abriría**, que es justo lo que una copia instalable tiene que hacer.
         */
        navigateFallbackDenylist: esParcial ? [/\/actividades\//] : [/\/actividades\//, /\/equilibrio\//],
      },
      manifest: {
        name: esParcial ? PARCIAL.nombre : 'OPTIAULA IO — Laboratorio Interactivo de Investigación de Operaciones',
        short_name: esParcial ? PARCIAL.corto : 'OPTIAULA IO',
        description: esParcial
          ? PARCIAL.descripcion
          : 'Laboratorio educativo de Investigación de Operaciones: productividad, localización, distribución física, punto de equilibrio, CPM, PERT, asignación y transporte.',
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
