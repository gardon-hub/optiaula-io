/**
 * Análisis de sensibilidad del modelo de transporte.
 *
 * Como en el simplex, no vuelve a resolver nada: todo sale de la solución
 * óptima que MODI ya calculó. Los multiplicadores `u` y `v` y los costos
 * reducidos están ahí desde la última iteración; lo que faltaba era leerlos
 * como herramienta de decisión en lugar de como paso intermedio del método.
 *
 * Responde las dos preguntas que un gerente de distribución hace después de
 * ver el plan de envíos:
 *
 * 1. **¿Hasta cuánto puede moverse el flete de cada ruta antes de que convenga
 *    cambiar el plan?** Para una ruta que no se usa, cuánto tendría que
 *    abaratarse para entrar; para una que sí se usa, en qué intervalo puede
 *    moverse sin alterar nada.
 * 2. **¿Cuánto cuesta de verdad mover una unidad más de este origen a este
 *    destino?** No es el flete directo: es `u_i + v_j`, que puede ser menor
 *    porque la red permite reacomodar los envíos.
 */

import { casiIgual, formatearNumero, sumaExacta } from './numero';
import {
  encontrarCiclo,
  multiplicadores,
  type ProblemaBalanceado,
  type ResultadoTransporte,
  type SolucionTransporte,
} from './transporte';
import {
  ConstructorPasos,
  aviso,
  error,
  nota,
  resultadoFallido,
  type CeldaRef,
  type Diagnostico,
  type Resultado,
} from './tipos';

// ───────────────────────────── Resultados ─────────────────────────────

export interface RutaSensible {
  readonly fila: number;
  readonly columna: number;
  readonly origen: string;
  readonly destino: string;
  /** Flete unitario declarado para esta ruta. */
  readonly costo: number;
  readonly envio: number;
  readonly basica: boolean;
  /** La ruta toca un origen o un destino ficticio: no existe en la realidad. */
  readonly ficticia: boolean;
  /** `c_ij − u_i − v_j`. Cero en las rutas que se usan. */
  readonly costoReducido: number;
  /** Intervalo del flete dentro del cual el plan de envíos no cambia. */
  readonly desde: number | null;
  readonly hasta: number | null;
  readonly lectura: string;
}

export interface Multiplicador {
  readonly indice: number;
  readonly nombre: string;
  readonly valor: number;
  readonly ficticio: boolean;
}

export interface SensibilidadTransporte {
  readonly rutas: readonly RutaSensible[];
  readonly u: readonly Multiplicador[];
  readonly v: readonly Multiplicador[];
  /** Ruta sin usar cuyo flete está más cerca de volverla conveniente. */
  readonly rutaMasCercana: RutaSensible | null;
  readonly degenerada: boolean;
  readonly hayAlternativas: boolean;
}

export interface OpcionesSensibilidadTransporte {
  readonly decimales?: number;
}

// ───────────────────────────── Cálculo ─────────────────────────────

/**
 * Cómo cambia el costo reducido de cada ruta no básica cuando se mueve el flete
 * de una ruta **básica**.
 *
 * Al tocar el costo de una celda de la base cambian los multiplicadores, y con
 * ellos todos los costos reducidos. El efecto se lee en el ciclo: el costo
 * reducido de una ruta no básica es la suma alternada de los fletes de su
 * ciclo, con signo `+` en la propia ruta. Así que si la celda básica aparece en
 * una posición par del ciclo el costo reducido sube con el flete, y si aparece
 * en una impar, baja.
 */
function efectoEnCiclo(ciclo: readonly CeldaRef[], celda: CeldaRef): 1 | -1 | 0 {
  const posicion = ciclo.findIndex((c) => c.fila === celda.fila && c.columna === celda.columna);
  if (posicion <= 0) return 0;
  return posicion % 2 === 0 ? 1 : -1;
}

function rangoDeRutaBasica(
  p: ProblemaBalanceado,
  s: SolucionTransporte,
  celda: CeldaRef,
  reducidos: readonly (readonly number[])[],
): { desde: number | null; hasta: number | null } {
  const m = p.origenes.length;
  const n = p.destinos.length;
  const costo = p.costos[celda.fila]![celda.columna] ?? 0;

  let deltaMin: number | null = null;
  let deltaMax: number | null = null;

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (s.basicas[i]![j]) continue;

      const ciclo = encontrarCiclo(s.basicas, { fila: i, columna: j }, m, n);
      if (ciclo === null) continue;

      const efecto = efectoEnCiclo(ciclo, celda);
      if (efecto === 0) continue;

      // Optimalidad: r + Δ·efecto ≥ 0.
      const r = reducidos[i]![j]!;
      if (efecto === 1) deltaMin = deltaMin === null ? -r : Math.max(deltaMin, -r);
      else deltaMax = deltaMax === null ? r : Math.min(deltaMax, r);
    }
  }

  return {
    desde: deltaMin === null ? null : costo + deltaMin,
    hasta: deltaMax === null ? null : costo + deltaMax,
  };
}

export function analizarSensibilidadTransporte(
  resultado: ResultadoTransporte,
  opciones: OpcionesSensibilidadTransporte = {},
): Resultado<SensibilidadTransporte> {
  const decimales = opciones.decimales ?? 2;
  const diagnosticos: Diagnostico[] = [];

  const p = resultado.problema;
  const s = resultado.solucionOptima;
  const m = p.origenes.length;
  const n = p.destinos.length;

  const { u, v, completo } = multiplicadores(p, s.basicas);

  if (!completo) {
    diagnosticos.push(
      error(
        'TR_SENSIBILIDAD_INCOMPLETA',
        'No se pudieron determinar todos los multiplicadores: la base no conecta todos los orígenes con todos los destinos. Ocurre cuando la solución está degenerada y le faltan celdas básicas; el solucionador debería haberlas agregado con envío cero.',
      ),
    );
    return resultadoFallido(diagnosticos);
  }

  const num = (x: number): string => formatearNumero(x, { decimales });
  const cu = resultado.unidadCosto;
  const cc = resultado.unidadCantidad;

  const reducidos = p.costos.map((fila, i) => fila.map((c, j) => c - (u[i] ?? 0) - (v[j] ?? 0)));

  const esFicticia = (i: number, j: number): boolean =>
    (p.origenFicticio && i === m - 1) || (p.destinoFicticio && j === n - 1);

  // ── Rutas ────────────────────────────────────────────────────────────────
  const rutas: RutaSensible[] = [];

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      const basica = s.basicas[i]![j] ?? false;
      const costo = p.costos[i]![j] ?? 0;
      const r = reducidos[i]![j]!;
      const ficticia = esFicticia(i, j);

      const { desde, hasta } = basica
        ? rangoDeRutaBasica(p, s, { fila: i, columna: j }, reducidos)
        : { desde: costo - r, hasta: null };

      const enviaAlgo = (s.envios[i]![j] ?? 0) > 0;

      const lectura = ficticia
        ? 'Ruta ficticia: existe solo para balancear el problema, así que su flete no representa un costo real.'
        : basica && !enviaAlgo
          ? `Está en la base pero no lleva nada: es una celda de degeneración. El intervalo [${desde === null ? '−∞' : num(desde)}, ${hasta === null ? '+∞' : num(hasta)}] ` +
            'es donde esta base sigue siendo la óptima, pero como por esta ruta no viaja ninguna unidad, mover su flete no cambia el costo ni el plan de envíos ni siquiera fuera de él.'
          : basica
            ? `Se usa en el plan. El flete puede moverse entre ${desde === null ? 'cualquier valor hacia abajo' : `${num(desde)} ${cu}`} y ` +
              `${hasta === null ? 'cualquier valor hacia arriba' : `${num(hasta)} ${cu}`} sin que cambie el plan de envíos; fuera de ese intervalo conviene reacomodar.`
            : casiIgual(r, 0)
              ? 'No se usa, pero su costo reducido es cero: incluirla daría exactamente el mismo costo total. Hay más de un plan óptimo.'
            : `No se usa. Entraría al plan si su flete bajara de ${num(costo)} a ${num(costo - r)} ${cu}, es decir ${num(r)} ${cu} menos por ${cc.replace(/s$/, '')}.`;

      rutas.push({
        fila: i,
        columna: j,
        origen: p.origenes[i] ?? '',
        destino: p.destinos[j] ?? '',
        costo,
        envio: s.envios[i]![j] ?? 0,
        basica,
        ficticia,
        costoReducido: basica ? 0 : r,
        desde,
        hasta,
        lectura,
      });
    }
  }

  // ── Multiplicadores ──────────────────────────────────────────────────────
  const mu: Multiplicador[] = p.origenes.map((nombre, i) => ({
    indice: i,
    nombre,
    valor: u[i] ?? 0,
    ficticio: p.origenFicticio && i === m - 1,
  }));

  const mv: Multiplicador[] = p.destinos.map((nombre, j) => ({
    indice: j,
    nombre,
    valor: v[j] ?? 0,
    ficticio: p.destinoFicticio && j === n - 1,
  }));

  const candidatas = rutas.filter((x) => !x.basica && !x.ficticia && !casiIgual(x.costoReducido, 0));
  const rutaMasCercana = candidatas.reduce<RutaSensible | null>(
    (mejor, x) => (mejor === null || x.costoReducido < mejor.costoReducido ? x : mejor),
    null,
  );

  const hayAlternativas = rutas.some((x) => !x.basica && !x.ficticia && casiIgual(x.costoReducido, 0));

  if (s.degenerada) {
    diagnosticos.push(
      aviso(
        'TR_SENSIBILIDAD_DEGENERADA',
        'La solución es degenerada: alguna celda básica lleva envío cero. Los multiplicadores y los rangos siguen siendo correctos, pero no son únicos —otra base daría el mismo plan con otros números—, así que conviene comprobarlos volviendo a resolver antes de decidir sobre ellos.',
      ),
    );
  }

  if (hayAlternativas) {
    diagnosticos.push(
      nota(
        'TR_SENSIBILIDAD_ALTERNATIVAS',
        'Hay rutas sin usar con costo reducido cero: meterlas al plan daría exactamente el mismo costo total. Gerencialmente es una ventaja, porque permite elegir entre planes equivalentes por criterios que el modelo no recoge —confiabilidad del transportista, riesgo de la ruta, relación con el cliente—.',
      ),
    );
  }

  if (p.origenFicticio || p.destinoFicticio) {
    diagnosticos.push(
      nota(
        'TR_SENSIBILIDAD_FICTICIA',
        `El problema estaba desbalanceado, así que se agregó ${p.origenFicticio ? 'un origen' : 'un destino'} ficticio. Sus rutas aparecen en la tabla por completitud, pero su flete es cero por construcción y no representa ningún costo real: lo que miden es qué ${p.origenFicticio ? 'demanda queda sin atender' : 'oferta queda sin colocar'}.`,
      ),
    );
  }

  // ── Pasos ────────────────────────────────────────────────────────────────
  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Los multiplicadores dicen cuánto vale de verdad cada ruta',
    explicacion:
      'Los números `u` y `v` que MODI calculó para verificar la optimalidad no son un artificio del método: son los **precios sombra** de la ' +
      'oferta de cada origen y de la demanda de cada destino.\n\n' +
      'Su lectura correcta exige un cuidado. Como se fija `u₁ = 0` por convención, los valores individuales dependen de esa elección y no ' +
      'significan nada por separado. Lo que **sí** significa algo, y no depende de la convención, es la **suma `u_i + v_j`**: es lo que costaría ' +
      'mover una unidad más del origen i al destino j, subiendo a la vez la oferta de i y la demanda de j para no romper el balance.\n\n' +
      'Y ahí está lo interesante: en las rutas que se usan, `u_i + v_j` es exactamente el flete. En las que no se usan es **menor** que el flete ' +
      'directo, porque la red permite llevar esa unidad dando un rodeo más barato. La diferencia entre las dos cifras es el costo reducido.',
    formula: 'u_i + v_j = c_{ij} \\ \\text{(rutas usadas)} \\qquad \\bar{c}_{ij} = c_{ij} - u_i - v_j',
    tabla: {
      encabezados: ['Multiplicador', 'Corresponde a', 'Valor', 'Lectura'],
      filas: [
        ...mu.map((x) => [
          `u${x.indice + 1}`,
          `Oferta de ${x.nombre}`,
          num(x.valor),
          x.ficticio ? 'Origen ficticio: no existe.' : 'Precio sombra de la oferta de este origen.',
        ]),
        ...mv.map((x) => [
          `v${x.indice + 1}`,
          `Demanda de ${x.nombre}`,
          num(x.valor),
          x.ficticio ? 'Destino ficticio: no existe.' : 'Precio sombra de la demanda de este destino.',
        ]),
      ],
    },
  });

  pasos.agregar({
    titulo: 'Hasta dónde puede moverse el flete de cada ruta',
    explicacion:
      'Una ruta **que no se usa** entra al plan en cuanto su flete baja por debajo de `u_i + v_j`. El costo reducido es exactamente lo que le ' +
      'falta bajar, así que sirve para negociar: es el descuento mínimo que habría que conseguir de ese transportista para que valga la pena ' +
      'contratarlo.\n\n' +
      'Una ruta **que sí se usa** aguanta un intervalo. Subir su flete la vuelve menos atractiva y, pasado el tope, conviene reacomodar los ' +
      'envíos; bajarlo la refuerza, pero también hay un piso, porque por debajo de él sería mejor mandar todavía más por ahí y menos por otra ' +
      'parte. El intervalo sale de exigir que ningún costo reducido cambie de signo: al mover el flete de una celda básica se mueven todos los ' +
      'multiplicadores, y con ellos las demás rutas.',
    tabla: {
      encabezados: ['Ruta', 'Envío', 'Flete', 'Costo reducido', 'Desde', 'Hasta', 'Qué significa'],
      filas: rutas.map((x) => [
        `${x.origen} → ${x.destino}`,
        x.basica ? `${num(x.envio)} ${cc}` : '—',
        num(x.costo),
        x.basica ? '—' : num(x.costoReducido),
        x.desde === null ? 'sin límite' : num(x.desde),
        x.hasta === null ? 'sin límite' : num(x.hasta),
        x.lectura,
      ]),
      resaltadas: rutas.map((x, i) => (x.basica ? i : -1)).filter((i) => i >= 0),
    },
  });

  return {
    datos: { rutas, u: mu, v: mv, rutaMasCercana, degenerada: s.degenerada, hayAlternativas },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion: interpretar(resultado, rutas, mu, mv, rutaMasCercana, hayAlternativas, num),
  };
}

// ───────────────────────────── Redacción ─────────────────────────────

function interpretar(
  resultado: ResultadoTransporte,
  rutas: readonly RutaSensible[],
  u: readonly Multiplicador[],
  v: readonly Multiplicador[],
  masCercana: RutaSensible | null,
  hayAlternativas: boolean,
  num: (x: number) => string,
): string {
  const cu = resultado.unidadCosto;
  const partes: string[] = [];

  const usadas = rutas.filter((x) => x.basica && !x.ficticia);
  partes.push(
    `El plan usa ${usadas.length} ${usadas.length === 1 ? 'ruta' : 'rutas'} de las ${rutas.filter((x) => !x.ficticia).length} posibles, ` +
      `con un costo total de ${num(resultado.solucionOptima.costoTotal)} ${cu}.`,
  );

  if (masCercana !== null) {
    partes.push(
      `La ruta más cerca de entrar es ${masCercana.origen} → ${masCercana.destino}: bastaría con negociar un descuento de ` +
        `${num(masCercana.costoReducido)} ${cu} por unidad —bajar el flete de ${num(masCercana.costo)} a ${num(masCercana.costo - masCercana.costoReducido)}— ` +
        'para que convenga usarla. Ese número es el argumento con el que se va a negociar, en vez de pedir «una rebaja».',
    );
  }

  const estrechas = usadas
    .filter((x) => x.hasta !== null)
    .sort((a, b) => (a.hasta! - a.costo) - (b.hasta! - b.costo))
    .slice(0, 1);

  if (estrechas.length > 0) {
    const x = estrechas[0]!;
    partes.push(
      `La ruta más sensible a un alza es ${x.origen} → ${x.destino}: su flete solo aguanta hasta ${num(x.hasta!)} ${cu} ` +
        `—${num(x.hasta! - x.costo)} ${cu} por encima del actual— antes de que convenga rehacer el plan. Ahí es donde más importa cerrar el precio.`,
    );
  }

  if (hayAlternativas) {
    partes.push(
      'Hay rutas sin usar con costo reducido cero: existen varios planes con el mismo costo total, y la decisión entre ellos puede tomarse por ' +
        'criterios que el modelo no recoge.',
    );
  }

  // Suma de los multiplicadores ponderada: comprobación de la dualidad.
  const dual = sumaExacta([
    ...u.map((x, i) => x.valor * (resultado.problema.oferta[i] ?? 0)),
    ...v.map((x, j) => x.valor * (resultado.problema.demanda[j] ?? 0)),
  ]);

  if (casiIgual(dual, resultado.solucionOptima.costoTotal, 1e-6)) {
    partes.push(
      'Como comprobación: la oferta y la demanda valoradas con sus multiplicadores dan exactamente el costo total del plan. Es la dualidad del ' +
        'problema, y confirma que los números son consistentes.',
    );
  }

  return partes.join(' ');
}
