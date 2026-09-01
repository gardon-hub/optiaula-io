/**
 * Pruebas del motor matemático.
 *
 * Los valores de referencia provienen de los materiales del curso
 * (presentaciones y documentos de ejercicios) o de un cálculo independiente
 * por fuerza bruta dentro de la misma prueba.
 */

import { describe, expect, it } from 'vitest';

import {
  casiIgual,
  formatearNumero,
  normalAcumulada,
  normalInversa,
  redondear,
  singular,
  sumaExacta,
  variacionPorcentual,
  generadorSemilla,
} from '@/nucleo/numero';
import { distanciaEuclidiana, distanciaRectilinea } from '@/nucleo/tipos';
import {
  compararPeriodos,
  resolverProductividad,
  type DatosProductividad,
  type Insumo,
} from '@/nucleo/productividad';
import {
  resolverCargaDistancia,
  resolverCentroGravedad,
  resolverPuntajePonderado,
  sensibilidadPonderacion,
  type PuntoCarga,
} from '@/nucleo/localizacion';
import {
  resolverEquilibrio,
  resolverEquilibrioMultiproducto,
  serieEquilibrio,
  type DatosEquilibrio,
} from '@/nucleo/equilibrio';
import { analizarRetraso, construirAOA, ordenTopologico, resolverCPM, type Actividad } from '@/nucleo/cpm';
import {
  plazoParaConfianza,
  probabilidadPlazo,
  resolverPERT,
  tiempoEsperado,
  varianzaActividad,
} from '@/nucleo/pert';
import { resolverAsignacion, type DatosAsignacion } from '@/nucleo/asignacion';
import {
  balancear,
  compararMetodosIniciales,
  multiplicadores,
  resolverTransporte,
  rutasDeEnvio,
  type DatosTransporte,
} from '@/nucleo/transporte';
import {
  buscarMejorDistribucion,
  centroide,
  compararDistribuciones,
  resolverDistribucion,
  type DatosDistribucion,
} from '@/nucleo/distribucion';

// ─────────────────────────────────────────────────────────────────────────────
describe('numero — cimientos aritméticos', () => {
  it('suma sin acumular error de coma flotante', () => {
    expect(sumaExacta([0.1, 0.2, 0.3])).toBeCloseTo(0.6, 15);
    expect(sumaExacta(Array.from({ length: 1000 }, () => 0.1))).toBeCloseTo(100, 9);
  });

  it('redondea solo para presentación y de forma estable', () => {
    expect(redondear(1.005, 2)).toBe(1.01);
    expect(redondear(2.675, 2)).toBe(2.68);
    expect(redondear(1234.5678, 3)).toBe(1234.568);
  });

  it('calcula la variación porcentual y protege la división entre cero', () => {
    expect(variacionPorcentual(200, 250)).toBeCloseTo(25);
    expect(variacionPorcentual(250, 200)).toBeCloseTo(-20);
    expect(variacionPorcentual(0, 10)).toBeNull();
  });

  it('formatea con separadores hondureños', () => {
    expect(formatearNumero(1234567.891, { decimales: 2 })).toBe('1 234 567,89');
    expect(formatearNumero(-5.5, { decimales: 1 })).toBe('−5,5');
    expect(formatearNumero(3, { decimales: 1, signoExplicito: true })).toBe('+3,0');
  });

  it('aproxima la normal acumulada con precisión de tabla', () => {
    expect(normalAcumulada(0)).toBeCloseTo(0.5, 6);
    expect(normalAcumulada(1)).toBeCloseTo(0.8413, 4);
    expect(normalAcumulada(1.96)).toBeCloseTo(0.975, 4);
    expect(normalAcumulada(-1.88)).toBeCloseTo(0.0301, 4);
    expect(normalAcumulada(2.33)).toBeCloseTo(0.9901, 4);
  });

  it('invierte la normal para niveles de confianza usuales', () => {
    expect(normalInversa(0.95)).toBeCloseTo(1.6449, 3);
    expect(normalInversa(0.975)).toBeCloseTo(1.96, 3);
    expect(normalInversa(0.5)).toBeCloseTo(0, 6);
  });

  it('el generador con semilla es reproducible', () => {
    const a = generadorSemilla(12345);
    const b = generadorSemilla(12345);
    const serieA = Array.from({ length: 10 }, () => a());
    const serieB = Array.from({ length: 10 }, () => b());
    expect(serieA).toEqual(serieB);
    expect(new Set(serieA).size).toBe(10);
  });

  it('singulariza las unidades para redactar «cada hora», «cada unidad»', () => {
    expect(singular('horas')).toBe('hora');
    expect(singular('gramos')).toBe('gramo');
    expect(singular('unidades')).toBe('unidad');
    expect(singular('jornales')).toBe('jornal');
    expect(singular('quintales')).toBe('quintal');
    expect(singular('meses')).toBe('mes');
    expect(singular('camiones')).toBe('camión'); // devuelve la tilde perdida
    expect(singular('raciones')).toBe('ración');
    expect(singular('hora')).toBe('hora'); // ya en singular: no lo mutila
    expect(singular('lempira')).toBe('lempira');
    expect(singular('')).toBe('');
  });

  it('mide distancias rectilíneas y euclidianas', () => {
    expect(distanciaRectilinea({ x: 2.5, y: 4.5 }, { x: 7, y: 2 })).toBeCloseTo(7);
    expect(distanciaEuclidiana({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
    expect(casiIgual(0.1 + 0.2, 0.3)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('productividad', () => {
  const insumosProgreso: Insumo[] = [
    { id: 'mo', nombre: 'Mano de obra', categoria: 'mano_obra', cantidad: 150, unidad: 'hora', costoUnitario: 80 },
    { id: 'en', nombre: 'Energía', categoria: 'energia', cantidad: 300, unidad: 'kWh', costoUnitario: 6 },
    { id: 'al', nombre: 'Alimento balanceado', categoria: 'materiales', cantidad: 1200, unidad: 'kg', costoUnitario: 10 },
    { id: 'fj', nombre: 'Costos fijos', categoria: 'costos_fijos', cantidad: 5000, unidad: 'L', costoUnitario: 1 },
  ];

  const base: DatosProductividad = {
    titulo: 'Finca avícola El Progreso',
    periodo: 'Semana 1',
    moneda: 'HNL',
    insumos: insumosProgreso,
    produccionTerminada: 1400,
    unidadProduccion: 'kg',
    inventarioEnProceso: 100,
    gradoAvance: 0.5,
    tratamiento: 'excluir',
    precioVenta: 35,
    costoTotalDeclarado: null,
  };

  it('suma los insumos del ejercicio 1 en L 30 800 (inconsistencia I-02)', () => {
    const r = resolverProductividad(base);
    expect(r.datos?.costoTotal).toBeCloseTo(30800);
    expect(r.datos?.costoSumado).toBeCloseTo(30800);
  });

  it('avisa cuando el costo declarado no coincide con la suma de insumos', () => {
    const r = resolverProductividad({ ...base, costoTotalDeclarado: 25000 });
    expect(r.datos?.costoTotal).toBeCloseTo(25000);
    expect(r.diagnosticos.some((d) => d.codigo === 'PROD_COSTO_DISCREPANTE')).toBe(true);
  });

  it('calcula productividades parciales física y económica con sus unidades', () => {
    const r = resolverProductividad(base);
    const mo = r.datos?.parciales.find((p) => p.insumo.id === 'mo');
    // 1400 kg / 150 h
    expect(mo?.fisica).toBeCloseTo(9.3333, 4);
    expect(mo?.unidadFisica).toBe('kg / hora');
    // (1400 × 35) / (150 × 80) = 49000 / 12000
    expect(mo?.economica).toBeCloseTo(4.0833, 4);
    expect(mo?.unidadEconomica).toBe('L / L');
  });

  it('calcula la productividad total como valor sobre costo', () => {
    const r = resolverProductividad(base);
    expect(r.datos?.valorProduccion).toBeCloseTo(49000);
    expect(r.datos?.total).toBeCloseTo(49000 / 30800, 6);
    expect(r.datos?.utilidad).toBeCloseTo(49000 - 30800);
  });

  it('aplica los tres tratamientos del inventario en proceso', () => {
    expect(resolverProductividad({ ...base, tratamiento: 'excluir' }).datos?.produccionEquivalente).toBe(1400);
    expect(resolverProductividad({ ...base, tratamiento: 'incluir' }).datos?.produccionEquivalente).toBe(1500);
    expect(resolverProductividad({ ...base, tratamiento: 'ponderado' }).datos?.produccionEquivalente).toBe(1450);
  });

  it('identifica el insumo limitante y el más eficiente', () => {
    const r = resolverProductividad(base);
    // Mano de obra y alimento cuestan lo mismo (12 000): el limitante es uno de ellos.
    expect(['mo', 'al']).toContain(r.datos?.insumoLimitante?.insumo.id);
    expect(r.datos?.insumoMasEficiente?.insumo.id).toBe('en');
  });

  it('rechaza datos incompletos o negativos', () => {
    expect(resolverProductividad({ ...base, insumos: [] }).datos).toBeNull();
    expect(
      resolverProductividad({ ...base, insumos: [{ ...insumosProgreso[0]!, cantidad: -1 }] }).datos,
    ).toBeNull();
    expect(resolverProductividad({ ...base, gradoAvance: 1.5 }).datos).toBeNull();
  });

  it('compara dos periodos y detecta retrocesos parciales', () => {
    const anterior = resolverProductividad(base).datos!;
    const actual = resolverProductividad({ ...base, produccionTerminada: 1600 }).datos!;
    const c = compararPeriodos(anterior, actual);
    expect(c.datos?.variacionTotal).toBeCloseTo(((1600 - 1400) / 1400) * 100, 6);
    expect(c.datos?.variacionesParciales.length).toBe(4);
  });

  it('no compara periodos en monedas distintas', () => {
    const hnl = resolverProductividad(base).datos!;
    const usd = resolverProductividad({ ...base, moneda: 'USD' }).datos!;
    expect(compararPeriodos(hnl, usd).datos).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('localización', () => {
  // Ejemplo Health-Watch de la presentación «metodo carga distancia 2022».
  const healthWatch = {
    titulo: 'Health-Watch',
    escalaMinima: 1,
    escalaMaxima: 5,
    factores: [
      { id: 'f1', nombre: 'Total de pacientes-millas por mes', ponderacion: 25 },
      { id: 'f2', nombre: 'Utilización de la instalación', ponderacion: 20 },
      { id: 'f3', nombre: 'Tiempo promedio por viaje de emergencia', ponderacion: 20 },
      { id: 'f4', nombre: 'Accesibilidad de autopistas', ponderacion: 15 },
      { id: 'f5', nombre: 'Costos de la tierra y la construcción', ponderacion: 10 },
      { id: 'f6', nombre: 'Preferencias del empleado', ponderacion: 10 },
    ],
    sitios: [
      { id: 's1', nombre: 'Sitio 1', calificaciones: { f1: 4, f2: 3, f3: 3, f4: 4, f5: 1, f6: 5 } },
      { id: 's2', nombre: 'Sitio 2', calificaciones: { f1: 5, f2: 3, f3: 4, f4: 4, f5: 3, f6: 4 } },
    ],
  };

  it('reproduce los puntajes 340 y 395 del material del curso', () => {
    const r = resolverPuntajePonderado(healthWatch);
    expect(r.datos?.puntajes[0]?.puntaje).toBeCloseTo(340);
    expect(r.datos?.puntajes[1]?.puntaje).toBeCloseTo(395);
    expect(r.datos?.ganador?.sitio.id).toBe('s2');
  });

  it('normaliza ponderaciones que no suman 100', () => {
    const r = resolverPuntajePonderado({
      ...healthWatch,
      factores: healthWatch.factores.map((f) => ({ ...f, ponderacion: f.ponderacion / 2 })),
    });
    expect(r.diagnosticos.some((d) => d.codigo === 'LOC_PONDERACION_NO_100')).toBe(true);
    expect(r.datos?.puntajes[1]?.puntaje).toBeCloseTo(395);
  });

  it('detecta empates', () => {
    const r = resolverPuntajePonderado({
      ...healthWatch,
      sitios: [healthWatch.sitios[0]!, { ...healthWatch.sitios[1]!, calificaciones: healthWatch.sitios[0]!.calificaciones }],
    });
    expect(r.datos?.empate).toBe(true);
  });

  it('detecta calificaciones faltantes', () => {
    const r = resolverPuntajePonderado({
      ...healthWatch,
      sitios: [{ id: 'x', nombre: 'Incompleto', calificaciones: { f1: 4 } }],
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'LOC_CALIFICACION_FALTANTE')).toBe(true);
  });

  // Ejemplo de 7 sectores censales de la misma presentación.
  const sectores: PuntoCarga[] = [
    { id: 'A', nombre: 'A', punto: { x: 2.5, y: 4.5 }, carga: 2 },
    { id: 'B', nombre: 'B', punto: { x: 2.5, y: 2.5 }, carga: 5 },
    { id: 'C', nombre: 'C', punto: { x: 5.5, y: 4.5 }, carga: 10 },
    { id: 'D', nombre: 'D', punto: { x: 5, y: 2 }, carga: 7 },
    { id: 'E', nombre: 'E', punto: { x: 8, y: 5 }, carga: 10 },
    { id: 'F', nombre: 'F', punto: { x: 7, y: 2 }, carga: 20 },
    { id: 'G', nombre: 'G', punto: { x: 9, y: 2.5 }, carga: 14 },
  ];

  it('reproduce los puntajes carga-distancia 239 y 168 del material', () => {
    const r = resolverCargaDistancia({
      titulo: 'Sectores censales',
      puntos: sectores,
      tipoDistancia: 'rectilinea',
      unidadCarga: 'habitantes',
      unidadDistancia: 'km',
      candidatos: [
        { id: 'c1', nombre: 'Localización (5.5, 4.5)', calificaciones: {}, punto: { x: 5.5, y: 4.5 } },
        { id: 'c2', nombre: 'Localización (7, 2)', calificaciones: {}, punto: { x: 7, y: 2 } },
      ],
    });
    expect(r.datos?.evaluaciones[0]?.total).toBeCloseTo(239);
    expect(r.datos?.evaluaciones[1]?.total).toBeCloseTo(168);
    expect(r.datos?.mejor?.sitio.id).toBe('c2');
  });

  it('reproduce el centro de gravedad (6.67, 3.02) del material', () => {
    const r = resolverCentroGravedad(sectores);
    expect(r.datos?.sumaCargas).toBeCloseTo(68);
    expect(r.datos?.sumaCargaX).toBeCloseTo(453.5);
    expect(r.datos?.sumaCargaY).toBeCloseTo(205.5);
    expect(r.datos?.centro.x).toBeCloseTo(6.67, 2);
    expect(r.datos?.centro.y).toBeCloseTo(3.02, 2);
  });

  it('rechaza el centro de gravedad cuando la carga total es cero', () => {
    const r = resolverCentroGravedad(sectores.map((s) => ({ ...s, carga: 0 })));
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'CG_CARGA_TOTAL_CERO')).toBe(true);
  });

  it('el barrido de sensibilidad recorre la ponderación de 0 a 100', () => {
    const s = sensibilidadPonderacion(healthWatch, 'f5', 11);
    expect(s.length).toBe(11);
    expect(s[0]?.ponderacion).toBe(0);
    expect(s[10]?.ponderacion).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('punto de equilibrio', () => {
  const base: DatosEquilibrio = {
    titulo: 'Prueba',
    moneda: 'HNL',
    costosFijos: 50000,
    costoVariableUnitario: 20,
    precioVenta: 45,
    comisionPorcentaje: 0,
    valorRecuperacion: 0,
    capacidad: 5000,
    volumenEsperado: 3000,
    utilidadObjetivo: 25000,
    unidadProducto: 'unidad',
  };

  it('calcula el equilibrio en unidades y en dinero', () => {
    const r = resolverEquilibrio(base).datos!;
    expect(r.margenContribucionUnitario).toBeCloseTo(25);
    expect(r.puntoEquilibrioUnidades).toBeCloseTo(2000);
    expect(r.puntoEquilibrioMonetario).toBeCloseTo(90000);
    expect(r.porcentajeCapacidad).toBeCloseTo(40);
  });

  it('calcula el volumen para una utilidad objetivo', () => {
    const r = resolverEquilibrio(base).datos!;
    expect(r.unidadesParaObjetivo).toBeCloseTo((50000 + 25000) / 25);
  });

  it('calcula la utilidad esperada y el margen de seguridad', () => {
    const r = resolverEquilibrio(base).datos!;
    expect(r.utilidadEsperada).toBeCloseTo(3000 * 25 - 50000);
    expect(r.margenSeguridadUnidades).toBeCloseTo(1000);
    expect(r.margenSeguridadPorcentaje).toBeCloseTo(33.3333, 3);
  });

  it('trata la comisión como costo variable', () => {
    const r = resolverEquilibrio({ ...base, comisionPorcentaje: 10 }).datos!;
    expect(r.costoVariableEfectivo).toBeCloseTo(20 + 4.5);
    expect(r.margenContribucionUnitario).toBeCloseTo(20.5);
    expect(r.puntoEquilibrioUnidades).toBeCloseTo(50000 / 20.5, 6);
  });

  it('descuenta el valor de recuperación de los costos fijos', () => {
    const r = resolverEquilibrio({ ...base, valorRecuperacion: 5000 }).datos!;
    expect(r.costosFijosNetos).toBeCloseTo(45000);
    expect(r.puntoEquilibrioUnidades).toBeCloseTo(1800);
  });

  it('declara inalcanzable el equilibrio con margen de contribución negativo', () => {
    const r = resolverEquilibrio({ ...base, costoVariableUnitario: 60 });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'EQ_MARGEN_NO_POSITIVO')).toBe(true);
  });

  it('avisa cuando el equilibrio excede la capacidad instalada', () => {
    const r = resolverEquilibrio({ ...base, capacidad: 1000 });
    expect(r.diagnosticos.some((d) => d.codigo === 'EQ_SOBRE_CAPACIDAD')).toBe(true);
  });

  it('la serie de la gráfica cruza exactamente en el equilibrio', () => {
    const serie = serieEquilibrio(base, 101);
    const cruce = serie.find((p) => Math.abs(p.utilidad) < 1e-6 && p.cantidad > 0);
    expect(cruce?.cantidad).toBeCloseTo(2000, 6);
    expect(serie[0]?.utilidad).toBeLessThan(0);
    expect(serie.at(-1)!.utilidad).toBeGreaterThan(0);
  });

  it('resuelve el equilibrio multiproducto por mezcla de ingresos', () => {
    const r = resolverEquilibrioMultiproducto({
      titulo: 'Mezcla',
      moneda: 'HNL',
      costosFijos: 60000,
      baseMezcla: 'ingresos',
      productos: [
        { id: 'a', nombre: 'Huevo', precioVenta: 100, costoVariableUnitario: 60, participacion: 60 },
        { id: 'b', nombre: 'Pollo', precioVenta: 50, costoVariableUnitario: 20, participacion: 40 },
      ],
    }).datos!;
    // r = 0.4 × 0.6 + 0.6 × 0.4 = 0.24 + 0.24 = 0.48
    expect(r.razonPonderada).toBeCloseTo(0.48, 10);
    expect(r.ingresoEquilibrio).toBeCloseTo(125000);
    expect(r.detalle[0]?.ingresoEquilibrio).toBeCloseTo(75000);
    expect(r.detalle[0]?.unidadesEquilibrio).toBeCloseTo(750);
  });

  it('normaliza una mezcla que no suma 100 %', () => {
    const r = resolverEquilibrioMultiproducto({
      titulo: 'Mezcla',
      moneda: 'HNL',
      costosFijos: 60000,
      baseMezcla: 'ingresos',
      productos: [
        { id: 'a', nombre: 'Huevo', precioVenta: 100, costoVariableUnitario: 60, participacion: 30 },
        { id: 'b', nombre: 'Pollo', precioVenta: 50, costoVariableUnitario: 20, participacion: 20 },
      ],
    });
    expect(r.diagnosticos.some((d) => d.codigo === 'EQM_MEZCLA_NO_100')).toBe(true);
    expect(r.datos?.razonPonderada).toBeCloseTo(0.48, 10);
  });

  it('resuelve el equilibrio multiproducto por mezcla de unidades', () => {
    const r = resolverEquilibrioMultiproducto({
      titulo: 'Mezcla',
      moneda: 'HNL',
      costosFijos: 60000,
      baseMezcla: 'unidades',
      productos: [
        { id: 'a', nombre: 'Huevo', precioVenta: 100, costoVariableUnitario: 60, participacion: 60 },
        { id: 'b', nombre: 'Pollo', precioVenta: 50, costoVariableUnitario: 20, participacion: 40 },
      ],
    }).datos!;
    // MC ponderado = 40 × 0,6 + 30 × 0,4 = 24 + 12 = 36 por unidad promedio.
    expect(r.margenPonderado).toBeCloseTo(36, 10);
    expect(r.unidadesEquilibrio).toBeCloseTo(60000 / 36, 8);
    expect(r.detalle[0]?.unidadesEquilibrio).toBeCloseTo((60000 / 36) * 0.6, 8);
    // El ingreso se deriva del reparto, no al revés.
    expect(r.ingresoEquilibrio).toBeCloseTo((60000 / 36) * 0.6 * 100 + (60000 / 36) * 0.4 * 50, 6);
  });

  it('las dos bases dan puntos de equilibrio distintos con los mismos porcentajes', () => {
    const mezcla = [
      { id: 'a', nombre: 'Huevo', precioVenta: 100, costoVariableUnitario: 60, participacion: 60 },
      { id: 'b', nombre: 'Pollo', precioVenta: 50, costoVariableUnitario: 20, participacion: 40 },
    ];
    const comun = { titulo: 'Mezcla', moneda: 'HNL' as const, costosFijos: 60000, productos: mezcla };
    const porUnidades = resolverEquilibrioMultiproducto({ ...comun, baseMezcla: 'unidades' }).datos!;
    const porIngresos = resolverEquilibrioMultiproducto({ ...comun, baseMezcla: 'ingresos' }).datos!;

    // Esta diferencia es justamente la ambigüedad I-13: no es un detalle de redondeo.
    expect(porUnidades.ingresoEquilibrio!).not.toBeCloseTo(porIngresos.ingresoEquilibrio!, 0);

    // Sea cual sea la base, el plan devuelto cubre exactamente los costos fijos.
    for (const r of [porUnidades, porIngresos]) {
      const contribucion = r.detalle.reduce((t, x) => t + x.unidadesEquilibrio! * x.margenUnitario, 0);
      expect(contribucion).toBeCloseTo(60000, 6);
    }
  });

  it('avisa que la base en unidades suma productos que pueden no ser comparables', () => {
    const r = resolverEquilibrioMultiproducto({
      titulo: 'Mezcla',
      moneda: 'HNL',
      costosFijos: 60000,
      baseMezcla: 'unidades',
      productos: [
        { id: 'a', nombre: 'Huevo', precioVenta: 100, costoVariableUnitario: 60, participacion: 60 },
        { id: 'b', nombre: 'Pollo', precioVenta: 50, costoVariableUnitario: 20, participacion: 40 },
      ],
    });
    expect(r.diagnosticos.some((d) => d.codigo === 'EQM_BASE_UNIDADES')).toBe(true);
    expect(r.diagnosticos.every((d) => d.gravedad !== 'error')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('CPM', () => {
  // Problema 1 del documento «Diagrama de redes y ruta critica».
  const lacteos: Actividad[] = [
    { id: 'A', descripcion: 'Estudios de factibilidad', predecesoras: [], duracion: 5 },
    { id: 'B', descripcion: 'Diseño arquitectónico', predecesoras: ['A'], duracion: 4 },
    { id: 'C', descripcion: 'Adquisición de permisos', predecesoras: ['A'], duracion: 3 },
    { id: 'D', descripcion: 'Movimiento de tierra', predecesoras: ['B'], duracion: 6 },
    { id: 'E', descripcion: 'Instalación de cimentación', predecesoras: ['D'], duracion: 5 },
    { id: 'F', descripcion: 'Construcción de estructura', predecesoras: ['E'], duracion: 7 },
    { id: 'G', descripcion: 'Instalación de servicios básicos', predecesoras: ['C'], duracion: 4 },
    { id: 'H', descripcion: 'Equipamiento interno', predecesoras: ['F', 'G'], duracion: 5 },
    { id: 'I', descripcion: 'Capacitación del personal', predecesoras: ['H'], duracion: 3 },
    { id: 'J', descripcion: 'Inspección y apertura', predecesoras: ['I'], duracion: 2 },
  ];

  const datos = { titulo: 'Planta de lácteos', actividades: lacteos, unidadTiempo: 'semanas' };

  it('ordena topológicamente respetando las precedencias', () => {
    const o = ordenTopologico(lacteos);
    expect('orden' in o).toBe(true);
    if ('orden' in o) {
      for (const a of lacteos) {
        for (const p of a.predecesoras) {
          expect(o.orden.indexOf(p)).toBeLessThan(o.orden.indexOf(a.id));
        }
      }
    }
  });

  it('calcula la duración del proyecto en 37 semanas', () => {
    const r = resolverCPM(datos).datos!;
    expect(r.duracionProyecto).toBe(37);
  });

  it('identifica la ruta crítica A-B-D-E-F-H-I-J', () => {
    const r = resolverCPM(datos).datos!;
    expect(r.rutasCriticas.length).toBe(1);
    expect(r.rutasCriticas[0]?.actividades).toEqual(['A', 'B', 'D', 'E', 'F', 'H', 'I', 'J']);
    expect(r.rutasCriticas[0]?.duracion).toBe(37);
  });

  it('calcula holguras correctas para la rama no crítica', () => {
    const r = resolverCPM(datos).datos!;
    const c = r.calculadas.find((x) => x.actividad.id === 'C')!;
    const g = r.calculadas.find((x) => x.actividad.id === 'G')!;
    // La rama A→C→G tarda 7; la rama A→B→D→E→F tarda 22. Holgura = 15.
    expect(c.holguraTotal).toBe(15);
    expect(g.holguraTotal).toBe(15);
    expect(c.critica).toBe(false);
  });

  it('la actividad con múltiples predecesoras arranca con la mayor terminación temprana', () => {
    const r = resolverCPM(datos).datos!;
    const h = r.calculadas.find((x) => x.actividad.id === 'H')!;
    const f = r.calculadas.find((x) => x.actividad.id === 'F')!;
    const g = r.calculadas.find((x) => x.actividad.id === 'G')!;
    expect(h.it).toBe(Math.max(f.tt, g.tt));
    expect(h.it).toBe(27);
  });

  it('detecta ciclos en la red', () => {
    const r = resolverCPM({
      ...datos,
      actividades: [
        { id: 'A', descripcion: 'a', predecesoras: ['C'], duracion: 1 },
        { id: 'B', descripcion: 'b', predecesoras: ['A'], duracion: 1 },
        { id: 'C', descripcion: 'c', predecesoras: ['B'], duracion: 1 },
      ],
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'CPM_CICLO')).toBe(true);
  });

  it('detecta predecesoras inexistentes', () => {
    const r = resolverCPM({
      ...datos,
      actividades: [{ id: 'A', descripcion: 'a', predecesoras: ['Z'], duracion: 1 }],
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'CPM_PREDECESORA_INEXISTENTE')).toBe(true);
  });

  it('encuentra todas las rutas críticas cuando hay varias', () => {
    const r = resolverCPM({
      titulo: 'Rutas paralelas',
      unidadTiempo: 'días',
      actividades: [
        { id: 'A', descripcion: 'inicio', predecesoras: [], duracion: 2 },
        { id: 'B', descripcion: 'rama 1', predecesoras: ['A'], duracion: 5 },
        { id: 'C', descripcion: 'rama 2', predecesoras: ['A'], duracion: 5 },
        { id: 'D', descripcion: 'cierre', predecesoras: ['B', 'C'], duracion: 3 },
      ],
    }).datos!;
    expect(r.duracionProyecto).toBe(10);
    expect(r.rutasCriticas.length).toBe(2);
  });

  it('maneja duraciones decimales', () => {
    const r = resolverCPM({
      titulo: 'Decimales',
      unidadTiempo: 'horas',
      actividades: [
        { id: 'A', descripcion: 'a', predecesoras: [], duracion: 1.5 },
        { id: 'B', descripcion: 'b', predecesoras: ['A'], duracion: 2.25 },
      ],
    }).datos!;
    expect(r.duracionProyecto).toBeCloseTo(3.75);
  });

  it('absorbe un retraso dentro de la holgura', () => {
    const r = analizarRetraso(datos, 'G', 1).datos!;
    expect(r.absorbido).toBe(true);
    expect(r.impacto).toBe(0);
    expect(r.duracionNueva).toBe(37);
  });

  it('traslada íntegro el retraso de una actividad crítica', () => {
    const r = analizarRetraso(datos, 'F', 3).datos!;
    expect(r.absorbido).toBe(false);
    expect(r.impacto).toBe(3);
    expect(r.duracionNueva).toBe(40);
  });

  it('construye la red de actividades en flechas con ficticias', () => {
    const aoa = construirAOA(lacteos);
    expect(aoa.arcos.filter((a) => !a.ficticia).length).toBe(lacteos.length);
    expect(aoa.cantidadFicticias).toBeGreaterThan(0);
    for (const arco of aoa.arcos) {
      expect(arco.desde).not.toBe(arco.hasta);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PERT', () => {
  // Problema 1 del documento «Ejercicios de Pert»: invernadero.
  const invernadero = {
    titulo: 'Invernadero',
    unidadTiempo: 'días',
    actividades: [
      { id: 'A', descripcion: 'Selección del terreno', predecesoras: [], a: 2, m: 3, b: 4 },
      { id: 'B', descripcion: 'Preparación del terreno', predecesoras: ['A'], a: 2, m: 4, b: 6 },
      { id: 'C', descripcion: 'Instalación de estructura', predecesoras: ['B'], a: 3, m: 5, b: 8 },
      { id: 'D', descripcion: 'Instalación de riego', predecesoras: ['B'], a: 2, m: 3, b: 5 },
      { id: 'E', descripcion: 'Instalación de plástico', predecesoras: ['C'], a: 1, m: 2, b: 4 },
      { id: 'F', descripcion: 'Pruebas de funcionamiento', predecesoras: ['D', 'E'], a: 1, m: 2, b: 3 },
    ],
  };

  it('aplica las fórmulas de tiempo esperado y varianza', () => {
    expect(tiempoEsperado(2, 3, 4)).toBeCloseTo(3);
    expect(tiempoEsperado(3, 5, 8)).toBeCloseTo(31 / 6);
    expect(varianzaActividad(2, 4)).toBeCloseTo((2 / 6) ** 2);
    expect(varianzaActividad(3, 8)).toBeCloseTo((5 / 6) ** 2);
  });

  it('calcula la duración esperada y la ruta crítica probabilística', () => {
    const r = resolverPERT(invernadero).datos!;
    expect(r.duracionEsperada).toBeCloseTo(3 + 4 + 31 / 6 + 13 / 6 + 2, 9);
    expect(r.duracionEsperada).toBeCloseTo(16.3333, 3);
    expect(r.rutaEvaluada).toEqual(['A', 'B', 'C', 'E', 'F']);
  });

  it('suma varianzas, nunca desviaciones', () => {
    const r = resolverPERT(invernadero).datos!;
    const esperada = (2 / 6) ** 2 + (4 / 6) ** 2 + (5 / 6) ** 2 + (3 / 6) ** 2 + (2 / 6) ** 2;
    expect(r.varianzaProyecto).toBeCloseTo(esperada, 9);
    expect(r.desviacionProyecto).toBeCloseTo(Math.sqrt(esperada), 9);
  });

  it('calcula la probabilidad de terminar en menos de 18 días', () => {
    const p = resolverPERT(invernadero).datos!;
    const r = probabilidadPlazo({
      media: p.duracionEsperada,
      desviacion: p.desviacionProyecto,
      plazo: 18,
      sentido: 'antes',
      unidadTiempo: 'días',
    }).datos!;
    expect(r.z).toBeCloseTo((18 - p.duracionEsperada) / p.desviacionProyecto, 9);
    expect(r.probabilidad).toBeGreaterThan(0.89);
    expect(r.probabilidad).toBeLessThan(0.92);
  });

  it('resuelve el problema 3: media 80, desviación 8', () => {
    const menos65 = probabilidadPlazo({ media: 80, desviacion: 8, plazo: 65, sentido: 'antes', unidadTiempo: 'semanas' }).datos!;
    expect(menos65.z).toBeCloseTo(-1.875, 6);
    expect(menos65.probabilidad).toBeCloseTo(0.0304, 3);

    const mas90 = probabilidadPlazo({ media: 80, desviacion: 8, plazo: 90, sentido: 'despues', unidadTiempo: 'semanas' }).datos!;
    expect(mas90.z).toBeCloseTo(1.25, 6);
    expect(mas90.probabilidad).toBeCloseTo(0.1056, 3);

    const conf95 = plazoParaConfianza(80, 8, 0.95, 'semanas').datos!;
    expect(conf95.z).toBeCloseTo(1.6449, 3);
    expect(conf95.plazo).toBeCloseTo(93.16, 1);
  });

  it('rechaza tiempos que violan a ≤ m ≤ b', () => {
    const r = resolverPERT({
      ...invernadero,
      actividades: [{ id: 'A', descripcion: 'x', predecesoras: [], a: 5, m: 3, b: 4 }],
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'PERT_ORDEN_AM')).toBe(true);
  });

  it('detecta la red totalmente secuencial del problema 2 (inconsistencia I-08)', () => {
    const r = resolverPERT({
      titulo: 'Yogurt',
      unidadTiempo: 'horas',
      actividades: [
        { id: 'A', descripcion: 'Recolección', predecesoras: [], a: 1, m: 2, b: 3 },
        { id: 'B', descripcion: 'Pasteurización', predecesoras: ['A'], a: 1, m: 2, b: 4 },
        { id: 'C', descripcion: 'Enfriamiento', predecesoras: ['B'], a: 1, m: 1, b: 2 },
        { id: 'D', descripcion: 'Inoculación', predecesoras: ['C'], a: 0.5, m: 1, b: 1.5 },
        { id: 'E', descripcion: 'Incubación', predecesoras: ['D'], a: 5, m: 6, b: 8 },
        { id: 'F', descripcion: 'Empacado', predecesoras: ['E'], a: 1, m: 1.5, b: 2.5 },
      ],
    }).datos!;
    expect(r.calculadas.every((c) => c.cpm.critica)).toBe(true);
    expect(r.rutaEvaluada.length).toBe(6);
  });

  it('rechaza el cálculo de probabilidad con desviación cero', () => {
    const r = probabilidadPlazo({ media: 10, desviacion: 0, plazo: 12, sentido: 'antes', unidadTiempo: 'días' });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'PERT_SIGMA_CERO')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('asignación — método húngaro', () => {
  /** Óptimo por fuerza bruta, para validar el método húngaro de forma independiente. */
  function optimoFuerzaBruta(matriz: readonly (readonly (number | null)[])[], maximizar: boolean): number {
    const m = matriz.length;
    const n = matriz[0]?.length ?? 0;
    const tam = Math.max(m, n);
    const valor = (i: number, j: number): number | null => {
      if (i >= m || j >= n) return 0;
      return matriz[i]![j] ?? null;
    };

    let mejor = maximizar ? -Infinity : Infinity;
    const usada = new Array<boolean>(tam).fill(false);

    const recorrer = (fila: number, acumulado: number): void => {
      if (fila === tam) {
        if (maximizar ? acumulado > mejor : acumulado < mejor) mejor = acumulado;
        return;
      }
      for (let j = 0; j < tam; j++) {
        if (usada[j]) continue;
        const v = valor(fila, j);
        if (v === null) continue;
        usada[j] = true;
        recorrer(fila + 1, acumulado + v);
        usada[j] = false;
      }
    };
    recorrer(0, 0);
    return mejor;
  }

  // Problema 1: finca cafetalera, 4 trabajadores × 4 parcelas.
  const cafetalera: DatosAsignacion = {
    titulo: 'Finca cafetalera',
    filas: ['Trabajador 1', 'Trabajador 2', 'Trabajador 3', 'Trabajador 4'],
    columnas: ['Parcela 1', 'Parcela 2', 'Parcela 3', 'Parcela 4'],
    matriz: [
      [45, 52, 41, 60],
      [50, 47, 55, 53],
      [46, 44, 48, 51],
      [58, 49, 52, 47],
    ],
    objetivo: 'minimizar',
    unidad: 'minutos',
    nombreFilas: 'trabajadores',
    nombreColumnas: 'parcelas',
  };

  it('alcanza el óptimo verificado por fuerza bruta', () => {
    const r = resolverAsignacion(cafetalera).datos!;
    expect(r.valorTotal).toBe(optimoFuerzaBruta(cafetalera.matriz, false));
  });

  it('asigna cada fila a una columna distinta', () => {
    const r = resolverAsignacion(cafetalera).datos!;
    expect(new Set(r.asignaciones.map((a) => a.fila)).size).toBe(4);
    expect(new Set(r.asignaciones.map((a) => a.columna)).size).toBe(4);
  });

  it('registra todas las etapas del método', () => {
    const r = resolverAsignacion(cafetalera);
    const titulos = r.pasos.map((p) => p.titulo);
    expect(titulos).toContain('Matriz original');
    expect(titulos).toContain('Reducción por filas');
    expect(titulos).toContain('Reducción por columnas');
    expect(titulos).toContain('Seleccionar las asignaciones');
    expect(titulos).toContain('Calcular el valor total');
  });

  it('resuelve maximización convirtiendo a oportunidad perdida', () => {
    // Problema 4: agrónomos en proyectos, 5 × 5.
    const agronomos: DatosAsignacion = {
      titulo: 'Agrónomos',
      filas: ['Ag 1', 'Ag 2', 'Ag 3', 'Ag 4', 'Ag 5'],
      columnas: ['Maíz', 'Frijol', 'Café', 'Hortalizas', 'Caña'],
      matriz: [
        [8, 6, 7, 9, 5],
        [7, 9, 6, 8, 7],
        [6, 7, 9, 6, 8],
        [9, 5, 8, 7, 6],
        [5, 8, 7, 6, 9],
      ],
      objetivo: 'maximizar',
      unidad: 'puntos',
      nombreFilas: 'agrónomos',
      nombreColumnas: 'proyectos',
    };
    const r = resolverAsignacion(agronomos).datos!;
    expect(r.valorTotal).toBe(optimoFuerzaBruta(agronomos.matriz, true));
    expect(r.valorTotal).toBe(45); // 9+9+9+9+9: cada agrónomo en su especialidad
  });

  it('resuelve matrices rectangulares agregando filas ficticias', () => {
    const rect: DatosAsignacion = {
      titulo: 'Rectangular',
      filas: ['R1', 'R2'],
      columnas: ['C1', 'C2', 'C3'],
      matriz: [
        [4, 2, 8],
        [4, 3, 7],
      ],
      objetivo: 'minimizar',
      unidad: 'L',
      nombreFilas: 'recursos',
      nombreColumnas: 'tareas',
    };
    const r = resolverAsignacion(rect).datos!;
    expect(r.filasFicticias).toBe(1);
    expect(r.columnasFicticias).toBe(0);
    expect(r.valorTotal).toBe(optimoFuerzaBruta(rect.matriz, false));
    expect(r.sinAsignar.length).toBe(1);
  });

  it('resuelve matrices rectangulares con más filas que columnas', () => {
    const rect: DatosAsignacion = {
      titulo: 'Rectangular inversa',
      filas: ['R1', 'R2', 'R3'],
      columnas: ['C1', 'C2'],
      matriz: [
        [4, 2],
        [4, 3],
        [1, 9],
      ],
      objetivo: 'minimizar',
      unidad: 'L',
      nombreFilas: 'recursos',
      nombreColumnas: 'tareas',
    };
    const r = resolverAsignacion(rect).datos!;
    expect(r.columnasFicticias).toBe(1);
    expect(r.valorTotal).toBe(3); // R3→C1 (1) + R1→C2 (2)
  });

  it('respeta las asignaciones prohibidas', () => {
    const conProhibidas: DatosAsignacion = {
      ...cafetalera,
      matriz: [
        [45, 52, null, 60],
        [50, 47, 55, 53],
        [46, 44, 48, 51],
        [58, 49, 52, 47],
      ],
    };
    const r = resolverAsignacion(conProhibidas).datos!;
    const prohibida = r.asignaciones.find((a) => a.fila === 0 && a.columna === 2);
    expect(prohibida).toBeUndefined();
    expect(r.valorTotal).toBe(optimoFuerzaBruta(conProhibidas.matriz, false));
  });

  it('rechaza una fila enteramente prohibida', () => {
    const r = resolverAsignacion({
      ...cafetalera,
      matriz: [[null, null, null, null], [50, 47, 55, 53], [46, 44, 48, 51], [58, 49, 52, 47]],
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'ASIG_FILA_PROHIBIDA')).toBe(true);
  });

  it('detecta soluciones óptimas alternativas', () => {
    const empatada: DatosAsignacion = {
      ...cafetalera,
      filas: ['A', 'B'],
      columnas: ['X', 'Y'],
      matriz: [
        [1, 1],
        [1, 1],
      ],
    };
    const r = resolverAsignacion(empatada).datos!;
    expect(r.solucionesAlternativas).toBe(true);
    expect(r.valorTotal).toBe(2);
  });

  it('trabaja con valores decimales', () => {
    const r = resolverAsignacion({
      ...cafetalera,
      filas: ['A', 'B'],
      columnas: ['X', 'Y'],
      matriz: [
        [1.5, 2.25],
        [3.75, 1.125],
      ],
    }).datos!;
    expect(r.valorTotal).toBeCloseTo(2.625, 6);
  });

  it('rechaza filas con longitud incorrecta (importación defectuosa)', () => {
    const r = resolverAsignacion({ ...cafetalera, matriz: [[1, 2], [3, 4, 5, 6], [1, 2, 3, 4], [1, 2, 3, 4]] });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'ASIG_COLUMNAS_INCOMPLETAS')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('transporte', () => {
  // Problema 1 del documento: cooperativa La Hacienda.
  const laHacienda: DatosTransporte = {
    titulo: 'Cooperativa La Hacienda',
    origenes: ['C1', 'C2', 'C3'],
    destinos: ['M1', 'M2', 'M3', 'M4'],
    costos: [
      [12, 9, 14, 16],
      [13, 7, 11, 10],
      [15, 12, 8, 9],
    ],
    oferta: [100, 120, 80],
    demanda: [90, 80, 70, 60],
    unidadCosto: 'L',
    unidadCantidad: 'litros',
  };

  it('reconoce un problema balanceado', () => {
    const { problema } = balancear(laHacienda);
    expect(problema.origenFicticio).toBe(false);
    expect(problema.destinoFicticio).toBe(false);
    expect(problema.origenes.length).toBe(3);
    expect(problema.destinos.length).toBe(4);
  });

  it('agrega destino ficticio cuando sobra oferta', () => {
    const { problema } = balancear({ ...laHacienda, oferta: [150, 120, 80] });
    expect(problema.destinoFicticio).toBe(true);
    expect(problema.destinos.length).toBe(5);
    expect(problema.cantidadFicticia).toBe(50);
    expect(problema.costos.every((f) => f.at(-1) === 0)).toBe(true);
  });

  it('agrega origen ficticio cuando falta oferta', () => {
    const { problema } = balancear({ ...laHacienda, oferta: [50, 120, 80] });
    expect(problema.origenFicticio).toBe(true);
    expect(problema.origenes.length).toBe(4);
    expect(problema.cantidadFicticia).toBe(50);
  });

  it('los tres métodos iniciales convergen al mismo óptimo', () => {
    const c = compararMetodosIniciales(laHacienda).datos!;
    const costos = c.resultados.map((r) => r.costoOptimo);
    expect(Math.max(...costos) - Math.min(...costos)).toBeLessThan(1e-6);
  });

  it('Vogel arranca al menos tan cerca del óptimo como la esquina noroeste', () => {
    const c = compararMetodosIniciales(laHacienda).datos!;
    const noroeste = c.resultados.find((r) => r.metodo === 'noroeste')!;
    const vogel = c.resultados.find((r) => r.metodo === 'vogel')!;
    expect(vogel.costoInicial).toBeLessThanOrEqual(noroeste.costoInicial);
  });

  it('la solución óptima respeta oferta y demanda', () => {
    const r = resolverTransporte(laHacienda).datos!;
    const { problema, solucionOptima } = r;
    for (let i = 0; i < problema.origenes.length; i++) {
      const enviado = sumaExacta(solucionOptima.envios[i]!.slice());
      expect(enviado).toBeCloseTo(problema.oferta[i]!, 9);
    }
    for (let j = 0; j < problema.destinos.length; j++) {
      const recibido = sumaExacta(problema.origenes.map((_, i) => solucionOptima.envios[i]![j]!));
      expect(recibido).toBeCloseTo(problema.demanda[j]!, 9);
    }
  });

  it('la solución óptima cumple la condición de optimalidad de MODI', () => {
    const r = resolverTransporte(laHacienda).datos!;
    const { problema, solucionOptima } = r;
    const { u, v, completo } = multiplicadores(problema, solucionOptima.basicas);
    expect(completo).toBe(true);
    for (let i = 0; i < problema.origenes.length; i++) {
      for (let j = 0; j < problema.destinos.length; j++) {
        if (solucionOptima.basicas[i]![j]) continue;
        const reducido = problema.costos[i]![j]! - u[i]! - v[j]!;
        expect(reducido).toBeGreaterThanOrEqual(-1e-9);
      }
    }
  });

  it('resuelve un problema no balanceado con demanda insatisfecha', () => {
    const r = resolverTransporte({ ...laHacienda, oferta: [80, 100, 60] }).datos!;
    expect(r.problema.origenFicticio).toBe(true);
    const rutas = rutasDeEnvio(r.problema, r.solucionOptima);
    expect(rutas.some((x) => x.ficticia)).toBe(true);
    expect(sumaExacta(rutas.filter((x) => x.ficticia).map((x) => x.cantidad))).toBeCloseTo(60);
  });

  it('resuelve un problema no balanceado con excedente de oferta', () => {
    const r = resolverTransporte({ ...laHacienda, demanda: [90, 80, 70, 20] }).datos!;
    expect(r.problema.destinoFicticio).toBe(true);
    expect(r.solucionOptima.costoTotal).toBeGreaterThan(0);
  });

  it('rechaza matrices de costo incompletas', () => {
    const r = resolverTransporte({ ...laHacienda, costos: [[12, 9], [13, 7, 11, 10], [15, 12, 8, 9]] });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'TR_COSTOS_COLUMNAS')).toBe(true);
  });

  it('rechaza ofertas negativas', () => {
    const r = resolverTransporte({ ...laHacienda, oferta: [-10, 120, 80] });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'TR_OFERTA_NEGATIVA')).toBe(true);
  });

  it('maneja degeneración completando la base', () => {
    // Oferta y demanda que se agotan simultáneamente producen degeneración.
    const degenerado: DatosTransporte = {
      titulo: 'Degenerado',
      origenes: ['O1', 'O2'],
      destinos: ['D1', 'D2'],
      costos: [
        [2, 3],
        [4, 1],
      ],
      oferta: [50, 50],
      demanda: [50, 50],
      unidadCosto: 'L',
      unidadCantidad: 'ton',
    };
    const r = resolverTransporte(degenerado, 'noroeste').datos!;
    expect(r.solucionOptima.costoTotal).toBeCloseTo(150); // 50×2 + 50×1
  });

  it('resuelve el problema 7 con cantidades pequeñas (pollitos)', () => {
    const pollitos: DatosTransporte = {
      titulo: 'Pollitos de un día',
      origenes: ['C1', 'C2'],
      destinos: ['G1', 'G2', 'G3', 'G4'],
      costos: [
        [110, 95, 120, 100],
        [105, 100, 98, 96],
      ],
      oferta: [12, 10],
      demanda: [5, 7, 6, 4],
      unidadCosto: 'L',
      unidadCantidad: 'millares',
    };
    const r = resolverTransporte(pollitos).datos!;
    const c = compararMetodosIniciales(pollitos).datos!;
    expect(r.solucionOptima.costoTotal).toBeCloseTo(c.costoOptimo, 9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('distribución física', () => {
  // Taller de la presentación «Distribución 2025»: 6 departamentos en 2×3.
  const departamentos = [
    { id: 'd1', nombre: 'Taladro y rectificación', bloques: 1 },
    { id: 'd2', nombre: 'Equipo NC', bloques: 1 },
    { id: 'd3', nombre: 'Embarques y recepción', bloques: 1 },
    { id: 'd4', nombre: 'Tornos y taladros', bloques: 1 },
    { id: 'd5', nombre: 'Depósito de herramientas', bloques: 1 },
    { id: 'd6', nombre: 'Inspección', bloques: 1 },
  ];

  // Matriz de recorridos de la diapositiva 11.
  const recorridos = [
    [0, 20, 0, 20, 0, 80],
    [0, 0, 10, 0, 75, 0],
    [0, 0, 0, 15, 0, 90],
    [0, 0, 0, 0, 70, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ];

  const plano = (orden: readonly string[]) => ({
    id: 'p',
    nombre: 'Plano',
    filas: 2,
    columnas: 3,
    asignacion: Object.fromEntries(
      orden.map((id, i) => [id, [{ fila: Math.floor(i / 3), columna: i % 3 }]]),
    ),
  });

  const base = (orden: readonly string[]): DatosDistribucion => ({
    titulo: 'Taller',
    departamentos,
    recorridos,
    plano: plano(orden),
    tipoDistancia: 'rectilinea',
    relaciones: [],
    unidadRecorridos: 'viajes',
  });

  it('calcula el centroide de un departamento multibloque', () => {
    expect(centroide([{ fila: 0, columna: 0 }, { fila: 0, columna: 1 }])).toEqual({ x: 0.5, y: 0 });
    expect(centroide([])).toEqual({ x: 0, y: 0 });
  });

  it('calcula el puntaje carga-distancia de un plano', () => {
    const r = resolverDistribucion(base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6'])).datos!;
    // d1(0,0) d2(1,0) d3(2,0) / d4(0,1) d5(1,1) d6(2,1)
    // 1-2:20×1=20, 1-4:20×1=20, 1-6:80×3=240, 2-3:10×1=10,
    // 2-5:75×1=75, 3-4:15×3=45, 3-6:90×1=90, 4-5:70×1=70  → 570
    expect(r.puntajeCD).toBeCloseTo(570);
  });

  it('detecta solapamiento de bloques', () => {
    const r = resolverDistribucion({
      ...base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']),
      plano: {
        id: 'p',
        nombre: 'Plano',
        filas: 2,
        columnas: 3,
        asignacion: {
          d1: [{ fila: 0, columna: 0 }],
          d2: [{ fila: 0, columna: 0 }],
          d3: [{ fila: 0, columna: 2 }],
          d4: [{ fila: 1, columna: 0 }],
          d5: [{ fila: 1, columna: 1 }],
          d6: [{ fila: 1, columna: 2 }],
        },
      },
    });
    expect(r.datos).toBeNull();
    expect(r.diagnosticos.some((d) => d.codigo === 'DIST_SOLAPAMIENTO')).toBe(true);
  });

  it('alerta cuando una relación «No deseable» queda adyacente', () => {
    const r = resolverDistribucion({
      ...base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']),
      relaciones: [{ desde: 'd4', hasta: 'd5', clasificacion: 'N', claves: [5] }],
    });
    expect(r.datos?.alertas.length).toBeGreaterThan(0);
    expect(r.diagnosticos.some((d) => d.codigo === 'DIST_RELACION_PROHIBIDA')).toBe(true);
  });

  it('alerta cuando una relación «A» queda lejos', () => {
    const r = resolverDistribucion({
      ...base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']),
      relaciones: [{ desde: 'd1', hasta: 'd3', clasificacion: 'A', claves: [1] }],
    });
    expect(r.datos?.alertas.length).toBe(1);
    expect(r.diagnosticos.some((d) => d.codigo === 'DIST_RELACION_INCUMPLIDA')).toBe(true);
  });

  it('compara dos distribuciones y calcula el porcentaje de mejora', () => {
    const actual = resolverDistribucion(base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6'])).datos!;
    const mejor = buscarMejorDistribucion(base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']));
    const propuesta = resolverDistribucion({
      ...base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']),
      plano: { id: 'q', nombre: 'Propuesta', filas: 2, columnas: 3, asignacion: mejor.asignacion },
    }).datos!;

    const c = compararDistribuciones(actual, propuesta).datos!;
    expect(c.propuesta.puntajeCD).toBeLessThanOrEqual(c.actual.puntajeCD);
    expect(c.mejora).toBe(true);
    expect(c.mejoraPorcentaje).toBeCloseTo(((actual.puntajeCD - propuesta.puntajeCD) / actual.puntajeCD) * 100, 9);
  });

  it('la búsqueda exhaustiva encuentra el mínimo global para 6 departamentos', () => {
    const datos = base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
    const mejor = buscarMejorDistribucion(datos);
    expect(mejor.exhaustiva).toBe(true);
    expect(mejor.permutacionesEvaluadas).toBe(720);

    // Ninguna permutación puede ser mejor que la encontrada.
    const ids = departamentos.map((d) => d.id);
    const posiciones = [0, 1, 2, 3, 4, 5].map((i) => ({ fila: Math.floor(i / 3), columna: i % 3 }));
    let minimo = Infinity;
    const permutar = (restantes: string[], actual: string[]): void => {
      if (restantes.length === 0) {
        const r = resolverDistribucion({
          ...datos,
          plano: {
            id: 'x',
            nombre: 'x',
            filas: 2,
            columnas: 3,
            asignacion: Object.fromEntries(actual.map((id, i) => [id, [posiciones[i]!]])),
          },
        }).datos!;
        minimo = Math.min(minimo, r.puntajeCD);
        return;
      }
      for (let i = 0; i < restantes.length; i++) {
        permutar([...restantes.slice(0, i), ...restantes.slice(i + 1)], [...actual, restantes[i]!]);
      }
    };
    permutar(ids, []);
    expect(mejor.puntajeCD).toBeCloseTo(minimo, 9);
  });

  it('respeta departamentos fijos en la búsqueda', () => {
    const datos = base(['d1', 'd2', 'd3', 'd4', 'd5', 'd6']);
    const mejor = buscarMejorDistribucion(datos, {
      d1: [{ fila: 1, columna: 0 }],
      d4: [{ fila: 0, columna: 2 }],
    });
    expect(mejor.asignacion['d1']).toEqual([{ fila: 1, columna: 0 }]);
    expect(mejor.asignacion['d4']).toEqual([{ fila: 0, columna: 2 }]);
  });
});
