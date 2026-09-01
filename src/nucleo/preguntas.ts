/**
 * Constructores de las preguntas de cada tema.
 *
 * Viven en `nucleo/` y no en `datos/` por una razón de capas: el generador
 * también los necesita, y `nucleo/` no puede importar de `datos/`. Antes cada
 * archivo de la biblioteca tenía el suyo privado, y por eso los ejercicios
 * generados salían sin preguntas: servían para el laboratorio pero no para el
 * flujo de práctica con retroalimentación, que es el ciclo central de la
 * aplicación.
 *
 * Cada constructor recibe los mismos datos que el solucionador y calcula las
 * respuestas resolviendo: no hay ningún número escrito a mano. Las claves de
 * verificación son las que enlazan cada pregunta con las reglas de error
 * típico de `retroalimentacion.ts`.
 */

import type { DatosEjercicio, Pregunta } from '@/esquemas';
import { formatearNumero, singular } from './numero';
import { aNumero, comparar, esCero, valorAbsoluto } from './racional';
import type { DatosProductividad } from './productividad';
import {
  resolverEquilibrio,
  resolverEquilibrioMultiproducto,
  type DatosEquilibrio,
  type DatosEquilibrioMultiproducto,
} from './equilibrio';
import { resolverCPM, type DatosCPM } from './cpm';
import { resolverCrashing, type DatosCrashing } from './crashing';
import { resolverInventarios, type DatosInventarios } from './inventarios';
import { compararServidores, resolverColas, type DatosColas } from './colas';
import { probabilidadPlazo, resolverPERT, type DatosPERT } from './pert';
import { analizarSensibilidad, resolverGrafico, type DatosGrafico } from './grafico';
import { resolverSimplex, resumenColumnas, type DatosSimplex } from './simplex';
import { analizarSensibilidadSimplex } from './sensibilidadSimplex';
import { resolverAsignacion, type DatosAsignacion } from './asignacion';
import { resolverTransporte, type DatosTransporte } from './transporte';

export function preguntasProductividad(s: DatosProductividad): Pregunta[] {
  const costoSumado = s.insumos.reduce((t, i) => t + i.cantidad * i.costoUnitario, 0);
  // Cuando el enunciado declara un costo total distinto de la suma de los
  // insumos, el motor usa el declarado (`resolverProductividad`). La clave del
  // cuestionario tiene que usar el mismo valor, o el laboratorio y la respuesta
  // esperada dirían cosas distintas sobre el mismo ejercicio.
  const costoTotal = s.costoTotalDeclarado ?? costoSumado;
  const valor = s.produccionTerminada * s.precioVenta;
  const manoObra = s.insumos.find((i) => i.categoria === 'mano_obra');

  return [
    {
      id: 'p1',
      enunciado: `¿Cuál es el costo total de los insumos, en lempiras?`,
      tipo: 'numerica',
      respuesta: costoTotal,
      unidad: 'L',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Cada insumo cuesta su cantidad multiplicada por su costo unitario.',
        'Los insumos declarados como un monto en lempiras ya vienen valorados: no hay que multiplicarlos por nada.',
        s.costoTotalDeclarado === null
          ? `Sume: ${s.insumos.map((i) => `${i.nombre} = ${i.cantidad} × ${i.costoUnitario}`).join('; ')}.`
          : `El enunciado declara ${s.costoTotalDeclarado} y la suma de los insumos da ${costoSumado}. ` +
            'Este ejercicio toma el monto declarado; la diferencia está registrada en la auditoría de datos.',
      ],
      claveVerificacion: 'productividad.costoTotal',
      puntos: 1,
    },
    {
      id: 'p2',
      enunciado: `¿Cuál es el valor de la producción terminada, en lempiras?`,
      tipo: 'numerica',
      respuesta: valor,
      unidad: 'L',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El valor de la producción es lo producido multiplicado por su precio de venta.',
        `Con el tratamiento «excluir», la producción que cuenta es la terminada: ${s.produccionTerminada} ${s.unidadProduccion}.`,
      ],
      claveVerificacion: 'productividad.valorProduccion',
      puntos: 1,
    },
    ...(manoObra
      ? [
          {
            id: 'p3',
            enunciado: `¿Cuál es la productividad parcial física de la mano de obra, en ${s.unidadProduccion} por hora?`,
            tipo: 'numerica' as const,
            respuesta: s.produccionTerminada / manoObra.cantidad,
            unidad: `${s.unidadProduccion}/hora`,
            tolerancia: 0.01,
            toleranciaRelativa: true,
            opciones: [],
            pistas: [
              'La productividad parcial física divide la producción entre la cantidad física del insumo.',
              'Ojo con la unidad: aquí se divide entre horas, no entre lempiras.',
              `Divida ${s.produccionTerminada} ${s.unidadProduccion} entre ${manoObra.cantidad} horas.`,
            ],
            claveVerificacion: 'productividad.parcialFisica.mo',
            puntos: 1,
          },
        ]
      : []),
    {
      id: 'p4',
      enunciado: '¿Cuál es la productividad total del sistema?',
      tipo: 'numerica',
      respuesta: valor / costoTotal,
      unidad: 'L / L',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La productividad total compara el valor de todo lo producido contra el costo de todo lo consumido.',
        'Es una razón adimensional: lempiras producidos por lempira invertido.',
        'Divida el valor de la producción entre el costo total de los insumos.',
      ],
      claveVerificacion: 'productividad.total',
      puntos: 2,
    },
    {
      id: 'p5',
      enunciado:
        'Explique qué decisión gerencial tomaría a partir del insumo que resultó limitante y por qué. ' +
        'Mencione su participación en el costo total.',
      tipo: 'interpretacion',
      respuesta: null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'El insumo limitante es el que devuelve menos valor por cada lempira invertido.',
        'Una decisión útil actúa sobre el precio del insumo, sobre la cantidad consumida o sobre su sustitución.',
      ],
      claveVerificacion: null,
      puntos: 2,
    },
  ];
}

export function preguntasCPM(s: DatosCPM, preguntaExtra: string | null = null): Pregunta[] {
  const r = resolverCPM({ titulo: s.titulo, actividades: s.actividades, unidadTiempo: s.unidadTiempo });
  const d = r.datos;
  const u = s.unidadTiempo;
  const conHolgura = d?.calculadas.filter((c) => !c.critica) ?? [];
  const ejemplo = conHolgura[0];

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: `¿Cuál es la duración total del proyecto, en ${u}?`,
      tipo: 'numerica',
      respuesta: d?.duracionProyecto ?? null,
      unidad: u,
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Haga el recorrido hacia adelante: cada actividad empieza cuando termina la última de sus predecesoras.',
        'La duración del proyecto es la mayor terminación temprana de toda la red.',
        'Recorra la cadena más larga desde el inicio hasta el final sumando duraciones.',
      ],
      claveVerificacion: 'cpm.duracionProyecto',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: 'Escriba la ruta crítica, separando las actividades con guiones (por ejemplo A-B-D).',
      tipo: 'texto',
      respuesta: d?.rutasCriticas.map((x) => x.actividades.join('-')).join(' ; ') ?? null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'La ruta crítica está formada por las actividades con holgura total cero.',
        'La holgura total es el inicio tardío menos el inicio temprano.',
        'Verifique: la suma de las duraciones de la ruta crítica debe dar la duración del proyecto.',
      ],
      claveVerificacion: 'cpm.rutaCritica',
      puntos: 2,
    },
  ];

  if (ejemplo) {
    base.push({
      id: 'p3',
      enunciado: `¿Cuál es la holgura total de la actividad ${ejemplo.actividad.id}, en ${u}?`,
      tipo: 'numerica',
      respuesta: ejemplo.holguraTotal,
      unidad: u,
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Necesita el recorrido hacia atrás: empiece por el final con la duración total del proyecto.',
        `La holgura total de ${ejemplo.actividad.id} es IL − IT, o equivalentemente TL − TT.`,
      ],
      claveVerificacion: 'cpm.holgura',
      puntos: 2,
    });
  }

  base.push({
    id: 'p4',
    enunciado:
      preguntaExtra ??
      'Si tuviera que acortar el proyecto una semana y pudiera acelerar cualquier actividad, ¿cuál elegiría y por qué? ' +
        'Explique qué pasaría con las demás rutas.',
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas: [
      'Acelerar una actividad con holgura no adelanta el proyecto ni un día.',
      'Al acortar la ruta crítica, otra ruta puede volverse crítica: revise las holguras después del cambio.',
    ],
    claveVerificacion: null,
    puntos: 2,
  });

  return base;
}

export function preguntasCrashing(s: DatosCrashing): Pregunta[] {
  const r = resolverCrashing(s);
  const d = r.datos;
  const moneda = s.moneda === 'USD' ? 'US$' : 'L';
  const u = s.unidadTiempo;

  if (d === null) {
    return [
      {
        id: 'p1',
        enunciado: 'Este proyecto no se puede comprimir con los datos dados. Explique qué falta y por qué.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Sin duración acelerada no hay nada que acortar.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ];
  }

  // La actividad más barata de acortar, que es la primera decisión del método.
  const masBarata = [...d.pendientes]
    .filter((p) => p.pendiente !== null)
    .sort((a, b) => a.pendiente! - b.pendiente!)[0];

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: `¿Cuál es la duración normal del proyecto, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.duracionNormal,
      unidad: u,
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Es la ruta crítica con las duraciones normales, antes de acelerar nada.',
        'Recorra la cadena más larga desde el inicio hasta el final sumando duraciones.',
      ],
      claveVerificacion: 'cpm.duracionProyecto',
      puntos: 2,
    },
  ];

  if (masBarata !== undefined) {
    base.push({
      id: 'p2',
      enunciado: `¿Cuál es la pendiente de costo de la actividad ${masBarata.id}, en ${moneda} por ${singular(u)}?`,
      tipo: 'numerica',
      respuesta: masBarata.pendiente,
      unidad: `${moneda} / ${singular(u)}`,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La pendiente dice cuánto cuesta ganar un periodo en esa actividad.',
        'Es la diferencia de costo dividida entre los periodos que se pueden ganar, no entre la duración normal.',
        `Para ${masBarata.id}: (${formatearNumero(masBarata.costoAcelerado)} − ${formatearNumero(masBarata.costoNormal)}) ÷ ` +
          `(${formatearNumero(masBarata.duracionNormal)} − ${formatearNumero(masBarata.duracionAcelerada)}).`,
      ],
      claveVerificacion: 'crashing.pendiente',
      puntos: 3,
    });
  }

  base.push(
    {
      id: 'p3',
      enunciado: `¿Cuál es la duración de costo total mínimo, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.duracionOptima,
      unidad: u,
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Conviene acortar un periodo mientras cueste menos que el costo indirecto que se ahorra.',
        `Aquí el costo indirecto es ${moneda} ${formatearNumero(s.costoIndirectoPorPeriodo)} por ${singular(u)}: compare cada pendiente contra esa cifra.`,
        'No es ni la duración normal ni la mínima alcanzable: es donde el costo total toca fondo.',
      ],
      claveVerificacion: 'crashing.duracionOptima',
      puntos: 3,
    },
    {
      id: 'p4',
      enunciado: `¿Cuál es el costo total del proyecto en esa duración, en ${moneda}?`,
      tipo: 'numerica',
      respuesta: d.costoTotalOptimo,
      unidad: moneda,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El costo total es el directo más el indirecto.',
        'El directo parte del costo normal de todas las actividades y sube con cada periodo que se acorta.',
        `El indirecto es ${moneda} ${formatearNumero(s.costoIndirectoPorPeriodo)} multiplicado por la duración final.`,
      ],
      claveVerificacion: 'crashing.costoTotalOptimo',
      puntos: 3,
    },
    {
      id: 'p5',
      enunciado:
        'El procedimiento vuelve a resolver la red después de acortar cada periodo, en lugar de decidirlo todo sobre ' +
        'la ruta crítica inicial. Explique qué se rompe si no se recalcula, con lo que ocurre en este proyecto.',
      tipo: 'interpretacion',
      respuesta: null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Al acortar la ruta crítica, las holguras de las demás rutas se consumen.',
        'Si otra ruta se vuelve crítica, acortar solo la primera ya no adelanta el proyecto: se paga por nada.',
      ],
      claveVerificacion: null,
      puntos: 3,
    },
  );

  return base;
}

export function preguntasPERT(s: DatosPERT, plazo: number): Pregunta[] {
  const r = resolverPERT({ titulo: s.titulo, actividades: s.actividades, unidadTiempo: s.unidadTiempo });
  const d = r.datos;
  const u = s.unidadTiempo;
  const prob =
    d === null
      ? null
      : probabilidadPlazo({
          media: d.duracionEsperada,
          desviacion: d.desviacionProyecto,
          plazo: plazo,
          sentido: 'antes',
          unidadTiempo: u,
        }).datos;

  return [
    {
      id: 'p1',
      enunciado: `¿Cuál es la duración esperada del proyecto, en ${u}?`,
      tipo: 'numerica',
      respuesta: d?.duracionEsperada ?? null,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Calcule primero el tiempo esperado de cada actividad con TE = (a + 4m + b) / 6.',
        'Con esos tiempos esperados, resuelva la red igual que en CPM.',
      ],
      claveVerificacion: 'pert.duracionEsperada',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: 'Escriba la ruta crítica probabilística, separando las actividades con guiones.',
      tipo: 'texto',
      respuesta: d?.rutaEvaluada.join('-') ?? null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: ['Use los tiempos esperados como duraciones y busque las actividades con holgura cero.'],
      claveVerificacion: 'pert.rutaCritica',
      puntos: 2,
    },
    {
      id: 'p3',
      enunciado: '¿Cuál es la varianza del proyecto?',
      tipo: 'numerica',
      respuesta: d?.varianzaProyecto ?? null,
      unidad: `${u}²`,
      tolerancia: 0.02,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La varianza de cada actividad es ((b − a) / 6)².',
        'Se suman las varianzas de las actividades de la ruta crítica, no sus desviaciones estándar.',
        'Sumar desviaciones estándar es el error más frecuente de este tema.',
      ],
      claveVerificacion: 'pert.varianzaProyecto',
      puntos: 2,
    },
    {
      id: 'p4',
      enunciado: `¿Cuál es la probabilidad de terminar en menos de ${plazo} ${u}? Exprésela en porcentaje.`,
      tipo: 'numerica',
      respuesta: prob === null ? null : prob.probabilidad * 100,
      unidad: '%',
      tolerancia: 0.02,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Estandarice el plazo con Z = (T − μ) / σ.',
        'La desviación estándar del proyecto es la raíz cuadrada de la varianza del proyecto.',
        'Busque en la tabla normal el área a la izquierda de ese valor de Z.',
      ],
      claveVerificacion: 'pert.probabilidad',
      puntos: 3,
    },
    {
      id: 'p5',
      enunciado:
        'La duración esperada tiene 50 % de probabilidad de cumplirse. Explique qué implicación tiene eso al ' +
        'comprometer una fecha con un cliente, y qué colchón recomendaría.',
      tipo: 'interpretacion',
      respuesta: null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'La media divide la distribución normal en dos mitades iguales.',
        'Para 95 % de confianza hace falta agregar 1,645 desviaciones estándar.',
      ],
      claveVerificacion: null,
      puntos: 2,
    },
  ];
}

export function preguntasGrafico(s: DatosGrafico): Pregunta[] {
  const resuelto = resolverGrafico(s);
  const d = resuelto.datos;
  const dg = s;
  const verbo = dg.objetivo === 'maximizar' ? 'máximo' : 'mínimo';

  // El caso infactible no admite preguntas numéricas: solo interpretación.
  if (d === null || d.desenlace === 'infactible') {
    return [
      {
        id: 'p1',
        enunciado: '¿Cuántos vértices tiene la región factible de este modelo?',
        tipo: 'numerica',
        respuesta: 0,
        unidad: 'vértices',
        tolerancia: 0.001,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Grafique las dos restricciones y busque la zona donde se superponen.',
          'Si una restricción exige un total mayor que el que otra permite, no queda ninguna zona común.',
        ],
        claveVerificacion: 'grafico.vertices',
        puntos: 2,
      },
      {
        id: 'p2',
        enunciado:
          'Explique en términos del negocio por qué el modelo no tiene solución y proponga dos cursos de acción concretos ' +
          'para la gerencia de la cooperativa.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Un modelo infactible no es un error de cálculo: es un aviso de que las condiciones se contradicen.',
          'Toda solución pasa por relajar una de las dos restricciones o por conseguir capacidad fuera de la cooperativa.',
        ],
        claveVerificacion: null,
        puntos: 4,
      },
    ];
  }

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: `¿Cuántos vértices tiene la región factible?`,
      tipo: 'numerica',
      respuesta: d.vertices.length,
      unidad: 'vértices',
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Cada vértice sale de cruzar dos rectas: dos restricciones entre sí, o una restricción con un eje.',
        'No todos los cruces sirven: hay que descartar los que violan alguna otra restricción.',
        dg.noNegatividad ? 'No olvide el origen si es factible, ni los cortes con los ejes.' : 'Revise cada cruce contra todas las restricciones.',
      ],
      claveVerificacion: 'grafico.vertices',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `¿Cuál es el valor de ${dg.nombreX} en la solución óptima?`,
      tipo: 'numerica',
      respuesta: d.optimo?.punto.x ?? null,
      unidad: dg.unidadVariables,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El óptimo siempre está en un vértice: evalúe la función objetivo en todos y compare.',
        `Como se busca ${verbo === 'máximo' ? 'el mayor' : 'el menor'} valor de Z, quédese con el vértice que lo alcanza.`,
      ],
      claveVerificacion: 'grafico.optimoX',
      puntos: 2,
    },
    {
      id: 'p3',
      enunciado: `¿Cuál es el valor de ${dg.nombreY} en la solución óptima?`,
      tipo: 'numerica',
      respuesta: d.optimo?.punto.y ?? null,
      unidad: dg.unidadVariables,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: ['Es la segunda coordenada del mismo vértice óptimo.'],
      claveVerificacion: 'grafico.optimoY',
      puntos: 2,
    },
    {
      id: 'p4',
      enunciado: `¿Cuál es el valor ${verbo} de Z, en ${dg.unidadObjetivo}?`,
      tipo: 'numerica',
      respuesta: d.valorOptimo,
      unidad: dg.unidadObjetivo,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        `Sustituya las coordenadas del vértice óptimo en Z = ${dg.coefX} ${dg.nombreX} + ${dg.coefY} ${dg.nombreY}.`,
        'Trabaje con todos los decimales del vértice y redondee solo al final.',
      ],
      claveVerificacion: 'grafico.valorOptimo',
      puntos: 3,
    },
  ];

  const activas = d.holguras.filter((h) => h.activa);
  if (activas.length > 0) {
    base.push({
      id: 'p5',
      enunciado: `Escriba el nombre de la restricción o restricciones que quedan activas en el óptimo, separadas por comas.`,
      tipo: 'texto',
      respuesta: activas.map((h) => h.restriccion.nombre).join('; '),
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Una restricción está activa cuando su holgura es cero: el recurso se agota exactamente.',
        'Sustituya el vértice óptimo en cada restricción y compare el consumo con lo disponible.',
      ],
      claveVerificacion: 'grafico.activas',
      puntos: 3,
    });
  }

  const sensibilidad = analizarSensibilidad(d).datos;
  const masValioso = sensibilidad?.recursoMasValioso ?? null;

  if (masValioso !== null) {
    base.push({
      id: 'p6',
      enunciado:
        `¿Cuál es el precio sombra de «${masValioso.restriccion.nombre}», en ${dg.unidadObjetivo} por ${singular(masValioso.restriccion.unidad)}?`,
      tipo: 'numerica',
      respuesta: masValioso.valor,
      unidad: `${dg.unidadObjetivo}/${singular(masValioso.restriccion.unidad)}`,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El precio sombra es cuánto cambia Z si se consigue una unidad más de ese recurso.',
        'Aumente el lado derecho de esa restricción en una unidad, vuelva a resolver y mida la diferencia en Z.',
        'También sale de resolver el sistema dual: el gradiente de la función objetivo como combinación de las normales de las restricciones activas.',
      ],
      claveVerificacion: 'grafico.precioSombra',
      puntos: 3,
    });

    if (masValioso.rangoHasta !== null) {
      base.push({
        id: 'p7',
        enunciado:
          `¿Hasta qué valor puede aumentar la disponibilidad de «${masValioso.restriccion.nombre}» sin que cambie ese precio sombra? ` +
          `Exprese el valor total del recurso, no el incremento.`,
        tipo: 'numerica',
        respuesta: masValioso.rangoHasta,
        unidad: masValioso.restriccion.unidad,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'A medida que aumenta el recurso, el vértice óptimo se desliza a lo largo de la otra restricción activa.',
          'El precio sombra deja de valer cuando otra restricción se vuelve el nuevo cuello de botella.',
          'Busque el punto donde el vértice óptimo, al desplazarse, toca una restricción que hasta ahora tenía holgura.',
        ],
        claveVerificacion: 'grafico.rangoFactibilidad',
        puntos: 3,
      });
    }
  }

  base.push({
    id: 'p8',
    enunciado:
      d.desenlace === 'multiples'
        ? 'Este problema tiene más de una solución óptima. Explique por qué ocurre y qué ventaja le da eso a la gerencia.'
        : masValioso !== null
          ? `Un proveedor le ofrece una unidad adicional de «${masValioso.restriccion.nombre}». ¿Cuál es el precio máximo que debería estar dispuesto a pagar, y por qué no conviene pagar más? Mencione qué pasaría si comprara mucho más de ese recurso.`
          : `Si pudiera conseguir una unidad más de un solo recurso, ¿cuál elegiría y por qué? ¿Y qué pasaría si consiguiera más de un recurso que sobra?`,
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas:
      d.desenlace === 'multiples'
        ? [
            'Compare la pendiente de la función objetivo con la de las restricciones activas.',
            'Si dos planes distintos dan el mismo dinero, la decisión se puede tomar por otros criterios.',
          ]
        : [
            'Solo los recursos que se agotan limitan el resultado: los que sobran valen cero.',
            'El precio sombra es exactamente el precio máximo que conviene pagar por una unidad más.',
            'Fuera del rango de factibilidad, otra restricción pasa a ser el cuello de botella y el precio cae.',
          ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

export function preguntasSimplex(s: DatosSimplex): Pregunta[] {
  const ds = s;
  const resultado = resolverSimplex(ds);
  const d = resultado.datos;

  const verbo = ds.objetivo === 'maximizar' ? 'máximo' : 'mínimo';

  // Los modelos sin óptimo finito —infactibles o no acotados— no admiten
  // preguntas numéricas: se pregunta por el diagnóstico, que es la respuesta
  // real del método.
  if (d === null) {
    const infactible = resultado.diagnosticos.some((x) => x.codigo === 'SX_INFACTIBLE');
    return [
      {
        id: 'p1',
        enunciado: '¿Qué desenlace tiene este modelo: solución única, óptimos múltiples, problema infactible o problema no acotado?',
        tipo: 'seleccion',
        respuesta: infactible ? 'problema infactible' : 'problema no acotado',
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: ['solución única', 'óptimos múltiples', 'problema infactible', 'problema no acotado'],
        pistas: [
          infactible
            ? 'Sume lo que exigen los mínimos y compárelo con la capacidad disponible antes de armar el tableau.'
            : 'Revise si alguna restricción limita el total producido, o si todas limitan solo diferencias o proporciones.',
          infactible
            ? 'La fase 1 minimiza la suma de las artificiales. Si ese mínimo no llega a cero, no hay ningún punto factible.'
            : 'Si al elegir la columna que entra ninguna fila da razón, nada frena a esa variable.',
        ],
        claveVerificacion: 'simplex.desenlace',
        puntos: 3,
      },
      {
        id: 'p2',
        enunciado: infactible
          ? '¿En qué fase del método se detecta este problema, y qué valor toma allí la función que se minimiza?'
          : '¿En qué momento del procedimiento se detecta que el problema no está acotado?',
        tipo: 'texto',
        respuesta: infactible ? 'fase 1' : 'prueba de la razón mínima',
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          infactible
            ? 'Es la fase que existe justamente para averiguar si hay o no una solución factible.'
            : 'Es el momento en que se decide qué variable sale de la base.',
        ],
        claveVerificacion: 'simplex.fase',
        puntos: 2,
      },
      {
        id: 'p3',
        enunciado: infactible
          ? 'Explique qué debería hacer la gerencia ante este resultado. ¿Es un error del método o una respuesta del método?'
          : 'Explique por qué el modelo no está acotado y proponga la restricción que falta. ¿Por qué en la realidad nunca ocurre esto?',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          infactible
            ? 'Un modelo infactible dice que las exigencias se contradicen entre sí: hay que renegociar alguna o ampliar la capacidad.'
            : 'Ningún recurso es infinito y ningún mercado absorbe cantidad ilimitada.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ];
  }

  const resumen = resumenColumnas(d.columnas);
  const sensibilidad = analizarSensibilidadSimplex(d).datos;
  const activas = d.holguras.filter((h) => h.activa);
  // Se pregunta por la restricción que más pesa en el resultado, medida por la
  // magnitud de su precio sombra. Al minimizar, el signo se invierte —relajar
  // una exigencia abarata— así que comparar por el valor con signo elegiría la
  // restricción equivocada.
  const masValioso = d.holguras
    .filter((h) => h.activa && !esCero(h.precioSombra))
    .reduce<(typeof d.holguras)[number] | null>(
      (mejor, h) => (mejor === null || comparar(valorAbsoluto(h.precioSombra), valorAbsoluto(mejor.precioSombra)) > 0 ? h : mejor),
      null,
    );

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: `¿Cuántas variables tiene el modelo en forma estándar, contando las de decisión, las de holgura, las de exceso y las artificiales?`,
      tipo: 'numerica',
      respuesta: d.columnas.length,
      unidad: 'variables',
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Cada restricción ≤ agrega una holgura; cada ≥ agrega un exceso y una artificial; cada = agrega una artificial.',
        `Este modelo tiene ${resumen.decision} variables de decisión y ${d.datos.restricciones.length} restricciones.`,
      ],
      claveVerificacion: 'simplex.columnas',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `¿Cuál es el valor ${verbo} de Z, en ${ds.unidadObjetivo}?`,
      tipo: 'numerica',
      respuesta: aNumero(d.valorOptimo!),
      unidad: ds.unidadObjetivo,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Es el valor que aparece en la esquina de la fila objetivo del tableau final.',
        'Compruébelo sustituyendo la solución en la función objetivo original: los dos caminos tienen que dar lo mismo.',
      ],
      claveVerificacion: 'simplex.valorOptimo',
      puntos: 3,
    },
  ];

  d.solucion.forEach((sol, i) => {
    base.push({
      id: `p${3 + i}`,
      enunciado: `¿Cuántos ${ds.unidadVariables} de ${sol.variable.nombre} produce la solución óptima?`,
      tipo: 'numerica',
      respuesta: aNumero(sol.valor),
      unidad: ds.unidadVariables,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Si la variable quedó en la base, su valor es el lado derecho de su fila; si no quedó en la base, vale cero.',
        'Las variables no básicas valen cero: eso es lo que significa estar fuera de la base.',
      ],
      claveVerificacion: 'simplex.variable',
      puntos: 2,
    });
  });

  let siguiente = 3 + d.solucion.length;

  if (activas.length > 0) {
    base.push({
      id: `p${siguiente++}`,
      enunciado: 'Escriba el nombre de la restricción o restricciones cuyo recurso se agota por completo, separadas por punto y coma.',
      tipo: 'texto',
      respuesta: activas.map((h) => h.restriccion.nombre).join('; '),
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Un recurso se agota cuando su holgura sale de la base, es decir cuando vale cero.',
        'En el tableau final, busque qué holguras ya no aparecen en la columna «Base».',
      ],
      claveVerificacion: 'simplex.activas',
      puntos: 3,
    });
  }

  if (masValioso !== null) {
    base.push({
      id: `p${siguiente++}`,
      enunciado: `¿Cuál es el precio sombra de «${masValioso.restriccion.nombre}», en ${ds.unidadObjetivo} por ${singular(masValioso.restriccion.unidad)}?`,
      tipo: 'numerica',
      respuesta: aNumero(masValioso.precioSombra),
      unidad: `${ds.unidadObjetivo}/${singular(masValioso.restriccion.unidad)}`,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'No hace falta volver a calcular: el tableau final ya lo trae.',
        'Búsquelo en la fila objetivo, en la columna de la holgura de esa restricción.',
        'Compruébelo aumentando en una unidad el lado derecho y volviendo a resolver: la diferencia en Z debe ser ese número.',
      ],
      claveVerificacion: 'simplex.precioSombra',
      puntos: 3,
    });

    const rango = sensibilidad?.rangosLadoDerecho.find((x) => x.holgura.restriccion.id === masValioso.restriccion.id);
    if (rango?.hasta != null) {
      base.push({
        id: `p${siguiente++}`,
        enunciado:
          `¿Hasta qué valor puede aumentar la disponibilidad de «${masValioso.restriccion.nombre}» sin que cambie ese precio sombra? ` +
          `Exprese el valor total del recurso, no el incremento.`,
        tipo: 'numerica',
        respuesta: aNumero(rango.hasta),
        unidad: masValioso.restriccion.unidad,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'El precio sombra deja de valer cuando la base cambia, es decir cuando alguna variable básica llegaría a cero.',
          'Si el lado derecho cambia en Δ, las variables básicas pasan a valer x_B + Δ·d, con d la columna de B⁻¹ de esa restricción.',
          'Esa columna es la de la holgura de la restricción en el tableau final: divida cada lado derecho entre su coeficiente y busque el primer tope.',
        ],
        claveVerificacion: 'simplex.rangoFactibilidad',
        puntos: 3,
      });
    }
  }

  const fuera = sensibilidad?.fueraDelPlan ?? [];
  const primeraFuera = fuera[0];
  if (primeraFuera !== undefined) {
    const objetivoLimite = ds.objetivo === 'maximizar' ? primeraFuera.hasta : primeraFuera.desde;
    if (objetivoLimite != null) {
      base.push({
        id: `p${siguiente++}`,
        enunciado:
          `${primeraFuera.variable.nombre} quedó fuera del plan. ¿A partir de qué valor de su aporte ` +
          `${ds.objetivo === 'maximizar' ? 'convendría producirlo' : 'convendría incluirlo en la mezcla'}, en ${ds.unidadObjetivo}?`,
        tipo: 'numerica',
        respuesta: aNumero(objetivoLimite),
        unidad: ds.unidadObjetivo,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'Una variable fuera del plan entra cuando su costo reducido llega a cero.',
          'El costo reducido es el valor de esa columna en la fila objetivo del tableau final.',
          `Sume ese costo reducido al aporte actual de ${primeraFuera.variable.nombre}: ahí está el umbral.`,
        ],
        claveVerificacion: 'simplex.costoReducido',
        puntos: 3,
      });
    }
  }

  base.push({
    id: `p${siguiente++}`,
    enunciado:
      d.desenlace === 'multiples'
        ? 'Este modelo tiene más de una solución óptima. Explique qué señal del tableau final lo indica y qué ventaja le da eso a la gerencia.'
        : masValioso === null
          ? 'Interprete el tableau final para la gerencia: qué producir, qué recursos se agotan y cuáles sobran.'
          : ds.objetivo === 'maximizar'
            ? `Un proveedor le ofrece una unidad adicional de «${masValioso.restriccion.nombre}». ¿Cuánto es lo máximo que conviene pagar y por qué? Explique además por qué conseguir más de un recurso que sobra no cambia nada.`
            : `¿Cuánto cambiaría el costo total si «${masValioso.restriccion.nombre}» se moviera una unidad? Diga en qué sentido y qué decisión permite tomar ese número. Explique además por qué una restricción con holgura tiene precio sombra cero.`,
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas:
      d.desenlace === 'multiples'
        ? [
            'Fíjese en las columnas que no están en la base: alguna tiene un cero en la fila objetivo.',
            'Si varios planes dan el mismo dinero, la decisión se puede tomar por riesgo, empleo o clientes.',
          ]
        : [
            ds.objetivo === 'maximizar'
              ? 'El precio sombra es exactamente el precio máximo que conviene pagar por una unidad más.'
              : 'Al minimizar, endurecer una exigencia encarece y relajarla abarata: el signo del precio sombra dice en qué sentido.',
            'Una holgura que quedó en la base indica capacidad ociosa, y su precio sombra es cero.',
          ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

export function preguntasAsignacion(s: DatosAsignacion): Pregunta[] {
  const resuelto = resolverAsignacion(s);

  const total = resuelto.datos?.valorTotal ?? null;
  const verbo = s.objetivo === 'minimizar' ? 'mínimo' : 'máximo';

  return [
    {
      id: 'p1',
      enunciado: `¿Cuál es el valor total ${verbo} de la asignación óptima, en ${s.unidad}?`,
      tipo: 'numerica',
      respuesta: total,
      unidad: s.unidad,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        s.objetivo === 'maximizar'
          ? 'Antes de aplicar el método húngaro hay que convertir la maximización en minimización restando cada valor del mayor de la matriz.'
          : 'Empiece restando el mínimo de cada fila, luego el mínimo de cada columna.',
        'Cuando el número de líneas que cubren todos los ceros sea igual al tamaño de la matriz, ya hay solución.',
        'El total se lee siempre en la matriz original, nunca en la reducida.',
      ],
      claveVerificacion: 'asignacion.valorTotal',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `Escriba la asignación completa: qué ${singular(s.nombreFilas)} corresponde a cada ${singular(s.nombreColumnas)}.`,
      tipo: 'texto',
      respuesta:
        resuelto.datos?.asignaciones
          .filter((a) => !a.ficticia)
          .map((a) => `${a.nombreFila} → ${a.nombreColumna}`)
          .join('; ') ?? null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Cada fila recibe exactamente una columna y cada columna exactamente una fila.',
        'Los ceros seleccionados en la matriz final indican las asignaciones.',
      ],
      claveVerificacion: 'asignacion.asignaciones',
      puntos: 2,
    },
    {
      id: 'p3',
      enunciado:
        'La asignación óptima rara vez le da a cada recurso su mejor opción individual. Explique por qué ocurre eso y ' +
        'qué implicación gerencial tiene al comunicar la decisión al equipo.',
      tipo: 'interpretacion',
      respuesta: null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'El método optimiza el conjunto, no cada caso por separado.',
        'Piense en qué pasaría si dos recursos prefirieran la misma tarea.',
      ],
      claveVerificacion: null,
      puntos: 2,
    },
  ];
}

export function preguntasTransporte(s: DatosTransporte): Pregunta[] {
  const vogel = resolverTransporte(s, 'vogel');
  const noroeste = resolverTransporte(s, 'noroeste');

  const optimo = vogel.datos?.solucionOptima.costoTotal ?? null;
  const inicialNoroeste = noroeste.datos?.solucionInicial.costoTotal ?? null;
  const totalOferta = s.oferta.reduce((a, b) => a + b, 0);
  const totalDemanda = s.demanda.reduce((a, b) => a + b, 0);

  return [
    {
      id: 'p0',
      enunciado: '¿El problema está balanceado? Escriba la oferta total menos la demanda total.',
      tipo: 'numerica',
      respuesta: totalOferta - totalDemanda,
      unidad: s.unidadCantidad,
      tolerancia: 0.001,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Antes de asignar nada hay que verificar el balance: sume toda la oferta y toda la demanda.',
        'Si la diferencia no es cero, hace falta un origen o un destino ficticio con costo cero.',
      ],
      claveVerificacion: 'transporte.balance',
      puntos: 1,
    },
    {
      id: 'p1',
      enunciado: `¿Cuál es el costo de la solución inicial por el método de la esquina noroeste, en ${s.unidadCosto}?`,
      tipo: 'numerica',
      respuesta: inicialNoroeste,
      unidad: s.unidadCosto,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La esquina noroeste empieza en la celda superior izquierda y no mira los costos.',
        'Asigne el mínimo entre la oferta restante del origen y la demanda restante del destino.',
        'Avance a la derecha si se satisfizo el destino, hacia abajo si se agotó el origen.',
      ],
      claveVerificacion: 'transporte.costoInicial.noroeste',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `¿Cuál es el costo mínimo total del plan de envíos óptimo, en ${s.unidadCosto}?`,
      tipo: 'numerica',
      respuesta: optimo,
      unidad: s.unidadCosto,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Construya una solución inicial y luego mejórela con MODI.',
        'Los multiplicadores u y v se obtienen fijando u₁ = 0 y usando las celdas ocupadas: uᵢ + vⱼ = cᵢⱼ.',
        'Mientras exista un costo reducido negativo, la solución todavía se puede mejorar.',
      ],
      claveVerificacion: 'transporte.costoOptimo',
      puntos: 3,
    },
    {
      id: 'p3',
      enunciado:
        'Explique la decisión logística que se desprende del plan óptimo: qué ruta es la más importante y qué haría ' +
        'usted si el transportista de esa ruta subiera su tarifa un 20 %.',
      tipo: 'interpretacion',
      respuesta: null,
      unidad: null,
      tolerancia: 0,
      toleranciaRelativa: false,
      opciones: [],
      pistas: [
        'Fíjese en la ruta que mueve más cantidad y en la que más aporta al costo total.',
        'Los costos reducidos indican cuánto cuesta desviar una unidad a cada ruta no utilizada.',
      ],
      claveVerificacion: null,
      puntos: 2,
    },
  ];
}

/**
 * Punto de equilibrio. Es el único tema cuyos ejercicios de la biblioteca
 * traen las preguntas escritas una a una en el archivo de datos, porque cada
 * uno destaca un aspecto distinto —comisión, valor de recuperación, utilidad
 * objetivo—. Este constructor arma el juego común, que es el que necesitan los
 * ejercicios generados.
 */
// La unidad de producto la fija cada ejercicio y puede ser masculina o femenina
// —huevos, libras, conos, camisetas—, así que las preguntas se redactan con «qué
// cantidad de…», que concuerda con cualquiera de las dos.
export function preguntasEquilibrio(s: DatosEquilibrio): Pregunta[] {
  const r = resolverEquilibrio(s);
  const d = r.datos;
  const u = s.unidadProducto;
  const moneda = s.moneda === 'USD' ? 'US$' : 'L';

  if (d === null || !d.alcanzable) {
    return [
      {
        id: 'p1',
        enunciado:
          'Este modelo no tiene punto de equilibrio. Explique por qué y qué tendría que cambiar la gerencia para que lo tuviera.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Compare el precio de venta con el costo variable unitario, comisión incluida.',
          'Si cada unidad vendida pierde dinero, vender más agranda la pérdida en vez de reducirla.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ];
  }

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: `¿Cuál es el margen de contribución unitario, en ${moneda}?`,
      tipo: 'numerica',
      respuesta: d.margenContribucionUnitario,
      unidad: moneda,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El margen de contribución es lo que queda de cada unidad vendida después de cubrir su costo variable.',
        s.comisionPorcentaje > 0
          ? 'La comisión sobre el ingreso es costo variable: hay que sumarla al costo variable unitario antes de restar.'
          : 'Reste el costo variable unitario al precio de venta.',
      ],
      claveVerificacion: 'equilibrio.margenContribucion',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `¿Qué cantidad de ${u} hay que vender para alcanzar el punto de equilibrio?`,
      tipo: 'numerica',
      respuesta: d.puntoEquilibrioUnidades,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'En el equilibrio, el margen de contribución total iguala exactamente a los costos fijos.',
        'Divida los costos fijos netos entre el margen de contribución unitario.',
        s.valorRecuperacion > 0
          ? 'Antes de dividir, reste del costo fijo el valor de recuperación: ese ingreso ya está asegurado.'
          : 'No redondee el margen antes de dividir: hágalo solo al final.',
      ],
      claveVerificacion: 'equilibrio.puntoEquilibrioUnidades',
      puntos: 3,
    },
  ];

  if (d.porcentajeCapacidad !== null) {
    base.push({
      id: 'p3',
      enunciado: '¿Qué porcentaje de la capacidad instalada representa el punto de equilibrio?',
      tipo: 'numerica',
      respuesta: d.porcentajeCapacidad,
      unidad: '%',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Divida las unidades de equilibrio entre la capacidad y exprese el resultado en porcentaje.',
        'Un equilibrio que exige más del 100 % de la capacidad significa que el negocio no puede dejar de perder.',
      ],
      claveVerificacion: 'equilibrio.porcentajeCapacidad',
      puntos: 2,
    });
  }

  if (d.unidadesParaObjetivo !== null) {
    base.push({
      id: 'p4',
      enunciado: `¿Qué cantidad de ${u} hay que vender para alcanzar la utilidad objetivo?`,
      tipo: 'numerica',
      respuesta: d.unidadesParaObjetivo,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La utilidad objetivo se trata como un costo fijo más: hay que cubrirla igual que los demás.',
        'Sume la utilidad deseada a los costos fijos netos y vuelva a dividir entre el margen unitario.',
      ],
      claveVerificacion: 'equilibrio.unidadesParaObjetivo',
      puntos: 3,
    });
  }

  if (d.utilidadEsperada !== null) {
    base.push({
      id: 'p5',
      enunciado: `Con el volumen de ventas esperado, ¿cuál es la utilidad del periodo, en ${moneda}?`,
      tipo: 'numerica',
      respuesta: d.utilidadEsperada,
      unidad: moneda,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La utilidad es el margen de contribución total menos los costos fijos netos.',
        'Multiplique el margen unitario por el volumen esperado antes de restar los fijos.',
      ],
      claveVerificacion: 'equilibrio.utilidadEsperada',
      puntos: 3,
    });
  }

  base.push({
    id: 'p6',
    enunciado:
      'Interprete el resultado para la gerencia: ¿qué margen de seguridad tiene el negocio y qué haría usted si el ' +
      'costo variable subiera un 10 %?',
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas: [
      'El margen de seguridad es cuánto pueden caer las ventas antes de empezar a perder.',
      'Un margen unitario pequeño hace al negocio muy sensible: cualquier alza de costos mueve mucho el equilibrio.',
    ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

/**
 * Punto de equilibrio multiproducto. Aquí la pregunta central no es «cuántas
 * unidades» sino «cuánto hay que facturar», porque con varios productos la
 * unidad deja de ser comparable: lo que se pondera es la razón de margen.
 */
export function preguntasEquilibrioMultiproducto(s: DatosEquilibrioMultiproducto): Pregunta[] {
  const r = resolverEquilibrioMultiproducto(s);
  const d = r.datos;
  const moneda = s.moneda === 'USD' ? 'US$' : 'L';

  if (d === null || !d.alcanzable) {
    return [
      {
        id: 'p1',
        enunciado:
          'Esta mezcla no tiene punto de equilibrio. Explique por qué y qué tendría que cambiar la gerencia para que lo tuviera.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Revise si algún producto se vende por debajo de su costo variable.'],
        claveVerificacion: null,
        puntos: 3,
      },
    ];
  }

  // Las dos primeras preguntas son el promedio ponderado y el total de
  // equilibrio, pero cambian de unidad con la base de la mezcla: en unidades el
  // promedio son lempiras por unidad, en ingresos es una fracción del precio.
  const porUnidades = d.baseMezcla === 'unidades';

  const base: Pregunta[] = porUnidades
    ? [
        {
          id: 'p1',
          enunciado: `Margen de contribución ponderado de la mezcla, en ${moneda} por unidad.`,
          tipo: 'numerica',
          respuesta: d.margenPonderado,
          unidad: `${moneda} / unidad`,
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Calcule primero el margen de cada producto: precio menos costo variable unitario.',
            'Después multiplique cada margen por la participación del producto en las unidades vendidas y sume.',
            'No promedie los márgenes sin ponderar: un producto que es el 5 % de las unidades no pesa igual que uno que es el 50 %.',
          ],
          claveVerificacion: 'equilibrio.margenPonderado',
          puntos: 3,
        },
        {
          id: 'p2',
          enunciado: '¿Cuántas unidades combinadas hay que vender para alcanzar el punto de equilibrio?',
          tipo: 'numerica',
          respuesta: d.unidadesEquilibrio,
          unidad: 'unidades',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Es el mismo cálculo de un solo producto, pero con la unidad promedio de la mezcla.',
            'Divida los costos fijos entre el margen de contribución ponderado.',
          ],
          claveVerificacion: 'equilibrio.unidadesEquilibrio',
          puntos: 3,
        },
      ]
    : [
        {
          id: 'p1',
          enunciado: 'Razón de margen de contribución ponderada de la mezcla, en porcentaje.',
          tipo: 'numerica',
          respuesta: d.razonPonderada === null ? null : d.razonPonderada * 100,
          unidad: '%',
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Calcule primero la razón de margen de cada producto: margen unitario dividido entre su precio.',
            'Después pondere esas razones por la participación de cada producto en el ingreso total.',
            'No promedie las razones sin ponderar: un producto que aporta el 5 % del ingreso no pesa igual que uno que aporta el 50 %.',
          ],
          claveVerificacion: 'equilibrio.razonPonderada',
          puntos: 3,
        },
        {
          id: 'p2',
          enunciado: `¿Cuánto hay que facturar en total para alcanzar el punto de equilibrio, en ${moneda}?`,
          tipo: 'numerica',
          respuesta: d.ingresoEquilibrio,
          unidad: moneda,
          tolerancia: 0.01,
          toleranciaRelativa: true,
          opciones: [],
          pistas: [
            'Cuando la mezcla se mide en dinero, el equilibrio se expresa en dinero.',
            'Divida los costos fijos entre la razón de margen ponderada.',
          ],
          claveVerificacion: 'equilibrio.ingresoEquilibrio',
          puntos: 3,
        },
      ];

  const primero = d.detalle[0];
  if (primero !== undefined && primero.unidadesEquilibrio !== null) {
    base.push({
      id: 'p3',
      enunciado: `¿Cuántas unidades de ${primero.producto.nombre} implica ese punto de equilibrio?`,
      tipo: 'numerica',
      respuesta: primero.unidadesEquilibrio,
      unidad: 'unidades',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: porUnidades
        ? [
            'El total se reparte con los mismos porcentajes de la mezcla.',
            `Multiplique las unidades de equilibrio por la participación de ${primero.producto.nombre}.`,
          ]
        : [
            'Reparta el ingreso de equilibrio entre los productos según su participación.',
            'Divida el ingreso que le toca a ese producto entre su precio de venta.',
          ],
      claveVerificacion: 'equilibrio.unidadesProducto',
      puntos: 3,
    });
  }

  base.push({
    id: 'p4',
    enunciado:
      'La mezcla de ventas es un supuesto, no un dato fijo. Explique qué pasaría con el punto de equilibrio si se vendiera ' +
      'más del producto de mayor margen, y qué decisión comercial se desprende de eso.',
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas: [
      'Compare los productos: no todos aportan lo mismo por cada unidad vendida.',
      'Si sube la participación del producto que más contribuye, el promedio ponderado sube y el equilibrio baja.',
    ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

/**
 * Despachador: arma el juego de preguntas que corresponde al tipo de datos.
 *
 * Los temas que se crean a mano —fundamentos, localización y distribución—
 * devuelven una lista vacía: sus preguntas dependen del enunciado concreto y no
 * se pueden derivar solo de los datos.
 */
export function preguntasInventarios(s: DatosInventarios): Pregunta[] {
  const r = resolverInventarios(s);
  const d = r.datos;
  const moneda = s.moneda === 'USD' ? 'US$' : 'L';
  const u = s.unidadProducto;

  if (d === null) {
    return [
      {
        id: 'p1',
        enunciado: 'Con estos datos no existe un lote económico. Explique por qué y qué dato habría que corregir.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: ['Si conservar no cuesta nada, convendría pedir todo el año de una sola vez.'],
        claveVerificacion: null,
        puntos: 2,
      },
    ];
  }

  const base: Pregunta[] = [];

  if (s.modelo === 'periodo_fijo') {
    base.push(
      {
        id: 'p1',
        enunciado: '¿Cada cuántos días conviene revisar el inventario?',
        tipo: 'numerica',
        respuesta: (d.intervaloAnios ?? 0) * s.diasPorAnio,
        unidad: 'días',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'El intervalo económico surge del mismo equilibrio entre ordenar y conservar que el lote económico.',
          'T = √(2·Co / (D·Ch)), y sale en años: multiplíquelo por los días del año.',
        ],
        claveVerificacion: 'inventarios.intervalo',
        puntos: 3,
      },
      {
        id: 'p2',
        enunciado: `¿Hasta qué nivel hay que ordenar en cada revisión, en ${u}?`,
        tipo: 'numerica',
        respuesta: d.nivelObjetivo,
        unidad: u,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'El nivel tiene que aguantar hasta la revisión siguiente y además hasta que llegue lo que se pida hoy.',
          'M = D · (T + L), con T y L expresados en la misma escala de tiempo.',
          'Quien calcula M solo con T se queda sin existencias justo antes de cada entrega.',
        ],
        claveVerificacion: 'inventarios.nivelObjetivo',
        puntos: 3,
      },
    );
  } else {
    base.push({
      id: 'p1',
      enunciado:
        s.modelo === 'reabastecimiento_uniforme'
          ? `¿Cuánto conviene producir en cada corrida, en ${u}?`
          : `¿Cuál es el tamaño del lote económico, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.cantidadOptima,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'El lote económico equilibra el costo de ordenar contra el de conservar.',
        s.modelo === 'reabastecimiento_uniforme'
          ? 'Como el lote entra mientras la demanda consume, el costo de conservar se reduce por el factor (1 − D/p).'
          : 'Q = √(2·D·Co / Ch).',
        `Con D = ${formatearNumero(s.demandaAnual)}, Co = ${formatearNumero(s.costoOrdenar)} y Ch = ${formatearNumero(s.costoConservar)}.`,
      ],
      claveVerificacion: 'inventarios.loteEconomico',
      puntos: 3,
    });

    if (s.modelo === 'reabastecimiento_uniforme') {
      base.push({
        id: 'p2',
        enunciado: `¿Cuál es el inventario máximo que llega a acumularse, en ${u}?`,
        tipo: 'numerica',
        respuesta: d.inventarioMaximo,
        unidad: u,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'El inventario nunca llega a valer el lote completo: mientras entra, la demanda ya está consumiendo.',
          'Imáx = Q · (1 − D/p).',
        ],
        claveVerificacion: 'inventarios.inventarioMaximo',
        puntos: 3,
      });
    } else {
      base.push({
        id: 'p2',
        enunciado: '¿Cuántas órdenes se harán en un año?',
        tipo: 'numerica',
        respuesta: d.ordenesPorAnio,
        unidad: 'órdenes',
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: ['Divida la demanda anual entre el tamaño del lote.'],
        claveVerificacion: 'inventarios.ordenesPorAnio',
        puntos: 2,
      });
    }
  }

  base.push({
    id: 'p3',
    enunciado: `¿Cuál es el costo anual de inventario, en ${moneda}?`,
    tipo: 'numerica',
    respuesta: d.costoAnualInventario,
    unidad: moneda,
    tolerancia: 0.01,
    toleranciaRelativa: true,
    opciones: [],
    pistas: [
      'El costo anual de inventario suma lo que cuesta ordenar y lo que cuesta conservar.',
      'La compra del año no entra: no depende del tamaño del lote, así que no cambia la decisión.',
      'En el óptimo los dos componentes son iguales; sirve como comprobación.',
    ],
    claveVerificacion: 'inventarios.costoAnual',
    puntos: 3,
  });

  if (s.modelo !== 'periodo_fijo') {
    base.push({
      id: 'p4',
      enunciado: '¿Cuántos días de abastecimiento se ordenan cada vez?',
      tipo: 'numerica',
      respuesta: d.diasEntreOrdenes,
      unidad: 'días',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        `Los días del año son ${formatearNumero(s.diasPorAnio, { decimales: 0 })}: repártalos entre las órdenes del año.`,
      ],
      claveVerificacion: 'inventarios.diasEntreOrdenes',
      puntos: 2,
    });
  }

  if (s.costoUnitario > 0) {
    base.push({
      id: 'p5',
      enunciado: `Si cada ${singular(u)} cuesta ${moneda} ${formatearNumero(s.costoUnitario)}, ¿cuál es el valor de cada orden?`,
      tipo: 'numerica',
      respuesta: d.valorDeCadaOrden,
      unidad: moneda,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: ['Es el tamaño del lote multiplicado por el costo unitario.'],
      claveVerificacion: 'inventarios.valorOrden',
      puntos: 2,
    });
  }

  if (s.tiempoEntregaDias > 0 && s.modelo !== 'periodo_fijo') {
    base.push({
      id: 'p6',
      enunciado: `Con un tiempo de entrega de ${formatearNumero(s.tiempoEntregaDias)} días, ¿cuál es el punto de reorden, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.puntoReorden,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Hay que pedir cuando quede lo justo para aguantar el tiempo de entrega.',
        'La demanda y el tiempo de entrega tienen que estar en la misma escala: convierta la demanda anual a diaria.',
        `R = (${formatearNumero(s.demandaAnual)} ÷ ${formatearNumero(s.diasPorAnio, { decimales: 0 })}) × ${formatearNumero(s.tiempoEntregaDias)}.`,
      ],
      claveVerificacion: 'inventarios.puntoReorden',
      puntos: 3,
    });
  }

  base.push({
    id: 'p7',
    enunciado:
      'La curva del costo total es muy plana cerca del óptimo. Explique qué implica eso para quien tiene que hacer el ' +
      'pedido de verdad, y en qué situación sí valdría la pena calcular el lote exacto.',
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas: [
      'Pruebe en el laboratorio qué pasa con el costo si pide un 20 % más o menos que el lote económico.',
      'Piense en presentaciones del proveedor, capacidad de la bodega y vida útil del producto.',
    ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

export function preguntasColas(s: DatosColas): Pregunta[] {
  const r = resolverColas(s);
  const d = r.datos;
  const moneda = s.moneda === 'USD' ? 'US$' : 'L';
  const u = s.unidadTiempo;

  if (d === null) {
    return [
      {
        id: 'p1',
        enunciado:
          'Este sistema no alcanza un estado estable. Explique qué significa eso en la práctica y qué habría que ' +
          'cambiar para poder calcular una espera promedio.',
        tipo: 'interpretacion',
        respuesta: null,
        unidad: null,
        tolerancia: 0,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Compare cuántos llegan por unidad de tiempo contra cuántos alcanzan a atender todos los servidores juntos.',
          'Si la cola crece sin límite, no existe un promedio que calcular.',
        ],
        claveVerificacion: null,
        puntos: 3,
      },
    ];
  }

  const base: Pregunta[] = [
    {
      id: 'p1',
      enunciado: '¿Cuál es la utilización del sistema, en porcentaje?',
      tipo: 'numerica',
      respuesta: d.utilizacion * 100,
      unidad: '%',
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La utilización compara lo que llega contra lo que el sistema completo puede atender.',
        `ρ = λ / (s·μ), con s = ${formatearNumero(s.servidores, { decimales: 0 })} servidor(es).`,
        'Ojo: hay que multiplicar la tasa de servicio por el número de servidores, no dividir entre él.',
      ],
      claveVerificacion: 'colas.utilizacion',
      puntos: 2,
    },
    {
      id: 'p2',
      enunciado: `¿Cuántos ${s.nombreClientes} hay en promedio esperando en la cola?`,
      tipo: 'numerica',
      respuesta: d.enCola,
      unidad: s.nombreClientes,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La cola cuenta solo a los que esperan, no a los que ya están siendo atendidos.',
        'Todas las medidas cuelgan de la probabilidad de sistema vacío: calcúlela primero.',
      ],
      claveVerificacion: 'colas.enCola',
      puntos: 3,
    },
    {
      id: 'p3',
      enunciado: `¿Cuánto espera en promedio un ${singular(s.nombreClientes)} antes de ser atendido, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.tiempoCola,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'La ley de Little enlaza cantidad y tiempo: lo que hay en la cola es lo que llega multiplicado por lo que espera.',
        'Wq = Lq / λ.',
      ],
      claveVerificacion: 'colas.tiempoCola',
      puntos: 3,
    },
    {
      id: 'p4',
      enunciado: `¿Cuánto tiempo pasa en total en el sistema, contando la espera y el servicio, en ${u}?`,
      tipo: 'numerica',
      respuesta: d.tiempoSistema,
      unidad: u,
      tolerancia: 0.01,
      toleranciaRelativa: true,
      opciones: [],
      pistas: [
        'Al tiempo de espera hay que sumarle el de ser atendido.',
        'W = Wq + 1/μ, con μ la tasa de servicio de **un** servidor.',
      ],
      claveVerificacion: 'colas.tiempoSistema',
      puntos: 2,
    },
  ];

  if (s.costoEsperaPorHora > 0 || s.costoServidorPorHora > 0) {
    const opciones = compararServidores(s);
    const mejor = opciones.reduce((a, b) => (b.costoTotal < a.costoTotal ? b : a), opciones[0]!);

    base.push(
      {
        id: 'p5',
        enunciado: `¿Cuántos servidores conviene tener funcionando?`,
        tipo: 'numerica',
        respuesta: mejor.servidores,
        unidad: 'servidores',
        tolerancia: 0.001,
        toleranciaRelativa: false,
        opciones: [],
        pistas: [
          'Calcule el costo total —espera más servidores— con cada número posible y quédese con el menor.',
          'El mínimo no está donde la cola desaparece: eliminarla del todo siempre sale más caro que tolerarla corta.',
        ],
        claveVerificacion: 'colas.servidoresOptimos',
        puntos: 3,
      },
      {
        id: 'p6',
        enunciado: `¿Cuál es el costo total por ${u} con ese número de servidores, en ${moneda}?`,
        tipo: 'numerica',
        respuesta: mejor.costoTotal,
        unidad: `${moneda} / ${u}`,
        tolerancia: 0.01,
        toleranciaRelativa: true,
        opciones: [],
        pistas: [
          'El costo de espera se calcula sobre los que están en el sistema, no solo sobre los que hacen cola.',
          'Al costo de espera se le suma el de operar cada servidor.',
        ],
        claveVerificacion: 'colas.costoTotal',
        puntos: 3,
      },
    );
  }

  base.push({
    id: 'p7',
    enunciado:
      'Un gerente propone reducir servidores «porque están ociosos parte del tiempo». Explique qué le pasaría a la ' +
      'espera y por qué la relación entre ocupación y cola no es proporcional.',
    tipo: 'interpretacion',
    respuesta: null,
    unidad: null,
    tolerancia: 0,
    toleranciaRelativa: false,
    opciones: [],
    pistas: [
      'Pruebe en el laboratorio qué pasa con la espera al quitar un servidor.',
      'Mire la curva de espera contra utilización: cerca del 100 % se dispara.',
      'Un servidor ocioso es la holgura que absorbe las variaciones de las llegadas.',
    ],
    claveVerificacion: null,
    puntos: 3,
  });

  return base;
}

export function preguntasDe(datos: DatosEjercicio, titulo: string): Pregunta[] {
  switch (datos.tipo) {
    case 'productividad':
      return preguntasProductividad({ ...datos, titulo, periodo: '' });
    case 'equilibrio':
      return datos.modo === 'simple'
        ? preguntasEquilibrio({ ...datos, titulo })
        : preguntasEquilibrioMultiproducto({
            titulo,
            moneda: datos.moneda,
            costosFijos: datos.costosFijos,
            baseMezcla: datos.baseMezcla,
            productos: datos.productos.map((x) => ({ ...x })),
          });
    case 'cpm':
      return preguntasCPM({ ...datos, titulo });
    case 'pert':
      return datos.modo === 'red' && datos.plazoConsulta !== null
        ? preguntasPERT({ ...datos, titulo }, datos.plazoConsulta)
        : [];
    case 'grafico':
      return preguntasGrafico({ ...datos, titulo });
    case 'simplex':
      return preguntasSimplex({ ...datos, titulo });
    case 'asignacion':
      return preguntasAsignacion({ ...datos, titulo });
    case 'transporte':
      return preguntasTransporte({ ...datos, titulo });
    case 'inventarios':
      return preguntasInventarios({ ...datos, titulo });
    case 'colas':
      return preguntasColas({ ...datos, titulo });
    default:
      return [];
  }
}
