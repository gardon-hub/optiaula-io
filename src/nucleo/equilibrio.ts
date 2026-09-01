/**
 * Módulo 5 — Punto de equilibrio.
 *
 * Un producto y multiproducto, con comisiones sobre ingresos, valor de
 * recuperación, utilidad objetivo y porcentaje de capacidad utilizada.
 *
 * Regla de moneda: un cálculo nunca mezcla monedas. La moneda viaja con los
 * datos y se valida antes de operar.
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

export interface DatosEquilibrio {
  readonly titulo: string;
  readonly moneda: CodigoMoneda;
  readonly costosFijos: number;
  readonly costoVariableUnitario: number;
  readonly precioVenta: number;
  /** Comisión de ventas como porcentaje del ingreso (0–100). */
  readonly comisionPorcentaje: number;
  /** Ingreso por recuperación o venta de residuos que reduce el costo fijo. */
  readonly valorRecuperacion: number;
  /** Capacidad productiva máxima del periodo, en unidades. */
  readonly capacidad: number | null;
  /** Volumen realmente esperado de ventas, para calcular utilidad. */
  readonly volumenEsperado: number | null;
  /** Utilidad que la gerencia quiere alcanzar. */
  readonly utilidadObjetivo: number | null;
  readonly unidadProducto: string;
}

export interface ResultadoEquilibrio {
  readonly moneda: CodigoMoneda;
  /** Costo variable total por unidad, incluida la comisión. */
  readonly costoVariableEfectivo: number;
  readonly costosFijosNetos: number;
  readonly margenContribucionUnitario: number;
  /** Margen de contribución como fracción del precio (0–1). */
  readonly razonMargenContribucion: number | null;
  readonly puntoEquilibrioUnidades: number | null;
  readonly puntoEquilibrioMonetario: number | null;
  readonly porcentajeCapacidad: number | null;
  readonly unidadesParaObjetivo: number | null;
  readonly utilidadEsperada: number | null;
  /** Margen de seguridad: cuánto puede caer la venta antes de perder. */
  readonly margenSeguridadUnidades: number | null;
  readonly margenSeguridadPorcentaje: number | null;
  readonly alcanzable: boolean;
  readonly unidadProducto: string;
}

function validar(d: DatosEquilibrio): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.precioVenta <= 0) g.push(error('EQ_PRECIO_NO_POSITIVO', 'El precio de venta debe ser mayor que cero.'));
  if (d.costoVariableUnitario < 0) g.push(error('EQ_CV_NEGATIVO', 'El costo variable unitario no puede ser negativo.'));
  if (d.costosFijos < 0) g.push(error('EQ_CF_NEGATIVO', 'Los costos fijos no pueden ser negativos.'));
  if (d.comisionPorcentaje < 0 || d.comisionPorcentaje >= 100) {
    g.push(error('EQ_COMISION_FUERA', 'La comisión debe estar entre 0 % y 99,99 % del ingreso.'));
  }
  if (d.valorRecuperacion < 0) g.push(error('EQ_RECUPERACION_NEGATIVA', 'El valor de recuperación no puede ser negativo.'));
  if (d.capacidad !== null && d.capacidad <= 0) g.push(error('EQ_CAPACIDAD_NO_POSITIVA', 'La capacidad debe ser mayor que cero.'));
  if (d.volumenEsperado !== null && d.volumenEsperado < 0) {
    g.push(error('EQ_VOLUMEN_NEGATIVO', 'El volumen esperado no puede ser negativo.'));
  }

  return g;
}

export function resolverEquilibrio(d: DatosEquilibrio): Resultado<ResultadoEquilibrio> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const simbolo = d.moneda === 'USD' ? 'US$' : 'L';
  const comision = (d.comisionPorcentaje / 100) * d.precioVenta;
  const costoVariableEfectivo = d.costoVariableUnitario + comision;
  const costosFijosNetos = d.costosFijos - d.valorRecuperacion;
  const mc = d.precioVenta - costoVariableEfectivo;
  const razonMc = dividirSeguro(mc, d.precioVenta);

  const alcanzable = mc > 0;

  if (!alcanzable) {
    diagnosticos.push(
      error(
        'EQ_MARGEN_NO_POSITIVO',
        mc === 0
          ? 'El margen de contribución es exactamente cero: cada unidad vendida cubre su propio costo variable pero no aporta nada a los costos fijos. No existe punto de equilibrio alcanzable.'
          : 'El margen de contribución es negativo: cada unidad vendida pierde dinero antes de tocar los costos fijos. Con estos datos no existe un punto de equilibrio alcanzable. Hay que subir el precio o bajar el costo variable.',
      ),
    );
    // El contrato del motor es estricto: `datos` no nulo significa solución
    // utilizable. La gráfica se sigue pudiendo dibujar con `serieEquilibrio`,
    // que no depende de que exista el equilibrio.
    return resultadoFallido(diagnosticos);
  }

  if (costosFijosNetos < 0) {
    diagnosticos.push(
      aviso(
        'EQ_FIJOS_NEGATIVOS',
        'El valor de recuperación supera a los costos fijos: el proyecto arranca con saldo a favor y el punto de equilibrio resulta negativo, lo que en la práctica significa que se equilibra desde la primera unidad.',
      ),
    );
  }

  const peUnidades = alcanzable ? dividirSeguro(costosFijosNetos, mc) : null;
  const peMonetario = peUnidades === null ? null : peUnidades * d.precioVenta;

  const porcentajeCapacidad =
    peUnidades === null || d.capacidad === null ? null : (peUnidades * 100) / d.capacidad;

  if (porcentajeCapacidad !== null && porcentajeCapacidad > 100) {
    diagnosticos.push(
      aviso(
        'EQ_SOBRE_CAPACIDAD',
        `El punto de equilibrio exige ${formatearNumero(peUnidades ?? 0, { decimales: 0 })} ${d.unidadProducto}, más de lo que la capacidad instalada permite producir (${formatearNumero(d.capacidad ?? 0, { decimales: 0 })}). El negocio no puede equilibrarse sin ampliar capacidad, subir el precio o reducir costos.`,
      ),
    );
  } else if (porcentajeCapacidad !== null && porcentajeCapacidad > 80) {
    diagnosticos.push(
      nota(
        'EQ_CAPACIDAD_ALTA',
        `Equilibrar exige usar ${formatearNumero(porcentajeCapacidad, { decimales: 1 })} % de la capacidad. Queda muy poco margen: cualquier caída de la demanda lleva a pérdida.`,
      ),
    );
  }

  const unidadesParaObjetivo =
    !alcanzable || d.utilidadObjetivo === null ? null : dividirSeguro(costosFijosNetos + d.utilidadObjetivo, mc);

  const utilidadEsperada =
    d.volumenEsperado === null ? null : d.volumenEsperado * mc - costosFijosNetos;

  const margenSeguridadUnidades =
    peUnidades === null || d.volumenEsperado === null ? null : d.volumenEsperado - peUnidades;
  const margenSeguridadPorcentaje =
    margenSeguridadUnidades === null || d.volumenEsperado === null || d.volumenEsperado === 0
      ? null
      : (margenSeguridadUnidades * 100) / d.volumenEsperado;

  const pasos = new ConstructorPasos();

  if (d.comisionPorcentaje > 0) {
    pasos.agregar({
      titulo: 'Convertir la comisión en costo variable',
      explicacion:
        `La comisión se paga como un porcentaje del ingreso, así que crece con cada unidad vendida: es un costo variable, no fijo. ` +
        `El ${formatearNumero(d.comisionPorcentaje, { decimales: 1 })} % sobre un precio de ${simbolo} ${formatearNumero(d.precioVenta)} equivale a ${simbolo} ${formatearNumero(comision)} por ${d.unidadProducto}.`,
      formula: 'cv_{efectivo} = cv + p \\times \\frac{\\text{comisión \\%}}{100}',
      valor: costoVariableEfectivo,
      unidad: `${simbolo} / ${d.unidadProducto}`,
    });
  }

  if (d.valorRecuperacion > 0) {
    pasos.agregar({
      titulo: 'Descontar el valor de recuperación',
      explicacion:
        'Lo que se recupera por venta de residuos, subproductos o equipo al final del periodo reduce la carga fija que hay que cubrir con las ventas.',
      formula: 'CF_{neto} = CF - VR',
      valor: costosFijosNetos,
      unidad: simbolo,
    });
  }

  pasos.agregar({
    titulo: 'Calcular el margen de contribución',
    explicacion:
      `Cada ${d.unidadProducto} vendido deja ${simbolo} ${formatearNumero(mc)} después de pagar su propio costo variable. ` +
      'Ese sobrante es lo único que puede usarse para cubrir los costos fijos. Mientras no se hayan cubierto por completo, la empresa pierde.' +
      (razonMc !== null
        ? ` Expresado como razón, ${formatearNumero(razonMc * 100, { decimales: 1 })} % de cada lempira facturado queda disponible para cubrir costos fijos y generar utilidad.`
        : ''),
    formula: 'mc = p - cv_{efectivo}',
    valor: mc,
    unidad: `${simbolo} / ${d.unidadProducto}`,
  });

  if (alcanzable && peUnidades !== null) {
    pasos.agregar({
      titulo: 'Calcular el punto de equilibrio en unidades',
      explicacion:
        `Si cada ${d.unidadProducto} aporta ${simbolo} ${formatearNumero(mc)} al costo fijo, hacen falta ` +
        `${formatearNumero(costosFijosNetos)} ÷ ${formatearNumero(mc)} = ${formatearNumero(peUnidades, { decimales: 2 })} ${d.unidadProducto} para cubrirlo por completo. ` +
        'En la práctica se redondea hacia arriba: no se vende media unidad.',
      formula: 'Q_e = \\frac{CF_{neto}}{p - cv_{efectivo}}',
      valor: peUnidades,
      unidad: d.unidadProducto,
    });

    pasos.agregar({
      titulo: 'Calcular el punto de equilibrio monetario',
      explicacion:
        'Multiplicar el volumen de equilibrio por el precio da la facturación mínima del periodo. ' +
        'Es la cifra que el gerente vigila mes a mes, porque es más fácil de comparar contra el estado de resultados que un número de unidades.',
      formula: 'V_e = Q_e \\times p = \\frac{CF_{neto}}{1 - \\frac{cv_{efectivo}}{p}}',
      valor: peMonetario ?? Number.NaN,
      unidad: simbolo,
    });
  }

  if (porcentajeCapacidad !== null) {
    pasos.agregar({
      titulo: 'Expresar el equilibrio como porcentaje de la capacidad',
      explicacion:
        'Traducir el equilibrio a porcentaje de capacidad revela qué tan holgado es el negocio. ' +
        'Equilibrar al 40 % deja mucho aire; equilibrar al 90 % significa que casi toda la planta trabaja solo para no perder.',
      formula: '\\%\\,capacidad = \\frac{Q_e}{Capacidad} \\times 100',
      valor: porcentajeCapacidad,
      unidad: '%',
    });
  }

  if (unidadesParaObjetivo !== null && d.utilidadObjetivo !== null) {
    pasos.agregar({
      titulo: 'Calcular el volumen para la utilidad objetivo',
      explicacion:
        `Para ganar ${simbolo} ${formatearNumero(d.utilidadObjetivo)} hay que cubrir los costos fijos *y además* generar esa utilidad. ` +
        'La utilidad deseada se suma al costo fijo y se vuelve a dividir entre el margen de contribución.',
      formula: 'Q_u = \\frac{CF_{neto} + U_{objetivo}}{p - cv_{efectivo}}',
      valor: unidadesParaObjetivo,
      unidad: d.unidadProducto,
    });
  }

  if (utilidadEsperada !== null && d.volumenEsperado !== null) {
    pasos.agregar({
      titulo: 'Calcular la utilidad al volumen esperado',
      explicacion:
        `Con ventas de ${formatearNumero(d.volumenEsperado, { decimales: 0 })} ${d.unidadProducto}, la contribución total es ` +
        `${formatearNumero(d.volumenEsperado * mc)} y los costos fijos netos ${formatearNumero(costosFijosNetos)}. ` +
        `El resultado del periodo es ${utilidadEsperada >= 0 ? 'una utilidad' : 'una pérdida'} de ${simbolo} ${formatearNumero(Math.abs(utilidadEsperada))}.`,
      formula: 'U = Q \\times (p - cv_{efectivo}) - CF_{neto}',
      valor: utilidadEsperada,
      unidad: simbolo,
    });
  }

  return {
    datos: {
      moneda: d.moneda,
      costoVariableEfectivo,
      costosFijosNetos,
      margenContribucionUnitario: mc,
      razonMargenContribucion: razonMc,
      puntoEquilibrioUnidades: peUnidades,
      puntoEquilibrioMonetario: peMonetario,
      porcentajeCapacidad,
      unidadesParaObjetivo,
      utilidadEsperada,
      margenSeguridadUnidades,
      margenSeguridadPorcentaje,
      alcanzable,
      unidadProducto: d.unidadProducto,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretarEquilibrio(d, {
      simbolo,
      mc,
      peUnidades,
      peMonetario,
      porcentajeCapacidad,
      utilidadEsperada,
      margenSeguridadPorcentaje,
      alcanzable,
    }),
  };
}

function interpretarEquilibrio(
  d: DatosEquilibrio,
  r: {
    simbolo: string;
    mc: number;
    peUnidades: number | null;
    peMonetario: number | null;
    porcentajeCapacidad: number | null;
    utilidadEsperada: number | null;
    margenSeguridadPorcentaje: number | null;
    alcanzable: boolean;
  },
): string {
  if (!r.alcanzable) {
    return (
      `Con un precio de ${r.simbolo} ${formatearNumero(d.precioVenta)} y un costo variable efectivo de ${r.simbolo} ${formatearNumero(d.costoVariableUnitario + (d.comisionPorcentaje / 100) * d.precioVenta)}, ` +
      'cada unidad vendida agranda la pérdida en lugar de reducirla. Vender más empeora el resultado. ' +
      'La decisión gerencial no es de volumen sino de estructura: subir el precio, renegociar los insumos variables o abandonar el producto.'
    );
  }

  const partes: string[] = [];

  partes.push(
    `El negocio empieza a ganar a partir de ${formatearNumero(Math.ceil(r.peUnidades ?? 0), { decimales: 0 })} ${d.unidadProducto} vendidos, ` +
      `equivalentes a ${r.simbolo} ${formatearNumero(r.peMonetario ?? 0)} de facturación en el periodo.`,
  );

  if (r.porcentajeCapacidad !== null) {
    partes.push(
      r.porcentajeCapacidad <= 60
        ? `Eso representa apenas ${formatearNumero(r.porcentajeCapacidad, { decimales: 1 })} % de la capacidad instalada: la operación tiene holgura y resiste caídas de demanda.`
        : `Eso representa ${formatearNumero(r.porcentajeCapacidad, { decimales: 1 })} % de la capacidad instalada, un nivel exigente que deja poco margen ante una caída de la demanda.`,
    );
  }

  if (r.utilidadEsperada !== null) {
    partes.push(
      r.utilidadEsperada >= 0
        ? `Al volumen esperado la operación deja una utilidad de ${r.simbolo} ${formatearNumero(r.utilidadEsperada)}.`
        : `Al volumen esperado la operación todavía pierde ${r.simbolo} ${formatearNumero(Math.abs(r.utilidadEsperada))}: no alcanza el equilibrio.`,
    );
  }

  if (r.margenSeguridadPorcentaje !== null) {
    partes.push(
      r.margenSeguridadPorcentaje >= 0
        ? `El margen de seguridad es de ${formatearNumero(r.margenSeguridadPorcentaje, { decimales: 1 })} %: las ventas pueden caer esa proporción antes de entrar en pérdida.`
        : 'El volumen esperado está por debajo del equilibrio, así que no hay margen de seguridad.',
    );
  }

  partes.push(
    `Cada ${d.unidadProducto} adicional por encima del equilibrio agrega ${r.simbolo} ${formatearNumero(r.mc)} directamente a la utilidad, ` +
      'porque los costos fijos ya quedaron cubiertos.',
  );

  return partes.join(' ');
}

// ───────────────────────────── Multiproducto ─────────────────────────────

/**
 * Qué mide la mezcla de ventas. El material del curso escribe «PPM» sin
 * aclararlo y las dos lecturas dan puntos de equilibrio distintos, así que la
 * base es un dato del problema y no un supuesto del motor (inconsistencia I-13).
 */
export type BaseMezcla = 'unidades' | 'ingresos';

export const NOMBRE_BASE_MEZCLA: Record<BaseMezcla, string> = {
  unidades: 'Participación en las unidades',
  ingresos: 'Participación en el ingreso',
};

export interface ProductoMezcla {
  readonly id: string;
  readonly nombre: string;
  readonly precioVenta: number;
  readonly costoVariableUnitario: number;
  /** Participación en la mezcla de ventas, en porcentaje (0–100). Qué mide lo decide `baseMezcla`. */
  readonly participacion: number;
}

export interface DatosEquilibrioMultiproducto {
  readonly titulo: string;
  readonly moneda: CodigoMoneda;
  readonly costosFijos: number;
  readonly baseMezcla: BaseMezcla;
  readonly productos: readonly ProductoMezcla[];
}

export interface DetalleMezcla {
  readonly producto: ProductoMezcla;
  readonly peso: number;
  readonly margenUnitario: number;
  readonly razonMargen: number | null;
  /** Aporte del producto al promedio ponderado: margen × peso, o razón × peso. */
  readonly aportePonderado: number;
  readonly unidadesEquilibrio: number | null;
  readonly ingresoEquilibrio: number | null;
}

export interface ResultadoMultiproducto {
  readonly moneda: CodigoMoneda;
  readonly baseMezcla: BaseMezcla;
  readonly detalle: readonly DetalleMezcla[];
  /** Margen de contribución medio por unidad de la mezcla. */
  readonly margenPonderado: number | null;
  /** Razón de margen de contribución de la mezcla completa. */
  readonly razonPonderada: number | null;
  readonly unidadesEquilibrio: number | null;
  readonly ingresoEquilibrio: number | null;
  readonly alcanzable: boolean;
}

export function resolverEquilibrioMultiproducto(
  d: DatosEquilibrioMultiproducto,
): Resultado<ResultadoMultiproducto> {
  const diagnosticos: Diagnostico[] = [];

  if (d.productos.length === 0) {
    return resultadoFallido([error('EQM_SIN_PRODUCTOS', 'No hay productos en la mezcla.')]);
  }
  if (d.costosFijos < 0) diagnosticos.push(error('EQM_CF_NEGATIVO', 'Los costos fijos no pueden ser negativos.'));

  for (const p of d.productos) {
    if (p.precioVenta <= 0) diagnosticos.push(error('EQM_PRECIO', `El precio de "${p.nombre}" debe ser mayor que cero.`, p.id));
    if (p.participacion < 0) diagnosticos.push(error('EQM_PARTICIPACION', `La participación de "${p.nombre}" no puede ser negativa.`, p.id));
  }

  const sumaMezcla = sumaExacta(d.productos.map((p) => p.participacion));
  if (Math.abs(sumaMezcla - 100) > 0.005) {
    if (sumaMezcla === 0) {
      diagnosticos.push(error('EQM_MEZCLA_CERO', 'Las participaciones de la mezcla suman cero.'));
    } else {
      diagnosticos.push(
        aviso(
          'EQM_MEZCLA_NO_100',
          `La mezcla de ventas suma ${formatearNumero(sumaMezcla, { decimales: 1 })} % en lugar de 100 %. Se normaliza para poder calcular.`,
        ),
      );
    }
  }
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const simbolo = d.moneda === 'USD' ? 'US$' : 'L';
  const porUnidades = d.baseMezcla === 'unidades';
  const normalizador = 100 / sumaMezcla;

  const base = d.productos.map((producto) => {
    const margenUnitario = producto.precioVenta - producto.costoVariableUnitario;
    const razonMargen = dividirSeguro(margenUnitario, producto.precioVenta);
    const peso = (producto.participacion * normalizador) / 100;
    return {
      producto,
      margenUnitario,
      razonMargen,
      peso,
      aportePonderado: (porUnidades ? margenUnitario : (razonMargen ?? 0)) * peso,
    };
  });

  // El promedio ponderado es el mismo cálculo en las dos bases; lo que cambia es
  // qué se pondera. Con base en unidades da lempiras por unidad y el equilibrio
  // sale en unidades; con base en ingresos da una fracción y sale en dinero.
  const promedio = sumaExacta(base.map((x) => x.aportePonderado));
  const alcanzable = promedio > 0;

  if (!alcanzable) {
    diagnosticos.push(
      error(
        'EQM_PROMEDIO_NO_POSITIVO',
        porUnidades
          ? 'El margen de contribución ponderado de la mezcla no es positivo: con esta combinación de productos no existe punto de equilibrio.'
          : 'La razón de margen de contribución ponderada de la mezcla no es positiva: con esta combinación de productos no existe punto de equilibrio.',
      ),
    );
    return resultadoFallido(diagnosticos);
  }

  const impulsor = dividirSeguro(d.costosFijos, promedio);

  const negativos = base.filter((x) => x.margenUnitario < 0);
  if (negativos.length > 0) {
    diagnosticos.push(
      aviso(
        'EQM_PRODUCTO_NEGATIVO',
        `${negativos.map((x) => x.producto.nombre).join(', ')} ${negativos.length === 1 ? 'tiene' : 'tienen'} margen de contribución negativo. La mezcla se equilibra solo porque otros productos lo subsidian.`,
      ),
    );
  }

  // El reparto sale del impulsor y del peso; todo lo demás se deriva de él, así
  // que las unidades y el ingreso siempre son coherentes entre sí en las dos bases.
  const detalle: DetalleMezcla[] = base.map((x) => {
    const unidades =
      impulsor === null ? null : porUnidades ? impulsor * x.peso : dividirSeguro(impulsor * x.peso, x.producto.precioVenta);
    return {
      producto: x.producto,
      peso: x.peso,
      margenUnitario: x.margenUnitario,
      razonMargen: x.razonMargen,
      aportePonderado: x.aportePonderado,
      unidadesEquilibrio: unidades,
      ingresoEquilibrio: unidades === null ? null : unidades * x.producto.precioVenta,
    };
  });

  const unidadesEquilibrio = detalle.every((x) => x.unidadesEquilibrio !== null)
    ? sumaExacta(detalle.map((x) => x.unidadesEquilibrio ?? 0))
    : null;
  const ingresoEquilibrio = detalle.every((x) => x.ingresoEquilibrio !== null)
    ? sumaExacta(detalle.map((x) => x.ingresoEquilibrio ?? 0))
    : null;
  const margenPonderado = unidadesEquilibrio === null ? null : dividirSeguro(d.costosFijos, unidadesEquilibrio);
  const razonPonderada = ingresoEquilibrio === null ? null : dividirSeguro(d.costosFijos, ingresoEquilibrio);

  if (porUnidades) {
    diagnosticos.push(
      nota(
        'EQM_BASE_UNIDADES',
        'La mezcla se leyó como **participación en las unidades** vendidas. Sumar unidades de productos distintos ' +
          'solo tiene sentido si se miden en la misma unidad: conviene decirlo en voz alta al resolverlo en clase.',
      ),
    );
  }

  const pasos = new ConstructorPasos();

  if (porUnidades) {
    pasos.agregar({
      titulo: 'Calcular el margen de contribución de cada producto',
      explicacion:
        'Cada producto deja una contribución distinta por unidad vendida: es la diferencia entre lo que se cobra ' +
        'por él y lo que cuesta producir una unidad más.',
      formula: 'MC_i = p_i - cv_i',
      tabla: {
        encabezados: ['Producto', `Precio (${simbolo})`, `Costo variable (${simbolo})`, `Margen (${simbolo})`],
        filas: detalle.map((x) => [
          x.producto.nombre,
          formatearNumero(x.producto.precioVenta),
          formatearNumero(x.producto.costoVariableUnitario),
          formatearNumero(x.margenUnitario),
        ]),
      },
    });

    pasos.agregar({
      titulo: 'Ponderar por la mezcla de ventas',
      explicacion:
        'Cada margen se pondera por la parte que ese producto representa en las unidades vendidas. La suma es lo que ' +
        'deja, en promedio, una unidad cualquiera de la mezcla: la unidad promedio de la empresa.',
      formula: '\\overline{MC} = \\sum_i MC_i \\times w_i',
      tabla: {
        encabezados: ['Producto', `Margen (${simbolo})`, 'Participación', `Margen ponderado (${simbolo})`],
        filas: detalle.map((x) => [
          x.producto.nombre,
          formatearNumero(x.margenUnitario),
          `${formatearNumero(x.peso * 100, { decimales: 1 })} %`,
          formatearNumero(x.aportePonderado),
        ]),
        pie: ['Total', '', '100,0 %', formatearNumero(promedio)],
      },
    });

    pasos.agregar({
      titulo: 'Calcular el punto de equilibrio total',
      explicacion:
        `Si cada unidad promedio deja ${simbolo} ${formatearNumero(promedio)} de contribución, hacen falta ` +
        `${formatearNumero(unidadesEquilibrio ?? 0)} unidades combinadas para cubrir ${simbolo} ${formatearNumero(d.costosFijos)} de costos fijos.`,
      formula: 'Q_e = \\frac{CF}{\\overline{MC}}',
      valor: unidadesEquilibrio ?? Number.NaN,
      unidad: 'unidades',
    });

    pasos.agregar({
      titulo: 'Distribuir las unidades entre los productos',
      explicacion:
        'El total se reparte con los mismos porcentajes de la mezcla. Este resultado solo vale mientras la mezcla se ' +
        'mantenga: si cambia la proporción de lo que se vende, cambia el punto de equilibrio aunque no cambie ningún precio.',
      formula: 'q_i = Q_e \\times w_i',
      tabla: {
        encabezados: ['Producto', 'Participación', 'Unidades', `Ingreso (${simbolo})`],
        filas: detalle.map((x) => [
          x.producto.nombre,
          `${formatearNumero(x.peso * 100, { decimales: 1 })} %`,
          x.unidadesEquilibrio === null ? '—' : formatearNumero(x.unidadesEquilibrio),
          x.ingresoEquilibrio === null ? '—' : formatearNumero(x.ingresoEquilibrio),
        ]),
        pie: ['Total', '100,0 %', formatearNumero(unidadesEquilibrio ?? 0), formatearNumero(ingresoEquilibrio ?? 0)],
        pieAdicional: [
          'Al pasar a unidades enteras hay que redondear, y el redondeo puede hacer que las partes no sumen exactamente el total.',
        ],
      },
    });
  } else {
    pasos.agregar({
      titulo: 'Calcular la razón de margen de contribución de cada producto',
      explicacion:
        'Cuando la mezcla se mide en dinero ya no se puede hablar de unidades en general: un litro de leche y un ' +
        'quintal de café no se suman. La solución es trabajar en dinero. Para cada producto se calcula qué fracción ' +
        'de su precio queda como contribución.',
      formula: 'r_i = \\frac{p_i - cv_i}{p_i}',
      tabla: {
        encabezados: ['Producto', `Precio (${simbolo})`, `Costo variable (${simbolo})`, `Margen (${simbolo})`, 'Razón'],
        filas: detalle.map((x) => [
          x.producto.nombre,
          formatearNumero(x.producto.precioVenta),
          formatearNumero(x.producto.costoVariableUnitario),
          formatearNumero(x.margenUnitario),
          x.razonMargen === null ? '—' : `${formatearNumero(x.razonMargen * 100, { decimales: 1 })} %`,
        ]),
      },
    });

    pasos.agregar({
      titulo: 'Ponderar por la mezcla de ventas',
      explicacion:
        'Cada razón se pondera por la participación del producto en el ingreso total. El resultado es la razón de ' +
        'margen de contribución de la empresa como un todo: cuánto deja, en promedio, cada lempira facturado.',
      formula: '\\bar{r} = \\sum_i r_i \\times w_i',
      tabla: {
        encabezados: ['Producto', 'Razón', 'Participación en ingresos', 'Aporte ponderado'],
        filas: detalle.map((x) => [
          x.producto.nombre,
          x.razonMargen === null ? '—' : `${formatearNumero(x.razonMargen * 100, { decimales: 1 })} %`,
          `${formatearNumero(x.peso * 100, { decimales: 1 })} %`,
          `${formatearNumero(x.aportePonderado * 100, { decimales: 2 })} %`,
        ]),
        pie: ['Razón ponderada', '', '100,0 %', `${formatearNumero(promedio * 100, { decimales: 2 })} %`],
      },
    });

    pasos.agregar({
      titulo: 'Calcular el ingreso de equilibrio',
      explicacion:
        `Si cada lempira facturado deja ${formatearNumero(promedio * 100, { decimales: 2 })} centavos de contribución, ` +
        `hacen falta ${simbolo} ${formatearNumero(ingresoEquilibrio ?? 0)} de facturación para cubrir ${simbolo} ${formatearNumero(d.costosFijos)} de costos fijos.`,
      formula: 'V_e = \\frac{CF}{\\bar{r}}',
      valor: ingresoEquilibrio ?? Number.NaN,
      unidad: simbolo,
    });

    pasos.agregar({
      titulo: 'Repartir el equilibrio entre los productos',
      explicacion:
        'El ingreso de equilibrio se distribuye según la mezcla, y cada parte se divide entre el precio del producto ' +
        'para obtener cuántas unidades de cada uno hay que vender. Este resultado solo vale mientras la mezcla se mantenga.',
      formula: 'q_i = \\frac{V_e \\times w_i}{p_i}',
      tabla: {
        encabezados: ['Producto', `Ingreso de equilibrio (${simbolo})`, 'Unidades'],
        filas: detalle.map((x) => [
          x.producto.nombre,
          x.ingresoEquilibrio === null ? '—' : formatearNumero(x.ingresoEquilibrio),
          x.unidadesEquilibrio === null ? '—' : formatearNumero(x.unidadesEquilibrio),
        ]),
        pie: ['Total', formatearNumero(ingresoEquilibrio ?? 0), formatearNumero(unidadesEquilibrio ?? 0)],
      },
    });
  }

  const masRentable = [...detalle].sort((a, b) => (b.razonMargen ?? 0) - (a.razonMargen ?? 0))[0];

  const cierre = porUnidades
    ? `El negocio se equilibra vendiendo ${formatearNumero(unidadesEquilibrio ?? 0)} unidades combinadas, que son ` +
      `${simbolo} ${formatearNumero(ingresoEquilibrio ?? 0)} de facturación, siempre que la mezcla de ventas se mantenga. `
    : `El negocio se equilibra al facturar ${simbolo} ${formatearNumero(ingresoEquilibrio ?? 0)} en el periodo, que son ` +
      `${formatearNumero(unidadesEquilibrio ?? 0)} unidades, siempre que la mezcla de ventas se mantenga. `;

  return {
    datos: {
      moneda: d.moneda,
      baseMezcla: d.baseMezcla,
      detalle,
      margenPonderado,
      razonPonderada,
      unidadesEquilibrio,
      ingresoEquilibrio,
      alcanzable,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      cierre +
      (masRentable
        ? `${masRentable.producto.nombre} es el producto que más contribuye por lempira vendido (${formatearNumero((masRentable.razonMargen ?? 0) * 100, { decimales: 1 })} %); ` +
          'desplazar la mezcla hacia él bajaría el punto de equilibrio sin vender un peso más. '
        : '') +
      'Ese es el punto clave del análisis multiproducto: el equilibrio no depende solo de cuánto se vende, sino de qué se vende.',
  };
}

// ───────────────────────────── Serie para la gráfica ─────────────────────────────

export interface PuntoGrafica {
  readonly cantidad: number;
  readonly ingresos: number;
  readonly costosFijos: number;
  readonly costosVariables: number;
  readonly costosTotales: number;
  readonly utilidad: number;
}

/**
 * Genera la serie que dibuja la gráfica de punto de equilibrio.
 * El rango llega al doble del equilibrio (o a la capacidad) para que se vean
 * ambas zonas: pérdida y utilidad.
 */
export function serieEquilibrio(d: DatosEquilibrio, puntos = 41): readonly PuntoGrafica[] {
  const comision = (d.comisionPorcentaje / 100) * d.precioVenta;
  const cvEfectivo = d.costoVariableUnitario + comision;
  const cfNetos = d.costosFijos - d.valorRecuperacion;
  const mc = d.precioVenta - cvEfectivo;

  const equilibrio = mc > 0 ? cfNetos / mc : 0;
  const maximo = Math.max(
    d.capacidad ?? 0,
    d.volumenEsperado ?? 0,
    equilibrio * 2,
    equilibrio + 1,
    10,
  );

  const serie: PuntoGrafica[] = [];
  for (let i = 0; i < puntos; i++) {
    const q = (maximo * i) / (puntos - 1);
    const ingresos = q * d.precioVenta;
    const costosVariables = q * cvEfectivo;
    const costosTotales = cfNetos + costosVariables;
    serie.push({
      cantidad: q,
      ingresos,
      costosFijos: cfNetos,
      costosVariables,
      costosTotales,
      utilidad: ingresos - costosTotales,
    });
  }
  return serie;
}
