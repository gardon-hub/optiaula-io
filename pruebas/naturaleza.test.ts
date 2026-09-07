/**
 * Pruebas del perfil de operaciones (módulo 1).
 *
 * Lo que se comprueba no es que el promedio esté bien calculado —eso es una
 * división— sino las dos cosas que pueden enseñar mal: que el continuo se lea
 * donde corresponde, y que las consecuencias operativas se afirmen solo cuando
 * el rasgo de verdad las impone. Una consecuencia declarada en la zona
 * intermedia le inventaría al estudiante una restricción que la organización no
 * tiene.
 */

import { describe, expect, it } from 'vitest';

import {
  RASGOS,
  clasificar,
  indiceDe,
  resolverNaturaleza,
  type Perfil,
  type RasgoId,
} from '@/nucleo/naturalezaOperaciones';

/** Perfil con el mismo valor en todos los rasgos. */
const plano = (v: number): Perfil => Object.fromEntries(RASGOS.map((r) => [r.id, v])) as Perfil;

/** Perfil plano con algunos rasgos cambiados. */
const con = (base: number, cambios: Partial<Record<RasgoId, number>>): Perfil =>
  ({ ...plano(base), ...cambios }) as Perfil;

describe('el continuo', () => {
  it('los ocho rasgos tienen identificador único y los dos polos descritos', () => {
    expect(new Set(RASGOS.map((r) => r.id)).size).toBe(RASGOS.length);
    expect(RASGOS).toHaveLength(8);
    for (const r of RASGOS) {
      expect(r.poloManufactura.length, r.id).toBeGreaterThan(10);
      expect(r.poloServicios.length, r.id).toBeGreaterThan(10);
      expect(r.pregunta.endsWith('?'), r.id).toBe(true);
    }
  });

  it('los extremos dan manufactura y servicios', () => {
    expect(clasificar(indiceDe(plano(0)))).toBe('manufactura');
    expect(clasificar(indiceDe(plano(100)))).toBe('servicios');
  });

  it('el centro da mixta, que no es un empate sino una lectura', () => {
    expect(clasificar(indiceDe(plano(50)))).toBe('mixta');
    expect(clasificar(40)).toBe('mixta');
    expect(clasificar(60)).toBe('mixta');
    expect(clasificar(39.9)).toBe('manufactura');
    expect(clasificar(60.1)).toBe('servicios');
  });

  it('el índice es el promedio simple, sin pesos', () => {
    // Que no haya pesos es una decisión: ninguna fuente del curso dice cuánto
    // pesa un rasgo frente a otro. Si alguien los introdujera, esta prueba lo
    // delataría.
    const p = con(0, { tangibilidad: 80 });
    expect(indiceDe(p)).toBeCloseTo(10, 10);
    const q = con(0, { intensidad: 80 });
    expect(indiceDe(q)).toBeCloseTo(indiceDe(p), 10);
  });
});

describe('las consecuencias operativas', () => {
  const consecuenciasDe = (perfil: Perfil): readonly string[] =>
    resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil, referencia: null }).datos!.consecuencias.map(
      (c) => c.rasgo,
    );

  it('un producto que no se puede guardar obliga a dimensionar al pico', () => {
    const r = resolverNaturaleza({
      organizacion: 'Clínica',
      descripcion: '',
      perfil: con(50, { almacenabilidad: 95 }),
      referencia: null,
    });
    const c = r.datos!.consecuencias.find((x) => x.rasgo === 'almacenabilidad')!;
    expect(c.lado).toBe('servicios');
    expect(c.titulo).toMatch(/pico/i);
  });

  it('el mismo rasgo en el otro extremo dice lo contrario, no lo mismo', () => {
    const r = resolverNaturaleza({
      organizacion: 'Beneficio',
      descripcion: '',
      perfil: con(50, { almacenabilidad: 5 }),
      referencia: null,
    });
    const c = r.datos!.consecuencias.find((x) => x.rasgo === 'almacenabilidad')!;
    expect(c.lado).toBe('manufactura');
    expect(c.titulo).toMatch(/inventario/i);
  });

  it('en la zona intermedia no se afirma ninguna consecuencia', () => {
    // Es la regla que evita inventarle restricciones a quien todavía puede
    // elegir. 50 está lejos de los dos cortes.
    expect(consecuenciasDe(plano(50))).toEqual([]);
  });

  it('los cortes son 35 y 65, y se comportan como se documenta', () => {
    expect(consecuenciasDe(con(50, { contacto: 64 }))).toEqual([]);
    expect(consecuenciasDe(con(50, { contacto: 65 }))).toEqual(['contacto']);
    expect(consecuenciasDe(con(50, { uniformidad: 36 }))).toEqual([]);
    expect(consecuenciasDe(con(50, { uniformidad: 35 }))).toEqual(['uniformidad']);
  });

  it('cada consecuencia nombra un rasgo que existe', () => {
    const ids = new Set(RASGOS.map((r) => r.id));
    for (const perfil of [plano(0), plano(100), con(50, { contacto: 90, medicion: 10 })]) {
      const r = resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil, referencia: null });
      for (const c of r.datos!.consecuencias) expect(ids.has(c.rasgo), c.rasgo).toBe(true);
    }
  });

  it('un perfil extremo de servicios produce varias consecuencias, todas de ese lado', () => {
    const r = resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil: plano(100), referencia: null });
    const cs = r.datos!.consecuencias;
    expect(cs.length).toBeGreaterThanOrEqual(6);
    expect(cs.every((c) => c.lado === 'servicios')).toBe(true);
  });
});

describe('la comparación con el perfil de referencia', () => {
  it('sin referencia no inventa diferencias', () => {
    const r = resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil: plano(50), referencia: null });
    expect(r.datos!.indiceReferencia).toBeNull();
    expect(r.datos!.naturalezaReferencia).toBeNull();
    expect(r.datos!.diferencias).toEqual([]);
    expect(r.datos!.discrepancias).toEqual([]);
  });

  it('ordena las diferencias de mayor a menor', () => {
    const r = resolverNaturaleza({
      organizacion: 'X',
      descripcion: '',
      perfil: con(50, { contacto: 100, medicion: 70 }),
      referencia: plano(50),
    });
    const d = r.datos!.diferencias;
    expect(d[0]!.rasgo).toBe('contacto');
    expect(d[0]!.diferencia).toBe(50);
    expect(d[1]!.rasgo).toBe('medicion');
    for (let i = 1; i < d.length; i++) expect(d[i]!.diferencia).toBeLessThanOrEqual(d[i - 1]!.diferencia);
  });

  it('solo llama discrepancia a lo que se aparta más de 25 puntos', () => {
    const r = resolverNaturaleza({
      organizacion: 'X',
      descripcion: '',
      perfil: con(50, { contacto: 76, medicion: 75 }),
      referencia: plano(50),
    });
    // 26 puntos discrepa; 25 exactos, no.
    expect(r.datos!.discrepancias.map((d) => d.rasgo)).toEqual(['contacto']);
  });

  it('un perfil idéntico a la referencia no discrepa en nada', () => {
    const p = con(20, { contacto: 80 });
    const r = resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil: p, referencia: p });
    expect(r.datos!.discrepancias).toEqual([]);
    expect(r.datos!.indice).toBe(r.datos!.indiceReferencia);
  });
});

describe('los datos mal formados no rompen la simulación', () => {
  it('acota los valores fuera de rango y lo advierte en vez de fallar', () => {
    const r = resolverNaturaleza({
      organizacion: 'X',
      descripcion: '',
      perfil: con(50, { contacto: 400, medicion: -30 }),
      referencia: null,
    });
    expect(r.datos).not.toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'perfil-fuera-de-rango')).toBe(true);
    // Acotados a 100 y 0: el promedio lo demuestra.
    expect(r.datos!.indice).toBeCloseTo((50 * 6 + 100 + 0) / 8, 10);
  });

  it('un valor no numérico no propaga NaN al índice', () => {
    const r = resolverNaturaleza({
      organizacion: 'X',
      descripcion: '',
      perfil: con(50, { contacto: Number.NaN }),
      referencia: null,
    });
    expect(Number.isFinite(r.datos!.indice)).toBe(true);
  });
});

describe('lo que el motor le dice al estudiante', () => {
  it('el procedimiento empieza por situar y termina en las consecuencias', () => {
    const r = resolverNaturaleza({ organizacion: 'Beneficio', descripcion: '', perfil: plano(10), referencia: null });
    expect(r.pasos[0]!.titulo).toMatch(/situar/i);
    expect(r.pasos[0]!.tabla!.filas).toHaveLength(8);
    expect(r.pasos.at(-1)!.titulo).toMatch(/consecuencias/i);
  });

  it('un perfil mixto se explica como lectura, no como empate', () => {
    const r = resolverNaturaleza({ organizacion: 'Cooperativa', descripcion: '', perfil: plano(50), referencia: null });
    expect(r.diagnosticos.some((d) => d.codigo === 'perfil-mixto')).toBe(true);
    expect(r.interpretacion).toMatch(/mayoría de las organizaciones reales/i);
    expect(r.interpretacion).not.toMatch(/error|ambiguo|indefinid/i);
  });

  it('la interpretación nombra la organización y no promete consecuencias que no hay', () => {
    const r = resolverNaturaleza({ organizacion: 'Comedor Lupita', descripcion: '', perfil: plano(50), referencia: null });
    expect(r.interpretacion).toContain('Comedor Lupita');
    expect(r.interpretacion).toMatch(/todavía puede elegir/i);
  });
});
