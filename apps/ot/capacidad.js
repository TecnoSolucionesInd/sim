// Órdenes de trabajo — Capacidad operativa: horas disponibles frente a requeridas y utilizadas
import * as M from './modelo.js';
import { esc, IC, tagPrio, tagEsp } from './ui.js';
import { abrirOT } from './ordenes.js';

let SEM = M.lunesDe();
const VERDE = '#0B9A8B', AMBAR = '#B77908', ROJO = '#B91C1C';
const colorCarga = (r) => r == null ? '#8A96A2' : r > 1 ? ROJO : r > 0.85 ? AMBAR : VERDE;
const pct = (r) => r == null ? '—' : `${Math.round(r * 100)} %`;

export function calcular(S) {
  const semAct = M.lunesDe(), horiz = M.semanasDesde(semAct, M.HORIZONTE);
  const pers = S.personas().filter(p => p.activo !== false);
  const dispEsp = (e, s) => pers.filter(p => p.especialidad === e).reduce((a, p) => a + M.hhDispSemana(p, s, S.cfg, S.rol), 0);
  const est = M.estimador(S.lista().filter(o => o.estado === 'cerrada'));
  const items = M.cargaPendiente({ ords: S.lista(), tareas: [...(S.pmp?.values() || [])], semActual: semAct, est });
  const plan = M.planificar(items.map(i => ({ ...i, rep: { ...i.rep } })), horiz, dispEsp);
  const reqEsp = (e, s) => items.filter(i => i.semana === s).reduce((a, i) => a + (+i.rep[e] || 0), 0);
  // HH registradas en trabajos iniciados en la semana (mantenimiento y apoyo de operación por separado)
  const utilizadas = (s) => {
    const r = { esp: {}, per: {}, apoyo: 0 };
    S.lista().filter(o => o.estado !== 'anulada' && o.inicio && M.lunesDe(M.deLocal(o.inicio)) === s).forEach(o => (o.tecnicos || []).forEach(t => {
      const hh = +t.hh || 0; if (!hh) return;
      r.per[t.id] = (r.per[t.id] || 0) + hh;
      if (t.tipo === 'oper') r.apoyo += hh; else r.esp[t.especialidad] = (r.esp[t.especialidad] || 0) + hh;
    }));
    return r;
  };
  return { semAct, horiz, pers, dispEsp, reqEsp, items, plan, utilizadas };
}

export function vCapacidad(S) {
  const main = S.ctx.main, C = calcular(S);
  const futura = SEM >= C.semAct, esHoy = SEM === C.semAct;
  const esps = M.ESPECIALIDADES.filter(e => e.id !== 'Tercero')
    .filter(e => C.pers.some(p => p.especialidad === e.id) || C.items.some(i => +i.rep[e.id] > 0));
  const U = C.utilizadas(SEM);
  const fila = esps.map(e => {
    const d = C.dispEsp(e.id, SEM), r = futura ? C.reqEsp(e.id, SEM) : null, u = U.esp[e.id] || 0;
    return { e, d, r, u, ratio: r == null ? null : d > 0 ? r / d : r > 0 ? Infinity : 0 };
  });
  const tot = fila.reduce((a, f) => ({ d: a.d + f.d, r: a.r + (f.r || 0), u: a.u + f.u }), { d: 0, r: 0, u: 0 });
  const holg = tot.d - tot.r;

  // backlog: todo lo pendiente dentro del horizonte frente a la capacidad semanal
  const pend = C.items.filter(i => i.semana <= C.horiz.at(-1));
  const hhPend = pend.reduce((a, i) => a + Object.entries(i.rep).filter(([k]) => k !== 'Tercero').reduce((b, [, v]) => b + (+v || 0), 0), 0);
  const dispSem = esps.reduce((a, f) => a + C.dispEsp(f.id, C.semAct), 0);
  const hhAtr = C.items.filter(i => i.atrasada).reduce((a, i) => a + Object.entries(i.rep).filter(([k]) => k !== 'Tercero').reduce((b, [, v]) => b + (+v || 0), 0), 0);
  const sinCap = C.plan.items.filter(i => i.sinCap > 0);
  const hhSinCap = sinCap.reduce((a, i) => a + i.sinCap, 0);
  const hhTer = pend.reduce((a, i) => a + (+i.rep.Tercero || 0), 0);

  // horizonte: carga por especialidad y semana
  const heat = esps.map(e => ({ e, cel: C.horiz.map(s => { const d = C.dispEsp(e.id, s), r = C.reqEsp(e.id, s); return { s, d, r, ratio: d > 0 ? r / d : r > 0 ? Infinity : 0 }; }) }));
  const totHor = (e) => heat.find(h => h.e.id === e).cel.reduce((a, c) => ({ d: a.d + c.d, r: a.r + c.r }), { d: 0, r: 0 });

  // técnicos en la semana
  const nAsig = (it, esp) => it.asignados.filter(id => S.per.get(id)?.especialidad === esp).length || 1;
  const tec = C.pers.map(p => {
    const d = M.hhDispSemana(p, SEM, S.cfg, S.rol);
    const a = futura ? C.items.filter(i => i.semana === SEM && i.asignados.includes(p.id)).reduce((x, i) => x + (+i.rep[p.especialidad] || 0) / nAsig(i, p.especialidad), 0) : null;
    return { p, d, a, u: U.per[p.id] || 0, aus: M.diasAusente(p, SEM, S.rol) };
  }).filter(t => t.d > 0 || t.a > 0 || t.u > 0).sort((x, y) => (y.d ? (y.a || 0) / y.d : 0) - (x.d ? (x.a || 0) / x.d : 0));

  // alertas
  const alertas = [];
  esps.forEach(e => {
    const h = totHor(e.id);
    if (h.r > h.d + 0.01) alertas.push({ c: ROJO, t: h.d > 0 ? `${e.l}: ${M.nf(h.r, 0)} HH requeridas en ${M.HORIZONTE} semanas para ${M.nf(h.d, 0)} disponibles (déficit de ${M.nf(h.r - h.d, 0)} HH).`
      : `${e.l}: ${M.nf(h.r, 0)} HH requeridas y sin personal de mantenimiento disponible. Requiere apoyo de operación (producción baja) o un tercero.` });
  });
  if (futura) tec.filter(t => t.a > t.d + 0.01 && t.d > 0).forEach(t => alertas.push({ c: AMBAR, t: `${t.p.nombre}: ${M.nf(t.a, 1)} HH asignadas para ${M.nf(t.d, 1)} disponibles esta semana. Reparta trabajos con otro técnico de su especialidad.` }));
  if (hhSinCap > 0) alertas.push({ c: ROJO, t: `${sinCap.length} trabajo${sinCap.length > 1 ? 's' : ''} (${M.nf(hhSinCap, 1)} HH) no entran con el personal propio en las próximas ${M.HORIZONTE} semanas: evalúe contratar terceros o reprogramar.` });
  if (!C.pers.length) alertas.push({ c: AMBAR, t: 'Registre al personal en el módulo Personal para calcular la capacidad.' });

  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Capacidad operativa</div><h1 class="ot-h1">Semana del ${esc(M.rangoSemana(SEM))}</h1>
        <div class="ot-sub">${futura ? 'Horas disponibles del personal frente a las horas que piden las OT abiertas y el Plan preventivo.' : 'Semana pasada: horas disponibles y horas registradas.'}</div></div>
      <div class="ot-nav">
        <button class="btn btn-icon" id="cAnt" aria-label="Semana anterior">${IC.atras}</button>
        ${esHoy ? '' : '<button class="btn" id="cHoy">Esta semana</button>'}
        <button class="btn btn-icon" id="cSig" aria-label="Semana siguiente" style="transform:scaleX(-1)">${IC.atras}</button>
      </div>
    </div>
    <div class="ot-kpis">
      <div class="ot-kpi" style="--c:#1B86C4"><span>HH disponibles</span><b>${M.nf(tot.d, 0)}</b></div>
      <div class="ot-kpi" style="--c:#5564D8"><span>HH requeridas</span><b>${futura ? M.nf(tot.r, 0) : '—'}</b></div>
      <div class="ot-kpi" style="--c:${!futura ? '#8A96A2' : holg >= 0 ? VERDE : ROJO}"><span>${!futura || holg >= 0 ? 'Holgura' : 'Déficit'}</span><b>${futura ? M.nf(Math.abs(holg), 0) : '—'}<small>${futura ? ' HH' : ''}</small></b></div>
      <div class="ot-kpi" style="--c:#087F74"><span>HH utilizadas</span><b>${M.nf(tot.u, 0)}<small>${tot.d ? ` · ${pct(tot.u / tot.d)}` : ''}</small></b></div>
      <div class="ot-kpi" style="--c:${AMBAR}"><span>Backlog</span><b>${M.nf(hhPend, 0)}<small> HH · ${dispSem ? M.nf(hhPend / dispSem, 1) : '—'} sem</small></b></div>
      <div class="ot-kpi" style="--c:${ROJO}"><span>Sin capacidad</span><b>${M.nf(hhSinCap, 0)}<small> HH · ${sinCap.length} trab.</small></b></div>
    </div>

    ${alertas.length ? `<div class="cp-alertas">${alertas.map(a => `<div class="cp-al" style="--c:${a.c}">${IC.alerta}<span>${esc(a.t)}</span></div>`).join('')}</div>` : ''}

    <div class="cp-grid">
      <section class="glass cp-card"><h3>Por especialidad</h3>
        <div class="cp-ley"><span><i class="d"></i>Disponible</span>${futura ? '<span><i class="r"></i>Requerida</span>' : ''}<span><i class="u"></i>Utilizada</span></div>
        ${barras(fila, futura)}
        ${U.apoyo ? `<p class="ot-hint" style="margin:12px 0 0">Apoyo de operación: ${M.nf(U.apoyo, 1)} HH registradas por operadores esta semana (no cuentan en la capacidad).</p>` : ''}
        ${hhTer ? `<p class="ot-hint" style="margin:8px 0 0">A cargo de terceros en el horizonte: ${M.nf(hhTer, 1)} HH (no consumen capacidad propia).</p>` : ''}
        ${hhAtr ? `<p class="ot-hint" style="margin:8px 0 0">De lo requerido, ${M.nf(hhAtr, 1)} HH son trabajos atrasados que se cargan a la semana actual.</p>` : ''}
      </section>
      <section class="glass cp-card"><h3>Próximas ${M.HORIZONTE} semanas</h3><p class="ot-hint" style="margin:0 0 10px">Horas requeridas sobre disponibles; cada columna es la semana que empieza ese lunes.</p>
        <div class="ot-tabla cp-heat"><table class="table"><thead><tr><th>Especialidad</th>${C.horiz.map(s => `<th class="c">${esc(M.fh(s, false))}</th>`).join('')}</tr></thead>
        <tbody>${heat.map(h => `<tr><td>${esc(h.e.l)}</td>${h.cel.map(c => `<td class="c"><span class="cp-cel" style="--c:${colorCarga(c.d || c.r ? c.ratio : null)}" title="${M.nf(c.r, 1)} de ${M.nf(c.d, 1)} HH">${c.d || c.r ? (c.ratio === Infinity ? 'sin pers.' : pct(c.ratio)) : '—'}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </section>
    </div>

    <section class="glass cp-card" style="margin-top:14px"><h3>Carga por técnico</h3>
      ${tec.length ? `<div class="ot-tabla" style="box-shadow:none;border:0"><table class="table"><thead><tr><th>Técnico</th><th>Especialidad</th><th class="r">Disponible</th>${futura ? '<th class="r">Asignado</th>' : ''}<th class="r">Utilizado</th><th style="width:30%">Carga</th></tr></thead>
      <tbody>${tec.map(t => { const r = futura ? (t.d ? t.a / t.d : null) : (t.d ? t.u / t.d : null); return `<tr>
        <td><b>${esc(t.p.nombre)}</b>${t.aus ? `<small class="ot-hint"> · ${t.aus} día${t.aus > 1 ? 's' : ''} de ausencia</small>` : ''}${t.p.tipo === 'oper' ? '<small class="ot-hint"> · operación</small>' : ''}</td>
        <td>${esc(M.espDe(t.p.especialidad).l)}</td><td class="r num">${M.nf(t.d, 1)}</td>${futura ? `<td class="r num">${M.nf(t.a, 1)}</td>` : ''}<td class="r num">${M.nf(t.u, 1)}</td>
        <td><div class="cp-mini"><i style="width:${Math.min(100, (r || 0) * 100)}%;--c:${colorCarga(r)}"></i></div><small class="num">${pct(r)}</small></td></tr>`; }).join('')}</tbody></table></div>`
      : '<div class="ot-vacio sm">No hay personal activo registrado.</div>'}
      <p class="ot-hint" style="margin:10px 0 0">${futura ? 'Asignado: HH de las OT de la semana en las que figura como asignado, repartidas entre los asignados de su especialidad.' : 'Carga = HH utilizadas sobre disponibles.'}</p>
    </section>

    <section class="glass cp-card" style="margin-top:14px"><h3>Trabajos sin capacidad en las próximas ${M.HORIZONTE} semanas</h3>
      ${sinCap.length ? `<p class="ot-hint" style="margin:0 0 10px">Ordenados por prioridad. Los de prioridad P3 y P4 son los primeros candidatos a un tercero o a reprogramarse.</p>
      <div class="ot-tabla" style="box-shadow:none"><table class="table"><thead><tr><th>Trabajo</th><th>Equipo</th><th>Falta</th><th class="r">HH sin cubrir</th><th>Sugerencia</th></tr></thead>
      <tbody>${sinCap.sort((a, b) => a.prioridad.localeCompare(b.prioridad)).map(i => `<tr ${i.tipo === 'ot' ? `data-ot="${esc(i.id)}" style="cursor:pointer"` : ''}>
        <td>${tagPrio(i.prioridad)} <b class="mono">${esc(i.numero)}</b> ${esc(i.desc)}</td><td class="mono">${esc(i.equipo || '')}</td>
        <td>${Object.keys(i.sinCapacidad).map(tagEsp).join(' ')}</td><td class="r num">${M.nf(i.sinCap, 1)}</td>
        <td>${['P3', 'P4'].includes(i.prioridad) ? 'Tercero o reprogramar' : 'Reforzar con horas extra o tercero'}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="ot-vacio sm">Todo lo pendiente entra con el personal propio en las próximas ${M.HORIZONTE} semanas.</div>`}
    </section>
    <p class="ot-hint" style="margin-top:12px">Las OT sin HH estimadas usan el promedio real de trabajos parecidos ya cerrados (misma especialidad y tipo); si no hay historial, ${M.HH_DEFECTO} HH por especialidad. Disponibles: horas por turno × turnos por semana × dedicación, menos ausencias.</p>`;

  const ir = (n) => { SEM = n; vCapacidad(S); };
  main.querySelector('#cAnt').onclick = () => ir(M.masSemanas(SEM, -1));
  main.querySelector('#cSig').onclick = () => ir(M.masSemanas(SEM, 1));
  const h = main.querySelector('#cHoy'); if (h) h.onclick = () => ir(C.semAct);
  main.querySelectorAll('[data-ot]').forEach(tr => tr.onclick = () => abrirOT(S, S.ords.get(tr.dataset.ot)));
}

function barras(fila, futura) {
  if (!fila.length) return '<div class="ot-vacio sm">Sin datos de capacidad.</div>';
  const max = Math.max(1, ...fila.map(f => Math.max(f.d, f.r || 0, f.u)));
  return `<div class="cp-bars">${fila.map(f => {
    const dif = futura ? f.d - f.r : null;
    return `<div class="cp-row">
      <span class="cp-l">${esc(f.e.l)}</span>
      <div class="cp-bar">
        <i class="cp-d" style="width:${f.d / max * 100}%"></i>
        ${futura ? `<i class="cp-r" style="width:${f.r / max * 100}%;--c:${colorCarga(f.ratio === Infinity ? 2 : f.ratio)}"></i>` : ''}
        <i class="cp-u" style="width:${f.u / max * 100}%"></i>
      </div>
      <span class="cp-v num">${futura ? `${M.nf(f.r, 0)} / ${M.nf(f.d, 0)}` : `${M.nf(f.u, 0)} / ${M.nf(f.d, 0)}`}</span>
      <span class="cp-h num" style="color:${dif == null ? 'var(--tx-3)' : dif >= 0 ? VERDE : ROJO}">${dif == null ? '' : `${dif >= 0 ? '+' : '−'}${M.nf(Math.abs(dif), 0)}`}</span>
    </div>`;
  }).join('')}</div>`;
}
