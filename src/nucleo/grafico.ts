/**
 * Módulo 8 — Método gráfico de programación lineal.
 *
 * Resuelve problemas de dos variables enumerando los vértices de la región
 * factible: cada par de restricciones se cruza, se descartan los puntos que
 * violan alguna restricción, y el óptimo se busca entre los vértices que
 * quedan. Es exactamente el procedimiento que se hace a mano, y por eso los
 * pasos se pueden mostrar tal cual.
 *
 * Detecta los cuatro desenlaces posibles: solución única, soluciones
 * múltiples, región no acotada y problema infactible.
 */

import { casiIgual, dividirSeguro, formatearNumero, singular, sumaExacta } from './numero';
import {
  ConstructorPasos,
  aviso,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Objetivo,
  type Punto,
  type Resultado,
} from './tipos';

export type Relacion = '<=' | '>=' | '=';

export const SIMBOLO_RELACION: Record<Relacion, string> = {
  '<=': '≤',
  '>=': '≥',
  '=': '=',
};

export interface Restriccion {
  readonly id: string;
  readonly nombre: string;
  /** Coeficiente de la primera variable. */
  readonly a: number;
  /** Coeficiente de la segunda variable. */
  readonly b: number;
  readonly relacion: Relacion;
  /** Lado derecho. */
  readonly c: number;
  /** Unidad del recurso, para la interpretación. */
  readonly unidad: string;
}

export interface DatosGrafico {
  readonly titulo: string;
  readonly objetivo: Objetivo;
  /** Nombre de la primera variable de decisión. */
  readonly nombreX: string;
  readonly nombreY: string;
  /** Unidad de las variables de decisión (mesas, quintales, hectáreas…). */
  readonly unidadVariables: string;
  /** Coeficiente de la primera variable en la función objetivo. */
  readonly coefX: number;
  readonly coefY: number;
  /** Qué mide la función objetivo: «utilidad», «costo», «margen de contribución». */
  readonly nombreObjetivo: string;
  readonly unidadObjetivo: string;
  readonly restricciones: readonly Restriccion[];
  /** Casi siempre verdadero: no se producen cantidades negativas. */
  readonly noNegatividad: boolean;
}

export interface Vertice {
  readonly punto: Punto;
  /** Restricciones que se cumplen con igualdad en este vértice. */
  readonly activas: readonly string[];
  readonly valorObjetivo: number;
  readonly optimo: boolean;
}

export interface HolguraRestriccion {
  readonly restriccion: Restriccion;
  /** Consumo del recurso en el punto óptimo. */
  readonly consumo: number;
  /** Holgura (en ≤) o excedente (en ≥). Cero significa restricción activa. */
  readonly holgura: number;
  readonly activa: boolean;
}

export type Desenlace = 'unica' | 'multiples' | 'no_acotada' | 'infactible';

export interface ResultadoGrafico {
  readonly vertices: readonly Vertice[];
  /** Vértices de la región factible en orden para dibujar el polígono. */
  readonly poligono: readonly Punto[];
  readonly optimo: Vertice | null;
  /** Todos los vértices que alcanzan el valor óptimo. */
  readonly optimos: readonly Vertice[];
  readonly valorOptimo: number | null;
  readonly desenlace: Desenlace;
  readonly holguras: readonly HolguraRestriccion[];
  /** Dirección en la que la región crece sin límite, si la hay. */
  readonly direccionNoAcotada: Punto | null;
  readonly datos: DatosGrafico;
}

const TOLERANCIA = 1e-7;

// ───────────────────────────── Validación ─────────────────────────────

function validar(d: DatosGrafico): Diagnostico[] {
  const g: Diagnostico[] = [];

  if (d.restricciones.length === 0) {
    g.push(error('LP_SIN_RESTRICCIONES', 'El problema no tiene restricciones: sin ellas, la región factible no está delimitada y el método gráfico no aplica.'));
  }
  if (d.coefX === 0 && d.coefY === 0) {
    g.push(error('LP_OBJETIVO_NULO', 'La función objetivo es idénticamente cero: cualquier punto factible sería óptimo.'));
  }

  for (const r of d.restricciones) {
    if (r.a === 0 && r.b === 0) {
      g.push(error('LP_RESTRICCION_VACIA', `La restricción "${r.nombre}" no involucra ninguna variable.`, r.id));
    }
    if (!Number.isFinite(r.a) || !Number.isFinite(r.b) || !Number.isFinite(r.c)) {
      g.push(error('LP_COEFICIENTE_INVALIDO', `La restricción "${r.nombre}" tiene coeficientes que no son números válidos.`, r.id));
    }
    if (r.relacion === '<=' && r.c < 0 && d.noNegatividad) {
      g.push(
        aviso(
          'LP_LADO_DERECHO_NEGATIVO',
          `La restricción "${r.nombre}" es de tipo ≤ con lado derecho negativo. Con variables no negativas eso suele volver infactible el problema; verifique el signo.`,
          r.id,
        ),
      );
    }
  }

  if (d.restricciones.length > 8) {
    g.push(nota('LP_MUCHAS_RESTRICCIONES', 'Con más de ocho restricciones el dibujo se vuelve difícil de leer. El método gráfico sigue siendo válido, pero en la práctica se pasa al método simplex.'));
  }

  return g;
}

// ───────────────────────────── Geometría ─────────────────────────────

/** Todas las rectas del problema: las restricciones más los ejes. */
function rectas(d: DatosGrafico): { id: string; a: number; b: number; c: number }[] {
  const lista = d.restricciones.map((r) => ({ id: r.id, a: r.a, b: r.b, c: r.c }));
  if (d.noNegatividad) {
    lista.push({ id: 'eje-x', a: 0, b: 1, c: 0 });
    lista.push({ id: 'eje-y', a: 1, b: 0, c: 0 });
  }
  return lista;
}

/** Intersección de dos rectas. `null` si son paralelas. */
function intersectar(
  r1: { a: number; b: number; c: number },
  r2: { a: number; b: number; c: number },
): Punto | null {
  const determinante = r1.a * r2.b - r2.a * r1.b;
  if (Math.abs(determinante) < 1e-12) return null;
  return {
    x: (r1.c * r2.b - r2.c * r1.b) / determinante,
    y: (r1.a * r2.c - r2.a * r1.c) / determinante,
  };
}

/** ¿El punto satisface todas las restricciones y la no negatividad? */
function esFactible(p: Punto, d: DatosGrafico): boolean {
  if (d.noNegatividad && (p.x < -TOLERANCIA || p.y < -TOLERANCIA)) return false;

  for (const r of d.restricciones) {
    const valor = r.a * p.x + r.b * p.y;
    const escala = Math.max(1, Math.abs(r.c));
    if (r.relacion === '<=' && valor > r.c + TOLERANCIA * escala) return false;
    if (r.relacion === '>=' && valor < r.c - TOLERANCIA * escala) return false;
    if (r.relacion === '=' && Math.abs(valor - r.c) > TOLERANCIA * escala) return false;
  }
  return true;
}

/** Restricciones que se cumplen con igualdad en el punto. */
function restriccionesActivas(p: Punto, d: DatosGrafico): string[] {
  const activas: string[] = [];
  for (const r of d.restricciones) {
    const escala = Math.max(1, Math.abs(r.c));
    if (Math.abs(r.a * p.x + r.b * p.y - r.c) <= TOLERANCIA * escala * 10) activas.push(r.id);
  }
  if (d.noNegatividad) {
    if (Math.abs(p.x) <= TOLERANCIA * 10) activas.push('eje-y');
    if (Math.abs(p.y) <= TOLERANCIA * 10) activas.push('eje-x');
  }
  return activas;
}

/** Ordena los vértices en sentido antihorario alrededor de su centroide. */
function ordenarPoligono(puntos: readonly Punto[]): Punto[] {
  if (puntos.length < 3) return [...puntos];
  const cx = sumaExacta(puntos.map((p) => p.x)) / puntos.length;
  const cy = sumaExacta(puntos.map((p) => p.y)) / puntos.length;
  return [...puntos].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
}

/**
 * Busca una dirección en la que la región factible se extiende sin límite y el
 * objetivo mejora. En dos dimensiones basta con probar los ejes y las
 * direcciones paralelas a cada restricción.
 */
function direccionNoAcotada(d: DatosGrafico): Punto | null {
  const candidatas: Punto[] = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ];

  for (const r of d.restricciones) {
    const largo = Math.hypot(r.a, r.b);
    if (largo < 1e-12) continue;
    candidatas.push({ x: r.b / largo, y: -r.a / largo });
    candidatas.push({ x: -r.b / largo, y: r.a / largo });
  }

  for (const dir of candidatas) {
    if (d.noNegatividad && (dir.x < -TOLERANCIA || dir.y < -TOLERANCIA)) continue;

    // La dirección debe pertenecer al cono de recesión de la región.
    let admisible = true;
    for (const r of d.restricciones) {
      const proyeccion = r.a * dir.x + r.b * dir.y;
      if (r.relacion === '<=' && proyeccion > TOLERANCIA) admisible = false;
      if (r.relacion === '>=' && proyeccion < -TOLERANCIA) admisible = false;
      if (r.relacion === '=' && Math.abs(proyeccion) > TOLERANCIA) admisible = false;
      if (!admisible) break;
    }
    if (!admisible) continue;

    // Y además tiene que mejorar el objetivo.
    const mejora = d.coefX * dir.x + d.coefY * dir.y;
    if (d.objetivo === 'maximizar' && mejora > TOLERANCIA) return dir;
    if (d.objetivo === 'minimizar' && mejora < -TOLERANCIA) return dir;
  }

  return null;
}

// ───────────────────────────── Solución ─────────────────────────────

export function resolverGrafico(d: DatosGrafico): Resultado<ResultadoGrafico> {
  const diagnosticos = validar(d);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const lineas = rectas(d);

  // Cada par de rectas produce un vértice candidato.
  const candidatos: Punto[] = [];
  for (let i = 0; i < lineas.length; i++) {
    for (let j = i + 1; j < lineas.length; j++) {
      const p = intersectar(lineas[i]!, lineas[j]!);
      if (p !== null) candidatos.push(p);
    }
  }

  // Se filtran los factibles y se eliminan duplicados.
  const factibles: Punto[] = [];
  for (const p of candidatos) {
    if (!esFactible(p, d)) continue;
    if (factibles.some((q) => casiIgual(q.x, p.x, 1e-7) && casiIgual(q.y, p.y, 1e-7))) continue;
    factibles.push({ x: p.x === 0 ? 0 : p.x, y: p.y === 0 ? 0 : p.y });
  }

  if (factibles.length === 0) {
    return {
      datos: {
        vertices: [],
        poligono: [],
        optimo: null,
        optimos: [],
        valorOptimo: null,
        desenlace: 'infactible',
        holguras: [],
        direccionNoAcotada: null,
        datos: d,
      },
      pasos: pasosInfactible(d),
      diagnosticos: [
        ...diagnosticos,
        error(
          'LP_INFACTIBLE',
          'No existe ningún punto que cumpla todas las restricciones a la vez: la región factible está vacía. ' +
            'Revise si alguna restricción de tipo ≥ pide más de lo que otra de tipo ≤ permite.',
        ),
      ],
      interpretacion:
        'El problema es infactible. En términos del negocio significa que las exigencias son contradictorias: ' +
        'no hay ningún plan de producción que respete todas las condiciones al mismo tiempo. ' +
        'Antes de buscar un óptimo hay que negociar cuál restricción se relaja.',
    };
  }

  const evaluar = (p: Punto): number => d.coefX * p.x + d.coefY * p.y;

  const direccion = direccionNoAcotada(d);

  const valores = factibles.map(evaluar);
  const mejorValor =
    d.objetivo === 'maximizar' ? Math.max(...valores) : Math.min(...valores);

  const vertices: Vertice[] = factibles.map((p) => ({
    punto: p,
    activas: restriccionesActivas(p, d),
    valorObjetivo: evaluar(p),
    optimo: direccion === null && casiIgual(evaluar(p), mejorValor, 1e-7),
  }));

  const optimos = vertices.filter((v) => v.optimo);
  const optimo = optimos[0] ?? null;

  const desenlace: Desenlace =
    direccion !== null ? 'no_acotada' : optimos.length > 1 ? 'multiples' : 'unica';

  const holguras: HolguraRestriccion[] =
    optimo === null
      ? []
      : d.restricciones.map((r) => {
          const consumo = r.a * optimo.punto.x + r.b * optimo.punto.y;
          const holgura = r.relacion === '>=' ? consumo - r.c : r.c - consumo;
          return {
            restriccion: r,
            consumo,
            holgura,
            activa: Math.abs(holgura) <= TOLERANCIA * Math.max(1, Math.abs(r.c)) * 10,
          };
        });

  if (desenlace === 'no_acotada') {
    diagnosticos.push(
      error(
        'LP_NO_ACOTADA',
        `La región factible se extiende sin límite en una dirección que mejora el objetivo, así que no existe un óptimo finito. ` +
          'En un problema real esto casi siempre significa que falta una restricción: ningún negocio puede ganar infinito. ' +
          'Revise si olvidó el límite de un recurso o la capacidad de mercado.',
      ),
    );
  }

  if (desenlace === 'multiples') {
    diagnosticos.push(
      aviso(
        'LP_OPTIMOS_MULTIPLES',
        `Hay ${optimos.length} vértices con el mismo valor óptimo: la función objetivo es paralela a una de las restricciones activas. ` +
          'Todos los puntos del segmento que los une son igualmente óptimos, así que la empresa puede elegir entre ellos por criterios no monetarios.',
      ),
    );
  }

  const degenerados = vertices.filter((v) => v.activas.length > 2);
  if (degenerados.length > 0) {
    diagnosticos.push(
      nota(
        'LP_VERTICE_DEGENERADO',
        `${degenerados.length} vértice(s) tienen más de dos restricciones activas a la vez: tres o más rectas se cruzan en el mismo punto. ` +
          'Es un caso de degeneración; no afecta el resultado gráfico, pero en el método simplex puede producir iteraciones que no mejoran.',
      ),
    );
  }

  const redundantes = d.restricciones.filter(
    (r) => !vertices.some((v) => v.activas.includes(r.id)),
  );
  if (redundantes.length > 0 && desenlace !== 'no_acotada') {
    diagnosticos.push(
      nota(
        'LP_RESTRICCION_REDUNDANTE',
        `${redundantes.map((r) => `"${r.nombre}"`).join(', ')} no toca la región factible en ningún vértice: es redundante. ` +
          'Otra restricción ya la hace cumplir, así que eliminarla no cambiaría la solución.',
      ),
    );
  }

  return {
    datos: {
      vertices,
      poligono: ordenarPoligono(factibles),
      optimo,
      optimos,
      valorOptimo: direccion === null ? mejorValor : null,
      desenlace,
      holguras,
      direccionNoAcotada: direccion,
      datos: d,
    },
    pasos: construirPasos(d, vertices, optimos, holguras, desenlace, direccion),
    diagnosticos,
    interpretacion: interpretar(d, optimos, holguras, desenlace),
  };
}

// ───────────────────────────── Pasos ─────────────────────────────

function textoRestriccion(d: DatosGrafico, r: Restriccion): string {
  const termino = (coef: number, nombre: string): string => {
    if (coef === 0) return '';
    if (coef === 1) return nombre;
    if (coef === -1) return `−${nombre}`;
    return `${formatearNumero(Math.abs(coef), { decimales: coef % 1 === 0 ? 0 : 2 })} ${nombre}`;
  };

  const tx = termino(r.a, d.nombreX);
  const ty = termino(r.b, d.nombreY);
  const signo = r.b < 0 ? ' − ' : ' + ';
  const izquierda = tx === '' ? ty : ty === '' ? tx : `${tx}${signo}${ty}`;

  return `${izquierda} ${SIMBOLO_RELACION[r.relacion]} ${formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })}`;
}

/**
 * Los nombres de variable son palabras («mesas», «maíz»), no símbolos sueltos.
 * En modo matemático KaTeX los compone en cursiva letra por letra —«m·e·s·a·s»—
 * y además avisa por los caracteres acentuados. `\text{}` los devuelve a su
 * forma escrita.
 */
function nombreTex(nombre: string): string {
  return `\\text{${nombre}}`;
}

/** La función objetivo en LaTeX, con los nombres compuestos como palabras. */
function objetivoTex(d: DatosGrafico): string {
  const t = (coef: number, nombre: string): string =>
    coef === 1
      ? nombreTex(nombre)
      : `${formatearNumero(coef, { decimales: coef % 1 === 0 ? 0 : 2 })}\\,${nombreTex(nombre)}`;
  return `Z = ${t(d.coefX, d.nombreX)} + ${t(d.coefY, d.nombreY)}`;
}

/** Cortes de una recta con los ejes, que es como se dibuja a mano. */
function cortesConEjes(r: Restriccion): { conX: number | null; conY: number | null } {
  return {
    conX: dividirSeguro(r.c, r.a),
    conY: dividirSeguro(r.c, r.b),
  };
}

function pasosInfactible(d: DatosGrafico): readonly import('./tipos').Paso[] {
  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Formular el modelo',
    explicacion:
      'Se escribe la función objetivo y todas las restricciones en la forma estándar, con las variables a la izquierda ' +
      'y el recurso disponible a la derecha.',
    formula: `\\text{${d.objetivo === 'maximizar' ? 'Max' : 'Min'}} \\quad ${objetivoTex(d)}`,
    tabla: {
      encabezados: ['Restricción', 'Expresión', 'Recurso'],
      filas: d.restricciones.map((r) => [r.nombre, textoRestriccion(d, r), `${formatearNumero(r.c, { decimales: 2 })} ${r.unidad}`]),
    },
  });

  pasos.agregar({
    titulo: 'Graficar y descubrir que no hay región factible',
    explicacion:
      'Al dibujar todas las restricciones no queda ninguna zona común: no existe un punto que las cumpla todas a la vez. ' +
      'El problema es infactible y no tiene sentido buscar un óptimo. Lo que corresponde es revisar los datos o negociar ' +
      'cuál de las condiciones se puede relajar.',
  });

  return pasos.listar();
}

function construirPasos(
  d: DatosGrafico,
  vertices: readonly Vertice[],
  optimos: readonly Vertice[],
  holguras: readonly HolguraRestriccion[],
  desenlace: Desenlace,
  direccion: Punto | null,
): readonly import('./tipos').Paso[] {
  const pasos = new ConstructorPasos();
  const u = d.unidadObjetivo;

  pasos.agregar({
    titulo: 'Formular el modelo',
    explicacion:
      `Se definen las variables de decisión: ${d.nombreX} y ${d.nombreY}, ambas en ${d.unidadVariables}. ` +
      `La función objetivo expresa ${d.nombreObjetivo} y cada restricción expresa un recurso limitado o una exigencia. ` +
      (d.noNegatividad ? 'Las variables no pueden ser negativas: no se produce una cantidad negativa de nada.' : ''),
    formula: `\\text{${d.objetivo === 'maximizar' ? 'Maximizar' : 'Minimizar'}} \\quad ${objetivoTex(d)}`,
    tabla: {
      encabezados: ['Restricción', 'Expresión', 'Disponible'],
      filas: [
        ...d.restricciones.map((r) => [r.nombre, textoRestriccion(d, r), `${formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })} ${r.unidad}`]),
        ...(d.noNegatividad ? [['No negatividad', `${d.nombreX} ≥ 0, ${d.nombreY} ≥ 0`, '—']] : []),
      ],
    },
  });

  pasos.agregar({
    titulo: 'Convertir cada restricción en una recta',
    explicacion:
      'Una desigualdad se grafica en dos movimientos: primero se dibuja la recta que se obtiene al cambiar el signo por una igualdad, ' +
      'y luego se decide de qué lado queda la zona permitida. La forma rápida de trazar la recta es hallar dónde corta cada eje: ' +
      `si ${d.nombreY} = 0 se despeja ${d.nombreX}, y si ${d.nombreX} = 0 se despeja ${d.nombreY}.`,
    tabla: {
      encabezados: ['Restricción', 'Recta', `Corte con el eje ${d.nombreX}`, `Corte con el eje ${d.nombreY}`, 'Zona permitida'],
      filas: d.restricciones.map((r) => {
        const cortes = cortesConEjes(r);
        return [
          r.nombre,
          textoRestriccion(d, r).replace(/[≤≥]/, '='),
          cortes.conX === null ? 'no corta' : `(${formatearNumero(cortes.conX, { decimales: 2 })}; 0)`,
          cortes.conY === null ? 'no corta' : `(0; ${formatearNumero(cortes.conY, { decimales: 2 })})`,
          r.relacion === '<=' ? 'debajo de la recta' : r.relacion === '>=' ? 'encima de la recta' : 'sobre la recta',
        ];
      }),
    },
  });

  pasos.agregar({
    titulo: 'Identificar los vértices de la región factible',
    explicacion:
      'La región factible es la zona donde se superponen todas las condiciones. Su forma es un polígono, y el teorema fundamental ' +
      'de la programación lineal garantiza que, si existe un óptimo, se alcanza en un vértice. ' +
      'Cada vértice sale de cruzar dos rectas: se resuelve el sistema de dos ecuaciones y se comprueba que el punto cumpla las demás restricciones.',
    tabla: {
      encabezados: ['Vértice', d.nombreX, d.nombreY, 'Restricciones activas'],
      filas: vertices.map((v, i) => [
        String.fromCharCode(65 + i),
        formatearNumero(v.punto.x, { decimales: 2 }),
        formatearNumero(v.punto.y, { decimales: 2 }),
        v.activas
          .map((id) => d.restricciones.find((r) => r.id === id)?.nombre ?? (id === 'eje-x' ? `${d.nombreY} = 0` : `${d.nombreX} = 0`))
          .join(', '),
      ]),
    },
  });

  pasos.agregar({
    titulo: 'Evaluar la función objetivo en cada vértice',
    explicacion:
      'Se sustituyen las coordenadas de cada vértice en la función objetivo. ' +
      `El mejor valor —el mayor si se maximiza, el menor si se minimiza— señala la solución óptima. ` +
      'Este paso es el que convierte un dibujo en una decisión.',
    formula: objetivoTex(d),
    tabla: {
      encabezados: ['Vértice', `(${d.nombreX}; ${d.nombreY})`, `Z (${u})`, 'Estado'],
      filas: vertices.map((v, i) => [
        String.fromCharCode(65 + i),
        `(${formatearNumero(v.punto.x, { decimales: 2 })}; ${formatearNumero(v.punto.y, { decimales: 2 })})`,
        formatearNumero(v.valorObjetivo, { decimales: 2 }),
        v.optimo ? 'óptimo' : '',
      ]),
      resaltadas: vertices.map((v, i) => (v.optimo ? i : -1)).filter((i) => i >= 0),
    },
    valor: optimos[0]?.valorObjetivo ?? Number.NaN,
    unidad: u,
  });

  pasos.agregar({
    titulo: 'Trazar la línea de indiferencia',
    explicacion:
      'La línea de indiferencia (o línea de isoutilidad) une todos los puntos con el mismo valor de Z. ' +
      'Al desplazarla paralelamente en la dirección que mejora el objetivo, el último punto de la región factible que toca es el óptimo. ' +
      'Es la comprobación visual de lo que la tabla de vértices ya dijo con números, y hace evidente por qué el óptimo siempre cae en una esquina.',
    formula: `${d.coefX}\\,${nombreTex(d.nombreX)} + ${d.coefY}\\,${nombreTex(d.nombreY)} = Z`,
  });

  if (desenlace === 'no_acotada' && direccion !== null) {
    pasos.agregar({
      titulo: 'Detectar que la región no está acotada',
      explicacion:
        `La región factible se extiende sin límite en la dirección (${formatearNumero(direccion.x, { decimales: 2 })}; ${formatearNumero(direccion.y, { decimales: 2 })}), ` +
        'y esa dirección mejora el objetivo. La línea de indiferencia se puede desplazar indefinidamente sin salir de la región, ' +
        'así que no existe un óptimo finito. Casi siempre significa que al modelo le falta una restricción.',
    });
    return pasos.listar();
  }

  pasos.agregar({
    titulo: 'Calcular holguras y recursos agotados',
    explicacion:
      'En el punto óptimo se compara el consumo de cada recurso con lo disponible. Las restricciones cuya holgura es cero están ' +
      '**activas**: son las que verdaderamente limitan la operación, y las únicas donde conseguir más recurso aumentaría la ganancia. ' +
      'Las que sobran indican capacidad ociosa.',
    tabla: {
      encabezados: ['Restricción', 'Disponible', 'Consumo', 'Holgura', 'Estado'],
      filas: holguras.map((h) => [
        h.restriccion.nombre,
        `${formatearNumero(h.restriccion.c, { decimales: 2 })} ${h.restriccion.unidad}`,
        formatearNumero(h.consumo, { decimales: 2 }),
        formatearNumero(h.holgura, { decimales: 2 }),
        h.activa ? 'activa — recurso agotado' : 'holgura — sobra capacidad',
      ]),
      resaltadas: holguras.map((h, i) => (h.activa ? i : -1)).filter((i) => i >= 0),
    },
  });

  return pasos.listar();
}

// ───────────────────────────── Interpretación ─────────────────────────────

function interpretar(
  d: DatosGrafico,
  optimos: readonly Vertice[],
  holguras: readonly HolguraRestriccion[],
  desenlace: Desenlace,
): string {
  if (desenlace === 'no_acotada') {
    return (
      'El problema no tiene solución óptima finita: la región factible crece sin límite en una dirección que mejora el objetivo. ' +
      'Ningún negocio real puede ganar infinito, así que esto es una señal de que al modelo le falta una restricción. ' +
      'Los candidatos habituales son la capacidad de la planta, la demanda máxima del mercado o el capital de trabajo disponible.'
    );
  }

  const optimo = optimos[0];
  if (optimo === undefined) return 'No se encontró una solución óptima.';

  const partes: string[] = [];
  const u = d.unidadObjetivo;

  partes.push(
    `El plan óptimo es producir ${formatearNumero(optimo.punto.x, { decimales: 2 })} ${d.nombreX} y ` +
      `${formatearNumero(optimo.punto.y, { decimales: 2 })} ${d.nombreY}, con ${d.nombreObjetivo} de ` +
      `${formatearNumero(optimo.valorObjetivo, { decimales: 2 })} ${u}.`,
  );

  const activas = holguras.filter((h) => h.activa);
  const ociosas = holguras.filter((h) => !h.activa && h.holgura > TOLERANCIA);

  if (activas.length > 0) {
    partes.push(
      `${activas.length === 1 ? 'El recurso que limita la operación es' : 'Los recursos que limitan la operación son'} ` +
        `${activas.map((h) => h.restriccion.nombre.toLowerCase()).join(' y ')}: ${activas.length === 1 ? 'se agota' : 'se agotan'} por completo. ` +
        'Ahí es donde conviene invertir: conseguir una unidad más de un recurso agotado aumenta la ganancia, mientras que conseguir más de uno que sobra no cambia nada.',
    );
  }

  if (ociosas.length > 0) {
    partes.push(
      `En cambio ${ociosas.map((h) => `de ${h.restriccion.nombre.toLowerCase()} sobran ${formatearNumero(h.holgura, { decimales: 2 })} ${h.restriccion.unidad}`).join(' y ')}. ` +
        'Esa capacidad ociosa se puede reasignar, alquilar o reducir sin afectar el resultado.',
    );
  }

  if (desenlace === 'multiples') {
    const otro = optimos[1];
    partes.push(
      `Existe más de una solución óptima: ${otro === undefined ? '' : `el punto (${formatearNumero(otro.punto.x, { decimales: 2 })}; ${formatearNumero(otro.punto.y, { decimales: 2 })}) da exactamente el mismo valor, `}` +
        'y también lo hace cualquier combinación intermedia entre ambos. Para la gerencia es una buena noticia: puede elegir el plan que mejor le convenga por otras razones ' +
        '—facilidad de producción, compromisos con clientes, uso de personal— sin sacrificar un solo lempira.',
    );
  } else {
    partes.push('La solución es única: cualquier otro plan factible da un resultado peor.');
  }

  return partes.join(' ');
}

// ───────────────────────────── Análisis de sensibilidad ─────────────────────────────

/**
 * Restricción llevada a la forma canónica n · x ≤ d.
 *
 * Trabajar con todas las restricciones en la misma forma —incluidas las de no
 * negatividad— permite resolver los precios sombra con un solo sistema de dos
 * ecuaciones, sin casos especiales por tipo de desigualdad.
 */
interface Normalizada {
  readonly id: string;
  readonly nombre: string;
  readonly n: Punto;
  readonly d: number;
  /** d = signo × c. Vale −1 en las restricciones de tipo ≥, que se invirtieron. */
  readonly signo: 1 | -1;
  readonly igualdad: boolean;
  readonly esNoNegatividad: boolean;
  readonly original: Restriccion | null;
}

function normalizar(d: DatosGrafico): Normalizada[] {
  const filas: Normalizada[] = d.restricciones.map((r) => {
    if (r.relacion === '>=') {
      return { id: r.id, nombre: r.nombre, n: { x: -r.a, y: -r.b }, d: -r.c, signo: -1 as const, igualdad: false, esNoNegatividad: false, original: r };
    }
    return {
      id: r.id,
      nombre: r.nombre,
      n: { x: r.a, y: r.b },
      d: r.c,
      signo: 1 as const,
      igualdad: r.relacion === '=',
      esNoNegatividad: false,
      original: r,
    };
  });

  if (d.noNegatividad) {
    filas.push({ id: 'eje-y', nombre: `${d.nombreX} ≥ 0`, n: { x: -1, y: 0 }, d: 0, signo: 1, igualdad: false, esNoNegatividad: true, original: null });
    filas.push({ id: 'eje-x', nombre: `${d.nombreY} ≥ 0`, n: { x: 0, y: -1 }, d: 0, signo: 1, igualdad: false, esNoNegatividad: true, original: null });
  }

  return filas;
}

export interface PrecioSombra {
  readonly restriccion: Restriccion;
  /** Cuánto cambia Z por cada unidad adicional del recurso. */
  readonly valor: number;
  readonly activa: boolean;
  readonly holgura: number;
  /** Intervalo del lado derecho en el que este precio sombra sigue siendo válido. */
  readonly rangoDesde: number | null;
  readonly rangoHasta: number | null;
  readonly lectura: string;
}

export interface RangoCoeficiente {
  readonly variable: 'x' | 'y';
  readonly nombre: string;
  readonly valorActual: number;
  readonly desde: number | null;
  readonly hasta: number | null;
}

export interface ResultadoSensibilidad {
  readonly preciosSombra: readonly PrecioSombra[];
  readonly rangosCoeficientes: readonly RangoCoeficiente[];
  /** El vértice óptimo tiene más de dos restricciones activas: los duales no son únicos. */
  readonly degenerado: boolean;
  readonly multiplesOptimos: boolean;
  /** Recurso con el precio sombra más alto: donde conviene invertir primero. */
  readonly recursoMasValioso: PrecioSombra | null;
}

/** Intervalo de t donde α·t + β ≥ 0. */
function rangoNoNegativo(alfa: number, beta: number): { min: number; max: number } {
  if (Math.abs(alfa) < 1e-12) return beta >= -1e-9 ? { min: -Infinity, max: Infinity } : { min: 1, max: -1 };
  const corte = -beta / alfa;
  return alfa > 0 ? { min: corte, max: Infinity } : { min: -Infinity, max: corte };
}

function intersectarIntervalos(a: { min: number; max: number }, b: { min: number; max: number }): { min: number; max: number } {
  return { min: Math.max(a.min, b.min), max: Math.min(a.max, b.max) };
}

/**
 * Precios sombra y rangos de sensibilidad a partir de una solución óptima.
 *
 * El precio sombra de un recurso es lo que aumentaría la ganancia si se
 * consiguiera una unidad más de él. Sale de resolver el sistema dual: en el
 * vértice óptimo, el gradiente de la función objetivo es una combinación de las
 * normales de las restricciones activas, y los coeficientes de esa combinación
 * son exactamente los precios sombra.
 */
export function analizarSensibilidad(resultado: ResultadoGrafico): Resultado<ResultadoSensibilidad> {
  const d = resultado.datos;

  if (resultado.desenlace === 'infactible' || resultado.desenlace === 'no_acotada' || resultado.optimo === null) {
    return resultadoFallido([
      error(
        'LP_SIN_SENSIBILIDAD',
        resultado.desenlace === 'infactible'
          ? 'No hay análisis de sensibilidad posible: el problema es infactible, así que no existe una solución óptima que analizar.'
          : 'No hay análisis de sensibilidad posible: la región no está acotada y el objetivo crece sin límite. Primero hay que completar el modelo con la restricción que falta.',
      ),
    ]);
  }

  const filas = normalizar(d);
  const optimo = resultado.optimo.punto;

  // Dirección de mejora expresada como maximización: así el signo de los duales
  // es siempre el mismo y no hay que duplicar la lógica.
  const w: Punto =
    d.objetivo === 'maximizar' ? { x: d.coefX, y: d.coefY } : { x: -d.coefX, y: -d.coefY };
  const factorZ = d.objetivo === 'maximizar' ? 1 : -1;

  const holguraDe = (f: Normalizada): number => f.d - (f.n.x * optimo.x + f.n.y * optimo.y);
  const escalaDe = (f: Normalizada): number => Math.max(1, Math.abs(f.d));

  const activas = filas.filter((f) => Math.abs(holguraDe(f)) <= TOLERANCIA * escalaDe(f) * 10);

  // Se eligen dos normales independientes entre las activas para formar la base.
  let base: [Normalizada, Normalizada] | null = null;
  for (let i = 0; i < activas.length && base === null; i++) {
    for (let j = i + 1; j < activas.length && base === null; j++) {
      const det = activas[i]!.n.x * activas[j]!.n.y - activas[j]!.n.x * activas[i]!.n.y;
      if (Math.abs(det) > 1e-9) base = [activas[i]!, activas[j]!];
    }
  }

  if (base === null) {
    return resultadoFallido([
      error('LP_BASE_INCOMPLETA', 'No fue posible identificar dos restricciones independientes activas en el óptimo, así que no se pueden calcular los precios sombra.'),
    ]);
  }

  const [p, q] = base;
  const det = p.n.x * q.n.y - q.n.x * p.n.y;
  const degenerado = activas.length > 2;

  // Duales de las dos restricciones de la base: y_p · n_p + y_q · n_q = w.
  const yp = (w.x * q.n.y - q.n.x * w.y) / det;
  const yq = (p.n.x * w.y - w.x * p.n.y) / det;
  const dualDe = new Map<string, number>([
    [p.id, yp],
    [q.id, yq],
  ]);

  const diagnosticos: Diagnostico[] = [];

  if (degenerado) {
    diagnosticos.push(
      aviso(
        'LP_SENSIBILIDAD_DEGENERADA',
        `En el vértice óptimo hay ${activas.length} restricciones activas cuando bastan dos: el vértice es degenerado. ` +
          'Los precios sombra que se muestran corresponden a una de las bases posibles, pero no son únicos: ' +
          'aumentar el recurso puede rendir menos de lo que indica el número. Trátelos como una cota superior.',
      ),
    );
  }

  if (resultado.desenlace === 'multiples') {
    diagnosticos.push(
      nota(
        'LP_SENSIBILIDAD_MULTIPLE',
        'El problema tiene varias soluciones óptimas. El análisis se hace sobre el vértice mostrado; ' +
          'los precios sombra son válidos, pero el rango de optimalidad de algún coeficiente tiene amplitud cero, ' +
          'que es justamente lo que produce el empate.',
      ),
    );
  }

  // ── Precios sombra y rango de factibilidad de cada lado derecho ──
  const preciosSombra: PrecioSombra[] = [];

  for (const f of filas) {
    if (f.original === null) continue;

    const holguraCanonica = holguraDe(f);
    const esActiva = Math.abs(holguraCanonica) <= TOLERANCIA * escalaDe(f) * 10;
    const dual = dualDe.get(f.id) ?? 0;

    // ∂Z/∂c = dual × signo, corregido por el sentido del objetivo.
    const valor = factorZ * dual * f.signo;

    let rango: { min: number; max: number };

    if (!esActiva) {
      // El vértice no se mueve mientras la restricción siga sobrando.
      rango = { min: -holguraCanonica, max: Infinity };
    } else if (dualDe.has(f.id)) {
      // El vértice se desplaza a lo largo de la otra restricción de la base.
      const otra = f.id === p.id ? q : p;
      const detLocal = f.n.x * otra.n.y - otra.n.x * f.n.y;
      const u: Punto = { x: otra.n.y / detLocal, y: -otra.n.x / detLocal };

      rango = { min: -Infinity, max: Infinity };
      for (const k of filas) {
        if (k.id === f.id) continue;
        const proyeccion = k.n.x * u.x + k.n.y * u.y;
        const holguraK = holguraDe(k);

        if (k.igualdad) {
          if (Math.abs(proyeccion) > 1e-9) rango = intersectarIntervalos(rango, { min: 0, max: 0 });
          continue;
        }
        if (Math.abs(proyeccion) < 1e-12) continue;
        rango = intersectarIntervalos(rango, proyeccion > 0 ? { min: -Infinity, max: holguraK / proyeccion } : { min: holguraK / proyeccion, max: Infinity });
      }
    } else {
      // Activa pero fuera de la base elegida: solo ocurre en vértices degenerados.
      rango = { min: 0, max: 0 };
    }

    // De t (en la forma canónica) al lado derecho original.
    const desdeCanonico = Number.isFinite(rango.min) ? f.original.c + f.signo * rango.min : null;
    const hastaCanonico = Number.isFinite(rango.max) ? f.original.c + f.signo * rango.max : null;
    const rangoDesde = f.signo === 1 ? desdeCanonico : hastaCanonico;
    const rangoHasta = f.signo === 1 ? hastaCanonico : desdeCanonico;

    const holguraOriginal = f.original.relacion === '>=' ? -holguraCanonica : holguraCanonica;

    preciosSombra.push({
      restriccion: f.original,
      valor,
      activa: esActiva,
      holgura: holguraOriginal,
      rangoDesde,
      rangoHasta,
      lectura: lecturaPrecioSombra(d, f.original, valor, esActiva, holguraOriginal, rangoDesde, rangoHasta),
    });
  }

  // ── Rango de optimalidad de cada coeficiente de la función objetivo ──
  const rangoCoef = (variable: 'x' | 'y'): RangoCoeficiente => {
    const otroCoef = variable === 'x' ? d.coefY : d.coefX;
    const s = d.objetivo === 'maximizar' ? 1 : -1;

    // y_p y y_q como funciones lineales del coeficiente que se hace variar.
    const componentes: { alfa: number; beta: number; fila: Normalizada }[] =
      variable === 'x'
        ? [
            { alfa: (s * q.n.y) / det, beta: (-q.n.x * s * otroCoef) / det, fila: p },
            { alfa: (-s * p.n.y) / det, beta: (p.n.x * s * otroCoef) / det, fila: q },
          ]
        : [
            { alfa: (-q.n.x * s) / det, beta: (s * otroCoef * q.n.y) / det, fila: p },
            { alfa: (p.n.x * s) / det, beta: (-s * otroCoef * p.n.y) / det, fila: q },
          ];

    let rango = { min: -Infinity, max: Infinity };
    for (const c of componentes) {
      // Las igualdades admiten dual de cualquier signo: no restringen el rango.
      if (c.fila.igualdad) continue;
      rango = intersectarIntervalos(rango, rangoNoNegativo(c.alfa, c.beta));
    }

    return {
      variable,
      nombre: variable === 'x' ? d.nombreX : d.nombreY,
      valorActual: variable === 'x' ? d.coefX : d.coefY,
      desde: Number.isFinite(rango.min) ? rango.min : null,
      hasta: Number.isFinite(rango.max) ? rango.max : null,
    };
  };

  const rangosCoeficientes = [rangoCoef('x'), rangoCoef('y')];

  const conValor = preciosSombra.filter((x) => x.activa && Math.abs(x.valor) > 1e-9);
  const recursoMasValioso =
    conValor.length === 0 ? null : conValor.reduce((a, b) => (Math.abs(b.valor) > Math.abs(a.valor) ? b : a));

  const nulos = preciosSombra.filter((x) => !x.activa);
  if (nulos.length > 0) {
    diagnosticos.push(
      nota(
        'LP_PRECIO_SOMBRA_CERO',
        `${nulos.map((x) => `"${x.restriccion.nombre}"`).join(', ')} ${nulos.length === 1 ? 'tiene' : 'tienen'} precio sombra cero: ` +
          'conseguir más de ese recurso no mejora el resultado en nada, porque ya sobra. Es el error de inversión más común que este análisis evita.',
      ),
    );
  }

  return {
    datos: {
      preciosSombra,
      rangosCoeficientes,
      degenerado,
      multiplesOptimos: resultado.desenlace === 'multiples',
      recursoMasValioso,
    },
    pasos: pasosSensibilidad(d, resultado, preciosSombra, rangosCoeficientes, base),
    diagnosticos,
    interpretacion: interpretarSensibilidad(d, preciosSombra, rangosCoeficientes, recursoMasValioso, degenerado),
  };
}

/**
 * Decimales con que se muestra un precio sombra. El valor puede ser 0,3125 o
 * 950: cuatro decimales fijos serían ruido en el segundo caso y dos serían
 * redondeo destructivo en el primero.
 */
export function decimalesPrecio(valor: number): number {
  return Math.abs(valor) >= 10 ? 2 : 4;
}

function lecturaPrecioSombra(
  d: DatosGrafico,
  r: Restriccion,
  valor: number,
  activa: boolean,
  holgura: number,
  desde: number | null,
  hasta: number | null,
): string {
  if (!activa) {
    return (
      `Sobran ${formatearNumero(Math.abs(holgura), { decimales: 2 })} ${r.unidad}. Conseguir más no cambia el resultado: su precio sombra es cero. ` +
      (desde !== null
        ? `Solo empezaría a importar si la disponibilidad bajara de ${formatearNumero(desde, { decimales: 2 })} ${r.unidad}.`
        : '')
    );
  }

  const signo = valor >= 0 ? 'aumentaría' : 'disminuiría';
  const limite =
    hasta === null
      ? 'sin límite conocido hacia arriba'
      : `hasta ${formatearNumero(hasta, { decimales: 2 })} ${r.unidad}`;

  return (
    `Cada ${singular(r.unidad)} adicional ${signo} ${d.nombreObjetivo} en ` +
    `${formatearNumero(Math.abs(valor), { decimales: decimalesPrecio(valor) })} ${d.unidadObjetivo}. ` +
    `Ese valor se mantiene ${limite}${desde === null ? '' : ` y hacia abajo hasta ${formatearNumero(desde, { decimales: 2 })} ${r.unidad}`}. ` +
    `Pagar más de ${formatearNumero(Math.abs(valor), { decimales: 2 })} ${d.unidadObjetivo} por una unidad extra sería mal negocio.`
  );
}

function pasosSensibilidad(
  d: DatosGrafico,
  resultado: ResultadoGrafico,
  precios: readonly PrecioSombra[],
  rangos: readonly RangoCoeficiente[],
  base: readonly [Normalizada, Normalizada],
): readonly import('./tipos').Paso[] {
  const pasos = new ConstructorPasos();
  const u = d.unidadObjetivo;

  pasos.agregar({
    titulo: 'Identificar las restricciones activas en el óptimo',
    explicacion:
      'Solo las restricciones que se cumplen con igualdad limitan de verdad. Las demás sobran, y por eso conseguir más de ellas ' +
      'no puede mejorar el resultado. Este paso separa los cuellos de botella reales de la capacidad ociosa.',
    tabla: {
      encabezados: ['Restricción', 'Estado', `Holgura (${d.unidadVariables})`],
      filas: precios.map((s) => [
        s.restriccion.nombre,
        s.activa ? 'activa — se agota' : 'sobra',
        formatearNumero(s.holgura, { decimales: 2 }),
      ]),
      resaltadas: precios.map((s, i) => (s.activa ? i : -1)).filter((i) => i >= 0),
    },
  });

  pasos.agregar({
    titulo: 'Resolver el sistema dual',
    explicacion:
      `En el vértice óptimo el gradiente de la función objetivo apunta «hacia afuera» de la región, y se puede escribir como una ` +
      `combinación de las normales de las dos restricciones activas: ${base[0].nombre} y ${base[1].nombre}. ` +
      'Los coeficientes de esa combinación son los precios sombra. Dicho sin álgebra: miden cuánto vale aflojar cada restricción.',
    formula: `y_1 \\, n_1 + y_2 \\, n_2 = c`,
    tabla: {
      encabezados: ['Restricción de la base', 'Normal (coeficientes)', `Precio sombra (${u} por unidad)`],
      filas: base.map((f) => {
        const s = precios.find((x) => x.restriccion.id === f.id);
        return [
          f.nombre,
          `(${formatearNumero(Math.abs(f.n.x), { decimales: 2 })}; ${formatearNumero(Math.abs(f.n.y), { decimales: 2 })})`,
          s === undefined ? '—' : formatearNumero(s.valor, { decimales: decimalesPrecio(s.valor) }),
        ];
      }),
    },
  });

  pasos.agregar({
    titulo: 'Calcular el precio sombra de cada recurso',
    explicacion:
      'El precio sombra responde a la pregunta que de verdad interesa al gerente: ¿cuánto pagaría por una unidad más de este recurso? ' +
      'Un recurso que sobra vale cero. Un recurso agotado vale exactamente lo que su precio sombra indica, y ni un centavo más: ' +
      'pagar por encima de ese valor destruye margen.',
    formula: `y_i = \\frac{\\partial Z}{\\partial b_i}`,
    tabla: {
      encabezados: ['Recurso', `Disponible`, `Precio sombra (${u}/unidad)`, 'Qué significa'],
      filas: precios.map((s) => [
        s.restriccion.nombre,
        `${formatearNumero(s.restriccion.c, { decimales: 2 })} ${s.restriccion.unidad}`,
        formatearNumero(s.valor, { decimales: decimalesPrecio(s.valor) }),
        s.activa ? 'vale la pena conseguir más' : 'conseguir más no sirve de nada',
      ]),
      resaltadas: precios.map((s, i) => (s.activa ? i : -1)).filter((i) => i >= 0),
    },
  });

  pasos.agregar({
    titulo: 'Determinar el rango de factibilidad de cada lado derecho',
    explicacion:
      'El precio sombra no vale para siempre. A medida que se consigue más recurso, en algún punto otra restricción se vuelve el ' +
      'nuevo cuello de botella y el precio cambia. El rango indica entre qué valores del recurso disponible sigue siendo válido el ' +
      'número calculado: fuera de él hay que rehacer el análisis.',
    tabla: {
      encabezados: ['Recurso', 'Valor actual', 'Desde', 'Hasta', 'Margen de maniobra'],
      filas: precios.map((s) => [
        s.restriccion.nombre,
        formatearNumero(s.restriccion.c, { decimales: 2 }),
        s.rangoDesde === null ? 'sin límite' : formatearNumero(s.rangoDesde, { decimales: 2 }),
        s.rangoHasta === null ? 'sin límite' : formatearNumero(s.rangoHasta, { decimales: 2 }),
        s.rangoHasta === null
          ? 'puede crecer indefinidamente'
          : `puede crecer ${formatearNumero(s.rangoHasta - s.restriccion.c, { decimales: 2 })} ${s.restriccion.unidad}`,
      ]),
    },
  });

  pasos.agregar({
    titulo: 'Determinar el rango de optimalidad de los coeficientes',
    explicacion:
      'Los precios cambian. Esta tabla dice cuánto puede moverse el margen de cada producto antes de que convenga cambiar el plan ' +
      'de producción. Mientras el coeficiente se mantenga dentro del rango, el vértice óptimo sigue siendo el mismo —aunque el valor de Z cambie—; ' +
      'al salir del rango, el óptimo salta a otra esquina.',
    tabla: {
      encabezados: ['Coeficiente', 'Valor actual', 'Desde', 'Hasta'],
      filas: rangos.map((r) => [
        `Aporte por ${r.nombre}`,
        formatearNumero(r.valorActual, { decimales: 2 }),
        r.desde === null ? 'sin límite' : formatearNumero(r.desde, { decimales: 2 }),
        r.hasta === null ? 'sin límite' : formatearNumero(r.hasta, { decimales: 2 }),
      ]),
    },
    valor: resultado.valorOptimo ?? Number.NaN,
    unidad: u,
  });

  return pasos.listar();
}

function interpretarSensibilidad(
  d: DatosGrafico,
  precios: readonly PrecioSombra[],
  rangos: readonly RangoCoeficiente[],
  masValioso: PrecioSombra | null,
  degenerado: boolean,
): string {
  const partes: string[] = [];
  const u = d.unidadObjetivo;

  if (masValioso !== null) {
    partes.push(
      `El recurso más valioso es ${masValioso.restriccion.nombre.toLowerCase()}: cada unidad adicional aporta ` +
        `${formatearNumero(Math.abs(masValioso.valor), { decimales: 2 })} ${u}. ` +
        `Si consigue una unidad más por menos de esa cifra, gana; si le cuesta más, pierde. ` +
        'Ese número es el precio máximo que la empresa debería estar dispuesta a pagar.',
    );

    if (masValioso.rangoHasta !== null) {
      const margen = masValioso.rangoHasta - masValioso.restriccion.c;
      partes.push(
        `Ese precio se sostiene hasta ${formatearNumero(masValioso.rangoHasta, { decimales: 2 })} ${masValioso.restriccion.unidad}, ` +
          `es decir ${formatearNumero(margen, { decimales: 2 })} más que ahora. Más allá de ese punto otro recurso se convierte en el cuello de botella ` +
          'y hay que rehacer el análisis: seguir comprando el primero deja de rendir.',
      );
    }
  }

  const ociosos = precios.filter((x) => !x.activa);
  if (ociosos.length > 0) {
    partes.push(
      `${ociosos.map((x) => x.restriccion.nombre).join(' y ')} ${ociosos.length === 1 ? 'tiene' : 'tienen'} precio sombra cero. ` +
        'Invertir ahí no produce ninguna mejora, por más que parezca un recurso importante: mientras sobre, no limita nada.',
    );
  }

  const rx = rangos[0];
  const ry = rangos[1];
  if (rx !== undefined) {
    partes.push(
      `El plan de producción actual se sostiene mientras el aporte de ${rx.nombre} se mantenga entre ` +
        `${rx.desde === null ? 'cualquier valor bajo' : formatearNumero(rx.desde, { decimales: 2 })} y ` +
        `${rx.hasta === null ? 'cualquier valor alto' : formatearNumero(rx.hasta, { decimales: 2 })} ${u}` +
        (ry === undefined
          ? '.'
          : `, y el de ${ry.nombre} entre ${ry.desde === null ? 'cualquier valor bajo' : formatearNumero(ry.desde, { decimales: 2 })} y ` +
            `${ry.hasta === null ? 'cualquier valor alto' : formatearNumero(ry.hasta, { decimales: 2 })} ${u}.`) +
        ' Una variación de precios dentro de esos rangos cambia la ganancia, pero no la decisión de qué producir.',
    );
  }

  if (degenerado) {
    partes.push(
      'Advertencia: el vértice óptimo es degenerado, así que estos precios sombra son una de varias respuestas posibles. ' +
        'Antes de comprometer una inversión conviene verificar el efecto real aumentando el recurso en el laboratorio y observando cuánto sube Z.',
    );
  }

  return partes.join(' ');
}

// ───────────────────────────── Series para la gráfica ─────────────────────────────

export interface SegmentoRestriccion {
  readonly id: string;
  readonly nombre: string;
  readonly desde: Punto;
  readonly hasta: Punto;
  readonly relacion: Relacion;
  readonly activa: boolean;
}

/**
 * Recorta cada recta de restricción a la ventana de dibujo, para poder
 * trazarla completa aunque sus cortes con los ejes queden fuera de la vista.
 */
export function segmentosRestricciones(
  d: DatosGrafico,
  maxX: number,
  maxY: number,
  activas: readonly string[] = [],
): SegmentoRestriccion[] {
  const salida: SegmentoRestriccion[] = [];

  for (const r of d.restricciones) {
    const puntos: Punto[] = [];

    // Cortes con los cuatro bordes de la ventana.
    const enX0 = dividirSeguro(r.c, r.b);
    if (enX0 !== null && enX0 >= -1e-9 && enX0 <= maxY) puntos.push({ x: 0, y: enX0 });

    const enXMax = dividirSeguro(r.c - r.a * maxX, r.b);
    if (enXMax !== null && enXMax >= -1e-9 && enXMax <= maxY) puntos.push({ x: maxX, y: enXMax });

    const enY0 = dividirSeguro(r.c, r.a);
    if (enY0 !== null && enY0 >= -1e-9 && enY0 <= maxX) puntos.push({ x: enY0, y: 0 });

    const enYMax = dividirSeguro(r.c - r.b * maxY, r.a);
    if (enYMax !== null && enYMax >= -1e-9 && enYMax <= maxX) puntos.push({ x: enYMax, y: maxY });

    // Se toman los dos extremos más separados de los cortes hallados.
    if (puntos.length < 2) continue;
    let mejorPar: [Punto, Punto] = [puntos[0]!, puntos[1]!];
    let mayorDistancia = -1;
    for (let i = 0; i < puntos.length; i++) {
      for (let j = i + 1; j < puntos.length; j++) {
        const dist = Math.hypot(puntos[i]!.x - puntos[j]!.x, puntos[i]!.y - puntos[j]!.y);
        if (dist > mayorDistancia) {
          mayorDistancia = dist;
          mejorPar = [puntos[i]!, puntos[j]!];
        }
      }
    }

    salida.push({
      id: r.id,
      nombre: r.nombre,
      desde: mejorPar[0],
      hasta: mejorPar[1],
      relacion: r.relacion,
      activa: activas.includes(r.id),
    });
  }

  return salida;
}

/** Extremos de la línea de indiferencia para un valor dado de Z. */
export function lineaIndiferencia(d: DatosGrafico, z: number, maxX: number, maxY: number): [Punto, Punto] | null {
  const falsa: Restriccion = { id: 'iso', nombre: 'Z', a: d.coefX, b: d.coefY, relacion: '=', c: z, unidad: '' };
  const segmentos = segmentosRestricciones({ ...d, restricciones: [falsa] }, maxX, maxY);
  const s = segmentos[0];
  return s === undefined ? null : [s.desde, s.hasta];
}

/** Ventana de dibujo con un margen cómodo alrededor de la región factible. */
export function ventana(r: ResultadoGrafico): { maxX: number; maxY: number } {
  const puntos = r.vertices.map((v) => v.punto);
  const cortes = r.datos.restricciones.flatMap((c) => {
    const { conX, conY } = cortesConEjes(c);
    return [conX === null ? 0 : conX, conY === null ? 0 : conY].filter((v) => Number.isFinite(v) && v > 0);
  });

  const maxX = Math.max(1, ...puntos.map((p) => p.x), ...cortes);
  const maxY = Math.max(1, ...puntos.map((p) => p.y), ...cortes);
  const redondear = (v: number): number => {
    const paso = Math.pow(10, Math.floor(Math.log10(v))) / 2;
    return Math.ceil((v * 1.15) / paso) * paso;
  };

  return { maxX: redondear(maxX), maxY: redondear(maxY) };
}
