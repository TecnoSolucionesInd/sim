# Uso: python3 ver.py <ruta-app> <prefijo> [--seed archivo] [--mods a,b,c] [--js "código"] [--solo desk|movil]
import asyncio, subprocess, sys, json, argparse, os
from playwright.async_api import async_playwright
ap=argparse.ArgumentParser(); ap.add_argument('ruta'); ap.add_argument('pref'); ap.add_argument('--seed',default=''); ap.add_argument('--mods',default=''); ap.add_argument('--js',default=''); ap.add_argument('--pasos',default=''); ap.add_argument('--solo',default=''); ap.add_argument('--espera',type=int,default=2200); ap.add_argument('--alto',type=int,default=900); ap.add_argument('--vp',action='store_true'); ap.add_argument('--puerto',default='8850'); ap.add_argument('--txt',action='store_true')
A=ap.parse_args()
AQUI=os.path.dirname(os.path.abspath(__file__))+'/'
REPO=os.path.abspath(AQUI+'../..')
LIB=os.environ.get('SIM_LIBS',AQUI+'node_modules/')   # npm i three@0.128.0 chart.js@4.4.1 jspdf@2.5.1 @fontsource-variable/geist @fontsource-variable/geist-mono
def lee(p,modo='r'):
    try: return open(p,modo).read()
    except Exception: return b'' if 'b' in modo else ''
srv=subprocess.Popen([sys.executable,'-m','http.server',A.puerto,'-d',REPO],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
seed=open(A.seed).read() if A.seed else ''
M={'firebase-app.js':lee(AQUI+'mocks/m_app.js')+"\nexport async function deleteApp(){}",'firebase-auth.js':lee(AQUI+'mocks/m_auth.js')+"\nexport async function createUserWithEmailAndPassword(){return{user:{uid:'x'}}}\nexport async function sendPasswordResetEmail(){}\nexport async function sendEmailVerification(){}\nexport const browserSessionPersistence={};\nexport async function signInWithEmailAndPassword(){}",'firebase-firestore.js':lee(AQUI+'mocks/m_fs.js').replace('/*SEED*/',seed),'firebase-storage.js':'export function getStorage(){return{}}\nexport function ref(){return{}}\nexport async function uploadBytes(){}\nexport async function getDownloadURL(){return ""}\nexport async function deleteObject(){}\nexport async function getBlob(){return new Blob()}\nexport async function listAll(){return {items:[],prefixes:[]}}\nexport async function getMetadata(){return {size:0}}'}
F={'geist.woff2':lee(LIB+'@fontsource-variable/geist/files/geist-latin-wght-normal.woff2','rb'),'mono.woff2':lee(LIB+'@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2','rb')}
CSS="@font-face{font-family:'Geist';font-weight:100 900;src:url(https://fonts.gstatic.com/geist.woff2) format('woff2')}@font-face{font-family:'Geist Mono';font-weight:100 900;src:url(https://fonts.gstatic.com/mono.woff2) format('woff2')}"
LIBS={'three':LIB+'three/build/three.min.js','jspdf':LIB+'jspdf/dist/jspdf.umd.min.js','chart':LIB+'chart.js/dist/chart.umd.js'}
AUD=lee(AQUI+'contraste.js')
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for nombre,w,h,sc in [('desk',1440,A.alto,1),('movil',390,844,2)]:
      if A.solo and A.solo!=nombre: continue
      pg=await b.new_page(viewport={'width':w,'height':h},device_scale_factor=sc)
      pg.on('dialog',lambda d: asyncio.create_task(d.accept()))
      errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200])); pg.on('console',lambda m: m.type=='error' and errs.append(m.text[:200]))
      async def gst(r):
        k=r.request.url.split('/')[-1]; await r.fulfill(status=200,content_type='application/javascript',body=M.get(k,''))
      async def cdn(r):
        u=r.request.url.lower(); f=next((v for k,v in LIBS.items() if k in u),None)
        await r.fulfill(status=200,content_type='application/javascript',body=lee(f) if f else '')
      await pg.route('**/www.gstatic.com/**',gst); await pg.route('**/fonts.googleapis.com/**',lambda r:r.fulfill(status=200,content_type='text/css',body=CSS))
      await pg.route('**/fonts.gstatic.com/**',lambda r:r.fulfill(status=200,content_type='font/woff2',headers={'access-control-allow-origin':'*'},body=F.get(r.request.url.split('/')[-1],b'')))
      await pg.route('**/cdnjs.cloudflare.com/**',cdn); await pg.route('**/cdn.jsdelivr.net/**',cdn)
      mods=A.mods.split(',') if A.mods else ['']
      for m in mods:
        await pg.goto('http://localhost:'+A.puerto+'/'+A.ruta+('#'+m if m else '')); await pg.reload(); await pg.wait_for_timeout(A.espera)
        if A.js:
          try: await pg.evaluate(A.js); await pg.wait_for_timeout(900)
          except Exception as e: print('JS falló',str(e)[:150])
        pasos=[x for x in A.pasos.split(';;') if x.strip()] or ['']
        for ip,paso in enumerate(pasos):
          if paso:
            try: await pg.evaluate(paso); await pg.wait_for_timeout(1200)
            except Exception as e: print('paso falló',str(e)[:150])
          f=f'{A.pref}_{m or "ini"}{("_p"+str(ip)) if A.pasos else ""}_{nombre}.png'
          try: await pg.screenshot(path=f,full_page=(nombre=='desk' and not A.vp),timeout=90000,animations='disabled')
          except Exception as e: print('captura falló',f)
          bajos=await pg.evaluate(AUD)
          print(f'[{nombre}] {m or "inicio"} paso {ip}: scrollW {await pg.evaluate("document.documentElement.scrollWidth")}/{w} · errores {errs[:3]} · bajo contraste {len(bajos)}')
          for x in bajos[:14]: print('    ',x)
          if A.txt: print('    TXT:',(await pg.evaluate("(document.querySelector('#simMain')||document.body).innerText.replace(/\\s+/g,' ').slice(0,260)")))
        errs.clear()
      await pg.close()
    await b.close()
  srv.terminate()
asyncio.run(main())
