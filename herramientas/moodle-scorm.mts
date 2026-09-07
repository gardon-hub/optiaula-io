/**
 * Genera un paquete SCORM 1.2 con el constructor de sistemas del módulo 1,
 * listo para subir a Moodle.
 *
 * ¿Por qué SCORM y no pegar el HTML en una página de Moodle? Porque el editor
 * de Moodle **elimina las etiquetas `script`** de lo que escribe un docente: sin
 * el permiso `moodle/site:trustcontent`, que normalmente solo tiene el
 * administrador, cualquier interactividad pegada ahí deja de funcionar. Un
 * paquete SCORM se sirve como archivo, con su JavaScript intacto, y además
 * puede escribir la calificación en el libro de notas del curso.
 *
 * El contenido no se copia a mano: se lee de `datos/ejercicios`, que es la misma
 * fuente que usa la aplicación. Si el docente corrige un elemento allí, basta
 * volver a ejecutar `npm run moodle` para que el paquete quede igual.
 *
 *   npm run moodle
 *
 * Deja el resultado en `moodle/optiaula-fundamentos-scorm.zip`.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { EJERCICIOS_FUNDAMENTOS } from '../src/datos/ejercicios/gestion.ts';
import { bancoDePruebasHTML, documentoHTML, escribirZip, manifiestoXML } from './moodle/comun.mts';
import { casosDesde, paginaPerfil } from './moodle/perfil.mts';
import { paginaQR, svgDe, type Destino } from './moodle/qr.mts';

// ───────────────────────────── Contenido ─────────────────────────────

interface Elemento {
  readonly id: string;
  readonly texto: string;
  readonly categoria: string;
}

/** Las cinco categorías del modelo de sistemas, con la definición que las separa. */
const CATEGORIAS = [
  {
    id: 'entrada',
    nombre: 'Entradas',
    descripcion: 'Insumos, recursos humanos, capital, tecnología y energía que ingresan al sistema.',
    color: '#2f7a52',
  },
  {
    id: 'proceso',
    nombre: 'Procesos',
    descripcion: 'Las actividades de transformación que convierten las entradas en salidas.',
    color: '#123a5e',
  },
  {
    id: 'salida',
    nombre: 'Salidas',
    descripcion: 'Los bienes o servicios que el sistema entrega, incluidos los subproductos.',
    color: '#a16207',
  },
  {
    id: 'retroalimentacion',
    nombre: 'Retroalimentación',
    descripcion: 'Información que vuelve al sistema para ajustar su desempeño. Es información, no materia.',
    color: '#7c3aed',
  },
  {
    id: 'ambiente_externo',
    nombre: 'Ambiente externo',
    descripcion: 'Lo que condiciona al sistema sin formar parte de él: clientes, competencia, normativa, clima.',
    color: '#4d545f',
  },
] as const;

/**
 * Por qué cada categoría se confunde con otra. Es lo que convierte el ejercicio
 * en enseñanza y no en un acierto o error sin explicación; el error clásico es
 * llamar retroalimentación a un subproducto que sale del sistema.
 */
const CONFUSIONES: Readonly<Record<string, string>> = {
  entrada: 'Una entrada es lo que el sistema consume o emplea. Si algo se transforma, es proceso; si sale, es salida.',
  proceso: 'Un proceso es una actividad, no una cosa. Si puede señalarlo y tocarlo, probablemente sea entrada o salida.',
  salida:
    'Una salida es materia o servicio que el sistema entrega, aunque sea un subproducto y aunque alguien más lo aproveche. ' +
    'Salir del sistema no lo convierte en información.',
  retroalimentacion:
    'La retroalimentación es información que vuelve para ajustar el proceso: una medición, un reclamo, un resultado de ' +
    'laboratorio. Si es materia, es salida.',
  ambiente_externo:
    'El ambiente externo condiciona al sistema pero no forma parte de él: la cooperativa no decide el clima, el precio ' +
    'internacional ni la ley.',
};

const NOTA_MINIMA = 70;

// ───────────────────────────── Utilidades ─────────────────────────────

/** Escapa lo que va a texto de HTML. El contenido es del docente, no del usuario. */
function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Convierte los `**resaltados**` del enunciado en negritas. */
function conNegritas(t: string): string {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// ───────────────────────────── Documento ─────────────────────────────

export function paginaHTML(titulo: string, organizacion: string, enunciado: string, elementos: readonly Elemento[]): string {
  const datos = JSON.stringify({
    elementos: elementos.map((e) => ({ id: e.id, texto: e.texto, categoria: e.categoria })),
    categorias: CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, color: c.color })),
    confusiones: CONFUSIONES,
    notaMinima: NOTA_MINIMA,
  });

  const parrafos = enunciado
    .split('\n\n')
    .map((p) => `<p>${conNegritas(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n      ');

  // El documento lo arma `documentoHTML`, compartido con las demás
  // actividades. Antes esta página construía el suyo entero, con su propio pie:
  // al añadir el crédito del autor se actualizó el compartido y esta copia se
  // quedó sin él. Una sola plantilla evita que vuelva a pasar.
  return documentoHTML({
    titulo,
    eyebrow: 'Módulo 1 · Fundamentos de gestión de operaciones',
    subtitulo: organizacion,
    cuerpo: `
  <section class="tarjeta enunciado">
    ${parrafos}
  </section>

  <section class="tarjeta">
    <h2>Constructor de sistemas</h2>
    <p class="zona-desc">
      Toque un elemento y luego la categoría a la que pertenece. Con ratón también puede arrastrarlo.
      Con teclado: Tab para moverse, Enter para tomar un elemento y Enter otra vez sobre la categoría.
    </p>

    <div class="estado">
      <span id="contador" class="contador">Faltan 0</span>
      <button type="button" class="boton" id="reiniciar">Reiniciar</button>
      <button type="button" class="boton boton-primario" id="verificar">Comprobar</button>
    </div>

    <div class="banco">
      <p class="eyebrow" id="rotulo-banco">Elementos por clasificar</p>
      <ul class="fichas" id="banco" aria-labelledby="rotulo-banco"></ul>
      <p class="vacia oculto" id="banco-vacio">No queda ningún elemento sin clasificar.</p>
    </div>

    <div class="zonas" id="zonas" style="margin-top:.75rem"></div>

    <div id="resultado" class="oculto"></div>
    <p class="sr" role="status" aria-live="polite" id="anuncio"></p>
  </section>
`,
    guion: `
var DATOS = ${datos};

/* ─── Estado ───────────────────────────────────────────────────────────── */
var colocaciones = {};   // id de elemento -> id de categoría
var seleccionado = null; // id del elemento tomado
var verificado = false;

var elBanco = document.getElementById('banco');
var elBancoVacio = document.getElementById('banco-vacio');
var elZonas = document.getElementById('zonas');
var elContador = document.getElementById('contador');
var elResultado = document.getElementById('resultado');
var elAnuncio = document.getElementById('anuncio');
var btnVerificar = document.getElementById('verificar');
var btnReiniciar = document.getElementById('reiniciar');

function categoriaDe(id) {
  for (var i = 0; i < DATOS.categorias.length; i++) if (DATOS.categorias[i].id === id) return DATOS.categorias[i];
  return null;
}
function elementoDe(id) {
  for (var i = 0; i < DATOS.elementos.length; i++) if (DATOS.elementos[i].id === id) return DATOS.elementos[i];
  return null;
}
function anunciar(t) { elAnuncio.textContent = t; }

/* ─── Interacción ──────────────────────────────────────────────────────── */
function tomar(id) {
  if (verificado) return;
  seleccionado = (seleccionado === id) ? null : id;
  var e = elementoDe(id);
  anunciar(seleccionado ? ('Tomado: ' + e.texto + '. Elija una categoría.') : 'Se soltó el elemento.');
  pintar();
}

function colocar(idElemento, idCategoria) {
  if (verificado) return;
  colocaciones[idElemento] = idCategoria;
  seleccionado = null;
  var e = elementoDe(idElemento), c = categoriaDe(idCategoria);
  anunciar(e.texto + ' colocado en ' + c.nombre + '.');
  guardarProgreso();
  pintar();
}

function sacar(idElemento) {
  if (verificado) return;
  delete colocaciones[idElemento];
  anunciar('Elemento devuelto a la lista.');
  guardarProgreso();
  pintar();
}

function guardarProgreso() {
  try { Scorm.guardar(JSON.stringify(colocaciones)); } catch (e) {}
}

/* ─── Dibujo ───────────────────────────────────────────────────────────── */
function ficha(el, ubicado) {
  var b = document.createElement('button');
  b.type = 'button';
  b.className = 'ficha';
  b.setAttribute('draggable', verificado ? 'false' : 'true');
  b.dataset.id = el.id;

  if (verificado && ubicado) {
    var acierto = colocaciones[el.id] === el.categoria;
    b.className += acierto ? ' ficha bien' : ' ficha mal';
    var marca = document.createElement('span');
    marca.className = 'marca';
    marca.setAttribute('aria-hidden', 'true');
    marca.textContent = acierto ? '✓' : '✗';
    b.appendChild(marca);
    var oculto = document.createElement('span');
    oculto.className = 'sr';
    oculto.textContent = acierto ? 'Correcto: ' : 'Incorrecto: ';
    b.appendChild(oculto);
  } else {
    b.setAttribute('aria-pressed', seleccionado === el.id ? 'true' : 'false');
  }

  b.appendChild(document.createTextNode(el.texto));

  if (verificado && ubicado && colocaciones[el.id] !== el.categoria) {
    var pista = document.createElement('span');
    pista.className = 'sr';
    pista.textContent = ' Corresponde a ' + categoriaDe(el.categoria).nombre + '.';
    b.appendChild(pista);
  }

  if (!verificado) {
    b.addEventListener('click', function () { ubicado ? sacar(el.id) : tomar(el.id); });
    b.addEventListener('dragstart', function (ev) {
      seleccionado = el.id;
      try { ev.dataTransfer.setData('text/plain', el.id); ev.dataTransfer.effectAllowed = 'move'; } catch (x) {}
    });
  }
  return b;
}

function pintar() {
  // Banco de elementos sin clasificar
  elBanco.textContent = '';
  var pendientes = DATOS.elementos.filter(function (e) { return !colocaciones[e.id]; });
  pendientes.forEach(function (e) {
    var li = document.createElement('li');
    li.appendChild(ficha(e, false));
    elBanco.appendChild(li);
  });
  elBancoVacio.className = pendientes.length === 0 ? 'vacia' : 'vacia oculto';
  document.getElementById('rotulo-banco').textContent = 'Elementos por clasificar (' + pendientes.length + ')';

  // Zonas
  elZonas.textContent = '';
  DATOS.categorias.forEach(function (c) {
    var zona = document.createElement('div');
    zona.className = 'zona' + (seleccionado ? ' activa' : '');
    zona.setAttribute('role', 'button');
    zona.setAttribute('tabindex', '0');
    zona.setAttribute('aria-label', 'Colocar en ' + c.nombre);

    var t = document.createElement('div');
    t.className = 'zona-titulo';
    t.style.color = c.color;
    t.textContent = c.nombre;
    zona.appendChild(t);

    var d = document.createElement('p');
    d.className = 'zona-desc';
    d.textContent = c.descripcion;
    zona.appendChild(d);

    var lista = document.createElement('ul');
    lista.className = 'fichas';
    var suyos = DATOS.elementos.filter(function (e) { return colocaciones[e.id] === c.id; });
    if (suyos.length === 0) {
      var vacio = document.createElement('p');
      vacio.className = 'vacia';
      vacio.textContent = 'Sin elementos';
      zona.appendChild(vacio);
    } else {
      suyos.forEach(function (e) {
        var li = document.createElement('li');
        li.appendChild(ficha(e, true));
        lista.appendChild(li);
      });
      zona.appendChild(lista);
    }

    if (!verificado) {
      var soltar = function (ev) {
        if (ev) ev.preventDefault();
        var id = seleccionado;
        try { if (ev && ev.dataTransfer) id = ev.dataTransfer.getData('text/plain') || seleccionado; } catch (x) {}
        if (id) colocar(id, c.id);
      };
      zona.addEventListener('click', function (ev) {
        // Un clic sobre una ficha ya colocada la saca; no debe además recolocarla.
        if (ev.target.closest && ev.target.closest('.ficha')) return;
        if (seleccionado) colocar(seleccionado, c.id);
      });
      zona.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); if (seleccionado) colocar(seleccionado, c.id); }
      });
      zona.addEventListener('dragover', function (ev) { ev.preventDefault(); });
      zona.addEventListener('drop', soltar);
    }
    elZonas.appendChild(zona);
  });

  // Contador
  var faltan = pendientes.length;
  elContador.textContent = verificado ? 'Comprobado' : (faltan === 0 ? 'Listo para comprobar' : 'Faltan ' + faltan);
  elContador.className = 'contador' + (faltan === 0 ? ' listo' : '');
  btnVerificar.disabled = verificado || faltan > 0;
}

/* ─── Comprobación ─────────────────────────────────────────────────────── */
function verificar() {
  verificado = true;
  var total = DATOS.elementos.length;
  var aciertos = DATOS.elementos.filter(function (e) { return colocaciones[e.id] === e.categoria; }).length;
  var porcentaje = Math.round((aciertos / total) * 100);
  var aprobado = porcentaje >= DATOS.notaMinima;

  var enviada = Scorm.enviarNota(porcentaje, 100, aprobado);

  elResultado.className = '';
  elResultado.textContent = '';

  var cab = document.createElement('div');
  cab.className = 'aviso ' + (aprobado ? 'aviso-bien' : 'aviso-mal');
  cab.setAttribute('role', 'status');
  cab.textContent = aciertos + ' de ' + total + ' correctos (' + porcentaje + ' %). ' +
    (aprobado ? 'Aprobado.' : 'Se requiere ' + DATOS.notaMinima + ' % para aprobar.');
  elResultado.appendChild(cab);

  // Solo se explican las categorías donde de verdad hubo errores: una lista de
  // definiciones completa después de cada intento se deja de leer.
  var fallidas = {};
  DATOS.elementos.forEach(function (e) {
    if (colocaciones[e.id] !== e.categoria) fallidas[e.categoria] = true;
  });
  var ids = Object.keys(fallidas);
  if (ids.length > 0) {
    var titulo = document.createElement('p');
    titulo.className = 'eyebrow';
    titulo.style.marginTop = '.75rem';
    titulo.textContent = 'Dónde estuvo la confusión';
    elResultado.appendChild(titulo);

    var lista = document.createElement('ul');
    lista.className = 'explica';
    ids.forEach(function (id) {
      var li = document.createElement('li');
      var fuerte = document.createElement('strong');
      fuerte.textContent = categoriaDe(id).nombre + '. ';
      li.appendChild(fuerte);
      li.appendChild(document.createTextNode(DATOS.confusiones[id]));
      lista.appendChild(li);
    });
    elResultado.appendChild(lista);
  }

  var pie = document.createElement('p');
  pie.className = 'aviso aviso-nota';
  pie.textContent = enviada
    ? 'La calificación se envió al libro de notas del curso.'
    : 'Modo sin conexión con la plataforma: la calificación no se registra. Sirve igual para practicar.';
  elResultado.appendChild(pie);

  anunciar(aciertos + ' de ' + total + ' correctos.');
  pintar();
  elResultado.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function reiniciar() {
  colocaciones = {};
  seleccionado = null;
  verificado = false;
  elResultado.className = 'oculto';
  elResultado.textContent = '';
  guardarProgreso();
  anunciar('Actividad reiniciada.');
  pintar();
}

btnVerificar.addEventListener('click', verificar);
btnReiniciar.addEventListener('click', reiniciar);
window.addEventListener('unload', function () { Scorm.terminar(); });

/* ─── Arranque ─────────────────────────────────────────────────────────── */
Scorm.iniciar();
var guardado = Scorm.leer();
if (guardado) {
  try {
    var previo = JSON.parse(guardado);
    // Se aceptan solo las claves que existen hoy: si el docente cambió los
    // elementos, lo guardado en un intento anterior podría no corresponder.
    DATOS.elementos.forEach(function (e) {
      if (previo[e.id] && categoriaDe(previo[e.id])) colocaciones[e.id] = previo[e.id];
    });
  } catch (e) {}
}
pintar();
`,
  });
}

// ───────────────────────────── Programa ─────────────────────────────

/**
 * Además del paquete, cada actividad se publica como página suelta en el sitio.
 *
 * Es lo que permite mandarla por WhatsApp: un ZIP de SCORM no se puede abrir en
 * un teléfono —hay que descomprimirlo y no tiene sentido fuera de una
 * plataforma—, pero un enlace se abre de un toque. La misma página, sin
 * descargar nada.
 *
 * Se genera en `public/`, que Vite copia a `dist/`, y no se guarda en el
 * repositorio: el flujo de publicación ejecuta `npm run moodle` antes de
 * compilar, así que lo publicado siempre corresponde al código.
 */
const SITIO = join(process.cwd(), 'public', 'actividades');

/** Dónde vive el sitio. Es lo que codifican los códigos QR. */
const BASE_PUBLICA = 'https://gardon-hub.github.io/optiaula-io';

/** Escribe un paquete: los archivos sueltos, el banco de pruebas y el ZIP. */
async function empaquetar(opciones: {
  carpeta: string;
  subcarpeta: string;
  archivo: string;
  identificador: string;
  titulo: string;
  notaMinima: number | null;
  html: string;
}): Promise<string> {
  const xml = manifiestoXML({
    identificador: opciones.identificador,
    titulo: opciones.titulo,
    notaMinima: opciones.notaMinima,
  });

  const destino = join(opciones.carpeta, opciones.subcarpeta);
  await mkdir(destino, { recursive: true });

  // Se dejan también los archivos sueltos: sirven para revisarlos y para
  // subirlos como recurso «Archivo» si no se quiere usar SCORM.
  await writeFile(join(destino, 'index.html'), opciones.html, 'utf8');
  await writeFile(join(destino, 'imsmanifest.xml'), xml, 'utf8');
  await writeFile(
    join(opciones.carpeta, `prueba-${opciones.subcarpeta}.html`),
    bancoDePruebasHTML(opciones.subcarpeta, opciones.titulo),
    'utf8',
  );

  const zip = join(opciones.carpeta, opciones.archivo);
  await escribirZip(zip, [
    { nombre: 'imsmanifest.xml', contenido: xml },
    { nombre: 'index.html', contenido: opciones.html },
  ]);

  // La misma página, publicada para poder enviarla por enlace.
  const enSitio = join(SITIO, opciones.subcarpeta);
  await mkdir(enSitio, { recursive: true });
  await writeFile(join(enSitio, 'index.html'), opciones.html, 'utf8');

  return zip;
}

const carpeta = join(process.cwd(), 'moodle');
await rm(carpeta, { recursive: true, force: true });
await mkdir(carpeta, { recursive: true });
await rm(SITIO, { recursive: true, force: true });

// ── Actividad 1: constructor de sistemas (se califica) ──

const sistemas = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-01');
if (sistemas === undefined) throw new Error('No se encontró el ejercicio fund-01');

const datosSistemas = sistemas.datos as { tipo: 'fundamentos'; organizacion: string; elementos: readonly Elemento[] };
if (datosSistemas.tipo !== 'fundamentos') throw new Error('fund-01 no es un ejercicio de fundamentos');

// Que las categorías de los elementos existan de verdad: un identificador mal
// escrito daría un elemento imposible de acertar, y el estudiante no tendría
// forma de saberlo.
const conocidas: ReadonlySet<string> = new Set(CATEGORIAS.map((c) => c.id));
const huerfanos = datosSistemas.elementos.filter((e) => !conocidas.has(e.categoria));
if (huerfanos.length > 0) {
  throw new Error(`Elementos con categoría desconocida: ${huerfanos.map((e) => `${e.id} (${e.categoria})`).join(', ')}`);
}

const zipSistemas = await empaquetar({
  carpeta,
  subcarpeta: 'sistemas',
  archivo: 'optiaula-sistemas-scorm.zip',
  identificador: 'OPTIAULA-FUND-01',
  titulo: sistemas.titulo,
  notaMinima: NOTA_MINIMA,
  html: paginaHTML(sistemas.titulo, datosSistemas.organizacion, sistemas.enunciado, datosSistemas.elementos),
});

// ── Actividad 2: perfil de operaciones (no se califica) ──

const perfil = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-03');
if (perfil === undefined) throw new Error('No se encontró el ejercicio fund-03');

const casos = casosDesde(perfil.datos as Parameters<typeof casosDesde>[0]);
if (casos.length === 0) throw new Error('fund-03 no tiene casos para el perfil de operaciones');

const zipPerfil = await empaquetar({
  carpeta,
  subcarpeta: 'perfil',
  archivo: 'optiaula-perfil-scorm.zip',
  identificador: 'OPTIAULA-FUND-03',
  // Sin nota mínima: esta actividad se registra como completada, no calificada.
  // El porqué está en la cabecera de `moodle/perfil.mts` y en la auditoría I-19.
  notaMinima: null,
  titulo: perfil.titulo,
  html: paginaPerfil(perfil.titulo, perfil.enunciado, casos),
});

// ── Códigos QR para proyectar en clase ──

const DESTINOS: readonly Destino[] = [
  {
    id: 'perfil',
    nombre: perfil.titulo,
    descripcion: 'Sitúe cuatro organizaciones en el continuo entre manufactura y servicios.',
    url: `${BASE_PUBLICA}/actividades/perfil/`,
  },
  {
    id: 'sistemas',
    nombre: sistemas.titulo,
    descripcion: 'Clasifique los elementos de la cooperativa en el modelo de sistemas.',
    url: `${BASE_PUBLICA}/actividades/sistemas/`,
  },
  {
    id: 'app',
    nombre: 'OPTIAULA IO completo',
    descripcion: 'Los trece módulos, la biblioteca de ejercicios y todos los laboratorios.',
    url: `${BASE_PUBLICA}/`,
  },
];

const carpetaQR = join(carpeta, 'qr');
await mkdir(carpetaQR, { recursive: true });

// Sueltos, para pegarlos en una diapositiva.
for (const d of DESTINOS) {
  await writeFile(join(carpetaQR, `${d.id}.svg`), await svgDe(d.url), 'utf8');
}

// Y la página para proyectar, que también se publica en el sitio.
const paginaProyeccion = await paginaQR(DESTINOS);
await writeFile(join(carpetaQR, 'index.html'), paginaProyeccion, 'utf8');
await mkdir(join(SITIO, 'qr'), { recursive: true });
await writeFile(join(SITIO, 'qr', 'index.html'), paginaProyeccion, 'utf8');

console.log('Paquetes SCORM generados:');
console.log(`  ${zipSistemas}`);
console.log(`     ${datosSistemas.elementos.length} elementos · ${CATEGORIAS.length} categorías · nota mínima ${NOTA_MINIMA} %`);
console.log(`  ${zipPerfil}`);
console.log(`     ${casos.length} organizaciones · 8 rasgos · sin calificación, se registra como completada`);
console.log(`  Bancos de prueba: ${join(carpeta, 'prueba-sistemas.html')} y ${join(carpeta, 'prueba-perfil.html')}`);
