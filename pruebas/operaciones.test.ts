/**
 * Pruebas de los módulos de inventarios y de líneas de espera.
 *
 * La comprobación que más pesa es la primera: el motor de inventarios tiene que
 * reproducir las seis respuestas del ejercicio de la diapositiva 14 del
 * material. Las fórmulas de la presentación están como imágenes y no se
 * pudieron leer (I-18), así que esa coincidencia es la única evidencia de que
 * las estándar que usa la aplicación son las mismas que enseña el curso.
 *
 * En colas, los valores se contrastan contra los de libro para M/M/1 y M/M/2,
 * que son exactos y conocidos.
 */

import { describe, expect, it } from 'vitest';

import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { INCONSISTENCIAS_INICIALES } from '@/datos/inconsistencias';
import { fuentePorId } from '@/datos/fuentes';
import { evaluarRespuesta } from '@/nucleo/retroalimentacion';
import { resolverInventarios, serieCostosInventario, type DatosInventarios } from '@/nucleo/inventarios';
import {
  compararServidores,
  curvaEspera,
  probabilidadVacio,
  resolverColas,
  servidoresMinimos,
  type DatosColas,
} from '@/nucleo/colas';

const inv = (parcial: Partial<DatosInventarios>): DatosInventarios => ({
  titulo: 'Prueba',
  modelo: 'lote_economico',
  moneda: 'USD',
  demandaAnual: 9000,
  unidadProducto: 'unidades',
  costoOrdenar: 2.5,
  costoConservar: 2,
  costoUnitario: 0,
  tiempoEntregaDias: 0,
  diasPorAnio: 360,
  tasaProduccionAnual: null,
  ...parcial,
});

const cola = (parcial: Partial<DatosColas>): DatosColas => ({
  titulo: 'Prueba',
  tasaLlegadas: 2,
  tasaServicio: 3,
  servidores: 1,
  unidadTiempo: 'hora',
  nombreClientes: 'clientes',
  moneda: 'HNL',
  costoEsperaPorHora: 0,
  costoServidorPorHora: 0,
  ...parcial,
});

describe('inventarios: el ejercicio del material', () => {
  const r = resolverInventarios(inv({ costoUnitario: 7, tiempoEntregaDias: 3 })).datos!;

  it('reproduce las seis respuestas de la diapositiva 14', () => {
    expect(r.cantidadOptima).toBe(150);
    expect(r.ordenesPorAnio).toBe(60);
    expect(r.diasEntreOrdenes).toBe(6);
    expect(r.valorDeCadaOrden).toBe(1050);
    expect(r.costoAnualInventario).toBe(300);
    expect(r.puntoReorden).toBe(75);
  });

  it('en el óptimo, ordenar y conservar cuestan lo mismo', () => {
    // Es la comprobación rápida que sirve para saber si el lote está bien.
    expect(r.costoOrdenarAnual).toBe(150);
    expect(r.costoConservarAnual).toBe(150);
  });

  it('el costo de la compra queda aparte: no depende del lote', () => {
    expect(r.costoCompraAnual).toBe(63000);
    expect(r.costoAnualInventario).not.toBeCloseTo(r.costoCompraAnual!, 0);
    // Cambiar el lote no mueve la compra del año.
    const otro = resolverInventarios(inv({ costoUnitario: 7, costoOrdenar: 10 })).datos!;
    expect(otro.costoCompraAnual).toBe(63000);
  });

  it('con 365 días los resultados dejan de ser redondos, y por eso I-16 elige 360', () => {
    const con365 = resolverInventarios(inv({ diasPorAnio: 365, tiempoEntregaDias: 3 })).datos!;
    expect(con365.diasEntreOrdenes).toBeCloseTo(6.0833, 4);
    expect(con365.puntoReorden).toBeCloseTo(73.9726, 4);
    // El lote no depende de los días del año: solo la conversión a diaria.
    expect(con365.cantidadOptima).toBe(150);

    const i16 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-16')!;
    expect(i16.decision).toBe('dias360');
    expect(i16.archivoOrigen).toBe('Manejo de inventario.pptx');
  });

  it('el lote económico es de verdad el mínimo de la curva de costo', () => {
    const serie = serieCostosInventario(inv({}), 400);
    const minimo = serie.reduce((a, b) => (b.total < a.total ? b : a), serie[0]!);
    expect(minimo.cantidad).toBeCloseTo(150, 0);
    // Y la curva es plana: un 20 % de diferencia mueve el total menos del 2 %.
    const conMenos = serie.reduce((a, b) => (Math.abs(b.cantidad - 120) < Math.abs(a.cantidad - 120) ? b : a), serie[0]!);
    expect((conMenos.total - 300) / 300).toBeLessThan(0.03);
  });
});

describe('inventarios: los otros dos modelos', () => {
  it('el reabastecimiento uniforme ordena más que el abastecimiento global', () => {
    const global = resolverInventarios(inv({ demandaAnual: 24000, costoOrdenar: 1800, costoConservar: 30 })).datos!;
    const uniforme = resolverInventarios(
      inv({ modelo: 'reabastecimiento_uniforme', demandaAnual: 24000, costoOrdenar: 1800, costoConservar: 30, tasaProduccionAnual: 60000 }),
    ).datos!;

    expect(uniforme.cantidadOptima).toBeGreaterThan(global.cantidadOptima);
    // Solo se acumula la fracción (1 − D/p) = 0,6 del lote.
    expect(uniforme.inventarioMaximo / uniforme.cantidadOptima).toBeCloseTo(0.6, 9);
    expect(uniforme.inventarioMaximo).toBeLessThan(uniforme.cantidadOptima);
  });

  it('con la tasa de producción igual o menor que la demanda el modelo no aplica', () => {
    const r = resolverInventarios(inv({ modelo: 'reabastecimiento_uniforme', tasaProduccionAnual: 9000 }));
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'INV_TASA_INSUFICIENTE')).toBe(true);
  });

  it('el periodo fijo cubre el intervalo más el tiempo de entrega', () => {
    const r = resolverInventarios(
      inv({ modelo: 'periodo_fijo', moneda: 'HNL', demandaAnual: 4800, costoOrdenar: 900, costoConservar: 60, tiempoEntregaDias: 12 }),
    ).datos!;

    // T = √(2·900 / (4800·60)) = √0,00625 = 0,0790569 años = 28,46 días.
    expect(r.intervaloAnios!).toBeCloseTo(Math.sqrt((2 * 900) / (4800 * 60)), 12);
    expect(r.intervaloAnios! * 360).toBeCloseTo(28.4605, 4);
    // M = D·(T + L) = 4800 · (0,0790569 + 12/360) = 539,47.
    expect(r.nivelObjetivo).toBeCloseTo(539.4733, 4);
    // Cubrir solo T daría 379,47: ciento sesenta frascos menos de los que hacen
    // falta, y es el error que persigue la retroalimentación.
    expect(4800 * r.intervaloAnios!).toBeCloseTo(379.4733, 4);
  });

  it('el periodo fijo cuesta lo mismo que el lote económico: no se elige por barato', () => {
    const comun = { demandaAnual: 4800, costoOrdenar: 900, costoConservar: 60 };
    const fijo = resolverInventarios(inv({ ...comun, modelo: 'periodo_fijo' })).datos!;
    const lote = resolverInventarios(inv({ ...comun, modelo: 'lote_economico' })).datos!;
    expect(fijo.costoAnualInventario).toBeCloseTo(lote.costoAnualInventario, 6);
  });

  it('sin costo de conservación no existe lote económico, y se dice', () => {
    const r = resolverInventarios(inv({ costoConservar: 0 }));
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'INV_CONSERVAR')).toBe(true);
  });
});

describe('colas: valores exactos de libro', () => {
  it('M/M/1 con λ=2 y μ=3', () => {
    const r = resolverColas(cola({})).datos!;
    expect(r.utilizacion).toBeCloseTo(2 / 3, 9);
    expect(r.probabilidadVacio).toBeCloseTo(1 / 3, 9);
    expect(r.enSistema).toBeCloseTo(2, 9);
    expect(r.enCola).toBeCloseTo(4 / 3, 9);
    expect(r.tiempoSistema).toBeCloseTo(1, 9);
    expect(r.tiempoCola).toBeCloseTo(2 / 3, 9);
  });

  it('M/M/2 con λ=2 y μ=1,5', () => {
    const r = resolverColas(cola({ tasaServicio: 1.5, servidores: 2 })).datos!;
    expect(r.utilizacion).toBeCloseTo(2 / 3, 9);
    expect(r.probabilidadVacio).toBeCloseTo(0.2, 9);
    expect(r.enCola).toBeCloseTo(16 / 15, 9);
    expect(r.enSistema).toBeCloseTo(2.4, 9);
    expect(r.probabilidadEsperar).toBeCloseTo(8 / 15, 9);
  });

  it('la ley de Little se cumple en todos los casos', () => {
    for (const [lambda, mu, s] of [
      [2, 3, 1],
      [2, 1.5, 2],
      [28, 10, 4],
      [40, 15, 3],
      [9, 5, 2],
    ] as const) {
      const r = resolverColas(cola({ tasaLlegadas: lambda, tasaServicio: mu, servidores: s })).datos!;
      expect(r.enSistema, `λ=${lambda} μ=${mu} s=${s}`).toBeCloseTo(lambda * r.tiempoSistema, 8);
      expect(r.enCola, `λ=${lambda} μ=${mu} s=${s}`).toBeCloseTo(lambda * r.tiempoCola, 8);
      expect(r.tiempoSistema).toBeCloseTo(r.tiempoCola + 1 / mu, 8);
    }
  });

  it('con un servidor, P₀ se reduce a 1 − ρ', () => {
    expect(probabilidadVacio(2, 3, 1)).toBeCloseTo(1 - 2 / 3, 9);
    expect(probabilidadVacio(7, 10, 1)).toBeCloseTo(0.3, 9);
  });
});

describe('colas: estabilidad y saturación', () => {
  it('un sistema que no da abasto se rechaza y dice cuántos servidores harían falta', () => {
    const r = resolverColas(cola({ tasaLlegadas: 10, tasaServicio: 5, servidores: 2 }));
    expect(r.datos).toBeNull();
    const inestable = r.diagnosticos.find((d) => d.codigo === 'COLA_INESTABLE')!;
    expect(inestable.gravedad).toBe('error');
    expect(inestable.mensaje).toContain('3');
    expect(servidoresMinimos(10, 5)).toBe(3);
  });

  it('la espera no crece de forma proporcional a la utilización: se dispara', () => {
    const espera = (rho: number): number =>
      resolverColas(cola({ tasaLlegadas: rho * 10, tasaServicio: 10, servidores: 1 })).datos!.tiempoCola;

    const w50 = espera(0.5);
    const w80 = espera(0.8);
    const w90 = espera(0.9);
    const w95 = espera(0.95);

    // La utilización sube un octavo y la espera se multiplica por 2,25.
    expect(w90 / w80).toBeCloseTo(2.25, 6);
    // De 90 % a 95 % la utilización sube un dieciochoavo y se vuelve a duplicar.
    expect(w95 / w90).toBeCloseTo(2.1111, 4);
    // Mientras que de 50 % a 80 % —un salto mucho mayor de ocupación— solo se
    // cuadruplica: esa desproporción creciente es la lección del módulo.
    expect(w80 / w50).toBeCloseTo(4, 6);
  });

  it('avisa cuando la utilización entra en la zona peligrosa', () => {
    const r = resolverColas(cola({ tasaLlegadas: 9.5, tasaServicio: 10 }));
    expect(r.diagnosticos.some((d) => d.codigo === 'COLA_SATURADA')).toBe(true);
  });

  it('siempre declara los supuestos del modelo', () => {
    expect(resolverColas(cola({})).diagnosticos.some((d) => d.codigo === 'COLA_SUPUESTOS')).toBe(true);
  });

  it('la curva de espera crece de forma monótona con la utilización', () => {
    const c = curvaEspera(cola({ tasaLlegadas: 5, tasaServicio: 10 }), 40);
    expect(c.length).toBeGreaterThan(30);
    for (let i = 1; i < c.length; i++) {
      expect(c[i]!.tiempoCola).toBeGreaterThan(c[i - 1]!.tiempoCola);
    }
  });
});

describe('colas: cuántos servidores conviene abrir', () => {
  const datos = cola({ tasaLlegadas: 28, tasaServicio: 10, servidores: 4, costoEsperaPorHora: 40, costoServidorPorHora: 95 });

  it('el óptimo no es el que elimina la cola ni el mínimo que estabiliza', () => {
    const opciones = compararServidores(datos, 8);
    const mejor = opciones.reduce((a, b) => (b.costoTotal < a.costoTotal ? b : a), opciones[0]!);

    expect(mejor.servidores).toBe(4);
    // Ni el mínimo estable (3) ni el que casi no tiene cola (8).
    expect(mejor.servidores).not.toBe(opciones[0]!.servidores);
    expect(mejor.servidores).not.toBe(opciones.at(-1)!.servidores);
    // Con cola casi nula el costo total es mayor, no menor.
    expect(opciones.at(-1)!.costoTotal).toBeGreaterThan(mejor.costoTotal);
  });

  it('quitar un servidor multiplica la espera por mucho más que el ahorro', () => {
    const conCuatro = resolverColas(datos).datos!;
    const conTres = resolverColas({ ...datos, servidores: 3 }).datos!;

    expect(conTres.tiempoCola / conCuatro.tiempoCola).toBeGreaterThan(9);
    // Y sale más caro pese a pagar un sueldo menos.
    const costo = (r: typeof conCuatro, s: number): number => r.enSistema * 40 + s * 95;
    expect(costo(conTres, 3)).toBeGreaterThan(costo(conCuatro, 4));
  });
});

describe('los ejercicios de los dos módulos', () => {
  const deTema = (tema: string) => BIBLIOTECA_INICIAL.filter((e) => e.tema === tema);

  it('inventarios: uno transcrito del material y tres derivados', () => {
    const lista = deTema('inventarios');
    expect(lista).toHaveLength(4);

    const textual = lista.filter((e) => e.origen === 'textual');
    expect(textual.map((e) => e.id)).toEqual(['inv-01']);
    expect(fuentePorId(textual[0]!.fuenteId)).not.toBeNull();
    expect(textual[0]!.atribucion).toMatch(/Diapositiva 14/);

    for (const e of lista.filter((x) => x.origen === 'derivado')) {
      expect(e.fuenteId, e.id).toBeNull();
    }
  });

  it('líneas de espera: los cuatro son derivados, porque no hay material', () => {
    const lista = deTema('colas');
    expect(lista).toHaveLength(4);
    for (const e of lista) {
      expect(e.origen, e.id).toBe('derivado');
      expect(e.fuenteId, e.id).toBeNull();
      expect(e.inconsistencias, e.id).toContain('I-17');
    }
    const i17 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-17')!;
    expect(i17.archivoOrigen).toBeNull();
    expect(i17.decision).toBe('derivados');
  });

  it('queda registrado que las fórmulas de la presentación no se pudieron leer', () => {
    const i18 = INCONSISTENCIAS_INICIALES.find((x) => x.id === 'I-18')!;
    expect(i18.decision).toBe('estandar');
    expect(i18.descripcion).toMatch(/imágenes/);
  });

  it('las respuestas guardadas coinciden con lo que calcula el motor', () => {
    for (const e of [...deTema('inventarios'), ...deTema('colas')]) {
      const numericas = e.preguntas.filter((p) => p.tipo === 'numerica');
      expect(numericas.length, e.id).toBeGreaterThan(0);
      for (const p of numericas) {
        expect(typeof p.respuesta, `${e.id}/${p.id}`).toBe('number');
        expect(p.pistas.length, `${e.id}/${p.id}`).toBeGreaterThan(0);
      }
      expect(e.preguntas.some((p) => p.tipo === 'interpretacion'), e.id).toBe(true);
    }
  });
});

describe('errores típicos de los dos módulos', () => {
  const pregunta = (id: string, clave: string) => {
    const e = BIBLIOTECA_INICIAL.find((x) => x.id === id)!;
    return { e, p: e.preguntas.find((q) => q.claveVerificacion === clave)! };
  };

  it('inventarios: olvidar el 2 de la fórmula del lote', () => {
    const { e, p } = pregunta('inv-01', 'inventarios.loteEconomico');
    const sinDos = Math.sqrt((9000 * 2.5) / 2);
    expect(evaluarRespuesta(e, p, sinDos).codigoError).toBe('INV_SIN_EL_DOS');
  });

  it('inventarios: usar la fórmula global con reabastecimiento uniforme', () => {
    const { e, p } = pregunta('inv-03', 'inventarios.loteEconomico');
    const global = Math.sqrt((2 * 24000 * 1800) / 30);
    expect(evaluarRespuesta(e, p, global).codigoError).toBe('INV_IGNORA_TASA');
  });

  it('inventarios: incluir la compra del año en el costo de inventario', () => {
    const { e, p } = pregunta('inv-01', 'inventarios.costoAnual');
    expect(evaluarRespuesta(e, p, 300 + 63000).codigoError).toBe('INV_INCLUYE_COMPRA');
    expect(evaluarRespuesta(e, p, 150).codigoError).toBe('INV_SOLO_UN_COMPONENTE');
  });

  it('inventarios: no convertir la demanda a la escala del tiempo de entrega', () => {
    const { e, p } = pregunta('inv-01', 'inventarios.puntoReorden');
    expect(evaluarRespuesta(e, p, 9000 * 3).codigoError).toBe('INV_ESCALA_TIEMPO');
    expect(evaluarRespuesta(e, p, (9000 / 365) * 3).codigoError).toBe('INV_ANIO_DISTINTO');
  });

  it('inventarios: calcular M sin el tiempo de entrega', () => {
    const { e, p } = pregunta('inv-04', 'inventarios.nivelObjetivo');
    expect(evaluarRespuesta(e, p, 4800 * Math.sqrt((2 * 900) / (4800 * 60))).codigoError).toBe('INV_M_SIN_ENTREGA');
  });

  it('colas: no multiplicar la tasa de servicio por los servidores', () => {
    const { e, p } = pregunta('cola-04', 'colas.utilizacion');
    expect(evaluarRespuesta(e, p, (28 / 10) * 100).codigoError).toBe('COLA_UTILIZACION_SIN_S');
  });

  it('colas: confundir L con Lq y W con Wq', () => {
    const { e, p } = pregunta('cola-01', 'colas.enCola');
    const r = resolverColas({ titulo: '', tasaLlegadas: 6, tasaServicio: 7.5, servidores: 1, unidadTiempo: 'hora', nombreClientes: 'camiones', moneda: 'HNL', costoEsperaPorHora: 0, costoServidorPorHora: 0 }).datos!;
    expect(evaluarRespuesta(e, p, r.enSistema).codigoError).toBe('COLA_CONFUNDE_L_LQ');

    const { p: pw } = pregunta('cola-01', 'colas.tiempoCola');
    expect(evaluarRespuesta(e, pw, r.tiempoSistema).codigoError).toBe('COLA_CONFUNDE_W_WQ');
  });

  it('colas: buscar el número de servidores que elimina la cola', () => {
    const { e, p } = pregunta('cola-04', 'colas.servidoresOptimos');
    const opciones = compararServidores({
      titulo: '', tasaLlegadas: 28, tasaServicio: 10, servidores: 4, unidadTiempo: 'hora',
      nombreClientes: 'socios', moneda: 'HNL', costoEsperaPorHora: 40, costoServidorPorHora: 95,
    });
    expect(evaluarRespuesta(e, p, opciones.at(-1)!.servidores).codigoError).toBe('COLA_BUSCA_CERO');
    expect(evaluarRespuesta(e, p, opciones[0]!.servidores).codigoError).toBe('COLA_MINIMO_ESTABLE');
  });
});
