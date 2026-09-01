/**
 * Laboratorio del módulo 3 — Decisiones de localización.
 *
 * Puntaje ponderado con desglose y sensibilidad, carga-distancia sobre un mapa
 * cartesiano donde los candidatos se arrastran, y centro de gravedad calculado
 * en vivo.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  resolverCargaDistancia,
  resolverCentroGravedad,
  resolverPuntajePonderado,
  sensibilidadPonderacion,
  type FactorLocalizacion,
  type PuntoCarga,
  type SitioCandidato,
} from '@/nucleo/localizacion';
import { formatearNumero } from '@/nucleo/numero';
import type { Punto, TipoDistancia } from '@/nucleo/tipos';
import { Distintivo, Indicador, ListaDiagnosticos, Pestanas, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { BarrasComparativas, MapaLocalizacion, type MarcaMapa } from '@/ui/graficas';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

type Vista = 'puntaje' | 'carga_distancia' | 'centro_gravedad';

export function LabLocalizacion({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'localizacion' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const inicial: Vista =
    datosIniciales.metodo === 'puntaje_ponderado'
      ? 'puntaje'
      : datosIniciales.metodo === 'centro_gravedad'
        ? 'centro_gravedad'
        : 'carga_distancia';

  const [vista, setVista] = useState<Vista>(inicial);
  const [factores, setFactores] = useState<FactorLocalizacion[]>(() => datosIniciales.factores.map((f) => ({ ...f })));
  const [sitios, setSitios] = useState<SitioCandidato[]>(() =>
    datosIniciales.sitios.map((s) => ({ ...s, calificaciones: { ...s.calificaciones } })),
  );
  const [puntos, setPuntos] = useState<PuntoCarga[]>(() => datosIniciales.puntos.map((p) => ({ ...p })));
  // `pasillo` es de distribución de almacenes, no de localización: el esquema de
  // localización no lo admite y por eso el tipo se estrecha aquí.
  const [tipoDistancia, setTipoDistancia] = useState<Exclude<TipoDistancia, 'pasillo'>>(datosIniciales.tipoDistancia);
  const [factorSensibilidad, setFactorSensibilidad] = useState(datosIniciales.factores[0]?.id ?? '');
  const [candidatoActivo, setCandidatoActivo] = useState<string | null>(datosIniciales.sitios[0]?.id ?? null);

  const conPunto = useMemo(() => sitios.filter((s): s is SitioCandidato & { punto: Punto } => s.punto !== undefined), [sitios]);

  const puntaje = useMemo(
    () =>
      resolverPuntajePonderado({
        titulo,
        factores,
        sitios,
        escalaMinima: datosIniciales.escalaMinima,
        escalaMaxima: datosIniciales.escalaMaxima,
      }),
    [titulo, factores, sitios, datosIniciales.escalaMinima, datosIniciales.escalaMaxima],
  );

  const cargaDistancia = useMemo(
    () =>
      resolverCargaDistancia({
        titulo,
        puntos,
        candidatos: conPunto,
        tipoDistancia,
        unidadCarga: datosIniciales.unidadCarga,
        unidadDistancia: datosIniciales.unidadDistancia,
      }),
    [titulo, puntos, conPunto, tipoDistancia, datosIniciales.unidadCarga, datosIniciales.unidadDistancia],
  );

  const centro = useMemo(() => resolverCentroGravedad(puntos, tipoDistancia), [puntos, tipoDistancia]);

  const sensibilidad = useMemo(
    () =>
      factorSensibilidad === ''
        ? []
        : sensibilidadPonderacion(
            { titulo, factores, sitios, escalaMinima: datosIniciales.escalaMinima, escalaMaxima: datosIniciales.escalaMaxima },
            factorSensibilidad,
            21,
          ),
    [titulo, factores, sitios, factorSensibilidad, datosIniciales.escalaMinima, datosIniciales.escalaMaxima],
  );

  const marcas: MarcaMapa[] = [
    ...puntos.map((p): MarcaMapa => ({ id: p.id, nombre: p.nombre, punto: p.punto, carga: p.carga, tipo: 'demanda' })),
    ...conPunto.map((s): MarcaMapa => ({ id: s.id, nombre: s.nombre, punto: s.punto, tipo: 'candidato' })),
    ...(centro.datos !== null && vista === 'centro_gravedad'
      ? [{ id: 'centro', nombre: 'Centro de gravedad', punto: centro.datos.centro, tipo: 'centro' as const }]
      : []),
  ];

  const columnasFactores: ColumnaEditable<FactorLocalizacion>[] = [
    { clave: 'nombre', encabezado: 'Factor', tipo: 'texto', ancho: '18rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'ponderacion', encabezado: 'Ponderación', tipo: 'numero', ancho: '8rem', unidad: '%', obtener: (f) => f.ponderacion, fijar: (f, v) => ({ ...f, ponderacion: Number(v) || 0 }) },
  ];

  const columnasPuntos: ColumnaEditable<PuntoCarga>[] = [
    { clave: 'nombre', encabezado: 'Punto de demanda', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'x', encabezado: 'x', tipo: 'numero', ancho: '6rem', obtener: (f) => f.punto.x, fijar: (f, v) => ({ ...f, punto: { ...f.punto, x: Number(v) || 0 } }) },
    { clave: 'y', encabezado: 'y', tipo: 'numero', ancho: '6rem', obtener: (f) => f.punto.y, fijar: (f, v) => ({ ...f, punto: { ...f.punto, y: Number(v) || 0 } }) },
    { clave: 'carga', encabezado: 'Carga', tipo: 'numero', ancho: '7rem', unidad: datosIniciales.unidadCarga, obtener: (f) => f.carga, fijar: (f, v) => ({ ...f, carga: Number(v) || 0 }) },
  ];

  const sumaPonderaciones = factores.reduce((s, f) => s + f.ponderacion, 0);

  return (
    <div className="flex flex-col gap-5">
      <Pestanas
        etiquetaGrupo="Método de localización"
        valor={vista}
        alCambiar={setVista}
        opciones={[
          { valor: 'puntaje', texto: 'Puntaje ponderado' },
          { valor: 'carga_distancia', texto: 'Carga-distancia' },
          { valor: 'centro_gravedad', texto: 'Centro de gravedad' },
        ]}
      />

      {vista === 'puntaje' && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta
              titulo="Factores y ponderaciones"
              descripcion={
                Math.abs(sumaPonderaciones - 100) < 0.01
                  ? 'Las ponderaciones suman 100.'
                  : `Las ponderaciones suman ${formatearNumero(sumaPonderaciones, { decimales: 1 })}. Se normalizarán a base 100 para que los puntajes sean comparables.`
              }
            >
              <TablaEditable
                filas={factores}
                columnas={columnasFactores}
                clave={(f) => f.id}
                alCambiar={setFactores}
                alAgregar={() =>
                  setFactores((s) => [...s, { id: `f${s.length + 1}-${Date.now()}`, nombre: 'Nuevo factor', ponderacion: 10 }])
                }
                alEliminar={(i) => {
                  const eliminado = factores[i]?.id;
                  setFactores((s) => s.filter((_, k) => k !== i));
                  if (eliminado !== undefined) {
                    setSitios((s) =>
                      s.map((sitio) => {
                        const resto = { ...sitio.calificaciones };
                        delete resto[eliminado];
                        return { ...sitio, calificaciones: resto };
                      }),
                    );
                  }
                }}
                textoAgregar="Agregar factor"
              />
            </Tarjeta>

            <Tarjeta
              titulo="Calificación de cada sitio"
              descripcion={`Escala de ${datosIniciales.escalaMinima} (deficiente) a ${datosIniciales.escalaMaxima} (excelente).`}
            >
              <div className="contenedor-tabla">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Factor</th>
                      {sitios.map((s) => (
                        <th key={s.id} scope="col" className="text-right">
                          {s.nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factores.map((f) => (
                      <tr key={f.id}>
                        <th scope="row" className="text-left text-[0.8125rem]" style={{ padding: '0.25rem 0.7rem' }}>
                          {f.nombre}
                        </th>
                        {sitios.map((s) => (
                          <td key={s.id} style={{ padding: '0.2rem 0.35rem' }}>
                            <input
                              type="number"
                              min={datosIniciales.escalaMinima}
                              max={datosIniciales.escalaMaxima}
                              step="any"
                              className="campo campo-numero w-20 py-0.5"
                              value={String(s.calificaciones[f.id] ?? '')}
                              aria-label={`Calificación de ${s.nombre} en ${f.nombre}`}
                              onChange={(e) => {
                                const n = Number(e.target.value.replace(',', '.'));
                                setSitios((prev) =>
                                  prev.map((x) =>
                                    x.id === s.id
                                      ? { ...x, calificaciones: { ...x.calificaciones, [f.id]: Number.isFinite(n) ? n : 0 } }
                                      : x,
                                  ),
                                );
                              }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Tarjeta>
          </div>

          <ListaDiagnosticos diagnosticos={puntaje.diagnosticos} />

          {puntaje.datos !== null && (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <Tarjeta titulo="Puntajes obtenidos">
                  <BarrasComparativas
                    etiquetaValor="Puntaje ponderado"
                    descripcion="Comparación del puntaje ponderado de cada sitio candidato."
                    datos={puntaje.datos.puntajes.map((p) => ({
                      nombre: p.sitio.nombre,
                      valor: p.puntaje,
                      nota:
                        p.puntajeNormalizado === null
                          ? undefined
                          : `${formatearNumero(p.puntajeNormalizado, { decimales: 1 })} % del máximo posible`,
                    }))}
                  />
                </Tarjeta>

                <Tarjeta
                  titulo="Análisis de sensibilidad de ponderaciones"
                  descripcion="Se barre la ponderación de un factor de 0 a 100 % redistribuyendo el resto. Responde a: ¿cuánto tendría que cambiar de opinión la junta directiva para que gane el otro sitio?"
                >
                  <div className="flex flex-col gap-3">
                    <Selector
                      etiqueta="Factor que se hace variar"
                      valor={factorSensibilidad}
                      opciones={factores.map((f) => ({ valor: f.id, texto: f.nombre }))}
                      alCambiar={setFactorSensibilidad}
                    />

                    {sensibilidad.length > 0 && (
                      <div className="contenedor-tabla" style={{ maxHeight: '18rem' }}>
                        <table className="tabla">
                          <thead>
                            <tr>
                              <th scope="col" className="text-right">Ponderación</th>
                              {sitios.map((s) => (
                                <th key={s.id} scope="col" className="text-right">
                                  {s.nombre}
                                </th>
                              ))}
                              <th scope="col">Gana</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sensibilidad.map((fila, i) => {
                              const ganador = sitios.find((s) => s.id === fila.ganadorId);
                              const cambio = i > 0 && sensibilidad[i - 1]!.ganadorId !== fila.ganadorId;
                              return (
                                <tr key={i} className={cambio ? 'fila-resaltada' : ''}>
                                  <td className="numero">{formatearNumero(fila.ponderacion, { decimales: 0 })} %</td>
                                  {sitios.map((s) => (
                                    <td key={s.id} className="numero">
                                      {formatearNumero(fila.puntajes[s.id] ?? 0, { decimales: 1 })}
                                    </td>
                                  ))}
                                  <td>
                                    <Distintivo tono={cambio ? 'avisar' : 'neutro'}>{ganador?.nombre ?? fila.ganadorId}</Distintivo>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Tarjeta>
              </div>

              <VisorPasos pasos={puntaje.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
              <Interpretacion texto={puntaje.interpretacion} />
            </>
          )}
        </>
      )}

      {(vista === 'carga_distancia' || vista === 'centro_gravedad') && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
            <div className="flex flex-col gap-4">
              <Tarjeta titulo="Puntos de demanda">
                <div className="flex flex-col gap-3">
                  <Selector
                    etiqueta="Métrica de distancia"
                    valor={tipoDistancia}
                    opciones={[
                      { valor: 'rectilinea', texto: 'Rectilínea (Manhattan)' },
                      { valor: 'euclidiana', texto: 'Euclidiana (línea recta)' },
                    ]}
                    alCambiar={setTipoDistancia}
                    ayuda={
                      tipoDistancia === 'rectilinea'
                        ? 'Supone desplazamiento por una retícula de calles.'
                        : 'Supone desplazamiento en línea recta, sin retícula vial.'
                    }
                  />

                  <TablaEditable
                    filas={puntos}
                    columnas={columnasPuntos}
                    clave={(f) => f.id}
                    alCambiar={setPuntos}
                    alAgregar={() =>
                      setPuntos((s) => [...s, { id: `p${s.length + 1}-${Date.now()}`, nombre: `Punto ${s.length + 1}`, punto: { x: 5, y: 5 }, carga: 50 }])
                    }
                    alEliminar={(i) => setPuntos((s) => s.filter((_, k) => k !== i))}
                    textoAgregar="Agregar punto"
                  />
                </div>
              </Tarjeta>

              {vista === 'carga_distancia' && cargaDistancia.datos !== null && (
                <Tarjeta titulo="Puntaje carga-distancia">
                  <BarrasComparativas
                    etiquetaValor={`${datosIniciales.unidadCarga} · ${datosIniciales.unidadDistancia} — menor es mejor`}
                    descripcion="Puntaje carga-distancia de cada localización candidata; menor es mejor."
                    resaltarMinimo
                    datos={cargaDistancia.datos.evaluaciones.map((e) => ({
                      nombre: e.sitio.nombre,
                      valor: e.total,
                      nota:
                        e.distanciaMediaPonderada === null
                          ? undefined
                          : `${formatearNumero(e.distanciaMediaPonderada, { decimales: 2 })} ${datosIniciales.unidadDistancia} por unidad de carga`,
                    }))}
                  />
                </Tarjeta>
              )}

              {vista === 'centro_gravedad' && centro.datos !== null && (
                <div className="grid gap-3">
                  <Indicador
                    etiqueta="Centro de gravedad"
                    valor={`(${formatearNumero(centro.datos.centro.x, { decimales: 2 })}; ${formatearNumero(centro.datos.centro.y, { decimales: 2 })})`}
                    tono="avisar"
                  />
                  <Indicador
                    etiqueta="Carga-distancia en el centro"
                    valor={formatearNumero(centro.datos.cargaDistanciaEnCentro, { decimales: 2 })}
                    nota="Vara de medir para comparar cualquier sitio real"
                  />
                  <Indicador etiqueta="Carga total" valor={formatearNumero(centro.datos.sumaCargas, { decimales: 0 })} unidad={datosIniciales.unidadCarga} />
                </div>
              )}
            </div>

            <Tarjeta
              titulo="Mapa cartesiano"
              descripcion="Arrastre las localizaciones candidatas (cuadrados azules) y observe cómo cambia el puntaje al instante."
              acciones={
                conPunto.length > 1 ? (
                  <div className="w-56">
                    <Selector
                      etiqueta="Candidato resaltado"
                      valor={candidatoActivo ?? conPunto[0]!.id}
                      opciones={conPunto.map((s) => ({ valor: s.id, texto: s.nombre }))}
                      alCambiar={setCandidatoActivo}
                    />
                  </div>
                ) : undefined
              }
            >
              <MapaLocalizacion
                marcas={marcas}
                tipoDistancia={tipoDistancia}
                candidatoActivo={candidatoActivo}
                alMoverCandidato={(id, punto) => setSitios((s) => s.map((x) => (x.id === id ? { ...x, punto } : x)))}
              />
            </Tarjeta>
          </div>

          {vista === 'carga_distancia' ? (
            <>
              <ListaDiagnosticos diagnosticos={cargaDistancia.diagnosticos} />
              {cargaDistancia.datos !== null && (
                <>
                  <VisorPasos pasos={cargaDistancia.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
                  <Interpretacion texto={cargaDistancia.interpretacion} />
                </>
              )}
            </>
          ) : (
            <>
              <ListaDiagnosticos diagnosticos={centro.diagnosticos} />
              {centro.datos !== null && (
                <>
                  <VisorPasos pasos={centro.pasos} revelarTodo={revelarTodo} ocultarResultados={ocultarResultados} />
                  <Interpretacion texto={centro.interpretacion} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
