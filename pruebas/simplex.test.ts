/**
 * Pruebas del módulo 9 — método simplex.
 *
 * Tres fuentes de verdad independientes, ninguna de las cuales confía en el
 * algoritmo que verifica:
 *
 * 1. **El método gráfico.** Para dos variables, el simplex y la enumeración de
 *    vértices tienen que dar exactamente el mismo óptimo y exactamente los
 *    mismos precios sombra. Son dos algoritmos sin una línea de código en
 *    común, así que coincidir es una comprobación real.
 * 2. **Fuerza bruta sobre las bases.** Se enumeran todas las soluciones básicas
 *    factibles del sistema y se toma la mejor, que es la definición misma de
 *    óptimo. Sirve para los problemas de más de dos variables.
 * 3. **Propiedades invariantes.** Holgura complementaria, factibilidad,
 *    coincidencia entre la fila objetivo y Z sustituida.
 */

import { describe, expect, it } from 'vitest';

import {
  CERO,
  aNumero,
  comparar,
  desdeNumero,
  dividir,
  multiplicar,
  racional,
  sumar,
  texto,
  type Racional,
} from '@/nucleo/racional';
import {
  celdaM,
  compararM,
  desdeGrafico,
  esCeroM,
  resolverSimplex,
  resumenColumnas,
  valorM,
  type DatosSimplex,
  type RestriccionSimplex,
} from '@/nucleo/simplex';
import { analizarSensibilidad, resolverGrafico, type DatosGrafico } from '@/nucleo/grafico';
import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';
import { generarEjercicio } from '@/nucleo/generador';

// ───────────────────────────── Utilidades ─────────────────────────────

function modelo(
  objetivo: 'maximizar' | 'minimizar',
  nombres: readonly string[],
  coeficientes: readonly number[],
  restricciones: readonly RestriccionSimplex[],
): DatosSimplex {
  return {
    titulo: 'prueba',
    objetivo,
    variables: nombres.map((n, i) => ({ id: `v${i}`, nombre: n, coeficiente: coeficientes[i] ?? 0 })),
    unidadVariables: 'unidades',
    nombreObjetivo: 'el resultado',
    unidadObjetivo: '$',
    restricciones,
  };
}

function rest(id: string, nombre: string, coeficientes: number[], relacion: '<=' | '>=' | '=', c: number): RestriccionSimplex {
  return { id, nombre, coeficientes, relacion, c, unidad: 'unidades' };
}

/**
 * Óptimo por enumeración de todas las bases del sistema en forma estándar.
 * Es exponencial y solo sirve para problemas diminutos, pero no comparte nada
 * con el simplex: es una verdad independiente.
 */
function optimoPorFuerzaBruta(d: DatosSimplex): number | null {
  const n = d.variables.length;
  const m = d.restricciones.length;

  // Solo cubre el caso de todas las restricciones ≤ con lado derecho no
  // negativo, que es donde la forma estándar es inmediata.
  if (!d.restricciones.every((r) => r.relacion === '<=' && r.c >= 0)) {
    throw new Error('la fuerza bruta de esta prueba solo cubre restricciones ≤');
  }

  const total = n + m;
  const columnas: Racional[][] = [];
  for (let j = 0; j < total; j++) {
    columnas.push(
      d.restricciones.map((r, i) =>
        j < n ? (desdeNumero(r.coeficientes[j] ?? 0) ?? CERO) : i === j - n ? racional(1n) : CERO,
      ),
    );
  }
  const b = d.restricciones.map((r) => desdeNumero(r.c) ?? CERO);
  const costos = Array.from({ length: total }, (_, j) => (j < n ? (desdeNumero(d.variables[j]!.coeficiente) ?? CERO) : CERO));

  let mejor: Racional | null = null;

  const combinaciones = (inicio: number, elegidas: number[]): void => {
    if (elegidas.length === m) {
      // Resolver B x = b por eliminación gaussiana exacta.
      const A = b.map((_, i) => elegidas.map((j) => columnas[j]![i]!));
      const rhs = [...b];

      for (let col = 0; col < m; col++) {
        let piv = -1;
        for (let f = col; f < m; f++) {
          if (A[f]![col]!.n !== 0n) {
            piv = f;
            break;
          }
        }
        if (piv === -1) return; // base singular
        [A[col], A[piv]] = [A[piv]!, A[col]!];
        [rhs[col], rhs[piv]] = [rhs[piv]!, rhs[col]!];

        const p = A[col]![col]!;
        A[col] = A[col]!.map((v) => dividir(v, p)!);
        rhs[col] = dividir(rhs[col]!, p)!;

        for (let f = 0; f < m; f++) {
          if (f === col) continue;
          const factor = A[f]![col]!;
          if (factor.n === 0n) continue;
          A[f] = A[f]!.map((v, k) => sumar(v, multiplicar({ n: -factor.n, d: factor.d }, A[col]![k]!)));
          rhs[f] = sumar(rhs[f]!, multiplicar({ n: -factor.n, d: factor.d }, rhs[col]!));
        }
      }

      if (rhs.some((v) => v.n < 0n)) return; // básica no factible
      let z = CERO;
      elegidas.forEach((j, i) => {
        z = sumar(z, multiplicar(costos[j]!, rhs[i]!));
      });
      if (mejor === null) mejor = z;
      else if (d.objetivo === 'maximizar' ? comparar(z, mejor) > 0 : comparar(z, mejor) < 0) mejor = z;
      return;
    }
    for (let j = inicio; j < total; j++) combinaciones(j + 1, [...elegidas, j]);
  };

  combinaciones(0, []);
  return mejor === null ? null : aNumero(mejor);
}

// ───────────────────────────── Aritmética exacta ─────────────────────────────

describe('racional — aritmética exacta', () => {
  it('interpreta un decimal como la fracción que la persona escribió', () => {
    expect(texto(desdeNumero(0.1)!)).toBe('1/10');
    expect(texto(desdeNumero(1.5)!)).toBe('3/2');
    expect(texto(desdeNumero(-2.25)!)).toBe('−9/4');
    expect(texto(desdeNumero(7)!)).toBe('7');
    expect(texto(desdeNumero(1e-7)!)).toBe('1/10 000 000');
    expect(desdeNumero(Number.NaN)).toBeNull();
  });

  it('no acumula error donde el punto flotante sí lo hace', () => {
    // 0,1 + 0,2 en punto flotante no es 0,3; en racionales sí lo es.
    expect(0.1 + 0.2 === 0.3).toBe(false);
    const suma = sumar(desdeNumero(0.1)!, desdeNumero(0.2)!);
    expect(comparar(suma, desdeNumero(0.3)!)).toBe(0);
    expect(texto(suma)).toBe('3/10');
  });

  it('normaliza el signo y reduce la fracción', () => {
    expect(texto(racional(4n, -8n))).toBe('−1/2');
    expect(texto(racional(0n, 5n))).toBe('0');
    expect(() => racional(1n, 0n)).toThrow('Racional con denominador cero');
  });

  it('divide por cero devolviendo null en vez de un infinito silencioso', () => {
    expect(dividir(racional(3n), CERO)).toBeNull();
  });
});

// ───────────────────────────── Coincidencia con el método gráfico ─────────────────────────────

const MESAS_Y_SILLAS: DatosGrafico = {
  titulo: 'Fabricante de mesas y sillas',
  objetivo: 'maximizar',
  nombreX: 'mesas',
  nombreY: 'sillas',
  unidadVariables: 'unidades',
  coefX: 5,
  coefY: 5,
  nombreObjetivo: 'el margen de contribución',
  unidadObjetivo: '$',
  restricciones: [
    { id: 'material', nombre: 'Material', a: 12, b: 8, relacion: '<=', c: 96, unidad: 'unidades' },
    { id: 'mano_obra', nombre: 'Mano de obra', a: 6, b: 12, relacion: '<=', c: 72, unidad: 'horas' },
    { id: 'compromiso', nombre: 'Compromiso de mesas', a: 1, b: 0, relacion: '>=', c: 2, unidad: 'mesas' },
  ],
  noNegatividad: true,
};

const MAIZ_Y_FRIJOL: DatosGrafico = {
  titulo: 'Siembra de maíz y frijol',
  objetivo: 'maximizar',
  nombreX: 'maíz',
  nombreY: 'frijol',
  unidadVariables: 'manzanas',
  coefX: 3500,
  coefY: 5200,
  nombreObjetivo: 'el margen bruto',
  unidadObjetivo: 'L',
  restricciones: [
    { id: 'tierra', nombre: 'Tierra preparada', a: 1, b: 1, relacion: '<=', c: 20, unidad: 'manzanas' },
    { id: 'jornales', nombre: 'Mano de obra', a: 12, b: 20, relacion: '<=', c: 300, unidad: 'jornales' },
    { id: 'capital', nombre: 'Capital de trabajo', a: 900, b: 1500, relacion: '<=', c: 21000, unidad: 'lempiras' },
  ],
  noNegatividad: true,
};

function comoSimplex(g: DatosGrafico): DatosSimplex {
  return {
    titulo: g.titulo,
    unidadVariables: g.unidadVariables,
    nombreObjetivo: g.nombreObjetivo,
    unidadObjetivo: g.unidadObjetivo,
    ...desdeGrafico(g.objetivo, g.nombreX, g.nombreY, g.coefX, g.coefY, g.restricciones),
  };
}

describe('simplex — coincide con el método gráfico', () => {
  for (const g of [MESAS_Y_SILLAS, MAIZ_Y_FRIJOL]) {
    it(`resuelve "${g.titulo}" igual que la enumeración de vértices`, () => {
      const grafico = resolverGrafico(g).datos!;
      const s = resolverSimplex(comoSimplex(g)).datos!;

      expect(aNumero(s.valorOptimo!)).toBeCloseTo(grafico.valorOptimo!, 9);
      expect(aNumero(s.solucion[0]!.valor)).toBeCloseTo(grafico.optimo!.punto.x, 9);
      expect(aNumero(s.solucion[1]!.valor)).toBeCloseTo(grafico.optimo!.punto.y, 9);
      expect(s.desenlace).toBe('optima');
    });

    it(`obtiene los mismos precios sombra que el análisis de sensibilidad en "${g.titulo}"`, () => {
      const grafico = resolverGrafico(g).datos!;
      const sensibilidad = analizarSensibilidad(grafico).datos!;
      const s = resolverSimplex(comoSimplex(g)).datos!;

      for (const precio of sensibilidad.preciosSombra) {
        const enSimplex = s.holguras.find((h) => h.restriccion.id === precio.restriccion.id);
        expect(enSimplex, `falta ${precio.restriccion.id}`).toBeDefined();
        expect(aNumero(enSimplex!.precioSombra)).toBeCloseTo(precio.valor, 9);
      }
    });
  }

  it('da los precios sombra exactos de mesas y sillas: 5/16 y 5/24', () => {
    const s = resolverSimplex(comoSimplex(MESAS_Y_SILLAS)).datos!;
    const precio = (id: string): string => texto(s.holguras.find((h) => h.restriccion.id === id)!.precioSombra);

    expect(precio('material')).toBe('5/16');
    expect(precio('mano_obra')).toBe('5/24');
    expect(precio('compromiso')).toBe('0');
  });

  it('da los precios sombra exactos de maíz y frijol: 950 y 17/6', () => {
    const s = resolverSimplex(comoSimplex(MAIZ_Y_FRIJOL)).datos!;
    const precio = (id: string): string => texto(s.holguras.find((h) => h.restriccion.id === id)!.precioSombra);

    expect(precio('tierra')).toBe('950');
    expect(precio('capital')).toBe('17/6');
    expect(precio('jornales')).toBe('0');
  });
});

// ───────────────────────────── Más de dos variables ─────────────────────────────

describe('simplex — problemas que el método gráfico no puede resolver', () => {
  const TRES = modelo(
    'maximizar',
    ['queso fresco', 'cuajada', 'mantequilla'],
    [60, 45, 80],
    [
      rest('leche', 'Leche', [8, 6, 12], '<=', 480),
      rest('horas', 'Horas de proceso', [2, 1, 3], '<=', 100),
      rest('empaque', 'Empaque', [1, 1, 1], '<=', 60),
    ],
  );

  it('coincide con la enumeración exhaustiva de bases', () => {
    const s = resolverSimplex(TRES).datos!;
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(optimoPorFuerzaBruta(TRES)!, 9);
  });

  it('entrega una solución factible', () => {
    const s = resolverSimplex(TRES).datos!;
    for (const h of s.holguras) {
      expect(aNumero(h.holgura)).toBeGreaterThanOrEqual(-1e-12);
      expect(aNumero(h.consumo)).toBeLessThanOrEqual(h.restriccion.c + 1e-12);
    }
    for (const v of s.solucion) expect(aNumero(v.valor)).toBeGreaterThanOrEqual(0);
  });

  it('cumple la holgura complementaria: recurso que sobra, precio sombra cero', () => {
    // En TRES los tres recursos se agotan, así que la propiedad no se ejerce con
    // ese modelo: el filtro queda vacío y la prueba no afirmaría nada. Se le
    // agrega un cuarto recurso que por construcción no puede ser restrictivo,
    // porque el empaque ya limita queso + cuajada + mantequilla a 60 unidades.
    const conSobrante = {
      ...TRES,
      restricciones: [...TRES.restricciones, rest('bodega', 'Bodega', [1, 1, 1], '<=', 10_000)],
    };
    const s = resolverSimplex(conSobrante).datos!;

    // El óptimo no cambia: la restricción añadida no recorta nada.
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(aNumero(resolverSimplex(TRES).datos!.valorOptimo!), 9);

    const sobrantes = s.holguras.filter((h) => h.holgura.n !== 0n);
    expect(sobrantes.map((h) => h.restriccion.id)).toContain('bodega');
    for (const h of sobrantes) expect(texto(h.precioSombra), h.restriccion.id).toBe('0');
  });

  it('el valor de la fila objetivo coincide con Z sustituida', () => {
    const r = resolverSimplex(TRES);
    expect(r.diagnosticos.some((x) => x.codigo === 'SX_INCOHERENCIA')).toBe(false);
    expect(comparar(r.datos!.tableauFinal!.valor.a, r.datos!.valorOptimo!)).toBe(0);
  });

  it('resuelve un modelo de cinco variables sin fase 1', () => {
    const cinco = modelo(
      'maximizar',
      ['a', 'b', 'c', 'd', 'e'],
      [4, 6, 3, 7, 5],
      [
        rest('r1', 'Recurso 1', [2, 3, 1, 4, 2], '<=', 100),
        rest('r2', 'Recurso 2', [1, 1, 2, 2, 3], '<=', 80),
        rest('r3', 'Recurso 3', [3, 2, 1, 1, 1], '<=', 90),
      ],
    );
    const s = resolverSimplex(cinco).datos!;
    expect(s.necesitaArtificiales).toBe(false);
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(optimoPorFuerzaBruta(cinco)!, 9);
  });
});

// ───────────────────────────── Minimización y dos fases ─────────────────────────────

describe('simplex — minimización con dos fases', () => {
  const RACION = modelo(
    'minimizar',
    ['maíz molido', 'concentrado'],
    [2, 3],
    [
      rest('volumen', 'Volumen mínimo', [1, 1], '>=', 10),
      rest('minimo_maiz', 'Mínimo de maíz', [1, 0], '>=', 2),
      rest('minimo_conc', 'Mínimo de concentrado', [0, 1], '>=', 3),
    ],
  );

  it('encuentra el mínimo correcto', () => {
    const s = resolverSimplex(RACION).datos!;
    expect(s.necesitaArtificiales).toBe(true);
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(23, 9);
    expect(aNumero(s.solucion[0]!.valor)).toBeCloseTo(7, 9);
    expect(aNumero(s.solucion[1]!.valor)).toBeCloseTo(3, 9);
  });

  it('el precio sombra del volumen mínimo vale 2, el costo de la unidad más barata', () => {
    const s = resolverSimplex(RACION).datos!;
    expect(texto(s.holguras.find((h) => h.restriccion.id === 'volumen')!.precioSombra)).toBe('2');
  });

  it('el precio sombra coincide con volver a resolver con una unidad más', () => {
    const base = resolverSimplex(RACION).datos!;
    for (const h of base.holguras) {
      const movido = resolverSimplex({
        ...RACION,
        restricciones: RACION.restricciones.map((r) => (r.id === h.restriccion.id ? { ...r, c: r.c + 1 } : r)),
      }).datos!;
      const cambio = aNumero(movido.valorOptimo!) - aNumero(base.valorOptimo!);
      expect(cambio).toBeCloseTo(aNumero(h.precioSombra), 9);
    }
  });

  it('cuenta las variables de la forma estándar: dos de decisión, tres excesos, tres artificiales', () => {
    const s = resolverSimplex(RACION).datos!;
    expect(resumenColumnas(s.columnas)).toEqual({ decision: 2, holgura: 0, exceso: 3, artificial: 3 });
  });

  it('resuelve una igualdad con variable artificial', () => {
    const m = modelo(
      'minimizar',
      ['x', 'y'],
      [3, 5],
      [
        rest('mezcla', 'Mezcla exacta', [1, 1], '=', 12),
        rest('tope', 'Tope de y', [0, 1], '<=', 4),
      ],
    );
    const s = resolverSimplex(m).datos!;
    // Conviene usar lo más barato: x = 12 es imposible solo si y tuviera mínimo;
    // aquí y = 0 y x = 12 → Z = 36.
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(36, 9);
    expect(s.necesitaArtificiales).toBe(true);
  });
});

// ───────────────────────────── Desenlaces sin número ─────────────────────────────

describe('simplex — desenlaces que no terminan en un óptimo finito', () => {
  it('detecta la infactibilidad en la fase 1, no por un fallo numérico', () => {
    const m = modelo(
      'maximizar',
      ['x'],
      [1],
      [rest('minimo', 'Mínimo exigido', [1], '>=', 4), rest('tope', 'Tope disponible', [1], '<=', 2)],
    );
    const r = resolverSimplex(m);
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_INFACTIBLE')).toBe(true);
    expect(r.diagnosticos.find((d) => d.codigo === 'SX_INFACTIBLE')!.mensaje).toMatch(/no existe ningún punto/i);
  });

  it('detecta que el problema no está acotado y nombra la variable culpable', () => {
    const m = modelo('maximizar', ['x', 'y'], [1, 1], [rest('r1', 'Diferencia', [1, -1], '<=', 1)]);
    const r = resolverSimplex(m);
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_NO_ACOTADA')).toBe(true);
    expect(r.interpretacion).toMatch(/la restricción que falta/i);
  });

  it('reconoce los óptimos múltiples cuando el objetivo es paralelo a una restricción', () => {
    const m = modelo(
      'maximizar',
      ['x', 'y'],
      [2, 2],
      [rest('total', 'Capacidad total', [1, 1], '<=', 4), rest('tx', 'Tope de x', [1, 0], '<=', 3), rest('ty', 'Tope de y', [0, 1], '<=', 3)],
    );
    const s = resolverSimplex(m).datos!;
    expect(s.desenlace).toBe('multiples');
    expect(aNumero(s.valorOptimo!)).toBeCloseTo(8, 9);
    expect(s.alternativas.length).toBeGreaterThan(0);
  });

  it('no confunde una solución única con óptimos múltiples', () => {
    const s = resolverSimplex(comoSimplex(MAIZ_Y_FRIJOL)).datos!;
    expect(s.desenlace).toBe('optima');
    expect(s.alternativas).toEqual([]);
  });

  it('avisa de la degeneración sin dejar de resolver', () => {
    const m = modelo(
      'maximizar',
      ['x', 'y'],
      [3, 2],
      [rest('total', 'Total', [1, 1], '<=', 4), rest('tx', 'Tope de x', [1, 0], '<=', 2), rest('ty', 'Tope de y', [0, 1], '<=', 2)],
    );
    const r = resolverSimplex(m);
    expect(r.datos!.degenerado).toBe(true);
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_DEGENERADA')).toBe(true);
    expect(aNumero(r.datos!.valorOptimo!)).toBeCloseTo(10, 9);
  });

  it('retira una restricción redundante en vez de arrastrar una fila de ceros', () => {
    const m = modelo(
      'maximizar',
      ['x', 'y'],
      [1, 1],
      [rest('a', 'Mezcla', [1, 1], '=', 4), rest('b', 'La misma, al doble', [2, 2], '=', 8)],
    );
    const r = resolverSimplex(m);
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_RESTRICCION_REDUNDANTE')).toBe(true);
    expect(aNumero(r.datos!.valorOptimo!)).toBeCloseTo(4, 9);
  });
});

// ───────────────────────────── Normalización y validación ─────────────────────────────

describe('simplex — normalización de los datos', () => {
  it('multiplica por −1 la fila con lado derecho negativo e invierte la relación', () => {
    const m = modelo('maximizar', ['x', 'y'], [1, 1], [rest('r', 'Restricción invertida', [-1, -1], '>=', -10)]);
    const r = resolverSimplex(m);
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_FILA_NEGADA')).toBe(true);
    // −x − y ≥ −10 es exactamente x + y ≤ 10.
    expect(aNumero(r.datos!.valorOptimo!)).toBeCloseTo(10, 9);
    expect(r.datos!.necesitaArtificiales).toBe(false);
  });

  it('el precio sombra conserva el signo correcto tras negar la fila', () => {
    const negada = modelo('maximizar', ['x', 'y'], [3, 2], [rest('r', 'Invertida', [-1, -1], '>=', -10)]);
    const directa = modelo('maximizar', ['x', 'y'], [3, 2], [rest('r', 'Directa', [1, 1], '<=', 10)]);
    const a = resolverSimplex(negada).datos!;
    const b = resolverSimplex(directa).datos!;
    // El lado derecho de la forma escrita por el usuario es −10 en un caso y 10
    // en el otro, así que las derivadas tienen signos opuestos.
    expect(texto(a.holguras[0]!.precioSombra)).toBe('−3');
    expect(texto(b.holguras[0]!.precioSombra)).toBe('3');
  });

  it('rechaza un modelo con restricciones de longitud equivocada', () => {
    const m = modelo('maximizar', ['x', 'y'], [1, 1], [{ id: 'r', nombre: 'Corta', coeficientes: [1], relacion: '<=', c: 5, unidad: '' }]);
    const r = resolverSimplex(m);
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_DIMENSION')).toBe(true);
  });

  it('rechaza un modelo más grande de lo que un tableau puede mostrar', () => {
    const n = 14;
    const m = modelo(
      'maximizar',
      Array.from({ length: n }, (_, i) => `v${i}`),
      Array.from({ length: n }, () => 1),
      [rest('r', 'Única', Array.from({ length: n }, () => 1), '<=', 10)],
    );
    const r = resolverSimplex(m);
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_DEMASIADO_GRANDE')).toBe(true);
  });

  it('rechaza una función objetivo idénticamente nula', () => {
    const m = modelo('maximizar', ['x'], [0], [rest('r', 'Tope', [1], '<=', 5)]);
    expect(resolverSimplex(m).diagnosticos.some((d) => d.codigo === 'SX_OBJETIVO_NULO')).toBe(true);
  });
});

// ───────────────────────────── Procedimiento mostrado ─────────────────────────────

describe('simplex — el procedimiento que se muestra', () => {
  it('produce un paso por iteración, más el planteamiento y la lectura final', () => {
    const r = resolverSimplex(comoSimplex(MAIZ_Y_FRIJOL));
    const titulos = r.pasos.map((p) => p.titulo);

    expect(titulos[0]).toBe('Formular el modelo');
    expect(titulos).toContain('Llevar el modelo a la forma estándar');
    expect(titulos).toContain('Construir el tableau inicial');
    expect(titulos).toContain('Leer la solución en el tableau final');
    expect(titulos).toContain('Leer los precios sombra en la fila objetivo');
    expect(titulos.filter((t) => t.startsWith('Iteración')).length).toBe(r.datos!.iteracionesFase2);
  });

  it('el procedimiento con dos fases explica ambas', () => {
    const r = resolverSimplex(comoSimplex(MESAS_Y_SILLAS));
    const titulos = r.pasos.map((p) => p.titulo);
    expect(titulos).toContain('Fase 1 — construir una solución factible');
    expect(titulos).toContain('Fin de la fase 1 — la base ya es factible');
    expect(titulos.some((t) => t.startsWith('Fase 1 · iteración'))).toBe(true);
  });

  it('cada tableau tiene una columna por variable, más base y solución', () => {
    const r = resolverSimplex(comoSimplex(MAIZ_Y_FRIJOL));
    const s = r.datos!;
    const paso = r.pasos.find((p) => p.titulo === 'Construir el tableau inicial')!;
    expect(paso.tabla!.encabezados).toHaveLength(s.columnas.length + 2);
    expect(paso.tabla!.filas).toHaveLength(3);
    expect(paso.tabla!.pie).toHaveLength(s.columnas.length + 2);
  });

  it('muestra fracciones exactas por omisión y decimales cuando se pide', () => {
    const fraccion = resolverSimplex(comoSimplex(MESAS_Y_SILLAS));
    const decimal = resolverSimplex(comoSimplex(MESAS_Y_SILLAS), { notacion: 'decimal' });

    const filaZ = (r: typeof fraccion): string =>
      r.pasos.find((p) => p.titulo === 'Leer la solución en el tableau final')!.tabla!.pie!.join(' ');

    expect(filaZ(fraccion)).toContain('5/16');
    expect(filaZ(decimal)).toContain('0,3125');
    expect(filaZ(decimal)).not.toContain('5/16');
  });

  it('la interpretación nombra el recurso agotado y el que sobra', () => {
    const r = resolverSimplex(comoSimplex(MAIZ_Y_FRIJOL));
    expect(r.interpretacion).toMatch(/tierra preparada/i);
    expect(r.interpretacion).toMatch(/sobra capacidad/i);
    expect(r.interpretacion).toMatch(/precio sombra/i);
  });
});

// ───────────────────────────── Los ejercicios de la biblioteca ─────────────────────────────

describe('simplex — los ocho ejercicios del módulo 9', () => {
  const delTema = BIBLIOTECA_INICIAL.filter((e) => e.tema === 'simplex');
  const datosDe = (e: (typeof delTema)[number]): DatosSimplex => ({
    ...(e.datos as Extract<(typeof e)['datos'], { tipo: 'simplex' }>),
    titulo: e.titulo,
  });

  it('están todos y ninguno se presenta como transcrito de los materiales', () => {
    expect(delTema).toHaveLength(8);
    // El simplex no figura en ningún material del curso (I-11): fingir una
    // fuente documental sería inventar bibliografía.
    for (const e of delTema) {
      expect(e.origen).toBe('derivado');
      expect(e.fuenteId).toBeNull();
      expect(e.inconsistencias).toContain('I-11');
    }
  });

  it('el ejemplo resuelto agota los tres recursos sin degeneración', () => {
    const s = resolverSimplex(datosDe(delTema.find((e) => e.id === 'simp-01')!)).datos!;
    expect(s.degenerado).toBe(false);
    expect(s.desenlace).toBe('optima');
    expect(s.solucion.map((x) => texto(x.valor))).toEqual(['25', '30', '15']);
    expect(aNumero(s.valorOptimo!)).toBe(4470);
    expect(s.holguras.map((h) => texto(h.precioSombra))).toEqual(['5', '10', '6']);
  });

  it('simp-02 da el mismo vértice y los mismos precios sombra que el módulo 8', () => {
    const porSimplex = resolverSimplex(datosDe(delTema.find((e) => e.id === 'simp-02')!)).datos!;
    const porGrafico = resolverGrafico(MESAS_Y_SILLAS).datos!;

    expect(aNumero(porSimplex.valorOptimo!)).toBeCloseTo(porGrafico.valorOptimo!, 9);
    expect(aNumero(porSimplex.solucion[0]!.valor)).toBeCloseTo(porGrafico.optimo!.punto.x, 9);
    expect(porSimplex.necesitaArtificiales).toBe(true);
  });

  it('la ración de mínimo costo usa los tres tipos de restricción y cumple los topes', () => {
    const e = delTema.find((x) => x.id === 'simp-04')!;
    const d = datosDe(e);
    const s = resolverSimplex(d).datos!;

    expect(new Set(d.restricciones.map((r) => r.relacion))).toEqual(new Set(['=', '>=', '<=']));
    expect(s.necesitaArtificiales).toBe(true);
    // La mezcla suma exactamente 100 kg y cumple la proteína mínima.
    expect(aNumero(s.holguras.find((h) => h.restriccion.id === 'total')!.consumo)).toBeCloseTo(100, 9);
    expect(aNumero(s.holguras.find((h) => h.restriccion.id === 'proteina')!.consumo)).toBeGreaterThanOrEqual(20 - 1e-9);
  });

  it('simp-05 es infactible y simp-06 no está acotado, y por eso no tienen preguntas numéricas', () => {
    for (const [id, codigo] of [
      ['simp-05', 'SX_INFACTIBLE'],
      ['simp-06', 'SX_NO_ACOTADA'],
    ] as const) {
      const r = resolverSimplex(datosDe(delTema.find((e) => e.id === id)!));
      expect(r.datos, id).toBeNull();
      expect(r.diagnosticos.some((x) => x.codigo === codigo), id).toBe(true);

      const e = delTema.find((x) => x.id === id)!;
      expect(e.preguntas.some((p) => p.tipo === 'numerica'), id).toBe(false);
    }
  });

  it('simp-07 tiene óptimos múltiples', () => {
    const s = resolverSimplex(datosDe(delTema.find((e) => e.id === 'simp-07')!)).datos!;
    expect(s.desenlace).toBe('multiples');
    expect(aNumero(s.valorOptimo!)).toBe(480000);
  });

  it('cada respuesta guardada coincide con lo que calcula el motor', () => {
    for (const e of delTema) {
      const s = resolverSimplex(datosDe(e)).datos;
      if (s === null) continue;
      const z = e.preguntas.find((p) => p.claveVerificacion === 'simplex.valorOptimo');
      expect(z, e.id).toBeDefined();
      expect(z!.respuesta, e.id).toBeCloseTo(aNumero(s.valorOptimo!), 6);

      const columnas = e.preguntas.find((p) => p.claveVerificacion === 'simplex.columnas');
      expect(columnas!.respuesta, e.id).toBe(s.columnas.length);
    }
  });
});

// ───────────────────────────── Retroalimentación ─────────────────────────────

describe('simplex — errores típicos que el motor reconoce', () => {
  const ejercicio = BIBLIOTECA_INICIAL.find((e) => e.id === 'simp-01')!;
  const pregunta = (clave: string) => ejercicio.preguntas.find((p) => p.claveVerificacion === clave)!;
  const s = resolverSimplex({
    ...(ejercicio.datos as Extract<(typeof ejercicio)['datos'], { tipo: 'simplex' }>),
    titulo: ejercicio.titulo,
  }).datos!;

  it('reconoce que se contaron solo las variables de decisión', () => {
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.columnas'), 3);
    expect(r.codigoError).toBe('SIMPLEX_SOLO_DECISION');
    expect(r.mensaje).toMatch(/una variable por cada restricción/i);
  });

  it('reconoce que el estudiante se detuvo en un tableau intermedio', () => {
    const intermedia = s.iteraciones.find((it) => it.fase === 2 && it.numero > 1 && it.entra !== null)!;
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.valorOptimo'), aNumero(intermedia.tableau.valor.a));
    expect(r.codigoError).toBe('SIMPLEX_TABLEAU_INTERMEDIO');
    expect(r.mensaje).toMatch(/no termina cuando la solución ya parece razonable/i);
  });

  it('reconoce el precio sombra de otra restricción', () => {
    const p = pregunta('simplex.precioSombra');
    const otra = s.holguras.find((h) => Math.abs(aNumero(h.precioSombra) - (p.respuesta as number)) > 1e-9)!;
    const r = evaluarRespuesta(ejercicio, p, aNumero(otra.precioSombra));
    expect(r.codigoError).toBe('SIMPLEX_PRECIO_OTRA_RESTRICCION');
    expect(r.mensaje).toContain(otra.restriccion.nombre);
  });

  it('reconoce que se leyó el lado derecho de la fila equivocada', () => {
    const p = ejercicio.preguntas.find((x) => x.claveVerificacion === 'simplex.variable')!;
    const otra = s.solucion.find((x) => Math.abs(aNumero(x.valor) - (p.respuesta as number)) > 1e-9)!;
    const r = evaluarRespuesta(ejercicio, p, aNumero(otra.valor));
    expect(r.codigoError).toBe('SIMPLEX_FILA_EQUIVOCADA');
    expect(r.mensaje).toMatch(/columna «Base»/);
  });

  it('acepta la respuesta correcta sin inventar un error', () => {
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.valorOptimo'), aNumero(s.valorOptimo!));
    expect(r.correcta).toBe(true);
    expect(r.codigoError).toBeNull();
  });
});

// ───────────────────────────── Generador ─────────────────────────────

describe('simplex — el generador verifica antes de publicar', () => {
  it('produce modelos con solución única, sin degeneración y con la respuesta prevista', () => {
    for (const dificultad of ['basico', 'intermedio', 'avanzado'] as const) {
      for (const semilla of [11, 202, 3003, 40404]) {
        const g = generarEjercicio({ tema: 'simplex', dificultad, semilla, contexto: 'lacteos' });
        const fallos = g.verificaciones.filter((v) => !v.paso).map((v) => v.nombre).join(', ');
        expect(g.ejercicio, `${dificultad}/${semilla}: ${fallos}`).not.toBeNull();
        expect(g.verificaciones.every((v) => v.paso)).toBe(true);

        const d = g.ejercicio!.datos as Extract<NonNullable<typeof g.ejercicio>['datos'], { tipo: 'simplex' }>;
        const s = resolverSimplex({ ...d, titulo: g.ejercicio!.titulo }).datos!;

        expect(s.desenlace).toBe('optima');
        expect(s.degenerado).toBe(false);
        // Por construcción, todos los recursos se agotan en el plan óptimo.
        expect(s.holguras.every((h) => h.activa)).toBe(true);
        expect(s.solucion.every((x) => aNumero(x.valor) > 0)).toBe(true);
      }
    }
  });

  it('la misma semilla produce el mismo ejercicio', () => {
    const a = generarEjercicio({ tema: 'simplex', semilla: 909 });
    const b = generarEjercicio({ tema: 'simplex', semilla: 909 });
    expect(a.ejercicio?.enunciado).toBe(b.ejercicio?.enunciado);
  });

  it('el nivel avanzado usa cuatro variables y el básico tres', () => {
    const cuenta = (dificultad: 'basico' | 'avanzado'): number => {
      const g = generarEjercicio({ tema: 'simplex', dificultad, semilla: 5 });
      const d = g.ejercicio!.datos as Extract<NonNullable<typeof g.ejercicio>['datos'], { tipo: 'simplex' }>;
      return d.variables.length;
    };
    expect(cuenta('basico')).toBe(3);
    expect(cuenta('avanzado')).toBe(4);
  });
});

// ───────────────────────────── Aritmética con la constante M ─────────────────────────────

describe('la constante M como símbolo, no como número grande', () => {
  const m = (a: number, b: number) => valorM(desdeNumero(a)!, desdeNumero(b)!);

  it('manda el coeficiente de M y solo al empatar se mira la parte constante', () => {
    // −3 − 2M es más negativo que −10 − M por mucho que 10 > 3: M domina.
    expect(compararM(m(-3, -2), m(-10, -1))).toBe(-1);
    expect(compararM(m(-3, -1), m(-10, -1))).toBe(1);
    expect(compararM(m(5, 0), m(5, 0))).toBe(0);
    // Cualquier término en M supera a cualquier constante.
    expect(compararM(m(-1000000, 1), m(1000000, 0))).toBe(1);
  });

  it('se escribe como en la pizarra', () => {
    expect(celdaM(m(-5, -1), 'fraccion')).toBe('−5 − M');
    expect(celdaM(m(0, 1), 'fraccion')).toBe('M');
    expect(celdaM(m(0, -2), 'fraccion')).toBe('−2M');
    expect(celdaM(m(2.5, 1), 'fraccion')).toBe('5/2 + M');
    expect(celdaM(m(45, 0), 'fraccion')).toBe('45');
    expect(celdaM(m(2.5, 1), 'decimal')).toBe('2,5000 + M');
  });

  it('el cero simbólico exige que las dos partes sean cero', () => {
    expect(esCeroM(m(0, 0))).toBe(true);
    expect(esCeroM(m(0, 1))).toBe(false);
    expect(esCeroM(m(3, 0))).toBe(false);
  });
});

// ───────────────────────────── Los dos métodos coinciden ─────────────────────────────

describe('simplex — la Gran M llega al mismo sitio que las dos fases', () => {
  for (const e of BIBLIOTECA_INICIAL.filter((x) => x.tema === 'simplex')) {
    it(`coincide en "${e.titulo}"`, () => {
      const d: DatosSimplex = { ...(e.datos as Extract<(typeof e)['datos'], { tipo: 'simplex' }>), titulo: e.titulo };
      const fases = resolverSimplex(d, { metodo: 'dos_fases' });
      const granM = resolverSimplex(d, { metodo: 'gran_m' });

      // Los desenlaces sin número también tienen que coincidir: los dos
      // métodos deben declarar infactible lo mismo y no acotado lo mismo.
      const errores = (r: typeof fases): string[] =>
        r.diagnosticos.filter((x) => x.gravedad === 'error').map((x) => x.codigo).sort();
      expect(errores(granM)).toEqual(errores(fases));

      if (fases.datos === null) {
        expect(granM.datos).toBeNull();
        return;
      }

      expect(granM.datos).not.toBeNull();
      expect(granM.datos!.desenlace).toBe(fases.datos.desenlace);
      expect(granM.datos!.solucion.map((x) => texto(x.valor))).toEqual(fases.datos.solucion.map((x) => texto(x.valor)));
      expect(texto(granM.datos!.valorOptimo!)).toBe(texto(fases.datos.valorOptimo!));
      expect(granM.datos!.holguras.map((h) => texto(h.precioSombra))).toEqual(
        fases.datos.holguras.map((h) => texto(h.precioSombra)),
      );
    });
  }

  it('sin artificiales los dos métodos son el mismo procedimiento', () => {
    const d = comoSimplex(MAIZ_Y_FRIJOL);
    const fases = resolverSimplex(d, { metodo: 'dos_fases' }).datos!;
    const granM = resolverSimplex(d, { metodo: 'gran_m' }).datos!;

    expect(fases.necesitaArtificiales).toBe(false);
    expect(granM.iteracionesFase2).toBe(fases.iteracionesFase2);
    expect(granM.iteracionesFase1).toBe(0);
  });

  it('la Gran M resuelve de corrido lo que las dos fases parten en dos', () => {
    const d = comoSimplex(MESAS_Y_SILLAS);
    const fases = resolverSimplex(d, { metodo: 'dos_fases' }).datos!;
    const granM = resolverSimplex(d, { metodo: 'gran_m' }).datos!;

    expect(fases.necesitaArtificiales).toBe(true);
    expect(fases.iteracionesFase1).toBeGreaterThan(0);
    expect(granM.iteracionesFase1).toBe(0);
    expect(granM.metodo).toBe('gran_m');
    // Mismo trabajo total: la Gran M no es más rápida, solo lo hace de corrido.
    expect(granM.iteracionesFase2).toBe(fases.iteracionesFase1 + fases.iteracionesFase2);
  });
});

// ───────────────────────────── El procedimiento de la Gran M ─────────────────────────────

describe('simplex — el procedimiento que muestra la Gran M', () => {
  const porGranM = (g: DatosGrafico) => resolverSimplex(comoSimplex(g), { metodo: 'gran_m' });

  it('penaliza la artificial en la propia función objetivo, sin problema auxiliar', () => {
    const r = porGranM(MESAS_Y_SILLAS);
    const titulos = r.pasos.map((p) => p.titulo);

    expect(titulos).toContain('Penalizar las variables artificiales con la constante M');
    expect(titulos).toContain('Retirar la penalización M');
    // No hay fase 1: ese es justamente el punto del método.
    expect(titulos.some((t) => t.includes('Fase 1'))).toBe(false);

    const penalizar = r.pasos.find((p) => p.titulo === 'Penalizar las variables artificiales con la constante M')!;
    expect(penalizar.formula).toContain('- M');
    expect(penalizar.formula).toContain('a_{3}');
  });

  it('el tableau inicial lleva la M en la fila objetivo y en el valor', () => {
    const r = porGranM(MESAS_Y_SILLAS);
    const pie = r.pasos.find((p) => p.titulo === 'Penalizar las variables artificiales con la constante M')!.tabla!.pie!;

    // z − c de la columna que entra: −5 − M; el valor de arranque: −2M.
    expect(pie).toContain('−5 − M');
    expect(pie).toContain('−2M');
  });

  it('elige la columna cuyo término en M es más negativo, no la de mayor constante', () => {
    const r = porGranM(MESAS_Y_SILLAS);
    const primera = r.pasos.find((p) => p.titulo.startsWith('Iteración 1'))!;

    // Compite −5 − M contra −5: gana la primera por el término en M, aunque la
    // parte constante empate.
    expect(primera.titulo).toBe('Iteración 1 — entra x1, sale a3');
    expect(primera.explicacion).toContain('−5 − M');
  });

  it('al terminar, la fila objetivo ya no tiene términos en M', () => {
    const r = porGranM(MESAS_Y_SILLAS);
    const final = r.pasos.find((p) => p.titulo === 'Leer la solución en el tableau final')!;

    expect(final.tabla!.pie!.some((c) => c.includes('M'))).toBe(false);
    expect(final.tabla!.pie).toContain('5/16');
    expect(r.datos!.tableauFinal!.valor.b.n).toBe(0n);
  });

  it('detecta la infactibilidad por la artificial que sobrevive, no por una fase aparte', () => {
    const m = modelo(
      'maximizar',
      ['x'],
      [1],
      [rest('minimo', 'Mínimo exigido', [1], '>=', 4), rest('tope', 'Tope disponible', [1], '<=', 2)],
    );
    const r = resolverSimplex(m, { metodo: 'gran_m' });

    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'SX_INFACTIBLE')).toBe(true);
    expect(r.diagnosticos.find((d) => d.codigo === 'SX_INFACTIBLE')!.mensaje).toMatch(/todavía en la base/i);
    expect(r.pasos.map((p) => p.titulo)).toContain('Comprobar la factibilidad');
  });

  it('una artificial que sale de la base no vuelve a entrar', () => {
    const s = porGranM(MESAS_Y_SILLAS).datos!;
    const artificial = s.columnas.find((c) => c.tipo === 'artificial')!;
    expect(s.iteraciones.filter((it) => it.entra === artificial.indice)).toHaveLength(0);
  });
});

// ───────────────────────────── Dual simplex ─────────────────────────────

describe('simplex — el dual simplex resuelve sin variables artificiales', () => {
  const MEZCLA = BIBLIOTECA_INICIAL.find((e) => e.id === 'simp-08')!;
  const datosMezcla: DatosSimplex = {
    ...(MEZCLA.datos as Extract<(typeof MEZCLA)['datos'], { tipo: 'simplex' }>),
    titulo: MEZCLA.titulo,
  };

  it('llega al mismo óptimo que los otros dos métodos', () => {
    const dual = resolverSimplex(datosMezcla, { metodo: 'dual' }).datos!;
    const fases = resolverSimplex(datosMezcla, { metodo: 'dos_fases' }).datos!;
    const granM = resolverSimplex(datosMezcla, { metodo: 'gran_m' }).datos!;

    for (const otro of [fases, granM]) {
      expect(texto(dual.valorOptimo!)).toBe(texto(otro.valorOptimo!));
      expect(dual.solucion.map((x) => texto(x.valor))).toEqual(otro.solucion.map((x) => texto(x.valor)));
      expect(dual.holguras.map((h) => texto(h.precioSombra))).toEqual(otro.holguras.map((h) => texto(h.precioSombra)));
    }
  });

  it('no agrega ni una sola columna artificial ni de exceso', () => {
    const dual = resolverSimplex(datosMezcla, { metodo: 'dual' }).datos!;
    const fases = resolverSimplex(datosMezcla, { metodo: 'dos_fases' }).datos!;

    expect(resumenColumnas(dual.columnas)).toEqual({ decision: 3, holgura: 3, exceso: 0, artificial: 0 });
    expect(resumenColumnas(fases.columnas)).toEqual({ decision: 3, holgura: 1, exceso: 2, artificial: 2 });
    // Ese es todo el argumento del método: un tableau más corto.
    expect(dual.columnas.length).toBeLessThan(fases.columnas.length);
    expect(dual.necesitaArtificiales).toBe(false);
  });

  it('arranca de una base infactible pero ya óptima', () => {
    const r = resolverSimplex(datosMezcla, { metodo: 'dual' });
    const inicial = r.pasos.find((p) => p.titulo.startsWith('Comprobar que la base de holguras'))!;

    // Dos lados derechos negativos: las dos exigencias mínimas sin cumplir.
    expect(inicial.tabla!.filas.filter((f) => f[f.length - 1]!.startsWith('−'))).toHaveLength(2);
    // Y ninguna columna mejora Z: al minimizar, la optimalidad pide z − c ≤ 0.
    const filaZ = inicial.tabla!.pie!.slice(1, -1);
    expect(filaZ.every((c) => c === '0' || c.startsWith('−'))).toBe(true);
  });

  it('elige primero la fila más negativa y después la columna de menor razón dual', () => {
    const r = resolverSimplex(datosMezcla, { metodo: 'dual' });
    const primera = r.pasos.find((p) => p.titulo.startsWith('Iteración 1'))!;

    // b = (−20, −90, 8): la fila del volumen es la más negativa.
    expect(primera.titulo).toBe('Iteración 1 — sale h2, entra x1');
    expect(primera.explicacion).toContain('−90');
    // Razones |(z−c)/a| = 8, 16, 26: gana el maíz.
    expect(primera.tabla!.pieAdicional).toEqual(['Razón dual', '8', '16', '26', '—', '—', '—', '']);
  });

  it('termina cuando ningún lado derecho es negativo', () => {
    const s = resolverSimplex(datosMezcla, { metodo: 'dual' }).datos!;
    for (const v of s.valores) expect(aNumero(v.valor)).toBeGreaterThanOrEqual(0);
    expect(s.desenlace).toBe('optima');
    expect(s.iteracionesFase1).toBe(0);
  });

  it('detecta la infactibilidad señalando la restricción que la produce', () => {
    // Exige 10 kg de un producto del que solo se pueden hacer 4.
    const m = modelo(
      'minimizar',
      ['x'],
      [5],
      [rest('minimo', 'Entrega comprometida', [1], '>=', 10), rest('capacidad', 'Capacidad de planta', [1], '<=', 4)],
    );
    const r = resolverSimplex(m, { metodo: 'dual' });

    expect(r.datos).toBeNull();
    const fallo = r.diagnosticos.find((d) => d.codigo === 'SX_INFACTIBLE')!;
    expect(fallo).toBeDefined();
    // Ventaja del dual: nombra la fila que demuestra la contradicción. Tras el
    // primer pivote la entrega ya se cumple y es la capacidad la que queda
    // imposible, así que es esa fila —una combinación de las dos— la que se cita.
    expect(fallo.mensaje).toContain('Capacidad de planta');
    expect(fallo.mensaje).toMatch(/combinación de todas/);
    expect(fallo.referencia).toBe('capacidad');
  });
});

describe('simplex — cuándo el dual simplex no aplica', () => {
  it('rechaza la maximización con márgenes positivos y explica por qué', () => {
    const r = resolverSimplex(comoSimplex(MESAS_Y_SILLAS), { metodo: 'dual' });

    expect(r.datos).toBeNull();
    const fallo = r.diagnosticos.find((d) => d.codigo === 'SX_DUAL_NO_APLICA')!;
    expect(fallo).toBeDefined();
    expect(fallo.mensaje).toContain('mesas');
    expect(fallo.mensaje).toMatch(/dos fases o la Gran M/);
    // No deja la pantalla vacía: el modelo se sigue mostrando.
    expect(r.pasos.map((p) => p.titulo)).toEqual(['Formular el modelo']);
  });

  it('rechaza las igualdades y propone la reescritura', () => {
    const conIgualdad = BIBLIOTECA_INICIAL.find((e) => e.id === 'simp-04')!;
    const d: DatosSimplex = {
      ...(conIgualdad.datos as Extract<(typeof conIgualdad)['datos'], { tipo: 'simplex' }>),
      titulo: conIgualdad.titulo,
    };
    const r = resolverSimplex(d, { metodo: 'dual' });

    expect(r.datos).toBeNull();
    const fallo = r.diagnosticos.find((x) => x.codigo === 'SX_DUAL_CON_IGUALDAD')!;
    expect(fallo).toBeDefined();
    expect(fallo.mensaje).toMatch(/dos desigualdades/);
  });

  it('los otros dos métodos sí resuelven lo que el dual rechaza', () => {
    for (const metodo of ['dos_fases', 'gran_m'] as const) {
      const r = resolverSimplex(comoSimplex(MESAS_Y_SILLAS), { metodo });
      expect(r.datos, metodo).not.toBeNull();
      expect(aNumero(r.datos!.valorOptimo!)).toBeCloseTo(45, 9);
    }
  });
});
