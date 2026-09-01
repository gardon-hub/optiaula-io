# OPTIAULA IO

**Laboratorio Interactivo de Investigación de Operaciones**

Aplicación web educativa e instalable para la asignatura Investigación de Operaciones de la
Universidad Nacional de Agricultura (Catacamas, Olancho, Honduras).

Autor del contenido: Profesor Gustavo Alonso Ardón.

---

## Qué es

No es una calculadora ni una colección de diapositivas. Es un laboratorio: cada método se explica
paso a paso indicando **por qué** se hace cada operación, los datos se pueden manipular para ver
qué cambia, y todo termina en una **interpretación gerencial** —qué decidiría alguien con ese
resultado en la mano—.

- **13 módulos** con teoría, glosario, fórmulas comentadas, errores frecuentes e interpretación.
- **86 ejercicios** extraídos de los materiales del curso, con contexto agropecuario y agroindustrial.
- **13 laboratorios interactivos**, uno por módulo.
- **4 modos de uso**: estudiante, docente, proyección y evaluación.
- **Motor de retroalimentación determinista**: reconoce los errores típicos de cada tema y explica
  qué se hizo mal, sin ninguna API de inteligencia artificial.
- **Funciona sin conexión** una vez instalada. Sin servidor, sin cuenta, sin servicios de pago.

## Instalación y ejecución

Requiere Node.js 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run test
```

```bash
npm run build
```

| Comando | Qué hace |
|---|---|
| `npm install` | Instala las dependencias |
| `npm run dev` | Servidor de desarrollo en `http://localhost:5173` |
| `npm run lint` | Análisis estático con oxlint (ver `.oxlintrc.json`) |
| `npm run test` | 535 pruebas unitarias del motor matemático y de los datos |
| `npm run test:e2e` | 108 pruebas de extremo a extremo (escritorio y teléfono) |
| `npm run build` | Compila a `dist/`, verifica tipos y genera el service worker |
| `npm run preview` | Sirve la compilación de producción |
| `npm run typecheck` | Verificación de tipos sin compilar |
| `npm run iconos` | Regenera los iconos de la PWA |

Para las pruebas de extremo a extremo, la primera vez hace falta instalar el navegador:

```bash
npx playwright install chromium
```

## Dónde está publicada

**https://gardon-hub.github.io/optiaula-io/**

Se abre en cualquier navegador, sin instalar nada. La publicación es automática: cada envío a `main`
dispara el flujo de `.github/workflows/publicar.yml`, que verifica tipos, pasa el análisis estático y
corre las 535 pruebas del motor **antes** de publicar. Si una prueba falla, no se publica: queda en
línea la versión anterior, que es preferible a una con un cálculo equivocado delante de la clase.

## Instalarla en el teléfono o la tableta

Al abrir la dirección de arriba, el navegador ofrece instalarla:

- **Android (Chrome):** menú ⋮ → «Instalar aplicación» o «Agregar a la pantalla de inicio».
- **iPhone y iPad (Safari):** botón Compartir → «Agregar a pantalla de inicio».
- **Computadora (Chrome o Edge):** icono de instalar en la barra de direcciones.

Una vez instalada **funciona sin conexión**: el motor de cálculo, los diagramas, la biblioteca de
ejercicios y las exportaciones se ejecutan por completo en el aparato. No hace falta señal en el aula.

Los datos de cada persona —perfiles, intentos, progreso— se guardan solo en su propio aparato
(IndexedDB). No hay servidor, no hay cuentas y nada se envía a ninguna parte.

## Verla en la red local mientras se trabaja

Para probar cambios sin publicar, se sirve en la Wi-Fi de la casa:

```bash
npm run dev -- --host
```

Vite imprime dos direcciones; la que sirve desde otro aparato es la de **Network**
(`http://192.168.x.x:5180/`); la de `localhost` solo funciona en la computadora. Si el teléfono no
carga, suele ser el cortafuegos de Windows bloqueando Node.

Así se ve, pero **no se instala**: el service worker exige HTTPS o `localhost`, y una dirección IP por
HTTP no cumple ninguna de las dos. Para instalarla hay que usar la dirección publicada.

## Servirla en otro lugar

Basta con servir el contenido de `dist/` desde cualquier servidor de archivos estáticos con HTTPS.
Las rutas usan el fragmento de la URL (`#/`), así que no hace falta configuración de reescritura, y
`base` es relativo, así que funciona igual en la raíz del dominio o en una subcarpeta.

## Los trece módulos

| # | Módulo | Métodos |
|---|---|---|
| 1 | Fundamentos de gestión de operaciones | Enfoque de sistemas, decisiones estratégicas/tácticas/operativas, manufactura vs. servicios |
| 2 | Productividad | Parcial física y económica, multifactorial, total, comparación entre periodos |
| 3 | Decisiones de localización | Puntaje ponderado, carga-distancia (rectilínea y euclidiana), centro de gravedad |
| 4 | Distribución física | Plano de bloques, matriz de recorridos, carga-distancia entre centroides o a lo largo del pasillo, gráfica REL |
| 5 | Punto de equilibrio | Un producto y multiproducto (mezcla en unidades o en ingreso), comisiones, valor de recuperación, utilidad objetivo |
| 6 | Diagramas de red y CPM | Recorridos hacia adelante y atrás, holguras, rutas críticas múltiples, análisis de retrasos, compresión del proyecto |
| 7 | PERT | Tres estimaciones, varianzas, ruta crítica probabilística, aproximación normal |
| 8 | Método gráfico de programación lineal | Región factible, vértices, línea de indiferencia, holguras, soluciones múltiples, no acotada e infactible, precios sombra y análisis de sensibilidad |
| 9 | Método simplex | Forma estándar, tableau, prueba de la razón mínima, cuatro formas de resolver —dos fases, Gran M, dual y revisado con B⁻¹—, análisis de sensibilidad completo, infactibilidad, no acotación, óptimos múltiples y degeneración |
| 10 | Modelo de asignación | Método húngaro: minimización, maximización, rectangulares, prohibiciones |
| 11 | Modelo de transporte | Esquina noroeste, costo mínimo, Vogel, MODI, degeneración, análisis de sensibilidad —multiplicadores como precios sombra, costos reducidos y rangos de flete— |
| 12 | Sistemas y modelos de inventarios | Lote económico, reabastecimiento uniforme, periodo fijo de reorden, punto de reorden, costo anual |
| 13 | Líneas de espera | M/M/1 y M/M/s, medidas de desempeño, ley de Little, cuántos servidores conviene abrir |

## Estructura del proyecto

```
src/
  config/identidad.ts      Archivo central: nombre, colores, autor, institución, moneda
  nucleo/                  Motor matemático: funciones puras, sin dependencias de interfaz
    numero.ts              Aritmética estable, formato, distribución normal, semillas
    racional.ts            Fracciones exactas sobre bigint, que solo el simplex necesita
    matriz.ts              Inversa y productos exactos, para el simplex revisado
    tipos.ts               Tipos compartidos: pasos, diagnósticos, distancias
    productividad.ts       Módulo 2
    localizacion.ts        Módulo 3
    distribucion.ts        Módulo 4
    equilibrio.ts          Módulo 5
    cpm.ts                 Módulo 6 (también construye la red de actividades en flechas)
    pert.ts                Módulo 7
    grafico.ts             Módulo 8 (programación lineal de dos variables, con sensibilidad y precios sombra)
    simplex.ts             Módulo 9 (dos fases, Gran M, dual y revisado; fracciones exactas)
    sensibilidadSimplex.ts Rangos y costos reducidos leídos del tableau final del simplex
    sensibilidadTransporte.ts Multiplicadores y rangos de flete leídos del tableau de MODI
    asignacion.ts          Módulo 10 (método húngaro con König para la cobertura mínima)
    transporte.ts          Módulo 11 (tres métodos iniciales y MODI)
    preguntas.ts           Constructores de las preguntas de cada tema, con pistas y claves
    retroalimentacion.ts   Motor determinista de errores típicos
    generador.ts           Generación reproducible con verificación previa, preguntas incluidas
    asistenteOpcional.ts   Arquitectura para una IA futura, desactivada
  esquemas/                Esquemas Zod y tipos derivados
  datos/                   Biblioteca de ejercicios, fuentes, inconsistencias, contenido de módulos
  almacen/                 IndexedDB y estado global (Zustand)
  ui/                      Componentes, gráficas SVG, diagramas de red, editores
  laboratorios/            Un laboratorio por módulo
  paginas/                 Las 18 pantallas
  export/                  CSV, Excel, JSON, portapapeles, impresión
pruebas/                   535 pruebas unitarias
pruebas/e2e/               108 pruebas de extremo a extremo
herramientas/              Generador de iconos de la PWA
```

## Decisiones técnicas

**Sin librerías de gráficas ni de diagramas.** Las gráficas, los diagramas de red y el editor de
plano son SVG escrito a mano. Se hizo así para controlar la accesibilidad (cada figura tiene
descripción textual), el comportamiento en modo oscuro y la exportación a SVG y PNG sin
dependencias. La especificación admitía «React Flow o alternativa estable» y «Recharts o
alternativa estable»; esta es la alternativa.

**El motor nunca redondea durante el cálculo.** El redondeo existe solo para presentar. La suma de
listas usa el algoritmo de Neumaier para no acumular deriva de coma flotante.

**Contrato estricto del motor.** Cada solucionador devuelve `{ datos, pasos, diagnosticos,
interpretacion }`. Si `datos` no es nulo, la solución es utilizable; si lo es, los diagnósticos
explican por qué.

**Las monedas no se mezclan.** Cada cálculo lleva su moneda y la aplicación bloquea las
comparaciones entre monedas distintas.

**Los datos originales no se corrigen en silencio.** Las inconsistencias detectadas en los
materiales se registran, se muestran al estudiante como advertencia y las resuelve el docente en el
panel de Auditoría de datos. La decisión no es un rótulo: donde cambia los datos, el ejercicio se
rehace y su clave de respuestas se recalcula. Cambiar de opinión rehace el ejercicio desde los datos
originales, así que las decisiones nunca se encadenan.

## Verificación

```
535 pruebas unitarias    motor matemático, biblioteca de datos, retroalimentación y generador
 108 pruebas e2e          recorridos de estudiante y docente, en escritorio y teléfono
  0 errores de TypeScript  modo estricto, con noUncheckedIndexedAccess
```

Los valores de referencia de las pruebas provienen de los materiales del curso (puntaje ponderado
Health-Watch 340 y 395, carga-distancia 239 y 168, centro de gravedad 6,67 y 3,02, mesas y sillas
(6, 3) con Z = 45) o de un cálculo independiente dentro de la propia prueba: fuerza bruta en asignación
y distribución, una malla fina en el método gráfico, una diferencia central numérica para los
precios sombra, y en el simplex la coincidencia exacta con el método gráfico —dos algoritmos sin una
línea de código en común—, la enumeración exhaustiva de bases y la coincidencia entre las cuatro
formas de resolver. El simplex revisado se exige más: no basta con que dé el mismo óptimo, tiene que
visitar exactamente la misma sucesión de bases que el tableau. Los rangos de sensibilidad del
simplex se comprueban además volviendo a resolver: dentro del intervalo la predicción es exacta y el
plan no cambia; justo fuera, ambas cosas fallan.

## Documentación adicional

- [`MANUAL-TECNICO.md`](MANUAL-TECNICO.md) — arquitectura, motor, extensión y despliegue
- [`MANUAL-USUARIO.md`](MANUAL-USUARIO.md) — guía breve para estudiante y docente
- [`INCONSISTENCIAS.md`](INCONSISTENCIAS.md) — registro completo de lo detectado en los materiales
- [`MEJORAS-FUTURAS.md`](MEJORAS-FUTURAS.md) — lista priorizada de lo que falta

## Privacidad

Todo se guarda en el navegador del usuario mediante IndexedDB. No hay servidor, no hay cuentas y no
se envía ningún dato a ningún servicio. El respaldo y la restauración se hacen por archivo JSON que
el usuario controla.

Los archivos de calificaciones de los materiales del curso, que contienen nombres y notas de
estudiantes reales, quedaron **excluidos por completo** de la aplicación. Solo se usó la hoja de
programación del ciclo, que no identifica a nadie.

## Licencia y uso

Material didáctico de la Universidad Nacional de Agricultura. El contenido académico es del autor.
