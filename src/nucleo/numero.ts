/**
 * Utilidades numéricas del motor matemático.
 *
 * Regla irrenunciable del proyecto: **nunca se redondea durante el cálculo**.
 * El redondeo existe únicamente para presentar resultados. Todas las funciones
 * de este archivo son puras.
 */

import { MONEDAS, type CodigoMoneda } from '@/config/identidad';

/** Tolerancia por defecto para comparar flotantes en el motor. */
export const EPSILON = 1e-9;

/** ¿Dos números son iguales dentro de una tolerancia relativa y absoluta? */
export function casiIgual(a: number, b: number, tolerancia = EPSILON): boolean {
  if (a === b) return true;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const escala = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tolerancia * escala;
}

/** ¿El valor es cero dentro de la tolerancia? */
export function esCero(a: number, tolerancia = EPSILON): boolean {
  return Math.abs(a) <= tolerancia;
}

/**
 * Suma resistente a la deriva de coma flotante (algoritmo de Neumaier).
 * Necesaria porque sumar decenas de costos decimales acumula error visible.
 */
export function sumaExacta(valores: readonly number[]): number {
  let suma = 0;
  let compensacion = 0;
  for (const v of valores) {
    const t = suma + v;
    compensacion += Math.abs(suma) >= Math.abs(v) ? suma - t + v : v - t + suma;
    suma = t;
  }
  return suma + compensacion;
}

/**
 * Redondeo de media al alza estable, inmune a casos como 1.005 → 1.00.
 * Uso exclusivo de presentación.
 */
export function redondear(valor: number, decimales = 2): number {
  if (!Number.isFinite(valor)) return valor;
  const d = Math.max(0, Math.min(15, Math.trunc(decimales)));
  const desplazado = Number(`${valor}e${d}`);
  if (!Number.isFinite(desplazado)) return valor;
  return Number(`${Math.round(desplazado)}e-${d}`);
}

/** Divide protegiendo contra división entre cero. Devuelve `null` si el divisor es nulo. */
export function dividirSeguro(numerador: number, denominador: number): number | null {
  if (esCero(denominador)) return null;
  const r = numerador / denominador;
  return Number.isFinite(r) ? r : null;
}

/** Variación porcentual de `anterior` a `actual`. `null` si la base es cero. */
export function variacionPorcentual(anterior: number, actual: number): number | null {
  const r = dividirSeguro(actual - anterior, Math.abs(anterior));
  return r === null ? null : r * 100;
}

export interface OpcionesFormato {
  readonly decimales?: number;
  readonly separadorDecimal?: string;
  readonly separadorMiles?: string;
  /** Fuerza el signo `+` en valores positivos (útil para variaciones). */
  readonly signoExplicito?: boolean;
}

/** Formatea un número con separadores configurables. Solo presentación. */
export function formatearNumero(valor: number, opciones: OpcionesFormato = {}): string {
  const {
    decimales = 2,
    separadorDecimal = ',',
    separadorMiles = ' ',
    signoExplicito = false,
  } = opciones;

  if (!Number.isFinite(valor)) return '—';

  const negativo = valor < 0;
  const fijo = Math.abs(redondear(valor, decimales)).toFixed(
    Math.max(0, Math.min(15, Math.trunc(decimales))),
  );
  const [entera = '0', fraccion] = fijo.split('.');
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, separadorMiles);
  const cuerpo = fraccion ? `${conMiles}${separadorDecimal}${fraccion}` : conMiles;

  if (negativo) return `−${cuerpo}`;
  return signoExplicito ? `+${cuerpo}` : cuerpo;
}

/** Formatea un monto anteponiendo el símbolo de su moneda. */
export function formatearMoneda(
  valor: number,
  moneda: CodigoMoneda,
  opciones: OpcionesFormato = {},
): string {
  return `${MONEDAS[moneda].simbolo} ${formatearNumero(valor, { decimales: 2, ...opciones })}`;
}

/** Formatea un porcentaje ya expresado en escala 0–100. */
export function formatearPorcentaje(valor: number, opciones: OpcionesFormato = {}): string {
  return `${formatearNumero(valor, { decimales: 1, ...opciones })} %`;
}

/**
 * Valor con unidad explícita. El motor arrastra la unidad junto al número para
 * que la interfaz nunca tenga que adivinar si una razón es «kg por hora» o
 * «lempiras por lempira».
 */
export interface Magnitud {
  readonly valor: number;
  readonly unidad: string;
}

export function magnitud(valor: number, unidad: string): Magnitud {
  return { valor, unidad };
}

/**
 * Singular de una unidad en español, para redactar «cada hora» o «cada unidad»
 * en lugar de «cada horas» o «cada unidade». Cubre los plurales regulares y el
 * caso «-ones», que exige devolver la tilde perdida al singularizar
 * («camiones» → «camión»). No pretende ser un lematizador: si una unidad rara
 * no encaja, se devuelve tal cual antes que inventar una forma incorrecta.
 */
export function singular(palabra: string): string {
  const p = palabra.trim();
  if (p === "") return p;
  if (/ones$/i.test(p)) return p.slice(0, -4) + "ón"; // raciones → ración
  // La consonante previa manda: en «unidades» la «e» de «-es» es parte de la
  // terminación, no del lema, así que esta regla va antes que la general.
  if (/[^aeiouáéíóú]es$/i.test(p)) return p.slice(0, -2); // unidades → unidad, meses → mes
  if (/[aeiouáéíóú]s$/i.test(p)) return p.slice(0, -1); // horas → hora, series → serie
  if (/s$/i.test(p)) return p.slice(0, -1);
  return p;
}

/** Construye la unidad de una razón: «kg / hora», «L / L», etc. */
export function unidadRazon(numerador: string, denominador: string): string {
  return `${numerador} / ${denominador}`;
}

/**
 * Aproximación de la función de distribución acumulada normal estándar.
 * Usa la fórmula de Zelen y Severo (Abramowitz y Stegun 26.2.17), con error
 * absoluto menor a 7.5e-8: suficiente para las tablas Z de un curso.
 */
export function normalAcumulada(z: number): number {
  if (!Number.isFinite(z)) return z > 0 ? 1 : 0;
  const signo = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;

  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);

  return 0.5 * (1 + signo * y);
}

/**
 * Inversa de la normal estándar (cuantil), por el algoritmo de Acklam
 * con un refinamiento de Halley. Necesaria para «¿qué plazo da 95 % de
 * confianza?».
 */
export function normalInversa(p: number): number {
  if (!(p > 0 && p < 1)) return p <= 0 ? -Infinity : Infinity;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pBajo = 0.02425;
  let x: number;

  if (p < pBajo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
        ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= 1 - pBajo) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
        (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
         ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }

  // Un paso de refinamiento de Halley sobre la CDF.
  const e = normalAcumulada(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/**
 * Generador pseudoaleatorio reproducible (mulberry32).
 * La misma semilla produce siempre el mismo ejercicio: requisito del
 * generador docente.
 */
export function generadorSemilla(semilla: number): () => number {
  let a = semilla >>> 0;
  return function siguiente(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Entero pseudoaleatorio en [minimo, maximo] inclusive. */
export function enteroEntre(azar: () => number, minimo: number, maximo: number): number {
  return minimo + Math.floor(azar() * (maximo - minimo + 1));
}

/**
 * Devuelve una copia barajada, sin tocar el original (Fisher-Yates).
 *
 * Existe por un motivo pedagógico, no estético: cuando los elementos de un
 * ejercicio de clasificar se guardan agrupados por categoría —que es como
 * conviene escribirlos y mantenerlos—, presentarlos en ese mismo orden deja
 * resolver el ejercicio **por posición**, sin leer ni un enunciado. Los datos se
 * conservan ordenados y lo que se baraja es la presentación.
 *
 * Recorre de atrás hacia adelante e intercambia con un índice de 0 a i, que es
 * la forma correcta: sortear un índice sobre todo el arreglo en cada paso
 * produce permutaciones con probabilidades distintas.
 */
export function barajar<T>(lista: readonly T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

/** Convierte una semilla textual en un entero de 32 bits estable. */
export function semillaDesdeTexto(texto: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
