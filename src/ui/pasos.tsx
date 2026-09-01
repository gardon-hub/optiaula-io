/**
 * Visor de procedimiento paso a paso.
 *
 * Es la pieza central del modelo pedagógico: en modo estudiante se despliega
 * un paso a la vez con el botón «Mostrar siguiente paso», y en modo proyección
 * ocupa la pantalla con tipografía grande y controles visibles para explicar en
 * clase. Cada paso trae el porqué, no solo el cálculo.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MatrizPaso, Paso, TablaPaso } from '@/nucleo/tipos';
import { claveCelda } from '@/nucleo/tipos';
import { formatearNumero } from '@/nucleo/numero';
import { Formula, TextoFormateado } from './base';

// ───────────────────────────── Tabla de un paso ─────────────────────────────

/**
 * Celda de una fila de totales.
 *
 * Los motores dejan en blanco las columnas que no se totalizan —una distancia
 * media o una clasificación no se suman—. En pantalla eso se lee bien, pero un
 * lector de pantalla anuncia «en blanco», que no distingue «no aplica» de un
 * dato que falta. El guion largo lo dice, y es el mismo que la aplicación ya usa
 * para lo ausente en el cuerpo de las tablas.
 */
function celdaDePie(celda: string): string {
  return celda.trim() === '' ? '—' : celda;
}

export function TablaDePaso({ tabla }: { tabla: TablaPaso }): ReactNode {
  const resaltadas = new Set(tabla.resaltadas ?? []);

  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            {tabla.encabezados.map((h, i) => (
              <th key={i} scope="col" className={i === 0 ? '' : 'text-right'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila, i) => (
            <tr key={i} className={resaltadas.has(i) ? 'fila-resaltada' : ''}>
              {fila.map((celda, j) => (
                <td key={j} className={j === 0 ? '' : 'numero'}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {tabla.pie !== undefined && (
          <tfoot>
            <tr>
              {tabla.pie.map((celda, j) => (
                <td key={j} className={j === 0 ? '' : 'numero'}>
                  {celdaDePie(celda)}
                </td>
              ))}
            </tr>
            {tabla.pieAdicional !== undefined && (
              <tr>
                {tabla.pieAdicional.map((celda, j) => (
                  <td key={j} className={j === 0 ? '' : 'numero'}>
                    {celdaDePie(celda)}
                  </td>
                ))}
              </tr>
            )}
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ───────────────────────────── Matriz de un paso ─────────────────────────────

export function MatrizDePaso({ matriz }: { matriz: MatrizPaso }): ReactNode {
  const seleccionadas = new Set((matriz.seleccionadas ?? []).map((c) => claveCelda(c.fila, c.columna)));
  const cubiertas = new Set((matriz.cubiertas ?? []).map((c) => claveCelda(c.fila, c.columna)));
  const filasCubiertas = new Set(matriz.filasCubiertas ?? []);
  const columnasCubiertas = new Set(matriz.columnasCubiertas ?? []);

  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            {/* La esquina de una matriz encabeza la columna de rótulos de fila.
                Vacía, un lector de pantalla la anuncia como celda sin nombre. */}
            <th scope="col">
              <span className="sr-only">Fila</span>
            </th>
            {matriz.columnas.map((c, j) => (
              <th
                key={j}
                scope="col"
                className="text-right"
                style={columnasCubiertas.has(j) ? { background: 'var(--acento-suave)', color: 'var(--acento)' } : undefined}
              >
                {c}
                {columnasCubiertas.has(j) && <span className="ml-1" aria-label="columna cubierta">│</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matriz.valores.map((fila, i) => (
            <tr key={i}>
              <th
                scope="row"
                className="text-left text-[0.8125rem] font-bold"
                style={
                  filasCubiertas.has(i)
                    ? { background: 'var(--acento-suave)', color: 'var(--acento)', padding: '0.42rem 0.7rem' }
                    : { padding: '0.42rem 0.7rem' }
                }
              >
                {matriz.filas[i]}
                {filasCubiertas.has(i) && <span className="ml-1" aria-label="fila cubierta">─</span>}
              </th>
              {fila.map((v, j) => {
                const clave = claveCelda(i, j);
                const esSeleccionada = seleccionadas.has(clave);
                const esCubierta = cubiertas.has(clave);
                const enLinea = filasCubiertas.has(i) || columnasCubiertas.has(j);
                const etiqueta = matriz.etiquetas?.[clave];

                const estilo: React.CSSProperties = esSeleccionada
                  ? { background: 'var(--bien-suave)', color: 'var(--bien)', fontWeight: 700, boxShadow: 'inset 0 0 0 2px var(--bien)' }
                  : esCubierta
                    ? { background: 'var(--avisar-suave)', color: 'var(--avisar)', fontWeight: 700 }
                    : enLinea
                      ? { background: 'var(--acento-suave)' }
                      : {};

                return (
                  <td key={j} className="numero" style={estilo}>
                    {v === null ? (
                      <span title="Asignación prohibida" style={{ color: 'var(--mal)' }}>
                        ✕
                      </span>
                    ) : (
                      <>
                        {formatearNumero(v, { decimales: Number.isInteger(v) ? 0 : 2 })}
                        {etiqueta !== undefined && (
                          <span
                            className="ml-1.5 rounded px-1 py-px text-[0.6875rem] font-bold"
                            style={{ background: 'var(--bien)', color: 'var(--superficie)' }}
                            title="Cantidad asignada"
                          >
                            {etiqueta}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────── Un paso ─────────────────────────────

export function VistaPaso({ paso, compacto = false }: { paso: Paso; compacto?: boolean }): ReactNode {
  return (
    <article className="aparece flex flex-col gap-3">
      <header className="flex items-baseline gap-2.5">
        <span
          className="dato flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          style={{ background: 'var(--acento)', color: 'var(--acento-contraste)' }}
          aria-hidden="true"
        >
          {paso.numero}
        </span>
        <h3 className="min-w-0">{paso.titulo}</h3>
      </header>

      {/* La explicación admite negritas y párrafos: varios módulos las usan
          para separar las partes de una iteración o destacar el término clave. */}
      <div style={{ color: 'var(--tinta-media)' }}>
        <TextoFormateado texto={paso.explicacion} />
      </div>

      {paso.formula !== undefined && (
        <div
          className="overflow-x-auto rounded-lg px-4 py-3 text-center"
          style={{ background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}
        >
          <Formula tex={paso.formula} bloque />
        </div>
      )}

      {paso.tabla !== undefined && !compacto && <TablaDePaso tabla={paso.tabla} />}
      {paso.matriz !== undefined && !compacto && <MatrizDePaso matriz={paso.matriz} />}

      {paso.valor !== undefined && Number.isFinite(paso.valor) && (
        <p className="flex items-baseline gap-2">
          <span className="etiqueta">Resultado del paso</span>
          <span className="dato text-lg font-semibold" style={{ color: 'var(--acento)' }}>
            {formatearNumero(paso.valor, { decimales: Number.isInteger(paso.valor) ? 0 : 4 })}
            {paso.unidad !== undefined && (
              <span className="ml-1 text-xs font-normal" style={{ color: 'var(--tinta-tenue)' }}>
                {paso.unidad}
              </span>
            )}
          </span>
        </p>
      )}
    </article>
  );
}

// ───────────────────────────── Visor completo ─────────────────────────────

export function VisorPasos({
  pasos,
  titulo = 'Procedimiento paso a paso',
  revelarTodo = false,
  ocultarResultados = false,
}: {
  /**
   * Los pasos del procedimiento.
   *
   * **Debe ser estable entre renders**: memorícelo en quien lo pasa. El visor
   * vuelve al paso 1 cuando cambia la identidad de este arreglo, que es lo
   * correcto si el procedimiento cambió, pero un arreglo construido en el JSX
   * —`pasos={[...a.pasos, ...b.pasos]}`— es nuevo en cada render y devolvería al
   * estudiante al primer paso cada vez que el laboratorio se vuelva a dibujar.
   */
  pasos: readonly Paso[];
  titulo?: string;
  /** En modo docente o al revisar, se muestra todo de una vez. */
  revelarTodo?: boolean;
  /** Modo proyección: permite ocultar los resultados antes de revelarlos. */
  ocultarResultados?: boolean;
}): ReactNode {
  const [visibles, setVisibles] = useState(revelarTodo ? pasos.length : 1);
  const [oculto, setOculto] = useState(ocultarResultados);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibles(revelarTodo ? pasos.length : 1);
  }, [pasos, revelarTodo]);

  useEffect(() => {
    setOculto(ocultarResultados);
  }, [ocultarResultados]);

  if (pasos.length === 0) return null;

  const mostrados = pasos.slice(0, Math.min(visibles, pasos.length));
  const quedan = pasos.length - mostrados.length;

  return (
    // El nombre accesible convierte la sección en una región identificable:
    // una pantalla puede tener dos visores —procedimiento y sensibilidad— y sin
    // etiqueta son indistinguibles para un lector de pantalla.
    <section className="tarjeta flex flex-col gap-4 p-4" aria-label={titulo}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="etiqueta">{titulo}</p>
          <p className="dato text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Paso {mostrados.length} de {pasos.length}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ocultarResultados && (
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setOculto((v) => !v)}>
              {oculto ? 'Revelar resultados' : 'Ocultar resultados'}
            </button>
          )}
          <button
            type="button"
            className="boton boton-suave boton-pequeno"
            onClick={() => setVisibles(1)}
            disabled={visibles <= 1}
          >
            Reiniciar
          </button>
          <button
            type="button"
            className="boton boton-secundario boton-pequeno"
            onClick={() => setVisibles((v) => Math.max(1, v - 1))}
            disabled={visibles <= 1}
          >
            ← Anterior
          </button>
          <button
            type="button"
            className="boton boton-primario boton-pequeno"
            onClick={() => {
              setVisibles((v) => Math.min(pasos.length, v + 1));
              window.setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
            }}
            disabled={quedan === 0}
          >
            {quedan === 0 ? 'Procedimiento completo' : 'Mostrar siguiente paso'}
          </button>
          <button
            type="button"
            className="boton boton-suave boton-pequeno ocultar-en-proyeccion"
            onClick={() => setVisibles(pasos.length)}
            disabled={quedan === 0}
          >
            Ver todo
          </button>
        </div>
      </header>

      <div
        className="h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--superficie-3)' }}
        role="progressbar"
        aria-valuenow={mostrados.length}
        aria-valuemin={0}
        aria-valuemax={pasos.length}
        aria-label="Avance del procedimiento"
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${(mostrados.length / pasos.length) * 100}%`, background: 'var(--acento)' }}
        />
      </div>

      <div className="flex flex-col gap-6">
        {/* La clave es la posición y no `paso.numero`: la lista solo crece por el
            final y nunca se reordena, mientras que el número lo pone cada
            solucionador desde 1 y se repite si se muestran dos procedimientos
            unidos. Con la clave repetida React puede omitir o duplicar pasos. */}
        {mostrados.map((paso, i) => (
          <div key={i}>
            {i > 0 && <hr className="separador mb-6" />}
            <VistaPaso paso={paso} compacto={oculto} />
          </div>
        ))}
      </div>

      {oculto && (
        <p className="aviso aviso-nota">
          Los resultados están ocultos. Pida a la clase que anticipe el valor antes de revelarlo.
        </p>
      )}

      <div ref={finRef} />
    </section>
  );
}

// ───────────────────────────── Interpretación gerencial ─────────────────────────────

export function Interpretacion({ texto, titulo = 'Interpretación gerencial' }: { texto: string; titulo?: string }): ReactNode {
  if (texto.trim() === '') return null;

  return (
    <section
      className="franja rounded-lg py-3 pr-4"
      style={{ color: 'var(--bien)', background: 'var(--bien-suave)', border: '1px solid var(--bien)' }}
    >
      <p className="etiqueta mb-1">{titulo}</p>
      <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta)' }}>
        {texto}
      </p>
    </section>
  );
}
