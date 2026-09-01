/**
 * Exportadores: CSV, Excel, JSON, portapapeles e impresión.
 *
 * Todo se genera en el navegador y sin dependencias. El «Excel» es un archivo
 * XML de hoja de cálculo (SpreadsheetML) que Excel y LibreOffice abren de forma
 * nativa, y conserva los tipos numéricos a diferencia del CSV. El PDF se escribe
 * byte a byte en `pdf.ts`, por la misma razón: una librería de PDF pesa entre
 * 350 y 400 kB en una aplicación que tiene que funcionar sin conexión.
 */

import { IDENTIDAD, pieDeReporte } from '@/config/identidad';
import { formatearNumero } from '@/nucleo/numero';
import { DocumentoPDF } from './pdf';

export interface TablaExportable {
  readonly titulo: string;
  readonly encabezados: readonly string[];
  readonly filas: readonly (readonly (string | number)[])[];
}

function descargar(nombre: string, contenido: string, tipo: string): void {
  // El BOM hace que Excel reconozca UTF-8 y no destroce las tildes.
  const blob = new Blob([tipo.includes('csv') ? '﻿' + contenido : contenido], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function celdaCSV(valor: string | number): string {
  const texto = String(valor);
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** CSV con punto y coma, que es lo que espera Excel en configuración regional española. */
export function tablaACSV(tabla: TablaExportable): string {
  const lineas = [tabla.encabezados.map(celdaCSV).join(';'), ...tabla.filas.map((f) => f.map(celdaCSV).join(';'))];
  return lineas.join('\r\n');
}

export function exportarCSV(tabla: TablaExportable, nombreArchivo: string): void {
  descargar(`${nombreArchivo}.csv`, tablaACSV(tabla), 'text/csv');
}

function escaparXML(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Hoja de cálculo en SpreadsheetML 2003: la abren Excel y LibreOffice. */
export function exportarExcel(tablas: readonly TablaExportable[], nombreArchivo: string): void {
  const hojas = tablas
    .map((tabla) => {
      const filas = [
        `<Row><Cell ss:StyleID="titulo"><Data ss:Type="String">${escaparXML(tabla.titulo)}</Data></Cell></Row>`,
        '<Row/>',
        `<Row>${tabla.encabezados
          .map((h) => `<Cell ss:StyleID="encabezado"><Data ss:Type="String">${escaparXML(h)}</Data></Cell>`)
          .join('')}</Row>`,
        ...tabla.filas.map(
          (fila) =>
            `<Row>${fila
              .map((c) =>
                typeof c === 'number' && Number.isFinite(c)
                  ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>`
                  : `<Cell><Data ss:Type="String">${escaparXML(String(c))}</Data></Cell>`,
              )
              .join('')}</Row>`,
        ),
      ].join('');

      const nombreHoja = escaparXML(tabla.titulo.slice(0, 28).replace(/[\\/?*[\]:]/g, ' '));
      return `<Worksheet ss:Name="${nombreHoja}"><Table>${filas}</Table></Worksheet>`;
    })
    .join('');

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<?mso-application progid="Excel.Sheet"?>' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    `<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">` +
    `<Title>${escaparXML(nombreArchivo)}</Title>` +
    `<Author>${escaparXML(IDENTIDAD.autor.nombre)}</Author>` +
    `<Company>${escaparXML(IDENTIDAD.institucion.nombre)}</Company>` +
    `</DocumentProperties>` +
    '<Styles>' +
    '<Style ss:ID="titulo"><Font ss:Bold="1" ss:Size="13"/></Style>' +
    '<Style ss:ID="encabezado"><Font ss:Bold="1"/><Interior ss:Color="#E4ECF3" ss:Pattern="Solid"/></Style>' +
    '</Styles>' +
    hojas +
    '</Workbook>';

  descargar(`${nombreArchivo}.xls`, xml, 'application/vnd.ms-excel');
}

export function exportarJSON(datos: unknown, nombreArchivo: string): void {
  descargar(`${nombreArchivo}.json`, JSON.stringify(datos, null, 2), 'application/json');
}

/** Copia una tabla al portapapeles en formato tabulado, listo para pegar en Excel. */
export async function copiarTabla(tabla: TablaExportable): Promise<boolean> {
  const texto = [tabla.encabezados.join('\t'), ...tabla.filas.map((f) => f.join('\t'))].join('\n');
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Respaldo para navegadores sin permiso de portapapeles.
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/** Abre el diálogo de impresión del navegador, que también permite guardar como PDF. */
export function imprimir(): void {
  window.print();
}

/** Nombre de archivo seguro a partir de un título. */
export function nombreSeguro(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60);
}

/** Encabezado normalizado que llevan todos los reportes exportados. */
export interface EncabezadoReporte {
  readonly tipoReporte: string;
  readonly tema: string;
  readonly estudiante: string;
  readonly docente: string;
  readonly institucion: string;
  readonly curso: string;
  readonly periodo: string;
  readonly fecha: string;
}

export function filasDeEncabezado(e: EncabezadoReporte): readonly (readonly string[])[] {
  return [
    ['Aplicación', `${IDENTIDAD.nombre} v${IDENTIDAD.version}`],
    ['Reporte', e.tipoReporte],
    ['Tema', e.tema],
    ['Estudiante', e.estudiante],
    ['Docente', e.docente],
    ['Institución', e.institucion],
    ['Curso', e.curso],
    ['Periodo', e.periodo],
    ['Fecha', e.fecha],
    ['Pie', pieDeReporte()],
  ];
}

export function fechaLegible(iso: string = new Date().toISOString()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-HN', { dateStyle: 'long', timeStyle: 'short' });
}

export function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function duracionLegible(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  if (m === 0) return `${s} s`;
  return `${m} min ${String(s).padStart(2, '0')} s`;
}

// ───────────────────────────── PDF ─────────────────────────────

export interface SeccionPDF {
  readonly titulo?: string;
  readonly parrafos?: readonly string[];
  readonly tablas?: readonly TablaExportable[];
}

export interface ContenidoPDF {
  readonly titulo: string;
  readonly encabezado: EncabezadoReporte;
  readonly secciones: readonly SeccionPDF[];
}

/**
 * Genera y descarga el reporte como PDF, sin pasar por el diálogo del
 * navegador.
 *
 * La impresión del navegador sigue disponible y da un resultado más rico
 * —conserva las gráficas—; esto entrega un archivo directo, con la misma
 * estructura de encabezado que el resto de las salidas, para cuando hay que
 * archivar o enviar y no imprimir.
 */
export function exportarPDF(contenido: ContenidoPDF, nombreArchivo: string): void {
  const doc = new DocumentoPDF({
    titulo: `${contenido.encabezado.tipoReporte} — ${contenido.titulo}`,
    autor: contenido.encabezado.docente,
    pie: pieDeReporte(),
  });

  doc.titulo(contenido.encabezado.tipoReporte, 15);
  doc.parrafo(`${contenido.encabezado.institucion} · ${contenido.encabezado.curso}`, 9.5, 0.4);
  doc.espacio(4);

  for (const [termino, valor] of filasDeEncabezado(contenido.encabezado)) {
    doc.ficha(termino ?? '', valor ?? '');
  }
  doc.linea();

  for (const seccion of contenido.secciones) {
    if (seccion.titulo !== undefined) doc.subtitulo(seccion.titulo);
    for (const p of seccion.parrafos ?? []) doc.parrafo(p);
    for (const t of seccion.tablas ?? []) {
      if (t.filas.length === 0) continue;
      doc.subtitulo(t.titulo);
      // Las columnas de números se alinean a la derecha; el ancho se reparte
      // dando más espacio a las de texto, que es donde hace falta.
      const numericas = t.encabezados.map((_, j) => t.filas.every((f) => typeof f[j] === 'number'));
      doc.tabla(
        t.encabezados.map((h, j) => ({
          encabezado: h,
          peso: numericas[j] === true ? 2 : 3,
          alineacion: numericas[j] === true ? ('derecha' as const) : ('izquierda' as const),
        })),
        t.filas.map((f) => f.map((c) => (typeof c === 'number' ? formatearNumero(c, { decimales: 2 }) : String(c)))),
      );
    }
  }

  const blob = new Blob([doc.bytes() as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
