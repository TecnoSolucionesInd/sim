# Prueba de Congelamiento (apps/cong) con Firebase simulado y datos de ejemplo: NO toca datos reales.
# Uso:  python3 cong.py <prefijo> [desk|movil]
# Recorre las 6 pestañas, los 2 formularios, las 3 páginas del dashboard, el informe de tiempos y el menú en celular.
# Por cada paso: captura <prefijo>_<paso>_<desk|movil>.png, errores de consola, desborde horizontal y textos con poco contraste.
# Requiere: pip install playwright ; npm i chart.js@4.4.1 @fontsource-variable/geist @fontsource-variable/geist-mono (en esta carpeta o en $SIM_LIBS)
import asyncio, subprocess, sys, datetime, os
from playwright.async_api import async_playwright
AQUI=os.path.dirname(os.path.abspath(__file__))+'/'
REPO=os.environ.get('SIM_REPO',os.path.abspath(AQUI+'../..'))
LIB=os.environ.get('SIM_LIBS',AQUI+'node_modules/')
pref=sys.argv[1]; solo=sys.argv[2] if len(sys.argv)>2 else ''
PUERTO='8870'
srv=subprocess.Popen([sys.executable,'-m','http.server',PUERTO,'-d',REPO],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def lee(p,m='r'):
    try: return open(p,m).read()
    except Exception: return b'' if 'b' in m else ''
COMPAT=lee(AQUI+'mocks/semilla_cong.js')+'\n'+lee(AQUI+'mocks/m_compat.js')
CH=lee(LIB+'chart.js/dist/chart.umd.js')
F={'geist.woff2':lee(LIB+'@fontsource-variable/geist/files/geist-latin-wght-normal.woff2','rb'),'mono.woff2':lee(LIB+'@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2','rb')}
CSS="@font-face{font-family:'Geist';font-weight:100 900;src:url(https://fonts.gstatic.com/geist.woff2) format('woff2')}@font-face{font-family:'Geist Mono';font-weight:100 900;src:url(https://fonts.gstatic.com/mono.woff2) format('woff2')}"
AUD=lee(AQUI+'contraste.js')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch()
    for nombre,w,h,sc in [('desk',1440,900,1),('movil',390,844,2)]:
      if solo and solo!=nombre: continue
      pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=sc)
      errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:160])); pg.on('console',lambda m: m.type=='error' and errs.append(m.text[:160]))
      pg.on('dialog',lambda d: asyncio.create_task(d.dismiss()))
      async def gst(r):
        k=r.request.url.split('/')[-1]; await r.fulfill(status=200,content_type='application/javascript',body=COMPAT if k=='firebase-app-compat.js' else '')
      await pg.route('**/www.gstatic.com/**',gst)
      await pg.route('**/fonts.googleapis.com/**',lambda r:r.fulfill(status=200,content_type='text/css',body=CSS if 'Geist' in r.request.url else ''))
      await pg.route('**/fonts.gstatic.com/**',lambda r:r.fulfill(status=200,content_type='font/woff2',headers={'access-control-allow-origin':'*'},body=F.get(r.request.url.split('/')[-1],b'')))
      await pg.route('**/cdnjs.cloudflare.com/**',lambda r:r.fulfill(status=200,content_type='application/javascript',body=CH if 'hart' in r.request.url else ''))
      await pg.clock.install(time=datetime.datetime(2026,11,16,21,0))
      await pg.goto(f'http://localhost:{PUERTO}/apps/cong/'); await pg.wait_for_timeout(3500)
      if not await pg.evaluate("!!(document.getElementById('cong-tabs')&&document.getElementById('cong-tabs').offsetParent)"):
        print(f'[{nombre}] EL APLICATIVO NO ABRIÓ (sin acceso o error):', errs[:3]); await pg.screenshot(path=f'{pref}_fallo_{nombre}.png'); await pg.close(); continue
      async def paso(n,full=False):
        f=f'{pref}_{n}_{nombre}.png'
        try: await pg.screenshot(path=f,full_page=full,timeout=60000,animations='disabled')
        except Exception as e: print('captura falló',f)
        bajos=await pg.evaluate(AUD) if AUD else []
        print(f'[{nombre}] {n}: scrollW {await pg.evaluate("document.documentElement.scrollWidth")}/{w} · errores {errs[:3]} · bajo contraste {len(bajos)}')
        for x in bajos[:10]: print('    ',x)
        errs.clear()
      for t in ['bachadas','registros','eventos','dashboard','sala','config']:
        await pg.evaluate(f"showTab('cong','{t}')"); await pg.wait_for_timeout(1800); await paso(t, full=(t in ('dashboard','bachadas') and nombre=='desk'))
        if t=='bachadas':
          await pg.evaluate("openBachadaModal(null)"); await pg.wait_for_timeout(700); await paso('modal_bachada')
          await pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'))")
        if t=='eventos':
          await pg.evaluate("openEventoModal(null)"); await pg.wait_for_timeout(700); await paso('modal_evento')
          await pg.evaluate("document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'))")
        if t=='dashboard':
          await pg.evaluate("goToPage(2)"); await pg.wait_for_timeout(1800); await paso('dash_mant', full=(nombre=='desk'))
          await pg.evaluate("goToPage(3)"); await pg.wait_for_timeout(1800); await paso('dash_timeline', full=(nombre=='desk'))
          await pg.evaluate("goToPage(1)"); await pg.wait_for_timeout(600)
          await pg.evaluate("abrirInformeTiempos()"); await pg.wait_for_timeout(1500); await paso('informe')
          await pg.evaluate("(function(){var b=[...document.querySelectorAll('button')].find(x=>/cerrar|✕|×/i.test(x.textContent)&&x.offsetParent&&/inf/i.test(x.className+x.getAttribute('onclick')));if(b)b.click();})()")
          await pg.evaluate("typeof cerrarInformeTiempos==='function'&&cerrarInformeTiempos()")
        if t=='sala':
          try: await pg.keyboard.press('Escape'); await pg.evaluate("typeof cerrarSala==='function'&&cerrarSala()")
          except Exception: pass
      if nombre=='movil':
        await pg.evaluate("showTab('cong','bachadas');toggleSidebar()"); await pg.wait_for_timeout(700); await paso('menu')
      await pg.close()
    await b.close()
  srv.terminate()
asyncio.run(main())
