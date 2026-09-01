/**
 * Configuración: apariencia, cálculo, identidad, respaldo y restauración,
 * estado de la instalación sin conexión y arquitectura del asistente opcional.
 */

import { useRef, useState, type ReactNode } from 'react';
import { IDENTIDAD, ubicacionCompleta } from '@/config/identidad';
import { usarTienda } from '@/almacen/tienda';
import { hayAlmacenamiento } from '@/almacen/baseDatos';
import { proveedoresDisponibles } from '@/nucleo/asistenteOpcional';
import {
  CampoNumero,
  Distintivo,
  Indicador,
  Interruptor,
  ListaDiagnosticos,
  Seccion,
  Selector,
  Tarjeta,
} from '@/ui/base';
import { exportarJSON, fechaLegible, nombreSeguro } from '@/export/exportar';
import { error as diagError, nota as diagNota, type Diagnostico } from '@/nucleo/tipos';

export function PaginaConfiguracion(): ReactNode {
  const tienda = usarTienda();
  const archivo = useRef<HTMLInputElement>(null);
  const [mensajes, setMensajes] = useState<readonly Diagnostico[]>([]);

  const restaurar = async (f: File): Promise<void> => {
    try {
      const texto = await f.text();
      const datos: unknown = JSON.parse(texto);
      const r = tienda.importarRespaldo(datos);
      if (r.ok) {
        setMensajes([diagNota('RESTAURADO', `Respaldo restaurado desde «${f.name}». Todos los datos anteriores fueron reemplazados.`)]);
      } else {
        setMensajes(r.errores.map((e) => diagError('RESPALDO_INVALIDO', e)));
      }
    } catch (e) {
      setMensajes([diagError('RESPALDO_ILEGIBLE', `No se pudo leer el archivo: ${e instanceof Error ? e.message : 'formato inválido'}.`)]);
    }
  };

  return (
    <Seccion
      titulo="Configuración"
      eyebrow="Preferencias locales"
      descripcion="Todo lo que configure aquí se guarda en este navegador. La aplicación no envía datos a ningún servidor y no requiere registro."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador
          etiqueta="Almacenamiento local"
          valor={hayAlmacenamiento() ? 'disponible' : 'no disponible'}
          tono={hayAlmacenamiento() ? 'bien' : 'mal'}
          nota={hayAlmacenamiento() ? 'IndexedDB activo' : 'La sesión no se guardará al cerrar'}
        />
        <Indicador etiqueta="Ejercicios guardados" valor={tienda.ejercicios.length} />
        <Indicador etiqueta="Intentos guardados" valor={tienda.intentos.length} />
      </div>

      <ListaDiagnosticos diagnosticos={mensajes} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Apariencia">
          <div className="flex flex-col gap-3">
            <Selector
              etiqueta="Tema visual"
              valor={tienda.configuracion.tema}
              opciones={[
                { valor: 'sistema' as const, texto: 'Seguir el sistema' },
                { valor: 'claro' as const, texto: 'Claro' },
                { valor: 'oscuro' as const, texto: 'Oscuro' },
              ]}
              alCambiar={(v) => tienda.fijarConfiguracion({ tema: v as 'claro' | 'oscuro' | 'sistema' })}
            />
            <Selector
              etiqueta="Modo de uso"
              valor={tienda.configuracion.modo}
              opciones={[
                { valor: 'estudiante' as const, texto: 'Estudiante' },
                { valor: 'docente' as const, texto: 'Docente' },
                { valor: 'proyeccion' as const, texto: 'Proyección' },
                { valor: 'evaluacion' as const, texto: 'Evaluación' },
              ]}
              alCambiar={(v) => tienda.fijarModo(v as typeof tienda.configuracion.modo)}
              ayuda="El modo proyección agranda la tipografía y oculta los controles secundarios."
            />
            <Interruptor
              etiqueta="Reducir animaciones"
              activo={tienda.configuracion.animacionesReducidas}
              alCambiar={(v) => tienda.fijarConfiguracion({ animacionesReducidas: v })}
              ayuda="También se respeta automáticamente la preferencia del sistema operativo."
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Cálculo y presentación">
          <div className="flex flex-col gap-3">
            <CampoNumero
              etiqueta="Decimales en pantalla"
              valor={tienda.configuracion.decimales}
              minimo={0}
              maximo={6}
              paso={1}
              alCambiar={(v) => tienda.fijarConfiguracion({ decimales: Math.max(0, Math.min(6, Math.round(v ?? 2))) })}
              ayuda="Solo afecta la presentación: el motor nunca redondea durante el cálculo."
            />
            <CampoNumero
              etiqueta="Tolerancia de redondeo al calificar"
              unidad="%"
              valor={tienda.configuracion.toleranciaRedondeo * 100}
              minimo={0}
              maximo={25}
              alCambiar={(v) => tienda.fijarConfiguracion({ toleranciaRedondeo: (v ?? 1) / 100 })}
            />
            <Interruptor
              etiqueta="Tolerancia relativa"
              activo={tienda.configuracion.toleranciaRelativa}
              alCambiar={(v) => tienda.fijarConfiguracion({ toleranciaRelativa: v })}
              ayuda="Relativa compara con el tamaño del valor esperado; absoluta usa la misma tolerancia para todo."
            />
            <Selector
              etiqueta="Moneda predeterminada"
              valor={tienda.configuracion.monedaPredeterminada}
              opciones={[
                { valor: 'HNL' as const, texto: 'Lempira hondureño (L)' },
                { valor: 'USD' as const, texto: 'Dólar estadounidense (US$)' },
              ]}
              alCambiar={(v) => tienda.fijarConfiguracion({ monedaPredeterminada: v as 'HNL' | 'USD' })}
              ayuda="Un cálculo nunca mezcla monedas: cada ejercicio lleva la suya."
            />
          </div>
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Identidad institucional"
        descripcion="Estos datos vienen del archivo central de identidad y se pueden ajustar por curso desde el panel docente."
      >
        <dl className="grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
          <Fila termino="Aplicación" valor={`${IDENTIDAD.nombre} v${IDENTIDAD.version}`} />
          <Fila termino="Subtítulo" valor={IDENTIDAD.subtitulo} />
          <Fila termino="Autor" valor={`${IDENTIDAD.autor.titulo} ${IDENTIDAD.autor.nombre}`} />
          <Fila termino="Institución" valor={IDENTIDAD.institucion.nombre} />
          <Fila termino="Ubicación" valor={ubicacionCompleta()} />
          <Fila termino="Idioma" valor="Español" />
          <Fila termino="Logotipo institucional" valor={IDENTIDAD.institucion.logo ?? 'no incluido — espacio reservado'} />
        </dl>

        <p className="mt-3 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          El logotipo oficial de la universidad no se incluyó porque no venía entre los materiales. Para agregarlo, coloque el
          archivo en <code>public/logo-institucion.svg</code> y escriba la ruta en <code>src/config/identidad.ts</code>.
        </p>
      </Tarjeta>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Respaldo y restauración"
          descripcion="El respaldo incluye configuración, perfiles, ejercicios propios, intentos, evaluaciones, progreso, decisiones de auditoría y favoritos. Los ejercicios que vienen con la aplicación no se duplican en el archivo."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="boton boton-primario boton-pequeno"
                onClick={() => {
                  exportarJSON(tienda.exportarRespaldo(), nombreSeguro(`respaldo-optiaula-${new Date().toISOString().slice(0, 10)}`));
                  setMensajes([diagNota('RESPALDADO', `Respaldo descargado el ${fechaLegible()}.`)]);
                }}
              >
                Descargar respaldo JSON
              </button>

              <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => archivo.current?.click()}>
                Restaurar desde archivo
              </button>

              <input
                ref={archivo}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f !== undefined) void restaurar(f);
                  e.target.value = '';
                }}
              />
            </div>

            <p className="aviso aviso-avisar">
              <span>Restaurar reemplaza todos los datos actuales. Descargue un respaldo antes si quiere conservarlos.</span>
            </p>
          </div>
        </Tarjeta>

        <Tarjeta
          titulo="Asistente de inteligencia artificial"
          descripcion="La versión 1.0 no usa ninguna API de IA. Toda la retroalimentación proviene del motor determinista, que funciona sin conexión y sin costo."
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Distintivo tono={tienda.configuracion.asistenteIA.habilitado ? 'avisar' : 'bien'}>
                {tienda.configuracion.asistenteIA.habilitado ? 'habilitado' : 'desactivado'}
              </Distintivo>
              <span className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
                {proveedoresDisponibles().length === 0
                  ? 'No hay ningún proveedor registrado en esta compilación.'
                  : `Proveedores registrados: ${proveedoresDisponibles().join(', ')}.`}
              </span>
            </div>

            <Interruptor
              etiqueta="Habilitar el asistente opcional"
              activo={tienda.configuracion.asistenteIA.habilitado}
              alCambiar={(v) => tienda.fijarConfiguracion({ asistenteIA: { ...tienda.configuracion.asistenteIA, habilitado: v } })}
              ayuda="Sin proveedor registrado, habilitarlo no tiene efecto: la aplicación seguirá funcionando exactamente igual."
              deshabilitado={proveedoresDisponibles().length === 0}
            />

            <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
              La arquitectura está en <code>src/nucleo/asistenteOpcional.ts</code>: define el contrato que debe implementar
              cualquier proveedor futuro. Cualquier texto producido por un modelo se mostrará con una declaración visible de
              que fue generado automáticamente.
            </p>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta titulo="Zona de riesgo" descripcion="Estas acciones no se pueden deshacer.">
        <button
          type="button"
          className="boton"
          style={{ background: 'var(--mal)', color: '#fff' }}
          onClick={() => {
            if (window.confirm('¿Borrar todos los datos locales? Se perderán perfiles, intentos, ejercicios propios y decisiones de auditoría. Esta acción no se puede deshacer.')) {
              void tienda.borrarTodo().then(() => setMensajes([diagNota('BORRADO', 'Todos los datos locales fueron eliminados.')]));
            }
          }}
        >
          Borrar todos los datos locales
        </button>
      </Tarjeta>
    </Seccion>
  );
}

function Fila({ termino, valor }: { termino: string; valor: string }): ReactNode {
  return (
    <div className="flex flex-wrap gap-1.5">
      <dt className="etiqueta">{termino}:</dt>
      <dd style={{ color: 'var(--tinta-media)' }}>{valor}</dd>
    </div>
  );
}
