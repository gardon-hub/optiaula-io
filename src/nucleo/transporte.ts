/**
 * Módulo 11 — Modelo de transporte.
 *
 * Balanceo visible, tres métodos de solución inicial (esquina noroeste, costo
 * mínimo y aproximación de Vogel), optimización por MODI con costos reducidos
 * y ciclos de mejora, y tratamiento explícito de la degeneración.
 */

import { formatearNumero, sumaExacta } from './numero';
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
  type Paso,
  type Resultado,
} from './tipos';

export type MetodoInicial = 'noroeste' | 'costo_minimo' | 'vogel';

export const NOMBRE_METODO: Record<MetodoInicial, string> = {
  noroeste: 'Esquina noroeste',
  costo_minimo: 'Costo mínimo',
  vogel: 'Aproximación de Vogel',
};

export interface DatosTransporte {
  readonly titulo: string;
  readonly origenes: readonly string[];
  readonly destinos: readonly string[];
  readonly costos: readonly (readonly number[])[];
  readonly oferta: readonly number[];
  readonly demanda: readonly number[];
  readonly unidadCosto: string;
  readonly unidadCantidad: string;
}

export interface ProblemaBalanceado {
  readonly origenes: readonly string[];
  readonly destinos: readonly string[];
  readonly costos: readonly (readonly number[])[];
  readonly oferta: readonly number[];
  readonly demanda: readonly number[];
  readonly ofertaOriginal: number;
  readonly demandaOriginal: number;
  readonly origenFicticio: boolean;
  readonly destinoFicticio: boolean;
  readonly cantidadFicticia: number;
}

export interface SolucionTransporte {
  /** Cantidades enviadas. */
  readonly envios: readonly (readonly number[])[];
  /** Celdas de la base (pueden tener valor cero si hay degeneración). */
  readonly basicas: readonly (readonly boolean[])[];
  readonly costoTotal: number;
  readonly cantidadBasicas: number;
  /**
   * La base tiene menos de m + n − 1 celdas, así que MODI no puede calcular
   * los multiplicadores. Se corrige agregando celdas con envío cero.
   */
  readonly faltanBasicas: boolean;
  /**
   * Solución degenerada en el sentido habitual: alguna celda **de la base**
   * lleva envío cero. Es distinto de `faltanBasicas`: después de corregir
   * aquello, la base está completa pero la solución sigue siendo degenerada, y
   * eso es lo que hay que decirle al estudiante.
   */
  readonly degenerada: boolean;
}

export interface ResultadoTransporte {
  readonly problema: ProblemaBalanceado;
  readonly metodoInicial: MetodoInicial;
  readonly solucionInicial: SolucionTransporte;
  readonly solucionOptima: SolucionTransporte;
  readonly iteracionesMODI: number;
  readonly optimaEsInicial: boolean;
  readonly ahorro: number;
  readonly solucionesAlternativas: boolean;
  readonly unidadCosto: string;
  readonly unidadCantidad: string;
}

// ───────────────────────────── Validación y balanceo ─────────────────────────────

function validar(d: DatosTransporte): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.origenes.length === 0 || d.destinos.length === 0) {
    g.push(error('TR_VACIO', 'El problema no tiene orígenes o destinos.'));
    return g;
  }
  if (d.oferta.length !== d.origenes.length) {
    g.push(error('TR_OFERTA_INCOMPLETA', `Se declararon ${d.origenes.length} orígenes pero ${d.oferta.length} valores de oferta.`));
  }
  if (d.demanda.length !== d.destinos.length) {
    g.push(error('TR_DEMANDA_INCOMPLETA', `Se declararon ${d.destinos.length} destinos pero ${d.demanda.length} valores de demanda.`));
  }
  if (d.costos.length !== d.origenes.length) {
    g.push(error('TR_COSTOS_FILAS', 'La matriz de costos no tiene una fila por cada origen.'));
  }
  for (let i = 0; i < d.costos.length; i++) {
    if (d.costos[i]!.length !== d.destinos.length) {
      g.push(error('TR_COSTOS_COLUMNAS', `La fila de costos de "${d.origenes[i]}" no tiene un valor por cada destino.`, String(i)));
    }
    for (let j = 0; j < d.costos[i]!.length; j++) {
      const c = d.costos[i]![j];
      if (c === undefined || !Number.isFinite(c)) {
        g.push(error('TR_COSTO_INVALIDO', `El costo de "${d.origenes[i]}" a "${d.destinos[j]}" no es un número válido.`, claveCelda(i, j)));
      } else if (c < 0) {
        g.push(aviso('TR_COSTO_NEGATIVO', `El costo de "${d.origenes[i]}" a "${d.destinos[j]}" es negativo.`, claveCelda(i, j)));
      }
    }
  }
  for (let i = 0; i < d.oferta.length; i++) {
    if ((d.oferta[i] ?? 0) < 0) g.push(error('TR_OFERTA_NEGATIVA', `La oferta de "${d.origenes[i]}" es negativa.`, String(i)));
  }
  for (let j = 0; j < d.demanda.length; j++) {
    if ((d.demanda[j] ?? 0) < 0) g.push(error('TR_DEMANDA_NEGATIVA', `La demanda de "${d.destinos[j]}" es negativa.`, String(j)));
  }

  const totalOferta = sumaExacta(d.oferta);
  const totalDemanda = sumaExacta(d.demanda);
  if (totalOferta === 0 && totalDemanda === 0) {
    g.push(error('TR_SIN_FLUJO', 'La oferta y la demanda son cero: no hay nada que transportar.'));
  }

  return g;
}

/**
 * Balancea el problema agregando un origen o un destino ficticio con costo
 * cero. El balanceo se hace visible: nunca se corrigen los datos en silencio.
 */
export function balancear(d: DatosTransporte): { problema: ProblemaBalanceado; paso: Omit<Paso, 'numero'> } {
  const totalOferta = sumaExacta(d.oferta);
  const totalDemanda = sumaExacta(d.demanda);
  const diferencia = totalOferta - totalDemanda;

  let origenes = [...d.origenes];
  let destinos = [...d.destinos];
  let costos = d.costos.map((f) => [...f]);
  let oferta = [...d.oferta];
  let demanda = [...d.demanda];
  let origenFicticio = false;
  let destinoFicticio = false;

  if (diferencia > 1e-9) {
    // Sobra oferta: hace falta un destino ficticio que absorba el excedente.
    destinoFicticio = true;
    destinos.push('Destino ficticio');
    costos = costos.map((f) => [...f, 0]);
    demanda.push(diferencia);
  } else if (diferencia < -1e-9) {
    // Falta oferta: hace falta un origen ficticio que cubra el faltante.
    origenFicticio = true;
    origenes.push('Origen ficticio');
    costos.push(new Array<number>(destinos.length).fill(0));
    oferta.push(-diferencia);
  }

  const balanceado = Math.abs(diferencia) <= 1e-9;

  const paso: Omit<Paso, 'numero'> = {
    titulo: balanceado ? 'Verificar el balance' : 'Balancear el problema',
    explicacion: balanceado
      ? `La oferta total (${formatearNumero(totalOferta, { decimales: 0 })}) coincide con la demanda total ` +
        `(${formatearNumero(totalDemanda, { decimales: 0 })}). El problema está balanceado y puede resolverse directamente. ` +
        'Este chequeo va primero siempre: sin él, cualquier método de asignación produce resultados sin sentido.'
      : diferencia > 0
        ? `La oferta (${formatearNumero(totalOferta, { decimales: 0 })}) supera a la demanda (${formatearNumero(totalDemanda, { decimales: 0 })}) ` +
          `en ${formatearNumero(diferencia, { decimales: 0 })} ${d.unidadCantidad}. Se agrega un **destino ficticio** con costo cero que absorbe ese excedente. ` +
          'Lo que se “envíe” al destino ficticio en realidad se queda en el origen: es inventario que no se despacha.'
        : `La demanda (${formatearNumero(totalDemanda, { decimales: 0 })}) supera a la oferta (${formatearNumero(totalOferta, { decimales: 0 })}) ` +
          `en ${formatearNumero(-diferencia, { decimales: 0 })} ${d.unidadCantidad}. Se agrega un **origen ficticio** con costo cero. ` +
          'Lo que “envíe” el origen ficticio es demanda insatisfecha: alguien se queda sin producto, y el modelo señala quién.',
    formula: '\\sum_i a_i = \\sum_j b_j',
    tabla: {
      encabezados: ['Concepto', `Cantidad (${d.unidadCantidad})`],
      filas: [
        ['Oferta total', formatearNumero(totalOferta, { decimales: 0 })],
        ['Demanda total', formatearNumero(totalDemanda, { decimales: 0 })],
        ['Diferencia', formatearNumero(diferencia, { decimales: 0, signoExplicito: true })],
      ],
    },
  };

  return {
    problema: {
      origenes,
      destinos,
      costos,
      oferta,
      demanda,
      ofertaOriginal: totalOferta,
      demandaOriginal: totalDemanda,
      origenFicticio,
      destinoFicticio,
      cantidadFicticia: Math.abs(diferencia),
    },
    paso,
  };
}

// ───────────────────────────── Utilidades de solución ─────────────────────────────

function matrizCeros(m: number, n: number): number[][] {
  return Array.from({ length: m }, () => new Array<number>(n).fill(0));
}

function matrizFalso(m: number, n: number): boolean[][] {
  return Array.from({ length: m }, () => new Array<boolean>(n).fill(false));
}

function costoDe(p: ProblemaBalanceado, envios: readonly (readonly number[])[]): number {
  const terminos: number[] = [];
  for (let i = 0; i < p.origenes.length; i++) {
    for (let j = 0; j < p.destinos.length; j++) {
      terminos.push((envios[i]![j] ?? 0) * (p.costos[i]![j] ?? 0));
    }
  }
  return sumaExacta(terminos);
}

function empaquetar(p: ProblemaBalanceado, envios: number[][], basicas: boolean[][]): SolucionTransporte {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const cantidadBasicas = basicas.flat().filter(Boolean).length;
  return {
    envios: envios.map((f) => [...f]),
    basicas: basicas.map((f) => [...f]),
    costoTotal: costoDe(p, envios),
    cantidadBasicas,
    faltanBasicas: cantidadBasicas < m + n - 1,
    degenerada: basicas.some((fila, i) => fila.some((esBasica, j) => esBasica && (envios[i]?.[j] ?? 0) === 0)),
  };
}

function matrizEnvios(p: ProblemaBalanceado, s: SolucionTransporte): MatrizPaso {
  const etiquetas: Record<string, string> = {};
  const seleccionadas: CeldaRef[] = [];

  for (let i = 0; i < p.origenes.length; i++) {
    for (let j = 0; j < p.destinos.length; j++) {
      if (s.basicas[i]![j]) {
        seleccionadas.push({ fila: i, columna: j });
        etiquetas[claveCelda(i, j)] = formatearNumero(s.envios[i]![j] ?? 0, { decimales: 0 });
      }
    }
  }

  return {
    filas: [...p.origenes],
    columnas: [...p.destinos],
    valores: p.costos.map((f) => [...f]),
    seleccionadas,
    etiquetas,
  };
}

/**
 * Corrige la degeneración agregando celdas básicas con envío cero.
 * Sin base completa (m + n − 1 celdas), MODI no puede calcular los
 * multiplicadores.
 */
function corregirDegeneracion(
  p: ProblemaBalanceado,
  envios: number[][],
  basicas: boolean[][],
): { agregadas: CeldaRef[] } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const objetivo = m + n - 1;
  const agregadas: CeldaRef[] = [];

  const cuenta = (): number => basicas.flat().filter(Boolean).length;

  while (cuenta() < objetivo) {
    // Busca la celda no básica más barata que no cree un ciclo con la base.
    let mejor: CeldaRef | null = null;
    let mejorCosto = Infinity;

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (basicas[i]![j]) continue;
        if (encontrarCiclo(basicas, { fila: i, columna: j }, m, n) !== null) continue;
        const c = p.costos[i]![j] ?? 0;
        if (c < mejorCosto) {
          mejorCosto = c;
          mejor = { fila: i, columna: j };
        }
      }
    }

    if (mejor === null) break;
    basicas[mejor.fila]![mejor.columna] = true;
    envios[mejor.fila]![mejor.columna] = 0;
    agregadas.push(mejor);
  }

  return { agregadas };
}

// ───────────────────────────── Métodos de solución inicial ─────────────────────────────

function esquinaNoroeste(p: ProblemaBalanceado): { solucion: SolucionTransporte; pasos: Omit<Paso, 'numero'>[] } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const envios = matrizCeros(m, n);
  const basicas = matrizFalso(m, n);
  const oferta = [...p.oferta];
  const demanda = [...p.demanda];
  const detalle: string[][] = [];

  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    const cantidad = Math.min(oferta[i]!, demanda[j]!);
    envios[i]![j] = cantidad;
    basicas[i]![j] = true;
    oferta[i] = oferta[i]! - cantidad;
    demanda[j] = demanda[j]! - cantidad;

    detalle.push([
      `${p.origenes[i]} → ${p.destinos[j]}`,
      formatearNumero(cantidad, { decimales: 0 }),
      formatearNumero(p.costos[i]![j] ?? 0, { decimales: 2 }),
      formatearNumero(cantidad * (p.costos[i]![j] ?? 0), { decimales: 2 }),
      oferta[i] === 0 && demanda[j] === 0 ? 'se agotan ambos' : oferta[i] === 0 ? 'se agota el origen' : 'se satisface el destino',
    ]);

    if (oferta[i] === 0 && demanda[j] === 0) {
      // Empate: avanza una sola dirección para no perder una celda básica.
      if (i < m - 1) i++;
      else j++;
    } else if (oferta[i] === 0) i++;
    else j++;
  }

  const solucion = empaquetar(p, envios, basicas);

  return {
    solucion,
    pasos: [
      {
        titulo: 'Solución inicial por la esquina noroeste',
        explicacion:
          'Se empieza en la celda superior izquierda y se asigna todo lo que se pueda: el mínimo entre la oferta que queda en ese origen ' +
          'y la demanda que queda en ese destino. Luego se avanza a la derecha o hacia abajo según qué se haya agotado. ' +
          'El método **ignora los costos por completo**, y por eso casi nunca da la solución óptima. ' +
          'Su valor es didáctico: es rápido, siempre funciona y sirve como punto de partida para MODI.',
        tabla: {
          encabezados: ['Asignación', `Cantidad (${p.destinos.length ? '' : ''}${''})`, 'Costo unitario', 'Costo', 'Motivo del avance'],
          filas: detalle,
        },
        matriz: matrizEnvios(p, solucion),
        valor: solucion.costoTotal,
      },
    ],
  };
}

function costoMinimo(p: ProblemaBalanceado): { solucion: SolucionTransporte; pasos: Omit<Paso, 'numero'>[] } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const envios = matrizCeros(m, n);
  const basicas = matrizFalso(m, n);
  const oferta = [...p.oferta];
  const demanda = [...p.demanda];
  const filaViva = new Array<boolean>(m).fill(true);
  const columnaViva = new Array<boolean>(n).fill(true);
  const detalle: string[][] = [];

  while (filaViva.some(Boolean) && columnaViva.some(Boolean)) {
    let mejor: CeldaRef | null = null;
    let mejorCosto = Infinity;

    for (let i = 0; i < m; i++) {
      if (!filaViva[i]) continue;
      for (let j = 0; j < n; j++) {
        if (!columnaViva[j]) continue;
        const c = p.costos[i]![j] ?? 0;
        if (c < mejorCosto) {
          mejorCosto = c;
          mejor = { fila: i, columna: j };
        }
      }
    }
    if (mejor === null) break;

    const { fila: i, columna: j } = mejor;
    const cantidad = Math.min(oferta[i]!, demanda[j]!);
    envios[i]![j] = cantidad;
    basicas[i]![j] = true;
    oferta[i] = oferta[i]! - cantidad;
    demanda[j] = demanda[j]! - cantidad;

    detalle.push([
      `${p.origenes[i]} → ${p.destinos[j]}`,
      formatearNumero(mejorCosto, { decimales: 2 }),
      formatearNumero(cantidad, { decimales: 0 }),
      formatearNumero(cantidad * mejorCosto, { decimales: 2 }),
    ]);

    if (oferta[i] === 0 && demanda[j] === 0) {
      if (filaViva.filter(Boolean).length > 1) filaViva[i] = false;
      else columnaViva[j] = false;
    } else if (oferta[i] === 0) filaViva[i] = false;
    else columnaViva[j] = false;
  }

  const solucion = empaquetar(p, envios, basicas);

  return {
    solucion,
    pasos: [
      {
        titulo: 'Solución inicial por costo mínimo',
        explicacion:
          'Se busca la celda más barata de toda la matriz y se le asigna el máximo posible; se tacha la fila o la columna que se agote ' +
          'y se repite. A diferencia de la esquina noroeste, este método sí mira los costos, así que suele arrancar mucho más cerca del óptimo. ' +
          'Su punto débil es que decide mirando una celda a la vez, sin considerar lo que esa elección le cuesta al resto de la tabla.',
        tabla: {
          encabezados: ['Asignación', 'Costo unitario', 'Cantidad', 'Costo'],
          filas: detalle,
        },
        matriz: matrizEnvios(p, solucion),
        valor: solucion.costoTotal,
      },
    ],
  };
}

function vogel(p: ProblemaBalanceado): { solucion: SolucionTransporte; pasos: Omit<Paso, 'numero'>[] } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const envios = matrizCeros(m, n);
  const basicas = matrizFalso(m, n);
  const oferta = [...p.oferta];
  const demanda = [...p.demanda];
  const filaViva = new Array<boolean>(m).fill(true);
  const columnaViva = new Array<boolean>(n).fill(true);

  const pasosDetalle: Omit<Paso, 'numero'>[] = [];
  let iteracion = 0;

  while (filaViva.some(Boolean) && columnaViva.some(Boolean)) {
    iteracion++;

    // Penalización: diferencia entre los dos costos más bajos de cada fila y columna vivas.
    const penalFila = new Array<number>(m).fill(-1);
    const penalColumna = new Array<number>(n).fill(-1);

    for (let i = 0; i < m; i++) {
      if (!filaViva[i]) continue;
      const cs: number[] = [];
      for (let j = 0; j < n; j++) if (columnaViva[j]) cs.push(p.costos[i]![j] ?? 0);
      cs.sort((a, b) => a - b);
      penalFila[i] = cs.length >= 2 ? cs[1]! - cs[0]! : (cs[0] ?? 0);
    }
    for (let j = 0; j < n; j++) {
      if (!columnaViva[j]) continue;
      const cs: number[] = [];
      for (let i = 0; i < m; i++) if (filaViva[i]) cs.push(p.costos[i]![j] ?? 0);
      cs.sort((a, b) => a - b);
      penalColumna[j] = cs.length >= 2 ? cs[1]! - cs[0]! : (cs[0] ?? 0);
    }

    // Se atiende primero la línea con mayor penalización: la que más se
    // arrepentiría de no usar su celda más barata. Ante empate se elige la
    // línea que contiene la celda más barata de todas, refinamiento habitual
    // que evita quedarse con celdas caras al final.
    const costoMinimoDeFila = (i: number): number => {
      let min = Infinity;
      for (let j = 0; j < n; j++) if (columnaViva[j]) min = Math.min(min, p.costos[i]![j] ?? 0);
      return min;
    };
    const costoMinimoDeColumna = (j: number): number => {
      let min = Infinity;
      for (let i = 0; i < m; i++) if (filaViva[i]) min = Math.min(min, p.costos[i]![j] ?? 0);
      return min;
    };

    let mayor = -1;
    let desempate = Infinity;
    let esFila = true;
    let indice = -1;

    for (let i = 0; i < m; i++) {
      if (!filaViva[i]) continue;
      const pen = penalFila[i]!;
      const min = costoMinimoDeFila(i);
      if (pen > mayor || (pen === mayor && min < desempate)) {
        mayor = pen;
        desempate = min;
        esFila = true;
        indice = i;
      }
    }
    for (let j = 0; j < n; j++) {
      if (!columnaViva[j]) continue;
      const pen = penalColumna[j]!;
      const min = costoMinimoDeColumna(j);
      if (pen > mayor || (pen === mayor && min < desempate)) {
        mayor = pen;
        desempate = min;
        esFila = false;
        indice = j;
      }
    }
    if (indice === -1) break;

    let mejor: CeldaRef | null = null;
    let mejorCosto = Infinity;
    if (esFila) {
      for (let j = 0; j < n; j++) {
        if (!columnaViva[j]) continue;
        const c = p.costos[indice]![j] ?? 0;
        if (c < mejorCosto) { mejorCosto = c; mejor = { fila: indice, columna: j }; }
      }
    } else {
      for (let i = 0; i < m; i++) {
        if (!filaViva[i]) continue;
        const c = p.costos[i]![indice] ?? 0;
        if (c < mejorCosto) { mejorCosto = c; mejor = { fila: i, columna: indice }; }
      }
    }
    if (mejor === null) break;

    const { fila: i, columna: j } = mejor;
    const cantidad = Math.min(oferta[i]!, demanda[j]!);
    envios[i]![j] = cantidad;
    basicas[i]![j] = true;
    oferta[i] = oferta[i]! - cantidad;
    demanda[j] = demanda[j]! - cantidad;

    pasosDetalle.push({
      titulo: `Vogel — iteración ${iteracion}`,
      explicacion:
        `La mayor penalización es ${formatearNumero(mayor, { decimales: 2 })}, en ` +
        `${esFila ? `el origen ${p.origenes[indice]}` : `el destino ${p.destinos[indice]}`}. ` +
        'La penalización mide lo que costaría *no* usar la opción más barata de esa línea; atender primero la mayor penalización ' +
        `evita quedar atrapado con una celda cara al final. Se asigna ${formatearNumero(cantidad, { decimales: 0 })} a ` +
        `${p.origenes[i]} → ${p.destinos[j]}, la celda más barata de esa línea.`,
      tabla: {
        encabezados: ['Línea', 'Dos costos menores', 'Penalización'],
        filas: [
          ...Array.from({ length: m }, (_, k) => k)
            .filter((k) => filaViva[k])
            .map((k) => [p.origenes[k]!, '', formatearNumero(penalFila[k] ?? 0, { decimales: 2 })]),
          ...Array.from({ length: n }, (_, k) => k)
            .filter((k) => columnaViva[k])
            .map((k) => [p.destinos[k]!, '', formatearNumero(penalColumna[k] ?? 0, { decimales: 2 })]),
        ],
      },
    });

    if (oferta[i] === 0 && demanda[j] === 0) {
      if (filaViva.filter(Boolean).length > 1) filaViva[i] = false;
      else columnaViva[j] = false;
    } else if (oferta[i] === 0) filaViva[i] = false;
    else columnaViva[j] = false;
  }

  const solucion = empaquetar(p, envios, basicas);

  return {
    solucion,
    pasos: [
      {
        titulo: 'Solución inicial por aproximación de Vogel',
        explicacion:
          'Vogel calcula, para cada fila y cada columna, la diferencia entre sus dos costos más bajos: esa diferencia es la ' +
          '“penalización” por no usar la mejor opción disponible. Se atiende primero la línea con mayor penalización, ' +
          'asignando a su celda más barata. Es el método inicial que más se acerca al óptimo, y con frecuencia lo alcanza directamente.',
        matriz: matrizEnvios(p, solucion),
        valor: solucion.costoTotal,
      },
      ...pasosDetalle,
    ],
  };
}

/** Aplica el método de solución inicial elegido. */
export function solucionInicial(
  p: ProblemaBalanceado,
  metodo: MetodoInicial,
): { solucion: SolucionTransporte; pasos: Omit<Paso, 'numero'>[] } {
  switch (metodo) {
    case 'noroeste':
      return esquinaNoroeste(p);
    case 'costo_minimo':
      return costoMinimo(p);
    case 'vogel':
      return vogel(p);
  }
}

// ───────────────────────────── Ciclo de mejora ─────────────────────────────

/**
 * Encuentra el ciclo único que forma una celda no básica con las celdas de la
 * base. Devuelve las celdas en orden, empezando por la entrante.
 */
export function encontrarCiclo(
  basicas: readonly (readonly boolean[])[],
  entrante: CeldaRef,
  m: number,
  n: number,
): CeldaRef[] | null {
  const camino: CeldaRef[] = [entrante];

  const buscar = (actual: CeldaRef, moverEnFila: boolean, visitadas: Set<string>): boolean => {
    if (moverEnFila) {
      for (let j = 0; j < n; j++) {
        if (j === actual.columna) continue;
        if (!basicas[actual.fila]![j]) continue;
        const clave = claveCelda(actual.fila, j);
        if (visitadas.has(clave)) continue;

        const celda: CeldaRef = { fila: actual.fila, columna: j };
        camino.push(celda);
        visitadas.add(clave);
        if (camino.length >= 4 && j === entrante.columna) return true;
        if (buscar(celda, false, visitadas)) return true;
        camino.pop();
        visitadas.delete(clave);
      }
    } else {
      for (let i = 0; i < m; i++) {
        if (i === actual.fila) continue;
        if (!basicas[i]![actual.columna]) continue;
        const clave = claveCelda(i, actual.columna);
        if (visitadas.has(clave)) continue;

        const celda: CeldaRef = { fila: i, columna: actual.columna };
        camino.push(celda);
        visitadas.add(clave);
        if (camino.length >= 4 && i === entrante.fila) return true;
        if (buscar(celda, true, visitadas)) return true;
        camino.pop();
        visitadas.delete(clave);
      }
    }
    return false;
  };

  const visitadas = new Set<string>([claveCelda(entrante.fila, entrante.columna)]);
  if (buscar(entrante, true, visitadas)) return camino;

  camino.length = 1;
  visitadas.clear();
  visitadas.add(claveCelda(entrante.fila, entrante.columna));
  if (buscar(entrante, false, visitadas)) return camino;

  return null;
}

/**
 * Multiplicadores u y v de MODI. Se fija u₀ = 0 y se propaga por las celdas
 * básicas: para cada una debe cumplirse uᵢ + vⱼ = cᵢⱼ.
 */
export function multiplicadores(
  p: ProblemaBalanceado,
  basicas: readonly (readonly boolean[])[],
): { u: (number | null)[]; v: (number | null)[]; completo: boolean } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const u = new Array<number | null>(m).fill(null);
  const v = new Array<number | null>(n).fill(null);
  u[0] = 0;

  let cambio = true;
  while (cambio) {
    cambio = false;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (!basicas[i]![j]) continue;
        const c = p.costos[i]![j] ?? 0;
        if (u[i] !== null && v[j] === null) { v[j] = c - u[i]!; cambio = true; }
        else if (u[i] === null && v[j] !== null) { u[i] = c - v[j]!; cambio = true; }
      }
    }
  }

  return { u, v, completo: u.every((x) => x !== null) && v.every((x) => x !== null) };
}

// ───────────────────────────── Solución completa ─────────────────────────────

export function resolverTransporte(
  d: DatosTransporte,
  metodo: MetodoInicial = 'vogel',
): Resultado<ResultadoTransporte> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const { problema: p, paso: pasoBalance } = balancear(d);
  const m = p.origenes.length;
  const n = p.destinos.length;

  if (p.destinoFicticio) {
    diagnosticos.push(
      aviso(
        'TR_DESTINO_FICTICIO',
        `Sobran ${formatearNumero(p.cantidadFicticia, { decimales: 0 })} ${d.unidadCantidad} de oferta. ` +
          'Se agregó un destino ficticio con costo cero: lo asignado a ese destino es producto que no se despacha y queda en inventario.',
      ),
    );
  }
  if (p.origenFicticio) {
    diagnosticos.push(
      aviso(
        'TR_ORIGEN_FICTICIO',
        `Faltan ${formatearNumero(p.cantidadFicticia, { decimales: 0 })} ${d.unidadCantidad} de oferta para cubrir la demanda. ` +
          'Se agregó un origen ficticio con costo cero: lo que despache ese origen es demanda que quedará insatisfecha.',
      ),
    );
  }

  const pasos = new ConstructorPasos();
  pasos.agregar(pasoBalance);

  const inicial = solucionInicial(p, metodo);
  for (const x of inicial.pasos) pasos.agregar(x);

  const envios = inicial.solucion.envios.map((f) => [...f]);
  const basicas = inicial.solucion.basicas.map((f) => [...f]);

  if (inicial.solucion.faltanBasicas) {
    const { agregadas } = corregirDegeneracion(p, envios, basicas);
    diagnosticos.push(
      aviso(
        'TR_DEGENERADA',
        `La solución inicial tiene ${inicial.solucion.cantidadBasicas} celdas ocupadas, menos de las ${m + n - 1} que exige el método. ` +
          'Es un caso de degeneración: se produce cuando una asignación agota simultáneamente un origen y un destino. ' +
          `Se agregaron ${agregadas.length} celda(s) básica(s) con envío cero para completar la base; no cambian el costo, ` +
          'pero sin ellas MODI no puede calcular los multiplicadores.',
      ),
    );
    if (agregadas.length > 0) {
      pasos.agregar({
        titulo: 'Corregir la degeneración',
        explicacion:
          `La base necesita exactamente ${m + n - 1} celdas ocupadas. Se agregan celdas con envío cero (marcadas como básicas) ` +
          'eligiendo las más baratas que no formen un ciclo con las ya existentes. Es un artificio de cálculo, no un envío real.',
        tabla: {
          encabezados: ['Celda agregada', 'Costo unitario', 'Envío'],
          filas: agregadas.map((c) => [
            `${p.origenes[c.fila]} → ${p.destinos[c.columna]}`,
            formatearNumero(p.costos[c.fila]![c.columna] ?? 0, { decimales: 2 }),
            '0',
          ]),
        },
      });
    }
  }

  // Optimización por MODI.
  let iteraciones = 0;
  let solucionesAlternativas = false;
  const costoInicial = inicial.solucion.costoTotal;

  while (iteraciones < 100) {
    const { u, v, completo } = multiplicadores(p, basicas);
    if (!completo) {
      diagnosticos.push(
        aviso(
          'TR_MODI_INCOMPLETO',
          'No fue posible determinar todos los multiplicadores: la base quedó desconectada. Se reporta la última solución factible obtenida.',
        ),
      );
      break;
    }

    // Costos reducidos de las celdas no básicas.
    let entrante: CeldaRef | null = null;
    let masNegativo = -1e-9;
    const reducidos: (number | null)[][] = Array.from({ length: m }, () => new Array<number | null>(n).fill(null));
    let hayCeroNoBasico = false;

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (basicas[i]![j]) continue;
        const r = (p.costos[i]![j] ?? 0) - u[i]! - v[j]!;
        reducidos[i]![j] = r;
        if (r < masNegativo) { masNegativo = r; entrante = { fila: i, columna: j }; }
        if (Math.abs(r) < 1e-9) hayCeroNoBasico = true;
      }
    }

    if (entrante === null) {
      solucionesAlternativas = hayCeroNoBasico;
      pasos.agregar({
        titulo: `Verificar optimalidad — iteración ${iteraciones + 1}`,
        explicacion:
          'Todos los costos reducidos son mayores o iguales a cero, así que ninguna ruta no utilizada abarataría el envío. ' +
          'La solución es óptima. Un costo reducido indica cuánto cambiaría el costo total por cada unidad que se desviara a esa ruta.' +
          (hayCeroNoBasico
            ? ' Hay al menos un costo reducido exactamente igual a cero: existe otra solución óptima con el mismo costo total.'
            : ''),
        formula: 'c_{ij} - u_i - v_j \\ge 0 \\quad \\forall (i,j) \\notin B',
        matriz: {
          filas: [...p.origenes],
          columnas: [...p.destinos],
          valores: reducidos,
          seleccionadas: celdasBasicas(basicas, m, n),
        },
      });
      break;
    }

    iteraciones++;
    const ciclo = encontrarCiclo(basicas, entrante, m, n);
    if (ciclo === null) {
      diagnosticos.push(
        aviso('TR_SIN_CICLO', 'No se encontró un ciclo de mejora para la celda entrante. Se reporta la última solución obtenida.'),
      );
      break;
    }

    // Las posiciones impares del ciclo reciben el signo negativo.
    const negativas = ciclo.filter((_, k) => k % 2 === 1);
    const theta = Math.min(...negativas.map((c) => envios[c.fila]![c.columna]!));
    const saliente = negativas.find((c) => envios[c.fila]![c.columna] === theta)!;

    pasos.agregar({
      titulo: `Mejorar la solución — iteración ${iteraciones}`,
      explicacion:
        `El costo reducido más negativo es ${formatearNumero(masNegativo, { decimales: 2 })} en ` +
        `${p.origenes[entrante.fila]} → ${p.destinos[entrante.columna]}: cada unidad desviada a esa ruta abarata el total en esa cantidad. ` +
        `Para usarla hay que reacomodar los envíos siguiendo un ciclo cerrado que alterna sumas y restas, de modo que la oferta y la demanda sigan cuadrando. ` +
        `La cantidad que se puede mover es ${formatearNumero(theta, { decimales: 0 })}: el menor envío de las celdas que restan, porque más allá de eso ` +
        `${p.origenes[saliente.fila]} → ${p.destinos[saliente.columna]} quedaría en negativo.`,
      formula: 'r_{ij} = c_{ij} - u_i - v_j',
      tabla: {
        encabezados: ['Celda del ciclo', 'Signo', 'Envío actual'],
        filas: ciclo.map((c, k) => [
          `${p.origenes[c.fila]} → ${p.destinos[c.columna]}`,
          k % 2 === 0 ? '+' : '−',
          formatearNumero(envios[c.fila]![c.columna] ?? 0, { decimales: 0 }),
        ]),
      },
      matriz: {
        filas: [...p.origenes],
        columnas: [...p.destinos],
        valores: reducidos,
        seleccionadas: [entrante],
        cubiertas: ciclo,
      },
      valor: theta,
    });

    for (let k = 0; k < ciclo.length; k++) {
      const c = ciclo[k]!;
      envios[c.fila]![c.columna] = envios[c.fila]![c.columna]! + (k % 2 === 0 ? theta : -theta);
    }
    basicas[entrante.fila]![entrante.columna] = true;
    basicas[saliente.fila]![saliente.columna] = false;
    envios[saliente.fila]![saliente.columna] = 0;
  }

  const optima = empaquetar(p, envios, basicas);

  pasos.agregar({
    titulo: 'Plan de envíos óptimo',
    explicacion:
      `El plan final cuesta ${formatearNumero(optima.costoTotal, { decimales: 2 })} ${d.unidadCosto}. ` +
      (iteraciones > 0
        ? `Se llegó a él en ${iteraciones} iteración(es) de MODI a partir de la solución por ${NOMBRE_METODO[metodo].toLowerCase()}, ` +
          `que costaba ${formatearNumero(costoInicial, { decimales: 2 })}.`
        : `La solución por ${NOMBRE_METODO[metodo].toLowerCase()} ya era óptima: MODI no encontró ninguna mejora.`),
    tabla: {
      encabezados: ['Origen', 'Destino', `Cantidad (${d.unidadCantidad})`, 'Costo unitario', 'Costo'],
      filas: rutasDeEnvio(p, optima).map((r) => [
        r.origen,
        r.destino,
        formatearNumero(r.cantidad, { decimales: 0 }),
        formatearNumero(r.costoUnitario, { decimales: 2 }),
        formatearNumero(r.costo, { decimales: 2 }),
      ]),
      pie: ['Total', '', '', '', formatearNumero(optima.costoTotal, { decimales: 2 })],
    },
    matriz: matrizEnvios(p, optima),
    valor: optima.costoTotal,
    unidad: d.unidadCosto,
  });

  return {
    datos: {
      problema: p,
      metodoInicial: metodo,
      solucionInicial: inicial.solucion,
      solucionOptima: optima,
      iteracionesMODI: iteraciones,
      optimaEsInicial: iteraciones === 0,
      ahorro: costoInicial - optima.costoTotal,
      solucionesAlternativas,
      unidadCosto: d.unidadCosto,
      unidadCantidad: d.unidadCantidad,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretarTransporte(d, p, optima, costoInicial, iteraciones, metodo, solucionesAlternativas),
  };
}

function celdasBasicas(basicas: readonly (readonly boolean[])[], m: number, n: number): CeldaRef[] {
  const out: CeldaRef[] = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (basicas[i]![j]) out.push({ fila: i, columna: j });
  return out;
}

export interface RutaEnvio {
  readonly origen: string;
  readonly destino: string;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly costo: number;
  readonly ficticia: boolean;
}

/** Rutas con envío efectivo, listas para dibujar la red origen-destino. */
export function rutasDeEnvio(p: ProblemaBalanceado, s: SolucionTransporte): RutaEnvio[] {
  const out: RutaEnvio[] = [];
  for (let i = 0; i < p.origenes.length; i++) {
    for (let j = 0; j < p.destinos.length; j++) {
      const q = s.envios[i]![j] ?? 0;
      if (q <= 0) continue;
      const c = p.costos[i]![j] ?? 0;
      out.push({
        origen: p.origenes[i]!,
        destino: p.destinos[j]!,
        cantidad: q,
        costoUnitario: c,
        costo: q * c,
        ficticia:
          (p.origenFicticio && i === p.origenes.length - 1) ||
          (p.destinoFicticio && j === p.destinos.length - 1),
      });
    }
  }
  return out;
}

function interpretarTransporte(
  d: DatosTransporte,
  p: ProblemaBalanceado,
  optima: SolucionTransporte,
  costoInicial: number,
  iteraciones: number,
  metodo: MetodoInicial,
  alternativas: boolean,
): string {
  const rutas = rutasDeEnvio(p, optima);
  const reales = rutas.filter((r) => !r.ficticia);
  const ficticias = rutas.filter((r) => r.ficticia);
  const partes: string[] = [];

  partes.push(
    `El plan logístico óptimo usa ${reales.length} rutas y cuesta ${formatearNumero(optima.costoTotal, { decimales: 2 })} ${d.unidadCosto}.`,
  );

  if (iteraciones > 0) {
    const ahorro = costoInicial - optima.costoTotal;
    partes.push(
      `Partiendo de ${NOMBRE_METODO[metodo].toLowerCase()}, MODI ahorró ${formatearNumero(ahorro, { decimales: 2 })} ${d.unidadCosto} ` +
        `en ${iteraciones} iteración(es), un ${formatearNumero((ahorro / costoInicial) * 100, { decimales: 1 })} % menos.`,
    );
  } else {
    partes.push(`La solución de ${NOMBRE_METODO[metodo].toLowerCase()} ya era óptima; MODI solo lo confirmó.`);
  }

  const masCargada = [...reales].sort((a, b) => b.cantidad - a.cantidad)[0];
  if (masCargada) {
    partes.push(
      `La ruta principal es ${masCargada.origen} → ${masCargada.destino}, con ${formatearNumero(masCargada.cantidad, { decimales: 0 })} ${d.unidadCantidad}. ` +
        'Es la que conviene asegurar con contratos de flete estables.',
    );
  }

  for (const f of ficticias) {
    partes.push(
      p.destinoFicticio
        ? `${f.origen} conserva ${formatearNumero(f.cantidad, { decimales: 0 })} ${d.unidadCantidad} sin despachar: es capacidad ociosa que puede negociarse en otro mercado o reducirse en la próxima planificación.`
        : `${f.destino} recibirá ${formatearNumero(f.cantidad, { decimales: 0 })} ${d.unidadCantidad} menos de lo que pidió. El modelo elige racionar ahí porque es donde menos cuesta hacerlo; la gerencia debe validar si esa decisión es aceptable comercialmente.`,
    );
  }

  if (alternativas) {
    partes.push('Existe otro plan con el mismo costo total, así que puede elegirse por criterios no monetarios: confiabilidad del transportista, estado de los caminos o relación comercial.');
  }

  if (optima.degenerada) {
    partes.push(
      'La solución es degenerada: alguna ruta figura en la base con envío cero. Es normal y no cambia el costo, pero sí tiene una consecuencia: ' +
        'los multiplicadores dejan de ser únicos, así que los rangos del análisis de sensibilidad conviene comprobarlos antes de decidir sobre ellos.',
    );
  }

  return partes.join(' ');
}

// ───────────────────────────── Comparación de métodos ─────────────────────────────

export interface ComparacionMetodos {
  readonly resultados: readonly {
    readonly metodo: MetodoInicial;
    readonly costoInicial: number;
    readonly costoOptimo: number;
    readonly iteraciones: number;
    readonly brecha: number;
    readonly brechaPorcentaje: number;
  }[];
  readonly mejorInicial: MetodoInicial;
  readonly costoOptimo: number;
}

/** Resuelve el problema con los tres métodos iniciales y los compara. */
export function compararMetodosIniciales(d: DatosTransporte): Resultado<ComparacionMetodos> {
  const metodos: MetodoInicial[] = ['noroeste', 'costo_minimo', 'vogel'];
  const corridas = metodos.map((metodo) => ({ metodo, r: resolverTransporte(d, metodo) }));

  const fallo = corridas.find((c) => c.r.datos === null);
  if (fallo) return resultadoFallido(fallo.r.diagnosticos);

  const resultados = corridas.map(({ metodo, r }) => {
    const datos = r.datos!;
    const brecha = datos.solucionInicial.costoTotal - datos.solucionOptima.costoTotal;
    return {
      metodo,
      costoInicial: datos.solucionInicial.costoTotal,
      costoOptimo: datos.solucionOptima.costoTotal,
      iteraciones: datos.iteracionesMODI,
      brecha,
      brechaPorcentaje: datos.solucionOptima.costoTotal === 0 ? 0 : (brecha / datos.solucionOptima.costoTotal) * 100,
    };
  });

  const mejorInicial = resultados.reduce((a, b) => (b.costoInicial < a.costoInicial ? b : a)).metodo;
  const costoOptimo = Math.min(...resultados.map((r) => r.costoOptimo));

  const pasos = new ConstructorPasos();
  pasos.agregar({
    titulo: 'Comparar los tres métodos de solución inicial',
    explicacion:
      'Los tres métodos llegan al mismo óptimo, porque MODI corrige cualquier punto de partida. La diferencia está en el esfuerzo: ' +
      'un mejor arranque significa menos iteraciones. Por eso vale la pena invertir un minuto extra en Vogel antes de empezar a iterar.',
    tabla: {
      encabezados: ['Método inicial', `Costo inicial (${d.unidadCosto})`, 'Distancia al óptimo', 'Iteraciones MODI', `Costo óptimo (${d.unidadCosto})`],
      filas: resultados.map((r) => [
        NOMBRE_METODO[r.metodo],
        formatearNumero(r.costoInicial, { decimales: 2 }),
        `${formatearNumero(r.brecha, { decimales: 2 })} (${formatearNumero(r.brechaPorcentaje, { decimales: 1 })} %)`,
        String(r.iteraciones),
        formatearNumero(r.costoOptimo, { decimales: 2 }),
      ]),
      resaltadas: [resultados.findIndex((r) => r.metodo === mejorInicial)],
    },
    valor: costoOptimo,
    unidad: d.unidadCosto,
  });

  const todosIguales = resultados.every((r) => Math.abs(r.costoOptimo - costoOptimo) < 1e-6);

  return {
    datos: { resultados, mejorInicial, costoOptimo },
    pasos: pasos.listar(),
    diagnosticos: todosIguales
      ? [nota('TR_MISMO_OPTIMO', 'Los tres métodos convergen al mismo costo óptimo, como debe ser.')]
      : [aviso('TR_OPTIMOS_DISTINTOS', 'Los métodos llegaron a costos óptimos distintos. Revise los datos: puede haber degeneración mal resuelta.')],
    interpretacion:
      `${NOMBRE_METODO[mejorInicial]} entrega el mejor punto de partida. ` +
      `El costo óptimo del problema es ${formatearNumero(costoOptimo, { decimales: 2 })} ${d.unidadCosto}, ` +
      'y los tres caminos llegan a él. La lección práctica: el método inicial no cambia el destino, cambia cuánto se camina para llegar.',
  };
}
