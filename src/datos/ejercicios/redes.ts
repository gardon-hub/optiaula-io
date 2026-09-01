/**
 * Ejercicios de CPM y PERT.
 *
 * CPM: los cinco problemas de `Diagrama de redes y ruta critica.docx` (julio 2025).
 * PERT: los tres problemas de `Ejercicios de Pert.docx` (agosto 2025).
 */

import type { Actividad } from '@/nucleo/cpm';
import type { ActividadComprimible } from '@/nucleo/crashing';
import { plazoParaConfianza, probabilidadPlazo, type ActividadPERT } from '@/nucleo/pert';
import { preguntasCPM, preguntasCrashing, preguntasPERT } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio } from '@/esquemas';

// ───────────────────────────── CPM ─────────────────────────────

interface SemillaCPM {
  readonly n: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly unidadTiempo: string;
  readonly actividades: readonly (Actividad & Partial<Omit<ActividadComprimible, keyof Actividad>>)[];
  readonly preguntaExtra?: string;
  /** Solo en los ejercicios de compresión. */
  readonly costoIndirectoPorPeriodo?: number;
  readonly moneda?: 'HNL' | 'USD';
  readonly metodo?: string;
  readonly minutos?: number;
  readonly derivado?: boolean;
  readonly notasDocente?: string;
  readonly inconsistencias?: readonly string[];
}

const CPM: readonly SemillaCPM[] = [
  {
    n: 1,
    titulo: 'Construcción de una planta procesadora de lácteos',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    enunciado:
      'Una empresa construirá una planta procesadora de lácteos. La tabla lista las actividades del proyecto, sus ' +
      'predecesoras y su duración en semanas.',
    unidadTiempo: 'semanas',
    actividades: [
      { id: 'A', descripcion: 'Estudios de factibilidad', predecesoras: [], duracion: 5 },
      { id: 'B', descripcion: 'Diseño arquitectónico', predecesoras: ['A'], duracion: 4 },
      { id: 'C', descripcion: 'Adquisición de permisos', predecesoras: ['A'], duracion: 3 },
      { id: 'D', descripcion: 'Movimiento de tierra', predecesoras: ['B'], duracion: 6 },
      { id: 'E', descripcion: 'Instalación de cimentación', predecesoras: ['D'], duracion: 5 },
      { id: 'F', descripcion: 'Construcción de estructura', predecesoras: ['E'], duracion: 7 },
      { id: 'G', descripcion: 'Instalación de servicios básicos', predecesoras: ['C'], duracion: 4 },
      { id: 'H', descripcion: 'Equipamiento interno', predecesoras: ['F', 'G'], duracion: 5 },
      { id: 'I', descripcion: 'Capacitación del personal', predecesoras: ['H'], duracion: 3 },
      { id: 'J', descripcion: 'Inspección y apertura', predecesoras: ['I'], duracion: 2 },
    ],
  },
  {
    n: 2,
    titulo: 'Establecimiento de un vivero agroforestal',
    contexto: 'comunitario',
    dificultad: 'intermedio',
    enunciado:
      'Se establecerá un vivero agroforestal. La tabla lista las actividades, sus predecesoras y su duración en días.',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Selección del terreno', predecesoras: [], duracion: 2 },
      { id: 'B', descripcion: 'Limpieza y delimitación', predecesoras: ['A'], duracion: 2 },
      { id: 'C', descripcion: 'Instalación del sistema de riego', predecesoras: ['B'], duracion: 3 },
      { id: 'D', descripcion: 'Construcción de camas de germinación', predecesoras: ['B'], duracion: 2 },
      { id: 'E', descripcion: 'Preparación de sustrato', predecesoras: ['D'], duracion: 2 },
      { id: 'F', descripcion: 'Siembra de semillas', predecesoras: ['C', 'E'], duracion: 2 },
      { id: 'G', descripcion: 'Instalación de umbráculo', predecesoras: ['B'], duracion: 4 },
      { id: 'H', descripcion: 'Etiquetado y ordenamiento', predecesoras: ['F', 'G'], duracion: 1 },
      { id: 'I', descripcion: 'Aplicación de bioinsumos', predecesoras: ['F'], duracion: 1 },
      { id: 'J', descripcion: 'Inicio de distribución de plántulas', predecesoras: ['H', 'I'], duracion: 2 },
    ],
    preguntaExtra: 'Analice qué pasaría si la actividad G se retrasa un día.',
  },
  {
    n: 3,
    titulo: 'Montaje de una planta de compostaje',
    contexto: 'cooperativa',
    dificultad: 'intermedio',
    enunciado:
      'Una cooperativa está instalando una planta para procesar residuos orgánicos. La tabla lista las actividades, sus ' +
      'predecesoras y su duración en días.',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Selección del sitio', predecesoras: [], duracion: 2 },
      { id: 'B', descripcion: 'Diseño del sistema', predecesoras: ['A'], duracion: 3 },
      { id: 'C', descripcion: 'Adquisición de materiales', predecesoras: ['A'], duracion: 4 },
      { id: 'D', descripcion: 'Construcción de plataforma de compostaje', predecesoras: ['B', 'C'], duracion: 5 },
      { id: 'E', descripcion: 'Instalación del sistema de drenaje', predecesoras: ['C'], duracion: 3 },
      { id: 'F', descripcion: 'Montaje de áreas de almacenamiento', predecesoras: ['D'], duracion: 4 },
      { id: 'G', descripcion: 'Capacitación del personal', predecesoras: ['E'], duracion: 2 },
      { id: 'H', descripcion: 'Pruebas de manejo de residuos', predecesoras: ['F', 'G'], duracion: 2 },
      { id: 'I', descripcion: 'Evaluación técnica inicial', predecesoras: ['H'], duracion: 1 },
      { id: 'J', descripcion: 'Puesta en marcha oficial', predecesoras: ['I'], duracion: 2 },
    ],
  },
  {
    n: 4,
    titulo: 'Implementación de un huerto escolar',
    contexto: 'huerto_escolar',
    dificultad: 'basico',
    enunciado:
      'Un grupo comunitario desarrolla un proyecto de agricultura escolar. La tabla lista las actividades, sus ' +
      'predecesoras y su duración en días.',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Sensibilización en la escuela', predecesoras: [], duracion: 1 },
      { id: 'B', descripcion: 'Diseño del huerto', predecesoras: ['A'], duracion: 2 },
      { id: 'C', descripcion: 'Preparación del terreno', predecesoras: ['A'], duracion: 2 },
      { id: 'D', descripcion: 'Construcción de camas de cultivo', predecesoras: ['C'], duracion: 2 },
      { id: 'E', descripcion: 'Instalación de riego por goteo', predecesoras: ['B', 'D'], duracion: 3 },
      { id: 'F', descripcion: 'Compra de insumos', predecesoras: ['A'], duracion: 2 },
      { id: 'G', descripcion: 'Siembra inicial', predecesoras: ['E', 'F'], duracion: 2 },
      { id: 'H', descripcion: 'Elaboración de cartel educativo', predecesoras: ['A'], duracion: 1 },
      { id: 'I', descripcion: 'Taller con padres de familia', predecesoras: ['G', 'H'], duracion: 1 },
      { id: 'J', descripcion: 'Monitoreo y evaluación', predecesoras: ['I'], duracion: 2 },
    ],
  },
  {
    n: 5,
    titulo: 'Establecimiento de un módulo de producción de tilapia',
    contexto: 'tilapia',
    dificultad: 'basico',
    enunciado:
      'Una pequeña empresa inicia la producción de tilapia en estanques rústicos. La tabla lista las actividades, sus ' +
      'predecesoras y su duración en días.',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Evaluación del terreno', predecesoras: [], duracion: 2 },
      { id: 'B', descripcion: 'Nivelación y excavación de estanques', predecesoras: ['A'], duracion: 4 },
      { id: 'C', descripcion: 'Revestimiento de estanques', predecesoras: ['B'], duracion: 3 },
      { id: 'D', descripcion: 'Instalación del sistema de aireación', predecesoras: ['C'], duracion: 2 },
      { id: 'E', descripcion: 'Compra de alevines', predecesoras: ['C'], duracion: 1 },
      { id: 'F', descripcion: 'Llenado de agua y acondicionamiento', predecesoras: ['D'], duracion: 2 },
      { id: 'G', descripcion: 'Siembra de alevines', predecesoras: ['E', 'F'], duracion: 1 },
      { id: 'H', descripcion: 'Primer muestreo de crecimiento', predecesoras: ['G'], duracion: 1 },
      { id: 'I', descripcion: 'Registro de datos de alimentación', predecesoras: ['G'], duracion: 2 },
      { id: 'J', descripcion: 'Análisis técnico del desempeño', predecesoras: ['H', 'I'], duracion: 2 },
    ],
  },
];

export const EJERCICIOS_CPM: readonly Ejercicio[] = CPM.map((s) => ({
  id: `cpm-${String(s.n).padStart(2, '0')}`,
  titulo: s.titulo,
  tema: 'cpm' as const,
  metodo: 'Diagrama de red y ruta crítica (CPM)',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado:
    `${s.enunciado}\n\n**Instrucciones.** Construya el diagrama de red. Calcule los tiempos de inicio y terminación ` +
    `tempranos y tardíos, y la holgura de cada actividad. Identifique la ruta crítica y su duración total.` +
    (s.preguntaExtra ? ` ${s.preguntaExtra}` : ''),
  datos: {
    tipo: 'cpm' as const,
    // Los campos de compresión son opcionales: un ejercicio de ruta crítica
    // corriente no los trae, y `duracionAcelerada: null` significa justamente eso.
    actividades: s.actividades.map((a) => ({
      ...a,
      predecesoras: [...a.predecesoras],
      duracionAcelerada: a.duracionAcelerada ?? null,
      costoNormal: a.costoNormal ?? 0,
      costoAcelerado: a.costoAcelerado ?? 0,
    })),
    unidadTiempo: s.unidadTiempo,
    costoIndirectoPorPeriodo: s.costoIndirectoPorPeriodo ?? 0,
    moneda: s.moneda ?? ('HNL' as const),
  },
  preguntas: preguntasCPM({ titulo: s.titulo, actividades: s.actividades, unidadTiempo: s.unidadTiempo }, s.preguntaExtra ?? null),
  moneda: null,
  unidades: [s.unidadTiempo],
  tiempoEstimadoMinutos: 35,
  origen: 'textual' as const,
  validacion: 'verificado' as const,
  fuenteId: 'doc-redes',
  atribucion: `Problema ${s.n}`,
  inconsistencias: [],
  notasDocente: '',
  semilla: null,
  creadoEn: '2025-07-27T00:00:00.000Z',
  modificadoEn: '2025-07-27T00:00:00.000Z',
}));

// ───────────────────────────── PERT ─────────────────────────────

interface SemillaPERT {
  readonly n: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly unidadTiempo: string;
  readonly actividades: readonly ActividadPERT[];
  readonly plazo: number;
  readonly inconsistencias?: readonly string[];
}

const PERT: readonly SemillaPERT[] = [
  {
    n: 1,
    titulo: 'Establecimiento de un invernadero para hortalizas',
    contexto: 'hortalizas',
    dificultad: 'intermedio',
    enunciado:
      'Se instalará un invernadero para producción de hortalizas. Para cada actividad se estimaron tres tiempos, en días: ' +
      'optimista (a), más probable (m) y pesimista (b).',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Selección del terreno', predecesoras: [], a: 2, m: 3, b: 4 },
      { id: 'B', descripcion: 'Preparación del terreno', predecesoras: ['A'], a: 2, m: 4, b: 6 },
      { id: 'C', descripcion: 'Instalación de estructura', predecesoras: ['B'], a: 3, m: 5, b: 8 },
      { id: 'D', descripcion: 'Instalación de riego', predecesoras: ['B'], a: 2, m: 3, b: 5 },
      { id: 'E', descripcion: 'Instalación de plástico', predecesoras: ['C'], a: 1, m: 2, b: 4 },
      { id: 'F', descripcion: 'Pruebas de funcionamiento', predecesoras: ['D', 'E'], a: 1, m: 2, b: 3 },
    ],
    plazo: 18,
  },
  {
    n: 2,
    titulo: 'Producción artesanal de yogurt en finca',
    contexto: 'lacteos',
    dificultad: 'basico',
    enunciado:
      'Una finca produce yogurt de forma artesanal. Para cada actividad se estimaron tres tiempos, en horas.\n\n' +
      '> **Nota didáctica.** Esta red es una cadena lineal sin rutas alternativas, así que todas las actividades resultan ' +
      'críticas. Es un buen recordatorio de que la ruta crítica no siempre revela información: cuando no hay caminos ' +
      'paralelos, no hay nada que comparar. Registrado como inconsistencia I-08.',
    unidadTiempo: 'horas',
    actividades: [
      { id: 'A', descripcion: 'Recolección de leche', predecesoras: [], a: 1, m: 2, b: 3 },
      { id: 'B', descripcion: 'Pasteurización', predecesoras: ['A'], a: 1, m: 2, b: 4 },
      { id: 'C', descripcion: 'Enfriamiento', predecesoras: ['B'], a: 1, m: 1, b: 2 },
      { id: 'D', descripcion: 'Inoculación de cultivo', predecesoras: ['C'], a: 0.5, m: 1, b: 1.5 },
      { id: 'E', descripcion: 'Incubación', predecesoras: ['D'], a: 5, m: 6, b: 8 },
      { id: 'F', descripcion: 'Empacado y refrigeración', predecesoras: ['E'], a: 1, m: 1.5, b: 2.5 },
    ],
    plazo: 15.5,
    inconsistencias: ['I-08'],
  },
];

const pertRed: readonly Ejercicio[] = PERT.map((s) => ({
  id: `pert-${String(s.n).padStart(2, '0')}`,
  titulo: s.titulo,
  tema: 'pert' as const,
  metodo: 'PERT con tres estimaciones y aproximación normal',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado:
    `${s.enunciado}\n\n**Instrucciones.** Calcule el tiempo esperado y la desviación estándar de cada actividad. ` +
    `Elabore el diagrama de red PERT. Determine la ruta crítica probabilística. Calcule la probabilidad de finalizar ` +
    `en menos de ${s.plazo} ${s.unidadTiempo}.`,
  datos: {
    tipo: 'pert' as const,
    modo: 'red' as const,
    actividades: s.actividades.map((a) => ({ ...a, predecesoras: [...a.predecesoras] })),
    unidadTiempo: s.unidadTiempo,
    mediaDirecta: null,
    desviacionDirecta: null,
    plazoConsulta: s.plazo,
    confianzaConsulta: 0.95,
  },
  preguntas: preguntasPERT({ titulo: s.titulo, actividades: s.actividades, unidadTiempo: s.unidadTiempo }, s.plazo),
  moneda: null,
  unidades: [s.unidadTiempo],
  tiempoEstimadoMinutos: 40,
  origen: 'textual' as const,
  validacion: s.inconsistencias?.length ? ('con_inconsistencia' as const) : ('verificado' as const),
  fuenteId: 'doc-pert',
  atribucion: `Problema ${s.n}`,
  inconsistencias: [...(s.inconsistencias ?? [])],
  notasDocente: '',
  semilla: null,
  creadoEn: '2025-08-05T00:00:00.000Z',
  modificadoEn: '2025-08-05T00:00:00.000Z',
}));

/** Problema 3 del documento: probabilidades a partir de media y desviación dadas. */
const pertProbabilidad: Ejercicio = (() => {
  const media = 80;
  const sigma = 8;
  const menos65 = probabilidadPlazo({ media, desviacion: sigma, plazo: 65, sentido: 'antes', unidadTiempo: 'semanas' }).datos;
  const mas90 = probabilidadPlazo({ media, desviacion: sigma, plazo: 90, sentido: 'despues', unidadTiempo: 'semanas' }).datos;
  const conf95 = plazoParaConfianza(media, sigma, 0.95, 'semanas').datos;

  return {
    id: 'pert-03',
    titulo: 'Probabilidades de terminación de un proyecto',
    tema: 'pert',
    metodo: 'Aproximación normal, puntaje Z y nivel de confianza',
    contexto: 'general',
    dificultad: 'basico',
    enunciado:
      'Con los tiempos PERT se ha estimado que el tiempo medio de terminación de un proyecto es de 80 semanas, con una ' +
      'desviación estándar de 8 semanas.\n\n' +
      '1. ¿Cuál es la probabilidad de que el proyecto termine en menos de 65 semanas?\n' +
      '2. ¿Cuál es la probabilidad de que el proyecto lleve más de 90 semanas?\n' +
      '3. Si se quiere tener 95 % de confianza en terminar el proyecto, ¿qué plazo debe comprometerse?',
    datos: {
      tipo: 'pert',
      modo: 'solo_probabilidad',
      actividades: [],
      unidadTiempo: 'semanas',
      mediaDirecta: media,
      desviacionDirecta: sigma,
      plazoConsulta: 65,
      confianzaConsulta: 0.95,
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Probabilidad de terminar en menos de 65 semanas, en porcentaje.',
        tipo: 'numerica',
        respuesta: (menos65?.probabilidad ?? 0) * 100,
        unidad: '%',
        tolerancia: 0.03,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Z = (65 − 80) / 8.',
          'El resultado es negativo: 65 está por debajo de la media, así que la probabilidad será menor que 50 %.',
        ],
        claveVerificacion: 'pert.probabilidad',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado: 'Probabilidad de que el proyecto lleve más de 90 semanas, en porcentaje.',
        tipo: 'numerica',
        respuesta: (mas90?.probabilidad ?? 0) * 100,
        unidad: '%',
        tolerancia: 0.03,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Z = (90 − 80) / 8.',
          'Las tablas normales dan el área a la izquierda: para «más de» hay que restar de 1.',
        ],
        claveVerificacion: 'pert.probabilidad',
        puntos: 2,
      },
      {
        id: 'p3',
        enunciado: 'Plazo que debe comprometerse para 95 % de confianza, en semanas.',
        tipo: 'numerica',
        respuesta: conf95?.plazo ?? null,
        unidad: 'semanas',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Es la operación inversa: parta de la probabilidad y busque el valor de Z.',
          'Para 95 % de confianza, Z = 1,645.',
          'T = μ + Z σ.',
        ],
        claveVerificacion: 'pert.plazoConfianza',
        puntos: 3,
      },
      {
        id: 'p4',
        enunciado:
          'Compare los tres resultados. ¿Qué le diría a un cliente que exige entrega en 80 semanas y no acepta ' +
          'un plazo mayor?',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['La media implica 50 % de probabilidad de incumplir.', 'El colchón es el precio de la confianza.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['semanas'],
    tiempoEstimadoMinutos: 20,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'doc-pert',
    atribucion: 'Problema 3',
    inconsistencias: [],
    notasDocente: '',
    semilla: null,
    creadoEn: '2025-08-05T00:00:00.000Z',
    modificadoEn: '2025-08-05T00:00:00.000Z',
  };
})();

export const EJERCICIOS_PERT: readonly Ejercicio[] = [...pertRed, pertProbabilidad];

// ───────────────────────────── Compresión del proyecto ─────────────────────────────

/**
 * La compresión no aparece en ningún material del curso: se incorporó a
 * petición del docente y estos tres ejercicios son derivados, igual que los del
 * simplex. Queda registrado en la inconsistencia I-15.
 *
 * Los cinco ejercicios de ruta crítica del material no se tocaron: los datos de
 * compresión son campos opcionales de la actividad, así que conviven sin
 * estorbarse.
 */
const CRASHING: readonly SemillaCPM[] = [
  {
    n: 1,
    titulo: 'Sala de ordeño: ¿cuánto cuesta terminar antes?',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    unidadTiempo: 'días',
    moneda: 'HNL',
    costoIndirectoPorPeriodo: 3000,
    metodo: 'Compresión del proyecto por pendientes de costo',
    minutos: 45,
    enunciado:
      'Una cooperativa lechera instalará una sala de ordeño. Cada actividad puede ejecutarse en su duración normal o ' +
      'acelerarse hasta un mínimo, pagando más por horas extra y cuadrillas adicionales. Mientras la sala no entre en ' +
      'operación, la cooperativa gasta **L 3 000 diarios** en alquiler de equipo, supervisión y financiamiento.',
    actividades: [
      { id: 'A', descripcion: 'Obra civil del piso y drenajes', predecesoras: [], duracion: 8, duracionAcelerada: 5, costoNormal: 42000, costoAcelerado: 49500 },
      { id: 'B', descripcion: 'Instalación eléctrica', predecesoras: ['A'], duracion: 4, duracionAcelerada: 3, costoNormal: 18000, costoAcelerado: 20400 },
      { id: 'C', descripcion: 'Montaje del equipo de ordeño', predecesoras: ['B'], duracion: 6, duracionAcelerada: 4, costoNormal: 65000, costoAcelerado: 73000 },
      { id: 'D', descripcion: 'Pruebas y calibración', predecesoras: ['C'], duracion: 3, duracionAcelerada: 2, costoNormal: 9000, costoAcelerado: 12600 },
    ],
    notasDocente:
      'El caso más limpio del tema: la red es una cadena, así que todas las actividades son críticas y en cada paso se ' +
      'acorta simplemente la más barata. Las pendientes son L 2 400 (B), L 2 500 (A), L 3 600 (D) y L 4 000 (C), y el ' +
      'costo indirecto son L 3 000 diarios: conviene comprimir mientras la pendiente sea menor que 3 000, es decir B y ' +
      'las tres unidades de A. El proyecto baja de 21 a 17 días y el costo total de L 197 000 a L 194 900.\n\n' +
      'Vale la pena mover el costo indirecto en el laboratorio: con L 2 000 diarios no conviene comprimir nada, y con ' +
      'L 5 000 conviene llegar hasta los 14 días. Es la forma más rápida de que se vea que la respuesta no depende del ' +
      'proyecto sino de lo que cuesta el tiempo.',
  },
  {
    n: 2,
    titulo: 'Planta de concentrado: dos rutas críticas a la vez',
    contexto: 'maiz',
    dificultad: 'avanzado',
    unidadTiempo: 'días',
    moneda: 'HNL',
    costoIndirectoPorPeriodo: 4000,
    metodo: 'Compresión del proyecto por pendientes de costo',
    minutos: 50,
    enunciado:
      'Una cooperativa de granos básicos montará una planta de alimento concentrado. La obra civil y la importación del ' +
      'molino avanzan en paralelo y se juntan para la instalación. El costo indirecto de la obra es de **L 4 000 ' +
      'diarios**.',
    actividades: [
      { id: 'A', descripcion: 'Cimentación de la nave', predecesoras: [], duracion: 6, duracionAcelerada: 4, costoNormal: 55000, costoAcelerado: 61000 },
      { id: 'B', descripcion: 'Importación del molino', predecesoras: [], duracion: 9, duracionAcelerada: 6, costoNormal: 120000, costoAcelerado: 138000 },
      { id: 'C', descripcion: 'Montaje de la estructura', predecesoras: ['A'], duracion: 5, duracionAcelerada: 3, costoNormal: 48000, costoAcelerado: 55200 },
      { id: 'D', descripcion: 'Instalación del molino', predecesoras: ['B', 'C'], duracion: 4, duracionAcelerada: 3, costoNormal: 30000, costoAcelerado: 33500 },
      { id: 'E', descripcion: 'Pruebas de producción', predecesoras: ['D'], duracion: 3, duracionAcelerada: 2, costoNormal: 15000, costoAcelerado: 19500 },
    ],
    notasDocente:
      'Aquí está el punto que no se ve en una red en cadena. Al principio la ruta crítica es A–C–D–E y basta acortar ' +
      'una actividad; pero después de dos días la importación del molino (B) se vuelve crítica también, y desde ese ' +
      'momento acortar solo una ruta no adelanta nada: hay que pagar B **y** C a la vez, L 9 600 el día, contra los ' +
      'L 4 000 que se ahorran. Ahí se detiene la compresión.\n\n' +
      'El óptimo son 15 días con L 337 500, comprimiendo A dos veces y D una. La lección para la clase es que la ' +
      'pendiente barata deja de servir en cuanto aparece la segunda ruta crítica: por eso el procedimiento vuelve a ' +
      'resolver la red después de cada paso.',
  },
  {
    n: 3,
    titulo: 'Renovación de un galpón: la ruta crítica se mueve',
    contexto: 'avicultura_engorde',
    dificultad: 'avanzado',
    unidadTiempo: 'días',
    moneda: 'HNL',
    costoIndirectoPorPeriodo: 3500,
    metodo: 'Compresión del proyecto por pendientes de costo',
    minutos: 50,
    enunciado:
      'Una engorda debe renovar un galpón entre dos parvadas. El techo y los comederos se trabajan en paralelo después ' +
      'del desmontaje, y la desinfección espera a que ambos terminen. Cada día con el galpón vacío le cuesta a la ' +
      'empresa **L 3 500** en lote no producido y personal ocioso.',
    actividades: [
      { id: 'A', descripcion: 'Desmontaje del equipo viejo', predecesoras: [], duracion: 3, duracionAcelerada: 2, costoNormal: 8000, costoAcelerado: 9000 },
      { id: 'B', descripcion: 'Reparación de techo y cortinas', predecesoras: ['A'], duracion: 10, duracionAcelerada: 6, costoNormal: 60000, costoAcelerado: 72000 },
      { id: 'C', descripcion: 'Cambio de comederos y bebederos', predecesoras: ['A'], duracion: 7, duracionAcelerada: 5, costoNormal: 45000, costoAcelerado: 55000 },
      { id: 'D', descripcion: 'Desinfección y vacío sanitario', predecesoras: ['B', 'C'], duracion: 4, duracionAcelerada: 3, costoNormal: 12000, costoAcelerado: 15000 },
    ],
    notasDocente:
      'El mejor de los tres para explicar por qué hay que recalcular. La ruta crítica de partida es A–B–D, con 17 ' +
      'días; A–C–D dura 14 y tiene tres días de holgura. Al comprimir B esa holgura se va consumiendo, y cuando B baja ' +
      'a 7 días las dos rutas empatan: desde ahí acortar solo B no adelanta nada.\n\n' +
      'Conviene llegar a 12 días con L 180 000, acortando A una vez, B tres veces y D una. El último paso posible ' +
      '—acortar B y C juntas por L 8 000— cuesta más que los L 3 500 que ahorra, así que ahí se para. Un estudiante ' +
      'que decida sobre la ruta crítica inicial sin recalcular seguirá acortando B hasta 6 y pagará por un día que el ' +
      'proyecto no gana: ese es el error que persigue la retroalimentación del tema.',
  },
];

export const EJERCICIOS_CRASHING: readonly Ejercicio[] = CRASHING.map((s) => {
  const actividades = s.actividades.map((a) => ({
    ...a,
    predecesoras: [...a.predecesoras],
    duracionAcelerada: a.duracionAcelerada ?? null,
    costoNormal: a.costoNormal ?? 0,
    costoAcelerado: a.costoAcelerado ?? 0,
  }));

  return {
    id: `crash-${String(s.n).padStart(2, '0')}`,
    titulo: s.titulo,
    tema: 'cpm' as const,
    metodo: s.metodo ?? 'Compresión del proyecto por pendientes de costo',
    contexto: s.contexto,
    dificultad: s.dificultad,
    enunciado:
      `${s.enunciado}\n\n**Calcule la pendiente de costo de cada actividad, comprima el proyecto paso a paso y ` +
      `determine la duración de costo total mínimo.**`,
    datos: {
      tipo: 'cpm' as const,
      actividades,
      unidadTiempo: s.unidadTiempo,
      costoIndirectoPorPeriodo: s.costoIndirectoPorPeriodo ?? 0,
      moneda: s.moneda ?? ('HNL' as const),
    },
    preguntas: preguntasCrashing({
      titulo: s.titulo,
      actividades,
      unidadTiempo: s.unidadTiempo,
      costoIndirectoPorPeriodo: s.costoIndirectoPorPeriodo ?? 0,
      moneda: s.moneda ?? 'HNL',
    }),
    moneda: s.moneda ?? ('HNL' as const),
    unidades: [s.unidadTiempo, s.moneda === 'USD' ? 'US$' : 'L'],
    tiempoEstimadoMinutos: s.minutos ?? 45,
    origen: 'derivado' as const,
    validacion: 'verificado' as const,
    fuenteId: null,
    atribucion: 'Ejercicio derivado: la compresión de proyectos no aparece en los materiales del curso (I-15)',
    inconsistencias: ['I-15'],
    notasDocente: s.notasDocente ?? '',
    semilla: null,
    creadoEn: '2026-08-29T00:00:00.000Z',
    modificadoEn: '2026-08-29T00:00:00.000Z',
  };
});
