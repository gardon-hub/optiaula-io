/**
 * Enrutador mínimo basado en el fragmento de la URL.
 *
 * Se usa hash en lugar de History API por dos razones: la PWA debe funcionar
 * abierta desde el sistema de archivos o desde cualquier subcarpeta, y así no
 * hace falta configuración de servidor para recargar en una ruta profunda.
 */

import { useEffect, useState } from 'react';
import type { Tema } from '@/esquemas';

export type NombreRuta =
  | 'inicio'
  | 'estudiante'
  | 'docente'
  | 'modulos'
  | 'modulo'
  | 'laboratorio'
  | 'biblioteca'
  | 'ejercicio'
  | 'generador'
  | 'evaluacion'
  | 'historial'
  | 'progreso'
  | 'auditoria'
  | 'revision'
  | 'reportes'
  | 'configuracion'
  | 'creditos'
  | 'ayuda';

export interface Ruta {
  readonly nombre: NombreRuta;
  readonly parametro: string | null;
}

const RUTAS_SIMPLES: Record<string, NombreRuta> = {
  '': 'inicio',
  inicio: 'inicio',
  estudiante: 'estudiante',
  docente: 'docente',
  modulos: 'modulos',
  biblioteca: 'biblioteca',
  generador: 'generador',
  evaluacion: 'evaluacion',
  historial: 'historial',
  progreso: 'progreso',
  auditoria: 'auditoria',
  revision: 'revision',
  reportes: 'reportes',
  configuracion: 'configuracion',
  creditos: 'creditos',
  ayuda: 'ayuda',
};

export function analizarRuta(hash: string): Ruta {
  const limpio = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const [primero = '', segundo = ''] = limpio.split('/');

  if (primero === 'modulo' && segundo !== '') return { nombre: 'modulo', parametro: decodeURIComponent(segundo) };
  if (primero === 'laboratorio' && segundo !== '') return { nombre: 'laboratorio', parametro: decodeURIComponent(segundo) };
  if (primero === 'ejercicio' && segundo !== '') return { nombre: 'ejercicio', parametro: decodeURIComponent(segundo) };

  const simple = RUTAS_SIMPLES[primero];
  return { nombre: simple ?? 'inicio', parametro: null };
}

export function usarRuta(): Ruta {
  const [ruta, setRuta] = useState<Ruta>(() => analizarRuta(window.location.hash));

  useEffect(() => {
    const alCambiar = (): void => setRuta(analizarRuta(window.location.hash));
    window.addEventListener('hashchange', alCambiar);
    return () => window.removeEventListener('hashchange', alCambiar);
  }, []);

  return ruta;
}

export function irA(destino: string): void {
  window.location.hash = destino.startsWith('#') ? destino : `#/${destino.replace(/^\//, '')}`;
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

export const enlaces = {
  inicio: '#/',
  estudiante: '#/estudiante',
  docente: '#/docente',
  modulos: '#/modulos',
  modulo: (tema: Tema) => `#/modulo/${tema}`,
  laboratorio: (tema: Tema) => `#/laboratorio/${tema}`,
  biblioteca: '#/biblioteca',
  ejercicio: (id: string) => `#/ejercicio/${encodeURIComponent(id)}`,
  generador: '#/generador',
  evaluacion: '#/evaluacion',
  historial: '#/historial',
  progreso: '#/progreso',
  auditoria: '#/auditoria',
  revision: '#/revision',
  reportes: '#/reportes',
  configuracion: '#/configuracion',
  creditos: '#/creditos',
  ayuda: '#/ayuda',
} as const;
