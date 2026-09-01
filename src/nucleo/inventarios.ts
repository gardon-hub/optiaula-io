/**
 * Módulo 12 — Sistemas y modelos de inventarios.
 *
 * La notación es la de `Manejo de inventario.pptx`: D, Co, Ch, L, R, DEO, CAI.
 * Las fórmulas de las diapositivas están como imágenes y no se pudieron
 * extraer, así que se usan las estándar de la bibliografía del curso —Chase,
 * Heizer, Russell y Stevenson— con esos mismos símbolos. No se agregó ninguna
 * fuente nueva.
 *
 * Tres modelos, los tres de la presentación:
 *
 * - **Lote económico (MLE).** El abastecimiento llega completo, la demanda es
 *   uniforme y todos los costos son constantes.
 * - **Reabastecimiento uniforme.** El lote entra a una tasa de producción `p`
 *   mientras la demanda sigue consumiendo, así que el inventario nunca llega a
 *   valer `Q`: llega a `Imáx`, y por eso conviene ordenar más.
 * - **Periodo fijo.** No se revisa el inventario de continuo sino cada `T`, y
 *   se ordena hasta un nivel `M` que debe alcanzar para el periodo más el
 *   tiempo de entrega.
 *
 * Una regla que atraviesa el módulo, y que la propia presentación subraya: **la
 * demanda y el tiempo de entrega tienen que estar en la misma escala de
 * tiempo**. Aquí la demanda entra por año y el tiempo de entrega en días, así
 * que la conversión pasa por `diasPorAnio` y no por una constante escondida.
 */

import type { CodigoMoneda } from '@/config/identidad';
import { dividirSeguro, formatearNumero, sumaExacta } from './numero';
import {
  ConstructorPasos,
  aviso,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Resultado,
} from './tipos';

export type ModeloInventario = 'lote_economico' | 'reabastecimiento_uniforme' | 'periodo_fijo';

export const NOMBRE_MODELO_INVENTARIO: Record<ModeloInventario, string> = {
  lote_economico: 'Lote económico (MLE)',
  reabastecimiento_uniforme: 'Reabastecimiento uniforme',
  periodo_fijo: 'Periodo fijo de reorden',
};

export interface DatosInventarios {
  readonly titulo: string;
  readonly modelo: ModeloInventario;
  readonly moneda: CodigoMoneda;
  readonly demandaAnual: number;
  readonly unidadProducto: string;
  readonly costoOrdenar: number;
  readonly costoConservar: number;
  readonly costoUnitario: number;
  readonly tiempoEntregaDias: number;
  readonly diasPorAnio: number;
  readonly tasaProduccionAnual: number | null;
}

export interface ResultadoInventarios {
  readonly modelo: ModeloInventario;
  readonly moneda: CodigoMoneda;
  /** Cantidad a ordenar. En el periodo fijo es la del intervalo económico. */
  readonly cantidadOptima: number;
  /** Inventario máximo alcanzado. Igual a `Q` salvo en reabastecimiento uniforme. */
  readonly inventarioMaximo: number;
  readonly ordenesPorAnio: number;
  /** Días entre órdenes. */
  readonly diasEntreOrdenes: number;
  readonly costoOrdenarAnual: number;
  readonly costoConservarAnual: number;
  /** Costo anual de inventario: ordenar más conservar. No incluye la compra. */
  readonly costoAnualInventario: number;
  /** Costo de la compra de todo el año, cuando se conoce el costo unitario. */
  readonly costoCompraAnual: number | null;
  /** Valor de cada orden, cuando se conoce el costo unitario. */
  readonly valorDeCadaOrden: number | null;
  /** Punto de reorden en unidades. */
  readonly puntoReorden: number;
  readonly demandaDiaria: number;
  /** Intervalo económico de reorden en años. Solo en el periodo fijo. */
  readonly intervaloAnios: number | null;
  /** Nivel hasta el que se ordena. Solo en el periodo fijo. */
  readonly nivelObjetivo: number | null;
}

function validar(d: DatosInventarios): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.demandaAnual <= 0) g.push(error('INV_DEMANDA', 'La demanda anual debe ser mayor que cero.'));
  if (d.costoConservar <= 0) {
    g.push(
      error(
        'INV_CONSERVAR',
        'El costo de conservación debe ser mayor que cero: si conservar no costara nada, convendría ordenar todo el año de una vez y el lote económico no existiría.',
      ),
    );
  }
  if (d.costoOrdenar < 0) g.push(error('INV_ORDENAR', 'El costo de ordenar no puede ser negativo.'));
  if (d.diasPorAnio <= 0) g.push(error('INV_DIAS', 'Los días del año deben ser un número positivo.'));

  if (d.modelo === 'reabastecimiento_uniforme') {
    if (d.tasaProduccionAnual === null) {
      g.push(
        error(
          'INV_SIN_TASA',
          'El reabastecimiento uniforme necesita la tasa de producción: sin ella no se sabe a qué velocidad entra el lote.',
        ),
      );
    } else if (d.tasaProduccionAnual <= d.demandaAnual) {
      g.push(
        error(
          'INV_TASA_INSUFICIENTE',
          `La tasa de producción (${formatearNumero(d.tasaProduccionAnual)}) no supera a la demanda (${formatearNumero(d.demandaAnual)}). ` +
            'Produciendo más despacio de lo que se consume no se acumula inventario nunca y el modelo no aplica.',
        ),
      );
    }
  }

  if (d.costoOrdenar === 0) {
    g.push(
      aviso(
        'INV_ORDENAR_CERO',
        'Con costo de ordenar cero, el lote económico tiende a cero: convendría pedir de a una unidad. Revise el dato.',
      ),
    );
  }

  return g;
}

export function resolverInventarios(d: DatosInventarios): Resultado<ResultadoInventarios> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const simbolo = d.moneda === 'USD' ? 'US$' : 'L';
  const u = d.unidadProducto;
  const pasos = new ConstructorPasos();

  // Factor del reabastecimiento uniforme: la fracción del lote que llega a
  // acumularse. Con abastecimiento global vale 1 y las fórmulas coinciden.
  const p = d.tasaProduccionAnual;
  const factor = d.modelo === 'reabastecimiento_uniforme' && p !== null ? 1 - d.demandaAnual / p : 1;

  const demandaDiaria = d.demandaAnual / d.diasPorAnio;
  const puntoReorden = demandaDiaria * d.tiempoEntregaDias;

  let cantidadOptima: number;
  let intervaloAnios: number | null = null;
  let nivelObjetivo: number | null = null;

  if (d.modelo === 'periodo_fijo') {
    // T = √(2 Co / (D Ch)). El intervalo sale en años; la cantidad del periodo
    // es la demanda de ese intervalo, que coincide con el lote económico.
    intervaloAnios = Math.sqrt((2 * d.costoOrdenar) / (d.demandaAnual * d.costoConservar));
    cantidadOptima = d.demandaAnual * intervaloAnios;
    // M cubre el intervalo más el tiempo de entrega: hay que aguantar hasta la
    // revisión siguiente y además hasta que llegue lo que se pida en ella.
    nivelObjetivo = d.demandaAnual * (intervaloAnios + d.tiempoEntregaDias / d.diasPorAnio);
  } else {
    cantidadOptima = Math.sqrt((2 * d.demandaAnual * d.costoOrdenar) / (d.costoConservar * factor));
  }

  const inventarioMaximo = cantidadOptima * factor;
  const ordenesPorAnio = dividirSeguro(d.demandaAnual, cantidadOptima) ?? 0;
  const diasEntreOrdenes = dividirSeguro(d.diasPorAnio, ordenesPorAnio) ?? 0;

  const costoOrdenarAnual = ordenesPorAnio * d.costoOrdenar;
  const costoConservarAnual = (inventarioMaximo / 2) * d.costoConservar;
  const costoAnualInventario = sumaExacta([costoOrdenarAnual, costoConservarAnual]);

  const costoCompraAnual = d.costoUnitario > 0 ? d.demandaAnual * d.costoUnitario : null;
  const valorDeCadaOrden = d.costoUnitario > 0 ? cantidadOptima * d.costoUnitario : null;

  if (d.tiempoEntregaDias >= diasEntreOrdenes && d.tiempoEntregaDias > 0) {
    diagnosticos.push(
      aviso(
        'INV_ENTREGA_LARGA',
        `El tiempo de entrega (${formatearNumero(d.tiempoEntregaDias)} días) alcanza o supera el intervalo entre órdenes ` +
          `(${formatearNumero(diasEntreOrdenes, { decimales: 1 })} días): habrá más de una orden en camino a la vez. ` +
          'El punto de reorden calculado sigue valiendo, pero hay que restarle lo que ya viene en tránsito.',
      ),
    );
  }

  if (d.modelo === 'lote_economico' && d.tasaProduccionAnual !== null) {
    diagnosticos.push(
      nota(
        'INV_TASA_IGNORADA',
        'El modelo de lote económico supone que el abastecimiento llega completo, así que la tasa de producción no se usa. ' +
          'Cambie a reabastecimiento uniforme para tomarla en cuenta.',
      ),
    );
  }

  // ── Pasos ────────────────────────────────────────────────────────────────

  pasos.agregar({
    titulo: 'Ordenar los datos con la notación del modelo',
    explicacion:
      'La demanda viene por año y el tiempo de entrega en días. La presentación lo advierte: **la demanda y el tiempo ' +
      'de entrega tienen que estar en la misma escala de tiempo**, así que lo primero es dejar clara la conversión.',
    tabla: {
      encabezados: ['Símbolo', 'Significado', 'Valor'],
      filas: [
        ['D', 'Demanda anual', `${formatearNumero(d.demandaAnual)} ${u}`],
        ['Co', 'Costo de ordenar por orden', `${simbolo} ${formatearNumero(d.costoOrdenar)}`],
        ['Ch', 'Costo de conservación por unidad y año', `${simbolo} ${formatearNumero(d.costoConservar)}`],
        ['L', 'Tiempo de entrega', `${formatearNumero(d.tiempoEntregaDias)} días`],
        ['—', 'Días del año usados en la conversión', formatearNumero(d.diasPorAnio, { decimales: 0 })],
        ['D/día', 'Demanda diaria', `${formatearNumero(demandaDiaria)} ${u}`],
        ...(p !== null && d.modelo === 'reabastecimiento_uniforme'
          ? [['p', 'Tasa de producción anual', `${formatearNumero(p)} ${u}`]]
          : []),
      ],
    },
  });

  if (d.modelo === 'periodo_fijo') {
    pasos.agregar({
      titulo: 'Calcular el intervalo económico de reorden',
      explicacion:
        'En el modelo de periodo fijo la decisión no es cuánto pedir sino cada cuánto revisar. El intervalo que ' +
        'minimiza el costo anual sale de la misma comparación entre ordenar y conservar.',
      formula: 'T = \\sqrt{\\frac{2\\,C_o}{D\\,C_h}}',
      valor: intervaloAnios! * d.diasPorAnio,
      unidad: 'días',
    });

    pasos.agregar({
      titulo: 'Calcular el nivel hasta el que se ordena',
      explicacion:
        'En cada revisión se pide lo necesario para llegar a **M**. Ese nivel tiene que cubrir la demanda del ' +
        'intervalo completo y además la del tiempo de entrega, porque lo que se pida hoy no llega hasta dentro de ' +
        `${formatearNumero(d.tiempoEntregaDias)} días.`,
      formula: 'M = D\\,(T + L)',
      valor: nivelObjetivo!,
      unidad: u,
    });
  } else {
    pasos.agregar({
      titulo:
        d.modelo === 'reabastecimiento_uniforme'
          ? 'Calcular la cantidad a ordenar con reabastecimiento uniforme'
          : 'Calcular el lote económico',
      explicacion:
        d.modelo === 'reabastecimiento_uniforme'
          ? 'El lote no llega de golpe: entra a la tasa de producción mientras la demanda sigue consumiendo. El ' +
            'inventario nunca llega a valer Q, así que conservar cuesta menos y conviene ordenar **más** que con ' +
            'abastecimiento global.'
          : 'El lote económico equilibra los dos costos que se mueven en direcciones opuestas: pedir seguido encarece ' +
            'las órdenes, pedir mucho encarece la conservación.',
      formula:
        d.modelo === 'reabastecimiento_uniforme'
          ? 'Q = \\sqrt{\\frac{2\\,D\\,C_o}{C_h\\left(1 - \\frac{D}{p}\\right)}}'
          : 'Q = \\sqrt{\\frac{2\\,D\\,C_o}{C_h}}',
      valor: cantidadOptima,
      unidad: u,
    });
  }

  if (d.modelo === 'reabastecimiento_uniforme') {
    pasos.agregar({
      titulo: 'Calcular el inventario máximo',
      explicacion:
        'Mientras entra el lote, la demanda consume parte de él. El inventario tope no es Q sino la fracción que ' +
        'alcanza a acumularse, y es sobre esa fracción que se paga la conservación.',
      formula: 'I_{máx} = Q\\left(1 - \\frac{D}{p}\\right)',
      valor: inventarioMaximo,
      unidad: u,
    });
  }

  pasos.agregar({
    titulo: 'Calcular el ritmo de las órdenes',
    explicacion:
      `Con lotes de ${formatearNumero(cantidadOptima)} ${u} y una demanda de ${formatearNumero(d.demandaAnual)} ${u} al ` +
      `año, salen ${formatearNumero(ordenesPorAnio)} órdenes, una cada ${formatearNumero(diasEntreOrdenes)} días.`,
    formula: 'N = \\frac{D}{Q} \\qquad DEO = \\frac{\\text{días del año}}{N}',
    valor: diasEntreOrdenes,
    unidad: 'días entre órdenes',
  });

  pasos.agregar({
    titulo: 'Calcular el costo anual de inventario',
    explicacion:
      'El costo anual suma lo que cuesta ordenar y lo que cuesta conservar. En el lote económico los dos se igualan: ' +
      'esa igualdad es la señal de que se está en el óptimo.',
    formula: 'CAI = \\frac{D}{Q}\\,C_o + \\frac{I_{máx}}{2}\\,C_h',
    tabla: {
      encabezados: ['Componente', 'Cálculo', `Monto (${simbolo})`],
      filas: [
        ['Ordenar', `${formatearNumero(ordenesPorAnio)} órdenes × ${simbolo} ${formatearNumero(d.costoOrdenar)}`, formatearNumero(costoOrdenarAnual)],
        ['Conservar', `${formatearNumero(inventarioMaximo / 2)} ${u} × ${simbolo} ${formatearNumero(d.costoConservar)}`, formatearNumero(costoConservarAnual)],
      ],
      pie: ['Costo anual de inventario', '', formatearNumero(costoAnualInventario)],
      ...(costoCompraAnual !== null
        ? {
            pieAdicional: [
              `La compra del año es aparte: ${formatearNumero(d.demandaAnual)} ${u} × ${simbolo} ${formatearNumero(d.costoUnitario)} = ` +
                `${simbolo} ${formatearNumero(costoCompraAnual)}. No depende del tamaño del lote, así que no cambia la decisión.`,
            ],
          }
        : {}),
    },
    valor: costoAnualInventario,
    unidad: simbolo,
  });

  if (d.tiempoEntregaDias > 0) {
    pasos.agregar({
      titulo: 'Calcular el punto de reorden',
      explicacion:
        `Hay que pedir cuando queda lo justo para aguantar el tiempo de entrega: ${formatearNumero(demandaDiaria)} ` +
        `${u} al día durante ${formatearNumero(d.tiempoEntregaDias)} días.`,
      formula: 'R = \\frac{D}{\\text{días del año}} \\times L',
      valor: puntoReorden,
      unidad: u,
    });
  }

  const interpretacion =
    d.modelo === 'periodo_fijo'
      ? `Conviene revisar el inventario cada ${formatearNumero(intervaloAnios! * d.diasPorAnio)} días y pedir en cada ` +
        `revisión lo que falte para llegar a ${formatearNumero(nivelObjetivo!)} ${u}. La ventaja de este modelo no es el ` +
        'costo —es el mismo del lote económico— sino la logística: se pide siempre el mismo día, lo que permite juntar ' +
        'pedidos de varios artículos al mismo proveedor. Se paga con más inventario de seguridad, porque entre dos ' +
        'revisiones nadie está mirando el nivel.'
      : `Conviene pedir ${formatearNumero(cantidadOptima)} ${u} cada vez, unas ${formatearNumero(ordenesPorAnio)} veces ` +
        `al año, y disparar el pedido cuando queden ${formatearNumero(puntoReorden)} ${u}. Eso cuesta ` +
        `${simbolo} ${formatearNumero(costoAnualInventario)} al año en órdenes y conservación. ` +
        'La curva del costo total es plana cerca del óptimo: pedir un 10 % de más o de menos casi no lo mueve, así que ' +
        'conviene redondear el lote a algo que el proveedor despache cómodo antes que perseguir el número exacto.';

  return {
    datos: {
      modelo: d.modelo,
      moneda: d.moneda,
      cantidadOptima,
      inventarioMaximo,
      ordenesPorAnio,
      diasEntreOrdenes,
      costoOrdenarAnual,
      costoConservarAnual,
      costoAnualInventario,
      costoCompraAnual,
      valorDeCadaOrden,
      puntoReorden,
      demandaDiaria,
      intervaloAnios,
      nivelObjetivo,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion,
  };
}

export interface PuntoCostoInventario {
  readonly cantidad: number;
  readonly ordenar: number;
  readonly conservar: number;
  readonly total: number;
}

/**
 * Serie para la gráfica clásica del módulo: el costo de ordenar cae, el de
 * conservar sube y el total tiene su mínimo donde se cruzan.
 */
export function serieCostosInventario(d: DatosInventarios, puntos = 60): readonly PuntoCostoInventario[] {
  const r = resolverInventarios(d).datos;
  if (r === null) return [];

  const factor = r.inventarioMaximo / r.cantidadOptima;
  const desde = Math.max(1, r.cantidadOptima * 0.2);
  const hasta = r.cantidadOptima * 2.5;
  const paso = (hasta - desde) / (puntos - 1);

  return Array.from({ length: puntos }, (_, i) => {
    const cantidad = desde + i * paso;
    const ordenar = (d.demandaAnual / cantidad) * d.costoOrdenar;
    const conservar = ((cantidad * factor) / 2) * d.costoConservar;
    return { cantidad, ordenar, conservar, total: ordenar + conservar };
  });
}
