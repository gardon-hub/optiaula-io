/**
 * Pruebas del análisis de sensibilidad del modelo de transporte.
 *
 * La verificación se hace por **optimalidad del plan**, no por identidad: con
 * óptimos alternativos el solucionador puede devolver otro plan igual de bueno,
 * así que comparar matrices de envíos daría falsos negativos. Lo que se
 * comprueba es lo que el rango afirma de verdad:
 *
 * - Dentro del intervalo, el plan actual sigue siendo óptimo con el nuevo flete.
 * - Fuera, deja de serlo —salvo cuando la solución es degenerada, donde un
 *   pivote puede cambiar la base sin mover ninguna unidad—.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { multiplicadores, resolverTransporte, type DatosTransporte } from '@/nucleo/transporte';
import { analizarSensibilidadTransporte } from '@/nucleo/sensibilidadTransporte';
import { casiIgual, sumaExacta } from '@/nucleo/numero';

const EJERCICIOS = BIBLIOTECA_INICIAL.filter((e) => e.tema === 'transporte');

const datosDe = (id: string): DatosTransporte => {
  const e = BIBLIOTECA_INICIAL.find((x) => x.id === id)!;
  return { ...(e.datos as Extract<(typeof e)['datos'], { tipo: 'transporte' }>), titulo: e.titulo };
};

const analisisDe = (d: DatosTransporte) => {
  const r = resolverTransporte(d).datos!;
  return { r, s: analizarSensibilidadTransporte(r).datos! };
};

// ───────────────────────────── Multiplicadores ─────────────────────────────

describe('sensibilidad del transporte — los multiplicadores', () => {
  for (const e of EJERCICIOS) {
    it(`cumplen u_i + v_j = c_ij en las rutas usadas, en ${e.id}`, () => {
      const { s } = analisisDe(datosDe(e.id));

      for (const ruta of s.rutas.filter((x) => x.basica)) {
        const suma = s.u[ruta.fila]!.valor + s.v[ruta.columna]!.valor;
        expect(suma, `${ruta.origen} → ${ruta.destino}`).toBeCloseTo(ruta.costo, 9);
        expect(ruta.costoReducido).toBe(0);
      }

      // Y en las que no se usan, el flete directo nunca es menor que u_i + v_j:
      // ese es el criterio de optimalidad de MODI.
      for (const ruta of s.rutas.filter((x) => !x.basica)) {
        expect(ruta.costoReducido, `${ruta.origen} → ${ruta.destino}`).toBeGreaterThanOrEqual(-1e-9);
      }
    });
  }

  it('valoran la oferta y la demanda por el costo total del plan (dualidad)', () => {
    for (const e of EJERCICIOS) {
      const { r, s } = analisisDe(datosDe(e.id));
      const dual = sumaExacta([
        ...s.u.map((x, i) => x.valor * (r.problema.oferta[i] ?? 0)),
        ...s.v.map((x, j) => x.valor * (r.problema.demanda[j] ?? 0)),
      ]);
      expect(dual, e.id).toBeCloseTo(r.solucionOptima.costoTotal, 6);
    }
  });

  it('la suma u_i + v_j no depende de la convención u_1 = 0', () => {
    // Desplazar todas las u en +k y las v en −k da los mismos multiplicadores
    // efectivos: por eso la lectura gerencial se hace sobre la suma y no sobre
    // cada componente por separado.
    const { r, s } = analisisDe(datosDe('trans-01'));
    const { u, v } = multiplicadores(r.problema, r.solucionOptima.basicas);
    const k = 7;

    for (const ruta of s.rutas) {
      const original = s.u[ruta.fila]!.valor + s.v[ruta.columna]!.valor;
      const movida = (u[ruta.fila] ?? 0) + k + ((v[ruta.columna] ?? 0) - k);
      expect(movida).toBeCloseTo(original, 9);
    }
  });
});

// ───────────────────────────── Rangos de flete ─────────────────────────────

describe('sensibilidad del transporte — rangos verificados volviendo a resolver', () => {
  const EPS = 1e-3;

  /** Costo del plan actual y costo óptimo, ambos con un flete modificado. */
  const conFlete = (
    d: DatosTransporte,
    envios: readonly (readonly number[])[],
    i: number,
    j: number,
    c: number,
  ): { plan: number; optimo: number } => {
    const costos = d.costos.map((f, k) => f.map((x, l) => (k === i && l === j ? c : x)));
    const plan = envios.reduce(
      (total, fila, k) => total + fila.reduce((sub, q, l) => sub + q * (costos[k]![l] ?? 0), 0),
      0,
    );
    const optimo = resolverTransporte({ ...d, costos }).datos!.solucionOptima.costoTotal;
    return { plan, optimo };
  };

  for (const e of EJERCICIOS) {
    it(`dentro del intervalo el plan sigue siendo óptimo, en ${e.id}`, () => {
      const d = datosDe(e.id);
      const { r, s } = analisisDe(d);
      const envios = r.solucionOptima.envios;

      for (const x of s.rutas) {
        if (x.ficticia) continue;
        const puntos = [
          x.desde === null ? x.costo - 1000 : x.desde + EPS,
          x.hasta === null ? x.costo + 1000 : x.hasta - EPS,
        ];
        for (const c of puntos) {
          const { plan, optimo } = conFlete(d, envios, x.fila, x.columna, c);
          expect(plan, `${x.origen} → ${x.destino} con flete ${c} (rango [${x.desde}, ${x.hasta}])`).toBeCloseTo(optimo, 6);
        }
      }
    });
  }

  it('justo fuera del intervalo el plan deja de ser óptimo', () => {
    for (const e of EJERCICIOS) {
      const d = datosDe(e.id);
      const { r, s } = analisisDe(d);
      // Con una celda básica en cero, un pivote puede cambiar la base sin mover
      // ninguna unidad: entonces el plan sigue siendo óptimo fuera del rango, y
      // la afirmación recíproca no aplica.
      if (r.solucionOptima.degenerada) continue;

      for (const x of s.rutas) {
        if (x.ficticia) continue;
        for (const c of [x.desde === null ? null : x.desde - EPS, x.hasta === null ? null : x.hasta + EPS]) {
          if (c === null) continue;
          const { plan, optimo } = conFlete(d, r.solucionOptima.envios, x.fila, x.columna, c);
          expect(plan, `${e.id} ${x.origen} → ${x.destino} con flete ${c}`).toBeGreaterThan(optimo + 1e-9);
        }
      }
    }
  });

  it('una ruta sin usar entra al plan en cuanto su flete cruza el umbral', () => {
    const d = datosDe('trans-01');
    const { s } = analisisDe(d);
    const fuera = s.rutas.find((x) => !x.basica && !x.ficticia && x.costoReducido > 0)!;

    const usaLaRuta = (c: number): boolean => {
      const costos = d.costos.map((f, k) => f.map((x, l) => (k === fuera.fila && l === fuera.columna ? c : x)));
      const envios = resolverTransporte({ ...d, costos }).datos!.solucionOptima.envios;
      return (envios[fuera.fila]![fuera.columna] ?? 0) > 0;
    };

    expect(usaLaRuta(fuera.desde! + 0.01)).toBe(false);
    expect(usaLaRuta(fuera.desde! - 0.01)).toBe(true);
  });
});

// ───────────────────────────── Lectura ─────────────────────────────

describe('sensibilidad del transporte — lo que se le dice al gerente', () => {
  it('señala la ruta más cerca de entrar y cuánto habría que negociar', () => {
    const { s } = analisisDe(datosDe('trans-01'));
    const cercana = s.rutaMasCercana!;

    expect(cercana).toBeDefined();
    expect(cercana.basica).toBe(false);
    for (const x of s.rutas.filter((y) => !y.basica && !y.ficticia && y.costoReducido > 0)) {
      expect(x.costoReducido).toBeGreaterThanOrEqual(cercana.costoReducido);
    }
    expect(cercana.lectura).toMatch(/Entraría al plan si su flete bajara/);
  });

  it('distingue las celdas de degeneración de las rutas que sí llevan carga', () => {
    const { r, s } = analisisDe(datosDe('trans-03'));
    expect(r.solucionOptima.degenerada).toBe(true);

    const enCero = s.rutas.filter((x) => x.basica && x.envio === 0);
    expect(enCero.length).toBeGreaterThan(0);
    for (const x of enCero) {
      expect(x.lectura).toMatch(/celda de degeneración/);
      expect(x.lectura).toMatch(/no viaja ninguna unidad/);
    }
  });

  it('avisa de la degeneración y de los planes alternativos', () => {
    const degenerado = analizarSensibilidadTransporte(resolverTransporte(datosDe('trans-03')).datos!);
    expect(degenerado.diagnosticos.some((x) => x.codigo === 'TR_SENSIBILIDAD_DEGENERADA')).toBe(true);

    const alternativos = analizarSensibilidadTransporte(resolverTransporte(datosDe('trans-09')).datos!);
    expect(alternativos.datos!.hayAlternativas).toBe(true);
    expect(alternativos.diagnosticos.some((x) => x.codigo === 'TR_SENSIBILIDAD_ALTERNATIVAS')).toBe(true);
  });

  it('produce los dos pasos del procedimiento y una interpretación con cifras', () => {
    const r = analizarSensibilidadTransporte(resolverTransporte(datosDe('trans-01')).datos!);

    expect(r.pasos.map((p) => p.titulo)).toEqual([
      'Los multiplicadores dicen cuánto vale de verdad cada ruta',
      'Hasta dónde puede moverse el flete de cada ruta',
    ]);
    expect(r.interpretacion).toMatch(/La ruta más cerca de entrar/);
    expect(r.interpretacion).toMatch(/dualidad del problema/);
  });

  it('marca las rutas ficticias de un problema desbalanceado', () => {
    const base = datosDe('trans-01');
    // Se recorta la demanda para desbalancear y forzar una fila o columna ficticia.
    const desbalanceado: DatosTransporte = {
      ...base,
      demanda: base.demanda.map((x, j) => (j === 0 ? x - 40 : x)),
    };
    const r = resolverTransporte(desbalanceado).datos!;
    const s = analizarSensibilidadTransporte(r).datos!;

    expect(r.problema.destinoFicticio || r.problema.origenFicticio).toBe(true);
    const ficticias = s.rutas.filter((x) => x.ficticia);
    expect(ficticias.length).toBeGreaterThan(0);
    for (const x of ficticias) expect(x.lectura).toMatch(/Ruta ficticia/);
  });
});

// ───────────────────────────── Coherencia con MODI ─────────────────────────────

describe('sensibilidad del transporte — coincide con lo que MODI ya calculó', () => {
  it('los costos reducidos son los mismos que verifican la optimalidad', () => {
    for (const e of EJERCICIOS) {
      const { r, s } = analisisDe(datosDe(e.id));
      const { u, v } = multiplicadores(r.problema, r.solucionOptima.basicas);

      for (const x of s.rutas) {
        if (x.basica) continue;
        const esperado = x.costo - (u[x.fila] ?? 0) - (v[x.columna] ?? 0);
        expect(x.costoReducido, `${e.id} ${x.origen} → ${x.destino}`).toBeCloseTo(esperado, 9);
      }
    }
  });

  it('detecta los planes alternativos igual que el solucionador', () => {
    for (const e of EJERCICIOS) {
      const { r, s } = analisisDe(datosDe(e.id));
      if (!r.solucionesAlternativas) continue;
      expect(s.hayAlternativas, e.id).toBe(true);
      expect(
        s.rutas.some((x) => !x.basica && !x.ficticia && casiIgual(x.costoReducido, 0)),
        e.id,
      ).toBe(true);
    }
  });
});
