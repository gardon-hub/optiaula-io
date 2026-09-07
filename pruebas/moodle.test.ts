/**
 * Pruebas de los paquetes que se generan para Moodle.
 *
 * El riesgo que cubren es la desincronización. El paquete SCORM no puede
 * importar el motor de la aplicación —dentro de Moodle corre como HTML suelto,
 * sin empaquetador—, así que la tabla de consecuencias del perfil está escrita
 * dos veces: en `nucleo/naturalezaOperaciones.ts` y en `herramientas/moodle/`.
 * Si alguien corrige el texto en una y olvida la otra, el estudiante vería una
 * cosa en el sitio y otra en la plataforma, y nadie se enteraría.
 *
 * Aquí se comprueba que digan lo mismo.
 */

import { describe, expect, it } from 'vitest';

import { CONSECUENCIAS } from '../herramientas/moodle/perfil.mts';
import { RASGOS, resolverNaturaleza, type Perfil, type RasgoId } from '@/nucleo/naturalezaOperaciones';
import { EJERCICIOS_FUNDAMENTOS } from '@/datos/ejercicios/gestion';

const plano = (v: number): Perfil => Object.fromEntries(RASGOS.map((r) => [r.id, v])) as Perfil;
const con = (base: number, cambios: Partial<Record<RasgoId, number>>): Perfil =>
  ({ ...plano(base), ...cambios }) as Perfil;

const delMotor = (perfil: Perfil) =>
  resolverNaturaleza({ organizacion: 'X', descripcion: '', perfil, referencia: null }).datos!.consecuencias;

describe('la tabla de consecuencias del paquete coincide con la del motor', () => {
  it('cada consecuencia exportada existe en el motor, con el mismo texto', () => {
    for (const c of CONSECUENCIAS) {
      // Se lleva ese rasgo al extremo que dispara la consecuencia y se pregunta
      // al motor qué dice.
      const perfil = con(50, { [c.rasgo]: c.lado === 'servicios' ? 100 : 0 });
      const delRasgo = delMotor(perfil).find((x) => x.rasgo === c.rasgo);

      expect(delRasgo, `${c.rasgo}:${c.lado} no existe en el motor`).toBeDefined();
      expect(delRasgo!.lado, `${c.rasgo}:${c.lado}`).toBe(c.lado);
      expect(delRasgo!.titulo, `${c.rasgo}:${c.lado}`).toBe(c.titulo);
      // El texto del paquete es más corto a propósito —no cita otros módulos,
      // que dentro de Moodle no se pueden abrir—, pero tiene que empezar igual:
      // así una corrección de fondo en el motor rompe esta prueba.
      const comun = c.texto.slice(0, 80);
      expect(delRasgo!.texto.startsWith(comun), `${c.rasgo}:${c.lado} — el texto se apartó del motor`).toBe(true);
    }
  });

  it('el motor no tiene ninguna consecuencia que el paquete haya olvidado', () => {
    const exportadas = new Set(CONSECUENCIAS.map((c) => `${c.rasgo}:${c.lado}`));

    // Los dos extremos completos disparan todo lo que el motor sabe emitir.
    const todas = [...delMotor(plano(0)), ...delMotor(plano(100))];
    const faltantes = todas
      .map((c) => `${c.rasgo}:${c.lado}`)
      .filter((clave) => !exportadas.has(clave));

    expect([...new Set(faltantes)]).toEqual([]);
  });

  it('el paquete no inventa consecuencias que el motor no emita', () => {
    const delMotorTodas = new Set([...delMotor(plano(0)), ...delMotor(plano(100))].map((c) => `${c.rasgo}:${c.lado}`));
    const sobrantes = CONSECUENCIAS.map((c) => `${c.rasgo}:${c.lado}`).filter((k) => !delMotorTodas.has(k));
    expect(sobrantes).toEqual([]);
  });

  it('ninguna consecuencia se repite', () => {
    const claves = CONSECUENCIAS.map((c) => `${c.rasgo}:${c.lado}`);
    expect(claves).toHaveLength(new Set(claves).size);
  });
});

describe('el ejercicio que se exporta tiene lo que el paquete necesita', () => {
  const fund03 = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-03')!;
  const datos = fund03.datos as Extract<typeof fund03.datos, { tipo: 'fundamentos' }>;

  it('trae las cuatro organizaciones con perfil completo', () => {
    expect(datos.casosNaturaleza).toHaveLength(4);
    for (const c of datos.casosNaturaleza) {
      for (const r of RASGOS) {
        const v = (c.perfilReferencia as Record<string, number>)[r.id];
        expect(typeof v, `${c.id}.${r.id}`).toBe('number');
        expect(v, `${c.id}.${r.id}`).toBeGreaterThanOrEqual(0);
        expect(v, `${c.id}.${r.id}`).toBeLessThanOrEqual(100);
      }
      expect(c.justificacion.length, c.id).toBeGreaterThan(60);
    }
  });

  it('los cuatro casos cubren el continuo de punta a punta', () => {
    // Si todos cayeran del mismo lado, el ejercicio no enseñaría el contraste
    // que es su razón de ser.
    const indices = datos.casosNaturaleza.map(
      (c) => RASGOS.reduce((s, r) => s + (c.perfilReferencia as Record<string, number>)[r.id]!, 0) / RASGOS.length,
    );
    expect(Math.min(...indices)).toBeLessThan(40);
    expect(Math.max(...indices)).toBeGreaterThan(60);
  });

  it('queda registrado que los perfiles son criterio y no medición', () => {
    // Es lo que sostiene que el paquete no envíe nota. Si alguien quitara la
    // inconsistencia, esta prueba obliga a repensar también la exportación.
    expect(fund03.inconsistencias).toContain('I-19');
    expect(fund03.origen).toBe('derivado');
  });
});
