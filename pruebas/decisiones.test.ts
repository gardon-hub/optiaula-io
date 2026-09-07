/**
 * Pruebas de la aplicación de las decisiones de auditoría.
 *
 * El riesgo que cubren no es que la transformación falle ruidosamente sino lo
 * contrario: que el panel diga «decidido» y el ejercicio se quede igual. Eso
 * pasaba antes con la opción `matriz` de I-01, cuya rama buscaba en el enunciado
 * un texto que ya no existía y no cambiaba nada sin avisar.
 *
 * Por eso cada prueba comprueba el **dato resultante**, no que la función haya
 * corrido.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { INCONSISTENCIAS_INICIALES } from '@/datos/inconsistencias';
import { esquemaEjercicio, validar, type DatosEjercicio, type Ejercicio, type Inconsistencia } from '@/esquemas';
import { aplicarDecisiones, aplicarDecisionesA, tieneTransformacion } from '@/nucleo/aplicarDecisiones';
import { resolverEjercicio } from '@/nucleo/resolverEjercicio';
import { resolverProductividad } from '@/nucleo/productividad';

const ejercicioDe = (id: string): Ejercicio => BIBLIOTECA_INICIAL.find((e) => e.id === id)!;

/** Las inconsistencias con una decisión distinta a la vigente. */
const con = (id: string, opcion: string): Inconsistencia[] =>
  INCONSISTENCIAS_INICIALES.map((i) => (i.id === id ? { ...i, decision: opcion, decididoEn: '2026-08-31T00:00:00.000Z' } : i));

const datos = <T extends DatosEjercicio['tipo']>(e: Ejercicio, _tipo: T): Extract<DatosEjercicio, { tipo: T }> =>
  e.datos as Extract<DatosEjercicio, { tipo: T }>;

describe('las cuatro decisiones quedaron tomadas', () => {
  it('ninguna inconsistencia queda pendiente', () => {
    const pendientes = INCONSISTENCIAS_INICIALES.filter((i) => i.decision === null);
    expect(pendientes.map((i) => i.id)).toEqual([]);
  });

  it('cada decisión corresponde a una opción que la inconsistencia ofrece', () => {
    // Que la decisión sea una de las opciones es lo que hace que el panel pueda
    // volver a mostrarla marcada. Una decisión con un identificador que ninguna
    // opción declara dejaría el panel sin nada seleccionado.
    for (const i of INCONSISTENCIAS_INICIALES) {
      expect(i.opciones.map((o) => o.id), i.id).toContain(i.decision);
    }
  });

  it('las decididas en sesión llevan fecha; las de construcción, no', () => {
    // `decididoEn` registra cuándo el docente decidió en la aplicación. Las
    // decisiones que se tomaron al transcribir el material no tienen una fecha
    // que se pueda sostener, y ponerles una inventada sería falsear el
    // registro. La pantalla de auditoría ya contempla el caso sin fecha.
    const conFecha = INCONSISTENCIAS_INICIALES.filter((i) => i.decididoEn !== null).map((i) => i.id);
    expect(conFecha).toEqual(['I-01', 'I-02', 'I-03', 'I-04', 'I-06', 'I-07', 'I-12', 'I-13', 'I-14', 'I-16', 'I-18', 'I-19']);
  });

  it('las cuatro que faltaban quedaron como las decidió el docente', () => {
    const decisionDe = (id: string) => INCONSISTENCIAS_INICIALES.find((x) => x.id === id)!.decision;
    expect(decisionDe('I-01')).toBe('matriz');
    expect(decisionDe('I-02')).toBe('suma');
    expect(decisionDe('I-03')).toBe('menor');
    expect(decisionDe('I-06')).toBe('generador');
  });
});

describe('las decisiones vigentes dejan los datos como están', () => {
  it('I-01 «matriz» conserva la tabla 4 × 4 del documento', () => {
    const e = aplicarDecisiones(ejercicioDe('asig-03'), INCONSISTENCIAS_INICIALES);
    const d = datos(e, 'asignacion');
    expect(d.filas).toHaveLength(4);
    expect(d.columnas).toHaveLength(4);
    for (const fila of d.matriz) expect(fila).toHaveLength(4);
  });

  it('I-02 «suma» no fija un costo total declarado', () => {
    const e = aplicarDecisiones(ejercicioDe('prod-01'), INCONSISTENCIAS_INICIALES);
    expect(datos(e, 'productividad').costoTotalDeclarado).toBeNull();
    // La respuesta guardada es la suma de los componentes.
    expect(e.preguntas.find((p) => p.claveVerificacion === 'productividad.costoTotal')?.respuesta).toBe(30800);
  });

  it('I-03 «menor» deja la distribución de 6 650 como la principal', () => {
    const e = aplicarDecisiones(ejercicioDe('dist-02'), INCONSISTENCIAS_INICIALES);
    const d = datos(e, 'distribucion');
    expect(d.plano.id).toBe('diapositiva5');
    expect(d.planoReferencia!.id).toBe('diapositiva6');
    expect(resolverEjercicio(e)!.datos).not.toBeNull();
  });

  it('con las decisiones vigentes ningún ejercicio se transforma', () => {
    // Es la comprobación de que la biblioteca cargada ya refleja lo decidido:
    // si algo cambiara aquí, los datos del repositorio y lo que ve el
    // estudiante no coincidirían.
    for (const e of BIBLIOTECA_INICIAL) {
      expect(aplicarDecisiones(e, INCONSISTENCIAS_INICIALES), e.id).toBe(e);
    }
  });
});

describe('la otra opción sí cambia el ejercicio', () => {
  it('I-01 «enunciado» recorta la matriz a 3 × 3 y recalcula la solución', () => {
    const original = ejercicioDe('asig-03');
    const e = aplicarDecisiones(original, con('I-01', 'enunciado'));
    const d = datos(e, 'asignacion');

    expect(d.filas).toHaveLength(3);
    expect(d.columnas).toHaveLength(3);
    for (const fila of d.matriz) expect(fila).toHaveLength(3);

    // La respuesta guardada ya no es la del problema 4 × 4.
    const antes = original.preguntas.find((p) => p.claveVerificacion === 'asignacion.valorTotal')?.respuesta;
    const despues = e.preguntas.find((p) => p.claveVerificacion === 'asignacion.valorTotal')?.respuesta;
    expect(despues).not.toBe(antes);

    // Y coincide con lo que el motor calcula sobre los datos recortados.
    expect(despues).toBe(resolverEjercicio(e)!.datos !== null ? (resolverEjercicio(e)!.datos as { valorTotal: number }).valorTotal : null);
    expect(validar(esquemaEjercicio, e).ok).toBe(true);
  });

  it('I-02 «declarado» fija L 25 000 y con eso cambian todas las razones', () => {
    const e = aplicarDecisiones(ejercicioDe('prod-01'), con('I-02', 'declarado'));
    expect(datos(e, 'productividad').costoTotalDeclarado).toBe(25000);
    expect(e.preguntas.find((p) => p.claveVerificacion === 'productividad.costoTotal')?.respuesta).toBe(25000);

    // La productividad total pasa de 49 000/30 800 a 49 000/25 000.
    const total = e.preguntas.find((p) => p.claveVerificacion === 'productividad.total')?.respuesta as number;
    expect(total).toBeCloseTo(49000 / 25000, 6);

    // Y el motor calcula lo mismo que dice la respuesta guardada: la clave no
    // se parchea a mano, se rehace con el solucionador.
    const r = resolverProductividad({ ...datos(e, 'productividad'), titulo: e.titulo, periodo: '' }).datos!;
    expect(r.costoTotal).toBe(25000);
  });

  it('I-03 «rotulo» pone como principal la distribución peor, que es lo que pediría', () => {
    const e = aplicarDecisiones(ejercicioDe('dist-02'), con('I-03', 'rotulo'));
    const d = datos(e, 'distribucion');
    expect(d.plano.id).toBe('diapositiva6');
    expect(d.planoReferencia!.id).toBe('diapositiva5');
  });

  it('cambiar de opinión no encadena transformaciones', () => {
    // Se parte siempre del original, así que aplicar dos veces la misma opción
    // da lo mismo que aplicarla una. Con el intercambio de planos de I-03 esto
    // importa de verdad: hacerlo dos veces devolvería el original en silencio.
    const original = ejercicioDe('dist-02');
    const unaVez = aplicarDecisiones(original, con('I-03', 'rotulo'));
    const otraVez = aplicarDecisiones(original, con('I-03', 'rotulo'));
    expect(datos(otraVez, 'distribucion').plano.id).toBe(datos(unaVez, 'distribucion').plano.id);

    // Y volver a la opción vigente restituye exactamente el original.
    const devuelto = aplicarDecisiones(original, INCONSISTENCIAS_INICIALES);
    expect(datos(devuelto, 'distribucion').plano.id).toBe('diapositiva5');
  });
});

describe('lo que no se puede aplicar no se finge', () => {
  it('I-06 no tiene transformación: no cambia ningún ejercicio', () => {
    // Es una decisión metodológica —los casos desbalanceados los cubre el
    // generador—, no un cambio de datos. Declararlo es preferible a inventar
    // una transformación que no corresponde.
    expect(tieneTransformacion('I-06', 'generador')).toBe(false);
    expect(tieneTransformacion('I-06', 'variantes')).toBe(false);

    const antes = aplicarDecisionesA(BIBLIOTECA_INICIAL, INCONSISTENCIAS_INICIALES);
    const despues = aplicarDecisionesA(BIBLIOTECA_INICIAL, con('I-06', 'variantes'));
    expect(despues.map((e) => e.id)).toEqual(antes.map((e) => e.id));
  });

  it('sabe qué opciones cambian los datos y cuáles no', () => {
    expect(tieneTransformacion('I-01', 'enunciado')).toBe(true);
    expect(tieneTransformacion('I-02', 'declarado')).toBe(true);
    expect(tieneTransformacion('I-03', 'rotulo')).toBe(true);
    // Las opciones vigentes son las de los datos tal como vienen.
    expect(tieneTransformacion('I-01', 'matriz')).toBe(false);
    expect(tieneTransformacion('I-02', 'suma')).toBe(false);
    expect(tieneTransformacion('I-03', 'menor')).toBe(false);
  });

  it('una decisión de un tema que no corresponde deja el ejercicio intacto', () => {
    // La transformación de I-02 solo aplica a datos de productividad; si el
    // ejercicio fuera de otro tipo se devuelve sin tocar en vez de romperse.
    const ajeno = ejercicioDe('cpm-01');
    expect(aplicarDecisiones(ajeno, con('I-02', 'declarado'))).toBe(ajeno);
  });
});

describe('la biblioteca transformada sigue siendo válida', () => {
  it('todos los ejercicios validan con cualquier combinación de decisiones', () => {
    for (const [id, opcion] of [
      ['I-01', 'enunciado'],
      ['I-02', 'declarado'],
      ['I-03', 'rotulo'],
    ] as const) {
      for (const e of aplicarDecisionesA(BIBLIOTECA_INICIAL, con(id, opcion))) {
        const v = validar(esquemaEjercicio, e);
        expect(v.ok, `${id}:${opcion} rompió ${e.id}: ${v.errores.join(' | ')}`).toBe(true);
      }
    }
  });

  it('ningún ejercicio transformado se queda sin preguntas', () => {
    for (const [id, opcion] of [
      ['I-01', 'enunciado'],
      ['I-02', 'declarado'],
      ['I-03', 'rotulo'],
    ] as const) {
      const e = aplicarDecisionesA(BIBLIOTECA_INICIAL, con(id, opcion)).find((x) =>
        x.inconsistencias.includes(id),
      )!;
      expect(e.preguntas.length, `${id}:${opcion}`).toBeGreaterThan(0);
      expect(e.preguntas.some((p) => p.tipo === 'interpretacion'), `${id}:${opcion}`).toBe(true);
    }
  });
});
