/**
 * Módulo 9 — Método simplex.
 *
 * Resuelve programación lineal con cualquier número de variables, mostrando
 * cada tableau tal como se escribe a mano.
 *
 * Las variables artificiales se pueden tratar por los dos caminos que enseñan
 * los libros, y el laboratorio deja alternar entre ellos:
 *
 * - **Dos fases** (por omisión): primero se minimiza W, la suma de las
 *   artificiales, y solo después se optimiza el objetivo real. Si el mínimo de
 *   W no llega a cero, el problema es infactible.
 * - **Gran M**: las artificiales se penalizan dentro de la propia función
 *   objetivo con una constante arbitrariamente grande, y todo se resuelve de
 *   corrido. Si al terminar alguna artificial sigue en la base con valor
 *   positivo, el problema es infactible.
 *
 * La objeción clásica a la Gran M —que hay que elegir un valor para M, y si
 * queda corto el resultado es incorrecto mientras que si queda enorme la parte
 * real se pierde en el redondeo— aquí no aplica: M nunca toma un valor. La fila
 * objetivo se lleva simbólicamente como `a + bM` (ver `ValorM`) y las
 * comparaciones miran primero el coeficiente de M, que es exactamente lo que se
 * hace a mano. Los dos métodos tienen que dar el mismo óptimo y los mismos
 * precios sombra, y las pruebas lo comprueban ejercicio por ejercicio.
 *
 * Toda la aritmética es racional exacta (`racional.ts`). Un tableau se pivotea
 * muchas veces y cada pivote divide una fila entera: en punto flotante los
 * ceros dejan de ser cero y la prueba de optimalidad pasa a depender de una
 * tolerancia inventada. Aquí cero es cero, y el tableau muestra 5/16 igual que
 * el cuaderno del estudiante.
 */

import {
  CERO,
  UNO,
  aNumero,
  comparar,
  desdeNumero,
  dividir,
  esCero,
  esNegativo,
  esPositivo,
  multiplicar,
  negar,
  restar,
  sumar,
  texto as textoRacional,
  type Racional,
} from './racional';
import { actualizarInversa, escalar, inversa, porVector, vectorPor, type Matriz } from './matriz';
import { formatearNumero } from './numero';
import { SIMBOLO_RELACION, type Relacion } from './grafico';
import {
  ConstructorPasos,
  aviso,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Objetivo,
  type Resultado,
  type TablaPaso,
} from './tipos';

// ───────────────────────────── Datos de entrada ─────────────────────────────

export interface VariableSimplex {
  readonly id: string;
  /** Nombre con el que la conoce el estudiante: «mesas», «maíz». */
  readonly nombre: string;
  /** Coeficiente en la función objetivo. */
  readonly coeficiente: number;
}

export interface RestriccionSimplex {
  readonly id: string;
  readonly nombre: string;
  /** Un coeficiente por variable, en el mismo orden que `variables`. */
  readonly coeficientes: readonly number[];
  readonly relacion: Relacion;
  /** Lado derecho. */
  readonly c: number;
  readonly unidad: string;
}

export interface DatosSimplex {
  readonly titulo: string;
  readonly objetivo: Objetivo;
  readonly variables: readonly VariableSimplex[];
  readonly unidadVariables: string;
  /** Qué mide Z: «la utilidad», «el costo total». */
  readonly nombreObjetivo: string;
  readonly unidadObjetivo: string;
  readonly restricciones: readonly RestriccionSimplex[];
}

// ───────────────────────────── Estructuras del tableau ─────────────────────────────

export type TipoColumna = 'decision' | 'holgura' | 'exceso' | 'artificial';

export interface ColumnaSimplex {
  readonly indice: number;
  /** Símbolo del tableau: `x1`, `h2`, `e3`, `a3`. */
  readonly nombre: string;
  /** Qué representa, en palabras. */
  readonly etiqueta: string;
  readonly tipo: TipoColumna;
  /** Coeficiente en la función objetivo real (0 salvo las de decisión). */
  readonly costo: Racional;
  /** Restricción a la que pertenece, si es una variable añadida. */
  readonly restriccion: number | null;
}

/**
 * Un valor de la forma `a + b·M`, donde M es la constante «arbitrariamente
 * grande» del método de la Gran M.
 *
 * Solo la fila objetivo la necesita: el cuerpo del tableau y los lados derechos
 * son números corrientes. Representarla simbólicamente en vez de darle a M un
 * valor numérico enorme es lo que evita el problema clásico del método —si M
 * queda corto el resultado es incorrecto, y si queda enorme el término real se
 * pierde en el redondeo—. Aquí M no vale nada: solo domina.
 *
 * En el método de las dos fases `b` es siempre cero, así que el mismo tipo
 * sirve para los dos caminos sin duplicar el algoritmo.
 */
export interface ValorM {
  readonly a: Racional;
  readonly b: Racional;
}

export interface Tableau {
  /** Índice de la columna básica en cada fila. */
  readonly base: readonly number[];
  readonly filas: readonly (readonly Racional[])[];
  readonly ladoDerecho: readonly Racional[];
  /** Fila objetivo: `z_j − c_j` para cada columna. */
  readonly objetivo: readonly ValorM[];
  /** Valor de la función objetivo en la base actual. */
  readonly valor: ValorM;
  /** Restricción original de la que proviene cada fila. */
  readonly restriccionDeFila: readonly number[];
}

/**
 * Lo que el simplex revisado calcula en una iteración, que es mucho menos que
 * un tableau: la inversa de la base, los multiplicadores, el costo reducido de
 * cada columna candidata, y solo la columna que entra expresada en la base.
 */
export interface DetalleRevisado {
  /** B⁻¹ al empezar la iteración. */
  readonly inversa: readonly (readonly Racional[])[];
  /** Multiplicadores `y = c_B B⁻¹`. En la fase 2 son los precios sombra. */
  readonly multiplicadores: readonly Racional[];
  /** Costo reducido de cada columna no básica que se valoró. */
  readonly precios: readonly { readonly columna: number; readonly valor: Racional }[];
  /** Valores de las variables básicas, `x_B = B⁻¹b`. */
  readonly valoresBasicos: readonly Racional[];
  /** La entrante expresada en la base, `B⁻¹A_e`. `null` si no entró ninguna. */
  readonly columnaEntrante: readonly Racional[] | null;
  /** Casillas que actualiza el revisado en esta iteración. */
  readonly casillasRevisado: number;
  /** Casillas que actualizaría el tableau completo. */
  readonly casillasTableau: number;
}

export interface IteracionSimplex {
  readonly fase: 1 | 2;
  readonly numero: number;
  /** Tableau con el que se entra a la iteración. */
  readonly tableau: Tableau;
  readonly entra: number | null;
  /** Índice de fila que sale de la base. */
  readonly sale: number | null;
  readonly pivote: Racional | null;
  readonly razones: readonly (Racional | null)[];
  readonly regla: 'dantzig' | 'bland';
  /** Solo en el método revisado: lo que se calculó en lugar del tableau. */
  readonly revisada?: DetalleRevisado;
}

export type DesenlaceSimplex = 'optima' | 'multiples' | 'no_acotada' | 'infactible';

export interface ValorColumna {
  readonly columna: ColumnaSimplex;
  readonly valor: Racional;
  readonly basica: boolean;
}

export interface HolguraSimplex {
  readonly restriccion: RestriccionSimplex;
  /** Consumo del recurso en la solución óptima. */
  readonly consumo: Racional;
  /** Holgura (en ≤) o excedente (en ≥). Cero significa restricción activa. */
  readonly holgura: Racional;
  readonly activa: boolean;
  /** Cuánto cambia Z por cada unidad adicional del lado derecho. */
  readonly precioSombra: Racional;
  /**
   * Columna del tableau que arrancó siendo el vector unitario de esta fila: la
   * holgura en las ≤, la artificial en las ≥ y las =. Ahí se lee el precio
   * sombra, y esa misma columna es la de B⁻¹ que el análisis de sensibilidad
   * necesita para calcular el rango del lado derecho. `null` si la restricción
   * resultó redundante y su fila se retiró.
   */
  readonly columnaUnitaria: number | null;
  /**
   * La fila se multiplicó por −1 al normalizar, así que los signos del dual y
   * del rango van al revés respecto del lado derecho que escribió el usuario.
   */
  readonly negada: boolean;
}

export interface ResultadoSimplex {
  readonly datos: DatosSimplex;
  readonly columnas: readonly ColumnaSimplex[];
  readonly iteraciones: readonly IteracionSimplex[];
  readonly tableauFinal: Tableau | null;
  readonly desenlace: DesenlaceSimplex;
  readonly valores: readonly ValorColumna[];
  readonly solucion: readonly { readonly variable: VariableSimplex; readonly valor: Racional }[];
  readonly valorOptimo: Racional | null;
  readonly holguras: readonly HolguraSimplex[];
  readonly metodo: MetodoSimplex;
  /** El modelo tiene restricciones ≥ o =, y por tanto variables artificiales. */
  readonly necesitaArtificiales: boolean;
  readonly iteracionesFase1: number;
  readonly iteracionesFase2: number;
  readonly degenerado: boolean;
  /** Variables no básicas con `z_j − c_j = 0`: señalan óptimos alternativos. */
  readonly alternativas: readonly string[];
  /** Variable que puede crecer sin límite, cuando el problema no está acotado. */
  readonly variableNoAcotada: string | null;
}

export type Notacion = 'fraccion' | 'decimal';

/**
 * Cómo llegar al óptimo cuando la base de holguras no sirve de arranque.
 *
 * Los dos primeros agregan variables artificiales y se diferencian en cómo las
 * expulsan: `dos_fases` resuelve antes un problema auxiliar que minimiza su
 * suma, y `gran_m` las penaliza dentro de la propia función objetivo.
 *
 * `dual` no agrega ninguna: invierte el orden del trabajo. En vez de mantener
 * la factibilidad mientras busca la optimalidad, mantiene la optimalidad
 * mientras busca la factibilidad. A cambio exige que la base de holguras ya
 * cumpla la prueba de optimalidad, lo que no siempre ocurre.
 *
 * `revisado` no cambia el camino sino la contabilidad: recorre exactamente los
 * mismos vértices que `dos_fases` —usa su mismo tratamiento de las
 * artificiales— pero en lugar de arrastrar el tableau completo mantiene solo
 * `B⁻¹` y calcula cada columna cuando la necesita. Es como trabajan por dentro
 * todos los solucionadores industriales.
 *
 * Todos llegan al mismo óptimo cuando todos aplican, y esa coincidencia es una
 * de las comprobaciones del módulo.
 */
export type MetodoSimplex = 'dos_fases' | 'gran_m' | 'dual' | 'revisado';

export const NOMBRE_METODO: Record<MetodoSimplex, string> = {
  dos_fases: 'Método de las dos fases',
  gran_m: 'Método de la Gran M',
  dual: 'Dual simplex (sin artificiales)',
  revisado: 'Simplex revisado (con B⁻¹)',
};

export interface OpcionesSimplex {
  readonly notacion?: Notacion;
  readonly metodo?: MetodoSimplex;
  readonly maxIteraciones?: number;
}

/** Tamaño máximo admitido. Más allá el tableau deja de poder leerse en pantalla. */
export const MAX_VARIABLES = 12;
export const MAX_RESTRICCIONES = 12;

// ───────────────────────────── Presentación de números ─────────────────────────────

export function celda(r: Racional, notacion: Notacion): string {
  if (notacion === 'fraccion') return textoRacional(r);
  return formatearNumero(aNumero(r), { decimales: r.d === 1n ? 0 : 4 });
}

// ───────────────────────────── Aritmética con la constante M ─────────────────────────────

export const CERO_M: ValorM = { a: CERO, b: CERO };

export function valorM(a: Racional, b: Racional = CERO): ValorM {
  return { a, b };
}

export function sumarM(x: ValorM, y: ValorM): ValorM {
  return { a: sumar(x.a, y.a), b: sumar(x.b, y.b) };
}

export function restarM(x: ValorM, y: ValorM): ValorM {
  return { a: restar(x.a, y.a), b: restar(x.b, y.b) };
}

/** Multiplica por un número corriente: los coeficientes del tableau no llevan M. */
export function escalarM(k: Racional, x: ValorM): ValorM {
  return { a: multiplicar(k, x.a), b: multiplicar(k, x.b) };
}

export function negarM(x: ValorM): ValorM {
  return { a: negar(x.a), b: negar(x.b) };
}

/**
 * Compara dos valores `a + bM` sabiendo que M es arbitrariamente grande: manda
 * el coeficiente de M, y solo cuando empata se mira la parte constante. Eso es
 * exactamente lo que el estudiante hace a mano cuando dice «−3 − 2M es más
 * negativo que −10 − M».
 */
export function compararM(x: ValorM, y: ValorM): -1 | 0 | 1 {
  const porM = comparar(x.b, y.b);
  return porM !== 0 ? porM : comparar(x.a, y.a);
}

export function esCeroM(x: ValorM): boolean {
  return esCero(x.a) && esCero(x.b);
}

export function esNegativoM(x: ValorM): boolean {
  return compararM(x, CERO_M) < 0;
}

export function esPositivoM(x: ValorM): boolean {
  return compararM(x, CERO_M) > 0;
}

function valorAbsolutoM(x: ValorM): ValorM {
  return esNegativoM(x) ? negarM(x) : x;
}

/** `−3 − 2M`, `5`, `M`, `−M`: la notación con la que se escribe en la pizarra. */
export function celdaM(x: ValorM, notacion: Notacion): string {
  const constante = celda(x.a, notacion);
  if (esCero(x.b)) return constante;

  const negativo = esNegativo(x.b);
  const magnitud = negativo ? negar(x.b) : x.b;
  const coeficiente = magnitud.n === 1n && magnitud.d === 1n ? '' : celda(magnitud, notacion);
  const termino = `${coeficiente}M`;

  if (esCero(x.a)) return negativo ? `−${termino}` : termino;
  return `${constante} ${negativo ? '−' : '+'} ${termino}`;
}

// ───────────────────────────── Validación ─────────────────────────────

function validar(d: DatosSimplex): Diagnostico[] {
  const g: Diagnostico[] = [];
  const n = d.variables.length;

  if (n === 0) {
    g.push(error('SX_SIN_VARIABLES', 'El modelo no tiene variables de decisión: no hay nada que decidir.'));
  }
  if (d.restricciones.length === 0) {
    g.push(
      error(
        'SX_SIN_RESTRICCIONES',
        'El modelo no tiene restricciones. Sin ellas, o el óptimo está en el origen o el problema no está acotado; en ningún caso hace falta el simplex.',
      ),
    );
  }
  if (n > MAX_VARIABLES || d.restricciones.length > MAX_RESTRICCIONES) {
    g.push(
      error(
        'SX_DEMASIADO_GRANDE',
        `El laboratorio admite hasta ${MAX_VARIABLES} variables y ${MAX_RESTRICCIONES} restricciones. El método sigue siendo válido para cualquier tamaño, pero un tableau más grande deja de poder leerse y de enseñarse a mano: ahí es donde se pasa a un solucionador industrial.`,
      ),
    );
  }

  if (d.variables.every((v) => v.coeficiente === 0) && n > 0) {
    g.push(error('SX_OBJETIVO_NULO', 'Todos los coeficientes de la función objetivo son cero: cualquier punto factible sería óptimo.'));
  }

  for (const v of d.variables) {
    if (!Number.isFinite(v.coeficiente)) {
      g.push(error('SX_COEFICIENTE_INVALIDO', `El coeficiente de "${v.nombre}" en la función objetivo no es un número válido.`, v.id));
    }
  }

  for (const r of d.restricciones) {
    if (r.coeficientes.length !== n) {
      g.push(
        error(
          'SX_DIMENSION',
          `La restricción "${r.nombre}" tiene ${r.coeficientes.length} coeficientes y el modelo tiene ${n} variables. Cada restricción necesita un coeficiente por variable, aunque sea cero.`,
          r.id,
        ),
      );
      continue;
    }
    if (r.coeficientes.every((c) => c === 0)) {
      g.push(error('SX_RESTRICCION_VACIA', `La restricción "${r.nombre}" no involucra ninguna variable.`, r.id));
    }
    if (!Number.isFinite(r.c) || r.coeficientes.some((c) => !Number.isFinite(c))) {
      g.push(error('SX_COEFICIENTE_INVALIDO', `La restricción "${r.nombre}" tiene coeficientes que no son números válidos.`, r.id));
    }
  }

  return g;
}

// ───────────────────────────── Forma estándar ─────────────────────────────

interface FilaNormalizada {
  readonly restriccion: number;
  readonly coeficientes: readonly Racional[];
  readonly relacion: Relacion;
  readonly c: Racional;
  /** La fila se multiplicó por −1 para dejar el lado derecho no negativo. */
  readonly negada: boolean;
}

function relacionInvertida(r: Relacion): Relacion {
  if (r === '<=') return '>=';
  if (r === '>=') return '<=';
  return '=';
}

/**
 * El simplex primal exige lados derechos no negativos, porque la base inicial
 * toma el valor del lado derecho y una variable básica negativa no sería
 * factible. Cuando el lado derecho es negativo se multiplica toda la fila por
 * −1, lo que invierte el sentido de la desigualdad.
 */
function normalizar(d: DatosSimplex): FilaNormalizada[] {
  return d.restricciones.map((r, i) => {
    const coefs = r.coeficientes.map((c) => desdeNumero(c) ?? CERO);
    const c = desdeNumero(r.c) ?? CERO;
    if (!esNegativo(c)) {
      return { restriccion: i, coeficientes: coefs, relacion: r.relacion, c, negada: false };
    }
    return {
      restriccion: i,
      coeficientes: coefs.map(negar),
      relacion: relacionInvertida(r.relacion),
      c: negar(c),
      negada: true,
    };
  });
}

/**
 * Normalización del dual simplex, que es la contraria: aquí todo se lleva a ≤ y
 * el lado derecho se deja con el signo que le toque.
 *
 * Un lado derecho negativo no es un problema que haya que corregir sino
 * justamente el material de trabajo del método: cada fila con `b_i < 0` es una
 * restricción que todavía no se cumple, y el procedimiento las va arreglando de
 * una en una. Por eso el dual simplex no necesita variables artificiales: la
 * base de holguras, aunque sea infactible, ya sirve de arranque.
 */
function normalizarDual(d: DatosSimplex): FilaNormalizada[] {
  return d.restricciones.map((r, i) => {
    const coefs = r.coeficientes.map((c) => desdeNumero(c) ?? CERO);
    const c = desdeNumero(r.c) ?? CERO;
    if (r.relacion !== '>=') {
      return { restriccion: i, coeficientes: coefs, relacion: r.relacion, c, negada: false };
    }
    return {
      restriccion: i,
      coeficientes: coefs.map(negar),
      relacion: '<=',
      c: negar(c),
      negada: true,
    };
  });
}

function construirColumnas(d: DatosSimplex, filas: readonly FilaNormalizada[]): ColumnaSimplex[] {
  const columnas: ColumnaSimplex[] = [];
  const agregar = (
    nombre: string,
    etiqueta: string,
    tipo: TipoColumna,
    costo: Racional,
    restriccion: number | null,
  ): void => {
    columnas.push({ indice: columnas.length, nombre, etiqueta, tipo, costo, restriccion });
  };

  d.variables.forEach((v, j) => {
    agregar(`x${j + 1}`, v.nombre, 'decision', desdeNumero(v.coeficiente) ?? CERO, null);
  });

  // El orden —primero todas las holguras, luego los excesos, luego las
  // artificiales— es el de los libros de texto, para que el tableau de la
  // pantalla se pueda comparar con el del cuaderno.
  for (const f of filas) {
    if (f.relacion === '<=') {
      agregar(`h${f.restriccion + 1}`, `holgura de ${d.restricciones[f.restriccion]?.nombre ?? ''}`, 'holgura', CERO, f.restriccion);
    }
  }
  for (const f of filas) {
    if (f.relacion === '>=') {
      agregar(`e${f.restriccion + 1}`, `exceso de ${d.restricciones[f.restriccion]?.nombre ?? ''}`, 'exceso', CERO, f.restriccion);
    }
  }
  for (const f of filas) {
    if (f.relacion !== '<=') {
      agregar(`a${f.restriccion + 1}`, `artificial de ${d.restricciones[f.restriccion]?.nombre ?? ''}`, 'artificial', CERO, f.restriccion);
    }
  }

  return columnas;
}

function columnaDe(columnas: readonly ColumnaSimplex[], tipo: TipoColumna, restriccion: number): number | null {
  const c = columnas.find((x) => x.tipo === tipo && x.restriccion === restriccion);
  return c === undefined ? null : c.indice;
}

// ───────────────────────────── Operaciones del tableau ─────────────────────────────

interface Estado {
  base: number[];
  filas: Racional[][];
  ladoDerecho: Racional[];
  restriccionDeFila: number[];
}

/**
 * Recalcula la fila objetivo desde la base actual: `z_j − c_j = c_B B⁻¹A_j − c_j`.
 *
 * Se recalcula en vez de arrastrarla con operaciones de fila. El resultado es
 * idéntico —el cuerpo del tableau ya es `B⁻¹A`— y evita que un descuido en una
 * sola resta se propague por todo el procedimiento.
 */
function filaObjetivo(estado: Estado, costos: readonly ValorM[]): { objetivo: ValorM[]; valor: ValorM } {
  const nColumnas = costos.length;
  const objetivo: ValorM[] = [];

  for (let j = 0; j < nColumnas; j++) {
    let z = CERO_M;
    for (let i = 0; i < estado.base.length; i++) {
      const cb = costos[estado.base[i]!]!;
      if (esCeroM(cb)) continue;
      z = sumarM(z, escalarM(estado.filas[i]![j]!, cb));
    }
    objetivo.push(restarM(z, costos[j]!));
  }

  let valor = CERO_M;
  for (let i = 0; i < estado.base.length; i++) {
    const cb = costos[estado.base[i]!]!;
    if (esCeroM(cb)) continue;
    valor = sumarM(valor, escalarM(estado.ladoDerecho[i]!, cb));
  }

  return { objetivo, valor };
}

function instantanea(estado: Estado, costos: readonly ValorM[]): Tableau {
  const { objetivo, valor } = filaObjetivo(estado, costos);
  return {
    base: [...estado.base],
    filas: estado.filas.map((f) => [...f]),
    ladoDerecho: [...estado.ladoDerecho],
    objetivo,
    valor,
    restriccionDeFila: [...estado.restriccionDeFila],
  };
}

function pivotear(estado: Estado, fila: number, columna: number): void {
  const pivote = estado.filas[fila]![columna]!;
  const nueva = estado.filas[fila]!.map((v) => dividir(v, pivote) ?? CERO);
  estado.filas[fila] = nueva;
  estado.ladoDerecho[fila] = dividir(estado.ladoDerecho[fila]!, pivote) ?? CERO;

  for (let i = 0; i < estado.filas.length; i++) {
    if (i === fila) continue;
    const factor = estado.filas[i]![columna]!;
    if (esCero(factor)) continue;
    estado.filas[i] = estado.filas[i]!.map((v, j) => restar(v, multiplicar(factor, nueva[j]!)));
    estado.ladoDerecho[i] = restar(estado.ladoDerecho[i]!, multiplicar(factor, estado.ladoDerecho[fila]!));
  }

  estado.base[fila] = columna;
}

/**
 * Columna que entra a la base.
 *
 * Con la fila objetivo escrita como `z_j − c_j`, maximizar mejora cuando entra
 * una columna con valor negativo y minimizar cuando entra una con valor
 * positivo. La regla de Dantzig toma la de mayor magnitud, que suele avanzar
 * más rápido; la de Bland toma la de menor índice, que es más lenta pero
 * garantiza que el algoritmo termina aunque haya degeneración.
 */
function elegirEntrante(
  objetivo: readonly ValorM[],
  sentido: Objetivo,
  permitida: readonly boolean[],
  bland: boolean,
): number | null {
  let elegida: number | null = null;
  let mejor = CERO_M;

  for (let j = 0; j < objetivo.length; j++) {
    if (!permitida[j]) continue;
    const v = objetivo[j]!;
    const mejora = sentido === 'maximizar' ? esNegativoM(v) : esPositivoM(v);
    if (!mejora) continue;
    if (bland) return j;
    const magnitud = valorAbsolutoM(v);
    if (elegida === null || compararM(magnitud, mejor) > 0) {
      elegida = j;
      mejor = magnitud;
    }
  }

  return elegida;
}

/**
 * Prueba de la razón mínima: hasta dónde puede crecer la variable entrante
 * antes de que una variable básica se vuelva negativa.
 */
function elegirSaliente(
  estado: Estado,
  columna: number,
  columnas: readonly ColumnaSimplex[],
): { fila: number | null; razones: (Racional | null)[] } {
  const razones: (Racional | null)[] = [];
  let fila: number | null = null;
  let mejor: Racional | null = null;

  for (let i = 0; i < estado.filas.length; i++) {
    const a = estado.filas[i]![columna]!;
    if (!esPositivo(a)) {
      razones.push(null);
      continue;
    }
    const razon = dividir(estado.ladoDerecho[i]!, a)!;
    razones.push(razon);

    if (mejor === null || comparar(razon, mejor) < 0) {
      mejor = razon;
      fila = i;
      continue;
    }
    if (comparar(razon, mejor) === 0 && fila !== null) {
      // Empate: sale primero una artificial, que es la que interesa expulsar;
      // si no, la de menor índice de columna (regla de Bland contra el ciclado).
      const actualEsArtificial = columnas[estado.base[fila]!]!.tipo === 'artificial';
      const candidataEsArtificial = columnas[estado.base[i]!]!.tipo === 'artificial';

      const gana =
        candidataEsArtificial !== actualEsArtificial
          ? candidataEsArtificial
          : estado.base[i]! < estado.base[fila]!;

      if (gana) fila = i;
    }
  }

  return { fila, razones };
}

// ───────────────────────────── Simplex revisado ─────────────────────────────

/** La inversa de la base formada por las columnas indicadas de A. */
function inversaDeBase(matrizA: Matriz, base: readonly number[]): Racional[][] | null {
  const b = matrizA.map((fila) => base.map((j) => fila[j] ?? CERO));
  return inversa(b);
}

/** `B⁻¹A` completo: solo se calcula al final, para poder leer el resultado. */
function cuerpoEnBase(inv: Matriz, matrizA: Matriz): Racional[][] {
  const columnas = matrizA[0]?.length ?? 0;
  return inv.map((filaInv) =>
    Array.from({ length: columnas }, (_, j) =>
      matrizA.reduce((total, filaA, k) => sumar(total, multiplicar(filaInv[k] ?? CERO, filaA[j] ?? CERO)), CERO),
    ),
  );
}

/**
 * Columna que entra, sobre la lista de costos reducidos que se valoraron.
 *
 * Es la misma regla del tableau, pero aplicada a los pocos valores que el
 * revisado calcula en lugar de a una fila objetivo completa.
 */
function elegirEntranteRevisado(
  precios: readonly { readonly columna: number; readonly valor: Racional }[],
  sentido: Objetivo,
  bland: boolean,
): number | null {
  let elegida: number | null = null;
  let mejor = CERO;

  for (const p of precios) {
    const mejora = sentido === 'maximizar' ? esNegativo(p.valor) : esPositivo(p.valor);
    if (!mejora) continue;
    if (bland) return p.columna;
    const magnitud = esNegativo(p.valor) ? negar(p.valor) : p.valor;
    if (elegida === null || comparar(magnitud, mejor) > 0) {
      elegida = p.columna;
      mejor = magnitud;
    }
  }

  return elegida;
}

/**
 * Prueba de la razón mínima sobre los dos vectores que el revisado calcula:
 * `B⁻¹A_e` y `x_B = B⁻¹b`. Es la misma prueba del tableau, con los mismos
 * desempates, pero sin necesitar el resto de las columnas.
 */
function razonMinima(
  columnaEntrante: readonly Racional[],
  valoresBasicos: readonly Racional[],
  base: readonly number[],
  columnas: readonly ColumnaSimplex[],
): { fila: number | null; razones: (Racional | null)[] } {
  const razones: (Racional | null)[] = [];
  let fila: number | null = null;
  let mejor: Racional | null = null;

  for (let i = 0; i < columnaEntrante.length; i++) {
    const a = columnaEntrante[i]!;
    if (!esPositivo(a)) {
      razones.push(null);
      continue;
    }
    const razon = dividir(valoresBasicos[i]!, a)!;
    razones.push(razon);

    if (mejor === null || comparar(razon, mejor) < 0) {
      mejor = razon;
      fila = i;
      continue;
    }
    if (comparar(razon, mejor) === 0 && fila !== null) {
      const actualEsArtificial = columnas[base[fila]!]!.tipo === 'artificial';
      const candidataEsArtificial = columnas[base[i]!]!.tipo === 'artificial';
      const gana = candidataEsArtificial !== actualEsArtificial ? candidataEsArtificial : base[i]! < base[fila]!;
      if (gana) fila = i;
    }
  }

  return { fila, razones };
}

// ───────────────────────────── Dual simplex ─────────────────────────────

/**
 * Fila que sale en el dual simplex: la del lado derecho más negativo.
 *
 * Es el espejo exacto del primal. Allá se elegía primero la columna que más
 * mejora el objetivo; aquí se elige primero la fila que más viola la
 * factibilidad, porque el objetivo ya está bien y lo que falta es cumplir las
 * restricciones. Cuando ninguna fila es negativa, la solución ya es factible y
 * —como la optimalidad nunca se perdió— también es óptima.
 */
function elegirSalienteDual(estado: Estado): number | null {
  let fila: number | null = null;
  let peor: Racional | null = null;

  for (let i = 0; i < estado.ladoDerecho.length; i++) {
    const b = estado.ladoDerecho[i]!;
    if (!esNegativo(b)) continue;
    if (peor === null || comparar(b, peor) < 0) {
      peor = b;
      fila = i;
    }
  }

  return fila;
}

/**
 * Columna que entra en el dual simplex: la de menor razón `|(z_j − c_j) / a_rj|`
 * entre las que tienen coeficiente **negativo** en la fila que sale.
 *
 * Solo un coeficiente negativo sirve: al pivotear sobre él, el lado derecho
 * negativo se vuelve positivo. Y la razón mínima es lo que garantiza que
 * ninguna otra columna pierda la optimalidad en el camino —es la misma lógica
 * del cociente mínimo del primal, aplicada a la fila objetivo en lugar de a la
 * columna—.
 *
 * Si ninguna columna tiene coeficiente negativo en esa fila, el problema es
 * infactible, y esa fila sola lo demuestra: con todos los coeficientes ≥ 0 y
 * todas las variables ≥ 0, la suma no puede dar un número negativo.
 */
function elegirEntranteDual(
  estado: Estado,
  fila: number,
  objetivo: readonly ValorM[],
): { columna: number | null; razones: (Racional | null)[] } {
  const razones: (Racional | null)[] = [];
  let columna: number | null = null;
  let mejor: Racional | null = null;

  for (let j = 0; j < objetivo.length; j++) {
    const a = estado.filas[fila]![j]!;
    if (!esNegativo(a)) {
      razones.push(null);
      continue;
    }

    const cociente = dividir(objetivo[j]!.a, a)!;
    const razon = esNegativo(cociente) ? negar(cociente) : cociente;
    razones.push(razon);

    // Empate: la de menor índice, que es la regla de Bland y evita ciclar.
    if (mejor === null || comparar(razon, mejor) < 0) {
      mejor = razon;
      columna = j;
    }
  }

  return { columna, razones };
}

// ───────────────────────────── Pasos ─────────────────────────────

function tablaTableau(
  tab: Tableau,
  columnas: readonly ColumnaSimplex[],
  notacion: Notacion,
  etiquetaObjetivo: string,
  entra: number | null,
  razones: readonly (Racional | null)[] | null,
  /** Fila que sale de la base, para resaltarla junto a la columna entrante. */
  sale: number | null = null,
  /** Dual simplex: la razón se calcula por columna y va debajo de la fila objetivo. */
  razonesDuales: readonly (Racional | null)[] | null = null,
): TablaPaso {
  const encabezados = [
    'Base',
    ...columnas.map((c) => (c.indice === entra ? `↓ ${c.nombre}` : c.nombre)),
    'Solución',
  ];
  if (razones !== null) encabezados.push('Razón');

  const filas = tab.filas.map((fila, i) => {
    const celdas = [
      columnas[tab.base[i]!]!.nombre,
      ...fila.map((v) => celda(v, notacion)),
      celda(tab.ladoDerecho[i]!, notacion),
    ];
    if (razones !== null) {
      const r = razones[i] ?? null;
      celdas.push(r === null ? '—' : celda(r, notacion));
    }
    return celdas;
  });

  const pie = [
    `${etiquetaObjetivo} (z − c)`,
    ...tab.objetivo.map((v) => celdaM(v, notacion)),
    celdaM(tab.valor, notacion),
  ];
  if (razones !== null) pie.push('');

  const base: TablaPaso = { encabezados, filas, pie };
  const conFila = sale === null ? base : { ...base, resaltadas: [sale] };
  if (razonesDuales === null) return conFila;

  const pieAdicional = ['Razón dual', ...razonesDuales.map((r) => (r === null ? '—' : celda(r, notacion)))];
  while (pieAdicional.length < encabezados.length) pieAdicional.push('');

  return { ...conFila, pieAdicional };
}

// ───────────────────────────── Solucionador ─────────────────────────────

export function resolverSimplex(d: DatosSimplex, opciones: OpcionesSimplex = {}): Resultado<ResultadoSimplex> {
  const notacion = opciones.notacion ?? 'fraccion';
  const metodo: MetodoSimplex = opciones.metodo ?? 'dos_fases';
  const diagnosticos: Diagnostico[] = validar(d);
  const pasos = new ConstructorPasos();
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const normalizadas = metodo === 'dual' ? normalizarDual(d) : normalizar(d);
  for (const f of normalizadas) {
    if (!f.negada) continue;
    diagnosticos.push(
      nota(
        'SX_FILA_NEGADA',
        metodo === 'dual'
          ? `La restricción "${d.restricciones[f.restriccion]?.nombre ?? ''}" era de tipo ≥. Se multiplicó toda la fila por −1 para dejarla en ≤, lo que hace negativo su lado derecho. En el dual simplex eso no es un problema sino el punto de partida: cada lado derecho negativo señala una restricción que todavía no se cumple.`
          : `La restricción "${d.restricciones[f.restriccion]?.nombre ?? ''}" tenía el lado derecho negativo. Se multiplicó toda la fila por −1, lo que invierte el sentido de la desigualdad: el simplex necesita lados derechos no negativos para que la base inicial sea factible.`,
        d.restricciones[f.restriccion]?.id,
      ),
    );
  }

  // El dual simplex arranca de la base de holguras, así que necesita dos cosas
  // que el primal no exige: que ninguna restricción sea una igualdad —una
  // igualdad no deja holgura que meter en la base— y que esa base ya cumpla la
  // prueba de optimalidad.
  if (metodo === 'dual') {
    const igualdades = d.restricciones.filter((r) => r.relacion === '=');
    if (igualdades.length > 0) {
      diagnosticos.push(
        error(
          'SX_DUAL_CON_IGUALDAD',
          `El dual simplex arranca con las holguras en la base, y una igualdad no deja holgura: ${igualdades.map((r) => `"${r.nombre}"`).join(', ')} ${igualdades.length === 1 ? 'lo impide' : 'lo impiden'}. Puede reescribir cada igualdad como dos desigualdades —una ≤ y una ≥ con el mismo lado derecho— y volver a intentarlo, o resolver el modelo por las dos fases o por la Gran M.`,
        ),
      );
    }

    // Con la base de holguras, z_j − c_j = −c_j. La prueba de optimalidad se
    // cumple si todos los coeficientes tienen el signo que no mejora nada.
    const contrario = d.variables.filter((v) =>
      d.objetivo === 'maximizar' ? v.coeficiente > 0 : v.coeficiente < 0,
    );

    if (contrario.length > 0) {
      diagnosticos.push(
        error(
          'SX_DUAL_NO_APLICA',
          `El dual simplex mantiene la optimalidad mientras busca la factibilidad, así que exige arrancar de una base que **ya** cumpla la prueba de optimalidad. Con la base de holguras eso equivale a que todos los coeficientes de la función objetivo sean ${d.objetivo === 'maximizar' ? 'menores o iguales que cero al maximizar' : 'mayores o iguales que cero al minimizar'}, y aquí ${contrario.length === 1 ? 'no lo cumple' : 'no lo cumplen'} ${contrario.map((v) => `"${v.nombre}"`).join(', ')}. Es la situación normal en un problema de maximización con márgenes positivos: para esos, use las dos fases o la Gran M. El dual simplex es el método de los modelos de **mínimo costo con requerimientos mínimos**, donde encaja sin una sola variable artificial.`,
        ),
      );
    }

    if (hayErrores(diagnosticos)) {
      pasos.agregar({
        titulo: 'Formular el modelo',
        explicacion:
          'El modelo está bien planteado, pero no cumple las condiciones de arranque del dual simplex. Los diagnósticos de arriba explican cuál falla ' +
          'y qué método usar en su lugar; el modelo en sí no cambia.',
        formula: objetivoTex(d),
        tabla: {
          encabezados: ['Restricción', 'Expresión', 'Disponible'],
          filas: d.restricciones.map((r) => [
            r.nombre,
            expresionRestriccion(d, r),
            `${formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })} ${r.unidad}`,
          ]),
        },
      });

      return {
        datos: null,
        pasos: pasos.listar(),
        diagnosticos,
        interpretacion:
          'El dual simplex no aplica a este modelo. No es un fallo del modelo ni del método: cada uno tiene sus condiciones de arranque, ' +
          'y elegir el que corresponde es parte del trabajo.',
      };
    }
  }

  const columnas = construirColumnas(d, normalizadas);
  const nColumnas = columnas.length;

  // ── Paso 1: el modelo ────────────────────────────────────────────────────
  pasos.agregar({
    titulo: 'Formular el modelo',
    explicacion:
      `Se definen las variables de decisión y se escribe la función objetivo y cada restricción. ` +
      `A diferencia del método gráfico, aquí el número de variables no está limitado a dos: el simplex recorre los ` +
      `vértices por álgebra, no por dibujo, y por eso sirve para problemas de cualquier tamaño.`,
    formula: objetivoTex(d),
    tabla: {
      encabezados: ['Restricción', 'Expresión', 'Disponible'],
      filas: d.restricciones.map((r) => [r.nombre, expresionRestriccion(d, r), `${formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })} ${r.unidad}`]),
    },
  });

  // ── Paso 2: forma estándar ───────────────────────────────────────────────
  pasos.agregar(
    metodo === 'dual'
      ? {
          titulo: 'Llevar todas las restricciones a la forma ≤',
          explicacion:
            'El dual simplex no usa variables artificiales, y por eso su forma estándar es distinta. Cada restricción de tipo ≥ se multiplica por −1 ' +
            'para dejarla en ≤, lo que hace negativo su lado derecho, y entonces **toda** restricción recibe una holgura. Con eso las holguras ya ' +
            'forman una base: no perfecta —algunas valdrán un número negativo— pero suficiente para arrancar.\n\n' +
            'El primal habría hecho lo contrario: mantener el lado derecho no negativo a costa de agregar excesos y artificiales. Aquí se acepta el ' +
            'lado derecho negativo porque es precisamente lo que el método sabe corregir.',
          tabla: {
            encabezados: ['Restricción', 'Relación original', 'Queda como', 'Se agrega'],
            filas: normalizadas.map((f) => {
              const r = d.restricciones[f.restriccion]!;
              return [
                r.nombre,
                SIMBOLO_RELACION[r.relacion],
                f.negada
                  ? `${expresionRestriccion(d, { ...r, coeficientes: r.coeficientes.map((c) => -c), relacion: '<=', c: -r.c })}`
                  : expresionRestriccion(d, r),
                `+ h${f.restriccion + 1}${f.negada ? ' (con lado derecho negativo)' : ''}`,
              ];
            }),
          },
        }
      : {
          titulo: 'Llevar el modelo a la forma estándar',
          explicacion:
            'El simplex solo trabaja con igualdades. Cada desigualdad ≤ recibe una **variable de holgura** que absorbe lo que sobra del recurso. ' +
            'Cada desigualdad ≥ recibe una **variable de exceso** que se resta —para representar lo que se produce de más sobre el mínimo exigido— ' +
            'y, como esa variable entra con signo negativo, no puede servir de base inicial: hace falta además una **variable artificial**. ' +
            'Las igualdades reciben directamente una artificial. Las artificiales no significan nada en el problema real: son un andamio para arrancar, ' +
            'y la fase 1 existe justamente para quitarlas.',
          tabla: {
            encabezados: ['Restricción', 'Relación', 'Se agrega', 'Por qué'],
            filas: normalizadas.map((f) => {
              const r = d.restricciones[f.restriccion]!;
              if (f.relacion === '<=') {
                return [r.nombre, '≤', `+ h${f.restriccion + 1}`, 'La holgura mide el recurso que queda sin usar y sirve de base inicial.'];
              }
              if (f.relacion === '>=') {
                return [r.nombre, '≥', `− e${f.restriccion + 1} + a${f.restriccion + 1}`, 'El exceso mide cuánto se supera el mínimo; la artificial da una base de arranque.'];
              }
              return [r.nombre, '=', `+ a${f.restriccion + 1}`, 'Una igualdad no deja holgura: solo se necesita la artificial para arrancar.'];
            }),
          },
        },
  );

  // ── Construcción del tableau inicial ─────────────────────────────────────
  const estado: Estado = { base: [], filas: [], ladoDerecho: [], restriccionDeFila: [] };

  for (const f of normalizadas) {
    const fila: Racional[] = new Array<Racional>(nColumnas).fill(CERO);
    f.coeficientes.forEach((c, j) => {
      fila[j] = c;
    });

    const h = columnaDe(columnas, 'holgura', f.restriccion);
    const e = columnaDe(columnas, 'exceso', f.restriccion);
    const a = columnaDe(columnas, 'artificial', f.restriccion);
    if (h !== null) fila[h] = UNO;
    if (e !== null) fila[e] = negar(UNO);
    if (a !== null) fila[a] = UNO;

    estado.filas.push(fila);
    estado.ladoDerecho.push(f.c);
    estado.restriccionDeFila.push(f.restriccion);
    estado.base.push(a ?? h ?? 0);
  }

  // Copia intacta de la matriz de restricciones y del lado derecho. El simplex
  // revisado no pivotea el tableau, así que necesita las columnas originales
  // para poder calcular B⁻¹A_j cuando le hagan falta.
  const matrizA: Racional[][] = estado.filas.map((f) => [...f]);
  const vectorB: Racional[] = [...estado.ladoDerecho];

  const hayArtificiales = columnas.some((c) => c.tipo === 'artificial');
  const costosReales = columnas.map((c) => valorM(c.costo));
  const costosFase1 = columnas.map((c) => valorM(CERO, c.tipo === 'artificial' ? UNO : CERO));

  // Gran M: la penalización va en la propia función objetivo. Al maximizar la
  // artificial resta M —producirla destruye una cantidad arbitrariamente
  // grande de margen— y al minimizar suma M. En ambos casos el algoritmo la
  // expulsa en cuanto puede, que es justamente el efecto buscado.
  const costosRealesR = columnas.map((c) => c.costo);
  const costosFase1R = columnas.map((c) => (c.tipo === 'artificial' ? UNO : CERO));

  const penalizacion = d.objetivo === 'maximizar' ? negar(UNO) : UNO;
  const costosGranM = columnas.map((c) =>
    c.tipo === 'artificial' ? valorM(CERO, penalizacion) : valorM(c.costo),
  );

  const iteraciones: IteracionSimplex[] = [];
  const maxIteraciones = opciones.maxIteraciones ?? 4 * (nColumnas + estado.filas.length) + 60;
  let iteracionesFase1 = 0;
  let iteracionesFase2 = 0;
  let desenlace: DesenlaceSimplex = 'optima';
  let variableNoAcotada: string | null = null;

  /** Ejecuta una fase completa. Devuelve el motivo por el que terminó. */
  const correrFase = (
    fase: 1 | 2,
    costos: readonly ValorM[],
    sentido: Objetivo,
    permitida: boolean[],
    /** Gran M: una artificial que sale de la base ya no puede volver a entrar. */
    cerrarArtificiales = false,
  ): 'optimo' | 'no_acotado' | 'tope' => {
    let sinMejora = 0;
    let ultimoValor: ValorM | null = null;
    let numero = 0;

    for (;;) {
      const tab = instantanea(estado, costos);
      // La regla de Bland es más lenta, así que solo se activa cuando el valor
      // objetivo lleva varias iteraciones sin moverse: ese estancamiento es la
      // señal de degeneración que puede hacer ciclar a la regla de Dantzig.
      const bland = sinMejora > estado.filas.length + 2;
      const entra = elegirEntrante(tab.objetivo, sentido, permitida, bland);

      if (entra === null) {
        iteraciones.push({ fase, numero: numero + 1, tableau: tab, entra: null, sale: null, pivote: null, razones: [], regla: bland ? 'bland' : 'dantzig' });
        return 'optimo';
      }

      const { fila, razones } = elegirSaliente(estado, entra, columnas);
      if (fila === null) {
        iteraciones.push({ fase, numero: numero + 1, tableau: tab, entra, sale: null, pivote: null, razones, regla: bland ? 'bland' : 'dantzig' });
        variableNoAcotada = columnas[entra]!.etiqueta;
        return 'no_acotado';
      }

      const pivote = estado.filas[fila]![entra]!;
      iteraciones.push({ fase, numero: numero + 1, tableau: tab, entra, sale: fila, pivote, razones, regla: bland ? 'bland' : 'dantzig' });

      const columnaQueSale = estado.base[fila]!;
      pivotear(estado, fila, entra);
      if (cerrarArtificiales && columnas[columnaQueSale]!.tipo === 'artificial') {
        permitida[columnaQueSale] = false;
      }
      numero++;
      if (fase === 1) iteracionesFase1++;
      else iteracionesFase2++;

      const nuevoValor = filaObjetivo(estado, costos).valor;
      if (ultimoValor !== null && compararM(nuevoValor, ultimoValor) === 0) sinMejora++;
      else sinMejora = 0;
      ultimoValor = nuevoValor;

      if (iteracionesFase1 + iteracionesFase2 >= maxIteraciones) return 'tope';
    }
  };

  const permitidaFase1 = columnas.map(() => true);
  const permitidaFase2 = columnas.map((c) => c.tipo !== 'artificial');
  const permitidaGranM = columnas.map(() => true);

  const redundantes: number[] = [];

  /**
   * Saca de la base las artificiales que quedaron valiendo cero, sin mover el
   * vértice: se pivotea sobre cualquier columna real con coeficiente distinto
   * de cero, lo que da una razón mínima de cero y reordena la base sin cambiar
   * la solución. Si toda la fila es cero fuera de las artificiales, esa
   * restricción no aporta nada —es combinación lineal de las otras— y su fila
   * se retira para no arrastrar ceros por el resto del procedimiento.
   *
   * Los dos métodos lo necesitan igual, y por la misma razón: mientras una
   * artificial siga en la base, la fila objetivo arrastra su coeficiente y los
   * precios sombra no se pueden leer.
   */
  const limpiarArtificiales = (): string[] => {
    const expulsadas: string[] = [];

    for (let i = 0; i < estado.filas.length; i++) {
      const basica = columnas[estado.base[i]!]!;
      if (basica.tipo !== 'artificial') continue;

      let destino: number | null = null;
      for (let j = 0; j < nColumnas; j++) {
        if (columnas[j]!.tipo === 'artificial') continue;
        if (!esCero(estado.filas[i]![j]!)) {
          destino = j;
          break;
        }
      }

      if (destino === null) {
        redundantes.push(estado.restriccionDeFila[i]!);
        continue;
      }

      pivotear(estado, i, destino);
      expulsadas.push(`${basica.nombre} → ${columnas[destino]!.nombre}`);
    }

    if (redundantes.length > 0) {
      const filasVivas = estado.filas
        .map((_, i) => i)
        .filter((i) => columnas[estado.base[i]!]!.tipo !== 'artificial');
      estado.filas = filasVivas.map((i) => estado.filas[i]!);
      estado.ladoDerecho = filasVivas.map((i) => estado.ladoDerecho[i]!);
      estado.base = filasVivas.map((i) => estado.base[i]!);
      estado.restriccionDeFila = filasVivas.map((i) => estado.restriccionDeFila[i]!);

      for (const idx of redundantes) {
        diagnosticos.push(
          aviso(
            'SX_RESTRICCION_REDUNDANTE',
            `La restricción "${d.restricciones[idx]?.nombre ?? ''}" es redundante: es combinación lineal de las demás y no aporta información nueva. Se retira del tableau para no arrastrar una fila de ceros. Quitarla del modelo no cambia la solución.`,
            d.restricciones[idx]?.id,
          ),
        );
      }
    }

    return expulsadas;
  };

  /**
   * Recorrido del simplex revisado. Recorre exactamente los mismos vértices que
   * el tableau —mismas reglas de entrada y de salida— pero sin arrastrarlo: en
   * cada iteración calcula los multiplicadores `y = c_B B⁻¹`, valora con ellos
   * las columnas candidatas, y solo trae a la base la que entra.
   *
   * Al terminar deja el tableau materializado (`B⁻¹A`, `B⁻¹b`) para que toda la
   * lectura posterior —solución, precios sombra, sensibilidad— funcione igual
   * que con los otros métodos.
   */
  const correrRevisado = (
    fase: 1 | 2,
    costos: readonly Racional[],
    sentido: Objetivo,
    permitida: readonly boolean[],
  ): 'optimo' | 'no_acotado' | 'tope' | 'base_singular' => {
    let inv = inversaDeBase(matrizA, estado.base);
    if (inv === null) return 'base_singular';

    let numero = 0;
    let sinMejora = 0;
    let ultimoValor: Racional | null = null;

    const materializar = (): void => {
      estado.filas = cuerpoEnBase(inv!, matrizA);
      estado.ladoDerecho = porVector(inv!, vectorB);
    };

    for (;;) {
      // y = c_B B⁻¹, y con ellos el costo reducido de cada columna candidata.
      const costosBasicos = estado.base.map((j) => costos[j]!);
      const y = vectorPor(costosBasicos, inv);
      const valoresBasicos = porVector(inv, vectorB);

      const precios: { columna: number; valor: Racional }[] = [];
      for (let j = 0; j < nColumnas; j++) {
        if (!permitida[j] || estado.base.includes(j)) continue;
        const columnaOriginal = matrizA.map((f) => f[j]!);
        precios.push({ columna: j, valor: restar(escalar(y, columnaOriginal), costos[j]!) });
      }

      const bland = sinMejora > estado.filas.length + 2;
      const entra = elegirEntranteRevisado(precios, sentido, bland);

      const casillas = (conColumna: boolean): DetalleRevisado => ({
        inversa: inv!.map((f) => [...f]),
        multiplicadores: [...y],
        precios: precios.map((p) => ({ ...p })),
        valoresBasicos: [...valoresBasicos],
        columnaEntrante: conColumna && entra !== null ? porVector(inv!, matrizA.map((f) => f[entra]!)) : null,
        // B⁻¹ (m × m) más x_B y la columna entrante; el tableau actualizaría
        // todas sus casillas, m × (n + 1).
        casillasRevisado: estado.base.length * estado.base.length + 2 * estado.base.length,
        casillasTableau: estado.base.length * (nColumnas + 1),
      });

      if (entra === null) {
        materializar();
        iteraciones.push({
          fase,
          numero: numero + 1,
          tableau: instantanea(estado, costos.map((c) => valorM(c))),
          entra: null,
          sale: null,
          pivote: null,
          razones: [],
          regla: bland ? 'bland' : 'dantzig',
          revisada: casillas(false),
        });
        return 'optimo';
      }

      // B⁻¹A_e: la única columna que hace falta traer a la base.
      const columnaEntrante = porVector(inv, matrizA.map((f) => f[entra]!));
      const { fila, razones } = razonMinima(columnaEntrante, valoresBasicos, estado.base, columnas);

      materializar();
      const tableau = instantanea(estado, costos.map((c) => valorM(c)));

      if (fila === null) {
        iteraciones.push({ fase, numero: numero + 1, tableau, entra, sale: null, pivote: null, razones, regla: bland ? 'bland' : 'dantzig', revisada: casillas(true) });
        variableNoAcotada = columnas[entra]!.etiqueta;
        return 'no_acotado';
      }

      iteraciones.push({
        fase,
        numero: numero + 1,
        tableau,
        entra,
        sale: fila,
        pivote: columnaEntrante[fila]!,
        razones,
        regla: bland ? 'bland' : 'dantzig',
        revisada: casillas(true),
      });

      const siguiente = actualizarInversa(inv, columnaEntrante, fila);
      if (siguiente === null) return 'base_singular';
      inv = siguiente;
      estado.base[fila] = entra;

      numero++;
      if (fase === 1) iteracionesFase1++;
      else iteracionesFase2++;

      const valorAhora = escalar(
        estado.base.map((j) => costos[j]!),
        porVector(inv, vectorB),
      );
      if (ultimoValor !== null && comparar(valorAhora, ultimoValor) === 0) sinMejora++;
      else sinMejora = 0;
      ultimoValor = valorAhora;

      if (iteracionesFase1 + iteracionesFase2 >= maxIteraciones) {
        materializar();
        return 'tope';
      }
    }
  };

  const usaGranM = metodo === 'gran_m' && hayArtificiales;
  const usaDual = metodo === 'dual';
  const usaRevisado = metodo === 'revisado';
  // Arranca en 'optimo' porque el dual simplex, cuando llega hasta aquí, ya
  // terminó bien: sus dos salidas malas —tope e infactible— regresan antes.
  let fin2: 'optimo' | 'no_acotado' | 'tope' = 'optimo';

  /**
   * Recorrido del dual simplex. Cada iteración arregla la fila más infactible
   * sin perder la optimalidad, y termina cuando no queda ningún lado derecho
   * negativo.
   */
  const correrDual = (): 'optimo' | 'infactible' | 'tope' => {
    let numero = 0;

    for (;;) {
      const tab = instantanea(estado, costosReales);
      const fila = elegirSalienteDual(estado);

      if (fila === null) {
        iteraciones.push({ fase: 2, numero: numero + 1, tableau: tab, entra: null, sale: null, pivote: null, razones: [], regla: 'dantzig' });
        return 'optimo';
      }

      const { columna, razones } = elegirEntranteDual(estado, fila, tab.objetivo);
      if (columna === null) {
        iteraciones.push({ fase: 2, numero: numero + 1, tableau: tab, entra: null, sale: fila, pivote: null, razones, regla: 'dantzig' });
        return 'infactible';
      }

      const pivote = estado.filas[fila]![columna]!;
      iteraciones.push({ fase: 2, numero: numero + 1, tableau: tab, entra: columna, sale: fila, pivote, razones, regla: 'dantzig' });

      pivotear(estado, fila, columna);
      numero++;
      iteracionesFase2++;

      if (iteracionesFase2 >= maxIteraciones) return 'tope';
    }
  };

  // ── Dual simplex ─────────────────────────────────────────────────────────
  if (usaDual) {
    const infactibles = estado.ladoDerecho.filter(esNegativo).length;

    pasos.agregar({
      titulo: 'Comprobar que la base de holguras ya es óptima, aunque no sea factible',
      explicacion:
        'Aquí está la idea del método, que es la del primal al revés. El simplex primal arranca de una solución **factible** que no es óptima y va ' +
        'mejorando el objetivo sin salirse nunca de la región factible. El dual simplex arranca de una solución **óptima** que no es factible y va ' +
        'arreglando las restricciones sin perder nunca la optimalidad.\n\n' +
        `Con las holguras en la base, la fila objetivo vale −cⱼ en cada columna, y como todos los coeficientes ${d.objetivo === 'maximizar' ? 'son menores o iguales que cero' : 'son mayores o iguales que cero'} ` +
        'la prueba de optimalidad ya se cumple: ninguna columna mejora Z. Lo que falla es la factibilidad: ' +
        `${infactibles === 1 ? 'hay una fila con lado derecho negativo' : `hay ${infactibles} filas con lado derecho negativo`}, y una variable básica no puede valer un número negativo.\n\n` +
        '**Lo que se gana.** No hace falta ni una sola variable artificial, ni una fase previa, ni la constante M. Por eso el dual simplex es el ' +
        'método natural de los modelos de mínimo costo con requerimientos mínimos —raciones, mezclas, dietas—, donde todas las restricciones son ' +
        'de tipo ≥ y el objetivo tiene coeficientes positivos.',
      tabla: tablaTableau(instantanea(estado, costosReales), columnas, notacion, 'Z', null, null),
    });

    const marca = iteraciones.length;
    const finDual = correrDual();
    registrarIteracionesDual(pasos, iteraciones.slice(marca), columnas, notacion);

    if (finDual === 'tope') {
      diagnosticos.push(error('SX_TOPE_ITERACIONES', 'El dual simplex superó el número máximo de iteraciones sin llegar al óptimo. Revise los datos del modelo.'));
      return resultadoFallido(diagnosticos);
    }

    if (finDual === 'infactible') {
      const ultima = iteraciones[iteraciones.length - 1]!;
      const idRestriccion = estado.restriccionDeFila[ultima.sale!]!;
      const nombre = d.restricciones[idRestriccion]?.nombre ?? '';

      diagnosticos.push(
        error(
          'SX_INFACTIBLE',
          `La fila que arrastra la restricción "${nombre}" terminó con el lado derecho negativo y sin ningún coeficiente negativo con el que corregirlo. Después de los pivotes esa fila ya no es la restricción original sino una combinación de todas, y lo que afirma es que una suma de términos no negativos tiene que dar un número negativo. Es imposible: **no existe ningún punto que cumpla todas las restricciones a la vez**.`,
          d.restricciones[idRestriccion]?.id,
        ),
      );

      pasos.agregar({
        titulo: 'Comprobar la factibilidad',
        explicacion:
          `La fila que viene de "${nombre}" sigue con el lado derecho negativo, pero todos sus coeficientes son cero o positivos. Para arreglarla ` +
          'habría que pivotear sobre un coeficiente negativo, y no hay ninguno.\n\n' +
          'Conviene leerla con cuidado, porque después de los pivotes ya no es la restricción original: es una **combinación** de todas las ' +
          'restricciones del modelo. Y lo que afirma es que una suma de términos no negativos tiene que dar un número negativo, cosa imposible.\n\n' +
          'Esa fila es, por sí sola, el certificado de que el modelo es infactible. Es una ventaja del dual sobre los otros dos métodos: ellos ' +
          'dicen que no hay solución, este deja la prueba a la vista.',
        tabla: tablaTableau(instantanea(estado, costosReales), columnas, notacion, 'Z', null, null, ultima.sale),
      });

      return {
        datos: null,
        pasos: pasos.listar(),
        diagnosticos,
        interpretacion:
          `El modelo es infactible, y la restricción "${nombre}" lo demuestra por sí sola. Antes de volver a resolver hay que revisar el ` +
          'planteamiento, porque ningún método va a encontrar una solución que no existe.',
      };
    }

  }

  // ── Fase 1 ───────────────────────────────────────────────────────────────
  if (!usaDual && hayArtificiales && !usaGranM) {
    pasos.agregar({
      titulo: 'Fase 1 — construir una solución factible',
      explicacion:
        'Con variables artificiales en la base, la solución de arranque no es factible para el problema real: las artificiales valen algo, ' +
        'y eso representa una restricción que todavía no se cumple. La fase 1 minimiza **W**, la suma de las artificiales. Si W llega a cero, ' +
        'todas salieron y ya se tiene un vértice legítimo; si W se queda en un valor positivo, no existe ningún punto que cumpla todas las ' +
        'restricciones y el problema es infactible.',
      formula: `W = ${columnas.filter((c) => c.tipo === 'artificial').map((c) => c.nombre).join(' + ')}`,
      tabla: tablaTableau(instantanea(estado, costosFase1), columnas, notacion, 'W', null, null),
    });

    const fin = usaRevisado
      ? correrRevisado(1, costosFase1R, 'minimizar', permitidaFase1)
      : correrFase(1, costosFase1, 'minimizar', permitidaFase1);

    if (fin === 'base_singular') {
      diagnosticos.push(error('SX_BASE_SINGULAR', 'Las columnas de la base no son linealmente independientes, así que B no se puede invertir. Es un fallo interno del solucionador; no confíe en este resultado.'));
      return resultadoFallido(diagnosticos);
    }

    if (usaRevisado) registrarIteracionesRevisadas(pasos, iteraciones, columnas, notacion, 1, d);
    else registrarIteraciones(pasos, iteraciones, columnas, notacion, 1, 'W', d);

    const w = filaObjetivo(estado, costosFase1).valor;

    if (fin === 'tope') {
      diagnosticos.push(error('SX_TOPE_ITERACIONES', 'La fase 1 superó el número máximo de iteraciones. Revise los datos: es señal de un modelo mal planteado.'));
      return resultadoFallido(diagnosticos);
    }

    if (esPositivoM(w)) {
      diagnosticos.push(
        error(
          'SX_INFACTIBLE',
          `La fase 1 terminó con W = ${celdaM(w, notacion)} > 0: al menos una variable artificial no pudo salir de la base. Eso significa que **no existe ningún punto que cumpla todas las restricciones a la vez**. El modelo pide algo imposible: hay que revisar si dos exigencias se contradicen o si un mínimo exigido supera lo disponible.`,
        ),
      );
      pasos.agregar({
        titulo: 'Comprobar la factibilidad',
        explicacion:
          `El mínimo de W es ${celdaM(w, notacion)}, mayor que cero. No hay forma de expulsar todas las artificiales, y por lo tanto no hay ningún ` +
          `punto que satisfaga simultáneamente todas las restricciones. El procedimiento se detiene aquí: no es un fallo del método, es la ` +
          `respuesta del método —el modelo, tal como está escrito, no tiene solución—.`,
        valor: aNumero(w.a),
      });
      return {
        datos: null,
        pasos: pasos.listar(),
        diagnosticos,
        interpretacion:
          'El modelo es infactible: las restricciones se contradicen entre sí. Antes de volver a resolver hay que revisar el planteamiento, ' +
          'porque ningún método va a encontrar una solución que no existe.',
      };
    }

    const expulsadas = limpiarArtificiales();

    pasos.agregar({
      titulo: 'Fin de la fase 1 — la base ya es factible',
      explicacion:
        `W llegó a cero: todas las artificiales valen cero y el vértice actual cumple todas las restricciones. ` +
        (expulsadas.length > 0
          ? `Las artificiales que aún figuraban en la base se cambiaron por variables reales sin mover el vértice (${expulsadas.join(', ')}): un pivote de razón cero, que reordena la base sin cambiar la solución. `
          : '') +
        (redundantes.length > 0
          ? `Además, ${redundantes.length === 1 ? 'una restricción resultó' : `${redundantes.length} restricciones resultaron`} redundante${redundantes.length === 1 ? '' : 's'} y su fila se retiró del tableau. `
          : '') +
        `A partir de aquí las artificiales quedan prohibidas: nunca vuelven a entrar a la base.`,
      tabla: tablaTableau(instantanea(estado, costosReales), columnas, notacion, 'Z', null, null),
    });
  } else if (usaGranM) {
    const artificiales = columnas.filter((c) => c.tipo === 'artificial');
    const signo = d.objetivo === 'maximizar' ? '-' : '+';

    pasos.agregar({
      titulo: 'Penalizar las variables artificiales con la constante M',
      explicacion:
        'El método de la Gran M no resuelve un problema auxiliar: castiga las artificiales dentro de la **misma** función objetivo, con un ' +
        `coeficiente ${d.objetivo === 'maximizar' ? '−M, donde M es un número arbitrariamente grande. Producir una artificial destruiría una cantidad enorme de margen' : '+M, donde M es un número arbitrariamente grande. Cada artificial costaría una cantidad enorme'}, ` +
        'así que el algoritmo las expulsa de la base en cuanto puede. Si al terminar alguna sigue en la base con valor positivo, ni siquiera ' +
        'un castigo arbitrariamente grande logró sacarla: el problema es infactible.\n\n' +
        'Aquí M **no toma ningún valor numérico**. Cada casilla de la fila objetivo se lleva como `a + bM`, y para compararlas manda el ' +
        'coeficiente de M —«−3 − 2M es más negativo que −10 − M»—; solo cuando empata se mira la parte constante. Ese es el punto delicado ' +
        'del método a mano, y también la razón por la que darle a M un valor grande concreto es mala idea: si queda corto el resultado es ' +
        'incorrecto, y si queda enorme la parte real se pierde en el redondeo.',
      formula: objetivoTexConM(d, signo, artificiales.map((c) => c.nombre)),
      tabla: tablaTableau(instantanea(estado, costosGranM), columnas, notacion, 'Z', null, null),
    });
  } else if (usaRevisado) {
    pasos.agregar({
      titulo: 'Arrancar con B⁻¹ en lugar del tableau',
      explicacion:
        'El simplex revisado recorre exactamente los mismos vértices que el tableau, con las mismas reglas de entrada y de salida. Lo que ' +
        'cambia es lo que se guarda por el camino.\n\n' +
        'El tableau arrastra el cuerpo entero, `B⁻¹A`, y lo actualiza completo en cada pivote. El revisado guarda solo **B⁻¹**, una matriz ' +
        `de ${estado.filas.length} × ${estado.filas.length}, y calcula cada columna cuando la necesita: los multiplicadores para valorar, ` +
        'y `B⁻¹A_e` solo para la que entra. Como la base arranca siendo las holguras, **B⁻¹ empieza siendo la identidad**.\n\n' +
        'Es así como trabajan por dentro los solucionadores industriales, y por una razón práctica: en un modelo real hay muchas más ' +
        'variables que restricciones, así que mantener una matriz cuadrada del tamaño del número de restricciones cuesta mucho menos que ' +
        'arrastrar una tabla con una columna por variable.',
      formula: '\\mathbf{B}^{-1}\\mathbf{A} \\quad \\text{frente a} \\quad \\mathbf{B}^{-1}',
      tabla: tablaTableau(instantanea(estado, costosReales), columnas, notacion, 'Z', null, null),
    });
  } else if (!usaDual) {
    pasos.agregar({
      titulo: 'Construir el tableau inicial',
      explicacion:
        'Todas las restricciones son de tipo ≤ con lado derecho no negativo, así que las holguras forman por sí solas una base factible: ' +
        'el origen —no producir nada— cumple todas las restricciones. No hacen falta variables artificiales ni fase 1, y el procedimiento ' +
        'arranca directamente en la fase 2.',
      tabla: tablaTableau(instantanea(estado, costosReales), columnas, notacion, 'Z', null, null),
    });
  }

  // ── Fase 2, o el recorrido único de la Gran M ────────────────────────────
  if (!usaDual) {
    const marcaFase2 = iteraciones.length;
    const resultadoFase2 = usaRevisado
      ? correrRevisado(2, costosRealesR, d.objetivo, permitidaFase2)
      : usaGranM
        ? correrFase(2, costosGranM, d.objetivo, permitidaGranM, true)
        : correrFase(2, costosReales, d.objetivo, permitidaFase2);

    if (resultadoFase2 === 'base_singular') {
      diagnosticos.push(error('SX_BASE_SINGULAR', 'Las columnas de la base no son linealmente independientes, así que B no se puede invertir. Es un fallo interno del solucionador; no confíe en este resultado.'));
      return resultadoFallido(diagnosticos);
    }

    fin2 = resultadoFase2;
    if (usaRevisado) registrarIteracionesRevisadas(pasos, iteraciones.slice(marcaFase2), columnas, notacion, 2, d);
    else registrarIteraciones(pasos, iteraciones.slice(marcaFase2), columnas, notacion, 2, 'Z', d);
  }

  // La Gran M no tiene una fase aparte donde comprobar la factibilidad: la
  // respuesta aparece al final, en el valor que conservan las artificiales.
  if (usaGranM && fin2 === 'optimo') {
    const filaViva = estado.base.findIndex(
      (j, i) => columnas[j]!.tipo === 'artificial' && !esCero(estado.ladoDerecho[i]!),
    );

    if (filaViva !== -1) {
      const artificial = columnas[estado.base[filaViva]!]!;
      const cantidad = estado.ladoDerecho[filaViva]!;

      diagnosticos.push(
        error(
          'SX_INFACTIBLE',
          `El procedimiento terminó con la variable artificial ${artificial.nombre} todavía en la base y valiendo ${celda(cantidad, notacion)}. Ni siquiera una penalización arbitrariamente grande consiguió expulsarla, y eso significa que **no existe ningún punto que cumpla todas las restricciones a la vez**. El modelo pide algo imposible: hay que revisar si dos exigencias se contradicen o si un mínimo exigido supera lo disponible.`,
        ),
      );

      pasos.agregar({
        titulo: 'Comprobar la factibilidad',
        explicacion:
          `Ninguna columna mejora ya el objetivo, pero ${artificial.nombre} —la artificial de "${d.restricciones[artificial.restriccion ?? 0]?.nombre ?? ''}"— ` +
          `sigue en la base con valor ${celda(cantidad, notacion)}. Una artificial positiva significa que esa restricción no se cumple, y el castigo de M ` +
          `garantiza que el algoritmo la habría sacado si hubiera existido alguna forma de hacerlo. No la hay: el problema es infactible. ` +
          `El procedimiento se detiene aquí, y eso **es** la respuesta del método, no un fallo suyo.`,
        tabla: tablaTableau(instantanea(estado, costosGranM), columnas, notacion, 'Z', null, null),
        valor: aNumero(cantidad),
      });

      return {
        datos: null,
        pasos: pasos.listar(),
        diagnosticos,
        interpretacion:
          'El modelo es infactible: las restricciones se contradicen entre sí. Antes de volver a resolver hay que revisar el planteamiento, ' +
          'porque ningún método va a encontrar una solución que no existe.',
      };
    }

    const expulsadas = limpiarArtificiales();

    pasos.agregar({
      titulo: 'Retirar la penalización M',
      explicacion:
        'Todas las artificiales valen cero, así que ninguna aporta nada a Z y los términos en M desaparecen de la fila objetivo. ' +
        (expulsadas.length > 0
          ? `Las que seguían figurando en la base se cambiaron por variables reales sin mover el vértice (${expulsadas.join(', ')}): un pivote de razón cero. `
          : '') +
        (redundantes.length > 0
          ? `Además, ${redundantes.length === 1 ? 'una restricción resultó' : `${redundantes.length} restricciones resultaron`} redundante${redundantes.length === 1 ? '' : 's'} y su fila se retiró del tableau. `
          : '') +
        'Reescrita con la función objetivo real, la fila vuelve a ser la de siempre. El tableau limpio es el del paso siguiente: ' +
        'compárelo con el de la última iteración, donde las columnas artificiales todavía arrastraban su término en M.',
    });
  }

  if (fin2 === 'tope') {
    diagnosticos.push(error('SX_TOPE_ITERACIONES', 'El procedimiento superó el número máximo de iteraciones sin llegar al óptimo. Revise los datos del modelo.'));
    return resultadoFallido(diagnosticos);
  }

  if (iteraciones.some((x) => x.regla === 'bland')) {
    diagnosticos.push(
      nota(
        'SX_BLAND_ACTIVADA',
        'El valor objetivo se estancó durante varias iteraciones, señal de degeneración. Se cambió a la regla de Bland —entra siempre la variable de menor índice— que avanza más despacio pero garantiza que el método termina en lugar de ciclar entre las mismas bases.',
      ),
    );
  }

  const tableauFinal = instantanea(estado, costosReales);

  if (fin2 === 'no_acotado') {
    desenlace = 'no_acotada';
    diagnosticos.push(
      error(
        'SX_NO_ACOTADA',
        `La variable "${variableNoAcotada ?? ''}" puede crecer indefinidamente sin violar ninguna restricción, así que Z no tiene un valor óptimo finito. En un problema real eso siempre significa que falta una restricción: ningún recurso es infinito.`,
      ),
    );
    pasos.agregar({
      titulo: 'Detectar que el problema no está acotado',
      explicacion:
        `La columna de "${variableNoAcotada ?? ''}" mejora el objetivo, pero todos sus coeficientes en el cuerpo del tableau son cero o negativos: ` +
        `no hay ninguna fila que limite cuánto puede crecer, así que la prueba de la razón mínima se queda sin candidatos. ` +
        `Z crece sin límite. Esto no es un error de cálculo sino un diagnóstico del modelo: falta una restricción que en la realidad sí existe.`,
      tabla: tablaTableau(tableauFinal, columnas, notacion, 'Z', null, null),
    });

    return {
      datos: null,
      pasos: pasos.listar(),
      diagnosticos,
      interpretacion:
        `El modelo no está acotado: aumentando "${variableNoAcotada ?? ''}" el objetivo mejora sin fin. Antes de resolver hay que agregar la ` +
        `restricción que falta —capacidad de planta, demanda máxima del mercado, capital disponible—, porque en la realidad siempre hay un techo.`,
    };
  }

  // ── Lectura de la solución ───────────────────────────────────────────────
  const valorDeColumna = (j: number): Racional => {
    const fila = estado.base.indexOf(j);
    return fila === -1 ? CERO : estado.ladoDerecho[fila]!;
  };

  const valores: ValorColumna[] = columnas.map((c) => ({
    columna: c,
    valor: valorDeColumna(c.indice),
    basica: estado.base.includes(c.indice),
  }));

  const solucion = d.variables.map((v, j) => ({ variable: v, valor: valorDeColumna(j) }));

  // Z se recalcula desde los datos originales, no se lee del tableau: es una
  // comprobación independiente de todo el procedimiento.
  let valorOptimo = CERO;
  for (const { variable, valor } of solucion) {
    valorOptimo = sumar(valorOptimo, multiplicar(desdeNumero(variable.coeficiente) ?? CERO, valor));
  }

  if (comparar(valorOptimo, tableauFinal.valor.a) !== 0) {
    diagnosticos.push(
      error(
        'SX_INCOHERENCIA',
        `El valor de la fila objetivo (${celdaM(tableauFinal.valor, notacion)}) no coincide con el que resulta de sustituir la solución en la función objetivo (${celda(valorOptimo, notacion)}). Es un fallo interno del solucionador; no confíe en este resultado.`,
      ),
    );
  }

  // Precios sombra: en la columna que arrancó siendo el vector unitario de cada
  // fila, la fila objetivo guarda exactamente c_B B⁻¹e_i, que es ∂Z/∂b_i.
  const holguras: HolguraSimplex[] = d.restricciones.map((r, i) => {
    let consumo = CERO;
    r.coeficientes.forEach((c, j) => {
      consumo = sumar(consumo, multiplicar(desdeNumero(c) ?? CERO, solucion[j]?.valor ?? CERO));
    });

    const holgura = r.relacion === '>=' ? restar(consumo, desdeNumero(r.c) ?? CERO) : restar(desdeNumero(r.c) ?? CERO, consumo);

    const normal = normalizadas.find((f) => f.restriccion === i);
    const unitaria =
      normal === undefined
        ? null
        : normal.relacion === '<='
          ? columnaDe(columnas, 'holgura', i)
          : columnaDe(columnas, 'artificial', i);

    // Solo la parte constante: con la Gran M, la columna de una artificial
    // lleva además el término +M que introdujo la penalización, y ese término
    // no es parte del precio sombra.
    const viva = unitaria !== null && !redundantes.includes(i);
    const bruto = viva ? tableauFinal.objetivo[unitaria]!.a : CERO;
    const negada = normal?.negada === true;
    const precioSombra = negada ? negar(bruto) : bruto;

    return {
      restriccion: r,
      consumo,
      holgura,
      activa: esCero(holgura),
      precioSombra,
      columnaUnitaria: viva ? unitaria : null,
      negada,
    };
  });

  const degenerado = estado.ladoDerecho.some(esCero);
  if (degenerado) {
    diagnosticos.push(
      aviso(
        'SX_DEGENERADA',
        'La solución es degenerada: al menos una variable básica vale cero. Ocurre cuando más restricciones de las necesarias se cruzan en el mismo vértice. La solución es correcta, pero los precios sombra dejan de ser únicos y conviene interpretarlos con cautela.',
      ),
    );
  }

  // Óptimos alternativos: una columna no básica con z_j − c_j = 0 se puede
  // meter a la base sin cambiar Z. Solo cuenta si el pivote mueve de verdad el
  // vértice: con razón mínima cero se llega al mismo punto por otra base.
  const alternativas: string[] = [];
  for (const c of columnas) {
    if (c.tipo === 'artificial') continue;
    if (estado.base.includes(c.indice)) continue;
    if (!esCeroM(tableauFinal.objetivo[c.indice]!)) continue;
    const { fila, razones } = elegirSaliente(estado, c.indice, columnas);
    if (fila === null || esPositivo(razones[fila]!)) alternativas.push(c.etiqueta);
  }

  if (alternativas.length > 0) {
    desenlace = 'multiples';
    diagnosticos.push(
      nota(
        'SX_MULTIPLES_OPTIMOS',
        `Hay más de una solución óptima: ${alternativas.join(', ')} ${alternativas.length === 1 ? 'puede entrar' : 'pueden entrar'} a la base sin cambiar el valor de Z. Gerencialmente es una buena noticia: se puede elegir entre varios planes con el mismo resultado económico usando otro criterio —riesgo, clientes, mano de obra—.`,
      ),
    );
  }

  pasos.agregar({
    titulo: 'Leer la solución en el tableau final',
    explicacion:
      'Ninguna columna mejora ya el objetivo, así que el vértice actual es óptimo. Las variables que están en la base toman el valor de su ' +
      'lado derecho; todas las demás valen cero. Las holguras que quedaron en la base indican recursos que sobran, y las que salieron ' +
      'señalan los recursos agotados: esos son los que limitan el resultado.',
    tabla: tablaTableau(tableauFinal, columnas, notacion, 'Z', null, null),
    valor: aNumero(valorOptimo),
    unidad: d.unidadObjetivo,
  });

  pasos.agregar({
    titulo: 'Leer los precios sombra en la fila objetivo',
    explicacion:
      'El tableau final ya trae el análisis de sensibilidad: en la columna de la holgura de cada restricción, la fila objetivo guarda el ' +
      '**precio sombra** de ese recurso, es decir cuánto cambiaría Z por cada unidad adicional disponible. Un recurso que sobra tiene precio ' +
      'sombra cero, y por eso conseguir más de él no sirve de nada. Ese número es el precio máximo que conviene pagar por una unidad extra.',
    formula: 'y_i = \\frac{\\partial Z}{\\partial b_i}',
    tabla: {
      encabezados: ['Restricción', 'Consumo', 'Disponible', 'Holgura', 'Precio sombra', 'Lectura'],
      filas: holguras.map((h) => [
        h.restriccion.nombre,
        `${celda(h.consumo, notacion)} ${h.restriccion.unidad}`,
        `${formatearNumero(h.restriccion.c, { decimales: h.restriccion.c % 1 === 0 ? 0 : 2 })} ${h.restriccion.unidad}`,
        celda(h.holgura, notacion),
        celda(h.precioSombra, notacion),
        h.activa
          ? `Recurso agotado: cada unidad adicional aporta ${celda(h.precioSombra, notacion)} ${d.unidadObjetivo}.`
          : 'Sobra capacidad: conseguir más no cambia el resultado.',
      ]),
      resaltadas: holguras.map((h, i) => (h.activa ? i : -1)).filter((i) => i >= 0),
    },
  });

  return {
    datos: {
      datos: d,
      columnas,
      iteraciones,
      tableauFinal,
      desenlace,
      valores,
      solucion,
      valorOptimo,
      holguras,
      metodo,
      necesitaArtificiales: hayArtificiales,
      iteracionesFase1,
      iteracionesFase2,
      degenerado,
      alternativas,
      variableNoAcotada,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretar(d, solucion, valorOptimo, holguras, desenlace, degenerado, metodo, hayArtificiales, iteracionesFase1, iteracionesFase2),
  };
}

// ───────────────────────────── Redacción ─────────────────────────────

function nombreTex(nombre: string): string {
  return `\\text{${nombre}}`;
}

function objetivoTex(d: DatosSimplex): string {
  const partes = d.variables.map((v) =>
    v.coeficiente === 1
      ? nombreTex(v.nombre)
      : `${formatearNumero(v.coeficiente, { decimales: v.coeficiente % 1 === 0 ? 0 : 2 })}\\,${nombreTex(v.nombre)}`,
  );
  return `\\text{${d.objetivo === 'maximizar' ? 'Maximizar' : 'Minimizar'}} \\quad Z = ${partes.join(' + ')}`;
}

/**
 * La función objetivo con el término de penalización: `Max Z = 5 mesas + 5 sillas − M a3`.
 * El signo lo decide el sentido del problema: al maximizar la artificial resta,
 * al minimizar suma.
 */
function objetivoTexConM(d: DatosSimplex, signo: '+' | '-', artificiales: readonly string[]): string {
  // «a3» es un símbolo con subíndice, no una palabra: va sin \text{}.
  const simbolo = (nombre: string): string => nombre.replace(/^([a-z]+)(\d+)$/i, '$1_{$2}');
  const penalizacion = artificiales.map((nombre) => ` ${signo} M\\,${simbolo(nombre)}`).join('');
  return `${objetivoTex(d)}${penalizacion}`;
}

function expresionRestriccion(d: DatosSimplex, r: RestriccionSimplex): string {
  const terminos = r.coeficientes
    .map((c, j) => ({ c, nombre: d.variables[j]?.nombre ?? '' }))
    .filter((t) => t.c !== 0);

  // El signo va como operador entre términos —«12 mesas − 8 sillas»— y no
  // pegado al número después de un «+», que es como se lee de verdad una
  // restricción con coeficientes negativos.
  const izquierda =
    terminos.length === 0
      ? '0'
      : terminos
          .map((t, k) => {
            const magnitud = formatearNumero(Math.abs(t.c), { decimales: t.c % 1 === 0 ? 0 : 2 });
            if (k === 0) return `${t.c < 0 ? '−' : ''}${magnitud} ${t.nombre}`;
            return `${t.c < 0 ? '−' : '+'} ${magnitud} ${t.nombre}`;
          })
          .join(' ');

  return `${izquierda} ${SIMBOLO_RELACION[r.relacion]} ${formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })}`;
}

function registrarIteraciones(
  pasos: ConstructorPasos,
  iteraciones: readonly IteracionSimplex[],
  columnas: readonly ColumnaSimplex[],
  notacion: Notacion,
  fase: 1 | 2,
  etiqueta: string,
  d: DatosSimplex,
): void {
  const n = (r: Racional): string => celda(r, notacion);
  const nM = (v: ValorM): string => celdaM(v, notacion);
  for (const it of iteraciones) {
    if (it.fase !== fase) continue;
    if (it.entra === null) continue; // el tableau óptimo se muestra en su propio paso

    const entrante = columnas[it.entra]!;
    const valorEntrante = it.tableau.objetivo[it.entra]!;
    const criterio =
      fase === 1
        ? 'como en la fase 1 se minimiza W, entra la columna con el valor más positivo'
        : d.objetivo === 'maximizar'
          ? 'al maximizar, entra la columna con el valor más negativo: es la que más aumenta Z por cada unidad que crece'
          : 'al minimizar, entra la columna con el valor más positivo: es la que más reduce Z por cada unidad que crece';

    if (it.sale === null) {
      pasos.agregar({
        titulo: `${fase === 1 ? 'Fase 1 · i' : 'I'}teración ${it.numero} — la columna no tiene tope`,
        explicacion:
          `Entra "${entrante.etiqueta}" (${entrante.nombre}), pero ningún coeficiente de su columna es positivo, así que ninguna fila la frena. ` +
          `La prueba de la razón mínima se queda sin candidatos.`,
        tabla: tablaTableau(it.tableau, columnas, notacion, etiqueta, it.entra, it.razones),
      });
      continue;
    }

    const saliente = columnas[it.tableau.base[it.sale]!]!;
    const razon = it.razones[it.sale] ?? null;

    pasos.agregar({
      titulo: `${fase === 1 ? 'Fase 1 · i' : 'I'}teración ${it.numero} — entra ${entrante.nombre}, sale ${saliente.nombre}`,
      explicacion:
        `**Quién entra.** En la fila ${etiqueta} el valor de ${entrante.nombre} es ${nM(valorEntrante)}: ${criterio}. ` +
        `Producir "${entrante.etiqueta}" conviene, así que esa variable pasa a la base.\n\n` +
        `**Quién sale.** Se divide cada lado derecho entre el coeficiente positivo de esa columna. La menor razón es ` +
        `${razon === null ? '—' : n(razon)}, en la fila de ${saliente.nombre}: esa es la variable que llega primero a cero, ` +
        `y si se creciera más allá se volvería negativa, que es imposible. Las filas con coeficiente cero o negativo no limitan nada y por eso no dan razón.\n\n` +
        `**Pivote.** El elemento en el cruce vale ${it.pivote === null ? '—' : n(it.pivote)}. Se divide toda su fila entre él para dejar un 1, ` +
        `y se restan múltiplos de esa fila a las demás hasta dejar ceros en el resto de la columna.` +
        (it.regla === 'bland'
          ? '\n\nEsta iteración usó la regla de Bland (entra la de menor índice) porque el objetivo llevaba varias iteraciones sin moverse.'
          : ''),
      formula: '\\text{razón}_i = \\frac{b_i}{a_{i\\,e}} \\quad \\text{con } a_{i\\,e} > 0',
      tabla: tablaTableau(it.tableau, columnas, notacion, etiqueta, it.entra, it.razones, it.sale),
    });
  }
}

/**
 * Los pasos del simplex revisado. Cada iteración se cuenta en dos mitades,
 * como se hace a mano: primero se valoran las columnas con los multiplicadores,
 * y después se trae a la base solo la que entra.
 */
function registrarIteracionesRevisadas(
  pasos: ConstructorPasos,
  iteraciones: readonly IteracionSimplex[],
  columnas: readonly ColumnaSimplex[],
  notacion: Notacion,
  fase: 1 | 2,
  d: DatosSimplex,
): void {
  const n = (r: Racional): string => celda(r, notacion);
  const prefijo = fase === 1 ? 'Fase 1 · i' : 'I';

  for (const it of iteraciones) {
    if (it.fase !== fase) continue;
    const r = it.revisada;
    if (r === undefined) continue;
    if (it.entra === null) continue; // el tableau óptimo tiene su propio paso

    const entrante = columnas[it.entra]!;
    const criterio =
      fase === 1
        ? 'como en la fase 1 se minimiza W, entra la de valor más positivo'
        : d.objetivo === 'maximizar'
          ? 'al maximizar entra la de valor más negativo'
          : 'al minimizar entra la de valor más positivo';

    // ── Mitad A: valorar las columnas ──
    pasos.agregar({
      titulo: `${prefijo}teración ${it.numero} — valorar las columnas con los multiplicadores`,
      explicacion:
        `**Los multiplicadores.** Se calcula \`y = c_B B⁻¹\`, un vector con una componente por restricción: ` +
        `y = (${r.multiplicadores.map(n).join('; ')}). ` +
        (fase === 2
          ? 'Estos números son los precios sombra de la base actual: el análisis de sensibilidad no espera al final, está disponible en cada iteración.\n\n'
          : 'En la fase 1 miden cuánto contribuye cada restricción a la infactibilidad que falta por eliminar.\n\n') +
        `**Valorar.** Con \`y\` ya se puede calcular el costo reducido de cualquier columna sin tocar el resto del tableau: ` +
        `\`z_j − c_j = y · A_j − c_j\`, un producto escalar por columna. Se valoraron ${r.precios.length}, y ${criterio}: ` +
        `gana ${entrante.nombre} (${entrante.etiqueta}).\n\n` +
        `Aquí está la diferencia con el tableau: allá había que actualizar las ${r.casillasTableau} casillas del cuerpo en cada pivote; ` +
        `aquí solo se mantienen las ${r.casillasRevisado} de B⁻¹, x_B y la columna entrante. La ventaja crece cuando hay muchas más ` +
        `variables que restricciones, que es el caso normal en la práctica.`,
      formula: '\\mathbf{y} = \\mathbf{c}_B \\mathbf{B}^{-1} \\qquad z_j - c_j = \\mathbf{y} \\cdot \\mathbf{A}_j - c_j',
      tabla: {
        encabezados: ['Columna', 'Representa', `c_j`, `y · A_j`, `z_j − c_j`],
        filas: r.precios.map((p) => {
          const c = columnas[p.columna]!;
          return [
            c.indice === it.entra ? `↓ ${c.nombre}` : c.nombre,
            c.etiqueta,
            n(c.costo),
            n(sumar(p.valor, c.costo)),
            n(p.valor),
          ];
        }),
        resaltadas: r.precios.map((p, i) => (p.columna === it.entra ? i : -1)).filter((i) => i >= 0),
      },
    });

    // ── Mitad B: traer la columna y hacer la prueba de la razón ──
    if (it.sale === null) {
      pasos.agregar({
        titulo: `${prefijo}teración ${it.numero} — la columna no tiene tope`,
        explicacion:
          `Se calcula \`B⁻¹A_e\` para "${entrante.etiqueta}" y ningún coeficiente resulta positivo: ninguna fila la frena, ` +
          `así que la prueba de la razón mínima se queda sin candidatos.`,
      });
      continue;
    }

    const saliente = columnas[it.tableau.base[it.sale]!]!;
    const razon = it.razones[it.sale] ?? null;
    const columnaEntrante = r.columnaEntrante ?? [];

    pasos.agregar({
      titulo: `${prefijo}teración ${it.numero} — entra ${entrante.nombre}, sale ${saliente.nombre}`,
      explicacion:
        `**Traer la columna.** Solo ahora se calcula \`B⁻¹A_e\`, la columna entrante expresada en la base actual. Es la única del ` +
        `modelo que hace falta traducir: las demás se quedaron sin tocar.\n\n` +
        `**La razón mínima.** Se divide cada valor básico \`x_B = B⁻¹b\` entre su coeficiente positivo en esa columna. La menor razón es ` +
        `${razon === null ? '—' : n(razon)}, en la fila de ${saliente.nombre}: esa variable es la primera que llegaría a cero.\n\n` +
        `**Actualizar B⁻¹.** En vez de pivotear el tableau entero, se aplican las mismas operaciones de fila sobre B⁻¹, que es una matriz ` +
        `de ${columnaEntrante.length} × ${columnaEntrante.length}. El elemento pivote vale ${it.pivote === null ? '—' : n(it.pivote)}.`,
      formula: '\\bar{\\mathbf{a}}_e = \\mathbf{B}^{-1}\\mathbf{A}_e \\qquad \\mathbf{x}_B = \\mathbf{B}^{-1}\\mathbf{b}',
      tabla: {
        encabezados: [
          'Base',
          ...r.inversa.map((_, j) => `B⁻¹ · ${j + 1}`),
          'x_B = B⁻¹b',
          `B⁻¹A_e (${entrante.nombre})`,
          'Razón',
        ],
        filas: r.inversa.map((filaInv, i) => [
          columnas[it.tableau.base[i]!]!.nombre,
          ...filaInv.map(n),
          n(r.valoresBasicos[i]!),
          columnaEntrante[i] === undefined ? '—' : n(columnaEntrante[i]!),
          it.razones[i] == null ? '—' : n(it.razones[i]!),
        ]),
        resaltadas: [it.sale],
      },
    });
  }
}

/**
 * Los pasos del dual simplex. El orden de las dos decisiones está invertido
 * respecto del primal, y por eso merece su propia redacción: aquí se elige
 * primero la fila y después la columna.
 */
function registrarIteracionesDual(
  pasos: ConstructorPasos,
  iteraciones: readonly IteracionSimplex[],
  columnas: readonly ColumnaSimplex[],
  notacion: Notacion,
): void {
  const n = (r: Racional): string => celda(r, notacion);
  const nM = (v: ValorM): string => celdaM(v, notacion);

  for (const it of iteraciones) {
    if (it.sale === null) continue; // el tableau ya factible se muestra en su propio paso
    if (it.entra === null) continue; // la fila sin coeficiente negativo, también

    const saliente = columnas[it.tableau.base[it.sale]!]!;
    const entrante = columnas[it.entra]!;
    const ladoDerecho = it.tableau.ladoDerecho[it.sale]!;
    const coeficiente = it.tableau.filas[it.sale]![it.entra]!;
    const razon = it.razones[it.entra] ?? null;

    const candidatas = it.razones
      .map((r, j) => (r === null ? null : `${columnas[j]!.nombre}: ${n(r)}`))
      .filter((x): x is string => x !== null);

    pasos.agregar({
      titulo: `Iteración ${it.numero} — sale ${saliente.nombre}, entra ${entrante.nombre}`,
      explicacion:
        `**Quién sale.** Se elige la fila con el lado derecho más negativo, que es la que más lejos está de cumplirse: ` +
        `${saliente.nombre} vale ${n(ladoDerecho)}, y una variable básica no puede ser negativa. Esa restricción es la que hay que arreglar primero.\n\n` +
        `**Quién entra.** Solo sirven las columnas con coeficiente **negativo** en esa fila: pivotear sobre un negativo es lo que convierte el lado ` +
        `derecho negativo en positivo. Entre ellas se toma la de menor razón |(zⱼ − cⱼ) ÷ aᵣⱼ| —el valor de la fila objetivo dividido entre ese coeficiente, en valor absoluto—, que es lo que impide perder la optimalidad por el ` +
        `camino${candidatas.length > 0 ? ` (${candidatas.join(', ')})` : ''}. Gana ${entrante.nombre} con ${razon === null ? '—' : n(razon)}, ` +
        `porque en la fila objetivo vale ${nM(it.tableau.objetivo[it.entra]!)} y en esta fila ${n(coeficiente)}.\n\n` +
        `**Pivote.** El elemento en el cruce vale ${it.pivote === null ? '—' : n(it.pivote)}. Se pivotea igual que en el primal: se divide toda la ` +
        `fila entre él y se hacen ceros en el resto de la columna. Después de este pivote esa restricción ya se cumple, y el objetivo sigue siendo óptimo.`,
      formula: '\\text{razón}_j = \\left| \\frac{z_j - c_j}{a_{r\\,j}} \\right| \\quad \\text{con } a_{r\\,j} < 0',
      tabla: tablaTableau(it.tableau, columnas, notacion, 'Z', it.entra, null, it.sale, it.razones),
    });
  }
}

function interpretar(
  d: DatosSimplex,
  solucion: readonly { readonly variable: VariableSimplex; readonly valor: Racional }[],
  valorOptimo: Racional,
  holguras: readonly HolguraSimplex[],
  desenlace: DesenlaceSimplex,
  degenerado: boolean,
  metodo: MetodoSimplex,
  necesitaArtificiales: boolean,
  it1: number,
  it2: number,
): string {
  const plan = solucion
    .map((s) => `${formatearNumero(aNumero(s.valor), { decimales: 2 })} ${s.variable.nombre}`)
    .join(', ');

  const activas = holguras.filter((h) => h.activa);
  const sobrantes = holguras.filter((h) => !h.activa);

  const masValioso = activas.reduce<HolguraSimplex | null>(
    (mejor, h) => (mejor === null || comparar(h.precioSombra, mejor.precioSombra) > 0 ? h : mejor),
    null,
  );

  const partes: string[] = [];

  partes.push(
    `El plan óptimo es producir ${plan}, con ${d.nombreObjetivo} de ${formatearNumero(aNumero(valorOptimo), { decimales: 2 })} ${d.unidadObjetivo}.`,
  );

  const veces = (n: number): string => `${n} ${n === 1 ? 'iteración' : 'iteraciones'}`;

  partes.push(
    metodo === 'revisado'
      ? `El simplex revisado llegó al óptimo en ${veces(it2)}${necesitaArtificiales ? ` —más ${veces(it1)} de fase 1—` : ''} sin arrastrar el tableau: en cada paso solo mantuvo B⁻¹ y calculó las columnas que hacían falta. Recorrió exactamente los mismos vértices que el método corriente.`
      : metodo === 'dual'
        ? `El dual simplex llegó al óptimo en ${veces(it2)} sin usar una sola variable artificial: arrancó de una base que ya era óptima pero no factible, y fue arreglando una restricción por iteración.`
        : !necesitaArtificiales
        ? `El procedimiento llegó al óptimo en ${veces(it2)}, arrancando desde el origen: como todas las restricciones son de tipo ≤, las holguras ya formaban una base factible.`
        : metodo === 'gran_m'
          ? `El modelo tiene restricciones ≥ o =, así que necesitó variables artificiales. Penalizadas con la Gran M, el procedimiento las expulsó y llegó al óptimo en ${veces(it2)}.`
          : `El modelo tiene restricciones ≥ o =, así que necesitó dos fases: ${veces(it1)} para conseguir una solución factible y ${veces(it2)} para optimizarla.`,
  );

  if (activas.length > 0) {
    partes.push(
      `Los recursos que limitan la operación son ${activas.map((h) => h.restriccion.nombre.toLowerCase()).join(' y ')}: se agotan por completo.` +
        (masValioso !== null && esPositivo(masValioso.precioSombra)
          ? ` El más valioso es ${masValioso.restriccion.nombre.toLowerCase()}, con un precio sombra de ${formatearNumero(aNumero(masValioso.precioSombra), { decimales: 4 })} ${d.unidadObjetivo} por unidad: ese es el precio máximo que conviene pagar por conseguir una unidad más.`
          : ''),
    );
  }

  if (sobrantes.length > 0) {
    partes.push(
      `En cambio sobra capacidad de ${sobrantes.map((h) => h.restriccion.nombre.toLowerCase()).join(' y ')}. Su precio sombra es cero: invertir ahí no mejora el resultado en nada, por más que parezcan recursos importantes.`,
    );
  }

  if (desenlace === 'multiples') {
    partes.push(
      'Existe más de un plan que alcanza el mismo valor óptimo, así que la gerencia puede elegir entre ellos por criterios que el modelo no recoge.',
    );
  } else {
    partes.push('La solución es única: cualquier otro plan factible da un resultado peor.');
  }

  if (degenerado) {
    partes.push(
      'La solución es degenerada —una variable básica vale cero—, lo que suele indicar que hay restricciones de sobra cruzándose en el mismo vértice. Conviene revisar si alguna es innecesaria.',
    );
  }

  return partes.join(' ');
}

// ───────────────────────────── Utilidades para la interfaz ─────────────────────────────

/** Convierte un modelo de dos variables del método gráfico al formato del simplex. */
export function desdeGrafico(
  objetivo: Objetivo,
  nombreX: string,
  nombreY: string,
  coefX: number,
  coefY: number,
  restricciones: readonly { id: string; nombre: string; a: number; b: number; relacion: Relacion; c: number; unidad: string }[],
): Pick<DatosSimplex, 'objetivo' | 'variables' | 'restricciones'> {
  return {
    objetivo,
    variables: [
      { id: 'x1', nombre: nombreX, coeficiente: coefX },
      { id: 'x2', nombre: nombreY, coeficiente: coefY },
    ],
    restricciones: restricciones.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      coeficientes: [r.a, r.b],
      relacion: r.relacion,
      c: r.c,
      unidad: r.unidad,
    })),
  };
}

/** Cuenta cuántas variables de cada tipo tiene el modelo en forma estándar. */
export function resumenColumnas(columnas: readonly ColumnaSimplex[]): Record<TipoColumna, number> {
  return {
    decision: columnas.filter((c) => c.tipo === 'decision').length,
    holgura: columnas.filter((c) => c.tipo === 'holgura').length,
    exceso: columnas.filter((c) => c.tipo === 'exceso').length,
    artificial: columnas.filter((c) => c.tipo === 'artificial').length,
  };
}
