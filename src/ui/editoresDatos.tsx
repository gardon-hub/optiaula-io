/**
 * Editores de los datos de cada tipo de ejercicio.
 *
 * Hasta ahora el panel docente solo dejaba tocar la matriz de los ejercicios de
 * asignación; para todo lo demás había que pasar por el laboratorio y el
 * generador, o editar el JSON a mano. Aquí vive un editor por cada tipo de
 * datos, armado con los mismos componentes que usan los laboratorios.
 *
 * Dos reglas ordenan el archivo. La primera: **agregar o quitar filas mantiene
 * la estructura consistente**. Agregar un origen de transporte no es solo
 * agregar un nombre: hay que agregarle su fila de costos y su oferta, o el
 * ejercicio queda inválido. Por eso las estructuras rectangulares se
 * redimensionan con un helper y no a mano en cada sitio.
 *
 * La segunda: aquí no se calcula nada. El editor solo produce datos; quien
 * decide si el ejercicio sigue siendo válido y qué respuestas cambian es el
 * motor, en el diálogo que envuelve a este componente.
 */

import type { ReactNode } from 'react';
import type { DatosEjercicio } from '@/esquemas';
import type { CeldaPlano } from '@/nucleo/distribucion';
import { CampoNumero, CampoTexto, Interruptor, Selector, Tarjeta } from './base';
import { EditorPlano, MatrizEditable, TablaEditable, type ColumnaEditable } from './editores';

/** Ajusta una matriz a un tamaño nuevo, conservando lo que ya había. */
function redimensionar<T>(
  matriz: readonly (readonly T[])[],
  filas: number,
  columnas: number,
  relleno: T,
): T[][] {
  return Array.from({ length: filas }, (_, i) =>
    Array.from({ length: columnas }, (_, j) => matriz[i]?.[j] ?? relleno),
  );
}

/** Ajusta un vector a un largo nuevo, conservando lo que ya había. */
function ajustar<T>(vector: readonly T[], largo: number, relleno: (i: number) => T): T[] {
  return Array.from({ length: largo }, (_, i) => vector[i] ?? relleno(i));
}

const numero = (v: string): number => Number(v.replace(',', '.')) || 0;

/** Identificador libre dentro de una lista que ya usa otros. */
function idLibre(usados: readonly string[], prefijo = 'x'): string {
  for (let i = 1; i < 1000; i++) {
    const candidato = `${prefijo}${i}`;
    if (!usados.includes(candidato)) return candidato;
  }
  return `${prefijo}${usados.length + 1}`;
}

/** Letra libre para una actividad: A, B, C… */
function letraLibre(usadas: readonly string[]): string {
  const letra = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find((l) => !usadas.includes(l));
  return letra ?? `A${usadas.length + 1}`;
}

const listaIds = (texto: string): string[] =>
  texto
    .split(/[,;\s]+/)
    .map((x) => x.trim().toUpperCase())
    .filter((x) => x !== '');

export function EditorDatosEjercicio({
  datos,
  alCambiar,
}: {
  datos: DatosEjercicio;
  alCambiar: (datos: DatosEjercicio) => void;
}): ReactNode {
  switch (datos.tipo) {
    case 'productividad':
      return <EditorProductividad datos={datos} alCambiar={alCambiar} />;
    case 'localizacion':
      return <EditorLocalizacion datos={datos} alCambiar={alCambiar} />;
    case 'distribucion':
      return <EditorDistribucion datos={datos} alCambiar={alCambiar} />;
    case 'equilibrio':
      return <EditorEquilibrio datos={datos} alCambiar={alCambiar} />;
    case 'cpm':
      return <EditorCPM datos={datos} alCambiar={alCambiar} />;
    case 'pert':
      return <EditorPERT datos={datos} alCambiar={alCambiar} />;
    case 'grafico':
      return <EditorGrafico datos={datos} alCambiar={alCambiar} />;
    case 'simplex':
      return <EditorSimplex datos={datos} alCambiar={alCambiar} />;
    case 'asignacion':
      return <EditorAsignacion datos={datos} alCambiar={alCambiar} />;
    case 'transporte':
      return <EditorTransporte datos={datos} alCambiar={alCambiar} />;
    case 'fundamentos':
      return <EditorFundamentos datos={datos} alCambiar={alCambiar} />;
    case 'inventarios':
      return <EditorInventarios datos={datos} alCambiar={alCambiar} />;
    case 'colas':
      return <EditorColas datos={datos} alCambiar={alCambiar} />;
  }
}

type Datos<T extends DatosEjercicio['tipo']> = Extract<DatosEjercicio, { tipo: T }>;

interface Props<T extends DatosEjercicio['tipo']> {
  datos: Datos<T>;
  alCambiar: (datos: DatosEjercicio) => void;
}

const MONEDAS = [
  { valor: 'HNL', texto: 'Lempira hondureño (L)' },
  { valor: 'USD', texto: 'Dólar estadounidense (US$)' },
];

const OBJETIVOS = [
  { valor: 'minimizar', texto: 'Minimizar' },
  { valor: 'maximizar', texto: 'Maximizar' },
];

const RELACIONES = [
  { valor: '<=', texto: '≤' },
  { valor: '>=', texto: '≥' },
  { valor: '=', texto: '=' },
];

// ───────────────────────────── Productividad ─────────────────────────────

const CATEGORIAS_INSUMO = [
  { valor: 'mano_obra', texto: 'Mano de obra' },
  { valor: 'energia', texto: 'Energía' },
  { valor: 'materiales', texto: 'Materiales' },
  { valor: 'agua', texto: 'Agua' },
  { valor: 'capital', texto: 'Capital' },
  { valor: 'costos_fijos', texto: 'Costos fijos' },
  { valor: 'otros', texto: 'Otros' },
];

function EditorProductividad({ datos, alCambiar }: Props<'productividad'>): ReactNode {
  type Insumo = Datos<'productividad'>['insumos'][number];

  const columnas: ColumnaEditable<Insumo>[] = [
    { clave: 'nombre', encabezado: 'Insumo', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'categoria', encabezado: 'Categoría', tipo: 'seleccion', ancho: '10rem', opciones: CATEGORIAS_INSUMO, obtener: (f) => f.categoria, fijar: (f, v) => ({ ...f, categoria: v as Insumo['categoria'] }) },
    { clave: 'cantidad', encabezado: 'Cantidad', tipo: 'numero', ancho: '7rem', obtener: (f) => f.cantidad, fijar: (f, v) => ({ ...f, cantidad: numero(v) }) },
    { clave: 'unidad', encabezado: 'Unidad', tipo: 'texto', ancho: '7rem', obtener: (f) => f.unidad, fijar: (f, v) => ({ ...f, unidad: v }) },
    { clave: 'costo', encabezado: 'Costo unitario', tipo: 'numero', ancho: '8rem', obtener: (f) => f.costoUnitario, fijar: (f, v) => ({ ...f, costoUnitario: numero(v) }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Insumos" descripcion="Cada insumo cuesta su cantidad por su costo unitario. Los declarados en dinero llevan cantidad 1.">
        <TablaEditable
          filas={datos.insumos}
          columnas={columnas}
          clave={(f) => f.id}
          alCambiar={(insumos) => alCambiar({ ...datos, insumos })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              insumos: [
                ...datos.insumos,
                { id: idLibre(datos.insumos.map((i) => i.id), 'ins'), nombre: 'Nuevo insumo', categoria: 'otros', cantidad: 1, unidad: 'unidad', costoUnitario: 0 },
              ],
            })
          }
          alEliminar={(i) => alCambiar({ ...datos, insumos: datos.insumos.filter((_, k) => k !== i) })}
          textoAgregar="Agregar insumo"
        />
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Selector etiqueta="Moneda" valor={datos.moneda} opciones={MONEDAS} alCambiar={(v) => alCambiar({ ...datos, moneda: v as Datos<'productividad'>['moneda'] })} />
        <CampoTexto etiqueta="Unidad de producción" valor={datos.unidadProduccion} alCambiar={(v) => alCambiar({ ...datos, unidadProduccion: v })} />
        <CampoNumero etiqueta="Producción terminada" unidad={datos.unidadProduccion} valor={datos.produccionTerminada} alCambiar={(v) => alCambiar({ ...datos, produccionTerminada: v ?? 0 })} minimo={0} />
        <CampoNumero etiqueta="Precio de venta" unidad={datos.moneda === 'USD' ? 'US$' : 'L'} valor={datos.precioVenta} alCambiar={(v) => alCambiar({ ...datos, precioVenta: v ?? 0 })} minimo={0} />
        <CampoNumero etiqueta="Inventario en proceso" unidad={datos.unidadProduccion} valor={datos.inventarioEnProceso} alCambiar={(v) => alCambiar({ ...datos, inventarioEnProceso: v ?? 0 })} minimo={0} />
        <CampoNumero
          etiqueta="Grado de avance"
          valor={datos.gradoAvance}
          paso={0.05}
          minimo={0}
          maximo={1}
          alCambiar={(v) => alCambiar({ ...datos, gradoAvance: Math.min(1, Math.max(0, v ?? 0)) })}
          ayuda="Fracción del proceso completada por el inventario en proceso, de 0 a 1."
        />
        <Selector
          etiqueta="Tratamiento del inventario en proceso"
          valor={datos.tratamiento}
          opciones={[
            { valor: 'excluir', texto: 'Excluirlo' },
            { valor: 'incluir', texto: 'Incluirlo completo' },
            { valor: 'ponderado', texto: 'Ponderarlo por el avance' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, tratamiento: v as Datos<'productividad'>['tratamiento'] })}
        />
        <CampoNumero
          etiqueta="Costo total declarado"
          unidad={datos.moneda === 'USD' ? 'US$' : 'L'}
          valor={datos.costoTotalDeclarado ?? 0}
          alCambiar={(v) => alCambiar({ ...datos, costoTotalDeclarado: v === null || v === 0 ? null : v })}
          minimo={0}
          ayuda="Solo si el enunciado lo declara aparte de los insumos. Déjelo en cero para no usarlo."
        />
      </div>
    </div>
  );
}

// ───────────────────────────── Localización ─────────────────────────────

function EditorLocalizacion({ datos, alCambiar }: Props<'localizacion'>): ReactNode {
  type Factor = Datos<'localizacion'>['factores'][number];
  type Punto = Datos<'localizacion'>['puntos'][number];

  const columnasFactores: ColumnaEditable<Factor>[] = [
    { clave: 'nombre', encabezado: 'Factor', tipo: 'texto', ancho: '20rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'peso', encabezado: 'Ponderación', tipo: 'numero', ancho: '8rem', unidad: '%', obtener: (f) => f.ponderacion, fijar: (f, v) => ({ ...f, ponderacion: numero(v) }) },
  ];

  const columnasPuntos: ColumnaEditable<Punto>[] = [
    { clave: 'nombre', encabezado: 'Punto de demanda', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'x', encabezado: 'x', tipo: 'numero', ancho: '6rem', obtener: (f) => f.punto.x, fijar: (f, v) => ({ ...f, punto: { ...f.punto, x: numero(v) } }) },
    { clave: 'y', encabezado: 'y', tipo: 'numero', ancho: '6rem', obtener: (f) => f.punto.y, fijar: (f, v) => ({ ...f, punto: { ...f.punto, y: numero(v) } }) },
    { clave: 'carga', encabezado: 'Carga', tipo: 'numero', ancho: '7rem', obtener: (f) => f.carga, fijar: (f, v) => ({ ...f, carga: numero(v) }) },
  ];

  const suma = datos.factores.reduce((t, f) => t + f.ponderacion, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selector
          etiqueta="Método"
          valor={datos.metodo}
          opciones={[
            { valor: 'puntaje_ponderado', texto: 'Puntaje ponderado' },
            { valor: 'carga_distancia', texto: 'Carga-distancia' },
            { valor: 'centro_gravedad', texto: 'Centro de gravedad' },
            { valor: 'combinado', texto: 'Combinado' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, metodo: v as Datos<'localizacion'>['metodo'] })}
        />
        <Selector
          etiqueta="Métrica de distancia"
          valor={datos.tipoDistancia}
          opciones={[
            { valor: 'rectilinea', texto: 'Rectilínea' },
            { valor: 'euclidiana', texto: 'Euclidiana' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, tipoDistancia: v as Datos<'localizacion'>['tipoDistancia'] })}
        />
        <CampoNumero etiqueta="Escala mínima" valor={datos.escalaMinima} alCambiar={(v) => alCambiar({ ...datos, escalaMinima: v ?? 1 })} />
        <CampoNumero etiqueta="Escala máxima" valor={datos.escalaMaxima} alCambiar={(v) => alCambiar({ ...datos, escalaMaxima: v ?? 5 })} />
        <CampoTexto etiqueta="Unidad de carga" valor={datos.unidadCarga} alCambiar={(v) => alCambiar({ ...datos, unidadCarga: v })} />
        <CampoTexto etiqueta="Unidad de distancia" valor={datos.unidadDistancia} alCambiar={(v) => alCambiar({ ...datos, unidadDistancia: v })} />
      </div>

      {datos.factores.length > 0 && (
        <Tarjeta
          titulo="Factores y ponderaciones"
          descripcion={`Las ponderaciones suman ${suma.toFixed(1)} %.${Math.abs(suma - 100) > 0.05 ? ' El método las normaliza, pero conviene que sumen 100.' : ''}`}
        >
          <TablaEditable
            filas={datos.factores}
            columnas={columnasFactores}
            clave={(f) => f.id}
            alCambiar={(factores) => alCambiar({ ...datos, factores })}
            alAgregar={() => {
              const id = idLibre(datos.factores.map((f) => f.id), 'f');
              alCambiar({
                ...datos,
                factores: [...datos.factores, { id, nombre: 'Nuevo factor', ponderacion: 0 }],
                // Cada sitio estrena una calificación para el factor nuevo: si no,
                // el método la leería como cero sin que nadie lo haya decidido.
                sitios: datos.sitios.map((s) => ({ ...s, calificaciones: { ...s.calificaciones, [id]: datos.escalaMinima } })),
              });
            }}
            alEliminar={(i) => {
              const quitado = datos.factores[i]?.id;
              alCambiar({
                ...datos,
                factores: datos.factores.filter((_, k) => k !== i),
                sitios: datos.sitios.map((s) => {
                  const { [quitado ?? '']: _, ...resto } = s.calificaciones;
                  return { ...s, calificaciones: resto };
                }),
              });
            }}
            textoAgregar="Agregar factor"
          />
        </Tarjeta>
      )}

      {datos.sitios.length > 0 && datos.factores.length > 0 && (
        <Tarjeta titulo="Calificación de cada sitio en cada factor">
          <MatrizEditable
            filas={datos.sitios.map((s) => s.nombre)}
            columnas={datos.factores.map((f) => f.nombre)}
            valores={datos.sitios.map((s) => datos.factores.map((f) => s.calificaciones[f.id] ?? null))}
            encabezadoFilas="Sitio \ Factor"
            alCambiarValor={(i, j, v) =>
              alCambiar({
                ...datos,
                sitios: datos.sitios.map((s, k) =>
                  k !== i ? s : { ...s, calificaciones: { ...s.calificaciones, [datos.factores[j]!.id]: v ?? 0 } },
                ),
              })
            }
            alCambiarNombreFila={(i, nombre) =>
              alCambiar({ ...datos, sitios: datos.sitios.map((s, k) => (k === i ? { ...s, nombre } : s)) })
            }
          />
        </Tarjeta>
      )}

      {datos.puntos.length > 0 && (
        <Tarjeta titulo="Puntos de demanda" descripcion="Coordenadas en la cuadrícula del mapa y carga de cada punto.">
          <TablaEditable
            filas={datos.puntos}
            columnas={columnasPuntos}
            clave={(f) => f.id}
            alCambiar={(puntos) => alCambiar({ ...datos, puntos })}
            alAgregar={() =>
              alCambiar({
                ...datos,
                puntos: [...datos.puntos, { id: idLibre(datos.puntos.map((p) => p.id), 'p'), nombre: 'Nuevo punto', punto: { x: 0, y: 0 }, carga: 0 }],
              })
            }
            alEliminar={(i) => alCambiar({ ...datos, puntos: datos.puntos.filter((_, k) => k !== i) })}
            textoAgregar="Agregar punto"
          />
        </Tarjeta>
      )}
    </div>
  );
}

// ───────────────────────────── Distribución ─────────────────────────────

function EditorDistribucion({ datos, alCambiar }: Props<'distribucion'>): ReactNode {
  type Departamento = Datos<'distribucion'>['departamentos'][number];

  const columnas: ColumnaEditable<Departamento>[] = [
    { clave: 'nombre', encabezado: 'Departamento', tipo: 'texto', ancho: '18rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'bloques', encabezado: 'Bloques', tipo: 'numero', ancho: '6rem', obtener: (f) => f.bloques, fijar: (f, v) => ({ ...f, bloques: Math.max(1, Math.round(numero(v))) }) },
    {
      clave: 'fijo',
      encabezado: 'Fijo',
      tipo: 'seleccion',
      ancho: '6rem',
      opciones: [
        { valor: 'no', texto: 'No' },
        { valor: 'si', texto: 'Sí' },
      ],
      obtener: (f) => (f.fijo === true ? 'si' : 'no'),
      fijar: (f, v) => ({ ...f, fijo: v === 'si' }),
    },
  ];

  /** Mueve un departamento a una celda, intercambiando con quien la ocupe. */
  const mover = (id: string, destino: CeldaPlano): void => {
    const copia: Record<string, CeldaPlano[]> = Object.fromEntries(
      Object.entries(datos.plano.asignacion).map(([k, v]) => [k, v.map((c) => ({ ...c }))]),
    );
    const propias = copia[id] ?? [];
    if (propias.length === 0) return;

    const ocupante = Object.entries(copia).find(
      ([otro, celdas]) => otro !== id && celdas.some((c) => c.fila === destino.fila && c.columna === destino.columna),
    );

    const origen = { ...propias[0]! };
    copia[id] = [destino, ...propias.slice(1)];
    if (ocupante !== undefined) {
      copia[ocupante[0]] = ocupante[1].map((c) =>
        c.fila === destino.fila && c.columna === destino.columna ? origen : c,
      );
    }
    alCambiar({ ...datos, plano: { ...datos.plano, asignacion: copia } });
  };

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta titulo="Departamentos">
        <TablaEditable
          filas={datos.departamentos}
          columnas={columnas}
          clave={(f) => f.id}
          alCambiar={(departamentos) => alCambiar({ ...datos, departamentos })}
          alAgregar={() => {
            const id = idLibre(datos.departamentos.map((d) => d.id), 'd');
            const n = datos.departamentos.length + 1;
            alCambiar({
              ...datos,
              departamentos: [...datos.departamentos, { id, nombre: `Departamento ${n}`, bloques: 1 }],
              // La matriz de recorridos crece con él: si no, quedaría con menos
              // filas que departamentos y el motor la rechazaría.
              recorridos: redimensionar(datos.recorridos, n, n, 0),
              plano: { ...datos.plano, asignacion: { ...datos.plano.asignacion, [id]: [{ fila: 0, columna: 0 }] } },
            });
          }}
          alEliminar={(i) => {
            const quitado = datos.departamentos[i]?.id ?? '';
            const { [quitado]: _, ...asignacion } = datos.plano.asignacion;
            alCambiar({
              ...datos,
              departamentos: datos.departamentos.filter((_, k) => k !== i),
              recorridos: datos.recorridos.filter((_, k) => k !== i).map((f) => f.filter((_, k) => k !== i)),
              relaciones: datos.relaciones.filter((r) => r.desde !== quitado && r.hasta !== quitado),
              plano: { ...datos.plano, asignacion },
            });
          }}
          textoAgregar="Agregar departamento"
        />
      </Tarjeta>

      <Tarjeta
        titulo="Matriz de recorridos"
        descripcion="Anote cada par una sola vez: el puntaje suma las dos mitades de la matriz, así que llenar ambas duplicaría la carga."
      >
        <MatrizEditable
          filas={datos.departamentos.map((d) => d.nombre)}
          columnas={datos.departamentos.map((d) => d.nombre)}
          valores={redimensionar(datos.recorridos, datos.departamentos.length, datos.departamentos.length, 0)}
          encabezadoFilas="Desde \ Hacia"
          alCambiarValor={(i, j, v) =>
            alCambiar({
              ...datos,
              recorridos: redimensionar(datos.recorridos, datos.departamentos.length, datos.departamentos.length, 0).map((f, fi) =>
                fi === i ? f.map((c, cj) => (cj === j ? (v ?? 0) : c)) : f,
              ),
            })
          }
        />
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selector
          etiqueta="Métrica de distancia"
          valor={datos.tipoDistancia}
          opciones={[
            { valor: 'rectilinea', texto: 'Rectilínea entre centroides' },
            { valor: 'euclidiana', texto: 'Euclidiana entre centroides' },
            { valor: 'pasillo', texto: 'A lo largo del pasillo' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, tipoDistancia: v as Datos<'distribucion'>['tipoDistancia'] })}
          ayuda="«Pasillo» es la de los almacenes: solo cuenta el avance por el corredor."
        />
        <CampoTexto etiqueta="Unidad de recorridos" valor={datos.unidadRecorridos} alCambiar={(v) => alCambiar({ ...datos, unidadRecorridos: v })} />
        <CampoNumero
          etiqueta="Filas de la retícula"
          valor={datos.plano.filas}
          minimo={1}
          alCambiar={(v) => alCambiar({ ...datos, plano: { ...datos.plano, filas: Math.max(1, Math.round(v ?? 1)) } })}
        />
        <CampoNumero
          etiqueta="Columnas de la retícula"
          valor={datos.plano.columnas}
          minimo={1}
          alCambiar={(v) => alCambiar({ ...datos, plano: { ...datos.plano, columnas: Math.max(1, Math.round(v ?? 1)) } })}
        />
      </div>

      <EditorPlano
        plano={datos.plano}
        departamentos={datos.departamentos}
        alMover={mover}
        titulo="Plano de bloques inicial"
      />
    </div>
  );
}

// ───────────────────────────── Punto de equilibrio ─────────────────────────────

function EditorEquilibrio({ datos, alCambiar }: Props<'equilibrio'>): ReactNode {
  type Producto = Datos<'equilibrio'>['productos'][number];
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';

  const columnas: ColumnaEditable<Producto>[] = [
    { clave: 'nombre', encabezado: 'Producto', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'precio', encabezado: 'Precio', tipo: 'numero', ancho: '7rem', unidad: simbolo, obtener: (f) => f.precioVenta, fijar: (f, v) => ({ ...f, precioVenta: numero(v) }) },
    { clave: 'cv', encabezado: 'Costo variable', tipo: 'numero', ancho: '8rem', unidad: simbolo, obtener: (f) => f.costoVariableUnitario, fijar: (f, v) => ({ ...f, costoVariableUnitario: numero(v) }) },
    {
      clave: 'mezcla',
      encabezado: datos.baseMezcla === 'unidades' ? 'Mezcla de unidades' : 'Mezcla de ingresos',
      tipo: 'numero',
      ancho: '9rem',
      unidad: '%',
      obtener: (f) => f.participacion,
      fijar: (f, v) => ({ ...f, participacion: numero(v) }),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Selector
          etiqueta="Modo"
          valor={datos.modo}
          opciones={[
            { valor: 'simple', texto: 'Un producto' },
            { valor: 'multiproducto', texto: 'Multiproducto' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, modo: v as Datos<'equilibrio'>['modo'] })}
        />
        <Selector etiqueta="Moneda" valor={datos.moneda} opciones={MONEDAS} alCambiar={(v) => alCambiar({ ...datos, moneda: v as Datos<'equilibrio'>['moneda'] })} />
        <CampoNumero etiqueta="Costos fijos" unidad={simbolo} valor={datos.costosFijos} minimo={0} alCambiar={(v) => alCambiar({ ...datos, costosFijos: v ?? 0 })} />
      </div>

      {datos.modo === 'simple' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CampoTexto etiqueta="Unidad del producto" valor={datos.unidadProducto} alCambiar={(v) => alCambiar({ ...datos, unidadProducto: v })} />
          <CampoNumero etiqueta="Precio de venta" unidad={simbolo} valor={datos.precioVenta} minimo={0} alCambiar={(v) => alCambiar({ ...datos, precioVenta: v ?? 0 })} />
          <CampoNumero etiqueta="Costo variable unitario" unidad={simbolo} valor={datos.costoVariableUnitario} minimo={0} alCambiar={(v) => alCambiar({ ...datos, costoVariableUnitario: v ?? 0 })} />
          <CampoNumero
            etiqueta="Comisión sobre el ingreso"
            unidad="%"
            valor={datos.comisionPorcentaje}
            minimo={0}
            maximo={99.99}
            alCambiar={(v) => alCambiar({ ...datos, comisionPorcentaje: Math.min(99.99, Math.max(0, v ?? 0)) })}
            ayuda="La comisión es costo variable: crece con cada unidad vendida."
          />
          <CampoNumero etiqueta="Valor de recuperación" unidad={simbolo} valor={datos.valorRecuperacion} minimo={0} alCambiar={(v) => alCambiar({ ...datos, valorRecuperacion: v ?? 0 })} ayuda="Se resta de los costos fijos." />
          <CampoNumero etiqueta="Capacidad" unidad={datos.unidadProducto} valor={datos.capacidad ?? 0} minimo={0} alCambiar={(v) => alCambiar({ ...datos, capacidad: v === null || v === 0 ? null : v })} ayuda="Cero para no usarla." />
          <CampoNumero etiqueta="Volumen esperado" unidad={datos.unidadProducto} valor={datos.volumenEsperado ?? 0} minimo={0} alCambiar={(v) => alCambiar({ ...datos, volumenEsperado: v === null || v === 0 ? null : v })} ayuda="Cero para no usarlo." />
          <CampoNumero etiqueta="Utilidad objetivo" unidad={simbolo} valor={datos.utilidadObjetivo ?? 0} alCambiar={(v) => alCambiar({ ...datos, utilidadObjetivo: v === null || v === 0 ? null : v })} ayuda="Cero para no usarla." />
        </div>
      ) : (
        <>
          <Selector
            etiqueta="La mezcla está expresada en"
            valor={datos.baseMezcla}
            opciones={[
              { valor: 'unidades', texto: 'Proporción de unidades vendidas' },
              { valor: 'ingresos', texto: 'Proporción del ingreso' },
            ]}
            alCambiar={(v) => alCambiar({ ...datos, baseMezcla: v as Datos<'equilibrio'>['baseMezcla'] })}
            ayuda="Las dos lecturas dan puntos de equilibrio distintos."
          />
          <Tarjeta titulo="Productos de la mezcla">
            <TablaEditable
              filas={datos.productos}
              columnas={columnas}
              clave={(f) => f.id}
              alCambiar={(productos) => alCambiar({ ...datos, productos })}
              alAgregar={() =>
                alCambiar({
                  ...datos,
                  productos: [
                    ...datos.productos,
                    { id: idLibre(datos.productos.map((p) => p.id), 'p'), nombre: `Producto ${datos.productos.length + 1}`, precioVenta: 1, costoVariableUnitario: 0, participacion: 0 },
                  ],
                })
              }
              alEliminar={(i) => alCambiar({ ...datos, productos: datos.productos.filter((_, k) => k !== i) })}
              textoAgregar="Agregar producto"
              minimoFilas={2}
            />
          </Tarjeta>
        </>
      )}
    </div>
  );
}

// ───────────────────────────── CPM y compresión ─────────────────────────────

function EditorCPM({ datos, alCambiar }: Props<'cpm'>): ReactNode {
  type Actividad = Datos<'cpm'>['actividades'][number];
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';

  const columnas: ColumnaEditable<Actividad>[] = [
    { clave: 'id', encabezado: 'Actividad', tipo: 'texto', ancho: '6rem', obtener: (f) => f.id, fijar: (f, v) => ({ ...f, id: v.trim().toUpperCase() }) },
    { clave: 'descripcion', encabezado: 'Descripción', tipo: 'texto', ancho: '16rem', obtener: (f) => f.descripcion, fijar: (f, v) => ({ ...f, descripcion: v }) },
    { clave: 'pred', encabezado: 'Predecesoras', tipo: 'texto', ancho: '9rem', obtener: (f) => f.predecesoras.join(', '), fijar: (f, v) => ({ ...f, predecesoras: listaIds(v) }) },
    { clave: 'duracion', encabezado: 'Duración', tipo: 'numero', ancho: '6rem', unidad: datos.unidadTiempo, obtener: (f) => f.duracion, fijar: (f, v) => ({ ...f, duracion: Math.max(0, numero(v)) }) },
    {
      clave: 'acelerada',
      encabezado: 'Acelerada',
      tipo: 'numero',
      ancho: '6rem',
      unidad: datos.unidadTiempo,
      // Cero significa «no se puede acortar», que es como se guarda `null`.
      obtener: (f) => f.duracionAcelerada ?? 0,
      fijar: (f, v) => ({ ...f, duracionAcelerada: numero(v) <= 0 ? null : numero(v) }),
    },
    { clave: 'costoNormal', encabezado: 'Costo normal', tipo: 'numero', ancho: '8rem', unidad: simbolo, obtener: (f) => f.costoNormal, fijar: (f, v) => ({ ...f, costoNormal: Math.max(0, numero(v)) }) },
    { clave: 'costoAcelerado', encabezado: 'Costo acelerado', tipo: 'numero', ancho: '8rem', unidad: simbolo, obtener: (f) => f.costoAcelerado, fijar: (f, v) => ({ ...f, costoAcelerado: Math.max(0, numero(v)) }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta
        titulo="Actividades"
        descripcion="Las tres últimas columnas son para la compresión del proyecto. Con la duración acelerada en cero, la actividad no se puede acortar y el laboratorio no muestra el panel de compresión."
      >
        <TablaEditable
          filas={datos.actividades}
          columnas={columnas}
          clave={(f, i) => `${f.id}-${i}`}
          alCambiar={(actividades) => alCambiar({ ...datos, actividades })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              actividades: [
                ...datos.actividades,
                { id: letraLibre(datos.actividades.map((a) => a.id)), descripcion: 'Nueva actividad', predecesoras: [], duracion: 1, duracionAcelerada: null, costoNormal: 0, costoAcelerado: 0 },
              ],
            })
          }
          alEliminar={(i) => {
            const quitada = datos.actividades[i]?.id;
            alCambiar({
              ...datos,
              // Quien la tenía por predecesora se queda sin ella: dejar el
              // identificador colgando haría irresoluble la red.
              actividades: datos.actividades
                .filter((_, k) => k !== i)
                .map((a) => ({ ...a, predecesoras: a.predecesoras.filter((p) => p !== quitada) })),
            });
          }}
          textoAgregar="Agregar actividad"
        />
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto etiqueta="Unidad de tiempo" valor={datos.unidadTiempo} alCambiar={(v) => alCambiar({ ...datos, unidadTiempo: v })} />
        <Selector etiqueta="Moneda" valor={datos.moneda} opciones={MONEDAS} alCambiar={(v) => alCambiar({ ...datos, moneda: v as Datos<'cpm'>['moneda'] })} />
        <CampoNumero
          etiqueta="Costo indirecto por periodo"
          unidad={`${simbolo} / ${datos.unidadTiempo}`}
          valor={datos.costoIndirectoPorPeriodo}
          minimo={0}
          alCambiar={(v) => alCambiar({ ...datos, costoIndirectoPorPeriodo: v ?? 0 })}
          ayuda="Sin costo indirecto, comprimir nunca conviene."
        />
      </div>
    </div>
  );
}

// ───────────────────────────── PERT ─────────────────────────────

function EditorPERT({ datos, alCambiar }: Props<'pert'>): ReactNode {
  type Actividad = Datos<'pert'>['actividades'][number];

  const columnas: ColumnaEditable<Actividad>[] = [
    { clave: 'id', encabezado: 'Actividad', tipo: 'texto', ancho: '6rem', obtener: (f) => f.id, fijar: (f, v) => ({ ...f, id: v.trim().toUpperCase() }) },
    { clave: 'descripcion', encabezado: 'Descripción', tipo: 'texto', ancho: '16rem', obtener: (f) => f.descripcion, fijar: (f, v) => ({ ...f, descripcion: v }) },
    { clave: 'pred', encabezado: 'Predecesoras', tipo: 'texto', ancho: '9rem', obtener: (f) => f.predecesoras.join(', '), fijar: (f, v) => ({ ...f, predecesoras: listaIds(v) }) },
    { clave: 'a', encabezado: 'Optimista (a)', tipo: 'numero', ancho: '7rem', obtener: (f) => f.a, fijar: (f, v) => ({ ...f, a: Math.max(0, numero(v)) }) },
    { clave: 'm', encabezado: 'Más probable (m)', tipo: 'numero', ancho: '8rem', obtener: (f) => f.m, fijar: (f, v) => ({ ...f, m: Math.max(0, numero(v)) }) },
    { clave: 'b', encabezado: 'Pesimista (b)', tipo: 'numero', ancho: '7rem', obtener: (f) => f.b, fijar: (f, v) => ({ ...f, b: Math.max(0, numero(v)) }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Selector
        etiqueta="Modo"
        valor={datos.modo}
        opciones={[
          { valor: 'red', texto: 'Red de actividades con tres estimaciones' },
          { valor: 'solo_probabilidad', texto: 'Solo probabilidad, con media y desviación dadas' },
        ]}
        alCambiar={(v) => alCambiar({ ...datos, modo: v as Datos<'pert'>['modo'] })}
      />

      {datos.modo === 'red' ? (
        <Tarjeta titulo="Actividades" descripcion="Las tres estimaciones deben cumplir a ≤ m ≤ b.">
          <TablaEditable
            filas={datos.actividades}
            columnas={columnas}
            clave={(f, i) => `${f.id}-${i}`}
            alCambiar={(actividades) => alCambiar({ ...datos, actividades })}
            alAgregar={() =>
              alCambiar({
                ...datos,
                actividades: [
                  ...datos.actividades,
                  { id: letraLibre(datos.actividades.map((a) => a.id)), descripcion: 'Nueva actividad', predecesoras: [], a: 1, m: 2, b: 3 },
                ],
              })
            }
            alEliminar={(i) => {
              const quitada = datos.actividades[i]?.id;
              alCambiar({
                ...datos,
                actividades: datos.actividades
                  .filter((_, k) => k !== i)
                  .map((a) => ({ ...a, predecesoras: a.predecesoras.filter((p) => p !== quitada) })),
              });
            }}
            textoAgregar="Agregar actividad"
          />
        </Tarjeta>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <CampoNumero etiqueta="Media del proyecto" unidad={datos.unidadTiempo} valor={datos.mediaDirecta ?? 0} alCambiar={(v) => alCambiar({ ...datos, mediaDirecta: v })} />
          <CampoNumero etiqueta="Desviación estándar" unidad={datos.unidadTiempo} valor={datos.desviacionDirecta ?? 0} minimo={0} alCambiar={(v) => alCambiar({ ...datos, desviacionDirecta: v })} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto etiqueta="Unidad de tiempo" valor={datos.unidadTiempo} alCambiar={(v) => alCambiar({ ...datos, unidadTiempo: v })} />
        <CampoNumero
          etiqueta="Plazo a consultar"
          unidad={datos.unidadTiempo}
          valor={datos.plazoConsulta ?? 0}
          alCambiar={(v) => alCambiar({ ...datos, plazoConsulta: v === null || v === 0 ? null : v })}
          ayuda="Cero para no preguntar por un plazo."
        />
        <CampoNumero
          etiqueta="Confianza a consultar"
          unidad="%"
          valor={(datos.confianzaConsulta ?? 0) * 100}
          minimo={0}
          maximo={100}
          alCambiar={(v) => alCambiar({ ...datos, confianzaConsulta: v === null || v === 0 ? null : Math.min(1, Math.max(0, v / 100)) })}
          ayuda="Cero para no preguntar por un nivel de confianza."
        />
      </div>
    </div>
  );
}

// ───────────────────────────── Método gráfico ─────────────────────────────

function EditorGrafico({ datos, alCambiar }: Props<'grafico'>): ReactNode {
  type Restriccion = Datos<'grafico'>['restricciones'][number];

  const columnas: ColumnaEditable<Restriccion>[] = [
    { clave: 'nombre', encabezado: 'Restricción', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'a', encabezado: `Coef. de ${datos.nombreX}`, tipo: 'numero', ancho: '8rem', obtener: (f) => f.a, fijar: (f, v) => ({ ...f, a: numero(v) }) },
    { clave: 'b', encabezado: `Coef. de ${datos.nombreY}`, tipo: 'numero', ancho: '8rem', obtener: (f) => f.b, fijar: (f, v) => ({ ...f, b: numero(v) }) },
    { clave: 'relacion', encabezado: 'Relación', tipo: 'seleccion', ancho: '6rem', opciones: RELACIONES, obtener: (f) => f.relacion, fijar: (f, v) => ({ ...f, relacion: v as Restriccion['relacion'] }) },
    { clave: 'c', encabezado: 'Lado derecho', tipo: 'numero', ancho: '8rem', obtener: (f) => f.c, fijar: (f, v) => ({ ...f, c: numero(v) }) },
    { clave: 'unidad', encabezado: 'Unidad', tipo: 'texto', ancho: '7rem', obtener: (f) => f.unidad, fijar: (f, v) => ({ ...f, unidad: v }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Selector etiqueta="Objetivo" valor={datos.objetivo} opciones={OBJETIVOS} alCambiar={(v) => alCambiar({ ...datos, objetivo: v as Datos<'grafico'>['objetivo'] })} />
        <CampoTexto etiqueta="Nombre de la función objetivo" valor={datos.nombreObjetivo} alCambiar={(v) => alCambiar({ ...datos, nombreObjetivo: v })} />
        <CampoTexto etiqueta="Unidad del objetivo" valor={datos.unidadObjetivo} alCambiar={(v) => alCambiar({ ...datos, unidadObjetivo: v })} />
        <CampoTexto etiqueta="Nombre de x" valor={datos.nombreX} alCambiar={(v) => alCambiar({ ...datos, nombreX: v })} />
        <CampoTexto etiqueta="Nombre de y" valor={datos.nombreY} alCambiar={(v) => alCambiar({ ...datos, nombreY: v })} />
        <CampoTexto etiqueta="Unidad de las variables" valor={datos.unidadVariables} alCambiar={(v) => alCambiar({ ...datos, unidadVariables: v })} />
        <CampoNumero etiqueta={`Coeficiente de ${datos.nombreX}`} valor={datos.coefX} alCambiar={(v) => alCambiar({ ...datos, coefX: v ?? 0 })} />
        <CampoNumero etiqueta={`Coeficiente de ${datos.nombreY}`} valor={datos.coefY} alCambiar={(v) => alCambiar({ ...datos, coefY: v ?? 0 })} />
        <Interruptor
          etiqueta="No negatividad"
          activo={datos.noNegatividad}
          alCambiar={(v) => alCambiar({ ...datos, noNegatividad: v })}
          ayuda="Exigir x ≥ 0 y y ≥ 0."
        />
      </div>

      <Tarjeta titulo="Restricciones">
        <TablaEditable
          filas={datos.restricciones}
          columnas={columnas}
          clave={(f) => f.id}
          alCambiar={(restricciones) => alCambiar({ ...datos, restricciones })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              restricciones: [
                ...datos.restricciones,
                { id: idLibre(datos.restricciones.map((r) => r.id), 'r'), nombre: `Restricción ${datos.restricciones.length + 1}`, a: 1, b: 1, relacion: '<=', c: 1, unidad: '' },
              ],
            })
          }
          alEliminar={(i) => alCambiar({ ...datos, restricciones: datos.restricciones.filter((_, k) => k !== i) })}
          textoAgregar="Agregar restricción"
        />
      </Tarjeta>
    </div>
  );
}

// ───────────────────────────── Simplex ─────────────────────────────

function EditorSimplex({ datos, alCambiar }: Props<'simplex'>): ReactNode {
  type Variable = Datos<'simplex'>['variables'][number];
  type Restriccion = Datos<'simplex'>['restricciones'][number];

  const columnasVariables: ColumnaEditable<Variable>[] = [
    { clave: 'nombre', encabezado: 'Variable', tipo: 'texto', ancho: '16rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'coef', encabezado: 'Coeficiente en el objetivo', tipo: 'numero', ancho: '10rem', obtener: (f) => f.coeficiente, fijar: (f, v) => ({ ...f, coeficiente: numero(v) }) },
  ];

  const columnasRestricciones: ColumnaEditable<Restriccion>[] = [
    { clave: 'nombre', encabezado: 'Restricción', tipo: 'texto', ancho: '14rem', obtener: (f) => f.nombre, fijar: (f, v) => ({ ...f, nombre: v }) },
    { clave: 'relacion', encabezado: 'Relación', tipo: 'seleccion', ancho: '6rem', opciones: RELACIONES, obtener: (f) => f.relacion, fijar: (f, v) => ({ ...f, relacion: v as Restriccion['relacion'] }) },
    { clave: 'c', encabezado: 'Lado derecho', tipo: 'numero', ancho: '8rem', obtener: (f) => f.c, fijar: (f, v) => ({ ...f, c: numero(v) }) },
    { clave: 'unidad', encabezado: 'Unidad', tipo: 'texto', ancho: '7rem', obtener: (f) => f.unidad, fijar: (f, v) => ({ ...f, unidad: v }) },
  ];

  const n = datos.variables.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Selector etiqueta="Objetivo" valor={datos.objetivo} opciones={OBJETIVOS} alCambiar={(v) => alCambiar({ ...datos, objetivo: v as Datos<'simplex'>['objetivo'] })} />
        <CampoTexto etiqueta="Nombre de la función objetivo" valor={datos.nombreObjetivo} alCambiar={(v) => alCambiar({ ...datos, nombreObjetivo: v })} />
        <CampoTexto etiqueta="Unidad del objetivo" valor={datos.unidadObjetivo} alCambiar={(v) => alCambiar({ ...datos, unidadObjetivo: v })} />
        <CampoTexto etiqueta="Unidad de las variables" valor={datos.unidadVariables} alCambiar={(v) => alCambiar({ ...datos, unidadVariables: v })} />
      </div>

      <Tarjeta titulo="Variables de decisión">
        <TablaEditable
          filas={datos.variables}
          columnas={columnasVariables}
          clave={(f) => f.id}
          alCambiar={(variables) => alCambiar({ ...datos, variables })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              variables: [...datos.variables, { id: idLibre(datos.variables.map((v) => v.id), 'x'), nombre: `Variable ${n + 1}`, coeficiente: 0 }],
              // Cada restricción estrena un coeficiente para la variable nueva.
              restricciones: datos.restricciones.map((r) => ({ ...r, coeficientes: ajustar(r.coeficientes, n + 1, () => 0) })),
            })
          }
          alEliminar={(i) =>
            alCambiar({
              ...datos,
              variables: datos.variables.filter((_, k) => k !== i),
              restricciones: datos.restricciones.map((r) => ({ ...r, coeficientes: r.coeficientes.filter((_, k) => k !== i) })),
            })
          }
          textoAgregar="Agregar variable"
        />
      </Tarjeta>

      <Tarjeta titulo="Coeficientes de las restricciones" descripcion="Una fila por restricción y una columna por variable.">
        <MatrizEditable
          filas={datos.restricciones.map((r) => r.nombre)}
          columnas={datos.variables.map((v) => v.nombre)}
          valores={datos.restricciones.map((r) => ajustar(r.coeficientes, n, () => 0))}
          encabezadoFilas="Restricción \ Variable"
          alCambiarValor={(i, j, v) =>
            alCambiar({
              ...datos,
              restricciones: datos.restricciones.map((r, k) =>
                k !== i ? r : { ...r, coeficientes: ajustar(r.coeficientes, n, () => 0).map((c, cj) => (cj === j ? (v ?? 0) : c)) },
              ),
            })
          }
        />
      </Tarjeta>

      <Tarjeta titulo="Relación y lado derecho">
        <TablaEditable
          filas={datos.restricciones}
          columnas={columnasRestricciones}
          clave={(f) => f.id}
          alCambiar={(restricciones) => alCambiar({ ...datos, restricciones })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              restricciones: [
                ...datos.restricciones,
                { id: idLibre(datos.restricciones.map((r) => r.id), 'r'), nombre: `Restricción ${datos.restricciones.length + 1}`, coeficientes: Array.from({ length: Math.max(1, n) }, () => 0), relacion: '<=', c: 0, unidad: '' },
              ],
            })
          }
          alEliminar={(i) => alCambiar({ ...datos, restricciones: datos.restricciones.filter((_, k) => k !== i) })}
          textoAgregar="Agregar restricción"
        />
      </Tarjeta>
    </div>
  );
}

// ───────────────────────────── Asignación ─────────────────────────────

function EditorAsignacion({ datos, alCambiar }: Props<'asignacion'>): ReactNode {
  const filas = datos.filas.length;
  const columnas = datos.columnas.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selector etiqueta="Objetivo" valor={datos.objetivo} opciones={OBJETIVOS} alCambiar={(v) => alCambiar({ ...datos, objetivo: v as Datos<'asignacion'>['objetivo'] })} />
        <CampoTexto etiqueta="Unidad de la matriz" valor={datos.unidad} alCambiar={(v) => alCambiar({ ...datos, unidad: v })} />
        <CampoTexto etiqueta="Nombre de las filas" valor={datos.nombreFilas} alCambiar={(v) => alCambiar({ ...datos, nombreFilas: v })} />
        <CampoTexto etiqueta="Nombre de las columnas" valor={datos.nombreColumnas} alCambiar={(v) => alCambiar({ ...datos, nombreColumnas: v })} />
      </div>

      <Tarjeta
        titulo="Matriz de asignación"
        descripcion="Una celda vacía marca una asignación prohibida."
        acciones={
          <ControlesTamano
            filas={filas}
            columnas={columnas}
            alCambiar={(f, c) =>
              alCambiar({
                ...datos,
                filas: ajustar(datos.filas, f, (i) => `${datos.nombreFilas} ${i + 1}`),
                columnas: ajustar(datos.columnas, c, (j) => `${datos.nombreColumnas} ${j + 1}`),
                matriz: redimensionar(datos.matriz, f, c, 0),
              })
            }
          />
        }
      >
        <MatrizEditable
          filas={datos.filas}
          columnas={datos.columnas}
          valores={datos.matriz}
          admiteProhibidos
          encabezadoFilas={`${datos.nombreFilas} \\ ${datos.nombreColumnas}`}
          alCambiarValor={(i, j, v) =>
            alCambiar({ ...datos, matriz: datos.matriz.map((f, fi) => (fi === i ? f.map((c, cj) => (cj === j ? v : c)) : f)) })
          }
          alCambiarNombreFila={(i, nombre) => alCambiar({ ...datos, filas: datos.filas.map((f, k) => (k === i ? nombre : f)) })}
          alCambiarNombreColumna={(j, nombre) => alCambiar({ ...datos, columnas: datos.columnas.map((c, k) => (k === j ? nombre : c)) })}
        />
      </Tarjeta>
    </div>
  );
}

// ───────────────────────────── Transporte ─────────────────────────────

function EditorTransporte({ datos, alCambiar }: Props<'transporte'>): ReactNode {
  const m = datos.origenes.length;
  const n = datos.destinos.length;
  const totalOferta = datos.oferta.reduce((t, x) => t + x, 0);
  const totalDemanda = datos.demanda.reduce((t, x) => t + x, 0);
  const balanceado = Math.abs(totalOferta - totalDemanda) < 1e-9;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto etiqueta="Unidad del costo" valor={datos.unidadCosto} alCambiar={(v) => alCambiar({ ...datos, unidadCosto: v })} />
        <CampoTexto etiqueta="Unidad de la cantidad" valor={datos.unidadCantidad} alCambiar={(v) => alCambiar({ ...datos, unidadCantidad: v })} />
        <Selector
          etiqueta="Método inicial sugerido"
          valor={datos.metodoInicialSugerido}
          opciones={[
            { valor: 'noroeste', texto: 'Esquina noroeste' },
            { valor: 'costo_minimo', texto: 'Costo mínimo' },
            { valor: 'vogel', texto: 'Aproximación de Vogel' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, metodoInicialSugerido: v as Datos<'transporte'>['metodoInicialSugerido'] })}
        />
      </div>

      <Tarjeta
        titulo="Costos, oferta y demanda"
        descripcion={
          balanceado
            ? `Oferta y demanda coinciden en ${totalOferta}: el problema está balanceado.`
            : `La oferta suma ${totalOferta} y la demanda ${totalDemanda}. El motor lo balancea con un origen o destino ficticio, y lo explica en un paso.`
        }
        acciones={
          <ControlesTamano
            filas={m}
            columnas={n}
            etiquetaFilas="Orígenes"
            etiquetaColumnas="Destinos"
            alCambiar={(f, c) =>
              alCambiar({
                ...datos,
                origenes: ajustar(datos.origenes, f, (i) => `Origen ${i + 1}`),
                destinos: ajustar(datos.destinos, c, (j) => `Destino ${j + 1}`),
                costos: redimensionar(datos.costos, f, c, 0),
                oferta: ajustar(datos.oferta, f, () => 0),
                demanda: ajustar(datos.demanda, c, () => 0),
              })
            }
          />
        }
      >
        <MatrizEditable
          filas={datos.origenes}
          columnas={datos.destinos}
          valores={datos.costos}
          encabezadoFilas="Origen \ Destino"
          ofertaLateral={datos.oferta}
          demandaInferior={datos.demanda}
          alCambiarValor={(i, j, v) =>
            alCambiar({ ...datos, costos: datos.costos.map((f, fi) => (fi === i ? f.map((c, cj) => (cj === j ? (v ?? 0) : c)) : f)) })
          }
          alCambiarNombreFila={(i, nombre) => alCambiar({ ...datos, origenes: datos.origenes.map((o, k) => (k === i ? nombre : o)) })}
          alCambiarNombreColumna={(j, nombre) => alCambiar({ ...datos, destinos: datos.destinos.map((d, k) => (k === j ? nombre : d)) })}
          alCambiarOferta={(i, v) => alCambiar({ ...datos, oferta: datos.oferta.map((o, k) => (k === i ? v : o)) })}
          alCambiarDemanda={(j, v) => alCambiar({ ...datos, demanda: datos.demanda.map((d, k) => (k === j ? v : d)) })}
        />
      </Tarjeta>
    </div>
  );
}

// ───────────────────────────── Fundamentos ─────────────────────────────

const CATEGORIAS_SISTEMA = [
  { valor: 'entrada', texto: 'Entrada' },
  { valor: 'proceso', texto: 'Proceso' },
  { valor: 'salida', texto: 'Salida' },
  { valor: 'retroalimentacion', texto: 'Retroalimentación' },
  { valor: 'ambiente_externo', texto: 'Ambiente externo' },
];

function EditorFundamentos({ datos, alCambiar }: Props<'fundamentos'>): ReactNode {
  type Elemento = Datos<'fundamentos'>['elementos'][number];

  const columnas: ColumnaEditable<Elemento>[] = [
    { clave: 'texto', encabezado: 'Elemento', tipo: 'texto', ancho: '24rem', obtener: (f) => f.texto, fijar: (f, v) => ({ ...f, texto: v }) },
    { clave: 'categoria', encabezado: 'Categoría', tipo: 'seleccion', ancho: '12rem', opciones: CATEGORIAS_SISTEMA, obtener: (f) => f.categoria, fijar: (f, v) => ({ ...f, categoria: v as Elemento['categoria'] }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <CampoTexto etiqueta="Organización" valor={datos.organizacion} alCambiar={(v) => alCambiar({ ...datos, organizacion: v })} />
        <Selector
          etiqueta="Naturaleza"
          valor={datos.naturaleza}
          opciones={[
            { valor: 'manufactura', texto: 'Manufactura' },
            { valor: 'servicios', texto: 'Servicios' },
            { valor: 'mixta', texto: 'Mixta' },
          ]}
          alCambiar={(v) => alCambiar({ ...datos, naturaleza: v as Datos<'fundamentos'>['naturaleza'] })}
        />
        <Selector
          etiqueta="Estrategia de competencia"
          valor={datos.estrategiaCompetencia ?? 'ninguna'}
          opciones={[
            { valor: 'ninguna', texto: 'Sin estrategia declarada' },
            { valor: 'costo', texto: 'Costo' },
            { valor: 'calidad', texto: 'Calidad' },
            { valor: 'flexibilidad', texto: 'Flexibilidad' },
            { valor: 'velocidad', texto: 'Velocidad' },
          ]}
          alCambiar={(v) =>
            alCambiar({ ...datos, estrategiaCompetencia: v === 'ninguna' ? null : (v as NonNullable<Datos<'fundamentos'>['estrategiaCompetencia']>) })
          }
        />
      </div>

      <Tarjeta titulo="Elementos que el estudiante debe clasificar">
        <TablaEditable
          filas={datos.elementos}
          columnas={columnas}
          clave={(f) => f.id}
          alCambiar={(elementos) => alCambiar({ ...datos, elementos })}
          alAgregar={() =>
            alCambiar({
              ...datos,
              elementos: [...datos.elementos, { id: idLibre(datos.elementos.map((e) => e.id), 'e'), texto: 'Nuevo elemento', categoria: 'entrada' }],
            })
          }
          alEliminar={(i) => alCambiar({ ...datos, elementos: datos.elementos.filter((_, k) => k !== i) })}
          textoAgregar="Agregar elemento"
        />
      </Tarjeta>
    </div>
  );
}

// ───────────────────────────── Inventarios ─────────────────────────────

function EditorInventarios({ datos, alCambiar }: Props<'inventarios'>): ReactNode {
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';

  return (
    <div className="flex flex-col gap-4">
      <Selector
        etiqueta="Modelo"
        valor={datos.modelo}
        opciones={[
          { valor: 'lote_economico', texto: 'Lote económico (MLE)' },
          { valor: 'reabastecimiento_uniforme', texto: 'Reabastecimiento uniforme' },
          { valor: 'periodo_fijo', texto: 'Periodo fijo de reorden' },
        ]}
        alCambiar={(v) =>
          alCambiar({
            ...datos,
            modelo: v as Datos<'inventarios'>['modelo'],
            // El reabastecimiento uniforme necesita la tasa de producción; sin
            // ella el ejercicio no se puede resolver, así que se propone una.
            tasaProduccionAnual:
              v === 'reabastecimiento_uniforme' ? (datos.tasaProduccionAnual ?? datos.demandaAnual * 2) : datos.tasaProduccionAnual,
          })
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Selector etiqueta="Moneda" valor={datos.moneda} opciones={MONEDAS} alCambiar={(v) => alCambiar({ ...datos, moneda: v as Datos<'inventarios'>['moneda'] })} />
        <CampoTexto etiqueta="Unidad del producto" valor={datos.unidadProducto} alCambiar={(v) => alCambiar({ ...datos, unidadProducto: v })} />
        <CampoNumero etiqueta="Demanda anual (D)" unidad={datos.unidadProducto} valor={datos.demandaAnual} minimo={1} alCambiar={(v) => alCambiar({ ...datos, demandaAnual: v ?? 1 })} />
        <CampoNumero etiqueta="Costo de ordenar (Co)" unidad={simbolo} valor={datos.costoOrdenar} minimo={0} alCambiar={(v) => alCambiar({ ...datos, costoOrdenar: v ?? 0 })} />
        <CampoNumero
          etiqueta="Costo de conservar (Ch)"
          unidad={`${simbolo} / año`}
          valor={datos.costoConservar}
          minimo={0.01}
          alCambiar={(v) => alCambiar({ ...datos, costoConservar: v === null || v <= 0 ? 0.01 : v })}
          ayuda="Tiene que ser mayor que cero: si conservar fuera gratis, no existiría el lote económico."
        />
        <CampoNumero etiqueta="Costo unitario" unidad={simbolo} valor={datos.costoUnitario} minimo={0} alCambiar={(v) => alCambiar({ ...datos, costoUnitario: v ?? 0 })} ayuda="Cero si el enunciado no lo da." />
        <CampoNumero etiqueta="Tiempo de entrega (L)" unidad="días" valor={datos.tiempoEntregaDias} minimo={0} alCambiar={(v) => alCambiar({ ...datos, tiempoEntregaDias: v ?? 0 })} />
        <CampoNumero
          etiqueta="Días del año"
          valor={datos.diasPorAnio}
          minimo={1}
          paso={5}
          alCambiar={(v) => alCambiar({ ...datos, diasPorAnio: Math.max(1, Math.round(v ?? 360)) })}
          ayuda="Con qué año se convierte la demanda anual a diaria. Ver inconsistencia I-16."
        />
        {datos.modelo === 'reabastecimiento_uniforme' && (
          <CampoNumero
            etiqueta="Tasa de producción (p)"
            unidad={`${datos.unidadProducto} / año`}
            valor={datos.tasaProduccionAnual ?? datos.demandaAnual * 2}
            minimo={datos.demandaAnual + 1}
            alCambiar={(v) => alCambiar({ ...datos, tasaProduccionAnual: v ?? datos.demandaAnual * 2 })}
            ayuda="Tiene que superar a la demanda, o nunca se acumula inventario."
          />
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Líneas de espera ─────────────────────────────

function EditorColas({ datos, alCambiar }: Props<'colas'>): ReactNode {
  const simbolo = datos.moneda === 'USD' ? 'US$' : 'L';
  const capacidad = datos.servidores * datos.tasaServicio;
  const estable = datos.tasaLlegadas < capacidad;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <CampoNumero
          etiqueta="Tasa de llegadas (λ)"
          unidad={`${datos.nombreClientes} / ${datos.unidadTiempo}`}
          valor={datos.tasaLlegadas}
          minimo={0.01}
          alCambiar={(v) => alCambiar({ ...datos, tasaLlegadas: v === null || v <= 0 ? 0.01 : v })}
        />
        <CampoNumero
          etiqueta="Tasa de servicio de un servidor (μ)"
          unidad={`${datos.nombreClientes} / ${datos.unidadTiempo}`}
          valor={datos.tasaServicio}
          minimo={0.01}
          alCambiar={(v) => alCambiar({ ...datos, tasaServicio: v === null || v <= 0 ? 0.01 : v })}
        />
        <CampoNumero
          etiqueta="Servidores (s)"
          valor={datos.servidores}
          minimo={1}
          paso={1}
          alCambiar={(v) => alCambiar({ ...datos, servidores: Math.max(1, Math.round(v ?? 1)) })}
        />
        <CampoTexto etiqueta="Unidad de tiempo" valor={datos.unidadTiempo} alCambiar={(v) => alCambiar({ ...datos, unidadTiempo: v })} />
        <CampoTexto etiqueta="Qué hace cola" valor={datos.nombreClientes} alCambiar={(v) => alCambiar({ ...datos, nombreClientes: v })} />
        <Selector etiqueta="Moneda" valor={datos.moneda} opciones={MONEDAS} alCambiar={(v) => alCambiar({ ...datos, moneda: v as Datos<'colas'>['moneda'] })} />
        <CampoNumero
          etiqueta="Costo de esperar"
          unidad={`${simbolo} / ${datos.nombreClientes} / ${datos.unidadTiempo}`}
          valor={datos.costoEsperaPorHora}
          minimo={0}
          alCambiar={(v) => alCambiar({ ...datos, costoEsperaPorHora: v ?? 0 })}
          ayuda="Cero si el ejercicio no pide decidir cuántos servidores abrir."
        />
        <CampoNumero
          etiqueta="Costo de un servidor"
          unidad={`${simbolo} / ${datos.unidadTiempo}`}
          valor={datos.costoServidorPorHora}
          minimo={0}
          alCambiar={(v) => alCambiar({ ...datos, costoServidorPorHora: v ?? 0 })}
        />
      </div>

      {/* La estabilidad se avisa aquí y no solo al resolver: es la condición que
          decide si el ejercicio tiene sentido, y conviene verla al escribirlo. */}
      <p
        className="rounded-md px-3 py-2 text-[0.8125rem]"
        style={{ background: estable ? 'var(--bien-suave)' : 'var(--mal-suave)', color: 'var(--tinta)' }}
      >
        {estable ? (
          <>
            Llegan {datos.tasaLlegadas} y se pueden atender {capacidad} por {datos.unidadTiempo}: el sistema es estable.
          </>
        ) : (
          <>
            <strong>El sistema es inestable.</strong> Llegan {datos.tasaLlegadas} {datos.nombreClientes} por{' '}
            {datos.unidadTiempo} y {datos.servidores} servidor(es) alcanzan a atender {capacidad}. La cola crecería sin
            límite y el ejercicio no tendría respuesta, salvo que sea justo eso lo que quiera enseñar.
          </>
        )}
      </p>
    </div>
  );
}

// ───────────────────────────── Auxiliares ─────────────────────────────

/**
 * Cambia el tamaño de una estructura rectangular. Va junto a la tabla que
 * redimensiona, porque agregar una fila implica agregarla en todas partes a la
 * vez y no tendría sentido ofrecerlo por separado.
 */
function ControlesTamano({
  filas,
  columnas,
  alCambiar,
  etiquetaFilas = 'Filas',
  etiquetaColumnas = 'Columnas',
}: {
  filas: number;
  columnas: number;
  alCambiar: (filas: number, columnas: number) => void;
  etiquetaFilas?: string;
  etiquetaColumnas?: string;
}): ReactNode {
  const boton = (texto: string, etiqueta: string, alPulsar: () => void, deshabilitado = false): ReactNode => (
    <button type="button" className="boton boton-suave boton-pequeno" onClick={alPulsar} disabled={deshabilitado} aria-label={etiqueta}>
      {texto}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span style={{ color: 'var(--tinta-tenue)' }}>
        {etiquetaFilas}: {filas}
      </span>
      {boton('−', `Quitar ${etiquetaFilas.toLowerCase()}`, () => alCambiar(filas - 1, columnas), filas <= 1)}
      {boton('+', `Agregar ${etiquetaFilas.toLowerCase()}`, () => alCambiar(filas + 1, columnas))}
      <span className="ml-2" style={{ color: 'var(--tinta-tenue)' }}>
        {etiquetaColumnas}: {columnas}
      </span>
      {boton('−', `Quitar ${etiquetaColumnas.toLowerCase()}`, () => alCambiar(filas, columnas - 1), columnas <= 1)}
      {boton('+', `Agregar ${etiquetaColumnas.toLowerCase()}`, () => alCambiar(filas, columnas + 1))}
    </div>
  );
}
