// Catálogos compartidos por los aplicativos del SIM (equipos, formatos, plan…).

// Sistemas de planta. El id es estable (se guarda en los datos); desde/hasta = rango de códigos de formatos R-XXX.
export const SISTEMAS = [
  { id: 0, nombre: 'General de Mantenimiento', corto: 'GEN', desde: 1,   hasta: 99 },
  { id: 1, nombre: 'Refrigeración',            corto: 'REF', desde: 101, hasta: 199 },
  { id: 2, nombre: 'Calderos',                 corto: 'CAL', desde: 201, hasta: 299 },
  { id: 3, nombre: 'Ósmosis',                  corto: 'OSM', desde: 301, hasta: 399 },
  { id: 4, nombre: 'Planta de hielo',          corto: 'HIE', desde: 401, hasta: 499 },
  { id: 5, nombre: 'Congelado',                corto: 'CON', desde: 501, hasta: 599 },
  { id: 6, nombre: 'Eléctrico',                corto: 'ELE', desde: 601, hasta: 699 },
  { id: 7, nombre: 'Infraestructura',          corto: 'INF', desde: 701, hasta: 799 }
];
export const sistemaPorId = (id) => SISTEMAS.find(s => s.id === Number(id)) || null;

// Estado de un equipo en la base maestra
export const ESTADOS_EQUIPO = [
  { id: 'operativo', label: 'Operativo',         bg: 'rgba(111,227,207,.16)', fg: '#8FF0DE' },
  { id: 'fuera',     label: 'Fuera de servicio', bg: 'rgba(245,185,74,.16)',  fg: '#FFCF73' },
  { id: 'baja',      label: 'De baja',           bg: 'rgba(255,143,143,.14)', fg: '#FFB3B3' }
];

export const CRITICIDAD = [
  { id: 'A', label: 'A · Alta',  desc: 'Su falla detiene la producción o afecta la inocuidad' },
  { id: 'B', label: 'B · Media', desc: 'Su falla reduce la capacidad o tiene respaldo limitado' },
  { id: 'C', label: 'C · Baja',  desc: 'Su falla no afecta la producción o tiene respaldo' }
];

// Normaliza texto para comparar sin tildes ni mayúsculas
export const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
