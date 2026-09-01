/**
 * Módulo 7 — PERT.
 *
 * Tiempos esperados con tres estimaciones, varianza por actividad, ruta
 * crítica probabilística y aproximación normal para responder preguntas de
 * probabilidad y de fecha comprometida.
 */

import { formatearNumero, normalAcumulada, normalInversa } from './numero';
import { resolverCPM, type Actividad, type ActividadCalculada, type RutaCritica } from './cpm';
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

export interface ActividadPERT {
  readonly id: string;
  readonly descripcion: string;
  readonly predecesoras: readonly string[];
  /** Tiempo optimista. */
  readonly a: number;
  /** Tiempo más probable. */
  readonly m: number;
  /** Tiempo pesimista. */
  readonly b: number;
}

export interface DatosPERT {
  readonly titulo: string;
  readonly actividades: readonly ActividadPERT[];
  readonly unidadTiempo: string;
}

export interface ActividadPERTCalculada {
  readonly actividad: ActividadPERT;
  readonly tiempoEsperado: number;
  readonly varianza: number;
  readonly desviacion: number;
  readonly cpm: ActividadCalculada;
}

export interface ResultadoPERT {
  readonly calculadas: readonly ActividadPERTCalculada[];
  readonly duracionEsperada: number;
  readonly rutasCriticas: readonly RutaCritica[];
  /** Varianza del proyecto: suma de varianzas de la ruta evaluada. */
  readonly varianzaProyecto: number;
  readonly desviacionProyecto: number;
  /** Ruta sobre la que se acumuló la varianza. */
  readonly rutaEvaluada: readonly string[];
  readonly unidadTiempo: string;
}

/** TE = (a + 4m + b) / 6 */
export function tiempoEsperado(a: number, m: number, b: number): number {
  return (a + 4 * m + b) / 6;
}

/** σ² = ((b − a) / 6)² */
export function varianzaActividad(a: number, b: number): number {
  const s = (b - a) / 6;
  return s * s;
}

function validar(datos: DatosPERT): Diagnostico[] {
  const d: Diagnostico[] = [];

  if (datos.actividades.length === 0) {
    d.push(error('PERT_SIN_ACTIVIDADES', 'El proyecto no tiene actividades.'));
    return d;
  }

  for (const x of datos.actividades) {
    if (x.a < 0 || x.m < 0 || x.b < 0) {
      d.push(error('PERT_TIEMPO_NEGATIVO', `La actividad "${x.id}" tiene tiempos negativos.`, x.id));
    }
    if (x.a > x.m) {
      d.push(error('PERT_ORDEN_AM', `En "${x.id}" el tiempo optimista (${x.a}) supera al más probable (${x.m}). Debe cumplirse a ≤ m ≤ b.`, x.id));
    }
    if (x.m > x.b) {
      d.push(error('PERT_ORDEN_MB', `En "${x.id}" el tiempo más probable (${x.m}) supera al pesimista (${x.b}). Debe cumplirse a ≤ m ≤ b.`, x.id));
    }
    if (x.a === x.b) {
      d.push(nota('PERT_SIN_INCERTIDUMBRE', `La actividad "${x.id}" tiene a = b: se considera de duración cierta, con varianza cero.`, x.id));
    }
  }

  return d;
}

export function resolverPERT(datos: DatosPERT): Resultado<ResultadoPERT> {
  const diagnosticos = validar(datos);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const actividadesCPM: Actividad[] = datos.actividades.map((x) => ({
    id: x.id,
    descripcion: x.descripcion,
    predecesoras: x.predecesoras,
    duracion: tiempoEsperado(x.a, x.m, x.b),
  }));

  const cpm = resolverCPM({ titulo: datos.titulo, actividades: actividadesCPM, unidadTiempo: datos.unidadTiempo });
  if (cpm.datos === null) return resultadoFallido([...diagnosticos, ...cpm.diagnosticos]);

  diagnosticos.push(...cpm.diagnosticos.filter((x) => x.gravedad !== 'nota'));

  const calculadas: ActividadPERTCalculada[] = datos.actividades.map((x) => {
    const varianza = varianzaActividad(x.a, x.b);
    return {
      actividad: x,
      tiempoEsperado: tiempoEsperado(x.a, x.m, x.b),
      varianza,
      desviacion: Math.sqrt(varianza),
      cpm: cpm.datos!.calculadas.find((c) => c.actividad.id === x.id)!,
    };
  });

  // La varianza del proyecto se acumula sobre las actividades de la ruta
  // evaluada. Cuando hay varias rutas críticas se toma la de mayor varianza,
  // que es la más arriesgada.
  const rutas = cpm.datos.rutasCriticas;
  const varianzaDeRuta = (r: RutaCritica): number =>
    r.actividades.reduce((s, id) => s + (calculadas.find((c) => c.actividad.id === id)?.varianza ?? 0), 0);

  const rutaElegida = rutas.length === 0 ? null : rutas.reduce((a, b) => (varianzaDeRuta(b) > varianzaDeRuta(a) ? b : a));
  const varianzaProyecto = rutaElegida === null ? 0 : varianzaDeRuta(rutaElegida);
  const desviacionProyecto = Math.sqrt(varianzaProyecto);

  if (rutas.length > 1) {
    diagnosticos.push(
      aviso(
        'PERT_VARIAS_RUTAS',
        `Hay ${rutas.length} rutas críticas. La varianza del proyecto se calculó sobre la de mayor varianza (${rutaElegida?.actividades.join('–')}), ` +
          'que es la que más riesgo aporta. Las probabilidades resultantes son optimistas: con varias rutas tensas, la probabilidad real de cumplir la fecha es menor que la calculada.',
      ),
    );
  }

  diagnosticos.push(
    nota(
      'PERT_LIMITES_NORMAL',
      'La aproximación normal es válida bajo tres supuestos: que la ruta crítica tenga suficientes actividades (por el teorema del límite central), ' +
        'que las duraciones sean independientes entre sí, y que la ruta crítica no cambie. Ninguno se cumple perfectamente en un proyecto real, ' +
        'así que las probabilidades son orientativas, no garantías.',
    ),
  );

  if (rutaElegida !== null && rutaElegida.actividades.length < 4) {
    diagnosticos.push(
      aviso(
        'PERT_RUTA_CORTA',
        `La ruta crítica tiene solo ${rutaElegida.actividades.length} actividades. Con tan pocas, el teorema del límite central no respalda bien la aproximación normal: ` +
          'trate las probabilidades como una referencia gruesa.',
      ),
    );
  }

  const u = datos.unidadTiempo;
  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Calcular el tiempo esperado de cada actividad',
    explicacion:
      'PERT no pide una duración sino tres: la mejor imaginable (a), la más probable (m) y la peor imaginable (b). ' +
      'El tiempo esperado es un promedio ponderado que da cuatro veces más peso a la estimación más probable, ' +
      'porque es la que el experto conoce mejor; los extremos apenas corrigen el sesgo.',
    formula: 'TE = \\frac{a + 4m + b}{6}',
    tabla: {
      encabezados: ['Actividad', 'a', 'm', 'b', `TE (${u})`],
      filas: calculadas.map((c) => [
        c.actividad.id,
        formatearNumero(c.actividad.a, { decimales: 2 }),
        formatearNumero(c.actividad.m, { decimales: 2 }),
        formatearNumero(c.actividad.b, { decimales: 2 }),
        formatearNumero(c.tiempoEsperado, { decimales: 3 }),
      ]),
    },
  });

  pasos.agregar({
    titulo: 'Calcular la varianza de cada actividad',
    explicacion:
      'La varianza mide la incertidumbre. Depende solo de la distancia entre el escenario optimista y el pesimista: ' +
      'cuanto más se separan, menos se sabe de esa actividad. Se divide entre 6 porque se supone que el rango a–b cubre unas seis desviaciones estándar.',
    formula: '\\sigma^2 = \\left( \\frac{b - a}{6} \\right)^2',
    tabla: {
      encabezados: ['Actividad', 'b − a', 'σ', 'σ²'],
      filas: calculadas.map((c) => [
        c.actividad.id,
        formatearNumero(c.actividad.b - c.actividad.a, { decimales: 2 }),
        formatearNumero(c.desviacion, { decimales: 4 }),
        formatearNumero(c.varianza, { decimales: 4 }),
      ]),
    },
  });

  pasos.agregar({
    titulo: 'Determinar la ruta crítica con los tiempos esperados',
    explicacion:
      'Con el TE de cada actividad como duración, la red se resuelve igual que en CPM: recorrido hacia adelante, ' +
      'recorrido hacia atrás, holguras y ruta crítica. La duración esperada del proyecto es la suma de los TE de esa ruta.',
    tabla: {
      encabezados: ['Actividad', 'TE', 'IT', 'TT', 'IL', 'TL', 'Holgura', '¿Crítica?'],
      filas: calculadas.map((c) => [
        c.actividad.id,
        formatearNumero(c.tiempoEsperado, { decimales: 3 }),
        formatearNumero(c.cpm.it, { decimales: 3 }),
        formatearNumero(c.cpm.tt, { decimales: 3 }),
        formatearNumero(c.cpm.il, { decimales: 3 }),
        formatearNumero(c.cpm.tl, { decimales: 3 }),
        formatearNumero(c.cpm.holguraTotal, { decimales: 3 }),
        c.cpm.critica ? 'Sí' : 'No',
      ]),
      resaltadas: calculadas.map((c, i) => (c.cpm.critica ? i : -1)).filter((i) => i >= 0),
    },
    valor: cpm.datos.duracionProyecto,
    unidad: u,
  });

  pasos.agregar({
    titulo: 'Sumar las varianzas de la ruta crítica',
    explicacion:
      'Aquí está el error más común del tema: se suman las **varianzas**, nunca las desviaciones estándar. ' +
      'Y solo las de las actividades de la ruta evaluada, porque son las únicas cuya demora se traslada a la fecha final. ' +
      'La desviación estándar del proyecto es la raíz cuadrada de esa suma.',
    formula: '\\sigma_P^2 = \\sum_{i \\in RC} \\sigma_i^2 \\qquad \\sigma_P = \\sqrt{\\sigma_P^2}',
    tabla: {
      encabezados: ['Actividad de la ruta', 'TE', 'σ²'],
      filas: (rutaElegida?.actividades ?? []).map((id) => {
        const c = calculadas.find((x) => x.actividad.id === id)!;
        return [id, formatearNumero(c.tiempoEsperado, { decimales: 3 }), formatearNumero(c.varianza, { decimales: 4 })];
      }),
      pie: [
        'Proyecto',
        formatearNumero(cpm.datos.duracionProyecto, { decimales: 3 }),
        `${formatearNumero(varianzaProyecto, { decimales: 4 })}  (σ = ${formatearNumero(desviacionProyecto, { decimales: 4 })})`,
      ],
    },
    valor: varianzaProyecto,
    unidad: `${u}²`,
  });

  return {
    datos: {
      calculadas,
      duracionEsperada: cpm.datos.duracionProyecto,
      rutasCriticas: rutas,
      varianzaProyecto,
      desviacionProyecto,
      rutaEvaluada: rutaElegida?.actividades ?? [],
      unidadTiempo: u,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      `Se espera que el proyecto dure ${formatearNumero(cpm.datos.duracionProyecto, { decimales: 2 })} ${u}, ` +
      `con una desviación estándar de ${formatearNumero(desviacionProyecto, { decimales: 2 })} ${u}. ` +
      (desviacionProyecto > 0
        ? `Eso significa que, en condiciones normales, dos de cada tres ejecuciones del proyecto terminarían entre ` +
          `${formatearNumero(cpm.datos.duracionProyecto - desviacionProyecto, { decimales: 1 })} y ` +
          `${formatearNumero(cpm.datos.duracionProyecto + desviacionProyecto, { decimales: 1 })} ${u}. ` +
          'Prometer la duración esperada como fecha de entrega equivale a aceptar 50 % de probabilidad de incumplir: ' +
          'para comprometerse en serio hay que agregar un colchón.'
        : 'Todas las actividades de la ruta crítica tienen duración cierta, así que no hay incertidumbre que modelar.'),
  };
}

// ───────────────────────────── Probabilidades ─────────────────────────────

export type SentidoProbabilidad = 'antes' | 'despues';

export interface ConsultaProbabilidad {
  readonly media: number;
  readonly desviacion: number;
  readonly plazo: number;
  readonly sentido: SentidoProbabilidad;
  readonly unidadTiempo: string;
}

export interface ResultadoProbabilidad {
  readonly z: number;
  readonly probabilidad: number;
  readonly probabilidadComplemento: number;
  readonly sentido: SentidoProbabilidad;
}

/**
 * Probabilidad de terminar antes (o después) de un plazo, bajo la
 * aproximación normal.
 */
export function probabilidadPlazo(c: ConsultaProbabilidad): Resultado<ResultadoProbabilidad> {
  if (c.desviacion <= 0) {
    return resultadoFallido([
      error(
        'PERT_SIGMA_CERO',
        'La desviación estándar del proyecto es cero: no hay incertidumbre. El proyecto termina exactamente en la duración esperada, ' +
          'así que la probabilidad es 0 o 1 según el plazo, sin necesidad de la distribución normal.',
      ),
    ]);
  }

  const z = (c.plazo - c.media) / c.desviacion;
  const acumulada = normalAcumulada(z);
  const probabilidad = c.sentido === 'antes' ? acumulada : 1 - acumulada;
  const u = c.unidadTiempo;

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Estandarizar el plazo',
    explicacion:
      `El puntaje Z convierte el plazo de ${formatearNumero(c.plazo, { decimales: 2 })} ${u} en «cuántas desviaciones estándar ` +
      `está por ${c.plazo >= c.media ? 'encima' : 'debajo'} de la duración esperada». Así se puede consultar una única tabla normal ` +
      'sirva cual sea el proyecto.',
    formula: 'Z = \\frac{T - \\mu}{\\sigma}',
    tabla: {
      encabezados: ['Concepto', 'Valor'],
      filas: [
        [`Plazo solicitado (T)`, `${formatearNumero(c.plazo, { decimales: 2 })} ${u}`],
        [`Duración esperada (μ)`, `${formatearNumero(c.media, { decimales: 2 })} ${u}`],
        [`Desviación estándar (σ)`, `${formatearNumero(c.desviacion, { decimales: 4 })} ${u}`],
        ['Z', formatearNumero(z, { decimales: 4 })],
      ],
    },
    valor: z,
  });

  pasos.agregar({
    titulo: 'Leer la probabilidad en la distribución normal',
    explicacion:
      c.sentido === 'antes'
        ? `El área a la izquierda de Z = ${formatearNumero(z, { decimales: 2 })} es la probabilidad de terminar en ${formatearNumero(c.plazo, { decimales: 2 })} ${u} o menos.`
        : `El área a la derecha de Z = ${formatearNumero(z, { decimales: 2 })} es la probabilidad de tardar más de ${formatearNumero(c.plazo, { decimales: 2 })} ${u}. ` +
          'Se obtiene restando de 1 el área acumulada, porque las tablas normales publican siempre el área izquierda.',
    formula: c.sentido === 'antes' ? 'P(T \\le t) = \\Phi(Z)' : 'P(T > t) = 1 - \\Phi(Z)',
    valor: probabilidad * 100,
    unidad: '%',
  });

  const pct = probabilidad * 100;

  return {
    datos: { z, probabilidad, probabilidadComplemento: 1 - probabilidad, sentido: c.sentido },
    pasos: pasos.listar(),
    diagnosticos:
      Math.abs(z) > 3
        ? [
            aviso(
              'PERT_Z_EXTREMO',
              `El puntaje Z es ${formatearNumero(z, { decimales: 2 })}, muy alejado del centro. En las colas la aproximación normal es menos confiable ` +
                'y las tablas de un libro de texto suelen truncar en ±3,49.',
            ),
          ]
        : [],
    interpretacion:
      `Hay ${formatearNumero(pct, { decimales: 1 })} % de probabilidad de ${c.sentido === 'antes' ? 'terminar en' : 'exceder'} ` +
      `${formatearNumero(c.plazo, { decimales: 2 })} ${u}. ` +
      (c.sentido === 'antes'
        ? pct >= 90
          ? 'Es un compromiso holgado: se puede prometer esa fecha con confianza.'
          : pct >= 60
            ? 'Es un compromiso razonable pero no cómodo; conviene tener un plan de contingencia.'
            : 'Es un compromiso arriesgado: lo más probable es incumplirlo. Negocie más plazo o acorte la ruta crítica.'
        : pct >= 40
          ? 'El riesgo de excederse es alto y debería comunicarse al cliente.'
          : 'El riesgo de excederse es bajo.'),
  };
}

export interface ResultadoPlazoConfianza {
  readonly z: number;
  readonly plazo: number;
  readonly colchon: number;
  readonly confianza: number;
}

/**
 * Plazo que debe comprometerse para alcanzar un nivel de confianza dado.
 * Es la operación inversa de `probabilidadPlazo`.
 */
export function plazoParaConfianza(
  media: number,
  desviacion: number,
  confianza: number,
  unidadTiempo: string,
): Resultado<ResultadoPlazoConfianza> {
  if (!(confianza > 0 && confianza < 1)) {
    return resultadoFallido([
      error('PERT_CONFIANZA_FUERA', 'El nivel de confianza debe estar estrictamente entre 0 y 1 (por ejemplo 0,95 para 95 %).'),
    ]);
  }
  if (desviacion <= 0) {
    return resultadoFallido([
      error('PERT_SIGMA_CERO', 'Sin incertidumbre (σ = 0) no tiene sentido pedir un nivel de confianza: la duración es exacta.'),
    ]);
  }

  const z = normalInversa(confianza);
  const plazo = media + z * desviacion;
  const colchon = plazo - media;
  const u = unidadTiempo;

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Buscar el puntaje Z del nivel de confianza',
    explicacion:
      `Se busca en la tabla normal el valor de Z que deja ${formatearNumero(confianza * 100, { decimales: 1 })} % del área a su izquierda. ` +
      'Este es el paso inverso al cálculo de probabilidad: en vez de partir de un plazo y buscar la probabilidad, se parte de la probabilidad y se busca el plazo.',
    formula: 'Z = \\Phi^{-1}(\\text{confianza})',
    valor: z,
  });

  pasos.agregar({
    titulo: 'Convertir el puntaje Z en un plazo',
    explicacion:
      `Se despeja el plazo de la fórmula del puntaje Z. El resultado es la duración esperada más un colchón de ` +
      `${formatearNumero(colchon, { decimales: 2 })} ${u}, que es el precio de pasar de 50 % a ${formatearNumero(confianza * 100, { decimales: 1 })} % de confianza.`,
    formula: 'T = \\mu + Z \\sigma',
    valor: plazo,
    unidad: u,
  });

  return {
    datos: { z, plazo, colchon, confianza },
    pasos: pasos.listar(),
    diagnosticos: [
      nota(
        'PERT_COLCHON',
        'El colchón no es tiempo perdido: es la reserva que separa una promesa creíble de una expresión de deseos.',
      ),
    ],
    interpretacion:
      `Para tener ${formatearNumero(confianza * 100, { decimales: 1 })} % de confianza en cumplir, hay que comprometer ` +
      `${formatearNumero(plazo, { decimales: 2 })} ${u}, es decir ${formatearNumero(colchon, { decimales: 2 })} ${u} más que la duración esperada. ` +
      `Prometer los ${formatearNumero(media, { decimales: 2 })} ${u} de la estimación central significaría aceptar una probabilidad de incumplimiento del 50 %.`,
  };
}

// ───────────────────────────── Serie de la curva normal ─────────────────────────────

export interface PuntoCurva {
  readonly t: number;
  readonly densidad: number;
  readonly dentroDelArea: boolean;
}

/** Serie para dibujar la campana con el área sombreada de la consulta. */
export function serieCurvaNormal(
  media: number,
  desviacion: number,
  plazo: number,
  sentido: SentidoProbabilidad,
  puntos = 121,
): readonly PuntoCurva[] {
  if (desviacion <= 0) return [];
  const desde = media - 4 * desviacion;
  const hasta = media + 4 * desviacion;
  const salida: PuntoCurva[] = [];

  for (let i = 0; i < puntos; i++) {
    const t = desde + ((hasta - desde) * i) / (puntos - 1);
    const z = (t - media) / desviacion;
    const densidad = Math.exp(-(z * z) / 2) / (desviacion * Math.sqrt(2 * Math.PI));
    salida.push({ t, densidad, dentroDelArea: sentido === 'antes' ? t <= plazo : t >= plazo });
  }
  return salida;
}
