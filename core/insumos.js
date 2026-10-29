// Catálogo inicial de químicos e insumos de ósmosis (compartido por el formato R-302 y Materiales e inventario).
// El nombre es la clave que une lo registrado en el formato con el inventario: no cambiarlo una vez en uso.
// Los consumos de químicos no se suponen: el inventario los calcula con los registros del R-302.
export const INV_INICIO = '2026-10-28';           // fecha del stock inicial
export const MODULOS_OSMOSIS = ['OI-01', 'OI-02'];

export const INSUMOS_OSMOSIS = [
  { id: 'ai', corto: 'Antiincrustante', nombre: 'Antiincrustante ANCOTREAT 6590-M', tipo: 'quimico', unidad: 'kg', stockInicial: 75, reposicion: 15, dosis: { kg: 2, litros: 40 }, funcion: 'Evita incrustaciones en las membranas' },
  { id: 'bs', corto: 'Bisulfito', nombre: 'Bisulfito WP DECLR', tipo: 'quimico', unidad: 'kg', stockInicial: 190, reposicion: 15, dosis: { kg: 1, litros: 10 }, funcion: 'Elimina el cloro libre antes de las membranas' },
  { id: 'hs', corto: 'Hipoclorito Na', nombre: 'Hipoclorito de sodio 7,5 %', tipo: 'quimico', unidad: 'kg', stockInicial: 200, reposicion: 10, cloro: 0.075, dosis: { kg: 20, litros: 50 }, funcion: 'Desinfección del agua de alimentación' },
  { id: 'hc', corto: 'Hipoclorito Ca', nombre: 'Hipoclorito de calcio granulado 70 %', tipo: 'quimico', unidad: 'kg', stockInicial: 45, reposicion: 15, cloro: 0.70, respaldo: true, dosis: { kg: 1.7, litros: 50 }, funcion: 'Desinfección · respaldo del hipoclorito de sodio' },
  { id: 'c1', corto: 'Cartucho 1 µm', nombre: 'Filtro cartucho 1 µm', tipo: 'cartucho', unidad: 'und', stockInicial: 50, reposicion: 20 },
  { id: 'c5', corto: 'Cartucho 5 µm', nombre: 'Filtro cartucho 5 µm', tipo: 'cartucho', unidad: 'und', stockInicial: 50, reposicion: 20 },
  { id: 'ze', corto: 'Zeolita', nombre: 'Zeolita', tipo: 'filtrante', unidad: 'kg', stockInicial: 0, reposicion: 45, carga: 1200, vidaMeses: 18, ultimoCambio: { 'OI-01': '2025-03-15', 'OI-02': '2026-06-15' } },
  { id: 'gr', corto: 'Grava', nombre: 'Grava 3–4 mm', tipo: 'filtrante', unidad: 'kg', stockInicial: 0, reposicion: 45, carga: 350, vidaMeses: 18, ultimoCambio: { 'OI-01': '2025-03-15', 'OI-02': '2026-06-15' } }
];

export const QUIMICOS_OSMOSIS = INSUMOS_OSMOSIS.filter(x => x.tipo === 'quimico');
export const CONSUMIBLES_OSMOSIS = INSUMOS_OSMOSIS.filter(x => x.tipo !== 'quimico');
export const cortoDe = (x) => x.corto || x.nombre;
const n = (x) => String(x).replace('.', ',');
// Nota de referencia del R-302 (al pie del formato y consultable al llenar)
export const GUIA_DOSIFICACION = {
  titulo: 'Dosificación recomendada',
  nota: 'Cantidades por cada preparación del tanque. Preparar con agua permeada y usar guantes, lentes y mascarilla.',
  columnas: ['Químico', 'Dosis', 'Agua permeada'],
  // cada fila es { c: [...] }: Firestore no admite listas dentro de listas
  filas: INSUMOS_OSMOSIS.filter(x => x.dosis).map(x => ({ c: [x.nombre, `${n(x.dosis.kg)} kg`, `${x.dosis.litros} L`] }))
};
export const unidadesDe = (lista) => Object.fromEntries(lista.map(x => [x.nombre, x.unidad]));
