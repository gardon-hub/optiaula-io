/**
 * Esquemas de datos con Zod.
 *
 * Todo lo que entra a la aplicación desde fuera —archivos JSON, CSV, respaldos,
 * ejercicios importados— pasa por aquí antes de tocar el motor. Los tipos de
 * TypeScript se derivan de los esquemas para que nunca se separen.
 */

import { z } from 'zod';

// ───────────────────────────── Catálogos ─────────────────────────────

// El orden es el de la programación del ciclo: el método gráfico se ve
// después de PERT y antes del modelo de transporte, que es un caso particular
// de programación lineal.
export const TEMAS = [
  'fundamentos',
  'productividad',
  'localizacion',
  'distribucion',
  'equilibrio',
  'cpm',
  'pert',
  'grafico',
  'simplex',
  'asignacion',
  'transporte',
  'inventarios',
  'colas',
] as const;

export const esquemaTema = z.enum(TEMAS);
export type Tema = z.infer<typeof esquemaTema>;

export const NOMBRE_TEMA: Record<Tema, string> = {
  fundamentos: 'Fundamentos de gestión de operaciones',
  productividad: 'Productividad',
  localizacion: 'Decisiones de localización',
  distribucion: 'Distribución física de instalaciones',
  equilibrio: 'Punto de equilibrio',
  cpm: 'Diagramas de red y ruta crítica',
  pert: 'PERT',
  grafico: 'Método gráfico de programación lineal',
  simplex: 'Método simplex',
  asignacion: 'Modelo de asignación',
  transporte: 'Modelo de transporte',
  inventarios: 'Sistemas y modelos de inventarios',
  colas: 'Líneas de espera',
};

export const NUMERO_MODULO: Record<Tema, number> = {
  fundamentos: 1,
  productividad: 2,
  localizacion: 3,
  distribucion: 4,
  equilibrio: 5,
  cpm: 6,
  pert: 7,
  grafico: 8,
  simplex: 9,
  asignacion: 10,
  transporte: 11,
  inventarios: 12,
  colas: 13,
};

export const esquemaDificultad = z.enum(['basico', 'intermedio', 'avanzado']);
export type Dificultad = z.infer<typeof esquemaDificultad>;

export const NOMBRE_DIFICULTAD: Record<Dificultad, string> = {
  basico: 'Básico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const esquemaMoneda = z.enum(['HNL', 'USD']);
export type Moneda = z.infer<typeof esquemaMoneda>;

/** De dónde salió el ejercicio. Distingue lo transcrito de lo derivado. */
export const esquemaOrigen = z.enum(['textual', 'derivado', 'generado', 'docente']);
export type Origen = z.infer<typeof esquemaOrigen>;

export const DESCRIPCION_ORIGEN: Record<Origen, string> = {
  textual: 'Transcrito literalmente de los materiales del curso',
  derivado: 'Construido a partir de datos verificados de los materiales, pero no transcrito',
  generado: 'Producido automáticamente por el generador y verificado por el solucionador',
  docente: 'Creado o editado por el docente dentro de la aplicación',
};

export const esquemaValidacion = z.enum(['verificado', 'con_inconsistencia', 'sin_verificar']);
export type Validacion = z.infer<typeof esquemaValidacion>;

/** Contextos productivos usados para etiquetar y filtrar la biblioteca. */
export const CONTEXTOS = [
  'avicultura_huevo',
  'avicultura_engorde',
  'avicultura_pollitos',
  'cafe',
  'maiz',
  'hortalizas',
  'ganaderia',
  'lacteos',
  'tilapia',
  'porcicultura',
  'cacao',
  'miel',
  'fertilizantes',
  'veterinaria',
  'cooperativa',
  'agroindustria',
  'comunitario',
  'huerto_escolar',
  'azucar',
  'melon',
  'servicios',
  'general',
] as const;

export const esquemaContexto = z.enum(CONTEXTOS);
export type Contexto = z.infer<typeof esquemaContexto>;

export const NOMBRE_CONTEXTO: Record<Contexto, string> = {
  avicultura_huevo: 'Producción de huevos',
  avicultura_engorde: 'Pollos de engorde',
  avicultura_pollitos: 'Pollitas y pollitos de un día',
  cafe: 'Café',
  maiz: 'Maíz',
  hortalizas: 'Hortalizas',
  ganaderia: 'Ganadería',
  lacteos: 'Lácteos',
  tilapia: 'Tilapia',
  porcicultura: 'Porcicultura',
  cacao: 'Cacao',
  miel: 'Miel',
  fertilizantes: 'Fertilizantes',
  veterinaria: 'Insumos veterinarios',
  cooperativa: 'Cooperativas',
  agroindustria: 'Plantas agroindustriales',
  comunitario: 'Proyectos comunitarios',
  huerto_escolar: 'Huertos escolares',
  azucar: 'Azúcar',
  melon: 'Melón de exportación',
  servicios: 'Servicios',
  general: 'General',
};

// ───────────────────────────── Fuentes ─────────────────────────────

export const esquemaFuente = z.object({
  id: z.string().min(1),
  /** Cita completa, en APA cuando es bibliografía. */
  cita: z.string().min(1),
  tipo: z.enum(['libro', 'documento_curso', 'presentacion_curso', 'otro']),
  /** Archivo del que se extrajo, cuando aplica. */
  archivo: z.string().nullable().default(null),
  anio: z.number().int().nullable().default(null),
});
export type Fuente = z.infer<typeof esquemaFuente>;

// ───────────────────────────── Datos por método ─────────────────────────────

export const esquemaInsumo = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  categoria: z.enum(['mano_obra', 'energia', 'materiales', 'agua', 'capital', 'costos_fijos', 'otros']),
  cantidad: z.number().finite().nonnegative(),
  unidad: z.string().min(1),
  costoUnitario: z.number().finite().nonnegative(),
});

export const esquemaDatosProductividad = z.object({
  tipo: z.literal('productividad'),
  moneda: esquemaMoneda,
  insumos: z.array(esquemaInsumo).min(1),
  produccionTerminada: z.number().finite().nonnegative(),
  unidadProduccion: z.string().min(1),
  inventarioEnProceso: z.number().finite().nonnegative(),
  gradoAvance: z.number().min(0).max(1),
  tratamiento: z.enum(['excluir', 'incluir', 'ponderado']),
  precioVenta: z.number().finite().nonnegative(),
  costoTotalDeclarado: z.number().finite().nullable(),
});

export const esquemaPunto = z.object({ x: z.number().finite(), y: z.number().finite() });

export const esquemaDatosLocalizacion = z.object({
  tipo: z.literal('localizacion'),
  metodo: z.enum(['puntaje_ponderado', 'carga_distancia', 'centro_gravedad', 'combinado']),
  escalaMinima: z.number().default(1),
  escalaMaxima: z.number().default(5),
  factores: z.array(
    z.object({ id: z.string().min(1), nombre: z.string().min(1), ponderacion: z.number().finite().nonnegative() }),
  ),
  sitios: z.array(
    z.object({
      id: z.string().min(1),
      nombre: z.string().min(1),
      calificaciones: z.record(z.string(), z.number().finite()),
      punto: esquemaPunto.optional(),
    }),
  ),
  puntos: z.array(
    z.object({
      id: z.string().min(1),
      nombre: z.string().min(1),
      punto: esquemaPunto,
      carga: z.number().finite().nonnegative(),
    }),
  ),
  tipoDistancia: z.enum(['rectilinea', 'euclidiana']),
  unidadCarga: z.string().default('unidades'),
  unidadDistancia: z.string().default('km'),
});

export const esquemaCelda = z.object({ fila: z.number().int().nonnegative(), columna: z.number().int().nonnegative() });

export const esquemaDatosDistribucion = z.object({
  tipo: z.literal('distribucion'),
  departamentos: z.array(
    z.object({
      id: z.string().min(1),
      nombre: z.string().min(1),
      bloques: z.number().int().positive(),
      fijo: z.boolean().optional(),
    }),
  ),
  recorridos: z.array(z.array(z.number().finite().nonnegative())),
  plano: z.object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    filas: z.number().int().positive(),
    columnas: z.number().int().positive(),
    asignacion: z.record(z.string(), z.array(esquemaCelda)),
  }),
  planoReferencia: z
    .object({
      id: z.string().min(1),
      nombre: z.string().min(1),
      filas: z.number().int().positive(),
      columnas: z.number().int().positive(),
      asignacion: z.record(z.string(), z.array(esquemaCelda)),
    })
    .nullable()
    .default(null),
  tipoDistancia: z.enum(['rectilinea', 'euclidiana', 'pasillo']),
  relaciones: z.array(
    z.object({
      desde: z.string().min(1),
      hasta: z.string().min(1),
      clasificacion: z.enum(['A', 'E', 'I', 'O', 'S', 'N']),
      claves: z.array(z.number().int()),
    }),
  ),
  unidadRecorridos: z.string().default('viajes'),
});

export const esquemaDatosEquilibrio = z.object({
  tipo: z.literal('equilibrio'),
  modo: z.enum(['simple', 'multiproducto']),
  /** Qué mide la mezcla de ventas en el modo multiproducto. Ver inconsistencia I-13. */
  baseMezcla: z.enum(['unidades', 'ingresos']).default('unidades'),
  moneda: esquemaMoneda,
  costosFijos: z.number().finite().nonnegative(),
  costoVariableUnitario: z.number().finite().nonnegative(),
  precioVenta: z.number().finite().nonnegative(),
  comisionPorcentaje: z.number().min(0).max(99.99).default(0),
  valorRecuperacion: z.number().finite().nonnegative().default(0),
  capacidad: z.number().finite().positive().nullable(),
  volumenEsperado: z.number().finite().nonnegative().nullable(),
  utilidadObjetivo: z.number().finite().nullable(),
  unidadProducto: z.string().min(1),
  productos: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1),
        precioVenta: z.number().finite().positive(),
        costoVariableUnitario: z.number().finite().nonnegative(),
        participacion: z.number().finite().nonnegative(),
      }),
    )
    .default([]),
});

export const esquemaDatosCPM = z.object({
  tipo: z.literal('cpm'),
  actividades: z.array(
    z.object({
      id: z.string().min(1),
      descripcion: z.string(),
      predecesoras: z.array(z.string()),
      duracion: z.number().finite().nonnegative(),
      /**
       * Datos de compresión (crashing). Son opcionales: un ejercicio de ruta
       * crítica corriente no los trae, y sin ellos el módulo funciona igual.
       * `duracionAcelerada` igual a `duracion` significa que la actividad no se
       * puede acortar.
       */
      duracionAcelerada: z.number().finite().nonnegative().nullable().default(null),
      costoNormal: z.number().finite().nonnegative().default(0),
      costoAcelerado: z.number().finite().nonnegative().default(0),
    }),
  ),
  unidadTiempo: z.string().min(1),
  /** Costo que corre por cada periodo que dure el proyecto, sea cual sea el avance. */
  costoIndirectoPorPeriodo: z.number().finite().nonnegative().default(0),
  moneda: esquemaMoneda.default('HNL'),
});

export const esquemaDatosPERT = z.object({
  tipo: z.literal('pert'),
  modo: z.enum(['red', 'solo_probabilidad']),
  actividades: z.array(
    z.object({
      id: z.string().min(1),
      descripcion: z.string(),
      predecesoras: z.array(z.string()),
      a: z.number().finite().nonnegative(),
      m: z.number().finite().nonnegative(),
      b: z.number().finite().nonnegative(),
    }),
  ),
  unidadTiempo: z.string().min(1),
  /** Para problemas dados directamente con media y desviación. */
  mediaDirecta: z.number().finite().nullable().default(null),
  desviacionDirecta: z.number().finite().nullable().default(null),
  plazoConsulta: z.number().finite().nullable().default(null),
  confianzaConsulta: z.number().min(0).max(1).nullable().default(null),
});

export const esquemaDatosAsignacion = z.object({
  tipo: z.literal('asignacion'),
  filas: z.array(z.string().min(1)),
  columnas: z.array(z.string().min(1)),
  matriz: z.array(z.array(z.number().finite().nullable())),
  objetivo: z.enum(['minimizar', 'maximizar']),
  unidad: z.string().min(1),
  nombreFilas: z.string().min(1),
  nombreColumnas: z.string().min(1),
});

export const esquemaDatosTransporte = z.object({
  tipo: z.literal('transporte'),
  origenes: z.array(z.string().min(1)),
  destinos: z.array(z.string().min(1)),
  costos: z.array(z.array(z.number().finite())),
  oferta: z.array(z.number().finite().nonnegative()),
  demanda: z.array(z.number().finite().nonnegative()),
  unidadCosto: z.string().min(1),
  unidadCantidad: z.string().min(1),
  metodoInicialSugerido: z.enum(['noroeste', 'costo_minimo', 'vogel']).default('vogel'),
});

export const esquemaDatosFundamentos = z.object({
  tipo: z.literal('fundamentos'),
  organizacion: z.string().min(1),
  naturaleza: z.enum(['manufactura', 'servicios', 'mixta']),
  /** Elementos que el estudiante debe clasificar arrastrándolos. */
  elementos: z.array(
    z.object({
      id: z.string().min(1),
      texto: z.string().min(1),
      categoria: z.enum(['entrada', 'proceso', 'salida', 'retroalimentacion', 'ambiente_externo']),
    }),
  ),
  estrategiaCompetencia: z.enum(['costo', 'calidad', 'flexibilidad', 'velocidad']).nullable().default(null),
  /**
   * Organizaciones para el perfil de operaciones: el simulador que sitúa cada
   * una en el continuo entre manufactura y servicios.
   *
   * Los ocho rasgos se escriben aquí literalmente en vez de importarlos de
   * `nucleo/`, porque `esquemas/` no puede depender del motor. La prueba de
   * `naturaleza` comprueba que las dos listas coincidan.
   */
  casosNaturaleza: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1),
        descripcion: z.string().min(1),
        perfilReferencia: z.object({
          tangibilidad: z.number().min(0).max(100),
          almacenabilidad: z.number().min(0).max(100),
          contacto: z.number().min(0).max(100),
          simultaneidad: z.number().min(0).max(100),
          uniformidad: z.number().min(0).max(100),
          medicion: z.number().min(0).max(100),
          ubicacion: z.number().min(0).max(100),
          intensidad: z.number().min(0).max(100),
        }),
        /** Por qué el docente sitúa así esta organización. */
        justificacion: z.string().min(1),
      }),
    )
    .default([]),
});

export const esquemaDatosGrafico = z.object({
  tipo: z.literal('grafico'),
  objetivo: z.enum(['minimizar', 'maximizar']),
  nombreX: z.string().min(1),
  nombreY: z.string().min(1),
  unidadVariables: z.string().min(1),
  coefX: z.number().finite(),
  coefY: z.number().finite(),
  nombreObjetivo: z.string().min(1),
  unidadObjetivo: z.string().min(1),
  restricciones: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1),
        a: z.number().finite(),
        b: z.number().finite(),
        relacion: z.enum(['<=', '>=', '=']),
        c: z.number().finite(),
        unidad: z.string().default(''),
      }),
    )
    .min(1),
  noNegatividad: z.boolean().default(true),
});

export const esquemaDatosSimplex = z.object({
  tipo: z.literal('simplex'),
  objetivo: z.enum(['minimizar', 'maximizar']),
  variables: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1),
        coeficiente: z.number().finite(),
      }),
    )
    .min(1),
  unidadVariables: z.string().min(1),
  nombreObjetivo: z.string().min(1),
  unidadObjetivo: z.string().min(1),
  restricciones: z
    .array(
      z.object({
        id: z.string().min(1),
        nombre: z.string().min(1),
        /** Un coeficiente por variable, en el mismo orden que `variables`. */
        coeficientes: z.array(z.number().finite()).min(1),
        relacion: z.enum(['<=', '>=', '=']),
        c: z.number().finite(),
        unidad: z.string().default(''),
      }),
    )
    .min(1),
});

/**
 * Inventarios. La notación es la de `Manejo de inventario.pptx`: D, Co, Ch, L,
 * R, DEO, CAI. `modelo` elige entre los tres casos de la presentación.
 */
export const esquemaDatosInventarios = z.object({
  tipo: z.literal('inventarios'),
  /**
   * `lote_economico` es el MLE con abastecimiento global; `reabastecimiento_uniforme`
   * es el caso en que el lote entra a una tasa de producción, no de golpe; y
   * `periodo_fijo` es el modelo de revisión periódica con intervalo T y nivel M.
   */
  modelo: z.enum(['lote_economico', 'reabastecimiento_uniforme', 'periodo_fijo']),
  moneda: esquemaMoneda,
  /** Demanda anual en unidades. */
  demandaAnual: z.number().finite().positive(),
  unidadProducto: z.string().min(1),
  /** Costo de ordenar, por orden. */
  costoOrdenar: z.number().finite().nonnegative(),
  /** Costo de conservación por unidad y por año. */
  costoConservar: z.number().finite().positive(),
  /** Costo de compra por unidad. Cero cuando el enunciado no lo da. */
  costoUnitario: z.number().finite().nonnegative().default(0),
  /** Tiempo de entrega, en días. */
  tiempoEntregaDias: z.number().finite().nonnegative().default(0),
  /**
   * Días hábiles del año con los que se convierten demanda y tiempo de entrega
   * a la misma escala. Ver inconsistencia I-16.
   */
  diasPorAnio: z.number().int().positive().default(360),
  /** Tasa de producción anual. Solo la usa el reabastecimiento uniforme. */
  tasaProduccionAnual: z.number().finite().positive().nullable().default(null),
});

/**
 * Líneas de espera. `s` servidores en paralelo, llegadas de Poisson y servicio
 * exponencial: los modelos M/M/1 y M/M/s.
 */
export const esquemaDatosColas = z.object({
  tipo: z.literal('colas'),
  /** Tasa media de llegadas, por unidad de tiempo. */
  tasaLlegadas: z.number().finite().positive(),
  /** Tasa media de servicio de **un** servidor, por unidad de tiempo. */
  tasaServicio: z.number().finite().positive(),
  servidores: z.number().int().positive().default(1),
  unidadTiempo: z.string().min(1),
  /** Cómo se llama lo que hace cola: clientes, camiones, lotes… */
  nombreClientes: z.string().min(1).default('clientes'),
  moneda: esquemaMoneda.default('HNL'),
  /** Costo de que un cliente espere una unidad de tiempo. Cero si no aplica. */
  costoEsperaPorHora: z.number().finite().nonnegative().default(0),
  /** Costo de operar un servidor por unidad de tiempo. Cero si no aplica. */
  costoServidorPorHora: z.number().finite().nonnegative().default(0),
});

export const esquemaDatosEjercicio = z.discriminatedUnion('tipo', [
  esquemaDatosProductividad,
  esquemaDatosLocalizacion,
  esquemaDatosDistribucion,
  esquemaDatosEquilibrio,
  esquemaDatosCPM,
  esquemaDatosPERT,
  esquemaDatosGrafico,
  esquemaDatosSimplex,
  esquemaDatosAsignacion,
  esquemaDatosTransporte,
  esquemaDatosFundamentos,
  esquemaDatosInventarios,
  esquemaDatosColas,
]);
export type DatosEjercicio = z.infer<typeof esquemaDatosEjercicio>;

// ───────────────────────────── Ejercicio ─────────────────────────────

export const esquemaPregunta = z.object({
  id: z.string().min(1),
  enunciado: z.string().min(1),
  tipo: z.enum(['numerica', 'seleccion', 'interpretacion', 'texto']),
  /** Respuesta correcta para preguntas numéricas o de selección. */
  respuesta: z.union([z.number(), z.string()]).nullable().default(null),
  unidad: z.string().nullable().default(null),
  /** Tolerancia absoluta o relativa admitida al calificar. */
  tolerancia: z.number().nonnegative().default(0.01),
  toleranciaRelativa: z.boolean().default(true),
  opciones: z.array(z.string()).default([]),
  /** Pistas graduadas: de la más sutil a la más explícita. */
  pistas: z.array(z.string()).default([]),
  /** Clave que conecta la pregunta con una regla del motor de retroalimentación. */
  claveVerificacion: z.string().nullable().default(null),
  puntos: z.number().nonnegative().default(1),
});
export type Pregunta = z.infer<typeof esquemaPregunta>;

export const esquemaEjercicio = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  tema: esquemaTema,
  metodo: z.string().min(1),
  contexto: esquemaContexto,
  dificultad: esquemaDificultad,
  /** Enunciado tal como lo lee el estudiante. */
  enunciado: z.string().min(1),
  datos: esquemaDatosEjercicio,
  preguntas: z.array(esquemaPregunta).default([]),
  moneda: esquemaMoneda.nullable().default(null),
  unidades: z.array(z.string()).default([]),
  tiempoEstimadoMinutos: z.number().int().positive().default(20),
  origen: esquemaOrigen,
  validacion: esquemaValidacion,
  fuenteId: z.string().nullable().default(null),
  /** Nombre con que el documento original identifica al problema. */
  atribucion: z.string().nullable().default(null),
  /** Identificadores de las inconsistencias de auditoría que le afectan. */
  inconsistencias: z.array(z.string()).default([]),
  notasDocente: z.string().default(''),
  /** Semilla si el ejercicio fue generado. */
  semilla: z.number().int().nullable().default(null),
  creadoEn: z.string().default(() => new Date().toISOString()),
  modificadoEn: z.string().default(() => new Date().toISOString()),
});
export type Ejercicio = z.infer<typeof esquemaEjercicio>;

// ───────────────────────────── Auditoría de datos ─────────────────────────────

export const esquemaOpcionAuditoria = z.object({
  id: z.string().min(1),
  descripcion: z.string().min(1),
  /** Efecto de elegir esta opción, en prosa. */
  efecto: z.string().min(1),
});

export const esquemaInconsistencia = z.object({
  id: z.string().min(1),
  ejercicioId: z.string().nullable(),
  titulo: z.string().min(1),
  descripcion: z.string().min(1),
  /** Archivo del que proviene. `null` cuando el hallazgo es una ausencia: algo que ningún material contiene. */
  archivoOrigen: z.string().nullable().default(null),
  gravedad: z.enum(['alta', 'media', 'baja']),
  opciones: z.array(esquemaOpcionAuditoria).min(2),
  /** Opción elegida por el docente. `null` mientras no decida. */
  decision: z.string().nullable().default(null),
  decididoEn: z.string().nullable().default(null),
});
export type Inconsistencia = z.infer<typeof esquemaInconsistencia>;

// ───────────────────────────── Personas, intentos y progreso ─────────────────────────────

export const esquemaPerfil = z.object({
  id: z.string().min(1),
  nombre: z.string().default(''),
  rol: z.enum(['estudiante', 'docente']),
  /** Identificador institucional opcional; nunca se envía a ningún servidor. */
  matricula: z.string().default(''),
  creadoEn: z.string().default(() => new Date().toISOString()),
});
export type Perfil = z.infer<typeof esquemaPerfil>;

// ───────────────────────────── Rúbricas ─────────────────────────────

/**
 * Un nivel de desempeño de la rúbrica. `porcentaje` es la fracción del puntaje
 * del criterio que otorga: 100, 80, 40 o 10 en la rúbrica del curso.
 */
export const esquemaNivelRubrica = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  porcentaje: z.number().min(0).max(100),
  /** Descriptor del nivel para este criterio. Vacío si la fuente no lo trae. */
  descripcion: z.string().default(''),
});
export type NivelRubrica = z.infer<typeof esquemaNivelRubrica>;

export const esquemaCriterioRubrica = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  /** Peso del criterio dentro de la rúbrica, en porcentaje. Los pesos suman 100. */
  peso: z.number().positive().max(100),
  niveles: z.array(esquemaNivelRubrica).min(2),
});
export type CriterioRubrica = z.infer<typeof esquemaCriterioRubrica>;

export const esquemaRubrica = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  descripcion: z.string().default(''),
  /**
   * `textual` significa que la rúbrica está en los materiales del curso;
   * `propuesta`, que la escribió la aplicación y el docente puede descartarla.
   * La distinción se muestra en pantalla: una rúbrica propuesta no puede
   * presentarse como si viniera del material.
   */
  origen: z.enum(['textual', 'propuesta']),
  fuenteId: z.string().nullable().default(null),
  atribucion: z.string().default(''),
  criterios: z.array(esquemaCriterioRubrica).min(1),
});
export type Rubrica = z.infer<typeof esquemaRubrica>;

/** Calificación docente de una respuesta de interpretación. */
export const esquemaRevision = z.object({
  /** Puntos otorgados, entre 0 y los puntos de la pregunta. */
  puntos: z.number().nonnegative(),
  rubricaId: z.string().nullable().default(null),
  /** Nivel elegido para cada criterio: `criterioId` → `nivelId`. */
  niveles: z.record(z.string(), z.string()).default({}),
  comentario: z.string().default(''),
  revisadoEn: z.string(),
  /** Nombre del docente que revisó, para que el reporte pueda citarlo. */
  revisadoPor: z.string().default(''),
});
export type Revision = z.infer<typeof esquemaRevision>;

export const esquemaRespuesta = z.object({
  preguntaId: z.string().min(1),
  valor: z.union([z.number(), z.string()]).nullable(),
  correcta: z.boolean().nullable(),
  puntosObtenidos: z.number().default(0),
  retroalimentacion: z.string().default(''),
  pistasUsadas: z.number().int().nonnegative().default(0),
  intentos: z.number().int().nonnegative().default(0),
  /** Calificación docente. Solo la llevan las preguntas de interpretación. */
  revision: esquemaRevision.nullable().default(null),
});
export type Respuesta = z.infer<typeof esquemaRespuesta>;

export const esquemaIntento = z.object({
  id: z.string().min(1),
  ejercicioId: z.string().min(1),
  perfilId: z.string().min(1),
  tema: esquemaTema,
  modo: z.enum(['practica', 'desafio', 'evaluacion']),
  iniciadoEn: z.string(),
  finalizadoEn: z.string().nullable().default(null),
  segundosEmpleados: z.number().nonnegative().default(0),
  respuestas: z.array(esquemaRespuesta).default([]),
  puntaje: z.number().nonnegative().default(0),
  puntajeMaximo: z.number().nonnegative().default(0),
  completado: z.boolean().default(false),
  /** Errores detectados por el motor de retroalimentación, por código. */
  erroresDetectados: z.array(z.string()).default([]),
});
export type Intento = z.infer<typeof esquemaIntento>;

export const esquemaProgresoTema = z.object({
  tema: esquemaTema,
  leccionesVistas: z.array(z.string()).default([]),
  ejerciciosResueltos: z.number().int().nonnegative().default(0),
  ejerciciosCorrectos: z.number().int().nonnegative().default(0),
  ultimaVisita: z.string().nullable().default(null),
  /** Dominio estimado de 0 a 100, calculado a partir de los intentos. */
  dominio: z.number().min(0).max(100).default(0),
});
export type ProgresoTema = z.infer<typeof esquemaProgresoTema>;

// ───────────────────────────── Evaluaciones ─────────────────────────────

export const esquemaEvaluacion = z.object({
  id: z.string().min(1),
  titulo: z.string().min(1),
  descripcion: z.string().default(''),
  ejercicioIds: z.array(z.string()).min(1),
  intentosPermitidos: z.number().int().positive().default(1),
  minutosLimite: z.number().int().positive().nullable().default(null),
  mostrarPistas: z.boolean().default(false),
  mostrarSolucion: z.boolean().default(false),
  toleranciaRedondeo: z.number().nonnegative().default(0.01),
  toleranciaRelativa: z.boolean().default(true),
  incluyeInterpretacion: z.boolean().default(true),
  creadaEn: z.string().default(() => new Date().toISOString()),
});
export type Evaluacion = z.infer<typeof esquemaEvaluacion>;

// ───────────────────────────── Configuración ─────────────────────────────

export const esquemaConfiguracion = z.object({
  modo: z.enum(['estudiante', 'docente', 'proyeccion', 'evaluacion']).default('estudiante'),
  tema: z.enum(['claro', 'oscuro', 'sistema']).default('sistema'),
  decimales: z.number().int().min(0).max(6).default(2),
  toleranciaRedondeo: z.number().nonnegative().default(0.01),
  toleranciaRelativa: z.boolean().default(true),
  monedaPredeterminada: esquemaMoneda.default('HNL'),
  mostrarPistas: z.boolean().default(true),
  mostrarSoluciones: z.boolean().default(true),
  mostrarAtribuciones: z.boolean().default(false),
  animacionesReducidas: z.boolean().default(false),
  /** Arquitectura opcional para un asistente de IA. Apagada por defecto. */
  asistenteIA: z
    .object({
      habilitado: z.boolean().default(false),
      proveedor: z.string().default(''),
      modelo: z.string().default(''),
      urlBase: z.string().default(''),
    })
    .default({ habilitado: false, proveedor: '', modelo: '', urlBase: '' }),
  curso: z
    .object({
      nombre: z.string().default('Investigación de Operaciones'),
      codigo: z.string().default(''),
      periodo: z.string().default(''),
      anio: z.number().int().default(2026),
      docente: z.string().default('Gustavo Alonso Ardón'),
      institucion: z.string().default('Universidad Nacional de Agricultura'),
    })
    .default({
      nombre: 'Investigación de Operaciones',
      codigo: '',
      periodo: '',
      anio: 2026,
      docente: 'Gustavo Alonso Ardón',
      institucion: 'Universidad Nacional de Agricultura',
    }),
});
export type Configuracion = z.infer<typeof esquemaConfiguracion>;

// ───────────────────────────── Respaldo ─────────────────────────────

export const esquemaRespaldo = z.object({
  aplicacion: z.literal('OPTIAULA IO'),
  version: z.string(),
  exportadoEn: z.string(),
  configuracion: esquemaConfiguracion,
  perfiles: z.array(esquemaPerfil).default([]),
  ejercicios: z.array(esquemaEjercicio).default([]),
  intentos: z.array(esquemaIntento).default([]),
  evaluaciones: z.array(esquemaEvaluacion).default([]),
  progreso: z.array(esquemaProgresoTema).default([]),
  inconsistencias: z.array(esquemaInconsistencia).default([]),
  favoritos: z.array(z.string()).default([]),
});
export type Respaldo = z.infer<typeof esquemaRespaldo>;

// ───────────────────────────── Ayudas de validación ─────────────────────────────

export interface ResultadoValidacion<T> {
  readonly ok: boolean;
  readonly datos: T | null;
  readonly errores: readonly string[];
}

/** Valida y traduce los errores de Zod a mensajes en español legibles. */
export function validar<T>(esquema: z.ZodType<T>, valor: unknown): ResultadoValidacion<T> {
  const r = esquema.safeParse(valor);
  if (r.success) return { ok: true, datos: r.data, errores: [] };

  const errores = r.error.issues.map((i) => {
    const ruta = i.path.length > 0 ? i.path.join(' → ') : 'raíz';
    return `${ruta}: ${traducirError(i)}`;
  });
  return { ok: false, datos: null, errores };
}

function traducirError(issue: z.core.$ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return `se esperaba ${issue.expected} y llegó otro tipo de dato`;
    case 'too_small':
      return `el valor es demasiado pequeño (mínimo ${issue.minimum})`;
    case 'too_big':
      return `el valor es demasiado grande (máximo ${issue.maximum})`;
    case 'invalid_value':
      return 'el valor no está entre las opciones admitidas';
    case 'unrecognized_keys':
      return 'contiene campos que no pertenecen a este formato';
    default:
      return issue.message;
  }
}
