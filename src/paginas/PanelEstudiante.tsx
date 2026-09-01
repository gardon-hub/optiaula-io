/**
 * Panel del estudiante: perfil local, progreso por tema, errores cometidos y
 * acceso a su informe individual.
 */

import { useState, type ReactNode } from 'react';
import { NOMBRE_TEMA, TEMAS } from '@/esquemas';
import { intentosDelPerfil, perfilActual, progresoGeneral, temaRecomendado, usarTienda } from '@/almacen/tienda';
import { enlaces } from '@/rutas';
import { BarraProgreso, CampoTexto, Distintivo, Indicador, Seccion, Tarjeta, Vacio } from '@/ui/base';
import { duracionLegible, fechaCorta } from '@/export/exportar';
import { formatearNumero } from '@/nucleo/numero';

export function PanelEstudiante(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);
  const [nombre, setNombre] = useState('');
  const [matricula, setMatricula] = useState('');

  const intentos = intentosDelPerfil(tienda, tienda.perfilActualId);
  const completados = intentos.filter((i) => i.completado);
  const tiempoTotal = completados.reduce((s, i) => s + i.segundosEmpleados, 0);
  const recomendado = temaRecomendado(tienda);

  const erroresPorCodigo = new Map<string, number>();
  for (const i of completados) {
    for (const c of i.erroresDetectados) erroresPorCodigo.set(c, (erroresPorCodigo.get(c) ?? 0) + 1);
  }
  const erroresOrdenados = [...erroresPorCodigo.entries()].sort((a, b) => b[1] - a[1]);

  if (perfil === null) {
    return (
      <Seccion
        titulo="Panel del estudiante"
        eyebrow="Perfil local"
        descripcion="Cree un perfil para guardar su avance. Los datos se quedan en este navegador: no se envían a ningún servidor y no hace falta registrarse."
      >
        <Tarjeta titulo="Nuevo perfil">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <CampoTexto etiqueta="Nombre" valor={nombre} alCambiar={setNombre} marcador="Su nombre completo" />
              <CampoTexto
                etiqueta="Matrícula (opcional)"
                valor={matricula}
                alCambiar={setMatricula}
                ayuda="Solo se usa para identificar sus reportes. Nunca sale de este equipo."
              />
            </div>
            <div>
              <button
                type="button"
                className="boton boton-primario"
                disabled={nombre.trim() === ''}
                onClick={() => {
                  tienda.crearPerfil(nombre.trim(), 'estudiante', matricula.trim());
                  setNombre('');
                  setMatricula('');
                }}
              >
                Crear perfil
              </button>
            </div>
          </div>
        </Tarjeta>

        {tienda.perfiles.length > 0 && (
          <Tarjeta titulo="Perfiles existentes en este equipo">
            <ul className="flex flex-col gap-2">
              {tienda.perfiles.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {p.nombre} <Distintivo tono="neutro">{p.rol}</Distintivo>
                  </span>
                  <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => tienda.seleccionarPerfil(p.id)}>
                    Usar este perfil
                  </button>
                </li>
              ))}
            </ul>
          </Tarjeta>
        )}
      </Seccion>
    );
  }

  return (
    <Seccion
      titulo={`Panel de ${perfil.nombre}`}
      eyebrow="Estudiante"
      descripcion="Su avance, sus intentos y los errores que más ha repetido. Todo guardado localmente."
      acciones={
        <div className="flex flex-wrap gap-2">
          <a href={enlaces.reportes} className="boton boton-primario boton-pequeno no-underline">
            Generar informe individual
          </a>
          <button type="button" className="boton boton-suave boton-pequeno" onClick={() => tienda.seleccionarPerfil(null)}>
            Cambiar de perfil
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Progreso general" valor={`${progresoGeneral(tienda)} %`} tono={progresoGeneral(tienda) >= 70 ? 'bien' : 'acento'} />
        <Indicador etiqueta="Ejercicios completados" valor={completados.length} nota={`de ${tienda.ejercicios.length} disponibles`} />
        <Indicador etiqueta="Tiempo dedicado" valor={duracionLegible(tiempoTotal)} />
        <Indicador etiqueta="Siguiente tema" valor={<span className="text-base">{NOMBRE_TEMA[recomendado]}</span>} tono="avisar" />
      </div>

      <Tarjeta titulo="Progreso por tema">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TEMAS.map((tema) => {
            const p = tienda.progreso.find((x) => x.tema === tema);
            return (
              <div key={tema} className="tarjeta-plana flex flex-col gap-2 p-3">
                <a href={enlaces.modulo(tema)} className="text-[0.875rem] font-medium">
                  {NOMBRE_TEMA[tema]}
                </a>
                <BarraProgreso valor={p?.dominio ?? 0} etiqueta="Dominio" />
                <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                  {p?.ejerciciosResueltos ?? 0} intento(s) · {p?.ejerciciosCorrectos ?? 0} con 70 % o más
                </p>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta
        titulo="Errores que ha cometido"
        descripcion="El motor identifica errores típicos por su código. Repetir el mismo error señala un concepto que conviene repasar."
      >
        {erroresOrdenados.length === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Todavía no hay errores registrados. Aparecerán aquí cuando resuelva ejercicios y el motor reconozca un error típico.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {erroresOrdenados.map(([codigo, veces]) => (
              <li key={codigo} className="flex items-center justify-between gap-3">
                <span className="dato text-[0.8125rem]">{codigo}</span>
                <Distintivo tono={veces >= 3 ? 'mal' : 'avisar'}>
                  {veces} vez{veces === 1 ? '' : 'ces'}
                </Distintivo>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Últimos intentos">
        {completados.length === 0 ? (
          <Vacio titulo="Sin intentos todavía" descripcion="Resuelva un ejercicio de la biblioteca para empezar a registrar avance." />
        ) : (
          <div className="contenedor-tabla">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Ejercicio</th>
                  <th scope="col">Modo</th>
                  <th scope="col" className="text-right">Puntaje</th>
                  <th scope="col" className="text-right">Tiempo</th>
                  <th scope="col">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {[...completados]
                  .sort((a, b) => b.iniciadoEn.localeCompare(a.iniciadoEn))
                  .slice(0, 12)
                  .map((i) => {
                    const e = tienda.ejercicios.find((x) => x.id === i.ejercicioId);
                    const pct = i.puntajeMaximo > 0 ? (i.puntaje / i.puntajeMaximo) * 100 : 0;
                    return (
                      <tr key={i.id}>
                        <td>
                          <a href={enlaces.ejercicio(i.ejercicioId)}>{e?.titulo ?? i.ejercicioId}</a>
                        </td>
                        <td>
                          <Distintivo tono={i.modo === 'evaluacion' ? 'avisar' : 'neutro'}>{i.modo}</Distintivo>
                        </td>
                        <td className="numero" style={{ color: pct >= 70 ? 'var(--bien)' : 'var(--avisar)' }}>
                          {i.puntajeMaximo === 0 ? '—' : `${formatearNumero(pct, { decimales: 0 })} %`}
                        </td>
                        <td className="numero">{duracionLegible(i.segundosEmpleados)}</td>
                        <td>{fechaCorta(i.iniciadoEn)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </Seccion>
  );
}
