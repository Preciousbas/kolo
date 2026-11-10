# Kolo brand builder: hand-written SVG marks + Plus Jakarta Sans 800 wordmark converted to paths (fontTools + skia-pathops)
import math, os, cairosvg, pathops
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
INK="#2A1F17"; CREAM="#FBF6EE"; CLAY="#A9441C"; CLAY_D="#E07A4B"; GOLD="#E2A93B"
font=TTFont(os.path.join(os.path.dirname(__file__),'pjs800.ttf')); gs=font.getGlyphSet(); cmap=font.getBestCmap(); hm=font['hmtx']
UPM=1000; XH=536
def word(text, xh=30, x0=0, baseline=0, track=-0.01):
    s=xh/XH; x=0; P=None
    for ch in text:
        g=cmap[ord(ch)]; gp=pathops.Path()
        gs[g].draw(TransformPen(gp.getPen(),(s,0,0,-s,x0+x*s,baseline))); gp.simplify(fix_winding=True)
        P=gp if P is None else pathops.op(P,gp,pathops.PathOp.UNION,fix_winding=True)
        x+=hm[g][0]+track*UPM
    pen=SVGPathPen(None, ntos=lambda v: ('%.2f'%v).rstrip('0').rstrip('.')); P.draw(pen)
    lsb_first=hm[cmap[ord(text[0])]][1]*s
    return pen.getCommands(), x*s - track*UPM*s
def arc(cx,cy,r,a0,a1):
    p=lambda a:(cx+r*math.cos(math.radians(a)),cy+r*math.sin(math.radians(a)))
    (x0,y0),(x1,y1)=p(a0),p(a1); large=1 if (a1-a0)%360>180 else 0
    return f'M{x0:.2f} {y0:.2f} A{r} {r} 0 {large} 1 {x1:.2f} {y1:.2f}'
# ---- marks on a 64 grid. Placeholders: INK (main), HI (your-turn highlight), PAPER (knock-out)
def mark_A():  # "Round the pot": six members seated round the pot, one highlighted = whose turn it is
    s=['<circle cx="32" cy="32" r="10.5" fill="HI"/>']
    for i in range(6):
        a=math.radians(-90+60*i); x=32+23*math.cos(a); y=32+23*math.sin(a)
        s.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{7.2 if i==1 else 6}" fill="{"GOLD" if i==1 else "INK"}"/>')
    return "".join(s)
def mark_B():  # "The kolo": a clay savings pot; the slot on top is where everyone's share goes in
    return ('<path d="M20 9 H44 A3 3 0 0 1 47 12 V15 A3 3 0 0 1 44 18 H42.5 C52 22 58 30 58 39 C58 52 46 60 32 60 C18 60 6 52 6 39 C6 30 12 22 21.5 18 H20 A3 3 0 0 1 17 15 V12 A3 3 0 0 1 20 9 Z" fill="HI"/>'
            '<rect x="25" y="12" width="14" height="3" rx="1.5" fill="PAPER"/>'
            '<path d="'+arc(32,40,10.5,15,305)+'" fill="none" stroke="PAPER" stroke-width="4.5" stroke-linecap="round"/>'
            '<circle cx="'+f'{32+10.5*math.cos(math.radians(-20)):.2f}'+'" cy="'+f'{40+10.5*math.sin(math.radians(-20)):.2f}'+'" r="4.2" fill="GOLD"/>')
def mark_C():  # "Your turn": the circle as five rounds; one segment lifted out in clay = your payout
    s=[]; n=5; gap=34
    for i in range(n):
        a0=-90+i*72+gap/2; a1=-90+(i+1)*72-gap/2
        col="HI" if i==0 else "INK"; r=24 if i else 24
        s.append(f'<path d="{arc(32,32,r,a0,a1)}" fill="none" stroke="{col}" stroke-width="10" stroke-linecap="round"/>')
    s.append('<circle cx="32" cy="32" r="5" fill="GOLD"/>')
    return "".join(s)
MARKS={"A":mark_A,"B":mark_B,"C":mark_C}
NAMES={"A":"Round the pot","B":"The kolo","C":"Your turn"}
def col(s,mode):
    ink,hi,paper=(INK,CLAY,CREAM) if mode=="light" else (CREAM,CLAY_D,INK)
    return s.replace("INK",ink).replace("HI",hi).replace("PAPER",paper).replace("GOLD",GOLD)
def mark_svg(k,mode,size=64):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">{col(MARKS[k](),mode)}</svg>'
def icon_svg(k,size=64):  # app icon: clay tile, cream mark
    hi={"A":CREAM,"B":CREAM,"C":GOLD}[k]
    body=MARKS[k]().replace("INK",CREAM).replace("HI",hi).replace("PAPER",CLAY).replace("GOLD",GOLD)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">'
            f'<rect width="64" height="64" rx="14" fill="{CLAY}"/><g transform="translate(32 32) scale(0.8) translate(-32 -32)">{body}</g></svg>')
def lockup_svg(k,mode,pad=6):
    wp,adv=word("kolo",xh=30,x0=78,baseline=32+15)
    ink=INK if mode=="light" else CREAM
    W=78+adv; vw=W+2*pad; vh=64+2*pad
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {vw:.2f} {vh}" width="{vw:.2f}" height="{vh}">'
            f'{col(MARKS[k](),mode)}<path d="{wp}" fill="{ink}"/></svg>'), vw, vh
def png(svg,path,w=None,h=None): cairosvg.svg2png(bytestring=svg.encode(),write_to=path,output_width=w,output_height=h)
if __name__=="__main__":
    for k in "ABC":
        d=os.path.join(OUT,f"option_{k}"); os.makedirs(d,exist_ok=True)
        for mode in ("light","dark"):
            s,vw,vh=lockup_svg(k,mode)
            # light lockup = for light backgrounds (ink wordmark); dark lockup = for dark backgrounds (cream wordmark)
            open(f"{d}/kolo_logo_{mode}.svg","w").write(s); png(s,f"{d}/kolo_logo_{mode}_1024.png",w=1024)
            m=mark_svg(k,mode); suf="" if mode=="light" else "_dark"
            open(f"{d}/kolo_mark{suf}.svg","w").write(m); png(m,f"{d}/kolo_mark{suf}_1024.png",1024,1024)
        ic=icon_svg(k); open(f"{d}/kolo_appicon.svg","w").write(ic)
        png(ic,f"{d}/kolo_appicon_1024.png",1024,1024); png(ic,f"{d}/kolo_appicon_64.png",64,64); png(ic,f"{d}/kolo_appicon_32.png",32,32)
    print("ok")
