# Mejoras futuras — OPTIAULA IO

Lista priorizada de lo que falta, con el criterio de por qué está donde está.

---

## Ya resuelto

### ~~La aplicación se desplazaba en horizontal en el teléfono~~ — corregido

Al abrirla en un móvil, once de los trece laboratorios se salían de la pantalla: se leía media frase
y había que arrastrar para ver el resto. El peor era el simplex, con 665 px de contenido en una
pantalla de 375.

La causa era siempre la misma regla de CSS: un elemento flexible o de rejilla no se encoge por debajo
del ancho mínimo de su contenido salvo que se le indique. Tres sitios lo provocaban:

- Las **tarjetas**, que con una tabla o un diagrama dentro crecían más que la pantalla y arrastraban
  consigo a toda la página, anulando el `overflow-x` del contenedor de tablas.
- Los **elementos de las rejillas**, donde un `<select>` de opciones largas —«Probabilidad de
  terminar en o antes de…»— fijaba el ancho de la columna.
- Los **botones y distintivos**, con `white-space: nowrap` y rótulos que a veces son una frase
  entera, como los elementos por clasificar del laboratorio de fundamentos.

Se corrigió con `min-width: 0` en los dos primeros y permitiendo que los rótulos envuelvan en el
tercero. En escritorio no cambia nada: encoger solo ocurre cuando falta espacio. La prueba nueva
recorre las veintiocho pantallas a 375 px y exige que ninguna desborde; verificada contra el código
anterior, donde falla en once.

### ~~No se podía instalar por falta de HTTPS~~ — publicada

El service worker exige HTTPS o `localhost`, y una dirección IP de la red local por HTTP no cumple
ninguna de las dos: en el teléfono no aparecía «Instalar» ni funcionaba sin conexión.

Se resolvió publicándola en **https://gardon-hub.github.io/optiaula-io/**, con el flujo
`.github/workflows/publicar.yml`. La decisión de hacerla pública fue del docente; la alternativa
—un certificado local con mkcert— habría servido solo en su casa y habría obligado a instalar el
certificado en cada aparato.

El flujo verifica tipos, pasa el análisis estático y corre las 535 pruebas del motor **antes** de
publicar. Si algo falla, queda en línea la versión anterior.

Comprobado en el sitio real: contexto seguro, service worker activo con ámbito
`/optiaula-io/`, los tres iconos del manifiesto responden 200, 82 archivos en caché para el uso sin
conexión y ninguna pantalla con desplazamiento horizontal a 375 px.

### ~~El proyecto no tenía linter~~ — incorporado

No había ninguno: `npx eslint` descargaba uno suelto y fallaba por falta de configuración. Instalarlo
destapó que ESLint hoy no puede analizar este código: con TypeScript 7 —el compilador nativo— el
paquete `typescript` ya no publica la API que `typescript-eslint` necesita. Se usa **oxlint**, que
analiza TypeScript y JSX de forma nativa.

De los hallazgos, seis eran defectos reales y se corrigieron:

- El laboratorio de fundamentos prometía en su enunciado clasificar con teclado, pero el destino era
  un `<div>` con `onClick`: no había forma de llegar a él. Ahora cada categoría tiene un botón con
  nombre propio, que incluye la categoría para que los cinco no suenen iguales.
- El interruptor del panel docente se ataba solo con `<label for>`, que los lectores de pantalla no
  anuncian de forma fiable en un `<button>`. Ahora usa `aria-labelledby`.
- La prueba de holgura complementaria del simplex **no afirmaba nada**: en ese modelo ningún recurso
  sobra, así que el bucle no entraba. Se cambió por uno que sí ejerce la propiedad.
- `useMemo` del plano propuesto en distribución recalculaba en cada render por una dependencia que se
  recreaba sola.
- La esquina de las matrices y las celdas sin total se anunciaban «en blanco».
- `toThrow()` sin mensaje aceptaba cualquier error.

**Lo que queda:** las reglas con información de tipos —las más valiosas de `typescript-eslint`— no
existen en oxlint. Cuando `typescript-eslint` soporte TS 7 conviene volver a evaluarlo.

### ~~El distintivo de auditoría no decía lo mismo en todas partes~~ — unificado

La página de ejercicio distinguía las inconsistencias decididas de las pendientes; el laboratorio las
pintaba todas en tono de aviso. Como ya no queda ninguna pendiente, allí la etiqueta alarmaba siempre
y por tanto no informaba de nada. Ahora las dos usan `DistintivosAuditoria` de `ui/base.tsx`, que
recibe el registro de inconsistencias por parámetro: así el componente solo presenta y `ui/` sigue
sin leer del almacén, como manda la separación de capas.

### ~~El mismo patrón en el resto de laboratorios~~ — revisado

Después de los dos fallos de PERT y de la página de ejercicio se barrieron los trece laboratorios
buscando lo mismo. Salieron tres cosas más:

- **El laboratorio abría en un ejercicio distinto según de dónde se llegara.** `PaginaLaboratorio` se
  montaba sin `key`, así que al cambiar de tema conservaba el ejercicio elegido; como no existe en el
  tema nuevo, caía al primero de la lista en vez de al ejemplo resuelto que designa el módulo. Solo se
  nota en localización, donde el ejemplo designado es el segundo: llegando desde otro laboratorio
  abría `loc-01` y con carga limpia `loc-02`. Lo mismo con `PaginaModulo`, que dejaba al estudiante
  en la etapa «Interpretar» de un módulo que no había explorado.
- **Dos nombres iguales rompían las claves de React.** Los identificadores de actividad de CPM y PERT
  y los nombres de origen y destino del transporte los escribe el usuario, y se usaban como clave.
  Poner dos iguales —cosa que la tabla permite— producía claves repetidas en las tablas de
  multiplicadores, en los nodos del diagrama de red y en la red bipartita del transporte. React lo
  avisaba en consola y puede omitir o duplicar filas.
- **El diagrama de red de PERT recalculaba su disposición en cada pulsación**, porque el objeto que
  recibe se construía en el JSX y `DiagramaCPM` lo memoriza por identidad.

Los demás usos están bien: los veintidós del visor de pasos memorizan su resultado, los dos montajes
de `Laboratorio` llevan `key`, y las tablas editables ya indexaban por posición.

### ~~Los seis reinicios de estado en `useEffect`~~ — revisados

Se revisaron uno por uno. Cuatro son correctos: el reinicio de los deslizadores del método gráfico
cuando se edita el modelo, el cierre del menú al navegar —que tiene que ser un efecto porque la
navegación también llega del botón «atrás», donde no hay clic que atender—, el visor de pasos
sincronizando el interruptor de resultados ocultos, y la parada de la animación de redes al llegar
al final, que es sincronización con un temporizador.

Los otros dos escondían fallos observables:

- **El procedimiento probabilístico de PERT volvía al paso 1 sin motivo.** `VisorPasos` reinicia
  cuando cambia la identidad del arreglo de pasos, y ese arreglo se construía en el JSX
  —`[...probabilidad.pasos, ...conConfianza.pasos]`—, así que era nuevo en cada render. Editar la
  descripción de una actividad, que no entra en ese cálculo, devolvía al estudiante al primer paso
  con el contenido intacto. Comprobado en el navegador: mismo texto, 1 237 caracteres idénticos, y
  el visor saltaba de «Ver todo» a «Paso 1 de 4». Ahora está memorizado, y la prop `pasos` documenta
  que debe ser estable.
- **Cambiar de ejercicio arrastraba las respuestas del anterior durante un fotograma.** Los efectos
  corren después de pintar, así que la limpieza llegaba tarde; y como los identificadores de pregunta
  se repiten entre ejercicios —21 usan «p1»—, las marcas de correcto e incorrecto del anterior se
  pintaban sobre el nuevo. Se resolvió montando la página con `key={ejercicioId}`, que es lo que
  React documenta para este caso, y el efecto desapareció. De paso, el cronómetro ya no muestra el
  tiempo del ejercicio anterior hasta el siguiente tic.

Al revisarlos salió un tercer defecto, anterior a todo esto: los dos procedimientos unidos de PERT se
numeraban «1, 2, 1, 2» mientras el encabezado decía «Paso 3 de 4», porque cada solucionador cuenta
desde 1. React avisaba de claves repetidas, que puede omitir o duplicar pasos. Se renumeran al
unirlos, y el visor pasó a indexar por posición.

### ~~Las decisiones de auditoría no cambiaban los datos~~ — incorporado

El panel registraba la decisión y nada más: elegir una opción marcaba la sección como decidida y el
ejercicio se quedaba idéntico. No se notaba porque las cuatro opciones recomendadas coincidían con
los datos ya cargados, pero significaba que la opción contraria no hacía nada. Había además una rama
muerta que buscaba en el enunciado un texto que ya no existía.

Ahora `nucleo/aplicarDecisiones.ts` transforma los datos y recalcula la clave de respuestas, y la
tienda recompone la biblioteca desde los datos originales en cada cambio, de modo que las decisiones
no se encadenan. Las dieciocho inconsistencias tienen decisión registrada; I-01, I-02 e I-03 tienen
transformación, y las metodológicas no la tienen a propósito.

Al hacerlo salió un defecto aparte: `preguntasProductividad()` sumaba los insumos e ignoraba
`costoTotalDeclarado`, que sí usa el motor. La clave del cuestionario y el laboratorio se
contradecían en cualquier ejercicio con costo declarado, incluidos los que el docente cree en el
editor de datos.

**Lo que queda:** las tres transformaciones son las únicas que cambian datos. Si en el futuro se
detecta una inconsistencia nueva cuyas opciones impliquen datos distintos, hay que añadir su entrada
a `TRANSFORMACIONES`; sin ella, el panel volvería a registrar sin aplicar. La prueba
`tieneTransformacion` documenta qué opciones cambian datos y cuáles no.

### ~~Módulo de método gráfico de programación lineal~~ — incorporado

Era la prioridad n.º 1 de la primera versión. Se agregó como **módulo 8**, en la posición que ocupa
en la programación del ciclo: después de PERT y antes del modelo de transporte, que es un caso
particular de programación lineal. La numeración de los módulos siguientes se ajustó en
consecuencia (asignación pasó a 9 y transporte a 10).

Incluye solucionador por enumeración de vértices, detección de los cuatro desenlaces (única,
múltiples, no acotada e infactible), holguras y restricciones activas, laboratorio con región
factible dibujada en vivo y línea de indiferencia desplazable, seis ejercicios —los tres de
`metodo grafico.pptx` transcritos más tres derivados— y soporte en el generador.

### ~~Análisis de sensibilidad y precios sombra~~ — incorporado

Era lo único que quedaba pendiente del método gráfico. Se agregó sobre el mismo motor, sin tocar el
solucionador: `analizarSensibilidad()` toma el resultado ya calculado, normaliza todas las
restricciones a la forma `n · x ≤ d` —incluidas las de no negatividad— y resuelve el sistema dual
en el vértice óptimo.

Entrega tres cosas: el **precio sombra** de cada restricción (cuánto cambia Z por cada unidad
adicional del recurso, con la lectura explícita de que un valor cero significa «no invierta aquí»),
el **rango de los lados derechos** dentro del cual ese precio sigue valiendo, y el **rango de
optimalidad** de cada coeficiente de la función objetivo. El laboratorio incluye un deslizador que
compara la predicción del precio sombra contra el Z realmente recalculado, para que se vea dónde la
predicción deja de servir.

Los precios sombra están verificados en `pruebas/sensibilidad.test.ts` contra una diferencia central
numérica calculada con el propio solucionador: si el dual y la perturbación no coincidieran, la
prueba falla.

### ~~Método simplex~~ — incorporado

Continuación natural del método gráfico: la misma idea —el óptimo está en un vértice— pero recorriendo
los vértices con álgebra en lugar de con un dibujo, lo que quita el límite de dos variables. Se agregó
como **módulo 9**, entre el método gráfico y el modelo de transporte, que es un caso particular de
programación lineal. Asignación pasó a 10 y transporte a 11.

Incluye la forma estándar con holguras, excesos y artificiales, el tableau completo en cada
iteración con la columna entrante y la fila saliente señaladas, los precios sombra leídos
directamente en la fila objetivo, y los cuatro desenlaces (única, múltiples, infactible, no acotada)
más el aviso de degeneración. Siete ejercicios y soporte en el generador.

Toda la aritmética es racional exacta sobre `bigint` (`nucleo/racional.ts`), no punto flotante: el
tableau muestra `5/16` igual que el cuaderno, y cero es exactamente cero, así que la prueba de
optimalidad no depende de ninguna tolerancia.

### ~~Método de la Gran M~~ — incorporado

Las artificiales se pueden tratar por los dos caminos que enseñan los libros, y el laboratorio deja
alternar entre ellos con un selector: **dos fases**, que resuelve primero un problema auxiliar, y
**Gran M**, que las penaliza dentro de la propia función objetivo y resuelve de corrido.

La objeción clásica a la Gran M —elegir un valor para M, con el resultado incorrecto si queda corto
y el redondeo comiéndose la parte real si queda enorme— se evitó no dándole ningún valor. La fila
objetivo se lleva simbólicamente como un par `a + bM` de racionales exactos, y al comparar dos
casillas manda el coeficiente de M; solo cuando empata se mira la parte constante. Es lo mismo que
se hace a mano, y el tableau muestra `−5 − M` o `5/2 + M` tal cual.

Los dos métodos comparten el algoritmo entero: en dos fases el coeficiente de M es siempre cero. Las
pruebas comprueban ejercicio por ejercicio que coinciden en el plan óptimo, en el valor de Z, en los
precios sombra y en el diagnóstico de infactibilidad.

### ~~Dual simplex~~ — incorporado

Tercer método del selector, y el único que resuelve **sin ninguna variable artificial**. Es el
simplex con el orden del trabajo invertido: en vez de mantener la factibilidad mientras busca la
optimalidad, mantiene la optimalidad mientras busca la factibilidad. Lleva todas las restricciones a
la forma ≤ y acepta lados derechos negativos, que es justamente lo que sabe corregir; primero elige
la fila que sale —la más negativa— y después la columna que entra, por la razón mínima sobre los
coeficientes negativos de esa fila.

A cambio exige arrancar de una base que ya cumpla la optimalidad, lo que lo deja fuera de las
maximizaciones con márgenes positivos pero lo convierte en el método natural de los modelos de
mínimo costo con requerimientos mínimos: raciones, mezclas y dietas. En el ejercicio `simp-08`
resuelve con 6 columnas y 2 iteraciones lo que las dos fases hacen con 8 columnas y 5 iteraciones.
Cuando el modelo no cumple sus condiciones, la aplicación lo dice antes de intentarlo —en la ayuda
del selector— y después en un diagnóstico que nombra el método adecuado.

### ~~Ejercicios originales de punto de equilibrio~~ — incorporado

El docente exportó `Punto de Equilibrio.pptx` en agosto de 2026 y con eso se cerró la inconsistencia
I-07, que era la más vieja del registro. Los **diez problemas** de las diapositivas 4 a 13 están
transcritos literalmente y marcados como `textual`, cada uno con su diapositiva de origen en la
atribución. Los cinco ejercicios derivados que hacían de sustituto se retiraron: ya no hacen falta.

El material resultó más rico que el sustituto. Los cuatro primeros son avícolas y en lempiras
—engorde, ponedoras y dos mezclas multiproducto, una de ellas con el despiece completo del pollo—; los
seis restantes son los casos clásicos del tema en dólares, y entre ellos está el de la renta de
veleros, que reúne comisión sobre el ingreso y valor de recuperación en un mismo problema. Cubren
exactamente los tres rasgos que el motor ya sabía modelar y que hasta ahora solo ejercitaban los
ejercicios derivados.

Aparecieron dos ambigüedades del material, y ninguna se corrigió en silencio. **I-12**: las
diapositivas 5 y 6 preguntan cuántas gallinas explotar sin dar la postura anual por ave, así que la
conversión de huevos a gallinas no era computable. **I-13**: la mezcla de ventas se da como «PPM» sin
aclarar si es participación en el ingreso o en las unidades, y las dos lecturas dan resultados
distintos.

Las dos se cerraron en los días siguientes, y ninguna con un supuesto nuestro. I-12 la cerró el
docente al aportar el dato que faltaba: una gallina pone **entre 300 y 330 huevos al año**. Es un
rango, así que la respuesta también lo es —entre 1 145 y 1 260 gallinas para el equilibrio de la
granja de ponedoras—, y los ejercicios convierten con el extremo de 300 porque es el que exige más
aves; dimensionar un plantel con la postura optimista es el error caro del caso, y ahí quedó la
pregunta de interpretación. El enunciado dice que la postura no está en el material.

### ~~Módulos de inventarios y de líneas de espera~~ — incorporados

**Inventarios** resultó no ser derivado: `Manejo de inventario.pptx` sí existía y sí se pudo extraer.
De ahí salieron la notación completa del curso —D, Q, Co, Ch, L, R, DEO, CAI—, los supuestos, los
tres modelos que enseña y el ejercicio de la diapositiva 14, transcrito literalmente con sus seis
preguntas. Es el módulo 12.

Ese ejercicio sirvió de verificación cruzada. Las fórmulas de las diapositivas están insertadas como
imágenes y no se pudieron leer (**I-18**), así que la aplicación usa las estándar de la bibliografía
del curso con la notación del material. La prueba de que son las mismas es que reproducen sus seis
respuestas exactas: lote de 150, 60 órdenes, una cada 6 días, $ 1 050 por orden, $ 300 de costo anual
y punto de reorden en 75. Y las tres últimas solo salen redondas con un año de **360 días**, que la
presentación no especifica: quedó registrado como **I-16** con esa evidencia.

Los tres modelos de la presentación están los tres: el lote económico, el reabastecimiento uniforme
—donde el lote entra a una tasa de producción mientras la demanda ya consume, y por eso conviene
ordenar más— y el periodo fijo, con su intervalo T y su nivel M. El laboratorio dibuja la curva de
costo con un deslizador para comparar contra el óptimo, que es la forma más rápida de mostrar que
**la curva es plana**: pedir un 20 % de más o de menos mueve el costo menos del 2 %.

**Líneas de espera** sí es derivado por completo: no aparece en ningún material (**I-17**). Es el
módulo 13, con M/M/1 y M/M/s verificados contra los valores exactos de libro. La idea que carga el
módulo no es una fórmula sino que **la espera no crece de forma proporcional a la ocupación**: del
80 % al 90 % se multiplica por 2,25, y del 90 % al 95 % se vuelve a duplicar. El laboratorio dibuja
esa curva con su asíntota y una tabla que compara cuántos servidores conviene abrir.

El mejor de los cuatro ejercicios es el de las ventanillas: la gerencia quiere quitar un cajero
«porque están ociosos», y quitarlo multiplica la espera por doce y sale más caro. Ahí está la
lección que la intuición gerencial no da: un servidor ocioso no es desperdicio, es la holgura que
impide que la fila explote.

### ~~Múltiples intentos con historial comparado~~ — incorporado

El modelo de datos siempre admitió varios intentos, pero se mostraban como una lista plana: cada uno
por su lado, sin decir qué cambió. Y ahí estaba lo útil. No «sacó 60 y luego 90», sino **en qué dejó
de equivocarse**.

El panel de progreso trae ahora una sección de evolución. Por cada ejercicio resuelto más de una vez
muestra la serie de porcentajes, y para el último par de intentos una tabla pregunta por pregunta con
cuatro estados: la corrigió, la perdió, sigue mal, sigue bien. Encima, en prosa, qué errores típicos
dejó de cometer, cuáles aparecieron nuevos y —lo que de verdad importa— **cuáles se repiten intento
tras intento**, que son los que señalan el concepto a repasar.

El cálculo vive en `nucleo/comparacionIntentos.ts` y no en la pantalla, porque el mismo texto sirve
para el reporte. Las preguntas de interpretación se comparan por los puntos que les puso el docente,
no por «correcta»: el motor no las califica.

### ~~Exportación directa a PDF sin pasar por el navegador~~ — incorporada

La nota original decía «a costa de agregar una dependencia pesada». Se evitó ese costo: el PDF se
**escribe byte a byte**, sin librería. Una de PDF pesa entre 350 y 400 kB, que en una aplicación que
debe funcionar sin conexión y que ya carga KaTeX es mucho paquete para producir texto y tablas.

`export/pdf.ts` arma el archivo con las fuentes base 14 —Helvetica y Helvetica-Bold, que todo lector
trae— y codificación WinAnsi, que cubre el español entero: tildes, ñ, ü, los signos de apertura, la
raya y las comillas latinas. Los signos que WinAnsi no tiene, como el menos tipográfico U+2212 o el
≤, se sustituyen por su equivalente en vez de escribir un byte inválido. Incluye medición real de
texto con las métricas de Helvetica, corte de línea, tablas con encabezado repetido, salto de página
automático y numeración con el total definitivo.

Lo que un PDF mal armado hace no es fallar: abre en blanco. Por eso las pruebas comprueban la
estructura del archivo —que **cada desplazamiento de la tabla de referencias cruzadas apunte de
verdad al objeto que dice**, que las longitudes declaradas de los flujos coincidan, que el tráiler
cierre—. Esa prueba encontró de inmediato que la verificación manual que yo había hecho antes era
vacua: buscaba `xref` y encontraba el `startxref` del tráiler, con lo que recorría una lista vacía y
daba por bueno cualquier archivo.

El botón vive en el centro de reportes, junto al de imprimir, y su ayuda dice qué queda fuera: las
gráficas. Para incluirlas sigue estando la impresión del navegador, que ahora se llama solo
«Imprimir».

### ~~Editor completo de datos en el panel docente~~ — incorporado

Hasta ahora el editor del panel docente solo dejaba tocar la matriz de los ejercicios de asignación.
Para cualquier otro tipo había que pasar por el laboratorio y el generador, o editar el JSON a mano.
Ahora hay un editor para **los once tipos de datos**, armado con los mismos componentes que usan los
laboratorios: tablas editables para insumos, actividades, productos, factores y restricciones;
matrices para asignación, transporte, recorridos y coeficientes del simplex; y el mismo plano de
bloques arrastrable que tiene el laboratorio de distribución.

Lo interesante no fueron los formularios sino las dos cosas que pueden dejar un ejercicio roto sin
que nadie se entere.

**Las estructuras rectangulares se redimensionan enteras.** Agregar un origen de transporte no es
agregar un nombre: es agregar su fila de costos y su oferta. Agregar una variable al simplex obliga a
darle un coeficiente en cada restricción. Quitar una actividad de CPM obliga a borrarla de las
predecesoras de las demás, o la red queda irresoluble con un identificador colgando. Hay una prueba
por cada uno de esos casos.

**Las respuestas se revisan al cambiar los datos.** Si el docente sube los costos fijos de un
ejercicio, la clave de corrección queda diciendo otra cosa que el enunciado. El editor recalcula las
respuestas con los mismos constructores del generador, muestra cuáles dejaron de coincidir —con el
valor viejo y el nuevo— y ofrece actualizarlas de una vez. Las preguntas escritas a mano para un
enunciado concreto, como la conversión a gallinas, no las produce ningún constructor: se listan
aparte para que se revisen a mano en vez de dejarlas mal en silencio.

Escribiendo la prueba apareció un defecto de esa detección: emparejaba las preguntas por clave de
verificación, y **doce ejercicios repiten la misma clave en varias preguntas** —una por sitio
candidato en localización, una por variable en simplex—, así que comparaba la respuesta de una con la
de otra. Ahora empareja por identificador de pregunta y exige además que la clave coincida.

Como el editor solo alcanza a los ejercicios propios —los del material no se editan, para no perder
la trazabilidad con la fuente—, se agregó **«Duplicar y editar»**: se elige cualquier ejercicio de la
biblioteca, se crea una copia editable y el original queda intacto.

De paso, el despacho por tipo que resolvía un ejercicio cualquiera vivía duplicado dentro del centro
de reportes. Quedó una sola vez en `nucleo/resolverEjercicio.ts`, ahora cubriendo también localización,
distribución y el equilibrio multiproducto, que antes devolvían `null`. Con él, el editor avisa en el
acto si unos datos dejaron el ejercicio sin solución, que es algo que el esquema no puede detectar:
una red con un ciclo valida perfectamente.

### ~~Compresión del proyecto (crashing) en CPM~~ — incorporado

La continuación natural de la ruta crítica: saber cuánto dura un proyecto no es lo mismo que saber
cuánto puede durar, ni cuánto conviene que dure. Cada actividad admite una duración acelerada, más
cara, y la pendiente de costo dice qué precio tiene ganar un periodo en ella.

Se agregó **sin tocar el módulo 6**. Los datos de compresión son campos opcionales de la actividad,
así que los cinco ejercicios de ruta crítica del material siguen exactamente igual y su laboratorio
ni siquiera dibuja el panel: una tarjeta vacía sería un botón decorativo.

Lo interesante no fue la fórmula de la pendiente sino **qué acortar**. Para bajar un periodo hay que
cortar todas las rutas críticas a la vez, que es un problema de recubrimiento: a veces sale más
barato acortar una sola actividad compartida por las dos rutas que las dos ramas por separado, y a
veces al revés. Con las cantidades de un ejercicio se resuelve por enumeración exacta; por encima de
16 candidatas cae a una heurística voraz y lo declara, porque presentar una heurística como si fuera
el mínimo sería exactamente lo que la aplicación no hace en ningún otro sitio.

Y el detalle que decide si el procedimiento es correcto: **la red se resuelve otra vez después de
cada periodo**. Comprimir consume las holguras de las otras rutas y las vuelve críticas. Quien decide
toda la compresión sobre la ruta crítica inicial sigue acortando una actividad que ya dejó de mandar
y paga por días que el proyecto no gana. Ese es el error que persigue la retroalimentación del tema,
junto con dividir la pendiente entre la duración normal, comprimir hasta el tope y olvidar el costo
indirecto en el costo total.

El laboratorio dibuja la curva de costo contra duración con sus tres líneas —directo, indirecto y
total— y marca dónde toca fondo. El costo indirecto es editable, y ahí está la mejor demostración
del tema: en el galpón de engorde, con L 3 500 diarios conviene bajar de 17 a 12 días; con L 900 no
conviene comprimir nada. La respuesta no depende del proyecto sino de lo que cuesta el tiempo.

Los tres ejercicios son **derivados**, como los del simplex: la compresión no aparece en ningún
material del curso —ni en el documento de ruta crítica, ni en las presentaciones, ni en la
programación del ciclo— y eso quedó registrado como **I-15**. No se agregó ninguna fuente nueva: la
bibliografía citada es la misma del curso, que sí cubre el método.

### ~~Rúbrica y revisión de las preguntas de interpretación~~ — incorporado

Era el único tramo del ciclo que seguía abierto. El estudiante respondía una pregunta de
interpretación, la aplicación guardaba el texto con cero puntos y ahí terminaba: no había pantalla
donde el docente las leyera y les pusiera nota. Como son cerca de un tercio de los puntos de cada
ejercicio, la aplicación servía para practicar pero no para evaluar.

Ahora hay una **bandeja de revisión** en el modo docente, con contador de pendientes en el menú.
Junta todas las interpretaciones respondidas de todos los intentos, filtra por estado y por
estudiante, y muestra el enunciado junto a lo que el estudiante escribió. Se califica con rúbrica o a
mano, con un comentario que el estudiante ve en su historial, y la calificación se puede retirar.

La rúbrica del ensayo de la Tarea Semana 1 está transcrita del documento tal cual: sus seis
criterios, sus pesos y los descriptores de sus cuatro niveles. Con 2 puntos y «Excelente» en el
primer criterio la aplicación da 0,60, que es el número que tabula el propio documento. Para las
interpretaciones cortas no hay rúbrica en ningún material, así que la aplicación propone una y **lo
dice en pantalla** antes de que el docente la use; los niveles sí son los del curso.

Dos decisiones de diseño que conviene recordar. La primera: **el puntaje automático no se toca**. Lo
que el estudiante vio al terminar sigue significando lo mismo, y la revisión se suma aparte para dar
una nota final; calificar no reescribe hacia atrás un número que ya se había dado. La segunda: el
porcentaje que muestran el historial, los reportes y el registro de calificaciones sale de una sola
función, `notaDeIntento()`, para que no puedan contradecirse entre pantallas.

### ~~Planos de bloques originales de distribución~~ — incorporado

Los ejercicios `dist-01` y `dist-02` traían planos aproximados porque de la versión de 2025 no se
podía extraer la forma de los dibujos. Con `Distribución 2026.pdf` ya no hace falta el dibujo: las
**tablas de carga-distancia imprimen la distancia de cada relación y de cada bloque**, y de ahí los
planos salen por aritmética, no a ojo.

En el taller, las ocho distancias determinan un único acomodo de la retícula 3×2 para cada
distribución, y sus puntajes dan 785 y 420, los totales impresos. La comprobación independiente es la
gráfica REL: el plano de 420 cumple las dos relaciones A —inspección junto al taladro y junto a
embarques— que el de 785 incumple, sin acercar la inspección a los tornos. Eso cierra **I-04**, que
además queda respondida por la propia diapositiva: imprime `ME = (1 − 420/785) × 100 = 46,49 %`.

En el almacén hubo que ampliar el motor. La presentación mide la distancia **a lo largo del
corredor**, así que dos bloques enfrentados están igual de lejos de la plataforma; eso es una métrica
nueva, `pasillo`, distinta de la rectilínea entre centroides. Con ella el ejercicio pasó de siete
departamentos de un bloque en una retícula 3×3 a los catorce bloques y las áreas reales, y los dos
planos de las diapositivas 5 y 6 reproducen 6 650 y 6 730. **I-03 sigue abierta a propósito**: el
material rotula «Óptima» la peor de las dos, y ahora está probado que 6 650 es el mínimo verdadero,
pero la decisión de cómo presentarlo en clase es del docente.

De paso aparecieron dos defectos propios. La matriz de recorridos es triangular —el puntaje suma las
dos mitades—, y `dist-03` la tenía llena por completo, así que mostraba el doble del puntaje real. Y
el buscador de la mejor distribución intercambiaba departamentos de áreas distintas, lo que deja a
ambos con el área equivocada; ahora solo intercambia áreas iguales y la interfaz declara que con
áreas distintas no alcanza el mínimo global.

Se sumaron los dos problemas de almacén de práctica de las diapositivas 19 y 20 (`dist-04` y
`dist-05`), que no estaban en la versión de 2025. El de la diapositiva 21 quedó fuera y registrado
como **I-14**: su matriz de recorridos no dice en qué columnas van los valores y no hay diapositiva
de solución que sirva de contraste, así que colocarlos a ojo sería inventar el enunciado entero.

### ~~Multiproducto por mezcla de unidades~~ — incorporado

I-13 quedó cerrada pocos días después, y no por un supuesto nuestro. El docente entregó
`Ejercicio_punto_de_equilibrio_granja_avicola.pdf`, que es su solución desarrollada de la diapositiva
7: pondera el **margen unitario** por la mezcla —L 9,05 por unidad promedio— y reparte las 55 248,62
unidades con los mismos porcentajes. PPM son unidades. La diapositiva 6 lo confirma por otro lado,
porque solo con esa lectura da cifras redondas: margen ponderado de L 0,70 y equilibrio en 2 400 000
unidades exactas, o sea 2 280 000 huevos y 120 000 libras de pollo.

El motor solo sabía el otro método, así que ahora implementa los dos y la base de la mezcla es un
dato del problema, elegible desde el laboratorio. Con eso la diferencia deja de ser una nota al pie y
se vuelve visible: los mismos porcentajes del despiece de pollo dan L 1 414 365 leídos como unidades
y L 1 383 960 leídos como ingreso. Hay además una regla de error típico que reconoce cuándo el
estudiante resolvió con la base equivocada, porque es un resultado bien calculado con el método que
no era y sin el aviso no hay forma de ver dónde se desvió.

### ~~Análisis de sensibilidad del transporte~~ — incorporado

MODI ya calculaba los multiplicadores y los costos reducidos; lo que faltaba era leerlos como
herramienta de decisión en lugar de como paso intermedio del método.

Entrega dos cosas. Los **multiplicadores como precios sombra** de la oferta y la demanda, con el
cuidado que el tema exige: como se fija u₁ = 0 por convención, los valores individuales no significan
nada por separado, y lo que se lee es la **suma uᵢ + vⱼ** —lo que cuesta mover una unidad más por esa
ruta dando el rodeo más barato que permita la red—. Y el **rango de cada flete**: para una ruta sin
usar, el descuento exacto que habría que negociarle al transportista para que valga la pena
contratarlo; para una en uso, el intervalo en que puede moverse antes de que convenga reacomodar los
envíos.

La verificación se hace por **optimalidad del plan** y no por identidad: con óptimos alternativos el
solucionador puede devolver otro plan igual de bueno, así que comparar matrices de envío daría falsos
negativos. Dentro del intervalo, el plan actual sigue siendo óptimo con el nuevo flete —comprobado en
todas las rutas de los once ejercicios—; fuera, deja de serlo, salvo en las soluciones degeneradas,
donde un pivote puede cambiar la base sin mover una sola unidad.

De paso se corrigió un fallo preexistente: el indicador `degenerada` medía «faltan celdas básicas»,
que es la condición que dispara la corrección automática, pero el mensaje al estudiante y el
indicador del laboratorio decían «hay rutas en la base con envío cero». Después de la corrección la
bandera quedaba en falso justo cuando la solución sí era degenerada, de modo que la aplicación
afirmaba lo contrario de lo que pasaba. Ahora son dos campos distintos: `faltanBasicas` y
`degenerada`.

### ~~Preguntas en los ejercicios generados~~ — incorporado

El generador producía enunciados y datos verificados pero sin preguntas, así que sus ejercicios solo
servían para el laboratorio y no entraban al flujo de práctica con retroalimentación, que es el ciclo
central de la aplicación. Ahora los ocho temas generables traen el juego completo, con pistas y
claves de verificación.

No se escribió nada nuevo: los constructores que ya usaba la biblioteca se movieron de
`datos/ejercicios/*.ts` a **`nucleo/preguntas.ts`**, porque `nucleo/` no puede importar de
`datos/` y el generador vive ahí. Los ejercicios de la biblioteca usan exactamente los mismos, de
modo que un ejercicio generado y uno transcrito se califican y se explican igual —incluidas las
reglas de error típico: contestar la suma de desviaciones en vez de la de varianzas produce la misma
explicación en los dos—.

Punto de equilibrio no tenía constructor compartido, porque sus ejercicios llevan las preguntas
escritas una a una; se escribió el juego común para los generados.

La verificación previa a publicar crece con una condición más: **el ejercicio tiene que traer
preguntas con respuesta calculable**. Esa comprobación destapó de inmediato un hueco real: el PERT
generado pedía «calcule la probabilidad de terminar dentro del plazo consultado» pero dejaba
`plazoConsulta` en nulo. Ahora el plazo se deduce del propio modelo —una desviación por encima de la
media, que deja la probabilidad cerca del 84 %— y el enunciado lo nombra.

### ~~Simplex revisado~~ — incorporado

Cuarta forma de resolver del módulo 9, y la única que no cambia el camino sino la contabilidad:
recorre exactamente los mismos vértices que las dos fases, con las mismas reglas de entrada y de
salida, pero **no arrastra el tableau**. Mantiene solo `B⁻¹` y calcula cada columna cuando la
necesita: los multiplicadores `y = c_B B⁻¹` para valorar las candidatas, y `B⁻¹Aₑ` únicamente para
la que entra.

Cada iteración se presenta en dos mitades, como se hace a mano: la tabla de valoración —con `c_j`,
`y · A_j` y `z_j − c_j` de cada columna candidata— y la tabla de `B⁻¹` junto a `x_B`, la columna
entrante y las razones. Los multiplicadores aparecen escritos en cada paso, lo que hace visible que
**son los precios sombra de la base actual**: en el tableau había que llegar al final para leerlos.

La comparación de trabajo se muestra sin exagerar: con tres variables y tres restricciones son 21
casillas frente a 15, y el texto dice que la ventaja crece cuando hay muchas más variables que
restricciones, que es el caso real. El álgebra vive aparte en `nucleo/matriz.ts` —inversa exacta por
Gauss-Jordan y actualización por matriz elemental— y se prueba por su cuenta.

La verificación es de identidad, no de aproximación: las pruebas exigen que el revisado visite
**exactamente** la misma sucesión de bases que el tableau en los ocho ejercicios, y comprueban por
dentro que `B · B⁻¹ = I` en cada iteración.

### ~~Análisis de sensibilidad del simplex~~ — incorporado

El tableau final ya contenía todo; faltaba leerlo. `nucleo/sensibilidadSimplex.ts` extrae, sin
resolver nada de nuevo: el **rango de factibilidad** de cada lado derecho —hasta dónde vale su precio
sombra antes de que la base cambie—, el **rango de optimalidad** de cada coeficiente —cuánto pueden
moverse los precios antes de que convenga cambiar el plan— y el **costo reducido** de cada variable
que quedó fuera, que es la respuesta con número a «¿por qué no producimos esto?».

Verificado por tres caminos independientes: coincide exactamente con la geometría del módulo 8 en los
modelos de dos variables; dentro de cada rango de lado derecho la predicción del precio sombra es
exacta al volver a resolver, y justo fuera falla; y dentro de cada rango de coeficiente el plan
óptimo no cambia, mientras que justo fuera sí. Los tres métodos de solución dan la misma
sensibilidad.

Queda cerrado el círculo con el dual simplex: cuando un lado derecho se sale de su rango, la base
cambia, y ese es justamente el caso que el dual resuelve sin empezar de cero.

Lo que **no** incluye: la reoptimización en caliente. El uso industrial del dual simplex es partir de
un óptimo ya calculado, cambiar un lado derecho o agregar una restricción, y recuperar la optimalidad
sin volver a empezar —es lo que hacen dentro los algoritmos de ramificación y acotamiento—. Aquí cada
cambio vuelve a resolver desde cero. Implementarlo significaría conservar `B⁻¹` del tableau final y
recalcular solo la columna de lados derechos antes de iterar; el resto del código ya está.

---

## Prioridad alta — lo que el curso ya necesita

### ~~1. Ejercicios originales de punto de equilibrio~~ — incorporado

Ver la sección «Ya resuelto».

### ~~2. Reconstruir los planos de bloques originales de distribución~~ — incorporado

Ver la sección «Ya resuelto».

### ~~3. Preguntas para los ejercicios generados~~ — incorporado

Ver la sección «Ya resuelto».

---

## Prioridad media — mejoran el uso diario

### ~~4. Editor completo de datos en el panel docente~~ — incorporado

Ver la sección «Ya resuelto».

### ~~5. Rúbrica de evaluación para las preguntas de interpretación~~ — incorporado

Ver la sección «Ya resuelto».

### ~~6. Múltiples intentos con historial comparado~~ — incorporado

Ver la sección «Ya resuelto».

### ~~7. Análisis de sensibilidad en transporte~~ — incorporado

Ver la sección «Ya resuelto».

### ~~8. Compresión del proyecto (crashing) en CPM~~ — incorporado

Ver la sección «Ya resuelto».

---

## Prioridad baja — valiosas pero no urgentes

### ~~9. Módulos de inventarios y de líneas de espera~~ — incorporados

Ver la sección «Ya resuelto».

### 10. Sincronización opcional con un backend

La arquitectura ya está preparada: todas las escrituras pasan por `almacen/baseDatos.ts` y el
modelo de datos tiene identificadores estables y marcas de tiempo. Conectar Supabase permitiría que
el docente reciba los intentos de sus estudiantes sin pedir archivos. Requiere resolver antes el
tratamiento de datos personales.

### 11. Asistente de IA opcional

La arquitectura está hecha y desactivada (`nucleo/asistenteOpcional.ts`). Un asistente podría
ampliar la retroalimentación determinista en las preguntas de interpretación, que hoy no se
califican. Debe seguir siendo opcional: la aplicación no puede depender de un servicio de pago.

### ~~12. Exportación directa a PDF sin pasar por el navegador~~ — incorporada

Ver la sección «Ya resuelto».

### 13. Modo de dos columnas para proyección

En pantallas muy anchas, el modo proyección podría mostrar el diagrama a la izquierda y el paso
actual a la derecha, en vez de apilarlos.

### 14. Traducción de la interfaz

Todo está en español, que es el requisito. Si alguna vez hiciera falta otro idioma, los textos
están incrustados en los componentes y habría que extraerlos primero a un archivo de mensajes.

---

## Deuda técnica conocida

- **`construirAOA()` genera más actividades ficticias de las necesarias.** Produce redes correctas,
  pero una persona dibujaría menos. Reducirlas exige un algoritmo de minimización de arcos ficticios
  que es NP-difícil en general; para redes de diez actividades una heurística de fusión de eventos
  daría diagramas más limpios.

- **La búsqueda de la mejor distribución es exhaustiva solo hasta 8 departamentos móviles.** Por
  encima usa intercambio por pares, y lo declara en la interfaz. Para plantas grandes convendría un
  recocido simulado.

- **El paquete inicial pesa unos 265 kB comprimidos.** La mayor parte es KaTeX. Cargarlo de forma
  diferida solo cuando aparece una fórmula bajaría bastante la primera carga.

- **`pruebas/e2e` no cubre la exportación de archivos.** Playwright puede interceptar descargas;
  falta escribir esas pruebas para CSV, Excel y SVG.
