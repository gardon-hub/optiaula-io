/**
 * Ejercicios de punto de equilibrio y de fundamentos de gestión de operaciones.
 *
 * Punto de equilibrio: los diez problemas de `Punto de Equilibrio.pptx`, que el
 * docente exportó en agosto de 2026. Antes no había documento legible y los
 * ejercicios del módulo eran derivados (inconsistencia I-07); ahora están
 * transcritos literalmente y marcados como `textual`.
 *
 * Fundamentos: construidos sobre `Fundamentos de Gestion Operaciones.docx` y la
 * consigna de `Tarea semana 1.docx`.
 */

import {
  resolverEquilibrio,
  resolverEquilibrioMultiproducto,
  type DatosEquilibrio,
  type DatosEquilibrioMultiproducto,
} from '@/nucleo/equilibrio';
import { preguntasEquilibrio, preguntasEquilibrioMultiproducto } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio, Pregunta } from '@/esquemas';

// ───────────────────────────── Punto de equilibrio ─────────────────────────────

/**
 * Los diez problemas de `Punto de Equilibrio.pptx` (diapositivas 4 a 13),
 * transcritos literalmente. Los cuatro primeros son avícolas y en lempiras; los
 * seis restantes son los casos clásicos del tema, en dólares.
 *
 * Las respuestas las calcula el motor: no hay ningún número escrito a mano.
 */

interface SemillaSimple {
  readonly id: string;
  readonly diapositiva: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosEquilibrio, 'titulo'>;
  readonly notasDocente: string;
  readonly minutos: number;
  readonly inconsistencias?: readonly string[];
  /** Preguntas propias del enunciado que el juego común no cubre. */
  readonly extras?: (d: DatosEquilibrio) => Pregunta[];
}

interface SemillaMezcla {
  readonly id: string;
  readonly diapositiva: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosEquilibrioMultiproducto, 'titulo'>;
  readonly notasDocente: string;
  readonly minutos: number;
  readonly inconsistencias?: readonly string[];
  /** Archivo con la solución desarrollada por el docente, si existe. */
  readonly claveRespuestas?: string;
  /** Preguntas propias del enunciado que el juego común no cubre. */
  readonly extras?: (d: DatosEquilibrioMultiproducto) => Pregunta[];
}

const simple = (
  moneda: 'HNL' | 'USD',
  costosFijos: number,
  costoVariableUnitario: number,
  precioVenta: number,
  unidadProducto: string,
  extra: Partial<Omit<DatosEquilibrio, 'titulo'>> = {},
): Omit<DatosEquilibrio, 'titulo'> => ({
  moneda,
  costosFijos,
  costoVariableUnitario,
  precioVenta,
  comisionPorcentaje: 0,
  valorRecuperacion: 0,
  capacidad: null,
  volumenEsperado: null,
  utilidadObjetivo: null,
  unidadProducto,
  ...extra,
});

const SIMPLES: readonly SemillaSimple[] = [
  {
    id: 'equi-01',
    diapositiva: 4,
    titulo: 'Granja de engorde: ¿cuántos pollos al año?',
    contexto: 'avicultura_engorde',
    dificultad: 'basico',
    enunciado:
      'Los costos fijos de producción en una granja de engorda son de 120 000,00 lempiras al año, y el costo variable de ' +
      'producir una libra de pollo es de 14,50 lempiras y el precio de venta es de 20,00 lempiras la libra. ' +
      '¿Cuántos pollos debo de producir al año para estar en punto de equilibrio?\n\n' +
      'Suponga peso promedio de canal de pollo de 3 libras.',
    datos: simple('HNL', 120000, 14.5, 20, 'libras'),
    notasDocente:
      'Diapositiva 4 del material. El modelo trabaja en libras, que es la unidad en que están el precio y el costo variable; ' +
      'la conversión a pollos se hace al final dividiendo entre las 3 libras de canal. Es el punto didáctico del ejercicio: ' +
      'la unidad del margen manda sobre la unidad de la pregunta.',
    minutos: 20,
    extras: (d) => {
      const r = resolverEquilibrio(d).datos;
      const libras = r?.puntoEquilibrioUnidades ?? null;
      return [
        {
          id: 'px',
          enunciado: '¿Cuántos pollos al año representa ese punto de equilibrio, con una canal de 3 libras?',
          tipo: 'numerica',
          respuesta: libras === null ? null : libras / 3,
          unidad: 'pollos',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'El precio y el costo variable están por libra, así que el equilibrio sale primero en libras.',
            'Solo al final se convierte: divida las libras entre las 3 libras que rinde cada canal.',
          ],
          claveVerificacion: 'equilibrio.conversionUnidades',
          puntos: 2,
        },
      ];
    },
  },
  {
    id: 'equi-02',
    diapositiva: 5,
    titulo: 'Granja de ponedoras: equilibrio y utilidad objetivo',
    contexto: 'avicultura_huevo',
    dificultad: 'intermedio',
    enunciado:
      'Los costos fijos de producción en una granja de ponedoras son de 170 000,00 lempiras al año, y el costo variable de ' +
      'producir un huevo de 1,55 lempiras y el precio de venta es de 2,00 lempiras cada uno.\n\n' +
      '**¿Cuántos huevos hay que producir para estar en punto de equilibrio?**\n\n' +
      '**¿Cuántos huevos hay que producir para tener una ganancia anual de L 360 000,00?**\n\n' +
      '**¿Cuántas gallinas hay que explotar en cada caso?**\n\n' +
      '> La postura anual no está en el enunciado. El docente la aporta: una gallina pone entre **300 y 330 huevos al ' +
      'año**. La conversión se hace con la postura más baja, que es la que exige más aves; con 330 la granja necesita ' +
      'cerca de un 9 % menos.',
    datos: simple('HNL', 170000, 1.55, 2, 'huevos', { utilidadObjetivo: 360000 }),
    notasDocente:
      'Diapositiva 5 del material. Las dos preguntas sobre huevos son directas. La tercera —«¿cuántas gallinas debo ' +
      'explotar?»— exigía un dato que el enunciado no da, y estuvo registrada como I-12 hasta que el docente aportó la ' +
      'postura: 300 a 330 huevos por ave al año. Es un rango, no un número, así que la respuesta también lo es: entre ' +
      '1 145 y 1 260 gallinas para el equilibrio, y entre 3 570 y 3 926 para la ganancia objetivo. La aplicación pide ' +
      'el extremo de 300 porque es el que exige más aves, y deja el de 330 para la pregunta de interpretación: ' +
      'dimensionar un plantel con la postura optimista es el error caro del caso.',
    minutos: 30,
    extras: (d) => {
      const r = resolverEquilibrio(d).datos;
      const equilibrio = r?.puntoEquilibrioUnidades ?? null;
      const objetivo = r?.unidadesParaObjetivo ?? null;
      return [
        {
          id: 'px1',
          enunciado: '¿Cuántas gallinas hay que explotar para estar en el punto de equilibrio, con una postura de 300 huevos al año?',
          tipo: 'numerica',
          respuesta: equilibrio === null ? null : equilibrio / 300,
          unidad: 'gallinas',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'El margen está por huevo, así que el equilibrio sale primero en huevos.',
            'Solo al final se convierte: divida los huevos del equilibrio entre la postura anual de cada gallina.',
          ],
          claveVerificacion: 'equilibrio.conversionUnidades',
          puntos: 2,
        },
        {
          id: 'px2',
          enunciado: '¿Cuántas aves hay que tener para ganar L 360 000,00 al año, con esa misma postura de 300 huevos?',
          tipo: 'numerica',
          respuesta: objetivo === null ? null : objetivo / 300,
          unidad: 'gallinas',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Primero los huevos: la utilidad objetivo se suma a los costos fijos antes de dividir entre el margen.',
            'Después la misma conversión: entre 300 huevos por ave al año.',
          ],
          claveVerificacion: 'equilibrio.conversionUnidades',
          puntos: 3,
        },
        {
          id: 'px3',
          enunciado:
            'La postura real va de 300 a 330 huevos por ave al año. Calcule cuántas gallinas harían falta con 330 y ' +
            'explique con cuál de los dos extremos conviene dimensionar el plantel, y por qué.',
          tipo: 'interpretacion',
          respuesta: null,
          unidad: null,
          tolerancia: 0,
          toleranciaRelativa: false,
          opciones: [],
          pistas: [
            'Con más huevos por ave hacen falta menos aves: el número de gallinas baja alrededor de un 9 %.',
            'Piense qué pasa si la parvada rinde 300 y el galpón se dimensionó para 330.',
          ],
          claveVerificacion: null,
          puntos: 3,
        },
      ];
    },
  },
  {
    id: 'equi-05',
    diapositiva: 8,
    titulo: 'Equilibrio en unidades y en porcentaje de capacidad',
    contexto: 'general',
    dificultad: 'basico',
    enunciado:
      'Dados los siguientes datos, encuéntrese el punto de equilibrio en unidades y en porcentaje de capacidad. ' +
      'Ilústrese el análisis con una gráfica.\n\n' +
      '- Precio de venta: $ 3,50\n' +
      '- Costo variable unitario: $ 2,50\n' +
      '- Costos fijos: $ 45 000,00\n' +
      '- Capacidad de producción: 50 000 unidades',
    datos: simple('USD', 45000, 2.5, 3.5, 'unidades', { capacidad: 50000 }),
    notasDocente:
      'Diapositiva 8 del material. Es el caso más limpio para introducir el porcentaje de capacidad: el equilibrio exige ' +
      'el 90 % de la planta, un margen de seguridad muy estrecho que conviene comentar en clase.',
    minutos: 20,
  },
  {
    id: 'equi-06',
    diapositiva: 9,
    titulo: 'Fábrica T-Shirt',
    contexto: 'general',
    dificultad: 'basico',
    enunciado:
      'La fábrica T-Shirt fabrica camisetas a la medida para restaurantes, bares, fraternidades, etc. Las camisetas se ' +
      'venden a $ 6 por unidad y el costo de fabricación es de $ 3 por unidad. Los costos fijos de operación al año son de ' +
      '$ 55 000 y la capacidad anual máxima es de 25 000 unidades.\n\n' +
      '**Encuéntrese el punto de equilibrio en unidades, en dólares vendidos y en porcentaje de capacidad.**',
    datos: simple('USD', 55000, 3, 6, 'camisetas', { capacidad: 25000 }),
    notasDocente:
      'Diapositiva 9 del material. La solución no es entera —18 333,33 camisetas—: buena ocasión para discutir que en ' +
      'equilibrio siempre se redondea hacia arriba, porque con 18 333 todavía se pierde.',
    minutos: 20,
  },
  {
    id: 'equi-07',
    diapositiva: 10,
    titulo: 'Juguetería Cindy: efecto de un alza en el costo variable',
    contexto: 'general',
    dificultad: 'intermedio',
    enunciado:
      'La juguetería Cindy está considerando producir un nuevo tipo de muñeca. Los costos fijos asociados con la producción ' +
      'y la venta son de $ 500 000 y los costos variables por unidad ascienden a $ 3 por muñeca.\n\n' +
      '**Si la muñeca se vende a los distribuidores a $ 8 cada una, ¿cuál será el punto de equilibrio en unidades para la ' +
      'juguetería Cindy?**\n\n' +
      '**Si los costos variables de hecho subieran a $ 4 por muñeca, ¿cuál será el efecto sobre el punto de equilibrio ' +
      'expresado en unidades?**',
    datos: simple('USD', 500000, 3, 8, 'muñecas'),
    notasDocente:
      'Diapositiva 10 del material. El segundo escenario es el valioso: el costo variable sube un 33 % y el equilibrio sube ' +
      'un 25 %. Sirve para introducir la sensibilidad del punto de equilibrio antes de formalizarla.',
    minutos: 25,
    extras: (d) => {
      const conAlza = resolverEquilibrio({ ...d, costoVariableUnitario: 4 }).datos;
      return [
        {
          id: 'px',
          enunciado: 'Si el costo variable sube a $ 4 por muñeca, ¿cuál es el nuevo punto de equilibrio en unidades?',
          tipo: 'numerica',
          respuesta: conAlza?.puntoEquilibrioUnidades ?? null,
          unidad: 'muñecas',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Los costos fijos no cambian: lo que cambia es el margen de contribución unitario.',
            'Con el costo variable en $ 4, cada muñeca aporta $ 4 en lugar de $ 5.',
            'Vuelva a dividir los costos fijos entre el margen nuevo.',
          ],
          claveVerificacion: 'equilibrio.escenarioAlza',
          puntos: 3,
        },
      ];
    },
  },
  {
    id: 'equi-08',
    diapositiva: 11,
    titulo: 'Autoservicio Oliva’s',
    contexto: 'servicios',
    dificultad: 'intermedio',
    enunciado:
      'Oliva’s es un autoservicio de emparedados que se encuentra enfrente de las instalaciones de la universidad del ' +
      'estado. El costo fijo mensual de operación del autoservicio es de $ 1 500. El cliente promedio gasta $ 2 en comida y ' +
      'bebida; los costos variables por cliente promedian $ 1. Con su tamaño actual Oliva’s puede atender 150 clientes por ' +
      'día, 30 días al mes.\n\n' +
      '**Encuéntrese el punto de equilibrio mensual para Oliva’s en unidades, en dólares vendidos y en porcentaje de ' +
      'capacidad.**\n\n' +
      '**¿Cuál sería la utilidad mensual de Oliva’s con un promedio de 100 clientes diarios?**',
    datos: simple('USD', 1500, 1, 2, 'clientes', { capacidad: 4500, volumenEsperado: 3000 }),
    notasDocente:
      'Diapositiva 11 del material. La capacidad mensual son 150 × 30 = 4 500 clientes, y el volumen esperado 100 × 30 = ' +
      '3 000. Es el primer ejercicio del material donde la «unidad» es un cliente y no un producto: útil para mostrar que ' +
      'el método no distingue entre manufactura y servicios.',
    minutos: 25,
  },
  {
    id: 'equi-09',
    diapositiva: 12,
    titulo: 'Carritos de helados con comisión sobre ventas',
    contexto: 'servicios',
    dificultad: 'intermedio',
    enunciado:
      'Dixiana y Eduardo poseen una flotilla de carritos de helados que operan en áreas de veraneo. Cada carrito invierte ' +
      '$ 3 000 en gastos fijos durante el verano. Los operadores de los carritos cobran estrictamente sobre comisión: ' +
      'reciben 10 % de todos los ingresos. Los conos de helado se venden a $ 0,50 cada uno y tienen costos variables de ' +
      '$ 0,20 por cono, además de la mano de obra.\n\n' +
      '**¿Cuántos conos de helado debe vender cada carrito durante el verano para operar en el punto de equilibrio?**\n\n' +
      '**¿Cuál será la ganancia o pérdida si se venden 15 000 conos de helado por carrito durante el verano?**',
    datos: simple('USD', 3000, 0.2, 0.5, 'conos', { comisionPorcentaje: 10, volumenEsperado: 15000 }),
    notasDocente:
      'Diapositiva 12 del material. Introduce la comisión sobre el ingreso, que es costo variable aunque no lo parezca: el ' +
      'costo variable efectivo es 0,20 + 10 % × 0,50 = 0,25. El error frecuente es restar la comisión de los costos fijos ' +
      'o ignorarla.',
    minutos: 30,
  },
  {
    id: 'equi-10',
    diapositiva: 13,
    titulo: 'Renta de veleros: comisión y valor de recuperación',
    contexto: 'servicios',
    dificultad: 'avanzado',
    enunciado:
      'Un hombre de negocios está planeando abrir una operación veraniega de renta de veleros. Actualmente piensa comprar ' +
      'seis veleros a $ 2 000 cada uno. Al final del verano venderá los barcos en $ 1 000 cada uno. El hombre de negocios ' +
      'llegó a un arreglo con un hotel de fama para operar en las playas del hotel: esto le costará $ 2 000 más el 10 % del ' +
      'total de dólares obtenido por las rentas. El costo de un kiosco para operar el equipo necesario se estima en $ 500; ' +
      'al final del verano parte del equipo podrá venderse a un valor de recuperación de $ 400. Un estudiante de la ' +
      'universidad local trabajará para él rentando los veleros 8 horas al día, 7 días a la semana durante 15 semanas por ' +
      '$ 224 por semana. Los barcos se rentarán a $ 7 la hora.\n\n' +
      '**¿Cuál es el punto de equilibrio para la operación de renta de veleros, expresado en horas de renta?**\n\n' +
      '**¿Cuál será la ganancia o pérdida si se opera al 40 % de la capacidad durante la temporada de 15 semanas?**',
    datos: simple('USD', 6 * 2000 + 2000 + 500 + 224 * 15, 0, 7, 'horas de renta', {
      comisionPorcentaje: 10,
      valorRecuperacion: 6 * 1000 + 400,
      capacidad: 6 * 8 * 7 * 15,
      volumenEsperado: 0.4 * 6 * 8 * 7 * 15,
    }),
    notasDocente:
      'Diapositiva 13 del material, y el ejercicio más completo del tema: reúne comisión sobre el ingreso y valor de ' +
      'recuperación en el mismo problema. Costos fijos: 6 × 2 000 de veleros + 2 000 del hotel + 500 del kiosco + ' +
      '224 × 15 del estudiante = 17 860. Recuperación: 6 × 1 000 + 400 = 6 400, así que el costo fijo neto es 11 460. ' +
      'El único costo variable es la comisión: 10 % de $ 7 = $ 0,70 por hora. La capacidad son 6 veleros × 8 horas × 7 días ' +
      '× 15 semanas = 5 040 horas-velero; conviene explicitarlo en clase porque el enunciado lo deja implícito.',
    minutos: 40,
  },
];

const MEZCLAS: readonly SemillaMezcla[] = [
  {
    id: 'equi-03',
    diapositiva: 6,
    titulo: 'Granja avícola: huevo y carne en la misma mezcla',
    contexto: 'avicultura_huevo',
    dificultad: 'avanzado',
    enunciado:
      'Los costos fijos de producción en una granja avícola son de 1 680 000,00 lempiras al año. El costo variable de ' +
      'producir un huevo es de 1,45 lempiras y el precio de venta es de 1,95 lempiras cada uno; el costo variable de ' +
      'producir una libra de pollo es de 15,00 lempiras y el precio de venta es de 19,50 lempiras la libra. ' +
      'El nivel de ventas (PPM) de huevo es de 95 % y el de carne es de 5 %.\n\n' +
      '**¿Cuántos huevos y cuántas libras de pollo debo producir al año para estar en punto de equilibrio?**\n\n' +
      '**¿Cuántas gallinas hay que explotar?**\n\n' +
      '> La postura anual no está en el enunciado. El docente la aporta: una gallina pone entre **300 y 330 huevos al ' +
      'año**.',
    datos: {
      moneda: 'HNL',
      costosFijos: 1680000,
      baseMezcla: 'unidades',
      productos: [
        { id: 'huevo', nombre: 'Huevo', precioVenta: 1.95, costoVariableUnitario: 1.45, participacion: 95 },
        { id: 'carne', nombre: 'Libra de pollo', precioVenta: 19.5, costoVariableUnitario: 15, participacion: 5 },
      ],
    },
    notasDocente:
      'Diapositiva 6 del material. «PPM 95 % / 5 %» son unidades, no ingreso: es la lectura que usa la clave de ' +
      'respuestas del despiece de pollo, y la que aquí da cifras redondas —margen ponderado de L 0,70 y equilibrio en ' +
      '2 400 000 unidades, o sea 2 280 000 huevos y 120 000 libras de pollo—. Con base en el ingreso el resultado no ' +
      'cierra en cifras así. Dos avisos para la clase. Primero: se están sumando huevos con libras de pollo, que no son ' +
      'la misma unidad; el método lo permite, pero conviene decirlo en voz alta. Segundo: la pregunta por el número de ' +
      'gallinas necesitaba la postura anual, que el enunciado no da; con la que aportó el docente —300 a 330 huevos por ' +
      'ave al año— la conversión es inmediata y da entre 6 909 y 7 600 gallinas. Lo interesante del caso es que la ' +
      'libra de pollo tiene un margen unitario nueve veces mayor que el huevo y aun así casi todo el equilibrio lo ' +
      'sostiene el huevo: manda la mezcla, no el margen.',
    minutos: 40,
    extras: (d) => {
      const r = resolverEquilibrioMultiproducto(d).datos;
      const huevos = r?.detalle.find((x) => x.producto.id === 'huevo')?.unidadesEquilibrio ?? null;
      return [
        {
          id: 'px1',
          enunciado: '¿Cuántas gallinas hay que explotar, con una postura de 300 huevos al año?',
          tipo: 'numerica',
          respuesta: huevos === null ? null : huevos / 300,
          unidad: 'gallinas',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Solo cuentan los huevos: la carne no sale de las ponedoras.',
            'Divida los huevos del equilibrio entre la postura anual de cada gallina.',
          ],
          claveVerificacion: 'equilibrio.conversionUnidades',
          puntos: 2,
        },
      ];
    },
  },
  {
    id: 'equi-04',
    diapositiva: 7,
    titulo: 'Despiece de pollo: cinco productos en la mezcla',
    contexto: 'avicultura_engorde',
    dificultad: 'avanzado',
    enunciado:
      'Los costos fijos de producción en una granja avícola son de 500 000,00 lempiras al año y se produce lo siguiente:\n\n' +
      '| | Pollo entero | Alas | Piernas | Pechuga | Menudos |\n' +
      '|---|---|---|---|---|---|\n' +
      '| Precio | 26 | 24 | 30 | 26 | 10 |\n' +
      '| CVu | 18 | 14 | 19 | 15,5 | 4 |\n' +
      '| PPM | 50 % | 10 % | 15 % | 20 % | 5 % |\n\n' +
      '**¿Cuánto se debe producir de estos productos para estar en equilibrio?**',
    datos: {
      moneda: 'HNL',
      costosFijos: 500000,
      baseMezcla: 'unidades',
      productos: [
        { id: 'entero', nombre: 'Pollo entero', precioVenta: 26, costoVariableUnitario: 18, participacion: 50 },
        { id: 'alas', nombre: 'Alas', precioVenta: 24, costoVariableUnitario: 14, participacion: 10 },
        { id: 'piernas', nombre: 'Piernas', precioVenta: 30, costoVariableUnitario: 19, participacion: 15 },
        { id: 'pechuga', nombre: 'Pechuga', precioVenta: 26, costoVariableUnitario: 15.5, participacion: 20 },
        { id: 'menudos', nombre: 'Menudos', precioVenta: 10, costoVariableUnitario: 4, participacion: 5 },
      ],
    },
    notasDocente:
      'Diapositiva 7 del material, con la tabla transcrita tal cual, y el único ejercicio del tema para el que existe ' +
      'clave de respuestas del docente: `Ejercicio_punto_de_equilibrio_granja_avicola.pdf`. Esa clave resuelve por ' +
      'margen de contribución ponderado en unidades —L 9,05 por unidad promedio, equilibrio en 55 248,62 unidades— y es ' +
      'la que fijó la lectura de «PPM» para todo el módulo (I-13). Los menudos tienen la mejor razón de margen (60 %) y ' +
      'el peor margen unitario (L 6): el mejor ejemplo del tema de por qué la decisión no se toma por margen unitario. ' +
      'La clave redondea el total a 55 249 unidades antes de repartirlo y lo advierte; la aplicación no redondea durante ' +
      'el cálculo, así que las cantidades por producto difieren de la clave en menos de una unidad.',
    minutos: 45,
    claveRespuestas: 'Ejercicio_punto_de_equilibrio_granja_avicola.pdf',
  },
];

const deSimple = (s: SemillaSimple): Ejercicio => {
  const datos: DatosEquilibrio = { titulo: s.titulo, ...s.datos };
  return {
    id: s.id,
    titulo: s.titulo,
    tema: 'equilibrio',
    metodo: 'Punto de equilibrio de un producto',
    contexto: s.contexto,
    dificultad: s.dificultad,
    enunciado: s.enunciado,
    datos: { tipo: 'equilibrio', modo: 'simple', baseMezcla: 'unidades', ...s.datos, productos: [] },
    preguntas: [...preguntasEquilibrio(datos), ...(s.extras?.(datos) ?? [])],
    moneda: s.datos.moneda,
    unidades: [s.datos.unidadProducto, s.datos.moneda === 'USD' ? 'US$' : 'L'],
    tiempoEstimadoMinutos: s.minutos,
    origen: 'textual',
    validacion: (s.inconsistencias?.length ?? 0) > 0 ? 'con_inconsistencia' : 'verificado',
    fuenteId: 'ppt-equilibrio',
    atribucion: `Diapositiva ${s.diapositiva} — Punto de Equilibrio.pptx`,
    inconsistencias: [...(s.inconsistencias ?? [])],
    notasDocente: s.notasDocente,
    semilla: null,
    creadoEn: '2025-07-07T00:00:00.000Z',
    modificadoEn: '2026-08-28T00:00:00.000Z',
  };
};

const deMezcla = (s: SemillaMezcla): Ejercicio => ({
  id: s.id,
  titulo: s.titulo,
  tema: 'equilibrio',
  metodo: 'Punto de equilibrio multiproducto con mezcla de ventas',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: {
    tipo: 'equilibrio',
    modo: 'multiproducto',
    baseMezcla: s.datos.baseMezcla,
    moneda: s.datos.moneda,
    costosFijos: s.datos.costosFijos,
    costoVariableUnitario: 0,
    precioVenta: 0,
    comisionPorcentaje: 0,
    valorRecuperacion: 0,
    capacidad: null,
    volumenEsperado: null,
    utilidadObjetivo: null,
    unidadProducto: 'unidad',
    productos: s.datos.productos.map((x) => ({ ...x })),
  },
  preguntas: [
    ...preguntasEquilibrioMultiproducto({ titulo: s.titulo, ...s.datos }),
    ...(s.extras?.({ titulo: s.titulo, ...s.datos }) ?? []),
  ],
  moneda: s.datos.moneda,
  unidades: ['unidad', s.datos.moneda === 'USD' ? 'US$' : 'L'],
  tiempoEstimadoMinutos: s.minutos,
  origen: 'textual',
  validacion: (s.inconsistencias?.length ?? 0) > 0 ? 'con_inconsistencia' : 'verificado',
  fuenteId: 'ppt-equilibrio',
  atribucion:
    s.claveRespuestas === undefined
      ? `Diapositiva ${s.diapositiva} — Punto de Equilibrio.pptx`
      : `Diapositiva ${s.diapositiva} — Punto de Equilibrio.pptx; solución desarrollada del docente en ${s.claveRespuestas}`,
  inconsistencias: [...(s.inconsistencias ?? [])],
  notasDocente: s.notasDocente,
  semilla: null,
  creadoEn: '2025-07-07T00:00:00.000Z',
  modificadoEn: '2026-08-28T00:00:00.000Z',
});

export const EJERCICIOS_EQUILIBRIO: readonly Ejercicio[] = [
  ...SIMPLES.map(deSimple),
  ...MEZCLAS.map(deMezcla),
].sort((a, b) => a.id.localeCompare(b.id));

// ───────────────────────────── Fundamentos ─────────────────────────────

export const EJERCICIOS_FUNDAMENTOS: readonly Ejercicio[] = [
  {
    id: 'fund-01',
    titulo: 'La cooperativa lechera como sistema operativo',
    tema: 'fundamentos',
    metodo: 'Enfoque de sistemas: entradas, procesos, salidas, retroalimentación y ambiente externo',
    contexto: 'cooperativa',
    dificultad: 'basico',
    enunciado:
      'Una cooperativa lechera de Catacamas recibe leche cruda de 40 socios productores, la pasteuriza y la convierte en ' +
      'leche empacada, queso y cuajada, que vende en pulperías y en el mercado municipal.\n\n' +
      'Arrastre cada elemento a la categoría que le corresponde dentro del modelo de sistemas: **entrada, proceso, ' +
      'salida, retroalimentación** o **ambiente externo**.\n\n' +
      'Recuerde la definición de Russell y Taylor (2019): el modelo de sistemas contempla la entrada de insumos, el ' +
      'proceso de transformación, la salida de bienes o servicios y la retroalimentación para el ajuste continuo.',
    datos: {
      tipo: 'fundamentos',
      organizacion: 'Cooperativa lechera de Catacamas',
      naturaleza: 'manufactura',
      elementos: [
        { id: 'e1', texto: 'Leche cruda entregada por los socios', categoria: 'entrada' },
        { id: 'e2', texto: 'Personal de planta y operarios', categoria: 'entrada' },
        { id: 'e3', texto: 'Energía eléctrica y agua potable', categoria: 'entrada' },
        { id: 'e4', texto: 'Tanques de enfriamiento y pasteurizador', categoria: 'entrada' },
        { id: 'e5', texto: 'Recepción y análisis de calidad de la leche', categoria: 'proceso' },
        { id: 'e6', texto: 'Pasteurización', categoria: 'proceso' },
        { id: 'e7', texto: 'Elaboración de queso y cuajada', categoria: 'proceso' },
        { id: 'e8', texto: 'Empaque y etiquetado', categoria: 'proceso' },
        { id: 'e9', texto: 'Leche empacada lista para la venta', categoria: 'salida' },
        { id: 'e10', texto: 'Queso y cuajada', categoria: 'salida' },
        { id: 'e11', texto: 'Suero como subproducto', categoria: 'salida' },
        { id: 'e12', texto: 'Reclamos de las pulperías por producto agrio', categoria: 'retroalimentacion' },
        { id: 'e13', texto: 'Registro diario de acidez y temperatura', categoria: 'retroalimentacion' },
        { id: 'e14', texto: 'Resultado del muestreo mensual de laboratorio', categoria: 'retroalimentacion' },
        { id: 'e15', texto: 'Precio internacional de la leche en polvo', categoria: 'ambiente_externo' },
        { id: 'e16', texto: 'Regulación sanitaria de SENASA', categoria: 'ambiente_externo' },
        { id: 'e17', texto: 'Competencia de las plantas industriales de Tegucigalpa', categoria: 'ambiente_externo' },
        { id: 'e18', texto: 'Sequía prolongada que reduce el forraje disponible', categoria: 'ambiente_externo' },
      ],
      estrategiaCompetencia: 'calidad',
    },
    preguntas: [
      {
        id: 'p1',
        enunciado:
          '¿Por qué el suero se clasifica como salida y no como retroalimentación, si vuelve a usarse en la porqueriza vecina?',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'La retroalimentación es información que ajusta el proceso, no materia que sale de él.',
          'Que un subproducto se venda o se reutilice no lo convierte en información.',
        ],
        claveVerificacion: null,
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado: 'Clasifique la cooperativa como organización de manufactura o de servicios y dé tres justificaciones.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Heizer, Render y Munson (2020) señalan que en manufactura la producción se puede inventariar y la calidad se mide objetivamente.',
          'Piense en el contacto con el cliente, la variabilidad y la posibilidad de almacenar el producto.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
      {
        id: 'p3',
        enunciado:
          'Identifique una decisión estratégica, una táctica y una operativa que tome el gerente de operaciones de esta ' +
          'cooperativa.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Chase, Jacobs y Aquilano (2021) ubican la localización de plantas entre las estratégicas y la asignación de recursos entre las operativas.',
          'La diferencia está en el horizonte de tiempo y en qué tan reversible es la decisión.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ],
    moneda: null,
    unidades: [],
    tiempoEstimadoMinutos: 25,
    origen: 'derivado',
    validacion: 'verificado',
    fuenteId: 'doc-fundamentos',
    atribucion: 'Construido sobre el marco teórico del documento de fundamentos',
    inconsistencias: [],
    notasDocente:
      'El marco conceptual y las citas provienen del documento del curso. La cooperativa y sus dieciocho elementos se ' +
      'construyeron como caso de práctica para el constructor visual de sistemas.',
    semilla: null,
    creadoEn: '2026-08-28T00:00:00.000Z',
    modificadoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'fund-02',
    titulo: 'Análisis sistémico de una organización de su comunidad',
    tema: 'fundamentos',
    metodo: 'Enfoque de sistemas aplicado a un caso real',
    contexto: 'comunitario',
    dificultad: 'intermedio',
    enunciado:
      '**Resultado de aprendizaje.** El estudiante aplica el enfoque de sistemas a una organización real, identificando ' +
      'sus componentes (entradas, procesos, salidas, retroalimentación y ambiente externo), diferenciando su naturaleza ' +
      '(servicios o manufactura) y valorando el papel del gerente de operaciones en la toma de decisiones estratégicas y ' +
      'operativas.\n\n' +
      'Elabore un ensayo técnico individual sobre una empresa o institución de su comunidad: una cooperativa, una finca, ' +
      'una ferretería, un hospital, una escuela u otra. El análisis debe abordar:\n\n' +
      '1. Descripción breve de la organización: nombre, ubicación, propósito, tipo.\n' +
      '2. Análisis de la organización como sistema: entradas, procesos, salidas, retroalimentación y ambiente externo.\n' +
      '3. Clasificación como manufactura o servicios, con al menos tres justificaciones.\n' +
      '4. Decisiones del gerente de operaciones observadas o inferidas.\n' +
      '5. Propuesta de mejora concreta basada en el análisis sistémico.\n\n' +
      'Use el constructor visual para armar el diagrama de su organización antes de escribir. Cada elemento que coloque ' +
      'queda registrado y puede exportarse junto con el ensayo.',
    datos: {
      tipo: 'fundamentos',
      organizacion: 'A elección del estudiante',
      naturaleza: 'mixta',
      elementos: [],
      estrategiaCompetencia: null,
    },
    preguntas: [
      {
        id: 'p1',
        enunciado: 'Nombre y ubicación de la organización que analizará.',
        tipo: 'texto',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Elija una organización que conozca de primera mano: podrá describir procesos que no aparecen en internet.'],
        claveVerificacion: null,
        puntos: 1,
      },
      {
        id: 'p2',
        enunciado: '¿Es una organización de manufactura o de servicios? Dé al menos tres justificaciones.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Criterios útiles: tangibilidad del producto, posibilidad de inventariarlo, grado de contacto con el cliente y facilidad de medir la calidad.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
      {
        id: 'p3',
        enunciado: 'Describa al menos tres decisiones del gerente de operaciones que haya observado o pueda inferir.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Busque decisiones de los tres niveles: estratégico, táctico y operativo.'],
        claveVerificacion: null,
        puntos: 3,
      },
      {
        id: 'p4',
        enunciado: 'Proponga una mejora concreta que se desprenda del análisis sistémico, no de una impresión general.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Una buena propuesta señala qué componente del sistema falla y cómo el cambio lo corrige.',
          'Evite recomendaciones genéricas del tipo «mejorar la atención al cliente».',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ],
    moneda: null,
    unidades: [],
    tiempoEstimadoMinutos: 90,
    origen: 'textual',
    validacion: 'verificado',
    fuenteId: 'doc-tarea1',
    atribucion: 'Tarea Semana 1',
    inconsistencias: [],
    notasDocente:
      'La rúbrica original de seis criterios (análisis de componentes 30 %, diferenciación de tipo 15 %, decisiones del ' +
      'gerente 15 %, propuesta de mejora 10 %, estructura y redacción 15 %, bibliografía y formato 15 %) está disponible ' +
      'en el documento fuente y puede adjuntarse al reporte del estudiante.',
    semilla: null,
    creadoEn: '2025-05-29T00:00:00.000Z',
    modificadoEn: '2025-05-29T00:00:00.000Z',
  },
];
