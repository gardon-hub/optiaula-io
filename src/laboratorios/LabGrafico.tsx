/**
 * Laboratorio del módulo 8 — Método gráfico de programación lineal.
 *
 * Región factible dibujada en vivo, línea de indiferencia que se desplaza con
 * un control deslizante, tabla de vértices con el óptimo resaltado y análisis
 * de holguras. Cambiar un coeficiente vuelve a dibujar todo al instante, que
 * es la forma más rápida de entender por qué el óptimo se mueve de una esquina
 * a otra.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  SIMBOLO_RELACION,
  analizarSensibilidad,
  decimalesPrecio,
  resolverGrafico,
  type DatosGrafico,
  type Relacion,
  type Restriccion,
} from '@/nucleo/grafico';
import { formatearNumero } from '@/nucleo/numero';
import type { Objetivo } from '@/nucleo/tipos';
import {
  CampoNumero,
  CampoTexto,
  Deslizador,
  Distintivo,
  Indicador,
  Interruptor,
  ListaDiagnosticos,
  Selector,
  Tarjeta,
} from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { GraficaProgramacionLineal } from '@/ui/graficas';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

export function LabGrafico({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'grafico' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [datos, setDatos] = useState<DatosGrafico>(() => ({
    titulo,
    objetivo: datosIniciales.objetivo,
    nombreX: datosIniciales.nombreX,
    nombreY: datosIniciales.nombreY,
    unidadVariables: datosIniciales.unidadVariables,
    coefX: datosIniciales.coefX,
    coefY: datosIniciales.coefY,
    nombreObjetivo: datosIniciales.nombreObjetivo,
    unidadObjetivo: datosIniciales.unidadObjetivo,
    restricciones: datosIniciales.restricciones.map((r) => ({ ...r })),
    noNegatividad: datosIniciales.noNegatividad,
  }));

  const [mostrarIndiferencia, setMostrarIndiferencia] = useState(true);
  const [zManual, setZManual] = useState<number | null>(null);
  const [recursoSimulado, setRecursoSimulado] = useState<number | null>(null);

  const resultado = useMemo(() => resolverGrafico(datos), [datos]);
  const d = resultado.datos;

  const sensibilidad = useMemo(() => (d === null ? null : analizarSensibilidad(d)), [d]);

  /**
   * Compara el efecto real de cambiar un recurso contra lo que predice el
   * precio sombra. Es la comprobación que convierte el número en algo creíble.
   */
  const simulacion = useMemo(() => {
    const masValioso = sensibilidad?.datos?.recursoMasValioso ?? null;
    if (masValioso === null || recursoSimulado === null || d?.valorOptimo == null) return null;

    const movido = resolverGrafico({
      ...datos,
      restricciones: datos.restricciones.map((r) => (r.id === masValioso.restriccion.id ? { ...r, c: recursoSimulado } : r)),
    });

    const delta = recursoSimulado - masValioso.restriccion.c;
    const dentroDelRango =
      (masValioso.rangoDesde === null || recursoSimulado >= masValioso.rangoDesde - 1e-9) &&
      (masValioso.rangoHasta === null || recursoSimulado <= masValioso.rangoHasta + 1e-9);

    return {
      zReal: movido.datos?.valorOptimo ?? null,
      zPredicho: d.valorOptimo + masValioso.valor * delta,
      dentroDelRango,
    };
  }, [sensibilidad, recursoSimulado, d, datos]);

  // El deslizador de la línea de indiferencia se recentra cuando cambia el
  // problema, para que siempre arranque en el valor óptimo.
  useEffect(() => {
    setZManual(null);
    setRecursoSimulado(null);
  }, [datos]);

  const rangoZ = useMemo(() => {
    if (d === null || d.vertices.length === 0) return { min: 0, max: 1, paso: 0.1 };
    const valores = d.vertices.map((v) => v.valorObjetivo);
    const min = Math.min(0, ...valores);
    const max = Math.max(...valores) * 1.35 || 1;
    const rango = max - min;
    return { min, max, paso: rango / 100 };
  }, [d]);

  const z = zManual ?? d?.valorOptimo ?? rangoZ.max / 2;

  const columnas: ColumnaEditable<Restriccion>[] = [
    { clave: 'nombre', encabezado: 'Restricción', tipo: 'texto', ancho: '13rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'a', encabezado: `Coef. ${datos.nombreX}`, tipo: 'numero', ancho: '7rem', obtener: (f) => f.a, fijar: (f, v) => ({ ...f, a: Number(v) || 0 }) },
    { clave: 'b', encabezado: `Coef. ${datos.nombreY}`, tipo: 'numero', ancho: '7rem', obtener: (f) => f.b, fijar: (f, v) => ({ ...f, b: Number(v) || 0 }) },
    {
      clave: 'relacion',
      encabezado: 'Relación',
      tipo: 'seleccion',
      ancho: '5.5rem',
      opciones: [
        { valor: '<=', texto: '≤' },
        { valor: '>=', texto: '≥' },
        { valor: '=', texto: '=' },
      ],
      obtener: (f) => f.relacion,
      fijar: (f, v) => ({ ...f, relacion: v as Relacion }),
    },
    { clave: 'c', encabezado: 'Disponible', tipo: 'numero', ancho: '7rem', obtener: (f) => f.c, fijar: (f, v) => ({ ...f, c: Number(v) || 0 }) },
    { clave: 'unidad', encabezado: 'Unidad', tipo: 'texto', ancho: '7rem', obtener: (f) => f.unidad, fijar: (f, v) => ({ ...f, unidad: v }) },
  ];

  const tonoDesenlace =
    d === null
      ? 'mal'
      : d.desenlace === 'unica'
        ? 'bien'
        : d.desenlace === 'multiples'
          ? 'avisar'
          : 'mal';

  const textoDesenlace =
    d === null
      ? 'sin solución'
      : d.desenlace === 'unica'
        ? 'solución única'
        : d.desenlace === 'multiples'
          ? 'soluciones múltiples'
          : d.desenlace === 'no_acotada'
            ? 'región no acotada'
            : 'problema infactible';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Función objetivo"
          descripcion="Define qué se quiere lograr. Cambiar un coeficiente inclina la línea de indiferencia y puede mover el óptimo a otra esquina."
        >
          <div className="flex flex-col gap-3">
            <Selector
              etiqueta="Objetivo"
              valor={datos.objetivo}
              opciones={[
                { valor: 'maximizar', texto: 'Maximizar (margen, utilidad, producción)' },
                { valor: 'minimizar', texto: 'Minimizar (costo, tiempo, desperdicio)' },
              ]}
              alCambiar={(v) => setDatos((s) => ({ ...s, objetivo: v as Objetivo }))}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <CampoTexto etiqueta="Primera variable" valor={datos.nombreX} alCambiar={(v) => setDatos((s) => ({ ...s, nombreX: v }))} />
              <CampoTexto etiqueta="Segunda variable" valor={datos.nombreY} alCambiar={(v) => setDatos((s) => ({ ...s, nombreY: v }))} />
              <CampoNumero
                etiqueta={`Aporte por ${datos.nombreX}`}
                unidad={datos.unidadObjetivo}
                valor={datos.coefX}
                alCambiar={(v) => setDatos((s) => ({ ...s, coefX: v ?? 0 }))}
              />
              <CampoNumero
                etiqueta={`Aporte por ${datos.nombreY}`}
                unidad={datos.unidadObjetivo}
                valor={datos.coefY}
                alCambiar={(v) => setDatos((s) => ({ ...s, coefY: v ?? 0 }))}
              />
            </div>

            <p
              className="dato rounded-lg px-3 py-2 text-center text-[0.9375rem] font-semibold"
              style={{ background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}
            >
              {datos.objetivo === 'maximizar' ? 'Max' : 'Min'} Z = {formatearNumero(datos.coefX, { decimales: datos.coefX % 1 === 0 ? 0 : 2 })}{' '}
              {datos.nombreX} + {formatearNumero(datos.coefY, { decimales: datos.coefY % 1 === 0 ? 0 : 2 })} {datos.nombreY}
            </p>

            <Interruptor
              etiqueta="Exigir variables no negativas"
              activo={datos.noNegatividad}
              alCambiar={(v) => setDatos((s) => ({ ...s, noNegatividad: v }))}
              ayuda="Casi siempre debe estar activo: no se produce una cantidad negativa de nada."
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Restricciones" descripcion="Cada fila es una recta en la gráfica. Las de tipo ≥ se dibujan punteadas.">
          <div className="flex flex-col gap-3">
            <TablaEditable
              filas={datos.restricciones}
              columnas={columnas}
              clave={(f, i) => `${f.id}-${i}`}
              alCambiar={(restricciones) => setDatos((s) => ({ ...s, restricciones }))}
              alAgregar={() =>
                setDatos((s) => ({
                  ...s,
                  restricciones: [
                    ...s.restricciones,
                    { id: `r${s.restricciones.length + 1}-${Date.now()}`, nombre: `Restricción ${s.restricciones.length + 1}`, a: 1, b: 1, relacion: '<=', c: 10, unidad: 'unidades' },
                  ],
                }))
              }
              alEliminar={(i) => setDatos((s) => ({ ...s, restricciones: s.restricciones.filter((_, k) => k !== i) }))}
              textoAgregar="Agregar restricción"
            />

            <ul className="flex flex-col gap-1 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              {datos.restricciones.map((r) => (
                <li key={r.id} className="dato">
                  {formatearNumero(r.a, { decimales: r.a % 1 === 0 ? 0 : 2 })} {datos.nombreX} +{' '}
                  {formatearNumero(r.b, { decimales: r.b % 1 === 0 ? 0 : 2 })} {datos.nombreY} {SIMBOLO_RELACION[r.relacion]}{' '}
                  {formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })}
                  <span className="ml-2 opacity-70">({r.nombre})</span>
                </li>
              ))}
              {datos.noNegatividad && (
                <li className="dato">
                  {datos.nombreX} ≥ 0, {datos.nombreY} ≥ 0 <span className="ml-2 opacity-70">(no negatividad)</span>
                </li>
              )}
            </ul>
          </div>
        </Tarjeta>
      </div>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Desenlace" valor={<span className="text-base">{textoDesenlace}</span>} tono={tonoDesenlace} />
        <Indicador
          etiqueta={`${datos.nombreX} óptimo`}
          valor={d?.optimo === null || d === null ? '—' : formatearNumero(d.optimo.punto.x, { decimales: 2 })}
          unidad={datos.unidadVariables}
          tono="acento"
        />
        <Indicador
          etiqueta={`${datos.nombreY} óptimo`}
          valor={d?.optimo === null || d === null ? '—' : formatearNumero(d.optimo.punto.y, { decimales: 2 })}
          unidad={datos.unidadVariables}
          tono="acento"
        />
        <Indicador
          etiqueta={`Z ${datos.objetivo === 'maximizar' ? 'máximo' : 'mínimo'}`}
          valor={d?.valorOptimo == null ? '—' : formatearNumero(d.valorOptimo, { decimales: 2 })}
          unidad={datos.unidadObjetivo}
          tono={d?.valorOptimo == null ? 'neutro' : 'bien'}
        />
      </div>

      {d !== null && (
        <>
          <Tarjeta
            titulo="Región factible"
            descripcion="La zona verde cumple todas las restricciones a la vez. El teorema fundamental garantiza que el óptimo está en una de sus esquinas."
            acciones={
              <Interruptor
                etiqueta="Línea de indiferencia"
                activo={mostrarIndiferencia}
                alCambiar={setMostrarIndiferencia}
              />
            }
          >
            <div className="flex flex-col gap-4">
              <GraficaProgramacionLineal resultado={d} zIndiferencia={z} mostrarIndiferencia={mostrarIndiferencia} />

              {mostrarIndiferencia && d.desenlace !== 'infactible' && (
                <div className="flex flex-col gap-2">
                  <Deslizador
                    etiqueta="Desplazar la línea de indiferencia"
                    valor={z}
                    minimo={rangoZ.min}
                    maximo={rangoZ.max}
                    paso={rangoZ.paso}
                    unidad={datos.unidadObjetivo}
                    alCambiar={setZManual}
                    formatear={(v) => `Z = ${formatearNumero(v, { decimales: 2 })}`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="boton boton-secundario boton-pequeno"
                      onClick={() => setZManual(null)}
                      disabled={zManual === null}
                    >
                      Volver al valor óptimo
                    </button>
                    <span className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                      {d.valorOptimo !== null && z > d.valorOptimo + rangoZ.paso
                        ? 'La línea ya salió de la región factible: ese valor de Z no es alcanzable.'
                        : d.valorOptimo !== null && z < d.valorOptimo - rangoZ.paso
                          ? 'La línea todavía cruza la región: se puede seguir mejorando.'
                          : 'La línea toca la región en el último punto posible: ahí está el óptimo.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Tarjeta>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Vértices de la región factible" descripcion="El óptimo se busca evaluando la función objetivo en cada esquina.">
              {d.vertices.length === 0 ? (
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  La región factible está vacía: no hay vértices que evaluar.
                </p>
              ) : (
                <div className="contenedor-tabla">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Vértice</th>
                        <th scope="col" className="text-right">{datos.nombreX}</th>
                        <th scope="col" className="text-right">{datos.nombreY}</th>
                        <th scope="col" className="text-right">Z</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...d.vertices]
                        .sort((a, b) => (datos.objetivo === 'maximizar' ? b.valorObjetivo - a.valorObjetivo : a.valorObjetivo - b.valorObjetivo))
                        .map((v, i) => (
                          <tr key={i} className={v.optimo ? 'fila-resaltada' : ''}>
                            <td className="font-bold">{String.fromCharCode(65 + d.vertices.indexOf(v))}</td>
                            <td className="numero">{formatearNumero(v.punto.x, { decimales: 2 })}</td>
                            <td className="numero">{formatearNumero(v.punto.y, { decimales: 2 })}</td>
                            <td className="numero font-semibold">{formatearNumero(v.valorObjetivo, { decimales: 2 })}</td>
                            <td>{v.optimo ? <Distintivo tono="avisar">óptimo</Distintivo> : '—'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Tarjeta>

            <Tarjeta
              titulo="Holguras y recursos agotados"
              descripcion="Solo los recursos que se agotan limitan el resultado. Conseguir más de uno que sobra no cambia nada."
            >
              {d.holguras.length === 0 ? (
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  Sin solución óptima no hay holguras que calcular.
                </p>
              ) : (
                <div className="contenedor-tabla">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Restricción</th>
                        <th scope="col" className="text-right">Disponible</th>
                        <th scope="col" className="text-right">Consumo</th>
                        <th scope="col" className="text-right">Holgura</th>
                        <th scope="col">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.holguras.map((h) => (
                        <tr key={h.restriccion.id} className={h.activa ? 'fila-resaltada' : ''}>
                          <td>{h.restriccion.nombre}</td>
                          <td className="numero">{formatearNumero(h.restriccion.c, { decimales: 2 })}</td>
                          <td className="numero">{formatearNumero(h.consumo, { decimales: 2 })}</td>
                          <td className="numero">{formatearNumero(h.holgura, { decimales: 2 })}</td>
                          <td>
                            {h.activa ? (
                              <Distintivo tono="avisar">activa — agotado</Distintivo>
                            ) : (
                              <Distintivo tono="bien">sobra capacidad</Distintivo>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Tarjeta>
          </div>
        </>
      )}

      {d !== null && sensibilidad !== null && (
        <>
          <Tarjeta
            titulo="Precios sombra"
            descripcion="Cuánto ganaría por cada unidad adicional de cada recurso. Es el precio máximo que conviene pagar: por encima de él, comprar destruye margen."
            acciones={
              sensibilidad.datos !== null && sensibilidad.datos.recursoMasValioso !== null ? (
                <Distintivo tono="avisar">
                  Invertir primero en {sensibilidad.datos.recursoMasValioso.restriccion.nombre.toLowerCase()}
                </Distintivo>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-3">
              <ListaDiagnosticos diagnosticos={sensibilidad.diagnosticos} />

              {sensibilidad.datos !== null && (
                <div className="contenedor-tabla">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Recurso</th>
                        <th scope="col" className="text-right">Disponible</th>
                        <th scope="col" className="text-right">Precio sombra</th>
                        <th scope="col" className="text-right">Rango desde</th>
                        <th scope="col" className="text-right">Rango hasta</th>
                        <th scope="col">Qué significa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensibilidad.datos.preciosSombra.map((s) => (
                        <tr key={s.restriccion.id} className={s.activa ? 'fila-resaltada' : ''}>
                          <td className={s.activa ? 'font-semibold' : ''}>{s.restriccion.nombre}</td>
                          <td className="numero">
                            {formatearNumero(s.restriccion.c, { decimales: 2 })}{' '}
                            <span style={{ color: 'var(--tinta-tenue)' }}>{s.restriccion.unidad}</span>
                          </td>
                          <td className="numero font-semibold" style={{ color: s.activa ? 'var(--avisar)' : 'var(--tinta-tenue)' }}>
                            {formatearNumero(s.valor, { decimales: decimalesPrecio(s.valor) })}
                          </td>
                          <td className="numero">{s.rangoDesde === null ? 'sin límite' : formatearNumero(s.rangoDesde, { decimales: 2 })}</td>
                          <td className="numero">{s.rangoHasta === null ? 'sin límite' : formatearNumero(s.rangoHasta, { decimales: 2 })}</td>
                          <td className="max-w-md text-xs" style={{ color: 'var(--tinta-media)' }}>
                            {s.lectura}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sensibilidad.datos !== null && sensibilidad.datos.recursoMasValioso !== null && (
                <div className="tarjeta-plana flex flex-col gap-3 p-3">
                  <p className="etiqueta">Comprobarlo en vivo</p>
                  <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                    Mueva la disponibilidad de{' '}
                    <strong>{sensibilidad.datos.recursoMasValioso.restriccion.nombre.toLowerCase()}</strong> y compare el cambio
                    real de Z con lo que predice el precio sombra. Dentro del rango coinciden exactamente; fuera, la predicción
                    se queda corta.
                  </p>

                  <Deslizador
                    etiqueta={`Disponibilidad de ${sensibilidad.datos.recursoMasValioso.restriccion.nombre.toLowerCase()}`}
                    valor={recursoSimulado ?? sensibilidad.datos.recursoMasValioso.restriccion.c}
                    minimo={Math.max(0, sensibilidad.datos.recursoMasValioso.restriccion.c * 0.4)}
                    maximo={sensibilidad.datos.recursoMasValioso.restriccion.c * 2}
                    paso={Math.max(0.01, sensibilidad.datos.recursoMasValioso.restriccion.c / 200)}
                    unidad={sensibilidad.datos.recursoMasValioso.restriccion.unidad}
                    alCambiar={setRecursoSimulado}
                  />

                  {simulacion !== null && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Indicador
                        etiqueta="Z con el recurso original"
                        valor={formatearNumero(d.valorOptimo ?? 0, { decimales: 2 })}
                        unidad={datos.unidadObjetivo}
                      />
                      <Indicador
                        etiqueta="Z real con el cambio"
                        valor={simulacion.zReal === null ? 'sin solución' : formatearNumero(simulacion.zReal, { decimales: 2 })}
                        unidad={datos.unidadObjetivo}
                        tono="bien"
                      />
                      <Indicador
                        etiqueta="Z que predice el precio sombra"
                        valor={formatearNumero(simulacion.zPredicho, { decimales: 2 })}
                        unidad={datos.unidadObjetivo}
                        tono={simulacion.dentroDelRango ? 'bien' : 'mal'}
                        nota={
                          simulacion.dentroDelRango
                            ? 'Dentro del rango: la predicción es exacta'
                            : 'Fuera del rango: la predicción sobreestima'
                        }
                      />
                    </div>
                  )}

                  {recursoSimulado !== null && (
                    <button type="button" className="boton boton-suave boton-pequeno self-start" onClick={() => setRecursoSimulado(null)}>
                      Volver a la disponibilidad original
                    </button>
                  )}
                </div>
              )}
            </div>
          </Tarjeta>

          {sensibilidad.datos !== null && (
            <Tarjeta
              titulo="Rango de optimalidad de los coeficientes"
              descripcion="Cuánto pueden moverse los precios antes de que convenga cambiar el plan de producción. Dentro del rango cambia la ganancia, no la decisión."
            >
              <div className="contenedor-tabla">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Coeficiente</th>
                      <th scope="col" className="text-right">Valor actual</th>
                      <th scope="col" className="text-right">Desde</th>
                      <th scope="col" className="text-right">Hasta</th>
                      <th scope="col">Margen de variación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensibilidad.datos.rangosCoeficientes.map((r) => (
                      <tr key={r.variable}>
                        <td>Aporte por {r.nombre}</td>
                        <td className="numero font-semibold">{formatearNumero(r.valorActual, { decimales: 2 })}</td>
                        <td className="numero">{r.desde === null ? 'sin límite' : formatearNumero(r.desde, { decimales: 2 })}</td>
                        <td className="numero">{r.hasta === null ? 'sin límite' : formatearNumero(r.hasta, { decimales: 2 })}</td>
                        <td className="text-xs" style={{ color: 'var(--tinta-media)' }}>
                          {r.desde === null && r.hasta === null
                            ? 'El plan no cambia con ningún precio.'
                            : `El plan actual se sostiene mientras el aporte por ${r.nombre} se mantenga en ese intervalo. Fuera de él, el óptimo salta a otra esquina.`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          )}

          <VisorPasos
            pasos={sensibilidad.pasos}
            titulo="Análisis de sensibilidad paso a paso"
            revelarTodo={revelarTodo}
            ocultarResultados={ocultarResultados}
          />
          {sensibilidad.datos !== null && (
            <Interpretacion texto={sensibilidad.interpretacion} titulo="Decisión de inversión" />
          )}
        </>
      )}

      <VisorPasos pasos={resultado.pasos} titulo="Procedimiento del método gráfico" revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
      <Interpretacion texto={resultado.interpretacion} />
    </div>
  );
}
