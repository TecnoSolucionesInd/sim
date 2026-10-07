// Módulo Llenar formatos: pensado para el celular del técnico.
// Borradores en el dispositivo, cola de envío cuando no hay señal, pendientes por turno/periodo y por formato generado.
import { toast } from '../../core/core.js';
import { norm } from '../../core/maestros.js';
import * as D from './datos.js';
import { IC, modal, confirmar, reducirFoto } from './ui.js';
import { esc, clonar, firmasDe, tablaDeEquipos, pideUbicacion, rangoTxt, ESTADOS_COLUMNA, turnosDe, SISTEMAS } from './modelo.js';
import {
  turnoActual, periodoClave, periodoTxt, inicioConsulta, FREC_PERIODICAS, columnasTabla, ubicacionesDe, etiquetaCol,
  numero, fueraDeRango, minutosEntre, duracionTxt, evaluar, calcularDuraciones, equiposDelRegistro, estadoColumna,
  fechaISO, horaHM, fechaHoraLocal, fechaLarga, filtrarEquiposPor
} from './logica.js';

const CSS = `
.ll{max-width:780px;margin:0 auto}
.ll .field{font-size:16px}
.ll-h{margin-bottom:18px}
.ll-h h1{font-size:32px;margin-top:10px}
.ll-sub{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:10px;color:var(--tx-2);font-size:14.5px}
.ll-sub .pill{background:rgba(111,227,207,.16);color:#8FF0DE}
.ll-sec{margin-top:24px}
.ll-sec>h2{font-family:var(--f-mono);font-size:11.5px;letter-spacing:2px;text-transform:uppercase;color:var(--tx-3);font-weight:500;margin:0 0 10px;display:flex;align-items:center;gap:10px}
.ll-sec>h2 span{font-family:var(--f-body);letter-spacing:0;text-transform:none;font-size:12px;padding:2px 9px;border-radius:999px;background:rgba(255,255,255,.08);color:var(--tx-2)}
.ll-card{display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:15px 16px;border-radius:16px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);margin-bottom:10px;color:var(--tx);transition:transform .2s var(--ease),border-color .2s,background .2s;animation:rise .5s var(--ease) both}
.ll-card:hover{border-color:rgba(255,255,255,.26);background:rgba(255,255,255,.08)}
.ll-card:active{transform:scale(.99)}
.ll-card .ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:rgba(111,227,207,.14);color:var(--mint-2)}
.ll-card .ico.am{background:rgba(245,185,74,.16);color:var(--amber-2)}
.ll-card .ico.rd{background:rgba(255,143,143,.15);color:#FFB3B3}
.ll-card .ico.lv{background:rgba(169,180,255,.16);color:#C5CCFF}
.ll-card .tx{flex:1;min-width:0}
.ll-card .tx b{display:block;font-weight:500;font-size:15px;line-height:1.3}
.ll-card .tx small{display:block;color:var(--tx-3);font-size:12.5px;margin-top:3px;line-height:1.4}
.ll-card .cd{font-family:var(--f-mono);font-size:11.5px;color:var(--mint-2)}
.ll-card .chev{color:var(--tx-3);flex-shrink:0}
.ll-card.obs{border-color:rgba(255,143,143,.35);background:rgba(255,143,143,.06)}
.ll-card .coment{display:block;margin-top:6px;padding:8px 10px;border-radius:10px;background:rgba(14,22,30,.3);font-size:13px;color:#FFD0D0;line-height:1.45}
.ll-ok{display:flex;flex-wrap:wrap;gap:8px}
.ll-ok span{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:999px;background:rgba(111,227,207,.1);color:#8FF0DE;font-size:12.5px}
.ll-cola{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:rgba(245,185,74,.1);border:1px solid rgba(245,185,74,.35);color:#FFE3AE;font-size:14px;margin-bottom:6px;flex-wrap:wrap}
.ll-cola.err{background:rgba(255,143,143,.1);border-color:rgba(255,143,143,.4);color:#FFD0D0}
.ll-busca{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.ll-grupo{font-size:12.5px;color:var(--tx-3);margin:14px 2px 8px}
/* formulario */
.lf-top{position:sticky;top:0;z-index:15;margin:0 -36px;padding:12px 36px 12px;background:rgba(46,58,71,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid rgba(255,255,255,.08)}
.lf-top .r1{display:flex;align-items:center;gap:12px}
.lf-top .r1 .tt{flex:1;min-width:0}
.lf-top .r1 .tt b{display:block;font-family:var(--f-display);font-weight:600;font-size:16px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lf-top .r1 .tt small{font-family:var(--f-mono);font-size:11.5px;color:var(--mint-2)}
.lf-prog{display:flex;gap:4px;margin-top:12px}
.lf-prog button{flex:1;height:6px;border-radius:3px;border:0;padding:0;background:rgba(255,255,255,.14);transition:background .3s}
.lf-prog button.ok{background:rgba(111,227,207,.55)}
.lf-prog button.fal{background:rgba(245,185,74,.55)}
.lf-prog button.on{background:var(--mint)}
.lf-paso{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-size:12.5px;color:var(--tx-2)}
.lf-body{padding:20px 0 120px;animation:fadein .35s ease both}
.lf-body h2{font-family:var(--f-display);font-weight:600;font-size:22px;margin:0 0 16px}
.lf-f{margin-bottom:18px}
.lf-f>label,.lf-f>.lb{display:block;font-size:14px;font-weight:500;color:#DCE3EA;margin-bottom:8px}
.lf-f>label sup,.lf-f>.lb sup{color:var(--amber-2)}
.lf-f .ay{font-size:12.5px;color:var(--tx-3);margin-top:6px;line-height:1.4}
.lf-f.err .field,.lf-f.err .chs{box-shadow:0 0 0 2px rgba(245,185,74,.6);border-radius:12px}
.lf-f.err .falta{display:block}
.falta{display:none;font-size:12.5px;color:var(--amber-2);margin-top:6px}
.chs{display:flex;flex-wrap:wrap;gap:8px}
.chs button{min-height:46px;padding:0 18px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(14,22,30,.3);color:var(--tx-2);font-size:15px;font-weight:500;transition:background .2s,border-color .2s,color .2s}
.chs button.on{background:var(--mint);border-color:var(--mint);color:var(--mint-ink)}
.chs button.on.nc{background:#FF8F8F;border-color:#FF8F8F;color:#3A0F0F}
.chs button.on.na{background:#C3CDD8;border-color:#C3CDD8;color:#1E2A36}
.num{display:flex;align-items:center;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(14,22,30,.32);height:52px;transition:border-color .2s,box-shadow .2s}
.num:focus-within{border-color:var(--mint);box-shadow:0 0 0 4px rgba(111,227,207,.15)}
.num input{flex:1;min-width:0;height:100%;border:0;background:transparent;color:var(--tx);font-size:19px;font-family:var(--f-mono);padding:0 14px;outline:none}
.num .u{padding:0 14px;color:var(--tx-3);font-size:14px;white-space:nowrap}
.num.al{border-color:#FF8F8F;background:rgba(255,143,143,.1)}
.num.al input{color:#FFB3B3}
.rg{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--tx-3);margin-top:6px}
.rg .alx{color:#FFB3B3;display:none;align-items:center;gap:4px}
.num.al+.rg .alx{display:inline-flex}
.dur{padding:14px 16px;border-radius:12px;background:rgba(111,227,207,.08);border:1px solid rgba(111,227,207,.25);font-family:var(--f-mono);font-size:17px;color:var(--mint-2)}
.dur.neg{background:rgba(255,143,143,.08);border-color:rgba(255,143,143,.35);color:#FFB3B3}
.eqsel{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(14,22,30,.32);text-align:left;color:var(--tx)}
.eqsel b{font-family:var(--f-mono);font-size:14px;color:var(--mint-2);font-weight:500}
.eqsel span{flex:1;min-width:0;font-size:14.5px}
.eqsel .ph{color:var(--tx-3)}
.foto{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.foto img{width:120px;height:90px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.2)}
.foto .vacia{width:120px;height:90px;border-radius:12px;border:1.5px dashed rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;color:var(--tx-3)}
.lf-bar{position:fixed;left:0;right:0;bottom:0;z-index:25;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:rgba(42,53,66,.95);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:center}
.lf-bar>div{width:100%;max-width:780px;display:flex;gap:10px}
.lf-bar .btn{height:52px;font-size:15px}
.lf-bar .btn-primary{flex:1}
@media (min-width:901px){.lf-bar{left:280px}}
/* tabla por equipo */
.tcols{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px 8px;scrollbar-width:thin}
.tcols button{flex-shrink:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:92px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(14,22,30,.3);color:var(--tx-2);text-align:left}
.tcols button b{font-family:var(--f-mono);font-size:13.5px;font-weight:500;color:var(--tx);display:flex;align-items:center;gap:6px}
.tcols button small{font-size:11.5px}
.tcols button.on{border-color:var(--mint);background:rgba(111,227,207,.12)}
.dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25);flex-shrink:0}
.dot.ok{background:var(--mint)}.dot.fal{background:var(--amber)}.dot.al{background:#FF8F8F}.dot.no{background:#8B97A3}
.tpanel{padding:16px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
.tpanel .eqn{font-size:15px;font-weight:500;margin-bottom:12px}
.tpanel .eqn small{display:block;color:var(--tx-3);font-weight:400;font-size:12.5px;margin-top:2px}
.tnav{display:flex;justify-content:space-between;gap:10px;margin-top:6px}
/* checklist */
.ck{padding:14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);margin-bottom:10px}
.ck p{margin:0 0 10px;font-size:15px;line-height:1.4}
.ck p i{font-style:normal;font-family:var(--f-mono);font-size:12px;color:var(--tx-3);margin-right:6px}
.ck .chs button{flex:1;min-width:70px;padding:0 10px}
.ck.err{box-shadow:0 0 0 2px rgba(245,185,74,.6)}
/* lista */
.lrow{padding:14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);margin-bottom:10px}
.lrow .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;font-family:var(--f-mono);font-size:12px;color:var(--tx-3)}
.lrow .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
/* cierre */
.res{padding:14px 16px;border-radius:14px;margin-bottom:12px;font-size:14px;line-height:1.5}
.res.al{background:rgba(255,143,143,.08);border:1px solid rgba(255,143,143,.3)}
.res.fa{background:rgba(245,185,74,.08);border:1px solid rgba(245,185,74,.3)}
.res.ok{background:rgba(111,227,207,.08);border:1px solid rgba(111,227,207,.3);color:#CFF8F0}
.res h3{margin:0 0 8px;font-size:14.5px;font-weight:600;display:flex;align-items:center;gap:8px}
.res ul{margin:0;padding-left:18px}
.res li{margin-bottom:4px}
.res button.lk{background:none;border:0;padding:0;color:inherit;text-decoration:underline;text-underline-offset:3px;font-size:14px;text-align:left}
.fir{padding:14px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);margin-bottom:12px}
.fir h4{margin:0 0 4px;font-size:14.5px;font-weight:600}
.fir p{margin:0;color:var(--tx-2);font-size:13.5px;line-height:1.45}
.pad{position:relative;margin-top:10px;border-radius:12px;background:#fff;touch-action:none;height:170px}
.pad canvas{width:100%;height:100%;display:block;border-radius:12px}
.pad .lim{position:absolute;right:8px;top:8px;height:32px;padding:0 12px;border-radius:8px;border:1px solid #C9D2DB;background:#F4F6F8;color:#33414F;font-size:12.5px}
.pad .lin{position:absolute;left:16px;right:16px;bottom:34px;border-bottom:1px dashed #B4C0CC;pointer-events:none}
.pad .ph{position:absolute;left:16px;bottom:12px;font-size:11.5px;color:#8A96A3;pointer-events:none}
body:has(.lf-bar) .toasts{bottom:calc(88px + env(safe-area-inset-bottom))}
.okfin{text-align:center;padding:48px 20px}
.okfin .ic{width:72px;height:72px;border-radius:50%;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;background:rgba(111,227,207,.16);color:var(--mint-2);animation:pop .6s var(--ease) both}
.okfin .ic svg{width:36px;height:36px}
.okfin h2{font-family:var(--f-display);font-weight:600;font-size:24px;margin:0 0 8px}
.okfin .nro{font-family:var(--f-mono);font-size:18px;color:var(--mint-2);margin:10px 0 22px}
@media (max-width:900px){.lf-top{margin:0 -16px;padding:10px 16px}.ll-h h1{font-size:27px}}
`;

let A = null;                 // accesos del aplicativo: ctx, cfg, plantillas, equipos
let F = null;                 // llenado en curso
let DATA = null;              // { registros, pendientes, observados }
let MAIN = null;
let FILTRO = '';
let procesando = false;
let tGuardar = null;

const uidU = () => A.ctx.user.uid;
const nombreU = () => A.ctx.perfil?.nombre || A.ctx.user.email;
const keyB = () => `sim.fmt.borr.${uidU()}`;
const keyC = () => `sim.fmt.cola.${uidU()}`;
const leerLS = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch { return d; } };
const escribirLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('El celular no tiene espacio para guardar el borrador. Envíe o descarte borradores con fotos.', 'err'); return false; } };
const borradores = () => leerLS(keyB(), {});
const cola = () => leerLS(keyC(), []);
const vigentes = () => A.plantillas.filter(p => p.estado === 'vigente' && p.def);
const plantillaPorId = (id) => A.plantillas.find(p => p.id === id);
const mayus = (t) => t ? t[0].toUpperCase() + t.slice(1) : t;
const sisNom = (id) => (SISTEMAS.find(s => s.id === Number(id)) || {}).nombre || '';

export function salirLlenado() { if (F) guardarBorrador(true); }

export async function vistaLlenar(main, app) {
  A = app; MAIN = main;
  if (!document.getElementById('llcss')) document.head.insertAdjacentHTML('beforeend', `<style id="llcss">${CSS}</style>`);
  if (F) return pintarFormulario();
  main.innerHTML = '<div class="ll"><div class="skel" style="height:40px;width:60%;margin:20px 0"></div><div class="skel" style="height:72px;margin-bottom:10px"></div><div class="skel" style="height:72px"></div></div>';
  procesarCola();
  await cargarDatos();
  if (MAIN === main && !F) pintarInicio();
}

async function cargarDatos() {
  const hoy = turnoActual(A.cfg);
  const desde = inicioConsulta(hoy.fechaOp);
  const [registros, pendientes, observados] = await Promise.all([
    D.registrosDesde(desde).catch(() => null),
    D.pendientesAbiertos().catch(() => []),
    D.misObservados(uidU()).catch(() => [])
  ]);
  DATA = { registros, pendientes, observados, sinConexion: registros === null };
}

// =====================================================================
// INICIO
// =====================================================================
function calcularPendientes(hoy) {
  const regs = DATA.registros || [];
  const enCola = cola().map(c => c.paquete.reg);
  const todos = regs.concat(enCola);
  const borrs = Object.values(borradores());
  const per = [], hechos = [];
  vigentes().filter(p => FREC_PERIODICAS.includes(p.def.frecuencia)).forEach(p => {
    const frec = p.def.frecuencia;
    const clave = periodoClave(frec, hoy.fechaOp, hoy.turno);
    let ubis = [''];
    if (pideUbicacion(p.def)) { ubis = ubicacionesDe(p.def, A.equipos); if (!ubis.length) return; }
    ubis.forEach(ubi => {
      const mismo = (r) => r.plantillaId === p.id && periodoClave(frec, r.fechaOp, r.turno) === clave && norm(r.ubicacion || '') === norm(ubi);
      const hecho = todos.find(mismo);
      const item = { p, ubi, periodo: periodoTxt(frec, hoy.fechaOp, hoy.turno) };
      if (hecho) hechos.push({ ...item, reg: hecho });
      else if (!borrs.some(b => mismo(b.reg))) per.push(item);
    });
  });
  const gen = (DATA.pendientes || []).filter(x => !enCola.some(r => r.pendienteId === x.id) && !borrs.some(b => b.pendienteId === x.id))
    .map(x => ({ x, p: vigentes().find(p => p.codigo === x.codigo) })).filter(g => g.p);
  return { per, hechos, gen };
}

function pintarInicio() {
  const hoy = turnoActual(A.cfg);
  const { per, hechos, gen } = calcularPendientes(hoy);
  const borrs = Object.entries(borradores()).sort((a, b) => String(b[1].actualizado).localeCompare(a[1].actualizado));
  const c = cola();
  const obs = (DATA.observados || []).filter(o => !c.some(q => q.paquete.reg.id === o.id) && !borrs.some(([, b]) => b.reg.id === o.id));
  const vig = vigentes();
  const q = norm(FILTRO);
  const lista = vig.filter(p => !q || norm(`${p.codigo} ${p.def.nombre}`).includes(q)).sort((a, b) => String(a.codigo).localeCompare(b.codigo));
  const conError = c.filter(x => x.error);
  MAIN.innerHTML = `<div class="ll">
    <div class="ll-h">
      <div class="eyebrow rise">Registro de formatos</div>
      <h1 class="h-display rise d1">Llenar formatos</h1>
      <div class="ll-sub rise d2"><span>${esc(mayus(fechaLarga(hoy.fechaOp)))}</span>${hoy.turno ? `<span class="pill">Turno ${esc(hoy.turno)}</span>` : ''}</div>
    </div>
    ${c.length ? `<div class="ll-cola ${conError.length ? 'err' : ''} rise d2">${navigator.onLine ? IC.cloud : IC.wifiOff}<div style="flex:1;min-width:180px">${c.length} registro${c.length > 1 ? 's' : ''} en cola de envío${conError.length ? ` · ${esc(conError[0].error)}` : navigator.onLine ? '' : ' · se enviarán al recuperar la señal'}</div><button class="btn sm" id="bCola">Reintentar</button></div>` : ''}
    ${DATA.sinConexion ? '<div class="alert warn rise d2" style="margin-bottom:6px">Sin conexión: los pendientes pueden no estar al día. Puede llenar formatos igual; se enviarán al recuperar la señal.</div>' : ''}
    ${obs.length ? `<div class="ll-sec"><h2>Observados por el supervisor <span>${obs.length}</span></h2>
      ${obs.map((o, i) => `<button class="ll-card obs" data-obs="${o.id}" style="animation-delay:${i * .04}s"><span class="ico rd">${IC.alert}</span><span class="tx"><span class="cd">${esc(o.numero)}</span><b>${esc(o.nombre)}</b>
        ${o.observacion ? `<span class="coment">${esc(o.observacion.comentario)}<br><small style="color:var(--tx-3)">${esc(o.observacion.usuario)}</small></span>` : ''}</span><span class="chev">${IC.chev}</span></button>`).join('')}</div>` : ''}
    ${borrs.length ? `<div class="ll-sec"><h2>Borradores en este celular <span>${borrs.length}</span></h2>
      ${borrs.map(([k, b], i) => `<div class="ll-card" style="animation-delay:${i * .04}s;cursor:default"><span class="ico am">${IC.edit}</span><span class="tx"><span class="cd">${esc(b.reg.codigo)}${b.reg.numero ? ' · ' + esc(b.reg.numero) : ''}</span><b>${esc(b.reg.nombre)}</b><small>${esc(b.reg.ubicacion ? b.reg.ubicacion + ' · ' : '')}Guardado ${esc(hace(b.actualizado))}</small></span>
        <button class="btn sm" data-bdel="${k}" aria-label="Descartar borrador">${IC.del}</button><button class="btn sm btn-primary" data-bcont="${k}">Continuar</button></div>`).join('')}</div>` : ''}
    ${per.length || gen.length ? `<div class="ll-sec"><h2>Pendientes <span>${per.length + gen.length}</span></h2>
      ${gen.map((g, i) => `<button class="ll-card" data-gen="${g.x.id}" style="animation-delay:${i * .04}s"><span class="ico lv">${IC.file}</span><span class="tx"><span class="cd">${esc(g.p.codigo)}</span><b>${esc(g.p.def.nombre)}</b><small>${g.x.equipo ? esc(g.x.equipo.codigo + ' · ' + (g.x.equipo.descripcion || '')) + ' · ' : ''}desde ${esc(g.x.origen?.numero || '')}</small></span><span class="chev">${IC.chev}</span></button>`).join('')}
      ${per.map((x, i) => `<button class="ll-card" data-per="${x.p.id}" data-ubi="${esc(x.ubi)}" style="animation-delay:${(gen.length + i) * .04}s"><span class="ico">${IC.clock}</span><span class="tx"><span class="cd">${esc(x.p.codigo)}</span><b>${esc(x.p.def.nombre)}</b><small>${esc(x.periodo)}${x.ubi ? ' · ' + esc(x.ubi) : ''}</small></span><span class="chev">${IC.chev}</span></button>`).join('')}
    </div>` : ''}
    ${hechos.length ? `<div class="ll-sec"><h2>Al día</h2><div class="ll-ok">${hechos.map(h => `<span>${IC.check}${esc(h.p.codigo)}${h.ubi ? ' · ' + esc(h.ubi) : ''} · ${esc(h.periodo)}</span>`).join('')}</div></div>` : ''}
    <div class="ll-sec"><h2>Todos los formatos</h2>
      ${vig.length > 6 ? `<div class="ll-busca"><input class="field" id="llQ" type="search" placeholder="Buscar formato" value="${esc(FILTRO)}" aria-label="Buscar formato"></div>` : ''}
      <div id="llLista">${listaFormatos(lista)}</div>
      ${!vig.length ? '<div class="glass" style="padding:28px;text-align:center"><div class="muted">Todavía no hay formatos vigentes. Se emiten en el módulo Plantillas.</div></div>' : ''}
    </div>
  </div>`;
  const $ = (s) => MAIN.querySelector(s);
  if ($('#bCola')) $('#bCola').onclick = async () => { await procesarCola(true); };
  if ($('#llQ')) $('#llQ').oninput = (e) => { FILTRO = e.target.value; const qq = norm(FILTRO); $('#llLista').innerHTML = listaFormatos(vig.filter(p => !qq || norm(`${p.codigo} ${p.def.nombre}`).includes(qq)).sort((a, b) => String(a.codigo).localeCompare(b.codigo))); enlazarLista(); };
  MAIN.querySelectorAll('[data-obs]').forEach(b => b.onclick = () => corregir(DATA.observados.find(o => o.id === b.dataset.obs)));
  MAIN.querySelectorAll('[data-bcont]').forEach(b => b.onclick = () => continuar(b.dataset.bcont));
  MAIN.querySelectorAll('[data-bdel]').forEach(b => b.onclick = async () => {
    if (!await confirmar('Descartar borrador', 'Se borra del celular lo avanzado en este formato.', { boton: 'Descartar', peligro: true })) return;
    const bs = borradores(); delete bs[b.dataset.bdel]; escribirLS(keyB(), bs); pintarInicio();
  });
  MAIN.querySelectorAll('[data-gen]').forEach(b => b.onclick = () => { const g = gen.find(x => x.x.id === b.dataset.gen); iniciar(g.p, { pendiente: g.x }); });
  MAIN.querySelectorAll('[data-per]').forEach(b => b.onclick = () => iniciar(plantillaPorId(b.dataset.per), { ubicacion: b.dataset.ubi }));
  enlazarLista();
}

function listaFormatos(lista) {
  let out = '', sis = null;
  lista.forEach((p, i) => {
    if (p.sistema !== sis) { sis = p.sistema; out += `<div class="ll-grupo">${esc(sisNom(sis))}</div>`; }
    out += `<button class="ll-card" data-nuevo="${p.id}" style="animation-delay:${Math.min(i, 10) * .03}s"><span class="ico" style="background:rgba(255,255,255,.07);color:var(--tx-2)">${IC.file}</span><span class="tx"><span class="cd">${esc(p.codigo)}</span><b>${esc(p.def.nombre)}</b><small>${esc(p.def.frecuencia)}</small></span><span class="chev">${IC.mas}</span></button>`;
  });
  return out || (lista.length === 0 && FILTRO ? '<div class="muted" style="padding:8px 4px">Ningún formato coincide.</div>' : '');
}
function enlazarLista() { MAIN.querySelectorAll('[data-nuevo]').forEach(b => b.onclick = () => iniciar(plantillaPorId(b.dataset.nuevo))); }

function hace(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

// =====================================================================
// INICIO DE UN LLENADO
// =====================================================================
function iniciar(p, { pendiente = null, ubicacion = '' } = {}) {
  if (!p || !p.def) return toast('El formato no está disponible.', 'err');
  const hoy = turnoActual(A.cfg);
  const def = clonar(p.def);
  const reg = {
    id: D.nuevoIdRegistro(), plantillaId: p.id, codigo: p.codigo, nombre: def.nombre,
    version: p.versionManual, revision: p.revision, fechaRev: p.fecha,
    fechaOp: hoy.fechaOp, turno: def.datosGenerales?.turno ? hoy.turno : '', hora: def.datosGenerales?.hora ? horaHM(new Date()) : '',
    ubicacion: pideUbicacion(def) ? ubicacion : '', v: {}, observaciones: '', firmas: firmasDe(def).map(() => ({}))
  };
  if (pendiente) {
    reg.origen = pendiente.origen; reg.pendienteId = pendiente.id;
    def.secciones.forEach(s => (s.campos || []).forEach(c => {
      if (c.tipo === 'equipo' && pendiente.equipo && !reg.v[c.id]) reg.v[c.id] = pendiente.equipo;
      if (c.tipo === 'referencia' && pendiente.origen?.numero && !reg.v[c.id]) reg.v[c.id] = pendiente.origen.numero;
    }));
  }
  armarTablas(def, reg);
  F = { key: reg.id, reg, def, paso: 0, modo: 'nuevo', pendienteId: pendiente?.id || null, intento: false, col: {} };
  guardarBorrador(true);
  pintarFormulario();
}

function continuar(k) {
  const b = borradores()[k];
  if (!b) return;
  const p = plantillaPorId(b.reg.plantillaId);
  const def = b.def || p?.def;
  if (!def) return toast('El formato ya no está disponible.', 'err');
  F = { key: k, reg: b.reg, def, paso: b.paso || 0, modo: b.modo || 'nuevo', pendienteId: b.pendienteId || null, intento: false, col: {}, fotosCambiadas: b.fotosCambiadas || [] };
  pintarFormulario();
}

async function corregir(o) {
  if (!o) return;
  MAIN.innerHTML = '<div class="ll" style="display:flex;justify-content:center;padding:80px 0"><div class="spinner"></div></div>';
  try {
    const p = plantillaPorId(o.plantillaId);
    let def = p && p.versionManual === o.version && p.revision === o.revision ? p.def : null;
    if (!def) def = (await D.defDeRevision(o.plantillaId, o.version, o.revision))?.def;
    if (!def) throw new Error('No se encontró la revisión del formato.');
    const reg = clonar(o);
    reg.firmas = firmasDe(def).map((f, i) => (reg.firmas || [])[i] || {});
    F = { key: o.id, reg, def: clonar(def), paso: 0, modo: 'corregir', intento: false, col: {}, fotosCambiadas: [] };
    guardarBorrador(true);
    pintarFormulario();
  } catch (e) { toast(e.message || 'No se pudo abrir el registro.', 'err'); pintarInicio(); }
}

// Columnas de las tablas según los equipos de la base (conserva lo ya llenado)
function armarTablas(def, reg) {
  def.secciones.filter(s => s.tipo === 'tabla').forEach(s => {
    const t = reg.v[s.id] || { cols: [], est: {}, c: {} };
    t.cols = columnasTabla(s, A.equipos, reg.ubicacion);
    t.est = t.est || {}; t.c = t.c || {};
    reg.v[s.id] = t;
  });
}

function guardarBorrador(inmediato = false) {
  if (!F) return;
  clearTimeout(tGuardar);
  const hacer = () => {
    if (!F) return;
    const bs = borradores();
    bs[F.key] = { reg: F.reg, def: F.modo === 'corregir' ? F.def : undefined, paso: F.paso, modo: F.modo, pendienteId: F.pendienteId, fotosCambiadas: F.fotosCambiadas || [], actualizado: new Date().toISOString() };
    escribirLS(keyB(), bs);
  };
  if (inmediato) hacer(); else tGuardar = setTimeout(hacer, 500);
}

// =====================================================================
// FORMULARIO
// =====================================================================
const nPasos = () => F.def.secciones.length + 2;
const tituloPaso = (i) => i === 0 ? 'Datos generales' : i === nPasos() - 1 ? 'Cierre y firmas' : (F.def.secciones[i - 1].titulo || `Sección ${i}`);

function pintarFormulario() {
  const ev = evaluar(F.def, F.reg, A.cfg);
  const fal = new Set(ev.faltantes.map(x => x.paso));
  MAIN.innerHTML = `<div class="ll">
    <div class="lf-top">
      <div class="r1">
        <button class="btn btn-icon" id="lfSalir" aria-label="Guardar y salir" title="Guardar y salir">${IC.back}</button>
        <div class="tt"><small>${esc(F.reg.codigo)}${F.reg.numero ? ' · ' + esc(F.reg.numero) : ''}</small><b>${esc(F.def.nombre)}</b></div>
      </div>
      <div class="lf-prog">${Array.from({ length: nPasos() }, (_, i) => `<button type="button" data-ir="${i}" class="${i === F.paso ? 'on' : (F.intento || i < F.paso) ? (fal.has(i) ? 'fal' : 'ok') : ''}" aria-label="Paso ${i + 1}: ${esc(tituloPaso(i))}"></button>`).join('')}</div>
      <div class="lf-paso"><span>Paso ${F.paso + 1} de ${nPasos()}</span><span>${esc(tituloPaso(F.paso))}</span></div>
    </div>
    <div class="lf-body" id="lfBody"></div>
  </div>
  <div class="lf-bar"><div>
    <button class="btn" id="lfAnt" ${F.paso === 0 ? 'disabled' : ''}>${IC.back}</button>
    ${F.paso < nPasos() - 1 ? `<button class="btn btn-primary" id="lfSig">Siguiente</button>` : `<button class="btn btn-primary" id="lfEnv">${IC.send}${F.modo === 'corregir' ? 'Reenviar registro' : 'Enviar registro'}</button>`}
  </div></div>`;
  const body = MAIN.querySelector('#lfBody');
  if (F.paso === 0) pasoGenerales(body);
  else if (F.paso === nPasos() - 1) pasoCierre(body, ev);
  else {
    const s = F.def.secciones[F.paso - 1];
    body.innerHTML = `<h2>${esc(s.titulo)}</h2><div id="lfSec"></div>`;
    const box = body.querySelector('#lfSec');
    if (s.tipo === 'campos') pasoCampos(box, s);
    else if (s.tipo === 'tabla') pasoTabla(box, s);
    else if (s.tipo === 'checklist') pasoChecklist(box, s);
    else if (s.tipo === 'lista') pasoLista(box, s);
  }
  if (F.intento) marcarFaltantes(ev);
  MAIN.querySelector('#lfSalir').onclick = () => { guardarBorrador(true); F = null; vistaLlenar(MAIN, A); };
  MAIN.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irPaso(Number(b.dataset.ir)));
  MAIN.querySelector('#lfAnt').onclick = () => irPaso(F.paso - 1);
  const sig = MAIN.querySelector('#lfSig'); if (sig) sig.onclick = () => irPaso(F.paso + 1);
  const env = MAIN.querySelector('#lfEnv'); if (env) env.onclick = enviar;
}

function irPaso(i) {
  if (i < 0 || i >= nPasos()) return;
  F.paso = i;
  guardarBorrador();
  pintarFormulario();
  window.scrollTo({ top: 0 });
}

function cambio() { guardarBorrador(); actualizarProgreso(); }
function actualizarProgreso() {
  const ev = evaluar(F.def, F.reg, A.cfg);
  const fal = new Set(ev.faltantes.map(x => x.paso));
  MAIN.querySelectorAll('.lf-prog [data-ir]').forEach(b => {
    const i = Number(b.dataset.ir);
    b.className = i === F.paso ? 'on' : (F.intento || i < F.paso) ? (fal.has(i) ? 'fal' : 'ok') : '';
  });
  if (F.intento) marcarFaltantes(ev);
}
function marcarFaltantes(ev) {
  const refs = new Set(ev.faltantes.filter(x => x.paso === F.paso).map(x => x.ref));
  MAIN.querySelectorAll('[data-ref]').forEach(el => el.classList.toggle('err', refs.has(el.dataset.ref)));
}

// ---------------- paso 0 ----------------
function pasoGenerales(body) {
  const dg = F.def.datosGenerales || {};
  const tur = turnosDe(A.cfg);
  const ubis = pideUbicacion(F.def) ? ubicacionesDe(F.def, A.equipos) : [];
  const r = F.reg;
  body.innerHTML = `<h2>Datos generales</h2>
    ${r.origen ? `<div class="res ok" style="margin-bottom:18px">${IC.file} Generado desde <b>${esc(r.origen.numero || '')}</b>${r.origen.nombre ? ' · ' + esc(r.origen.nombre) : ''}</div>` : ''}
    ${F.modo === 'corregir' && r.observacion ? `<div class="res al" style="margin-bottom:18px"><h3>${IC.alert}Observación del supervisor</h3>${esc(r.observacion.comentario)}<div style="color:var(--tx-3);font-size:12.5px;margin-top:6px">${esc(r.observacion.usuario)}</div></div>` : ''}
    <div class="lf-f" data-ref="g-fecha"><label for="gF">Fecha <sup>*</sup></label><input class="field" type="date" id="gF" value="${esc(r.fechaOp)}" max="${fechaISO(new Date())}"><span class="falta">Indique la fecha</span></div>
    ${dg.turno && tur.length ? `<div class="lf-f" data-ref="g-turno"><div class="lb">Turno <sup>*</sup></div><div class="chs" id="gT">${tur.map(t => `<button type="button" data-v="${esc(t.nombre)}" class="${r.turno === t.nombre ? 'on' : ''}">${esc(t.nombre)}</button>`).join('')}</div><span class="falta">Seleccione el turno</span></div>` : ''}
    ${dg.hora ? `<div class="lf-f" data-ref="g-hora"><label for="gH">Hora <sup>*</sup></label><div style="display:flex;gap:8px"><input class="field" type="time" id="gH" value="${esc(r.hora)}"><button type="button" class="btn" id="gHn" style="height:48px">Ahora</button></div><span class="falta">Indique la hora</span></div>` : ''}
    ${pideUbicacion(F.def) ? `<div class="lf-f" data-ref="g-ubi"><div class="lb">Ubicación <sup>*</sup></div><div class="chs" id="gU">${ubis.map(u => `<button type="button" data-v="${esc(u)}" class="${norm(r.ubicacion) === norm(u) ? 'on' : ''}">${esc(u)}</button>`).join('') || '<span class="muted">No hay equipos registrados para este formato.</span>'}</div><span class="falta">Seleccione la ubicación</span></div>` : ''}`;
  const $ = (s) => body.querySelector(s);
  $('#gF').onchange = (e) => { r.fechaOp = e.target.value; cambio(); };
  if ($('#gT')) $('#gT').querySelectorAll('button').forEach(b => b.onclick = () => { r.turno = b.dataset.v; $('#gT').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); cambio(); });
  if ($('#gH')) { $('#gH').onchange = (e) => { r.hora = e.target.value; cambio(); }; $('#gHn').onclick = () => { r.hora = horaHM(new Date()); $('#gH').value = r.hora; cambio(); }; }
  if ($('#gU')) $('#gU').querySelectorAll('button').forEach(b => b.onclick = () => {
    r.ubicacion = b.dataset.v; armarTablas(F.def, r);
    $('#gU').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); cambio();
  });
}

// ---------------- campos ----------------
function pasoCampos(box, s) {
  const v = F.reg.v;
  box.innerHTML = s.campos.map(c => campoHtml(c, v)).join('');
  s.campos.forEach(c => enlazarCampo(box, c, s));
}

function campoHtml(c, v) {
  const req = c.requerido ? ' <sup>*</sup>' : '';
  const x = v[c.id];
  const ay = c.ayuda ? `<div class="ay">${esc(c.ayuda)}</div>` : '';
  const falta = `<span class="falta">${c.tipo === 'foto' ? 'Tome la foto' : 'Dato obligatorio'}</span>`;
  const lab = `<label for="c_${c.id}">${esc(c.etiqueta)}${req}</label>`;
  const lb = `<div class="lb">${esc(c.etiqueta)}${req}</div>`;
  let h = '';
  switch (c.tipo) {
    case 'texto': h = lab + `<input class="field" id="c_${c.id}" value="${esc(x || '')}" autocomplete="off">`; break;
    case 'textoLargo': h = lab + `<textarea class="field" id="c_${c.id}" rows="4" style="height:auto;padding:12px 16px;line-height:1.5">${esc(x || '')}</textarea>`; break;
    case 'numero': {
      const al = fueraDeRango(c, x);
      h = lab + `<div class="num ${al ? 'al' : ''}"><input id="c_${c.id}" inputmode="decimal" autocomplete="off" value="${esc(x ?? '')}" placeholder="—">${c.unidad ? `<span class="u">${esc(c.unidad)}</span>` : ''}</div>
        <div class="rg"><span>${rangoTxt(c) ? 'Rango ' + esc(rangoTxt(c)) : ''}</span><span class="alx">${IC.alert} Fuera de rango</span></div>`;
      break;
    }
    case 'seleccion':
      h = lb + (c.opciones.length > 8
        ? `<select class="field" id="c_${c.id}"><option value="">Seleccione</option>${c.opciones.map(o => `<option ${o === x ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`
        : `<div class="chs" data-ch="${c.id}">${c.opciones.map(o => `<button type="button" data-v="${esc(o)}" class="${o === x ? 'on' : ''}">${esc(o)}</button>`).join('')}</div>`);
      break;
    case 'siNo': h = lb + `<div class="chs" data-ch="${c.id}">${['Sí', 'No'].map(o => `<button type="button" data-v="${o}" class="${o === x ? 'on' : ''}" style="min-width:90px">${o}</button>`).join('')}</div>${c.genera ? `<div class="ay">Si marca Sí, queda pendiente el ${esc(c.genera)} para este equipo.</div>` : ''}`; break;
    case 'conforme': h = lb + `<div class="chs" data-ch="${c.id}">${[['Conforme', ''], ['No conforme', 'nc'], ['N.A.', 'na']].map(([o, k]) => `<button type="button" data-v="${o}" class="${o === x ? 'on ' + k : k}">${o}</button>`).join('')}</div>`; break;
    case 'fecha': h = lab + `<input class="field" type="date" id="c_${c.id}" value="${esc(x || '')}">`; break;
    case 'hora': h = lab + `<div style="display:flex;gap:8px"><input class="field" type="time" id="c_${c.id}" value="${esc(x || '')}"><button type="button" class="btn" data-ahora="${c.id}" style="height:48px">Ahora</button></div>`; break;
    case 'fechaHora': h = lab + `<div style="display:flex;gap:8px"><input class="field" type="datetime-local" id="c_${c.id}" value="${esc(x || '')}"><button type="button" class="btn" data-ahora="${c.id}" style="height:48px">Ahora</button></div>`; break;
    case 'duracion': { const m = minutosEntre(v[c.desde], v[c.hasta]); h = lb + `<div class="dur ${m != null && m < 0 ? 'neg' : ''}" id="c_${c.id}">${m == null ? '<span style="color:var(--tx-3);font-family:var(--f-body);font-size:14px">Se calcula al completar las horas</span>' : esc(duracionTxt(m))}</div>`; break; }
    case 'equipo': h = lb + `<button type="button" class="eqsel" id="c_${c.id}">${x && x.codigo ? `<b>${esc(x.codigo)}</b><span>${esc(x.descripcion || '')}</span>` : `<span class="ph">Seleccionar equipo</span>`}${IC.search}</button>`; break;
    case 'referencia': h = lab + `<input class="field mono" id="c_${c.id}" value="${esc(x || '')}" placeholder="R-001-2026-00001" autocomplete="off">`; break;
    case 'foto': h = lb + `<div class="foto">${x ? `<img src="${typeof x === 'string' ? x : ''}" alt="" id="fi_${c.id}">` : `<span class="vacia">${IC.cam}</span>`}
        <label class="btn" style="cursor:pointer">${IC.cam}${x ? 'Cambiar foto' : 'Tomar foto'}<input type="file" accept="image/*" capture="environment" data-foto="${c.id}" hidden></label>
        ${x ? `<button type="button" class="btn" data-qfoto="${c.id}">${IC.del}Quitar</button>` : ''}</div>`; break;
    default: h = lab + `<input class="field" id="c_${c.id}" value="${esc(x || '')}">`;
  }
  return `<div class="lf-f" data-ref="${c.id}" id="w_${c.id}">${h}${ay}${falta}</div>`;
}

function enlazarCampo(box, c, s) {
  const v = F.reg.v;
  const el = box.querySelector(`#c_${c.id}`);
  const set = (val) => { if (val === '' || val == null) delete v[c.id]; else v[c.id] = val; refrescarDuraciones(box, s); cambio(); };
  if (['texto', 'textoLargo', 'referencia'].includes(c.tipo)) el.oninput = () => set(el.value);
  if (c.tipo === 'numero') el.oninput = () => {
    const val = el.value.replace(/[^\d.,-]/g, ''); if (val !== el.value) el.value = val;
    set(val);
    el.parentElement.classList.toggle('al', fueraDeRango(c, val));
  };
  if (['fecha', 'hora', 'fechaHora'].includes(c.tipo)) {
    el.onchange = () => set(el.value);
    const ah = box.querySelector(`[data-ahora="${c.id}"]`);
    if (ah) ah.onclick = () => { const d = new Date(); el.value = c.tipo === 'hora' ? horaHM(d) : fechaHoraLocal(d); set(el.value); };
  }
  if (c.tipo === 'seleccion' && el && el.tagName === 'SELECT') el.onchange = () => set(el.value);
  const ch = box.querySelector(`[data-ch="${c.id}"]`);
  if (ch) ch.querySelectorAll('button').forEach(b => b.onclick = () => {
    const ya = v[c.id] === b.dataset.v;
    set(ya ? '' : b.dataset.v);
    ch.querySelectorAll('button').forEach(x => { x.classList.toggle('on', !ya && x === b); });
  });
  if (c.tipo === 'equipo') el.onclick = () => elegirEquipo(c, (e) => {
    v[c.id] = e ? { id: e.id, codigo: e.codigo, descripcion: e.descripcion } : undefined;
    if (!e) delete v[c.id];
    el.innerHTML = e ? `<b>${esc(e.codigo)}</b><span>${esc(e.descripcion || '')}</span>${IC.search}` : `<span class="ph">Seleccionar equipo</span>${IC.search}`;
    cambio();
  });
  if (c.tipo === 'foto') {
    const inp = box.querySelector(`[data-foto="${c.id}"]`);
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      try {
        v[c.id] = await reducirFoto(f);
        F.fotosCambiadas = [...new Set([...(F.fotosCambiadas || []), c.id])];
        guardarBorrador(true); actualizarProgreso();
        const w = box.querySelector(`#w_${c.id}`); w.outerHTML = campoHtml(c, v); enlazarCampo(box, c, s);
      } catch { toast('No se pudo leer la foto.', 'err'); }
    };
    const q = box.querySelector(`[data-qfoto="${c.id}"]`);
    if (q) q.onclick = () => { delete v[c.id]; F.fotosCambiadas = (F.fotosCambiadas || []).filter(x => x !== c.id); cambio(); const w = box.querySelector(`#w_${c.id}`); w.outerHTML = campoHtml(c, v); enlazarCampo(box, c, s); };
    // foto ya enviada (registro observado): se muestra desde el sistema
    if (v[c.id] === true) D.leerFotos(F.reg.id).then(fs => { const im = box.querySelector(`#fi_${c.id}`); if (im && fs[c.id]) im.src = fs[c.id]; }).catch(() => {});
  }
}

function refrescarDuraciones(box, s) {
  s.campos.filter(c => c.tipo === 'duracion').forEach(c => {
    const el = box.querySelector(`#c_${c.id}`); if (!el) return;
    const m = minutosEntre(F.reg.v[c.desde], F.reg.v[c.hasta]);
    el.className = 'dur' + (m != null && m < 0 ? ' neg' : '');
    el.innerHTML = m == null ? '<span style="color:var(--tx-3);font-family:var(--f-body);font-size:14px">Se calcula al completar las horas</span>' : esc(duracionTxt(m));
  });
}

function elegirEquipo(c, alElegir) {
  const base = filtrarEquiposPor(A.equipos, { sistema: c.filtro?.sistema ?? '', tipo: c.filtro?.tipo || '', ubicacion: '' });
  const m = modal({
    titulo: 'Seleccionar equipo', ancho: 560,
    cuerpo: `<input class="field" id="eqQ" type="search" placeholder="Buscar código o descripción" style="font-size:16px" autocomplete="off">
      <div id="eqL" style="margin-top:12px;max-height:56vh;overflow:auto"></div>`,
    pie: `<button type="button" class="btn" id="eqX" style="margin-right:auto">Quitar selección</button><button type="button" class="btn" data-x>Cerrar</button>`
  });
  const pintar = () => {
    const q = norm(m.$('#eqQ').value);
    const l = base.filter(e => !q || norm(`${e.codigo} ${e.descripcion} ${e.ubicacion}`).includes(q)).slice(0, 80);
    m.$('#eqL').innerHTML = l.map(e => `<button type="button" class="ll-card" data-e="${e.id}" style="margin-bottom:8px;animation:none"><span class="tx"><span class="cd">${esc(e.codigo)}</span><b>${esc(e.descripcion)}</b><small>${esc([sisNom(e.sistema), e.ubicacion].filter(Boolean).join(' · '))}${e.estado === 'fuera' ? ' · Fuera de servicio' : ''}</small></span></button>`).join('')
      || `<div class="muted" style="padding:12px 4px">${base.length ? 'Ningún equipo coincide.' : 'No hay equipos registrados en la base para este campo.'}</div>`;
    m.$('#eqL').querySelectorAll('[data-e]').forEach(b => b.onclick = () => { alElegir(base.find(e => e.id === b.dataset.e)); m.cerrar(); });
  };
  m.$('#eqQ').oninput = pintar;
  m.$('#eqX').onclick = () => { alElegir(null); m.cerrar(); };
  pintar();
  setTimeout(() => m.$('#eqQ').focus(), 60);
}

// ---------------- tabla por equipo ----------------
function estadoCol(s, col) {
  const t = F.reg.v[s.id];
  const e = estadoColumna(F.reg, s, col);
  if (e !== 'operando') return 'no';
  let fal = false, al = false;
  s.filas.forEach(fl => {
    const x = t.c?.[fl.id]?.[col.id];
    if (x == null || x === '') { if (fl.requerido !== false) fal = true; }
    else if (fl.tipo === 'numero' && fueraDeRango(fl, x)) al = true;
  });
  return al ? 'al' : fal ? 'fal' : 'ok';
}

function pasoTabla(box, s) {
  const t = F.reg.v[s.id] || (F.reg.v[s.id] = { cols: columnasTabla(s, A.equipos, F.reg.ubicacion), est: {}, c: {} });
  const cols = t.cols;
  if (!cols.length) {
    box.innerHTML = `<div class="res fa" data-ref="${s.id}">${pideUbicacion(F.def) && !F.reg.ubicacion ? 'Seleccione primero la ubicación en Datos generales.' : 'No hay equipos de la base que correspondan a esta tabla. Revise la base de equipos o la configuración del formato.'}</div>`;
    return;
  }
  let i = Math.min(F.col[s.id] || 0, cols.length - 1);
  const pintar = () => {
    const col = cols[i];
    const e = estadoColumna(F.reg, s, col);
    box.innerHTML = `
      <div class="tcols" role="tablist">${cols.map((c, j) => `<button type="button" role="tab" data-col="${j}" class="${j === i ? 'on' : ''}" aria-selected="${j === i}"><b><i class="dot ${estadoCol(s, c)}"></i>${esc(etiquetaCol(c))}</b><small>${esc(estadoColumna(F.reg, s, c) === 'operando' ? (estadoCol(s, c) === 'ok' ? 'Completo' : estadoCol(s, c) === 'al' ? 'Con alerta' : 'Pendiente') : ESTADOS_COLUMNA.find(x => x.id === estadoColumna(F.reg, s, c)).label)}</small></button>`).join('')}</div>
      <div class="tpanel">
        <div class="eqn">${esc(col.codigo || col.descripcion)}${col.codigo ? `<small>${esc(col.descripcion)}</small>` : ''}</div>
        ${s.estadoEquipo ? `<div class="lf-f"><div class="lb">Estado del equipo</div><div class="chs" id="tEst">${ESTADOS_COLUMNA.map(x => `<button type="button" data-v="${x.id}" class="${x.id === e ? 'on' : ''}${x.id !== 'operando' && x.id === e ? ' na' : ''}">${x.label}</button>`).join('')}</div></div>` : ''}
        ${e === 'operando' ? s.filas.map(fl => {
          const x = t.c?.[fl.id]?.[col.id];
          const ref = `${s.id}:${col.id}:${fl.id}`;
          if (fl.tipo === 'seleccion') return `<div class="lf-f" data-ref="${ref}"><div class="lb">${esc(fl.etiqueta)}${fl.requerido !== false ? ' <sup>*</sup>' : ''}</div><div class="chs" data-tf="${fl.id}">${fl.opciones.map(o => `<button type="button" data-v="${esc(o)}" class="${o === x ? 'on' : ''}">${esc(o)}</button>`).join('')}</div><span class="falta">Dato obligatorio</span></div>`;
          if (fl.tipo === 'texto') return `<div class="lf-f" data-ref="${ref}"><label for="tf_${fl.id}">${esc(fl.etiqueta)}${fl.requerido !== false ? ' <sup>*</sup>' : ''}</label><input class="field" id="tf_${fl.id}" data-tf="${fl.id}" value="${esc(x || '')}"><span class="falta">Dato obligatorio</span></div>`;
          return `<div class="lf-f" data-ref="${ref}"><label for="tf_${fl.id}">${esc(fl.etiqueta)}${fl.requerido !== false ? ' <sup>*</sup>' : ''}</label>
            <div class="num ${fueraDeRango(fl, x) ? 'al' : ''}"><input id="tf_${fl.id}" data-tf="${fl.id}" inputmode="decimal" autocomplete="off" value="${esc(x ?? '')}" placeholder="—">${fl.unidad ? `<span class="u">${esc(fl.unidad)}</span>` : ''}</div>
            <div class="rg"><span>${rangoTxt(fl) ? 'Rango ' + esc(rangoTxt(fl)) : ''}</span><span class="alx">${IC.alert} Fuera de rango</span></div><span class="falta">Dato obligatorio</span></div>`;
        }).join('') : `<div class="muted" style="font-size:14px;padding:4px 0 8px">Sin lecturas: el equipo no está operando.</div>`}
        <div class="tnav">
          <button type="button" class="btn" id="tAnt" ${i === 0 ? 'disabled' : ''}>${IC.back}</button>
          ${i < cols.length - 1 ? `<button type="button" class="btn btn-primary" id="tSig" style="flex:1">Siguiente: ${esc(etiquetaCol(cols[i + 1]))}</button>` : ''}
        </div>
      </div>`;
    const setC = (fid, val) => {
      t.c = t.c || {}; t.c[fid] = t.c[fid] || {};
      if (val === '' || val == null) delete t.c[fid][col.id]; else t.c[fid][col.id] = val;
      cambio();
      const d = box.querySelector(`[data-col="${i}"] .dot`); if (d) d.className = 'dot ' + estadoCol(s, col);
    };
    box.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { i = Number(b.dataset.col); F.col[s.id] = i; pintar(); });
    const est = box.querySelector('#tEst');
    if (est) est.querySelectorAll('button').forEach(b => b.onclick = () => { t.est = t.est || {}; t.est[col.id] = b.dataset.v; cambio(); pintar(); });
    s.filas.forEach(fl => {
      const inp = box.querySelector(`input[data-tf="${fl.id}"]`);
      if (inp && fl.tipo === 'numero') inp.oninput = () => { const val = inp.value.replace(/[^\d.,-]/g, ''); if (val !== inp.value) inp.value = val; setC(fl.id, val); inp.parentElement.classList.toggle('al', fueraDeRango(fl, val)); };
      else if (inp) inp.oninput = () => setC(fl.id, inp.value);
      const chs = box.querySelector(`.chs[data-tf="${fl.id}"]`);
      if (chs) chs.querySelectorAll('button').forEach(b => b.onclick = () => { const ya = t.c?.[fl.id]?.[col.id] === b.dataset.v; setC(fl.id, ya ? '' : b.dataset.v); chs.querySelectorAll('button').forEach(x => x.classList.toggle('on', !ya && x === b)); });
    });
    box.querySelector('#tAnt').onclick = () => { i--; F.col[s.id] = i; pintar(); };
    const sg = box.querySelector('#tSig'); if (sg) sg.onclick = () => { i++; F.col[s.id] = i; pintar(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    if (F.intento) marcarFaltantes(evaluar(F.def, F.reg, A.cfg));
  };
  pintar();
}

// ---------------- checklist ----------------
function pasoChecklist(box, s) {
  const t = F.reg.v[s.id] || (F.reg.v[s.id] = {});
  const pintar = () => {
    box.innerHTML = `${s.items.some(it => !t[it.id]?.r) ? `<button type="button" class="btn sm" id="ckTodo" style="margin-bottom:12px">${IC.check}Marcar los pendientes como Conforme</button>` : ''}
      ${s.items.map((it, j) => { const r = t[it.id] || {}; return `<div class="ck" data-ref="${s.id}:${it.id}">
        <p><i>${j + 1}</i>${esc(it.texto)}</p>
        <div class="chs" data-ck="${it.id}">${[['C', 'Conforme', ''], ['NC', 'No conforme', 'nc'], ['NA', 'N.A.', 'na']].map(([k, l, cl]) => `<button type="button" data-v="${k}" class="${r.r === k ? 'on ' + cl : cl}">${l}</button>`).join('')}</div>
        ${r.r === 'NC' || r.obs ? `<textarea class="field" data-obs="${it.id}" rows="2" placeholder="Describa la no conformidad" style="height:auto;padding:10px 14px;margin-top:10px;line-height:1.45">${esc(r.obs || '')}</textarea>` : ''}
      </div>`; }).join('')}`;
    box.querySelectorAll('[data-ck]').forEach(ch => ch.querySelectorAll('button').forEach(b => b.onclick = () => {
      const id = ch.dataset.ck; const r = t[id] || (t[id] = {});
      r.r = r.r === b.dataset.v ? '' : b.dataset.v;
      if (!r.r) delete r.r;
      cambio(); pintar();
      if (r.r === 'NC') box.querySelector(`[data-obs="${id}"]`)?.focus();
    }));
    box.querySelectorAll('[data-obs]').forEach(ta => ta.oninput = () => { (t[ta.dataset.obs] || (t[ta.dataset.obs] = {})).obs = ta.value; cambio(); });
    const todo = box.querySelector('#ckTodo');
    if (todo) todo.onclick = () => { s.items.forEach(it => { if (!t[it.id]?.r) t[it.id] = { ...(t[it.id] || {}), r: 'C' }; }); cambio(); pintar(); };
    if (F.intento) marcarFaltantes(evaluar(F.def, F.reg, A.cfg));
  };
  pintar();
}

// ---------------- lista ----------------
function pasoLista(box, s) {
  const filas = F.reg.v[s.id] || (F.reg.v[s.id] = []);
  const pintar = () => {
    box.innerHTML = `${filas.map((f, j) => `<div class="lrow"><div class="hd"><span>Fila ${j + 1}</span><button type="button" class="btn sm" data-del="${j}" aria-label="Quitar fila">${IC.del}</button></div>
      <div class="g">${s.columnas.map(c => `<div><label class="label" for="l_${j}_${c.id}">${esc(c.nombre)}</label><input class="field" id="l_${j}_${c.id}" data-l="${j}:${c.id}" ${c.tipo === 'numero' ? 'inputmode="decimal"' : ''} value="${esc(f[c.id] ?? '')}" autocomplete="off"></div>`).join('')}</div></div>`).join('')
      || '<div class="muted" style="font-size:14px;margin-bottom:12px">Sin filas. Agregue una si corresponde.</div>'}
      <button type="button" class="btn" id="lAdd">${IC.mas}Agregar fila</button>`;
    box.querySelectorAll('[data-l]').forEach(inp => inp.oninput = () => { const [j, cid] = inp.dataset.l.split(':'); filas[Number(j)][cid] = inp.value; cambio(); });
    box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { filas.splice(Number(b.dataset.del), 1); cambio(); pintar(); });
    box.querySelector('#lAdd').onclick = () => { filas.push({}); cambio(); pintar(); box.querySelector(`[data-l^="${filas.length - 1}:"]`)?.focus(); };
  };
  pintar();
}

// ---------------- cierre ----------------
function pasoCierre(body, ev) {
  const fir = firmasDe(F.def);
  body.innerHTML = `<h2>Cierre y firmas</h2>
    ${ev.alertas.length ? `<div class="res al"><h3>${IC.alert}${ev.alertas.length} alerta${ev.alertas.length > 1 ? 's' : ''}</h3><ul>${ev.alertas.map(a => `<li><button type="button" class="lk" data-ir="${a.paso}">${esc(a.texto)}</button></li>`).join('')}</ul></div>` : '<div class="res ok">Sin valores fuera de rango ni no conformidades.</div>'}
    ${F.def.observaciones ? `<div class="lf-f" data-ref="obs"><label for="cObs">Observaciones / acción correctiva${ev.alertas.length ? ' <sup>*</sup>' : ''}</label>
      <textarea class="field" id="cObs" rows="4" style="height:auto;padding:12px 16px;line-height:1.5" placeholder="${ev.alertas.length ? 'Describa la acción tomada frente a las alertas' : 'Opcional'}">${esc(F.reg.observaciones || '')}</textarea><span class="falta">Obligatoria cuando hay alertas</span></div>` : ''}
    ${fir.map((f, i) => {
      const x = F.reg.firmas[i] || (F.reg.firmas[i] = {});
      if (f.modo === 'usuario') return `<div class="fir"><h4>${esc(f.nombre)}</h4><p>Se firma electrónicamente como <b>${esc(nombreU())}</b> al enviar.</p></div>`;
      if (f.modo === 'aprobador') return `<div class="fir"><h4>${esc(f.nombre)}</h4><p>La registra el supervisor al aprobar el registro.</p></div>`;
      return `<div class="fir lf-f" data-ref="firma${i}" style="margin-bottom:12px"><h4>${esc(f.nombre)}</h4>
        <input class="field" data-fn="${i}" value="${esc(x.nombre || '')}" placeholder="Nombre y apellido" style="margin-top:8px" autocomplete="off" aria-label="Nombre de quien firma">
        <div class="pad" data-pad="${i}"><canvas></canvas><span class="lin"></span><span class="ph">Firme aquí con el dedo</span><button type="button" class="lim" data-lim="${i}">Limpiar</button></div>
        <span class="falta">Nombre y firma obligatorios</span></div>`;
    }).join('')}
    <div id="cFal"></div>`;
  const pintarFal = () => {
    const e2 = evaluar(F.def, F.reg, A.cfg);
    const box = body.querySelector('#cFal');
    box.innerHTML = e2.faltantes.length && F.intento ? `<div class="res fa"><h3>${IC.alert}Falta completar</h3><ul>${e2.faltantes.slice(0, 30).map(a => `<li><button type="button" class="lk" data-ir="${a.paso}">${esc(tituloPaso(a.paso))}: ${esc(a.texto)}</button></li>`).join('')}</ul></div>` : '';
    body.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irPaso(Number(b.dataset.ir)));
  };
  body.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => irPaso(Number(b.dataset.ir)));
  const obs = body.querySelector('#cObs');
  if (obs) obs.oninput = () => { F.reg.observaciones = obs.value; cambio(); pintarFal(); };
  body.querySelectorAll('[data-fn]').forEach(inp => inp.oninput = () => { F.reg.firmas[Number(inp.dataset.fn)].nombre = inp.value; cambio(); pintarFal(); });
  body.querySelectorAll('[data-pad]').forEach(p => padFirma(p, Number(p.dataset.pad), pintarFal));
  pintarFal();
}

function padFirma(cont, i, alCambiar) {
  const cv = cont.querySelector('canvas');
  const x = F.reg.firmas[i];
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const ajustar = () => {
    const r = cont.getBoundingClientRect();
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const cx = cv.getContext('2d');
    cx.scale(dpr, dpr); cx.lineWidth = 2.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#14202B';
    if (x.imagen) { const im = new Image(); im.onload = () => cx.drawImage(im, 0, 0, r.width, r.height); im.src = x.imagen; cont.querySelector('.ph').style.display = 'none'; }
  };
  ajustar();
  const cx = cv.getContext('2d');
  let dib = false, ult = null, trazo = false;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); dib = true; ult = pos(e); cx.beginPath(); cx.arc(ult.x, ult.y, 1, 0, Math.PI * 2); cx.fillStyle = '#14202B'; cx.fill(); trazo = true; cont.querySelector('.ph').style.display = 'none'; });
  cv.addEventListener('pointermove', (e) => { if (!dib) return; e.preventDefault(); const p = pos(e); cx.beginPath(); cx.moveTo(ult.x, ult.y); cx.lineTo(p.x, p.y); cx.stroke(); ult = p; });
  const fin = () => {
    if (!dib) return; dib = false;
    if (trazo) { x.imagen = cv.toDataURL('image/png'); x.fechaHora = new Date().toISOString(); cambio(); alCambiar && alCambiar(); }
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin); cv.addEventListener('pointerleave', fin);
  cont.querySelector('[data-lim]').onclick = () => { cx.clearRect(0, 0, cv.width, cv.height); delete x.imagen; delete x.fechaHora; cont.querySelector('.ph').style.display = ''; cambio(); alCambiar && alCambiar(); };
}

// =====================================================================
// ENVÍO
// =====================================================================
async function enviar() {
  F.intento = true;
  const ev = evaluar(F.def, F.reg, A.cfg);
  if (ev.faltantes.length) { pintarFormulario(); toast(ev.faltantes.length > 1 ? `Faltan ${ev.faltantes.length} datos por completar.` : 'Falta 1 dato por completar.', 'err'); return; }
  const ahora = new Date().toISOString();
  const reg = clonar(F.reg);
  const fotos = {};
  F.def.secciones.forEach(s => (s.campos || []).forEach(c => {
    if (c.tipo !== 'foto') return;
    const x = reg.v[c.id];
    if (typeof x === 'string' && x.startsWith('data:')) { fotos[c.id] = x; reg.v[c.id] = true; }
  }));
  const fir = firmasDe(F.def);
  reg.firmas = fir.map((f, i) => {
    const x = reg.firmas[i] || {};
    if (f.modo === 'usuario') return { nombre: nombreU(), usuario: A.ctx.user.email, uid: uidU(), fechaHora: ahora };
    if (f.modo === 'manuscrita') return { nombre: x.nombre.trim(), imagen: x.imagen, fechaHora: x.fechaHora || ahora };
    return {};
  });
  Object.assign(reg, {
    estado: 'enviado', dur: calcularDuraciones(F.def, reg.v), equipos: equiposDelRegistro(F.def, reg),
    nAlertas: ev.alertas.length, alertas: ev.alertas.slice(0, 20).map(a => a.texto), actualizado: ahora
  });
  delete reg.observacion;
  let paquete;
  if (F.modo === 'corregir') {
    paquete = { tipo: 'reenvio', paquete: { reg, fotos } };
  } else {
    Object.assign(reg, { creadoPor: uidU(), creadoPorNombre: nombreU(), enviado: ahora, historial: [{ estado: 'enviado', usuario: nombreU(), fechaHora: ahora }] });
    if (F.pendienteId) reg.pendienteId = F.pendienteId;
    const genera = [];
    F.def.secciones.forEach(s => (s.campos || []).forEach(c => {
      if (c.tipo === 'siNo' && c.genera && reg.v[c.id] === 'Sí') {
        const destino = vigentes().find(p => p.codigo === c.genera);
        const eqCampo = F.def.secciones.flatMap(x => x.campos || []).find(x => x.tipo === 'equipo' && reg.v[x.id]?.codigo);
        genera.push({ codigo: c.genera, plantillaId: destino?.id || null, campoId: c.id, equipo: eqCampo ? reg.v[eqCampo.id] : null });
      }
    }));
    paquete = { tipo: 'nuevo', paquete: { reg, fotos, pendienteId: F.pendienteId, genera } };
  }
  const c = cola();
  c.push({ ...paquete, creado: ahora, intentos: 0 });
  if (!escribirLS(keyC(), c)) return;
  const bs = borradores(); delete bs[F.key]; escribirLS(keyB(), bs);
  const nombre = F.def.nombre, generados = paquete.paquete.genera || [];
  F = null;
  MAIN.innerHTML = `<div class="ll"><div class="okfin"><div class="ic">${IC.check}</div><h2>${paquete.tipo === 'reenvio' ? 'Registro reenviado' : 'Registro enviado'}</h2>
    <div class="muted">${esc(nombre)}</div><div class="nro" id="okNro"><span class="spinner" style="display:inline-block;width:16px;height:16px;border-width:2px;vertical-align:-2px"></span> Enviando…</div>
    ${generados.length ? `<div class="res ok" style="text-align:left;max-width:440px;margin:0 auto 20px">Queda pendiente el ${generados.map(g => esc(g.codigo)).join(', ')} para ${esc(generados[0].equipo?.codigo || 'el equipo')}.</div>` : ''}
    <button class="btn btn-primary" id="okVolver">Volver a Llenar formatos</button></div></div>`;
  MAIN.querySelector('#okVolver').onclick = () => vistaLlenar(MAIN, A);
  const res = await procesarCola();
  const n = MAIN.querySelector('#okNro');
  if (!n) return;
  const hecho = res.find(r => r.id === reg.id);
  if (hecho && hecho.numero) n.textContent = `N° ${hecho.numero}`;
  else n.innerHTML = `<span style="color:var(--amber-2);font-family:var(--f-body);font-size:15px">${navigator.onLine ? 'Quedó en cola: se reintentará el envío.' : 'Sin señal: quedó en la cola del celular y se enviará al recuperar la conexión.'}</span>`;
}

// Envía la cola en orden. Devuelve [{ id, numero }] de lo enviado.
export async function procesarCola(avisar = false) {
  if (procesando || !A) return [];
  procesando = true;
  const hechos = [];
  try {
    let c = cola();
    for (const item of [...c]) {
      try {
        if (item.tipo === 'reenvio') { await D.reenviarRegistro(item.paquete); hechos.push({ id: item.paquete.reg.id, numero: item.paquete.reg.numero }); }
        else { const numero = await D.enviarRegistro(item.paquete); hechos.push({ id: item.paquete.reg.id, numero }); }
        c = cola().filter(x => x.paquete.reg.id !== item.paquete.reg.id);
        escribirLS(keyC(), c);
      } catch (e) {
        const red = !navigator.onLine || ['unavailable', 'deadline-exceeded', 'failed-precondition'].includes(e.code) || /network|offline|fetch/i.test(e.message || '');
        c = cola().map(x => x.paquete.reg.id === item.paquete.reg.id ? { ...x, intentos: (x.intentos || 0) + 1, error: red ? '' : (e.code === 'permission-denied' ? 'Sin permiso para enviar. Consulte al administrador.' : (e.code || e.message)) } : x);
        escribirLS(keyC(), c);
        if (red) break;
      }
    }
    if (avisar) toast(hechos.length ? `${hechos.length} registro${hechos.length > 1 ? 's' : ''} enviado${hechos.length > 1 ? 's' : ''}.` : cola().length ? 'No se pudo enviar todavía.' : 'No hay registros en cola.', hechos.length || !cola().length ? 'ok' : 'err');
  } finally { procesando = false; }
  if (hechos.length && !F && MAIN && MAIN.querySelector('.ll-h')) { await cargarDatos(); if (!F && MAIN.querySelector('.ll-h')) pintarInicio(); }
  return hechos;
}

window.addEventListener('online', () => procesarCola());
setInterval(() => { if (A && navigator.onLine && cola().length) procesarCola(); }, 45000);
