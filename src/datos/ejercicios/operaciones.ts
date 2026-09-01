/**
 * Ejercicios de inventarios y de líneas de espera.
 *
 * **Inventarios** sale de `Manejo de inventario.pptx`: el problema de la
 * diapositiva 14 está transcrito literalmente con sus seis preguntas, y los
 * otros tres son derivados sobre los mismos tres modelos que la presentación
 * enseña —lote económico, reabastecimiento uniforme y periodo fijo—, que no
 * traen ejercicio propio. Ver inconsistencia I-16 sobre los días del año.
 *
 * **Líneas de espera** no aparece en ningún material del curso: los cuatro
 * ejercicios son derivados y así están marcados, igual que los del simplex y
 * los de compresión de proyectos. Ver inconsistencia I-17.
 */

import type { Contexto, Dificultad, Ejercicio } from '@/esquemas';
import { preguntasColas, preguntasInventarios } from '@/nucleo/preguntas';
import type { DatosColas } from '@/nucleo/colas';
import type { DatosInventarios } from '@/nucleo/inventarios';

// ───────────────────────────── Inventarios ─────────────────────────────

interface SemillaInventario {
  readonly id: string;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosInventarios, 'titulo'>;
  readonly notasDocente: string;
  readonly minutos: number;
  readonly textual?: boolean;
  readonly atribucion?: string;
  readonly inconsistencias?: readonly string[];
}

const INVENTARIOS: readonly SemillaInventario[] = [
  {
    id: 'inv-01',
    titulo: 'Lote económico de un artículo de demanda uniforme',
    contexto: 'general',
    dificultad: 'basico',
    textual: true,
    atribucion: 'Diapositiva 14 — Manejo de inventario.pptx',
    enunciado:
      'Si la demanda de un artículo es uniforme de 9 000 unidades por año, el costo de ordenar es $ 2,50 por orden y el ' +
      'costo de conservación es $ 2,00 por unidad por año:\n\n' +
      '- Encuentre el tamaño del lote económico.\n' +
      '- ¿Cuántas órdenes se harán en un año?\n' +
      '- ¿Cuántos días de abastecimiento se ordenan cada vez?\n' +
      '- Si cada unidad cuesta $ 7,00, ¿cuál es el valor del lote económico por orden?\n' +
      '- ¿Cuál es el costo de inventario anual?\n' +
      '- Si el tiempo de entrega es de tres días, ¿cuál es el punto de reorden?',
    datos: {
      modelo: 'lote_economico',
      moneda: 'USD',
      demandaAnual: 9000,
      unidadProducto: 'unidades',
      costoOrdenar: 2.5,
      costoConservar: 2,
      costoUnitario: 7,
      tiempoEntregaDias: 3,
      diasPorAnio: 360,
      tasaProduccionAnual: null,
    },
    notasDocente:
      'El ejercicio de la diapositiva 14, transcrito con sus seis preguntas. Todas las respuestas salen redondas: lote ' +
      'de 150 unidades, 60 órdenes al año, una cada 6 días, $ 1 050 por orden, costo anual de inventario de $ 300 y ' +
      'punto de reorden en 75 unidades.\n\n' +
      'Dos cosas para la clase. La primera: el costo de ordenar y el de conservar dan $ 150 cada uno. Esa igualdad no ' +
      'es casualidad, es la señal de que se está en el lote económico, y sirve de comprobación rápida. La segunda: los ' +
      'números redondos exigen un año de 360 días; con 365 el intervalo da 6,08 días y el punto de reorden 73,97. La ' +
      'presentación no dice cuál usa, y eso quedó registrado como I-16.',
    minutos: 30,
    inconsistencias: ['I-16'],
  },
  {
    id: 'inv-02',
    titulo: 'Concentrado para la granja: cuánto pedir y cuándo',
    contexto: 'avicultura_engorde',
    dificultad: 'intermedio',
    enunciado:
      'Una engorda consume 36 000 quintales de concentrado al año, a ritmo parejo. Cada pedido al proveedor cuesta ' +
      'L 450,00 en gestión y transporte, y mantener un quintal en bodega durante un año cuesta L 25,00 entre espacio, ' +
      'mermas y capital inmovilizado. El quintal cuesta L 620,00 y el proveedor entrega en 5 días.\n\n' +
      '**Determine el lote económico, cuántos pedidos se harán al año, el costo anual de inventario y el punto de ' +
      'reorden.**',
    datos: {
      modelo: 'lote_economico',
      moneda: 'HNL',
      demandaAnual: 36000,
      unidadProducto: 'quintales',
      costoOrdenar: 450,
      costoConservar: 25,
      costoUnitario: 620,
      tiempoEntregaDias: 5,
      diasPorAnio: 360,
      tasaProduccionAnual: null,
    },
    notasDocente:
      'Ejercicio derivado, con el mismo modelo de la presentación y cifras de una engorda real. El lote da 1 138,42 ' +
      'quintales y el costo anual L 28 460,50.\n\n' +
      'El punto que conviene explotar es la planitud de la curva: pedir 1 000 o 1 300 quintales en lugar de 1 138 ' +
      'cambia el costo anual en menos del 2 %. Conviene mostrarlo moviendo el deslizador del laboratorio, porque ' +
      'desarma la idea de que hay que perseguir el número exacto. En la práctica manda lo que el proveedor despache ' +
      'cómodo y lo que quepa en la bodega.',
    minutos: 30,
  },
  {
    id: 'inv-03',
    titulo: 'Planta de concentrado: el lote entra mientras se consume',
    contexto: 'maiz',
    dificultad: 'avanzado',
    enunciado:
      'Una cooperativa fabrica su propio concentrado en lugar de comprarlo. La demanda de sus granjas es de 24 000 ' +
      'quintales al año y la planta produce a un ritmo de 60 000 quintales anuales cuando está encendida. Cada arranque ' +
      'de producción cuesta L 1 800,00 en limpieza, calibración y pérdida de arranque, y conservar un quintal cuesta ' +
      'L 30,00 al año.\n\n' +
      '**Determine cuánto conviene producir en cada corrida, cuál es el inventario máximo que llega a acumularse y el ' +
      'costo anual de inventario.**',
    datos: {
      modelo: 'reabastecimiento_uniforme',
      moneda: 'HNL',
      demandaAnual: 24000,
      unidadProducto: 'quintales',
      costoOrdenar: 1800,
      costoConservar: 30,
      costoUnitario: 0,
      tiempoEntregaDias: 0,
      diasPorAnio: 360,
      tasaProduccionAnual: 60000,
    },
    notasDocente:
      'El segundo de los tres casos especiales de la presentación. Aquí el lote no llega de golpe: entra a 60 000 ' +
      'quintales al año mientras la demanda consume 24 000, así que solo se acumula el 60 % de lo producido.\n\n' +
      'La corrida óptima son 2 190,89 quintales, pero el inventario máximo es apenas 1 314,53: esa diferencia es todo ' +
      'el modelo. Conviene compararlo en el laboratorio con el lote económico de abastecimiento global, que daría ' +
      '1 697 quintales: **producir uno mismo permite lotes más grandes precisamente porque nunca hay que almacenarlos ' +
      'enteros**. Es el argumento de fondo para integrar la producción de insumos.',
    minutos: 35,
  },
  {
    id: 'inv-04',
    titulo: 'Revisión periódica de insumos veterinarios',
    contexto: 'veterinaria',
    dificultad: 'avanzado',
    enunciado:
      'Una cooperativa compra insumos veterinarios a un único proveedor que visita la zona en fechas fijas, así que no ' +
      'conviene revisar el inventario de continuo sino cada cierto tiempo y pedir hasta un nivel. El consumo es de ' +
      '4 800 frascos al año, cada pedido cuesta L 900,00 y conservar un frasco cuesta L 60,00 al año. El proveedor ' +
      'entrega 12 días después del pedido.\n\n' +
      '**Determine cada cuántos días conviene revisar, hasta qué nivel hay que ordenar y cuál es el costo anual de ' +
      'inventario.**',
    datos: {
      modelo: 'periodo_fijo',
      moneda: 'HNL',
      demandaAnual: 4800,
      unidadProducto: 'frascos',
      costoOrdenar: 900,
      costoConservar: 60,
      costoUnitario: 0,
      tiempoEntregaDias: 12,
      diasPorAnio: 360,
      tasaProduccionAnual: null,
    },
    notasDocente:
      'El tercer caso de la presentación: el modelo de periodo fijo, con su intervalo económico T y su nivel M. La ' +
      'revisión conviene cada 28,46 días y el nivel hasta el que se ordena son 539,47 frascos.\n\n' +
      'Lo que hay que dejar claro en clase es por qué M cubre T **más** el tiempo de entrega: lo que se pide hoy no ' +
      'llega hasta dentro de 12 días, y para entonces ya habrá que aguantar hasta la revisión siguiente. Quien calcula ' +
      'M solo con T pediría hasta 379,47 y se quedaría sin insumos justo antes de cada entrega. El costo anual es el mismo del lote económico ' +
      '—L 22 768,40—: este modelo no se elige por barato sino por logística, porque permite juntar el pedido de varios ' +
      'artículos al mismo proveedor.',
    minutos: 35,
  },
];

export const EJERCICIOS_INVENTARIOS: readonly Ejercicio[] = INVENTARIOS.map((s) => ({
  id: s.id,
  titulo: s.titulo,
  tema: 'inventarios' as const,
  metodo:
    s.datos.modelo === 'lote_economico'
      ? 'Modelo del lote económico (MLE)'
      : s.datos.modelo === 'reabastecimiento_uniforme'
        ? 'Lote económico con reabastecimiento uniforme'
        : 'Modelo de periodo fijo de reorden',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: { tipo: 'inventarios' as const, ...s.datos },
  preguntas: preguntasInventarios({ titulo: s.titulo, ...s.datos }),
  moneda: s.datos.moneda,
  unidades: [s.datos.unidadProducto, s.datos.moneda === 'USD' ? 'US$' : 'L'],
  tiempoEstimadoMinutos: s.minutos,
  origen: s.textual === true ? ('textual' as const) : ('derivado' as const),
  validacion: (s.inconsistencias?.length ?? 0) > 0 ? ('con_inconsistencia' as const) : ('verificado' as const),
  fuenteId: s.textual === true ? 'ppt-inventario' : null,
  atribucion:
    s.atribucion ??
    'Ejercicio derivado sobre los modelos de `Manejo de inventario.pptx`, que no trae ejercicio propio para este caso',
  inconsistencias: [...(s.inconsistencias ?? [])],
  notasDocente: s.notasDocente,
  semilla: null,
  creadoEn: '2026-08-29T00:00:00.000Z',
  modificadoEn: '2026-08-29T00:00:00.000Z',
}));

// ───────────────────────────── Líneas de espera ─────────────────────────────

interface SemillaColas {
  readonly id: string;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly enunciado: string;
  readonly datos: Omit<DatosColas, 'titulo'>;
  readonly notasDocente: string;
  readonly minutos: number;
}

const COLAS: readonly SemillaColas[] = [
  {
    id: 'cola-01',
    titulo: 'Báscula de la planta: un solo puesto de pesaje',
    contexto: 'maiz',
    dificultad: 'basico',
    enunciado:
      'A la báscula de una planta de granos llegan en promedio 6 camiones por hora, distribuidos al azar a lo largo del ' +
      'día. El pesador atiende un camión en 8 minutos en promedio, es decir 7,5 camiones por hora, y el tiempo de ' +
      'atención varía mucho de un camión a otro.\n\n' +
      '**Calcule la utilización de la báscula, cuántos camiones hay en promedio esperando, cuánto espera cada uno y ' +
      'cuánto tiempo pasa en total en la planta.**',
    datos: {
      tasaLlegadas: 6,
      tasaServicio: 7.5,
      servidores: 1,
      unidadTiempo: 'hora',
      nombreClientes: 'camiones',
      moneda: 'HNL',
      costoEsperaPorHora: 0,
      costoServidorPorHora: 0,
    },
    notasDocente:
      'El caso más simple del módulo: un solo servidor. La utilización es del 80 % y ahí está la lección. Con la ' +
      'báscula ocupada solo cuatro quintas partes del tiempo, uno esperaría colas cortas; en realidad hay 3,2 camiones ' +
      'esperando y cada uno aguarda 32 minutos.\n\n' +
      'Conviene mover la tasa de llegadas en el laboratorio: a 7 camiones por hora la utilización sube apenas al 93 % ' +
      'pero la espera se multiplica por más de tres. Esa curva es todo el módulo.',
    minutos: 25,
  },
  {
    id: 'cola-02',
    titulo: 'Sala de ordeño: ¿cuántas unidades conviene abrir?',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    enunciado:
      'En la sala de ordeño llegan 40 vacas por hora al corral de espera y cada unidad de ordeño procesa 15 vacas por ' +
      'hora. Cada hora que una vaca pasa esperando cuesta L 12,00 en pérdida de producción y estrés, y operar una ' +
      'unidad de ordeño cuesta L 180,00 por hora entre energía, insumos y mano de obra.\n\n' +
      '**Determine cuántas unidades conviene tener funcionando.**',
    datos: {
      tasaLlegadas: 40,
      tasaServicio: 15,
      servidores: 3,
      unidadTiempo: 'hora',
      nombreClientes: 'vacas',
      moneda: 'HNL',
      costoEsperaPorHora: 12,
      costoServidorPorHora: 180,
    },
    notasDocente:
      'Aquí está la decisión real del módulo: no cuánta cola hay sino cuántos servidores abrir. Con tres unidades el ' +
      'sistema apenas se sostiene —utilización del 88,9 %— y el costo total es alto; con cuatro baja bastante, y de ' +
      'ahí en adelante cada unidad extra cuesta más de lo que ahorra.\n\n' +
      'Conviene hacer notar que el mínimo de costo **no** está donde la cola desaparece. Eliminar la espera por ' +
      'completo exige tanta capacidad ociosa que siempre sale más caro que tolerar una cola corta. La tabla de ' +
      'comparación del laboratorio lo muestra de un vistazo.',
    minutos: 35,
  },
  {
    id: 'cola-03',
    titulo: 'Recepción de leche: dos andenes en temporada alta',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    enunciado:
      'La planta recibe leche en dos andenes. En temporada alta llegan 9 cisternas por hora y cada andén descarga una ' +
      'cisterna en 12 minutos, es decir 5 por hora.\n\n' +
      '**Calcule la utilización, la probabilidad de que una cisterna que llega tenga que esperar y el tiempo promedio ' +
      'de espera. ¿Alcanzarían los dos andenes si las llegadas subieran a 10 por hora?**',
    datos: {
      tasaLlegadas: 9,
      tasaServicio: 5,
      servidores: 2,
      unidadTiempo: 'hora',
      nombreClientes: 'cisternas',
      moneda: 'HNL',
      costoEsperaPorHora: 0,
      costoServidorPorHora: 0,
    },
    notasDocente:
      'El caso de dos servidores, con la probabilidad de esperar como medida protagonista: es la que se puede prometer ' +
      'a un transportista. Con 9 cisternas por hora la utilización es del 90 % y la espera ya es larga.\n\n' +
      'La segunda pregunta es la importante y conviene resolverla en el laboratorio: a 10 cisternas por hora la ' +
      'capacidad de los dos andenes es exactamente 10, así que el sistema se vuelve **inestable** y la aplicación lo ' +
      'dice con todas las letras en vez de devolver un número. No es que la cola sea larga: es que crece sin límite y ' +
      'no existe promedio.',
    minutos: 30,
  },
  {
    id: 'cola-04',
    titulo: 'Ventanillas de la cooperativa: la trampa de la eficiencia',
    contexto: 'cooperativa',
    dificultad: 'avanzado',
    enunciado:
      'A la cooperativa llegan 28 socios por hora a hacer trámites y cada cajero atiende 10 por hora. La gerencia ' +
      'quiere reducir de cuatro cajeros a tres «porque están ociosos casi la mitad del tiempo».\n\n' +
      '**Calcule la espera con cuatro cajeros y con tres, y evalúe la propuesta. Si la hora de un socio esperando ' +
      'vale L 40,00 y un cajero cuesta L 95,00 por hora, ¿qué conviene?**',
    datos: {
      tasaLlegadas: 28,
      tasaServicio: 10,
      servidores: 4,
      unidadTiempo: 'hora',
      nombreClientes: 'socios',
      moneda: 'HNL',
      costoEsperaPorHora: 40,
      costoServidorPorHora: 95,
    },
    notasDocente:
      'El mejor ejercicio del módulo para discutir, porque la intuición gerencial falla de forma espectacular. Con ' +
      'cuatro cajeros la utilización es del 70 % —de ahí la queja de la ociosidad— y la espera es de 2,1 minutos. Con ' +
      'tres, la utilización sube al 93,3 % y la espera salta a 26,3 minutos: **doce veces más**, por quitar un solo ' +
      'cajero.\n\n' +
      'El costo lo confirma: cuatro cajeros salen más baratos que tres una vez que se cuenta el tiempo de los socios. ' +
      'La conclusión que conviene dejar escrita es que un servidor ocioso no es un servidor desperdiciado: es la ' +
      'holgura que impide que el sistema se desborde, y eliminarla es exactamente lo que produce las filas largas.',
    minutos: 40,
  },
];

export const EJERCICIOS_COLAS: readonly Ejercicio[] = COLAS.map((s) => ({
  id: s.id,
  titulo: s.titulo,
  tema: 'colas' as const,
  metodo: s.datos.servidores === 1 ? 'Modelo de líneas de espera M/M/1' : 'Modelo de líneas de espera M/M/s',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: { tipo: 'colas' as const, ...s.datos },
  preguntas: preguntasColas({ titulo: s.titulo, ...s.datos }),
  moneda: s.datos.moneda,
  unidades: [s.datos.nombreClientes, s.datos.unidadTiempo],
  tiempoEstimadoMinutos: s.minutos,
  origen: 'derivado' as const,
  validacion: 'verificado' as const,
  fuenteId: null,
  atribucion: 'Ejercicio derivado: las líneas de espera no aparecen en los materiales del curso (I-17)',
  inconsistencias: ['I-17'],
  notasDocente: s.notasDocente,
  semilla: null,
  creadoEn: '2026-08-29T00:00:00.000Z',
  modificadoEn: '2026-08-29T00:00:00.000Z',
}));
