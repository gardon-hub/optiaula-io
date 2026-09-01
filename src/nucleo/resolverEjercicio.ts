/**
 * Resolver un ejercicio sin saber de qué tema es.
 *
 * Las pantallas que trabajan con ejercicios cualesquiera —el centro de reportes,
 * el editor del panel docente— necesitan preguntarle al motor si un ejercicio
 * tiene solución y qué diagnósticos produce, sin repetir en cada sitio el
 * despacho por tipo. Vivía duplicado dentro de una pantalla; aquí queda una vez.
 */

import type { Ejercicio } from '@/esquemas';
import type { Diagnostico, Resultado } from './tipos';
import { resolverProductividad } from './productividad';
import { resolverCargaDistancia, resolverPuntajePonderado } from './localizacion';
import { resolverDistribucion } from './distribucion';
import { resolverEquilibrio, resolverEquilibrioMultiproducto } from './equilibrio';
import { resolverCPM } from './cpm';
import { resolverPERT } from './pert';
import { resolverGrafico } from './grafico';
import { resolverSimplex } from './simplex';
import { resolverAsignacion } from './asignacion';
import { resolverTransporte } from './transporte';
import { resolverInventarios } from './inventarios';
import { resolverColas } from './colas';

/**
 * Devuelve el resultado del solucionador que corresponde, o `null` cuando el
 * tipo no tiene uno: los ejercicios de fundamentos son de clasificación, no de
 * cálculo, y los de localización sin sitios ni puntos no tienen qué resolver.
 */
export function resolverEjercicio(ejercicio: Ejercicio): Resultado<unknown> | null {
  const d = ejercicio.datos;
  const titulo = ejercicio.titulo;

  switch (d.tipo) {
    case 'productividad':
      return resolverProductividad({ ...d, titulo, periodo: '' });

    case 'localizacion':
      if (d.factores.length > 0 && d.sitios.length > 0) {
        return resolverPuntajePonderado({ ...d, titulo });
      }
      if (d.puntos.length > 0 && d.sitios.length > 0) {
        return resolverCargaDistancia({
          titulo,
          puntos: d.puntos,
          candidatos: d.sitios,
          tipoDistancia: d.tipoDistancia,
          unidadCarga: d.unidadCarga,
          unidadDistancia: d.unidadDistancia,
        });
      }
      return null;

    case 'distribucion':
      return resolverDistribucion({ ...d, titulo });

    case 'equilibrio':
      return d.modo === 'simple'
        ? resolverEquilibrio({ ...d, titulo })
        : resolverEquilibrioMultiproducto({
            titulo,
            moneda: d.moneda,
            costosFijos: d.costosFijos,
            baseMezcla: d.baseMezcla,
            productos: d.productos.map((x) => ({ ...x })),
          });

    case 'cpm':
      return resolverCPM({ ...d, titulo });

    case 'pert':
      return d.modo === 'red' ? resolverPERT({ ...d, titulo }) : null;

    case 'grafico':
      return resolverGrafico({ ...d, titulo });

    case 'simplex':
      return resolverSimplex({ ...d, titulo });

    case 'asignacion':
      return resolverAsignacion({ ...d, titulo });

    case 'transporte':
      return resolverTransporte({ ...d, titulo }, d.metodoInicialSugerido);

    case 'inventarios':
      return resolverInventarios({ ...d, titulo });

    case 'colas':
      return resolverColas({ ...d, titulo });

    case 'fundamentos':
      return null;
  }
}

/**
 * Diagnósticos del motor para un ejercicio. Sirve para avisar en el acto de que
 * unos datos editados dejaron el ejercicio sin solución, que es algo que el
 * esquema no puede detectar: una red con un ciclo valida perfectamente.
 */
export function diagnosticosDe(ejercicio: Ejercicio): readonly Diagnostico[] {
  return resolverEjercicio(ejercicio)?.diagnosticos ?? [];
}
