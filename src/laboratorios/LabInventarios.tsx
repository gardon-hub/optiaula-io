/**
 * Laboratorio del módulo 12 — Sistemas y modelos de inventarios.
 *
 * La gráfica es el argumento del módulo: el costo de ordenar cae, el de
 * conservar sube y el total tiene su mínimo donde se cruzan. Y el deslizador de
 * la cantidad sirve para mostrar lo que ninguna fórmula dice: que la curva es
 * plana cerca del óptimo, así que pedir un poco de más o de menos apenas cuesta.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  NOMBRE_MODELO_INVENTARIO,
  resolverInventarios,
  serieCostosInventario,
  type ModeloInventario,
} from '@/nucleo/inventarios';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, CampoTexto, Deslizador, Indicador, ListaDiagnosticos, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { GraficaInventario } from '@/ui/graficas';

export function LabInventarios({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'inventarios' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [modelo, setModelo] = useState<ModeloInventario>(datosIniciales.modelo);
  const [demandaAnual, setDemandaAnual] = useState(datosIniciales.demandaAnual);
  const [costoOrdenar, setCostoOrdenar] = useState(datosIniciales.costoOrdenar);
  const [costoConservar, setCostoConservar] = useState(datosIniciales.costoConservar);
  const [costoUnitario, setCostoUnitario] = useState(datosIniciales.costoUnitario);
  const [tiempoEntregaDias, setTiempoEntrega] = useState(datosIniciales.tiempoEntregaDias);
  const [diasPorAnio, setDiasPorAnio] = useState(datosIniciales.diasPorAnio);
  const [tasaProduccionAnual, setTasa] = useState(datosIniciales.tasaProduccionAnual ?? datosIniciales.demandaAnual * 2);
  const [unidadProducto, setUnidad] = useState(datosIniciales.unidadProducto);

  // Cantidad que el estudiante puede mover para comparar contra el óptimo.
  const [cantidadPropia, setCantidadPropia] = useState<number | null>(null);

  const datos = useMemo(
    () => ({
      titulo,
      modelo,
      moneda: datosIniciales.moneda,
      demandaAnual,
      unidadProducto,
      costoOrdenar,
      costoConservar,
      costoUnitario,
      tiempoEntregaDias,
      diasPorAnio,
      tasaProduccionAnual: modelo === 'reabastecimiento_uniforme' ? tasaProduccionAnual : null,
    }),
    [titulo, modelo, datosIniciales.moneda, demandaAnual, unidadProducto, costoOrdenar, costoConservar, costoUnitario, tiempoEntregaDias, diasPorAnio, tasaProduccionAnual],
  );

  const resultado = useMemo(() => resolverInventarios(datos), [datos]);
  const serie = useMemo(() => serieCostosInventario(datos, 80), [datos]);
  const d = resultado.datos;
  const simbolo = datosIniciales.moneda === 'USD' ? 'US$' : 'L';

  // Costo con la cantidad elegida a mano, para comparar contra el óptimo.
  const comparacion = useMemo(() => {
    if (d === null || cantidadPropia === null || cantidadPropia <= 0) return null;
    const factor = d.inventarioMaximo / d.cantidadOptima;
    const ordenar = (demandaAnual / cantidadPropia) * costoOrdenar;
    const conservar = ((cantidadPropia * factor) / 2) * costoConservar;
    const total = ordenar + conservar;
    return { total, exceso: ((total - d.costoAnualInventario) / d.costoAnualInventario) * 100 };
  }, [d, cantidadPropia, demandaAnual, costoOrdenar, costoConservar]);

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Datos del inventario">
        <div className="flex flex-col gap-3">
          <Selector
            etiqueta="Modelo"
            valor={modelo}
            opciones={(Object.keys(NOMBRE_MODELO_INVENTARIO) as ModeloInventario[]).map((m) => ({
              valor: m,
              texto: NOMBRE_MODELO_INVENTARIO[m],
            }))}
            alCambiar={setModelo}
            ayuda={
              modelo === 'lote_economico'
                ? 'El abastecimiento llega completo y la demanda es uniforme.'
                : modelo === 'reabastecimiento_uniforme'
                  ? 'El lote entra a una tasa de producción mientras la demanda ya consume.'
                  : 'No se revisa de continuo sino cada T, pidiendo hasta un nivel M.'
            }
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CampoNumero etiqueta="Demanda anual (D)" unidad={unidadProducto} valor={demandaAnual} minimo={1} alCambiar={(v) => setDemandaAnual(v ?? 1)} />
            <CampoTexto etiqueta="Unidad del producto" valor={unidadProducto} alCambiar={setUnidad} />
            <CampoNumero etiqueta="Costo de ordenar (Co)" unidad={simbolo} valor={costoOrdenar} minimo={0} alCambiar={(v) => setCostoOrdenar(v ?? 0)} />
            <CampoNumero etiqueta="Costo de conservar (Ch)" unidad={`${simbolo} / año`} valor={costoConservar} minimo={0.01} alCambiar={(v) => setCostoConservar(v ?? 0.01)} />
            <CampoNumero etiqueta="Costo unitario" unidad={simbolo} valor={costoUnitario} minimo={0} alCambiar={(v) => setCostoUnitario(v ?? 0)} ayuda="Cero si el enunciado no lo da." />
            <CampoNumero etiqueta="Tiempo de entrega (L)" unidad="días" valor={tiempoEntregaDias} minimo={0} alCambiar={(v) => setTiempoEntrega(v ?? 0)} />
            <CampoNumero
              etiqueta="Días del año"
              valor={diasPorAnio}
              minimo={1}
              paso={5}
              alCambiar={(v) => setDiasPorAnio(Math.max(1, Math.round(v ?? 360)))}
              ayuda="Con 360 el ejercicio del material da números redondos; con 365 no. Ver I-16."
            />
            {modelo === 'reabastecimiento_uniforme' && (
              <CampoNumero
                etiqueta="Tasa de producción (p)"
                unidad={`${unidadProducto} / año`}
                valor={tasaProduccionAnual}
                minimo={demandaAnual + 1}
                alCambiar={(v) => setTasa(v ?? demandaAnual + 1)}
                ayuda="Tiene que superar a la demanda, o nunca se acumula inventario."
              />
            )}
          </div>
        </div>
      </Tarjeta>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta={modelo === 'periodo_fijo' ? 'Cantidad del intervalo' : 'Lote económico'}
              valor={formatearNumero(d.cantidadOptima)}
              unidad={unidadProducto}
              tono="acento"
            />
            <Indicador
              etiqueta="Costo anual de inventario"
              valor={`${simbolo} ${formatearNumero(d.costoAnualInventario, { decimales: 0 })}`}
              tono="bien"
              nota={`Ordenar ${formatearNumero(d.costoOrdenarAnual, { decimales: 0 })} + conservar ${formatearNumero(d.costoConservarAnual, { decimales: 0 })}`}
            />
            {modelo === 'periodo_fijo' ? (
              <>
                <Indicador etiqueta="Revisar cada" valor={formatearNumero((d.intervaloAnios ?? 0) * diasPorAnio)} unidad="días" />
                <Indicador etiqueta="Ordenar hasta (M)" valor={formatearNumero(d.nivelObjetivo ?? 0)} unidad={unidadProducto} />
              </>
            ) : (
              <>
                <Indicador
                  etiqueta="Órdenes al año"
                  valor={formatearNumero(d.ordenesPorAnio)}
                  nota={`Una cada ${formatearNumero(d.diasEntreOrdenes)} días`}
                />
                <Indicador
                  etiqueta="Punto de reorden"
                  valor={formatearNumero(d.puntoReorden)}
                  unidad={unidadProducto}
                  nota={tiempoEntregaDias > 0 ? `${formatearNumero(d.demandaDiaria)} por día × ${formatearNumero(tiempoEntregaDias)} días` : 'Sin tiempo de entrega'}
                />
              </>
            )}
          </div>

          {modelo === 'reabastecimiento_uniforme' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Indicador
                etiqueta="Inventario máximo"
                valor={formatearNumero(d.inventarioMaximo)}
                unidad={unidadProducto}
                nota="Lo que de verdad hay que almacenar: menos que el lote"
              />
              <Indicador
                etiqueta="Fracción que se acumula"
                valor={`${formatearNumero((d.inventarioMaximo / d.cantidadOptima) * 100, { decimales: 1 })} %`}
                nota="El resto se consume mientras entra"
              />
            </div>
          )}

          <Tarjeta
            titulo="Costo contra tamaño del lote"
            descripcion="Ordenar cae, conservar sube y el total toca fondo donde se cruzan. Fíjese en lo plana que es la curva cerca del mínimo."
          >
            <div className="flex flex-col gap-3">
              <GraficaInventario
                serie={serie}
                optimo={d.cantidadOptima}
                propia={cantidadPropia}
                simbolo={simbolo}
                unidadProducto={unidadProducto}
              />

              <Deslizador
                etiqueta="Comparar con otro tamaño de lote"
                valor={cantidadPropia ?? d.cantidadOptima}
                minimo={Math.max(1, Math.round(d.cantidadOptima * 0.2))}
                maximo={Math.round(d.cantidadOptima * 2.5)}
                paso={1}
                unidad={unidadProducto}
                alCambiar={setCantidadPropia}
              />

              {comparacion !== null && (
                <p className="text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
                  Pidiendo {formatearNumero(cantidadPropia ?? 0, { decimales: 0 })} {unidadProducto} en lugar de{' '}
                  {formatearNumero(d.cantidadOptima)}, el costo anual sería {simbolo}{' '}
                  {formatearNumero(comparacion.total, { decimales: 0 })}:{' '}
                  <strong>
                    {comparacion.exceso < 0.05
                      ? 'prácticamente el mismo'
                      : `un ${formatearNumero(comparacion.exceso, { decimales: 1 })} % más`}
                  </strong>
                  . {comparacion.exceso < 3 && 'Por eso conviene redondear a lo que despache el proveedor en lugar de perseguir el número exacto.'}
                </p>
              )}
            </div>
          </Tarjeta>

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </div>
  );
}
