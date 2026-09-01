/**
 * Laboratorio del módulo 10 — Modelo de asignación.
 *
 * Matriz editable con soporte para asignaciones prohibidas, matrices
 * rectangulares y maximización, más la animación completa del método húngaro:
 * matriz original, conversión, reducciones, cobertura de ceros, ajuste y
 * selección final.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import { resolverAsignacion, type DatosAsignacion } from '@/nucleo/asignacion';
import { formatearNumero } from '@/nucleo/numero';
import type { Objetivo } from '@/nucleo/tipos';
import { CampoTexto, Distintivo, Indicador, ListaDiagnosticos, Selector, Tarjeta } from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { MatrizEditable } from '@/ui/editores';

export function LabAsignacion({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'asignacion' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [datos, setDatos] = useState<DatosAsignacion>(() => ({
    titulo,
    filas: [...datosIniciales.filas],
    columnas: [...datosIniciales.columnas],
    matriz: datosIniciales.matriz.map((f) => [...f]),
    objetivo: datosIniciales.objetivo,
    unidad: datosIniciales.unidad,
    nombreFilas: datosIniciales.nombreFilas,
    nombreColumnas: datosIniciales.nombreColumnas,
  }));

  const [permitirProhibidos, setPermitirProhibidos] = useState(datosIniciales.matriz.flat().some((v) => v === null));

  const resultado = useMemo(() => resolverAsignacion(datos), [datos]);
  const d = resultado.datos;

  const cambiarTamano = (filas: number, columnas: number): void => {
    setDatos((s) => {
      const nuevasFilas = Array.from({ length: filas }, (_, i) => s.filas[i] ?? `${capitalizar(s.nombreFilas)} ${i + 1}`);
      const nuevasColumnas = Array.from({ length: columnas }, (_, j) => s.columnas[j] ?? `${capitalizar(s.nombreColumnas)} ${j + 1}`);
      const nuevaMatriz = Array.from({ length: filas }, (_, i) =>
        Array.from({ length: columnas }, (_, j) => s.matriz[i]?.[j] ?? 0),
      );
      return { ...s, filas: nuevasFilas, columnas: nuevasColumnas, matriz: nuevaMatriz };
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta
        titulo="Matriz del problema"
        descripcion={
          permitirProhibidos
            ? 'Deje una celda vacía para marcarla como asignación prohibida. Aparecerá con fondo rojo y el método la evitará.'
            : 'Cada celda contiene el costo o el beneficio de asignar esa fila a esa columna.'
        }
        acciones={
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36">
              <Selector
                etiqueta="Objetivo"
                valor={datos.objetivo}
                opciones={[
                  { valor: 'minimizar', texto: 'Minimizar' },
                  { valor: 'maximizar', texto: 'Maximizar' },
                ]}
                alCambiar={(v) => setDatos((s) => ({ ...s, objetivo: v as Objetivo }))}
              />
            </div>
            <button
              type="button"
              className={`boton boton-pequeno ${permitirProhibidos ? 'boton-primario' : 'boton-secundario'}`}
              onClick={() => setPermitirProhibidos((v) => !v)}
            >
              {permitirProhibidos ? 'Prohibiciones activas' : 'Permitir prohibiciones'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="etiqueta">{capitalizar(datos.nombreFilas)}</span>
              <input
                type="number"
                min={1}
                max={8}
                className="campo campo-numero w-20"
                value={datos.filas.length}
                onChange={(e) => cambiarTamano(Math.max(1, Math.min(8, Number(e.target.value) || 1)), datos.columnas.length)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="etiqueta">{capitalizar(datos.nombreColumnas)}</span>
              <input
                type="number"
                min={1}
                max={8}
                className="campo campo-numero w-20"
                value={datos.columnas.length}
                onChange={(e) => cambiarTamano(datos.filas.length, Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              />
            </label>
            <div className="w-40">
              <CampoTexto etiqueta="Unidad" valor={datos.unidad} alCambiar={(v) => setDatos((s) => ({ ...s, unidad: v }))} />
            </div>

            {datos.filas.length !== datos.columnas.length && (
              <Distintivo tono="avisar">
                Matriz rectangular: se agregarán {Math.abs(datos.filas.length - datos.columnas.length)}{' '}
                {datos.filas.length < datos.columnas.length ? 'fila(s)' : 'columna(s)'} ficticia(s)
              </Distintivo>
            )}
          </div>

          <MatrizEditable
            filas={datos.filas}
            columnas={datos.columnas}
            valores={datos.matriz}
            admiteProhibidos={permitirProhibidos}
            encabezadoFilas={`${capitalizar(datos.nombreFilas)} \\ ${capitalizar(datos.nombreColumnas)}`}
            alCambiarValor={(i, j, v) =>
              setDatos((s) => ({
                ...s,
                matriz: s.matriz.map((fila, fi) => (fi === i ? fila.map((celda, cj) => (cj === j ? v : celda)) : fila)),
              }))
            }
            alCambiarNombreFila={(i, nombre) =>
              setDatos((s) => ({ ...s, filas: s.filas.map((f, k) => (k === i ? nombre : f)) }))
            }
            alCambiarNombreColumna={(j, nombre) =>
              setDatos((s) => ({ ...s, columnas: s.columnas.map((c, k) => (k === j ? nombre : c)) }))
            }
          />
        </div>
      </Tarjeta>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      {d !== null && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador
              etiqueta={datos.objetivo === 'minimizar' ? 'Costo total mínimo' : 'Beneficio total máximo'}
              valor={formatearNumero(d.valorTotal, { decimales: 2 })}
              unidad={datos.unidad}
              tono="acento"
            />
            <Indicador etiqueta="Iteraciones de cobertura" valor={d.iteraciones} nota={d.iteraciones === 0 ? 'Las reducciones bastaron' : undefined} />
            <Indicador
              etiqueta="Soluciones óptimas"
              valor={d.solucionesAlternativas ? 'varias' : 'única'}
              tono={d.solucionesAlternativas ? 'avisar' : 'bien'}
              nota={d.solucionesAlternativas ? 'Se puede elegir por criterios no numéricos' : undefined}
            />
            <Indicador
              etiqueta="Sin asignar"
              valor={d.sinAsignar.length === 0 ? 'ninguno' : d.sinAsignar.length}
              nota={d.sinAsignar.length > 0 ? d.sinAsignar.join(', ') : undefined}
              tono={d.sinAsignar.length > 0 ? 'avisar' : 'bien'}
            />
          </div>

          <Tarjeta titulo="Asignación óptima">
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">{capitalizar(datos.nombreFilas)}</th>
                    <th scope="col">{capitalizar(datos.nombreColumnas)}</th>
                    <th scope="col" className="text-right">Valor ({datos.unidad})</th>
                  </tr>
                </thead>
                <tbody>
                  {d.asignaciones.map((a, i) => (
                    <tr key={i} className={a.ficticia ? '' : undefined}>
                      <td className={a.ficticia ? 'opacity-55' : 'font-semibold'}>{a.nombreFila}</td>
                      <td className={a.ficticia ? 'opacity-55' : ''}>{a.nombreColumna}</td>
                      <td className="numero">
                        {a.ficticia ? <span style={{ color: 'var(--tinta-tenue)' }}>ficticia</span> : formatearNumero(a.valor ?? 0, { decimales: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total</td>
                    <td className="numero">{formatearNumero(d.valorTotal, { decimales: 2 })}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Tarjeta>

          <VisorPasos
            pasos={resultado.pasos}
            titulo="Método húngaro paso a paso"
            revelarTodo={revelarTodo}
            ocultarResultados={ocultarResultados}
          />
          <Interpretacion texto={resultado.interpretacion} />
        </>
      )}
    </div>
  );
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
