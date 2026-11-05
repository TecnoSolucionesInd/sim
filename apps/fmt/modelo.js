// Modelo del aplicativo Registro de formatos: catálogos, utilidades y formatos piloto.

import { SISTEMAS } from '../../core/maestros.js';
import { QUIMICOS_OSMOSIS, CONSUMIBLES_OSMOSIS, unidadesDe, GUIA_DOSIFICACION } from '../../core/insumos.js';
export { SISTEMAS };

export const FRECUENCIAS = ['Cada 2 horas', 'Por turno', 'Diario', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Según plan', 'Por evento'];

export const TIPOS_CAMPO = [
  { id: 'texto',     nombre: 'Texto corto' },
  { id: 'textoLargo',nombre: 'Texto largo' },
  { id: 'numero',    nombre: 'Número con rango' },
  { id: 'seleccion', nombre: 'Selección de lista' },
  { id: 'siNo',      nombre: 'Sí / No' },
  { id: 'conforme',  nombre: 'Conforme / No conforme / N.A.' },
  { id: 'fecha',     nombre: 'Fecha' },
  { id: 'hora',      nombre: 'Hora' },
  { id: 'fechaHora', nombre: 'Fecha y hora' },
  { id: 'duracion',  nombre: 'Duración calculada' },
  { id: 'diferencia',nombre: 'Diferencia calculada (A − B)' },
  { id: 'porcentaje',nombre: 'Porcentaje calculado (A ÷ B)' },
  { id: 'equipo',    nombre: 'Equipo' },
  { id: 'referencia',nombre: 'Registro relacionado' },
  { id: 'foto',      nombre: 'Foto' }
];

export const MODOS_FIRMA = [
  { id: 'usuario',    nombre: 'Usuario que envía',    desc: 'Se firma con el usuario del sistema al enviar' },
  { id: 'manuscrita', nombre: 'Firma en pantalla',    desc: 'Nombre y firma con el dedo en el celular' },
  { id: 'aprobador',  nombre: 'Supervisor al aprobar', desc: 'La registra el supervisor al aprobar el registro' }
];

export const ESTADOS_COLUMNA = [
  { id: 'operando', label: 'Operando', corto: 'OP' },
  { id: 'parado', label: 'Parado', corto: 'PAR' },
  { id: 'reserva', label: 'En reserva', corto: 'RES' },
  { id: 'mantenimiento', label: 'En mantenimiento', corto: 'MANT' },
  { id: 'fuera', label: 'Fuera de servicio', corto: 'F/S' }
];

// estados que ofrece una tabla: "En reserva" solo en tablas con equipos de respaldo (bombas, ventiladores)
export const estadosDe = (s) => ESTADOS_COLUMNA.filter(e => e.id !== 'reserva' || s.conReserva);

export const TIPOS_FILA = [
  { id: 'numero',    nombre: 'Número' },
  { id: 'seleccion', nombre: 'Selección' },
  { id: 'texto',     nombre: 'Texto' },
  { id: 'diferencia', nombre: 'Diferencia (calculada)' }
];

export const TIPOS_SECCION = [
  { id: 'campos',    nombre: 'Campos',              desc: 'Datos sueltos en dos columnas' },
  { id: 'tabla',     nombre: 'Tabla de parámetros', desc: 'Lecturas por equipo de la base, con rangos' },
  { id: 'checklist', nombre: 'Checklist',           desc: 'Ítems Conforme / No conforme / N.A.' },
  { id: 'lista',     nombre: 'Lista repetible',     desc: 'Filas que se agregan al llenar' }
];

export const CONFIG_BASE = {
  versionManual: '6.0',
  prefijo: 'IPSMSA/MMTO',
  empresa: 'IP Santa Mónica Fishing S.A.C.',
  planta: 'Planta Paita',
  departamento: 'Departamento de Mantenimiento',
  logo: '',
  turnos: [{ nombre: 'Día', inicio: '07:00' }, { nombre: 'Noche', inicio: '19:00' }]
};

// Turnos con hora de inicio (acepta la forma antigua: lista de nombres)
export function turnosDe(cfg) {
  const t = (cfg && cfg.turnos && cfg.turnos.length ? cfg.turnos : CONFIG_BASE.turnos);
  const def = ['07:00', '19:00', '23:00'];
  return t.map((x, i) => typeof x === 'string' ? { nombre: x, inicio: def[i] || '07:00' } : { nombre: x.nombre, inicio: x.inicio || def[i] || '07:00' })
    .filter(x => x.nombre);
}

// Firmas como objetos { nombre, modo } (acepta la forma antigua: lista de textos)
export function firmasDe(def) {
  const f = (def && def.firmas) || [];
  return f.map((x, i) => {
    if (typeof x !== 'string') return { nombre: x.nombre || '', modo: x.modo || 'usuario' };
    const n = x;
    const modo = /verific|aprob|supervis|revis/i.test(n) ? 'aprobador' : i === 0 ? 'usuario' : 'manuscrita';
    return { nombre: n, modo };
  });
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const clonar = (o) => JSON.parse(JSON.stringify(o ?? null));
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 'aaaa-mm' → 'Oct-26'
export const mesClave = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export function mesAbrev(clave) {
  if (!clave) return '—';
  const [a, m] = clave.split('-').map(Number);
  return `${MESES[m - 1]}-${String(a).slice(-2)}`;
}
export const revTxt = (n) => (n ? `${n}.0` : '—');
export const numCodigo = (codigo) => parseInt(String(codigo || '').replace(/\D/g, ''), 10) || 0;
export const formatoCodigo = (n) => `R-${String(n).padStart(3, '0')}`;
export const sistemaDeCodigo = (codigo) => {
  const n = numCodigo(codigo);
  return SISTEMAS.find(s => n >= s.desde && n <= s.hasta) || null;
};
export const codigoCompleto = (cfg, codigo) => `${cfg.prefijo}/${codigo}`;

export function siguienteCodigo(sistemaId, plantillas, excluirId = null) {
  const s = SISTEMAS.find(x => x.id === sistemaId) || SISTEMAS[0];
  const usados = new Set(plantillas.filter(p => p.id !== excluirId).map(p => numCodigo(p.codigo)));
  for (let n = s.desde; n <= s.hasta; n++) if (!usados.has(n)) return formatoCodigo(n);
  return null;
}

export function defVacia(nombre = '') {
  return {
    nombre,
    frecuencia: 'Por evento',
    orientacion: 'vertical',
    datosGenerales: { turno: true, hora: false },
    observaciones: true,
    secciones: [],
    firmas: [{ nombre: 'Ejecutado por', modo: 'usuario' }, { nombre: 'Verificado por', modo: 'aprobador' }]
  };
}

export function seccionNueva(tipo) {
  const base = { id: uid(), tipo, titulo: '' };
  if (tipo === 'campos') return { ...base, titulo: 'Datos', columnas: 0, campos: [] };
  if (tipo === 'tabla') return { ...base, titulo: 'Parámetros', fuente: 'equipos', filtro: { sistema: '', tipo: '', ubicacion: '' }, estadoEquipo: true, columnas: ['Equipo 1', 'Equipo 2'], filas: [] };
  if (tipo === 'checklist') return { ...base, titulo: 'Verificación', items: [] };
  if (tipo === 'lista') return { ...base, titulo: 'Detalle', columnas: [{ id: uid(), nombre: 'Descripción', tipo: 'texto' }, { id: uid(), nombre: 'Cantidad', tipo: 'numero' }], filasImpresas: 5 };
  return base;
}

export const campoNuevo = (tipo = 'texto') => ({ id: uid(), etiqueta: '', tipo, requerido: false, ancho: tipo === 'textoLargo' ? 2 : 1, unidad: '', min: '', max: '', opciones: [], ayuda: '', desde: '', hasta: '', filtro: { sistema: '', tipo: '' }, genera: '' });

// Tabla: si toma sus columnas de la base de equipos
// celdas de una fila de la nota de referencia ({ c: [...] }; se aceptan arreglos antiguos)
export const celdasGuia = (f) => (Array.isArray(f) ? f : (f && f.c) || []);
export const tablaDeEquipos = (s) => s.tipo === 'tabla' && s.fuente === 'equipos';
// Tabla cuya ubicación se elige al llenar
export const pideUbicacion = (def) => (def.secciones || []).some(s => tablaDeEquipos(s) && s.filtro && s.filtro.ubicacion === '*');

export function filtroTxt(f, sistemas = SISTEMAS) {
  if (!f) return '';
  const p = [];
  if (f.sistema !== '' && f.sistema != null) p.push((sistemas.find(x => x.id === Number(f.sistema)) || {}).nombre || '');
  if (f.tipo) p.push(f.tipo);
  if (f.marca) p.push(f.marca);
  if (f.ubicacion === '*') p.push('ubicación al llenar'); else if (f.ubicacion) p.push(f.ubicacion);
  return p.filter(Boolean).join(' · ');
}
export const filaNueva = () => ({ id: uid(), etiqueta: '', tipo: 'numero', unidad: '', min: '', max: '', opciones: [], requerido: true });

export function rangoTxt(x) {
  const hayMin = x.min !== '' && x.min != null, hayMax = x.max !== '' && x.max != null;
  if (hayMin && hayMax) return `${x.min} – ${x.max}`;
  if (hayMin) return `≥ ${x.min}`;
  if (hayMax) return `≤ ${x.max}`;
  return '';
}

// Revisa la definición y devuelve la lista de observaciones que impiden emitir.
export function validarDef(def) {
  const err = [];
  if (!def.nombre || !def.nombre.trim()) err.push('El formato no tiene nombre.');
  if (!def.secciones.length) err.push('Agregue al menos una sección.');
  if (def.frecuencia === 'Cada 2 horas' && !def.datosGenerales?.hora) err.push('La frecuencia "Cada 2 horas" necesita registrar la hora (Datos generales).');
  def.secciones.forEach((s, i) => {
    const t = s.titulo?.trim() || `Sección ${i + 1}`;
    if (!s.titulo?.trim()) err.push(`La sección ${i + 1} no tiene título.`);
    if (s.tipo === 'campos') {
      if (!s.campos.length) err.push(`"${t}" no tiene campos.`);
      s.campos.forEach((c, j) => {
        if (!c.etiqueta.trim()) err.push(`"${t}": el campo ${j + 1} no tiene nombre.`);
        if (c.tipo === 'seleccion' && !c.opciones.length) err.push(`"${t}": "${c.etiqueta || 'campo ' + (j + 1)}" no tiene opciones.`);
        if ((c.tipo === 'diferencia' || c.tipo === 'porcentaje') && (!c.desde || !c.hasta)) err.push(`"${t}": "${c.etiqueta || 'campo ' + (j + 1)}" debe indicar los dos campos con que se calcula.`);
        if (c.tipo === 'duracion' && (!c.desde || !c.hasta)) err.push(`"${t}": "${c.etiqueta || 'campo ' + (j + 1)}" debe indicar desde y hasta qué campo se calcula.`);
        if (c.tipo === 'numero' && c.min !== '' && c.max !== '' && Number(c.min) > Number(c.max)) err.push(`"${t}": en "${c.etiqueta}" el mínimo es mayor que el máximo.`);
      });
    }
    if (s.tipo === 'tabla') {
      if (tablaDeEquipos(s)) {
        const fl = s.filtro || {};
        if ((fl.sistema === '' || fl.sistema == null) && !fl.tipo) err.push(`"${t}": indique al menos el sistema o el tipo de equipo de las columnas.`);
      } else if (!s.columnas.length) err.push(`"${t}" no tiene columnas.`);
      if (!s.filas.length) err.push(`"${t}" no tiene parámetros.`);
      s.filas.forEach((f, j) => {
        if (!f.etiqueta.trim()) err.push(`"${t}": el parámetro ${j + 1} no tiene nombre.`);
        if (f.tipo === 'seleccion' && !f.opciones.length) err.push(`"${t}": "${f.etiqueta || 'parámetro ' + (j + 1)}" no tiene opciones.`);
        if (f.tipo === 'numero' && f.min !== '' && f.max !== '' && Number(f.min) > Number(f.max)) err.push(`"${t}": en "${f.etiqueta}" el mínimo es mayor que el máximo.`);
        if (f.tipo === 'diferencia' && (!f.desde || !f.hasta || !s.filas.some(k => k.id === f.desde) || !s.filas.some(k => k.id === f.hasta))) err.push(`"${t}": "${f.etiqueta || 'parámetro ' + (j + 1)}" debe indicar los dos parámetros con que se calcula.`);
      });
    }
    if (s.tipo === 'checklist') {
      if (!s.items.length) err.push(`"${t}" no tiene ítems.`);
      if (s.items.some(x => !x.texto.trim())) err.push(`"${t}" tiene ítems sin texto.`);
    }
    if (s.tipo === 'lista') {
      if (!s.columnas.length) err.push(`"${t}" no tiene columnas.`);
      if (s.columnas.some(x => !x.nombre.trim())) err.push(`"${t}" tiene columnas sin nombre.`);
      if (s.columnas.some(x => x.tipo === 'seleccion' && !(x.opciones || []).length)) err.push(`"${t}" tiene columnas de selección sin opciones.`);
    }
  });
  const fir = firmasDe(def);
  if (!fir.length) err.push('Agregue al menos una firma.');
  if (fir.some(f => !f.nombre.trim())) err.push('Hay firmas sin nombre.');
  if (fir.filter(f => f.modo === 'usuario').length > 1) err.push('Solo una firma puede ser la del usuario que envía.');
  if (fir.filter(f => f.modo === 'aprobador').length > 1) err.push('Solo una firma puede ser la del supervisor que aprueba.');
  return err;
}

// ---------------- formatos piloto ----------------
const c = (etiqueta, tipo, extra = {}) => ({ ...campoNuevo(tipo), etiqueta, ...extra });
const f = (etiqueta, tipo, extra = {}) => ({ ...filaNueva(), etiqueta, tipo, ...extra });
const it = (texto) => ({ id: uid(), texto });

export function pilotos() {
  const r001Falla = c('Fecha y hora de la falla', 'fechaHora', { requerido: true });
  const r001Ini = c('Inicio de la atención', 'fechaHora', { requerido: true });
  const r001Fin = c('Fin de la atención', 'fechaHora', { requerido: true });
  const FU = { nombre: 'Ejecutado por', modo: 'usuario' }, FA = { nombre: 'Verificado por', modo: 'aprobador' };

  const r001 = {
    codigo: 'R-001',
    def: {
      ...defVacia('Reporte de mantenimiento correctivo'),
      frecuencia: 'Por evento',
      datosGenerales: { turno: true, hora: false },
      secciones: [
        { id: uid(), tipo: 'campos', titulo: 'Identificación', columnas: 0, campos: [
          c('Equipo', 'equipo', { requerido: true }),
          c('Detectado por', 'texto', { requerido: true }),
          c('Descripción de la falla', 'textoLargo', { requerido: true, ancho: 2 })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Tiempos', columnas: 3, campos: [
          r001Falla, r001Ini, r001Fin,
          c('Tiempo de parada', 'duracion', { desde: r001Falla.id, hasta: r001Fin.id, ayuda: 'Desde la falla hasta el fin de la atención' }),
          c('Tiempo de reparación', 'duracion', { desde: r001Ini.id, hasta: r001Fin.id, ayuda: 'Desde el inicio hasta el fin de la atención' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Diagnóstico y trabajo realizado', columnas: 0, campos: [
          c('Causa', 'seleccion', { requerido: true, ancho: 2, opciones: ['Desgaste', 'Falta de lubricación', 'Falla eléctrica', 'Falla de operación', 'Contaminación / material extraño', 'Otra'] }),
          c('Trabajo realizado', 'textoLargo', { requerido: true, ancho: 2 })
        ] },
        { id: uid(), tipo: 'lista', titulo: 'Repuestos y materiales utilizados', filasImpresas: 4, columnas: [
          { id: uid(), nombre: 'Descripción', tipo: 'texto' },
          { id: uid(), nombre: 'Cantidad', tipo: 'numero' },
          { id: uid(), nombre: 'Unidad', tipo: 'texto' }
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Evidencias y cierre', columnas: 3, campos: [
          c('Foto antes', 'foto'),
          c('Foto después', 'foto'),
          c('¿Requiere liberación del equipo (R-002)?', 'siNo', { requerido: true, genera: 'R-002' })
        ] }
      ],
      firmas: [FU, FA]
    }
  };

  const r002 = {
    codigo: 'R-002',
    def: {
      ...defVacia('Liberación de equipo post-mantenimiento'),
      frecuencia: 'Por evento',
      datosGenerales: { turno: true, hora: false },
      secciones: [
        { id: uid(), tipo: 'campos', titulo: 'Identificación', columnas: 0, campos: [
          c('Equipo', 'equipo', { requerido: true }),
          c('Tipo de intervención', 'seleccion', { requerido: true, opciones: ['Preventivo', 'Correctivo', 'Mejora'] }),
          c('Reporte de mantenimiento relacionado', 'referencia', { ayuda: 'N° del R-001 cuando la liberación viene de un correctivo' }),
          c('Fecha y hora de liberación', 'fechaHora', { requerido: true })
        ] },
        { id: uid(), tipo: 'checklist', titulo: 'Verificación de liberación', items: [
          it('Herramientas y materiales retirados del área'),
          it('Piezas reemplazadas retiradas del área'),
          it('Sin residuos de grasa, viruta, trapos u otros materiales'),
          it('Guardas y protecciones reinstaladas'),
          it('Bloqueo y etiquetado retirados'),
          it('Lubricantes de grado alimentario donde corresponde'),
          it('Prueba de funcionamiento conforme'),
          it('Zona entregada para limpieza y desinfección')
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Evidencia', columnas: 0, campos: [
          c('Foto del equipo liberado', 'foto', { requerido: true })
        ] }
      ],
      firmas: [{ nombre: 'Entrega — Mantenimiento', modo: 'usuario' }, { nombre: 'Recibe — Área usuaria', modo: 'manuscrita' }, FA]
    }
  };

  // R-101, R-102 y R-103: un formato por sala de máquinas. Cada tipo de compresor va en su propia tabla
  // (parámetros y límites propios), con una columna por compresor tomada de la base de equipos.
  // Los límites quedan vacíos para registrarlos en el editor (mín / máx por parámetro o por compresor).
  const bar = { unidad: 'bar' }, gc = { unidad: '°C' }, opc = { requerido: false };
  const comunesFin = () => [
    f('Corriente del motor', 'numero', { unidad: 'A' }),
    f('Horómetro', 'numero', { unidad: 'h', porTurno: true }),
    f('Ruido o vibración anormal', 'seleccion', { opciones: ['No', 'Sí'] })
  ];
  // Equipos auxiliares (bombas, ventiladores, motores): si fallan, dejan fuera de servicio a los compresores.
  // Estado en cada ronda; corriente y horómetro una vez por turno. Admiten "En reserva" para el equipo de respaldo.
  const amp = () => f('Corriente', 'numero', { unidad: 'A', porTurno: true });
  const aux = (titulo, ubicacion, incluye, filas) => ({ id: uid(), tipo: 'tabla', titulo, fuente: 'equipos',
    filtro: { sistema: 1, ubicacion, incluye }, estadoEquipo: true, conReserva: true, sinEquiposOk: true, columnas: [], filas });
  const nuevaPagina = (sec) => ({ ...sec, nuevaPagina: true });   // al imprimir empieza en una hoja nueva
  const AUX = {
    bombaRef: (u, t, inc) => aux(t, u, inc, [f('Presión de descarga', 'numero', { unidad: 'bar' }), amp(), f('Horómetro', 'numero', { unidad: 'h', porTurno: true })]),
    bombaAgua: (u, t) => aux(t, u, 'bomba de agua', [f('Presión de descarga', 'numero', { unidad: 'bar' }), amp()]),
    soloAmp: (u, t, inc) => aux(t, u, inc, [amp()])
  };
  const filasPiston = ({ culatas = 0, culataMax = false, carter = false } = {}) => {
    const pS = f('Presión de succión', 'numero', bar), pA = f('Presión de aceite', 'numero', bar);
    return [
      pS, f('Presión de descarga', 'numero', bar), pA,
      f('Diferencial de presión de aceite', 'diferencia', { ...bar, desde: pA.id, hasta: pS.id }),
      f('Temperatura de descarga', 'numero', gc),
      ...Array.from({ length: culatas }, (_, k) => f(`Temperatura de culata ${k + 1}`, 'numero', gc)),
      ...(culataMax ? [f('Temperatura de culatas (la más alta)', 'numero', gc)] : []),
      ...(carter ? [f('Temperatura de aceite (cárter)', 'numero', gc)] : []),
      f('Nivel de aceite (visor)', 'seleccion', { opciones: ['Normal', 'Bajo', 'Alto'] }),
      ...comunesFin()
    ];
  };
  const filasTornillo = ({ amoniaco = false } = {}) => [
    f('Presión de succión', 'numero', bar),
    f('Presión de descarga', 'numero', bar),
    f('Presión de aceite', 'numero', bar),
    f('Temperatura de succión', 'numero', { ...gc, ...opc }),
    f('Temperatura de descarga', 'numero', gc),
    f('Temperatura de aceite', 'numero', gc),
    f('Capacidad (válvula de corredera)', 'numero', { unidad: '%', ...opc }),
    f('Nivel de aceite (separador)', 'seleccion', { opciones: ['Normal', 'Bajo', 'Alto'] }),
    ...comunesFin(),
    ...(amoniaco ? [f('Olor o fuga de amoniaco', 'seleccion', { opciones: ['No', 'Sí'] })] : [])
  ];
  const tabla = (titulo, filtro, filas) => ({ id: uid(), tipo: 'tabla', titulo, fuente: 'equipos',
    filtro: { sistema: 1, tipo: 'Compresor', ...filtro }, estadoEquipo: true, columnas: [], filas });
  const generales = (titulo, campos) => ({ id: uid(), tipo: 'campos', titulo, columnas: 3, campos });
  const sala = (codigo, nombre, secciones) => ({ codigo, def: {
    ...defVacia(nombre), frecuencia: 'Cada 2 horas', orientacion: 'vertical', recorrido: true,
    datosGenerales: { turno: true, hora: true }, secciones, firmas: [FU, FA] } });
  const SM = (n) => `Sala de Máquinas ${n}`;

  const r101 = sala('R-101', 'Parámetros de compresores — Sala de Máquinas 1', [
    tabla('Compresores de pistón Gram', { ubicacion: SM(1), marca: 'Gram' }, filasPiston({ culatas: 3, carter: true })),
    tabla('Compresores Copeland', { ubicacion: SM(1), marca: 'Copeland' }, filasPiston()),
    generales('Generales de sala', [
      c('Nivel del recibidor de líquido', 'numero', { requerido: true, unidad: '%' }),
      c('Presión de condensación', 'numero', { requerido: true, unidad: 'bar' }),
      c('Condensadores en servicio', 'numero', { requerido: true, unidad: 'und' }),
      c('Temperatura de Cámara 1', 'numero', { requerido: true, unidad: '°C' }),
      c('Temperatura de Cámara 2', 'numero', { requerido: true, unidad: '°C' })
    ]),
    nuevaPagina(AUX.bombaRef(SM(1), 'Auxiliares · Bombas de refrigerante (estación KVA)', 'bomba de refrigerante / bomba de r-22 / bomba de r22')),
    AUX.soloAmp(SM(1), 'Auxiliares · Ventiladores de condensadores Copeland', 'ventilador'),
  ]);
  const r102 = sala('R-102', 'Parámetros de compresores — Sala de Máquinas 2', [
    tabla('Compresor de pistón · productor de hielo', { ubicacion: SM(2), incluye: 'pistón / piston / hielo' }, filasPiston({ culataMax: true, carter: true })),
    tabla('Compresores de tornillo · Cámara 3', { ubicacion: SM(2), incluye: 'tornillo / cámara 3 / backup' }, filasTornillo()),
    generales('Generales de sala', [
      c('Nivel del recibidor de líquido', 'numero', { requerido: true, unidad: '%' }),
      c('Presión de condensación', 'numero', { requerido: true, unidad: 'bar' }),
      c('Temperatura de Cámara 3', 'numero', { requerido: true, unidad: '°C' })
    ]),
    nuevaPagina(AUX.bombaAgua(SM(2), 'Auxiliares · Bombas de agua (torre Cámara 3)')),
    AUX.soloAmp(SM(2), 'Auxiliares · Bombas de aceite', 'bomba de aceite'),
    AUX.soloAmp(SM(2), 'Auxiliares · Ventiladores de torre de enfriamiento', 'ventilador'),
    AUX.soloAmp(SM(2), 'Auxiliares · Motor del tambor (productor de hielo)', 'tambor'),
  ]);
  const r103 = sala('R-103', 'Parámetros de compresores — Sala de Máquinas 3', [
    tabla('Compresores de tornillo Yantai · R-22', { ubicacion: SM(3), incluye: 'yantai' }, filasTornillo()),
    tabla('Compresores de tornillo Bingshan · amoniaco', { ubicacion: SM(3), incluye: 'bingshan' }, filasTornillo({ amoniaco: true })),
    generales('Generales de sala', [
      c('Presión de condensación R-22', 'numero', { requerido: true, unidad: 'bar' }),
      c('Presión de condensación amoniaco', 'numero', { requerido: true, unidad: 'bar' }),
      c('Nivel del recibidor R-22', 'numero', { requerido: true, unidad: '%' }),
      c('Nivel del recibidor amoniaco', 'numero', { requerido: true, unidad: '%' }),
      c('Amoniaco en el ambiente (detector)', 'numero', { unidad: 'ppm' })
    ]),
    nuevaPagina(AUX.bombaRef(SM(3), 'Auxiliares · Bombas de amoniaco (estaciones Bingshan)', 'bomba de amoniaco / bomba de nh3')),
    AUX.bombaAgua(SM(3), 'Auxiliares · Bombas de agua (torres y condensadores)'),
    AUX.soloAmp(SM(3), 'Auxiliares · Bombas de aceite (Yantai)', 'bomba de aceite'),
    AUX.soloAmp(SM(3), 'Auxiliares · Ventiladores (torres y condensadores evaporativos)', 'ventilador'),
  ]);

  // R-301: viene del manual de mantenimiento (revisión 3, vigente desde junio 2026)
  const R = (min, max) => ({ min: min ?? '', max: max ?? '' });
  const mmE = c('Presión de entrada', 'numero', { requerido: true, unidad: 'bar' }), mmS = c('Presión de salida', 'numero', { requerido: true, unidad: 'bar' });
  const caE = c('Presión de entrada', 'numero', { requerido: true, unidad: 'bar' }), caS = c('Presión de salida', 'numero', { requerido: true, unidad: 'bar' });
  const alF = c('Flujo', 'numero', { requerido: true, unidad: 'm³/h' }), peF = c('Flujo', 'numero', { requerido: true, unidad: 'm³/h' });
  const r301 = {
    codigo: 'R-301',
    origenManual: { revision: 3, fecha: '2026-06' },
    def: {
      ...defVacia('Control de operación — Planta de ósmosis inversa'),
      frecuencia: 'Por turno',
      datosGenerales: { turno: true, hora: true },
      secciones: [
        { id: uid(), tipo: 'campos', titulo: 'Identificación', columnas: 2, campos: [
          c('Módulo de ósmosis', 'equipo', { requerido: true, ancho: 2, filtro: { sistema: 3, tipo: 'Unidad de ósmosis inversa' } })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Filtro multimedia', columnas: 3, campos: [
          mmE, mmS, c('Diferencial de presión', 'diferencia', { unidad: 'bar', desde: mmE.id, hasta: mmS.id, max: '1', ayuda: 'Sobre 1 bar: programar retrolavado' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Filtro cartucho', columnas: 3, campos: [
          caE, caS, c('Diferencial de presión', 'diferencia', { unidad: 'bar', desde: caE.id, hasta: caS.id, max: '1', ayuda: 'Sobre 1 bar: cambiar cartuchos' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Alimentación', columnas: 2, campos: [
          alF, c('Presión', 'numero', { requerido: true, unidad: 'bar', max: '69' })
        ] },
        { id: uid(), tipo: 'campos', titulo: 'Permeado', columnas: 3, campos: [
          peF, c('Presión', 'numero', { requerido: true, unidad: 'bar', max: '3' }),
          c('Recuperación', 'porcentaje', { unidad: '%', desde: peF.id, hasta: alF.id, min: '35', max: '45', ayuda: 'Flujo de permeado ÷ flujo de alimentación' })
        ] },
        { id: uid(), tipo: 'tabla', titulo: 'Calidad del agua', fuente: 'lista', filtro: { sistema: '', tipo: '', ubicacion: '' }, estadoEquipo: false,
          columnas: ['Alimentación', 'Permeado', 'Rechazo'], filas: [
            f('Conductividad', 'numero', { unidad: 'µS/cm', rangos: { Permeado: R('', '1000') } }),
            f('Dureza', 'numero', { unidad: 'ppm CaCO₃', rangos: { Permeado: R('', '50') } }),
            f('pH', 'numero', { rangos: { 'Alimentación': R('7', '8.5'), Permeado: R('6.5', '8.5') } }),
            f('Temperatura', 'numero', { unidad: '°C', rangos: { 'Alimentación': R('', '40') } })
          ] },
        { id: uid(), tipo: 'tabla', titulo: 'Permeado por housing', fuente: 'lista', filtro: { sistema: '', tipo: '', ubicacion: '' }, estadoEquipo: false,
          columnas: ['Housing 1', 'Housing 2', 'Housing 3', 'Housing 4', 'Housing 5'], filas: [
            f('Conductividad', 'numero', { unidad: 'µS/cm', max: '1000' }),
            f('pH', 'numero', { min: '6.5', max: '8.5' })
          ] }
      ],
      firmas: [{ nombre: 'Técnico', modo: 'usuario' }, FA]
    }
  };

  // R-302: consumo de químicos e insumos de ósmosis (alimenta el inventario de Materiales e inventario)
  // Ids fijos de secciones y columnas: el inventario los lee para calcular las salidas.
  const sel = (id, nombre, opciones, extra = {}) => ({ id, nombre, tipo: 'seleccion', opciones, ...extra });
  const r302 = {
    codigo: 'R-302',
    def: {
      ...defVacia('Control de químicos e insumos — Planta de ósmosis inversa'),
      frecuencia: 'Por evento',
      datosGenerales: { turno: true, hora: true },
      secciones: [
        { id: 'r302q', tipo: 'lista', titulo: 'Dosificación de químicos', filasImpresas: 5, guia: GUIA_DOSIFICACION, columnas: [
          sel('ins', 'Químico', QUIMICOS_OSMOSIS.map(x => x.nombre), { unidades: unidadesDe(QUIMICOS_OSMOSIS),
            sugeridos: Object.fromEntries(QUIMICOS_OSMOSIS.filter(x => x.dosis).map(x => [x.nombre, { valor: x.dosis.kg, texto: `${String(x.dosis.kg).replace('.', ',')} kg en ${x.dosis.litros} L de agua permeada` }])) }),
          sel('mod', 'Módulo', ['OI-01', 'OI-02', 'Ambos']),
          { id: 'can', nombre: 'Cantidad', tipo: 'numero', unidadDe: 'ins' },
          { id: 'obs', nombre: 'Observación', tipo: 'texto' }
        ] },
        { id: 'r302c', tipo: 'lista', titulo: 'Cambio de filtros y material filtrante', filasImpresas: 4, columnas: [
          sel('ins', 'Insumo', CONSUMIBLES_OSMOSIS.map(x => x.nombre), { unidades: unidadesDe(CONSUMIBLES_OSMOSIS) }),
          sel('mod', 'Módulo', ['OI-01', 'OI-02']),
          { id: 'can', nombre: 'Cantidad', tipo: 'numero', unidadDe: 'ins' },
          { id: 'dp', nombre: 'ΔP antes (bar)', tipo: 'numero' },
          sel('mot', 'Motivo', ['ΔP alto', 'Programado', 'Falla', 'Otro'])
        ] },
        { id: 'r302e', tipo: 'campos', titulo: 'Evidencia', columnas: 0, campos: [c('Foto del cambio (filtro o material retirado)', 'foto')] }
      ],
      firmas: [{ nombre: 'Técnico', modo: 'usuario' }, FA]
    }
  };

  return [r001, r002, r101, r102, r103, r301, r302];
}
