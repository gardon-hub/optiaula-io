/**
 * Laboratorio del módulo 13 — Líneas de espera.
 *
 * Dos cosas cargan con la enseñanza del módulo. La curva de espera contra
 * utilización, que muestra la asíntota en ρ = 1 y desarma la idea de que la
 * cola crece de forma proporcional a la ocupación. Y la tabla de comparación de
 * servidores, que es la decisión real: no cuánta cola hay, sino cuántos
 * mostradores abrir.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import { compararServidores, curvaEspera, resolverColas, servidoresMinimos } from '@/nucleo/colas';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, CampoTexto, Distintivo, Indicador, ListaDiagnosticos, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { GraficaEspera } from '@/ui/graficas';

export function LabColas({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'colas' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [tasaLlegadas, setLlegadas] = useState(datosIniciales.tasaLlegadas);
  const [tasaServicio, setServicio] = useState(datosIniciales.tasaServicio);
  const [servidores, setServidores] = useState(datosIniciales.servidores);
  const [unidadTiempo, setUnidad] = useState(datosIniciales.unidadTiempo);
  const [nombreClientes, setNombre] = useState(datosIniciales.nombreClientes);
  const [costoEsperaPorHora, setCostoEspera] = useState(datosIniciales.costoEsperaPorHora);
  const [costoServidorPorHora, setCostoServidor] = useState(datosIniciales.costoServidorPorHora);

  const datos = useMemo(
    () => ({
      titulo,
      tasaLlegadas,
      tasaServicio,
      servidores,
      unidadTiempo,
      nombreClientes,
      moneda: datosIniciales.moneda,
      costoEsperaPorHora,
      costoServidorPorHora,
    }),
    [titulo, tasaLlegadas, tasaServicio, servidores, unidadTiempo, nombreClientes, datosIniciales.moneda, costoEsperaPorHora, costoServidorPorHora],
  );

  const resultado = useMemo(() => resolverColas(datos), [datos]);
  const d = resultado.datos;
  const simbolo = datosIniciales.moneda === 'USD' ? 'US$' : 'L';

  const minimos = servidoresMinimos(tasaLlegadas, tasaServicio);
  const hayCostos = costoEsperaPorHora > 0 || costoServidorPorHora > 0;

  const opciones = useMemo(
    () => (hayCostos ? compararServidores(datos, Math.max(servidores + 3, minimos + 4)) : []),
    [datos, hayCostos, servidores, minimos],
  );
  const mejor = opciones.length > 0 ? opciones.reduce((a, b) => (b.costoTotal < a.costoTotal ? b : a), opciones[0]!) : null;

  // La curva se dibuja siempre, incluso con el sistema inestable: es justo ahí
  // donde se ve por qué no se puede operar cerca del tope.
  const curva = useMemo(() => curvaEspera({ ...datos, tasaLlegadas: Math.min(tasaLlegadas, servidores * tasaServicio * 0.98) }, 70), [datos, tasaLlegadas, servidores, tasaServicio]);

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo="Datos del sistema">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CampoNumero
            etiqueta="Tasa de llegadas (λ)"
            unidad={`${nombreClientes} / ${unidadTiempo}`}
            valor={tasaLlegadas}
            minimo={0.01}
            alCambiar={(v) => setLlegadas(v ?? 0.01)}
          />
          <CampoNumero
            etiqueta="Tasa de servicio de un servidor (μ)"
            unidad={`${nombreClientes} / ${unidadTiempo}`}
            valor={tasaServicio}
            minimo={0.01}
            alCambiar={(v) => setServicio(v ?? 0.01)}
          />
          <CampoNumero
            etiqueta="Servidores (s)"
            valor={servidores}
            minimo={1}
            paso={1}
            alCambiar={(v) => setServidores(Math.max(1, Math.round(v ?? 1)))}
            ayuda={`Hacen falta al menos ${formatearNumero(minimos, { decimales: 0 })} para que la cola no crezca sin fin.`}
          />
          <CampoTexto etiqueta="Unidad de tiempo" valor={unidadTiempo} alCambiar={setUnidad} />
          <CampoTexto etiqueta="Qué hace cola" valor={nombreClientes} alCambiar={setNombre} />
          <CampoNumero
            etiqueta="Costo de esperar"
            unidad={`${simbolo} / ${nombreClientes} / ${unidadTiempo}`}
            valor={costoEsperaPorHora}
            minimo={0}
            alCambiar={(v) => setCostoEspera(v ?? 0)}
          />
          <CampoNumero
            etiqueta="Costo de un servidor"
            unidad={`${simbolo} / ${unidadTiempo}`}
            valor={costoServidorPorHora}
            minimo={0}
            alCambiar={(v) => setCostoServidor(v ?? 0)}
          />
        </div>
      </Tarjeta>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta="Utilización"
              valor={`${formatearNumero(d.utilizacion * 100, { decimales: 1 })} %`}
              tono={d.utilizacion > 0.9 ? 'mal' : d.utilizacion > 0.8 ? 'avisar' : 'bien'}
              nota={d.utilizacion > 0.85 ? 'Zona donde la espera se dispara' : 'Deja margen para variaciones'}
            />
            <Indicador etiqueta={`En la cola (Lq)`} valor={formatearNumero(d.enCola)} unidad={nombreClientes} tono="acento" />
            <Indicador etiqueta="Espera (Wq)" valor={formatearNumero(d.tiempoCola)} unidad={unidadTiempo} tono="acento" />
            <Indicador
              etiqueta="Probabilidad de esperar"
              valor={`${formatearNumero(d.probabilidadEsperar * 100, { decimales: 1 })} %`}
              nota={`El sistema está vacío el ${formatearNumero(d.probabilidadVacio * 100, { decimales: 1 })} % del tiempo`}
            />
          </div>

          <Tarjeta
            titulo="Cómo crece la espera con la ocupación"
            descripcion="Esta curva es el módulo entero: la espera no crece de forma proporcional a la utilización, se dispara cerca del 100 %."
          >
            <GraficaEspera
              curva={curva}
              utilizacionActual={d.utilizacion}
              unidadTiempo={unidadTiempo}
            />
          </Tarjeta>

          {hayCostos && opciones.length > 0 && (
            <Tarjeta
              titulo="¿Cuántos servidores conviene abrir?"
              descripcion="El mínimo del costo total no está donde la cola desaparece: eliminarla del todo siempre sale más caro que tolerarla corta."
            >
              <div className="contenedor-tabla">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Servidores</th>
                      <th scope="col" className="text-right">Utilización</th>
                      <th scope="col" className="text-right">En cola</th>
                      <th scope="col" className="text-right">Espera</th>
                      <th scope="col" className="text-right">Costo de espera</th>
                      <th scope="col" className="text-right">Costo de servidores</th>
                      <th scope="col" className="text-right">Costo total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opciones.map((o) => (
                      <tr key={o.servidores} style={o.servidores === mejor?.servidores ? { background: 'var(--bien-suave)' } : undefined}>
                        <td>
                          {o.servidores}
                          {o.servidores === mejor?.servidores && (
                            <Distintivo tono="bien">conviene</Distintivo>
                          )}
                          {o.servidores === servidores && o.servidores !== mejor?.servidores && (
                            <Distintivo tono="neutro">actual</Distintivo>
                          )}
                        </td>
                        <td className="numero">{formatearNumero(o.utilizacion * 100, { decimales: 1 })} %</td>
                        <td className="numero">{formatearNumero(o.enCola)}</td>
                        <td className="numero">{formatearNumero(o.tiempoCola)}</td>
                        <td className="numero">{formatearNumero(o.costoEspera, { decimales: 0 })}</td>
                        <td className="numero">{formatearNumero(o.costoServidores, { decimales: 0 })}</td>
                        <td className="numero" style={{ fontWeight: o.servidores === mejor?.servidores ? 700 : 400 }}>
                          {formatearNumero(o.costoTotal, { decimales: 0 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {mejor !== null && mejor.servidores !== servidores && (
                <p className="mt-2 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
                  Con {formatearNumero(servidores, { decimales: 0 })} servidor(es) el costo total es {simbolo}{' '}
                  {formatearNumero(opciones.find((o) => o.servidores === servidores)?.costoTotal ?? 0, { decimales: 0 })} por{' '}
                  {unidadTiempo}; con {formatearNumero(mejor.servidores, { decimales: 0 })} baja a {simbolo}{' '}
                  {formatearNumero(mejor.costoTotal, { decimales: 0 })}.
                </p>
              )}
            </Tarjeta>
          )}

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </div>
  );
}
