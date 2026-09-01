/**
 * Centro de reportes.
 *
 * Genera hojas de ejercicios sin respuestas, claves docentes con procedimiento,
 * informes individuales, resúmenes de evaluación, comparaciones de métodos y el
 * registro de calificaciones. Todo imprimible y exportable.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { IDENTIDAD, pieDeReporte, ubicacionCompleta } from '@/config/identidad';
import { DESCRIPCION_ORIGEN, NOMBRE_TEMA, TEMAS, type Ejercicio, type Intento, type Tema } from '@/esquemas';
import { perfilActual, usarTienda, type Estado } from '@/almacen/tienda';
import { fuentePorId } from '@/datos/fuentes';
import { notaDeIntento } from '@/nucleo/revision';
import { resolverEjercicio } from '@/nucleo/resolverEjercicio';
import { compararMetodosIniciales, NOMBRE_METODO } from '@/nucleo/transporte';
import { formatearNumero } from '@/nucleo/numero';
import type { Paso } from '@/nucleo/tipos';
import { Distintivo, Pestanas, Seccion, Selector, Tarjeta, TextoFormateado, Vacio } from '@/ui/base';
import { TablaDePaso, VistaPaso } from '@/ui/pasos';
import {
  duracionLegible,
  exportarCSV,
  exportarExcel,
  fechaLegible,
  imprimir,
  nombreSeguro,
  copiarTabla,
  exportarPDF,
  fechaCorta,
  type ContenidoPDF,
  type EncabezadoReporte,
  type SeccionPDF,
  type TablaExportable,
} from '@/export/exportar';

type TipoReporte = 'hoja' | 'clave' | 'individual' | 'evaluacion' | 'metodos' | 'calificaciones';

const TIPOS: readonly { valor: TipoReporte; texto: string }[] = [
  { valor: 'hoja', texto: 'Hoja de ejercicios' },
  { valor: 'clave', texto: 'Clave docente' },
  { valor: 'individual', texto: 'Reporte individual' },
  { valor: 'evaluacion', texto: 'Resumen de evaluación' },
  { valor: 'metodos', texto: 'Comparación de métodos' },
  { valor: 'calificaciones', texto: 'Registro de calificaciones' },
];

export function CentroReportes(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);
  const [tipo, setTipo] = useState<TipoReporte>('hoja');
  const [tema, setTema] = useState<Tema | 'todos'>('todos');
  const [ejercicioId, setEjercicioId] = useState<string>(tienda.ejercicios[0]?.id ?? '');

  const ejercicios = useMemo(
    () => tienda.ejercicios.filter((e) => tema === 'todos' || e.tema === tema),
    [tienda.ejercicios, tema],
  );

  const ejercicio = tienda.ejercicios.find((e) => e.id === ejercicioId) ?? ejercicios[0] ?? null;

  const curso = tienda.configuracion.curso;
  const encabezado: EncabezadoReporte = {
    tipoReporte: TIPOS.find((t) => t.valor === tipo)?.texto ?? '',
    tema: ejercicio === null ? '—' : NOMBRE_TEMA[ejercicio.tema],
    estudiante: perfil?.nombre ?? 'No identificado',
    docente: curso.docente,
    institucion: curso.institucion,
    curso: curso.nombre,
    periodo: curso.periodo === '' ? String(curso.anio) : `${curso.periodo} ${curso.anio}`,
    fecha: fechaLegible(),
  };

  const paraPDF = useMemo(
    () => contenidoParaPDF(tipo, tienda, ejercicio, encabezado),
    // El encabezado se rearma en cada render, así que se depende de sus partes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tipo, tienda.intentos, tienda.perfiles, tienda.ejercicios, ejercicio, curso],
  );

  return (
    <Seccion
      titulo="Centro de reportes"
      eyebrow="Salidas profesionales"
      descripcion="Todos los reportes llevan el mismo encabezado normalizado: aplicación, tema, estudiante, docente, institución, fecha, datos, método, procedimiento, resultado, interpretación, fuentes y versión."
      acciones={
        <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
          <button type="button" className="boton boton-primario boton-pequeno" onClick={imprimir}>
            Imprimir
          </button>
          <button
            type="button"
            className="boton boton-secundario boton-pequeno"
            disabled={paraPDF === null}
            title={
              paraPDF === null
                ? 'Este reporte todavía no se puede descargar como PDF.'
                : 'Descarga un PDF con el texto y las tablas. Las gráficas quedan fuera: para incluirlas, use Imprimir.'
            }
            onClick={() => {
              if (paraPDF !== null) exportarPDF(paraPDF, nombreSeguro(`${encabezado.tipoReporte}-${paraPDF.titulo}`));
            }}
          >
            Descargar PDF
          </button>
        </div>
      }
    >
      <div className="ocultar-al-imprimir flex flex-col gap-3">
        <Pestanas etiquetaGrupo="Tipo de reporte" valor={tipo} alCambiar={setTipo} opciones={TIPOS} />

        {(tipo === 'hoja' || tipo === 'clave' || tipo === 'metodos') && (
          <Tarjeta plana>
            <div className="grid gap-3 sm:grid-cols-2">
              <Selector
                etiqueta="Tema"
                valor={tema}
                opciones={[{ valor: 'todos' as const, texto: 'Todos los temas' }, ...TEMAS.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))]}
                alCambiar={(v) => setTema(v as Tema | 'todos')}
              />
              <Selector
                etiqueta="Ejercicio"
                valor={ejercicio?.id ?? ''}
                opciones={ejercicios.map((e) => ({ valor: e.id, texto: e.titulo }))}
                alCambiar={setEjercicioId}
              />
            </div>
          </Tarjeta>
        )}
      </div>

      <article className="tarjeta flex flex-col gap-5 p-6">
        <EncabezadoReporte
          tipoReporte={TIPOS.find((t) => t.valor === tipo)?.texto ?? ''}
          tema={ejercicio === null ? '—' : NOMBRE_TEMA[ejercicio.tema]}
          estudiante={perfil?.nombre ?? 'No identificado'}
        />

        {tipo === 'hoja' && ejercicio !== null && <HojaDeEjercicios ejercicio={ejercicio} />}
        {tipo === 'clave' && ejercicio !== null && <ClaveDocente ejercicio={ejercicio} />}
        {tipo === 'metodos' && ejercicio !== null && <ComparacionMetodos ejercicio={ejercicio} />}
        {tipo === 'individual' && <ReporteIndividual />}
        {tipo === 'evaluacion' && <ResumenEvaluacion />}
        {tipo === 'calificaciones' && <RegistroCalificaciones />}

        <footer className="border-t pt-3 text-xs" style={{ borderColor: 'var(--borde)', color: 'var(--tinta-tenue)' }}>
          {pieDeReporte()} · Generado el {fechaLegible()}
        </footer>
      </article>
    </Seccion>
  );
}

function EncabezadoReporte({ tipoReporte, tema, estudiante }: { tipoReporte: string; tema: string; estudiante: string }): ReactNode {
  const tienda = usarTienda();
  const curso = tienda.configuracion.curso;

  return (
    <header className="flex flex-col gap-3 border-b pb-4" style={{ borderColor: 'var(--borde)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="etiqueta">{curso.institucion}</p>
          <h2>{tipoReporte}</h2>
          <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
            {curso.nombre}
            {curso.codigo !== '' && ` (${curso.codigo})`} · {tema}
          </p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg text-[0.625rem] leading-tight"
          style={{ border: '1px dashed var(--borde-fuerte)', color: 'var(--tinta-tenue)' }}
          title="Espacio reservado para el logotipo institucional"
        >
          logo
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
        <Dato termino="Estudiante" valor={estudiante} />
        <Dato termino="Docente" valor={curso.docente} />
        <Dato termino="Periodo" valor={curso.periodo === '' ? String(curso.anio) : `${curso.periodo} ${curso.anio}`} />
        <Dato termino="Ubicación" valor={ubicacionCompleta()} />
        <Dato termino="Fecha" valor={fechaLegible()} />
        <Dato termino="Versión" valor={`${IDENTIDAD.nombre} ${IDENTIDAD.version}`} />
      </dl>
    </header>
  );
}

function Dato({ termino, valor }: { termino: string; valor: string }): ReactNode {
  return (
    <div className="flex gap-1.5">
      <dt className="etiqueta">{termino}:</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function HojaDeEjercicios({ ejercicio }: { ejercicio: Ejercicio }): ReactNode {
  const tienda = usarTienda();
  const fuente = fuentePorId(ejercicio.fuenteId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3>{ejercicio.titulo}</h3>
        <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
          {ejercicio.metodo} · {ejercicio.tiempoEstimadoMinutos} minutos estimados
        </p>
      </div>

      <TextoFormateado texto={ejercicio.enunciado} />

      <div className="flex flex-col gap-3">
        <p className="etiqueta">Responda</p>
        {ejercicio.preguntas.map((p, i) => (
          <div key={p.id} className="flex flex-col gap-1.5">
            <p className="text-[0.875rem]">
              <strong>{i + 1}.</strong> {p.enunciado}
              <span className="ml-1.5 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
                ({p.puntos} punto{p.puntos === 1 ? '' : 's'})
              </span>
            </p>
            <div
              className="h-10 rounded"
              style={{ border: '1px solid var(--borde)', background: 'var(--superficie-2)' }}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>

      {fuente !== null && (
        <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
          Fuente: {fuente.cita}
          {ejercicio.atribucion !== null && tienda.configuracion.mostrarAtribuciones ? ` · ${ejercicio.atribucion}` : ''}
        </p>
      )}

      <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
        Esta hoja no incluye respuestas. La clave docente, con el procedimiento completo, se genera desde el mismo centro de
        reportes.
      </p>
    </div>
  );
}

function ClaveDocente({ ejercicio }: { ejercicio: Ejercicio }): ReactNode {
  const resuelto = resolverEjercicio(ejercicio);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3>{ejercicio.titulo}</h3>
        <Distintivo tono="mal">Clave docente — no distribuir</Distintivo>
      </div>

      <TextoFormateado texto={ejercicio.enunciado} />

      <div className="flex flex-col gap-2">
        <p className="etiqueta">Respuestas de referencia</p>
        <div className="contenedor-tabla">
          <table className="tabla">
            <thead>
              <tr>
                <th scope="col">Pregunta</th>
                <th scope="col" className="text-right">Respuesta</th>
                <th scope="col">Unidad</th>
                <th scope="col" className="text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {ejercicio.preguntas.map((p, i) => (
                <tr key={p.id}>
                  <td className="text-[0.8125rem]">
                    <strong>{i + 1}.</strong> {p.enunciado}
                  </td>
                  <td className="numero">
                    {p.respuesta === null
                      ? 'revisión docente'
                      : typeof p.respuesta === 'number'
                        ? formatearNumero(p.respuesta, { decimales: 4 })
                        : p.respuesta}
                  </td>
                  <td className="text-xs">{p.unidad ?? '—'}</td>
                  <td className="numero">{p.puntos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(resuelto === null || resuelto.pasos.length === 0) && (
        <p className="aviso aviso-nota">
          <span>
            Este ejercicio no tiene procedimiento numérico automático: se resuelve con análisis cualitativo o con el
            constructor visual del laboratorio. La clave se limita a las respuestas de referencia y a las notas del docente.
          </span>
        </p>
      )}

      {resuelto !== null && resuelto.pasos.length > 0 && (
        <div className="flex flex-col gap-4">
          <p className="etiqueta">Procedimiento completo</p>
          {/* Por posición, no por `paso.numero`: cada solucionador numera desde 1
              y dos procedimientos unidos repetirían la clave. */}
          {resuelto.pasos.map((paso: Paso, i) => (
            <div key={i}>
              <VistaPaso paso={paso} />
            </div>
          ))}
        </div>
      )}

      {resuelto !== null && resuelto.interpretacion !== '' && (
        <div>
          <p className="etiqueta">Interpretación</p>
          <p className="prosa text-[0.875rem]">{resuelto.interpretacion}</p>
        </div>
      )}

      {ejercicio.notasDocente !== '' && (
        <div>
          <p className="etiqueta">Notas del docente</p>
          <p className="prosa text-[0.875rem]" style={{ color: 'var(--tinta-media)' }}>
            {ejercicio.notasDocente}
          </p>
        </div>
      )}

      <p className="text-xs" style={{ color: 'var(--tinta-tenue)' }}>
        Los valores de esta clave los calculó el motor matemático de la aplicación con los datos del ejercicio. Verifique
        antes de usarlos como referencia de calificación.
      </p>
    </div>
  );
}

function ComparacionMetodos({ ejercicio }: { ejercicio: Ejercicio }): ReactNode {
  if (ejercicio.datos.tipo !== 'transporte') {
    return (
      <Vacio
        titulo="La comparación de métodos aplica al modelo de transporte"
        descripcion="Elija un ejercicio de transporte para comparar la esquina noroeste, el costo mínimo y la aproximación de Vogel."
      />
    );
  }

  const comparacion = compararMetodosIniciales({ ...ejercicio.datos, titulo: ejercicio.titulo });
  if (comparacion.datos === null) {
    return <Vacio titulo="No fue posible resolver el problema" descripcion="Revise los datos del ejercicio en el laboratorio." />;
  }

  const tabla: TablaExportable = {
    titulo: `Comparación de métodos — ${ejercicio.titulo}`,
    encabezados: ['Método inicial', 'Costo inicial', 'Distancia al óptimo', 'Porcentaje sobre el óptimo', 'Iteraciones MODI', 'Costo óptimo'],
    filas: comparacion.datos.resultados.map((r) => [
      NOMBRE_METODO[r.metodo],
      r.costoInicial,
      r.brecha,
      Number(r.brechaPorcentaje.toFixed(2)),
      r.iteraciones,
      r.costoOptimo,
    ]),
  };

  return (
    <div className="flex flex-col gap-4">
      <h3>{ejercicio.titulo}</h3>
      <TextoFormateado texto={ejercicio.enunciado} />

      {comparacion.pasos.map((paso, i) => (
        <div key={i}>{paso.tabla !== undefined && <TablaDePaso tabla={paso.tabla} />}</div>
      ))}

      <p className="prosa text-[0.875rem]">{comparacion.interpretacion}</p>

      <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro(`comparacion-${ejercicio.id}`))}>
          Exportar CSV
        </button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro(`comparacion-${ejercicio.id}`))}>
          Exportar Excel
        </button>
        <button type="button" className="boton boton-suave boton-pequeno" onClick={() => void copiarTabla(tabla)}>
          Copiar tabla
        </button>
      </div>
    </div>
  );
}

function ReporteIndividual(): ReactNode {
  const tienda = usarTienda();
  const perfil = perfilActual(tienda);

  if (perfil === null) {
    return <Vacio titulo="Sin perfil seleccionado" descripcion="El reporte individual necesita un perfil. Créelo en el panel del estudiante." />;
  }

  const intentos = tienda.intentos.filter((i) => i.perfilId === perfil.id && i.completado);
  const nota = (i: Intento) => notaDeIntento(i, tienda.ejercicios.find((e) => e.id === i.ejercicioId));

  if (intentos.length === 0) {
    return <Vacio titulo="Sin intentos registrados" descripcion="Resuelva al menos un ejercicio para generar el reporte individual." />;
  }

  const tabla: TablaExportable = {
    titulo: `Reporte individual — ${perfil.nombre}`,
    encabezados: ['Fecha', 'Ejercicio', 'Tema', 'Modo', 'Puntaje', 'Máximo', 'Porcentaje', 'Tiempo'],
    filas: intentos.map((i) => [
      fechaLegible(i.iniciadoEn),
      tienda.ejercicios.find((e) => e.id === i.ejercicioId)?.titulo ?? i.ejercicioId,
      NOMBRE_TEMA[i.tema],
      i.modo,
      Number(nota(i).puntaje.toFixed(2)),
      nota(i).maximo,
      Number(nota(i).porcentaje.toFixed(1)),
      duracionLegible(i.segundosEmpleados),
    ]),
  };

  const promedio = intentos.reduce((s, i) => s + nota(i).porcentaje, 0) / intentos.length;
  const pendientes = intentos.reduce((s, i) => s + nota(i).pendientes, 0);
  const errores = new Map<string, number>();
  for (const i of intentos) for (const c of i.erroresDetectados) errores.set(c, (errores.get(c) ?? 0) + 1);

  return (
    <div className="flex flex-col gap-4">
      <h3>Desempeño de {perfil.nombre}</h3>

      <dl className="grid gap-3 sm:grid-cols-4 text-[0.8125rem]">
        <Dato termino="Intentos" valor={String(intentos.length)} />
        <Dato termino="Promedio" valor={`${formatearNumero(promedio, { decimales: 1 })} %`} />
        <Dato termino="Tiempo total" valor={duracionLegible(intentos.reduce((s, i) => s + i.segundosEmpleados, 0))} />
        <Dato termino="Temas trabajados" valor={String(new Set(intentos.map((i) => i.tema)).size)} />
      </dl>

      {pendientes > 0 && (
        <p className="aviso aviso-avisar" role="status">
          {pendientes} respuesta(s) de interpretación siguen sin revisar: el promedio de este reporte todavía no las
          incluye.
        </p>
      )}

      <div className="contenedor-tabla">
        <table className="tabla">
          <thead>
            <tr>
              {tabla.encabezados.map((h, i) => (
                <th key={i} scope="col" className={i >= 4 && i <= 6 ? 'text-right' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f, i) => (
              <tr key={i}>
                {f.map((c, j) => (
                  <td key={j} className={j >= 4 && j <= 6 ? 'numero' : ''}>
                    {String(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errores.size > 0 && (
        <div>
          <p className="etiqueta">Errores típicos detectados</p>
          <ul className="flex flex-wrap gap-2">
            {[...errores.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([codigo, veces]) => (
                <li key={codigo}>
                  <Distintivo tono={veces >= 3 ? 'mal' : 'avisar'}>
                    {codigo} ×{veces}
                  </Distintivo>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro(`reporte-${perfil.nombre}`))}>
          Exportar CSV
        </button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro(`reporte-${perfil.nombre}`))}>
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

function ResumenEvaluacion(): ReactNode {
  const tienda = usarTienda();
  const intentos = tienda.intentos.filter((i) => i.modo === 'evaluacion');
  const nota = (i: Intento) => notaDeIntento(i, tienda.ejercicios.find((e) => e.id === i.ejercicioId));

  if (intentos.length === 0) {
    return <Vacio titulo="Sin evaluaciones rendidas" descripcion="Active el modo evaluación y resuelva un ejercicio para generar este resumen." />;
  }

  const porTema = TEMAS.map((tema) => {
    const delTema = intentos.filter((i) => i.tema === tema);
    if (delTema.length === 0) return null;
    const promedio = delTema.reduce((s, i) => s + nota(i).porcentaje, 0) / delTema.length;
    return { tema, cantidad: delTema.length, promedio, tiempo: delTema.reduce((s, i) => s + i.segundosEmpleados, 0) / delTema.length };
  }).filter((x) => x !== null);

  const tabla: TablaExportable = {
    titulo: 'Resumen de evaluación por tema',
    encabezados: ['Tema', 'Evaluaciones', 'Promedio (%)', 'Tiempo promedio'],
    filas: porTema.map((x) => [NOMBRE_TEMA[x.tema], x.cantidad, Number(x.promedio.toFixed(1)), duracionLegible(x.tiempo)]),
  };

  return (
    <div className="flex flex-col gap-4">
      <h3>Resumen de evaluación</h3>

      <div className="contenedor-tabla">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Tema</th>
              <th scope="col" className="text-right">Evaluaciones</th>
              <th scope="col" className="text-right">Promedio</th>
              <th scope="col" className="text-right">Tiempo promedio</th>
            </tr>
          </thead>
          <tbody>
            {porTema.map((x) => (
              <tr key={x.tema}>
                <td>{NOMBRE_TEMA[x.tema]}</td>
                <td className="numero">{x.cantidad}</td>
                <td className="numero" style={{ color: x.promedio >= 70 ? 'var(--bien)' : 'var(--avisar)' }}>
                  {formatearNumero(x.promedio, { decimales: 1 })} %
                </td>
                <td className="numero">{duracionLegible(x.tiempo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro('resumen-evaluacion'))}>
          Exportar Excel
        </button>
      </div>
    </div>
  );
}

function RegistroCalificaciones(): ReactNode {
  const tienda = usarTienda();

  if (tienda.perfiles.length === 0 || tienda.intentos.length === 0) {
    return (
      <Vacio
        titulo="Sin datos para el registro"
        descripcion="El registro de calificaciones se arma con los intentos de los perfiles guardados en este equipo. No contiene datos de estudiantes reales a menos que usted los cree."
      />
    );
  }

  const nota = (i: Intento) => notaDeIntento(i, tienda.ejercicios.find((e) => e.id === i.ejercicioId));

  const filas = tienda.perfiles.map((p) => {
    const suyos = tienda.intentos.filter((i) => i.perfilId === p.id && i.completado);
    const porTema = TEMAS.map((t) => {
      const delTema = suyos.filter((i) => i.tema === t);
      if (delTema.length === 0) return '';
      const promedio = delTema.reduce((s, i) => s + nota(i).porcentaje, 0) / delTema.length;
      return Number(promedio.toFixed(1));
    });
    const conNota = porTema.filter((x): x is number => typeof x === 'number');
    const general = conNota.length === 0 ? 0 : conNota.reduce((a, b) => a + b, 0) / conNota.length;
    return [p.nombre, p.matricula, ...porTema, Number(general.toFixed(1))];
  });

  const tabla: TablaExportable = {
    titulo: 'Registro de calificaciones',
    encabezados: ['Estudiante', 'Matrícula', ...TEMAS.map((t) => NOMBRE_TEMA[t]), 'Promedio general'],
    filas,
  };

  return (
    <div className="flex flex-col gap-4">
      <h3>Registro de calificaciones</h3>
      <p className="text-[0.8125rem]" style={{ color: 'var(--tinta-media)' }}>
        Promedio por tema de cada perfil de este equipo, en porcentaje. Las celdas vacías indican temas sin intentos.
      </p>

      <div className="contenedor-tabla">
        <table className="tabla">
          <thead>
            <tr>
              {tabla.encabezados.map((h, i) => (
                <th key={i} scope="col" className={i >= 2 ? 'text-right' : ''}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tabla.filas.map((f, i) => (
              <tr key={i}>
                {f.map((c, j) => (
                  <td key={j} className={j >= 2 ? 'numero' : ''}>
                    {c === '' ? '—' : String(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 ocultar-al-imprimir">
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarCSV(tabla, nombreSeguro('registro-calificaciones'))}>
          Exportar CSV
        </button>
        <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => exportarExcel([tabla], nombreSeguro('registro-calificaciones'))}>
          Exportar Excel
        </button>
        <button type="button" className="boton boton-suave boton-pequeno" onClick={() => void copiarTabla(tabla)}>
          Copiar al portapapeles
        </button>
      </div>
    </div>
  );
}

/**
 * Arma el contenido del reporte actual para el PDF.
 *
 * Vive aparte de los componentes porque el PDF no dibuja JSX: necesita el mismo
 * material en forma de párrafos y tablas. Lo que no cabe en ese formato —las
 * gráficas, los diagramas— se queda fuera y la ayuda del botón lo dice, en vez
 * de entregar un archivo al que le faltan cosas sin avisar.
 */
function contenidoParaPDF(
  tipo: TipoReporte,
  tienda: Estado,
  ejercicio: Ejercicio | null,
  encabezado: EncabezadoReporte,
): ContenidoPDF | null {
  const nota = (i: Intento) => notaDeIntento(i, tienda.ejercicios.find((e) => e.id === i.ejercicioId));
  const tituloDe = (id: string): string => tienda.ejercicios.find((e) => e.id === id)?.titulo ?? id;

  if (tipo === 'hoja' || tipo === 'clave') {
    if (ejercicio === null) return null;
    const resuelto = resolverEjercicio(ejercicio);
    const fuente = fuentePorId(ejercicio.fuenteId);

    const secciones: SeccionPDF[] = [
      {
        titulo: ejercicio.titulo,
        parrafos: [
          `${ejercicio.metodo} · ${ejercicio.tiempoEstimadoMinutos} minutos estimados`,
          ejercicio.enunciado.replace(/\*\*/g, ''),
        ],
      },
      {
        titulo: 'Preguntas',
        parrafos: ejercicio.preguntas.map(
          (p, i) =>
            `${i + 1}. ${p.enunciado.replace(/\*\*/g, '')} (${p.puntos} puntos)` +
            (tipo === 'clave' && p.respuesta !== null
              ? `\nRespuesta: ${typeof p.respuesta === 'number' ? formatearNumero(p.respuesta) : p.respuesta}${p.unidad === null ? '' : ` ${p.unidad}`}`
              : ''),
        ),
      },
    ];

    if (tipo === 'clave' && resuelto !== null) {
      secciones.push({
        titulo: 'Procedimiento',
        parrafos: resuelto.pasos.map((p, i) => `${i + 1}. ${p.titulo}\n${p.explicacion.replace(/\*\*/g, '')}`),
        tablas: resuelto.pasos
          .filter((p) => p.tabla !== undefined)
          .map((p) => ({
            titulo: p.titulo,
            encabezados: p.tabla!.encabezados,
            filas: p.tabla!.filas,
          })),
      });
      if (resuelto.interpretacion !== '') {
        secciones.push({ titulo: 'Interpretación', parrafos: [resuelto.interpretacion] });
      }
    }

    if (fuente !== null) secciones.push({ titulo: 'Fuente', parrafos: [fuente.cita] });
    if (ejercicio.origen !== 'textual') {
      secciones.push({ parrafos: [`Origen del ejercicio: ${DESCRIPCION_ORIGEN[ejercicio.origen]}. ${ejercicio.atribucion}`] });
    }

    return { titulo: ejercicio.titulo, encabezado, secciones };
  }

  if (tipo === 'individual') {
    const perfil = perfilActual(tienda);
    if (perfil === null) return null;
    const intentos = tienda.intentos.filter((i) => i.perfilId === perfil.id && i.completado);
    if (intentos.length === 0) return null;

    return {
      titulo: perfil.nombre,
      encabezado,
      secciones: [
        {
          titulo: `Desempeño de ${perfil.nombre}`,
          parrafos: [
            `${intentos.length} intento(s) registrados, con un promedio de ` +
              `${formatearNumero(intentos.reduce((s, i) => s + nota(i).porcentaje, 0) / intentos.length, { decimales: 1 })} %.`,
          ],
          tablas: [
            {
              titulo: 'Intentos',
              encabezados: ['Fecha', 'Ejercicio', 'Tema', 'Puntaje', 'Máximo', '%'],
              filas: intentos.map((i) => [
                fechaCorta(i.iniciadoEn),
                tituloDe(i.ejercicioId),
                NOMBRE_TEMA[i.tema],
                Number(nota(i).puntaje.toFixed(2)),
                nota(i).maximo,
                Number(nota(i).porcentaje.toFixed(1)),
              ]),
            },
          ],
        },
      ],
    };
  }

  if (tipo === 'calificaciones') {
    if (tienda.perfiles.length === 0) return null;
    return {
      titulo: 'Registro de calificaciones',
      encabezado,
      secciones: [
        {
          parrafos: ['Promedio por tema de cada perfil de este equipo, en porcentaje. Las celdas vacías son temas sin intentos.'],
          tablas: [
            {
              titulo: 'Calificaciones',
              encabezados: ['Estudiante', 'Matrícula', ...TEMAS.map((t) => NOMBRE_TEMA[t])],
              filas: tienda.perfiles.map((p) => {
                const suyos = tienda.intentos.filter((i) => i.perfilId === p.id && i.completado);
                return [
                  p.nombre,
                  p.matricula,
                  ...TEMAS.map((t) => {
                    const delTema = suyos.filter((i) => i.tema === t);
                    if (delTema.length === 0) return '';
                    return Number((delTema.reduce((s, i) => s + nota(i).porcentaje, 0) / delTema.length).toFixed(1));
                  }),
                ];
              }),
            },
          ],
        },
      ],
    };
  }

  return null;
}
