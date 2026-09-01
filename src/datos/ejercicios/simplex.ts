/**
 * Ejercicios del módulo 9 — Método simplex.
 *
 * El simplex no aparece en ninguno de los materiales del curso ni en la
 * programación del ciclo: se incorporó a petición del docente. Por eso **los
 * ocho ejercicios están marcados como derivados**, ninguno como textual, y
 * ninguno cita una fuente documental que no exista. Queda registrado como
 * inconsistencia I-11 en el panel de auditoría.
 *
 * `simp-02` repite deliberadamente el problema de mesas y sillas del módulo 8.
 * Resolverlo por los dos caminos y obtener el mismo vértice es la mejor prueba
 * de que el simplex no es otra cosa que recorrer esquinas con álgebra.
 *
 * Las respuestas de referencia las calcula el propio motor: no hay ningún
 * número escrito a mano en este archivo.
 */

import type { DatosSimplex, RestriccionSimplex } from '@/nucleo/simplex';
import { preguntasSimplex } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio, Moneda } from '@/esquemas';

interface Semilla {
  readonly id: string;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosSimplex, 'titulo'>;
  readonly moneda: Moneda | null;
  readonly notasDocente: string;
  readonly minutos: number;
}

const v = (id: string, nombre: string, coeficiente: number) => ({ id, nombre, coeficiente });

const r = (
  id: string,
  nombre: string,
  coeficientes: readonly number[],
  relacion: RestriccionSimplex['relacion'],
  c: number,
  unidad: string,
): RestriccionSimplex => ({ id, nombre, coeficientes, relacion, c, unidad });

const SEMILLAS: readonly Semilla[] = [
  {
    id: 'simp-01',
    titulo: 'Quesería con tres productos',
    contexto: 'lacteos',
    dificultad: 'basico',
    enunciado:
      'Una quesería de Catacamas procesa leche en tres productos: queso fresco, cuajada y mantequilla. ' +
      'Cada quintal de queso fresco consume 8 litros de leche, 2 horas-hombre de proceso y 1 espacio de empaque; ' +
      'cada quintal de cuajada consume 6 litros, 1 hora-hombre y 1 espacio; cada quintal de mantequilla consume ' +
      '12 litros, 3 horas-hombre y 1 espacio. En la jornada se dispone de 560 litros de leche, 125 horas-hombre ' +
      'de proceso y 70 espacios de empaque. El margen de contribución es de L 66 por quintal de queso fresco, ' +
      'L 46 por el de cuajada y L 96 por el de mantequilla.\n\n' +
      '**Determine el plan de producción que maximiza el margen total.**\n\n' +
      '> Con tres productos ya no hay dibujo posible: la región factible es un poliedro en el espacio. ' +
      'Este es el problema más pequeño que obliga a dejar el método gráfico.',
    datos: {
      objetivo: 'maximizar',
      variables: [v('queso', 'queso fresco', 66), v('cuajada', 'cuajada', 46), v('mantequilla', 'mantequilla', 96)],
      unidadVariables: 'quintales',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: 'L',
      restricciones: [
        r('leche', 'Leche', [8, 6, 12], '<=', 560, 'litros'),
        r('proceso', 'Horas de proceso', [2, 1, 3], '<=', 125, 'horas-hombre'),
        r('empaque', 'Empaque', [1, 1, 1], '<=', 70, 'espacios'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'Ejemplo resuelto del módulo. Todas las restricciones son ≤ con lado derecho positivo, así que las holguras forman la base inicial ' +
      'y no hace falta la fase 1: es el caso más limpio para presentar el tableau. Los datos están construidos para que el óptimo use los ' +
      'tres productos y agote los tres recursos, sin degeneración: cada precio sombra es único y positivo, y el estudiante puede ordenarlos ' +
      'para decidir dónde invertir primero. El caso del recurso que sobra —precio sombra cero— se ve en simp-02 y simp-03.',
    minutos: 35,
  },
  {
    id: 'simp-02',
    titulo: 'Mesas y sillas, ahora por simplex',
    contexto: 'agroindustria',
    dificultad: 'basico',
    enunciado:
      'Es el mismo problema del módulo 8. Un fabricante decide cuántas mesas y cuántas sillas producir. ' +
      'Dispone de 96 unidades de material y 72 horas de mano de obra. Cada mesa requiere 12 unidades de material ' +
      'y 6 horas; cada silla, 8 unidades de material y 12 horas. El margen de contribución es de $ 5 por unidad ' +
      'en ambos productos. El fabricante prometió construir por lo menos dos mesas.\n\n' +
      '**Resuélvalo por el método simplex y compare el resultado con el que obtuvo gráficamente.**\n\n' +
      '> El compromiso de las dos mesas es una restricción ≥, así que este modelo necesita variable de exceso, ' +
      'variable artificial y las dos fases. Es el ejemplo más corto que las exige.',
    datos: {
      objetivo: 'maximizar',
      variables: [v('mesas', 'mesas', 5), v('sillas', 'sillas', 5)],
      unidadVariables: 'unidades',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: '$',
      restricciones: [
        r('material', 'Material', [12, 8], '<=', 96, 'unidades'),
        r('mano_obra', 'Mano de obra', [6, 12], '<=', 72, 'horas'),
        r('compromiso', 'Compromiso de mesas', [1, 0], '>=', 2, 'mesas'),
      ],
    },
    moneda: null,
    notasDocente:
      'Puente entre los módulos 8 y 9. El vértice óptimo es el mismo que da el método gráfico —6 mesas y 3 sillas, Z = 45— y los precios ' +
      'sombra también coinciden: 5/16 el material y 5/24 la mano de obra. Hacer las dos resoluciones en la misma clase es el argumento más ' +
      'sólido de que el simplex no inventa nada nuevo, solo prescinde del dibujo.',
    minutos: 40,
  },
  {
    id: 'simp-03',
    titulo: 'Plan de siembra con tres cultivos',
    contexto: 'maiz',
    dificultad: 'intermedio',
    enunciado:
      'Una finca de Olancho dispone de 60 manzanas preparadas, 900 jornales para el ciclo, 480 horas de tractor y ' +
      'L 540 000 de capital de trabajo. Puede sembrar maíz, frijol o sorgo. Cada manzana de maíz requiere 12 jornales, ' +
      '8 horas de tractor y L 9 000 de insumos, y deja un margen bruto de L 14 000; cada manzana de frijol requiere ' +
      '25 jornales, 6 horas de tractor y L 12 000, y deja L 20 000; cada manzana de sorgo requiere 10 jornales, ' +
      '10 horas de tractor y L 6 000, y deja L 9 000.\n\n' +
      '**Determine cuántas manzanas sembrar de cada cultivo para maximizar el margen bruto total, y señale qué ' +
      'recursos quedan agotados.**',
    datos: {
      objetivo: 'maximizar',
      variables: [v('maiz', 'maíz', 14000), v('frijol', 'frijol', 20000), v('sorgo', 'sorgo', 9000)],
      unidadVariables: 'manzanas',
      nombreObjetivo: 'el margen bruto',
      unidadObjetivo: 'L',
      restricciones: [
        r('tierra', 'Tierra preparada', [1, 1, 1], '<=', 60, 'manzanas'),
        r('jornales', 'Jornales', [12, 25, 10], '<=', 900, 'jornales'),
        r('tractor', 'Horas de tractor', [8, 6, 10], '<=', 480, 'horas'),
        r('capital', 'Capital de trabajo', [9000, 12000, 6000], '<=', 540000, 'lempiras'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'Práctica guiada del módulo. Cuatro restricciones y tres variables: el tableau tiene siete columnas y sigue cabiendo en la pizarra. ' +
      'Es útil pedir que antes de calcular predigan qué cultivo quedará fuera y por qué; el margen por manzana engaña, porque lo que decide ' +
      'es el margen por unidad de recurso escaso.',
    minutos: 45,
  },
  {
    id: 'simp-04',
    titulo: 'Ración de mínimo costo para pollos de engorde',
    contexto: 'avicultura_engorde',
    dificultad: 'avanzado',
    enunciado:
      'Se quiere formular 100 kg de una ración para pollos de engorde con cuatro ingredientes. Los costos por kilogramo ' +
      'son: maíz L 8, soya L 16, harina de pescado L 26 y melaza L 6. El contenido de proteína es de 9 % en el maíz, ' +
      '45 % en la soya, 60 % en la harina de pescado y 3 % en la melaza. La mezcla debe contener al menos 20 kg de proteína, ' +
      'la melaza no puede pasar de 5 kg por problemas de manejo y la harina de pescado no puede pasar de 8 kg por su efecto ' +
      'en el sabor de la carne.\n\n' +
      '**Formule y resuelva la ración de mínimo costo.**\n\n' +
      '> Este modelo tiene los tres tipos de restricción a la vez: una igualdad (los 100 kg), una de tipo ≥ (la proteína) ' +
      'y dos de tipo ≤ (los límites de inclusión). Es el caso que obliga a las dos fases.',
    datos: {
      objetivo: 'minimizar',
      variables: [v('maiz', 'maíz', 8), v('soya', 'soya', 16), v('pescado', 'harina de pescado', 26), v('melaza', 'melaza', 6)],
      unidadVariables: 'kilogramos',
      nombreObjetivo: 'el costo de la mezcla',
      unidadObjetivo: 'L',
      restricciones: [
        r('total', 'Total de la mezcla', [1, 1, 1, 1], '=', 100, 'kilogramos'),
        r('proteina', 'Proteína mínima', [0.09, 0.45, 0.6, 0.03], '>=', 20, 'kilogramos'),
        r('tope_melaza', 'Tope de melaza', [0, 0, 0, 1], '<=', 5, 'kilogramos'),
        r('tope_pescado', 'Tope de harina de pescado', [0, 0, 1, 0], '<=', 8, 'kilogramos'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'El problema de la dieta, que es el uso más extendido del simplex en el sector. Vale la pena hacer notar que el ingrediente más barato ' +
      'por kilogramo no es el que más entra: lo que decide es el costo por unidad de proteína aportada, y eso es exactamente lo que la fila ' +
      'zⱼ − cⱼ calcula sola. El tableau muestra fracciones con denominadores grandes porque los porcentajes son decimales; el laboratorio ' +
      'permite cambiar a notación decimal si estorban.',
    minutos: 55,
  },
  {
    id: 'simp-05',
    titulo: 'Un compromiso que no se puede cumplir',
    contexto: 'cooperativa',
    dificultad: 'avanzado',
    enunciado:
      'Una cooperativa se comprometió a entregar al menos 500 quintales de café pergamino y al menos 300 quintales de café ' +
      'oro en el trimestre. El beneficio dispone de 3 600 horas de secado; cada quintal de pergamino ocupa 4 horas y cada ' +
      'quintal de oro, 9 horas. Además, el capital de trabajo alcanza para L 900 000 y cada quintal cuesta L 600 el ' +
      'pergamino y L 1 400 el oro. El margen es de L 350 por quintal de pergamino y L 900 por quintal de oro.\n\n' +
      '**Formule el modelo y resuélvalo. ¿Qué le dice el resultado a la gerencia?**\n\n' +
      '> Antes de calcular, revise si los compromisos caben en la capacidad disponible.',
    datos: {
      objetivo: 'maximizar',
      variables: [v('pergamino', 'café pergamino', 350), v('oro', 'café oro', 900)],
      unidadVariables: 'quintales',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: 'L',
      restricciones: [
        r('secado', 'Horas de secado', [4, 9], '<=', 3600, 'horas'),
        r('capital', 'Capital de trabajo', [600, 1400], '<=', 900000, 'lempiras'),
        r('compromiso_perg', 'Compromiso de pergamino', [1, 0], '>=', 500, 'quintales'),
        r('compromiso_oro', 'Compromiso de oro', [0, 1], '>=', 300, 'quintales'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'Modelo infactible: los dos compromisos juntos exigen 500 × 4 + 300 × 9 = 4 700 horas de secado y solo hay 3 600. La fase 1 termina ' +
      'con W > 0 y el procedimiento se detiene ahí. El valor didáctico está en que el estudiante entienda que eso **es** la respuesta: la ' +
      'gerencia se comprometió a algo que no cabe, y descubrirlo a tiempo vale más que cualquier número.',
    minutos: 40,
  },
  {
    id: 'simp-06',
    titulo: 'Un modelo al que le falta una restricción',
    contexto: 'hortalizas',
    dificultad: 'avanzado',
    enunciado:
      'Un productor de hortalizas bajo invernadero quiere maximizar su margen sembrando tomate y chile. El margen es de ' +
      'L 45 000 por invernadero de tomate y L 38 000 por invernadero de chile. La única condición que anotó es que no ' +
      'quiere que el tomate supere al chile en más de dos invernaderos.\n\n' +
      '**Formule el modelo tal como está escrito y resuélvalo. Explique el resultado y proponga qué restricción falta.**',
    datos: {
      objetivo: 'maximizar',
      variables: [v('tomate', 'tomate', 45000), v('chile', 'chile', 38000)],
      unidadVariables: 'invernaderos',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: 'L',
      restricciones: [r('diferencia', 'Diferencia entre cultivos', [1, -1], '<=', 2, 'invernaderos')],
    },
    moneda: 'HNL',
    notasDocente:
      'Modelo no acotado. La única restricción limita la *diferencia* entre los dos cultivos, no su total, así que sembrando cantidades ' +
      'crecientes de ambos el margen crece sin fin. El ejercicio no es una trampa: es el error de formulación más común, el de olvidar el ' +
      'recurso que en la realidad sí limita —tierra, capital, mercado—. Conviene pedir que agreguen la restricción que falta y vuelvan a resolver.',
    minutos: 35,
  },
  {
    id: 'simp-07',
    titulo: 'Dos planes con el mismo resultado',
    contexto: 'porcicultura',
    dificultad: 'intermedio',
    enunciado:
      'Una granja porcina engorda dos líneas genéticas, A y B, y obtiene exactamente el mismo margen por cabeza: L 1 200. ' +
      'El corral admite 400 cabezas en total. Además, por disponibilidad de pie de cría no puede tener más de 300 cabezas ' +
      'de la línea A ni más de 300 de la línea B.\n\n' +
      '**Determine el plan que maximiza el margen. ¿Cuántos planes distintos alcanzan ese máximo?**',
    datos: {
      objetivo: 'maximizar',
      variables: [v('linea_a', 'línea A', 1200), v('linea_b', 'línea B', 1200)],
      unidadVariables: 'cabezas',
      nombreObjetivo: 'el margen de contribución',
      unidadObjetivo: 'L',
      restricciones: [
        r('corral', 'Capacidad del corral', [1, 1], '<=', 400, 'cabezas'),
        r('tope_a', 'Pie de cría de la línea A', [1, 0], '<=', 300, 'cabezas'),
        r('tope_b', 'Pie de cría de la línea B', [0, 1], '<=', 300, 'cabezas'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'Óptimos múltiples: la función objetivo es paralela a la restricción del corral, así que cualquier combinación que sume 400 cabezas ' +
      'respetando los topes da el mismo margen. En el tableau final aparece un cero en la fila zⱼ − cⱼ bajo una variable no básica, que es ' +
      'exactamente la señal que hay que aprender a leer. Gerencialmente es una ventaja: se elige por criterios que el modelo no recoge.',
    minutos: 30,
  },
  {
    id: 'simp-08',
    titulo: 'Mezcla de mínimo costo sin variables artificiales',
    contexto: 'avicultura_engorde',
    dificultad: 'intermedio',
    enunciado:
      'Una planta de alimentos prepara una mezcla con maíz, soya y harina de pescado. El kilogramo cuesta L 8 el maíz, ' +
      'L 16 la soya y L 26 la harina de pescado. El contenido de proteína es de 9 % en el maíz, 45 % en la soya y 60 % ' +
      'en la harina de pescado. La mezcla debe aportar al menos 20 kg de proteína y pesar al menos 90 kg, y la harina ' +
      'de pescado no puede pasar de 8 kg por su efecto en el sabor de la carne.\n\n' +
      '**Formule la mezcla de mínimo costo y resuélvala por el método dual simplex.**\n\n' +
      '> Fíjese en lo que tiene este modelo: se minimiza, todos los coeficientes del costo son positivos y las ' +
      'exigencias son de tipo ≥. Esa combinación es exactamente la que el dual simplex resuelve sin una sola variable ' +
      'artificial. Resuélvalo también por las dos fases y compare cuántas columnas necesita cada uno.',
    datos: {
      objetivo: 'minimizar',
      variables: [v('maiz', 'maíz', 8), v('soya', 'soya', 16), v('pescado', 'harina de pescado', 26)],
      unidadVariables: 'kilogramos',
      nombreObjetivo: 'el costo de la mezcla',
      unidadObjetivo: 'L',
      restricciones: [
        r('proteina', 'Proteína mínima', [0.09, 0.45, 0.6], '>=', 20, 'kilogramos'),
        r('volumen', 'Volumen mínimo', [1, 1, 1], '>=', 90, 'kilogramos'),
        r('tope_pescado', 'Tope de harina de pescado', [0, 0, 1], '<=', 8, 'kilogramos'),
      ],
    },
    moneda: 'HNL',
    notasDocente:
      'Ejercicio pensado para el dual simplex. Cumple sus dos condiciones de arranque: no hay igualdades y, al minimizar con costos positivos, ' +
      'la base de holguras ya satisface la prueba de optimalidad. El dual lo resuelve con 6 columnas y 2 iteraciones; las dos fases necesitan 8 ' +
      'columnas y 5 iteraciones repartidas en dos etapas. Vale la pena resolverlo por los tres métodos en clase: dan el mismo plan, el mismo ' +
      'costo y los mismos precios sombra, y la diferencia está solo en el trabajo que cuesta llegar. La harina de pescado queda fuera del plan ' +
      'pese a ser la fuente más concentrada de proteína: lo que decide es el costo por unidad de proteína aportada.',
    minutos: 45,
  },
];

// ───────────────────────────── Preguntas ─────────────────────────────

export const EJERCICIOS_SIMPLEX: readonly Ejercicio[] = SEMILLAS.map((s) => ({
  id: s.id,
  titulo: s.titulo,
  tema: 'simplex' as const,
  metodo: 'Método simplex (dos fases)',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: {
    tipo: 'simplex' as const,
    objetivo: s.datos.objetivo,
    variables: s.datos.variables.map((x) => ({ ...x })),
    unidadVariables: s.datos.unidadVariables,
    nombreObjetivo: s.datos.nombreObjetivo,
    unidadObjetivo: s.datos.unidadObjetivo,
    restricciones: s.datos.restricciones.map((x) => ({ ...x, coeficientes: [...x.coeficientes] })),
  },
  preguntas: preguntasSimplex({ titulo: s.titulo, ...s.datos }),
  moneda: s.moneda,
  unidades: [s.datos.unidadVariables, s.datos.unidadObjetivo],
  tiempoEstimadoMinutos: s.minutos,
  origen: 'derivado' as const,
  validacion: 'verificado' as const,
  fuenteId: null,
  atribucion: 'Ejercicio derivado — el método simplex no figura en los materiales del curso (I-11)',
  inconsistencias: ['I-11'],
  notasDocente: s.notasDocente,
  semilla: null,
  creadoEn: '2026-08-28T00:00:00.000Z',
  modificadoEn: '2026-08-28T00:00:00.000Z',
}));
