/**
 * Pruebas del módulo 8 — Método gráfico de programación lineal.
 *
 * Los valores de referencia salen de los tres problemas de la presentación
 * `metodo grafico.pptx` y de un cálculo independiente por fuerza bruta sobre
 * una malla fina, que no usa el mismo algoritmo que se está verificando.
 */

import { describe, expect, it } from 'vitest';

import {
  lineaIndiferencia,
  resolverGrafico,
  segmentosRestricciones,
  ventana,
  type DatosGrafico,
  type Restriccion,
} from '@/nucleo/grafico';
import { ejercicioPorId, ejerciciosDeTema } from '@/datos/ejercicios';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';
import { generarEjercicio } from '@/nucleo/generador';

const r = (id: string, nombre: string, a: number, b: number, relacion: Restriccion['relacion'], c: number): Restriccion => ({
  id,
  nombre,
  a,
  b,
  relacion,
  c,
  unidad: 'unidades',
});

const base = {
  unidadVariables: 'unidades',
  nombreObjetivo: 'la utilidad',
  unidadObjetivo: '$',
  noNegatividad: true,
} as const;

/**
 * Óptimo aproximado por fuerza bruta sobre una malla. No comparte código con
 * el solucionador: si ambos coinciden, es porque el resultado es correcto.
 */
function optimoPorMalla(d: DatosGrafico, maxX: number, maxY: number, pasos = 900): number | null {
  let mejor: number | null = null;

  for (let i = 0; i <= pasos; i++) {
    for (let j = 0; j <= pasos; j++) {
      const x = (maxX * i) / pasos;
      const y = (maxY * j) / pasos;

      let factible = true;
      for (const c of d.restricciones) {
        const valor = c.a * x + c.b * y;
        const tol = 1e-9 * Math.max(1, Math.abs(c.c));
        if (c.relacion === '<=' && valor > c.c + tol) factible = false;
        if (c.relacion === '>=' && valor < c.c - tol) factible = false;
        if (!factible) break;
      }
      if (!factible) continue;

      const z = d.coefX * x + d.coefY * y;
      if (mejor === null) mejor = z;
      else mejor = d.objetivo === 'maximizar' ? Math.max(mejor, z) : Math.min(mejor, z);
    }
  }
  return mejor;
}

describe('método gráfico — problemas de la presentación del curso', () => {
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

  it('resuelve el problema de mesas y sillas en (6, 3) con Z = 45', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    expect(res.desenlace).toBe('unica');
    expect(res.optimo?.punto.x).toBeCloseTo(6, 9);
    expect(res.optimo?.punto.y).toBeCloseTo(3, 9);
    expect(res.valorOptimo).toBeCloseTo(45, 9);
  });

  it('coincide con el óptimo hallado por fuerza bruta', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const porMalla = optimoPorMalla(mesasYSillas, 10, 10);
    expect(res.valorOptimo).toBeCloseTo(porMalla!, 1);
  });

  it('identifica los cuatro vértices de la región', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    expect(res.vertices.length).toBe(4);
    const puntos = res.vertices.map((v) => [v.punto.x, v.punto.y].join(','));
    for (const esperado of ['6,3', '8,0', '2,5', '2,0']) {
      expect(puntos).toContain(esperado);
    }
  });

  it('marca como activas las restricciones de material y mano de obra', () => {
    const res = resolverGrafico(mesasYSillas).datos!;
    const activas = res.holguras.filter((h) => h.activa).map((h) => h.restriccion.id);
    expect(activas).toContain('material');
    expect(activas).toContain('mano_obra');
    expect(activas).not.toContain('compromiso');
  });

  const mezclaA: DatosGrafico = {
    ...base,
    titulo: 'Mezcla A',
    objetivo: 'maximizar',
    nombreX: 'A',
    nombreY: 'B',
    coefX: 3,
    coefY: 1.5,
    restricciones: [r('r1', 'Recurso 1', 60, 20, '<=', 1200), r('r2', 'Recurso 2', 40, 50, '<=', 2000)],
  };

  it('el óptimo del problema de mezcla está en el vértice interior, no en los ejes', () => {
    const res = resolverGrafico(mezclaA).datos!;
    expect(res.optimo?.punto.x).toBeCloseTo(1000 / 110, 6);
    expect(res.optimo?.punto.y).toBeCloseTo(60 - 3 * (1000 / 110), 6);
    expect(res.valorOptimo).toBeCloseTo(76.3636, 3);

    // Los dos vértices sobre los ejes empatan en 60, por debajo del óptimo.
    const enEjes = res.vertices.filter((v) => v.punto.x === 0 || v.punto.y === 0);
    for (const v of enEjes) expect(v.valorObjetivo).toBeLessThanOrEqual(60 + 1e-9);
  });

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

  it('detecta soluciones óptimas múltiples cuando el objetivo es paralelo a una restricción', () => {
    const res = resolverGrafico(mezclaB);
    expect(res.datos?.desenlace).toBe('multiples');
    expect(res.datos?.optimos.length).toBe(2);
    expect(res.datos?.valorOptimo).toBeCloseTo(8, 9);
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_OPTIMOS_MULTIPLES')).toBe(true);
  });
});

describe('método gráfico — casos límite', () => {
  it('detecta una región no acotada en maximización', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'No acotada',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('min', 'Mínimo', 1, 1, '>=', 4)],
    });
    expect(res.datos?.desenlace).toBe('no_acotada');
    expect(res.datos?.valorOptimo).toBeNull();
    expect(res.datos?.direccionNoAcotada).not.toBeNull();
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_NO_ACOTADA')).toBe(true);
  });

  it('la misma región acotada por abajo sí tiene mínimo', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Mínimo alcanzable',
      objetivo: 'minimizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 2,
      coefY: 1,
      restricciones: [r('min', 'Mínimo', 1, 1, '>=', 4)],
    });
    expect(res.datos?.desenlace).toBe('unica');
    expect(res.datos?.valorOptimo).toBeCloseTo(4, 9);
  });

  it('detecta un problema infactible', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Infactible',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('techo', 'Techo', 1, 1, '<=', 2), r('piso', 'Piso', 1, 1, '>=', 10)],
    });
    expect(res.datos?.desenlace).toBe('infactible');
    expect(res.datos?.vertices.length).toBe(0);
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_INFACTIBLE')).toBe(true);
    expect(res.pasos.length).toBeGreaterThan(0);
  });

  it('avisa cuando una restricción es redundante', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Redundante',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [r('apretada', 'Apretada', 1, 1, '<=', 10), r('floja', 'Floja', 1, 1, '<=', 50)],
    });
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_RESTRICCION_REDUNDANTE')).toBe(true);
  });

  it('resuelve una minimización con restricciones de tipo mayor o igual', () => {
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
    expect(res.desenlace).toBe('unica');
    expect(res.valorOptimo).not.toBeNull();

    const porMalla = optimoPorMalla(dieta, 30, 30);
    expect(res.valorOptimo).toBeCloseTo(porMalla!, 0);
  });

  it('rechaza un modelo sin restricciones', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Sin restricciones',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [],
    });
    expect(res.datos).toBeNull();
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_SIN_RESTRICCIONES')).toBe(true);
  });

  it('admite restricciones de igualdad', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Con igualdad',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 2,
      coefY: 1,
      restricciones: [r('exacta', 'Mezcla exacta', 1, 1, '=', 10), r('techo', 'Techo de x', 1, 0, '<=', 6)],
    });
    expect(res.datos?.desenlace).toBe('unica');
    expect(res.datos?.optimo?.punto.x).toBeCloseTo(6, 9);
    expect(res.datos?.optimo?.punto.y).toBeCloseTo(4, 9);
    expect(res.datos?.valorOptimo).toBeCloseTo(16, 9);
  });

  it('detecta vértices degenerados cuando tres rectas se cruzan en el mismo punto', () => {
    const res = resolverGrafico({
      ...base,
      titulo: 'Degenerado',
      objetivo: 'maximizar',
      nombreX: 'x',
      nombreY: 'y',
      coefX: 1,
      coefY: 1,
      restricciones: [
        r('a', 'A', 1, 1, '<=', 10),
        r('b', 'B', 1, 0, '<=', 5),
        r('c', 'C', 0, 1, '<=', 5),
      ],
    });
    expect(res.diagnosticos.some((d) => d.codigo === 'LP_VERTICE_DEGENERADO')).toBe(true);
  });
});

describe('método gráfico — apoyos para dibujar', () => {
  const datos: DatosGrafico = {
    ...base,
    titulo: 'Dibujo',
    objetivo: 'maximizar',
    nombreX: 'x',
    nombreY: 'y',
    coefX: 5,
    coefY: 5,
    restricciones: [r('material', 'Material', 12, 8, '<=', 96), r('mano', 'Mano de obra', 6, 12, '<=', 72)],
  };

  it('recorta cada restricción a la ventana de dibujo', () => {
    const segmentos = segmentosRestricciones(datos, 10, 10);
    expect(segmentos.length).toBe(2);
    for (const s of segmentos) {
      expect(s.desde.x).toBeGreaterThanOrEqual(-1e-9);
      expect(s.hasta.x).toBeLessThanOrEqual(10 + 1e-9);
      expect(Math.hypot(s.hasta.x - s.desde.x, s.hasta.y - s.desde.y)).toBeGreaterThan(0);
    }
  });

  it('traza la línea de indiferencia para un valor de Z', () => {
    const linea = lineaIndiferencia(datos, 40, 12, 12);
    expect(linea).not.toBeNull();
    if (linea !== null) {
      // Todo punto de la línea debe cumplir 5x + 5y = 40.
      for (const p of linea) expect(5 * p.x + 5 * p.y).toBeCloseTo(40, 6);
    }
  });

  it('la ventana de dibujo abarca todos los vértices', () => {
    const res = resolverGrafico(datos).datos!;
    const v = ventana(res);
    for (const vert of res.vertices) {
      expect(vert.punto.x).toBeLessThanOrEqual(v.maxX);
      expect(vert.punto.y).toBeLessThanOrEqual(v.maxY);
    }
  });

  it('el polígono ordena los vértices sin cruces', () => {
    const res = resolverGrafico(datos).datos!;
    expect(res.poligono.length).toBe(res.vertices.length);

    // Un polígono simple ordenado tiene área positiva por la fórmula del cordón.
    let area = 0;
    for (let i = 0; i < res.poligono.length; i++) {
      const a = res.poligono[i]!;
      const b = res.poligono[(i + 1) % res.poligono.length]!;
      area += a.x * b.y - b.x * a.y;
    }
    expect(Math.abs(area / 2)).toBeGreaterThan(0);
  });
});

describe('método gráfico — biblioteca y retroalimentación', () => {
  it('la biblioteca trae los seis ejercicios del módulo', () => {
    expect(ejerciciosDeTema('grafico').length).toBe(6);
  });

  it('las respuestas guardadas coinciden con el motor', () => {
    for (const e of ejerciciosDeTema('grafico')) {
      if (e.datos.tipo !== 'grafico') continue;
      const res = resolverGrafico({ ...e.datos, titulo: e.titulo }).datos;
      if (res === null || res.desenlace === 'infactible') continue;

      const valorZ = e.preguntas.find((p) => p.claveVerificacion === 'grafico.valorOptimo')?.respuesta;
      expect(typeof valorZ, `${e.id} no guarda el valor óptimo`).toBe('number');
      expect(res.valorOptimo).toBeCloseTo(valorZ as number, 6);

      const cuenta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.vertices')?.respuesta;
      expect(res.vertices.length).toBe(cuenta);
    }
  });

  it('el caso infactible no ofrece preguntas numéricas con respuesta engañosa', () => {
    const e = ejercicioPorId('graf-06')!;
    if (e.datos.tipo === 'grafico') {
      expect(resolverGrafico({ ...e.datos, titulo: e.titulo }).datos?.desenlace).toBe('infactible');
    }
    expect(e.preguntas.some((p) => p.tipo === 'interpretacion')).toBe(true);
  });

  it('detecta evaluar solo los vértices sobre los ejes', () => {
    const e = ejercicioPorId('graf-02')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.valorOptimo')!;
    const ev = evaluarRespuesta(e, pregunta, 60);
    expect(ev.codigoError).toBe('GRAFICO_SOLO_EJES');
    expect(ev.mensaje).toContain('vértice interior');
  });

  it('detecta confundir maximizar con minimizar', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.valorOptimo')!;
    // El peor vértice de la región es (2, 0), con Z = 10.
    const ev = evaluarRespuesta(e, pregunta, 10);
    expect(ev.codigoError).toBe('GRAFICO_OBJETIVO_INVERTIDO');
  });

  it('detecta intercambiar las dos variables', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.optimoX')!;
    // El óptimo es (6, 3): responder 3 es dar la coordenada equivocada.
    const ev = evaluarRespuesta(e, pregunta, 3);
    expect(ev.codigoError).toBe('GRAFICO_VARIABLES_CAMBIADAS');
  });

  it('detecta contar restricciones en lugar de vértices', () => {
    const e = ejercicioPorId('graf-01')!;
    const pregunta = e.preguntas.find((p) => p.claveVerificacion === 'grafico.vertices')!;
    const ev = evaluarRespuesta(e, pregunta, 3);
    expect(ev.codigoError).toBe('GRAFICO_CUENTA_RESTRICCIONES');
  });

  it('el generador produce modelos válidos y verificados', () => {
    for (const semilla of [7, 101, 2026]) {
      const g = generarEjercicio({ tema: 'grafico', semilla, contexto: 'maiz' });
      expect(g.ejercicio, `semilla ${semilla}: ${g.verificaciones.filter((v) => !v.paso).map((v) => v.nombre).join(', ')}`).not.toBeNull();
      expect(g.verificaciones.every((v) => v.paso)).toBe(true);

      if (g.ejercicio?.datos.tipo === 'grafico') {
        const res = resolverGrafico({ ...g.ejercicio.datos, titulo: g.ejercicio.titulo }).datos!;
        expect(res.vertices.length).toBeGreaterThanOrEqual(3);
        expect(res.optimo).not.toBeNull();
      }
    }
  });
});
