/**
 * Créditos, fuentes y trazabilidad de los datos.
 */

import type { ReactNode } from 'react';
import { IDENTIDAD, ubicacionCompleta } from '@/config/identidad';
import { FUENTES } from '@/datos/fuentes';
import { usarTienda } from '@/almacen/tienda';
import { NOMBRE_TEMA, TEMAS } from '@/esquemas';
import { enlaces } from '@/rutas';
import { Distintivo, Indicador, Seccion, Tarjeta } from '@/ui/base';

export function PaginaCreditos(): ReactNode {
  const tienda = usarTienda();

  const porOrigen = (origen: string): number => tienda.ejercicios.filter((e) => e.origen === origen).length;

  const bibliograficas = FUENTES.filter((f) => f.tipo === 'libro');
  const delCurso = FUENTES.filter((f) => f.tipo !== 'libro');

  return (
    <Seccion
      titulo="Créditos y fuentes"
      eyebrow={`${IDENTIDAD.nombre} v${IDENTIDAD.version}`}
      descripcion="Toda la biblioteca declara su procedencia. No se inventó ninguna referencia bibliográfica: las cinco obras citadas provienen literalmente del documento de fundamentos del curso."
    >
      <Tarjeta titulo="Autoría">
        <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
          <Fila termino="Autor del contenido" valor={`${IDENTIDAD.autor.titulo} ${IDENTIDAD.autor.nombre}`} />
          <Fila termino="Institución" valor={IDENTIDAD.institucion.nombre} />
          <Fila termino="Ubicación" valor={ubicacionCompleta()} />
          <Fila termino="Curso" valor={IDENTIDAD.curso.nombre} />
          <Fila termino="Idioma" valor="Español" />
          <Fila termino="Moneda predeterminada" valor="Lempira hondureño (L)" />
        </dl>

        <p className="mt-3 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          El logotipo oficial de la Universidad Nacional de Agricultura no se incluye porque no fue suministrado entre los
          materiales. El espacio está reservado en el archivo central de identidad y en el encabezado de los reportes.
        </p>
      </Tarjeta>

      <div className="grid gap-3 sm:grid-cols-4">
        <Indicador etiqueta="Transcritos del material" valor={porOrigen('textual')} tono="bien" nota="Copiados literalmente" />
        <Indicador etiqueta="Derivados" valor={porOrigen('derivado')} tono="avisar" nota="Construidos sobre datos verificados" />
        <Indicador etiqueta="Generados" valor={porOrigen('generado')} nota="Producidos y verificados por el motor" />
        <Indicador etiqueta="Creados por el docente" valor={porOrigen('docente')} />
      </div>

      <Tarjeta
        titulo="Bibliografía"
        descripcion="Tomada textualmente de «Fundamentos de Gestión de Operaciones» (Universidad Nacional de Agricultura, 2025)."
      >
        <ul className="flex flex-col gap-2.5">
          {bibliograficas.map((f) => (
            <li key={f.id} className="prosa text-[0.875rem]">
              {f.cita}
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Materiales del curso utilizados" descripcion="Cada ejercicio de la biblioteca enlaza con el archivo del que se extrajo.">
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Referencia</th>
                <th scope="col">Archivo</th>
                <th scope="col">Tipo</th>
                <th scope="col" className="text-right">Ejercicios</th>
              </tr>
            </thead>
            <tbody>
              {delCurso.map((f) => (
                <tr key={f.id}>
                  <td className="text-[0.8125rem]">{f.cita}</td>
                  <td className="dato text-xs">{f.archivo ?? '—'}</td>
                  <td>
                    <Distintivo tono="neutro">{f.tipo === 'documento_curso' ? 'documento' : 'presentación'}</Distintivo>
                  </td>
                  <td className="numero">{tienda.ejercicios.filter((e) => e.fuenteId === f.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Cobertura por módulo">
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col" className="text-right">Ejercicios</th>
                <th scope="col" className="text-right">Transcritos</th>
                <th scope="col" className="text-right">Derivados</th>
                <th scope="col" className="text-right">Con inconsistencias</th>
              </tr>
            </thead>
            <tbody>
              {TEMAS.map((tema) => {
                const del = tienda.ejercicios.filter((e) => e.tema === tema);
                return (
                  <tr key={tema}>
                    <td>
                      <a href={enlaces.modulo(tema)}>{NOMBRE_TEMA[tema]}</a>
                    </td>
                    <td className="numero">{del.length}</td>
                    <td className="numero">{del.filter((e) => e.origen === 'textual').length}</td>
                    <td className="numero">{del.filter((e) => e.origen === 'derivado').length}</td>
                    <td className="numero">{del.filter((e) => e.inconsistencias.length > 0).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Integridad académica">
        <ul className="prosa flex list-disc flex-col gap-2 pl-5 text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
          <li>
            La aplicación está diseñada para enseñar, no para entregar respuestas: el procedimiento se revela paso a paso y las
            pistas son graduadas, con penalización de puntaje.
          </li>
          <li>
            En modo evaluación se ocultan pistas y soluciones, se registra el tiempo y quedan asentados todos los intentos.
          </li>
          <li>
            Las preguntas de interpretación no se califican automáticamente: se marcan para revisión del docente, porque
            calificar una explicación con reglas produciría falsos negativos.
          </li>
          <li>
            No se inventó bibliografía, autores, fórmulas ni fuentes. Los ejercicios que no son transcripción literal se
            marcan como «derivados» y declaran en sus notas qué dato viene del material y cuál se agregó.
          </li>
          <li>
            Cualquier texto que en el futuro produzca un modelo de lenguaje llevará una declaración visible de que fue
            generado automáticamente. En esta versión no hay ninguno.
          </li>
          <li>
            Los archivos de calificaciones de los materiales, que contienen nombres y notas de estudiantes reales, quedaron
            excluidos por completo de la aplicación.
          </li>
        </ul>
      </Tarjeta>

      <Tarjeta titulo="Tecnología">
        <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
          Aplicación web instalable construida con React, TypeScript en modo estricto, Vite y Tailwind CSS. Las fórmulas se
          componen con KaTeX y los datos se validan con Zod. Los diagramas y gráficas son SVG escrito a mano, sin librerías de
          visualización, para controlar la accesibilidad y la exportación. El almacenamiento local usa IndexedDB. No hay
          servidor, no hay cuentas y no hay servicios de pago.
        </p>
      </Tarjeta>
    </Seccion>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }): ReactNode {
  return (
    <div className="flex flex-wrap gap-1.5">
      <dt className="etiqueta">{termino}:</dt>
      <dd>{valor}</dd>
    </div>
  );
}
