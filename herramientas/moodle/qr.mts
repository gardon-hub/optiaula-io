/**
 * Códigos QR de las actividades, para proyectar en clase.
 *
 * El QR no se dibuja a mano: se genera con `qrcode`, que es una dependencia de
 * desarrollo y no llega al estudiante. Lo que se publica es un SVG estático, sin
 * ninguna llamada a un servicio externo —un QR generado por una API dejaría de
 * funcionar el día que el aula no tenga internet, que es justo cuando hace
 * falta—.
 *
 * La corrección de errores va en nivel **Q** (25 %), no en el mínimo. En una
 * proyección el código se lee de lejos, con la imagen deformada por el ángulo
 * del cañón y a veces con la sombra de alguien encima: el margen extra es lo
 * que hace que se lea igual desde la última fila.
 */

import QRCode from 'qrcode';

import { esc } from './comun.mts';

export interface Destino {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly url: string;
}

/** Devuelve el SVG del código, sin envoltura de documento. */
export async function svgDe(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    margin: 2,
    color: { dark: '#1b1d22', light: '#ffffff' },
  });
  // La librería emite su propio ancho y alto fijos; se quitan para que el código
  // se estire con el contenedor y llene la pantalla al proyectar.
  return svg
    .replace(/<\?xml[^>]*\?>/, '')
    .replace(/width="[^"]*"/, '')
    .replace(/height="[^"]*"/, '')
    .replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"')
    .trim();
}

/**
 * Página para proyectar: un código a la vez, lo más grande que quepa.
 *
 * Se muestra uno solo porque en clase se proyecta la actividad que toca; una
 * cuadrícula con todos obliga al estudiante a averiguar cuál escanear. La
 * dirección va escrita debajo y en grande: si alguien no puede escanear —el
 * teléfono sin cámara, sin permiso, o el código deformado— tiene que poder
 * escribirla.
 */
export async function paginaQR(destinos: readonly Destino[]): Promise<string> {
  const codigos = await Promise.all(destinos.map((d) => svgDe(d.url)));

  const laminas = destinos
    .map(
      (d, i) => `    <section class="lamina${i === 0 ? ' activa' : ''}" data-indice="${i}" aria-label="${esc(d.nombre)}">
      <p class="eyebrow">Investigación de Operaciones · Universidad Nacional de Agricultura</p>
      <h1>${esc(d.nombre)}</h1>
      <p class="bajada">${esc(d.descripcion)}</p>
      <div class="codigo">${codigos[i]}</div>
      <p class="url">${esc(d.url.replace(/^https:\/\//, ''))}</p>
    </section>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Códigos QR de las actividades — OPTIAULA IO</title>
<style>
  /*
   * Pensada para un cañón de proyección: fondo blanco y tinta casi negra, que es
   * lo que mejor resiste una sala con luz. Sin modo oscuro a propósito —un fondo
   * oscuro proyectado se lava y el código deja de leerse—, y sin tipografías
   * externas, porque el aula puede no tener internet.
   */
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: #ffffff;
    color: #1b1d22;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    display: flex;
    flex-direction: column;
  }
  main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 2vmin; min-height: 0; }

  .lamina { display: none; flex-direction: column; align-items: center; gap: 1.2vmin; max-height: 100%; }
  .lamina.activa { display: flex; }

  .eyebrow {
    margin: 0; font-size: clamp(11px, 1.4vmin, 20px); font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #767d88; text-align: center;
  }
  h1 {
    margin: 0; text-align: center; line-height: 1.1;
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    font-size: clamp(20px, 4.4vmin, 64px);
  }
  .bajada {
    margin: 0; text-align: center; color: #4d545f; max-width: 46ch;
    font-size: clamp(12px, 2vmin, 26px);
  }
  /*
   * El cuadrado se dimensiona desde el viewport y el SVG lo llena. Se hace así y
   * no dejando que crezca como elemento flexible porque al SVG se le quitaron el
   * ancho y el alto para que escalara: sin tamaño intrínseco, dentro de un
   * contenedor flexible colapsaba a cero y el código no se veía.
   */
  .codigo { width: min(58vmin, 88vw); aspect-ratio: 1; }
  .codigo svg { display: block; width: 100%; height: 100%; }
  .url {
    margin: 0; font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
    font-size: clamp(13px, 2.4vmin, 34px); font-weight: 600;
    word-break: break-all; text-align: center;
  }

  .barra {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
    gap: .6rem; padding: 1vmin 2vmin 2vmin;
  }
  .boton {
    font: inherit; font-size: clamp(12px, 1.8vmin, 18px); font-weight: 700; cursor: pointer;
    padding: .5rem 1rem; border-radius: .4rem; border: 1px solid #c9c2b4;
    background: #ffffff; color: #1b1d22; min-height: 2.75rem;
  }
  .boton[aria-pressed="true"] { background: #123a5e; color: #fff; border-color: #123a5e; }
  .boton:focus-visible { outline: 3px solid #123a5e; outline-offset: 2px; }
  .pista { width: 100%; text-align: center; color: #767d88; font-size: clamp(10px, 1.4vmin, 15px); }

  /* Al imprimir sale una hoja por código, para pegarlo en el aula. */
  @media print {
    .barra { display: none; }
    .lamina { display: flex !important; page-break-after: always; height: 100vh; }
  }
</style>
</head>
<body>
<main>
${laminas}
</main>

<div class="barra">
${destinos.map((d, i) => `  <button type="button" class="boton" data-ir="${i}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(d.nombre)}</button>`).join('\n')}
  <p class="pista">Flechas ← → para cambiar · F para pantalla completa · Ctrl+P imprime una hoja por código</p>
</div>

<script>
"use strict";
var laminas = document.querySelectorAll('.lamina');
var botones = document.querySelectorAll('[data-ir]');
var actual = 0;

function mostrar(i) {
  actual = (i + laminas.length) % laminas.length;
  for (var n = 0; n < laminas.length; n++) laminas[n].className = 'lamina' + (n === actual ? ' activa' : '');
  for (var b = 0; b < botones.length; b++) botones[b].setAttribute('aria-pressed', b === actual ? 'true' : 'false');
}

for (var b = 0; b < botones.length; b++) {
  (function (indice) {
    botones[indice].addEventListener('click', function () { mostrar(indice); });
  })(b);
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); mostrar(actual + 1); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); mostrar(actual - 1); }
  else if (e.key === 'f' || e.key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }
});
</script>
</body>
</html>
`;
}
