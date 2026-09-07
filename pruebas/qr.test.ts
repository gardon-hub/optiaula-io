/**
 * Prueba de los códigos QR de las actividades.
 *
 * Un QR mal generado no falla ruidosamente: se ve exactamente igual que uno
 * bueno y solo se descubre cuando treinta estudiantes apuntan el teléfono a la
 * pared y no pasa nada. Así que aquí no se comprueba que el SVG exista, sino que
 * **decodifica la dirección correcta**: se dibuja el código en un lienzo y se lee
 * con un decodificador independiente del que lo generó.
 */

import { describe, expect, it } from 'vitest';
import jsQR from 'jsqr';

import { svgDe } from '../herramientas/moodle/qr.mts';

/**
 * Convierte el SVG del código en la matriz de píxeles que espera el decodificador.
 *
 * El SVG que produce la librería es un camino de rectángulos sobre una rejilla de
 * módulos, así que en vez de rasterizarlo con un navegador se lee la rejilla
 * directamente: cada módulo se expande a un bloque de píxeles.
 */
function aPixeles(svg: string, escala = 4): { datos: Uint8ClampedArray; ancho: number; alto: number } {
  const vb = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  if (vb === null) throw new Error('El SVG no declara viewBox');
  const modulos = Number(vb[1]);

  const camino = /<path[^>]*stroke="[^"]*"[^>]*d="([^"]*)"/.exec(svg) ?? /d="([^"]*)"/.exec(svg);
  if (camino === null) throw new Error('El SVG no trae el camino de los módulos');

  /*
   * El camino es una sola cadena con tres comandos entremezclados: `M x y` sitúa
   * el lápiz al principio de una fila, `h n` pinta n módulos oscuros seguidos y
   * `m dx dy` salta los claros sin pintar. Hay que recorrerlos **en orden**: leer
   * solo los `M…h…` —como hacía la primera versión de esta prueba— deja fuera
   * todo lo que va después del primer salto de cada fila, y el código resultante
   * no decodifica.
   */
  const oscuros = new Set<string>();
  let x = 0;
  let y = 0;
  for (const t of camino[1]!.matchAll(/([Mmh])(-?[\d.]+)(?: (-?[\d.]+))?/g)) {
    const [, mando, a, b] = t;
    if (mando === 'M') {
      x = Number(a);
      y = Number(b);
    } else if (mando === 'm') {
      x += Number(a);
      y += Number(b);
    } else {
      const largo = Math.round(Number(a));
      const fila = Math.floor(y);
      for (let i = 0; i < largo; i++) oscuros.add(`${Math.round(x) + i}:${fila}`);
      x += largo;
    }
  }

  const lado = modulos * escala;
  const datos = new Uint8ClampedArray(lado * lado * 4);
  for (let py = 0; py < lado; py++) {
    for (let px = 0; px < lado; px++) {
      const oscuro = oscuros.has(`${Math.floor(px / escala)}:${Math.floor(py / escala)}`);
      const v = oscuro ? 0 : 255;
      const i = (py * lado + px) * 4;
      datos[i] = v;
      datos[i + 1] = v;
      datos[i + 2] = v;
      datos[i + 3] = 255;
    }
  }
  return { datos, ancho: lado, alto: lado };
}

const decodificar = (svg: string): string | null => {
  const { datos, ancho, alto } = aPixeles(svg);
  return jsQR(datos, ancho, alto)?.data ?? null;
};

const DIRECCIONES = [
  'https://gardon-hub.github.io/optiaula-io/actividades/perfil/',
  'https://gardon-hub.github.io/optiaula-io/actividades/sistemas/',
  'https://gardon-hub.github.io/optiaula-io/',
];

describe('los códigos QR llevan a donde dicen', () => {
  for (const url of DIRECCIONES) {
    it(`decodifica ${url}`, async () => {
      const leido = decodificar(await svgDe(url));
      expect(leido).toBe(url);
    });
  }

  it('el decodificador no da por bueno un código alterado', () => {
    // Si esta prueba pasara con el código roto, las anteriores no probarían nada.
    const roto = '<svg viewBox="0 0 25 25"><path d="M0 0h25M0 1h25" fill="#1b1d22"/></svg>';
    expect(decodificar(roto)).toBeNull();
  });

  it('usa corrección de errores alta, que es lo que aguanta una proyección', async () => {
    // Con nivel Q el código es más denso que con L. Se comprueba por el tamaño
    // de la rejilla: si alguien bajara el nivel, el código encogería.
    const svg = await svgDe(DIRECCIONES[0]!);
    const lado = Number(/viewBox="0 0 (\d+)/.exec(svg)![1]);
    expect(lado).toBeGreaterThanOrEqual(41);
  });
});
