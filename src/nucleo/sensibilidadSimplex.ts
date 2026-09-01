/**
 * Análisis de sensibilidad sobre el tableau final del simplex.
 *
 * No vuelve a resolver nada: todo lo que hace falta ya está en el tableau
 * óptimo, y ese es justamente el punto que enseña el tema. La fila objetivo
 * guarda los precios sombra y los costos reducidos; el cuerpo del tableau
 * guarda B⁻¹, y con B⁻¹ se calcula hasta dónde puede moverse cada lado derecho
 * antes de que la base cambie.
 *
 * Responde las tres preguntas que un gerente hace después de ver el plan:
 *
 * 1. **¿Cuánto vale una unidad más de cada recurso?** — el precio sombra, que
 *    el solucionador ya deja en `HolguraSimplex`.
 * 2. **¿Hasta dónde vale ese precio?** — el rango de factibilidad del lado
 *    derecho. Fuera de él la base cambia y hay que rehacer el análisis; ahí es
 *    donde entra el dual simplex.
 * 3. **¿Cuánto pueden moverse los precios antes de cambiar el plan?** — el
 *    rango de optimalidad de los coeficientes. Y para lo que **no** entró al
 *    plan, cuánto tendría que mejorar su coeficiente para que conviniera:
 *    eso es el costo reducido.
 *
 * La aritmética sigue siendo racional exacta, así que los rangos salen en
 * fracciones y no dependen de ninguna tolerancia.
 */

import {
  CERO,
  aNumero,
  comparar,
  desdeNumero,
  dividir,
  esCero,
  esNegativo,
  esPositivo,
  multiplicar,
  negar,
  restar,
  sumar,
  type Racional,
} from './racional';
import { formatearNumero } from './numero';
import { celda, type ColumnaSimplex, type HolguraSimplex, type Notacion, type ResultadoSimplex, type Tableau, type VariableSimplex } from './simplex';
import {
  ConstructorPasos,
  aviso,
  error,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Resultado,
} from './tipos';

// ───────────────────────────── Resultados ─────────────────────────────

export interface RangoLadoDerecho {
  readonly holgura: HolguraSimplex;
  readonly valorActual: Racional;
  /** `null` significa que no hay límite por ese lado. */
  readonly desde: Racional | null;
  readonly hasta: Racional | null;
  readonly lectura: string;
}

export interface RangoCoeficienteSimplex {
  readonly variable: VariableSimplex;
  readonly valorActual: Racional;
  readonly basica: boolean;
  readonly desde: Racional | null;
  readonly hasta: Racional | null;
  /**
   * Solo tiene sentido en las no básicas: cuánto tendría que mejorar el
   * coeficiente para que a la variable le conviniera entrar al plan.
   */
  readonly costoReducido: Racional;
  readonly lectura: string;
}

export interface SensibilidadSimplex {
  readonly rangosLadoDerecho: readonly RangoLadoDerecho[];
  readonly rangosCoeficientes: readonly RangoCoeficienteSimplex[];
  readonly degenerado: boolean;
  /** Recurso agotado con el precio sombra de mayor magnitud. */
  readonly recursoMasValioso: RangoLadoDerecho | null;
  /** Variables que quedaron fuera del plan, con su costo reducido. */
  readonly fueraDelPlan: readonly RangoCoeficienteSimplex[];
}

// ───────────────────────────── Utilidades ─────────────────────────────

/** El menor de dos límites, tratando `null` como «sin límite». */
function menor(a: Racional | null, b: Racional | null): Racional | null {
  if (a === null) return b;
  if (b === null) return a;
  return comparar(a, b) <= 0 ? a : b;
}

function mayor(a: Racional | null, b: Racional | null): Racional | null {
  if (a === null) return b;
  if (b === null) return a;
  return comparar(a, b) >= 0 ? a : b;
}

function textoLimite(v: Racional | null, notacion: Notacion, unidad: string): string {
  return v === null ? 'sin límite' : `${celda(v, notacion)}${unidad === '' ? '' : ` ${unidad}`}`;
}

// ───────────────────────────── Rango del lado derecho ─────────────────────────────

/**
 * Hasta dónde puede moverse `b_i` sin que la base deje de ser óptima.
 *
 * Si `b_i` cambia en Δ, las variables básicas pasan a valer `x_B + Δ·d`, donde
 * `d` es la columna de B⁻¹ correspondiente a esa restricción —la del tableau
 * final bajo la variable que arrancó siendo el vector unitario de la fila—. La
 * base sigue siendo factible mientras `x_B + Δ·d ≥ 0`, y como la fila objetivo
 * no depende de `b`, la optimalidad no se toca. De ahí sale el intervalo.
 */
function rangoDeLadoDerecho(tab: Tableau, h: HolguraSimplex): { desde: Racional | null; hasta: Racional | null } {
  const actual = desdeNumero(h.restriccion.c) ?? CERO;

  // Una restricción redundante ya no tiene fila en el tableau: moverla no
  // cambia nada, pero tampoco hay un intervalo que reportar.
  if (h.columnaUnitaria === null) return { desde: null, hasta: null };

  let deltaMin: Racional | null = null; // el más negativo admitido
  let deltaMax: Racional | null = null;

  for (let k = 0; k < tab.filas.length; k++) {
    const d = tab.filas[k]![h.columnaUnitaria]!;
    if (esCero(d)) continue;

    // x_Bk + Δ·d ≥ 0  →  Δ ≥ −x_Bk/d  si d > 0,  Δ ≤ −x_Bk/d  si d < 0.
    const corte = dividir(negar(tab.ladoDerecho[k]!), d)!;
    if (esPositivo(d)) deltaMin = mayor(deltaMin, corte);
    else deltaMax = menor(deltaMax, corte);
  }

  // Los cortes están en las unidades del lado derecho **normalizado**. Si la
  // fila se negó, el usuario escribió el lado derecho con el signo contrario y
  // el intervalo se refleja.
  if (h.negada) {
    const desde = deltaMax === null ? null : restar(actual, deltaMax);
    const hasta = deltaMin === null ? null : restar(actual, deltaMin);
    return { desde, hasta };
  }

  return {
    desde: deltaMin === null ? null : sumar(actual, deltaMin),
    hasta: deltaMax === null ? null : sumar(actual, deltaMax),
  };
}

// ───────────────────────────── Rango de los coeficientes ─────────────────────────────

/**
 * Hasta dónde puede moverse `c_j` sin que cambie el plan óptimo.
 *
 * Para una variable **no básica** es directo: subir su coeficiente reduce
 * `z_j − c_j`, y la base aguanta mientras ese valor no cambie de signo. El
 * límite es exactamente el punto donde el costo reducido llega a cero, que es
 * el coeficiente a partir del cual conviene meterla al plan.
 *
 * Para una variable **básica** el cambio se propaga: al mover `c_j` se mueve
 * `c_B`, y con él todos los costos reducidos, que pasan a valer
 * `(z_k − c_k) + Δ·a_rk` con `r` la fila donde la variable es básica. La base
 * aguanta mientras todos conserven el signo que exige la optimalidad.
 */
function rangoDeCoeficiente(
  tab: Tableau,
  columnas: readonly ColumnaSimplex[],
  indice: number,
  sentido: 'maximizar' | 'minimizar',
): { desde: Racional | null; hasta: Racional | null; basica: boolean } {
  const actual = columnas[indice]!.costo;
  const fila = tab.base.indexOf(indice);

  if (fila === -1) {
    // No básica. Al maximizar la optimalidad pide z − c ≥ 0, y c puede subir
    // hasta z_j; al minimizar pide z − c ≤ 0, y c puede bajar hasta z_j.
    const zj = sumar(tab.objetivo[indice]!.a, actual);
    return sentido === 'maximizar'
      ? { desde: null, hasta: zj, basica: false }
      : { desde: zj, hasta: null, basica: false };
  }

  let deltaMin: Racional | null = null;
  let deltaMax: Racional | null = null;

  for (let k = 0; k < columnas.length; k++) {
    if (k === indice || tab.base.includes(k)) continue;
    // Las artificiales quedan fuera. Se conservan en el tableau final solo para
    // poder leer los duales de las filas ≥ y =, pero tienen prohibido entrar a
    // la base: su valor en la fila objetivo no representa ninguna alternativa
    // real, y tomarlo por una produce límites inventados.
    if (columnas[k]!.tipo === 'artificial') continue;
    const a = tab.filas[fila]![k]!;
    if (esCero(a)) continue;

    // maximizar: (z_k − c_k) + Δ·a ≥ 0.  minimizar: ≤ 0.
    const corte = dividir(negar(tab.objetivo[k]!.a), a)!;
    const haciaArriba = sentido === 'maximizar' ? esPositivo(a) : esNegativo(a);
    if (haciaArriba) deltaMin = mayor(deltaMin, corte);
    else deltaMax = menor(deltaMax, corte);
  }

  return {
    desde: deltaMin === null ? null : sumar(actual, deltaMin),
    hasta: deltaMax === null ? null : sumar(actual, deltaMax),
    basica: true,
  };
}

// ───────────────────────────── Análisis ─────────────────────────────

export interface OpcionesSensibilidad {
  readonly notacion?: Notacion;
}

export function analizarSensibilidadSimplex(
  resultado: ResultadoSimplex,
  opciones: OpcionesSensibilidad = {},
): Resultado<SensibilidadSimplex> {
  const notacion = opciones.notacion ?? 'fraccion';
  const diagnosticos: Diagnostico[] = [];
  const tab = resultado.tableauFinal;
  const d = resultado.datos;

  if (tab === null) {
    diagnosticos.push(
      error(
        'SX_SENSIBILIDAD_SIN_OPTIMO',
        'No hay análisis de sensibilidad posible: el modelo no llegó a un óptimo finito. La pregunta «¿cuánto vale una unidad más de este recurso?» solo tiene sentido cuando existe un plan óptimo del que partir.',
      ),
    );
    return resultadoFallido(diagnosticos);
  }

  const pasos = new ConstructorPasos();
  const u = d.unidadObjetivo;

  // ── Lados derechos ───────────────────────────────────────────────────────
  const rangosLadoDerecho: RangoLadoDerecho[] = resultado.holguras.map((h) => {
    const { desde, hasta } = rangoDeLadoDerecho(tab, h);
    const valorActual = desdeNumero(h.restriccion.c) ?? CERO;

    const lectura = esCero(h.precioSombra)
      ? h.activa
        ? `Se agota, pero conseguir más no cambiaría nada: su precio sombra es cero. Ocurre cuando otra restricción manda de verdad.`
        : `Sobran ${celda(h.holgura, notacion)} ${h.restriccion.unidad}. Conseguir más no cambia el resultado, y por eso su precio sombra es cero.`
      : `Cada ${h.restriccion.unidad === '' ? 'unidad' : singularSuave(h.restriccion.unidad)} adicional cambia ${d.nombreObjetivo} en ${celda(h.precioSombra, notacion)} ${u}. ` +
        `Ese valor se mantiene entre ${textoLimite(desde, notacion, h.restriccion.unidad)} y ${textoLimite(hasta, notacion, h.restriccion.unidad)}; ` +
        `fuera de ese intervalo la base cambia y hay que rehacer el análisis.`;

    return { holgura: h, valorActual, desde, hasta, lectura };
  });

  // ── Coeficientes ─────────────────────────────────────────────────────────
  const rangosCoeficientes: RangoCoeficienteSimplex[] = d.variables.map((variable, j) => {
    const { desde, hasta, basica } = rangoDeCoeficiente(tab, resultado.columnas, j, d.objetivo);
    const costoReducido = tab.objetivo[j]!.a;
    const valorActual = resultado.columnas[j]!.costo;

    const lectura = basica
      ? `El plan actual se sostiene mientras el aporte de ${variable.nombre} se mantenga entre ${textoLimite(desde, notacion, u)} y ${textoLimite(hasta, notacion, u)}. ` +
        `Dentro de ese intervalo cambia el resultado, no la decisión.`
      : `${mayuscula(variable.nombre)} queda fuera del plan. Para que conviniera producirlo, su aporte tendría que ` +
        (d.objetivo === 'maximizar'
          ? `subir de ${celda(valorActual, notacion)} a ${textoLimite(hasta, notacion, u)}, es decir ${celda(costoReducido, notacion)} ${u} más por unidad.`
          : `bajar de ${celda(valorActual, notacion)} a ${textoLimite(desde, notacion, u)}, es decir ${celda(negar(costoReducido), notacion)} ${u} menos por unidad.`);

    return { variable, valorActual, basica, desde, hasta, costoReducido, lectura };
  });

  const fueraDelPlan = rangosCoeficientes.filter((r) => !r.basica);

  const activas = rangosLadoDerecho.filter((r) => r.holgura.activa && !esCero(r.holgura.precioSombra));
  const recursoMasValioso = activas.reduce<RangoLadoDerecho | null>(
    (mejor, r) =>
      mejor === null || comparar(absoluto(r.holgura.precioSombra), absoluto(mejor.holgura.precioSombra)) > 0 ? r : mejor,
    null,
  );

  if (resultado.degenerado) {
    diagnosticos.push(
      aviso(
        'SX_SENSIBILIDAD_DEGENERADA',
        'La solución es degenerada —una variable básica vale cero—, así que los precios sombra no son únicos: otra base daría el mismo plan con duales distintos. Los rangos siguen siendo correctos, pero conviene interpretarlos con cautela y comprobarlos volviendo a resolver.',
      ),
    );
  }

  if (resultado.alternativas.length > 0) {
    diagnosticos.push(
      nota(
        'SX_SENSIBILIDAD_MULTIPLE',
        `Hay óptimos alternativos (${resultado.alternativas.join(', ')}), y eso se ve en los rangos: alguna variable fuera del plan tiene costo reducido cero, es decir que meterla no cambiaría el resultado.`,
      ),
    );
  }

  const sinLimite = rangosLadoDerecho.filter((r) => r.desde === null && r.hasta === null && r.holgura.columnaUnitaria === null);
  if (sinLimite.length > 0) {
    diagnosticos.push(
      nota(
        'SX_SENSIBILIDAD_REDUNDANTE',
        `${sinLimite.map((r) => `"${r.holgura.restriccion.nombre}"`).join(', ')} ${sinLimite.length === 1 ? 'resultó redundante' : 'resultaron redundantes'} y su fila se retiró del tableau, así que no tiene rango: moverla no afecta al resultado mientras siga siendo combinación de las demás.`,
      ),
    );
  }

  // ── Pasos ────────────────────────────────────────────────────────────────
  pasos.agregar({
    titulo: 'Dónde está el análisis de sensibilidad',
    explicacion:
      'No hay que calcular nada nuevo: el tableau final ya lo trae todo, y reconocerlo es la mitad del tema.\n\n' +
      'La **fila objetivo** guarda dos cosas distintas según la columna. Bajo la holgura de cada restricción está su **precio sombra**: ' +
      'cuánto cambia Z por cada unidad adicional de ese recurso. Bajo cada variable que quedó **fuera del plan** está su **costo reducido**: ' +
      'cuánto le falta a su coeficiente para que conviniera producirla.\n\n' +
      'El **cuerpo del tableau** guarda B⁻¹, la matriz que traduce cambios en los lados derechos a cambios en las variables básicas. Con ella ' +
      'se calcula hasta dónde puede moverse cada recurso antes de que la base cambie.',
    formula: 'y_i = \\frac{\\partial Z}{\\partial b_i} \\qquad \\bar{c}_j = z_j - c_j \\qquad \\mathbf{x}_B = \\mathbf{B}^{-1}\\mathbf{b}',
  });

  pasos.agregar({
    titulo: 'Rango de factibilidad: hasta dónde vale cada precio sombra',
    explicacion:
      'Un precio sombra no vale para siempre. Si el recurso aumenta lo suficiente, otra restricción se convierte en el nuevo cuello de botella ' +
      'y el precio cae; si disminuye lo suficiente, alguna variable básica llegaría a cero y el plan cambiaría de forma.\n\n' +
      'El intervalo sale de exigir que las variables básicas sigan siendo no negativas cuando el lado derecho se mueve: si `b` cambia en Δ, las ' +
      'básicas pasan a valer `x_B + Δ·d`, donde `d` es la columna de B⁻¹ de esa restricción. Dentro del intervalo, cada unidad adicional rinde ' +
      'exactamente el precio sombra; fuera, la base cambia y el análisis hay que rehacerlo. Ahí es donde sirve el dual simplex: recupera la ' +
      'optimalidad desde la base anterior en vez de empezar de cero.',
    formula: '\\mathbf{x}_B + \\Delta\\,\\mathbf{d} \\ge 0 \\quad \\text{con } \\mathbf{d} = \\mathbf{B}^{-1}\\mathbf{e}_i',
    tabla: {
      encabezados: ['Restricción', 'Disponible', 'Precio sombra', 'Desde', 'Hasta', 'Lectura'],
      filas: rangosLadoDerecho.map((r) => [
        r.holgura.restriccion.nombre,
        `${celda(r.valorActual, notacion)} ${r.holgura.restriccion.unidad}`,
        celda(r.holgura.precioSombra, notacion),
        textoLimite(r.desde, notacion, ''),
        textoLimite(r.hasta, notacion, ''),
        r.lectura,
      ]),
      resaltadas: rangosLadoDerecho.map((r, i) => (r.holgura.activa ? i : -1)).filter((i) => i >= 0),
    },
  });

  pasos.agregar({
    titulo: 'Rango de optimalidad: cuánto pueden moverse los precios',
    explicacion:
      'Esta es la otra mitad del análisis, y responde a una pregunta distinta: no «¿cuánto conviene pagar por más recurso?» sino «¿a partir de ' +
      'qué precio habría que cambiar el plan?».\n\n' +
      'Para una variable que **sí** está en el plan, mover su coeficiente mueve todos los costos reducidos a la vez, porque cambia el costo de la ' +
      'base. El plan aguanta mientras ninguno cambie de signo. Dentro de ese intervalo la ganancia cambia pero la decisión no: se sigue ' +
      'produciendo lo mismo.\n\n' +
      'Para una variable que quedó **fuera**, el rango dice otra cosa: a partir de qué valor le convendría entrar. La diferencia entre su ' +
      'coeficiente actual y ese valor es el **costo reducido**, y es el argumento con el que se responde a «¿por qué no producimos esto?».',
    formula: '(z_k - c_k) + \\Delta\\,a_{r\\,k} \\ \\gtrless \\ 0 \\quad \\text{para toda } k \\text{ no básica}',
    tabla: {
      encabezados: ['Variable', 'En el plan', 'Aporte actual', 'Desde', 'Hasta', 'Costo reducido', 'Lectura'],
      filas: rangosCoeficientes.map((r) => [
        r.variable.nombre,
        r.basica ? 'sí' : 'no',
        celda(r.valorActual, notacion),
        textoLimite(r.desde, notacion, ''),
        textoLimite(r.hasta, notacion, ''),
        r.basica ? '—' : celda(r.costoReducido, notacion),
        r.lectura,
      ]),
      resaltadas: rangosCoeficientes.map((r, i) => (r.basica ? i : -1)).filter((i) => i >= 0),
    },
  });

  return {
    datos: { rangosLadoDerecho, rangosCoeficientes, degenerado: resultado.degenerado, recursoMasValioso, fueraDelPlan },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretar(resultado, rangosLadoDerecho, recursoMasValioso, fueraDelPlan, notacion),
  };
}

// ───────────────────────────── Redacción ─────────────────────────────

function absoluto(r: Racional): Racional {
  return esNegativo(r) ? negar(r) : r;
}

function mayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Singular aproximado, solo para redactar «cada hora» o «cada manzana». */
function singularSuave(unidad: string): string {
  const p = unidad.trim();
  if (/[^aeiouáéíóú]es$/i.test(p)) return p.slice(0, -2);
  if (/[aeiouáéíóú]s$/i.test(p)) return p.slice(0, -1);
  return p;
}

function interpretar(
  resultado: ResultadoSimplex,
  rangos: readonly RangoLadoDerecho[],
  masValioso: RangoLadoDerecho | null,
  fueraDelPlan: readonly RangoCoeficienteSimplex[],
  notacion: Notacion,
): string {
  const d = resultado.datos;
  const partes: string[] = [];

  if (masValioso !== null) {
    const r = masValioso.holgura.restriccion;
    partes.push(
      `El recurso que más pesa es ${r.nombre.toLowerCase()}: cada unidad adicional cambia ${d.nombreObjetivo} en ` +
        `${formatearNumero(aNumero(masValioso.holgura.precioSombra), { decimales: 4 })} ${d.unidadObjetivo}. ` +
        (masValioso.hasta === null
          ? 'Ese valor no tiene tope superior en este modelo.'
          : `Ese valor se sostiene hasta ${celda(masValioso.hasta, notacion)} ${r.unidad}; más allá, otro recurso pasa a ser el cuello de botella y hay que rehacer el análisis.`),
    );
  }

  const sobrantes = rangos.filter((r) => !r.holgura.activa);
  if (sobrantes.length > 0) {
    partes.push(
      `En cambio, ${sobrantes.map((r) => r.holgura.restriccion.nombre.toLowerCase()).join(' y ')} ${sobrantes.length === 1 ? 'tiene' : 'tienen'} precio sombra cero: ` +
        'invertir ahí no produce ninguna mejora, por más que parezca un recurso importante. Es el error de inversión más común que este análisis evita.',
    );
  }

  if (fueraDelPlan.length > 0) {
    partes.push(
      `Quedaron fuera del plan ${fueraDelPlan.map((r) => r.variable.nombre).join(', ')}. El costo reducido dice exactamente cuánto tendría que ` +
        `${d.objetivo === 'maximizar' ? 'mejorar su precio' : 'bajar su costo'} para que conviniera producir${fueraDelPlan.length === 1 ? 'lo' : 'los'}: ` +
        fueraDelPlan
          .map((r) => `${r.variable.nombre}, ${formatearNumero(Math.abs(aNumero(r.costoReducido)), { decimales: 4 })} ${d.unidadObjetivo} por unidad`)
          .join('; ') +
        '. Es la respuesta a «¿por qué no producimos esto?», con un número en lugar de una opinión.',
    );
  }

  const enElPlan = resultado.solucion.filter((s) => !esCero(s.valor));
  if (enElPlan.length > 0) {
    partes.push(
      'Los rangos de optimalidad cierran el análisis: mientras los precios se muevan dentro de ellos, cambia la ganancia pero no la decisión, ' +
        'y no hace falta rehacer el plan de producción.',
    );
  }

  if (partes.length === 0) {
    return 'El modelo no tiene recursos agotados ni variables fuera del plan: no hay nada que analizar más allá de la solución misma.';
  }

  return partes.join(' ');
}

/** Suma exacta de una lista de racionales. Se usa en las pruebas de coherencia. */
export function sumaRacionales(valores: readonly Racional[]): Racional {
  return valores.reduce((a, b) => sumar(a, b), CERO);
}

/** Producto exacto, expuesto para comprobar `Z = y · b` en las pruebas. */
export function productoEscalar(a: readonly Racional[], b: readonly Racional[]): Racional {
  return a.reduce((total, x, i) => sumar(total, multiplicar(x, b[i] ?? CERO)), CERO);
}
