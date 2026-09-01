/**
 * Módulo 6b — Compresión del proyecto (crashing).
 *
 * Responde «¿cuánto cuesta terminar antes?». Cada actividad tiene una duración
 * normal con su costo y una duración acelerada, más cara, y la pregunta es qué
 * conviene acortar y hasta dónde.
 *
 * El procedimiento es el de los libros, un periodo a la vez: mirar qué
 * actividades son críticas, elegir la combinación más barata que acorte
 * **todas** las rutas críticas a la vez, bajarla un periodo y volver a resolver
 * la red. Volver a resolver en cada paso no es un lujo: al comprimir aparecen
 * rutas críticas nuevas, y quien no las recalcula termina pagando por acortar
 * una ruta mientras otra ya manda sobre la duración del proyecto.
 */

import type { CodigoMoneda } from '@/config/identidad';
import { resolverCPM, type Actividad, type DatosCPM } from './cpm';
import { dividirSeguro, formatearNumero, sumaExacta } from './numero';
import {
  ConstructorPasos,
  aviso,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Resultado,
} from './tipos';

export interface ActividadComprimible extends Actividad {
  /** Duración mínima alcanzable. `null` o igual a `duracion` = no se puede acortar. */
  readonly duracionAcelerada: number | null;
  readonly costoNormal: number;
  readonly costoAcelerado: number;
}

export interface DatosCrashing {
  readonly titulo: string;
  readonly actividades: readonly ActividadComprimible[];
  readonly unidadTiempo: string;
  readonly costoIndirectoPorPeriodo: number;
  readonly moneda: CodigoMoneda;
  /**
   * Hasta dónde comprimir. `null` significa comprimir mientras se pueda, que es
   * lo que hace falta para encontrar el mínimo de costo total.
   */
  readonly duracionObjetivo?: number | null;
}

export interface PendienteActividad {
  readonly id: string;
  readonly descripcion: string;
  readonly duracionNormal: number;
  readonly duracionAcelerada: number;
  readonly periodosDisponibles: number;
  readonly costoNormal: number;
  readonly costoAcelerado: number;
  /** Costo de acortar un periodo. `null` cuando la actividad no se puede acortar. */
  readonly pendiente: number | null;
}

export interface PasoCompresion {
  readonly numero: number;
  readonly duracionAntes: number;
  readonly duracionDespues: number;
  /** Actividades acortadas un periodo en este paso. */
  readonly acortadas: readonly string[];
  /** Lo que costó este periodo de reducción. */
  readonly costoDelPaso: number;
  readonly costoDirecto: number;
  readonly costoIndirecto: number;
  readonly costoTotal: number;
  readonly rutasCriticas: readonly (readonly string[])[];
}

export interface ResultadoCrashing {
  readonly moneda: CodigoMoneda;
  readonly unidadTiempo: string;
  readonly pendientes: readonly PendienteActividad[];
  readonly duracionNormal: number;
  readonly duracionMinima: number;
  readonly costoDirectoNormal: number;
  readonly costoIndirectoPorPeriodo: number;
  readonly pasos: readonly PasoCompresion[];
  /** Duraciones alcanzables con su costo, de la normal a la mínima. */
  readonly curva: readonly { readonly duracion: number; readonly directo: number; readonly indirecto: number; readonly total: number }[];
  /** Duración de costo total mínimo. */
  readonly duracionOptima: number;
  readonly costoTotalOptimo: number;
  readonly costoTotalNormal: number;
  /** Duraciones finales de cada actividad en el punto óptimo. */
  readonly duracionesOptimas: Readonly<Record<string, number>>;
  /** Cierto si la búsqueda del conjunto más barato tuvo que recurrir a una heurística. */
  readonly usoHeuristica: boolean;
}

/** Por encima de este número de candidatas la búsqueda exacta deja de ser viable. */
const TOPE_EXACTO = 16;

const aceleradaDe = (a: ActividadComprimible): number =>
  a.duracionAcelerada === null ? a.duracion : Math.min(a.duracionAcelerada, a.duracion);

export function pendienteDe(a: ActividadComprimible): number | null {
  const acelerada = aceleradaDe(a);
  const periodos = a.duracion - acelerada;
  if (periodos <= 0) return null;
  return dividirSeguro(a.costoAcelerado - a.costoNormal, periodos);
}

function validar(d: DatosCrashing): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.actividades.length === 0) {
    g.push(error('CRASH_SIN_ACTIVIDADES', 'No hay actividades que comprimir.'));
    return g;
  }

  for (const a of d.actividades) {
    const acelerada = aceleradaDe(a);
    if (a.duracionAcelerada !== null && a.duracionAcelerada > a.duracion) {
      g.push(
        aviso(
          'CRASH_ACELERADA_MAYOR',
          `La duración acelerada de "${a.id}" (${formatearNumero(a.duracionAcelerada)}) es mayor que la normal ` +
            `(${formatearNumero(a.duracion)}). Acelerar no puede alargar: se toma la normal y la actividad queda sin comprimir.`,
          a.id,
        ),
      );
    }
    if (acelerada < a.duracion && a.costoAcelerado < a.costoNormal) {
      g.push(
        aviso(
          'CRASH_COSTO_MENOR',
          `Acelerar "${a.id}" costaría menos que hacerla en tiempo normal. Si fuera cierto, convendría acelerarla ` +
            'siempre y la duración normal no sería la de mínimo costo: conviene revisar el dato.',
          a.id,
        ),
      );
    }
    if (!Number.isInteger(a.duracion) || !Number.isInteger(acelerada)) {
      g.push(
        aviso(
          'CRASH_DURACION_FRACCIONARIA',
          `La actividad "${a.id}" tiene duraciones no enteras. El procedimiento comprime de un periodo a la vez, ` +
            'así que con fracciones el recorrido puede no llegar a la duración mínima teórica.',
          a.id,
        ),
      );
    }
  }

  if (d.actividades.every((a) => pendienteDe(a) === null)) {
    g.push(
      error(
        'CRASH_NADA_COMPRIMIBLE',
        'Ninguna actividad admite reducción: sin duraciones aceleradas no hay nada que comprimir.',
      ),
    );
  }

  return g;
}

/**
 * Conjunto más barato de actividades que, acortadas un periodo cada una, reduce
 * la duración del proyecto.
 *
 * Para que el proyecto baje un periodo hay que tocar **todas** las rutas
 * críticas: acortar una actividad de una sola ruta deja a las demás donde
 * estaban. Es un problema de recubrimiento, y con las cantidades de un ejercicio
 * —rara vez más de una docena de actividades críticas comprimibles— se resuelve
 * por enumeración exacta. Por encima del tope se cae a una heurística voraz, y
 * el resultado lo declara.
 */
function conjuntoMasBarato(
  candidatas: readonly PendienteActividad[],
  rutas: readonly (readonly string[])[],
): { conjunto: readonly string[]; costo: number; exacto: boolean } | null {
  const utiles = candidatas.filter((c) => c.pendiente !== null);
  if (utiles.length === 0 || rutas.length === 0) return null;

  const cubre = (ids: readonly string[]): boolean =>
    rutas.every((ruta) => ids.some((id) => ruta.includes(id)));

  // Si alguna ruta crítica no tiene ninguna candidata, no hay nada que hacer.
  if (!cubre(utiles.map((c) => c.id))) return null;

  if (utiles.length <= TOPE_EXACTO) {
    let mejor: { conjunto: readonly string[]; costo: number } | null = null;
    for (let mascara = 1; mascara < 1 << utiles.length; mascara++) {
      const elegidas: string[] = [];
      let costo = 0;
      for (let i = 0; i < utiles.length; i++) {
        if (mascara & (1 << i)) {
          elegidas.push(utiles[i]!.id);
          costo += utiles[i]!.pendiente!;
        }
      }
      if (mejor !== null && costo >= mejor.costo) continue;
      if (cubre(elegidas)) mejor = { conjunto: elegidas, costo };
    }
    return mejor === null ? null : { ...mejor, exacto: true };
  }

  // Heurística voraz: en cada vuelta, la candidata más barata por ruta que cubre.
  const pendientesPorCubrir = rutas.map((r) => [...r]);
  const elegidas: string[] = [];
  let costo = 0;
  const disponibles = [...utiles];

  while (pendientesPorCubrir.some((r) => !elegidas.some((id) => r.includes(id)))) {
    const sinCubrir = pendientesPorCubrir.filter((r) => !elegidas.some((id) => r.includes(id)));
    let mejorId: string | null = null;
    let mejorRazon = Infinity;
    for (const c of disponibles) {
      if (elegidas.includes(c.id)) continue;
      const cubiertas = sinCubrir.filter((r) => r.includes(c.id)).length;
      if (cubiertas === 0) continue;
      const razon = c.pendiente! / cubiertas;
      if (razon < mejorRazon) {
        mejorRazon = razon;
        mejorId = c.id;
      }
    }
    if (mejorId === null) return null;
    elegidas.push(mejorId);
    costo += disponibles.find((c) => c.id === mejorId)!.pendiente!;
  }

  return { conjunto: elegidas, costo, exacto: false };
}

export function resolverCrashing(d: DatosCrashing): Resultado<ResultadoCrashing> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const simbolo = d.moneda === 'USD' ? 'US$' : 'L';

  const pendientes: PendienteActividad[] = d.actividades.map((a) => {
    const acelerada = aceleradaDe(a);
    return {
      id: a.id,
      descripcion: a.descripcion,
      duracionNormal: a.duracion,
      duracionAcelerada: acelerada,
      periodosDisponibles: a.duracion - acelerada,
      costoNormal: a.costoNormal,
      costoAcelerado: a.costoAcelerado,
      pendiente: pendienteDe(a),
    };
  });

  const costoDirectoNormal = sumaExacta(d.actividades.map((a) => a.costoNormal));

  // Estado que se va comprimiendo: duración actual y periodos que aún quedan.
  const duraciones = new Map(d.actividades.map((a) => [a.id, a.duracion]));
  const restantes = new Map(pendientes.map((p) => [p.id, p.periodosDisponibles]));

  const red = (): DatosCPM => ({
    titulo: d.titulo,
    unidadTiempo: d.unidadTiempo,
    actividades: d.actividades.map((a) => ({
      id: a.id,
      descripcion: a.descripcion,
      predecesoras: a.predecesoras,
      duracion: duraciones.get(a.id) ?? a.duracion,
    })),
  });

  const inicial = resolverCPM(red());
  if (inicial.datos === null) {
    return resultadoFallido([
      ...diagnosticos,
      error(
        'CRASH_RED_INVALIDA',
        'La red no se puede resolver, así que no hay nada que comprimir. ' +
          inicial.diagnosticos.map((x) => x.mensaje).join(' '),
      ),
    ]);
  }

  const duracionNormal = inicial.datos.duracionProyecto;
  const objetivo = d.duracionObjetivo ?? Number.NEGATIVE_INFINITY;

  const costoTotalDe = (duracion: number, directo: number): number =>
    directo + d.costoIndirectoPorPeriodo * duracion;

  const curva: { duracion: number; directo: number; indirecto: number; total: number }[] = [
    {
      duracion: duracionNormal,
      directo: costoDirectoNormal,
      indirecto: d.costoIndirectoPorPeriodo * duracionNormal,
      total: costoTotalDe(duracionNormal, costoDirectoNormal),
    },
  ];

  const pasosCompresion: PasoCompresion[] = [];
  let costoDirecto = costoDirectoNormal;
  let duracionActual = duracionNormal;
  let usoHeuristica = false;
  let cortoPorTope = false;

  // Cada vuelta baja el proyecto un periodo. El tope evita que un dato absurdo
  // convierta esto en un bucle infinito.
  const maximoPasos = duracionNormal + 1;

  for (let paso = 1; paso <= maximoPasos; paso++) {
    if (duracionActual <= objetivo) break;

    const actual = resolverCPM(red());
    if (actual.datos === null) break;

    const criticas = new Set(
      actual.datos.calculadas.filter((c) => c.critica).map((c) => c.actividad.id),
    );
    const candidatas = pendientes.filter((p) => criticas.has(p.id) && (restantes.get(p.id) ?? 0) > 0);
    const rutas = actual.datos.rutasCriticas.map((r) => r.actividades);

    const eleccion = conjuntoMasBarato(candidatas, rutas);
    if (eleccion === null) break;
    if (!eleccion.exacto) usoHeuristica = true;

    for (const id of eleccion.conjunto) {
      duraciones.set(id, (duraciones.get(id) ?? 0) - 1);
      restantes.set(id, (restantes.get(id) ?? 0) - 1);
    }

    const despues = resolverCPM(red());
    const duracionDespues = despues.datos?.duracionProyecto ?? duracionActual;

    // Si acortar no redujo el proyecto, el conjunto elegido no servía: se
    // deshace y se detiene, porque seguir solo gastaría dinero.
    if (duracionDespues >= duracionActual) {
      for (const id of eleccion.conjunto) {
        duraciones.set(id, (duraciones.get(id) ?? 0) + 1);
        restantes.set(id, (restantes.get(id) ?? 0) + 1);
      }
      break;
    }

    costoDirecto += eleccion.costo;
    const indirecto = d.costoIndirectoPorPeriodo * duracionDespues;

    pasosCompresion.push({
      numero: paso,
      duracionAntes: duracionActual,
      duracionDespues,
      acortadas: eleccion.conjunto,
      costoDelPaso: eleccion.costo,
      costoDirecto,
      costoIndirecto: indirecto,
      costoTotal: costoDirecto + indirecto,
      rutasCriticas: rutas,
    });

    curva.push({
      duracion: duracionDespues,
      directo: costoDirecto,
      indirecto,
      total: costoDirecto + indirecto,
    });

    duracionActual = duracionDespues;
    if (paso === maximoPasos) cortoPorTope = true;
  }

  const mejor = curva.reduce((a, b) => (b.total < a.total ? b : a), curva[0]!);

  // Las duraciones del punto óptimo: se rehace la compresión hasta ese paso.
  const duracionesOptimas: Record<string, number> = Object.fromEntries(
    d.actividades.map((a) => [a.id, a.duracion]),
  );
  for (const p of pasosCompresion) {
    if (p.duracionAntes <= mejor.duracion) break;
    for (const id of p.acortadas) duracionesOptimas[id] = (duracionesOptimas[id] ?? 0) - 1;
  }

  if (usoHeuristica) {
    diagnosticos.push(
      aviso(
        'CRASH_HEURISTICA',
        `En algún paso hubo más de ${TOPE_EXACTO} actividades críticas comprimibles a la vez y la elección se hizo ` +
          'con una heurística voraz: el resultado es una buena compresión, pero no está garantizado que sea la más ' +
          'barata. Queda declarado.',
      ),
    );
  }

  if (cortoPorTope) {
    diagnosticos.push(
      aviso('CRASH_TOPE_PASOS', 'La compresión se detuvo por el tope de pasos. Revise las duraciones del enunciado.'),
    );
  }

  if (d.costoIndirectoPorPeriodo === 0) {
    diagnosticos.push(
      nota(
        'CRASH_SIN_INDIRECTO',
        'Sin costo indirecto por periodo, comprimir solo encarece el proyecto: el costo total mínimo es siempre el de ' +
          'la duración normal. El costo indirecto es lo que hace que valga la pena terminar antes.',
      ),
    );
  }

  const duracionMinima = curva.at(-1)!.duracion;

  if (d.duracionObjetivo != null && duracionMinima > d.duracionObjetivo) {
    diagnosticos.push(
      aviso(
        'CRASH_OBJETIVO_INALCANZABLE',
        `No se puede bajar de ${formatearNumero(duracionMinima)} ${d.unidadTiempo}: aunque se acelere todo lo ` +
          `acelerable, la meta de ${formatearNumero(d.duracionObjetivo)} queda fuera de alcance.`,
      ),
    );
  }

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Calcular la pendiente de costo de cada actividad',
    explicacion:
      'La pendiente dice cuánto cuesta ganar un periodo en esa actividad. Es la diferencia de costo repartida entre ' +
      'los periodos que se pueden ganar, y es el precio que hay que comparar a la hora de decidir qué acortar.',
    formula: 'S_i = \\frac{C_a - C_n}{D_n - D_a}',
    tabla: {
      encabezados: [
        'Actividad',
        `Normal (${d.unidadTiempo})`,
        `Acelerada (${d.unidadTiempo})`,
        `Costo normal (${simbolo})`,
        `Costo acelerado (${simbolo})`,
        `Pendiente (${simbolo}/${d.unidadTiempo})`,
      ],
      filas: pendientes.map((p) => [
        p.id,
        formatearNumero(p.duracionNormal),
        formatearNumero(p.duracionAcelerada),
        formatearNumero(p.costoNormal),
        formatearNumero(p.costoAcelerado),
        p.pendiente === null ? 'no se puede acortar' : formatearNumero(p.pendiente),
      ]),
      pie: ['Total', '', '', formatearNumero(costoDirectoNormal), '', ''],
    },
  });

  pasos.agregar({
    titulo: 'Situación de partida',
    explicacion:
      `Con las duraciones normales el proyecto dura ${formatearNumero(duracionNormal)} ${d.unidadTiempo}, cuesta ` +
      `${simbolo} ${formatearNumero(costoDirectoNormal)} de costo directo y ` +
      `${simbolo} ${formatearNumero(d.costoIndirectoPorPeriodo * duracionNormal)} de costo indirecto.`,
    formula: 'C_T = C_D + c_i \\times D',
    valor: costoTotalDe(duracionNormal, costoDirectoNormal),
    unidad: simbolo,
  });

  if (pasosCompresion.length > 0) {
    pasos.agregar({
      titulo: 'Comprimir un periodo a la vez',
      explicacion:
        'En cada paso se acorta la combinación más barata que reduce **todas** las rutas críticas a la vez, y se ' +
        'vuelve a resolver la red: comprimir cambia qué actividades son críticas, y decidir sobre la ruta vieja lleva ' +
        'a pagar por acortar un camino que ya no manda.',
      tabla: {
        encabezados: [
          'Paso',
          `Duración (${d.unidadTiempo})`,
          'Se acorta',
          `Costo del paso (${simbolo})`,
          `Directo (${simbolo})`,
          `Indirecto (${simbolo})`,
          `Total (${simbolo})`,
        ],
        filas: pasosCompresion.map((p) => [
          String(p.numero),
          `${formatearNumero(p.duracionAntes)} → ${formatearNumero(p.duracionDespues)}`,
          p.acortadas.join(', '),
          formatearNumero(p.costoDelPaso),
          formatearNumero(p.costoDirecto),
          formatearNumero(p.costoIndirecto),
          formatearNumero(p.costoTotal),
        ]),
        pieAdicional: [
          'Al comprimir aparecen rutas críticas nuevas: la red se resuelve otra vez antes de cada paso.',
        ],
      },
    });
  }

  pasos.agregar({
    titulo: 'Elegir la duración de costo total mínimo',
    explicacion:
      'El costo directo sube al comprimir y el indirecto baja. El total tiene un mínimo, y ahí está la decisión: ' +
      `conviene terminar en ${formatearNumero(mejor.duracion)} ${d.unidadTiempo}, no en la duración normal ni en la ` +
      'mínima alcanzable.',
    formula: '\\min_D \\; C_D(D) + c_i \\times D',
    valor: mejor.total,
    unidad: simbolo,
    tabla: {
      encabezados: [`Duración (${d.unidadTiempo})`, `Directo (${simbolo})`, `Indirecto (${simbolo})`, `Total (${simbolo})`],
      filas: curva.map((c) => [
        formatearNumero(c.duracion),
        formatearNumero(c.directo),
        formatearNumero(c.indirecto),
        `${formatearNumero(c.total)}${c.duracion === mejor.duracion ? '  ←' : ''}`,
      ]),
    },
  });

  const ahorro = costoTotalDe(duracionNormal, costoDirectoNormal) - mejor.total;
  const interpretacion =
    ahorro > 0
      ? `Comprimir el proyecto de ${formatearNumero(duracionNormal)} a ${formatearNumero(mejor.duracion)} ` +
        `${d.unidadTiempo} cuesta ${simbolo} ${formatearNumero(mejor.directo - costoDirectoNormal)} más en costo ` +
        `directo, pero ahorra ${simbolo} ${formatearNumero(d.costoIndirectoPorPeriodo * (duracionNormal - mejor.duracion))} ` +
        `de costo indirecto: el balance deja ${simbolo} ${formatearNumero(ahorro)} a favor. Acortar más allá de ` +
        `${formatearNumero(mejor.duracion)} ${d.unidadTiempo} ya no se paga solo.`
      : `No conviene comprimir: cada periodo que se gana cuesta más de lo que ahorra en costo indirecto. La duración ` +
        `normal de ${formatearNumero(duracionNormal)} ${d.unidadTiempo} es la de costo total mínimo, ` +
        `${simbolo} ${formatearNumero(mejor.total)}.`;

  return {
    datos: {
      moneda: d.moneda,
      unidadTiempo: d.unidadTiempo,
      pendientes,
      duracionNormal,
      duracionMinima,
      costoDirectoNormal,
      costoIndirectoPorPeriodo: d.costoIndirectoPorPeriodo,
      pasos: pasosCompresion,
      curva,
      duracionOptima: mejor.duracion,
      costoTotalOptimo: mejor.total,
      costoTotalNormal: costoTotalDe(duracionNormal, costoDirectoNormal),
      duracionesOptimas,
      usoHeuristica,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion,
  };
}

/** Cierto cuando el ejercicio trae los datos necesarios para comprimir. */
export function admiteCompresion(actividades: readonly ActividadComprimible[]): boolean {
  return actividades.some((a) => pendienteDe(a) !== null);
}
