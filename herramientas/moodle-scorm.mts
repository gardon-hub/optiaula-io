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

import { createWriteStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { deflateRawSync, crc32 } from 'node:zlib';

import { EJERCICIOS_FUNDAMENTOS } from '../src/datos/ejercicios/gestion.ts';

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

function paginaHTML(titulo: string, organizacion: string, enunciado: string, elementos: readonly Elemento[]): string {
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

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<style>
  /* Sin tipografías ni hojas de estilo externas: dentro de Moodle el paquete
     puede servirse sin salida a internet, y una fuente que no carga cambia toda
     la composición. */
  :root {
    --papel: #faf8f4;
    --superficie: #ffffff;
    --superficie-2: #f4f1ea;
    --tinta: #1b1d22;
    --tinta-media: #4d545f;
    --tinta-tenue: #767d88;
    --borde: #e2ddd2;
    --borde-fuerte: #c9c2b4;
    --acento: #123a5e;
    --bien: #2f7a52;
    --bien-suave: #e8f3ec;
    --mal: #9b2c2c;
    --mal-suave: #fbeaea;
    --serif: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-tema="claro"]) {
      --papel: #16181c; --superficie: #1e2126; --superficie-2: #24282e;
      --tinta: #eceef1; --tinta-media: #a9b0ba; --tinta-tenue: #848b95;
      --borde: #32373f; --borde-fuerte: #454c56;
      --acento: #6da3d4; --bien: #6cc08b; --bien-suave: #1d3227;
      --mal: #e78b8b; --mal-suave: #38211f;
    }
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 1rem;
    background: var(--papel); color: var(--tinta);
    font-family: var(--sans); font-size: 15px; line-height: 1.55;
  }
  .envoltura { max-width: 60rem; margin: 0 auto; }
  h1 { font-family: var(--serif); font-size: 1.5rem; line-height: 1.2; margin: 0 0 .25rem; }
  h2 { font-family: var(--serif); font-size: 1.15rem; margin: 0 0 .25rem; }
  .eyebrow {
    font-size: .6875rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--tinta-tenue); margin: 0 0 .35rem;
  }
  .tarjeta {
    background: var(--superficie); border: 1px solid var(--borde);
    border-radius: .625rem; padding: 1rem; margin-bottom: 1rem; min-width: 0;
  }
  .enunciado { background: var(--superficie-2); }
  .enunciado p { margin: 0 0 .6rem; }
  .enunciado p:last-child { margin-bottom: 0; }

  /* Barra de estado */
  .estado { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; margin-bottom: .75rem; }
  .contador {
    font-weight: 700; font-size: .8125rem; padding: .35rem .7rem;
    border-radius: 999px; background: var(--superficie-2); color: var(--tinta-media);
  }
  .contador.listo { background: var(--bien-suave); color: var(--bien); }

  .boton {
    font: inherit; font-size: .875rem; font-weight: 700; cursor: pointer;
    padding: .45rem .85rem; border-radius: .4rem; border: 1px solid var(--borde-fuerte);
    background: var(--superficie); color: var(--tinta);
    min-height: 2.75rem; max-width: 100%;
  }
  .boton-primario { background: var(--acento); color: #fff; border-color: var(--acento); }
  .boton:disabled { opacity: .45; cursor: not-allowed; }
  .boton:focus-visible, .ficha:focus-visible, .zona:focus-visible {
    outline: 3px solid var(--acento); outline-offset: 2px;
  }

  /* Fichas */
  .banco { background: var(--superficie-2); border-radius: .5rem; padding: .75rem; min-height: 3rem; }
  .fichas { display: flex; flex-wrap: wrap; gap: .5rem; margin: 0; padding: 0; list-style: none; }
  .ficha {
    font: inherit; font-size: .8125rem; text-align: left; cursor: grab;
    padding: .5rem .75rem; border-radius: .4rem;
    border: 1px solid var(--borde-fuerte); background: var(--superficie); color: var(--tinta);
    min-height: 2.75rem; max-width: 100%;
  }
  .ficha[aria-pressed="true"] {
    border-color: var(--acento); box-shadow: 0 0 0 2px var(--acento) inset; font-weight: 700;
  }
  .ficha.bien { border-color: var(--bien); background: var(--bien-suave); }
  .ficha.mal { border-color: var(--mal); background: var(--mal-suave); }
  .marca { font-weight: 700; margin-right: .35rem; }

  /* Zonas */
  .zonas { display: grid; gap: .75rem; grid-template-columns: 1fr; }
  @media (min-width: 40rem) { .zonas { grid-template-columns: 1fr 1fr; } }
  .zonas > * { min-width: 0; }
  .zona {
    display: block; width: 100%; text-align: left; font: inherit; cursor: pointer;
    border: 2px dashed var(--borde-fuerte); border-radius: .5rem; padding: .75rem;
    background: var(--superficie); color: var(--tinta);
  }
  .zona.activa { border-style: solid; border-color: var(--acento); background: var(--superficie-2); }
  .zona-titulo { font-family: var(--serif); font-weight: 700; font-size: 1rem; }
  .zona-desc { font-size: .75rem; color: var(--tinta-media); margin: .15rem 0 .5rem; }
  .zona .fichas { margin-top: .5rem; }
  .vacia { font-size: .75rem; color: var(--tinta-tenue); font-style: italic; }

  .aviso { border-radius: .4rem; padding: .6rem .75rem; font-size: .8125rem; margin-top: .75rem; }
  .aviso-bien { background: var(--bien-suave); color: var(--bien); }
  .aviso-mal { background: var(--mal-suave); color: var(--mal); }
  .aviso-nota { background: var(--superficie-2); color: var(--tinta-media); }
  .oculto { display: none !important; }
  .sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  ul.explica { margin: .5rem 0 0; padding-left: 1.1rem; font-size: .8125rem; }
  ul.explica li { margin-bottom: .3rem; }
  footer { font-size: .75rem; color: var(--tinta-tenue); margin-top: 1rem; }
</style>
</head>
<body>
<div class="envoltura">

  <header class="tarjeta">
    <p class="eyebrow">Módulo 1 · Fundamentos de gestión de operaciones</p>
    <h1>${esc(titulo)}</h1>
    <p class="zona-desc" style="margin-top:.35rem">${esc(organizacion)}</p>
  </header>

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

  <footer>
    Universidad Nacional de Agricultura · Catacamas, Olancho, Honduras · Investigación de Operaciones.
    Generado desde OPTIAULA IO.
  </footer>
</div>

<script>
"use strict";
var DATOS = ${datos};

/* ─── SCORM 1.2 ───────────────────────────────────────────────────────────
   Moodle expone el objeto «API» en alguna ventana por encima de esta. Se busca
   hacia arriba, como indica la especificación. Si no aparece —porque el archivo
   se abrió suelto, se subió como recurso «Archivo» o se está proyectando en
   clase— la actividad funciona igual, solo que sin enviar la nota.            */
var Scorm = (function () {
  var api = null, iniciado = false, esperaGuardado = null;

  function confirmar() {
    if (!iniciado) return;
    try { api.LMSCommit(''); } catch (e) {}
  }

  function buscar(ventana, saltos) {
    while (ventana && saltos-- > 0) {
      if (ventana.API) return ventana.API;
      if (ventana.parent === ventana) break;
      ventana = ventana.parent;
    }
    return null;
  }

  function localizar() {
    var encontrada = buscar(window, 12);
    if (!encontrada && window.opener) encontrada = buscar(window.opener, 12);
    return encontrada;
  }

  return {
    iniciar: function () {
      try {
        api = localizar();
        if (!api) return false;
        iniciado = api.LMSInitialize('') === 'true';
        return iniciado;
      } catch (e) { return false; }
    },
    disponible: function () { return iniciado; },
    enviarNota: function (crudo, maximo, aprobado) {
      if (!iniciado) return false;
      try {
        api.LMSSetValue('cmi.core.score.min', '0');
        api.LMSSetValue('cmi.core.score.max', String(maximo));
        api.LMSSetValue('cmi.core.score.raw', String(crudo));
        api.LMSSetValue('cmi.core.lesson_status', aprobado ? 'passed' : 'failed');
        api.LMSCommit('');
        return true;
      } catch (e) { return false; }
    },
    /*
     * El valor se anota enseguida, pero el LMSCommit se aplaza: en Moodle
     * cada uno es una petición al servidor, y guardar en cada movimiento
     * significaba dieciocho peticiones mientras el estudiante clasifica. Con
     * una conexión lenta eso se nota. Se confirma dos segundos después del
     * último cambio, y sin falta al cerrar.
     */
    guardar: function (texto) {
      if (!iniciado) return;
      try { api.LMSSetValue('cmi.suspend_data', texto); } catch (e) { return; }
      if (esperaGuardado) clearTimeout(esperaGuardado);
      esperaGuardado = setTimeout(function () { esperaGuardado = null; confirmar(); }, 2000);
    },
    confirmar: confirmar,
    leer: function () {
      if (!iniciado) return '';
      try { return api.LMSGetValue('cmi.suspend_data') || ''; } catch (e) { return ''; }
    },
    terminar: function () {
      if (!iniciado) return;
      if (esperaGuardado) { clearTimeout(esperaGuardado); esperaGuardado = null; }
      try { api.LMSCommit(''); api.LMSFinish(''); iniciado = false; } catch (e) {}
    }
  };
})();

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
</script>
</body>
</html>
`;
}

// ───────────────────────────── Manifiesto ─────────────────────────────

function manifiesto(titulo: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="OPTIAULA-FUND-01" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="OPTIAULA-ORG">
    <organization identifier="OPTIAULA-ORG">
      <title>${esc(titulo)}</title>
      <item identifier="ITEM-FUND-01" identifierref="RES-FUND-01" isvisible="true">
        <title>${esc(titulo)}</title>
        <adlcp:masteryscore>${NOTA_MINIMA}</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-FUND-01" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;
}

// ───────────────────────────── Banco de pruebas ─────────────────────────────

/**
 * Página que finge ser Moodle para comprobar el paquete sin subirlo.
 *
 * Expone un objeto `API` igual al de Moodle y muestra cada llamada que hace el
 * contenido, de modo que se ve si la nota sale y cuántas veces se confirma. No
 * entra en el ZIP: es una herramienta de verificación, no parte del material.
 */
function bancoDePruebasHTML(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Simulacro de Moodle — comprobación del paquete</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 0; display: flex; height: 100vh; }
  #panel { width: 24rem; padding: 1rem; background: #111; color: #7CFC98; overflow: auto;
           font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
  #panel h1 { font-size: 12px; color: #fff; margin: 0 0 .5rem; }
  #panel div { margin-bottom: 2px; word-break: break-all; }
  iframe { flex: 1; border: 0; border-left: 1px solid #333; }
</style>
</head>
<body>
<div id="panel"><h1>Llamadas del paquete a la API de SCORM</h1><div id="registro"></div></div>
<iframe id="sco" src="contenido/index.html" title="Contenido SCORM"></iframe>
<script>
var almacen = {};
var registro = document.getElementById('registro');
function anota(t) {
  var d = document.createElement('div');
  d.textContent = t;
  registro.appendChild(d);
  window.LLAMADAS = (window.LLAMADAS || []).concat([t]);
}
window.API = {
  LMSInitialize: function () { anota('LMSInitialize'); return 'true'; },
  LMSFinish: function () { anota('LMSFinish'); return 'true'; },
  LMSGetValue: function (k) { anota('LMSGetValue ' + k); return almacen[k] || ''; },
  LMSSetValue: function (k, v) { almacen[k] = v; anota('LMSSetValue ' + k + ' = ' + String(v).slice(0, 60)); return 'true'; },
  LMSCommit: function () { anota('LMSCommit'); return 'true'; },
  LMSGetLastError: function () { return '0'; },
  LMSGetErrorString: function () { return ''; },
  LMSGetDiagnostic: function () { return ''; }
};
window.ALMACEN = almacen;
</script>
</body>
</html>
`;
}

// ───────────────────────────── Empaquetado ─────────────────────────────

/**
 * Escribe un ZIP mínimo, sin dependencias.
 *
 * Se usa `deflateRaw` porque el formato ZIP guarda el flujo comprimido sin la
 * envoltura de zlib. Las fechas van fijas para que dos ejecuciones con el mismo
 * contenido produzcan archivos idénticos.
 */
async function escribirZip(destino: string, archivos: readonly { nombre: string; contenido: string }[]): Promise<void> {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let desplazamiento = 0;

  for (const a of archivos) {
    const nombre = Buffer.from(a.nombre, 'utf8');
    const crudo = Buffer.from(a.contenido, 'utf8');
    const comprimido = deflateRawSync(crudo, { level: 9 });
    const suma = crc32(crudo);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0x0021, 12); // fecha: 1 de enero de 2000
    local.writeUInt32LE(suma, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(crudo.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);

    partes.push(local, nombre, comprimido);

    const entrada = Buffer.alloc(46);
    entrada.writeUInt32LE(0x02014b50, 0);
    entrada.writeUInt16LE(20, 4);
    entrada.writeUInt16LE(20, 6);
    entrada.writeUInt16LE(0x0800, 8);
    entrada.writeUInt16LE(8, 10);
    entrada.writeUInt16LE(0, 12);
    entrada.writeUInt16LE(0x0021, 14);
    entrada.writeUInt32LE(suma, 16);
    entrada.writeUInt32LE(comprimido.length, 20);
    entrada.writeUInt32LE(crudo.length, 24);
    entrada.writeUInt16LE(nombre.length, 28);
    entrada.writeUInt16LE(0, 30);
    entrada.writeUInt16LE(0, 32);
    entrada.writeUInt16LE(0, 34);
    entrada.writeUInt16LE(0, 36);
    entrada.writeUInt32LE(0, 38);
    entrada.writeUInt32LE(desplazamiento, 42);
    central.push(entrada, nombre);

    desplazamiento += local.length + nombre.length + comprimido.length;
  }

  const cuerpoCentral = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(cuerpoCentral.length, 12);
  fin.writeUInt32LE(desplazamiento, 16);
  fin.writeUInt16LE(0, 20);

  await new Promise<void>((resolver, rechazar) => {
    const flujo = createWriteStream(destino);
    flujo.on('error', rechazar);
    flujo.on('finish', () => resolver());
    flujo.end(Buffer.concat([...partes, cuerpoCentral, fin]));
  });
}

// ───────────────────────────── Programa ─────────────────────────────

const ejercicio = EJERCICIOS_FUNDAMENTOS.find((e) => e.id === 'fund-01');
if (ejercicio === undefined) throw new Error('No se encontró el ejercicio fund-01');

const datos = ejercicio.datos as { tipo: 'fundamentos'; organizacion: string; elementos: readonly Elemento[] };
if (datos.tipo !== 'fundamentos') throw new Error('fund-01 no es un ejercicio de fundamentos');

// Que las categorías de los elementos existan de verdad: un identificador mal
// escrito daría un elemento imposible de acertar, y el estudiante no tendría
// forma de saberlo.
const conocidas = new Set(CATEGORIAS.map((c) => c.id));
const huerfanos = datos.elementos.filter((e) => !conocidas.has(e.categoria));
if (huerfanos.length > 0) {
  throw new Error(`Elementos con categoría desconocida: ${huerfanos.map((e) => `${e.id} (${e.categoria})`).join(', ')}`);
}

const html = paginaHTML(ejercicio.titulo, datos.organizacion, ejercicio.enunciado, datos.elementos);
const xml = manifiesto(ejercicio.titulo);

const carpeta = join(process.cwd(), 'moodle');
await rm(carpeta, { recursive: true, force: true });
await mkdir(join(carpeta, 'contenido'), { recursive: true });

// Se dejan también los archivos sueltos: sirven para revisarlos y para subirlos
// como recurso «Archivo» si no se quiere usar SCORM.
await writeFile(join(carpeta, 'contenido', 'index.html'), html, 'utf8');
await writeFile(join(carpeta, 'contenido', 'imsmanifest.xml'), xml, 'utf8');
await writeFile(join(carpeta, 'prueba-lms.html'), bancoDePruebasHTML(), 'utf8');

const zip = join(carpeta, 'optiaula-fundamentos-scorm.zip');
await escribirZip(zip, [
  { nombre: 'imsmanifest.xml', contenido: xml },
  { nombre: 'index.html', contenido: html },
]);

console.log('Paquete SCORM generado:');
console.log('  ' + zip);
console.log('  ' + join(carpeta, 'contenido', 'index.html') + '  (para abrirlo suelto)');
console.log(`  ${datos.elementos.length} elementos · ${CATEGORIAS.length} categorías · nota mínima ${NOTA_MINIMA} %`);
