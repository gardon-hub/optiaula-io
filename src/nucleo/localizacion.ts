/**
 * Módulo 3 — Decisiones de localización.
 *
 * Tres métodos que responden preguntas distintas:
 *  · Puntaje ponderado: compara sitios por factores cualitativos ponderados.
 *  · Carga-distancia: compara sitios por el esfuerzo logístico que generan.
 *  · Centro de gravedad: no compara, *propone* un punto de partida.
 */

import { dividirSeguro, formatearNumero, sumaExacta } from './numero';
import {
  ConstructorPasos,
  aviso,
  distancia,
  error,
  hayErrores,
  nota,
  resultadoFallido,
  type Diagnostico,
  type Punto,
  type Resultado,
  type TipoDistancia,
} from './tipos';

// ───────────────────────────── Puntaje ponderado ─────────────────────────────

export interface FactorLocalizacion {
  readonly id: string;
  readonly nombre: string;
  /** Ponderación del factor. Se normaliza si el total no suma 100. */
  readonly ponderacion: number;
}

export interface SitioCandidato {
  readonly id: string;
  readonly nombre: string;
  /** Calificación por factor, indexada por `FactorLocalizacion.id`. */
  readonly calificaciones: Readonly<Record<string, number>>;
  /** Coordenadas en la cuadrícula, si el sitio participa en carga-distancia. */
  readonly punto?: Punto;
}

export interface DatosPuntajePonderado {
  readonly titulo: string;
  readonly factores: readonly FactorLocalizacion[];
  readonly sitios: readonly SitioCandidato[];
  /** Escala de calificación, normalmente 1 a 5. */
  readonly escalaMinima: number;
  readonly escalaMaxima: number;
}

export interface PuntajeSitio {
  readonly sitio: SitioCandidato;
  readonly desglose: readonly {
    readonly factor: FactorLocalizacion;
    readonly calificacion: number;
    readonly aporte: number;
    /** Porcentaje del puntaje final que aporta este factor. */
    readonly participacion: number | null;
  }[];
  readonly puntaje: number;
  /** Puntaje llevado a escala 0–100 sobre el máximo alcanzable. */
  readonly puntajeNormalizado: number | null;
}

export interface ResultadoPuntajePonderado {
  readonly puntajes: readonly PuntajeSitio[];
  readonly ganador: PuntajeSitio | null;
  readonly empate: boolean;
  readonly sumaPonderaciones: number;
  readonly puntajeMaximoPosible: number;
}

function validarPuntaje(datos: DatosPuntajePonderado): Diagnostico[] {
  const d: Diagnostico[] = [];

  if (datos.factores.length === 0) d.push(error('LOC_SIN_FACTORES', 'No se definió ningún factor de localización.'));
  if (datos.sitios.length === 0) d.push(error('LOC_SIN_SITIOS', 'No hay sitios candidatos que comparar.'));
  if (datos.escalaMaxima <= datos.escalaMinima) {
    d.push(error('LOC_ESCALA_INVALIDA', 'La escala de calificación es inválida: el máximo debe superar al mínimo.'));
  }

  for (const f of datos.factores) {
    if (f.ponderacion < 0) d.push(error('LOC_PONDERACION_NEGATIVA', `El factor "${f.nombre}" tiene ponderación negativa.`, f.id));
  }

  const suma = sumaExacta(datos.factores.map((f) => f.ponderacion));
  if (suma === 0) {
    d.push(error('LOC_PONDERACION_CERO', 'Las ponderaciones suman cero: no se puede calcular un puntaje ponderado.'));
  } else if (Math.abs(suma - 100) > 0.005) {
    d.push(
      aviso(
        'LOC_PONDERACION_NO_100',
        `Las ponderaciones suman ${formatearNumero(suma)} en lugar de 100. Se normalizan para que el puntaje siga siendo comparable entre sitios.`,
      ),
    );
  }

  for (const s of datos.sitios) {
    for (const f of datos.factores) {
      const c = s.calificaciones[f.id];
      if (c === undefined) {
        d.push(error('LOC_CALIFICACION_FALTANTE', `Falta la calificación de "${s.nombre}" en el factor "${f.nombre}".`, `${s.id}:${f.id}`));
      } else if (c < datos.escalaMinima || c > datos.escalaMaxima) {
        d.push(
          aviso(
            'LOC_CALIFICACION_FUERA',
            `La calificación de "${s.nombre}" en "${f.nombre}" (${c}) está fuera de la escala ${datos.escalaMinima}–${datos.escalaMaxima}.`,
            `${s.id}:${f.id}`,
          ),
        );
      }
    }
  }

  return d;
}

export function resolverPuntajePonderado(
  datos: DatosPuntajePonderado,
): Resultado<ResultadoPuntajePonderado> {
  const diagnosticos = validarPuntaje(datos);
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const sumaPonderaciones = sumaExacta(datos.factores.map((f) => f.ponderacion));
  const factorNormalizacion = 100 / sumaPonderaciones;
  const puntajeMaximoPosible = 100 * datos.escalaMaxima;

  const puntajes: PuntajeSitio[] = datos.sitios.map((sitio) => {
    const desglose = datos.factores.map((factor) => {
      const calificacion = sitio.calificaciones[factor.id] ?? 0;
      const ponderacionNormalizada = factor.ponderacion * factorNormalizacion;
      return { factor, calificacion, aporte: ponderacionNormalizada * calificacion, participacion: null as number | null };
    });
    const puntaje = sumaExacta(desglose.map((x) => x.aporte));
    return {
      sitio,
      desglose: desglose.map((x) => ({ ...x, participacion: dividirSeguro(x.aporte * 100, puntaje) })),
      puntaje,
      puntajeNormalizado: dividirSeguro(puntaje * 100, puntajeMaximoPosible),
    };
  });

  const ordenados = [...puntajes].sort((a, b) => b.puntaje - a.puntaje);
  const ganador = ordenados[0] ?? null;
  const empate =
    ordenados.length > 1 && ganador !== null && Math.abs(ordenados[1]!.puntaje - ganador.puntaje) < 0.005;

  if (empate) {
    diagnosticos.push(
      aviso(
        'LOC_EMPATE',
        'Dos o más sitios alcanzan el mismo puntaje. El método no basta para decidir: hay que agregar un factor de desempate o usar carga-distancia.',
      ),
    );
  }

  const margen =
    ordenados.length > 1 && ganador !== null ? ganador.puntaje - ordenados[1]!.puntaje : null;
  if (margen !== null && margen > 0 && margen / Math.max(1, ganador!.puntaje) < 0.05) {
    diagnosticos.push(
      nota(
        'LOC_MARGEN_ESTRECHO',
        `La diferencia entre el primero y el segundo es de apenas ${formatearNumero(margen)} puntos. Conviene un análisis de sensibilidad: un cambio pequeño en las ponderaciones podría invertir la decisión.`,
      ),
    );
  }

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Revisar las ponderaciones',
    explicacion:
      Math.abs(sumaPonderaciones - 100) < 0.005
        ? 'Las ponderaciones suman 100, así que el puntaje se lee directamente sobre esa base.'
        : `Las ponderaciones suman ${formatearNumero(sumaPonderaciones)}. Se multiplican por ${formatearNumero(factorNormalizacion, { decimales: 4 })} para llevarlas a base 100, de modo que los puntajes de distintos sitios sean comparables.`,
    tabla: {
      encabezados: ['Factor', 'Ponderación original', 'Ponderación normalizada'],
      filas: datos.factores.map((f) => [
        f.nombre,
        formatearNumero(f.ponderacion, { decimales: 1 }),
        formatearNumero(f.ponderacion * factorNormalizacion, { decimales: 2 }),
      ]),
      pie: ['Total', formatearNumero(sumaPonderaciones, { decimales: 1 }), '100,00'],
    },
  });

  for (const p of puntajes) {
    pasos.agregar({
      titulo: `Calcular el puntaje ponderado de ${p.sitio.nombre}`,
      explicacion:
        'Cada calificación se multiplica por la ponderación de su factor. La suma de esos productos es el puntaje del sitio: ' +
        'un solo número que resume qué tan bien responde el sitio a lo que la organización considera importante.',
      formula: 'PP = \\sum_{i=1}^{n} w_i \\times c_i',
      tabla: {
        encabezados: ['Factor', 'Ponderación', 'Calificación', 'Aporte', 'Participación'],
        filas: p.desglose.map((x) => [
          x.factor.nombre,
          formatearNumero(x.factor.ponderacion * factorNormalizacion, { decimales: 2 }),
          formatearNumero(x.calificacion, { decimales: 1 }),
          formatearNumero(x.aporte, { decimales: 2 }),
          x.participacion === null ? '—' : `${formatearNumero(x.participacion, { decimales: 1 })} %`,
        ]),
        pie: ['Total', '100,00', '', formatearNumero(p.puntaje, { decimales: 2 }), '100,0 %'],
      },
      valor: p.puntaje,
      unidad: 'puntos',
    });
  }

  pasos.agregar({
    titulo: 'Comparar los sitios',
    explicacion:
      'El sitio con mayor puntaje es el preferido bajo este conjunto de ponderaciones. El puntaje no es una verdad absoluta: ' +
      'depende de qué factores se eligieron y cuánto pesa cada uno.',
    tabla: {
      encabezados: ['Posición', 'Sitio', 'Puntaje', 'Sobre el máximo posible'],
      filas: ordenados.map((p, i) => [
        String(i + 1),
        p.sitio.nombre,
        formatearNumero(p.puntaje, { decimales: 2 }),
        p.puntajeNormalizado === null ? '—' : `${formatearNumero(p.puntajeNormalizado, { decimales: 1 })} %`,
      ]),
      resaltadas: [0],
    },
  });

  return {
    datos: { puntajes, ganador, empate, sumaPonderaciones, puntajeMaximoPosible },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      ganador === null
        ? 'No hay sitios que comparar.'
        : `${ganador.sitio.nombre} obtiene el puntaje más alto (${formatearNumero(ganador.puntaje, { decimales: 2 })} puntos` +
          (ganador.puntajeNormalizado !== null
            ? `, ${formatearNumero(ganador.puntajeNormalizado, { decimales: 1 })} % del máximo alcanzable`
            : '') +
          `). Su ventaja proviene sobre todo de ${masFuerte(ganador)}. ` +
          (empate
            ? 'Sin embargo hay empate técnico en la primera posición: el método por sí solo no resuelve la decisión.'
            : margen !== null
              ? `Aventaja al segundo lugar por ${formatearNumero(margen, { decimales: 2 })} puntos.`
              : ''),
  };
}

function masFuerte(p: PuntajeSitio): string {
  const top = [...p.desglose].sort((a, b) => b.aporte - a.aporte).slice(0, 2);
  return top.map((x) => x.factor.nombre.toLowerCase()).join(' y ');
}

// ───────────────────────────── Carga-distancia ─────────────────────────────

export interface PuntoCarga {
  readonly id: string;
  readonly nombre: string;
  readonly punto: Punto;
  /** Carga: población, demanda, viajes, toneladas… lo que se mueve. */
  readonly carga: number;
}

export interface DatosCargaDistancia {
  readonly titulo: string;
  readonly puntos: readonly PuntoCarga[];
  readonly candidatos: readonly SitioCandidato[];
  readonly tipoDistancia: TipoDistancia;
  readonly unidadCarga: string;
  readonly unidadDistancia: string;
}

export interface EvaluacionCandidato {
  readonly sitio: SitioCandidato;
  readonly detalle: readonly {
    readonly punto: PuntoCarga;
    readonly distancia: number;
    readonly cargaDistancia: number;
  }[];
  readonly total: number;
  /** Distancia media ponderada por la carga. */
  readonly distanciaMediaPonderada: number | null;
}

export interface ResultadoCargaDistancia {
  readonly evaluaciones: readonly EvaluacionCandidato[];
  readonly mejor: EvaluacionCandidato | null;
  readonly cargaTotal: number;
}

export function resolverCargaDistancia(
  datos: DatosCargaDistancia,
): Resultado<ResultadoCargaDistancia> {
  const diagnosticos: Diagnostico[] = [];

  if (datos.puntos.length === 0) {
    diagnosticos.push(error('CD_SIN_PUNTOS', 'No hay puntos de demanda que atender.'));
  }
  const sinPunto = datos.candidatos.filter((c) => c.punto === undefined);
  for (const c of sinPunto) {
    diagnosticos.push(error('CD_SIN_COORDENADAS', `El sitio candidato "${c.nombre}" no tiene coordenadas asignadas.`, c.id));
  }
  for (const p of datos.puntos) {
    if (p.carga < 0) diagnosticos.push(error('CD_CARGA_NEGATIVA', `El punto "${p.nombre}" tiene carga negativa.`, p.id));
  }
  if (datos.candidatos.length === 0) {
    diagnosticos.push(error('CD_SIN_CANDIDATOS', 'No hay localizaciones candidatas que evaluar.'));
  }
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const cargaTotal = sumaExacta(datos.puntos.map((p) => p.carga));

  const evaluaciones: EvaluacionCandidato[] = datos.candidatos.map((sitio) => {
    const detalle = datos.puntos.map((p) => {
      const d = distancia(p.punto, sitio.punto!, datos.tipoDistancia);
      return { punto: p, distancia: d, cargaDistancia: p.carga * d };
    });
    const total = sumaExacta(detalle.map((x) => x.cargaDistancia));
    return { sitio, detalle, total, distanciaMediaPonderada: dividirSeguro(total, cargaTotal) };
  });

  const ordenadas = [...evaluaciones].sort((a, b) => a.total - b.total);
  const mejor = ordenadas[0] ?? null;

  if (ordenadas.length > 1 && mejor && Math.abs(ordenadas[1]!.total - mejor.total) < 1e-9) {
    diagnosticos.push(
      aviso('CD_EMPATE', 'Dos candidatos generan exactamente el mismo puntaje carga-distancia. El criterio logístico no los distingue.'),
    );
  }

  diagnosticos.push(
    nota(
      'CD_TIPO_DISTANCIA',
      datos.tipoDistancia === 'rectilinea'
        ? 'Se usa distancia rectilínea (Manhattan): supone desplazamiento por una retícula de calles, no en línea recta. Es la métrica adecuada en ciudades y en plantas con pasillos ortogonales.'
        : 'Se usa distancia euclidiana: supone desplazamiento en línea recta. Es adecuada para transporte aéreo, tuberías o zonas rurales sin retícula vial.',
    ),
  );

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Registrar cargas y coordenadas',
    explicacion:
      'Cada punto de demanda aporta una carga: cuántas personas, toneladas o viajes representa. La carga es el peso que ese punto tiene en la decisión.',
    tabla: {
      encabezados: ['Punto', 'Coordenadas (x, y)', `Carga (${datos.unidadCarga})`],
      filas: datos.puntos.map((p) => [
        p.nombre,
        `(${formatearNumero(p.punto.x, { decimales: 1 })}; ${formatearNumero(p.punto.y, { decimales: 1 })})`,
        formatearNumero(p.carga, { decimales: 0 }),
      ]),
      pie: ['Total', '', formatearNumero(cargaTotal, { decimales: 0 })],
    },
  });

  for (const e of evaluaciones) {
    pasos.agregar({
      titulo: `Evaluar la localización ${e.sitio.nombre}`,
      explicacion:
        `Se mide la distancia de cada punto de demanda al sitio y se multiplica por su carga. ` +
        'La suma es el puntaje carga-distancia: el esfuerzo logístico total que impondría esta localización. Menor es mejor.',
      formula:
        datos.tipoDistancia === 'rectilinea'
          ? 'CD = \\sum_i l_i \\left( |x_i - x_s| + |y_i - y_s| \\right)'
          : 'CD = \\sum_i l_i \\sqrt{(x_i - x_s)^2 + (y_i - y_s)^2}',
      tabla: {
        encabezados: ['Punto', `Carga (${datos.unidadCarga})`, `Distancia (${datos.unidadDistancia})`, 'Carga × distancia'],
        filas: e.detalle.map((x) => [
          x.punto.nombre,
          formatearNumero(x.punto.carga, { decimales: 0 }),
          formatearNumero(x.distancia, { decimales: 2 }),
          formatearNumero(x.cargaDistancia, { decimales: 2 }),
        ]),
        pie: ['Total', formatearNumero(cargaTotal, { decimales: 0 }), '', formatearNumero(e.total, { decimales: 2 })],
      },
      valor: e.total,
      unidad: `${datos.unidadCarga}·${datos.unidadDistancia}`,
    });
  }

  pasos.agregar({
    titulo: 'Elegir la localización',
    explicacion:
      'Se prefiere el menor puntaje carga-distancia porque representa menos kilómetros recorridos por unidad transportada, ' +
      'y por lo tanto menos combustible, menos tiempo y menos desgaste.',
    tabla: {
      encabezados: ['Posición', 'Localización', 'Puntaje CD', 'Distancia media ponderada'],
      filas: ordenadas.map((e, i) => [
        String(i + 1),
        e.sitio.nombre,
        formatearNumero(e.total, { decimales: 2 }),
        e.distanciaMediaPonderada === null ? '—' : `${formatearNumero(e.distanciaMediaPonderada, { decimales: 2 })} ${datos.unidadDistancia}`,
      ]),
      resaltadas: [0],
    },
  });

  const peor = ordenadas.at(-1);
  const ahorro = mejor && peor && peor !== mejor ? peor.total - mejor.total : null;

  return {
    datos: { evaluaciones, mejor, cargaTotal },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      mejor === null
        ? 'No hay candidatos que evaluar.'
        : `${mejor.sitio.nombre} minimiza el esfuerzo logístico con un puntaje de ${formatearNumero(mejor.total, { decimales: 2 })} ${datos.unidadCarga}·${datos.unidadDistancia}. ` +
          (mejor.distanciaMediaPonderada !== null
            ? `Cada unidad de carga recorrería en promedio ${formatearNumero(mejor.distanciaMediaPonderada, { decimales: 2 })} ${datos.unidadDistancia}. `
            : '') +
          (ahorro !== null && ahorro > 0
            ? `Frente a la peor alternativa evaluada, ahorra ${formatearNumero(ahorro, { decimales: 2 })} unidades carga-distancia, una diferencia que se traduce directamente en combustible y horas de transporte. `
            : '') +
          'Recuerde que este método solo mira la proximidad: no dice nada sobre el precio del terreno, el acceso a agua o la bioseguridad. Combínelo con el puntaje ponderado.',
  };
}

// ───────────────────────────── Centro de gravedad ─────────────────────────────

export interface ResultadoCentroGravedad {
  readonly centro: Punto;
  readonly sumaCargas: number;
  readonly sumaCargaX: number;
  readonly sumaCargaY: number;
  readonly detalle: readonly {
    readonly punto: PuntoCarga;
    readonly cargaX: number;
    readonly cargaY: number;
  }[];
  /** Puntaje carga-distancia que tendría una instalación en el centro. */
  readonly cargaDistanciaEnCentro: number;
}

export function resolverCentroGravedad(
  puntos: readonly PuntoCarga[],
  tipoDistancia: TipoDistancia = 'rectilinea',
): Resultado<ResultadoCentroGravedad> {
  const diagnosticos: Diagnostico[] = [];

  if (puntos.length === 0) {
    return resultadoFallido([error('CG_SIN_PUNTOS', 'No hay puntos de demanda: el centro de gravedad no está definido.')]);
  }
  for (const p of puntos) {
    if (p.carga < 0) diagnosticos.push(error('CG_CARGA_NEGATIVA', `El punto "${p.nombre}" tiene carga negativa.`, p.id));
  }
  if (hayErrores(diagnosticos)) return resultadoFallido(diagnosticos);

  const sumaCargas = sumaExacta(puntos.map((p) => p.carga));
  if (sumaCargas === 0) {
    return resultadoFallido([
      error('CG_CARGA_TOTAL_CERO', 'La carga total es cero: no hay demanda que ponderar y el centro de gravedad no existe.'),
    ]);
  }

  const detalle = puntos.map((p) => ({ punto: p, cargaX: p.carga * p.punto.x, cargaY: p.carga * p.punto.y }));
  const sumaCargaX = sumaExacta(detalle.map((d) => d.cargaX));
  const sumaCargaY = sumaExacta(detalle.map((d) => d.cargaY));
  const centro: Punto = { x: sumaCargaX / sumaCargas, y: sumaCargaY / sumaCargas };

  const cargaDistanciaEnCentro = sumaExacta(puntos.map((p) => p.carga * distancia(p.punto, centro, tipoDistancia)));

  diagnosticos.push(
    nota(
      'CG_NO_ES_OPTIMO',
      'El centro de gravedad minimiza la suma de distancias euclidianas *al cuadrado*, no la suma de distancias. ' +
        'Por eso es un excelente punto de partida, pero no necesariamente la mejor localización: siempre hay que evaluarlo con carga-distancia frente a sitios reales y disponibles.',
    ),
  );

  const pasos = new ConstructorPasos();

  pasos.agregar({
    titulo: 'Multiplicar cada coordenada por su carga',
    explicacion:
      'El centro de gravedad es un promedio ponderado: cada punto tira del resultado con una fuerza proporcional a su carga. ' +
      'Una comunidad con 200 productores pesa el doble que una con 100.',
    formula: 'l_i x_i \\qquad l_i y_i',
    tabla: {
      encabezados: ['Punto', 'x', 'y', 'Carga (l)', 'l · x', 'l · y'],
      filas: detalle.map((d) => [
        d.punto.nombre,
        formatearNumero(d.punto.punto.x, { decimales: 2 }),
        formatearNumero(d.punto.punto.y, { decimales: 2 }),
        formatearNumero(d.punto.carga, { decimales: 0 }),
        formatearNumero(d.cargaX, { decimales: 2 }),
        formatearNumero(d.cargaY, { decimales: 2 }),
      ]),
      pie: [
        'Totales',
        '',
        '',
        formatearNumero(sumaCargas, { decimales: 0 }),
        formatearNumero(sumaCargaX, { decimales: 2 }),
        formatearNumero(sumaCargaY, { decimales: 2 }),
      ],
    },
  });

  pasos.agregar({
    titulo: 'Dividir entre la carga total',
    explicacion:
      'Dividir cada suma ponderada entre la carga total devuelve el punto de equilibrio geográfico de la demanda: ' +
      'el lugar donde, si se colgara un mapa por ese punto, quedaría balanceado.',
    formula: 'x^* = \\frac{\\sum l_i x_i}{\\sum l_i} \\qquad y^* = \\frac{\\sum l_i y_i}{\\sum l_i}',
    tabla: {
      encabezados: ['Coordenada', 'Numerador', 'Denominador', 'Resultado'],
      filas: [
        ['x*', formatearNumero(sumaCargaX, { decimales: 2 }), formatearNumero(sumaCargas, { decimales: 0 }), formatearNumero(centro.x, { decimales: 2 })],
        ['y*', formatearNumero(sumaCargaY, { decimales: 2 }), formatearNumero(sumaCargas, { decimales: 0 }), formatearNumero(centro.y, { decimales: 2 })],
      ],
    },
  });

  return {
    datos: { centro, sumaCargas, sumaCargaX, sumaCargaY, detalle, cargaDistanciaEnCentro },
    pasos: pasos.listar(),
    diagnosticos,
    interpretacion:
      `El centro de gravedad de la demanda está en (${formatearNumero(centro.x, { decimales: 2 })}; ${formatearNumero(centro.y, { decimales: 2 })}). ` +
      `Una instalación ubicada exactamente ahí generaría un puntaje carga-distancia de ${formatearNumero(cargaDistanciaEnCentro, { decimales: 2 })}. ` +
      'Ese número es la vara de medir: cualquier sitio real que se evalúe debe compararse contra él. ' +
      'Si un terreno disponible queda cerca del centro y además es barato y tiene agua, la decisión se vuelve fácil; ' +
      'si el centro cae en una zona sin acceso vial, el método ya cumplió su función: le dijo hacia dónde mirar.',
  };
}

// ───────────────────────────── Sensibilidad de ponderaciones ─────────────────────────────

export interface PuntoSensibilidad {
  readonly ponderacion: number;
  readonly puntajes: Readonly<Record<string, number>>;
  readonly ganadorId: string;
}

/**
 * Barre la ponderación de un factor de 0 a 100 (redistribuyendo el resto
 * proporcionalmente) y registra quién gana en cada escenario. Responde a
 * «¿cuánto tendría que cambiar de opinión la junta directiva para que gane
 * el otro sitio?».
 */
export function sensibilidadPonderacion(
  datos: DatosPuntajePonderado,
  factorId: string,
  pasos = 21,
): readonly PuntoSensibilidad[] {
  const objetivo = datos.factores.find((f) => f.id === factorId);
  if (!objetivo || datos.sitios.length === 0) return [];

  const otros = datos.factores.filter((f) => f.id !== factorId);
  const sumaOtros = sumaExacta(otros.map((f) => f.ponderacion));
  const salida: PuntoSensibilidad[] = [];

  for (let k = 0; k < pasos; k++) {
    const w = (100 * k) / (pasos - 1);
    const factorResto = sumaOtros === 0 ? 0 : (100 - w) / sumaOtros;

    const puntajes: Record<string, number> = {};
    for (const s of datos.sitios) {
      const aportes = datos.factores.map((f) => {
        const c = s.calificaciones[f.id] ?? 0;
        const peso = f.id === factorId ? w : f.ponderacion * factorResto;
        return peso * c;
      });
      puntajes[s.id] = sumaExacta(aportes);
    }

    const ganadorId = Object.entries(puntajes).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    salida.push({ ponderacion: w, puntajes, ganadorId });
  }

  return salida;
}
