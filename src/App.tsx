/**
 * Armazón de la aplicación: navegación, cambio de modo y despacho de pantallas.
 */

import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { IDENTIDAD, ubicacionCompleta } from '@/config/identidad';
import { NOMBRE_TEMA, NUMERO_MODULO, TEMAS, type Tema } from '@/esquemas';
import { inconsistenciasPendientes, perfilActual, progresoGeneral, usarTienda, type Modo } from '@/almacen/tienda';
import { bandejaDeRevision } from '@/nucleo/revision';
import { enlaces, irA, usarRuta } from '@/rutas';
import { Distintivo } from '@/ui/base';

import { PaginaInicio } from '@/paginas/Inicio';

// Las pantallas pesadas se cargan bajo demanda: el paquete inicial baja de
// 1,1 MB a una fracción, y en una conexión lenta la portada aparece antes.
// Una vez instalada la PWA, todos los fragmentos quedan precargados y
// disponibles sin conexión.
const PanelEstudiante = lazy(() => import('@/paginas/PanelEstudiante').then((m) => ({ default: m.PanelEstudiante })));
const PanelDocente = lazy(() => import('@/paginas/PanelDocente').then((m) => ({ default: m.PanelDocente })));
const CatalogoModulos = lazy(() => import('@/paginas/CatalogoModulos').then((m) => ({ default: m.CatalogoModulos })));
const PaginaModulo = lazy(() => import('@/paginas/Modulo').then((m) => ({ default: m.PaginaModulo })));
const PaginaLaboratorio = lazy(() => import('@/paginas/Laboratorio').then((m) => ({ default: m.PaginaLaboratorio })));
const BibliotecaEjercicios = lazy(() => import('@/paginas/Biblioteca').then((m) => ({ default: m.BibliotecaEjercicios })));
const PaginaEjercicio = lazy(() => import('@/paginas/Ejercicio').then((m) => ({ default: m.PaginaEjercicio })));
const PaginaGenerador = lazy(() => import('@/paginas/Generador').then((m) => ({ default: m.PaginaGenerador })));
const PaginaEvaluacion = lazy(() => import('@/paginas/EvaluacionPagina').then((m) => ({ default: m.PaginaEvaluacion })));
const PaginaHistorial = lazy(() => import('@/paginas/Historial').then((m) => ({ default: m.PaginaHistorial })));
const PaginaProgreso = lazy(() => import('@/paginas/Progreso').then((m) => ({ default: m.PaginaProgreso })));
const PaginaAuditoria = lazy(() => import('@/paginas/Auditoria').then((m) => ({ default: m.PaginaAuditoria })));
const PaginaRevision = lazy(() => import('@/paginas/Revision').then((m) => ({ default: m.PaginaRevision })));
const CentroReportes = lazy(() => import('@/paginas/Reportes').then((m) => ({ default: m.CentroReportes })));
const PaginaConfiguracion = lazy(() => import('@/paginas/Configuracion').then((m) => ({ default: m.PaginaConfiguracion })));
const PaginaCreditos = lazy(() => import('@/paginas/Creditos').then((m) => ({ default: m.PaginaCreditos })));
const PaginaAyuda = lazy(() => import('@/paginas/Ayuda').then((m) => ({ default: m.PaginaAyuda })));

const MODOS: readonly { valor: Modo; texto: string; ayuda: string }[] = [
  { valor: 'estudiante', texto: 'Estudiante', ayuda: 'Estudiar, practicar con pistas y generar informes' },
  { valor: 'docente', texto: 'Docente', ayuda: 'Crear ejercicios, revisar auditoría y exportar resultados' },
  { valor: 'proyeccion', texto: 'Proyección', ayuda: 'Tipografía grande y avance paso a paso para explicar en clase' },
  { valor: 'evaluacion', texto: 'Evaluación', ayuda: 'Sin pistas ni soluciones, con registro de tiempo' },
];

export function App(): ReactNode {
  const tienda = usarTienda();
  const ruta = usarRuta();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    void tienda.iniciar();
  }, [tienda]);

  // El tema y el modo se reflejan en el elemento raíz: el CSS hace el resto.
  useEffect(() => {
    const raiz = document.documentElement;
    const tema = tienda.configuracion.tema;
    if (tema === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.setAttribute('data-tema', tema);
    raiz.setAttribute('data-modo', tienda.configuracion.modo);
    raiz.setAttribute('data-animaciones', tienda.configuracion.animacionesReducidas ? 'reducidas' : 'normales');
  }, [tienda.configuracion.tema, tienda.configuracion.modo, tienda.configuracion.animacionesReducidas]);

  useEffect(() => {
    setMenuAbierto(false);
  }, [ruta]);

  useEffect(() => {
    if (tienda.mensajeGlobal === null) return;
    const t = window.setTimeout(() => tienda.limpiarAviso(), 6000);
    return () => window.clearTimeout(t);
  }, [tienda.mensajeGlobal, tienda]);

  const modo = tienda.configuracion.modo;
  const enProyeccion = modo === 'proyeccion';
  const pendientes = inconsistenciasPendientes(tienda).length;
  const porRevisar = bandejaDeRevision(tienda.intentos, tienda.ejercicios).filter((x) => x.respuesta.revision === null).length;
  const perfil = perfilActual(tienda);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--fondo)' }}>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:px-3 focus:py-2"
        style={{ background: 'var(--acento)', color: 'var(--acento-contraste)' }}
      >
        Saltar al contenido
      </a>

      <BarraSuperior
        modo={modo}
        alCambiarModo={(m) => tienda.fijarModo(m)}
        temaVisual={tienda.configuracion.tema}
        alCambiarTema={(t) => tienda.fijarConfiguracion({ tema: t })}
        nombrePerfil={perfil?.nombre ?? null}
        alAlternarMenu={() => setMenuAbierto((v) => !v)}
        menuAbierto={menuAbierto}
      />

      {tienda.mensajeGlobal !== null && (
        <div className="px-4 pt-3 ocultar-al-imprimir">
          <div className={`aviso aviso-${tienda.mensajeGlobal.tono === 'bien' ? 'bien' : tienda.mensajeGlobal.tono === 'avisar' ? 'avisar' : 'mal'}`} role="status">
            <span>{tienda.mensajeGlobal.texto}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-start">
        {!enProyeccion && (
          <NavegacionLateral
            rutaActual={`#/${window.location.hash.replace(/^#\/?/, '')}`}
            modo={modo}
            pendientesAuditoria={pendientes}
            pendientesRevision={porRevisar}
            progreso={progresoGeneral(tienda)}
            abierta={menuAbierto}
          />
        )}

        <main id="contenido" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8" tabIndex={-1}>
          <div className="mx-auto w-full" style={{ maxWidth: enProyeccion ? '72rem' : '76rem' }}>
            {!tienda.listo ? (
              <p className="etiqueta">Cargando datos locales…</p>
            ) : (
              <Suspense fallback={<p className="etiqueta">Cargando pantalla…</p>}>
                <Pantalla nombre={ruta.nombre} parametro={ruta.parametro} />
              </Suspense>
            )}
          </div>
        </main>
      </div>

      <PieDePagina />
    </div>
  );
}

function Pantalla({ nombre, parametro }: { nombre: ReturnType<typeof usarRuta>['nombre']; parametro: string | null }): ReactNode {
  const esTema = (v: string | null): v is Tema => v !== null && (TEMAS as readonly string[]).includes(v);

  switch (nombre) {
    case 'inicio': return <PaginaInicio />;
    case 'estudiante': return <PanelEstudiante />;
    case 'docente': return <PanelDocente />;
    case 'modulos': return <CatalogoModulos />;
    // Los `key` de estas tres son funcionales, no decorativos. Sin ellos React
    // reutiliza la misma página al cambiar de parámetro y se queda con el estado
    // del anterior, que se sembró de datos que ya no corresponden:
    //
    // - `modulo` conservaba la etapa pedagógica, dejando al estudiante en
    //   «Interpretar» de un módulo que no ha explorado.
    // - `laboratorio` conservaba el ejercicio elegido; como no existe en el tema
    //   nuevo, caía al primero de la lista en vez de al ejemplo resuelto que
    //   designa el módulo. La misma dirección mostraba un ejercicio distinto
    //   según de dónde se llegara.
    // - `ejercicio` conservaba respuestas y marcas. Limpiarlas desde un efecto no
    //   basta: los efectos corren después de pintar, así que se veía un fotograma
    //   del ejercicio nuevo con las marcas del anterior —los identificadores de
    //   pregunta se repiten entre ejercicios—.
    case 'modulo': return esTema(parametro) ? <PaginaModulo key={parametro} tema={parametro} /> : <CatalogoModulos />;
    case 'laboratorio': return esTema(parametro) ? <PaginaLaboratorio key={parametro} tema={parametro} /> : <CatalogoModulos />;
    case 'biblioteca': return <BibliotecaEjercicios />;
    case 'ejercicio': return parametro !== null ? <PaginaEjercicio key={parametro} ejercicioId={parametro} /> : <BibliotecaEjercicios />;
    case 'generador': return <PaginaGenerador />;
    case 'evaluacion': return <PaginaEvaluacion />;
    case 'historial': return <PaginaHistorial />;
    case 'progreso': return <PaginaProgreso />;
    case 'auditoria': return <PaginaAuditoria />;
    case 'revision': return <PaginaRevision />;
    case 'reportes': return <CentroReportes />;
    case 'configuracion': return <PaginaConfiguracion />;
    case 'creditos': return <PaginaCreditos />;
    case 'ayuda': return <PaginaAyuda />;
  }
}

// ───────────────────────────── Barra superior ─────────────────────────────

function BarraSuperior({
  modo,
  alCambiarModo,
  temaVisual,
  alCambiarTema,
  nombrePerfil,
  alAlternarMenu,
  menuAbierto,
}: {
  modo: Modo;
  alCambiarModo: (m: Modo) => void;
  temaVisual: 'claro' | 'oscuro' | 'sistema';
  alCambiarTema: (t: 'claro' | 'oscuro' | 'sistema') => void;
  nombrePerfil: string | null;
  alAlternarMenu: () => void;
  menuAbierto: boolean;
}): ReactNode {
  return (
    <header
      className="sticky top-0 z-30 border-b ocultar-al-imprimir"
      style={{ background: 'var(--superficie)', borderColor: 'var(--borde)' }}
    >
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-6">
        {/* Este botón solo existe en pantallas pequeñas, donde es la única
            forma de llegar a la navegación, y se pulsa con el pulgar. Con el
            tamaño de un botón pequeño quedaba en 32 × 26 px; las guías de
            Android y de iOS piden alrededor de 44. */}
        <button
          type="button"
          className="boton boton-suave boton-pequeno min-h-11 min-w-11 text-base lg:hidden"
          onClick={alAlternarMenu}
          aria-expanded={menuAbierto}
          aria-label={menuAbierto ? 'Cerrar navegación' : 'Abrir navegación'}
        >
          ☰
        </button>

        <a href={enlaces.inicio} className="flex min-w-0 items-center gap-2.5 no-underline">
          <Logotipo />
          <span className="min-w-0">
            <span className="block truncate font-bold" style={{ fontFamily: 'var(--font-titulo)', color: 'var(--tinta)', letterSpacing: '-0.01em' }}>
              {IDENTIDAD.nombre}
            </span>
            <span className="hidden truncate text-[0.6875rem] sm:block" style={{ color: 'var(--tinta-tenue)' }}>
              {IDENTIDAD.subtitulo}
            </span>
          </span>
        </a>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Modo de uso"
            className="flex overflow-hidden rounded-lg"
            style={{ border: '1px solid var(--borde-fuerte)' }}
          >
            {MODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                title={m.ayuda}
                aria-pressed={modo === m.valor}
                onClick={() => alCambiarModo(m.valor)}
                className="boton-modo"
                style={
                  modo === m.valor
                    ? { background: 'var(--acento)', color: 'var(--acento-contraste)' }
                    : { background: 'transparent', color: 'var(--tinta-media)' }
                }
              >
                {m.texto}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="boton boton-suave boton-pequeno"
            onClick={() => alCambiarTema(temaVisual === 'oscuro' ? 'claro' : temaVisual === 'claro' ? 'sistema' : 'oscuro')}
            title={`Tema: ${temaVisual}. Pulse para cambiar.`}
            aria-label={`Cambiar tema visual. Actualmente: ${temaVisual}`}
          >
            {temaVisual === 'oscuro' ? '◐ Oscuro' : temaVisual === 'claro' ? '◑ Claro' : '◒ Sistema'}
          </button>

          {nombrePerfil !== null && (
            <a href={enlaces.estudiante} className="no-underline">
              <Distintivo tono="acento">{nombrePerfil}</Distintivo>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function Logotipo(): ReactNode {
  // Marca provisional generada en código. El espacio para el logotipo oficial
  // de la institución está reservado en `config/identidad.ts`.
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <rect width="30" height="30" rx="7" fill="var(--acento)" />
      <path d="M7 21 L11.5 12.5 L15.5 17.5 L19 9 L23 21" fill="none" stroke="var(--acento-contraste)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="19" cy="9" r="2.4" fill="var(--color-critico)" />
    </svg>
  );
}

// ───────────────────────────── Navegación lateral ─────────────────────────────

interface Enlace {
  readonly href: string;
  readonly texto: string;
  readonly soloModo?: readonly Modo[];
  readonly distintivo?: ReactNode;
}

function NavegacionLateral({
  rutaActual,
  modo,
  pendientesAuditoria,
  pendientesRevision,
  progreso,
  abierta,
}: {
  rutaActual: string;
  modo: Modo;
  pendientesAuditoria: number;
  pendientesRevision: number;
  progreso: number;
  abierta: boolean;
}): ReactNode {
  const generales: Enlace[] = [
    { href: enlaces.inicio, texto: 'Inicio' },
    { href: enlaces.estudiante, texto: 'Panel del estudiante', soloModo: ['estudiante', 'evaluacion'] },
    { href: enlaces.docente, texto: 'Panel docente', soloModo: ['docente'] },
    { href: enlaces.modulos, texto: 'Catálogo de módulos' },
    { href: enlaces.biblioteca, texto: 'Biblioteca de ejercicios' },
  ];

  const herramientas: Enlace[] = [
    { href: enlaces.generador, texto: 'Generador de ejercicios', soloModo: ['docente'] },
    { href: enlaces.evaluacion, texto: 'Modo evaluación' },
    { href: enlaces.historial, texto: 'Historial de prácticas' },
    { href: enlaces.progreso, texto: 'Panel de progreso' },
    {
      href: enlaces.revision,
      texto: 'Revisión de interpretaciones',
      soloModo: ['docente'],
      distintivo: pendientesRevision > 0 ? <Distintivo tono="avisar">{pendientesRevision}</Distintivo> : undefined,
    },
    {
      href: enlaces.auditoria,
      texto: 'Auditoría de datos',
      soloModo: ['docente'],
      distintivo: pendientesAuditoria > 0 ? <Distintivo tono="avisar">{pendientesAuditoria}</Distintivo> : undefined,
    },
    { href: enlaces.reportes, texto: 'Centro de reportes' },
  ];

  const sistema: Enlace[] = [
    { href: enlaces.configuracion, texto: 'Configuración' },
    { href: enlaces.ayuda, texto: 'Ayuda y glosario' },
    { href: enlaces.creditos, texto: 'Créditos y fuentes' },
  ];

  const visible = (e: Enlace): boolean => e.soloModo === undefined || e.soloModo.includes(modo);

  return (
    <nav
      aria-label="Navegación principal"
      className={`${abierta ? 'block' : 'hidden'} sticky top-[3.25rem] max-h-[calc(100vh-3.25rem)] w-full shrink-0 overflow-y-auto border-r px-3 py-4 lg:block lg:w-64 ocultar-al-imprimir`}
      style={{ background: 'var(--superficie)', borderColor: 'var(--borde)' }}
    >
      <div className="mb-4 rounded-lg px-3 py-2.5" style={{ background: 'var(--superficie-2)', border: '1px solid var(--borde)' }}>
        <p className="etiqueta">Progreso general</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="dato text-xl font-semibold" style={{ color: progreso >= 70 ? 'var(--bien)' : 'var(--acento)' }}>
            {progreso} %
          </span>
          <span className="text-[0.6875rem]" style={{ color: 'var(--tinta-tenue)' }}>
            {`de los ${TEMAS.length} módulos`}
          </span>
        </div>
      </div>

      <GrupoEnlaces titulo="General" enlaces={generales.filter(visible)} rutaActual={rutaActual} />

      <div className="mt-4">
        <p className="etiqueta mb-1.5 px-2">Módulos</p>
        <ul className="flex flex-col gap-0.5">
          {TEMAS.map((tema) => (
            <li key={tema}>
              <a
                href={enlaces.modulo(tema)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] no-underline transition-colors hover:bg-[var(--superficie-2)]"
                style={{ color: rutaActual.includes(`/modulo/${tema}`) ? 'var(--acento)' : 'var(--tinta-media)' }}
                aria-current={rutaActual.includes(`/modulo/${tema}`) ? 'page' : undefined}
              >
                <span
                  className="dato flex h-5 w-5 shrink-0 items-center justify-center rounded text-[0.625rem] font-bold"
                  style={{ background: 'var(--superficie-3)', color: 'var(--tinta-media)' }}
                >
                  {NUMERO_MODULO[tema]}
                </span>
                <span className="truncate">{NOMBRE_TEMA[tema]}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <GrupoEnlaces titulo="Herramientas" enlaces={herramientas.filter(visible)} rutaActual={rutaActual} className="mt-4" />
      <GrupoEnlaces titulo="Sistema" enlaces={sistema.filter(visible)} rutaActual={rutaActual} className="mt-4" />
    </nav>
  );
}

function GrupoEnlaces({
  titulo,
  enlaces: lista,
  rutaActual,
  className = '',
}: {
  titulo: string;
  enlaces: readonly Enlace[];
  rutaActual: string;
  className?: string;
}): ReactNode {
  if (lista.length === 0) return null;

  return (
    <div className={className}>
      <p className="etiqueta mb-1.5 px-2">{titulo}</p>
      <ul className="flex flex-col gap-0.5">
        {lista.map((e) => {
          const activo = rutaActual === e.href || (e.href !== '#/' && rutaActual.startsWith(e.href));
          return (
            <li key={e.href}>
              <a
                href={e.href}
                aria-current={activo ? 'page' : undefined}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[0.8125rem] font-medium no-underline transition-colors hover:bg-[var(--superficie-2)]"
                style={activo ? { background: 'var(--acento-suave)', color: 'var(--acento)', fontWeight: 700 } : { color: 'var(--tinta-media)' }}
              >
                <span className="truncate">{e.texto}</span>
                {e.distintivo}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────────── Pie ─────────────────────────────

function PieDePagina(): ReactNode {
  return (
    <footer className="border-t px-4 py-4 text-xs sm:px-6 ocultar-al-imprimir" style={{ borderColor: 'var(--borde)', color: 'var(--tinta-tenue)' }}>
      <div className="mx-auto flex w-full max-w-[76rem] flex-wrap items-center justify-between gap-2">
        <span>
          {IDENTIDAD.nombre} v{IDENTIDAD.version} · {IDENTIDAD.autor.titulo} {IDENTIDAD.autor.nombre} ·{' '}
          {IDENTIDAD.institucion.nombre}, {ubicacionCompleta()}
        </span>
        <span className="flex gap-3">
          <a href={enlaces.creditos}>Créditos y fuentes</a>
          <a href={enlaces.ayuda}>Ayuda</a>
        </span>
      </div>
    </footer>
  );
}

export { irA };
