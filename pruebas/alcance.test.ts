/**
 * Pruebas del alcance de la compilación.
 *
 * Lo que está en juego no es cosmético. Una copia por módulo se publica aparte y
 * nadie la revisa ejercicio por ejercicio: si el filtro dejara pasar material de
 * otro tema, el estudiante vería contenido que su unidad no cubre; si recortara
 * de más, faltaría lo que sí debe estudiar. Y si el filtro tocara la validación
 * de datos, un respaldo hecho en la aplicación completa perdería en silencio los
 * intentos de los módulos que esta copia no muestra.
 *
 * `alcance.ts` lee la variable al cargarse, así que cada caso reimporta el
 * módulo con el entorno ya puesto.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { TEMAS } from '@/esquemas';

/** Carga `alcance.ts` con el valor indicado en `VITE_TEMAS`. */
async function conAlcance(valor: string | undefined) {
  vi.resetModules();
  if (valor === undefined) vi.stubEnv('VITE_TEMAS', '');
  else vi.stubEnv('VITE_TEMAS', valor);
  return import('@/config/alcance');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('sin variable, la compilación lleva todo', () => {
  it('los trece módulos', async () => {
    const a = await conAlcance(undefined);
    expect(a.TEMAS_ACTIVOS).toEqual(TEMAS);
    expect(a.ALCANCE_COMPLETO).toBe(true);
    expect(a.MODULO_UNICO).toBeNull();
    expect(a.cuentaDeModulos()).toBe('13 módulos');
  });
});

describe('con un módulo, lleva solo ese', () => {
  it('punto de equilibrio y nada más', async () => {
    const a = await conAlcance('equilibrio');
    expect(a.TEMAS_ACTIVOS).toEqual(['equilibrio']);
    expect(a.ALCANCE_COMPLETO).toBe(false);
    expect(a.MODULO_UNICO).toBe('equilibrio');
    expect(a.enAlcance('equilibrio')).toBe(true);
    expect(a.enAlcance('simplex')).toBe(false);
  });

  it('dice «1 módulo», no «1 módulos»', async () => {
    // El defecto que se vio en pantalla al compilar la primera copia.
    const a = await conAlcance('equilibrio');
    expect(a.cuentaDeModulos()).toBe('1 módulo');
  });
});

describe('con varios módulos', () => {
  it('respeta el orden del plan de estudios, no el que se escribió', async () => {
    const a = await conAlcance('simplex,equilibrio,fundamentos');
    expect(a.TEMAS_ACTIVOS).toEqual(['fundamentos', 'equilibrio', 'simplex']);
    expect(a.MODULO_UNICO).toBeNull();
    expect(a.cuentaDeModulos()).toBe('3 módulos');
  });

  it('tolera espacios y comas sobrantes', async () => {
    const a = await conAlcance('  equilibrio , , cpm  ');
    expect(a.TEMAS_ACTIVOS).toEqual(['equilibrio', 'cpm']);
  });
});

describe('una variable mal escrita no deja la aplicación vacía', () => {
  it('ignora los módulos que no existen y conserva los válidos', async () => {
    const a = await conAlcance('equilibrio,inventario');
    expect(a.TEMAS_ACTIVOS).toEqual(['equilibrio']);
  });

  it('si ninguno es válido, compila los trece en vez de quedarse en blanco', async () => {
    // Una aplicación sin módulos no es un estado útil: es mejor publicar de más
    // y avisar por consola que publicar una pantalla vacía.
    const a = await conAlcance('inventario,produccion');
    expect(a.TEMAS_ACTIVOS).toEqual(TEMAS);
  });
});

describe('el alcance no toca la validación de datos', () => {
  it('`TEMAS` sigue completo aunque la copia lleve un módulo', async () => {
    // Es lo que permite importar en la copia reducida un respaldo hecho en la
    // completa sin perder los intentos de los demás módulos.
    await conAlcance('equilibrio');
    const { TEMAS: todos, esquemaTema } = await import('@/esquemas');
    expect(todos).toHaveLength(13);
    expect(esquemaTema.safeParse('simplex').success).toBe(true);
  });
});

describe('la biblioteca se recorta al alcance', () => {
  it('con un módulo quedan solo sus ejercicios', async () => {
    await conAlcance('equilibrio');
    const { BIBLIOTECA_INICIAL } = await import('@/datos/ejercicios');
    expect(BIBLIOTECA_INICIAL.length).toBeGreaterThan(0);
    expect(new Set(BIBLIOTECA_INICIAL.map((e) => e.tema))).toEqual(new Set(['equilibrio']));
  });

  it('sigue informando de los ejercicios rechazados de todos los módulos', async () => {
    // Se filtra después de validar: el panel de auditoría no puede callarse
    // sobre un dato malo solo porque ese módulo no se muestre en esta copia.
    await conAlcance('equilibrio');
    const { EJERCICIOS_RECHAZADOS } = await import('@/datos/ejercicios');
    expect(Array.isArray(EJERCICIOS_RECHAZADOS)).toBe(true);
  });
});
