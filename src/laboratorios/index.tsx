/**
 * Despachador de laboratorios: elige el laboratorio que corresponde al tipo de
 * datos del ejercicio.
 */

import type { ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import { LabFundamentos } from './LabFundamentos';
import { LabProductividad } from './LabProductividad';
import { LabLocalizacion } from './LabLocalizacion';
import { LabDistribucion } from './LabDistribucion';
import { LabEquilibrio } from './LabEquilibrio';
import { LabCPM } from './LabCPM';
import { LabPERT } from './LabPERT';
import { LabGrafico } from './LabGrafico';
import { LabSimplex } from './LabSimplex';
import { LabAsignacion } from './LabAsignacion';
import { LabTransporte } from './LabTransporte';
import { LabInventarios } from './LabInventarios';
import { LabColas } from './LabColas';

export interface PropiedadesLaboratorio {
  readonly datos: DatosEjercicio;
  readonly titulo: string;
  /** En modo docente y proyección se muestra todo el procedimiento de una vez. */
  readonly revelarTodo: boolean;
  /** En modo proyección se pueden ocultar los resultados antes de revelarlos. */
  readonly ocultarResultados: boolean;
}

export function Laboratorio({ datos, titulo, revelarTodo, ocultarResultados }: PropiedadesLaboratorio): ReactNode {
  const comunes = { titulo, revelarTodo, ocultarResultados };

  switch (datos.tipo) {
    case 'fundamentos':
      return <LabFundamentos datosIniciales={datos} {...comunes} />;
    case 'productividad':
      return <LabProductividad datosIniciales={datos} {...comunes} />;
    case 'localizacion':
      return <LabLocalizacion datosIniciales={datos} {...comunes} />;
    case 'distribucion':
      return <LabDistribucion datosIniciales={datos} {...comunes} />;
    case 'equilibrio':
      return <LabEquilibrio datosIniciales={datos} {...comunes} />;
    case 'cpm':
      return <LabCPM datosIniciales={datos} {...comunes} />;
    case 'pert':
      return <LabPERT datosIniciales={datos} {...comunes} />;
    case 'grafico':
      return <LabGrafico datosIniciales={datos} {...comunes} />;
    case 'simplex':
      return <LabSimplex datosIniciales={datos} {...comunes} />;
    case 'asignacion':
      return <LabAsignacion datosIniciales={datos} {...comunes} />;
    case 'transporte':
      return <LabTransporte datosIniciales={datos} {...comunes} />;
    case 'inventarios':
      return <LabInventarios datosIniciales={datos} {...comunes} />;
    case 'colas':
      return <LabColas datosIniciales={datos} {...comunes} />;
  }
}

export {
  LabFundamentos,
  LabProductividad,
  LabLocalizacion,
  LabDistribucion,
  LabEquilibrio,
  LabCPM,
  LabPERT,
  LabGrafico,
  LabSimplex,
  LabAsignacion,
  LabTransporte,
  LabInventarios,
  LabColas,
};
