/**
 * Laboratorio del módulo 2 — Productividad.
 *
 * Tabla editable de insumos, tratamiento configurable del inventario en
 * proceso, comparación gráfica entre recursos, análisis de sensibilidad y
 * comparación entre dos periodos.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  EXPLICACION_TRATAMIENTO,
  NOMBRE_CATEGORIA,
  compararPeriodos,
  costoInsumo,
  resolverProductividad,
  type CategoriaInsumo,
  type DatosProductividad,
  type Insumo,
  type TratamientoEnProceso,
} from '@/nucleo/productividad';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, Deslizador, Distintivo, Indicador, ListaDiagnosticos, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { BarrasComparativas } from '@/ui/graficas';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

const CATEGORIAS: readonly { valor: CategoriaInsumo; texto: string }[] = (
  Object.keys(NOMBRE_CATEGORIA) as CategoriaInsumo[]
).map((c) => ({ valor: c, texto: NOMBRE_CATEGORIA[c] }));

export function LabProductividad({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'productividad' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [datos, setDatos] = useState<DatosProductividad>(() => ({
    titulo,
    periodo: 'Periodo actual',
    moneda: datosIniciales.moneda,
    insumos: datosIniciales.insumos.map((i) => ({ ...i })),
    produccionTerminada: datosIniciales.produccionTerminada,
    unidadProduccion: datosIniciales.unidadProduccion,
    inventarioEnProceso: datosIniciales.inventarioEnProceso,
    gradoAvance: datosIniciales.gradoAvance,
    tratamiento: datosIniciales.tratamiento,
    precioVenta: datosIniciales.precioVenta,
    costoTotalDeclarado: datosIniciales.costoTotalDeclarado,
  }));

  const [comparar, setComparar] = useState(false);
  const [factorPrecio, setFactorPrecio] = useState(100);
  const [factorProduccion, setFactorProduccion] = useState(100);

  const resultado = useMemo(() => resolverProductividad(datos), [datos]);
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';

  const escenario = useMemo(
    () =>
      resolverProductividad({
        ...datos,
        titulo: `${datos.titulo} — escenario`,
        precioVenta: (datos.precioVenta * factorPrecio) / 100,
        produccionTerminada: (datos.produccionTerminada * factorProduccion) / 100,
      }),
    [datos, factorPrecio, factorProduccion],
  );

  const comparacion = useMemo(() => {
    if (!comparar || resultado.datos === null || escenario.datos === null) return null;
    return compararPeriodos(resultado.datos, escenario.datos);
  }, [comparar, resultado.datos, escenario.datos]);

  const columnas: ColumnaEditable<Insumo>[] = [
    {
      clave: 'nombre',
      encabezado: 'Insumo',
      tipo: 'texto',
      ancho: '16rem',
      obtener: (f) => f.nombre,
      fijar: (f, v) => ({ ...f, nombre: v }),
    },
    {
      clave: 'categoria',
      encabezado: 'Categoría',
      tipo: 'seleccion',
      ancho: '9rem',
      opciones: CATEGORIAS.map((c) => ({ valor: c.valor, texto: c.texto })),
      obtener: (f) => f.categoria,
      fijar: (f, v) => ({ ...f, categoria: v as CategoriaInsumo }),
    },
    {
      clave: 'cantidad',
      encabezado: 'Cantidad',
      tipo: 'numero',
      ancho: '7rem',
      obtener: (f) => f.cantidad,
      fijar: (f, v) => ({ ...f, cantidad: Number(v) || 0 }),
    },
    {
      clave: 'unidad',
      encabezado: 'Unidad',
      tipo: 'texto',
      ancho: '6rem',
      obtener: (f) => f.unidad,
      fijar: (f, v) => ({ ...f, unidad: v }),
    },
    {
      clave: 'costoUnitario',
      encabezado: 'Costo unitario',
      tipo: 'numero',
      ancho: '7rem',
      unidad: simbolo,
      obtener: (f) => f.costoUnitario,
      fijar: (f, v) => ({ ...f, costoUnitario: Number(v) || 0 }),
    },
  ];

  const d = resultado.datos;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta
        titulo="Insumos consumidos en el periodo"
        descripcion="Cada insumo se valora multiplicando su cantidad por el costo unitario. Los insumos declarados directamente como monto llevan «L» en la unidad y costo unitario 1."
      >
        <TablaEditable
          filas={datos.insumos}
          columnas={columnas}
          clave={(f, i) => `${f.id}-${i}`}
          alCambiar={(insumos) => setDatos((s) => ({ ...s, insumos }))}
          alAgregar={() =>
            setDatos((s) => ({
              ...s,
              insumos: [
                ...s.insumos,
                { id: `ins-${s.insumos.length + 1}-${Date.now()}`, nombre: 'Nuevo insumo', categoria: 'otros', cantidad: 0, unidad: 'unidad', costoUnitario: 0 },
              ],
            }))
          }
          alEliminar={(i) => setDatos((s) => ({ ...s, insumos: s.insumos.filter((_, k) => k !== i) }))}
          textoAgregar="Agregar insumo"
        />

        {d !== null && (
          <p className="mt-2 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Costo total de los insumos:{' '}
            <span className="dato font-semibold" style={{ color: 'var(--tinta)' }}>
              {simbolo} {formatearNumero(d.costoTotal)}
            </span>
            {datos.costoTotalDeclarado !== null && (
              <>
                {' '}
                (el enunciado declara {simbolo} {formatearNumero(datos.costoTotalDeclarado)}; la suma de los componentes es{' '}
                {simbolo} {formatearNumero(d.costoSumado)})
              </>
            )}
          </p>
        )}
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Producción y precio">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoNumero
              etiqueta="Producción terminada"
              unidad={datos.unidadProduccion}
              valor={datos.produccionTerminada}
              alCambiar={(v) => setDatos((s) => ({ ...s, produccionTerminada: v ?? 0 }))}
              minimo={0}
            />
            <CampoNumero
              etiqueta="Inventario en proceso"
              unidad={datos.unidadProduccion}
              valor={datos.inventarioEnProceso}
              alCambiar={(v) => setDatos((s) => ({ ...s, inventarioEnProceso: v ?? 0 }))}
              minimo={0}
            />
            <CampoNumero
              etiqueta="Precio de venta"
              unidad={`${simbolo} / ${datos.unidadProduccion}`}
              valor={datos.precioVenta}
              alCambiar={(v) => setDatos((s) => ({ ...s, precioVenta: v ?? 0 }))}
              minimo={0}
            />
            <CampoNumero
              etiqueta="Unidad de producción"
              valor={null}
              alCambiar={() => undefined}
              ayuda={`Actualmente: ${datos.unidadProduccion}`}
              deshabilitado
            />
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Tratamiento del inventario en proceso"
          descripcion="La decisión más importante del módulo: define qué cuenta como producción antes de dividir."
        >
          <div className="flex flex-col gap-3">
            <Selector
              etiqueta="Criterio"
              valor={datos.tratamiento}
              opciones={[
                { valor: 'excluir', texto: 'Excluir el inventario en proceso' },
                { valor: 'incluir', texto: 'Incluirlo como terminado' },
                { valor: 'ponderado', texto: 'Ponderarlo por su grado de avance' },
              ]}
              alCambiar={(v) => setDatos((s) => ({ ...s, tratamiento: v as TratamientoEnProceso }))}
            />

            <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              {EXPLICACION_TRATAMIENTO[datos.tratamiento]}
            </p>

            {datos.tratamiento === 'ponderado' && (
              <Deslizador
                etiqueta="Grado de avance"
                valor={datos.gradoAvance * 100}
                minimo={0}
                maximo={100}
                paso={5}
                unidad="%"
                alCambiar={(v) => setDatos((s) => ({ ...s, gradoAvance: v / 100 }))}
              />
            )}

            {d !== null && (
              <p className="text-[0.8125rem]">
                Producción equivalente:{' '}
                <span className="dato font-semibold" style={{ color: 'var(--acento)' }}>
                  {formatearNumero(d.produccionEquivalente)} {datos.unidadProduccion}
                </span>
              </p>
            )}
          </div>
        </Tarjeta>
      </div>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta="Productividad total"
              valor={d.total === null ? '—' : formatearNumero(d.total, { decimales: 3 })}
              unidad={d.unidadTotal}
              tono={d.total !== null && d.total >= 1 ? 'bien' : 'mal'}
              nota={d.total !== null && d.total >= 1 ? 'Genera más valor del que consume' : 'No cubre sus insumos'}
            />
            <Indicador
              etiqueta="Valor de la producción"
              valor={`${simbolo} ${formatearNumero(d.valorProduccion, { decimales: 0 })}`}
              tono="acento"
            />
            <Indicador etiqueta="Costo total" valor={`${simbolo} ${formatearNumero(d.costoTotal, { decimales: 0 })}`} />
            <Indicador
              etiqueta="Margen sobre insumos"
              valor={`${simbolo} ${formatearNumero(d.utilidad, { decimales: 0 })}`}
              tono={d.utilidad >= 0 ? 'bien' : 'mal'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta
              titulo="Comparación entre recursos"
              descripcion="Productividad económica: valor producido por cada lempira invertido en ese insumo. Es la única razón comparable entre insumos medidos en unidades distintas."
            >
              <BarrasComparativas
                etiquetaValor={`${simbolo} producidos por ${simbolo} invertido`}
                descripcion="Comparación de la productividad económica de cada insumo."
                datos={d.parciales.map((p) => ({
                  nombre: p.insumo.nombre,
                  valor: p.economica ?? 0,
                  nota:
                    p.participacionCosto === null
                      ? undefined
                      : `${formatearNumero(p.participacionCosto, { decimales: 1 })} % del costo total`,
                }))}
              />
            </Tarjeta>

            <Tarjeta
              titulo="Insumo limitante"
              descripcion="El recurso que devuelve menos valor por cada lempira invertido es el primer candidato a revisión gerencial."
            >
              {d.insumoLimitante !== null ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Distintivo tono="mal">Limitante</Distintivo>
                    <span className="font-bold">{d.insumoLimitante.insumo.nombre}</span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
                    <div>
                      <dt className="etiqueta">Parcial física</dt>
                      <dd className="dato">
                        {d.insumoLimitante.fisica === null ? '—' : formatearNumero(d.insumoLimitante.fisica, { decimales: 3 })}{' '}
                        <span style={{ color: 'var(--tinta-tenue)' }}>{d.insumoLimitante.unidadFisica}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="etiqueta">Parcial económica</dt>
                      <dd className="dato">
                        {d.insumoLimitante.economica === null ? '—' : formatearNumero(d.insumoLimitante.economica, { decimales: 3 })}{' '}
                        <span style={{ color: 'var(--tinta-tenue)' }}>{d.insumoLimitante.unidadEconomica}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="etiqueta">Costo</dt>
                      <dd className="dato">
                        {simbolo} {formatearNumero(d.insumoLimitante.costo)}
                      </dd>
                    </div>
                    <div>
                      <dt className="etiqueta">Participación</dt>
                      <dd className="dato">
                        {d.insumoLimitante.participacionCosto === null
                          ? '—'
                          : `${formatearNumero(d.insumoLimitante.participacionCosto, { decimales: 1 })} %`}
                      </dd>
                    </div>
                  </dl>

                  {d.insumoMasEficiente !== null && d.insumoMasEficiente.insumo.id !== d.insumoLimitante.insumo.id && (
                    <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                      El recurso mejor aprovechado es <strong>{d.insumoMasEficiente.insumo.nombre}</strong>, con{' '}
                      {formatearNumero(d.insumoMasEficiente.economica ?? 0, { decimales: 2 })} {d.insumoMasEficiente.unidadEconomica}.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  No hay insumos con costo positivo, así que no se puede identificar un limitante.
                </p>
              )}
            </Tarjeta>
          </div>

          <Tarjeta
            titulo="Análisis de sensibilidad"
            descripcion="Mueva el precio o el volumen y observe qué le pasa a la productividad total. Los insumos se mantienen fijos."
            acciones={
              <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setComparar((v) => !v)}>
                {comparar ? 'Ocultar comparación de periodos' : 'Comparar como dos periodos'}
              </button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Deslizador
                  etiqueta="Precio de venta"
                  valor={factorPrecio}
                  minimo={50}
                  maximo={180}
                  paso={5}
                  unidad="%"
                  alCambiar={setFactorPrecio}
                  formatear={(v) => `${formatearNumero(v, { decimales: 0 })} % (${simbolo} ${formatearNumero((datos.precioVenta * v) / 100)})`}
                />
                <Deslizador
                  etiqueta="Volumen de producción"
                  valor={factorProduccion}
                  minimo={50}
                  maximo={180}
                  paso={5}
                  unidad="%"
                  alCambiar={setFactorProduccion}
                  formatear={(v) =>
                    `${formatearNumero(v, { decimales: 0 })} % (${formatearNumero((datos.produccionTerminada * v) / 100, { decimales: 0 })} ${datos.unidadProduccion})`
                  }
                />
                <button
                  type="button"
                  className="boton boton-suave boton-pequeno self-start"
                  onClick={() => {
                    setFactorPrecio(100);
                    setFactorProduccion(100);
                  }}
                >
                  Volver al escenario base
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Indicador
                  etiqueta="Productividad base"
                  valor={d.total === null ? '—' : formatearNumero(d.total, { decimales: 3 })}
                />
                <Indicador
                  etiqueta="Productividad del escenario"
                  valor={escenario.datos?.total === null || escenario.datos === null ? '—' : formatearNumero(escenario.datos.total, { decimales: 3 })}
                  tono={
                    escenario.datos?.total !== null && escenario.datos !== null && d.total !== null
                      ? escenario.datos.total > d.total
                        ? 'bien'
                        : escenario.datos.total < d.total
                          ? 'mal'
                          : 'neutro'
                      : 'neutro'
                  }
                  nota={
                    escenario.datos?.total != null && d.total !== null && d.total !== 0
                      ? `${formatearNumero(((escenario.datos.total - d.total) / d.total) * 100, { decimales: 1, signoExplicito: true })} % respecto de la base`
                      : undefined
                  }
                />
              </div>
            </div>

            {comparacion?.datos != null && (
              <div className="mt-4 flex flex-col gap-3">
                <hr className="separador" />
                <VisorPasos pasos={comparacion.pasos} titulo="Comparación entre periodos" revelarTodo />
                <Interpretacion texto={comparacion.interpretacion} titulo="Lectura de la comparación" />
              </div>
            )}
          </Tarjeta>

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </div>
  );
}

/** Costo total mostrado en el resumen del ejercicio, sin abrir el laboratorio. */
export function resumenProductividad(datos: Extract<DatosEjercicio, { tipo: 'productividad' }>): string {
  const costo = datos.insumos.reduce((s, i) => s + costoInsumo(i), 0);
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';
  return `${datos.insumos.length} insumos por ${simbolo} ${formatearNumero(costo, { decimales: 0 })}; producción de ${formatearNumero(datos.produccionTerminada, { decimales: 0 })} ${datos.unidadProduccion}`;
}
