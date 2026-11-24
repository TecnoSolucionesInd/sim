// Órdenes de trabajo — indicadores del dashboard gerencial (cálculo puro, sin acceso a datos)
// Trabaja sobre filas compactas (modelo.compacta): n f o tp e p c es z a sa sol eq d fl i fi v hh ht pm asg t[{i n e k h}]
import * as M from './modelo.js';

export const PERIODOS = [
  { id: 'dia', l: 'Día' }, { id: 'semana', l: 'Semana' }, { id: 'mes', l: 'Mes' },
  { id: 'trimestre', l: 'Trimestre' }, { id: 'semestre', l: 'Semestre' }, { id: 'anio', l: 'Año' }
];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const p2 = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const D = (s) => M.deLocal(s);
const masDias = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };

// Periodo que contiene la fecha ref (YYYY-MM-DD): { desde, hasta (inclusive), etiqueta, cubetas:[{desde,hasta,l}] }
export function periodo(tipo, ref) {
  const d = D(ref), y = d.getFullYear(), m = d.getMonth();
  const meses = (m0, n) => Array.from({ length: n }, (_, i) => { const a = new Date(y, m0 + i, 1), b = new Date(y, m0 + i + 1, 0); return { desde: iso(a), hasta: iso(b), l: MES[a.getMonth()] }; });
  if (tipo === 'dia') return { desde: ref, hasta: ref, etiqueta: `${DIAS[d.getDay()]} ${d.getDate()} ${MES[m]} ${y}`, cubetas: [] };
  if (tipo === 'semana') {
    const a = M.lunesDe(d);
    return { desde: a, hasta: masDias(a, 6), etiqueta: `Semana del ${M.rangoSemana(a)} ${D(masDias(a, 6)).getFullYear()}`,
      cubetas: Array.from({ length: 7 }, (_, i) => { const x = masDias(a, i); return { desde: x, hasta: x, l: `${DIAS[D(x).getDay()]} ${D(x).getDate()}` }; }) };
  }
  if (tipo === 'mes') {
    const a = iso(new Date(y, m, 1)), b = iso(new Date(y, m + 1, 0)), c = [];
    for (let s = M.lunesDe(D(a)); s <= b; s = M.masSemanas(s, 1)) c.push({ desde: s < a ? a : s, hasta: masDias(s, 6) > b ? b : masDias(s, 6), l: `${D(s < a ? a : s).getDate()} ${MES[m]}` });
    return { desde: a, hasta: b, etiqueta: `${MESL[m]} ${y}`, cubetas: c };
  }
  if (tipo === 'trimestre') { const q = Math.floor(m / 3), c = meses(q * 3, 3); return { desde: c[0].desde, hasta: c[2].hasta, etiqueta: `${['1.er', '2.do', '3.er', '4.to'][q]} trimestre ${y}`, cubetas: c }; }
  if (tipo === 'semestre') { const h = m < 6 ? 0 : 1, c = meses(h * 6, 6); return { desde: c[0].desde, hasta: c[5].hasta, etiqueta: `${h ? '2.do' : '1.er'} semestre ${y}`, cubetas: c }; }
  const c = meses(0, 12);
  return { desde: c[0].desde, hasta: c[11].hasta, etiqueta: `Año ${y}`, cubetas: c };
}
// Referencia del periodo anterior o siguiente
export function desplazar(tipo, ref, n) {
  const d = D(ref);
  if (tipo === 'dia') d.setDate(d.getDate() + n);
  else if (tipo === 'semana') d.setDate(d.getDate() + 7 * n);
  else if (tipo === 'mes') d.setMonth(d.getMonth() + n, 1);
  else if (tipo === 'trimestre') d.setMonth(d.getMonth() + 3 * n, 1);
  else if (tipo === 'semestre') d.setMonth(d.getMonth() + 6 * n, 1);
  else d.setFullYear(d.getFullYear() + n, 0, 1);
  return iso(d);
}
export function mesesEntre(desde, hasta) {
  const out = []; const d = new Date(D(desde).getFullYear(), D(desde).getMonth(), 1), fin = D(hasta);
  while (d <= fin) { out.push(`${d.getFullYear()}-${p2(d.getMonth() + 1)}`); d.setMonth(d.getMonth() + 1); }
  return out;
}

const en = (s, a, b) => !!s && s.slice(0, 10) >= a && s.slice(0, 10) <= b;
const suma = (l, f) => l.reduce((x, y) => x + (+f(y) || 0), 0);
const ratio = (a, b) => b > 0 ? a / b : null;

// Filtros (sobre filas compactas)
export function filtrar(filas, F) {
  return filas.filter(r => r.e !== 'anulada'
    && (!F.esp || (r.es || []).includes(F.esp) || (r.t || []).some(t => t.e === F.esp))
    && (!F.tec || (r.asg || []).includes(F.tec) || (r.t || []).some(t => t.i === F.tec))
    && (!F.sa || r.sa === F.sa) && (!F.z || r.z === F.z) && (!F.o || r.o === F.o) && (!F.c || r.c === F.c));
}
// HH de una fila que cuentan según el filtro de especialidad o técnico
const hhFila = (r, F, soloMant = true) => suma((r.t || []).filter(t => (!soloMant || t.k !== 'oper') && (!F.esp || t.e === F.esp) && (!F.tec || t.i === F.tec)), t => t.h);

// HH disponibles de una persona entre dos fechas (inclusive), día a día: con rol de guardia, sus días de turno;
// sin rol, el promedio diario de su capacidad semanal. Las ausencias registradas descuentan en ambos casos.
export function hhDispRango(p, desde, hasta, cfg, rol) {
  if (hasta < desde) return 0;
  let n = 0;
  for (let s = desde; s <= hasta; s = masDias(s, 1)) n += M.hhDia(p, s, cfg, rol);
  return n;
}

// Cumplimiento del PMP: ocurrencias cuya semana (efectiva) cae en el periodo y ya terminó
export function cumplimientoPMP(tareas, desde, hasta, hoy, F = {}, sistemas = []) {
  let prog = 0, hechas = 0, aTiempo = 0, pendientes = 0;
  tareas.forEach(t => {
    if (F.esp && !M.espTarea(t).includes(F.esp)) return;
    if (F.z && (sistemas.find(x => x.id === Number(t.sistema))?.nombre || '') !== F.z) return;
    (t.semanas || []).forEach(s => {
      const e = (t.ejec || {})[s] || null, ef = e?.a || s, fin = masDias(ef, 6);
      if (ef < M.lunesDe(D(desde)) || ef > hasta) return;
      if (fin >= hoy && e?.estado !== 'hecho') { pendientes++; return; } // la semana aún no termina
      prog++;
      if (e?.estado === 'hecho') { hechas++; if (!e.fecha || e.fecha <= fin) aTiempo++; }
    });
  });
  return { prog, hechas, aTiempo, pendientes, pct: ratio(hechas, prog), pctTiempo: ratio(aTiempo, prog) };
}

// Cumplimiento de solicitudes: atendidas dentro del plazo de su OT sobre las que ya vencieron o se atendieron
export function cumplimientoSolicitudes(sols, filasPorId, desde, hasta, ahora, cfg) {
  const lst = sols.filter(s => en(s.fecha, desde, hasta) && s.estado !== 'rechazada');
  let den = 0, num = 0; const horas = [];
  lst.forEach(s => {
    const r = s.otId ? filasPorId.get(s.otId) : null;
    const limite = r?.fl || M.fechaLimite(s.fecha, M.urgDe(s.urgencia).prio, cfg);
    const atendida = r && ['ejecutada', 'cerrada'].includes(r.e) && r.fi;
    if (atendida || limite < ahora) {
      den++;
      if (atendida && r.fi <= limite) num++;
      if (atendida) horas.push(M.horasEntre(s.fecha, r.fi));
    }
  });
  const h = horas.filter(x => x != null);
  return { total: lst.length, den, num, pct: ratio(num, den), horasProm: h.length ? suma(h, x => x) / h.length : null,
    rechazadas: sols.filter(s => en(s.fecha, desde, hasta) && s.estado === 'rechazada').length };
}

// Todos los indicadores de un periodo
export function calcular({ filas, sols, tareas, personas, cfg, rol, P, F, hoy, ahora, sistemas }) {
  const { desde, hasta } = P;
  const fs = filtrar(filas, F), porId = new Map(filas.map(r => [r.id, r]));
  const reg = fs.filter(r => en(r.f, desde, hasta));
  const ejec = fs.filter(r => ['ejecutada', 'cerrada'].includes(r.e) && en(r.fi, desde, hasta));
  const aTiempo = ejec.filter(r => !r.fl || r.fi <= r.fl).length;
  const iniciadas = fs.filter(r => en(r.i, desde, hasta));
  const hhUtil = suma(iniciadas, r => hhFila(r, F)), hhApoyo = F.esp || F.tec ? 0 : suma(iniciadas, r => suma((r.t || []).filter(t => t.k === 'oper'), t => t.h));
  const hhTer = suma(ejec, r => r.ht);
  const hastaDisp = hasta < hoy ? hasta : hoy;
  // las horas disponibles se cuentan desde que existe el registro (primera OT), no desde antes
  const inicioReg = filas.reduce((m, r) => r.f && r.f.slice(0, 10) < m ? r.f.slice(0, 10) : m, hoy);
  const desdeDisp = desde > inicioReg ? desde : inicioReg;
  const pers = personas.filter(p => p.activo !== false && p.tipo !== 'oper' && (!F.esp || p.especialidad === F.esp) && (!F.tec || p.id === F.tec));
  const hhDisp = suma(pers, p => hhDispRango(p, desdeDisp, hastaDisp, cfg, rol));
  // backlog al cierre del periodo (o a hoy si el periodo sigue en curso)
  const corte = hasta < hoy ? hasta : hoy;
  const backlog = fs.filter(r => r.f && r.f.slice(0, 10) <= corte && !(r.fi && r.fi.slice(0, 10) <= corte));
  const edad = (r) => (D(corte) - D(r.f.slice(0, 10))) / 864e5;
  const antig = [
    { l: '0 a 7 días', n: backlog.filter(r => edad(r) <= 7).length },
    { l: '8 a 30 días', n: backlog.filter(r => edad(r) > 7 && edad(r) <= 30).length },
    { l: 'Más de 30 días', n: backlog.filter(r => edad(r) > 30).length }
  ];
  const vencidas = backlog.filter(r => r.fl && r.fl.slice(0, 10) < corte).length;
  const est = M.estimador(fs.filter(r => r.e === 'cerrada').map(r => ({ especialidades: r.es, tipo: r.tp, hhTotal: r.hh })));
  const hhBacklog = suma(backlog, r => Math.max(0, est({ especialidades: r.es, tipo: r.tp, hhEstimadas: r.he }).hh - hhFila(r, F)));
  const dispSemana = suma(pers, p => M.hhSemana(p, cfg));

  // distribuciones (OT ejecutadas en el periodo: cantidad y HH)
  const grupo = (lista, clave, val = () => 1) => { const m = new Map(); lista.forEach(r => [].concat(clave(r) || []).forEach(k => { if (k == null || k === '') return; m.set(k, (m.get(k) || 0) + val(r, k)); })); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const porTipo = M.TIPOS_MANT.map(t => ({ id: t.id, l: t.l, n: ejec.filter(r => r.tp === t.id).length, hh: suma(ejec.filter(r => r.tp === t.id), r => r.hh) }));
  const porEsp = M.ESPECIALIDADES.map(e => ({ id: e.id, l: e.l, c: e.c,
    hh: suma(iniciadas, r => suma((r.t || []).filter(t => t.e === e.id && t.k !== 'oper' && (!F.tec || t.i === F.tec)), t => t.h)) + (e.id === 'Tercero' ? hhTer : 0),
    n: ejec.filter(r => (r.es || []).includes(e.id)).length })).filter(x => x.hh || x.n);
  const porArea = grupo(ejec, r => r.a).slice(0, 8);
  const porSol = grupo(reg, r => r.sa);
  const porCrit = M.CRITICIDADES.map(c => ({ id: c.id, l: c.l, c: c.c, reg: reg.filter(r => r.c === c.id).length, ejec: ejec.filter(r => r.c === c.id).length, abiertas: backlog.filter(r => r.c === c.id).length }));

  // productividad por técnico y especialidad
  const tecnicos = personas.filter(p => p.activo !== false && (!F.esp || p.especialidad === F.esp) && (!F.tec || p.id === F.tec)).map(p => {
    const hh = suma(iniciadas, r => suma((r.t || []).filter(t => t.i === p.id), t => t.h));
    const suyas = ejec.filter(r => (r.t || []).some(t => t.i === p.id));
    const disp = p.tipo === 'oper' ? 0 : hhDispRango(p, desdeDisp, hastaDisp, cfg, rol);
    return { p, hh, disp, pct: ratio(hh, disp), ot: suyas.length, aTiempo: ratio(suyas.filter(r => !r.fl || r.fi <= r.fl).length, suyas.length) };
  }).filter(x => x.hh || x.disp).sort((a, b) => b.hh - a.hh);
  const prodEsp = M.ESPECIALIDADES.filter(e => e.id !== 'Tercero').map(e => {
    const ps = tecnicos.filter(x => x.p.especialidad === e.id && x.p.tipo !== 'oper');
    const hh = suma(ps, x => x.hh), disp = suma(ps, x => x.disp);
    return { id: e.id, l: e.l, c: e.c, hh, disp, pct: ratio(hh, disp), ot: ejec.filter(r => (r.es || []).includes(e.id)).length };
  }).filter(x => x.hh || x.disp);

  // tendencias por cubeta
  const tend = P.cubetas.map(b => {
    const rg = fs.filter(r => en(r.f, b.desde, b.hasta)), ej = fs.filter(r => ['ejecutada', 'cerrada'].includes(r.e) && en(r.fi, b.desde, b.hasta));
    const pmp = cumplimientoPMP(tareas, b.desde, b.hasta, hoy, F, sistemas);
    const ini = fs.filter(r => en(r.i, b.desde, b.hasta));
    return { l: b.l, reg: rg.length, ejec: ej.length, pmp: pmp.pct, hh: suma(ini, r => hhFila(r, F)),
      disp: b.desde > hoy || b.hasta < inicioReg ? null : suma(pers, p => hhDispRango(p, b.desde > inicioReg ? b.desde : inicioReg, b.hasta < hoy ? b.hasta : hoy, cfg, rol)),
      correctivo: ratio(ej.filter(r => ['correctivo', 'emergencia'].includes(r.tp)).length, ej.length),
      tipos: Object.fromEntries(M.TIPOS_MANT.map(t => [t.id, ej.filter(r => r.tp === t.id).length])) };
  });

  const pmp = cumplimientoPMP(tareas, desde, hasta, hoy, F, sistemas);
  const sol = cumplimientoSolicitudes(F.esp || F.tec || F.z || F.o || F.c ? sols.filter(s => !F.sa || s.areaSolicitante === F.sa).filter(s => s.otId && fs.some(r => r.id === s.otId)) : sols.filter(s => !F.sa || s.areaSolicitante === F.sa), porId, desde, hasta, ahora, cfg);
  return {
    inicioReg, conDatos: reg.length + ejec.length + backlog.length > 0,
    reg: reg.length, ejec: ejec.length, aTiempo, pctTiempo: ratio(aTiempo, ejec.length),
    emergencias: reg.filter(r => r.tp === 'emergencia').length,
    pctPrev: ratio(ejec.filter(r => r.tp === 'preventivo').length, ejec.length),
    hhUtil, hhApoyo, hhTer, hhDisp, uso: ratio(hhUtil, hhDisp), holgura: hhDisp - hhUtil,
    backlog: backlog.length, vencidas, hhBacklog, semanasBacklog: ratio(hhBacklog, dispSemana), antig,
    porTipo, porEsp, porArea, porSol, porCrit, tecnicos, prodEsp, tend, pmp, sol, filasPeriodo: [...new Map([...reg, ...ejec].map(r => [r.id, r])).values()]
  };
}
