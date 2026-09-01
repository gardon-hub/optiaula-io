/**
 * Pruebas de la compresión del proyecto.
 *
 * Lo que vigilan, en orden de importancia: que se elija el conjunto más barato
 * que de verdad acorte **todas** las rutas críticas, que la red se resuelva otra
 * vez después de cada paso —porque comprimir cambia qué es crítico—, y que el
 * mínimo de costo total sea el que dice la curva.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { INCONSISTENCIAS_INICIALES } from '@/datos/inconsistencias';
import { resolverCPM } from '@/nucleo/cpm';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';
import { admiteCompresion, pendienteDe, resolverCrashing, type ActividadComprimible, type DatosCrashing } from '@/nucleo/crashing';

const act = (
  id: string,
  predecesoras: string[],
  duracion: number,
  duracionAcelerada: number | null,
  costoNormal = 0,
  costoAcelerado = 0,
): ActividadComprimible => ({ id, descripcion: id, predecesoras, duracion, duracionAcelerada, costoNormal, costoAcelerado });

const datos = (actividades: ActividadComprimible[], costoIndirectoPorPeriodo = 0): DatosCrashing => ({
  titulo: 'Prueba',
  actividades,
  unidadTiempo: 'días',
  costoIndirectoPorPeriodo,
  moneda: 'HNL',
});

describe('pendiente de costo', () => {
  it('reparte la diferencia de costo entre los periodos que se pueden ganar', () => {
    expect(pendienteDe(act('A', [], 8, 5, 42000, 49500))).toBeCloseTo(2500, 9);
    expect(pendienteDe(act('B', [], 4, 3, 18000, 20400))).toBeCloseTo(2400, 9);
  });

  it('una actividad que no se puede acortar no tiene pendiente', () => {
    expect(pendienteDe(act('C', [], 3, 3, 300, 300))).toBeNull();
    expect(pendienteDe(act('D', [], 3, null, 300, 900))).toBeNull();
  });

  it('una duración acelerada mayor que la normal se ignora y se avisa', () => {
    const r = resolverCrashing(datos([act('A', [], 5, 9, 100, 200), act('B', [], 4, 2, 100, 300)]));
    expect(r.diagnosticos.some((d) => d.codigo === 'CRASH_ACELERADA_MAYOR')).toBe(true);
    expect(r.datos!.pendientes.find((p) => p.id === 'A')!.pendiente).toBeNull();
  });

  it('sin nada comprimible no se puede resolver', () => {
    const r = resolverCrashing(datos([act('A', [], 5, null), act('B', ['A'], 3, null)]));
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'CRASH_NADA_COMPRIMIBLE')).toBe(true);
  });
});

describe('red en cadena: se acorta siempre lo más barato', () => {
  const r = resolverCrashing(
    datos(
      [
        act('A', [], 5, 3, 500, 620), // 60 por día
        act('B', ['A'], 4, 2, 400, 700), // 150 por día
        act('C', ['B'], 3, 3, 300, 300), // no se puede
      ],
      100,
    ),
  ).datos!;

  it('parte de la duración y el costo normales', () => {
    expect(r.duracionNormal).toBe(12);
    expect(r.costoDirectoNormal).toBe(1200);
    expect(r.costoTotalNormal).toBe(2400);
  });

  it('agota la actividad barata antes de tocar la cara', () => {
    expect(r.pasos.slice(0, 2).map((p) => p.acortadas)).toEqual([['A'], ['A']]);
    expect(r.pasos.slice(2).map((p) => p.acortadas)).toEqual([['B'], ['B']]);
  });

  it('no baja de la duración mínima alcanzable', () => {
    // A llega a 3, B a 2 y C se queda en 3.
    expect(r.duracionMinima).toBe(8);
  });

  it('el óptimo es donde el costo total toca fondo', () => {
    expect(r.duracionOptima).toBe(10);
    expect(r.costoTotalOptimo).toBe(2320);
    expect(r.duracionesOptimas).toEqual({ A: 3, B: 4, C: 3 });
    // Y de verdad es el mínimo de toda la curva.
    expect(Math.min(...r.curva.map((c) => c.total))).toBe(r.costoTotalOptimo);
  });
});

describe('rutas críticas paralelas', () => {
  // A y B en paralelo, ambas de 5, se juntan en D. Las dos rutas miden 7.
  const conD = (dur: number, acelerada: number | null, costoAcelerado = 0) =>
    datos(
      [
        act('A', [], 5, 3, 0, 100), // 50 por día
        act('B', [], 5, 3, 0, 120), // 60 por día
        act('D', ['A', 'B'], dur, acelerada, 0, costoAcelerado),
      ],
      200,
    );

  it('prefiere la actividad compartida cuando es más barata que las dos ramas', () => {
    // D cuesta 80 el día; acortar A y B juntas costaría 110.
    const r = resolverCrashing(conD(2, 1, 80)).datos!;
    expect(r.pasos[0]!.acortadas).toEqual(['D']);
    expect(r.pasos[0]!.costoDelPaso).toBeCloseTo(80, 9);
  });

  it('acorta las dos ramas a la vez cuando no hay actividad compartida', () => {
    const r = resolverCrashing(conD(2, null)).datos!;
    for (const p of r.pasos) {
      expect([...p.acortadas].sort()).toEqual(['A', 'B']);
      expect(p.costoDelPaso).toBeCloseTo(110, 9);
      // Y cada paso sí reduce el proyecto: pagar sin acortar sería el error.
      expect(p.duracionDespues).toBe(p.duracionAntes - 1);
    }
    expect(r.duracionMinima).toBe(5);
  });

  it('acortar una sola rama no habría servido: se comprueba resolviendo la red', () => {
    // Con A en 4 y B en 5, el proyecto sigue durando 7: la rama B manda.
    const soloA = resolverCPM({
      titulo: 'x',
      unidadTiempo: 'días',
      actividades: [
        { id: 'A', descripcion: 'A', predecesoras: [], duracion: 4 },
        { id: 'B', descripcion: 'B', predecesoras: [], duracion: 5 },
        { id: 'D', descripcion: 'D', predecesoras: ['A', 'B'], duracion: 2 },
      ],
    }).datos!;
    expect(soloA.duracionProyecto).toBe(7);
  });
});

describe('la ruta crítica cambia al comprimir', () => {
  // A dura 8 y B dura 6, en paralelo. A es la única crítica al principio.
  const r = resolverCrashing(
    datos([
      act('A', [], 8, 4, 0, 40), // 10 por día
      act('B', [], 6, 4, 0, 200), // 100 por día
    ]),
  ).datos!;

  it('comprime primero la única crítica, y barata', () => {
    expect(r.pasos.slice(0, 2).map((p) => p.acortadas)).toEqual([['A'], ['A']]);
  });

  it('en cuanto empatan, hay que pagar las dos', () => {
    // Después de dos pasos A y B miden 6: desde ahí las dos son críticas.
    expect(r.pasos.slice(2).every((p) => [...p.acortadas].sort().join() === 'A,B')).toBe(true);
    expect(r.pasos[2]!.costoDelPaso).toBeCloseTo(110, 9);
  });

  it('quien no recalcula seguiría acortando A sola y pagaría por nada', () => {
    const sinRecalcular = resolverCPM({
      titulo: 'x',
      unidadTiempo: 'días',
      actividades: [
        { id: 'A', descripcion: 'A', predecesoras: [], duracion: 5 },
        { id: 'B', descripcion: 'B', predecesoras: [], duracion: 6 },
      ],
    }).datos!;
    // A ya bajó a 5 pero el proyecto sigue en 6: ese día se pagó sin ganarlo.
    expect(sinRecalcular.duracionProyecto).toBe(6);
  });
});

describe('costo indirecto', () => {
  const cadena = (indirecto: number) =>
    resolverCrashing(
      datos([act('A', [], 5, 2, 0, 300), act('B', ['A'], 4, 2, 0, 400)], indirecto),
    ).datos!;

  it('sin costo indirecto nunca conviene comprimir, y se dice', () => {
    const r = resolverCrashing(datos([act('A', [], 5, 2, 0, 300)], 0));
    expect(r.datos!.duracionOptima).toBe(r.datos!.duracionNormal);
    expect(r.diagnosticos.some((d) => d.codigo === 'CRASH_SIN_INDIRECTO')).toBe(true);
  });

  it('cuanto más caro el tiempo, más conviene comprimir', () => {
    // Pendientes: A = 100 por día, B = 200 por día.
    expect(cadena(50).duracionOptima).toBe(9);
    expect(cadena(150).duracionOptima).toBe(6);
    expect(cadena(250).duracionOptima).toBe(4);
  });

  it('la curva es coherente: costo total = directo + indirecto × duración', () => {
    const r = cadena(150);
    for (const c of r.curva) {
      expect(c.indirecto).toBeCloseTo(150 * c.duracion, 9);
      expect(c.total).toBeCloseTo(c.directo + c.indirecto, 9);
    }
    // Y el directo nunca baja: comprimir siempre encarece la obra.
    for (let i = 1; i < r.curva.length; i++) {
      expect(r.curva[i]!.directo).toBeGreaterThanOrEqual(r.curva[i - 1]!.directo);
    }
  });

  it('avisa cuando la meta pedida no se puede alcanzar', () => {
    const r = resolverCrashing({ ...datos([act('A', [], 5, 4, 0, 100)], 100), duracionObjetivo: 2 });
    expect(r.diagnosticos.some((d) => d.codigo === 'CRASH_OBJETIVO_INALCANZABLE')).toBe(true);
    expect(r.datos!.duracionMinima).toBe(4);
  });
});

describe('los tres ejercicios derivados del tema', () => {
  const DEL_TEMA = BIBLIOTECA_INICIAL.filter((e) => e.id.startsWith('crash-'));

  const resolverDe = (id: string) => {
    const e = DEL_TEMA.find((x) => x.id === id)!;
    const d = e.datos as Extract<(typeof e)['datos'], { tipo: 'cpm' }>;
    return resolverCrashing({
      titulo: e.titulo,
      actividades: d.actividades.map((a) => ({ ...a })),
      unidadTiempo: d.unidadTiempo,
      costoIndirectoPorPeriodo: d.costoIndirectoPorPeriodo,
      moneda: d.moneda,
    }).datos!;
  };

  const respuesta = (id: string, clave: string): number | null => {
    const p = DEL_TEMA.find((x) => x.id === id)!.preguntas.find((q) => q.claveVerificacion === clave);
    return typeof p?.respuesta === 'number' ? p.respuesta : null;
  };

  it('son tres, derivados y sin fuente, porque el tema no está en el material', () => {
    expect(DEL_TEMA).toHaveLength(3);
    for (const e of DEL_TEMA) {
      expect(e.origen, e.id).toBe('derivado');
      expect(e.fuenteId, e.id).toBeNull();
      expect(e.inconsistencias, e.id).toContain('I-15');
    }
    const i15 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-15')!;
    expect(i15.archivoOrigen).toBeNull();
    expect(i15.decision).toBe('derivados');
  });

  it('los cinco ejercicios de ruta crítica del material siguen sin datos de compresión', () => {
    for (const e of BIBLIOTECA_INICIAL.filter((x) => x.id.startsWith('cpm-'))) {
      const d = e.datos as Extract<(typeof e)['datos'], { tipo: 'cpm' }>;
      expect(admiteCompresion(d.actividades.map((a) => ({ ...a }))), e.id).toBe(false);
      expect(d.costoIndirectoPorPeriodo, e.id).toBe(0);
    }
  });

  it('sala de ordeño: cadena simple, óptimo en 17 días', () => {
    const r = resolverDe('crash-01');
    expect(r.duracionNormal).toBe(21);
    expect(r.duracionOptima).toBe(17);
    expect(r.costoTotalNormal).toBe(197000);
    expect(r.costoTotalOptimo).toBe(194900);
    // Se acorta B una vez y A tres: las pendientes por debajo de los 3 000 diarios.
    expect(r.duracionesOptimas).toEqual({ A: 5, B: 3, C: 6, D: 3 });
  });

  it('planta de concentrado: la segunda ruta crítica detiene la compresión', () => {
    const r = resolverDe('crash-02');
    expect(r.duracionNormal).toBe(18);
    expect(r.duracionOptima).toBe(15);
    expect(r.costoTotalOptimo).toBe(337500);
    // Los últimos pasos exigen pagar las dos ramas a la vez, y por eso no convienen.
    const dobles = r.pasos.filter((p) => p.acortadas.length > 1);
    expect(dobles.length).toBeGreaterThan(0);
    for (const p of dobles) expect(p.duracionAntes).toBeLessThanOrEqual(r.duracionOptima);
  });

  it('galpón de engorde: se comprime B hasta que C se vuelve crítica', () => {
    const r = resolverDe('crash-03');
    expect(r.duracionNormal).toBe(17);
    expect(r.duracionOptima).toBe(12);
    expect(r.costoTotalOptimo).toBe(180000);
    // B baja de 10 a 7, que es donde empata con la ruta de C.
    expect(r.duracionesOptimas['B']).toBe(7);
    expect(r.duracionesOptimas['C']).toBe(7);
  });

  it('la retroalimentación reconoce los cuatro errores típicos del tema', () => {
    const ej = DEL_TEMA.find((e) => e.id === 'crash-03')!;
    const r = resolverDe('crash-03');
    const pregunta = (clave: string) => ej.preguntas.find((p) => p.claveVerificacion === clave)!;

    // Dividir el sobrecosto entre la duración normal, no entre lo que se gana.
    const b = r.pendientes.find((p) => p.id === 'B')!;
    const masBarata = [...r.pendientes].filter((p) => p.pendiente !== null).sort((a, x) => a.pendiente! - x.pendiente!)[0]!;
    expect(
      evaluarRespuesta(ej, pregunta('crashing.pendiente'), (masBarata.costoAcelerado - masBarata.costoNormal) / masBarata.duracionNormal)
        .codigoError,
    ).toBe('CRASH_DIVIDE_DURACION');

    // Dar el sobrecosto entero en lugar del precio por periodo.
    expect(evaluarRespuesta(ej, pregunta('crashing.pendiente'), b.costoAcelerado - b.costoNormal).codigoError).toBe(
      'CRASH_SIN_DIVIDIR',
    );

    // Comprimir hasta el tope aunque los últimos periodos no se paguen solos.
    expect(evaluarRespuesta(ej, pregunta('crashing.duracionOptima'), r.duracionMinima).codigoError).toBe(
      'CRASH_HASTA_EL_TOPE',
    );

    // No comprimir nada cuando sí conviene.
    expect(evaluarRespuesta(ej, pregunta('crashing.duracionOptima'), r.duracionNormal).codigoError).toBe(
      'CRASH_NO_COMPRIME',
    );

    // Olvidar el costo indirecto en el costo total.
    const mejor = r.curva.find((c) => c.duracion === r.duracionOptima)!;
    expect(evaluarRespuesta(ej, pregunta('crashing.costoTotalOptimo'), mejor.directo).codigoError).toBe(
      'CRASH_OLVIDA_INDIRECTO',
    );
  });

  it('las respuestas guardadas coinciden con lo que calcula el motor', () => {
    for (const id of ['crash-01', 'crash-02', 'crash-03']) {
      const r = resolverDe(id);
      expect(respuesta(id, 'cpm.duracionProyecto'), id).toBe(r.duracionNormal);
      expect(respuesta(id, 'crashing.duracionOptima'), id).toBe(r.duracionOptima);
      expect(respuesta(id, 'crashing.costoTotalOptimo'), id).toBeCloseTo(r.costoTotalOptimo, 6);
      const masBarata = [...r.pendientes].filter((p) => p.pendiente !== null).sort((a, b) => a.pendiente! - b.pendiente!)[0]!;
      expect(respuesta(id, 'crashing.pendiente'), id).toBeCloseTo(masBarata.pendiente!, 6);
    }
  });
});
