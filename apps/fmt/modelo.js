// Modelo del aplicativo Registro de formatos: catálogos, utilidades y formatos piloto.

import { SISTEMAS } from '../../core/maestros.js';
export { SISTEMAS };

export const FRECUENCIAS = ['Por turno', 'Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Según plan', 'Por evento'];

export const TIPOS_CAMPO = [
  { id: 'texto',     nombre: 'Texto corto' },
  { id: 'textoLargo',nombre: 'Texto largo' },
  { id: 'numero',    nombre: 'Número con rango' },
  { id: 'seleccion', nombre: 'Selección de lista' },
  { id: 'siNo',      nombre: 'Sí / No' },
  { id: 'conforme',  nombre: 'Conforme / No conforme / N.A.' },
  { id: 'fecha',     nombre: 'Fecha' },
  { id: 'hora',      nombre: 'Hora' },
  { id: 'fechaHora', nombre: 'Fecha y hora' },
  { id: 'duracion',  nombre: 'Duración calculada' },
  { id: 'equipo',    nombre: 'Equipo' },
  { id: 'referencia',nombre: 'Registro relacionado' },
  { id: 'foto',      nombre: 'Foto' }
];

export const MODOS_FIRMA = [
  { id: 'usuario',    nombre: 'Usuario que envía',    desc: 'Se firma con el usuario del sistema al enviar' },
  { id: 'manuscrita', nombre: 'Firma en pantalla',    desc: 'Nombre y firma con el dedo en el celular' },
  { id: 'aprobador',  nombre: 'Supervisor al aprobar', desc: 'La registra el supervisor al aprobar el registro' }
];

export const ESTADOS_COLUMNA = [
  { id: 'operando', label: 'Operando', corto: 'OP' },
  { id: 'parado', label: 'Parado', corto: 'PAR' },
  { id: 'mantenimiento', label: 'En mantenimiento', corto: 'MANT' },
  { id: 'fuera', label: 'Fuera de servicio', corto: 'F/S' }
];

export const TIPOS_FILA = [
  { id: 'numero',    nombre: 'Número' },
  { id: 'seleccion', nombre: 'Selección' },
  { id: 'texto',     nombre: 'Texto' }
];

export const TIPOS_SECCION = [
  { id: 'campos',    nombre: 'Campos',              desc: 'Datos sueltos en dos columnas' },
  { id: 'tabla',     nombre: 'Tabla de parámetros', desc: 'Lecturas por equipo de la base, con rangos' },
  { id: 'checklist', nombre: 'Checklist',           desc: 'Ítems Conforme / No conforme / N.A.' },
  { id: 'lista',     nombre: 'Lista repetible',     desc: 'Filas que se agregan al llenar' }
];

export const CONFIG_BASE = {
  versionManual: '6.0',
  prefijo: 'IPSMSA/MMTO',
  empresa: 'IP Santa Mónica Fishing S.A.C.',
  planta: 'Planta Paita',
  departamento: 'Departamento de Mantenimiento',
  logo: '',
  turnos: [{ nombre: 'Día', inicio: '07:00' }, { nombre: 'Noche', inicio: '19:00' }]
};

// Turnos con hora de inicio (acepta la forma antigua: lista de nombres)
export function turnosDe(cfg) {
  const t = (cfg && cfg.turnos && cfg.turnos.length ? cfg.turnos : CONFIG_BASE.turnos);
  const def = ['07:00', '19:00', '23:00'];
  return t.map((x, i) => typeof x === 'string' ? { nombre: x, inicio: def[i] || '07:00' } : { nombre: x.nombre, inicio: x.inicio || def[i] || '07:00' })
    .filter(x => x.nombre);
}

// Firmas como objetos { nombre, modo } (acepta la forma antigua: lista de textos)
export function firmasDe(def) {
  const f = (def && def.firmas) || [];
  return f.map((x, i) => {
    if (typeof x !== 'string') return { nombre: x.nombre || '', modo: x.modo || 'usuario' };
    const n = x;
    const modo = /verific|aprob|supervis|revis/i.test(n) ? 'aprobador' : i === 0 ? 'usuario' : 'manuscrita';
    return { nombre: n, modo };
  });
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clonar = (o) => JSON.parse(JSON.stringify(o ?? null));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 'aaaa-mm' → 'Oct-26'
export const mesClave = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function mesAbrev(clave) {
  if (!clave) return '—';
  const [a, m] = clave.split('-').map(Number);
  return `${MESES[m - 1]}-${String(a).slice(-2)}`;
}
export const revTxt = (n) => (n ? `${n}.0` : '—');
export const numCodigo = (codigo) => parseInt(String(codigo || '').replace(/\D/g, ''), 10) || 0;
export const formatoCodigo = (n) => `R-${String(n).padStart(3, '0')}`;
export const sistemaDeCodigo = (codigo) => {
  const n = numCodigo(codigo);
  return SISTEMAS.find(s => n >= s.desde && n <= s.hasta) || null;
};
export const codigoCompleto = (cfg, codigo) => `${cfg.prefijo}/${codigo}`;

export function siguienteCodigo(sistemaId, plantillas, excluirId = null) {
  const s = SISTEMAS.find(x => x.id === sistemaId) || SISTEMAS[0];
  const usados = new Set(plantillas.filter(p => p.id !== excluirId).map(p => numCodigo(p.codigo)));
  for (let n = s.desde; n <= s.hasta; n++) if (!usados.has(n)) return formatoCodigo(n);
  return null;
}

export function defVacia(nombre = '') {
  return {
    nombre,
    frecuencia: 'Por evento',
    orientacion: 'vertical',
    datosGenerales: { turno: true, hora: false },
    observaciones: true,
    secciones: [],
    firmas: [{ nombre: 'Ejecutado por', modo: 'usuario' }, { nombre: 'Verificado por', modo: 'aprobador' }]
  };
}

export function seccionNueva(tipo) {
  const base = { id: uid(), tipo, titulo: '' };
  if (tipo === 'campos') return { ...base, titulo: 'Datos', columnas: 0, campos: [] };
  if (tipo === 'tabla') return { ...base, titulo: 'Parámetros', fuente: 'equipos', filtro: { sistema: '', tipo: '', ubicacion: '' }, estadoEquipo: true, columnas: ['Equipo 1', 'Equipo 2'], filas: [] };
  if (tipo === 'checklist') return { ...base, titulo: 'Verificación', items: [] };
  if (tipo === 'lista') return { ...base, titulo: 'Detalle', columnas: [{ id: uid(), nombre: 'Descripción', tipo: 'texto' }, { id: uid(), nombre: 'Cantidad', tipo: 'numero' }], filasImpresas: 5 };
  return base;
}

export const campoNuevo = (tipo = 'texto') => ({ id: uid(), etiqueta: '', tipo, requerido: false, ancho: tipo === 'textoLargo' ? 2 : 1, unidad: '', min: '', max: '', opciones: [], ayuda: '', desde: '', hasta: '', filtro: { sistema: '', tipo: '' }, genera: '' });

// Tabla: si toma sus columnas de la base de equipos
export const tablaDeEquipos = (s) => s.tipo === 'tabla' && s.fuente === 'equipos';
// Tabla cuya ubicación se elige al llenar
export const pideUbicacion = (def) => (def.secciones || []).some(s => tablaDeEquipos(s) && s.filtro && s.filtro.ubicacion === '*');

export function filtroTxt(f, sistemas = SISTEMAS) {
  if (!f) return '';
  const p = [];
  if (f.sistema !== '' && f.sistema != null) p.push((sistemas.find(x => x.id === Number(f.sistema)) || {}).nombre || '');
  if (f.tipo) p.push(f.tipo);
  if (f.ubicacion === '*') p.push('ubicación al llenar'); else if (f.ubicacion) p.push(f.ubicacion);
  return p.filter(Boolean).join(' · ');
}
export const filaNueva = () => ({ id: uid(), etiqueta: '', tipo: 'numero', unidad: '', min: '', max: '', opciones: [], requerido: true });

export function rangoTxt(x) {
  const hayMin = x.min !== '' && x.min != null, hayMax = x.max !== '' && x.max != null;
  if (hayMin && hayMax) return `${x.min} – ${x.max}`;
  if (hayMin) return `≥ ${x.min}`;
  if (hayMax) return `≤ ${x.max}`;
  return '';
}

// Revisa la definición y devuelve la lista de observaciones que impiden emitir.
export function validarDef(def) {
  const err = [];
  if (!def.nombre || !def.nombre.trim()) err.push('El formato no tiene nombre.');
  if (!def.secciones.length) err.push('Agregue al menos una sección.');
  def.secciones.forEach((s, i) => {
    const t = s.titulo?.trim() || `Sección ${i + 1}`;
    if (!s.titulo?.trim()) err.push(`La sección ${i + 1} no tiene título.`);
    if (s.tipo === 'campos') {
      if (!s.campos.length) err.push(`"${t}" no tiene campos.`);
      s.campos.forEach((c, j) => {
        if (!c.etiqueta.trim()) err.push(`"${t}": el campo ${j + 1} no tiene nombre.`);
        if (c.tipo === 'seleccion' && !c.opciones.length) err.push(`"${t}": "${c.etiqueta || 'campo ' + (j + 1)}" no tiene opciones.`);
        if (c.tipo === 'duracion' && (!c.desde || !c.hasta)) err.push(`"${t}": "${c.etiqueta || 'campo ' + (j + 1)}" debe indicar desde y hasta qué campo se calcula.`);
        if (c.tipo === 'numero' && c.min !== '' && c.max !== '' && Number(c.min) > Number(c.max)) err.push(`"${t}": en "${c.etiqueta}" el mínimo es mayor que el máximo.`);
      });
    }
    if (s.tipo === 'tabla') {
      if (tablaDeEquipos(s)) {
        const fl = s.filtro || {};
        if ((fl.sistema === '' || fl.sistema == null) && !fl.tipo) err.push(`"${t}": indique al menos el sistema o el tipo de equipo de las columnas.`);
      } else if (!s.columnas.length) err.push(`"${t}" no tiene columnas.`);
      if (!s.filas.length) err.push(`"${t}" no tiene parámetros.`);
      s.filas.forEach((f, j) => {
        if (!f.etiqueta.trim()) err.push(`"${t}": el parámetro ${j + 1} no tiene nombre.`);
        if (f.tipo === 'seleccion' && !f.opciones.length) err.push(`"${t}": "${f.etiqueta || 'parámetro ' + (j + 1)}" no tiene opciones.`);
        if (f.tipo === 'numero' && f.min !== '' && f.max !== '' && Number(f.min) > Number(f.max)) err.push(`"${t}": en "${f.etiqueta}" el mínimo es mayor que el máximo.`);
      });
    }
    if (s.tipo === 'checklist') {
      if (!s.items.length) err.push(`"${t}" no tiene ítems.`);
      if (s.items.some(x => !x.texto.trim())) err.push(`"${t}" tiene ítems sin texto.`);
    }
    if (s.tipo === 'lista') {
      if (!s.columnas.length) err.push(`"${t}" no tiene columnas.`);
      if (s.columnas.some(x => !x.nombre.trim())) err.push(`"${t}" tiene columnas sin nombre.`);
    }
  });
  const fir = firmasDe(def);
  if (!fir.length) err.push('Agregue al menos una firma.');
  if (fir.some(f => !f.nombre.trim())) err.push('Hay firmas sin nombre.');
  if (fir.filter(f => f.modo === 'usuario').length > 1) err.push('Solo una firma puede ser la del usuario que envía.');
  if (fir.filter(f => f.modo === 'aprobador').length > 1) err.push('Solo una firma puede ser la del supervisor que aprueba.');
  return err;
}

// ---------------- formatos piloto ----------------
const c = (etiqueta, tipo, extra = {}) => ({ ...campoNuevo(tipo), etiqueta, ...extra });
const f = (etiqueta, tipo, extra = {}) => ({ ...filaNueva(), etiqueta, tipo, ...extra });
const it = (texto) => ({ id: uid(), texto });

export function pilotos() {
  const r001Falla = c('Fecha y hora de la falla', 'fechaHora', { requerido: true });
  const r001Ini = c('Inicio de la atención', 'fechaHora', { requerido: true });
  const r001Fin = c('Fin de la atención', 'fechaHora', { requerido: true });
  const FU = { nombre: 'Ejecutado por', modo: 'usuario' }, FA = { nombre: 'Verificado por', modo: 'aprobador' };

  const r001 = {
    codigo: 'R-001',
    def: {
      ...defVacia('Reporte de mantenimiento correctivo'),
      frecuencia: 'Por evento',
      datosGenerales: { turno: true, hora: false },
      secciones: [
        { id: uid(), tipo: 'campos', titulo: 'Identificación', columnas: 0, campos: [
          c('Equipo', 'equipo', { requerido: true }),
          c('Detectado por', 'texto', { requerido: true }),
          c('Descripción de la falla', 'textoLargo', { requerido: true, ancho: 2 })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Tiempos', columnas: 3, campos: [
          r001Falla, r001Ini, r001Fin,
          c('Tiempo de parada', 'duracion', { desde: r001Falla.id, hasta: r001Fin.id, ayuda: 'Desde la falla hasta el fin de la atención' }),
          c('Tiempo de reparación', 'duracion', { desde: r001Ini.id, hasta: r001Fin.id, ayuda: 'Desde el inicio hasta el fin de la atención' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Diagnóstico y trabajo realizado', columnas: 0, campos: [
          c('Causa', 'seleccion', { requerido: true, ancho: 2, opciones: ['Desgaste', 'Falta de lubricación', 'Falla eléctrica', 'Falla de operación', 'Contaminación / material extraño', 'Otra'] }),
          c('Trabajo realizado', 'textoLargo', { requerido: true, ancho: 2 })
        ] },
        { id: uid(), tipo: 'lista', titulo: 'Repuestos y materiales utilizados', filasImpresas: 4, columnas: [
          { id: uid(), nombre: 'Descripción', tipo: 'texto' },
          { id: uid(), nombre: 'Cantidad', tipo: 'numero' },
          { id: uid(), nombre: 'Unidad', tipo: 'texto' }
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Evidencias y cierre', columnas: 3, campos: [
          c('Foto antes', 'foto'),
          c('Foto después', 'foto'),
          c('¿Requiere liberación del equipo (R-002)?', 'siNo', { requerido: true, genera: 'R-002' })
        ] }
      ],
      firmas: [FU, FA]
    }
  };

  const r002 = {
    codigo: 'R-002',
    def: {
      ...defVacia('Liberación de equipo post-mantenimiento'),
      frecuencia: 'Por evento',
      datosGenerales: { turno: true, hora: false },
      secciones: [
        { id: uid(), tipo: 'campos', titulo: 'Identificación', columnas: 0, campos: [
          c('Equipo', 'equipo', { requerido: true }),
          c('Tipo de intervención', 'seleccion', { requerido: true, opciones: ['Preventivo', 'Correctivo', 'Mejora'] }),
          c('Reporte de mantenimiento relacionado', 'referencia', { ayuda: 'N° del R-001 cuando la liberación viene de un correctivo' }),
          c('Fecha y hora de liberación', 'fechaHora', { requerido: true })
        ] },
        { id: uid(), tipo: 'checklist', titulo: 'Verificación de liberación', items: [
          it('Herramientas y materiales retirados del área'),
          it('Piezas reemplazadas retiradas del área'),
          it('Sin residuos de grasa, viruta, trapos u otros materiales'),
          it('Guardas y protecciones reinstaladas'),
          it('Bloqueo y etiquetado retirados'),
          it('Lubricantes de grado alimentario donde corresponde'),
          it('Prueba de funcionamiento conforme'),
          it('Zona entregada para limpieza y desinfección')
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Evidencia', columnas: 0, campos: [
          c('Foto del equipo liberado', 'foto', { requerido: true })
        ] }
      ],
      firmas: [{ nombre: 'Entrega — Mantenimiento', modo: 'usuario' }, { nombre: 'Recibe — Área usuaria', modo: 'manuscrita' }, FA]
    }
  };

  const r101 = {
    codigo: 'R-101',
    def: {
      ...defVacia('Registro de parámetros de sala de máquinas'),
      frecuencia: 'Por turno',
      orientacion: 'horizontal',
      datosGenerales: { turno: true, hora: true },
      secciones: [
        { id: uid(), tipo: 'tabla', titulo: 'Compresores', fuente: 'equipos', filtro: { sistema: 1, tipo: 'Compresor', ubicacion: '' }, estadoEquipo: true, columnas: [], filas: [
          f('Presión de succión', 'numero', { unidad: 'psi' }),
          f('Presión de descarga', 'numero', { unidad: 'psi' }),
          f('Presión de aceite', 'numero', { unidad: 'psi' }),
          f('Temperatura de aceite', 'numero', { unidad: '°C' }),
          f('Temperatura de descarga', 'numero', { unidad: '°C' }),
          f('Corriente', 'numero', { unidad: 'A' }),
          f('Horómetro', 'numero', { unidad: 'h' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Generales de sala', columnas: 0, campos: [
          c('Nivel del recibidor de líquido', 'numero', { requerido: true, unidad: '%' }),
          c('Condensadores en servicio', 'numero', { requerido: true, unidad: 'und' })
        ] }
      ],
      firmas: [FU, FA]
    }
  };

  return [r001, r002, r101];
}
