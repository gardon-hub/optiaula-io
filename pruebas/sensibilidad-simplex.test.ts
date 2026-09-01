/**
 * Pruebas del análisis de sensibilidad sobre el tableau del simplex.
 *
 * Tres verificaciones independientes, ninguna de las cuales confía en el
 * algoritmo que comprueba:
 *
 * 1. **El método gráfico.** Para dos variables, los precios sombra, los rangos
 *    de factibilidad y los rangos de optimalidad tienen que coincidir con los
 *    que calcula la geometría del módulo 8, que no comparte una línea de código
 *    con el tableau.
 * 2. **Volver a resolver.** Dentro del rango de un lado derecho, la predicción
 *    del precio sombra tiene que ser exacta; justo fuera, tiene que fallar.
 * 3. **Cambiar el plan.** Dentro del rango de un coeficiente, la solución
 *    óptima no cambia; justo fuera, cambia.
 */

import { describe, expect, it } from 'vitest';

import { aNumero, texto, type Racional } from '@/nucleo/racional';
import { desdeGrafico, resolverSimplex, type DatosSimplex, type MetodoSimplex } from '@/nucleo/simplex';
import { analizarSensibilidadSimplex } from '@/nucleo/sensibilidadSimplex';
import { analizarSensibilidad, resolverGrafico, type DatosGrafico } from '@/nucleo/grafico';
import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';

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

const numero = (r: Racional | null): number | null => (r === null ? null : aNumero(r));

/** Compara dos límites donde `null` significa «sin límite» en ambos lados. */
function esperarLimite(obtenido: number | null, esperado: number | null, donde: string): void {
  if (esperado === null) {
    expect(obtenido, `${donde}: se esperaba sin límite`).toBeNull();
    return;
  }
  expect(obtenido, `${donde}: se esperaba ${esperado}`).not.toBeNull();
  expect(obtenido!, donde).toBeCloseTo(esperado, 9);
}

const datosDe = (id: string): DatosSimplex => {
  const e = BIBLIOTECA_INICIAL.find((x) => x.id === id)!;
  return { ...(e.datos as Extract<(typeof e)['datos'], { tipo: 'simplex' }>), titulo: e.titulo };
};

const sensibilidadDe = (d: DatosSimplex, metodo: MetodoSimplex = 'dos_fases') =>
  analizarSensibilidadSimplex(resolverSimplex(d, { metodo }).datos!).datos!;

// ───────────────────────────── Coincidencia con el método gráfico ─────────────────────────────

describe('sensibilidad del simplex — coincide con la geometría del módulo 8', () => {
  for (const g of [MESAS_Y_SILLAS, MAIZ_Y_FRIJOL]) {
    it(`da los mismos rangos que el método gráfico en "${g.titulo}"`, () => {
      const geometria = analizarSensibilidad(resolverGrafico(g).datos!).datos!;
      const tableau = sensibilidadDe(comoSimplex(g));

      for (const esperado of geometria.preciosSombra) {
        const obtenido = tableau.rangosLadoDerecho.find((r) => r.holgura.restriccion.id === esperado.restriccion.id)!;
        expect(obtenido, esperado.restriccion.id).toBeDefined();
        expect(aNumero(obtenido.holgura.precioSombra)).toBeCloseTo(esperado.valor, 9);
        esperarLimite(numero(obtenido.desde), esperado.rangoDesde, `${esperado.restriccion.id} desde`);
        esperarLimite(numero(obtenido.hasta), esperado.rangoHasta, `${esperado.restriccion.id} hasta`);
      }

      geometria.rangosCoeficientes.forEach((esperado, j) => {
        const obtenido = tableau.rangosCoeficientes[j]!;
        expect(obtenido.variable.nombre).toBe(esperado.nombre);
        esperarLimite(numero(obtenido.desde), esperado.desde, `coef ${esperado.nombre} desde`);
        esperarLimite(numero(obtenido.hasta), esperado.hasta, `coef ${esperado.nombre} hasta`);
      });
    });
  }

  it('da los rangos exactos de mesas y sillas, en fracciones', () => {
    const s = sensibilidadDe(comoSimplex(MESAS_Y_SILLAS));
    const rango = (id: string) => s.rangosLadoDerecho.find((r) => r.holgura.restriccion.id === id)!;

    expect([texto(rango('material').desde!), texto(rango('material').hasta!)]).toEqual(['64', '144']);
    expect([texto(rango('mano_obra').desde!), texto(rango('mano_obra').hasta!)]).toEqual(['48', '120']);
    // La restricción ≥ se negó al normalizar: el intervalo se refleja.
    expect(rango('compromiso').desde).toBeNull();
    expect(texto(rango('compromiso').hasta!)).toBe('6');

    expect(s.rangosCoeficientes.map((c) => [texto(c.desde!), texto(c.hasta!)])).toEqual([
      ['5/2', '15/2'],
      ['10/3', '10'],
    ]);
  });

  it('los tres métodos de solución dan la misma sensibilidad', () => {
    const d = datosDe('simp-08');
    const resumen = (m: MetodoSimplex): string => {
      const s = sensibilidadDe(d, m);
      return [
        s.rangosLadoDerecho
          .map((r) => `${texto(r.holgura.precioSombra)}:${r.desde && texto(r.desde)}-${r.hasta && texto(r.hasta)}`)
          .join(','),
        s.rangosCoeficientes.map((c) => `${c.desde && texto(c.desde)}-${c.hasta && texto(c.hasta)}`).join(','),
      ].join(' | ');
    };
    expect(resumen('gran_m')).toBe(resumen('dos_fases'));
    expect(resumen('dual')).toBe(resumen('dos_fases'));
  });
});

// ───────────────────────────── Comprobación numérica ─────────────────────────────

describe('sensibilidad del simplex — verificada volviendo a resolver', () => {
  const EJERCICIOS = ['simp-01', 'simp-03', 'simp-04', 'simp-08'];
  const EPS = 1e-3;

  for (const id of EJERCICIOS) {
    it(`el precio sombra predice exactamente dentro del rango, y falla fuera, en ${id}`, () => {
      const d = datosDe(id);
      const base = resolverSimplex(d).datos!;
      const s = analizarSensibilidadSimplex(base).datos!;
      const z0 = aNumero(base.valorOptimo!);

      const zCon = (i: number, c: number): number | null => {
        const r = resolverSimplex({
          ...d,
          restricciones: d.restricciones.map((x, k) => (k === i ? { ...x, c } : x)),
        }).datos;
        return r === null ? null : aNumero(r.valorOptimo!);
      };

      s.rangosLadoDerecho.forEach((r, i) => {
        const y = aNumero(r.holgura.precioSombra);
        const b = r.holgura.restriccion.c;
        const desde = numero(r.desde);
        const hasta = numero(r.hasta);
        const donde = `${id}/${r.holgura.restriccion.nombre}`;

        // Dentro: Z(b + Δ) = Z(b) + y·Δ, exactamente.
        for (const punto of [desde === null ? b - 1000 : desde + EPS, hasta === null ? b + 1000 : hasta - EPS]) {
          const z = zCon(i, punto);
          expect(z, `${donde} dentro`).not.toBeNull();
          expect(z!, `${donde} dentro`).toBeCloseTo(z0 + y * (punto - b), 6);
        }

        // Fuera: la predicción deja de valer, o el modelo se vuelve infactible.
        for (const punto of [desde === null ? null : desde - EPS, hasta === null ? null : hasta + EPS]) {
          if (punto === null) continue;
          const z = zCon(i, punto);
          if (z === null) continue;
          expect(Math.abs(z - (z0 + y * (punto - b))), `${donde} fuera`).toBeGreaterThan(1e-9);
        }
      });
    });

    it(`el plan no cambia dentro del rango del coeficiente, y cambia fuera, en ${id}`, () => {
      const d = datosDe(id);
      const base = resolverSimplex(d).datos!;
      const s = analizarSensibilidadSimplex(base).datos!;
      const plan = base.solucion.map((x) => texto(x.valor)).join('|');

      const planCon = (j: number, c: number): string | null => {
        const r = resolverSimplex({
          ...d,
          variables: d.variables.map((v, k) => (k === j ? { ...v, coeficiente: c } : v)),
        }).datos;
        return r === null ? null : r.solucion.map((x) => texto(x.valor)).join('|');
      };

      s.rangosCoeficientes.forEach((c, j) => {
        const actual = aNumero(c.valorActual);
        const desde = numero(c.desde);
        const hasta = numero(c.hasta);
        const donde = `${id}/${c.variable.nombre} en [${desde}, ${hasta}]`;

        for (const punto of [desde === null ? actual - 1e6 : desde + EPS, hasta === null ? actual + 1e6 : hasta - EPS]) {
          expect(planCon(j, punto), `${donde} dentro`).toBe(plan);
        }

        for (const punto of [desde === null ? null : desde - EPS, hasta === null ? null : hasta + EPS]) {
          if (punto === null) continue;
          expect(planCon(j, punto), `${donde} fuera`).not.toBe(plan);
        }
      });
    });
  }
});

// ───────────────────────────── Costo reducido ─────────────────────────────

describe('sensibilidad del simplex — el costo reducido de lo que quedó fuera', () => {
  it('dice cuánto tendría que mejorar el sorgo para entrar al plan', () => {
    const s = sensibilidadDe(datosDe('simp-03'));
    const sorgo = s.rangosCoeficientes.find((c) => c.variable.nombre === 'sorgo')!;

    expect(sorgo.basica).toBe(false);
    expect(s.fueraDelPlan).toHaveLength(1);
    // 9 000 + 17 000/27 = 260 000/27: a partir de ahí conviene sembrarlo.
    expect(texto(sorgo.costoReducido)).toBe('17 000/27');
    expect(texto(sorgo.hasta!)).toBe('260 000/27');
    expect(sorgo.desde).toBeNull();
    expect(sorgo.lectura).toMatch(/tendría que subir/);
  });

  it('al minimizar, el costo reducido dice cuánto tendría que abaratarse', () => {
    const s = sensibilidadDe(datosDe('simp-08'));
    const pescado = s.rangosCoeficientes.find((c) => c.variable.nombre === 'harina de pescado')!;

    expect(pescado.basica).toBe(false);
    expect(texto(pescado.desde!)).toBe('58/3');
    expect(pescado.hasta).toBeNull();
    expect(pescado.lectura).toMatch(/tendría que bajar/);
  });

  it('una variable en el plan no tiene costo reducido', () => {
    const s = sensibilidadDe(datosDe('simp-01'));
    expect(s.fueraDelPlan).toHaveLength(0);
    for (const c of s.rangosCoeficientes) {
      expect(c.basica).toBe(true);
      expect(texto(c.costoReducido)).toBe('0');
    }
  });

  it('el recurso más valioso es el de mayor precio sombra en magnitud', () => {
    const s = sensibilidadDe(datosDe('simp-01'));
    expect(s.recursoMasValioso!.holgura.restriccion.nombre).toBe('Horas de proceso');
    expect(texto(s.recursoMasValioso!.holgura.precioSombra)).toBe('10');
  });
});

// ───────────────────────────── Casos límite ─────────────────────────────

describe('sensibilidad del simplex — casos que no admiten análisis', () => {
  it('rechaza analizar un modelo sin óptimo finito', () => {
    // Se fuerza un tableau nulo, que es el estado en que quedan los modelos
    // infactibles y los no acotados.
    const r = analizarSensibilidadSimplex({
      ...resolverSimplex(datosDe('simp-01')).datos!,
      tableauFinal: null,
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((x) => x.codigo === 'SX_SENSIBILIDAD_SIN_OPTIMO')).toBe(true);
  });

  it('avisa de la degeneración sin dejar de calcular los rangos', () => {
    const m: DatosSimplex = {
      titulo: 'degenerado',
      objetivo: 'maximizar',
      variables: [
        { id: 'x', nombre: 'x', coeficiente: 3 },
        { id: 'y', nombre: 'y', coeficiente: 2 },
      ],
      unidadVariables: 'unidades',
      nombreObjetivo: 'el margen',
      unidadObjetivo: '$',
      restricciones: [
        { id: 'total', nombre: 'Total', coeficientes: [1, 1], relacion: '<=', c: 4, unidad: '' },
        { id: 'tx', nombre: 'Tope de x', coeficientes: [1, 0], relacion: '<=', c: 2, unidad: '' },
        { id: 'ty', nombre: 'Tope de y', coeficientes: [0, 1], relacion: '<=', c: 2, unidad: '' },
      ],
    };
    const r = analizarSensibilidadSimplex(resolverSimplex(m).datos!);
    expect(r.datos).not.toBeNull();
    expect(r.datos!.degenerado).toBe(true);
    expect(r.diagnosticos.some((x) => x.codigo === 'SX_SENSIBILIDAD_DEGENERADA')).toBe(true);
    expect(r.diagnosticos.find((x) => x.codigo === 'SX_SENSIBILIDAD_DEGENERADA')!.mensaje).toMatch(/no son únicos/);
  });

  it('produce los tres pasos del procedimiento', () => {
    const r = analizarSensibilidadSimplex(resolverSimplex(datosDe('simp-01')).datos!);
    expect(r.pasos.map((p) => p.titulo)).toEqual([
      'Dónde está el análisis de sensibilidad',
      'Rango de factibilidad: hasta dónde vale cada precio sombra',
      'Rango de optimalidad: cuánto pueden moverse los precios',
    ]);
    expect(r.interpretacion).toMatch(/recurso que más pesa/);
  });
});

// ───────────────────────────── Preguntas y retroalimentación ─────────────────────────────

describe('sensibilidad del simplex — evaluada en los ejercicios', () => {
  const ejercicio = BIBLIOTECA_INICIAL.find((e) => e.id === 'simp-03')!;
  const pregunta = (clave: string) => ejercicio.preguntas.find((p) => p.claveVerificacion === clave)!;
  const s = sensibilidadDe(datosDe('simp-03'));

  it('los ejercicios preguntan por el rango y por el costo reducido', () => {
    expect(pregunta('simplex.rangoFactibilidad')).toBeDefined();
    expect(pregunta('simplex.costoReducido')).toBeDefined();

    const rango = s.rangosLadoDerecho.find((r) => r.holgura.restriccion.id === 'jornales')!;
    expect(pregunta('simplex.rangoFactibilidad').respuesta).toBeCloseTo(aNumero(rango.hasta!), 6);

    const sorgo = s.rangosCoeficientes.find((c) => c.variable.nombre === 'sorgo')!;
    expect(pregunta('simplex.costoReducido').respuesta).toBeCloseTo(aNumero(sorgo.hasta!), 6);
  });

  it('reconoce que se dio el incremento en lugar del valor total del recurso', () => {
    const p = pregunta('simplex.rangoFactibilidad');
    const incremento = (p.respuesta as number) - 900;
    const r = evaluarRespuesta(ejercicio, p, incremento);
    expect(r.codigoError).toBe('SIMPLEX_RANGO_ES_INCREMENTO');
    expect(r.mensaje).toMatch(/incremento/);
  });

  it('reconoce que se repitió la disponibilidad actual', () => {
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.rangoFactibilidad'), 900);
    expect(r.codigoError).toBe('SIMPLEX_RANGO_ES_ACTUAL');
  });

  it('reconoce que se dio el costo reducido en vez del umbral', () => {
    const sorgo = s.fueraDelPlan[0]!;
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.costoReducido'), aNumero(sorgo.costoReducido));
    expect(r.codigoError).toBe('SIMPLEX_COSTO_REDUCIDO_SOLO');
    expect(r.mensaje).toMatch(/hay que sumarlo al/i);
  });

  it('reconoce que se repitió el aporte actual de la variable fuera del plan', () => {
    const r = evaluarRespuesta(ejercicio, pregunta('simplex.costoReducido'), 9000);
    expect(r.codigoError).toBe('SIMPLEX_COSTO_REDUCIDO_ES_ACTUAL');
  });

  it('acepta las respuestas correctas sin inventar un error', () => {
    for (const clave of ['simplex.rangoFactibilidad', 'simplex.costoReducido']) {
      const p = pregunta(clave);
      const r = evaluarRespuesta(ejercicio, p, p.respuesta as number);
      expect(r.correcta, clave).toBe(true);
      expect(r.codigoError, clave).toBeNull();
    }
  });
});
