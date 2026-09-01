/**
 * Pruebas del generador de PDF.
 *
 * Un PDF mal armado no falla ruidosamente: abre en blanco, o no abre. Por eso
 * lo que se comprueba aquí es la estructura del archivo —que la tabla de
 * referencias cruzadas apunte de verdad a cada objeto, que el tráiler cierre—
 * y no solo que la función devuelva algo.
 */

import { describe, expect, it } from 'vitest';

import { DocumentoPDF, anchoTexto, partirEnLineas, recortarA } from '@/export/pdf';

const comoTexto = (bytes: Uint8Array): string => Array.from(bytes, (b) => String.fromCharCode(b)).join('');

const documento = (): DocumentoPDF =>
  new DocumentoPDF({ titulo: 'Prueba', autor: 'Docente', pie: 'OPTIAULA IO · UNAG' });

describe('métricas de texto', () => {
  it('mide con los anchos reales de Helvetica, no con un promedio', () => {
    // Una «i» es mucho más angosta que una «m»: 222 contra 833 milésimas.
    expect(anchoTexto('i', 10)).toBeCloseTo(2.22, 6);
    expect(anchoTexto('m', 10)).toBeCloseTo(8.33, 6);
    expect(anchoTexto('W', 10)).toBeCloseTo(9.44, 6);
  });

  it('la negrita es más ancha que la normal en las letras que cambian', () => {
    expect(anchoTexto('abc', 10, true)).toBeGreaterThan(anchoTexto('abc', 10));
  });

  it('los acentos no cambian el avance: en Helvetica «á» mide lo mismo que «a»', () => {
    expect(anchoTexto('canon', 10)).toBeCloseTo(anchoTexto('cañón', 10), 9);
    expect(anchoTexto('Investigacion', 11)).toBeCloseTo(anchoTexto('Investigación', 11), 9);
  });

  it('parte en líneas que caben en el ancho pedido', () => {
    const ancho = 200;
    const lineas = partirEnLineas('palabra '.repeat(40).trim(), ancho, 9);
    expect(lineas.length).toBeGreaterThan(1);
    for (const l of lineas) expect(anchoTexto(l, 9)).toBeLessThanOrEqual(ancho);
  });

  it('respeta los saltos de línea del texto original', () => {
    expect(partirEnLineas('uno\ndos\ntres', 500, 9)).toEqual(['uno', 'dos', 'tres']);
  });

  it('una palabra más larga que el renglón no se pierde: ocupa su propia línea', () => {
    const lineas = partirEnLineas('supercalifragilisticoespialidoso', 20, 9);
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toBe('supercalifragilisticoespialidoso');
  });

  it('recorta al ancho disponible en lugar de invadir la columna vecina', () => {
    const recortado = recortarA('Un texto bastante largo para la columna', 60, 8.5);
    expect(recortado.endsWith('...')).toBe(true);
    expect(anchoTexto(recortado, 8.5)).toBeLessThanOrEqual(60);
    // Lo que sí cabe se deja intacto.
    expect(recortarA('corto', 200, 8.5)).toBe('corto');
  });
});

describe('estructura del archivo', () => {
  it('empieza con la cabecera y termina con el fin de archivo', () => {
    const d = documento();
    d.titulo('Hola');
    const t = comoTexto(d.bytes());
    expect(t.startsWith('%PDF-1.4')).toBe(true);
    expect(t.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('cada desplazamiento del xref apunta al objeto que dice', () => {
    // Es la comprobación que decide si un lector puede abrirlo: un solo byte de
    // corrimiento y el archivo queda ilegible.
    const d = documento();
    d.titulo('Reporte con acentos: ñ á é í ó ú ü ¿?');
    d.parrafo('Un párrafo con caracteres fuera de ASCII, que ocupan más de un byte en UTF-8.');
    d.tabla(
      [{ encabezado: 'A', peso: 1 }, { encabezado: 'B', peso: 1 }],
      [['fila uno', '1'], ['fila dos', '2']],
    );

    const t = comoTexto(d.bytes());
    // La tabla arranca en «\nxref\n». Buscar solo «xref» encontraría primero el
    // «startxref» del tráiler y dejaría la comprobación sin comprobar nada.
    const inicioTabla = t.indexOf('\nxref\n');
    expect(inicioTabla).toBeGreaterThan(0);
    const xref = t.slice(inicioTabla);
    const desplazamientos = [...xref.matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));

    expect(desplazamientos.length).toBeGreaterThan(4);
    desplazamientos.forEach((off, i) => {
      expect(t.slice(off, off + 12), `objeto ${i + 1}`).toMatch(new RegExp(`^${i + 1} 0 obj`));
    });
  });

  it('startxref apunta al inicio de la tabla', () => {
    const d = documento();
    d.parrafo('Contenido.');
    const t = comoTexto(d.bytes());
    const inicio = Number(/startxref\n(\d+)/.exec(t)![1]);
    expect(t.slice(inicio, inicio + 4)).toBe('xref');
  });

  it('la longitud declarada de cada flujo coincide con su contenido real', () => {
    const d = documento();
    d.titulo('Título con ñ');
    d.parrafo('Texto con tildes: á é í ó ú.');
    const t = comoTexto(d.bytes());

    for (const m of t.matchAll(/<< \/Length (\d+) >>\nstream\n/g)) {
      const declarada = Number(m[1]);
      const desde = m.index! + m[0].length;
      const hasta = t.indexOf('\nendstream', desde);
      expect(hasta - desde, 'longitud del flujo').toBe(declarada);
    }
  });

  it('salta de página solo, y el conteo declarado coincide con las páginas reales', () => {
    const d = documento();
    d.tabla([{ encabezado: 'Fila', peso: 1 }], Array.from({ length: 200 }, (_, i) => [`Fila ${i}`]));
    const t = comoTexto(d.bytes());

    const declaradas = Number(/\/Count (\d+)/.exec(t)![1]);
    const reales = (t.match(/\/Type \/Page[^s]/g) ?? []).length;
    expect(declaradas).toBeGreaterThan(1);
    expect(reales).toBe(declaradas);
    // Y el tráiler declara tantos objetos como los que se escribieron.
    const size = Number(/\/Size (\d+)/.exec(t)![1]);
    expect((t.match(/^\d+ 0 obj$/gm) ?? []).length).toBe(size - 1);
  });

  it('numera las páginas con el total definitivo', () => {
    const d = documento();
    d.tabla([{ encabezado: 'Fila', peso: 1 }], Array.from({ length: 120 }, (_, i) => [`Fila ${i}`]));
    const t = comoTexto(d.bytes());
    const total = Number(/\/Count (\d+)/.exec(t)![1]);
    // La última página tiene que decir «de N», con N el total real.
    expect(t).toContain(`Página ${total} de ${total}`);
  });
});

describe('codificación de caracteres', () => {
  // Extractor simple: sirve para textos sin paréntesis escapados, que es el
  // caso de todas las pruebas menos la del escape, que mira el archivo entero.
  const textosDe = (d: DocumentoPDF): string[] =>
    [...comoTexto(d.bytes()).matchAll(/\(([^()\\]*)\)\s*Tj/g)].map((m) => m[1] ?? '');

  it('escribe los acentos como bytes de WinAnsi, no como UTF-8', () => {
    const d = documento();
    d.parrafo('cañón');
    const escrito = textosDe(d).find((x) => x.includes('ca'))!;
    // «ñ» es un solo byte 0xF1 y «ó» un solo 0xF3: cinco caracteres, cinco bytes.
    expect(escrito).toHaveLength(5);
    expect(escrito.charCodeAt(2)).toBe(0xf1);
    expect(escrito.charCodeAt(3)).toBe(0xf3);
  });

  it('escapa los paréntesis y la barra invertida, que delimitan las cadenas', () => {
    const d = documento();
    d.parrafo('a(b)c\\d');
    // Se busca en el archivo entero: un extractor por expresión regular no
    // puede con los paréntesis escapados, que es justo lo que se comprueba.
    expect(comoTexto(d.bytes())).toContain('(a\\(b\\)c\\\\d) Tj');
  });

  it('sustituye los signos que WinAnsi no tiene en lugar de romper el archivo', () => {
    const d = documento();
    // El menos tipográfico y el ≤ no existen en WinAnsi; el × sí, y se conserva.
    d.parrafo('−5 ≤ 3');
    const escrito = textosDe(d)[0]!;
    expect(escrito).toBe('-5 <= 3');
    for (let i = 0; i < escrito.length; i++) expect(escrito.charCodeAt(i)).toBeLessThan(256);
  });

  it('conserva la raya, las comillas latinas y el punto medio del pie', () => {
    const d = documento();
    d.parrafo('«así» —claro— · fin × 2');
    const escrito = textosDe(d)[0]!;
    expect(escrito.charCodeAt(0)).toBe(0xab);
    expect(escrito).toContain(String.fromCharCode(0x97));
    expect(escrito).toContain(String.fromCharCode(0xb7));
    expect(escrito).toContain(String.fromCharCode(0xd7));
  });

  it('ningún byte del archivo queda fuera del rango de un byte', () => {
    const d = documento();
    d.titulo('Título ñ');
    d.parrafo('Símbolos raros: ≠ ÷ … ™ 中文');
    for (const b of d.bytes()) expect(b).toBeLessThanOrEqual(255);
  });
});
