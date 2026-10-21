// Plan de mantenimiento — módulo Plan preventivo (estructura inicial)
const I = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const BLOQUES = [
  { c: '#3bb4e5', i: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3', t: 'Rutinas por equipo',
    d: 'Cada equipo de la base maestra con sus rutinas: inspección, lubricación, ajuste, cambio de componentes, con su procedimiento y formato asociado.' },
  { c: '#2ec4a6', i: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', t: 'Frecuencias y calendario anual',
    d: 'Frecuencia por tiempo (semanal, mensual, trimestral…) u horas de operación. Calendario de 12 meses con la carga de trabajo por semana.' },
  { c: '#f5b54a', i: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', t: 'Ejecución y cumplimiento',
    d: 'Registro de lo ejecutado contra lo programado, reprogramaciones y porcentaje de cumplimiento mensual por sistema y por equipo.' },
  { c: '#a9b4ff', i: 'M4 12h16M14 6l6 6-6 6', t: 'Integración',
    d: 'Las rutinas del periodo pasan a la programación quincenal y a los programas de trabajo; los hallazgos generan órdenes de trabajo.' }
];
export function montar(ctx) {
  ctx.main.innerHTML = `<div class="pp">
    <div class="pp-top"><div><div class="eyebrow">Plan de mantenimiento</div><h1 class="h-display">Plan de mantenimiento preventivo</h1>
      <p class="muted" style="margin:10px 0 0;font-size:14px">Rutinas periódicas por equipo, calendario anual y cumplimiento.</p></div>
      <span class="pill" style="background:rgba(245,185,74,.16);color:#FFCF73">En preparación</span></div>
    <div class="pp-prev">${BLOQUES.map((b, k) => `<div class="pp-card rise d${k + 1}" style="--c:${b.c}">
      <div class="ic" style="color:${b.c};background:${b.c}22;border:1px solid ${b.c}55">${I(b.i)}</div>
      <h3>${b.t}</h3><p>${b.d}</p></div>`).join('')}</div>
    <div class="pp-card rise d5" style="margin-top:14px;display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      <div style="flex:1;min-width:240px"><b style="font-family:var(--f-display)">Base de partida</b>
        <div class="muted" style="font-size:13.5px;margin-top:4px">Equipos registrados en el aplicativo Equipos y frecuencias del manual de mantenimiento.</div></div>
      <a class="btn pp-btn" href="#programas">Ir a Programas de trabajo</a></div></div>`;
}
