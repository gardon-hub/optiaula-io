/**
 * Pruebas del motor de retroalimentación determinista y del generador.
 */

import { describe, expect, it } from 'vitest';

import { ejercicioPorId } from '@/datos/ejercicios';
import {
  evaluarRespuesta,
  localizarPrimerError,
  resumirIntento,
  type Evaluacion,
} from '@/nucleo/retroalimentacion';
import { generarEjercicio, generarSerie, TEMAS_GENERABLES } from '@/nucleo/generador';
import { consultarAsistente } from '@/nucleo/asistenteOpcional';
import { esquemaEjercicio, validar } from '@/esquemas';
import { resolverAsignacion } from '@/nucleo/asignacion';
import { resolverCPM } from '@/nucleo/cpm';
import { resolverTransporte } from '@/nucleo/transporte';
import { resolverPERT } from '@/nucleo/pert';
import { varianzaActividad } from '@/nucleo/pert';

const preguntaDe = (ejercicioId: string, preguntaId: string) => {
  const e = ejercicioPorId(ejercicioId)!;
  return { ejercicio: e, pregunta: e.preguntas.find((p) => p.id === preguntaId)! };
};

describe('evaluación de respuestas', () => {
  it('acepta la respuesta correcta dentro de la tolerancia', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    const r = evaluarRespuesta(ejercicio, pregunta, 37);
    expect(r.correcta).toBe(true);
    expect(r.puntosObtenidos).toBe(pregunta.puntos);
  });

  it('penaliza el puntaje según las pistas consultadas', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    const r = evaluarRespuesta(ejercicio, pregunta, 37, { pistasUsadas: 2 });
    expect(r.correcta).toBe(true);
    expect(r.puntosObtenidos).toBeCloseTo(pregunta.puntos * 0.7, 9);
  });

  it('marca sin responder cuando el valor es nulo', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    expect(evaluarRespuesta(ejercicio, pregunta, null).veredicto).toBe('sin_responder');
  });

  it('deja las preguntas de interpretación para el docente', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p4');
    const r = evaluarRespuesta(ejercicio, pregunta, 'Aceleraría la actividad F.');
    expect(r.veredicto).toBe('no_calificable');
    expect(r.mensaje).toContain('docente');
  });

  it('rechaza texto que no es número en una pregunta numérica', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    const r = evaluarRespuesta(ejercicio, pregunta, 'treinta y siete');
    expect(r.codigoError).toBe('FORMATO_NUMERO');
  });

  it('acepta coma decimal', () => {
    const { ejercicio, pregunta } = preguntaDe('pert-01', 'p1');
    const r = evaluarRespuesta(ejercicio, pregunta, '16,3333');
    expect(r.correcta).toBe(true);
  });
});

describe('detección de errores típicos', () => {
  it('PERT: detecta la suma de desviaciones estándar en lugar de varianzas', () => {
    const { ejercicio, pregunta } = preguntaDe('pert-01', 'p3');
    if (ejercicio.datos.tipo !== 'pert' || ejercicio.datos.modo !== 'red') throw new Error('datos inesperados');

    const r = resolverPERT({ ...ejercicio.datos, titulo: ejercicio.titulo }).datos!;
    const sumaDesviaciones = r.rutaEvaluada.reduce((s, id) => {
      const a = ejercicio.datos.tipo === 'pert' ? ejercicio.datos.actividades.find((x) => x.id === id) : undefined;
      return s + (a ? Math.sqrt(varianzaActividad(a.a, a.b)) : 0);
    }, 0);

    const ev = evaluarRespuesta(ejercicio, pregunta, sumaDesviaciones);
    expect(ev.codigoError).toBe('PERT_SUMA_DESVIACIONES');
    expect(ev.mensaje).toContain('varianzas');
  });

  it('PERT: detecta la suma de las varianzas de todas las actividades', () => {
    const { ejercicio, pregunta } = preguntaDe('pert-01', 'p3');
    if (ejercicio.datos.tipo !== 'pert') throw new Error('datos inesperados');
    const todas = ejercicio.datos.actividades.reduce((s, a) => s + varianzaActividad(a.a, a.b), 0);
    expect(evaluarRespuesta(ejercicio, pregunta, todas).codigoError).toBe('PERT_TODAS_LAS_VARIANZAS');
  });

  it('CPM: detecta la suma de todas las duraciones', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    if (ejercicio.datos.tipo !== 'cpm') throw new Error('datos inesperados');
    const suma = ejercicio.datos.actividades.reduce((s, a) => s + a.duracion, 0);
    const r = evaluarRespuesta(ejercicio, pregunta, suma);
    expect(r.codigoError).toBe('CPM_SUMA_TODAS');
    expect(r.mensaje).toContain('paralelo');
  });

  it('CPM: detecta el uso del mínimo en una convergencia', () => {
    const { ejercicio, pregunta } = preguntaDe('cpm-01', 'p1');
    // La rama corta A→C→G tarda 12; con mínimo en H el proyecto duraría 22.
    const r = evaluarRespuesta(ejercicio, pregunta, 22);
    expect(r.codigoError).toBe('CPM_MINIMO_EN_CONVERGENCIA');
    expect(r.mensaje).toContain('mayor');
  });

  it('CPM: distingue la holgura libre de la total', () => {
    const e = ejercicioPorId('cpm-02')!;
    const pregunta = e.preguntas.find((p) => p.id === 'p3');
    if (!pregunta || e.datos.tipo !== 'cpm') return;
    const r = resolverCPM({ ...e.datos, titulo: e.titulo }).datos!;
    const distinta = r.calculadas.find((c) => Math.abs(c.holguraLibre - c.holguraTotal) > 1e-9 && !c.critica);
    if (!distinta) return;
    const ev = evaluarRespuesta(e, { ...pregunta, respuesta: distinta.holguraTotal }, distinta.holguraLibre);
    expect(ev.codigoError).toBe('CPM_HOLGURA_LIBRE');
  });

  it('transporte: exige balancear antes de resolver', () => {
    const e = ejercicioPorId('trans-01')!;
    if (e.datos.tipo !== 'transporte') throw new Error('datos inesperados');
    const desbalanceado = { ...e, datos: { ...e.datos, oferta: [150, 120, 80] } };
    const pregunta = e.preguntas.find((p) => p.id === 'p0')!;
    const r = evaluarRespuesta(desbalanceado, { ...pregunta, respuesta: 70 }, 0);
    expect(r.codigoError).toBe('TRANSPORTE_NO_BALANCEADO');
    expect(r.mensaje).toContain('balancear');
  });

  it('transporte: distingue la solución inicial del óptimo', () => {
    const { ejercicio, pregunta } = preguntaDe('trans-01', 'p2');
    if (ejercicio.datos.tipo !== 'transporte') throw new Error('datos inesperados');
    const inicial = resolverTransporte({ ...ejercicio.datos, titulo: ejercicio.titulo }, 'noroeste').datos!
      .solucionInicial.costoTotal;
    const r = evaluarRespuesta(ejercicio, pregunta, inicial);
    expect(r.codigoError).toBe('TRANSPORTE_INICIAL_NO_OPTIMA');
    expect(r.mensaje).toContain('MODI');
  });

  it('asignación: detecta la selección del mínimo por fila', () => {
    const { ejercicio, pregunta } = preguntaDe('asig-01', 'p1');
    if (ejercicio.datos.tipo !== 'asignacion') throw new Error('datos inesperados');
    const porFila = ejercicio.datos.matriz.reduce(
      (s, f) => s + Math.min(...f.filter((v): v is number => v !== null)),
      0,
    );
    const r = evaluarRespuesta(ejercicio, pregunta, porFila);
    expect(r.codigoError).toBe('ASIGNACION_COLUMNA_REPETIDA');
    expect(r.mensaje).toContain('misma columna');
  });

  it('asignación: detecta resolver una maximización como minimización', () => {
    const { ejercicio, pregunta } = preguntaDe('asig-04', 'p1');
    if (ejercicio.datos.tipo !== 'asignacion') throw new Error('datos inesperados');
    const comoMin = resolverAsignacion({ ...ejercicio.datos, titulo: ejercicio.titulo, objetivo: 'minimizar' }).datos!;
    const r = evaluarRespuesta(ejercicio, pregunta, comoMin.valorTotal);
    expect(r.codigoError).toBe('ASIGNACION_SIN_CONVERTIR');
  });

  it('productividad: detecta la razón invertida', () => {
    const { ejercicio, pregunta } = preguntaDe('prod-01', 'p4');
    const correcta = pregunta.respuesta as number;
    const r = evaluarRespuesta(ejercicio, pregunta, 1 / correcta);
    expect(r.codigoError).toBe('PRODUCTIVIDAD_INVERTIDA');
    expect(r.mensaje).toContain('salidas entre entradas');
  });

  it('equilibrio: detecta olvidar la comisión', () => {
    // equi-09 son los carritos de helados: 10 % de comisión sobre el ingreso.
    const { ejercicio, pregunta } = preguntaDe('equi-09', 'p2');
    if (ejercicio.datos.tipo !== 'equilibrio') throw new Error('datos inesperados');
    const sinComision = ejercicio.datos.costosFijos / (ejercicio.datos.precioVenta - ejercicio.datos.costoVariableUnitario);
    const r = evaluarRespuesta(ejercicio, pregunta, sinComision);
    expect(r.codigoError).toBe('EQUILIBRIO_SIN_COMISION');
  });

  it('equilibrio: detecta dividir entre el precio en lugar del margen', () => {
    const { ejercicio, pregunta } = preguntaDe('equi-01', 'p2');
    if (ejercicio.datos.tipo !== 'equilibrio') throw new Error('datos inesperados');
    const malo = ejercicio.datos.costosFijos / ejercicio.datos.precioVenta;
    const r = evaluarRespuesta(ejercicio, pregunta, malo);
    expect(r.codigoError).toBe('EQUILIBRIO_DIVIDE_PRECIO');
  });

  it('localización: detecta usar la métrica de distancia equivocada', () => {
    const { ejercicio, pregunta } = preguntaDe('loc-02', 'p1');
    if (ejercicio.datos.tipo !== 'localizacion') throw new Error('datos inesperados');
    const sitio = ejercicio.datos.sitios[0]!;
    const euclidiana = ejercicio.datos.puntos.reduce(
      (s, p) => s + p.carga * Math.hypot(p.punto.x - sitio.punto!.x, p.punto.y - sitio.punto!.y),
      0,
    );
    const r = evaluarRespuesta(ejercicio, pregunta, euclidiana);
    expect(r.codigoError).toBe('LOCALIZACION_DISTANCIA_EQUIVOCADA');
  });

  it('localización: detecta el promedio simple en el centro de gravedad', () => {
    const { ejercicio, pregunta } = preguntaDe('loc-02', 'p3');
    if (ejercicio.datos.tipo !== 'localizacion') throw new Error('datos inesperados');
    const promedio =
      ejercicio.datos.puntos.reduce((s, p) => s + p.punto.x, 0) / ejercicio.datos.puntos.length;
    const r = evaluarRespuesta(ejercicio, pregunta, promedio);
    expect(r.codigoError).toBe('CENTRO_GRAVEDAD_SIN_PONDERAR');
  });

  it('detecta errores de escala por factor 100', () => {
    const { ejercicio, pregunta } = preguntaDe('prod-01', 'p1');
    const correcta = pregunta.respuesta as number;
    const r = evaluarRespuesta(ejercicio, pregunta, correcta * 100);
    expect(r.codigoError).toBe('ESCALA_PORCENTAJE');
  });

  it('reconoce un redondeo intermedio cuando la desviación es pequeña', () => {
    const { ejercicio, pregunta } = preguntaDe('prod-01', 'p4');
    const correcta = pregunta.respuesta as number;
    const r = evaluarRespuesta(ejercicio, pregunta, correcta * 1.03);
    expect(r.veredicto).toBe('cerca');
    expect(r.codigoError).toBe('REDONDEO_INTERMEDIO');
  });
});

describe('localización del primer paso incorrecto', () => {
  it('encuentra el paso donde empieza la divergencia', () => {
    const r = localizarPrimerError([10, 20, 35, 40], [10, 20, 30, 40]);
    expect(r.primerPasoIncorrecto).toBe(3);
    expect(r.mensaje).toContain('paso 2');
    expect(r.mensaje).toContain('paso 3');
  });

  it('avisa cuando el error está en el primer paso', () => {
    const r = localizarPrimerError([99], [10, 20]);
    expect(r.primerPasoIncorrecto).toBe(1);
    expect(r.mensaje).toContain('primer paso');
  });

  it('confirma cuando todo coincide', () => {
    const r = localizarPrimerError([10, 20, 30], [10, 20, 30]);
    expect(r.primerPasoIncorrecto).toBeNull();
  });

  it('ignora los pasos que el estudiante no declaró', () => {
    const r = localizarPrimerError([10, null, 30], [10, 20, 30]);
    expect(r.primerPasoIncorrecto).toBeNull();
  });
});

describe('resumen de intento', () => {
  it('suma puntos y separa las respuestas pendientes de revisión', () => {
    const e = ejercicioPorId('cpm-01')!;
    const evaluaciones: Evaluacion[] = e.preguntas.map((p) =>
      evaluarRespuesta(e, p, p.tipo === 'interpretacion' ? 'Una explicación.' : (p.respuesta as number)),
    );
    const r = resumirIntento(evaluaciones, e.preguntas);
    expect(r.porcentaje).toBeCloseTo(100, 6);
    expect(r.pendientesDeRevision).toBe(1);
    expect(r.mensaje).toContain('Dominio sólido');
  });

  it('reporta bajo desempeño cuando todo falla', () => {
    const e = ejercicioPorId('cpm-01')!;
    const evaluaciones = e.preguntas.map((p) => evaluarRespuesta(e, p, p.tipo === 'numerica' ? 999999 : null));
    const r = resumirIntento(evaluaciones, e.preguntas);
    expect(r.porcentaje).toBe(0);
    expect(r.mensaje).toContain('Comprender');
  });
});

describe('generador de ejercicios', () => {
  it('produce ejercicios válidos para todos los temas generables', () => {
    for (const tema of TEMAS_GENERABLES) {
      const r = generarEjercicio({ tema, semilla: 4242 });
      expect(r.ejercicio, `${tema}: ${r.verificaciones.filter((v) => !v.paso).map((v) => v.nombre).join(', ')}`).not.toBeNull();
      expect(r.verificaciones.every((v) => v.paso)).toBe(true);
      const val = validar(esquemaEjercicio, r.ejercicio);
      expect(val.ok, `${tema}: ${val.errores.join(' | ')}`).toBe(true);
    }
  });

  it('es reproducible: la misma semilla da el mismo ejercicio', () => {
    const a = generarEjercicio({ tema: 'transporte', semilla: 777 });
    const b = generarEjercicio({ tema: 'transporte', semilla: 777 });
    expect(JSON.stringify(a.ejercicio?.datos)).toBe(JSON.stringify(b.ejercicio?.datos));
  });

  it('semillas distintas producen ejercicios distintos', () => {
    const a = generarEjercicio({ tema: 'asignacion', semilla: 1 });
    const b = generarEjercicio({ tema: 'asignacion', semilla: 2 });
    expect(JSON.stringify(a.ejercicio?.datos)).not.toBe(JSON.stringify(b.ejercicio?.datos));
  });

  it('genera problemas de transporte desbalanceados cuando se pide', () => {
    const r = generarEjercicio({ tema: 'transporte', semilla: 55, balanceado: false });
    expect(r.ejercicio).not.toBeNull();
    if (r.ejercicio?.datos.tipo === 'transporte') {
      const oferta = r.ejercicio.datos.oferta.reduce((a, b) => a + b, 0);
      const demanda = r.ejercicio.datos.demanda.reduce((a, b) => a + b, 0);
      expect(oferta).not.toBe(demanda);
    }
  });

  it('genera redes con rutas críticas múltiples cuando se pide', () => {
    const r = generarEjercicio({ tema: 'cpm', semilla: 99, rutasCriticasMultiples: true, tamanoFilas: 8 });
    expect(r.ejercicio).not.toBeNull();
    if (r.ejercicio?.datos.tipo === 'cpm') {
      const sol = resolverCPM({ ...r.ejercicio.datos, titulo: r.ejercicio.titulo }).datos!;
      expect(sol.rutasCriticas.length).toBeGreaterThan(1);
    }
  });

  it('genera matrices de asignación con prohibiciones resolubles', () => {
    const r = generarEjercicio({ tema: 'asignacion', semilla: 31, incluirProhibiciones: true, tamanoFilas: 5, tamanoColumnas: 5 });
    expect(r.ejercicio).not.toBeNull();
    if (r.ejercicio?.datos.tipo === 'asignacion') {
      expect(r.ejercicio.datos.matriz.flat().some((v) => v === null)).toBe(true);
      expect(resolverAsignacion({ ...r.ejercicio.datos, titulo: r.ejercicio.titulo }).datos).not.toBeNull();
    }
  });

  it('genera matrices rectangulares', () => {
    const r = generarEjercicio({ tema: 'asignacion', semilla: 12, tamanoFilas: 3, tamanoColumnas: 5 });
    expect(r.ejercicio).not.toBeNull();
    if (r.ejercicio?.datos.tipo === 'asignacion') {
      expect(r.ejercicio.datos.filas.length).toBe(3);
      expect(r.ejercicio.datos.columnas.length).toBe(5);
    }
  });

  it('rechaza los temas que no sabe generar', () => {
    const r = generarEjercicio({ tema: 'fundamentos' });
    expect(r.ejercicio).toBeNull();
    expect(r.verificaciones[0]?.paso).toBe(false);
  });

  it('genera una serie de ejercicios distintos entre sí', () => {
    const serie = generarSerie({ tema: 'equilibrio', semilla: 500 }, 5);
    expect(serie.every((r) => r.ejercicio !== null)).toBe(true);
    const firmas = serie.map((r) => JSON.stringify(r.ejercicio?.datos));
    expect(new Set(firmas).size).toBe(5);
  });
});

describe('asistente de IA opcional', () => {
  it('está desactivado por defecto y no bloquea nada', async () => {
    const e = ejercicioPorId('cpm-01')!;
    const r = await consultarAsistente(
      {
        ejercicio: e,
        pregunta: e.preguntas[0]!,
        respuestaEstudiante: '37',
        evaluacionDeterminista: evaluarRespuesta(e, e.preguntas[0]!, 37),
      },
      { habilitado: false, proveedor: '', modelo: '', urlBase: '' },
    );
    expect(r.disponible).toBe(false);
    expect(r.generadoAutomaticamente).toBe(false);
    expect(r.texto).toContain('determinista');
  });

  it('informa cuando se habilita sin proveedor registrado', async () => {
    const e = ejercicioPorId('cpm-01')!;
    const r = await consultarAsistente(
      {
        ejercicio: e,
        pregunta: e.preguntas[0]!,
        respuestaEstudiante: '37',
        evaluacionDeterminista: evaluarRespuesta(e, e.preguntas[0]!, 37),
      },
      { habilitado: true, proveedor: 'inexistente', modelo: '', urlBase: '' },
    );
    expect(r.disponible).toBe(false);
    expect(r.texto).toContain('proveedor');
  });
});

// ───────────────────────────── Preguntas de los ejercicios generados ─────────────────────────────

describe('el generador produce ejercicios que sirven para practicar', () => {
  const SEMILLAS = [4242, 77, 90210];

  for (const tema of TEMAS_GENERABLES) {
    it(`arma el juego de preguntas de ${tema}`, () => {
      for (const semilla of SEMILLAS) {
        const g = generarEjercicio({ tema, semilla });
        const fallos = g.verificaciones.filter((v) => !v.paso).map((v) => `${v.nombre}: ${v.detalle}`);
        expect(g.ejercicio, `${tema}/${semilla} — ${fallos.join(' | ')}`).not.toBeNull();

        const e = g.ejercicio!;
        expect(e.preguntas.length, `${tema}/${semilla}`).toBeGreaterThan(0);

        // Toda pregunta numérica trae una respuesta calculada, y toda pregunta
        // que no sea de interpretación enlaza con una regla del motor.
        for (const p of e.preguntas) {
          if (p.tipo === 'numerica') {
            expect(typeof p.respuesta, `${tema}/${semilla}/${p.id}`).toBe('number');
            expect(Number.isFinite(p.respuesta as number), `${tema}/${semilla}/${p.id}`).toBe(true);
          }
          if (p.tipo !== 'interpretacion') {
            expect(p.claveVerificacion, `${tema}/${semilla}/${p.id}`).not.toBeNull();
            expect(p.pistas.length, `${tema}/${semilla}/${p.id}`).toBeGreaterThan(0);
          }
        }
      }
    });

    it(`califica bien las respuestas de ${tema}`, () => {
      const e = generarEjercicio({ tema, semilla: 4242 }).ejercicio!;

      for (const p of e.preguntas.filter((x) => x.tipo === 'numerica')) {
        const correcta = p.respuesta as number;
        expect(evaluarRespuesta(e, p, correcta).correcta, `${tema}/${p.id} correcta`).toBe(true);
        // Un valor claramente distinto tiene que rechazarse, no colarse por la
        // tolerancia relativa.
        expect(evaluarRespuesta(e, p, correcta * 3 + 7).correcta, `${tema}/${p.id} incorrecta`).toBe(false);
      }
    });
  }

  it('un ejercicio generado dispara las mismas reglas de error típico que uno de la biblioteca', () => {
    // El motor de retroalimentación se guía por la clave de verificación y los
    // datos del ejercicio, así que funciona igual venga de donde venga.
    const simplex = generarEjercicio({ tema: 'simplex', semilla: 4242 }).ejercicio!;
    const columnas = simplex.preguntas.find((p) => p.claveVerificacion === 'simplex.columnas')!;
    const soloDecision = (simplex.datos as Extract<(typeof simplex)['datos'], { tipo: 'simplex' }>).variables.length;
    expect(evaluarRespuesta(simplex, columnas, soloDecision).codigoError).toBe('SIMPLEX_SOLO_DECISION');

    const transporte = generarEjercicio({ tema: 'transporte', semilla: 4242 }).ejercicio!;
    const optimo = transporte.preguntas.find((p) => p.claveVerificacion === 'transporte.costoOptimo')!;
    const inicial = transporte.preguntas.find((p) => p.claveVerificacion === 'transporte.costoInicial.noroeste')!;
    const r = evaluarRespuesta(transporte, optimo, inicial.respuesta as number);
    expect(r.correcta).toBe(false);
    expect(r.codigoError).not.toBeNull();

    // Y la regla más específica del catálogo: sumar desviaciones en vez de
    // varianzas en PERT, con la misma explicación que en la biblioteca.
    const pert = generarEjercicio({ tema: 'pert', semilla: 4242 }).ejercicio!;
    const dp = pert.datos as Extract<(typeof pert)['datos'], { tipo: 'pert' }>;
    const resuelto = resolverPERT({ titulo: pert.titulo, actividades: dp.actividades, unidadTiempo: dp.unidadTiempo }).datos!;
    const sumaDesviaciones = resuelto.rutaEvaluada.reduce((total, id) => {
      const act = dp.actividades.find((x) => x.id === id)!;
      return total + Math.sqrt(varianzaActividad(act.a, act.b));
    }, 0);

    const varianza = pert.preguntas.find((p) => p.claveVerificacion === 'pert.varianzaProyecto')!;
    const ev = evaluarRespuesta(pert, varianza, sumaDesviaciones);
    expect(ev.codigoError).toBe('PERT_SUMA_DESVIACIONES');
    expect(ev.mensaje).toContain('deben sumarse las **varianzas**');
  });

  it('la misma semilla produce las mismas preguntas', () => {
    for (const tema of TEMAS_GENERABLES) {
      const a = generarEjercicio({ tema, semilla: 31415 }).ejercicio!;
      const b = generarEjercicio({ tema, semilla: 31415 }).ejercicio!;
      expect(JSON.stringify(a.preguntas), tema).toBe(JSON.stringify(b.preguntas));
    }
  });

  it('el PERT generado consulta un plazo real, no uno vacío', () => {
    const e = generarEjercicio({ tema: 'pert', semilla: 4242 }).ejercicio!;
    const d = e.datos as Extract<(typeof e)['datos'], { tipo: 'pert' }>;

    expect(d.plazoConsulta).not.toBeNull();
    // El enunciado tiene que nombrar el mismo plazo por el que se pregunta.
    expect(e.enunciado).toContain(String(d.plazoConsulta));
    const probabilidad = e.preguntas.find((p) => p.claveVerificacion === 'pert.probabilidad')!;
    expect(probabilidad).toBeDefined();
    // Una desviación por encima de la media: la probabilidad es interesante,
    // ni 0 % ni 100 %.
    expect(probabilidad.respuesta as number).toBeGreaterThan(60);
    expect(probabilidad.respuesta as number).toBeLessThan(99);
  });
});
