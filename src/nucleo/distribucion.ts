/**
 * Módulo 4 — Distribución física de instalaciones.
 *
 * Plano de bloques, matriz de recorridos (desde-hacia), puntaje
 * carga-distancia con distancias rectilíneas, gráfica REL con clasificaciones
 * de proximidad y comparación entre la distribución actual y la propuesta.
 */

import { formatearNumero, sumaExacta } from './numero';
import {
  ConstructorPasos,
  aviso,
  distancia,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Punto,
  type Resultado,
  type TipoDistancia,
} from './tipos';

export interface Departamento {
  readonly id: string;
  readonly nombre: string;
  /** Cuántos bloques de la retícula necesita ocupar. */
  readonly bloques: number;
  /** Marca a la plataforma de carga, el pasillo o cualquier punto fijo. */
  readonly fijo?: boolean;
}

export interface CeldaPlano {
  readonly fila: number;
  readonly columna: number;
}

export interface PlanoBloques {
  readonly id: string;
  readonly nombre: string;
  readonly filas: number;
  readonly columnas: number;
  /** Celdas que ocupa cada departamento, por id. */
  readonly asignacion: Readonly<Record<string, readonly CeldaPlano[]>>;
}

/** Clasificaciones de proximidad de la gráfica REL. */
export type ClasificacionREL = 'A' | 'E' | 'I' | 'O' | 'S' | 'N';

export const DEFINICION_REL: Record<ClasificacionREL, string> = {
  A: 'Absolutamente necesario',
  E: 'Especialmente importante',
  I: 'Importante',
  O: 'Proximidad ordinaria',
  S: 'Sin importancia',
  N: 'No deseable',
};

/** Distancia máxima aceptable, en bloques, para cada clasificación. */
const DISTANCIA_ACEPTABLE: Record<ClasificacionREL, { maxima: number | null; minima: number | null }> = {
  A: { maxima: 1, minima: null },
  E: { maxima: 2, minima: null },
  I: { maxima: 3, minima: null },
  O: { maxima: null, minima: null },
  S: { maxima: null, minima: null },
  N: { maxima: null, minima: 2 },
};

export const CLAVES_REL: Record<number, string> = {
  1: 'Manejo de materiales',
  2: 'Personal compartido',
  3: 'Facilidad de supervisión',
  4: 'Utilización del espacio',
  5: 'Ruido',
  6: 'Actitudes del empleado',
};

export interface RelacionREL {
  readonly desde: string;
  readonly hasta: string;
  readonly clasificacion: ClasificacionREL;
  /** Claves explicativas que justifican la clasificación. */
  readonly claves: readonly number[];
}

export interface DatosDistribucion {
  readonly titulo: string;
  readonly departamentos: readonly Departamento[];
  /**
   * Recorridos entre departamentos. El puntaje suma `recorridos[i][j]` y
   * `recorridos[j][i]`, así que cada par se anota **una sola vez**, en la mitad
   * que se prefiera. Llenar las dos mitades con el mismo número duplica la carga.
   */
  readonly recorridos: readonly (readonly number[])[];
  readonly plano: PlanoBloques;
  readonly tipoDistancia: TipoDistancia;
  readonly relaciones: readonly RelacionREL[];
  readonly unidadRecorridos: string;
}

export interface ParDistribucion {
  readonly desdeId: string;
  readonly hastaId: string;
  readonly nombreDesde: string;
  readonly nombreHasta: string;
  readonly recorridos: number;
  readonly distancia: number;
  readonly cargaDistancia: number;
  readonly clasificacion: ClasificacionREL | null;
}

export interface AlertaProximidad {
  readonly desde: string;
  readonly hasta: string;
  readonly clasificacion: ClasificacionREL;
  readonly distancia: number;
  readonly mensaje: string;
}

export interface ResultadoDistribucion {
  readonly plano: PlanoBloques;
  readonly pares: readonly ParDistribucion[];
  readonly puntajeCD: number;
  readonly centroides: Readonly<Record<string, Punto>>;
  readonly alertas: readonly AlertaProximidad[];
  readonly recorridosTotales: number;
  readonly distanciaMediaPonderada: number | null;
}

/** Centroide de un departamento a partir de las celdas que ocupa. */
export function centroide(celdas: readonly CeldaPlano[]): Punto {
  if (celdas.length === 0) return { x: 0, y: 0 };
  const x = sumaExacta(celdas.map((c) => c.columna)) / celdas.length;
  const y = sumaExacta(celdas.map((c) => c.fila)) / celdas.length;
  return { x, y };
}

function validar(d: DatosDistribucion): Diagnostico[] {
  const g: Diagnostico[] = [];
  const n = d.departamentos.length;

  if (n === 0) {
    g.push(error('DIST_SIN_DEPARTAMENTOS', 'No hay departamentos que distribuir.'));
    return g;
  }
  if (d.recorridos.length !== n) {
    g.push(error('DIST_MATRIZ_INCOMPLETA', `La matriz de recorridos tiene ${d.recorridos.length} filas pero hay ${n} departamentos.`));
  }
  for (let i = 0; i < d.recorridos.length; i++) {
    if (d.recorridos[i]!.length !== n) {
      g.push(error('DIST_MATRIZ_COLUMNAS', `La fila ${i + 1} de la matriz de recorridos no tiene ${n} valores.`, String(i)));
    }
    for (let j = 0; j < (d.recorridos[i]?.length ?? 0); j++) {
      if ((d.recorridos[i]![j] ?? 0) < 0) {
        g.push(error('DIST_RECORRIDO_NEGATIVO', `El recorrido entre ${d.departamentos[i]?.nombre} y ${d.departamentos[j]?.nombre} es negativo.`));
      }
    }
  }

  const celdasUsadas = new Map<string, string>();
  for (const dep of d.departamentos) {
    const celdas = d.plano.asignacion[dep.id];
    if (!celdas || celdas.length === 0) {
      g.push(error('DIST_SIN_UBICACION', `El departamento "${dep.nombre}" no tiene ubicación en el plano.`, dep.id));
      continue;
    }
    if (celdas.length !== dep.bloques) {
      g.push(
        aviso(
          'DIST_AREA_DISTINTA',
          `"${dep.nombre}" necesita ${dep.bloques} bloque(s) pero ocupa ${celdas.length} en el plano.`,
          dep.id,
        ),
      );
    }
    for (const c of celdas) {
      if (c.fila < 0 || c.fila >= d.plano.filas || c.columna < 0 || c.columna >= d.plano.columnas) {
        g.push(error('DIST_FUERA_DEL_PLANO', `"${dep.nombre}" tiene un bloque fuera de los límites del plano.`, dep.id));
      }
      const clave = `${c.fila}:${c.columna}`;
      const ocupante = celdasUsadas.get(clave);
      if (ocupante !== undefined) {
        g.push(
          error(
            'DIST_SOLAPAMIENTO',
            `El bloque (${c.fila + 1}, ${c.columna + 1}) está ocupado a la vez por "${ocupante}" y "${dep.nombre}".`,
            dep.id,
          ),
        );
      }
      celdasUsadas.set(clave, dep.nombre);
    }
  }

  return g;
}

export function resolverDistribucion(d: DatosDistribucion): Resultado<ResultadoDistribucion> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const n = d.departamentos.length;
  const centroides: Record<string, Punto> = {};
  for (const dep of d.departamentos) {
    centroides[dep.id] = centroide(d.plano.asignacion[dep.id] ?? []);
  }

  const relacionDe = (a: string, b: string): ClasificacionREL | null =>
    d.relaciones.find(
      (r) => (r.desde === a && r.hasta === b) || (r.desde === b && r.hasta === a),
    )?.clasificacion ?? null;

  const pares: ParDistribucion[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const recorridos = (d.recorridos[i]?.[j] ?? 0) + (d.recorridos[j]?.[i] ?? 0);
      if (recorridos === 0) continue;
      const a = d.departamentos[i]!;
      const b = d.departamentos[j]!;
      const dist = distancia(centroides[a.id]!, centroides[b.id]!, d.tipoDistancia);
      pares.push({
        desdeId: a.id,
        hastaId: b.id,
        nombreDesde: a.nombre,
        nombreHasta: b.nombre,
        recorridos,
        distancia: dist,
        cargaDistancia: recorridos * dist,
        clasificacion: relacionDe(a.id, b.id),
      });
    }
  }

  const puntajeCD = sumaExacta(pares.map((p) => p.cargaDistancia));
  const recorridosTotales = sumaExacta(pares.map((p) => p.recorridos));

  // Alertas de proximidad a partir de la gráfica REL.
  const alertas: AlertaProximidad[] = [];
  for (const r of d.relaciones) {
    const pa = centroides[r.desde];
    const pb = centroides[r.hasta];
    if (!pa || !pb) continue;
    const dist = distancia(pa, pb, d.tipoDistancia);
    const limite = DISTANCIA_ACEPTABLE[r.clasificacion];
    const nombreA = d.departamentos.find((x) => x.id === r.desde)?.nombre ?? r.desde;
    const nombreB = d.departamentos.find((x) => x.id === r.hasta)?.nombre ?? r.hasta;
    const motivos = r.claves.map((k) => CLAVES_REL[k] ?? `clave ${k}`).join(', ');

    if (limite.maxima !== null && dist > limite.maxima) {
      alertas.push({
        desde: r.desde,
        hasta: r.hasta,
        clasificacion: r.clasificacion,
        distancia: dist,
        mensaje:
          `${nombreA} y ${nombreB} están clasificados como «${DEFINICION_REL[r.clasificacion]}» (${r.clasificacion}) ` +
          `pero quedaron a ${formatearNumero(dist, { decimales: 2 })} bloques de distancia` +
          (motivos ? `. Motivo de la relación: ${motivos.toLowerCase()}.` : '.'),
      });
    }
    if (limite.minima !== null && dist < limite.minima) {
      alertas.push({
        desde: r.desde,
        hasta: r.hasta,
        clasificacion: r.clasificacion,
        distancia: dist,
        mensaje:
          `${nombreA} y ${nombreB} están clasificados como «No deseable» (N) y sin embargo quedaron adyacentes ` +
          `(${formatearNumero(dist, { decimales: 2 })} bloques)` +
          (motivos ? `. Motivo: ${motivos.toLowerCase()}.` : '.'),
      });
    }
  }

  for (const a of alertas) {
    diagnosticos.push(
      a.clasificacion === 'N'
        ? error('DIST_RELACION_PROHIBIDA', a.mensaje, `${a.desde}:${a.hasta}`)
        : aviso('DIST_RELACION_INCUMPLIDA', a.mensaje, `${a.desde}:${a.hasta}`),
    );
  }

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Ubicar los departamentos y calcular sus centroides',
    explicacion:
      'Cada departamento ocupa uno o varios bloques de la retícula. La distancia entre departamentos se mide entre sus centroides, ' +
      'no entre sus bordes: es la aproximación estándar y evita depender de la forma exacta del área.',
    tabla: {
      encabezados: ['Departamento', 'Bloques', 'Centroide (x, y)'],
      filas: d.departamentos.map((dep) => [
        dep.nombre,
        String((d.plano.asignacion[dep.id] ?? []).length),
        `(${formatearNumero(centroides[dep.id]!.x, { decimales: 1 })}; ${formatearNumero(centroides[dep.id]!.y, { decimales: 1 })})`,
      ]),
    },
  });

  pasos.agregar({
    titulo: 'Calcular el puntaje carga-distancia',
    explicacion:
      'Para cada par de departamentos que intercambian recorridos se multiplica la cantidad de viajes por la distancia que los separa. ' +
      'La suma es el puntaje carga-distancia del plano: representa el total de metros recorridos por el material dentro de la planta. ' +
      'Menor es mejor.',
    formula: 'cd = \\sum_{i<j} w_{ij} \\, d_{ij}',
    tabla: {
      encabezados: ['Relación', `Recorridos (${d.unidadRecorridos})`, 'Distancia', 'Carga × distancia', 'REL'],
      filas: [...pares]
        .sort((a, b) => b.cargaDistancia - a.cargaDistancia)
        .map((p) => [
          `${p.nombreDesde} ↔ ${p.nombreHasta}`,
          formatearNumero(p.recorridos, { decimales: 0 }),
          formatearNumero(p.distancia, { decimales: 2 }),
          formatearNumero(p.cargaDistancia, { decimales: 2 }),
          p.clasificacion ?? '—',
        ]),
      pie: ['Total', formatearNumero(recorridosTotales, { decimales: 0 }), '', formatearNumero(puntajeCD, { decimales: 2 }), ''],
    },
    valor: puntajeCD,
  });

  if (d.relaciones.length > 0) {
    pasos.agregar({
      titulo: 'Verificar las restricciones de proximidad (gráfica REL)',
      explicacion:
        'El puntaje carga-distancia solo cuenta viajes. La gráfica REL agrega lo que los viajes no capturan: ruido, seguridad, ' +
        'supervisión, personal compartido. Una distribución puede tener excelente puntaje y aun así ser inaceptable si pone ' +
        'la inspección junto a los tornos ruidosos.',
      tabla: {
        encabezados: ['Relación', 'Clasificación', 'Significado', 'Claves', 'Distancia', 'Estado'],
        filas: d.relaciones.map((r) => {
          const pa = centroides[r.desde];
          const pb = centroides[r.hasta];
          const dist = pa && pb ? distancia(pa, pb, d.tipoDistancia) : Number.NaN;
          const incumple = alertas.some((a) => a.desde === r.desde && a.hasta === r.hasta);
          return [
            `${d.departamentos.find((x) => x.id === r.desde)?.nombre ?? r.desde} ↔ ${d.departamentos.find((x) => x.id === r.hasta)?.nombre ?? r.hasta}`,
            r.clasificacion,
            DEFINICION_REL[r.clasificacion],
            r.claves.map((k) => CLAVES_REL[k] ?? String(k)).join(', ') || '—',
            formatearNumero(dist, { decimales: 2 }),
            incumple ? 'Incumple' : 'Cumple',
          ];
        }),
        resaltadas: d.relaciones
          .map((r, i) => (alertas.some((a) => a.desde === r.desde && a.hasta === r.hasta) ? i : -1))
          .filter((i) => i >= 0),
      },
    });
  }

  const masCostosa = [...pares].sort((a, b) => b.cargaDistancia - a.cargaDistancia)[0];

  return {
    datos: {
      plano: d.plano,
      pares,
      puntajeCD,
      centroides,
      alertas,
      recorridosTotales,
      distanciaMediaPonderada: recorridosTotales === 0 ? null : puntajeCD / recorridosTotales,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      `Esta distribución tiene un puntaje carga-distancia de ${formatearNumero(puntajeCD, { decimales: 2 })}. ` +
      (masCostosa
        ? `La relación más costosa es ${masCostosa.nombreDesde} ↔ ${masCostosa.nombreHasta}: ` +
          `${formatearNumero(masCostosa.recorridos, { decimales: 0 })} recorridos a ${formatearNumero(masCostosa.distancia, { decimales: 2 })} bloques ` +
          `aportan ${formatearNumero((masCostosa.cargaDistancia / puntajeCD) * 100, { decimales: 1 })} % del total. ` +
          'Acercar esos dos departamentos es la mejora individual de mayor impacto. '
        : '') +
      (alertas.length > 0
        ? `Hay ${alertas.length} restricción(es) de proximidad incumplida(s): una distribución con buen puntaje pero que viola una relación «No deseable» no es aceptable.`
        : 'Todas las restricciones de proximidad de la gráfica REL se respetan.'),
  };
}

// ───────────────────────────── Comparación de distribuciones ─────────────────────────────

export interface ComparacionDistribucion {
  readonly actual: ResultadoDistribucion;
  readonly propuesta: ResultadoDistribucion;
  readonly diferencia: number;
  /** Porcentaje de mejora: positivo si la propuesta reduce el puntaje. */
  readonly mejoraPorcentaje: number;
  readonly mejora: boolean;
  readonly detallePorRelacion: readonly {
    readonly relacion: string;
    readonly recorridos: number;
    readonly distanciaActual: number;
    readonly cdActual: number;
    readonly distanciaPropuesta: number;
    readonly cdPropuesta: number;
    readonly diferencia: number;
  }[];
}

/** Compara dos distribuciones ya resueltas y cuantifica la mejora. */
export function compararDistribuciones(
  actual: ResultadoDistribucion,
  propuesta: ResultadoDistribucion,
  nombreActual = 'Distribución actual',
  nombrePropuesta = 'Distribución propuesta',
): Resultado<ComparacionDistribucion> {
  const diferencia = actual.puntajeCD - propuesta.puntajeCD;
  const mejoraPorcentaje = actual.puntajeCD === 0 ? 0 : (diferencia / actual.puntajeCD) * 100;
  const mejora = diferencia > 0;

  const detallePorRelacion = actual.pares.map((pa) => {
    const pp = propuesta.pares.find(
      (x) =>
        (x.desdeId === pa.desdeId && x.hastaId === pa.hastaId) ||
        (x.desdeId === pa.hastaId && x.hastaId === pa.desdeId),
    );
    return {
      relacion: `${pa.nombreDesde} ↔ ${pa.nombreHasta}`,
      recorridos: pa.recorridos,
      distanciaActual: pa.distancia,
      cdActual: pa.cargaDistancia,
      distanciaPropuesta: pp?.distancia ?? Number.NaN,
      cdPropuesta: pp?.cargaDistancia ?? Number.NaN,
      diferencia: pa.cargaDistancia - (pp?.cargaDistancia ?? 0),
    };
  });

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Comparar los dos planos relación por relación',
    explicacion:
      'La comparación se hace sobre las mismas relaciones y los mismos recorridos: lo único que cambia es la distancia. ' +
      'Así queda claro qué movimientos de departamentos generaron la ganancia y cuáles la desperdiciaron.',
    tabla: {
      encabezados: ['Relación', 'Recorridos', `d (${nombreActual})`, 'cd', `d (${nombrePropuesta})`, 'cd', 'Diferencia'],
      filas: detallePorRelacion.map((x) => [
        x.relacion,
        formatearNumero(x.recorridos, { decimales: 0 }),
        formatearNumero(x.distanciaActual, { decimales: 2 }),
        formatearNumero(x.cdActual, { decimales: 2 }),
        formatearNumero(x.distanciaPropuesta, { decimales: 2 }),
        formatearNumero(x.cdPropuesta, { decimales: 2 }),
        formatearNumero(x.diferencia, { decimales: 2, signoExplicito: true }),
      ]),
      pie: [
        'Total',
        '',
        '',
        formatearNumero(actual.puntajeCD, { decimales: 2 }),
        '',
        formatearNumero(propuesta.puntajeCD, { decimales: 2 }),
        formatearNumero(diferencia, { decimales: 2, signoExplicito: true }),
      ],
    },
  });

  pasos.agregar({
    titulo: 'Calcular el porcentaje de mejora',
    explicacion:
      'La mejora se expresa como porcentaje del puntaje original, que es la forma en que se presenta a la gerencia: ' +
      'un porcentaje de reducción del manejo de materiales se traduce directamente en horas de montacargas y desgaste de equipo.',
    formula: '\\%\\,ME = \\frac{cd_{actual} - cd_{propuesta}}{cd_{actual}} \\times 100',
    valor: mejoraPorcentaje,
    unidad: '%',
  });

  return {
    datos: { actual, propuesta, diferencia, mejoraPorcentaje, mejora, detallePorRelacion },
    pasos: pasos.listar(),
    diagnosticos: [
      mejora
        ? nota('DIST_MEJORA', `La propuesta reduce el puntaje carga-distancia en ${formatearNumero(mejoraPorcentaje, { decimales: 1 })} %.`)
        : aviso(
            'DIST_EMPEORA',
            `La propuesta **aumenta** el puntaje carga-distancia en ${formatearNumero(-mejoraPorcentaje, { decimales: 1 })} %. ` +
              'Recuerde que en carga-distancia menor es mejor: un puntaje más alto significa más recorrido de materiales.',
          ),
      ...(propuesta.alertas.length > 0
        ? [
            aviso(
              'DIST_PROPUESTA_CON_ALERTAS',
              `La propuesta incumple ${propuesta.alertas.length} restricción(es) de proximidad. Un mejor puntaje no compensa una relación «No deseable» violada.`,
            ),
          ]
        : []),
    ],
    interpretacion: mejora
      ? `La distribución propuesta reduce el manejo de materiales en ${formatearNumero(diferencia, { decimales: 2 })} unidades carga-distancia, ` +
        `un ${formatearNumero(mejoraPorcentaje, { decimales: 1 })} % menos que la actual. ` +
        (propuesta.alertas.length === 0
          ? 'Además respeta todas las restricciones de proximidad, así que es recomendable implementarla.'
          : 'Sin embargo incumple restricciones de proximidad: antes de implementarla hay que resolver esos conflictos.')
      : `La distribución propuesta no mejora la actual: aumenta el puntaje en ${formatearNumero(-diferencia, { decimales: 2 })} unidades. ` +
        'Conviene revisar qué pares de departamentos con muchos recorridos quedaron más separados que antes.',
  };
}

// ───────────────────────────── Búsqueda de la mejor distribución ─────────────────────────────

export interface MejorDistribucion {
  readonly asignacion: Readonly<Record<string, readonly CeldaPlano[]>>;
  readonly puntajeCD: number;
  readonly permutacionesEvaluadas: number;
  readonly exhaustiva: boolean;
  /**
   * Cierto cuando los departamentos no ocupan todos la misma cantidad de
   * bloques. Entonces la heurística solo puede intercambiar los que tienen
   * igual área —cambiar de sitio a uno de tres bloques con uno de un bloque
   * dejaría a ambos con el área equivocada—, así que hay departamentos que
   * nunca se mueven. La interfaz tiene que decirlo: si no, un mínimo local muy
   * limitado se presenta como si fuera el mejor plano posible.
   */
  readonly limitadaPorArea: boolean;
}

/**
 * Busca la mejor asignación de departamentos a posiciones.
 *
 * Con hasta 8 departamentos de un bloque cada uno explora todas las
 * permutaciones (búsqueda exhaustiva). Por encima de ese tamaño usa una
 * heurística de intercambio por pares, y lo declara.
 */
export function buscarMejorDistribucion(
  d: DatosDistribucion,
  fijos: Readonly<Record<string, readonly CeldaPlano[]>> = {},
): MejorDistribucion {
  const deps = d.departamentos;
  const posiciones: CeldaPlano[] = [];
  for (let f = 0; f < d.plano.filas; f++) {
    for (let c = 0; c < d.plano.columnas; c++) posiciones.push({ fila: f, columna: c });
  }

  const puntaje = (asignacion: Record<string, CeldaPlano[]>): number => {
    const cent: Record<string, Punto> = {};
    for (const dep of deps) cent[dep.id] = centroide(asignacion[dep.id] ?? []);
    const terminos: number[] = [];
    for (let i = 0; i < deps.length; i++) {
      for (let j = i + 1; j < deps.length; j++) {
        const w = (d.recorridos[i]?.[j] ?? 0) + (d.recorridos[j]?.[i] ?? 0);
        if (w === 0) continue;
        terminos.push(w * distancia(cent[deps[i]!.id]!, cent[deps[j]!.id]!, d.tipoDistancia));
      }
    }
    return sumaExacta(terminos);
  };

  const librosIds = deps.filter((x) => fijos[x.id] === undefined).map((x) => x.id);
  const ocupadasFijas = new Set(Object.values(fijos).flat().map((c) => `${c.fila}:${c.columna}`));
  const libres = posiciones.filter((p) => !ocupadasFijas.has(`${p.fila}:${p.columna}`));

  const base: Record<string, CeldaPlano[]> = {};
  for (const [id, celdas] of Object.entries(fijos)) base[id] = celdas.map((c) => ({ ...c }));

  const areasIguales = deps.every((x) => x.bloques === deps[0]!.bloques);
  const exhaustiva = librosIds.length <= 8 && deps.every((x) => x.bloques === 1);
  let mejorAsignacion: Record<string, CeldaPlano[]> = {};
  let mejorPuntaje = Infinity;
  let evaluadas = 0;

  if (exhaustiva) {
    const usadas = new Array<boolean>(libres.length).fill(false);
    const actual: Record<string, CeldaPlano[]> = { ...base };

    const recorrer = (k: number): void => {
      if (k === librosIds.length) {
        evaluadas++;
        const p = puntaje(actual);
        if (p < mejorPuntaje) {
          mejorPuntaje = p;
          mejorAsignacion = Object.fromEntries(Object.entries(actual).map(([id, c]) => [id, [...c]]));
        }
        return;
      }
      for (let i = 0; i < libres.length; i++) {
        if (usadas[i]) continue;
        usadas[i] = true;
        actual[librosIds[k]!] = [libres[i]!];
        recorrer(k + 1);
        usadas[i] = false;
      }
    };
    recorrer(0);
  } else {
    // Heurística: arranca del plano dado y mejora intercambiando pares.
    const actual: Record<string, CeldaPlano[]> = {};
    for (const dep of deps) actual[dep.id] = [...(d.plano.asignacion[dep.id] ?? [])];
    let p = puntaje(actual);
    let mejoro = true;

    while (mejoro) {
      mejoro = false;
      for (let i = 0; i < deps.length; i++) {
        for (let j = i + 1; j < deps.length; j++) {
          const a = deps[i]!.id;
          const b = deps[j]!.id;
          if (fijos[a] || fijos[b]) continue;
          // Intercambiar posiciones solo es válido entre áreas iguales: si no,
          // los dos departamentos quedarían con la cantidad de bloques del otro.
          if (deps[i]!.bloques !== deps[j]!.bloques) continue;
          const tmp = actual[a]!;
          actual[a] = actual[b]!;
          actual[b] = tmp;
          evaluadas++;
          const nuevo = puntaje(actual);
          if (nuevo < p - 1e-9) {
            p = nuevo;
            mejoro = true;
          } else {
            const t2 = actual[a]!;
            actual[a] = actual[b]!;
            actual[b] = t2;
          }
        }
      }
    }
    mejorPuntaje = p;
    mejorAsignacion = Object.fromEntries(Object.entries(actual).map(([id, c]) => [id, [...c]]));
  }

  return {
    asignacion: mejorAsignacion,
    puntajeCD: mejorPuntaje,
    permutacionesEvaluadas: evaluadas,
    exhaustiva,
    limitadaPorArea: !exhaustiva && !areasIguales,
  };
}
