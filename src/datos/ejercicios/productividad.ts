/**
 * Los diez ejercicios de productividad, transcritos de
 * `Ejercicios de productividad.docx` (junio 2025).
 *
 * Los valores numéricos son los del documento. La única intervención es el
 * registro de la inconsistencia I-02 en el ejercicio 1.
 */

import { preguntasProductividad } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio } from '@/esquemas';

interface EntradaInsumo {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: 'mano_obra' | 'energia' | 'materiales' | 'agua' | 'capital' | 'costos_fijos' | 'otros';
  readonly cantidad: number;
  readonly unidad: string;
  readonly costoUnitario: number;
}

const mo = (h: number, tarifa: number): EntradaInsumo => ({
  id: 'mo',
  nombre: 'Mano de obra',
  categoria: 'mano_obra',
  cantidad: h,
  unidad: 'hora',
  costoUnitario: tarifa,
});

const energia = (kwh: number, tarifa = 6): EntradaInsumo => ({
  id: 'en',
  nombre: 'Energía eléctrica',
  categoria: 'energia',
  cantidad: kwh,
  unidad: 'kWh',
  costoUnitario: tarifa,
});

/** Insumo declarado directamente como monto: la unidad es la moneda. */
const monto = (
  id: string,
  nombre: string,
  categoria: EntradaInsumo['categoria'],
  lempiras: number,
): EntradaInsumo => ({ id, nombre, categoria, cantidad: lempiras, unidad: 'L', costoUnitario: 1 });

interface Semilla {
  readonly n: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly insumos: readonly EntradaInsumo[];
  readonly terminada: number;
  readonly unidad: string;
  readonly enProceso: number;
  readonly precio: number;
  readonly instrucciones: string;
  readonly inconsistencias?: readonly string[];
  readonly costoDeclarado?: number | null;
}

const SEMILLAS: readonly Semilla[] = [
  {
    n: 1,
    titulo: 'Finca avícola El Progreso',
    contexto: 'avicultura_engorde',
    dificultad: 'intermedio',
    enunciado:
      'Durante una semana, una finca de pollos de engorde operó con los siguientes recursos: 150 horas de mano de obra ' +
      '(L 80 por hora), 300 kilovatios-hora de energía eléctrica (L 6 por kWh), 1 200 kilogramos de alimento balanceado ' +
      '(L 10 por kg) y otros costos operativos fijos de L 5 000. El enunciado original indica además que el costo total ' +
      'operativo fue de L 25 000. Al inicio del periodo se contaba con un inventario de 500 aves. Al finalizar la semana ' +
      'se cosecharon 1 400 kilogramos de carne de pollo y se reportaron 100 kilogramos de carne en proceso. El precio de ' +
      'venta del kilogramo de carne de pollo es de L 35.',
    insumos: [mo(150, 80), energia(300), { id: 'al', nombre: 'Alimento balanceado', categoria: 'materiales', cantidad: 1200, unidad: 'kg', costoUnitario: 10 }, monto('fj', 'Otros costos operativos fijos', 'costos_fijos', 5000)],
    terminada: 1400,
    unidad: 'kg',
    enProceso: 100,
    precio: 35,
    instrucciones:
      'Calcule la productividad parcial de cada insumo (mano de obra, energía, materiales y costos), así como la ' +
      'productividad total del sistema. Analice la eficiencia productiva considerando el inventario en proceso y los ' +
      'ingresos generados por la producción.',
    inconsistencias: ['I-02'],
    costoDeclarado: null,
  },
  {
    n: 2,
    titulo: 'Beneficio húmedo de café Santa Elena',
    contexto: 'cafe',
    dificultad: 'intermedio',
    enunciado:
      'En una jornada de trabajo, el beneficio húmedo procesó 2 000 kilogramos de café pergamino. Los insumos utilizados ' +
      'fueron: 80 horas hombre (L 90 por hora), 250 kWh de energía (L 6 por kWh), 1 800 litros de agua (L 1 por litro) y ' +
      'materiales valorados en L 5 500. El resultado fue una producción de 1 600 kilogramos de café oro, quedando ' +
      '200 kilogramos en proceso al cierre de jornada. El precio de venta del kilogramo de café oro es de L 120.',
    insumos: [mo(80, 90), energia(250), { id: 'ag', nombre: 'Agua', categoria: 'agua', cantidad: 1800, unidad: 'litro', costoUnitario: 1 }, monto('mt', 'Materiales', 'materiales', 5500)],
    terminada: 1600,
    unidad: 'kg',
    enProceso: 200,
    precio: 120,
    instrucciones:
      'Determine la productividad total y parcial para cada recurso, e interprete los resultados incluyendo el efecto del ' +
      'inventario en proceso y los ingresos generados por la producción.',
  },
  {
    n: 3,
    titulo: 'Empacadora de vegetales La Huerta',
    contexto: 'hortalizas',
    dificultad: 'basico',
    enunciado:
      'Una planta empacadora procesó vegetales en un turno de trabajo. Se utilizaron 60 horas de mano de obra (L 85 por ' +
      'hora), 180 kWh de energía eléctrica (L 6 por kWh) y materiales de empaque valorados en L 8 000. Al finalizar el ' +
      'turno se empacaron 1 000 paquetes de vegetales, quedando 300 paquetes en proceso. El precio de venta de cada ' +
      'paquete es de L 25.',
    insumos: [mo(60, 85), energia(180), monto('mt', 'Materiales de empaque', 'materiales', 8000)],
    terminada: 1000,
    unidad: 'paquete',
    enProceso: 300,
    precio: 25,
    instrucciones:
      'Calcule la productividad total y parcial considerando el inventario en proceso. Analice el desempeño operativo de ' +
      'la planta y los ingresos generados.',
  },
  {
    n: 4,
    titulo: 'Agroindustria porcina San Benito',
    contexto: 'porcicultura',
    dificultad: 'intermedio',
    enunciado:
      'Durante una semana, esta empresa utilizó 200 horas de mano de obra (L 95 por hora), 400 kWh de energía (L 6 por ' +
      'kWh), 3 000 kilogramos de alimento balanceado porcino (L 9 por kg) y materiales valorados en L 12 000. Se ' +
      'obtuvieron 4 500 kilogramos de carne de cerdo lista para empacar y 500 kilogramos de carne en proceso. El precio ' +
      'de venta es de L 42 por kilogramo.',
    insumos: [mo(200, 95), energia(400), { id: 'al', nombre: 'Alimento balanceado porcino', categoria: 'materiales', cantidad: 3000, unidad: 'kg', costoUnitario: 9 }, monto('mt', 'Materiales', 'materiales', 12000)],
    terminada: 4500,
    unidad: 'kg',
    enProceso: 500,
    precio: 42,
    instrucciones:
      'Calcule la productividad parcial de cada insumo y la productividad total. Identifique cuál de los insumos muestra ' +
      'mayor eficiencia relativa, considerando también los ingresos generados.',
  },
  {
    n: 5,
    titulo: 'Productora de lácteos Monte Verde',
    contexto: 'lacteos',
    dificultad: 'basico',
    enunciado:
      'La planta transformó 5 000 litros de leche en 4 200 litros de productos lácteos terminados. Se utilizaron 100 horas ' +
      'de mano de obra (L 85 por hora), 220 kWh de energía (L 6 por kWh) y materiales diversos con un valor de L 3 000. ' +
      'Al finalizar, quedaban 300 litros de productos en proceso. El precio promedio de venta por litro de producto ' +
      'lácteo es de L 30.',
    insumos: [mo(100, 85), energia(220), monto('mt', 'Materiales diversos', 'materiales', 3000)],
    terminada: 4200,
    unidad: 'litro',
    enProceso: 300,
    precio: 30,
    instrucciones:
      'Estime la productividad total y parcial, incluyendo el inventario en proceso. Analice qué factor podría mejorarse ' +
      'para incrementar la eficiencia y los ingresos.',
  },
  {
    n: 6,
    titulo: 'Finca de hortalizas orgánicas El Buen Sembrador',
    contexto: 'hortalizas',
    dificultad: 'basico',
    enunciado:
      'Durante una semana se emplearon 120 horas hombre (L 80 por hora), 150 kWh de energía (L 6 por kWh), fertilizantes ' +
      'orgánicos valorados en L 1 500 y agua valorada en L 800. La producción obtenida fue de 1 800 kilogramos de ' +
      'hortalizas, con 200 kilogramos en proceso. El precio de venta es de L 22 por kilogramo.',
    insumos: [mo(120, 80), energia(150), monto('fe', 'Fertilizantes orgánicos', 'materiales', 1500), monto('ag', 'Agua', 'agua', 800)],
    terminada: 1800,
    unidad: 'kg',
    enProceso: 200,
    precio: 22,
    instrucciones:
      'Calcule la productividad parcial de cada insumo y la productividad total. Interprete la relación entre los recursos ' +
      'utilizados y el volumen de producción incluyendo los productos en proceso, así como los ingresos generados.',
  },
  {
    n: 7,
    titulo: 'Empresa procesadora de miel Las Abejitas',
    contexto: 'miel',
    dificultad: 'basico',
    enunciado:
      'Esta empresa procesó miel cruda y produjo 1 500 frascos de miel listos para venta. Utilizó 90 horas de mano de obra ' +
      '(L 85 por hora), 100 kWh de energía (L 6 por kWh) y materiales (frascos, etiquetas, tapas) valorados en L 2 000. ' +
      'Quedaron en proceso 250 frascos al final del turno. El precio de venta por frasco es de L 35.',
    insumos: [mo(90, 85), energia(100), monto('mt', 'Frascos, etiquetas y tapas', 'materiales', 2000)],
    terminada: 1500,
    unidad: 'frasco',
    enProceso: 250,
    precio: 35,
    instrucciones:
      'Determine la productividad parcial de cada recurso y la productividad total. Reflexione sobre cuál de los recursos ' +
      'parece tener mayor incidencia sobre el resultado global e incluya el análisis de ingresos.',
  },
  {
    n: 8,
    titulo: 'Finca acuícola Tilapia del Sur',
    contexto: 'tilapia',
    dificultad: 'intermedio',
    enunciado:
      'Durante el ciclo de producción, esta finca utilizó 130 horas de trabajo (L 90 por hora), 350 kWh de energía (L 6 ' +
      'por kWh), alimento balanceado por L 4 000 y agua valorada en L 1 000. La producción alcanzada fue de ' +
      '2 200 kilogramos de tilapia, con 300 kilogramos en proceso. El precio de venta por kilogramo es de L 38.',
    insumos: [mo(130, 90), energia(350), monto('al', 'Alimento balanceado', 'materiales', 4000), monto('ag', 'Agua', 'agua', 1000)],
    terminada: 2200,
    unidad: 'kg',
    enProceso: 300,
    precio: 38,
    instrucciones:
      'Calcule las productividades parcial y total. Analice si el uso de los recursos fue eficiente según los resultados ' +
      'obtenidos y el ingreso generado.',
  },
  {
    n: 9,
    titulo: 'Planta procesadora de embutidos San Rafael',
    contexto: 'agroindustria',
    dificultad: 'intermedio',
    enunciado:
      'Durante la semana de trabajo, la planta utilizó 160 horas de mano de obra (L 90 por hora), 500 kWh de energía ' +
      '(L 6 por kWh) y materiales valorados en L 9 000. Se transformaron 3 500 kilogramos de carne en 2 800 kilogramos de ' +
      'embutidos, con 400 kilogramos de productos en proceso. El precio de venta es de L 48 por kilogramo de embutido.',
    insumos: [mo(160, 90), energia(500), monto('mt', 'Materiales', 'materiales', 9000)],
    terminada: 2800,
    unidad: 'kg',
    enProceso: 400,
    precio: 48,
    instrucciones:
      'Calcule la productividad total y parcial. A partir de los resultados, proponga una estrategia de mejora productiva ' +
      'e incluya el análisis de ingresos.',
  },
  {
    n: 10,
    titulo: 'Exportadora de cacao Aromas de Olancho',
    contexto: 'cacao',
    dificultad: 'avanzado',
    enunciado:
      'En una semana de operación, la empresa empleó 110 horas de trabajo humano (L 90 por hora), 210 kWh de energía ' +
      'eléctrica (L 6 por kWh) e insumos diversos valorados en L 6 500. Se procesaron 1 900 kilogramos de cacao fino, con ' +
      '250 kilogramos en proceso al cierre del periodo. El precio de venta por kilogramo de cacao fino es de L 100.',
    insumos: [mo(110, 90), energia(210), monto('in', 'Insumos diversos', 'materiales', 6500)],
    terminada: 1900,
    unidad: 'kg',
    enProceso: 250,
    precio: 100,
    instrucciones:
      'Calcule la productividad de cada insumo y la productividad total. Analice cuál de los recursos puede estar ' +
      'limitando una producción más eficiente y evalúe los ingresos generados por la producción.',
  },
];

/** Preguntas comunes a todos los ejercicios del módulo. */
export const EJERCICIOS_PRODUCTIVIDAD: readonly Ejercicio[] = SEMILLAS.map((s) => {
  const id = `prod-${String(s.n).padStart(2, '0')}`;
  return {
    id,
    titulo: s.titulo,
    tema: 'productividad',
    metodo: 'Productividad parcial, multifactorial y total',
    contexto: s.contexto,
    dificultad: s.dificultad,
    enunciado: `${s.enunciado}\n\n**Instrucciones.** ${s.instrucciones}`,
    datos: {
      tipo: 'productividad',
      moneda: 'HNL',
      insumos: s.insumos.map((i) => ({ ...i })),
      produccionTerminada: s.terminada,
      unidadProduccion: s.unidad,
      inventarioEnProceso: s.enProceso,
      gradoAvance: 0.5,
      tratamiento: 'excluir',
      precioVenta: s.precio,
      costoTotalDeclarado: s.costoDeclarado ?? null,
    },
    preguntas: preguntasProductividad({
      titulo: s.titulo,
      periodo: '',
      moneda: 'HNL',
      insumos: s.insumos.map((i) => ({ ...i })),
      produccionTerminada: s.terminada,
      unidadProduccion: s.unidad,
      inventarioEnProceso: s.enProceso,
      gradoAvance: 0.5,
      tratamiento: 'excluir',
      precioVenta: s.precio,
      costoTotalDeclarado: s.costoDeclarado ?? null,
    }),
    moneda: 'HNL',
    unidades: [s.unidad, 'hora', 'kWh', 'L'],
    tiempoEstimadoMinutos: s.dificultad === 'avanzado' ? 30 : s.dificultad === 'intermedio' ? 25 : 20,
    origen: 'textual',
    validacion: s.inconsistencias && s.inconsistencias.length > 0 ? 'con_inconsistencia' : 'verificado',
    fuenteId: 'doc-productividad',
    atribucion: `Ejercicio ${s.n}`,
    inconsistencias: [...(s.inconsistencias ?? [])],
    notasDocente: '',
    semilla: null,
    creadoEn: '2025-06-12T00:00:00.000Z',
    modificadoEn: '2025-06-12T00:00:00.000Z',
  };
});
