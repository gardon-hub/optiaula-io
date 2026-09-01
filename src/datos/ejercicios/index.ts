/**
 * Biblioteca de ejercicios inicial.
 *
 * Se ensambla a partir de los materiales del curso. Todo se valida contra el
 * esquema Zod al arrancar: si un ejercicio no cumple el contrato, no entra a la
 * biblioteca y queda registrado como error de carga en lugar de romper la
 * aplicación.
 */

import { esquemaEjercicio, validar, type Ejercicio, type Tema } from '@/esquemas';
import { EJERCICIOS_PRODUCTIVIDAD } from './productividad';
import { EJERCICIOS_ASIGNACION } from './asignacion';
import { EJERCICIOS_TRANSPORTE } from './transporte';
import { EJERCICIOS_CPM, EJERCICIOS_CRASHING, EJERCICIOS_PERT } from './redes';
import { EJERCICIOS_COLAS, EJERCICIOS_INVENTARIOS } from './operaciones';
import { EJERCICIOS_LOCALIZACION, EJERCICIOS_DISTRIBUCION } from './instalaciones';
import { EJERCICIOS_GRAFICO } from './grafico';
import { EJERCICIOS_SIMPLEX } from './simplex';
import { EJERCICIOS_EQUILIBRIO, EJERCICIOS_FUNDAMENTOS } from './gestion';

const CRUDOS: readonly Ejercicio[] = [
  ...EJERCICIOS_FUNDAMENTOS,
  ...EJERCICIOS_PRODUCTIVIDAD,
  ...EJERCICIOS_LOCALIZACION,
  ...EJERCICIOS_DISTRIBUCION,
  ...EJERCICIOS_EQUILIBRIO,
  ...EJERCICIOS_CPM,
  ...EJERCICIOS_CRASHING,
  ...EJERCICIOS_INVENTARIOS,
  ...EJERCICIOS_COLAS,
  ...EJERCICIOS_PERT,
  ...EJERCICIOS_GRAFICO,
  ...EJERCICIOS_SIMPLEX,
  ...EJERCICIOS_ASIGNACION,
  ...EJERCICIOS_TRANSPORTE,
];

export interface CargaBiblioteca {
  readonly ejercicios: readonly Ejercicio[];
  readonly rechazados: readonly { readonly id: string; readonly errores: readonly string[] }[];
}

function cargar(): CargaBiblioteca {
  const ejercicios: Ejercicio[] = [];
  const rechazados: { id: string; errores: string[] }[] = [];
  const vistos = new Set<string>();

  for (const crudo of CRUDOS) {
    const r = validar(esquemaEjercicio, crudo);
    if (!r.ok || r.datos === null) {
      rechazados.push({ id: crudo.id ?? '(sin id)', errores: [...r.errores] });
      continue;
    }
    if (vistos.has(r.datos.id)) {
      rechazados.push({ id: r.datos.id, errores: ['identificador duplicado en la biblioteca inicial'] });
      continue;
    }
    vistos.add(r.datos.id);
    ejercicios.push(r.datos);
  }

  return { ejercicios, rechazados };
}

const CARGA = cargar();

export const BIBLIOTECA_INICIAL: readonly Ejercicio[] = CARGA.ejercicios;
export const EJERCICIOS_RECHAZADOS = CARGA.rechazados;

export function ejerciciosDeTema(tema: Tema, biblioteca: readonly Ejercicio[] = BIBLIOTECA_INICIAL): Ejercicio[] {
  return biblioteca.filter((e) => e.tema === tema);
}

export function ejercicioPorId(id: string, biblioteca: readonly Ejercicio[] = BIBLIOTECA_INICIAL): Ejercicio | null {
  return biblioteca.find((e) => e.id === id) ?? null;
}

export {
  EJERCICIOS_PRODUCTIVIDAD,
  EJERCICIOS_ASIGNACION,
  EJERCICIOS_TRANSPORTE,
  EJERCICIOS_CPM,
  EJERCICIOS_CRASHING,
  EJERCICIOS_INVENTARIOS,
  EJERCICIOS_COLAS,
  EJERCICIOS_PERT,
  EJERCICIOS_GRAFICO,
  EJERCICIOS_LOCALIZACION,
  EJERCICIOS_DISTRIBUCION,
  EJERCICIOS_EQUILIBRIO,
  EJERCICIOS_FUNDAMENTOS,
};
