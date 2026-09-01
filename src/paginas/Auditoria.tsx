/**
 * Panel de auditoría de datos.
 *
 * Muestra cada inconsistencia detectada en los materiales, con sus opciones, y
 * pide una decisión antes de aplicar cualquier corrección. Nada se corrige en
 * silencio.
 */

import type { ReactNode } from 'react';
import { usarTienda } from '@/almacen/tienda';
import { EJERCICIOS_RECHAZADOS } from '@/datos/ejercicios';
import { enlaces } from '@/rutas';
import { Distintivo, Indicador, Seccion, Tarjeta } from '@/ui/base';
import { exportarCSV, fechaLegible, nombreSeguro } from '@/export/exportar';

export function PaginaAuditoria(): ReactNode {
  const tienda = usarTienda();
  const pendientes = tienda.inconsistencias.filter((i) => i.decision === null);
  const decididas = tienda.inconsistencias.filter((i) => i.decision !== null);

  const tabla = {
    titulo: 'Registro de inconsistencias',
    encabezados: ['ID', 'Título', 'Archivo de origen', 'Gravedad', 'Ejercicio', 'Decisión', 'Decidido en'],
    filas: tienda.inconsistencias.map((i) => [
      i.id,
      i.titulo,
      i.archivoOrigen ?? 'sin archivo de origen',
      i.gravedad,
      i.ejercicioId ?? '—',
      i.decision ?? 'pendiente',
      i.decididoEn === null ? '' : fechaLegible(i.decididoEn),
    ]),
  };

  return (
    <Seccion
      titulo="Auditoría de datos"
      eyebrow="Modo docente"
      descripcion="Estas son las inconsistencias detectadas al revisar los materiales del curso. Ninguna se corrigió automáticamente: usted elige el dato válido y el ejercicio se rehace con lo que elija, incluida su clave de respuestas. Puede cambiar cualquier decisión: la biblioteca se recompone siempre desde los datos originales."
      acciones={
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro('registro-inconsistencias'))}>
          Exportar el registro
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Indicador etiqueta="Inconsistencias detectadas" valor={tienda.inconsistencias.length} />
        <Indicador etiqueta="Pendientes de decisión" valor={pendientes.length} tono={pendientes.length > 0 ? 'avisar' : 'bien'} />
        <Indicador etiqueta="Resueltas" valor={decididas.length} tono="bien" />
        <Indicador
          etiqueta="Ejercicios rechazados al cargar"
          valor={EJERCICIOS_RECHAZADOS.length}
          tono={EJERCICIOS_RECHAZADOS.length > 0 ? 'mal' : 'bien'}
          nota={EJERCICIOS_RECHAZADOS.length === 0 ? 'La biblioteca cargó completa' : undefined}
        />
      </div>

      {EJERCICIOS_RECHAZADOS.length > 0 && (
        <Tarjeta titulo="Ejercicios que no pasaron la validación de esquema">
          <ul className="flex flex-col gap-2">
            {EJERCICIOS_RECHAZADOS.map((r) => (
              <li key={r.id} className="aviso aviso-mal">
                <span>
                  <strong>{r.id}</strong>: {r.errores.join(' · ')}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {pendientes.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3>Pendientes de decisión</h3>
          {pendientes.map((i) => (
            <FichaInconsistencia key={i.id} id={i.id} />
          ))}
        </div>
      )}

      {decididas.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3>Ya resueltas</h3>
          {decididas.map((i) => (
            <FichaInconsistencia key={i.id} id={i.id} />
          ))}
        </div>
      )}
    </Seccion>
  );
}

function FichaInconsistencia({ id }: { id: string }): ReactNode {
  const tienda = usarTienda();
  const inconsistencia = tienda.inconsistencias.find((x) => x.id === id);
  if (inconsistencia === undefined) return null;

  const ejercicio = inconsistencia.ejercicioId === null ? null : tienda.ejercicios.find((e) => e.id === inconsistencia.ejercicioId);
  const tonoGravedad = inconsistencia.gravedad === 'alta' ? 'mal' : inconsistencia.gravedad === 'media' ? 'avisar' : 'neutro';

  return (
    <Tarjeta
      titulo={
        <span className="flex flex-wrap items-center gap-2">
          <span className="dato" style={{ color: 'var(--tinta-tenue)' }}>
            {inconsistencia.id}
          </span>
          <span>{inconsistencia.titulo}</span>
        </span>
      }
      descripcion={
        <span className="flex flex-wrap items-center gap-2">
          <Distintivo tono={tonoGravedad}>gravedad {inconsistencia.gravedad}</Distintivo>
          <span className="dato text-xs">{inconsistencia.archivoOrigen ?? 'sin archivo de origen'}</span>
          {ejercicio !== undefined && ejercicio !== null && (
            <a href={enlaces.ejercicio(ejercicio.id)} className="text-xs">
              {ejercicio.titulo}
            </a>
          )}
          {inconsistencia.decision !== null && <Distintivo tono="bien">resuelta</Distintivo>}
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
          {inconsistencia.descripcion}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {inconsistencia.opciones.map((o) => {
            const elegida = inconsistencia.decision === o.id;
            return (
              <div
                key={o.id}
                className="tarjeta-plana flex flex-col gap-2 p-3"
                style={elegida ? { borderColor: 'var(--bien)', background: 'var(--bien-suave)' } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4>{o.descripcion}</h4>
                  {elegida && <Distintivo tono="bien">elegida</Distintivo>}
                </div>
                <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                  {o.efecto}
                </p>
                <button
                  type="button"
                  className={`boton boton-pequeno self-start ${elegida ? 'boton-suave' : 'boton-primario'}`}
                  disabled={elegida}
                  onClick={() => {
                    tienda.decidirInconsistencia(inconsistencia.id, o.id);
                    tienda.avisar(`Decisión registrada para ${inconsistencia.id}. Los datos del ejercicio se actualizaron.`, 'bien');
                  }}
                >
                  {elegida ? 'Opción vigente' : 'Aplicar esta opción'}
                </button>
              </div>
            );
          })}
        </div>

        {inconsistencia.decididoEn !== null && (
          <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
            Decidido el {fechaLegible(inconsistencia.decididoEn)}. Puede cambiar la decisión en cualquier momento; el ejercicio se
            reconstruye a partir de los datos originales.
          </p>
        )}
      </div>
    </Tarjeta>
  );
}
