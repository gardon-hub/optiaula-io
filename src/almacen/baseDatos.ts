/**
 * Persistencia local con IndexedDB.
 *
 * Todo vive en el navegador del usuario. No hay servidor, no hay cuenta, no
 * hay envío de datos a ningún lado. El respaldo y la restauración se hacen por
 * archivo JSON, que el usuario controla.
 *
 * La estructura está pensada para poder migrar a Supabase u otro backend más
 * adelante sin reescribir la aplicación: cada colección tiene clave propia y
 * las operaciones pasan por este único archivo.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  Configuracion,
  Ejercicio,
  Evaluacion,
  Inconsistencia,
  Intento,
  Perfil,
  ProgresoTema,
} from '@/esquemas';

const NOMBRE_BD = 'optiaula-io';
const VERSION_BD = 1;

interface EsquemaBD extends DBSchema {
  configuracion: { key: string; value: Configuracion };
  perfiles: { key: string; value: Perfil };
  ejercicios: { key: string; value: Ejercicio; indexes: { 'por-tema': string } };
  intentos: {
    key: string;
    value: Intento;
    indexes: { 'por-perfil': string; 'por-ejercicio': string; 'por-tema': string };
  };
  evaluaciones: { key: string; value: Evaluacion };
  progreso: { key: string; value: ProgresoTema };
  inconsistencias: { key: string; value: Inconsistencia };
  favoritos: { key: string; value: { id: string; agregadoEn: string } };
  varios: { key: string; value: unknown };
}

let promesa: Promise<IDBPDatabase<EsquemaBD>> | null = null;

/** Abre (o crea) la base. Se reutiliza la misma conexión en toda la sesión. */
export function abrirBD(): Promise<IDBPDatabase<EsquemaBD>> {
  promesa ??= openDB<EsquemaBD>(NOMBRE_BD, VERSION_BD, {
    upgrade(bd) {
      if (!bd.objectStoreNames.contains('configuracion')) bd.createObjectStore('configuracion');
      if (!bd.objectStoreNames.contains('perfiles')) bd.createObjectStore('perfiles', { keyPath: 'id' });

      if (!bd.objectStoreNames.contains('ejercicios')) {
        const s = bd.createObjectStore('ejercicios', { keyPath: 'id' });
        s.createIndex('por-tema', 'tema');
      }

      if (!bd.objectStoreNames.contains('intentos')) {
        const s = bd.createObjectStore('intentos', { keyPath: 'id' });
        s.createIndex('por-perfil', 'perfilId');
        s.createIndex('por-ejercicio', 'ejercicioId');
        s.createIndex('por-tema', 'tema');
      }

      if (!bd.objectStoreNames.contains('evaluaciones')) bd.createObjectStore('evaluaciones', { keyPath: 'id' });
      if (!bd.objectStoreNames.contains('progreso')) bd.createObjectStore('progreso', { keyPath: 'tema' });
      if (!bd.objectStoreNames.contains('inconsistencias')) bd.createObjectStore('inconsistencias', { keyPath: 'id' });
      if (!bd.objectStoreNames.contains('favoritos')) bd.createObjectStore('favoritos', { keyPath: 'id' });
      if (!bd.objectStoreNames.contains('varios')) bd.createObjectStore('varios');
    },

    // Si otra pestaña actualiza o borra la base, esta conexión debe soltarla en
    // lugar de bloquearla. Sin esto, una pestaña abierta impide la migración de
    // las demás y deja la aplicación en un estado inconsistente.
    blocking() {
      void promesa?.then((bd) => bd.close());
      promesa = null;
    },
  });
  return promesa;
}

/** ¿Está disponible IndexedDB? En modo privado de algunos navegadores no lo está. */
export function hayAlmacenamiento(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

// ───────────────────────────── Operaciones genéricas ─────────────────────────────

type ColeccionConClave = 'perfiles' | 'ejercicios' | 'intentos' | 'evaluaciones' | 'progreso' | 'inconsistencias' | 'favoritos';

export async function leerTodo<K extends ColeccionConClave>(coleccion: K): Promise<EsquemaBD[K]['value'][]> {
  if (!hayAlmacenamiento()) return [];
  try {
    const bd = await abrirBD();
    return await bd.getAll(coleccion);
  } catch {
    return [];
  }
}

export async function guardar<K extends ColeccionConClave>(
  coleccion: K,
  valor: EsquemaBD[K]['value'],
): Promise<void> {
  if (!hayAlmacenamiento()) return;
  try {
    const bd = await abrirBD();
    await bd.put(coleccion, valor);
  } catch {
    // Persistir es una comodidad, no un requisito: la sesión sigue en memoria.
  }
}

export async function guardarVarios<K extends ColeccionConClave>(
  coleccion: K,
  valores: readonly EsquemaBD[K]['value'][],
): Promise<void> {
  if (!hayAlmacenamiento() || valores.length === 0) return;
  try {
    const bd = await abrirBD();
    const tx = bd.transaction(coleccion, 'readwrite');
    await Promise.all([...valores.map((v) => tx.store.put(v)), tx.done]);
  } catch {
    /* ignorado a propósito */
  }
}

export async function eliminar(coleccion: ColeccionConClave, clave: string): Promise<void> {
  if (!hayAlmacenamiento()) return;
  try {
    const bd = await abrirBD();
    await bd.delete(coleccion, clave);
  } catch {
    /* ignorado a propósito */
  }
}

export async function vaciar(coleccion: ColeccionConClave): Promise<void> {
  if (!hayAlmacenamiento()) return;
  try {
    const bd = await abrirBD();
    await bd.clear(coleccion);
  } catch {
    /* ignorado a propósito */
  }
}

// ───────────────────────────── Configuración ─────────────────────────────

const CLAVE_CONFIG = 'actual';

export async function leerConfiguracion(): Promise<Configuracion | null> {
  if (!hayAlmacenamiento()) return null;
  try {
    const bd = await abrirBD();
    return (await bd.get('configuracion', CLAVE_CONFIG)) ?? null;
  } catch {
    return null;
  }
}

export async function guardarConfiguracion(config: Configuracion): Promise<void> {
  if (!hayAlmacenamiento()) return;
  try {
    const bd = await abrirBD();
    await bd.put('configuracion', config, CLAVE_CONFIG);
  } catch {
    /* ignorado a propósito */
  }
}

// ───────────────────────────── Utilidades ─────────────────────────────

/** Identificador local único, sin depender de crypto.randomUUID en navegadores viejos. */
export function nuevoId(prefijo: string): string {
  const azar = Math.random().toString(36).slice(2, 10);
  return `${prefijo}-${Date.now().toString(36)}-${azar}`;
}

/** Borra absolutamente todo lo guardado. Se usa desde Configuración, con confirmación. */
export async function borrarTodo(): Promise<void> {
  if (!hayAlmacenamiento()) return;
  try {
    const bd = await abrirBD();
    const colecciones: ColeccionConClave[] = [
      'perfiles',
      'ejercicios',
      'intentos',
      'evaluaciones',
      'progreso',
      'inconsistencias',
      'favoritos',
    ];
    await Promise.all(colecciones.map((c) => bd.clear(c)));
    await bd.clear('configuracion');
  } catch {
    /* ignorado a propósito */
  }
}
