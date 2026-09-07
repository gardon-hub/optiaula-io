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

## Cómo subirlo

1. Entre al curso y active **Modo de edición**.
2. **Añadir una actividad o un recurso** → **Paquete SCORM**.
3. Póngale nombre, por ejemplo *La cooperativa lechera como sistema operativo*.
4. En **Paquete**, arrastre el archivo `optiaula-fundamentos-scorm.zip`.
5. Guarde. Moodle lee el paquete y lo deja listo.

Ajustes que conviene revisar, en la misma pantalla:

- **Apariencia → Mostrar paquete:** «Ventana actual» va bien. Si el diseño se ve apretado, «Ventana
  nueva» le da toda la pantalla.
- **Calificación → Método de calificación:** *Calificación más alta* si quiere que valga el mejor
  intento, o *Último intento* si quiere el más reciente.
- **Gestión de intentos → Número de intentos:** varios intentos tienen sentido aquí. La actividad
  explica el error después de comprobar, y repetirla es justamente donde se aprende.

## Qué verá el estudiante

Los 18 elementos de la cooperativa y las cinco categorías del modelo de sistemas. Toca un elemento y
luego la categoría; con ratón también puede arrastrarlo; con teclado se recorre con Tab y se toma y
suelta con Enter. Al comprobar, cada elemento queda marcado como correcto o incorrecto y **se
explican solo las categorías donde de verdad se equivocó**, no las cinco.

La nota llega sola al libro de calificaciones. Si el estudiante deja la actividad a medias, al volver
encuentra lo que ya había clasificado.

## Si no quiere usar SCORM

En `moodle/contenido/index.html` está el mismo archivo suelto. Se puede subir como recurso
**Archivo** y funciona igual, con una diferencia: **no registra la calificación**. La propia
actividad lo avisa en pantalla en lugar de fingir que la guardó.

Sirve también para proyectarlo en clase o llevarlo en una memoria USB: no necesita servidor.

## Regenerar el paquete

El contenido no está copiado a mano: el generador lo lee de `src/datos/ejercicios`, la misma fuente
que usa la aplicación. Si corrige un elemento o cambia un enunciado allí:

```bash
npm run moodle
```

Vuelve a dejar el ZIP en `moodle/optiaula-fundamentos-scorm.zip`. Súbalo de nuevo en la misma
actividad de Moodle y quedará actualizado.

## Comprobarlo antes de subirlo

`moodle/prueba-lms.html` finge ser Moodle: expone la misma API de SCORM y muestra en un panel cada
llamada que hace el paquete. Sirve para ver que la nota sale y con qué valor, sin tener que subir
nada al curso. Ábralo con cualquier servidor de archivos estáticos —no con doble clic, porque el
marco necesita `http://`—.

## Qué falta

Solo está exportado el laboratorio del **módulo 1**. El generador está escrito alrededor de este tipo
de actividad —clasificar elementos en categorías—; los otros doce laboratorios son de otra naturaleza
(tablas de datos, gráficas, procedimientos paso a paso) y cada uno necesitaría su propio exportador.
Si quiere alguno más, dígalo y se agrega.
