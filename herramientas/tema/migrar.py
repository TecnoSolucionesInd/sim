# Pasa los colores fijos pensados para fondo oscuro a su equivalente en el tema claro.
# Uso: python3 migrar.py archivo [archivo...]   (muestra lo que queda por revisar a mano)
import re, sys
TXT = {  # textos claros → oscuros
 '#8FF0DE':'#0B8C80','#C5CCFF':'#4753C4','#FFCF73':'#A8710A','#FFC36B':'#A8710A',
 '#FFB3B3':'#C23B3B','#FFD0D0':'#B03030','#FF8F8F':'#D64545','#CFF8F0':'#076B62','#FFE3AE':'#7A5200',
 '#BAC5D0':'#465662','#C3CDD8':'#465662','#D5DDE5':'#3A4955','#DDE4EB':'#3A4955','#DCE3EA':'#3A4955','#C9D2DB':'#465662','#B4C0CC':'#55646F',
 '#cfd8e3':'#3A4955','#B8C4D0':'#55646F','#9fb0c4':'#5E6D79','#9ED6FA':'#1F79B8','#9fcbff':'#1F6FC0',
 '#8B97A3':'#7A8894','#8A96A3':'#7A8894','#9AA8B6':'#6B7A88','#8b9bb0':'#6B7A88',
}
SUP = {  # superficies oscuras → claras
 '#3A4757':'#FFFFFF','#33414F':'#FFFFFF','#2A3542':'#FFFFFF','#2E3A47':'#FFFFFF',
}
def blanco(m):
    a=float(m.group(1)); 
    n = a*0.6 if a<=0.07 else a*0.85 if a<=0.3 else a
    return 'rgba(15,27,36,%s)' % (('%.3f'%n).rstrip('0').rstrip('.').lstrip('0') or '0')
def oscuro(m):
    a=float(m.group(1)); return 'rgba(15,27,36,%s)' % ('%.3f'%(a*0.1)).rstrip('0').rstrip('.').lstrip('0')
for f in sys.argv[1:]:
    s=open(f).read(); o=s
    for k,v in {**TXT,**SUP}.items(): s=re.sub(re.escape(k)+r'\b', v, s, flags=re.I)
    # tarjeta: fondo y borde translúcidos → tarjeta blanca con sombra
    s=re.sub(r'background:rgba\(255,255,255,\.0[4-6]\d*\);border:1px solid rgba\(255,255,255,\.(?:08|1|12)\)', 'background:#FFFFFF;border:1px solid var(--line);box-shadow:var(--sombra)', s)
    s=re.sub(r'rgba\(255,\s*255,\s*255,\s*([0-9.]+)\)', blanco, s)
    s=re.sub(r'rgba\(14,\s*22,\s*30,\s*([0-9.]+)\)', oscuro, s)
    s=re.sub(r'rgba\((?:46,58,71|42,53,66|36,46,57),\s*[0-9.]+\)', 'rgba(255,255,255,.94)', s)
    s=re.sub(r'rgba\(6,12,18,\s*[0-9.]+\)', 'rgba(15,27,36,.28)', s)
    if 'sim.css">' in s and 'tema-claro.css' not in s:
        s=re.sub(r'(<link rel="stylesheet" href="((?:\.\./)+)core/sim\.css">)', r'\1\n<link rel="stylesheet" href="\2core/tema-claro.css">', s)
    if s!=o: open(f,'w').write(s)
    rest=sorted(set(re.findall(r'#fff\b|#ffffff\b|#F[0-9A-F]F[0-9A-F]F[0-9A-F]\b|#[EF][0-9A-F]{5}\b|rgba?\(0,\s*0,\s*0[^)]*\)', s, flags=re.I)))
    print(f, 'cambiado' if s!=o else 'igual', '| revisar:', rest)
