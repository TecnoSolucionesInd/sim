# Rediseño claro de los aplicativos — archivo de continuación

**Si se retoma el trabajo: leer este archivo primero y seguir desde "Pendiente". No empezar de cero.**

## Qué se pidió
Llevar a todos los aplicativos internos del SIM el estilo moderno de la portada, pero con **colores claros**:
menú lateral oscuro como la portada, contenido claro, acento turquesa, tipografía Geist. Analizar y migrar
**aplicativo por aplicativo**, probando cada uno antes de subir. No tocar lógica, rutas ni permisos.

## Cómo está armado
| Pieza | Archivo | Para qué |
|---|---|---|
| Menú lateral y barra de los aplicativos | `core/core.js` (constante `CSS`) | Oscuro, con el logo; igual en todos los aplicativos de layout "completo" |
| Tema claro del contenido | `core/tema-claro.css` | Se enlaza **después** de `core/sim.css` (Administración, Equipos, Plan, Informes, Formatos) |
| Acabado de los paneles | `core/tema-panel.css` | Se enlaza **después** del `<style>` propio (Agua de planta, Materiales) |
| Acabado de Costos | `apps/cost/tema.css` | Igual idea, para la estructura propia de Costos (`#side`, `#top`, `nav`) |
| Marca | `core/marca/` | `logo-negativo.png` (fondos oscuros), `isotipo.png` (ícono), `escena.js` (fondo 3D del inicio de sesión) |
| Portada e inicio de sesión | `index.html` | Tema oscuro propio; no usa `sim.css` |

Colores de estado compartidos ya pasados a claro: `core/catalogo.js` (ESTADOS), `core/maestros.js`, `core/informes.js`.

## Hecho (subido y probado con datos de ejemplo, en computadora y celular)
- [x] Portada e inicio de sesión
- [x] Menú lateral común (`core/core.js`)
- [x] Administración — usuarios, permisos, aplicativos, ventana de edición
- [x] Equipos — base, tipos, ubicaciones, carga masiva, ficha
- [x] Plan de mantenimiento — programas (resumen, línea de tiempo, actividades, evidencias, costos) y plan preventivo (con 205 tareas)
- [x] Informes técnicos — lista, ficha, nuevo informe, destinatarios, almacenamiento
- [x] Registro de formatos — plantillas, editor, emisión, llenado en celular, registros, lista maestra, configuración
- [x] Agua de planta — HMI, análisis, parámetros (también la vista pública)
- [x] Materiales e inventario — análisis, movimientos, catálogo
- [x] Costos de mantenimiento — menú lateral oscuro con logo, Geist, tarjetas y controles (`apps/cost/tema.css`).
      **Probado solo con datos vacíos** (abre sin errores y se ve bien); falta verlo con las órdenes reales y probar "Exportar PDF".
- [x] Páginas auxiliares: `apps/cost/cargar.html`, `apps/cong/migrar.html` y `apps/_plantilla/` enlazadas a `tema-claro.css`

## Pendiente (en este orden)
1. **Congelamiento** (`apps/cong/index.html`, 8600 líneas, Firebase "compat"). Es el único en producción y el que usan los
   operadores todo el día: cambios mínimos (tipografía, cabecera, botones) y probar con mucho cuidado antes de subir.
   `ver.py` trae un Firebase "compat" simulado mínimo (sirvió para Costos); para Congelamiento habrá que ampliarlo.
2. **Costos con datos reales**: revisar los 11 módulos con las órdenes cargadas y el PDF (se genera con html2canvas:
   no usar funciones de color modernas como `color-mix` dentro del contenido).
3. Revisión fina de todos los aplicativos con datos reales de la planta (lo probado es con datos de ejemplo).
4. Limpieza opcional: fusionar `tema-claro.css` dentro de `sim.css` cuando ya nadie use el tema oscuro.

## Cómo migrar y probar un aplicativo
Herramientas en `herramientas/tema/` (no afectan al SIM publicado):
- `migrar.py archivo…` — pasa los colores fijos de fondo oscuro a su versión clara y enlaza `tema-claro.css`.
- `ver.py <ruta> <prefijo> [--seed mocks/seed_x.txt] [--mods a,b] [--js …] [--pasos "js1;;js2"] [--vp] [--txt]` —
  abre el aplicativo con Firebase simulado, toma capturas y **lista los textos con poco contraste**.
- `fmt.py` — recorrido completo de Registro de formatos (plantillas → emitir → llenar → registros).
- Librerías para las pruebas: `cd herramientas/tema && npm i three@0.128.0 chart.js@4.4.1 jspdf@2.5.1 @fontsource-variable/geist @fontsource-variable/geist-mono`

Ejemplo: `python3 herramientas/tema/ver.py apps/eq/ eq --seed herramientas/tema/mocks/seed_eq.txt --mods equipos,tipos`

## Reglas aprendidas (no repetir errores)
- **No reemplazar hex de 3 dígitos a ciegas**: `#cDe`, `#aFe`, `#cFe` eran *ids de elementos* (`$('#cDe')`), no colores.
- `#fff` hay que revisarlo caso por caso: sobre botones de color se queda; como texto "al pasar el cursor" pasa a `var(--tx)`.
- Fondos oscuros fijos de cabeceras de tabla (`#3E4C5D`, `#3a4755`) → `#F6F8FA`.
- Los colores pastel del catálogo (íconos) no se leen sobre blanco: en el menú lateral oscuro sí; sobre blanco, oscurecerlos.
- La captura de página completa muestra el menú lateral "lavado": es un defecto de la captura, no del aplicativo (verificar con `--vp`).
- El aviso de contraste sobre una etiqueta colocada *encima* de una barra (`top:-16px`) es un falso positivo.
- No dejar nombres reales de personas en los datos de prueba: el repositorio es público.
- **Antes de `git add -A`, mirar `git status`**: una vez se subieron archivos sin revisarlos (eran cambios propios de un tramo anterior, pero se verificaron después de publicados).
