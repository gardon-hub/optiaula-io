/**
 * Pruebas del barajado de los elementos por clasificar.
 *
 * El defecto que las motiva: los dieciocho elementos de la cooperativa estaban
 * agrupados por categoría —cuatro entradas, cuatro procesos, tres salidas, tres
 * de retroalimentación, cuatro de ambiente externo— y se presentaban en ese
 * mismo orden. Se acertaba por posición, sin leer ni un enunciado. Lo notó el
 * docente mirando la pantalla.
 *
 * Lo que se comprueba no es que el arreglo cambie de orden, sino que **deje de
 * ser agrupado**: esa es la propiedad que arruinaba el ejercicio.
 */

import { describe, expect, it } from 'vitest';

import { EJERCICIOS_FUNDAMENTOS } from '@/datos/ejercicios/gestion';
import { barajar, generadorSemilla } from '@/nucleo/numero';

const elementos = (EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-01')!.datos as {
  elementos: readonly { id: string; categoria: string }[];
}).elementos;

/** Cuántos bloques de categoría consecutiva tiene una lista. */
function bloques(lista: readonly { categoria: string }[]): number {
  let n = 1;
  for (let i = 1; i < lista.length; i++) if (lista[i]!.categoria !== lista[i - 1]!.categoria) n++;
  return n;
}

describe('los datos siguen agrupados, que es como se mantienen', () => {
  it('en el archivo están ordenados por categoría', () => {
    // Agruparlos es lo correcto para editarlos: el docente ve juntas las cuatro
    // entradas. El problema era presentarlos así, no guardarlos así.
    expect(bloques(elementos)).toBe(5);
    expect(elementos).toHaveLength(18);
  });
});

describe('el orden que ve el estudiante rompe el patrón', () => {
  it('ninguna semilla deja los cinco bloques intactos', () => {
    // Con 18 elementos en 5 grupos, quedar agrupado por azar es prácticamente
    // imposible; que ocurriera indicaría que el barajado no está barajando.
    for (let semilla = 1; semilla <= 200; semilla++) {
      const mezclado = barajar(elementos, generadorSemilla(semilla));
      expect(bloques(mezclado), `semilla ${semilla}`).toBeGreaterThan(5);
    }
  });

  it('en promedio quedan muchos más bloques que los cinco originales', () => {
    let suma = 0;
    for (let semilla = 1; semilla <= 200; semilla++) suma += bloques(barajar(elementos, generadorSemilla(semilla)));
    // Con esta mezcla de categorías el valor esperado ronda 14.
    expect(suma / 200).toBeGreaterThan(12);
  });

  it('conserva los dieciocho elementos, sin perder ni repetir', () => {
    for (let semilla = 1; semilla <= 50; semilla++) {
      const mezclado = barajar(elementos, generadorSemilla(semilla));
      expect(mezclado).toHaveLength(elementos.length);
      expect(new Set(mezclado.map((e) => e.id)).size).toBe(elementos.length);
    }
  });

  it('no modifica el arreglo original', () => {
    const antes = elementos.map((e) => e.id).join(',');
    barajar(elementos, generadorSemilla(7));
    expect(elementos.map((e) => e.id).join(',')).toBe(antes);
  });

  it('la misma semilla da siempre el mismo orden', () => {
    // Es lo que permite que el orden no salte mientras el estudiante trabaja.
    const a = barajar(elementos, generadorSemilla(42)).map((e) => e.id);
    const b = barajar(elementos, generadorSemilla(42)).map((e) => e.id);
    expect(a).toEqual(b);
  });

  it('semillas distintas dan órdenes distintos', () => {
    const a = barajar(elementos, generadorSemilla(1)).map((e) => e.id).join(',');
    const b = barajar(elementos, generadorSemilla(2)).map((e) => e.id).join(',');
    expect(a).not.toBe(b);
  });
});
