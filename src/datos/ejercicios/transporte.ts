/**
 * Los once problemas de transporte, transcritos de
 * `Ejercicios de Transporte.docx` (agosto 2025).
 *
 * Todos están balanceados en el original (inconsistencia I-06); los casos no
 * balanceados los produce el generador.
 */

import { preguntasTransporte } from '@/nucleo/preguntas';
import type { Contexto, Dificultad, Ejercicio, Moneda } from '@/esquemas';

interface Semilla {
  readonly n: number;
  readonly titulo: string;
  readonly contexto: Contexto;
  readonly dificultad: Dificultad;
  readonly atribucion: string;
  readonly enunciado: string;
  readonly origenes: readonly string[];
  readonly destinos: readonly string[];
  readonly costos: readonly (readonly number[])[];
  readonly oferta: readonly number[];
  readonly demanda: readonly number[];
  readonly unidadCosto: string;
  readonly unidadCantidad: string;
  readonly moneda: Moneda;
}

const SEMILLAS: readonly Semilla[] = [
  {
    n: 1,
    titulo: 'Distribución de leche fresca — cooperativa La Hacienda',
    contexto: 'lacteos',
    dificultad: 'intermedio',
    atribucion: 'Wilson',
    enunciado:
      'La cooperativa La Hacienda recoge leche en tres centros de acopio (C1, C2, C3) y debe abastecer cuatro mercados ' +
      'urbanos (M1 a M4). El objetivo es minimizar el costo logístico por litro transportado garantizando la demanda de ' +
      'cada mercado.',
    origenes: ['C1', 'C2', 'C3'],
    destinos: ['M1', 'M2', 'M3', 'M4'],
    costos: [
      [12, 9, 14, 16],
      [13, 7, 11, 10],
      [15, 12, 8, 9],
    ],
    oferta: [100, 120, 80],
    demanda: [90, 80, 70, 60],
    unidadCosto: 'L',
    unidadCantidad: 'litros',
    moneda: 'HNL',
  },
  {
    n: 2,
    titulo: 'Envío de maíz a molinos',
    contexto: 'maiz',
    dificultad: 'basico',
    atribucion: 'Evelin',
    enunciado:
      'Un productor dispone de dos bodegas (B1, B2) y debe enviar a tres molinos. Se busca minimizar el costo por ' +
      'tonelada transportada.',
    origenes: ['B1', 'B2'],
    destinos: ['Molino A', 'Molino B', 'Molino C'],
    costos: [
      [6, 4, 5],
      [7, 3, 6],
    ],
    oferta: [200, 250],
    demanda: [180, 150, 120],
    unidadCosto: 'L',
    unidadCantidad: 'toneladas',
    moneda: 'HNL',
  },
  {
    n: 3,
    titulo: 'Distribución de huevos a supermercados',
    contexto: 'avicultura_huevo',
    dificultad: 'basico',
    atribucion: 'Keny',
    enunciado:
      'Una empresa avícola con tres granjas (G1, G2, G3) abastece a tres cadenas de supermercados (S1, S2, S3). El costo ' +
      'varía por distancia y manejo. Minimice el costo por caja.',
    origenes: ['G1', 'G2', 'G3'],
    destinos: ['S1', 'S2', 'S3'],
    costos: [
      [18, 22, 17],
      [16, 19, 15],
      [20, 21, 14],
    ],
    oferta: [800, 900, 700],
    demanda: [700, 900, 800],
    unidadCosto: 'L',
    unidadCantidad: 'cajas',
    moneda: 'HNL',
  },
  {
    n: 4,
    titulo: 'Exportación de café por puertos',
    contexto: 'cafe',
    dificultad: 'basico',
    atribucion: 'Daniel',
    enunciado:
      'Dos zonas productoras (Z1, Z2) exportan a tres puertos (P1, P2, P3). Los costos incluyen flete terrestre y ' +
      'portuario. Minimice el costo en dólares por tonelada.',
    origenes: ['Z1', 'Z2'],
    destinos: ['P1', 'P2', 'P3'],
    costos: [
      [45, 40, 50],
      [48, 42, 44],
    ],
    oferta: [600, 400],
    demanda: [350, 450, 200],
    unidadCosto: 'US$',
    unidadCantidad: 'toneladas',
    moneda: 'USD',
  },
  {
    n: 5,
    titulo: 'Insumos veterinarios a clínicas',
    contexto: 'veterinaria',
    dificultad: 'intermedio',
    atribucion: 'Gracy',
    enunciado:
      'Una importadora con tres bodegas (B1, B2, B3) distribuye a cuatro clínicas (C1 a C4). Minimice el costo por caja ' +
      'de medicamentos.',
    origenes: ['B1', 'B2', 'B3'],
    destinos: ['C1', 'C2', 'C3', 'C4'],
    costos: [
      [12, 14, 9, 11],
      [10, 8, 12, 7],
      [13, 9, 10, 6],
    ],
    oferta: [300, 400, 300],
    demanda: [250, 220, 280, 250],
    unidadCosto: 'L',
    unidadCantidad: 'cajas',
    moneda: 'HNL',
  },
  {
    n: 6,
    titulo: 'Azúcar a distribuidores mayoristas',
    contexto: 'azucar',
    dificultad: 'basico',
    atribucion: 'Christopher',
    enunciado:
      'Un ingenio opera dos plantas (P1, P2) y abastece a tres distribuidores (D1, D2, D3). Minimice el costo por tonelada.',
    origenes: ['P1', 'P2'],
    destinos: ['D1', 'D2', 'D3'],
    costos: [
      [7, 5, 6],
      [8, 6, 4],
    ],
    oferta: [500, 400],
    demanda: [300, 350, 250],
    unidadCosto: 'L',
    unidadCantidad: 'toneladas',
    moneda: 'HNL',
  },
  {
    n: 7,
    titulo: 'Pollitos de un día a granjas de engorde',
    contexto: 'avicultura_pollitos',
    dificultad: 'intermedio',
    atribucion: 'Samuel',
    enunciado:
      'Una incubadora tiene dos centros (C1, C2) y envía a cuatro granjas (G1 a G4). Minimice el costo por millar de ' +
      'pollitos con manejo especializado.',
    origenes: ['C1', 'C2'],
    destinos: ['G1', 'G2', 'G3', 'G4'],
    costos: [
      [110, 95, 120, 100],
      [105, 100, 98, 96],
    ],
    oferta: [12, 10],
    demanda: [5, 7, 6, 4],
    unidadCosto: 'L',
    unidadCantidad: 'millares',
    moneda: 'HNL',
  },
  {
    n: 8,
    titulo: 'Carne de res de plantas a mercados',
    contexto: 'ganaderia',
    dificultad: 'basico',
    atribucion: 'Javier',
    enunciado:
      'Un matadero opera tres plantas (PL1 a PL3) que despachan a tres mercados (M1 a M3). Minimice el costo por tonelada ' +
      'considerando frío y distancia.',
    origenes: ['PL1', 'PL2', 'PL3'],
    destinos: ['M1', 'M2', 'M3'],
    costos: [
      [20, 24, 18],
      [22, 19, 21],
      [17, 23, 20],
    ],
    oferta: [250, 200, 150],
    demanda: [220, 180, 200],
    unidadCosto: 'L',
    unidadCantidad: 'toneladas',
    moneda: 'HNL',
  },
  {
    n: 9,
    titulo: 'Fertilizantes a cooperativas',
    contexto: 'fertilizantes',
    dificultad: 'intermedio',
    atribucion: 'Jeymi',
    enunciado:
      'Una distribuidora con tres almacenes (A1 a A3) abastece cuatro cooperativas. Minimice el costo en lempiras por saco.',
    origenes: ['A1', 'A2', 'A3'],
    destinos: ['Coop A', 'Coop B', 'Coop C', 'Coop D'],
    costos: [
      [15, 11, 13, 10],
      [12, 9, 14, 8],
      [16, 10, 12, 11],
    ],
    oferta: [400, 500, 300],
    demanda: [300, 260, 340, 300],
    unidadCosto: 'L',
    unidadCantidad: 'sacos',
    moneda: 'HNL',
  },
  {
    n: 10,
    titulo: 'Melón de exportación',
    contexto: 'melon',
    dificultad: 'avanzado',
    atribucion: 'Karla',
    enunciado:
      'Una empresa produce en dos fincas (F1, F2) y embarca por tres puertos (P1 a P3). Minimice el costo en dólares por ' +
      'contenedor, sumando flete terrestre y tarifa portuaria.\n\n' +
      '> **Observe la oferta y la demanda antes de resolver.** No siempre coinciden.',
    origenes: ['F1', 'F2'],
    destinos: ['P1', 'P2', 'P3'],
    costos: [
      [450, 400, 480],
      [430, 420, 410],
    ],
    oferta: [180, 120],
    demanda: [130, 120, 50],
    unidadCosto: 'US$',
    unidadCantidad: 'contenedores',
    moneda: 'USD',
  },
  {
    n: 11,
    titulo: 'Concentrado para aves a distribuidores regionales',
    contexto: 'avicultura_engorde',
    dificultad: 'intermedio',
    atribucion: 'Kristil',
    enunciado:
      'Una fábrica con dos plantas (P1, P2) envía a cuatro distribuidores (D1 a D4). El costo depende de distancia y ' +
      'peajes. Minimice el costo en lempiras por tonelada.',
    origenes: ['P1', 'P2'],
    destinos: ['D1', 'D2', 'D3', 'D4'],
    costos: [
      [22, 18, 20, 19],
      [21, 17, 23, 16],
    ],
    oferta: [600, 400],
    demanda: [250, 300, 220, 230],
    unidadCosto: 'L',
    unidadCantidad: 'toneladas',
    moneda: 'HNL',
  },
];

export const EJERCICIOS_TRANSPORTE: readonly Ejercicio[] = SEMILLAS.map((s) => ({
  id: `trans-${String(s.n).padStart(2, '0')}`,
  titulo: s.titulo,
  tema: 'transporte' as const,
  metodo: 'Esquina noroeste, costo mínimo, Vogel y MODI',
  contexto: s.contexto,
  dificultad: s.dificultad,
  enunciado: s.enunciado,
  datos: {
    tipo: 'transporte' as const,
    origenes: [...s.origenes],
    destinos: [...s.destinos],
    costos: s.costos.map((f) => [...f]),
    oferta: [...s.oferta],
    demanda: [...s.demanda],
    unidadCosto: s.unidadCosto,
    unidadCantidad: s.unidadCantidad,
    metodoInicialSugerido: 'vogel' as const,
  },
  preguntas: preguntasTransporte({
    titulo: s.titulo,
    origenes: s.origenes,
    destinos: s.destinos,
    costos: s.costos,
    oferta: s.oferta,
    demanda: s.demanda,
    unidadCosto: s.unidadCosto,
    unidadCantidad: s.unidadCantidad,
  }),
  moneda: s.moneda,
  unidades: [s.unidadCantidad, s.unidadCosto],
  tiempoEstimadoMinutos: s.origenes.length * s.destinos.length >= 12 ? 45 : 30,
  origen: 'textual' as const,
  validacion: 'verificado' as const,
  fuenteId: 'doc-transporte',
  atribucion: `Problema ${s.n} — ${s.atribucion}`,
  inconsistencias: ['I-06'],
  notasDocente: '',
  semilla: null,
  creadoEn: '2025-08-17T00:00:00.000Z',
  modificadoEn: '2025-08-17T00:00:00.000Z',
}));
