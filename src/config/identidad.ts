/**
 * Archivo central de identidad de la aplicación.
 *
 * Todo lo que define la marca, la institución, el autor, los colores y las
 * unidades por defecto vive aquí. Cambiar este archivo cambia la aplicación
 * completa: encabezados, reportes, exportaciones, manifiesto y créditos.
 *
 * No se incluye el logotipo oficial de la Universidad Nacional de Agricultura
 * porque no fue suministrado entre los materiales. El espacio está reservado:
 * coloque el archivo en `public/logo-institucion.svg` (o .png) y escriba la
 * ruta en `institucion.logo`.
 */

export interface Identidad {
  readonly nombre: string;
  readonly subtitulo: string;
  readonly version: string;
  readonly logo: string | null;
  readonly autor: Autor;
  readonly institucion: Institucion;
  readonly curso: Curso;
  readonly localizacion: Localizacion;
  readonly colores: Colores;
}

export interface Autor {
  readonly nombre: string;
  readonly titulo: string;
  readonly correo: string | null;
  readonly orcid: string | null;
}

export interface Institucion {
  readonly nombre: string;
  readonly siglas: string;
  readonly logo: string | null;
  readonly ciudad: string;
  readonly departamento: string;
  readonly pais: string;
}

export interface Curso {
  readonly nombre: string;
  readonly codigo: string;
  readonly periodo: string;
  readonly anio: number;
}

export interface Localizacion {
  readonly idioma: string;
  readonly monedaPredeterminada: CodigoMoneda;
  readonly separadorDecimal: string;
  readonly separadorMiles: string;
  readonly decimalesPredeterminados: number;
}

export type CodigoMoneda = 'HNL' | 'USD';

export interface Colores {
  /** Azul profundo: rigor académico. Color primario. */
  readonly primario: string;
  /** Verde esmeralda: producción y contexto agropecuario. */
  readonly produccion: string;
  /** Ámbar: elementos críticos y resultados destacados. */
  readonly critico: string;
}

/** Metadatos de cada moneda soportada. Nunca se mezclan en un mismo cálculo. */
export const MONEDAS: Record<CodigoMoneda, { simbolo: string; nombre: string; plural: string }> = {
  HNL: { simbolo: 'L', nombre: 'lempira hondureño', plural: 'lempiras' },
  USD: { simbolo: 'US$', nombre: 'dólar estadounidense', plural: 'dólares' },
};

export const IDENTIDAD: Identidad = {
  nombre: 'OPTIAULA IO',
  subtitulo: 'Laboratorio Interactivo de Investigación de Operaciones',
  version: '1.0.0',
  logo: null,

  autor: {
    nombre: 'Gustavo Alonso Ardón',
    titulo: 'Profesor',
    correo: null,
    orcid: null,
  },

  institucion: {
    nombre: 'Universidad Nacional de Agricultura',
    siglas: 'UNAG',
    // Reservado: coloque aquí la ruta del logotipo oficial cuando esté disponible.
    logo: null,
    ciudad: 'Catacamas',
    departamento: 'Olancho',
    pais: 'Honduras',
  },

  curso: {
    nombre: 'Investigación de Operaciones',
    codigo: '',
    periodo: '',
    anio: 2026,
  },

  localizacion: {
    idioma: 'es',
    monedaPredeterminada: 'HNL',
    separadorDecimal: ',',
    separadorMiles: ' ',
    decimalesPredeterminados: 2,
  },

  colores: {
    primario: '#123a5e',
    produccion: '#0f7a5a',
    critico: '#b7791f',
  },
};

/** Cadena de ubicación lista para encabezados y reportes. */
export function ubicacionCompleta(i: Identidad = IDENTIDAD): string {
  return `${i.institucion.ciudad}, ${i.institucion.departamento}, ${i.institucion.pais}`;
}

/** Pie de página normalizado para todos los reportes exportables. */
export function pieDeReporte(i: Identidad = IDENTIDAD): string {
  return `${i.nombre} v${i.version} · ${i.institucion.nombre} · ${ubicacionCompleta(i)}`;
}
