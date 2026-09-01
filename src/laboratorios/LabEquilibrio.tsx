/**
 * Laboratorio del módulo 5 — Punto de equilibrio.
 *
 * Gráfica interactiva con zonas de pérdida y utilidad, controles deslizantes
 * para precio, costo variable, costos fijos y capacidad, y modo multiproducto
 * con mezcla porcentual de ventas.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio, Moneda } from '@/esquemas';
import {
  resolverEquilibrio,
  resolverEquilibrioMultiproducto,
  serieEquilibrio,
  type BaseMezcla,
  type DatosEquilibrio,
  type ProductoMezcla,
} from '@/nucleo/equilibrio';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, Deslizador, Indicador, ListaDiagnosticos, Pestanas, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { GraficaEquilibrio } from '@/ui/graficas';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

export function LabEquilibrio({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'equilibrio' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [modo, setModo] = useState<'simple' | 'multiproducto'>(datosIniciales.modo);

  const [simple, setSimple] = useState<DatosEquilibrio>(() => ({
    titulo,
    moneda: datosIniciales.moneda,
    costosFijos: datosIniciales.costosFijos,
    costoVariableUnitario: datosIniciales.costoVariableUnitario,
    precioVenta: datosIniciales.precioVenta || 1,
    comisionPorcentaje: datosIniciales.comisionPorcentaje,
    valorRecuperacion: datosIniciales.valorRecuperacion,
    capacidad: datosIniciales.capacidad,
    volumenEsperado: datosIniciales.volumenEsperado,
    utilidadObjetivo: datosIniciales.utilidadObjetivo,
    unidadProducto: datosIniciales.unidadProducto,
  }));

  const [productos, setProductos] = useState<ProductoMezcla[]>(() =>
    datosIniciales.productos.length > 0
      ? datosIniciales.productos.map((p) => ({ ...p }))
      : [
          { id: 'p1', nombre: 'Producto A', precioVenta: 100, costoVariableUnitario: 60, participacion: 60 },
          { id: 'p2', nombre: 'Producto B', precioVenta: 50, costoVariableUnitario: 20, participacion: 40 },
        ],
  );

  const [costosFijosMulti, setCostosFijosMulti] = useState(datosIniciales.costosFijos);
  const [baseMezcla, setBaseMezcla] = useState<BaseMezcla>(datosIniciales.baseMezcla);

  const resultado = useMemo(() => resolverEquilibrio(simple), [simple]);
  const serie = useMemo(() => serieEquilibrio(simple, 81), [simple]);
  const multi = useMemo(
    () =>
      resolverEquilibrioMultiproducto({
        titulo,
        moneda: simple.moneda,
        costosFijos: costosFijosMulti,
        baseMezcla,
        productos,
      }),
    [titulo, simple.moneda, costosFijosMulti, baseMezcla, productos],
  );

  const simbolo = simple.moneda === 'USD' ? 'US$' : 'L';
  const d = resultado.datos;

  const columnasProductos: ColumnaEditable<ProductoMezcla>[] = [
    { clave: 'nombre', encabezado: 'Producto', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'precio', encabezado: 'Precio', tipo: 'numero', ancho: '7rem', unidad: simbolo, obtener: (f) => f.precioVenta, fijar: (f, v) => ({ ...f, precioVenta: Number(v) || 0 }) },
    { clave: 'cv', encabezado: 'Costo variable', tipo: 'numero', ancho: '8rem', unidad: simbolo, obtener: (f) => f.costoVariableUnitario, fijar: (f, v) => ({ ...f, costoVariableUnitario: Number(v) || 0 }) },
    { clave: 'mezcla', encabezado: baseMezcla === 'unidades' ? 'Mezcla de unidades' : 'Mezcla de ingresos', tipo: 'numero', ancho: '8rem', unidad: '%', obtener: (f) => f.participacion, fijar: (f, v) => ({ ...f, participacion: Number(v) || 0 }) },
  ];

  const sumaMezcla = productos.reduce((s, p) => s + p.participacion, 0);

  return (
    <div className="flex flex-col gap-5">
      <Pestanas
        etiquetaGrupo="Modo de análisis"
        valor={modo}
        alCambiar={setModo}
        opciones={[
          { valor: 'simple', texto: 'Un producto' },
          { valor: 'multiproducto', texto: 'Multiproducto' },
        ]}
      />

      {modo === 'simple' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
            <div className="flex flex-col gap-4">
              <Tarjeta titulo="Datos del negocio">
                <div className="flex flex-col gap-3">
                  <Selector
                    etiqueta="Moneda"
                    valor={simple.moneda}
                    opciones={[
                      { valor: 'HNL', texto: 'Lempira hondureño (L)' },
                      { valor: 'USD', texto: 'Dólar estadounidense (US$)' },
                    ]}
                    alCambiar={(v) => setSimple((s) => ({ ...s, moneda: v as Moneda }))}
                    ayuda="Un cálculo nunca mezcla monedas: si cambia aquí, todos los valores se interpretan en la nueva moneda."
                  />
                  <CampoNumero etiqueta="Precio de venta" unidad={`${simbolo}/${simple.unidadProducto}`} valor={simple.precioVenta} alCambiar={(v) => setSimple((s) => ({ ...s, precioVenta: v ?? 0 }))} minimo={0} />
                  <CampoNumero etiqueta="Costo variable unitario" unidad={`${simbolo}/${simple.unidadProducto}`} valor={simple.costoVariableUnitario} alCambiar={(v) => setSimple((s) => ({ ...s, costoVariableUnitario: v ?? 0 }))} minimo={0} />
                  <CampoNumero etiqueta="Costos fijos del periodo" unidad={simbolo} valor={simple.costosFijos} alCambiar={(v) => setSimple((s) => ({ ...s, costosFijos: v ?? 0 }))} minimo={0} />
                  <CampoNumero etiqueta="Comisión sobre ingresos" unidad="%" valor={simple.comisionPorcentaje} alCambiar={(v) => setSimple((s) => ({ ...s, comisionPorcentaje: v ?? 0 }))} minimo={0} maximo={99} ayuda="La comisión crece con cada venta: es costo variable, no fijo." />
                  <CampoNumero etiqueta="Valor de recuperación" unidad={simbolo} valor={simple.valorRecuperacion} alCambiar={(v) => setSimple((s) => ({ ...s, valorRecuperacion: v ?? 0 }))} minimo={0} ayuda="Ingreso por subproductos o venta de equipo que reduce la carga fija." />
                  <CampoNumero etiqueta="Capacidad productiva" unidad={simple.unidadProducto} valor={simple.capacidad} alCambiar={(v) => setSimple((s) => ({ ...s, capacidad: v }))} minimo={0} />
                  <CampoNumero etiqueta="Volumen esperado" unidad={simple.unidadProducto} valor={simple.volumenEsperado} alCambiar={(v) => setSimple((s) => ({ ...s, volumenEsperado: v }))} minimo={0} />
                  <CampoNumero etiqueta="Utilidad objetivo" unidad={simbolo} valor={simple.utilidadObjetivo} alCambiar={(v) => setSimple((s) => ({ ...s, utilidadObjetivo: v }))} />
                </div>
              </Tarjeta>

              <Tarjeta titulo="Simulador" descripcion="Mueva un control y observe cómo se desplaza el punto de equilibrio en la gráfica.">
                <div className="flex flex-col gap-4">
                  <Deslizador etiqueta="Precio de venta" valor={simple.precioVenta} minimo={Math.max(1, Math.round(simple.costoVariableUnitario * 0.5))} maximo={Math.max(10, Math.round(simple.precioVenta * 2.2))} paso={Math.max(0.5, Math.round(simple.precioVenta / 100))} unidad={simbolo} alCambiar={(v) => setSimple((s) => ({ ...s, precioVenta: v }))} />
                  <Deslizador etiqueta="Costo variable unitario" valor={simple.costoVariableUnitario} minimo={0} maximo={Math.max(10, Math.round(simple.precioVenta * 1.5))} paso={Math.max(0.5, Math.round(simple.precioVenta / 100))} unidad={simbolo} alCambiar={(v) => setSimple((s) => ({ ...s, costoVariableUnitario: v }))} />
                  <Deslizador etiqueta="Costos fijos" valor={simple.costosFijos} minimo={0} maximo={Math.max(1000, Math.round(simple.costosFijos * 2.5))} paso={Math.max(100, Math.round(simple.costosFijos / 100))} unidad={simbolo} alCambiar={(v) => setSimple((s) => ({ ...s, costosFijos: v }))} />
                  {simple.capacidad !== null && (
                    <Deslizador etiqueta="Capacidad" valor={simple.capacidad} minimo={1} maximo={Math.max(10, Math.round(simple.capacidad * 2.5))} paso={Math.max(1, Math.round(simple.capacidad / 100))} unidad={simple.unidadProducto} alCambiar={(v) => setSimple((s) => ({ ...s, capacidad: v }))} />
                  )}
                </div>
              </Tarjeta>
            </div>

            <div className="flex flex-col gap-4">
              <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Indicador
                  etiqueta="Margen de contribución"
                  valor={`${simbolo} ${formatearNumero(simple.precioVenta - simple.costoVariableUnitario - (simple.comisionPorcentaje / 100) * simple.precioVenta)}`}
                  unidad={`/${simple.unidadProducto}`}
                  tono={d !== null && d.margenContribucionUnitario > 0 ? 'bien' : 'mal'}
                />
                <Indicador etiqueta="Equilibrio en unidades" valor={d?.puntoEquilibrioUnidades == null ? 'no existe' : formatearNumero(Math.ceil(d.puntoEquilibrioUnidades), { decimales: 0 })} unidad={simple.unidadProducto} tono="acento" />
                <Indicador etiqueta="Equilibrio monetario" valor={d?.puntoEquilibrioMonetario == null ? '—' : `${simbolo} ${formatearNumero(d.puntoEquilibrioMonetario, { decimales: 0 })}`} />
                <Indicador
                  etiqueta="Uso de capacidad"
                  valor={d?.porcentajeCapacidad == null ? '—' : `${formatearNumero(d.porcentajeCapacidad, { decimales: 1 })} %`}
                  tono={d?.porcentajeCapacidad == null ? 'neutro' : d.porcentajeCapacidad > 100 ? 'mal' : d.porcentajeCapacidad > 80 ? 'avisar' : 'bien'}
                />
              </div>

              <Tarjeta titulo="Gráfica del punto de equilibrio">
                <GraficaEquilibrio
                  serie={serie}
                  equilibrioX={d?.puntoEquilibrioUnidades ?? null}
                  capacidad={simple.capacidad}
                  volumenEsperado={simple.volumenEsperado}
                  simbolo={simbolo}
                  unidadProducto={simple.unidadProducto}
                />
              </Tarjeta>

              {d !== null && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Indicador
                    etiqueta="Utilidad al volumen esperado"
                    valor={d.utilidadEsperada === null ? '—' : `${simbolo} ${formatearNumero(d.utilidadEsperada, { decimales: 0 })}`}
                    tono={d.utilidadEsperada === null ? 'neutro' : d.utilidadEsperada >= 0 ? 'bien' : 'mal'}
                  />
                  <Indicador
                    etiqueta="Margen de seguridad"
                    valor={d.margenSeguridadPorcentaje === null ? '—' : `${formatearNumero(d.margenSeguridadPorcentaje, { decimales: 1 })} %`}
                    nota="Cuánto pueden caer las ventas antes de perder"
                  />
                  <Indicador
                    etiqueta="Volumen para la utilidad objetivo"
                    valor={d.unidadesParaObjetivo === null ? '—' : formatearNumero(Math.ceil(d.unidadesParaObjetivo), { decimales: 0 })}
                    unidad={simple.unidadProducto}
                  />
                </div>
              )}
            </div>
          </div>

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      ) : (
        <>
          <Tarjeta
            titulo="Mezcla de productos"
            descripcion="Con varios productos el equilibrio depende de la mezcla de ventas, y hay que decir qué mide esa mezcla: la proporción de unidades vendidas o la del ingreso. Las dos lecturas dan resultados distintos."
          >
            <div className="flex flex-col gap-3">
              <CampoNumero etiqueta="Costos fijos del periodo" unidad={simbolo} valor={costosFijosMulti} alCambiar={(v) => setCostosFijosMulti(v ?? 0)} minimo={0} />

              <Selector
                etiqueta="La mezcla está expresada en"
                valor={baseMezcla}
                opciones={[
                  { valor: 'unidades', texto: 'Proporción de unidades vendidas' },
                  { valor: 'ingresos', texto: 'Proporción del ingreso' },
                ]}
                alCambiar={setBaseMezcla}
                ayuda={
                  baseMezcla === 'unidades'
                    ? 'Se pondera el margen por unidad y el equilibrio sale en unidades.'
                    : 'Se pondera la razón de margen y el equilibrio sale en dinero.'
                }
              />

              <TablaEditable
                filas={productos}
                columnas={columnasProductos}
                clave={(f, i) => `${f.id}-${i}`}
                alCambiar={setProductos}
                alAgregar={() =>
                  setProductos((s) => [
                    ...s,
                    { id: `p${s.length + 1}-${Date.now()}`, nombre: `Producto ${String.fromCharCode(65 + s.length)}`, precioVenta: 50, costoVariableUnitario: 25, participacion: 0 },
                  ])
                }
                alEliminar={(i) => setProductos((s) => s.filter((_, k) => k !== i))}
                textoAgregar="Agregar producto"
                minimoFilas={2}
              />

              <p className="text-[0.8125rem]" style={{ color: Math.abs(sumaMezcla - 100) < 0.01 ? 'var(--bien)' : 'var(--avisar)' }}>
                La mezcla suma {formatearNumero(sumaMezcla, { decimales: 1 })} %.
                {Math.abs(sumaMezcla - 100) >= 0.01 && ' Se normalizará automáticamente para poder calcular.'}
              </p>
            </div>
          </Tarjeta>

          <ListaDiagnosticos diagnosticos={multi.diagnosticos} />

          {multi.datos !== null && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {baseMezcla === 'unidades' ? (
                  <Indicador
                    etiqueta="Margen ponderado"
                    valor={`${simbolo} ${formatearNumero(multi.datos.margenPonderado ?? 0)}`}
                    tono="acento"
                    nota="Lo que deja una unidad promedio de la mezcla"
                  />
                ) : (
                  <Indicador
                    etiqueta="Razón de margen ponderada"
                    valor={`${formatearNumero((multi.datos.razonPonderada ?? 0) * 100, { decimales: 2 })} %`}
                    tono="acento"
                    nota="De cada lempira facturado, esto queda para cubrir costos fijos"
                  />
                )}
                <Indicador
                  etiqueta="Unidades de equilibrio"
                  valor={formatearNumero(multi.datos.unidadesEquilibrio ?? 0, { decimales: 0 })}
                  tono="bien"
                  nota="Unidades combinadas de toda la mezcla"
                />
                <Indicador
                  etiqueta="Ingreso de equilibrio"
                  valor={`${simbolo} ${formatearNumero(multi.datos.ingresoEquilibrio ?? 0, { decimales: 0 })}`}
                  tono="bien"
                />
              </div>

              <VisorPasos pasos={multi.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
              <Interpretacion texto={multi.interpretacion} />
            </>
          )}
        </>
      )}
    </div>
  );
}
