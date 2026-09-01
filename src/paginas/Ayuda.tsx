/**
 * Ayuda y glosario general: cómo usar la aplicación y todos los términos de los
 * trece módulos en un solo lugar buscable.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { NOMBRE_TEMA, TEMAS, type Tema } from '@/esquemas';
import { contenidoDe } from '@/datos/modulos';
import { enlaces } from '@/rutas';
import { CampoTexto, Distintivo, Plegable, Seccion, Selector, Tarjeta, TextoFormateado } from '@/ui/base';

export function PaginaAyuda(): ReactNode {
  const [busqueda, setBusqueda] = useState('');
  const [tema, setTema] = useState<Tema | 'todos'>('todos');

  const terminos = useMemo(() => {
    const normalizar = (s: string): string =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
    const texto = normalizar(busqueda);

    return TEMAS.filter((t) => tema === 'todos' || t === tema)
      .flatMap((t) => contenidoDe(t).glosario.map((g) => ({ ...g, tema: t })))
      .filter((g) => texto === '' || normalizar(g.termino).includes(texto) || normalizar(g.definicion).includes(texto))
      .sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
  }, [busqueda, tema]);

  return (
    <Seccion
      titulo="Ayuda y glosario"
      eyebrow="Cómo usar OPTIAULA IO"
      descripcion={`Guía rápida de los cuatro modos de uso y glosario completo de los ${TEMAS.length} módulos.`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo="Modo estudiante" descripcion="El modo por defecto.">
          <ul className="prosa flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            <li>Estudie la teoría en el módulo y practique en el laboratorio.</li>
            <li>Las pistas son graduadas: cada una consumida reduce el puntaje de la pregunta.</li>
            <li>«Mostrar siguiente paso» revela el procedimiento de a poco, no todo de golpe.</li>
            <li>Cada intento queda registrado y alimenta el panel de progreso.</li>
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Modo docente" descripcion="Administración de la biblioteca y del curso.">
          <ul className="prosa flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            <li>Cree, duplique, edite y elimine ejercicios propios.</li>
            <li>Importe matrices pegándolas desde Excel o desde un CSV.</li>
            <li>Genere variantes reproducibles a partir de una semilla.</li>
            <li>Revise la auditoría de datos y decida qué hacer con cada inconsistencia.</li>
            <li>Controle si el estudiante ve pistas, soluciones y atribuciones.</li>
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Modo proyección" descripcion="Para explicar frente a la clase.">
          <ul className="prosa flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            <li>La tipografía crece un 35 % y la navegación lateral desaparece.</li>
            <li>El procedimiento avanza un paso a la vez, con controles grandes.</li>
            <li>Los resultados se pueden ocultar para que la clase los anticipe antes de revelarlos.</li>
            <li>Las animaciones de los recorridos hacia adelante y hacia atrás se pueden pausar.</li>
          </ul>
        </Tarjeta>

        <Tarjeta titulo="Modo evaluación" descripcion="Para exámenes y autoevaluación.">
          <ul className="prosa flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            <li>Se ocultan pistas y respuestas correctas.</li>
            <li>Se registra el tiempo empleado desde que se abre el ejercicio.</li>
            <li>La calificación es automática cuando el resultado es verificable.</li>
            <li>Las preguntas de interpretación quedan marcadas para revisión del docente.</li>
            <li>Funciona sin conexión y sin servidor.</li>
          </ul>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Preguntas frecuentes">
        <div className="flex flex-col gap-2">
          <Plegable titulo="¿Se pierden mis datos si cierro el navegador?">
            <TextoFormateado texto="No. Todo se guarda en IndexedDB, el almacenamiento local del navegador. Se pierde si borra los datos del sitio o si usa una ventana privada. Para conservarlo entre equipos, descargue un respaldo JSON desde Configuración y restáurelo en el otro equipo." />
          </Plegable>

          <Plegable titulo="¿Funciona sin internet?">
            <TextoFormateado texto="Sí. Después de la primera carga, la aplicación queda instalada como PWA y funciona sin conexión: el motor de cálculo, los diagramas, la biblioteca y las exportaciones se ejecutan por completo en su navegador. No hay ninguna llamada a un servidor externo." />
          </Plegable>

          <Plegable titulo="¿Por qué algunos ejercicios muestran una advertencia de auditoría?">
            <TextoFormateado
              texto={
                'Porque los materiales originales contienen discrepancias reales, como un enunciado que dice «3 camiones» junto a una tabla con cuatro. ' +
                'La aplicación **no corrige nada en silencio**: conserva el dato original, muestra la advertencia y espera a que el docente decida en el panel de Auditoría de datos.'
              }
            />
          </Plegable>

          <Plegable titulo="¿Puedo confiar en los resultados del motor?">
            <TextoFormateado
              texto={
                'El motor tiene pruebas automatizadas que verifican cada método contra los valores de los materiales del curso y, en asignación y distribución, ' +
                'contra soluciones calculadas por fuerza bruta de forma independiente. Aun así, en la clave docente cada resultado se presenta como referencia: verifíquelo antes de usarlo para calificar.'
              }
            />
          </Plegable>

          <Plegable titulo="¿La aplicación usa inteligencia artificial?">
            <TextoFormateado
              texto={
                'No en esta versión. Toda la retroalimentación proviene de un motor determinista de reglas que reconoce los errores típicos de cada tema. ' +
                'Existe una arquitectura preparada para conectar un asistente en el futuro, pero está desactivada y la aplicación no la necesita para nada.'
              }
            />
          </Plegable>

          <Plegable titulo="¿Puedo usar dólares en lugar de lempiras?">
            <TextoFormateado
              texto={
                'Sí, en los módulos de productividad, punto de equilibrio y transporte. La regla es que **un cálculo nunca mezcla monedas**: ' +
                'si necesita el resultado en otra moneda, convierta al final, no en el camino. La aplicación bloquea las comparaciones entre periodos en monedas distintas.'
              }
            />
          </Plegable>

          <Plegable titulo="¿Cómo exporto un diagrama o una gráfica?">
            <TextoFormateado texto="Cada diagrama y cada gráfica tienen botones «Exportar SVG» y «Exportar PNG» debajo. El SVG conserva la calidad a cualquier tamaño y se puede editar; el PNG se pega directo en una presentación." />
          </Plegable>
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Glosario general"
        descripcion={`${terminos.length} término(s) de los ${TEMAS.length} módulos.`}
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Buscar término" valor={busqueda} alCambiar={setBusqueda} marcador="holgura, margen, degeneración…" />
          <Selector
            etiqueta="Filtrar por módulo"
            valor={tema}
            opciones={[{ valor: 'todos' as const, texto: 'Todos los módulos' }, ...TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))]}
            alCambiar={(v) => setTema(v as Tema | 'todos')}
          />
        </div>

        {terminos.length === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Ningún término coincide con la búsqueda.
          </p>
        ) : (
          <dl className="grid gap-2.5 sm:grid-cols-2">
            {terminos.map((g, i) => (
              <div key={`${g.tema}-${i}`} className="tarjeta-plana p-2.5">
                <dt className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-[0.875rem]">{g.termino}</span>
                  <a href={enlaces.modulo(g.tema)} className="no-underline">
                    <Distintivo tono="neutro">{NOMBRE_TEMA[g.tema]}</Distintivo>
                  </a>
                </dt>
                <dd className="mt-1 text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  {g.definicion}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Tarjeta>

      <Tarjeta titulo="Accesibilidad">
        <ul className="prosa flex list-disc flex-col gap-1.5 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
          <li>Toda la aplicación se puede recorrer con el teclado; el primer tabulador ofrece «Saltar al contenido».</li>
          <li>El editor de plano de bloques admite selección con Enter o barra espaciadora, no solo arrastre con el ratón.</li>
          <li>Cada gráfica y cada diagrama tienen una descripción textual que los lectores de pantalla anuncian.</li>
          <li>El estado nunca se comunica solo con color: siempre hay además texto o forma.</li>
          <li>Las animaciones respetan la preferencia del sistema de reducir movimiento, y se pueden desactivar en Configuración.</li>
          <li>La tipografía de cuerpo es Atkinson Hyperlegible, diseñada específicamente para máxima legibilidad.</li>
        </ul>
      </Tarjeta>
    </Seccion>
  );
}
