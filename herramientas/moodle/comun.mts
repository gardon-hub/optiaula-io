/**
 * Piezas compartidas por los paquetes SCORM que se generan para Moodle.
 *
 * Existe porque hay más de una actividad y todas necesitan lo mismo: el estilo
 * visual, el envoltorio de la API de SCORM, el manifiesto, el escritor de ZIP y
 * el banco de pruebas que finge ser Moodle. Duplicar eso por actividad haría que
 * arreglar un detalle en una dejara a la otra atrás.
 *
 * Nada de aquí sale a internet: ni tipografías ni hojas de estilo externas.
 * Dentro de Moodle el paquete puede servirse sin salida a la red, y una fuente
 * que no carga cambia toda la composición.
 */

import { createWriteStream } from 'node:fs';
import { deflateRawSync, crc32 } from 'node:zlib';

// ───────────────────────────── Texto ─────────────────────────────

/** Escapa lo que va a texto de HTML. El contenido es del docente, no del usuario. */
export function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Convierte los resaltados con dos asteriscos del enunciado en negritas. */
export function conNegritas(t: string): string {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/** Parte un enunciado en párrafos de HTML. */
export function parrafos(texto: string): string {
  return texto
    .split('\n\n')
    .map((p) => `<p>${conNegritas(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n      ');
}

// ───────────────────────────── Estilo ─────────────────────────────

export const ESTILOS = `
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
    --acento-suave: #e4ecf3;
    --bien: #2f7a52;
    --bien-suave: #e8f3ec;
    --avisar: #a16207;
    --avisar-suave: #fbf0da;
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
      --acento: #6da3d4; --acento-suave: #1b2a3a;
      --bien: #6cc08b; --bien-suave: #1d3227;
      --avisar: #e0ac54; --avisar-suave: #33270f;
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
  h3 { font-family: var(--serif); font-size: 1rem; margin: 0; }
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
  .apagado { color: var(--tinta-media); font-size: .8125rem; }
  .menudo { font-size: .75rem; color: var(--tinta-media); }

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
  .boton:focus-visible, .ficha:focus-visible, .zona:focus-visible, input:focus-visible {
    outline: 3px solid var(--acento); outline-offset: 2px;
  }

  .marca-tono { display: inline-block; font-weight: 700; font-size: .6875rem;
    padding: .1rem .45rem; border-radius: 999px; letter-spacing: .02em; }
  .tono-acento { background: var(--acento-suave); color: var(--acento); }
  .tono-bien { background: var(--bien-suave); color: var(--bien); }
  .tono-avisar { background: var(--avisar-suave); color: var(--avisar); }

  .aviso { border-radius: .4rem; padding: .6rem .75rem; font-size: .8125rem; margin-top: .75rem; }
  .aviso-bien { background: var(--bien-suave); color: var(--bien); }
  .aviso-mal { background: var(--mal-suave); color: var(--mal); }
  .aviso-avisar { background: var(--avisar-suave); color: var(--avisar); }
  .aviso-nota { background: var(--superficie-2); color: var(--tinta-media); }
  .oculto { display: none !important; }
  .sr {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }
  ul.explica { margin: .5rem 0 0; padding-left: 1.1rem; font-size: .8125rem; }
  ul.explica li { margin-bottom: .3rem; }
  footer { font-size: .75rem; color: var(--tinta-tenue); margin-top: 1rem; }

  /* Fichas y zonas del constructor de sistemas */
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

  /* Perfil de operaciones */
  .rejilla { display: grid; gap: .75rem; grid-template-columns: 1fr; }
  @media (min-width: 46rem) { .rejilla { grid-template-columns: 1fr 1fr; } }
  .rejilla > * { min-width: 0; }
  .rasgo {
    background: var(--superficie-2); border: 1px solid var(--borde);
    border-radius: .5rem; padding: .75rem; min-width: 0;
  }
  .rasgo.discrepa { border-color: var(--avisar); }
  .rasgo label { display: block; }
  .rasgo input[type=range] { width: 100%; accent-color: var(--acento); min-height: 2.25rem; }
  .polos { display: flex; justify-content: space-between; gap: .75rem; font-size: .6875rem; color: var(--tinta-tenue); }
  .polos span { max-width: 46%; }
  .polos span:last-child { text-align: right; }
  .continuo {
    position: relative; height: 2rem; border-radius: 999px; border: 1px solid var(--borde);
    background: linear-gradient(90deg, var(--acento-suave), var(--superficie-2), var(--bien-suave));
  }
  .marcador {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 1.75rem; height: 1.75rem; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    font-size: .625rem; font-weight: 700;
    background: var(--acento); color: #fff; border: 2px solid var(--superficie);
  }
  .linea-referencia { position: absolute; top: 0; height: 100%; width: 2px; background: var(--tinta-media); }
  .consecuencia {
    background: var(--superficie-2); border: 1px solid var(--borde);
    border-left-width: 3px; border-radius: .5rem; padding: .75rem; min-width: 0;
  }
  .tabla { width: 100%; border-collapse: collapse; font-size: .8125rem; }
  .tabla th, .tabla td { padding: .4rem .6rem; border-bottom: 1px solid var(--borde); text-align: left; }
  .tabla th { font-size: .6875rem; text-transform: uppercase; letter-spacing: .06em; color: var(--tinta-tenue); }
  .tabla td.numero { text-align: right; font-variant-numeric: tabular-nums; }
  .desplazable { overflow-x: auto; }
`;

// ───────────────────────────── SCORM ─────────────────────────────

/**
 * Envoltorio de la API de SCORM 1.2.
 *
 * Moodle expone el objeto «API» en alguna ventana por encima de esta. Se busca
 * hacia arriba, como indica la especificación. Si no aparece —porque el archivo
 * se abrió suelto, se subió como recurso «Archivo» o se está proyectando en
 * clase— la actividad funciona igual, solo que sin registrar nada.
 *
 * El guardado del progreso va con retardo: en Moodle cada LMSCommit es una
 * petición al servidor, y confirmarlo en cada movimiento significaba decenas de
 * peticiones mientras el estudiante trabaja.
 */
export const SCORM_JS = `
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

    /* Actividades que sí se califican. */
    enviarNota: function (crudo, maximo, aprobado) {
      if (!iniciado) return false;
      try {
        api.LMSSetValue('cmi.core.score.min', '0');
        api.LMSSetValue('cmi.core.score.max', String(maximo));
        api.LMSSetValue('cmi.core.score.raw', String(crudo));
        api.LMSSetValue('cmi.core.lesson_status', aprobado ? 'passed' : 'failed');
        confirmar();
        return true;
      } catch (e) { return false; }
    },

    /* Actividades que se registran por haberlas hecho, sin nota. Se usa cuando
       poner una nota exigiría juzgar algo que no tiene respuesta correcta. */
    marcarCompletada: function () {
      if (!iniciado) return false;
      try {
        api.LMSSetValue('cmi.core.lesson_status', 'completed');
        confirmar();
        return true;
      } catch (e) { return false; }
    },

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
`;

// ───────────────────────────── Documento ─────────────────────────────

export interface Documento {
  readonly titulo: string;
  readonly eyebrow: string;
  readonly subtitulo: string;
  /** HTML del cuerpo, ya construido por la actividad. */
  readonly cuerpo: string;
  /** JavaScript de la actividad, sin la etiqueta script. */
  readonly guion: string;
}

export function documentoHTML(d: Documento): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.titulo)}</title>
<style>${ESTILOS}</style>
</head>
<body>
<div class="envoltura">

  <header class="tarjeta">
    <p class="eyebrow">${esc(d.eyebrow)}</p>
    <h1>${esc(d.titulo)}</h1>
    <p class="zona-desc" style="margin-top:.35rem">${esc(d.subtitulo)}</p>
  </header>

${d.cuerpo}

  <footer>
    <strong>Investigación de Operaciones</strong> · Profesor Gustavo Alonso Ardón, MSc.<br>
    Universidad Nacional de Agricultura (UNAG) · Catacamas, Olancho, Honduras.<br>
    Generado desde OPTIAULA IO.
  </footer>
</div>

<script>
"use strict";
${SCORM_JS}
${d.guion}
</script>
</body>
</html>
`;
}

// ───────────────────────────── Manifiesto ─────────────────────────────

export interface Manifiesto {
  readonly identificador: string;
  readonly titulo: string;
  /** Nota mínima para aprobar. `null` en las actividades sin calificación. */
  readonly notaMinima: number | null;
}

export function manifiestoXML(m: Manifiesto): string {
  // `masteryscore` solo tiene sentido cuando la actividad envía una nota. En una
  // que se registra por haberla hecho, declararlo haría que Moodle esperara un
  // puntaje que nunca llega.
  const maestria = m.notaMinima === null ? '' : `\n        <adlcp:masteryscore>${m.notaMinima}</adlcp:masteryscore>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${esc(m.identificador)}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="${esc(m.identificador)}-ORG">
    <organization identifier="${esc(m.identificador)}-ORG">
      <title>${esc(m.titulo)}</title>
      <item identifier="${esc(m.identificador)}-ITEM" identifierref="${esc(m.identificador)}-RES" isvisible="true">
        <title>${esc(m.titulo)}</title>${maestria}
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${esc(m.identificador)}-RES" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
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
export async function escribirZip(
  destino: string,
  archivos: readonly { nombre: string; contenido: string }[],
): Promise<void> {
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
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x0021, 12);
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

// ───────────────────────────── Banco de pruebas ─────────────────────────────

/**
 * Página que finge ser Moodle para comprobar un paquete sin subirlo.
 *
 * Expone un objeto «API» igual al de Moodle y muestra cada llamada que hace el
 * contenido, de modo que se ve qué se registra y cuántas veces se confirma. No
 * entra en el ZIP: es una herramienta de verificación, no parte del material.
 */
export function bancoDePruebasHTML(carpeta: string, titulo: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Simulacro de Moodle — ${esc(titulo)}</title>
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
<div id="panel"><h1>Llamadas a la API de SCORM — ${esc(titulo)}</h1><div id="registro"></div></div>
<iframe id="sco" src="${esc(carpeta)}/index.html" title="Contenido SCORM"></iframe>
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
