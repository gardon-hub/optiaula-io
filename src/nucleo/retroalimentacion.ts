/**
 * Motor de retroalimentación determinista.
 *
 * No usa ninguna API de inteligencia artificial. Funciona por reglas: compara
 * la respuesta del estudiante con la correcta dentro de una tolerancia, y
 * cuando falla busca si el valor coincide con alguno de los errores típicos
 * del tema. Si coincide, explica exactamente qué se hizo mal en vez de decir
 * «incorrecto».
 *
 * La arquitectura para un asistente de IA opcional está en
 * `asistenteOpcional.ts`, desactivada por defecto.
 */

import type { Ejercicio, Pregunta } from '@/esquemas';
import { formatearNumero, sumaExacta } from './numero';
import { resolverCPM } from './cpm';
import { admiteCompresion, resolverCrashing } from './crashing';
import { resolverInventarios } from './inventarios';
import { compararServidores, resolverColas, servidoresMinimos } from './colas';
import { resolverPERT, varianzaActividad } from './pert';
import { resolverAsignacion } from './asignacion';
import { resolverTransporte } from './transporte';
import { resolverProductividad } from './productividad';
import { resolverEquilibrioMultiproducto } from './equilibrio';
import { analizarSensibilidad, resolverGrafico } from './grafico';
import { resolverSimplex, resumenColumnas } from './simplex';
import { analizarSensibilidadSimplex } from './sensibilidadSimplex';
import { aNumero } from './racional';

export type Veredicto = 'correcta' | 'cerca' | 'incorrecta' | 'sin_responder' | 'no_calificable';

export interface Evaluacion {
  readonly veredicto: Veredicto;
  readonly correcta: boolean;
  readonly puntosObtenidos: number;
  /** Mensaje dirigido al estudiante. Explica el error, no solo lo señala. */
  readonly mensaje: string;
  /** Código del error típico detectado, si lo hubo. */
  readonly codigoError: string | null;
  /** Diferencia relativa respecto de la respuesta correcta. */
  readonly desviacion: number | null;
}

export interface OpcionesEvaluacion {
  readonly tolerancia: number;
  readonly toleranciaRelativa: boolean;
  /** Penalización por cada pista consultada, entre 0 y 1. */
  readonly penalizacionPorPista: number;
  readonly pistasUsadas: number;
}

const OPCIONES_POR_DEFECTO: OpcionesEvaluacion = {
  tolerancia: 0.01,
  toleranciaRelativa: true,
  penalizacionPorPista: 0.15,
  pistasUsadas: 0,
};

function dentroDeTolerancia(valor: number, esperado: number, opciones: OpcionesEvaluacion): boolean {
  const diferencia = Math.abs(valor - esperado);
  if (!opciones.toleranciaRelativa) return diferencia <= opciones.tolerancia;
  const escala = Math.max(1e-9, Math.abs(esperado));
  return diferencia / escala <= opciones.tolerancia;
}

/**
 * Evalúa una respuesta. Las preguntas de interpretación no se califican
 * automáticamente: se marcan para revisión del docente, porque calificar una
 * explicación con reglas produciría falsos negativos.
 */
export function evaluarRespuesta(
  ejercicio: Ejercicio,
  pregunta: Pregunta,
  valor: number | string | null,
  opciones: Partial<OpcionesEvaluacion> = {},
): Evaluacion {
  const op = { ...OPCIONES_POR_DEFECTO, ...opciones };
  const penalizacion = Math.max(0, 1 - op.penalizacionPorPista * op.pistasUsadas);

  if (valor === null || valor === '') {
    return {
      veredicto: 'sin_responder',
      correcta: false,
      puntosObtenidos: 0,
      mensaje: 'No respondió esta pregunta.',
      codigoError: null,
      desviacion: null,
    };
  }

  if (pregunta.tipo === 'interpretacion' || pregunta.respuesta === null) {
    return {
      veredicto: 'no_calificable',
      correcta: false,
      puntosObtenidos: 0,
      mensaje:
        pregunta.tipo === 'interpretacion'
          ? 'Esta respuesta requiere lectura del docente: una interpretación gerencial no se puede calificar con una regla numérica.'
          : 'Esta pregunta no tiene respuesta de referencia registrada.',
      codigoError: null,
      desviacion: null,
    };
  }

  // Preguntas de texto y de selección: comparación normalizada.
  if (typeof pregunta.respuesta === 'string') {
    const normal = (s: string): string =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const esperadas = pregunta.respuesta.split(';').map((x) => normal(x));
    const dada = normal(String(valor));
    const acierta = esperadas.every((e) => dada.includes(e)) || esperadas.some((e) => e === dada);

    if (acierta) {
      return {
        veredicto: 'correcta',
        correcta: true,
        puntosObtenidos: pregunta.puntos * penalizacion,
        mensaje: 'Correcto.',
        codigoError: null,
        desviacion: null,
      };
    }
    return {
      veredicto: 'incorrecta',
      correcta: false,
      puntosObtenidos: 0,
      mensaje: `La respuesta no coincide con la esperada. Revise el procedimiento paso a paso y compare cada etapa.`,
      codigoError: null,
      desviacion: null,
    };
  }

  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(numero)) {
    return {
      veredicto: 'incorrecta',
      correcta: false,
      puntosObtenidos: 0,
      mensaje: 'La respuesta no es un número válido. Use punto o coma decimal, sin separadores de miles.',
      codigoError: 'FORMATO_NUMERO',
      desviacion: null,
    };
  }

  const esperado = pregunta.respuesta;
  const desviacion = Math.abs(esperado) < 1e-9 ? Math.abs(numero) : Math.abs(numero - esperado) / Math.abs(esperado);

  if (dentroDeTolerancia(numero, esperado, { ...op, tolerancia: pregunta.tolerancia || op.tolerancia, toleranciaRelativa: pregunta.toleranciaRelativa })) {
    return {
      veredicto: 'correcta',
      correcta: true,
      puntosObtenidos: pregunta.puntos * penalizacion,
      mensaje:
        op.pistasUsadas > 0
          ? `Correcto. Usó ${op.pistasUsadas} pista(s), así que obtiene ${formatearNumero(penalizacion * 100, { decimales: 0 })} % del puntaje.`
          : 'Correcto.',
      codigoError: null,
      desviacion,
    };
  }

  // ¿Coincide con algún error típico del tema?
  const tipico = detectarErrorTipico(ejercicio, pregunta, numero);
  if (tipico !== null) {
    return {
      veredicto: 'incorrecta',
      correcta: false,
      puntosObtenidos: 0,
      mensaje: tipico.mensaje,
      codigoError: tipico.codigo,
      desviacion,
    };
  }

  // Errores de escala: factor 10, 100 o porcentaje mal expresado.
  const escala = detectarErrorDeEscala(numero, esperado);
  if (escala !== null) {
    return {
      veredicto: 'cerca',
      correcta: false,
      puntosObtenidos: 0,
      mensaje: escala.mensaje,
      codigoError: escala.codigo,
      desviacion,
    };
  }

  if (desviacion <= 0.05) {
    return {
      veredicto: 'cerca',
      correcta: false,
      puntosObtenidos: 0,
      mensaje:
        `Está cerca: se desvía ${formatearNumero(desviacion * 100, { decimales: 1 })} % del valor correcto. ` +
        'Lo más probable es que haya redondeado en un paso intermedio. Trabaje con todos los decimales y redondee solo al final.',
      codigoError: 'REDONDEO_INTERMEDIO',
      desviacion,
    };
  }

  return {
    veredicto: 'incorrecta',
    correcta: false,
    puntosObtenidos: 0,
    mensaje:
      'La respuesta está lejos del valor correcto. Use «Mostrar siguiente paso» para localizar dónde se separó del procedimiento.',
    codigoError: null,
    desviacion,
  };
}

function detectarErrorDeEscala(valor: number, esperado: number): { codigo: string; mensaje: string } | null {
  if (esperado === 0 || valor === 0) return null;
  const razon = valor / esperado;

  const casos: { factor: number; codigo: string; mensaje: string }[] = [
    { factor: 100, codigo: 'ESCALA_PORCENTAJE', mensaje: 'El valor es exactamente 100 veces el correcto: probablemente expresó como porcentaje algo que debía quedar como razón, o multiplicó por 100 de más.' },
    { factor: 0.01, codigo: 'ESCALA_RAZON', mensaje: 'El valor es exactamente la centésima parte del correcto: probablemente dejó una razón donde se pedía un porcentaje. Multiplique por 100.' },
    { factor: 10, codigo: 'ESCALA_DIEZ', mensaje: 'El valor es diez veces el correcto. Revise la posición del punto decimal en algún dato de entrada.' },
    { factor: 0.1, codigo: 'ESCALA_DECIMA', mensaje: 'El valor es la décima parte del correcto. Revise la posición del punto decimal en algún dato de entrada.' },
  ];

  for (const c of casos) {
    if (Math.abs(razon - c.factor) / c.factor < 0.005) return { codigo: c.codigo, mensaje: c.mensaje };
  }
  return null;
}

interface ErrorTipico {
  readonly codigo: string;
  readonly mensaje: string;
}

/**
 * Busca si la respuesta del estudiante coincide con el resultado de un error
 * conocido. Cada tema tiene sus trampas y todas están aquí.
 */
export function detectarErrorTipico(
  ejercicio: Ejercicio,
  pregunta: Pregunta,
  valor: number,
): ErrorTipico | null {
  const coincide = (candidato: number | null | undefined): boolean =>
    candidato !== null && candidato !== undefined && Number.isFinite(candidato) &&
    Math.abs(valor - candidato) <= Math.max(1e-6, Math.abs(candidato) * 0.01);

  const clave = pregunta.claveVerificacion;
  const datos = ejercicio.datos;

  // ── PERT: sumar desviaciones en lugar de varianzas ───────────────────────
  if (clave === 'pert.varianzaProyecto' && datos.tipo === 'pert' && datos.modo === 'red') {
    const r = resolverPERT({ titulo: ejercicio.titulo, actividades: datos.actividades, unidadTiempo: datos.unidadTiempo });
    if (r.datos) {
      const sumaDesviaciones = sumaExacta(
        r.datos.rutaEvaluada.map((id) => {
          const a = datos.actividades.find((x) => x.id === id);
          return a ? Math.sqrt(varianzaActividad(a.a, a.b)) : 0;
        }),
      );
      if (coincide(sumaDesviaciones)) {
        return {
          codigo: 'PERT_SUMA_DESVIACIONES',
          mensaje:
            'Sumó las desviaciones estándar. En PERT deben sumarse las **varianzas** de las actividades de la ruta evaluada, ' +
            'y solo al final se saca la raíz cuadrada para obtener la desviación estándar del proyecto. ' +
            'Las desviaciones no son aditivas; las varianzas de variables independientes sí lo son.',
        };
      }

      const todasLasVarianzas = sumaExacta(datos.actividades.map((a) => varianzaActividad(a.a, a.b)));
      if (coincide(todasLasVarianzas)) {
        return {
          codigo: 'PERT_TODAS_LAS_VARIANZAS',
          mensaje:
            'Sumó las varianzas de **todas** las actividades del proyecto. Solo se suman las de la ruta evaluada: ' +
            'las actividades con holgura pueden retrasarse sin mover la fecha final, así que su incertidumbre no cuenta.',
        };
      }
    }
  }

  if (clave === 'pert.probabilidad' && datos.tipo === 'pert') {
    // Confundir la cola: dar el complemento.
    if (coincide(100 - (pregunta.respuesta as number))) {
      return {
        codigo: 'PERT_COLA_INVERTIDA',
        mensaje:
          'Su valor es exactamente el complemento del correcto: leyó la cola equivocada de la distribución. ' +
          'Las tablas normales dan el área **a la izquierda** de Z. Para «probabilidad de terminar antes» se usa esa área ' +
          'directamente; para «probabilidad de exceder» hay que restarla de 1.',
      };
    }
  }

  if (clave === 'pert.duracionEsperada' && datos.tipo === 'pert' && datos.modo === 'red') {
    const sumaTodos = sumaExacta(datos.actividades.map((a) => (a.a + 4 * a.m + a.b) / 6));
    if (coincide(sumaTodos)) {
      return {
        codigo: 'PERT_SUMA_TODAS',
        mensaje:
          'Sumó los tiempos esperados de todas las actividades. La duración del proyecto es la de la **ruta crítica**, ' +
          'no la suma de todo: las actividades en paralelo ocurren al mismo tiempo, no una después de otra.',
      };
    }
    const promedioSimple = sumaExacta(datos.actividades.map((a) => (a.a + a.m + a.b) / 3));
    if (coincide(promedioSimple)) {
      return {
        codigo: 'PERT_PROMEDIO_SIMPLE',
        mensaje:
          'Usó el promedio simple de las tres estimaciones. PERT usa un promedio **ponderado** que da cuatro veces más ' +
          'peso al tiempo más probable: TE = (a + 4m + b) / 6.',
      };
    }
  }

  // ── CPM ───────────────────────────────────────────────────────────────────
  if (datos.tipo === 'cpm') {
    const r = resolverCPM({ titulo: ejercicio.titulo, actividades: datos.actividades, unidadTiempo: datos.unidadTiempo });

    if (clave === 'cpm.duracionProyecto' && r.datos) {
      const sumaTodas = sumaExacta(datos.actividades.map((a) => a.duracion));
      if (coincide(sumaTodas)) {
        return {
          codigo: 'CPM_SUMA_TODAS',
          mensaje:
            'Sumó la duración de todas las actividades. Eso daría la duración si el proyecto fuera puramente secuencial. ' +
            'Cuando hay actividades en paralelo, la duración es la de la ruta más larga, no la suma de todo.',
        };
      }

      // Error clásico: usar el mínimo en lugar del máximo al converger.
      const conMinimo = duracionConMinimo(datos.actividades);
      if (coincide(conMinimo)) {
        return {
          codigo: 'CPM_MINIMO_EN_CONVERGENCIA',
          mensaje:
            'Cuando una actividad tiene dos o más predecesoras, su inicio temprano depende de la **mayor** terminación ' +
            'temprana de ellas, no de la menor: hay que esperar a que todas terminen, y la que manda es la última. ' +
            'Parece que tomó el mínimo en algún punto de convergencia.',
        };
      }
    }

    if (clave === 'cpm.holgura' && r.datos) {
      const c = r.datos.calculadas.find((x) => Math.abs(x.holguraLibre - valor) < 1e-6 && Math.abs(x.holguraTotal - valor) > 1e-6);
      if (c) {
        return {
          codigo: 'CPM_HOLGURA_LIBRE',
          mensaje:
            `Calculó la holgura **libre** (${formatearNumero(c.holguraLibre, { decimales: 2 })}), que es cuánto puede ` +
            'demorarse la actividad sin atrasar a ninguna sucesora. Se pedía la holgura **total**: cuánto puede demorarse ' +
            'sin atrasar el proyecto completo. La total es IL − IT y siempre es mayor o igual que la libre.',
        };
      }
    }

    // ── Compresión del proyecto ─────────────────────────────────────────────
    const comprimibles = datos.actividades.map((a) => ({ ...a }));
    if (admiteCompresion(comprimibles)) {
      const cr = resolverCrashing({
        titulo: ejercicio.titulo,
        actividades: comprimibles,
        unidadTiempo: datos.unidadTiempo,
        costoIndirectoPorPeriodo: datos.costoIndirectoPorPeriodo,
        moneda: datos.moneda,
      }).datos;

      if (cr !== null) {
        const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';

        if (clave === 'crashing.pendiente') {
          // Dividir entre la duración normal en vez de entre los periodos que se
          // ganan: el error que hace parecer barato acortar una actividad larga.
          const porDuracion = cr.pendientes.find(
            (p) => p.duracionNormal > 0 && coincide((p.costoAcelerado - p.costoNormal) / p.duracionNormal),
          );
          if (porDuracion !== undefined) {
            return {
              codigo: 'CRASH_DIVIDE_DURACION',
              mensaje:
                'Dividió la diferencia de costo entre la **duración normal**. La pendiente se reparte entre los ' +
                'periodos que realmente se pueden ganar, que son la duración normal menos la acelerada: ' +
                `${formatearNumero(porDuracion.duracionNormal)} − ${formatearNumero(porDuracion.duracionAcelerada)} = ` +
                `${formatearNumero(porDuracion.periodosDisponibles)}.`,
            };
          }
          const soloDiferencia = cr.pendientes.find((p) => coincide(p.costoAcelerado - p.costoNormal));
          if (soloDiferencia !== undefined) {
            return {
              codigo: 'CRASH_SIN_DIVIDIR',
              mensaje:
                'Ese es el sobrecosto de acelerar la actividad **entera**, no el de ganar un periodo. La pendiente es ' +
                'un precio por periodo: hay que dividir entre los periodos que se ganan para poder comparar unas ' +
                'actividades con otras.',
            };
          }
        }

        if (clave === 'crashing.duracionOptima') {
          if (coincide(cr.duracionMinima) && cr.duracionMinima !== cr.duracionOptima) {
            return {
              codigo: 'CRASH_HASTA_EL_TOPE',
              mensaje:
                `Comprimió hasta el tope, ${formatearNumero(cr.duracionMinima)} ${datos.unidadTiempo}. Se puede, pero ` +
                'no conviene: los últimos periodos cuestan más de lo que ahorran en costo indirecto. Deje de acortar ' +
                'en cuanto la pendiente supere el costo indirecto por periodo.',
            };
          }
          if (coincide(cr.duracionNormal) && cr.duracionNormal !== cr.duracionOptima) {
            return {
              codigo: 'CRASH_NO_COMPRIME',
              mensaje:
                'Dejó el proyecto en su duración normal. Aquí sí conviene comprimir: hay actividades cuya pendiente ' +
                `es menor que los ${simbolo} ${formatearNumero(datos.costoIndirectoPorPeriodo)} de costo indirecto ` +
                'por periodo, así que cada uno de esos periodos ahorra más de lo que cuesta.',
            };
          }
        }

        if (clave === 'crashing.costoTotalOptimo') {
          const mejor = cr.curva.find((c) => c.duracion === cr.duracionOptima);
          if (mejor !== undefined && coincide(mejor.directo)) {
            return {
              codigo: 'CRASH_OLVIDA_INDIRECTO',
              mensaje:
                'Ese es solo el costo **directo**. El costo total suma también el indirecto, que es el que justifica ' +
                `comprimir: ${simbolo} ${formatearNumero(datos.costoIndirectoPorPeriodo)} por cada periodo que el ` +
                'proyecto siga abierto.',
            };
          }
          if (coincide(cr.costoTotalNormal)) {
            return {
              codigo: 'CRASH_COSTO_SIN_COMPRIMIR',
              mensaje:
                'Ese es el costo total con las duraciones normales, sin comprimir nada. Se pedía el costo en la ' +
                'duración que conviene, que es menor.',
            };
          }
        }
      }
    }
  }


  // ── Inventarios ───────────────────────────────────────────────────────────
  if (datos.tipo === 'inventarios') {
    const r = resolverInventarios({ ...datos, titulo: ejercicio.titulo });
    const inv = r.datos;

    if (inv !== null) {
      if (clave === 'inventarios.loteEconomico') {
        // Olvidar el 2 del numerador: el error de fórmula más común del tema.
        if (coincide(Math.sqrt((datos.demandaAnual * datos.costoOrdenar) / datos.costoConservar))) {
          return {
            codigo: 'INV_SIN_EL_DOS',
            mensaje:
              'Le faltó el 2 del numerador. La fórmula es Q = √(2·D·Co / Ch): ese 2 sale de que el inventario promedio ' +
              'es la mitad del lote, no el lote entero.',
          };
        }
        // Aplicar la fórmula del lote económico simple a un caso con
        // reabastecimiento uniforme: da menos de lo que conviene producir.
        if (datos.modelo === 'reabastecimiento_uniforme') {
          const global = Math.sqrt((2 * datos.demandaAnual * datos.costoOrdenar) / datos.costoConservar);
          if (coincide(global)) {
            return {
              codigo: 'INV_IGNORA_TASA',
              mensaje:
                'Usó la fórmula del abastecimiento global. Aquí el lote entra a la tasa de producción mientras la ' +
                'demanda ya consume, así que el inventario nunca llega a valer Q y conservar cuesta menos: hay que ' +
                'dividir Ch entre (1 − D/p), lo que da un lote **mayor**.',
            };
          }
        }
      }

      if (clave === 'inventarios.costoAnual') {
        const compra = datos.demandaAnual * datos.costoUnitario;
        if (compra > 0 && coincide(inv.costoAnualInventario + compra)) {
          return {
            codigo: 'INV_INCLUYE_COMPRA',
            mensaje:
              'Sumó el costo de comprar la mercadería del año. La compra es la misma sea cual sea el tamaño del lote, ' +
              'así que no cambia la decisión y no entra en el costo anual de inventario: el CAI solo suma ordenar y ' +
              'conservar.',
          };
        }
        if (coincide(inv.costoOrdenarAnual) || coincide(inv.costoConservarAnual)) {
          return {
            codigo: 'INV_SOLO_UN_COMPONENTE',
            mensaje:
              'Ese es solo uno de los dos componentes. El costo anual de inventario suma lo que cuesta ordenar **y** lo ' +
              'que cuesta conservar. En el lote económico los dos valen lo mismo, así que el total es el doble de ' +
              'cualquiera de ellos.',
          };
        }
      }

      if (clave === 'inventarios.puntoReorden') {
        // Multiplicar la demanda anual por los días de entrega sin convertirla
        // a diaria: es el error que la propia presentación advierte.
        if (coincide(datos.demandaAnual * datos.tiempoEntregaDias)) {
          return {
            codigo: 'INV_ESCALA_TIEMPO',
            mensaje:
              'Multiplicó la demanda **anual** por los días de entrega. La demanda y el tiempo de entrega tienen que ' +
              `estar en la misma escala: convierta primero a demanda diaria dividiendo entre ${formatearNumero(datos.diasPorAnio, { decimales: 0 })} días.`,
          };
        }
        const otroAnio = datos.diasPorAnio === 360 ? 365 : 360;
        if (coincide((datos.demandaAnual / otroAnio) * datos.tiempoEntregaDias)) {
          return {
            codigo: 'INV_ANIO_DISTINTO',
            mensaje:
              `Su cálculo usa un año de ${otroAnio} días y este ejercicio convierte con ${formatearNumero(datos.diasPorAnio, { decimales: 0 })}. ` +
              'El material no dice cuál usar; está registrado como inconsistencia I-16 y su docente puede cambiarlo.',
          };
        }
      }

      if (clave === 'inventarios.nivelObjetivo' && inv.intervaloAnios !== null) {
        // Cubrir solo el intervalo y olvidar el tiempo de entrega.
        if (coincide(datos.demandaAnual * inv.intervaloAnios)) {
          return {
            codigo: 'INV_M_SIN_ENTREGA',
            mensaje:
              'Calculó M cubriendo solo el intervalo entre revisiones. Lo que se pide hoy no llega hasta dentro de ' +
              `${formatearNumero(datos.tiempoEntregaDias)} días, así que M tiene que cubrir T **más** L. Con su valor, ` +
              'las existencias se acabarían justo antes de cada entrega.',
          };
        }
      }
    }
  }

  // ── Líneas de espera ──────────────────────────────────────────────────────
  if (datos.tipo === 'colas') {
    const r = resolverColas({ ...datos, titulo: ejercicio.titulo });
    const c = r.datos;

    if (c !== null) {
      if (clave === 'colas.utilizacion') {
        // No multiplicar la tasa de servicio por el número de servidores.
        if (datos.servidores > 1 && coincide((datos.tasaLlegadas / datos.tasaServicio) * 100)) {
          return {
            codigo: 'COLA_UTILIZACION_SIN_S',
            mensaje:
              `Dividió entre la tasa de servicio de un solo servidor. Con ${formatearNumero(datos.servidores, { decimales: 0 })} ` +
              'servidores la capacidad del sistema es s·μ, no μ: la fórmula es ρ = λ / (s·μ).',
          };
        }
      }

      if (clave === 'colas.enCola' && coincide(c.enSistema)) {
        return {
          codigo: 'COLA_CONFUNDE_L_LQ',
          mensaje:
            'Ese es L, los que están en el **sistema**, que incluye a los que ya están siendo atendidos. Se pedía Lq, ' +
            'los que están esperando: L = Lq + λ/μ.',
        };
      }

      if (clave === 'colas.tiempoCola' && coincide(c.tiempoSistema)) {
        return {
          codigo: 'COLA_CONFUNDE_W_WQ',
          mensaje:
            'Ese es W, el tiempo total en el sistema, que ya incluye el servicio. Se pedía Wq, solo la espera: ' +
            'W = Wq + 1/μ.',
        };
      }

      if (clave === 'colas.servidoresOptimos') {
        const opciones = compararServidores({ ...datos, titulo: ejercicio.titulo });
        const conMenosCola = opciones.at(-1);
        if (conMenosCola !== undefined && coincide(conMenosCola.servidores) && opciones.length > 1) {
          return {
            codigo: 'COLA_BUSCA_CERO',
            mensaje:
              'Eligió el número de servidores que casi elimina la cola. Eso siempre existe y siempre sale caro: la ' +
              'decisión está donde la **suma** del costo de esperar y el de atender toca fondo, no donde la espera ' +
              'desaparece.',
          };
        }
        const minimo = servidoresMinimos(datos.tasaLlegadas, datos.tasaServicio);
        if (coincide(minimo) && opciones[0]?.servidores === minimo && opciones.length > 1) {
          return {
            codigo: 'COLA_MINIMO_ESTABLE',
            mensaje:
              'Ese es el mínimo de servidores para que el sistema no se desborde, pero operar justo en ese límite deja ' +
              'la utilización altísima y la espera se dispara. Compare el costo total de esa opción con la siguiente.',
          };
        }
      }
    }
  }

  // ── Transporte ────────────────────────────────────────────────────────────
  if (datos.tipo === 'transporte') {
    const totalOferta = sumaExacta(datos.oferta);
    const totalDemanda = sumaExacta(datos.demanda);

    if (clave === 'transporte.balance' && Math.abs(totalOferta - totalDemanda) > 1e-9 && Math.abs(valor) < 1e-9) {
      return {
        codigo: 'TRANSPORTE_NO_BALANCEADO',
        mensaje:
          `La oferta total (${formatearNumero(totalOferta, { decimales: 0 })}) no coincide con la demanda total ` +
          `(${formatearNumero(totalDemanda, { decimales: 0 })}); primero debes balancear el problema. ` +
          `${totalOferta > totalDemanda ? 'Sobra oferta: agregue un destino ficticio' : 'Falta oferta: agregue un origen ficticio'} ` +
          'con costo cero antes de aplicar cualquier método.',
      };
    }

    if (clave === 'transporte.costoOptimo') {
      const conNoroeste = resolverTransporte({ ...datos, titulo: ejercicio.titulo }, 'noroeste');
      const conCostoMinimo = resolverTransporte({ ...datos, titulo: ejercicio.titulo }, 'costo_minimo');

      if (coincide(conNoroeste.datos?.solucionInicial.costoTotal)) {
        return {
          codigo: 'TRANSPORTE_INICIAL_NO_OPTIMA',
          mensaje:
            'Ese es el costo de la solución **inicial** por esquina noroeste, no el óptimo. La esquina noroeste ignora los ' +
            'costos: siempre hay que mejorarla con MODI hasta que todos los costos reducidos sean mayores o iguales a cero.',
        };
      }
      if (coincide(conCostoMinimo.datos?.solucionInicial.costoTotal)) {
        return {
          codigo: 'TRANSPORTE_COSTO_MINIMO_NO_OPTIMA',
          mensaje:
            'Ese es el costo de la solución inicial por costo mínimo. Es un buen punto de partida, pero no ' +
            'necesariamente el óptimo: verifique con MODI si queda algún costo reducido negativo.',
        };
      }
      if (Math.abs(totalOferta - totalDemanda) > 1e-9) {
        const sinBalancear = costoIgnorandoBalance(datos);
        if (coincide(sinBalancear)) {
          return {
            codigo: 'TRANSPORTE_SIN_BALANCEAR',
            mensaje:
              'Parece que resolvió sin balancear el problema. La oferta total no coincide con la demanda total: ' +
              'sin el origen o destino ficticio, el modelo no tiene solución factible y el costo resultante no significa nada.',
          };
        }
      }
    }
  }

  // ── Asignación ────────────────────────────────────────────────────────────
  if (datos.tipo === 'asignacion' && clave === 'asignacion.valorTotal') {
    // Elegir el mínimo de cada fila sin cuidar que las columnas no se repitan.
    const porFila = sumaExacta(
      datos.matriz.map((f) => {
        const validos = f.filter((v): v is number => v !== null);
        if (validos.length === 0) return 0;
        return datos.objetivo === 'minimizar' ? Math.min(...validos) : Math.max(...validos);
      }),
    );
    if (coincide(porFila)) {
      return {
        codigo: 'ASIGNACION_COLUMNA_REPETIDA',
        mensaje:
          `Tomó el ${datos.objetivo === 'minimizar' ? 'menor' : 'mayor'} valor de cada fila por separado. ` +
          'Seleccionaste dos asignaciones en la misma columna: cada tarea puede recibir un solo recurso. ' +
          'Ese es justamente el problema que el método húngaro resuelve, y por eso el óptimo casi nunca da a cada uno su mejor opción.',
      };
    }

    if (datos.objetivo === 'maximizar') {
      const comoMinimizacion = resolverAsignacion({ ...datos, titulo: ejercicio.titulo, objetivo: 'minimizar' });
      if (coincide(comoMinimizacion.datos?.valorTotal)) {
        return {
          codigo: 'ASIGNACION_SIN_CONVERTIR',
          mensaje:
            'Resolvió minimizando cuando el problema pide maximizar. Antes de aplicar el método húngaro hay que convertir ' +
            'la matriz de beneficios en una matriz de oportunidad perdida, restando cada valor del mayor de la matriz.',
        };
      }
    }
  }

  // ── Productividad ─────────────────────────────────────────────────────────
  if (datos.tipo === 'productividad') {
    const r = resolverProductividad({ ...datos, titulo: ejercicio.titulo, periodo: '' });

    if (clave === 'productividad.total' && r.datos) {
      const inversa = r.datos.total === null || r.datos.total === 0 ? null : 1 / r.datos.total;
      if (coincide(inversa)) {
        return {
          codigo: 'PRODUCTIVIDAD_INVERTIDA',
          mensaje:
            'Invirtió la razón: dividió el costo entre el valor de la producción. La productividad es siempre ' +
            '**salidas entre entradas**, es decir cuánto se obtiene por cada unidad invertida. Lo que usted calculó es el ' +
            'costo por unidad de producto, que también es útil pero es otra cosa.',
        };
      }

      const conProceso = resolverProductividad({ ...datos, titulo: ejercicio.titulo, periodo: '', tratamiento: 'incluir' });
      if (coincide(conProceso.datos?.total)) {
        return {
          codigo: 'PRODUCTIVIDAD_INCLUYE_PROCESO',
          mensaje:
            'Contó el inventario en proceso como si estuviera terminado. Con el tratamiento «excluir», que es el ' +
            'configurado en este ejercicio, solo cuenta la producción terminada. Puede cambiar el tratamiento en el ' +
            'laboratorio y ver cómo se mueve el resultado.',
        };
      }
    }

    if (clave === 'productividad.costoTotal' && r.datos && datos.costoTotalDeclarado !== null) {
      if (coincide(r.datos.costoSumado)) {
        return {
          codigo: 'PRODUCTIVIDAD_COSTO_ALTERNATIVO',
          mensaje:
            `Usó la suma de los componentes (${formatearNumero(r.datos.costoSumado)}) en lugar del costo total declarado ` +
            `en el enunciado (${formatearNumero(datos.costoTotalDeclarado)}). Este ejercicio tiene una inconsistencia ` +
            'registrada: ambos valores aparecen en el material. Consulte con su docente cuál es el válido.',
        };
      }
    }
  }

  // ── Punto de equilibrio ───────────────────────────────────────────────────
  if (datos.tipo === 'equilibrio' && datos.modo === 'simple') {
    const mc = datos.precioVenta - datos.costoVariableUnitario - (datos.comisionPorcentaje / 100) * datos.precioVenta;

    if (clave === 'equilibrio.puntoEquilibrioUnidades') {
      if (datos.comisionPorcentaje > 0) {
        const sinComision = datos.precioVenta - datos.costoVariableUnitario;
        if (sinComision > 0 && coincide((datos.costosFijos - datos.valorRecuperacion) / sinComision)) {
          return {
            codigo: 'EQUILIBRIO_SIN_COMISION',
            mensaje:
              'Olvidó incluir la comisión en el costo variable. La comisión se paga como porcentaje del ingreso, así que ' +
              'crece con cada unidad vendida: es costo variable, no fijo. Réstela del precio antes de calcular el margen.',
          };
        }
      }
      if (datos.valorRecuperacion > 0 && mc > 0 && coincide(datos.costosFijos / mc)) {
        return {
          codigo: 'EQUILIBRIO_SIN_RECUPERACION',
          mensaje:
            'No descontó el valor de recuperación de los costos fijos. Lo que la empresa recupera por subproductos ' +
            'reduce la carga fija que las ventas deben cubrir.',
        };
      }
      if (datos.precioVenta > 0 && coincide((datos.costosFijos - datos.valorRecuperacion) / datos.precioVenta)) {
        return {
          codigo: 'EQUILIBRIO_DIVIDE_PRECIO',
          mensaje:
            'Dividió los costos fijos entre el **precio**, no entre el margen de contribución. Cada unidad vendida no ' +
            'aporta su precio completo a los costos fijos: primero tiene que pagar su propio costo variable.',
        };
      }
    }

    if (clave === 'equilibrio.margenContribucion' && mc <= 0) {
      return {
        codigo: 'EQUILIBRIO_MARGEN_NEGATIVO',
        mensaje:
          'El margen de contribución es negativo; con estos datos no existe un punto de equilibrio alcanzable. ' +
          'Vender más aumenta la pérdida en lugar de reducirla.',
      };
    }
  }

  // ── Punto de equilibrio multiproducto ─────────────────────────────────────
  // El error caro del tema es resolver con la otra base de la mezcla. Da un
  // número plausible y bien calculado, así que sin este aviso el estudiante no
  // tiene forma de ver dónde se desvió.
  if (datos.tipo === 'equilibrio' && datos.modo === 'multiproducto' && datos.productos.length > 0) {
    const comun = {
      titulo: ejercicio.titulo,
      moneda: datos.moneda,
      costosFijos: datos.costosFijos,
      productos: datos.productos.map((x) => ({ ...x })),
    };
    const otraBase = datos.baseMezcla === 'unidades' ? 'ingresos' : 'unidades';
    const otro = resolverEquilibrioMultiproducto({ ...comun, baseMezcla: otraBase }).datos;

    const explicacionBase =
      datos.baseMezcla === 'unidades'
        ? 'La mezcla de este problema son **unidades vendidas**: hay que ponderar el margen de contribución por unidad ' +
          'y dividir los costos fijos entre ese promedio. Usted ponderó las razones de margen, que es el método para ' +
          'cuando la mezcla viene expresada en dinero.'
        : 'La mezcla de este problema es **participación en el ingreso**: hay que ponderar la razón de margen de cada ' +
          'producto. Usted ponderó los márgenes por unidad, que es el método para cuando la mezcla viene expresada en ' +
          'unidades vendidas.';

    if (otro !== null) {
      if (clave === 'equilibrio.unidadesEquilibrio' && coincide(otro.unidadesEquilibrio)) {
        return { codigo: 'EQM_BASE_CAMBIADA', mensaje: explicacionBase };
      }
      if (clave === 'equilibrio.ingresoEquilibrio' && coincide(otro.ingresoEquilibrio)) {
        return { codigo: 'EQM_BASE_CAMBIADA', mensaje: explicacionBase };
      }
      if (clave === 'equilibrio.unidadesProducto' && coincide(otro.detalle[0]?.unidadesEquilibrio)) {
        return { codigo: 'EQM_BASE_CAMBIADA', mensaje: explicacionBase };
      }
    }

    if (clave === 'equilibrio.margenPonderado') {
      const margenes = datos.productos.map((p) => p.precioVenta - p.costoVariableUnitario);
      if (coincide(sumaExacta(margenes) / margenes.length)) {
        return {
          codigo: 'EQM_PROMEDIO_SIN_PONDERAR',
          mensaje:
            'Promedió los márgenes sin ponderar por la mezcla. Un producto que representa el 5 % de las unidades no ' +
            'pesa igual que uno que representa el 50 %: multiplique cada margen por su participación antes de sumar.',
        };
      }
    }
  }

  // ── Método gráfico ────────────────────────────────────────────────────────
  if (datos.tipo === 'grafico') {
    const r = resolverGrafico({ ...datos, titulo: ejercicio.titulo });
    const g = r.datos;

    if (g !== null && g.vertices.length > 0) {
      const enEjes = g.vertices.filter((v) => v.activas.includes('eje-x') || v.activas.includes('eje-y'));
      const mejorEnEjes =
        enEjes.length === 0
          ? null
          : datos.objetivo === 'maximizar'
            ? Math.max(...enEjes.map((v) => v.valorObjetivo))
            : Math.min(...enEjes.map((v) => v.valorObjetivo));

      const peorVertice =
        datos.objetivo === 'maximizar'
          ? Math.min(...g.vertices.map((v) => v.valorObjetivo))
          : Math.max(...g.vertices.map((v) => v.valorObjetivo));

      if (clave === 'grafico.valorOptimo') {
        if (
          mejorEnEjes !== null &&
          g.valorOptimo !== null &&
          Math.abs(mejorEnEjes - g.valorOptimo) > 1e-6 &&
          coincide(mejorEnEjes)
        ) {
          return {
            codigo: 'GRAFICO_SOLO_EJES',
            mensaje:
              'Evaluó solo los vértices que caen sobre los ejes, es decir los planes que producen un único producto. ' +
              'El óptimo de este problema está en un vértice interior, donde se cruzan dos restricciones: ahí es donde la ' +
              'combinación de ambos productos aprovecha mejor los recursos. Hay que evaluar **todos** los vértices, sin excepción.',
          };
        }

        if (coincide(peorVertice) && Math.abs(peorVertice - (g.valorOptimo ?? 0)) > 1e-6) {
          return {
            codigo: 'GRAFICO_OBJETIVO_INVERTIDO',
            mensaje:
              `Tomó el peor vértice en lugar del mejor: el problema pide **${datos.objetivo}**. ` +
              (datos.objetivo === 'maximizar'
                ? 'Al desplazar la línea de indiferencia hay que alejarse del origen, no acercarse.'
                : 'Al desplazar la línea de indiferencia hay que acercarse al origen, no alejarse.'),
          };
        }

        if (g.optimo !== null) {
          const conCoeficientesCambiados = datos.coefY * g.optimo.punto.x + datos.coefX * g.optimo.punto.y;
          if (coincide(conCoeficientesCambiados) && Math.abs(conCoeficientesCambiados - (g.valorOptimo ?? 0)) > 1e-6) {
            return {
              codigo: 'GRAFICO_COEFICIENTES_CAMBIADOS',
              mensaje:
                `Intercambió los coeficientes de la función objetivo: multiplicó ${datos.nombreX} por el aporte de ${datos.nombreY} y viceversa. ` +
                `La función es Z = ${datos.coefX} ${datos.nombreX} + ${datos.coefY} ${datos.nombreY}.`,
            };
          }
        }
      }

      if ((clave === 'grafico.optimoX' || clave === 'grafico.optimoY') && g.optimo !== null) {
        const otra = clave === 'grafico.optimoX' ? g.optimo.punto.y : g.optimo.punto.x;
        const propia = clave === 'grafico.optimoX' ? g.optimo.punto.x : g.optimo.punto.y;
        if (coincide(otra) && Math.abs(otra - propia) > 1e-6) {
          return {
            codigo: 'GRAFICO_VARIABLES_CAMBIADAS',
            mensaje:
              `Intercambió las dos variables: ese es el valor de ${clave === 'grafico.optimoX' ? datos.nombreY : datos.nombreX}, no el de ` +
              `${clave === 'grafico.optimoX' ? datos.nombreX : datos.nombreY}. ` +
              `Recuerde que el eje horizontal corresponde a ${datos.nombreX}.`,
          };
        }
      }

      if (clave === 'grafico.precioSombra' || clave === 'grafico.rangoFactibilidad') {
        const s = analizarSensibilidad(g).datos;
        const objetivo = s?.recursoMasValioso ?? null;

        if (s !== null && objetivo !== null) {
          if (clave === 'grafico.precioSombra') {
            if (coincide(datos.coefX) || coincide(datos.coefY)) {
              return {
                codigo: 'GRAFICO_SOMBRA_ES_COEFICIENTE',
                mensaje:
                  'Respondió con un coeficiente de la función objetivo. El precio sombra no es lo que aporta una unidad de **producto**, ' +
                  'sino lo que aporta una unidad más de **recurso**: cuánto sube Z si se afloja esa restricción. Son dos cosas distintas ' +
                  'y rara vez coinciden.',
              };
            }
            if (coincide(g.valorOptimo)) {
              return {
                codigo: 'GRAFICO_SOMBRA_ES_Z',
                mensaje:
                  'Respondió con el valor óptimo de Z. El precio sombra es una **tasa de cambio**, no un total: mide cuánto varía Z por ' +
                  'cada unidad adicional del recurso, así que sus unidades son de objetivo por unidad de recurso.',
              };
            }
            const otro = s.preciosSombra.find(
              (x) => x.restriccion.id !== objetivo.restriccion.id && Math.abs(x.valor) > 1e-9 && coincide(x.valor),
            );
            if (otro !== undefined) {
              return {
                codigo: 'GRAFICO_SOMBRA_OTRA_RESTRICCION',
                mensaje:
                  `Ese es el precio sombra de «${otro.restriccion.nombre}», no el de «${objetivo.restriccion.nombre}». ` +
                  'Cada restricción activa tiene el suyo: son los dos coeficientes que resuelven el sistema dual, y no son intercambiables.',
              };
            }
            if (coincide(0)) {
              return {
                codigo: 'GRAFICO_SOMBRA_CERO_INDEBIDO',
                mensaje:
                  `«${objetivo.restriccion.nombre}» está activa: se agota por completo en el óptimo, así que su precio sombra no puede ser cero. ` +
                  'El precio sombra vale cero solo en los recursos que sobran.',
              };
            }
          }

          if (clave === 'grafico.rangoFactibilidad' && objetivo.rangoHasta !== null) {
            const incremento = objetivo.rangoHasta - objetivo.restriccion.c;
            if (coincide(incremento) && Math.abs(incremento - objetivo.rangoHasta) > 1e-9) {
              return {
                codigo: 'GRAFICO_RANGO_ES_INCREMENTO',
                mensaje:
                  `Respondió con el incremento (${formatearNumero(incremento, { decimales: 2 })}) y se pedía el valor total del recurso. ` +
                  `Sume la disponibilidad actual: ${formatearNumero(objetivo.restriccion.c, { decimales: 2 })} + ${formatearNumero(incremento, { decimales: 2 })}.`,
              };
            }
            if (coincide(objetivo.restriccion.c)) {
              return {
                codigo: 'GRAFICO_RANGO_ES_ACTUAL',
                mensaje:
                  'Respondió con la disponibilidad actual del recurso. Se pide hasta dónde puede **aumentar** manteniendo el mismo precio sombra, ' +
                  'que es el punto en el que otra restricción se vuelve el nuevo cuello de botella.',
              };
            }
          }
        }
      }

      if (clave === 'grafico.vertices') {
        if (coincide(datos.restricciones.length)) {
          return {
            codigo: 'GRAFICO_CUENTA_RESTRICCIONES',
            mensaje:
              'Contó las restricciones, no los vértices. Cada vértice sale de cruzar **dos** rectas —dos restricciones entre sí, ' +
              'o una restricción con un eje— y solo cuenta si además cumple todas las demás restricciones.',
          };
        }
        const cruces = (datos.restricciones.length + (datos.noNegatividad ? 2 : 0));
        const todosLosCruces = (cruces * (cruces - 1)) / 2;
        if (coincide(todosLosCruces) && todosLosCruces !== g.vertices.length) {
          return {
            codigo: 'GRAFICO_CRUCES_SIN_FILTRAR',
            mensaje:
              'Contó todos los cruces de rectas sin filtrarlos. Muchos de esos puntos quedan fuera de la región factible ' +
              'porque violan alguna otra restricción: hay que comprobar cada cruce contra todas las condiciones antes de aceptarlo como vértice.',
          };
        }
      }
    }
  }

  // ── Método simplex ────────────────────────────────────────────────────────
  if (datos.tipo === 'simplex') {
    const r = resolverSimplex({ ...datos, titulo: ejercicio.titulo });
    const s = r.datos;

    if (s !== null) {
      const resumen = resumenColumnas(s.columnas);

      if (clave === 'simplex.columnas') {
        if (coincide(resumen.decision)) {
          return {
            codigo: 'SIMPLEX_SOLO_DECISION',
            mensaje:
              'Contó solo las variables de decisión. La forma estándar agrega una variable por cada restricción —de holgura si es ≤, ' +
              'de exceso **más** una artificial si es ≥, y una artificial si es igualdad—, y todas ocupan una columna del tableau.',
          };
        }
        if (coincide(resumen.decision + resumen.holgura + resumen.exceso)) {
          return {
            codigo: 'SIMPLEX_OLVIDA_ARTIFICIALES',
            mensaje:
              'Contó las de decisión, las de holgura y las de exceso, pero olvidó las artificiales. Cada restricción ≥ o = necesita una: ' +
              'sin ella no habría base de arranque, porque el exceso entra restando y tendría que valer un número negativo.',
          };
        }
        if (coincide(resumen.decision + datos.restricciones.length)) {
          return {
            codigo: 'SIMPLEX_UNA_POR_RESTRICCION',
            mensaje:
              'Sumó una variable por restricción, como si todas fueran de tipo ≤. Las restricciones ≥ agregan **dos** columnas: la de ' +
              'exceso, que mide cuánto se supera el mínimo, y la artificial, que sirve para arrancar.',
          };
        }
      }

      if (clave === 'simplex.valorOptimo' && s.valorOptimo !== null) {
        const optimo = aNumero(s.valorOptimo);

        // Detenerse en un tableau intermedio es el error más común, y deja una
        // huella inconfundible: el valor coincide con el de una iteración.
        for (const it of s.iteraciones) {
          if (it.fase !== 2 || it.entra === null) continue;
          const intermedio = aNumero(it.tableau.valor.a);
          if (Math.abs(intermedio - optimo) > 1e-9 && coincide(intermedio)) {
            return {
              codigo: 'SIMPLEX_TABLEAU_INTERMEDIO',
              mensaje:
                `Ese es el valor de Z en la iteración ${it.numero}, no en el tableau final. El procedimiento no termina cuando la solución ` +
                'ya parece razonable, sino cuando **ninguna** columna mejora el objetivo: mientras quede un valor negativo en la fila zⱼ − cⱼ ' +
                '(al maximizar) o positivo (al minimizar), todavía hay un vértice mejor.',
            };
          }
        }

        const sumaCoeficientes = sumaExacta(datos.variables.map((v) => v.coeficiente));
        if (coincide(sumaCoeficientes) && Math.abs(sumaCoeficientes - optimo) > 1e-9) {
          return {
            codigo: 'SIMPLEX_SUMA_COEFICIENTES',
            mensaje:
              'Sumó los coeficientes de la función objetivo. Z se obtiene multiplicando cada coeficiente por el valor que toma su variable ' +
              'en la solución, no sumándolos sueltos.',
          };
        }
      }

      if (clave === 'simplex.variable') {
        // Leer la fila equivocada del tableau final: el valor pertenece a otra
        // variable básica.
        const propia = pregunta.respuesta;
        for (const v of s.valores) {
          if (!v.basica) continue;
          const valorOtra = aNumero(v.valor);
          if (typeof propia === 'number' && Math.abs(valorOtra - propia) <= 1e-9) continue;
          if (coincide(valorOtra)) {
            return {
              codigo: 'SIMPLEX_FILA_EQUIVOCADA',
              mensaje:
                `Ese es el valor de ${v.columna.etiqueta} (${v.columna.nombre}), no el de la variable que se le pregunta. En el tableau ` +
                'final, el lado derecho de cada fila pertenece a la variable que figura en la columna «Base» de esa misma fila: hay que ' +
                'buscar primero el nombre y después leer el número.',
            };
          }
        }
      }

      if (clave === 'simplex.precioSombra') {
        const propia = typeof pregunta.respuesta === 'number' ? pregunta.respuesta : null;

        for (const v of datos.variables) {
          if (coincide(v.coeficiente) && (propia === null || Math.abs(v.coeficiente - propia) > 1e-9)) {
            return {
              codigo: 'SIMPLEX_PRECIO_ES_COEFICIENTE',
              mensaje:
                `Ese es el aporte de ${v.nombre} a la función objetivo, no el precio sombra de un recurso. El coeficiente dice cuánto ` +
                'rinde una unidad **de producto**; el precio sombra dice cuánto rinde una unidad **de recurso**, y sale de la fila ' +
                'objetivo bajo la columna de la holgura correspondiente.',
            };
          }
        }

        for (const h of s.holguras) {
          const otro = aNumero(h.precioSombra);
          if (propia !== null && Math.abs(otro - propia) <= 1e-9) continue;
          if (coincide(otro)) {
            return {
              codigo: 'SIMPLEX_PRECIO_OTRA_RESTRICCION',
              mensaje:
                `Ese es el precio sombra de «${h.restriccion.nombre}», no el de la restricción por la que se pregunta. Cada columna de ` +
                'holgura corresponde a una sola restricción: conviene rotularlas antes de leer la fila objetivo.',
            };
          }
        }

        if (coincide(0) && propia !== null && Math.abs(propia) > 1e-9) {
          return {
            codigo: 'SIMPLEX_PRECIO_CERO_INDEBIDO',
            mensaje:
              'El precio sombra vale cero solo cuando el recurso sobra, es decir cuando su holgura se quedó en la base. Esta restricción ' +
              'se agota por completo: su holgura salió de la base y su precio sombra es distinto de cero.',
          };
        }
      }

      const sensibilidad = analizarSensibilidadSimplex(s).datos;

      if (clave === 'simplex.rangoFactibilidad' && sensibilidad !== null) {
        const propia = typeof pregunta.respuesta === 'number' ? pregunta.respuesta : null;

        for (const r of sensibilidad.rangosLadoDerecho) {
          if (r.hasta === null) continue;
          const incremento = aNumero(r.hasta) - r.holgura.restriccion.c;
          if (coincide(incremento) && Math.abs(incremento - (propia ?? 0)) > 1e-9) {
            return {
              codigo: 'SIMPLEX_RANGO_ES_INCREMENTO',
              mensaje:
                `Ese es el **incremento** admisible, no el valor total. El recurso puede subir ${formatearNumero(incremento, { decimales: 2 })} ` +
                `unidades más, y la pregunta pide la disponibilidad que resulta: ${formatearNumero(r.holgura.restriccion.c, { decimales: 2 })} más ` +
                `ese incremento.`,
            };
          }
          if (coincide(r.holgura.restriccion.c) && propia !== null && Math.abs(r.holgura.restriccion.c - propia) > 1e-9) {
            return {
              codigo: 'SIMPLEX_RANGO_ES_ACTUAL',
              mensaje:
                'Ese es el valor actual del recurso, no el tope del rango. La pregunta es hasta dónde puede **crecer** la disponibilidad sin que ' +
                'el precio sombra deje de valer, es decir hasta que alguna variable básica llegue a cero y la base cambie.',
            };
          }
        }
      }

      if (clave === 'simplex.costoReducido' && sensibilidad !== null) {
        const propia = typeof pregunta.respuesta === 'number' ? pregunta.respuesta : null;

        for (const c of sensibilidad.fueraDelPlan) {
          const reducido = Math.abs(aNumero(c.costoReducido));
          if (coincide(reducido) && (propia === null || Math.abs(reducido - propia) > 1e-9)) {
            return {
              codigo: 'SIMPLEX_COSTO_REDUCIDO_SOLO',
              mensaje:
                `Ese es el costo reducido —cuánto **le falta** al aporte—, no el valor a partir del cual conviene producir. Hay que sumarlo al ` +
                `aporte actual de ${c.variable.nombre}: ${formatearNumero(aNumero(c.valorActual), { decimales: 2 })} ${datos.unidadObjetivo} más ` +
                `${formatearNumero(reducido, { decimales: 2 })}.`,
            };
          }
          if (coincide(aNumero(c.valorActual)) && (propia === null || Math.abs(aNumero(c.valorActual) - propia) > 1e-9)) {
            return {
              codigo: 'SIMPLEX_COSTO_REDUCIDO_ES_ACTUAL',
              mensaje:
                `Ese es el aporte que ${c.variable.nombre} tiene ahora, y con ese valor precisamente **no** conviene producirlo: por eso quedó ` +
                'fuera del plan. La pregunta es a partir de qué valor cambiaría esa decisión.',
            };
          }
        }
      }
    }
  }

  // ── Localización ──────────────────────────────────────────────────────────
  if (datos.tipo === 'localizacion' && clave === 'localizacion.cargaDistancia') {
    // Usar distancia euclidiana donde se pidió rectilínea (o al revés).
    const otra = datos.tipoDistancia === 'rectilinea' ? 'euclidiana' : 'rectilinea';
    for (const sitio of datos.sitios) {
      if (!sitio.punto) continue;
      const total = sumaExacta(
        datos.puntos.map((p) => {
          const dx = Math.abs(p.punto.x - sitio.punto!.x);
          const dy = Math.abs(p.punto.y - sitio.punto!.y);
          return p.carga * (otra === 'rectilinea' ? dx + dy : Math.hypot(dx, dy));
        }),
      );
      if (coincide(total)) {
        return {
          codigo: 'LOCALIZACION_DISTANCIA_EQUIVOCADA',
          mensaje:
            `Usó distancia ${otra} donde el problema pide distancia ${datos.tipoDistancia}. ` +
            (datos.tipoDistancia === 'rectilinea'
              ? 'La rectilínea suma los desplazamientos horizontal y vertical por separado, porque el transporte va por calles, no en línea recta.'
              : 'La euclidiana mide en línea recta, apropiada cuando no hay retícula vial que respetar.'),
        };
      }
    }
  }

  if (datos.tipo === 'localizacion' && clave === 'localizacion.centroGravedad') {
    const promedioSimpleX = sumaExacta(datos.puntos.map((p) => p.punto.x)) / Math.max(1, datos.puntos.length);
    const promedioSimpleY = sumaExacta(datos.puntos.map((p) => p.punto.y)) / Math.max(1, datos.puntos.length);
    if (coincide(promedioSimpleX) || coincide(promedioSimpleY)) {
      return {
        codigo: 'CENTRO_GRAVEDAD_SIN_PONDERAR',
        mensaje:
          'Calculó el promedio simple de las coordenadas, sin ponderar por la carga. El centro de gravedad pondera: ' +
          'una comunidad con 200 productores tira del resultado con el doble de fuerza que una con 100.',
      };
    }
  }

  return null;
}

/** Duración del proyecto si en cada convergencia se tomara el mínimo. */
function duracionConMinimo(actividades: readonly { id: string; predecesoras: readonly string[]; duracion: number }[]): number {
  const mapa = new Map(actividades.map((a) => [a.id, a]));
  const tt = new Map<string, number>();
  const pendientes = new Set(actividades.map((a) => a.id));
  let seguro = actividades.length * actividades.length + 10;

  while (pendientes.size > 0 && seguro-- > 0) {
    // La copia es necesaria: el cuerpo borra de `pendientes` mientras recorre.
    // oxlint-disable-next-line unicorn/no-useless-spread
    for (const id of [...pendientes]) {
      const a = mapa.get(id)!;
      const preds = a.predecesoras.filter((p) => mapa.has(p));
      if (preds.some((p) => !tt.has(p))) continue;
      const inicio = preds.length === 0 ? 0 : Math.min(...preds.map((p) => tt.get(p)!));
      tt.set(id, inicio + a.duracion);
      pendientes.delete(id);
    }
  }

  // La duración se lee en las actividades terminales, que son las que cierran
  // el proyecto; una actividad intermedia puede tener una terminación mayor
  // justamente porque el error del mínimo desconectó la cadena larga.
  const conSucesoras = new Set(actividades.flatMap((a) => a.predecesoras));
  const terminales = actividades.filter((a) => !conSucesoras.has(a.id));
  const finales = terminales.map((a) => tt.get(a.id)).filter((x): x is number => x !== undefined);

  if (finales.length > 0) return Math.max(...finales);
  return tt.size === 0 ? 0 : Math.max(...tt.values());
}

/** Costo de aplicar costo mínimo sin balancear, truncando cuando se agota el lado corto. */
function costoIgnorandoBalance(datos: {
  costos: readonly (readonly number[])[];
  oferta: readonly number[];
  demanda: readonly number[];
}): number {
  const oferta = [...datos.oferta];
  const demanda = [...datos.demanda];
  let costo = 0;

  for (let i = 0; i < oferta.length; i++) {
    for (let j = 0; j < demanda.length; j++) {
      const q = Math.min(oferta[i] ?? 0, demanda[j] ?? 0);
      if (q <= 0) continue;
      costo += q * (datos.costos[i]?.[j] ?? 0);
      oferta[i] = (oferta[i] ?? 0) - q;
      demanda[j] = (demanda[j] ?? 0) - q;
    }
  }
  return costo;
}

// ───────────────────────────── Primer paso incorrecto ─────────────────────────────

export interface RevisionProcedimiento {
  readonly primerPasoIncorrecto: number | null;
  readonly mensaje: string;
}

/**
 * Compara los valores intermedios que el estudiante declaró contra los del
 * motor y localiza el primer punto de divergencia. Es lo que permite decir
 * «hasta el paso 3 vas bien; el error empieza en el 4».
 */
export function localizarPrimerError(
  valoresEstudiante: readonly (number | null)[],
  valoresCorrectos: readonly (number | null)[],
  tolerancia = 0.01,
): RevisionProcedimiento {
  for (let i = 0; i < valoresCorrectos.length; i++) {
    const correcto = valoresCorrectos[i];
    const dado = valoresEstudiante[i];
    if (correcto === null || correcto === undefined) continue;
    if (dado === null || dado === undefined) continue;

    const escala = Math.max(1e-9, Math.abs(correcto));
    if (Math.abs(dado - correcto) / escala > tolerancia) {
      return {
        primerPasoIncorrecto: i + 1,
        mensaje:
          i === 0
            ? 'El primer paso ya se separa del procedimiento correcto. Revise la lectura de los datos de entrada antes de seguir.'
            : `Hasta el paso ${i} el procedimiento es correcto. El error empieza en el paso ${i + 1}: ` +
              `esperado ${formatearNumero(correcto, { decimales: 4 })}, obtenido ${formatearNumero(dado, { decimales: 4 })}. ` +
              'Corrija ahí; todo lo que sigue arrastra ese valor.',
      };
    }
  }

  return {
    primerPasoIncorrecto: null,
    mensaje: 'Todos los valores intermedios que declaró coinciden con el procedimiento correcto.',
  };
}

// ───────────────────────────── Resumen de un intento ─────────────────────────────

export interface ResumenIntento {
  readonly puntaje: number;
  readonly puntajeMaximo: number;
  readonly porcentaje: number;
  readonly correctas: number;
  readonly incorrectas: number;
  readonly pendientesDeRevision: number;
  readonly erroresDetectados: readonly string[];
  readonly mensaje: string;
}

export function resumirIntento(evaluaciones: readonly Evaluacion[], preguntas: readonly Pregunta[]): ResumenIntento {
  const puntaje = sumaExacta(evaluaciones.map((e) => e.puntosObtenidos));
  const calificables = preguntas.filter((p) => p.tipo !== 'interpretacion' && p.respuesta !== null);
  const puntajeMaximo = sumaExacta(calificables.map((p) => p.puntos));
  const correctas = evaluaciones.filter((e) => e.correcta).length;
  const incorrectas = evaluaciones.filter((e) => e.veredicto === 'incorrecta' || e.veredicto === 'cerca').length;
  const pendientes = evaluaciones.filter((e) => e.veredicto === 'no_calificable').length;
  const errores = evaluaciones.map((e) => e.codigoError).filter((c): c is string => c !== null);
  const porcentaje = puntajeMaximo === 0 ? 0 : (puntaje / puntajeMaximo) * 100;

  let mensaje: string;
  if (calificables.length === 0) {
    mensaje = 'Este ejercicio se compone solo de preguntas de interpretación: la revisión queda en manos del docente.';
  } else if (porcentaje >= 90) {
    mensaje = 'Dominio sólido del método. Puede pasar al siguiente nivel de dificultad.';
  } else if (porcentaje >= 70) {
    mensaje = 'Buen manejo general, con detalles por afinar. Revise los errores señalados antes de avanzar.';
  } else if (porcentaje >= 50) {
    mensaje = 'El procedimiento se entiende a medias. Conviene repetir el ejemplo resuelto paso a paso antes de intentar otro ejercicio.';
  } else {
    mensaje = 'Todavía no hay control del método. Vuelva a la sección «Comprender» y al ejemplo resuelto; el simulador ayuda a ver qué cambia con cada dato.';
  }

  if (pendientes > 0) {
    mensaje += ` Quedan ${pendientes} respuesta(s) de interpretación pendientes de revisión docente.`;
  }

  return {
    puntaje,
    puntajeMaximo,
    porcentaje,
    correctas,
    incorrectas,
    pendientesDeRevision: pendientes,
    erroresDetectados: [...new Set(errores)],
    mensaje,
  };
}
