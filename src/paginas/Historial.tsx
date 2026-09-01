/**
 * Historial de prácticas: todos los intentos registrados, con filtros y
 * exportación.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NOMBRE_TEMA, TEMAS, type Intento, type Tema } from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { enlaces } from '@/rutas';
import { Distintivo, Indicador, Plegable, Seccion, Selector, Tarjeta, Vacio } from '@/ui/base';
import { notaDeIntento, resumirRevision } from '@/nucleo/revision';
import { duracionLegible, exportarCSV, exportarExcel, fechaLegible, nombreSeguro } from '@/export/exportar';
import { formatearNumero } from '@/nucleo/numero';

export function PaginaHistorial(): ReactNode {
  const tienda = usarTienda();
  const [tema, setTema] = useState<Tema | 'todos'>('todos');
  const [perfilId, setPerfilId] = useState<string | 'todos'>('todos');
  const [modo, setModo] = useState<'todos' | 'practica' | 'desafio' | 'evaluacion'>('todos');

  const filtrados = useMemo(
    () =>
      [...tienda.intentos]
        .filter((i) => (tema === 'todos' || i.tema === tema) && (perfilId === 'todos' || i.perfilId === perfilId) && (modo === 'todos' || i.modo === modo))
        .sort((a, b) => b.iniciadoEn.localeCompare(a.iniciadoEn)),
    [tienda.intentos, tema, perfilId, modo],
  );

  const nombreDe = (id: string): string => tienda.perfiles.find((p) => p.id === id)?.nombre ?? 'sin perfil';
  const tituloDe = (id: string): string => tienda.ejercicios.find((e) => e.id === id)?.titulo ?? id;

  // El porcentaje de un intento es el de la nota final en cuanto el docente
  // califica alguna interpretación. Si se mostrara el automático junto a la
  // nota final, los dos números se contradirían en la misma tarjeta.
  const resumenDe = (i: Intento) => {
    const ejercicio = tienda.ejercicios.find((e) => e.id === i.ejercicioId);
    const nota = notaDeIntento(i, ejercicio);
    return {
      ejercicio,
      rev: ejercicio === undefined ? null : resumirRevision(i, ejercicio),
      conRevision: nota.conRevision,
      porcentaje: nota.porcentaje,
    };
  };

  const tabla = {
    titulo: 'Historial de prácticas',
    encabezados: ['Fecha', 'Estudiante', 'Ejercicio', 'Tema', 'Modo', 'Puntaje', 'Máximo', 'Porcentaje', 'Tiempo (s)', 'Errores detectados'],
    filas: filtrados.map((i) => [
      fechaLegible(i.iniciadoEn),
      nombreDe(i.perfilId),
      tituloDe(i.ejercicioId),
      NOMBRE_TEMA[i.tema],
      i.modo,
      i.puntaje,
      i.puntajeMaximo,
      Math.round(resumenDe(i).porcentaje),
      i.segundosEmpleados,
      i.erroresDetectados.join(' | '),
    ]),
  };

  const promedio =
    filtrados.length === 0
      ? 0
      : filtrados.reduce((s, i) => s + resumenDe(i).porcentaje, 0) / filtrados.length;

  return (
    <Seccion
      titulo="Historial de prácticas"
      eyebrow={`${tienda.intentos.length} intento(s) registrado(s)`}
      descripcion="Cada intento guarda las respuestas, la retroalimentación recibida, las pistas consultadas y el tiempo empleado."
      acciones={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro('historial-practicas'))}>
            Exportar CSV
          </button>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro('historial-practicas'))}>
            Exportar Excel
          </button>
        </div>
      }
    >
      <Tarjeta plana>
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector
            etiqueta="Tema"
            valor={tema}
            opciones={[{ valor: 'todos' as const, texto: 'Todos los temas' }, ...TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))]}
            alCambiar={(v) => setTema(v as Tema | 'todos')}
          />
          <Selector
            etiqueta="Estudiante"
            valor={perfilId}
            opciones={[{ valor: 'todos', texto: 'Todos los perfiles' }, ...tienda.perfiles.map((p) => ({ valor: p.id, texto: p.nombre }))]}
            alCambiar={setPerfilId}
          />
          <Selector
            etiqueta="Modo"
            valor={modo}
            opciones={[
              { valor: 'todos' as const, texto: 'Todos los modos' },
              { valor: 'practica' as const, texto: 'Práctica' },
              { valor: 'desafio' as const, texto: 'Desafío' },
              { valor: 'evaluacion' as const, texto: 'Evaluación' },
            ]}
            alCambiar={(v) => setModo(v as typeof modo)}
          />
        </div>
      </Tarjeta>

      {filtrados.length === 0 ? (
        <Vacio
          titulo="No hay intentos con estos filtros"
          descripcion="Resuelva un ejercicio de la biblioteca para empezar a registrar el historial, o cambie los filtros."
          accion={
            <a href={enlaces.biblioteca} className="boton boton-primario boton-pequeno no-underline">
              Abrir la biblioteca
            </a>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador etiqueta="Intentos mostrados" valor={filtrados.length} />
            <Indicador etiqueta="Promedio" valor={`${formatearNumero(promedio, { decimales: 0 })} %`} tono={promedio >= 70 ? 'bien' : 'avisar'} />
            <Indicador etiqueta="Tiempo acumulado" valor={duracionLegible(filtrados.reduce((s, i) => s + i.segundosEmpleados, 0))} />
          </div>

          <div className="flex flex-col gap-2">
            {filtrados.map((i) => {
              const { ejercicio, rev, conRevision, porcentaje: pct } = resumenDe(i);
              const hayInterpretaciones = rev !== null && rev.puntosMaximosRevision > 0;

              return (
                <Plegable
                  key={i.id}
                  titulo={
                    <span className="flex flex-wrap items-center gap-2">
                      <span>{tituloDe(i.ejercicioId)}</span>
                      <span className="text-xs font-normal" style={{ color: 'var(--tinta-tenue)' }}>
                        {fechaLegible(i.iniciadoEn)} · {nombreDe(i.perfilId)}
                      </span>
                    </span>
                  }
                  distintivo={
                    <span className="flex gap-1.5">
                      <Distintivo tono={i.modo === 'evaluacion' ? 'avisar' : 'neutro'}>{i.modo}</Distintivo>
                      <Distintivo tono={pct >= 70 ? 'bien' : 'mal'}>{formatearNumero(pct, { decimales: 0 })} %</Distintivo>
                      {hayInterpretaciones && rev!.pendientes > 0 && (
                        <Distintivo tono="avisar">{rev!.pendientes} por revisar</Distintivo>
                      )}
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <Indicador
                        etiqueta={conRevision ? 'Puntaje automático' : 'Puntaje'}
                        valor={`${formatearNumero(i.puntaje, { decimales: 1 })} / ${i.puntajeMaximo}`}
                        nota={conRevision ? 'Sin las preguntas de interpretación' : undefined}
                      />
                      <Indicador etiqueta="Tiempo" valor={duracionLegible(i.segundosEmpleados)} />
                      <Indicador etiqueta="Tema" valor={<span className="text-sm">{NOMBRE_TEMA[i.tema]}</span>} />
                      <Indicador etiqueta="Errores típicos" valor={i.erroresDetectados.length} tono={i.erroresDetectados.length > 0 ? 'avisar' : 'bien'} />
                    </div>

                    <div className="contenedor-tabla" style={{ maxHeight: '20rem' }}>
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th scope="col">Pregunta</th>
                            <th scope="col">Su respuesta</th>
                            <th scope="col">Retroalimentación</th>
                            <th scope="col" className="text-right">Pistas</th>
                            <th scope="col" className="text-right">Puntos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {i.respuestas.map((r) => {
                            const pregunta = ejercicio?.preguntas.find((p) => p.id === r.preguntaId);
                            return (
                              <tr key={r.preguntaId}>
                                <td className="max-w-xs text-[0.8125rem]">{pregunta?.enunciado ?? r.preguntaId}</td>
                                <td className="dato text-[0.8125rem]">{r.valor === null ? '—' : String(r.valor)}</td>
                                <td className="max-w-md text-xs" style={{ color: 'var(--tinta-media)' }}>
                                  {r.retroalimentacion}
                                </td>
                                <td className="numero">{r.pistasUsadas}</td>
                                <td className="numero" style={{ color: r.correcta === true || r.revision !== null ? 'var(--bien)' : 'var(--tinta-media)' }}>
                                  {r.revision !== null
                                    ? `${formatearNumero(r.revision.puntos, { decimales: 1 })} / ${formatearNumero(pregunta?.puntos ?? 0, { decimales: 0 })}`
                                    : pregunta?.tipo === 'interpretacion'
                                      ? String(r.valor ?? '').trim() === ''
                                        ? 'sin responder'
                                        : 'por revisar'
                                      : formatearNumero(r.puntosObtenidos, { decimales: 1 })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {conRevision && (
                      <div className="flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--superficie-2)' }}>
                        <p className="etiqueta">Revisión del docente</p>
                        <p className="text-[0.8125rem]">
                          Nota final <strong>{formatearNumero(rev!.notaFinal, { decimales: 1 })} / {formatearNumero(rev!.notaMaxima, { decimales: 0 })}</strong>{' '}
                          ({formatearNumero(rev!.porcentajeFinal, { decimales: 0 })} %), sumando{' '}
                          {formatearNumero(rev!.puntosRevision, { decimales: 1 })} de los{' '}
                          {formatearNumero(rev!.puntosMaximosRevision, { decimales: 0 })} puntos de interpretación.
                          {rev!.pendientes > 0 && ' Todavía quedan respuestas por revisar.'}
                        </p>
                        {i.respuestas
                          .filter((r) => r.revision !== null && r.revision.comentario !== '')
                          .map((r) => (
                            <p key={r.preguntaId} className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                              <strong>{ejercicio?.preguntas.find((p) => p.id === r.preguntaId)?.enunciado.slice(0, 60) ?? r.preguntaId}…</strong>{' '}
                              {r.revision!.comentario}
                            </p>
                          ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <a href={enlaces.ejercicio(i.ejercicioId)} className="boton boton-secundario boton-pequeno no-underline">
                        Reintentar este ejercicio
                      </a>
                    </div>
                  </div>
                </Plegable>
              );
            })}
          </div>
        </>
      )}
    </Seccion>
  );
}
