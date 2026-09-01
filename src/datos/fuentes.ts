/**
 * Fuentes verificables. Ninguna fue inventada: la bibliografía proviene
 * literalmente de `Fundamentos de Gestion Operaciones.docx` y los materiales
 * del curso están identificados por su archivo de origen.
 */

import type { Fuente } from '@/esquemas';

export const FUENTES: readonly Fuente[] = [
  {
    id: 'chase2021',
    cita: 'Chase, R. B., Jacobs, F. R., & Aquilano, N. J. (2021). Administración de operaciones: Producción y cadena de suministros (15.ª ed.). McGraw-Hill.',
    tipo: 'libro',
    archivo: null,
    anio: 2021,
  },
  {
    id: 'heizer2020',
    cita: 'Heizer, J., Render, B., & Munson, C. (2020). Dirección de la producción y operaciones (12.ª ed.). Pearson Educación.',
    tipo: 'libro',
    archivo: null,
    anio: 2020,
  },
  {
    id: 'robbins2022',
    cita: 'Robbins, S. P., & Coulter, M. (2022). Administración (15.ª ed.). Pearson.',
    tipo: 'libro',
    archivo: null,
    anio: 2022,
  },
  {
    id: 'russell2019',
    cita: 'Russell, R. S., & Taylor, B. W. (2019). Operations management: Creating value along the supply chain (8th ed.). Wiley.',
    tipo: 'libro',
    archivo: null,
    anio: 2019,
  },
  {
    id: 'stevenson2021',
    cita: 'Stevenson, W. J. (2021). Operations management (14th ed.). McGraw-Hill Education.',
    tipo: 'libro',
    archivo: null,
    anio: 2021,
  },

  {
    id: 'doc-fundamentos',
    cita: 'Ardón, G. A. (2025). Fundamentos de Gestión de Operaciones. Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Fundamentos de Gestion Operaciones.docx',
    anio: 2025,
  },
  {
    id: 'doc-tarea1',
    cita: 'Ardón, G. A. (2025). Tarea Semana 1: Análisis sistémico de una organización de la comunidad. Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Tarea semana 1.docx',
    anio: 2025,
  },
  {
    id: 'doc-productividad',
    cita: 'Ardón, G. A. (2025, junio). Ejercicios de productividad. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Ejercicios de productividad.docx',
    anio: 2025,
  },
  {
    id: 'doc-localizacion',
    cita: 'Ardón, G. A. (2026). Ejercicios de localización. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'ejercicios de localizacion.docx',
    anio: 2026,
  },
  {
    id: 'doc-redes',
    cita: 'Ardón, G. A. (2025, julio). Ejercicios de diagrama de redes y ruta crítica. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Diagrama de redes y ruta critica.docx',
    anio: 2025,
  },
  {
    id: 'doc-pert',
    cita: 'Ardón, G. A. (2025, agosto). Ejercicios PERT. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Ejercicios de Pert.docx',
    anio: 2025,
  },
  {
    id: 'doc-asignacion',
    cita: 'Ardón, G. A. (2025, agosto). Ejercicios de asignación. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Ejercicios de Asignación.docx',
    anio: 2025,
  },
  {
    id: 'doc-transporte',
    cita: 'Ardón, G. A. (2025, agosto). Ejercicios de transporte. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Ejercicios de Transporte.docx',
    anio: 2025,
  },
  {
    id: 'ppt-cargadistancia',
    cita: 'Ardón, G. A. (2022). Decisiones de localización: método de puntaje ponderado, carga-distancia y centro de gravedad [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'metodo carga distancia 2022.pptx',
    anio: 2022,
  },
  {
    id: 'ppt-grafico',
    cita: 'Ardón, G. A. (2011). Programación lineal: método gráfico [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'metodo grafico.pptx',
    anio: 2011,
  },
  {
    id: 'ppt-distribucion',
    cita: 'Ardón, G. A. (2025). Distribución física I, II y III [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'Distribución 2025.pptx',
    anio: 2025,
  },
  {
    id: 'ppt-distribucion-2026',
    cita: 'Ardón, G. A. (2026). Distribución física I, II y III [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'Distribución 2026.pdf',
    anio: 2026,
  },
  {
    id: 'ppt-inventario',
    cita: 'Ardón, G. A. (2022). Sistemas y modelos de inventarios [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'Manejo de inventario.pptx',
    anio: 2022,
  },
  {
    id: 'ppt-equilibrio',
    cita: 'Ardón, G. A. (2025). Análisis de punto de equilibrio [Presentación]. Universidad Nacional de Agricultura.',
    tipo: 'presentacion_curso',
    archivo: 'Punto de Equilibrio.pptx',
    anio: 2025,
  },
  {
    id: 'doc-equilibrio-avicola',
    cita: 'Ardón, G. A. (2026). Ejercicio de punto de equilibrio: granja avícola [Solución desarrollada]. Investigación de Operaciones, Universidad Nacional de Agricultura.',
    tipo: 'documento_curso',
    archivo: 'Ejercicio_punto_de_equilibrio_granja_avicola.pdf',
    anio: 2026,
  },
];

export function fuentePorId(id: string | null): Fuente | null {
  if (id === null) return null;
  return FUENTES.find((f) => f.id === id) ?? null;
}
