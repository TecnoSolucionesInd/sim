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
apps/plan/              Plan de mantenimiento: index.html (estilos y arranque), preventivo.js (Plan preventivo), programas.js (Programas de trabajo), datos.js (Firestore),
                        pdf.js (informes de evidencias A4 horizontal), semilla.js (Parada de Planta de Hielo 2026), logo.png
apps/fmt/               Registro de formatos: index.html (plantillas, lista maestra, configuración), llenado.js (Llenar), registros.js (Registros),
                        modelo.js (catálogos y pilotos), logica.js (turnos, periodos, validación), hoja.js (formato impreso), datos.js (Firestore), ui.js
tools/                  Scripts de integración
apps/_plantilla/        Plantilla para crear un aplicativo nuevo
firestore.rules         Reglas de seguridad de Firestore (se pegan en la consola de Firebase)
storage.rules           Reglas de Cloud Storage (preparadas para cuando se active Blaze; hoy sin uso)
core/archivos.js        archivos guardados en Firestore por partes de 900 KB (guardar, leer, borrar, descargar)
core/informes.js        límites de almacenamiento, estados/tipos de informe y consulta de informes vinculados
apps/inf/               Informes técnicos: registro, estados, versiones, relaciones y almacenamiento
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
| F5 | Materiales e inventario (maestro) | Químicos e insumos de ósmosis en pruebas (Análisis, kardex, catálogo) · pendiente: almacén general |
| F6 | Conformidades · Reporte de mantenimiento | Planificado |
| F7 | Plan de mantenimiento y OT (desde cero) | Programas de trabajo (paradas, auditorías, proyectos) con costos en pruebas · pendiente: plan preventivo, programación quincenal, OT |
| F9 | Informes técnicos | Construido (pruebas) · archivos en Firestore por partes (sin Blaze) |
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
- Código automático `<SISTEMA>-<SIGLA TIPO>-<N°>` (REF-CMP-01): prefijo = `corto` del sistema (core/maestros.js), sigla del catálogo
  `datos/eq/config/tipos.lista` [{nombre, sigla}] (módulo Tipos de equipo; semilla TIPOS_BASE en apps/eq), correlativo por prefijo
  en `datos/eq/config/contadores` {"REF-CMP": n} con transacción. El código es fijo (no cambia si cambia sistema/tipo) y los números
  de equipos eliminados no se reutilizan. Tipo nuevo → pide sigla (sugerida) y se agrega al catálogo. Sigla usada en códigos = bloqueada.
- Códigos manuales/provisionales anteriores: "Asignar código automático" (ficha, admin) o "Códigos fuera de formato" (Carga masiva);
  el anterior queda en `codigoAnterior`. Registros de formatos e informes ya vinculados conservan el código anterior.
- Carga: uno por uno ("Registrar y agregar otro" conserva sistema, tipo y ubicación), Excel (Código vacío = nuevo con código automático;
  con código existente = actualiza) o importación de Costos (tipo reconocido por la descripción).
- Datos de placa del motor (campos planos): mTension, mCorriente, mRpm, mFs, mCarcasa, mRodLA, mRodLOA. Sección plegable en la ficha,
  abierta si el tipo es motor/bomba/ventilador/compresor/agitador/faja o si ya tiene datos. También en la plantilla y exportación Excel.
- Ubicaciones: lista controlada en `datos/eq/config/ubicaciones.lista` [nombre] (módulo Ubicaciones). La ficha usa un desplegable con
  "+ Nueva ubicación…" y aviso de posible error de tipeo (distancia de edición). Renombrar actualiza los equipos; Unificar junta duplicados.
  Excel: ubicación igual (sin tildes/mayúsculas) → se toma la de la lista; muy parecida → error; distinta → se agrega. Primera vez: la
  lista parte de las ubicaciones ya usadas. Ojo: los filtros de plantillas de formatos guardan el texto de la ubicación.
- Sistema 8 "Servicios" (SRV, formatos R-801–899): agua de mar, agua dulce, aire comprimido, desagüe — lo que abastece a varias plantas.
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
- Visualización por área: aplicativo con `porArea: true` en el catálogo (hoy fmt). En Administración → usuario → Registro de formatos
  se marcan las áreas (sistemas) → `usuarios/{uid}.apps.fmt.sistemas: [ids]` (vacío = todas). `accesoApp` lo devuelve en
  `acceso.sistemas`; en fmt `APP.enArea(sistema)` filtra Llenar (vigentes, pendientes) y Registros (lista y filtro de formatos).
  Plantillas y Lista maestra no se filtran. Es un filtro de pantalla (las reglas de Firestore no lo restringen).
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
- Campos calculados: `diferencia` (A − B) y `porcentaje` (A ÷ B × 100) entre dos campos numéricos (desde/hasta), con unidad y rango;
  se muestran en vivo al llenar, generan alerta fuera de rango y se guardan en `dur` del registro (junto a las duraciones).
- Tablas de lista fija: una fila puede tener rangos por columna `rangos: { '<nombre de columna>': {min, max} }` (p. ej. solo Permeado).
  El editor los muestra pero no los edita (se definen en el formato predefinido).
- Emisión de formatos que ya existen en el manual: opción "conserva su revisión y vigencia" (revisión y mes indicados; `origenManual`).
- Formatos predefinidos (botón "Cargar formatos predefinidos"): R-001, R-002, R-101, R-302 (químicos e insumos de ósmosis, alimenta Materiales e inventario) y R-301 Control de operación — Planta de ósmosis
  inversa (rev. 3, Jun-26, por turno; módulo OSM-UOI-xx; filtros multimedia/cartucho con ΔP; alimentación; permeado con % recuperación;
  calidad de agua; permeado por housing 1–5). Rangos de referencia SWRO: ΔP ≤ 1 bar, alimentación ≤ 69 bar, permeado ≤ 3 bar,
  recuperación 35–45 %, conductividad permeado/housing ≤ 1000 µS/cm, pH permeado 6.5–8.5, pH alimentación 7–8.5, dureza permeado ≤ 50,
  temperatura alimentación ≤ 40 °C.
- Siguiente: indicadores (cumplimiento de formatos, horas de parada, MTTR por equipo, tendencias de parámetros).

## Plan de mantenimiento (F7)
- Módulos: `preventivo` Plan preventivo (construido) y `programas` Programas de trabajo (construido).
- Plan preventivo (PMP): `datos/plan/pmp/config` {inicio, capacidad, biblioteca, eventos, supuestos, cargado} y `datos/plan/pmp_tareas/{id}`
  (equipo + copia de la rutina: tarea, frec D|S|M|TRI|SEM|A, horas, resp {rol: HH}, cond, mat, reg; semanas: lunes ISO programados;
  porHoras, conjunto, proximo; ejec { '<semana>': {estado hecho|no|reprog, a: semana nueva, fecha, por, obs|motivo} }).
  Plan inicial en `apps/plan/pmp_semilla.js` (generado: 38 equipos, 59 rutinas en 11 tipos, 205 tareas, 52 semanas desde 2-nov-2026,
  nivelado por especialidad; compresores por horómetro desde el overhaul; transformadores en bloque en feb; anuales con parada en
  temporada baja). Se carga una vez con "Cargar plan inicial" (Admin/Supervisor) y corrige descripciones en Equipos (SFT 4/5, REF-MOT-05).
  Vistas: Semana (atrasadas + programadas por equipo; Ejecutado / Reprogramar / No ejecutado; OT semanal imprimible A4 horizontal por
  especialidad), Calendario en formato línea de tiempo (periodo Semana / Mes / Trimestre / Año con navegación y salto a fecha; actividad con texto completo; barras por frecuencia y estado; línea de hoy), Equipos, Rutinas, Carga HH vs capacidad. Cumplimiento = ejecutadas / ocurrencias de semanas cerradas.
  Operador registra ejecución; Admin/Supervisor reprograman, marcan no ejecutado y deshacen.
- Resumen (pestaña inicial, `apps/plan/resumen.js`, Chart.js): filtros periodo (acumulado, plan, trimestre, mes), sistema, especialidad
  y criticidad. Indicadores: cumplimiento (ejecutadas / vencidas, meta 90 %, estado En meta / Bajo meta / Crítico), avance del periodo,
  backlog (tareas, HH y semanas de capacidad), HH ejecutadas/programadas, % reprogramación, servicios de terceros. Gráficos: programado
  vs ejecutado (semana o mes), cumplimiento acumulado vs meta, estado por sistema y por especialidad, uso de capacidad y carga de las
  próximas 8 semanas, tareas por frecuencia. Alertas priorizadas (atrasos en criticidad A, bajo meta, no ejecutadas, sobrecarga semanal,
  terceros en 5 semanas, overhauls, horómetro), equipos con más atrasos y trabajos clave de las próximas 2 semanas.
  Colores: estados reservados con texto; especialidades con paleta categórica validada para fondo oscuro (orden fijo).
- Actividades propias (Admin/Supervisor): "Nueva actividad" o "Agregar actividad a este equipo" (cualquier equipo de la base, también
  los que aún no tienen plan): tarea, frecuencia (única vez, S, M, T, SE, A), primera fecha, responsables con HH, condición, registro,
  materiales; opción de partir de una rutina de la biblioteca. Se guardan con `origen: 'manual'` y código P-01, P-02… por equipo.
  Editar recalcula las semanas desde la fecha indicada (conserva lo ejecutado); eliminar solo si no tiene ejecuciones, si no "Dar de baja".
- Versiones del plan inicial: `PMP_VERSION` en la semilla vs `config.version`. Si hay una nueva, Admin/Supervisor ven "Aplicar actualización":
  actualiza las tareas de origen semilla (texto, responsables y semanas futuras), agrega nuevas y retira las que salen sin ejecuciones;
  no toca las manuales ni lo registrado. v2: trabajos de terceros (tornillo, transformadores, CIP y servicio anual de ósmosis) y
  capacidad de 3 frigoristas de mantenimiento (los 4 de proceso no se cuentan).
- Menú lateral (núcleo, todos los aplicativos): el botón ☰ oculta o muestra los módulos en pantalla grande y se recuerda (localStorage
  `sim_menu_oculto`); en celular sigue abriéndose sobre el contenido.
- Programa de trabajo = conjunto de actividades con fechas, avance y cierre. Tipos: Parada de planta, Mantenimiento programado, Auditoría,
  Proyecto de mejora, Otro. Todos usan el mismo formato: Resumen (KPI + curva S), Línea de tiempo, Actividades, Evidencias y Costos.
- Datos: `datos/plan/programas/{pid}` (nombre, tipo, planta, ref, desde, hasta, estado activa|cerrada, cierre, lineaBase {fecha, por}),
  `.../actividades/{aid}` (n, nom, fase, resp, ini, fin, ini_b, fin_b, av, obs), `.../evidencias/{eid}` (aid, etapa Antes|Durante|Después,
  fecha, desc, w, h, thumb 360 px, ord, por), `.../fotos/{eid}` (data: JPEG 1280 px; se lee solo al ampliar o generar el PDF) y
  `.../costos/{cid}` (aid, tipo, desc, prov, doc, fecha, monto en S/ sin IGV, estado presupuestado|comprometido|ejecutado).
- La primera versión guardaba en `datos/plan/paradas`; al abrir la lista, un Admin/Supervisor copia esos datos a `programas` (mismos IDs) y marca el original `migrado`.
- Estado de actividad calculado: Finalizado (100 %), Atrasado (fin vencido), En curso, Programado, Por definir (sin fecha).
- Línea base: "Fijar línea base" copia ini/fin a ini_b/fin_b. Si cambian las fechas, la actividad se marca "Reprog." y la curva S programada usa la línea base.
- Costos: cada partida va ligada a una actividad. Presupuestado (cotización) → Comprometido (OC/OS emitida) → Ejecutado (conforme/recibido).
  Pestaña visible para Admin, Supervisor y Lectura (no para Operador); solo Admin/Supervisor registran. El campo documento permite cruzar con Costos (Nisira).
- Permisos: Admin/Supervisor crean programas, editan todo, fijan línea base, registran costos y cierran; Operador actualiza avance, observación y evidencias;
  Lectura consulta. Programa cerrado = solo lectura. Las reglas usan la regla general de `datos/{app}`.
- Informes PDF (jsPDF): evidencias por actividad y completo (portada con KPI y tabla + fotos 6 por página).
- Siguiente: Plan preventivo (rutinas por equipo, calendario, cumplimiento), programación quincenal alimentada por preventivo y programas,
  vínculo de costos con OC/OS de Nisira y de actividades externas con Conformidades.

## Informes técnicos (F9)
- Un informe vive en un solo lugar (`datos/inf/informes/{id}`) y los demás aplicativos lo referencian: el Plan muestra
  "Informes (n)" en cada programa (campo `progId`) y la ficha de Equipos lista sus informes (campo `eqIds`).
- Código `IPSMSA/MMTO/INF-AA-NNN`, correlativo anual en `datos/inf/config/contador` (transacción). Se asigna al registrar.
- Campos: titulo, tipo (solicitud|falla|evaluacion|deslinde|otro), fecha, dirigido, proveedor, moneda, monto, resumen, estado,
  version, archivo, versiones[], historial[], aprobacion {fecha, por, medio, nota, evidencia}, eqIds/eqCods, progId/progNombre, docs[].
- Destinatarios (`datos/inf/config/contactos.lista`: id, nombre, cargo, correo, area, rolDef para|copia|""): "Dirigido a" se elige de esta lista.
- Pedido Nisira en el informe (`pedidoTipo` PSR|PED, `pedidoNum` con formato serie-número `0001-XXXXX`; si se escribe solo el número se antepone 0001-), editable en Relaciones aun después de aprobado; si no está, se toma de la aprobación
  o de un documento escrito como "PSR 0004521". Otros documentos (OC, OS, cotización) en `docs[]`: se agregan con Enter, botón Agregar o al salir del campo.
- Aprobación: monto aprobado (puede diferir del solicitado), área, pedido (precargado desde el informe), resumen de lo aprobado.
  Al confirmar se abre el correo del usuario (mailto) con un resumen informativo (la aprobación se obtiene al exponer el informe):
  trabajo, área, proveedor y cotización, monto aprobado, pedido PSR/PED, aprobado por, código del informe y fecha; pide a Logística
  generar la OSR (PSR) u OCO (PED). Varios destinatarios en Para y en CC (tabla en la aprobación); por defecto Para = a quien va dirigido
  el informe + contactos con `rolDef: "para"` (p. ej. Logística) y CC = `rolDef: "copia"`. Se guardan `aprobacion.paraIds` y `aprobacion.ccIds`. Asunto: "Aprobado — PSR 0004521 · <trabajo>".
  Método por defecto (el usuario usa Outlook de escritorio): descarga de un borrador `.eml` con `X-Unsent: 1` (se abre en Outlook como correo
  nuevo) con To/Cc, asunto, cuerpo texto + HTML (tabla) y adjuntos: informe vigente + documentos adjuntos elegidos. Alternativa: mailto (sin
  adjuntos; el estándar mailto no admite archivos). El método elegido se recuerda en el navegador (`sim_inf_metodo`).
  Envío 100 % automático requeriría un intermediario (Apps Script o servicio externo); se descartó por ahora.
- Registro del envío (manual: el SIM no ve el buzón de Outlook): `aprobacion.correo` = { preparado, metodo, para, cc, adjuntos[], enviado, enviadoPor }.
  Tras preparar, el SIM pide "Registrar envío" (fecha/hora editables, correo enviado opcional como adjunto "Correo enviado") y lo anota en el historial.
  Ficha: preparado sin registrar = aviso ámbar + "Registrar envío"; enviado = recuadro verde + enlace "Preparar nuevamente (reenvío)".
  Lista: aprobados muestran "Correo pendiente" o "✓ Correo enviado".
- Documentos adjuntos del informe (`adjuntos[]`: archivo + `etiqueta` PSR|PED|Cotización|OS|OC|Acta|Documento, detectada por el nombre):
  se suben desde la ficha (varios a la vez), se ven, se quitan y aparecen en Almacenamiento.
- Estados: borrador → presentado → aprobado | observado | rechazado; observado → presentado (con nueva versión).
  La aprobación la registra Admin/Supervisor con la evidencia (correo o acta); Gerencia no entra al SIM.
- Al cargar un HTML o PDF, se autollenan título, tipo, fecha, dirigido, proveedor, monto y cotización. PDF: pdf.js 3.11.174 (cdnjs, carga bajo demanda),
  lectura por filas y columnas (etiqueta arriba / valor abajo o "Etiqueta: valor"). El visor dibuja los PDF en páginas (funciona en celular).
- Archivos (decisión 21-oct-2026): dentro de Firestore, sin plan Blaze, con `core/archivos.js`:
  `datos/inf/archivos/{fid}` (nombre, tipo, bytes, partes, informe, uso) + `.../partes/p{n}` (Bytes ≤ 900 KB). Máx. 15 MB por archivo.
  Firestore gratis = 1 GB para TODOS los aplicativos → se reservan 500 MB para archivos de informes (`LIMITE_STORAGE` en core/informes.js).
  En Spark no hay cobro: al llenarse se bloquean escrituras. Uso acumulado en `datos/inf/config/uso.bytes`; avisos al 80 % y 95 %
  en el aplicativo y en el portal. Almacenamiento: descargar y retirar los más antiguos; la ficha conserva el historial.
- Pendiente de evaluar: Cloud Storage con Blaze (storage.rules ya escrito) o Google Drive. Para migrar, se reemplaza core/archivos.js.

## Materiales e inventario (F5)
- apps/mat/ (layout mínimo, tema claro de Costos). Módulos: analisis, movimientos, catalogo. Cálculos puros en apps/mat/calculo.js.
- Catálogo inicial en core/insumos.js (compartido con el R-302): 4 químicos, cartuchos 1 y 5 µm, zeolita y grava. El nombre une el R-302 con el inventario: no cambiarlo.
- datos/mat/config/osmosis: items (stockInicial, reposicion, carga, vidaMeses, ultimoCambio por módulo), fechaInicio (2026-10-28), horasDia 20, seguridad 7. Se crea con "Inicializar".
- datos/mat/movimientos: ingresos y ajustes por conteo (el ajuste guarda conteo y la diferencia contra el stock calculado a esa fecha).
- Salidas: no se escriben; se leen de datos/fmt/registros con codigo R-302 (listas r302q y r302c, columnas ins/mod/can). "Ambos" se reparte 50/50 entre módulos.
- stock = inicial + ingresos + ajustes − salidas. Tasa de químicos aprendida (mín. 7 días y 2 fechas; ventana 60 días). Cartuchos por intervalo real entre cambios (2 cambios por módulo).
  Material filtrante: próximo cambio = último cambio (catálogo o R-302) + 18 meses. Pedir antes de = se agota − reposición − seguridad.
- Comparación g/m³: producción = promedio diario del flujo de permeado del R-301 × horas/día; módulo desde el código del equipo (…-01 → OI-01).
- Reglas: Materiales e inventario puede leer datos/fmt/registros y plantillas (volver a publicar firestore.rules).

## Pasos de configuración pendientes en la consola
1. Firestore → Reglas: pegar `firestore.rules` y Publicar.
2. Authentication → Configuración → Dominios autorizados: agregar `tecnosolucionesind.github.io`.
3. Primer ingreso: en el portal, "Crear clave" con el correo del administrador → verificar el correo → ingresar.

## Bitácora
- 2026-10-28: Formatos — nota de referencia en listas (s.guia: título, columnas, filas, nota): al pie del impreso tras Observaciones y botón de consulta al llenar; cantidad sugerida por opción (sugeridos). R-302 con dosificación recomendada (core/insumos.js → GUIA_DOSIFICACION). En R-302 ya cargados: editor → "Usar la referencia predefinida" y emitir.
- 2026-10-28: Materiales e inventario — químicos e insumos de ósmosis (tablero de análisis, kardex, catálogo). Formatos: columnas de selección con unidad y R-302 predefinido. Reglas actualizadas (volver a publicar `firestore.rules`).
- 2026-10-26: Plan preventivo — pestañas con estilo propio y panel de controles por bloques (Periodo · Filtros · Acciones); especialidad en desplegable.
- 2026-10-26: Plan preventivo — pestaña Resumen (dashboard del planner con filtros, indicadores, gráficos y alertas).
- 2026-10-26: Plan preventivo — calendario en formato línea de tiempo con filtro por semana, mes, trimestre o año.
- 2026-10-26: PMP v2 (terceros, capacidad), actividades propias en el plan, actualización de semilla y menú lateral ocultable.
- 2026-10-26: Plan preventivo — módulo construido y plan inicial de 38 equipos (rutinas, calendario 52 semanas, OT semanal, cumplimiento, carga HH).
- 2026-10-25: Formatos — visualización por área (áreas por usuario en Administración; filtra Llenar y Registros).
- 2026-10-25: Formatos — campos calculados (diferencia, porcentaje), rangos por columna, emisión con revisión del manual y R-301 ósmosis.
- 2026-10-25: Equipos — ubicaciones como lista controlada (módulo Ubicaciones, aviso de tipeo, unificar).
- 2026-10-25: Sistema Servicios (SRV) y datos de placa del motor en Equipos.
- 2026-10-25: Equipos — código automático SISTEMA-TIPO-N° (catálogo de tipos y siglas, contador por prefijo, recodificación de provisionales).
- 2026-10-02 — Repositorio creado. Portal, núcleo, Administración, plantilla y reglas (F0).
- 2026-10-02 — F0 configurado en consola y probado por el administrador. Congelamiento integrado + herramienta de copia de datos (F1).
- 2026-10-02 — Copia de datos de Congelamiento completada por el administrador. Costos integrado sin datos en el código + herramienta de carga (F2).
- 2026-10-06 — Registro de formatos (F8): constructor de plantillas con revisiones, lista maestra y configuración. Reglas actualizadas (volver a publicar `firestore.rules`).
- 2026-10-07 — Equipos (F3): base maestra con carga Excel e importación desde Costos. Registro de formatos: llenado en celular, registros, revisión, impresión con QR. Reglas actualizadas (volver a publicar `firestore.rules`).
- 2026-10-20 — Plan de mantenimiento (F7): módulo Paradas de planta con resumen, curva S, línea de tiempo, línea base, actividades y evidencias con PDF. Parada de Planta de Hielo 2026 disponible para carga inicial.
- 2026-10-20 — Se retiró del catálogo "Registro de parámetros" (F4): las lecturas de parámetros se cubren con Registro de formatos (F8).
- 2026-10-20 — Plan de mantenimiento: Paradas de planta pasa a Programas de trabajo (tipos: parada, mantenimiento programado, auditoría, proyecto) con pestaña Costos. Plan preventivo como primer módulo (estructura inicial).
- 2026-10-21 — Informes técnicos (F9): registro con código, estados, versiones, relaciones con Plan y Equipos, Storage con medidor y retiro. Nuevo `storage.rules`.
- 2026-10-21 — Informes: archivos pasan a Firestore por partes (sin Blaze), 500 MB reservados.
- 2026-10-21 — Informes: autollenado y visor para PDF (pdf.js).
- 2026-10-22 — Informes: destinatarios con correo, datos de aprobación (monto, área, PSR/PED) y correo de confirmación con un clic.
- 2026-10-22 — Informes: corrige documentos que no se guardaban sin Enter; pedido PSR/PED propio del informe y en el correo.
- 2026-10-22 — Informes: correo de aprobación pasa a resumen informativo para Logística (sin pedir confirmación).
- 2026-10-22 — Informes: varios destinatarios en Para y en CC; rol por defecto de cada destinatario.
- 2026-10-22 — Informes: documentos adjuntos (PSR, cotización…) y borrador .eml para Outlook con adjuntos automáticos.
- 2026-10-22 — Informes: registro del envío del correo (historial, estado en ficha y lista); etiquetas de adjuntos corregidas (PSR_…).
