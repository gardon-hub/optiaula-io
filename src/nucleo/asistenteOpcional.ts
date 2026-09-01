/**
 * Arquitectura opcional para un asistente de IA.
 *
 * **Está desactivada por defecto y la aplicación no la necesita para nada.**
 * Toda la retroalimentación de la versión 1.0 la produce el motor determinista
 * de `retroalimentacion.ts`, sin costo recurrente ni conexión a internet.
 *
 * Este archivo existe para que conectar un asistente en el futuro sea una
 * decisión de configuración y no una reescritura: define el contrato, valida
 * que esté habilitado y falla de forma segura si no lo está.
 */

import type { Ejercicio, Pregunta } from '@/esquemas';
import type { Evaluacion } from './retroalimentacion';

export interface ConfiguracionAsistente {
  readonly habilitado: boolean;
  readonly proveedor: string;
  readonly modelo: string;
  readonly urlBase: string;
}

export interface ConsultaAsistente {
  readonly ejercicio: Ejercicio;
  readonly pregunta: Pregunta;
  readonly respuestaEstudiante: string;
  /** Evaluación determinista ya calculada. El asistente la amplía, no la sustituye. */
  readonly evaluacionDeterminista: Evaluacion;
}

export interface RespuestaAsistente {
  readonly disponible: boolean;
  readonly texto: string;
  /** Siempre verdadero cuando el texto proviene de un modelo. */
  readonly generadoAutomaticamente: boolean;
}

/**
 * Contrato que debe implementar cualquier proveedor futuro.
 * La aplicación nunca llama directamente a una API: llama a esta interfaz.
 */
export interface ProveedorAsistente {
  readonly nombre: string;
  responder(consulta: ConsultaAsistente, config: ConfiguracionAsistente): Promise<RespuestaAsistente>;
}

const PROVEEDORES = new Map<string, ProveedorAsistente>();

/** Registra un proveedor. No hay ninguno registrado en la versión 1.0. */
export function registrarProveedor(proveedor: ProveedorAsistente): void {
  PROVEEDORES.set(proveedor.nombre, proveedor);
}

export function proveedoresDisponibles(): readonly string[] {
  return [...PROVEEDORES.keys()];
}

/**
 * Punto único de entrada. Devuelve `disponible: false` mientras el asistente
 * esté apagado o no haya proveedor registrado, y en ese caso la interfaz
 * simplemente no muestra nada extra.
 */
export async function consultarAsistente(
  consulta: ConsultaAsistente,
  config: ConfiguracionAsistente,
): Promise<RespuestaAsistente> {
  if (!config.habilitado) {
    return {
      disponible: false,
      texto:
        'El asistente de IA está desactivado. Toda la retroalimentación proviene del motor determinista de la aplicación, ' +
        'que funciona sin conexión y sin costo.',
      generadoAutomaticamente: false,
    };
  }

  const proveedor = PROVEEDORES.get(config.proveedor);
  if (!proveedor) {
    return {
      disponible: false,
      texto: `No hay ningún proveedor registrado con el nombre "${config.proveedor}".`,
      generadoAutomaticamente: false,
    };
  }

  try {
    const r = await proveedor.responder(consulta, config);
    return { ...r, generadoAutomaticamente: true };
  } catch (e) {
    return {
      disponible: false,
      texto: `El asistente no respondió: ${e instanceof Error ? e.message : 'error desconocido'}. La retroalimentación determinista sigue disponible.`,
      generadoAutomaticamente: false,
    };
  }
}

/**
 * Leyenda obligatoria de integridad académica. Cualquier texto producido por un
 * modelo debe mostrarse acompañado de esta declaración.
 */
export const LEYENDA_GENERADO_AUTOMATICAMENTE =
  'Este texto fue generado automáticamente por un modelo de lenguaje. Verifíquelo antes de usarlo como referencia académica.';
