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
| F5 | Agua de planta | Panel HMI 3D, análisis y parámetros desde el R-303 en pruebas |
| F5 | Materiales e inventario (maestro) | Químicos e insumos de ósmosis en pruebas (Análisis, kardex, catálogo) · pendiente: almacén general |
| F6 | Órdenes de trabajo | Etapas 1 a 5 en pruebas (registro, bandeja, Mis trabajos, personal, solicitudes, preventivo de la semana, capacidad, dashboard gerencial, rol de guardia, R-001 prellenado, catálogo de materiales) |
| F6 | Conformidades | Planificado |
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
- Cambio definitivo (día acordado): en `apps/cong/migrar.html` marcar **las dos casillas** (volver a copiar todo + dejar el SIM
  idéntico al sistema actual), pulsar "Copiar datos", verificar que las cinco colecciones queden en "Coincide", pasar al personal
  al enlace del SIM y dejar el sistema anterior solo como respaldo unas semanas.
  La segunda casilla retira del SIM los registros eliminados en el origen; sin ella los totales nunca coinciden.
- Lecturas (desde 2026-11-25): en vivo solo los últimos 7 días + lo abierto/pendiente; el histórico se pide por rango y queda
  guardado en cada equipo (ver bitácora 2026-11-25). Para no gastar cuota: análisis largos en la computadora habitual.
- Indicadores del dashboard (desde 2026-11-24): un evento cuenta en el periodo si estuvo ACTIVO en él (no solo si empezó en él).
  Sus horas se recortan a la ventana del periodo (día operativo 08:00 → 08:00) y nunca pasan de "ahora"; una falla abierta sigue
  restando disponibilidad cada día hasta que se cierre. Las horas futuras del día en curso no cuentan como operativas.
  "Operativos" = equipos sin falla ni mantenimiento en curso al cierre del periodo (antes: equipos con actividad).
  MTTR y C/D promedio usan la duración total del evento; horas detenidas y disponibilidad, solo la parte dentro del periodo.
  La eficiencia sigue comparando contra la capacidad del día completo. Funciones: `tsOperativo`, `intervaloEvento`,
  `ventanaOperativa`, `horasEnVentana`, `eventoEnVentana`, `equiposDetenidosEn`.

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
  `escala` (A × factor, p. ej. altura × área = volumen) y `caudal` ((lectura final − inicial) ÷ horas entre dos campos fecha y hora).
- Tablas de lista fija: una fila puede tener rangos por columna `rangos: { '<nombre de columna>': {min, max} }` (p. ej. solo Permeado).
  El editor los muestra pero no los edita (se definen en el formato predefinido).
- Emisión de formatos que ya existen en el manual: opción "conserva su revisión y vigencia" (revisión y mes indicados; `origenManual`).
- Formatos predefinidos (botón "Cargar formatos predefinidos"): R-001, R-002, R-101/R-102/R-103 (compresores por sala de máquinas), R-302 (químicos e insumos de ósmosis, alimenta Materiales e inventario), R-303 (control de agua cada 2 horas, alimenta Agua de planta) y R-301 Control de operación — Planta de ósmosis
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

## Agua de planta (F5)
- apps/agua/ (layout mínimo, tema claro). Módulos: hmi (Panel HMI 3D con Three.js r128, compartir/descargar imagen y PDF),
  analisis (stock en pozos, caudal por muestra frente a lo esperado, producción frente a consumo, resumen diario, alertas)
  y parametros (`datos/agua/config/parametros`). Cálculos puros en apps/agua/calculo.js; datos fijos en core/agua.js.
- Fuente: registros R-303 (`datos/fmt/registros`, ids fijos `R303` en core/agua.js): altura por pozo (volumen = altura × área),
  estado de OI-01/OI-02, un solo caudalímetro mecánico de ósmosis para ambos módulos y uno de consumo de producción congelado,
  cada uno con lectura y hora inicial y final por muestra. Caudal = (final − inicial) ÷ horas.
- Pozos: P1 y P2 10.57 × 5.87 × 2.37 m; P3 12.14 × 10.76 × 2.144 m (574 m³). Módulos 12.5 m³/h; retrolavado 4 × 35 min/día
  (21.67 h/día, 270.8 m³/día por módulo). Reserva mínima 2 %. Alerta de cisternas con autonomía < 24 h (crítica < 12 h).
- Producción baja (< 85 % de lo esperado según los módulos que producían): uno de los módulos falla, no se sabe cuál → revisar ambos en campo.
- HMI 3D: pozos de concreto con baranda y regla de nivel, módulos en bastidor con luz de estado, caudalímetro de ósmosis (dial) → reparto a pozos;
  salida del Pozo 2 (atrás; el Pozo 1 va adelante) → caudalímetro electromagnético → producción congelado (no pasa por la ósmosis). Etiquetas con cabecera navy.
- HMI: etiquetas en cascada (si se tapan, suben y quedan unidas a su punto por una guía); igual en la imagen y el PDF.
- Trasvase manual: el Pozo 2 (parámetro pozoProduccion) es el único que abastece a producción congelado; cuando baja se
  bombea a mano desde el Pozo 1 y el Pozo 3. Si entre dos muestras el pozo de producción sube más de lo que pudo aportar la
  ósmosis (+ consumo) y los otros bajan o quedan casi vacíos (≤ 10 %), se informa "Trasvase manual" (aviso informativo) y
  ese intervalo no se cuenta como "Balance no cuadra" (calculo.js trasvase()).
- Vista pública sin login: apps/agua/?publico (Panel HMI y Análisis, solo lectura; se actualiza sola con cada muestra).
  Lee publico/agua (parámetros, turnos, actualizado) y publico/agua/muestras/{idRegistro} con solo los campos del agua
  (core/agua.js CAMPOS_PUBLICOS / muestraPublica: sin nombres, firmas, observaciones ni fotos).
  Se escribe al enviar o reenviar un R-303 (apps/fmt/datos.js publicarAgua) y al abrir Agua de planta (sincroniza los
  últimos 30 días, borra lo que ya no existe y publica parámetros y turnos). Botón "Enlace público" en el HMI para copiarlo.
  WhatsApp no permite publicar en automático en un grupo existente (la API oficial exige cuenta de empresa oficial y grupos
  creados por la API): se fija el enlace en el grupo y se comparte la imagen con el botón Compartir.
- Reglas: Agua de planta puede leer datos/fmt/registros, plantillas y config (volver a publicar firestore.rules).

## Órdenes de trabajo (F6, EN CURSO)
Registro, medición y control de todos los trabajos de mantenimiento. Propuesta aprobada (documento "Propuesta — Gestión de
trabajos de mantenimiento (SIM)" en Claude Docs). Aplicativo independiente `apps/ot/`, ocupa el lugar del antiguo
"Reporte de mantenimiento" del catálogo (id `ot`). Escribe solo en `datos/ot/…`; lee Equipos (equipos y ubicaciones).
- Archivos: `modelo.js` (catálogos, plazos, estados, validaciones, HH frente a duración), `datos.js` (Firestore),
  `ordenes.js` (bandeja, formulario de 5 bloques, cambios de estado), `mis.js` (Mis trabajos en celular y reporte rápido),
  `ajustes.js` (Personal y Configuración), `ui.js`.
- Colecciones: `datos/ot/ordenes/{id}` (+ `fotos/`), `datos/ot/personal/{id}`, `datos/ot/config/general`, `datos/ot/contadores/OT-AA`.
  Campos de búsqueda en cada OT: `mes`, `anio`, `tecnicoIds`, `abierta`. La app escucha las abiertas y las de los 2 últimos meses.
- Estados: pendiente → programada → ejecucion (⇄ espera) → ejecutada ("Por verificar") → cerrada; anulada. "Retrasada" se
  calcula (fecha límite vencida). En espera corre la fecha límite lo que duró la espera.
- Decisiones confirmadas (17-nov): turnos de 12 h, 6 turnos/semana por persona (editable); capacidad = 1 electricista,
  3 mecánicos frigoristas, 1 mecánico, 1 soldador al 100 % (432 HH/semana); operación (congelamiento 4, calderos 2,
  planta de hielo 2, ósmosis 2) al 0 %, sus HH van aparte como apoyo; plazos P1 4 h · P2 24 h · P3 7 d · P4 30 d;
  toda OT pasa por supervisor; el cierre de una OT del PMP marcará la ocurrencia en Plan preventivo (etapa 2);
  numeración OT-26-00001 / SOL-26-00001.
- Etapas: [x] 1 base y registro · [x] 2 solicitudes + PMP · [x] 3 capacidad · [x] 4 dashboard gerencial · [x] 5 R-001 prellenado, rol de guardia, materiales.
- Etapa 2 (17-nov): módulo **Solicitudes** (`solicitudes.js`, `datos/ot/solicitudes`, correlativo SOL-AA): el área registra y
  ve las suyas (`creadoUid`); el supervisor acepta (abre la OT prellenada; al registrarla la solicitud queda `aceptada` con
  `otId`/`otNumero`) o rechaza con motivo; "Atendida" se calcula cuando su OT está cerrada. Módulo **Preventivo de la semana**
  (`pmp.js`): lee `datos/plan/pmp_tareas` (una vez al abrir), muestra las ocurrencias de la semana (+ atrasadas en la
  semana actual), genera OT una a una o todas; la OT lleva `pmp:{tareaId, semana, efectiva}` y fecha límite = fin de su
  semana. **Mis trabajos** muestra el preventivo de la especialidad del técnico con botón Iniciar. Al **verificar y cerrar**
  una OT del PMP se escribe `ejec.<semana>` = {estado:'hecho', fecha, por, obs, ot} (misma forma que usa Plan preventivo;
  `pmpMarcado` true/false en la OT). Una ocurrencia no admite dos OT vigentes.
- Etapa 3 (17-nov): módulo **Capacidad** (`capacidad.js`; cálculos puros en `modelo.js`: `hhDispSemana`, `estimador`,
  `cargaPendiente`, `planificar`). Disponibles = h/turno × turnos/sem × dedicación × (7 − días de ausencia)/7 por persona
  (ausencias en la ficha de Personal). Requeridas = OT abiertas (HH estimadas − registradas; sin estimación: promedio real de
  OT cerradas de igual especialidad principal y tipo con ≥2 casos, si no 2 HH por especialidad; OT del PMP usan las HH de
  la tarea) + ocurrencias del PMP sin OT; lo vencido se carga a la semana actual. Utilizadas = HH por técnico de OT
  iniciadas en la semana (operación aparte como apoyo). `planificar` reparte por especialidad, semana, prioridad,
  criticidad y fecha límite en un horizonte de 4 semanas; lo que no entra = "sin capacidad". Tercero no consume capacidad.
  Vista: indicadores, alertas (déficit por especialidad, especialidad sin personal, técnico sobrecargado, trabajos sin
  capacidad), barras por especialidad, mapa de 4 semanas, carga por técnico y lista de trabajos sin capacidad.
- Etapa 4 (17-nov): módulo **Dashboard gerencial** (`dashboard.js`; cálculo puro en `indicadores.js`). Cada OT mantiene una
  copia compacta (`modelo.compacta`) en `datos/ot/resumen/{AAAA-MM}` (mes de registro, campo `filas.<id>`), escrita por
  `datos.js` en cada alta o cambio; el dashboard lee 1 documento por mes (periodo + periodo anterior + 2 meses antes) y lo
  corrige con las OT en vivo. Configuración → "Reconstruir resúmenes" (admin) los rehace leyendo todas las OT.
  Periodos día/semana/mes/trimestre/semestre/año con navegación; filtros especialidad, técnico, área solicitante, zona,
  origen, criticidad. Indicadores: cumplimiento PMP (semanas ya terminadas; a tiempo = dentro de su semana), cumplimiento
  de solicitudes (atendidas en el plazo de su OT / vencidas o atendidas; rechazadas fuera), OT registradas/ejecutadas y a
  tiempo, HH utilizadas/disponibles (disponibles desde el inicio del registro = primera OT), backlog al cierre (HH,
  semanas, antigüedad, vencidas), % preventivo y emergencias, distribuciones, criticidad, productividad por técnico y
  especialidad, tendencias por cubeta. Periodo en curso se compara con el mismo tramo del anterior. PDF A4 horizontal
  (html2canvas + jsPDF, cortes por bloque `.db-blk`, firma al pie) y Excel (ExcelJS: Indicadores, OT del periodo, Técnicos).
  Datos de ejemplo con historial: `mocks/seed_ot_hist.txt` (jun–oct, ficticio).
- Etapa 5 (24-nov):
  **Rol de guardia** (módulo `rol`, `rol.js`; `datos/ot/rol/{lunes}` = { semana, filas: { idPersona: [7 códigos lun→dom] } }).
  Códigos D, N, DSO, V, DM, F, P, C (`M.COD_ROL`). "Generar" propone la semana: rota la anterior (Turno 1 y Turno 2 cambian
  D↔N, los demás grupos conservan su turno, DSO se mantiene, una ausencia de la semana previa vuelve al turno) o, sin semana
  previa, turno del grupo × turnos/semana y DSO al final; las ausencias de la ficha de Personal se marcan solas (Vacaciones→V,
  Descanso médico→DM, Permiso/Capacitación/Otro→P). Cada casilla se cambia con un menú (opción "aplicar al resto de la semana").
  Exporta imagen PNG (en celular abre compartir, para WhatsApp) y Excel de la semana. Mis trabajos muestra el rol del técnico.
  Capacidad y dashboard: si la semana tiene rol, HH = horas de turno × dedicación × días con D o N que no caen en una ausencia
  de la ficha (`hhDispSemana`, `hhDia`, `diasAusente` con `S.rol`); si no, la fórmula anterior. La app escucha toda la colección.
  **R-001 prellenado**: al pasar una OT correctiva o de emergencia a "Por verificar" (o registrarla ya ejecutada) y al cerrarla
  se escribe `datos/fmt/pendientes/ot-<idOT>` { codigo R-001, estado abierto, equipo, origen {tipo:'ot', numero}, prellenado }.
  `prellenado` = { campos: [{ n: etiqueta, v }], listas: [{ t: título, filas: [{ columna: valor }] }] }; Registro de formatos lo
  aplica al abrir el pendiente (`aplicarPrellenado` en `apps/fmt/llenado.js`, por nombre normalizado, solo campos vacíos, en una
  selección la opción igual u "Otra"). Si el R-001 ya se llenó no se toca. La OT muestra su estado y un botón para dejarlo o
  actualizarlo. La causa de la OT pasa a ser la lista del R-001 (`M.CAUSAS`) y hay un campo "Trabajo realizado".
  **Catálogo de materiales**: `datos/ot/config/materiales` { items: [{ c, d, u }] }, se reemplaza pegando desde Excel (Código,
  Descripción, Unidad) o con un CSV en Configuración. En la OT el material se busca en el catálogo y en los ya usados; al elegir
  uno se guardan `cod` y unidad. Un documento admite ~15 000 materiales.
- Regla nueva en `firestore.rules` (etapa 5): `match /datos/fmt/pendientes/{id}` — lectura con acceso a `ot`; crear/actualizar
  solo `ot-…`, codigo R-001 y estado abierto, por usuarios con escritura en `ot`. **Debe publicarse en la consola.**
- Regla nueva en `firestore.rules`: `match /datos/plan/pmp_tareas/{id}` — lectura con acceso a `ot`; actualización por
  admin/supervisor de `ot` solo de los campos `ejec` y `actualizado`. **Debe publicarse en la consola.**
- Para dar acceso a un área solicitante: rol operador en `ot` con solo el módulo Solicitudes.
- Pendiente en reglas: hoy `datos/ot` usa la regla general (cualquier usuario con escritura en `ot` puede escribir Personal y
  Configuración; la interfaz lo limita). Endurecer junto con la etapa 3.
- Prueba: `herramientas/tema/ver.py apps/ot/ x --seed <seed_eq + seed_ot> --mods mis,ordenes,personal,config` (datos de ejemplo en `mocks/seed_ot.txt`).

## Pasos de configuración pendientes en la consola
- Publicar `firestore.rules` con la regla de `datos/plan/pmp_tareas` para Órdenes de trabajo (etapa 2, 17-nov).
1. Firestore → Reglas: pegar `firestore.rules` y Publicar.
2. Authentication → Configuración → Dominios autorizados: agregar `tecnosolucionesind.github.io`.
3. Primer ingreso: en el portal, "Crear clave" con el correo del administrador → verificar el correo → ingresar.

## Rediseño claro de los aplicativos (EN CURSO)
Ver **REDISENO.md** (archivo de continuación: qué está hecho, qué falta y cómo probar). Resumen: hechos portada, menú lateral
común, Administración, Equipos, Plan, Informes, Formatos, Agua y Materiales. Hechos también Costos (falta verlo con datos reales y su PDF) y la plantilla. Congelamiento va por fases y se queda oscuro con el tema de la portada (`apps/cong/tema.css`): fases 1 (base) y 2 (gráficas) hechas; falta el detalle (fase 3).

## Bitácora
- 2026-11-25: Portal (index.html) lento al navegar. Medido con CPU ×4 y sin aceleración gráfica (como un equipo con la
  aceleración desactivada): ~20 cuadros/s al desplazarse o pasar el mouse y ~12 al cambiar de pestaña; ahora ~55–60 en todo.
  Causas: resplandores de fondo animados con filtro blur bajo la barra superior con backdrop-filter y una capa de ruido con
  mix-blend-mode (toda la pantalla se recomponía en cada cuadro), pulsos que animaban box-shadow, anillos SVG girando dentro de
  un solo svg, View Transition en cada filtro y en cada tecla de la búsqueda. Cambios: fondo quieto (sin blur ni deriva), ruido
  sin mezcla, barra superior opaca sin desenfoque, pulsos con transform/opacity en ::after, cada anillo en su propio svg,
  fundido corto del grid en lugar de View Transition, búsqueda con pausa de 140 ms, luz del cursor una vez por cuadro y sombras
  de hover más cortas. Aspecto prácticamente igual. Herramienta de medición: ver bitácora (perf.py en el scratchpad, no versionada).
- 2026-11-25: Congelamiento — disponibilidad 50 % con un solo equipo en falla. Causa: desde el cambio del 24-nov los eventos
  abiertos de días anteriores cuentan en el periodo, y los "Fin de proceso" (que no se cierran solos) y eventos olvidados
  restaban horas como paradas en curso aunque el equipo ya estuviera congelando; todas las horas operativas quedaban en 0.
  Ahora un evento abierto sin duración termina cuando el equipo inicia su siguiente bachada (`bachadaDespues`,
  `eventoVigente`). Estado en tiempo real: una falla o mantenimiento abierto y vigente tiene prioridad (antes el equipo en
  falla salía como operativo por un Fin de proceso viejo). Prueba con Fin de proceso abiertos en los 14 equipos y C5 en falla:
  disponibilidad 69,0 % → 94,4 % (mantenimiento 0,0 % → 94,4 %), anillo 14 → 10 de 14 operativos.
- 2026-11-25: Congelamiento — menos lecturas de Firebase (la cuota gratuita se agotó el 24-nov: ~97 000 lecturas en una hora al
  analizar datos desde junio, y ~57 000 el resto del día). (1) Ventana en vivo de 30 a 7 días (`DIAS_VIVOS`): cada apertura en frío
  lee ~4 veces menos. (2) Histórico por rango y guardado en el equipo (`cargarHistorico(desde)`, `_histColeccion`): cada equipo
  recuerda en localStorage (`cong_hist3_<col>`: desde, hasta, documentos por día, ventana en vivo) qué tramo ya bajó completo a su
  caché en disco; solo pide al servidor los tramos que faltan y comprueba por día que la caché siga completa (si no, la vuelve a
  bajar). Antes se pedía "todo" a la caché y, con la caché parcial, el histórico podía salir incompleto sin aviso. (3) Registros y
  Eventos sin fecha muestran los últimos 30 días, con enlace "vea todo el histórico". (4) Producción mensual: carga el año elegido y
  el anterior solo si el equipo ya los tiene; si no, botón "cargar meses anteriores". Informe de tiempos, reporte, tendencia y
  timeline piden el histórico de su propio rango. Prueba con 1 340 bachadas desde junio (mock con caché simulada): reapertura de
  462 a 232 lecturas; análisis desde junio repetido tras recargar: 0 lecturas del servidor; 5 días después: solo el tramo nuevo.
- 2026-11-25: Cuota de Firebase agotada el 24-nov ~18:40 (técnico de ósmosis: "resource-exhausted" al enviar formatos; quedaron en la cola del celular, sin pérdida). Causa más probable: la vista pública de Agua releía todas las muestras del mes (~hasta 360) en cada pantalla abierta con cada R-303 nuevo. Ahora pide solo las publicadas desde la última que tiene (margen 24 h) y, con la pestaña en segundo plano, espera a que se vea. La cola de formatos explica el límite diario en vez de mostrar el código.
- 2026-11-24: Órdenes de trabajo, etapa 5: rol de guardia semanal (genera con rotación, imagen y Excel, alimenta la capacidad y el dashboard), R-001 prellenado desde las OT correctivas en Registro de formatos y catálogo de materiales. Los mocks de prueba ya no usan un nombre real.
- 2026-11-24: Congelamiento — corregido el cálculo con fallas abiertas de días anteriores: ya no se pierden al filtrar por fecha (antes el dashboard volvía a 100 % de disponibilidad al día siguiente). Afecta indicadores clave, mantenimiento, evolución mensual, desviaciones, tabla por equipo, estado en tiempo real y conteo de operativos.
- 2026-11-17: Órdenes de trabajo, etapa 4: Dashboard gerencial con resúmenes mensuales, periodos de día a año, filtros, comparación con el periodo anterior, gráficos (tendencia, tipo, HH, especialidad, áreas, criticidad, backlog), productividad, PDF horizontal y Excel.
- 2026-11-17: Órdenes de trabajo, etapa 3: módulo Capacidad (disponibles, requeridas, utilizadas, holgura o déficit, backlog, asignación de 4 semanas, trabajos sin capacidad, carga por técnico) y ausencias en Personal.
- 2026-11-17: Órdenes de trabajo, etapa 2: Solicitudes de las áreas (registro, aceptación que crea la OT, rechazo con motivo), Preventivo de la semana desde el Plan preventivo (OT por tarea o todas), preventivo en Mis trabajos y marca automática de ejecución en el PMP al cerrar la OT. Regla nueva para `pmp_tareas`.
- 2026-11-17: Órdenes de trabajo, etapa 1: aplicativo nuevo `apps/ot/` (bandeja, formulario, estados, Mis trabajos en celular, reporte rápido, Personal con capacidad, Configuración). Reemplaza en el catálogo al "Reporte de mantenimiento" planificado. El mock de pruebas ahora avisa a los oyentes tras una transacción.
- 2026-11-17: Agua de planta — HMI tipo SCADA: mímico de niveles y flujo con tanques animados, visor 3D reencuadrado para celular en vertical (vista de costado, tarjetas compactas), insignia En vivo/Histórico y transiciones ligeras. El reporte PNG/PDF no cambia.
- 2026-11-16: Tono intermedio (fondo gris azulado con brillos de la portada) y efectos ligeros en todos los aplicativos claros; Registros de formatos con franja de estado; efectos en tarjetas de Congelamiento; corregida la cabecera de Costos en celular. Detalle en REDISENO.md.
- 2026-11-16: Congelamiento, fase 2: rejillas, ejes, leyendas y fondos de las gráficas con la paleta nueva (colores de estado y de dato intactos).
- 2026-11-16: Congelamiento, fase 1 del tema oscuro de la portada: `apps/cong/tema.css` (fondos, bordes, textos, menú lateral con logo, barra superior), tipografía Geist, íconos de fecha/hora visibles, Pantalla de Sala sin desborde en celular. Sin cambios de lógica. Prueba completa en `herramientas/tema/cong.py`.
- 2026-11-16: Rediseño claro — migrados Equipos, Plan de mantenimiento, Informes técnicos, Registro de formatos, Agua de planta y Materiales; `core/tema-panel.css`; herramientas de prueba en `herramientas/tema/`; archivo de continuación REDISENO.md. Agua: el trasvase manual solo se informa si el pozo de producción sube de verdad.
- 2026-11-16: Inicio del rediseño claro de los aplicativos: base `core/tema-claro.css` y plan de migración (sin enlazar todavía).
- 2026-11-16: Portada en celular — animaciones siempre activas (no se apagan con la preferencia de movimiento reducido del equipo), tarjetas que aparecen al desplazarse y se iluminan solas al cruzar el centro de la pantalla, más contraste, y engranajes del inicio de sesión más visibles y rápidos en vertical.
- 2026-11-16: Portada rediseñada (inicio de sesión y lanzador de aplicativos): tema oscuro propio, logo de la empresa como marca (core/marca/logo-negativo.png e isotipo.png como ícono de pestaña), indicadores con contadores, filtros con indicador deslizante, tarjetas con luz al cursor y módulos, buscador con Ctrl K. Inicio de sesión con fondo 3D de engranajes (core/marca/escena.js, Three.js bajo demanda). index.html ya no usa core/sim.css: los aplicativos internos no cambian.
- 2026-11-14: Agua de planta — reconoce el trasvase manual de los pozos 1 y 3 al pozo 2 (ya no se marca como balance que no cuadra); parámetro del pozo que abastece a producción.
- 2026-11-14: Agua de planta — vista pública sin login (?publico) para el grupo de WhatsApp, copia pública del R-303 y botón al emitirlo. Reglas actualizadas: publico/agua (volver a publicar firestore.rules).
- 2026-11-12: Agua de planta — HMI: encuadre automático de la planta, tarjetas compactas (la del caudalímetro de ósmosis a su lado), nave con contraste, reglas de nivel legibles y piso de losetas.
- 2026-11-12: Agua de planta — HMI 3D con el modelo de referencia (concreto, barandas, reglas de nivel, módulos en bastidor, caudalímetros) y recorrido corregido de ósmosis y de producción.
- 2026-11-12: Agua de planta (nuevo aplicativo) y formato R-303 (nivel de pozos, caudalímetro de ósmosis y de consumo de producción congelado con lecturas inicial/final). Formatos: campos calculados `escala` y `caudal`. Reglas actualizadas (volver a publicar `firestore.rules`).
- 2026-11-05: Formatos — llenado por circuito (`def.recorrido`): equipos con el mismo campo `circuito` (Equipos) se llenan juntos en un paso, en el orden de las tablas; el impreso mantiene las tablas por tipo. Equipos: nuevo campo Circuito (formulario, carga masiva y Excel). R-101/102/103 vienen con recorrido activado.
- 2026-11-05: Formatos — auxiliares en R-101/102/103 (bombas de refrigerante/amoniaco, de agua, de aceite, ventiladores, motor del tambor) como tablas con `conReserva` (estado "En reserva") y `sinEquiposOk` (no bloquea si aún no hay equipos). Parámetros `porTurno` (corriente y horómetros: obligatorios solo en el primer registro del turno). Estado "Fuera de servicio" genera alerta. Impreso: tablas de más de 8 equipos se parten; `nuevaPagina` pone los auxiliares en hoja 2.
- 2026-11-05: Formatos — un formato por sala de máquinas: R-101 Sala 1 (tablas Gram y Copeland), R-102 Sala 2 (pistón productor de hielo y tornillo Cámara 3), R-103 Sala 3 (tornillo Yantai R-22 y Bingshan amoniaco). Cada tipo en su tabla con sus parámetros y límites propios. Tablas de equipos: filtro "Contiene" (incluye) y selección manual de equipos (codigos). Hojas en vertical (caben en una página).
- 2026-11-05: Formatos — logo de la empresa por defecto en el encabezado (apps/plan/logo.png; Configuración puede subir otro). Menú del editor: "Reemplazar con el formato predefinido" para actualizar un formato ya cargado (p. ej. R-101 antiguo) y emitir nueva revisión.
- 2026-11-05: Formatos — R-101 Gram y R-102 Copeland (Sala de Máquinas 1) como predefinidos: columnas por marca (filtro `marca` en tablas de equipos), fila calculada `diferencia` en tablas (diferencial de aceite), frecuencia "Cada 2 horas" (rondas por bloque horario), tablas largas compactas al imprimir. Límites vacíos: se registran en el editor.
- 2026-11-03: Costos — dólares por defecto con selector US$ / S/ (preferencia por navegador). Órdenes en US$ usan su importe original; el resto, TC venta promedio del mes (TCV ene–set; meses posteriores usan el último). Catálogo (valor de reposición) y meta se guardan en soles y se convierten al mostrar. Excel siempre en soles.
- 2026-11-02: Programas — botón "Finalizar actividad" (avance 100 % y fecha real de término `finReal`).
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
- 2026-11-05: Congelamiento (F1) — carga en dos niveles para no agotar la cuota de Firebase. Los listeners escuchaban
  las colecciones completas (~10,600 documentos) en cada apertura en frío; con 50,000 lecturas/día del plan gratuito
  el aplicativo se quedaba sin cuota en ~4 aperturas y dejaba de actualizarse hasta la medianoche del Pacífico.
  Ahora se escuchan los últimos `DIAS_VIVOS` (30) días **más todo lo que esté abierto o pendiente de cualquier
  antigüedad** (dos listeners por colección, unidos sin duplicar en `mezclarFuente`, con el dato en vivo por encima
  del histórico y el mismo orden `ts` descendente que entregaba Firestore). El histórico completo se descarga una
  vez por sesión, solo cuando una vista mira más atrás que la ventana (`quizasHistorico`) o se abre la gráfica
  mensual, y se pide primero a la caché local de Firestore (`get({source:'cache'})`), que no se factura: los
  documentos antiguos no cambian. No se borra ni se resume ningún dato; los cálculos salen de los mismos documentos.
  Estimado: de ~10,600 a ~1,600 documentos por carga en frío.
- 2026-11-05: Congelamiento (F1) — correcciones críticas de eventos y mejoras del dashboard, aplicadas con
  `tools/parche_cong_2026_11_05.py`. (a) La caché pasa a memoria: `localStorage` superaba su cuota (~5 MB) y el
  `QuotaExceededError` cortaba el `onSnapshot`, dejando los datos congelados — de ahí los `_fid` fantasma
  ("No document to update"), los borrados sin efecto, los eventos duplicados y los eventos abiertos con 400+ horas.
  (b) Al abrir bachada se cierran todos los eventos abiertos del equipo, no solo el más reciente. (c) Los botones de
  editar/cerrar/eliminar usan el `_fid` de Firestore en vez del campo `id` (un `Date.now()` que puede repetirse).
  (d) Aviso claro ante registro fantasma. (e) No se permiten dos eventos abiertos del mismo tipo por equipo.
  (f) Indicadores clave ligados al rango de fechas filtrado ("Producción período" y "Promedio diario").
  (g) Nueva gráfica "Producción mensual · histórico" con filtro de año propio (solo años con registros).
  Copia de datos: `migrar.html` ahora puede dejar el SIM idéntico al origen (retira lo eliminado allá).
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
