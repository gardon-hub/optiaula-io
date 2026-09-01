/**
 * Estado global de la aplicación (Zustand).
 *
 * La regla es simple: aquí vive lo que persiste y lo que cruza pantallas.
 * Lo que solo importa dentro de un laboratorio se queda en el componente.
 */

import { create } from 'zustand';
import {
  esquemaConfiguracion,
  esquemaEjercicio,
  esquemaRespaldo,
  validar,
  type Configuracion,
  type Ejercicio,
  type Evaluacion,
  type Inconsistencia,
  type Intento,
  type Perfil,
  type ProgresoTema,
  type Respaldo,
  type Revision,
  type Tema,
  TEMAS,
} from '@/esquemas';
import { BIBLIOTECA_INICIAL } from '@/datos/ejercicios';
import { INCONSISTENCIAS_INICIALES } from '@/datos/inconsistencias';
import { IDENTIDAD } from '@/config/identidad';
import { aplicarRevision } from '@/nucleo/revision';
import { aplicarDecisionesA } from '@/nucleo/aplicarDecisiones';
import * as bd from './baseDatos';

export type Modo = Configuracion['modo'];

export interface Estado {
  readonly listo: boolean;
  readonly configuracion: Configuracion;
  readonly perfiles: readonly Perfil[];
  readonly perfilActualId: string | null;
  readonly ejercicios: readonly Ejercicio[];
  readonly intentos: readonly Intento[];
  readonly evaluaciones: readonly Evaluacion[];
  readonly progreso: readonly ProgresoTema[];
  readonly inconsistencias: readonly Inconsistencia[];
  readonly favoritos: readonly string[];
  readonly mensajeGlobal: { texto: string; tono: 'bien' | 'avisar' | 'mal' } | null;

  iniciar(): Promise<void>;
  fijarConfiguracion(parcial: Partial<Configuracion>): void;
  fijarModo(modo: Modo): void;

  crearPerfil(nombre: string, rol: Perfil['rol'], matricula?: string): Perfil;
  seleccionarPerfil(id: string | null): void;
  eliminarPerfil(id: string): void;

  guardarEjercicio(ejercicio: Ejercicio): void;
  duplicarEjercicio(id: string): Ejercicio | null;
  eliminarEjercicio(id: string): void;
  alternarFavorito(id: string): void;

  registrarIntento(intento: Intento): void;
  revisarInterpretacion(intentoId: string, preguntaId: string, revision: Revision | null): void;
  guardarEvaluacion(evaluacion: Evaluacion): void;
  eliminarEvaluacion(id: string): void;

  decidirInconsistencia(id: string, opcionId: string): void;

  exportarRespaldo(): Respaldo;
  importarRespaldo(crudo: unknown): { ok: boolean; errores: readonly string[] };
  borrarTodo(): Promise<void>;

  avisar(texto: string, tono?: 'bien' | 'avisar' | 'mal'): void;
  limpiarAviso(): void;
}

const CONFIG_INICIAL: Configuracion = esquemaConfiguracion.parse({
  monedaPredeterminada: IDENTIDAD.localizacion.monedaPredeterminada,
  decimales: IDENTIDAD.localizacion.decimalesPredeterminados,
  curso: {
    nombre: IDENTIDAD.curso.nombre,
    codigo: IDENTIDAD.curso.codigo,
    periodo: IDENTIDAD.curso.periodo,
    anio: IDENTIDAD.curso.anio,
    docente: IDENTIDAD.autor.nombre,
    institucion: IDENTIDAD.institucion.nombre,
  },
});

const PROGRESO_INICIAL: ProgresoTema[] = TEMAS.map((tema) => ({
  tema,
  leccionesVistas: [],
  ejerciciosResueltos: 0,
  ejerciciosCorrectos: 0,
  ultimaVisita: null,
  dominio: 0,
}));

/** Recalcula el dominio de un tema a partir de sus intentos. */
function recalcularProgreso(
  progreso: readonly ProgresoTema[],
  intentos: readonly Intento[],
  tema: Tema,
): ProgresoTema[] {
  const delTema = intentos.filter((i) => i.tema === tema && i.completado);
  const resueltos = delTema.length;
  const correctos = delTema.filter((i) => i.puntajeMaximo > 0 && i.puntaje / i.puntajeMaximo >= 0.7).length;

  // El dominio pondera los tres intentos más recientes, que reflejan mejor el
  // estado actual que el promedio de todo el historial.
  const recientes = delTema.slice(-3);
  const dominio =
    recientes.length === 0
      ? 0
      : Math.round(
          (recientes.reduce((s, i) => s + (i.puntajeMaximo > 0 ? i.puntaje / i.puntajeMaximo : 0), 0) /
            recientes.length) *
            100,
        );

  return progreso.map((p) =>
    p.tema === tema
      ? { ...p, ejerciciosResueltos: resueltos, ejerciciosCorrectos: correctos, dominio, ultimaVisita: new Date().toISOString() }
      : p,
  );
}

export const usarTienda = create<Estado>((set, get) => ({
  listo: false,
  configuracion: CONFIG_INICIAL,
  perfiles: [],
  perfilActualId: null,
  ejercicios: BIBLIOTECA_INICIAL,
  intentos: [],
  evaluaciones: [],
  progreso: PROGRESO_INICIAL,
  inconsistencias: INCONSISTENCIAS_INICIALES,
  favoritos: [],
  mensajeGlobal: null,

  async iniciar() {
    if (get().listo) return;

    const [config, perfiles, propios, intentos, evaluaciones, progreso, inconsistencias, favoritos] =
      await Promise.all([
        bd.leerConfiguracion(),
        bd.leerTodo('perfiles'),
        bd.leerTodo('ejercicios'),
        bd.leerTodo('intentos'),
        bd.leerTodo('evaluaciones'),
        bd.leerTodo('progreso'),
        bd.leerTodo('inconsistencias'),
        bd.leerTodo('favoritos'),
      ]);

    const decisiones = new Map(inconsistencias.map((i) => [i.id, i]));
    const inconsistenciasFinales = INCONSISTENCIAS_INICIALES.map((i) => decisiones.get(i.id) ?? i);

    const progresoPorTema = new Map(progreso.map((p) => [p.tema, p]));

    set({
      listo: true,
      configuracion: config ?? CONFIG_INICIAL,
      perfiles,
      perfilActualId: perfiles[0]?.id ?? null,
      ejercicios: componerBiblioteca(propios, inconsistenciasFinales),
      intentos,
      evaluaciones,
      progreso: PROGRESO_INICIAL.map((p) => progresoPorTema.get(p.tema) ?? p),
      inconsistencias: inconsistenciasFinales,
      favoritos: favoritos.map((f) => f.id),
    });
  },

  fijarConfiguracion(parcial) {
    const configuracion = { ...get().configuracion, ...parcial };
    set({ configuracion });
    void bd.guardarConfiguracion(configuracion);
  },

  fijarModo(modo) {
    get().fijarConfiguracion({ modo });
  },

  crearPerfil(nombre, rol, matricula = '') {
    const perfil: Perfil = {
      id: bd.nuevoId('perfil'),
      nombre,
      rol,
      matricula,
      creadoEn: new Date().toISOString(),
    };
    set((s) => ({ perfiles: [...s.perfiles, perfil], perfilActualId: perfil.id }));
    void bd.guardar('perfiles', perfil);
    return perfil;
  },

  seleccionarPerfil(id) {
    set({ perfilActualId: id });
  },

  eliminarPerfil(id) {
    set((s) => ({
      perfiles: s.perfiles.filter((p) => p.id !== id),
      perfilActualId: s.perfilActualId === id ? null : s.perfilActualId,
      intentos: s.intentos.filter((i) => i.perfilId !== id),
    }));
    void bd.eliminar('perfiles', id);
  },

  guardarEjercicio(ejercicio) {
    const r = validar(esquemaEjercicio, { ...ejercicio, modificadoEn: new Date().toISOString() });
    if (!r.ok || r.datos === null) {
      get().avisar(`No se pudo guardar el ejercicio: ${r.errores[0] ?? 'datos inválidos'}`, 'mal');
      return;
    }
    const valido = r.datos;
    set((s) => {
      const existe = s.ejercicios.some((e) => e.id === valido.id);
      return {
        ejercicios: existe ? s.ejercicios.map((e) => (e.id === valido.id ? valido : e)) : [...s.ejercicios, valido],
      };
    });
    void bd.guardar('ejercicios', valido);
  },

  duplicarEjercicio(id) {
    const original = get().ejercicios.find((e) => e.id === id);
    if (!original) return null;
    const copia: Ejercicio = {
      ...original,
      id: bd.nuevoId('ej'),
      titulo: `${original.titulo} (copia)`,
      origen: 'docente',
      creadoEn: new Date().toISOString(),
      modificadoEn: new Date().toISOString(),
    };
    get().guardarEjercicio(copia);
    return copia;
  },

  eliminarEjercicio(id) {
    const esInicial = BIBLIOTECA_INICIAL.some((e) => e.id === id);
    if (esInicial) {
      get().avisar(
        'Los ejercicios que vienen de los materiales del curso no se pueden eliminar, para no perder la trazabilidad con la fuente. Duplíquelo y edite la copia.',
        'avisar',
      );
      return;
    }
    set((s) => ({ ejercicios: s.ejercicios.filter((e) => e.id !== id) }));
    void bd.eliminar('ejercicios', id);
  },

  alternarFavorito(id) {
    const esFavorito = get().favoritos.includes(id);
    set((s) => ({
      favoritos: esFavorito ? s.favoritos.filter((f) => f !== id) : [...s.favoritos, id],
    }));
    if (esFavorito) void bd.eliminar('favoritos', id);
    else void bd.guardar('favoritos', { id, agregadoEn: new Date().toISOString() });
  },

  registrarIntento(intento) {
    set((s) => {
      const intentos = s.intentos.some((i) => i.id === intento.id)
        ? s.intentos.map((i) => (i.id === intento.id ? intento : i))
        : [...s.intentos, intento];
      return { intentos, progreso: recalcularProgreso(s.progreso, intentos, intento.tema) };
    });
    void bd.guardar('intentos', intento);
    const p = get().progreso.find((x) => x.tema === intento.tema);
    if (p) void bd.guardar('progreso', p);
  },

  revisarInterpretacion(intentoId, preguntaId, revision) {
    const actual = get().intentos.find((i) => i.id === intentoId);
    if (actual === undefined) return;

    // La revisión toca solo la respuesta: el puntaje automático del intento no
    // se modifica nunca, y la nota final se calcula sumando las dos partes.
    const actualizado = aplicarRevision(actual, preguntaId, revision);
    set((s) => ({ intentos: s.intentos.map((i) => (i.id === intentoId ? actualizado : i)) }));
    void bd.guardar('intentos', actualizado);
  },

  guardarEvaluacion(evaluacion) {
    set((s) => ({
      evaluaciones: s.evaluaciones.some((e) => e.id === evaluacion.id)
        ? s.evaluaciones.map((e) => (e.id === evaluacion.id ? evaluacion : e))
        : [...s.evaluaciones, evaluacion],
    }));
    void bd.guardar('evaluaciones', evaluacion);
  },

  eliminarEvaluacion(id) {
    set((s) => ({ evaluaciones: s.evaluaciones.filter((e) => e.id !== id) }));
    void bd.eliminar('evaluaciones', id);
  },

  decidirInconsistencia(id, opcionId) {
    const actualizada = get().inconsistencias.map((i) =>
      i.id === id ? { ...i, decision: opcionId, decididoEn: new Date().toISOString() } : i,
    );
    set({ inconsistencias: actualizada });
    const registro = actualizada.find((i) => i.id === id);
    if (registro) void bd.guardar('inconsistencias', registro);

    // La biblioteca se recompone entera desde los datos originales. No se
    // guarda el ejercicio transformado: la decisión ya está persistida y es la
    // única fuente de verdad, así que cambiar de opinión no acumula cambios.
    set({ ejercicios: componerBiblioteca(get().ejercicios.filter(esPropio), actualizada) });
  },

  exportarRespaldo() {
    const s = get();
    return {
      aplicacion: 'OPTIAULA IO',
      version: IDENTIDAD.version,
      exportadoEn: new Date().toISOString(),
      configuracion: s.configuracion,
      perfiles: [...s.perfiles],
      // Solo se respaldan los ejercicios propios: los de los materiales
      // vienen siempre con la aplicación y duplicarlos infla el archivo.
      ejercicios: s.ejercicios.filter((e) => !BIBLIOTECA_INICIAL.some((b) => b.id === e.id)),
      intentos: [...s.intentos],
      evaluaciones: [...s.evaluaciones],
      progreso: [...s.progreso],
      inconsistencias: [...s.inconsistencias],
      favoritos: [...s.favoritos],
    };
  },

  importarRespaldo(crudo) {
    const r = validar(esquemaRespaldo, crudo);
    if (!r.ok || r.datos === null) {
      return { ok: false, errores: r.errores.slice(0, 8) };
    }
    const d = r.datos;

    const decisiones = new Map(d.inconsistencias.map((i) => [i.id, i]));
    const inconsistenciasImportadas = INCONSISTENCIAS_INICIALES.map((i) => decisiones.get(i.id) ?? i);

    set({
      configuracion: d.configuracion,
      perfiles: d.perfiles,
      perfilActualId: d.perfiles[0]?.id ?? null,
      ejercicios: componerBiblioteca(d.ejercicios, inconsistenciasImportadas),
      intentos: d.intentos,
      evaluaciones: d.evaluaciones,
      progreso: PROGRESO_INICIAL.map((p) => d.progreso.find((x) => x.tema === p.tema) ?? p),
      inconsistencias: inconsistenciasImportadas,
      favoritos: d.favoritos,
    });

    void bd.guardarConfiguracion(d.configuracion);
    void bd.guardarVarios('perfiles', d.perfiles);
    void bd.guardarVarios('ejercicios', d.ejercicios);
    void bd.guardarVarios('intentos', d.intentos);
    void bd.guardarVarios('evaluaciones', d.evaluaciones);
    void bd.guardarVarios('progreso', d.progreso);
    void bd.guardarVarios('inconsistencias', d.inconsistencias);
    void bd.guardarVarios('favoritos', d.favoritos.map((id) => ({ id, agregadoEn: new Date().toISOString() })));

    return { ok: true, errores: [] };
  },

  async borrarTodo() {
    await bd.borrarTodo();
    set({
      configuracion: CONFIG_INICIAL,
      perfiles: [],
      perfilActualId: null,
      ejercicios: BIBLIOTECA_INICIAL,
      intentos: [],
      evaluaciones: [],
      progreso: PROGRESO_INICIAL,
      inconsistencias: INCONSISTENCIAS_INICIALES,
      favoritos: [],
    });
  },

  avisar(texto, tono = 'bien') {
    set({ mensajeGlobal: { texto, tono } });
  },

  limpiarAviso() {
    set({ mensajeGlobal: null });
  },
}));

/**
 * Aplica el efecto de una decisión de auditoría sobre los datos del ejercicio
 * afectado. Solo se ejecuta cuando el docente decide explícitamente.
 */
/** Un ejercicio es propio si no viene de la biblioteca del curso. */
function esPropio(e: Ejercicio): boolean {
  return !BIBLIOTECA_INICIAL.some((b) => b.id === e.id);
}

/**
 * Compone la biblioteca visible: los ejercicios del curso con las decisiones de
 * auditoría aplicadas, más los que creó el docente.
 *
 * Se parte **siempre** de `BIBLIOTECA_INICIAL`, nunca del estado ya
 * transformado, y los ejercicios del curso no se persisten: la decisión sí, y
 * de ella se deriva todo lo demás. Así cambiar de opinión no encadena
 * transformaciones —intercambiar dos planos dos veces devolvería el original
 * sin que nadie lo notara— y una copia vieja guardada en la base no puede
 * volver a transformarse.
 */
function componerBiblioteca(
  propios: readonly Ejercicio[],
  inconsistencias: readonly Inconsistencia[],
): Ejercicio[] {
  return [...aplicarDecisionesA(BIBLIOTECA_INICIAL, inconsistencias), ...propios.filter(esPropio)];
}

// ───────────────────────────── Selectores ─────────────────────────────

export function perfilActual(estado: Estado): Perfil | null {
  return estado.perfiles.find((p) => p.id === estado.perfilActualId) ?? null;
}

export function intentosDelPerfil(estado: Estado, perfilId: string | null): Intento[] {
  if (perfilId === null) return [];
  return estado.intentos.filter((i) => i.perfilId === perfilId);
}

export function progresoGeneral(estado: Estado): number {
  if (estado.progreso.length === 0) return 0;
  return Math.round(estado.progreso.reduce((s, p) => s + p.dominio, 0) / estado.progreso.length);
}

/** Tema recomendado: el primero del orden del curso cuyo dominio sea bajo. */
export function temaRecomendado(estado: Estado): Tema {
  const pendiente = TEMAS.find((t) => (estado.progreso.find((p) => p.tema === t)?.dominio ?? 0) < 70);
  return pendiente ?? 'transporte';
}

export function ultimoTemaVisitado(estado: Estado): Tema | null {
  const conVisita = estado.progreso.filter((p) => p.ultimaVisita !== null);
  if (conVisita.length === 0) return null;
  return conVisita.reduce((a, b) => ((b.ultimaVisita ?? '') > (a.ultimaVisita ?? '') ? b : a)).tema;
}

export function inconsistenciasPendientes(estado: Estado): Inconsistencia[] {
  return estado.inconsistencias.filter((i) => i.decision === null);
}
