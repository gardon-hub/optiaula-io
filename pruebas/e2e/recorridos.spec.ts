/**
 * Pruebas de extremo a extremo de los recorridos principales.
 *
 * Cubren los caminos que un estudiante y un docente hacen de verdad: estudiar
 * un módulo, resolver un ejercicio con retroalimentación, usar un laboratorio,
 * generar un ejercicio y resolver una inconsistencia de auditoría.
 */

import { expect, test, type Page } from '@playwright/test';

/** Deja la aplicación en un estado limpio antes de cada prueba. */
async function abrirLimpio(page: Page, ruta = '#/'): Promise<void> {
  // Se borra la base desde una página en blanco: si la aplicación tiene la
  // conexión abierta, el borrado queda bloqueado y la prueba mediría basura.
  await page.goto('about:blank');
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolver) => {
      const solicitud = indexedDB.deleteDatabase('optiaula-io');
      solicitud.onsuccess = () => resolver();
      solicitud.onerror = () => resolver();
      solicitud.onblocked = () => resolver();
    });
  });
  await page.goto(`/${ruta}`);
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('heading').first()).toBeVisible();
}

/**
 * Cambia de pantalla como lo hace la aplicación, sin recargar.
 *
 * `page.goto` provoca una carga completa: React se monta de nuevo y el estado
 * anterior desaparece solo, aunque el código no lo resuelva. Para comprobar que
 * una pantalla no arrastra el estado de la anterior hay que navegar así.
 */
async function navegarEnLaApp(page: Page, destino: string): Promise<void> {
  await page.evaluate((d) => {
    window.location.hash = d.replace(/^#/, '');
  }, destino);
  await expect(page.locator('main')).toBeVisible();
}

async function fijarModo(page: Page, modo: string): Promise<void> {
  await page.getByRole('group', { name: 'Modo de uso' }).getByRole('button', { name: modo, exact: true }).click();
}

/**
 * Despliega todos los pasos del visor cuyo título se indica.
 *
 * El laboratorio del simplex tiene dos visores —el del procedimiento y el del
 * análisis de sensibilidad—, así que «Ver todo» hay que buscarlo dentro de la
 * sección que corresponde y no por posición.
 */
async function verTodosLosPasos(page: Page, titulo: string): Promise<void> {
  await page.getByRole('region', { name: titulo }).getByRole('button', { name: 'Ver todo' }).click();
}

test.describe('recorrido del estudiante', () => {
  test('la portada muestra los trece módulos y la biblioteca completa', async ({ page }) => {
    await abrirLimpio(page);

    await expect(page.getByRole('heading', { name: 'Laboratorio Interactivo de Investigación de Operaciones' })).toBeVisible();
    await expect(page.getByText(/biblioteca de \d+ ejercicios/)).toBeVisible();

    for (const modulo of [
      'Fundamentos de gestión de operaciones',
      'Productividad',
      'Decisiones de localización',
      'Distribución física de instalaciones',
      'Punto de equilibrio',
      'Diagramas de red y ruta crítica',
      'PERT',
      'Método gráfico de programación lineal',
      'Método simplex',
      'Modelo de asignación',
      'Modelo de transporte',
      'Sistemas y modelos de inventarios',
      'Líneas de espera',
    ]) {
      await expect(page.locator('#contenido').getByText(modulo, { exact: true }).first()).toBeVisible();
    }
  });

  test('crea un perfil y queda registrado', async ({ page }) => {
    await abrirLimpio(page, '#/estudiante');

    await page.getByLabel('Nombre').fill('Estudiante de prueba');
    await page.getByRole('button', { name: 'Crear perfil' }).click();

    await expect(page.getByRole('heading', { name: /Panel de Estudiante de prueba/ })).toBeVisible();
    await expect(page.locator('#contenido').getByText('Progreso general')).toBeVisible();
  });

  test('el módulo recorre las siete etapas pedagógicas', async ({ page }) => {
    await abrirLimpio(page, '#/modulo/pert');

    await expect(page.getByRole('heading', { name: 'PERT', level: 1 })).toBeVisible();
    await expect(page.getByText(/Resultado de aprendizaje/)).toBeVisible();

    await page.getByRole('tab', { name: /Comprender/ }).click();
    await expect(page.getByRole('heading', { name: 'Fórmulas' }).first()).toBeVisible();
    await expect(page.getByText('Errores frecuentes').first()).toBeVisible();

    await page.getByRole('tab', { name: /Interpretar/ }).click();
    await expect(page.getByText('Lectura gerencial del método').first()).toBeVisible();
  });

  test('resuelve un ejercicio y recibe retroalimentación específica', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/cpm-01');

    await expect(page.getByRole('heading', { name: 'Construcción de una planta procesadora de lácteos' })).toBeVisible();

    // Respuesta incorrecta que coincide con un error típico conocido:
    // sumar la duración de todas las actividades.
    const primeraRespuesta = page.getByLabel('¿Cuál es la duración total del proyecto, en semanas?');
    await primeraRespuesta.fill('44');
    await page.getByRole('button', { name: 'Comprobar' }).first().click();
    await expect(page.getByText(/Sumó la duración de todas las actividades/)).toBeVisible();

    // Ahora la correcta.
    await primeraRespuesta.fill('37');
    await page.getByRole('button', { name: 'Comprobar' }).first().click();
    await expect(page.getByText('Correcto.').first()).toBeVisible();
  });

  test('las pistas se revelan de a una', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/prod-01');

    const boton = page.getByRole('button', { name: /Pista 1 de/ }).first();
    await boton.click();
    await expect(page.getByText(/^Pista 1\./)).toBeVisible();
    await expect(page.getByText(/^Pista 2\./)).toHaveCount(0);

    await page.getByRole('button', { name: /Pista 2 de/ }).first().click();
    await expect(page.getByText(/^Pista 2\./)).toBeVisible();
  });

  test('el laboratorio de CPM calcula la ruta crítica correcta', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/cpm');

    await expect(page.getByText('Duración del proyecto')).toBeVisible();
    await expect(page.getByText('37', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/A → B → D → E → F → H → I → J/)).toBeVisible();
  });

  test('el laboratorio de transporte balancea y optimiza', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/transporte');

    await expect(page.getByText(/El problema está balanceado/).first()).toBeVisible();
    await expect(page.getByText('Costo óptimo').first()).toBeVisible();
    await expect(page.getByText(/Los tres llegan al mismo óptimo/).first()).toBeVisible();
  });

  test('el procedimiento avanza paso a paso', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/asignacion');

    await expect(page.getByText('Paso 1 de')).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar siguiente paso' }).first().click();
    await expect(page.getByText('Paso 2 de')).toBeVisible();
  });

  test('editar la tabla no devuelve al paso 1 un procedimiento que no cambió', async ({ page }) => {
    // El procedimiento probabilístico de PERT depende de la media y la desviación
    // del proyecto, no de cómo se llamen las actividades. Cambiar una descripción
    // no altera ni un carácter de sus pasos, así que el visor tiene que quedarse
    // donde estaba. Antes retrocedía porque el arreglo de pasos se construía en
    // el JSX y era nuevo en cada render.
    await abrirLimpio(page, '#/laboratorio/pert');

    const visor = page.getByRole('region', { name: 'Procedimiento probabilístico' });
    await visor.getByRole('button', { name: 'Mostrar siguiente paso' }).click();
    await visor.getByRole('button', { name: 'Mostrar siguiente paso' }).click();
    await expect(visor.getByText('Paso 3 de')).toBeVisible();

    await page.getByLabel('Descripción, fila 1').fill('Selección del terreno y permisos');

    await expect(visor.getByText('Paso 3 de')).toBeVisible();
  });

  test('los dos procedimientos unidos se numeran de corrido', async ({ page }) => {
    // Cada solucionador numera sus pasos desde 1. Unidos sin renumerar, el visor
    // mostraba «1, 2, 1, 2» mientras el encabezado decía «Paso 3 de 4», y React
    // avisaba de claves repetidas.
    await abrirLimpio(page, '#/laboratorio/pert');

    const visor = page.getByRole('region', { name: 'Procedimiento probabilístico' });
    await visor.getByRole('button', { name: 'Ver todo' }).click();
    await expect(visor.getByText('Paso 4 de 4')).toBeVisible();

    // El número va en el distintivo redondo de la cabecera de cada paso.
    const numeros = visor.locator('span[aria-hidden="true"].rounded-full');
    await expect(numeros).toHaveText(['1', '2', '3', '4']);
  });

  test('cambiar de ejercicio no arrastra las respuestas del anterior', async ({ page }) => {
    // Los identificadores de pregunta se repiten entre ejercicios («p1», «p2»),
    // así que reutilizar la página y limpiarla desde un efecto dejaba ver el
    // ejercicio nuevo con las marcas del anterior. Con `key` se monta de nuevo.
    await abrirLimpio(page, '#/ejercicio/cpm-01');

    await page.getByLabel('¿Cuál es la duración total del proyecto, en semanas?').fill('44');
    await page.getByRole('button', { name: 'Comprobar' }).first().click();
    await expect(page.getByText(/Sumó la duración de todas las actividades/)).toBeVisible();

    await navegarEnLaApp(page, '#/ejercicio/pert-01');

    // Ni la retroalimentación ni la respuesta del ejercicio anterior sobreviven.
    await expect(page.getByText(/Sumó la duración de todas las actividades/)).toHaveCount(0);
    for (const caja of await page.getByRole('textbox').all()) {
      await expect(caja).toHaveValue('');
    }
  });


  test('el laboratorio del método gráfico resuelve el problema de mesas y sillas', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/grafico');

    await expect(page.getByRole('heading', { name: 'Región factible', exact: true })).toBeVisible();
    await expect(page.getByText('solución única')).toBeVisible();
    await expect(page.locator('#contenido').getByText('45,00').first()).toBeVisible();
    await expect(page.getByText(/activa — agotado/).first()).toBeVisible();
  });

  test('el método gráfico reconoce un modelo infactible', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/graf-06');

    await expect(page.getByRole('heading', { name: 'Dos modelos que no tienen solución' })).toBeVisible();
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();
    await expect(page.getByText('problema infactible').first()).toBeVisible();
    await expect(page.getByText(/la región factible está vacía/i).first()).toBeVisible();
  });

  test('la línea de indiferencia se puede desplazar', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/grafico');

    const deslizador = page.getByLabel('Desplazar la línea de indiferencia');
    await expect(deslizador).toBeVisible();
    // Un control de rango no admite fill con un valor arbitrario: se mueve con
    // el teclado, que además comprueba que es operable sin ratón.
    await deslizador.press('Home');
    await expect(page.getByText(/La línea todavía cruza la región/)).toBeVisible();
  });

  test('el análisis de sensibilidad publica los precios sombra', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/grafico');

    await expect(page.getByRole('heading', { name: 'Precios sombra', exact: true })).toBeVisible();
    // Valores exactos del dual en el vértice óptimo: 5/16 y 5/24.
    await expect(page.locator('#contenido').getByText('0,3125').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('0,2083').first()).toBeVisible();
    // La restricción que sobra vale cero: es el punto pedagógico del módulo.
    await expect(page.getByText(/su precio sombra es cero/).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Rango de optimalidad/ })).toBeVisible();
  });

  test('el precio sombra deja de predecir fuera de su rango', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/grafico');

    const deslizador = page.getByLabel(/Disponibilidad de material/i);
    await expect(deslizador).toBeVisible();

    // Un paso dentro del rango de validez: la predicción lineal es exacta.
    await deslizador.press('ArrowRight');
    await expect(page.getByText('Dentro del rango: la predicción es exacta')).toBeVisible();

    // En el extremo inferior el vértice ya cambió de restricciones activas.
    await deslizador.press('Home');
    await expect(page.getByText('Fuera del rango: la predicción sobreestima')).toBeVisible();

    await page.getByRole('button', { name: 'Volver a la disponibilidad original' }).click();
    // El texto explicativo del bloque también menciona «la predicción», así que
    // se comprueba que desaparece la comparación en sí, no la palabra.
    await expect(page.getByText(/^(Dentro|Fuera) del rango:/)).toHaveCount(0);
  });

  test('el laboratorio del simplex resuelve la quesería y muestra el tableau', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/simplex');

    await expect(page.getByText('solución óptima única')).toBeVisible();
    await expect(page.locator('#contenido').getByText('4 470').first()).toBeVisible();
    // Precios sombra construidos a propósito para que sean únicos y positivos.
    await expect(page.getByRole('cell', { name: 'Leche' }).first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('activa — se agota').first()).toBeVisible();

    // El tableau se lee en fracciones exactas, como en el cuaderno.
    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.locator('#contenido').getByText('125/3').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText(/^Z \(z − c\)$/).first()).toBeVisible();
  });

  test('el interruptor de notación cambia fracciones por decimales', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/simplex');
    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.locator('#contenido').getByText('125/3').first()).toBeVisible();

    await page.getByRole('switch', { name: 'Fracciones exactas' }).click();
    // Cambiar la notación reconstruye los pasos, así que el visor vuelve al
    // primero: hay que desplegarlo otra vez para ver el mismo tableau.
    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.locator('#contenido').getByText('41,6667').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('125/3')).toHaveCount(0);
  });

  test('el simplex usa dos fases cuando hay una restricción de tipo mayor o igual', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/simp-02');

    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();
    await expect(page.getByText('1 en la fase 1 y 2 en la fase 2')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'artificial de Compromiso de mesas' })).toBeVisible();

    // El mismo vértice que da el método gráfico en el módulo 8.
    await expect(page.locator('#contenido').getByText('45').first()).toBeVisible();
  });

  test('el laboratorio resuelve el mismo modelo por las dos fases y por la Gran M', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/simp-02');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // Dos fases: el problema se parte en dos.
    await expect(page.getByText('1 en la fase 1 y 2 en la fase 2')).toBeVisible();

    await page.getByLabel('Método de solución').selectOption('gran_m');
    await expect(page.getByText(/un solo recorrido: la penalización M/)).toBeVisible();

    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.getByRole('heading', { name: 'Penalizar las variables artificiales con la constante M' })).toBeVisible();
    // La fila objetivo arrastra la M como símbolo, sin darle ningún valor.
    await expect(page.locator('#contenido').getByText('−5 − M').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('−2M').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Fase 1/ })).toHaveCount(0);

    // El resultado es el mismo por los dos caminos: mismo Z y mismos precios sombra.
    await expect(page.locator('#contenido').getByText('45').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('5/16').first()).toBeVisible();
  });

  test('el simplex publica los rangos de sensibilidad leídos del tableau', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/simp-03');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    await expect(page.getByRole('heading', { name: 'Rango de factibilidad de cada recurso' })).toBeVisible();
    // Los jornales se agotan: precio sombra 4 000/27, válido entre 720 y 1 125.
    await expect(page.locator('#contenido').getByText('4 000/27').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('1 125').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Rango de optimalidad y costos reducidos' })).toBeVisible();
    // El sorgo quedó fuera del plan: su costo reducido dice cuánto le falta.
    await expect(page.locator('#contenido').getByText('17 000/27').first()).toBeVisible();
    await expect(page.getByText(/Sorgo queda fuera del plan/)).toBeVisible();
  });

  test('el simplex revisado mantiene B⁻¹ en lugar de arrastrar el tableau', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/simplex');

    await page.getByLabel('Método de solución').selectOption('revisado');
    await expect(page.getByText(/calculados con B⁻¹ en vez de arrastrarlo/)).toBeVisible();

    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.getByRole('heading', { name: 'Arrancar con B⁻¹ en lugar del tableau' })).toBeVisible();

    // Cada iteración se cuenta en dos mitades: valorar y traer la columna.
    await expect(page.getByRole('heading', { name: 'Iteración 1 — valorar las columnas con los multiplicadores' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Iteración 1 — entra x3, sale h2' })).toBeVisible();
    await expect(page.locator('#contenido').getByText('x_B = B⁻¹b').first()).toBeVisible();

    // El mismo óptimo que el tableau, con las mismas iteraciones.
    await expect(page.locator('#contenido').getByText('4 470').first()).toBeVisible();
  });

  test('el dual simplex resuelve la mezcla sin ninguna variable artificial', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/simp-08');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // Por las dos fases: exceso y artificial por cada restricción de tipo ≥.
    await expect(page.getByText('3 de decisión, 1 de holgura, 2 de exceso, 2 artificiales')).toBeVisible();

    await page.getByLabel('Método de solución').selectOption('dual');
    await expect(page.getByText('3 de decisión, 3 de holgura, 0 de exceso, 0 artificiales')).toBeVisible();
    await expect(page.getByText('una restricción arreglada por iteración')).toBeVisible();

    await verTodosLosPasos(page, 'Procedimiento del método simplex');
    await expect(page.getByRole('heading', { name: /la base de holguras ya es óptima/ })).toBeVisible();
    // La fila que sale se elige por el lado derecho más negativo.
    await expect(page.getByRole('heading', { name: 'Iteración 1 — sale h2, entra x1' })).toBeVisible();
    await expect(page.locator('#contenido').getByText('Razón dual').first()).toBeVisible();
  });

  test('el dual simplex avisa cuando no aplica en lugar de dejar la pantalla vacía', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/simplex');

    // simp-01 es una maximización con márgenes positivos: la base de holguras
    // no cumple la prueba de optimalidad, así que el dual no puede arrancar.
    await page.getByLabel('Método de solución').selectOption('dual');
    await expect(page.getByText('este método no aplica')).toBeVisible();
    await expect(page.getByText(/use las dos fases o la Gran M/)).toBeVisible();
    // El modelo sigue a la vista: no hay pantalla en blanco.
    await expect(page.getByRole('heading', { name: 'Formular el modelo' })).toBeVisible();
  });

  test('el simplex detecta la infactibilidad en la fase 1', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/simp-05');

    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();
    await expect(page.getByText('problema infactible').first()).toBeVisible();
    await expect(page.getByText(/no existe ningún punto que cumpla todas las restricciones/i).first()).toBeVisible();
  });

  test('el transporte publica los multiplicadores y los rangos de flete', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/transporte');

    await expect(page.getByRole('heading', { name: 'Cuánto vale de verdad cada ruta', exact: true })).toBeVisible();
    // Los multiplicadores individuales dependen de la convención u₁ = 0; lo que
    // se lee es la suma, y eso lo dice la propia tarjeta.
    await expect(page.getByText(/no significan nada por separado/).first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Hasta dónde puede moverse cada flete' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'C1 → M1' })).toBeVisible();
    await expect(page.locator('#contenido').getByText('en uso').first()).toBeVisible();
    await expect(page.locator('#contenido').getByText('sin usar').first()).toBeVisible();
    // El costo reducido de una ruta sin usar es el descuento que habría que negociar.
    await expect(page.getByText(/Entraría al plan si su flete bajara/)).toBeVisible();
  });

  test('el equilibrio multiproducto reproduce la clave de respuestas del docente', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/equi-04');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // Los números de `Ejercicio_punto_de_equilibrio_granja_avicola.pdf`.
    await expect(page.getByText('L 9,05', { exact: true })).toBeVisible();
    await expect(page.getByText('55 249', { exact: true })).toBeVisible();

    // Cambiar la base de la mezcla cambia el método y el resultado: es la
    // ambigüedad I-13 hecha visible, no un ajuste cosmético.
    await page.getByLabel('La mezcla está expresada en').selectOption('ingresos');
    await expect(page.getByText('Razón de margen ponderada')).toBeVisible();
    await expect(page.getByText('L 9,05', { exact: true })).toBeHidden();
  });

  test('el almacén reproduce los dos puntajes de la presentación', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/dist-02');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // El plano de la diapositiva 5 puntúa 6 650, el rotulado «Óptima» 6 730.
    await expect(page.getByText('6 650', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/rotula «Óptima» a la distribución de mayor puntaje/)).toBeVisible();

    // La búsqueda automática declara que con áreas distintas no llega al mínimo.
    await expect(page.getByText(/solo puede intercambiar los que necesitan la misma cantidad de bloques/)).toBeVisible();
  });

  test('la compresión del proyecto encuentra la duración que conviene', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/crash-03');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    await expect(page.getByRole('heading', { name: 'Compresión del proyecto' })).toBeVisible();
    // De 17 días a 12, con L 4 500 de ahorro.
    await expect(page.getByText('17', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('L 180 000 de costo total')).toBeVisible();
    await expect(page.getByText('L 4 500', { exact: true })).toBeVisible();

    // El costo indirecto es lo que hace que comprimir valga la pena: si baja
    // lo suficiente, la duración que conviene vuelve a ser la normal.
    await page.getByLabel('Costo indirecto por periodo').fill('900');
    await expect(page.getByText('Aquí no conviene comprimir')).toBeVisible();
  });

  test('la compresión no aparece en los ejercicios de ruta crítica del material', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/cpm-01');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    await expect(page.getByRole('heading', { name: 'Diagrama de red' })).toBeVisible();
    // Sin duraciones aceleradas no hay nada que comprimir: la tarjeta no se
    // dibuja, en vez de quedar vacía.
    await expect(page.getByRole('heading', { name: 'Compresión del proyecto' })).toBeHidden();
  });

test('el lote económico reproduce el ejercicio de la presentación', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/inv-01');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // Las seis respuestas de la diapositiva 14, todas redondas.
    await expect(page.getByText('150,00').first()).toBeVisible();
    await expect(page.getByText('Ordenar 150 + conservar 150')).toBeVisible();
    await expect(page.getByText('Una cada 6,00 días')).toBeVisible();
    await expect(page.getByText('75,00').first()).toBeVisible();

    // La curva es plana cerca del óptimo: es lo que enseña el deslizador.
    await expect(page.getByText(/lo plana que es la curva cerca del mínimo/)).toBeVisible();
  });

  test('la línea de espera muestra que quitar un servidor dispara la cola', async ({ page }) => {
    await abrirLimpio(page, '#/ejercicio/cola-04');
    await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();

    // Con cuatro cajeros la utilización es del 70 % y la cola de un socio.
    await expect(page.getByText('70,0 %').first()).toBeVisible();
    // La tabla recomienda cuatro, ni el mínimo estable ni el que borra la cola.
    await expect(page.getByRole('cell', { name: /4\s*conviene/ })).toBeVisible();

    // Y con tres la espera se multiplica por doce.
    await page.getByRole('spinbutton', { name: /Servidores/ }).fill('3');
    await expect(page.getByText('93,3 %').first()).toBeVisible();
    await expect(page.getByText(/la espera se dispara/).first()).toBeVisible();
  });


  test('el laboratorio abre en el ejemplo del módulo venga de donde venga', async ({ page }) => {
    // La página se reutilizaba al cambiar de tema y conservaba el ejercicio
    // elegido; como no existe en el tema nuevo, caía al primero de la lista. En
    // localización el ejemplo designado es el segundo, así que la misma
    // dirección mostraba un ejercicio distinto según de dónde se llegara.
    // El ejemplo designado de localización es el segundo de la lista, así que es
    // el único tema donde la diferencia se nota.
    await abrirLimpio(page, '#/laboratorio/localizacion');
    const designado = await page.getByRole('heading', { level: 1 }).innerText();
    expect(designado).toContain('Siete sectores censales');

    // Se llega desde otro laboratorio y navegando dentro de la aplicación, que
    // es lo único que ejercita el caso: con `page.goto` el navegador recarga y
    // el componente se monta de nuevo por su cuenta, así que la prueba pasaría
    // aunque el defecto siguiera ahí.
    await abrirLimpio(page, '#/laboratorio/pert');
    await navegarEnLaApp(page, '#/laboratorio/localizacion');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(designado);
  });

  test('el módulo vuelve a la primera etapa al cambiar de tema', async ({ page }) => {
    await abrirLimpio(page, '#/modulo/pert');
    await page.getByRole('tab', { name: /Interpretar/ }).click();
    await expect(page.getByRole('tab', { name: /Interpretar/ })).toHaveAttribute('aria-selected', 'true');

    await navegarEnLaApp(page, '#/modulo/cpm');
    await expect(page.getByRole('tab', { name: /Explorar/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('dos nombres repetidos no rompen el dibujo ni la consola', async ({ page }) => {
    // Los nombres de origen y destino los escribe el usuario. Usarlos como clave
    // de React hacía que dos iguales produjeran claves repetidas, con lo que
    // React puede omitir o duplicar filas y nodos.
    const errores: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errores.push(m.text());
    });

    await abrirLimpio(page, '#/laboratorio/transporte');
    await page.getByRole('textbox').nth(1).fill('M1');

    // Las cuatro columnas siguen dibujándose, dos de ellas con el mismo nombre.
    await expect(page.getByRole('row').filter({ hasText: 'M1' })).not.toHaveCount(0);
    expect(errores.filter((e) => e.includes('same key'))).toEqual([]);
  });

  test('el distintivo de auditoría dice lo mismo en el ejercicio y en el laboratorio', async ({ page }) => {
    // El laboratorio pintaba todas las inconsistencias en tono de aviso, sin
    // distinguir las decididas. Como ya no queda ninguna pendiente, la etiqueta
    // alarmaba siempre y por tanto no informaba de nada.
    await abrirLimpio(page, '#/ejercicio/dist-02');
    await expect(page.getByText('Auditoría resuelta: I-03')).toBeVisible();
    await expect(page.getByText(/^Auditoría: /)).toHaveCount(0);

    await abrirLimpio(page, '#/laboratorio/distribucion');
    await page.getByLabel('Datos de partida').selectOption('dist-02');
    await expect(page.getByText('Auditoría resuelta: I-03')).toBeVisible();
    await expect(page.getByText(/^Auditoría: /)).toHaveCount(0);
  });

  test('la biblioteca filtra por tema', async ({ page }) => {
    await abrirLimpio(page, '#/biblioteca');

    await page.getByLabel('Tema', { exact: true }).selectOption('asignacion');
    await expect(page.getByText(/11 de \d+ ejercicios/)).toBeVisible();
  });
});

test.describe('recorrido del docente', () => {
  test('la auditoría lista las inconsistencias y admite una decisión', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/auditoria');

    await expect(page.getByRole('heading', { name: 'Auditoría de datos' })).toBeVisible();
    await expect(page.getByText(/El enunciado dice 3 camiones y 3 rutas/)).toBeVisible();
    await expect(page.getByText(/La suma de insumos es L 30 800/)).toBeVisible();

    await page
      .locator('section')
      .filter({ hasText: 'El enunciado dice 3 camiones y 3 rutas' })
      .getByRole('button', { name: 'Aplicar esta opción' })
      .first()
      .click();

    await expect(page.getByText('elegida').first()).toBeVisible();
  });

  test('la decisión de auditoría cambia el ejercicio, no solo el registro', async ({ page }) => {
    // Lo que se prueba aquí es que el panel no miente: si el docente elige
    // respetar el enunciado, la tabla del ejercicio pasa de 4 × 4 a 3 × 3.
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');

    const abrirTabla = async () => {
      await page.goto('/#/ejercicio/asig-03');
      await page.getByRole('button', { name: 'Mostrar laboratorio' }).click();
    };

    await abrirTabla();
    await expect(page.getByText('Auditoría resuelta: I-01')).toBeVisible();
    await expect(page.getByText('Camión D', { exact: true }).first()).toBeVisible();

    await page.goto('/#/auditoria');
    await page
      .locator('section')
      .filter({ hasText: 'El enunciado dice 3 camiones y 3 rutas' })
      .getByRole('button', { name: 'Aplicar esta opción' })
      .first()
      .click();

    await abrirTabla();
    await expect(page.getByText('Camión C', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Camión D', { exact: true })).toHaveCount(0);

    // Y volver a la otra opción restituye la tabla completa: la aplicación
    // parte siempre de los datos originales, no del ejercicio ya recortado.
    await page.goto('/#/auditoria');
    await page
      .locator('section')
      .filter({ hasText: 'El enunciado dice 3 camiones y 3 rutas' })
      // La opción vigente queda como «Opción vigente», deshabilitada: el único
      // botón aplicable de la sección es siempre el de la otra opción.
      .getByRole('button', { name: 'Aplicar esta opción' })
      .first()
      .click();

    await abrirTabla();
    await expect(page.getByText('Camión D', { exact: true }).first()).toBeVisible();
  });

  test('el generador verifica antes de publicar', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/generador');

    await expect(page.getByRole('heading', { name: 'Generador de ejercicios' })).toBeVisible();
    await expect(page.getByText('Aprobado')).toBeVisible();
    await expect(page.getByText('Tiene solución válida.')).toBeVisible();

    await page.getByRole('button', { name: 'Publicar en la biblioteca' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/generado/i);
  });

  test('un ejercicio generado se puede practicar con retroalimentación', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/generador');

    // La verificación previa exige que el ejercicio traiga preguntas: sin ellas
    // solo serviría para el laboratorio, no para practicar.
    await expect(page.getByText(/Trae preguntas con respuesta calculada/)).toBeVisible();
    await page.getByRole('button', { name: 'Publicar en la biblioteca' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/generado/i);

    // Ya publicado, entra al flujo de práctica como cualquier otro ejercicio.
    await fijarModo(page, 'Estudiante');
    await expect(page.getByText('Responda y compruebe')).toBeVisible();

    const respuesta = page.getByRole('textbox').first();
    await respuesta.fill('1');
    await page.getByRole('button', { name: 'Comprobar', exact: true }).first().click();

    // Y recibe retroalimentación, no un simple «incorrecto».
    await expect(page.locator('#contenido').getByText(/procedimiento|redondeó|Correcto/i).first()).toBeVisible();
  });

  test('una interpretación se responde, se califica con rúbrica y vuelve al historial', async ({ page }) => {
    await abrirLimpio(page, '#/estudiante');

    await page.getByLabel('Nombre').fill('Ana Prueba');
    await page.getByRole('button', { name: 'Crear perfil' }).click();
    await expect(page.getByRole('heading', { name: /Panel de Ana Prueba/ })).toBeVisible();

    // El estudiante responde la interpretación del despiece de pollo.
    await page.goto('/#/ejercicio/equi-04');
    await page.getByRole('textbox').last().fill('La mezcla manda sobre el margen unitario.');
    await page.getByRole('button', { name: 'Comprobar todo y registrar intento' }).click();
    await expect(page.getByText(/Intento registrado/)).toBeVisible();

    // El docente la encuentra en la bandeja, con sus puntos sin asignar.
    await fijarModo(page, 'Docente');
    await page.goto('/#/revision');
    await expect(page.getByText('3 puntos sin asignar')).toBeVisible();
    await expect(page.getByText('La mezcla manda sobre el margen unitario.')).toBeVisible();

    await page.getByRole('button', { name: 'Calificar' }).click();

    // La rúbrica de interpretación no sale del material, y la pantalla lo dice.
    await expect(page.getByText(/Esta rúbrica no sale de los materiales del curso/)).toBeVisible();
    // Sin todos los criterios elegidos no se puede guardar.
    await expect(page.getByText('Falta elegir el nivel de algún criterio')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar la calificación' })).toBeDisabled();

    // 35 % excelente + 30 % bueno + 25 % «necesita mejorar» + 10 % excelente
    // sobre 3 puntos = 1,05 + 0,72 + 0,30 + 0,30 = 2,37.
    const nivel = async (criterio: string, etiqueta: string): Promise<void> => {
      await page.locator('fieldset').filter({ hasText: criterio }).getByRole('button', { name: new RegExp(`^${etiqueta}`) }).click();
    };
    await nivel('Responde lo que se pregunta', 'Excelente');
    await nivel('Usa los resultados del ejercicio', 'Bueno');
    await nivel('Justifica la decisión', 'Necesita mejorar');
    await nivel('Claridad de la redacción', 'Excelente');

    await expect(page.getByText('2,37 / 3')).toBeVisible();
    await page.getByLabel('Comentario para el estudiante').fill('Le faltó usar las cifras del despiece.');
    await page.getByRole('button', { name: 'Guardar la calificación' }).click();

    await expect(page.getByText('No queda nada por revisar')).toBeVisible();

    // Y el estudiante ve su nota final con el comentario, sin que el puntaje
    // automático que ya le habían dado haya cambiado.
    await page.goto('/#/historial');
    await page.locator('summary').filter({ hasText: 'Despiece de pollo' }).click();
    await expect(page.getByText('Sin las preguntas de interpretación')).toBeVisible();
    await expect(page.getByText(/Nota final 2,4 \/ 12/)).toBeVisible();
    await expect(page.getByText('Le faltó usar las cifras del despiece.')).toBeVisible();
  });

  test('un ejercicio de la biblioteca se duplica y se edita por tipo de datos', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/docente');

    await page.getByLabel('Partir de un ejercicio de la biblioteca').selectOption('equi-04');
    await page.getByRole('button', { name: 'Duplicar y editar' }).click();

    // El editor abre con los campos del tipo que corresponde, no con un JSON.
    await expect(page.getByRole('heading', { name: 'Editar ejercicio' })).toBeVisible();
    await expect(page.getByText('Datos del ejercicio', { exact: true })).toBeVisible();
    await expect(page.getByLabel('La mezcla está expresada en')).toBeVisible();

    // Cambiar un dato deja obsoletas las respuestas que dependen de él, y la
    // aplicación lo dice antes de guardar en vez de dejar una clave incorrecta.
    await page.getByRole('spinbutton', { name: /Costos fijos/ }).fill('600000');
    await expect(page.getByText(/dejaron de coincidir con lo que calcula el motor/)).toBeVisible();

    await page.getByRole('button', { name: 'Actualizar esas respuestas' }).click();
    await expect(page.getByText(/dejaron de coincidir con lo que calcula el motor/)).toBeHidden();

    await page.getByRole('button', { name: 'Guardar en la biblioteca' }).click();
    await expect(page.getByText(/Ejercicio guardado en la biblioteca local/)).toBeVisible();

    // El original queda intacto: la copia es otra entrada.
    await page.goto('/#/ejercicio/equi-04');
    await expect(page.getByText('500 000,00 lempiras al año')).toBeVisible();
  });

  test('el panel docente controla las ayudas', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/docente');

    await expect(page.getByRole('heading', { name: 'Panel docente' })).toBeVisible();
    const interruptor = page.getByRole('switch', { name: 'Mostrar pistas graduadas' });
    await expect(interruptor).toHaveAttribute('aria-checked', 'true');
    await interruptor.click();
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
  });

  test('el centro de reportes produce una clave docente con procedimiento', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Docente');
    await page.goto('/#/reportes');

    await page.getByRole('tab', { name: 'Clave docente' }).click();
    await page.getByLabel('Ejercicio').selectOption({ label: 'Construcción de una planta procesadora de lácteos' });
    await expect(page.getByText('Clave docente — no distribuir').first()).toBeVisible();
    await expect(page.getByText('Procedimiento completo').first()).toBeVisible();
  });
});

test.describe('modos de uso', () => {
  test('el modo evaluación oculta las pistas', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Evaluación');
    await page.goto('/#/ejercicio/cpm-01');

    await expect(page.locator('#contenido').getByText('Modo evaluación').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Pista 1 de/ })).toHaveCount(0);
  });

  test('el modo proyección agranda la tipografía', async ({ page }) => {
    await abrirLimpio(page);
    await fijarModo(page, 'Proyección');

    const escala = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--escala-proyeccion').trim(),
    );
    expect(Number(escala)).toBeGreaterThan(1);
  });

  test('el tema oscuro cambia el fondo', async ({ page }) => {
    await abrirLimpio(page);

    const fondoInicial = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await page.getByRole('button', { name: /Cambiar tema visual/ }).click();
    await page.waitForTimeout(150);
    const fondoNuevo = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    expect(fondoNuevo).not.toBe(fondoInicial);
  });
});

test.describe('accesibilidad y persistencia', () => {
  test('los enlaces con forma de botón no quedan del color de su propio fondo', async ({ page }) => {
    await abrirLimpio(page, '#/laboratorio/simplex');

    // La regla `a { color }` vive fuera de toda @layer y por eso gana a
    // `.boton-primario`, que está en @layer components. Sin la exclusión
    // `a:not(.boton)` el texto queda invisible sobre su propio fondo, en toda
    // la aplicación.
    const contrastes = await page.evaluate(() =>
      [...document.querySelectorAll('a.boton')].map((a) => {
        const cs = getComputedStyle(a);
        return { texto: a.textContent?.trim() ?? '', color: cs.color, fondo: cs.backgroundColor };
      }),
    );

    expect(contrastes.length).toBeGreaterThan(0);
    for (const c of contrastes) expect(c.color, c.texto).not.toBe(c.fondo);
  });

  test('existe un enlace para saltar al contenido', async ({ page }) => {
    await abrirLimpio(page);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused();
  });

  test('el progreso sobrevive a una recarga', async ({ page }) => {
    await abrirLimpio(page, '#/estudiante');
    await page.getByLabel('Nombre').fill('Persistencia');
    await page.getByRole('button', { name: 'Crear perfil' }).click();
    await expect(page.getByRole('heading', { name: /Panel de Persistencia/ })).toBeVisible();

    // La escritura en IndexedDB es asíncrona: se espera a que el perfil esté
    // realmente guardado antes de recargar, para no medir una carrera.
    await expect
      .poll(async () =>
        page.evaluate(
          async () =>
            new Promise<number>((resolver) => {
              const solicitud = indexedDB.open('optiaula-io');
              solicitud.onsuccess = () => {
                const bd = solicitud.result;
                const conteo = bd.transaction('perfiles').objectStore('perfiles').count();
                conteo.onsuccess = () => resolver(conteo.result);
                conteo.onerror = () => resolver(0);
              };
              solicitud.onerror = () => resolver(0);
            }),
        ),
      )
      .toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByRole('heading', { name: /Panel de Persistencia/ })).toBeVisible();
  });

  test('la aplicación funciona en pantalla de teléfono', async ({ page }) => {
    await abrirLimpio(page);
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Abrir navegación/ })).toBeVisible();
  });

  test('ninguna pantalla se desplaza en horizontal en un teléfono', async ({ page }) => {
    // El desplazamiento lateral es el defecto clásico del móvil: se lee media
    // frase y hay que arrastrar para ver el resto. Lo causaba que las tarjetas,
    // los elementos de las rejillas y los rótulos largos no pudieran encogerse
    // por debajo del ancho de su contenido.
    //
    // Se recorren todas las pantallas porque el defecto no está en ninguna en
    // particular: aparece donde el contenido es más ancho —un `<select>` con
    // opciones largas, una tabla, un diagrama—.
    await abrirLimpio(page);
    await page.setViewportSize({ width: 375, height: 812 });

    const rutas = [
      '#/', '#/modulos', '#/biblioteca', '#/progreso', '#/historial', '#/auditoria',
      '#/docente', '#/estudiante', '#/reportes', '#/generador', '#/ayuda', '#/configuracion',
      '#/modulo/pert', '#/ejercicio/cpm-01', '#/ejercicio/dist-02',
      '#/laboratorio/fundamentos', '#/laboratorio/productividad', '#/laboratorio/localizacion',
      '#/laboratorio/distribucion', '#/laboratorio/equilibrio', '#/laboratorio/cpm',
      '#/laboratorio/pert', '#/laboratorio/grafico', '#/laboratorio/simplex',
      '#/laboratorio/asignacion', '#/laboratorio/transporte', '#/laboratorio/inventarios',
      '#/laboratorio/colas',
    ];

    const desbordadas: string[] = [];
    for (const ruta of rutas) {
      await navegarEnLaApp(page, ruta);
      // No todas las pantallas tienen encabezado de nivel 1 —el generador
      // arranca con un formulario—, así que se espera a que haya contenido.
      await expect(page.locator('#contenido')).not.toBeEmpty();
      await expect(page.getByText('Cargando pantalla…')).toHaveCount(0);
      const ancho = await page.evaluate(() => ({
        contenido: document.documentElement.scrollWidth,
        ventana: document.documentElement.clientWidth,
      }));
      if (ancho.contenido > ancho.ventana + 1) desbordadas.push(`${ruta} (${ancho.contenido} > ${ancho.ventana})`);
    }

    expect(desbordadas).toEqual([]);
  });
});
