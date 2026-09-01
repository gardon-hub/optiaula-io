/**
 * Aplica a los ejercicios las decisiones del panel de auditoría.
 *
 * Hasta ahora `decidirInconsistencia()` solo **registraba** la decisión: la
 * pantalla decía «decidido» y el ejercicio se quedaba exactamente igual. Con
 * las cuatro opciones que ya coincidían con los datos cargados eso no se notaba,
 * pero significaba que elegir la otra opción no hacía nada. Un panel que dice
 * haber corregido algo y no lo corrige es peor que no tener panel.
 *
 * Aquí vive la aplicación, como función pura. Tres reglas la ordenan:
 *
 * 1. **Se parte siempre de los datos originales**, nunca del ejercicio ya
 *    transformado. Por eso la tienda recompone desde `BIBLIOTECA_INICIAL` en
 *    cada cambio: así cambiar de opinión no acumula transformaciones.
 * 2. **Las respuestas se recalculan.** Si una decisión cambia los datos, las
 *    respuestas guardadas dejan de valer; se rehacen con los mismos
 *    constructores del generador.
 * 3. **Lo que no se puede aplicar no se finge.** Una decisión sin transformación
 *    asociada deja el ejercicio intacto, y eso es correcto: hay decisiones
 *    —como la de transporte— que no cambian ningún dato.
 */

import type { DatosEjercicio, Ejercicio, Inconsistencia } from '@/esquemas';
import { preguntasDe } from './preguntas';

/**
 * Transformación de los datos de un ejercicio para una decisión concreta.
 * Devolver `null` significa «esta opción es la de los datos tal como vienen».
 */
type Transformacion = (datos: DatosEjercicio) => DatosEjercicio | null;

/**
 * Qué hace cada opción de cada inconsistencia.
 *
 * La clave es `inconsistencia:opcion`. Las opciones que corresponden a los datos
 * originales no aparecen: no hay nada que transformar.
 */
const TRANSFORMACIONES: Readonly<Record<string, Transformacion>> = {
  // I-01 — El enunciado del problema 3 de asignación habla de 3 camiones y 3
  // rutas; la tabla trae 4×4. Respetar el enunciado obliga a recortar.
  'I-01:enunciado': (d) => {
    if (d.tipo !== 'asignacion') return null;
    return {
      ...d,
      filas: d.filas.slice(0, 3),
      columnas: d.columnas.slice(0, 3),
      matriz: d.matriz.slice(0, 3).map((f) => f.slice(0, 3)),
    };
  },

  // I-02 — Los insumos suman L 30 800 y el enunciado declara L 25 000. Respetar
  // el declarado es fijarlo como costo total, con lo que los componentes dejan
  // de sumarlo y las participaciones no cierran en 100 %.
  'I-02:declarado': (d) => (d.tipo === 'productividad' ? { ...d, costoTotalDeclarado: 25000 } : null),

  // I-03 — Conservar el rótulo de la diapositiva es presentar como principal la
  // distribución de 6 730, que es la peor. Se intercambian los dos planos para
  // que el que la aplicación trata como referencia sea el que el docente eligió.
  'I-03:rotulo': (d) => {
    if (d.tipo !== 'distribucion' || d.planoReferencia === null) return null;
    return { ...d, plano: d.planoReferencia, planoReferencia: d.plano };
  },
};

/** Cierto si esa opción de esa inconsistencia cambia los datos del ejercicio. */
export function tieneTransformacion(inconsistenciaId: string, opcionId: string): boolean {
  return `${inconsistenciaId}:${opcionId}` in TRANSFORMACIONES;
}

/**
 * Devuelve el ejercicio con las decisiones aplicadas.
 *
 * Si ninguna decisión lo toca, devuelve exactamente el mismo objeto: así la
 * tienda puede componer la biblioteca entera sin copiar de más.
 */
export function aplicarDecisiones(
  ejercicio: Ejercicio,
  inconsistencias: readonly Inconsistencia[],
): Ejercicio {
  let datos = ejercicio.datos;
  let cambiado = false;

  for (const id of ejercicio.inconsistencias) {
    const inconsistencia = inconsistencias.find((i) => i.id === id);
    if (inconsistencia?.decision == null) continue;

    const transformar = TRANSFORMACIONES[`${id}:${inconsistencia.decision}`];
    if (transformar === undefined) continue;

    const nuevos = transformar(datos);
    if (nuevos === null) continue;

    datos = nuevos;
    cambiado = true;
  }

  if (!cambiado) return ejercicio;

  // Las respuestas guardadas se calcularon sobre los datos originales: con los
  // datos cambiados dirían otra cosa que el procedimiento. Se rehacen.
  const preguntas = preguntasDe(datos, ejercicio.titulo);

  return {
    ...ejercicio,
    datos,
    // Si el tema no tiene constructor de preguntas, se conservan las que había
    // en lugar de dejar el ejercicio sin ninguna.
    preguntas: preguntas.length > 0 ? preguntas : ejercicio.preguntas,
  };
}

/** Aplica las decisiones a toda la biblioteca. */
export function aplicarDecisionesA(
  ejercicios: readonly Ejercicio[],
  inconsistencias: readonly Inconsistencia[],
): Ejercicio[] {
  return ejercicios.map((e) => aplicarDecisiones(e, inconsistencias));
}
