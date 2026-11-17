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

## Pendiente (en este orden)
1. **Costos de mantenimiento** (`apps/cost/index.html`, CSS propio, menú lateral navy propio). Alinear: menú lateral
   oscuro como el común, Geist, tarjetas, botones. No usa `tema-panel.css` (su estructura es distinta: `#nav`, no `#hd/#tabs`).
2. **Congelamiento** (`apps/cong/index.html`, 8600 líneas, Firebase "compat"). Es el único en producción: cambios mínimos
   (tipografía y colores de cabecera) y probar con mucho cuidado. Los mocks actuales NO sirven para el SDK compat.
3. `apps/_plantilla/index.html`: enlazar `tema-claro.css` para que los aplicativos nuevos nazcan con el tema.
4. Limpieza opcional: fusionar `tema-claro.css` dentro de `sim.css` cuando ya nadie use el tema oscuro.
5. Revisión fina con datos reales de la planta (lo probado es con datos de ejemplo).

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
