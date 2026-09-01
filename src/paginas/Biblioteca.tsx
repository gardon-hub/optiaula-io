/**
 * Biblioteca de ejercicios: búsqueda, filtros, orden y favoritos.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  CONTEXTOS,
  NOMBRE_CONTEXTO,
  NOMBRE_DIFICULTAD,
  NOMBRE_TEMA,
  TEMAS,
  type Contexto,
  type Dificultad,
  type Tema,
} from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { enlaces } from '@/rutas';
import { CampoTexto, Distintivo, Seccion, Selector, Tarjeta, Vacio } from '@/ui/base';
import { exportarCSV, exportarExcel, nombreSeguro } from '@/export/exportar';

type Orden = 'tema' | 'titulo' | 'dificultad' | 'tiempo';

export function BibliotecaEjercicios(): ReactNode {
  const tienda = usarTienda();

  const temaInicial = (): Tema | 'todos' => {
    const consulta = window.location.hash.split('?')[1] ?? '';
    const valor = new URLSearchParams(consulta).get('tema');
    return valor !== null && (TEMAS as readonly string[]).includes(valor) ? (valor as Tema) : 'todos';
  };

  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState<Tema | 'todos'>(temaInicial);
  const [dificultad, setDificultad] = useState<Dificultad | 'todas'>('todas');
  const [contexto, setContexto] = useState<Contexto | 'todos'>('todos');
  const [orden, setOrden] = useState<Orden>('tema');
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  const filtrados = useMemo(() => {
    const texto = busqueda
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');

    const coincide = (valor: string): boolean =>
      valor
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .includes(texto);

    const lista = tienda.ejercicios.filter((e) => {
      if (tema !== 'todos' && e.tema !== tema) return false;
      if (dificultad !== 'todas' && e.dificultad !== dificultad) return false;
      if (contexto !== 'todos' && e.contexto !== contexto) return false;
      if (soloFavoritos && !tienda.favoritos.includes(e.id)) return false;
      if (texto !== '' && !coincide(e.titulo) && !coincide(e.enunciado) && !coincide(e.metodo)) return false;
      return true;
    });

    const ordenComparadores: Record<Orden, (a: (typeof lista)[number], b: (typeof lista)[number]) => number> = {
      tema: (a, b) => a.tema.localeCompare(b.tema) || a.id.localeCompare(b.id),
      titulo: (a, b) => a.titulo.localeCompare(b.titulo, 'es'),
      dificultad: (a, b) => {
        const peso = { basico: 0, intermedio: 1, avanzado: 2 };
        return peso[a.dificultad] - peso[b.dificultad] || a.titulo.localeCompare(b.titulo, 'es');
      },
      tiempo: (a, b) => a.tiempoEstimadoMinutos - b.tiempoEstimadoMinutos,
    };

    return [...lista].sort(ordenComparadores[orden]);
  }, [tienda.ejercicios, tienda.favoritos, busqueda, tema, dificultad, contexto, orden, soloFavoritos]);

  const tabla = {
    titulo: 'Biblioteca de ejercicios',
    encabezados: ['Identificador', 'Título', 'Tema', 'Método', 'Contexto', 'Dificultad', 'Minutos', 'Origen', 'Validación', 'Moneda', 'Unidades'],
    filas: filtrados.map((e) => [
      e.id,
      e.titulo,
      NOMBRE_TEMA[e.tema],
      e.metodo,
      NOMBRE_CONTEXTO[e.contexto],
      NOMBRE_DIFICULTAD[e.dificultad],
      e.tiempoEstimadoMinutos,
      e.origen,
      e.validacion,
      e.moneda ?? '',
      e.unidades.join(' / '),
    ]),
  };

  return (
    <Seccion
      titulo="Biblioteca de ejercicios"
      eyebrow={`${tienda.ejercicios.length} ejercicios en total`}
      descripcion="Todos los ejercicios provienen de los materiales del curso, se derivan de ellos o los generó el docente. Cada uno declara su origen y su estado de validación."
      acciones={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro('biblioteca-ejercicios'))}>
            Exportar CSV
          </button>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro('biblioteca-ejercicios'))}>
            Exportar Excel
          </button>
        </div>
      }
    >
      <Tarjeta plana>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CampoTexto etiqueta="Buscar" valor={busqueda} alCambiar={setBusqueda} marcador="título, método o enunciado" />
          <Selector
            etiqueta="Tema"
            valor={tema}
            opciones={[{ valor: 'todos' as const, texto: 'Todos los temas' }, ...TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))]}
            alCambiar={(v) => setTema(v as Tema | 'todos')}
          />
          <Selector
            etiqueta="Dificultad"
            valor={dificultad}
            opciones={[
              { valor: 'todas' as const, texto: 'Todas' },
              { valor: 'basico' as const, texto: 'Básico' },
              { valor: 'intermedio' as const, texto: 'Intermedio' },
              { valor: 'avanzado' as const, texto: 'Avanzado' },
            ]}
            alCambiar={(v) => setDificultad(v as Dificultad | 'todas')}
          />
          <Selector
            etiqueta="Contexto productivo"
            valor={contexto}
            opciones={[
              { valor: 'todos' as const, texto: 'Todos los contextos' },
              ...CONTEXTOS.map((c) => ({ valor: c, texto: NOMBRE_CONTEXTO[c] })),
            ]}
            alCambiar={(v) => setContexto(v as Contexto | 'todos')}
          />
          <Selector
            etiqueta="Ordenar por"
            valor={orden}
            opciones={[
              { valor: 'tema' as const, texto: 'Tema' },
              { valor: 'titulo' as const, texto: 'Título' },
              { valor: 'dificultad' as const, texto: 'Dificultad' },
              { valor: 'tiempo' as const, texto: 'Tiempo estimado' },
            ]}
            alCambiar={(v) => setOrden(v as Orden)}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`boton boton-pequeno ${soloFavoritos ? 'boton-primario' : 'boton-secundario'}`}
            onClick={() => setSoloFavoritos((v) => !v)}
          >
            {soloFavoritos ? '★ Solo favoritos' : '☆ Solo favoritos'}
          </button>
          <button
            type="button"
            className="boton boton-suave boton-pequeno"
            onClick={() => {
              setBusqueda('');
              setTema('todos');
              setDificultad('todas');
              setContexto('todos');
              setSoloFavoritos(false);
            }}
          >
            Limpiar filtros
          </button>
          <span className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            {filtrados.length} de {tienda.ejercicios.length} ejercicios
          </span>
        </div>
      </Tarjeta>

      {filtrados.length === 0 ? (
        <Vacio
          titulo="Ningún ejercicio coincide con los filtros"
          descripcion="Pruebe con menos filtros o busque por otro término. También puede generar ejercicios nuevos desde el generador."
          accion={
            <a href={enlaces.generador} className="boton boton-primario boton-pequeno no-underline">
              Ir al generador
            </a>
          }
        />
      ) : (
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col" className="w-8" aria-label="Favorito" />
                <th scope="col">Ejercicio</th>
                <th scope="col">Tema y método</th>
                <th scope="col">Contexto</th>
                <th scope="col">Dificultad</th>
                <th scope="col" className="text-right">Minutos</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => {
                const favorito = tienda.favoritos.includes(e.id);
                return (
                  <tr key={e.id}>
                    <td>
                      <button
                        type="button"
                        className="boton boton-suave boton-pequeno"
                        onClick={() => tienda.alternarFavorito(e.id)}
                        aria-label={favorito ? `Quitar ${e.titulo} de favoritos` : `Marcar ${e.titulo} como favorito`}
                        title={favorito ? 'Quitar de favoritos' : 'Marcar favorito'}
                        style={favorito ? { color: 'var(--avisar)' } : undefined}
                      >
                        {favorito ? '★' : '☆'}
                      </button>
                    </td>
                    <td>
                      <a href={enlaces.ejercicio(e.id)} className="font-medium">
                        {e.titulo}
                      </a>
                      <div className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                        {e.id}
                        {e.atribucion !== null && tienda.configuracion.mostrarAtribuciones ? ` · ${e.atribucion}` : ''}
                      </div>
                    </td>
                    <td className="text-[0.8125rem]">
                      {NOMBRE_TEMA[e.tema]}
                      <div className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                        {e.metodo}
                      </div>
                    </td>
                    <td className="text-[0.8125rem]">{NOMBRE_CONTEXTO[e.contexto]}</td>
                    <td>
                      <Distintivo tono={e.dificultad === 'avanzado' ? 'mal' : e.dificultad === 'intermedio' ? 'avisar' : 'bien'}>
                        {NOMBRE_DIFICULTAD[e.dificultad]}
                      </Distintivo>
                    </td>
                    <td className="numero">{e.tiempoEstimadoMinutos}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Distintivo tono={e.origen === 'textual' ? 'bien' : 'neutro'} titulo={`Origen: ${e.origen}`}>
                          {e.origen}
                        </Distintivo>
                        {e.validacion === 'con_inconsistencia' && <Distintivo tono="avisar">auditoría</Distintivo>}
                        {e.moneda !== null && <Distintivo tono="neutro">{e.moneda}</Distintivo>}
                        {e.preguntas.some((p) => p.respuesta !== null) && <Distintivo tono="acento">con solución</Distintivo>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Seccion>
  );
}
