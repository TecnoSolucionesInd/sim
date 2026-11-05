#!/usr/bin/env python3
"""
Aplica a apps/cong/index.html las correcciones y mejoras del aplicativo de
Congelamiento del 2026-11-05, tomándolas del archivo original ya corregido.

Uso:
    python3 tools/parche_cong_2026_11_05.py <mantenimiento.html corregido> [destino]
    (destino por defecto: apps/cong/index.html)

Incluye:
  1. Caché en memoria (corrige QuotaExceededError de localStorage que congelaba
     los datos: _fid fantasma, borrados sin efecto, eventos duplicados y eventos
     que nunca se cerraban).
  2. Auto-cierre de TODOS los eventos abiertos del equipo al abrir bachada.
  3. Identidad de evento por _fid de Firestore (no por el campo id repetible).
  4. Mensaje claro ante registro fantasma al cerrar un evento.
  5. Guarda anti-duplicado: un equipo no puede tener dos eventos abiertos del
     mismo tipo (formulario de eventos y modal post-bachada).
  6. Indicadores clave ligados al rango de fechas filtrado.
  7. Gráfica "Producción mensual · histórico" con filtro de año propio.

No toca nada específico del SIM (sesión del portal, colecciones datos/cong,
menú). Cada reemplazo se verifica: si un bloque no coincide exactamente una
vez, el script se detiene sin escribir.
"""
import re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent


def sacar(src, patron, nombre, grupo=1):
    m = re.search(patron, src, re.S)
    if not m:
        sys.exit(f'[ERROR] No se encontró en el original: {nombre}')
    return m.group(grupo)


def rep(s, viejo, nuevo, nombre, veces=1):
    n = s.count(viejo)
    if n != veces:
        sys.exit(f'[ERROR] "{nombre}": se esperaban {veces} coincidencias, hay {n}.')
    return s.replace(viejo, nuevo, veces)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    orig = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
    dest_p = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / 'apps' / 'cong' / 'index.html'
    s = dest_p.read_text(encoding='utf-8')
    hechos = []

    # ---------------------------------------------------------------- 1. CACHE
    nuevo_cache = sacar(orig, r'(// -{10,}\n// CORRECCIÓN CRÍTICA: la fuente de lectura.*?\n  _avisoCuota:false\n\};)', 'bloque CACHE')
    s = rep(s,
        "const CACHE = {\n"
        "  get:(k,d)=>{try{return JSON.parse(localStorage.getItem('smf_'+k))??d;}catch{return d;}},\n"
        "  set:(k,v)=>localStorage.setItem('smf_'+k,JSON.stringify(v))\n"
        "};",
        nuevo_cache, '1. CACHE en memoria')
    hechos.append('1. Caché en memoria (causa raíz)')

    # ------------------------------------------------- 2. Auto-cierre completo
    viejo_ac = sacar(s, r'(      try \{\n        const evsAbiertos = DB\.get\(\'eventos\', \[\]\)\.filter\(e => \n.*?\n      \} catch\(err\) \{\n        console\.warn\(\'Auto-cierre evento falló:\', err\);\n        // No bloquea la creación de la bachada\n      \})', 'auto-cierre viejo')
    nuevo_ac = sacar(orig, r'(      // CORRECCIÓN: se cierran TODOS los eventos abiertos del equipo.*?\n      \} catch\(err\) \{\n        console\.warn\(\'Auto-cierre evento falló:\', err\);\n        // No bloquea la creación de la bachada\n      \})', 'auto-cierre nuevo')
    s = rep(s, viejo_ac, nuevo_ac, '2. Auto-cierre de todos los eventos')
    hechos.append('2. Auto-cierre de TODOS los eventos abiertos del equipo')

    # ------------------------------------- 3. Botones: pasar _fid en vez de id
    botones = [
        ("""onclick="openEventoModal(' + e.id + ')">""",
         """onclick="openEventoModal(\\'' + (e._fid || e.id) + '\\')">"""),
        ("""onclick="delEvento(' + e.id + ')">""",
         """onclick="delEvento(\\'' + (e._fid || e.id) + '\\')">"""),
        ("""openEventoModal(${e.id})" title="Editar\"""",
         """openEventoModal('${e._fid || e.id}')" title="Editar\""""),
        ("""delEvento(${e.id})" title="Eliminar\"""",
         """delEvento('${e._fid || e.id}')" title="Eliminar\""""),
        ("""openEventoModal('${evAct.id}')">✏️ Editar evento""",
         """openEventoModal('${evAct._fid || evAct.id}')">✏️ Editar evento"""),
        ("""openEventoModal('${evAct.id}');setTimeout""",
         """openEventoModal('${evAct._fid || evAct.id}');setTimeout"""),
        ("""delEvento('${evAct.id}')" title="Eliminar\"""",
         """delEvento('${evAct._fid || evAct.id}')" title="Eliminar\""""),
        ("""openEventoModal('${ev.id}')">✏️ Editar""",
         """openEventoModal('${ev._fid || ev.id}')">✏️ Editar"""),
        ("""openEventoModal('${ev.id}')">✅ Cerrar""",
         """openEventoModal('${ev._fid || ev.id}')">✅ Cerrar"""),
        ("""delEvento('${ev.id}')" title="Eliminar\"""",
         """delEvento('${ev._fid || ev.id}')" title="Eliminar\""""),
    ]
    for i, (a, b) in enumerate(botones, 1):
        s = rep(s, a, b, f'3.{i} botón de evento')
    hechos.append(f'3. {len(botones)} botones de evento ahora usan el _fid de Firestore')

    # --------------------------------- 4. resolverEvento + openEventoModal
    resolver = sacar(orig, r'(// Resolución de identidad de un evento\.\n.*?\n  return cand\[0\] \|\| null;\n\})', 'resolverEvento')
    s = rep(s, '// ======== EVENTOS ========\nfunction openEventoModal(id){',
            '// ======== EVENTOS ========\n' + resolver + '\n\nfunction openEventoModal(id){',
            '4a. insertar resolverEvento')
    s = rep(s,
        "    // Buscar por id numérico O por _fid de Firestore\n"
        "    const ev=DB.get('eventos',[]).find(x=>x.id===id || x._fid===id || String(x.id)===String(id));\n"
        "    if(!ev){\n"
        "      console.error('Evento no encontrado con id:', id);\n"
        "      alert('Error: no se pudo cargar el evento para editar.');\n"
        "      return;\n"
        "    }",
        sacar(orig, r'(    // Buscar priorizando el _fid de Firestore \(ver resolverEvento\)\n.*?\n    \})', 'openEventoModal nuevo'),
        '4b. openEventoModal por _fid')
    hechos.append('4. resolverEvento(): identidad por _fid, avisa de ids duplicados')

    # -------------------------------------------------------- 5. delEvento
    s = rep(s,
        "    const item=DB.get('eventos',[]).find(e=>e.id===id||e._fid===id||String(e.id)===String(id));\n"
        "    if(!item){ showToast('No se encontró el evento.','warn'); return; }\n"
        "    const fid=item._fid||String(id);\n"
        "    await COL.eventos().doc(fid).delete();\n"
        "    showToast('Evento eliminado.','success');",
        sacar(orig, r'(    const item=resolverEvento\(id\);\n.*?\n    showToast\(\'Evento eliminado\.\',\'success\'\);)', 'delEvento nuevo'),
        '5. delEvento sin fallback peligroso')
    hechos.append('5. delEvento(): sin ruta inventada cuando falta el _fid')

    # ------------------------------------------------------- 6. saveEvento
    s = rep(s,
        "      // Buscar el evento existente — múltiples criterios de match\n"
        "      const existing = DB.get('eventos',[]).find(e =>\n"
        "        (editingEventoFid && e._fid === editingEventoFid) ||\n"
        "        e._fid === editingEventoId ||\n"
        "        e.id === editingEventoId ||\n"
        "        String(e.id) === String(editingEventoId)\n"
        "      );",
        "      // Buscar el evento existente priorizando _fid (ver resolverEvento)\n"
        "      const existing = resolverEvento(editingEventoFid || editingEventoId);",
        '6a. saveEvento find')
    s = rep(s,
        "      // UPDATE PURO (no INSERT — Firestore .update() no crea documento si no existe)\n"
        "      await COL.eventos().doc(fid).update(docData);",
        sacar(orig, r'(      // UPDATE PURO \(no INSERT.*?\n        throw eUp;\n      \})', 'update con fantasma'),
        '6b. saveEvento registro fantasma')
    s = rep(s,
        "        console.warn('Duplicado detectado y bloqueado:', duplicado);\n"
        "        return;\n"
        "      }\n"
        "      docData.id = Date.now();",
        sacar(orig, r"(        console\.warn\('Duplicado detectado y bloqueado:', duplicado\);\n        return;\n      \}\n      // GUARDA OPERATIVA.*?\n      docData\.id = Date\.now\(\);)", 'guarda abierto duplicado'),
        '6c. guarda de evento abierto duplicado')
    hechos.append('6. saveEvento(): fantasma avisado + no duplica eventos abiertos')

    # ------------------------------------------------- 7. guardarPostBachada
    s = rep(s,
        "  try {\n    await COL.eventos().add(reg);",
        sacar(orig, r'(  // GUARDA ANTI-DUPLICADO: no crear un segundo evento abierto.*?\n  try \{\n    await COL\.eventos\(\)\.add\(reg\);)', 'guarda post-bachada'),
        '7. post-bachada anti-duplicado')
    hechos.append('7. Modal post-bachada: no duplica el evento abierto')

    # --------------------------------------------- 8. Indicadores por período
    s = rep(s, '<div class="dash-mini-label">Producción día</div>',
            '<div class="dash-mini-label" id="kpi-prod-label">Producción día</div>', '8a. etiqueta producción')
    s = rep(s, '<div class="dash-mini-label">Acumulado mes</div>',
            '<div class="dash-mini-label" id="kpi-acum-label">Acumulado mes</div>', '8b. etiqueta acumulado')
    viejo_kpi = sacar(s, r'(  // Producción acumulada del MES actual \(independiente del filtro de fecha, usa mes en curso\)\n.*?dash-mini-unit">t</span>\';)', 'KPI mes viejo')
    nuevo_kpi = sacar(orig, r'(  // ={10,}\n  // TARJETAS 1 y 2 — ambas ligadas al RANGO DE FECHAS FILTRADO\n.*?dash-mini-unit">t</span>\';\n  \})', 'KPI nuevo')
    s = rep(s, viejo_kpi, nuevo_kpi, '8c. KPI ligado al período')
    hechos.append('8. Indicadores clave ligados al rango filtrado (+ fecha local)')

    # ------------------------------------------- 9. Producción mensual · hist.
    css_pm = sacar(orig, r'(/\* ===== Producción mensual · histórico ===== \*/\n.*?\n@media\(max-width:768px\)\{\n  \.pm-strip\{grid-template-columns:repeat\(2,1fr\);\}\n  #card-prod-mensual \.pbi-card-head\{flex-wrap:wrap;gap:8px;\}\n\})', 'CSS mensual')
    s = rep(s,
        ".dash-zona-inferior {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 12px;\n}",
        ".dash-zona-inferior {\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 12px;\n}\n" + css_pm,
        '9a. CSS producción mensual')
    s = rep(s,
        '  .dash-zona-inferior > .pbi-card[style*="span 2"] { grid-column: span 1 !important; }',
        '  .dash-zona-inferior > .pbi-card[style*="span 2"] { grid-column: span 1 !important; }\n'
        '  .dash-zona-inferior > .pbi-card[style*="span 3"] { grid-column: span 1 !important; }',
        '9b. media query span 3')
    tarjeta = sacar(orig, r'(              <!-- Producción mensual · histórico \(ancho completo, filtro de año propio\) -->\n.*?<div class="pm-strip" id="pm-strip"></div>\n              </div>)', 'tarjeta mensual')
    s = rep(s,
        '<div style="position:relative;height:340px;"><canvas id="chart-prod-dia"></canvas></div>\n'
        '              </div>\n'
        '            </div>',
        '<div style="position:relative;height:340px;"><canvas id="chart-prod-dia"></canvas></div>\n'
        '              </div>\n\n' + tarjeta + '\n            </div>',
        '9c. tarjeta producción mensual')
    fn_pm = sacar(orig, r'(// ={10,}\n// PRODUCCIÓN MENSUAL · HISTÓRICO\n.*?\n      \'<div class="pm-sc p">.*?\n  \}\n\})', 'función mensual')
    s = rep(s,
        "  renderLineConMeta('chart-prod-dia', fechasOrd.map(f => f.slice(5)), prodDiariaTon, 'Producción (t)', '#00c8ff', 120);\n}",
        "  renderLineConMeta('chart-prod-dia', fechasOrd.map(f => f.slice(5)), prodDiariaTon, 'Producción (t)', '#00c8ff', 120);\n}\n\n" + fn_pm,
        '9d. función renderProdMensual')
    s = rep(s,
        "  // Producción diaria (tendencia): se renderiza con su PROPIO filtro de fecha,\n"
        "  // independiente del filtro global del dashboard. Ver renderTendenciaProduccion().\n"
        "  renderTendenciaProduccion();",
        "  // Producción diaria (tendencia): se renderiza con su PROPIO filtro de fecha,\n"
        "  // independiente del filtro global del dashboard. Ver renderTendenciaProduccion().\n"
        "  renderTendenciaProduccion();\n\n"
        "  // Producción mensual · histórico: filtro de AÑO propio, también independiente\n"
        "  // del rango global. Ver renderProdMensual().\n"
        "  try{ renderProdMensual(); }catch(e){ console.warn('renderProdMensual:', e); }",
        '9e. llamada a renderProdMensual')
    hechos.append('9. Gráfica "Producción mensual · histórico" con filtro de año')

    dest_p.write_text(s, encoding='utf-8')
    print('✅ Parche aplicado a', dest_p)
    for h in hechos:
        print('   ·', h)


if __name__ == '__main__':
    main()
