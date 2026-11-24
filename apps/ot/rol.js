// Órdenes de trabajo — Rol de guardia semanal (quién trabaja cada día y en qué turno)
// La capacidad de una semana con rol se calcula con los días de turno (D o N) de cada persona.
import * as M from './modelo.js';
import { esc, IC, confirmar } from './ui.js';

let SEM = M.lunesDe();
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'];
const CARGAS = new Map();
const cargarScript = (src) => {
  if (!CARGAS.has(src)) CARGAS.set(src, new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { CARGAS.delete(src); no(new Error('No se pudo cargar una librería. Revise la conexión.')); };
    document.head.appendChild(s);
  }));
  return CARGAS.get(src);
};

const ordenGrupo = (g) => { const i = M.GRUPOS.indexOf(g); return i < 0 ? 99 : i; };
const diaDe = (i) => M.deLocal(M.masDias(SEM, i));
const titSemana = (s) => {
  const a = M.deLocal(s), b = M.deLocal(M.masDias(s, 6));
  return a.getMonth() === b.getMonth() ? `${a.getDate()} al ${b.getDate()} de ${MESL[b.getMonth()]} de ${b.getFullYear()}`
    : `${a.getDate()} de ${MESL[a.getMonth()]} al ${b.getDate()} de ${MESL[b.getMonth()]} de ${b.getFullYear()}`;
};

// Personas que se muestran: activas y las que ya figuran en el rol de la semana
function personasSemana(S) {
  const filas = S.rol.get(SEM)?.filas || {};
  return S.personas().filter(p => p.activo !== false || filas[p.id])
    .sort((a, b) => ordenGrupo(a.grupo) - ordenGrupo(b.grupo) || (a.tipo === 'oper') - (b.tipo === 'oper') || a.nombre.localeCompare(b.nombre, 'es'));
}

export function vRol(S) {
  const main = S.ctx.main, edita = S.gestiona && S.ctx.puedeEscribir;
  const doc = S.rol.get(SEM), filas = doc?.filas || {};
  const ps = personasSemana(S);
  const faltan = ps.filter(p => p.activo !== false && !M.filaRol(S.rol, p.id, SEM));
  const previa = M.masSemanas(SEM, -1), hayPrevia = !!S.rol.get(previa);
  const hoy = M.ahoraLocal().slice(0, 10);
  const grupos = [...new Set(ps.map(p => p.grupo || 'Sin grupo'))];
  const cuenta = (cod, i) => ps.filter(p => (filas[p.id] || [])[i] === cod).length;
  const hhSem = (p) => M.hhDispSemana(p, SEM, S.cfg, S.rol);
  const totMant = ps.filter(p => p.tipo !== 'oper').reduce((a, p) => a + (M.filaRol(S.rol, p.id, SEM) ? hhSem(p) : 0), 0);

  const celda = (p, i) => {
    const c = (filas[p.id] || [])[i] || '', k = M.codRol(c);
    const st = k ? `style="--c:${k.c};--bg:${k.bg}"` : '';
    return `<td class="rol-d ${M.masDias(SEM, i) === hoy ? 'hoy' : ''}">${edita
      ? `<button type="button" class="rol-c ${c ? '' : 'vac'}" data-p="${esc(p.id)}" data-d="${i}" ${st} aria-label="${esc(p.nombre)}, ${M.DIAS_SEM[i]}: ${k ? k.l : 'sin asignar'}">${c || '·'}</button>`
      : `<span class="rol-c ${c ? '' : 'vac'}" ${st}>${c || '·'}</span>`}</td>`;
  };

  main.innerHTML = `
    <div class="ot-head">
      <div><div class="eyebrow">Rol de guardia</div><h1 class="ot-h1">Semana del ${esc(titSemana(SEM))}</h1>
        <div class="ot-sub">${doc ? `Actualizado ${esc(M.fh(doc.actualizado || ''))}${doc.por ? ' · ' + esc(doc.por) : ''}` : 'Esta semana aún no tiene rol.'}</div></div>
      <div class="rol-acc">
        <div class="ot-nav"><button class="btn btn-icon" id="rAnt" aria-label="Semana anterior">${IC.atras}</button>
          <button class="btn" id="rHoy" ${SEM === M.lunesDe() ? 'disabled' : ''}>Esta semana</button>
          <button class="btn btn-icon" id="rSig" aria-label="Semana siguiente" style="transform:scaleX(-1)">${IC.atras}</button></div>
        ${edita && (!doc || faltan.length) ? `<button class="btn btn-primary" id="rGen">${IC.copia} ${doc ? `Completar ${faltan.length} persona${faltan.length > 1 ? 's' : ''}` : hayPrevia ? 'Generar desde la semana anterior' : 'Generar rol'}</button>` : ''}
        ${edita && doc && !faltan.length && hayPrevia ? `<button class="btn" id="rRe">${IC.copia} Rehacer desde la anterior</button>` : ''}
        ${doc ? `<button class="btn" id="rImg">${IC.img} Imagen</button><button class="btn" id="rXls">${IC.xls} Excel</button>` : ''}
      </div>
    </div>
    ${!ps.length ? '<div class="ot-vacio">Registre al personal en el módulo Personal para armar el rol.</div>' : `
    ${!doc ? `<div class="ot-aviso">${edita ? `${hayPrevia ? 'Se propone a partir de la semana anterior: el Turno 1 y el Turno 2 cambian de día a noche y los demás grupos conservan su turno; los descansos se mantienen y las ausencias registradas en Personal se marcan solas.' : 'Se propone con el turno de cada grupo (Turno 2 de noche) y descanso el domingo; luego ajuste los días tocando cada casilla.'}` : 'El supervisor aún no publica el rol de esta semana.'} Mientras no haya rol, la capacidad usa los turnos por semana de cada persona.</div>` : ''}
    <div class="ot-tabla rol-wrap"><table class="rol-tab">
      <thead><tr><th class="rol-n">Personal</th>${M.DIAS_SEM.map((d, i) => `<th class="rol-d ${M.masDias(SEM, i) === hoy ? 'hoy' : ''}"><span>${d}</span><b>${diaDe(i).getDate()}</b></th>`).join('')}<th class="r">Turnos</th><th class="r">HH</th></tr></thead>
      <tbody>${grupos.map(g => `<tr class="rol-g"><td colspan="10">${esc(g)}</td></tr>` + ps.filter(p => (p.grupo || 'Sin grupo') === g).map(p => {
        const f = M.filaRol(S.rol, p.id, SEM), n = f ? f.filter(M.trabajaRol).length : null;
        return `<tr><td class="rol-n"><b>${esc(p.nombre)}</b><small>${esc(M.espDe(p.especialidad).l)}${p.tipo === 'oper' ? ' · operación' : ''}</small></td>
          ${[0, 1, 2, 3, 4, 5, 6].map(i => celda(p, i)).join('')}
          <td class="r num">${n ?? '—'}</td><td class="r num">${f ? M.nf(hhSem(p), 0) : '—'}</td></tr>`;
      }).join('')).join('')}</tbody>
      ${doc ? `<tfoot><tr><td class="rol-n">En turno de día</td>${M.DIAS_SEM.map((_, i) => `<td class="rol-d num">${cuenta('D', i)}</td>`).join('')}<td colspan="2"></td></tr>
        <tr><td class="rol-n">En turno de noche</td>${M.DIAS_SEM.map((_, i) => `<td class="rol-d num">${cuenta('N', i)}</td>`).join('')}<td colspan="2" class="r num"><b>${M.nf(totMant, 0)}</b> <small>HH mant.</small></td></tr></tfoot>` : ''}
    </table></div>
    <div class="rol-ley">${M.COD_ROL.map(k => `<span><i class="rol-c" style="--c:${k.c};--bg:${k.bg}">${k.id}</i>${esc(k.l)}</span>`).join('')}</div>
    <p class="ot-hint" style="margin-top:10px">La capacidad de la semana se calcula con los días de turno (D o N) de cada persona por sus horas de turno y su dedicación a mantenimiento. Descansos, vacaciones, descansos médicos, faltas, permisos y compensatorios no suman horas.</p>`}`;

  const ir = (s) => { SEM = s; vRol(S); };
  main.querySelector('#rAnt').onclick = () => ir(M.masSemanas(SEM, -1));
  main.querySelector('#rSig').onclick = () => ir(M.masSemanas(SEM, 1));
  main.querySelector('#rHoy').onclick = () => ir(M.lunesDe());
  const gen = main.querySelector('#rGen');
  if (gen) gen.onclick = async () => {
    gen.disabled = true;
    const nuevas = Object.fromEntries(faltan.map(p => [p.id, M.filaPropuesta(p, SEM, M.filaRol(S.rol, p.id, previa), S.cfg)]));
    try { await guardar(S, nuevas); S.ctx.toast(doc ? 'Rol completado.' : 'Rol generado. Ajuste los días que hagan falta.'); }
    catch (e) { S.ctx.toast(e.message || 'No se pudo guardar el rol.', 'err'); gen.disabled = false; }
  };
  const re = main.querySelector('#rRe');
  if (re) re.onclick = async () => {
    const ok = await confirmar({ titulo: 'Rehacer el rol', texto: 'Se reemplazan los días de toda la semana por la propuesta desde la semana anterior. Los cambios hechos a mano se pierden.', si: 'Rehacer', peligro: true });
    if (!ok) return;
    const nuevas = Object.fromEntries(ps.filter(p => p.activo !== false).map(p => [p.id, M.filaPropuesta(p, SEM, M.filaRol(S.rol, p.id, previa), S.cfg)]));
    try { await guardar(S, nuevas); S.ctx.toast('Rol rehecho.'); } catch (e) { S.ctx.toast(e.message || 'No se pudo guardar el rol.', 'err'); }
  };
  main.querySelectorAll('button.rol-c').forEach(b => b.onclick = () => elegir(S, b));
  const bi = main.querySelector('#rImg'); if (bi) bi.onclick = () => imagen(S, bi);
  const bx = main.querySelector('#rXls'); if (bx) bx.onclick = () => excel(S, bx);
}

// Guarda filas y actualiza la copia local al instante (el oyente confirma después)
async function guardar(S, filas) {
  const prev = S.rol.get(SEM);
  S.rol.set(SEM, { ...(prev || { semana: SEM }), filas: { ...(prev?.filas || {}), ...filas }, actualizado: M.ahoraLocal(), por: S.usuario });
  vRol(S);
  try { await S.api.guardarRol(SEM, filas); }
  catch (e) { if (prev) S.rol.set(SEM, prev); else S.rol.delete(SEM); vRol(S); throw e; }
}

// Menú de códigos junto a la casilla
function elegir(S, btn) {
  document.querySelector('.rol-menu')?.remove();
  const pid = btn.dataset.p, i = +btn.dataset.d, p = S.per.get(pid);
  const fila = [...(M.filaRol(S.rol, pid, SEM) || ['', '', '', '', '', '', ''])];
  const menu = document.createElement('div');
  menu.className = 'rol-menu'; menu.setAttribute('role', 'menu');
  menu.innerHTML = `<div class="rol-mt">${esc(p?.nombre || '')} · ${M.DIAS_SEM[i]} ${diaDe(i).getDate()}</div>
    <div class="rol-mg">${M.COD_ROL.map(k => `<button type="button" data-c="${k.id}" class="${fila[i] === k.id ? 'on' : ''}" style="--c:${k.c};--bg:${k.bg}"><b>${k.id}</b><span>${esc(k.l)}</span></button>`).join('')}</div>
    <label class="check rol-mr"><input type="checkbox" id="rmR"> Aplicar al resto de la semana</label>`;
  document.body.appendChild(menu);
  const r = btn.getBoundingClientRect(), mw = menu.offsetWidth, mh = menu.offsetHeight;
  const x = Math.max(8, Math.min(window.innerWidth - mw - 8, r.left + r.width / 2 - mw / 2));
  const y = r.bottom + 6 + mh > window.innerHeight - 8 ? Math.max(8, r.top - mh - 6) : r.bottom + 6;
  menu.style.left = x + 'px'; menu.style.top = y + 'px';
  const cerrar = () => { menu.remove(); document.removeEventListener('pointerdown', fuera, true); document.removeEventListener('keydown', esc_); };
  const fuera = (e) => { if (!menu.contains(e.target)) cerrar(); };
  const esc_ = (e) => { if (e.key === 'Escape') { cerrar(); btn.focus(); } };
  setTimeout(() => { document.addEventListener('pointerdown', fuera, true); document.addEventListener('keydown', esc_); }, 0);
  menu.querySelector('button')?.focus();
  menu.querySelectorAll('[data-c]').forEach(b => b.onclick = async () => {
    const c = b.dataset.c, resto = menu.querySelector('#rmR').checked;
    for (let j = i; j < (resto ? 7 : i + 1); j++) fila[j] = c;
    cerrar();
    try { await guardar(S, { [pid]: fila }); } catch (e) { S.ctx.toast(e.message || 'No se pudo guardar.', 'err'); }
  });
}

// ---------- exportación ----------
function hojaImagen(S) {
  const filas = S.rol.get(SEM)?.filas || {}, ps = personasSemana(S).filter(p => filas[p.id]);
  const grupos = [...new Set(ps.map(p => p.grupo || 'Sin grupo'))];
  const th = 'padding:8px 6px;font:600 12px Inter,Arial,sans-serif;color:#fff;background:#12324A;text-align:center';
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-10000px;top:0;width:1040px;background:#fff;padding:22px 26px 20px;font-family:Inter,Arial,sans-serif;color:#0F1B24';
  div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:20px;background:linear-gradient(120deg,#0F2536,#12324A);border-radius:12px;padding:18px 22px;margin-bottom:16px;border-bottom:3px solid #18B8A6">
      <div><div style="font:600 11px Inter,Arial,sans-serif;letter-spacing:.16em;color:#7FE0D3;text-transform:uppercase">Rol de guardia</div>
      <div style="font:700 24px Inter,Arial,sans-serif;margin-top:4px;color:#fff">Semana del ${esc(titSemana(SEM))}</div></div>
      <img src="../../core/marca/logo-negativo.png" style="height:40px" onerror="this.remove()"></div>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="${th};text-align:left;padding-left:10px;border-radius:6px 0 0 0">Personal</th>${M.DIAS_SEM.map((d, i) => `<th style="${th}">${d}<br><span style="font-weight:400;opacity:.8">${diaDe(i).getDate()}/${diaDe(i).getMonth() + 1}</span></th>`).join('')}</tr></thead>
      <tbody>${grupos.map(g => `<tr><td colspan="8" style="padding:9px 10px 5px;font:700 11px Inter,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#087F74;border-bottom:1px solid #CFE1E6">${esc(g)}</td></tr>`
        + ps.filter(p => (p.grupo || 'Sin grupo') === g).map((p, k) => `<tr style="background:${k % 2 ? '#F6F9FB' : '#fff'}"><td style="padding:7px 10px;font:500 13px Inter,Arial,sans-serif;border-bottom:1px solid #E6EDF1">${esc(p.nombre)}<span style="color:#6B7A88;font-size:11px"> · ${esc(M.espDe(p.especialidad).l)}</span></td>
          ${filas[p.id].map(c => { const k2 = M.codRol(c); return `<td style="padding:5px 4px;text-align:center;border-bottom:1px solid #E6EDF1">${c ? `<span style="display:inline-block;min-width:38px;padding:4px 6px;border-radius:6px;font:700 12px Inter,Arial,sans-serif;color:${k2?.c || '#333'};background:${k2?.bg || '#eee'}">${esc(c)}</span>` : ''}</td>`; }).join('')}</tr>`).join('')).join('')}</tbody>
    </table>
    <div style="display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:14px;font:500 11.5px Inter,Arial,sans-serif;color:#465662">${M.COD_ROL.map(k => `<span><b style="color:${k.c};background:${k.bg};padding:2px 6px;border-radius:4px;margin-right:4px">${k.id}</b>${esc(k.l)}</span>`).join('')}</div>
    <div style="margin-top:14px;font:500 11px Inter,Arial,sans-serif;color:#6B7A88">Departamento de Mantenimiento</div>`;
  return div;
}

async function imagen(S, b) {
  b.disabled = true;
  try {
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const div = hojaImagen(S); document.body.appendChild(div);
    await new Promise(r => setTimeout(r, 120));
    const canvas = await window.html2canvas(div, { scale: 2, backgroundColor: '#FFFFFF', logging: false });
    div.remove();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const nombre = `Rol_de_guardia_${SEM}.png`, file = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer:coarse)').matches) {
      try { await navigator.share({ files: [file], title: `Rol de guardia · semana del ${titSemana(SEM)}` }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { S.ctx.toast(e.message || 'No se pudo generar la imagen.', 'err'); }
  finally { b.disabled = false; }
}

async function excel(S, b) {
  b.disabled = true;
  try {
    await cargarScript('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js');
    const filas = S.rol.get(SEM)?.filas || {}, ps = personasSemana(S).filter(p => filas[p.id]);
    const wb = new window.ExcelJS.Workbook(), ws = wb.addWorksheet(`Semana ${SEM}`, { views: [{ state: 'frozen', ySplit: 4, xSplit: 1 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 } });
    ws.columns = [{ width: 34 }, ...M.DIAS_SEM.map(() => ({ width: 9 })), { width: 9 }];
    ws.mergeCells('A1:I1'); ws.getCell('A1').value = `Rol de guardia · Semana del ${titSemana(SEM)}`; ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF0F1B24' } };
    ws.mergeCells('A2:I2'); ws.getCell('A2').value = 'Departamento de Mantenimiento'; ws.getCell('A2').font = { size: 10, color: { argb: 'FF6B7A88' } };
    const hd = ws.getRow(4); hd.values = ['Personal', ...M.DIAS_SEM.map((d, i) => `${d} ${diaDe(i).getDate()}/${diaDe(i).getMonth() + 1}`), 'Turnos'];
    hd.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF12324A' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; });
    hd.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }; hd.height = 22;
    const argb = (h) => 'FF' + h.replace('#', '').toUpperCase();
    const borde = { bottom: { style: 'thin', color: { argb: 'FFE1E8ED' } } };
    [...new Set(ps.map(p => p.grupo || 'Sin grupo'))].forEach(g => {
      const rg = ws.addRow([g]); rg.font = { bold: true, color: { argb: 'FF087F74' } }; ws.mergeCells(`A${rg.number}:I${rg.number}`);
      ps.filter(p => (p.grupo || 'Sin grupo') === g).forEach(p => {
        const f = filas[p.id], r = ws.addRow([`${p.nombre} · ${M.espDe(p.especialidad).l}`, ...f, f.filter(M.trabajaRol).length]);
        r.eachCell((c, n) => {
          c.border = borde;
          if (n >= 2 && n <= 8) { const k = M.codRol(c.value); c.alignment = { horizontal: 'center' }; if (k) { c.font = { bold: true, color: { argb: argb(k.c) } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(k.bg) } }; } }
          if (n === 9) c.alignment = { horizontal: 'center' };
        });
      });
    });
    ws.addRow([]);
    ws.addRow(['Códigos: ' + M.COD_ROL.map(k => `${k.id} ${k.l}`).join(' · ')]).font = { size: 9, color: { argb: 'FF465662' } };
    const buf = await wb.xlsx.writeBuffer();
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    a.download = `Rol_de_guardia_${SEM}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch (e) { S.ctx.toast(e.message || 'No se pudo generar el Excel.', 'err'); }
  finally { b.disabled = false; }
}
