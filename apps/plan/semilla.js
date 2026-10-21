// Parada inicial: Planta de Hielo 2026 (programa vigente y línea base)
export const PARADA_HIELO = {
  nombre: 'Parada de Planta de Hielo 2026',
  planta: 'Planta de hielo',
  desde: '2026-08-24',
  hasta: '2026-11-30',
  estado: 'activa'
};

const A = (n, nom, fase, resp, ini, fin, av, extra = {}) =>
  ({ n, nom, fase, resp, ini, fin, ini_b: ini, fin_b: fin, av, obs: '', ...extra });

export const ACTIVIDADES_HIELO = [
  A(1, 'Reparación de poza N.° 1 de salmuera', 'Obra civil', 'COREFI', '2026-09-02', '2026-10-30', 70,
    { fin_b: '2026-09-30', obs: 'Cierre reprogramado al 30/10/2026.' }),
  A(2, 'Desmontaje de 04 volteadoras de hielo', 'Desmontaje', 'Frigorista', '2026-09-03', '2026-09-03', 100),
  A(3, 'Desmontaje de tina de llenado de cubetas de agua – poza 04', 'Desmontaje', 'Frigorista', '2026-09-03', '2026-09-03', 100),
  A(4, 'Desmontaje de tinas de llenado de cubetas 1, 2 y 3', 'Desmontaje', 'Frigorista', '2026-09-04', '2026-09-04', 100),
  A(5, 'Desmontaje de 04 bases de volteadoras', 'Desmontaje', 'Frigorista', '2026-09-05', '2026-09-05', 100),
  A(6, 'Desmontaje de 04 bombas de llenado de cubetas', 'Desmontaje', 'Frigorista', '2026-09-05', '2026-09-05', 100),
  A(7, 'Drenaje de agua de poza principal para trabajos de demolición', 'Desmontaje', 'Frigorista', '2026-09-07', '2026-09-07', 100),
  A(8, 'Mantenimiento de techo de condensador evaporativo N.° 01', 'Mantenimiento', 'Frigorista', '2026-09-10', '2026-09-14', 100),
  A(9, 'Desmontaje de molinos de hielo', 'Desmontaje', 'Frigorista', '2026-09-11', '2026-09-11', 100),
  A(10, 'Pintado de estructura de techo de condensador evaporativo N.° 01', 'Pintado', 'Frigorista', '2026-09-12', '2026-09-12', 100),
  A(11, 'Mantenimiento de techo de condensador evaporativo N.° 02', 'Mantenimiento', 'Frigorista', '2026-09-10', '2026-09-14', 100),
  A(12, 'Mantenimiento interior de condensador evaporativo N.° 01', 'Mantenimiento', 'Frigorista', '2026-09-18', '2026-09-21', 100),
  A(13, 'Pintado interno de condensador evaporativo N.° 01', 'Pintado', 'Frigorista', '2026-09-19', '2026-09-19', 100),
  A(14, 'Evacuación de motores de agitadores de las 4 pozas', 'Desmontaje', 'Frigorista', '2026-09-20', '2026-09-22', 100),
  A(15, 'Pintado de líneas de líquido de sala de máquinas', 'Pintado', 'Frigorista', '2026-09-21', '2026-09-23', 100),
  A(16, 'Pintado de vigas y estructuras externas – zona de condensadores evaporativos', 'Pintado', 'Frigorista', '2026-10-02', '2026-10-05', 100),
  A(17, 'Mantenimiento preventivo de 09 motores eléctricos', 'Mantenimiento', 'Externo', '2026-10-22', '2026-10-29', 0),
  A(18, 'Mantenimiento preventivo / correctivo de 02 molinos de hielo', 'Mantenimiento', 'Externo', '2026-10-23', '2026-10-30', 0),
  A(19, 'Desmontaje de 04 tecles eléctricos', 'Desmontaje', 'Frigorista', '2026-10-22', '2026-10-23', 0),
  A(20, 'Mantenimiento preventivo de 04 tecles eléctricos', 'Mantenimiento', 'Externo', '2026-10-26', '2026-11-05', 0),
  A(21, 'Instalación de motores de agitadores de 4 pozas', 'Montaje', 'Frigorista', '2026-11-02', '2026-11-04', 0),
  A(22, 'Instalación de tecles eléctricos', 'Montaje', '', '', '', 0),
  A(23, 'Instalación de volteadoras', 'Montaje', '', '', '', 0),
  A(24, 'Instalación de llenadores de cubetas', 'Montaje', '', '', '', 0),
  A(25, 'Instalación de bombas de llenadores', 'Montaje', '', '', '', 0),
  A(26, 'Instalación de molinos de hielo', 'Montaje', '', '', '', 0)
];
