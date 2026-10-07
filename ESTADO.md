# ESTADO DEL PROYECTO — SIM (Sistema Integrado de Mantenimiento)

Documento de continuidad. Cualquier sesión de trabajo nueva parte de aquí.

## Concepto
Portal único que reúne, uno a uno, los aplicativos del Departamento de Mantenimiento.
- Un solo login (Firebase Auth) con permisos por aplicativo y por módulo.
- Cada aplicativo se construye y prueba por separado y se "enchufa" al portal cuando está listo.
- Los aplicativos heredados (Congelamiento) conservan su diseño original; los nuevos usan `core/sim.css`.

## Infraestructura
| Elemento | Valor |
|---|---|
| Repositorio | github.com/TecnoSolucionesInd/sim |
| Sitio | https://tecnosolucionesind.github.io/sim/ |
| Firebase (pruebas) | proyecto `sim-pruebas-bcf39` — cuenta Soluciones Industriales |
| Firebase (producción) | pendiente: crear `sim-produccion` cuando haya un aplicativo listo para el personal |
| Administrador | emiranda@santamonicafishing.com (correo verificado = admin total) |

Para cambiar de entorno solo se edita `core/config.js`.

## Estructura
```
index.html              Portal: login, primer acceso del admin, recuperación de clave, pantalla de aplicativos
core/config.js          firebaseConfig, correo del administrador
core/firebase.js        inicialización (auth, db)
core/catalogo.js        catálogo de aplicativos, roles, estados, grupos  ← aquí se registra cada app nueva
core/sesion.js          perfil del usuario y cálculo de permisos
core/core.js            iniciarApp(): guardia de sesión/permisos + cabecera y menú de módulos
core/sim.css            estilos comunes (tema gris azulado medio, Sora / IBM Plex Sans / JetBrains Mono)
core/maestros.js        catálogos compartidos: sistemas de planta, estados de equipo, criticidad
core/equipos.js         lectura de la base de equipos (datos/eq/equipos) para cualquier aplicativo
admin/                  Aplicativo Administración: Usuarios, Permisos, Aplicativos
apps/cong/              Congelamiento integrado (generado por tools/integrar_congelamiento.py)
apps/cong/migrar.html   Copia de datos desde el Firebase actual (solo lectura del original)
apps/cost/              Costos integrado (generado por tools/integrar_costos.py) — sin datos en el código
apps/cost/cargar.html   Carga de órdenes Nisira al SIM desde el HTML generado
apps/eq/                Equipos: base maestra, carga masiva Excel, importación desde Costos
apps/fmt/               Registro de formatos: index.html (plantillas, lista maestra, configuración), llenado.js (Llenar), registros.js (Registros),
                        modelo.js (catálogos y pilotos), logica.js (turnos, periodos, validación), hoja.js (formato impreso), datos.js (Firestore), ui.js
tools/                  Scripts de integración
apps/_plantilla/        Plantilla para crear un aplicativo nuevo
firestore.rules         Reglas de seguridad (se pegan en la consola de Firebase)
```

## Modelo de datos (Firestore)
- `usuarios/{uid}` → `{ email, nombre, area, activo, apps: { <appId>: { rol, modulos: [] } } }`
  - `rol`: admin | supervisor | operador | lectura
  - `modulos: []` vacío = todos los módulos del aplicativo
- `datos/{appId}/...` → datos de cada aplicativo. Lectura: cualquier rol. Escritura: admin/supervisor/operador.
- `config/{doc}` → configuración general (solo admin escribe).

## Cómo integrar un aplicativo
1. Copiar `apps/_plantilla/` a `apps/<id>/`.
2. En `core/catalogo.js`: poner `url: 'apps/<id>/'` y su lista de módulos.
3. Guardar sus datos bajo `datos/<id>/...`.
4. Aplicativo heredado con diseño propio: `iniciarApp({ appId, layout: 'minimo' })` (solo guardia + botón "Portal").

## Fases
| Fase | Aplicativo | Estado |
|---|---|---|
| F0 | Portal + Administración | Construido (pruebas) |
| F1 | Congelamiento (conserva su diseño) | Integrado en pruebas · pendiente copia de datos y cambio de enlace |
| F2 | Costos de mantenimiento (conserva su diseño) | Integrado en pruebas · pendiente cargar datos y respaldo |
| F3 | Equipos (maestro) | Construido (pruebas) |
| F4 | Registro de parámetros (Ósmosis, Salas de máquinas, Calderos) | Planificado |
| F5 | Materiales e inventario (maestro) | Planificado |
| F6 | Conformidades · Reporte de mantenimiento | Planificado |
| F7 | Plan de mantenimiento y OT (desde cero) | Planificado |
| F8 | Registro de formatos | Plantillas, llenado en celular, registros y revisión en pruebas · pendiente: indicadores |

## Congelamiento (F1)
- Origen: proyecto Firebase `sist-integrado-mantenimiento` (colecciones `sim_*`), aplicativo en uso en la cuenta anterior.
- En el SIM sus datos viven en `datos/cong/{bachadas, eventos, tecnicos, productos, config}` con los mismos IDs.
- El login propio (usuarios con clave en Firestore) se reemplazó por la sesión del portal. Los usuarios se crean en Administración.
- Rol del portal → rol del aplicativo: admin→admin, supervisor→supervisor, operador→operador, lectura→consulta (sin edición).
- Módulos → pestañas: proceso→En Proceso, registros, eventos, dashboard, pantalla→Pantalla Sala, config→Configuración.
- Si se modifica el aplicativo original: `python3 tools/integrar_congelamiento.py <congelamiento.html>` regenera `apps/cong/index.html`.
  Desde ahora conviene editar directamente `apps/cong/index.html`.
- Cambio definitivo (día acordado): ejecutar la copia de datos una última vez, pasar al personal al enlace del SIM
  y dejar el sistema anterior solo como respaldo unas semanas.

## Costos de mantenimiento (F2)
- Repositorio público: las órdenes (DATA) NO van en el código. Se guardan en `datos/cost/fuente/{meta, p0..pN}` (JSON por partes de ~700 KB).
- Estado del aplicativo (asignaciones, dictámenes CAPEX, catálogo editado, producción, meta) en `datos/cost/estado/principal` (campo `json`).
  Se guarda en el navegador y, 1,2 s después del último cambio, en Firebase. Último en guardar prevalece (no hay edición simultánea por campo).
- Al actualizar datos de Nisira: generar el HTML de Costos como siempre y subirlo en `apps/cost/cargar.html`. Las asignaciones se conservan (van por índice `i` de la orden).
- Cambios en la lógica/diseño: `python3 tools/integrar_costos.py <Costos_Mantenimiento_App.html>` regenera `apps/cost/index.html`.
- Respaldo / Cargar respaldo / Restablecer: visibles solo para rol Admin. Rol Lectura = modo consulta (no guarda).

## Equipos (F3)
- Base maestra única del SIM en `datos/eq/equipos/{id}`: codigo (único), descripcion, sistema (id de `core/maestros.js`), ubicacion, tipo,
  marca, modelo, serie, potencia, criticidad (A/B/C), estado (operativo | fuera | baja), notas, origenCosto.
- La leen todos los usuarios activos (la usan los formatos); la escriben los roles con escritura en Equipos.
- Carga: uno por uno, Excel (plantilla descargable; actualiza por código) o importación del catálogo de Costos (código provisional por sistema: REF-001, CAL-001…).
- La ficha muestra los formatos vigentes que incluyen al equipo y sus últimos registros.

## Registro de formatos (F8)
- Formatos diseñados desde cero para auditoría. Encabezado de control: CÓDIGO, VERSIÓN, REVISIÓN, FECHA.
- Código: `<prefijo>/R-XXX` (prefijo `IPSMSA/MMTO`), numerado por sistema: R-001–099 General, R-101 Refrigeración,
  R-201 Calderos, R-301 Ósmosis, R-401 Planta de hielo, R-501 Congelado, R-601 Eléctrico, R-701 Infraestructura.
- Versión: heredada del manual (parámetro único en Configuración, hoy 6.0). Revisión: propia de cada formato, inicia en 1.0
  y sube 1.0 por cada cambio emitido. Fecha: mes-año de vigencia (`Oct-26`, meses: Ene…Set…Dic).
- Al cambiar la versión del manual, todos los vigentes pasan a la nueva versión con Revisión 1.0 y fecha del mes.
- Estados: borrador → vigente (emitido) → obsoleto (reactivable con nueva revisión). Los cambios sobre un vigente quedan en
  `trabajo` hasta emitir; el formato en uso sigue siendo `def`.
- Datos: `datos/fmt/config/general`, `datos/fmt/plantillas/{id}` (codigo, sistema, estado, def, trabajo, versionManual,
  prefijo, revision, fecha, historial) y `datos/fmt/plantillas/{id}/revisiones/v<ver>-r<rev>` (copia congelada de cada emisión).
- Secciones: campos (2 o 3 columnas), tabla de parámetros (equipos × parámetros con rango), checklist (C/NC/N.A.), lista repetible.
  Tipos de campo: texto, texto largo, número con rango, selección, sí/no, conforme, fecha, hora, fecha y hora, duración calculada, equipo, foto.
- Pilotos cargados como borradores: R-001 Reporte de mantenimiento correctivo, R-002 Liberación de equipo post-mantenimiento,
  R-101 Registro de parámetros de sala de máquinas (rangos y nombres de compresores por definir antes de emitir).
- Impresión: hoja A4 desde un iframe aislado (vertical u horizontal según el formato). Lista maestra en PDF y Excel.
- Permisos: plantillas y configuración solo las modifica el rol Admin del aplicativo (regla en `firestore.rules`).
- Tablas de parámetros: columnas desde la base de equipos (filtro sistema / tipo / ubicación; ubicación "se elige al llenar")
  o lista fija. Opción de estado por equipo (operando, parado, en mantenimiento, fuera de servicio): solo se exigen lecturas a los que operan.
- Firmas con modo: usuario que envía (firma electrónica), firma en pantalla (nombre + trazo) y supervisor al aprobar.
- Campo Sí/No con "genera": al responder Sí se crea un pendiente de otro formato (R-001 → R-002) con el equipo y la referencia.
- Llenar (celular): pendientes por turno/periodo (fecha operativa según hora de inicio de turnos), pendientes generados,
  observados del usuario, borradores en el dispositivo (localStorage) y cola de envío sin señal (se reintenta al volver la conexión).
- Registros: `datos/fmt/registros/{id}` (valores en `v`, firmas, alertas, equipos, dur, historial), fotos comprimidas en
  `registros/{id}/fotos/{campoId}` (Firestore, sin Storage), número `R-XXX-aaaa-00001` por transacción en `contadores/{codigo}-{año}`,
  pendientes en `pendientes/{id}`. Estados: enviado → aprobado | observado → (corregido) enviado. Aprobado no se modifica.
- Impresión del registro lleno: hoja oficial con valores, fotos, firmas y QR al original (`apps/fmt/?r=<id>#registros`), ajustada a una página A4.
- Siguiente: indicadores (cumplimiento de formatos, horas de parada, MTTR por equipo, tendencias de parámetros).

## Pasos de configuración pendientes en la consola
1. Firestore → Reglas: pegar `firestore.rules` y Publicar.
2. Authentication → Configuración → Dominios autorizados: agregar `tecnosolucionesind.github.io`.
3. Primer ingreso: en el portal, "Crear clave" con el correo del administrador → verificar el correo → ingresar.

## Bitácora
- 2026-10-02 — Repositorio creado. Portal, núcleo, Administración, plantilla y reglas (F0).
- 2026-10-02 — F0 configurado en consola y probado por el administrador. Congelamiento integrado + herramienta de copia de datos (F1).
- 2026-10-02 — Copia de datos de Congelamiento completada por el administrador. Costos integrado sin datos en el código + herramienta de carga (F2).
- 2026-10-06 — Registro de formatos (F8): constructor de plantillas con revisiones, lista maestra y configuración. Reglas actualizadas (volver a publicar `firestore.rules`).
- 2026-10-07 — Equipos (F3): base maestra con carga Excel e importación desde Costos. Registro de formatos: llenado en celular, registros, revisión, impresión con QR. Reglas actualizadas (volver a publicar `firestore.rules`).
