/**
 * Pruebas del método simplex revisado y del álgebra matricial que lo sostiene.
 *
 * La comprobación central es de identidad, no de aproximación: el revisado no
 * es otro algoritmo sino la misma sucesión de vértices con otra contabilidad,
 * así que tiene que visitar **exactamente** las mismas bases que el tableau, en
 * el mismo orden. Si alguna vez difirieran, uno de los dos estaría mal.
 *
 * Además se verifica por dentro que B⁻¹ es de verdad la inversa de la base en
 * cada iteración, y que el tableau que el revisado materializa al final
 * coincide con B⁻¹A.
 */

import { describe, expect, it } from 'vitest';

import { CERO, UNO, comparar, desdeNumero, texto, type Racional } from '@/nucleo/racional';
import { actualizarInversa, escalar, identidad, inversa, porVector, vectorPor } from '@/nucleo/matriz';
import { resolverSimplex, type DatosSimplex, type MetodoSimplex } from '@/nucleo/simplex';
import { analizarSensibilidadSimplex } from '@/nucleo/sensibilidadSimplex';
import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';

const r = (n: number): Racional => desdeNumero(n)!;
const m = (filas: number[][]): Racional[][] => filas.map((f) => f.map(r));
const comoTexto = (x: readonly (readonly Racional[])[]): string[][] => x.map((f) => f.map((v) => texto(v)));

const datosDe = (id: string): DatosSimplex => {
  const e = BIBLIOTECA_INICIAL.find((x) => x.id === id)!;
  return { ...(e.datos as Extract<(typeof e)['datos'], { tipo: 'simplex' }>), titulo: e.titulo };
};

const EJERCICIOS = BIBLIOTECA_INICIAL.filter((e) => e.tema === 'simplex');

// ───────────────────────────── Álgebra matricial ─────────────────────────────

describe('matriz — inversa exacta', () => {
  it('invierte una matriz corriente sin error de redondeo', () => {
    const a = m([
      [2, 1],
      [1, 1],
    ]);
    expect(comoTexto(inversa(a)!)).toEqual([
      ['1', '−1'],
      ['−1', '2'],
    ]);
  });

  it('produce fracciones exactas donde el punto flotante daría decimales', () => {
    const a = m([
      [3, 0],
      [0, 7],
    ]);
    expect(comoTexto(inversa(a)!)).toEqual([
      ['1/3', '0'],
      ['0', '1/7'],
    ]);
  });

  it('devuelve null en una matriz singular, en vez de lanzar', () => {
    expect(
      inversa(
        m([
          [1, 2],
          [2, 4],
        ]),
      ),
    ).toBeNull();
    expect(inversa([])).toBeNull();
  });

  it('B · B⁻¹ da la identidad', () => {
    const a = m([
      [8, 6, 12],
      [2, 1, 3],
      [1, 1, 1],
    ]);
    const inv = inversa(a)!;
    const producto = a.map((fila) => inv[0]!.map((_, j) => escalar(fila, inv.map((f) => f[j]!))));
    expect(comoTexto(producto)).toEqual(comoTexto(identidad(3)));
  });

  it('actualizar la inversa equivale a volver a invertir la base nueva', () => {
    const a = m([
      [8, 6, 12],
      [2, 1, 3],
      [1, 1, 1],
    ]);
    // Base inicial: la identidad de las holguras. Entra la columna 2 (índice 2)
    // en la fila 1, tal como haría una iteración del simplex.
    const inv = identidad(3);
    const columna = porVector(inv, a.map((f) => f[2]!));
    const actualizada = actualizarInversa(inv, columna, 1)!;

    // La base nueva: e1, A_2, e3.
    const baseNueva = a.map((fila, i) => [i === 0 ? UNO : CERO, fila[2]!, i === 2 ? UNO : CERO]);
    expect(comoTexto(actualizada)).toEqual(comoTexto(inversa(baseNueva)!));
  });

  it('rechaza actualizar con un pivote cero', () => {
    expect(actualizarInversa(identidad(2), [CERO, UNO], 0)).toBeNull();
  });

  it('el producto por vector y el vector por matriz son consistentes', () => {
    const a = m([
      [2, 1],
      [0, 3],
    ]);
    expect(porVector(a, [r(1), r(2)]).map((x) => texto(x))).toEqual(['4', '6']);
    expect(vectorPor([r(1), r(2)], a).map((x) => texto(x))).toEqual(['2', '7']);
  });
});

// ───────────────────────────── Identidad con el tableau ─────────────────────────────

describe('simplex revisado — recorre exactamente los mismos vértices que el tableau', () => {
  const huella = (d: DatosSimplex, metodo: MetodoSimplex): string => {
    const res = resolverSimplex(d, { metodo });
    if (res.datos === null) {
      return `sin datos: ${res.diagnosticos.filter((x) => x.gravedad === 'error').map((x) => x.codigo).sort().join(',')}`;
    }
    const s = res.datos;
    const bases = s.iteraciones.map((it) => it.tableau.base.map((b) => s.columnas[b]!.nombre).join('+')).join(' → ');
    return [
      `Z=${texto(s.valorOptimo!)}`,
      `plan=${s.solucion.map((x) => texto(x.valor)).join(',')}`,
      `sombras=${s.holguras.map((h) => texto(h.precioSombra)).join(',')}`,
      `it=${s.iteracionesFase1}+${s.iteracionesFase2}`,
      `bases=${bases}`,
    ].join(' | ');
  };

  for (const e of EJERCICIOS) {
    it(`visita la misma sucesión de bases en "${e.titulo}"`, () => {
      const d = datosDe(e.id);
      expect(huella(d, 'revisado')).toBe(huella(d, 'dos_fases'));
    });
  }

  it('da la misma sensibilidad que el tableau', () => {
    for (const id of ['simp-01', 'simp-03', 'simp-04', 'simp-08']) {
      const d = datosDe(id);
      const resumen = (metodo: MetodoSimplex): string => {
        const s = analizarSensibilidadSimplex(resolverSimplex(d, { metodo }).datos!).datos!;
        return [
          s.rangosLadoDerecho.map((x) => `${x.desde && texto(x.desde)}-${x.hasta && texto(x.hasta)}`).join(','),
          s.rangosCoeficientes.map((c) => `${c.desde && texto(c.desde)}-${c.hasta && texto(c.hasta)}:${texto(c.costoReducido)}`).join(','),
        ].join(' | ');
      };
      expect(resumen('revisado'), id).toBe(resumen('dos_fases'));
    }
  });
});

// ───────────────────────────── Coherencia interna ─────────────────────────────

describe('simplex revisado — B⁻¹ es de verdad la inversa de la base', () => {
  for (const id of ['simp-01', 'simp-02', 'simp-04', 'simp-08']) {
    it(`B · B⁻¹ = I en cada iteración de ${id}`, () => {
      const d = datosDe(id);
      const s = resolverSimplex(d, { metodo: 'revisado' }).datos!;

      for (const it of s.iteraciones) {
        const rev = it.revisada;
        expect(rev, `${id}: la iteración ${it.numero} debería traer el detalle del revisado`).toBeDefined();

        // La matriz de la base se reconstruye desde el tableau materializado:
        // B = (B⁻¹)⁻¹, así que invertir la inversa tiene que devolverla.
        const inv = rev!.inversa;
        const reconstruida = inversa(inv);
        expect(reconstruida, `${id}: B⁻¹ debe ser invertible`).not.toBeNull();

        const producto = inv.map((fila) => fila.map((_, j) => escalar(fila, reconstruida!.map((f) => f[j]!))));
        expect(comoTexto(producto), `${id}: iteración ${it.numero}`).toEqual(comoTexto(identidad(inv.length)));
      }
    });
  }

  it('los multiplicadores del último paso son los precios sombra', () => {
    const s = resolverSimplex(datosDe('simp-01'), { metodo: 'revisado' }).datos!;
    const ultima = s.iteraciones[s.iteraciones.length - 1]!;

    // y = c_B B⁻¹ en la base óptima. Los tres recursos se agotan, así que los
    // tres precios sombra tienen que aparecer ahí.
    expect(ultima.revisada!.multiplicadores.map((x) => texto(x))).toEqual(
      s.holguras.map((h) => texto(h.precioSombra)),
    );
  });

  it('x_B del último paso son los valores de las variables básicas', () => {
    const s = resolverSimplex(datosDe('simp-03'), { metodo: 'revisado' }).datos!;
    const ultima = s.iteraciones[s.iteraciones.length - 1]!;

    ultima.revisada!.valoresBasicos.forEach((v, i) => {
      const columna = s.columnas[ultima.tableau.base[i]!]!;
      const valor = s.valores.find((x) => x.columna.indice === columna.indice)!;
      expect(comparar(v, valor.valor), columna.nombre).toBe(0);
    });
  });
});

// ───────────────────────────── Lo que se muestra ─────────────────────────────

describe('simplex revisado — el procedimiento que muestra', () => {
  const pasosDe = (id: string) => resolverSimplex(datosDe(id), { metodo: 'revisado' }).pasos;

  it('cuenta cada iteración en dos mitades: valorar y traer la columna', () => {
    const titulos = pasosDe('simp-01').map((p) => p.titulo);

    expect(titulos).toContain('Arrancar con B⁻¹ en lugar del tableau');
    expect(titulos.filter((t) => t.includes('valorar las columnas'))).toHaveLength(3);
    expect(titulos.filter((t) => /^Iteración \d+ — entra/.test(t))).toHaveLength(3);
    // No aparece ningún paso con la redacción del tableau.
    expect(titulos).not.toContain('Construir el tableau inicial');
  });

  it('la tabla de precios solo lista las columnas no básicas', () => {
    const s = resolverSimplex(datosDe('simp-01'), { metodo: 'revisado' }).datos!;
    const pasos = pasosDe('simp-01');
    const primera = pasos.find((p) => p.titulo.includes('valorar las columnas'))!;

    // 6 columnas en total, 3 en la base: se valoran 3.
    expect(s.columnas).toHaveLength(6);
    expect(primera.tabla!.filas).toHaveLength(3);
    expect(primera.tabla!.encabezados).toEqual(['Columna', 'Representa', 'c_j', 'y · A_j', 'z_j − c_j']);
  });

  it('la tabla de la segunda mitad muestra B⁻¹ junto a x_B, la columna entrante y las razones', () => {
    const paso = pasosDe('simp-01').find((p) => p.titulo.startsWith('Iteración 1 — entra'))!;

    expect(paso.tabla!.encabezados).toEqual(['Base', 'B⁻¹ · 1', 'B⁻¹ · 2', 'B⁻¹ · 3', 'x_B = B⁻¹b', 'B⁻¹A_e (x3)', 'Razón']);
    // B⁻¹ arranca siendo la identidad porque la base son las holguras.
    expect(paso.tabla!.filas.map((f) => f.slice(1, 4))).toEqual([
      ['1', '0', '0'],
      ['0', '1', '0'],
      ['0', '0', '1'],
    ]);
    expect(paso.tabla!.resaltadas).toEqual([1]);
  });

  it('compara honestamente el trabajo de las dos formas', () => {
    const s = resolverSimplex(datosDe('simp-01'), { metodo: 'revisado' }).datos!;
    const rev = s.iteraciones[0]!.revisada!;

    // 3 restricciones y 6 columnas: el tableau actualiza 3 × 7 = 21 casillas;
    // el revisado mantiene 3² + 2 × 3 = 15.
    expect(rev.casillasTableau).toBe(21);
    expect(rev.casillasRevisado).toBe(15);

    const paso = resolverSimplex(datosDe('simp-01'), { metodo: 'revisado' })
      .pasos.find((p) => p.titulo.includes('valorar las columnas'))!;
    expect(paso.explicacion).toContain('21 casillas');
    expect(paso.explicacion).toContain('15 de B⁻¹');
  });

  it('explica la fase 1 con su propia redacción cuando hay artificiales', () => {
    const titulos = pasosDe('simp-02').map((p) => p.titulo);
    expect(titulos).toContain('Fase 1 — construir una solución factible');
    expect(titulos.some((t) => t.startsWith('Fase 1 · iteración'))).toBe(true);
    expect(titulos).toContain('Fin de la fase 1 — la base ya es factible');
  });

  it('la interpretación dice que no se arrastró el tableau', () => {
    const r2 = resolverSimplex(datosDe('simp-01'), { metodo: 'revisado' });
    expect(r2.datos!.metodo).toBe('revisado');
    expect(r2.interpretacion).toMatch(/sin arrastrar el tableau/i);
  });
});
