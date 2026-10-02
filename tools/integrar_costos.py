#!/usr/bin/env python3
"""
Integra el aplicativo de Costos de Mantenimiento al portal SIM.

Uso:
    python3 tools/integrar_costos.py <Costos_Mantenimiento_App.html> [salida]
    (salida por defecto: apps/cost/index.html)

Conserva el diseño y la lógica del aplicativo; solo cambia:
  - Los datos de órdenes (DATA) se retiran del código: se cargan desde Firebase
    (datos/cost/fuente) con la herramienta apps/cost/cargar.html. El repositorio es público.
  - Asignaciones, dictámenes, catálogo y producción (estado) se guardan en Firebase
    (datos/cost/estado/principal) además del navegador: visibles desde cualquier dispositivo.
  - Acceso con la sesión del portal; módulos visibles según los permisos asignados.
  - Respaldo / Restablecer: solo para el rol Admin del aplicativo.
"""
import re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SDK = '10.12.2'

# id del módulo en el aplicativo  ->  id del módulo en el catálogo del portal
MODMAP = {
    'general': 'general', 'ratio': 'ratio', 'Congelado': 'congelado', 'Planta de hielo': 'hielo',
    'Planta de ósmosis': 'osmosis', 'Calderos': 'calderos', 'Resto de planta': 'resto',
    'equipos': 'equipos', 'asignar': 'asignar', 'catalogo': 'catalogo', 'capex': 'capex'
}

def leer_config():
    txt = (RAIZ / 'core' / 'config.js').read_text(encoding='utf-8')
    cfg = re.search(r'export const firebaseConfig = (\{.*?\});', txt, re.S).group(1)
    admin = re.search(r"ADMIN_EMAIL = '([^']+)'", txt).group(1)
    return cfg, admin.lower()

def reemplazar(src, viejo, nuevo, nombre, regex=False):
    n = len(re.findall(viejo, src, flags=re.S)) if regex else src.count(viejo)
    if n != 1: sys.exit(f'[ERROR] Bloque "{nombre}": se esperaba 1 coincidencia, hay {n}.')
    return re.sub(viejo, lambda m: nuevo, src, count=1, flags=re.S) if regex else src.replace(viejo, nuevo, 1)

ARRANQUE = r"""<script src="https://www.gstatic.com/firebasejs/__SDK__/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/__SDK__/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/__SDK__/firebase-firestore-compat.js"></script>
<div id="sim-boot" style="position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#1D2E40;color:#C9D4DF;font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;text-align:center;padding:24px">Verificando acceso…</div>
<script>
// ======== ARRANQUE SIM: sesión del portal + datos desde Firebase ========
(function () {
  const CFG = __CFG__;
  const ADMIN = '__ADMIN__';
  const MODMAP = __MODMAP__;
  const LSKEY = 'smf_costos_mant_2026_v1';
  firebase.initializeApp(CFG);
  const db = firebase.firestore();
  const base = db.collection('datos').doc('cost');
  const boot = document.getElementById('sim-boot');
  const pantalla = (titulo, texto, extra) => {
    boot.innerHTML = '<div style="max-width:460px;padding:34px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)">'
      + '<div style="font-size:21px;font-weight:600;color:#fff">' + titulo + '</div><p style="line-height:1.6;color:#C9D4DF">' + texto + '</p>'
      + (extra || '') + '<a href="../../" style="display:inline-block;margin-top:6px;padding:11px 20px;border-radius:10px;background:#2BA6A0;color:#fff;font-weight:600;text-decoration:none">Ir al portal</a></div>';
  };

  firebase.auth().onAuthStateChanged(async function (u) {
    if (!u) { location.replace('../../'); return; }
    let perfil = null;
    try { const s = await db.collection('usuarios').doc(u.uid).get(); perfil = s.exists ? s.data() : null; } catch (e) { console.warn('[SIM] perfil', e); }
    const esAdm = (u.email || '').toLowerCase() === ADMIN && u.emailVerified === true;
    const todos = Object.values(MODMAP);
    let rol = null, mods = todos;
    if (esAdm) rol = 'admin';
    else if (perfil && perfil.activo === true && perfil.apps && perfil.apps.cost && perfil.apps.cost.rol) {
      rol = perfil.apps.cost.rol;
      const pm = perfil.apps.cost.modulos;
      if (Array.isArray(pm) && pm.length) mods = pm.filter(m => todos.includes(m));
    }
    if (!rol) { pantalla('Sin acceso', 'Su usuario no tiene permisos para Costos de mantenimiento. Comuníquese con el administrador del sistema.'); return; }
    const escribe = ['admin', 'supervisor', 'operador'].includes(rol);

    // 1. Datos de órdenes
    try {
      boot.textContent = 'Cargando datos…';
      const meta = await base.collection('fuente').doc('meta').get();
      if (!meta.exists) {
        pantalla('Sin datos cargados', 'Aún no se han cargado las órdenes de compra y servicio en el SIM.',
          esAdm ? '<a href="cargar.html" style="display:inline-block;margin:0 8px 0 0;padding:11px 20px;border-radius:10px;border:1px solid rgba(255,255,255,.3);color:#fff;text-decoration:none">Cargar datos</a>' : '');
        return;
      }
      const m = meta.data();
      const partes = await Promise.all(Array.from({ length: m.partes }, (_, i) => base.collection('fuente').doc('p' + i).get()));
      const rows = [];
      partes.forEach(p => { if (p.exists) rows.push.apply(rows, JSON.parse(p.data().json)); });
      window.__COSTOS_DATA = Object.assign({}, JSON.parse(m.extra || '{}'), { rows: rows, cat: JSON.parse(m.cat || '[]') });
      // 2. Estado compartido (asignaciones, dictámenes, catálogo, producción)
      const est = await base.collection('estado').doc('principal').get();
      if (est.exists && est.data().json) localStorage.setItem(LSKEY, est.data().json);
    } catch (e) {
      console.error('[SIM] carga', e);
      pantalla('No se pudieron cargar los datos', (e && e.code) ? ('Código: ' + e.code) : String(e));
      return;
    }

    // 3. Ejecutar el aplicativo
    const app = document.createElement('script');
    app.textContent = document.getElementById('costos-app').textContent;
    document.body.appendChild(app);

    // 4. Módulos según permisos
    for (let i = MODS.length - 1; i >= 0; i--) if (!mods.includes(MODMAP[MODS[i].id])) MODS.splice(i, 1);
    if (!MODS.find(x => x.id === CUR)) CUR = MODS.length ? MODS[0].id : CUR;
    buildNav(); render();

    // 5. Barra lateral: portal, estado de guardado, respaldo solo para Admin
    const side = document.getElementById('side');
    side.insertAdjacentHTML('afterbegin', '<a href="../../" style="display:flex;align-items:center;gap:8px;padding:12px 18px;color:#C9D4DF;text-decoration:none;font-size:13px;border-bottom:1px solid rgba(255,255,255,.08)">⟵ Portal SIM</a>');
    const foot = side.querySelector('.sidefoot');
    if (foot) {
      if (rol !== 'admin') foot.querySelectorAll('button').forEach(b => b.style.display = 'none');
      foot.insertAdjacentHTML('afterbegin', '<div id="sim-sync" style="font-size:11.5px;color:#8FA3B7;text-align:center;padding:2px 0">'
        + (escribe ? 'Cambios guardados en el SIM' : 'Modo consulta: los cambios no se guardan') + '</div>');
    }
    boot.remove();

    // 6. Guardar también en Firebase (con espera para agrupar cambios)
    if (!escribe) return;
    const marca = (t, c) => { const el = document.getElementById('sim-sync'); if (el) { el.textContent = t; el.style.color = c || '#8FA3B7'; } };
    let timer = null;
    const original = window.save;
    window.save = function () {
      original();
      marca('Guardando…');
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          await base.collection('estado').doc('principal').set({ json: JSON.stringify(ST), actualizado: firebase.firestore.FieldValue.serverTimestamp(), por: u.email });
          marca('Cambios guardados en el SIM');
        } catch (e) { console.error('[SIM] guardar', e); marca('No se pudo guardar en el SIM', '#ff9b9b'); }
      }, 1200);
    };
  });
})();
</script>
"""

def main():
    if len(sys.argv) < 2: sys.exit(__doc__)
    origen = pathlib.Path(sys.argv[1])
    destino = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / 'apps' / 'cost' / 'index.html'
    s = origen.read_text(encoding='utf-8')
    cfg, admin = leer_config()

    # 1. Retirar los datos del código
    s = reemplazar(s, r'const DATA = \{.*?\};\n', 'const DATA = window.__COSTOS_DATA;\n', 'DATA', regex=True)

    # 2. El aplicativo no se ejecuta solo: lo lanza el arranque tras validar sesión y cargar datos
    s = reemplazar(s, '<script>\nconst DATA = window.__COSTOS_DATA;', '<script type="text/plain" id="costos-app">\nconst DATA = window.__COSTOS_DATA;', 'Script principal')

    import json
    arranque = (ARRANQUE.replace('__SDK__', SDK).replace('__CFG__', cfg).replace('__ADMIN__', admin)
                .replace('__MODMAP__', json.dumps(MODMAP, ensure_ascii=False)))
    s = reemplazar(s, '<script type="text/plain" id="costos-app">', arranque + '<script type="text/plain" id="costos-app">', 'Arranque')

    s = re.sub(r'<title>.*?</title>', '<title>Costos de mantenimiento · SIM</title>', s, count=1, flags=re.S)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(s, encoding='utf-8')
    print(f'[OK] Generado {destino} ({len(s)//1024} KB)')

if __name__ == '__main__':
    main()
