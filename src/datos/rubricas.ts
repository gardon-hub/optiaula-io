/**
 * Rúbricas para calificar las respuestas de interpretación.
 *
 * La primera es la del curso, transcrita de `Tarea semana 1.docx` con sus seis
 * criterios, sus pesos y los descriptores de sus cuatro niveles: nada de esto
 * se inventó. La segunda la escribió la aplicación para las preguntas de
 * interpretación cortas, que no tienen rúbrica en ningún material, y por eso
 * viaja marcada como `propuesta`: la interfaz lo dice y el docente puede
 * ignorarla y calificar a mano.
 *
 * La escala de niveles es la misma en las dos —100 %, 80 %, 40 % y 10 %—
 * porque es la que usa el curso.
 */

import type { Rubrica } from '@/esquemas';

/** Los cuatro niveles de la rúbrica del curso, sin descriptores. */
const NIVELES = [
  { id: 'excelente', nombre: 'Excelente', porcentaje: 100 },
  { id: 'bueno', nombre: 'Bueno', porcentaje: 80 },
  { id: 'mejorar', nombre: 'Necesita mejorar', porcentaje: 40 },
  { id: 'insuficiente', nombre: 'Insuficiente', porcentaje: 10 },
] as const;

/** Arma los cuatro niveles con los descriptores de un criterio concreto. */
const niveles = (excelente: string, bueno: string, mejorar: string, insuficiente: string) =>
  NIVELES.map((n, i) => ({ ...n, descripcion: [excelente, bueno, mejorar, insuficiente][i] ?? '' }));

export const RUBRICAS: readonly Rubrica[] = [
  {
    id: 'rubrica-tarea1',
    nombre: 'Ensayo de análisis sistémico',
    descripcion:
      'La rúbrica de la Tarea Semana 1, con sus seis criterios y sus descriptores por nivel. Está pensada para el ' +
      'ensayo técnico sobre una organización de la comunidad.',
    origen: 'textual',
    fuenteId: 'doc-tarea1',
    atribucion: 'Rúbrica de evaluación — Tarea semana 1.docx',
    criterios: [
      {
        id: 'componentes',
        nombre: 'Análisis de componentes del sistema',
        peso: 30,
        niveles: niveles(
          'Identifica y explica con claridad entradas, procesos, salidas, retroalimentación y ambiente externo.',
          'Identifica 4 de los 5 componentes del sistema.',
          'Solo identifica 2–3 componentes con explicaciones limitadas.',
          'No identifica ni explica los componentes del sistema.',
        ),
      },
      {
        id: 'tipo',
        nombre: 'Diferenciación tipo de organización',
        peso: 15,
        niveles: niveles(
          'Justifica con claridad si es manufactura o servicio, usando 3 o más criterios.',
          'Usa 2 criterios para justificar su clasificación.',
          'Solo 1 criterio o clasificación dudosa.',
          'No establece diferenciación clara.',
        ),
      },
      {
        id: 'decisiones',
        nombre: 'Decisiones del gerente de operaciones',
        peso: 15,
        niveles: niveles(
          'Describe al menos 3 decisiones claras y pertinentes.',
          'Describe 2 decisiones.',
          'Solo 1 decisión o poco clara.',
          'No se identifican decisiones.',
        ),
      },
      {
        id: 'mejora',
        nombre: 'Propuesta de mejora',
        peso: 10,
        niveles: niveles(
          'Propone mejora viable y relacionada con el análisis sistémico.',
          'Mejora válida pero poco desarrollada.',
          'Mejora genérica sin fundamento técnico.',
          'No propone mejora.',
        ),
      },
      {
        id: 'redaccion',
        nombre: 'Estructura y redacción',
        peso: 15,
        niveles: niveles(
          'Ensayo bien organizado, coherente, sin errores ortográficos.',
          'Buena redacción con leves errores.',
          'Errores frecuentes de forma o estructura.',
          'Redacción deficiente o sin coherencia.',
        ),
      },
      {
        id: 'bibliografia',
        nombre: 'Bibliografía y formato',
        peso: 15,
        niveles: niveles(
          'Usa al menos 2 fuentes confiables en APA 7ma.',
          'Usa 1 fuente en formato correcto.',
          'Citas incompletas o mal formateadas.',
          'No se usan fuentes ni formato académico.',
        ),
      },
    ],
  },
  {
    id: 'rubrica-interpretacion',
    nombre: 'Interpretación de un resultado',
    descripcion:
      'Para las preguntas de interpretación de los ejercicios, que piden explicar o decidir en pocas líneas. Ningún ' +
      'material del curso trae una rúbrica para ellas: esta la propone la aplicación y el docente puede cambiarla o ' +
      'calificar sin rúbrica. Los niveles sí son los del curso.',
    origen: 'propuesta',
    fuenteId: null,
    atribucion: 'Propuesta de la aplicación. Los niveles son los de la rúbrica de Tarea Semana 1.',
    criterios: [
      {
        id: 'responde',
        nombre: 'Responde lo que se pregunta',
        peso: 35,
        niveles: niveles(
          'Contesta las dos partes de la pregunta de forma directa y sin rodeos.',
          'Contesta lo esencial, pero deja alguna parte sin atender.',
          'Responde de forma vaga o se desvía del asunto.',
          'No responde la pregunta.',
        ),
      },
      {
        id: 'usa_resultados',
        nombre: 'Usa los resultados del ejercicio',
        peso: 30,
        niveles: niveles(
          'Cita las cifras que calculó y las lee correctamente.',
          'Menciona los resultados sin apoyarse del todo en ellos.',
          'Habla en general, casi sin usar los números del problema.',
          'No usa ningún resultado del ejercicio.',
        ),
      },
      {
        id: 'justifica',
        nombre: 'Justifica la decisión',
        peso: 25,
        niveles: niveles(
          'Explica por qué, con un argumento del método y no solo una opinión.',
          'Justifica, aunque el argumento queda a medio desarrollar.',
          'Afirma sin sostener el porqué.',
          'No hay justificación.',
        ),
      },
      {
        id: 'claridad',
        nombre: 'Claridad de la redacción',
        peso: 10,
        niveles: niveles(
          'Se entiende de una lectura, con los términos del tema bien usados.',
          'Se entiende, con alguna imprecisión de lenguaje.',
          'Cuesta seguir el razonamiento.',
          'No se entiende qué quiere decir.',
        ),
      },
    ],
  },
];

export function rubricaPorId(id: string | null): Rubrica | null {
  if (id === null) return null;
  return RUBRICAS.find((r) => r.id === id) ?? null;
}

/**
 * Qué rúbrica ofrecer por omisión. El ensayo de la Tarea Semana 1 es el único
 * ejercicio del curso con rúbrica propia; el resto son interpretaciones cortas.
 */
export function rubricaSugerida(ejercicioId: string): Rubrica {
  const propia = ejercicioId === 'fund-02' ? rubricaPorId('rubrica-tarea1') : null;
  return propia ?? rubricaPorId('rubrica-interpretacion')!;
}
