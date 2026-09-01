/**
 * Módulo 10 — Modelo de asignación (método húngaro).
 *
 * Minimización y maximización, matrices rectangulares con filas o columnas
 * ficticias, asignaciones prohibidas, empates y detección de soluciones
 * alternativas. Cada etapa del método queda registrada como un paso para
 * poder animarla.
 */

import { formatearNumero } from './numero';
import {
  ConstructorPasos,
  aviso,
  claveCelda,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type CeldaRef,
  type Diagnostico,
  type MatrizPaso,
  type Objetivo,
  type Resultado,
} from './tipos';

/** Valor que representa una asignación prohibida en la matriz de entrada. */
export const PROHIBIDO = null;

export interface DatosAsignacion {
  readonly titulo: string;
  readonly filas: readonly string[];
  readonly columnas: readonly string[];
  /** `null` marca una asignación prohibida. */
  readonly matriz: readonly (readonly (number | null)[])[];
  readonly objetivo: Objetivo;
  readonly unidad: string;
  /** Nombre genérico de lo que ocupa las filas ("trabajadores", "camiones"). */
  readonly nombreFilas: string;
  readonly nombreColumnas: string;
}

export interface AsignacionFinal {
  readonly fila: number;
  readonly columna: number;
  readonly nombreFila: string;
  readonly nombreColumna: string;
  readonly valor: number | null;
  readonly ficticia: boolean;
}

export interface ResultadoAsignacion {
  readonly asignaciones: readonly AsignacionFinal[];
  readonly valorTotal: number;
  readonly objetivo: Objetivo;
  readonly unidad: string;
  readonly filasFicticias: number;
  readonly columnasFicticias: number;
  readonly iteraciones: number;
  readonly solucionesAlternativas: boolean;
  /** Recursos que quedaron sin tarea (o tareas sin recurso). */
  readonly sinAsignar: readonly string[];
}

const GRAN_M = 1e9;

function validar(d: DatosAsignacion): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.filas.length === 0 || d.columnas.length === 0) {
    g.push(error('ASIG_MATRIZ_VACIA', 'La matriz de asignación está vacía.'));
    return g;
  }
  if (d.matriz.length !== d.filas.length) {
    g.push(error('ASIG_FILAS_INCOMPLETAS', `La matriz tiene ${d.matriz.length} filas pero se declararon ${d.filas.length} ${d.nombreFilas}.`));
  }
  for (let i = 0; i < d.matriz.length; i++) {
    const fila = d.matriz[i]!;
    if (fila.length !== d.columnas.length) {
      g.push(
        error(
          'ASIG_COLUMNAS_INCOMPLETAS',
          `La fila "${d.filas[i] ?? i + 1}" tiene ${fila.length} valores pero se declararon ${d.columnas.length} ${d.nombreColumnas}.`,
          String(i),
        ),
      );
    }
    for (let j = 0; j < fila.length; j++) {
      const v = fila[j];
      if (v !== null && (!Number.isFinite(v) || v === undefined)) {
        g.push(error('ASIG_VALOR_INVALIDO', `El valor en (${d.filas[i]}, ${d.columnas[j]}) no es un número válido.`, claveCelda(i, j)));
      }
      if (typeof v === 'number' && v < 0) {
        g.push(
          aviso(
            'ASIG_VALOR_NEGATIVO',
            `El valor en (${d.filas[i]}, ${d.columnas[j]}) es negativo. El método húngaro lo admite, pero conviene revisar si es intencional.`,
            claveCelda(i, j),
          ),
        );
      }
    }
  }

  // Una fila enteramente prohibida hace el problema infactible.
  for (let i = 0; i < d.matriz.length; i++) {
    if (d.matriz[i]!.every((v) => v === null)) {
      g.push(error('ASIG_FILA_PROHIBIDA', `Todas las asignaciones de "${d.filas[i]}" están prohibidas: el problema no tiene solución.`, String(i)));
    }
  }
  for (let j = 0; j < d.columnas.length; j++) {
    if (d.matriz.every((f) => f[j] === null)) {
      g.push(error('ASIG_COLUMNA_PROHIBIDA', `Todas las asignaciones a "${d.columnas[j]}" están prohibidas: el problema no tiene solución.`, String(j)));
    }
  }

  return g;
}

/** Emparejamiento máximo sobre las celdas con valor cero (algoritmo húngaro clásico). */
function emparejamientoMaximo(ceros: readonly (readonly boolean[])[], n: number): {
  filaAColumna: number[];
  columnaAFila: number[];
  tamano: number;
} {
  const filaAColumna = new Array<number>(n).fill(-1);
  const columnaAFila = new Array<number>(n).fill(-1);
  let tamano = 0;

  const buscar = (fila: number, visitadas: boolean[]): boolean => {
    for (let col = 0; col < n; col++) {
      if (!ceros[fila]![col] || visitadas[col]) continue;
      visitadas[col] = true;
      if (columnaAFila[col] === -1 || buscar(columnaAFila[col]!, visitadas)) {
        filaAColumna[fila] = col;
        columnaAFila[col] = fila;
        return true;
      }
    }
    return false;
  };

  for (let fila = 0; fila < n; fila++) {
    if (buscar(fila, new Array<boolean>(n).fill(false))) tamano++;
  }
  return { filaAColumna, columnaAFila, tamano };
}

/**
 * Cobertura mínima de ceros por el teorema de König: a partir de un
 * emparejamiento máximo, marca filas sin asignar y propaga.
 */
function coberturaMinima(
  ceros: readonly (readonly boolean[])[],
  n: number,
  filaAColumna: readonly number[],
  columnaAFila: readonly number[],
): { filasCubiertas: number[]; columnasCubiertas: number[] } {
  const filaMarcada = new Array<boolean>(n).fill(false);
  const columnaMarcada = new Array<boolean>(n).fill(false);

  for (let i = 0; i < n; i++) if (filaAColumna[i] === -1) filaMarcada[i] = true;

  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < n; i++) {
      if (!filaMarcada[i]) continue;
      for (let j = 0; j < n; j++) {
        if (ceros[i]![j] && !columnaMarcada[j]) {
          columnaMarcada[j] = true;
          cambio = true;
        }
      }
    }
    for (let j = 0; j < n; j++) {
      if (!columnaMarcada[j]) continue;
      const i = columnaAFila[j]!;
      if (i !== -1 && !filaMarcada[i]) {
        filaMarcada[i] = true;
        cambio = true;
      }
    }
  }

  const filasCubiertas: number[] = [];
  const columnasCubiertas: number[] = [];
  for (let i = 0; i < n; i++) if (!filaMarcada[i]) filasCubiertas.push(i);
  for (let j = 0; j < n; j++) if (columnaMarcada[j]) columnasCubiertas.push(j);

  return { filasCubiertas, columnasCubiertas };
}

/** Cuenta emparejamientos perfectos hasta un tope, para detectar óptimos alternativos. */
function contarEmparejamientos(ceros: readonly (readonly boolean[])[], n: number, tope = 2): number {
  const usada = new Array<boolean>(n).fill(false);
  let total = 0;

  const recorrer = (fila: number): void => {
    if (total >= tope) return;
    if (fila === n) {
      total++;
      return;
    }
    for (let col = 0; col < n; col++) {
      if (ceros[fila]![col] && !usada[col]) {
        usada[col] = true;
        recorrer(fila + 1);
        usada[col] = false;
        if (total >= tope) return;
      }
    }
  };

  recorrer(0);
  return total;
}

function matrizAPaso(
  valores: readonly (readonly number[])[],
  filas: readonly string[],
  columnas: readonly string[],
  extras: Partial<MatrizPaso> = {},
): MatrizPaso {
  return {
    filas: [...filas],
    columnas: [...columnas],
    valores: valores.map((f) => f.map((v) => (v >= GRAN_M / 2 ? null : v))),
    ...extras,
  };
}

export function resolverAsignacion(d: DatosAsignacion): Resultado<ResultadoAsignacion> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const filasOriginales = d.filas.length;
  const columnasOriginales = d.columnas.length;
  const n = Math.max(filasOriginales, columnasOriginales);
  const filasFicticias = n - filasOriginales;
  const columnasFicticias = n - columnasOriginales;

  const nombresFilas = [...d.filas, ...Array.from({ length: filasFicticias }, (_, k) => `Ficticia ${k + 1}`)];
  const nombresColumnas = [...d.columnas, ...Array.from({ length: columnasFicticias }, (_, k) => `Ficticia ${k + 1}`)];

  if (filasFicticias > 0 || columnasFicticias > 0) {
    diagnosticos.push(
      nota(
        'ASIG_FICTICIAS',
        filasFicticias > 0
          ? `Hay más ${d.nombreColumnas} que ${d.nombreFilas}. Se agregaron ${filasFicticias} fila(s) ficticia(s) con costo cero: ` +
            `los ${d.nombreColumnas} que reciban una fila ficticia quedarán sin atender.`
          : `Hay más ${d.nombreFilas} que ${d.nombreColumnas}. Se agregaron ${columnasFicticias} columna(s) ficticia(s) con costo cero: ` +
            `los ${d.nombreFilas} asignados a una columna ficticia quedarán sin tarea.`,
      ),
    );
  }

  // Matriz cuadrada con los valores originales (null = prohibido, 0 en ficticias).
  const original: (number | null)[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i >= filasOriginales || j >= columnasOriginales) return 0;
      return d.matriz[i]?.[j] ?? null;
    }),
  );

  // Conversión a un problema de minimización con valores no negativos.
  const finitos = original.flat().filter((v): v is number => v !== null);
  const maximo = finitos.length > 0 ? Math.max(...finitos) : 0;

  const trabajo: number[][] = original.map((fila) =>
    fila.map((v) => {
      if (v === null) return GRAN_M;
      return d.objetivo === 'maximizar' ? maximo - v : v;
    }),
  );

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Matriz original',
    explicacion:
      `Se parte de la matriz de ${d.objetivo === 'minimizar' ? 'costos' : 'beneficios'} tal como aparece en el enunciado. ` +
      (filasFicticias > 0 || columnasFicticias > 0
        ? 'Como no es cuadrada, se completó con filas o columnas ficticias de valor cero: son necesarias porque el método exige una correspondencia uno a uno.'
        : 'La matriz ya es cuadrada, de modo que cada recurso puede recibir exactamente una tarea.'),
    matriz: matrizAPaso(
      original.map((f) => f.map((v) => v ?? GRAN_M)),
      nombresFilas,
      nombresColumnas,
    ),
  });

  if (d.objetivo === 'maximizar') {
    pasos.agregar({
      titulo: 'Convertir la maximización en minimización',
      explicacion:
        `El método húngaro solo sabe minimizar. Para maximizar se resta cada valor del mayor de la matriz (${formatearNumero(maximo, { decimales: 2 })}), ` +
        'obteniendo la matriz de oportunidad perdida: cuánto se deja de ganar al no elegir la mejor opción. ' +
        'Minimizar esa pérdida equivale exactamente a maximizar el beneficio.',
      formula: 'c_{ij} = \\max(b) - b_{ij}',
      matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas),
    });
  }

  // Reducción por filas.
  const minimosFila: number[] = [];
  for (let i = 0; i < n; i++) {
    const fila = trabajo[i]!;
    const min = Math.min(...fila);
    minimosFila.push(min);
    for (let j = 0; j < n; j++) fila[j] = fila[j]! - min;
  }

  pasos.agregar({
    titulo: 'Reducción por filas',
    explicacion:
      'A cada fila se le resta su valor mínimo. Esto no cambia cuál es la asignación óptima —restar una constante de toda una fila ' +
      'afecta por igual a todas sus alternativas— pero garantiza que cada fila tenga al menos un cero, y los ceros son las asignaciones candidatas.',
    tabla: {
      encabezados: [d.nombreFilas, 'Mínimo restado'],
      filas: nombresFilas.map((nombre, i) => [nombre, formatearNumero(minimosFila[i] ?? 0, { decimales: 2 })]),
    },
    matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas),
  });

  // Reducción por columnas.
  const minimosColumna: number[] = [];
  for (let j = 0; j < n; j++) {
    let min = Infinity;
    for (let i = 0; i < n; i++) min = Math.min(min, trabajo[i]![j]!);
    minimosColumna.push(min);
    if (min > 0) for (let i = 0; i < n; i++) trabajo[i]![j] = trabajo[i]![j]! - min;
  }

  pasos.agregar({
    titulo: 'Reducción por columnas',
    explicacion:
      'Se repite la operación por columnas. Ahora cada fila y cada columna tienen al menos un cero. ' +
      'Si se pudiera elegir un cero por fila sin repetir columna, ya estaría resuelto.',
    tabla: {
      encabezados: [d.nombreColumnas, 'Mínimo restado'],
      filas: nombresColumnas.map((nombre, j) => [nombre, formatearNumero(minimosColumna[j] ?? 0, { decimales: 2 })]),
    },
    matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas),
  });

  // Iteraciones de cobertura y ajuste.
  let iteraciones = 0;
  let emparejamiento = emparejamientoMaximo(
    trabajo.map((f) => f.map((v) => v === 0)),
    n,
  );

  while (emparejamiento.tamano < n && iteraciones < 200) {
    iteraciones++;
    const ceros = trabajo.map((f) => f.map((v) => v === 0));
    const { filasCubiertas, columnasCubiertas } = coberturaMinima(
      ceros,
      n,
      emparejamiento.filaAColumna,
      emparejamiento.columnaAFila,
    );

    pasos.agregar({
      titulo: `Cubrir los ceros — iteración ${iteraciones}`,
      explicacion:
        `Se traza el menor número posible de líneas que cubran todos los ceros: ${filasCubiertas.length + columnasCubiertas.length} ` +
        `línea(s) para una matriz de ${n}×${n}. Como hacen falta menos de ${n} líneas, todavía no existe una asignación completa entre ceros ` +
        'y hay que crear ceros nuevos.',
      matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas, {
        filasCubiertas,
        columnasCubiertas,
      }),
    });

    // Ajuste: restar el mínimo no cubierto y sumarlo en las intersecciones.
    const filaCubierta = new Set(filasCubiertas);
    const columnaCubierta = new Set(columnasCubiertas);

    let minimo = Infinity;
    for (let i = 0; i < n; i++) {
      if (filaCubierta.has(i)) continue;
      for (let j = 0; j < n; j++) {
        if (columnaCubierta.has(j)) continue;
        minimo = Math.min(minimo, trabajo[i]![j]!);
      }
    }

    if (!Number.isFinite(minimo)) {
      return resultadoFallido([
        ...diagnosticos,
        error('ASIG_SIN_SOLUCION', 'Las asignaciones prohibidas hacen que el problema no tenga solución factible.'),
      ]);
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cubiertaF = filaCubierta.has(i);
        const cubiertaC = columnaCubierta.has(j);
        if (!cubiertaF && !cubiertaC) trabajo[i]![j] = trabajo[i]![j]! - minimo;
        else if (cubiertaF && cubiertaC) trabajo[i]![j] = trabajo[i]![j]! + minimo;
      }
    }

    pasos.agregar({
      titulo: `Ajustar la matriz — iteración ${iteraciones}`,
      explicacion:
        `El menor valor no cubierto es ${formatearNumero(minimo, { decimales: 2 })}. Se resta de todas las celdas no cubiertas ` +
        '(creando al menos un cero nuevo) y se suma en las que están cubiertas dos veces, para no alterar las diferencias relativas. ' +
        'Las celdas cubiertas una sola vez no cambian.',
      matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas),
    });

    emparejamiento = emparejamientoMaximo(
      trabajo.map((f) => f.map((v) => v === 0)),
      n,
    );
  }

  if (emparejamiento.tamano < n) {
    return resultadoFallido([
      ...diagnosticos,
      error('ASIG_NO_CONVERGE', 'El método no alcanzó una asignación completa. Revise los datos: puede haber demasiadas asignaciones prohibidas.'),
    ]);
  }

  const cerosFinales = trabajo.map((f) => f.map((v) => v === 0));
  const cantidadOptimos = contarEmparejamientos(cerosFinales, n, 2);
  const solucionesAlternativas = cantidadOptimos > 1;

  if (solucionesAlternativas) {
    diagnosticos.push(
      aviso(
        'ASIG_OPTIMOS_ALTERNATIVOS',
        'Existe más de una asignación óptima con el mismo valor total. La solución mostrada es una de ellas; ' +
          'otra distribución podría ser igual de buena en números pero preferible por razones prácticas (cercanía, experiencia, carga de trabajo).',
      ),
    );
  }

  const seleccionadas: CeldaRef[] = [];
  const asignaciones: AsignacionFinal[] = [];
  const sinAsignar: string[] = [];

  for (let i = 0; i < n; i++) {
    const j = emparejamiento.filaAColumna[i]!;
    seleccionadas.push({ fila: i, columna: j });
    const ficticia = i >= filasOriginales || j >= columnasOriginales;
    const valor = ficticia ? null : (d.matriz[i]?.[j] ?? null);

    asignaciones.push({
      fila: i,
      columna: j,
      nombreFila: nombresFilas[i] ?? '',
      nombreColumna: nombresColumnas[j] ?? '',
      valor,
      ficticia,
    });

    if (ficticia) {
      if (i < filasOriginales) sinAsignar.push(nombresFilas[i]!);
      else if (j < columnasOriginales) sinAsignar.push(nombresColumnas[j]!);
    }
  }

  const valorTotal = asignaciones.reduce((s, a) => s + (a.valor ?? 0), 0);

  pasos.agregar({
    titulo: 'Seleccionar las asignaciones',
    explicacion:
      `Ahora sí es posible elegir ${n} ceros sin repetir fila ni columna. Cada cero elegido es una asignación: ` +
      'ese recurso a esa tarea. Es la solución óptima del problema.',
    matriz: matrizAPaso(trabajo, nombresFilas, nombresColumnas, { seleccionadas }),
  });

  pasos.agregar({
    titulo: 'Calcular el valor total',
    explicacion:
      'El valor total se lee siempre en la **matriz original**, no en la reducida. Las reducciones sirvieron para encontrar ' +
      'qué asignaciones convienen, no para calcular cuánto cuestan.',
    tabla: {
      encabezados: [d.nombreFilas, d.nombreColumnas, `Valor (${d.unidad})`],
      filas: asignaciones.map((a) => [
        a.nombreFila,
        a.nombreColumna,
        a.ficticia ? 'ficticia — sin efecto' : formatearNumero(a.valor ?? 0, { decimales: 2 }),
      ]),
      pie: ['Total', '', formatearNumero(valorTotal, { decimales: 2 })],
    },
    valor: valorTotal,
    unidad: d.unidad,
  });

  const reales = asignaciones.filter((a) => !a.ficticia);

  return {
    datos: {
      asignaciones,
      valorTotal,
      objetivo: d.objetivo,
      unidad: d.unidad,
      filasFicticias,
      columnasFicticias,
      iteraciones,
      solucionesAlternativas,
      sinAsignar,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      `La asignación óptima ${d.objetivo === 'minimizar' ? 'minimiza' : 'maximiza'} el total en ` +
      `${formatearNumero(valorTotal, { decimales: 2 })} ${d.unidad}: ` +
      reales.map((a) => `${a.nombreFila} → ${a.nombreColumna}`).join('; ') +
      '. ' +
      (sinAsignar.length > 0
        ? `Quedan sin asignar: ${sinAsignar.join(', ')}. Eso no es un error del método sino un dato de la realidad: hay un desbalance entre ${d.nombreFilas} y ${d.nombreColumnas}. `
        : '') +
      (solucionesAlternativas
        ? 'Existen otras combinaciones con idéntico valor total, así que el criterio final puede incorporar consideraciones no numéricas. '
        : 'La solución es única: cualquier otra combinación empeora el resultado. ') +
      (d.objetivo === 'minimizar'
        ? 'Note que la mejor asignación no consiste en darle a cada recurso su tarea preferida: el óptimo global suele exigir que alguien acepte una tarea que no es la mejor para él.'
        : 'Note que maximizar el total no significa que cada uno haga lo que mejor sabe hacer: a veces conviene que el más versátil ceda su especialidad.'),
  };
}
