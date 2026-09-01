/**
 * Panel de progreso: dominio por tema, evolución de los intentos y errores
 * recurrentes.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NOMBRE_TEMA, NUMERO_MODULO, TEMAS, type Intento } from '@/esquemas';
import { intentosDelPerfil, perfilActual, progresoGeneral, temaRecomendado, usarTienda } from '@/almacen/tienda';
import { enlaces } from '@/rutas';
import { BarraProgreso, Distintivo, Indicador, Plegable, Seccion, Selector, Tarjeta, Vacio } from '@/ui/base';
import { BarrasComparativas } from '@/ui/graficas';
import { formatearNumero } from '@/nucleo/numero';
import {
  compararIntentos,
  intentosDeEjercicio,
  leerEvolucion,
  resumirSerie,
  type CambioPregunta,
} from '@/nucleo/comparacionIntentos';
import { duracionLegible } from '@/export/exportar';

export function PaginaProgreso(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);
  const intentos = intentosDelPerfil(tienda, tienda.perfilActualId);
  const completados = intentos.filter((i) => i.completado);

  if (perfil === null) {
    return (
      <Vacio
        titulo="Sin perfil seleccionado"
        descripcion="El progreso se guarda por perfil. Cree uno o seleccione el suyo en el panel del estudiante."
        accion={
          <a href={enlaces.estudiante} className="boton boton-primario boton-pequeno no-underline">
            Ir al panel del estudiante
          </a>
        }
      />
    );
  }

  const general = progresoGeneral(tienda);
  const recomendado = temaRecomendado(tienda);
  const tiempoTotal = completados.reduce((s, i) => s + i.segundosEmpleados, 0);
  const promedio =
    completados.length === 0
      ? 0
      : (completados.reduce((s, i) => s + (i.puntajeMaximo > 0 ? i.puntaje / i.puntajeMaximo : 0), 0) / completados.length) * 100;

  const erroresPorCodigo = new Map<string, number>();
  for (const i of completados) for (const c of i.erroresDetectados) erroresPorCodigo.set(c, (erroresPorCodigo.get(c) ?? 0) + 1);

  return (
    <Seccion
      titulo="Panel de progreso"
      eyebrow={perfil.nombre}
      descripcion="El dominio de cada tema pondera los tres intentos más recientes, que reflejan mejor el estado actual que el promedio de todo el historial."
      acciones={
        <a href={enlaces.reportes} className="boton boton-secundario boton-pequeno no-underline">
          Generar reporte
        </a>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Progreso general" valor={`${general} %`} tono={general >= 70 ? 'bien' : 'acento'} />
        <Indicador etiqueta="Promedio de intentos" valor={`${formatearNumero(promedio, { decimales: 0 })} %`} tono={promedio >= 70 ? 'bien' : 'avisar'} />
        <Indicador etiqueta="Intentos completados" valor={completados.length} />
        <Indicador etiqueta="Tiempo dedicado" valor={duracionLegible(tiempoTotal)} />
      </div>

      <Tarjeta titulo="Dominio por módulo" descripcion="Un módulo se considera dominado a partir de 70 %.">
        <div className="flex flex-col gap-3">
          {TEMAS.map((tema) => {
            const p = tienda.progreso.find((x) => x.tema === tema);
            const delTema = completados.filter((i) => i.tema === tema);
            const esRecomendado = tema === recomendado;

            return (
              <div key={tema} className="grid items-center gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,12rem)]">
                <span
                  className="dato flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                  style={{ background: 'var(--superficie-3)', color: 'var(--tinta-media)' }}
                >
                  {NUMERO_MODULO[tema]}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={enlaces.modulo(tema)} className="text-[0.875rem] font-medium">
                      {NOMBRE_TEMA[tema]}
                    </a>
                    {esRecomendado && <Distintivo tono="avisar">siguiente recomendado</Distintivo>}
                    {(p?.dominio ?? 0) >= 70 && <Distintivo tono="bien">dominado</Distintivo>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                    {delTema.length} intento(s) · {p?.ejerciciosCorrectos ?? 0} con 70 % o más
                    {p?.ultimaVisita != null && ` · última actividad: ${new Date(p.ultimaVisita).toLocaleDateString('es-HN')}`}
                  </p>
                </div>

                <BarraProgreso valor={p?.dominio ?? 0} etiqueta="Dominio" />
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Desempeño por tema" descripcion="Porcentaje promedio obtenido en los intentos de cada tema.">
          {completados.length === 0 ? (
            <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              Sin intentos registrados todavía.
            </p>
          ) : (
            <BarrasComparativas
              etiquetaValor="Porcentaje promedio obtenido"
              descripcion="Comparación del desempeño promedio por tema."
              formato={(v) => `${formatearNumero(v, { decimales: 0 })} %`}
              datos={TEMAS.filter((t) => completados.some((i) => i.tema === t)).map((t) => {
                const delTema = completados.filter((i) => i.tema === t);
                const media =
                  (delTema.reduce((s, i) => s + (i.puntajeMaximo > 0 ? i.puntaje / i.puntajeMaximo : 0), 0) / delTema.length) * 100;
                return { nombre: NOMBRE_TEMA[t], valor: media, nota: `${delTema.length} intento(s)` };
              })}
            />
          )}
        </Tarjeta>

        <Tarjeta
          titulo="Errores recurrentes"
          descripcion="Cada código corresponde a un error típico que el motor reconoce. Repetirlo señala un concepto que conviene repasar antes de avanzar."
        >
          {erroresPorCodigo.size === 0 ? (
            <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              El motor no ha reconocido ningún error típico en sus intentos.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {[...erroresPorCodigo.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([codigo, veces]) => (
                  <li key={codigo} className="flex items-center justify-between gap-3">
                    <span className="dato text-[0.8125rem]">{codigo}</span>
                    <Distintivo tono={veces >= 3 ? 'mal' : 'avisar'}>{veces}</Distintivo>
                  </li>
                ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      <EvolucionDeIntentos />
    </Seccion>
  );
}

/**
 * Evolución entre los intentos de un mismo ejercicio.
 *
 * Es lo que faltaba del historial: los intentos estaban todos, pero listados
 * uno tras otro sin decir qué cambió. Aquí se ve pregunta por pregunta qué se
 * corrigió, qué se perdió y qué error se sigue repitiendo, que es lo único que
 * indica qué repasar.
 */
function EvolucionDeIntentos(): ReactNode {
  const tienda = usarTienda();
  const [perfilId, setPerfilId] = useState<string | 'todos'>('todos');

  // Solo tienen evolución los ejercicios intentados más de una vez.
  const series = useMemo(() => {
    const relevantes = tienda.intentos.filter((i) => i.completado && (perfilId === 'todos' || i.perfilId === perfilId));
    const porClave = new Map<string, Intento[]>();
    for (const i of relevantes) {
      const clave = `${i.perfilId}|${i.ejercicioId}`;
      porClave.set(clave, [...(porClave.get(clave) ?? []), i]);
    }

    return [...porClave.entries()]
      .map(([clave, lista]) => {
        const ejercicio = tienda.ejercicios.find((e) => e.id === lista[0]!.ejercicioId);
        if (ejercicio === undefined) return null;
        const ordenados = intentosDeEjercicio(lista, ejercicio.id, lista[0]!.perfilId);
        const resumen = resumirSerie(ordenados, ejercicio);
        if (resumen === null) return null;
        return { clave, ejercicio, resumen, perfilId: lista[0]!.perfilId };
      })
      .filter((x) => x !== null)
      .sort((a, b) => b.resumen.intentos.length - a.resumen.intentos.length);
  }, [tienda.intentos, tienda.ejercicios, perfilId]);

  const nombreDe = (id: string): string => tienda.perfiles.find((p) => p.id === id)?.nombre ?? 'sin perfil';

  if (tienda.intentos.length === 0) return null;

  return (
    <Seccion
      titulo="Evolución entre intentos"
      descripcion="Cuando un ejercicio se resuelve más de una vez, lo que importa no es el puntaje sino en qué se dejó de fallar."
    >
      {tienda.perfiles.length > 1 && (
        <Selector
          etiqueta="Estudiante"
          valor={perfilId}
          opciones={[{ valor: 'todos', texto: 'Todos los perfiles' }, ...tienda.perfiles.map((p) => ({ valor: p.id, texto: p.nombre }))]}
          alCambiar={setPerfilId}
        />
      )}

      {series.length === 0 ? (
        <Vacio
          titulo="Todavía no hay ejercicios repetidos"
          descripcion="Resuelva un ejercicio por segunda vez y aquí aparecerá qué cambió entre un intento y otro."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {series.map(({ clave, ejercicio, resumen, perfilId: pid }) => {
            const ultima = compararIntentos(
              resumen.intentos.at(-2)!,
              resumen.intentos.at(-1)!,
              ejercicio,
              resumen.intentos.length - 1,
              resumen.intentos.length,
            );

            return (
              <Plegable
                key={clave}
                titulo={
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{ejercicio.titulo}</span>
                    <span className="text-xs font-normal" style={{ color: 'var(--tinta-tenue)' }}>
                      {resumen.intentos.length} intentos · {nombreDe(pid)}
                    </span>
                  </span>
                }
                distintivo={
                  <span className="flex gap-1.5">
                    <Distintivo tono={resumen.progreso > 0 ? 'bien' : resumen.progreso < 0 ? 'mal' : 'neutro'}>
                      {resumen.progreso > 0 ? '+' : ''}
                      {formatearNumero(resumen.progreso, { decimales: 0 })} pp
                    </Distintivo>
                    {resumen.erroresPersistentes.length > 0 && (
                      <Distintivo tono="avisar">{resumen.erroresPersistentes.length} error(es) sin corregir</Distintivo>
                    )}
                  </span>
                }
              >
                <div className="flex flex-col gap-3">
                  <p className="prosa text-[0.875rem]">
                    {leerEvolucion(ultima, (codigo) => codigo)}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {resumen.porcentajes.map((p, i) => (
                      <span
                        key={i}
                        className="rounded-md px-2 py-1 text-xs"
                        style={{
                          background: i === 0 ? 'var(--superficie-2)' : p >= (resumen.porcentajes[i - 1] ?? 0) ? 'var(--bien-suave)' : 'var(--mal-suave)',
                          color: 'var(--tinta)',
                        }}
                      >
                        Intento {i + 1}: {formatearNumero(p, { decimales: 0 })} %
                      </span>
                    ))}
                  </div>

                  <div className="contenedor-tabla" style={{ maxHeight: '18rem' }}>
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Pregunta</th>
                          <th scope="col">Antes</th>
                          <th scope="col">Después</th>
                          <th scope="col">Cambio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ultima.preguntas.map((p) => (
                          <tr key={p.pregunta.id}>
                            <td className="max-w-sm text-[0.8125rem]">{p.pregunta.enunciado}</td>
                            <td className="dato text-[0.8125rem]">{p.valorAntes === null ? '—' : String(p.valorAntes).slice(0, 30)}</td>
                            <td className="dato text-[0.8125rem]">{p.valorDespues === null ? '—' : String(p.valorDespues).slice(0, 30)}</td>
                            <td>
                              <Distintivo tono={TONO_CAMBIO[p.cambio]}>{NOMBRE_CAMBIO[p.cambio]}</Distintivo>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Plegable>
            );
          })}
        </div>
      )}
    </Seccion>
  );
}

const NOMBRE_CAMBIO: Record<CambioPregunta, string> = {
  corregida: 'la corrigió',
  perdida: 'la perdió',
  seguia_mal: 'sigue mal',
  seguia_bien: 'sigue bien',
  sin_datos: 'sin datos',
};

const TONO_CAMBIO: Record<CambioPregunta, 'bien' | 'mal' | 'avisar' | 'neutro'> = {
  corregida: 'bien',
  perdida: 'mal',
  seguia_mal: 'avisar',
  seguia_bien: 'neutro',
  sin_datos: 'neutro',
};
