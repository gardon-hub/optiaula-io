/**
 * Aritmética racional exacta sobre `bigint`.
 *
 * El método simplex es el único módulo que la necesita. Un tableau se pivotea
 * decenas de veces y cada pivote divide toda una fila: en punto flotante los
 * ceros dejan de ser exactamente cero, la prueba de optimalidad empieza a
 * depender de una tolerancia arbitraria y el algoritmo puede ciclar por ruido
 * numérico en vez de por degeneración real. Con fracciones exactas, cero es
 * cero.
 *
 * Además es lo que el estudiante escribe a mano: el tableau muestra 5/16, no
 * 0,3125.
 */

/** Fracción en forma canónica: denominador positivo y `mcd(|n|, d) = 1`. */
export interface Racional {
  readonly n: bigint;
  readonly d: bigint;
}

function mcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Constructor normalizador. Lanza si el denominador es cero. */
export function racional(n: bigint, d: bigint = 1n): Racional {
  if (d === 0n) throw new RangeError('Racional con denominador cero');
  const signo = d < 0n ? -1n : 1n;
  const nn = n * signo;
  const dd = d * signo;
  const g = mcd(nn, dd);
  if (g === 0n) return { n: 0n, d: 1n };
  return { n: nn / g, d: dd / g };
}

export const CERO: Racional = { n: 0n, d: 1n };
export const UNO: Racional = { n: 1n, d: 1n };

/**
 * Convierte un `number` a la fracción que el usuario quiso escribir.
 *
 * Se parte de `toString()`, que da la representación decimal más corta que
 * regresa al mismo double: para 0.1 devuelve 1/10, no el valor binario exacto
 * 3602879701896397/36028797018963968. Es la interpretación correcta, porque el
 * dato de origen es un número escrito por una persona en un enunciado.
 */
export function desdeNumero(x: number): Racional | null {
  if (!Number.isFinite(x)) return null;
  if (Number.isInteger(x) && Math.abs(x) <= Number.MAX_SAFE_INTEGER) return racional(BigInt(x));

  const texto = x.toString();
  const m = /^(-?)(\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(texto);
  if (m === null) return null;

  const [, signo = '', entera = '', decimales = '', exponente = '0'] = m;
  const digitos = `${entera}${decimales}`;
  if (digitos === '') return null;

  let n = BigInt(digitos);
  let d = 10n ** BigInt(decimales.length);

  const e = Number(exponente);
  if (e > 0) n *= 10n ** BigInt(e);
  else if (e < 0) d *= 10n ** BigInt(-e);

  return racional(signo === '-' ? -n : n, d);
}

/** Como `desdeNumero`, pero con cero cuando el valor no es representable. */
export function desdeNumeroSeguro(x: number): Racional {
  return desdeNumero(x) ?? CERO;
}

export function aNumero(r: Racional): number {
  // La división directa de bigint trunca; se pasa por Number solo al final,
  // que es el único punto donde se admite pérdida de precisión.
  return Number(r.n) / Number(r.d);
}

export function sumar(a: Racional, b: Racional): Racional {
  return racional(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function restar(a: Racional, b: Racional): Racional {
  return racional(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function multiplicar(a: Racional, b: Racional): Racional {
  return racional(a.n * b.n, a.d * b.d);
}

export function dividir(a: Racional, b: Racional): Racional | null {
  if (b.n === 0n) return null;
  return racional(a.n * b.d, a.d * b.n);
}

export function negar(a: Racional): Racional {
  return { n: -a.n, d: a.d };
}

export function valorAbsoluto(a: Racional): Racional {
  return a.n < 0n ? { n: -a.n, d: a.d } : a;
}

/** −1 si a < b, 0 si son iguales, 1 si a > b. */
export function comparar(a: Racional, b: Racional): -1 | 0 | 1 {
  const izq = a.n * b.d;
  const der = b.n * a.d;
  if (izq < der) return -1;
  if (izq > der) return 1;
  return 0;
}

export function esCero(a: Racional): boolean {
  return a.n === 0n;
}

export function esPositivo(a: Racional): boolean {
  return a.n > 0n;
}

export function esNegativo(a: Racional): boolean {
  return a.n < 0n;
}

export function sonIguales(a: Racional, b: Racional): boolean {
  return a.n === b.n && a.d === b.d;
}

/** Suma exacta de una lista. No hay error de redondeo que acumular. */
export function sumaRacional(valores: readonly Racional[]): Racional {
  return valores.reduce(sumar, CERO);
}

function agruparMiles(digitos: string, separador: string): string {
  return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, separador);
}

/**
 * Fracción tal como se escribe a mano: `5/16`, `3`, `−2/3`.
 * El signo menos es el U+2212 de toda la aplicación, no el guion del teclado.
 */
export function texto(r: Racional, separadorMiles = ' '): string {
  const signo = r.n < 0n ? '−' : '';
  const n = agruparMiles((r.n < 0n ? -r.n : r.n).toString(), separadorMiles);
  if (r.d === 1n) return `${signo}${n}`;
  return `${signo}${n}/${agruparMiles(r.d.toString(), separadorMiles)}`;
}

/**
 * Fracción con su valor decimal al lado cuando no es entera: `5/16 = 0,3125`.
 * Se usa en los renglones donde el número tiene que poder leerse de un vistazo.
 */
export function textoMixto(r: Racional, decimales = 4): string {
  if (r.d === 1n) return texto(r);
  return `${texto(r)} ≈ ${aNumero(r).toFixed(decimales).replace('.', ',').replace('-', '−')}`;
}
