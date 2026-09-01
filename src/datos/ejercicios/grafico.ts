/**
 * Ejercicios del módulo 8 — Método gráfico de programación lineal.
 *
 * Los tres primeros son los de `metodo grafico.pptx`: el fabricante de mesas y
 * sillas y los dos problemas de mezcla de productos con recursos R1 y R2. Los
 * tres restantes son derivados, construidos para cubrir la minimización de
 * costos, un caso infactible y uno no acotado, que el material no incluye.
 *
 * Las respuestas de referencia las calcula el propio motor: no hay ningún
 * número escrito a mano en este archivo.
 */

import type { DatosGrafico, Restriccion } from '@/nucleo/grafico';
import { preguntasGrafico } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio, Moneda } from '@/esquemas';

interface Semilla {
  readonly id: string;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosGrafico, 'titulo'>;
  readonly moneda: Moneda | null;
  readonly origen: 'textual' | 'derivado';
  readonly fuenteId: string | null;
  readonly atribucion: string | null;
  readonly notasDocente: string;
  readonly minutos: number;
  readonly inconsistencias?: readonly string[];
}

const r = (id: string, nombre: string, a: number, b: number, relacion: Restriccion['relacion'], c: number, unidad: string): Restriccion => ({
  id,
  nombre,
  a,
  b,
  relacion,
  c,
  unidad,
});

const SEMILLAS: readonly Semilla[] = [
  {
    id: 'graf-01',
    titulo: 'Fabricante de mesas y sillas',
    contexto: 'agroindustria',
    dificultad: 'basico',
    enunciado:
      'Un fabricante está tratando de decidir sobre las cantidades de producción para dos artículos: mesas y sillas. ' +
      'Se cuenta con 96 unidades de material y 72 unidades de mano de obra. Cada mesa requiere 12 unidades de material y ' +
      '6 horas de mano de obra. Por otra parte, las sillas usan 8 unidades de material cada una y requieren 12 horas de ' +
      'mano de obra por silla. El margen de contribución es el mismo para las mesas que para las sillas: $ 5 por unidad. ' +
      'El fabricante prometió construir por lo menos dos mesas.\n\n' +
      '**Determine cuántas mesas y cuántas sillas conviene producir, y cuál es el margen de contribución total.**',
    datos: {
      objetivo: 'maximizar',
      nombreX: 'mesas',
      nombreY: 'sillas',
      unidadVariables: 'unidades',
      coefX: 5,
      coefY: 5,
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: '$',
      restricciones: [
        r('material', 'Material', 12, 8, '<=', 96, 'unidades'),
        r('mano_obra', 'Mano de obra', 6, 12, '<=', 72, 'horas'),
        r('compromiso', 'Compromiso de mesas', 1, 0, '>=', 2, 'mesas'),
      ],
      noNegatividad: true,
    },
    moneda: null,
    origen: 'textual',
    fuenteId: 'ppt-grafico',
    atribucion: 'Ejemplo de clase — método gráfico',
    notasDocente:
      'Ejemplo clásico del material. Es útil porque el margen es idéntico para ambos productos, así que la decisión no depende ' +
      'de cuál deja más por unidad sino de cuál consume mejor los recursos. La restricción de compromiso (al menos dos mesas) ' +
      'introduce una desigualdad de tipo ≥, que es donde suelen equivocarse al sombrear la región.',
    minutos: 30,
  },
  {
    id: 'graf-02',
    titulo: 'Mezcla de productos con dos recursos',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'Una planta elabora dos productos, A y B, y dispone de dos recursos limitados. Cada unidad del producto A consume ' +
      '60 unidades del recurso 1 y 40 del recurso 2; cada unidad del producto B consume 20 del recurso 1 y 50 del recurso 2. ' +
      'Hay 1 200 unidades disponibles del recurso 1 y 2 000 del recurso 2. El margen de contribución es de $ 3 por unidad ' +
      'del producto A y $ 1,50 por unidad del producto B.\n\n' +
      '**Determine la mezcla de producción que maximiza el margen de contribución total.**\n\n' +
      '> Observe con atención: producir solo A o solo B da el mismo resultado. La combinación de ambos da más. ' +
      'Ese es justamente el aporte de la programación lineal frente a la intuición.',
    datos: {
      objetivo: 'maximizar',
      nombreX: 'A',
      nombreY: 'B',
      unidadVariables: 'unidades',
      coefX: 3,
      coefY: 1.5,
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: '$',
      restricciones: [
        r('r1', 'Recurso 1', 60, 20, '<=', 1200, 'unidades'),
        r('r2', 'Recurso 2', 40, 50, '<=', 2000, 'unidades'),
      ],
      noNegatividad: true,
    },
    moneda: null,
    origen: 'textual',
    fuenteId: 'ppt-grafico',
    atribucion: 'Problema de mezcla de productos — método gráfico',
    notasDocente:
      'Los vértices sobre los ejes dan ambos $ 60, y el vértice interior da $ 76,36. Es el mejor argumento de la clase para ' +
      'mostrar que la solución óptima casi nunca es especializarse en un solo producto. La solución no es entera: conviene ' +
      'discutir qué hacer con eso en la práctica.',
    minutos: 30,
  },
  {
    id: 'graf-03',
    titulo: 'Mezcla con soluciones múltiples',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'La misma planta evalúa otro par de productos. Cada unidad de A consume 4 unidades del recurso 1 y 1 del recurso 2; ' +
      'cada unidad de B consume 2 unidades del recurso 1 y 2 del recurso 2. Hay 16 unidades disponibles del recurso 1 y ' +
      '8 del recurso 2. El margen de contribución es de $ 1 por unidad de A y $ 2 por unidad de B.\n\n' +
      '**Resuelva gráficamente y observe qué ocurre con la línea de indiferencia.**',
    datos: {
      objetivo: 'maximizar',
      nombreX: 'A',
      nombreY: 'B',
      unidadVariables: 'unidades',
      coefX: 1,
      coefY: 2,
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: '$',
      restricciones: [
        r('r1', 'Recurso 1', 4, 2, '<=', 16, 'unidades'),
        r('r2', 'Recurso 2', 1, 2, '<=', 8, 'unidades'),
      ],
      noNegatividad: true,
    },
    moneda: null,
    origen: 'textual',
    fuenteId: 'ppt-grafico',
    atribucion: 'Problema de mezcla de productos — método gráfico',
    notasDocente:
      'Caso de soluciones óptimas múltiples: la función objetivo es paralela a la restricción del recurso 2, así que todo el ' +
      'segmento entre los dos vértices óptimos da el mismo valor. Es el ejemplo ideal para explicar que un empate no es un ' +
      'error del método sino información útil para la gerencia.',
    minutos: 30,
  },
  {
    id: 'graf-04',
    titulo: 'Siembra de maíz y frijol en una finca de Olancho',
    contexto: 'maiz',
    dificultad: 'intermedio',
    enunciado:
      'Una finca dispone de 20 manzanas de tierra preparada, 300 jornales de mano de obra y L 21 000 de capital de trabajo ' +
      'para el ciclo. Cada manzana de maíz requiere 12 jornales y L 900 de insumos, y deja un margen de L 3 500. ' +
      'Cada manzana de frijol requiere 20 jornales y L 1 500 de insumos, y deja un margen de L 5 200.\n\n' +
      '**¿Cuántas manzanas conviene sembrar de cada cultivo? ¿Qué recurso se agota primero?**',
    datos: {
      objetivo: 'maximizar',
      nombreX: 'maíz',
      nombreY: 'frijol',
      unidadVariables: 'manzanas',
      coefX: 3500,
      coefY: 5200,
      nombreObjetivo: 'el margen bruto',
      unidadObjetivo: 'L',
      restricciones: [
        r('tierra', 'Tierra preparada', 1, 1, '<=', 20, 'manzanas'),
        r('jornales', 'Mano de obra', 12, 20, '<=', 300, 'jornales'),
        r('capital', 'Capital de trabajo', 900, 1500, '<=', 21000, 'lempiras'),
      ],
      noNegatividad: true,
    },
    moneda: 'HNL',
    origen: 'derivado',
    fuenteId: null,
    atribucion: 'Caso construido para el módulo',
    notasDocente:
      'Caso construido íntegramente para trasladar el método gráfico al contexto agropecuario de Olancho. Los rendimientos, ' +
      'requerimientos de jornales y márgenes son verosímiles para granos básicos en Honduras, pero no provienen de ningún ' +
      'documento del curso: el docente debería sustituirlos por datos reales de la zona antes de usarlo como referencia técnica.',
    minutos: 35,
  },
  {
    id: 'graf-05',
    titulo: 'Ración de mínimo costo para pollos de engorde',
    contexto: 'avicultura_engorde',
    dificultad: 'avanzado',
    enunciado:
      'Una granja formula una ración mezclando maíz molido y concentrado comercial. Cada kilogramo de maíz aporta 80 gramos ' +
      'de proteína y 3 300 kilocalorías, y cuesta L 9. Cada kilogramo de concentrado aporta 220 gramos de proteína y ' +
      '2 800 kilocalorías, y cuesta L 16. La ración diaria de cada lote debe aportar al menos 1 800 gramos de proteína y ' +
      'al menos 33 000 kilocalorías, y debe pesar al menos 10 kilogramos.\n\n' +
      '**Determine la mezcla de mínimo costo.**\n\n' +
      '> Este problema es de **minimización** y sus restricciones son de tipo ≥. La región factible queda hacia arriba y ' +
      'a la derecha, no acotada por ese lado, y el óptimo se busca desplazando la línea de indiferencia hacia el origen.',
    datos: {
      objetivo: 'minimizar',
      nombreX: 'maíz',
      nombreY: 'concentrado',
      unidadVariables: 'kilogramos',
      coefX: 9,
      coefY: 16,
      nombreObjetivo: 'el costo de la ración',
      unidadObjetivo: 'L',
      restricciones: [
        r('proteina', 'Proteína', 80, 220, '>=', 1800, 'gramos'),
        r('energia', 'Energía', 3300, 2800, '>=', 33000, 'kilocalorías'),
        r('peso', 'Peso mínimo de la ración', 1, 1, '>=', 10, 'kilogramos'),
      ],
      noNegatividad: true,
    },
    moneda: 'HNL',
    origen: 'derivado',
    fuenteId: null,
    atribucion: 'Caso construido para el módulo',
    notasDocente:
      'Caso construido para cubrir la minimización con restricciones ≥, que el material no incluye. Los aportes nutricionales ' +
      'del maíz y de un concentrado comercial son del orden correcto, pero son valores didácticos: para formular una ración ' +
      'real hay que usar la tabla de composición del proveedor y considerar más de dos ingredientes.',
    minutos: 40,
  },
  {
    id: 'graf-06',
    titulo: 'Dos modelos que no tienen solución',
    contexto: 'general',
    dificultad: 'avanzado',
    enunciado:
      'Una cooperativa plantea el siguiente modelo para decidir cuántos quintales de café y de cacao procesar:\n\n' +
      'Maximizar Z = 4 café + 3 cacao, sujeto a que la capacidad de secado no exceda 40 quintales por semana ' +
      '(café + cacao ≤ 40), pero además el contrato de exportación obliga a entregar al menos 60 quintales semanales en ' +
      'total (café + cacao ≥ 60).\n\n' +
      '**Grafique el modelo y explique qué está ocurriendo. ¿Qué debe hacer la gerencia?**\n\n' +
      '> Este ejercicio no tiene una respuesta numérica. Su objetivo es que reconozca un modelo **infactible** y sepa qué ' +
      'decir cuando el método no devuelve una solución: el problema no está en el método, está en las condiciones.',
    datos: {
      objetivo: 'maximizar',
      nombreX: 'café',
      nombreY: 'cacao',
      unidadVariables: 'quintales',
      coefX: 4,
      coefY: 3,
      nombreObjetivo: 'el margen',
      unidadObjetivo: 'L',
      restricciones: [
        r('secado', 'Capacidad de secado', 1, 1, '<=', 40, 'quintales'),
        r('contrato', 'Compromiso de exportación', 1, 1, '>=', 60, 'quintales'),
      ],
      noNegatividad: true,
    },
    moneda: 'HNL',
    origen: 'derivado',
    fuenteId: null,
    atribucion: 'Caso construido para el módulo',
    notasDocente:
      'Caso construido para enseñar a reconocer la infactibilidad. La región factible está vacía porque el contrato exige más ' +
      'de lo que la capacidad permite. La respuesta correcta no es un número: es identificar que hay que ampliar el secado, ' +
      'renegociar el contrato o subcontratar. Conviene usarlo después de que hayan resuelto varios problemas normales.',
    minutos: 25,
  },
];

export const EJERCICIOS_GRAFICO: readonly Ejercicio[] = SEMILLAS.map((s) => ({
  id: s.id,
  titulo: s.titulo,
  tema: 'grafico' as const,
  metodo: 'Método gráfico de programación lineal',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: {
    tipo: 'grafico' as const,
    objetivo: s.datos.objetivo,
    nombreX: s.datos.nombreX,
    nombreY: s.datos.nombreY,
    unidadVariables: s.datos.unidadVariables,
    coefX: s.datos.coefX,
    coefY: s.datos.coefY,
    nombreObjetivo: s.datos.nombreObjetivo,
    unidadObjetivo: s.datos.unidadObjetivo,
    restricciones: s.datos.restricciones.map((x) => ({ ...x })),
    noNegatividad: s.datos.noNegatividad,
  },
  preguntas: preguntasGrafico({ ...s.datos, titulo: s.titulo }),
  moneda: s.moneda,
  unidades: [s.datos.unidadVariables, s.datos.unidadObjetivo],
  tiempoEstimadoMinutos: s.minutos,
  origen: s.origen,
  validacion: 'verificado' as const,
  fuenteId: s.fuenteId,
  atribucion: s.atribucion,
  inconsistencias: [...(s.inconsistencias ?? [])],
  notasDocente: s.notasDocente,
  semilla: null,
  creadoEn: s.origen === 'textual' ? '2011-11-01T00:00:00.000Z' : '2026-08-28T00:00:00.000Z',
  modificadoEn: '2026-08-28T00:00:00.000Z',
}));
