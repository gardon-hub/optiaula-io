/**
 * Módulo 2 — Productividad.
 *
 * Productividad parcial, multifactorial y total, con tratamiento explícito del
 * inventario en proceso y unidades declaradas en cada razón. Funciones puras.
 */

import type { CodigoMoneda } from '@/config/identidad';
import {
  dividirSeguro,
  formatearNumero,
  sumaExacta,
  unidadRazon,
  variacionPorcentual,
} from './numero';
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

export type CategoriaInsumo =
  | 'mano_obra'
  | 'energia'
  | 'materiales'
  | 'agua'
  | 'capital'
  | 'costos_fijos'
  | 'otros';

export const NOMBRE_CATEGORIA: Record<CategoriaInsumo, string> = {
  mano_obra: 'Mano de obra',
  energia: 'Energía',
  materiales: 'Materiales',
  agua: 'Agua',
  capital: 'Capital',
  costos_fijos: 'Costos fijos',
  otros: 'Otros',
};

export interface Insumo {
  readonly id: string;
  readonly nombre: string;
  readonly categoria: CategoriaInsumo;
  /** Cantidad física consumida (150 horas, 300 kWh, 1200 kg…). */
  readonly cantidad: number;
  /** Unidad de la cantidad ("hora", "kWh", "kg", "L" si es un monto directo). */
  readonly unidad: string;
  /** Costo por unidad. Vale 1 cuando `unidad` ya es dinero. */
  readonly costoUnitario: number;
}

/** Qué hacer con lo que quedó a medio terminar al cerrar el periodo. */
export type TratamientoEnProceso = 'excluir' | 'incluir' | 'ponderado';

export const EXPLICACION_TRATAMIENTO: Record<TratamientoEnProceso, string> = {
  excluir:
    'Solo cuenta la producción terminada. Es el criterio más conservador: lo que no salió del proceso no se considera resultado.',
  incluir:
    'Cuenta el inventario en proceso como si estuviera terminado. Sobreestima la productividad, pero sirve para medir el esfuerzo total del periodo.',
  ponderado:
    'Cuenta el inventario en proceso según su grado de avance. Es el criterio contable habitual: 100 kg a medio proceso equivalen a 50 kg terminados.',
};

export interface DatosProductividad {
  readonly titulo: string;
  readonly periodo: string;
  readonly moneda: CodigoMoneda;
  readonly insumos: readonly Insumo[];
  /** Producción terminada en el periodo. */
  readonly produccionTerminada: number;
  readonly unidadProduccion: string;
  /** Inventario en proceso al cierre, en la misma unidad. */
  readonly inventarioEnProceso: number;
  /** Grado de avance del inventario en proceso, de 0 a 1. Solo si `ponderado`. */
  readonly gradoAvance: number;
  readonly tratamiento: TratamientoEnProceso;
  readonly precioVenta: number;
  /**
   * Costo operativo total declarado en el enunciado, cuando difiere de la suma
   * de los insumos. Si es `null`, se usa la suma. Ver inconsistencia I-02.
   */
  readonly costoTotalDeclarado: number | null;
}

export interface ProductividadParcial {
  readonly insumo: Insumo;
  readonly costo: number;
  /** Producción equivalente por unidad física de insumo. */
  readonly fisica: number | null;
  readonly unidadFisica: string;
  /** Valor de la producción por lempira invertido en este insumo. */
  readonly economica: number | null;
  readonly unidadEconomica: string;
  /** Participación de este insumo en el costo total, en porcentaje. */
  readonly participacionCosto: number | null;
}

export interface ResultadoProductividad {
  readonly produccionEquivalente: number;
  readonly unidadProduccion: string;
  readonly valorProduccion: number;
  readonly costoTotal: number;
  readonly costoSumado: number;
  readonly parciales: readonly ProductividadParcial[];
  /** Valor producido por lempira invertido en total. */
  readonly total: number | null;
  readonly unidadTotal: string;
  /** Unidades producidas por lempira invertido. */
  readonly totalFisica: number | null;
  readonly unidadTotalFisica: string;
  readonly utilidad: number;
  readonly moneda: CodigoMoneda;
  /** Insumo con menor productividad económica: el que más frena el sistema. */
  readonly insumoLimitante: ProductividadParcial | null;
  /** Insumo con mayor productividad económica. */
  readonly insumoMasEficiente: ProductividadParcial | null;
}

/** Costo total de un insumo: cantidad por costo unitario. */
export function costoInsumo(insumo: Insumo): number {
  return insumo.cantidad * insumo.costoUnitario;
}

/**
 * Producción equivalente según el tratamiento elegido para el inventario
 * en proceso.
 */
export function produccionEquivalente(datos: DatosProductividad): number {
  const { produccionTerminada: terminada, inventarioEnProceso: proceso, gradoAvance } = datos;
  switch (datos.tratamiento) {
    case 'excluir':
      return terminada;
    case 'incluir':
      return terminada + proceso;
    case 'ponderado':
      return terminada + proceso * gradoAvance;
  }
}

function validar(datos: DatosProductividad): Diagnostico[] {
  const d: Diagnostico[] = [];

  if (datos.insumos.length === 0) {
    d.push(error('PROD_SIN_INSUMOS', 'No se registró ningún insumo: no hay nada contra qué medir la producción.'));
  }
  if (datos.produccionTerminada < 0) {
    d.push(error('PROD_NEGATIVA', 'La producción terminada no puede ser negativa.'));
  }
  if (datos.inventarioEnProceso < 0) {
    d.push(error('PROD_PROCESO_NEGATIVO', 'El inventario en proceso no puede ser negativo.'));
  }
  if (datos.precioVenta < 0) {
    d.push(error('PROD_PRECIO_NEGATIVO', 'El precio de venta no puede ser negativo.'));
  }
  if (datos.gradoAvance < 0 || datos.gradoAvance > 1) {
    d.push(error('PROD_AVANCE_FUERA', 'El grado de avance del inventario en proceso debe estar entre 0 y 1.'));
  }

  for (const i of datos.insumos) {
    if (i.cantidad < 0) {
      d.push(error('PROD_CANTIDAD_NEGATIVA', `El insumo "${i.nombre}" tiene una cantidad negativa.`, i.id));
    }
    if (i.costoUnitario < 0) {
      d.push(error('PROD_COSTO_NEGATIVO', `El insumo "${i.nombre}" tiene un costo unitario negativo.`, i.id));
    }
    if (i.cantidad === 0) {
      d.push(aviso('PROD_CANTIDAD_CERO', `El insumo "${i.nombre}" tiene cantidad cero: su productividad parcial no está definida.`, i.id));
    }
  }

  if (datos.produccionTerminada === 0 && datos.inventarioEnProceso === 0) {
    d.push(aviso('PROD_SIN_PRODUCCION', 'No se registró producción alguna: todas las razones de productividad serán cero.'));
  }

  return d;
}

/** Resuelve un caso de productividad completo, con pasos explicados. */
export function resolverProductividad(datos: DatosProductividad): Resultado<ResultadoProductividad> {
  const diagnosticos = validar(datos);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const costos = datos.insumos.map(costoInsumo);
  const costoSumado = sumaExacta(costos);
  const costoTotal = datos.costoTotalDeclarado ?? costoSumado;

  if (datos.costoTotalDeclarado !== null && Math.abs(costoSumado - datos.costoTotalDeclarado) > 0.005) {
    diagnosticos.push(
      aviso(
        'PROD_COSTO_DISCREPANTE',
        `La suma de los insumos es ${formatearNumero(costoSumado)} pero el enunciado declara ${formatearNumero(datos.costoTotalDeclarado)}. ` +
          'Se está usando el valor declarado. Revise el panel de Auditoría de datos para decidir cuál es el correcto.',
      ),
    );
  }

  const equivalente = produccionEquivalente(datos);
  const valorProduccion = equivalente * datos.precioVenta;
  const unidadEconomica = unidadRazon(datos.moneda === 'USD' ? 'US$' : 'L', datos.moneda === 'USD' ? 'US$' : 'L');

  const parciales: ProductividadParcial[] = datos.insumos.map((insumo) => {
    const costo = costoInsumo(insumo);
    return {
      insumo,
      costo,
      fisica: dividirSeguro(equivalente, insumo.cantidad),
      unidadFisica: unidadRazon(datos.unidadProduccion, insumo.unidad),
      economica: dividirSeguro(valorProduccion, costo),
      unidadEconomica,
      participacionCosto: dividirSeguro(costo * 100, costoTotal),
    };
  });

  const conEconomica = parciales.filter((p): p is ProductividadParcial & { economica: number } => p.economica !== null);
  const insumoLimitante =
    conEconomica.length > 0
      ? conEconomica.reduce((a, b) => (b.economica < a.economica ? b : a))
      : null;
  const insumoMasEficiente =
    conEconomica.length > 0
      ? conEconomica.reduce((a, b) => (b.economica > a.economica ? b : a))
      : null;

  const total = dividirSeguro(valorProduccion, costoTotal);
  const totalFisica = dividirSeguro(equivalente, costoTotal);

  if (total !== null && total < 1) {
    diagnosticos.push(
      aviso(
        'PROD_TOTAL_MENOR_UNO',
        'La productividad total es menor que 1: el valor de lo producido no alcanza a cubrir el costo de los insumos. El sistema opera con pérdida.',
      ),
    );
  }

  diagnosticos.push(
    nota('PROD_TRATAMIENTO', `Tratamiento del inventario en proceso: ${EXPLICACION_TRATAMIENTO[datos.tratamiento]}`),
  );

  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';
  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Determinar la producción equivalente',
    explicacion:
      `Antes de dividir hay que decidir qué cuenta como producción. ${EXPLICACION_TRATAMIENTO[datos.tratamiento]} ` +
      `Con ${formatearNumero(datos.produccionTerminada, { decimales: 0 })} ${datos.unidadProduccion} terminados y ` +
      `${formatearNumero(datos.inventarioEnProceso, { decimales: 0 })} en proceso, la producción equivalente es ` +
      `${formatearNumero(equivalente)} ${datos.unidadProduccion}.`,
    formula:
      datos.tratamiento === 'ponderado'
        ? 'P_{eq} = P_{terminada} + P_{proceso} \\times g'
        : datos.tratamiento === 'incluir'
          ? 'P_{eq} = P_{terminada} + P_{proceso}'
          : 'P_{eq} = P_{terminada}',
    valor: equivalente,
    unidad: datos.unidadProduccion,
  });

  pasos.agregar({
    titulo: 'Valorar la producción',
    explicacion:
      `Para comparar insumos medidos en unidades distintas (horas, kWh, kilogramos) hay que llevarlos todos a dinero. ` +
      `La producción equivalente se multiplica por el precio de venta de ${simbolo} ${formatearNumero(datos.precioVenta)} por ${datos.unidadProduccion}.`,
    formula: 'V = P_{eq} \\times p',
    valor: valorProduccion,
    unidad: simbolo,
  });

  pasos.agregar({
    titulo: 'Calcular el costo de cada insumo',
    explicacion:
      'Cada insumo se valora multiplicando la cantidad consumida por su costo unitario. La suma es el costo total del sistema.',
    formula: 'C_i = q_i \\times c_i',
    tabla: {
      encabezados: ['Insumo', 'Cantidad', 'Unidad', `Costo unitario (${simbolo})`, `Costo (${simbolo})`, 'Participación'],
      filas: parciales.map((p) => [
        p.insumo.nombre,
        formatearNumero(p.insumo.cantidad, { decimales: 0 }),
        p.insumo.unidad,
        formatearNumero(p.insumo.costoUnitario),
        formatearNumero(p.costo),
        p.participacionCosto === null ? '—' : `${formatearNumero(p.participacionCosto, { decimales: 1 })} %`,
      ]),
      pie: ['Total', '', '', '', formatearNumero(costoTotal), '100,0 %'],
    },
    valor: costoTotal,
    unidad: simbolo,
  });

  pasos.agregar({
    titulo: 'Calcular la productividad parcial de cada insumo',
    explicacion:
      'La productividad parcial mide cuánto se obtiene por cada unidad de un solo insumo. La versión física responde ' +
      '"¿cuántas unidades por hora / por kWh / por kilogramo?" y la económica responde "¿cuánto valor por cada lempira invertido en ese insumo?". ' +
      'Las dos son útiles: la física habla al operario, la económica al gerente.',
    formula: 'PP_{fisica} = \\frac{P_{eq}}{q_i} \\qquad PP_{economica} = \\frac{V}{C_i}',
    tabla: {
      encabezados: ['Insumo', 'Parcial física', 'Unidad', 'Parcial económica', 'Unidad'],
      filas: parciales.map((p) => [
        p.insumo.nombre,
        p.fisica === null ? 'no definida' : formatearNumero(p.fisica, { decimales: 3 }),
        p.unidadFisica,
        p.economica === null ? 'no definida' : formatearNumero(p.economica, { decimales: 3 }),
        p.unidadEconomica,
      ]),
      resaltadas:
        insumoLimitante === null
          ? []
          : [parciales.findIndex((p) => p.insumo.id === insumoLimitante.insumo.id)],
    },
  });

  pasos.agregar({
    titulo: 'Calcular la productividad total',
    explicacion:
      'La productividad total (o multifactorial completa) divide el valor de toda la producción entre el costo de todos los insumos. ' +
      `Es adimensional: ${simbolo} producidos por ${simbolo} invertido. Un valor mayor que 1 significa que el sistema genera más valor del que consume.`,
    formula: 'PT = \\frac{V}{\\sum C_i}',
    valor: total ?? Number.NaN,
    unidad: unidadEconomica,
  });

  return {
    datos: {
      produccionEquivalente: equivalente,
      unidadProduccion: datos.unidadProduccion,
      valorProduccion,
      costoTotal,
      costoSumado,
      parciales,
      total,
      unidadTotal: unidadEconomica,
      totalFisica,
      unidadTotalFisica: unidadRazon(datos.unidadProduccion, simbolo),
      utilidad: valorProduccion - costoTotal,
      moneda: datos.moneda,
      insumoLimitante,
      insumoMasEficiente,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretar(datos, {
      total,
      valorProduccion,
      costoTotal,
      insumoLimitante,
      insumoMasEficiente,
      simbolo,
    }),
  };
}

function interpretar(
  datos: DatosProductividad,
  r: {
    total: number | null;
    valorProduccion: number;
    costoTotal: number;
    insumoLimitante: ProductividadParcial | null;
    insumoMasEficiente: ProductividadParcial | null;
    simbolo: string;
  },
): string {
  const partes: string[] = [];

  if (r.total === null) {
    partes.push('El costo total es cero, de modo que la productividad total no está definida.');
  } else {
    partes.push(
      `Por cada ${r.simbolo} 1,00 invertido, ${datos.titulo} genera ${r.simbolo} ${formatearNumero(r.total, { decimales: 2 })} de producción valorada. ` +
        (r.total > 1
          ? `El sistema es rentable: deja ${r.simbolo} ${formatearNumero(r.valorProduccion - r.costoTotal)} de margen sobre los insumos considerados.`
          : `El sistema no cubre sus insumos: falta ${r.simbolo} ${formatearNumero(r.costoTotal - r.valorProduccion)} para alcanzar el punto de recuperación.`),
    );
  }

  if (r.insumoLimitante && r.insumoLimitante.economica !== null) {
    partes.push(
      `El recurso que más frena el desempeño es ${r.insumoLimitante.insumo.nombre.toLowerCase()}: ` +
        `devuelve apenas ${formatearNumero(r.insumoLimitante.economica, { decimales: 2 })} por cada ${r.simbolo} 1,00 invertido, ` +
        `y absorbe ${formatearNumero(r.insumoLimitante.participacionCosto ?? 0, { decimales: 1 })} % del costo total. ` +
        'Una decisión gerencial sensata empieza por ahí: renegociar su precio, reducir su consumo o sustituirlo.',
    );
  }

  if (r.insumoMasEficiente && r.insumoMasEficiente.insumo.id !== r.insumoLimitante?.insumo.id) {
    partes.push(
      `En el otro extremo, ${r.insumoMasEficiente.insumo.nombre.toLowerCase()} es el recurso mejor aprovechado; ` +
        'ampliar su uso rinde más que aumentar cualquier otro insumo.',
    );
  }

  if (datos.inventarioEnProceso > 0 && datos.tratamiento === 'excluir') {
    partes.push(
      `Quedaron ${formatearNumero(datos.inventarioEnProceso, { decimales: 0 })} ${datos.unidadProduccion} en proceso que este cálculo no reconoce. ` +
        'Si el ciclo siguiente los termina, la productividad medida de este periodo está subestimada.',
    );
  }

  return partes.join(' ');
}

// ───────────────────────────── Comparación entre periodos ─────────────────────────────

export interface ComparacionPeriodos {
  readonly anterior: ResultadoProductividad;
  readonly actual: ResultadoProductividad;
  readonly variacionTotal: number | null;
  readonly variacionValor: number | null;
  readonly variacionCosto: number | null;
  readonly variacionesParciales: readonly {
    readonly nombre: string;
    readonly anterior: number | null;
    readonly actual: number | null;
    readonly variacion: number | null;
  }[];
}

/**
 * Compara dos periodos ya resueltos. La comparación se hace sobre la
 * productividad económica, que es la única razón comparable entre insumos
 * medidos en unidades distintas.
 */
export function compararPeriodos(
  anterior: ResultadoProductividad,
  actual: ResultadoProductividad,
): Resultado<ComparacionPeriodos> {
  const diagnosticos: Diagnostico[] = [];

  if (anterior.moneda !== actual.moneda) {
    return resultadoFallido([
      error(
        'PROD_MONEDAS_DISTINTAS',
        `No se pueden comparar periodos en monedas distintas (${anterior.moneda} y ${actual.moneda}). Convierta primero a una sola moneda.`,
      ),
    ]);
  }
  if (anterior.unidadProduccion !== actual.unidadProduccion) {
    diagnosticos.push(
      aviso(
        'PROD_UNIDADES_DISTINTAS',
        `Los periodos miden la producción en unidades distintas (${anterior.unidadProduccion} y ${actual.unidadProduccion}). La comparación económica sigue siendo válida; la física no.`,
      ),
    );
  }

  const nombres = new Set([
    ...anterior.parciales.map((p) => p.insumo.nombre),
    ...actual.parciales.map((p) => p.insumo.nombre),
  ]);

  const variacionesParciales = [...nombres].map((nombre) => {
    const a = anterior.parciales.find((p) => p.insumo.nombre === nombre)?.economica ?? null;
    const b = actual.parciales.find((p) => p.insumo.nombre === nombre)?.economica ?? null;
    return {
      nombre,
      anterior: a,
      actual: b,
      variacion: a === null || b === null ? null : variacionPorcentual(a, b),
    };
  });

  const variacionTotal =
    anterior.total === null || actual.total === null ? null : variacionPorcentual(anterior.total, actual.total);

  const pasos = new ConstructorPasos();
  pasos.agregar({
    titulo: 'Comparar la productividad total entre periodos',
    explicacion:
      'La variación porcentual mide el cambio relativo respecto del periodo base. Un valor positivo indica mejora; uno negativo, deterioro.',
    formula: '\\Delta\\% = \\frac{PT_{actual} - PT_{anterior}}{|PT_{anterior}|} \\times 100',
    valor: variacionTotal ?? Number.NaN,
    unidad: '%',
  });
  pasos.agregar({
    titulo: 'Comparar insumo por insumo',
    explicacion:
      'El total puede mejorar mientras un insumo empeora. Desagregar muestra dónde se ganó y dónde se perdió eficiencia.',
    tabla: {
      encabezados: ['Insumo', 'Periodo anterior', 'Periodo actual', 'Variación'],
      filas: variacionesParciales.map((v) => [
        v.nombre,
        v.anterior === null ? '—' : formatearNumero(v.anterior, { decimales: 3 }),
        v.actual === null ? '—' : formatearNumero(v.actual, { decimales: 3 }),
        v.variacion === null ? '—' : `${formatearNumero(v.variacion, { decimales: 1, signoExplicito: true })} %`,
      ]),
    },
  });

  const mejoro = variacionTotal !== null && variacionTotal > 0;
  const empeoraron = variacionesParciales.filter((v) => v.variacion !== null && v.variacion < 0);

  return {
    datos: {
      anterior,
      actual,
      variacionTotal,
      variacionValor: variacionPorcentual(anterior.valorProduccion, actual.valorProduccion),
      variacionCosto: variacionPorcentual(anterior.costoTotal, actual.costoTotal),
      variacionesParciales,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      variacionTotal === null
        ? 'No hay base de comparación: la productividad de alguno de los periodos no está definida.'
        : `La productividad total ${mejoro ? 'mejoró' : 'se deterioró'} ${formatearNumero(Math.abs(variacionTotal), { decimales: 1 })} % respecto del periodo anterior.` +
          (empeoraron.length > 0
            ? ` Aun así, ${empeoraron.length === 1 ? 'un insumo retrocedió' : `${empeoraron.length} insumos retrocedieron`}: ${empeoraron.map((v) => v.nombre.toLowerCase()).join(', ')}. Conviene revisarlos antes de dar por buena la mejora global.`
            : ' Todos los insumos acompañaron la mejora.'),
  };
}
