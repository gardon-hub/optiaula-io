/**
 * Panel docente: creación y edición de ejercicios, importación de matrices
 * desde CSV o Excel, control de pistas y soluciones, y acceso a auditoría,
 * generador y reportes.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  CONTEXTOS,
  NOMBRE_CONTEXTO,
  NOMBRE_DIFICULTAD,
  NOMBRE_TEMA,
  TEMAS,
  esquemaEjercicio,
  validar,
  type Contexto,
  type Dificultad,
  type Ejercicio,
  type Tema,
} from '@/esquemas';
import { inconsistenciasPendientes, usarTienda } from '@/almacen/tienda';
import { nuevoId } from '@/almacen/baseDatos';
import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { enlaces, irA } from '@/rutas';
import {
  CampoNumero,
  CampoTexto,
  Dialogo,
  Distintivo,
  Indicador,
  Interruptor,
  ListaDiagnosticos,
  Seccion,
  Selector,
  Tarjeta,
} from '@/ui/base';
import { EditorDatosEjercicio } from '@/ui/editoresDatos';
import { preguntasDe } from '@/nucleo/preguntas';
import { diagnosticosDe } from '@/nucleo/resolverEjercicio';
import { formatearNumero } from '@/nucleo/numero';
import { exportarExcel, exportarJSON, nombreSeguro } from '@/export/exportar';
import { error as diagError, type Diagnostico } from '@/nucleo/tipos';

export function PanelDocente(): ReactNode {
  const tienda = usarTienda();
  const pendientes = inconsistenciasPendientes(tienda);
  const propios = tienda.ejercicios.filter((e) => !BIBLIOTECA_INICIAL.some((b) => b.id === e.id));

  const [editando, setEditando] = useState<Ejercicio | null>(null);
  const [paraDuplicar, setParaDuplicar] = useState<string>(BIBLIOTECA_INICIAL[0]?.id ?? '');
  const [importando, setImportando] = useState(false);

  return (
    <Seccion
      titulo="Panel docente"
      eyebrow={`${tienda.configuracion.curso.nombre} · ${tienda.configuracion.curso.periodo || 'periodo sin definir'}`}
      descripcion="Desde aquí se administra la biblioteca, se controlan las ayudas que ven los estudiantes y se resuelven las inconsistencias detectadas en los materiales."
      acciones={
        <div className="flex flex-wrap gap-2">
          <button type="button" className="boton boton-primario boton-pequeno" onClick={() => setEditando(ejercicioEnBlanco())}>
            Crear ejercicio
          </button>
          <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => setImportando(true)}>
            Importar matriz
          </button>
          <a href={enlaces.generador} className="boton boton-secundario boton-pequeno no-underline">
            Generador
          </a>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador etiqueta="Ejercicios en la biblioteca" valor={tienda.ejercicios.length} nota={`${propios.length} creados o generados por usted`} />
        <Indicador
          etiqueta="Inconsistencias pendientes"
          valor={pendientes.length}
          tono={pendientes.length > 0 ? 'avisar' : 'bien'}
          nota={pendientes.length > 0 ? 'Requieren su decisión' : 'Todas revisadas'}
        />
        <Indicador etiqueta="Intentos registrados" valor={tienda.intentos.length} />
        <Indicador etiqueta="Evaluaciones creadas" valor={tienda.evaluaciones.length} />
      </div>

      {pendientes.length > 0 && (
        <div className="aviso aviso-avisar">
          <span>
            Hay {pendientes.length} inconsistencia(s) detectada(s) en los materiales que esperan su decisión. Hasta que decida,
            los ejercicios afectados conservan los datos originales y muestran la advertencia al estudiante.{' '}
            <a href={enlaces.auditoria}>Abrir la auditoría de datos</a>.
          </span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta
          titulo="Control de ayudas"
          descripcion="Estas opciones afectan lo que ve el estudiante en modo práctica. El modo evaluación las desactiva todas por diseño."
        >
          <div className="flex flex-col gap-3">
            <Interruptor
              etiqueta="Mostrar pistas graduadas"
              activo={tienda.configuracion.mostrarPistas}
              alCambiar={(v) => tienda.fijarConfiguracion({ mostrarPistas: v })}
              ayuda="Cada pista consultada reduce el puntaje de la pregunta."
            />
            <Interruptor
              etiqueta="Mostrar la respuesta correcta al fallar"
              activo={tienda.configuracion.mostrarSoluciones}
              alCambiar={(v) => tienda.fijarConfiguracion({ mostrarSoluciones: v })}
              ayuda="Con esto apagado, el estudiante recibe la explicación del error pero no el valor correcto."
            />
            <Interruptor
              etiqueta="Mostrar la atribución de cada ejercicio"
              activo={tienda.configuracion.mostrarAtribuciones}
              alCambiar={(v) => tienda.fijarConfiguracion({ mostrarAtribuciones: v })}
              ayuda="Los documentos originales atribuyen cada problema a un nombre. Está oculto por defecto."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <CampoNumero
                etiqueta="Tolerancia de redondeo"
                valor={tienda.configuracion.toleranciaRedondeo * 100}
                unidad="%"
                minimo={0}
                maximo={25}
                alCambiar={(v) => tienda.fijarConfiguracion({ toleranciaRedondeo: (v ?? 1) / 100 })}
                ayuda="Margen admitido al calificar respuestas numéricas."
              />
              <CampoNumero
                etiqueta="Decimales en pantalla"
                valor={tienda.configuracion.decimales}
                minimo={0}
                maximo={6}
                paso={1}
                alCambiar={(v) => tienda.fijarConfiguracion({ decimales: Math.round(v ?? 2) })}
              />
            </div>
          </div>
        </Tarjeta>

        <Tarjeta titulo="Identidad del curso" descripcion="Aparece en el encabezado de todos los reportes exportados.">
          <div className="grid gap-3 sm:grid-cols-2">
            <CampoTexto etiqueta="Curso" valor={tienda.configuracion.curso.nombre} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, nombre: v } })} />
            <CampoTexto etiqueta="Código" valor={tienda.configuracion.curso.codigo} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, codigo: v } })} />
            <CampoTexto etiqueta="Periodo académico" valor={tienda.configuracion.curso.periodo} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, periodo: v } })} marcador="II periodo 2026" />
            <CampoTexto etiqueta="Docente" valor={tienda.configuracion.curso.docente} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, docente: v } })} />
            <CampoTexto etiqueta="Institución" valor={tienda.configuracion.curso.institucion} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, institucion: v } })} />
            <CampoNumero etiqueta="Año" valor={tienda.configuracion.curso.anio} paso={1} alCambiar={(v) => tienda.fijarConfiguracion({ curso: { ...tienda.configuracion.curso, anio: Math.round(v ?? 2026) } })} />
          </div>
        </Tarjeta>
      </div>

      <Tarjeta
        titulo="Ejercicios propios"
        descripcion="Los ejercicios que provienen de los materiales del curso no se pueden eliminar, para no perder la trazabilidad con la fuente. Duplíquelos y edite la copia."
        acciones={
          propios.length > 0 ? (
            <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarJSON(propios, nombreSeguro('ejercicios-propios'))}>
              Exportar como JSON
            </button>
          ) : undefined
        }
      >
        <div className="mb-3 flex flex-wrap items-end gap-2 border-b pb-3" style={{ borderColor: 'var(--borde)' }}>
          <div className="min-w-[16rem] flex-1">
            <Selector
              etiqueta="Partir de un ejercicio de la biblioteca"
              valor={paraDuplicar}
              opciones={tienda.ejercicios.map((e) => ({ valor: e.id, texto: `${NOMBRE_TEMA[e.tema]} · ${e.titulo}` }))}
              alCambiar={setParaDuplicar}
              ayuda="El original no se toca: se crea una copia editable y la trazabilidad con la fuente se conserva."
            />
          </div>
          <button
            type="button"
            className="boton boton-secundario boton-pequeno"
            onClick={() => {
              const copia = tienda.duplicarEjercicio(paraDuplicar);
              if (copia === null) return;
              setEditando(copia);
              tienda.avisar(`Copia creada: «${copia.titulo}». Los cambios no afectan al original.`, 'bien');
            }}
          >
            Duplicar y editar
          </button>
        </div>

        {propios.length === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            Todavía no ha creado ni generado ejercicios propios. Use «Crear ejercicio» para uno en blanco, «Duplicar y
            editar» para partir de uno de la biblioteca, o el generador para producir variantes reproducibles a partir de
            una semilla.
          </p>
        ) : (
          <div className="contenedor-tabla">
            <table className="tabla">
              <thead>
                <tr>
                  <th scope="col">Ejercicio</th>
                  <th scope="col">Tema</th>
                  <th scope="col">Origen</th>
                  <th scope="col" className="w-40">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {propios.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <a href={enlaces.ejercicio(e.id)}>{e.titulo}</a>
                    </td>
                    <td>{NOMBRE_TEMA[e.tema]}</td>
                    <td>
                      <Distintivo tono="neutro">{e.origen}</Distintivo>
                      {e.semilla !== null && <span className="dato ml-1.5 text-xs">semilla {e.semilla}</span>}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button type="button" className="boton boton-suave boton-pequeno" onClick={() => setEditando(e)}>
                          Editar
                        </button>
                        <button type="button" className="boton boton-suave boton-pequeno" onClick={() => tienda.duplicarEjercicio(e.id)}>
                          Duplicar
                        </button>
                        <button
                          type="button"
                          className="boton boton-suave boton-pequeno"
                          style={{ color: 'var(--mal)' }}
                          onClick={() => {
                            if (window.confirm(`¿Eliminar «${e.titulo}»? Esta acción no se puede deshacer.`)) tienda.eliminarEjercicio(e.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <div className="grid gap-4 sm:grid-cols-3">
        <Tarjeta titulo="Auditoría de datos" descripcion={`${pendientes.length} inconsistencia(s) pendiente(s) de decisión.`}>
          <a href={enlaces.auditoria} className="boton boton-primario boton-pequeno no-underline">
            Revisar inconsistencias
          </a>
        </Tarjeta>
        <Tarjeta titulo="Evaluaciones" descripcion="Arme exámenes con ejercicios de la biblioteca y defina intentos, tiempo y tolerancia.">
          <a href={enlaces.evaluacion} className="boton boton-secundario boton-pequeno no-underline">
            Configurar evaluaciones
          </a>
        </Tarjeta>
        <Tarjeta titulo="Reportes y calificaciones" descripcion="Hojas de ejercicios, claves docentes, registro de calificaciones y comparaciones.">
          <a href={enlaces.reportes} className="boton boton-secundario boton-pequeno no-underline">
            Centro de reportes
          </a>
        </Tarjeta>
      </div>

      {editando !== null && (
        <EditorEjercicio
          ejercicio={editando}
          alCerrar={() => setEditando(null)}
          alGuardar={(e) => {
            tienda.guardarEjercicio(e);
            setEditando(null);
            tienda.avisar('Ejercicio guardado en la biblioteca local.', 'bien');
          }}
        />
      )}

      {importando && <ImportadorMatriz alCerrar={() => setImportando(false)} />}
    </Seccion>
  );
}

function ejercicioEnBlanco(): Ejercicio {
  return {
    id: nuevoId('ej'),
    titulo: 'Ejercicio nuevo',
    tema: 'asignacion',
    metodo: 'Método húngaro',
    contexto: 'general',
    dificultad: 'intermedio',
    enunciado: 'Escriba aquí el enunciado que leerá el estudiante.',
    datos: {
      tipo: 'asignacion',
      filas: ['Recurso 1', 'Recurso 2', 'Recurso 3'],
      columnas: ['Tarea 1', 'Tarea 2', 'Tarea 3'],
      matriz: [
        [10, 12, 14],
        [11, 9, 13],
        [13, 11, 10],
      ],
      objetivo: 'minimizar',
      unidad: 'L',
      nombreFilas: 'recursos',
      nombreColumnas: 'tareas',
    },
    preguntas: [],
    moneda: 'HNL',
    unidades: ['L'],
    tiempoEstimadoMinutos: 25,
    origen: 'docente',
    validacion: 'sin_verificar',
    fuenteId: null,
    atribucion: null,
    inconsistencias: [],
    notasDocente: '',
    semilla: null,
    creadoEn: new Date().toISOString(),
    modificadoEn: new Date().toISOString(),
  };
}

function EditorEjercicio({
  ejercicio,
  alCerrar,
  alGuardar,
}: {
  ejercicio: Ejercicio;
  alCerrar: () => void;
  alGuardar: (e: Ejercicio) => void;
}): ReactNode {
  const [borrador, setBorrador] = useState<Ejercicio>(ejercicio);
  const [errores, setErrores] = useState<readonly Diagnostico[]>([]);

  // Al cambiar los datos, las respuestas guardadas pueden quedar obsoletas: el
  // enunciado dice una cosa y la clave de corrección otra. Se recalculan con los
  // mismos constructores del generador y se comparan por clave de verificación.
  const recalculadas = useMemo(() => preguntasDe(borrador.datos, borrador.titulo), [borrador.datos, borrador.titulo]);

  // El emparejamiento va por identificador de pregunta, no por clave: doce
  // ejercicios repiten la misma clave en varias preguntas —una por sitio, una
  // por variable— y emparejar por clave compararía la respuesta de una con la
  // de otra. La clave se exige igual como comprobación de que son la misma.
  const desactualizadas = useMemo(() => {
    const nuevas = new Map(recalculadas.map((p) => [p.id, p]));
    return borrador.preguntas.flatMap((p) => {
      if (typeof p.respuesta !== 'number') return [];
      const nueva = nuevas.get(p.id);
      if (nueva === undefined || nueva.claveVerificacion !== p.claveVerificacion) return [];
      if (typeof nueva.respuesta !== 'number') return [];
      const escala = Math.max(1e-9, Math.abs(nueva.respuesta));
      if (Math.abs(nueva.respuesta - p.respuesta) / escala <= 1e-6) return [];
      return [{ preguntaId: p.id, enunciado: p.enunciado, guardada: p.respuesta, nueva: nueva.respuesta }];
    });
  }, [borrador.preguntas, recalculadas]);

  // Las preguntas escritas a mano para un enunciado concreto —la conversión a
  // gallinas, el escenario de alza— no las produce ningún constructor, así que
  // no se pueden recalcular: solo se nombran para que el docente las revise.
  const sinRecalcular = useMemo(() => {
    const nuevas = new Map(recalculadas.map((p) => [p.id, p]));
    return borrador.preguntas
      .filter((p) => typeof p.respuesta === 'number' && nuevas.get(p.id)?.claveVerificacion !== p.claveVerificacion)
      .map((p) => p.enunciado);
  }, [borrador.preguntas, recalculadas]);

  const actualizarRespuestas = (): void => {
    const nuevas = new Map(recalculadas.map((p) => [p.id, p]));
    setBorrador((s) => ({
      ...s,
      preguntas: s.preguntas.map((p) => {
        const nueva = nuevas.get(p.id);
        return nueva !== undefined && nueva.claveVerificacion === p.claveVerificacion
          ? { ...p, respuesta: nueva.respuesta }
          : p;
      }),
    }));
  };

  // Diagnósticos del propio motor: sirven para ver en el acto si el ejercicio
  // dejó de tener solución, no solo si el esquema lo acepta.
  const problemasDatos = useMemo(() => diagnosticosDe(borrador), [borrador]);


  const guardar = (): void => {
    const r = validar(esquemaEjercicio, borrador);
    if (!r.ok || r.datos === null) {
      setErrores(r.errores.map((e) => diagError('VALIDACION', e)));
      return;
    }
    alGuardar(r.datos);
  };

  return (
    <Dialogo
      abierto
      titulo="Editar ejercicio"
      alCerrar={alCerrar}
      ancho="max-w-4xl"
      acciones={
        <>
          <button type="button" className="boton boton-suave" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="button" className="boton boton-primario" onClick={guardar}>
            Guardar en la biblioteca
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ListaDiagnosticos diagnosticos={errores} titulo="No se pudo guardar" />

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoTexto etiqueta="Título" valor={borrador.titulo} alCambiar={(v) => setBorrador((s) => ({ ...s, titulo: v }))} />
          <CampoTexto etiqueta="Método" valor={borrador.metodo} alCambiar={(v) => setBorrador((s) => ({ ...s, metodo: v }))} />
          <Selector
            etiqueta="Tema"
            valor={borrador.tema}
            opciones={TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))}
            alCambiar={(v) => setBorrador((s) => ({ ...s, tema: v as Tema }))}
            ayuda="El tema debe corresponder al tipo de datos del ejercicio."
          />
          <Selector
            etiqueta="Dificultad"
            valor={borrador.dificultad}
            opciones={(['basico', 'intermedio', 'avanzado'] as const).map((d) => ({ valor: d, texto: NOMBRE_DIFICULTAD[d] }))}
            alCambiar={(v) => setBorrador((s) => ({ ...s, dificultad: v as Dificultad }))}
          />
          <Selector
            etiqueta="Contexto productivo"
            valor={borrador.contexto}
            opciones={CONTEXTOS.map((c) => ({ valor: c, texto: NOMBRE_CONTEXTO[c] }))}
            alCambiar={(v) => setBorrador((s) => ({ ...s, contexto: v as Contexto }))}
          />
          <CampoNumero
            etiqueta="Tiempo estimado"
            unidad="minutos"
            valor={borrador.tiempoEstimadoMinutos}
            paso={5}
            minimo={5}
            alCambiar={(v) => setBorrador((s) => ({ ...s, tiempoEstimadoMinutos: Math.max(5, Math.round(v ?? 25)) }))}
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="etiqueta">Enunciado</span>
          <textarea
            className="campo min-h-[8rem]"
            value={borrador.enunciado}
            onChange={(e) => setBorrador((s) => ({ ...s, enunciado: e.target.value }))}
          />
          <span className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
            Admite **negritas**, `código`, párrafos separados por línea en blanco y citas con «&gt; ».
          </span>
        </label>

        <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--borde)' }}>
          <p className="etiqueta">Datos del ejercicio</p>
          <EditorDatosEjercicio
            datos={borrador.datos}
            alCambiar={(datos) => setBorrador((s) => ({ ...s, datos }))}
          />

          <ListaDiagnosticos diagnosticos={problemasDatos} titulo="Revise los datos" />

          {desactualizadas.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md p-3" style={{ background: 'var(--avisar-suave)' }}>
              <p className="text-[0.8125rem]">
                <strong>Al cambiar los datos, {desactualizadas.length} respuesta(s) dejaron de coincidir con lo que
                calcula el motor.</strong>{' '}
                Se pueden actualizar de una vez, o corregirlas a mano si quiere conservar el enunciado como estaba.
              </p>
              <ul className="flex flex-col gap-1 text-xs" style={{ color: 'var(--tinta-media)' }}>
                {desactualizadas.map((d) => (
                  <li key={d.preguntaId}>
                    <strong>{d.enunciado}</strong> — guardada {formatearNumero(d.guardada, { decimales: 4 })}, ahora{' '}
                    {formatearNumero(d.nueva, { decimales: 4 })}
                  </li>
                ))}
              </ul>
              <div>
                <button type="button" className="boton boton-secundario boton-pequeno" onClick={actualizarRespuestas}>
                  Actualizar esas respuestas
                </button>
              </div>
            </div>
          )}

          {sinRecalcular.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
              {sinRecalcular.length} pregunta(s) de este ejercicio no se pueden recalcular automáticamente porque no
              corresponden al juego estándar del tema: {sinRecalcular.join('; ')}. Revíselas a mano si cambió los datos.
            </p>
          )}
        </div>

        <label className="flex flex-col gap-1">
          <span className="etiqueta">Notas para el docente</span>
          <textarea
            className="campo min-h-[4rem]"
            value={borrador.notasDocente}
            onChange={(e) => setBorrador((s) => ({ ...s, notasDocente: e.target.value }))}
            placeholder="Qué datos provienen del material, qué se agregó, advertencias de uso…"
          />
        </label>
      </div>
    </Dialogo>
  );
}

function ImportadorMatriz({ alCerrar }: { alCerrar: () => void }): ReactNode {
  const tienda = usarTienda();
  const [texto, setTexto] = useState('');
  const [separador, setSeparador] = useState<';' | ',' | '\t'>(';');
  const [tipo, setTipo] = useState<'asignacion' | 'transporte'>('asignacion');
  const [errores, setErrores] = useState<readonly Diagnostico[]>([]);

  const analizar = (): { filas: string[]; columnas: string[]; matriz: number[][] } | null => {
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lineas.length < 2) {
      setErrores([diagError('IMPORT_VACIO', 'Pegue al menos una fila de encabezados y una de datos.')]);
      return null;
    }

    const partir = (linea: string): string[] => linea.split(separador).map((c) => c.trim());
    const encabezado = partir(lineas[0]!);
    const columnas = encabezado.slice(1).filter((c) => c !== '');
    if (columnas.length === 0) {
      setErrores([diagError('IMPORT_SIN_COLUMNAS', 'La primera fila debe traer los nombres de las columnas, dejando la primera celda vacía o con un rótulo.')]);
      return null;
    }

    const filas: string[] = [];
    const matriz: number[][] = [];
    const fallos: Diagnostico[] = [];

    for (let i = 1; i < lineas.length; i++) {
      const celdas = partir(lineas[i]!);
      const nombre = celdas[0] ?? `Fila ${i}`;
      const valores = celdas.slice(1, columnas.length + 1).map((c) => Number(c.replace(',', '.')));

      if (valores.length !== columnas.length) {
        fallos.push(diagError('IMPORT_FILA_CORTA', `La fila «${nombre}» tiene ${valores.length} valores y se esperaban ${columnas.length}.`));
        continue;
      }
      if (valores.some((v) => !Number.isFinite(v))) {
        fallos.push(diagError('IMPORT_NO_NUMERICO', `La fila «${nombre}» contiene valores que no son números.`));
        continue;
      }
      filas.push(nombre);
      matriz.push(valores);
    }

    if (fallos.length > 0) {
      setErrores(fallos);
      return null;
    }
    setErrores([]);
    return { filas, columnas, matriz };
  };

  const importar = (): void => {
    const r = analizar();
    if (r === null) return;

    const base = ejercicioEnBlanco();
    const ejercicio: Ejercicio =
      tipo === 'asignacion'
        ? {
            ...base,
            titulo: 'Asignación importada',
            tema: 'asignacion',
            datos: { tipo: 'asignacion', filas: r.filas, columnas: r.columnas, matriz: r.matriz, objetivo: 'minimizar', unidad: 'L', nombreFilas: 'recursos', nombreColumnas: 'tareas' },
          }
        : {
            ...base,
            titulo: 'Transporte importado',
            tema: 'transporte',
            metodo: 'Esquina noroeste, costo mínimo, Vogel y MODI',
            datos: {
              tipo: 'transporte',
              origenes: r.filas,
              destinos: r.columnas,
              costos: r.matriz,
              oferta: r.filas.map(() => 100),
              demanda: r.columnas.map(() => Math.round((100 * r.filas.length) / r.columnas.length)),
              unidadCosto: 'L',
              unidadCantidad: 'unidades',
              metodoInicialSugerido: 'vogel',
            },
          };

    tienda.guardarEjercicio(ejercicio);
    tienda.avisar('Matriz importada como ejercicio nuevo. Revise oferta, demanda y unidades antes de usarlo.', 'bien');
    alCerrar();
    irA(`ejercicio/${ejercicio.id}`);
  };

  return (
    <Dialogo
      abierto
      titulo="Importar matriz desde CSV o Excel"
      alCerrar={alCerrar}
      ancho="max-w-3xl"
      acciones={
        <>
          <button type="button" className="boton boton-suave" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="button" className="boton boton-primario" onClick={importar} disabled={texto.trim() === ''}>
            Importar
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
          Copie el rango desde Excel o LibreOffice y péguelo aquí. La primera fila debe traer los nombres de las columnas
          (con la primera celda vacía o con un rótulo) y la primera columna los nombres de las filas.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Selector
            etiqueta="Separador"
            valor={separador}
            opciones={[
              { valor: ';' as const, texto: 'Punto y coma (CSV de Excel en español)' },
              { valor: ',' as const, texto: 'Coma (CSV internacional)' },
              { valor: '\t' as const, texto: 'Tabulación (pegado directo desde Excel)' },
            ]}
            alCambiar={(v) => setSeparador(v as ';' | ',' | '\t')}
          />
          <Selector
            etiqueta="Tipo de ejercicio"
            valor={tipo}
            opciones={[
              { valor: 'asignacion' as const, texto: 'Asignación (matriz de costos)' },
              { valor: 'transporte' as const, texto: 'Transporte (matriz de costos)' },
            ]}
            alCambiar={(v) => setTipo(v as 'asignacion' | 'transporte')}
          />
        </div>

        <label className="flex flex-col gap-1">
          <span className="etiqueta">Datos</span>
          <textarea
            className="campo dato min-h-[10rem]"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`\tParcela 1${separador}Parcela 2${separador}Parcela 3\nTrabajador 1${separador}45${separador}52${separador}41\nTrabajador 2${separador}50${separador}47${separador}55`}
          />
        </label>

        <ListaDiagnosticos diagnosticos={errores} titulo="Problemas en los datos" />

        {tipo === 'transporte' && (
          <p className="aviso aviso-avisar">
            <span>
              La importación crea el ejercicio con oferta y demanda provisionales. Ajústelas en el laboratorio antes de
              usarlo: si no cuadran, el problema se balanceará con un origen o destino ficticio.
            </span>
          </p>
        )}

        <button
          type="button"
          className="boton boton-suave boton-pequeno self-start"
          onClick={() =>
            exportarExcel(
              [
                {
                  titulo: 'Plantilla de matriz',
                  encabezados: ['', 'Columna 1', 'Columna 2', 'Columna 3'],
                  filas: [
                    ['Fila 1', 0, 0, 0],
                    ['Fila 2', 0, 0, 0],
                    ['Fila 3', 0, 0, 0],
                  ],
                },
              ],
              nombreSeguro('plantilla-matriz'),
            )
          }
        >
          Descargar plantilla de Excel
        </button>
      </div>
    </Dialogo>
  );
}
