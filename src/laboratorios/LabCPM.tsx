/**
 * Laboratorio del módulo 6 — Diagramas de red y ruta crítica.
 *
 * Constructor visual de la red, detección de ciclos y predecesoras
 * inexistentes, animación de los recorridos hacia adelante y hacia atrás,
 * y análisis de retrasos con recálculo completo. Cuando el ejercicio trae
 * duraciones aceleradas, se suma el panel de compresión del proyecto.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import { analizarRetraso, construirAOA, resolverCPM, type Actividad } from '@/nucleo/cpm';
import { admiteCompresion, resolverCrashing, type ActividadComprimible } from '@/nucleo/crashing';
import { formatearNumero } from '@/nucleo/numero';
import { CampoNumero, Distintivo, Indicador, ListaDiagnosticos, Pestanas, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { GraficaCrashing } from '@/ui/graficas';
import { ControlesAnimacion, DiagramaAOA, DiagramaCPM, type FaseAnimacion } from '@/ui/redes';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

export function LabCPM({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'cpm' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [actividades, setActividades] = useState<Actividad[]>(() =>
    datosIniciales.actividades.map((a) => ({ ...a, predecesoras: [...a.predecesoras] })),
  );
  const [unidadTiempo, setUnidadTiempo] = useState(datosIniciales.unidadTiempo);
  const [vista, setVista] = useState<'aon' | 'aoa'>('aon');
  const [fase, setFase] = useState<FaseAnimacion>('completa');
  const [indice, setIndice] = useState(0);

  const [actividadRetraso, setActividadRetraso] = useState<string>(actividades[0]?.id ?? '');
  const [diasRetraso, setDiasRetraso] = useState<number>(1);

  const datos = useMemo(() => ({ titulo, actividades, unidadTiempo }), [titulo, actividades, unidadTiempo]);

  // La compresión trabaja sobre los datos del ejercicio, no sobre la tabla
  // editable de la red: ahí no se editan costos ni duraciones aceleradas.
  const comprimibles = useMemo<ActividadComprimible[] | null>(() => {
    const lista = datosIniciales.actividades.map((a) => ({ ...a, predecesoras: [...a.predecesoras] }));
    return admiteCompresion(lista) ? lista : null;
  }, [datosIniciales.actividades]);
  const resultado = useMemo(() => resolverCPM(datos), [datos]);
  const aoa = useMemo(() => construirAOA(actividades), [actividades]);
  const retraso = useMemo(
    () => (actividadRetraso === '' ? null : analizarRetraso(datos, actividadRetraso, diasRetraso)),
    [datos, actividadRetraso, diasRetraso],
  );

  const columnas: ColumnaEditable<Actividad>[] = [
    { clave: 'id', encabezado: 'Actividad', tipo: 'texto', ancho: '6rem', obtener: (f) => f.id, fijar: (f, v) => ({ ...f, id: v.trim().toUpperCase() }) },
    { clave: 'descripcion', encabezado: 'Descripción', tipo: 'texto', ancho: '18rem', obtener: (f) => f.descripcion, fijar: (f, v) => ({ ...f, descripcion: v }) },
    {
      clave: 'predecesoras',
      encabezado: 'Predecesoras',
      tipo: 'texto',
      ancho: '9rem',
      obtener: (f) => f.predecesoras.join(', '),
      fijar: (f, v) => ({
        ...f,
        predecesoras: v
          .split(/[,;\s]+/)
          .map((x) => x.trim().toUpperCase())
          .filter((x) => x !== '' && x !== '—' && x !== '-'),
      }),
    },
    { clave: 'duracion', encabezado: 'Duración', tipo: 'numero', ancho: '7rem', unidad: unidadTiempo, obtener: (f) => f.duracion, fijar: (f, v) => ({ ...f, duracion: Number(v) || 0 }) },
  ];

  const d = resultado.datos;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta
        titulo="Constructor de la red"
        descripcion="Escriba las predecesoras separadas por comas. Deje el campo vacío para las actividades que inician el proyecto."
        acciones={
          <div className="w-40">
            <Selector
              etiqueta="Unidad de tiempo"
              valor={unidadTiempo}
              opciones={[
                { valor: 'días', texto: 'días' },
                { valor: 'semanas', texto: 'semanas' },
                { valor: 'horas', texto: 'horas' },
                { valor: 'meses', texto: 'meses' },
              ]}
              alCambiar={setUnidadTiempo}
            />
          </div>
        }
      >
        <TablaEditable
          filas={actividades}
          columnas={columnas}
          clave={(f, i) => `${i}-${f.id}`}
          alCambiar={setActividades}
          alAgregar={() => {
            const usadas = new Set(actividades.map((a) => a.id));
            const siguiente = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usadas.has(l)) ?? `A${actividades.length + 1}`;
            setActividades((s) => [...s, { id: siguiente, descripcion: 'Nueva actividad', predecesoras: [], duracion: 1 }]);
          }}
          alEliminar={(i) => {
            const eliminada = actividades[i]?.id;
            setActividades((s) =>
              s
                .filter((_, k) => k !== i)
                .map((a) => ({ ...a, predecesoras: a.predecesoras.filter((p) => p !== eliminada) })),
            );
          }}
          textoAgregar="Agregar actividad"
        />
      </Tarjeta>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador etiqueta="Duración del proyecto" valor={formatearNumero(d.duracionProyecto, { decimales: 0 })} unidad={unidadTiempo} tono="acento" />
            <Indicador etiqueta="Actividades críticas" valor={d.calculadas.filter((c) => c.critica).length} unidad={`de ${d.calculadas.length}`} tono="avisar" />
            <Indicador etiqueta="Rutas críticas" valor={d.rutasCriticas.length} tono={d.rutasCriticas.length > 1 ? 'avisar' : 'neutro'} nota={d.rutasCriticas.length > 1 ? 'Acortar una sola no adelanta nada' : undefined} />
            <Indicador
              etiqueta="Holgura total disponible"
              valor={formatearNumero(d.calculadas.reduce((s, c) => s + c.holguraTotal, 0), { decimales: 0 })}
              unidad={unidadTiempo}
              nota="Suma de holguras de todas las actividades"
            />
          </div>

          <Tarjeta
            titulo="Diagrama de red"
            descripcion={
              vista === 'aon'
                ? 'Actividades en nodos. Cada nodo muestra IT y TT arriba, IL y TL abajo, y la holgura al centro.'
                : 'Actividades en flechas. Las líneas punteadas son actividades ficticias: no consumen tiempo, solo expresan dependencias.'
            }
            acciones={
              <Pestanas
                etiquetaGrupo="Tipo de diagrama"
                valor={vista}
                alCambiar={setVista}
                opciones={[
                  { valor: 'aon', texto: 'Actividades en nodos' },
                  { valor: 'aoa', texto: 'Actividades en flechas' },
                ]}
              />
            }
          >
            <div className="flex flex-col gap-3">
              {vista === 'aon' && (
                <ControlesAnimacion
                  total={d.orden.length}
                  fase={fase}
                  indice={indice}
                  alCambiarFase={setFase}
                  alCambiarIndice={setIndice}
                />
              )}

              {vista === 'aon' ? (
                <DiagramaCPM resultado={d} fase={fase} indiceAnimacion={indice} destacar={actividadRetraso} />
              ) : (
                <DiagramaAOA red={aoa} />
              )}

              <div className="flex flex-wrap gap-2">
                {d.rutasCriticas.map((r, i) => (
                  <Distintivo key={i} tono="avisar">
                    Ruta crítica {d.rutasCriticas.length > 1 ? i + 1 : ''}: {r.actividades.join(' → ')} ={' '}
                    {formatearNumero(r.duracion, { decimales: 0 })} {unidadTiempo}
                  </Distintivo>
                ))}
              </div>
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="¿Qué pasa si una actividad se retrasa?"
            descripcion="El análisis recalcula la red completa. Un retraso puede no tener efecto, ser absorbido en parte por la holgura, o trasladarse íntegro a la fecha de entrega."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_1fr]">
              <div className="flex flex-col gap-3">
                <Selector
                  etiqueta="Actividad"
                  valor={actividadRetraso}
                  opciones={actividades.map((a) => ({ valor: a.id, texto: `${a.id} — ${a.descripcion}` }))}
                  alCambiar={setActividadRetraso}
                />
                <CampoNumero
                  etiqueta="Retraso"
                  unidad={unidadTiempo}
                  valor={diasRetraso}
                  alCambiar={(v) => setDiasRetraso(v ?? 0)}
                  minimo={0}
                />
              </div>

              {retraso?.datos != null && (
                <div className="flex flex-col gap-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Indicador etiqueta="Duración antes" valor={formatearNumero(retraso.datos.duracionOriginal, { decimales: 0 })} unidad={unidadTiempo} />
                    <Indicador
                      etiqueta="Duración después"
                      valor={formatearNumero(retraso.datos.duracionNueva, { decimales: 0 })}
                      unidad={unidadTiempo}
                      tono={retraso.datos.absorbido ? 'bien' : 'mal'}
                    />
                    <Indicador
                      etiqueta="Impacto"
                      valor={formatearNumero(retraso.datos.impacto, { decimales: 0, signoExplicito: true })}
                      unidad={unidadTiempo}
                      tono={retraso.datos.absorbido ? 'bien' : 'mal'}
                    />
                  </div>
                  <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
                    {retraso.datos.explicacion}
                  </p>
                </div>
              )}
            </div>
          </Tarjeta>

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
          <Interpretacion texto={resultado.interpretacion} />

          {comprimibles !== null && (
            <PanelCompresion
              titulo={titulo}
              actividades={comprimibles}
              unidadTiempo={unidadTiempo}
              costoIndirecto={datosIniciales.costoIndirectoPorPeriodo}
              moneda={datosIniciales.moneda}
              revelarTodo={revelarTodo}
              ocultarResultados={ocultarResultados}
            />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Panel de compresión del proyecto. Solo aparece cuando el ejercicio trae
 * duraciones aceleradas: sin ellas no hay nada que comprimir y una tarjeta vacía
 * sería un botón decorativo.
 */
function PanelCompresion({
  titulo,
  actividades,
  unidadTiempo,
  costoIndirecto,
  moneda,
  revelarTodo,
  ocultarResultados,
}: {
  titulo: string;
  actividades: readonly ActividadComprimible[];
  unidadTiempo: string;
  costoIndirecto: number;
  moneda: 'HNL' | 'USD';
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [indirecto, setIndirecto] = useState(costoIndirecto);
  const simbolo = moneda === 'USD' ? 'US$' : 'L';

  const resultado = useMemo(
    () =>
      resolverCrashing({
        titulo,
        actividades,
        unidadTiempo,
        costoIndirectoPorPeriodo: indirecto,
        moneda,
      }),
    [titulo, actividades, unidadTiempo, indirecto, moneda],
  );

  const c = resultado.datos;

  return (
    <>
      <Tarjeta
        titulo="Compresión del proyecto"
        descripcion="Cada actividad puede acelerarse hasta su duración mínima pagando más. La pregunta no es cuánto se puede acortar, sino hasta dónde conviene."
      >
        <div className="flex flex-col gap-3">
          <CampoNumero
            etiqueta="Costo indirecto por periodo"
            unidad={`${simbolo} / ${unidadTiempo}`}
            valor={indirecto}
            alCambiar={(v) => setIndirecto(v ?? 0)}
            minimo={0}
            ayuda="Lo que cuesta cada periodo que el proyecto siga abierto: supervisión, alquileres, financiamiento. Es lo que hace que comprimir valga la pena."
          />
        </div>
      </Tarjeta>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {c !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta="Duración normal"
              valor={formatearNumero(c.duracionNormal, { decimales: 0 })}
              unidad={unidadTiempo}
              nota={`${simbolo} ${formatearNumero(c.costoTotalNormal, { decimales: 0 })} de costo total`}
            />
            <Indicador
              etiqueta="Duración que conviene"
              valor={formatearNumero(c.duracionOptima, { decimales: 0 })}
              unidad={unidadTiempo}
              tono="bien"
              nota={`${simbolo} ${formatearNumero(c.costoTotalOptimo, { decimales: 0 })} de costo total`}
            />
            <Indicador
              etiqueta="Duración mínima alcanzable"
              valor={formatearNumero(c.duracionMinima, { decimales: 0 })}
              unidad={unidadTiempo}
              nota="Acelerando todo lo acelerable"
            />
            <Indicador
              etiqueta="Ahorro frente a lo normal"
              valor={`${simbolo} ${formatearNumero(c.costoTotalNormal - c.costoTotalOptimo, { decimales: 0 })}`}
              tono={c.costoTotalNormal - c.costoTotalOptimo > 0 ? 'bien' : 'neutro'}
              nota={c.costoTotalNormal - c.costoTotalOptimo > 0 ? undefined : 'Aquí no conviene comprimir'}
            />
          </div>

          <Tarjeta
            titulo="Costo contra duración"
            descripcion="El costo directo sube al comprimir y el indirecto baja. Donde el total toca fondo está la decisión."
          >
            <GraficaCrashing curva={c.curva} optima={c.duracionOptima} unidadTiempo={unidadTiempo} simbolo={simbolo} />
          </Tarjeta>

          <VisorPasos pasos={resultado.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} titulo="Procedimiento de compresión" />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </>
  );
}
