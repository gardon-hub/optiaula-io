/**
 * Ejercicios de localización y distribución física.
 *
 * Localización: los dos casos de `ejercicios de localizacion.docx` y los dos
 * ejemplos resueltos de `metodo carga distancia 2022.pptx` (Health-Watch y los
 * siete sectores censales), cuyos resultados numéricos verificamos durante la
 * auditoría.
 *
 * Distribución: los tres casos de `Distribución 2025.pptx`.
 */

import { resolverCargaDistancia, resolverCentroGravedad, resolverPuntajePonderado } from '@/nucleo/localizacion';
import type { Ejercicio } from '@/esquemas';

// ───────────────────────────── Localización ─────────────────────────────

const FACTORES_HEALTHWATCH = [
  { id: 'f1', nombre: 'Total de pacientes-millas por mes', ponderacion: 25 },
  { id: 'f2', nombre: 'Utilización de la instalación', ponderacion: 20 },
  { id: 'f3', nombre: 'Tiempo promedio por viaje de emergencia', ponderacion: 20 },
  { id: 'f4', nombre: 'Accesibilidad de autopistas', ponderacion: 15 },
  { id: 'f5', nombre: 'Costos de la tierra y la construcción', ponderacion: 10 },
  { id: 'f6', nombre: 'Preferencias del empleado', ponderacion: 10 },
];

const SITIOS_HEALTHWATCH = [
  { id: 's1', nombre: 'Sitio 1', calificaciones: { f1: 4, f2: 3, f3: 3, f4: 4, f5: 1, f6: 5 } },
  { id: 's2', nombre: 'Sitio 2', calificaciones: { f1: 5, f2: 3, f3: 4, f4: 4, f5: 3, f6: 4 } },
];

const SECTORES = [
  { id: 'A', nombre: 'Sector A', punto: { x: 2.5, y: 4.5 }, carga: 2 },
  { id: 'B', nombre: 'Sector B', punto: { x: 2.5, y: 2.5 }, carga: 5 },
  { id: 'C', nombre: 'Sector C', punto: { x: 5.5, y: 4.5 }, carga: 10 },
  { id: 'D', nombre: 'Sector D', punto: { x: 5, y: 2 }, carga: 7 },
  { id: 'E', nombre: 'Sector E', punto: { x: 8, y: 5 }, carga: 10 },
  { id: 'F', nombre: 'Sector F', punto: { x: 7, y: 2 }, carga: 20 },
  { id: 'G', nombre: 'Sector G', punto: { x: 9, y: 2.5 }, carga: 14 },
];

const CANDIDATOS_SECTORES = [
  { id: 'c1', nombre: 'Localización (5,5; 4,5)', calificaciones: {}, punto: { x: 5.5, y: 4.5 } },
  { id: 'c2', nombre: 'Localización (7; 2)', calificaciones: {}, punto: { x: 7, y: 2 } },
];

const ZONAS_OLANCHO = [
  { id: 'cat', nombre: 'Catacamas', punto: { x: 3, y: 5 }, carga: 150 },
  { id: 'jut', nombre: 'Juticalpa', punto: { x: 7, y: 4 }, carga: 200 },
  { id: 'sfp', nombre: 'San Francisco de La Paz', punto: { x: 5, y: 8 }, carga: 80 },
  { id: 'dnc', nombre: 'Dulce Nombre de Culmí', punto: { x: 2, y: 9 }, carga: 60 },
];

const puntajeHW = resolverPuntajePonderado({
  titulo: 'Health-Watch',
  factores: FACTORES_HEALTHWATCH,
  sitios: SITIOS_HEALTHWATCH,
  escalaMinima: 1,
  escalaMaxima: 5,
});

const cdSectores = resolverCargaDistancia({
  titulo: 'Sectores censales',
  puntos: SECTORES,
  candidatos: CANDIDATOS_SECTORES,
  tipoDistancia: 'rectilinea',
  unidadCarga: 'habitantes',
  unidadDistancia: 'km',
});

const cgSectores = resolverCentroGravedad(SECTORES);
const cgOlancho = resolverCentroGravedad(ZONAS_OLANCHO);

export const EJERCICIOS_LOCALIZACION: readonly Ejercicio[] = [
  {
    id: 'loc-01',
    titulo: 'Instalación médica Health-Watch',
    tema: 'localizacion',
    metodo: 'Método de puntaje ponderado',
    contexto: 'servicios',
    dificultad: 'basico',
    enunciado:
      'Una nueva instalación médica, la Health-Watch, se va a ubicar en Erie, Pennsylvania. La tabla muestra los ' +
      'factores de localización, sus ponderaciones y los puntajes de dos sitios potenciales, en escala de 1 (deficiente) ' +
      'a 5 (excelente). Las ponderaciones suman 100 %.\n\n' +
      '**¿Cuál es el puntaje ponderado de cada sitio y cuál conviene elegir?**',
    datos: {
      tipo: 'localizacion',
      metodo: 'puntaje_ponderado',
      escalaMinima: 1,
      escalaMaxima: 5,
      factores: FACTORES_HEALTHWATCH,
      sitios: SITIOS_HEALTHWATCH,
      puntos: [],
      tipoDistancia: 'rectilinea',
      unidadCarga: 'unidades',
      unidadDistancia: 'km',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje ponderado del sitio 1.',
        tipo: 'numerica',
        respuesta: puntajeHW.datos?.puntajes[0]?.puntaje ?? null,
        unidad: 'puntos',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Multiplique la ponderación de cada factor por la calificación del sitio en ese factor.',
          'Sume los seis productos.',
        ],
        claveVerificacion: 'localizacion.puntaje',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado: 'Puntaje ponderado del sitio 2.',
        tipo: 'numerica',
        respuesta: puntajeHW.datos?.puntajes[1]?.puntaje ?? null,
        unidad: 'puntos',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['Mismo procedimiento que el sitio 1, con la otra columna de calificaciones.'],
        claveVerificacion: 'localizacion.puntaje',
        puntos: 2,
      },
      {
        id: 'p3',
        enunciado:
          'El sitio 1 gana en «preferencias del empleado» y el sitio 2 en «costos de la tierra». Explique cómo ' +
          'cambiaría la decisión si la dirección duplicara la ponderación del costo del terreno.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Use el análisis de sensibilidad del laboratorio para ver el cruce.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['puntos'],
    tiempoEstimadoMinutos: 20,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'ppt-cargadistancia',
    atribucion: 'Ejemplo resuelto de clase',
    inconsistencias: [],
    notasDocente:
      'Resultados verificados durante la auditoría: sitio 1 = 340 puntos, sitio 2 = 395 puntos. Coinciden con la presentación.',
    semilla: null,
    creadoEn: '2022-02-19T00:00:00.000Z',
    modificadoEn: '2022-02-19T00:00:00.000Z',
  },
  {
    id: 'loc-02',
    titulo: 'Siete sectores censales: carga-distancia y centro de gravedad',
    tema: 'localizacion',
    metodo: 'Carga-distancia rectilínea y centro de gravedad',
    contexto: 'servicios',
    dificultad: 'intermedio',
    enunciado:
      'Siete sectores censales, con sus coordenadas en la cuadrícula del mapa y su población, deben ser atendidos por una ' +
      'sola instalación. Se evalúan dos localizaciones candidatas: (5,5; 4,5) y (7; 2). Las distancias se miden de forma ' +
      'rectilínea.\n\n' +
      '**Calcule el puntaje carga-distancia de cada candidata, determine el centro de gravedad de la demanda y compare.**',
    datos: {
      tipo: 'localizacion',
      metodo: 'combinado',
      escalaMinima: 1,
      escalaMaxima: 5,
      factores: [],
      sitios: CANDIDATOS_SECTORES,
      puntos: SECTORES,
      tipoDistancia: 'rectilinea',
      unidadCarga: 'habitantes',
      unidadDistancia: 'km',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje carga-distancia de la localización (5,5; 4,5).',
        tipo: 'numerica',
        respuesta: cdSectores.datos?.evaluaciones[0]?.total ?? null,
        unidad: 'habitantes·km',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'La distancia rectilínea es |x₁ − x₂| + |y₁ − y₂|.',
          'Multiplique cada distancia por la población del sector y sume.',
        ],
        claveVerificacion: 'localizacion.cargaDistancia',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado: 'Puntaje carga-distancia de la localización (7; 2).',
        tipo: 'numerica',
        respuesta: cdSectores.datos?.evaluaciones[1]?.total ?? null,
        unidad: 'habitantes·km',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['El sector F coincide con esta localización: su distancia es cero.'],
        claveVerificacion: 'localizacion.cargaDistancia',
        puntos: 2,
      },
      {
        id: 'p3',
        enunciado: 'Coordenada x del centro de gravedad.',
        tipo: 'numerica',
        respuesta: cgSectores.datos?.centro.x ?? null,
        unidad: null,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['x* = Σ(lᵢ xᵢ) / Σ lᵢ.', 'La suma de las poblaciones es 68.'],
        claveVerificacion: 'localizacion.centroGravedad',
        puntos: 2,
      },
      {
        id: 'p4',
        enunciado: 'Coordenada y del centro de gravedad.',
        tipo: 'numerica',
        respuesta: cgSectores.datos?.centro.y ?? null,
        unidad: null,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['y* = Σ(lᵢ yᵢ) / Σ lᵢ.'],
        claveVerificacion: 'localizacion.centroGravedad',
        puntos: 2,
      },
      {
        id: 'p5',
        enunciado:
          'El centro de gravedad no coincide con ninguna de las dos candidatas. Explique qué significa eso y por qué ' +
          'el centro de gravedad no es necesariamente la mejor localización.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'El centro de gravedad minimiza distancias al cuadrado, no distancias.',
          'Además, puede caer en un lugar donde no haya terreno disponible.',
        ],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['habitantes', 'km'],
    tiempoEstimadoMinutos: 30,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'ppt-cargadistancia',
    atribucion: 'Ejemplo resuelto de clase',
    notasDocente:
      'Verificado en la auditoría: CD(5,5; 4,5) = 239; CD(7; 2) = 168; centro de gravedad = (6,67; 3,02). Coinciden con la presentación.',
    inconsistencias: [],
    semilla: null,
    creadoEn: '2022-02-19T00:00:00.000Z',
    modificadoEn: '2022-02-19T00:00:00.000Z',
  },
  {
    id: 'loc-03',
    titulo: 'Rastro regional pecuario',
    tema: 'localizacion',
    metodo: 'Método de puntaje ponderado',
    contexto: 'ganaderia',
    dificultad: 'basico',
    enunciado:
      'Se desea ubicar un rastro regional para bovinos y porcinos. Hay tres alternativas: el sitio A, cercano a los ' +
      'productores; el sitio B, cercano al mercado urbano; y el sitio C, cercano a la carretera principal. La tabla ' +
      'muestra los siete factores con su ponderación y la calificación de cada sitio.\n\n' +
      '**¿Qué sitio conviene y de dónde proviene su ventaja?**',
    datos: {
      tipo: 'localizacion',
      metodo: 'puntaje_ponderado',
      escalaMinima: 1,
      escalaMaxima: 5,
      factores: [
        { id: 'prod', nombre: 'Acceso a productores', ponderacion: 20 },
        { id: 'merc', nombre: 'Acceso a mercado', ponderacion: 20 },
        { id: 'agua', nombre: 'Disponibilidad de agua', ponderacion: 15 },
        { id: 'amb', nombre: 'Manejo ambiental', ponderacion: 15 },
        { id: 'carr', nombre: 'Carretera', ponderacion: 10 },
        { id: 'ener', nombre: 'Energía eléctrica', ponderacion: 10 },
        { id: 'terr', nombre: 'Costo del terreno', ponderacion: 10 },
      ],
      sitios: [
        { id: 'A', nombre: 'Sitio A — cercano a productores', calificaciones: { prod: 5, merc: 3, agua: 4, amb: 4, carr: 3, ener: 3, terr: 5 } },
        { id: 'B', nombre: 'Sitio B — cercano al mercado urbano', calificaciones: { prod: 3, merc: 5, agua: 3, amb: 2, carr: 4, ener: 5, terr: 2 } },
        { id: 'C', nombre: 'Sitio C — cercano a carretera principal', calificaciones: { prod: 4, merc: 4, agua: 5, amb: 5, carr: 5, ener: 4, terr: 4 } },
      ],
      puntos: [],
      tipoDistancia: 'rectilinea',
      unidadCarga: 'unidades',
      unidadDistancia: 'km',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje ponderado del sitio C.',
        tipo: 'numerica',
        respuesta:
          resolverPuntajePonderado({
            titulo: 'Rastro',
            escalaMinima: 1,
            escalaMaxima: 5,
            factores: [
              { id: 'prod', nombre: 'Acceso a productores', ponderacion: 20 },
              { id: 'merc', nombre: 'Acceso a mercado', ponderacion: 20 },
              { id: 'agua', nombre: 'Disponibilidad de agua', ponderacion: 15 },
              { id: 'amb', nombre: 'Manejo ambiental', ponderacion: 15 },
              { id: 'carr', nombre: 'Carretera', ponderacion: 10 },
              { id: 'ener', nombre: 'Energía eléctrica', ponderacion: 10 },
              { id: 'terr', nombre: 'Costo del terreno', ponderacion: 10 },
            ],
            sitios: [
              { id: 'C', nombre: 'Sitio C', calificaciones: { prod: 4, merc: 4, agua: 5, amb: 5, carr: 5, ener: 4, terr: 4 } },
            ],
          }).datos?.puntajes[0]?.puntaje ?? null,
        unidad: 'puntos',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['Verifique primero que las ponderaciones sumen 100.'],
        claveVerificacion: 'localizacion.puntaje',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado:
          'El sitio A es el mejor en acceso a productores y en costo del terreno, y aun así no gana. Explique por qué, ' +
          'y qué tendría que cambiar en las ponderaciones para que ganara.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Ser el mejor en dos factores no basta si son de poco peso o si se pierde en los demás.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['puntos'],
    tiempoEstimadoMinutos: 25,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'doc-localizacion',
    atribucion: 'Caso: rastro regional pecuario',
    inconsistencias: [],
    notasDocente: '',
    semilla: null,
    creadoEn: '2026-06-17T00:00:00.000Z',
    modificadoEn: '2026-06-17T00:00:00.000Z',
  },
  {
    id: 'loc-04',
    titulo: 'Centro regional de servicios pecuarios en Olancho',
    tema: 'localizacion',
    metodo: 'Centro de gravedad, carga-distancia y puntaje ponderado',
    contexto: 'cooperativa',
    dificultad: 'avanzado',
    enunciado:
      'Una empresa desea ubicar un centro regional de servicios pecuarios que incluya venta de alimento, atención ' +
      'técnica, acopio de leche, distribución de pollitos y servicios veterinarios. Debe atender cuatro zonas, cuyas ' +
      'coordenadas y número de productores aparecen en la tabla.\n\n' +
      'La Junta Directiva considera que no basta con minimizar distancias: también deben pesar el acceso vial, la ' +
      'disponibilidad de agua, la energía eléctrica, la bioseguridad, el costo del terreno, la cercanía a productores y ' +
      'la posibilidad de expansión.\n\n' +
      '**Calcule el centro de gravedad, evalúe dos sitios alternativos con carga-distancia, aplique el puntaje ' +
      'ponderado, recomiende una ubicación final y defiéndala técnicamente.**',
    datos: {
      tipo: 'localizacion',
      metodo: 'combinado',
      escalaMinima: 1,
      escalaMaxima: 5,
      factores: [
        { id: 'vial', nombre: 'Acceso vial', ponderacion: 20 },
        { id: 'agua', nombre: 'Disponibilidad de agua', ponderacion: 15 },
        { id: 'ener', nombre: 'Energía eléctrica', ponderacion: 15 },
        { id: 'bio', nombre: 'Bioseguridad', ponderacion: 15 },
        { id: 'terr', nombre: 'Costo del terreno', ponderacion: 10 },
        { id: 'prod', nombre: 'Cercanía a productores', ponderacion: 15 },
        { id: 'exp', nombre: 'Posibilidad de expansión', ponderacion: 10 },
      ],
      sitios: [
        {
          id: 'alt1',
          nombre: 'Sitio 1 — sobre la carretera Catacamas-Juticalpa',
          calificaciones: { vial: 5, agua: 3, ener: 5, bio: 3, terr: 2, prod: 4, exp: 3 },
          punto: { x: 5, y: 4.5 },
        },
        {
          id: 'alt2',
          nombre: 'Sitio 2 — en las afueras de Catacamas',
          calificaciones: { vial: 3, agua: 5, ener: 4, bio: 5, terr: 4, prod: 5, exp: 5 },
          punto: { x: 3.5, y: 5.5 },
        },
      ],
      puntos: ZONAS_OLANCHO,
      tipoDistancia: 'rectilinea',
      unidadCarga: 'productores',
      unidadDistancia: 'unidades de cuadrícula',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Coordenada x del centro de gravedad de los productores.',
        tipo: 'numerica',
        respuesta: cgOlancho.datos?.centro.x ?? null,
        unidad: null,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['La carga total es 150 + 200 + 80 + 60 = 490 productores.'],
        claveVerificacion: 'localizacion.centroGravedad',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado: 'Coordenada y del centro de gravedad de los productores.',
        tipo: 'numerica',
        respuesta: cgOlancho.datos?.centro.y ?? null,
        unidad: null,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['Mismo denominador, distinto numerador: ahora se ponderan las coordenadas y.'],
        claveVerificacion: 'localizacion.centroGravedad',
        puntos: 2,
      },
      {
        id: 'p3',
        enunciado:
          'Los dos métodos pueden recomendar sitios distintos: el de carga-distancia favorece la proximidad y el de ' +
          'puntaje ponderado favorece la bioseguridad y el agua. Redacte la recomendación final que llevaría a la Junta ' +
          'Directiva, indicando cómo resolvió el conflicto.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Un centro de acopio de leche con mala bioseguridad puede perder el producto entero.',
          'El costo logístico se paga todos los días; una falla sanitaria se paga una vez, pero puede ser fatal.',
        ],
        claveVerificacion: null,
        puntos: 4,
      },
    ],
    moneda: null,
    unidades: ['productores'],
    tiempoEstimadoMinutos: 45,
    origen: 'derivado',
    validacion: 'verificado',
    fuenteId: 'doc-localizacion',
    atribucion: 'Caso: integrando lo aprendido',
    inconsistencias: [],
    notasDocente:
      'Las coordenadas y el número de productores son los del documento. Los dos sitios alternativos y sus calificaciones ' +
      'se agregaron para poder completar el ejercicio, porque el documento pide evaluarlos pero no los especifica. ' +
      'Por eso el ejercicio está marcado como «derivado».',
    semilla: null,
    creadoEn: '2026-06-17T00:00:00.000Z',
    modificadoEn: '2026-06-17T00:00:00.000Z',
  },
];

// ───────────────────────────── Distribución física ─────────────────────────────

const DEPTOS_TALLER = [
  { id: 'd1', nombre: 'Taladro y rectificación', bloques: 1 },
  { id: 'd2', nombre: 'Equipo NC', bloques: 1 },
  { id: 'd3', nombre: 'Embarques y recepción', bloques: 1 },
  { id: 'd4', nombre: 'Tornos y taladros', bloques: 1 },
  { id: 'd5', nombre: 'Depósito de herramientas', bloques: 1 },
  { id: 'd6', nombre: 'Inspección', bloques: 1 },
];

/** Matriz de recorridos de la diapositiva 11 de `Distribución 2025.pptx`. */
const RECORRIDOS_TALLER = [
  [0, 20, 0, 20, 0, 80],
  [0, 0, 10, 0, 75, 0],
  [0, 0, 0, 15, 0, 90],
  [0, 0, 0, 0, 70, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
];

const cuadricula = (orden: readonly string[], columnas = 3) =>
  Object.fromEntries(
    orden.map((id, i) => [id, [{ fila: Math.floor(i / columnas), columna: i % columnas }]]),
  );

// Los dos almacenes de práctica de las diapositivas 19 y 20. Misma bodega de
// catorce bloques que la diapositiva 4; cambian las cargas y las áreas.
const almacen = (
  id: string,
  diapositiva: number,
  titulo: string,
  filas: readonly (readonly [string, string, number, number])[],
  optimo: number,
  notasDocente: string,
): Ejercicio => {
  const departamentos = [
    { id: 'plat', nombre: 'Plataforma de carga', bloques: 2, fijo: true },
    ...filas.map(([idDep, nombre, , bloques]) => ({ id: idDep, nombre, bloques })),
  ];

  // Punto de partida: los departamentos en el orden de la tabla, llenando el
  // corredor de la plataforma hacia el fondo. No sale del material.
  const asignacion: Record<string, { fila: number; columna: number }[]> = {
    plat: [{ fila: 0, columna: 0 }, { fila: 1, columna: 0 }],
  };
  let k = 0;
  for (const [idDep, , , bloques] of filas) {
    asignacion[idDep] = Array.from({ length: bloques }, () => {
      const celda = { fila: k % 2, columna: Math.floor(k / 2) + 1 };
      k++;
      return celda;
    });
  }

  const n = departamentos.length;
  const recorridos = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === 0 && j > 0 ? filas[j - 1]![2] : 0)),
  );

  return {
    id,
    titulo,
    tema: 'distribucion',
    metodo: 'Distribución de almacenes por carga-distancia a la plataforma',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'El almacén de electrodomésticos se organiza a los lados de un corredor central que arranca en la plataforma de ' +
      'carga: siete bloques por lado, catorce en total. Dos bloques enfrentados están a la misma distancia de la ' +
      'plataforma, de 1 a 7 según qué tan adentro del corredor queden. Los recorridos de cada departamento se reparten ' +
      'por igual entre sus bloques.\n\n' +
      '| Departamento | Recorridos | Área (bloques) |\n' +
      '|---|---|---|\n' +
      filas.map(([, nombre, carga, bloques]) => `| ${nombre} | ${carga} | ${bloques} |`).join('\n') +
      '\n\n**Acomode los departamentos y calcule el puntaje carga-distancia de su distribución.**',
    datos: {
      tipo: 'distribucion',
      departamentos,
      recorridos,
      plano: { id: 'inicial', nombre: 'Punto de partida', filas: 2, columnas: 8, asignacion },
      planoReferencia: null,
      tipoDistancia: 'pasillo',
      relaciones: [],
      unidadRecorridos: 'recorridos',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje carga-distancia de la mejor distribución posible.',
        tipo: 'numerica',
        respuesta: optimo,
        unidad: 'recorridos·bloques',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Lo que decide no es cuántos recorridos hace un departamento, sino cuántos hace **cada bloque suyo**: divida los recorridos entre el área.',
          'Ordene los catorce bloques de mayor a menor carga por bloque.',
          'Déles las profundidades más cortas en ese orden: dos bloques por profundidad, de la 1 a la 7. Ese acomodo es el mínimo.',
        ],
        claveVerificacion: 'distribucion.puntajeCD',
        puntos: 3,
      },
      {
        id: 'p2',
        enunciado:
          'Un departamento con muchos recorridos totales puede acabar al fondo del corredor y otro con menos, al frente. ' +
          'Explique por qué, y qué tendría que pasar para que convenga lo contrario.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Compare recorridos por bloque, no recorridos totales.',
          'Un departamento grande reparte su carga entre muchos bloques, así que cada bloque suyo pesa poco.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ],
    moneda: null,
    unidades: ['recorridos', 'bloques'],
    tiempoEstimadoMinutos: 30,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'ppt-distribucion-2026',
    atribucion: `Distribución 2026.pdf, diapositiva ${diapositiva}`,
    inconsistencias: [],
    notasDocente,
    semilla: null,
    creadoEn: '2026-08-28T00:00:00.000Z',
    modificadoEn: '2026-08-28T00:00:00.000Z',
  };
};

export const EJERCICIOS_DISTRIBUCION: readonly Ejercicio[] = [
  {
    id: 'dist-01',
    titulo: 'Distribución de un taller de maquinado',
    tema: 'distribucion',
    metodo: 'Plano de bloques, matriz de recorridos y carga-distancia',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'Un taller de maquinado de 60 por 90 pies tiene seis departamentos que se acomodan en una retícula de tres filas ' +
      'por dos columnas. La matriz de recorridos indica cuántos viajes de material ocurren entre cada par de ' +
      'departamentos por periodo.\n\n' +
      'Además, la gráfica REL agrega restricciones que los viajes no capturan: la inspección debe estar junto al taladro ' +
      '(A, por manejo de materiales) y junto a embarques (A), mientras que la inspección **no debe** quedar junto a los ' +
      'tornos por el ruido (N).\n\n' +
      '**Proponga una distribución, calcule su puntaje carga-distancia y compárela con la distribución actual.**',
    datos: {
      tipo: 'distribucion',
      departamentos: DEPTOS_TALLER,
      recorridos: RECORRIDOS_TALLER,
      // Los dos planos salen de las distancias que imprime la diapositiva 11:
      // son los únicos acomodos de la retícula 3×2 que las reproducen, y sus
      // puntajes dan exactamente los 785 y 420 de la presentación.
      plano: { id: 'actual', nombre: 'Distribución actual', filas: 3, columnas: 2, asignacion: cuadricula(['d1', 'd3', 'd5', 'd4', 'd6', 'd2'], 2) },
      planoReferencia: { id: 'propuesta', nombre: 'Distribución propuesta', filas: 3, columnas: 2, asignacion: cuadricula(['d1', 'd6', 'd2', 'd3', 'd5', 'd4'], 2) },
      tipoDistancia: 'rectilinea',
      relaciones: [
        { desde: 'd1', hasta: 'd2', clasificacion: 'E', claves: [3, 1] },
        { desde: 'd1', hasta: 'd3', clasificacion: 'S', claves: [] },
        { desde: 'd1', hasta: 'd4', clasificacion: 'I', claves: [2, 1] },
        { desde: 'd1', hasta: 'd5', clasificacion: 'S', claves: [] },
        { desde: 'd1', hasta: 'd6', clasificacion: 'A', claves: [1] },
        { desde: 'd2', hasta: 'd3', clasificacion: 'O', claves: [1] },
        { desde: 'd2', hasta: 'd4', clasificacion: 'S', claves: [] },
        { desde: 'd2', hasta: 'd5', clasificacion: 'E', claves: [1] },
        { desde: 'd2', hasta: 'd6', clasificacion: 'I', claves: [6] },
        { desde: 'd3', hasta: 'd4', clasificacion: 'O', claves: [1] },
        { desde: 'd3', hasta: 'd5', clasificacion: 'S', claves: [] },
        { desde: 'd3', hasta: 'd6', clasificacion: 'A', claves: [1] },
        { desde: 'd4', hasta: 'd5', clasificacion: 'E', claves: [1] },
        { desde: 'd4', hasta: 'd6', clasificacion: 'N', claves: [5] },
        { desde: 'd5', hasta: 'd6', clasificacion: 'S', claves: [] },
      ],
      unidadRecorridos: 'viajes',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje carga-distancia de la distribución actual.',
        tipo: 'numerica',
        respuesta: 785,
        unidad: 'viajes·bloques',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Ubique el centroide de cada departamento en la retícula.',
          'La distancia entre dos departamentos adyacentes horizontal o verticalmente es 1 bloque.',
          'Multiplique los recorridos de cada par por su distancia y sume.',
        ],
        claveVerificacion: 'distribucion.puntajeCD',
        puntos: 3,
      },
      {
        id: 'p3',
        enunciado: 'Puntaje carga-distancia de la distribución propuesta.',
        tipo: 'numerica',
        respuesta: 420,
        unidad: 'viajes·bloques',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Es el mismo cálculo, sobre el otro plano de bloques.',
          'La propuesta acerca la inspección al taladro y a embarques: son las dos relaciones A de la gráfica REL.',
        ],
        claveVerificacion: 'distribucion.puntajeCDPropuesta',
        puntos: 3,
      },
      {
        id: 'p4',
        enunciado: 'Mejora porcentual de la propuesta respecto de la distribución actual.',
        tipo: 'numerica',
        respuesta: 46.5,
        unidad: '%',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'La mejora se mide contra la situación de partida, no contra la propuesta.',
          'ME = (1 − CD propuesta / CD actual) × 100.',
        ],
        claveVerificacion: 'distribucion.mejoraPorcentual',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado:
          '¿Su distribución propuesta cumple todas las restricciones de la gráfica REL? Señale cuáles incumple, si es ' +
          'que alguna, y justifique si el mejor puntaje compensa el incumplimiento.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Una relación N incumplida no se compensa con puntaje: es una restricción, no una preferencia.',
          'Una relación A incumplida sí puede negociarse si el costo de cumplirla es muy alto.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ],
    moneda: null,
    unidades: ['viajes', 'bloques'],
    tiempoEstimadoMinutos: 40,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'ppt-distribucion-2026',
    atribucion: 'Distribución Física II y III — Distribución 2026.pdf, diapositivas 10 a 17',
    inconsistencias: [],
    notasDocente:
      'La matriz de recorridos y la gráfica REL son las de la presentación. Los planos de bloques ya no son una ' +
      'reconstrucción aproximada: se derivaron de la columna de distancias que imprime la diapositiva 11 y son los ' +
      'únicos acomodos de la retícula 3×2 que las reproducen. Sus puntajes dan 785 y 420, los mismos totales impresos, ' +
      'y la mejora sale en 46,50 % contra el 46,49 % de la diapositiva (la diferencia es el redondeo de la fórmula).\n\n' +
      'La comprobación que cierra el caso es otra: el plano propuesto cumple las dos relaciones A de la gráfica REL ' +
      '—inspección junto al taladro y junto a embarques— que el plano actual incumple, y en ninguno de los dos queda la ' +
      'inspección junto a los tornos (relación N). Ese es exactamente el argumento de Distribución Física III, así que ' +
      'los planos reconstruidos cuentan la historia que el material quiere contar.\n\n' +
      'Conviene anticipar una pregunta de clase. Con solo seis departamentos el laboratorio recorre las 720 ' +
      'permutaciones, así que el botón de búsqueda entrega el mínimo global: **400, mejor que los 420 de la ' +
      'propuesta**, y sin incumplir ninguna relación de la gráfica REL. La diapositiva no afirma que su propuesta sea ' +
      'óptima —solo mide cuánto mejora sobre la actual—, así que no es una inconsistencia del material; es una buena ' +
      'ocasión para mostrar que una distribución puede ser mejor que la propuesta y aun así respetar todas las ' +
      'restricciones cualitativas.',
    semilla: null,
    creadoEn: '2025-06-20T00:00:00.000Z',
    modificadoEn: '2025-06-20T00:00:00.000Z',
  },
  {
    id: 'dist-02',
    titulo: 'Distribución de un almacén alrededor de la plataforma de carga',
    tema: 'distribucion',
    metodo: 'Distribución de almacenes por carga-distancia a la plataforma',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'Un almacén de electrodomésticos se organiza a los lados de un corredor central que arranca en la plataforma de ' +
      'carga. A cada lado hay siete bloques de área, catorce en total. Como el material viaja por el corredor, dos ' +
      'bloques enfrentados están a la misma distancia de la plataforma: la distancia de un bloque es simplemente qué tan ' +
      'adentro del corredor está, de 1 a 7.\n\n' +
      'Cada departamento genera una cantidad conocida de recorridos desde y hacia la plataforma y necesita un número ' +
      'determinado de bloques. Los recorridos se reparten por igual entre los bloques del departamento.\n\n' +
      '| Departamento | Recorridos | Área (bloques) |\n' +
      '|---|---|---|\n' +
      '| 1 Tostadores eléctricos | 280 | 1 |\n' +
      '| 2 Aparatos de aire acondicionado | 160 | 2 |\n' +
      '| 3 Hornos de microondas | 360 | 1 |\n' +
      '| 4 Aparatos estereofónicos | 375 | 3 |\n' +
      '| 5 Televisores | 800 | 4 |\n' +
      '| 6 Radios | 150 | 1 |\n' +
      '| 7 Almacenamiento a granel | 100 | 2 |\n\n' +
      '**Calcule el puntaje carga-distancia de las dos distribuciones del material y decida cuál conviene.**\n\n' +
      '> Ojo con la segunda: la presentación la rotula «Óptima», pero conviene comprobar el rótulo antes de creerlo ' +
      '(inconsistencia I-03).',
    datos: {
      tipo: 'distribucion',
      departamentos: [
        { id: 'plat', nombre: 'Plataforma de carga', bloques: 2, fijo: true },
        { id: 'a1', nombre: 'Tostadores eléctricos', bloques: 1 },
        { id: 'a2', nombre: 'Aparatos de aire acondicionado', bloques: 2 },
        { id: 'a3', nombre: 'Hornos de microondas', bloques: 1 },
        { id: 'a4', nombre: 'Aparatos estereofónicos', bloques: 3 },
        { id: 'a5', nombre: 'Televisores', bloques: 4 },
        { id: 'a6', nombre: 'Radios', bloques: 1 },
        { id: 'a7', nombre: 'Almacenamiento a granel', bloques: 2 },
      ],
      // Solo hay recorridos entre cada departamento y la plataforma. Cada par se
      // anota una sola vez: el puntaje suma las dos mitades de la matriz.
      recorridos: [
        [0, 280, 160, 360, 375, 800, 150, 100],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
      ],
      // Diapositiva 5: puntaje 6 650. La columna 0 es la plataforma y las
      // columnas 1 a 7 son las profundidades del corredor.
      plano: {
        id: 'diapositiva5',
        nombre: 'Distribución de la diapositiva 5',
        filas: 2,
        columnas: 8,
        asignacion: {
          plat: [{ fila: 0, columna: 0 }, { fila: 1, columna: 0 }],
          a3: [{ fila: 0, columna: 1 }],
          a1: [{ fila: 1, columna: 1 }],
          a5: [
            { fila: 0, columna: 2 },
            { fila: 1, columna: 2 },
            { fila: 0, columna: 3 },
            { fila: 1, columna: 3 },
          ],
          a4: [
            { fila: 0, columna: 4 },
            { fila: 0, columna: 5 },
            { fila: 1, columna: 5 },
          ],
          a6: [{ fila: 1, columna: 4 }],
          a2: [{ fila: 0, columna: 6 }, { fila: 1, columna: 6 }],
          a7: [{ fila: 0, columna: 7 }, { fila: 1, columna: 7 }],
        },
      },
      // Diapositiva 6, la rotulada «Óptima»: puntaje 6 730. Lo único que cambia
      // es que los tostadores se van a la profundidad 2 y un bloque de
      // televisores toma su lugar en la 1.
      planoReferencia: {
        id: 'diapositiva6',
        nombre: 'Distribución rotulada «Óptima» en la diapositiva 6',
        filas: 2,
        columnas: 8,
        asignacion: {
          plat: [{ fila: 0, columna: 0 }, { fila: 1, columna: 0 }],
          a3: [{ fila: 0, columna: 1 }],
          a1: [{ fila: 1, columna: 2 }],
          a5: [
            { fila: 1, columna: 1 },
            { fila: 0, columna: 2 },
            { fila: 0, columna: 3 },
            { fila: 1, columna: 3 },
          ],
          a4: [
            { fila: 0, columna: 4 },
            { fila: 0, columna: 5 },
            { fila: 1, columna: 5 },
          ],
          a6: [{ fila: 1, columna: 4 }],
          a2: [{ fila: 0, columna: 6 }, { fila: 1, columna: 6 }],
          a7: [{ fila: 0, columna: 7 }, { fila: 1, columna: 7 }],
        },
      },
      tipoDistancia: 'pasillo',
      relaciones: [],
      unidadRecorridos: 'recorridos',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje carga-distancia de la distribución de la diapositiva 5.',
        tipo: 'numerica',
        respuesta: 6650,
        unidad: 'recorridos·bloques',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Reparta los recorridos de cada departamento entre sus bloques: televisores son 800 en cuatro bloques, 200 por bloque.',
          'Multiplique los recorridos de cada bloque por su profundidad en el corredor y sume los catorce.',
        ],
        claveVerificacion: 'distribucion.puntajeCD',
        puntos: 3,
      },
      {
        id: 'p2',
        enunciado: 'Puntaje carga-distancia de la distribución que la diapositiva 6 rotula «Óptima».',
        tipo: 'numerica',
        respuesta: 6730,
        unidad: 'recorridos·bloques',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Entre las dos distribuciones solo cambian dos bloques de sitio.',
          'Los tostadores mueven 280 recorridos y pasan de la profundidad 1 a la 2; un bloque de televisores mueve 200 y hace el camino inverso.',
        ],
        claveVerificacion: 'distribucion.puntajeCD',
        puntos: 3,
      },
      {
        id: 'p3',
        enunciado:
          'El material rotula «Óptima» a la distribución de mayor puntaje. Explique cuál de las dos conviene de verdad ' +
          'y por qué, y señale qué regla general se desprende para decidir a qué profundidad va cada departamento.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Carga-distancia es un problema de minimización: menor puntaje es mejor.',
          'Compare recorridos por bloque, no recorridos totales: es lo que decide qué conviene tener cerca.',
          'Los tostadores mueven 280 recorridos en un solo bloque; los televisores, 200 por bloque.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
      {
        id: 'p4',
        enunciado:
          'Explique la regla práctica que se desprende de este ejercicio para organizar cualquier bodega, y mencione ' +
          'una situación real en la que esa regla no debería aplicarse.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'La regla general es: lo que más se mueve por bloque, más cerca de la plataforma.',
          'Piense en productos que exigen refrigeración, seguridad o separación sanitaria.',
        ],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['recorridos', 'bloques'],
    tiempoEstimadoMinutos: 40,
    origen: 'textual',
    validacion: 'con_inconsistencia',
    fuenteId: 'ppt-distribucion-2026',
    atribucion: 'Distribución Física I — Distribución 2026.pdf, diapositivas 4 a 6',
    inconsistencias: ['I-03'],
    notasDocente:
      'Los recorridos y las áreas son los de la diapositiva 4, ahora completos: el ejercicio ya no simplifica todo a un ' +
      'bloque por departamento. El plano de bloques se reconstruyó de la tabla carga-distancia de las diapositivas 5 y ' +
      '6, que da la carga y la distancia de cada uno de los catorce bloques; hay exactamente dos bloques en cada ' +
      'profundidad de 1 a 7, y las cargas por bloque identifican sin ambigüedad a qué departamento pertenece cada uno. ' +
      'Los dos planos reproducen los totales impresos, 6 650 y 6 730.\n\n' +
      'El caso sirve para enseñar dos cosas. La primera es la inconsistencia I-03: la diapositiva 6 rotula «Óptima» la ' +
      'distribución peor. Y no es discutible, porque 6 650 sí es el óptimo verdadero: con dos bloques disponibles en ' +
      'cada profundidad, ordenar los bloques de mayor a menor carga y darles las profundidades más cortas es óptimo, y ' +
      'eso da exactamente 6 650. La segunda es por qué: los tostadores mueven 280 recorridos concentrados en un solo ' +
      'bloque, más que los 200 por bloque de los televisores, así que son ellos los que deben quedar en la primera ' +
      'profundidad. Lo que manda es la carga por bloque, no la carga total del departamento —los televisores mueven 800 ' +
      'en total y aun así van detrás—.',
    semilla: null,
    creadoEn: '2025-06-20T00:00:00.000Z',
    modificadoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'dist-03',
    titulo: 'Oficinas para seis analistas — García Consulting',
    tema: 'distribucion',
    metodo: 'Carga-distancia con departamentos fijos',
    contexto: 'servicios',
    dificultad: 'avanzado',
    enunciado:
      'El jefe del grupo de sistemas de información de García Consulting debe asignar 6 analistas (A a F) a 6 oficinas ' +
      'del mismo tamaño, dispuestas en dos filas de tres. La tabla muestra los contactos entre analistas. Por la índole ' +
      'de las tareas, **el analista A debe ocupar la oficina 4 y el analista D la oficina 3**. Considere distancias ' +
      'rectilíneas.\n\n' +
      '**¿Cuáles son las mejores localizaciones para los otros cuatro analistas y cuál es el puntaje carga-distancia de ' +
      'su propuesta?**',
    datos: {
      tipo: 'distribucion',
      departamentos: [
        { id: 'A', nombre: 'Analista A', bloques: 1, fijo: true },
        { id: 'B', nombre: 'Analista B', bloques: 1 },
        { id: 'C', nombre: 'Analista C', bloques: 1 },
        { id: 'D', nombre: 'Analista D', bloques: 1, fijo: true },
        { id: 'E', nombre: 'Analista E', bloques: 1 },
        { id: 'F', nombre: 'Analista F', bloques: 1 },
      ],
      // A-C: 6, B-D: 12, C-D: 2, C-E: 7, D-F: 4
      // Cada contacto se anota una sola vez: el puntaje suma las dos mitades.
      recorridos: [
        [0, 0, 6, 0, 0, 0],
        [0, 0, 0, 12, 0, 0],
        [0, 0, 0, 2, 7, 0],
        [0, 0, 0, 0, 0, 4],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ],
      plano: {
        id: 'inicial',
        nombre: 'Asignación inicial',
        filas: 2,
        columnas: 3,
        // Oficinas 1,2,3 arriba y 4,5,6 abajo. A en la 4, D en la 3.
        asignacion: {
          B: [{ fila: 0, columna: 0 }],
          C: [{ fila: 0, columna: 1 }],
          D: [{ fila: 0, columna: 2 }],
          A: [{ fila: 1, columna: 0 }],
          E: [{ fila: 1, columna: 1 }],
          F: [{ fila: 1, columna: 2 }],
        },
      },
      planoReferencia: null,
      tipoDistancia: 'rectilinea',
      relaciones: [],
      unidadRecorridos: 'contactos',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Puntaje carga-distancia de la mejor propuesta posible.',
        tipo: 'numerica',
        respuesta: 37,
        unidad: 'contactos·oficinas',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'La relación B-D tiene 12 contactos: es la más pesada con diferencia.',
          'D está fijo en la oficina 3, así que B debería quedar adyacente a ella.',
          'Solo hay cuatro analistas móviles: son 4! = 24 combinaciones posibles.',
        ],
        claveVerificacion: 'distribucion.puntajeCD',
        puntos: 3,
      },
      {
        id: 'p2',
        enunciado:
          'Las restricciones fijaron dos analistas. Explique cómo cambiaría el resultado si A pudiera moverse ' +
          'libremente, y qué le dice eso sobre el costo de las restricciones organizativas.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Compare el resultado con y sin la restricción usando el buscador del laboratorio.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ],
    moneda: null,
    unidades: ['contactos'],
    tiempoEstimadoMinutos: 30,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'ppt-distribucion-2026',
    atribucion: 'Problema de distribución física — Distribución 2026.pdf, diapositiva 22',
    inconsistencias: [],
    notasDocente:
      'El enunciado y la tabla de contactos son los de la diapositiva. Con A fija en la oficina 4 y D en la 3 quedan ' +
      '4! = 24 acomodos, así que el laboratorio los recorre todos y el 37 es el mínimo global, no una heurística. Se ' +
      'alcanza con F en la 1, B en la 2 y C en la 5, dejando E en la 6. La clave está en la relación B–D, de 12 ' +
      'contactos: es la más pesada con diferencia y hay que dejarla en distancia 1.',
    semilla: null,
    creadoEn: '2025-06-20T00:00:00.000Z',
    modificadoEn: '2025-06-20T00:00:00.000Z',
  },
  almacen(
    'dist-04',
    19,
    'Almacén de electrodomésticos: primera variante de práctica',
    [
      ['a1', 'Tostadores eléctricos', 900, 3],
      ['a2', 'Aparatos de aire acondicionado', 150, 1],
      ['a3', 'Hornos de microondas', 360, 2],
      ['a4', 'Aparatos estereofónicos', 375, 1],
      ['a5', 'Televisores', 390, 3],
      ['a6', 'Radios', 200, 2],
      ['a7', 'Almacenamiento a granel', 260, 2],
    ],
    8335,
    'Problema de práctica de la diapositiva 19: la misma bodega de catorce bloques, con otras cargas y otras áreas. El ' +
      'óptimo es 8 335 y se alcanza ordenando los bloques por carga por bloque. Es el mejor caso del tema para discutir ' +
      'esa distinción: los tostadores mueven 900 recorridos y los estereofónicos 375, pero los estereofónicos van en un ' +
      'solo bloque —375 por bloque— y los tostadores en tres —300 por bloque—, así que los estereofónicos ganan la ' +
      'primera profundidad. Y los televisores, con 390 recorridos totales, quedan más lejos que los microondas, que ' +
      'mueven 360: 130 por bloque contra 180.',
  ),
  almacen(
    'dist-05',
    20,
    'Almacén de electrodomésticos: segunda variante de práctica',
    [
      ['a1', 'Tostadores eléctricos', 800, 2],
      ['a2', 'Aparatos de aire acondicionado', 150, 1],
      ['a3', 'Hornos de microondas', 360, 3],
      ['a4', 'Aparatos estereofónicos', 375, 1],
      ['a5', 'Televisores', 280, 4],
      ['a6', 'Radios', 100, 1],
      ['a7', 'Almacenamiento a granel', 160, 2],
    ],
    6070,
    'Problema de práctica de la diapositiva 20. El óptimo es 6 070. Aquí los televisores son el caso extremo: 280 ' +
      'recorridos repartidos en cuatro bloques son 70 por bloque, el valor más bajo de toda la tabla, así que ocupan las ' +
      'dos profundidades del fondo pese a no ser el departamento más pequeño.',
  ),
];
