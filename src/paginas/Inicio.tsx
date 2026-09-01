/**
 * Página de inicio: progreso general, último tema estudiado, próxima
 * actividad, acceso rápido a los laboratorios, resultados recientes y
 * recomendación del siguiente tema.
 */

import type { ReactNode } from 'react';
import { IDENTIDAD, ubicacionCompleta } from '@/config/identidad';
import { NOMBRE_TEMA, NUMERO_MODULO, TEMAS } from '@/esquemas';
import {
  intentosDelPerfil,
  perfilActual,
  progresoGeneral,
  temaRecomendado,
  ultimoTemaVisitado,
  usarTienda,
} from '@/almacen/tienda';
import { enlaces } from '@/rutas';
import { contenidoDe } from '@/datos/modulos';
import { BarraProgreso, Distintivo, Indicador, Seccion, Tarjeta, Vacio } from '@/ui/base';
import { fechaCorta } from '@/export/exportar';
import { formatearNumero } from '@/nucleo/numero';

export function PaginaInicio(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);
  const general = progresoGeneral(tienda);
  const recomendado = temaRecomendado(tienda);
  const ultimo = ultimoTemaVisitado(tienda);
  const intentos = intentosDelPerfil(tienda, tienda.perfilActualId);
  const recientes = [...intentos].sort((a, b) => b.iniciadoEn.localeCompare(a.iniciadoEn)).slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="etiqueta">
          {IDENTIDAD.institucion.nombre} · {ubicacionCompleta()}
        </p>
        <h1>{IDENTIDAD.subtitulo}</h1>
        <p className="prosa" style={{ color: 'var(--tinta-media)' }}>
          Diez módulos, un laboratorio interactivo por tema y una biblioteca de {tienda.ejercicios.length} ejercicios con
          contexto agropecuario y agroindustrial. Cada método se explica paso a paso, se puede manipular, y termina en una
          interpretación gerencial: qué decidiría alguien con ese resultado en la mano.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <Tarjeta
          titulo={perfil === null ? 'Comience por identificarse' : `Continuar donde quedó, ${perfil.nombre}`}
          descripcion={
            perfil === null
              ? 'Cree un perfil local para guardar su avance. Los datos se quedan en este navegador: no hay cuenta ni servidor.'
              : ultimo === null
                ? 'Todavía no ha estudiado ningún tema. La secuencia del curso empieza por los fundamentos.'
                : `Su último tema fue ${NOMBRE_TEMA[ultimo]}.`
          }
          acciones={
            <a href={perfil === null ? enlaces.estudiante : enlaces.modulo(ultimo ?? recomendado)} className="boton boton-primario no-underline">
              {perfil === null ? 'Crear perfil' : ultimo === null ? 'Empezar el módulo 1' : 'Continuar'}
            </a>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador etiqueta="Progreso general" valor={`${general} %`} tono={general >= 70 ? 'bien' : 'acento'} nota={`Promedio de los ${TEMAS.length} módulos`} />
            <Indicador etiqueta="Ejercicios resueltos" valor={intentos.filter((i) => i.completado).length} nota={`de ${tienda.ejercicios.length} disponibles`} />
            <Indicador
              etiqueta="Próxima actividad"
              valor={<span className="text-base">{NOMBRE_TEMA[recomendado]}</span>}
              tono="avisar"
              nota="Recomendado por su nivel de dominio"
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Recomendación" descripcion="El tema con menor dominio en el orden del curso.">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="dato flex h-8 w-8 items-center justify-center rounded-lg font-bold"
                style={{ background: 'var(--acento)', color: 'var(--acento-contraste)' }}
              >
                {NUMERO_MODULO[recomendado]}
              </span>
              <div className="min-w-0">
                <p className="font-bold">{NOMBRE_TEMA[recomendado]}</p>
                <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                  Dominio actual: {tienda.progreso.find((p) => p.tema === recomendado)?.dominio ?? 0} %
                </p>
              </div>
            </div>

            <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
              {contenidoDe(recomendado).resultadoAprendizaje}
            </p>

            <div className="flex flex-wrap gap-2">
              <a href={enlaces.modulo(recomendado)} className="boton boton-primario boton-pequeno no-underline">
                Estudiar el módulo
              </a>
              <a href={enlaces.laboratorio(recomendado)} className="boton boton-secundario boton-pequeno no-underline">
                Ir al laboratorio
              </a>
            </div>
          </div>
        </Tarjeta>
      </div>

      <Seccion
        titulo="Acceso rápido a los laboratorios"
        eyebrow={`Los ${TEMAS.length} módulos`}
        descripcion="Cada laboratorio permite manipular los datos y ver cómo cambia el resultado, con el procedimiento completo explicado paso a paso."
        acciones={
          <a href={enlaces.modulos} className="boton boton-secundario boton-pequeno no-underline">
            Ver el catálogo completo
          </a>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map((tema) => {
            const progreso = tienda.progreso.find((p) => p.tema === tema);
            const cantidad = tienda.ejercicios.filter((e) => e.tema === tema).length;
            return (
              <a
                key={tema}
                href={enlaces.laboratorio(tema)}
                className="tarjeta flex flex-col gap-2.5 p-4 no-underline transition-colors hover:border-[var(--acento)]"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className="dato flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                    style={{ background: 'var(--acento-suave)', color: 'var(--acento)' }}
                  >
                    {NUMERO_MODULO[tema]}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold leading-tight" style={{ color: 'var(--tinta)' }}>
                      {NOMBRE_TEMA[tema]}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                      {cantidad} ejercicio{cantidad === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <BarraProgreso valor={progreso?.dominio ?? 0} etiqueta="Dominio" />
              </a>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Resultados recientes" eyebrow="Historial">
        {recientes.length === 0 ? (
          <Vacio
            titulo="Todavía no hay intentos registrados"
            descripcion="Cuando resuelva un ejercicio en modo práctica, desafío o evaluación, el resultado aparecerá aquí y alimentará su panel de progreso."
            accion={
              <a href={enlaces.biblioteca} className="boton boton-primario boton-pequeno no-underline">
                Abrir la biblioteca de ejercicios
              </a>
            }
          />
        ) : (
          <div className="contenedor-tabla">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Ejercicio</th>
                  <th scope="col">Tema</th>
                  <th scope="col">Modo</th>
                  <th scope="col" className="text-right">Puntaje</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recientes.map((i) => {
                  const ejercicio = tienda.ejercicios.find((e) => e.id === i.ejercicioId);
                  const porcentaje = i.puntajeMaximo > 0 ? (i.puntaje / i.puntajeMaximo) * 100 : 0;
                  return (
                    <tr key={i.id}>
                      <td>
                        <a href={enlaces.ejercicio(i.ejercicioId)}>{ejercicio?.titulo ?? i.ejercicioId}</a>
                      </td>
                      <td>{NOMBRE_TEMA[i.tema]}</td>
                      <td>
                        <Distintivo tono={i.modo === 'evaluacion' ? 'avisar' : 'neutro'}>{i.modo}</Distintivo>
                      </td>
                      <td className="numero">
                        {i.puntajeMaximo === 0 ? (
                          '—'
                        ) : (
                          <span style={{ color: porcentaje >= 70 ? 'var(--bien)' : 'var(--avisar)' }}>
                            {formatearNumero(porcentaje, { decimales: 0 })} %
                          </span>
                        )}
                      </td>
                      <td>{fechaCorta(i.iniciadoEn)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </div>
  );
}
