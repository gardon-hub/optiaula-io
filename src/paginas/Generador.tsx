/**
 * Generador de ejercicios reproducible por semilla.
 *
 * Antes de publicar, el generador resuelve el ejercicio con el propio motor y
 * verifica que tenga solución válida, datos coherentes y dificultad acorde. Las
 * verificaciones se muestran una por una: nada se publica a ciegas.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { CONTEXTOS, NOMBRE_CONTEXTO, NOMBRE_DIFICULTAD, NOMBRE_TEMA, type Contexto, type Dificultad, type Moneda, type Tema } from '@/esquemas';
import { usarTienda } from '@/almacen/tienda';
import { TEMAS_GENERABLES, generarEjercicio, generarSerie, type OpcionesGenerador } from '@/nucleo/generador';
import { semillaDesdeTexto } from '@/nucleo/numero';
import { enlaces, irA } from '@/rutas';
import { CampoNumero, CampoTexto, Distintivo, Indicador, Interruptor, Seccion, Selector, Tarjeta, TextoFormateado } from '@/ui/base';

export function PaginaGenerador(): ReactNode {
  const tienda = usarTienda();

  const [opciones, setOpciones] = useState<OpcionesGenerador>({
    tema: 'transporte',
    dificultad: 'intermedio',
    semilla: 2026,
    contexto: 'lacteos',
    moneda: 'HNL',
    tamanoFilas: 3,
    tamanoColumnas: 4,
    objetivo: 'minimizar',
    magnitud: 'media',
    balanceado: true,
    rutasCriticasMultiples: false,
    incluirProhibiciones: false,
  });

  const [semillaTexto, setSemillaTexto] = useState('');
  const [cantidad, setCantidad] = useState(1);

  const resultado = useMemo(() => generarEjercicio(opciones), [opciones]);
  const todasPasan = resultado.verificaciones.every((v) => v.paso);

  const cambiar = <K extends keyof OpcionesGenerador>(clave: K, valor: OpcionesGenerador[K]): void =>
    setOpciones((s) => ({ ...s, [clave]: valor }));

  const publicar = (): void => {
    if (resultado.ejercicio === null) return;
    tienda.guardarEjercicio(resultado.ejercicio);
    tienda.avisar('Ejercicio generado, verificado y agregado a la biblioteca.', 'bien');
    irA(`ejercicio/${resultado.ejercicio.id}`);
  };

  const publicarSerie = (): void => {
    const serie = generarSerie(opciones, cantidad);
    const validos = serie.filter((r) => r.ejercicio !== null);
    for (const r of validos) if (r.ejercicio !== null) tienda.guardarEjercicio(r.ejercicio);
    tienda.avisar(
      validos.length === cantidad
        ? `${validos.length} ejercicios generados y verificados, agregados a la biblioteca.`
        : `Se generaron ${validos.length} de ${cantidad}. Los demás no pasaron la verificación y se descartaron.`,
      validos.length === cantidad ? 'bien' : 'avisar',
    );
  };

  const esRed = opciones.tema === 'cpm' || opciones.tema === 'pert';

  return (
    <Seccion
      titulo="Generador de ejercicios"
      eyebrow="Modo docente"
      descripcion="Reproducible por semilla: la misma semilla produce siempre el mismo ejercicio, de modo que se puede regenerar un examen idéntico meses después. Cada ejercicio se resuelve y verifica antes de publicarse."
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="flex flex-col gap-4">
          <Tarjeta titulo="Parámetros">
            <div className="flex flex-col gap-3">
              <Selector
                etiqueta="Tema"
                valor={opciones.tema}
                opciones={TEMAS_GENERABLES.map((t) => ({ valor: t, texto: NOMBRE_TEMA[t] }))}
                alCambiar={(v) => cambiar('tema', v as Tema)}
                ayuda="Fundamentos, localización y distribución se crean a mano desde el panel docente."
              />
              <Selector
                etiqueta="Nivel"
                valor={opciones.dificultad}
                opciones={(['basico', 'intermedio', 'avanzado'] as const).map((d) => ({ valor: d, texto: NOMBRE_DIFICULTAD[d] }))}
                alCambiar={(v) => cambiar('dificultad', v as Dificultad)}
              />
              <Selector
                etiqueta="Contexto productivo"
                valor={opciones.contexto}
                opciones={CONTEXTOS.map((c) => ({ valor: c, texto: NOMBRE_CONTEXTO[c] }))}
                alCambiar={(v) => cambiar('contexto', v as Contexto)}
                ayuda="Define el vocabulario del enunciado: galeras, fincas, estanques, bodegas…"
              />
              <Selector
                etiqueta="Moneda"
                valor={opciones.moneda}
                opciones={[
                  { valor: 'HNL' as const, texto: 'Lempira hondureño (L)' },
                  { valor: 'USD' as const, texto: 'Dólar estadounidense (US$)' },
                ]}
                alCambiar={(v) => cambiar('moneda', v as Moneda)}
              />

              <div className="grid grid-cols-2 gap-3">
                <CampoNumero
                  etiqueta={esRed ? 'Actividades' : opciones.tema === 'transporte' ? 'Orígenes' : 'Filas'}
                  valor={opciones.tamanoFilas}
                  minimo={2}
                  maximo={esRed ? 14 : 7}
                  paso={1}
                  alCambiar={(v) => cambiar('tamanoFilas', Math.max(2, Math.round(v ?? 4)))}
                />
                {!esRed && opciones.tema !== 'productividad' && opciones.tema !== 'equilibrio' && (
                  <CampoNumero
                    etiqueta={opciones.tema === 'transporte' ? 'Destinos' : 'Columnas'}
                    valor={opciones.tamanoColumnas}
                    minimo={2}
                    maximo={7}
                    paso={1}
                    alCambiar={(v) => cambiar('tamanoColumnas', Math.max(2, Math.round(v ?? 4)))}
                  />
                )}
              </div>

              <Selector
                etiqueta="Magnitud de los números"
                valor={opciones.magnitud}
                opciones={[
                  { valor: 'pequena' as const, texto: 'Pequeña (5 a 40)' },
                  { valor: 'media' as const, texto: 'Media (40 a 400)' },
                  { valor: 'grande' as const, texto: 'Grande (400 a 4 000)' },
                ]}
                alCambiar={(v) => cambiar('magnitud', v as OpcionesGenerador['magnitud'])}
              />

              {opciones.tema === 'asignacion' && (
                <>
                  <Selector
                    etiqueta="Tipo de objetivo"
                    valor={opciones.objetivo}
                    opciones={[
                      { valor: 'minimizar' as const, texto: 'Minimizar (costo, tiempo, combustible)' },
                      { valor: 'maximizar' as const, texto: 'Maximizar (eficiencia, rendimiento)' },
                    ]}
                    alCambiar={(v) => cambiar('objetivo', v as 'minimizar' | 'maximizar')}
                  />
                  <Interruptor
                    etiqueta="Incluir asignaciones prohibidas"
                    activo={opciones.incluirProhibiciones}
                    alCambiar={(v) => cambiar('incluirProhibiciones', v)}
                    ayuda="El generador garantiza que el problema siga teniendo solución."
                  />
                </>
              )}

              {opciones.tema === 'transporte' && (
                <Interruptor
                  etiqueta="Problema balanceado"
                  activo={opciones.balanceado}
                  alCambiar={(v) => cambiar('balanceado', v)}
                  ayuda="Apáguelo para practicar casos con origen o destino ficticio."
                />
              )}

              {esRed && (
                <Interruptor
                  etiqueta="Forzar rutas críticas múltiples"
                  activo={opciones.rutasCriticasMultiples}
                  alCambiar={(v) => cambiar('rutasCriticasMultiples', v)}
                  ayuda="Genera dos ramas gemelas que convergen, para practicar el caso donde acortar una sola no adelanta nada."
                />
              )}
            </div>
          </Tarjeta>

          <Tarjeta titulo="Semilla" descripcion="La misma semilla produce siempre el mismo ejercicio.">
            <div className="flex flex-col gap-3">
              <CampoNumero etiqueta="Semilla numérica" valor={opciones.semilla} paso={1} alCambiar={(v) => cambiar('semilla', Math.round(v ?? 0))} />
              <CampoTexto
                etiqueta="…o derívela de un texto"
                valor={semillaTexto}
                alCambiar={(v) => {
                  setSemillaTexto(v);
                  if (v.trim() !== '') cambiar('semilla', semillaDesdeTexto(v));
                }}
                marcador="Examen 3, sección A, 2026"
                ayuda="Útil para regenerar el mismo examen sin anotar el número."
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="boton boton-secundario boton-pequeno" onClick={() => cambiar('semilla', (opciones.semilla + 1) >>> 0)}>
                  Siguiente semilla
                </button>
                <button
                  type="button"
                  className="boton boton-suave boton-pequeno"
                  onClick={() => cambiar('semilla', Math.floor(Math.random() * 100000))}
                >
                  Semilla al azar
                </button>
              </div>
            </div>
          </Tarjeta>
        </div>

        <div className="flex flex-col gap-4">
          <Tarjeta
            titulo="Verificación previa a publicar"
            descripcion="El generador resuelve el ejercicio con el motor de la aplicación y comprueba estas condiciones. Si alguna falla, reintenta con la siguiente semilla derivada."
            acciones={
              <Distintivo tono={todasPasan ? 'bien' : 'mal'}>
                {todasPasan ? 'Aprobado' : 'No aprobado'}
              </Distintivo>
            }
          >
            <ul className="flex flex-col gap-2">
              {resultado.verificaciones.map((v, i) => (
                <li key={i} className={`aviso ${v.paso ? 'aviso-bien' : 'aviso-mal'}`}>
                  <span>
                    <strong>{v.nombre}.</strong> {v.detalle}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Indicador etiqueta="Intentos de generación" valor={resultado.intentos} nota={resultado.intentos > 1 ? 'Hubo semillas descartadas' : 'Aprobó al primer intento'} />
              <Indicador etiqueta="Semilla usada" valor={<span className="dato text-base">{resultado.semillaUsada}</span>} />
              <Indicador etiqueta="Estado" valor={resultado.ejercicio === null ? 'sin publicar' : 'listo'} tono={resultado.ejercicio === null ? 'mal' : 'bien'} />
            </div>
          </Tarjeta>

          {resultado.ejercicio !== null && (
            <Tarjeta
              titulo={resultado.ejercicio.titulo}
              descripcion={`${resultado.ejercicio.metodo} · ${NOMBRE_DIFICULTAD[resultado.ejercicio.dificultad]} · ${resultado.ejercicio.tiempoEstimadoMinutos} min`}
              acciones={
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="boton boton-primario boton-pequeno" onClick={publicar}>
                    Publicar en la biblioteca
                  </button>
                </div>
              }
            >
              <TextoFormateado texto={resultado.ejercicio.enunciado} />
            </Tarjeta>
          )}

          <Tarjeta
            titulo="Generar una serie"
            descripcion="Produce varios ejercicios distintos a partir de la semilla base. Útil para dar a cada estudiante una versión propia del mismo examen."
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-32">
                <CampoNumero etiqueta="Cantidad" valor={cantidad} minimo={1} maximo={30} paso={1} alCambiar={(v) => setCantidad(Math.max(1, Math.min(30, Math.round(v ?? 1))))} />
              </div>
              <button type="button" className="boton boton-produccion" onClick={publicarSerie}>
                Generar y publicar {cantidad} ejercicio{cantidad === 1 ? '' : 's'}
              </button>
              <a href={enlaces.biblioteca} className="boton boton-suave boton-pequeno no-underline">
                Ver la biblioteca
              </a>
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--tinta-tenue)' }}>
              Cada ejercicio de la serie se verifica por separado. Los que no aprueben se descartan y se informa cuántos
              quedaron: no se publica nada sin verificar.
            </p>
          </Tarjeta>
        </div>
      </div>
    </Seccion>
  );
}
