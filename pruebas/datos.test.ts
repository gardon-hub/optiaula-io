/**
 * Pruebas de la biblioteca de ejercicios y del registro de auditoría.
 *
 * Verifican que todo lo extraído de los materiales cumple el esquema, que las
 * respuestas guardadas coinciden con lo que produce el motor y que las
 * inconsistencias detectadas están correctamente enlazadas.
 */

import { describe, expect, it } from 'vitest';

import {
  BIBLIOTECA_INICIAL,
  EJERCICIOS_RECHAZADOS,
  ejercicioPorId,
  ejerciciosDeTema,
} from '@/datos/ejercicios';
import { INCONSISTENCIAS_INICIALES } from '@/datos/inconsistencias';
import { FUENTES, fuentePorId } from '@/datos/fuentes';
import { TEMAS, esquemaEjercicio, validar, type DatosEjercicio } from '@/esquemas';
import { buscarMejorDistribucion, resolverDistribucion } from '@/nucleo/distribucion';
import { resolverAsignacion } from '@/nucleo/asignacion';
import { resolverCPM } from '@/nucleo/cpm';
import { resolverProductividad } from '@/nucleo/productividad';
import { resolverEquilibrioMultiproducto } from '@/nucleo/equilibrio';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';
import { resolverTransporte } from '@/nucleo/transporte';
import { resolverPERT } from '@/nucleo/pert';

describe('biblioteca de ejercicios', () => {
  it('carga sin rechazar ningún ejercicio', () => {
    expect(EJERCICIOS_RECHAZADOS).toEqual([]);
    expect(BIBLIOTECA_INICIAL.length).toBeGreaterThan(55);
  });

  it('todos los ejercicios validan contra el esquema', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      const r = validar(esquemaEjercicio, e);
      expect(r.ok, `${e.id}: ${r.errores.join(' | ')}`).toBe(true);
    }
  });

  it('los identificadores son únicos', () => {
    const ids = BIBLIOTECA_INICIAL.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los diez temas tienen al menos un ejercicio', () => {
    for (const tema of TEMAS) {
      expect(ejerciciosDeTema(tema).length, `el tema ${tema} está vacío`).toBeGreaterThan(0);
    }
  });

  it('cubre las cantidades transcritas de los materiales', () => {
    expect(ejerciciosDeTema('productividad').length).toBe(10);
    expect(ejerciciosDeTema('asignacion').length).toBe(11);
    expect(ejerciciosDeTema('transporte').length).toBe(11);
    // Los cinco del documento siguen intactos; los de compresión son derivados
    // y se suman aparte, porque el tema no aparece en ningún material (I-15).
    expect(ejerciciosDeTema('cpm').filter((e) => e.origen === 'textual').length).toBe(5);
    expect(ejerciciosDeTema('pert').length).toBe(3);
    expect(ejerciciosDeTema('grafico').length).toBe(6);
  });

  it('cada ejercicio apunta a una fuente existente o declara no tenerla', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      if (e.fuenteId !== null) {
        expect(fuentePorId(e.fuenteId), `${e.id} apunta a la fuente inexistente ${e.fuenteId}`).not.toBeNull();
      }
    }
  });

  it('cada ejercicio tiene al menos una pregunta y una de interpretación', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      expect(e.preguntas.length, `${e.id} no tiene preguntas`).toBeGreaterThan(0);
      expect(
        e.preguntas.some((p) => p.tipo === 'interpretacion'),
        `${e.id} no tiene pregunta de interpretación`,
      ).toBe(true);
    }
  });

  it('las preguntas numéricas con respuesta traen pistas graduadas', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      for (const p of e.preguntas) {
        if (p.tipo === 'numerica' && p.respuesta !== null) {
          expect(p.pistas.length, `${e.id}/${p.id} no tiene pistas`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('los ejercicios derivados declaran en notas qué se agregó', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      if (e.origen === 'derivado') {
        expect(e.notasDocente.length, `${e.id} es derivado pero no explica qué se agregó`).toBeGreaterThan(40);
      }
    }
  });
});

describe('coherencia entre las respuestas guardadas y el motor', () => {
  it('productividad: el costo total guardado coincide con el motor', () => {
    for (const e of ejerciciosDeTema('productividad')) {
      if (e.datos.tipo !== 'productividad') continue;
      const r = resolverProductividad({ ...e.datos, titulo: e.titulo, periodo: '' });
      const guardado = e.preguntas.find((p) => p.id === 'p1')?.respuesta;
      expect(typeof guardado).toBe('number');
      expect(r.datos?.costoTotal).toBeCloseTo(guardado as number, 6);
    }
  });

  it('asignación: el valor total guardado coincide con el método húngaro', () => {
    for (const e of ejerciciosDeTema('asignacion')) {
      if (e.datos.tipo !== 'asignacion') continue;
      const r = resolverAsignacion({ ...e.datos, titulo: e.titulo });
      const guardado = e.preguntas.find((p) => p.id === 'p1')?.respuesta;
      expect(r.datos, `${e.id} no tiene solución`).not.toBeNull();
      expect(r.datos?.valorTotal).toBeCloseTo(guardado as number, 6);
    }
  });

  it('transporte: el costo óptimo guardado coincide con MODI', () => {
    for (const e of ejerciciosDeTema('transporte')) {
      if (e.datos.tipo !== 'transporte') continue;
      const r = resolverTransporte({ ...e.datos, titulo: e.titulo }, 'vogel');
      const guardado = e.preguntas.find((p) => p.id === 'p2')?.respuesta;
      expect(r.datos, `${e.id} no tiene solución`).not.toBeNull();
      expect(r.datos?.solucionOptima.costoTotal).toBeCloseTo(guardado as number, 6);
    }
  });

  it('CPM: la duración guardada coincide con la red resuelta', () => {
    for (const e of ejerciciosDeTema('cpm')) {
      if (e.datos.tipo !== 'cpm') continue;
      const r = resolverCPM({ ...e.datos, titulo: e.titulo });
      const guardado = e.preguntas.find((p) => p.id === 'p1')?.respuesta;
      expect(r.datos, `${e.id} no tiene solución`).not.toBeNull();
      expect(r.datos?.duracionProyecto).toBeCloseTo(guardado as number, 6);
    }
  });

  it('PERT: la duración esperada guardada coincide con el motor', () => {
    for (const e of ejerciciosDeTema('pert')) {
      if (e.datos.tipo !== 'pert' || e.datos.modo !== 'red') continue;
      const r = resolverPERT({ ...e.datos, titulo: e.titulo });
      const guardado = e.preguntas.find((p) => p.id === 'p1')?.respuesta;
      expect(r.datos?.duracionEsperada).toBeCloseTo(guardado as number, 6);
    }
  });

  it('todos los ejercicios con solucionador se resuelven sin error', () => {
    for (const e of BIBLIOTECA_INICIAL) {
      switch (e.datos.tipo) {
        case 'productividad':
          expect(resolverProductividad({ ...e.datos, titulo: e.titulo, periodo: '' }).datos, e.id).not.toBeNull();
          break;
        case 'asignacion':
          expect(resolverAsignacion({ ...e.datos, titulo: e.titulo }).datos, e.id).not.toBeNull();
          break;
        case 'transporte':
          expect(resolverTransporte({ ...e.datos, titulo: e.titulo }).datos, e.id).not.toBeNull();
          break;
        case 'cpm':
          expect(resolverCPM({ ...e.datos, titulo: e.titulo }).datos, e.id).not.toBeNull();
          break;
        case 'pert':
          if (e.datos.modo === 'red') {
            expect(resolverPERT({ ...e.datos, titulo: e.titulo }).datos, e.id).not.toBeNull();
          }
          break;
        default:
          break;
      }
    }
  });
});

describe('auditoría de datos', () => {
  it('registra las dos inconsistencias señaladas explícitamente', () => {
    const i01 = INCONSISTENCIAS_INICIALES.find((i) => i.id === 'I-01');
    const i02 = INCONSISTENCIAS_INICIALES.find((i) => i.id === 'I-02');
    expect(i01?.ejercicioId).toBe('asig-03');
    expect(i02?.ejercicioId).toBe('prod-01');
    expect(i01?.opciones.length).toBeGreaterThanOrEqual(2);
    expect(i02?.opciones.length).toBeGreaterThanOrEqual(2);
  });

  it('cada inconsistencia con ejercicio apunta a uno que existe', () => {
    for (const i of INCONSISTENCIAS_INICIALES) {
      if (i.ejercicioId !== null) {
        expect(ejercicioPorId(i.ejercicioId), `${i.id} apunta al ejercicio inexistente ${i.ejercicioId}`).not.toBeNull();
      }
    }
  });

  it('los ejercicios marcados con inconsistencia la tienen registrada', () => {
    const ids = new Set(INCONSISTENCIAS_INICIALES.map((i) => i.id));
    for (const e of BIBLIOTECA_INICIAL) {
      for (const codigo of e.inconsistencias) {
        expect(ids.has(codigo), `${e.id} referencia la inconsistencia inexistente ${codigo}`).toBe(true);
      }
    }
  });

  it('el ejercicio 3 de asignación conserva la matriz 4 × 4 del documento', () => {
    const e = ejercicioPorId('asig-03');
    expect(e?.validacion).toBe('con_inconsistencia');
    if (e?.datos.tipo === 'asignacion') {
      expect(e.datos.filas.length).toBe(4);
      expect(e.datos.columnas.length).toBe(4);
    }
  });

  it('el ejercicio 1 de productividad no aplica el costo declarado en silencio', () => {
    const e = ejercicioPorId('prod-01');
    expect(e?.validacion).toBe('con_inconsistencia');
    if (e?.datos.tipo === 'productividad') {
      expect(e.datos.costoTotalDeclarado).toBeNull();
    }
  });

  it('las decisiones ya tomadas apuntan a una opción válida', () => {
    for (const i of INCONSISTENCIAS_INICIALES) {
      if (i.decision !== null) {
        expect(i.opciones.some((o) => o.id === i.decision), `${i.id} decidió una opción inexistente`).toBe(true);
      }
    }
  });
});

describe('fuentes', () => {
  it('no hay fuentes duplicadas', () => {
    const ids = FUENTES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('las cinco referencias bibliográficas del documento están presentes', () => {
    for (const id of ['chase2021', 'heizer2020', 'robbins2022', 'russell2019', 'stevenson2021']) {
      expect(fuentePorId(id), `falta la fuente ${id}`).not.toBeNull();
    }
  });
});

// ───────────────────────────── Punto de equilibrio transcrito ─────────────────────────────

describe('punto de equilibrio — los diez problemas del material', () => {
  const DEL_TEMA = BIBLIOTECA_INICIAL.filter((e) => e.tema === 'equilibrio');

  const datosDe = (id: string) => {
    const e = DEL_TEMA.find((x) => x.id === id)!;
    return e.datos as Extract<(typeof e)['datos'], { tipo: 'equilibrio' }>;
  };

  const respuesta = (id: string, clave: string): number | null => {
    const p = DEL_TEMA.find((x) => x.id === id)!.preguntas.find((q) => q.claveVerificacion === clave);
    return typeof p?.respuesta === 'number' ? p.respuesta : null;
  };

  it('están los diez y todos son transcripción, no derivados', () => {
    expect(DEL_TEMA).toHaveLength(10);
    for (const e of DEL_TEMA) {
      expect(e.origen, e.id).toBe('textual');
      expect(e.fuenteId, e.id).toBe('ppt-equilibrio');
      // La atribución nombra la diapositiva concreta de la que salió.
      expect(e.atribucion, e.id).toMatch(/^Diapositiva \d+ — Punto de Equilibrio\.pptx/);
    }
  });

  it('cubren los tres rasgos que el motor sabe modelar', () => {
    expect(DEL_TEMA.filter((e) => datosDe(e.id).comisionPorcentaje > 0).map((e) => e.id)).toEqual(['equi-09', 'equi-10']);
    expect(DEL_TEMA.filter((e) => datosDe(e.id).valorRecuperacion > 0).map((e) => e.id)).toEqual(['equi-10']);
    expect(DEL_TEMA.filter((e) => datosDe(e.id).modo === 'multiproducto').map((e) => e.id)).toEqual(['equi-03', 'equi-04']);
  });

  it('granja de engorde: 21 818,18 libras, que son 7 272,73 pollos de tres libras', () => {
    expect(respuesta('equi-01', 'equilibrio.puntoEquilibrioUnidades')!).toBeCloseTo(120000 / 5.5, 6);
    // La conversión al final, no antes: el margen está por libra.
    expect(respuesta('equi-01', 'equilibrio.conversionUnidades')!).toBeCloseTo(120000 / 5.5 / 3, 6);
  });

  it('ponedoras: equilibrio, utilidad objetivo y la conversión a gallinas', () => {
    expect(respuesta('equi-02', 'equilibrio.puntoEquilibrioUnidades')!).toBeCloseTo(170000 / 0.45, 4);
    expect(respuesta('equi-02', 'equilibrio.unidadesParaObjetivo')!).toBeCloseTo((170000 + 360000) / 0.45, 4);

    // La postura no está en el material: la aportó el docente y son 300 a 330
    // huevos al año. Se convierte con 300, que es el extremo que exige más aves.
    const gallinas = DEL_TEMA.find((e) => e.id === 'equi-02')!.preguntas.filter(
      (q) => q.claveVerificacion === 'equilibrio.conversionUnidades',
    );
    expect(gallinas).toHaveLength(2);
    expect(gallinas[0]!.respuesta).toBeCloseTo(170000 / 0.45 / 300, 6);
    expect(gallinas[1]!.respuesta).toBeCloseTo((170000 + 360000) / 0.45 / 300, 6);
    expect(DEL_TEMA.find((e) => e.id === 'equi-02')!.enunciado).toMatch(/300 y 330 huevos/);
  });

  it('la granja mixta convierte sus huevos a gallinas con la misma postura', () => {
    expect(respuesta('equi-03', 'equilibrio.conversionUnidades')!).toBeCloseTo(2280000 / 300, 6);
  });

  it('I-12 quedó cerrada con el dato del docente, y ningún ejercicio la arrastra', () => {
    const i12 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-12')!;
    expect(i12.decision).toBe('postura');
    expect(i12.decididoEn).not.toBeNull();
    // El origen del dato queda dicho: no está en el material.
    expect(i12.descripcion).toMatch(/aportó el dato/);
    expect(DEL_TEMA.flatMap((e) => e.inconsistencias)).not.toContain('I-12');
  });

  it('carritos de helados: la comisión es costo variable, no costo fijo', () => {
    const d = datosDe('equi-09');
    // 0,20 del cono más el 10 % de 0,50 = 0,25 efectivo, margen 0,25.
    expect(respuesta('equi-09', 'equilibrio.margenContribucion')!).toBeCloseTo(0.25, 9);
    expect(respuesta('equi-09', 'equilibrio.puntoEquilibrioUnidades')!).toBeCloseTo(12000, 6);
    expect(respuesta('equi-09', 'equilibrio.utilidadEsperada')!).toBeCloseTo(750, 6);
    // Ignorar la comisión daría 10 000: por eso existe la regla de error típico.
    expect(d.costosFijos / (d.precioVenta - d.costoVariableUnitario)).toBeCloseTo(10000, 6);
  });

  it('renta de veleros: reúne comisión y valor de recuperación', () => {
    const d = datosDe('equi-10');
    expect(d.costosFijos).toBe(6 * 2000 + 2000 + 500 + 224 * 15);
    expect(d.valorRecuperacion).toBe(6 * 1000 + 400);
    expect(d.capacidad).toBe(6 * 8 * 7 * 15);

    expect(respuesta('equi-10', 'equilibrio.margenContribucion')!).toBeCloseTo(7 - 0.7, 9);
    expect(respuesta('equi-10', 'equilibrio.puntoEquilibrioUnidades')!).toBeCloseTo(11460 / 6.3, 6);
    // Al 40 % de la capacidad: 2 016 horas.
    expect(respuesta('equi-10', 'equilibrio.utilidadEsperada')!).toBeCloseTo(0.4 * 5040 * 6.3 - 11460, 6);
  });

  const resolverMezcla = (id: string) => {
    const d = datosDe(id);
    return resolverEquilibrioMultiproducto({
      titulo: id,
      moneda: d.moneda,
      costosFijos: d.costosFijos,
      baseMezcla: d.baseMezcla,
      productos: d.productos.map((x) => ({ ...x })),
    }).datos!;
  };

  it('las dos mezclas leen «PPM» como participación en las unidades', () => {
    for (const id of ['equi-03', 'equi-04']) {
      const d = datosDe(id);
      const r = resolverMezcla(id);

      expect(d.baseMezcla, id).toBe('unidades');
      expect(respuesta(id, 'equilibrio.margenPonderado')!, id).toBeCloseTo(r.margenPonderado!, 8);
      expect(respuesta(id, 'equilibrio.unidadesEquilibrio')!, id).toBeCloseTo(r.unidadesEquilibrio!, 4);
      // Las participaciones del material suman 100 %.
      expect(d.productos.reduce((t, x) => t + x.participacion, 0), id).toBeCloseTo(100, 9);
    }
  });

  it('el despiece de pollo reproduce la clave de respuestas del docente', () => {
    // `Ejercicio_punto_de_equilibrio_granja_avicola.pdf`, resuelto por el profesor.
    const r = resolverMezcla('equi-04');
    expect(r.margenPonderado).toBeCloseTo(9.05, 10);
    expect(r.unidadesEquilibrio).toBeCloseTo(500000 / 9.05, 6);
    expect(r.unidadesEquilibrio!).toBeCloseTo(55248.62, 2);

    // El reparto de la clave, redondeado a unidades enteras.
    const esperado: Record<string, number> = { entero: 27625, alas: 5525, piernas: 8287, pechuga: 11050, menudos: 2762 };
    for (const x of r.detalle) {
      // La clave redondea el total antes de repartir y la aplicación no redondea
      // durante el cálculo: la diferencia nunca llega a una unidad completa.
      expect(Math.abs(x.unidadesEquilibrio! - esperado[x.producto.id]!), x.producto.nombre).toBeLessThan(1);
    }
  });

  it('huevo y carne: la lectura en unidades es la que da las cifras redondas del material', () => {
    const r = resolverMezcla('equi-03');
    // MC ponderado = 0,50 × 0,95 + 4,50 × 0,05 = 0,70 exacto.
    expect(r.margenPonderado).toBeCloseTo(0.7, 10);
    expect(r.unidadesEquilibrio).toBeCloseTo(2400000, 6);
    expect(r.detalle.find((x) => x.producto.id === 'huevo')!.unidadesEquilibrio).toBeCloseTo(2280000, 6);
    expect(r.detalle.find((x) => x.producto.id === 'carne')!.unidadesEquilibrio).toBeCloseTo(120000, 6);
  });

  it('el despiece de pollo enseña que la razón manda sobre el margen unitario', () => {
    const d = datosDe('equi-04');
    const razon = (p: (typeof d.productos)[number]) => (p.precioVenta - p.costoVariableUnitario) / p.precioVenta;
    const menudos = d.productos.find((p) => p.id === 'menudos')!;
    const piernas = d.productos.find((p) => p.id === 'piernas')!;

    // Los menudos tienen el peor margen unitario y la mejor razón.
    expect(menudos.precioVenta - menudos.costoVariableUnitario).toBeLessThan(piernas.precioVenta - piernas.costoVariableUnitario);
    expect(razon(menudos)).toBeGreaterThan(razon(piernas));
  });

  it('las dos ambigüedades del material quedan registradas, no corregidas en silencio', () => {
    const ids = INCONSISTENCIAS_INICIALES.map((x) => x.id);
    expect(ids).toContain('I-12');
    expect(ids).toContain('I-13');

    // Y la que motivó los ejercicios derivados queda resuelta.
    const i07 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-07')!;
    expect(i07.decision).toBe('transcritos');
    expect(i07.decididoEn).not.toBeNull();

    // I-13 la cerró la clave de respuestas del docente, no un supuesto nuestro.
    const i13 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-13')!;
    expect(i13.decision).toBe('unidades');
    expect(i13.decididoEn).not.toBeNull();
    expect(i13.descripcion).toContain('Ejercicio_punto_de_equilibrio_granja_avicola.pdf');

    // El despiece ya no arrastra ninguna: coincide con la solución del docente.
    expect(DEL_TEMA.find((e) => e.id === 'equi-04')!.inconsistencias).toEqual([]);
  });

  it('la retroalimentación detecta haber resuelto con la otra base de la mezcla', () => {
    const ej = DEL_TEMA.find((e) => e.id === 'equi-04')!;
    const p = ej.preguntas.find((q) => q.claveVerificacion === 'equilibrio.unidadesEquilibrio')!;
    const d = datosDe('equi-04');
    const porIngresos = resolverEquilibrioMultiproducto({
      titulo: ej.titulo,
      moneda: d.moneda,
      costosFijos: d.costosFijos,
      baseMezcla: 'ingresos',
      productos: d.productos.map((x) => ({ ...x })),
    }).datos!;

    const r = evaluarRespuesta(ej, p, porIngresos.unidadesEquilibrio!);
    expect(r.correcta).toBe(false);
    expect(r.codigoError).toBe('EQM_BASE_CAMBIADA');
    expect(r.mensaje).toContain('unidades vendidas');
  });
});

// ───────────────────── Distribución física reconstruida ─────────────────────

describe('distribución — los planos reconstruidos de Distribución 2026', () => {
  const ejercicio = (id: string) => BIBLIOTECA_INICIAL.find((e) => e.id === id)!;
  const datosDe = (id: string) => ejercicio(id).datos as Extract<DatosEjercicio, { tipo: 'distribucion' }>;

  const puntaje = (id: string, cual: 'plano' | 'planoReferencia' = 'plano'): number => {
    const d = datosDe(id);
    const plano = cual === 'plano' ? d.plano : d.planoReferencia!;
    return resolverDistribucion({ ...d, titulo: ejercicio(id).titulo, plano }).datos!.puntajeCD;
  };

  it('el taller reproduce los dos totales impresos y la mejora de la diapositiva', () => {
    expect(puntaje('dist-01')).toBe(785);
    expect(puntaje('dist-01', 'planoReferencia')).toBe(420);
    // ME = (1 − 420/785) × 100. La diapositiva imprime 46,49 %; es su redondeo.
    expect((1 - 420 / 785) * 100).toBeCloseTo(46.5, 1);
  });

  it('el plano propuesto del taller cumple las relaciones A que el actual incumple', () => {
    const d = datosDe('dist-01');
    const centro = (plano: typeof d.plano, id: string) => {
      const celdas = plano.asignacion[id]!;
      return [celdas[0]!.fila, celdas[0]!.columna] as const;
    };
    const dist = (plano: typeof d.plano, a: string, b: string) => {
      const [fa, ca] = centro(plano, a);
      const [fb, cb] = centro(plano, b);
      return Math.abs(fa - fb) + Math.abs(ca - cb);
    };

    // d6 es Inspección: A con d1 (taladro) y con d3 (embarques); N con d4 (tornos).
    expect(dist(d.plano, 'd1', 'd6')).toBeGreaterThan(1);
    expect(dist(d.plano, 'd3', 'd6')).toBeGreaterThan(1);
    expect(dist(d.planoReferencia!, 'd1', 'd6')).toBe(1);
    expect(dist(d.planoReferencia!, 'd3', 'd6')).toBe(1);
    // Y en ninguno de los dos la inspección queda pegada a los tornos.
    expect(dist(d.plano, 'd4', 'd6')).toBeGreaterThan(1);
    expect(dist(d.planoReferencia!, 'd4', 'd6')).toBeGreaterThan(1);
  });

  it('el mínimo global del taller es mejor que la propuesta y cumple toda la gráfica REL', () => {
    const d = datosDe('dist-01');
    const base = { ...d, titulo: ejercicio('dist-01').titulo };
    const m = buscarMejorDistribucion(base, {});
    expect(m.exhaustiva).toBe(true);
    expect(m.puntajeCD).toBe(400);
    expect(m.puntajeCD).toBeLessThan(420);
    // Y no gana rompiendo una restricción cualitativa: no incumple ninguna.
    const r = resolverDistribucion({ ...base, plano: { ...d.plano, asignacion: m.asignacion } });
    expect(r.datos!.alertas).toHaveLength(0);
    // La nota docente lo dice, para que nadie lo tome por un error del material.
    expect(ejercicio('dist-01').notasDocente).toContain('400');
  });

  it('el almacén reproduce los dos totales, y el rotulado «Óptima» es el peor', () => {
    expect(puntaje('dist-02')).toBe(6650);
    expect(puntaje('dist-02', 'planoReferencia')).toBe(6730);
    expect(puntaje('dist-02', 'planoReferencia')).toBeGreaterThan(puntaje('dist-02'));
    // La contradicción del material queda registrada, no corregida en silencio.
    // El docente decidió tratar 6 650 como la óptima, que es la que el motor
    // prueba que es el mínimo; el ejercicio conserva las dos distribuciones.
    expect(ejercicio('dist-02').inconsistencias).toContain('I-03');
    expect(INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-03')!.decision).toBe('menor');
    expect(INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-03')!.decididoEn).not.toBeNull();
  });

  it('los almacenes usan la métrica del pasillo y respetan las áreas del material', () => {
    const areas: Record<string, readonly number[]> = {
      'dist-02': [2, 1, 2, 1, 3, 4, 1, 2],
      'dist-04': [2, 3, 1, 2, 1, 3, 2, 2],
      'dist-05': [2, 2, 1, 3, 1, 4, 1, 2],
    };
    for (const [id, esperadas] of Object.entries(areas)) {
      const d = datosDe(id);
      expect(d.tipoDistancia, id).toBe('pasillo');
      expect(d.departamentos.map((x) => x.bloques), id).toEqual(esperadas);
      // Catorce bloques de almacén más los dos de la plataforma llenan la retícula.
      const celdas = Object.values(d.plano.asignacion).flat().map((c) => `${c.fila}:${c.columna}`);
      expect(celdas.length, id).toBe(16);
      expect(new Set(celdas).size, id).toBe(16);
      for (const dep of d.departamentos) {
        expect(d.plano.asignacion[dep.id]!.length, `${id}/${dep.id}`).toBe(dep.bloques);
      }
    }
  });

  it('el óptimo declarado de cada almacén es alcanzable en su retícula', () => {
    // Ordenar los bloques por carga descendente y darles las profundidades más
    // cortas es óptimo cuando hay dos bloques por profundidad. Se construye ese
    // acomodo y se comprueba que el motor lo puntúe como dice la respuesta.
    for (const [id, esperado] of [['dist-02', 6650], ['dist-04', 8335], ['dist-05', 6070]] as const) {
      const d = datosDe(id);
      const bloques = d.departamentos
        .map((dep, i) => ({ id: dep.id, bloques: dep.bloques, carga: d.recorridos[0]![i]! }))
        .filter((x) => x.id !== 'plat')
        .flatMap((x) => Array.from({ length: x.bloques }, () => ({ id: x.id, w: x.carga / x.bloques })))
        .sort((a, b) => b.w - a.w);

      const asignacion: Record<string, { fila: number; columna: number }[]> = {
        plat: [{ fila: 0, columna: 0 }, { fila: 1, columna: 0 }],
      };
      bloques.forEach((b, i) => {
        (asignacion[b.id] ??= []).push({ fila: i % 2, columna: Math.floor(i / 2) + 1 });
      });

      const r = resolverDistribucion({ ...d, titulo: id, plano: { ...d.plano, asignacion } });
      expect(r.datos!.puntajeCD, id).toBe(esperado);
    }
  });

  it('la matriz de recorridos anota cada par una sola vez', () => {
    // El puntaje suma las dos mitades: llenar ambas duplicaría toda la carga.
    for (const id of ['dist-01', 'dist-02', 'dist-03', 'dist-04', 'dist-05']) {
      const m = datosDe(id).recorridos;
      for (let i = 0; i < m.length; i++) {
        for (let j = 0; j < i; j++) {
          expect((m[i]![j] ?? 0) === 0 || (m[j]![i] ?? 0) === 0, `${id} en (${i},${j})`).toBe(true);
        }
      }
    }
  });

  it('el problema de práctica con matriz ambigua quedó fuera, y dicho por qué', () => {
    const i14 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-14')!;
    expect(i14.decision).toBe('omitir');
    expect(i14.archivoOrigen).toBe('Distribución 2026.pdf');
    expect(BIBLIOTECA_INICIAL.filter((e) => e.tema === 'distribucion')).toHaveLength(5);
  });
});
