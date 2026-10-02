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
.sim-shell{position:relative;z-index:1;display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}
.sim-side{position:sticky;top:0;height:100vh;overflow-y:auto;padding:22px 16px;background:rgba(36,46,57,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-right:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;gap:24px;animation:slidein .5s var(--ease) both}
.sim-apphead{display:flex;align-items:center;gap:14px;padding:0 6px}
.sim-appico{width:50px;height:50px;border-radius:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.sim-appname{font-family:var(--f-display);font-weight:600;font-size:16px;line-height:1.25}
.sim-navt{font-family:var(--f-mono);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx-3);padding:0 12px 10px}
.sim-mod{width:100%;height:46px;padding:0 14px;border:0;border-radius:12px;text-align:left;font-size:14.5px;font-weight:500;display:flex;align-items:center;gap:12px;background:transparent;color:var(--tx-2);transition:background .25s,color .25s,transform .25s}
.sim-mod:hover{background:rgba(255,255,255,.07);transform:translateX(3px)}
.sim-mod i{width:8px;height:8px;border-radius:3px;background:rgba(255,255,255,.25);display:block;flex-shrink:0}
.sim-mod.on{color:#fff}
.sim-user{margin-top:auto;display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:rgba(255,255,255,.05)}
.sim-user .avatar{width:38px;height:38px;font-size:13px}
.sim-body{min-width:0;display:flex;flex-direction:column}
.sim-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 36px;flex-wrap:wrap}
.sim-crumb{font-family:var(--f-mono);font-size:13px;color:var(--tx-3)}
.sim-crumb b{color:var(--tx);font-weight:500}
.sim-main{padding:6px 36px 60px;min-width:0}
.sim-menu{display:none}
.sim-float{position:fixed;left:16px;bottom:16px;z-index:9999;height:44px;padding:0 16px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(46,58,71,.88);backdrop-filter:blur(12px);color:#F1F4F7;display:flex;align-items:center;gap:8px;font:500 14px 'IBM Plex Sans',system-ui,sans-serif;text-decoration:none;box-shadow:0 14px 30px -14px rgba(0,0,0,.6)}
.sim-float:hover{background:rgba(58,71,87,.95)}
@media (max-width:900px){
  .sim-shell{grid-template-columns:minmax(0,1fr)}
  .sim-side{position:fixed;inset:0 auto 0 0;width:284px;z-index:30;transform:translateX(-100%);transition:transform .35s var(--ease);animation:none}
  .sim-shell.menu-open .sim-side{transform:none;box-shadow:30px 0 60px -20px rgba(0,0,0,.6)}
  .sim-menu{display:inline-flex}
  .sim-bar{padding:14px 16px}
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
    <aside class="sim-side">
      <a class="btn" href="${RAIZ}" style="justify-content:flex-start">${ICO_BACK} Volver al portal</a>
      <div class="sim-apphead">
        <div class="sim-appico" style="background:${app.color}24;border:1px solid ${app.color}55">${ico}</div>
        <div><div class="sim-appname">${esc(app.nombre)}</div><div style="font-size:12px;color:var(--tx-3);margin-top:3px;text-transform:capitalize">Rol: ${esc(acceso.rol)}</div></div>
      </div>
      <nav>
        <div class="sim-navt">Módulos</div>
        <div id="simMods" style="display:flex;flex-direction:column;gap:4px"></div>
      </nav>
      <div class="sim-user">
        <div class="avatar">${esc(iniciales(perfil?.nombre, user.email))}</div>
        <div style="min-width:0;flex-grow:1"><div style="font-size:13.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(perfil?.nombre || user.email)}</div><div style="font-size:12px;color:var(--tx-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user.email)}</div></div>
        <button class="btn btn-icon" id="simOut" aria-label="Cerrar sesión" title="Cerrar sesión" style="width:38px;height:38px">${ICO_OUT}</button>
      </div>
    </aside>
    <div class="sim-body">
      <div class="sim-bar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="btn btn-icon sim-menu" id="simMenu" aria-label="Abrir menú">${ICO_MENU}</button>
          <div class="sim-crumb">SIM <span style="opacity:.5">/</span> ${esc(app.nombre)} <span style="opacity:.5">/</span> <b id="simCrumb"></b></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:var(--tx-2)"><span class="live"></span>Sincronizado</div>
      </div>
      <main class="sim-main" id="simMain"></main>
    </div>`;
  document.body.prepend(shell);
  document.body.insertAdjacentHTML('afterbegin', '<div class="amb"></div>');
  ctx.main = shell.querySelector('#simMain');
  shell.querySelector('#simOut').onclick = ctx.salir;
  shell.querySelector('#simMenu').onclick = () => shell.classList.toggle('menu-open');

  const pintarMenu = () => {
    shell.querySelector('#simMods').innerHTML = modulos.length
      ? modulos.map(m => `<button class="sim-mod ${ctx.modulo === m.id ? 'on' : ''}" data-m="${m.id}" style="${ctx.modulo === m.id ? `background:${app.color}26` : ''}"><i style="${ctx.modulo === m.id ? `background:${app.color}` : ''}"></i>${esc(m.nombre)}</button>`).join('')
      : '<div style="padding:12px 14px;font-size:14px;color:var(--tx-2)">Módulos por definir</div>';
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
