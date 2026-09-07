/**
 * Pantalla de un ejercicio: enunciado, laboratorio, preguntas con pistas
 * graduadas y retroalimentación específica.
 *
 * El comportamiento depende del modo: en práctica hay pistas y se puede
 * comprobar cada respuesta; en evaluación se ocultan pistas y solución, se
 * registra el tiempo y se califica al enviar.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { NOMBRE_DIFICULTAD, NOMBRE_TEMA, type Intento, type Pregunta, type Respuesta } from '@/esquemas';
import { perfilActual, usarTienda } from '@/almacen/tienda';
import { nuevoId } from '@/almacen/baseDatos';
import { enlaces, irA } from '@/rutas';
import { evaluarRespuesta, resumirIntento, type Evaluacion } from '@/nucleo/retroalimentacion';
import { formatearNumero } from '@/nucleo/numero';
import { CreditoAutor, Distintivo, DistintivosAuditoria, Indicador, Plegable, Tarjeta, TextoFormateado, Vacio } from '@/ui/base';
import { Laboratorio } from '@/laboratorios';
import { duracionLegible } from '@/export/exportar';
import { fuentePorId } from '@/datos/fuentes';

export function PaginaEjercicio({ ejercicioId }: { ejercicioId: string }): ReactNode {
  const tienda = usarTienda();
  const ejercicio = tienda.ejercicios.find((e) => e.id === ejercicioId) ?? null;
  const perfil = perfilActual(tienda);

  const modo = tienda.configuracion.modo;
  const enEvaluacion = modo === 'evaluacion';
  const mostrarPistas = tienda.configuracion.mostrarPistas && !enEvaluacion;
  const mostrarSoluciones = tienda.configuracion.mostrarSoluciones && !enEvaluacion;

  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [pistasAbiertas, setPistasAbiertas] = useState<Record<string, number>>({});
  const [evaluaciones, setEvaluaciones] = useState<Record<string, Evaluacion>>({});
  const [enviado, setEnviado] = useState(false);
  const [mostrarLaboratorio, setMostrarLaboratorio] = useState(false);
  const inicio = useRef<number>(Date.now());
  const [transcurrido, setTranscurrido] = useState(0);

  // Aquí no hay ningún efecto que limpie el estado al cambiar de ejercicio:
  // `App` monta la página con `key={ejercicioId}`, así que cambiar de ejercicio
  // la monta de nuevo y todo arranca vacío en el mismo render. Limpiarlo desde
  // un efecto dejaba ver un fotograma con las respuestas del ejercicio anterior,
  // y el cronómetro seguía mostrando el tiempo de aquel hasta el siguiente tic.

  useEffect(() => {
    const t = window.setInterval(() => setTranscurrido(Math.round((Date.now() - inicio.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, []);

  const resumen = useMemo(() => {
    if (ejercicio === null) return null;
    const lista = ejercicio.preguntas.map((p) => evaluaciones[p.id]).filter((e): e is Evaluacion => e !== undefined);
    if (lista.length === 0) return null;
    return resumirIntento(lista, ejercicio.preguntas);
  }, [ejercicio, evaluaciones]);

  if (ejercicio === null) {
    return (
      <Vacio
        titulo="Ejercicio no encontrado"
        descripcion={`No existe ningún ejercicio con el identificador ${ejercicioId}. Puede que haya sido eliminado o que el enlace esté equivocado.`}
        accion={
          <a href={enlaces.biblioteca} className="boton boton-primario boton-pequeno no-underline">
            Volver a la biblioteca
          </a>
        }
      />
    );
  }

  const comprobar = (pregunta: Pregunta): void => {
    const texto = respuestas[pregunta.id] ?? '';
    const ev = evaluarRespuesta(ejercicio, pregunta, texto === '' ? null : texto, {
      tolerancia: tienda.configuracion.toleranciaRedondeo,
      toleranciaRelativa: tienda.configuracion.toleranciaRelativa,
      pistasUsadas: pistasAbiertas[pregunta.id] ?? 0,
    });
    setEvaluaciones((s) => ({ ...s, [pregunta.id]: ev }));
  };

  const enviarTodo = (): void => {
    const nuevas: Record<string, Evaluacion> = {};
    for (const p of ejercicio.preguntas) {
      const texto = respuestas[p.id] ?? '';
      nuevas[p.id] = evaluarRespuesta(ejercicio, p, texto === '' ? null : texto, {
        tolerancia: tienda.configuracion.toleranciaRedondeo,
        toleranciaRelativa: tienda.configuracion.toleranciaRelativa,
        pistasUsadas: pistasAbiertas[p.id] ?? 0,
      });
    }
    setEvaluaciones(nuevas);
    setEnviado(true);

    if (perfil === null) {
      tienda.avisar('Respuestas evaluadas. Cree un perfil para guardar su avance y generar reportes.', 'avisar');
      return;
    }

    const lista = ejercicio.preguntas.map((p) => nuevas[p.id]!).filter(Boolean);
    const r = resumirIntento(lista, ejercicio.preguntas);

    const registro: Intento = {
      id: nuevoId('intento'),
      ejercicioId: ejercicio.id,
      perfilId: perfil.id,
      tema: ejercicio.tema,
      modo: enEvaluacion ? 'evaluacion' : mostrarPistas ? 'practica' : 'desafio',
      iniciadoEn: new Date(inicio.current).toISOString(),
      finalizadoEn: new Date().toISOString(),
      segundosEmpleados: Math.round((Date.now() - inicio.current) / 1000),
      respuestas: ejercicio.preguntas.map(
        (p): Respuesta => ({
          preguntaId: p.id,
          valor: respuestas[p.id] ?? null,
          correcta: nuevas[p.id]?.correcta ?? null,
          puntosObtenidos: nuevas[p.id]?.puntosObtenidos ?? 0,
          retroalimentacion: nuevas[p.id]?.mensaje ?? '',
          pistasUsadas: pistasAbiertas[p.id] ?? 0,
          intentos: 1,
          // Las interpretaciones nacen sin calificar: las revisa el docente.
          revision: null,
        }),
      ),
      puntaje: r.puntaje,
      puntajeMaximo: r.puntajeMaximo,
      completado: true,
      erroresDetectados: [...r.erroresDetectados],
    };

    tienda.registrarIntento(registro);
    tienda.avisar(`Intento registrado: ${formatearNumero(r.porcentaje, { decimales: 0 })} % de los puntos calificables.`, r.porcentaje >= 70 ? 'bien' : 'avisar');
  };

  const fuente = fuentePorId(ejercicio.fuenteId);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="etiqueta">
              {NOMBRE_TEMA[ejercicio.tema]} · {ejercicio.metodo}
            </p>
            <h1>{ejercicio.titulo}</h1>
          </div>
          <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
            <a href={enlaces.laboratorio(ejercicio.tema)} className="boton boton-secundario boton-pequeno no-underline">
              Abrir laboratorio del tema
            </a>
            <a href={enlaces.modulo(ejercicio.tema)} className="boton boton-suave boton-pequeno no-underline">
              Teoría
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Distintivo tono="neutro">{NOMBRE_DIFICULTAD[ejercicio.dificultad]}</Distintivo>
          <Distintivo tono="neutro">{ejercicio.tiempoEstimadoMinutos} min estimados</Distintivo>
          <Distintivo tono="neutro">Tiempo empleado: {duracionLegible(transcurrido)}</Distintivo>
          {ejercicio.origen !== 'textual' && (
            <Distintivo tono="avisar" titulo="Este ejercicio no es transcripción literal de un material del curso">
              {ejercicio.origen}
            </Distintivo>
          )}
          <DistintivosAuditoria ids={ejercicio.inconsistencias} inconsistencias={tienda.inconsistencias} />
          {enEvaluacion && <Distintivo tono="mal">Modo evaluación</Distintivo>}
          <button type="button" className="boton boton-suave boton-pequeno ocultar-al-imprimir" onClick={() => tienda.alternarFavorito(ejercicio.id)}>
            {tienda.favoritos.includes(ejercicio.id) ? '★ Quitar de favoritos' : '☆ Marcar favorito'}
          </button>
        </div>
      </header>

      <Tarjeta titulo="Enunciado">
        <TextoFormateado texto={ejercicio.enunciado} />
        {fuente !== null && (
          <p className="mt-3 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
            Fuente: {fuente.cita}
            {ejercicio.atribucion !== null && tienda.configuracion.mostrarAtribuciones ? ` · ${ejercicio.atribucion}` : ''}
          </p>
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Laboratorio"
        descripcion="Puede resolver a mano y verificar aquí, o usar el laboratorio para explorar cómo cambian los resultados."
        acciones={
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setMostrarLaboratorio((v) => !v)}>
            {mostrarLaboratorio ? 'Ocultar laboratorio' : 'Mostrar laboratorio'}
          </button>
        }
      >
        {mostrarLaboratorio ? (
          <Laboratorio
            datos={ejercicio.datos}
            titulo={ejercicio.titulo}
            revelarTodo={modo === 'docente'}
            ocultarResultados={enEvaluacion || modo === 'proyeccion'}
          />
        ) : (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            {enEvaluacion
              ? 'En modo evaluación el laboratorio muestra los datos pero mantiene los resultados ocultos hasta que envíe sus respuestas.'
              : 'El laboratorio está oculto para que primero intente resolver por su cuenta. Ábralo cuando quiera comprobar o explorar.'}
          </p>
        )}
      </Tarjeta>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="etiqueta">Preguntas</p>
            <h2>Responda y compruebe</h2>
          </div>
          <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
            <button type="button" className="boton boton-suave boton-pequeno" onClick={() => { setRespuestas({}); setEvaluaciones({}); setEnviado(false); inicio.current = Date.now(); }}>
              Reintentar desde cero
            </button>
            <button type="button" className="boton boton-primario" onClick={enviarTodo}>
              {enEvaluacion ? 'Enviar evaluación' : 'Comprobar todo y registrar intento'}
            </button>
          </div>
        </div>

        {resumen !== null && enviado && (
          <div className="grid gap-3 sm:grid-cols-4">
            <Indicador
              etiqueta="Puntaje"
              valor={`${formatearNumero(resumen.puntaje, { decimales: 1 })} / ${formatearNumero(resumen.puntajeMaximo, { decimales: 0 })}`}
              tono={resumen.porcentaje >= 70 ? 'bien' : 'avisar'}
            />
            <Indicador etiqueta="Porcentaje" valor={`${formatearNumero(resumen.porcentaje, { decimales: 0 })} %`} tono={resumen.porcentaje >= 70 ? 'bien' : 'mal'} />
            <Indicador etiqueta="Correctas" valor={`${resumen.correctas} de ${ejercicio.preguntas.length}`} />
            <Indicador etiqueta="Tiempo" valor={duracionLegible(transcurrido)} />
          </div>
        )}

        {resumen !== null && enviado && (
          <div className={`aviso ${resumen.porcentaje >= 70 ? 'aviso-bien' : 'aviso-avisar'}`}>
            <span>{resumen.mensaje}</span>
          </div>
        )}

        {ejercicio.preguntas.map((pregunta, indice) => (
          <TarjetaPregunta
            key={pregunta.id}
            pregunta={pregunta}
            indice={indice}
            valor={respuestas[pregunta.id] ?? ''}
            alCambiar={(v) => setRespuestas((s) => ({ ...s, [pregunta.id]: v }))}
            evaluacion={evaluaciones[pregunta.id] ?? null}
            alComprobar={() => comprobar(pregunta)}
            pistasUsadas={pistasAbiertas[pregunta.id] ?? 0}
            alPedirPista={() => setPistasAbiertas((s) => ({ ...s, [pregunta.id]: Math.min(pregunta.pistas.length, (s[pregunta.id] ?? 0) + 1) }))}
            mostrarPistas={mostrarPistas}
            mostrarSolucion={mostrarSoluciones && enviado}
          />
        ))}
      </section>

      {ejercicio.notasDocente !== '' && modo === 'docente' && (
        <Plegable titulo="Notas para el docente" distintivo={<Distintivo tono="acento">solo modo docente</Distintivo>}>
          <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            {ejercicio.notasDocente}
          </p>
        </Plegable>
      )}

      <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
        <a href={enlaces.reportes} className="boton boton-secundario boton-pequeno no-underline">
          Generar reporte de este ejercicio
        </a>
        <button type="button" className="boton boton-suave boton-pequeno" onClick={() => irA('biblioteca')}>
          Volver a la biblioteca
        </button>
      </div>

      <CreditoAutor origen={ejercicio.origen} />
    </div>
  );
}

function TarjetaPregunta({
  pregunta,
  indice,
  valor,
  alCambiar,
  evaluacion,
  alComprobar,
  pistasUsadas,
  alPedirPista,
  mostrarPistas,
  mostrarSolucion,
}: {
  pregunta: Pregunta;
  indice: number;
  valor: string;
  alCambiar: (v: string) => void;
  evaluacion: Evaluacion | null;
  alComprobar: () => void;
  pistasUsadas: number;
  alPedirPista: () => void;
  mostrarPistas: boolean;
  mostrarSolucion: boolean;
}): ReactNode {
  const tono =
    evaluacion === null
      ? 'neutro'
      : evaluacion.veredicto === 'correcta'
        ? 'bien'
        : evaluacion.veredicto === 'cerca'
          ? 'avisar'
          : evaluacion.veredicto === 'no_calificable'
            ? 'acento'
            : 'mal';

  const borde =
    tono === 'bien' ? 'var(--bien)' : tono === 'avisar' ? 'var(--avisar)' : tono === 'mal' ? 'var(--mal)' : tono === 'acento' ? 'var(--acento)' : 'var(--borde)';

  return (
    <article className="tarjeta flex flex-col gap-3 p-4" style={{ borderColor: evaluacion === null ? undefined : borde }}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <span
            className="dato flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: 'var(--superficie-3)', color: 'var(--tinta-media)' }}
          >
            {indice + 1}
          </span>
          <p className="prosa font-medium">{pregunta.enunciado}</p>
        </div>
        <span className="flex shrink-0 gap-1.5">
          <Distintivo tono="neutro">
            {pregunta.puntos} punto{pregunta.puntos === 1 ? '' : 's'}
          </Distintivo>
          {pregunta.tipo === 'interpretacion' && <Distintivo tono="acento">interpretación</Distintivo>}
        </span>
      </header>

      <div className="flex flex-wrap items-end gap-2">
        {pregunta.tipo === 'interpretacion' || pregunta.tipo === 'texto' ? (
          <textarea
            className="campo min-h-[5rem] flex-1"
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
            placeholder={pregunta.tipo === 'interpretacion' ? 'Explique su razonamiento…' : 'Escriba su respuesta…'}
            aria-label={pregunta.enunciado}
          />
        ) : (
          <label className="flex flex-1 flex-col gap-1">
            <span className="etiqueta">Respuesta{pregunta.unidad !== null ? ` (${pregunta.unidad})` : ''}</span>
            <input
              type="text"
              inputMode="decimal"
              className="campo campo-numero"
              value={valor}
              onChange={(e) => alCambiar(e.target.value)}
              placeholder="0,00"
              aria-label={pregunta.enunciado}
            />
          </label>
        )}

        <button type="button" className="boton boton-secundario" onClick={alComprobar}>
          Comprobar
        </button>

        {mostrarPistas && pregunta.pistas.length > 0 && (
          <button
            type="button"
            className="boton boton-suave"
            onClick={alPedirPista}
            disabled={pistasUsadas >= pregunta.pistas.length}
            title="Cada pista reduce el puntaje de la pregunta"
          >
            {pistasUsadas >= pregunta.pistas.length ? 'Sin más pistas' : `Pista ${pistasUsadas + 1} de ${pregunta.pistas.length}`}
          </button>
        )}
      </div>

      {mostrarPistas && pistasUsadas > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pregunta.pistas.slice(0, pistasUsadas).map((p, i) => (
            <li key={i} className="aviso aviso-nota">
              <span>
                <strong>Pista {i + 1}.</strong> {p}
              </span>
            </li>
          ))}
        </ul>
      )}

      {evaluacion !== null && (
        <div className={`aviso ${tono === 'bien' ? 'aviso-bien' : tono === 'mal' ? 'aviso-mal' : tono === 'acento' ? 'aviso-nota' : 'aviso-avisar'}`} role="status">
          <span>
            {evaluacion.mensaje}
            {evaluacion.codigoError !== null && (
              <span className="ml-1.5 text-xs opacity-60">[{evaluacion.codigoError}]</span>
            )}
          </span>
        </div>
      )}

      {mostrarSolucion && pregunta.respuesta !== null && evaluacion !== null && !evaluacion.correcta && (
        <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
          <strong>Respuesta correcta:</strong>{' '}
          <span className="dato">
            {typeof pregunta.respuesta === 'number'
              ? formatearNumero(pregunta.respuesta, { decimales: 4 })
              : pregunta.respuesta}
            {pregunta.unidad !== null ? ` ${pregunta.unidad}` : ''}
          </span>
        </p>
      )}
    </article>
  );
}
