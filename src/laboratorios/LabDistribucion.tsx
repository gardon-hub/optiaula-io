/**
 * Laboratorio del módulo 4 — Distribución física de instalaciones.
 *
 * Editor visual de plano de bloques: al mover un departamento se recalculan
 * distancias, recorridos, puntaje carga-distancia, porcentaje de mejora y
 * alertas de la gráfica REL.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  DEFINICION_REL,
  CLAVES_REL,
  buscarMejorDistribucion,
  compararDistribuciones,
  resolverDistribucion,
  type CeldaPlano,
  type DatosDistribucion,
  type PlanoBloques,
} from '@/nucleo/distribucion';
import { formatearNumero } from '@/nucleo/numero';
import { Distintivo, Indicador, ListaDiagnosticos, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { EditorPlano } from '@/ui/editores';

export function LabDistribucion({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'distribucion' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const base: DatosDistribucion = useMemo(
    () => ({
      titulo,
      departamentos: datosIniciales.departamentos.map((d) => ({ ...d })),
      recorridos: datosIniciales.recorridos.map((f) => [...f]),
      plano: {
        ...datosIniciales.plano,
        asignacion: Object.fromEntries(Object.entries(datosIniciales.plano.asignacion).map(([k, v]) => [k, [...v]])),
      },
      tipoDistancia: datosIniciales.tipoDistancia,
      relaciones: datosIniciales.relaciones.map((r) => ({ ...r, claves: [...r.claves] })),
      unidadRecorridos: datosIniciales.unidadRecorridos,
    }),
    [titulo, datosIniciales],
  );

  const [asignacion, setAsignacion] = useState<Record<string, CeldaPlano[]>>(() =>
    Object.fromEntries(Object.entries(base.plano.asignacion).map(([k, v]) => [k, v.map((c) => ({ ...c }))])),
  );

  const fijos = useMemo(
    () => Object.fromEntries(base.departamentos.filter((d) => d.fijo === true).map((d) => [d.id, true])),
    [base.departamentos],
  );

  // Memorizado a propósito: si el plano se reconstruyera en cada render, el
  // `useMemo` de abajo cambiaría de dependencia siempre y volvería a resolver la
  // distribución en cada pulsación, que es justo lo que el memo evita.
  const planoPropuesto: PlanoBloques = useMemo(
    () => ({ ...base.plano, id: 'propuesta', nombre: 'Su propuesta', asignacion }),
    [base.plano, asignacion],
  );

  const resultadoBase = useMemo(() => resolverDistribucion(base), [base]);
  const resultadoPropuesto = useMemo(
    () => resolverDistribucion({ ...base, plano: planoPropuesto }),
    [base, planoPropuesto],
  );

  const referencia = useMemo(() => {
    if (datosIniciales.planoReferencia === null) return null;
    return resolverDistribucion({
      ...base,
      plano: {
        ...datosIniciales.planoReferencia,
        asignacion: Object.fromEntries(
          Object.entries(datosIniciales.planoReferencia.asignacion).map(([k, v]) => [k, [...v]]),
        ),
      },
    });
  }, [base, datosIniciales.planoReferencia]);

  const comparacion = useMemo(() => {
    if (resultadoBase.datos === null || resultadoPropuesto.datos === null) return null;
    return compararDistribuciones(resultadoBase.datos, resultadoPropuesto.datos, 'Distribución original', 'Su propuesta');
  }, [resultadoBase.datos, resultadoPropuesto.datos]);

  const mejor = useMemo(() => buscarMejorDistribucion(base, Object.fromEntries(
    base.departamentos.filter((d) => d.fijo === true).map((d) => [d.id, base.plano.asignacion[d.id] ?? [{ fila: 0, columna: 0 }]]),
  )), [base]);

  const mover = (idDepartamento: string, destino: CeldaPlano): void => {
    setAsignacion((actual) => {
      const copia: Record<string, CeldaPlano[]> = Object.fromEntries(
        Object.entries(actual).map(([k, v]) => [k, v.map((c) => ({ ...c }))]),
      );

      const ocupante = Object.entries(copia).find(([id, celdas]) =>
        id !== idDepartamento && celdas.some((c) => c.fila === destino.fila && c.columna === destino.columna),
      );

      const origen = copia[idDepartamento]?.[0];
      if (origen === undefined) return actual;
      if (ocupante !== undefined && fijos[ocupante[0]] === true) return actual;

      copia[idDepartamento] = [{ ...destino }];
      if (ocupante !== undefined) copia[ocupante[0]] = [{ ...origen }];

      return copia;
    });
  };

  const d = resultadoPropuesto.datos;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,22rem)]">
        <Tarjeta
          titulo="Plano de bloques"
          descripcion="Seleccione un departamento y luego el bloque de destino: los dos intercambian posición y todos los cálculos se rehacen."
          acciones={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="boton boton-secundario boton-pequeno"
                onClick={() =>
                  setAsignacion(Object.fromEntries(Object.entries(base.plano.asignacion).map(([k, v]) => [k, v.map((c) => ({ ...c }))])))
                }
              >
                Volver al plano original
              </button>
              <button
                type="button"
                className="boton boton-produccion boton-pequeno"
                onClick={() =>
                  setAsignacion(Object.fromEntries(Object.entries(mejor.asignacion).map(([k, v]) => [k, v.map((c) => ({ ...c }))])))
                }
                title={
                  mejor.exhaustiva
                    ? `Búsqueda exhaustiva sobre ${mejor.permutacionesEvaluadas} permutaciones`
                    : 'Heurística de intercambio por pares: buena, pero no garantiza el óptimo global'
                }
              >
                Buscar la mejor distribución
              </button>
            </div>
          }
        >
          <EditorPlano
            plano={planoPropuesto}
            departamentos={base.departamentos}
            alMover={mover}
            fijos={fijos}
            alertas={d?.alertas ?? []}
            titulo="Plano de bloques propuesto"
          />

          <p className="mt-2 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
            {mejor.exhaustiva
              ? `El botón de búsqueda evalúa las ${formatearNumero(mejor.permutacionesEvaluadas, { decimales: 0 })} permutaciones posibles: el resultado es el mínimo global.`
              : mejor.limitadaPorArea
                ? 'Aquí los departamentos ocupan áreas distintas, así que la búsqueda solo puede intercambiar los que necesitan la misma cantidad de bloques: los demás se quedan donde están. Lo que encuentre es una mejora, no el mínimo global. Queda declarado.'
                : 'Con este número de departamentos la búsqueda usa una heurística de intercambio por pares: encuentra una buena distribución, pero no garantiza el mínimo global. Queda declarado.'}
          </p>
        </Tarjeta>

        <div className="flex flex-col gap-3">
          <Indicador
            etiqueta="Puntaje carga-distancia"
            valor={d === null ? '—' : formatearNumero(d.puntajeCD, { decimales: 0 })}
            tono={comparacion?.datos?.mejora === true ? 'bien' : 'acento'}
            nota="Menor es mejor"
          />
          <Indicador
            etiqueta="Plano original"
            valor={resultadoBase.datos === null ? '—' : formatearNumero(resultadoBase.datos.puntajeCD, { decimales: 0 })}
          />
          <Indicador
            etiqueta="Mejora sobre el original"
            valor={comparacion?.datos == null ? '—' : `${formatearNumero(comparacion.datos.mejoraPorcentaje, { decimales: 1, signoExplicito: true })} %`}
            tono={comparacion?.datos?.mejora === true ? 'bien' : comparacion?.datos == null ? 'neutro' : 'mal'}
          />
          <Indicador
            etiqueta="Mejor puntaje alcanzable"
            valor={formatearNumero(mejor.puntajeCD, { decimales: 0 })}
            nota={mejor.exhaustiva ? 'Mínimo global verificado' : 'Estimado por heurística'}
          />
          {referencia?.datos != null && (
            <Indicador
              etiqueta="Otra distribución del material"
              valor={formatearNumero(referencia.datos.puntajeCD, { decimales: 0 })}
              // El nombre lo pone el ejercicio. Llamarla «solución» sería mentir
              // en los casos donde el material propone una distribución peor.
              nota={datosIniciales.planoReferencia?.nombre ?? 'La distribución que propone el material'}
            />
          )}
          <Indicador
            etiqueta="Distancia media ponderada"
            valor={d?.distanciaMediaPonderada == null ? '—' : formatearNumero(d.distanciaMediaPonderada, { decimales: 2 })}
            unidad="bloques"
          />
        </div>
      </div>

      <ListaDiagnosticos diagnosticos={resultadoPropuesto.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta
              titulo="Relaciones y su costo"
              descripcion="Ordenadas por su aporte al puntaje. Acercar los pares de arriba es la mejora de mayor impacto."
            >
              <div className="contenedor-tabla" style={{ maxHeight: '22rem' }}>
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Relación</th>
                      <th scope="col" className="text-right">Recorridos</th>
                      <th scope="col" className="text-right">Distancia</th>
                      <th scope="col" className="text-right">Carga × distancia</th>
                      <th scope="col">REL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...d.pares]
                      .sort((a, b) => b.cargaDistancia - a.cargaDistancia)
                      .map((p, i) => (
                        <tr key={i}>
                          <td>
                            {p.nombreDesde} ↔ {p.nombreHasta}
                          </td>
                          <td className="numero">{formatearNumero(p.recorridos, { decimales: 0 })}</td>
                          <td className="numero">{formatearNumero(p.distancia, { decimales: 2 })}</td>
                          <td className="numero font-semibold">{formatearNumero(p.cargaDistancia, { decimales: 1 })}</td>
                          <td>
                            {p.clasificacion === null ? (
                              '—'
                            ) : (
                              <Distintivo tono={p.clasificacion === 'N' ? 'mal' : p.clasificacion === 'A' ? 'avisar' : 'neutro'} titulo={DEFINICION_REL[p.clasificacion]}>
                                {p.clasificacion}
                              </Distintivo>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="numero">{formatearNumero(d.recorridosTotales, { decimales: 0 })}</td>
                      {/* La distancia y la clasificación REL no se totalizan. El guion
                          lo dice; una celda vacía un lector de pantalla la anuncia
                          como «en blanco», que no distingue «no aplica» de «falta». */}
                      <td>—</td>
                      <td className="numero">{formatearNumero(d.puntajeCD, { decimales: 1 })}</td>
                      <td>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Tarjeta>

            <Tarjeta
              titulo="Gráfica REL"
              descripcion="El puntaje carga-distancia solo cuenta viajes. La gráfica REL agrega lo que los viajes no capturan: ruido, seguridad, supervisión y personal compartido."
            >
              {base.relaciones.length === 0 ? (
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  Este ejercicio no define relaciones de proximidad: la decisión se toma solo con carga-distancia.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="contenedor-tabla" style={{ maxHeight: '18rem' }}>
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Relación</th>
                          <th scope="col">Clasificación</th>
                          <th scope="col">Motivo</th>
                          <th scope="col">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {base.relaciones.map((r, i) => {
                          const incumple = d.alertas.some((a) => a.desde === r.desde && a.hasta === r.hasta);
                          const nombreA = base.departamentos.find((x) => x.id === r.desde)?.nombre ?? r.desde;
                          const nombreB = base.departamentos.find((x) => x.id === r.hasta)?.nombre ?? r.hasta;
                          return (
                            <tr key={i} className={incumple ? 'fila-resaltada' : ''}>
                              <td>
                                {nombreA} ↔ {nombreB}
                              </td>
                              <td>
                                <Distintivo tono={r.clasificacion === 'N' ? 'mal' : r.clasificacion === 'A' ? 'avisar' : 'neutro'}>
                                  {r.clasificacion} — {DEFINICION_REL[r.clasificacion]}
                                </Distintivo>
                              </td>
                              <td className="text-xs">{r.claves.map((k) => CLAVES_REL[k] ?? k).join(', ') || '—'}</td>
                              <td>
                                {incumple ? <Distintivo tono="mal">Incumple</Distintivo> : <Distintivo tono="bien">Cumple</Distintivo>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    {(Object.keys(DEFINICION_REL) as (keyof typeof DEFINICION_REL)[]).map((k) => (
                      <div key={k} className="flex gap-1.5">
                        <dt className="dato font-bold" style={{ color: 'var(--tinta-media)' }}>
                          {k}
                        </dt>
                        <dd style={{ color: 'var(--tinta-tenue)' }}>{DEFINICION_REL[k]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </Tarjeta>
          </div>

          {comparacion?.datos != null && (
            <>
              <VisorPasos pasos={comparacion.pasos} titulo="Comparación con el plano original" revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
              <Interpretacion texto={comparacion.interpretacion} titulo="Lectura de la comparación" />
            </>
          )}

          <VisorPasos pasos={resultadoPropuesto.pasos} titulo="Cálculo del puntaje carga-distancia" revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultadoPropuesto.interpretacion} />
        </>
      )}
    </div>
  );
}
