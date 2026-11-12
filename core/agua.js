// Agua de planta: pozos de agua producto de ósmosis, módulos y consumo de producción congelado.
// Compartido por el formato R-303 (Registro de formatos) y el aplicativo Agua de planta.

export const POZOS = [
  { id: 'p1', nombre: 'Pozo 1', largo: 10.57, ancho: 5.87, alto: 2.37 },
  { id: 'p2', nombre: 'Pozo 2', largo: 10.57, ancho: 5.87, alto: 2.37 },
  { id: 'p3', nombre: 'Pozo 3', largo: 12.14, ancho: 10.76, alto: 2.144 }
];
export const MODULOS = [
  { id: 'm1', nombre: 'OI-01', caudal: 12.5 },
  { id: 'm2', nombre: 'OI-02', caudal: 12.5 }
];
// Retrolavado: veces por día y minutos por vez (cada módulo)
export const RETROLAVADO = { veces: 4, minutos: 35 };
export const PARAM_BASE = {
  pozos: POZOS, modulos: MODULOS, retrolavado: RETROLAVADO,
  umbral: 85,          // % de la producción teórica por debajo del cual se alerta
  reservaPct: 2,       // % del volumen total que no se usa (succión de bombas)
  alertaHoras: 24,     // autonomía por debajo de la cual se alerta para programar cisternas
  criticoHoras: 12
};

export const area = (p) => p.largo * p.ancho;
export const capacidad = (p) => area(p) * p.alto;
export const redondear = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
// fracción del día que produce un módulo descontando los retrolavados
export const disponibilidad = (r = RETROLAVADO) => 1 - (r.veces * r.minutos) / 1440;
export const teoricoDia = (m, r = RETROLAVADO) => m.caudal * 24 * disponibilidad(r);

// Ids fijos de los campos del R-303 (el aplicativo Agua de planta los lee).
// Caudalímetros mecánicos (totalizador): en cada muestra se anota lectura y hora inicial y final;
// lo producido es final − inicial y el caudal, lo producido ÷ horas entre ambas lecturas.
// Ósmosis: un solo caudalímetro para los dos módulos.
export const R303 = {
  altura: (p) => `${p}h`, volumen: (p) => `${p}v`, estado: (m) => `${m}e`, destino: 'dst',
  medidor: {
    o: { tIni: 'oTi', lIni: 'oLi', tFin: 'oTf', lFin: 'oLf', vol: 'oV', dur: 'oD', q: 'oQ' },   // producción de ósmosis
    c: { tIni: 'cTi', lIni: 'cLi', tFin: 'cTf', lFin: 'cLf', vol: 'cV', dur: 'cD', q: 'cQ' }    // consumo de producción congelado
  }
};
export const ESTADOS_MODULO = ['Produciendo', 'Retrolavado', 'Parado'];
export const DESTINOS = ['Pozos 1 y 2', 'Pozo 3'];
