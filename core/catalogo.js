// Catálogo de aplicativos del SIM.
// Para integrar un aplicativo nuevo: agregar su entrada aquí con su `url`
// (relativa a la raíz del portal) y sus módulos.
//
// estado: 'prod' | 'dev' | 'plan' | 'adm'
// grupo:  'op' (Operación) | 'mae' (Maestros) | 'gest' (Gestión)

export const ROLES = [
  { id: 'admin',      label: 'Admin',      desc: 'Control total del aplicativo' },
  { id: 'supervisor', label: 'Supervisor', desc: 'Registra, edita y aprueba' },
  { id: 'operador',   label: 'Operador',   desc: 'Registra información' },
  { id: 'lectura',    label: 'Lectura',    desc: 'Solo consulta' }
];

export const ROLES_ESCRITURA = ['admin', 'supervisor', 'operador'];

export const ESTADOS = {
  prod: { label: 'En producción',      bg: 'rgba(111,227,207,.16)', fg: '#8FF0DE' },
  dev:  { label: 'En construcción',    bg: 'rgba(245,185,74,.16)',  fg: '#FFCF73' },
  plan: { label: 'Planificado',        bg: 'rgba(255,255,255,.09)', fg: '#DDE4EB' },
  adm:  { label: 'Solo administrador', bg: 'rgba(169,180,255,.16)', fg: '#C5CCFF' }
};

export const GRUPOS = [
  { id: 'all',  label: 'Todos' },
  { id: 'op',   label: 'Operación' },
  { id: 'mae',  label: 'Maestros' },
  { id: 'gest', label: 'Gestión' }
];

export const APPS = [
  {
    id: 'adm', nombre: 'Administración', sub: 'Usuarios, permisos y aplicativos',
    grupo: 'gest', estado: 'adm', fase: 'F0', color: '#CFD8E3', soloAdmin: true,
    url: 'admin/',
    icon: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
    modulos: [
      { id: 'usuarios', nombre: 'Usuarios' },
      { id: 'permisos', nombre: 'Permisos' },
      { id: 'aplicativos', nombre: 'Aplicativos' }
    ]
  },
  {
    id: 'cong', nombre: 'Congelamiento', sub: 'Control de túneles y congeladores',
    grupo: 'op', estado: 'prod', fase: 'F1', color: '#7CC8F8',
    url: 'apps/cong/',
    herramientas: [{ nombre: 'Copia de datos desde el sistema actual', url: 'apps/cong/migrar.html' }],
    icon: 'M12 2v20M3.34 7l17.32 10M20.66 7L3.34 17M9 4l3 2 3-2M9 20l3-2 3 2M4.3 10.4l2.7.6-.4 2.8M19.7 13.6l-2.7-.6.4-2.8',
    modulos: [
      { id: 'proceso', nombre: 'En proceso' },
      { id: 'registros', nombre: 'Registros' },
      { id: 'eventos', nombre: 'Eventos / Paradas' },
      { id: 'dashboard', nombre: 'Dashboard' },
      { id: 'pantalla', nombre: 'Pantalla' },
      { id: 'config', nombre: 'Configuración' }
    ]
  },
  {
    id: 'cost', nombre: 'Costos de mantenimiento', sub: 'OPEX, CAPEX y costo por TM',
    grupo: 'gest', estado: 'dev', fase: 'F2', color: '#F5B94A', url: 'apps/cost/',
    herramientas: [{ nombre: 'Cargar datos de Nisira', url: 'apps/cost/cargar.html' }],
    icon: 'M3 3v18h18M7 15l4-4 3 3 5-6M16 8h3v3',
    modulos: [
      { id: 'general', nombre: 'Dashboard general' },
      { id: 'ratio', nombre: 'S/ por TM producida' },
      { id: 'congelado', nombre: 'Congelado' },
      { id: 'hielo', nombre: 'Planta de hielo' },
      { id: 'osmosis', nombre: 'Planta de ósmosis' },
      { id: 'calderos', nombre: 'Calderos' },
      { id: 'resto', nombre: 'Resto de planta' },
      { id: 'equipos', nombre: 'Análisis por equipo' },
      { id: 'asignar', nombre: 'Asignación de costos' },
      { id: 'catalogo', nombre: 'Catálogo de equipos' },
      { id: 'capex', nombre: 'CAPEX' }
    ]
  },
  {
    id: 'eq', nombre: 'Equipos', sub: 'Base maestra de equipos de planta',
    grupo: 'mae', estado: 'plan', fase: 'F3', color: '#A9B4FF', url: null,
    icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1',
    modulos: []
  },
  {
    id: 'par', nombre: 'Registro de parámetros', sub: 'Lecturas operativas por sala',
    grupo: 'op', estado: 'plan', fase: 'F4', color: '#6FE3CF', url: null,
    icon: 'M3.5 17a9 9 0 1 1 17 0M12 14l3.5-5M10.5 14a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
    modulos: [
      { id: 'osmosis', nombre: 'Ósmosis' },
      { id: 'salas', nombre: 'Salas de máquinas' },
      { id: 'calderos', nombre: 'Calderos' }
    ]
  },
  {
    id: 'mat', nombre: 'Materiales e inventario', sub: 'Catálogo, stock y kardex',
    grupo: 'mae', estado: 'plan', fase: 'F5', color: '#F29E7A', url: null,
    icon: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8M7.5 5.5l9 5',
    modulos: []
  },
  {
    id: 'conf', nombre: 'Conformidades', sub: 'Trabajos realizados por proveedores',
    grupo: 'gest', estado: 'plan', fase: 'F6', color: '#8FE39A', url: null,
    icon: 'M9 3h6v3H9zM9 4.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5.5a1 1 0 0 0-1-1h-3M9 14l2 2 4-4',
    modulos: []
  },
  {
    id: 'rep', nombre: 'Reporte de mantenimiento', sub: 'Formato de reporte de trabajos',
    grupo: 'op', estado: 'plan', fase: 'F6', color: '#E7A9F0', url: null,
    icon: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 13h8M8 17h5',
    modulos: []
  },
  {
    id: 'plan', nombre: 'Plan de mantenimiento y OT', sub: 'Programación y órdenes de trabajo',
    grupo: 'gest', estado: 'plan', fase: 'F7', color: '#FF8FA3', url: null,
    icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
    modulos: []
  }
];

export const appPorId = (id) => APPS.find(a => a.id === id) || null;
