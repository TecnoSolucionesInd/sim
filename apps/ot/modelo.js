// Órdenes de trabajo — catálogos y reglas (sin acceso a datos: se puede probar aparte)
//
// Especialidades: mismos nombres que el Plan preventivo (PMP) para cruzar horas sin conversiones.
export const ESPECIALIDADES = [
  { id: 'Electricista', l: 'Electricista', c: '#D69A1C' },
  { id: 'Frigorista', l: 'Mecánico frigorista', c: '#1E8FD0' },
  { id: 'Mecánico', l: 'Mecánico de mantenimiento', c: '#5564D8' },
  { id: 'Soldador', l: 'Mecánico soldador', c: '#C2410C' },
  { id: 'Op. calderos', l: 'Calderista', c: '#B4235A' },
  { id: 'Op. ósmosis', l: 'Operador de ósmosis', c: '#0B9A8B' },
  { id: 'Tercero', l: 'Tercero / proveedor', c: '#6B7A88' }
];
export const espDe = (id) => ESPECIALIDADES.find(e => e.id === id) || { id, l: id || '—', c: '#6B7A88' };

// Personal: mantenimiento (cuenta para la capacidad) u operación (0 %: apoya cuando la producción está baja o nula)
export const TIPOS_PERSONAL = [
  { id: 'mant', l: 'Mantenimiento' },
  { id: 'oper', l: 'Operación' }
];
export const GRUPOS = ['Turno 1', 'Turno 2', 'Sin rotar', 'Congelamiento', 'Calderos', 'Planta de hielo', 'Ósmosis', 'Apoyos'];

export const ORIGENES = [
  { id: 'solicitud', l: 'Solicitud de área', c: '#5564D8', tipo: 'correctivo' },
  { id: 'correctivo', l: 'Correctivo', c: '#D65050', tipo: 'correctivo' },
  { id: 'emergencia', l: 'Emergencia', c: '#B91C1C', tipo: 'emergencia' },
  { id: 'auditoria', l: 'Auditoría o inspección', c: '#B77908', tipo: 'auditoria' },
  { id: 'propia', l: 'Actividad propia', c: '#0B9A8B', tipo: 'mejora' },
  { id: 'pmp', l: 'Plan preventivo (PMP)', c: '#1B86C4', tipo: 'preventivo' }
];
export const origenDe = (id) => ORIGENES.find(o => o.id === id) || ORIGENES[1];
// En la etapa 1 las OT del PMP aún no se crean a mano (llegan desde el plan en la etapa 2)
export const ORIGENES_MANUALES = ORIGENES.filter(o => o.id !== 'pmp');

export const TIPOS_MANT = [
  { id: 'preventivo', l: 'Preventivo' },
  { id: 'correctivo', l: 'Correctivo' },
  { id: 'emergencia', l: 'Emergencia' },
  { id: 'auditoria', l: 'Auditoría / inspección' },
  { id: 'mejora', l: 'Mejora' },
  { id: 'servicio', l: 'Servicio / apoyo' }
];
export const tipoDe = (id) => TIPOS_MANT.find(t => t.id === id) || { id, l: id || '—' };

// Prioridad = qué tan pronto (fija el plazo). Criticidad = consecuencia de no hacerlo.
export const PRIORIDADES = [
  { id: 'P1', l: 'P1 · Emergencia', corto: 'P1', h: 4, c: '#B91C1C' },
  { id: 'P2', l: 'P2 · Urgente', corto: 'P2', h: 24, c: '#C2410C' },
  { id: 'P3', l: 'P3 · Normal', corto: 'P3', h: 168, c: '#1B86C4' },
  { id: 'P4', l: 'P4 · Programable', corto: 'P4', h: 720, c: '#5B6B78' }
];
export const prioDe = (id) => PRIORIDADES.find(p => p.id === id) || PRIORIDADES[2];

export const CRITICIDADES = [
  { id: 'mc', l: 'Muy crítico', c: '#B91C1C', d: 'Detiene producción o compromete inocuidad o seguridad' },
  { id: 'alto', l: 'Alto', c: '#C2410C', d: 'Equipo de criticidad A o reduce capacidad sin respaldo' },
  { id: 'medio', l: 'Medio', c: '#B77908', d: 'Equipo de criticidad B o reduce capacidad con respaldo' },
  { id: 'bajo', l: 'Bajo', c: '#5B6B78', d: 'Equipo de criticidad C o no afecta la producción' }
];
export const critDe = (id) => CRITICIDADES.find(c => c.id === id) || CRITICIDADES[2];
export const critDeEquipo = (eq) => ({ A: 'alto', B: 'medio', C: 'bajo' }[eq?.criticidad] || 'medio');
export const prioDeCrit = (crit) => ({ mc: 'P1', alto: 'P2', medio: 'P3', bajo: 'P4' }[crit] || 'P3');

export const ESTADOS = [
  { id: 'pendiente', l: 'Pendiente', c: '#5B6B78', abierta: true },
  { id: 'programada', l: 'Programada', c: '#1B86C4', abierta: true },
  { id: 'ejecucion', l: 'En ejecución', c: '#0B9A8B', abierta: true },
  { id: 'espera', l: 'En espera', c: '#B77908', abierta: true },
  { id: 'ejecutada', l: 'Por verificar', c: '#5564D8', abierta: true },
  { id: 'cerrada', l: 'Cerrada', c: '#087F74', abierta: false },
  { id: 'anulada', l: 'Anulada', c: '#8A96A2', abierta: false }
];
export const estDe = (id) => ESTADOS.find(e => e.id === id) || ESTADOS[0];
export const esAbierta = (id) => estDe(id).abierta;

export const CONDICIONES = [
  { id: 'operativo', l: 'Operativo' },
  { id: 'restriccion', l: 'Operativo con restricción' },
  { id: 'fuera', l: 'Fuera de servicio' },
  { id: 'na', l: 'No aplica (sin equipo)' }
];
export const condDe = (id) => CONDICIONES.find(c => c.id === id) || { id, l: id || '—' };

export const MOTIVOS_ESPERA = ['Repuesto o material', 'Tercero / proveedor', 'Parada de producción', 'Autorización', 'Otro'];

export const CONFIG_BASE = {
  horasTurno: 12,
  turnosSemana: 6,
  plazos: { P1: 4, P2: 24, P3: 168, P4: 720 },
  areasSolicitantes: ['Producción', 'Calidad', 'Saneamiento', 'Flota', 'SSOMA', 'Almacén', 'Administración', 'Mantenimiento', 'Otras'],
  areasExtra: [] // [{ nombre, sistema }] áreas de trabajo sin equipos en la base
};

// ---------- fechas y horas ----------
const p2 = (n) => String(n).padStart(2, '0');
export const isoLocal = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
export const ahoraLocal = () => isoLocal(new Date());
export const deLocal = (s) => s ? new Date(s.length === 10 ? s + 'T00:00' : s) : null;
export const mesDe = (s) => String(s || '').slice(0, 7);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
export function fh(s, conHora = true) {
  const d = deLocal(s); if (!d || isNaN(d)) return '—';
  return `${d.getDate()} ${MES[d.getMonth()]}` + (conHora && s.length > 10 ? ` · ${p2(d.getHours())}:${p2(d.getMinutes())}` : '');
}
export const nf = (n, dec = 1) => Number.isFinite(+n) ? (+n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: dec }) : '—';

// Horas entre dos fechas locales (null si falta alguna o el término es anterior)
export function horasEntre(a, b) {
  const x = deLocal(a), y = deLocal(b);
  if (!x || !y || isNaN(x) || isNaN(y)) return null;
  const h = (y - x) / 36e5;
  return h >= 0 ? Math.round(h * 100) / 100 : null;
}

export function plazoH(prio, cfg = CONFIG_BASE) { return (cfg.plazos || CONFIG_BASE.plazos)[prio] ?? prioDe(prio).h; }
export function fechaLimite(desde, prio, cfg) {
  const d = deLocal(desde); if (!d) return '';
  return isoLocal(new Date(d.getTime() + plazoH(prio, cfg) * 36e5));
}
// Retrasada: abierta, no está en espera ni por verificar, y pasó su fecha límite
export function retrasada(ot, ahora = new Date()) {
  if (!['pendiente', 'programada', 'ejecucion'].includes(ot.estado)) return false;
  const l = deLocal(ot.fechaLimite);
  return !!l && l < ahora;
}
// Al salir de "En espera" el plazo se corre lo que duró la espera
export function limiteTrasEspera(ot, ahora = new Date()) {
  const desde = deLocal(ot.esperaDesde), lim = deLocal(ot.fechaLimite);
  if (!desde || !lim) return ot.fechaLimite || '';
  return isoLocal(new Date(lim.getTime() + Math.max(0, ahora - desde)));
}

// ---------- ejecución: duración frente a horas hombre ----------
export function totales(ot) {
  const dur = horasEntre(ot.inicio, ot.fin);
  const hhProp = (ot.tecnicos || []).reduce((a, t) => a + (+t.hh || 0), 0);
  const hhTer = ot.tercero?.proveedor ? (+ot.tercero.hh || 0) : 0;
  return { duracionH: dur, hhPropias: Math.round(hhProp * 100) / 100, hhTercero: hhTer, hhTotal: Math.round((hhProp + hhTer) * 100) / 100 };
}

// Errores que impiden pasar a "Por verificar" (cerrar la ejecución)
export function erroresCierre(ot) {
  const e = [];
  if (!ot.inicio) e.push('Falta la hora de inicio.');
  if (!ot.fin) e.push('Falta la hora de término.');
  const dur = horasEntre(ot.inicio, ot.fin);
  if (ot.inicio && ot.fin && dur === null) e.push('La hora de término es anterior a la de inicio.');
  const tec = (ot.tecnicos || []).filter(t => +t.hh > 0);
  if (!tec.length && !(ot.tercero?.proveedor && +ot.tercero.hh > 0)) e.push('Agregue al menos un técnico o un tercero con sus horas.');
  if (dur !== null) (ot.tecnicos || []).forEach(t => { if (+t.hh > dur + 0.01) e.push(`${t.nombre}: sus horas (${nf(t.hh, 2)}) superan la duración del trabajo (${nf(dur, 2)} h).`); });
  if (!ot.condicionFinal) e.push('Indique en qué condición queda el equipo.');
  if (!ot.sinMateriales && !(ot.materiales || []).some(m => String(m.desc || '').trim())) e.push('Registre los materiales usados o marque "Sin materiales".');
  return e;
}

// Errores que impiden registrar la OT
export function erroresRegistro(ot) {
  const e = [];
  if (!ot.fecha) e.push('Falta la fecha.');
  if (!ot.origen) e.push('Falta el origen del trabajo.');
  if (!ot.zona) e.push('Falta la zona.');
  if (!ot.areaTrabajo) e.push('Falta el área de trabajo.');
  if (!ot.solicitante?.area) e.push('Falta el área solicitante.');
  if (!String(ot.descripcion || '').trim()) e.push('Falta la descripción de la actividad.');
  if (!(ot.especialidades || []).length) e.push('Indique al menos una especialidad.');
  if (!ot.prioridad) e.push('Falta la prioridad.');
  if (!ot.criticidad) e.push('Falta la criticidad.');
  return e;
}

// Campos de búsqueda para filtrar sin leer toda la colección
export function camposBusqueda(ot) {
  const ids = new Set([...(ot.asignados || []), ...(ot.tecnicos || []).map(t => t.id)].filter(Boolean));
  return { mes: mesDe(ot.fecha), anio: String(ot.fecha || '').slice(0, 4), tecnicoIds: [...ids], abierta: esAbierta(ot.estado) };
}

// Técnicos que se cruzan en horario con este trabajo (aviso, no bloquea)
export function cruces(ot, otras) {
  const a = deLocal(ot.inicio), b = deLocal(ot.fin); if (!a || !b) return [];
  const out = [];
  (ot.tecnicos || []).forEach(t => otras.forEach(o => {
    if (o.id === ot.id || o.estado === 'anulada' || !(o.tecnicos || []).some(x => x.id === t.id)) return;
    const c = deLocal(o.inicio), d = deLocal(o.fin) || new Date();
    if (c && a < d && c < b) out.push(`${t.nombre} también figura en ${o.numero || 'otra OT'} (${fh(o.inicio)}).`);
  }));
  return out;
}

// Capacidad semanal de una persona (HH)
export const hhSemana = (p, cfg = CONFIG_BASE) => p.activo === false ? 0
  : (+p.horasTurno || cfg.horasTurno) * (+p.turnosSemana || cfg.turnosSemana) * ((p.dedicacion ?? (p.tipo === 'oper' ? 0 : 100)) / 100);

// ---------- Plan preventivo (PMP) ----------
// Una ocurrencia es una semana programada (lunes ISO) de una tarea de datos/plan/pmp_tareas; si se reprogramó
// (ejec[s].a) cuenta en su semana nueva. Al cerrar su OT se marca ejec[s] = { estado:'hecho', fecha, por, obs }.
const isoD = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const lunesDe = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return isoD(x); };
export const masSemanas = (s, n) => { const d = deLocal(s); d.setDate(d.getDate() + 7 * n); return isoD(d); };
export const finSemana = (s) => { const d = deLocal(s); d.setDate(d.getDate() + 6); return `${isoD(d)}T23:59`; };
export function rangoSemana(s) {
  const a = deLocal(s), b = deLocal(s); b.setDate(b.getDate() + 6);
  return `${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MES[a.getMonth()] : ''} al ${b.getDate()} ${MES[b.getMonth()]}`;
}
export const hhTarea = (t) => Object.values(t.resp || {}).reduce((a, v) => a + (+v || 0), 0);
export const espTarea = (t) => { const k = Object.keys(t.resp || {}).filter(r => r !== 'Tercero'); return k.length ? k : ['Tercero']; };

// Ocurrencias que caen en la semana `sem` (y las atrasadas de semanas anteriores, si `conAtrasadas`)
export function ocurrenciasSemana(tareas, sem, conAtrasadas = true) {
  const out = [];
  tareas.forEach(t => (t.semanas || []).forEach(s => {
    const e = (t.ejec || {})[s] || null, ef = e?.a || s;
    const hecha = e?.estado === 'hecho', no = e?.estado === 'no';
    if (ef === sem || (conAtrasadas && ef < sem && !hecha && !no && sem === lunesDe())) out.push({ t, s, ef, e, hecha, no, atrasada: ef < sem && !hecha && !no });
  }));
  return out;
}
export const clavePMP = (tareaId, s) => `${tareaId}|${s}`;

// Borrador de OT a partir de una ocurrencia del PMP
export function otDesdePMP(o, sistemas = []) {
  const t = o.t, crit = { A: 'alto', B: 'medio', C: 'bajo' }[t.crit] || 'medio';
  const zona = sistemas.find(x => x.id === Number(t.sistema))?.nombre || '';
  return {
    fecha: ahoraLocal(), origen: 'pmp', tipo: 'preventivo', ref: `${t.rutina || ''} · semana del ${rangoSemana(o.ef)}`.trim(),
    pmp: { tareaId: t.id, semana: o.s, efectiva: o.ef }, zona, sistema: t.sistema === '' || t.sistema == null ? null : Number(t.sistema),
    areaTrabajo: t.ubicacion || '', equipoId: t.eqId || null, equipoCod: t.eq || '', equipoDesc: t.eqDesc || '',
    solicitante: { area: 'Mantenimiento', nombre: 'Plan preventivo' }, descripcion: t.tarea || '',
    especialidades: espTarea(t), hhEstimadas: hhTarea(t) || null, prioridad: 'P3', criticidad: crit,
    fechaProg: o.ef, fechaLimite: finSemana(o.ef), observaciones: t.mat ? `Materiales previstos: ${t.mat}` : ''
  };
}

// ---------- Solicitudes ----------
export const URGENCIAS = [
  { id: 'normal', l: 'Normal', prio: 'P3', c: '#1B86C4' },
  { id: 'urgente', l: 'Urgente', prio: 'P2', c: '#C2410C' },
  { id: 'emergencia', l: 'Emergencia', prio: 'P1', c: '#B91C1C' }
];
export const urgDe = (id) => URGENCIAS.find(u => u.id === id) || URGENCIAS[0];
export const EST_SOL = [
  { id: 'nueva', l: 'Por evaluar', c: '#B77908' },
  { id: 'aceptada', l: 'Aceptada', c: '#1B86C4' },
  { id: 'atendida', l: 'Atendida', c: '#087F74' },
  { id: 'rechazada', l: 'Rechazada', c: '#8A96A2' }
];
export const estSolDe = (id) => EST_SOL.find(e => e.id === id) || EST_SOL[0];
// Estado que ve el solicitante: si su OT ya se cerró, la solicitud está atendida
export const estadoSolicitud = (sol, ot) => sol.estado === 'aceptada' && ot?.estado === 'cerrada' ? 'atendida' : sol.estado;
