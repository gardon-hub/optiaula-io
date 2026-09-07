# Llevar los simuladores a Moodle

Cómo pasar una actividad interactiva de OPTIAULA IO al Moodle de la UNAG sin que deje de ser
interactiva, y por qué se eligió este camino y no otro.

---

## El problema que decide todo

**El editor de Moodle borra el JavaScript.** Cuando un docente escribe en una Página, una Etiqueta o
la descripción de una actividad, Moodle limpia el HTML antes de guardarlo y elimina las etiquetas
`script`. Es una medida de seguridad razonable —evita que alguien inyecte código en el curso— y solo
la levanta el permiso `moodle/site:trustcontent`, que normalmente tiene únicamente el administrador
del sitio.

Consecuencia: **copiar y pegar el HTML del simulador en una página de Moodle no funciona.** Se verían
los textos y los recuadros, pero nada respondería al toque. Ese es el motivo de que haga falta una
estrategia y no un simple copiar y pegar.

## Las opciones, y por qué se eligió SCORM

| Camino | ¿Sigue interactivo? | ¿Califica? | Trabajo para el docente |
|---|---|---|---|
| Pegar el HTML en una Página | **No**, se borra el script | No | Ninguno, pero no sirve |
| Subirlo como recurso «Archivo» | Sí | No | Subir un archivo |
| **Paquete SCORM** | **Sí** | **Sí, automático** | **Subir un archivo** |
| Rehacerlo en H5P | Sí | Sí | Rehacer la actividad en otro editor |
| Enlazar o incrustar el sitio publicado | Sí | No | Pegar un enlace |
| Rehacerlo como pregunta de Moodle | Sí | Sí | Rehacer, y queda con la forma de un cuestionario |

Se eligió **SCORM 1.2** porque es el único camino que cumple las tres cosas a la vez:

1. **Conserva el simulador tal como está**, con su pedagogía, sus explicaciones y su aspecto. No hay
   que rehacerlo en el editor de otra herramienta ni aceptar la forma que esa herramienta imponga.
2. **Escribe la nota en el libro de calificaciones** del curso, sin que el docente la copie a mano.
3. **Es parte de Moodle**, no un complemento: no hay que pedirle nada al administrador del sitio.

Además el paquete es autónomo —no pide nada a internet— así que funciona aunque el aula tenga mala
conexión, y sigue funcionando si algún día el sitio publicado deja de existir.

## Las dos actividades

`npm run moodle` deja dos paquetes, uno por actividad. Se suben igual, pero **no se registran
igual**, y la diferencia no es un detalle técnico:

| Paquete | Actividad | Qué registra |
|---|---|---|
| `optiaula-sistemas-scorm.zip` | Constructor de sistemas: clasificar 18 elementos | **Nota** de 0 a 100, aprueba con 70 |
| `optiaula-perfil-scorm.zip` | Perfil de operaciones: manufactura y servicios | **Completada**, sin nota |

**Por qué el perfil no lleva nota.** Los valores de referencia de las cuatro organizaciones son
criterio del docente, no una medición: nadie ha medido que el contacto con el cliente de un comedor
sea 80 y no 75. Calificar contra ellos convertiría un criterio en clave de respuestas y daría una
nota de apariencia objetiva sobre números que nadie midió. Queda registrado en la auditoría como
inconsistencia **I-19**, y por eso el paquete usa `completed` en vez de `passed`: SCORM distingue
entre las dos cosas.

El perfil se marca completado cuando el estudiante ha perfilado las cuatro organizaciones **y** ha
contrastado cada una con el criterio del docente. Ese contraste es el acto de aprender que la
actividad persigue; lo que se califica son las preguntas de interpretación, donde usted las ponga.

## Cómo subirlo

1. Entre al curso y active **Modo de edición**.
2. **Añadir una actividad o un recurso** → **Paquete SCORM**.
3. Póngale nombre, por ejemplo *La cooperativa lechera como sistema operativo*.
4. En **Paquete**, arrastre uno de los dos archivos `.zip`.
5. Guarde. Moodle lee el paquete y lo deja listo.

Repita para el segundo. Son dos actividades distintas, así que van en dos entradas del curso.

Ajustes que conviene revisar, en la misma pantalla:

- **Apariencia → Mostrar paquete:** «Ventana actual» va bien. Si el diseño se ve apretado, «Ventana
  nueva» le da toda la pantalla.
- **Calificación → Método de calificación:** *Calificación más alta* si quiere que valga el mejor
  intento, o *Último intento* si quiere el más reciente. En el perfil da igual: no envía nota.
- **Gestión de intentos → Número de intentos:** varios intentos tienen sentido aquí. La actividad
  explica el error después de comprobar, y repetirla es justamente donde se aprende.

## Qué verá el estudiante

**En el constructor de sistemas:** los 18 elementos de la cooperativa y las cinco categorías del modelo de sistemas. Toca un elemento y
luego la categoría; con ratón también puede arrastrarlo; con teclado se recorre con Tab y se toma y
suelta con Enter. Al comprobar, cada elemento queda marcado como correcto o incorrecto y **se
explican solo las categorías donde de verdad se equivocó**, no las cinco.

La nota llega sola al libro de calificaciones. Si el estudiante deja la actividad a medias, al volver
encuentra lo que ya había clasificado.

**En el perfil de operaciones:** cuatro organizaciones y ocho controles deslizantes que van de
manufactura a servicio. Al mover cualquiera, cambia abajo **lo que ese perfil obliga a hacer**: si el
producto no se puede guardar, la capacidad se dimensiona al pico; si se puede, el inventario absorbe
la variación. Ese cambio en vivo es el punto de la actividad. El botón de comparar muestra dónde
sitúa el docente cada rasgo y por qué, sin decir que el estudiante se equivocó.

## Enviarla por WhatsApp o por enlace

**El ZIP no sirve para eso.** Un paquete SCORM es un formato para plataformas: el estudiante tendría
que descargarlo, descomprimirlo y abrir un archivo suelto, cosa que en un teléfono casi nadie hace.

Lo que sí funciona es **enviar el enlace**. Cada actividad está publicada también como página suelta:

- Perfil de operaciones: <https://gardon-hub.github.io/optiaula-io/actividades/perfil/>
- Constructor de sistemas: <https://gardon-hub.github.io/optiaula-io/actividades/sistemas/>

Se abren de un toque, sin descargar ni instalar nada, y funcionan igual en teléfono que en
computadora. La diferencia con la versión de Moodle es que **no queda registro**: la actividad avisa
en pantalla que no se guarda la calificación. Sirve para practicar, para proyectar en clase o para
mandar antes de la sesión; lo que se califica sigue estando en Moodle.

Las páginas se generan con `npm run moodle` en `public/actividades/`, y el flujo de publicación las
regenera en cada envío, así que el enlace siempre muestra la versión actual.

## Proyectar en clase

Hay una página con los códigos QR de las tres direcciones, pensada para el cañón:

<https://gardon-hub.github.io/optiaula-io/actividades/qr/>

Se cambia de código con las flechas o con los botones de abajo, **F** la pone a pantalla completa y
**Ctrl+P** imprime una hoja por código, para pegarla en el aula.

Los códigos sueltos, por si prefiere pegarlos en una diapositiva, quedan en `moodle/qr/` como SVG:
`perfil.svg`, `sistemas.svg` y `app.svg`. Son vectoriales, así que se agrandan sin pixelarse.

Se generan con `npm run moodle`, sin llamar a ningún servicio: un QR pedido a una API dejaría de
funcionar el día que el aula no tenga internet, que es justo cuando hace falta. Van con corrección de
errores alta (nivel Q, 25 %), que es lo que aguanta la deformación del proyector y una sombra encima.

## Si no quiere usar SCORM

En `moodle/sistemas/index.html` y `moodle/perfil/index.html` están los mismos archivos sueltos. Se puede subir como recurso
**Archivo** y funciona igual, con una diferencia: **no registra la calificación**. La propia
actividad lo avisa en pantalla en lugar de fingir que la guardó.

Sirve también para proyectarlo en clase o llevarlo en una memoria USB: no necesita servidor.

## Regenerar el paquete

El contenido no está copiado a mano: el generador lo lee de `src/datos/ejercicios`, la misma fuente
que usa la aplicación. Si corrige un elemento o cambia un enunciado allí:

```bash
npm run moodle
```

Vuelve a dejar los dos ZIP en `moodle/`. Súbalos de nuevo en la misma actividad de Moodle y quedarán
actualizados.

## Comprobarlo antes de subirlo

`moodle/prueba-sistemas.html` y `moodle/prueba-perfil.html` fingen ser Moodle: exponen la misma API
de SCORM y muestran en un panel cada llamada que hace el paquete. Sirven para ver qué se registra —una nota en un caso, la marca de completada en el otro— sin tener
que subir nada al curso. Ábralo con cualquier servidor de archivos estáticos —no con doble clic, porque el
marco necesita `http://`—.

## Qué falta

Están exportadas las **dos actividades del módulo 1**. Los otros doce laboratorios son de otra
naturaleza —tablas de datos editables, gráficas, procedimientos paso a paso— y cada uno necesitaría su
propio exportador. Lo que sí quedó listo es la base: `herramientas/moodle/comun.mts` ya tiene el
estilo, el envoltorio de SCORM, el manifiesto, el escritor de ZIP y el banco de pruebas, así que una
actividad nueva solo escribe su cuerpo y su guion. Si quiere alguna más, dígalo.
