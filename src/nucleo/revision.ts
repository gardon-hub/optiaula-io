/**
 * Calificación docente de las respuestas de interpretación.
 *
 * El motor de retroalimentación califica solo lo que puede comprobar contra un
 * número. Las preguntas de interpretación quedaban fuera del puntaje: se
 * guardaba el texto del estudiante y ahí terminaba todo. Este módulo cierra ese
 * tramo.
 *
 * La regla que ordena el diseño: **el puntaje automático no se toca**. Lo que el
 * estudiante vio al terminar —«X % de los puntos calificables»— sigue
 * significando lo mismo. La revisión docente se suma aparte y produce una nota
 * final que declara de dónde sale cada parte. Así el estudiante no ve cambiar
 * retroactivamente un número que ya le habían dado.
 */

import type { Ejercicio, Intento, Pregunta, Respuesta, Revision, Rubrica } from '@/esquemas';
import { sumaExacta } from './numero';

/** Las preguntas que le toca calificar al docente. */
export function preguntasRevisables(ejercicio: Ejercicio): readonly Pregunta[] {
  return ejercicio.preguntas.filter((p) => p.tipo === 'interpretacion');
}

/**
 * Puntos que corresponden a una selección de niveles.
 *
 * Cada criterio aporta `peso %` del puntaje de la pregunta, y el nivel elegido
 * otorga un porcentaje de ese aporte. Un criterio sin nivel elegido aporta
 * cero: calificar a medias no debe parecer una calificación completa.
 */
export function puntosDeRubrica(
  puntosPregunta: number,
  rubrica: Rubrica,
  niveles: Readonly<Record<string, string>>,
): number {
  const pesoTotal = sumaExacta(rubrica.criterios.map((c) => c.peso));
  if (pesoTotal <= 0) return 0;

  const aportes = rubrica.criterios.map((criterio) => {
    const elegido = criterio.niveles.find((n) => n.id === niveles[criterio.id]);
    if (elegido === undefined) return 0;
    return (criterio.peso / pesoTotal) * (elegido.porcentaje / 100) * puntosPregunta;
  });

  return sumaExacta(aportes);
}

/** Cierto cuando todos los criterios de la rúbrica tienen nivel elegido. */
export function rubricaCompleta(rubrica: Rubrica, niveles: Readonly<Record<string, string>>): boolean {
  return rubrica.criterios.every((c) => {
    const id = niveles[c.id];
    return id !== undefined && c.niveles.some((n) => n.id === id);
  });
}

export interface ResumenRevision {
  /** Interpretaciones que el estudiante respondió y el docente aún no calificó. */
  readonly pendientes: number;
  readonly revisadas: number;
  /** Interpretaciones que el estudiante dejó en blanco: valen cero, no quedan pendientes. */
  readonly enBlanco: number;
  readonly puntosRevision: number;
  readonly puntosMaximosRevision: number;
  /** Puntaje automático más el de la revisión. */
  readonly notaFinal: number;
  readonly notaMaxima: number;
  readonly porcentajeFinal: number;
  /** Cierto cuando ya no queda nada por revisar en este intento. */
  readonly completa: boolean;
}

const vacio = (valor: Respuesta['valor']): boolean =>
  valor === null || (typeof valor === 'string' && valor.trim() === '');

/**
 * Estado de la revisión de un intento. No modifica nada: solo lee.
 *
 * `notaMaxima` suma los puntos de las preguntas calificables por el motor más
 * los de **todas** las interpretaciones, respondidas o no. Dejar una en blanco
 * cuesta puntos, igual que en un examen de papel.
 */
export function resumirRevision(intento: Intento, ejercicio: Ejercicio): ResumenRevision {
  const revisables = preguntasRevisables(ejercicio);
  const porId = new Map(intento.respuestas.map((r) => [r.preguntaId, r]));

  let pendientes = 0;
  let revisadas = 0;
  let enBlanco = 0;
  const otorgados: number[] = [];

  for (const p of revisables) {
    const r = porId.get(p.id);
    if (r?.revision != null) {
      revisadas++;
      otorgados.push(r.revision.puntos);
    } else if (r === undefined || vacio(r.valor)) {
      enBlanco++;
    } else {
      pendientes++;
    }
  }

  const puntosRevision = sumaExacta(otorgados);
  const puntosMaximosRevision = sumaExacta(revisables.map((p) => p.puntos));
  const notaFinal = intento.puntaje + puntosRevision;
  const notaMaxima = intento.puntajeMaximo + puntosMaximosRevision;

  return {
    pendientes,
    revisadas,
    enBlanco,
    puntosRevision,
    puntosMaximosRevision,
    notaFinal,
    notaMaxima,
    porcentajeFinal: notaMaxima === 0 ? 0 : (notaFinal / notaMaxima) * 100,
    completa: pendientes === 0,
  };
}

export interface NotaDeIntento {
  readonly puntaje: number;
  readonly maximo: number;
  readonly porcentaje: number;
  /** Cierto cuando el docente ya calificó al menos una interpretación. */
  readonly conRevision: boolean;
  readonly pendientes: number;
}

/**
 * La nota de un intento, para mostrar en una sola cifra.
 *
 * Mientras el docente no haya calificado nada es el puntaje automático, que es
 * lo que el estudiante vio al terminar. En cuanto hay una interpretación
 * calificada pasa a ser la nota final: si no, la misma pantalla mostraría dos
 * porcentajes que se contradicen.
 *
 * Vive aquí y no en cada pantalla para que el historial, los reportes y el
 * registro de calificaciones no puedan discrepar entre ellos.
 */
export function notaDeIntento(intento: Intento, ejercicio: Ejercicio | undefined): NotaDeIntento {
  const automatico = {
    puntaje: intento.puntaje,
    maximo: intento.puntajeMaximo,
    porcentaje: intento.puntajeMaximo === 0 ? 0 : (intento.puntaje / intento.puntajeMaximo) * 100,
    conRevision: false,
    pendientes: 0,
  };
  if (ejercicio === undefined) return automatico;

  const r = resumirRevision(intento, ejercicio);
  if (r.revisadas === 0) return { ...automatico, pendientes: r.pendientes };

  return {
    puntaje: r.notaFinal,
    maximo: r.notaMaxima,
    porcentaje: r.porcentajeFinal,
    conRevision: true,
    pendientes: r.pendientes,
  };
}

/**
 * Devuelve el intento con una respuesta ya calificada. Pasar `null` como
 * revisión deshace la calificación y la deja otra vez pendiente.
 */
export function aplicarRevision(intento: Intento, preguntaId: string, revision: Revision | null): Intento {
  return {
    ...intento,
    respuestas: intento.respuestas.map((r) => (r.preguntaId === preguntaId ? { ...r, revision } : r)),
  };
}

export interface PendienteDeRevision {
  readonly intento: Intento;
  readonly ejercicio: Ejercicio;
  readonly pregunta: Pregunta;
  readonly respuesta: Respuesta;
}

/**
 * Todas las interpretaciones respondidas de una lista de intentos, con su
 * pregunta y su ejercicio ya resueltos. Las pendientes primero y, dentro de
 * cada grupo, las más recientes arriba: es el orden en que un docente revisa.
 */
export function bandejaDeRevision(
  intentos: readonly Intento[],
  ejercicios: readonly Ejercicio[],
): readonly PendienteDeRevision[] {
  const porId = new Map(ejercicios.map((e) => [e.id, e]));
  const salida: PendienteDeRevision[] = [];

  for (const intento of intentos) {
    const ejercicio = porId.get(intento.ejercicioId);
    if (ejercicio === undefined) continue;

    for (const pregunta of preguntasRevisables(ejercicio)) {
      const respuesta = intento.respuestas.find((r) => r.preguntaId === pregunta.id);
      // Una interpretación en blanco no se revisa: no hay nada que leer.
      if (respuesta === undefined || vacio(respuesta.valor)) continue;
      salida.push({ intento, ejercicio, pregunta, respuesta });
    }
  }

  const momento = (p: PendienteDeRevision): number =>
    Date.parse(p.intento.finalizadoEn ?? p.intento.iniciadoEn) || 0;

  return salida.sort((a, b) => {
    const pendienteA = a.respuesta.revision === null ? 0 : 1;
    const pendienteB = b.respuesta.revision === null ? 0 : 1;
    if (pendienteA !== pendienteB) return pendienteA - pendienteB;
    return momento(b) - momento(a);
  });
}
