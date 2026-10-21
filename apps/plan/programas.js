// Plan de mantenimiento — módulo Programas de trabajo
// Un programa agrupa actividades con fechas y avance: parada de planta, mantenimiento programado, levantamiento de auditoría, proyecto…
// Lista de programas → detalle con Resumen (KPI + curva S), Línea de tiempo, Actividades, Evidencias y Costos.
import { PROGRAMA_HIELO, ACTIVIDADES_HIELO, COSTOS_HIELO } from './semilla.js';
import { pdfActividad, pdfCompleto } from './pdf.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FASES = ['Obra civil', 'Desmontaje', 'Mantenimiento', 'Pintado', 'Montaje', 'Otros'];
const PLANTAS = ['Planta de hielo', 'Congelado', 'Refrigeración', 'Calderos', 'Ósmosis', 'Eléctrico', 'Infraestructura', 'General de Mantenimiento'];
const ETAPAS = ['Antes', 'Durante', 'Después'];
export const TIPOS = [
  { id: 'parada', label: 'Parada de planta', c: '#3bb4e5' },
  { id: 'mprog', label: 'Mantenimiento programado', c: '#2ec4a6' },
  { id: 'auditoria', label: 'Auditoría', c: '#f5b54a' },
  { id: 'proyecto', label: 'Proyecto de mejora', c: '#a9b4ff' },
  { id: 'otro', label: 'Otro', c: '#8b9bb0' }
];
const tipoDe = (id) => TIPOS.find(t => t.id === id) || TIPOS[TIPOS.length - 1];
const TIPOS_COSTO = ['Servicio externo', 'Materiales y repuestos', 'Mano de obra propia', 'Alquiler de equipos', 'Otros'];
const EST_COSTO = {
  presupuestado: { label: 'Presupuestado', hex: '#8b9bb0' },
  comprometido: { label: 'Comprometido', hex: '#f5b54a' },
  ejecutado: { label: 'Ejecutado', hex: '#2ec4a6' }
};
const sol = (n) => 'S/ ' + (+n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ETC = { 'Antes': 'var(--pp-pro)', 'Durante': 'var(--pp-cur)', 'Después': 'var(--pp-fin)' };
const ST = {
  fin: { label: 'Finalizado', c: 'var(--pp-fin)', hex: '#2ec4a6' },
  cur: { label: 'En curso', c: 'var(--pp-cur)', hex: '#4aa3ff' },
  atr: { label: 'Atrasado', c: 'var(--pp-atr)', hex: '#ff6b6b' },
  pro: { label: 'Programado', c: 'var(--pp-pro)', hex: '#f5b54a' },
  def: { label: 'Por definir', c: 'var(--pp-def)', hex: '#8b9bb0' }
};
const I = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const CAM = I('M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 13);
const TRASH = I('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6', 15);
const BACK = I('M19 12H5M11 6l-6 6 6 6', 15);

const DAY = 864e5;
const D = (s) => { if (!s) return null; const [a, b, c] = s.split('-').map(Number); return new Date(a, b - 1, c); };
const HOY = (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); })();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmt = (d) => d ? d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Por definir';
const fmtS = (d) => d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '');
const dias = (a, b) => Math.round((b - a) / DAY) + 1;
const mesA = (s) => { const d = D(s); if (!d) return ''; const m = d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', ''); return m.charAt(0).toUpperCase() + m.slice(1); };

export function est(t) {
  if (+t.av >= 100) return 'fin';
  const i = D(t.ini), f = D(t.fin);
  if (f && f < HOY) return 'atr';
  if (i && i <= HOY) return 'cur';
  if (i) return 'pro';
  return 'def';
}
const reprog = (t) => (t.fin_b !== undefined && (t.fin_b || '') !== (t.fin || '') && t.fin_b) || (t.ini_b !== undefined && (t.ini_b || '') !== (t.ini || '') && t.ini_b);
const stTag = (k) => `<span class="pp-st" style="color:${ST[k].c};background:color-mix(in srgb,${ST[k].hex} 16%,transparent)">${ST[k].label}</span>`;

let CTX = null, API = null, PAR = [], P = null, A = [], E = [], C = [], FT = 'all', subs = [], TAB = 'dash', F = { est: 'all', resp: 'all' }, selA = null, evQ = '', chS = null, chB = null, lbI = 0, vivo = false;
const $ = (id) => document.getElementById(id);
const gestor = () => CTX && ['admin', 'supervisor'].includes(CTX.rol);
const escribe = () => CTX && CTX.puedeEscribir && P && P.estado !== 'cerrada';
const verCostos = () => CTX && CTX.rol !== 'operador';
const nEv = (aid) => E.filter(e => e.aid === aid).length;
const evDe = (aid) => E.filter(e => e.aid === aid).sort((a, b) => ETAPAS.indexOf(a.etapa) - ETAPAS.indexOf(b.etapa) || (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : (a.ord || 0) - (b.ord || 0)));
const toast = (m, t) => CTX.toast(m, t);

export function desmontar() {
  subs.forEach(u => { try { u(); } catch {} }); subs = [];
  if (chS) { chS.destroy(); chS = null; } if (chB) { chB.destroy(); chB = null; }
  document.querySelectorAll('.pp-lb,.pp-busy').forEach(x => x.remove());
  vivo = false;
}

export async function montar(ctx, api) {
  CTX = ctx; API = api; vivo = true;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="pp-lb" id="ppLb"><button class="x" id="ppLbX">×</button><button class="nav pv" id="ppLbP">‹</button><img id="ppLbImg" alt=""><div class="cap" id="ppLbCap"></div><button class="nav nx" id="ppLbN">›</button></div>
    <div class="pp-busy" id="ppBusy"><div class="spinner"></div><span></span></div>`);
  $('ppLbX').onclick = () => $('ppLb').classList.remove('on');
  $('ppLb').onclick = (e) => { if (e.target.id === 'ppLb') $('ppLb').classList.remove('on'); };
  $('ppLbP').onclick = (e) => { e.stopPropagation(); lbI--; lbShow(); };
  $('ppLbN').onclick = (e) => { e.stopPropagation(); lbI++; lbShow(); };
  const pid = new URLSearchParams(location.search).get('p');
  if (pid) await abrir(pid); else await lista();
}
document.addEventListener('keydown', (e) => {
  const lb = $('ppLb'); if (!lb || !lb.classList.contains('on')) return;
  if (e.key === 'Escape') lb.classList.remove('on');
  if (e.key === 'ArrowLeft') { lbI--; lbShow(); }
  if (e.key === 'ArrowRight') { lbI++; lbShow(); }
});
function busy(on, m) { const b = $('ppBusy'); if (!b) return; b.querySelector('span').textContent = m || ''; b.classList.toggle('on', on); }
function url(pid) { history.replaceState(null, '', location.pathname + (pid ? '?p=' + encodeURIComponent(pid) : '') + '#programas'); }

/* ================= LISTA DE PROGRAMAS ================= */
async function lista() {
  subs.forEach(u => u()); subs = []; P = null; url(null);
  CTX.main.innerHTML = `<div class="pp"><div class="pp-top"><div><div class="eyebrow">Plan de mantenimiento</div><h1 class="h-display">Programas de trabajo</h1>
    <p class="muted" style="margin:10px 0 0;font-size:14px">Paradas de planta, mantenimientos programados, levantamiento de auditorías y proyectos con un mismo formato de seguimiento.</p></div>
    <div id="ppTopAcc"></div></div><div class="pp-tools" id="ppTipos"></div><div id="ppLista"><div class="skel" style="height:140px"></div></div></div>`;
  if (gestor() && API.migrarAnterior) {
    try { const m = await API.migrarAnterior(); for (const pid of m) await costosSemilla(pid); } catch (e) { console.warn(e); }
  }
  try { PAR = await API.listarProgramas(); } catch (e) { $('ppLista').innerHTML = `<div class="alert err">No se pudo leer la información: ${esc(e.message)}</div>`; return; }
  const res = await Promise.all(PAR.map(async p => { try { return await API.actividades(p.id); } catch { return []; } }));
  if (!vivo) return;
  if (gestor()) $('ppTopAcc').innerHTML = `<button class="btn pp-grad" id="ppNueva">+ Nuevo programa</button>`;
  if ($('ppNueva')) $('ppNueva').onclick = () => modalPrograma();
  if (!PAR.length) {
    $('ppTipos').innerHTML = '';
    $('ppLista').innerHTML = `<div class="glass pp-vacio"><h2>Aún no hay programas registrados</h2>
      <p class="muted" style="margin:0 0 22px">Cada programa reúne sus actividades, avance, curva S, evidencias fotográficas y costos.</p>
      ${gestor() ? `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn pp-grad" id="ppSem">Cargar Parada de Planta de Hielo 2026</button><button class="btn" id="ppNueva2">Nuevo programa</button></div>` : ''}</div>`;
    if ($('ppSem')) $('ppSem').onclick = cargarSemilla;
    if ($('ppNueva2')) $('ppNueva2').onclick = () => modalPrograma();
    return;
  }
  const pintar = () => {
    const usados = TIPOS.filter(t => PAR.some(p => (p.tipo || 'parada') === t.id));
    $('ppTipos').innerHTML = [{ id: 'all', label: 'Todos' }, ...usados].map(t => `<button class="pp-chip ${FT === t.id ? 'on' : ''}" data-t="${t.id}">${t.label} <span style="opacity:.6">${t.id === 'all' ? PAR.length : PAR.filter(p => (p.tipo || 'parada') === t.id).length}</span></button>`).join('');
    document.querySelectorAll('#ppTipos [data-t]').forEach(b => b.onclick = () => { FT = b.dataset.t; pintar(); });
    const orden = PAR.map((p, i) => ({ p, a: res[i] })).filter(({ p }) => FT === 'all' || (p.tipo || 'parada') === FT)
      .sort((x, y) => (x.p.estado === 'cerrada') - (y.p.estado === 'cerrada') || String(y.p.desde || '').localeCompare(String(x.p.desde || '')));
    $('ppLista').innerHTML = orden.length ? `<div class="pp-paradas">${orden.map(({ p, a }, i) => {
      const n = a.length, av = n ? a.reduce((s, t) => s + (+t.av || 0), 0) / n : 0, fin = a.filter(t => est(t) === 'fin').length;
      const cer = p.estado === 'cerrada', tp = tipoDe(p.tipo || 'parada');
      return `<button class="pp-card pp-pc rise d${Math.min(i + 1, 5)}" data-p="${esc(p.id)}" style="--tc:${tp.c}">
        <svg class="pp-ring" viewBox="0 0 100 100" style="width:72px;height:72px"><circle class="bgc" cx="50" cy="50" r="42"/><circle class="fgc" cx="50" cy="50" r="42" transform="rotate(-90 50 50)" stroke-dasharray="263.9" stroke-dashoffset="${263.9 * (1 - av / 100)}"/><text x="50" y="50">${av.toFixed(0)}%</text></svg>
        <div style="min-width:0;flex:1"><div class="tag" style="color:${tp.c}">${esc(tp.label)}${p.planta ? ' · ' + esc(p.planta) : ''}</div><h2>${esc(p.nombre)}</h2>
          <div class="meta">${p.desde || p.hasta ? `${esc(mesA(p.desde))} – ${esc(mesA(p.hasta))} ${p.hasta ? D(p.hasta).getFullYear() : ''} · ` : ''}${fin}/${n} actividades finalizadas</div>
          <div style="margin-top:8px">${cer ? '<span class="pill" style="background:rgba(255,255,255,.09);color:#DDE4EB">Cerrado</span>' : '<span class="pill" style="background:rgba(74,163,255,.16);color:#9fcbff">En ejecución</span>'}</div></div></button>`;
    }).join('')}</div>` : '<div class="pp-empty">Sin programas de este tipo.</div>';
    document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => abrir(b.dataset.p));
  };
  pintar();
}

async function cargarSemilla() {
  busy(true, 'Cargando programa…');
  try {
    const pid = await API.crearPrograma({ ...PROGRAMA_HIELO });
    const ids = await API.cargarActividades(pid, ACTIVIDADES_HIELO);
    for (const c of COSTOS_HIELO) { const k = ACTIVIDADES_HIELO.findIndex(a => a.n === c.n); if (k >= 0) { const { n, ...x } = c; await API.guardarCosto(pid, { ...x, aid: ids[k] }); } }
    await API.actualizarPrograma(pid, { lineaBase: { fecha: iso(HOY), por: CTX.perfil?.nombre || CTX.user?.email || '' } });
    busy(false); toast('Programa cargado'); abrir(pid);
  } catch (e) { busy(false); toast('No se pudo cargar: ' + e.message, 'err'); }
}
// Programa migrado de la versión anterior: agrega el costo cotizado si aún no tiene costos
async function costosSemilla(pid) {
  const [acts, cs] = await Promise.all([API.actividades(pid), API.costos(pid)]);
  if (cs.length || !acts.some(a => a.nom === ACTIVIDADES_HIELO[0].nom)) return;
  for (const c of COSTOS_HIELO) { const a = acts.find(x => +x.n === c.n); if (a) { const { n, ...x } = c; await API.guardarCosto(pid, { ...x, aid: a.id }); } }
}

function modalPrograma(p = null) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="max-width:640px"><div class="modal-h"><div class="h-display" style="font-size:20px">${p ? 'Editar programa' : 'Nuevo programa de trabajo'}</div><button class="btn btn-icon" data-x>×</button></div>
    <div class="modal-b"><div class="pp-fg">
      <div class="full"><label class="label">Nombre del programa</label><input class="field" id="mpNom" value="${esc(p?.nombre || '')}" placeholder="Ej.: Levantamiento de observaciones – Auditoría BRC 2026"></div>
      <div><label class="label">Tipo</label><select class="field" id="mpTip">${TIPOS.map(t => `<option value="${t.id}" ${t.id === (p?.tipo || 'parada') ? 'selected' : ''}>${t.label}</option>`).join('')}</select></div>
      <div><label class="label">Planta / área</label><select class="field" id="mpPla">${PLANTAS.map(x => `<option ${x === (p?.planta || '') ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
      <div class="full"><label class="label">Referencia (opcional)</label><input class="field" id="mpRef" value="${esc(p?.ref || '')}" placeholder="Informe de auditoría, acta, código de proyecto…"></div>
      <div><label class="label">Periodo desde</label><input type="date" class="field" id="mpDes" value="${esc(p?.desde || '')}"></div>
      <div><label class="label">Periodo hasta</label><input type="date" class="field" id="mpHas" value="${esc(p?.hasta || '')}"></div>
      ${p ? '' : `<div class="full"><label class="label">Actividades desde archivo (opcional)</label><input type="file" class="field" id="mpArc" accept=".json" style="padding-top:10px">
        <div class="pp-nota">Archivo .json exportado de un plan de trabajos (incluye actividades y fotos).</div></div>`}
    </div></div>
    <div class="modal-f"><button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="mpOk">${p ? 'Guardar' : 'Crear programa'}</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  bg.querySelector('#mpOk').onclick = async () => {
    const v = { nombre: bg.querySelector('#mpNom').value.trim(), tipo: bg.querySelector('#mpTip').value, planta: bg.querySelector('#mpPla').value, ref: bg.querySelector('#mpRef').value.trim(),
      desde: bg.querySelector('#mpDes').value, hasta: bg.querySelector('#mpHas').value };
    if (!v.nombre) { toast('Ingrese el nombre del programa', 'err'); return; }
    if (v.desde && v.hasta && v.hasta < v.desde) { toast('El periodo termina antes de iniciar', 'err'); return; }
    if (p) { await API.actualizarPrograma(p.id, v); bg.remove(); toast('Programa actualizado'); return; }
    const arc = bg.querySelector('#mpArc').files[0];
    let imp = null;
    if (arc) { try { imp = JSON.parse(await arc.text()); } catch { toast('Archivo no válido', 'err'); return; } }
    bg.remove(); busy(true, 'Creando programa…');
    try {
      const pid = await API.crearPrograma({ ...v, estado: 'activa' });
      if (imp) await importar(pid, imp);
      busy(false); toast('Programa creado'); abrir(pid);
    } catch (e) { busy(false); toast('No se pudo crear: ' + e.message, 'err'); }
  };
}

async function importar(pid, d) {
  const tareas = Array.isArray(d) ? d : (d.tareas || []);
  const evs = Array.isArray(d) ? [] : (d.evidencias || []);
  const ids = new Map();
  for (const t of tareas) {
    const a = { n: +t.id || +t.n || 0, nom: t.nom || '', fase: t.fase || 'Otros', resp: t.resp || '', ini: t.ini || '', fin: t.fin || '', ini_b: t.ini || '', fin_b: t.fin || '', av: +t.av || 0, obs: t.obs || '' };
    ids.set(t.id, await API.guardarActividad(pid, a));
  }
  let k = 0;
  for (const e of evs) {
    if (!ids.has(e.tid) || !e.data) continue;
    busy(true, `Subiendo fotos… ${++k}/${evs.length}`);
    const thumb = await reducirDataUrl(e.data, 360, .7);
    await API.agregarEvidencia(pid, { aid: ids.get(e.tid), etapa: e.etapa || 'Durante', fecha: e.fecha || iso(HOY), desc: e.desc || '', w: e.w || 0, h: e.h || 0, thumb, ord: e.ord || Date.now() }, e.data);
  }
}

/* ================= DETALLE DEL PROGRAMA ================= */
async function abrir(pid) {
  subs.forEach(u => u()); subs = [];
  url(pid); TAB = TAB || 'dash'; A = []; E = []; C = []; selA = null; P = null;
  CTX.main.innerHTML = `<div class="pp"><div class="skel" style="height:96px"></div></div>`;
  let primera = true;
  subs.push(API.escucharPrograma(pid, (p) => {
    if (!vivo) return;
    if (!p) { toast('El programa no existe', 'err'); lista(); return; }
    P = p;
    if (primera) { primera = false; marco(); suscribir(pid); } else { cabecera(); todo(); }
  }));
}
function suscribir(pid) {
  subs.push(API.escucharActividades(pid, (l) => { A = l; todo(); }));
  subs.push(API.escucharEvidencias(pid, (l) => { E = l; renderList(); renderEv(); }));
  if (verCostos()) subs.push(API.escucharCostos(pid, (l) => { C = l; renderCostos(); }));
}

function marco() {
  CTX.main.innerHTML = `<div class="pp">
    <button class="pp-back" id="ppVolver">${BACK} Programas de trabajo</button>
    <header class="pp-hdr" id="ppHdr"></header>
    <div id="ppAviso"></div>
    <nav class="pp-tabsbar">
      <button class="pp-tab" data-v="dash">Resumen</button><button class="pp-tab" data-v="gantt">Línea de tiempo</button>
      <button class="pp-tab" data-v="list">Actividades</button><button class="pp-tab" data-v="ev">Evidencias</button>${verCostos() ? '<button class="pp-tab" data-v="costos">Costos</button>' : ''}
      <span class="pp-sp"></span><span id="ppAcc" style="display:flex;gap:8px;flex-wrap:wrap"></span>
    </nav>
    <section class="pp-view" id="v-dash">
      <div id="ppVacio"></div>
      <div class="pp-kpis">
        <div class="pp-kpi main"><svg class="pp-ring" viewBox="0 0 100 100"><circle class="bgc" cx="50" cy="50" r="42"/><circle class="fgc" id="ppRing" cx="50" cy="50" r="42" transform="rotate(-90 50 50)" stroke-dasharray="263.9" stroke-dashoffset="263.9"/><text x="50" y="50" id="ppRingTx">0%</text></svg>
          <div><div class="l">Avance general</div><div class="s" id="kAvS"></div><div class="s" id="kSpi" style="margin-top:6px"></div></div></div>
        <div class="pp-kpi" style="--c:var(--pp-fin)"><div class="l">Finalizadas</div><div class="v" id="kFin">0</div><div class="s" id="kFinS"></div></div>
        <div class="pp-kpi" style="--c:var(--pp-cur)"><div class="l">En curso</div><div class="v" id="kCur">0</div><div class="s">Actividades activas</div></div>
        <div class="pp-kpi" style="--c:var(--pp-pro)"><div class="l">Programadas</div><div class="v" id="kPro">0</div><div class="s">Con fecha por iniciar</div></div>
        <div class="pp-kpi" style="--c:var(--pp-def)"><div class="l">Por definir</div><div class="v" id="kDef">0</div><div class="s">Fecha por programar</div></div>
        <div class="pp-kpi" style="--c:#a9b4ff"><div class="l">Días transcurridos</div><div class="v" id="kDias">0</div><div class="s" id="kDiasS"></div></div>
      </div>
      <div class="pp-g2">
        <div class="pp-card"><div class="pp-ch"><h3>Curva S — Avance programado vs. real</h3>
          <div class="pp-legend"><span><i style="background:#8b9bb0"></i>Programado</span><span><i style="background:var(--pp-fin)"></i>Real</span><span><i style="background:var(--pp-atr)"></i>Hoy</span></div></div>
          <div class="pp-chart"><canvas id="ppS"></canvas></div><div class="pp-foot" id="ppSNote"></div></div>
        <div class="pp-card"><div class="pp-ch"><h3>Avance por fase</h3></div><div id="ppFases"></div>
          <div class="pp-ch" style="margin-top:16px"><h3>Por responsable</h3></div><div class="pp-resp" id="ppResp"></div></div>
      </div>
      <div class="pp-g2">
        <div class="pp-card"><div class="pp-ch"><h3>Estado de actividades</h3><span class="sub" id="ppEstSub"></span></div>
          <div class="pp-donut"><div class="pp-dbox"><canvas id="ppB"></canvas><div class="pp-dc"><b id="ppDcN">0</b><span>actividades</span></div></div><div class="pp-dleg" id="ppDleg"></div></div></div>
        <div class="pp-card"><div class="pp-ch"><h3>Próximas actividades</h3><span class="sub">Siguientes 15 días</span></div><div class="pp-next" id="ppNext"></div></div>
      </div>
    </section>
    <section class="pp-view" id="v-gantt"><div class="pp-card"><div class="pp-ch"><h3>Línea de tiempo del programa</h3>
      <div class="pp-legend"><span><i style="background:var(--pp-fin)"></i>Finalizado</span><span><i style="background:var(--pp-cur)"></i>En curso</span><span><i style="background:var(--pp-pro)"></i>Programado</span><span><i style="background:transparent;border:1.5px dashed var(--pp-def)"></i>Por definir</span><span><i style="background:rgba(255,255,255,.55);height:3px;vertical-align:3px"></i>Línea base</span><span><i style="background:var(--pp-atr)"></i>Atrasado / Hoy</span></div></div>
      <div class="pp-gwrap"><div class="pp-gantt" id="ppGantt"></div></div></div></section>
    <section class="pp-view" id="v-list"><div class="pp-card"><div class="pp-tools" id="ppFil"></div><div class="pp-tblw"><table class="pp-tbl">
      <thead><tr><th>#</th><th>Actividad</th><th>Fase</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Días</th><th>Avance</th><th>Evid.</th><th>Estado</th></tr></thead><tbody id="ppTb"></tbody></table></div></div></section>
    <section class="pp-view" id="v-ev">
      <div class="pp-evtop"><span class="info" id="ppEvInfo"></span><span class="pp-sp"></span><button class="btn pp-btn pp-grad" id="ppPdfAll">Descargar informe completo (PDF)</button></div>
      <div class="pp-evgrid">
        <aside class="pp-card pp-evlist"><div class="pp-ch"><h3>Actividades</h3><span class="sub" id="ppEvTot"></span></div>
          <input class="field" id="ppEvQ" placeholder="Buscar actividad…" style="height:40px;font-size:13.5px"><div class="pp-evitems" id="ppEvItems"></div></aside>
        <div><div class="pp-card pp-evhead" id="ppEvHead"></div>
          <div class="pp-card"><div class="pp-ch"><h3>Registro fotográfico</h3><div style="display:flex;gap:8px;flex-wrap:wrap" id="ppEvAcc"></div></div>
            <input type="file" id="ppFile" accept="image/*" multiple hidden>
            <div id="ppDropW"></div><div class="pp-gal" id="ppGal"></div></div></div>
      </div>
    </section>
    <section class="pp-view" id="v-costos">
      <div class="pp-kpis pp-kc">
        <div class="pp-kpi" style="--c:#8b9bb0"><div class="l">Presupuesto</div><div class="v pp-money" id="cPre">S/ 0</div><div class="s" id="cPreS"></div></div>
        <div class="pp-kpi" style="--c:var(--pp-pro)"><div class="l">Comprometido</div><div class="v pp-money" id="cCom">S/ 0</div><div class="s" id="cComS"></div></div>
        <div class="pp-kpi" style="--c:var(--pp-fin)"><div class="l">Ejecutado</div><div class="v pp-money" id="cEje">S/ 0</div><div class="s" id="cEjeS"></div></div>
        <div class="pp-kpi" style="--c:var(--pp-acc)"><div class="l">Por comprometer</div><div class="v pp-money" id="cSal">S/ 0</div><div class="s">Presupuesto sin orden emitida</div></div>
      </div>
      <div class="pp-g2">
        <div class="pp-card"><div class="pp-ch"><h3>Costo por actividad</h3><span class="sub">Soles sin IGV</span></div><div id="cAct"></div></div>
        <div class="pp-card"><div class="pp-ch"><h3>Costo por tipo</h3></div><div id="cTipo"></div>
          <div class="pp-ch" style="margin-top:16px"><h3>Por estado</h3></div><div id="cEst"></div></div>
      </div>
      <div class="pp-card" style="margin-top:12px"><div class="pp-ch"><h3>Detalle de costos</h3><span id="cAcc"></span></div>
        <div class="pp-tblw"><table class="pp-tbl"><thead><tr><th>#</th><th>Actividad</th><th>Concepto</th><th>Tipo</th><th>Proveedor</th><th>Documento</th><th>Estado</th><th style="text-align:right">Monto</th></tr></thead>
        <tbody id="cTb"></tbody><tfoot id="cTf"></tfoot></table></div>
        <div class="pp-foot">Montos en soles sin IGV. Presupuestado: cotización aprobada · Comprometido: orden de compra o servicio emitida · Ejecutado: trabajo conforme o material recibido.</div></div>
    </section></div>`;
  $('ppVolver').onclick = lista;
  document.querySelectorAll('.pp-tab').forEach(b => b.onclick = () => { TAB = b.dataset.v; pestaña(); });
  $('ppEvQ').oninput = (e) => { evQ = e.target.value; renderEv(); };
  $('ppFile').onchange = (e) => { subir([...e.target.files]); e.target.value = ''; };
  $('ppPdfAll').onclick = async () => {
    if (!E.length) { toast('Aún no hay fotos registradas', 'err'); return; }
    busy(true, 'Generando informe…');
    try { await pdfCompleto(ctxPdf()); } catch (e) { toast(e.message, 'err'); } finally { busy(false); }
  };
  cabecera(); pestaña();
}
function pestaña() {
  document.querySelectorAll('.pp-tab').forEach(x => x.classList.toggle('on', x.dataset.v === TAB));
  document.querySelectorAll('.pp-view').forEach(v => v.classList.toggle('on', v.id === 'v-' + TAB));
  if (TAB === 'dash') renderDash();
  if (TAB === 'gantt') renderGantt();
  if (TAB === 'costos') renderCostos();
}
function todo() { if (!$('ppHdr')) return; renderDash(); renderGantt(); renderList(); renderEv(); renderCostos(); }

function cabecera() {
  const starts = A.map(t => D(t.ini)).filter(Boolean), d0 = starts.length ? new Date(Math.min(...starts)) : null;
  const per = P.desde || P.hasta ? `${mesA(P.desde)} – ${mesA(P.hasta)} ${P.hasta ? D(P.hasta).getFullYear() : ''}` : 'Por definir';
  $('ppHdr').innerHTML = `<div class="pp-logo"><img src="./logo.png" alt="Santa Mónica Fishing"></div>
    <div class="pp-ttl"><div class="tag" style="color:${tipoDe(P.tipo || 'parada').c}">Programa de trabajo · ${esc(tipoDe(P.tipo || 'parada').label)}</div><h1>${esc(P.nombre)}</h1><p>${esc(P.planta || '')}${P.ref ? ' · ' + esc(P.ref) : ''} · Departamento de Mantenimiento · Planta Paita</p></div>
    <div class="pp-meta"><div class="pp-pill">Periodo del plan<b>${esc(per)}</b></div><div class="pp-pill">Inicio<b>${d0 ? fmt(d0) : '—'}</b></div>
      <div class="pp-pill">Fecha de corte<b>${fmt(HOY)}</b></div><div class="pp-pill">Línea base<b>${P.lineaBase?.fecha ? fmt(D(P.lineaBase.fecha)) : 'Sin fijar'}</b></div></div>`;
  $('ppAviso').innerHTML = P.estado === 'cerrada' ? `<div class="alert warn pp-cerrada">Programa cerrado el ${P.cierre ? fmt(D(P.cierre)) : ''}. La información queda en solo lectura.</div>` : '';
  const acc = [];
  if (gestor() && P.estado !== 'cerrada') acc.push(`<button class="btn pp-btn" id="ppLB">Fijar línea base</button>`, `<button class="btn pp-btn" id="ppEdit">Editar programa</button>`, `<button class="btn pp-btn" id="ppCerrar">Cerrar programa</button>`);
  if (gestor() && P.estado === 'cerrada') acc.push(`<button class="btn pp-btn" id="ppReab">Reabrir programa</button>`);
  $('ppAcc').innerHTML = acc.join('');
  if ($('ppLB')) $('ppLB').onclick = () => confirmar('Fijar línea base', 'Se guardará el programa actual (fechas de inicio y fin de cada actividad) como línea base. Los cambios de fecha posteriores se mostrarán como reprogramaciones.', 'Fijar línea base', async () => {
    await API.fijarLineaBase(P.id, A, iso(HOY)); toast('Línea base fijada');
  });
  if ($('ppEdit')) $('ppEdit').onclick = () => modalPrograma(P);
  if ($('ppCerrar')) $('ppCerrar').onclick = () => confirmar('Cerrar programa', 'El programa quedará archivado en solo lectura. Podrá reabrirse si es necesario.', 'Cerrar programa', async () => {
    await API.actualizarPrograma(P.id, { estado: 'cerrada', cierre: iso(HOY) }); toast('Programa cerrado');
  });
  if ($('ppReab')) $('ppReab').onclick = async () => { await API.actualizarPrograma(P.id, { estado: 'activa' }); toast('Programa reabierto'); };
}
function confirmar(tit, txt, ok, fn) {
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="max-width:520px"><div class="modal-h"><div class="h-display" style="font-size:20px">${esc(tit)}</div><button class="btn btn-icon" data-x>×</button></div>
    <div class="modal-b"><p class="muted" style="margin:0;line-height:1.6">${esc(txt)}</p></div>
    <div class="modal-f"><button class="btn" data-x>Cancelar</button><button class="btn pp-grad" id="cfOk">${esc(ok)}</button></div></div>`;
  document.body.appendChild(bg);
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  bg.querySelector('#cfOk').onclick = async () => { bg.remove(); try { await fn(); } catch (e) { toast(e.message, 'err'); } };
}

/* ---------- Resumen ---------- */
function renderDash() {
  if (!$('ppRing')) return;
  cabecera();
  const n = A.length, c = { fin: 0, cur: 0, pro: 0, def: 0, atr: 0 };
  A.forEach(t => c[est(t)]++);
  $('ppVacio').innerHTML = n ? '' : `<div class="alert ok" style="margin-bottom:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span style="flex:1">El programa aún no tiene actividades. Regístrelas en la pestaña Actividades para ver el avance, la curva S y los costos.</span>${gestor() && escribe() ? '<button class="btn pp-btn pp-grad" id="ppIrAct">Registrar actividades</button>' : ''}</div>`;
  if ($('ppIrAct')) $('ppIrAct').onclick = () => { TAB = 'list'; pestaña(); modalAct(null); };
  const av = n ? A.reduce((s, t) => s + (+t.av || 0), 0) / n : 0;
  requestAnimationFrame(() => { if ($('ppRing')) $('ppRing').style.strokeDashoffset = 263.9 * (1 - av / 100); });
  $('ppRingTx').textContent = av.toFixed(0) + '%';
  $('kAvS').textContent = `${n} actividades en el plan`;
  $('kFin').innerHTML = `${c.fin}<small> / ${n}</small>`;
  $('kFinS').textContent = n ? `${(c.fin / n * 100).toFixed(0)} % del total` : '';
  $('kCur').textContent = c.cur + c.atr; $('kPro').textContent = c.pro; $('kDef').textContent = c.def;
  const starts = A.map(t => D(t.ini)).filter(Boolean);
  const d0 = starts.length ? new Date(Math.min(...starts)) : HOY;
  $('kDias').textContent = Math.max(0, dias(d0, HOY)); $('kDiasS').textContent = 'Desde el ' + fmtS(d0);

  // Curva S: programado según línea base (si existe), real según avance
  const pi = (t) => t.ini_b || t.ini, pf = (t) => t.fin_b || t.fin;
  const sc = A.filter(t => pi(t) && pf(t)), w = sc.length ? 1 / sc.length : 0;
  const P0 = D(P.desde) && D(P.desde) < d0 ? D(P.desde) : d0;
  const fins = [...sc.map(t => D(pf(t))), ...sc.map(t => D(t.fin)).filter(Boolean), HOY];
  const end = new Date(Math.max(...fins));
  const labels = [], plan = [], real = [];
  for (let d = new Date(P0); d <= end; d = new Date(+d + DAY)) {
    labels.push(fmtS(d));
    let p = 0, r = 0;
    sc.forEach(t => {
      const i = D(pi(t)), f = D(pf(t)); if (d >= i) p += w * Math.min(1, dias(i, d) / dias(i, f));
      if (d <= HOY) {
        const ri = D(t.ini), rf = D(t.fin) || HOY; if (!ri) return;
        const fe = rf < HOY ? rf : HOY, fx = d < ri ? 0 : Math.min(1, dias(ri, d) / Math.max(1, dias(ri, fe)));
        r += w * fx * (+t.av || 0) / 100;
      }
    });
    plan.push(+(p * 100).toFixed(1)); real.push(d <= HOY ? +(r * 100).toFixed(1) : null);
  }
  const ti = Math.round((HOY - P0) / DAY), pN = plan[Math.min(ti, plan.length - 1)] || 0, rN = real[Math.min(ti, real.length - 1)] || 0, dif = rN - pN;
  const nrp = A.filter(reprog).length;
  $('kSpi').innerHTML = `Programado al corte: <b>${pN.toFixed(0)}%</b> · Real: <b>${rN.toFixed(0)}%</b><br><span style="color:${dif >= -1 ? 'var(--pp-fin)' : 'var(--pp-atr)'};font-weight:700">${dif >= -1 ? '● En plazo' : '● Atraso de ' + Math.abs(dif).toFixed(0) + (Math.abs(dif).toFixed(0) === '1' ? ' pt' : ' pts')}</span>${nrp ? ` · <span style="color:var(--pp-pro);font-weight:600">${nrp} reprogramada${nrp > 1 ? 's' : ''}</span>` : ''}`;
  const out = n - sc.length;
  $('ppSNote').textContent = `Programado según ${P.lineaBase?.fecha ? 'línea base' : 'programa vigente'}; calculado sobre ${sc.length} actividades con fecha de inicio y fin (peso uniforme).${out ? ' ' + out + ' actividades se incorporan al programar sus fechas.' : ''}`;
  if (chS) chS.destroy();
  if (window.Chart && labels.length) {
    const hoyL = { id: 'hoy', afterDatasetsDraw(ch) { if (ti < 0 || ti >= labels.length) return; const x = ch.scales.x.getPixelForValue(ti), { top, bottom } = ch.chartArea, g = ch.ctx; g.save(); g.strokeStyle = '#ff6b6b'; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(x, top); g.lineTo(x, bottom); g.stroke(); g.setLineDash([]); g.fillStyle = '#ff6b6b'; g.font = '700 11px IBM Plex Sans'; g.fillText('Hoy', x + 5, top + 12); g.restore(); } };
    chS = new Chart($('ppS'), {
      type: 'line', plugins: [hoyL],
      data: { labels, datasets: [
        { label: 'Programado', data: plan, borderColor: '#9fb0c4', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, tension: .35, fill: false },
        { label: 'Real', data: real, borderColor: '#2ec4a6', backgroundColor: 'rgba(46,196,166,.16)', borderWidth: 3, pointRadius: 0, tension: .35, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw == null ? null : `${c.dataset.label}: ${c.raw}%` } } },
        scales: { x: { ticks: { color: '#C3CDD8', maxTicksLimit: 10, font: { size: 11 } }, grid: { color: 'rgba(255,255,255,.05)' } },
          y: { min: 0, max: 100, ticks: { color: '#C3CDD8', callback: v => v + '%', stepSize: 25 }, grid: { color: 'rgba(255,255,255,.07)' } } } }
    });
  }
  const fases = [...new Set([...FASES, ...A.map(t => t.fase)])];
  $('ppFases').innerHTML = fases.map(f => { const a = A.filter(t => t.fase === f); if (!a.length) return '';
    const v = a.reduce((s, t) => s + (+t.av || 0), 0) / a.length, fn = a.filter(t => est(t) === 'fin').length;
    return `<div class="pp-phase"><div class="top"><b>${esc(f)}</b><span>${fn}/${a.length} · ${v.toFixed(0)}%</span></div><div class="pp-bar"><div data-w="${v}"></div></div></div>`; }).join('');
  requestAnimationFrame(() => document.querySelectorAll('#ppFases .pp-bar>div').forEach(b => b.style.width = b.dataset.w + '%'));
  const rs = {}; A.forEach(t => { const r = t.resp || 'Por asignar'; rs[r] = rs[r] || { n: 0, f: 0 }; rs[r].n++; if (est(t) === 'fin') rs[r].f++; });
  $('ppResp').innerHTML = Object.entries(rs).map(([k, v]) => `<div><b>${v.n}</b><span>${esc(k)} · ${v.f} finalizadas</span></div>`).join('');
  const ks = ['fin', 'cur', 'atr', 'pro', 'def'];
  $('ppEstSub').textContent = `${n} actividades`; $('ppDcN').textContent = n;
  if (chB) chB.destroy();
  if (window.Chart) chB = new Chart($('ppB'), { type: 'doughnut', data: { labels: ks.map(k => ST[k].label), datasets: [{ data: ks.map(k => c[k]), backgroundColor: ks.map(k => ST[k].hex), borderColor: '#3d4a5a', borderWidth: 3, hoverOffset: 6 }] },
    options: { cutout: '70%', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  $('ppDleg').innerHTML = ks.map(k => `<div><i style="background:${ST[k].hex}"></i>${ST[k].label}<b>${c[k]}</b><span>${n ? (c[k] / n * 100).toFixed(0) : 0}%</span></div>`).join('');
  const lim = new Date(+HOY + 15 * DAY);
  const nx = A.filter(t => est(t) !== 'fin' && t.ini && D(t.ini) >= HOY && D(t.ini) <= lim).sort((a, b) => D(a.ini) - D(b.ini));
  $('ppNext').innerHTML = nx.length ? nx.map(t => `<div class="pp-ni"><div class="d">${fmtS(D(t.ini))}<small>${dias(D(t.ini), D(t.fin) || D(t.ini))} d</small></div><div class="t">${esc(t.nom)}<small>${esc(t.resp || 'Por asignar')} · hasta ${t.fin ? fmtS(D(t.fin)) : 'por definir'}</small></div></div>`).join('')
    : '<div class="pp-foot">Sin actividades programadas en los próximos 15 días.</div>';
}

/* ---------- Línea de tiempo ---------- */
function renderGantt() {
  const g = $('ppGantt'); if (!g) return;
  const fechas = A.flatMap(t => [t.ini, t.fin, t.ini_b, t.fin_b]).filter(Boolean).map(D);
  if (!fechas.length && !A.length) { g.innerHTML = '<div class="pp-empty">Sin actividades.</div>'; return; }
  let minD = D(P.desde) || new Date(Math.min(...fechas, HOY));
  minD = new Date(+minD - ((minD.getDay() + 6) % 7) * DAY);
  const maxEnd = new Date(Math.max(...fechas, HOY));
  const tbdDays = A.some(t => !t.ini) ? 14 : 0;
  const endD = new Date(+maxEnd + (7 - ((maxEnd.getDay() + 6) % 7)) * DAY);
  const span = dias(minD, endD) + tbdDays;
  const pct = (d) => (dias(minD, d) - 1) / span * 100, wd = (d) => d / span * 100;
  let h = '<div class="pp-grow pp-ghead"><div class="pp-gname">Actividad</div><div><div class="pp-months">';
  for (let m = new Date(minD.getFullYear(), minD.getMonth(), 1); m <= endD; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const a = m < minD ? minD : m, b = new Date(Math.min(+new Date(m.getFullYear(), m.getMonth() + 1, 0), +endD));
    const mn = m.toLocaleDateString('es-PE', { month: dias(a, b) < 14 ? 'short' : 'long' }).replace('.', '');
    h += `<div style="left:${pct(a)}%;width:${wd(dias(a, b))}%">${mn.charAt(0).toUpperCase() + mn.slice(1)} ${m.getFullYear()}</div>`;
  }
  h += '</div><div class="pp-weeks">';
  let vl = '';
  for (let d = new Date(minD); d <= endD; d = new Date(+d + 7 * DAY)) { h += `<div style="left:${pct(d)}%;width:${wd(7)}%">${fmtS(d)}</div>`; vl += `<div style="left:${pct(d)}%"></div>`; }
  h += '</div></div></div>';
  const fases = [...new Set([...FASES, ...A.map(t => t.fase)])];
  fases.forEach(f => {
    const a = A.filter(t => t.fase === f).sort((x, y) => (D(x.ini) || 9e15) - (D(y.ini) || 9e15) || x.n - y.n); if (!a.length) return;
    h += `<div class="pp-grow"><div class="pp-gphase">${esc(f)}</div></div>`;
    a.forEach(t => {
      const k = est(t), i = D(t.ini), fi = D(t.fin); let bar = '';
      if (!i) bar = `<div class="pp-gbar tbd" style="left:${pct(new Date(+endD + 2 * DAY))}%;width:${wd(tbdDays - 4)}%" title="Por definir"></div>`;
      else if (!fi) bar = `<div class="pp-gbar cur" style="left:${pct(i)}%;width:${wd(dias(i, HOY))}%" title="En curso – fin por definir"></div>`;
      else bar = `<div class="pp-gbar" style="left:${pct(i)}%;width:${wd(dias(i, fi))}%;background:${ST[k].c}" title="${fmt(i)} – ${fmt(fi)} · ${t.av}%"><div class="p" style="width:${k === 'fin' ? 0 : t.av}%"></div></div>`;
      if (reprog(t) && D(t.ini_b) && D(t.fin_b)) bar += `<div class="pp-gbase" style="left:${pct(D(t.ini_b))}%;width:${wd(dias(D(t.ini_b), D(t.fin_b)))}%" title="Línea base: ${fmt(D(t.ini_b))} – ${fmt(D(t.fin_b))}"></div>`;
      h += `<div class="pp-grow" data-a="${esc(t.id)}"><div class="pp-gname"><span class="n">${t.n}</span>${esc(t.nom)}${reprog(t) ? '<span class="pp-rp">Reprog.</span>' : ''}<span class="r">${esc(t.resp || '—')}</span></div><div class="pp-gtrack">${bar}</div></div>`;
    });
  });
  if (tbdDays) vl += `<div class="tbdzone" style="left:${pct(new Date(+endD + DAY))}%;right:0"></div>`;
  vl += `<div class="today" style="left:${pct(HOY) + wd(.5)}%"><span>Hoy ${fmtS(HOY)}</span></div>`;
  h += `<div class="pp-vl">${vl}</div>`;
  g.innerHTML = h;
  g.querySelectorAll('[data-a]').forEach(r => r.onclick = () => modalAct(r.dataset.a));
}

/* ---------- Actividades ---------- */
function renderList() {
  if (!$('ppTb')) return;
  const rs = [...new Set(A.map(t => t.resp || 'Por asignar'))];
  $('ppFil').innerHTML = [['all', 'Todas'], ...Object.entries(ST).map(([k, v]) => [k, v.label])].map(([k, v]) => `<button class="pp-chip ${F.est === k ? 'on' : ''}" data-e="${k}">${v}</button>`).join('') +
    '<span style="width:10px"></span>' + [['all', 'Todos'], ...rs.map(r => [r, r])].map(([k, v]) => `<button class="pp-chip ${F.resp === k ? 'on' : ''}" data-r="${esc(k)}">${esc(v)}</button>`).join('') +
    `<span class="pp-sp"></span>${gestor() && escribe() ? '<button class="btn pp-btn pp-grad" id="ppAdd">+ Actividad</button>' : ''}`;
  const rows = A.filter(t => (F.est === 'all' || est(t) === F.est) && (F.resp === 'all' || (t.resp || 'Por asignar') === F.resp)).sort((a, b) => a.n - b.n);
  $('ppTb').innerHTML = rows.map(t => { const k = est(t), i = D(t.ini), f = D(t.fin), ne = nEv(t.id);
    return `<tr data-a="${esc(t.id)}"><td class="num">${t.n}</td><td>${esc(t.nom)}${reprog(t) ? '<span class="pp-rp">Reprog.</span>' : ''}${t.obs ? `<div style="color:var(--tx-3);font-size:11.5px">${esc(t.obs)}</div>` : ''}</td><td>${esc(t.fase)}</td>
      <td>${t.resp ? esc(t.resp) : '<span style="color:var(--tx-3)">Por asignar</span>'}</td><td class="num">${i ? fmt(i) : '—'}</td><td class="num">${f ? fmt(f) : (i ? 'Por definir' : '—')}</td>
      <td class="num">${i && f ? dias(i, f) : '—'}</td><td><div class="pp-mini"><div class="pp-bar"><div style="width:${t.av || 0}%"></div></div><span>${t.av || 0}%</span></div></td>
      <td><span class="pp-ic ${ne ? 'has' : ''}">${CAM}${ne}</span></td><td>${stTag(k)}</td></tr>`; }).join('') || '<tr><td colspan="10" class="pp-empty">Sin actividades para el filtro elegido.</td></tr>';
  document.querySelectorAll('#ppFil [data-e]').forEach(b => b.onclick = () => { F.est = b.dataset.e; renderList(); });
  document.querySelectorAll('#ppFil [data-r]').forEach(b => b.onclick = () => { F.resp = b.dataset.r; renderList(); });
  document.querySelectorAll('#ppTb tr[data-a]').forEach(r => r.onclick = () => modalAct(r.dataset.a));
  if ($('ppAdd')) $('ppAdd').onclick = () => modalAct(null);
}

function modalAct(aid) {
  const t = aid ? A.find(x => x.id === aid) : { nom: '', fase: 'Montaje', resp: '', ini: '', fin: '', av: 0, obs: '' };
  if (!t) return;
  const ed = escribe(), full = ed && gestor(), dis = (x) => (x ? '' : 'disabled');
  const k = aid ? est(t) : null;
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="max-width:640px"><div class="modal-h"><div><div class="eyebrow" style="font-size:11px">${aid ? 'Actividad N.° ' + t.n : 'Nueva actividad'}</div>
      <div class="h-display" style="font-size:19px;margin-top:6px">${aid ? esc(t.nom) : 'Registrar actividad'}</div></div><button class="btn btn-icon" data-x>×</button></div>
    <div class="modal-b"><div class="pp-fg">
      <div class="full"><label class="label">Actividad</label><input class="field" id="maNom" value="${esc(t.nom)}" ${dis(full)}></div>
      <div><label class="label">Fase</label><select class="field" id="maFase" ${dis(full)}>${[...new Set([...FASES, t.fase])].map(f => `<option ${f === t.fase ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
      <div><label class="label">Responsable</label><input class="field" id="maResp" list="maRL" value="${esc(t.resp || '')}" ${dis(full)}><datalist id="maRL">${[...new Set(A.map(x => x.resp).filter(Boolean))].map(r => `<option value="${esc(r)}">`).join('')}</datalist></div>
      <div><label class="label">Fecha de inicio</label><input type="date" class="field" id="maIni" value="${esc(t.ini || '')}" ${dis(full)}></div>
      <div><label class="label">Fecha de fin</label><input type="date" class="field" id="maFin" value="${esc(t.fin || '')}" ${dis(full)}></div>
      <div><label class="label">Avance (%)</label><input type="number" class="field" id="maAv" min="0" max="100" step="5" value="${t.av || 0}" ${dis(ed)}></div>
      <div><label class="label">Estado</label><div style="padding-top:10px">${k ? stTag(k) : '—'}</div></div>
      ${aid && (t.ini_b || t.fin_b) ? `<div class="full pp-nota">Línea base: ${t.ini_b ? fmt(D(t.ini_b)) : 'por definir'} – ${t.fin_b ? fmt(D(t.fin_b)) : 'por definir'}${reprog(t) ? ' · <b style="color:var(--pp-pro)">Reprogramada</b>' : ''}</div>` : ''}
      ${aid && verCostos() ? `<div class="full pp-nota">Costo registrado: <b style="color:var(--tx)">${sol(C.filter(c => c.aid === aid).reduce((s, c) => s + (+c.monto || 0), 0))}</b> (${C.filter(c => c.aid === aid).length} partida(s))</div>` : ''}
      <div class="full"><label class="label">Observación</label><textarea class="field" id="maObs" rows="2" ${dis(ed)}>${esc(t.obs || '')}</textarea></div>
    </div></div>
    <div class="modal-f">${aid && full ? '<button class="btn btn-danger" id="maDel" style="margin-right:auto">Eliminar</button>' : ''}${aid ? `<button class="btn" id="maEv">${CAM} Evidencias (${nEv(aid)})</button>` : ''}
      <button class="btn" data-x>${ed ? 'Cancelar' : 'Cerrar'}</button>${ed ? '<button class="btn pp-grad" id="maOk">Guardar</button>' : ''}</div></div>`;
  document.body.appendChild(bg);
  const q = (s) => bg.querySelector(s);
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  if (q('#maEv')) q('#maEv').onclick = () => { bg.remove(); selA = aid; TAB = 'ev'; pestaña(); renderEv(); };
  if (q('#maDel')) q('#maDel').onclick = () => { bg.remove(); confirmar('Eliminar actividad', `Se eliminará la actividad N.° ${t.n} "${t.nom}".`, 'Eliminar', async () => { await API.eliminarActividad(P.id, aid); toast('Actividad eliminada'); }); };
  if (q('#maOk')) q('#maOk').onclick = async () => {
    const v = { nom: q('#maNom').value.trim(), fase: q('#maFase').value, resp: q('#maResp').value.trim(), ini: q('#maIni').value, fin: q('#maFin').value,
      av: Math.max(0, Math.min(100, +q('#maAv').value || 0)), obs: q('#maObs').value.trim() };
    if (!v.nom) { toast('Ingrese el nombre de la actividad', 'err'); return; }
    if (v.ini && v.fin && v.fin < v.ini) { toast('La fecha de fin es anterior al inicio', 'err'); return; }
    const reg = aid ? { id: aid, ...(full ? v : { av: v.av, obs: v.obs }) } : { ...v, n: Math.max(0, ...A.map(x => +x.n || 0)) + 1, ini_b: P.lineaBase ? '' : v.ini, fin_b: P.lineaBase ? '' : v.fin };
    try { await API.guardarActividad(P.id, reg); bg.remove(); toast('Actividad guardada'); } catch (e) { toast('No se pudo guardar: ' + e.message, 'err'); }
  };
}

/* ---------- Evidencias ---------- */
let evPend = false;
function renderEv() {
  if (!$('ppEvItems')) return;
  const foco = document.activeElement;
  if (foco && $('ppGal') && $('ppGal').contains(foco) && foco.tagName === 'INPUT') {
    if (!evPend) { evPend = true; foco.addEventListener('blur', () => setTimeout(() => { evPend = false; renderEv(); }, 0), { once: true }); }
    return;
  }
  if (!selA || !A.find(x => x.id === selA)) selA = (A.find(x => est(x) === 'cur') || [...A].sort((a, b) => a.n - b.n)[0] || {}).id || null;
  $('ppEvInfo').textContent = `${E.length} foto(s) registradas en ${new Set(E.map(e => e.aid)).size} actividad(es)`;
  $('ppEvTot').textContent = A.length;
  const q = evQ.toLowerCase();
  $('ppEvItems').innerHTML = [...A].sort((a, b) => a.n - b.n).filter(t => !q || t.nom.toLowerCase().includes(q) || String(t.n) === q).map(t => { const n = nEv(t.id), k = est(t);
    return `<div class="pp-evi ${t.id === selA ? 'on' : ''}" data-a="${esc(t.id)}"><span class="dot" style="background:${ST[k].c}"></span><div class="nm">${t.n}. ${esc(t.nom)}<small>${esc(t.fase)} · ${ST[k].label}</small></div><span class="pp-cnt ${n ? 'has' : ''}">${CAM}${n}</span></div>`; }).join('');
  document.querySelectorAll('#ppEvItems [data-a]').forEach(e => e.onclick = () => { selA = e.dataset.a; renderEv(); });
  const t = A.find(x => x.id === selA);
  if (!t) { $('ppEvHead').innerHTML = '<div class="pp-empty">Sin actividades.</div>'; $('ppGal').innerHTML = ''; $('ppEvAcc').innerHTML = ''; $('ppDropW').innerHTML = ''; return; }
  const k = est(t), i = D(t.ini), f = D(t.fin);
  $('ppEvHead').innerHTML = `<div class="n">Actividad N.° ${t.n} · ${esc(t.fase)}</div><h2>${esc(t.nom)}</h2>
    <div class="pp-evmeta"><div>Responsable<b>${esc(t.resp || 'Por asignar')}</b></div><div>Inicio<b>${i ? fmt(i) : 'Por definir'}</b></div><div>Fin<b>${f ? fmt(f) : 'Por definir'}</b></div>
    <div>Avance<b>${t.av || 0}%</b></div><div>Estado<b style="color:${ST[k].c}">${ST[k].label}</b></div><div>Fotos<b>${nEv(t.id)}</b></div></div>`;
  const ed = escribe();
  $('ppEvAcc').innerHTML = `${ed ? '<label class="btn pp-btn pp-grad" for="ppFile">+ Subir fotos</label>' : ''}<button class="btn pp-btn" id="ppPdf1">Descargar PDF de la actividad</button>`;
  $('ppPdf1').onclick = async () => { busy(true, 'Generando PDF…'); try { await pdfActividad(ctxPdf(), t); } catch (e) { toast(e.message, 'err'); } finally { busy(false); } };
  $('ppDropW').innerHTML = ed ? '<div class="pp-drop" id="ppDrop">Arrastra las fotos aquí o <b>haz clic para seleccionarlas</b></div>' : '';
  const dr = $('ppDrop');
  if (dr) {
    dr.onclick = () => $('ppFile').click();
    ['dragover', 'dragenter'].forEach(ev => dr.addEventListener(ev, e => { e.preventDefault(); dr.classList.add('ov'); }));
    ['dragleave', 'drop'].forEach(ev => dr.addEventListener(ev, e => { e.preventDefault(); dr.classList.remove('ov'); }));
    dr.addEventListener('drop', e => subir([...e.dataTransfer.files]));
  }
  const L = evDe(t.id), uid = CTX.user?.uid, nom = CTX.perfil?.nombre || CTX.user?.email || '';
  $('ppGal').innerHTML = L.length ? L.map((e, x) => { const borra = ed && (gestor() || e.por === nom);
    return `<div class="pp-ph" data-e="${esc(e.id)}"><div class="im" data-x="${x}"><img src="${e.thumb}" alt="" loading="lazy"><span class="no">Foto ${x + 1}</span></div>
    <div class="phb"><div class="pp-seg">${ETAPAS.map(s => `<button data-et="${s}" class="${s === e.etapa ? 'on' : ''}" style="--sc:${ETC[s]}" ${ed ? '' : 'disabled'}>${s}</button>`).join('')}</div>
      <div class="pp-row2"><input type="date" class="field" data-k="fecha" value="${esc(e.fecha)}" ${ed ? '' : 'disabled'}>${borra ? `<button class="pp-del" title="Eliminar foto">${TRASH}</button>` : ''}</div>
      <input class="field" data-k="desc" placeholder="Descripción de la foto" value="${esc(e.desc || '')}" ${ed ? '' : 'disabled'}></div></div>`; }).join('')
    : '<div class="pp-empty">Sin evidencias registradas para esta actividad.</div>';
  document.querySelectorAll('#ppGal .pp-ph').forEach(p => {
    const e = E.find(x => x.id === p.dataset.e);
    p.querySelector('.im').onclick = () => { lbI = +p.querySelector('.im').dataset.x; lbShow(); $('ppLb').classList.add('on'); };
    p.querySelectorAll('[data-k]').forEach(inp => inp.onchange = () => API.actualizarEvidencia(P.id, e.id, { [inp.dataset.k]: inp.value }).catch(er => toast(er.message, 'err')));
    p.querySelectorAll('[data-et]').forEach(b => b.onclick = () => API.actualizarEvidencia(P.id, e.id, { etapa: b.dataset.et }).catch(er => toast(er.message, 'err')));
    const d = p.querySelector('.pp-del');
    if (d) d.onclick = () => {
      if (!d.classList.contains('arm')) { d.classList.add('arm'); d.innerHTML = '¿Eliminar?'; setTimeout(() => { if (d.isConnected) { d.classList.remove('arm'); d.innerHTML = TRASH; } }, 3000); return; }
      API.eliminarEvidencia(P.id, e.id).then(() => toast('Foto eliminada')).catch(er => toast(er.message, 'err'));
    };
  });
}
async function lbShow() {
  const L = evDe(selA); if (!L.length) return;
  lbI = (lbI + L.length) % L.length; const e = L[lbI];
  $('ppLbImg').src = e.thumb;
  $('ppLbCap').innerHTML = `Foto ${lbI + 1} de ${L.length} · ${esc(e.etapa)}${e.desc ? ' — ' + esc(e.desc) : ''}<small>${fmt(D(e.fecha))}${e.por ? ' · ' + esc(e.por) : ''}</small>`;
  const k = lbI;
  try { const full = await API.foto(P.id, e.id); if (full && k === lbI) $('ppLbImg').src = full; } catch {}
}

function reducir(file, lado, q) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { const s = Math.min(1, lado / Math.max(im.width, im.height)), w = Math.round(im.width * s), h = Math.round(im.height * s);
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
      URL.revokeObjectURL(u); res({ data: c.toDataURL('image/jpeg', q), w, h }); };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Imagen no válida')); }; im.src = u; });
}
function reducirDataUrl(src, lado, q) {
  return new Promise((res) => { const im = new Image(); im.onload = () => { const s = Math.min(1, lado / Math.max(im.width, im.height)), w = Math.round(im.width * s), h = Math.round(im.height * s);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h); res(c.toDataURL('image/jpeg', q)); }; im.onerror = () => res(src); im.src = src; });
}
async function subir(files) {
  const t = A.find(x => x.id === selA); if (!t || !files.length || !escribe()) return;
  const k = est(t), et = k === 'fin' ? 'Después' : (k === 'cur' || k === 'atr') ? 'Durante' : 'Antes';
  let ok = 0, i = 0;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    busy(true, `Subiendo fotos… ${++i}/${files.length}`);
    try {
      const full = await reducir(f, 1280, .72), th = await reducir(f, 360, .7);
      const fd = f.lastModified ? new Date(f.lastModified) : HOY;
      await API.agregarEvidencia(P.id, { aid: t.id, etapa: et, fecha: iso(fd), desc: '', w: full.w, h: full.h, thumb: th.data, ord: Date.now() }, full.data);
      ok++;
    } catch (e) { console.warn(e); }
  }
  busy(false);
  toast(ok ? `${ok} foto(s) agregada(s)` : 'No se pudo cargar la imagen', ok ? 'ok' : 'err');
}
function ctxPdf() { return { parada: P, A, E, est, ST, hoy: HOY, foto: (eid) => API.foto(P.id, eid) }; }

/* ---------- Costos ---------- */
function barras(items, total, color) {
  if (!items.length) return '<div class="pp-foot">Sin costos registrados.</div>';
  const mx = Math.max(...items.map(x => x.v), 1);
  return items.map(x => `<div class="pp-phase"><div class="top"><b style="font-weight:500">${esc(x.k)}</b><span>${sol(x.v)}${total ? ` · ${(x.v / total * 100).toFixed(0)}%` : ''}</span></div><div class="pp-bar"><div data-w="${x.v / mx * 100}" style="${x.c || color ? `background:${x.c || color}` : ''}"></div></div></div>`).join('');
}
function renderCostos() {
  if (!$('cTb') || !verCostos()) return;
  const tot = C.reduce((s, c) => s + (+c.monto || 0), 0);
  const com = C.filter(c => c.estado !== 'presupuestado').reduce((s, c) => s + (+c.monto || 0), 0);
  const eje = C.filter(c => c.estado === 'ejecutado').reduce((s, c) => s + (+c.monto || 0), 0);
  $('cPre').textContent = sol(tot); $('cPreS').textContent = `${C.length} partida(s) en ${new Set(C.map(c => c.aid)).size} actividad(es)`;
  $('cCom').textContent = sol(com); $('cComS').textContent = tot ? `${(com / tot * 100).toFixed(0)} % del presupuesto` : '—';
  $('cEje').textContent = sol(eje); $('cEjeS').textContent = tot ? `${(eje / tot * 100).toFixed(0)} % del presupuesto` : '—';
  $('cSal').textContent = sol(tot - com);
  const actN = (aid) => A.find(a => a.id === aid);
  const porAct = {}; C.forEach(c => { porAct[c.aid] = (porAct[c.aid] || 0) + (+c.monto || 0); });
  $('cAct').innerHTML = barras(Object.entries(porAct).map(([aid, v]) => { const a = actN(aid); return { k: a ? `${a.n}. ${a.nom}` : 'Actividad eliminada', v }; }).sort((a, b) => b.v - a.v).slice(0, 10), tot);
  const porTipo = {}; C.forEach(c => { porTipo[c.tipo || 'Otros'] = (porTipo[c.tipo || 'Otros'] || 0) + (+c.monto || 0); });
  $('cTipo').innerHTML = barras(Object.entries(porTipo).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v), tot);
  $('cEst').innerHTML = barras(Object.entries(EST_COSTO).map(([k, e]) => ({ k: e.label, v: C.filter(c => c.estado === k).reduce((s, c) => s + (+c.monto || 0), 0), c: e.hex })), tot);
  requestAnimationFrame(() => document.querySelectorAll('#v-costos .pp-bar>div').forEach(b => b.style.width = b.dataset.w + '%'));
  const ed = escribe() && gestor();
  $('cAcc').innerHTML = ed ? '<button class="btn pp-btn pp-grad" id="cAdd">+ Costo</button>' : '';
  if ($('cAdd')) $('cAdd').onclick = () => modalCosto(null);
  const filas = [...C].sort((a, b) => ((actN(a.aid)?.n || 999) - (actN(b.aid)?.n || 999)) || String(a.fecha || '').localeCompare(String(b.fecha || '')));
  $('cTb').innerHTML = filas.map(c => { const a = actN(c.aid), e = EST_COSTO[c.estado] || EST_COSTO.presupuestado;
    return `<tr data-c="${esc(c.id)}"><td class="num">${a ? a.n : '—'}</td><td>${a ? esc(a.nom) : '<span style="color:var(--tx-3)">Actividad eliminada</span>'}</td><td>${esc(c.desc || '')}</td><td>${esc(c.tipo || '')}</td>
      <td>${esc(c.prov || '—')}</td><td>${esc(c.doc || '—')}${c.fecha ? `<div style="color:var(--tx-3);font-size:11.5px">${fmt(D(c.fecha))}</div>` : ''}</td>
      <td><span class="pp-st" style="color:${e.hex};background:color-mix(in srgb,${e.hex} 16%,transparent)">${e.label}</span></td><td class="num" style="text-align:right;font-weight:600">${sol(c.monto)}</td></tr>`; }).join('')
    || `<tr><td colspan="8" class="pp-empty">Sin costos registrados.${ed ? ' Registre cotizaciones, órdenes y consumos con "+ Costo".' : ''}</td></tr>`;
  $('cTf').innerHTML = C.length ? `<tr><td colspan="7" style="text-align:right;font-weight:700;padding:11px 10px">Total</td><td class="num" style="text-align:right;font-weight:700;padding:11px 10px">${sol(tot)}</td></tr>` : '';
  document.querySelectorAll('#cTb tr[data-c]').forEach(r => r.onclick = () => modalCosto(r.dataset.c));
}
function modalCosto(cid) {
  const c = cid ? C.find(x => x.id === cid) : { aid: '', tipo: 'Servicio externo', desc: '', prov: '', doc: '', fecha: iso(HOY), monto: '', estado: 'presupuestado' };
  if (!c) return;
  const ed = escribe() && gestor(), dis = ed ? '' : 'disabled';
  const acts = [...A].sort((a, b) => a.n - b.n);
  const bg = document.createElement('div'); bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal" style="max-width:640px"><div class="modal-h"><div class="h-display" style="font-size:20px">${cid ? 'Partida de costo' : 'Registrar costo'}</div><button class="btn btn-icon" data-x>×</button></div>
    <div class="modal-b"><div class="pp-fg">
      <div class="full"><label class="label">Actividad</label><select class="field" id="mcAct" ${dis}>${acts.map(a => `<option value="${esc(a.id)}" ${a.id === c.aid ? 'selected' : ''}>${a.n}. ${esc(a.nom)}</option>`).join('')}</select></div>
      <div class="full"><label class="label">Concepto</label><input class="field" id="mcDesc" value="${esc(c.desc || '')}" placeholder="Ej.: Servicio de rebobinado, rodamientos 6309-2Z…" ${dis}></div>
      <div><label class="label">Tipo</label><select class="field" id="mcTipo" ${dis}>${TIPOS_COSTO.map(t => `<option ${t === c.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div><label class="label">Estado</label><select class="field" id="mcEst" ${dis}>${Object.entries(EST_COSTO).map(([k, e]) => `<option value="${k}" ${k === c.estado ? 'selected' : ''}>${e.label}</option>`).join('')}</select></div>
      <div><label class="label">Proveedor</label><input class="field" id="mcProv" value="${esc(c.prov || '')}" ${dis}></div>
      <div><label class="label">Documento</label><input class="field" id="mcDoc" value="${esc(c.doc || '')}" placeholder="Cotización, OC u OS N.°" ${dis}></div>
      <div><label class="label">Fecha</label><input type="date" class="field" id="mcFec" value="${esc(c.fecha || '')}" ${dis}></div>
      <div><label class="label">Monto (S/ sin IGV)</label><input type="number" class="field" id="mcMon" min="0" step="0.01" value="${c.monto ?? ''}" ${dis}></div>
    </div></div>
    <div class="modal-f">${cid && ed ? '<button class="btn btn-danger" id="mcDel" style="margin-right:auto">Eliminar</button>' : ''}<button class="btn" data-x>${ed ? 'Cancelar' : 'Cerrar'}</button>${ed ? '<button class="btn pp-grad" id="mcOk">Guardar</button>' : ''}</div></div>`;
  document.body.appendChild(bg);
  const q = (s) => bg.querySelector(s);
  bg.querySelectorAll('[data-x]').forEach(b => b.onclick = () => bg.remove());
  if (q('#mcDel')) q('#mcDel').onclick = async () => { await API.eliminarCosto(P.id, cid); bg.remove(); toast('Partida eliminada'); };
  if (q('#mcOk')) q('#mcOk').onclick = async () => {
    const v = { aid: q('#mcAct').value, desc: q('#mcDesc').value.trim(), tipo: q('#mcTipo').value, estado: q('#mcEst').value, prov: q('#mcProv').value.trim(),
      doc: q('#mcDoc').value.trim(), fecha: q('#mcFec').value, monto: Math.max(0, +(+q('#mcMon').value || 0).toFixed(2)) };
    if (!v.aid) { toast('Seleccione la actividad', 'err'); return; }
    if (!v.monto) { toast('Ingrese el monto', 'err'); return; }
    try { await API.guardarCosto(P.id, cid ? { id: cid, ...v } : v); bg.remove(); toast('Costo guardado'); } catch (e) { toast('No se pudo guardar: ' + e.message, 'err'); }
  };
}
