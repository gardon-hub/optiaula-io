/**
 * Laboratorio interactivo de un tema.
 *
 * Permite elegir cualquier ejercicio del tema como punto de partida, o empezar
 * con los datos del primero y modificarlos libremente. El comportamiento se
 * ajusta al modo activo: en proyección se muestra todo con tipografía grande,
 * en evaluación se ocultan los resultados.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NOMBRE_DIFICULTAD, NOMBRE_TEMA, NUMERO_MODULO, type Tema } from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { contenidoDe } from '@/datos/modulos';
import { enlaces } from '@/rutas';
import { CreditoAutor, Distintivo, DistintivosAuditoria, Selector, TextoFormateado, Vacio } from '@/ui/base';
import { Laboratorio } from '@/laboratorios';

export function PaginaLaboratorio({ tema }: { tema: Tema }): ReactNode {
  const tienda = usarTienda();
  const contenido = contenidoDe(tema);

  const ejercicios = useMemo(() => tienda.ejercicios.filter((e) => e.tema === tema), [tienda.ejercicios, tema]);
  const [ejercicioId, setEjercicioId] = useState<string>(() => contenido.ejemploResueltoId);

  const ejercicio = ejercicios.find((e) => e.id === ejercicioId) ?? ejercicios[0] ?? null;

  const modo = tienda.configuracion.modo;
  const enProyeccion = modo === 'proyeccion';
  const enEvaluacion = modo === 'evaluacion';
  const revelarTodo = modo === 'docente';
  const ocultarResultados = enProyeccion;

  if (ejercicio === null) {
    return (
      <Vacio
        titulo={`El módulo ${NOMBRE_TEMA[tema]} no tiene ejercicios cargados`}
        descripcion="El laboratorio necesita al menos un ejercicio del tema para arrancar. Cree uno desde el panel docente o genérelo con el generador."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="min-w-0">
            <p className="etiqueta">
              Laboratorio · Módulo {NUMERO_MODULO[tema]} · {NOMBRE_TEMA[tema]}
            </p>
            <h1>{ejercicio.titulo}</h1>
          </div>

          <div className="flex flex-wrap items-end gap-2 ocultar-en-proyeccion">
            <div className="w-72">
              <Selector
                etiqueta="Datos de partida"
                valor={ejercicio.id}
                opciones={ejercicios.map((e) => ({ valor: e.id, texto: `${e.titulo} (${NOMBRE_DIFICULTAD[e.dificultad]})` }))}
                alCambiar={setEjercicioId}
              />
            </div>
            <a href={enlaces.modulo(tema)} className="boton boton-secundario boton-pequeno no-underline">
              Teoría del módulo
            </a>
            <a href={enlaces.ejercicio(ejercicio.id)} className="boton boton-primario boton-pequeno no-underline">
              Responder preguntas
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Distintivo tono="neutro">{ejercicio.metodo}</Distintivo>
          <Distintivo tono="neutro">{NOMBRE_DIFICULTAD[ejercicio.dificultad]}</Distintivo>
          <DistintivosAuditoria ids={ejercicio.inconsistencias} inconsistencias={tienda.inconsistencias} />
          {enEvaluacion && <Distintivo tono="mal">Modo evaluación: sin pistas ni soluciones</Distintivo>}
          {enProyeccion && <Distintivo tono="acento">Modo proyección</Distintivo>}
        </div>
      </header>

      <section className="tarjeta-plana p-4">
        <p className="etiqueta mb-2">Enunciado</p>
        <TextoFormateado texto={ejercicio.enunciado} />
      </section>

      <Laboratorio
        key={ejercicio.id}
        datos={ejercicio.datos}
        titulo={ejercicio.titulo}
        revelarTodo={revelarTodo}
        ocultarResultados={ocultarResultados}
      />

      <p className="text-xs ocultar-en-proyeccion" style={{ color: 'var(--tinta-tenue)' }}>
        Los valores de este laboratorio son editables: modifíquelos y observe el efecto. Cambiarlos aquí no altera el
        ejercicio guardado en la biblioteca.
      </p>

      <CreditoAutor origen={ejercicio.origen} />
    </div>
  );
}
