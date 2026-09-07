/**
 * Pruebas de las páginas que se generan para Moodle y para el enlace directo.
 *
 * El defecto que motivó este archivo: la página del constructor de sistemas
 * construía su documento entero por su cuenta, con su propio pie. Al añadir el
 * crédito del autor se actualizó la plantilla compartida y **esa copia se quedó
 * sin él**, sin que nada fallara. Lo notó el docente, no las pruebas.
 *
 * Así que aquí no se comprueba una página sino **las dos a la vez**: lo que sea
 * común tiene que estar en ambas. Si mañana se agrega una tercera actividad,
 * basta añadirla a la lista para que quede cubierta por lo mismo.
 */

import { describe, expect, it } from 'vitest';

import { EJERCICIOS_FUNDAMENTOS } from '@/datos/ejercicios/gestion';
import { paginaHTML } from '../herramientas/moodle-scorm.mts';
import { casosDesde, paginaPerfil } from '../herramientas/moodle/perfil.mts';

const sistemas = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-01')!;
const perfil = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-03')!;

const datosSistemas = sistemas.datos as { organizacion: string; elementos: readonly { id: string; texto: string; categoria: string }[] };

const PAGINAS: readonly { nombre: string; html: string }[] = [
  {
    nombre: 'constructor de sistemas',
    html: paginaHTML(sistemas.titulo, datosSistemas.organizacion, sistemas.enunciado, datosSistemas.elementos),
  },
  {
    nombre: 'perfil de operaciones',
    html: paginaPerfil(perfil.titulo, perfil.enunciado, casosDesde(perfil.datos as never)),
  },
];

describe('lo que toda página generada tiene que llevar', () => {
  describe.each(PAGINAS)('$nombre', ({ html }) => {
      it('acredita al autor con su grado', () => {
        expect(html).toContain('Profesor Gustavo Alonso Ardón, MSc.');
        expect(html).toContain('Investigación de Operaciones');
      });

      it('nombra la institución y su ubicación', () => {
        expect(html).toContain('Universidad Nacional de Agricultura');
        expect(html).toContain('Catacamas, Olancho, Honduras');
      });

      it('tiene un solo pie de página', () => {
        // Dos pies significan dos plantillas, que es de donde vino el defecto.
        expect(html.match(/<footer>/g) ?? []).toHaveLength(1);
      });

      it('busca la API de SCORM y tolera no encontrarla', () => {
        expect(html).toContain('LMSInitialize');
        expect(html).toContain('cmi.suspend_data');
      });

      it('no pide nada a internet: el aula puede no tener red', () => {
        // Cualquier src o href absoluto sería un recurso externo. Se permiten
        // los espacios de nombres de XML, que no se descargan.
        const externos = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
        expect(externos).toEqual([]);
      });

      it('declara el idioma y la escala para el teléfono', () => {
        expect(html).toContain('<html lang="es">');
        expect(html).toContain('width=device-width');
      });

      it('viene con el contenido dentro, no lo pide al cargar', () => {
        expect(html).toContain('var DATOS =');
      });
  });
});

describe('cada página lleva lo suyo', () => {
  it('el constructor de sistemas trae los dieciocho elementos y califica', () => {
    const html = PAGINAS[0]!.html;
    for (const e of datosSistemas.elementos) expect(html).toContain(e.texto);
    expect(html).toContain('Scorm.enviarNota(');
  });

  it('el perfil trae las cuatro organizaciones y no califica', () => {
    const html = PAGINAS[1]!.html;
    expect(html).toContain('Beneficio húmedo de café');
    expect(html).toContain('Clínica veterinaria de campo');
    // Se registra por haberla hecho: poner nota exigiría juzgar un criterio
    // que nadie midió. El envoltorio de SCORM es compartido y define las dos
    // formas, así que lo que distingue a esta página es cuál **llama**.
    expect(html).toContain('Scorm.marcarCompletada()');
    expect(html).not.toContain('Scorm.enviarNota(');
  });
});
