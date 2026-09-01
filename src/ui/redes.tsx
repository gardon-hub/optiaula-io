/**
 * Diagramas de red en SVG.
 *
 * · Actividades en nodos (AON) con los seis valores dentro de cada nodo.
 * · Actividades en flechas (AOA) con las ficticias punteadas.
 * · Red bipartita origen-destino para visualizar los envíos del transporte.
 *
 * El recorrido hacia adelante y hacia atrás se puede animar paso a paso, que es
 * la forma más clara de explicar de dónde sale cada número.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ActividadCalculada, RedAOA, ResultadoCPM } from '@/nucleo/cpm';
import type { ProblemaBalanceado, RutaEnvio } from '@/nucleo/transporte';
import { formatearNumero } from '@/nucleo/numero';
import { AccionesGrafica } from './graficas';

// ───────────────────────────── Diagrama de actividades en nodos ─────────────────────────────

const ANCHO_NODO = 128;
const ALTO_NODO = 78;
const SEPARACION_X = 76;
const SEPARACION_Y = 26;

export type FaseAnimacion = 'ninguna' | 'adelante' | 'atras' | 'completa';

export function DiagramaCPM({
  resultado,
  fase = 'completa',
  indiceAnimacion = -1,
  destacar,
}: {
  resultado: ResultadoCPM;
  fase?: FaseAnimacion;
  /** Índice del orden topológico hasta el que se revela la animación. */
  indiceAnimacion?: number;
  /** Actividad a destacar (por ejemplo, la que el estudiante está retrasando). */
  destacar?: string | null;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);

  const disposicion = useMemo(() => {
    const porCapa = new Map<number, ActividadCalculada[]>();
    for (const c of resultado.calculadas) {
      const lista = porCapa.get(c.capa) ?? [];
      lista.push(c);
      porCapa.set(c.capa, lista);
    }

    const capas = [...porCapa.keys()].sort((a, b) => a - b);
    const alturaMaxima = Math.max(...[...porCapa.values()].map((l) => l.length), 1);

    const posiciones = new Map<string, { x: number; y: number }>();
    for (const capa of capas) {
      const lista = porCapa.get(capa) ?? [];
      const alturaCapa = lista.length * ALTO_NODO + (lista.length - 1) * SEPARACION_Y;
      const alturaTotal = alturaMaxima * ALTO_NODO + (alturaMaxima - 1) * SEPARACION_Y;
      const inicioY = (alturaTotal - alturaCapa) / 2;

      lista.forEach((c, i) => {
        posiciones.set(c.actividad.id, {
          x: 20 + capa * (ANCHO_NODO + SEPARACION_X),
          y: 34 + inicioY + i * (ALTO_NODO + SEPARACION_Y),
        });
      });
    }

    const ancho = 40 + (capas.length > 0 ? (Math.max(...capas) + 1) * (ANCHO_NODO + SEPARACION_X) : ANCHO_NODO);
    const alto = 74 + alturaMaxima * ALTO_NODO + (alturaMaxima - 1) * SEPARACION_Y;

    return { posiciones, ancho, alto };
  }, [resultado]);

  const visible = (c: ActividadCalculada): boolean => {
    if (fase === 'ninguna') return false;
    if (fase === 'completa') return true;
    const orden = resultado.orden.indexOf(c.actividad.id);
    if (fase === 'adelante') return orden <= indiceAnimacion;
    return resultado.orden.length - 1 - orden <= indiceAnimacion;
  };

  const { posiciones, ancho, alto } = disposicion;

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full"
          style={{ minWidth: Math.min(ancho, 900) }}
          role="img"
          aria-label={
            `Diagrama de red de ${resultado.calculadas.length} actividades. ` +
            `La duración del proyecto es ${formatearNumero(resultado.duracionProyecto, { decimales: 0 })} ${resultado.unidadTiempo}. ` +
            `Ruta crítica: ${resultado.rutasCriticas.map((r) => r.actividades.join('–')).join(' y ')}.`
          }
        >
          <defs>
            <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--borde-fuerte)" />
            </marker>
            <marker id="flecha-critica" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--avisar)" />
            </marker>
          </defs>

          {resultado.calculadas.flatMap((c, iActividad) =>
            c.sucesoras.map((idSucesora, iArco) => {
              const desde = posiciones.get(c.actividad.id);
              const hasta = posiciones.get(idSucesora);
              const sucesora = resultado.calculadas.find((x) => x.actividad.id === idSucesora);
              if (!desde || !hasta || !sucesora) return null;

              const critica = c.critica && sucesora.critica;
              const x1 = desde.x + ANCHO_NODO;
              const y1 = desde.y + ALTO_NODO / 2;
              const x2 = hasta.x;
              const y2 = hasta.y + ALTO_NODO / 2;
              const control = Math.max(24, (x2 - x1) / 2);

              return (
                <path
                  key={`${iActividad}-${iArco}`}
                  d={`M ${x1} ${y1} C ${x1 + control} ${y1}, ${x2 - control} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={critica ? 'var(--avisar)' : 'var(--borde-fuerte)'}
                  strokeWidth={critica ? 2.5 : 1.5}
                  markerEnd={critica ? 'url(#flecha-critica)' : 'url(#flecha)'}
                  opacity={visible(c) && visible(sucesora) ? 1 : 0.15}
                />
              );
            }),
          )}

          {/* Las claves de los nodos y los arcos van por posición y no por el
              identificador de la actividad: ese identificador lo escribe el
              usuario en la tabla del laboratorio y nada impide que ponga dos
              iguales. Con la clave repetida React puede omitir o duplicar nodos.
              La lista es derivada y nunca se reordena, así que la posición
              identifica bien. */}
          {resultado.calculadas.map((c, i) => {
            const pos = posiciones.get(c.actividad.id);
            if (!pos) return null;
            const mostrado = visible(c);
            const esDestacada = destacar === c.actividad.id;

            return (
              <g key={i} opacity={mostrado ? 1 : 0.2} transform={`translate(${pos.x} ${pos.y})`}>
                <rect
                  width={ANCHO_NODO}
                  height={ALTO_NODO}
                  rx={7}
                  fill={c.critica ? 'var(--avisar-suave)' : 'var(--superficie)'}
                  stroke={esDestacada ? 'var(--acento)' : c.critica ? 'var(--avisar)' : 'var(--borde-fuerte)'}
                  strokeWidth={esDestacada ? 3.5 : c.critica ? 2.5 : 1.5}
                  className={c.critica && fase === 'completa' ? undefined : undefined}
                />

                <line x1={0} x2={ANCHO_NODO} y1={22} y2={22} stroke="var(--borde)" strokeWidth={1} />
                <line x1={0} x2={ANCHO_NODO} y1={56} y2={56} stroke="var(--borde)" strokeWidth={1} />
                <line x1={ANCHO_NODO / 2} x2={ANCHO_NODO / 2} y1={0} y2={22} stroke="var(--borde)" strokeWidth={1} />
                <line x1={ANCHO_NODO / 2} x2={ANCHO_NODO / 2} y1={56} y2={ALTO_NODO} stroke="var(--borde)" strokeWidth={1} />

                <text x={ANCHO_NODO / 4} y={15} textAnchor="middle" fontSize={11} fontFamily="var(--font-dato)" fill="var(--tinta-media)">
                  {formatearNumero(c.it, { decimales: 0 })}
                </text>
                <text x={(ANCHO_NODO * 3) / 4} y={15} textAnchor="middle" fontSize={11} fontFamily="var(--font-dato)" fill="var(--tinta-media)">
                  {formatearNumero(c.tt, { decimales: 0 })}
                </text>

                <text x={10} y={41} fontSize={15} fontWeight={700} fill={c.critica ? 'var(--avisar)' : 'var(--tinta)'} fontFamily="var(--font-titulo)">
                  {c.actividad.id}
                </text>
                <text x={ANCHO_NODO - 10} y={41} textAnchor="end" fontSize={11} fontFamily="var(--font-dato)" fill="var(--tinta-media)">
                  d = {formatearNumero(c.actividad.duracion, { decimales: 0 })}
                </text>
                <text x={ANCHO_NODO / 2} y={41} textAnchor="middle" fontSize={10} fontFamily="var(--font-dato)" fill={c.critica ? 'var(--avisar)' : 'var(--tinta-tenue)'}>
                  H={formatearNumero(c.holguraTotal, { decimales: 0 })}
                </text>

                <text x={ANCHO_NODO / 4} y={71} textAnchor="middle" fontSize={11} fontFamily="var(--font-dato)" fill="var(--tinta-media)">
                  {formatearNumero(c.il, { decimales: 0 })}
                </text>
                <text x={(ANCHO_NODO * 3) / 4} y={71} textAnchor="middle" fontSize={11} fontFamily="var(--font-dato)" fill="var(--tinta-media)">
                  {formatearNumero(c.tl, { decimales: 0 })}
                </text>

                <title>
                  {c.actividad.id} — {c.actividad.descripcion}. Inicio temprano {formatearNumero(c.it, { decimales: 0 })}, terminación
                  temprana {formatearNumero(c.tt, { decimales: 0 })}, inicio tardío {formatearNumero(c.il, { decimales: 0 })}, terminación
                  tardía {formatearNumero(c.tl, { decimales: 0 })}, holgura total {formatearNumero(c.holguraTotal, { decimales: 0 })}.
                </title>
              </g>
            );
          })}

          <text x={20} y={20} fontSize={10} fill="var(--tinta-tenue)" className="etiqueta">
            IT · TT arriba — IL · TL abajo — H holgura
          </text>
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--avisar-suave)', border: '2px solid var(--avisar)' }} />
            <span style={{ color: 'var(--tinta-media)' }}>Actividad crítica</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm" style={{ background: 'var(--superficie)', border: '1.5px solid var(--borde-fuerte)' }} />
            <span style={{ color: 'var(--tinta-media)' }}>Con holgura</span>
          </span>
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="diagrama-red-cpm" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Controles de animación ─────────────────────────────

export function ControlesAnimacion({
  total,
  fase,
  indice,
  alCambiarFase,
  alCambiarIndice,
}: {
  total: number;
  fase: FaseAnimacion;
  indice: number;
  alCambiarFase: (f: FaseAnimacion) => void;
  alCambiarIndice: (i: number) => void;
}): ReactNode {
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    if (!reproduciendo) return;
    if (indice >= total - 1) {
      setReproduciendo(false);
      return;
    }
    const t = window.setTimeout(() => alCambiarIndice(indice + 1), 700);
    return () => window.clearTimeout(t);
  }, [reproduciendo, indice, total, alCambiarIndice]);

  const enMarcha = fase === 'adelante' || fase === 'atras';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`boton boton-pequeno ${fase === 'adelante' ? 'boton-primario' : 'boton-secundario'}`}
        onClick={() => {
          alCambiarFase('adelante');
          alCambiarIndice(0);
          setReproduciendo(false);
        }}
      >
        Recorrido hacia adelante
      </button>
      <button
        type="button"
        className={`boton boton-pequeno ${fase === 'atras' ? 'boton-primario' : 'boton-secundario'}`}
        onClick={() => {
          alCambiarFase('atras');
          alCambiarIndice(0);
          setReproduciendo(false);
        }}
      >
        Recorrido hacia atrás
      </button>
      <button
        type="button"
        className={`boton boton-pequeno ${fase === 'completa' ? 'boton-primario' : 'boton-secundario'}`}
        onClick={() => {
          alCambiarFase('completa');
          setReproduciendo(false);
        }}
      >
        Red completa
      </button>

      {enMarcha && (
        <>
          <button type="button" className="boton boton-suave boton-pequeno" onClick={() => alCambiarIndice(Math.max(0, indice - 1))} disabled={indice <= 0}>
            ←
          </button>
          <button
            type="button"
            className="boton boton-produccion boton-pequeno"
            onClick={() => setReproduciendo((v) => !v)}
            disabled={indice >= total - 1}
          >
            {reproduciendo ? 'Pausar' : 'Reproducir'}
          </button>
          <button
            type="button"
            className="boton boton-suave boton-pequeno"
            onClick={() => alCambiarIndice(Math.min(total - 1, indice + 1))}
            disabled={indice >= total - 1}
          >
            →
          </button>
          <span className="dato text-xs" style={{ color: 'var(--tinta-media)' }}>
            {Math.min(indice + 1, total)} / {total}
          </span>
        </>
      )}
    </div>
  );
}

// ───────────────────────────── Actividades en flechas ─────────────────────────────

export function DiagramaAOA({ red }: { red: RedAOA }): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);

  const disposicion = useMemo(() => {
    // Capa de cada evento: la mayor profundidad desde el evento inicial.
    const capa = new Map<number, number>();
    for (const e of red.eventos) capa.set(e, 0);

    for (let paso = 0; paso < red.eventos.length + 1; paso++) {
      for (const arco of red.arcos) {
        const propuesta = (capa.get(arco.desde) ?? 0) + 1;
        if (propuesta > (capa.get(arco.hasta) ?? 0)) capa.set(arco.hasta, propuesta);
      }
    }

    const porCapa = new Map<number, number[]>();
    for (const e of red.eventos) {
      const c = capa.get(e) ?? 0;
      porCapa.set(c, [...(porCapa.get(c) ?? []), e]);
    }

    const maxCapa = Math.max(0, ...capa.values());
    const maxAlto = Math.max(1, ...[...porCapa.values()].map((l) => l.length));
    const posiciones = new Map<number, { x: number; y: number }>();

    for (const [c, lista] of porCapa) {
      lista.forEach((e, i) => {
        posiciones.set(e, {
          x: 40 + c * 118,
          y: 40 + (i + (maxAlto - lista.length) / 2) * 84,
        });
      });
    }

    return { posiciones, ancho: 80 + (maxCapa + 1) * 118, alto: 80 + maxAlto * 84 };
  }, [red]);

  const { posiciones, ancho, alto } = disposicion;

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full"
          style={{ minWidth: Math.min(ancho, 900) }}
          role="img"
          aria-label={`Diagrama de actividades en flechas con ${red.eventos.length} eventos y ${red.cantidadFicticias} actividades ficticias.`}
        >
          <defs>
            <marker id="flecha-aoa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--borde-fuerte)" />
            </marker>
          </defs>

          {red.arcos.map((arco, i) => {
            const a = posiciones.get(arco.desde);
            const b = posiciones.get(arco.hasta);
            if (!a || !b) return null;

            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const largo = Math.hypot(dx, dy) || 1;
            const ux = dx / largo;
            const uy = dy / largo;
            const x1 = a.x + ux * 17;
            const y1 = a.y + uy * 17;
            const x2 = b.x - ux * 20;
            const y2 = b.y - uy * 20;

            return (
              <g key={`${arco.id}-${i}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={arco.ficticia ? 'var(--tinta-tenue)' : 'var(--acento)'}
                  strokeWidth={arco.ficticia ? 1.2 : 2}
                  strokeDasharray={arco.ficticia ? '5 4' : undefined}
                  markerEnd="url(#flecha-aoa)"
                />
                {!arco.ficticia && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={700}
                    fill="var(--acento)"
                    fontFamily="var(--font-dato)"
                  >
                    {arco.etiqueta}
                  </text>
                )}
              </g>
            );
          })}

          {red.eventos.map((e) => {
            const p = posiciones.get(e);
            if (!p) return null;
            return (
              <g key={e}>
                <circle cx={p.x} cy={p.y} r={17} fill="var(--superficie)" stroke="var(--borde-fuerte)" strokeWidth={2} />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--tinta)" fontFamily="var(--font-dato)">
                  {e + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span style={{ color: 'var(--tinta-media)' }}>
          Las líneas punteadas son actividades ficticias: no consumen tiempo, solo expresan una dependencia que de otro modo no
          se podría dibujar. Esta red necesitó {red.cantidadFicticias}.
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="diagrama-aoa" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Red de transporte ─────────────────────────────

export function RedTransporte({
  problema,
  rutas,
  unidadCantidad,
}: {
  problema: ProblemaBalanceado;
  rutas: readonly RutaEnvio[];
  unidadCantidad: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);

  const filas = Math.max(problema.origenes.length, problema.destinos.length);
  const alto = 70 + filas * 62;
  const ancho = 640;
  const xOrigen = 130;
  const xDestino = ancho - 130;

  const yDe = (indice: number, total: number): number => {
    const espacio = alto - 80;
    return 50 + (espacio * (indice + 0.5)) / total;
  };

  const maxCantidad = Math.max(1, ...rutas.map((r) => r.cantidad));

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[460px]"
          role="img"
          aria-label={`Red de envíos con ${problema.origenes.length} orígenes y ${problema.destinos.length} destinos, y ${rutas.length} rutas activas.`}
        >
          {rutas.map((r, i) => {
            const io = problema.origenes.indexOf(r.origen);
            const id = problema.destinos.indexOf(r.destino);
            if (io < 0 || id < 0) return null;

            const y1 = yDe(io, problema.origenes.length);
            const y2 = yDe(id, problema.destinos.length);
            const grosor = 1.5 + (r.cantidad / maxCantidad) * 7;

            return (
              <g key={i}>
                <path
                  d={`M ${xOrigen + 46} ${y1} C ${xOrigen + 140} ${y1}, ${xDestino - 140} ${y2}, ${xDestino - 46} ${y2}`}
                  fill="none"
                  stroke={r.ficticia ? 'var(--tinta-tenue)' : 'var(--acento)'}
                  strokeWidth={grosor}
                  strokeDasharray={r.ficticia ? '6 5' : undefined}
                  opacity={r.ficticia ? 0.55 : 0.65}
                  strokeLinecap="round"
                />
                <text
                  x={ancho / 2}
                  y={(y1 + y2) / 2 - 4 + (i % 2 === 0 ? -7 : 7)}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={700}
                  fill={r.ficticia ? 'var(--tinta-tenue)' : 'var(--acento)'}
                  fontFamily="var(--font-dato)"
                >
                  {formatearNumero(r.cantidad, { decimales: 0 })}
                </text>
              </g>
            );
          })}

          {problema.origenes.map((o, i) => {
            const y = yDe(i, problema.origenes.length);
            const ficticio = problema.origenFicticio && i === problema.origenes.length - 1;
            return (
              <g key={i}>
                <rect
                  x={xOrigen - 46}
                  y={y - 17}
                  width={92}
                  height={34}
                  rx={6}
                  fill={ficticio ? 'var(--superficie-2)' : 'var(--bien-suave)'}
                  stroke={ficticio ? 'var(--tinta-tenue)' : 'var(--bien)'}
                  strokeWidth={2}
                  strokeDasharray={ficticio ? '5 4' : undefined}
                />
                <text x={xOrigen} y={y - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--tinta)">
                  {o}
                </text>
                <text x={xOrigen} y={y + 11} textAnchor="middle" fontSize={9} fill="var(--tinta-media)" fontFamily="var(--font-dato)">
                  oferta {formatearNumero(problema.oferta[i] ?? 0, { decimales: 0 })}
                </text>
              </g>
            );
          })}

          {problema.destinos.map((d, j) => {
            const y = yDe(j, problema.destinos.length);
            const ficticio = problema.destinoFicticio && j === problema.destinos.length - 1;
            return (
              <g key={j}>
                <rect
                  x={xDestino - 46}
                  y={y - 17}
                  width={92}
                  height={34}
                  rx={6}
                  fill={ficticio ? 'var(--superficie-2)' : 'var(--acento-suave)'}
                  stroke={ficticio ? 'var(--tinta-tenue)' : 'var(--acento)'}
                  strokeWidth={2}
                  strokeDasharray={ficticio ? '5 4' : undefined}
                />
                <text x={xDestino} y={y - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--tinta)">
                  {d}
                </text>
                <text x={xDestino} y={y + 11} textAnchor="middle" fontSize={9} fill="var(--tinta-media)" fontFamily="var(--font-dato)">
                  demanda {formatearNumero(problema.demanda[j] ?? 0, { decimales: 0 })}
                </text>
              </g>
            );
          })}

          <text x={xOrigen} y={26} textAnchor="middle" fontSize={10} fill="var(--tinta-tenue)" className="etiqueta">
            Orígenes
          </text>
          <text x={xDestino} y={26} textAnchor="middle" fontSize={10} fill="var(--tinta-tenue)" className="etiqueta">
            Destinos
          </text>
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span style={{ color: 'var(--tinta-media)' }}>
          El grosor de cada trazo es proporcional a la cantidad enviada, en {unidadCantidad}. Las líneas punteadas
          corresponden al origen o destino ficticio.
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="red-de-envios" />
      </figcaption>
    </figure>
  );
}
