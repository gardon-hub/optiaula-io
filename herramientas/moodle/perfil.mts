/**
 * Paquete SCORM del perfil de operaciones: manufactura y servicios como un
 * continuo, no como dos casillas.
 *
 * La decisión que gobierna este exportador: **no envía nota**. En la aplicación
 * el perfil no se califica, y está registrado por qué (inconsistencia I-19): los
 * valores de referencia son criterio del docente, no una medición, y nadie ha
 * medido que el contacto con el cliente de un comedor sea 80 y no 75. Calificar
 * contra ellos convertiría un criterio en clave de respuestas y daría una nota
 * de apariencia objetiva sobre números que nadie midió.
 *
 * Lo que sí se registra es **haber hecho la actividad**: SCORM distingue entre
 * `passed`/`failed`, que suponen una nota, y `completed`, que no. Se marca
 * completada cuando el estudiante ha perfilado las cuatro organizaciones y ha
 * contrastado cada una con el criterio del docente, que es el acto de aprender
 * que la actividad persigue.
 *
 * Los rasgos y las consecuencias se leen del motor de la aplicación, así que el
 * paquete no puede desincronizarse de lo que ven los estudiantes en el sitio.
 */

import { RASGOS, indiceDe, type Perfil, type RasgoId } from '../../src/nucleo/naturalezaOperaciones.ts';
import { documentoHTML, esc, parrafos } from './comun.mts';

export interface CasoExportable {
  readonly id: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly perfilReferencia: Perfil;
  readonly justificacion: string;
}

/**
 * Las consecuencias operativas, copiadas del motor a una forma que el navegador
 * pueda evaluar sin traer todo el código de la aplicación.
 *
 * Están escritas aquí y no importadas porque en `nucleo/` viven dentro de una
 * función con lógica de umbrales; lo que necesita el paquete es la tabla. La
 * prueba `moodle.test.ts` comprueba que las dos listas digan lo mismo, de modo
 * que si alguien cambia una y olvida la otra, falla.
 */
export const CONSECUENCIAS: readonly {
  rasgo: RasgoId;
  lado: 'manufactura' | 'servicios';
  titulo: string;
  texto: string;
}[] = [
  {
    rasgo: 'almacenabilidad',
    lado: 'servicios',
    titulo: 'La capacidad se dimensiona al pico, no al promedio',
    texto:
      'Si lo que produce no se puede guardar, el inventario no sirve de amortiguador entre lo que llega y lo que puede ' +
      'atender. Toda la demanda de la hora punta hay que absorberla con capacidad instalada en esa hora: más personal, ' +
      'más puestos, o una fila.',
  },
  {
    rasgo: 'almacenabilidad',
    lado: 'manufactura',
    titulo: 'El inventario absorbe la variación de la demanda',
    texto:
      'Poder producir por anticipado permite nivelar la producción aunque la demanda suba y baje: se fabrica parejo y ' +
      'el inventario cubre los picos. A cambio hay que decidir cuánto guardar y cuándo reordenar.',
  },
  {
    rasgo: 'contacto',
    lado: 'servicios',
    titulo: 'El cliente entra al proceso y le mete variabilidad',
    texto:
      'Cuando el cliente está presente mientras se produce, deja de ser solo ambiente externo: se vuelve parte del ' +
      'proceso y una fuente de variabilidad que la organización no controla.',
  },
  {
    rasgo: 'simultaneidad',
    lado: 'servicios',
    titulo: 'No hay inspección antes de entregar',
    texto:
      'Si se produce en el mismo instante en que se consume, no existe el momento intermedio en el que un inspector ' +
      'revisa y separa lo defectuoso. La calidad hay que construirla durante el proceso.',
  },
  {
    rasgo: 'uniformidad',
    lado: 'servicios',
    titulo: 'El proceso se diseña flexible, no repetitivo',
    texto:
      'Si cada entrega se adapta a quien la recibe, no se puede montar una línea que repita siempre lo mismo. Hacen ' +
      'falta personas polivalentes y equipo de uso general, y el costo unitario será mayor.',
  },
  {
    rasgo: 'uniformidad',
    lado: 'manufactura',
    titulo: 'La repetición permite bajar el costo unitario',
    texto:
      'Producir siempre lo mismo hace rentable especializar el equipo y el puesto de trabajo, y convierte cada ' +
      'desviación en una señal clara de que algo anda mal.',
  },
  {
    rasgo: 'medicion',
    lado: 'servicios',
    titulo: 'La calidad se pregunta, no se mide',
    texto:
      'Cuando la calidad es percibida, el instrumento es la encuesta, el reclamo y la observación del trato, no el ' +
      'calibrador ni el termómetro.',
  },
  {
    rasgo: 'medicion',
    lado: 'manufactura',
    titulo: 'La especificación decide, no la opinión',
    texto:
      'Con una norma medible —grados de acidez, gramos, temperatura— la discusión sobre si el producto está bien ' +
      'termina en el instrumento.',
  },
  {
    rasgo: 'ubicacion',
    lado: 'servicios',
    titulo: 'La ubicación se decide por el cliente, no por el costo',
    texto:
      'Si el cliente tiene que llegar, ahorrar en el terreno instalándose lejos no es un ahorro: es demanda que no llega.',
  },
  {
    rasgo: 'ubicacion',
    lado: 'manufactura',
    titulo: 'La ubicación se decide por el costo de mover',
    texto:
      'Cuando el producto viaja al cliente y no al revés, conviene instalarse donde el costo total de traer insumos y ' +
      'despachar producto sea menor.',
  },
  {
    rasgo: 'intensidad',
    lado: 'servicios',
    titulo: 'La productividad se gana con la gente',
    texto:
      'Si el resultado depende de las personas, la capacitación y la rotación pesan más que cualquier compra de equipo.',
  },
];

export function paginaPerfil(titulo: string, enunciado: string, casos: readonly CasoExportable[]): string {
  const datos = JSON.stringify({
    rasgos: RASGOS.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      poloManufactura: r.poloManufactura,
      poloServicios: r.poloServicios,
      pregunta: r.pregunta,
    })),
    consecuencias: CONSECUENCIAS,
    casos: casos.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      referencia: c.perfilReferencia,
      justificacion: c.justificacion,
      indiceReferencia: indiceDe(c.perfilReferencia),
    })),
  });

  const cuerpo = `  <section class="tarjeta enunciado">
    ${parrafos(enunciado)}
  </section>

  <section class="tarjeta">
    <h2>Perfil de operaciones</h2>
    <p class="zona-desc">
      Sitúe la organización en cada rasgo, de manufactura a la izquierda a servicio a la derecha, y observe abajo
      qué le obliga a hacer ese perfil. No hay una casilla correcta: hay un lugar en el continuo.
    </p>

    <div class="estado">
      <span id="contador" class="contador">0 de ${casos.length} organizaciones</span>
      <button type="button" class="boton" id="centrar">Volver al centro</button>
      <button type="button" class="boton boton-primario" id="comparar">Comparar con el criterio del docente</button>
    </div>

    <div style="max-width:28rem;margin-bottom:.75rem">
      <label class="eyebrow" for="caso">Organización</label>
      <select id="caso" class="boton" style="width:100%;font-weight:400"></select>
    </div>

    <p class="apagado" id="descripcion"></p>

    <div style="margin:.75rem 0 .5rem">
      <div class="polos" style="margin-bottom:.25rem">
        <span class="eyebrow" style="margin:0">Manufactura</span>
        <span class="eyebrow" style="margin:0">Servicios</span>
      </div>
      <div class="continuo" id="continuo" role="img" aria-label="Posición en el continuo"></div>
      <p style="margin-top:.4rem" id="lectura"></p>
    </div>

    <div class="rejilla" id="rasgos"></div>
  </section>

  <section class="tarjeta">
    <h2>Qué le obliga este perfil</h2>
    <p class="zona-desc">
      Cada rasgo que queda en un extremo impone una forma de administrar la operación. En la zona intermedia no se
      afirma nada: ahí la organización todavía puede elegir.
    </p>
    <div class="rejilla" id="consecuencias"></div>
    <p class="apagado oculto" id="sin-consecuencias">
      Ningún rasgo está lo bastante marcado como para imponer una forma de administrar. Mueva los controles hacia un
      extremo y aparecerán las consecuencias.
    </p>
  </section>

  <section class="tarjeta oculto" id="criterio">
    <h2 id="criterio-titulo"></h2>
    <p id="criterio-texto"></p>
    <div id="criterio-difieren"></div>
  </section>

  <section class="tarjeta">
    <h2>Compare las cuatro organizaciones</h2>
    <p class="zona-desc" id="resumen-intro"></p>
    <div class="desplazable">
      <table class="tabla" id="resumen">
        <thead><tr><th>Organización</th><th style="text-align:right">Índice del docente</th><th>Lectura</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <p class="menudo oculto" id="resumen-pie" style="margin-top:.5rem">
      El caso más instructivo no es ninguno de los extremos sino la cooperativa: fabrica un bien tangible y almacenable,
      y aun así atiende al cliente cara a cara todos los días.
    </p>
  </section>

  <section class="tarjeta">
    <h2>Para pensar y responder</h2>
    <ul class="explica">
      <li>El comedor cocina un producto tangible, igual que el beneficio de café. ¿Por qué su perfil se parece más al de
        la clínica veterinaria que al del beneficio?</li>
      <li>La cooperativa no puede guardar la leche muchos días y el productor la recibe en su casa. ¿Qué dos decisiones
        de operaciones le cambian por eso, comparada con el beneficio de café?</li>
      <li>¿Por qué la actividad no le pide clasificar cada organización como «manufactura» o «servicio» y en cambio le
        pide situarla en ocho rasgos?</li>
    </ul>
    <p class="aviso aviso-nota" id="registro-estado"></p>
    <p class="sr" role="status" aria-live="polite" id="anuncio"></p>
  </section>`;

  const guion = `
var DATOS = ${datos};
var CORTE_MANUFACTURA = 40, CORTE_SERVICIOS = 60;
var ALTO = 65, BAJO = 35, TOLERANCIA = 25;

var perfiles = {};      // id de caso -> perfil
var tocados = {};       // casos que el estudiante movió
var comparados = {};    // casos cuyo criterio del docente ya vio
var casoId = DATOS.casos[0].id;
var comparando = false;

var elCaso = document.getElementById('caso');
var elDesc = document.getElementById('descripcion');
var elRasgos = document.getElementById('rasgos');
var elCons = document.getElementById('consecuencias');
var elSinCons = document.getElementById('sin-consecuencias');
var elContinuo = document.getElementById('continuo');
var elLectura = document.getElementById('lectura');
var elContador = document.getElementById('contador');
var elCriterio = document.getElementById('criterio');
var elRegistro = document.getElementById('registro-estado');
var elAnuncio = document.getElementById('anuncio');

function casoDe(id) {
  for (var i = 0; i < DATOS.casos.length; i++) if (DATOS.casos[i].id === id) return DATOS.casos[i];
  return DATOS.casos[0];
}
function neutro() {
  var p = {};
  for (var i = 0; i < DATOS.rasgos.length; i++) p[DATOS.rasgos[i].id] = 50;
  return p;
}
function perfilActual() {
  if (!perfiles[casoId]) perfiles[casoId] = neutro();
  return perfiles[casoId];
}
function indice(p) {
  var s = 0;
  for (var i = 0; i < DATOS.rasgos.length; i++) s += p[DATOS.rasgos[i].id];
  return s / DATOS.rasgos.length;
}
function clasificar(v) {
  if (v < CORTE_MANUFACTURA) return 'Manufactura';
  if (v > CORTE_SERVICIOS) return 'Servicios';
  return 'Mixta';
}
function tonoDe(n) {
  return n === 'Manufactura' ? 'tono-acento' : n === 'Servicios' ? 'tono-bien' : 'tono-avisar';
}
function num(v, d) { return v.toFixed(d === undefined ? 0 : d).replace('.', ','); }
function posicion(v) { return Math.min(97, Math.max(3, v)) + '%'; }
function anunciar(t) { elAnuncio.textContent = t; }

/* Las consecuencias del perfil: solo las de los rasgos que llegaron a un
   extremo. La regla es la misma del motor de la aplicación. */
function consecuenciasDe(p) {
  var salida = [];
  for (var i = 0; i < DATOS.consecuencias.length; i++) {
    var c = DATOS.consecuencias[i];
    var v = p[c.rasgo];
    if (c.lado === 'servicios' && v >= ALTO) salida.push(c);
    else if (c.lado === 'manufactura' && v <= BAJO) salida.push(c);
  }
  return salida;
}

function guardar() {
  try { Scorm.guardar(JSON.stringify({ p: perfiles, t: tocados, c: comparados })); } catch (e) {}
}

/* La actividad se registra por haberla hecho, no por una nota: se completa
   cuando el estudiante perfiló las cuatro organizaciones y contrastó cada una
   con el criterio del docente. */
function revisarCompletitud() {
  var hechas = 0;
  for (var i = 0; i < DATOS.casos.length; i++) {
    var id = DATOS.casos[i].id;
    if (tocados[id] && comparados[id]) hechas++;
  }
  elContador.textContent = hechas + ' de ' + DATOS.casos.length + ' organizaciones';
  elContador.className = 'contador' + (hechas === DATOS.casos.length ? ' listo' : '');

  if (hechas === DATOS.casos.length && !revisarCompletitud.avisado) {
    revisarCompletitud.avisado = true;
    var ok = Scorm.marcarCompletada();
    elRegistro.textContent = ok
      ? 'Actividad completada: quedó registrada en el curso. No lleva calificación, porque el perfil es un criterio y no una medición.'
      : 'Actividad completada. Fuera de la plataforma no queda registro, pero sirve igual para practicar.';
    elRegistro.className = 'aviso ' + (ok ? 'aviso-bien' : 'aviso-nota');
    anunciar('Actividad completada.');
  }
  return hechas;
}

function pintarContinuo() {
  var p = perfilActual();
  var v = indice(p);
  var caso = casoDe(casoId);
  elContinuo.textContent = '';

  if (comparando) {
    var linea = document.createElement('div');
    linea.className = 'linea-referencia';
    linea.style.left = posicion(caso.indiceReferencia);
    elContinuo.appendChild(linea);
  }
  var m = document.createElement('div');
  m.className = 'marcador';
  m.style.left = posicion(v);
  m.textContent = num(v);
  elContinuo.appendChild(m);
  elContinuo.setAttribute('aria-label', 'Índice ' + num(v, 1) + ' de 100: ' + clasificar(v) + '.');

  elLectura.textContent = '';
  var etiqueta = document.createElement('span');
  etiqueta.className = 'marca-tono ' + tonoDe(clasificar(v));
  etiqueta.textContent = clasificar(v);
  elLectura.appendChild(etiqueta);
  if (comparando) {
    var nota = document.createElement('span');
    nota.className = 'menudo';
    nota.style.marginLeft = '.5rem';
    nota.textContent = 'La línea marca el criterio del docente: ' + num(caso.indiceReferencia, 1) +
      ' — ' + clasificar(caso.indiceReferencia);
    elLectura.appendChild(nota);
  }
}

function pintarRasgos() {
  var p = perfilActual();
  var caso = casoDe(casoId);
  elRasgos.textContent = '';

  DATOS.rasgos.forEach(function (r) {
    var dif = Math.abs(p[r.id] - caso.referencia[r.id]);
    var discrepa = comparando && dif > TOLERANCIA;

    var caja = document.createElement('div');
    caja.className = 'rasgo' + (discrepa ? ' discrepa' : '');

    var etiqueta = document.createElement('label');
    etiqueta.className = 'eyebrow';
    etiqueta.setAttribute('for', 'r-' + r.id);
    etiqueta.textContent = r.nombre + ': ' + num(p[r.id]);
    caja.appendChild(etiqueta);

    var control = document.createElement('input');
    control.type = 'range';
    control.id = 'r-' + r.id;
    control.min = '0';
    control.max = '100';
    control.step = '5';
    control.value = String(p[r.id]);
    control.addEventListener('input', function () {
      p[r.id] = Number(control.value);
      tocados[casoId] = true;
      guardar();
      pintar();
    });
    caja.appendChild(control);

    var polos = document.createElement('div');
    polos.className = 'polos';
    var izq = document.createElement('span');
    izq.textContent = r.poloManufactura;
    var der = document.createElement('span');
    der.textContent = r.poloServicios;
    polos.appendChild(izq);
    polos.appendChild(der);
    caja.appendChild(polos);

    var preg = document.createElement('p');
    preg.className = 'menudo';
    preg.style.marginTop = '.3rem';
    preg.textContent = r.pregunta;
    caja.appendChild(preg);

    if (comparando) {
      var comp = document.createElement('p');
      comp.className = 'menudo';
      comp.style.color = discrepa ? 'var(--avisar)' : 'var(--bien)';
      comp.textContent = 'Criterio del docente: ' + num(caso.referencia[r.id]) +
        (discrepa ? ' — se aparta ' + num(dif) + ' puntos.' : ' — coinciden.');
      caja.appendChild(comp);
    }

    elRasgos.appendChild(caja);
  });
}

function pintarConsecuencias() {
  var cs = consecuenciasDe(perfilActual());
  elCons.textContent = '';
  elSinCons.className = cs.length === 0 ? 'apagado' : 'apagado oculto';

  cs.forEach(function (c) {
    var caja = document.createElement('div');
    caja.className = 'consecuencia';
    caja.style.borderLeftColor = c.lado === 'servicios' ? 'var(--bien)' : 'var(--acento)';

    var t = document.createElement('h3');
    t.textContent = c.titulo;
    caja.appendChild(t);

    var nombre = '';
    for (var i = 0; i < DATOS.rasgos.length; i++) if (DATOS.rasgos[i].id === c.rasgo) nombre = DATOS.rasgos[i].nombre;
    var et = document.createElement('span');
    et.className = 'marca-tono ' + (c.lado === 'servicios' ? 'tono-bien' : 'tono-acento');
    et.textContent = nombre;
    caja.appendChild(et);

    var p = document.createElement('p');
    p.className = 'menudo';
    p.style.marginTop = '.35rem';
    p.textContent = c.texto;
    caja.appendChild(p);

    elCons.appendChild(caja);
  });
}

function pintarCriterio() {
  var caso = casoDe(casoId);
  if (!comparando) { elCriterio.className = 'tarjeta oculto'; return; }
  elCriterio.className = 'tarjeta';
  document.getElementById('criterio-titulo').textContent = 'Por qué el docente sitúa así ' + caso.nombre.toLowerCase();
  document.getElementById('criterio-texto').textContent = caso.justificacion;

  var cont = document.getElementById('criterio-difieren');
  cont.textContent = '';
  var p = perfilActual();
  var difieren = DATOS.rasgos.filter(function (r) { return Math.abs(p[r.id] - caso.referencia[r.id]) > TOLERANCIA; });

  if (difieren.length === 0) {
    var ok = document.createElement('p');
    ok.className = 'aviso aviso-bien';
    ok.textContent = 'Su perfil coincide con el del docente en los ocho rasgos, dentro de la tolerancia.';
    cont.appendChild(ok);
    return;
  }

  var titulo = document.createElement('p');
  titulo.className = 'eyebrow';
  titulo.style.marginTop = '.75rem';
  titulo.textContent = 'Dónde difieren';
  cont.appendChild(titulo);

  difieren.forEach(function (r) {
    var linea = document.createElement('p');
    linea.className = 'aviso aviso-avisar';
    var fuerte = document.createElement('strong');
    fuerte.textContent = r.nombre + '. ';
    linea.appendChild(fuerte);
    linea.appendChild(document.createTextNode(
      'Usted lo situó en ' + num(p[r.id]) + ' y el docente en ' + num(caso.referencia[r.id]) +
      '. No significa que esté mal: son criterios, no mediciones. Vale la pena preguntarse cuál de los dos describe ' +
      'mejor a esta organización.'));
    cont.appendChild(linea);
  });
}

/* La tabla mostraba las cuatro organizaciones con su índice desde el principio:
   bastaba mirarla para saber la respuesta antes de perfilar nada. Cada fila se
   revela al comparar esa organización. */
function pintarResumen() {
  var cuerpo = document.querySelector('#resumen tbody');
  cuerpo.textContent = '';
  var revelados = 0;

  DATOS.casos.forEach(function (c) {
    var fila = document.createElement('tr');
    if (c.id === casoId) fila.style.background = 'var(--superficie-2)';

    var n = document.createElement('td');
    n.textContent = c.nombre;
    fila.appendChild(n);

    if (comparados[c.id]) {
      revelados++;
      var v = document.createElement('td');
      v.className = 'numero';
      v.textContent = num(c.indiceReferencia, 1);
      fila.appendChild(v);

      var l = document.createElement('td');
      var et = document.createElement('span');
      et.className = 'marca-tono ' + tonoDe(clasificar(c.indiceReferencia));
      et.textContent = clasificar(c.indiceReferencia);
      l.appendChild(et);
      fila.appendChild(l);
    } else {
      var pendiente = document.createElement('td');
      pendiente.colSpan = 2;
      pendiente.style.color = 'var(--tinta-tenue)';
      pendiente.textContent = 'Perfílela y compárela para verlo';
      fila.appendChild(pendiente);
    }

    cuerpo.appendChild(fila);
  });

  var pie = document.getElementById('resumen-pie');
  var todas = revelados === DATOS.casos.length;
  pie.className = todas ? 'menudo' : 'menudo oculto';

  var intro = document.getElementById('resumen-intro');
  intro.textContent = todas
    ? 'Ya perfiló y comparó las cuatro. Ahora la tabla se lee de un vistazo.'
    : 'Cada organización aparece cuando la haya comparado con el criterio del docente. Lleva ' +
      revelados + ' de ' + DATOS.casos.length + '.';
}

function pintar() {
  elDesc.textContent = casoDe(casoId).descripcion;
  document.getElementById('comparar').textContent = comparando
    ? 'Ocultar el criterio del docente'
    : 'Comparar con el criterio del docente';
  pintarContinuo();
  pintarRasgos();
  pintarConsecuencias();
  pintarCriterio();
  pintarResumen();
  revisarCompletitud();
}

/* Arranque */
DATOS.casos.forEach(function (c) {
  var o = document.createElement('option');
  o.value = c.id;
  o.textContent = c.nombre;
  elCaso.appendChild(o);
});
elCaso.addEventListener('change', function () {
  casoId = elCaso.value;
  comparando = false;
  pintar();
});
document.getElementById('centrar').addEventListener('click', function () {
  perfiles[casoId] = neutro();
  guardar();
  anunciar('Perfil devuelto al centro.');
  pintar();
});
document.getElementById('comparar').addEventListener('click', function () {
  comparando = !comparando;
  if (comparando) { comparados[casoId] = true; guardar(); }
  pintar();
});
window.addEventListener('unload', function () { Scorm.terminar(); });

Scorm.iniciar();
elRegistro.textContent = Scorm.disponible()
  ? 'Esta actividad no lleva calificación: el perfil es un criterio, no una medición. Se registra como completada cuando haya perfilado y comparado las cuatro organizaciones.'
  : 'Modo sin conexión con la plataforma: no queda registro. Sirve igual para practicar.';

var guardado = Scorm.leer();
if (guardado) {
  try {
    var previo = JSON.parse(guardado);
    if (previo && previo.p) {
      DATOS.casos.forEach(function (c) {
        if (previo.p[c.id]) {
          var p = neutro();
          DATOS.rasgos.forEach(function (r) {
            var v = previo.p[c.id][r.id];
            if (typeof v === 'number' && v >= 0 && v <= 100) p[r.id] = v;
          });
          perfiles[c.id] = p;
        }
      });
      tocados = previo.t || {};
      comparados = previo.c || {};
    }
  } catch (e) {}
}
pintar();
`;

  return documentoHTML({
    titulo,
    eyebrow: 'Módulo 1 · Fundamentos de gestión de operaciones',
    subtitulo: 'Manufactura y servicios: un continuo, no dos casillas',
    cuerpo,
    guion,
  });
}

export function casosDesde(datos: {
  casosNaturaleza: readonly {
    id: string;
    nombre: string;
    descripcion: string;
    perfilReferencia: Perfil;
    justificacion: string;
  }[];
}): CasoExportable[] {
  return datos.casosNaturaleza.map((c) => ({ ...c }));
}

export { esc };
