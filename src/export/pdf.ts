/**
 * Generador de PDF sin dependencias.
 *
 * La alternativa era agregar una librería de PDF, que pesa entre 350 y 400 kB.
 * En una aplicación que tiene que funcionar sin conexión y que ya carga KaTeX,
 * eso es mucho paquete para producir un documento de texto y tablas. Escribir
 * el archivo a mano cuesta este módulo y no cuesta ningún kilobyte de red.
 *
 * El PDF se arma con las fuentes **base 14** —Helvetica y Helvetica-Bold—, que
 * todo lector trae incorporadas: no hay que empotrar ningún archivo de fuente.
 * Se usa la codificación WinAnsi, que cubre el español completo: tildes, ñ, ü y
 * los signos de apertura. Los caracteres fuera de esa tabla se sustituyen por
 * su equivalente más cercano en lugar de romper el archivo.
 *
 * Lo que este módulo **no** hace: imágenes, colores más allá de grises,
 * fuentes propias ni acentos fuera de Latin-1. Para eso está la impresión del
 * navegador, que sigue disponible.
 */

// ───────────────────────────── Métricas ─────────────────────────────

/**
 * Anchos de avance de Helvetica, en milésimas de em, para el rango imprimible
 * de ASCII. Son las métricas estándar de las fuentes base 14 de Adobe.
 *
 * Los caracteres acentuados no necesitan entrada propia: en Helvetica una `á`
 * avanza exactamente lo mismo que una `a`, así que se resuelven mapeándolos a
 * su letra base. Un ancho equivocado no corrompería el archivo —solo movería un
 * corte de línea—, pero conviene que estén bien para que las tablas no se
 * desborden.
 */
const ANCHOS_NORMAL: readonly number[] = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const ANCHOS_NEGRITA: readonly number[] = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

/**
 * Letra base de cada carácter acentuado, para medir su ancho.
 *
 * También recoge los caracteres tipográficos que la aplicación usa y que no
 * existen en WinAnsi —el signo menos U+2212, las comillas latinas— junto con su
 * reemplazo. Sustituirlos es preferible a escribir un byte inválido.
 */
const EQUIVALENCIAS: Readonly<Record<string, string>> = {
  á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n',
  Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ü: 'U', Ñ: 'N',
  '¿': '?', '¡': '!', '°': 'o', 'º': 'o', 'ª': 'a',
  // Estos sí existen en WinAnsi y se escriben tal cual; van aquí solo para medir.
  '—': '-', '–': '-', '«': '"', '»': '"', '“': '"', '”': '"', '‘': "'", '’': "'",
  '…': '...',
  // El menos tipográfico y otros signos matemáticos no están en WinAnsi.
  '−': '-', '×': 'x', '÷': '/', '≤': '<=', '≥': '>=', '≠': '!=', '·': '.',
};

/** Bytes de WinAnsi para los caracteres de uso frecuente fuera de ASCII. */
const WINANSI: Readonly<Record<string, number>> = {
  á: 0xe1, é: 0xe9, í: 0xed, ó: 0xf3, ú: 0xfa, ü: 0xfc, ñ: 0xf1,
  Á: 0xc1, É: 0xc9, Í: 0xcd, Ó: 0xd3, Ú: 0xda, Ü: 0xdc, Ñ: 0xd1,
  '¿': 0xbf, '¡': 0xa1, '°': 0xb0, 'º': 0xba, 'ª': 0xaa,
  '—': 0x97, '–': 0x96, '«': 0xab, '»': 0xbb,
  '“': 0x93, '”': 0x94, '‘': 0x91, '’': 0x92,
  '€': 0x80, '£': 0xa3, '¢': 0xa2, '§': 0xa7, '©': 0xa9, '±': 0xb1, 'µ': 0xb5,
  // Estos también están en WinAnsi, así que se escriben tal cual en vez de
  // sustituirse: el punto medio separa los datos del pie de todos los reportes.
  '·': 0xb7, '…': 0x85, '×': 0xd7, '÷': 0xf7, '¼': 0xbc, '½': 0xbd, '¾': 0xbe,
};

/** Ancho de un texto en puntos, para un tamaño de fuente dado. */
export function anchoTexto(texto: string, tamano: number, negrita = false): number {
  const tabla = negrita ? ANCHOS_NEGRITA : ANCHOS_NORMAL;
  let milesimas = 0;

  for (const caracter of texto) {
    const equivalente = EQUIVALENCIAS[caracter] ?? caracter;
    for (const c of equivalente) {
      const codigo = c.charCodeAt(0);
      // Fuera del rango imprimible se usa el ancho de la letra «n», que es el
      // promedio de la fuente: no vale la pena una tabla completa para un caso
      // que casi no ocurre.
      milesimas += codigo >= 32 && codigo <= 126 ? (tabla[codigo - 32] ?? 556) : 556;
    }
  }

  return (milesimas * tamano) / 1000;
}

/** Parte un texto en líneas que quepan en el ancho dado. */
export function partirEnLineas(texto: string, anchoMaximo: number, tamano: number, negrita = false): string[] {
  const lineas: string[] = [];

  for (const parrafo of texto.split('\n')) {
    if (parrafo.trim() === '') {
      lineas.push('');
      continue;
    }

    let actual = '';
    for (const palabra of parrafo.split(/\s+/)) {
      const tentativa = actual === '' ? palabra : `${actual} ${palabra}`;
      if (anchoTexto(tentativa, tamano, negrita) <= anchoMaximo || actual === '') {
        actual = tentativa;
      } else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    if (actual !== '') lineas.push(actual);
  }

  return lineas;
}

/** Recorta un texto hasta que quepa, agregando puntos suspensivos. */
export function recortarA(texto: string, anchoMaximo: number, tamano: number, negrita = false): string {
  if (anchoTexto(texto, tamano, negrita) <= anchoMaximo) return texto;
  let corte = texto;
  while (corte.length > 1 && anchoTexto(`${corte}...`, tamano, negrita) > anchoMaximo) {
    corte = corte.slice(0, -1);
  }
  return `${corte}...`;
}

// ───────────────────────────── Codificación ─────────────────────────────

/** Convierte un texto a los bytes de una cadena literal de PDF, ya escapada. */
function bytesDeTexto(texto: string): number[] {
  const salida: number[] = [];

  for (const caracter of texto) {
    const codigo = caracter.charCodeAt(0);

    if (codigo >= 32 && codigo <= 126) {
      // Los tres caracteres que delimitan una cadena en PDF hay que escaparlos.
      if (caracter === '(' || caracter === ')' || caracter === '\\') salida.push(0x5c);
      salida.push(codigo);
      continue;
    }

    const winansi = WINANSI[caracter];
    if (winansi !== undefined) {
      salida.push(winansi);
      continue;
    }

    // Sin equivalente directo: se sustituye por su forma aproximada, y si
    // tampoco la hay, por un espacio. Nunca se escribe un byte arbitrario.
    const equivalente = EQUIVALENCIAS[caracter];
    if (equivalente !== undefined) {
      salida.push(...bytesDeTexto(equivalente));
      continue;
    }
    salida.push(0x20);
  }

  return salida;
}

const ascii = (texto: string): number[] => [...texto].map((c) => c.charCodeAt(0) & 0xff);

// ───────────────────────────── Documento ─────────────────────────────

export interface OpcionesPDF {
  /** Título del documento, para las propiedades del archivo. */
  readonly titulo: string;
  readonly autor: string;
  /** Texto del pie, repetido en todas las páginas. */
  readonly pie: string;
}

/** Ancho y alto de la página carta, en puntos. */
const ANCHO_PAGINA = 612;
const ALTO_PAGINA = 792;
const MARGEN = 54;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;

export interface ColumnaPDF {
  readonly encabezado: string;
  /** Ancho relativo. Se normaliza contra la suma de todos. */
  readonly peso: number;
  readonly alineacion?: 'izquierda' | 'derecha';
}

/**
 * Constructor de documentos.
 *
 * Va acumulando operadores de dibujo por página y solo al final arma el archivo
 * con sus objetos, su tabla de referencias cruzadas y su tráiler. El salto de
 * página es automático: cada método comprueba si lo que va a escribir cabe.
 */
export class DocumentoPDF {
  private readonly paginas: number[][] = [];
  private actual: number[] = [];
  private y = ALTO_PAGINA - MARGEN;

  constructor(private readonly opciones: OpcionesPDF) {
    this.paginas.push(this.actual);
  }

  /** Espacio vertical que queda antes del pie de página. */
  private get disponible(): number {
    return this.y - (MARGEN + 24);
  }

  private nuevaPagina(): void {
    this.actual = [];
    this.paginas.push(this.actual);
    this.y = ALTO_PAGINA - MARGEN;
  }

  private asegurar(alto: number): void {
    if (alto > this.disponible) this.nuevaPagina();
  }

  private escribir(texto: string, x: number, tamano: number, negrita: boolean, gris = 0): void {
    this.actual.push(
      ...ascii(`BT /${negrita ? 'FB' : 'FN'} ${tamano} Tf ${gris} g ${x.toFixed(2)} ${this.y.toFixed(2)} Td (`),
      ...bytesDeTexto(texto),
      ...ascii(') Tj ET\n'),
    );
  }

  espacio(alto = 10): void {
    this.y -= alto;
  }

  titulo(texto: string, tamano = 16): void {
    this.asegurar(tamano * 1.6);
    this.y -= tamano;
    this.escribir(texto, MARGEN, tamano, true);
    this.y -= tamano * 0.4;
  }

  subtitulo(texto: string): void {
    this.asegurar(20);
    this.y -= 12;
    this.escribir(texto, MARGEN, 11, true);
    this.y -= 5;
  }

  parrafo(texto: string, tamano = 9.5, gris = 0.15): void {
    const alto = tamano * 1.35;
    for (const linea of partirEnLineas(texto, ANCHO_UTIL, tamano)) {
      this.asegurar(alto);
      this.y -= alto;
      if (linea !== '') this.escribir(linea, MARGEN, tamano, false, gris);
    }
    this.y -= 3;
  }

  /** Par «término: valor», para las fichas de datos del encabezado. */
  ficha(termino: string, valor: string): void {
    const alto = 13;
    this.asegurar(alto);
    this.y -= alto;
    this.escribir(`${termino}:`, MARGEN, 9, true, 0.35);
    this.escribir(recortarA(valor, ANCHO_UTIL - 130, 9), MARGEN + 120, 9, false);
  }

  linea(gris = 0.75): void {
    this.asegurar(8);
    this.y -= 6;
    this.actual.push(
      ...ascii(
        `${gris} G 0.6 w ${MARGEN} ${this.y.toFixed(2)} m ${(ANCHO_PAGINA - MARGEN).toFixed(2)} ${this.y.toFixed(2)} l S\n`,
      ),
    );
    this.y -= 4;
  }

  /**
   * Tabla con encabezado repetido en cada página.
   *
   * Las celdas se recortan al ancho de su columna: es preferible un texto con
   * puntos suspensivos a uno que invade la columna vecina y deja el documento
   * ilegible.
   */
  tabla(columnas: readonly ColumnaPDF[], filas: readonly (readonly string[])[]): void {
    const pesoTotal = columnas.reduce((t, c) => t + c.peso, 0);
    const anchos = columnas.map((c) => (c.peso / pesoTotal) * ANCHO_UTIL);
    const alto = 14;

    const encabezado = (): void => {
      this.asegurar(alto * 2);
      this.y -= alto;
      let x = MARGEN;
      columnas.forEach((c, i) => {
        const ancho = anchos[i]!;
        const texto = recortarA(c.encabezado, ancho - 6, 8.5, true);
        const desplazamiento = c.alineacion === 'derecha' ? ancho - 3 - anchoTexto(texto, 8.5, true) : 0;
        this.escribir(texto, x + desplazamiento, 8.5, true, 0.25);
        x += ancho;
      });
      this.linea(0.55);
    };

    encabezado();

    for (const fila of filas) {
      if (alto > this.disponible) {
        this.nuevaPagina();
        encabezado();
      }
      this.y -= alto;
      let x = MARGEN;
      columnas.forEach((c, i) => {
        const ancho = anchos[i]!;
        const texto = recortarA(fila[i] ?? '', ancho - 6, 8.5);
        const desplazamiento = c.alineacion === 'derecha' ? ancho - 3 - anchoTexto(texto, 8.5) : 0;
        this.escribir(texto, x + desplazamiento, 8.5, false, 0.1);
        x += ancho;
      });
    }

    this.y -= 4;
  }

  /** Arma el archivo completo. */
  bytes(): Uint8Array {
    const objetos: number[][] = [];
    const total = this.paginas.length;

    // 1 catálogo, 2 páginas, 3 y 4 fuentes, 5 información; de ahí en adelante,
    // dos objetos por página (la página y su contenido).
    const idPagina = (i: number): number => 6 + i * 2;
    const idContenido = (i: number): number => 7 + i * 2;

    objetos.push(ascii('<< /Type /Catalog /Pages 2 0 R >>'));
    objetos.push(
      ascii(
        `<< /Type /Pages /Count ${total} /Kids [${this.paginas.map((_, i) => `${idPagina(i)} 0 R`).join(' ')}] >>`,
      ),
    );
    objetos.push(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
    objetos.push(ascii('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
    objetos.push([
      ...ascii('<< /Title ('),
      ...bytesDeTexto(this.opciones.titulo),
      ...ascii(') /Author ('),
      ...bytesDeTexto(this.opciones.autor),
      ...ascii(') /Producer (OPTIAULA IO) >>'),
    ]);

    this.paginas.forEach((contenido, i) => {
      objetos.push(
        ascii(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ANCHO_PAGINA} ${ALTO_PAGINA}] ` +
            `/Resources << /Font << /FN 3 0 R /FB 4 0 R >> >> /Contents ${idContenido(i)} 0 R >>`,
        ),
      );

      // El pie va al final del contenido de cada página, no al escribirla: así
      // lleva la numeración definitiva, que solo se conoce al terminar.
      const pie = [
        ...ascii(`BT /FN 7.5 Tf 0.45 g ${MARGEN} ${MARGEN - 12} Td (`),
        ...bytesDeTexto(this.opciones.pie),
        ...ascii(') Tj ET\n'),
        ...ascii(`BT /FN 7.5 Tf 0.45 g ${(ANCHO_PAGINA - MARGEN - 60).toFixed(2)} ${MARGEN - 12} Td (`),
        ...bytesDeTexto(`Página ${i + 1} de ${total}`),
        ...ascii(') Tj ET\n'),
      ];

      const flujo = [...contenido, ...pie];
      objetos.push([...ascii(`<< /Length ${flujo.length} >>\nstream\n`), ...flujo, ...ascii('\nendstream')]);
    });

    // Ensamblado con la tabla de referencias cruzadas: cada entrada necesita el
    // desplazamiento en bytes del objeto, así que se cuenta mientras se escribe.
    const salida: number[] = [...ascii('%PDF-1.4\n')];
    const desplazamientos: number[] = [];

    objetos.forEach((cuerpo, i) => {
      desplazamientos.push(salida.length);
      salida.push(...ascii(`${i + 1} 0 obj\n`), ...cuerpo, ...ascii('\nendobj\n'));
    });

    const inicioXref = salida.length;
    salida.push(...ascii(`xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`));
    for (const d of desplazamientos) {
      salida.push(...ascii(`${String(d).padStart(10, '0')} 00000 n \n`));
    }
    salida.push(
      ...ascii(
        `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`,
      ),
    );

    return new Uint8Array(salida);
  }
}
