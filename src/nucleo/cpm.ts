/**
 * Módulo 6 — Diagramas de red y ruta crítica (CPM).
 *
 * Ordenamiento topológico, recorrido hacia adelante y hacia atrás, holgura
 * total y libre, rutas críticas (todas, no solo una) y análisis de retrasos.
 * También construye la representación de actividades en flechas (AOA) con las
 * actividades ficticias que hagan falta.
 */

import { formatearNumero, singular } from './numero';
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

export interface Actividad {
  readonly id: string;
  readonly descripcion: string;
  readonly predecesoras: readonly string[];
  readonly duracion: number;
}

export interface DatosCPM {
  readonly titulo: string;
  readonly actividades: readonly Actividad[];
  readonly unidadTiempo: string;
}

export interface ActividadCalculada {
  readonly actividad: Actividad;
  /** Inicio temprano (early start). */
  readonly it: number;
  /** Terminación temprana (early finish). */
  readonly tt: number;
  /** Inicio tardío (late start). */
  readonly il: number;
  /** Terminación tardía (late finish). */
  readonly tl: number;
  /** Holgura total: cuánto puede retrasarse sin atrasar el proyecto. */
  readonly holguraTotal: number;
  /** Holgura libre: cuánto puede retrasarse sin atrasar a ninguna sucesora. */
  readonly holguraLibre: number;
  readonly critica: boolean;
  readonly sucesoras: readonly string[];
  /** Capa del diagrama: 0 para las que no tienen predecesoras. */
  readonly capa: number;
}

export interface RutaCritica {
  readonly actividades: readonly string[];
  readonly duracion: number;
}

export interface ResultadoCPM {
  readonly calculadas: readonly ActividadCalculada[];
  readonly orden: readonly string[];
  readonly duracionProyecto: number;
  readonly rutasCriticas: readonly RutaCritica[];
  readonly unidadTiempo: string;
  readonly capas: readonly (readonly string[])[];
}

// ───────────────────────────── Validación y orden ─────────────────────────────

interface Grafo {
  readonly mapa: ReadonlyMap<string, Actividad>;
  readonly sucesoras: ReadonlyMap<string, string[]>;
}

function construirGrafo(actividades: readonly Actividad[]): Grafo {
  const mapa = new Map<string, Actividad>();
  for (const a of actividades) mapa.set(a.id, a);

  const sucesoras = new Map<string, string[]>();
  for (const a of actividades) sucesoras.set(a.id, []);
  for (const a of actividades) {
    for (const p of a.predecesoras) {
      sucesoras.get(p)?.push(a.id);
    }
  }
  return { mapa, sucesoras };
}

function validar(datos: DatosCPM): Diagnostico[] {
  const d: Diagnostico[] = [];
  const { actividades } = datos;

  if (actividades.length === 0) {
    d.push(error('CPM_SIN_ACTIVIDADES', 'El proyecto no tiene actividades.'));
    return d;
  }

  const vistos = new Set<string>();
  for (const a of actividades) {
    if (vistos.has(a.id)) {
      d.push(error('CPM_ID_DUPLICADO', `La actividad "${a.id}" está repetida. Cada actividad necesita un identificador único.`, a.id));
    }
    vistos.add(a.id);

    if (a.duracion < 0) {
      d.push(error('CPM_DURACION_NEGATIVA', `La actividad "${a.id}" tiene duración negativa.`, a.id));
    }
    if (a.duracion === 0) {
      d.push(nota('CPM_DURACION_CERO', `La actividad "${a.id}" tiene duración cero: se comporta como un hito, no consume tiempo.`, a.id));
    }
    if (a.predecesoras.includes(a.id)) {
      d.push(error('CPM_AUTOPREDECESORA', `La actividad "${a.id}" se declara predecesora de sí misma.`, a.id));
    }
  }

  for (const a of actividades) {
    for (const p of a.predecesoras) {
      if (!vistos.has(p)) {
        d.push(error('CPM_PREDECESORA_INEXISTENTE', `La actividad "${a.id}" declara como predecesora a "${p}", que no existe en la lista.`, a.id));
      }
    }
    if (new Set(a.predecesoras).size !== a.predecesoras.length) {
      d.push(aviso('CPM_PREDECESORA_REPETIDA', `La actividad "${a.id}" repite una predecesora. Se ignora la repetición.`, a.id));
    }
  }

  return d;
}

/**
 * Ordenamiento topológico por el algoritmo de Kahn. Devuelve `null` si hay
 * ciclo, junto con las actividades atrapadas en él.
 */
export function ordenTopologico(
  actividades: readonly Actividad[],
): { orden: string[] } | { ciclo: string[] } {
  const gradoEntrada = new Map<string, number>();
  const existentes = new Set(actividades.map((a) => a.id));

  for (const a of actividades) {
    const validas = [...new Set(a.predecesoras)].filter((p) => existentes.has(p));
    gradoEntrada.set(a.id, validas.length);
  }

  const { sucesoras } = construirGrafo(actividades);
  const cola = actividades.filter((a) => (gradoEntrada.get(a.id) ?? 0) === 0).map((a) => a.id).sort();
  const orden: string[] = [];

  while (cola.length > 0) {
    const id = cola.shift()!;
    orden.push(id);
    for (const s of sucesoras.get(id) ?? []) {
      const g = (gradoEntrada.get(s) ?? 0) - 1;
      gradoEntrada.set(s, g);
      if (g === 0) {
        cola.push(s);
        cola.sort();
      }
    }
  }

  if (orden.length !== actividades.length) {
    const ciclo = actividades.map((a) => a.id).filter((id) => !orden.includes(id));
    return { ciclo };
  }
  return { orden };
}

// ───────────────────────────── Solución ─────────────────────────────

export function resolverCPM(datos: DatosCPM): Resultado<ResultadoCPM> {
  const diagnosticos = validar(datos);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const orden = ordenTopologico(datos.actividades);
  if ('ciclo' in orden) {
    return resultadoFallido([
      ...diagnosticos,
      error(
        'CPM_CICLO',
        `La red contiene un ciclo: las actividades ${orden.ciclo.join(', ')} dependen unas de otras en círculo. ` +
          'Un proyecto no puede tener una actividad que dependa, directa o indirectamente, de sí misma.',
      ),
    ]);
  }

  const { mapa, sucesoras } = construirGrafo(datos.actividades);
  const secuencia = orden.orden;

  // Recorrido hacia adelante: lo más pronto que puede empezar y terminar cada actividad.
  const it = new Map<string, number>();
  const tt = new Map<string, number>();
  for (const id of secuencia) {
    const a = mapa.get(id)!;
    const preds = [...new Set(a.predecesoras)].filter((p) => mapa.has(p));
    const inicio = preds.length === 0 ? 0 : Math.max(...preds.map((p) => tt.get(p) ?? 0));
    it.set(id, inicio);
    tt.set(id, inicio + a.duracion);
  }

  const duracionProyecto = secuencia.length === 0 ? 0 : Math.max(...secuencia.map((id) => tt.get(id) ?? 0));

  // Recorrido hacia atrás: lo más tarde que puede terminar sin atrasar el proyecto.
  const tl = new Map<string, number>();
  const il = new Map<string, number>();
  for (const id of [...secuencia].reverse()) {
    const a = mapa.get(id)!;
    const sucs = sucesoras.get(id) ?? [];
    const fin = sucs.length === 0 ? duracionProyecto : Math.min(...sucs.map((s) => il.get(s) ?? duracionProyecto));
    tl.set(id, fin);
    il.set(id, fin - a.duracion);
  }

  // Capas para dibujar el diagrama: la capa es la profundidad máxima desde el inicio.
  const capa = new Map<string, number>();
  for (const id of secuencia) {
    const a = mapa.get(id)!;
    const preds = [...new Set(a.predecesoras)].filter((p) => mapa.has(p));
    capa.set(id, preds.length === 0 ? 0 : Math.max(...preds.map((p) => (capa.get(p) ?? 0) + 1)));
  }

  const calculadas: ActividadCalculada[] = secuencia.map((id) => {
    const a = mapa.get(id)!;
    const sucs = sucesoras.get(id) ?? [];
    const holguraTotal = (il.get(id) ?? 0) - (it.get(id) ?? 0);
    const menorInicioSucesoras = sucs.length === 0 ? duracionProyecto : Math.min(...sucs.map((s) => it.get(s) ?? 0));
    return {
      actividad: a,
      it: it.get(id) ?? 0,
      tt: tt.get(id) ?? 0,
      il: il.get(id) ?? 0,
      tl: tl.get(id) ?? 0,
      holguraTotal,
      holguraLibre: menorInicioSucesoras - (tt.get(id) ?? 0),
      critica: Math.abs(holguraTotal) < 1e-9,
      sucesoras: sucs,
      capa: capa.get(id) ?? 0,
    };
  });

  const rutasCriticas = enumerarRutasCriticas(calculadas, sucesoras);

  if (rutasCriticas.length > 1) {
    diagnosticos.push(
      aviso(
        'CPM_RUTAS_MULTIPLES',
        `El proyecto tiene ${rutasCriticas.length} rutas críticas simultáneas. Retrasar cualquier actividad de cualquiera de ellas atrasa el proyecto completo, ` +
          'y acelerar una sola ruta no acorta la duración: hay que acortarlas todas a la vez.',
      ),
    );
  }

  const desconectadas = calculadas.filter(
    (c) => c.actividad.predecesoras.length === 0 && (sucesoras.get(c.actividad.id) ?? []).length === 0,
  );
  if (desconectadas.length > 0 && calculadas.length > 1) {
    diagnosticos.push(
      aviso(
        'CPM_DESCONECTADA',
        `${desconectadas.map((c) => c.actividad.id).join(', ')} no ${desconectadas.length === 1 ? 'tiene' : 'tienen'} predecesoras ni sucesoras: ${desconectadas.length === 1 ? 'queda aislada' : 'quedan aisladas'} del resto de la red. Verifique si falta declarar una dependencia.`,
      ),
    );
  }

  const capasArr: string[][] = [];
  for (const c of calculadas) {
    (capasArr[c.capa] ??= []).push(c.actividad.id);
  }

  const pasos = construirPasosCPM(datos, calculadas, secuencia, duracionProyecto, rutasCriticas);

  return {
    datos: {
      calculadas,
      orden: secuencia,
      duracionProyecto,
      rutasCriticas,
      unidadTiempo: datos.unidadTiempo,
      capas: capasArr.map((c) => c ?? []),
    },
    pasos,
    diagnosticos,
    interpretacion: interpretarCPM(datos, calculadas, duracionProyecto, rutasCriticas),
  };
}

/** Enumera todas las rutas formadas exclusivamente por actividades críticas. */
function enumerarRutasCriticas(
  calculadas: readonly ActividadCalculada[],
  sucesoras: ReadonlyMap<string, string[]>,
  limite = 50,
): RutaCritica[] {
  const criticas = new Map(calculadas.filter((c) => c.critica).map((c) => [c.actividad.id, c]));
  const inicios = [...criticas.values()].filter(
    (c) => !c.actividad.predecesoras.some((p) => criticas.has(p)),
  );

  const rutas: RutaCritica[] = [];

  const caminar = (id: string, camino: string[]): void => {
    if (rutas.length >= limite) return;
    const nuevo = [...camino, id];
    const siguientes = (sucesoras.get(id) ?? []).filter((s) => criticas.has(s));

    if (siguientes.length === 0) {
      const duracion = nuevo.reduce((s, x) => s + (criticas.get(x)?.actividad.duracion ?? 0), 0);
      rutas.push({ actividades: nuevo, duracion });
      return;
    }
    for (const s of siguientes) caminar(s, nuevo);
  };

  for (const inicio of inicios) caminar(inicio.actividad.id, []);
  return rutas;
}

function construirPasosCPM(
  datos: DatosCPM,
  calculadas: readonly ActividadCalculada[],
  orden: readonly string[],
  duracion: number,
  rutas: readonly RutaCritica[],
): readonly import('./tipos').Paso[] {
  const u = datos.unidadTiempo;
  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Ordenar las actividades',
    explicacion:
      'Antes de calcular hay que poner las actividades en un orden en el que ninguna aparezca antes que sus predecesoras. ' +
      'Ese ordenamiento topológico garantiza que, al llegar a una actividad, ya se conozcan los tiempos de todo lo que debe ocurrir antes.',
    tabla: {
      encabezados: ['Orden', 'Actividad', 'Descripción', 'Predecesoras', `Duración (${u})`],
      filas: orden.map((id, i) => {
        const c = calculadas.find((x) => x.actividad.id === id)!;
        return [
          String(i + 1),
          id,
          c.actividad.descripcion,
          c.actividad.predecesoras.length === 0 ? '—' : c.actividad.predecesoras.join(', '),
          formatearNumero(c.actividad.duracion, { decimales: 2 }),
        ];
      }),
    },
  });

  pasos.agregar({
    titulo: 'Recorrido hacia adelante',
    explicacion:
      'Se avanza desde el inicio. El inicio temprano de una actividad es la mayor de las terminaciones tempranas de sus predecesoras: ' +
      'hay que esperar a que termine la última. La terminación temprana es ese inicio más la duración.',
    formula: 'IT_j = \\max_{i \\to j} (TT_i) \\qquad TT_j = IT_j + d_j',
    tabla: {
      encabezados: ['Actividad', 'Predecesoras', `Duración`, 'IT', 'TT'],
      filas: orden.map((id) => {
        const c = calculadas.find((x) => x.actividad.id === id)!;
        return [
          id,
          c.actividad.predecesoras.length === 0 ? '—' : c.actividad.predecesoras.join(', '),
          formatearNumero(c.actividad.duracion, { decimales: 2 }),
          formatearNumero(c.it, { decimales: 2 }),
          formatearNumero(c.tt, { decimales: 2 }),
        ];
      }),
    },
    valor: duracion,
    unidad: u,
  });

  pasos.agregar({
    titulo: 'Recorrido hacia atrás',
    explicacion:
      `Se retrocede desde el final, partiendo de la duración total del proyecto (${formatearNumero(duracion, { decimales: 2 })} ${u}). ` +
      'La terminación tardía de una actividad es el menor de los inicios tardíos de sus sucesoras: no puede terminar después de que la primera de ellas deba empezar.',
    formula: 'TL_i = \\min_{i \\to j} (IL_j) \\qquad IL_i = TL_i - d_i',
    tabla: {
      encabezados: ['Actividad', 'Sucesoras', 'TL', 'IL'],
      filas: [...orden].reverse().map((id) => {
        const c = calculadas.find((x) => x.actividad.id === id)!;
        return [
          id,
          c.sucesoras.length === 0 ? '— (fin)' : c.sucesoras.join(', '),
          formatearNumero(c.tl, { decimales: 2 }),
          formatearNumero(c.il, { decimales: 2 }),
        ];
      }),
    },
  });

  pasos.agregar({
    titulo: 'Calcular holguras e identificar la ruta crítica',
    explicacion:
      'La holgura total es la diferencia entre el inicio tardío y el temprano: cuánto puede demorarse una actividad sin atrasar el proyecto. ' +
      'Las actividades con holgura cero forman la ruta crítica. La holgura libre, en cambio, es cuánto puede demorarse sin atrasar a ninguna sucesora, ' +
      'y siempre es menor o igual que la total.',
    formula: 'H_i = IL_i - IT_i = TL_i - TT_i',
    tabla: {
      encabezados: ['Actividad', 'IT', 'TT', 'IL', 'TL', 'Holgura total', 'Holgura libre', '¿Crítica?'],
      filas: orden.map((id) => {
        const c = calculadas.find((x) => x.actividad.id === id)!;
        return [
          id,
          formatearNumero(c.it, { decimales: 2 }),
          formatearNumero(c.tt, { decimales: 2 }),
          formatearNumero(c.il, { decimales: 2 }),
          formatearNumero(c.tl, { decimales: 2 }),
          formatearNumero(c.holguraTotal, { decimales: 2 }),
          formatearNumero(c.holguraLibre, { decimales: 2 }),
          c.critica ? 'Sí' : 'No',
        ];
      }),
      resaltadas: orden.map((id, i) => (calculadas.find((x) => x.actividad.id === id)?.critica ? i : -1)).filter((i) => i >= 0),
    },
  });

  pasos.agregar({
    titulo: rutas.length === 1 ? 'La ruta crítica' : `Las ${rutas.length} rutas críticas`,
    explicacion:
      'La ruta crítica es la cadena de actividades sin holgura que va del inicio al fin. Su duración *es* la duración del proyecto. ' +
      'Acortar el proyecto exige acortar actividades de la ruta crítica; acelerar cualquier otra solo aumenta su holgura.',
    tabla: {
      encabezados: ['Ruta', 'Secuencia', `Duración (${u})`],
      filas: rutas.map((r, i) => [String(i + 1), r.actividades.join(' → '), formatearNumero(r.duracion, { decimales: 2 })]),
      resaltadas: rutas.map((_, i) => i),
    },
    valor: duracion,
    unidad: u,
  });

  return pasos.listar();
}

function interpretarCPM(
  datos: DatosCPM,
  calculadas: readonly ActividadCalculada[],
  duracion: number,
  rutas: readonly RutaCritica[],
): string {
  const u = datos.unidadTiempo;
  const criticas = calculadas.filter((c) => c.critica);
  const conHolgura = calculadas.filter((c) => !c.critica);
  const mayorHolgura = [...conHolgura].sort((a, b) => b.holguraTotal - a.holguraTotal)[0];

  const partes: string[] = [];

  partes.push(
    `El proyecto no puede terminar antes de ${formatearNumero(duracion, { decimales: 2 })} ${u}, ` +
      `y esa duración la fija${rutas.length === 1 ? '' : 'n'} ${rutas.length === 1 ? 'la ruta' : 'las rutas'} ${rutas.map((r) => r.actividades.join('–')).join(' y ')}.`,
  );

  partes.push(
    `${criticas.length} de las ${calculadas.length} actividades son críticas: no tienen ni un ${singular(u)} de margen. ` +
      'Son las que el gerente de proyecto debe vigilar a diario.',
  );

  if (mayorHolgura) {
    partes.push(
      `En el otro extremo, ${mayorHolgura.actividad.id} (${mayorHolgura.actividad.descripcion.toLowerCase()}) tiene ` +
        `${formatearNumero(mayorHolgura.holguraTotal, { decimales: 0 })} ${u} de holgura: puede demorarse ese tiempo sin consecuencias, ` +
        'y sus recursos podrían reasignarse temporalmente a la ruta crítica sin poner en riesgo la fecha final.',
    );
  }

  if (rutas.length > 1) {
    partes.push(
      'Cuidado con las rutas críticas múltiples: acortar solo una de ellas no adelanta el proyecto ni un día, porque la otra sigue mandando.',
    );
  }

  return partes.join(' ');
}

// ───────────────────────────── Análisis de retrasos ─────────────────────────────

export interface AnalisisRetraso {
  readonly actividadId: string;
  readonly retraso: number;
  readonly duracionOriginal: number;
  readonly duracionNueva: number;
  readonly impacto: number;
  readonly holguraDisponible: number;
  readonly absorbido: boolean;
  readonly nuevasRutasCriticas: readonly RutaCritica[];
  readonly explicacion: string;
}

/**
 * Responde la pregunta clásica de clase: «¿qué pasa si la actividad G se
 * retrasa un día?». Recalcula la red completa y compara.
 */
export function analizarRetraso(
  datos: DatosCPM,
  actividadId: string,
  retraso: number,
): Resultado<AnalisisRetraso> {
  const base = resolverCPM(datos);
  if (base.datos === null) return resultadoFallido(base.diagnosticos);

  const original = base.datos.calculadas.find((c) => c.actividad.id === actividadId);
  if (!original) {
    return resultadoFallido([error('CPM_ACTIVIDAD_INEXISTENTE', `No existe la actividad "${actividadId}".`)]);
  }

  const modificado: DatosCPM = {
    ...datos,
    actividades: datos.actividades.map((a) =>
      a.id === actividadId ? { ...a, duracion: a.duracion + retraso } : a,
    ),
  };
  const nuevo = resolverCPM(modificado);
  if (nuevo.datos === null) return resultadoFallido(nuevo.diagnosticos);

  const impacto = nuevo.datos.duracionProyecto - base.datos.duracionProyecto;
  const u = datos.unidadTiempo;
  const absorbido = impacto === 0;

  const explicacion = absorbido
    ? `El retraso se absorbe por completo. ${actividadId} tenía ${formatearNumero(original.holguraTotal, { decimales: 0 })} ${u} de holgura total, ` +
      `y el retraso de ${formatearNumero(retraso, { decimales: 0 })} ${u} cabe dentro de ese margen. El proyecto sigue terminando en ` +
      `${formatearNumero(base.datos.duracionProyecto, { decimales: 2 })} ${u}. ` +
      `Eso sí, la holgura restante baja a ${formatearNumero(original.holguraTotal - retraso, { decimales: 0 })} ${u}: el colchón se consumió.`
    : `El proyecto se atrasa ${formatearNumero(impacto, { decimales: 2 })} ${u}, de ${formatearNumero(base.datos.duracionProyecto, { decimales: 2 })} a ` +
      `${formatearNumero(nuevo.datos.duracionProyecto, { decimales: 2 })} ${u}. ` +
      (original.critica
        ? `${actividadId} era crítica: no tenía holgura, así que cada ${singular(u)} de retraso se traslada íntegro a la fecha final.`
        : `${actividadId} tenía ${formatearNumero(original.holguraTotal, { decimales: 0 })} ${u} de holgura, que el retraso agotó; el exceso empujó la fecha final.`) +
      (nuevo.datos.rutasCriticas.length !== base.datos.rutasCriticas.length
        ? ' Además cambió la estructura de rutas críticas: la red ahora se tensa por otro lado.'
        : '');

  const pasos = new ConstructorPasos();
  pasos.agregar({
    titulo: `Comparar la red antes y después del retraso de ${actividadId}`,
    explicacion:
      'La comparación se hace recalculando la red completa, no estimando. Un retraso puede no tener efecto, tenerlo parcialmente ' +
      '(si la holgura lo absorbe en parte) o trasladarse íntegro a la fecha final.',
    tabla: {
      encabezados: ['Concepto', 'Antes', 'Después', 'Diferencia'],
      filas: [
        [
          `Duración de ${actividadId}`,
          formatearNumero(original.actividad.duracion, { decimales: 2 }),
          formatearNumero(original.actividad.duracion + retraso, { decimales: 2 }),
          formatearNumero(retraso, { decimales: 2, signoExplicito: true }),
        ],
        [
          'Duración del proyecto',
          formatearNumero(base.datos.duracionProyecto, { decimales: 2 }),
          formatearNumero(nuevo.datos.duracionProyecto, { decimales: 2 }),
          formatearNumero(impacto, { decimales: 2, signoExplicito: true }),
        ],
        [
          'Rutas críticas',
          String(base.datos.rutasCriticas.length),
          String(nuevo.datos.rutasCriticas.length),
          '',
        ],
        [
          `Holgura de ${actividadId}`,
          formatearNumero(original.holguraTotal, { decimales: 2 }),
          formatearNumero(
            nuevo.datos.calculadas.find((c) => c.actividad.id === actividadId)?.holguraTotal ?? 0,
            { decimales: 2 },
          ),
          '',
        ],
      ],
    },
    valor: impacto,
    unidad: u,
  });

  return {
    datos: {
      actividadId,
      retraso,
      duracionOriginal: base.datos.duracionProyecto,
      duracionNueva: nuevo.datos.duracionProyecto,
      impacto,
      holguraDisponible: original.holguraTotal,
      absorbido,
      nuevasRutasCriticas: nuevo.datos.rutasCriticas,
      explicacion,
    },
    pasos: pasos.listar(),
    diagnosticos: [
      absorbido
        ? nota('CPM_RETRASO_ABSORBIDO', 'El retraso no afecta la fecha de entrega.')
        : aviso('CPM_RETRASO_IMPACTA', `El retraso empuja la fecha de entrega ${formatearNumero(impacto, { decimales: 2 })} ${u}.`),
    ],
    interpretacion: explicacion,
  };
}

// ───────────────────────────── Actividades en flechas (AOA) ─────────────────────────────

export interface ArcoAOA {
  readonly id: string;
  readonly desde: number;
  readonly hasta: number;
  readonly ficticia: boolean;
  readonly duracion: number;
  readonly etiqueta: string;
}

export interface RedAOA {
  readonly eventos: readonly number[];
  readonly arcos: readonly ArcoAOA[];
  readonly cantidadFicticias: number;
}

/**
 * Construye la representación de actividades en flechas.
 *
 * Cada actividad recibe un evento de terminación propio; las actividades que
 * comparten exactamente el mismo conjunto de predecesoras comparten evento de
 * inicio. Cuando una actividad alimenta varios conjuntos distintos de
 * sucesoras hacen falta arcos ficticios, que se dibujan punteados y no
 * consumen tiempo.
 */
export function construirAOA(actividades: readonly Actividad[]): RedAOA {
  const existentes = new Set(actividades.map((a) => a.id));
  const clave = (preds: readonly string[]): string =>
    [...new Set(preds)].filter((p) => existentes.has(p)).sort().join('|');

  let siguienteEvento = 0;
  const nuevoEvento = (): number => siguienteEvento++;

  // Un evento por cada conjunto distinto de predecesoras (incluido el vacío = inicio).
  const eventoDeConjunto = new Map<string, number>();
  for (const a of actividades) {
    const k = clave(a.predecesoras);
    if (!eventoDeConjunto.has(k)) eventoDeConjunto.set(k, nuevoEvento());
  }

  // Un evento de terminación por actividad.
  const eventoFin = new Map<string, number>();
  for (const a of actividades) eventoFin.set(a.id, nuevoEvento());

  const arcos: ArcoAOA[] = [];

  for (const a of actividades) {
    arcos.push({
      id: a.id,
      desde: eventoDeConjunto.get(clave(a.predecesoras))!,
      hasta: eventoFin.get(a.id)!,
      ficticia: false,
      duracion: a.duracion,
      etiqueta: `${a.id} (${a.duracion})`,
    });
  }

  // Arcos ficticios: del fin de cada actividad al evento de cada conjunto que la contiene.
  let ficticia = 0;
  for (const [k, evento] of eventoDeConjunto) {
    if (k === '') continue;
    for (const p of k.split('|')) {
      const origen = eventoFin.get(p);
      if (origen === undefined || origen === evento) continue;
      arcos.push({
        id: `f${++ficticia}`,
        desde: origen,
        hasta: evento,
        ficticia: true,
        duracion: 0,
        etiqueta: 'ficticia',
      });
    }
  }

  // Evento final único: recoge todas las actividades sin sucesoras.
  const conSucesoras = new Set(actividades.flatMap((a) => [...new Set(a.predecesoras)]));
  const finales = actividades.filter((a) => !conSucesoras.has(a.id));
  if (finales.length > 1) {
    const fin = nuevoEvento();
    for (const a of finales) {
      arcos.push({
        id: `f${++ficticia}`,
        desde: eventoFin.get(a.id)!,
        hasta: fin,
        ficticia: true,
        duracion: 0,
        etiqueta: 'ficticia',
      });
    }
  }

  return {
    eventos: Array.from({ length: siguienteEvento }, (_, i) => i),
    arcos,
    cantidadFicticias: ficticia,
  };
}
