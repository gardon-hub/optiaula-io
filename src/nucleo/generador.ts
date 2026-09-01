/**
 * Generador reproducible de ejercicios.
 *
 * La misma semilla produce siempre el mismo ejercicio. Antes de publicar
 * cualquier ejercicio, el generador lo resuelve con el propio motor y verifica
 * que tenga solución válida, datos coherentes y dificultad acorde al nivel
 * pedido. Si no pasa la verificación, se descarta y se reintenta con la
 * siguiente semilla derivada.
 */

import type { Contexto, Dificultad, Ejercicio, Moneda, Tema } from '@/esquemas';
import { enteroEntre, formatearNumero, generadorSemilla, sumaExacta } from './numero';
import { resolverCPM, type Actividad } from './cpm';
import { resolverPERT, type ActividadPERT } from './pert';
import { resolverAsignacion } from './asignacion';
import { resolverTransporte } from './transporte';
import { resolverProductividad } from './productividad';
import { resolverEquilibrio } from './equilibrio';
import { resolverGrafico } from './grafico';
import { resolverSimplex } from './simplex';
import { preguntasDe } from './preguntas';
import { aNumero, esPositivo } from './racional';

export interface OpcionesGenerador {
  readonly tema: Tema;
  readonly dificultad: Dificultad;
  readonly semilla: number;
  readonly contexto: Contexto;
  readonly moneda: Moneda;
  /** Filas / actividades / orígenes, según el tema. */
  readonly tamanoFilas: number;
  /** Columnas / destinos, según el tema. */
  readonly tamanoColumnas: number;
  readonly objetivo: 'minimizar' | 'maximizar';
  /** Orden de magnitud de los números generados. */
  readonly magnitud: 'pequena' | 'media' | 'grande';
  readonly balanceado: boolean;
  readonly rutasCriticasMultiples: boolean;
  readonly incluirProhibiciones: boolean;
}

export const OPCIONES_POR_DEFECTO: OpcionesGenerador = {
  tema: 'asignacion',
  dificultad: 'intermedio',
  semilla: 2026,
  contexto: 'avicultura_huevo',
  moneda: 'HNL',
  tamanoFilas: 4,
  tamanoColumnas: 4,
  objetivo: 'minimizar',
  magnitud: 'media',
  balanceado: true,
  rutasCriticasMultiples: false,
  incluirProhibiciones: false,
};

export interface ResultadoGeneracion {
  readonly ejercicio: Ejercicio | null;
  readonly verificaciones: readonly Verificacion[];
  readonly intentos: number;
  readonly semillaUsada: number;
}

export interface Verificacion {
  readonly nombre: string;
  readonly paso: boolean;
  readonly detalle: string;
}

const RANGOS: Record<OpcionesGenerador['magnitud'], { min: number; max: number }> = {
  pequena: { min: 5, max: 40 },
  media: { min: 40, max: 400 },
  grande: { min: 400, max: 4000 },
};

/** Vocabulario por contexto productivo, para que los enunciados suenen reales. */
interface Vocabulario {
  readonly organizacion: string;
  readonly filas: readonly string[];
  readonly columnas: readonly string[];
  readonly nombreFilas: string;
  readonly nombreColumnas: string;
  readonly producto: string;
  readonly unidadProducto: string;
}

const VOCABULARIO: Partial<Record<Contexto, Vocabulario>> = {
  avicultura_huevo: {
    organizacion: 'una granja de postura',
    filas: ['Galera 1', 'Galera 2', 'Galera 3', 'Galera 4', 'Galera 5', 'Galera 6'],
    columnas: ['Mercado central', 'Supermercado', 'Pulpería', 'Panadería', 'Hotel', 'Restaurante'],
    nombreFilas: 'galeras',
    nombreColumnas: 'compradores',
    producto: 'cartones de huevo',
    unidadProducto: 'cartón',
  },
  avicultura_engorde: {
    organizacion: 'una engorda de pollos',
    filas: ['Galpón A', 'Galpón B', 'Galpón C', 'Galpón D', 'Galpón E', 'Galpón F'],
    columnas: ['Mercado municipal', 'Cadena de asaderos', 'Distribuidor', 'Supermercado', 'Hotel', 'Comedor escolar'],
    nombreFilas: 'galpones',
    nombreColumnas: 'destinos',
    producto: 'kilogramos de pollo',
    unidadProducto: 'kg',
  },
  cafe: {
    organizacion: 'un beneficio de café',
    filas: ['Finca alta', 'Finca media', 'Finca baja', 'Finca del norte', 'Finca del sur', 'Finca del este'],
    columnas: ['Puerto Cortés', 'Exportadora', 'Tostaduría local', 'Cooperativa', 'Mercado justo', 'Feria regional'],
    nombreFilas: 'fincas',
    nombreColumnas: 'destinos',
    producto: 'quintales de café',
    unidadProducto: 'quintal',
  },
  lacteos: {
    organizacion: 'una planta de lácteos',
    filas: ['Acopio norte', 'Acopio sur', 'Acopio central', 'Acopio oeste', 'Acopio este', 'Acopio alto'],
    columnas: ['Planta A', 'Planta B', 'Mercado local', 'Supermercado', 'Escuela', 'Hospital'],
    nombreFilas: 'centros de acopio',
    nombreColumnas: 'destinos',
    producto: 'litros de leche',
    unidadProducto: 'litro',
  },
  ganaderia: {
    organizacion: 'una empresa ganadera',
    filas: ['Hato 1', 'Hato 2', 'Hato 3', 'Hato 4', 'Hato 5', 'Hato 6'],
    columnas: ['Rastro municipal', 'Frigorífico', 'Subasta', 'Exportación', 'Mercado local', 'Carnicería'],
    nombreFilas: 'hatos',
    nombreColumnas: 'destinos',
    producto: 'cabezas de ganado',
    unidadProducto: 'cabeza',
  },
  hortalizas: {
    organizacion: 'una empacadora de hortalizas',
    filas: ['Parcela 1', 'Parcela 2', 'Parcela 3', 'Parcela 4', 'Parcela 5', 'Parcela 6'],
    columnas: ['Mercado zonal', 'Supermercado', 'Restaurante', 'Feria', 'Distribuidor', 'Exportadora'],
    nombreFilas: 'parcelas',
    nombreColumnas: 'destinos',
    producto: 'cajas de hortalizas',
    unidadProducto: 'caja',
  },
  maiz: {
    organizacion: 'una cooperativa de granos básicos',
    filas: ['Bodega 1', 'Bodega 2', 'Bodega 3', 'Bodega 4', 'Bodega 5', 'Bodega 6'],
    columnas: ['Molino A', 'Molino B', 'Molino C', 'Silo regional', 'Planta de concentrado', 'Mercado'],
    nombreFilas: 'bodegas',
    nombreColumnas: 'molinos',
    producto: 'quintales de maíz',
    unidadProducto: 'quintal',
  },
  tilapia: {
    organizacion: 'una finca acuícola',
    filas: ['Estanque 1', 'Estanque 2', 'Estanque 3', 'Estanque 4', 'Estanque 5', 'Estanque 6'],
    columnas: ['Mercado local', 'Restaurante', 'Supermercado', 'Distribuidor', 'Exportación', 'Feria'],
    nombreFilas: 'estanques',
    nombreColumnas: 'destinos',
    producto: 'kilogramos de tilapia',
    unidadProducto: 'kg',
  },
  porcicultura: {
    organizacion: 'una granja porcina',
    filas: ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4', 'Módulo 5', 'Módulo 6'],
    columnas: ['Rastro', 'Embutidora', 'Mercado', 'Carnicería', 'Distribuidor', 'Hotel'],
    nombreFilas: 'módulos',
    nombreColumnas: 'destinos',
    producto: 'kilogramos de cerdo',
    unidadProducto: 'kg',
  },
  cooperativa: {
    organizacion: 'una cooperativa agropecuaria',
    filas: ['Socio norte', 'Socio sur', 'Socio central', 'Socio oeste', 'Socio este', 'Socio alto'],
    columnas: ['Centro A', 'Centro B', 'Centro C', 'Centro D', 'Centro E', 'Centro F'],
    nombreFilas: 'socios',
    nombreColumnas: 'centros',
    producto: 'unidades',
    unidadProducto: 'unidad',
  },
};

const VOCABULARIO_GENERICO: Vocabulario = {
  organizacion: 'una empresa agropecuaria',
  filas: ['Recurso 1', 'Recurso 2', 'Recurso 3', 'Recurso 4', 'Recurso 5', 'Recurso 6'],
  columnas: ['Destino 1', 'Destino 2', 'Destino 3', 'Destino 4', 'Destino 5', 'Destino 6'],
  nombreFilas: 'recursos',
  nombreColumnas: 'destinos',
  producto: 'unidades',
  unidadProducto: 'unidad',
};

function vocabulario(contexto: Contexto): Vocabulario {
  return VOCABULARIO[contexto] ?? VOCABULARIO_GENERICO;
}

// ───────────────────────────── Generación por tema ─────────────────────────────

function generarAsignacion(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const { min, max } = RANGOS[op.magnitud];
  const filas = v.filas.slice(0, op.tamanoFilas);
  const columnas = v.columnas.slice(0, op.tamanoColumnas);

  const matriz: (number | null)[][] = filas.map(() =>
    columnas.map(() => enteroEntre(azar, min, max)),
  );

  if (op.incluirProhibiciones) {
    // Una prohibición por fila, como máximo, y nunca dejando una fila sin opciones.
    const cuantas = Math.max(1, Math.floor(filas.length / 3));
    for (let k = 0; k < cuantas; k++) {
      const i = enteroEntre(azar, 0, filas.length - 1);
      const j = enteroEntre(azar, 0, columnas.length - 1);
      if (matriz[i]!.filter((x) => x !== null).length > 1) matriz[i]![j] = null;
    }
  }

  const unidad = op.moneda === 'USD' ? 'US$' : 'L';
  const verbo = op.objetivo === 'minimizar' ? 'minimice el costo' : 'maximice el rendimiento';

  return {
    id: `gen-asig-${op.semilla}`,
    titulo: `Asignación en ${v.organizacion} (generado)`,
    tema: 'asignacion',
    metodo: 'Método húngaro',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `En ${v.organizacion} hay que asignar ${filas.length} ${v.nombreFilas} a ${columnas.length} ${v.nombreColumnas}. ` +
      `La tabla muestra ${op.objetivo === 'minimizar' ? `el costo en ${unidad}` : 'el rendimiento en puntos'} de cada combinación.` +
      (op.incluirProhibiciones ? ' Las celdas marcadas como no disponibles corresponden a asignaciones prohibidas.' : '') +
      `\n\n**Determine la asignación que ${verbo}.**`,
    datos: {
      tipo: 'asignacion',
      filas,
      columnas,
      matriz,
      objetivo: op.objetivo,
      unidad: op.objetivo === 'minimizar' ? unidad : 'puntos',
      nombreFilas: v.nombreFilas,
      nombreColumnas: v.nombreColumnas,
    },
    preguntas: [],
    moneda: op.objetivo === 'minimizar' ? op.moneda : null,
    unidades: [op.objetivo === 'minimizar' ? unidad : 'puntos'],
    tiempoEstimadoMinutos: filas.length >= 5 ? 35 : 25,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

function generarTransporte(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const { min, max } = RANGOS[op.magnitud];
  const origenes = v.filas.slice(0, op.tamanoFilas);
  const destinos = v.columnas.slice(0, op.tamanoColumnas);

  const costos = origenes.map(() => destinos.map(() => enteroEntre(azar, Math.max(2, Math.round(min / 4)), Math.round(max / 4))));

  // Se generan las demandas y luego la oferta que las cubre, para controlar el balance.
  const demanda = destinos.map(() => enteroEntre(azar, 10, 10 + Math.round(max / 2)) * 10);
  const totalDemanda = sumaExacta(demanda);

  const oferta: number[] = [];
  let restante = totalDemanda;
  for (let i = 0; i < origenes.length - 1; i++) {
    const maximo = Math.max(10, Math.floor(restante / (origenes.length - i)) * 2);
    const q = Math.min(restante - 10 * (origenes.length - i - 1), enteroEntre(azar, 10, maximo));
    oferta.push(q);
    restante -= q;
  }
  oferta.push(restante);

  if (!op.balanceado) {
    // Desbalance de entre 8 % y 25 % del total, hacia oferta o hacia demanda.
    const magnitudDesbalance = Math.max(10, Math.round(totalDemanda * (0.08 + azar() * 0.17)));
    if (azar() < 0.5) oferta[0] = (oferta[0] ?? 0) + magnitudDesbalance;
    else demanda[0] = (demanda[0] ?? 0) + magnitudDesbalance;
  }

  const unidadCosto = op.moneda === 'USD' ? 'US$' : 'L';

  return {
    id: `gen-trans-${op.semilla}`,
    titulo: `Distribución desde ${v.organizacion} (generado)`,
    tema: 'transporte',
    metodo: 'Esquina noroeste, costo mínimo, Vogel y MODI',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `${v.organizacion.charAt(0).toUpperCase()}${v.organizacion.slice(1)} debe distribuir ${v.producto} desde ` +
      `${origenes.length} ${v.nombreFilas} hacia ${destinos.length} ${v.nombreColumnas}. La tabla muestra el costo ` +
      `unitario de transporte en ${unidadCosto} por ${v.unidadProducto}, junto con la oferta de cada origen y la ` +
      `demanda de cada destino.\n\n` +
      (op.balanceado
        ? '**Determine el plan de envíos de costo mínimo.**'
        : '**Verifique primero el balance del problema y luego determine el plan de envíos de costo mínimo.**'),
    datos: {
      tipo: 'transporte',
      origenes,
      destinos,
      costos,
      oferta,
      demanda,
      unidadCosto,
      unidadCantidad: v.unidadProducto,
      metodoInicialSugerido: 'vogel',
    },
    preguntas: [],
    moneda: op.moneda,
    unidades: [v.unidadProducto, unidadCosto],
    tiempoEstimadoMinutos: origenes.length * destinos.length >= 12 ? 45 : 30,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

const TAREAS_PROYECTO: readonly string[] = [
  'Estudio de factibilidad',
  'Diseño técnico',
  'Trámite de permisos',
  'Preparación del terreno',
  'Compra de materiales',
  'Construcción de la obra civil',
  'Instalación de equipos',
  'Conexión de servicios',
  'Contratación de personal',
  'Capacitación',
  'Pruebas de operación',
  'Inspección sanitaria',
  'Puesta en marcha',
  'Evaluación inicial',
];

function generarCPM(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const n = Math.max(5, Math.min(14, op.tamanoFilas));
  const letras = 'ABCDEFGHIJKLMN'.slice(0, n).split('');

  const actividades: Actividad[] = letras.map((id, i) => {
    // Predecesoras solo entre actividades anteriores: garantiza red acíclica.
    const posibles = letras.slice(Math.max(0, i - 3), i);
    const cuantas = i === 0 ? 0 : Math.min(posibles.length, enteroEntre(azar, 1, i >= 2 ? 2 : 1));
    const elegidas: string[] = [];
    const banco = [...posibles];
    for (let k = 0; k < cuantas && banco.length > 0; k++) {
      elegidas.push(...banco.splice(enteroEntre(azar, 0, banco.length - 1), 1));
    }
    return {
      id,
      descripcion: TAREAS_PROYECTO[i] ?? `Actividad ${id}`,
      predecesoras: elegidas,
      duracion: enteroEntre(azar, 1, op.dificultad === 'basico' ? 6 : 12),
    };
  });

  if (op.rutasCriticasMultiples && actividades.length >= 4) {
    // Se fuerzan dos ramas gemelas que convergen: producen rutas críticas empatadas.
    const a = actividades[1]!;
    const b = actividades[2]!;
    actividades[1] = { ...a, predecesoras: [letras[0]!], duracion: 5 };
    actividades[2] = { ...b, predecesoras: [letras[0]!], duracion: 5 };
    const c = actividades[3]!;
    actividades[3] = { ...c, predecesoras: [letras[1]!, letras[2]!] };
  }

  const unidadTiempo = op.dificultad === 'basico' ? 'días' : 'semanas';

  return {
    id: `gen-cpm-${op.semilla}`,
    titulo: `Proyecto en ${v.organizacion} (generado)`,
    tema: 'cpm',
    metodo: 'Diagrama de red y ruta crítica (CPM)',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `${v.organizacion.charAt(0).toUpperCase()}${v.organizacion.slice(1)} ejecutará un proyecto de ${n} actividades. ` +
      `La tabla lista cada actividad, sus predecesoras y su duración en ${unidadTiempo}.\n\n` +
      '**Construya el diagrama de red, calcule los tiempos tempranos y tardíos, las holguras y la ruta crítica.**',
    datos: {
      tipo: 'cpm',
      actividades: actividades.map((a) => ({
        ...a,
        predecesoras: [...a.predecesoras],
        duracionAcelerada: null,
        costoNormal: 0,
        costoAcelerado: 0,
      })),
      unidadTiempo,
      costoIndirectoPorPeriodo: 0,
      moneda: op.moneda,
    },
    preguntas: [],
    moneda: null,
    unidades: [unidadTiempo],
    tiempoEstimadoMinutos: 35,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

function generarPERT(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const base = generarCPM(op, azar);
  if (base.datos.tipo !== 'cpm') throw new Error('base inesperada');

  const actividades: ActividadPERT[] = base.datos.actividades.map((a) => {
    const m = Math.max(1, a.duracion);
    const holguraOptimista = enteroEntre(azar, 1, Math.max(1, Math.round(m / 2)));
    const holguraPesimista = enteroEntre(azar, 1, Math.max(2, m));
    return {
      id: a.id,
      descripcion: a.descripcion,
      predecesoras: a.predecesoras,
      a: Math.max(0.5, m - holguraOptimista),
      m,
      b: m + holguraPesimista,
    };
  });

  // El plazo de consulta se deduce del propio modelo: una desviación por encima
  // de la media deja la probabilidad cerca del 84 %, que es un valor con el que
  // se puede razonar. Un plazo inventado a ciegas daría 0 % o 100 %, y entonces
  // la pregunta no enseñaría nada.
  const resuelto = resolverPERT({
    titulo: base.titulo,
    actividades,
    unidadTiempo: base.datos.unidadTiempo,
  }).datos;

  const plazoConsulta =
    resuelto === null ? null : Math.round(resuelto.duracionEsperada + resuelto.desviacionProyecto);

  return {
    ...base,
    id: `gen-pert-${op.semilla}`,
    titulo: base.titulo.replace('(generado)', 'con tres estimaciones (generado)'),
    tema: 'pert',
    metodo: 'PERT con tres estimaciones y aproximación normal',
    enunciado:
      base.enunciado.replace(
        '**Construya el diagrama de red, calcule los tiempos tempranos y tardíos, las holguras y la ruta crítica.**',
        '**Calcule el tiempo esperado y la varianza de cada actividad, determine la ruta crítica probabilística y ' +
          `calcule la probabilidad de terminar en ${formatearNumero(plazoConsulta ?? 0, { decimales: 0 })} ${base.datos.unidadTiempo} o menos.**`,
      ) + ' Para cada actividad se estimaron un tiempo optimista, uno más probable y uno pesimista.',
    datos: {
      tipo: 'pert',
      modo: 'red',
      actividades: actividades.map((a) => ({ ...a, predecesoras: [...a.predecesoras] })),
      unidadTiempo: base.datos.unidadTiempo,
      mediaDirecta: null,
      desviacionDirecta: null,
      plazoConsulta,
      confianzaConsulta: 0.95,
    },
    semilla: op.semilla,
  };
}

function generarProductividad(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const horas = enteroEntre(azar, 40, 250);
  const tarifa = enteroEntre(azar, 70, 110);
  const kwh = enteroEntre(azar, 80, 600);
  const materiales = enteroEntre(azar, 20, 200) * 100;
  const fijos = enteroEntre(azar, 10, 80) * 500;
  const terminada = enteroEntre(azar, 50, 500) * 10;
  const enProceso = Math.round(terminada * (0.05 + azar() * 0.2));
  const precio = enteroEntre(azar, 15, 130);

  return {
    id: `gen-prod-${op.semilla}`,
    titulo: `Productividad de ${v.organizacion} (generado)`,
    tema: 'productividad',
    metodo: 'Productividad parcial, multifactorial y total',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `Durante un periodo, ${v.organizacion} empleó ${formatearNumero(horas, { decimales: 0 })} horas de mano de obra ` +
      `(L ${tarifa} por hora), ${formatearNumero(kwh, { decimales: 0 })} kWh de energía (L 6 por kWh), materiales por ` +
      `L ${formatearNumero(materiales, { decimales: 0 })} y costos fijos de L ${formatearNumero(fijos, { decimales: 0 })}. ` +
      `Se obtuvieron ${formatearNumero(terminada, { decimales: 0 })} ${v.unidadProducto}(s) terminados y quedaron ` +
      `${formatearNumero(enProceso, { decimales: 0 })} en proceso. El precio de venta es de L ${precio} por ${v.unidadProducto}.\n\n` +
      '**Calcule la productividad parcial de cada insumo y la productividad total. Identifique el insumo limitante.**',
    datos: {
      tipo: 'productividad',
      moneda: 'HNL',
      insumos: [
        { id: 'mo', nombre: 'Mano de obra', categoria: 'mano_obra', cantidad: horas, unidad: 'hora', costoUnitario: tarifa },
        { id: 'en', nombre: 'Energía eléctrica', categoria: 'energia', cantidad: kwh, unidad: 'kWh', costoUnitario: 6 },
        { id: 'mt', nombre: 'Materiales', categoria: 'materiales', cantidad: materiales, unidad: 'L', costoUnitario: 1 },
        { id: 'fj', nombre: 'Costos fijos', categoria: 'costos_fijos', cantidad: fijos, unidad: 'L', costoUnitario: 1 },
      ],
      produccionTerminada: terminada,
      unidadProduccion: v.unidadProducto,
      inventarioEnProceso: enProceso,
      gradoAvance: 0.5,
      tratamiento: 'excluir',
      precioVenta: precio,
      costoTotalDeclarado: null,
    },
    preguntas: [],
    moneda: 'HNL',
    unidades: [v.unidadProducto, 'hora', 'kWh', 'L'],
    tiempoEstimadoMinutos: 25,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

function generarEquilibrio(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const precio = enteroEntre(azar, 20, 200);
  const costoVariable = Math.round(precio * (0.4 + azar() * 0.35) * 100) / 100;
  const fijos = enteroEntre(azar, 10, 200) * 1000;
  const comision = op.dificultad === 'basico' ? 0 : enteroEntre(azar, 0, 12);
  const recuperacion = op.dificultad === 'avanzado' ? enteroEntre(azar, 0, 20) * 500 : 0;
  const margen = precio - costoVariable - (comision / 100) * precio;
  const equilibrio = margen > 0 ? (fijos - recuperacion) / margen : 0;
  const capacidad = Math.max(10, Math.ceil((equilibrio * (1.3 + azar() * 1.2)) / 10) * 10);
  const volumen = Math.round(capacidad * (0.5 + azar() * 0.45));
  const simbolo = op.moneda === 'USD' ? 'US$' : 'L';

  return {
    id: `gen-equi-${op.semilla}`,
    titulo: `Punto de equilibrio de ${v.organizacion} (generado)`,
    tema: 'equilibrio',
    metodo: 'Punto de equilibrio de un producto',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `${v.organizacion.charAt(0).toUpperCase()}${v.organizacion.slice(1)} vende ${v.producto} a ${simbolo} ${precio} ` +
      `por ${v.unidadProducto}, con un costo variable de ${simbolo} ${formatearNumero(costoVariable)} por ${v.unidadProducto}. ` +
      `Sus costos fijos del periodo son ${simbolo} ${formatearNumero(fijos, { decimales: 0 })}.` +
      (comision > 0 ? ` Los vendedores cobran una comisión del ${comision} % sobre el ingreso.` : '') +
      (recuperacion > 0 ? ` La empresa recupera ${simbolo} ${formatearNumero(recuperacion, { decimales: 0 })} por venta de subproductos.` : '') +
      ` La capacidad es de ${formatearNumero(capacidad, { decimales: 0 })} ${v.unidadProducto}(s) y espera vender ` +
      `${formatearNumero(volumen, { decimales: 0 })}.\n\n` +
      '**Calcule el punto de equilibrio en unidades y en dinero, el porcentaje de capacidad y la utilidad esperada.**',
    datos: {
      tipo: 'equilibrio',
      modo: 'simple',
      baseMezcla: 'unidades',
      moneda: op.moneda,
      costosFijos: fijos,
      costoVariableUnitario: costoVariable,
      precioVenta: precio,
      comisionPorcentaje: comision,
      valorRecuperacion: recuperacion,
      capacidad,
      volumenEsperado: volumen,
      utilidadObjetivo: op.dificultad === 'basico' ? null : Math.round(fijos * 0.25),
      unidadProducto: v.unidadProducto,
      productos: [],
    },
    preguntas: [],
    moneda: op.moneda,
    unidades: [v.unidadProducto, simbolo],
    tiempoEstimadoMinutos: 25,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

function generarGrafico(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const simbolo = op.moneda === 'USD' ? 'US$' : 'L';

  // Dos actividades que compiten por los mismos recursos limitados.
  const nombreX = v.filas[0] ?? 'Producto A';
  const nombreY = v.filas[1] ?? 'Producto B';

  const margenX = enteroEntre(azar, 3, 12) * 100;
  const margenY = enteroEntre(azar, 3, 12) * 100;

  // Se generan consumos distintos por recurso para que el óptimo caiga en un
  // vértice interior y no en un eje.
  const recursos = [
    { id: 'r1', nombre: 'Tierra disponible', unidad: 'manzanas', a: 1, b: 1 },
    { id: 'r2', nombre: 'Mano de obra', unidad: 'jornales', a: enteroEntre(azar, 8, 20), b: enteroEntre(azar, 8, 20) },
    { id: 'r3', nombre: 'Capital de trabajo', unidad: 'lempiras', a: enteroEntre(azar, 6, 18) * 100, b: enteroEntre(azar, 6, 18) * 100 },
  ].slice(0, op.dificultad === 'basico' ? 2 : 3);

  // Se elige primero el plan que será óptimo y luego se ajusta cada recurso
  // para que se agote justo ahí. Así todas las restricciones tocan la región
  // factible: ninguna nace redundante.
  const area = enteroEntre(azar, 10, 40);
  const px = Math.max(1, Math.round(area * (0.3 + azar() * 0.3)));
  const py = Math.max(1, area - px);

  const restricciones = recursos.map((r, i) => ({
    id: r.id,
    nombre: r.nombre,
    a: r.a,
    b: r.b,
    relacion: '<=' as const,
    // La primera pasa exactamente por el plan elegido; las demás se aflojan un
    // poco para que la región tenga varios vértices en lugar de uno solo.
    c: Math.round((r.a * px + r.b * py) * (i === 0 ? 1 : 1 + azar() * 0.18)),
    unidad: r.unidad,
  }));

  if (op.dificultad === 'avanzado') {
    // Un tope de superficie que corta entre el plan elegido y el eje: obliga a
    // considerar un vértice adicional sin volver redundante a nadie.
    restricciones.push({
      id: 'tope',
      nombre: `Superficie máxima de ${nombreX}`,
      a: 1,
      b: 0,
      relacion: '<=' as const,
      c: Math.max(1, Math.round(px * (1.05 + azar() * 0.25))),
      unidad: 'manzanas',
    });
  }

  // Poda de seguridad: si algún recurso quedó igualmente redundante, se elimina
  // antes de publicar. Un ejercicio no debe traer restricciones decorativas.
  const conRedundantes = resolverGrafico({
    titulo: 'poda',
    objetivo: 'maximizar',
    nombreX,
    nombreY,
    unidadVariables: 'unidades',
    coefX: margenX,
    coefY: margenY,
    nombreObjetivo: 'el margen',
    unidadObjetivo: simbolo,
    restricciones,
    noNegatividad: true,
  });

  const utiles =
    conRedundantes.datos === null
      ? restricciones
      : restricciones.filter((r) => conRedundantes.datos!.vertices.some((v) => v.activas.includes(r.id)));

  const finales = utiles.length >= 2 ? utiles : restricciones;

  const descripcion = finales
    .map(
      (r) =>
        `${r.nombre.toLowerCase()}: cada unidad de ${nombreX} consume ${formatearNumero(r.a, { decimales: 0 })} y cada unidad de ` +
        `${nombreY} consume ${formatearNumero(r.b, { decimales: 0 })}, con ${formatearNumero(r.c, { decimales: 0 })} ${r.unidad} disponibles`,
    )
    .join('; ');

  return {
    id: `gen-graf-${op.semilla}`,
    titulo: `Mezcla de producción en ${v.organizacion} (generado)`,
    tema: 'grafico',
    metodo: 'Método gráfico de programación lineal',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `${v.organizacion.charAt(0).toUpperCase()}${v.organizacion.slice(1)} debe decidir cuánto destinar a ${nombreX} y cuánto a ` +
      `${nombreY}. Los recursos disponibles son: ${descripcion}. ` +
      `El margen de contribución es de ${simbolo} ${formatearNumero(margenX, { decimales: 0 })} por unidad de ${nombreX} y ` +
      `${simbolo} ${formatearNumero(margenY, { decimales: 0 })} por unidad de ${nombreY}.\n\n` +
      '**Formule el modelo, grafique la región factible y determine la combinación que maximiza el margen total. ' +
      'Indique qué recursos quedan agotados.**',
    datos: {
      tipo: 'grafico',
      objetivo: 'maximizar',
      nombreX,
      nombreY,
      unidadVariables: 'unidades',
      coefX: margenX,
      coefY: margenY,
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: simbolo,
      restricciones: finales,
      noNegatividad: true,
    },
    preguntas: [],
    moneda: op.moneda,
    unidades: ['unidades', simbolo],
    tiempoEstimadoMinutos: finales.length >= 3 ? 35 : 25,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente: '',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

/**
 * Generador de modelos para el simplex.
 *
 * Se construye al revés: primero se elige el plan que va a resultar óptimo y
 * los precios sombra que va a tener, y después se deducen los lados derechos y
 * los coeficientes de la función objetivo que hacen cierto ese resultado.
 *
 * Con `b = A x*` toda restricción se agota exactamente en el plan elegido, y
 * con `c = Aᵀ y` para `y > 0` ese plan cumple las condiciones de optimalidad
 * con duales estrictamente positivos. El resultado es un modelo con solución
 * única, sin degeneración y sin restricciones redundantes —los tres defectos
 * que arruinan un ejercicio de tableau— y con la respuesta conocida de
 * antemano, que es lo que permite verificarlo antes de publicarlo.
 */
function generarSimplex(op: OpcionesGenerador, azar: () => number): Ejercicio {
  const v = vocabulario(op.contexto);
  const simbolo = op.moneda === 'USD' ? 'US$' : 'L';

  const n = op.dificultad === 'avanzado' ? 4 : 3;

  const nombres = Array.from({ length: n }, (_, j) => v.filas[j] ?? `producto ${j + 1}`);
  const recursos = [
    { id: 'materia', nombre: 'Materia prima', unidad: 'unidades' },
    { id: 'mano_obra', nombre: 'Mano de obra', unidad: 'jornales' },
    { id: 'maquinaria', nombre: 'Horas de maquinaria', unidad: 'horas' },
    { id: 'almacen', nombre: 'Espacio de almacén', unidad: 'espacios' },
  ].slice(0, n);

  // Consumo de cada recurso por unidad de cada producto.
  const A = recursos.map(() => Array.from({ length: n }, () => enteroEntre(azar, 1, 9)));

  // El plan que será óptimo, y los precios sombra que tendrá cada recurso.
  const plan = Array.from({ length: n }, () => enteroEntre(azar, 5, 30));
  const duales = recursos.map(() => enteroEntre(azar, 2, 12));

  // b = A x*: cada recurso se agota justo en el plan elegido.
  const disponible = A.map((fila) => sumaExacta(fila.map((a, j) => a * plan[j]!)));

  // c = Aᵀ y: con y > 0, ese plan satisface las condiciones de optimalidad.
  const margenes = Array.from({ length: n }, (_, j) =>
    sumaExacta(A.map((fila, i) => fila[j]! * duales[i]!)),
  );

  const descripcion = nombres
    .map(
      (nombre, j) =>
        `cada unidad de ${nombre} consume ${recursos
          .map((r, i) => `${formatearNumero(A[i]![j]!, { decimales: 0 })} ${r.unidad} de ${r.nombre.toLowerCase()}`)
          .join(', ')}, y deja ${simbolo} ${formatearNumero(margenes[j]!, { decimales: 0 })} de margen`,
    )
    .join('; ');

  return {
    id: `gen-simp-${op.semilla}`,
    titulo: `Mezcla de producción con ${n} productos en ${v.organizacion} (generado)`,
    tema: 'simplex',
    metodo: 'Método simplex (dos fases)',
    contexto: op.contexto,
    dificultad: op.dificultad,
    enunciado:
      `${v.organizacion.charAt(0).toUpperCase()}${v.organizacion.slice(1)} produce ${nombres.join(', ')} y dispone de ` +
      `${recursos.map((r, i) => `${formatearNumero(disponible[i]!, { decimales: 0 })} ${r.unidad} de ${r.nombre.toLowerCase()}`).join(', ')}. ` +
      `El consumo por unidad es el siguiente: ${descripcion}.\n\n` +
      '**Lleve el modelo a la forma estándar, resuélvalo por el método simplex y lea en el tableau final el plan óptimo, ' +
      'las holguras y el precio sombra de cada recurso.**\n\n' +
      `> Con ${n} variables el método gráfico ya no sirve: la región factible es un poliedro de ${n} dimensiones.`,
    datos: {
      tipo: 'simplex',
      objetivo: 'maximizar',
      variables: nombres.map((nombre, j) => ({ id: `x${j + 1}`, nombre, coeficiente: margenes[j]! })),
      unidadVariables: 'unidades',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: simbolo,
      restricciones: recursos.map((r, i) => ({
        id: r.id,
        nombre: r.nombre,
        coeficientes: [...A[i]!],
        relacion: '<=' as const,
        c: disponible[i]!,
        unidad: r.unidad,
      })),
    },
    preguntas: [],
    moneda: op.moneda,
    unidades: ['unidades', simbolo],
    tiempoEstimadoMinutos: n === 4 ? 55 : 40,
    origen: 'generado',
    validacion: 'verificado',
    fuenteId: null,
    atribucion: `Generado con semilla ${op.semilla}`,
    inconsistencias: [],
    notasDocente:
      `Plan óptimo previsto: ${nombres.map((nombre, j) => `${formatearNumero(plan[j]!, { decimales: 0 })} de ${nombre}`).join(', ')}. ` +
      `Precios sombra previstos: ${recursos.map((r, i) => `${r.nombre.toLowerCase()} ${formatearNumero(duales[i]!, { decimales: 0 })}`).join(', ')}. ` +
      'El generador construyó el modelo a partir de esa respuesta y el solucionador la reprodujo antes de publicar el ejercicio.',
    semilla: op.semilla,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

// ───────────────────────────── Verificación previa a publicar ─────────────────────────────

function verificar(ejercicio: Ejercicio, op: OpcionesGenerador): Verificacion[] {
  const v: Verificacion[] = [];
  const d = ejercicio.datos;

  // Un ejercicio sin preguntas solo sirve para el laboratorio, no para
  // practicar con retroalimentación. Y una pregunta numérica sin respuesta
  // calculada no se puede calificar, así que tampoco debe publicarse.
  const numericas = ejercicio.preguntas.filter((p) => p.tipo === 'numerica');
  const sinRespuesta = numericas.filter((p) => typeof p.respuesta !== 'number' || !Number.isFinite(p.respuesta));
  v.push({
    nombre: 'Trae preguntas con respuesta calculada',
    paso: ejercicio.preguntas.length > 0 && sinRespuesta.length === 0,
    detalle:
      ejercicio.preguntas.length === 0
        ? 'Sin preguntas: el ejercicio no entraría al flujo de práctica'
        : sinRespuesta.length > 0
          ? `${sinRespuesta.length} pregunta(s) numérica(s) sin respuesta calculable`
          : `${ejercicio.preguntas.length} preguntas, ${numericas.length} de ellas numéricas`,
  });

  switch (d.tipo) {
    case 'asignacion': {
      const r = resolverAsignacion({ ...d, titulo: ejercicio.titulo });
      v.push({
        nombre: 'Tiene solución válida',
        paso: r.datos !== null,
        detalle: r.datos ? `Valor óptimo: ${formatearNumero(r.datos.valorTotal, { decimales: 2 })} ${d.unidad}` : 'El método no encontró asignación completa',
      });
      v.push({
        nombre: 'Cada fila recibe exactamente una columna',
        paso: r.datos !== null && new Set(r.datos.asignaciones.map((a) => a.columna)).size === r.datos.asignaciones.length,
        detalle: 'Sin columnas repetidas en la asignación óptima',
      });
      v.push({
        nombre: 'No hay resultados indeterminados sin advertir',
        paso: r.datos === null || !r.datos.solucionesAlternativas || r.diagnosticos.some((x) => x.codigo === 'ASIG_OPTIMOS_ALTERNATIVOS'),
        detalle: r.datos?.solucionesAlternativas ? 'Hay óptimos alternativos y quedan advertidos' : 'Solución única',
      });
      v.push({
        nombre: 'La dificultad corresponde al tamaño pedido',
        paso: dificultadCoincide(op.dificultad, d.filas.length * d.columnas.length, 16, 25),
        detalle: `Matriz de ${d.filas.length} × ${d.columnas.length}`,
      });
      break;
    }
    case 'transporte': {
      const r = resolverTransporte({ ...d, titulo: ejercicio.titulo }, 'vogel');
      const totalOferta = sumaExacta(d.oferta);
      const totalDemanda = sumaExacta(d.demanda);
      v.push({
        nombre: 'Tiene solución válida',
        paso: r.datos !== null,
        detalle: r.datos ? `Costo óptimo: ${formatearNumero(r.datos.solucionOptima.costoTotal, { decimales: 2 })} ${d.unidadCosto}` : 'Sin solución',
      });
      v.push({
        nombre: 'Oferta y demanda son positivas',
        paso: d.oferta.every((x) => x > 0) && d.demanda.every((x) => x > 0),
        detalle: `Oferta total ${formatearNumero(totalOferta, { decimales: 0 })}, demanda total ${formatearNumero(totalDemanda, { decimales: 0 })}`,
      });
      v.push({
        nombre: op.balanceado ? 'El problema queda balanceado' : 'El problema queda desbalanceado, como se pidió',
        paso: op.balanceado ? Math.abs(totalOferta - totalDemanda) < 1e-9 : Math.abs(totalOferta - totalDemanda) > 1e-9,
        detalle: `Diferencia: ${formatearNumero(totalOferta - totalDemanda, { decimales: 0, signoExplicito: true })}`,
      });
      v.push({
        nombre: 'La solución respeta oferta y demanda',
        paso:
          r.datos !== null &&
          r.datos.problema.oferta.every((o, i) => Math.abs(sumaExacta(r.datos!.solucionOptima.envios[i]!.slice()) - o) < 1e-6),
        detalle: 'Todas las filas despachan exactamente su oferta',
      });
      break;
    }
    case 'cpm': {
      const r = resolverCPM({ ...d, titulo: ejercicio.titulo });
      v.push({
        nombre: 'La red es acíclica y tiene solución',
        paso: r.datos !== null,
        detalle: r.datos ? `Duración: ${formatearNumero(r.datos.duracionProyecto, { decimales: 0 })} ${d.unidadTiempo}` : 'La red contiene un ciclo',
      });
      v.push({
        nombre: 'Todas las predecesoras existen',
        paso: !r.diagnosticos.some((x) => x.codigo === 'CPM_PREDECESORA_INEXISTENTE'),
        detalle: 'Sin referencias colgantes',
      });
      v.push({
        nombre: op.rutasCriticasMultiples ? 'Hay más de una ruta crítica, como se pidió' : 'Hay al menos una ruta crítica',
        paso: op.rutasCriticasMultiples ? (r.datos?.rutasCriticas.length ?? 0) > 1 : (r.datos?.rutasCriticas.length ?? 0) >= 1,
        detalle: `${r.datos?.rutasCriticas.length ?? 0} ruta(s) crítica(s)`,
      });
      v.push({
        nombre: 'Existen actividades con holgura (la red no es una cadena)',
        paso: (r.datos?.calculadas.filter((c) => !c.critica).length ?? 0) > 0,
        detalle: `${r.datos?.calculadas.filter((c) => !c.critica).length ?? 0} actividades con holgura`,
      });
      break;
    }
    case 'pert': {
      const r = resolverPERT({ ...d, titulo: ejercicio.titulo });
      v.push({
        nombre: 'Tiene solución válida',
        paso: r.datos !== null,
        detalle: r.datos ? `Duración esperada: ${formatearNumero(r.datos.duracionEsperada, { decimales: 2 })} ${d.unidadTiempo}` : 'Sin solución',
      });
      v.push({
        nombre: 'Se cumple a ≤ m ≤ b en todas las actividades',
        paso: d.actividades.every((a) => a.a <= a.m && a.m <= a.b),
        detalle: 'Estimaciones ordenadas correctamente',
      });
      v.push({
        nombre: 'La varianza del proyecto es positiva',
        paso: (r.datos?.varianzaProyecto ?? 0) > 0,
        detalle: `σ² = ${formatearNumero(r.datos?.varianzaProyecto ?? 0, { decimales: 4 })}`,
      });
      break;
    }
    case 'productividad': {
      const r = resolverProductividad({ ...d, titulo: ejercicio.titulo, periodo: '' });
      v.push({
        nombre: 'Tiene solución válida',
        paso: r.datos !== null,
        detalle: r.datos?.total !== null && r.datos !== null ? `Productividad total: ${formatearNumero(r.datos.total ?? 0, { decimales: 3 })}` : 'Sin solución',
      });
      v.push({
        nombre: 'No hay división entre cero',
        paso: r.datos !== null && r.datos.costoTotal > 0,
        detalle: `Costo total: ${formatearNumero(r.datos?.costoTotal ?? 0, { decimales: 2 })}`,
      });
      v.push({
        nombre: 'El resultado es económicamente verosímil',
        paso: (r.datos?.total ?? 0) > 0.3 && (r.datos?.total ?? 0) < 12,
        detalle: `Razón valor/costo = ${formatearNumero(r.datos?.total ?? 0, { decimales: 3 })}`,
      });
      break;
    }
    case 'grafico': {
      const r = resolverGrafico({ ...d, titulo: ejercicio.titulo });
      const g = r.datos;
      v.push({
        nombre: 'Tiene solución óptima finita',
        paso: g !== null && (g.desenlace === 'unica' || g.desenlace === 'multiples'),
        detalle: g === null ? 'Sin solución' : `Desenlace: ${g.desenlace}${g.valorOptimo === null ? '' : `, Z óptimo ${formatearNumero(g.valorOptimo, { decimales: 2 })}`}`,
      });
      v.push({
        nombre: 'La región factible tiene al menos tres vértices',
        paso: (g?.vertices.length ?? 0) >= 3,
        detalle: `${g?.vertices.length ?? 0} vértice(s)`,
      });
      v.push({
        nombre: 'El óptimo no está en el origen ni es trivial',
        paso: g?.optimo != null && (g.optimo.punto.x > 1e-9 || g.optimo.punto.y > 1e-9),
        detalle:
          g?.optimo == null
            ? 'Sin óptimo'
            : `Óptimo en (${formatearNumero(g.optimo.punto.x, { decimales: 2 })}; ${formatearNumero(g.optimo.punto.y, { decimales: 2 })})`,
      });
      v.push({
        nombre: 'Al menos una restricción queda activa',
        paso: (g?.holguras.filter((h) => h.activa).length ?? 0) >= 1,
        detalle: `${g?.holguras.filter((h) => h.activa).length ?? 0} restricción(es) activa(s)`,
      });
      v.push({
        nombre: 'Ninguna restricción es redundante',
        paso: !r.diagnosticos.some((x) => x.codigo === 'LP_RESTRICCION_REDUNDANTE'),
        detalle: 'Todas las restricciones tocan la región factible',
      });
      break;
    }
    case 'simplex': {
      const r = resolverSimplex({ ...d, titulo: ejercicio.titulo });
      const s = r.datos;
      v.push({
        nombre: 'Tiene solución óptima finita',
        paso: s !== null && s.valorOptimo !== null,
        detalle: s === null ? 'Sin solución' : `Z óptimo ${formatearNumero(aNumero(s.valorOptimo!), { decimales: 2 })}`,
      });
      v.push({
        nombre: 'La solución óptima es única',
        paso: s !== null && s.desenlace === 'optima',
        detalle: s === null ? 'Sin solución' : `Desenlace: ${s.desenlace}`,
      });
      v.push({
        nombre: 'No es degenerada',
        paso: s !== null && !s.degenerado,
        detalle: s?.degenerado === true ? 'Una variable básica vale cero' : 'Todas las variables básicas son positivas',
      });
      v.push({
        nombre: 'El plan usa todos los productos',
        paso: s !== null && s.solucion.every((x) => esPositivo(x.valor)),
        detalle:
          s === null
            ? 'Sin solución'
            : s.solucion.map((x) => `${x.variable.nombre}=${formatearNumero(aNumero(x.valor), { decimales: 2 })}`).join(', '),
      });
      v.push({
        nombre: 'Todos los recursos quedan agotados con precio sombra positivo',
        paso: s !== null && s.holguras.every((h) => h.activa && esPositivo(h.precioSombra)),
        detalle:
          s === null
            ? 'Sin solución'
            : s.holguras.map((h) => `${h.restriccion.nombre}=${formatearNumero(aNumero(h.precioSombra), { decimales: 2 })}`).join(', '),
      });
      v.push({
        nombre: 'El procedimiento requiere varias iteraciones',
        paso: (s?.iteracionesFase2 ?? 0) >= 2,
        detalle: `${s?.iteracionesFase2 ?? 0} iteración(es) en la fase 2`,
      });
      break;
    }
    case 'equilibrio': {
      const r = resolverEquilibrio({ ...d, titulo: ejercicio.titulo });
      v.push({
        nombre: 'El punto de equilibrio existe',
        paso: r.datos !== null && r.datos.alcanzable,
        detalle: r.datos?.puntoEquilibrioUnidades !== null && r.datos !== null
          ? `Equilibrio: ${formatearNumero(r.datos.puntoEquilibrioUnidades ?? 0, { decimales: 0 })} ${d.unidadProducto}`
          : 'Margen de contribución no positivo',
      });
      v.push({
        nombre: 'El equilibrio cabe dentro de la capacidad',
        paso: (r.datos?.porcentajeCapacidad ?? 0) > 0 && (r.datos?.porcentajeCapacidad ?? 0) <= 100,
        detalle: `${formatearNumero(r.datos?.porcentajeCapacidad ?? 0, { decimales: 1 })} % de la capacidad`,
      });
      break;
    }
    default:
      v.push({ nombre: 'Tema sin generador', paso: false, detalle: `El tema "${d.tipo}" no tiene generador automático` });
  }

  return v;
}

function dificultadCoincide(dificultad: Dificultad, tamano: number, umbralMedio: number, umbralAlto: number): boolean {
  if (dificultad === 'basico') return tamano <= umbralMedio;
  if (dificultad === 'intermedio') return tamano <= umbralAlto;
  return true;
}

// ───────────────────────────── Punto de entrada ─────────────────────────────

/** Temas que el generador sabe producir. Los demás se crean a mano. */
export const TEMAS_GENERABLES: readonly Tema[] = [
  'productividad',
  'equilibrio',
  'cpm',
  'pert',
  'grafico',
  'simplex',
  'asignacion',
  'transporte',
];

/**
 * Genera un ejercicio, lo resuelve y verifica antes de devolverlo.
 * Reintenta con semillas derivadas hasta `maxIntentos` si la verificación falla.
 */
export function generarEjercicio(opciones: Partial<OpcionesGenerador> = {}, maxIntentos = 12): ResultadoGeneracion {
  const base = { ...OPCIONES_POR_DEFECTO, ...opciones };

  let ultimas: Verificacion[] = [];
  for (let intento = 0; intento < maxIntentos; intento++) {
    const semilla = (base.semilla + intento * 7919) >>> 0;
    const op = { ...base, semilla };
    const azar = generadorSemilla(semilla);

    let ejercicio: Ejercicio;
    switch (op.tema) {
      case 'asignacion': ejercicio = generarAsignacion(op, azar); break;
      case 'transporte': ejercicio = generarTransporte(op, azar); break;
      case 'cpm': ejercicio = generarCPM(op, azar); break;
      case 'pert': ejercicio = generarPERT(op, azar); break;
      case 'productividad': ejercicio = generarProductividad(op, azar); break;
      case 'equilibrio': ejercicio = generarEquilibrio(op, azar); break;
      case 'grafico': ejercicio = generarGrafico(op, azar); break;
      case 'simplex': ejercicio = generarSimplex(op, azar); break;
      default:
        return {
          ejercicio: null,
          verificaciones: [{ nombre: 'Tema soportado', paso: false, detalle: `El generador no cubre el tema "${op.tema}". Créelo manualmente desde el panel docente.` }],
          intentos: 1,
          semillaUsada: semilla,
        };
    }

    // Las preguntas se arman en un solo sitio, con los mismos constructores que
    // usa la biblioteca: así un ejercicio generado entra al flujo de práctica
    // con retroalimentación, no solo al laboratorio.
    ejercicio = { ...ejercicio, preguntas: preguntasDe(ejercicio.datos, ejercicio.titulo) };

    const verificaciones = verificar(ejercicio, op);
    ultimas = verificaciones;

    if (verificaciones.every((x) => x.paso)) {
      return { ejercicio, verificaciones, intentos: intento + 1, semillaUsada: semilla };
    }
  }

  return { ejercicio: null, verificaciones: ultimas, intentos: maxIntentos, semillaUsada: base.semilla };
}

/** Genera varios ejercicios distintos a partir de una semilla base. */
export function generarSerie(
  opciones: Partial<OpcionesGenerador>,
  cantidad: number,
): readonly ResultadoGeneracion[] {
  const base = { ...OPCIONES_POR_DEFECTO, ...opciones };
  return Array.from({ length: cantidad }, (_, i) =>
    generarEjercicio({ ...base, semilla: (base.semilla + i * 104729) >>> 0 }),
  );
}
