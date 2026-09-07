/**
 * Laboratorio del módulo 1 — Fundamentos de gestión de operaciones.
 *
 * Constructor visual de sistemas operativos: el estudiante arrastra cada
 * elemento a la categoría que le corresponde (entrada, proceso, salida,
 * retroalimentación o ambiente externo) y recibe retroalimentación inmediata.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { barajar, generadorSemilla } from '@/nucleo/numero';
import type { DatosEjercicio } from '@/esquemas';
import { Distintivo, Indicador, Tarjeta, TextoFormateado } from '@/ui/base';
import { Interpretacion } from '@/ui/pasos';
import { PerfilOperaciones } from './PerfilOperaciones';

type Categoria = 'entrada' | 'proceso' | 'salida' | 'retroalimentacion' | 'ambiente_externo';

const CATEGORIAS: readonly { id: Categoria; nombre: string; descripcion: string; color: string }[] = [
  {
    id: 'entrada',
    nombre: 'Entradas',
    descripcion: 'Insumos, recursos humanos, capital, tecnología y energía que ingresan al sistema.',
    color: 'var(--bien)',
  },
  {
    id: 'proceso',
    nombre: 'Procesos',
    descripcion: 'Las actividades de transformación que convierten las entradas en salidas.',
    color: 'var(--acento)',
  },
  {
    id: 'salida',
    nombre: 'Salidas',
    descripcion: 'Los bienes o servicios que el sistema entrega, incluidos los subproductos.',
    color: 'var(--avisar)',
  },
  {
    id: 'retroalimentacion',
    nombre: 'Retroalimentación',
    descripcion: 'Información que vuelve al sistema para ajustar su desempeño. Es información, no materia.',
    color: 'var(--color-primario)',
  },
  {
    id: 'ambiente_externo',
    nombre: 'Ambiente externo',
    descripcion: 'Lo que condiciona al sistema sin formar parte de él: clientes, competencia, normativa, clima.',
    color: 'var(--tinta-media)',
  },
];

const ESTRATEGIAS: readonly { id: string; nombre: string; explicacion: string }[] = [
  { id: 'costo', nombre: 'Costo', explicacion: 'Competir con el precio más bajo exige procesos estandarizados, alto volumen y control estricto del desperdicio.' },
  { id: 'calidad', nombre: 'Calidad', explicacion: 'Competir por calidad exige medición sistemática, personal capacitado y disposición a rechazar producto que no cumple.' },
  { id: 'flexibilidad', nombre: 'Flexibilidad', explicacion: 'Competir por flexibilidad exige equipos de uso general, personal polivalente y lotes pequeños.' },
  { id: 'velocidad', nombre: 'Velocidad', explicacion: 'Competir por velocidad exige inventarios cercanos al cliente, procesos cortos y capacidad de reserva.' },
];

export function LabFundamentos({
  datosIniciales,
  revelarTodo,
  ocultarResultados,
}: {
  datosIniciales: Extract<DatosEjercicio, { tipo: 'fundamentos' }>;
  titulo: string;
  revelarTodo: boolean;
  ocultarResultados: boolean;
}): ReactNode {
  const [colocaciones, setColocaciones] = useState<Record<string, Categoria | null>>(() =>
    Object.fromEntries(datosIniciales.elementos.map((e) => [e.id, null])),
  );
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [verificado, setVerificado] = useState(revelarTodo);
  const [propios, setPropios] = useState<{ id: string; texto: string; categoria: Categoria }[]>([]);
  const [textoNuevo, setTextoNuevo] = useState('');
  const [categoriaNueva, setCategoriaNueva] = useState<Categoria>('entrada');

  /**
   * Los elementos se presentan barajados.
   *
   * En los datos están agrupados por categoría, que es como conviene
   * escribirlos y mantenerlos, pero mostrarlos así permitía resolver el
   * ejercicio **por posición**: las primeras cuatro fichas eran entradas, las
   * cuatro siguientes procesos, y así. Se acertaba sin leer.
   *
   * La semilla se fija al montar, de modo que el orden no cambia mientras el
   * estudiante trabaja —fichas que saltan de sitio al clasificar serían
   * insufribles— y sí cambia entre un intento y el siguiente.
   */
  const [semillaOrden, setSemillaOrden] = useState(() => Math.floor(Math.random() * 2 ** 32));
  const elementos = useMemo(
    () => barajar(datosIniciales.elementos, generadorSemilla(semillaOrden)),
    [datosIniciales.elementos, semillaOrden],
  );

  const sinColocar = elementos.filter((e) => colocaciones[e.id] == null);

  const resumen = useMemo(() => {
    const colocados = elementos.filter((e) => colocaciones[e.id] != null);
    const correctos = colocados.filter((e) => colocaciones[e.id] === e.categoria);
    return {
      colocados: colocados.length,
      total: elementos.length,
      correctos: correctos.length,
      porcentaje: colocados.length === 0 ? 0 : (correctos.length / colocados.length) * 100,
    };
  }, [colocaciones, elementos]);

  const colocar = (elementoId: string, categoria: Categoria): void => {
    setColocaciones((s) => ({ ...s, [elementoId]: categoria }));
    setSeleccionado(null);
    setArrastrando(null);
  };

  const esModoLibre = elementos.length === 0;

  return (
    <div className="flex flex-col gap-5">
      {esModoLibre ? (
        <Tarjeta
          titulo="Constructor libre de sistemas"
          descripcion="Este ejercicio analiza una organización que usted elige. Agregue cada elemento que observe y clasifíquelo. El diagrama resultante se puede exportar junto con su ensayo."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
                <span className="etiqueta">Elemento observado</span>
                <input
                  className="campo"
                  value={textoNuevo}
                  placeholder="Por ejemplo: leche cruda entregada por los socios"
                  onChange={(e) => setTextoNuevo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textoNuevo.trim() !== '') {
                      setPropios((s) => [...s, { id: `propio-${Date.now()}`, texto: textoNuevo.trim(), categoria: categoriaNueva }]);
                      setTextoNuevo('');
                    }
                  }}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="etiqueta">Categoría</span>
                <select className="campo" value={categoriaNueva} onChange={(e) => setCategoriaNueva(e.target.value as Categoria)}>
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="boton boton-primario"
                disabled={textoNuevo.trim() === ''}
                onClick={() => {
                  setPropios((s) => [...s, { id: `propio-${Date.now()}`, texto: textoNuevo.trim(), categoria: categoriaNueva }]);
                  setTextoNuevo('');
                }}
              >
                Agregar
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {CATEGORIAS.map((c) => {
                const suyos = propios.filter((p) => p.categoria === c.id);
                return (
                  <div key={c.id} className="tarjeta-plana flex flex-col gap-2 p-3" style={{ borderTop: `3px solid ${c.color}` }}>
                    <p className="etiqueta" style={{ color: c.color }}>
                      {c.nombre}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                      {c.descripcion}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {suyos.map((p) => (
                        <li key={p.id} className="flex items-start justify-between gap-2 rounded px-2 py-1 text-[0.8125rem]" style={{ background: 'var(--superficie)' }}>
                          <span>{p.texto}</span>
                          <button
                            type="button"
                            className="boton boton-suave boton-pequeno shrink-0"
                            onClick={() => setPropios((s) => s.filter((x) => x.id !== p.id))}
                            aria-label={`Quitar ${p.texto}`}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                      {suyos.length === 0 && (
                        <li className="text-xs italic" style={{ color: 'var(--tinta-tenue)' }}>
                          sin elementos
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>

            <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              Lleva {propios.length} elemento(s) registrado(s). Un análisis sistémico completo suele identificar al menos tres
              en cada categoría; si alguna queda vacía, probablemente falta observar algo.
            </p>
          </div>
        </Tarjeta>
      ) : (
        <>
          <Tarjeta
            titulo={`Constructor de sistemas: ${datosIniciales.organizacion}`}
            descripcion="Arrastre cada elemento a su categoría, o selecciónelo con Enter y luego elija la categoría destino."
            acciones={
              <div className="flex gap-2">
                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => {
                  setColocaciones(Object.fromEntries(datosIniciales.elementos.map((e) => [e.id, null])));
                  setVerificado(false);
                  setSemillaOrden(Math.floor(Math.random() * 2 ** 32));
                }}>
                  Reiniciar
                </button>
                <button type="button" className="boton boton-primario boton-pequeno" onClick={() => setVerificado(true)} disabled={sinColocar.length > 0}>
                  {sinColocar.length > 0 ? `Faltan ${sinColocar.length}` : 'Comprobar'}
                </button>
              </div>
            }
          >
            <div className="flex flex-col gap-4">
              <div className="tarjeta-plana flex flex-wrap gap-2 p-3">
                <p className="etiqueta w-full">Elementos por clasificar ({sinColocar.length})</p>
                {sinColocar.length === 0 ? (
                  <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                    Todos los elementos están colocados. Pulse «Comprobar» para revisar.
                  </p>
                ) : (
                  sinColocar.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      draggable
                      onDragStart={() => setArrastrando(e.id)}
                      onDragEnd={() => setArrastrando(null)}
                      onClick={() => setSeleccionado((s) => (s === e.id ? null : e.id))}
                      className="boton boton-secundario boton-pequeno cursor-grab text-left"
                      style={
                        seleccionado === e.id
                          ? { background: 'var(--acento)', color: 'var(--acento-contraste)', borderColor: 'var(--acento)' }
                          : undefined
                      }
                      aria-pressed={seleccionado === e.id}
                    >
                      {e.texto}
                    </button>
                  ))
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {CATEGORIAS.map((c) => {
                  const dentro = elementos.filter((e) => colocaciones[e.id] === c.id);
                  return (
                    <div
                      key={c.id}
                      className="tarjeta-plana flex min-h-[10rem] flex-col gap-2 p-3 transition-colors"
                      style={{ borderTop: `3px solid ${c.color}`, background: arrastrando !== null ? 'var(--superficie-3)' : undefined }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (arrastrando !== null) colocar(arrastrando, c.id);
                      }}
                    >
                      <p className="etiqueta" style={{ color: c.color }}>
                        {c.nombre}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                        {c.descripcion}
                      </p>

                      {/* Colocar tenía que ser un botón de verdad. Antes el destino era
                          este mismo recuadro con un `onClick`: con el ratón funcionaba,
                          pero con teclado no había forma de llegar a él, y la
                          descripción del ejercicio promete justamente esa vía. */}
                      {seleccionado !== null && (
                        <button
                          type="button"
                          className="boton boton-secundario boton-pequeno self-start"
                          onClick={() => colocar(seleccionado, c.id)}
                        >
                          {/* El nombre lleva la categoría porque es lo que distingue a
                              estos cinco botones entre sí; con solo «aquí», un lector
                              de pantalla los anunciaría idénticos. */}
                          Colocar «{elementos.find((e) => e.id === seleccionado)?.texto ?? ''}» en {c.nombre}
                        </button>
                      )}

                      <ul className="flex flex-col gap-1.5">
                        {dentro.map((e) => {
                          const acierta = e.categoria === c.id;
                          return (
                            <li
                              key={e.id}
                              className="flex items-start justify-between gap-2 rounded px-2 py-1 text-[0.8125rem]"
                              style={{
                                background: verificado ? (acierta ? 'var(--bien-suave)' : 'var(--mal-suave)') : 'var(--superficie)',
                                border: verificado ? `1px solid ${acierta ? 'var(--bien)' : 'var(--mal)'}` : '1px solid var(--borde)',
                              }}
                            >
                              <span>{e.texto}</span>
                              <button
                                type="button"
                                className="boton boton-suave boton-pequeno shrink-0"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setColocaciones((s) => ({ ...s, [e.id]: null }));
                                }}
                                aria-label={`Sacar ${e.texto} de ${c.nombre}`}
                              >
                                ↩
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </Tarjeta>

          {verificado && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Indicador etiqueta="Clasificaciones correctas" valor={`${resumen.correctos} / ${resumen.total}`} tono={resumen.porcentaje >= 80 ? 'bien' : 'avisar'} />
                <Indicador etiqueta="Aciertos" valor={`${Math.round(resumen.porcentaje)} %`} tono={resumen.porcentaje >= 80 ? 'bien' : 'avisar'} />
                <Indicador
                  etiqueta="Naturaleza de la organización"
                  valor={datosIniciales.naturaleza === 'manufactura' ? 'Manufactura' : datosIniciales.naturaleza === 'servicios' ? 'Servicios' : 'Mixta'}
                />
              </div>

              <Tarjeta titulo="Elementos mal clasificados">
                {elementos.filter((e) => colocaciones[e.id] !== e.categoria).length === 0 ? (
                  <p className="text-[0.8125rem]" style={{ color: 'var(--bien)' }}>
                    Clasificación perfecta. El modelo de sistemas de esta organización está bien entendido.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {elementos
                      .filter((e) => colocaciones[e.id] !== e.categoria)
                      .map((e) => {
                        const puesta = CATEGORIAS.find((c) => c.id === colocaciones[e.id]);
                        const correcta = CATEGORIAS.find((c) => c.id === e.categoria)!;
                        return (
                          <li key={e.id} className="aviso aviso-avisar">
                            <span>
                              <strong>{e.texto}</strong> — lo colocó en {puesta?.nombre ?? 'ninguna categoría'} y corresponde a{' '}
                              <strong>{correcta.nombre}</strong>. {correcta.descripcion}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </Tarjeta>
            </>
          )}
        </>
      )}

      {datosIniciales.casosNaturaleza.length > 0 && (
        <PerfilOperaciones
          casos={datosIniciales.casosNaturaleza}
          revelarTodo={revelarTodo}
          ocultarResultados={ocultarResultados}
        />
      )}

      <Tarjeta
        titulo="Estrategias de competencia"
        descripcion="Toda organización elige, explícita o implícitamente, en qué compite. Esa elección condiciona cada decisión de operaciones."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {ESTRATEGIAS.map((e) => {
            const esLaDelCaso = datosIniciales.estrategiaCompetencia === e.id;
            return (
              <div
                key={e.id}
                className="tarjeta-plana flex flex-col gap-1.5 p-3"
                style={esLaDelCaso ? { borderColor: 'var(--acento)', background: 'var(--acento-suave)' } : undefined}
              >
                <div className="flex items-center gap-2">
                  <h4>{e.nombre}</h4>
                  {esLaDelCaso && <Distintivo tono="acento">este caso</Distintivo>}
                </div>
                <p className="text-xs" style={{ color: 'var(--tinta-media)' }}>
                  {e.explicacion}
                </p>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Decisiones del gerente de operaciones">
        <TextoFormateado
          texto={
            'Las decisiones de operaciones se ordenan por horizonte y reversibilidad.\n\n' +
            '**Estratégicas.** Comprometen recursos por años y son costosas de revertir: dónde ubicar la planta, qué capacidad instalar, ' +
            'qué tecnología adoptar, en qué competir.\n\n' +
            '**Tácticas.** Se toman por temporada o por trimestre: cuánto producir cada mes, qué nivel de inventario mantener, ' +
            'cuántos turnos abrir, con qué proveedores contratar.\n\n' +
            '**Operativas.** Son del día a día y se corrigen rápido: qué orden fabricar primero, a quién asignar cada tarea, ' +
            'cómo reaccionar ante una falla de equipo.\n\n' +
            'La confusión entre niveles es un error frecuente y caro: tratar una decisión estratégica como operativa lleva a improvisar ' +
            'una planta; tratar una operativa como estratégica paraliza la operación en reuniones.'
          }
        />
      </Tarjeta>

      {verificado && !esModoLibre && (
        <Interpretacion
          titulo="Por qué importa clasificar bien"
          texto={
            'Distinguir entradas de ambiente externo no es un ejercicio de vocabulario: define sobre qué puede actuar el gerente. ' +
            'Una entrada se negocia, se sustituye o se racionaliza; el ambiente externo solo se anticipa. ' +
            'Y confundir salida con retroalimentación lleva a medir lo que sale en lugar de medir lo que hay que corregir: ' +
            'el suero que sale de la planta es una salida; el reclamo del cliente por producto agrio es la información que evita el próximo lote perdido.'
          }
        />
      )}
    </div>
  );
}
