/**
 * Pruebas del editor de datos por tipo.
 *
 * Lo que vigilan no es la interfaz sino las dos cosas que pueden dejar un
 * ejercicio roto sin que nadie se entere: que agregar o quitar filas mantenga
 * las estructuras rectangulares consistentes, y que las respuestas guardadas se
 * detecten como obsoletas cuando cambian los datos.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { esquemaEjercicio, validar, type DatosEjercicio, type Ejercicio } from '@/esquemas';
import { preguntasDe } from '@/nucleo/preguntas';
import { diagnosticosDe, resolverEjercicio } from '@/nucleo/resolverEjercicio';

const ejercicioDe = (id: string): Ejercicio => BIBLIOTECA_INICIAL.find((e) => e.id === id)!;

/**
 * Reproduce la comparación que hace el editor entre lo guardado y el motor.
 *
 * El emparejamiento va por identificador de pregunta, no por clave de
 * verificación: doce ejercicios de la biblioteca repiten la misma clave en
 * varias preguntas —una por sitio candidato, una por variable— y emparejar por
 * clave compararía la respuesta de una con la de otra.
 */
function respuestasDesactualizadas(ejercicio: Ejercicio): { clave: string | null; guardada: number; nueva: number }[] {
  const nuevas = new Map(preguntasDe(ejercicio.datos, ejercicio.titulo).map((p) => [p.id, p]));
  return ejercicio.preguntas.flatMap((p) => {
    if (typeof p.respuesta !== 'number') return [];
    const nueva = nuevas.get(p.id);
    if (nueva === undefined || nueva.claveVerificacion !== p.claveVerificacion) return [];
    if (typeof nueva.respuesta !== 'number') return [];
    const escala = Math.max(1e-9, Math.abs(nueva.respuesta));
    if (Math.abs(nueva.respuesta - p.respuesta) / escala <= 1e-6) return [];
    return [{ clave: p.claveVerificacion, guardada: p.respuesta, nueva: nueva.respuesta }];
  });
}

describe('el solucionador genérico cubre todos los tipos', () => {
  it('resuelve cualquier ejercicio de la biblioteca sin lanzar', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      expect(() => resolverEjercicio(e), e.id).not.toThrow();
    }
  });

  it('los de clasificación no tienen solucionador', () => {
    for (const e of BIBLIOTECA_INICIAL.filter((x) => x.datos.tipo === 'fundamentos')) {
      expect(resolverEjercicio(e), e.id).toBeNull();
    }
  });

  it('los únicos ejercicios sin solución son los tres que enseñan justamente eso', () => {
    // Un ejercicio infactible o no acotado no es un dato roto: es el caso
    // didáctico. Se fijan por nombre para que un error de datos futuro que deje
    // sin solución a cualquier otro ejercicio haga fallar esta prueba.
    const sinSolucion = BIBLIOTECA_INICIAL.filter((e) => {
      const r = resolverEjercicio(e);
      if (r === null) return false;
      return r.datos === null || r.diagnosticos.some((d) => d.gravedad === 'error');
    }).map((e) => e.id);

    expect(sinSolucion.sort()).toEqual(['graf-06', 'simp-05', 'simp-06']);
    expect(diagnosticosDe(ejercicioDe('graf-06')).map((d) => d.codigo)).toContain('LP_INFACTIBLE');
    expect(diagnosticosDe(ejercicioDe('simp-05')).map((d) => d.codigo)).toContain('SX_INFACTIBLE');
    expect(diagnosticosDe(ejercicioDe('simp-06')).map((d) => d.codigo)).toContain('SX_NO_ACOTADA');
  });
});

describe('coherencia de las respuestas con los datos', () => {
  it('ningún ejercicio de la biblioteca tiene respuestas desactualizadas', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      expect(respuestasDesactualizadas(e), e.id).toEqual([]);
    }
  });

  it('cambiar un dato deja obsoletas las respuestas que dependen de él', () => {
    const original = ejercicioDe('equi-04');
    const datos = original.datos as Extract<DatosEjercicio, { tipo: 'equilibrio' }>;
    const editado: Ejercicio = { ...original, datos: { ...datos, costosFijos: 600000 } };

    const obsoletas = respuestasDesactualizadas(editado);
    expect(obsoletas.length).toBeGreaterThan(0);
    // El equilibrio sube con los costos fijos; el margen ponderado no depende
    // de ellos, así que no debe aparecer en la lista.
    expect(obsoletas.map((o) => o.clave)).toContain('equilibrio.unidadesEquilibrio');
    expect(obsoletas.map((o) => o.clave)).not.toContain('equilibrio.margenPonderado');
    expect(obsoletas.find((o) => o.clave === 'equilibrio.unidadesEquilibrio')!.nueva).toBeCloseTo(600000 / 9.05, 6);
  });

  it('actualizar las respuestas deja el ejercicio otra vez coherente', () => {
    const original = ejercicioDe('equi-04');
    const datos = original.datos as Extract<DatosEjercicio, { tipo: 'equilibrio' }>;
    const editado: Ejercicio = { ...original, datos: { ...datos, costosFijos: 600000 } };

    const nuevas = new Map(
      preguntasDe(editado.datos, editado.titulo)
        .filter((p) => p.claveVerificacion !== null)
        .map((p) => [p.claveVerificacion!, p.respuesta]),
    );
    const corregido: Ejercicio = {
      ...editado,
      preguntas: editado.preguntas.map((p) =>
        p.claveVerificacion !== null && nuevas.has(p.claveVerificacion)
          ? { ...p, respuesta: nuevas.get(p.claveVerificacion) ?? p.respuesta }
          : p,
      ),
    };

    expect(respuestasDesactualizadas(corregido)).toEqual([]);
    // Y sigue siendo un ejercicio válido.
    expect(validar(esquemaEjercicio, corregido).ok).toBe(true);
  });
});

describe('estructuras rectangulares al cambiar de tamaño', () => {
  // El editor usa estos dos helpers para que agregar una fila no deje la matriz
  // con menos filas que nombres. Se replican aquí con la misma forma.
  const redimensionar = <T,>(m: readonly (readonly T[])[], filas: number, columnas: number, relleno: T): T[][] =>
    Array.from({ length: filas }, (_, i) => Array.from({ length: columnas }, (_, j) => m[i]?.[j] ?? relleno));
  const ajustar = <T,>(v: readonly T[], largo: number, relleno: (i: number) => T): T[] =>
    Array.from({ length: largo }, (_, i) => v[i] ?? relleno(i));

  it('agregar un origen de transporte deja el ejercicio válido', () => {
    const original = ejercicioDe('trans-01');
    const d = original.datos as Extract<DatosEjercicio, { tipo: 'transporte' }>;
    const m = d.origenes.length;

    const editado: Ejercicio = {
      ...original,
      datos: {
        ...d,
        origenes: ajustar(d.origenes, m + 1, (i) => `Origen ${i + 1}`),
        costos: redimensionar(d.costos, m + 1, d.destinos.length, 0),
        oferta: ajustar(d.oferta, m + 1, () => 0),
      },
    };

    const v = validar(esquemaEjercicio, editado);
    expect(v.ok, v.errores.join(' | ')).toBe(true);
    // Y el motor lo resuelve: la fila nueva no rompe el balanceo.
    expect(resolverEjercicio(editado)!.datos).not.toBeNull();
  });

  it('quitar una columna de asignación recorta también la matriz', () => {
    const original = ejercicioDe('asig-01');
    const d = original.datos as Extract<DatosEjercicio, { tipo: 'asignacion' }>;
    const n = d.columnas.length;

    const editado: Ejercicio = {
      ...original,
      datos: {
        ...d,
        columnas: ajustar(d.columnas, n - 1, (j) => `Columna ${j + 1}`),
        matriz: redimensionar(d.matriz, d.filas.length, n - 1, 0),
      },
    };

    expect(validar(esquemaEjercicio, editado).ok).toBe(true);
    const datos = editado.datos as Extract<DatosEjercicio, { tipo: 'asignacion' }>;
    for (const fila of datos.matriz) expect(fila).toHaveLength(n - 1);
    expect(resolverEjercicio(editado)!.datos).not.toBeNull();
  });

  it('quitar una actividad de CPM la borra también de las predecesoras', () => {
    const original = ejercicioDe('cpm-01');
    const d = original.datos as Extract<DatosEjercicio, { tipo: 'cpm' }>;
    const quitada = d.actividades[1]!.id;

    const editado: Ejercicio = {
      ...original,
      datos: {
        ...d,
        actividades: d.actividades
          .filter((a) => a.id !== quitada)
          .map((a) => ({ ...a, predecesoras: a.predecesoras.filter((p) => p !== quitada) })),
      },
    };

    // Dejar el identificador colgando haría irresoluble la red: se comprueba
    // que no quede ninguna referencia y que el motor siga resolviendo.
    const datos = editado.datos as Extract<DatosEjercicio, { tipo: 'cpm' }>;
    expect(datos.actividades.flatMap((a) => a.predecesoras)).not.toContain(quitada);
    expect(diagnosticosDe(editado).filter((x) => x.gravedad === 'error')).toEqual([]);
  });

  it('agregar una variable al simplex agrega su coeficiente en cada restricción', () => {
    const original = ejercicioDe('simp-01');
    const d = original.datos as Extract<DatosEjercicio, { tipo: 'simplex' }>;
    const n = d.variables.length;

    const editado: Ejercicio = {
      ...original,
      datos: {
        ...d,
        variables: [...d.variables, { id: 'xn', nombre: 'Variable nueva', coeficiente: 1 }],
        restricciones: d.restricciones.map((r) => ({ ...r, coeficientes: ajustar(r.coeficientes, n + 1, () => 0) })),
      },
    };

    expect(validar(esquemaEjercicio, editado).ok).toBe(true);
    const datos = editado.datos as Extract<DatosEjercicio, { tipo: 'simplex' }>;
    for (const r of datos.restricciones) expect(r.coeficientes).toHaveLength(n + 1);
    // El modelo puede quedar no acotado —una variable que aporta al objetivo y
    // no consume nada—, y eso es una respuesta legítima del motor. Lo que no
    // puede pasar es que falle por descuadre entre variables y coeficientes.
    const codigos = diagnosticosDe(editado).map((d) => d.codigo);
    expect(codigos.some((c) => c.includes('COEFICIENTES') || c.includes('DIMENSION'))).toBe(false);
  });

  it('agregar un departamento de distribución hace crecer la matriz de recorridos', () => {
    const original = ejercicioDe('dist-01');
    const d = original.datos as Extract<DatosEjercicio, { tipo: 'distribucion' }>;
    const n = d.departamentos.length;

    const editado: Ejercicio = {
      ...original,
      datos: {
        ...d,
        departamentos: [...d.departamentos, { id: 'dn', nombre: 'Departamento nuevo', bloques: 1 }],
        recorridos: redimensionar(d.recorridos, n + 1, n + 1, 0),
        plano: { ...d.plano, asignacion: { ...d.plano.asignacion, dn: [{ fila: 0, columna: 0 }] } },
      },
    };

    expect(validar(esquemaEjercicio, editado).ok).toBe(true);
    const datos = editado.datos as Extract<DatosEjercicio, { tipo: 'distribucion' }>;
    expect(datos.recorridos).toHaveLength(n + 1);
    for (const fila of datos.recorridos) expect(fila).toHaveLength(n + 1);
  });
});

describe('el editor no puede producir datos que el esquema rechace', () => {
  it('todos los tipos de la biblioteca validan tras copiarse sin cambios', () => {
    // Es la operación que hace «Duplicar y editar»: el original no se toca y la
    // copia tiene que entrar a la biblioteca sin perder nada.
    const tipos = new Set(BIBLIOTECA_INICIAL.map((e) => e.datos.tipo));
    expect(tipos.size).toBeGreaterThanOrEqual(10);

    for (const tipo of tipos) {
      const e = BIBLIOTECA_INICIAL.find((x) => x.datos.tipo === tipo)!;
      const copia: Ejercicio = { ...e, id: `${e.id}-copia`, titulo: `${e.titulo} (copia)`, origen: 'docente' };
      const v = validar(esquemaEjercicio, copia);
      expect(v.ok, `${tipo}: ${v.errores.join(' | ')}`).toBe(true);
    }
  });
});
