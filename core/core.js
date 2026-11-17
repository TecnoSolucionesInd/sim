// core.js — punto de entrada común para todos los aplicativos del SIM.
//
// Uso en un aplicativo (apps/<id>/index.html):
//   <link rel="stylesheet" href="../../core/sim.css">
//   <script type="module">
//     import { iniciarApp } from '../../core/core.js';
//     const ctx = await iniciarApp({ appId: 'eq', alCambiarModulo: (mod, ctx) => { ... } });
//   </script>
//
// layout: 'completo' → cabecera + menú lateral de módulos + contenedor ctx.main
//         'minimo'   → solo verifica sesión/permisos y agrega botón flotante "Portal"
//                      (para aplicativos heredados que conservan su propio diseño)

import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth, db } from './firebase.js';
import { appPorId } from './catalogo.js';
import { cargarPerfil, accesoApp, puedeEscribir, iniciales, esAdmin } from './sesion.js';

export const RAIZ = new URL('../', import.meta.url).href;
export { auth, db };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function esperarUsuario() {
  return new Promise((res) => { const u = onAuthStateChanged(auth, (user) => { u(); res(user); }); });
}

export function toast(msg, tipo = 'ok') {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + tipo; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3800);
}

const ICO_BACK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>';
const ICO_OUT = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/></svg>';
const ICO_MENU = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';

const CSS = `
.sim-shell{position:relative;z-index:1;display:grid;grid-template-columns:272px minmax(0,1fr);min-height:100vh;transition:grid-template-columns .35s var(--ease)}
.sim-shell.side-off{grid-template-columns:0 minmax(0,1fr)}
.sim-shell.side-off .sim-side{opacity:0;transform:translateX(-30px);pointer-events:none;overflow:hidden;padding-left:0;padding-right:0}
/* menú lateral: oscuro, como la portada (colores fijos: no depende del tema del aplicativo) */
.sim-side{position:sticky;top:0;height:100vh;overflow-y:auto;padding:18px 14px 14px;color:#EEF3F6;display:flex;flex-direction:column;gap:20px;animation:slidein .5s var(--ease) both;
  background:radial-gradient(120% 50% at 0% 0%,rgba(111,227,207,.13),transparent 60%),radial-gradient(90% 40% at 100% 100%,rgba(79,168,224,.10),transparent 65%),#060B0E;border-right:1px solid rgba(255,255,255,.07);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.18) transparent}
.sim-brand{display:flex;align-items:center;gap:11px;padding:4px 8px 0;text-decoration:none;color:#EEF3F6}
.sim-brand img{height:27px;width:auto;display:block}
.sim-brand span{width:1px;height:20px;background:rgba(255,255,255,.2)}
.sim-brand b{font:650 13.5px/1 var(--f-display);letter-spacing:.1em;color:#A5F5E7}
.sim-back{height:40px;padding:0 12px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#C9D4DC;display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:500;text-decoration:none;transition:background .25s,border-color .25s,color .25s}
.sim-back:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.22);color:#fff}
.sim-back svg{transition:transform .3s var(--ease)}
.sim-back:hover svg{transform:translateX(-3px)}
.sim-apphead{display:flex;align-items:center;gap:13px;padding:14px 12px;border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.08)}
.sim-appico{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sim-appname{font-family:var(--f-display);font-weight:600;font-size:15px;line-height:1.25;letter-spacing:-.01em}
.sim-rol{font-size:11.5px;color:#8FA0AC;margin-top:3px;text-transform:capitalize}
.sim-navt{font-family:var(--f-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:#6C7A86;padding:0 12px 9px}
.sim-mod{position:relative;width:100%;min-height:42px;padding:9px 12px 9px 14px;border:0;border-radius:11px;text-align:left;font-size:14px;font-weight:500;line-height:1.3;display:flex;align-items:center;gap:12px;background:transparent;color:#A7B4BF;transition:background .25s,color .25s}
.sim-mod:hover{background:rgba(255,255,255,.06);color:#EEF3F6}
.sim-mod i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.22);display:block;flex-shrink:0;transition:transform .3s var(--ease),background .25s}
.sim-mod.on{color:#fff;background:color-mix(in srgb,var(--ac) 16%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ac) 30%,transparent)}
.sim-mod.on i{background:var(--ac);transform:scale(1.35);box-shadow:0 0 10px var(--ac)}
.sim-user{margin-top:auto;display:flex;align-items:center;gap:11px;padding:10px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}
.sim-user .avatar{width:36px;height:36px;font-size:12.5px;background:linear-gradient(145deg,#C4FBF0,#6FE3CF);color:#062A25}
.sim-user .n{font-size:13px;font-weight:500;color:#EEF3F6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sim-user .e{font-size:11.5px;color:#7F8E9A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sim-out{width:36px;height:36px;flex-shrink:0;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#C9D4DC;display:grid;place-items:center;transition:background .2s,border-color .2s,color .2s}
.sim-out:hover{background:rgba(255,143,143,.12);border-color:rgba(255,143,143,.45);color:#FFC2C2}
.sim-body{min-width:0;display:flex;flex-direction:column}
.sim-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 36px;flex-wrap:wrap}
.sim-crumb{font-family:var(--f-mono);font-size:12.5px;color:var(--tx-3)}
.sim-crumb b{color:var(--tx);font-weight:500}
.sim-sync{display:flex;align-items:center;gap:9px;font-size:12.5px;color:var(--tx-2)}
.sim-main{padding:6px 36px 60px;min-width:0}
.sim-menu{display:inline-flex}
.sim-float{position:fixed;left:16px;bottom:16px;z-index:9999;height:42px;padding:0 16px 0 13px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(6,11,14,.9);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#EEF3F6;display:flex;align-items:center;gap:8px;font:500 13.5px 'Geist','Segoe UI',system-ui,sans-serif;text-decoration:none;box-shadow:0 14px 30px -14px rgba(0,0,0,.6);transition:background .2s,border-color .2s,transform .25s}
.sim-float:hover{background:#0D181D;border-color:rgba(111,227,207,.6);color:#fff;transform:translateY(-2px)}
.sim-velo{display:none}
@media (max-width:900px){
  .sim-shell{grid-template-columns:minmax(0,1fr)}
  .sim-side{position:fixed;inset:0 auto 0 0;width:284px;z-index:30;transform:translateX(-100%);transition:transform .35s var(--ease);animation:none}
  .sim-shell.menu-open .sim-side{transform:none;box-shadow:30px 0 60px -20px rgba(0,0,0,.6)}
  .sim-shell.side-off{grid-template-columns:minmax(0,1fr)}
  .sim-shell.side-off .sim-side{opacity:1;pointer-events:auto;padding:18px 14px 14px;overflow-y:auto;transform:translateX(-100%)}
  .sim-shell.side-off.menu-open .sim-side{transform:none}
  .sim-velo{display:block;position:fixed;inset:0;z-index:29;background:rgba(6,11,14,.5);opacity:0;pointer-events:none;transition:opacity .3s}
  .sim-shell.menu-open .sim-velo{opacity:1;pointer-events:auto}
  .sim-bar{padding:12px 16px}
  .sim-main{padding:4px 16px 48px}
}`;

function pantallaSinAcceso(titulo, texto) {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="amb"></div>
    <div style="position:relative;z-index:1;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
      <div class="glass rise" style="max-width:460px;padding:40px;text-align:center">
        <div class="h-display" style="font-size:26px">${esc(titulo)}</div>
        <p class="muted" style="line-height:1.6;margin:14px 0 26px">${esc(texto)}</p>
        <a class="btn btn-primary" href="${RAIZ}">${ICO_BACK} Ir al portal</a>
      </div>
    </div>`);
}

export async function iniciarApp({ appId, layout = 'completo', alCambiarModulo = null } = {}) {
  const app = appPorId(appId);
  if (!app) throw new Error('Aplicativo no registrado en el catálogo: ' + appId);

  const user = await esperarUsuario();
  if (!user) { location.replace(RAIZ); return new Promise(() => {}); }

  let perfil = null;
  try { perfil = await cargarPerfil(user); } catch (e) { console.warn(e); }
  const acceso = accesoApp(user, perfil, appId);
  if (!acceso) {
    pantallaSinAcceso('Sin acceso', `Su usuario no tiene permisos para ${app.nombre}. Comuníquese con el administrador del sistema.`);
    return new Promise(() => {});
  }

  const modulos = app.modulos.filter(m => acceso.modulos.includes(m.id));
  const ctx = {
    app, user, perfil, acceso, db, auth, modulos,
    rol: acceso.rol,
    esAdmin: esAdmin(user),
    puedeEscribir: puedeEscribir(acceso),
    puedeModulo: (id) => acceso.modulos.includes(id),
    modulo: null, main: null, toast,
    salir: () => signOut(auth).then(() => location.replace(RAIZ)),
    irA: null
  };

  if (layout === 'minimo') {
    document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
    document.body.insertAdjacentHTML('beforeend', `<a class="sim-float" href="${RAIZ}" title="Volver al portal">${ICO_BACK} Portal</a>`);
    return ctx;
  }

  document.head.insertAdjacentHTML('beforeend', `<style>${CSS}</style>`);
  const ico = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${app.color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${app.icon}"/></svg>`;
  const shell = document.createElement('div');
  shell.className = 'sim-shell';
  shell.innerHTML = `
    <aside class="sim-side" style="--ac:${app.color}">
      <a class="sim-brand" href="${RAIZ}" title="Ir al portal"><img src="${RAIZ}core/marca/logo-negativo.png" alt="Santa Monica Fishing"><span></span><b>SIM</b></a>
      <a class="sim-back" href="${RAIZ}">${ICO_BACK} Volver al portal</a>
      <div class="sim-apphead">
        <div class="sim-appico" style="background:${app.color}24;border:1px solid ${app.color}55">${ico}</div>
        <div style="min-width:0"><div class="sim-appname">${esc(app.nombre)}</div><div class="sim-rol">Rol: ${esc(acceso.rol)}</div></div>
      </div>
      <nav>
        <div class="sim-navt">Módulos</div>
        <div id="simMods" style="display:flex;flex-direction:column;gap:4px"></div>
      </nav>
      <div class="sim-user">
        <div class="avatar">${esc(iniciales(perfil?.nombre, user.email))}</div>
        <div style="min-width:0;flex-grow:1"><div class="n">${esc(perfil?.nombre || user.email)}</div><div class="e">${esc(user.email)}</div></div>
        <button class="sim-out" id="simOut" aria-label="Cerrar sesión" title="Cerrar sesión">${ICO_OUT}</button>
      </div>
    </aside>
    <div class="sim-velo" id="simVelo"></div>
    <div class="sim-body">
      <div class="sim-bar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-icon sim-menu" id="simMenu" aria-label="Abrir menú">${ICO_MENU}</button>
          <div class="sim-crumb">SIM <span style="opacity:.5">/</span> ${esc(app.nombre)} <span style="opacity:.5">/</span> <b id="simCrumb"></b></div>
        </div>
        <div class="sim-sync"><span class="live"></span>Sincronizado</div>
      </div>
      <main class="sim-main" id="simMain"></main>
    </div>`;
  document.body.prepend(shell);
  document.body.insertAdjacentHTML('afterbegin', '<div class="amb"></div>');
  ctx.main = shell.querySelector('#simMain');
  shell.querySelector('#simOut').onclick = ctx.salir;
  shell.querySelector('#simVelo').onclick = () => shell.classList.remove('menu-open');
  // Menú lateral: en celular se abre sobre el contenido; en pantalla grande se oculta o muestra (se recuerda la preferencia)
  const LS_SIDE = 'sim_menu_oculto';
  const movil = () => matchMedia('(max-width:900px)').matches;
  try { if (localStorage.getItem(LS_SIDE) === '1') shell.classList.add('side-off'); } catch (e) {}
  const btnMenu = shell.querySelector('#simMenu');
  const titMenu = () => { const t = movil() ? 'Abrir menú' : shell.classList.contains('side-off') ? 'Mostrar módulos' : 'Ocultar módulos'; btnMenu.title = t; btnMenu.setAttribute('aria-label', t); };
  btnMenu.onclick = () => {
    if (movil()) shell.classList.toggle('menu-open');
    else { const off = shell.classList.toggle('side-off'); try { localStorage.setItem(LS_SIDE, off ? '1' : '0'); } catch (e) {} }
    titMenu();
  };
  titMenu();

  const pintarMenu = () => {
    shell.querySelector('#simMods').innerHTML = modulos.length
      ? modulos.map(m => `<button class="sim-mod ${ctx.modulo === m.id ? 'on' : ''}" data-m="${m.id}"><i></i>${esc(m.nombre)}</button>`).join('')
      : '<div style="padding:12px 14px;font-size:14px;color:#A7B4BF">Módulos por definir</div>';
    shell.querySelectorAll('[data-m]').forEach(b => b.onclick = () => ctx.irA(b.dataset.m));
  };

  ctx.irA = (id) => {
    if (!modulos.find(m => m.id === id)) id = modulos[0]?.id || null;
    ctx.modulo = id;
    if (id && location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
    shell.querySelector('#simCrumb').textContent = modulos.find(m => m.id === id)?.nombre || 'Inicio';
    shell.classList.remove('menu-open');
    pintarMenu();
    ctx.main.innerHTML = '';
    if (alCambiarModulo) alCambiarModulo(id, ctx);
  };
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== ctx.modulo) ctx.irA(h); });

  ctx.irA(location.hash.slice(1));
  return ctx;
}
