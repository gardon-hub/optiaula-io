/**
 * Pantalla de un módulo, organizada según la secuencia pedagógica del
 * proyecto: explorar, comprender, ejemplo resuelto, practicar, desafío,
 * interpretar, autoevaluarse y reporte.
 */

import { useState, type ReactNode } from 'react';
import { NOMBRE_DIFICULTAD, NOMBRE_TEMA, NUMERO_MODULO, type Tema } from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { contenidoDe } from '@/datos/modulos';
import { fuentePorId } from '@/datos/fuentes';
import { enlaces } from '@/rutas';
import { Distintivo, Formula, Pestanas, Plegable, Seccion, Tarjeta, TextoFormateado, Vacio } from '@/ui/base';
import { Interpretacion } from '@/ui/pasos';

type Etapa = 'explorar' | 'comprender' | 'ejemplo' | 'practicar' | 'desafio' | 'interpretar' | 'evaluar';

const ETAPAS: readonly { valor: Etapa; texto: string }[] = [
  { valor: 'explorar', texto: '1 · Explorar' },
  { valor: 'comprender', texto: '2 · Comprender' },
  { valor: 'ejemplo', texto: '3 · Ejemplo resuelto' },
  { valor: 'practicar', texto: '4 · Practicar' },
  { valor: 'desafio', texto: '5 · Desafío' },
  { valor: 'interpretar', texto: '6 · Interpretar' },
  { valor: 'evaluar', texto: '7 · Autoevaluarse' },
];

export function PaginaModulo({ tema }: { tema: Tema }): ReactNode {
  const tienda = usarTienda();
  const contenido = contenidoDe(tema);
  const [etapa, setEtapa] = useState<Etapa>('explorar');

  const ejercicios = tienda.ejercicios.filter((e) => e.tema === tema);
  const porDificultad = (d: 'basico' | 'intermedio' | 'avanzado') => ejercicios.filter((e) => e.dificultad === d);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="etiqueta">Módulo {NUMERO_MODULO[tema]}</p>
        <h1>{NOMBRE_TEMA[tema]}</h1>
        <p className="prosa" style={{ color: 'var(--tinta-media)' }}>
          <strong>Resultado de aprendizaje.</strong> {contenido.resultadoAprendizaje}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={enlaces.laboratorio(tema)} className="boton boton-primario boton-pequeno no-underline">
            Abrir el laboratorio
          </a>
          <a href={`${enlaces.biblioteca}?tema=${tema}`} className="boton boton-secundario boton-pequeno no-underline">
            Ver los {ejercicios.length} ejercicios
          </a>
        </div>
      </header>

      <Pestanas etiquetaGrupo="Secuencia de aprendizaje" valor={etapa} alCambiar={setEtapa} opciones={ETAPAS} />

      {etapa === 'explorar' && (
        <Seccion titulo="Explorar" eyebrow="Activación de conocimientos previos" descripcion="Antes de leer nada, intente responder estas preguntas con lo que ya sabe. No hace falta acertar: hace falta darse cuenta de qué le falta.">
          <div className="flex flex-col gap-3">
            {contenido.conocimientosPrevios.map((p, i) => (
              <Tarjeta key={i} plana>
                <div className="flex gap-3">
                  <span
                    className="dato flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--avisar-suave)', color: 'var(--avisar)' }}
                  >
                    {i + 1}
                  </span>
                  <p className="prosa">{p}</p>
                </div>
              </Tarjeta>
            ))}

            <Tarjeta titulo="Aplicación agropecuaria" descripcion="Por qué este tema importa fuera del aula.">
              <p className="prosa" style={{ color: 'var(--tinta-media)' }}>
                {contenido.aplicacionAgropecuaria}
              </p>
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {etapa === 'comprender' && (
        <Seccion titulo="Comprender" eyebrow="Explicación conceptual">
          <div className="flex flex-col gap-4">
            <Tarjeta>
              <TextoFormateado texto={contenido.explicacion} />
            </Tarjeta>

            {contenido.formulas.length > 0 && (
              <Tarjeta titulo="Fórmulas" descripcion="Cada símbolo con su significado, y cuándo corresponde usar cada fórmula.">
                <div className="flex flex-col gap-4">
                  {contenido.formulas.map((f, i) => (
                    <div key={i} className="tarjeta-plana flex flex-col gap-2 p-3">
                      <h4>{f.nombre}</h4>
                      <div className="overflow-x-auto py-1">
                        <Formula tex={f.tex} bloque />
                      </div>
                      <dl className="grid gap-1.5 text-[0.8125rem] sm:grid-cols-2">
                        {f.variables.map((v, j) => (
                          <div key={j} className="flex gap-2">
                            <dt className="shrink-0">
                              <Formula tex={v.simbolo} />
                            </dt>
                            <dd style={{ color: 'var(--tinta-media)' }}>{v.significado}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                        <strong>Cuándo usarla.</strong> {f.cuandoUsarla}
                      </p>
                    </div>
                  ))}
                </div>
              </Tarjeta>
            )}

            <Tarjeta titulo="Glosario" descripcion={`${contenido.glosario.length} términos del módulo.`}>
              <dl className="grid gap-2.5 sm:grid-cols-2">
                {contenido.glosario.map((g, i) => (
                  <div key={i} className="tarjeta-plana p-2.5">
                    <dt className="font-bold text-[0.875rem]">{g.termino}</dt>
                    <dd className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                      {g.definicion}
                    </dd>
                  </div>
                ))}
              </dl>
            </Tarjeta>

            <Tarjeta titulo="Errores frecuentes" descripcion="El motor de retroalimentación reconoce estos errores y, cuando los detecta, explica exactamente qué se hizo mal.">
              <div className="flex flex-col gap-2">
                {contenido.erroresFrecuentes.map((e, i) => (
                  <Plegable key={i} titulo={e.error} distintivo={<Distintivo tono="mal">error {i + 1}</Distintivo>}>
                    <dl className="flex flex-col gap-2 text-[0.8125rem]">
                      <div>
                        <dt className="etiqueta">Por qué ocurre</dt>
                        <dd style={{ color: 'var(--tinta-media)' }}>{e.porQueOcurre}</dd>
                      </div>
                      <div>
                        <dt className="etiqueta">Cómo evitarlo</dt>
                        <dd style={{ color: 'var(--tinta-media)' }}>{e.comoEvitarlo}</dd>
                      </div>
                    </dl>
                  </Plegable>
                ))}
              </div>
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {etapa === 'ejemplo' && (
        <Seccion
          titulo="Ejemplo resuelto"
          eyebrow="Observe el procedimiento completo"
          descripcion="El ejemplo se resuelve en el laboratorio, con todos los pasos explicados. Puede avanzar uno a uno o ver el procedimiento completo."
        >
          <EnlaceEjercicio id={contenido.ejemploResueltoId} etiqueta="Abrir el ejemplo resuelto" />
        </Seccion>
      )}

      {etapa === 'practicar' && (
        <Seccion
          titulo="Practicar con orientación"
          eyebrow="Con pistas graduadas"
          descripcion="Aquí sí hay ayuda: cada pregunta tiene pistas que van de lo sutil a lo explícito, y el motor explica el error cuando la respuesta no es correcta. Cada pista consultada reduce un poco el puntaje, para que el uso sea consciente."
        >
          <div className="flex flex-col gap-4">
            <EnlaceEjercicio id={contenido.practicaGuiadaId} etiqueta="Abrir la práctica guiada" />

            {porDificultad('basico').length > 0 && (
              <ListaEjercicios titulo="Ejercicios básicos" ids={porDificultad('basico').map((e) => e.id)} />
            )}
          </div>
        </Seccion>
      )}

      {etapa === 'desafio' && (
        <Seccion
          titulo="Resolver un desafío"
          eyebrow="Sin ayuda"
          descripcion="Los mismos ejercicios, pero con las pistas desactivadas. Es la forma de comprobar si el método ya está interiorizado o si todavía depende de la orientación."
        >
          <div className="flex flex-col gap-4">
            {porDificultad('intermedio').length > 0 && (
              <ListaEjercicios titulo="Nivel intermedio" ids={porDificultad('intermedio').map((e) => e.id)} />
            )}
            {porDificultad('avanzado').length > 0 && (
              <ListaEjercicios titulo="Nivel avanzado" ids={porDificultad('avanzado').map((e) => e.id)} />
            )}
            {porDificultad('intermedio').length === 0 && porDificultad('avanzado').length === 0 && (
              <Vacio
                titulo="Este módulo aún no tiene ejercicios de desafío"
                descripcion="El docente puede generar variantes desde el generador de ejercicios, o crear ejercicios propios en el panel docente."
              />
            )}
          </div>
        </Seccion>
      )}

      {etapa === 'interpretar' && (
        <Seccion titulo="Interpretar el resultado" eyebrow="Del número a la decisión">
          <div className="flex flex-col gap-4">
            <Interpretacion texto={contenido.interpretacionGerencial} titulo="Lectura gerencial del método" />

            <Tarjeta titulo="Aplicación en el contexto agropecuario">
              <p className="prosa" style={{ color: 'var(--tinta-media)' }}>
                {contenido.aplicacionAgropecuaria}
              </p>
            </Tarjeta>

            <Tarjeta titulo="Resumen del módulo">
              <p className="prosa">{contenido.resumen}</p>
            </Tarjeta>
          </div>
        </Seccion>
      )}

      {etapa === 'evaluar' && (
        <Seccion
          titulo="Autoevaluarse y generar el reporte"
          eyebrow="Cierre del módulo"
          descripcion="El modo evaluación oculta pistas y soluciones, registra el tiempo empleado y produce una hoja de resultados exportable."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Tarjeta titulo="Autoevaluación" descripcion="Resuelva cualquier ejercicio del módulo con el modo evaluación activo.">
              <a href={enlaces.evaluacion} className="boton boton-primario boton-pequeno no-underline">
                Ir al modo evaluación
              </a>
            </Tarjeta>
            <Tarjeta titulo="Reporte individual" descripcion="Genere el informe de su desempeño en este módulo, listo para imprimir o exportar.">
              <a href={enlaces.reportes} className="boton boton-secundario boton-pequeno no-underline">
                Ir al centro de reportes
              </a>
            </Tarjeta>
          </div>
        </Seccion>
      )}

      <Tarjeta titulo="Fuentes consultadas" descripcion="Solo referencias verificables, tomadas de los materiales del curso.">
        <ul className="flex flex-col gap-2 text-[0.8125rem]">
          {contenido.fuenteIds.map((id) => {
            const f = fuentePorId(id);
            if (f === null) return null;
            return (
              <li key={id} className="prosa" style={{ color: 'var(--tinta-media)' }}>
                {f.cita}
                {f.archivo !== null && (
                  <span className="ml-1 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                    ({f.archivo})
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Tarjeta>
    </div>
  );
}

function EnlaceEjercicio({ id, etiqueta }: { id: string; etiqueta: string }): ReactNode {
  const tienda = usarTienda();
  const ejercicio = tienda.ejercicios.find((e) => e.id === id);

  if (ejercicio === undefined) {
    return <Vacio titulo="Ejercicio no disponible" descripcion={`No se encontró el ejercicio ${id} en la biblioteca.`} />;
  }

  return (
    <Tarjeta
      titulo={ejercicio.titulo}
      descripcion={`${ejercicio.metodo} · ${NOMBRE_DIFICULTAD[ejercicio.dificultad]} · ${ejercicio.tiempoEstimadoMinutos} min estimados`}
      acciones={
        <a href={enlaces.ejercicio(ejercicio.id)} className="boton boton-primario boton-pequeno no-underline">
          {etiqueta}
        </a>
      }
    >
      <TextoFormateado texto={ejercicio.enunciado.split('\n\n').slice(0, 2).join('\n\n')} className="text-[0.875rem]" />
    </Tarjeta>
  );
}

function ListaEjercicios({ titulo, ids }: { titulo: string; ids: readonly string[] }): ReactNode {
  const tienda = usarTienda();

  return (
    <Tarjeta titulo={titulo} plana>
      <ul className="flex flex-col gap-1.5">
        {ids.map((id) => {
          const e = tienda.ejercicios.find((x) => x.id === id);
          if (e === undefined) return null;
          return (
            <li key={id} className="flex flex-wrap items-center justify-between gap-2">
              <a href={enlaces.ejercicio(id)} className="text-[0.875rem]">
                {e.titulo}
              </a>
              <span className="flex gap-1.5">
                <Distintivo tono="neutro">{e.tiempoEstimadoMinutos} min</Distintivo>
                {e.inconsistencias.length > 0 && <Distintivo tono="avisar">auditoría</Distintivo>}
              </span>
            </li>
          );
        })}
      </ul>
    </Tarjeta>
  );
}
