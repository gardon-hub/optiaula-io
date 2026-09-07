/**
 * Módulo 1 — Manufactura y servicios: el perfil de operaciones.
 *
 * El error que este simulador combate es tratar la distinción como una casilla:
 * «esto es manufactura, esto es servicio». La literatura del curso —Russell y
 * Taylor, Heizer, Chase— no la presenta así, sino como un **conjunto de rasgos**
 * en los que una organización puede estar en un punto intermedio. Una cooperativa
 * lechera que además reparte a domicilio fabrica un bien tangible y almacenable,
 * pero atiende al cliente cara a cara y su calidad percibida depende del trato
 * del repartidor. No es ni una cosa ni la otra.
 *
 * Por eso el estudiante no clasifica: **perfila**. Sitúa la organización en cada
 * rasgo y el motor calcula dónde queda en el continuo.
 *
 * Lo que convierte esto en simulación y no en cuestionario es la segunda mitad:
 * cada rasgo tiene una **consecuencia operativa**. Si el producto no se puede
 * inventariar, la capacidad debe dimensionarse al pico de demanda, y no hay
 * discusión posible. Mover el control cambia la consecuencia, y ahí está la
 * enseñanza: los rasgos no son etiquetas de vocabulario, son restricciones que
 * deciden cómo se administra la operación.
 *
 * Todo el módulo es puro: recibe el perfil y devuelve el resultado.
 */

import { formatearNumero } from './numero';
import { aviso, nota, type Diagnostico, type Paso, type Resultado } from './tipos';

// ───────────────────────────── Rasgos ─────────────────────────────

export type RasgoId =
  | 'tangibilidad'
  | 'almacenabilidad'
  | 'contacto'
  | 'simultaneidad'
  | 'uniformidad'
  | 'medicion'
  | 'ubicacion'
  | 'intensidad';

export interface Rasgo {
  readonly id: RasgoId;
  readonly nombre: string;
  /** Qué significa el extremo 0, propio de la manufactura. */
  readonly poloManufactura: string;
  /** Qué significa el extremo 100, propio de los servicios. */
  readonly poloServicios: string;
  /** Qué se le pregunta al estudiante para situarlo. */
  readonly pregunta: string;
}

/**
 * Los ocho rasgos con los que la bibliografía del curso contrasta manufactura y
 * servicios. El orden va de lo más visible —¿se puede tocar el producto?— a lo
 * más estructural, que es como se explica en clase.
 */
export const RASGOS: readonly Rasgo[] = [
  {
    id: 'tangibilidad',
    nombre: 'Tangibilidad del producto',
    poloManufactura: 'Un bien físico que se puede tocar, pesar y transportar',
    poloServicios: 'Un resultado intangible: una experiencia, un diagnóstico, un traslado',
    pregunta: '¿Lo que la organización entrega se puede tocar y transportar?',
  },
  {
    id: 'almacenabilidad',
    nombre: 'Almacenabilidad',
    poloManufactura: 'Se produce hoy y se guarda para vender después',
    poloServicios: 'No se puede guardar: si nadie lo consume, la capacidad de ese día se pierde',
    pregunta: '¿Se puede producir por anticipado y guardar en inventario?',
  },
  {
    id: 'contacto',
    nombre: 'Contacto con el cliente',
    poloManufactura: 'El cliente nunca entra a la planta ni ve el proceso',
    poloServicios: 'El cliente está dentro del proceso mientras ocurre',
    pregunta: '¿Cuánto participa el cliente en el momento de producir?',
  },
  {
    id: 'simultaneidad',
    nombre: 'Producción y consumo',
    poloManufactura: 'Separados: se fabrica en un lugar y se consume en otro, semanas después',
    poloServicios: 'Simultáneos: se produce en el mismo instante en que se consume',
    pregunta: '¿Se produce y se consume al mismo tiempo?',
  },
  {
    id: 'uniformidad',
    nombre: 'Uniformidad de la salida',
    poloManufactura: 'Cada unidad sale igual a la anterior, según especificación',
    poloServicios: 'Cada entrega es distinta porque se adapta a quien la recibe',
    pregunta: '¿Cuán parecidas son entre sí dos entregas consecutivas?',
  },
  {
    id: 'medicion',
    nombre: 'Medición de la calidad',
    poloManufactura: 'Objetiva: se mide con instrumento contra una norma',
    poloServicios: 'Percibida: depende del juicio de quien la recibe',
    pregunta: '¿La calidad se mide con un instrumento o se pregunta al cliente?',
  },
  {
    id: 'ubicacion',
    nombre: 'Criterio de ubicación',
    poloManufactura: 'Se ubica cerca de los insumos o donde el costo sea menor',
    poloServicios: 'Se ubica cerca del cliente, porque el cliente tiene que llegar',
    pregunta: '¿Qué manda al decidir dónde instalarse: el costo o la cercanía al cliente?',
  },
  {
    id: 'intensidad',
    nombre: 'Intensidad de los recursos',
    poloManufactura: 'Intensiva en capital: el equipo hace la mayor parte del trabajo',
    poloServicios: 'Intensiva en mano de obra: el resultado depende de las personas',
    pregunta: '¿El resultado lo produce sobre todo el equipo o sobre todo la gente?',
  },
];

/** Perfil: cada rasgo situado de 0 (manufactura pura) a 100 (servicio puro). */
export type Perfil = Readonly<Record<RasgoId, number>>;

export type Naturaleza = 'manufactura' | 'mixta' | 'servicios';

// ───────────────────────────── Consecuencias ─────────────────────────────

export interface Consecuencia {
  readonly rasgo: RasgoId;
  readonly titulo: string;
  readonly texto: string;
  /** Hacia qué polo apunta la consecuencia, para poder mostrarla con su color. */
  readonly lado: 'manufactura' | 'servicios';
}

/**
 * Qué obliga a hacer cada rasgo cuando está claramente en un extremo.
 *
 * Se emiten solo cuando el rasgo pasa de 65 o queda por debajo de 35: en la zona
 * intermedia la organización todavía puede elegir, y afirmar una consecuencia
 * ahí sería inventarle una restricción que no tiene.
 */
function consecuenciasDe(perfil: Perfil): Consecuencia[] {
  const salida: Consecuencia[] = [];
  const alto = (id: RasgoId): boolean => perfil[id] >= 65;
  const bajo = (id: RasgoId): boolean => perfil[id] <= 35;

  if (alto('almacenabilidad')) {
    salida.push({
      rasgo: 'almacenabilidad',
      lado: 'servicios',
      titulo: 'La capacidad se dimensiona al pico, no al promedio',
      texto:
        'Si lo que produce no se puede guardar, el inventario no sirve de amortiguador entre lo que llega y lo que ' +
        'puede atender. Toda la demanda de la hora punta hay que absorberla con capacidad instalada en esa hora: más ' +
        'personal, más puestos, o una fila. Es exactamente el problema del módulo 13.',
    });
  }
  if (bajo('almacenabilidad')) {
    salida.push({
      rasgo: 'almacenabilidad',
      lado: 'manufactura',
      titulo: 'El inventario absorbe la variación de la demanda',
      texto:
        'Poder producir por anticipado permite nivelar la producción aunque la demanda suba y baje: se fabrica parejo ' +
        'y el inventario cubre los picos. A cambio hay que decidir cuánto guardar y cuándo reordenar, que es el ' +
        'problema del módulo 12.',
    });
  }
  if (alto('contacto')) {
    salida.push({
      rasgo: 'contacto',
      lado: 'servicios',
      titulo: 'El cliente entra al proceso y le mete variabilidad',
      texto:
        'Cuando el cliente está presente mientras se produce, deja de ser solo ambiente externo: se vuelve parte del ' +
        'proceso y una fuente de variabilidad que la organización no controla. No se puede estandarizar lo que depende ' +
        'de lo que cada quien pida o de cuánto se demore en decidir.',
    });
  }
  if (alto('simultaneidad')) {
    salida.push({
      rasgo: 'simultaneidad',
      lado: 'servicios',
      titulo: 'No hay inspección antes de entregar',
      texto:
        'Si se produce en el mismo instante en que se consume, no existe el momento intermedio en el que un inspector ' +
        'revisa y separa lo defectuoso. La calidad hay que construirla durante el proceso, porque cuando termina el ' +
        'cliente ya lo recibió.',
    });
  }
  if (alto('uniformidad')) {
    salida.push({
      rasgo: 'uniformidad',
      lado: 'servicios',
      titulo: 'El proceso se diseña flexible, no repetitivo',
      texto:
        'Si cada entrega se adapta a quien la recibe, no se puede montar una línea que repita siempre lo mismo. Hacen ' +
        'falta personas polivalentes y equipo de uso general, y el costo unitario será mayor que el de un proceso ' +
        'estandarizado. Es el intercambio entre flexibilidad y costo.',
    });
  }
  if (bajo('uniformidad')) {
    salida.push({
      rasgo: 'uniformidad',
      lado: 'manufactura',
      titulo: 'La repetición permite bajar el costo unitario',
      texto:
        'Producir siempre lo mismo hace rentable especializar el equipo y el puesto de trabajo, y convierte cada ' +
        'desviación en una señal clara de que algo anda mal.',
    });
  }
  if (alto('medicion')) {
    salida.push({
      rasgo: 'medicion',
      lado: 'servicios',
      titulo: 'La calidad se pregunta, no se mide',
      texto:
        'Cuando la calidad es percibida, el instrumento es la encuesta, el reclamo y la observación del trato, no el ' +
        'calibrador ni el termómetro. Medir solo lo que el aparato registra deja fuera justo aquello por lo que el ' +
        'cliente vuelve o no vuelve.',
    });
  }
  if (bajo('medicion')) {
    salida.push({
      rasgo: 'medicion',
      lado: 'manufactura',
      titulo: 'La especificación decide, no la opinión',
      texto:
        'Con una norma medible —grados de acidez, gramos, temperatura— la discusión sobre si el producto está bien ' +
        'termina en el instrumento. Eso permite rechazar lote sin negociar y llevar control estadístico del proceso.',
    });
  }
  if (alto('ubicacion')) {
    salida.push({
      rasgo: 'ubicacion',
      lado: 'servicios',
      titulo: 'La ubicación se decide por el cliente, no por el costo',
      texto:
        'Si el cliente tiene que llegar, ahorrar en el terreno instalándose lejos no es un ahorro: es demanda que no ' +
        'llega. En el módulo 3 esto cambia el criterio de la decisión de localización.',
    });
  }
  if (bajo('ubicacion')) {
    salida.push({
      rasgo: 'ubicacion',
      lado: 'manufactura',
      titulo: 'La ubicación se decide por el costo de mover',
      texto:
        'Cuando el producto viaja al cliente y no al revés, conviene instalarse donde el costo total de traer insumos ' +
        'y despachar producto sea menor. Es el criterio de carga-distancia del módulo 3.',
    });
  }
  if (alto('intensidad')) {
    salida.push({
      rasgo: 'intensidad',
      lado: 'servicios',
      titulo: 'La productividad se gana con la gente',
      texto:
        'Si el resultado depende de las personas, la capacitación y la rotación pesan más que cualquier compra de ' +
        'equipo. En el módulo 2 esto se ve en cuál productividad parcial mueve de verdad la total.',
    });
  }

  return salida;
}

// ───────────────────────────── Resultado ─────────────────────────────

export interface DiferenciaRasgo {
  readonly rasgo: RasgoId;
  readonly nombre: string;
  readonly valorEstudiante: number;
  readonly valorReferencia: number;
  readonly diferencia: number;
}

export interface ResultadoNaturaleza {
  readonly indice: number;
  readonly naturaleza: Naturaleza;
  readonly consecuencias: readonly Consecuencia[];
  /** Presente solo cuando hay un perfil de referencia contra el cual comparar. */
  readonly indiceReferencia: number | null;
  readonly naturalezaReferencia: Naturaleza | null;
  /** Rasgos ordenados por cuánto se apartan de la referencia, mayor primero. */
  readonly diferencias: readonly DiferenciaRasgo[];
  /** Rasgos que se apartan lo suficiente como para hablar de desacuerdo. */
  readonly discrepancias: readonly DiferenciaRasgo[];
}

/** A partir de qué índice se considera de un tipo o del otro. */
const CORTE_MANUFACTURA = 40;
const CORTE_SERVICIOS = 60;

/** Cuánto tiene que apartarse un rasgo de la referencia para llamarlo desacuerdo. */
const TOLERANCIA_RASGO = 25;

export function clasificar(indice: number): Naturaleza {
  if (indice < CORTE_MANUFACTURA) return 'manufactura';
  if (indice > CORTE_SERVICIOS) return 'servicios';
  return 'mixta';
}

export const NOMBRE_NATURALEZA: Readonly<Record<Naturaleza, string>> = {
  manufactura: 'Manufactura',
  mixta: 'Mixta',
  servicios: 'Servicios',
};

/**
 * Índice del perfil: el promedio simple de los ocho rasgos.
 *
 * Simple a propósito. Ponderar unos rasgos más que otros exigiría una fuente que
 * dijera cuánto pesa cada uno, y ninguna de las del curso lo dice: inventar los
 * pesos daría un número de apariencia precisa sin nada que lo sostenga.
 */
export function indiceDe(perfil: Perfil): number {
  const valores = RASGOS.map((r) => perfil[r.id]);
  return valores.reduce((s, v) => s + v, 0) / valores.length;
}

export interface DatosNaturaleza {
  readonly organizacion: string;
  readonly descripcion: string;
  readonly perfil: Perfil;
  /** Perfil que el docente considera correcto. `null` en exploración libre. */
  readonly referencia: Perfil | null;
}

export function resolverNaturaleza(datos: DatosNaturaleza): Resultado<ResultadoNaturaleza> {
  const diagnosticos: Diagnostico[] = [];

  const fuera = RASGOS.filter((r) => {
    const v = datos.perfil[r.id];
    return !Number.isFinite(v) || v < 0 || v > 100;
  });
  if (fuera.length > 0) {
    // Se corrige acotando en vez de fallar: el control de la interfaz no puede
    // producir esto, así que solo llegaría de un respaldo editado a mano, y
    // negarse a mostrar nada sería peor que mostrarlo acotado y avisar.
    diagnosticos.push(
      aviso(
        'perfil-fuera-de-rango',
        `Estos rasgos tenían un valor fuera de 0 a 100 y se acotaron: ${fuera.map((r) => r.nombre).join(', ')}.`,
      ),
    );
  }
  const acotar = (v: number): number => (Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50);
  const perfil = Object.fromEntries(RASGOS.map((r) => [r.id, acotar(datos.perfil[r.id])])) as Perfil;

  const indice = indiceDe(perfil);
  const naturaleza = clasificar(indice);
  const consecuencias = consecuenciasDe(perfil);

  const indiceReferencia = datos.referencia === null ? null : indiceDe(datos.referencia);
  const naturalezaReferencia = indiceReferencia === null ? null : clasificar(indiceReferencia);

  const referencia = datos.referencia;
  const diferencias: DiferenciaRasgo[] =
    referencia === null
      ? []
      : RASGOS.map((r) => ({
          rasgo: r.id,
          nombre: r.nombre,
          valorEstudiante: perfil[r.id],
          valorReferencia: referencia[r.id],
          diferencia: Math.abs(perfil[r.id] - referencia[r.id]),
        })).sort((a, b) => b.diferencia - a.diferencia);

  const discrepancias = diferencias.filter((d) => d.diferencia > TOLERANCIA_RASGO);

  if (naturaleza === 'mixta') {
    diagnosticos.push(
      nota(
        'perfil-mixto',
        'El perfil queda en la zona intermedia. No es un resultado ambiguo ni un error: la mayoría de las ' +
          'organizaciones reales son mixtas, y reconocerlo es más útil que forzarlas a una casilla.',
      ),
    );
  }
  if (referencia !== null && discrepancias.length > 0) {
    diagnosticos.push(
      aviso(
        'discrepancia-referencia',
        `Hay ${discrepancias.length} ${discrepancias.length === 1 ? 'rasgo que se aparta' : 'rasgos que se apartan'} ` +
          `más de ${TOLERANCIA_RASGO} puntos del perfil de referencia.`,
      ),
    );
  }

  return {
    datos: {
      indice,
      naturaleza,
      consecuencias,
      indiceReferencia,
      naturalezaReferencia,
      diferencias,
      discrepancias,
    },
    pasos: pasosDe(datos.organizacion, perfil, indice, naturaleza, consecuencias),
    diagnosticos,
    interpretacion: interpretacionDe(datos.organizacion, indice, naturaleza, consecuencias),
  };
}

// ───────────────────────────── Explicación ─────────────────────────────

function pasosDe(
  organizacion: string,
  perfil: Perfil,
  indice: number,
  naturaleza: Naturaleza,
  consecuencias: readonly Consecuencia[],
): Paso[] {
  const pasos: Paso[] = [
    {
      numero: 1,
      titulo: 'Situar la organización en cada rasgo',
      explicacion:
        'Cada rasgo va de 0 —el extremo de la manufactura— a 100 —el extremo del servicio—. No se trata de acertar ' +
        'una casilla sino de reconocer dónde está esta organización en cada uno.',
      tabla: {
        encabezados: ['Rasgo', 'Extremo de manufactura', 'Extremo de servicio', 'Valor'],
        filas: RASGOS.map((r) => [
          r.nombre,
          r.poloManufactura,
          r.poloServicios,
          formatearNumero(perfil[r.id], { decimales: 0 }),
        ]),
      },
    },
    {
      numero: 2,
      titulo: 'Promediar los ocho rasgos',
      explicacion:
        'El índice es el promedio simple. Se promedia sin pesos porque ninguna de las fuentes del curso dice cuánto ' +
        'pesa un rasgo frente a otro, y ponerlos daría un número de apariencia precisa sin nada que lo sostenga.',
      formula: '\\text{índice} = \\frac{1}{8}\\sum_{i=1}^{8} r_i',
      valor: indice,
    },
    {
      numero: 3,
      titulo: 'Leer el continuo',
      explicacion:
        `Con índice ${formatearNumero(indice, { decimales: 1 })}, ${organizacion} queda en la zona de ` +
        `**${NOMBRE_NATURALEZA[naturaleza].toLowerCase()}**. Por debajo de ${CORTE_MANUFACTURA} se lee como ` +
        `manufactura, por encima de ${CORTE_SERVICIOS} como servicio, y entre ambos como mixta.`,
    },
  ];

  if (consecuencias.length > 0) {
    pasos.push({
      numero: 4,
      titulo: 'Derivar las consecuencias operativas',
      explicacion:
        'Aquí está lo que importa: cada rasgo que quedó en un extremo obliga a administrar la operación de cierta ' +
        'manera. No son etiquetas de vocabulario, son restricciones.',
      tabla: {
        encabezados: ['Rasgo', 'Lo que obliga'],
        filas: consecuencias.map((c) => [RASGOS.find((r) => r.id === c.rasgo)!.nombre, c.titulo]),
      },
    });
  }

  return pasos;
}

function interpretacionDe(
  organizacion: string,
  indice: number,
  naturaleza: Naturaleza,
  consecuencias: readonly Consecuencia[],
): string {
  const cabeza =
    naturaleza === 'mixta'
      ? `${organizacion} no es ni una fábrica ni un servicio puro: con índice ${formatearNumero(indice, { decimales: 1 })} ` +
        'queda en la zona intermedia, que es donde está la mayoría de las organizaciones reales. Lo útil no es ponerle ' +
        'la etiqueta correcta sino saber en qué rasgos se comporta como fábrica y en cuáles como servicio, porque cada ' +
        'uno se administra distinto.'
      : `${organizacion} se comporta principalmente como ${NOMBRE_NATURALEZA[naturaleza].toLowerCase()}, con índice ` +
        `${formatearNumero(indice, { decimales: 1 })}. Aun así conviene mirar rasgo por rasgo: casi ninguna ` +
        'organización está en el extremo en todos.';

  if (consecuencias.length === 0) {
    return (
      cabeza +
      ' Ningún rasgo quedó lo bastante marcado como para imponer una forma de administrar: en esta zona la ' +
      'organización todavía puede elegir, y esa libertad es en sí misma un dato para el gerente.'
    );
  }

  const primeras = consecuencias.slice(0, 2).map((c) => c.titulo.toLowerCase());
  return (
    cabeza +
    ` De este perfil se desprenden ${consecuencias.length} consecuencias operativas concretas; las más ` +
    `determinantes son que ${primeras.join(' y que ')}. Son restricciones, no preferencias: no dependen de lo que ` +
    'el gerente quiera hacer sino de la naturaleza de lo que produce.'
  );
}
