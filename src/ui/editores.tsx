/**
 * Editores interactivos: matrices numéricas y plano de bloques arrastrable.
 *
 * Todos permiten operación por teclado, porque un editor que solo funciona con
 * ratón deja fuera a una parte de los estudiantes.
 */

import { useRef, useState, type ReactNode } from 'react';
import type { CeldaPlano, Departamento, PlanoBloques } from '@/nucleo/distribucion';
import { formatearNumero } from '@/nucleo/numero';
import { AccionesGrafica } from './graficas';

// ───────────────────────────── Matriz numérica editable ─────────────────────────────

export function MatrizEditable({
  filas,
  columnas,
  valores,
  alCambiarValor,
  alCambiarNombreFila,
  alCambiarNombreColumna,
  admiteProhibidos = false,
  encabezadoFilas = '',
  ofertaLateral,
  demandaInferior,
  etiquetaOferta = 'Oferta',
  etiquetaDemanda = 'Demanda',
  alCambiarOferta,
  alCambiarDemanda,
  soloLectura = false,
}: {
  filas: readonly string[];
  columnas: readonly string[];
  valores: readonly (readonly (number | null)[])[];
  alCambiarValor: (i: number, j: number, v: number | null) => void;
  alCambiarNombreFila?: (i: number, nombre: string) => void;
  alCambiarNombreColumna?: (j: number, nombre: string) => void;
  /** Permite marcar celdas como prohibidas dejándolas vacías. */
  admiteProhibidos?: boolean;
  encabezadoFilas?: string;
  ofertaLateral?: readonly number[];
  demandaInferior?: readonly number[];
  etiquetaOferta?: string;
  etiquetaDemanda?: string;
  alCambiarOferta?: (i: number, v: number) => void;
  alCambiarDemanda?: (j: number, v: number) => void;
  soloLectura?: boolean;
}): ReactNode {
  return (
    <div className="contenedor-tabla">
      <table className="tabla">
        <thead>
          <tr>
            <th scope="col" className="min-w-[9rem]">
              {encabezadoFilas}
            </th>
            {columnas.map((c, j) => (
              <th key={j} scope="col" className="text-right">
                {alCambiarNombreColumna !== undefined && !soloLectura ? (
                  <input
                    className="campo w-24 py-0.5 text-right text-xs"
                    value={c}
                    onChange={(e) => alCambiarNombreColumna(j, e.target.value)}
                    aria-label={`Nombre de la columna ${j + 1}`}
                  />
                ) : (
                  c
                )}
              </th>
            ))}
            {ofertaLateral !== undefined && (
              <th scope="col" className="text-right" style={{ color: 'var(--bien)' }}>
                {etiquetaOferta}
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              <th scope="row" className="text-left text-[0.8125rem] font-bold" style={{ padding: '0.3rem 0.7rem' }}>
                {alCambiarNombreFila !== undefined && !soloLectura ? (
                  <input
                    className="campo w-32 py-0.5 text-xs"
                    value={f}
                    onChange={(e) => alCambiarNombreFila(i, e.target.value)}
                    aria-label={`Nombre de la fila ${i + 1}`}
                  />
                ) : (
                  f
                )}
              </th>

              {columnas.map((c, j) => {
                const v = valores[i]?.[j] ?? null;
                return (
                  <td key={j} style={{ padding: '0.25rem 0.35rem' }}>
                    {soloLectura ? (
                      <span className="numero block">{v === null ? '✕' : formatearNumero(v, { decimales: Number.isInteger(v) ? 0 : 2 })}</span>
                    ) : (
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        className="campo campo-numero w-24 py-0.5"
                        value={v === null ? '' : String(v)}
                        placeholder={admiteProhibidos ? 'prohibido' : '0'}
                        aria-label={`${f} hacia ${c}`}
                        style={v === null && admiteProhibidos ? { background: 'var(--mal-suave)', borderColor: 'var(--mal)' } : undefined}
                        onChange={(e) => {
                          const t = e.target.value;
                          if (t.trim() === '') {
                            alCambiarValor(i, j, admiteProhibidos ? null : 0);
                            return;
                          }
                          const n = Number(t.replace(',', '.'));
                          if (Number.isFinite(n)) alCambiarValor(i, j, n);
                        }}
                      />
                    )}
                  </td>
                );
              })}

              {ofertaLateral !== undefined && (
                <td style={{ padding: '0.25rem 0.35rem' }}>
                  {soloLectura || alCambiarOferta === undefined ? (
                    <span className="numero block font-semibold" style={{ color: 'var(--bien)' }}>
                      {formatearNumero(ofertaLateral[i] ?? 0, { decimales: 0 })}
                    </span>
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      className="campo campo-numero w-24 py-0.5"
                      style={{ borderColor: 'var(--bien)' }}
                      value={String(ofertaLateral[i] ?? 0)}
                      aria-label={`${etiquetaOferta} de ${f}`}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(',', '.'));
                        if (Number.isFinite(n)) alCambiarOferta(i, n);
                      }}
                    />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>

        {demandaInferior !== undefined && (
          <tfoot>
            <tr>
              <td style={{ color: 'var(--acento)' }}>{etiquetaDemanda}</td>
              {columnas.map((c, j) => (
                <td key={j} style={{ padding: '0.25rem 0.35rem' }}>
                  {soloLectura || alCambiarDemanda === undefined ? (
                    <span className="numero block font-semibold" style={{ color: 'var(--acento)' }}>
                      {formatearNumero(demandaInferior[j] ?? 0, { decimales: 0 })}
                    </span>
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      className="campo campo-numero w-24 py-0.5"
                      style={{ borderColor: 'var(--acento)' }}
                      value={String(demandaInferior[j] ?? 0)}
                      aria-label={`${etiquetaDemanda} de ${c}`}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(',', '.'));
                        if (Number.isFinite(n)) alCambiarDemanda(j, n);
                      }}
                    />
                  )}
                </td>
              ))}
              {ofertaLateral !== undefined && (
                <td className="numero">
                  {formatearNumero(
                    (ofertaLateral ?? []).reduce((a, b) => a + b, 0),
                    { decimales: 0 },
                  )}
                  {' / '}
                  {formatearNumero(demandaInferior.reduce((a, b) => a + b, 0), { decimales: 0 })}
                </td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

// ───────────────────────────── Editor de plano de bloques ─────────────────────────────

const PALETA_DEPARTAMENTOS = [
  '#123a5e',
  '#0f7a5a',
  '#b7791f',
  '#7a3f6d',
  '#2c6e8f',
  '#8a5a2b',
  '#3f6b3a',
  '#8f3a3a',
  '#4b4f8f',
];

export function EditorPlano({
  plano,
  departamentos,
  alMover,
  fijos = {},
  centroides,
  alertas = [],
  titulo,
}: {
  plano: PlanoBloques;
  departamentos: readonly Departamento[];
  alMover: (idDepartamento: string, celda: CeldaPlano) => void;
  /** Departamentos que no se pueden mover. */
  fijos?: Readonly<Record<string, boolean>>;
  centroides?: Readonly<Record<string, { x: number; y: number }>>;
  alertas?: readonly { desde: string; hasta: string }[];
  titulo: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const lado = 92;
  const ancho = plano.columnas * lado + 24;
  const alto = plano.filas * lado + 24;

  const ocupante = (fila: number, columna: number): Departamento | null => {
    for (const dep of departamentos) {
      const celdas = plano.asignacion[dep.id] ?? [];
      if (celdas.some((c) => c.fila === fila && c.columna === columna)) return dep;
    }
    return null;
  };

  const colorDe = (id: string): string => {
    const i = departamentos.findIndex((d) => d.id === id);
    return PALETA_DEPARTAMENTOS[i % PALETA_DEPARTAMENTOS.length] ?? '#123a5e';
  };

  const enConflicto = new Set(alertas.flatMap((a) => [a.desde, a.hasta]));

  const activar = (fila: number, columna: number): void => {
    const dep = ocupante(fila, columna);

    if (seleccionado === null) {
      if (dep !== null && fijos[dep.id] !== true) setSeleccionado(dep.id);
      return;
    }
    if (dep !== null && dep.id === seleccionado) {
      setSeleccionado(null);
      return;
    }
    alMover(seleccionado, { fila, columna });
    setSeleccionado(null);
  };

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-auto p-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full"
          style={{ maxWidth: ancho * 1.4 }}
          role="application"
          aria-label={`${titulo}. Retícula de ${plano.filas} filas por ${plano.columnas} columnas. Seleccione un departamento y luego el bloque de destino para intercambiarlos.`}
        >
          {Array.from({ length: plano.filas }, (_, fila) =>
            Array.from({ length: plano.columnas }, (_, columna) => {
              const x = 12 + columna * lado;
              const y = 12 + fila * lado;
              const dep = ocupante(fila, columna);
              const esSeleccionado = dep !== null && dep.id === seleccionado;
              const esFijo = dep !== null && fijos[dep.id] === true;
              const tieneConflicto = dep !== null && enConflicto.has(dep.id);

              return (
                <g
                  key={`${fila}-${columna}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => activar(fila, columna)}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    dep === null
                      ? `Bloque vacío, fila ${fila + 1}, columna ${columna + 1}`
                      : `${dep.nombre}, fila ${fila + 1}, columna ${columna + 1}${esFijo ? ', posición fija' : ''}`
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      activar(fila, columna);
                    }
                  }}
                >
                  <rect
                    x={x + 3}
                    y={y + 3}
                    width={lado - 6}
                    height={lado - 6}
                    rx={7}
                    fill={dep === null ? 'var(--superficie-2)' : colorDe(dep.id)}
                    fillOpacity={dep === null ? 1 : 0.14}
                    stroke={
                      esSeleccionado
                        ? 'var(--acento)'
                        : tieneConflicto
                          ? 'var(--mal)'
                          : dep === null
                            ? 'var(--borde)'
                            : colorDe(dep.id)
                    }
                    strokeWidth={esSeleccionado ? 4 : tieneConflicto ? 3 : dep === null ? 1.5 : 2}
                    strokeDasharray={dep === null ? '5 4' : undefined}
                  />

                  {dep !== null && (
                    <>
                      <text
                        x={x + lado / 2}
                        y={y + lado / 2 - 6}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight={700}
                        fill={colorDe(dep.id)}
                      >
                        {dep.id.toUpperCase()}
                      </text>
                      <foreignObject x={x + 8} y={y + lado / 2} width={lado - 16} height={lado / 2 - 10}>
                        <div
                          style={{
                            fontSize: '9px',
                            lineHeight: 1.15,
                            textAlign: 'center',
                            color: 'var(--tinta-media)',
                            fontFamily: 'var(--font-cuerpo)',
                          }}
                        >
                          {dep.nombre}
                        </div>
                      </foreignObject>
                      {esFijo && (
                        <text x={x + lado - 12} y={y + 18} textAnchor="end" fontSize={10} fill="var(--tinta-tenue)">
                          fijo
                        </text>
                      )}
                    </>
                  )}

                  <text x={x + 10} y={y + 18} fontSize={9} fill="var(--tinta-tenue)" fontFamily="var(--font-dato)">
                    {fila + 1},{columna + 1}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span style={{ color: 'var(--tinta-media)' }}>
          {seleccionado === null
            ? 'Haga clic (o pulse Enter) sobre un departamento para seleccionarlo y luego sobre el bloque de destino.'
            : `Seleccionado: ${departamentos.find((d) => d.id === seleccionado)?.nombre ?? seleccionado}. Elija a dónde moverlo.`}
          {centroides !== undefined && ' El puntaje se recalcula con cada movimiento.'}
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="plano-de-distribucion" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Tabla editable genérica ─────────────────────────────

export interface ColumnaEditable<T> {
  readonly clave: string;
  readonly encabezado: string;
  readonly tipo: 'texto' | 'numero' | 'seleccion';
  readonly ancho?: string;
  readonly opciones?: readonly { valor: string; texto: string }[];
  readonly obtener: (fila: T) => string | number;
  readonly fijar: (fila: T, valor: string) => T;
  readonly unidad?: string;
}

export function TablaEditable<T>({
  filas,
  columnas,
  alCambiar,
  alAgregar,
  alEliminar,
  textoAgregar = 'Agregar fila',
  minimoFilas = 1,
  clave,
}: {
  filas: readonly T[];
  columnas: readonly ColumnaEditable<T>[];
  alCambiar: (filas: T[]) => void;
  alAgregar?: () => void;
  alEliminar?: (indice: number) => void;
  textoAgregar?: string;
  minimoFilas?: number;
  clave: (fila: T, indice: number) => string;
}): ReactNode {
  const actualizar = (indice: number, columna: ColumnaEditable<T>, valor: string): void => {
    const copia = [...filas];
    const actual = copia[indice];
    if (actual === undefined) return;
    copia[indice] = columna.fijar(actual, valor);
    alCambiar(copia);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="contenedor-tabla">
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.clave} scope="col" style={{ width: c.ancho }} className={c.tipo === 'numero' ? 'text-right' : ''}>
                  {c.encabezado}
                  {c.unidad !== undefined && <span className="ml-1 font-normal opacity-70">({c.unidad})</span>}
                </th>
              ))}
              {alEliminar !== undefined && <th scope="col" className="w-10" aria-label="Acciones" />}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={clave(fila, i)}>
                {columnas.map((c) => (
                  <td key={c.clave} style={{ padding: '0.25rem 0.35rem' }}>
                    {c.tipo === 'seleccion' ? (
                      <select
                        className="campo py-0.5 text-xs"
                        value={String(c.obtener(fila))}
                        aria-label={`${c.encabezado}, fila ${i + 1}`}
                        onChange={(e) => actualizar(i, c, e.target.value)}
                      >
                        {(c.opciones ?? []).map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.texto}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={c.tipo === 'numero' ? 'number' : 'text'}
                        inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                        step={c.tipo === 'numero' ? 'any' : undefined}
                        className={`campo py-0.5 text-xs ${c.tipo === 'numero' ? 'campo-numero' : ''}`}
                        value={String(c.obtener(fila))}
                        aria-label={`${c.encabezado}, fila ${i + 1}`}
                        onChange={(e) => actualizar(i, c, e.target.value)}
                      />
                    )}
                  </td>
                ))}
                {alEliminar !== undefined && (
                  <td style={{ padding: '0.25rem 0.35rem' }}>
                    <button
                      type="button"
                      className="boton boton-suave boton-pequeno"
                      disabled={filas.length <= minimoFilas}
                      onClick={() => alEliminar(i)}
                      aria-label={`Eliminar fila ${i + 1}`}
                      title={filas.length <= minimoFilas ? 'Debe quedar al menos una fila' : 'Eliminar'}
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alAgregar !== undefined && (
        <div>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={alAgregar}>
            + {textoAgregar}
          </button>
        </div>
      )}
    </div>
  );
}
