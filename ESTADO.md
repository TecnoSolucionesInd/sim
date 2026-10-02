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
admin/                  Aplicativo Administración: Usuarios, Permisos, Aplicativos
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
| F1 | Congelamiento (migración, conserva su diseño) | Siguiente |
| F2 | Costos de mantenimiento | En construcción por separado |
| F3 | Equipos (maestro) | Planificado |
| F4 | Registro de parámetros (Ósmosis, Salas de máquinas, Calderos) | Planificado |
| F5 | Materiales e inventario (maestro) | Planificado |
| F6 | Conformidades · Reporte de mantenimiento | Planificado |
| F7 | Plan de mantenimiento y OT (desde cero) | Planificado |

## Pasos de configuración pendientes en la consola
1. Firestore → Reglas: pegar `firestore.rules` y Publicar.
2. Authentication → Configuración → Dominios autorizados: agregar `tecnosolucionesind.github.io`.
3. Primer ingreso: en el portal, "Crear clave" con el correo del administrador → verificar el correo → ingresar.

## Bitácora
- 2026-10-02 — Repositorio creado. Portal, núcleo, Administración, plantilla y reglas (F0).
