/**
 * Alcance de la compilación: qué módulos lleva esta copia de la aplicación.
 *
 * Existe para poder publicar **una sola unidad** —punto de equilibrio, por
 * ejemplo— sin bifurcar el proyecto. La alternativa era copiar el código a otro
 * repositorio y mantener dos versiones en paralelo, que es como se empieza a
 * tener dos motores que calculan distinto.
 *
 * Se decide al compilar, con la variable `VITE_TEMAS`:
 *
 *   npm run build                          → los trece módulos
 *   VITE_TEMAS=equilibrio npm run build    → solo punto de equilibrio
 *
 * `TEMAS` de `esquemas/` sigue siendo la lista completa y no se toca: es la que
 * valida los datos guardados. Si alguien abre una copia reducida con un respaldo
 * hecho en la completa, sus intentos de otros módulos **se conservan** aunque no
 * se muestren; recortar la validación los borraría en silencio.
 */

import { TEMAS, type Tema } from '@/esquemas';

/** Lo que pidió la compilación, sin validar todavía. */
const PEDIDO: string = String(import.meta.env['VITE_TEMAS'] ?? '').trim();

function resolver(): readonly Tema[] {
  if (PEDIDO === '') return TEMAS;

  const pedidos = PEDIDO.split(',')
    .map((t) => t.trim())
    .filter((t) => t !== '');

  const validos = pedidos.filter((t): t is Tema => (TEMAS as readonly string[]).includes(t));
  const desconocidos = pedidos.filter((t) => !(TEMAS as readonly string[]).includes(t));

  if (desconocidos.length > 0) {
    // Se avisa en vez de fallar: una compilación que se cae por un nombre mal
    // escrito es peor que una que publica de más y lo dice. Pero si no queda
    // ninguno válido sí se vuelve a la lista completa, porque una aplicación
    // sin módulos no es nada.
    console.warn(`VITE_TEMAS contiene módulos que no existen y se ignoraron: ${desconocidos.join(', ')}`);
  }

  if (validos.length === 0) {
    console.warn('VITE_TEMAS no nombró ningún módulo válido; se compilan los trece.');
    return TEMAS;
  }

  // Se devuelven en el orden del plan de estudios, no en el que se escribieron.
  return TEMAS.filter((t) => validos.includes(t));
}

/** Los módulos que esta copia muestra. Es lo que debe recorrer la interfaz. */
export const TEMAS_ACTIVOS: readonly Tema[] = resolver();

/** Cierto cuando la copia lleva los trece módulos. */
export const ALCANCE_COMPLETO = TEMAS_ACTIVOS.length === TEMAS.length;

/** Cierto si el módulo está dentro de esta compilación. */
export function enAlcance(tema: Tema): boolean {
  return TEMAS_ACTIVOS.includes(tema);
}

/**
 * «13 módulos» o «1 módulo».
 *
 * Existe porque la copia de un solo módulo anunciaba «1 módulos». Un recuento
 * interpolado sin más funciona mientras nadie compile una unidad suelta, que es
 * justo lo que ahora se hace.
 */
export function cuentaDeModulos(): string {
  return TEMAS_ACTIVOS.length === 1 ? '1 módulo' : `${TEMAS_ACTIVOS.length} módulos`;
}

/**
 * Nombre de esta copia cuando lleva un solo módulo; `null` si lleva varios.
 * Sirve para el título de la pestaña y para la portada: a una aplicación de
 * punto de equilibrio no se le anuncia el temario completo.
 */
export const MODULO_UNICO: Tema | null = TEMAS_ACTIVOS.length === 1 ? (TEMAS_ACTIVOS[0] ?? null) : null;
