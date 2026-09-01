/**
 * Genera los iconos PNG de la PWA sin dependencias externas.
 *
 * Dibuja la marca provisional —un gráfico de línea quebrada sobre fondo azul
 * profundo, con un punto ámbar en el vértice más alto— y la codifica como PNG
 * usando solo `zlib` de Node. Se ejecuta con `npm run iconos`.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const PUBLICO = resolve(AQUI, '..', 'public');

const AZUL = [0x12, 0x3a, 0x5e];
const BLANCO = [0xff, 0xff, 0xff];
const AMBAR = [0xb7, 0x79, 0x1f];

/** CRC-32, necesario para cada trozo del PNG. */
const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const b of buffer) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

function codificarPNG(ancho, alto, pixeles) {
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 6; // color RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Cada fila lleva un byte de filtro al inicio; se usa filtro 0 (ninguno).
  const crudo = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y++) {
    const inicioFila = y * (ancho * 4 + 1);
    crudo[inicioFila] = 0;
    pixeles.copy(crudo, inicioFila + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }

  return Buffer.concat([
    firma,
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

/** Distancia de un punto al segmento AB; sirve para dibujar trazos con grosor. */
function distanciaASegmento(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const largo2 = dx * dx + dy * dy;
  const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function dibujar(tamano, { conMargen }) {
  const pixeles = Buffer.alloc(tamano * tamano * 4);
  const escala = tamano / 30;

  // En la versión maskable el arte se reduce para dejar la zona segura.
  const margen = conMargen ? tamano * 0.12 : 0;
  const util = tamano - margen * 2;
  const aLienzo = (v) => margen + (v / 30) * util;

  const radio = conMargen ? 0 : 7 * escala;
  const vertices = [
    [7, 21],
    [11.5, 12.5],
    [15.5, 17.5],
    [19, 9],
    [23, 21],
  ].map(([x, y]) => [aLienzo(x), aLienzo(y)]);

  const grosor = Math.max(1.6, 2 * escala * (conMargen ? util / tamano : 1));
  const puntoAmbar = [aLienzo(19), aLienzo(9)];
  const radioAmbar = 2.4 * escala * (conMargen ? util / tamano : 1);

  for (let y = 0; y < tamano; y++) {
    for (let x = 0; x < tamano; x++) {
      const i = (y * tamano + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;

      // Fondo: rectángulo redondeado (o cuadrado completo en la versión maskable).
      let dentro = true;
      if (radio > 0) {
        const dx = Math.max(radio - cx, 0, cx - (tamano - radio));
        const dy = Math.max(radio - cy, 0, cy - (tamano - radio));
        dentro = Math.hypot(dx, dy) <= radio;
      }

      if (!dentro) {
        pixeles[i + 3] = 0;
        continue;
      }

      let color = AZUL;

      // Línea quebrada blanca.
      let distanciaMinima = Infinity;
      for (let k = 0; k + 1 < vertices.length; k++) {
        const [ax, ay] = vertices[k];
        const [bx, by] = vertices[k + 1];
        distanciaMinima = Math.min(distanciaMinima, distanciaASegmento(cx, cy, ax, ay, bx, by));
      }
      if (distanciaMinima <= grosor / 2) color = BLANCO;

      // Punto ámbar en el vértice más alto.
      if (Math.hypot(cx - puntoAmbar[0], cy - puntoAmbar[1]) <= radioAmbar) color = AMBAR;

      pixeles[i] = color[0];
      pixeles[i + 1] = color[1];
      pixeles[i + 2] = color[2];
      pixeles[i + 3] = 255;
    }
  }

  return codificarPNG(tamano, tamano, pixeles);
}

mkdirSync(PUBLICO, { recursive: true });

const salidas = [
  ['icono-192.png', 192, { conMargen: false }],
  ['icono-512.png', 512, { conMargen: false }],
  ['icono-maskable-512.png', 512, { conMargen: true }],
  ['apple-touch-icon.png', 180, { conMargen: false }],
];

for (const [nombre, tamano, opciones] of salidas) {
  writeFileSync(resolve(PUBLICO, nombre), dibujar(tamano, opciones));
  console.log(`${nombre} — ${tamano}×${tamano}`);
}

// Favicon vectorial, idéntico al logotipo de la barra superior.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
  <rect width="30" height="30" rx="7" fill="#123a5e"/>
  <path d="M7 21 L11.5 12.5 L15.5 17.5 L19 9 L23 21" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="19" cy="9" r="2.4" fill="#b7791f"/>
</svg>
`;
writeFileSync(resolve(PUBLICO, 'favicon.svg'), favicon, 'utf8');
console.log('favicon.svg');
