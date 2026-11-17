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
| Tema oscuro de Congelamiento | `apps/cong/tema.css` | Paleta oscura de la portada sobre las variables propias de Congelamiento |
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

## Congelamiento (EN CURSO — por fases, poco a poco)
Pedido de Elvis (16-nov): **mantenerlo oscuro**, pero con el mismo tema de la portada, avanzando de a pocos y analizando
bien antes de cada cambio (un intento anterior suyo terminó con muchos errores). Es el único aplicativo en producción.

**Cómo está hecho** (`apps/cong/index.html`, 8600 líneas, Firebase "compat"):
- Estilos propios en las líneas 8–1109, casi todo con variables: `--bg --surface --surface2 --border --border2 --text --text2 --text3`
  (base) y `--accent --success --warn --danger` (estado).
- **Los colores de estado no se cambian**: celeste `#00c8ff` = congelando, verde `#00e87a`, naranja `#ff9500`, rojo `#ff3b5c`,
  amarillo `#facc15`, morado `#a855f7`. Están repetidos como texto dentro del JavaScript (gráficas Chart.js, `COLOR_EV`,
  estilos en línea): si se cambia la variable y no el texto, la interfaz y las gráficas dejan de coincidir.
- El "Informe de tiempos" (`abrirInformeTiempos`) usa a propósito una paleta clara para exponer: no se toca.
- La pantalla de ingreso propia (`#auth-screen`) ya no se usa (se entra por el portal).

**Enfoque:** `apps/cong/tema.css`, enlazado **después** del `<style>`. Solo redefine variables de base y el acabado. Si el
archivo no cargara, el aplicativo sigue funcionando con su aspecto anterior.

- [x] **Fase 1 — base** (subida): fondos/bordes/textos con la paleta de la portada, tipografía Geist / Geist Mono (se
      reemplazaron los nombres `'Syne'`, `'DM Sans'`, `'DM Mono'` en el archivo), menú lateral como el de la portada con el
      logo en negativo, barra superior translúcida, `color-scheme:dark` (ahora se ven los íconos de calendario y reloj),
      textos secundarios con mejor contraste, correo largo ya no se sale de su caja, Pantalla de Sala ya no se desborda en celular.
- [ ] **Fase 2 — gráficas**: dentro del JavaScript quedan colores de base del tema anterior (azul marino): `#1e3352` (×22,
      rejillas y bordes), `#8aaac8` (×42, textos de ejes), `#e8f4ff`, `#4a6a8a`, `#0d1c2e`, `#2a4a6e`. Pasarlos a
      `#1B2730`, `#A7B4BF`, `#EEF3F6`, `#7C8A96`, `#0C1216`, `#2B3B46`. Ojo con las formas con transparencia pegada
      (`#1e335288`): conservar el sufijo. No tocar los colores de estado.
- [ ] **Fase 3 — detalle** (con Elvis mirando en la planta): tarjetas, tablas, formularios, Pantalla de Sala en el televisor.
      Decidir si el celeste de acento se queda o se acerca al turquesa de la marca (implica cambiar también el JavaScript).

**Cómo probar:** `python3 herramientas/tema/cong.py <prefijo> [desk|movil]` — abre Congelamiento con Firebase simulado
(`mocks/m_compat.js`) y 157 documentos de ejemplo (`mocks/semilla_cong.js`), recorre las 6 pestañas, los 2 formularios, las
3 páginas del dashboard, el informe y el menú en celular; por cada paso da captura, errores, desborde y contraste.
Resultado esperado hoy: 0 errores, 0 desbordes; quedan solo 2 avisos de contraste que ya existían y no son del tema
(textos grises del informe claro y la cifra blanca sobre barra verde en Sala).

## Pendiente (en este orden)
1. **Congelamiento**: seguir con la fase 2 y luego la 3 (ver arriba).
2. **Costos con datos reales**: revisar los 11 módulos con las órdenes cargadas y el PDF (se genera con html2canvas:
   no usar funciones de color modernas como `color-mix` dentro del contenido).
3. Revisión fina de todos los aplicativos con datos reales de la planta (lo probado es con datos de ejemplo).
   En Plan quedaron dos ajustes de contraste sin volver a probar: texto de `.rs-pill` y barra vencida `#D64545`.
4. Limpieza opcional: fusionar `tema-claro.css` dentro de `sim.css` cuando ya nadie use el tema oscuro.

## Cómo migrar y probar un aplicativo
Herramientas en `herramientas/tema/` (no afectan al SIM publicado):
- `migrar.py archivo…` — pasa los colores fijos de fondo oscuro a su versión clara y enlaza `tema-claro.css`.
- `ver.py <ruta> <prefijo> [--seed mocks/seed_x.txt] [--mods a,b] [--js …] [--pasos "js1;;js2"] [--vp] [--txt]` —
  abre el aplicativo con Firebase simulado, toma capturas y **lista los textos con poco contraste**.
- `fmt.py` — recorrido completo de Registro de formatos (plantillas → emitir → llenar → registros).
- `cong.py <prefijo> [desk|movil]` — recorrido completo de Congelamiento (Firebase "compat" simulado).
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
- En los datos de prueba tampoco van correos reales: el usuario de prueba entra por su perfil (`usuarios/u1`), no por un correo.
- **Antes de `git add -A`, mirar `git status`**: una vez se subieron archivos sin revisarlos (eran cambios propios de un tramo anterior, pero se verificaron después de publicados).
