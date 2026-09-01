/**
 * Los once problemas de asignación, transcritos de
 * `Ejercicios de Asignación.docx` (agosto 2025).
 *
 * El problema 3 conserva la matriz 4 × 4 del documento y queda marcado con la
 * inconsistencia I-01, que el docente resuelve en el panel de auditoría.
 */

import { preguntasAsignacion } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio } from '@/esquemas';

interface Semilla {
  readonly n: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly atribucion: string;
  readonly enunciado: string;
  readonly pregunta: string;
  readonly filas: readonly string[];
  readonly columnas: readonly string[];
  readonly matriz: readonly (readonly number[])[];
  readonly objetivo: 'minimizar' | 'maximizar';
  readonly unidad: string;
  readonly nombreFilas: string;
  readonly nombreColumnas: string;
  readonly inconsistencias?: readonly string[];
}

const SEMILLAS: readonly Semilla[] = [
  {
    n: 1,
    titulo: 'Asignación de trabajadores a parcelas',
    contexto: 'cafe',
    dificultad: 'basico',
    atribucion: 'Wilson',
    enunciado:
      'Una finca cafetalera tiene 4 trabajadores y 4 parcelas para deshierbe. La tabla muestra el tiempo, en minutos, ' +
      'que tarda cada trabajador en cada parcela.',
    pregunta: '¿Cómo deben asignarse los trabajadores a las parcelas para minimizar el tiempo total?',
    filas: ['Trabajador 1', 'Trabajador 2', 'Trabajador 3', 'Trabajador 4'],
    columnas: ['Parcela 1', 'Parcela 2', 'Parcela 3', 'Parcela 4'],
    matriz: [
      [45, 52, 41, 60],
      [50, 47, 55, 53],
      [46, 44, 48, 51],
      [58, 49, 52, 47],
    ],
    objetivo: 'minimizar',
    unidad: 'minutos',
    nombreFilas: 'trabajadores',
    nombreColumnas: 'parcelas',
  },
  {
    n: 2,
    titulo: 'Asignación de veterinarios a granjas',
    contexto: 'veterinaria',
    dificultad: 'basico',
    atribucion: 'Evelin',
    enunciado:
      'Una empresa veterinaria debe enviar 4 veterinarios a 4 granjas. La tabla muestra el costo de desplazamiento en lempiras.',
    pregunta: 'Determine la asignación que minimiza el costo total.',
    filas: ['Vet 1', 'Vet 2', 'Vet 3', 'Vet 4'],
    columnas: ['Granja A', 'Granja B', 'Granja C', 'Granja D'],
    matriz: [
      [820, 760, 910, 700],
      [780, 690, 860, 750],
      [840, 720, 800, 770],
      [720, 810, 740, 820],
    ],
    objetivo: 'minimizar',
    unidad: 'L',
    nombreFilas: 'veterinarios',
    nombreColumnas: 'granjas',
  },
  {
    n: 3,
    titulo: 'Asignación de camiones a rutas',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    atribucion: 'Keny',
    enunciado:
      'Una cooperativa lechera dispone de camiones y rutas de distribución. La tabla muestra el consumo de combustible, ' +
      'en litros por recorrido.\n\n' +
      '> **Atención.** El enunciado original habla de 3 camiones y 3 rutas, pero la tabla del documento contiene ' +
      'cuatro camiones (A a D) y cuatro rutas. Esta discrepancia está registrada como inconsistencia I-01 en el panel de ' +
      'Auditoría de datos, donde el docente elige la versión válida y el ejercicio se ajusta a lo que elija. ' +
      'El distintivo del encabezado indica si la decisión ya está tomada.',
    pregunta: '¿Qué asignación minimiza el consumo de combustible?',
    filas: ['Camión A', 'Camión B', 'Camión C', 'Camión D'],
    columnas: ['Ruta 1', 'Ruta 2', 'Ruta 3', 'Ruta 4'],
    matriz: [
      [32, 28, 35, 31],
      [30, 26, 33, 29],
      [27, 29, 31, 30],
      [33, 27, 32, 25],
    ],
    objetivo: 'minimizar',
    unidad: 'litros',
    nombreFilas: 'camiones',
    nombreColumnas: 'rutas',
    inconsistencias: ['I-01'],
  },
  {
    n: 4,
    titulo: 'Agrónomos en proyectos',
    contexto: 'general',
    dificultad: 'intermedio',
    atribucion: 'Daniel',
    enunciado:
      'Cinco agrónomos deben asignarse a 5 proyectos (maíz, frijol, café, hortalizas y caña). La tabla muestra el ' +
      'puntaje de eficiencia de cada agrónomo en cada proyecto.\n\n' +
      '> **Nota metodológica.** Este es un problema de maximización y el método húngaro está formulado para minimizar. ' +
      'La conversión a matriz de oportunidad perdida es parte de la solución, no un atajo.',
    pregunta: '¿Qué asignación maximiza la eficiencia total?',
    filas: ['Agrónomo 1', 'Agrónomo 2', 'Agrónomo 3', 'Agrónomo 4', 'Agrónomo 5'],
    columnas: ['Maíz', 'Frijol', 'Café', 'Hortalizas', 'Caña'],
    matriz: [
      [8, 6, 7, 9, 5],
      [7, 9, 6, 8, 7],
      [6, 7, 9, 6, 8],
      [9, 5, 8, 7, 6],
      [5, 8, 7, 6, 9],
    ],
    objetivo: 'maximizar',
    unidad: 'puntos',
    nombreFilas: 'agrónomos',
    nombreColumnas: 'proyectos',
    inconsistencias: ['I-05'],
  },
  {
    n: 5,
    titulo: 'Estudiantes en empresas',
    contexto: 'servicios',
    dificultad: 'intermedio',
    atribucion: 'Gracy',
    enunciado:
      'Cinco estudiantes deben ser asignados a 5 empresas para sus prácticas profesionales. La tabla muestra el nivel de ' +
      'afinidad en escala de 1 a 10.',
    pregunta: 'Determine la asignación que maximice la afinidad.',
    filas: ['Estudiante 1', 'Estudiante 2', 'Estudiante 3', 'Estudiante 4', 'Estudiante 5'],
    columnas: ['Empresa A', 'Empresa B', 'Empresa C', 'Empresa D', 'Empresa E'],
    matriz: [
      [7, 9, 6, 8, 5],
      [6, 7, 8, 6, 9],
      [8, 6, 9, 7, 6],
      [5, 8, 7, 9, 6],
      [9, 5, 6, 7, 8],
    ],
    objetivo: 'maximizar',
    unidad: 'puntos de afinidad',
    nombreFilas: 'estudiantes',
    nombreColumnas: 'empresas',
    inconsistencias: ['I-05'],
  },
  {
    n: 6,
    titulo: 'Jornaleros en cultivos',
    contexto: 'maiz',
    dificultad: 'basico',
    atribucion: 'Christopher',
    enunciado:
      'Un productor contrata 4 jornaleros para trabajar en 4 cultivos. La tabla muestra el salario que cobra cada ' +
      'jornalero por cultivo, en lempiras.',
    pregunta: '¿Cómo asignar a los jornaleros para minimizar el costo?',
    filas: ['Jornalero 1', 'Jornalero 2', 'Jornalero 3', 'Jornalero 4'],
    columnas: ['Maíz', 'Tomate', 'Yuca', 'Frijol'],
    matriz: [
      [600, 650, 620, 610],
      [620, 610, 640, 590],
      [590, 630, 600, 620],
      [610, 600, 630, 605],
    ],
    objetivo: 'minimizar',
    unidad: 'L',
    nombreFilas: 'jornaleros',
    nombreColumnas: 'cultivos',
  },
  {
    n: 7,
    titulo: 'Técnicos en comunidades',
    contexto: 'comunitario',
    dificultad: 'basico',
    atribucion: 'Samuel',
    enunciado: 'Cuatro técnicos deben visitar 4 comunidades. La tabla muestra los tiempos de viaje en minutos.',
    pregunta: '¿Qué asignación minimiza el tiempo total?',
    filas: ['Técnico 1', 'Técnico 2', 'Técnico 3', 'Técnico 4'],
    columnas: ['Comunidad A', 'Comunidad B', 'Comunidad C', 'Comunidad D'],
    matriz: [
      [55, 42, 60, 47],
      [48, 50, 45, 62],
      [60, 46, 52, 49],
      [51, 58, 47, 44],
    ],
    objetivo: 'minimizar',
    unidad: 'minutos',
    nombreFilas: 'técnicos',
    nombreColumnas: 'comunidades',
  },
  {
    n: 8,
    titulo: 'Tractores en labores',
    contexto: 'general',
    dificultad: 'basico',
    atribucion: 'Javier',
    enunciado:
      'Una finca dispone de 4 tractores y debe realizar 4 labores. La tabla muestra el consumo de combustible en litros ' +
      'por hora.',
    pregunta: 'Determine la asignación de tractores a labores que minimiza el consumo total de combustible.',
    filas: ['Tractor 1', 'Tractor 2', 'Tractor 3', 'Tractor 4'],
    columnas: ['Arado', 'Rastreo', 'Siembra', 'Fertilización'],
    matriz: [
      [14, 12, 10, 13],
      [11, 13, 12, 12],
      [12, 11, 13, 11],
      [13, 12, 11, 10],
    ],
    objetivo: 'minimizar',
    unidad: 'L/h',
    nombreFilas: 'tractores',
    nombreColumnas: 'labores',
  },
  {
    n: 9,
    titulo: 'Investigadores en experimentos',
    contexto: 'general',
    dificultad: 'intermedio',
    atribucion: 'Jeymi',
    enunciado:
      'Una universidad debe asignar 4 investigadores a 4 experimentos. La tabla muestra un índice de productividad.',
    pregunta: '¿Cuál es la asignación que maximiza la productividad?',
    filas: ['Investigador 1', 'Investigador 2', 'Investigador 3', 'Investigador 4'],
    columnas: ['Aves', 'Bovinos', 'Suelos', 'Forrajes'],
    matriz: [
      [85, 78, 72, 80],
      [76, 88, 74, 82],
      [79, 81, 90, 77],
      [83, 75, 78, 88],
    ],
    objetivo: 'maximizar',
    unidad: 'índice',
    nombreFilas: 'investigadores',
    nombreColumnas: 'experimentos',
    inconsistencias: ['I-05'],
  },
  {
    n: 10,
    titulo: 'Empaquetadores en líneas de producción',
    contexto: 'agroindustria',
    dificultad: 'avanzado',
    atribucion: 'Karla',
    enunciado:
      'Una planta empacadora tiene 5 trabajadores y 5 líneas de producción. La tabla muestra el rendimiento en cajas por hora.',
    pregunta: '¿Qué asignación maximiza el rendimiento total?',
    filas: ['Empacador 1', 'Empacador 2', 'Empacador 3', 'Empacador 4', 'Empacador 5'],
    columnas: ['Línea 1', 'Línea 2', 'Línea 3', 'Línea 4', 'Línea 5'],
    matriz: [
      [42, 38, 45, 40, 36],
      [39, 44, 41, 37, 43],
      [40, 36, 42, 45, 38],
      [44, 41, 39, 38, 42],
      [37, 43, 40, 42, 39],
    ],
    objetivo: 'maximizar',
    unidad: 'cajas/hora',
    nombreFilas: 'empacadores',
    nombreColumnas: 'líneas',
    inconsistencias: ['I-05'],
  },
  {
    n: 11,
    titulo: 'Extensionistas en municipios',
    contexto: 'comunitario',
    dificultad: 'avanzado',
    atribucion: 'Kristil',
    enunciado: 'Cinco extensionistas deben asignarse a 5 municipios. La tabla muestra el costo en lempiras.',
    pregunta: 'Determine la asignación que minimiza el costo total.',
    filas: ['Extensionista 1', 'Extensionista 2', 'Extensionista 3', 'Extensionista 4', 'Extensionista 5'],
    columnas: ['Municipio 1', 'Municipio 2', 'Municipio 3', 'Municipio 4', 'Municipio 5'],
    matriz: [
      [1100, 1250, 980, 1180, 1050],
      [1020, 1140, 1080, 1120, 1200],
      [1180, 1060, 1110, 1000, 1150],
      [1040, 1200, 1020, 1160, 1090],
      [1120, 1080, 1190, 1070, 1010],
    ],
    objetivo: 'minimizar',
    unidad: 'L',
    nombreFilas: 'extensionistas',
    nombreColumnas: 'municipios',
  },
];

export const EJERCICIOS_ASIGNACION: readonly Ejercicio[] = SEMILLAS.map((s) => ({
  id: `asig-${String(s.n).padStart(2, '0')}`,
  titulo: s.titulo,
  tema: 'asignacion' as const,
  metodo: 'Método húngaro',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: `${s.enunciado}\n\n**${s.pregunta}**`,
  datos: {
    tipo: 'asignacion' as const,
    filas: [...s.filas],
    columnas: [...s.columnas],
    matriz: s.matriz.map((f) => [...f]),
    objetivo: s.objetivo,
    unidad: s.unidad,
    nombreFilas: s.nombreFilas,
    nombreColumnas: s.nombreColumnas,
  },
  preguntas: preguntasAsignacion({
    titulo: s.titulo,
    filas: s.filas,
    columnas: s.columnas,
    matriz: s.matriz,
    objetivo: s.objetivo,
    unidad: s.unidad,
    nombreFilas: s.nombreFilas,
    nombreColumnas: s.nombreColumnas,
  }),
  moneda: s.unidad === 'L' ? ('HNL' as const) : null,
  unidades: [s.unidad],
  tiempoEstimadoMinutos: s.filas.length >= 5 ? 35 : 25,
  origen: 'textual' as const,
  validacion: s.inconsistencias?.includes('I-01') ? ('con_inconsistencia' as const) : ('verificado' as const),
  fuenteId: 'doc-asignacion',
  atribucion: `Problema ${s.n} — ${s.atribucion}`,
  inconsistencias: [...(s.inconsistencias ?? [])],
  notasDocente: '',
  semilla: null,
  creadoEn: '2025-08-17T00:00:00.000Z',
  modificadoEn: '2025-08-17T00:00:00.000Z',
}));
