// Lógica de llenado (sin acceso a datos): turnos, periodos, columnas de tablas, cálculos y validación de un registro.
import { turnosDe, firmasDe, tablaDeEquipos, pideUbicacion, rangoTxt, ESTADOS_COLUMNA } from './modelo.js';
import { norm } from '../../core/maestros.js';

const pad = (n) => String(n).padStart(2, '0');
export const fechaISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const horaHM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fechaHoraLocal = (d) => `${fechaISO(d)}T${horaHM(d)}`;
const aMin = (hm) => { const [h, m] = String(hm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];

export const fechaTxt = (iso) => { if (!iso) return ''; const [a, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
// Acepta 'aaaa-mm-ddThh:mm' (hora local) o una marca ISO con zona horaria (se muestra en hora local)
export const fechaHoraTxt = (v) => {
  if (!v) return '';
  const t = String(v);
  if (/[zZ]$|[+-]\d\d:\d\d$/.test(t)) { const d = new Date(t); if (!isNaN(d)) return `${fechaTxt(fechaISO(d))} ${horaHM(d)}`; }
  return `${fechaTxt(t)} ${t.slice(11, 16)}`;
};
export const fechaLarga = (iso) => { const d = new Date(iso + 'T12:00'); return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }); };

// Turno en curso y fecha operativa: antes del inicio del primer turno se cuenta como el último turno del día anterior.
export function turnoActual(cfg, ahora = new Date()) {
  const t = turnosDe(cfg);
  if (!t.length) return { turno: '', fechaOp: fechaISO(ahora) };
  const ord = [...t].sort((a, b) => aMin(a.inicio) - aMin(b.inicio));
  const m = ahora.getHours() * 60 + ahora.getMinutes();
  let actual = null;
  ord.forEach(x => { if (m >= aMin(x.inicio)) actual = x; });
  const d = new Date(ahora);
  if (!actual) { actual = ord[ord.length - 1]; d.setDate(d.getDate() - 1); }
  return { turno: actual.nombre, fechaOp: fechaISO(d) };
}

function semanaISO(iso) {
  const d = new Date(iso + 'T12:00');
  const dia = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dia + 3);
  const y = d.getFullYear();
  const p = new Date(y, 0, 4);
  return { y, w: 1 + Math.round(((d - p) / 864e5 - 3 + ((p.getDay() + 6) % 7)) / 7) };
}

export const FREC_PERIODICAS = ['Por turno', 'Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral'];

// Clave del periodo al que pertenece un registro (null = formato por evento)
export function periodoClave(frec, fechaOp, turno) {
  if (!fechaOp) return null;
  const [y, m, d] = fechaOp.split('-').map(Number);
  switch (frec) {
    case 'Por turno': return `${fechaOp}|${norm(turno)}`;
    case 'Diario': return fechaOp;
    case 'Semanal': { const s = semanaISO(fechaOp); return `${s.y}-S${pad(s.w)}`; }
    case 'Quincenal': return `${y}-${pad(m)}-Q${d <= 15 ? 1 : 2}`;
    case 'Mensual': return `${y}-${pad(m)}`;
    case 'Trimestral': return `${y}-T${Math.ceil(m / 3)}`;
    default: return null;
  }
}

export function periodoTxt(frec, fechaOp, turno) {
  const [, m, d] = fechaOp.split('-').map(Number);
  switch (frec) {
    case 'Por turno': return `Turno ${turno}`;
    case 'Diario': return 'Hoy';
    case 'Semanal': return `Semana ${semanaISO(fechaOp).w}`;
    case 'Quincenal': return `${d <= 15 ? '1.ª' : '2.ª'} quincena de ${MESES_L[m - 1]}`;
    case 'Mensual': return MESES_L[m - 1][0].toUpperCase() + MESES_L[m - 1].slice(1);
    case 'Trimestral': return `${Math.ceil(m / 3)}.º trimestre`;
    default: return '';
  }
}

// Primer día que hay que consultar para saber qué periodos ya se cubrieron
export function inicioConsulta(fechaOp) {
  const [y, m] = fechaOp.split('-').map(Number);
  const q = new Date(y, Math.floor((m - 1) / 3) * 3, 1);
  const s = new Date(fechaOp + 'T12:00'); s.setDate(s.getDate() - 7);
  return fechaISO(q < s ? q : s);
}

// ---------------- columnas de tablas ----------------
export function filtrarEquiposPor(equipos, f) {
  const tipo = norm(f.tipo), ubi = norm(f.ubicacion);
  const sis = f.sistema === '' || f.sistema == null ? null : Number(f.sistema);
  return equipos.filter(e => e.estado !== 'baja'
    && (sis === null || Number(e.sistema) === sis)
    && (!tipo || norm(e.tipo) === tipo)
    && (!ubi || norm(e.ubicacion) === ubi))
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }));
}

export function columnasTabla(sec, equipos = [], ubicacion = '') {
  if (!tablaDeEquipos(sec)) return (sec.columnas || []).map((n, i) => ({ id: 'c' + i, codigo: '', descripcion: n }));
  const f = { ...(sec.filtro || {}) };
  if (f.ubicacion === '*') f.ubicacion = ubicacion || '';
  return filtrarEquiposPor(equipos, f).map(e => ({ id: e.id, codigo: e.codigo, descripcion: e.descripcion, ...(e.estado === 'fuera' ? { fuera: true } : {}) }));
}

// Ubicaciones que tienen equipos para las tablas "ubicación al llenar"
export function ubicacionesDe(def, equipos) {
  const out = new Map();
  def.secciones.filter(s => tablaDeEquipos(s) && s.filtro?.ubicacion === '*').forEach(s => {
    filtrarEquiposPor(equipos, { ...s.filtro, ubicacion: '' }).forEach(e => { if (e.ubicacion && !out.has(norm(e.ubicacion))) out.set(norm(e.ubicacion), e.ubicacion); });
  });
  return [...out.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

export const etiquetaCol = (c) => c.codigo || c.descripcion;

// ---------------- valores ----------------
export const numero = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.').trim());
  return Number.isFinite(n) ? n : NaN;
};
export const fueraDeRango = (x, v) => {
  const n = numero(v);
  if (n === null || Number.isNaN(n)) return false;
  return (x.min !== '' && x.min != null && n < Number(x.min)) || (x.max !== '' && x.max != null && n > Number(x.max));
};

export function minutosEntre(a, b) {
  if (!a || !b) return null;
  const d = (new Date(b) - new Date(a)) / 60000;
  return Number.isFinite(d) ? Math.round(d) : null;
}
export function duracionTxt(min) {
  if (min == null || Number.isNaN(min)) return '';
  if (min < 0) return 'Fin anterior al inicio';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${pad(m)} min` : `${m} min`;
}

export const estadoColumna = (reg, sec, col) => {
  if (!sec.estadoEquipo) return 'operando';
  const t = reg.v?.[sec.id];
  return t?.est?.[col.id] || (col.fuera ? 'fuera' : 'operando');
};
export const estadoTxt = (id) => (ESTADOS_COLUMNA.find(e => e.id === id) || ESTADOS_COLUMNA[0]).label;

const vacio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

// Revisa el registro: faltantes (impiden enviar) y alertas (fuera de rango, no conformes).
// paso: 0 = datos generales, 1..n = secciones, n+1 = cierre
export function evaluar(def, reg, cfg) {
  const falt = [], alert = [];
  const F = (paso, texto, ref) => falt.push({ paso, texto, ref });
  const A = (paso, texto, ref) => alert.push({ paso, texto, ref });
  const dg = def.datosGenerales || {};
  if (!reg.fechaOp) F(0, 'Fecha', 'g-fecha');
  if (dg.turno && turnosDe(cfg).length && !reg.turno) F(0, 'Turno', 'g-turno');
  if (dg.hora && !reg.hora) F(0, 'Hora', 'g-hora');
  if (pideUbicacion(def) && !reg.ubicacion) F(0, 'Ubicación', 'g-ubi');
  const v = reg.v || {};
  def.secciones.forEach((s, i) => {
    const paso = i + 1;
    if (s.tipo === 'campos') s.campos.forEach(c => {
      const x = v[c.id];
      if (c.tipo === 'duracion') {
        const m = minutosEntre(v[c.desde], v[c.hasta]);
        if (m != null && m < 0) F(paso, `${c.etiqueta}: la fecha de fin es anterior a la de inicio`, c.id);
        return;
      }
      if (c.tipo === 'foto') { if (c.requerido && !x) F(paso, c.etiqueta, c.id); return; }
      if (c.tipo === 'equipo') { if (c.requerido && !(x && x.codigo)) F(paso, c.etiqueta, c.id); return; }
      if (c.requerido && vacio(x)) { F(paso, c.etiqueta, c.id); return; }
      if (c.tipo === 'numero' && !vacio(x)) {
        if (Number.isNaN(numero(x))) F(paso, `${c.etiqueta}: valor no válido`, c.id);
        else if (fueraDeRango(c, x)) A(paso, `${c.etiqueta}: ${x}${c.unidad ? ' ' + c.unidad : ''} (rango ${rangoTxt(c)})`, c.id);
      }
      if (c.tipo === 'conforme' && x === 'No conforme') A(paso, `${c.etiqueta}: no conforme`, c.id);
    });
    if (s.tipo === 'tabla') {
      const t = v[s.id] || {};
      const cols = t.cols || [];
      if (!cols.length) F(paso, `${s.titulo}: no hay equipos para registrar`, s.id);
      cols.forEach(col => {
        if (estadoColumna(reg, s, col) !== 'operando') return;
        s.filas.forEach(fl => {
          const x = t.c?.[fl.id]?.[col.id];
          if (fl.requerido !== false && vacio(x)) { F(paso, `${etiquetaCol(col)} · ${fl.etiqueta}`, `${s.id}:${col.id}:${fl.id}`); return; }
          if (fl.tipo === 'numero' && !vacio(x)) {
            if (Number.isNaN(numero(x))) F(paso, `${etiquetaCol(col)} · ${fl.etiqueta}: valor no válido`, `${s.id}:${col.id}:${fl.id}`);
            else if (fueraDeRango(fl, x)) A(paso, `${etiquetaCol(col)} · ${fl.etiqueta}: ${x}${fl.unidad ? ' ' + fl.unidad : ''} (rango ${rangoTxt(fl)})`, `${s.id}:${col.id}:${fl.id}`);
          }
        });
      });
    }
    if (s.tipo === 'checklist') {
      const t = v[s.id] || {};
      s.items.forEach((it, j) => {
        const r = t[it.id] || {};
        if (!r.r) F(paso, `Ítem ${j + 1}: ${it.texto}`, `${s.id}:${it.id}`);
        else if (r.r === 'NC') {
          A(paso, `No conforme: ${it.texto}`, `${s.id}:${it.id}`);
          if (!String(r.obs || '').trim()) F(paso, `Ítem ${j + 1}: describa la no conformidad`, `${s.id}:${it.id}`);
        }
      });
    }
    if (s.tipo === 'lista') {
      (v[s.id] || []).forEach((fila, j) => s.columnas.forEach(col => {
        if (col.tipo === 'numero' && !vacio(fila[col.id]) && Number.isNaN(numero(fila[col.id]))) F(paso, `${s.titulo}, fila ${j + 1}: ${col.nombre} no válido`, s.id);
      }));
    }
  });
  const cierre = def.secciones.length + 1;
  if (def.observaciones && alert.length && !String(reg.observaciones || '').trim()) F(cierre, 'Acción correctiva: obligatoria cuando hay alertas', 'obs');
  firmasDe(def).forEach((f, i) => {
    if (f.modo !== 'manuscrita') return;
    const x = (reg.firmas || [])[i] || {};
    if (!String(x.nombre || '').trim()) F(cierre, `${f.nombre}: nombre`, `firma${i}`);
    if (!x.imagen) F(cierre, `${f.nombre}: firma`, `firma${i}`);
  });
  return { faltantes: falt, alertas: alert };
}

// Duraciones calculadas (en minutos) para guardarlas en el registro
export function calcularDuraciones(def, v) {
  const out = {};
  def.secciones.forEach(s => (s.campos || []).forEach(c => {
    if (c.tipo === 'duracion') { const m = minutosEntre(v[c.desde], v[c.hasta]); if (m != null && m >= 0) out[c.id] = m; }
  }));
  return out;
}

// Códigos de equipo presentes en el registro (para buscar el historial por equipo)
export function equiposDelRegistro(def, reg) {
  const set = new Set();
  def.secciones.forEach(s => {
    (s.campos || []).forEach(c => { if (c.tipo === 'equipo' && reg.v?.[c.id]?.codigo) set.add(reg.v[c.id].codigo); });
    if (s.tipo === 'tabla') (reg.v?.[s.id]?.cols || []).forEach(col => { if (col.codigo) set.add(col.codigo); });
  });
  return [...set];
}
