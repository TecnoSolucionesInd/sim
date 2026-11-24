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
// Mismas causas que el formato R-001 (Reporte de mantenimiento correctivo) para prellenarlo sin conversiones
export const CAUSAS = ['Desgaste', 'Falta de lubricación', 'Falla eléctrica', 'Falla de operación', 'Contaminación / material extraño', 'Otra'];
export const esCorrectivo = (o) => ['correctivo', 'emergencia'].includes(o?.tipo);

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

// ---------- Rol de guardia ----------
// datos/ot/rol/{lunes} = { semana, filas: { <idPersona>: [7 códigos, lunes a domingo] } }
export const COD_ROL = [
  { id: 'D', l: 'Día', c: '#8A5A00', bg: '#FFEBC2' },
  { id: 'N', l: 'Noche', c: '#2F3C9E', bg: '#DDE2FF' },
  { id: 'DSO', l: 'Descanso', c: '#4E5D6A', bg: '#E8EDF1' },
  { id: 'V', l: 'Vacaciones', c: '#06695F', bg: '#D3F1EB' },
  { id: 'DM', l: 'Descanso médico', c: '#A11D4E', bg: '#FADDE8' },
  { id: 'F', l: 'Falta', c: '#A51818', bg: '#FDDCDC' },
  { id: 'P', l: 'Permiso', c: '#8F5E00', bg: '#FCE9C4' },
  { id: 'C', l: 'Compensatorio', c: '#4350C2', bg: '#E3E6FB' }
];
export const codRol = (id) => COD_ROL.find(c => c.id === id) || null;
export const trabajaRol = (c) => c === 'D' || c === 'N';
export const AUSENCIA_ROL = ['V', 'DM', 'F', 'P', 'C'];
export const GRUPOS_ROTAN = ['Turno 1', 'Turno 2'];
export const DIAS_SEM = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export function filaRol(rol, pid, sem) {
  const f = rol?.get?.(sem)?.filas?.[pid];
  return Array.isArray(f) && f.length === 7 ? f : null;
}
const COD_MOTIVO = { 'Vacaciones': 'V', 'Descanso médico': 'DM', 'Permiso': 'P', 'Capacitación': 'P', 'Otro': 'P' };
// Fila propuesta para una persona: rota la semana anterior (Turno 1 y 2 cambian día ↔ noche), conserva los descansos
// y marca las ausencias registradas en su ficha. Sin semana anterior: turno de su grupo y descanso el domingo.
export function filaPropuesta(p, sem, previa, cfg = CONFIG_BASE) {
  const rota = GRUPOS_ROTAN.includes(p.grupo);
  const swap = (c) => rota ? (c === 'D' ? 'N' : c === 'N' ? 'D' : c) : c;
  let base;
  if (previa) {
    const nD = previa.filter(c => c === 'D').length, nN = previa.filter(c => c === 'N').length;
    const turno = swap(nN > nD ? 'N' : 'D');
    base = previa.map(c => c === 'DSO' ? 'DSO' : trabajaRol(c) ? swap(c) : turno);
  } else {
    const turno = p.grupo === 'Turno 2' ? 'N' : 'D';
    const dias = Math.max(0, Math.min(7, +p.turnosSemana || cfg.turnosSemana || 6));
    base = Array.from({ length: 7 }, (_, i) => i < dias ? turno : 'DSO');
  }
  return base.map((c, i) => {
    const dia = masDias(sem, i), a = (p.ausencias || []).find(x => x.desde && dia >= x.desde && dia <= (x.hasta || x.desde));
    return a && c !== 'DSO' ? (COD_MOTIVO[a.motivo] || 'P') : c;
  });
}

// Capacidad semanal de una persona (HH)
export const hhTurno = (p, cfg = CONFIG_BASE) => (+p.horasTurno || cfg.horasTurno) * ((p.dedicacion ?? (p.tipo === 'oper' ? 0 : 100)) / 100);
export const hhSemana = (p, cfg = CONFIG_BASE) => p.activo === false ? 0
  : (+p.horasTurno || cfg.horasTurno) * (+p.turnosSemana || cfg.turnosSemana) * ((p.dedicacion ?? (p.tipo === 'oper' ? 0 : 100)) / 100);

// ---------- Plan preventivo (PMP) ----------
// Una ocurrencia es una semana programada (lunes ISO) de una tarea de datos/plan/pmp_tareas; si se reprogramó
// (ejec[s].a) cuenta en su semana nueva. Al cerrar su OT se marca ejec[s] = { estado:'hecho', fecha, por, obs }.
const isoD = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const lunesDe = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return isoD(x); };
export const masDias = (s, n) => { const d = deLocal(s); d.setDate(d.getDate() + n); return isoD(d); };
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

// ---------- Capacidad ----------
// Disponibles: por persona, horas de turno × turnos por semana × dedicación, menos los días de ausencia de esa semana.
// Requeridas: HH de OT abiertas (lo estimado menos lo ya registrado) + tareas del PMP sin OT; lo vencido se carga a la
// semana actual (backlog). Utilizadas: HH registradas por técnico en trabajos iniciados en la semana.
export const MOTIVOS_AUSENCIA = ['Vacaciones', 'Descanso médico', 'Permiso', 'Capacitación', 'Otro'];
export const HH_DEFECTO = 2; // por especialidad, cuando una OT no tiene estimación ni hay historial parecido
export const HORIZONTE = 4;  // semanas que mira la planificación

const enAusencia = (p, fecha) => (p.ausencias || []).some(a => a.desde && fecha >= a.desde && fecha <= (a.hasta || a.desde));
export function diasAusente(p, sem, rol) {
  const f = filaRol(rol, p.id, sem);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const dia = masDias(sem, i);
    if (f ? AUSENCIA_ROL.includes(f[i]) || (trabajaRol(f[i]) && enAusencia(p, dia)) : enAusencia(p, dia)) n++;
  }
  return n;
}
// Con rol de guardia de esa semana: horas de turno × días con turno (D o N) que no caen en una ausencia registrada.
// Sin rol: horas de turno × turnos por semana × dedicación, menos los días de ausencia.
export function hhDispSemana(p, sem, cfg, rol) {
  if (p.activo === false) return 0;
  const f = filaRol(rol, p.id, sem);
  if (!f) return hhSemana(p, cfg) * (7 - diasAusente(p, sem)) / 7;
  let n = 0;
  for (let i = 0; i < 7; i++) if (trabajaRol(f[i]) && !enAusencia(p, masDias(sem, i))) n++;
  return hhTurno(p, cfg) * n;
}
// HH de una persona en un día (para el dashboard)
export function hhDia(p, fecha, cfg, rol) {
  if (p.activo === false) return 0;
  const sem = lunesDe(deLocal(fecha)), f = filaRol(rol, p.id, sem);
  if (enAusencia(p, fecha)) return 0;
  if (!f) return hhSemana(p, cfg) / 7;
  return trabajaRol(f[(deLocal(fecha).getDay() + 6) % 7]) ? hhTurno(p, cfg) : 0;
}
export const semanasDesde = (s, n) => Array.from({ length: n }, (_, i) => masSemanas(s, i));

// Estimación de HH de una OT: la del formulario; si no hay, el promedio real de OT cerradas con la misma especialidad
// principal y tipo (mínimo 2); si tampoco, 2 HH por especialidad.
export function estimador(cerradas) {
  const acc = {};
  cerradas.forEach(o => { if (+o.hhTotal > 0) (acc[`${(o.especialidades || [])[0]}|${o.tipo}`] ||= []).push(+o.hhTotal); });
  const prom = {};
  Object.entries(acc).forEach(([k, v]) => { if (v.length >= 2) prom[k] = v.reduce((a, b) => a + b, 0) / v.length; });
  return (o) => {
    if (+o.hhEstimadas > 0) return { hh: +o.hhEstimadas, fuente: 'estimada' };
    const p = prom[`${(o.especialidades || [])[0]}|${o.tipo}`];
    if (p) return { hh: Math.round(p * 10) / 10, fuente: 'promedio' };
    return { hh: HH_DEFECTO * Math.max(1, (o.especialidades || []).length), fuente: 'defecto' };
  };
}

// Carga pendiente: un elemento por OT abierta y por ocurrencia del PMP sin OT, con sus HH por especialidad
export function cargaPendiente({ ords, tareas, semActual, est }) {
  const items = [], conOT = new Set(), tmap = new Map(tareas.map(t => [t.id, t]));
  ords.forEach(o => { if (o.pmp && o.estado !== 'anulada') conOT.add(clavePMP(o.pmp.tareaId, o.pmp.semana)); });
  ords.filter(o => ['pendiente', 'programada', 'ejecucion', 'espera'].includes(o.estado)).forEach(o => {
    const t = o.pmp ? tmap.get(o.pmp.tareaId) : null;
    let rep, fuente;
    if (t && hhTarea(t)) { rep = { ...t.resp }; fuente = 'pmp'; }
    else {
      const e = est(o), esps = (o.especialidades || []).length ? o.especialidades : ['Tercero'];
      fuente = e.fuente; rep = Object.fromEntries(esps.map(x => [x, e.hh / esps.length]));
    }
    const hecho = {};
    (o.tecnicos || []).forEach(tc => { hecho[tc.especialidad] = (hecho[tc.especialidad] || 0) + (+tc.hh || 0); });
    Object.keys(rep).forEach(k => { rep[k] = Math.max(0, (+rep[k] || 0) - (hecho[k] || 0)); });
    const obj = lunesDe(deLocal(o.fechaProg || o.fechaLimite || o.fecha));
    items.push({ tipo: 'ot', id: o.id, numero: o.numero, desc: o.descripcion, equipo: o.equipoCod || o.areaTrabajo, rep, fuente,
      prioridad: o.prioridad, criticidad: o.criticidad, fechaLimite: o.fechaLimite, semana: obj < semActual ? semActual : obj,
      atrasada: obj < semActual || retrasada(o), asignados: o.asignados || [], estado: o.estado });
  });
  tareas.forEach(t => (t.semanas || []).forEach(s => {
    const e = (t.ejec || {})[s], ef = e?.a || s;
    if (e?.estado === 'hecho' || e?.estado === 'no' || conOT.has(clavePMP(t.id, s))) return;
    items.push({ tipo: 'pmp', id: clavePMP(t.id, s), numero: t.rutina || 'PMP', desc: t.tarea, equipo: t.eq, rep: { ...(t.resp || {}) }, fuente: 'pmp',
      prioridad: 'P3', criticidad: { A: 'alto', B: 'medio', C: 'bajo' }[t.crit] || 'medio', fechaLimite: finSemana(ef),
      semana: ef < semActual ? semActual : ef, atrasada: ef < semActual, asignados: [] });
  }));
  return items;
}

// Asignación semana a semana: por especialidad, en orden de semana, prioridad, criticidad y fecha límite, cada trabajo toma
// horas libres desde su semana objetivo; lo que no entra en el horizonte queda "sin capacidad". Tercero no consume capacidad.
const ORD_P = { P1: 0, P2: 1, P3: 2, P4: 3 }, ORD_C = { mc: 0, alto: 1, medio: 2, bajo: 3 };
export function planificar(items, semanas, dispEsp) {
  const libre = {}, k = (e, s) => { const x = `${e}|${s}`; if (!(x in libre)) libre[x] = dispEsp(e, s); return x; };
  const fin = semanas.at(-1);
  const orden = items.filter(i => i.semana <= fin).sort((a, b) => a.semana.localeCompare(b.semana) || ORD_P[a.prioridad] - ORD_P[b.prioridad]
    || ORD_C[a.criticidad] - ORD_C[b.criticidad] || String(a.fechaLimite).localeCompare(String(b.fechaLimite)));
  orden.forEach(it => {
    it.asignacion = {}; it.sinCapacidad = {};
    Object.entries(it.rep).forEach(([e, hh]) => {
      if (!(hh > 0)) return;
      if (e === 'Tercero') { it.asignacion[e] = it.semana; return; }
      let resto = hh;
      for (const s of semanas) {
        if (s < it.semana) continue;
        const x = k(e, s), u = Math.min(resto, libre[x]);
        if (u > 1e-9) { libre[x] -= u; resto -= u; it.asignacion[e] = s; }
        if (resto <= 1e-9) break;
      }
      if (resto > 1e-6) it.sinCapacidad[e] = resto;
    });
    const ult = Object.values(it.asignacion).sort().at(-1) || null;
    it.semanaFin = ult;
    it.sinCap = Object.values(it.sinCapacidad).reduce((a, b) => a + b, 0);
    it.seAtrasa = it.sinCap > 0 || (!!ult && !!it.fechaLimite && ult > lunesDe(deLocal(it.fechaLimite)));
  });
  return { items: orden, libre };
}

// ---------- R-001 (Reporte de mantenimiento correctivo) prellenado desde la OT ----------
// Los campos se identifican por su nombre en la plantilla del R-001; Registro de formatos los coloca al abrir el pendiente.
export function prellenadoR001(o, eq) {
  const num = (n) => n == null || n === '' ? '' : String(n).replace('.', ',');
  const detectado = [o.solicitante?.nombre, o.solicitante?.area && o.solicitante.area !== 'Mantenimiento' ? o.solicitante.area : ''].filter(Boolean).join(' · ');
  const trabajo = [o.trabajoRealizado, o.trabajoRealizado ? '' : o.observaciones].filter(Boolean).join('\n');
  return {
    equipo: eq || (o.equipoCod ? { id: o.equipoId || null, codigo: o.equipoCod, descripcion: o.equipoDesc || '' } : null),
    prellenado: {
      campos: [
        { n: 'Detectado por', v: detectado || o.solicitante?.area || '' },
        { n: 'Descripción de la falla', v: o.descripcion || '' },
        { n: 'Fecha y hora de la falla', v: o.fechaFalla || o.fecha || '' },
        { n: 'Inicio de la atención', v: o.inicio || '' },
        { n: 'Fin de la atención', v: o.fin || '' },
        { n: 'Causa', v: o.causa || '' },
        { n: 'Trabajo realizado', v: trabajo }
      ].filter(x => x.v),
      listas: (o.materiales || []).length ? [{ t: 'Repuestos y materiales utilizados', filas: o.materiales.map(m => ({ 'Descripción': [m.cod, m.desc].filter(Boolean).join(' · '), 'Cantidad': num(m.cant), 'Unidad': m.und || '' })) }] : []
    },
    otEstado: o.estado || ''
  };
}

// ---------- Catálogo de materiales ----------
// datos/ot/config/materiales = { items: [{ c: código, d: descripción, u: unidad }] }. Se carga pegando columnas desde Excel.
export function leerCatalogo(texto) {
  const filas = String(texto || '').split(/\r?\n/).map(l => l.split(l.includes('\t') ? '\t' : /;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(x => x.replace(/^"|"$/g, '').trim()));
  const out = [], vistos = new Set();
  filas.forEach(f => {
    if (f.length < 2 || !f[1]) return;
    const [c, d, u = ''] = f;
    if (/^c(o|ó)digo$/i.test(c) || /^descripci(o|ó)n$/i.test(d)) return; // encabezado
    const k = (c || d).toUpperCase();
    if (vistos.has(k)) return;
    vistos.add(k); out.push({ c: c || '', d: d.replace(/\s+/g, ' '), u: u || 'und' });
  });
  return out;
}
export const etiquetaMat = (x) => x.c ? `${x.c} · ${x.d}` : x.d;

// ---------- Resumen mensual (para el dashboard) ----------
// Copia compacta de cada OT en datos/ot/resumen/{AAAA-MM} (mes de registro), campo filas.<id>.
// Un mes se lee con un solo documento, en lugar de cientos de OT.
export function compacta(o) {
  return {
    n: o.numero || '', f: o.fecha || '', o: o.origen || '', tp: o.tipo || '', e: o.estado || '', p: o.prioridad || '', c: o.criticidad || '',
    es: o.especialidades || [], z: o.zona || '', a: o.areaTrabajo || '', sa: o.solicitante?.area || '', sol: o.solicitudId || null,
    eq: o.equipoCod || '', d: String(o.descripcion || '').slice(0, 90), fl: o.fechaLimite || '', i: o.inicio || '', fi: o.fin || '',
    v: o.verificado || null, he: +o.hhEstimadas || null, hh: +o.hhTotal || 0, ht: +o.hhTercero || 0, pm: o.pmp ? 1 : 0, asg: o.asignados || [],
    t: (o.tecnicos || []).map(x => ({ i: x.id, n: x.nombre, e: x.especialidad, k: x.tipo || 'mant', h: +x.hh || 0 }))
  };
}
