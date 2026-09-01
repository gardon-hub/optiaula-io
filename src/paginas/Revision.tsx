/**
 * Revisión docente de las respuestas de interpretación.
 *
 * Las preguntas de interpretación no las puede calificar el motor: hay que
 * leerlas. Esta pantalla las junta todas en una bandeja, muestra el enunciado
 * junto a lo que escribió el estudiante y ofrece la rúbrica para puntuarlas.
 *
 * La rúbrica es una ayuda, no un requisito: se puede calificar a mano. Y cuando
 * la rúbrica no viene de los materiales del curso, la pantalla lo dice.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { usarTienda } from '@/almacen/tienda';
import { RUBRICAS, rubricaPorId, rubricaSugerida } from '@/datos/rubricas';
import { fuentePorId } from '@/datos/fuentes';
import type { Revision, Rubrica } from '@/esquemas';
import { formatearNumero } from '@/nucleo/numero';
import {
  bandejaDeRevision,
  puntosDeRubrica,
  rubricaCompleta,
  type PendienteDeRevision,
} from '@/nucleo/revision';
import { enlaces, irA } from '@/rutas';
import { CampoTexto, Distintivo, Indicador, Selector, Seccion, Tarjeta, Vacio } from '@/ui/base';
import { fechaLegible } from '@/export/exportar';

type Filtro = 'pendientes' | 'revisadas' | 'todas';

export function PaginaRevision(): ReactNode {
  const tienda = usarTienda();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [perfilFiltro, setPerfilFiltro] = useState<string>('todos');
  const [abierta, setAbierta] = useState<string | null>(null);

  const bandeja = useMemo(
    () => bandejaDeRevision(tienda.intentos, tienda.ejercicios),
    [tienda.intentos, tienda.ejercicios],
  );

  const pendientes = bandeja.filter((x) => x.respuesta.revision === null);
  const revisadas = bandeja.filter((x) => x.respuesta.revision !== null);

  const visibles = bandeja
    .filter((x) => (filtro === 'todas' ? true : filtro === 'pendientes' ? x.respuesta.revision === null : x.respuesta.revision !== null))
    .filter((x) => perfilFiltro === 'todos' || x.intento.perfilId === perfilFiltro);

  const nombrePerfil = (id: string): string => tienda.perfiles.find((p) => p.id === id)?.nombre ?? 'Perfil eliminado';

  const puntosPendientes = pendientes.reduce((t, x) => t + x.pregunta.puntos, 0);

  if (bandeja.length === 0) {
    return (
      <Seccion
        titulo="Revisión de interpretaciones"
        eyebrow="Modo docente"
        descripcion="Aquí se califican las respuestas que el motor no puede corregir solo: las de interpretación."
      >
        <Vacio
          titulo="Todavía no hay interpretaciones que revisar"
          descripcion="Cuando un estudiante responda una pregunta de interpretación y registre su intento, la respuesta aparecerá en esta bandeja."
          accion={
            <button type="button" className="boton boton-secundario" onClick={() => irA(enlaces.biblioteca)}>
              Ir a la biblioteca
            </button>
          }
        />
      </Seccion>
    );
  }

  return (
    <Seccion
      titulo="Revisión de interpretaciones"
      eyebrow="Modo docente"
      descripcion="Estas son las respuestas que el motor no puede calificar solo. La rúbrica sugiere un puntaje; la nota la pone usted."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          etiqueta="Pendientes de revisar"
          valor={pendientes.length}
          tono={pendientes.length > 0 ? 'avisar' : 'bien'}
          nota={pendientes.length > 0 ? `${formatearNumero(puntosPendientes, { decimales: 0 })} puntos sin asignar` : 'No queda nada por revisar'}
        />
        <Indicador etiqueta="Ya revisadas" valor={revisadas.length} tono="bien" />
        <Indicador etiqueta="Estudiantes con respuestas" valor={new Set(bandeja.map((x) => x.intento.perfilId)).size} />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Selector
          etiqueta="Mostrar"
          valor={filtro}
          opciones={[
            { valor: 'pendientes', texto: `Pendientes (${pendientes.length})` },
            { valor: 'revisadas', texto: `Revisadas (${revisadas.length})` },
            { valor: 'todas', texto: `Todas (${bandeja.length})` },
          ]}
          alCambiar={setFiltro}
        />
        <Selector
          etiqueta="Estudiante"
          valor={perfilFiltro}
          opciones={[
            { valor: 'todos', texto: 'Todos' },
            ...[...new Set(bandeja.map((x) => x.intento.perfilId))].map((id) => ({ valor: id, texto: nombrePerfil(id) })),
          ]}
          alCambiar={setPerfilFiltro}
        />
      </div>

      {visibles.length === 0 ? (
        <Vacio titulo="Nada que mostrar con este filtro" descripcion="Pruebe con otro estado o con otro estudiante." />
      ) : (
        <div className="flex flex-col gap-3">
          {visibles.map((x) => {
            const clave = `${x.intento.id}:${x.pregunta.id}`;
            return (
              <FichaDeRevision
                key={clave}
                item={x}
                nombreEstudiante={nombrePerfil(x.intento.perfilId)}
                abierta={abierta === clave}
                alAlternar={() => setAbierta(abierta === clave ? null : clave)}
                alGuardar={(revision) => {
                  tienda.revisarInterpretacion(x.intento.id, x.pregunta.id, revision);
                  tienda.avisar(
                    revision === null
                      ? 'Calificación retirada: la respuesta vuelve a quedar pendiente.'
                      : `Calificada con ${formatearNumero(revision.puntos, { decimales: 2 })} de ${formatearNumero(x.pregunta.puntos, { decimales: 0 })} puntos.`,
                    'bien',
                  );
                  setAbierta(null);
                }}
              />
            );
          })}
        </div>
      )}
    </Seccion>
  );
}

function FichaDeRevision({
  item,
  nombreEstudiante,
  abierta,
  alAlternar,
  alGuardar,
}: {
  item: PendienteDeRevision;
  nombreEstudiante: string;
  abierta: boolean;
  alAlternar: () => void;
  alGuardar: (revision: Revision | null) => void;
}): ReactNode {
  const tienda = usarTienda();
  const yaRevisada = item.respuesta.revision;

  const [rubricaId, setRubricaId] = useState<string>(
    yaRevisada?.rubricaId ?? rubricaSugerida(item.ejercicio.id).id,
  );
  const [niveles, setNiveles] = useState<Record<string, string>>({ ...yaRevisada?.niveles });
  const [comentario, setComentario] = useState(yaRevisada?.comentario ?? '');
  const [manual, setManual] = useState<string>(
    yaRevisada !== null && yaRevisada.rubricaId === null ? String(yaRevisada.puntos) : '',
  );

  const rubrica: Rubrica | null = rubricaId === 'sin-rubrica' ? null : rubricaPorId(rubricaId);
  const puntosMaximos = item.pregunta.puntos;

  const puntos =
    rubrica === null
      ? Math.min(puntosMaximos, Math.max(0, Number(manual.replace(',', '.')) || 0))
      : puntosDeRubrica(puntosMaximos, rubrica, niveles);

  const listaParaGuardar = rubrica === null ? manual.trim() !== '' : rubricaCompleta(rubrica, niveles);

  const texto = typeof item.respuesta.valor === 'string' ? item.respuesta.valor : '';

  return (
    <Tarjeta
      titulo={item.ejercicio.titulo}
      descripcion={`${nombreEstudiante} · ${fechaLegible(item.intento.finalizadoEn ?? item.intento.iniciadoEn)}`}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          {yaRevisada === null ? (
            <Distintivo tono="avisar">pendiente</Distintivo>
          ) : (
            <Distintivo tono="bien">
              {formatearNumero(yaRevisada.puntos, { decimales: 2 })} / {formatearNumero(puntosMaximos, { decimales: 0 })}
            </Distintivo>
          )}
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={alAlternar}>
            {abierta ? 'Cerrar' : yaRevisada === null ? 'Calificar' : 'Modificar'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
          {item.pregunta.enunciado}
        </p>

        <blockquote
          className="prosa whitespace-pre-wrap rounded-md border-l-4 px-3 py-2 text-[0.875rem]"
          style={{ borderColor: 'var(--acento)', background: 'var(--superficie-2)' }}
        >
          {texto}
        </blockquote>

        {yaRevisada !== null && yaRevisada.comentario !== '' && !abierta && (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            <strong>Su comentario:</strong> {yaRevisada.comentario}
          </p>
        )}

        {abierta && (
          <div className="flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--borde)' }}>
            <Selector
              etiqueta="Rúbrica"
              valor={rubricaId}
              opciones={[
                ...RUBRICAS.map((r) => ({ valor: r.id, texto: r.nombre })),
                { valor: 'sin-rubrica', texto: 'Sin rúbrica: asignar el puntaje a mano' },
              ]}
              alCambiar={(v) => {
                setRubricaId(v);
                setNiveles({});
              }}
              ayuda={rubrica?.descripcion}
            />

            {rubrica !== null && rubrica.origen === 'propuesta' && (
              <p
                className="rounded-md px-3 py-2 text-[0.8125rem]"
                style={{ background: 'var(--avisar-suave)', color: 'var(--tinta)' }}
              >
                <strong>Esta rúbrica no sale de los materiales del curso:</strong> la propone la aplicación. {rubrica.atribucion}
              </p>
            )}

            {rubrica !== null && rubrica.origen === 'textual' && (
              <p className="text-[0.75rem]" style={{ color: 'var(--tinta-tenue)' }}>
                {rubrica.atribucion}
                {fuentePorId(rubrica.fuenteId) !== null && ` · ${fuentePorId(rubrica.fuenteId)!.cita}`}
              </p>
            )}

            {rubrica === null ? (
              <CampoTexto
                etiqueta={`Puntos otorgados (máximo ${formatearNumero(puntosMaximos, { decimales: 0 })})`}
                valor={manual}
                alCambiar={setManual}
                marcador="Por ejemplo: 2,5"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {rubrica.criterios.map((criterio) => (
                  <fieldset key={criterio.id} className="flex flex-col gap-2">
                    <legend className="text-[0.8125rem] font-semibold">
                      {criterio.nombre}{' '}
                      <span style={{ color: 'var(--tinta-tenue)' }}>
                        ({formatearNumero(criterio.peso, { decimales: 0 })} % ={' '}
                        {formatearNumero((criterio.peso / 100) * puntosMaximos, { decimales: 2 })} puntos)
                      </span>
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-4">
                      {criterio.niveles.map((nivel) => {
                        const activo = niveles[criterio.id] === nivel.id;
                        return (
                          <button
                            key={nivel.id}
                            type="button"
                            className="rounded-md border px-2 py-2 text-left text-[0.75rem] transition"
                            style={{
                              borderColor: activo ? 'var(--acento)' : 'var(--borde)',
                              background: activo ? 'var(--acento-suave)' : 'transparent',
                              color: 'var(--tinta)',
                            }}
                            aria-pressed={activo}
                            onClick={() => setNiveles((s) => ({ ...s, [criterio.id]: nivel.id }))}
                          >
                            <span className="block font-semibold">
                              {nivel.nombre} · {formatearNumero(nivel.porcentaje, { decimales: 0 })} %
                            </span>
                            {nivel.descripcion !== '' && (
                              <span className="mt-1 block" style={{ color: 'var(--tinta-media)' }}>
                                {nivel.descripcion}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}

            <CampoTexto
              etiqueta="Comentario para el estudiante"
              valor={comentario}
              alCambiar={setComentario}
              marcador="Qué estuvo bien y qué le falta. Lo verá en su historial."
              multilinea
            />

            <div className="flex flex-wrap items-center gap-3">
              <Indicador
                etiqueta="Puntos que se asignarán"
                valor={`${formatearNumero(puntos, { decimales: 2 })} / ${formatearNumero(puntosMaximos, { decimales: 0 })}`}
                tono={listaParaGuardar ? 'bien' : 'avisar'}
                nota={
                  listaParaGuardar
                    ? undefined
                    : rubrica === null
                      ? 'Escriba los puntos para poder guardar'
                      : 'Falta elegir el nivel de algún criterio'
                }
              />
              <button
                type="button"
                className="boton boton-primario"
                disabled={!listaParaGuardar}
                onClick={() =>
                  alGuardar({
                    puntos,
                    rubricaId: rubrica?.id ?? null,
                    niveles: rubrica === null ? {} : niveles,
                    comentario: comentario.trim(),
                    revisadoEn: new Date().toISOString(),
                    revisadoPor: tienda.configuracion.curso.docente,
                  })
                }
              >
                Guardar la calificación
              </button>
              {yaRevisada !== null && (
                <button type="button" className="boton boton-secundario" onClick={() => alGuardar(null)}>
                  Retirar la calificación
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Tarjeta>
  );
}
