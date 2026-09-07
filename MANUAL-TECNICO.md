# Manual técnico — OPTIAULA IO

Para quien tenga que mantener, corregir o extender la aplicación.

---

## 1. Arquitectura en una frase

Un motor matemático de funciones puras, sin ninguna dependencia de la interfaz, envuelto por una
capa de presentación que solo dibuja lo que el motor produjo. La interfaz **nunca calcula**.

```
datos (JSON validado con Zod)
        ↓
  nucleo/  →  { datos, pasos, diagnosticos, interpretacion }
        ↓
  ui/ + laboratorios/  →  pantalla
        ↓
  export/  →  CSV, Excel, JSON, SVG, PNG, impresión
```

## 2. Separación de responsabilidades

| Carpeta | Responsabilidad | Puede importar de |
|---|---|---|
| `config/` | Identidad configurable | nada |
| `nucleo/` | Algoritmos, validadores, explicaciones | `config/`, `esquemas/` |
| `esquemas/` | Contratos de datos (Zod) | `config/` |
| `datos/` | Biblioteca, fuentes, inconsistencias, contenido | `nucleo/`, `esquemas/` |
| `almacen/` | Persistencia y estado global | `datos/`, `esquemas/`, `config/` |
| `ui/` | Componentes de presentación | `nucleo/` (solo tipos y formato) |
| `laboratorios/` | Un laboratorio por módulo | todo lo anterior |
| `paginas/` | Las 18 pantallas | todo lo anterior |
| `export/` | Exportadores | `config/` |

La regla que importa: **`nucleo/` no importa nada de `ui/`, `paginas/` ni `almacen/`**. Eso permite
probar todo el motor sin navegador y reutilizarlo desde cualquier otra interfaz.

## 3. Contrato del motor

Todo solucionador devuelve `Resultado<T>`:

```ts
interface Resultado<T> {
  datos: T | null;              // null si hubo al menos un diagnóstico de gravedad 'error'
  pasos: readonly Paso[];       // procedimiento explicado, listo para dibujar
  diagnosticos: readonly Diagnostico[];
  interpretacion: string;       // lectura gerencial en prosa
}
```

Un `Paso` trae título, explicación del porqué, fórmula en KaTeX, y opcionalmente una tabla o una
matriz que la interfaz sabe dibujar (`TablaPaso`, `MatrizPaso`). La matriz admite celdas
seleccionadas, cubiertas, filas y columnas tachadas y etiquetas sobreimpresas: eso es lo que
permite animar el método húngaro y los ciclos de MODI sin lógica en la interfaz.

Un `Diagnostico` tiene gravedad `error` (impide resolver), `aviso` (algo que el estudiante debe
saber: degeneración, empates, óptimos alternativos) o `nota` (información didáctica).

## 4. Reglas numéricas irrenunciables

1. **Nunca se redondea durante el cálculo.** `redondear()` solo se usa al formatear.
2. **Las sumas de listas usan `sumaExacta()`** (algoritmo de Neumaier), no `reduce((a,b)=>a+b)`.
3. **Toda división pasa por `dividirSeguro()`**, que devuelve `null` en vez de `Infinity`.
4. **Las unidades viajan con el número.** `unidadRazon('kg', 'hora')` produce `'kg / hora'`, y cada
   razón declara la suya para que la interfaz nunca tenga que adivinar.
5. **Las monedas no se mezclan.** `compararPeriodos` rechaza monedas distintas por diseño.
6. Las comparaciones de flotantes usan `casiIgual()` con tolerancia relativa, nunca `===`.

## 5. Notas de implementación por módulo

**`asignacion.ts`** — Método húngaro completo. La cobertura mínima de ceros usa el teorema de
König a partir de un emparejamiento máximo (camino aumentante), no una heurística de conteo. Las
matrices rectangulares se completan con filas o columnas ficticias de costo cero; las prohibiciones
se representan con un valor grande (`GRAN_M`) que el método evita naturalmente. La detección de
óptimos alternativos cuenta emparejamientos perfectos en el grafo de ceros, con tope de 2.

**`transporte.ts`** — El balanceo es explícito y produce su propio paso. `encontrarCiclo()` busca
el ciclo único de una celda entrante alternando movimientos por fila y por columna, probando
ambos sentidos de arranque. La degeneración se corrige agregando celdas básicas con envío cero,
eligiendo las más baratas que no formen ciclo con la base existente. En Vogel, el desempate entre
líneas con la misma penalización elige la que contiene la celda más barata: sin ese refinamiento,
Vogel puede arrancar peor que la esquina noroeste (verificado en las pruebas).

**`cpm.ts`** — Ordenamiento topológico por Kahn, con detección de ciclos. `enumerarRutasCriticas()`
recorre el subgrafo de actividades con holgura cero, con tope de 50 rutas. `construirAOA()` da a
cada actividad un evento de terminación propio y conecta con arcos ficticios los conjuntos de
predecesoras: produce redes correctas, con más ficticias de las que dibujaría una persona.

**`crashing.ts`** — Compresión del proyecto, montada sobre `resolverCPM` sin tocarlo. El punto
delicado no es la pendiente de costo sino qué acortar: para bajar un periodo hay que cortar **todas**
las rutas críticas a la vez, que es un problema de recubrimiento. Con las cantidades de un ejercicio
—rara vez más de una docena de actividades críticas comprimibles— se resuelve por enumeración
exacta sobre subconjuntos; por encima de 16 candidatas cae a una heurística voraz y devuelve
`usoHeuristica: true`, que la interfaz muestra. Nunca se presenta una heurística como si fuera el
mínimo.

Lo que hace correcto el procedimiento es que **la red se resuelve otra vez después de cada
periodo**. Comprimir consume las holguras de las demás rutas y las vuelve críticas; quien decide
toda la compresión sobre la ruta crítica inicial paga por acortar un camino que ya no manda. Hay una
prueba que comprueba exactamente ese escenario. Como salvaguarda, si un paso no reduce la duración
del proyecto se deshace y la compresión se detiene: seguir solo gastaría dinero.

Los datos de compresión son **campos opcionales de la actividad** —`duracionAcelerada`, `costoNormal`,
`costoAcelerado`— más `costoIndirectoPorPeriodo` en el ejercicio. Por eso los cinco ejercicios de
ruta crítica del material siguen intactos y el panel del laboratorio ni siquiera se dibuja cuando
`admiteCompresion()` es falso: una tarjeta vacía sería un botón decorativo.

**`naturalezaOperaciones.ts`** — Módulo 1, el perfil de operaciones. Sitúa una organización en los ocho
rasgos con los que la bibliografía del curso contrasta manufactura y servicios y devuelve un índice
de 0 a 100, la lectura del continuo y las **consecuencias operativas** de ese perfil.

Dos decisiones que conviene no deshacer sin motivo. El índice es el **promedio simple**: ponderar
exigiría una fuente que dijera cuánto pesa cada rasgo, y ninguna de las del curso lo dice; unos pesos
inventados darían un número de apariencia precisa sin nada que lo sostenga. Y las consecuencias se
emiten **solo cuando un rasgo pasa de 65 o baja de 35**: en la zona intermedia la organización
todavía puede elegir, y afirmar ahí una consecuencia le inventaría al estudiante una restricción que
no tiene. Hay pruebas sobre los dos cortes.

El mismo rasgo en extremos opuestos produce consecuencias **contrarias**, no la ausencia de una: si
el producto no se puede guardar, la capacidad se dimensiona al pico; si se puede, el inventario
absorbe la variación. Eso es lo que hace que mover un control enseñe algo, y lo vigila una prueba de
extremo a extremo.

Los perfiles de referencia de los cuatro casos son criterio del docente, no medición, y están
registrados como inconsistencia I-19: la comparación usa una tolerancia de 25 puntos por rasgo y no
califica el perfil.

La tabla que compara los cuatro casos **revela cada fila cuando el estudiante compara esa
organización**, no antes. Mostrarlas todas desde el principio dejaba a la vista el índice y la lectura
de las cuatro: bastaba mirar la tabla para saber la respuesta sin perfilar nada. La síntesis del pie
espera a que estén las cuatro por lo mismo, porque adelanta cuál es el caso interesante y por qué.

**`grafico.ts`** — Programación lineal de dos variables por enumeración de vértices: se cruzan todos los
pares de rectas (restricciones más ejes), se descartan los cruces infactibles y se evalúa el objetivo en
los que quedan. La no acotación se detecta buscando una dirección del cono de recesión que mejore el
objetivo; en dos dimensiones basta probar los ejes y las direcciones paralelas a cada restricción. Las
soluciones múltiples se detectan contando vértices que empatan en el valor óptimo, y las restricciones
redundantes son las que no quedan activas en ningún vértice.

`analizarSensibilidad()` trabaja sobre el resultado ya calculado, nunca vuelve a resolver. Normaliza
toda restricción a `n · x ≤ d` —invirtiendo el signo de las de tipo ≥ y agregando los ejes como filas
propias— y resuelve el sistema dual `y₁n₁ + y₂n₂ = w` con las dos restricciones activas en el óptimo.
El precio sombra es `factorZ × dual × signo`, donde el factor y el signo deshacen la normalización.
El rango de los lados derechos se obtiene deslizando el vértice en la dirección `u` que cumple
`nᵢ · u = 1` y `nⱼ · u = 0`, hasta que otra restricción se vuelve activa; el de los coeficientes del
objetivo, exigiendo que los duales sigan siendo no negativos. Un vértice degenerado (más de dos
restricciones activas) hace que los duales no sean únicos: el análisis se emite igual, pero marcado
con `LP_SENSIBILIDAD_DEGENERADA`.

**`distribucion.ts`** — Tres métricas de distancia. `rectilinea` y `euclidiana` miden entre los
centroides de los departamentos; `pasillo` cuenta solo el avance en columnas, y es la de los
almacenes: el material viaja por el corredor central, así que dos bloques enfrentados están a la
misma distancia de la plataforma. Con el centroide esto sale exacto porque los recorridos de un
departamento se reparten por igual entre sus bloques, y entonces `carga × columna media` es
idénticamente la suma bloque a bloque que hace la presentación.

Dos trampas del módulo. La primera: **la matriz de recorridos es triangular**, no simétrica. El
puntaje suma `recorridos[i][j]` y `recorridos[j][i]`, así que llenar las dos mitades con el mismo
número duplica toda la carga en silencio. La segunda: `buscarMejorDistribucion` solo puede
intercambiar departamentos que ocupan **la misma cantidad de bloques** —cambiar de sitio uno de tres
bloques con uno de un bloque dejaría a ambos con el área equivocada—, de modo que con áreas
distintas hay departamentos que nunca se mueven. Eso devuelve `limitadaPorArea: true` y la interfaz
lo dice con todas las letras: si no, un mínimo local muy pobre se presentaría como el mejor plano
posible.

**`ui/editoresDatos.tsx` y `resolverEjercicio.ts`** — Un editor por tipo de datos, armado con los
mismos componentes que usan los laboratorios. Dos cosas lo mantienen honesto.

La primera: **agregar o quitar filas redimensiona todo lo que dependa de ellas**. Agregar un origen
de transporte no es agregar un nombre; es agregar su fila de costos y su oferta. Quitar una actividad
de CPM obliga a borrarla de las predecesoras de las demás, o la red queda irresoluble con un
identificador colgando. Todo eso pasa por `redimensionar()` y `ajustar()` en lugar de repetirse en
cada sitio.

La segunda: al cambiar los datos, las respuestas guardadas pueden quedar obsoletas —el enunciado
diría una cosa y la clave de corrección otra—. El editor las recalcula con `preguntasDe()`, las
compara y ofrece actualizarlas. El emparejamiento va **por identificador de pregunta, no por clave de
verificación**: doce ejercicios repiten la misma clave en varias preguntas —una por sitio candidato,
una por variable— y emparejar por clave compararía la respuesta de una con la de otra. Las preguntas
escritas a mano para un enunciado concreto no las produce ningún constructor, así que no se pueden
recalcular: se listan aparte para que el docente las revise.

`resolverEjercicio()` despacha al solucionador que corresponda sin que quien llama sepa el tipo, y
`diagnosticosDe()` sirve para avisar en el acto de que unos datos editados dejaron el ejercicio sin
solución —algo que el esquema no puede detectar: una red con un ciclo valida perfectamente—.

**`inventarios.ts` y `colas.ts`** — Los módulos 12 y 13. En inventarios, el factor `(1 − D/p)` es lo
único que separa los tres modelos: vale 1 con abastecimiento global, y con reabastecimiento uniforme
reduce el costo de conservar —porque el inventario nunca llega a valer Q— y por eso conviene ordenar
más. El periodo fijo calcula T y de ahí la cantidad, en lugar de al revés. La conversión de demanda
anual a diaria pasa siempre por `diasPorAnio`, nunca por una constante escondida: es el dato de I-16.

En colas, `probabilidadVacio()` se calcula con la fórmula general incluso para un solo servidor,
donde se reduce a 1 − ρ. Tener un camino aparte para M/M/1 habría permitido que los dos se separaran
sin que ninguna prueba lo notara. De P₀ cuelgan todas las demás medidas, así que un error ahí se
propaga a la cola, al tiempo y al costo.

**`comparacionIntentos.ts`** — Qué cambió entre dos intentos del mismo ejercicio, pregunta por
pregunta y error por error. Vive en el núcleo y no en la pantalla porque el mismo texto sirve para el
historial y para el reporte. Las preguntas de interpretación no se comparan por «correcta» —el motor
no las califica— sino por los puntos que les puso el docente.

**`export/pdf.ts`** — Generador de PDF sin dependencias. Una librería de PDF pesa entre 350 y 400 kB;
en una aplicación que debe funcionar sin conexión y que ya carga KaTeX, eso es mucho paquete para
producir texto y tablas. El archivo se escribe byte a byte con las fuentes base 14 —que todo lector
trae incorporadas— y codificación WinAnsi, que cubre el español completo.

Dos detalles que hay que respetar al tocarlo. El primero: el archivo **se construye como bytes, no
como cadena**. Un acento ocupa un byte en WinAnsi y dos en UTF-8, así que calcular los
desplazamientos del `xref` sobre un `string` de JavaScript los deja corridos y el PDF abre en blanco.
El segundo: los caracteres fuera de WinAnsi —el menos tipográfico U+2212, el ≤— se sustituyen; nunca
se escribe un byte arbitrario.

Las pruebas comprueban la estructura, no solo que la función devuelva algo: que cada desplazamiento
del `xref` apunte al objeto que dice, que las longitudes declaradas de los flujos coincidan con su
contenido y que el tráiler cierre. Esa prueba encontró que una verificación manual previa era vacua
—buscaba `xref` y daba con el `startxref` del tráiler, recorriendo una lista vacía—.

**`revision.ts`** — Calificación docente de las interpretaciones, que el motor de retroalimentación
no puede tocar porque hay que leerlas. La regla que ordena todo el módulo: **el puntaje automático
no se modifica nunca**. Lo que el estudiante vio al terminar —«X % de los puntos calificables»—
sigue significando lo mismo; la revisión se guarda aparte, en `respuesta.revision`, y la nota final
es la suma de las dos partes. Cambiar `intento.puntaje` al calificar habría reescrito hacia atrás un
número que ya se le había dado.

`notaDeIntento()` existe para que el historial, los reportes y el registro de calificaciones no
puedan discrepar: devuelve el puntaje automático mientras no haya ninguna interpretación calificada
y la nota final en cuanto la hay. Si cada pantalla lo calculara por su cuenta, la misma tarjeta
podría mostrar «0 %» junto a «nota final 20 %».

Una interpretación en blanco no queda pendiente —no hay nada que leer— pero sus puntos siguen
contando en el máximo: dejarla sin responder cuesta, igual que en un examen de papel.

**`datos/rubricas.ts`** — Dos rúbricas. La del ensayo de la Tarea Semana 1 está transcrita del
documento con sus seis criterios, sus pesos y los descriptores de sus cuatro niveles, y va marcada
`origen: 'textual'` con su fuente. La de las interpretaciones cortas **no existe en ningún material**:
la escribió la aplicación, va marcada `origen: 'propuesta'` y la pantalla de revisión lo dice en un
aviso antes de que el docente la use. Los niveles sí son los del curso —100 %, 80 %, 40 %, 10 %—.

**`equilibrio.ts`, parte multiproducto** — Hay dos métodos, y cuál se usa lo dice el dato
`baseMezcla`, no el motor. Con `'unidades'` se pondera el **margen por unidad** y el equilibrio sale
en unidades combinadas, que después se reparten con los mismos porcentajes; con `'ingresos'` se
pondera la **razón de margen** y sale en dinero. La diferencia no es cosmética: los mismos
porcentajes del despiece de pollo dan L 1 414 365 en un caso y L 1 383 960 en el otro, y por eso la
base es un dato del problema (inconsistencia I-13, cerrada con la clave de respuestas del docente).

Detalle de implementación que evita una clase entera de incoherencias: el cálculo se bifurca solo
para obtener el *impulsor* —unidades totales o ingreso total— y el reparto por producto. Todo lo
demás —el ingreso, las unidades, el margen ponderado, la razón ponderada— se **deriva del reparto**,
nunca se calcula en paralelo. Así el total en unidades y el total en dinero siempre se corresponden,
sea cual sea la base, y hay una prueba que lo comprueba de la única forma que importa: la
contribución del plan devuelto cubre exactamente los costos fijos.

**`sensibilidadTransporte.ts`** — Lee el tableau final de MODI, sin resolver de nuevo. Los
multiplicadores y los costos reducidos ya estaban ahí; lo que faltaba era presentarlos como
herramienta de decisión.

Para una ruta **no básica** el rango es inmediato: entra al plan si su flete baja por debajo de
`u_i + v_j`, así que el intervalo es `[c_ij − r_ij, +∞)`. Para una ruta **básica** hay que mirar los
ciclos: el costo reducido de cada celda vacía es la suma alternada de los fletes de su ciclo, de modo
que mover el flete de una celda de la base lo cambia en `±Δ` según la paridad de su posición en ese
ciclo. El intervalo es el que impide que alguno cambie de signo.

Dos cuidados que las pruebas obligaron a documentar. El primero: los multiplicadores individuales
dependen de fijar `u₁ = 0`, así que **solo la suma `u_i + v_j` tiene significado**, y es sobre ella
que se redacta la lectura gerencial. El segundo: con una solución degenerada —celda básica con envío
cero— el rango sigue siendo el de la **base**, no el del plan; fuera de él un pivote puede cambiar la
base sin mover una sola unidad, y el plan sigue siendo óptimo. Por eso la verificación de las pruebas
compara *optimalidad del plan* y no identidad de las matrices de envío, que con óptimos alternativos
daría falsos negativos.

**`preguntas.ts`** — Un constructor por tema, más el despachador `preguntasDe()`. Están en `nucleo/`
y no en `datos/` por una razón de capas: el generador también los necesita, y `nucleo/` no puede
importar de `datos/`. Cada constructor recibe los mismos datos que el solucionador y calcula las
respuestas resolviendo, así que no hay ningún número escrito a mano; la `claveVerificacion` de cada
pregunta es lo que la enlaza con las reglas de error típico de `retroalimentacion.ts`.

Fundamentos, localización y distribución devuelven lista vacía a propósito: sus preguntas dependen
del enunciado concreto y no se pueden derivar solo de los datos, así que esos ejercicios se escriben
a mano.

**`aplicarDecisiones.ts`** — Traduce una decisión del panel de auditoría a un cambio real en los
datos del ejercicio. La tabla `TRANSFORMACIONES` va de `inconsistencia:opcion` a una función pura
sobre `DatosEjercicio`; la opción que corresponde a los datos tal como vienen no aparece en la tabla,
porque no hay nada que transformar. Tres reglas la ordenan:

1. Se parte siempre de `BIBLIOTECA_INICIAL`, nunca del ejercicio ya transformado. Por eso la tienda
   recompone la biblioteca entera en cada decisión (`componerBiblioteca()` en `almacen/tienda.ts`) y
   no persiste los ejercicios transformados: cambiar de opinión no acumula transformaciones, y con
   una transformación involutiva como el intercambio de planos de I-03 eso sería un error silencioso.
2. Las respuestas se recalculan con `preguntasDe()`. Una decisión que cambia los datos invalida la
   clave guardada; dejarla sería peor que no aplicar la decisión.
3. Lo que no se puede aplicar no se finge. Una decisión sin transformación asociada deja el ejercicio
   intacto, y para las decisiones metodológicas —I-05, I-06, I-09— eso es lo correcto.

El motivo de que exista: `decidirInconsistencia()` solo registraba la decisión, de modo que la
pantalla decía «decidido» y el ejercicio se quedaba igual. Como las opciones ya elegidas coincidían
con los datos cargados, no se notaba; pero elegir la otra no hacía nada.

**`matriz.ts`** — Inversa por Gauss-Jordan y productos matriz-vector, todo en racionales exactos.
Solo la usa el simplex revisado. Sin pivoteo por magnitud: ese refinamiento existe para no perder
precisión en punto flotante, y aquí basta con encontrar cualquier pivote distinto de cero.
`inversa()` devuelve `null` en una matriz singular en vez de lanzar, porque en el simplex eso
significa «estas columnas no forman una base», que es un dato y no un fallo. `actualizarInversa()`
aplica la matriz elemental del pivote —las mismas operaciones de fila, sobre B⁻¹ en lugar de sobre
el tableau— y evita volver a invertir en cada iteración.

**`sensibilidadSimplex.ts`** — Análisis de sensibilidad sobre el tableau final, sin volver a
resolver. Vive aparte de `simplex.ts` porque solo necesita sus tipos exportados y porque ese archivo
ya carga cuatro formas de resolver.

El **rango de factibilidad** de `b_i` sale de exigir `x_B + Δ·d ≥ 0`, donde `d` es la columna de
B⁻¹ de esa restricción: la del tableau final bajo la variable que arrancó siendo el vector unitario
de la fila, que es la misma que da el precio sombra (`HolguraSimplex.columnaUnitaria`). Si la fila se
negó al normalizar, el intervalo se refleja.

El **rango de optimalidad** de `c_j` depende de si la variable es básica. Si no lo es, el límite es
el punto donde su costo reducido llega a cero. Si lo es, mover `c_j` mueve `c_B` y con él **todos**
los costos reducidos, que pasan a valer `(z_k − c_k) + Δ·a_rk`; el intervalo es el que los mantiene
con el signo que exige la optimalidad.

Un detalle que costó un error real: ese recorrido **debe saltarse las columnas artificiales**. Se
conservan en el tableau final solo para poder leer los duales de las filas ≥ y =, pero tienen
prohibido entrar a la base, y en una minimización sus valores en la fila objetivo son positivos
—violan la condición de optimalidad sin que eso signifique nada—. Tomarlos por alternativas reales
producía intervalos invertidos, con `desde` mayor que `hasta`.

**`racional.ts`** — Fracciones exactas sobre `bigint`, en forma canónica (denominador positivo, mcd
reducido). Solo el simplex la usa. `desdeNumero()` parte de `toString()`, que da la representación
decimal más corta que regresa al mismo double: para `0.1` devuelve `1/10`, no el valor binario
exacto. Es la interpretación correcta, porque el dato de origen es un número escrito por una persona
en un enunciado, no el resultado de un cálculo previo.

**`simplex.ts`** — Toda la aritmética en racionales exactos. Un tableau se pivotea muchas veces y
cada pivote divide una fila entera; en punto flotante los ceros dejan de ser cero, la prueba de
optimalidad pasa a depender de una tolerancia inventada y el algoritmo puede ciclar por ruido
numérico en vez de por degeneración real. Con fracciones, cero es cero —y además el tableau muestra
`5/16`, que es lo que el estudiante escribe a mano.

*Las cuatro formas de resolver* comparten la lectura de la solución y el cálculo de los precios
sombra, y se eligen con `opciones.metodo`. En **dos fases** (por omisión) se corre primero un
problema auxiliar que minimiza la suma de las artificiales; en **Gran M** se corre una sola vez con
las artificiales penalizadas en la propia función objetivo; en **dual** no hay artificiales; y
**revisado** usa el tratamiento de las dos fases pero cambia la contabilidad.

*El simplex revisado* no pivotea el tableau. Guarda `matrizA` y `vectorB` intactos y mantiene
`B⁻¹`, que arranca siendo la identidad porque la base inicial son las holguras y las artificiales.
Cada iteración calcula `y = c_B B⁻¹` (`vectorPor`), valora las columnas candidatas con productos
escalares `y · A_j − c_j`, y solo para la que entra calcula `B⁻¹A_e` (`porVector`). La prueba de la
razón corre sobre ese vector y sobre `x_B = B⁻¹b`, con los mismos desempates del tableau, y B⁻¹ se
actualiza con `actualizarInversa`.

Al terminar cada fase **materializa** el tableau equivalente (`cuerpoEnBase` da `B⁻¹A`, y
`porVector` da `B⁻¹b`) y lo deja en `estado`. Eso hace que toda la maquinaria posterior —expulsar
artificiales, detectar redundancia, leer la solución, calcular precios sombra y sensibilidad—
funcione sin cambios, y es también lo que permite la prueba de identidad: el revisado tiene que
visitar exactamente la misma sucesión de bases que el tableau, no solo llegar al mismo óptimo.

*El dual simplex* usa su propia normalización (`normalizarDual`), que es la contraria de la del
primal: en vez de forzar lados derechos no negativos, lleva todo a `≤` y acepta el signo que salga.
Un `b_i` negativo no es un defecto que corregir sino el material de trabajo. Sus dos reglas están en
`elegirSalienteDual` —fila del lado derecho más negativo— y `elegirEntranteDual` —menor
`|(z_j − c_j) / a_rj|` entre los coeficientes **negativos** de esa fila—, en ese orden, que es el del
primal invertido.

A cambio exige dos condiciones que se comprueban antes de resolver: ninguna igualdad, porque una
igualdad no deja holgura que meter en la base, y que la base de holguras ya cumpla la prueba de
optimalidad, lo que equivale a `c_j ≥ 0` al minimizar o `c_j ≤ 0` al maximizar. Cuando falla alguna,
la función devuelve `datos: null` con un diagnóstico que dice cuál falló y qué método usar en su
lugar, pero **emite igualmente el paso del modelo** para no dejar la pantalla vacía. La no acotación
no puede ocurrir por este camino: una base dual factible ya acota el primal.

Su detección de infactibilidad es la más informativa de los tres: una fila con lado derecho negativo
y ningún coeficiente negativo es, por sí sola, el certificado de que no hay solución. El mensaje
aclara que después de los pivotes esa fila ya no es la restricción original sino una combinación de
todas, porque atribuirla a una sola sería impreciso.

La objeción habitual a la Gran M —hay que elegir un valor para M, y si queda corto el resultado es
incorrecto mientras que si queda enorme la parte real se pierde en el redondeo— no aplica aquí
porque **M nunca toma un valor**. La fila objetivo se lleva como `ValorM`, un par `a + bM` de
racionales exactos, y `compararM()` mira primero el coeficiente de M y solo baja a la parte
constante cuando empata. Es exactamente lo que se hace a mano al decidir que «−3 − 2M es más
negativo que −10 − M». El cuerpo del tableau y los lados derechos siguen siendo números corrientes:
solo la fila objetivo es simbólica, así que el mismo código sirve para los dos métodos —en dos fases
`b` es siempre cero— sin duplicar nada.

Tres detalles del camino de la Gran M: la infactibilidad no se detecta en una fase aparte sino al
final, por una artificial que sigue en la base con valor positivo; una artificial que sale de la
base queda prohibida (`permitida[j] = false`), que es la regla de los libros y evita que vuelva a
entrar en un tableau degenerado; y el tableau final se recalcula con los costos reales, porque con
la penalización la columna de una artificial lleva un término `+M` que no forma parte del precio
sombra —de ahí que los duales se lean de la parte constante—.

La fila objetivo se **recalcula** desde la base en cada paso (`z_j − c_j = c_B B⁻¹A_j − c_j`) en vez
de arrastrarse con operaciones de fila. El resultado es idéntico —el cuerpo del tableau ya es
`B⁻¹A`— y así un descuido en una sola resta no se propaga por todo el procedimiento.

Las columnas artificiales **se conservan durante la fase 2** con costo cero y prohibido entrar a la
base. No es un descuido: para cada restricción, la columna que arrancó siendo el vector unitario de
su fila guarda en la fila objetivo exactamente `c_B B⁻¹e_i`, que es `∂Z/∂b_i`. En las restricciones ≤
esa columna es la holgura; en las ≥ y las =, la artificial. De ahí salen los precios sombra sin
ningún cálculo aparte. Si la fila se negó para dejar el lado derecho no negativo, el signo del dual
se invierte.

Al terminar la fase 1, las artificiales que quedaron básicas en cero se sacan con un pivote de razón
cero; si toda su fila es cero fuera de las columnas artificiales, la restricción es redundante y la
fila se retira del tableau con un aviso `SX_RESTRICCION_REDUNDANTE`.

Contra el ciclado: se usa la regla de Dantzig, y si el valor objetivo se estanca durante más
iteraciones que filas tiene el tableau se cambia a la regla de Bland, que garantiza terminación.
Los óptimos múltiples solo se reportan si el pivote mueve de verdad el vértice —razón mínima
positiva, o columna sin tope—: con razón cero se llega al mismo punto por otra base y anunciarlos
sería falso.

**`pert.ts`** — Reutiliza `resolverCPM` con los tiempos esperados como duraciones. Cuando hay
varias rutas críticas, la varianza del proyecto se calcula sobre **la de mayor varianza**, que es
la más arriesgada, y se advierte que las probabilidades resultantes son optimistas. La normal
acumulada usa Abramowitz y Stegun 26.2.17 (error < 7,5e-8) y la inversa usa Acklam con un
refinamiento de Halley.

**`distribucion.ts`** — Las distancias se miden entre centroides. `buscarMejorDistribucion()` hace
búsqueda exhaustiva con hasta 8 departamentos móviles de un bloque (y lo declara en el resultado);
por encima de eso usa intercambio por pares y **también lo declara**, para no presentar una
heurística como óptimo global.

**`retroalimentacion.ts`** — Para cada error típico, calcula el valor que produciría ese error y lo
compara con la respuesta del estudiante. Si coincide, explica exactamente qué se hizo mal. Ahí está
la diferencia entre «incorrecto» y «sumaste las desviaciones estándar en lugar de las varianzas».

**`generador.ts`** — Reproducible por semilla (mulberry32). Antes de devolver un ejercicio lo
resuelve con el propio motor y ejecuta una lista de verificaciones; si alguna falla, reintenta con
la semilla derivada `semilla + intento × 7919`, hasta 12 veces.

## 6. Datos y esquemas

Los ejercicios viven en `datos/ejercicios/` como objetos TypeScript y se validan contra
`esquemaEjercicio` al arrancar. Los que no validan **no entran a la biblioteca** y quedan listados
en `EJERCICIOS_RECHAZADOS`, visibles en el panel de auditoría. Así un error de datos degrada la
aplicación en vez de romperla.

Para agregar un ejercicio nuevo desde código: crear el objeto en el archivo del tema
correspondiente, exportarlo, e incluirlo en el arreglo `CRUDOS` de `datos/ejercicios/index.ts`.
Las pruebas de `pruebas/datos.test.ts` verificarán automáticamente que su respuesta guardada
coincida con lo que produce el motor.

## 7. Persistencia

`almacen/baseDatos.ts` encapsula IndexedDB. Todas las operaciones son tolerantes a fallo: si el
navegador no tiene IndexedDB (modo privado, permisos), la aplicación sigue funcionando en memoria y
lo informa en Configuración. La conexión se cierra al recibir `blocking`, para no impedir que otra
pestaña actualice o borre la base.

`almacen/tienda.ts` es el estado global (Zustand). La biblioteca inicial siempre está presente; los
ejercicios guardados la complementan o la sobrescriben por identificador.

**Decisiones de auditoría.** `aplicarDecision()` siempre reconstruye el ejercicio afectado a partir
de `BIBLIOTECA_INICIAL`, nunca del estado ya modificado. Así el docente puede cambiar de opinión
cuantas veces quiera sin que los cambios se acumulen.

## 8. Sistema visual

Los colores se definen como variables CSS en `:root`, se redefinen bajo
`@media (prefers-color-scheme: dark)` con el guardián `:root:not([data-tema='claro'])`, y otra vez
bajo `:root[data-tema='oscuro']`. Ningún color se declara únicamente dentro de un bloque de media
query: eso produciría texto de un tema sobre el fondo del otro.

El modo proyección se activa con `data-modo="proyeccion"` en la raíz y funciona subiendo
`--escala-proyeccion`, que afecta a `html { font-size }`. Todo el resto está en `rem`, así que la
interfaz completa escala sola.

Tipografías empaquetadas con `@fontsource` (no enlazadas desde Google Fonts) para que funcionen sin
conexión: Source Serif 4 para títulos, Atkinson Hyperlegible para cuerpo —elegida por su
legibilidad, que es un requisito explícito— e IBM Plex Mono para datos tabulares.

**Etiquetas de formulario.** Los controles no van envueltos dentro del `<label>`: la etiqueta es
hermana y se enlaza con `htmlFor`. Envolver un `<select>` en su etiqueta contamina el nombre
accesible con el texto de las opciones.

## 9. Extender la aplicación

**Agregar un módulo nuevo:** (el método gráfico y el simplex se incorporaron siguiendo exactamente estos pasos)
1. Agregar el tema a `TEMAS` en `esquemas/index.ts` y su nombre y número de módulo. El orden de `TEMAS`
   define la secuencia del curso, así que insertarlo en medio renumera los siguientes.
2. Crear el solucionador en `nucleo/`, respetando el contrato `Resultado<T>`.
3. Agregar el esquema de sus datos a `esquemaDatosEjercicio` (unión discriminada por `tipo`).
4. Escribir el contenido pedagógico en `datos/modulos.ts`.
5. Crear el laboratorio en `laboratorios/` y registrarlo en el despachador `laboratorios/index.tsx`.
6. Agregar ejercicios en `datos/ejercicios/`.
7. Agregar pruebas en `pruebas/nucleo.test.ts`, o en un archivo propio si el tema lo merece
   (`grafico.test.ts`, `sensibilidad.test.ts`, `simplex.test.ts`).
8. Si el tema admite generación automática, agregarlo a `TEMAS_GENERABLES` y escribir su caso en
   `verificar()`: ningún ejercicio se publica sin que el solucionador lo apruebe primero.
9. Si el tema no proviene de los materiales del curso, registrarlo en `datos/inconsistencias.ts` y
   marcar sus ejercicios como `derivado` con `fuenteId: null`. Nunca inventar una fuente.

**Conectar un backend (Supabase u otro):** todas las escrituras pasan por `almacen/baseDatos.ts`.
Basta con implementar las mismas funciones contra el backend y sincronizar. El modelo de datos ya
tiene identificadores estables y marcas de tiempo (`creadoEn`, `modificadoEn`).

**Habilitar un asistente de IA:** implementar `ProveedorAsistente` en
`nucleo/asistenteOpcional.ts`, registrarlo con `registrarProveedor()` y habilitarlo desde
Configuración. La retroalimentación determinista sigue siendo la principal; el asistente la amplía,
no la sustituye. Todo texto de un modelo debe mostrarse con `LEYENDA_GENERADO_AUTOMATICAMENTE`.

## 10. Pruebas

```bash
npm run test        # 566 unitarias
npm run test:e2e    # 114 de extremo a extremo, escritorio y teléfono
npm run typecheck   # TypeScript estricto
npm run lint        # análisis estático
```

### El linter

Es **oxlint**, no ESLint, y la razón es concreta: el proyecto usa TypeScript 7, que es el compilador
nativo y solo publica una API `unstable/*`. `typescript-eslint` necesita la API del compilador de
TypeScript 5 —`createProgram`, `SourceFile`—, que ya no existe en el paquete: `require('typescript')`
devuelve únicamente `version`. No es un desajuste de rangos de versiones, es que la API no está.
oxlint analiza TypeScript y JSX de forma nativa y no depende del compilador.

Lo que se pierde con ese cambio son las reglas que necesitan información de tipos. Cuando
`typescript-eslint` soporte TS 7 conviene volver a evaluarlo.

La configuración está en `.oxlintrc.json` y **cada regla apagada lleva escrita su razón**. Ninguna se
apagó para bajar el número de hallazgos. La categoría activa es `correctness`; `suspicious` y `perf`
quedaron fuera tras revisar sus 185 hallazgos uno por uno: eran estilo (`new Array<T>(n).fill()`,
claves por índice en tablas que no se reordenan, `.sort()` que en los 37 casos opera sobre copias
recién creadas) o reglas del React Compiler, que este proyecto no usa.

Las supresiones puntuales van en el código con `oxlint-disable-next-line` y su explicación al lado.

### Estado que se reinicia

Dos reglas que el proyecto sigue, aprendidas de sendos fallos reales:

1. **Un componente que debe empezar de cero al cambiar de asunto se monta con `key`, no se limpia
   desde un efecto.** Los efectos corren después de pintar, así que la limpieza siempre llega un
   fotograma tarde. `App` monta `PaginaEjercicio` con `key={ejercicioId}` por eso.
2. **Lo que se pasa como dependencia de un efecto tiene que ser estable.** `VisorPasos` reinicia al
   paso 1 cuando cambia la identidad del arreglo `pasos`; construirlo en el JSX lo hace nuevo en cada
   render y el visor no avanza nunca. Todos los laboratorios memorizan su resultado.

Y una del renderizado: **las listas derivadas se indexan por posición**, no por un identificador que
pueda repetirse. Dos fuentes de repetición hay en esta aplicación: `paso.numero`, porque cada
solucionador numera desde 1 y dos procedimientos unidos chocan; y cualquier nombre o identificador
que el usuario escriba en la tabla de un laboratorio —el id de una actividad de CPM o PERT, el nombre
de un origen o un destino del transporte—, donde nada impide poner dos iguales. Estas listas son
derivadas y nunca se reordenan, así que la posición identifica bien.

Al probar esto en Playwright hay una trampa: `page.goto` recarga la página, así que React se monta de
nuevo y el estado anterior desaparece solo, aunque el código no lo resuelva. Para comprobar que una
pantalla no arrastra el estado de la anterior hay que navegar como lo hace la aplicación, cambiando
el fragmento de la URL. El ayudante `navegarEnLaApp()` de las pruebas existe por eso.

Las pruebas del motor comparan contra cuatro fuentes de verdad distintas:

1. **Valores de los materiales del curso** (puntaje ponderado, carga-distancia, centro de gravedad,
   duración de proyectos CPM).
2. **Cálculo independiente** dentro de la misma prueba, que no confía en el algoritmo que verifica:
   fuerza bruta en asignación y distribución física; una malla fina de 900 × 900 puntos en el método
   gráfico; la enumeración exhaustiva de todas las bases del sistema en el simplex; y una diferencia
   central sobre el propio solucionador para los precios sombra del análisis de sensibilidad.
3. **Coincidencia entre algoritmos que no comparten código.** El simplex y el método gráfico tienen
   que dar el mismo vértice y los mismos precios sombra en los modelos de dos variables, y las dos
   fases, la Gran M y el dual simplex tienen que coincidir en todos los modelos donde los tres
   aplican: mismo plan, mismo Z, mismos duales y el mismo diagnóstico cuando el modelo es infactible
   o no acotado. Al simplex revisado se le exige más, porque no es otro algoritmo sino la misma
   sucesión de vértices con otra contabilidad: tiene que visitar **exactamente** las mismas bases en
   el mismo orden.
4. **Propiedades invariantes**: la solución de transporte respeta oferta y demanda, todos los
   costos reducidos de MODI son no negativos al terminar, los tres métodos iniciales convergen al
   mismo óptimo, y en el simplex se cumple la holgura complementaria —recurso que sobra, precio
   sombra cero—.

Al modificar el motor, ejecutar `npm run test` antes que nada. Si una prueba de referencia falla,
lo más probable es que el cambio sea incorrecto: esos valores están verificados contra el material.

## 11. Despliegue

`npm run build` produce `dist/` con el service worker. Servir esa carpeta desde cualquier hosting
estático. La configuración usa `base: './'`, así que funciona desde una subcarpeta sin ajustes.

El precacheo cubre 83 archivos (unos 1,8 MB), incluidas las tipografías y las fuentes de KaTeX. La
aplicación queda utilizable sin conexión desde la primera visita completa.
