/**
 * Modo evaluación: armado de exámenes y ejecución sin pistas ni soluciones.
 *
 * Funciona sin servidor: la evaluación se guarda localmente y la hoja de
 * resultados se exporta al terminar.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NOMBRE_DIFICULTAD, NOMBRE_TEMA, TEMAS, type Evaluacion, type Tema } from '@/esquemas';
import { perfilActual, usarTienda } from '@/almacen/tienda';
import { nuevoId } from '@/almacen/baseDatos';
import { enlaces } from '@/rutas';
import {
  CampoNumero,
  CampoTexto,
  Distintivo,
  Indicador,
  Interruptor,
  Seccion,
  Selector,
  Tarjeta,
  Vacio,
} from '@/ui/base';
import { duracionLegible, exportarCSV, exportarExcel, fechaLegible, imprimir, nombreSeguro } from '@/export/exportar';
import { formatearNumero } from '@/nucleo/numero';

export function PaginaEvaluacion(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);
  const esDocente = tienda.configuracion.modo === 'docente';

  const [armando, setArmando] = useState(false);
  const [borrador, setBorrador] = useState<Evaluacion>(() => evaluacionEnBlanco());
  const [temaFiltro, setTemaFiltro] = useState<Tema | 'todos'>('todos');

  const disponibles = useMemo(
    () => tienda.ejercicios.filter((e) => temaFiltro === 'todos' || e.tema === temaFiltro),
    [tienda.ejercicios, temaFiltro],
  );

  const guardar = (): void => {
    if (borrador.ejercicioIds.length === 0) {
      tienda.avisar('Agregue al menos un ejercicio antes de guardar la evaluación.', 'avisar');
      return;
    }
    tienda.guardarEvaluacion(borrador);
    tienda.avisar('Evaluación guardada.', 'bien');
    setArmando(false);
    setBorrador(evaluacionEnBlanco());
  };

  return (
    <Seccion
      titulo="Modo evaluación"
      eyebrow={tienda.configuracion.modo === 'evaluacion' ? 'Activo' : 'Inactivo'}
      descripcion="En modo evaluación se ocultan las pistas y las soluciones, se registra el tiempo empleado y la calificación se aplica automáticamente cuando el resultado es verificable. Las preguntas de interpretación quedan para revisión del docente."
      acciones={
        <div className="flex flex-wrap gap-2">
          {tienda.configuracion.modo !== 'evaluacion' ? (
            <button type="button" className="boton boton-primario boton-pequeno" onClick={() => tienda.fijarModo('evaluacion')}>
              Activar modo evaluación
            </button>
          ) : (
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => tienda.fijarModo('estudiante')}>
              Salir del modo evaluación
            </button>
          )}
          {esDocente && (
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setArmando(true)}>
              Armar evaluación
            </button>
          )}
        </div>
      }
    >
      {tienda.configuracion.modo === 'evaluacion' && (
        <div className="aviso aviso-avisar">
          <span>
            El modo evaluación está activo: los ejercicios que abra ahora no mostrarán pistas ni respuestas correctas, y cada
            intento quedará registrado con el tiempo empleado.
          </span>
        </div>
      )}

      {armando && esDocente && (
        <Tarjeta
          titulo="Armar una evaluación"
          descripcion="Elija ejercicios de la biblioteca y defina las reglas. La evaluación se guarda en este equipo."
          acciones={
            <div className="flex gap-2">
              <button type="button" className="boton boton-suave boton-pequeno" onClick={() => setArmando(false)}>
                Cancelar
              </button>
              <button type="button" className="boton boton-primario boton-pequeno" onClick={guardar}>
                Guardar evaluación
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoTexto etiqueta="Título" valor={borrador.titulo} alCambiar={(v) => setBorrador((s) => ({ ...s, titulo: v }))} />
              <CampoTexto etiqueta="Descripción" valor={borrador.descripcion} alCambiar={(v) => setBorrador((s) => ({ ...s, descripcion: v }))} />
              <CampoNumero
                etiqueta="Intentos permitidos"
                valor={borrador.intentosPermitidos}
                minimo={1}
                maximo={10}
                paso={1}
                alCambiar={(v) => setBorrador((s) => ({ ...s, intentosPermitidos: Math.max(1, Math.round(v ?? 1)) }))}
              />
              <CampoNumero
                etiqueta="Tiempo límite"
                unidad="minutos"
                valor={borrador.minutosLimite}
                minimo={5}
                paso={5}
                alCambiar={(v) => setBorrador((s) => ({ ...s, minutosLimite: v }))}
                ayuda="Deje vacío para no limitar el tiempo."
              />
              <CampoNumero
                etiqueta="Tolerancia de redondeo"
                unidad="%"
                valor={borrador.toleranciaRedondeo * 100}
                minimo={0}
                maximo={25}
                alCambiar={(v) => setBorrador((s) => ({ ...s, toleranciaRedondeo: (v ?? 1) / 100 }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Interruptor etiqueta="Mostrar pistas" activo={borrador.mostrarPistas} alCambiar={(v) => setBorrador((s) => ({ ...s, mostrarPistas: v }))} />
              <Interruptor etiqueta="Mostrar solución al terminar" activo={borrador.mostrarSolucion} alCambiar={(v) => setBorrador((s) => ({ ...s, mostrarSolucion: v }))} />
              <Interruptor
                etiqueta="Incluir preguntas de interpretación"
                activo={borrador.incluyeInterpretacion}
                alCambiar={(v) => setBorrador((s) => ({ ...s, incluyeInterpretacion: v }))}
                ayuda="No se califican automáticamente; quedan para el docente."
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-64">
                  <Selector
                    etiqueta="Filtrar por tema"
                    valor={temaFiltro}
                    opciones={[{ valor: 'todos' as const, texto: 'Todos los temas' }, ...TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))]}
                    alCambiar={(v) => setTemaFiltro(v as Tema | 'todos')}
                  />
                </div>
                <span className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  {borrador.ejercicioIds.length} ejercicio(s) seleccionado(s)
                </span>
              </div>

              <div className="contenedor-tabla" style={{ maxHeight: '22rem' }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col" className="w-10" aria-label="Incluir" />
                      <th scope="col">Ejercicio</th>
                      <th scope="col">Tema</th>
                      <th scope="col">Dificultad</th>
                      <th scope="col" className="text-right">Minutos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disponibles.map((e) => {
                      const incluido = borrador.ejercicioIds.includes(e.id);
                      return (
                        <tr key={e.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={incluido}
                              aria-label={`Incluir ${e.titulo}`}
                              onChange={() =>
                                setBorrador((s) => ({
                                  ...s,
                                  ejercicioIds: incluido ? s.ejercicioIds.filter((x) => x !== e.id) : [...s.ejercicioIds, e.id],
                                }))
                              }
                            />
                          </td>
                          <td className="text-[0.8125rem]">{e.titulo}</td>
                          <td className="text-[0.8125rem]">{NOMBRE_TEMA[e.tema]}</td>
                          <td>
                            <Distintivo tono={e.dificultad === 'avanzado' ? 'mal' : e.dificultad === 'intermedio' ? 'avisar' : 'bien'}>
                              {NOMBRE_DIFICULTAD[e.dificultad]}
                            </Distintivo>
                          </td>
                          <td className="numero">{e.tiempoEstimadoMinutos}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Tarjeta>
      )}

      {tienda.evaluaciones.length === 0 ? (
        <Vacio
          titulo="No hay evaluaciones guardadas"
          descripcion={
            esDocente
              ? 'Arme una evaluación seleccionando ejercicios de la biblioteca, o active el modo evaluación y resuelva cualquier ejercicio directamente.'
              : 'Active el modo evaluación y resuelva cualquier ejercicio de la biblioteca: se registrará el tiempo y la calificación automática.'
          }
          accion={
            <a href={enlaces.biblioteca} className="boton boton-primario boton-pequeno no-underline">
              Abrir la biblioteca
            </a>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {tienda.evaluaciones.map((ev) => (
            <FichaEvaluacion key={ev.id} evaluacion={ev} />
          ))}
        </div>
      )}

      <HojaDeResultados perfilNombre={perfil?.nombre ?? null} />
    </Seccion>
  );
}

function evaluacionEnBlanco(): Evaluacion {
  return {
    id: nuevoId('eval'),
    titulo: 'Evaluación sin título',
    descripcion: '',
    ejercicioIds: [],
    intentosPermitidos: 1,
    minutosLimite: 60,
    mostrarPistas: false,
    mostrarSolucion: false,
    toleranciaRedondeo: 0.01,
    toleranciaRelativa: true,
    incluyeInterpretacion: true,
    creadaEn: new Date().toISOString(),
  };
}

function FichaEvaluacion({ evaluacion }: { evaluacion: Evaluacion }): ReactNode {
  const tienda = usarTienda();
  const ejercicios = evaluacion.ejercicioIds.map((id) => tienda.ejercicios.find((e) => e.id === id)).filter((e) => e !== undefined);
  const minutos = ejercicios.reduce((s, e) => s + (e?.tiempoEstimadoMinutos ?? 0), 0);
  const puntos = ejercicios.reduce((s, e) => s + (e?.preguntas.reduce((t, p) => t + p.puntos, 0) ?? 0), 0);

  return (
    <Tarjeta
      titulo={evaluacion.titulo}
      descripcion={`${ejercicios.length} ejercicio(s) · ${puntos} punto(s) · ${minutos} min estimados · creada el ${fechaLegible(evaluacion.creadaEn)}`}
      acciones={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="boton boton-primario boton-pequeno"
            onClick={() => {
              tienda.fijarModo('evaluacion');
              tienda.fijarConfiguracion({ toleranciaRedondeo: evaluacion.toleranciaRedondeo, mostrarPistas: evaluacion.mostrarPistas, mostrarSoluciones: evaluacion.mostrarSolucion });
              if (evaluacion.ejercicioIds[0] !== undefined) window.location.hash = `#/ejercicio/${evaluacion.ejercicioIds[0]}`;
            }}
          >
            Iniciar
          </button>
          <button
            type="button"
            className="boton boton-suave boton-pequeno"
            style={{ color: 'var(--mal)' }}
            onClick={() => {
              if (window.confirm(`¿Eliminar la evaluación «${evaluacion.titulo}»?`)) tienda.eliminarEvaluacion(evaluacion.id);
            }}
          >
            Eliminar
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Distintivo tono="neutro">{evaluacion.intentosPermitidos} intento(s)</Distintivo>
        {evaluacion.minutosLimite !== null && <Distintivo tono="avisar">límite de {evaluacion.minutosLimite} min</Distintivo>}
        <Distintivo tono={evaluacion.mostrarPistas ? 'avisar' : 'bien'}>{evaluacion.mostrarPistas ? 'con pistas' : 'sin pistas'}</Distintivo>
        <Distintivo tono={evaluacion.mostrarSolucion ? 'avisar' : 'bien'}>{evaluacion.mostrarSolucion ? 'muestra solución' : 'oculta solución'}</Distintivo>
        <Distintivo tono="neutro">tolerancia {formatearNumero(evaluacion.toleranciaRedondeo * 100, { decimales: 1 })} %</Distintivo>
      </div>

      <ul className="mt-3 flex flex-col gap-1 text-[0.8125rem]">
        {ejercicios.map((e) =>
          e === undefined ? null : (
            <li key={e.id}>
              <a href={enlaces.ejercicio(e.id)}>{e.titulo}</a>{' '}
              <span style={{ color: 'var(--tinta-tenue)' }}>· {NOMBRE_TEMA[e.tema]}</span>
            </li>
          ),
        )}
      </ul>
    </Tarjeta>
  );
}

function HojaDeResultados({ perfilNombre }: { perfilNombre: string | null }): ReactNode {
  const tienda = usarTienda();
  const deEvaluacion = tienda.intentos.filter((i) => i.modo === 'evaluacion');

  if (deEvaluacion.length === 0) return null;

  const tabla = {
    titulo: 'Hoja de resultados de evaluación',
    encabezados: ['Estudiante', 'Ejercicio', 'Tema', 'Puntaje', 'Máximo', 'Porcentaje', 'Tiempo', 'Fecha'],
    filas: deEvaluacion.map((i) => [
      tienda.perfiles.find((p) => p.id === i.perfilId)?.nombre ?? 'sin perfil',
      tienda.ejercicios.find((e) => e.id === i.ejercicioId)?.titulo ?? i.ejercicioId,
      NOMBRE_TEMA[i.tema],
      i.puntaje,
      i.puntajeMaximo,
      i.puntajeMaximo > 0 ? Math.round((i.puntaje / i.puntajeMaximo) * 100) : 0,
      duracionLegible(i.segundosEmpleados),
      fechaLegible(i.iniciadoEn),
    ]),
  };

  const promedio =
    (deEvaluacion.reduce((s, i) => s + (i.puntajeMaximo > 0 ? i.puntaje / i.puntajeMaximo : 0), 0) / deEvaluacion.length) * 100;

  return (
    <Tarjeta
      titulo="Hoja de resultados"
      descripcion={perfilNombre === null ? 'Resultados de todos los intentos en modo evaluación.' : `Incluye los intentos de ${perfilNombre} y de los demás perfiles de este equipo.`}
      acciones={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro('hoja-resultados'))}>
            CSV
          </button>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro('hoja-resultados'))}>
            Excel
          </button>
          <button type="button" className="boton boton-suave boton-pequeno" onClick={imprimir}>
            Imprimir o PDF
          </button>
        </div>
      }
    >
      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Indicador etiqueta="Evaluaciones rendidas" valor={deEvaluacion.length} />
        <Indicador etiqueta="Promedio" valor={`${formatearNumero(promedio, { decimales: 0 })} %`} tono={promedio >= 70 ? 'bien' : 'avisar'} />
        <Indicador etiqueta="Tiempo promedio" valor={duracionLegible(deEvaluacion.reduce((s, i) => s + i.segundosEmpleados, 0) / deEvaluacion.length)} />
      </div>

      <div className="contenedor-tabla">
        <table className="tabla">
          <thead>
            <tr>
              {tabla.encabezados.map((h, i) => (
                <th key={i} scope="col" className={i >= 3 && i <= 5 ? 'text-right' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f, i) => (
              <tr key={i}>
                {f.map((c, j) => (
                  <td key={j} className={j >= 3 && j <= 5 ? 'numero' : ''}>
                    {String(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
