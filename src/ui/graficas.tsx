/**
 * Gráficas en SVG puro.
 *
 * Se dibujan a mano en lugar de usar una librería porque así se controla la
 * accesibilidad (cada gráfica tiene descripción textual), el comportamiento en
 * modo oscuro y la exportación a SVG o PNG sin dependencias.
 */

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { formatearNumero } from '@/nucleo/numero';
import type { PuntoGrafica } from '@/nucleo/equilibrio';
import type { PuntoCurva } from '@/nucleo/pert';
import { lineaIndiferencia, segmentosRestricciones, ventana, type ResultadoGrafico } from '@/nucleo/grafico';
import type { Punto } from '@/nucleo/tipos';

// ───────────────────────────── Exportación ─────────────────────────────

function svgSerializado(svg: SVGSVGElement): string {
  const copia = svg.cloneNode(true) as SVGSVGElement;
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Los colores vienen de variables CSS: hay que resolverlas para que el
  // archivo exportado se vea igual fuera de la aplicación.
  const estilos = getComputedStyle(document.documentElement);
  const resolver = (nodo: Element): void => {
    for (const atributo of ['fill', 'stroke', 'color']) {
      const valor = nodo.getAttribute(atributo);
      if (valor?.startsWith('var(')) {
        const nombre = valor.slice(4, -1).split(',')[0]!.trim();
        nodo.setAttribute(atributo, estilos.getPropertyValue(nombre).trim() || '#000');
      }
    }
    const estilo = nodo.getAttribute('style');
    if (estilo?.includes('var(')) {
      nodo.setAttribute(
        'style',
        estilo.replace(/var\((--[\w-]+)\)/g, (_, n: string) => estilos.getPropertyValue(n).trim() || '#000'),
      );
    }
    for (const hijo of Array.from(nodo.children)) resolver(hijo);
  };
  resolver(copia);

  const fondo = estilos.getPropertyValue('--superficie').trim() || '#ffffff';
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', fondo);
  copia.insertBefore(rect, copia.firstChild);

  return new XMLSerializer().serializeToString(copia);
}

function descargar(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportarSVG(svg: SVGSVGElement | null, nombre: string): void {
  if (svg === null) return;
  descargar(`${nombre}.svg`, new Blob([svgSerializado(svg)], { type: 'image/svg+xml;charset=utf-8' }));
}

export function exportarPNG(svg: SVGSVGElement | null, nombre: string, escala = 2): void {
  if (svg === null) return;
  const texto = svgSerializado(svg);
  const caja = svg.viewBox.baseVal;
  const ancho = (caja.width || svg.clientWidth || 800) * escala;
  const alto = (caja.height || svg.clientHeight || 500) * escala;

  const imagen = new Image();
  imagen.onload = () => {
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    if (ctx === null) return;
    ctx.drawImage(imagen, 0, 0, ancho, alto);
    lienzo.toBlob((blob) => {
      if (blob !== null) descargar(`${nombre}.png`, blob);
    }, 'image/png');
  };
  imagen.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(texto)))}`;
}

/** Barra de acciones de exportación, común a todas las gráficas y diagramas. */
export function AccionesGrafica({
  svgRef,
  nombre,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  nombre: string;
}): ReactNode {
  return (
    <div className="flex gap-2 ocultar-al-imprimir">
      <button type="button" className="boton boton-suave boton-pequeno" onClick={() => exportarSVG(svgRef.current, nombre)}>
        Exportar SVG
      </button>
      <button type="button" className="boton boton-suave boton-pequeno" onClick={() => exportarPNG(svgRef.current, nombre)}>
        Exportar PNG
      </button>
    </div>
  );
}

// ───────────────────────────── Ejes reutilizables ─────────────────────────────

interface Escala {
  readonly aX: (v: number) => number;
  readonly aY: (v: number) => number;
  readonly margen: { izq: number; der: number; arr: number; aba: number };
  readonly ancho: number;
  readonly alto: number;
}

function crearEscala(
  ancho: number,
  alto: number,
  dominioX: [number, number],
  dominioY: [number, number],
  margen = { izq: 62, der: 18, arr: 16, aba: 40 },
): Escala {
  const anchoUtil = ancho - margen.izq - margen.der;
  const altoUtil = alto - margen.arr - margen.aba;
  const [x0, x1] = dominioX;
  const [y0, y1] = dominioY;

  return {
    ancho,
    alto,
    margen,
    aX: (v) => margen.izq + (x1 === x0 ? 0 : ((v - x0) / (x1 - x0)) * anchoUtil),
    aY: (v) => margen.arr + altoUtil - (y1 === y0 ? 0 : ((v - y0) / (y1 - y0)) * altoUtil),
  };
}

function Rejilla({
  escala,
  ticksX,
  ticksY,
  etiquetaX,
  etiquetaY,
  formatoX = (v: number) => formatearNumero(v, { decimales: 0 }),
  formatoY = (v: number) => formatearNumero(v, { decimales: 0 }),
}: {
  escala: Escala;
  ticksX: readonly number[];
  ticksY: readonly number[];
  etiquetaX: string;
  etiquetaY: string;
  formatoX?: (v: number) => string;
  formatoY?: (v: number) => string;
}): ReactNode {
  const { margen, ancho, alto } = escala;

  return (
    <g aria-hidden="true">
      {ticksY.map((t) => (
        <g key={`y${t}`}>
          <line
            x1={margen.izq}
            x2={ancho - margen.der}
            y1={escala.aY(t)}
            y2={escala.aY(t)}
            stroke="var(--borde)"
            strokeWidth={1}
            strokeDasharray={t === 0 ? undefined : '2 4'}
          />
          <text
            x={margen.izq - 8}
            y={escala.aY(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="var(--tinta-tenue)"
            fontFamily="var(--font-dato)"
          >
            {formatoY(t)}
          </text>
        </g>
      ))}

      {ticksX.map((t) => (
        <g key={`x${t}`}>
          <line
            x1={escala.aX(t)}
            x2={escala.aX(t)}
            y1={margen.arr}
            y2={alto - margen.aba}
            stroke="var(--borde)"
            strokeWidth={1}
            strokeDasharray="2 4"
          />
          <text
            x={escala.aX(t)}
            y={alto - margen.aba + 15}
            textAnchor="middle"
            fontSize={10}
            fill="var(--tinta-tenue)"
            fontFamily="var(--font-dato)"
          >
            {formatoX(t)}
          </text>
        </g>
      ))}

      <line x1={margen.izq} x2={ancho - margen.der} y1={alto - margen.aba} y2={alto - margen.aba} stroke="var(--borde-fuerte)" strokeWidth={1.5} />
      <line x1={margen.izq} x2={margen.izq} y1={margen.arr} y2={alto - margen.aba} stroke="var(--borde-fuerte)" strokeWidth={1.5} />

      <text x={ancho - margen.der} y={alto - 6} textAnchor="end" fontSize={10} fill="var(--tinta-media)" className="etiqueta">
        {etiquetaX}
      </text>
      <text x={margen.izq} y={margen.arr - 4} textAnchor="start" fontSize={10} fill="var(--tinta-media)" className="etiqueta">
        {etiquetaY}
      </text>
    </g>
  );
}

function ticks(minimo: number, maximo: number, cantidad = 5): number[] {
  if (maximo <= minimo) return [minimo];
  const paso = (maximo - minimo) / cantidad;
  const magnitud = Math.pow(10, Math.floor(Math.log10(paso)));
  const bonito = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((m) => m >= paso) ?? magnitud * 10;
  const salida: number[] = [];
  for (let v = Math.ceil(minimo / bonito) * bonito; v <= maximo + 1e-9; v += bonito) salida.push(Number(v.toFixed(10)));
  return salida;
}

// ───────────────────────────── Gráfica de punto de equilibrio ─────────────────────────────

export function GraficaEquilibrio({
  serie,
  equilibrioX,
  capacidad,
  volumenEsperado,
  simbolo,
  unidadProducto,
}: {
  serie: readonly PuntoGrafica[];
  equilibrioX: number | null;
  capacidad: number | null;
  volumenEsperado: number | null;
  simbolo: string;
  unidadProducto: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 720;
  const alto = 420;

  const { escala, ticksX, ticksY } = useMemo(() => {
    const maxX = serie.at(-1)?.cantidad ?? 1;
    const maxY = Math.max(...serie.map((p) => Math.max(p.ingresos, p.costosTotales)), 1);
    const e = crearEscala(ancho, alto, [0, maxX], [0, maxY * 1.05]);
    return { escala: e, ticksX: ticks(0, maxX, 6), ticksY: ticks(0, maxY * 1.05, 5) };
  }, [serie]);

  if (serie.length < 2) return null;

  const camino = (obtener: (p: PuntoGrafica) => number): string =>
    serie.map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.aX(p.cantidad).toFixed(2)} ${escala.aY(obtener(p)).toFixed(2)}`).join(' ');

  const equilibrioY = equilibrioX === null ? null : serie[0]!.costosFijos + equilibrioX * ((serie.at(-1)!.costosVariables - serie[0]!.costosVariables) / (serie.at(-1)!.cantidad - serie[0]!.cantidad));

  // Zonas de pérdida y utilidad: polígonos entre ingresos y costos totales.
  const zona = (desde: number, hasta: number): string => {
    const dentro = serie.filter((p) => p.cantidad >= desde && p.cantidad <= hasta);
    if (dentro.length < 2) return '';
    const arriba = dentro.map((p) => `${escala.aX(p.cantidad).toFixed(2)} ${escala.aY(p.ingresos).toFixed(2)}`);
    const abajo = [...dentro].reverse().map((p) => `${escala.aX(p.cantidad).toFixed(2)} ${escala.aY(p.costosTotales).toFixed(2)}`);
    return `M ${arriba.join(' L ')} L ${abajo.join(' L ')} Z`;
  };

  const maxX = serie.at(-1)!.cantidad;

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={
            `Gráfica de punto de equilibrio. ` +
            (equilibrioX !== null
              ? `El equilibrio ocurre en ${formatearNumero(equilibrioX, { decimales: 0 })} ${unidadProducto}. `
              : 'No existe punto de equilibrio con estos datos. ') +
            'Por debajo de ese volumen la empresa opera en zona de pérdida y por encima en zona de utilidad.'
          }
        >
          <Rejilla
            escala={escala}
            ticksX={ticksX}
            ticksY={ticksY}
            etiquetaX={`Cantidad (${unidadProducto})`}
            etiquetaY={`Dinero (${simbolo})`}
            formatoY={(v) => (v >= 1000 ? `${formatearNumero(v / 1000, { decimales: 0 })} k` : formatearNumero(v, { decimales: 0 }))}
          />

          {equilibrioX !== null && equilibrioX > 0 && equilibrioX < maxX && (
            <>
              <path d={zona(0, equilibrioX)} fill="var(--mal)" opacity={0.13} />
              <path d={zona(equilibrioX, maxX)} fill="var(--bien)" opacity={0.15} />
            </>
          )}

          {capacidad !== null && capacidad <= maxX && (
            <g>
              <line
                x1={escala.aX(capacidad)}
                x2={escala.aX(capacidad)}
                y1={escala.margen.arr}
                y2={alto - escala.margen.aba}
                stroke="var(--tinta-tenue)"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text x={escala.aX(capacidad) - 5} y={escala.margen.arr + 12} textAnchor="end" fontSize={10} fill="var(--tinta-tenue)">
                capacidad
              </text>
            </g>
          )}

          {volumenEsperado !== null && volumenEsperado <= maxX && (
            <line
              x1={escala.aX(volumenEsperado)}
              x2={escala.aX(volumenEsperado)}
              y1={escala.margen.arr}
              y2={alto - escala.margen.aba}
              stroke="var(--acento)"
              strokeWidth={1.5}
              strokeDasharray="2 3"
            />
          )}

          <path d={camino((p) => p.costosFijos)} fill="none" stroke="var(--tinta-tenue)" strokeWidth={2} strokeDasharray="5 4" />
          <path d={camino((p) => p.costosVariables)} fill="none" stroke="var(--avisar)" strokeWidth={2} strokeDasharray="3 3" />
          <path d={camino((p) => p.costosTotales)} fill="none" stroke="var(--mal)" strokeWidth={2.5} />
          <path d={camino((p) => p.ingresos)} fill="none" stroke="var(--bien)" strokeWidth={2.5} />

          {equilibrioX !== null && equilibrioY !== null && equilibrioX > 0 && equilibrioX <= maxX && (
            <g>
              <circle cx={escala.aX(equilibrioX)} cy={escala.aY(equilibrioY)} r={6} fill="var(--superficie)" stroke="var(--acento)" strokeWidth={3} />
              <text
                x={escala.aX(equilibrioX) + 10}
                y={escala.aY(equilibrioY) - 10}
                fontSize={11}
                fontWeight={700}
                fill="var(--acento)"
                fontFamily="var(--font-dato)"
              >
                {formatearNumero(equilibrioX, { decimales: 0 })} {unidadProducto}
              </text>
            </g>
          )}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-[0.75rem]">
          <Leyenda color="var(--bien)" texto="Ingresos totales" />
          <Leyenda color="var(--mal)" texto="Costos totales" />
          <Leyenda color="var(--avisar)" texto="Costos variables" discontinua />
          <Leyenda color="var(--tinta-tenue)" texto="Costos fijos" discontinua />
          {volumenEsperado !== null && <Leyenda color="var(--acento)" texto="Volumen esperado" discontinua />}
        </div>
        <AccionesGrafica svgRef={svgRef} nombre="punto-de-equilibrio" />
      </figcaption>
    </figure>
  );
}

function Leyenda({ color, texto, discontinua = false }: { color: string; texto: string; discontinua?: boolean }): ReactNode {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="inline-block h-0.5 w-5 rounded-full"
        style={{ background: discontinua ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 7px)` : color }}
      />
      <span style={{ color: 'var(--tinta-media)' }}>{texto}</span>
    </span>
  );
}

// ───────────────────────────── Curva normal ─────────────────────────────

export function CurvaNormal({
  serie,
  media,
  desviacion,
  plazo,
  probabilidad,
  unidadTiempo,
}: {
  serie: readonly PuntoCurva[];
  media: number;
  desviacion: number;
  plazo: number;
  probabilidad: number;
  unidadTiempo: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 720;
  const alto = 320;

  const escala = useMemo(() => {
    if (serie.length === 0) return null;
    const minX = serie[0]!.t;
    const maxX = serie.at(-1)!.t;
    const maxY = Math.max(...serie.map((p) => p.densidad));
    return crearEscala(ancho, alto, [minX, maxX], [0, maxY * 1.12], { izq: 30, der: 18, arr: 26, aba: 40 });
  }, [serie]);

  if (escala === null || serie.length < 2) return null;

  const camino = serie
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.aX(p.t).toFixed(2)} ${escala.aY(p.densidad).toFixed(2)}`)
    .join(' ');

  const dentro = serie.filter((p) => p.dentroDelArea);
  const area =
    dentro.length < 2
      ? ''
      : `M ${escala.aX(dentro[0]!.t).toFixed(2)} ${escala.aY(0).toFixed(2)} ` +
        dentro.map((p) => `L ${escala.aX(p.t).toFixed(2)} ${escala.aY(p.densidad).toFixed(2)}`).join(' ') +
        ` L ${escala.aX(dentro.at(-1)!.t).toFixed(2)} ${escala.aY(0).toFixed(2)} Z`;

  const marcas = [-2, -1, 0, 1, 2].map((z) => media + z * desviacion);

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[480px]"
          role="img"
          aria-label={
            `Curva normal de la duración del proyecto, con media ${formatearNumero(media, { decimales: 2 })} y desviación estándar ` +
            `${formatearNumero(desviacion, { decimales: 2 })} ${unidadTiempo}. El área sombreada representa ` +
            `${formatearNumero(probabilidad * 100, { decimales: 1 })} % de probabilidad.`
          }
        >
          <path d={area} fill="var(--acento)" opacity={0.25} />
          <path d={camino} fill="none" stroke="var(--acento)" strokeWidth={2.5} />

          <line
            x1={escala.margen.izq}
            x2={ancho - escala.margen.der}
            y1={escala.aY(0)}
            y2={escala.aY(0)}
            stroke="var(--borde-fuerte)"
            strokeWidth={1.5}
          />

          {marcas.map((t, i) => (
            <g key={i}>
              <line x1={escala.aX(t)} x2={escala.aX(t)} y1={escala.aY(0)} y2={escala.aY(0) + 5} stroke="var(--borde-fuerte)" />
              <text x={escala.aX(t)} y={escala.aY(0) + 18} textAnchor="middle" fontSize={10} fill="var(--tinta-tenue)" fontFamily="var(--font-dato)">
                {formatearNumero(t, { decimales: 1 })}
              </text>
            </g>
          ))}

          <g>
            <line
              x1={escala.aX(media)}
              x2={escala.aX(media)}
              y1={escala.margen.arr}
              y2={escala.aY(0)}
              stroke="var(--tinta-tenue)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <text x={escala.aX(media)} y={escala.margen.arr - 8} textAnchor="middle" fontSize={10} fill="var(--tinta-media)">
              μ
            </text>
          </g>

          <g>
            <line
              x1={escala.aX(plazo)}
              x2={escala.aX(plazo)}
              y1={escala.margen.arr}
              y2={escala.aY(0)}
              stroke="var(--avisar)"
              strokeWidth={2.5}
            />
            <text
              x={escala.aX(plazo)}
              y={escala.margen.arr - 8}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="var(--avisar)"
              fontFamily="var(--font-dato)"
            >
              T = {formatearNumero(plazo, { decimales: 1 })}
            </text>
          </g>

          <text
            x={escala.aX(dentro.length > 0 ? (dentro[0]!.t + dentro.at(-1)!.t) / 2 : media)}
            y={escala.aY(0) - 30}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill="var(--acento)"
            fontFamily="var(--font-dato)"
          >
            {formatearNumero(probabilidad * 100, { decimales: 1 })} %
          </text>

          <text x={ancho - escala.margen.der} y={alto - 6} textAnchor="end" fontSize={10} fill="var(--tinta-media)" className="etiqueta">
            Duración ({unidadTiempo})
          </text>
        </svg>
      </div>

      <figcaption className="flex justify-end">
        <AccionesGrafica svgRef={svgRef} nombre="curva-normal-pert" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Mapa cartesiano de localización ─────────────────────────────

export interface MarcaMapa {
  readonly id: string;
  readonly nombre: string;
  readonly punto: Punto;
  readonly carga?: number;
  readonly tipo: 'demanda' | 'candidato' | 'centro';
}

export function MapaLocalizacion({
  marcas,
  alMoverCandidato,
  tipoDistancia,
  mostrarConexiones = true,
  candidatoActivo,
}: {
  marcas: readonly MarcaMapa[];
  alMoverCandidato?: (id: string, punto: Punto) => void;
  tipoDistancia: 'rectilinea' | 'euclidiana';
  mostrarConexiones?: boolean;
  candidatoActivo?: string | null;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const ancho = 640;
  const alto = 460;

  const { escala, rangoX, rangoY } = useMemo(() => {
    const xs = marcas.map((m) => m.punto.x);
    const ys = marcas.map((m) => m.punto.y);
    const minX = Math.floor(Math.min(0, ...xs));
    const maxX = Math.ceil(Math.max(10, ...xs)) + 1;
    const minY = Math.floor(Math.min(0, ...ys));
    const maxY = Math.ceil(Math.max(10, ...ys)) + 1;
    return {
      escala: crearEscala(ancho, alto, [minX, maxX], [minY, maxY], { izq: 40, der: 20, arr: 20, aba: 36 }),
      rangoX: [minX, maxX] as const,
      rangoY: [minY, maxY] as const,
    };
  }, [marcas]);

  const cargaMaxima = Math.max(1, ...marcas.filter((m) => m.tipo === 'demanda').map((m) => m.carga ?? 0));
  const activo = candidatoActivo ?? marcas.find((m) => m.tipo === 'candidato')?.id ?? null;
  const marcaActiva = marcas.find((m) => m.id === activo);

  const desdePixeles = (evento: React.PointerEvent): Punto | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const caja = svg.getBoundingClientRect();
    const px = ((evento.clientX - caja.left) / caja.width) * ancho;
    const py = ((evento.clientY - caja.top) / caja.height) * alto;
    const anchoUtil = ancho - escala.margen.izq - escala.margen.der;
    const altoUtil = alto - escala.margen.arr - escala.margen.aba;
    const x = rangoX[0] + ((px - escala.margen.izq) / anchoUtil) * (rangoX[1] - rangoX[0]);
    const y = rangoY[0] + ((alto - escala.margen.aba - py) / altoUtil) * (rangoY[1] - rangoY[0]);
    return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
  };

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[420px] touch-none"
          role="img"
          aria-label={`Mapa cartesiano con ${marcas.filter((m) => m.tipo === 'demanda').length} puntos de demanda y ${marcas.filter((m) => m.tipo === 'candidato').length} localizaciones candidatas.`}
          onPointerMove={(e) => {
            if (arrastrando === null || alMoverCandidato === undefined) return;
            const p = desdePixeles(e);
            if (p !== null) alMoverCandidato(arrastrando, p);
          }}
          onPointerUp={() => setArrastrando(null)}
          onPointerLeave={() => setArrastrando(null)}
        >
          <Rejilla
            escala={escala}
            ticksX={ticks(rangoX[0], rangoX[1], 8)}
            ticksY={ticks(rangoY[0], rangoY[1], 6)}
            etiquetaX="x"
            etiquetaY="y"
          />

          {mostrarConexiones &&
            marcaActiva !== undefined &&
            marcas
              .filter((m) => m.tipo === 'demanda')
              .map((m) => {
                const grosor = 1 + ((m.carga ?? 0) / cargaMaxima) * 3.5;
                if (tipoDistancia === 'rectilinea') {
                  const d = `M ${escala.aX(m.punto.x)} ${escala.aY(m.punto.y)} L ${escala.aX(marcaActiva.punto.x)} ${escala.aY(m.punto.y)} L ${escala.aX(marcaActiva.punto.x)} ${escala.aY(marcaActiva.punto.y)}`;
                  return <path key={m.id} d={d} fill="none" stroke="var(--acento)" strokeWidth={grosor} opacity={0.3} strokeLinejoin="round" />;
                }
                return (
                  <line
                    key={m.id}
                    x1={escala.aX(m.punto.x)}
                    y1={escala.aY(m.punto.y)}
                    x2={escala.aX(marcaActiva.punto.x)}
                    y2={escala.aY(marcaActiva.punto.y)}
                    stroke="var(--acento)"
                    strokeWidth={grosor}
                    opacity={0.3}
                  />
                );
              })}

          {marcas.map((m) => {
            const cx = escala.aX(m.punto.x);
            const cy = escala.aY(m.punto.y);

            if (m.tipo === 'demanda') {
              const r = 5 + ((m.carga ?? 0) / cargaMaxima) * 12;
              return (
                <g key={m.id}>
                  <circle cx={cx} cy={cy} r={r} fill="var(--bien)" opacity={0.28} />
                  <circle cx={cx} cy={cy} r={4} fill="var(--bien)" />
                  <text x={cx} y={cy - r - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--tinta)">
                    {m.nombre}
                  </text>
                  {m.carga !== undefined && (
                    <text x={cx} y={cy + r + 12} textAnchor="middle" fontSize={9} fill="var(--tinta-tenue)" fontFamily="var(--font-dato)">
                      {formatearNumero(m.carga, { decimales: 0 })}
                    </text>
                  )}
                </g>
              );
            }

            if (m.tipo === 'centro') {
              return (
                <g key={m.id}>
                  <path
                    d={`M ${cx - 9} ${cy} L ${cx} ${cy - 9} L ${cx + 9} ${cy} L ${cx} ${cy + 9} Z`}
                    fill="var(--avisar)"
                    stroke="var(--superficie)"
                    strokeWidth={2}
                  />
                  <text x={cx} y={cy - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--avisar)">
                    {m.nombre}
                  </text>
                </g>
              );
            }

            const esActivo = m.id === activo;
            return (
              <g
                key={m.id}
                style={{ cursor: alMoverCandidato ? 'grab' : 'default' }}
                onPointerDown={(e) => {
                  if (alMoverCandidato === undefined) return;
                  e.preventDefault();
                  setArrastrando(m.id);
                }}
              >
                <rect
                  x={cx - 9}
                  y={cy - 9}
                  width={18}
                  height={18}
                  rx={3}
                  fill={esActivo ? 'var(--acento)' : 'var(--superficie)'}
                  stroke="var(--acento)"
                  strokeWidth={2.5}
                />
                <text x={cx} y={cy - 15} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--acento)">
                  {m.nombre}
                </text>
                <text x={cx} y={cy + 24} textAnchor="middle" fontSize={9} fill="var(--tinta-tenue)" fontFamily="var(--font-dato)">
                  ({formatearNumero(m.punto.x, { decimales: 1 })}; {formatearNumero(m.punto.y, { decimales: 1 })})
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span style={{ color: 'var(--tinta-media)' }}>
          {alMoverCandidato !== undefined
            ? 'Arrastre las localizaciones candidatas para ver cómo cambia el puntaje carga-distancia.'
            : 'El tamaño de cada círculo es proporcional a su carga.'}
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="mapa-localizacion" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Región factible de programación lineal ─────────────────────────────

const COLORES_RESTRICCION = [
  'var(--color-primario)',
  'var(--color-produccion)',
  'var(--color-critico)',
  '#7a3f6d',
  '#2c6e8f',
  '#8a5a2b',
  '#3f6b3a',
  '#8f3a3a',
];

export function GraficaProgramacionLineal({
  resultado,
  zIndiferencia,
  mostrarIndiferencia,
}: {
  resultado: ResultadoGrafico;
  /** Valor de Z de la línea de indiferencia que se está mostrando. */
  zIndiferencia: number;
  mostrarIndiferencia: boolean;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 660;
  const alto = 500;

  const d = resultado.datos;
  const { maxX, maxY } = useMemo(() => ventana(resultado), [resultado]);

  const escala = useMemo(
    () => crearEscala(ancho, alto, [0, maxX], [0, maxY], { izq: 62, der: 100, arr: 20, aba: 46 }),
    [maxX, maxY],
  );

  const activas = useMemo(
    () => resultado.holguras.filter((h) => h.activa).map((h) => h.restriccion.id),
    [resultado.holguras],
  );

  const segmentos = useMemo(
    () => segmentosRestricciones(d, maxX, maxY, activas),
    [d, maxX, maxY, activas],
  );

  const iso = useMemo(
    () => (mostrarIndiferencia ? lineaIndiferencia(d, zIndiferencia, maxX, maxY) : null),
    [d, zIndiferencia, mostrarIndiferencia, maxX, maxY],
  );

  const poligono =
    resultado.poligono.length < 3
      ? ''
      : resultado.poligono.map((p) => `${escala.aX(p.x).toFixed(2)},${escala.aY(p.y).toFixed(2)}`).join(' ');

  const descripcion =
    `Región factible del problema con ${d.restricciones.length} restricciones. ` +
    (resultado.desenlace === 'infactible'
      ? 'La región está vacía: el problema es infactible.'
      : resultado.desenlace === 'no_acotada'
        ? 'La región no está acotada en la dirección que mejora el objetivo.'
        : `El óptimo está en (${formatearNumero(resultado.optimo?.punto.x ?? 0, { decimales: 2 })}; ${formatearNumero(resultado.optimo?.punto.y ?? 0, { decimales: 2 })}) con Z = ${formatearNumero(resultado.valorOptimo ?? 0, { decimales: 2 })}.`);

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg ref={svgRef} viewBox={`0 0 ${ancho} ${alto}`} className="h-auto w-full min-w-[480px]" role="img" aria-label={descripcion}>
          <defs>
            <marker id="flecha-crecimiento" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--mal)" />
            </marker>
          </defs>

          <Rejilla
            escala={escala}
            ticksX={ticks(0, maxX, 6)}
            ticksY={ticks(0, maxY, 6)}
            etiquetaX={d.nombreX}
            etiquetaY={d.nombreY}
            formatoX={(v) => formatearNumero(v, { decimales: maxX < 20 ? 1 : 0 })}
            formatoY={(v) => formatearNumero(v, { decimales: maxY < 20 ? 1 : 0 })}
          />

          {poligono !== '' && (
            <polygon points={poligono} fill="var(--color-produccion)" fillOpacity={0.16} stroke="var(--color-produccion)" strokeWidth={2} />
          )}

          {segmentos.map((s, i) => {
            const color = COLORES_RESTRICCION[i % COLORES_RESTRICCION.length]!;
            return (
              <g key={s.id}>
                <line
                  x1={escala.aX(s.desde.x)}
                  y1={escala.aY(s.desde.y)}
                  x2={escala.aX(s.hasta.x)}
                  y2={escala.aY(s.hasta.y)}
                  stroke={color}
                  strokeWidth={s.activa ? 3.5 : 2}
                  strokeDasharray={s.relacion === '>=' ? '7 4' : undefined}
                />
                <text
                  x={Math.min(ancho - escala.margen.der + 6, escala.aX(s.hasta.x) + 6)}
                  y={escala.aY(s.hasta.y) + 4}
                  fontSize={10}
                  fontWeight={s.activa ? 700 : 400}
                  fill={color}
                >
                  {s.nombre}
                  {s.activa ? ' ●' : ''}
                </text>
              </g>
            );
          })}

          {iso !== null && (
            <g>
              <line
                x1={escala.aX(iso[0].x)}
                y1={escala.aY(iso[0].y)}
                x2={escala.aX(iso[1].x)}
                y2={escala.aY(iso[1].y)}
                stroke="var(--tinta)"
                strokeWidth={2.5}
                strokeDasharray="9 5"
              />
              <text
                x={escala.aX((iso[0].x + iso[1].x) / 2)}
                y={escala.aY((iso[0].y + iso[1].y) / 2) - 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight={700}
                fill="var(--tinta)"
                fontFamily="var(--font-dato)"
              >
                Z = {formatearNumero(zIndiferencia, { decimales: 2 })}
              </text>
            </g>
          )}

          {resultado.direccionNoAcotada !== null && (
            <g>
              <line
                x1={escala.aX(maxX * 0.45)}
                y1={escala.aY(maxY * 0.45)}
                x2={escala.aX(maxX * 0.45 + resultado.direccionNoAcotada.x * maxX * 0.3)}
                y2={escala.aY(maxY * 0.45 + resultado.direccionNoAcotada.y * maxY * 0.3)}
                stroke="var(--mal)"
                strokeWidth={3}
                markerEnd="url(#flecha-crecimiento)"
              />
              <text x={escala.aX(maxX * 0.45)} y={escala.aY(maxY * 0.45) - 10} fontSize={11} fontWeight={700} fill="var(--mal)">
                crece sin límite
              </text>
            </g>
          )}

          {resultado.vertices.map((v, i) => (
            <g key={i}>
              <circle
                cx={escala.aX(v.punto.x)}
                cy={escala.aY(v.punto.y)}
                r={v.optimo ? 7 : 4.5}
                fill={v.optimo ? 'var(--color-critico)' : 'var(--superficie)'}
                stroke={v.optimo ? 'var(--color-critico)' : 'var(--color-produccion)'}
                strokeWidth={v.optimo ? 3 : 2}
              />
              <text
                x={escala.aX(v.punto.x) + (v.punto.x > maxX * 0.75 ? -10 : 10)}
                y={escala.aY(v.punto.y) - 9}
                textAnchor={v.punto.x > maxX * 0.75 ? 'end' : 'start'}
                fontSize={10}
                fontWeight={v.optimo ? 700 : 400}
                fill={v.optimo ? 'var(--color-critico)' : 'var(--tinta-media)'}
                fontFamily="var(--font-dato)"
              >
                {String.fromCharCode(65 + i)} ({formatearNumero(v.punto.x, { decimales: 2 })}; {formatearNumero(v.punto.y, { decimales: 2 })})
              </text>
            </g>
          ))}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-[0.75rem]">
        <span className="flex flex-wrap gap-3">
          <Leyenda color="var(--color-produccion)" texto="Región factible" />
          <Leyenda color="var(--color-critico)" texto="Vértice óptimo" />
          {mostrarIndiferencia && <Leyenda color="var(--tinta)" texto="Línea de indiferencia" discontinua />}
          <span style={{ color: 'var(--tinta-tenue)' }}>Las restricciones ≥ se dibujan punteadas; las activas, más gruesas.</span>
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="region-factible" />
      </figcaption>
    </figure>
  );
}

// ───────────────────────────── Barras comparativas ─────────────────────────────

export function BarrasComparativas({
  datos,
  etiquetaValor,
  formato = (v: number) => formatearNumero(v, { decimales: 2 }),
  descripcion,
  resaltarMinimo = false,
}: {
  datos: readonly { nombre: string; valor: number; nota?: string }[];
  etiquetaValor: string;
  formato?: (v: number) => string;
  descripcion: string;
  resaltarMinimo?: boolean;
}): ReactNode {
  if (datos.length === 0) return null;
  const maximo = Math.max(...datos.map((d) => Math.abs(d.valor)), 1e-9);
  const extremo = resaltarMinimo
    ? datos.reduce((a, b) => (b.valor < a.valor ? b : a))
    : datos.reduce((a, b) => (b.valor > a.valor ? b : a));

  return (
    <div className="flex flex-col gap-2.5" role="img" aria-label={descripcion}>
      <p className="etiqueta">{etiquetaValor}</p>
      {datos.map((d, i) => {
        const destacado = d.nombre === extremo.nombre;
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[0.8125rem]">{d.nombre}</span>
              <span className="dato shrink-0 text-[0.8125rem] font-semibold" style={{ color: destacado ? 'var(--bien)' : 'var(--tinta)' }}>
                {formato(d.valor)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--superficie-3)' }}>
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${(Math.abs(d.valor) / maximo) * 100}%`,
                  background: destacado ? 'var(--bien)' : 'var(--acento)',
                }}
              />
            </div>
            {d.nota !== undefined && (
              <span className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                {d.nota}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Costo contra duración del proyecto en la compresión.
 *
 * El eje X va de la duración mínima a la normal, de izquierda a derecha, que es
 * como se lee el problema: se arranca de la derecha y se comprime hacia la
 * izquierda. Las tres curvas —directo, indirecto y total— cuentan el argumento
 * completo: una sube, la otra baja, y la suma tiene un fondo.
 */
export function GraficaCrashing({
  curva,
  optima,
  unidadTiempo,
  simbolo,
}: {
  curva: readonly { readonly duracion: number; readonly directo: number; readonly indirecto: number; readonly total: number }[];
  optima: number;
  unidadTiempo: string;
  simbolo: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 720;
  const alto = 400;

  const puntos = useMemo(() => [...curva].sort((a, b) => a.duracion - b.duracion), [curva]);

  const { escala, ticksX, ticksY } = useMemo(() => {
    const minX = puntos[0]?.duracion ?? 0;
    const maxX = puntos.at(-1)?.duracion ?? 1;
    const maxY = Math.max(...puntos.map((p) => p.total), 1);
    return {
      escala: crearEscala(ancho, alto, [minX, maxX], [0, maxY * 1.08]),
      ticksX: puntos.map((p) => p.duracion),
      ticksY: ticks(0, maxY * 1.08, 5),
    };
  }, [puntos]);

  if (puntos.length < 2) return null;

  const camino = (obtener: (p: (typeof puntos)[number]) => number): string =>
    puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.aX(p.duracion).toFixed(2)} ${escala.aY(obtener(p)).toFixed(2)}`).join(' ');

  const mejor = puntos.find((p) => p.duracion === optima);

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={
            `Costo del proyecto según su duración, de ${formatearNumero(puntos[0]!.duracion, { decimales: 0 })} a ` +
            `${formatearNumero(puntos.at(-1)!.duracion, { decimales: 0 })} ${unidadTiempo}. ` +
            `El costo total mínimo se alcanza en ${formatearNumero(optima, { decimales: 0 })} ${unidadTiempo}.`
          }
        >
          <Rejilla
            escala={escala}
            ticksX={ticksX}
            ticksY={ticksY}
            etiquetaX={`Duración del proyecto (${unidadTiempo})`}
            etiquetaY={`Costo (${simbolo})`}
            formatoY={(v) => (v >= 1000 ? `${formatearNumero(v / 1000, { decimales: 0 })} k` : formatearNumero(v, { decimales: 0 }))}
          />

          {mejor !== undefined && (
            <line
              x1={escala.aX(mejor.duracion)}
              y1={escala.margen.arr}
              x2={escala.aX(mejor.duracion)}
              y2={escala.alto - escala.margen.aba}
              stroke="var(--bien)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}

          <path d={camino((p) => p.directo)} fill="none" stroke="var(--mal)" strokeWidth={2} />
          <path d={camino((p) => p.indirecto)} fill="none" stroke="var(--tinta-tenue)" strokeWidth={2} />
          <path d={camino((p) => p.total)} fill="none" stroke="var(--acento)" strokeWidth={3} />

          {puntos.map((p) => (
            <circle
              key={p.duracion}
              cx={escala.aX(p.duracion)}
              cy={escala.aY(p.total)}
              r={p.duracion === optima ? 6 : 3.5}
              fill={p.duracion === optima ? 'var(--bien)' : 'var(--acento)'}
            />
          ))}

          {mejor !== undefined && (
            <text
              x={escala.aX(mejor.duracion)}
              y={escala.aY(mejor.total) - 14}
              textAnchor="middle"
              fontSize={12}
              fontWeight={700}
              fill="var(--bien)"
            >
              {simbolo} {formatearNumero(mejor.total, { decimales: 0 })}
            </text>
          )}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--tinta-media)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--mal)' }} /> Costo directo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--tinta-tenue)' }} /> Costo indirecto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--acento)' }} /> Costo total
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="costo-contra-duracion" />
      </figcaption>
    </figure>
  );
}

/**
 * Costo de inventario contra tamaño del lote.
 *
 * Las tres curvas cuentan el argumento completo: ordenar cae como 1/Q,
 * conservar sube como Q, y el total tiene su mínimo donde se cruzan. La forma
 * plana alrededor del mínimo es lo que hay que mirar, así que la gráfica marca
 * el óptimo y, si el estudiante eligió otra cantidad, también esa.
 */
export function GraficaInventario({
  serie,
  optimo,
  propia,
  simbolo,
  unidadProducto,
}: {
  serie: readonly { readonly cantidad: number; readonly ordenar: number; readonly conservar: number; readonly total: number }[];
  optimo: number;
  propia: number | null;
  simbolo: string;
  unidadProducto: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 720;
  const alto = 400;

  const { escala, ticksX, ticksY } = useMemo(() => {
    const maxX = serie.at(-1)?.cantidad ?? 1;
    const minX = serie[0]?.cantidad ?? 0;
    const maxY = Math.max(...serie.map((p) => p.total), 1);
    return {
      escala: crearEscala(ancho, alto, [minX, maxX], [0, maxY * 1.08]),
      ticksX: ticks(minX, maxX, 6),
      ticksY: ticks(0, maxY * 1.08, 5),
    };
  }, [serie]);

  if (serie.length < 2) return null;

  const camino = (obtener: (p: (typeof serie)[number]) => number): string =>
    serie.map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.aX(p.cantidad).toFixed(2)} ${escala.aY(obtener(p)).toFixed(2)}`).join(' ');

  const enX = (q: number): (typeof serie)[number] | undefined =>
    serie.reduce<(typeof serie)[number] | undefined>(
      (mejor, p) => (mejor === undefined || Math.abs(p.cantidad - q) < Math.abs(mejor.cantidad - q) ? p : mejor),
      undefined,
    );

  const puntoOptimo = enX(optimo);
  const puntoPropio = propia === null ? undefined : enX(propia);

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={
            `Costo anual de inventario según el tamaño del lote. El mínimo se alcanza en ` +
            `${formatearNumero(optimo)} ${unidadProducto}. El costo de ordenar disminuye al aumentar el lote y el de ` +
            'conservación aumenta; la curva del total es muy plana cerca del mínimo.'
          }
        >
          <Rejilla
            escala={escala}
            ticksX={ticksX}
            ticksY={ticksY}
            etiquetaX={`Tamaño del lote (${unidadProducto})`}
            etiquetaY={`Costo anual (${simbolo})`}
            formatoY={(v) => (v >= 1000 ? `${formatearNumero(v / 1000, { decimales: 0 })} k` : formatearNumero(v, { decimales: 0 }))}
          />

          {puntoOptimo !== undefined && (
            <line
              x1={escala.aX(puntoOptimo.cantidad)}
              y1={escala.margen.arr}
              x2={escala.aX(puntoOptimo.cantidad)}
              y2={escala.alto - escala.margen.aba}
              stroke="var(--bien)"
              strokeWidth={2}
              strokeDasharray="5 4"
            />
          )}

          {puntoPropio !== undefined && Math.abs(puntoPropio.cantidad - optimo) > 1e-6 && (
            <line
              x1={escala.aX(puntoPropio.cantidad)}
              y1={escala.margen.arr}
              x2={escala.aX(puntoPropio.cantidad)}
              y2={escala.alto - escala.margen.aba}
              stroke="var(--acento)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
          )}

          <path d={camino((p) => p.ordenar)} fill="none" stroke="var(--tinta-tenue)" strokeWidth={2} />
          <path d={camino((p) => p.conservar)} fill="none" stroke="var(--mal)" strokeWidth={2} />
          <path d={camino((p) => p.total)} fill="none" stroke="var(--acento)" strokeWidth={3} />

          {puntoOptimo !== undefined && (
            <>
              <circle cx={escala.aX(puntoOptimo.cantidad)} cy={escala.aY(puntoOptimo.total)} r={6} fill="var(--bien)" />
              <text
                x={escala.aX(puntoOptimo.cantidad)}
                y={escala.aY(puntoOptimo.total) - 14}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--bien)"
              >
                {formatearNumero(optimo, { decimales: 0 })} {unidadProducto}
              </text>
            </>
          )}

          {puntoPropio !== undefined && (
            <circle cx={escala.aX(puntoPropio.cantidad)} cy={escala.aY(puntoPropio.total)} r={5} fill="var(--acento)" />
          )}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--tinta-media)' }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--tinta-tenue)' }} /> Costo de ordenar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--mal)' }} /> Costo de conservar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5" style={{ background: 'var(--acento)' }} /> Costo total
        </span>
        <AccionesGrafica svgRef={svgRef} nombre="costo-de-inventario" />
      </figcaption>
    </figure>
  );
}

/**
 * Espera contra utilización.
 *
 * La gráfica que explica el módulo de líneas de espera: la asíntota en ρ = 1
 * muestra que apretar la capacidad para no tener servidores ociosos es
 * exactamente lo que produce las colas largas.
 */
export function GraficaEspera({
  curva,
  utilizacionActual,
  unidadTiempo,
}: {
  curva: readonly { readonly utilizacion: number; readonly tiempoCola: number }[];
  utilizacionActual: number;
  unidadTiempo: string;
}): ReactNode {
  const svgRef = useRef<SVGSVGElement>(null);
  const ancho = 720;
  const alto = 380;

  // El techo se recorta al triple de la espera actual: sin eso la asíntota
  // aplasta toda la curva contra el eje y no se ve nada.
  const actual = curva.reduce<{ utilizacion: number; tiempoCola: number } | undefined>(
    (mejor, p) => (mejor === undefined || Math.abs(p.utilizacion - utilizacionActual) < Math.abs(mejor.utilizacion - utilizacionActual) ? p : mejor),
    undefined,
  );
  const techo = Math.max((actual?.tiempoCola ?? 1) * 3, 0.001);

  const { escala, ticksY } = useMemo(
    () => ({
      escala: crearEscala(ancho, alto, [0, 1], [0, techo]),
      ticksY: ticks(0, techo, 5),
    }),
    [techo],
  );

  const visibles = curva.filter((p) => p.tiempoCola <= techo);
  if (visibles.length < 2) return null;

  const camino = visibles
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${escala.aX(p.utilizacion).toFixed(2)} ${escala.aY(p.tiempoCola).toFixed(2)}`)
    .join(' ');

  return (
    <figure className="flex flex-col gap-2">
      <div className="contenedor-tabla overflow-x-auto p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto w-full min-w-[520px]"
          role="img"
          aria-label={
            'Tiempo de espera según la utilización del sistema. La curva crece despacio hasta cerca del 80 % y se ' +
            `dispara al acercarse al 100 %. El punto actual está en ${formatearNumero(utilizacionActual * 100, { decimales: 1 })} %.`
          }
        >
          <Rejilla
            escala={escala}
            ticksX={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            ticksY={ticksY}
            etiquetaX="Utilización del sistema"
            etiquetaY={`Espera (${unidadTiempo})`}
            formatoX={(v) => `${formatearNumero(v * 100, { decimales: 0 })} %`}
            // Las esperas suelen ser fracciones de la unidad de tiempo: con cero
            // decimales el eje entero sale en ceros y no dice nada.
            formatoY={(v) => formatearNumero(v, { decimales: techo < 1 ? 3 : techo < 10 ? 2 : 0 })}
          />

          {/* Zona de saturación: por encima del 85 % la espera ya no perdona. */}
          <rect
            x={escala.aX(0.85)}
            y={escala.margen.arr}
            width={escala.aX(1) - escala.aX(0.85)}
            height={escala.alto - escala.margen.aba - escala.margen.arr}
            fill="var(--mal)"
            opacity={0.08}
          />

          <path d={camino} fill="none" stroke="var(--acento)" strokeWidth={3} />

          {actual !== undefined && actual.tiempoCola <= techo && (
            <>
              <line
                x1={escala.aX(actual.utilizacion)}
                y1={escala.margen.arr}
                x2={escala.aX(actual.utilizacion)}
                y2={escala.alto - escala.margen.aba}
                stroke="var(--bien)"
                strokeWidth={2}
                strokeDasharray="5 4"
              />
              <circle cx={escala.aX(actual.utilizacion)} cy={escala.aY(actual.tiempoCola)} r={6} fill="var(--bien)" />
              <text
                x={escala.aX(actual.utilizacion)}
                y={escala.aY(actual.tiempoCola) - 14}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--bien)"
              >
                {formatearNumero(utilizacionActual * 100, { decimales: 0 })} %
              </text>
            </>
          )}
        </svg>
      </div>

      <figcaption className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--tinta-media)' }}>
        <span>La franja roja marca la zona por encima del 85 % de utilización, donde la espera deja de perdonar.</span>
        <AccionesGrafica svgRef={svgRef} nombre="espera-contra-utilizacion" />
      </figcaption>
    </figure>
  );
}
