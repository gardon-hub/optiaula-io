/**
 * Contenido pedagógico de los trece módulos.
 *
 * Cada módulo trae lo que el modelo pedagógico exige: resultado de aprendizaje,
 * activación de conocimientos previos, explicación conceptual, glosario,
 * fórmulas con el significado de cada variable, errores frecuentes,
 * interpretación gerencial, aplicación agropecuaria, resumen y fuentes.
 *
 * El ejemplo resuelto, el simulador, la práctica y la evaluación los aporta la
 * biblioteca de ejercicios y el laboratorio del tema.
 */

import type { Tema } from '@/esquemas';

export interface TerminoGlosario {
  readonly termino: string;
  readonly definicion: string;
}

export interface FormulaModulo {
  readonly nombre: string;
  readonly tex: string;
  readonly variables: readonly { readonly simbolo: string; readonly significado: string }[];
  readonly cuandoUsarla: string;
}

export interface ErrorFrecuente {
  readonly error: string;
  readonly porQueOcurre: string;
  readonly comoEvitarlo: string;
}

export interface ContenidoModulo {
  readonly tema: Tema;
  readonly resultadoAprendizaje: string;
  readonly conocimientosPrevios: readonly string[];
  readonly explicacion: string;
  readonly glosario: readonly TerminoGlosario[];
  readonly formulas: readonly FormulaModulo[];
  readonly erroresFrecuentes: readonly ErrorFrecuente[];
  readonly interpretacionGerencial: string;
  readonly aplicacionAgropecuaria: string;
  readonly resumen: string;
  readonly fuenteIds: readonly string[];
  /** Identificador del ejercicio que sirve de ejemplo resuelto del módulo. */
  readonly ejemploResueltoId: string;
  readonly practicaGuiadaId: string;
}

export const CONTENIDO_MODULOS: Record<Tema, ContenidoModulo> = {
  fundamentos: {
    tema: 'fundamentos',
    resultadoAprendizaje:
      'El estudiante aplica el enfoque de sistemas a una organización real, identifica sus componentes, diferencia la naturaleza de la organización y valora el papel del gerente de operaciones en decisiones estratégicas, tácticas y operativas.',
    conocimientosPrevios: [
      '¿Qué distingue a una organización de un grupo de personas trabajando juntas?',
      'Piense en una empresa de su comunidad: ¿qué entra, qué sale y qué pasa en medio?',
      '¿Puede almacenar el producto de una barbería? ¿Y el de una panadería? ¿Qué implica esa diferencia?',
    ],
    explicacion:
      'Una organización es un sistema de personas que persigue un objetivo común, y tiene tres elementos básicos: metas definidas, estructura deliberada y personas (Robbins y Coulter, 2022). ' +
      'El enfoque de sistemas mira ese conjunto como una máquina de transformación: entran insumos, ocurre un proceso, salen bienes o servicios, y la retroalimentación permite corregir el rumbo. ' +
      'Alrededor de todo eso está el ambiente externo, que condiciona pero no obedece.\n\n' +
      'El gerente de operaciones es quien planifica, dirige y coordina esa transformación, desde la compra de insumos hasta la entrega. ' +
      'Sus decisiones se ordenan en tres niveles según el horizonte y la reversibilidad: estratégicas (localizar una planta), tácticas (programar la producción del mes) y operativas (asignar los recursos del día). ' +
      'Distinguirlas importa porque cada nivel exige un tipo distinto de información y de análisis.\n\n' +
      'Manufactura y servicios son dos mundos distintos dentro de la misma disciplina: la manufactura produce bienes tangibles que se pueden inventariar y cuya calidad se mide objetivamente; ' +
      'los servicios producen resultados intangibles, con contacto directo con el cliente, mayor variabilidad y dificultad para medir el resultado.',
    glosario: [
      { termino: 'Sistema', definicion: 'Conjunto de elementos interrelacionados que transforman entradas en salidas para alcanzar un objetivo.' },
      { termino: 'Entrada', definicion: 'Recurso que ingresa al sistema: materiales, personas, capital, energía, información.' },
      { termino: 'Proceso', definicion: 'Secuencia de actividades que transforma las entradas en salidas.' },
      { termino: 'Salida', definicion: 'Bien o servicio que el sistema entrega, incluidos los subproductos.' },
      { termino: 'Retroalimentación', definicion: 'Información sobre el desempeño que vuelve al sistema para ajustarlo. Es información, no materia.' },
      { termino: 'Ambiente externo', definicion: 'Lo que influye sobre el sistema sin formar parte de él: clientes, competencia, normativa, clima, precios internacionales.' },
      { termino: 'Decisión estratégica', definicion: 'Compromete recursos por años y es costosa de revertir. Ejemplo: dónde ubicar una planta.' },
      { termino: 'Decisión táctica', definicion: 'Horizonte de meses. Ejemplo: cuánto producir cada mes y con cuántos turnos.' },
      { termino: 'Decisión operativa', definicion: 'Horizonte de días u horas, y corregible. Ejemplo: a quién asignar cada tarea hoy.' },
    ],
    formulas: [],
    erroresFrecuentes: [
      {
        error: 'Clasificar un subproducto como retroalimentación porque «vuelve» al proceso.',
        porQueOcurre: 'La palabra «retroalimentación» sugiere movimiento físico de retorno.',
        comoEvitarlo: 'Pregúntese si lo que vuelve es materia o información. Solo la información es retroalimentación.',
      },
      {
        error: 'Poner al cliente como entrada en una empresa de manufactura.',
        porQueOcurre: 'En servicios el cliente sí participa del proceso, y se generaliza.',
        comoEvitarlo: 'En manufactura el cliente es ambiente externo; en servicios de alto contacto puede ser, además, una entrada real del proceso.',
      },
      {
        error: 'Llamar estratégica a cualquier decisión importante.',
        porQueOcurre: 'Se confunde importancia con horizonte temporal.',
        comoEvitarlo: 'Pregúntese cuánto costaría revertirla. Si se corrige mañana sin costo, es operativa.',
      },
    ],
    interpretacionGerencial:
      'Un diagrama de sistemas bien hecho responde a la pregunta que más importa: sobre qué puede actuar el gerente. Las entradas se negocian, se sustituyen o se racionalizan; ' +
      'los procesos se rediseñan; el ambiente externo solo se anticipa. Un plan de mejora que apunta al ambiente externo está mal dirigido por construcción.',
    aplicacionAgropecuaria:
      'En una cooperativa lechera el sistema es evidente: entra leche cruda de los socios, se pasteuriza y se transforma en queso y cuajada, sale producto empacado y suero como subproducto. ' +
      'La retroalimentación es el registro diario de acidez y los reclamos de las pulperías. El ambiente externo incluye la sequía que reduce el forraje y el precio internacional de la leche en polvo. ' +
      'Ninguno de esos dos últimos se controla, pero ambos se pueden prever.',
    resumen:
      'Toda organización se puede leer como un sistema de entradas, procesos, salidas, retroalimentación y ambiente externo. ' +
      'Esa lectura no es decorativa: define qué se puede cambiar y qué solo se puede anticipar, y ordena las decisiones del gerente en tres niveles según su horizonte y su reversibilidad.',
    fuenteIds: ['doc-fundamentos', 'robbins2022', 'chase2021', 'heizer2020', 'russell2019', 'stevenson2021'],
    ejemploResueltoId: 'fund-01',
    practicaGuiadaId: 'fund-02',
  },

  productividad: {
    tema: 'productividad',
    resultadoAprendizaje:
      'El estudiante calcula e interpreta la productividad parcial, multifactorial y total de un sistema productivo, decide el tratamiento del inventario en proceso y determina cuál insumo limita el desempeño.',
    conocimientosPrevios: [
      'Si una finca produce 1 400 kg con 150 horas de trabajo, ¿cuántos kilogramos rinde cada hora?',
      '¿Se puede sumar «150 horas» con «300 kWh»? ¿Qué habría que hacer primero?',
      '¿Qué significa que una razón valga 1,5? ¿Y que valga 0,8?',
    ],
    explicacion:
      'Productividad es siempre salidas entre entradas: cuánto se obtiene por cada unidad de recurso invertido. La dificultad no está en la división sino en decidir qué va arriba y qué va abajo.\n\n' +
      'La **productividad parcial** divide la producción entre un solo insumo. Tiene dos versiones útiles: la física responde «¿cuántos kilogramos por hora?» y le habla al operario; ' +
      'la económica responde «¿cuánto valor por cada lempira invertido en ese insumo?» y le habla al gerente. La económica es la única comparable entre insumos medidos en unidades distintas.\n\n' +
      'La **productividad multifactorial** toma un subconjunto de insumos, y la **total** los toma todos: divide el valor de toda la producción entre el costo de todos los recursos. ' +
      'Es adimensional —lempiras producidos por lempira invertido— y un valor mayor que 1 significa que el sistema genera más valor del que consume.\n\n' +
      'Antes de dividir hay que resolver una pregunta que el enunciado casi nunca aclara: qué hacer con lo que quedó a medio terminar. ' +
      'Excluirlo es lo más conservador, incluirlo como terminado sobreestima, y ponderarlo por su grado de avance es el criterio contable habitual. ' +
      'La aplicación exige elegir explícitamente porque la elección cambia el resultado.',
    glosario: [
      { termino: 'Productividad parcial', definicion: 'Producción dividida entre un solo insumo.' },
      { termino: 'Productividad multifactorial', definicion: 'Producción dividida entre un conjunto de insumos, valorados en dinero.' },
      { termino: 'Productividad total', definicion: 'Valor de toda la producción dividido entre el costo de todos los insumos.' },
      { termino: 'Producción equivalente', definicion: 'Producción terminada más el inventario en proceso, ajustado según el criterio elegido.' },
      { termino: 'Inventario en proceso', definicion: 'Producto que quedó a medio transformar al cerrar el periodo.' },
      { termino: 'Insumo limitante', definicion: 'El recurso que devuelve menos valor por cada unidad monetaria invertida.' },
      { termino: 'Variación porcentual', definicion: 'Cambio relativo respecto de un periodo base, expresado en porcentaje.' },
    ],
    formulas: [
      {
        nombre: 'Productividad parcial física',
        tex: 'PP_{fisica} = \\frac{P_{eq}}{q_i}',
        variables: [
          { simbolo: 'P_{eq}', significado: 'producción equivalente del periodo, en unidades físicas' },
          { simbolo: 'q_i', significado: 'cantidad física consumida del insumo i (horas, kWh, kilogramos)' },
        ],
        cuandoUsarla: 'Cuando interesa el rendimiento operativo de un recurso concreto y su unidad tiene sentido físico.',
      },
      {
        nombre: 'Productividad parcial económica',
        tex: 'PP_{economica} = \\frac{V}{C_i}',
        variables: [
          { simbolo: 'V', significado: 'valor de la producción: producción equivalente por el precio de venta' },
          { simbolo: 'C_i', significado: 'costo del insumo i: cantidad por costo unitario' },
        ],
        cuandoUsarla: 'Cuando hay que comparar insumos medidos en unidades distintas. Es adimensional.',
      },
      {
        nombre: 'Productividad total',
        tex: 'PT = \\frac{V}{\\sum_{i} C_i}',
        variables: [
          { simbolo: 'V', significado: 'valor de la producción del periodo' },
          { simbolo: '\\sum C_i', significado: 'costo total de todos los insumos considerados' },
        ],
        cuandoUsarla: 'Para evaluar el sistema completo. Mayor que 1 significa que genera más valor del que consume.',
      },
      {
        nombre: 'Variación porcentual entre periodos',
        tex: '\\Delta\\% = \\frac{PT_{actual} - PT_{anterior}}{|PT_{anterior}|} \\times 100',
        variables: [
          { simbolo: 'PT_{actual}', significado: 'productividad del periodo que se evalúa' },
          { simbolo: 'PT_{anterior}', significado: 'productividad del periodo base' },
        ],
        cuandoUsarla: 'Para medir si el sistema mejoró o empeoró respecto de un periodo de referencia.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Dividir el costo entre la producción.',
        porQueOcurre: 'Es la razón que se usa para calcular costo unitario, y se confunde con productividad.',
        comoEvitarlo: 'La productividad es siempre salidas entre entradas. Si el resultado baja cuando mejora la operación, invirtió la razón.',
      },
      {
        error: 'Sumar horas con kilovatios-hora para obtener un «total de insumos».',
        porQueOcurre: 'Se busca un denominador único sin llevar los insumos a una unidad común.',
        comoEvitarlo: 'Valore todo en dinero antes de sumar. Ese es justamente el papel de la productividad económica.',
      },
      {
        error: 'Incluir el inventario en proceso sin decirlo.',
        porQueOcurre: 'El enunciado menciona el inventario y se asume que hay que sumarlo.',
        comoEvitarlo: 'Declare el criterio elegido junto al resultado. Sin esa declaración, el número no se puede comparar con nada.',
      },
      {
        error: 'Comparar productividades de periodos en monedas distintas.',
        porQueOcurre: 'La razón parece adimensional y da la impresión de que la moneda no importa.',
        comoEvitarlo: 'Convierta primero a una sola moneda. La aplicación bloquea esa comparación por diseño.',
      },
    ],
    interpretacionGerencial:
      'La productividad total dice si el sistema es viable; las parciales dicen dónde actuar. El insumo limitante —el que menos valor devuelve por lempira— es el primer candidato ' +
      'a renegociación de precio, reducción de consumo o sustitución. Y la comparación entre periodos revela algo que el promedio esconde: el total puede mejorar mientras un insumo empeora.',
    aplicacionAgropecuaria:
      'En una engorda de pollos el alimento suele representar entre 60 % y 70 % del costo. Si su productividad parcial económica es la más baja del sistema, ' +
      'ninguna mejora en mano de obra o energía compensará: la conversión alimenticia es la palanca. En un beneficio de café, en cambio, el agua y la energía pesan poco y ' +
      'la mano de obra domina, de modo que la mecanización del despulpado tiene un efecto que en la avicultura sería marginal.',
    resumen:
      'Productividad es salidas entre entradas. La parcial física habla al operario, la parcial económica permite comparar entre insumos y la total evalúa el sistema completo. ' +
      'El tratamiento del inventario en proceso debe declararse siempre, porque cambia el resultado. El insumo limitante señala dónde empezar a mejorar.',
    fuenteIds: ['doc-productividad', 'heizer2020', 'stevenson2021'],
    ejemploResueltoId: 'prod-01',
    practicaGuiadaId: 'prod-03',
  },

  localizacion: {
    tema: 'localizacion',
    resultadoAprendizaje:
      'El estudiante evalúa localizaciones alternativas con el método de puntaje ponderado y el de carga-distancia, calcula el centro de gravedad de la demanda y fundamenta una recomendación combinando criterios cuantitativos y cualitativos.',
    conocimientosPrevios: [
      'Si tuviera que abrir una veterinaria en su municipio, ¿qué tres cosas mirarían antes de firmar el contrato?',
      '¿Cómo se mide la distancia entre dos puntos de una ciudad con calles en cuadrícula? ¿Y en línea recta?',
      '¿Por qué una comunidad con 200 productores debería pesar más que una con 100?',
    ],
    explicacion:
      'Localizar es una decisión estratégica: compromete capital por años y es muy costosa de revertir. Los tres métodos del módulo responden preguntas distintas y se complementan.\n\n' +
      'El **puntaje ponderado** compara sitios por factores que no se miden en la misma unidad —acceso vial, agua, bioseguridad, costo del terreno—. ' +
      'Cada factor recibe una ponderación y cada sitio una calificación; el puntaje es la suma de los productos. Su fuerza es que admite lo cualitativo; su debilidad es que las ponderaciones son juicios, no datos.\n\n' +
      'El **método carga-distancia** compara sitios por el esfuerzo logístico que impondrían: multiplica la carga de cada punto de demanda por su distancia al sitio y suma. Menor es mejor. ' +
      'La métrica de distancia importa: la rectilínea supone desplazamiento por una retícula de calles y la euclidiana supone línea recta.\n\n' +
      'El **centro de gravedad** no compara: propone. Calcula el promedio ponderado de las coordenadas de la demanda y devuelve un punto. ' +
      'No es la mejor localización —minimiza distancias al cuadrado, no distancias— pero es la vara de medir contra la cual evaluar cualquier terreno realmente disponible.',
    glosario: [
      { termino: 'Puntaje ponderado', definicion: 'Suma de las calificaciones de un sitio multiplicadas por la ponderación de cada factor.' },
      { termino: 'Carga', definicion: 'Lo que se mueve entre un punto y la instalación: población, toneladas, viajes, demanda.' },
      { termino: 'Distancia rectilínea', definicion: 'Suma de los desplazamientos horizontal y vertical. También llamada distancia de Manhattan.' },
      { termino: 'Distancia euclidiana', definicion: 'Distancia en línea recta entre dos puntos.' },
      { termino: 'Centro de gravedad', definicion: 'Punto de equilibrio geográfico de la demanda, ponderado por la carga de cada punto.' },
      { termino: 'Análisis de sensibilidad', definicion: 'Estudio de cómo cambia la decisión al variar una ponderación o un dato.' },
    ],
    formulas: [
      {
        nombre: 'Puntaje ponderado',
        tex: 'PP = \\sum_{i=1}^{n} w_i \\, c_i',
        variables: [
          { simbolo: 'w_i', significado: 'ponderación del factor i, normalmente en base 100' },
          { simbolo: 'c_i', significado: 'calificación del sitio en el factor i, en la escala definida' },
        ],
        cuandoUsarla: 'Cuando los criterios de decisión son heterogéneos y algunos no se pueden medir en dinero ni en distancia.',
      },
      {
        nombre: 'Distancia rectilínea',
        tex: 'd = |x_1 - x_2| + |y_1 - y_2|',
        variables: [
          { simbolo: 'x, y', significado: 'coordenadas de los dos puntos en la cuadrícula del mapa' },
        ],
        cuandoUsarla: 'En ciudades con retícula vial o en plantas con pasillos ortogonales.',
      },
      {
        nombre: 'Distancia euclidiana',
        tex: 'd = \\sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}',
        variables: [{ simbolo: 'x, y', significado: 'coordenadas de los dos puntos' }],
        cuandoUsarla: 'En transporte aéreo, tuberías o zonas rurales sin retícula vial.',
      },
      {
        nombre: 'Puntaje carga-distancia',
        tex: 'cd = \\sum_{i} l_i \\, d_i',
        variables: [
          { simbolo: 'l_i', significado: 'carga del punto i' },
          { simbolo: 'd_i', significado: 'distancia del punto i a la localización evaluada' },
        ],
        cuandoUsarla: 'Para comparar sitios por el esfuerzo logístico total que generarían. Menor es mejor.',
      },
      {
        nombre: 'Centro de gravedad',
        tex: 'x^* = \\frac{\\sum l_i x_i}{\\sum l_i} \\qquad y^* = \\frac{\\sum l_i y_i}{\\sum l_i}',
        variables: [
          { simbolo: 'l_i', significado: 'carga del punto i' },
          { simbolo: 'x_i, y_i', significado: 'coordenadas del punto i' },
        ],
        cuandoUsarla: 'Como punto de partida antes de evaluar terrenos concretos.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Calcular el centro de gravedad como promedio simple de las coordenadas.',
        porQueOcurre: 'Se olvida la ponderación por la carga.',
        comoEvitarlo: 'Si todos los puntos tuvieran la misma carga, ambos resultados coincidirían. Si no, hay que ponderar.',
      },
      {
        error: 'Usar distancia euclidiana donde el problema pide rectilínea.',
        porQueOcurre: 'La euclidiana es la distancia «natural» y se aplica por costumbre.',
        comoEvitarlo: 'Lea el enunciado: si menciona calles, cuadrícula o pasillos, la métrica es rectilínea.',
      },
      {
        error: 'Decidir solo con carga-distancia.',
        porQueOcurre: 'El método da un número único y parece concluyente.',
        comoEvitarlo: 'Carga-distancia solo mira proximidad. No sabe nada del precio del terreno, el agua ni la bioseguridad.',
      },
      {
        error: 'No revisar qué tan estrecha es la diferencia entre el primero y el segundo.',
        porQueOcurre: 'Se lee el ranking sin mirar el margen.',
        comoEvitarlo: 'Si el margen es pequeño, haga análisis de sensibilidad: un cambio menor en una ponderación puede invertir la decisión.',
      },
    ],
    interpretacionGerencial:
      'Los tres métodos suelen recomendar sitios distintos, y ahí empieza el trabajo gerencial de verdad: decidir qué criterio manda. ' +
      'El costo logístico se paga todos los días; una falla sanitaria se paga una vez, pero puede cerrar la empresa. ' +
      'Una recomendación bien fundamentada declara qué método se privilegió y por qué.',
    aplicacionAgropecuaria:
      'Para un centro de acopio de leche, la proximidad a los productores es crítica porque la leche cruda se deteriora en horas: ahí carga-distancia manda. ' +
      'Para un rastro, en cambio, el manejo ambiental y la disponibilidad de agua pesan más que unos kilómetros de diferencia, porque una clausura sanitaria cuesta más que el flete de todo un año.',
    resumen:
      'El puntaje ponderado admite criterios cualitativos, carga-distancia mide el esfuerzo logístico y el centro de gravedad propone un punto de partida. ' +
      'Ninguno decide solo: la recomendación se construye combinando los tres y declarando cuál se privilegió.',
    fuenteIds: ['ppt-cargadistancia', 'doc-localizacion', 'heizer2020', 'chase2021'],
    ejemploResueltoId: 'loc-02',
    practicaGuiadaId: 'loc-03',
  },

  distribucion: {
    tema: 'distribucion',
    resultadoAprendizaje:
      'El estudiante evalúa una distribución de planta o de almacén con el puntaje carga-distancia, propone una distribución alternativa, cuantifica la mejora y verifica el cumplimiento de las restricciones de proximidad de la gráfica REL.',
    conocimientosPrevios: [
      'En una bodega, ¿qué producto conviene tener más cerca de la puerta: el que se mueve mucho o el que ocupa mucho?',
      '¿Por qué no conviene poner la oficina de inspección junto a los tornos?',
      'Si dos departamentos intercambian 90 viajes por semana y otros dos solo 10, ¿cuál par debería quedar más cerca?',
    ],
    explicacion:
      'La distribución física responde a una pregunta simple con consecuencias diarias: ¿dónde va cada departamento? ' +
      'El criterio cuantitativo es el puntaje carga-distancia: para cada par de departamentos se multiplica el número de recorridos por la distancia que los separa, y se suman todos los productos. ' +
      'Menor es mejor, porque cada unidad de ese puntaje son metros que alguien recorre empujando material, todos los días, durante años.\n\n' +
      'La **matriz de recorridos** (o matriz desde-hacia) registra cuántos viajes ocurren entre cada par. El **plano de bloques** ubica cada departamento en una retícula, ' +
      'y la distancia se mide entre centroides, con métrica rectilínea porque el material circula por pasillos.\n\n' +
      'Pero el puntaje solo cuenta viajes. La **gráfica REL** agrega lo que los viajes no capturan, con seis clasificaciones de proximidad: ' +
      'A (absolutamente necesario), E (especialmente importante), I (importante), O (proximidad ordinaria), S (sin importancia) y N (no deseable). ' +
      'Una distribución con puntaje excelente que pone la inspección junto a la máquina más ruidosa es inaceptable, y ningún número lo compensa.\n\n' +
      'En la distribución de almacenes el criterio se simplifica: casi todos los recorridos ocurren entre cada departamento y la plataforma de carga, ' +
      'de modo que lo que más se mueve debe quedar más cerca de la puerta.',
    glosario: [
      { termino: 'Plano de bloques', definicion: 'Representación de la planta como una retícula donde cada departamento ocupa uno o más bloques.' },
      { termino: 'Matriz de recorridos', definicion: 'Tabla que registra cuántos viajes de material ocurren entre cada par de departamentos.' },
      { termino: 'Centroide', definicion: 'Punto medio del área que ocupa un departamento; desde ahí se miden las distancias.' },
      { termino: 'Puntaje carga-distancia (cd)', definicion: 'Suma de los productos recorridos × distancia sobre todos los pares.' },
      { termino: 'Gráfica REL', definicion: 'Matriz de relaciones de proximidad entre departamentos, con clasificaciones de A a N.' },
      { termino: 'Porcentaje de mejora', definicion: 'Reducción del puntaje carga-distancia respecto de la distribución actual, en porcentaje.' },
    ],
    formulas: [
      {
        nombre: 'Puntaje carga-distancia de un plano',
        tex: 'cd = \\sum_{i<j} w_{ij} \\, d_{ij}',
        variables: [
          { simbolo: 'w_{ij}', significado: 'recorridos entre los departamentos i y j en el periodo' },
          { simbolo: 'd_{ij}', significado: 'distancia rectilínea entre los centroides de i y j, en bloques' },
        ],
        cuandoUsarla: 'Para evaluar y comparar distribuciones. Se suma sobre pares, no sobre celdas de la matriz completa.',
      },
      {
        nombre: 'Porcentaje de mejora',
        tex: '\\%\\,ME = \\frac{cd_{actual} - cd_{propuesta}}{cd_{actual}} \\times 100',
        variables: [
          { simbolo: 'cd_{actual}', significado: 'puntaje de la distribución vigente' },
          { simbolo: 'cd_{propuesta}', significado: 'puntaje de la distribución que se propone' },
        ],
        cuandoUsarla: 'Para presentar el resultado a la gerencia en la unidad que entiende: porcentaje de reducción del manejo de materiales.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Sumar la matriz de recorridos completa en lugar de sumar sobre pares.',
        porQueOcurre: 'La matriz suele venir con las dos mitades llenas o con una sola.',
        comoEvitarlo: 'Cada par cuenta una sola vez: recorra i < j.',
      },
      {
        error: 'Creer que un puntaje más alto es mejor.',
        porQueOcurre: 'En otros contextos «más puntaje» significa mejor desempeño.',
        comoEvitarlo: 'En carga-distancia el puntaje es esfuerzo: menos es mejor, igual que en un costo.',
      },
      {
        error: 'Aceptar una distribución que viola una relación N.',
        porQueOcurre: 'Se optimiza el número y se olvida la gráfica REL.',
        comoEvitarlo: 'Una relación N es una restricción, no una preferencia: no se compensa con puntaje.',
      },
      {
        error: 'Medir distancias entre bordes de departamento en lugar de entre centroides.',
        porQueOcurre: 'Parece más realista.',
        comoEvitarlo: 'La convención del método es entre centroides; mezclar criterios hace incomparables los planos.',
      },
    ],
    interpretacionGerencial:
      'Una reducción del 30 % en el puntaje carga-distancia se traduce en horas de montacargas, combustible, desgaste de equipo y tiempo de operarios que no agrega valor. ' +
      'Es de las pocas mejoras que no requieren invertir en tecnología: solo mover cosas de lugar. ' +
      'Por eso conviene presentarla en porcentaje y acompañarla de la relación que más aporta al total, que es donde está la ganancia concreta.',
    aplicacionAgropecuaria:
      'En una planta de lácteos, la recepción de leche y el tanque de enfriamiento deben ser adyacentes (relación A) porque cada minuto cuenta para la calidad. ' +
      'La sala de lavado de envases y la de empaque de producto terminado, en cambio, deben quedar separadas (relación N) por riesgo de contaminación cruzada: ' +
      'una distribución que las acerque puede tener un puntaje excelente y aun así ser rechazada por la autoridad sanitaria.',
    resumen:
      'El puntaje carga-distancia mide el esfuerzo de manejo de materiales de un plano; la gráfica REL aporta las restricciones que los viajes no capturan. ' +
      'Una buena distribución minimiza el primero sin violar las segundas, y la mejora se presenta como porcentaje de reducción respecto de la distribución actual.',
    fuenteIds: ['ppt-distribucion', 'heizer2020', 'chase2021'],
    ejemploResueltoId: 'dist-01',
    practicaGuiadaId: 'dist-03',
  },

  equilibrio: {
    tema: 'equilibrio',
    resultadoAprendizaje:
      'El estudiante calcula el punto de equilibrio en unidades y en dinero, incorpora comisiones y valores de recuperación, determina el volumen para una utilidad objetivo y resuelve casos multiproducto con mezcla de ventas.',
    conocimientosPrevios: [
      'Si un producto se vende a L 35 y cuesta L 20 producirlo, ¿cuánto queda de cada unidad para pagar el alquiler?',
      '¿Qué costos siguen existiendo aunque la finca no produzca nada este mes?',
      'Una comisión del 8 % sobre la venta, ¿es costo fijo o variable? ¿Por qué?',
    ],
    explicacion:
      'El punto de equilibrio es el volumen de ventas en el que la empresa no gana ni pierde. Su lógica cabe en una frase: ' +
      'cada unidad vendida deja un margen después de pagar su propio costo variable, y ese margen es lo único que puede cubrir los costos fijos.\n\n' +
      'El **margen de contribución unitario** es el precio menos el costo variable unitario. El punto de equilibrio en unidades es el costo fijo dividido entre ese margen: ' +
      'cuántas unidades hacen falta para que la suma de márgenes iguale exactamente los costos fijos.\n\n' +
      'Dos ajustes aparecen siempre en la práctica. Las **comisiones** expresadas como porcentaje del ingreso son costo variable, no fijo, porque crecen con cada venta: ' +
      'hay que restarlas del precio antes de calcular el margen. Los **valores de recuperación** —venta de subproductos, de residuos o de equipo— reducen la carga fija que hay que cubrir.\n\n' +
      'Con varios productos ya no se puede hablar de unidades en general: un litro de leche y un quintal de café no se suman. ' +
      'La solución es trabajar en dinero: se calcula la razón de margen de contribución de cada producto, se pondera por su participación en el ingreso, ' +
      'y el ingreso de equilibrio es el costo fijo dividido entre esa razón ponderada. El resultado solo vale mientras la mezcla se mantenga.',
    glosario: [
      { termino: 'Costo fijo', definicion: 'Costo que no cambia con el volumen de producción dentro del rango relevante.' },
      { termino: 'Costo variable unitario', definicion: 'Costo que se incurre por cada unidad producida o vendida.' },
      { termino: 'Margen de contribución', definicion: 'Precio menos costo variable unitario. Lo que cada unidad aporta a cubrir los costos fijos.' },
      { termino: 'Razón de margen de contribución', definicion: 'Margen de contribución dividido entre el precio. Fracción de cada lempira facturado que queda disponible.' },
      { termino: 'Punto de equilibrio', definicion: 'Volumen en el que el ingreso total iguala al costo total.' },
      { termino: 'Margen de seguridad', definicion: 'Cuánto pueden caer las ventas antes de entrar en pérdida.' },
      { termino: 'Valor de recuperación', definicion: 'Ingreso por subproductos o venta de activos que reduce la carga fija.' },
      { termino: 'Mezcla de ventas', definicion: 'Participación de cada producto en el ingreso total de la empresa.' },
    ],
    formulas: [
      {
        nombre: 'Margen de contribución unitario',
        tex: 'mc = p - cv_{efectivo}',
        variables: [
          { simbolo: 'p', significado: 'precio de venta unitario' },
          { simbolo: 'cv_{efectivo}', significado: 'costo variable unitario, incluida la comisión sobre el ingreso' },
        ],
        cuandoUsarla: 'Siempre, antes de cualquier otro cálculo. Si es negativo o cero, no existe punto de equilibrio.',
      },
      {
        nombre: 'Punto de equilibrio en unidades',
        tex: 'Q_e = \\frac{CF_{neto}}{p - cv_{efectivo}}',
        variables: [
          { simbolo: 'CF_{neto}', significado: 'costos fijos menos el valor de recuperación' },
          { simbolo: 'p - cv_{efectivo}', significado: 'margen de contribución unitario' },
        ],
        cuandoUsarla: 'Cuando hay un solo producto y se necesita una meta de volumen.',
      },
      {
        nombre: 'Punto de equilibrio monetario',
        tex: 'V_e = \\frac{CF_{neto}}{1 - \\frac{cv_{efectivo}}{p}}',
        variables: [
          { simbolo: 'CF_{neto}', significado: 'costos fijos netos del periodo' },
          { simbolo: 'cv_{efectivo}/p', significado: 'fracción del precio que se consume en costo variable' },
        ],
        cuandoUsarla: 'Cuando la meta se comunica en facturación, que es como la lee el estado de resultados.',
      },
      {
        nombre: 'Volumen para una utilidad objetivo',
        tex: 'Q_u = \\frac{CF_{neto} + U_{objetivo}}{p - cv_{efectivo}}',
        variables: [
          { simbolo: 'U_{objetivo}', significado: 'utilidad que la gerencia quiere alcanzar en el periodo' },
        ],
        cuandoUsarla: 'La utilidad deseada se trata como un costo fijo adicional que también hay que cubrir.',
      },
      {
        nombre: 'Equilibrio multiproducto',
        tex: 'V_e = \\frac{CF}{\\sum_i r_i \\, w_i}',
        variables: [
          { simbolo: 'r_i', significado: 'razón de margen de contribución del producto i' },
          { simbolo: 'w_i', significado: 'participación del producto i en el ingreso total' },
        ],
        cuandoUsarla: 'Cuando hay varios productos con precios y márgenes distintos. El resultado depende de la mezcla.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Dividir los costos fijos entre el precio en lugar del margen.',
        porQueOcurre: 'Se piensa que cada unidad aporta su precio completo a los costos fijos.',
        comoEvitarlo: 'Cada unidad debe pagar primero su propio costo variable. Solo lo que sobra cubre lo fijo.',
      },
      {
        error: 'Tratar la comisión de ventas como costo fijo.',
        porQueOcurre: 'Aparece como un gasto de administración en el estado de resultados.',
        comoEvitarlo: 'Pregúntese si crece cuando se vende más. Si crece, es variable.',
      },
      {
        error: 'Olvidar el valor de recuperación.',
        porQueOcurre: 'Parece un ingreso menor y se ignora.',
        comoEvitarlo: 'Réstelo de los costos fijos: reduce el equilibrio más de lo que parece.',
      },
      {
        error: 'Aplicar el equilibrio multiproducto y luego cambiar la mezcla sin recalcular.',
        porQueOcurre: 'El resultado se toma como un número fijo de la empresa.',
        comoEvitarlo: 'El equilibrio multiproducto vale solo para la mezcla con la que se calculó.',
      },
    ],
    interpretacionGerencial:
      'El punto de equilibrio expresado como porcentaje de la capacidad es el indicador que más dice: equilibrar al 40 % deja aire para resistir una caída de demanda; ' +
      'equilibrar al 90 % significa que casi toda la planta trabaja solo para no perder. ' +
      'Y en multiproducto aparece la palanca más barata que tiene un gerente: desplazar la mezcla hacia los productos de mayor margen baja el punto de equilibrio sin vender un peso más.',
    aplicacionAgropecuaria:
      'Una granja avícola que vende huevo, pollo y gallinaza puede descubrir que la gallinaza, tratada como residuo, tiene la razón de contribución más alta de los tres. ' +
      'Aumentar su participación del 15 % al 25 % de los ingresos baja el punto de equilibrio de toda la empresa sin tocar una sola galera.',
    resumen:
      'El margen de contribución es lo único que cubre los costos fijos. El punto de equilibrio es el costo fijo dividido entre ese margen, ajustado por comisiones y valores de recuperación. ' +
      'Con varios productos el análisis se hace en dinero, ponderando por la mezcla, y el resultado solo vale mientras la mezcla se mantenga.',
    fuenteIds: ['heizer2020', 'chase2021', 'stevenson2021'],
    ejemploResueltoId: 'equi-01',
    practicaGuiadaId: 'equi-02',
  },

  cpm: {
    tema: 'cpm',
    resultadoAprendizaje:
      'El estudiante construye la red de un proyecto, ejecuta los recorridos hacia adelante y hacia atrás, calcula holguras, identifica la ruta crítica y analiza el efecto de un retraso sobre la fecha de entrega.',
    conocimientosPrevios: [
      'Si una actividad tiene dos predecesoras que terminan en el día 8 y en el día 12, ¿cuándo puede empezar?',
      '¿Puede un proyecto de diez actividades de dos días cada una terminar en menos de veinte días?',
      '¿Qué significa que una actividad tenga «holgura»?',
    ],
    explicacion:
      'Un proyecto es un conjunto de actividades con dependencias. El método de la ruta crítica ordena esas dependencias y responde tres preguntas: ' +
      'cuánto durará el proyecto, qué actividades no admiten retraso y cuánto margen tienen las demás.\n\n' +
      'El **recorrido hacia adelante** calcula lo más pronto que puede ocurrir cada cosa: el inicio temprano de una actividad es la **mayor** de las terminaciones tempranas de sus predecesoras, ' +
      'porque hay que esperar a que todas terminen y la que manda es la última. La terminación temprana es ese inicio más la duración. ' +
      'La mayor terminación temprana de la red es la duración del proyecto.\n\n' +
      'El **recorrido hacia atrás** parte de esa duración y calcula lo más tarde que puede ocurrir cada cosa sin atrasar la entrega: ' +
      'la terminación tardía de una actividad es el **menor** de los inicios tardíos de sus sucesoras.\n\n' +
      'La **holgura total** es la diferencia entre el inicio tardío y el temprano: cuánto puede demorarse una actividad sin atrasar el proyecto. ' +
      'Las de holgura cero forman la **ruta crítica**, cuya duración es la del proyecto. La **holgura libre**, en cambio, es cuánto puede demorarse sin atrasar a ninguna sucesora, y siempre es menor o igual que la total.\n\n' +
      'Cuando hay varias rutas críticas simultáneas, acortar una sola no adelanta el proyecto ni un día: hay que acortarlas todas.\n\n' +
      '**Compresión del proyecto.** Saber cuánto dura no es lo mismo que saber cuánto puede durar. Cada actividad admite una ' +
      'duración acelerada, más corta y más cara, y la **pendiente de costo** dice cuánto cuesta ganar un periodo en ella: la ' +
      'diferencia de costo repartida entre los periodos que se pueden ganar, no entre la duración normal.\n\n' +
      'El procedimiento va de un periodo a la vez. Se mira qué actividades son críticas, se acorta la combinación más barata ' +
      'que reduzca **todas** las rutas críticas, y se vuelve a resolver la red. Ese recálculo no es opcional: al comprimir, ' +
      'las holguras de las otras rutas se consumen y aparecen rutas críticas nuevas. Quien decide sobre la ruta inicial ' +
      'termina pagando por acortar un camino que ya no manda.\n\n' +
      'Comprimir sube el **costo directo** y baja el **costo indirecto**, que corre por cada periodo que el proyecto sigue ' +
      'abierto. El total tiene un mínimo, y ahí está la decisión: no conviene la duración normal ni la mínima alcanzable, ' +
      'sino aquella en la que la siguiente pendiente ya supera el costo indirecto que se ahorraría.',
    glosario: [
      { termino: 'Actividad', definicion: 'Tarea del proyecto que consume tiempo y recursos.' },
      { termino: 'Predecesora', definicion: 'Actividad que debe terminar antes de que otra pueda comenzar.' },
      { termino: 'Ordenamiento topológico', definicion: 'Secuencia en la que ninguna actividad aparece antes que sus predecesoras.' },
      { termino: 'Inicio temprano (IT)', definicion: 'Lo más pronto que puede comenzar una actividad.' },
      { termino: 'Terminación temprana (TT)', definicion: 'Inicio temprano más la duración.' },
      { termino: 'Inicio tardío (IL)', definicion: 'Lo más tarde que puede comenzar sin atrasar el proyecto.' },
      { termino: 'Terminación tardía (TL)', definicion: 'Lo más tarde que puede terminar sin atrasar el proyecto.' },
      { termino: 'Holgura total', definicion: 'IL menos IT. Margen de retraso sin afectar la fecha final.' },
      { termino: 'Holgura libre', definicion: 'Margen de retraso sin afectar el inicio temprano de ninguna sucesora.' },
      { termino: 'Ruta crítica', definicion: 'Cadena de actividades con holgura cero desde el inicio hasta el fin.' },
      { termino: 'Actividad ficticia', definicion: 'Flecha punteada que expresa una dependencia sin consumir tiempo, en diagramas de actividades en flechas.' },
      { termino: 'Duración acelerada', definicion: 'Lo mínimo que puede durar una actividad pagando más recursos. También se le llama duración de quiebre.' },
      { termino: 'Pendiente de costo', definicion: 'Lo que cuesta acortar un periodo en una actividad: la diferencia de costo entre los periodos que se pueden ganar.' },
      { termino: 'Costo directo', definicion: 'Lo que cuestan las actividades en sí. Sube al comprimir.' },
      { termino: 'Costo indirecto', definicion: 'Lo que corre por cada periodo que el proyecto sigue abierto: supervisión, alquileres, financiamiento. Baja al comprimir.' },
      { termino: 'Compresión (crashing)', definicion: 'Acortar el proyecto acelerando actividades críticas, hasta donde el ahorro en costo indirecto pague el sobrecosto.' },
    ],
    formulas: [
      {
        nombre: 'Recorrido hacia adelante',
        tex: 'IT_j = \\max_{i \\to j} (TT_i) \\qquad TT_j = IT_j + d_j',
        variables: [
          { simbolo: 'IT_j', significado: 'inicio temprano de la actividad j' },
          { simbolo: 'TT_i', significado: 'terminación temprana de cada predecesora i' },
          { simbolo: 'd_j', significado: 'duración de la actividad j' },
        ],
        cuandoUsarla: 'Primer paso siempre. El máximo es la clave: hay que esperar a la última predecesora.',
      },
      {
        nombre: 'Recorrido hacia atrás',
        tex: 'TL_i = \\min_{i \\to j} (IL_j) \\qquad IL_i = TL_i - d_i',
        variables: [
          { simbolo: 'TL_i', significado: 'terminación tardía de la actividad i' },
          { simbolo: 'IL_j', significado: 'inicio tardío de cada sucesora j' },
        ],
        cuandoUsarla: 'Segundo paso, partiendo de la duración total del proyecto. Aquí el operador es el mínimo.',
      },
      {
        nombre: 'Holgura total',
        tex: 'H_i = IL_i - IT_i = TL_i - TT_i',
        variables: [{ simbolo: 'H_i', significado: 'holgura total de la actividad i' }],
        cuandoUsarla: 'Para identificar la ruta crítica: holgura cero significa actividad crítica.',
      },
      {
        nombre: 'Pendiente de costo',
        tex: 'S_i = \\frac{C_a - C_n}{D_n - D_a}',
        variables: [
          { simbolo: 'S_i', significado: 'costo de acortar un periodo la actividad i' },
          { simbolo: 'C_n, C_a', significado: 'costo con la duración normal y con la acelerada' },
          { simbolo: 'D_n, D_a', significado: 'duración normal y duración acelerada' },
        ],
        cuandoUsarla: 'Antes de comprimir nada. El denominador son los periodos que se ganan, no la duración normal.',
      },
      {
        nombre: 'Costo total del proyecto',
        tex: 'C_T(D) = C_D(D) + c_i \\times D',
        variables: [
          { simbolo: 'C_D(D)', significado: 'costo directo con esa duración' },
          { simbolo: 'c_i', significado: 'costo indirecto por periodo' },
          { simbolo: 'D', significado: 'duración del proyecto' },
        ],
        cuandoUsarla: 'Para elegir la duración que conviene: es la que hace mínimo este total.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Tomar el mínimo en lugar del máximo al converger dos predecesoras.',
        porQueOcurre: 'Se busca «el primero que termina» en lugar de «el último».',
        comoEvitarlo: 'Piense en la realidad: si faltan dos insumos, no puede empezar hasta que llegue el segundo.',
      },
      {
        error: 'Sumar la duración de todas las actividades para obtener la del proyecto.',
        porQueOcurre: 'Se olvida que hay actividades en paralelo.',
        comoEvitarlo: 'La duración es la de la ruta más larga, no la suma de todo.',
      },
      {
        error: 'Confundir holgura libre con holgura total.',
        porQueOcurre: 'Ambas se llaman holgura y ambas miden margen.',
        comoEvitarlo: 'La total mira la fecha final del proyecto; la libre mira solo a las sucesoras inmediatas.',
      },
      {
        error: 'Acelerar una actividad con holgura para adelantar el proyecto.',
        porQueOcurre: 'Se elige la actividad más fácil de acelerar, no la que manda.',
        comoEvitarlo: 'Solo acortar la ruta crítica adelanta el proyecto. Todo lo demás aumenta holgura.',
      },
      {
        error: 'Calcular la pendiente dividiendo entre la duración normal.',
        porQueOcurre: 'Es el denominador que está a la vista en la tabla.',
        comoEvitarlo: 'La pendiente es un precio por periodo ganado: divida entre la duración normal menos la acelerada.',
      },
      {
        error: 'Comprimir hasta la duración mínima alcanzable.',
        porQueOcurre: 'Se confunde «lo más que se puede» con «lo que conviene».',
        comoEvitarlo: 'Deje de acortar en cuanto la pendiente supere el costo indirecto por periodo: ese periodo ya cuesta más de lo que ahorra.',
      },
      {
        error: 'Decidir toda la compresión sobre la ruta crítica inicial.',
        porQueOcurre: 'Se calcula la ruta una vez y se siguen acortando sus actividades.',
        comoEvitarlo: 'Vuelva a resolver la red después de cada periodo: las holguras se consumen y aparecen rutas críticas nuevas.',
      },
    ],
    interpretacionGerencial:
      'La ruta crítica define la agenda del gerente de proyecto: son las actividades que hay que vigilar a diario. ' +
      'Las de mayor holgura, en cambio, ofrecen recursos que pueden reasignarse temporalmente a la ruta crítica sin poner en riesgo la fecha. ' +
      'Y ante un retraso, la pregunta no es «¿cuánto se atrasó?» sino «¿tenía holgura?»: un retraso de tres días en una actividad con cinco de holgura no cambia nada.',
    aplicacionAgropecuaria:
      'En el montaje de una planta de compostaje, la adquisición de materiales y el diseño del sistema pueden avanzar en paralelo, pero la construcción de la plataforma depende de ambos. ' +
      'Si la capacitación del personal tiene holgura, se puede posponer sin costo; si la plataforma se atrasa un día, la puesta en marcha se corre un día. ' +
      'Saber cuál es cuál evita comprar apuro donde no hace falta.',
    resumen:
      'El recorrido hacia adelante usa el máximo y da la duración del proyecto; el recorrido hacia atrás usa el mínimo y da los tiempos tardíos. ' +
      'La holgura total identifica la ruta crítica, que es donde se gana o se pierde la fecha de entrega. Con varias rutas críticas hay que acortarlas todas a la vez.',
    fuenteIds: ['doc-redes', 'heizer2020', 'chase2021', 'stevenson2021'],
    ejemploResueltoId: 'cpm-01',
    practicaGuiadaId: 'cpm-02',
  },

  pert: {
    tema: 'pert',
    resultadoAprendizaje:
      'El estudiante estima duraciones con tres valores, calcula tiempos esperados y varianzas, determina la ruta crítica probabilística y responde preguntas de probabilidad y de plazo comprometido con la aproximación normal.',
    conocimientosPrevios: [
      'Si le preguntan cuánto tarda en llegar a la universidad, ¿daría un solo número o un rango?',
      '¿Qué mide una desviación estándar?',
      'Si un proyecto dura 80 semanas en promedio, ¿qué probabilidad hay de terminar exactamente en 80?',
    ],
    explicacion:
      'CPM supone que las duraciones son ciertas. PERT reconoce que no lo son: para cada actividad pide tres estimaciones — ' +
      'optimista (a), más probable (m) y pesimista (b)— y las combina en un promedio ponderado que da cuatro veces más peso a la más probable, ' +
      'porque es la que el experto conoce mejor; los extremos apenas corrigen el sesgo.\n\n' +
      'La **varianza** de cada actividad depende solo de la distancia entre el escenario optimista y el pesimista: cuanto más se separan, menos se sabe de esa actividad. ' +
      'Se divide entre 6 porque se supone que el rango a–b cubre unas seis desviaciones estándar.\n\n' +
      'Con los tiempos esperados como duraciones, la red se resuelve igual que en CPM. La diferencia aparece al agregar la incertidumbre: ' +
      'la varianza del proyecto es la **suma de las varianzas** de las actividades de la ruta evaluada, nunca la suma de sus desviaciones estándar. ' +
      'Las varianzas de variables independientes son aditivas; las desviaciones no lo son.\n\n' +
      'Con la media y la desviación estándar del proyecto, la aproximación normal permite responder preguntas de negocio: ' +
      'qué probabilidad hay de cumplir una fecha, y qué plazo hay que comprometer para tener un nivel de confianza dado. ' +
      'Esa aproximación descansa en tres supuestos que ningún proyecto real cumple del todo: suficientes actividades en la ruta crítica, duraciones independientes y ruta crítica estable.',
    glosario: [
      { termino: 'Tiempo optimista (a)', definicion: 'Duración si todo sale mejor de lo esperado.' },
      { termino: 'Tiempo más probable (m)', definicion: 'Duración más frecuente en condiciones normales.' },
      { termino: 'Tiempo pesimista (b)', definicion: 'Duración si todo sale peor de lo esperado.' },
      { termino: 'Tiempo esperado (TE)', definicion: 'Promedio ponderado de las tres estimaciones, con peso 4 en la más probable.' },
      { termino: 'Varianza', definicion: 'Medida de la incertidumbre de una actividad; depende del rango b − a.' },
      { termino: 'Ruta crítica probabilística', definicion: 'Ruta crítica calculada con los tiempos esperados.' },
      { termino: 'Puntaje Z', definicion: 'Número de desviaciones estándar que separa un plazo de la duración esperada.' },
      { termino: 'Nivel de confianza', definicion: 'Probabilidad de cumplir el plazo que se compromete.' },
    ],
    formulas: [
      {
        nombre: 'Tiempo esperado',
        tex: 'TE = \\frac{a + 4m + b}{6}',
        variables: [
          { simbolo: 'a', significado: 'tiempo optimista' },
          { simbolo: 'm', significado: 'tiempo más probable' },
          { simbolo: 'b', significado: 'tiempo pesimista' },
        ],
        cuandoUsarla: 'Para cada actividad, antes de resolver la red.',
      },
      {
        nombre: 'Varianza de una actividad',
        tex: '\\sigma^2 = \\left( \\frac{b - a}{6} \\right)^2',
        variables: [{ simbolo: 'b - a', significado: 'rango entre el escenario pesimista y el optimista' }],
        cuandoUsarla: 'Para medir la incertidumbre de cada actividad. Note que m no interviene.',
      },
      {
        nombre: 'Varianza del proyecto',
        tex: '\\sigma_P^2 = \\sum_{i \\in RC} \\sigma_i^2 \\qquad \\sigma_P = \\sqrt{\\sigma_P^2}',
        variables: [
          { simbolo: 'RC', significado: 'conjunto de actividades de la ruta evaluada' },
          { simbolo: '\\sigma_P', significado: 'desviación estándar del proyecto' },
        ],
        cuandoUsarla: 'Solo sobre las actividades de la ruta evaluada. Se suman varianzas, nunca desviaciones.',
      },
      {
        nombre: 'Puntaje Z',
        tex: 'Z = \\frac{T - \\mu}{\\sigma}',
        variables: [
          { simbolo: 'T', significado: 'plazo consultado' },
          { simbolo: '\\mu', significado: 'duración esperada del proyecto' },
          { simbolo: '\\sigma', significado: 'desviación estándar del proyecto' },
        ],
        cuandoUsarla: 'Para convertir un plazo en un valor de tabla normal.',
      },
      {
        nombre: 'Plazo para un nivel de confianza',
        tex: 'T = \\mu + Z \\sigma',
        variables: [{ simbolo: 'Z', significado: 'valor de la normal que deja a su izquierda el nivel de confianza deseado' }],
        cuandoUsarla: 'Operación inversa: se parte de la confianza deseada y se despeja el plazo que hay que comprometer.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Sumar las desviaciones estándar en lugar de las varianzas.',
        porQueOcurre: 'La desviación es lo que se interpreta, así que se suma directamente.',
        comoEvitarlo: 'Sume varianzas y saque la raíz al final. Es el error más común de todo el tema.',
      },
      {
        error: 'Sumar las varianzas de todas las actividades del proyecto.',
        porQueOcurre: 'Se piensa que toda la incertidumbre del proyecto cuenta.',
        comoEvitarlo: 'Las actividades con holgura pueden retrasarse sin mover la fecha final: su incertidumbre no entra.',
      },
      {
        error: 'Usar el promedio simple de las tres estimaciones.',
        porQueOcurre: 'Es el promedio que se aprende primero.',
        comoEvitarlo: 'PERT pondera con peso 4 en la estimación más probable. El denominador es 6, no 3.',
      },
      {
        error: 'Leer la cola equivocada de la distribución normal.',
        porQueOcurre: 'Las tablas dan siempre el área a la izquierda.',
        comoEvitarlo: 'Para «probabilidad de exceder» hay que restar de 1 el valor de la tabla.',
      },
      {
        error: 'Comprometer la duración esperada como fecha de entrega.',
        porQueOcurre: 'Parece el valor «correcto» del proyecto.',
        comoEvitarlo: 'La media deja 50 % de probabilidad de incumplir. Agregue el colchón que el nivel de confianza exija.',
      },
    ],
    interpretacionGerencial:
      'PERT convierte una estimación en una promesa cuantificada. Prometer la duración esperada equivale a aceptar 50 % de probabilidad de incumplir, ' +
      'lo que en un contrato con penalización es inaceptable. El colchón que separa la media del plazo comprometido no es tiempo perdido: es el precio de una promesa creíble. ' +
      'Y cuando la ruta crítica es corta o hay varias rutas tensas, las probabilidades calculadas son optimistas y deben comunicarse como tales.',
    aplicacionAgropecuaria:
      'En el establecimiento de un invernadero, la instalación de la estructura tiene un rango amplio (3 a 8 días) porque depende del clima y de la disponibilidad de la cuadrilla; ' +
      'la selección del terreno, en cambio, tiene un rango estrecho. La actividad de mayor varianza es la que más riesgo aporta a la fecha, ' +
      'y suele ser el mejor lugar para invertir en supervisión o en un proveedor más confiable.',
    resumen:
      'PERT estima con tres valores, calcula un tiempo esperado ponderado y una varianza por actividad, y resuelve la red como CPM. ' +
      'La varianza del proyecto se obtiene sumando varianzas de la ruta evaluada. Con media y desviación, la aproximación normal responde preguntas de probabilidad y de plazo comprometido.',
    fuenteIds: ['doc-pert', 'chase2021', 'heizer2020', 'stevenson2021'],
    ejemploResueltoId: 'pert-01',
    practicaGuiadaId: 'pert-03',
  },

  grafico: {
    tema: 'grafico',
    resultadoAprendizaje:
      'El estudiante formula un problema de programación lineal de dos variables, grafica la región factible, identifica sus vértices, encuentra la solución óptima con la línea de indiferencia, interpreta las holguras y reconoce los casos de soluciones múltiples, región no acotada e infactibilidad.',
    conocimientosPrevios: [
      'Si una recta es 2x + 3y = 12, ¿en qué puntos corta a los ejes?',
      'Una finca tiene 20 manzanas y quiere sembrar maíz y frijol. ¿Cómo escribiría esa limitación como una desigualdad?',
      '¿Por qué el mejor plan de producción no suele ser dedicarse a un solo producto, aunque uno deje más margen por unidad?',
    ],
    explicacion:
      'La programación lineal es un método determinista para elegir la mejor entre muchas alternativas cuando los recursos son limitados. ' +
      'Con dos variables de decisión se puede resolver dibujando, y ese dibujo enseña más que cualquier algoritmo: hace visible por qué la ' +
      'respuesta está donde está.\n\n' +
      'Todo modelo tiene tres partes. Las **variables de decisión** son lo que el gerente puede elegir: cuántas manzanas de maíz, cuántas mesas, ' +
      'cuántos kilogramos de cada ingrediente. La **función objetivo** expresa qué se quiere lograr —maximizar un margen, minimizar un costo— ' +
      'como una combinación lineal de esas variables. Las **restricciones** expresan lo que no se puede violar: recursos disponibles, ' +
      'compromisos adquiridos, requerimientos mínimos. Y casi siempre se agrega la **no negatividad**, porque no se produce una cantidad ' +
      'negativa de nada.\n\n' +
      'Para graficar, cada desigualdad se trata en dos movimientos: primero se dibuja la recta que resulta de cambiar el signo por una igualdad, ' +
      'lo que se hace rápido buscando dónde corta cada eje; luego se decide de qué lado queda la zona permitida. La superposición de todas las ' +
      'zonas permitidas es la **región factible**.\n\n' +
      'Aquí aparece el resultado central del tema, el **teorema fundamental de la programación lineal**: si existe una solución óptima, se alcanza ' +
      'en un vértice de la región factible. Eso reduce infinitos puntos posibles a un puñado de esquinas, y por eso el procedimiento consiste en ' +
      'hallar los vértices, evaluar la función objetivo en cada uno y quedarse con el mejor.\n\n' +
      'La **línea de indiferencia** —o línea de isoutilidad— une todos los puntos con el mismo valor de Z. Al desplazarla paralelamente en la ' +
      'dirección que mejora el objetivo, el último punto de la región que toca es el óptimo. Es la comprobación visual de lo que la tabla de ' +
      'vértices ya dijo con números.\n\n' +
      'No todos los modelos terminan con un número. Hay cuatro desenlaces posibles: **solución única**, **soluciones múltiples** (cuando la función ' +
      'objetivo es paralela a una restricción activa y todo un segmento es igualmente óptimo), **región no acotada** (el objetivo crece sin límite, ' +
      'lo que casi siempre significa que falta una restricción) y **problema infactible** (las condiciones se contradicen y no existe ningún punto ' +
      'que las cumpla todas). Saber leer los tres últimos es tan importante como calcular el primero.\n\n' +
      'Resolver el modelo es la mitad del trabajo. La otra mitad es el **análisis de sensibilidad**, que responde las preguntas que un gerente hace ' +
      'después de ver el resultado: ¿y si consigo más de este recurso? ¿y si cambia el precio?\n\n' +
      'El **precio sombra** de una restricción es cuánto aumentaría Z si se dispusiera de una unidad más de ese recurso. Los recursos que sobran ' +
      'tienen precio sombra cero —conseguir más no sirve de nada— y los que se agotan tienen un precio sombra positivo que es, exactamente, ' +
      'el máximo que conviene pagar por una unidad adicional. Pagar por encima de esa cifra destruye margen. ' +
      'El precio sombra sale de resolver el **sistema dual**: en el vértice óptimo, el gradiente de la función objetivo se escribe como una ' +
      'combinación de las normales de las restricciones activas, y los coeficientes de esa combinación son los precios sombra.\n\n' +
      'Ningún precio sombra vale para siempre. El **rango de factibilidad** indica entre qué valores puede moverse el recurso disponible antes de ' +
      'que otra restricción se convierta en el nuevo cuello de botella: fuera de ese intervalo el número deja de aplicar y hay que rehacer el análisis. ' +
      'Y el **rango de optimalidad** hace lo mismo con los coeficientes de la función objetivo: dice cuánto puede variar el margen de un producto ' +
      'antes de que convenga cambiar el plan de producción. Dentro del rango cambia la ganancia; fuera de él, cambia la decisión.',
    glosario: [
      { termino: 'Variable de decisión', definicion: 'Cantidad que el gerente puede elegir; es lo que el modelo determina.' },
      { termino: 'Función objetivo', definicion: 'Expresión lineal que se quiere maximizar o minimizar.' },
      { termino: 'Restricción', definicion: 'Desigualdad o igualdad que expresa un recurso limitado o una exigencia obligatoria.' },
      { termino: 'No negatividad', definicion: 'Condición de que las variables no pueden tomar valores negativos.' },
      { termino: 'Región factible', definicion: 'Conjunto de todos los puntos que cumplen simultáneamente todas las restricciones.' },
      { termino: 'Vértice o punto extremo', definicion: 'Esquina de la región factible, formada por el cruce de dos restricciones.' },
      { termino: 'Línea de indiferencia', definicion: 'Recta que une los puntos con el mismo valor de la función objetivo. También llamada línea de isoutilidad.' },
      { termino: 'Restricción activa', definicion: 'Aquella que se cumple con igualdad en el óptimo: el recurso se agota por completo.' },
      { termino: 'Holgura', definicion: 'Cantidad de recurso que sobra en el óptimo. Cero significa que la restricción está activa.' },
      { termino: 'Excedente', definicion: 'En una restricción de tipo ≥, cuánto se supera el mínimo exigido.' },
      { termino: 'Restricción redundante', definicion: 'La que no toca la región factible: otra ya la hace cumplir y podría eliminarse.' },
      { termino: 'Solución no acotada', definicion: 'Caso en que el objetivo puede crecer sin límite dentro de la región factible.' },
      { termino: 'Problema infactible', definicion: 'Caso en que ningún punto cumple todas las restricciones a la vez.' },
      { termino: 'Degeneración', definicion: 'Situación en que tres o más restricciones se cruzan en el mismo vértice.' },
      { termino: 'Análisis de sensibilidad', definicion: 'Estudio de cuánto pueden cambiar los datos del modelo antes de que cambie la solución.' },
      { termino: 'Precio sombra', definicion: 'Cuánto aumenta el valor óptimo por cada unidad adicional de un recurso. Cero en los recursos que sobran.' },
      { termino: 'Sistema dual', definicion: 'Sistema de ecuaciones que expresa el gradiente del objetivo como combinación de las normales de las restricciones activas. Sus soluciones son los precios sombra.' },
      { termino: 'Rango de factibilidad', definicion: 'Intervalo del recurso disponible dentro del cual el precio sombra sigue siendo válido.' },
      { termino: 'Rango de optimalidad', definicion: 'Intervalo de un coeficiente de la función objetivo dentro del cual el vértice óptimo no cambia.' },
      { termino: 'Costo de oportunidad', definicion: 'Lo que se deja de ganar por no disponer de una unidad más de un recurso agotado. Es la otra lectura del precio sombra.' },
    ],
    formulas: [
      {
        nombre: 'Forma general del modelo',
        tex: '\\text{Max o Min} \\quad Z = c_1 x_1 + c_2 x_2',
        variables: [
          { simbolo: 'x_1, x_2', significado: 'variables de decisión: lo que se elige producir o comprar' },
          { simbolo: 'c_1, c_2', significado: 'aporte de cada unidad al objetivo (margen por unidad, costo por unidad)' },
        ],
        cuandoUsarla: 'Siempre se escribe primero. Definir bien las variables es la mitad del trabajo.',
      },
      {
        nombre: 'Restricción de recurso',
        tex: 'a_{i1} x_1 + a_{i2} x_2 \\le b_i',
        variables: [
          { simbolo: 'a_{ij}', significado: 'cuánto del recurso i consume cada unidad de la variable j' },
          { simbolo: 'b_i', significado: 'cantidad disponible del recurso i' },
        ],
        cuandoUsarla: 'Para recursos limitados. Con ≥ se expresan requerimientos mínimos, y con = obligaciones exactas.',
      },
      {
        nombre: 'Cortes de una recta con los ejes',
        tex: 'x_1 = \\frac{b_i}{a_{i1}} \\quad \\text{cuando } x_2 = 0 \\qquad x_2 = \\frac{b_i}{a_{i2}} \\quad \\text{cuando } x_1 = 0',
        variables: [{ simbolo: 'b_i / a_{ij}', significado: 'punto donde la recta corta al eje de la variable j' }],
        cuandoUsarla: 'Es la forma más rápida de trazar cada restricción a mano: dos puntos bastan para una recta.',
      },
      {
        nombre: 'Vértice por intersección de dos restricciones',
        tex: '\\begin{cases} a_{11} x_1 + a_{12} x_2 = b_1 \\\\ a_{21} x_1 + a_{22} x_2 = b_2 \\end{cases}',
        variables: [{ simbolo: 'x_1, x_2', significado: 'coordenadas del vértice, obtenidas resolviendo el sistema' }],
        cuandoUsarla: 'Para cada par de rectas que se cruzan dentro de la región. Verifique después que el punto cumpla las demás restricciones.',
      },
      {
        nombre: 'Línea de indiferencia',
        tex: 'c_1 x_1 + c_2 x_2 = Z',
        variables: [{ simbolo: 'Z', significado: 'valor de la función objetivo; cada valor da una recta paralela distinta' }],
        cuandoUsarla: 'Para comprobar visualmente cuál vértice es el óptimo desplazando la recta.',
      },
      {
        nombre: 'Holgura de una restricción',
        tex: 'h_i = b_i - (a_{i1} x_1^* + a_{i2} x_2^*)',
        variables: [
          { simbolo: 'x_1^*, x_2^*', significado: 'coordenadas del punto óptimo' },
          { simbolo: 'h_i', significado: 'holgura; cero significa restricción activa' },
        ],
        cuandoUsarla: 'Después de hallar el óptimo, para saber qué recursos se agotaron y cuáles sobran.',
      },
      {
        nombre: 'Precio sombra',
        tex: 'y_i = \\frac{\\partial Z^*}{\\partial b_i}',
        variables: [
          { simbolo: 'y_i', significado: 'precio sombra del recurso i, en unidades de objetivo por unidad de recurso' },
          { simbolo: 'b_i', significado: 'cantidad disponible del recurso i' },
        ],
        cuandoUsarla: 'Para decidir en qué recurso conviene invertir. Es el precio máximo que se debería pagar por una unidad adicional.',
      },
      {
        nombre: 'Sistema dual en el vértice óptimo',
        tex: 'y_1 \\, \\mathbf{n}_1 + y_2 \\, \\mathbf{n}_2 = \\mathbf{c}',
        variables: [
          { simbolo: '\\mathbf{n}_1, \\mathbf{n}_2', significado: 'vectores de coeficientes de las dos restricciones activas' },
          { simbolo: '\\mathbf{c}', significado: 'vector de coeficientes de la función objetivo' },
          { simbolo: 'y_1, y_2', significado: 'precios sombra de esas restricciones' },
        ],
        cuandoUsarla: 'Es la forma exacta de obtener los precios sombra sin recalcular el problema. Los recursos no activos tienen precio sombra cero.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Sombrear el lado equivocado de una restricción.',
        porQueOcurre: 'Se dibuja la recta correctamente pero se olvida decidir de qué lado queda la zona permitida.',
        comoEvitarlo: 'Pruebe con el origen (0, 0): si satisface la desigualdad, la zona permitida es la que contiene al origen. Si la recta pasa por el origen, pruebe con otro punto.',
      },
      {
        error: 'Evaluar la función objetivo solo en los cortes con los ejes.',
        porQueOcurre: 'Son los vértices más fáciles de calcular y parecen los candidatos naturales.',
        comoEvitarlo: 'El óptimo suele estar en un vértice interior, donde se cruzan dos restricciones. Evalúe todos los vértices, sin excepción.',
      },
      {
        error: 'Tomar como vértice un cruce de rectas que no es factible.',
        porQueOcurre: 'Se resuelve el sistema de dos restricciones sin verificar las demás.',
        comoEvitarlo: 'Todo cruce debe comprobarse contra todas las restricciones antes de aceptarlo como vértice.',
      },
      {
        error: 'Confundir maximizar con minimizar al desplazar la línea de indiferencia.',
        porQueOcurre: 'La recta se puede mover en dos direcciones y ambas parecen igual de válidas.',
        comoEvitarlo: 'En maximización se aleja del origen; en minimización se acerca. Verifique siempre con la tabla de vértices.',
      },
      {
        error: 'Declarar que un problema no tiene solución cuando en realidad es no acotado, o al revés.',
        porQueOcurre: 'Los dos casos terminan sin un número y se confunden.',
        comoEvitarlo: 'Infactible significa que la región está vacía; no acotado significa que la región existe pero crece sin límite. Son problemas distintos con soluciones distintas.',
      },
      {
        error: 'Redondear el óptimo a números enteros sin advertirlo.',
        porQueOcurre: 'La solución da valores fraccionarios y no se pueden producir media mesa ni media manzana.',
        comoEvitarlo: 'La programación lineal admite valores fraccionarios. Si el problema exige enteros, hace falta programación entera, y el punto entero más cercano no siempre es el óptimo.',
      },
      {
        error: 'Confundir el precio sombra con el coeficiente de la función objetivo.',
        porQueOcurre: 'Ambos son «cuánto aporta algo», y se mezclan.',
        comoEvitarlo: 'El coeficiente es lo que aporta una unidad de **producto**; el precio sombra es lo que aporta una unidad de **recurso**. Rara vez coinciden.',
      },
      {
        error: 'Invertir en un recurso que sobra.',
        porQueOcurre: 'Parece importante porque se usa mucho, o porque su nombre suena crítico.',
        comoEvitarlo: 'Si su precio sombra es cero, conseguir más no mejora nada. Solo los recursos agotados limitan el resultado.',
      },
      {
        error: 'Extrapolar el precio sombra fuera de su rango de factibilidad.',
        porQueOcurre: 'El precio sombra parece una constante del problema.',
        comoEvitarlo: 'Es válido solo mientras el mismo par de restricciones siga siendo el cuello de botella. Verifique el rango antes de multiplicar por una cantidad grande.',
      },
      {
        error: 'Creer que un cambio de precio dentro del rango de optimalidad no afecta nada.',
        porQueOcurre: 'Se confunde «no cambia el plan» con «no cambia el resultado».',
        comoEvitarlo: 'Dentro del rango cambia la ganancia pero no qué producir. Fuera del rango cambia también la decisión.',
      },
    ],
    interpretacionGerencial:
      'El valor de la solución no está solo en el número óptimo sino en las **restricciones activas**. Son los recursos que se agotan, y por tanto ' +
      'los únicos donde invertir aumenta la ganancia: conseguir una hora más de mano de obra cuando la mano de obra es el cuello de botella sirve; ' +
      'conseguirla cuando lo que falta es tierra no cambia nada. Las holguras señalan capacidad ociosa que se puede reasignar, alquilar o reducir. ' +
      'Y cuando hay soluciones múltiples, la gerencia gana libertad: puede elegir el plan que le convenga por facilidad de producción o por ' +
      'compromisos con clientes, sin sacrificar un solo lempira.\n\n' +
      'El precio sombra convierte todo eso en una cifra negociable. Si el precio sombra del jornal es L 180, esa es la cantidad máxima que ' +
      'conviene pagar por un jornal extra: a L 150 se gana, a L 200 se pierde. Y el rango de factibilidad evita el error de escalar esa cifra ' +
      'sin límite: contratar veinte jornales más no rinde veinte veces lo mismo, porque en algún punto la tierra o el capital pasan a ser el ' +
      'nuevo cuello de botella. El rango de optimalidad, por su parte, dice cuánta variación de precios aguanta el plan antes de que haya que ' +
      'rehacerlo, que es exactamente la información que se necesita para decidir cada cuánto revisar la planificación.',
    aplicacionAgropecuaria:
      'Una finca que decide cuántas manzanas sembrar de maíz y de frijol enfrenta exactamente este problema: la tierra, los jornales y el capital ' +
      'de trabajo son limitados, y cada cultivo los consume en proporciones distintas. La respuesta casi nunca es sembrar solo el cultivo de mayor ' +
      'margen por manzana, porque ese suele ser también el que más jornales o más capital exige. ' +
      'El mismo método formula raciones de mínimo costo para aves o ganado: ahí las restricciones son de tipo ≥ —proteína mínima, energía mínima— ' +
      'y el objetivo es minimizar. Es el origen histórico del problema de la dieta, que fue de los primeros que resolvió la programación lineal.\n\n' +
      'El precio sombra tiene una lectura muy concreta en la finca. Si el jornal es el recurso agotado y su precio sombra es L 180, contratar ' +
      'mano de obra adicional a L 150 el jornal deja L 30 de ganancia por cada uno; a L 200 hace perder L 20. Y si el recurso agotado es la ' +
      'tierra, el precio sombra es exactamente lo máximo que conviene pagar por alquilar una manzana más para ese ciclo.',
    resumen:
      'Un modelo lineal tiene variables de decisión, función objetivo y restricciones. La región factible es la superposición de todas las ' +
      'restricciones, y el óptimo —si existe— está siempre en un vértice. El procedimiento es hallar los vértices, evaluar Z en cada uno y ' +
      'quedarse con el mejor; la línea de indiferencia lo comprueba visualmente. Las restricciones activas señalan dónde invertir, y los ' +
      'desenlaces sin número —soluciones múltiples, región no acotada, infactibilidad— son información gerencial, no fracasos del método. ' +
      'El análisis de sensibilidad cierra el tema: el precio sombra dice cuánto vale una unidad más de cada recurso, el rango de factibilidad ' +
      'hasta dónde vale ese precio, y el rango de optimalidad cuánto pueden moverse los precios antes de que haya que cambiar el plan.',
    fuenteIds: ['ppt-grafico', 'chase2021', 'heizer2020', 'stevenson2021'],
    ejemploResueltoId: 'graf-01',
    practicaGuiadaId: 'graf-02',
  },

  simplex: {
    tema: 'simplex',
    resultadoAprendizaje:
      'El estudiante lleva un modelo de programación lineal a la forma estándar, construye el tableau, ejecuta las iteraciones del método simplex identificando en cada una la variable que entra y la que sale, resuelve modelos con restricciones ≥ e = mediante el método de las dos fases, lee la solución y los precios sombra en el tableau final, y reconoce la infactibilidad, la no acotación, los óptimos múltiples y la degeneración.',
    conocimientosPrevios: [
      'En el método gráfico, ¿por qué basta con revisar las esquinas de la región factible y no todos los puntos de adentro?',
      'Si un problema tiene cuatro productos en lugar de dos, ¿cómo lo dibujaría?',
      'Una restricción dice «se dispone de 96 unidades de material» y el plan usa 80. ¿Cómo escribiría esa desigualdad como una igualdad, sin cambiar lo que significa?',
    ],
    explicacion:
      'El método gráfico funciona porque el óptimo está en un vértice y con dos variables los vértices se pueden dibujar. Con tres variables el dibujo ya es un ' +
      'poliedro difícil de leer, y con cuatro no hay dibujo posible. El **método simplex** conserva la idea —recorrer vértices— pero la ejecuta con álgebra, ' +
      'de modo que sirve para cualquier número de variables. Fue desarrollado por George Dantzig en 1947 y sigue siendo el algoritmo con el que se planifican ' +
      'refinerías, dietas animales, rutas de transporte y turnos de personal en todo el mundo.\n\n' +
      'El primer movimiento es convertir las desigualdades en igualdades, porque el álgebra de sistemas trabaja con ecuaciones. A cada restricción de tipo ≤ se le ' +
      'suma una **variable de holgura**, que mide el recurso que queda sin usar: «12 mesas + 8 sillas ≤ 96» se vuelve «12 mesas + 8 sillas + h₁ = 96», donde h₁ es ' +
      'el material sobrante. La holgura no es un truco: es una cantidad con significado, y su valor final dice exactamente cuánto recurso quedó ocioso.\n\n' +
      'A cada restricción de tipo ≥ se le **resta** una **variable de exceso**, que mide cuánto se supera el mínimo exigido. Pero al restarse, esa variable no puede ' +
      'servir de punto de partida —tendría que valer un número negativo para arrancar—, y por eso se le agrega además una **variable artificial**. Las artificiales ' +
      'no representan nada del problema real: son un andamio que permite empezar. Todo el trabajo de la fase 1 consiste en quitarlas.\n\n' +
      'El **tableau** es la tabla donde se lleva el sistema. Cada fila es una restricción, cada columna una variable, y la última fila —la fila objetivo, escrita como ' +
      '**zⱼ − cⱼ**— dice cuánto cambiaría Z si esa variable entrara a la base. Las variables que están **en la base** valen lo que indica su lado derecho; todas las ' +
      'demás valen cero. Cada tableau es un vértice de la región factible: exactamente el mismo vértice que se vería en el dibujo, si el dibujo fuera posible.\n\n' +
      'Una **iteración** cambia de vértice en dos decisiones. Primero se elige **quién entra**: la columna cuya fila objetivo indica la mayor mejora —la más negativa ' +
      'si se maximiza, la más positiva si se minimiza—. Es la variable que más aporta por cada unidad que crece. Después se elige **quién sale**, con la **prueba de la ' +
      'razón mínima**: se divide cada lado derecho entre el coeficiente positivo de la columna entrante, y sale la fila de menor cociente. Esa razón es la respuesta a ' +
      '«¿hasta dónde puedo crecer antes de que algo se agote?», y la menor manda porque es el primer recurso que se termina. Las filas con coeficiente cero o negativo ' +
      'no limitan nada, y por eso no dan razón. En el cruce de la columna que entra y la fila que sale está el **elemento pivote**: se divide toda esa fila entre él ' +
      'para dejar un 1, y se restan múltiplos de la fila pivote a las demás hasta dejar ceros en el resto de la columna.\n\n' +
      'El procedimiento se detiene cuando ninguna columna mejora el objetivo. Ese tableau es el óptimo, y trae la respuesta completa: los valores de las variables, el ' +
      'valor de Z, las holguras y —en la fila objetivo, bajo la columna de cada holgura— los **precios sombra**. No hace falta un cálculo aparte: el análisis de ' +
      'sensibilidad ya está dentro del tableau final.\n\n' +
      'Cuando hay variables artificiales se usa el **método de las dos fases**. La **fase 1** ignora la función objetivo real y minimiza W, la suma de las artificiales. ' +
      'Si W llega a cero, todas las artificiales salieron y se tiene un vértice legítimo del problema real, desde el cual arranca la **fase 2** con el objetivo ' +
      'verdadero. Si W se queda en un valor positivo, ninguna combinación de valores satisface todas las restricciones a la vez: el problema es **infactible**, y eso ' +
      'es una respuesta, no un fracaso.\n\n' +
      'El **método de la Gran M** llega al mismo sitio por otro camino, y el laboratorio permite alternar entre los dos. En lugar de resolver un problema ' +
      'auxiliar, castiga cada artificial dentro de la **misma** función objetivo con un coeficiente −M al maximizar, o +M al minimizar, donde M es un número ' +
      'arbitrariamente grande. Producir una artificial saldría carísimo, así que el algoritmo las expulsa en cuanto puede y todo se resuelve de corrido, sin ' +
      'fases. Aquí la infactibilidad se reconoce al final: si al terminar alguna artificial sigue en la base con valor positivo, ni un castigo arbitrariamente ' +
      'grande consiguió sacarla, y por lo tanto no existe ningún punto factible.\n\n' +
      'Lo delicado de la Gran M es la aritmética. Cada casilla de la fila objetivo queda de la forma **a + bM**, y para compararlas manda el coeficiente de M: ' +
      '«−5 − M» es más negativo que «−5», y «−3 − 2M» es más negativo que «−10 − M» por mucho que 10 sea mayor que 3. Solo cuando los términos en M empatan se ' +
      'mira la parte constante. Por eso conviene **no** darle a M un valor numérico concreto: si se elige corto, el resultado sale mal; si se elige enorme, la ' +
      'parte real del número se pierde entre los decimales. M no vale nada; solo domina.\n\n' +
      'Hay un tercer camino que no agrega ninguna artificial: el **dual simplex**. Es el simplex con el orden del trabajo invertido. El primal arranca de una ' +
      'solución **factible** que no es óptima y mejora el objetivo sin salirse nunca de la región factible; el dual arranca de una solución **óptima** que no es ' +
      'factible y va arreglando restricciones sin perder nunca la optimalidad. Para eso lleva todas las restricciones a la forma ≤ —las de tipo ≥ se multiplican ' +
      'por −1— y acepta que el lado derecho quede negativo, que es justamente lo que sabe corregir.\n\n' +
      'Sus dos reglas son las del primal al revés. Primero se elige **la fila que sale**: la del lado derecho más negativo, es decir la restricción que más lejos ' +
      'está de cumplirse. Después **la columna que entra**: entre las que tienen coeficiente **negativo** en esa fila —solo un negativo convierte el lado derecho ' +
      'negativo en positivo—, la de menor razón |(zⱼ − cⱼ) ÷ aᵣⱼ| entre el valor de la fila objetivo y ese coeficiente, que es lo que impide perder la optimalidad por el camino. Se termina cuando ningún lado ' +
      'derecho es negativo: entonces la solución es factible, y como la optimalidad nunca se perdió, también es óptima.\n\n' +
      'El dual simplex exige dos condiciones de arranque. Que no haya igualdades, porque una igualdad no deja holgura que meter en la base. Y que la base de ' +
      'holguras ya cumpla la prueba de optimalidad, lo que equivale a que todos los coeficientes del objetivo sean positivos en una minimización, o negativos en ' +
      'una maximización. Eso lo deja fuera de la mezcla de productos con márgenes positivos, pero lo hace el método natural de los modelos de **mínimo costo con ' +
      'requerimientos mínimos** —raciones, mezclas, dietas—, que es donde más aparece en el sector. Ahí resuelve sin una sola variable artificial, con un tableau ' +
      'más corto y sin fase previa. Y cuando el modelo es infactible, no solo lo detecta: deja a la vista la fila que lo demuestra.\n\n' +
      'Hasta aquí, tres formas de tratar las artificiales. El **simplex revisado** es otra cosa: no cambia el camino sino la contabilidad. Recorre exactamente ' +
      'los mismos vértices que el simplex corriente, con las mismas reglas de entrada y de salida, pero **no arrastra el tableau**. En su lugar guarda solo ' +
      '**B⁻¹**, la inversa de la base —una matriz cuadrada del tamaño del número de restricciones— y calcula cada columna cuando la necesita.\n\n' +
      'Cada iteración tiene dos mitades. Primero se calculan los **multiplicadores** y = c_B B⁻¹, un vector con una componente por restricción, y con ellos se ' +
      'valora cada columna candidata mediante un producto escalar: zⱼ − cⱼ = y · Aⱼ − cⱼ. Ese paso se llama **valoración**, y de ahí sale la ventaja del método: ' +
      'no hace falta tener el cuerpo del tableau actualizado para saber qué conviene meter a la base. Después, ya elegida la entrante, se calcula **solo esa ' +
      'columna** expresada en la base, B⁻¹Aₑ, se hace con ella la prueba de la razón mínima contra x_B = B⁻¹b, y se actualiza B⁻¹ con las mismas operaciones de ' +
      'fila del pivoteo.\n\n' +
      'La cuenta explica por qué importa. Con n variables y m restricciones, el tableau actualiza m × (n + 1) casillas en cada pivote; el revisado mantiene m² de ' +
      'B⁻¹ más dos vectores de largo m. Con tres variables y tres restricciones la diferencia es pequeña —21 casillas frente a 15—, pero en un modelo real hay ' +
      'decenas de restricciones y miles de variables, y ahí es abismal. Por eso **todos los solucionadores industriales trabajan así por dentro**. Hay una segunda ' +
      'ventaja, menos visible: como B⁻¹ se puede recalcular desde cero cuando haga falta, el error numérico no se acumula indefinidamente, cosa que en el tableau ' +
      'sí ocurre.\n\n' +
      'Y hay un regalo pedagógico: los multiplicadores **son los precios sombra de la base actual**. En el tableau había que llegar al final para leerlos; aquí ' +
      'aparecen calculados explícitamente en cada iteración, y se ve cómo se acercan a los definitivos.\n\n' +
      '¿Cuál usar? Todos dan el mismo óptimo y los mismos precios sombra. Las dos fases separan el problema en dos preguntas ordenadas —«¿existe alguna ' +
      'solución?» y después «¿cuál es la mejor?»—; la Gran M lo resuelve de una vez, pero obliga a manejar la M a mano; el dual simplex evita las artificiales ' +
      'por completo, cuando el modelo se lo permite; y el revisado hace lo mismo que las dos fases con mucha menos aritmética. Resolver el mismo ejercicio por ' +
      'varios caminos y comprobar que coinciden es el mejor ejercicio del tema.\n\n' +
      'El tableau final trae además el **análisis de sensibilidad** completo, sin un solo cálculo aparte: hay que saber dónde mirar, y eso es la mitad del tema. ' +
      'En la fila objetivo, bajo la holgura de cada restricción, está su **precio sombra**; bajo cada variable que quedó fuera del plan, su **costo reducido**, que ' +
      'es cuánto le falta a su coeficiente para que conviniera producirla. Y el cuerpo del tableau es B⁻¹, la matriz que traduce cambios en los lados derechos a ' +
      'cambios en las variables básicas.\n\n' +
      'De ahí salen los dos rangos. El **rango de factibilidad** dice hasta dónde vale un precio sombra: si el lado derecho cambia en Δ, las básicas pasan a valer ' +
      'x_B + Δ·d con d la columna de B⁻¹ de esa restricción, y el intervalo es el que las mantiene no negativas. Dentro de él cada unidad adicional rinde ' +
      'exactamente el precio sombra; fuera, otra restricción pasa a mandar y hay que rehacer el análisis —y ahí es donde sirve el dual simplex, que recupera la ' +
      'optimalidad desde la base anterior en vez de empezar de cero—. El **rango de optimalidad** dice cuánto puede moverse un coeficiente antes de que convenga ' +
      'cambiar el plan: dentro del intervalo cambia la ganancia, no la decisión.\n\n' +
      'El tableau también avisa de las situaciones especiales. Si al terminar una variable **no básica** tiene zⱼ − cⱼ = 0, se la puede meter a la base sin cambiar Z: ' +
      'hay **óptimos múltiples**. Si al elegir la columna que entra ninguna fila da razón, el problema **no está acotado**. Y si una variable básica vale cero, la ' +
      'solución es **degenerada**: más restricciones de las necesarias se cruzan en el mismo vértice, la siguiente iteración puede no mejorar nada y los precios ' +
      'sombra dejan de ser únicos.',
    glosario: [
      { termino: 'Forma estándar', definicion: 'Modelo con todas las restricciones convertidas en igualdades, lados derechos no negativos y todas las variables no negativas. Es lo único que el simplex sabe procesar.' },
      { termino: 'Variable de holgura', definicion: 'Se suma a una restricción ≤ y mide el recurso que queda sin usar. Su valor final es la holgura del recurso.' },
      { termino: 'Variable de exceso', definicion: 'Se resta de una restricción ≥ y mide cuánto se supera el mínimo exigido. También se le llama variable de superávit.' },
      { termino: 'Variable artificial', definicion: 'Variable sin significado real que se agrega a las restricciones ≥ e = solo para tener una base de arranque. La fase 1 existe para expulsarlas; si alguna sobrevive con valor positivo, el problema es infactible.' },
      { termino: 'Tableau', definicion: 'Tabla que contiene el sistema de ecuaciones en cada paso. Cada tableau representa un vértice de la región factible.' },
      { termino: 'Base', definicion: 'Conjunto de variables que en el tableau actual toman un valor distinto de cero. Tiene tantas variables como restricciones.' },
      { termino: 'Variable básica', definicion: 'La que está en la base. Su valor es el lado derecho de su fila. Las no básicas valen cero.' },
      { termino: 'Fila objetivo (zⱼ − cⱼ)', definicion: 'Última fila del tableau. Dice cuánto cambia Z por cada unidad que entre de esa variable. También se le llama fila de costos reducidos.' },
      { termino: 'Variable entrante', definicion: 'La que pasa a la base en esta iteración: la de mayor mejora en la fila objetivo.' },
      { termino: 'Variable saliente', definicion: 'La que abandona la base: la que da la menor razón en la prueba de la razón mínima, porque es la primera que llegaría a cero.' },
      { termino: 'Prueba de la razón mínima', definicion: 'División de cada lado derecho entre el coeficiente positivo de la columna entrante. Determina hasta dónde puede crecer la variable que entra sin volver negativa a ninguna otra.' },
      { termino: 'Elemento pivote', definicion: 'El número en el cruce de la columna que entra y la fila que sale. Toda la fila se divide entre él y con esa fila se hacen ceros en el resto de la columna.' },
      { termino: 'Método de las dos fases', definicion: 'Procedimiento para modelos con artificiales: la fase 1 minimiza su suma hasta llegar a una solución factible, y la fase 2 optimiza el objetivo real.' },
      { termino: 'Método de la Gran M', definicion: 'Alternativa a las dos fases: penaliza cada artificial con una constante M arbitrariamente grande dentro de la propia función objetivo, y resuelve de corrido. Llega al mismo óptimo y a los mismos precios sombra.' },
      { termino: 'Constante M', definicion: 'Número «arbitrariamente grande» del método de la Gran M. No se le da un valor: se arrastra como símbolo, y al comparar dos casillas de la fila objetivo manda siempre su coeficiente.' },
      { termino: 'Dual simplex', definicion: 'Variante que mantiene la optimalidad mientras busca la factibilidad, al revés que el simplex corriente. No usa variables artificiales, pero exige arrancar de una base que ya cumpla la prueba de optimalidad.' },
      { termino: 'Costo reducido', definicion: 'Valor de una variable **no básica** en la fila objetivo. Dice cuánto tendría que mejorar su coeficiente para que conviniera meterla al plan. Es la respuesta con número a «¿por qué no producimos esto?».' },
      { termino: 'Simplex revisado', definicion: 'Forma de ejecutar el simplex que mantiene solo la inversa de la base, B⁻¹, en lugar del tableau completo. Recorre los mismos vértices con mucha menos aritmética; es como trabajan por dentro los solucionadores industriales.' },
      { termino: 'Multiplicadores del simplex', definicion: 'Vector y = c_B B⁻¹, con una componente por restricción. Sirve para valorar columnas sin actualizar el tableau, y en la base óptima son exactamente los precios sombra.' },
      { termino: 'Valoración de columnas', definicion: 'Calcular zⱼ − cⱼ = y · Aⱼ − cⱼ para las columnas candidatas mediante un producto escalar. Es el paso que permite al simplex revisado decidir qué entra sin llevar el cuerpo del tableau actualizado.' },
      { termino: 'Rango de factibilidad', definicion: 'Intervalo dentro del cual puede moverse el lado derecho de una restricción sin que cambie la base. Mientras el recurso se mantenga ahí, su precio sombra sigue valiendo exactamente lo mismo.' },
      { termino: 'Rango de optimalidad', definicion: 'Intervalo dentro del cual puede moverse un coeficiente de la función objetivo sin que cambie el plan óptimo. Dentro de él cambia la ganancia, no la decisión.' },
      { termino: 'Razón dual', definicion: 'Cociente |(zⱼ − cⱼ) ÷ aᵣⱼ| calculado sobre las columnas con coeficiente negativo en la fila que sale. El mínimo señala la columna que entra sin perder la optimalidad.' },
      { termino: 'Precio sombra', definicion: 'Cuánto cambia Z por cada unidad adicional del lado derecho de una restricción. En el tableau final aparece en la fila objetivo, bajo la columna de la holgura de esa restricción.' },
      { termino: 'Solución degenerada', definicion: 'Aquella en la que una variable básica vale cero. Indica restricciones redundantes cruzándose en el mismo vértice y puede producir iteraciones que no mejoran nada.' },
      { termino: 'Problema infactible', definicion: 'Aquel en el que ninguna combinación de valores cumple todas las restricciones. El simplex lo detecta porque la fase 1 termina con W mayor que cero.' },
      { termino: 'Problema no acotado', definicion: 'Aquel en el que el objetivo puede mejorar sin límite. El simplex lo detecta porque la columna que entra no tiene ningún coeficiente positivo que la frene.' },
    ],
    formulas: [
      {
        nombre: 'Forma estándar de una restricción ≤',
        tex: '\\sum_{j} a_{ij} x_j + h_i = b_i',
        variables: [
          { simbolo: 'a_{ij}', significado: 'consumo del recurso i por cada unidad de la variable j' },
          { simbolo: 'x_j', significado: 'variable de decisión j' },
          { simbolo: 'h_i', significado: 'holgura: recurso i que queda sin usar' },
          { simbolo: 'b_i', significado: 'cantidad disponible del recurso i' },
        ],
        cuandoUsarla: 'Siempre que una restricción exprese un recurso limitado. La holgura entra a la base inicial y no necesita variable artificial.',
      },
      {
        nombre: 'Forma estándar de una restricción ≥',
        tex: '\\sum_{j} a_{ij} x_j - e_i + a_i = b_i',
        variables: [
          { simbolo: 'e_i', significado: 'exceso: cuánto se supera el mínimo exigido' },
          { simbolo: 'a_i', significado: 'variable artificial, sin significado real' },
        ],
        cuandoUsarla: 'Cuando la restricción exige un mínimo —proteína en una ración, entregas comprometidas—. Obliga a usar el método de las dos fases.',
      },
      {
        nombre: 'Fila objetivo',
        tex: 'z_j - c_j = \\mathbf{c}_B \\mathbf{B}^{-1} \\mathbf{A}_j - c_j',
        variables: [
          { simbolo: 'c_j', significado: 'coeficiente de la variable j en la función objetivo' },
          { simbolo: '\\mathbf{c}_B', significado: 'coeficientes de las variables que están en la base' },
          { simbolo: '\\mathbf{B}^{-1}', significado: 'inversa de la matriz de las columnas básicas' },
          { simbolo: '\\mathbf{A}_j', significado: 'columna original de la variable j' },
        ],
        cuandoUsarla: 'Para decidir qué variable entra. Al maximizar entra la más negativa; al minimizar, la más positiva. Si ninguna cumple, el tableau ya es óptimo.',
      },
      {
        nombre: 'Prueba de la razón mínima',
        tex: '\\theta = \\min_{i\\,:\\,a_{ie} > 0} \\frac{b_i}{a_{ie}}',
        variables: [
          { simbolo: 'a_{ie}', significado: 'coeficiente de la fila i en la columna que entra' },
          { simbolo: 'b_i', significado: 'lado derecho de la fila i en el tableau actual' },
          { simbolo: '\\theta', significado: 'valor que tomará la variable entrante' },
        ],
        cuandoUsarla: 'Para decidir qué variable sale. Solo participan las filas con coeficiente positivo: las demás no limitan el crecimiento. Si ninguna fila participa, el problema no está acotado.',
      },
      {
        nombre: 'Objetivo de la fase 1',
        tex: '\\text{Minimizar} \\quad W = \\sum_i a_i',
        variables: [
          { simbolo: 'a_i', significado: 'variable artificial de la restricción i' },
          { simbolo: 'W', significado: 'suma de las artificiales: mide cuánto falta para ser factible' },
        ],
        cuandoUsarla: 'Cuando el modelo tiene restricciones ≥ o =. Si el mínimo de W es cero se pasa a la fase 2; si es positivo, el problema es infactible.',
      },
      {
        nombre: 'Valoración de columnas del simplex revisado',
        tex: '\\mathbf{y} = \\mathbf{c}_B \\mathbf{B}^{-1} \\qquad z_j - c_j = \\mathbf{y} \\cdot \\mathbf{A}_j - c_j',
        variables: [
          { simbolo: '\\mathbf{B}^{-1}', significado: 'inversa de la base actual; lo único que el método guarda entre iteraciones' },
          { simbolo: '\\mathbf{y}', significado: 'multiplicadores: una componente por restricción, y en el óptimo los precios sombra' },
          { simbolo: '\\mathbf{A}_j', significado: 'columna **original** de la variable j, sin actualizar' },
        ],
        cuandoUsarla:
          'En el simplex revisado, para decidir qué columna entra sin tener el tableau actualizado. Cada valoración es un producto escalar; solo después se calcula B⁻¹Aₑ, y únicamente para la columna que entra.',
      },
      {
        nombre: 'Razón mínima del dual simplex',
        tex: '\\theta = \\min_{j\\,:\\,a_{r\\,j} < 0} \\left| \\frac{z_j - c_j}{a_{r\\,j}} \\right|',
        variables: [
          { simbolo: 'r', significado: 'fila que sale: la del lado derecho más negativo' },
          { simbolo: 'a_{r\\,j}', significado: 'coeficiente de la columna j en esa fila; solo participan los negativos' },
          { simbolo: 'z_j - c_j', significado: 'valor de la columna j en la fila objetivo' },
        ],
        cuandoUsarla:
          'En el dual simplex, para decidir qué columna entra una vez elegida la fila que sale. Es el espejo de la razón mínima del primal: allá se dividía por la columna que entra, aquí por la fila que sale. Si ninguna columna tiene coeficiente negativo en esa fila, el modelo es infactible.',
      },
      {
        nombre: 'Objetivo penalizado del método de la Gran M',
        tex: '\\text{Max} \\quad Z = \\sum_j c_j x_j - M \\sum_i a_i \\qquad \\text{Min} \\quad Z = \\sum_j c_j x_j + M \\sum_i a_i',
        variables: [
          { simbolo: 'M', significado: 'constante arbitrariamente grande; no toma ningún valor numérico' },
          { simbolo: 'a_i', significado: 'variable artificial de la restricción i' },
          { simbolo: 'c_j', significado: 'coeficiente real de la variable j en la función objetivo' },
        ],
        cuandoUsarla:
          'Como alternativa a las dos fases. El signo lo decide el sentido del problema: la penalización siempre tiene que empeorar Z. Al comparar dos casillas de la fila objetivo manda el coeficiente de M, y solo cuando empatan se mira la parte constante.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Sumar la variable de exceso en lugar de restarla en una restricción ≥.',
        porQueOcurre: 'Por analogía con la holgura, que sí se suma. El estudiante aplica el mismo gesto sin pensar en el significado.',
        comoEvitarlo: 'Pregúntese qué mide la variable. En «x ≥ 10», si x vale 14 hay 4 de más: 14 − 4 = 10. La variable se resta porque representa un sobrante sobre el mínimo, no un faltante.',
      },
      {
        error: 'Olvidar la variable artificial en una restricción ≥ y arrancar con el exceso en la base.',
        porQueOcurre: 'Parece que basta con haber convertido la desigualdad en igualdad.',
        comoEvitarlo: 'La base inicial toma el valor del lado derecho. Con «−e₁ = 10» el exceso tendría que valer −10, que es imposible. Por eso hace falta la artificial: es la única forma de arrancar con valores no negativos.',
      },
      {
        error: 'Incluir en la prueba de la razón mínima las filas con coeficiente negativo o cero.',
        porQueOcurre: 'Se aplica la división mecánicamente a todas las filas, y con coeficientes negativos salen razones negativas que parecen «las menores».',
        comoEvitarlo: 'Solo limita la fila donde crecer consume algo. Con coeficiente negativo, hacer crecer la variable entrante *aumenta* esa básica en vez de reducirla, así que nunca la vuelve negativa: no impone ningún tope.',
      },
      {
        error: 'Elegir la variable que entra por el coeficiente de la función objetivo original en lugar de por la fila zⱼ − cⱼ del tableau actual.',
        porQueOcurre: 'En el primer tableau ambas coinciden salvo el signo, y el estudiante generaliza esa coincidencia.',
        comoEvitarlo: 'Después del primer pivote la fila objetivo ya no es la función objetivo: incorpora el costo de oportunidad de sacar a las variables que están en la base. Hay que leer siempre el tableau vigente.',
      },
      {
        error: 'Detenerse cuando la fila objetivo tiene ceros, creyendo que es la señal de óptimo.',
        porQueOcurre: 'Confusión entre «no hay valores que mejoren» y «hay ceros».',
        comoEvitarlo: 'El criterio de parada es que no quede ningún valor que mejore: ninguno negativo si se maximiza, ninguno positivo si se minimiza. Un cero en una columna no básica no impide parar: al contrario, avisa de que hay óptimos múltiples.',
      },
      {
        error: 'Dar por infactible un problema porque quedan artificiales en la base al terminar la fase 1.',
        porQueOcurre: 'Se confunde «hay una artificial en la base» con «una artificial vale más que cero».',
        comoEvitarlo: 'Lo que importa es el valor, no la presencia. Una artificial básica en cero es inofensiva: se la saca con un pivote de razón cero, o su fila resulta ser una restricción redundante. Solo hay infactibilidad si W termina siendo mayor que cero.',
      },
      {
        error: 'En la Gran M, comparar las casillas de la fila objetivo por la parte constante en lugar de por el coeficiente de M.',
        porQueOcurre: 'Se mira el número que salta a la vista. Entre «−3 − 2M» y «−10 − M» parece que manda el 10.',
        comoEvitarlo: 'M es arbitrariamente grande, así que −2M pesa más que cualquier constante: «−3 − 2M» es el más negativo. Compare primero los coeficientes de M y solo baje a la parte constante cuando empaten.',
      },
      {
        error: 'En el simplex revisado, valorar las columnas con los coeficientes ya actualizados del tableau.',
        porQueOcurre: 'Se arrastra la costumbre del tableau, donde todo está actualizado y basta con leer la fila objetivo.',
        comoEvitarlo: 'La valoración usa la columna **original** del modelo: zⱼ − cⱼ = y · Aⱼ − cⱼ, con Aⱼ tal como se escribió en la forma estándar. Ese es justamente el punto del método —no hay columnas actualizadas que leer, salvo la que entra—.',
      },
      {
        error: 'Creer que el simplex revisado da un resultado distinto o llega por otro camino.',
        porQueOcurre: 'Se presenta como «otro método», y el procedimiento en la hoja se ve muy diferente.',
        comoEvitarlo: 'Recorre exactamente los mismos vértices, en el mismo orden, con las mismas reglas de entrada y de salida. Lo único que cambia es lo que se anota por el camino. Si los dos dieran resultados distintos, uno de los dos estaría mal hecho.',
      },
      {
        error: 'En el dual simplex, elegir primero la columna y después la fila, como en el primal.',
        porQueOcurre: 'Se aplica de memoria el orden aprendido con el simplex corriente.',
        comoEvitarlo: 'El dual invierte las dos decisiones porque invierte el problema: aquí la optimalidad ya está resuelta y lo que falta es la factibilidad, así que primero se busca la restricción más incumplida —el lado derecho más negativo— y solo después qué variable la arregla.',
      },
      {
        error: 'En la razón dual, incluir las columnas con coeficiente positivo en la fila que sale.',
        porQueOcurre: 'Por analogía con la razón del primal, donde participan los coeficientes positivos.',
        comoEvitarlo: 'Pivotear sobre un coeficiente positivo dejaría el lado derecho todavía más negativo. Solo un coeficiente negativo cambia el signo y arregla la fila; si no hay ninguno, el modelo es infactible y esa fila lo demuestra.',
      },
      {
        error: 'Intentar resolver por dual simplex una maximización con márgenes positivos.',
        porQueOcurre: 'Se elige el método por la forma de las restricciones —«tiene ≥, entonces dual»— sin mirar la función objetivo.',
        comoEvitarlo: 'El dual necesita que la base de holguras ya sea óptima, y con márgenes positivos en una maximización el origen no lo es: cualquier producto mejora Z. Para esos modelos van las dos fases o la Gran M; el dual es para minimizar costos con requerimientos mínimos.',
      },
      {
        error: 'Darle a M un valor numérico concreto —1 000, 1 000 000— para poder operar.',
        porQueOcurre: 'Arrastrar un símbolo por todo el tableau parece más difícil que sustituirlo por un número grande.',
        comoEvitarlo: 'Si M queda corto, la penalización no alcanza y el resultado sale mal; si queda enorme, la parte real del número se pierde entre los decimales. Lleve cada casilla como «a + bM» y opere con las dos partes por separado.',
      },
      {
        error: 'Interpretar la variable artificial como si midiera algo del problema real.',
        porQueOcurre: 'Aparece en el tableau junto a las demás y se le atribuye significado.',
        comoEvitarlo: 'La artificial es un andamio para arrancar. No corresponde a ningún recurso ni a ninguna decisión, y por eso una vez fuera de la base tiene prohibido volver a entrar.',
      },
      {
        error: 'Dar el incremento admisible cuando se pregunta hasta qué valor puede subir un recurso.',
        porQueOcurre: 'El cálculo produce un Δ, y ese es el número que queda a la vista al terminar.',
        comoEvitarlo: 'El rango de factibilidad se expresa en las unidades del recurso, no en la variación: al Δ hay que sumarle la disponibilidad actual. Compruébelo preguntándose si la cifra tiene sentido como cantidad disponible.',
      },
      {
        error: 'Confundir el costo reducido con el valor a partir del cual conviene producir.',
        porQueOcurre: 'Los dos números aparecen juntos y responden a la misma pregunta desde ángulos distintos.',
        comoEvitarlo: 'El costo reducido es lo que **falta**; el umbral es el coeficiente actual **más** lo que falta. Si el sorgo aporta L 9 000 y su costo reducido es L 630, conviene sembrarlo a partir de L 9 630, no de L 630.',
      },
      {
        error: 'Suponer que el precio sombra vale para cualquier cantidad adicional del recurso.',
        porQueOcurre: 'El número es único y no lleva una etiqueta que diga hasta dónde.',
        comoEvitarlo: 'Todo precio sombra tiene un rango de validez. Más allá del tope, otra restricción se vuelve el cuello de botella y el precio cae: comprar sin mirar el rango es el error de inversión que este análisis existe para evitar.',
      },
      {
        error: 'Leer el precio sombra en la columna de la variable de decisión en lugar de en la de la holgura.',
        porQueOcurre: 'Se busca el número «bajo el nombre del recurso», y en el tableau el nombre que se parece al recurso es el de la variable.',
        comoEvitarlo: 'El precio sombra responde a «¿cuánto vale una unidad más de este recurso?», y el recurso está representado por su holgura. La columna de la variable de decisión dice otra cosa: cuánto costaría forzar a producir una unidad de algo que no conviene.',
      },
    ],
    interpretacionGerencial:
      'El tableau final es un informe gerencial completo, no solo un número. La fila de las variables básicas dice **qué hacer**: cuánto producir de cada cosa. Las ' +
      'holguras dicen **qué sobra**, y por lo tanto qué capacidad se puede reasignar, alquilar o reducir sin afectar el resultado. Las holguras que salieron de la base ' +
      'señalan **los cuellos de botella reales**: son los únicos recursos en los que invertir cambia algo.\n\n' +
      'La fila objetivo cierra el informe con los **precios sombra**, que es la información que un gerente necesita para negociar. Si el precio sombra de la mano de obra ' +
      'es L 180 por jornal, contratar a L 150 deja L 30 de ganancia por jornal, y contratar a L 200 hace perder L 20. El número no es una opinión: es el máximo que la ' +
      'operación puede pagar sin destruir margen.\n\n' +
      'Los desenlaces sin número también son información. **Infactible** significa que la gerencia está exigiendo cosas incompatibles —un mínimo de entregas que supera ' +
      'la capacidad, por ejemplo—, y el valor está en descubrirlo antes de comprometerse. **No acotado** casi siempre significa que se olvidó una restricción que en la ' +
      'realidad existe: nadie vende cantidad ilimitada. **Óptimos múltiples** es una ventaja: hay varios planes con el mismo resultado económico y se puede elegir por ' +
      'criterios que el modelo no recoge, como el riesgo o el empleo que genera cada uno.',
    aplicacionAgropecuaria:
      'La formulación de raciones de mínimo costo es el uso más extendido del simplex en el sector, y no se puede resolver gráficamente porque cada ingrediente ' +
      'disponible es una variable: maíz, sorgo, soya, harina de pescado, melaza, premezcla mineral. Las restricciones son de tipo ≥ para los requerimientos —proteína ' +
      'mínima, energía metabolizable mínima, calcio mínimo—, de tipo ≤ para los límites de inclusión de cada ingrediente, y de tipo = para que las partes sumen ' +
      'exactamente cien. Esa mezcla de relaciones es justamente el caso que exige las dos fases.\n\n' +
      'La planificación de siembra en una finca con varios cultivos tiene la misma forma: cada cultivo es una variable y la tierra, los jornales por época, la ' +
      'maquinaria y el capital de trabajo son restricciones. Con dos cultivos alcanza el método gráfico; con seis, solo el simplex.\n\n' +
      'El precio sombra tiene una lectura directa en la finca. Si el recurso agotado es la tierra preparada y su precio sombra es L 950 por manzana, ese es el máximo ' +
      'que conviene pagar por alquilar una manzana más para ese ciclo. Si el cuello de botella es el jornal en la época de cosecha, el precio sombra dice exactamente ' +
      'hasta cuánto conviene subir el pago para atraer mano de obra. Y si una restricción tiene precio sombra cero, invertir ahí no produce ninguna mejora, por muy ' +
      'importante que parezca el recurso.',
    resumen:
      'El simplex conserva la idea del método gráfico —el óptimo está en un vértice— pero recorre los vértices con álgebra, así que sirve para cualquier número de ' +
      'variables. Primero se lleva el modelo a la forma estándar: holgura en las ≤, exceso más artificial en las ≥, artificial en las =. Cada tableau es un vértice; ' +
      'cada iteración cambia de vértice eligiendo quién entra —la mayor mejora en la fila zⱼ − cⱼ— y quién sale —la menor razón bⱼ/aᵢₑ entre los coeficientes ' +
      'positivos—. Cuando ninguna columna mejora el objetivo, ese tableau es el óptimo y ya contiene todo: los valores de las variables, las holguras y los precios ' +
      'sombra en la fila objetivo. Cuando hacen falta artificiales hay dos caminos equivalentes: **dos fases**, que minimiza primero la suma de las artificiales ' +
      'y declara infactible el modelo si ese mínimo no llega a cero, y **Gran M**, que las penaliza dentro de la misma función objetivo. Y hay un tercero que las ' +
      'evita del todo, el **dual simplex**, que mantiene la optimalidad mientras busca la factibilidad: sirve para minimizar costos con requerimientos mínimos, ' +
      'donde arranca de una base que ya es óptima aunque todavía no sea factible. El **simplex revisado** no cambia el camino sino la contabilidad: recorre los ' +
      'mismos vértices manteniendo solo B⁻¹ en lugar del tableau, que es como trabajan los solucionadores industriales. Todos dan el mismo óptimo y los mismos ' +
      'precios sombra. El método también ' +
      'diagnostica la no acotación ' +
      '—ninguna fila frena a la columna entrante—, los óptimos múltiples —un cero en la fila objetivo fuera de la base— y la degeneración —una variable básica ' +
      'en cero—. El análisis de sensibilidad no exige ningún cálculo aparte: el precio sombra y el costo reducido están en la fila objetivo, y el rango de ' +
      'validez de cada uno sale de B⁻¹, que es el propio cuerpo del tableau.',
    fuenteIds: ['chase2021', 'heizer2020', 'russell2019', 'stevenson2021'],
    ejemploResueltoId: 'simp-01',
    practicaGuiadaId: 'simp-03',
  },

  asignacion: {
    tema: 'asignacion',
    resultadoAprendizaje:
      'El estudiante resuelve problemas de asignación uno a uno con el método húngaro, convierte problemas de maximización, maneja matrices rectangulares y asignaciones prohibidas, e interpreta la solución en términos gerenciales.',
    conocimientosPrevios: [
      'Si cada trabajador eligiera su tarea favorita, ¿qué pasaría si dos quieren la misma?',
      '¿Restar la misma cantidad a toda una fila cambia cuál es la opción más barata de esa fila?',
      '¿Qué haría si tuviera cuatro trabajadores y solo tres tareas?',
    ],
    explicacion:
      'El problema de asignación busca emparejar recursos con tareas uno a uno, minimizando el costo total o maximizando el beneficio. ' +
      'Su dificultad no está en encontrar la mejor opción de cada recurso —eso es trivial— sino en que las opciones compiten: dos trabajadores no pueden ocupar la misma parcela.\n\n' +
      'El **método húngaro** aprovecha una propiedad clave: restar una constante de toda una fila (o de toda una columna) no cambia cuál es la asignación óptima, ' +
      'porque afecta por igual a todas las alternativas de esa fila. Con esa licencia se resta el mínimo de cada fila y luego el de cada columna, ' +
      'de modo que cada fila y cada columna quede con al menos un cero. Los ceros son las asignaciones candidatas.\n\n' +
      'Si se puede elegir un cero por fila sin repetir columna, ya está resuelto. Si no, se traza el menor número posible de líneas que cubran todos los ceros; ' +
      'como hacen falta menos líneas que el tamaño de la matriz, hay que crear ceros nuevos: se resta el menor valor no cubierto de todas las celdas no cubiertas ' +
      'y se suma en las cubiertas dos veces. Se repite hasta que las líneas necesarias igualen el tamaño de la matriz.\n\n' +
      'Tres variantes aparecen siempre. **Maximización**: se convierte restando cada valor del mayor de la matriz, con lo que se obtiene una matriz de oportunidad perdida. ' +
      '**Matrices rectangulares**: se agregan filas o columnas ficticias con costo cero, y lo que quede asignado a ellas es lo que no se atiende. ' +
      '**Asignaciones prohibidas**: se tratan como un costo prohibitivamente alto para que el método las evite.',
    glosario: [
      { termino: 'Asignación', definicion: 'Emparejamiento uno a uno entre recursos y tareas.' },
      { termino: 'Matriz de costos', definicion: 'Tabla con el costo (o beneficio) de asignar cada recurso a cada tarea.' },
      { termino: 'Reducción por filas', definicion: 'Restar a cada fila su valor mínimo.' },
      { termino: 'Reducción por columnas', definicion: 'Restar a cada columna su valor mínimo, después de la reducción por filas.' },
      { termino: 'Cobertura de ceros', definicion: 'Mínimo número de líneas horizontales y verticales que cubren todos los ceros.' },
      { termino: 'Matriz de oportunidad perdida', definicion: 'Resultado de restar cada beneficio del mayor de la matriz, para convertir maximización en minimización.' },
      { termino: 'Fila o columna ficticia', definicion: 'Fila o columna con costo cero que se agrega para cuadrar una matriz rectangular.' },
      { termino: 'Asignación prohibida', definicion: 'Combinación recurso-tarea que no se puede realizar.' },
    ],
    formulas: [
      {
        nombre: 'Conversión de maximización',
        tex: 'c_{ij} = \\max(b) - b_{ij}',
        variables: [
          { simbolo: 'b_{ij}', significado: 'beneficio de asignar el recurso i a la tarea j' },
          { simbolo: '\\max(b)', significado: 'mayor beneficio de toda la matriz' },
        ],
        cuandoUsarla: 'Cuando el problema pide maximizar. Minimizar la oportunidad perdida equivale a maximizar el beneficio.',
      },
      {
        nombre: 'Ajuste de la matriz tras la cobertura',
        tex: 'c_{ij}\' = \\begin{cases} c_{ij} - k & \\text{no cubierta} \\\\ c_{ij} + k & \\text{cubierta dos veces} \\\\ c_{ij} & \\text{cubierta una vez} \\end{cases}',
        variables: [{ simbolo: 'k', significado: 'menor valor entre las celdas no cubiertas' }],
        cuandoUsarla: 'Cuando el número de líneas de cobertura es menor que el tamaño de la matriz.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Elegir el mínimo de cada fila sin verificar que las columnas no se repitan.',
        porQueOcurre: 'Parece obvio dar a cada recurso su mejor tarea.',
        comoEvitarlo: 'Ese es justo el problema que el método resuelve: el óptimo global suele exigir que alguien acepte su segunda opción.',
      },
      {
        error: 'Resolver una maximización sin convertirla.',
        porQueOcurre: 'El método se aplica mecánicamente sin leer el objetivo.',
        comoEvitarlo: 'Revise siempre si el enunciado pide costo, tiempo o combustible (minimizar) o eficiencia, afinidad o rendimiento (maximizar).',
      },
      {
        error: 'Calcular el total en la matriz reducida.',
        porQueOcurre: 'Es la matriz que se tiene a la vista al final.',
        comoEvitarlo: 'Las reducciones sirvieron para encontrar qué asignar, no cuánto cuesta. El total se lee en la matriz original.',
      },
      {
        error: 'Ignorar que puede haber varias soluciones óptimas.',
        porQueOcurre: 'El método devuelve una y parece única.',
        comoEvitarlo: 'Si hay empates, otra combinación puede tener el mismo total y ser preferible por razones prácticas.',
      },
    ],
    interpretacionGerencial:
      'La asignación óptima rara vez le da a cada recurso su mejor opción individual, y eso hay que saber comunicarlo: el equipo puede percibirlo como injusticia. ' +
      'Cuando existen óptimos alternativos, el criterio final puede incorporar consideraciones no numéricas —cercanía, experiencia, carga de trabajo— sin costo alguno. ' +
      'Y las filas o columnas ficticias no son un artificio: señalan un desbalance real entre recursos y tareas que la gerencia debe resolver.',
    aplicacionAgropecuaria:
      'Asignar cuatro veterinarios a cuatro granjas minimizando el costo de desplazamiento parece un problema de logística, pero el resultado tiene efecto sanitario: ' +
      'menos kilómetros significa más tiempo en granja y menor riesgo de trasladar patógenos entre explotaciones. ' +
      'Las asignaciones prohibidas aparecen naturalmente cuando un veterinario no puede visitar una granja por cuarentena.',
    resumen:
      'El método húngaro resuelve la asignación uno a uno reduciendo filas y columnas para crear ceros, cubriéndolos con el mínimo de líneas y ajustando la matriz hasta poder elegir una asignación completa. ' +
      'La maximización se convierte a oportunidad perdida, las matrices rectangulares se completan con ficticias y el total siempre se lee en la matriz original.',
    fuenteIds: ['doc-asignacion', 'chase2021', 'heizer2020'],
    ejemploResueltoId: 'asig-01',
    practicaGuiadaId: 'asig-02',
  },

  transporte: {
    tema: 'transporte',
    resultadoAprendizaje:
      'El estudiante formula y balancea un problema de transporte, construye soluciones iniciales por tres métodos, optimiza con MODI, reconoce la degeneración e interpreta el plan de envíos resultante como una decisión logística.',
    conocimientosPrevios: [
      'Si tres centros de acopio producen 300 litros y cuatro mercados piden 280, ¿qué pasa con los 20 restantes?',
      '¿Conviene siempre enviar por la ruta más barata? ¿Qué podría impedirlo?',
      '¿Qué significa que una ruta no utilizada tenga «costo reducido» negativo?',
    ],
    explicacion:
      'El modelo de transporte distribuye un producto desde varios orígenes hacia varios destinos al menor costo, respetando la oferta de cada origen y la demanda de cada destino.\n\n' +
      'Lo primero, siempre, es **balancear**: si la oferta total no iguala a la demanda total, el modelo no tiene solución factible. ' +
      'Cuando sobra oferta se agrega un destino ficticio con costo cero, y lo que se «envíe» ahí es producto que se queda en inventario. ' +
      'Cuando falta oferta se agrega un origen ficticio, y lo que despache es demanda que quedará insatisfecha: el modelo indica a quién conviene racionar.\n\n' +
      'Luego se construye una **solución inicial**. La esquina noroeste es la más simple y la peor: ignora los costos por completo. ' +
      'El costo mínimo sí los mira, pero decide una celda a la vez. La aproximación de Vogel calcula, para cada fila y columna, la diferencia entre sus dos costos más bajos ' +
      '—la «penalización» por no usar la mejor opción— y atiende primero la mayor penalización. Es la que más se acerca al óptimo, y con frecuencia lo alcanza directamente.\n\n' +
      'Ninguna solución inicial garantiza optimalidad, así que se optimiza con **MODI**: se calculan multiplicadores u y v tales que uᵢ + vⱼ = cᵢⱼ en cada celda ocupada, ' +
      'y con ellos el costo reducido de cada celda vacía. Mientras exista un costo reducido negativo, desviar envíos a esa ruta abarata el total. ' +
      'El reacomodo se hace por un ciclo cerrado que alterna sumas y restas para que la oferta y la demanda sigan cuadrando.\n\n' +
      'La **degeneración** aparece cuando hay menos celdas ocupadas que m + n − 1, lo que ocurre al agotarse simultáneamente un origen y un destino. ' +
      'Se corrige agregando celdas básicas con envío cero: no cambian el costo, pero sin ellas MODI no puede calcular los multiplicadores.\n\n' +
      'Al terminar, el tableau de MODI ya contiene el **análisis de sensibilidad**, igual que en el simplex: hay que saber qué se está mirando. Los ' +
      'multiplicadores u y v no son un artificio del método sino los **precios sombra** de la oferta de cada origen y de la demanda de cada destino. ' +
      'Ahora bien, como se fija u₁ = 0 por convención, los valores individuales dependen de esa elección y no significan nada por separado. Lo que sí ' +
      'significa algo, y no depende de la convención, es la **suma uᵢ + vⱼ**: es lo que cuesta mover una unidad más del origen i al destino j, subiendo ' +
      'a la vez la oferta de i y la demanda de j para no romper el balance.\n\n' +
      'Y ahí está lo interesante. En las rutas que se usan, uᵢ + vⱼ es exactamente el flete. En las que no se usan es **menor** que el flete directo, ' +
      'porque la red permite llevar esa unidad dando un rodeo más barato. La diferencia entre las dos cifras es el **costo reducido**, y tiene una ' +
      'lectura muy concreta: es el descuento mínimo que habría que negociarle a ese transportista para que valga la pena contratarlo. No «una rebaja», ' +
      'sino una cifra exacta.\n\n' +
      'De ahí sale también el **rango de cada flete**. Una ruta que no se usa entra al plan en cuanto su flete baja por debajo de uᵢ + vⱼ. Una que sí ' +
      'se usa aguanta un intervalo: subir su flete la vuelve menos atractiva y, pasado el tope, conviene reacomodar los envíos; bajarlo la refuerza, ' +
      'pero también hay un piso. Saber cuál de las rutas en uso tiene el margen más estrecho dice dónde importa más cerrar el precio antes de firmar.\n\n' +
      'Un aviso: cuando la solución es degenerada —alguna ruta figura en la base con envío cero— los multiplicadores dejan de ser únicos, y con ellos ' +
      'los rangos. Siguen siendo correctos, pero otra base daría otros números, así que conviene comprobarlos antes de decidir sobre ellos.',
    glosario: [
      { termino: 'Oferta', definicion: 'Cantidad disponible en cada origen.' },
      { termino: 'Demanda', definicion: 'Cantidad requerida por cada destino.' },
      { termino: 'Problema balanceado', definicion: 'Aquel en que la oferta total iguala a la demanda total.' },
      { termino: 'Origen ficticio', definicion: 'Origen con costo cero que se agrega cuando falta oferta. Representa demanda insatisfecha.' },
      { termino: 'Destino ficticio', definicion: 'Destino con costo cero que se agrega cuando sobra oferta. Representa producto no despachado.' },
      { termino: 'Esquina noroeste', definicion: 'Método inicial que asigna desde la celda superior izquierda sin mirar costos.' },
      { termino: 'Aproximación de Vogel', definicion: 'Método inicial que atiende primero la línea con mayor penalización.' },
      { termino: 'Multiplicadores u y v', definicion: 'Los que MODI calcula con uᵢ + vⱼ = cᵢⱼ en las celdas ocupadas. Son los precios sombra de la oferta y la demanda; sus valores individuales dependen de fijar u₁ = 0, pero la suma uᵢ + vⱼ no.' },
      { termino: 'Rango de un flete', definicion: 'Intervalo dentro del cual puede moverse el costo unitario de una ruta sin que convenga cambiar el plan de envíos. Para una ruta sin usar, el umbral inferior es el flete al que entraría al plan.' },
      { termino: 'Penalización', definicion: 'Diferencia entre los dos costos más bajos de una fila o columna.' },
      { termino: 'MODI', definicion: 'Método de los multiplicadores para verificar optimalidad y mejorar la solución.' },
      { termino: 'Costo reducido', definicion: 'cᵢⱼ − uᵢ − vⱼ. Cuánto cambiaría el costo total por cada unidad desviada a esa ruta.' },
      { termino: 'Ciclo de mejora', definicion: 'Trayecto cerrado que alterna sumas y restas para reacomodar envíos sin romper las restricciones.' },
      { termino: 'Degeneración', definicion: 'Situación en que la base tiene menos de m + n − 1 celdas ocupadas.' },
    ],
    formulas: [
      {
        nombre: 'Condición de balance',
        tex: '\\sum_i a_i = \\sum_j b_j',
        variables: [
          { simbolo: 'a_i', significado: 'oferta del origen i' },
          { simbolo: 'b_j', significado: 'demanda del destino j' },
        ],
        cuandoUsarla: 'Antes de cualquier otra cosa. Si no se cumple, hay que agregar un origen o un destino ficticio.',
      },
      {
        nombre: 'Multiplicadores de MODI',
        tex: 'u_i + v_j = c_{ij} \\quad \\text{para toda celda ocupada}',
        variables: [
          { simbolo: 'u_i', significado: 'multiplicador de la fila i; se fija u₁ = 0 para arrancar' },
          { simbolo: 'v_j', significado: 'multiplicador de la columna j' },
        ],
        cuandoUsarla: 'Sobre las celdas de la base, para poder calcular los costos reducidos.',
      },
      {
        nombre: 'Costo reducido',
        tex: 'r_{ij} = c_{ij} - u_i - v_j',
        variables: [{ simbolo: 'r_{ij}', significado: 'costo reducido de la celda vacía (i, j)' }],
        cuandoUsarla: 'Si todos los costos reducidos son mayores o iguales a cero, la solución es óptima.',
      },
      {
        nombre: 'Número de celdas básicas',
        tex: 'm + n - 1',
        variables: [
          { simbolo: 'm', significado: 'número de orígenes' },
          { simbolo: 'n', significado: 'número de destinos' },
        ],
        cuandoUsarla: 'Para detectar degeneración: si hay menos celdas ocupadas, falta completar la base con ceros.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Resolver sin balancear.',
        porQueOcurre: 'Se pasa directo a la matriz de costos sin sumar oferta y demanda.',
        comoEvitarlo: 'Es el primer paso siempre. Sin balance, el costo resultante no significa nada.',
      },
      {
        error: 'Detenerse en la solución inicial y presentarla como óptima.',
        porQueOcurre: 'La solución inicial ya parece razonable, sobre todo con Vogel.',
        comoEvitarlo: 'Verifique con MODI: mientras haya un costo reducido negativo, todavía se puede mejorar.',
      },
      {
        error: 'No completar la base cuando hay degeneración.',
        porQueOcurre: 'La solución parece válida y el costo está bien calculado.',
        comoEvitarlo: 'Cuente las celdas ocupadas: deben ser exactamente m + n − 1 para poder aplicar MODI.',
      },
      {
        error: 'Tratar los envíos al destino ficticio como transporte real.',
        porQueOcurre: 'Aparecen en la tabla como cualquier otra asignación.',
        comoEvitarlo: 'Lo asignado al ficticio no se mueve: es inventario que no sale o demanda que no se atiende.',
      },
    ],
    interpretacionGerencial:
      'El plan óptimo no es solo un costo: es un mapa de decisiones. La ruta que mueve más cantidad conviene asegurarla con contratos de flete estables. ' +
      'Los costos reducidos dicen cuánto costaría desviar carga a una ruta hoy no usada, que es exactamente la información necesaria para negociar con un transportista. ' +
      'Y cuando el origen ficticio despacha a un destino, el modelo está proponiendo a quién racionar: esa decisión debe validarla la gerencia comercial, no el algoritmo.',
    aplicacionAgropecuaria:
      'En la distribución de pollitos de un día desde dos incubadoras a cuatro granjas, el costo por millar incluye manejo especializado y el tiempo es crítico. ' +
      'Un plan óptimo puede ahorrar poco dinero pero mucho tiempo de transporte, con efecto directo en la mortalidad de la primera semana. ' +
      'Ahí el modelo entrega el plan, pero el criterio de calidad puede justificar apartarse de él.',
    resumen:
      'Balancear, construir una solución inicial y optimizar con MODI. Los tres métodos iniciales llegan al mismo óptimo; la diferencia está en cuánto hay que iterar. ' +
      'Los ficticios revelan excedentes o faltantes reales, y los costos reducidos indican cuánto cuesta cada ruta no utilizada.',
    fuenteIds: ['doc-transporte', 'chase2021', 'heizer2020', 'stevenson2021'],
    ejemploResueltoId: 'trans-01',
    practicaGuiadaId: 'trans-02',
  },

  inventarios: {
    tema: 'inventarios',
    resultadoAprendizaje:
      'El estudiante calcula el lote económico de un artículo, ajusta el modelo cuando el abastecimiento es uniforme o la revisión es periódica, determina el punto de reorden y explica por qué la curva de costo es plana cerca del óptimo.',
    conocimientosPrevios: [
      'Si pedir cuesta caro y guardar también, ¿conviene hacer muchos pedidos pequeños o pocos grandes?',
      '¿Por qué una bodega llena de mercadería es un problema y no un logro?',
      'Si su proveedor tarda una semana en entregar, ¿en qué momento tiene que hacer el pedido?',
    ],
    explicacion:
      'Inventario son las existencias de cualquier artículo o recurso que usa una organización. Existe porque el abastecimiento y la demanda no ocurren al mismo ritmo: llega de golpe y se consume de a poco.\n\n' +
      'Todo el módulo responde **dos decisiones**: cuánto ordenar y cuándo ordenar. La primera la resuelve el tamaño del lote; la segunda, el punto de reorden.\n\n' +
      'Tres costos se disputan la decisión. **Ordenar** (Co) cuesta lo mismo sea grande o pequeño el pedido —formatos, llamadas, transporte—, así que pedir seguido sale caro. **Conservar** (Ch) cuesta por unidad y por año —almacén, refrigeración, obsolescencia, capital inmovilizado—, así que pedir mucho también sale caro. Y **faltar** (Cs) cuesta la venta perdida. El lote económico es el punto donde los dos primeros se equilibran, y en ese punto valen exactamente lo mismo: es la comprobación más rápida de que el cálculo está bien.\n\n' +
      'El **modelo del lote económico** supone que la demanda es uniforme, que el abastecimiento llega todo junto, que el tiempo de entrega es constante y que los costos no cambian. Los tres casos especiales relajan alguno de esos supuestos.\n\n' +
      'En el **reabastecimiento uniforme** el lote no llega de golpe: entra a una tasa de producción mientras la demanda ya está consumiendo. El inventario nunca llega a valer Q sino Imáx, y como conservar cuesta menos, conviene ordenar más. Es el caso de quien produce su propio insumo.\n\n' +
      'En el **periodo fijo de reorden** no se revisa el inventario de continuo sino cada T, y se pide lo que falte para llegar a un nivel M. Ese nivel tiene que cubrir el intervalo completo **más** el tiempo de entrega, porque lo que se pide hoy no llega hasta dentro de L días y para entonces todavía falta para la revisión siguiente.\n\n' +
      'Una advertencia que la presentación del curso subraya y que provoca la mitad de los errores: **la demanda y el tiempo de entrega tienen que estar en la misma escala de tiempo**. Si la demanda es anual y la entrega en días, primero hay que convertir.',
    glosario: [
      { termino: 'D', definicion: 'Demanda por año, en unidades.' },
      { termino: 'Q', definicion: 'Cantidad a ordenar en cada pedido. El lote.' },
      { termino: 'Co', definicion: 'Costo de ordenar, por orden. No depende del tamaño del pedido.' },
      { termino: 'Ch', definicion: 'Costo de conservación por unidad y por año.' },
      { termino: 'Cs', definicion: 'Costo de faltante: lo que cuesta quedarse sin existencias.' },
      { termino: 'L', definicion: 'Tiempo de entrega: lo que tarda el proveedor desde el pedido hasta la recepción.' },
      { termino: 'R', definicion: 'Punto de reorden. Nivel de existencias que dispara el pedido.' },
      { termino: 'DEO', definicion: 'Días entre órdenes: cada cuánto se hace un pedido.' },
      { termino: 'CAI', definicion: 'Costo anual de inventario: ordenar más conservar. No incluye la compra.' },
      { termino: 'Imáx', definicion: 'Inventario máximo alcanzado. Igual a Q salvo con reabastecimiento uniforme.' },
      { termino: 'T', definicion: 'Intervalo económico de reorden, en el modelo de periodo fijo.' },
      { termino: 'M', definicion: 'Nivel hasta el que se ordena en cada revisión periódica.' },
    ],
    formulas: [
      {
        nombre: 'Lote económico',
        tex: 'Q = \\sqrt{\\frac{2\\,D\\,C_o}{C_h}}',
        variables: [
          { simbolo: 'D', significado: 'demanda anual en unidades' },
          { simbolo: 'C_o', significado: 'costo de ordenar por orden' },
          { simbolo: 'C_h', significado: 'costo de conservación por unidad y año' },
        ],
        cuandoUsarla: 'Cuando el abastecimiento llega completo y la demanda es uniforme. Es el caso base.',
      },
      {
        nombre: 'Lote con reabastecimiento uniforme',
        tex: 'Q = \\sqrt{\\frac{2\\,D\\,C_o}{C_h\\left(1 - \\frac{D}{p}\\right)}} \\qquad I_{máx} = Q\\left(1 - \\frac{D}{p}\\right)',
        variables: [
          { simbolo: 'p', significado: 'tasa de producción anual, mayor que la demanda' },
          { simbolo: 'I_{máx}', significado: 'inventario máximo que llega a acumularse' },
        ],
        cuandoUsarla: 'Cuando el lote entra poco a poco mientras la demanda ya consume. Producir el insumo en vez de comprarlo.',
      },
      {
        nombre: 'Costo anual de inventario',
        tex: 'CAI = \\frac{D}{Q}\\,C_o + \\frac{I_{máx}}{2}\\,C_h',
        variables: [{ simbolo: 'CAI', significado: 'costo anual de ordenar más conservar' }],
        cuandoUsarla: 'Para comparar alternativas. En el óptimo los dos sumandos son iguales.',
      },
      {
        nombre: 'Punto de reorden',
        tex: 'R = \\frac{D}{\\text{días del año}} \\times L',
        variables: [
          { simbolo: 'L', significado: 'tiempo de entrega en días' },
          { simbolo: 'R', significado: 'existencias que disparan el pedido' },
        ],
        cuandoUsarla: 'Para saber cuándo pedir. Exige convertir la demanda a la escala del tiempo de entrega.',
      },
      {
        nombre: 'Periodo fijo de reorden',
        tex: 'T = \\sqrt{\\frac{2\\,C_o}{D\\,C_h}} \\qquad M = D\\,(T + L)',
        variables: [
          { simbolo: 'T', significado: 'intervalo económico de reorden, en años' },
          { simbolo: 'M', significado: 'nivel hasta el que se ordena' },
        ],
        cuandoUsarla: 'Cuando conviene revisar en fechas fijas: un solo proveedor, visitas programadas, varios artículos juntos.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Mezclar la escala de tiempo de la demanda y del tiempo de entrega.',
        porQueOcurre: 'La demanda viene por año y la entrega en días, y se dividen sin convertir.',
        comoEvitarlo: 'Convierta la demanda a diaria antes de calcular el punto de reorden. Es la advertencia que hace la propia presentación.',
      },
      {
        error: 'Incluir el costo de compra en el costo anual de inventario.',
        porQueOcurre: 'Es la cifra más grande de todas y parece que debería contar.',
        comoEvitarlo: 'La compra del año es la misma sea cual sea el lote, así que no cambia la decisión. El CAI solo suma ordenar y conservar.',
      },
      {
        error: 'Usar el lote económico corriente cuando el abastecimiento es uniforme.',
        porQueOcurre: 'Se aplica la fórmula conocida sin mirar cómo entra el lote.',
        comoEvitarlo: 'Si el lote entra a una tasa de producción, el inventario nunca llega a Q: hay que dividir Ch entre (1 − D/p).',
      },
      {
        error: 'Calcular el nivel M del periodo fijo cubriendo solo el intervalo.',
        porQueOcurre: 'Se olvida que el pedido tarda en llegar.',
        comoEvitarlo: 'M cubre T más L. Quien no lo hace se queda sin existencias justo antes de cada entrega.',
      },
      {
        error: 'Perseguir el lote exacto con decimales.',
        porQueOcurre: 'La fórmula da un número preciso y se toma como obligatorio.',
        comoEvitarlo: 'La curva de costo es plana cerca del óptimo: un 20 % de diferencia mueve el costo menos del 2 %. Redondee a lo que despache el proveedor.',
      },
    ],
    interpretacionGerencial:
      'El lote económico no es una orden: es un punto de referencia. Lo que la gerencia se lleva del modelo son tres cosas. La primera, que el inventario tiene un costo que no aparece en ninguna factura —el capital inmovilizado, el espacio, la merma— y que ignorarlo lleva a comprar de más «porque hubo oferta». La segunda, que la curva es plana: no hay que discutir por veinte unidades, hay que evitar los extremos. Y la tercera, que producir el propio insumo cambia el cálculo a favor de lotes más grandes, porque nunca hay que almacenarlos enteros.',
    aplicacionAgropecuaria:
      'En una granja avícola el concentrado es el caso típico: representa la mayor parte del costo variable, se consume a ritmo parejo y se echa a perder si se almacena de más. El lote económico dice cuánto pedir; el punto de reorden, cuándo, y hay que ajustarlo por la vida útil del producto, que el modelo no considera. En insumos veterinarios suele convenir el periodo fijo, porque el proveedor visita la zona en fechas determinadas y conviene juntar todo el pedido. Y una cooperativa que fabrica su propio concentrado está exactamente en el caso de reabastecimiento uniforme.',
    resumen:
      'Dos decisiones: cuánto y cuándo. El lote económico equilibra ordenar contra conservar, y en el óptimo los dos costos son iguales. Si el lote entra poco a poco, conviene ordenar más. Si la revisión es periódica, el nivel objetivo cubre el intervalo más el tiempo de entrega. Y la demanda y la entrega siempre en la misma escala de tiempo.',
    fuenteIds: ['ppt-inventario', 'chase2021', 'heizer2020', 'stevenson2021'],
    ejemploResueltoId: 'inv-01',
    practicaGuiadaId: 'inv-02',
  },

  colas: {
    tema: 'colas',
    resultadoAprendizaje:
      'El estudiante calcula las medidas de desempeño de una línea de espera con uno o varios servidores, determina cuántos servidores conviene abrir comparando el costo de esperar contra el de atender, y explica por qué la espera se dispara cerca de la saturación.',
    conocimientosPrevios: [
      'Si un cajero atiende más rápido de lo que llega la gente, ¿por qué hay fila igual?',
      '¿Qué le cuesta a una empresa que sus clientes esperen? ¿Y que sus empleados estén ociosos?',
      'Si la fila del banco tiene diez personas, ¿el problema es la velocidad del cajero o cuántos hay?',
    ],
    explicacion:
      'Una línea de espera se forma cuando lo que llega y lo que se puede atender no coinciden **momento a momento**, aunque en promedio la capacidad alcance. Si las llegadas fueran perfectamente regulares y el servicio siempre durara lo mismo, no habría cola: la fila existe por la variabilidad.\n\n' +
      'El modelo básico se describe con tres letras: **M/M/s**. La primera dice que las llegadas siguen un proceso de Poisson; la segunda, que los tiempos de servicio son exponenciales; y la tercera, cuántos servidores hay en paralelo. Se supone además que quien llega se forma y espera, que se atiende por orden de llegada y que la sala de espera no tiene límite.\n\n' +
      'Lo primero que hay que comprobar es la **estabilidad**: si llegan más de los que se pueden atender, la cola crece sin límite y no existe promedio que calcular. La utilización ρ = λ/(sμ) tiene que ser menor que 1.\n\n' +
      'De ahí salen cuatro medidas que se enlazan por la **ley de Little**: lo que hay en el sistema es lo que llega multiplicado por lo que tarda. Basta calcular una y las demás se derivan.\n\n' +
      'La idea central del módulo no es ninguna fórmula: es que **la espera no crece de forma proporcional a la ocupación**. Pasar del 80 % al 90 % de utilización no agrega un 12 % de espera: la multiplica por 2,25, y del 90 % al 95 % se vuelve a duplicar. Cerca del 100 % la curva tiene una asíntota. Por eso un sistema real no se planifica para operar al tope: la capacidad ociosa no es desperdicio, es la holgura que impide que la cola se desborde.\n\n' +
      'La decisión práctica casi nunca es «cuánta cola hay» sino **cuántos servidores abrir**. Se compara lo que cuesta que la gente espere contra lo que cuesta atenderla, y el mínimo del total no está donde la cola desaparece: eliminarla del todo siempre sale más caro que tolerarla corta.',
    glosario: [
      { termino: 'λ (lambda)', definicion: 'Tasa media de llegadas por unidad de tiempo.' },
      { termino: 'μ (mu)', definicion: 'Tasa media de servicio de un solo servidor.' },
      { termino: 's', definicion: 'Número de servidores en paralelo.' },
      { termino: 'ρ (rho)', definicion: 'Utilización del sistema. Fracción del tiempo que los servidores están ocupados.' },
      { termino: 'P₀', definicion: 'Probabilidad de que el sistema esté vacío.' },
      { termino: 'Pw', definicion: 'Probabilidad de que quien llega tenga que esperar.' },
      { termino: 'L', definicion: 'Cantidad promedio de clientes en el sistema, esperando o siendo atendidos.' },
      { termino: 'Lq', definicion: 'Cantidad promedio en la cola. No cuenta a los que ya están siendo atendidos.' },
      { termino: 'W', definicion: 'Tiempo promedio en el sistema: espera más servicio.' },
      { termino: 'Wq', definicion: 'Tiempo promedio de espera en la cola.' },
      { termino: 'M/M/s', definicion: 'Llegadas de Poisson, servicio exponencial y s servidores en paralelo.' },
    ],
    formulas: [
      {
        nombre: 'Utilización',
        tex: '\\rho = \\frac{\\lambda}{s\\,\\mu}',
        variables: [
          { simbolo: '\\lambda', significado: 'tasa de llegadas' },
          { simbolo: '\\mu', significado: 'tasa de servicio de un servidor' },
          { simbolo: 's', significado: 'número de servidores' },
        ],
        cuandoUsarla: 'Siempre primero. Si no es menor que 1, el sistema es inestable y no hay nada que calcular.',
      },
      {
        nombre: 'Probabilidad de sistema vacío',
        tex: 'P_0 = \\left[\\sum_{n=0}^{s-1}\\frac{(\\lambda/\\mu)^n}{n!} + \\frac{(\\lambda/\\mu)^s}{s!}\\cdot\\frac{1}{1-\\rho}\\right]^{-1}',
        variables: [{ simbolo: 'P_0', significado: 'fracción del tiempo sin ningún cliente' }],
        cuandoUsarla: 'Antes que todo lo demás: de ella cuelgan la cola, el tiempo y el costo. Con un servidor se reduce a 1 − ρ.',
      },
      {
        nombre: 'Clientes en la cola',
        tex: 'L_q = \\frac{(\\lambda/\\mu)^s\\,\\rho}{s!\\,(1-\\rho)^2}\\,P_0',
        variables: [{ simbolo: 'L_q', significado: 'cantidad promedio esperando' }],
        cuandoUsarla: 'Es la medida de la que salen todas las demás por la ley de Little.',
      },
      {
        nombre: 'Ley de Little',
        tex: 'L = \\lambda\\,W \\qquad L_q = \\lambda\\,W_q \\qquad W = W_q + \\frac{1}{\\mu}',
        variables: [
          { simbolo: 'W', significado: 'tiempo total en el sistema' },
          { simbolo: 'W_q', significado: 'tiempo de espera en la cola' },
        ],
        cuandoUsarla: 'Para pasar de cantidades a tiempos y al revés. Vale para cualquier cola estable, no solo M/M/s.',
      },
      {
        nombre: 'Costo total del sistema',
        tex: 'C_T = L\\,C_e + s\\,C_s',
        variables: [
          { simbolo: 'C_e', significado: 'costo de que un cliente espere una unidad de tiempo' },
          { simbolo: 'C_s', significado: 'costo de operar un servidor por unidad de tiempo' },
        ],
        cuandoUsarla: 'Para decidir cuántos servidores abrir. El mínimo no está donde la cola desaparece.',
      },
    ],
    erroresFrecuentes: [
      {
        error: 'Calcular la utilización dividiendo entre la tasa de servicio sin multiplicar por los servidores.',
        porQueOcurre: 'Se arrastra la fórmula del caso de un solo servidor.',
        comoEvitarlo: 'La capacidad del sistema es s·μ, no μ. Con cuatro cajeros la capacidad es cuatro veces la de uno.',
      },
      {
        error: 'Confundir L con Lq.',
        porQueOcurre: 'Ambas cuentan clientes y las dos suenan a «los que están en la fila».',
        comoEvitarlo: 'Lq cuenta solo a los que esperan; L incluye además a los que ya están siendo atendidos. L = Lq + λ/μ.',
      },
      {
        error: 'Suponer que al doble de utilización corresponde el doble de espera.',
        porQueOcurre: 'Se piensa en la relación como si fuera lineal.',
        comoEvitarlo: 'Mire la curva: cerca del 100 % tiene una asíntota. Del 80 % al 90 % la espera se multiplica por 2,25.',
      },
      {
        error: 'Buscar el número de servidores que elimina la cola.',
        porQueOcurre: 'Se toma la cola como un defecto que hay que erradicar.',
        comoEvitarlo: 'La cola cero exige capacidad ociosa carísima. El óptimo económico siempre deja algo de espera.',
      },
      {
        error: 'Aplicar el modelo a un sistema con cita previa o servicio de duración fija.',
        porQueOcurre: 'Se usa la fórmula sin revisar los supuestos.',
        comoEvitarlo: 'M/M/s supone llegadas al azar y servicio muy variable. Con citas o servicio constante, las colas reales son mucho menores.',
      },
    ],
    interpretacionGerencial:
      'Lo que la gerencia se lleva de este módulo es una idea contraintuitiva: **la capacidad ociosa no es desperdicio**. Un cajero que está libre el 30 % del tiempo es lo que hace que la fila no explote cuando llegan cinco personas juntas. Apretar la capacidad para que nadie esté ocioso es exactamente la decisión que produce las esperas largas, y el costo de esa espera —clientes que se van, camiones parados, vacas estresadas— casi nunca está en la contabilidad, mientras que el sueldo del cajero sí. De ahí que la decisión intuitiva y la correcta apunten en direcciones opuestas tan seguido.',
    aplicacionAgropecuaria:
      'Los casos abundan: la báscula de una planta de granos donde hacen fila los camiones, el corral de espera de una sala de ordeño, los andenes de recepción de leche, las ventanillas de una cooperativa. En todos ellos el costo de esperar es real y medible —flete parado por hora, leche que sube de temperatura, producción perdida por estrés— aunque no aparezca en ninguna factura. Ponerle número a esa espera es lo que permite justificar el segundo andén.',
    resumen:
      'Primero comprobar la estabilidad: ρ = λ/(sμ) debe ser menor que 1. Después P₀, y de ahí Lq; el resto sale por la ley de Little. La espera crece de forma explosiva cerca de la saturación, así que un sistema se dimensiona con holgura. Y la decisión de cuántos servidores abrir se toma comparando el costo de esperar contra el de atender, no buscando cola cero.',
    fuenteIds: ['chase2021', 'heizer2020', 'russell2019', 'stevenson2021'],
    ejemploResueltoId: 'cola-01',
    practicaGuiadaId: 'cola-02',
  },
};

export function contenidoDe(tema: Tema): ContenidoModulo {
  return CONTENIDO_MODULOS[tema];
}
