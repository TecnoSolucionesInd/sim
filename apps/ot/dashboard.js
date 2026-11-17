// Órdenes de trabajo — Dashboard gerencial
import { SISTEMAS } from '../../core/maestros.js';
import * as M from './modelo.js';
import * as I from './indicadores.js';
import { esc, IC } from './ui.js';

const ST = { tipo: 'mes', ref: I.iso(new Date()), F: { esp: '', tec: '', sa: '', z: '', o: '', c: '' } };
const CACHE = new Map();          // mes → Map(id → fila) leída de datos/ot/resumen
const SOLS = new Map();           // mes → solicitudes
let CHARTS = [], ANIM = true, CARGANDO = null, ULT = null;
const TIPO_C = { preventivo: '#1B86C4', correctivo: '#D65050', emergencia: '#991B1B', auditoria: '#B77908', mejora: '#0B9A8B', servicio: '#8A96A2' };
const pct = (r, d = 0) => r == null ? '—' : `${M.nf(r * 100, d)} %`;

async function cargar(S, meses) {
  const faltan = meses.filter(m => !CACHE.has(m));
  if (faltan.length) {
    const [res, sols] = await Promise.all([S.api.resumenes(faltan), S.api.solicitudesMeses(faltan).catch(() => [])]);
    faltan.forEach(m => { CACHE.set(m, new Map()); SOLS.set(m, []); });
    res.forEach((r, id) => { const m = M.mesDe(r.f); if (!CACHE.has(m)) CACHE.set(m, new Map()); CACHE.get(m).set(id, r); });
    sols.forEach(s => { if (!SOLS.has(s.mes)) SOLS.set(s.mes, []); SOLS.get(s.mes).push(s); });
  }
}
// Filas del rango: lo leído de los resúmenes, corregido con las OT que la app ya tiene en vivo
function filasDe(S, meses) {
  const m = new Map();
  meses.forEach(x => (CACHE.get(x) || new Map()).forEach((r, id) => m.set(id, r)));
  S.lista().forEach(o => m.set(o.id, { id: o.id, ...M.compacta(o) }));
  return [...m.values()];
}
function solsDe(S, meses) {
  const m = new Map();
  meses.forEach(x => (SOLS.get(x) || []).forEach(s => m.set(s.id, s)));
  S.solicitudes().forEach(s => m.set(s.id, s));
  return [...m.values()];
}

export async function vDashboard(S) {
  const main = S.ctx.main;
  const P = I.periodo(ST.tipo, ST.ref), Pp = I.periodo(ST.tipo, I.desplazar(ST.tipo, ST.ref, -1));
  // se leen también dos meses antes del periodo anterior, para las OT registradas antes y cerradas dentro
  const desdeLect = I.desplazar('mes', Pp.desde, -2);
  const meses = I.mesesEntre(desdeLect, P.hasta);
  if (meses.some(m => !CACHE.has(m))) {
    if (!main.querySelector('#dash')) main.innerHTML = '<div style="display:flex;justify-content:center;padding:80px 0"><div class="spinner"></div></div>';
    const clave = meses.join();
    if (CARGANDO !== clave) {
      CARGANDO = clave;
      try { await cargar(S, meses); } catch (e) { console.error(e); S.ctx.toast('No se pudieron leer los resúmenes del periodo.', 'err'); meses.forEach(m => { if (!CACHE.has(m)) CACHE.set(m, new Map()); }); }
      CARGANDO = null;
    } else return;
  }
  pintar(S, P, Pp, meses);
}

function pintar(S, P, Pp, meses) {
  ULT = [P, Pp, meses];
  const main = S.ctx.main;
  const hoy = I.iso(new Date()), ahora = M.ahoraLocal();
  const filas = filasDe(S, meses), sols = solsDe(S, meses), tareas = [...(S.pmp?.values() || [])], personas = S.personas();
  const base = { filas, sols, tareas, personas, cfg: S.cfg, F: ST.F, hoy, ahora, sistemas: SISTEMAS };
  // periodo en curso: se compara con el mismo tramo de días del periodo anterior, no con el periodo completo
  const enCurso = P.hasta > hoy && P.desde <= hoy;
  const dias = Math.round((M.deLocal(hoy) - M.deLocal(P.desde)) / 864e5);
  const finTramo = I.iso(new Date(M.deLocal(Pp.desde).getTime() + dias * 864e5));
  const Ppc = enCurso ? { ...Pp, hasta: finTramo < Pp.hasta ? finTramo : Pp.hasta, cubetas: [] } : Pp;
  const X = I.calcular({ ...base, P }), Xp = I.calcular({ ...base, P: Ppc });
  S.dashUltimo = { P, X };
  const zonas = SISTEMAS.map(s => s.nombre);
  const sel = (id, l, ops, v) => `<select class="field" data-f="${id}" aria-label="${l}"><option value="">${l}</option>${ops.map(([k, t]) => `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  const filtros = Object.values(ST.F).some(Boolean);
  const delta = (a, b, puntos, inv = false) => {
    if (a == null || b == null || !Xp.conDatos) return '';
    const d = puntos ? (a - b) * 100 : a - b; if (Math.abs(d) < 0.05) return '<span class="db-dl">= igual</span>';
    const bueno = inv ? d < 0 : d > 0;
    return `<span class="db-dl ${bueno ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${M.nf(Math.abs(d), puntos ? 0 : 0)}${puntos ? ' pts' : ''}</span>`;
  };
  const kpi = (c, l, v, sub, dl = '') => `<div class="db-kpi" style="--c:${c}"><span>${l}</span><b>${v}</b><small>${sub}</small>${dl ? `<em>${dl} <i>vs. periodo anterior</i></em>` : ''}</div>`;

  main.innerHTML = `<div id="dash">
    <div class="ot-head db-blk">
      <div><div class="eyebrow">Dashboard gerencial</div><h1 class="ot-h1">${esc(P.etiqueta)}</h1>
        <div class="ot-sub">${filtros ? 'Con filtros: ' + esc(textoFiltros(S)) : 'Toda la planta'} · ${Xp.conDatos ? (enCurso ? `periodo en curso, comparado con el mismo tramo de ${esc(Pp.etiqueta.toLowerCase())}` : `comparado con ${esc(Pp.etiqueta.toLowerCase())}`) : 'sin datos del periodo anterior para comparar'}</div></div>
      <div class="ot-nav db-noprint"><button class="btn" id="dXls">Exportar Excel</button><button class="btn btn-primary" id="dPdf">Exportar PDF</button></div>
    </div>
    <div class="db-bar db-noprint">
      <div class="ot-chips">${I.PERIODOS.map(p => `<button class="chip ${ST.tipo === p.id ? 'on' : ''}" data-p="${p.id}">${p.l}</button>`).join('')}</div>
      <div class="ot-nav"><button class="btn btn-icon" id="dAnt" aria-label="Anterior">${IC.atras}</button><button class="btn" id="dHoy">Actual</button><button class="btn btn-icon" id="dSig" aria-label="Siguiente" style="transform:scaleX(-1)">${IC.atras}</button></div>
    </div>
    <div class="db-fil db-noprint">
      ${sel('esp', 'Especialidad', M.ESPECIALIDADES.map(e => [e.id, e.l]), ST.F.esp)}
      ${sel('tec', 'Técnico', S.personas().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(p => [p.id, p.nombre]), ST.F.tec)}
      ${sel('sa', 'Área solicitante', (S.cfg.areasSolicitantes || []).map(a => [a, a]), ST.F.sa)}
      ${sel('z', 'Zona', zonas.map(z => [z, z]), ST.F.z)}
      ${sel('o', 'Origen', M.ORIGENES.map(o => [o.id, o.l]), ST.F.o)}
      ${sel('c', 'Criticidad', M.CRITICIDADES.map(c => [c.id, c.l]), ST.F.c)}
      ${filtros ? '<button class="btn" id="dLim">Quitar filtros</button>' : ''}
    </div>

    <div class="db-kpis db-blk">
      ${kpi('#1B86C4', 'Cumplimiento PMP', pct(X.pmp.pct), `${X.pmp.hechas} de ${X.pmp.prog} tareas · a tiempo ${pct(X.pmp.pctTiempo)}`, delta(X.pmp.pct, Xp.pmp.pct, true))}
      ${kpi('#5564D8', 'Cumplimiento de solicitudes', pct(X.sol.pct), `${X.sol.num} de ${X.sol.den} en plazo${X.sol.horasProm != null ? ` · atención ${tiempo(X.sol.horasProm)}` : ''}`, delta(X.sol.pct, Xp.sol.pct, true))}
      ${kpi('#087F74', 'OT ejecutadas', X.ejec, `${X.reg} registradas · a tiempo ${pct(X.pctTiempo)}`, delta(X.ejec, Xp.ejec, false))}
      ${kpi('#0B9A8B', 'HH utilizadas', M.nf(X.hhUtil, 0), `de ${M.nf(X.hhDisp, 0)} disponibles · uso ${pct(X.uso)}`, delta(X.uso, Xp.uso, true))}
      ${kpi('#B77908', 'Backlog', X.backlog, `${M.nf(X.hhBacklog, 0)} HH · ${X.semanasBacklog == null ? '—' : M.nf(X.semanasBacklog, 1)} semanas · ${X.vencidas} vencidas`, delta(X.backlog, Xp.backlog, false, true))}
      ${kpi('#991B1B', 'Preventivo / emergencias', pct(X.pctPrev), `de lo ejecutado · ${X.emergencias} emergencias`, delta(X.pctPrev, Xp.pctPrev, true))}
    </div>

    <div class="db-g2">
      ${P.cubetas.length ? card('Tendencia', 'OT registradas y ejecutadas, y cumplimiento del PMP', '<canvas id="cTend"></canvas>', 'wide') : ''}
      ${card('Tipo de mantenimiento', 'OT ejecutadas en el periodo', `<canvas id="cTipo"></canvas>`)}
    </div>
    <div class="db-g2">
      ${P.cubetas.length ? card('Horas hombre', 'Utilizadas frente a disponibles (personal de mantenimiento)', '<canvas id="cHH"></canvas>', 'wide') : ''}
      ${card('Por especialidad', 'HH registradas en el periodo', '<canvas id="cEsp"></canvas>')}
    </div>
    <div class="db-g3">
      ${card('Por área de trabajo', 'OT ejecutadas (las 8 con más trabajos)', '<canvas id="cArea"></canvas>')}
      ${card('Por área solicitante', 'OT registradas', '<canvas id="cSol"></canvas>')}
      ${card('Criticidad', 'Registradas, ejecutadas y abiertas', '<canvas id="cCrit"></canvas>')}
    </div>
    <div class="db-g2">
      ${card('Backlog por antigüedad', `${X.backlog} OT abiertas al cierre del periodo · ${X.vencidas} con plazo vencido`, '<canvas id="cAnt"></canvas>')}
      ${card('Productividad por especialidad', 'HH registradas sobre disponibles', prodEsp(X))}
    </div>
    <section class="glass db-card db-blk"><h3>Productividad por técnico</h3><p class="ot-hint">HH registradas en OT sobre HH disponibles; mide lo registrado, por eso se muestra junto a las OT ejecutadas y su cumplimiento de plazo.</p>
      ${prodTec(X)}</section>
    <p class="ot-hint db-blk" style="margin-top:12px">Cumplimiento PMP: tareas del Plan preventivo de semanas ya terminadas dentro del periodo que se ejecutaron (a tiempo: dentro de su semana). Solicitudes: atendidas dentro del plazo de su OT sobre las que ya vencieron o se atendieron (las rechazadas no cuentan). HH disponibles a la fecha, desde el inicio del registro (${esc(M.fh(X.inicioReg, false))}): turnos, dedicación y ausencias del personal de mantenimiento${X.hhApoyo ? `; además, ${M.nf(X.hhApoyo, 1)} HH de apoyo de operación` : ''}${X.hhTer ? `; ${M.nf(X.hhTer, 1)} HH de terceros` : ''}.</p>
  </div>`;

  enlazar(S, P, Pp);
  graficos(X, P);
}

const card = (t, sub, cuerpo, cls = '') => `<section class="glass db-card db-blk ${cls}"><h3>${t}</h3><p class="ot-hint">${sub}</p><div class="db-ch">${cuerpo}</div></section>`;
const tiempo = (h) => h < 48 ? `${M.nf(h, 1)} h` : `${M.nf(h / 24, 1)} días`;

function prodEsp(X) {
  if (!X.prodEsp.length) return '<div class="ot-vacio sm">Sin personal ni horas en el periodo.</div>';
  return `<div class="db-prod">${X.prodEsp.map(e => `<div class="db-pr"><span>${esc(e.l)}</span><div class="cp-mini"><i style="width:${Math.min(100, (e.pct || 0) * 100)}%;--c:${e.c}"></i></div><b class="num">${pct(e.pct)}</b><small class="num">${M.nf(e.hh, 0)} / ${M.nf(e.disp, 0)} HH · ${e.ot} OT</small></div>`).join('')}</div>`;
}
function prodTec(X) {
  if (!X.tecnicos.length) return '<div class="ot-vacio sm">Sin horas registradas en el periodo.</div>';
  return `<div class="ot-tabla" style="box-shadow:none"><table class="table"><thead><tr><th>Técnico</th><th>Especialidad</th><th class="r">HH registradas</th><th class="r">HH disponibles</th><th style="width:24%">Uso</th><th class="r">OT ejecutadas</th><th class="r">A tiempo</th></tr></thead>
    <tbody>${X.tecnicos.map(t => `<tr><td><b>${esc(t.p.nombre)}</b>${t.p.tipo === 'oper' ? '<small class="ot-hint"> · operación</small>' : ''}</td><td>${esc(M.espDe(t.p.especialidad).l)}</td>
      <td class="r num">${M.nf(t.hh, 1)}</td><td class="r num">${t.disp ? M.nf(t.disp, 0) : '—'}</td>
      <td><div class="cp-mini"><i style="width:${Math.min(100, (t.pct || 0) * 100)}%;--c:${M.espDe(t.p.especialidad).c}"></i></div><small class="num">${pct(t.pct)}</small></td>
      <td class="r num">${t.ot}</td><td class="r num">${pct(t.aTiempo)}</td></tr>`).join('')}</tbody></table></div>`;
}

function textoFiltros(S) {
  const F = ST.F, t = [];
  if (F.esp) t.push(M.espDe(F.esp).l); if (F.tec) t.push(S.per.get(F.tec)?.nombre || 'técnico');
  if (F.sa) t.push(F.sa); if (F.z) t.push(F.z); if (F.o) t.push(M.origenDe(F.o).l); if (F.c) t.push(M.critDe(F.c).l);
  return t.join(' · ');
}

function enlazar(S, P, Pp) {
  const main = S.ctx.main, re = () => vDashboard(S);
  main.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { ST.tipo = b.dataset.p; ANIM = true; re(); });
  main.querySelector('#dAnt').onclick = () => { ST.ref = I.desplazar(ST.tipo, ST.ref, -1); ANIM = true; re(); };
  main.querySelector('#dSig').onclick = () => { ST.ref = I.desplazar(ST.tipo, ST.ref, 1); ANIM = true; re(); };
  main.querySelector('#dHoy').onclick = () => { ST.ref = I.iso(new Date()); ANIM = true; re(); };
  main.querySelectorAll('[data-f]').forEach(s => s.onchange = () => { ST.F[s.dataset.f] = s.value; ANIM = true; re(); });
  const l = main.querySelector('#dLim'); if (l) l.onclick = () => { Object.keys(ST.F).forEach(k => { ST.F[k] = ''; }); ANIM = true; re(); };
  main.querySelector('#dPdf').onclick = () => exportarPDF(S, P);
  main.querySelector('#dXls').onclick = () => exportarExcel(S, P);
}

// ---------------- gráficos ----------------
function graficos(X, P) {
  CHARTS.forEach(c => c.destroy()); CHARTS = [];
  if (!window.Chart) return;
  const Ch = window.Chart;
  Ch.defaults.font.family = "'Geist',ui-sans-serif,system-ui,sans-serif"; Ch.defaults.font.size = 11.5; Ch.defaults.color = '#42525E';
  Ch.defaults.animation = ANIM ? { duration: 600 } : false; ANIM = false;
  const grid = { color: 'rgba(15,27,36,.07)' }, nuevo = (id, cfg) => { const el = document.getElementById(id); if (el) CHARTS.push(new Ch(el, { ...cfg, options: { maintainAspectRatio: false, responsive: true, ...cfg.options } })); };
  const leyenda = { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14 } };
  const horiz = (id, labels, data, color, unidad = '') => nuevo(id, { type: 'bar', data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 5, maxBarThickness: 22 }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${M.nf(c.raw, 1)}${unidad}` } } }, scales: { x: { grid, beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });

  if (P.cubetas.length) {
    nuevo('cTend', { type: 'bar', data: { labels: X.tend.map(t => t.l), datasets: [
      { label: 'Registradas', data: X.tend.map(t => t.reg), backgroundColor: '#BFD7EA', borderRadius: 5, maxBarThickness: 28, order: 2 },
      { label: 'Ejecutadas', data: X.tend.map(t => t.ejec), backgroundColor: '#0B9A8B', borderRadius: 5, maxBarThickness: 28, order: 2 },
      { label: 'Cumplimiento PMP', type: 'line', data: X.tend.map(t => t.pmp == null ? null : Math.round(t.pmp * 100)), borderColor: '#1B86C4', backgroundColor: '#1B86C4', yAxisID: 'y2', tension: .3, spanGaps: true, pointRadius: 3, order: 1 }] },
      options: { plugins: { legend: leyenda }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'OT' } }, y2: { position: 'right', min: 0, max: 100, grid: { display: false }, ticks: { callback: v => v + ' %' } } } } });
    nuevo('cHH', { type: 'bar', data: { labels: X.tend.map(t => t.l), datasets: [
      { label: 'Disponibles', data: X.tend.map(t => t.disp == null ? null : Math.round(t.disp)), backgroundColor: '#D5DEE5', borderRadius: 5, maxBarThickness: 28 },
      { label: 'Utilizadas', data: X.tend.map(t => Math.round(t.hh * 10) / 10), backgroundColor: '#087F74', borderRadius: 5, maxBarThickness: 28 }] },
      options: { plugins: { legend: leyenda }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true, title: { display: true, text: 'HH' } } } } });
    const tipos = M.TIPOS_MANT.filter(t => X.tend.some(b => b.tipos[t.id]));
    nuevo('cTipo', { type: 'bar', data: { labels: X.tend.map(t => t.l), datasets: tipos.map(t => ({ label: t.l, data: X.tend.map(b => { const tot = Object.values(b.tipos).reduce((a, c) => a + c, 0); return tot ? Math.round(b.tipos[t.id] / tot * 100) : 0; }), backgroundColor: TIPO_C[t.id], maxBarThickness: 28 })) },
      options: { plugins: { legend: leyenda, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} %` } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, max: 100, grid, ticks: { callback: v => v + ' %' } } } } });
  } else {
    const t = X.porTipo.filter(x => x.n);
    nuevo('cTipo', { type: 'doughnut', data: { labels: t.map(x => x.l), datasets: [{ data: t.map(x => x.n), backgroundColor: t.map(x => TIPO_C[x.id]), borderWidth: 2, borderColor: '#fff' }] }, options: { cutout: '62%', plugins: { legend: leyenda } } });
  }
  horiz('cEsp', X.porEsp.map(e => e.l), X.porEsp.map(e => Math.round(e.hh * 10) / 10), X.porEsp.map(e => e.c), ' HH');
  horiz('cArea', X.porArea.map(a => a[0]), X.porArea.map(a => a[1]), '#5564D8', ' OT');
  horiz('cSol', X.porSol.map(a => a[0]), X.porSol.map(a => a[1]), '#1B86C4', ' OT');
  nuevo('cCrit', { type: 'bar', data: { labels: X.porCrit.map(c => c.l), datasets: [
    { label: 'Registradas', data: X.porCrit.map(c => c.reg), backgroundColor: '#BFD7EA', borderRadius: 4, maxBarThickness: 18 },
    { label: 'Ejecutadas', data: X.porCrit.map(c => c.ejec), backgroundColor: '#0B9A8B', borderRadius: 4, maxBarThickness: 18 },
    { label: 'Abiertas', data: X.porCrit.map(c => c.abiertas), backgroundColor: X.porCrit.map(c => c.c), borderRadius: 4, maxBarThickness: 18 }] },
    options: { plugins: { legend: leyenda }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true, ticks: { precision: 0 } } } } });
  nuevo('cAnt', { type: 'bar', data: { labels: X.antig.map(a => a.l), datasets: [{ data: X.antig.map(a => a.n), backgroundColor: ['#0B9A8B', '#B77908', '#B91C1C'], borderRadius: 6, maxBarThickness: 46 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'OT' } } } } });
}

// ---------------- exportación ----------------
const cargarScript = (src) => new Promise((ok, no) => {
  if ([...document.scripts].some(s => s.src === src)) return ok();
  const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('No se pudo cargar ' + src)); document.head.appendChild(s);
});
const espera = (ms) => new Promise(r => setTimeout(r, ms));

async function exportarPDF(S, P) {
  try {
    S.ctx.toast('Generando PDF…');
    await Promise.all([cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'), cargarScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')]);
    document.body.classList.add('db-pdf'); ANIM = false; pintar(S, ...ULT);
    await espera(400);
    const view = document.getElementById('dash'), vr = view.getBoundingClientRect(), W = view.offsetWidth;
    const bloques = [...view.querySelectorAll('.db-blk')].map(el => { const r = el.getBoundingClientRect(); return { t: r.top - vr.top, b: r.bottom - vr.top }; }).sort((a, b) => a.t - b.t);
    const H = Math.max(...bloques.map(b => b.b)) + 6, SC = 2;
    const canvas = await window.html2canvas(view, { scale: SC, backgroundColor: '#E1E8ED', windowWidth: W + 40, logging: false });
    const PW = 297, PH = 210, MG = 8, HD = 15, FT = 8, cw = PW - 2 * MG, k = cw / W, alto = (PH - MG - HD - FT - 4) / k;
    const cortes = []; let ini = 0;
    while (ini < H - 4) {
      const lim = ini + alto, fines = bloques.filter(b => b.b > ini + 2 && b.b <= lim).map(b => b.b);
      let fin = fines.length ? Math.max(...fines) + 4 : Math.min(lim, H);
      if (fin >= H - 4) fin = H;
      cortes.push([ini, fin]);
      const sig = bloques.filter(b => b.t >= fin - 1).map(b => b.t); ini = sig.length ? Math.max(fin, Math.min(...sig) - 2) : fin;
    }
    const { jsPDF } = window.jspdf, pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filtros = Object.values(ST.F).some(Boolean) ? ' · ' + textoFiltros(S) : '';
    cortes.forEach(([a, b], i) => {
      if (i) pdf.addPage();
      pdf.setFillColor(225, 232, 237); pdf.rect(0, 0, PW, PH, 'F');
      pdf.setFillColor(15, 27, 36); pdf.rect(0, 0, PW, HD, 'F'); pdf.setFillColor(11, 154, 139); pdf.rect(0, HD, PW, 0.8, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13); pdf.text('Órdenes de trabajo · Dashboard gerencial', MG, 9.5);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(201, 212, 223); pdf.text(P.etiqueta + filtros, PW - MG, 9.5, { align: 'right' });
      const h = Math.round((b - a) * SC), pc = document.createElement('canvas'); pc.width = canvas.width; pc.height = h;
      pc.getContext('2d').drawImage(canvas, 0, Math.round(a * SC), canvas.width, h, 0, 0, canvas.width, h);
      pdf.addImage(pc.toDataURL('image/jpeg', 0.92), 'JPEG', MG, HD + 4, cw, (b - a) * k);
      pdf.setFontSize(8); pdf.setTextColor(70, 83, 95); pdf.text('Elvis Miranda — Departamento de Mantenimiento', MG, PH - 4);
      pdf.text(`Página ${i + 1} de ${cortes.length}`, PW - MG, PH - 4, { align: 'right' });
    });
    pdf.save(`Dashboard_OT_${P.desde}_${P.hasta}.pdf`);
  } catch (e) { console.error(e); S.ctx.toast(e.message || 'No se pudo generar el PDF.', 'err'); }
  finally { document.body.classList.remove('db-pdf'); vDashboard(S); }
}

async function exportarExcel(S, P) {
  try {
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
    const X = S.dashUltimo.X, wb = new window.ExcelJS.Workbook();
    const cab = (ws, cols) => { ws.columns = cols; const r = ws.getRow(1); r.font = { bold: true, color: { argb: 'FFFFFFFF' } }; r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1B24' } }; r.alignment = { vertical: 'middle' }; r.height = 20; ws.views = [{ state: 'frozen', ySplit: 1 }]; };
    const w1 = wb.addWorksheet('Indicadores');
    cab(w1, [{ header: 'Indicador', key: 'k', width: 34 }, { header: 'Valor', key: 'v', width: 18 }, { header: 'Detalle', key: 'd', width: 60 }]);
    const fil = Object.values(ST.F).some(Boolean) ? textoFiltros(S) : 'Toda la planta';
    [['Periodo', P.etiqueta, `${P.desde} al ${P.hasta}`], ['Filtros', fil, ''],
     ['Cumplimiento PMP', X.pmp.pct, `${X.pmp.hechas} de ${X.pmp.prog} tareas; a tiempo ${pct(X.pmp.pctTiempo)}`],
     ['Cumplimiento de solicitudes', X.sol.pct, `${X.sol.num} de ${X.sol.den} en plazo; ${X.sol.rechazadas} rechazadas`],
     ['OT registradas', X.reg, ''], ['OT ejecutadas', X.ejec, `a tiempo ${pct(X.pctTiempo)}`],
     ['HH utilizadas', Math.round(X.hhUtil * 10) / 10, `de ${M.nf(X.hhDisp, 0)} disponibles (uso ${pct(X.uso)})`],
     ['Backlog (OT)', X.backlog, `${M.nf(X.hhBacklog, 0)} HH; ${X.vencidas} vencidas`], ['Preventivo de lo ejecutado', X.pctPrev, ''], ['Emergencias', X.emergencias, '']]
      .forEach(([k, v, d]) => { const r = w1.addRow({ k, v, d }); if (typeof v === 'number' && v <= 1 && /Cumplimiento|Preventivo/.test(k)) r.getCell('v').numFmt = '0%'; });
    const w2 = wb.addWorksheet('OT del periodo');
    cab(w2, [['N°', 'n', 14], ['Registro', 'f', 17], ['Origen', 'o', 20], ['Tipo', 'tp', 16], ['Estado', 'e', 14], ['Prioridad', 'p', 10], ['Criticidad', 'c', 12], ['Zona', 'z', 20], ['Área de trabajo', 'a', 24],
      ['Equipo', 'eq', 14], ['Área solicitante', 'sa', 16], ['Descripción', 'd', 50], ['Especialidades', 'es', 28], ['Técnicos', 'tec', 34], ['Inicio', 'i', 17], ['Término', 'fi', 17], ['HH', 'hh', 8], ['HH tercero', 'ht', 10], ['Fecha límite', 'fl', 17], ['A tiempo', 'at', 10]]
      .map(([header, key, width]) => ({ header, key, width })));
    X.filasPeriodo.sort((a, b) => String(a.f).localeCompare(String(b.f))).forEach(r => w2.addRow({
      n: r.n, f: r.f.replace('T', ' '), o: M.origenDe(r.o).l, tp: M.tipoDe(r.tp).l, e: M.estDe(r.e).l, p: r.p, c: M.critDe(r.c).l, z: r.z, a: r.a, eq: r.eq, sa: r.sa, d: r.d,
      es: (r.es || []).map(e => M.espDe(e).l).join(', '), tec: (r.t || []).map(t => `${t.n} (${t.h} h)`).join(', '), i: (r.i || '').replace('T', ' '), fi: (r.fi || '').replace('T', ' '),
      hh: r.hh, ht: r.ht, fl: (r.fl || '').replace('T', ' '), at: r.fi ? (!r.fl || r.fi <= r.fl ? 'Sí' : 'No') : '' }));
    const w3 = wb.addWorksheet('Técnicos');
    cab(w3, [{ header: 'Técnico', key: 'n', width: 28 }, { header: 'Especialidad', key: 'e', width: 26 }, { header: 'HH registradas', key: 'hh', width: 15 }, { header: 'HH disponibles', key: 'd', width: 15 }, { header: 'Uso', key: 'u', width: 10 }, { header: 'OT ejecutadas', key: 'ot', width: 14 }, { header: 'A tiempo', key: 'at', width: 10 }]);
    X.tecnicos.forEach(t => { const r = w3.addRow({ n: t.p.nombre, e: M.espDe(t.p.especialidad).l, hh: Math.round(t.hh * 10) / 10, d: Math.round(t.disp), u: t.pct, ot: t.ot, at: t.aTiempo }); r.getCell('u').numFmt = '0%'; r.getCell('at').numFmt = '0%'; });
    const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `OT_${P.desde}_${P.hasta}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { console.error(e); S.ctx.toast(e.message || 'No se pudo generar el Excel.', 'err'); }
}
