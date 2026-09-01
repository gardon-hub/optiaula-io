/**
 * Álgebra matricial exacta sobre racionales.
 *
 * La usa el método simplex revisado, que en lugar de arrastrar el tableau
 * completo mantiene solo la inversa de la base. Todo es exacto: invertir una
 * matriz en punto flotante acumula error en cada eliminación, y aquí la inversa
 * se multiplica por vectores en cada iteración, así que ese error se
 * propagaría a los costos reducidos y a la prueba de la razón.
 */

import { CERO, UNO, dividir, esCero, multiplicar, restar, sumar, type Racional } from './racional';

export type Matriz = readonly (readonly Racional[])[];

/** Matriz identidad de tamaño n. */
export function identidad(n: number): Racional[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? UNO : CERO)));
}

/** Producto matriz × vector. */
export function porVector(m: Matriz, v: readonly Racional[]): Racional[] {
  return m.map((fila) => fila.reduce((total, a, j) => sumar(total, multiplicar(a, v[j] ?? CERO)), CERO));
}

/** Producto vector fila × matriz. */
export function vectorPor(v: readonly Racional[], m: Matriz): Racional[] {
  const columnas = m[0]?.length ?? 0;
  return Array.from({ length: columnas }, (_, j) =>
    m.reduce((total, fila, i) => sumar(total, multiplicar(v[i] ?? CERO, fila[j] ?? CERO)), CERO),
  );
}

/** Producto escalar de dos vectores. */
export function escalar(a: readonly Racional[], b: readonly Racional[]): Racional {
  return a.reduce((total, x, i) => sumar(total, multiplicar(x, b[i] ?? CERO)), CERO);
}

/**
 * Inversa por eliminación de Gauss-Jordan con pivoteo parcial por posición.
 *
 * Devuelve `null` si la matriz es singular, que en el simplex significa que las
 * columnas elegidas no forman una base: no es un fallo numérico sino un dato,
 * y por eso se devuelve en vez de lanzar.
 *
 * No hace falta pivoteo por magnitud —el que evita la pérdida de precisión en
 * punto flotante—: con racionales exactos basta con encontrar cualquier pivote
 * distinto de cero.
 */
export function inversa(m: Matriz): Racional[][] | null {
  const n = m.length;
  if (n === 0 || m.some((f) => f.length !== n)) return null;

  const a = m.map((f) => [...f]);
  const inv = identidad(n);

  for (let col = 0; col < n; col++) {
    let pivote = -1;
    for (let f = col; f < n; f++) {
      if (!esCero(a[f]![col]!)) {
        pivote = f;
        break;
      }
    }
    if (pivote === -1) return null;

    if (pivote !== col) {
      [a[col], a[pivote]] = [a[pivote]!, a[col]!];
      [inv[col], inv[pivote]] = [inv[pivote]!, inv[col]!];
    }

    const p = a[col]![col]!;
    a[col] = a[col]!.map((x) => dividir(x, p)!);
    inv[col] = inv[col]!.map((x) => dividir(x, p)!);

    for (let f = 0; f < n; f++) {
      if (f === col) continue;
      const factor = a[f]![col]!;
      if (esCero(factor)) continue;
      a[f] = a[f]!.map((x, k) => restar(x, multiplicar(factor, a[col]![k]!)));
      inv[f] = inv[f]!.map((x, k) => restar(x, multiplicar(factor, inv[col]![k]!)));
    }
  }

  return inv;
}

/**
 * Actualiza `B⁻¹` tras un cambio de base, sin volver a invertir.
 *
 * Es la operación que hace eficiente al simplex revisado: entrar una columna y
 * sacar la de la fila `r` equivale a premultiplicar por una matriz elemental
 * —la «matriz eta»— que solo difiere de la identidad en una columna. Aplicarla
 * son las mismas operaciones de fila del pivoteo, hechas sobre `B⁻¹` en lugar
 * de sobre el tableau entero.
 *
 * `columna` es la entrante ya expresada en la base, es decir `B⁻¹A_e`.
 */
export function actualizarInversa(inv: Matriz, columna: readonly Racional[], fila: number): Racional[][] | null {
  const pivote = columna[fila];
  if (pivote === undefined || esCero(pivote)) return null;

  const nueva = inv.map((f) => [...f]);
  nueva[fila] = nueva[fila]!.map((x) => dividir(x, pivote)!);

  for (let i = 0; i < nueva.length; i++) {
    if (i === fila) continue;
    const factor = columna[i]!;
    if (esCero(factor)) continue;
    nueva[i] = nueva[i]!.map((x, k) => restar(x, multiplicar(factor, nueva[fila]![k]!)));
  }

  return nueva;
}
