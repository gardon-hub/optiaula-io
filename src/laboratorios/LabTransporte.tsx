/**
 * Laboratorio del módulo 11 — Modelo de transporte.
 *
 * Balanceo visible, los tres métodos de solución inicial, optimización por
 * MODI con ciclos de mejora, comparación entre métodos y red de envíos.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  NOMBRE_METODO,
  compararMetodosIniciales,
  resolverTransporte,
  rutasDeEnvio,
  type DatosTransporte,
  type MetodoInicial,
} from '@/nucleo/transporte';
import { analizarSensibilidadTransporte } from '@/nucleo/sensibilidadTransporte';
import { formatearNumero, sumaExacta } from '@/nucleo/numero';
import { CampoTexto, Distintivo, Indicador, ListaDiagnosticos, Pestanas, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { MatrizEditable } from '@/ui/editores';
import { RedTransporte } from '@/ui/redes';
import { BarrasComparativas } from '@/ui/graficas';

export function LabTransporte({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'transporte' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [datos, setDatos] = useState<DatosTransporte>(() => ({
    titulo,
    origenes: [...datosIniciales.origenes],
    destinos: [...datosIniciales.destinos],
    costos: datosIniciales.costos.map((f) => [...f]),
    oferta: [...datosIniciales.oferta],
    demanda: [...datosIniciales.demanda],
    unidadCosto: datosIniciales.unidadCosto,
    unidadCantidad: datosIniciales.unidadCantidad,
  }));

  const [metodo, setMetodo] = useState<MetodoInicial>(datosIniciales.metodoInicialSugerido);

  const resultado = useMemo(() => resolverTransporte(datos, metodo), [datos, metodo]);
  const comparacion = useMemo(() => compararMetodosIniciales(datos), [datos]);

  const totalOferta = sumaExacta(datos.oferta);
  const totalDemanda = sumaExacta(datos.demanda);
  const diferencia = totalOferta - totalDemanda;
  const balanceado = Math.abs(diferencia) < 1e-9;

  const d = resultado.datos;

  // No vuelve a resolver: parte de la solución óptima que MODI ya calculó.
  const sensibilidad = useMemo(() => (d === null ? null : analizarSensibilidadTransporte(d)), [d]);
  const rutas = d === null ? [] : rutasDeEnvio(d.problema, d.solucionOptima);

  const cambiarTamano = (origenes: number, destinos: number): void => {
    setDatos((s) => ({
      ...s,
      origenes: Array.from({ length: origenes }, (_, i) => s.origenes[i] ?? `O${i + 1}`),
      destinos: Array.from({ length: destinos }, (_, j) => s.destinos[j] ?? `D${j + 1}`),
      costos: Array.from({ length: origenes }, (_, i) => Array.from({ length: destinos }, (_, j) => s.costos[i]?.[j] ?? 1)),
      oferta: Array.from({ length: origenes }, (_, i) => s.oferta[i] ?? 100),
      demanda: Array.from({ length: destinos }, (_, j) => s.demanda[j] ?? 100),
    }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta
        titulo="Matriz de costos, oferta y demanda"
        descripcion="Lo primero que hay que verificar en cualquier problema de transporte es el balance: si la oferta total no iguala a la demanda total, no hay solución factible sin un origen o un destino ficticio."
        acciones={
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="etiqueta">Orígenes</span>
              <input
                type="number"
                min={1}
                max={7}
                className="campo campo-numero w-20"
                value={datos.origenes.length}
                onChange={(e) => cambiarTamano(Math.max(1, Math.min(7, Number(e.target.value) || 1)), datos.destinos.length)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="etiqueta">Destinos</span>
              <input
                type="number"
                min={1}
                max={7}
                className="campo campo-numero w-20"
                value={datos.destinos.length}
                onChange={(e) => cambiarTamano(datos.origenes.length, Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              />
            </label>
            <div className="w-28">
              <CampoTexto etiqueta="Unidad de costo" valor={datos.unidadCosto} alCambiar={(v) => setDatos((s) => ({ ...s, unidadCosto: v }))} />
            </div>
            <div className="w-32">
              <CampoTexto etiqueta="Unidad de cantidad" valor={datos.unidadCantidad} alCambiar={(v) => setDatos((s) => ({ ...s, unidadCantidad: v }))} />
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div
            className={`aviso ${balanceado ? 'aviso-bien' : 'aviso-avisar'}`}
            role="status"
          >
            <span>
              {balanceado ? (
                <>
                  Oferta total {formatearNumero(totalOferta, { decimales: 0 })} = demanda total{' '}
                  {formatearNumero(totalDemanda, { decimales: 0 })} {datos.unidadCantidad}. El problema está balanceado.
                </>
              ) : (
                <>
                  Oferta total {formatearNumero(totalOferta, { decimales: 0 })} y demanda total{' '}
                  {formatearNumero(totalDemanda, { decimales: 0 })} {datos.unidadCantidad}: diferencia de{' '}
                  {formatearNumero(Math.abs(diferencia), { decimales: 0 })}. Se agregará{' '}
                  {diferencia > 0 ? 'un destino ficticio' : 'un origen ficticio'} con costo cero, y en el resultado se verá
                  qué queda {diferencia > 0 ? 'sin despachar' : 'sin atender'}.
                </>
              )}
            </span>
          </div>

          <MatrizEditable
            filas={datos.origenes}
            columnas={datos.destinos}
            valores={datos.costos}
            encabezadoFilas={`Costo unitario (${datos.unidadCosto})`}
            ofertaLateral={datos.oferta}
            demandaInferior={datos.demanda}
            alCambiarValor={(i, j, v) =>
              setDatos((s) => ({
                ...s,
                costos: s.costos.map((fila, fi) => (fi === i ? fila.map((c, cj) => (cj === j ? (v ?? 0) : c)) : fila)),
              }))
            }
            alCambiarNombreFila={(i, nombre) => setDatos((s) => ({ ...s, origenes: s.origenes.map((o, k) => (k === i ? nombre : o)) }))}
            alCambiarNombreColumna={(j, nombre) => setDatos((s) => ({ ...s, destinos: s.destinos.map((c, k) => (k === j ? nombre : c)) }))}
            alCambiarOferta={(i, v) => setDatos((s) => ({ ...s, oferta: s.oferta.map((o, k) => (k === i ? v : o)) }))}
            alCambiarDemanda={(j, v) => setDatos((s) => ({ ...s, demanda: s.demanda.map((o, k) => (k === j ? v : o)) }))}
          />
        </div>
      </Tarjeta>

      <Pestanas
        etiquetaGrupo="Método de solución inicial"
        valor={metodo}
        alCambiar={setMetodo}
        opciones={[
          { valor: 'noroeste', texto: 'Esquina noroeste' },
          { valor: 'costo_minimo', texto: 'Costo mínimo' },
          { valor: 'vogel', texto: 'Aproximación de Vogel' },
        ]}
      />

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta={`Solución inicial (${NOMBRE_METODO[metodo]})`}
              valor={formatearNumero(d.solucionInicial.costoTotal, { decimales: 0 })}
              unidad={datos.unidadCosto}
            />
            <Indicador etiqueta="Costo óptimo" valor={formatearNumero(d.solucionOptima.costoTotal, { decimales: 0 })} unidad={datos.unidadCosto} tono="bien" />
            <Indicador
              etiqueta="Ahorro de MODI"
              valor={formatearNumero(d.ahorro, { decimales: 0 })}
              unidad={datos.unidadCosto}
              tono={d.ahorro > 0 ? 'acento' : 'neutro'}
              nota={d.optimaEsInicial ? 'La solución inicial ya era óptima' : `${d.iteracionesMODI} iteración(es)`}
            />
            <Indicador
              etiqueta="Rutas activas"
              valor={rutas.filter((r) => !r.ficticia).length}
              nota={d.solucionOptima.degenerada ? 'Solución degenerada' : undefined}
              tono={d.solucionOptima.degenerada ? 'avisar' : 'neutro'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Red de envíos" descripcion="El grosor de cada trazo es proporcional a la cantidad transportada.">
              <RedTransporte problema={d.problema} rutas={rutas} unidadCantidad={datos.unidadCantidad} />
            </Tarjeta>

            <Tarjeta
              titulo="Comparación de los tres métodos iniciales"
              descripcion="Los tres llegan al mismo óptimo. La diferencia está en cuánto hay que iterar para llegar."
            >
              {comparacion.datos !== null && (
                <div className="flex flex-col gap-4">
                  <BarrasComparativas
                    etiquetaValor={`Costo de la solución inicial (${datos.unidadCosto})`}
                    descripcion="Costo de la solución inicial producida por cada método."
                    resaltarMinimo
                    datos={comparacion.datos.resultados.map((r) => ({
                      nombre: NOMBRE_METODO[r.metodo],
                      valor: r.costoInicial,
                      nota: `${r.iteraciones} iteración(es) de MODI · ${formatearNumero(r.brechaPorcentaje, { decimales: 1 })} % sobre el óptimo`,
                    }))}
                  />
                  <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                    {comparacion.interpretacion}
                  </p>
                </div>
              )}
            </Tarjeta>
          </div>

          <Tarjeta titulo="Plan de envíos óptimo">
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Origen</th>
                    <th scope="col">Destino</th>
                    <th scope="col" className="text-right">Cantidad ({datos.unidadCantidad})</th>
                    <th scope="col" className="text-right">Costo unitario</th>
                    <th scope="col" className="text-right">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {rutas.map((r, i) => (
                    <tr key={i}>
                      <td className={r.ficticia ? 'opacity-60' : 'font-semibold'}>
                        {r.origen} {r.ficticia && <Distintivo tono="neutro">ficticio</Distintivo>}
                      </td>
                      <td className={r.ficticia ? 'opacity-60' : ''}>{r.destino}</td>
                      <td className="numero">{formatearNumero(r.cantidad, { decimales: 0 })}</td>
                      <td className="numero">{formatearNumero(r.costoUnitario, { decimales: 2 })}</td>
                      <td className="numero">{formatearNumero(r.costo, { decimales: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4}>Costo total</td>
                    <td className="numero">{formatearNumero(d.solucionOptima.costoTotal, { decimales: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Tarjeta>

          {sensibilidad?.datos != null && (
            <>
              <Tarjeta
                titulo="Cuánto vale de verdad cada ruta"
                descripcion="Los multiplicadores de MODI son los precios sombra de la oferta y la demanda. La suma u + v es lo que cuesta mover una unidad más por esa ruta, dando el rodeo más barato que permita la red."
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Origen</th>
                          <th scope="col" className="text-right">u</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensibilidad.datos.u.map((x, i) => (
                          <tr key={i}>
                            <td>{x.nombre}{x.ficticio && <span className="ml-2 opacity-70">(ficticio)</span>}</td>
                            <td className="numero">{formatearNumero(x.valor, { decimales: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Destino</th>
                          <th scope="col" className="text-right">v</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensibilidad.datos.v.map((x, i) => (
                          <tr key={i}>
                            <td>{x.nombre}{x.ficticio && <span className="ml-2 opacity-70">(ficticio)</span>}</td>
                            <td className="numero">{formatearNumero(x.valor, { decimales: 2 })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="mt-3 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  Los valores individuales dependen de fijar u₁ = 0 y no significan nada por separado. Lo que sí
                  significa, y no depende de esa convención, es la suma <strong>u + v</strong> de cada ruta.
                </p>
              </Tarjeta>

              <Tarjeta
                titulo="Hasta dónde puede moverse cada flete"
                descripcion="Para una ruta que no se usa, cuánto tendría que abaratarse para entrar al plan. Para una que sí se usa, en qué intervalo puede moverse sin que convenga reacomodar los envíos."
              >
                <div className="flex flex-col gap-3">
                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Ruta</th>
                          <th scope="col" className="text-right">Envío</th>
                          <th scope="col" className="text-right">Flete</th>
                          <th scope="col" className="text-right">Costo reducido</th>
                          <th scope="col" className="text-right">Desde</th>
                          <th scope="col" className="text-right">Hasta</th>
                          <th scope="col">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensibilidad.datos.rutas.map((x) => (
                          <tr key={`${x.fila}-${x.columna}`} className={x.basica && x.envio > 0 ? 'fila-resaltada' : ''}>
                            <td>{x.origen} → {x.destino}</td>
                            <td className="numero">{x.basica ? formatearNumero(x.envio, { decimales: 0 }) : '—'}</td>
                            <td className="numero">{formatearNumero(x.costo, { decimales: 2 })}</td>
                            <td className="numero">{x.basica ? '—' : formatearNumero(x.costoReducido, { decimales: 2 })}</td>
                            <td className="numero">{x.desde === null ? 'sin límite' : formatearNumero(x.desde, { decimales: 2 })}</td>
                            <td className="numero">{x.hasta === null ? 'sin límite' : formatearNumero(x.hasta, { decimales: 2 })}</td>
                            <td>
                              {x.ficticia ? (
                                <Distintivo tono="neutro">ficticia</Distintivo>
                              ) : x.basica && x.envio === 0 ? (
                                <Distintivo tono="avisar">degeneración</Distintivo>
                              ) : x.basica ? (
                                <Distintivo tono="bien">en uso</Distintivo>
                              ) : (
                                'sin usar'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sensibilidad.datos.rutaMasCercana !== null && (
                    <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                      {sensibilidad.datos.rutaMasCercana.lectura}
                    </p>
                  )}
                </div>
              </Tarjeta>

              <ListaDiagnosticos diagnosticos={sensibilidad.diagnosticos} />
              <VisorPasos
                pasos={sensibilidad.pasos}
                titulo="Análisis de sensibilidad paso a paso"
                revelarTodo={revelarTodo}
                ocultarResultados={ocultarResultados}
              />
              <Interpretacion texto={sensibilidad.interpretacion} titulo="Decisión de negociación" />
            </>
          )}

          <VisorPasos
            pasos={resultado.pasos}
            titulo={`Procedimiento: ${NOMBRE_METODO[metodo]} y MODI`}
            revelarTodo={revelarTodo}
            ocultarResultados={ocultarResultados}
          />
          <Interpretacion texto={resultado.interpretacion} titulo="Decisión logística" />
        </>
      )}
    </div>
  );
}
