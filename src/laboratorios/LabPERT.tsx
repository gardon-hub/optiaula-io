/**
 * Laboratorio del módulo 7 — PERT.
 *
 * Tres estimaciones por actividad, ruta crítica probabilística, curva normal
 * interactiva con el área sombreada, y cálculo del plazo necesario para un
 * nivel de confianza dado.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  plazoParaConfianza,
  probabilidadPlazo,
  resolverPERT,
  serieCurvaNormal,
  type ActividadPERT,
  type SentidoProbabilidad,
} from '@/nucleo/pert';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, Deslizador, Distintivo, Formula, Indicador, ListaDiagnosticos, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { CurvaNormal } from '@/ui/graficas';
import { DiagramaCPM } from '@/ui/redes';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

export function LabPERT({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'pert' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const soloProbabilidad = datosIniciales.modo === 'solo_probabilidad';

  const [actividades, setActividades] = useState<ActividadPERT[]>(() =>
    datosIniciales.actividades.map((a) => ({ ...a, predecesoras: [...a.predecesoras] })),
  );
  const [unidadTiempo] = useState(datosIniciales.unidadTiempo);

  const [mediaManual, setMediaManual] = useState(datosIniciales.mediaDirecta ?? 80);
  const [sigmaManual, setSigmaManual] = useState(datosIniciales.desviacionDirecta ?? 8);

  const resultado = useMemo(
    () => (soloProbabilidad ? null : resolverPERT({ titulo, actividades, unidadTiempo })),
    [soloProbabilidad, titulo, actividades, unidadTiempo],
  );

  const media = soloProbabilidad ? mediaManual : (resultado?.datos?.duracionEsperada ?? 0);
  const sigma = soloProbabilidad ? sigmaManual : (resultado?.datos?.desviacionProyecto ?? 0);

  const [plazo, setPlazo] = useState(datosIniciales.plazoConsulta ?? Math.round(media * 1.1));
  const [sentido, setSentido] = useState<SentidoProbabilidad>('antes');
  const [confianza, setConfianza] = useState((datosIniciales.confianzaConsulta ?? 0.95) * 100);

  const probabilidad = useMemo(
    () => probabilidadPlazo({ media, desviacion: sigma, plazo, sentido, unidadTiempo }),
    [media, sigma, plazo, sentido, unidadTiempo],
  );
  const conConfianza = useMemo(
    () => plazoParaConfianza(media, sigma, confianza / 100, unidadTiempo),
    [media, sigma, confianza, unidadTiempo],
  );
  const curva = useMemo(() => serieCurvaNormal(media, sigma, plazo, sentido), [media, sigma, plazo, sentido]);

  // Los dos procedimientos se muestran juntos, pero la unión hay que memorizarla:
  // construida en el JSX sería un arreglo nuevo en cada render, y `VisorPasos`
  // reinicia al paso 1 cuando cambian los pasos que recibe. El efecto era que
  // editar cualquier cosa de la tabla de actividades —una descripción, que ni
  // siquiera entra en este cálculo— devolvía el procedimiento probabilístico al
  // primer paso con el contenido intacto.
  // Se renumeran porque cada solucionador empieza a contar desde 1 por su
  // cuenta: unidos tal cual, el visor mostraba «1, 2, 1, 2» mientras el
  // encabezado decía «Paso 3 de 4».
  const pasosProbabilidad = useMemo(
    () => [...probabilidad.pasos, ...conConfianza.pasos].map((p, i) => ({ ...p, numero: i + 1 })),
    [probabilidad, conConfianza],
  );

  const columnas: ColumnaEditable<ActividadPERT>[] = [
    { clave: 'id', encabezado: 'Actividad', tipo: 'texto', ancho: '5.5rem', obtener: (f) => f.id, fijar: (f, v) => ({ ...f, id: v.trim().toUpperCase() }) },
    { clave: 'descripcion', encabezado: 'Descripción', tipo: 'texto', ancho: '15rem', obtener: (f) => f.descripcion, fijar: (f, v) => ({ ...f, descripcion: v }) },
    {
      clave: 'predecesoras',
      encabezado: 'Predecesoras',
      tipo: 'texto',
      ancho: '8rem',
      obtener: (f) => f.predecesoras.join(', '),
      fijar: (f, v) => ({ ...f, predecesoras: v.split(/[,;\s]+/).map((x) => x.trim().toUpperCase()).filter((x) => x !== '' && x !== '—' && x !== '-') }),
    },
    { clave: 'a', encabezado: 'Optimista (a)', tipo: 'numero', ancho: '6rem', obtener: (f) => f.a, fijar: (f, v) => ({ ...f, a: Number(v) || 0 }) },
    { clave: 'm', encabezado: 'Más probable (m)', tipo: 'numero', ancho: '6rem', obtener: (f) => f.m, fijar: (f, v) => ({ ...f, m: Number(v) || 0 }) },
    { clave: 'b', encabezado: 'Pesimista (b)', tipo: 'numero', ancho: '6rem', obtener: (f) => f.b, fijar: (f, v) => ({ ...f, b: Number(v) || 0 }) },
  ];

  const d = resultado?.datos ?? null;

  // La red PERT se adapta a la forma que dibuja el diagrama de CPM. Memorizada
  // por lo mismo que los pasos: `DiagramaCPM` calcula la disposición con un
  // `useMemo` sobre este objeto, y construirlo en el JSX la rehacía en cada
  // pulsación de la tabla de actividades.
  const redParaDiagrama = useMemo(
    () =>
      d === null
        ? null
        : {
            calculadas: d.calculadas.map((c) => c.cpm),
            orden: d.calculadas.map((c) => c.actividad.id),
            duracionProyecto: d.duracionEsperada,
            rutasCriticas: d.rutasCriticas,
            unidadTiempo,
            capas: [],
          },
    [d, unidadTiempo],
  );

  return (
    <div className="flex flex-col gap-5">
      {soloProbabilidad ? (
        <Tarjeta
          titulo="Datos del proyecto"
          descripcion="Este ejercicio parte directamente de la media y la desviación estándar del proyecto, sin red de actividades."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoNumero etiqueta="Duración media (μ)" unidad={unidadTiempo} valor={mediaManual} alCambiar={(v) => setMediaManual(v ?? 0)} minimo={0} />
            <CampoNumero etiqueta="Desviación estándar (σ)" unidad={unidadTiempo} valor={sigmaManual} alCambiar={(v) => setSigmaManual(v ?? 0)} minimo={0} />
          </div>
        </Tarjeta>
      ) : (
        <>
          <Tarjeta
            titulo="Tres estimaciones por actividad"
            descripcion="Debe cumplirse siempre a ≤ m ≤ b. El tiempo esperado da cuatro veces más peso a la estimación más probable."
          >
            <TablaEditable
              filas={actividades}
              columnas={columnas}
              clave={(f, i) => `${i}-${f.id}`}
              alCambiar={setActividades}
              alAgregar={() => {
                const usadas = new Set(actividades.map((a) => a.id));
                const siguiente = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usadas.has(l)) ?? `A${actividades.length + 1}`;
                setActividades((s) => [...s, { id: siguiente, descripcion: 'Nueva actividad', predecesoras: [], a: 1, m: 2, b: 3 }]);
              }}
              alEliminar={(i) => {
                const eliminada = actividades[i]?.id;
                setActividades((s) => s.filter((_, k) => k !== i).map((a) => ({ ...a, predecesoras: a.predecesoras.filter((p) => p !== eliminada) })));
              }}
              textoAgregar="Agregar actividad"
            />

            <div className="mt-3 flex flex-wrap gap-4 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              <span className="flex items-center gap-2">
                <Formula tex="TE = \frac{a + 4m + b}{6}" />
              </span>
              <span className="flex items-center gap-2">
                <Formula tex="\sigma^2 = \left( \frac{b - a}{6} \right)^2" />
              </span>
            </div>
          </Tarjeta>

          {resultado !== null && <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />}

          {d !== null && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Indicador etiqueta="Duración esperada" valor={formatearNumero(d.duracionEsperada, { decimales: 2 })} unidad={unidadTiempo} tono="acento" />
                <Indicador etiqueta="Varianza del proyecto" valor={formatearNumero(d.varianzaProyecto, { decimales: 4 })} unidad={`${unidadTiempo}²`} />
                <Indicador etiqueta="Desviación estándar" valor={formatearNumero(d.desviacionProyecto, { decimales: 4 })} unidad={unidadTiempo} />
                <Indicador
                  etiqueta="Ruta evaluada"
                  valor={<span className="text-sm">{d.rutaEvaluada.join(' → ')}</span>}
                  tono="avisar"
                  nota={d.rutasCriticas.length > 1 ? `${d.rutasCriticas.length} rutas críticas; se usó la de mayor varianza` : undefined}
                />
              </div>

              <Tarjeta titulo="Red PERT con tiempos esperados">
                {redParaDiagrama !== null && <DiagramaCPM resultado={redParaDiagrama} />}
              </Tarjeta>

              <Tarjeta titulo="Tiempos y varianzas por actividad">
                <div className="contenedor-tabla">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th scope="col">Actividad</th>
                        <th scope="col" className="text-right">a</th>
                        <th scope="col" className="text-right">m</th>
                        <th scope="col" className="text-right">b</th>
                        <th scope="col" className="text-right">TE</th>
                        <th scope="col" className="text-right">σ</th>
                        <th scope="col" className="text-right">σ²</th>
                        <th scope="col" className="text-right">Holgura</th>
                        <th scope="col">Crítica</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.calculadas.map((c, i) => (
                        <tr key={i} className={c.cpm.critica ? 'fila-resaltada' : ''}>
                          <td className="font-bold">{c.actividad.id}</td>
                          <td className="numero">{formatearNumero(c.actividad.a, { decimales: 2 })}</td>
                          <td className="numero">{formatearNumero(c.actividad.m, { decimales: 2 })}</td>
                          <td className="numero">{formatearNumero(c.actividad.b, { decimales: 2 })}</td>
                          <td className="numero font-semibold">{formatearNumero(c.tiempoEsperado, { decimales: 3 })}</td>
                          <td className="numero">{formatearNumero(c.desviacion, { decimales: 4 })}</td>
                          <td className="numero">{formatearNumero(c.varianza, { decimales: 4 })}</td>
                          <td className="numero">{formatearNumero(c.cpm.holguraTotal, { decimales: 2 })}</td>
                          <td>{c.cpm.critica ? <Distintivo tono="avisar">Sí</Distintivo> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
            </>
          )}
        </>
      )}

      <Tarjeta
        titulo="Probabilidad de cumplir un plazo"
        descripcion="La aproximación normal supone que la ruta crítica tiene suficientes actividades independientes y que no cambia. Ninguna de las tres condiciones se cumple perfectamente en un proyecto real: los resultados son orientativos."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
          <div className="flex flex-col gap-4">
            <Selector
              etiqueta="Pregunta"
              valor={sentido}
              opciones={[
                { valor: 'antes', texto: 'Probabilidad de terminar en o antes del plazo' },
                { valor: 'despues', texto: 'Probabilidad de exceder el plazo' },
              ]}
              alCambiar={(v) => setSentido(v as SentidoProbabilidad)}
            />

            <Deslizador
              etiqueta="Plazo consultado"
              valor={plazo}
              minimo={Math.max(0, Math.round(media - 3.5 * sigma))}
              maximo={Math.round(media + 3.5 * sigma) || media + 10}
              paso={sigma > 3 ? 1 : 0.25}
              unidad={unidadTiempo}
              alCambiar={setPlazo}
            />

            <Deslizador etiqueta="Nivel de confianza deseado" valor={confianza} minimo={50} maximo={99.5} paso={0.5} unidad="%" alCambiar={setConfianza} />

            <div className="grid gap-3">
              <Indicador
                etiqueta="Puntaje Z"
                valor={probabilidad.datos === null ? '—' : formatearNumero(probabilidad.datos.z, { decimales: 4 })}
              />
              <Indicador
                etiqueta={sentido === 'antes' ? 'Probabilidad de cumplir' : 'Probabilidad de exceder'}
                valor={probabilidad.datos === null ? '—' : `${formatearNumero(probabilidad.datos.probabilidad * 100, { decimales: 1 })} %`}
                tono={
                  probabilidad.datos === null
                    ? 'neutro'
                    : (sentido === 'antes' ? probabilidad.datos.probabilidad : 1 - probabilidad.datos.probabilidad) >= 0.8
                      ? 'bien'
                      : 'avisar'
                }
              />
              <Indicador
                etiqueta={`Plazo para ${formatearNumero(confianza, { decimales: 1 })} % de confianza`}
                valor={conConfianza.datos === null ? '—' : formatearNumero(conConfianza.datos.plazo, { decimales: 2 })}
                unidad={unidadTiempo}
                tono="acento"
                nota={
                  conConfianza.datos === null
                    ? undefined
                    : `Colchón de ${formatearNumero(conConfianza.datos.colchon, { decimales: 2 })} ${unidadTiempo} sobre la duración esperada`
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {curva.length > 0 && probabilidad.datos !== null ? (
              <CurvaNormal
                serie={curva}
                media={media}
                desviacion={sigma}
                plazo={plazo}
                probabilidad={probabilidad.datos.probabilidad}
                unidadTiempo={unidadTiempo}
              />
            ) : (
              <ListaDiagnosticos diagnosticos={probabilidad.diagnosticos} />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          <ListaDiagnosticos diagnosticos={probabilidad.diagnosticos} />
          {probabilidad.datos !== null && <Interpretacion texto={probabilidad.interpretacion} titulo="Lectura de la probabilidad" />}
        </div>
      </Tarjeta>

      {probabilidad.datos !== null && (
        <VisorPasos pasos={pasosProbabilidad} titulo="Procedimiento probabilístico" revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
      )}

      {resultado !== null && d !== null && (
        <>
          <VisorPasos pasos={resultado.pasos} titulo="Procedimiento de la red PERT" revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </div>
  );
}
