/**
 * Componentes base del sistema visual.
 *
 * Todos son accesibles por teclado, no dependen de ninguna librería de UI y
 * toman sus colores de los tokens definidos en `estilos/index.css`, de modo que
 * el modo claro y el oscuro funcionan sin código adicional.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import katex from 'katex';
import { IDENTIDAD, autorConGrado, ubicacionCompleta } from '@/config/identidad';
import type { Inconsistencia, Origen } from '@/esquemas';
import type { Diagnostico, Gravedad } from '@/nucleo/tipos';
import { formatearNumero } from '@/nucleo/numero';

// ───────────────────────────── Fórmulas ─────────────────────────────

export function Formula({ tex, bloque = false }: { tex: string; bloque?: boolean }): ReactNode {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, { displayMode: bloque, throwOnError: false, output: 'html' });
    } catch {
      return `<code>${tex}</code>`;
    }
  }, [tex, bloque]);

  return (
    <span
      className={bloque ? 'block overflow-x-auto' : 'inline-block'}
      // KaTeX produce marcado propio; el contenido viene de constantes del
      // motor, nunca de datos escritos por el usuario.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ───────────────────────────── Distintivos ─────────────────────────────

export type TonoDistintivo = 'neutro' | 'acento' | 'bien' | 'avisar' | 'mal';

export function Distintivo({
  children,
  tono = 'neutro',
  titulo,
}: {
  children: ReactNode;
  tono?: TonoDistintivo;
  titulo?: string;
}): ReactNode {
  return (
    <span className={`distintivo distintivo-${tono}`} title={titulo}>
      {children}
    </span>
  );
}

/**
 * Distintivos de auditoría de un ejercicio.
 *
 * Una inconsistencia ya decidida no es lo mismo que una pendiente: en la
 * decidida el dato que se muestra es el que el docente eligió, no uno en
 * disputa. Pintar las dos con la misma alarma roja haría que la etiqueta dejara
 * de significar nada, y como ya no queda ninguna pendiente, todas serían rojas.
 *
 * El registro de inconsistencias llega por parámetro: este componente solo
 * presenta, y `ui/` no lee del almacén.
 */
export function DistintivosAuditoria({
  ids,
  inconsistencias,
}: {
  /** Identificadores que el ejercicio declara, por ejemplo `['I-03']`. */
  ids: readonly string[];
  /** El registro completo, de donde se lee si cada una está decidida. */
  inconsistencias: readonly Inconsistencia[];
}): ReactNode {
  if (ids.length === 0) return null;

  const registros = ids.map((id) => inconsistencias.find((i) => i.id === id)).filter((i) => i !== undefined);
  const pendientes = registros.filter((i) => i.decision === null);
  const decididas = registros.filter((i) => i.decision !== null);

  return (
    <>
      {pendientes.length > 0 && (
        <Distintivo
          tono="mal"
          titulo={`El material tiene una discrepancia que aún espera la decisión del docente: ${pendientes.map((i) => i.titulo).join('; ')}`}
        >
          Auditoría: {pendientes.map((i) => i.id).join(', ')}
        </Distintivo>
      )}
      {decididas.length > 0 && (
        <Distintivo
          tono="neutro"
          titulo={`Discrepancia del material ya resuelta por el docente: ${decididas.map((i) => i.titulo).join('; ')}`}
        >
          Auditoría resuelta: {decididas.map((i) => i.id).join(', ')}
        </Distintivo>
      )}
    </>
  );
}

/**
 * Crédito de autoría al final de un ejercicio o de una pantalla.
 *
 * El matiz que resuelve: **no todos los ejercicios los escribió el autor**. Los
 * `textual` son transcripción de sus materiales; los `derivado` se construyeron
 * sobre su marco teórico; los `generado` los produce el generador. Poner
 * «Autor: Fulano» en los tres por igual sería atribuirle cosas que no escribió,
 * justo en una aplicación cuyo compromiso es no inventar autorías.
 *
 * Así que el crédito del curso es siempre suyo —lo es— y la segunda línea dice
 * qué es este ejercicio en concreto.
 */
export function CreditoAutor({ origen }: { origen?: Origen }): ReactNode {
  const procedencia: Record<Origen, string> = {
    textual: 'Ejercicio transcrito de los materiales del curso.',
    derivado: 'Ejercicio construido sobre el marco teórico del curso.',
    generado: 'Ejercicio producido por el generador a partir de ese marco.',
    docente: 'Ejercicio creado por el docente dentro de la aplicación.',
  };

  return (
    <footer className="tarjeta-plana flex flex-col gap-1 p-3 text-xs" style={{ color: 'var(--tinta-media)' }}>
      <p className="etiqueta">Créditos</p>
      <p>
        <strong>{IDENTIDAD.curso.nombre}</strong> · {autorConGrado()}
      </p>
      <p>
        {IDENTIDAD.institucion.nombre} ({IDENTIDAD.institucion.siglas}) · {ubicacionCompleta()}
      </p>
      {origen !== undefined && <p style={{ color: 'var(--tinta-tenue)' }}>{procedencia[origen]}</p>}
      {IDENTIDAD.autor.orcid !== null && (
        <p style={{ color: 'var(--tinta-tenue)' }}>ORCID: {IDENTIDAD.autor.orcid}</p>
      )}
    </footer>
  );
}

// ───────────────────────────── Avisos del motor ─────────────────────────────

const CLASE_POR_GRAVEDAD: Record<Gravedad, string> = {
  error: 'aviso-mal',
  aviso: 'aviso-avisar',
  nota: 'aviso-nota',
};

const ICONO_POR_GRAVEDAD: Record<Gravedad, string> = {
  error: '!',
  aviso: '!',
  nota: 'i',
};

export function ListaDiagnosticos({
  diagnosticos,
  titulo,
}: {
  diagnosticos: readonly Diagnostico[];
  titulo?: string;
}): ReactNode {
  if (diagnosticos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {titulo !== undefined && <p className="etiqueta">{titulo}</p>}
      {diagnosticos.map((d, i) => (
        <div key={`${d.codigo}-${i}`} className={`aviso ${CLASE_POR_GRAVEDAD[d.gravedad]}`} role={d.gravedad === 'error' ? 'alert' : 'status'}>
          <span
            aria-hidden="true"
            className="dato mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: 'currentColor', color: 'var(--superficie)' }}
          >
            {ICONO_POR_GRAVEDAD[d.gravedad]}
          </span>
          {/* El mensaje admite negritas: varios diagnósticos destacan con ellas
              la conclusión —«no existe ningún punto factible»— dentro de una
              explicación larga. */}
          <span>
            <span className="sr-only">
              {d.gravedad === 'error' ? 'Error: ' : d.gravedad === 'aviso' ? 'Advertencia: ' : 'Nota: '}
            </span>
            <ConNegritas texto={d.mensaje} />
          </span>
        </div>
      ))}
    </div>
  );
}

// ───────────────────────────── Contenedores ─────────────────────────────

export function Tarjeta({
  titulo,
  descripcion,
  acciones,
  children,
  plana = false,
  className = '',
}: {
  titulo?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode;
  plana?: boolean;
  className?: string;
}): ReactNode {
  return (
    <section className={`${plana ? 'tarjeta-plana' : 'tarjeta'} p-4 ${className}`}>
      {(titulo !== undefined || acciones !== undefined) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {titulo !== undefined && <h3>{titulo}</h3>}
            {descripcion !== undefined && (
              <p className="mt-1 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                {descripcion}
              </p>
            )}
          </div>
          {acciones !== undefined && <div className="flex min-w-0 flex-wrap gap-2">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Seccion({
  titulo,
  eyebrow,
  descripcion,
  acciones,
  children,
}: {
  titulo: ReactNode;
  eyebrow?: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
  children?: ReactNode;
}): ReactNode {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow !== undefined && <p className="etiqueta mb-1">{eyebrow}</p>}
          <h2>{titulo}</h2>
          {descripcion !== undefined && (
            <p className="prosa mt-1.5" style={{ color: 'var(--tinta-media)' }}>
              {descripcion}
            </p>
          )}
        </div>
        {acciones !== undefined && <div className="flex min-w-0 flex-wrap gap-2">{acciones}</div>}
      </header>
      {children}
    </section>
  );
}

// ───────────────────────────── Campos ─────────────────────────────

export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  marcador,
  deshabilitado = false,
  tipo = 'text',
  multilinea = false,
  filas = 4,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  ayuda?: string;
  marcador?: string;
  deshabilitado?: boolean;
  tipo?: 'text' | 'password';
  multilinea?: boolean;
  filas?: number;
}): ReactNode {
  const id = useId();
  const comunes = {
    id,
    className: 'campo',
    value: valor,
    placeholder: marcador,
    disabled: deshabilitado,
    'aria-describedby': ayuda !== undefined ? `${id}-ayuda` : undefined,
  };
  // La etiqueta va como hermana del control, no envolviéndolo: si el control
  // queda dentro del <label>, su nombre accesible se contamina con el propio
  // contenido del control y los lectores de pantalla lo anuncian mal.
  return (
    <div className="flex flex-col gap-1">
      <label className="etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {multilinea ? (
        <textarea {...comunes} rows={filas} onChange={(e) => alCambiar(e.target.value)} />
      ) : (
        <input {...comunes} type={tipo} onChange={(e) => alCambiar(e.target.value)} />
      )}
      {ayuda !== undefined && (
        <span id={`${id}-ayuda`} className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          {ayuda}
        </span>
      )}
    </div>
  );
}

export function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
  unidad,
  ayuda,
  minimo,
  maximo,
  paso = 'any',
  deshabilitado = false,
  invalido = false,
}: {
  etiqueta: string;
  valor: number | null;
  alCambiar: (v: number | null) => void;
  unidad?: string;
  ayuda?: string;
  minimo?: number;
  maximo?: number;
  paso?: number | 'any';
  deshabilitado?: boolean;
  invalido?: boolean;
}): ReactNode {
  const id = useId();
  const [texto, setTexto] = useState(valor === null ? '' : String(valor));
  const ultimoExterno = useRef(valor);

  useEffect(() => {
    if (ultimoExterno.current !== valor) {
      ultimoExterno.current = valor;
      setTexto(valor === null ? '' : String(valor));
    }
  }, [valor]);

  return (
    <div className="flex flex-col gap-1">
      <label className="etiqueta" htmlFor={id}>
        {etiqueta}
        {unidad !== undefined && <span className="ml-1 normal-case opacity-70">({unidad})</span>}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        className={`campo campo-numero ${invalido ? 'campo-error' : ''}`}
        value={texto}
        min={minimo}
        max={maximo}
        step={paso}
        disabled={deshabilitado}
        aria-invalid={invalido}
        aria-describedby={ayuda !== undefined ? `${id}-ayuda` : undefined}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          if (t.trim() === '') {
            ultimoExterno.current = null;
            alCambiar(null);
            return;
          }
          const n = Number(t.replace(',', '.'));
          if (Number.isFinite(n)) {
            ultimoExterno.current = n;
            alCambiar(n);
          }
        }}
      />
      {ayuda !== undefined && (
        <span id={`${id}-ayuda`} className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          {ayuda}
        </span>
      )}
    </div>
  );
}

export function Selector<T extends string>({
  etiqueta,
  valor,
  opciones,
  alCambiar,
  ayuda,
  deshabilitado = false,
}: {
  etiqueta: string;
  valor: T;
  opciones: readonly { valor: T; texto: string }[];
  alCambiar: (v: T) => void;
  ayuda?: string;
  deshabilitado?: boolean;
}): ReactNode {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label className="etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className="campo"
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => alCambiar(e.target.value as T)}
        aria-describedby={ayuda !== undefined ? `${id}-ayuda` : undefined}
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {ayuda !== undefined && (
        <span id={`${id}-ayuda`} className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          {ayuda}
        </span>
      )}
    </div>
  );
}

export function Interruptor({
  etiqueta,
  activo,
  alCambiar,
  ayuda,
  deshabilitado = false,
}: {
  etiqueta: string;
  activo: boolean;
  alCambiar: (v: boolean) => void;
  ayuda?: string;
  deshabilitado?: boolean;
}): ReactNode {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      {/* El nombre se ata con `aria-labelledby` y no solo con el `for` de la
          etiqueta: un `<button>` es un elemento etiquetable en HTML, pero los
          lectores de pantalla no anuncian esa asociación de forma consistente y
          el interruptor quedaba sin nombre. */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={activo}
        aria-labelledby={`${id}-etiqueta`}
        disabled={deshabilitado}
        onClick={() => alCambiar(!activo)}
        className="mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:opacity-40"
        style={{ background: activo ? 'var(--acento)' : 'var(--borde-fuerte)' }}
      >
        <span
          className="h-4 w-4 rounded-full transition-transform"
          style={{ background: 'var(--superficie)', transform: activo ? 'translateX(1rem)' : 'none' }}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer text-[0.8125rem] leading-tight">
        <span id={`${id}-etiqueta`} className="font-bold">
          {etiqueta}
        </span>
        {ayuda !== undefined && (
          <span className="mt-0.5 block text-xs font-normal" style={{ color: 'var(--tinta-tenue)' }}>
            {ayuda}
          </span>
        )}
      </label>
    </div>
  );
}

export function Deslizador({
  etiqueta,
  valor,
  minimo,
  maximo,
  paso,
  alCambiar,
  formatear,
  unidad,
}: {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  paso: number;
  alCambiar: (v: number) => void;
  formatear?: (v: number) => string;
  unidad?: string;
}): ReactNode {
  const id = useId();
  const mostrar = formatear ? formatear(valor) : formatearNumero(valor, { decimales: paso < 1 ? 2 : 0 });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="etiqueta">
          {etiqueta}
        </label>
        <span className="dato text-[0.8125rem] font-semibold">
          {mostrar}
          {unidad !== undefined && <span className="ml-1 opacity-70">{unidad}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={paso}
        value={valor}
        onChange={(e) => alCambiar(Number(e.target.value))}
        className="w-full accent-[var(--acento)]"
      />
    </div>
  );
}

// ───────────────────────────── Pestañas ─────────────────────────────

export function Pestanas<T extends string>({
  valor,
  opciones,
  alCambiar,
  etiquetaGrupo,
}: {
  valor: T;
  opciones: readonly { valor: T; texto: string; distintivo?: ReactNode }[];
  alCambiar: (v: T) => void;
  etiquetaGrupo: string;
}): ReactNode {
  return (
    <div
      role="tablist"
      aria-label={etiquetaGrupo}
      className="flex flex-wrap gap-1 overflow-x-auto rounded-lg p-1"
      style={{ background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={o.valor}
            role="tab"
            type="button"
            aria-selected={activo}
            onClick={() => alCambiar(o.valor)}
            className="boton boton-pequeno whitespace-nowrap"
            style={
              activo
                ? { background: 'var(--acento)', color: 'var(--acento-contraste)' }
                : { background: 'transparent', color: 'var(--tinta-media)' }
            }
          >
            {o.texto}
            {o.distintivo}
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────── Indicadores ─────────────────────────────

export function Indicador({
  etiqueta,
  valor,
  unidad,
  tono = 'neutro',
  nota,
}: {
  etiqueta: string;
  valor: ReactNode;
  unidad?: string;
  tono?: TonoDistintivo;
  nota?: ReactNode;
}): ReactNode {
  const color =
    tono === 'bien' ? 'var(--bien)' : tono === 'avisar' ? 'var(--avisar)' : tono === 'mal' ? 'var(--mal)' : tono === 'acento' ? 'var(--acento)' : 'var(--tinta)';

  return (
    <div
      className="franja flex flex-col gap-0.5 rounded-lg py-2 pr-3"
      style={{ color, background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}
    >
      <span className="etiqueta">{etiqueta}</span>
      <span className="dato text-xl font-semibold leading-tight" style={{ color }}>
        {valor}
        {unidad !== undefined && (
          <span className="ml-1 text-xs font-normal" style={{ color: 'var(--tinta-tenue)' }}>
            {unidad}
          </span>
        )}
      </span>
      {nota !== undefined && (
        <span className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          {nota}
        </span>
      )}
    </div>
  );
}

export function BarraProgreso({
  valor,
  etiqueta,
  mostrarValor = true,
}: {
  valor: number;
  etiqueta: string;
  mostrarValor?: boolean;
}): ReactNode {
  const acotado = Math.max(0, Math.min(100, valor));
  const color = acotado >= 70 ? 'var(--bien)' : acotado >= 40 ? 'var(--avisar)' : 'var(--borde-fuerte)';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[0.8125rem]">{etiqueta}</span>
        {mostrarValor && (
          <span className="dato text-xs font-semibold" style={{ color }}>
            {Math.round(acotado)} %
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(acotado)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={etiqueta}
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--superficie-3)' }}
      >
        <div className="h-full rounded-full transition-[width]" style={{ width: `${acotado}%`, background: color }} />
      </div>
    </div>
  );
}

// ───────────────────────────── Estados vacíos ─────────────────────────────

export function Vacio({ titulo, descripcion, accion }: { titulo: string; descripcion: string; accion?: ReactNode }): ReactNode {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-lg px-6 py-10 text-center"
      style={{ background: 'var(--superficie-2)', border: '1px dashed var(--borde-fuerte)' }}
    >
      <h4>{titulo}</h4>
      <p className="max-w-md text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
        {descripcion}
      </p>
      {accion !== undefined && <div className="mt-1">{accion}</div>}
    </div>
  );
}

// ───────────────────────────── Detalle plegable ─────────────────────────────

export function Plegable({
  titulo,
  children,
  abiertoInicial = false,
  distintivo,
}: {
  titulo: ReactNode;
  children: ReactNode;
  abiertoInicial?: boolean;
  distintivo?: ReactNode;
}): ReactNode {
  return (
    <details className="tarjeta-plana overflow-hidden" open={abiertoInicial}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[0.8125rem] font-bold select-none">
        <span className="flex items-center gap-2">
          {titulo}
          {distintivo}
        </span>
        <span aria-hidden="true" style={{ color: 'var(--tinta-tenue)' }}>
          ▾
        </span>
      </summary>
      <div className="border-t px-3 py-3" style={{ borderColor: 'var(--borde)' }}>
        {children}
      </div>
    </details>
  );
}

// ───────────────────────────── Diálogo ─────────────────────────────

export function Dialogo({
  abierto,
  titulo,
  children,
  alCerrar,
  acciones,
  ancho = 'max-w-lg',
}: {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  alCerrar: () => void;
  acciones?: ReactNode;
  ancho?: string;
}): ReactNode {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') alCerrar();
    };
    document.addEventListener('keydown', alPresionar);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', alPresionar);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  return (
    // El fondo cierra al pulsarlo, que es comodidad de ratón y no la única vía:
    // con teclado se cierra con Escape (el efecto de arriba) o con el botón
    // «Cerrar» de la cabecera. Ponerle un manejador de teclado a un fondo no
    // enfocable no añadiría nada; darle rol de botón sería mentir sobre lo que es.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(0 0 0 / 0.45)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) alCerrar();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`tarjeta aparece flex max-h-[85vh] w-full flex-col ${ancho}`}
        style={{ boxShadow: 'var(--sombra-elevada)' }}
      >
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--borde)' }}>
          <h3>{titulo}</h3>
          <button type="button" className="boton boton-suave boton-pequeno" onClick={alCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-auto px-4 py-4">{children}</div>
        {acciones !== undefined && (
          <footer className="flex flex-wrap justify-end gap-2 border-t px-4 py-3" style={{ borderColor: 'var(--borde)' }}>
            {acciones}
          </footer>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Texto con formato ligero ─────────────────────────────

/**
 * Convierte el marcado ligero de los enunciados (negritas, citas y saltos de
 * párrafo) en elementos reales. No admite HTML: el texto viene de datos y se
 * escapa por construcción, porque React solo inserta cadenas.
 */
export function TextoFormateado({ texto, className = '' }: { texto: string; className?: string }): ReactNode {
  const bloques = texto.split('\n\n').filter((b) => b.trim() !== '');

  return (
    <div className={`prosa ${className}`}>
      {bloques.map((bloque, i) => {
        if (bloque.startsWith('> ')) {
          return (
            <blockquote key={i}>
              <ConNegritas texto={bloque.replace(/^> ?/gm, '')} />
            </blockquote>
          );
        }
        if (/^\d+\.\s/m.test(bloque) && bloque.split('\n').length > 1) {
          return (
            <ol key={i} className="mt-2 ml-5 list-decimal space-y-1">
              {bloque.split('\n').map((linea, j) => (
                <li key={j}>
                  <ConNegritas texto={linea.replace(/^\d+\.\s*/, '')} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className={i > 0 ? 'mt-2.5' : ''}>
            <ConNegritas texto={bloque} />
          </p>
        );
      })}
    </div>
  );
}

function ConNegritas({ texto }: { texto: string }): ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {partes.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
