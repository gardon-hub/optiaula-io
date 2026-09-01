/**
 * Pruebas del análisis de sensibilidad y los precios sombra.
 *
 * La verificación central compara el precio sombra calculado por el sistema
 * dual contra la derivada numérica obtenida perturbando el lado derecho y
 * volviendo a resolver el problema completo. Son dos caminos independientes:
 * si coinciden, el resultado es correcto.
 */

import { describe, expect, it } from 'vitest';

import {
  analizarSensibilidad,
  resolverGrafico,
  type DatosGrafico,
  type Restriccion,
} from '@/nucleo/grafico';
import { ejercicioPorId, ejerciciosDeTema } from '@/datos/ejercicios';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';

const r = (id: string, nombre: string, a: number, b: number, relacion: Restriccion['relacion'], c: number): Restriccion => ({
  id,
  nombre,
  a,
  b,
  relacion,
  c,
  unidad: 'unidades',
});

const base = { unidadVariables: 'unidades', nombreObjetivo: 'la utilidad', unidadObjetivo: '$', noNegatividad: true } as const;

/**
 * Precio sombra por diferencias finitas: se aumenta el lado derecho, se
 * resuelve otra vez desde cero y se mide cuánto cambió Z. No usa nada del
 * cálculo dual que se está verificando.
 */
function precioSombraNumerico(d: DatosGrafico, idRestriccion: string, delta = 1e-4): number | null {
  const mover = (paso: number): number | null => {
    const movido: DatosGrafico = {
      ...d,
      restricciones: d.restricciones.map((c) => (c.id === idRestriccion ? { ...c, c: c.c + paso } : c)),
    };
    return resolverGrafico(movido).datos?.valorOptimo ?? null;
  };

  const arriba = mover(delta);
  const abajo = mover(-delta);
  if (arriba === null || abajo === null) return null;
  return (arriba - abajo) / (2 * delta);
}

const mesasYSillas: DatosGrafico = {
  ...base,
  titulo: 'Mesas y sillas',
  objetivo: 'maximizar',
  nombreX: 'mesas',
  nombreY: 'sillas',
  coefX: 5,
  coefY: 5,
  restricciones: [
    r('material', 'Material', 12, 8, '<=', 96),
    r('mano_obra', 'Mano de obra', 6, 12, '<=', 72),
    r('compromiso', 'Compromiso de mesas', 1, 0, '>=', 2),
  ],
};

describe('precios sombra — verificación contra perturbación numérica', () => {
  it('coinciden con la derivada numérica en el problema de mesas y sillas', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;

    for (const precio of s.preciosSombra) {
      const numerico = precioSombraNumerico(mesasYSillas, precio.restriccion.id);
      expect(numerico, `sin derivada para ${precio.restriccion.id}`).not.toBeNull();
      expect(precio.valor, `precio sombra de ${precio.restriccion.nombre}`).toBeCloseTo(numerico!, 5);
    }
  });

  it('reproduce los valores exactos del sistema dual', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;

    // 12 y₁ + 6 y₂ = 5 ; 8 y₁ + 12 y₂ = 5  →  y₁ = 5/16 ; y₂ = 5/24
    const material = s.preciosSombra.find((x) => x.restriccion.id === 'material')!;
    const mano = s.preciosSombra.find((x) => x.restriccion.id === 'mano_obra')!;
    expect(material.valor).toBeCloseTo(5 / 16, 9);
    expect(mano.valor).toBeCloseTo(5 / 24, 9);
  });

  it('asigna precio sombra cero a las restricciones que sobran', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const compromiso = s.preciosSombra.find((x) => x.restriccion.id === 'compromiso')!;

    expect(compromiso.activa).toBe(false);
    expect(compromiso.valor).toBeCloseTo(0, 12);
    expect(compromiso.lectura).toContain('precio sombra es cero');
  });

  it('identifica el recurso más valioso', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    expect(s.recursoMasValioso?.restriccion.id).toBe('material');
  });

  it('funciona también con restricciones de tipo mayor o igual', () => {
    const dieta: DatosGrafico = {
      ...base,
      titulo: 'Dieta',
      objetivo: 'minimizar',
      nombreX: 'maíz',
      nombreY: 'concentrado',
      coefX: 9,
      coefY: 16,
      unidadObjetivo: 'L',
      restricciones: [
        r('proteina', 'Proteína', 80, 220, '>=', 1800),
        r('energia', 'Energía', 3300, 2800, '>=', 33000),
        r('peso', 'Peso', 1, 1, '>=', 10),
      ],
    };

    const res = resolverGrafico(dieta).datos!;
    const s = analizarSensibilidad(res).datos!;

    for (const precio of s.preciosSombra) {
      const numerico = precioSombraNumerico(dieta, precio.restriccion.id, 1e-3);
      expect(numerico).not.toBeNull();
      expect(precio.valor, `precio sombra de ${precio.restriccion.nombre}`).toBeCloseTo(numerico!, 4);
    }
  });

  it('en minimización, exigir más de un requisito activo encarece la solución', () => {
    const dieta: DatosGrafico = {
      ...base,
      titulo: 'Dieta',
      objetivo: 'minimizar',
      nombreX: 'maíz',
      nombreY: 'concentrado',
      coefX: 9,
      coefY: 16,
      unidadObjetivo: 'L',
      restricciones: [r('proteina', 'Proteína', 80, 220, '>=', 1800), r('energia', 'Energía', 3300, 2800, '>=', 33000)],
    };
    const s = analizarSensibilidad(resolverGrafico(dieta).datos!).datos!;
    for (const p of s.preciosSombra.filter((x) => x.activa)) {
      expect(p.valor, `${p.restriccion.nombre} debería encarecer`).toBeGreaterThan(0);
    }
  });

  it('el problema de mezcla con dos recursos tiene ambos precios positivos', () => {
    const mezcla: DatosGrafico = {
      ...base,
      titulo: 'Mezcla',
      objetivo: 'maximizar',
      nombreX: 'A',
      nombreY: 'B',
      coefX: 3,
      coefY: 1.5,
      restricciones: [r('r1', 'Recurso 1', 60, 20, '<=', 1200), r('r2', 'Recurso 2', 40, 50, '<=', 2000)],
    };
    const s = analizarSensibilidad(resolverGrafico(mezcla).datos!).datos!;

    expect(s.preciosSombra.every((x) => x.activa)).toBe(true);
    for (const p of s.preciosSombra) {
      expect(p.valor).toBeGreaterThan(0);
      const numerico = precioSombraNumerico(mezcla, p.restriccion.id, 1e-3);
      expect(p.valor).toBeCloseTo(numerico!, 4);
    }
  });
});

describe('rango de factibilidad del lado derecho', () => {
  it('el precio sombra sigue valiendo dentro del rango y cambia fuera de él', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const material = s.preciosSombra.find((x) => x.restriccion.id === 'material')!;

    expect(material.rangoHasta).not.toBeNull();
    expect(material.rangoDesde).not.toBeNull();

    // Dentro del rango, el cambio de Z es exactamente el precio sombra por unidad.
    const dentro = (material.rangoDesde! + material.rangoHasta!) / 2;
    const zBase = res.valorOptimo!;
    const conCambio = resolverGrafico({
      ...mesasYSillas,
      restricciones: mesasYSillas.restricciones.map((c) => (c.id === 'material' ? { ...c, c: dentro } : c)),
    }).datos!.valorOptimo!;

    expect(conCambio - zBase).toBeCloseTo(material.valor * (dentro - 96), 6);
  });

  it('más allá del rango el precio sombra deja de ser válido', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const material = s.preciosSombra.find((x) => x.restriccion.id === 'material')!;
    if (material.rangoHasta === null) return;

    const fuera = material.rangoHasta + 20;
    const zBase = res.valorOptimo!;
    const real = resolverGrafico({
      ...mesasYSillas,
      restricciones: mesasYSillas.restricciones.map((c) => (c.id === 'material' ? { ...c, c: fuera } : c)),
    }).datos!.valorOptimo!;

    const prediccionLineal = zBase + material.valor * (fuera - 96);
    // Fuera del rango la extrapolación lineal sobreestima el beneficio real.
    expect(real).toBeLessThan(prediccionLineal - 1e-6);
  });

  it('una restricción con holgura puede bajar hasta volverse activa', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const compromiso = s.preciosSombra.find((x) => x.restriccion.id === 'compromiso')!;

    // El compromiso exige al menos 2 mesas y el óptimo produce 6: puede subir hasta 6.
    expect(compromiso.rangoHasta).toBeCloseTo(6, 6);
  });
});

describe('rango de optimalidad de los coeficientes', () => {
  it('dentro del rango el vértice óptimo no cambia', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const rx = s.rangosCoeficientes.find((x) => x.variable === 'x')!;

    expect(rx.desde).not.toBeNull();
    expect(rx.hasta).not.toBeNull();

    for (const valor of [rx.desde! + 0.01, rx.valorActual, rx.hasta! - 0.01]) {
      const movido = resolverGrafico({ ...mesasYSillas, coefX: valor }).datos!;
      expect(movido.optimo?.punto.x, `con coefX = ${valor}`).toBeCloseTo(6, 6);
      expect(movido.optimo?.punto.y).toBeCloseTo(3, 6);
    }
  });

  it('fuera del rango el óptimo salta a otro vértice', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const s = analizarSensibilidad(res).datos!;
    const rx = s.rangosCoeficientes.find((x) => x.variable === 'x')!;

    if (rx.hasta !== null) {
      const arriba = resolverGrafico({ ...mesasYSillas, coefX: rx.hasta + 1 }).datos!;
      expect(arriba.optimo?.punto.x).not.toBeCloseTo(6, 3);
    }
    if (rx.desde !== null) {
      const abajo = resolverGrafico({ ...mesasYSillas, coefX: rx.desde - 1 }).datos!;
      expect(abajo.optimo?.punto.x).not.toBeCloseTo(6, 3);
    }
  });

  it('en el caso de soluciones múltiples un rango tiene amplitud cero', () => {
    const mezclaB: DatosGrafico = {
      ...base,
      titulo: 'Mezcla B',
      objetivo: 'maximizar',
      nombreX: 'A',
      nombreY: 'B',
      coefX: 1,
      coefY: 2,
      restricciones: [r('r1', 'Recurso 1', 4, 2, '<=', 16), r('r2', 'Recurso 2', 1, 2, '<=', 8)],
    };
    const res = resolverGrafico(mezclaB).datos!;
    const s = analizarSensibilidad(res);

    expect(s.datos).not.toBeNull();
    expect(s.diagnosticos.some((x) => x.codigo === 'LP_SENSIBILIDAD_MULTIPLE')).toBe(true);

    const rx = s.datos!.rangosCoeficientes.find((x) => x.variable === 'x')!;
    // El coeficiente actual coincide con uno de los extremos: por eso hay empate.
    const enExtremo =
      (rx.desde !== null && Math.abs(rx.desde - rx.valorActual) < 1e-6) ||
      (rx.hasta !== null && Math.abs(rx.hasta - rx.valorActual) < 1e-6);
    expect(enExtremo).toBe(true);
  });
});

describe('casos sin análisis posible', () => {
  it('no hay sensibilidad en un problema infactible', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Infactible',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('techo', 'Techo', 1, 1, '<=', 2), r('piso', 'Piso', 1, 1, '>=', 10)],
    }).datos!;

    const s = analizarSensibilidad(res);
    expect(s.datos).toBeNull();
    expect(s.diagnosticos.some((x) => x.codigo === 'LP_SIN_SENSIBILIDAD')).toBe(true);
  });

  it('no hay sensibilidad en un problema no acotado', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'No acotada',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('min', 'Mínimo', 1, 1, '>=', 4)],
    }).datos!;

    const s = analizarSensibilidad(res);
    expect(s.datos).toBeNull();
    expect(s.diagnosticos.some((x) => x.codigo === 'LP_SIN_SENSIBILIDAD')).toBe(true);
  });

  it('advierte cuando el vértice óptimo es degenerado', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Degenerado',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('a', 'A', 1, 1, '<=', 10), r('b', 'B', 1, 0, '<=', 5), r('c', 'C', 0, 1, '<=', 5)],
    }).datos!;

    const s = analizarSensibilidad(res);
    expect(s.datos?.degenerado).toBe(true);
    expect(s.diagnosticos.some((x) => x.codigo === 'LP_SENSIBILIDAD_DEGENERADA')).toBe(true);
  });
});

describe('sensibilidad en los ejercicios de la biblioteca', () => {
  it('todos los ejercicios con solución producen un análisis coherente', () => {
    for (const e of ejerciciosDeTema('grafico')) {
      if (e.datos.tipo !== 'grafico') continue;
      const res = resolverGrafico({ ...e.datos, titulo: e.titulo }).datos;
      if (res === null || res.desenlace === 'infactible' || res.desenlace === 'no_acotada') continue;

      const s = analizarSensibilidad(res);
      expect(s.datos, `${e.id} sin análisis`).not.toBeNull();
      expect(s.datos!.preciosSombra.length).toBe(e.datos.restricciones.length);

      // Cada precio sombra debe coincidir con la derivada numérica.
      for (const p of s.datos!.preciosSombra) {
        const numerico = precioSombraNumerico({ ...e.datos, titulo: e.titulo }, p.restriccion.id, 1e-3);
        if (numerico === null) continue;
        expect(p.valor, `${e.id} / ${p.restriccion.nombre}`).toBeCloseTo(numerico, 3);
      }
    }
  });

  it('detecta responder con un coeficiente de la función objetivo', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra')!;
    const ev = evaluarRespuesta(e, pregunta, 5); // el margen por mesa, no el precio sombra
    expect(ev.codigoError).toBe('GRAFICO_SOMBRA_ES_COEFICIENTE');
    expect(ev.mensaje).toContain('unidad más de **recurso**');
  });

  it('detecta responder con el valor óptimo de Z', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra')!;
    const ev = evaluarRespuesta(e, pregunta, 45);
    expect(ev.codigoError).toBe('GRAFICO_SOMBRA_ES_Z');
    expect(ev.mensaje).toContain('tasa de cambio');
  });

  it('detecta dar el precio sombra de la otra restricción activa', () => {
    const e = ejercicioPorId('graf-01')!;
    if (e.datos.tipo !== 'grafico') throw new Error('datos inesperados');
    const s = analizarSensibilidad(resolverGrafico({ ...e.datos, titulo: e.titulo }).datos!).datos!;
    const otra = s.preciosSombra.find((x) => x.restriccion.id === 'mano_obra')!;

    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra')!;
    const ev = evaluarRespuesta(e, pregunta, otra.valor);
    expect(ev.codigoError).toBe('GRAFICO_SOMBRA_OTRA_RESTRICCION');
  });

  it('detecta afirmar que un recurso agotado vale cero', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra')!;
    const ev = evaluarRespuesta(e, pregunta, 0);
    expect(ev.codigoError).toBe('GRAFICO_SOMBRA_CERO_INDEBIDO');
  });

  it('detecta responder el incremento en vez del total en el rango de factibilidad', () => {
    const e = ejercicioPorId('graf-01')!;
    if (e.datos.tipo !== 'grafico') throw new Error('datos inesperados');
    const s = analizarSensibilidad(resolverGrafico({ ...e.datos, titulo: e.titulo }).datos!).datos!;
    const masValioso = s.recursoMasValioso!;

    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.rangoFactibilidad');
    if (pregunta === undefined || masValioso.rangoHasta === null) return;

    const incremento = masValioso.rangoHasta - masValioso.restriccion.c;
    const ev = evaluarRespuesta(e, pregunta, incremento);
    expect(ev.codigoError).toBe('GRAFICO_RANGO_ES_INCREMENTO');
  });

  it('acepta el precio sombra correcto', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra')!;
    const ev = evaluarRespuesta(e, pregunta, 5 / 16);
    expect(ev.correcta).toBe(true);
  });

  it('el ejercicio de mesas y sillas guarda el precio sombra correcto', () => {
    const e = ejercicioPorId('graf-01')!;
    if (e.datos.tipo !== 'grafico') throw new Error('datos inesperados');
    const s = analizarSensibilidad(resolverGrafico({ ...e.datos, titulo: e.titulo }).datos!).datos!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.precioSombra');

    expect(pregunta, 'falta la pregunta de precio sombra').toBeDefined();
    expect(s.recursoMasValioso).not.toBeNull();
    expect(pregunta!.respuesta).toBeCloseTo(s.recursoMasValioso!.valor, 6);
  });
});
