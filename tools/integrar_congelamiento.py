#!/usr/bin/env python3
"""
Integra el aplicativo de Congelamiento (versión independiente) al portal SIM.

Uso:
    python3 tools/integrar_congelamiento.py <congelamiento.html original> [salida]
    (salida por defecto: apps/cong/index.html)

Conserva el diseño y la lógica del aplicativo; solo cambia:
  - Login propio  →  sesión única del portal (Firebase Auth) y permisos asignados en Administración
  - Proyecto Firebase  →  el definido en core/config.js
  - Colecciones sim_*  →  datos/cong/<coleccion>
  - Pestañas visibles según los módulos asignados al usuario
  - Menú: enlace "Portal SIM" en lugar de Inicio / módulos "Pronto" / Usuarios
Cada reemplazo se verifica; si el original cambió y un bloque ya no coincide, el script se detiene.
"""
import re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SDK = '10.12.2'

def leer_config():
    txt = (RAIZ / 'core' / 'config.js').read_text(encoding='utf-8')
    cfg = re.search(r'export const firebaseConfig = (\{.*?\});', txt, re.S).group(1)
    admin = re.search(r"ADMIN_EMAIL = '([^']+)'", txt).group(1)
    return cfg, admin

def reemplazar(src, viejo, nuevo, nombre, regex=False):
    if regex:
        n = len(re.findall(viejo, src, flags=re.S))
        if n != 1: sys.exit(f'[ERROR] Bloque "{nombre}": se esperaba 1 coincidencia, hay {n}.')
        return re.sub(viejo, lambda m: nuevo, src, count=1, flags=re.S)
    n = src.count(viejo)
    if n != 1: sys.exit(f'[ERROR] Bloque "{nombre}": se esperaba 1 coincidencia, hay {n}.')
    return src.replace(viejo, nuevo, 1)

def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    origen = pathlib.Path(sys.argv[1])
    destino = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / 'apps' / 'cong' / 'index.html'
    s = origen.read_text(encoding='utf-8')
    cfg, admin = leer_config()

    # 1. SDK: misma versión que el portal + Auth
    s = reemplazar(s,
        '<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>\n'
        '  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>',
        f'<script src="https://www.gstatic.com/firebasejs/{SDK}/firebase-app-compat.js"></script>\n'
        f'  <script src="https://www.gstatic.com/firebasejs/{SDK}/firebase-auth-compat.js"></script>\n'
        f'  <script src="https://www.gstatic.com/firebasejs/{SDK}/firebase-firestore-compat.js"></script>',
        'SDK Firebase')

    # 2. Proyecto Firebase del portal
    s = reemplazar(s, r'const firebaseConfig = \{.*?\};', f'const firebaseConfig = {cfg};', 'firebaseConfig', regex=True)

    # 3. Colecciones bajo datos/cong
    s = reemplazar(s, r"const COL = \{\s*users:.*?config:\s*\(\) => db\.collection\('sim_config'\),\s*\};",
        "const _CONG = () => db.collection('datos').doc('cong');\n"
        "const COL = {\n"
        "  users:     () => _CONG().collection('usuarios'),   // sin uso: los usuarios se gestionan en el portal\n"
        "  tecnicos:  () => _CONG().collection('tecnicos'),\n"
        "  productos: () => _CONG().collection('productos'),\n"
        "  bachadas:  () => _CONG().collection('bachadas'),\n"
        "  eventos:   () => _CONG().collection('eventos'),\n"
        "  config:    () => _CONG().collection('config'),\n"
        "};", 'Colecciones', regex=True)

    # 4. Sesión del portal en lugar del login propio
    adaptador = r"""// ======== SESIÓN DEL PORTAL SIM ========
// El acceso y los permisos se gestionan en el portal (Administración).
const SIM_ADMIN_EMAIL = '__ADMIN__';
const SIM_ROLMAP = { admin: 'admin', supervisor: 'supervisor', operador: 'operador', lectura: 'consulta' };
const SIM_TABMOD = { bachadas: 'proceso', registros: 'registros', eventos: 'eventos', dashboard: 'dashboard', sala: 'pantalla', config: 'config' };
const SIM_TABS = ['bachadas', 'registros', 'eventos', 'dashboard', 'sala', 'config'];
function puedeTab(t) {
  if (!currentUser) return false;
  const m = SIM_TABMOD[t];
  return !m || (currentUser._mods || []).includes(m);
}
function simSinAcceso(msg) {
  document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#364352;font-family:system-ui,sans-serif;color:#F1F4F7">'
    + '<div style="max-width:440px;text-align:center;padding:36px;border-radius:22px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)">'
    + '<div style="font-size:24px;font-weight:600">Sin acceso</div><p style="color:#C3CDD8;line-height:1.6">' + msg + '</p>'
    + '<a href="../../" style="display:inline-block;margin-top:8px;padding:12px 22px;border-radius:12px;background:#6FE3CF;color:#11302B;font-weight:600;text-decoration:none">Ir al portal</a></div></div>';
}
firebase.auth().onAuthStateChanged(async function (u) {
  if (!u) { location.replace('../../'); return; }
  let perfil = null;
  try { const snap = await db.collection('usuarios').doc(u.uid).get(); perfil = snap.exists ? snap.data() : null; }
  catch (e) { console.warn('[SIM] perfil:', e); }
  const esAdm = (u.email || '').toLowerCase() === SIM_ADMIN_EMAIL && u.emailVerified === true;
  let rol = null, mods = Object.values(SIM_TABMOD);
  if (esAdm) rol = 'admin';
  else if (perfil && perfil.activo === true && perfil.apps && perfil.apps.cong && perfil.apps.cong.rol) {
    rol = SIM_ROLMAP[perfil.apps.cong.rol] || 'consulta';
    const pm = perfil.apps.cong.modulos;
    if (Array.isArray(pm) && pm.length) mods = pm.filter(function (m) { return mods.includes(m); });
  }
  if (!rol) { simSinAcceso('Su usuario no tiene permisos para Congelamiento. Comuníquese con el administrador del sistema.'); return; }
  currentUser = { nombre: (perfil && perfil.nombre) || u.email, email: u.email, rol: rol, modulos: [], _mods: mods, _fid: u.uid, activo: true };
  const boot = document.getElementById('sim-boot'); if (boot) boot.remove();
  applyUserUI(currentUser);
  ['btn-admin-topbar', 'module-admin', 'nav-usuarios', 'nav-admin-section'].forEach(function (id) { const e = document.getElementById(id); if (e) e.style.display = 'none'; });
  const tabs = document.querySelectorAll('#cong-tabs .tab');
  SIM_TABS.forEach(function (t, i) { if (tabs[i]) tabs[i].style.display = puedeTab(t) ? '' : 'none'; });
  startListeners();
  navigate('congelamiento');
  setDefaultDates();
  showTab('cong', SIM_TABS.find(puedeTab) || 'bachadas');
  setTimeout(renderBachadasCards, 600);
});

// ======== AUTH ========"""
    s = reemplazar(s, r"// Restore session on page load.*?\n// ======== AUTH ========",
                   adaptador.replace('__ADMIN__', admin.lower()), 'Sesión', regex=True)

    # 5. Cerrar sesión = cerrar sesión del portal
    s = reemplazar(s, 'function doLogout(){\n',
        "function doLogout(){\n  firebase.auth().signOut().finally(function(){ location.replace('../../'); });\n  return;\n", 'Logout')

    # 6. Sin alta automática de usuarios con clave por defecto
    s = reemplazar(s, 'async function initFirebaseDefaults() {\n', 'async function initFirebaseDefaults() {\n  return; // gestionado por el portal\n', 'Defaults')

    # 7. Permisos de escritura según rol (Lectura = solo consulta)
    s = reemplazar(s, 'function canEdit(){return currentUser!=null;}',
                   "function canEdit(){return currentUser!=null && currentUser.rol!=='consulta';}", 'canEdit')

    # 8. Pestañas según módulos asignados
    s = reemplazar(s, 'function showTab(prefix,name){\n',
        "function showTab(prefix,name){\n  if(prefix==='cong' && currentUser && !puedeTab(name)){ const f=SIM_TABS.find(puedeTab); if(f && f!==name) return showTab(prefix,f); }\n", 'showTab')
    s = reemplazar(s, "if(name==='sala' && !canAdmin()){", "if(name==='sala' && !puedeTab('sala')){", 'Pantalla Sala')

    # 9. Menú lateral: enlace al portal
    s = reemplazar(s, r'<div class="nav-section-label">Principal</div>.*?id="nav-usuarios">.*?</div>',
        '<a class="nav-item" href="../../" style="text-decoration:none;color:inherit"><span class="nav-icon">⟵</span> Portal SIM</a>\n'
        '      <div class="nav-section-label">Procesos</div>\n'
        '      <div class="nav-item" onclick="navigate(\'congelamiento\')" id="nav-congelamiento"><span class="nav-icon">🧊</span> Congelamiento</div>',
        'Menú lateral', regex=True)

    # 10. Barra superior: botón Portal, sin botón Usuarios
    s = reemplazar(s, '<button class="btn-sm btn-accent no-print" id="btn-admin-topbar" onclick="abrirAdmin()">👥 Usuarios</button>',
        '<a class="btn-sm btn-ghost no-print" href="../../" style="text-decoration:none;font-size:12px;">⟵ Portal</a>\n'
        '        <button class="btn-sm btn-accent no-print" id="btn-admin-topbar" onclick="abrirAdmin()" style="display:none">👥 Usuarios</button>', 'Barra superior')

    # 11. Sin pantalla de login propia; indicador de carga mientras valida la sesión
    s = reemplazar(s, '<div id="auth-screen">',
        '<div id="sim-boot" style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#0b1622;color:#8aaac8;font-family:system-ui,sans-serif;font-size:14px">Verificando acceso…</div>\n'
        '<div id="auth-screen" style="display:none!important">', 'Pantalla de login')

    s = re.sub(r'<title>.*?</title>', '<title>Congelamiento · SIM</title>', s, count=1, flags=re.S)

    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(s, encoding='utf-8')
    print(f'[OK] Generado {destino.relative_to(RAIZ) if destino.is_relative_to(RAIZ) else destino}')

if __name__ == '__main__':
    main()
