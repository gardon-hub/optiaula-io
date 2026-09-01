# Manual breve de usuario — OPTIAULA IO

---

## Para el estudiante

### Empezar

1. Abra la aplicación y elija **Panel del estudiante** en el menú lateral.
2. Escriba su nombre y pulse **Crear perfil**. Sus datos se guardan solo en ese navegador: no hay
   cuenta, no hay contraseña y no se envía nada a internet.
3. La portada le indica cuál es su **próxima actividad**: el módulo con menor dominio, en el orden
   del curso.

### Estudiar un módulo

Cada uno de los trece módulos tiene siete etapas, en pestañas:

1. **Explorar** — tres preguntas para activar lo que ya sabe. No hace falta acertar.
2. **Comprender** — la explicación, las fórmulas con el significado de cada símbolo, el glosario y
   los errores frecuentes del tema.
3. **Ejemplo resuelto** — un ejercicio del material resuelto paso a paso.
4. **Practicar** — ejercicios con pistas graduadas.
5. **Desafío** — los mismos métodos, sin ayuda.
6. **Interpretar** — qué significa el resultado para quien tiene que decidir.
7. **Autoevaluarse** — modo evaluación y generación del reporte.

### El laboratorio

Es la parte que conviene usar más. En el laboratorio de cada módulo:

- **Los datos son editables.** Cambie un número y todo se recalcula al instante.
- **El procedimiento avanza paso a paso** con el botón «Mostrar siguiente paso». Cada paso explica
  *por qué* se hace esa operación, no solo cuál es.
- Los cambios que haga en el laboratorio **no modifican el ejercicio guardado**: experimente sin
  miedo.

Lo que puede hacer en cada uno:

| Módulo | Qué manipular |
|---|---|
| Fundamentos | Arrastrar elementos a entradas, procesos, salidas, retroalimentación o ambiente externo |
| Productividad | Editar la tabla de insumos, cambiar el tratamiento del inventario en proceso, mover precio y volumen |
| Localización | Arrastrar los sitios candidatos sobre el mapa; cambiar la métrica de distancia; barrer una ponderación |
| Distribución | Mover departamentos en el plano de bloques; buscar la mejor distribución posible |
| Punto de equilibrio | Deslizadores de precio, costo variable, costos fijos y capacidad sobre la gráfica |
| CPM | Escribir actividades y predecesoras; animar los recorridos; retrasar una actividad y ver el efecto |
| PERT | Cambiar las tres estimaciones; mover el plazo sobre la curva normal |
| Método gráfico | Editar la función objetivo y las restricciones; desplazar la línea de indiferencia sobre la región factible; leer los precios sombra y mover la disponibilidad de un recurso para comprobar hasta dónde predicen bien |
| Simplex | Agregar o quitar variables y restricciones; seguir el tableau iteración por iteración; alternar entre fracciones exactas y decimales, y entre las cuatro formas de resolver: dos fases, Gran M, dual y revisado; leer los rangos de sensibilidad y los costos reducidos |
| Asignación | Editar la matriz, marcar prohibiciones, cambiar entre minimizar y maximizar |
| Transporte | Editar costos, oferta y demanda; comparar los tres métodos iniciales; ver la red de envíos; leer los multiplicadores y los rangos de flete de cada ruta |

### Resolver un ejercicio

1. Lea el enunciado y **resuelva a mano primero**. El laboratorio está oculto a propósito.
2. Escriba su respuesta y pulse **Comprobar**.
3. Si se equivoca, el sistema no dice solo «incorrecto»: cuando reconoce un error típico, explica
   exactamente qué se hizo mal. Por ejemplo, si suma las desviaciones estándar en PERT en lugar de
   las varianzas, se lo dirá con esas palabras.
4. Las **pistas** van de lo sutil a lo explícito. Cada una consumida reduce un poco el puntaje de
   esa pregunta, así que úselas cuando de verdad las necesite.
5. Al terminar, pulse **Comprobar todo y registrar intento**. El resultado alimenta su panel de
   progreso.

### Ver su avance

- **Panel de progreso** — dominio por módulo y errores que ha repetido. Un error que aparece tres
  veces señala un concepto que conviene repasar antes de seguir.
- **Historial de prácticas** — cada intento con sus respuestas y la retroalimentación que recibió.
- **Centro de reportes** — su informe individual, listo para imprimir o guardar como PDF.

### Advertencias que puede encontrar

Algunos ejercicios muestran una etiqueta ámbar de **auditoría**. Significa que el material original
tiene una discrepancia real (por ejemplo, un enunciado que habla de tres camiones junto a una tabla
con cuatro). La aplicación no corrige nada por su cuenta: conserva el dato original y avisa. Su
docente decide cuál es el valor válido.

---

## Para el docente

### Activar el modo docente

Pulse **Docente** en la barra superior. Aparecen el panel docente, el generador y la auditoría de
datos.

### Auditoría de datos

**Empiece por aquí.** El panel lista las inconsistencias detectadas al revisar los materiales, cada
una con sus opciones y el efecto de cada una. Mientras no decida, los ejercicios afectados
conservan los datos originales y muestran la advertencia.

Puede cambiar una decisión en cualquier momento: el ejercicio se reconstruye desde los datos
originales, así que los cambios no se acumulan.

### Controlar lo que ve el estudiante

En el panel docente:

- **Mostrar pistas graduadas** — apagarlo convierte toda la práctica en desafío.
- **Mostrar la respuesta correcta al fallar** — con esto apagado, el estudiante recibe la
  explicación del error pero no el valor.
- **Mostrar la atribución de cada ejercicio** — los documentos originales atribuyen cada problema a
  un nombre; está oculto por defecto.
- **Tolerancia de redondeo** — margen admitido al calificar respuestas numéricas.

### Crear ejercicios

Tres caminos:

1. **Crear ejercicio** — en blanco, editando título, enunciado y matriz.
2. **Importar matriz** — copie el rango desde Excel y péguelo. La primera fila lleva los nombres de
   las columnas y la primera columna los de las filas. Hay una plantilla descargable.
3. **Generador** — produce ejercicios completos con contexto agropecuario a partir de una semilla.

### El generador

Elija tema, nivel, contexto, tamaño, moneda y las opciones específicas (balanceado o no, con o sin
prohibiciones, con o sin rutas críticas múltiples).

**La semilla es la clave.** La misma semilla produce siempre el mismo ejercicio, de modo que puede
regenerar un examen idéntico meses después. Puede derivarla de un texto como «Examen 3, sección A,
2026» para no tener que anotar un número.

Antes de publicar, el generador **resuelve el ejercicio con el propio motor** y verifica que tenga
solución válida, datos coherentes y dificultad acorde al nivel. Las verificaciones se muestran una
por una. Si alguna falla, reintenta con otra semilla; nada se publica sin verificar.

Con **Generar una serie** produce varias versiones distintas del mismo tipo de problema, una por
estudiante.

### Evaluaciones

Arme una evaluación eligiendo ejercicios de la biblioteca y definiendo intentos permitidos, tiempo
límite, tolerancia y si se muestran pistas o soluciones. Al iniciarla, la aplicación entra en modo
evaluación automáticamente.

La calificación es automática cuando el resultado es verificable. Las preguntas de interpretación
quedan marcadas para su revisión: calificar una explicación con reglas produciría falsos negativos.

### Editar los datos de un ejercicio

En el panel docente, **Ejercicios propios** trae un selector con toda la biblioteca y el botón
**Duplicar y editar**: se elige un ejercicio, se crea una copia y se abre el editor. El original no se
toca nunca, para no perder la trazabilidad con el material del curso.

El editor tiene campos propios para cada tipo de dato —insumos, actividades, productos, matrices,
planos de bloques—, así que no hace falta pasar por el JSON. Agregar o quitar filas ajusta todo lo
que dependa de ellas: un origen de transporte nuevo estrena su fila de costos y su oferta, y una
actividad borrada desaparece también de las predecesoras de las demás.

Lo importante al editar: si cambia un dato, la aplicación **compara las respuestas guardadas con lo
que ahora calcula el motor** y le muestra cuáles dejaron de coincidir, con el valor viejo y el nuevo.
Un botón las actualiza todas. Las preguntas escritas a mano para ese enunciado en particular no se
pueden recalcular solas y aparecen listadas aparte, para que las revise usted.

### Revisión de interpretaciones

En el modo docente, **Revisión de interpretaciones** junta todas las respuestas escritas que
esperan calificación, con el número de pendientes en el menú lateral. Cada ficha muestra el
enunciado y lo que el estudiante escribió; puede filtrar por estado y por estudiante.

Para calificar hay tres caminos:

- **Con la rúbrica del curso.** La del ensayo de la Tarea Semana 1 está transcrita del documento con
  sus seis criterios y los descriptores de sus cuatro niveles. Se elige un nivel por criterio y la
  aplicación reparte los puntos según los pesos.
- **Con la rúbrica de interpretación.** Para las preguntas cortas, que no tienen rúbrica en ningún
  material del curso. La propone la aplicación y lo dice en pantalla antes de que usted la use:
  cámbiela o ignórela si no le sirve.
- **Sin rúbrica**, escribiendo los puntos a mano.

En todos los casos puede dejar un comentario, que el estudiante ve en su historial, y retirar la
calificación si quiere volver a mirarla.

Lo que el estudiante vio al terminar el ejercicio no cambia: ese puntaje seguía cubriendo solo las
preguntas de resultado verificable. Lo que la revisión agrega es la **nota final**, que suma las dos
partes y es la que aparece en el historial, en los reportes y en el registro de calificaciones.

### Reportes

En el centro de reportes:

| Reporte | Para qué |
|---|---|
| Hoja de ejercicios | Repartir en clase, sin respuestas, con espacio para escribir |
| Clave docente | El mismo ejercicio con respuestas y procedimiento completo |
| Reporte individual | Desempeño de un estudiante |
| Resumen de evaluación | Promedios por tema |
| Comparación de métodos | Los tres métodos iniciales de transporte, lado a lado |
| Registro de calificaciones | Promedio por tema de cada perfil |

Todos llevan el mismo encabezado: aplicación, tema, estudiante, docente, institución, fecha, datos,
método, procedimiento, resultado, interpretación, fuentes y versión. Se pueden imprimir, guardar
como PDF, exportar a CSV o Excel, y copiar al portapapeles.

Los diagramas y gráficas se exportan por separado como SVG o PNG con los botones que llevan debajo.

### Dar clase con la aplicación

Pulse **Proyección** en la barra superior. La tipografía crece un 35 %, la navegación lateral
desaparece y quedan a la vista los controles grandes.

Recomendación de uso: abra el laboratorio del tema, pulse **Ocultar resultados**, plantee la
pregunta a la clase, y revele el paso solo después de que hayan anticipado el valor. En CPM, los
botones de **recorrido hacia adelante** y **hacia atrás** animan la red actividad por actividad y
se pueden pausar.

### Respaldo

En Configuración, **Descargar respaldo JSON** guarda configuración, perfiles, ejercicios propios,
intentos, evaluaciones, progreso, decisiones de auditoría y favoritos. Restaurar reemplaza todo lo
actual, así que descargue un respaldo antes si quiere conservarlo.

---

## Solución de problemas

| Problema | Qué hacer |
|---|---|
| «No se guarda mi avance» | Revise en Configuración que el almacenamiento local esté disponible. En modo privado no lo está. |
| «No aparece la opción de instalar» | Requiere HTTPS o `localhost`. Desde un archivo local el navegador no ofrece instalación. |
| «Los números salen con punto en vez de coma» | La aplicación usa coma decimal y espacio para miles. Al escribir se aceptan ambos. |
| «El acento no se ve bien en el CSV» | Ábralo con Excel, no con el Bloc de notas: el archivo lleva marca UTF-8. |
| «Quiero volver a empezar» | Configuración → Borrar todos los datos locales. No se puede deshacer. |
