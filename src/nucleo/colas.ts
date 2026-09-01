/**
 * Módulo 13 — Líneas de espera.
 *
 * Modelos M/M/1 y M/M/s: llegadas de Poisson, servicio exponencial, disciplina
 * primero en llegar primero en ser atendido y capacidad ilimitada. Las fórmulas
 * son las estándar de la bibliografía del curso —Chase, Heizer, Russell y
 * Stevenson—; el tema no aparece en ningún material propio, y eso queda
 * registrado como inconsistencia I-17.
 *
 * Lo que el módulo tiene que dejar claro es una sola cosa, y no es una fórmula:
 * **la espera no crece de forma proporcional a la ocupación, sino que se
 * dispara cerca del 100 %**. Pasar de 80 % a 90 % de utilización no agrega un
 * 12 % de espera: la multiplica por 2,25. Por eso el resultado incluye la utilización con
 * su lectura y la serie para dibujar la curva.
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

export interface DatosColas {
  readonly titulo: string;
  /** Tasa media de llegadas por unidad de tiempo (λ). */
  readonly tasaLlegadas: number;
  /** Tasa media de servicio de **un** servidor (μ). */
  readonly tasaServicio: number;
  readonly servidores: number;
  readonly unidadTiempo: string;
  readonly nombreClientes: string;
  readonly moneda: CodigoMoneda;
  readonly costoEsperaPorHora: number;
  readonly costoServidorPorHora: number;
}

export interface ResultadoColas {
  readonly moneda: CodigoMoneda;
  readonly unidadTiempo: string;
  readonly nombreClientes: string;
  readonly servidores: number;
  /** Utilización del sistema: ρ = λ / (s μ). */
  readonly utilizacion: number;
  /** Probabilidad de que el sistema esté vacío. */
  readonly probabilidadVacio: number;
  /** Probabilidad de tener que esperar (que todos los servidores estén ocupados). */
  readonly probabilidadEsperar: number;
  /** Clientes promedio en el sistema. */
  readonly enSistema: number;
  /** Clientes promedio en la cola. */
  readonly enCola: number;
  /** Tiempo promedio en el sistema. */
  readonly tiempoSistema: number;
  /** Tiempo promedio de espera en la cola. */
  readonly tiempoCola: number;
  /** Costo por unidad de tiempo de la espera más los servidores. Null si no hay costos. */
  readonly costoTotalPorHora: number | null;
  readonly costoEspera: number | null;
  readonly costoServidores: number | null;
  readonly estable: boolean;
}

/** Cuántos servidores hacen falta como mínimo para que la cola no crezca sin fin. */
export function servidoresMinimos(tasaLlegadas: number, tasaServicio: number): number {
  if (tasaServicio <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(tasaLlegadas / tasaServicio) + 1;
}

const factorial = (n: number): number => {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
};

/**
 * Probabilidad de sistema vacío en M/M/s.
 *
 * Se calcula aquí y no se aproxima porque de ella cuelgan todas las demás
 * medidas: un error en P₀ se propaga a la cola, al tiempo y al costo.
 */
export function probabilidadVacio(lambda: number, mu: number, s: number): number {
  const a = lambda / mu;
  const rho = a / s;
  if (rho >= 1) return 0;

  const terminos: number[] = [];
  for (let n = 0; n < s; n++) terminos.push(a ** n / factorial(n));
  terminos.push((a ** s / factorial(s)) * (1 / (1 - rho)));

  return 1 / sumaExacta(terminos);
}

function validar(d: DatosColas): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.tasaLlegadas <= 0) g.push(error('COLA_LLEGADAS', 'La tasa de llegadas debe ser mayor que cero.'));
  if (d.tasaServicio <= 0) g.push(error('COLA_SERVICIO', 'La tasa de servicio debe ser mayor que cero.'));
  if (!Number.isInteger(d.servidores) || d.servidores < 1) {
    g.push(error('COLA_SERVIDORES', 'El número de servidores debe ser un entero de al menos uno.'));
  }
  if (d.servidores > 30) {
    g.push(
      aviso(
        'COLA_MUCHOS_SERVIDORES',
        'Con más de 30 servidores el factorial de la fórmula pierde precisión en punto flotante. El resultado sigue ' +
          'siendo orientativo, pero conviene comprobarlo con una tabla.',
      ),
    );
  }

  if (hayErrores(g)) return g;

  const rho = d.tasaLlegadas / (d.servidores * d.tasaServicio);
  if (rho >= 1) {
    const minimos = servidoresMinimos(d.tasaLlegadas, d.tasaServicio);
    g.push(
      error(
        'COLA_INESTABLE',
        `El sistema es inestable: llegan ${formatearNumero(d.tasaLlegadas)} ${d.nombreClientes} por ${d.unidadTiempo} y ` +
          `${formatearNumero(d.servidores)} servidor(es) alcanzan a atender ${formatearNumero(d.servidores * d.tasaServicio)}. ` +
          'La cola crece sin límite y las fórmulas de estado estable no aplican. ' +
          `Harían falta al menos ${formatearNumero(minimos, { decimales: 0 })} servidores.`,
      ),
    );
  }

  return g;
}

export function resolverColas(d: DatosColas): Resultado<ResultadoColas> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const lambda = d.tasaLlegadas;
  const mu = d.tasaServicio;
  const s = d.servidores;
  const a = lambda / mu;
  const rho = a / s;
  const simbolo = d.moneda === 'USD' ? 'US$' : 'L';
  const u = d.unidadTiempo;

  const p0 = probabilidadVacio(lambda, mu, s);

  // Lq: en M/M/1 se simplifica, pero se calcula con la fórmula general para que
  // el caso de un servidor no sea un camino aparte que pueda divergir del otro.
  const enCola = ((a ** s * rho) / (factorial(s) * (1 - rho) ** 2)) * p0;
  const enSistema = enCola + a;
  const tiempoCola = dividirSeguro(enCola, lambda) ?? 0;
  const tiempoSistema = tiempoCola + 1 / mu;

  // Probabilidad de que un cliente que llega tenga que esperar: fórmula de Erlang C.
  const probabilidadEsperar = ((a ** s) / (factorial(s) * (1 - rho))) * p0;

  const hayCostos = d.costoEsperaPorHora > 0 || d.costoServidorPorHora > 0;
  const costoEspera = hayCostos ? enSistema * d.costoEsperaPorHora : null;
  const costoServidores = hayCostos ? s * d.costoServidorPorHora : null;
  const costoTotalPorHora = hayCostos ? (costoEspera ?? 0) + (costoServidores ?? 0) : null;

  if (rho > 0.9) {
    diagnosticos.push(
      aviso(
        'COLA_SATURADA',
        `La utilización es del ${formatearNumero(rho * 100, { decimales: 1 })} %. En esa zona la espera se dispara: ` +
          'cualquier variación pequeña en las llegadas produce colas mucho más largas. Un sistema real no se planifica ' +
          'para operar ahí.',
      ),
    );
  }

  diagnosticos.push(
    nota(
      'COLA_SUPUESTOS',
      'El modelo supone llegadas de Poisson, tiempos de servicio exponenciales, disciplina de primero en llegar ' +
        'primero en ser atendido y sala de espera ilimitada. Si la realidad no se parece a eso —turnos con cita, ' +
        'servicio casi constante, clientes que se van al ver la fila—, los números salen optimistas.',
    ),
  );

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Comprobar que el sistema sea estable',
    explicacion:
      `Llegan ${formatearNumero(lambda)} ${d.nombreClientes} por ${u} y los ${formatearNumero(s, { decimales: 0 })} ` +
      `servidor(es) atienden hasta ${formatearNumero(s * mu)}. Mientras la capacidad supere a la demanda la cola se ` +
      'estabiliza; si no, crece sin fin y no hay promedio que calcular.',
    formula: '\\rho = \\frac{\\lambda}{s\\,\\mu} < 1',
    valor: rho * 100,
    unidad: '% de utilización',
  });

  pasos.agregar({
    titulo: 'Calcular la probabilidad de sistema vacío',
    explicacion:
      'Todas las demás medidas cuelgan de esta probabilidad, así que se calcula primero. Es la fracción del tiempo en ' +
      'que no hay ningún cliente en el sistema.',
    formula:
      s === 1
        ? 'P_0 = 1 - \\rho'
        : 'P_0 = \\left[\\sum_{n=0}^{s-1}\\frac{(\\lambda/\\mu)^n}{n!} + \\frac{(\\lambda/\\mu)^s}{s!}\\cdot\\frac{1}{1-\\rho}\\right]^{-1}',
    valor: p0 * 100,
    unidad: '%',
  });

  pasos.agregar({
    titulo: 'Calcular las medidas de desempeño',
    explicacion:
      'Las cuatro medidas se enlazan por la ley de Little: lo que hay en el sistema es lo que llega multiplicado por ' +
      'lo que tarda. Por eso basta calcular una y las demás salen solas.',
    formula: 'L = \\lambda\\,W \\qquad L_q = \\lambda\\,W_q \\qquad W = W_q + \\frac{1}{\\mu}',
    tabla: {
      encabezados: ['Medida', 'Símbolo', 'Valor'],
      filas: [
        [`${d.nombreClientes} en la cola`, 'Lq', formatearNumero(enCola)],
        [`${d.nombreClientes} en el sistema`, 'L', formatearNumero(enSistema)],
        ['Espera en la cola', 'Wq', `${formatearNumero(tiempoCola)} ${u}`],
        ['Tiempo total en el sistema', 'W', `${formatearNumero(tiempoSistema)} ${u}`],
        ['Probabilidad de tener que esperar', 'Pw', `${formatearNumero(probabilidadEsperar * 100, { decimales: 1 })} %`],
      ],
      pieAdicional: [
        'Comprobación de la ley de Little: L = λ × W = ' +
          `${formatearNumero(lambda)} × ${formatearNumero(tiempoSistema)} = ${formatearNumero(lambda * tiempoSistema)}.`,
      ],
    },
  });

  if (hayCostos) {
    pasos.agregar({
      titulo: 'Comparar el costo de esperar contra el de atender',
      explicacion:
        'Agregar un servidor cuesta dinero y ahorra espera. La decisión está donde la suma de los dos costos toca ' +
        'fondo, no donde la cola desaparece: eliminarla del todo siempre sale más caro de lo que vale.',
      formula: 'C_T = L\\,C_e + s\\,C_s',
      tabla: {
        encabezados: ['Componente', 'Cálculo', `Costo por ${u} (${simbolo})`],
        filas: [
          ['Espera', `${formatearNumero(enSistema)} ${d.nombreClientes} × ${simbolo} ${formatearNumero(d.costoEsperaPorHora)}`, formatearNumero(costoEspera ?? 0)],
          ['Servidores', `${formatearNumero(s, { decimales: 0 })} × ${simbolo} ${formatearNumero(d.costoServidorPorHora)}`, formatearNumero(costoServidores ?? 0)],
        ],
        pie: ['Total', '', formatearNumero(costoTotalPorHora ?? 0)],
      },
      valor: costoTotalPorHora ?? Number.NaN,
      unidad: `${simbolo} / ${u}`,
    });
  }

  const interpretacion =
    `Con ${formatearNumero(s, { decimales: 0 })} servidor(es), el sistema opera al ` +
    `${formatearNumero(rho * 100, { decimales: 1 })} % de su capacidad: en promedio hay ${formatearNumero(enCola)} ` +
    `${d.nombreClientes} esperando y cada uno aguarda ${formatearNumero(tiempoCola)} ${u} antes de ser atendido. ` +
    (rho > 0.85
      ? 'La utilización está en la zona peligrosa: la espera crece mucho más rápido que la ocupación, así que un ' +
        'aumento pequeño de la demanda desborda el sistema. Conviene dimensionar con holgura.'
      : 'La utilización deja margen: el sistema absorbe variaciones de la demanda sin que la cola se dispare.') +
    ' La idea que conviene llevarse es que la relación entre ocupación y espera no es proporcional: apretar la ' +
    'capacidad para no tener servidores ociosos es exactamente lo que produce las colas largas.';

  return {
    datos: {
      moneda: d.moneda,
      unidadTiempo: d.unidadTiempo,
      nombreClientes: d.nombreClientes,
      servidores: s,
      utilizacion: rho,
      probabilidadVacio: p0,
      probabilidadEsperar,
      enSistema,
      enCola,
      tiempoSistema,
      tiempoCola,
      costoTotalPorHora,
      costoEspera,
      costoServidores,
      estable: true,
    },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion,
  };
}

export interface OpcionServidores {
  readonly servidores: number;
  readonly utilizacion: number;
  readonly enCola: number;
  readonly tiempoCola: number;
  readonly costoEspera: number;
  readonly costoServidores: number;
  readonly costoTotal: number;
}

/**
 * Compara cuántos servidores conviene poner. Es la decisión real del módulo:
 * no «cuánta cola hay» sino «cuántos mostradores abro».
 */
export function compararServidores(d: DatosColas, maximo = 8): readonly OpcionServidores[] {
  const minimo = servidoresMinimos(d.tasaLlegadas, d.tasaServicio);
  const salida: OpcionServidores[] = [];

  for (let s = minimo; s <= Math.max(minimo, maximo); s++) {
    const r = resolverColas({ ...d, servidores: s }).datos;
    if (r === null) continue;
    const costoEspera = r.enSistema * d.costoEsperaPorHora;
    const costoServidores = s * d.costoServidorPorHora;
    salida.push({
      servidores: s,
      utilizacion: r.utilizacion,
      enCola: r.enCola,
      tiempoCola: r.tiempoCola,
      costoEspera,
      costoServidores,
      costoTotal: costoEspera + costoServidores,
    });
  }

  return salida;
}

export interface PuntoEspera {
  readonly utilizacion: number;
  readonly tiempoCola: number;
}

/**
 * Curva de espera contra utilización, que es la gráfica que explica el módulo:
 * la asíntota en ρ = 1 muestra por qué apretar la capacidad sale caro.
 */
export function curvaEspera(d: DatosColas, puntos = 60): readonly PuntoEspera[] {
  const salida: PuntoEspera[] = [];
  const capacidad = d.servidores * d.tasaServicio;

  for (let i = 1; i <= puntos; i++) {
    const rho = (i / (puntos + 1)) * 0.98;
    const r = resolverColas({ ...d, tasaLlegadas: rho * capacidad }).datos;
    if (r === null) continue;
    salida.push({ utilizacion: rho, tiempoCola: r.tiempoCola });
  }

  return salida;
}
