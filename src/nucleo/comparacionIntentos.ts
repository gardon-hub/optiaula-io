/**
 * Comparación entre los intentos de un mismo ejercicio.
 *
 * El modelo de datos siempre admitió varios intentos, pero la aplicación los
 * mostraba como una lista plana: cada uno por su lado, sin decir qué cambió
 * entre uno y otro. Y ahí está lo que le sirve al estudiante y al docente. No
 * «sacó 60 y luego 90», sino **en qué dejó de equivocarse**: en el primer
 * intento sumaba las desviaciones en lugar de las varianzas; en el segundo ya
 * no.
 *
 * Aquí se calcula esa evolución. Pregunta por pregunta y error por error, sin
 * tocar la interfaz: lo que sale es una lista de cambios con su significado.
 */

import type { Ejercicio, Intento, Pregunta } from '@/esquemas';
import { notaDeIntento } from './revision';

/** Qué le pasó a una pregunta entre dos intentos. */
export type CambioPregunta = 'corregida' | 'perdida' | 'seguia_mal' | 'seguia_bien' | 'sin_datos';

export interface EvolucionPregunta {
  readonly pregunta: Pregunta;
  readonly cambio: CambioPregunta;
  readonly valorAntes: string | number | null;
  readonly valorDespues: string | number | null;
  /** Código del error típico que cometía antes, si lo había. */
  readonly errorAntes: string | null;
  readonly errorDespues: string | null;
  readonly puntosAntes: number;
  readonly puntosDespues: number;
}

export interface ComparacionIntentos {
  readonly anterior: Intento;
  readonly posterior: Intento;
  readonly numeroAnterior: number;
  readonly numeroPosterior: number;
  readonly porcentajeAntes: number;
  readonly porcentajeDespues: number;
  readonly diferencia: number;
  readonly minutosEntreIntentos: number;
  readonly segundosAntes: number;
  readonly segundosDespues: number;
  readonly preguntas: readonly EvolucionPregunta[];
  /** Errores típicos que cometía antes y ya no. */
  readonly erroresSuperados: readonly string[];
  /** Errores típicos nuevos, que no cometía en el intento anterior. */
  readonly erroresNuevos: readonly string[];
  /** Errores que se repiten intento tras intento: los que hay que atender. */
  readonly erroresPersistentes: readonly string[];
}

/** Los intentos de un ejercicio, del más viejo al más nuevo. */
export function intentosDeEjercicio(
  intentos: readonly Intento[],
  ejercicioId: string,
  perfilId: string | null,
): readonly Intento[] {
  return intentos
    .filter((i) => i.ejercicioId === ejercicioId && (perfilId === null || i.perfilId === perfilId) && i.completado)
    .slice()
    .sort((a, b) => a.iniciadoEn.localeCompare(b.iniciadoEn));
}

/**
 * Compara dos intentos del mismo ejercicio.
 *
 * `numeroAnterior` y `numeroPosterior` son la posición dentro de la serie del
 * ejercicio, contando desde uno: lo que el estudiante entiende por «primer
 * intento», no un identificador interno.
 */
export function compararIntentos(
  anterior: Intento,
  posterior: Intento,
  ejercicio: Ejercicio,
  numeroAnterior = 1,
  numeroPosterior = 2,
): ComparacionIntentos {
  const preguntas: EvolucionPregunta[] = ejercicio.preguntas.map((p) => {
    const antes = anterior.respuestas.find((r) => r.preguntaId === p.id);
    const despues = posterior.respuestas.find((r) => r.preguntaId === p.id);

    // Las de interpretación no se comparan por «correcta»: el motor no las
    // califica. Se miran por los puntos que el docente les puso.
    const bienAntes = p.tipo === 'interpretacion' ? (antes?.revision?.puntos ?? 0) > 0 : antes?.correcta === true;
    const bienDespues = p.tipo === 'interpretacion' ? (despues?.revision?.puntos ?? 0) > 0 : despues?.correcta === true;

    const cambio: CambioPregunta =
      antes === undefined || despues === undefined
        ? 'sin_datos'
        : bienAntes && bienDespues
          ? 'seguia_bien'
          : !bienAntes && bienDespues
            ? 'corregida'
            : bienAntes && !bienDespues
              ? 'perdida'
              : 'seguia_mal';

    return {
      pregunta: p,
      cambio,
      valorAntes: antes?.valor ?? null,
      valorDespues: despues?.valor ?? null,
      errorAntes: erroresDe(anterior, p.id),
      errorDespues: erroresDe(posterior, p.id),
      puntosAntes: (antes?.puntosObtenidos ?? 0) + (antes?.revision?.puntos ?? 0),
      puntosDespues: (despues?.puntosObtenidos ?? 0) + (despues?.revision?.puntos ?? 0),
    };
  });

  const antes = new Set(anterior.erroresDetectados);
  const despues = new Set(posterior.erroresDetectados);

  const notaAntes = notaDeIntento(anterior, ejercicio);
  const notaDespues = notaDeIntento(posterior, ejercicio);

  const inicioAnterior = Date.parse(anterior.finalizadoEn ?? anterior.iniciadoEn);
  const inicioPosterior = Date.parse(posterior.iniciadoEn);

  return {
    anterior,
    posterior,
    numeroAnterior,
    numeroPosterior,
    porcentajeAntes: notaAntes.porcentaje,
    porcentajeDespues: notaDespues.porcentaje,
    diferencia: notaDespues.porcentaje - notaAntes.porcentaje,
    minutosEntreIntentos:
      Number.isFinite(inicioAnterior) && Number.isFinite(inicioPosterior)
        ? Math.max(0, (inicioPosterior - inicioAnterior) / 60000)
        : 0,
    segundosAntes: anterior.segundosEmpleados,
    segundosDespues: posterior.segundosEmpleados,
    preguntas,
    erroresSuperados: [...antes].filter((c) => !despues.has(c)),
    erroresNuevos: [...despues].filter((c) => !antes.has(c)),
    erroresPersistentes: [...antes].filter((c) => despues.has(c)),
  };
}

function erroresDe(intento: Intento, preguntaId: string): string | null {
  const r = intento.respuestas.find((x) => x.preguntaId === preguntaId);
  if (r === undefined || r.correcta === true) return null;
  // El código del error típico no se guarda por respuesta, así que se busca en
  // la lista del intento el que corresponda: si hay uno solo, es este.
  return intento.erroresDetectados.length === 1 ? (intento.erroresDetectados[0] ?? null) : null;
}

export interface ResumenSerie {
  readonly intentos: readonly Intento[];
  readonly porcentajes: readonly number[];
  /** Diferencia entre el último y el primero. */
  readonly progreso: number;
  /** Cierto si cada intento fue mejor o igual que el anterior. */
  readonly mejoraSostenida: boolean;
  /** Errores presentes en todos los intentos: los que no se han corregido nunca. */
  readonly erroresPersistentes: readonly string[];
  /** Errores que aparecían al principio y ya no están en el último. */
  readonly erroresSuperados: readonly string[];
}

/** Evolución de toda la serie de intentos de un ejercicio. */
export function resumirSerie(intentos: readonly Intento[], ejercicio: Ejercicio): ResumenSerie | null {
  if (intentos.length < 2) return null;

  const porcentajes = intentos.map((i) => notaDeIntento(i, ejercicio).porcentaje);
  const primero = intentos[0]!;
  const ultimo = intentos.at(-1)!;

  const enTodos = primero.erroresDetectados.filter((c) => intentos.every((i) => i.erroresDetectados.includes(c)));
  const superados = primero.erroresDetectados.filter((c) => !ultimo.erroresDetectados.includes(c));

  return {
    intentos,
    porcentajes,
    progreso: (porcentajes.at(-1) ?? 0) - (porcentajes[0] ?? 0),
    mejoraSostenida: porcentajes.every((p, i) => i === 0 || p >= (porcentajes[i - 1] ?? 0) - 1e-9),
    erroresPersistentes: enTodos,
    erroresSuperados: superados,
  };
}

/**
 * Frase que resume la evolución, en el lenguaje del estudiante.
 *
 * Existe en el núcleo y no en la pantalla porque es una lectura del dato, no
 * una decoración: el mismo texto sirve para el historial y para el reporte.
 */
export function leerEvolucion(c: ComparacionIntentos, nombreErrores: (codigo: string) => string): string {
  const corregidas = c.preguntas.filter((p) => p.cambio === 'corregida');
  const perdidas = c.preguntas.filter((p) => p.cambio === 'perdida');

  const partes: string[] = [];

  if (c.diferencia > 0.5) {
    partes.push(`Del intento ${c.numeroAnterior} al ${c.numeroPosterior} subió ${Math.round(c.diferencia)} puntos porcentuales.`);
  } else if (c.diferencia < -0.5) {
    partes.push(`Del intento ${c.numeroAnterior} al ${c.numeroPosterior} bajó ${Math.round(-c.diferencia)} puntos porcentuales.`);
  } else {
    partes.push(`El resultado se mantuvo entre el intento ${c.numeroAnterior} y el ${c.numeroPosterior}.`);
  }

  if (corregidas.length > 0) {
    partes.push(
      `Corrigió ${corregidas.length} pregunta(s): ${corregidas.map((p) => p.pregunta.enunciado.slice(0, 45).trim()).join('; ')}…`,
    );
  }
  if (perdidas.length > 0) {
    partes.push(`Perdió ${perdidas.length} que antes tenía bien: conviene revisar si fue descuido o confusión.`);
  }

  if (c.erroresSuperados.length > 0) {
    partes.push(`Dejó de cometer: ${c.erroresSuperados.map(nombreErrores).join('; ')}.`);
  }
  if (c.erroresPersistentes.length > 0) {
    partes.push(
      `Sigue repitiendo: ${c.erroresPersistentes.map(nombreErrores).join('; ')}. Ese es el concepto que conviene repasar.`,
    );
  }
  if (c.erroresNuevos.length > 0) {
    partes.push(`Apareció un error que no cometía antes: ${c.erroresNuevos.map(nombreErrores).join('; ')}.`);
  }

  return partes.join(' ');
}
