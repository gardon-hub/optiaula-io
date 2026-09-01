/**
 * Tipos compartidos por todo el motor matemático.
 *
 * Cada solucionador devuelve tres cosas: el resultado, la secuencia de pasos
 * que lo explica y los diagnósticos que el docente debe conocer. La interfaz
 * nunca calcula: solo dibuja lo que el motor produjo.
 */

/** Gravedad de un diagnóstico emitido por el motor. */
export type Gravedad = 'error' | 'aviso' | 'nota';

/**
 * Hallazgo del motor sobre los datos o el resultado.
 * `error` impide resolver; `aviso` advierte de algo que el estudiante debe
 * saber (degeneración, empates); `nota` es información didáctica.
 */
export interface Diagnostico {
  readonly gravedad: Gravedad;
  readonly codigo: string;
  readonly mensaje: string;
  /** Referencia opcional a la celda, actividad o fila implicada. */
  readonly referencia?: string;
}

export function error(codigo: string, mensaje: string, referencia?: string): Diagnostico {
  return referencia === undefined
    ? { gravedad: 'error', codigo, mensaje }
    : { gravedad: 'error', codigo, mensaje, referencia };
}

export function aviso(codigo: string, mensaje: string, referencia?: string): Diagnostico {
  return referencia === undefined
    ? { gravedad: 'aviso', codigo, mensaje }
    : { gravedad: 'aviso', codigo, mensaje, referencia };
}

export function nota(codigo: string, mensaje: string, referencia?: string): Diagnostico {
  return referencia === undefined
    ? { gravedad: 'nota', codigo, mensaje }
    : { gravedad: 'nota', codigo, mensaje, referencia };
}

export function hayErrores(diagnosticos: readonly Diagnostico[]): boolean {
  return diagnosticos.some((d) => d.gravedad === 'error');
}

/**
 * Un paso del procedimiento, pensado para el modo proyección y para la
 * práctica guiada: título corto, explicación del *porqué*, y una tabla o
 * matriz opcional que la interfaz sabe dibujar.
 */
export interface Paso {
  readonly numero: number;
  readonly titulo: string;
  /** Por qué se hace esta operación, en lenguaje del estudiante. */
  readonly explicacion: string;
  /** Fórmula en notación KaTeX, sin delimitadores. */
  readonly formula?: string;
  /** Tabla auxiliar que acompaña al paso. */
  readonly tabla?: TablaPaso;
  /** Matriz numérica destacada (reducciones, ajustes, asignaciones). */
  readonly matriz?: MatrizPaso;
  /** Resultado numérico del paso, si lo tiene. */
  readonly valor?: number;
  readonly unidad?: string;
}

export interface TablaPaso {
  readonly encabezados: readonly string[];
  readonly filas: readonly (readonly string[])[];
  /** Índices de fila que deben resaltarse. */
  readonly resaltadas?: readonly number[];
  readonly pie?: readonly string[];
  /**
   * Segunda fila de pie. La usa el dual simplex para poner las razones debajo
   * de la fila objetivo, que es donde las escribe el libro: ahí la razón se
   * calcula por columna, no por fila.
   */
  readonly pieAdicional?: readonly string[];
}

export interface MatrizPaso {
  readonly filas: readonly string[];
  readonly columnas: readonly string[];
  readonly valores: readonly (readonly (number | null)[])[];
  /** Celdas marcadas como seleccionadas (asignaciones, envíos). */
  readonly seleccionadas?: readonly CeldaRef[];
  /** Celdas marcadas como cubiertas o tachadas. */
  readonly cubiertas?: readonly CeldaRef[];
  /** Filas cubiertas por una línea completa. */
  readonly filasCubiertas?: readonly number[];
  /** Columnas cubiertas por una línea completa. */
  readonly columnasCubiertas?: readonly number[];
  /** Texto sobreimpreso por celda (cantidad enviada, por ejemplo). */
  readonly etiquetas?: Readonly<Record<string, string>>;
}

export interface CeldaRef {
  readonly fila: number;
  readonly columna: number;
}

export function claveCelda(fila: number, columna: number): string {
  return `${fila}:${columna}`;
}

/** Envoltura común de todo resultado del motor. */
export interface Resultado<T> {
  /** `null` cuando los diagnósticos contienen al menos un error. */
  readonly datos: T | null;
  readonly pasos: readonly Paso[];
  readonly diagnosticos: readonly Diagnostico[];
  /** Lectura gerencial del resultado, en prosa. */
  readonly interpretacion: string;
}

export function resultadoFallido<T>(diagnosticos: readonly Diagnostico[]): Resultado<T> {
  return {
    datos: null,
    pasos: [],
    diagnosticos,
    interpretacion: 'No fue posible resolver el problema con los datos suministrados.',
  };
}

/** Constructor incremental de pasos: mantiene la numeración correlativa. */
export class ConstructorPasos {
  private readonly pasos: Paso[] = [];

  agregar(paso: Omit<Paso, 'numero'>): this {
    this.pasos.push({ numero: this.pasos.length + 1, ...paso });
    return this;
  }

  listar(): readonly Paso[] {
    return this.pasos;
  }
}

/** Objetivo de un modelo de optimización. */
export type Objetivo = 'minimizar' | 'maximizar';

/** Métrica de distancia sobre una cuadrícula. */
/**
 * `pasillo` es la métrica de los almacenes: el material viaja por el corredor
 * central, así que solo cuenta el avance a lo largo de él. Dos bloques a la
 * misma profundidad, uno a cada lado del pasillo, están a la misma distancia de
 * la plataforma. Es lo que hace la presentación de Distribución Física I.
 */
export type TipoDistancia = 'rectilinea' | 'euclidiana' | 'pasillo';

export interface Punto {
  readonly x: number;
  readonly y: number;
}

/** Distancia rectilínea (Manhattan) entre dos puntos de la cuadrícula. */
export function distanciaRectilinea(a: Punto, b: Punto): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Distancia euclidiana (línea recta) entre dos puntos de la cuadrícula. */
export function distanciaEuclidiana(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distancia a lo largo del pasillo: solo cuenta el avance en columnas. */
export function distanciaPasillo(a: Punto, b: Punto): number {
  return Math.abs(a.x - b.x);
}

export function distancia(a: Punto, b: Punto, tipo: TipoDistancia): number {
  if (tipo === 'rectilinea') return distanciaRectilinea(a, b);
  if (tipo === 'pasillo') return distanciaPasillo(a, b);
  return distanciaEuclidiana(a, b);
}
