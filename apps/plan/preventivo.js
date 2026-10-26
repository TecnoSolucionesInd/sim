// Plan de mantenimiento — módulo Plan preventivo (PMP)
// Datos:
//   datos/plan/pmp/config            { inicio, capacidad, biblioteca, eventos, supuestos, cargado:{fecha, por} }
//   datos/plan/pmp_tareas/{id}       tarea por equipo y rutina (copia de la rutina) con semanas programadas (lunes ISO) y
//                                    ejec: { '<semana>': { estado: hecho|no|reprog, a?: semana nueva, fecha, por, obs } }
// Una ocurrencia es una semana programada de una tarea; si se reprograma, cuenta en su semana nueva.
import { db, toast } from '../../core/core.js';
import { listarEquipos, colEquipos } from '../../core/equipos.js';
import { SISTEMAS } from '../../core/maestros.js';
import { vResumen } from './resumen.js';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const I = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const IC = {
  ok: I('M20 6L9 17l-5-5'), rep: I('M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'), no: I('M18 6L6 18M6 6l12 12'), izq: I('M15 18l-6-6 6-6'), der: I('M9 18l6-6-6-6'),
  edit: I('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'), mas: I('M12 5v14M5 12h14'),
  print: I('M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z'), up: I('M12 16V4M6 10l6-6 6 6M4 20h16'), undo: I('M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8')
};
const FREC = {
  U: { l: 'Única vez', c: '1', hex: '#c9a7ff' }, D: { l: 'Diario', c: 'D', hex: '#8b9bb0' }, S: { l: 'Semanal', c: 'S', hex: '#7cc8f8' }, M: { l: 'Mensual', c: 'M', hex: '#4aa3ff' },
  TRI: { l: 'Trimestral', c: 'T', hex: '#f5b54a' }, SEM: { l: 'Semestral', c: 'SE', hex: '#ff9f5a' }, A: { l: 'Anual', c: 'A', hex: '#ff6b8a' }
};
const ORD_F = ['S', 'M', 'TRI', 'SEM', 'A', 'U'];
const MESES_F = { M: 1, TRI: 3, SEM: 6, A: 12 };
const CONDS = ['Operando', 'Parada corta', 'Parado', 'Energizado', 'Desenergizado', 'Lado agua aislado'];
const ROLES = ['Frigorista', 'Mecánico', 'Electricista', 'Soldador', 'Op. calderos', 'Op. ósmosis', 'Tercero'];
const EST = {
  hecho: { l: 'Ejecutado', hex: '#2ec4a6' }, no: { l: 'No ejecutado', hex: '#8b9bb0' },
  atrasada: { l: 'Atrasada', hex: '#ff6b6b' }, pendiente: { l: 'Programada', hex: '#f5b54a' }
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const DIA = 864e5;

const refCfg = () => doc(db, 'datos', 'plan', 'pmp', 'config');
const colTar = () => collection(db, 'datos', 'plan', 'pmp_tareas');

// ---------- fechas ----------
const isoD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const lunes = (d) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return isoD(x); };
const masSem = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + 7 * n); return isoD(d); };
const numSem = (s) => { const d = deIso(s); d.setDate(d.getDate() + 3); const a = new Date(d.getFullYear(), 0, 4); return 1 + Math.round(((d - a) / DIA - 3 + ((a.getDay() + 6) % 7)) / 7); };
const corto = (s) => { const d = deIso(s); return `${String(d.getDate()).padStart(2, '0')}-${MES[d.getMonth()]}`; };
const rango = (s) => { const a = deIso(s), b = deIso(masSem(s, 0)); b.setDate(b.getDate() + 6); return `${a.getDate()}${a.getMonth() !== b.getMonth() ? ' ' + MES[a.getMonth()] : ''} – ${b.getDate()} ${MES[b.getMonth()]} ${b.getFullYear()}`; };
const hoyIso = () => isoD(new Date());

// ---------- estado ----------
let CTX = null, CFG = null, TAR = [], HOY = lunes(new Date()), SEL = HOY, VISTA = 'resumen';
const FIL = { rol: '', sis: '', semanales: false, q: '' };
const usuario = () => CTX?.perfil?.nombre || CTX?.user?.email || '';
const gestiona = () => CTX?.esAdmin || ['admin', 'supervisor'].includes(CTX?.rol);
const ejecuta = () => CTX?.puedeEscribir;
const hhProp = (t) => Object.entries(t.resp || {}).filter(([k]) => k !== 'Tercero').reduce((a, [, v]) => a + v, 0);
const respTxt = (t) => Object.entries(t.resp || {}).map(([k, v]) => `${k} ${String(v).replace('.', ',')} h`).join(' · ');
const sisNom = (id) => SISTEMAS.find(s => s.id === Number(id))?.nombre || '';

function ocurrencias(t) {
  return (t.semanas || []).map(s => {
    const e = (t.ejec || {})[s] || null;
    const ef = e?.a || s;
    const est = e?.estado === 'hecho' ? 'hecho' : e?.estado === 'no' ? 'no' : ef < HOY ? 'atrasada' : 'pendiente';
    return { t, s, e, ef, est, reprog: !!e?.a };
  });
}
const todas = () => TAR.flatMap(ocurrencias);
const pasaFiltro = (t) => (!FIL.rol || (t.resp || {})[FIL.rol] != null) && (FIL.sis === '' || String(t.sistema) === FIL.sis)
  && (!FIL.q || `${t.eq} ${t.eqDesc} ${t.rutina} ${t.tarea}`.toLowerCase().includes(FIL.q.toLowerCase()));

// ---------- estilos ----------
const CSS = `
.pv-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.pv-kpi{background:var(--pp-card);border:1px solid var(--pp-line);border-radius:14px;padding:14px 16px;position:relative;overflow:hidden}
.pv-kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c,#3bb4e5)}
.pv-kpi .l{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);font-weight:600}
.pv-kpi .v{font-family:var(--f-display);font-size:28px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums}
.pv-kpi .v small{font-size:14px;color:var(--tx-3)}
.pv-kpi .s{font-size:12px;color:var(--tx-3);margin-top:2px}
.pv-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pv-tabs{display:flex;gap:4px 26px;flex-wrap:wrap;border-bottom:1px solid var(--pp-line);margin:18px 0 16px}
.pv-tabs button{background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:10px 2px 11px;color:var(--tx-3);font:600 14.5px var(--f-display);cursor:pointer;transition:color .2s,border-color .2s}
.pv-tabs button:hover{color:var(--tx)}
.pv-tabs button.on{color:#fff;border-bottom-color:var(--pp-acc)}
.pv-tb{display:flex;flex-wrap:wrap;gap:14px 0;align-items:stretch;padding:12px 6px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--pp-line);margin-bottom:14px}
.pv-blk{display:flex;flex-direction:column;gap:7px;padding:0 16px;min-width:0}
.pv-blk+.pv-blk{border-left:1px solid var(--pp-line)}
.pv-blk.der{margin-left:auto}
.pv-tb.filas{flex-direction:column;gap:12px}
.pv-tb.filas .pv-blk+.pv-blk{border-left:0;border-top:1px solid var(--pp-line);padding-top:12px}
.pv-blk .lb{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);font-weight:600}
.pv-blk .fila{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.pv-blk select,.pv-blk input.field{height:38px;font-size:13px;width:auto}
.pv-blk select{padding:0 30px 0 10px}
.pv-blk .sem{font-family:var(--f-display);font-weight:600;font-size:15px;min-width:170px;text-align:center;line-height:1.2}
.pv-blk .sem small{display:block;font-family:var(--f-body);font-weight:400;font-size:12px;color:var(--tx-3)}
@media (max-width:820px){.pv-blk{padding:0 10px;width:100%}.pv-blk+.pv-blk{border-left:0;border-top:1px solid var(--pp-line);padding-top:12px}.pv-blk.der{margin-left:0}}
.pv-nav .sem{font-family:var(--f-display);font-weight:600;font-size:16px;min-width:230px;text-align:center}
.pv-nav .sem small{display:block;font-family:var(--f-body);font-weight:400;font-size:12px;color:var(--tx-3)}
.pv-sec{margin:18px 0 8px;font-family:var(--f-display);font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.pv-sec span{font-family:var(--f-mono);font-size:12px;color:var(--tx-3);font-weight:400}
.pv-eq{margin-bottom:10px;border:1px solid var(--pp-line);border-radius:14px;background:var(--pp-card);overflow:hidden}
.pv-eqh{display:flex;align-items:baseline;gap:10px;padding:10px 14px;background:rgba(255,255,255,.03);border-bottom:1px solid var(--pp-line);flex-wrap:wrap}
.pv-eqh b{font-family:var(--f-mono);font-size:13px;color:var(--mint-2);font-weight:500}
.pv-eqh span{font-size:13.5px}.pv-eqh small{margin-left:auto;font-size:12px;color:var(--tx-3)}
.pv-it{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px 14px;border-bottom:1px solid var(--pp-line)}
.pv-it:last-child{border-bottom:0}
.pv-f{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font:700 12px var(--f-mono);color:#14202b}
.pv-it .t1{font-size:12px;color:var(--tx-3);font-family:var(--f-mono)}
.pv-it .t2{font-size:14px;line-height:1.4;margin:2px 0}
.pv-it .t3{font-size:12px;color:var(--tx-3)}
.pv-acc{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.pv-acc .btn{height:36px;padding:0 10px;font-size:12.5px;border-radius:9px}
.pv-st{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}
.pv-st::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.pv-meta{font-size:11.5px;color:var(--tx-3);text-align:right;margin-top:3px}
.pv-seg{display:inline-flex;border:1px solid var(--pp-line);border-radius:999px;padding:3px;background:rgba(255,255,255,.04)}
.pv-seg button{border:0;background:transparent;color:var(--tx-2);padding:7px 14px;border-radius:999px;font:500 13px var(--f-body);cursor:pointer}
.pv-seg button.on{background:linear-gradient(120deg,var(--pp-acc2),var(--pp-acc));color:#fff}
.pv-gwrap{overflow-x:auto;border-radius:10px;max-height:72vh;overflow-y:auto}
.pv-gantt{position:relative}
.pv-grow{display:grid;grid-template-columns:440px minmax(0,1fr);align-items:stretch;border-bottom:1px solid var(--pp-line)}
.pv-grow:hover{background:rgba(255,255,255,.025)}
.pv-gname{padding:9px 12px;font-size:13px;line-height:1.4;position:sticky;left:0;background:#3a4755;z-index:2;border-right:1px solid var(--pp-line)}
.pv-gact{display:grid;grid-template-columns:30px minmax(0,1fr);gap:10px;align-items:start}
.pv-gact .pv-f{width:28px;height:26px;font-size:10.5px}
.pv-gact .c{font-family:var(--f-mono);font-size:11px;color:var(--tx-3)}
.pv-gact .x{font-size:13px;margin:2px 0;white-space:normal}
.pv-geq{background:rgba(59,180,229,.06)}
.pv-geq .pv-gname{background:#3d4c5c;font-family:var(--f-display);font-weight:600;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
.pv-geq .pv-gname b{font-family:var(--f-mono);font-weight:500;color:var(--mint-2);font-size:12.5px}
.pv-geq .pv-gname .r{margin-left:auto;font:400 11px var(--f-body);color:var(--tx-3)}
.pv-gtrack{position:relative;min-height:40px}
.pv-gb{position:absolute;top:50%;transform:translateY(-50%);height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font:700 10.5px var(--f-mono);color:#14202b;cursor:pointer;white-space:nowrap;overflow:hidden;padding:0 4px;transition:filter .2s,transform .2s}
.pv-gb:hover{filter:brightness(1.12);transform:translateY(-50%) scaleY(1.08)}
.pv-gb.atrasada{color:#fff}.pv-gb.no{color:#cfd8e3}
.pv-gb.orig{border:1.5px dashed #f5b54a;color:#f5b54a;cursor:default}
.pv-gb.oh{background:#b4232c;color:#fff;cursor:default}
.pv-ghead{position:sticky;top:0;z-index:4;background:#3E4C5D}
.pv-ghead .pv-gname{background:#3E4C5D;font:600 11.5px var(--f-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--tx-3);display:flex;align-items:flex-end}
.pv-gmonths,.pv-gweeks{position:relative;height:24px}
.pv-gmonths{border-bottom:1px solid var(--pp-line)}
.pv-gmonths div,.pv-gweeks div{position:absolute;top:0;height:100%;font-size:11px;color:var(--tx-3);padding:5px 6px;border-left:1px solid var(--pp-line);white-space:nowrap;overflow:hidden}
.pv-gmonths div{color:var(--tx);font-weight:700}
.pv-gweeks div.hoy{color:#7cc8f8;font-weight:700}
.pv-gvl{position:absolute;top:48px;bottom:0;left:440px;right:0;pointer-events:none;z-index:1}
.pv-gvl div{position:absolute;top:0;bottom:0;border-left:1px dashed rgba(255,255,255,.07)}
.pv-gvl .hoy{border-left:2px solid var(--pp-atr);z-index:3}
.pv-gvl .hoy span{position:absolute;top:2px;left:4px;background:var(--pp-atr);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:5px}
@media (max-width:820px){.pv-grow{grid-template-columns:260px minmax(0,1fr)}.pv-gvl{left:260px}}
.pv-leg{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--tx-3);margin:10px 0}
.pv-leg i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px}
.pv-eqs{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:12px}
.pv-ec{text-align:left;color:var(--tx);cursor:pointer;padding:14px 16px;border-radius:14px;background:var(--pp-card);border:1px solid var(--pp-line);transition:border-color .2s,transform .2s}
.pv-ec:hover{border-color:rgba(59,180,229,.5);transform:translateY(-2px)}
.pv-ec b{font-family:var(--f-mono);font-size:12.5px;color:var(--mint-2);font-weight:500}
.pv-ec h4{margin:3px 0 8px;font-family:var(--f-display);font-weight:600;font-size:15px}
.pv-ec .n{display:flex;gap:14px;font-size:12px;color:var(--tx-3)}
.pv-ec .n strong{display:block;font-size:17px;color:var(--tx);font-family:var(--f-display)}
.pv-rt summary{cursor:pointer;padding:12px 14px;font-family:var(--f-display);font-weight:600;font-size:14.5px;list-style:none;display:flex;gap:10px;align-items:center}
.pv-rt summary::-webkit-details-marker{display:none}
.pv-rt summary small{font-family:var(--f-body);font-weight:400;color:var(--tx-3);font-size:12px}
.pv-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pv-tbl th{font:500 10.5px var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3);text-align:left;padding:9px 10px;border-bottom:1px solid var(--pp-line)}
.pv-tbl td{padding:9px 10px;border-bottom:1px solid var(--pp-line);vertical-align:top}
.pv-car{display:grid;gap:12px}
.pv-bar{display:grid;grid-template-columns:120px minmax(0,1fr) 80px;gap:10px;align-items:center;font-size:12.5px}
.pv-bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;align-items:end;height:90px}
.pv-bars div{background:linear-gradient(180deg,#3bb4e5,#1e5aa8);border-radius:4px 4px 0 0;position:relative;min-height:2px}
.pv-bars div span{position:absolute;top:-16px;left:0;right:0;text-align:center;font-size:10px;color:var(--tx-3)}
.pv-bars div.sobre{background:linear-gradient(180deg,#ff6b6b,#b4232c)}
.pv-mes{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:4px;font-size:10.5px;color:var(--tx-3);text-align:center;margin-top:4px}
.pv-cap{position:relative}
.pv-cap .ln{position:absolute;left:0;right:0;border-top:1.5px dashed #ff6b6b}
.pv-vacio{padding:42px 26px;text-align:center}
.pv-rr{display:grid;grid-template-columns:minmax(0,1fr) 90px 36px;gap:8px;margin-bottom:8px}
.pv-man{display:inline-block;font:600 10px var(--f-mono);letter-spacing:.06em;color:#c9a7ff;border:1px solid rgba(201,167,255,.45);border-radius:6px;padding:1px 5px;margin-left:6px;vertical-align:1px}
.pv-vacio h2{font-family:var(--f-display);font-weight:600;font-size:22px;margin:0 0 10px}
@media (max-width:820px){.pv-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pv-it{grid-template-columns:34px minmax(0,1fr)}.pv-acc{grid-column:1/-1;justify-content:flex-start}.pv-meta{text-align:left}}
`;

// =====================================================================
export async function montar(ctx) {
  CTX = ctx;
  if (!document.getElementById('pvcss')) document.head.insertAdjacentHTML('beforeend', `<style id="pvcss">${CSS}</style>`);
  ctx.main.innerHTML = '<div style="display:flex;justify-content:center;padding:80px 0"><div class="spinner"></div></div>';
  try {
    const c = await getDoc(refCfg());
    CFG = c.exists() ? c.data() : null;
    TAR = CFG ? (await getDocs(colTar())).docs.map(d => ({ id: d.id, ...d.data() })) : [];
  } catch (e) { ctx.main.innerHTML = `<div class="alert err">No se pudo leer el plan: ${esc(e.code || e.message)}</div>`; return; }
  HOY = lunes(new Date());
  if (!CFG) return vacio();
  if (SEL < CFG.inicio) SEL = CFG.inicio;
  pintar();
  // ¿hay una versión nueva del plan inicial?
  if (gestiona()) import('./pmp_semilla.js').then(S => { if ((CFG.version || 1) < S.PMP_VERSION) avisoActualizacion(S); }).catch(() => {});
}

function avisoActualizacion(S) {
  const top = CTX.main.querySelector('.pp-top'); if (!top || CTX.main.querySelector('#pvUpd')) return;
  top.insertAdjacentHTML('afterend', `<div class="alert warn" id="pvUpd" style="margin-bottom:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:240px"><b>Actualización del plan inicial disponible</b><ul style="margin:6px 0 0;padding-left:18px;line-height:1.5">${S.PMP_NOVEDADES.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <div style="font-size:12.5px;margin-top:6px">Se conservan las ejecuciones registradas y las actividades cargadas manualmente; solo cambian las semanas futuras.</div></div>
    <button class="btn pp-grad" id="pvUpdOk">Aplicar actualización</button></div>`);
  CTX.main.querySelector('#pvUpdOk').onclick = async (ev) => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = 'Aplicando…';
    try {
      const n = await aplicarSemilla(S);
      toast(`Plan actualizado: ${n.act} tareas actualizadas, ${n.nuevas} nuevas${n.quitadas ? `, ${n.quitadas} retiradas` : ''}.`);
      montar(CTX);
    } catch (e) { toast('No se pudo actualizar: ' + (e.code || e.message), 'err'); b.disabled = false; b.textContent = 'Aplicar actualización'; }
  };
}

// Aplica una versión nueva de la semilla: actualiza las tareas de origen semilla (texto, responsables, semanas futuras), agrega las nuevas
// y retira las que ya no existen si no tienen ejecuciones. Las tareas manuales no se tocan.
async function aplicarSemilla(S) {
  const EQ = await listarEquipos(); const porCod = new Map(EQ.map(e => [e.codigo, e]));
  const actuales = new Map(TAR.filter(t => t.origen !== 'manual').map(t => [`${t.eq}|${t.rutina}`, t]));
  const ops = []; const n = { act: 0, nuevas: 0, quitadas: 0 };
  S.PMP_TAREAS.filter(t => porCod.has(t.eq)).forEach(t => {
    const r = S.PMP_BIBLIOTECA[t.tipo].rutinas.find(x => x.cod === t.rutina);
    const base = { tipo: t.tipo, tipoNombre: S.PMP_BIBLIOTECA[t.tipo].nombre, rutina: r.cod, tarea: r.tarea, frec: r.frec, horas: r.horas || null, resp: r.resp, cond: r.cond, mat: r.mat || '', reg: r.reg || '',
      porHoras: !!t.porHoras, conjunto: t.conjunto || '', proximo: t.proximo || '', origen: 'semilla' };
    const k = `${t.eq}|${t.rutina}`, ya = actuales.get(k);
    if (ya) {
      const hechas = (ya.semanas || []).filter(s => s < HOY || (ya.ejec || {})[s]);
      const semanas = [...new Set([...hechas, ...t.semanas.filter(s => s >= HOY)])].sort();
      ops.push(['upd', ya.id, { ...base, semanas }]); actuales.delete(k); n.act++;
    } else {
      const e = porCod.get(t.eq);
      ops.push(['new', null, { ...base, eq: t.eq, eqId: e.id, eqDesc: S.PMP_CORRECCIONES[t.eq] || e.descripcion || '', sistema: e.sistema ?? '', crit: e.criticidad || '', ubicacion: e.ubicacion || '', semanas: t.semanas, ejec: {} }]); n.nuevas++;
    }
  });
  actuales.forEach(t => { if (!Object.keys(t.ejec || {}).length) { ops.push(['del', t.id]); n.quitadas++; } });
  for (let i = 0; i < ops.length; i += 400) {
    const w = writeBatch(db);
    ops.slice(i, i + 400).forEach(([op, id, d]) => {
      if (op === 'upd') w.set(doc(colTar(), id), { ...d, actualizado: serverTimestamp() }, { merge: true });
      else if (op === 'new') w.set(doc(colTar()), d);
      else w.delete(doc(colTar(), id));
    });
    await w.commit();
  }
  await setDoc(refCfg(), { capacidad: S.PMP_CAPACIDAD, biblioteca: S.PMP_BIBLIOTECA, eventos: S.PMP_EVENTOS, supuestos: S.PMP_SUPUESTOS, version: S.PMP_VERSION,
    actualizado: { fecha: hoyIso(), por: usuario() } }, { merge: true });
  return n;
}

// ---------- plan sin cargar ----------
function vacio() {
  CTX.main.innerHTML = `<div class="pp">
    <div class="pp-top"><div><div class="eyebrow">Plan de mantenimiento</div><h1 class="h-display">Plan de mantenimiento preventivo</h1></div></div>
    <div class="pp-card pv-vacio">
      <h2>El plan preventivo aún no está cargado</h2>
      <p class="muted" style="max-width:620px;margin:0 auto 22px;line-height:1.6">Plan inicial preparado para los equipos críticos de la base: rutinas estándar por tipo de equipo, frecuencias diaria a anual y 52 semanas programadas con la carga nivelada por especialidad.</p>
      ${gestiona() ? `<button class="btn pp-grad" id="pvCargar">${IC.up}Cargar plan inicial</button>` : '<div class="muted">Lo carga un Administrador o Supervisor del aplicativo.</div>'}
    </div></div>`;
  const b = CTX.main.querySelector('#pvCargar');
  if (b) b.onclick = cargarInicial;
}

async function cargarInicial() {
  const b = CTX.main.querySelector('#pvCargar'); b.disabled = true; b.textContent = 'Revisando la base de equipos…';
  let S, EQ;
  try { [S, EQ] = await Promise.all([import('./pmp_semilla.js'), listarEquipos()]); }
  catch (e) { toast('No se pudo preparar la carga: ' + (e.code || e.message), 'err'); b.disabled = false; b.innerHTML = `${IC.up}Cargar plan inicial`; return; }
  const porCod = new Map(EQ.map(e => [e.codigo, e]));
  const cods = [...new Set(S.PMP_TAREAS.map(t => t.eq))];
  const faltan = cods.filter(c => !porCod.has(c));
  const corr = Object.entries(S.PMP_CORRECCIONES).filter(([c, d]) => porCod.has(c) && porCod.get(c).descripcion !== d);
  const tareas = S.PMP_TAREAS.filter(t => porCod.has(t.eq));
  const bg = modal('Cargar plan inicial', `
    <div class="pv-kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
      <div class="pv-kpi"><div class="l">Equipos</div><div class="v">${cods.length - faltan.length}<small> / ${cods.length}</small></div></div>
      <div class="pv-kpi" style="--c:#2ec4a6"><div class="l">Tareas</div><div class="v">${tareas.length}</div></div>
      <div class="pv-kpi" style="--c:#f5b54a"><div class="l">Desde</div><div class="v" style="font-size:20px">${corto(S.PMP_INICIO)}</div><div class="s">52 semanas</div></div>
    </div>
    ${faltan.length ? `<div class="alert warn" style="margin-bottom:12px">No están en la base de equipos y se omiten: ${faltan.map(esc).join(', ')}.</div>` : ''}
    ${corr.length ? `<div style="font-weight:600;margin:6px 0">Correcciones en la base de equipos</div><table class="pv-tbl"><tbody>${corr.map(([c, d]) => `<tr><td class="mono" style="color:var(--mint-2)">${esc(c)}</td><td style="color:var(--tx-3)">${esc(porCod.get(c).descripcion)}</td><td>→ ${esc(d)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div style="font-weight:600;margin:14px 0 6px">Supuestos</div>
    <ul style="margin:0;padding-left:18px;color:var(--tx-2);font-size:13px;line-height:1.55">${S.PMP_SUPUESTOS.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`,
    `<button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="pvOk">Cargar plan</button>`, 760);
  b.disabled = false; b.innerHTML = `${IC.up}Cargar plan inicial`;
  bg.querySelector('#pvOk').onclick = async (ev) => {
    const ok = ev.currentTarget; ok.disabled = true; ok.textContent = 'Cargando…';
    try {
      const filas = tareas.map(t => {
        const e = porCod.get(t.eq), r = S.PMP_BIBLIOTECA[t.tipo].rutinas.find(x => x.cod === t.rutina);
        return { eq: t.eq, eqId: e.id, eqDesc: S.PMP_CORRECCIONES[t.eq] || e.descripcion || '', sistema: e.sistema ?? '', crit: e.criticidad || '', ubicacion: e.ubicacion || '',
          tipo: t.tipo, tipoNombre: S.PMP_BIBLIOTECA[t.tipo].nombre, rutina: r.cod, tarea: r.tarea, frec: r.frec, horas: r.horas || null, resp: r.resp, cond: r.cond, mat: r.mat || '', reg: r.reg || '',
          semanas: t.semanas, porHoras: !!t.porHoras, conjunto: t.conjunto || '', proximo: t.proximo || '', origen: 'semilla', ejec: {} };
      });
      for (let i = 0; i < filas.length; i += 400) {
        const w = writeBatch(db);
        filas.slice(i, i + 400).forEach(f => w.set(doc(colTar()), f));
        if (i === 0) corr.forEach(([c, d]) => w.set(doc(colEquipos(), porCod.get(c).id), { descripcion: d, actualizado: serverTimestamp(), actualizadoPor: usuario() }, { merge: true }));
        await w.commit();
      }
      await setDoc(refCfg(), { version: S.PMP_VERSION, inicio: S.PMP_INICIO, capacidad: S.PMP_CAPACIDAD, biblioteca: S.PMP_BIBLIOTECA, eventos: S.PMP_EVENTOS, supuestos: S.PMP_SUPUESTOS,
        cargado: { fecha: hoyIso(), por: usuario() }, creado: serverTimestamp() });
      bg.remove(); toast(`Plan cargado: ${filas.length} tareas${corr.length ? ` · ${corr.length} correcciones en Equipos` : ''}.`);
      montar(CTX);
    } catch (e) { toast('No se pudo cargar: ' + (e.code || e.message), 'err'); ok.disabled = false; ok.textContent = 'Cargar plan'; }
  };
}

// ---------- modal ----------
function modal(titulo, cuerpo, pie, ancho = 620) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="max-width:${ancho}px"><div class="modal-h"><div class="h-display" style="font-size:20px">${titulo}</div><button class="btn btn-icon" data-x aria-label="Cerrar">${IC.no}</button></div>
    <div class="modal-b">${cuerpo}</div><div class="modal-f">${pie}</div></div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  bg.addEventListener('mousedown', (e) => { if (e.target === bg) bg.remove(); });
  return bg;
}

// =====================================================================
function pintar() {
  const oc = todas();
  const pas = oc.filter(o => o.ef < HOY);
  const hechas = pas.filter(o => o.est === 'hecho').length;
  const cumpl = pas.length ? Math.round(hechas / pas.length * 100) : null;
  const REF = HOY < CFG.inicio ? CFG.inicio : HOY;   // antes del inicio, la primera semana del plan
  const sem = oc.filter(o => o.ef === REF);
  const atr = oc.filter(o => o.est === 'atrasada');
  const hhSem = sem.reduce((a, o) => a + hhProp(o.t), 0);
  const eqs = new Set(TAR.map(t => t.eq)).size;
  CTX.main.innerHTML = `<div class="pp">
    <div class="pp-top"><div><div class="eyebrow">Plan de mantenimiento</div><h1 class="h-display">Plan preventivo</h1>
      <p class="muted" style="margin:8px 0 0;font-size:13.5px">${eqs} equipos · ${TAR.length} tareas · desde ${corto(CFG.inicio)} (52 semanas)</p></div>
      ${gestiona() ? `<button class="btn pp-btn pp-grad" id="pvNueva">${IC.mas}Nueva actividad</button>` : ''}</div>
    <div class="pv-kpis" ${VISTA === 'resumen' ? 'hidden' : ''}>
      <div class="pv-kpi" style="--c:#2ec4a6"><div class="l">Cumplimiento</div><div class="v">${cumpl == null ? '—' : cumpl + '<small>%</small>'}</div><div class="s">${pas.length ? `${hechas} de ${pas.length} tareas vencidas` : 'Aún no hay semanas cerradas'}</div></div>
      <div class="pv-kpi"><div class="l">${REF === HOY ? 'Esta semana' : 'Semana del ' + corto(REF)}</div><div class="v">${sem.length}</div><div class="s">${sem.filter(o => o.est === 'hecho').length} ejecutadas · ${hhSem.toFixed(1).replace('.', ',')} HH</div></div>
      <div class="pv-kpi" style="--c:#ff6b6b"><div class="l">Atrasadas</div><div class="v">${atr.length}</div><div class="s">De semanas anteriores</div></div>
      <div class="pv-kpi" style="--c:#f5b54a"><div class="l">Meta</div><div class="v">90<small>%</small></div><div class="s">Cumplimiento mensual del PMP</div></div>
    </div>
    <nav class="pv-tabs" role="tablist">${[['resumen', 'Resumen'], ['semana', 'Semana'], ['calendario', 'Calendario'], ['equipos', 'Equipos'], ['rutinas', 'Rutinas'], ['carga', 'Carga HH']].map(([k, l]) => `<button role="tab" aria-selected="${VISTA === k}" class="${VISTA === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</nav>
    <div id="pvV"></div></div>`;
  CTX.main.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { VISTA = b.dataset.v; pintar(); });
  const nb = CTX.main.querySelector('#pvNueva'); if (nb) nb.onclick = () => editarActividad(null);
  const box = CTX.main.querySelector('#pvV');
  ({ resumen: (b) => vResumen(b, { CFG, TAR, HOY, ocurrencias, hhProp, sisNom, FREC, corto, masSem, deIso, numSem }), semana: vSemana, calendario: vCalendario, equipos: vEquipos, rutinas: vRutinas, carga: vCarga })[VISTA](box);
}

// Bloque "Filtros" del panel de controles (se usa en Semana, Calendario y Equipos)
function filtrosHtml(conSemanales = false) {
  const sis = [...new Set(TAR.map(t => String(t.sistema)))].filter(x => x !== '').sort();
  const roles = ROLES.filter(r => TAR.some(t => (t.resp || {})[r] != null));
  return `<div class="pv-blk"><span class="lb">Filtros</span><div class="fila">
    <select class="field" id="pvRol" aria-label="Especialidad"><option value="">Todas las especialidades</option>${roles.map(r => `<option ${FIL.rol === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select>
    <select class="field" id="pvSis" aria-label="Sistema"><option value="">Todos los sistemas</option>${sis.map(x => `<option value="${x}" ${FIL.sis === x ? 'selected' : ''}>${esc(sisNom(x))}</option>`).join('')}</select>
    <input class="field" id="pvQ" type="search" placeholder="Buscar equipo o tarea" value="${esc(FIL.q)}" style="width:190px">
    ${conSemanales ? `<label class="check" style="font-size:13px"><input type="checkbox" id="pvSem" ${FIL.semanales ? 'checked' : ''}>Incluir semanales</label>` : ''}
  </div></div>`;
}
const panel = (...bloques) => `<div class="pv-tb">${bloques.filter(Boolean).join('')}</div>`;
const panelFilas = (...bloques) => `<div class="pv-tb filas">${bloques.filter(Boolean).join('')}</div>`;
function enlazarFiltros(box, re) {
  const r = box.querySelector('#pvRol'); if (r) r.onchange = () => { FIL.rol = r.value; re(); };
  const s = box.querySelector('#pvSis'); if (s) s.onchange = () => { FIL.sis = s.value; re(); };
  const k = box.querySelector('#pvSem'); if (k) k.onchange = () => { FIL.semanales = k.checked; re(); };
  const q = box.querySelector('#pvQ'); if (q) q.oninput = () => { FIL.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { re(); const n = box.querySelector('#pvQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); };
}

// ---------- vista semana ----------
function itemHtml(o, conSemana = false) {
  const t = o.t, f = FREC[t.frec], st = EST[o.est];
  const acc = [];
  if (o.est === 'hecho' || o.est === 'no') {
    acc.push(`<span class="pv-st" style="color:${st.hex};background:${st.hex}22">${st.l}</span>`);
    if (gestiona()) acc.push(`<button class="btn" data-a="undo" title="Deshacer">${IC.undo}</button>`);
  } else if (ejecuta()) {
    acc.push(`<button class="btn" data-a="ok" style="color:#8ff0de">${IC.ok}Ejecutado</button>`);
    if (gestiona()) acc.push(`<button class="btn" data-a="rep" title="Reprogramar">${IC.rep}</button><button class="btn" data-a="no" title="No ejecutado">${IC.no}</button>`);
  } else acc.push(`<span class="pv-st" style="color:${st.hex};background:${st.hex}22">${st.l}</span>`);
  const meta = o.e?.estado === 'hecho' || o.e?.estado === 'no' ? `${o.e.estado === 'hecho' ? corto(o.e.fecha) : ''} · ${esc(o.e.por || '')}${o.e.obs ? ' · ' + esc(o.e.obs) : ''}`
    : o.reprog ? `Reprogramada desde la semana del ${corto(o.s)}` : conSemana ? `Programada semana del ${corto(o.ef)}` : '';
  return `<div class="pv-it" data-t="${t.id}" data-s="${o.s}">
    <div class="pv-f" style="background:${f.hex}" title="${f.l}">${f.c}</div>
    <div><div class="t1">${esc(t.rutina)}${t.origen === 'manual' ? '<span class="pv-man">PROPIA</span>' : ''} · ${f.l}${t.porHoras && t.horas ? ` · ${t.horas.toLocaleString('es-PE')} h` : ''}${t.conjunto ? ` · con ${esc(t.conjunto)}` : ''}</div>
      <div class="t2">${esc(t.tarea)}</div>
      <div class="t3">${esc(respTxt(t))} · ${esc(t.cond)}${t.mat ? ' · ' + esc(t.mat) : ''}</div></div>
    <div><div class="pv-acc">${acc.join('')}</div>${meta ? `<div class="pv-meta">${meta}</div>` : ''}</div></div>`;
}
function grupoEquipos(lista, conSemana) {
  const g = new Map();
  lista.forEach(o => { if (!g.has(o.t.eq)) g.set(o.t.eq, []); g.get(o.t.eq).push(o); });
  return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cod, os]) => {
    const t = os[0].t, hh = os.reduce((a, o) => a + hhProp(o.t), 0);
    os.sort((a, b) => ORD_F.indexOf(b.t.frec) - ORD_F.indexOf(a.t.frec));
    return `<div class="pv-eq"><div class="pv-eqh"><b>${esc(cod)}</b><span>${esc(t.eqDesc)}</span><small>${esc(sisNom(t.sistema))} · ${hh.toFixed(1).replace('.', ',')} HH</small></div>${os.map(o => itemHtml(o, conSemana)).join('')}</div>`;
  }).join('');
}
function vSemana(box) {
  const oc = todas().filter(o => pasaFiltro(o.t));
  const sem = oc.filter(o => o.ef === SEL);
  const atr = SEL === HOY ? oc.filter(o => o.est === 'atrasada') : [];
  const fin = masSem(CFG.inicio, 51);
  const ev = Object.entries(CFG.eventos || {}).flatMap(([eq, l]) => l.filter(x => x.semana === SEL).map(x => ({ eq, ...x })));
  const hh = {}; sem.forEach(o => Object.entries(o.t.resp || {}).forEach(([r, v]) => { hh[r] = (hh[r] || 0) + v; }));
  box.innerHTML = `
    ${panel(`<div class="pv-blk"><span class="lb">Periodo</span><div class="fila">
        <button class="btn pp-btn" id="pvAnt" ${SEL <= CFG.inicio ? 'disabled' : ''} aria-label="Semana anterior">${IC.izq}</button>
        <div class="sem">Semana ${numSem(SEL)}${SEL === HOY ? ' · actual' : ''}<small>${rango(SEL)}</small></div>
        <button class="btn pp-btn" id="pvSig" ${SEL >= fin ? 'disabled' : ''} aria-label="Semana siguiente">${IC.der}</button>
        ${SEL !== HOY && HOY >= CFG.inicio && HOY <= fin ? '<button class="btn pp-btn" id="pvHoy">Hoy</button>' : ''}</div></div>`,
      filtrosHtml(),
      `<div class="pv-blk der"><span class="lb">Acciones</span><div class="fila"><button class="btn pp-btn" id="pvOT" ${sem.length ? '' : 'disabled'}>${IC.print}Orden de trabajo</button></div></div>`)}
    ${Object.keys(hh).length ? `<div class="pp-resp" style="margin-bottom:6px">${Object.entries(hh).map(([r, v]) => `<div><b>${v.toFixed(1).replace('.', ',')}</b><span>HH ${esc(r)}</span></div>`).join('')}</div>` : ''}
    ${ev.map(x => `<div class="alert warn" style="margin-top:10px"><b>${esc(x.eq)}</b> · ${esc(x.texto)}</div>`).join('')}
    ${atr.length ? `<div class="pv-sec" style="color:#ffb3b3">Atrasadas <span>${atr.length}</span></div>${grupoEquipos(atr, true)}` : ''}
    <div class="pv-sec">Programadas para la semana <span>${sem.length}</span></div>
    ${sem.length ? grupoEquipos(sem) : '<div class="pp-card muted" style="text-align:center;padding:24px">No hay tareas programadas con este filtro.</div>'}`;
  box.querySelector('#pvAnt').onclick = () => { SEL = masSem(SEL, -1); vSemana(box); };
  box.querySelector('#pvSig').onclick = () => { SEL = masSem(SEL, 1); vSemana(box); };
  const h = box.querySelector('#pvHoy'); if (h) h.onclick = () => { SEL = HOY; vSemana(box); };
  box.querySelector('#pvOT').onclick = () => ordenTrabajo(sem);
  enlazarFiltros(box, () => vSemana(box));
  enlazarAcciones(box, () => pintar());
}

function enlazarAcciones(box, re) {
  box.querySelectorAll('.pv-it [data-a]').forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    const it = b.closest('.pv-it'), t = TAR.find(x => x.id === it.dataset.t), s = it.dataset.s;
    accion(b.dataset.a, t, s, re);
  });
}

async function guardarEjec(t, s, valor) {
  const ejec = { ...(t.ejec || {}) };
  if (valor) ejec[s] = valor; else delete ejec[s];
  await updateDoc(doc(colTar(), t.id), { ejec, actualizado: serverTimestamp() });
  t.ejec = ejec;
}

function accion(tipo, t, s, re) {
  const e = (t.ejec || {})[s] || {};
  const cab = `<div style="font-family:var(--f-mono);font-size:12.5px;color:var(--mint-2)">${esc(t.eq)} · ${esc(t.rutina)}</div><div style="margin:4px 0 14px;line-height:1.45">${esc(t.tarea)}</div>`;
  if (tipo === 'undo') {
    guardarEjec(t, s, e.a ? { estado: 'reprog', a: e.a, por: e.por, motivo: e.motivo || '' } : null).then(() => { toast('Registro deshecho.'); re(); }).catch(er => toast('No se pudo: ' + (er.code || er.message), 'err'));
    return;
  }
  if (tipo === 'ok') {
    const bg = modal('Registrar ejecución', cab + `<div class="pp-fg" style="display:grid;grid-template-columns:1fr;gap:12px">
      <div><label class="label" for="pvF">Fecha de ejecución</label><input class="field" type="date" id="pvF" value="${hoyIso()}"></div>
      <div><label class="label" for="pvO">Observación o hallazgo (opcional)</label><textarea class="field" id="pvO" rows="3" style="height:auto;padding:12px 14px;line-height:1.5" placeholder="Valores medidos, repuestos usados, hallazgos…"></textarea></div></div>`,
      `<button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="pvG">Registrar</button>`);
    bg.querySelector('#pvG').onclick = async () => {
      const f = bg.querySelector('#pvF').value; if (!f) return toast('Indique la fecha', 'err');
      try { await guardarEjec(t, s, { estado: 'hecho', fecha: f, por: usuario(), obs: bg.querySelector('#pvO').value.trim(), ...(e.a ? { a: e.a } : {}) }); bg.remove(); toast('Ejecución registrada.'); re(); }
      catch (er) { toast('No se pudo guardar: ' + (er.code || er.message), 'err'); }
    };
  }
  if (tipo === 'rep') {
    const actual = e.a || s;
    const bg = modal('Reprogramar', cab + `<div style="display:grid;gap:12px">
      <div><label class="label" for="pvF">Nueva fecha (se toma su semana)</label><input class="field" type="date" id="pvF" value="${masSem(actual, 1)}"></div>
      <div><label class="label" for="pvO">Motivo</label><input class="field" id="pvO" placeholder="Coordinación con Producción, falta de repuesto…"></div></div>`,
      `<button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="pvG">Reprogramar</button>`);
    bg.querySelector('#pvG').onclick = async () => {
      const f = bg.querySelector('#pvF').value, m = bg.querySelector('#pvO').value.trim();
      if (!f) return toast('Indique la nueva fecha', 'err');
      if (!m) return toast('Indique el motivo', 'err');
      const a = lunes(deIso(f));
      try { await guardarEjec(t, s, a === s ? null : { estado: 'reprog', a, motivo: m, por: usuario() }); bg.remove(); toast(`Reprogramada a la semana del ${corto(a)}.`); re(); }
      catch (er) { toast('No se pudo guardar: ' + (er.code || er.message), 'err'); }
    };
  }
  if (tipo === 'no') {
    const bg = modal('No ejecutado', cab + `<label class="label" for="pvO">Motivo</label><input class="field" id="pvO" placeholder="Equipo en producción sin respaldo, sin repuesto…">
      <div class="muted" style="font-size:12.5px;margin-top:8px">Cuenta como incumplimiento. Si se hará más adelante, use Reprogramar.</div>`,
      `<button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="pvG">Guardar</button>`);
    bg.querySelector('#pvG').onclick = async () => {
      const m = bg.querySelector('#pvO').value.trim(); if (!m) return toast('Indique el motivo', 'err');
      try { await guardarEjec(t, s, { estado: 'no', fecha: hoyIso(), obs: m, por: usuario(), ...(e.a ? { a: e.a } : {}) }); bg.remove(); toast('Registrado como no ejecutado.'); re(); }
      catch (er) { toast('No se pudo guardar: ' + (er.code || er.message), 'err'); }
    };
  }
}

// ---------- orden de trabajo semanal (impresión) ----------
function ordenTrabajo(lista) {
  const porRol = new Map();
  lista.forEach(o => { const r = Object.keys(o.t.resp || {}).find(k => k !== 'Tercero') || 'Tercero'; if (!porRol.has(r)) porRol.set(r, []); porRol.get(r).push(o); });
  const logo = new URL('logo.png', location.href).href;
  const bloques = [...porRol.entries()].sort((a, b) => ROLES.indexOf(a[0]) - ROLES.indexOf(b[0])).map(([r, os]) => {
    os.sort((a, b) => a.t.eq.localeCompare(b.t.eq));
    const hh = os.reduce((a, o) => a + hhProp(o.t), 0);
    return `<h3>${esc(r)} <span>${os.length} tareas · ${hh.toFixed(1).replace('.', ',')} HH</span></h3>
      <table><thead><tr><th style="width:4%">N°</th><th style="width:15%">Equipo</th><th style="width:7%">Rutina</th><th>Tarea</th><th style="width:12%">Responsables</th><th style="width:8%">Condición</th><th style="width:6%">Hecho</th><th style="width:8%">Fecha</th><th style="width:16%">Observación / firma</th></tr></thead>
      <tbody>${os.map((o, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(o.t.eq)}</b><br><small>${esc(o.t.eqDesc)}</small></td><td class="c">${esc(o.t.rutina)}<br><small>${FREC[o.t.frec].l}</small></td><td>${esc(o.t.tarea)}${o.t.mat ? `<br><small>Materiales: ${esc(o.t.mat)}</small>` : ''}</td><td><small>${esc(respTxt(o.t))}</small></td><td class="c"><small>${esc(o.t.cond)}</small></td><td class="c"><span class="bx"></span></td><td></td><td></td></tr>`).join('')}</tbody></table>`;
  }).join('');
  const w = window.open('', '_blank');
  if (!w) return toast('Permita ventanas emergentes para imprimir.', 'err');
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>OT preventiva semana ${numSem(SEL)}</title><style>
    @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#14202B;font-size:9pt;margin:0}
    .cab{display:grid;grid-template-columns:40mm 1fr 60mm;border:1px solid #1E3A5C;align-items:center}
    .cab div{padding:3mm}.cab img{max-height:14mm;max-width:100%}.cab .t{text-align:center;border-left:1px solid #1E3A5C;border-right:1px solid #1E3A5C}
    .cab .t b{font-size:13pt;text-transform:uppercase;color:#1E3A5C;display:block}.cab .d{font-size:8.5pt;line-height:1.6}
    h3{background:#1E3A5C;color:#fff;font-size:9.5pt;padding:1.6mm 2.5mm;margin:5mm 0 0;text-transform:uppercase;letter-spacing:.5pt}
    h3 span{float:right;font-weight:400;text-transform:none}
    table{width:100%;border-collapse:collapse}th{background:#EEF2F6;color:#1E3A5C;font-size:8pt;border:.6pt solid #9AA8B6;padding:1.3mm}
    td{border:.6pt solid #9AA8B6;padding:1.3mm 1.6mm;vertical-align:top;font-size:8.4pt}td.c{text-align:center}small{color:#4A5866;font-size:7.4pt}
    tr{break-inside:avoid}.bx{display:inline-block;width:4mm;height:4mm;border:.8pt solid #33414F}
    .fir{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:10mm}.fir div{border-top:.8pt solid #33414F;padding-top:1.5mm;text-align:center;font-size:8.5pt}
  </style></head><body>
    <div class="cab"><div><img src="${logo}" alt=""></div><div class="t"><b>Orden de trabajo preventiva</b>Departamento de Mantenimiento · Planta Paita</div>
      <div class="d"><b>Semana:</b> ${numSem(SEL)} · ${rango(SEL)}<br><b>Tareas:</b> ${lista.length}<br><b>Emitida:</b> ${corto(hoyIso())} · ${esc(usuario())}</div></div>
    ${bloques}
    <div class="fir"><div>Ejecutado por</div><div>Verificado por</div></div>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}

// ---------- vista calendario (formato línea de tiempo) ----------
const CAL = { modo: 'mes', ref: null };
function rangoCal() {
  const ini = CFG.inicio, fin = finPlan();
  const ref = CAL.ref || (HOY < ini ? ini : HOY > fin ? fin : HOY);
  CAL.ref = ref;
  const todas = Array.from({ length: 52 }, (_, i) => masSem(ini, i));
  const d = deIso(ref);
  let sem, titulo;
  if (CAL.modo === 'anio') { sem = todas; titulo = `${corto(ini)} – ${corto(masSem(fin, 0))} · 52 semanas`; }
  else if (CAL.modo === 'semana') { sem = [ref]; titulo = `Semana ${numSem(ref)} · ${rango(ref)}`; }
  else if (CAL.modo === 'trimestre') {
    const m0 = Math.floor(d.getMonth() / 3) * 3, y = d.getFullYear();
    sem = todas.filter(s => { const x = deIso(s); return x.getFullYear() === y && x.getMonth() >= m0 && x.getMonth() < m0 + 3; });
    titulo = `${MES[m0]} – ${MES[m0 + 2]} ${y}`;
  } else {
    sem = todas.filter(s => s.slice(0, 7) === ref.slice(0, 7));
    titulo = `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'][d.getMonth()]} ${d.getFullYear()}`;
  }
  return { sem: sem.length ? sem : [ref], titulo, ini, fin };
}
function moverCal(dir) {
  const { ini, fin } = rangoCal(); const r = deIso(CAL.ref);
  let s;
  if (CAL.modo === 'semana') s = masSem(CAL.ref, dir);
  else {
    const paso = CAL.modo === 'mes' ? 1 : 3, m0 = CAL.modo === 'mes' ? r.getMonth() : Math.floor(r.getMonth() / 3) * 3;
    const d = new Date(r.getFullYear(), m0 + paso * dir, 1);
    s = lunes(d); if (deIso(s).getMonth() !== d.getMonth()) s = masSem(s, 1);   // primer lunes del mes
  }
  CAL.ref = s < ini ? ini : s > fin ? fin : s;
}
function vCalendario(box) {
  const { sem, titulo, ini, fin } = rangoCal();
  const set = new Set(sem), n = sem.length, w0 = sem[0];
  const pos = (s) => (Math.round((deIso(s) - deIso(w0)) / (7 * DIA)) / n) * 100;
  const anchoMin = CAL.modo === 'anio' ? 1500 : CAL.modo === 'trimestre' ? 1100 : 900;
  const etiqueta = CAL.modo !== 'anio';
  const tars = TAR.filter(t => t.frec !== 'D' && pasaFiltro(t) && (FIL.semanales || t.frec !== 'S'))
    .map(t => {
      const marcas = [];
      ocurrencias(t).forEach(o => {
        if (set.has(o.ef)) marcas.push({ o, s: o.ef });
        if (o.reprog && o.s !== o.ef && set.has(o.s)) marcas.push({ o, s: o.s, orig: true });
      });
      return { t, marcas };
    }).filter(x => CAL.modo === 'anio' || x.marcas.length);
  const porEq = new Map(); tars.forEach(x => { if (!porEq.has(x.t.eq)) porEq.set(x.t.eq, []); porEq.get(x.t.eq).push(x); });
  const ev = CFG.eventos || {};
  const meses = []; sem.forEach(s => { const k = s.slice(0, 7); if (!meses.length || meses[meses.length - 1].k !== k) meses.push({ k, desde: s, n: 1 }); else meses[meses.length - 1].n++; });
  const txtEst = (o, orig) => orig ? 'Reprogramada' : o.est === 'hecho' ? 'Ejecutada' : o.est === 'atrasada' ? 'Atrasada' : o.est === 'no' ? 'No ejecutada' : 'Programada';
  const barra = (t, m) => {
    const f = FREC[t.frec], o = m.o, est = m.orig ? 'orig' : o.est;
    const bg = est === 'hecho' ? '#2ec4a6' : est === 'atrasada' ? '#ff6b6b' : est === 'no' ? '#5d6b79' : f.hex;
    const lbl = !etiqueta ? (o.est === 'hecho' && !m.orig ? '✓' : f.c)
      : o.est === 'hecho' && !m.orig ? `✓ ${f.c}${o.e?.fecha ? ' · ' + corto(o.e.fecha) : ''}` : `${f.c} · ${txtEst(o, m.orig)}`;
    return `<div class="pv-gb ${est}" ${m.orig ? '' : `data-t="${t.id}" data-s="${o.s}"`} style="left:calc(${pos(m.s)}% + 2px);width:calc(${100 / n}% - 4px);background:${est === 'orig' ? 'transparent' : bg}" title="${esc(f.l)} · ${txtEst(o, m.orig)} · semana del ${corto(m.s)}${o.reprog && !m.orig ? ` (reprogramada desde ${corto(o.s)})` : ''}">${lbl}</div>`;
  };
  let h = `<div class="pv-grow pv-ghead"><div class="pv-gname">Equipo / actividad</div><div><div class="pv-gmonths">${meses.map(m => { const d = deIso(m.desde); return `<div style="left:${pos(m.desde)}%;width:${m.n / n * 100}%">${CAL.modo === 'anio' ? `${MES[d.getMonth()]}-${String(d.getFullYear()).slice(2)}` : `${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'][d.getMonth()]} ${d.getFullYear()}`}</div>`; }).join('')}</div>
    <div class="pv-gweeks">${sem.map(s => `<div style="left:${pos(s)}%;width:${100 / n}%" class="${s === HOY ? 'hoy' : ''}">${CAL.modo === 'anio' ? deIso(s).getDate() : `Sem ${numSem(s)} · ${corto(s)}`}</div>`).join('')}</div></div></div>`;
  [...porEq.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([cod, xs]) => {
    xs.sort((a, b) => ORD_F.indexOf(a.t.frec) - ORD_F.indexOf(b.t.frec) || a.t.rutina.localeCompare(b.t.rutina));
    const t0 = xs[0].t, ovh = (ev[cod] || []).filter(x => set.has(x.semana));
    h += `<div class="pv-grow pv-geq"><div class="pv-gname"><b>${esc(cod)}</b>${esc(t0.eqDesc)}<span class="r">${esc(sisNom(t0.sistema))}</span></div><div class="pv-gtrack">${ovh.map(x => `<div class="pv-gb oh" style="left:calc(${pos(x.semana)}% + 2px);width:calc(${100 / n}% - 4px)" title="${esc(x.texto)}">${etiqueta ? 'Overhaul' : 'OH'}</div>`).join('')}</div></div>`;
    xs.forEach(({ t, marcas }) => {
      h += `<div class="pv-grow"><div class="pv-gname pv-gact"><span class="pv-f" style="background:${FREC[t.frec].hex}" title="${FREC[t.frec].l}">${FREC[t.frec].c}</span>
        <div><div class="c">${esc(t.rutina)}${t.origen === 'manual' ? '<span class="pv-man">PROPIA</span>' : ''} · ${FREC[t.frec].l}${t.horas ? ` o ${t.horas.toLocaleString('es-PE')} h` : ''}</div><div class="x">${esc(t.tarea)}</div><div class="c">${esc(respTxt(t))} · ${esc(t.cond)}</div></div></div>
        <div class="pv-gtrack">${marcas.map(m => barra(t, m)).join('')}</div></div>`;
    });
  });
  if (!porEq.size) h += `<div class="pv-grow"><div class="pv-gname muted">No hay actividades en este periodo con el filtro elegido.</div><div></div></div>`;
  const vl = sem.map(s => `<div style="left:${pos(s)}%"></div>`).join('') + (set.has(HOY) ? `<div class="hoy" style="left:${pos(HOY) + 50 / n}%"><span>Hoy</span></div>` : '');
  box.innerHTML = `
    ${panelFilas(`<div class="pv-blk"><span class="lb">Vista y periodo</span><div class="fila">
        <select class="field" id="cModo" aria-label="Vista">${[['semana', 'Semana'], ['mes', 'Mes'], ['trimestre', 'Trimestre'], ['anio', 'Año completo']].map(([k, l]) => `<option value="${k}" ${CAL.modo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        ${CAL.modo !== 'anio' ? `<button class="btn pp-btn" id="cAnt" ${sem[0] <= ini ? 'disabled' : ''} aria-label="Anterior">${IC.izq}</button>` : ''}
        <div class="sem">${esc(titulo)}</div>
        ${CAL.modo !== 'anio' ? `<button class="btn pp-btn" id="cSig" ${sem[sem.length - 1] >= fin ? 'disabled' : ''} aria-label="Siguiente">${IC.der}</button>` : ''}
        ${HOY >= ini && HOY <= fin && !set.has(HOY) ? '<button class="btn pp-btn" id="cHoy">Hoy</button>' : ''}
        ${CAL.modo !== 'anio' ? `<input class="field" type="date" id="cFe" value="${CAL.ref}" min="${ini}" max="${masSem(fin, 0)}" title="Ir a una fecha" aria-label="Ir a una fecha">` : ''}</div></div>`,
      filtrosHtml(true))}
    <div class="pv-leg">${ORD_F.map(k => `<span><i style="background:${FREC[k].hex}"></i>${FREC[k].l}</span>`).join('')}<span><i style="background:#2ec4a6"></i>Ejecutada</span><span><i style="background:#ff6b6b"></i>Atrasada</span><span><i style="background:transparent;border:1.5px dashed #f5b54a"></i>Semana original (reprogramada)</span><span><i style="background:#b4232c"></i>Overhaul</span></div>
    <div class="pp-card" style="padding:10px"><div class="pv-gwrap"><div class="pv-gantt" style="min-width:${anchoMin}px">${h}<div class="pv-gvl">${vl}</div></div></div>
    <div class="pp-foot">${tars.length} actividades · toque una barra para registrar la ejecución o reprogramar${!FIL.semanales ? ' · las semanales están ocultas (marque "Incluir semanales")' : ''}</div></div>`;
  box.querySelector('#cModo').onchange = (e) => { CAL.modo = e.target.value; vCalendario(box); };
  const an = box.querySelector('#cAnt'); if (an) an.onclick = () => { moverCal(-1); vCalendario(box); };
  const sg = box.querySelector('#cSig'); if (sg) sg.onclick = () => { moverCal(1); vCalendario(box); };
  const hy = box.querySelector('#cHoy'); if (hy) hy.onclick = () => { CAL.ref = HOY; vCalendario(box); };
  const fe = box.querySelector('#cFe'); if (fe) fe.onchange = () => { if (fe.value) { CAL.ref = lunes(deIso(fe.value)); vCalendario(box); } };
  enlazarFiltros(box, () => vCalendario(box));
  box.querySelectorAll('.pv-gb[data-t]').forEach(el => el.onclick = () => {
    const t = TAR.find(x => x.id === el.dataset.t), s = el.dataset.s, o = ocurrencias(t).find(x => x.s === s);
    const bg = modal(`${esc(t.eq)} · semana del ${corto(o.ef)}`, `<div class="pv-eq" style="margin:0">${itemHtml(o, true)}</div>`, '<button class="btn" data-x>Cerrar</button>', 760);
    enlazarAcciones(bg, () => { bg.remove(); pintar(); });
  });
}

// ---------- vista equipos ----------
function vEquipos(box) {
  const g = new Map();
  TAR.filter(pasaFiltro).forEach(t => { if (!g.has(t.eq)) g.set(t.eq, []); g.get(t.eq).push(t); });
  box.innerHTML = `${panel(filtrosHtml())}<div class="pv-eqs">${[...g.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([cod, ts]) => {
    const oc = ts.flatMap(ocurrencias).filter(o => o.t.frec !== 'S');
    const prox = oc.filter(o => o.est === 'pendiente').sort((a, b) => a.ef.localeCompare(b.ef))[0];
    return `<button class="pv-ec" data-eq="${esc(cod)}"><b>${esc(cod)}</b><h4>${esc(ts[0].eqDesc)}</h4>
      <div class="n"><div><strong>${ts.length}</strong>rutinas</div><div><strong>${oc.filter(o => o.est === 'hecho').length}</strong>ejecutadas</div><div><strong style="color:${oc.some(o => o.est === 'atrasada') ? '#ff6b6b' : 'inherit'}">${oc.filter(o => o.est === 'atrasada').length}</strong>atrasadas</div>
      <div><strong style="font-size:14px">${prox ? corto(prox.ef) : '—'}</strong>próxima</div></div></button>`;
  }).join('')}</div>`;
  enlazarFiltros(box, () => vEquipos(box));
  box.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => detalleEquipo(b.dataset.eq));
}
function detalleEquipo(cod) {
  const ts = TAR.filter(t => t.eq === cod).sort((a, b) => ORD_F.indexOf(a.frec) - ORD_F.indexOf(b.frec) || a.rutina.localeCompare(b.rutina));
  const t0 = ts[0];
  const bgD = modal(`${esc(cod)} · ${esc(t0.eqDesc)}`, `<div class="muted" style="font-size:13px;margin-bottom:10px">${esc(sisNom(t0.sistema))} · ${esc(t0.tipoNombre || '')} · Criticidad ${esc(t0.crit || '—')}</div>
    <div style="overflow-x:auto"><table class="pv-tbl"><thead><tr><th>Rutina</th><th>Tarea</th><th>Frecuencia</th><th>Semanas</th></tr></thead><tbody>${ts.map(t => {
      const oc = ocurrencias(t);
      const chips = t.frec === 'D' ? `<span class="muted">Por turno · ${esc(t.reg || 'formato')}</span>` : t.frec === 'S' ? `<span class="muted">Todas las semanas · ${oc.filter(o => o.est === 'hecho').length} ejecutadas</span>`
        : oc.map(o => `<span class="pv-st" style="color:${EST[o.est].hex};background:${EST[o.est].hex}1f;margin:0 4px 4px 0">${corto(o.ef)}</span>`).join('') || '<span class="muted">—</span>';
      return `<tr><td class="mono" style="white-space:nowrap">${esc(t.rutina)}${t.origen === 'manual' ? '<br><span class="pv-man" style="margin:4px 0 0">PROPIA</span>' : ''}${gestiona() ? `<br><button class="btn" data-ed="${t.id}" style="height:30px;padding:0 8px;margin-top:6px;font-size:12px">${IC.edit}Editar</button>` : ''}</td><td>${esc(t.tarea)}<div class="muted" style="font-size:12px;margin-top:3px">${esc(respTxt(t))} · ${esc(t.cond)}</div></td><td style="white-space:nowrap">${FREC[t.frec].l}${t.horas ? `<div class="muted" style="font-size:12px">o ${t.horas.toLocaleString('es-PE')} h</div>` : ''}</td><td>${chips}${t.proximo ? `<div class="muted" style="font-size:12px">Próxima: ${esc(t.proximo)}</div>` : ''}${t.conjunto ? `<div class="muted" style="font-size:12px">En la parada de ${esc(t.conjunto)}</div>` : ''}</td></tr>`;
    }).join('')}</tbody></table></div>`, `${gestiona() ? `<button class="btn" id="pvAddEq" style="margin-right:auto">${IC.mas}Agregar actividad a este equipo</button>` : ''}<button class="btn" data-x>Cerrar</button>`, 980);
  bgD.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { bgD.remove(); editarActividad(TAR.find(t => t.id === b.dataset.ed)); });
  const ad = bgD.querySelector('#pvAddEq'); if (ad) ad.onclick = () => { bgD.remove(); editarActividad(null, cod); };
}

// ---------- actividades: nueva / editar / baja ----------
const finPlan = () => masSem(CFG.inicio, 51);
// semanas (lunes) desde una fecha según la frecuencia, hasta el fin del plan
function generarSemanas(fecha, frec) {
  const fin = finPlan(), out = [];
  if (frec === 'U') return [lunes(deIso(fecha))].filter(s => s <= fin);
  if (frec === 'S') { for (let s = lunes(deIso(fecha)); s <= fin; s = masSem(s, 1)) out.push(s); return out; }
  const n = MESES_F[frec], d0 = deIso(fecha);
  for (let k = 0; k < 60; k++) {
    const d = new Date(d0.getFullYear(), d0.getMonth() + k * n, Math.min(d0.getDate(), 28));
    const s = lunes(d); if (s > fin) break; out.push(s);
  }
  return [...new Set(out)];
}
let EQS = null;
async function equiposBase() { if (!EQS) EQS = await listarEquipos(); return EQS; }

async function editarActividad(t, codIni = '') {
  const nueva = !t;
  let eqs = [];
  try { eqs = await equiposBase(); } catch (e) { return toast('No se pudo leer la base de equipos: ' + (e.code || e.message), 'err'); }
  const B = CFG.biblioteca || {};
  const prox = t ? ocurrencias(t).filter(o => o.est === 'pendiente' || o.est === 'atrasada').map(o => o.ef).sort()[0] : '';
  const v = t || { eq: codIni, tarea: '', frec: 'M', resp: { 'Frigorista': 1 }, cond: 'Operando', mat: '', reg: 'Orden de trabajo' };
  const filasResp = (r) => Object.entries(r).map(([k, h]) => `<div class="pv-rr"><select class="field" data-rk>${ROLES.map(x => `<option ${x === k ? 'selected' : ''}>${x}</option>`).join('')}</select><input class="field" data-rh inputmode="decimal" value="${String(h).replace('.', ',')}" placeholder="HH"><button type="button" class="btn btn-icon" data-rq aria-label="Quitar">${IC.no}</button></div>`).join('');
  const bg = modal(nueva ? 'Nueva actividad' : `Editar ${esc(t.rutina)} · ${esc(t.eq)}`, `
    <div style="display:grid;gap:12px">
      ${nueva ? `<div><label class="label" for="aEq">Equipo</label><input class="field" id="aEq" list="aEqL" value="${esc(codIni ? `${codIni} · ${eqs.find(e => e.codigo === codIni)?.descripcion || ''}` : '')}" placeholder="Código o descripción" autocomplete="off">
        <datalist id="aEqL">${eqs.map(e => `<option value="${esc(e.codigo)} · ${esc(e.descripcion)}">`).join('')}</datalist></div>
      <div><label class="label" for="aRut">Partir de una rutina de la biblioteca (opcional)</label><select class="field" id="aRut"><option value="">Actividad propia</option>${Object.values(B).map(b => `<optgroup label="${esc(b.nombre)}">${b.rutinas.filter(r => r.frec !== 'D').map(r => `<option value="${esc(r.cod)}">${esc(r.cod)} · ${esc(r.tarea.slice(0, 70))}${r.tarea.length > 70 ? '…' : ''}</option>`).join('')}</optgroup>`).join('')}</select></div>` : ''}
      <div><label class="label" for="aTar">Actividad</label><textarea class="field" id="aTar" rows="3" style="height:auto;padding:12px 14px;line-height:1.5" placeholder="Qué se hace, en concreto">${esc(v.tarea)}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><label class="label" for="aFr">Frecuencia</label><select class="field" id="aFr">${['U', 'S', 'M', 'TRI', 'SEM', 'A'].map(k => `<option value="${k}" ${k === v.frec ? 'selected' : ''}>${FREC[k].l}</option>`).join('')}</select></div>
        <div><label class="label" for="aFe">${nueva ? 'Primera fecha' : 'Próxima fecha'}</label><input class="field" type="date" id="aFe" value="${prox || (HOY < CFG.inicio ? CFG.inicio : HOY)}"></div>
      </div>
      <div><span class="label">Responsables y horas-hombre</span><div id="aRs">${filasResp(v.resp)}</div><button type="button" class="btn" id="aRAdd" style="height:36px;font-size:13px">${IC.mas}Responsable</button></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><label class="label" for="aCo">Condición del equipo</label><select class="field" id="aCo">${CONDS.map(c => `<option ${c === v.cond ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div><label class="label" for="aRe">Registro</label><input class="field" id="aRe" value="${esc(v.reg || '')}"></div>
      </div>
      <div><label class="label" for="aMa">Materiales / repuestos (opcional)</label><input class="field" id="aMa" value="${esc(v.mat || '')}"></div>
      <div class="muted" id="aPrev" style="font-size:12.5px;line-height:1.5"></div>
    </div>`,
    `${!nueva ? `<button class="btn btn-danger" id="aDel" style="margin-right:auto">${Object.keys(t.ejec || {}).length ? 'Dar de baja' : 'Eliminar'}</button>` : ''}<button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="aOk">${nueva ? 'Agregar al plan' : 'Guardar cambios'}</button>`, 720);
  const $ = (q) => bg.querySelector(q);
  const enlazarResp = () => bg.querySelectorAll('[data-rq]').forEach(b => b.onclick = () => { if (bg.querySelectorAll('.pv-rr').length > 1) b.closest('.pv-rr').remove(); });
  enlazarResp();
  $('#aRAdd').onclick = () => { $('#aRs').insertAdjacentHTML('beforeend', filasResp({ 'Mecánico': 1 })); enlazarResp(); };
  const prev = () => { const f = $('#aFe').value, fr = $('#aFr').value; if (!f) { $('#aPrev').textContent = ''; return; }
    const ss = generarSemanas(f, fr); $('#aPrev').textContent = ss.length ? `Se programa en ${ss.length} semana${ss.length === 1 ? '' : 's'}: ${ss.slice(0, 8).map(corto).join(', ')}${ss.length > 8 ? '…' : ''} (hasta el fin del plan, ${corto(finPlan())}).` : 'La fecha está fuera del periodo del plan.'; };
  $('#aFe').oninput = prev; $('#aFr').onchange = prev; prev();
  if ($('#aRut')) $('#aRut').onchange = () => {
    const r = Object.values(B).flatMap(b => b.rutinas).find(x => x.cod === $('#aRut').value); if (!r) return;
    $('#aTar').value = r.tarea; $('#aFr').value = r.frec; $('#aCo').value = CONDS.includes(r.cond) ? r.cond : 'Operando'; $('#aRe').value = r.reg || ''; $('#aMa').value = r.mat || '';
    $('#aRs').innerHTML = filasResp(r.resp); enlazarResp(); prev();
  };
  if ($('#aDel')) $('#aDel').onclick = async () => {
    const conHist = Object.keys(t.ejec || {}).length;
    if (!confirm(conHist ? 'Se retiran las semanas futuras; las ejecuciones registradas se conservan. ¿Continuar?' : '¿Eliminar esta actividad del plan?')) return;
    try {
      if (conHist) { const semanas = (t.semanas || []).filter(s => s < HOY || (t.ejec || {})[s]); await updateDoc(doc(colTar(), t.id), { semanas, baja: { fecha: hoyIso(), por: usuario() } }); Object.assign(t, { semanas }); }
      else { await writeBatch(db).delete(doc(colTar(), t.id)).commit(); TAR = TAR.filter(x => x !== t); }
      bg.remove(); toast(conHist ? 'Actividad dada de baja.' : 'Actividad eliminada.'); pintar();
    } catch (e) { toast('No se pudo: ' + (e.code || e.message), 'err'); }
  };
  $('#aOk').onclick = async () => {
    const tarea = $('#aTar').value.trim(), frec = $('#aFr').value, fecha = $('#aFe').value;
    const resp = {}; let malo = false;
    bg.querySelectorAll('.pv-rr').forEach(r => { const k = r.querySelector('[data-rk]').value, h = Number(r.querySelector('[data-rh]').value.replace(',', '.')); if (!(h > 0)) malo = true; resp[k] = (resp[k] || 0) + h; });
    if (!tarea) return toast('Describa la actividad', 'err');
    if (!fecha) return toast('Indique la fecha', 'err');
    if (malo) return toast('Indique las horas-hombre de cada responsable', 'err');
    const nuevas = generarSemanas(fecha, frec);
    if (!nuevas.length) return toast('La fecha está fuera del periodo del plan', 'err');
    const comun = { tarea, frec, resp, cond: $('#aCo').value, reg: $('#aRe').value.trim(), mat: $('#aMa').value.trim() };
    try {
      if (nueva) {
        const txt = $('#aEq').value.trim(), cod = txt.split(' · ')[0].trim().toUpperCase();
        const e = eqs.find(x => x.codigo === cod); if (!e) return toast('Elija un equipo de la lista', 'err');
        const rut = $('#aRut').value;
        const nPropias = TAR.filter(x => x.eq === e.codigo && x.origen === 'manual').length + 1;
        const tipo = rut ? Object.entries(B).find(([, b]) => b.rutinas.some(r => r.cod === rut))?.[0] || '' : '';
        const d = { ...comun, eq: e.codigo, eqId: e.id, eqDesc: e.descripcion || '', sistema: e.sistema ?? '', crit: e.criticidad || '', ubicacion: e.ubicacion || '',
          tipo, tipoNombre: tipo ? B[tipo].nombre : (e.tipo || ''), rutina: rut || `P-${String(nPropias).padStart(2, '0')}`, horas: null,
          semanas: nuevas, porHoras: false, conjunto: '', proximo: '', origen: 'manual', creado: { fecha: hoyIso(), por: usuario() }, ejec: {} };
        const ref = doc(colTar()); await setDoc(ref, d); TAR.push({ id: ref.id, ...d });
        toast(`Actividad agregada: ${nuevas.length} semana${nuevas.length === 1 ? '' : 's'} programada${nuevas.length === 1 ? '' : 's'}.`);
      } else {
        const desde = lunes(deIso(fecha)) < HOY ? lunes(deIso(fecha)) : HOY;
        const semanas = [...new Set([...(t.semanas || []).filter(s => s < desde || (t.ejec || {})[s]), ...nuevas])].sort();
        await updateDoc(doc(colTar(), t.id), { ...comun, semanas, editado: { fecha: hoyIso(), por: usuario() } });
        Object.assign(t, comun, { semanas });
        toast('Actividad actualizada.');
      }
      bg.remove(); pintar();
    } catch (e) { toast('No se pudo guardar: ' + (e.code || e.message), 'err'); }
  };
}

// ---------- vista rutinas ----------
function vRutinas(box) {
  const B = CFG.biblioteca || {};
  const usados = new Map(); TAR.forEach(t => { usados.set(t.tipo, (usados.get(t.tipo) || new Set()).add(t.eq)); });
  box.innerHTML = `<p class="muted" style="font-size:13px;margin:0 0 12px">Rutinas estándar por tipo de equipo. Las diarias se registran en los formatos de Registro de formatos; el resto se programa aquí.</p>
    ${Object.entries(B).map(([k, b]) => `<details class="pp-card pv-rt" style="padding:0;margin-bottom:10px"><summary>${esc(b.nombre)} <small>${b.rutinas.length} rutinas · ${(usados.get(k) || new Set()).size} equipos</small></summary>
      <div style="overflow-x:auto;padding:0 6px 8px"><table class="pv-tbl"><thead><tr><th>Código</th><th>Tarea</th><th>Frecuencia</th><th>Responsable</th><th>Condición</th><th>Registro</th></tr></thead><tbody>${b.rutinas.map(r => `<tr>
        <td class="mono" style="white-space:nowrap"><span class="pv-f" style="display:inline-flex;width:26px;height:22px;font-size:10px;margin-right:6px;background:${FREC[r.frec].hex}">${FREC[r.frec].c}</span>${esc(r.cod)}</td>
        <td>${esc(r.tarea)}${r.mat ? `<div class="muted" style="font-size:12px;margin-top:3px">${esc(r.mat)}</div>` : ''}</td><td style="white-space:nowrap">${FREC[r.frec].l}${r.horas ? ` o ${r.horas.toLocaleString('es-PE')} h` : ''}</td>
        <td style="font-size:12.5px">${esc(respTxt(r))}</td><td style="font-size:12.5px">${esc(r.cond)}</td><td style="font-size:12.5px">${esc(r.reg || '')}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}`;
}

// ---------- vista carga ----------
function vCarga(box) {
  const semanas = Array.from({ length: 52 }, (_, i) => masSem(CFG.inicio, i));
  const mesesK = [...new Set(semanas.map(s => s.slice(0, 7)))];
  const cap = CFG.capacidad || {};
  const carga = {};
  TAR.forEach(t => ocurrencias(t).forEach(o => {
    const k = o.ef.slice(0, 7); if (!mesesK.includes(k)) return;
    Object.entries(t.resp || {}).forEach(([r, v]) => { carga[r] = carga[r] || {}; carga[r][k] = (carga[r][k] || 0) + v; });
  }));
  box.innerHTML = `<p class="muted" style="font-size:13px;margin:0 0 12px">Horas-hombre programadas por mes frente a la capacidad disponible para preventivo (incluye reprogramaciones). La línea roja es la capacidad.</p>
    <div class="pv-car">${ROLES.filter(r => carga[r]).map(r => {
      const vals = mesesK.map(k => carga[r][k] || 0), c = cap[r]?.hhMes, max = Math.max(...vals, c || 0, 1);
      const tot = vals.reduce((a, b) => a + b, 0);
      return `<div class="pp-card"><div class="pp-ch"><h3>${esc(r)}</h3><span class="sub">${c ? `Capacidad ${c} HH/mes · ${cap[r].personas} × ${Math.round(cap[r].pct * 100)} % de la jornada · uso promedio ${Math.round(tot / 12 / c * 100)} %` : 'Servicio de terceros'} · ${tot.toFixed(0)} HH en el periodo</span></div>
        <div class="pv-cap"><div class="pv-bars">${vals.map(v => `<div class="${c && v > c ? 'sobre' : ''}" style="height:${(v / max * 100).toFixed(1)}%"><span>${v ? Math.round(v) : ''}</span></div>`).join('')}</div>
        ${c ? `<div class="ln" style="bottom:${(c / max * 90).toFixed(1)}px"></div>` : ''}</div>
        <div class="pv-mes">${mesesK.map(k => { const [y, m] = k.split('-'); return `<span>${MES[+m - 1]}-${y.slice(2)}</span>`; }).join('')}</div></div>`;
    }).join('')}</div>`;
}
