// Plan preventivo — Resumen (dashboard del planner)
// Recibe el estado del módulo (tareas, configuración y utilidades) y pinta indicadores, gráficos, alertas y tablas.
// Definiciones (por ocurrencia = semana programada de una tarea, en su semana efectiva si fue reprogramada):
//   Cumplimiento = ejecutadas / vencidas (semanas ya cerradas) · Avance = ejecutadas / programadas del periodo
//   Backlog = ocurrencias atrasadas a la fecha (HH y semanas de capacidad) · % reprogramación = reprogramadas / programadas
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];
const MESL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Estados (reservados, siempre con texto) y especialidades (paleta categórica validada para fondo oscuro, orden fijo)
const ST = { hecho: '#2ec4a6', atrasada: '#ff6b6b', pend: '#8b9bb0', no: '#5d6b79', meta: '#f5b54a' };
const COL_ROL = { 'Frigorista': '#3987e5', 'Mecánico': '#d95926', 'Electricista': '#199e70', 'Soldador': '#c98500', 'Op. calderos': '#d55181', 'Op. ósmosis': '#9085e9', 'Tercero': '#8b9bb0' };
const META = 90;

const F = { periodo: '', sis: '', rol: '', crit: '' };
let GR = [];

const CSS = `
.rs-f{display:flex;gap:10px 14px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid var(--pp-line)}
.rs-f label{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3);font-weight:600}
.rs-f select{height:38px;font-size:13px;padding:0 30px 0 10px;width:auto;min-width:150px;text-transform:none;letter-spacing:0}
.rs-f .nota{margin-left:auto;font-size:12px;color:var(--tx-3);max-width:340px;line-height:1.4}
.rs-k{display:grid;grid-template-columns:1.25fr repeat(5,minmax(0,1fr));gap:12px;margin-bottom:12px}
.rs-t{background:var(--pp-card);border:1px solid var(--pp-line);border-radius:14px;padding:14px 16px;position:relative;overflow:hidden}
.rs-t::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--c,#3bb4e5)}
.rs-t .l{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--tx-3);font-weight:600}
.rs-t .v{font-family:var(--f-display);font-size:30px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;line-height:1.1}
.rs-t .v small{font-size:14px;color:var(--tx-3);font-weight:600}
.rs-t .s{font-size:12px;color:var(--tx-3);margin-top:4px;line-height:1.35}
.rs-t.hero{display:flex;gap:14px;align-items:center}
.rs-ring{width:92px;height:92px;flex:none}
.rs-ring circle{fill:none;stroke-width:10}
.rs-ring text{fill:var(--tx);font:700 19px var(--f-display);text-anchor:middle;dominant-baseline:central}
.rs-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px;margin-top:6px}
.rs-g{display:grid;gap:12px;margin-bottom:12px}
.rs-g2{grid-template-columns:1.55fr 1fr}.rs-g3{grid-template-columns:repeat(3,minmax(0,1fr))}.rs-g11{grid-template-columns:1fr 1fr}
.rs-c{background:var(--pp-card);border:1px solid var(--pp-line);border-radius:16px;padding:14px 16px;min-width:0}
.rs-c h3{margin:0;font-family:var(--f-display);font-weight:600;font-size:15px;display:flex;align-items:center;gap:8px}
.rs-c h3::before{content:"";width:4px;height:15px;border-radius:2px;background:var(--pp-acc)}
.rs-c .sub{font-size:12px;color:var(--tx-3);margin:3px 0 10px}
.rs-cv{position:relative;height:260px}
.rs-cv.sm{height:220px}
.rs-leg{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--tx-2);margin-bottom:6px}
.rs-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.rs-al{display:flex;flex-direction:column;gap:8px;max-height:420px;overflow:auto}
.rs-a{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--pp-line)}
.rs-a .ic{width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:700 13px var(--f-display)}
.rs-a b{font-size:13.5px;display:block}
.rs-a span{font-size:12.5px;color:var(--tx-2);line-height:1.45}
.rs-hb{display:grid;grid-template-columns:120px minmax(0,1fr) 92px;gap:10px;align-items:center;font-size:12.5px;margin-bottom:9px}
.rs-hb .tr{height:14px;border-radius:7px;background:rgba(255,255,255,.07);overflow:hidden;display:flex;gap:2px}
.rs-hb .tr div{height:100%}
.rs-hb .tr div:first-child{border-radius:7px 0 0 7px}.rs-hb .tr div:last-child{border-radius:0 7px 7px 0}
.rs-hb .n{text-align:right;font-variant-numeric:tabular-nums;color:var(--tx-2)}
.rs-tb{width:100%;border-collapse:collapse;font-size:12.5px}
.rs-tb th{font:500 10.5px var(--f-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--tx-3);text-align:left;padding:8px;border-bottom:1px solid var(--pp-line)}
.rs-tb td{padding:8px;border-bottom:1px solid var(--pp-line);vertical-align:top}
.rs-tb td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.rs-cod{font-family:var(--f-mono);color:var(--mint-2);font-size:12px}
.rs-vacio{color:var(--tx-3);font-size:13px;padding:18px 4px;text-align:center}
details.rs-tab summary{cursor:pointer;font-size:12px;color:var(--tx-3);margin-top:8px}
@media (max-width:1200px){.rs-k{grid-template-columns:repeat(3,minmax(0,1fr))}.rs-t.hero{grid-column:1/-1}}
@media (max-width:900px){.rs-g2,.rs-g3,.rs-g11{grid-template-columns:minmax(0,1fr)}.rs-k{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

export function vResumen(box, M) {
  if (!document.getElementById('rscss')) document.head.insertAdjacentHTML('beforeend', `<style id="rscss">${CSS}</style>`);
  GR.forEach(c => { try { c.destroy(); } catch (e) {} }); GR = [];
  const { CFG, TAR, HOY, ocurrencias, hhProp, sisNom, FREC, corto, masSem, deIso, numSem } = M;
  const semanas = Array.from({ length: 52 }, (_, i) => masSem(CFG.inicio, i));
  const mesesK = [...new Set(semanas.map(s => s.slice(0, 7)))];
  const ref = HOY < CFG.inicio ? CFG.inicio : HOY > semanas[51] ? semanas[51] : HOY;
  if (!F.periodo) F.periodo = 'm:' + ref.slice(0, 7);
  // trimestres calendario que toca el plan
  const trims = [...new Set(mesesK.map(k => { const [y, m] = k.split('-').map(Number); return `${y}-Q${Math.floor((m - 1) / 3) + 1}`; }))];
  const semPeriodo = () => {
    const [tipo, v] = F.periodo.split(':');
    if (tipo === 'plan') return semanas;
    if (tipo === 'ac') return semanas.filter(s => s <= ref);
    if (tipo === 'q') { const [y, q] = v.split('-Q').map(Number); return semanas.filter(s => { const d = deIso(s); return d.getFullYear() === y && Math.floor(d.getMonth() / 3) + 1 === q; }); }
    return semanas.filter(s => s.slice(0, 7) === v);
  };
  const SP = semPeriodo(), SET = new Set(SP);
  const nomPeriodo = (() => { const [t, v] = F.periodo.split(':'); if (t === 'plan') return 'todo el plan'; if (t === 'ac') return 'acumulado a la fecha'; if (t === 'q') { const [y, q] = v.split('-Q'); return `${q}.º trimestre ${y}`; } const [y, m] = v.split('-').map(Number); return `${MESL[m - 1]} ${y}`; })();

  const pasa = (t) => t.frec !== 'D' && (F.sis === '' || String(t.sistema) === F.sis) && (!F.rol || (t.resp || {})[F.rol] != null) && (!F.crit || t.crit === F.crit);
  const T = TAR.filter(pasa);
  const OC = T.flatMap(ocurrencias);
  const P = OC.filter(o => SET.has(o.ef));
  const hechas = P.filter(o => o.est === 'hecho');
  const venc = P.filter(o => o.ef < HOY);
  const vencH = venc.filter(o => o.est === 'hecho');
  const cumpl = venc.length ? Math.round(vencH.length / venc.length * 100) : null;
  const avance = P.length ? Math.round(hechas.length / P.length * 100) : 0;
  const hhP = P.reduce((a, o) => a + hhProp(o.t), 0), hhE = hechas.reduce((a, o) => a + hhProp(o.t), 0);
  const repro = P.filter(o => o.reprog).length;
  const back = OC.filter(o => o.est === 'atrasada');
  const hhBack = back.reduce((a, o) => a + hhProp(o.t), 0);
  const capSem = Object.entries(CFG.capacidad || {}).filter(([r]) => !F.rol || r === F.rol).reduce((a, [, c]) => a + c.hhMes * 12 / 52, 0);
  const backSem = capSem ? hhBack / capSem : 0;
  const terc = P.filter(o => (o.t.resp || {})['Tercero'] != null);
  const est = cumpl == null ? { t: 'Sin semanas cerradas', c: ST.pend } : cumpl >= META ? { t: 'En meta', c: ST.hecho } : cumpl >= 75 ? { t: 'Bajo meta', c: ST.meta } : { t: 'Crítico', c: ST.atrasada };
  const pctTxt = (n) => n == null ? '—' : `${n}<small>%</small>`;
  const f1 = (n) => n.toFixed(1).replace('.', ',');
  const sisOpts = [...new Set(TAR.map(t => String(t.sistema)))].filter(x => x !== '').sort();
  const roles = Object.keys(COL_ROL).filter(r => TAR.some(t => (t.resp || {})[r] != null));

  // ---------- alertas ----------
  const alertas = [];
  const backA = back.filter(o => o.t.crit === 'A');
  if (backA.length) alertas.push({ n: 3, ic: '!', c: ST.atrasada, t: `${backA.length} tarea${backA.length > 1 ? 's' : ''} atrasada${backA.length > 1 ? 's' : ''} en equipos de criticidad A`, d: [...new Set(backA.map(o => o.t.eq))].slice(0, 6).join(', ') + (new Set(backA.map(o => o.t.eq)).size > 6 ? '…' : '') });
  if (back.length - backA.length > 0) alertas.push({ n: 2, ic: '!', c: ST.meta, t: `${back.length - backA.length} tarea${back.length - backA.length > 1 ? 's' : ''} atrasada${back.length - backA.length > 1 ? 's' : ''} en otros equipos`, d: `Backlog total ${f1(hhBack)} HH (${f1(backSem)} semanas de capacidad).` });
  const noEj = OC.filter(o => o.est === 'no' && SET.has(o.ef));
  if (noEj.length) alertas.push({ n: 2, ic: '×', c: ST.meta, t: `${noEj.length} tarea${noEj.length > 1 ? 's' : ''} marcada${noEj.length > 1 ? 's' : ''} como no ejecutada${noEj.length > 1 ? 's' : ''}`, d: noEj.slice(0, 3).map(o => `${o.t.eq} ${o.t.rutina}: ${o.e?.obs || ''}`).join(' · ') });
  if (cumpl != null && cumpl < META) alertas.push({ n: 3, ic: '%', c: ST.atrasada, t: `Cumplimiento ${cumpl} % bajo la meta de ${META} %`, d: `${venc.length - vencH.length} tareas vencidas sin ejecutar en ${nomPeriodo}.` });
  // sobrecarga por especialidad en las próximas 8 semanas
  const prox8 = semanas.filter(s => s >= ref).slice(0, 8);
  Object.entries(CFG.capacidad || {}).forEach(([r, c]) => {
    const cap = c.hhMes * 12 / 52;
    prox8.forEach(s => {
      const hh = TAR.filter(t => t.frec !== 'D').flatMap(ocurrencias).filter(o => o.ef === s && o.est !== 'hecho').reduce((a, o) => a + ((o.t.resp || {})[r] || 0), 0);
      if (hh > cap) alertas.push({ n: 2, ic: '↑', c: ST.meta, t: `Sobrecarga de ${r}: semana del ${corto(s)}`, d: `${f1(hh)} HH programadas frente a ${f1(cap)} HH disponibles. Conviene reprogramar parte.` });
    });
  });
  // servicios de terceros próximos (30 días) para gestionar OC/OS a tiempo
  const lim = masSem(ref, 5);
  const tercProx = TAR.filter(t => (t.resp || {})['Tercero'] != null).flatMap(ocurrencias).filter(o => o.est === 'pendiente' && o.ef >= ref && o.ef <= lim);
  if (tercProx.length) alertas.push({ n: 1, ic: 'S', c: '#7cc8f8', t: `${tercProx.length} servicio${tercProx.length > 1 ? 's' : ''} de terceros en las próximas 5 semanas`, d: 'Gestionar pedido y orden de servicio con anticipación: ' + [...new Set(tercProx.map(o => `${o.t.eq} (${corto(o.ef)})`))].slice(0, 5).join(', ') });
  // overhauls próximos
  Object.entries(CFG.eventos || {}).forEach(([eq, l]) => l.filter(x => x.semana >= ref && x.semana <= masSem(ref, 8)).forEach(x => alertas.push({ n: 1, ic: 'O', c: '#c9a7ff', t: `${eq}: ${x.texto}`, d: `Semana del ${corto(x.semana)}. Coordinar con Producción y verificar repuestos.` })));
  // por horómetro próximas
  const hor = TAR.filter(t => t.porHoras).flatMap(ocurrencias).filter(o => o.est === 'pendiente' && o.ef >= ref && o.ef <= masSem(ref, 3));
  if (hor.length) alertas.push({ n: 1, ic: 'h', c: '#7cc8f8', t: `${hor.length} tarea${hor.length > 1 ? 's' : ''} por horómetro en las próximas 4 semanas`, d: 'Verificar las horas reales antes de ejecutar: ' + [...new Set(hor.map(o => o.t.eq))].join(', ') });
  alertas.sort((a, b) => b.n - a.n);

  // ---------- agregados ----------
  const porSemana = SP.map(s => {
    const os = P.filter(o => o.ef === s);
    return { s, h: os.filter(o => o.est === 'hecho').length, a: os.filter(o => o.est === 'atrasada' || o.est === 'no').length, p: os.filter(o => o.est === 'pendiente').length };
  });
  const agrupar = (clave) => {
    const g = new Map();
    P.forEach(o => { const k = clave(o); if (k == null) return; [].concat(k).forEach(x => { const r = g.get(x) || { h: 0, a: 0, p: 0, v: 0, vh: 0 }; r[o.est === 'hecho' ? 'h' : o.est === 'pendiente' ? 'p' : 'a']++; if (o.ef < HOY) { r.v++; if (o.est === 'hecho') r.vh++; } g.set(x, r); }); });
    return [...g.entries()];
  };
  const porSis = agrupar(o => sisNom(o.t.sistema) || '—').sort((a, b) => (b[1].h + b[1].a + b[1].p) - (a[1].h + a[1].a + a[1].p));
  const porRol = agrupar(o => Object.keys(o.t.resp || {})).sort((a, b) => Object.keys(COL_ROL).indexOf(a[0]) - Object.keys(COL_ROL).indexOf(b[0]));
  const usoCap = Object.entries(CFG.capacidad || {}).map(([r, c]) => {
    const hh = P.reduce((a, o) => a + ((o.t.resp || {})[r] || 0), 0), cap = c.hhMes * 12 / 52 * SP.length;
    return { r, hh, cap, pct: cap ? Math.round(hh / cap * 100) : 0 };
  }).filter(x => !F.rol || x.r === F.rol);
  const porFrec = ['S', 'M', 'TRI', 'SEM', 'A', 'U'].map(k => ({ k, n: P.filter(o => o.t.frec === k).length })).filter(x => x.n);
  const topAtr = [...back.reduce((m, o) => m.set(o.t.eq, [...(m.get(o.t.eq) || []), o]), new Map()).entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8);
  const claves = OC.filter(o => o.est !== 'hecho' && o.ef >= ref && o.ef <= masSem(ref, 1) && ['SEM', 'A', 'TRI', 'U'].includes(o.t.frec)).sort((a, b) => a.ef.localeCompare(b.ef) || (b.t.crit === 'A') - (a.t.crit === 'A'));

  const barra = (r) => { const tot = r.h + r.a + r.p || 1; return `<div class="tr">${r.h ? `<div style="width:${r.h / tot * 100}%;background:${ST.hecho}"></div>` : ''}${r.a ? `<div style="width:${r.a / tot * 100}%;background:${ST.atrasada}"></div>` : ''}${r.p ? `<div style="width:${r.p / tot * 100}%;background:${ST.pend}"></div>` : ''}</div>`; };
  const legEst = `<div class="rs-leg"><span><i style="background:${ST.hecho}"></i>Ejecutadas</span><span><i style="background:${ST.atrasada}"></i>Atrasadas / no ejecutadas</span><span><i style="background:${ST.pend}"></i>Por ejecutar</span></div>`;
  const ring = (v, c) => { const r = 38, L = 2 * Math.PI * r, p = v == null ? 0 : Math.min(v, 100); return `<svg class="rs-ring" viewBox="0 0 92 92"><circle cx="46" cy="46" r="${r}" stroke="rgba(255,255,255,.1)"/><circle cx="46" cy="46" r="${r}" stroke="${c}" stroke-linecap="round" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - p / 100)}" transform="rotate(-90 46 46)"/><text x="46" y="46">${v == null ? '—' : v + '%'}</text></svg>`; };

  box.innerHTML = `
    <div class="rs-f">
      <label>Periodo<select class="field" id="rsP">
        <option value="ac:" ${F.periodo === 'ac:' ? 'selected' : ''}>Acumulado a la fecha</option>
        <option value="plan:" ${F.periodo === 'plan:' ? 'selected' : ''}>Todo el plan (52 semanas)</option>
        <optgroup label="Trimestre">${trims.map(q => { const [y, n] = q.split('-Q'); return `<option value="q:${q}" ${F.periodo === 'q:' + q ? 'selected' : ''}>${n}.º trimestre ${y}</option>`; }).join('')}</optgroup>
        <optgroup label="Mes">${mesesK.map(k => { const [y, m] = k.split('-').map(Number); return `<option value="m:${k}" ${F.periodo === 'm:' + k ? 'selected' : ''}>${MESL[m - 1]} ${y}</option>`; }).join('')}</optgroup>
      </select></label>
      <label>Sistema<select class="field" id="rsS"><option value="">Todos</option>${sisOpts.map(s => `<option value="${s}" ${F.sis === s ? 'selected' : ''}>${esc(sisNom(s))}</option>`).join('')}</select></label>
      <label>Especialidad<select class="field" id="rsR"><option value="">Todas</option>${roles.map(r => `<option ${F.rol === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
      <label>Criticidad<select class="field" id="rsC"><option value="">Todas</option>${['A', 'B', 'C'].filter(c => TAR.some(t => t.crit === c)).map(c => `<option ${F.crit === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <div class="nota">Cumplimiento = ejecutadas / vencidas (semanas cerradas). Meta ${META} %.${HOY < CFG.inicio ? ` El plan inicia el ${corto(CFG.inicio)}: por ahora se muestra lo programado.` : ''}</div>
    </div>

    <div class="rs-k">
      <div class="rs-t hero" style="--c:${est.c}">${ring(cumpl, est.c)}<div><div class="l">Cumplimiento del PMP</div><div class="s">${venc.length ? `${vencH.length} de ${venc.length} tareas vencidas` : 'Aún no hay semanas cerradas'} · ${esc(nomPeriodo)}</div><span class="rs-pill" style="color:${est.c};background:${est.c}22">${est.t}</span></div></div>
      <div class="rs-t" style="--c:#3bb4e5"><div class="l">Avance del periodo</div><div class="v">${pctTxt(avance)}</div><div class="s">${hechas.length} de ${P.length} tareas programadas</div></div>
      <div class="rs-t" style="--c:${ST.atrasada}"><div class="l">Backlog</div><div class="v">${back.length}</div><div class="s">${f1(hhBack)} HH · ${f1(backSem)} sem. de capacidad</div></div>
      <div class="rs-t" style="--c:#2ec4a6"><div class="l">Horas-hombre</div><div class="v">${Math.round(hhE)}<small> / ${Math.round(hhP)}</small></div><div class="s">Ejecutadas / programadas (personal propio)</div></div>
      <div class="rs-t" style="--c:${ST.meta}"><div class="l">Reprogramación</div><div class="v">${pctTxt(P.length ? Math.round(repro / P.length * 100) : 0)}</div><div class="s">${repro} tareas reprogramadas</div></div>
      <div class="rs-t" style="--c:#c9a7ff"><div class="l">Servicios de terceros</div><div class="v">${terc.length}</div><div class="s">${terc.filter(o => o.est === 'hecho').length} ejecutados en el periodo</div></div>
    </div>

    <div class="rs-g rs-g2">
      <div class="rs-c"><h3>Programado vs ejecutado</h3><div class="sub">Tareas por ${SP.length > 14 ? 'mes' : 'semana'} · ${esc(nomPeriodo)}</div>${legEst}<div class="rs-cv"><canvas id="rsC1"></canvas></div>
        <details class="rs-tab"><summary>Ver tabla</summary><table class="rs-tb" id="rsT1"></table></details></div>
      <div class="rs-c"><h3>Alertas</h3><div class="sub">Priorizadas por impacto</div><div class="rs-al">${alertas.length ? alertas.slice(0, 14).map(a => `<div class="rs-a"><div class="ic" style="color:${a.c};background:${a.c}22">${a.ic}</div><div><b>${esc(a.t)}</b><span>${esc(a.d)}</span></div></div>`).join('') : '<div class="rs-vacio">Sin alertas: el plan está al día.</div>'}</div></div>
    </div>

    <div class="rs-g rs-g3">
      <div class="rs-c"><h3>Cumplimiento acumulado</h3><div class="sub">% semana a semana frente a la meta de ${META} %</div><div class="rs-cv sm"><canvas id="rsC2"></canvas></div></div>
      <div class="rs-c"><h3>Por sistema</h3><div class="sub">Estado de las tareas del periodo · % cumplimiento</div>${legEst}
        ${porSis.map(([k, r]) => `<div class="rs-hb"><span>${esc(k)}</span>${barra(r)}<span class="n">${r.h + r.a + r.p} · ${r.v ? Math.round(r.vh / r.v * 100) + ' %' : '—'}</span></div>`).join('') || '<div class="rs-vacio">Sin tareas</div>'}</div>
      <div class="rs-c"><h3>Por especialidad</h3><div class="sub">Tareas en las que participa · % cumplimiento</div>${legEst}
        ${porRol.map(([k, r]) => `<div class="rs-hb"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${COL_ROL[k]};margin-right:6px"></i>${esc(k)}</span>${barra(r)}<span class="n">${r.h + r.a + r.p} · ${r.v ? Math.round(r.vh / r.v * 100) + ' %' : '—'}</span></div>`).join('') || '<div class="rs-vacio">Sin tareas</div>'}</div>
    </div>

    <div class="rs-g rs-g11">
      <div class="rs-c"><h3>Uso de capacidad</h3><div class="sub">HH programadas / HH disponibles para preventivo · ${esc(nomPeriodo)}</div>
        ${usoCap.map(x => `<div class="rs-hb" style="grid-template-columns:120px minmax(0,1fr) 120px"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${COL_ROL[x.r]};margin-right:6px"></i>${esc(x.r)}</span><div class="tr"><div style="width:${Math.min(x.pct, 100)}%;background:${x.pct > 100 ? ST.atrasada : COL_ROL[x.r]}"></div></div><span class="n">${x.pct} % · ${Math.round(x.hh)}/${Math.round(x.cap)} HH${x.pct > 100 ? ' ⚠' : ''}</span></div>`).join('')}
        <div class="sub" style="margin-top:12px">Carga de las próximas 8 semanas por especialidad (HH)</div><div class="rs-leg">${roles.filter(r => r !== 'Tercero').map(r => `<span><i style="background:${COL_ROL[r]}"></i>${esc(r)}</span>`).join('')}</div><div class="rs-cv sm"><canvas id="rsC3"></canvas></div></div>
      <div class="rs-c"><h3>Tareas por frecuencia</h3><div class="sub">Composición del periodo</div><div class="rs-cv sm"><canvas id="rsC4"></canvas></div>
        <h3 style="margin-top:16px">Equipos con más atrasos</h3><div class="sub">Backlog a la fecha</div>
        ${topAtr.length ? `<table class="rs-tb"><thead><tr><th>Equipo</th><th>Crit.</th><th style="text-align:right">Atrasadas</th><th style="text-align:right">HH</th></tr></thead><tbody>${topAtr.map(([eq, os]) => `<tr><td><span class="rs-cod">${esc(eq)}</span> ${esc(os[0].t.eqDesc)}</td><td>${esc(os[0].t.crit)}</td><td class="n">${os.length}</td><td class="n">${f1(os.reduce((a, o) => a + hhProp(o.t), 0))}</td></tr>`).join('')}</tbody></table>` : '<div class="rs-vacio">Ningún equipo con tareas atrasadas.</div>'}</div>
    </div>

    <div class="rs-c" style="margin-bottom:12px"><h3>Trabajos clave de las próximas 2 semanas</h3><div class="sub">Trimestrales, semestrales, anuales y únicos · desde la semana del ${corto(ref)}</div>
      ${claves.length ? `<div style="overflow-x:auto"><table class="rs-tb"><thead><tr><th>Semana</th><th>Equipo</th><th>Actividad</th><th>Frecuencia</th><th>Responsables</th><th>Condición</th></tr></thead><tbody>${claves.slice(0, 20).map(o => `<tr><td style="white-space:nowrap">${corto(o.ef)}</td><td><span class="rs-cod">${esc(o.t.eq)}</span><br><span style="color:var(--tx-3)">${esc(o.t.eqDesc)}</span></td><td>${esc(o.t.tarea)}</td><td>${esc(FREC[o.t.frec].l)}</td><td style="font-size:12px">${esc(Object.entries(o.t.resp || {}).map(([k, v]) => `${k} ${String(v).replace('.', ',')} h`).join(' · '))}</td><td>${esc(o.t.cond)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="rs-vacio">No hay trabajos mayores en las próximas 2 semanas.</div>'}</div>`;

  const re = () => vResumen(box, M);
  box.querySelector('#rsP').onchange = (e) => { F.periodo = e.target.value; re(); };
  box.querySelector('#rsS').onchange = (e) => { F.sis = e.target.value; re(); };
  box.querySelector('#rsR').onchange = (e) => { F.rol = e.target.value; re(); };
  box.querySelector('#rsC').onchange = (e) => { F.crit = e.target.value; re(); };

  // ---------- gráficos (Chart.js) ----------
  const series1 = SP.length > 14
    ? [...new Set(SP.map(s => s.slice(0, 7)))].map(k => { const ws = porSemana.filter(x => x.s.slice(0, 7) === k); const [y, m] = k.split('-').map(Number); return { l: `${MES[m - 1]}-${String(y).slice(2)}`, h: ws.reduce((a, x) => a + x.h, 0), a: ws.reduce((a, x) => a + x.a, 0), p: ws.reduce((a, x) => a + x.p, 0) }; })
    : porSemana.map(x => ({ l: `S${numSem(x.s)} · ${corto(x.s)}`, h: x.h, a: x.a, p: x.p }));
  const t1 = box.querySelector('#rsT1');
  t1.innerHTML = `<thead><tr><th>Periodo</th><th style="text-align:right">Ejecutadas</th><th style="text-align:right">Atrasadas</th><th style="text-align:right">Por ejecutar</th></tr></thead><tbody>${series1.map(x => `<tr><td>${x.l}</td><td class="n">${x.h}</td><td class="n">${x.a}</td><td class="n">${x.p}</td></tr>`).join('')}</tbody>`;
  const Ch = window.Chart;
  if (!Ch) { box.querySelectorAll('canvas').forEach(c => { c.parentElement.innerHTML = '<div class="rs-vacio">No se pudo cargar el graficador. Revise la conexión.</div>'; }); return; }
  Ch.defaults.color = '#B8C4D0'; Ch.defaults.font.family = "'IBM Plex Sans', system-ui, sans-serif"; Ch.defaults.font.size = 11.5;
  const grid = { color: 'rgba(255,255,255,.06)', drawTicks: false }, axis = { border: { display: false }, grid, ticks: { padding: 6 } };
  const tip = { backgroundColor: '#1f2a35', borderColor: 'rgba(255,255,255,.15)', borderWidth: 1, padding: 10, titleFont: { weight: '600' } };
  const bar = (label, data, color) => ({ label, data, backgroundColor: color, borderRadius: 4, borderSkipped: 'start', borderColor: '#3a4755', borderWidth: { top: 2 }, maxBarThickness: 34 });
  GR.push(new Ch(box.querySelector('#rsC1'), {
    type: 'bar',
    data: { labels: series1.map(x => x.l), datasets: [bar('Ejecutadas', series1.map(x => x.h), ST.hecho), bar('Atrasadas / no ejecutadas', series1.map(x => x.a), ST.atrasada), bar('Por ejecutar', series1.map(x => x.p), ST.pend)] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { footer: (it) => `Total ${it.reduce((a, x) => a + x.parsed.y, 0)} tareas` } } },
      scales: { x: { ...axis, stacked: true, grid: { display: false } }, y: { ...axis, stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Tareas' } } } }
  }));
  // cumplimiento acumulado (semanas cerradas del periodo)
  let ac = 0, acV = 0;
  const cum = porSemana.map(x => { if (x.s < HOY) { const os = P.filter(o => o.ef === x.s); acV += os.length; ac += os.filter(o => o.est === 'hecho').length; return acV ? Math.round(ac / acV * 100) : null; } return null; });
  GR.push(new Ch(box.querySelector('#rsC2'), {
    type: 'line',
    data: { labels: porSemana.map(x => `S${numSem(x.s)}`), datasets: [
      { label: 'Cumplimiento acumulado', data: cum, borderColor: '#3987e5', backgroundColor: '#3987e5', borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, spanGaps: false, tension: .25 },
      { label: `Meta ${META} %`, data: porSemana.map(() => META), borderColor: ST.meta, borderDash: [6, 5], borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0 }] },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { boxWidth: 12, boxHeight: 2 } }, tooltip: { ...tip, callbacks: { label: (c) => c.parsed.y == null ? null : `${c.dataset.label}: ${c.parsed.y} %` } } },
      scales: { x: { ...axis, grid: { display: false } }, y: { ...axis, min: 0, max: 100, ticks: { callback: (v) => v + ' %', stepSize: 25 } } } }
  }));
  if (!cum.some(v => v != null)) box.querySelector('#rsC2').parentElement.insertAdjacentHTML('beforeend', '<div class="rs-vacio" style="position:absolute;inset:40% 0 auto">Se mostrará cuando cierre la primera semana del periodo.</div>');
  // carga próximas 8 semanas por especialidad
  const rolesP = roles.filter(r => r !== 'Tercero' && (!F.rol || r === F.rol));
  GR.push(new Ch(box.querySelector('#rsC3'), {
    type: 'bar',
    data: { labels: prox8.map(s => `S${numSem(s)} · ${corto(s)}`), datasets: rolesP.map(r => bar(r, prox8.map(s => Math.round(T.flatMap(ocurrencias).filter(o => o.ef === s && o.est !== 'hecho').reduce((a, o) => a + ((o.t.resp || {})[r] || 0), 0) * 10) / 10), COL_ROL[r])) },
    options: { maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => `${c.dataset.label}: ${String(c.parsed.y).replace('.', ',')} HH`, footer: (it) => `Total ${String(Math.round(it.reduce((a, x) => a + x.parsed.y, 0) * 10) / 10).replace('.', ',')} HH` } } },
      scales: { x: { ...axis, stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } }, y: { ...axis, stacked: true, beginAtZero: true, title: { display: true, text: 'HH' } } } }
  }));
  GR.push(new Ch(box.querySelector('#rsC4'), {
    type: 'bar',
    data: { labels: porFrec.map(x => FREC[x.k].l), datasets: [{ label: 'Tareas', data: porFrec.map(x => x.n), backgroundColor: porFrec.map(x => FREC[x.k].hex), borderRadius: 4, borderSkipped: 'start', maxBarThickness: 22 }] },
    options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: (c) => `${c.parsed.x} tareas (${Math.round(c.parsed.x / (P.length || 1) * 100)} %)` } } },
      scales: { x: { ...axis, beginAtZero: true, ticks: { precision: 0 } }, y: { ...axis, grid: { display: false } } } },
    plugins: [{ id: 'etq', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.fillStyle = '#DDE4EB'; ctx.font = '600 11px IBM Plex Sans, sans-serif'; ctx.textBaseline = 'middle'; ch.getDatasetMeta(0).data.forEach((b, i) => ctx.fillText(String(porFrec[i].n), b.x + 6, b.y)); ctx.restore(); } }]
  }));
}
