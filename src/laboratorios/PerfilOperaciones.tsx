/**
 * Simulador del perfil de operaciones: dónde queda una organización en el
 * continuo entre manufactura y servicios.
 *
 * Está separado de `LabFundamentos` porque es una actividad distinta —allí se
 * clasifican elementos de un sistema, aquí se perfila una organización— y
 * porque el archivo del laboratorio ya era largo.
 *
 * La decisión de diseño que importa: las **consecuencias operativas se muestran
 * mientras el estudiante mueve los controles**, no al final. Si aparecieran solo
 * al comprobar, el ejercicio volvería a ser un cuestionario con respuesta
 * correcta. Mostrándolas en vivo, mover un control enseña algo: subir el
 * contacto con el cliente hace aparecer la variabilidad que el gerente no
 * controla, y bajar la almacenabilidad convierte el inventario en un
 * amortiguador que ya no está disponible.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  NOMBRE_NATURALEZA,
  RASGOS,
  clasificar,
  resolverNaturaleza,
  type Perfil,
  type RasgoId,
} from '@/nucleo/naturalezaOperaciones';
import { formatearNumero } from '@/nucleo/numero';
import { Deslizador, Distintivo, Indicador, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';

export interface CasoNaturaleza {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly perfilReferencia: Perfil;
  readonly justificacion: string;
}

/** Punto de partida neutro: todo en el centro, para que el perfil lo haga el estudiante. */
const PERFIL_NEUTRO: Perfil = Object.fromEntries(RASGOS.map((r) => [r.id, 50])) as Perfil;

/** Posición del marcador en la barra del continuo, acotada para que no se salga. */
function posicion(indice: number): string {
  return `${Math.min(97, Math.max(3, indice))}%`;
}

export function PerfilOperaciones({
  casos,
  revelarTodo,
  ocultarResultados,
}: {
  casos: readonly CasoNaturaleza[];
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [casoId, setCasoId] = useState<string>(() => casos[0]?.id ?? '');
  const [perfiles, setPerfiles] = useState<Record<string, Perfil>>({});
  const [comparando, setComparando] = useState(false);

  const caso = casos.find((c) => c.id === casoId) ?? casos[0] ?? null;
  const perfil = caso === null ? PERFIL_NEUTRO : (perfiles[caso.id] ?? PERFIL_NEUTRO);

  const resultado = useMemo(
    () =>
      caso === null
        ? null
        : resolverNaturaleza({
            organizacion: caso.nombre,
            descripcion: caso.descripcion,
            perfil,
            referencia: comparando ? caso.perfilReferencia : null,
          }),
    [caso, perfil, comparando],
  );

  if (caso === null || resultado === null || resultado.datos === null) return null;
  const d = resultado.datos;

  const fijar = (rasgo: RasgoId, valor: number): void => {
    setPerfiles((s) => ({ ...s, [caso.id]: { ...perfil, [rasgo]: valor } }));
  };

  const reiniciar = (): void => {
    setPerfiles((s) => ({ ...s, [caso.id]: PERFIL_NEUTRO }));
    setComparando(false);
  };

  const tonoDe = (n: 'manufactura' | 'mixta' | 'servicios'): 'acento' | 'avisar' | 'bien' =>
    n === 'manufactura' ? 'acento' : n === 'servicios' ? 'bien' : 'avisar';

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta
        titulo="Perfil de operaciones"
        descripcion="Manufactura y servicios no son dos casillas sino los extremos de un continuo. Sitúe la organización en cada rasgo y observe qué le obliga a hacer."
        acciones={
          <>
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={reiniciar}>
              Volver al centro
            </button>
            <button
              type="button"
              className={`boton boton-pequeno ${comparando ? 'boton-suave' : 'boton-primario'}`}
              onClick={() => setComparando((v) => !v)}
            >
              {comparando ? 'Ocultar el criterio del docente' : 'Comparar con el criterio del docente'}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {casos.length > 1 && (
            <div className="w-full sm:max-w-md">
              <Selector
                etiqueta="Organización"
                valor={caso.id}
                opciones={casos.map((c) => ({ valor: c.id, texto: c.nombre }))}
                alCambiar={(v) => {
                  setCasoId(v);
                  setComparando(false);
                }}
              />
            </div>
          )}

          <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            {caso.descripcion}
          </p>

          {/* El continuo. Es la lectura de un vistazo: dónde quedó y, si se está
              comparando, dónde lo pone el docente. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between text-[0.6875rem] font-bold uppercase tracking-wide" style={{ color: 'var(--tinta-tenue)' }}>
              <span>Manufactura</span>
              <span>Servicios</span>
            </div>
            <div
              className="relative h-8 rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--acento-suave), var(--superficie-2), var(--bien-suave))', border: '1px solid var(--borde)' }}
              role="img"
              aria-label={`Índice ${formatearNumero(d.indice, { decimales: 1 })} de 100: ${NOMBRE_NATURALEZA[d.naturaleza]}.`}
            >
              {comparando && d.indiceReferencia !== null && (
                <div
                  className="absolute top-0 h-full"
                  style={{ left: posicion(d.indiceReferencia), width: 2, background: 'var(--tinta-media)', transform: 'translateX(-1px)' }}
                  title={`Criterio del docente: ${formatearNumero(d.indiceReferencia, { decimales: 1 })}`}
                />
              )}
              <div
                className="absolute top-1/2 flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-bold"
                style={{
                  left: posicion(d.indice),
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--acento)',
                  color: 'var(--acento-contraste)',
                  border: '2px solid var(--superficie)',
                }}
              >
                {formatearNumero(d.indice, { decimales: 0 })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Distintivo tono={tonoDe(d.naturaleza)}>{NOMBRE_NATURALEZA[d.naturaleza]}</Distintivo>
              {comparando && d.naturalezaReferencia !== null && (
                <span className="text-xs" style={{ color: 'var(--tinta-media)' }}>
                  La línea marca el criterio del docente:{' '}
                  {formatearNumero(d.indiceReferencia ?? 0, { decimales: 1 })} — {NOMBRE_NATURALEZA[d.naturalezaReferencia]}
                </span>
              )}
            </div>
          </div>

          {/* Los ocho controles. */}
          <div className="grid gap-4 lg:grid-cols-2">
            {RASGOS.map((r) => {
              const dif = d.diferencias.find((x) => x.rasgo === r.id);
              const discrepa = d.discrepancias.some((x) => x.rasgo === r.id);
              return (
                <div
                  key={r.id}
                  className="tarjeta-plana flex flex-col gap-1.5 p-3"
                  style={discrepa ? { borderColor: 'var(--avisar)' } : undefined}
                >
                  <Deslizador
                    etiqueta={r.nombre}
                    valor={perfil[r.id]}
                    minimo={0}
                    maximo={100}
                    paso={5}
                    alCambiar={(v) => fijar(r.id, v)}
                  />
                  <div className="flex justify-between gap-3 text-[0.6875rem]" style={{ color: 'var(--tinta-tenue)' }}>
                    <span className="max-w-[46%]">{r.poloManufactura}</span>
                    <span className="max-w-[46%] text-right">{r.poloServicios}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--tinta-media)' }}>
                    {r.pregunta}
                  </p>
                  {comparando && dif !== undefined && (
                    <p className="text-xs" style={{ color: discrepa ? 'var(--avisar)' : 'var(--bien)' }}>
                      Criterio del docente: {formatearNumero(dif.valorReferencia, { decimales: 0 })}
                      {discrepa
                        ? ` — se aparta ${formatearNumero(dif.diferencia, { decimales: 0 })} puntos.`
                        : ' — coinciden.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Tarjeta>

      {/* Lo que el perfil obliga a hacer. Es el corazón de la simulación: cambia
          en vivo al mover los controles. */}
      <Tarjeta
        titulo="Qué le obliga este perfil"
        descripcion="Cada rasgo que queda en un extremo impone una forma de administrar la operación. En la zona intermedia no se afirma nada: ahí la organización todavía puede elegir."
      >
        {d.consecuencias.length === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Ningún rasgo está lo bastante marcado como para imponer una forma de administrar. Mueva los controles hacia
            un extremo y aparecerán las consecuencias.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.consecuencias.map((c) => (
              <div
                key={c.rasgo}
                className="tarjeta-plana flex flex-col gap-1 p-3"
                style={{ borderLeftWidth: 3, borderLeftColor: c.lado === 'servicios' ? 'var(--bien)' : 'var(--acento)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h4>{c.titulo}</h4>
                  <Distintivo tono={c.lado === 'servicios' ? 'bien' : 'acento'}>
                    {RASGOS.find((r) => r.id === c.rasgo)!.nombre}
                  </Distintivo>
                </div>
                <p className="text-xs" style={{ color: 'var(--tinta-media)' }}>
                  {c.texto}
                </p>
              </div>
            ))}
          </div>
        )}
      </Tarjeta>

      {comparando && (
        <Tarjeta titulo={`Por qué el docente sitúa así ${caso.nombre.toLowerCase()}`}>
          <p className="prosa text-[0.875rem]">{caso.justificacion}</p>
          {d.discrepancias.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="etiqueta">Dónde difieren</p>
              {d.discrepancias.map((x) => (
                <p key={x.rasgo} className="aviso aviso-avisar text-[0.8125rem]">
                  <span>
                    <strong>{x.nombre}.</strong> Usted lo situó en{' '}
                    {formatearNumero(x.valorEstudiante, { decimales: 0 })} y el docente en{' '}
                    {formatearNumero(x.valorReferencia, { decimales: 0 })}. No significa que esté mal: son criterios, no
                    mediciones. Vale la pena preguntarse cuál de los dos describe mejor a esta organización.
                  </span>
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[0.8125rem]" style={{ color: 'var(--bien)' }}>
              Su perfil coincide con el del docente en los ocho rasgos, dentro de la tolerancia.
            </p>
          )}
        </Tarjeta>
      )}

      <VisorPasos
        pasos={resultado.pasos}
        titulo="Cómo se lee el perfil"
        revelarTodo={revelarTodo}
        ocultarResultados={ocultarResultados}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador etiqueta="Índice del perfil" valor={formatearNumero(d.indice, { decimales: 1 })} />
        <Indicador etiqueta="Lectura" valor={NOMBRE_NATURALEZA[d.naturaleza]} tono={tonoDe(d.naturaleza)} />
        <Indicador etiqueta="Consecuencias operativas" valor={String(d.consecuencias.length)} />
      </div>

      <Interpretacion titulo="Lectura gerencial" texto={resultado.interpretacion} />

      <Tarjeta titulo="Compare los cuatro casos">
        <div className="contenedor-tabla overflow-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Organización</th>
                <th scope="col" className="text-right">Índice del docente</th>
                <th scope="col">Lectura</th>
              </tr>
            </thead>
            <tbody>
              {casos.map((c) => {
                const indice =
                  RASGOS.reduce((s, r) => s + c.perfilReferencia[r.id], 0) / RASGOS.length;
                const n = clasificar(indice);
                return (
                  <tr key={c.id} style={c.id === caso.id ? { background: 'var(--superficie-2)' } : undefined}>
                    <td>{c.nombre}</td>
                    <td className="numero">{formatearNumero(indice, { decimales: 1 })}</td>
                    <td>
                      <Distintivo tono={tonoDe(n)}>{NOMBRE_NATURALEZA[n]}</Distintivo>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--tinta-media)' }}>
          Los cuatro casos cubren el continuo de punta a punta. El más instructivo no es ninguno de los extremos sino la
          cooperativa: fabrica un bien tangible y almacenable, y aun así atiende al cliente cara a cara todos los días.
        </p>
      </Tarjeta>
    </div>
  );
}
