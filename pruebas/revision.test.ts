/**
 * Pruebas de la calificación docente de las interpretaciones.
 *
 * Lo que vigilan, en orden de importancia: que el puntaje automático nunca se
 * mueva, que la rúbrica reparta los puntos según sus pesos, y que la rúbrica
 * del curso sea la del documento y no una versión aproximada.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { RUBRICAS, rubricaPorId, rubricaSugerida } from '@/datos/rubricas';
import { fuentePorId } from '@/datos/fuentes';
import { esquemaIntento, esquemaRubrica, validar, type Ejercicio, type Intento, type Revision } from '@/esquemas';
import {
  aplicarRevision,
  bandejaDeRevision,
  preguntasRevisables,
  puntosDeRubrica,
  notaDeIntento,
  resumirRevision,
  rubricaCompleta,
} from '@/nucleo/revision';

const ejercicioDe = (id: string): Ejercicio => BIBLIOTECA_INICIAL.find((e) => e.id === id)!;

/** Intento con todas las preguntas respondidas y ninguna interpretación revisada. */
function intentoDe(ejercicio: Ejercicio, textoInterpretacion = 'Una respuesta escrita.'): Intento {
  return {
    id: 'intento-prueba',
    ejercicioId: ejercicio.id,
    perfilId: 'perfil-1',
    tema: ejercicio.tema,
    modo: 'practica',
    iniciadoEn: '2026-08-28T10:00:00.000Z',
    finalizadoEn: '2026-08-28T10:20:00.000Z',
    segundosEmpleados: 1200,
    respuestas: ejercicio.preguntas.map((p) => ({
      preguntaId: p.id,
      valor: p.tipo === 'interpretacion' ? textoInterpretacion : 1,
      correcta: p.tipo === 'interpretacion' ? null : true,
      puntosObtenidos: p.tipo === 'interpretacion' ? 0 : p.puntos,
      retroalimentacion: '',
      pistasUsadas: 0,
      intentos: 1,
      revision: null,
    })),
    puntaje: 10,
    puntajeMaximo: 12,
    completado: true,
    erroresDetectados: [],
  };
}

const revision = (puntos: number): Revision => ({
  puntos,
  rubricaId: null,
  niveles: {},
  comentario: 'Bien argumentado.',
  revisadoEn: '2026-08-28T12:00:00.000Z',
  revisadoPor: 'Docente',
});

describe('rúbricas', () => {
  it('todas validan y sus pesos suman 100 %', () => {
    for (const r of RUBRICAS) {
      const v = validar(esquemaRubrica, r);
      expect(v.ok, `${r.id}: ${v.errores.join(' | ')}`).toBe(true);
      expect(r.criterios.reduce((t, c) => t + c.peso, 0), r.id).toBeCloseTo(100, 9);
    }
  });

  it('la rúbrica del curso es la del documento, con sus seis criterios y cuatro niveles', () => {
    const r = rubricaPorId('rubrica-tarea1')!;
    expect(r.origen).toBe('textual');
    expect(fuentePorId(r.fuenteId)).not.toBeNull();
    expect(r.criterios.map((c) => c.peso)).toEqual([30, 15, 15, 10, 15, 15]);
    for (const c of r.criterios) {
      expect(c.niveles.map((n) => n.porcentaje), c.id).toEqual([100, 80, 40, 10]);
      // Los descriptores vienen del documento: ninguno puede quedar vacío.
      for (const n of c.niveles) expect(n.descripcion.length, `${c.id}/${n.id}`).toBeGreaterThan(10);
    }
  });

  it('la rúbrica de interpretación se declara como propuesta y sin fuente', () => {
    const r = rubricaPorId('rubrica-interpretacion')!;
    expect(r.origen).toBe('propuesta');
    expect(r.fuenteId).toBeNull();
    expect(r.atribucion).toMatch(/Propuesta de la aplicación/);
  });

  it('el ensayo de la Tarea Semana 1 sugiere su propia rúbrica; el resto, la corta', () => {
    expect(rubricaSugerida('fund-02').id).toBe('rubrica-tarea1');
    expect(rubricaSugerida('equi-04').id).toBe('rubrica-interpretacion');
  });
});

describe('puntos de la rúbrica', () => {
  const rubrica = rubricaPorId('rubrica-tarea1')!;

  it('todo en el nivel máximo otorga el puntaje completo', () => {
    const niveles = Object.fromEntries(rubrica.criterios.map((c) => [c.id, 'excelente']));
    expect(puntosDeRubrica(2, rubrica, niveles)).toBeCloseTo(2, 9);
    expect(rubricaCompleta(rubrica, niveles)).toBe(true);
  });

  it('reparte según los pesos: los puntos de la diapositiva del documento', () => {
    // El documento tabula los 2 puntos del ensayo: 0,6 el primer criterio con
    // «Excelente» y 0,48 con «Bueno».
    expect(puntosDeRubrica(2, rubrica, { componentes: 'excelente' })).toBeCloseTo(0.6, 9);
    expect(puntosDeRubrica(2, rubrica, { componentes: 'bueno' })).toBeCloseTo(0.48, 9);
    expect(puntosDeRubrica(2, rubrica, { componentes: 'mejorar' })).toBeCloseTo(0.24, 9);
    expect(puntosDeRubrica(2, rubrica, { componentes: 'insuficiente' })).toBeCloseTo(0.06, 9);
    expect(puntosDeRubrica(2, rubrica, { tipo: 'excelente' })).toBeCloseTo(0.3, 9);
    expect(puntosDeRubrica(2, rubrica, { mejora: 'excelente' })).toBeCloseTo(0.2, 9);
  });

  it('un criterio sin nivel elegido aporta cero y la rúbrica queda incompleta', () => {
    const niveles = { componentes: 'excelente' };
    expect(puntosDeRubrica(2, rubrica, niveles)).toBeCloseTo(0.6, 9);
    expect(rubricaCompleta(rubrica, niveles)).toBe(false);
  });

  it('un nivel inexistente no otorga puntos ni completa la rúbrica', () => {
    const niveles = Object.fromEntries(rubrica.criterios.map((c) => [c.id, 'inventado']));
    expect(puntosDeRubrica(2, rubrica, niveles)).toBe(0);
    expect(rubricaCompleta(rubrica, niveles)).toBe(false);
  });
});

describe('resumen de la revisión', () => {
  const ejercicio = ejercicioDe('equi-04');
  const revisables = preguntasRevisables(ejercicio);

  it('el ejercicio tiene interpretaciones que revisar', () => {
    expect(revisables.length).toBeGreaterThan(0);
  });

  it('sin revisar, todas quedan pendientes y la nota final es la automática', () => {
    const r = resumirRevision(intentoDe(ejercicio), ejercicio);
    expect(r.pendientes).toBe(revisables.length);
    expect(r.revisadas).toBe(0);
    expect(r.puntosRevision).toBe(0);
    expect(r.notaFinal).toBe(10);
    expect(r.completa).toBe(false);
  });

  it('la revisión suma sin tocar el puntaje automático', () => {
    const base = intentoDe(ejercicio);
    const primera = revisables[0]!;
    const conRevision = aplicarRevision(base, primera.id, revision(primera.puntos));

    // Lo que el estudiante vio al terminar no cambia.
    expect(conRevision.puntaje).toBe(base.puntaje);
    expect(conRevision.puntajeMaximo).toBe(base.puntajeMaximo);

    const r = resumirRevision(conRevision, ejercicio);
    expect(r.revisadas).toBe(1);
    expect(r.pendientes).toBe(revisables.length - 1);
    expect(r.puntosRevision).toBeCloseTo(primera.puntos, 9);
    expect(r.notaFinal).toBeCloseTo(10 + primera.puntos, 9);
    expect(r.notaMaxima).toBeCloseTo(12 + r.puntosMaximosRevision, 9);
  });

  it('retirar la calificación devuelve la respuesta a pendiente', () => {
    const primera = revisables[0]!;
    const conRevision = aplicarRevision(intentoDe(ejercicio), primera.id, revision(primera.puntos));
    const retirada = aplicarRevision(conRevision, primera.id, null);
    expect(resumirRevision(retirada, ejercicio).revisadas).toBe(0);
    expect(resumirRevision(retirada, ejercicio).pendientes).toBe(revisables.length);
  });

  it('una interpretación en blanco no queda pendiente, pero sí cuesta puntos', () => {
    const enBlanco = intentoDe(ejercicio, '   ');
    const r = resumirRevision(enBlanco, ejercicio);
    expect(r.pendientes).toBe(0);
    expect(r.enBlanco).toBe(revisables.length);
    expect(r.completa).toBe(true);
    // El máximo sigue incluyendo esos puntos: dejarla en blanco no los perdona.
    expect(r.puntosMaximosRevision).toBeGreaterThan(0);
    expect(r.notaFinal).toBeLessThan(r.notaMaxima);
  });
});

describe('bandeja de revisión', () => {
  const ejercicio = ejercicioDe('equi-04');

  it('trae solo interpretaciones respondidas, con las pendientes primero', () => {
    const sinRevisar = intentoDe(ejercicio);
    const primera = preguntasRevisables(ejercicio)[0]!;
    const revisado: Intento = {
      ...aplicarRevision(intentoDe(ejercicio), primera.id, revision(1)),
      id: 'intento-2',
      finalizadoEn: '2026-08-27T10:00:00.000Z',
    };

    const bandeja = bandejaDeRevision([revisado, sinRevisar], BIBLIOTECA_INICIAL);
    expect(bandeja.length).toBeGreaterThan(0);
    // Ninguna entrada corresponde a una pregunta numérica.
    expect(bandeja.every((x) => x.pregunta.tipo === 'interpretacion')).toBe(true);
    // La primera está sin revisar.
    expect(bandeja[0]!.respuesta.revision).toBeNull();
    // Y las revisadas quedan al final.
    expect(bandeja.at(-1)!.respuesta.revision).not.toBeNull();
  });

  it('descarta las respuestas en blanco: no hay nada que leer', () => {
    expect(bandejaDeRevision([intentoDe(ejercicio, '')], BIBLIOTECA_INICIAL)).toHaveLength(0);
  });

  it('ignora los intentos de ejercicios que ya no existen', () => {
    const huerfano = { ...intentoDe(ejercicio), ejercicioId: 'no-existe' };
    expect(bandejaDeRevision([huerfano], BIBLIOTECA_INICIAL)).toHaveLength(0);
  });
});

describe('la nota que ven todas las pantallas', () => {
  const ejercicio = ejercicioDe('equi-04');

  it('sin revisar es el puntaje automático, para no cambiarle el número al estudiante', () => {
    const n = notaDeIntento(intentoDe(ejercicio), ejercicio);
    expect(n.conRevision).toBe(false);
    expect(n.puntaje).toBe(10);
    expect(n.maximo).toBe(12);
    expect(n.porcentaje).toBeCloseTo((10 / 12) * 100, 9);
    expect(n.pendientes).toBeGreaterThan(0);
  });

  it('con una interpretación calificada pasa a ser la nota final', () => {
    const primera = preguntasRevisables(ejercicio)[0]!;
    const conRevision = aplicarRevision(intentoDe(ejercicio), primera.id, revision(2));
    const n = notaDeIntento(conRevision, ejercicio);
    const r = resumirRevision(conRevision, ejercicio);

    expect(n.conRevision).toBe(true);
    expect(n.puntaje).toBeCloseTo(12, 9);
    expect(n.maximo).toBeCloseTo(r.notaMaxima, 9);
    expect(n.porcentaje).toBeCloseTo(r.porcentajeFinal, 9);
  });

  it('si el ejercicio ya no existe, cae al puntaje automático sin romperse', () => {
    const n = notaDeIntento(intentoDe(ejercicio), undefined);
    expect(n.conRevision).toBe(false);
    expect(n.porcentaje).toBeCloseTo((10 / 12) * 100, 9);
  });
});

describe('persistencia', () => {
  it('un intento con revisión sigue validando contra el esquema', () => {
    const ejercicio = ejercicioDe('equi-04');
    const primera = preguntasRevisables(ejercicio)[0]!;
    const conRevision = aplicarRevision(intentoDe(ejercicio), primera.id, revision(2));
    const v = validar(esquemaIntento, conRevision);
    expect(v.ok, v.errores.join(' | ')).toBe(true);
  });

  it('un intento guardado antes de que existiera la revisión sigue cargando', () => {
    const ejercicio = ejercicioDe('equi-04');
    const viejo = {
      ...intentoDe(ejercicio),
      respuestas: intentoDe(ejercicio).respuestas.map(({ revision: _, ...resto }) => resto),
    };
    const v = validar(esquemaIntento, viejo);
    expect(v.ok, v.errores.join(' | ')).toBe(true);
    expect(v.datos!.respuestas.every((r) => r.revision === null)).toBe(true);
  });
});
