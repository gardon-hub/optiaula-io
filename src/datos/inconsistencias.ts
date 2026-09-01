/**
 * Registro de inconsistencias detectadas en los materiales.
 *
 * Ninguna se corrigió en silencio. El panel de Auditoría de datos del modo
 * docente muestra cada caso y pide una decisión antes de aplicar cualquier
 * corrección.
 */

import type { Inconsistencia } from '@/esquemas';

export const INCONSISTENCIAS_INICIALES: readonly Inconsistencia[] = [
  {
    id: 'I-01',
    ejercicioId: 'asig-03',
    titulo: 'El enunciado dice 3 camiones y 3 rutas, pero la tabla tiene 4 × 4',
    descripcion:
      'El problema 3 de asignación («Asignación de camiones a rutas») plantea en el texto una cooperativa lechera con ' +
      '3 camiones y 3 rutas de distribución. La tabla que acompaña al enunciado contiene cuatro camiones (A, B, C, D) ' +
      'y cuatro rutas (1, 2, 3, 4). Ambos datos no pueden ser correctos a la vez.',
    archivoOrigen: 'Ejercicios de Asignación.docx',
    gravedad: 'alta',
    opciones: [
      {
        id: 'matriz',
        descripcion: 'Usar la matriz 4 × 4 y corregir el enunciado a «4 camiones y 4 rutas»',
        efecto:
          'Se conservan los dieciséis valores de consumo de combustible tal como están en la tabla. El ejercicio queda como ' +
          'una asignación cuadrada de 4 × 4. Es la opción que respeta más datos originales.',
      },
      {
        id: 'enunciado',
        descripcion: 'Respetar el enunciado: recortar a los primeros 3 camiones y las primeras 3 rutas',
        efecto:
          'Se descartan el camión D y la ruta 4. El ejercicio queda como una asignación 3 × 3. Se pierden siete valores ' +
          'de la tabla original.',
      },
    ],
    decision: 'matriz',
    decididoEn: '2026-08-31T00:00:00.000Z',
  },
  {
    id: 'I-02',
    ejercicioId: 'prod-01',
    titulo: 'La suma de insumos es L 30 800 pero el enunciado declara L 25 000',
    descripcion:
      'En el ejercicio 1 de productividad (Finca avícola El Progreso) los componentes suman: mano de obra 150 h × L 80 = ' +
      'L 12 000; energía 300 kWh × L 6 = L 1 800; alimento 1 200 kg × L 10 = L 12 000; costos fijos L 5 000. Total: L 30 800. ' +
      'El enunciado, sin embargo, afirma que «el costo total operativo fue de L 25 000». La diferencia es de L 5 800 y ' +
      'cambia todas las razones de productividad.',
    archivoOrigen: 'Ejercicios de productividad.docx',
    gravedad: 'alta',
    opciones: [
      {
        id: 'suma',
        descripcion: 'Usar L 30 800, la suma de los componentes detallados',
        efecto:
          'La productividad total pasa a ser 49 000 / 30 800 = 1,591. Es internamente consistente: el costo total coincide ' +
          'con la suma de los insumos que se están midiendo.',
      },
      {
        id: 'declarado',
        descripcion: 'Usar L 25 000, el costo total que declara el enunciado',
        efecto:
          'La productividad total pasa a ser 49 000 / 25 000 = 1,960. Los componentes detallados dejan de sumar el total, ' +
          'así que las participaciones porcentuales no cerrarán en 100 %.',
      },
    ],
    decision: 'suma',
    decididoEn: '2026-08-31T00:00:00.000Z',
  },
  {
    id: 'I-03',
    ejercicioId: 'dist-02',
    titulo: 'La distribución rotulada «Óptima» tiene mayor puntaje carga-distancia',
    descripcion:
      'La diapositiva 6 rotula como «Óptima» una distribución de almacén con puntaje carga-distancia de 6 730, mientras ' +
      'que la diapositiva 5 muestra otra con 6 650. En un problema de minimización, el menor puntaje es el mejor.\n\n' +
      '**Con la exportación de 2026 los dos planos ya están reconstruidos y verificados**, así que el caso dejó de ser ' +
      'una duda de lectura. Las tablas de las dos diapositivas dan la carga y la distancia de cada uno de los catorce ' +
      'bloques; hay exactamente dos bloques en cada profundidad de 1 a 7, y las dos distribuciones difieren únicamente ' +
      'en que los tostadores eléctricos pasan de la profundidad 1 a la 2 y un bloque de televisores hace el camino ' +
      'inverso. Reconstruidos así, los planos reproducen los totales impresos: 6 650 y 6 730.\n\n' +
      'Y 6 650 no solo es el menor de los dos: es el mínimo verdadero. Con dos bloques disponibles en cada ' +
      'profundidad, ordenar los bloques de mayor a menor carga y darles las profundidades más cortas es óptimo, y eso ' +
      'da exactamente 6 650. La diapositiva 6 aleja de la plataforma los 280 recorridos de los tostadores para acercar ' +
      'los 200 de un bloque de televisores, que es justo al revés de lo que conviene.',
    archivoOrigen: 'Distribución 2026.pdf',
    gravedad: 'media',
    opciones: [
      {
        id: 'menor',
        descripcion: 'Tratar 6 650 como la distribución óptima y el rótulo de la diapositiva 6 como un error de edición',
        efecto:
          'Se aplica el criterio de minimización de forma consistente. El ejercicio conserva las dos distribuciones y ' +
          'pide al estudiante decidir cuál conviene, que es donde está el aprendizaje.',
      },
      {
        id: 'rotulo',
        descripcion: 'Conservar el rótulo de la diapositiva y presentar 6 730 como la distribución óptima',
        efecto:
          'La aplicación mostraría como óptima una distribución peor que la alternativa que ella misma calcula. ' +
          'Contradice el criterio de minimización que enseña el módulo.',
      },
    ],
    decision: 'menor',
    decididoEn: '2026-08-31T00:00:00.000Z',
  },
  {
    id: 'I-04',
    ejercicioId: 'dist-01',
    titulo: 'Orden ambiguo de las columnas «Actual» y «Propuesta» en el taller',
    descripcion:
      'La diapositiva del taller presenta dos columnas de carga-distancia con totales 785 y 420, pero el orden en que se ' +
      'leen no era inequívoco al extraer el texto de la versión de 2025.\n\n' +
      '**Resuelta con la exportación de 2026, que la responde sola.** La diapositiva imprime la fórmula del porcentaje ' +
      'de mejora, `ME = (1 − 420/785) × 100 = 46,49 %`: es 785 lo que se toma como punto de partida y 420 la mejora, ' +
      'así que la distribución actual cuesta 785 y la propuesta 420.\n\n' +
      'Los planos de bloques también quedaron reconstruidos. Las columnas de distancias de la diapositiva determinan ' +
      'sin ambigüedad los dos acomodos de la retícula 3×2 —el motor los puntúa en 785 y 420, los mismos totales ' +
      'impresos— y hay una comprobación independiente que los confirma: el plano de 420 cumple las dos relaciones A de ' +
      'la gráfica REL (inspección junto al taladro y junto a embarques) que el de 785 incumple, sin acercar la ' +
      'inspección a los tornos, que es la relación N. Es exactamente el argumento de Distribución Física III.',
    archivoOrigen: 'Distribución 2026.pdf',
    gravedad: 'baja',
    opciones: [
      {
        id: 'actual785',
        descripcion: 'Actual = 785 y propuesta = 420 (mejora de 46,5 %)',
        efecto:
          'Es lo que dice la fórmula impresa en la diapositiva y lo que confirma la gráfica REL. Opción vigente.',
      },
      {
        id: 'actual420',
        descripcion: 'Actual = 420 y propuesta = 785 (deterioro de 86,9 %)',
        efecto:
          'El ejercicio ilustraría una propuesta que empeora la situación, y contradiría tanto la fórmula de mejora ' +
          'impresa como el sentido de la gráfica REL.',
      },
    ],
    decision: 'actual785',
    decididoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'I-05',
    ejercicioId: null,
    titulo: 'Cuatro problemas de asignación son de maximización',
    descripcion:
      'Los problemas 4, 5, 9 y 10 de asignación piden maximizar (eficiencia, afinidad, productividad y rendimiento), ' +
      'mientras que el método húngaro está formulado para minimizar. No es un error del material: es una situación que el ' +
      'método resuelve convirtiendo la matriz de beneficios en una matriz de oportunidad perdida.',
    archivoOrigen: 'Ejercicios de Asignación.docx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'convertir',
        descripcion: 'Resolver por conversión a oportunidad perdida y mostrar el paso explícitamente',
        efecto: 'El estudiante ve la conversión como un paso del método. Es el tratamiento estándar en la literatura.',
      },
      {
        id: 'nota',
        descripcion: 'Resolver igual, pero además marcar estos ejercicios con una nota metodológica visible',
        efecto: 'Se agrega una advertencia en el enunciado del ejercicio recordando que el método minimiza por diseño.',
      },
    ],
    decision: 'convertir',
    decididoEn: null,
  },
  {
    id: 'I-06',
    ejercicioId: null,
    titulo: 'Los once problemas de transporte están balanceados',
    descripcion:
      'En los once problemas del documento de transporte la oferta total coincide exactamente con la demanda total. ' +
      'El programa del curso exige practicar también casos no balanceados, con origen o destino ficticio.',
    archivoOrigen: 'Ejercicios de Transporte.docx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'generador',
        descripcion: 'Conservar los originales intactos y cubrir los casos no balanceados con el generador',
        efecto:
          'Los ejercicios del documento quedan tal cual. El generador produce variantes desbalanceadas bajo demanda, ' +
          'con la misma estructura y contexto.',
      },
      {
        id: 'variantes',
        descripcion: 'Agregar además variantes desbalanceadas fijas de los problemas 1 y 5',
        efecto: 'Se crean dos ejercicios adicionales marcados como «derivado», dejando los originales sin tocar.',
      },
    ],
    decision: 'generador',
    decididoEn: '2026-08-31T00:00:00.000Z',
  },
  {
    id: 'I-07',
    ejercicioId: null,
    titulo: 'No hay ejercicios legibles de punto de equilibrio en los materiales',
    descripcion:
      'Las dos presentaciones sobre punto de equilibrio estaban en formato PowerPoint 97 binario comprimido y no fue posible ' +
      'extraer su texto de forma automática, así que los ejercicios del módulo se construyeron como derivados.\n\n' +
      '**Resuelto en agosto de 2026.** El docente exportó `Punto de Equilibrio.pptx`, y los diez problemas de las ' +
      'diapositivas 4 a 13 quedaron transcritos literalmente y marcados como `textual`. Los ejercicios derivados que ' +
      'servían de sustituto se retiraron: ya no hacen falta.',
    archivoOrigen: 'Punto de Equilibrio.pptx',
    gravedad: 'media',
    opciones: [
      {
        id: 'derivados',
        descripcion: 'Usar ejercicios derivados de los mismos contextos productivos ya verificados',
        efecto:
          'Los ejercicios del módulo se construyen con los precios y contextos que ya aparecen en los ejercicios de ' +
          'productividad, y se marcan con origen «derivado» para no presentarlos como transcripción del material.',
      },
      {
        id: 'transcritos',
        descripcion: 'Transcribir los diez problemas originales del .pptx exportado',
        efecto:
          'La biblioteca del módulo pasa a ser el material real del curso, marcado como «textual» y con la diapositiva de ' +
          'origen en la atribución de cada ejercicio. Es la opción vigente desde agosto de 2026.',
      },
      {
        id: 'esperar',
        descripcion: 'Dejar el módulo sin biblioteca hasta que el docente aporte los ejercicios originales',
        efecto:
          'El laboratorio de punto de equilibrio seguiría funcionando con datos que el usuario escriba, pero la biblioteca ' +
          'del tema quedaría vacía.',
      },
    ],
    decision: 'transcritos',
    decididoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'I-08',
    ejercicioId: 'pert-02',
    titulo: 'La red PERT del yogurt es totalmente secuencial',
    descripcion:
      'El problema 2 de PERT (producción artesanal de yogurt) pide «determinar la ruta crítica probabilística», pero la red ' +
      'es una cadena lineal A→B→C→D→E→F sin rutas alternativas. Toda la red es crítica por construcción, así que la ' +
      'pregunta no tiene el contenido que aparenta.',
    archivoOrigen: 'Ejercicios de Pert.docx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'nota',
        descripcion: 'Conservar el ejercicio y agregar una nota didáctica explicando por qué toda la red es crítica',
        efecto:
          'El ejercicio sigue siendo útil para practicar tiempos esperados, varianzas y probabilidades. La nota convierte ' +
          'la limitación en una enseñanza.',
      },
      {
        id: 'ampliar',
        descripcion: 'Crear una variante derivada con una actividad paralela',
        efecto:
          'Se agrega un ejercicio nuevo marcado como «derivado» en el que la inoculación y el lavado de envases corren en ' +
          'paralelo, de modo que sí exista competencia entre rutas.',
      },
    ],
    decision: 'nota',
    decididoEn: null,
  },
  {
    id: 'I-09',
    ejercicioId: null,
    titulo: 'Datos personales de estudiantes en los archivos de programación',
    descripcion:
      'La hoja «Calificaciones» de `Programacion de ciclo Investigación de Operaciones 2025.xlsx` contiene nombres ' +
      'completos y notas de doce estudiantes. Los archivos `INVESTIGACIÓN DE OPERACIONES calificaciones.xlsx`, `io 2014.xls` ' +
      'y los `.sav` contienen registros equivalentes.',
    archivoOrigen: 'Programacion de ciclo Investigación de Operaciones 2025.xlsx',
    gravedad: 'alta',
    opciones: [
      {
        id: 'excluir',
        descripcion: 'Excluir por completo esos datos de la aplicación',
        efecto:
          'Ningún nombre ni nota real entra a la biblioteca, al almacenamiento local ni a los reportes. Solo se usó la hoja ' +
          '«Programacion», que contiene la secuencia de temas del ciclo y no identifica a nadie.',
      },
      {
        id: 'importar',
        descripcion: 'Importarlos al registro de calificaciones del modo docente',
        efecto:
          'Los datos quedarían en el almacenamiento local del navegador. Requiere que el docente asuma la responsabilidad ' +
          'del tratamiento de datos personales de sus estudiantes.',
      },
    ],
    decision: 'excluir',
    decididoEn: null,
  },
  {
    id: 'I-10',
    ejercicioId: null,
    titulo: 'El método gráfico aparecía en la programación pero no entre los módulos',
    descripcion:
      'La hoja «Programacion» del ciclo 2025 incluye una semana dedicada al método gráfico de programación lineal ' +
      '(29 de julio), entre PERT y el modelo de transporte. Ese tema no estaba entre los nueve módulos solicitados ' +
      'inicialmente. Se incorporó como módulo 8, con los tres problemas de `metodo grafico.pptx` transcritos y tres ' +
      'casos derivados que cubren la minimización de costos, la infactibilidad y las soluciones múltiples. ' +
      'La numeración de los módulos se ajustó a la secuencia real del ciclo: asignación pasó a 9 y transporte a 10.',
    archivoOrigen: 'Programacion de ciclo Investigación de Operaciones 2025.xlsx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'ahora',
        descripcion: 'Incluirlo como módulo 8, en la posición que ocupa en el ciclo',
        efecto:
          'La aplicación cubre los diez temas del programa. El método gráfico queda antes del modelo de transporte, ' +
          'que es un caso particular de programación lineal, de modo que la secuencia didáctica se sostiene.',
      },
      {
        id: 'futuro',
        descripcion: 'Dejarlo fuera y documentarlo como pendiente',
        efecto: 'La aplicación se limitaría a los nueve módulos del alcance original y el tema quedaría sin cubrir.',
      },
    ],
    decision: 'ahora',
    decididoEn: null,
  },
  {
    id: 'I-11',
    ejercicioId: null,
    titulo: 'El método simplex no figura en ningún material del curso',
    descripcion:
      'El método simplex se incorporó como módulo 9 a petición del docente. A diferencia del método gráfico, que sí ' +
      'aparecía en la hoja «Programacion» del ciclo, el simplex no está en ninguno de los archivos revisados: ni en las ' +
      'presentaciones, ni en los documentos de ejercicios, ni en la programación del ciclo. Por lo tanto **no existe un ' +
      'solo ejercicio original que transcribir**, y los ocho del módulo están marcados como derivados, sin fuente ' +
      'documental. La bibliografía citada es la misma del curso —Chase, Heizer, Russell y Stevenson—, que sí cubre ' +
      'programación lineal; no se agregó ninguna fuente nueva. La numeración de los módulos siguientes se ajustó: ' +
      'asignación pasó a 10 y transporte a 11.',
    archivoOrigen: null,
    gravedad: 'media',
    opciones: [
      {
        id: 'derivados',
        descripcion: 'Incluir el módulo con ejercicios derivados, marcados como tales',
        efecto:
          'El tema queda cubierto y ningún ejercicio se presenta como si viniera de los materiales. El docente puede ' +
          'sustituirlos por los suyos cuando los tenga, y entonces cambiarán de origen «derivado» a «textual».',
      },
      {
        id: 'esperar',
        descripcion: 'Dejar el módulo fuera hasta que existan materiales propios del curso',
        efecto:
          'La aplicación se limitaría a los temas con respaldo documental. El simplex quedaría sin cubrir, y con él la ' +
          'programación lineal de más de dos variables, que es la que se usa en formulación de raciones.',
      },
    ],
    decision: 'derivados',
    decididoEn: null,
  },
  {
    id: 'I-12',
    ejercicioId: 'equi-02',
    titulo: 'Se pregunta cuántas gallinas explotar sin dar la postura por ave',
    descripcion:
      'Las diapositivas 5 y 6 de `Punto de Equilibrio.pptx` terminan preguntando «¿cuántas gallinas debo explotar para ' +
      'estar en punto de equilibrio?». El punto de equilibrio en **huevos** sale directo de los datos, pero convertirlo a ' +
      'gallinas exige la postura anual por ave, y ese dato no aparece en ninguna de las dos diapositivas.\n\n' +
      '**Resuelta: el docente aportó el dato en agosto de 2026.** Una gallina pone entre 300 y 330 huevos al año. La ' +
      'postura es un rango y no un número, así que la respuesta también lo es, y los ejercicios convierten con el ' +
      'extremo de 300 porque es el que exige más aves. Con eso el equilibrio de la granja de ponedoras pide entre ' +
      '1 145 y 1 260 gallinas, la ganancia objetivo entre 3 570 y 3 926, y la granja mixta de la diapositiva 6 entre ' +
      '6 909 y 7 600. El dato no está en el material: viene del docente y así queda citado.',
    archivoOrigen: 'Punto de Equilibrio.pptx',
    gravedad: 'media',
    opciones: [
      {
        id: 'postura',
        descripcion: 'Convertir con la postura de 300 a 330 huevos por ave y año que indicó el docente',
        efecto:
          'La conversión es una división y los ejercicios quedan completos tal como los plantea la diapositiva. El ' +
          'enunciado dice de dónde sale la postura, porque no está en el material. Opción vigente.',
      },
      {
        id: 'sin_conversion',
        descripcion: 'Preguntar solo por los huevos y decir en el enunciado qué dato falta',
        efecto:
          'Era la opción vigente mientras faltaba la postura: se resolvía lo computable y se nombraba lo que no. Deja ' +
          'las preguntas de la diapositiva sin responder.',
      },
    ],
    decision: 'postura',
    decididoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'I-13',
    ejercicioId: 'equi-03',
    titulo: '¿La mezcla «PPM» es participación en el ingreso o en las unidades?',
    descripcion:
      'Las diapositivas 6 y 7 dan la mezcla de ventas como «PPM» —95 % y 5 % en un caso; 50 %, 10 %, 15 %, 20 % y 5 % en ' +
      'el otro— sin decir sobre qué se calcula ese porcentaje. Si es participación en el **ingreso**, se pondera la razón ' +
      'de margen de cada producto; si es participación en las **unidades vendidas**, hay que convertir primero a ingreso, ' +
      'y el punto de equilibrio cambia de forma apreciable.\n\n' +
      '**Resuelta con la clave de respuestas del docente.** El archivo ' +
      '`Ejercicio_punto_de_equilibrio_granja_avicola.pdf` resuelve la diapositiva 7 ponderando el **margen unitario** ' +
      'por la mezcla —L 9,05 por unidad promedio— y repartiendo las 55 248,62 unidades con esos mismos porcentajes: ' +
      'PPM son unidades. La diapositiva 6 lo confirma por otro lado, porque solo con esa lectura da cifras redondas ' +
      '(margen ponderado de L 0,70 y equilibrio en 2 400 000 unidades exactas).',
    archivoOrigen: 'Punto de Equilibrio.pptx',
    gravedad: 'media',
    opciones: [
      {
        id: 'unidades',
        descripcion: 'Interpretar PPM como proporción de unidades vendidas',
        efecto:
          'Se pondera el margen de contribución unitario por la mezcla y el equilibrio sale en unidades combinadas, que ' +
          'después se reparten con los mismos porcentajes. Es lo que hace la clave de respuestas del docente. Opción vigente.',
      },
      {
        id: 'ingreso',
        descripcion: 'Interpretar PPM como participación en el ingreso total',
        efecto:
          'Se pondera la razón de margen de cada producto y el equilibrio sale en dinero. Es el método que traen varios ' +
          'libros de texto para mezclas de productos que ni siquiera se miden en la misma unidad, y el laboratorio lo ' +
          'permite elegir, pero no reproduce los resultados del material.',
      },
    ],
    decision: 'unidades',
    decididoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'I-14',
    ejercicioId: null,
    titulo: 'La matriz de recorridos de práctica no dice en qué columnas van sus valores',
    descripcion:
      'La diapositiva 21 de Distribución 2026 propone una matriz de recorridos nueva para el taller, distinta de la del ' +
      'ejemplo resuelto: la fila 1 trae los valores 30 y 80, la 2 trae 20 y 75, la 3 trae 15 y 60 y la 4 trae 85. La ' +
      'matriz es triangular y cada fila tiene varias columnas posibles, así que al exportar a texto se pierde a qué par ' +
      'de departamentos corresponde cada número.\n\n' +
      'En el ejemplo resuelto esto no era problema: sus filas traen 3, 2, 2 y 1 valores y la diapositiva de ' +
      'carga-distancia nombra los pares uno por uno, así que las posiciones quedan determinadas. Aquí no hay ninguna ' +
      'diapositiva de solución que sirva de contraste, y la fila 1 tiene dos valores para cinco columnas posibles.\n\n' +
      '**Por eso este problema no se convirtió en ejercicio.** Colocar los números a ojo daría una matriz inventada, y ' +
      'la matriz es todo el enunciado. Basta con que el docente indique las posiciones para incorporarlo.',
    archivoOrigen: 'Distribución 2026.pdf',
    gravedad: 'baja',
    opciones: [
      {
        id: 'omitir',
        descripcion: 'Dejar el problema fuera de la biblioteca hasta conocer las posiciones',
        efecto:
          'La biblioteca no gana un ejercicio, pero tampoco incorpora una matriz adivinada. Opción vigente.',
      },
      {
        id: 'suponer',
        descripcion: 'Suponer que los pares son los mismos del ejemplo resuelto',
        efecto:
          'La fila 1 del ejemplo tiene tres valores y la nueva solo dos, así que la suposición no cierra: habría que ' +
          'decidir además cuál de los tres pares desaparece. El ejercicio quedaría marcado como derivado.',
      },
    ],
    decision: 'omitir',
    decididoEn: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'I-15',
    ejercicioId: null,
    titulo: 'La compresión del proyecto no figura en ningún material del curso',
    descripcion:
      'La compresión de proyectos —el *crashing*— se incorporó al módulo 6 a petición del docente. Ninguno de los ' +
      'archivos revisados la menciona: ni `Diagrama de redes y ruta critica.docx`, ni las presentaciones de ' +
      'planeación de proyectos, ni la programación del ciclo. **No hay un solo ejercicio original que transcribir**, ' +
      'así que los del tema están marcados como derivados y sin fuente documental.\n\n' +
      'La bibliografía citada es la misma del curso —Chase, Heizer, Russell y Stevenson—, que sí cubre el método de ' +
      'las pendientes de costo; no se agregó ninguna fuente nueva. Es la misma situación del método simplex (I-11).\n\n' +
      'A diferencia del simplex, aquí no hizo falta un módulo nuevo: los datos de compresión son campos opcionales de ' +
      'las actividades, así que los cinco ejercicios de ruta crítica del material siguen intactos y sin ellos.',
    archivoOrigen: null,
    gravedad: 'media',
    opciones: [
      {
        id: 'derivados',
        descripcion: 'Incluir el tema con ejercicios derivados, marcados como tales',
        efecto:
          'La compresión queda cubierta y ningún ejercicio se presenta como si viniera de los materiales. El docente ' +
          'puede sustituirlos por los suyos cuando los tenga, y entonces cambiarán de origen «derivado» a «textual».',
      },
      {
        id: 'esperar',
        descripcion: 'Dejar el tema fuera hasta que existan materiales propios del curso',
        efecto:
          'La aplicación se limitaría a los temas con respaldo documental. Quedaría sin responder la pregunta que ' +
          'sigue naturalmente a la ruta crítica: cuánto cuesta terminar antes.',
      },
    ],
    decision: 'derivados',
    decididoEn: null,
  },
  {
    id: 'I-16',
    ejercicioId: 'inv-01',
    titulo: 'La presentación de inventarios no dice cuántos días tiene el año',
    descripcion:
      'El ejercicio de la diapositiva 14 de `Manejo de inventario.pptx` pide los días de abastecimiento entre órdenes y el ' +
      'punto de reorden con un tiempo de entrega de tres días, pero la presentación no dice con cuántos días del año ' +
      'se convierte la demanda anual a diaria. Con 360 y con 365 los resultados difieren.\n\n' +
      '**Decidido: 360 días.** No es una preferencia: es la única lectura con la que las respuestas del ejercicio salen ' +
      'redondas. Con 360 se ordena cada 6 días exactos y el punto de reorden es de 75 unidades; con 365 dan 6,08 días ' +
      'y 73,97 unidades. Un ejercicio de clase construido para dar 150, 60 y 300 difícilmente termina en 73,97.\n\n' +
      'El dato es editable en cada ejercicio, así que el docente puede cambiarlo a 365 si es lo que enseña.',
    archivoOrigen: 'Manejo de inventario.pptx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'dias360',
        descripcion: 'Convertir con un año comercial de 360 días',
        efecto:
          'Las seis respuestas del ejercicio de la diapositiva 14 salen en números redondos, incluido el punto de ' +
          'reorden en 75 unidades. Opción vigente.',
      },
      {
        id: 'dias365',
        descripcion: 'Convertir con el año calendario de 365 días',
        efecto:
          'Es más exacto en el calendario real, pero el intervalo pasa a 6,08 días y el punto de reorden a 73,97 ' +
          'unidades. El ejercicio pierde la redondez que sugiere cómo fue construido.',
      },
    ],
    decision: 'dias360',
    decididoEn: '2026-08-29T00:00:00.000Z',
  },
  {
    id: 'I-17',
    ejercicioId: null,
    titulo: 'Las líneas de espera no figuran en ningún material del curso',
    descripcion:
      'El módulo de líneas de espera se incorporó a petición del docente. A diferencia de inventarios, que sí tiene su ' +
      'presentación —`Manejo de inventario.pptx`—, aquí no hay ningún archivo: ni presentación, ni documento de ' +
      'ejercicios, ni mención en la programación del ciclo. **No hay un solo ejercicio original que transcribir**, así ' +
      'que los cuatro del módulo están marcados como derivados y sin fuente documental.\n\n' +
      'La bibliografía citada es la misma del curso —Chase, Heizer, Russell y Stevenson—, que sí cubre los modelos ' +
      'M/M/1 y M/M/s; no se agregó ninguna fuente nueva. Es la misma situación del método simplex (I-11) y de la ' +
      'compresión de proyectos (I-15).',
    archivoOrigen: null,
    gravedad: 'media',
    opciones: [
      {
        id: 'derivados',
        descripcion: 'Incluir el módulo con ejercicios derivados, marcados como tales',
        efecto:
          'El tema queda cubierto y ningún ejercicio se presenta como si viniera de los materiales. El docente puede ' +
          'sustituirlos por los suyos cuando los tenga.',
      },
      {
        id: 'esperar',
        descripcion: 'Dejar el módulo fuera hasta que existan materiales propios del curso',
        efecto:
          'La aplicación se limitaría a los temas con respaldo documental. Quedaría sin cubrir la única familia de ' +
          'modelos del programa donde la variabilidad, y no el promedio, es la que manda.',
      },
    ],
    decision: 'derivados',
    decididoEn: null,
  },
  {
    id: 'I-18',
    ejercicioId: null,
    titulo: 'Las fórmulas de la presentación de inventarios están como imágenes',
    descripcion:
      'De `Manejo de inventario.pptx` se pudo extraer todo el texto —los supuestos, la notación completa (D, Q, Co, ' +
      'Ch, L, R, DEO, CAI), los tres casos especiales y el ejercicio de la diapositiva 14—, pero **las fórmulas están ' +
      'insertadas como imágenes** y no se pudieron leer.\n\n' +
      'Las que usa la aplicación son las estándar de la bibliografía del curso, escritas con la misma notación de las ' +
      'diapositivas. No se inventó ninguna ni se agregó ninguna fuente nueva. La comprobación de que coinciden con las ' +
      'de la presentación es indirecta pero fuerte: reproducen exactamente las seis respuestas del ejercicio de la ' +
      'diapositiva 14, incluidas las redondas.',
    archivoOrigen: 'Manejo de inventario.pptx',
    gravedad: 'baja',
    opciones: [
      {
        id: 'estandar',
        descripcion: 'Usar las fórmulas estándar de la bibliografía citada, con la notación de la presentación',
        efecto:
          'Reproducen las respuestas del ejercicio del material. Es lo vigente. Si el docente exporta las diapositivas ' +
          'a un formato con las fórmulas legibles, se pueden cotejar una por una.',
      },
      {
        id: 'esperar',
        descripcion: 'Dejar el módulo sin resolver hasta poder leer las fórmulas originales',
        efecto:
          'El módulo quedaría sin motor pese a que el ejercicio del material sí es transcribible y sus respuestas ' +
          'coinciden con lo calculado.',
      },
    ],
    decision: 'estandar',
    decididoEn: '2026-08-29T00:00:00.000Z',
  },
];
