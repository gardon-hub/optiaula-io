/**
 * Catálogo de los trece módulos, en el orden del programa del curso.
 */

import type { ReactNode } from 'react';
import { NOMBRE_TEMA, NUMERO_MODULO, TEMAS } from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { contenidoDe } from '@/datos/modulos';
import { enlaces } from '@/rutas';
import { BarraProgreso, Distintivo, Seccion, Tarjeta } from '@/ui/base';

export function CatalogoModulos(): ReactNode {
  const tienda = usarTienda();

  return (
    <Seccion
      titulo="Catálogo de módulos"
      eyebrow="Programa del curso"
      descripcion="Cada módulo sigue la misma secuencia: explorar, comprender, ver un ejemplo resuelto, practicar con orientación, resolver un desafío, interpretar el resultado, autoevaluarse y generar un reporte."
    >
      <div className="flex flex-col gap-3">
        {TEMAS.map((tema) => {
          const contenido = contenidoDe(tema);
          const progreso = tienda.progreso.find((p) => p.tema === tema);
          const ejercicios = tienda.ejercicios.filter((e) => e.tema === tema);
          const conInconsistencia = ejercicios.filter((e) => e.inconsistencias.length > 0).length;

          return (
            <Tarjeta key={tema}>
              <div className="grid gap-4 lg:grid-cols-[3rem_1fr_minmax(0,14rem)]">
                <div
                  className="dato flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold"
                  style={{ background: 'var(--acento-suave)', color: 'var(--acento)' }}
                  aria-hidden="true"
                >
                  {NUMERO_MODULO[tema]}
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3>{NOMBRE_TEMA[tema]}</h3>
                    <Distintivo tono="neutro">
                      {ejercicios.length} ejercicio{ejercicios.length === 1 ? '' : 's'}
                    </Distintivo>
                    {conInconsistencia > 0 && (
                      <Distintivo tono="avisar" titulo="Ejercicios con inconsistencias registradas en la auditoría">
                        {conInconsistencia} con auditoría
                      </Distintivo>
                    )}
                  </div>

                  <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
                    {contenido.resultadoAprendizaje}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={enlaces.modulo(tema)} className="boton boton-primario boton-pequeno no-underline">
                      Estudiar
                    </a>
                    <a href={enlaces.laboratorio(tema)} className="boton boton-secundario boton-pequeno no-underline">
                      Laboratorio
                    </a>
                    <a href={`${enlaces.biblioteca}?tema=${tema}`} className="boton boton-suave boton-pequeno no-underline">
                      Ejercicios
                    </a>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <BarraProgreso valor={progreso?.dominio ?? 0} etiqueta="Dominio" />
                  <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                    {progreso?.ejerciciosResueltos ?? 0} intento(s) completado(s)
                    {progreso?.ejerciciosCorrectos ? `, ${progreso.ejerciciosCorrectos} con 70 % o más` : ''}
                  </p>
                </div>
              </div>
            </Tarjeta>
          );
        })}
      </div>
    </Seccion>
  );
}
