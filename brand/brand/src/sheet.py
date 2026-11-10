import re, cairosvg
from brand import *
def place(svg,x,y,w=None,h=None):
    svg=svg.replace('<svg ',f'<svg x="{x}" y="{y}" '+(f'width="{w}" ' if w else '')+(f'height="{h}" ' if h else ''),1)
    if w: svg=re.sub(r'(<svg[^>]*?) width="[\d.]+"(.*?) width="',r'\1\2 width="',svg,1) if False else svg
    return svg
def sized(svg,w,h):
    svg=re.sub(r' width="[\d.]+"','',svg,count=1); svg=re.sub(r' height="[\d.]+"','',svg,count=1)
    return svg.replace('<svg ',f'<svg width="{w}" height="{h}" ',1)
W=1800; RH=300; H=110+RH*3+20
o=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#EFE6D8"/>',
   '<text x="40" y="62" font-family="Plus Jakarta Sans" font-weight="800" font-size="34" fill="#2A1F17">kolo · logo options</text>',
   '<text x="430" y="62" font-family="Plus Jakarta Sans" font-weight="500" font-size="20" fill="#6E5F50">lockup on light · lockup on dark · mark · app icon at 64px and 32px (actual size)</text>']
for i,k in enumerate("ABC"):
    y=100+i*RH
    o.append(f'<rect x="20" y="{y}" width="{W-40}" height="{RH-20}" rx="18" fill="#FFFFFF"/>')
    o.append(f'<text x="44" y="{y+44}" font-family="Plus Jakarta Sans" font-weight="800" font-size="24" fill="#2A1F17">{k} · {NAMES[k]}{"  — recommended" if k=="A" else ""}</text>')
    o.append(f'<rect x="40" y="{y+64}" width="560" height="190" rx="12" fill="#FBF6EE"/>')
    s,vw,vh=lockup_svg(k,"light"); sc=2.6; o.append(sized(s.replace('<svg ',f'<svg x="{320-vw*sc/2:.0f}" y="{y+159-vh*sc/2:.0f}" ',1),vw*sc,vh*sc))
    o.append(f'<rect x="620" y="{y+64}" width="560" height="190" rx="12" fill="#2A1F17"/>')
    s,vw,vh=lockup_svg(k,"dark"); o.append(sized(s.replace('<svg ',f'<svg x="{900-vw*sc/2:.0f}" y="{y+159-vh*sc/2:.0f}" ',1),vw*sc,vh*sc))
    o.append(sized(mark_svg(k,"light").replace('<svg ',f'<svg x="1210" y="{y+79}" ',1),160,160))
    o.append(sized(icon_svg(k).replace('<svg ',f'<svg x="1410" y="{y+127}" ',1),64,64))
    o.append(sized(icon_svg(k).replace('<svg ',f'<svg x="1500" y="{y+143}" ',1),32,32))
    o.append(f'<rect x="1560" y="{y+64}" width="200" height="190" rx="12" fill="#2A1F17"/>')
    o.append(sized(icon_svg(k).replace('<svg ',f'<svg x="1580" y="{y+127}" ',1),64,64))
    o.append(sized(icon_svg(k).replace('<svg ',f'<svg x="1670" y="{y+143}" ',1),32,32))
    o.append(f'<text x="1410" y="{y+236}" font-family="Plus Jakarta Sans" font-size="15" fill="#6E5F50">64 · 32</text>')
o.append('</svg>')
cairosvg.svg2png(bytestring="".join(o).encode(),write_to=f"{OUT}/kolo_logo_options.png")
print("sheet ok")
