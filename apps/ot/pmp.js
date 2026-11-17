// Órdenes de trabajo — Preventivo de la semana (cruce con el Plan preventivo)
import { SISTEMAS } from '../../core/maestros.js';
import * as M from './modelo.js';
import { esc, IC, confirmar, pillEstado, tagEsp } from './ui.js';
import { abrirOT } from './ordenes.js';

let SEM = M.lunesDe(), ESP = '';

// OT vigente (no anulada) de cada ocurrencia
export const otsPorOcurrencia = (S) => {
  const m = new Map();
  S.lista().filter(o => o.pmp && o.estado !== 'anulada').forEach(o => m.set(M.clavePMP(o.pmp.tareaId, o.pmp.semana), o));
  return m;
};

export function vPMP(S) {
  const main = S.ctx.main;
  if (S.pmpError) {
    main.innerHTML = `<div class="ot-head"><div><div class="eyebrow">Preventivo de la semana</div><h1 class="ot-h1">Plan preventivo</h1></div></div>
      <div class="ot-aviso">No se pudo leer el Plan preventivo. Su usuario necesita acceso de lectura a "Plan de mantenimiento", o falta actualizar las reglas de Firebase.</div>`;
    return;
  }
  const tareas = [...S.pmp.values()];
  const occ = M.ocurrenciasSemana(tareas, SEM).filter(o => !o.no);
  const porOcc = otsPorOcurrencia(S);
  const filas = occ.map(o => ({ ...o, ot: porOcc.get(M.clavePMP(o.t.id, o.s)) || null }))
    .filter(o => !ESP || M.espTarea(o.t).includes(ESP));
  const hh = (l) => l.reduce((a, o) => a + M.hhTarea(o.t), 0);
  const hechas = filas.filter(o => o.hecha), conOT = filas.filter(o => !o.hecha && o.ot), sinOT = filas.filter(o => !o.hecha && !o.ot);
  const atr = filas.filter(o => o.atrasada);
  const esHoy = SEM === M.lunesDe();
  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Preventivo de la semana</div><h1 class="ot-h1">Semana del ${esc(M.rangoSemana(SEM))}</h1>
        <div class="ot-sub">Tareas del Plan preventivo programadas para la semana${esHoy ? ', más las atrasadas de semanas anteriores' : ''}.</div></div>
      <div class="ot-nav">
        <button class="btn btn-icon" id="sAnt" aria-label="Semana anterior">${IC.atras}</button>
        ${esHoy ? '' : '<button class="btn" id="sHoy">Esta semana</button>'}
        <button class="btn btn-icon" id="sSig" aria-label="Semana siguiente" style="transform:scaleX(-1)">${IC.atras}</button>
        ${S.gestiona && sinOT.length ? `<button class="btn btn-primary" id="sTodo">${IC.mas} Generar ${sinOT.length} OT</button>` : ''}
      </div>
    </div>
    <div class="ot-kpis">
      <div class="ot-kpi" style="--c:#1B86C4"><span>Programadas</span><b>${filas.length}<small> · ${M.nf(hh(filas), 1)} HH</small></b></div>
      <div class="ot-kpi" style="--c:#087F74"><span>Ejecutadas</span><b>${hechas.length}<small>${filas.length ? ` · ${Math.round(hechas.length / filas.length * 100)} %` : ''}</small></b></div>
      <div class="ot-kpi" style="--c:#5564D8"><span>Con OT en curso</span><b>${conOT.length}</b></div>
      <div class="ot-kpi" style="--c:#5B6B78"><span>Sin OT</span><b>${sinOT.length}<small> · ${M.nf(hh(sinOT), 1)} HH</small></b></div>
      <div class="ot-kpi" style="--c:#B91C1C"><span>Atrasadas</span><b>${atr.length}</b></div>
      <div class="ot-kpi" style="--c:#B77908"><span>HH por hacer</span><b>${M.nf(hh([...conOT, ...sinOT]), 1)}</b></div>
    </div>
    <div class="ot-chips" style="margin-bottom:14px">
      <button class="chip ${!ESP ? 'on' : ''}" data-e="">Todas</button>
      ${M.ESPECIALIDADES.map(e => `<button class="chip ${ESP === e.id ? 'on' : ''}" data-e="${esc(e.id)}">${esc(e.l)}</button>`).join('')}
    </div>
    ${filas.length ? `<div class="ot-tabla"><table class="table ot-pmp">
      <thead><tr><th>Equipo</th><th>Tarea</th><th>Especialidad</th><th class="r">HH</th><th>Estado</th><th></th></tr></thead>
      <tbody>${filas.sort((a, b) => (b.atrasada - a.atrasada) || (a.hecha - b.hecha) || String(a.t.eq).localeCompare(b.t.eq)).map(o => `<tr class="${o.atrasada ? 'late' : ''}">
        <td><b class="mono">${esc(o.t.eq)}</b><small>${esc(o.t.eqDesc || '')}</small></td>
        <td><span class="ot-rut">${esc(o.t.rutina || '')}</span> ${esc(o.t.tarea)}${o.e?.a ? `<small>Reprogramada desde la semana del ${esc(M.rangoSemana(o.s))}</small>` : ''}${o.atrasada ? `<small class="ot-rojo">Atrasada: era de la semana del ${esc(M.rangoSemana(o.ef))}</small>` : ''}</td>
        <td>${M.espTarea(o.t).map(tagEsp).join(' ')}</td>
        <td class="r num">${M.nf(M.hhTarea(o.t), 1)}</td>
        <td>${o.hecha ? `<span class="ot-pill" style="--c:#087F74">Ejecutada</span>${o.e?.ot ? `<small>${esc(o.e.ot)}</small>` : ''}` : o.ot ? `<button class="ot-lnk" data-ot="${esc(o.ot.id)}">${esc(o.ot.numero)}</button> ${pillEstado(o.ot)}` : '<span class="ot-hint">Sin OT</span>'}</td>
        <td class="r">${!o.hecha && !o.ot && S.ctx.puedeEscribir ? `<button class="btn ot-mini" data-gen="${esc(M.clavePMP(o.t.id, o.s))}">${IC.mas} OT</button>` : ''}</td>
      </tr>`).join('')}</tbody></table></div>`
    : `<div class="ot-vacio">${tareas.length ? 'No hay tareas del Plan preventivo en esta semana' + (ESP ? ' para esa especialidad.' : '.') : 'El Plan preventivo aún no tiene tareas cargadas.'}</div>`}`;

  const ir = (n) => { SEM = n; vPMP(S); };
  main.querySelector('#sAnt').onclick = () => ir(M.masSemanas(SEM, -1));
  main.querySelector('#sSig').onclick = () => ir(M.masSemanas(SEM, 1));
  const h = main.querySelector('#sHoy'); if (h) h.onclick = () => ir(M.lunesDe());
  main.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { ESP = b.dataset.e; vPMP(S); });
  main.querySelectorAll('[data-ot]').forEach(b => b.onclick = () => abrirOT(S, S.ords.get(b.dataset.ot)));
  main.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => {
    const o = filas.find(x => M.clavePMP(x.t.id, x.s) === b.dataset.gen);
    abrirOT(S, null, M.otDesdePMP(o, SISTEMAS));
  });
  const t = main.querySelector('#sTodo');
  if (t) t.onclick = async () => {
    const ok = await confirmar({ titulo: 'Generar OT de la semana', texto: `Se crearán ${sinOT.length} órdenes pendientes, una por tarea sin OT${ESP ? ` de ${esc(M.espDe(ESP).l)}` : ''}. Luego puede asignar técnicos desde la bandeja.`, si: `Generar ${sinOT.length} OT` });
    if (!ok) return;
    t.disabled = true;
    let n = 0;
    for (const o of sinOT) {
      try { await S.api.crear({ ...base(), ...M.otDesdePMP(o, SISTEMAS) }, 'Generó la OT desde el Plan preventivo'); n++; }
      catch (e) { console.error(e); }
    }
    S.ctx.toast(n === sinOT.length ? `${n} OT generadas.` : `Se generaron ${n} de ${sinOT.length} OT. Revise la conexión.`, n === sinOT.length ? undefined : 'err');
  };
}

// Campos de una OT nueva que el borrador del PMP no trae
export const base = () => ({
  estado: 'pendiente', asignados: [], inicio: '', fin: '', tecnicos: [], tercero: null, materiales: [], sinMateriales: false,
  causa: '', condicionFinal: '', nFotos: 0
});
