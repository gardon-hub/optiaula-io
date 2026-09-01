/**
 * Laboratorio del módulo 9 — Método simplex.
 *
 * El modelo se edita con cualquier número de variables y restricciones, y cada
 * cambio vuelve a resolver y a redibujar todos los tableaux al instante. Lo que
 * el estudiante ve es exactamente lo que escribiría en el cuaderno: fracciones
 * exactas, la columna que entra marcada con una flecha y la fila que sale
 * resaltada.
 *
 * El interruptor de notación existe porque las dos lecturas hacen falta: la
 * fracción para seguir el procedimiento a mano, el decimal para comparar
 * magnitudes de un vistazo.
 */

import { useMemo, useState, type ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import {
  MAX_RESTRICCIONES,
  MAX_VARIABLES,
  NOMBRE_METODO,
  celda,
  celdaM,
  resolverSimplex,
  resumenColumnas,
  type DatosSimplex,
  type MetodoSimplex,
  type Notacion,
  type ResultadoSimplex,
  type RestriccionSimplex,
  type TipoColumna,
  type VariableSimplex,
} from '@/nucleo/simplex';
import { analizarSensibilidadSimplex } from '@/nucleo/sensibilidadSimplex';
import { aNumero, esCero, texto as textoRacional, type Racional } from '@/nucleo/racional';
import { formatearNumero } from '@/nucleo/numero';
import { SIMBOLO_RELACION, type Relacion } from '@/nucleo/grafico';
import type { Objetivo } from '@/nucleo/tipos';
import {
  CampoTexto,
  Distintivo,
  Indicador,
  Interruptor,
  ListaDiagnosticos,
  Selector,
  Tarjeta,
} from '@/ui/base';
import { Interpretacion, VisorPasos } from '@/ui/pasos';
import { TablaEditable, type ColumnaEditable } from '@/ui/editores';

/**
 * Qué decir bajo el selector de método. Cuando el dual simplex no aplica hay
 * que decirlo **antes** de que el estudiante lo elija, no solo después en los
 * diagnósticos: sus condiciones de arranque son parte del tema.
 */
function ayudaMetodo(datos: DatosSimplex, metodo: MetodoSimplex, d: ResultadoSimplex | null): string {
  const hayIgualdad = datos.restricciones.some((r) => r.relacion === '=');
  const contrario = datos.variables.filter((v) =>
    datos.objetivo === 'maximizar' ? v.coeficiente > 0 : v.coeficiente < 0,
  );
  const dualAplica = !hayIgualdad && contrario.length === 0;

  if (metodo === 'dual' && !dualAplica) {
    return hayIgualdad
      ? 'Este modelo tiene una igualdad, y el dual simplex arranca con las holguras en la base: una igualdad no deja holgura.'
      : `El dual simplex exige arrancar de una base que ya cumpla la optimalidad, y aquí no se cumple. Es el método de los modelos de mínimo costo con requerimientos mínimos, no el de una maximización con márgenes positivos.`;
  }

  if (metodo === 'dual') {
    return 'Sin variables artificiales, sin fase previa y sin la constante M: mantiene la optimalidad y trabaja hacia la factibilidad. Compare el número de columnas con el de los otros métodos.';
  }

  if (metodo === 'revisado') {
    return 'Los mismos vértices que las dos fases, pero sin arrastrar el tableau: solo se mantiene B⁻¹ y se calcula cada columna cuando hace falta. Es como trabajan los solucionadores industriales.';
  }

  if (d !== null && !d.necesitaArtificiales) {
    return 'Este modelo no tiene restricciones ≥ ni =, así que no usa artificiales y los tres métodos hacen lo mismo.';
  }

  return dualAplica
    ? 'Tres caminos hacia el mismo óptimo. El dual simplex también aplica a este modelo y lo resuelve con menos columnas: pruébelo.'
    : 'Dos caminos distintos hacia el mismo óptimo: compárelos y verifique que dan el mismo plan y los mismos precios sombra.';
}

/** Qué explicar bajo el contador de iteraciones, según el camino que tomó el método. */
function notaIteraciones(d: ResultadoSimplex): string {
  if (d.metodo === 'revisado') return 'los mismos vértices que el tableau, calculados con B⁻¹ en vez de arrastrarlo';
  if (d.metodo === 'dual') return 'una restricción arreglada por iteración, sin perder la optimalidad';
  if (!d.necesitaArtificiales) return 'sin artificiales: las holguras ya formaban una base factible';
  if (d.metodo === 'gran_m') return 'un solo recorrido: la penalización M expulsa las artificiales sobre la marcha';
  return `${d.iteracionesFase1} en la fase 1 y ${d.iteracionesFase2} en la fase 2`;
}

/** Un límite de rango, donde `null` significa que no hay tope por ese lado. */
function limite(v: Racional | null, notacion: Notacion): string {
  return v === null ? 'sin límite' : celda(v, notacion);
}

const NOMBRE_TIPO: Record<TipoColumna, string> = {
  decision: 'de decisión',
  holgura: 'de holgura',
  exceso: 'de exceso',
  artificial: 'artificial',
};

export function LabSimplex({
  datosIniciales,
  titulo,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'simplex' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [datos, setDatos] = useState<DatosSimplex>(() => ({
    titulo,
    objetivo: datosIniciales.objetivo,
    variables: datosIniciales.variables.map((v) => ({ ...v })),
    unidadVariables: datosIniciales.unidadVariables,
    nombreObjetivo: datosIniciales.nombreObjetivo,
    unidadObjetivo: datosIniciales.unidadObjetivo,
    restricciones: datosIniciales.restricciones.map((r) => ({ ...r, coeficientes: [...r.coeficientes] })),
  }));

  const [notacion, setNotacion] = useState<Notacion>('fraccion');
  const [metodo, setMetodo] = useState<MetodoSimplex>('dos_fases');

  const resultado = useMemo(() => resolverSimplex(datos, { notacion, metodo }), [datos, notacion, metodo]);
  const d = resultado.datos;

  // El análisis no vuelve a resolver: parte del tableau final ya calculado.
  const sensibilidad = useMemo(() => (d === null ? null : analizarSensibilidadSimplex(d, { notacion })), [d, notacion]);

  // ── Edición del modelo ───────────────────────────────────────────────────

  /** Agregar o quitar una variable obliga a mover el coeficiente en cada restricción. */
  const agregarVariable = (): void =>
    setDatos((s) => {
      if (s.variables.length >= MAX_VARIABLES) return s;
      const n = s.variables.length + 1;
      return {
        ...s,
        variables: [...s.variables, { id: `v${n}-${s.variables.length}`, nombre: `variable ${n}`, coeficiente: 1 }],
        restricciones: s.restricciones.map((r) => ({ ...r, coeficientes: [...r.coeficientes, 0] })),
      };
    });

  const eliminarVariable = (j: number): void =>
    setDatos((s) =>
      s.variables.length <= 1
        ? s
        : {
            ...s,
            variables: s.variables.filter((_, k) => k !== j),
            restricciones: s.restricciones.map((r) => ({ ...r, coeficientes: r.coeficientes.filter((_, k) => k !== j) })),
          },
    );

  const columnasVariables: ColumnaEditable<VariableSimplex>[] = [
    { clave: 'nombre', encabezado: 'Variable', tipo: 'texto', ancho: '14rem', obtener: (v) => v.nombre, fijar: (v, x) => ({ ...v, nombre: x }) },
    {
      clave: 'coeficiente',
      encabezado: 'Aporte a Z',
      tipo: 'numero',
      ancho: '8rem',
      unidad: datos.unidadObjetivo,
      obtener: (v) => v.coeficiente,
      fijar: (v, x) => ({ ...v, coeficiente: Number(x) || 0 }),
    },
  ];

  const columnasRestricciones: ColumnaEditable<RestriccionSimplex>[] = [
    { clave: 'nombre', encabezado: 'Restricción', tipo: 'texto', ancho: '12rem', obtener: (r) => r.nombre, fijar: (r, x) => ({ ...r, nombre: x }) },
    ...datos.variables.map((v, j) => ({
      clave: `c${j}`,
      encabezado: v.nombre,
      tipo: 'numero' as const,
      ancho: '6.5rem',
      obtener: (r: RestriccionSimplex) => r.coeficientes[j] ?? 0,
      fijar: (r: RestriccionSimplex, x: string): RestriccionSimplex => ({
        ...r,
        coeficientes: r.coeficientes.map((c, k) => (k === j ? Number(x) || 0 : c)),
      }),
    })),
    {
      clave: 'relacion',
      encabezado: 'Relación',
      tipo: 'seleccion',
      ancho: '5.5rem',
      opciones: [
        { valor: '<=', texto: '≤' },
        { valor: '>=', texto: '≥' },
        { valor: '=', texto: '=' },
      ],
      obtener: (r) => r.relacion,
      fijar: (r, x) => ({ ...r, relacion: x as Relacion }),
    },
    { clave: 'c', encabezado: 'Disponible', tipo: 'numero', ancho: '7rem', obtener: (r) => r.c, fijar: (r, x) => ({ ...r, c: Number(x) || 0 }) },
    { clave: 'unidad', encabezado: 'Unidad', tipo: 'texto', ancho: '7rem', obtener: (r) => r.unidad, fijar: (r, x) => ({ ...r, unidad: x }) },
  ];

  // ── Lecturas del resultado ───────────────────────────────────────────────

  const codigo = (x: string): boolean => resultado.diagnosticos.some((y) => y.codigo === x);

  // Que el método no aplique es un aviso, no un error del modelo.
  const tonoDesenlace =
    d !== null
      ? d.desenlace === 'multiples'
        ? 'avisar'
        : 'bien'
      : codigo('SX_DUAL_NO_APLICA') || codigo('SX_DUAL_CON_IGUALDAD')
        ? 'avisar'
        : 'mal';

  // «Sin solución» sería falso cuando lo que falla es la elección del método:
  // el modelo tiene solución, pero este camino no puede alcanzarla.
  const textoDesenlace =
    d === null
      ? codigo('SX_INFACTIBLE')
        ? 'problema infactible'
        : codigo('SX_NO_ACOTADA')
          ? 'problema no acotado'
          : codigo('SX_DUAL_NO_APLICA') || codigo('SX_DUAL_CON_IGUALDAD')
            ? 'este método no aplica'
            : 'sin solución'
      : d.desenlace === 'multiples'
        ? 'óptimos múltiples'
        : 'solución óptima única';

  const resumen = d === null ? null : resumenColumnas(d.columnas);

  const expresionObjetivo = `${datos.objetivo === 'maximizar' ? 'Max' : 'Min'} Z = ${datos.variables
    .map((v) => `${formatearNumero(v.coeficiente, { decimales: v.coeficiente % 1 === 0 ? 0 : 2 })} ${v.nombre}`)
    .join(' + ')}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Función objetivo"
          descripcion="A diferencia del método gráfico, aquí puede agregar tantas variables como necesite. El tableau crece con ellas."
          acciones={
            <Interruptor
              etiqueta="Fracciones exactas"
              activo={notacion === 'fraccion'}
              alCambiar={(v) => setNotacion(v ? 'fraccion' : 'decimal')}
              ayuda="Las fracciones son las que se escriben a mano; los decimales se comparan más rápido."
            />
          }
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                etiqueta="Objetivo"
                valor={datos.objetivo}
                opciones={[
                  { valor: 'maximizar', texto: 'Maximizar (margen, utilidad, producción)' },
                  { valor: 'minimizar', texto: 'Minimizar (costo, tiempo, desperdicio)' },
                ]}
                alCambiar={(v) => setDatos((s) => ({ ...s, objetivo: v as Objetivo }))}
              />
              <Selector
                etiqueta="Método de solución"
                valor={metodo}
                opciones={[
                  { valor: 'dos_fases', texto: NOMBRE_METODO.dos_fases },
                  { valor: 'gran_m', texto: NOMBRE_METODO.gran_m },
                  { valor: 'dual', texto: NOMBRE_METODO.dual },
                  { valor: 'revisado', texto: NOMBRE_METODO.revisado },
                ]}
                alCambiar={(v) => setMetodo(v as MetodoSimplex)}
                ayuda={ayudaMetodo(datos, metodo, d)}
              />
            </div>

            <TablaEditable
              filas={datos.variables}
              columnas={columnasVariables}
              clave={(v, i) => `${v.id}-${i}`}
              alCambiar={(variables) => setDatos((s) => ({ ...s, variables }))}
              alAgregar={datos.variables.length < MAX_VARIABLES ? agregarVariable : undefined}
              alEliminar={datos.variables.length > 1 ? eliminarVariable : undefined}
              textoAgregar="Agregar variable"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <CampoTexto
                etiqueta="Unidad de las variables"
                valor={datos.unidadVariables}
                alCambiar={(v) => setDatos((s) => ({ ...s, unidadVariables: v }))}
              />
              <CampoTexto
                etiqueta="Unidad de Z"
                valor={datos.unidadObjetivo}
                alCambiar={(v) => setDatos((s) => ({ ...s, unidadObjetivo: v }))}
              />
            </div>

            <p
              className="dato rounded-lg px-3 py-2 text-center text-[0.9375rem] font-semibold"
              style={{ background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}
            >
              {expresionObjetivo}
            </p>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Restricciones"
          descripcion="Cada fila será una fila del tableau. Las de tipo ≥ y = obligan a usar variables artificiales y, con ellas, la fase 1."
        >
          <div className="flex flex-col gap-3">
            <TablaEditable
              filas={datos.restricciones}
              columnas={columnasRestricciones}
              clave={(r, i) => `${r.id}-${i}`}
              alCambiar={(restricciones) => setDatos((s) => ({ ...s, restricciones }))}
              alAgregar={
                datos.restricciones.length < MAX_RESTRICCIONES
                  ? () =>
                      setDatos((s) => ({
                        ...s,
                        restricciones: [
                          ...s.restricciones,
                          {
                            id: `r${s.restricciones.length + 1}-${s.restricciones.length}`,
                            nombre: `Restricción ${s.restricciones.length + 1}`,
                            coeficientes: s.variables.map(() => 1),
                            relacion: '<=' as const,
                            c: 10,
                            unidad: 'unidades',
                          },
                        ],
                      }))
                  : undefined
              }
              alEliminar={(i) => setDatos((s) => ({ ...s, restricciones: s.restricciones.filter((_, k) => k !== i) }))}
              textoAgregar="Agregar restricción"
            />

            <ul className="flex flex-col gap-1 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              {datos.restricciones.map((r) => (
                <li key={r.id} className="dato">
                  {r.coeficientes
                    .map((c, j) => `${formatearNumero(c, { decimales: c % 1 === 0 ? 0 : 2 })} ${datos.variables[j]?.nombre ?? ''}`)
                    .join(' + ')}{' '}
                  {SIMBOLO_RELACION[r.relacion]} {formatearNumero(r.c, { decimales: r.c % 1 === 0 ? 0 : 2 })}
                  <span className="ml-2 opacity-70">({r.nombre})</span>
                </li>
              ))}
              <li className="dato">
                {datos.variables.map((v) => `${v.nombre} ≥ 0`).join(', ')} <span className="ml-2 opacity-70">(no negatividad)</span>
              </li>
            </ul>
          </div>
        </Tarjeta>
      </div>

      <ListaDiagnosticos diagnosticos={resultado.diagnosticos} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Desenlace" valor={<span className="text-base">{textoDesenlace}</span>} tono={tonoDesenlace} />
        <Indicador
          etiqueta={`Z ${datos.objetivo === 'maximizar' ? 'máximo' : 'mínimo'}`}
          valor={d?.valorOptimo == null ? '—' : celda(d.valorOptimo, notacion)}
          unidad={datos.unidadObjetivo}
          tono={d?.valorOptimo == null ? 'neutro' : 'bien'}
        />
        <Indicador
          etiqueta="Iteraciones"
          valor={d === null ? '—' : d.iteracionesFase1 + d.iteracionesFase2}
          tono="acento"
          nota={d === null ? undefined : notaIteraciones(d)}
        />
        <Indicador
          etiqueta="Variables del tableau"
          valor={d === null ? '—' : d.columnas.length}
          nota={
            resumen === null
              ? undefined
              : `${resumen.decision} de decisión, ${resumen.holgura} de holgura, ${resumen.exceso} de exceso, ${resumen.artificial} ${resumen.artificial === 1 ? 'artificial' : 'artificiales'}`
          }
        />
      </div>

      {d !== null && (
        <>
          <Tarjeta
            titulo="Forma estándar"
            descripcion={
              d.metodo === 'dual'
                ? 'Las columnas que el tableau va a llevar. Solo hay decisión y holguras: el dual simplex no agrega ni excesos ni artificiales, y ese tableau más corto es todo su argumento.'
                : d.metodo === 'revisado'
                  ? 'Las columnas del modelo en forma estándar. El revisado no las lleva todas a la vez: mantiene B⁻¹ y trae cada una cuando la necesita.'
                : d.necesitaArtificiales
                  ? 'Las columnas que el tableau va a llevar. Las artificiales existen solo para arrancar: si alguna sobrevive con valor positivo, el problema es infactible.'
                  : 'Las columnas que el tableau va a llevar. Como todas las restricciones son de tipo ≤, bastan las holguras: no hace falta ninguna variable artificial.'
            }
          >
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Columna</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Representa</th>
                    <th scope="col" className="text-right">Aporte a Z</th>
                    <th scope="col" className="text-right">Valor en el óptimo</th>
                  </tr>
                </thead>
                <tbody>
                  {d.valores.map((v, i) => (
                    <tr key={i} className={v.basica ? 'fila-resaltada' : ''}>
                      <td className="dato">{v.columna.nombre}</td>
                      <td>{NOMBRE_TIPO[v.columna.tipo]}</td>
                      <td>{v.columna.etiqueta}</td>
                      <td className="numero">{celda(v.columna.costo, notacion)}</td>
                      <td className="numero">
                        {celda(v.valor, notacion)}
                        {v.basica && <span className="ml-2 opacity-70">en la base</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="Recorrido del simplex"
            descripcion="Cada fila es un cambio de vértice: qué variable entró, cuál salió y sobre qué elemento se pivoteó."
          >
            <div className="contenedor-tabla">
              <table className="tabla">
                <thead>
                  <tr>
                    <th scope="col">Iteración</th>
                    <th scope="col">Fase</th>
                    <th scope="col">Entra</th>
                    <th scope="col">Sale</th>
                    <th scope="col" className="text-right">Pivote</th>
                    <th scope="col" className="text-right">Z antes</th>
                    <th scope="col">Regla</th>
                  </tr>
                </thead>
                <tbody>
                  {d.iteraciones
                    .filter((it) => it.entra !== null && it.sale !== null)
                    .map((it, i) => (
                      <tr key={`${it.fase}-${it.numero}-${i}`}>
                        <td className="dato">{it.numero}</td>
                        <td>{it.fase === 1 ? 'fase 1' : 'fase 2'}</td>
                        <td className="dato">{d.columnas[it.entra!]?.nombre}</td>
                        <td className="dato">{d.columnas[it.tableau.base[it.sale!]!]?.nombre}</td>
                        <td className="numero">{it.pivote === null ? '—' : celda(it.pivote, notacion)}</td>
                        <td className="numero">{celdaM(it.tableau.valor, notacion)}</td>
                        <td>{it.regla === 'bland' ? <Distintivo tono="avisar">Bland</Distintivo> : 'Dantzig'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="Holguras y precios sombra"
            descripcion="Todo esto se lee directamente en el tableau final: los precios sombra están en la fila objetivo, bajo la columna de cada holgura."
          >
            <div className="flex flex-col gap-3">
              <div className="contenedor-tabla">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th scope="col">Restricción</th>
                      <th scope="col" className="text-right">Disponible</th>
                      <th scope="col" className="text-right">Consumo</th>
                      <th scope="col" className="text-right">Holgura</th>
                      <th scope="col" className="text-right">Precio sombra</th>
                      <th scope="col">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.holguras.map((h) => (
                      <tr key={h.restriccion.id} className={h.activa ? 'fila-resaltada' : ''}>
                        <td>{h.restriccion.nombre}</td>
                        <td className="numero">
                          {formatearNumero(h.restriccion.c, { decimales: h.restriccion.c % 1 === 0 ? 0 : 2 })} {h.restriccion.unidad}
                        </td>
                        <td className="numero">{celda(h.consumo, notacion)}</td>
                        <td className="numero">{celda(h.holgura, notacion)}</td>
                        <td className="numero">{celda(h.precioSombra, notacion)}</td>
                        <td>
                          {h.activa ? (
                            <Distintivo tono={esCero(h.precioSombra) ? 'neutro' : 'avisar'}>
                              {esCero(h.precioSombra) ? 'activa, pero no aporta' : 'activa — se agota'}
                            </Distintivo>
                          ) : (
                            'sobra capacidad'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                {datos.objetivo === 'maximizar'
                  ? 'El precio sombra es el máximo que conviene pagar por una unidad más del recurso: por encima de él, comprar destruye margen.'
                  : 'Al minimizar, el signo dice el sentido: un precio sombra positivo significa que endurecer esa exigencia encarece el resultado, y uno negativo, que relajarla lo abarata.'}
              </p>

              {d.alternativas.length > 0 && (
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  Hay óptimos múltiples: {d.alternativas.join(', ')} {d.alternativas.length === 1 ? 'puede entrar' : 'pueden entrar'} a la base sin cambiar Z.
                  Es la señal del cero en la fila objetivo bajo una columna que no está en la base.
                </p>
              )}
            </div>
          </Tarjeta>

          <Tarjeta
            titulo="Comprobación independiente"
            descripcion="El valor de Z se calcula dos veces por caminos distintos. Si no coincidieran, el resultado no sería confiable."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Indicador
                etiqueta="Z en la fila objetivo del tableau"
                valor={celdaM(d.tableauFinal!.valor, notacion)}
                unidad={datos.unidadObjetivo}
              />
              <Indicador
                etiqueta="Z sustituyendo la solución en la función objetivo"
                valor={celda(d.valorOptimo!, notacion)}
                unidad={datos.unidadObjetivo}
                tono="bien"
                nota={`${datos.variables
                  .map((v, j) => `${formatearNumero(v.coeficiente, { decimales: 0 })} × ${textoRacional(d.solucion[j]?.valor ?? d.valorOptimo!)}`)
                  .join(' + ')} = ${formatearNumero(aNumero(d.valorOptimo!), { decimales: 2 })}`}
              />
            </div>
          </Tarjeta>

          {sensibilidad?.datos != null && (
            <>
              <Tarjeta
                titulo="Rango de factibilidad de cada recurso"
                descripcion="Hasta dónde vale el precio sombra. Dentro del intervalo, cada unidad adicional rinde exactamente esa cifra; fuera, la base cambia y hay que rehacer el análisis."
              >
                <div className="flex flex-col gap-3">
                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Restricción</th>
                          <th scope="col" className="text-right">Disponible</th>
                          <th scope="col" className="text-right">Precio sombra</th>
                          <th scope="col" className="text-right">Desde</th>
                          <th scope="col" className="text-right">Hasta</th>
                          <th scope="col">Qué significa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensibilidad.datos.rangosLadoDerecho.map((r) => (
                          <tr key={r.holgura.restriccion.id} className={r.holgura.activa ? 'fila-resaltada' : ''}>
                            <td>{r.holgura.restriccion.nombre}</td>
                            <td className="numero">
                              {celda(r.valorActual, notacion)} {r.holgura.restriccion.unidad}
                            </td>
                            <td className="numero">{celda(r.holgura.precioSombra, notacion)}</td>
                            <td className="numero">{limite(r.desde, notacion)}</td>
                            <td className="numero">{limite(r.hasta, notacion)}</td>
                            <td>{r.lectura}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sensibilidad.datos.recursoMasValioso !== null && (
                    <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                      Fuera del rango la base cambia, y ahí es donde sirve el <strong>dual simplex</strong>: recupera la
                      optimalidad partiendo de la base anterior en vez de resolver todo otra vez.
                    </p>
                  )}
                </div>
              </Tarjeta>

              <Tarjeta
                titulo="Rango de optimalidad y costos reducidos"
                descripcion="Cuánto pueden moverse los precios antes de que convenga cambiar el plan, y cuánto le falta a lo que quedó fuera para que valga la pena producirlo."
              >
                <div className="flex flex-col gap-3">
                  <div className="contenedor-tabla">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th scope="col">Variable</th>
                          <th scope="col">En el plan</th>
                          <th scope="col" className="text-right">Aporte actual</th>
                          <th scope="col" className="text-right">Desde</th>
                          <th scope="col" className="text-right">Hasta</th>
                          <th scope="col" className="text-right">Costo reducido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensibilidad.datos.rangosCoeficientes.map((c) => (
                          <tr key={c.variable.id} className={c.basica ? 'fila-resaltada' : ''}>
                            <td>{c.variable.nombre}</td>
                            <td>
                              {c.basica ? (
                                <Distintivo tono="bien">sí</Distintivo>
                              ) : (
                                <Distintivo tono="avisar">no</Distintivo>
                              )}
                            </td>
                            <td className="numero">{celda(c.valorActual, notacion)}</td>
                            <td className="numero">{limite(c.desde, notacion)}</td>
                            <td className="numero">{limite(c.hasta, notacion)}</td>
                            <td className="numero">{c.basica ? '—' : celda(c.costoReducido, notacion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sensibilidad.datos.fueraDelPlan.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {sensibilidad.datos.fueraDelPlan.map((c) => (
                        <p key={c.variable.id} className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                          {c.lectura}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </Tarjeta>

              <VisorPasos
                pasos={sensibilidad.pasos}
                titulo="Análisis de sensibilidad paso a paso"
                revelarTodo={revelarTodo}
                ocultarResultados={ocultarResultados}
              />
              <Interpretacion texto={sensibilidad.interpretacion} titulo="Decisión de inversión" />
            </>
          )}
        </>
      )}

      {sensibilidad !== null && <ListaDiagnosticos diagnosticos={sensibilidad.diagnosticos} />}

      <VisorPasos
        pasos={resultado.pasos}
        titulo="Procedimiento del método simplex"
        revelarTodo={revelarTodo}
        ocultarResultados={ocultarResultados}
      />
      <Interpretacion texto={resultado.interpretacion} />
    </div>
  );
}
