# Shared layout + render helpers for Kolo video frames (1920x1080). Tokens = brand/tokens.
import math, os
from playwright.sync_api import sync_playwright
ROOT="/workspace/kolo-design"; V=ROOT+"/video"
BG="#FBF6EE"; S2="#F4ECDF"; INK="#2A1F17"; MUTED="#6E5F50"; BORDER="#E6D9C6"; CLAY="#A9441C"; SOFT="#F7E3D6"
ACC="#2B4A7A"; ACCS="#E4EAF4"; OK="#2E7048"; OKS="#E2F0E6"; WARN="#9A5B00"; WARNS="#FBEBCF"; GOLD="#E2A93B"
LOCK="file://"+ROOT+"/brand/final/kolo_lockup_light.svg"; MARK="file://"+ROOT+"/brand/final/kolo_mark.svg"
# phone geometry (screen area is where recordings go)
PX,PY,BZ=240,67,18; SW,SH=420,909; SX,SY=PX+BZ,PY+BZ; K=SW/390; SR=46
CSS=f"""*{{box-sizing:border-box}}body{{margin:0;width:1920px;height:1080px;overflow:hidden;position:relative;background:{BG};
font-family:'Plus Jakarta Sans',sans-serif;color:{INK};-webkit-font-smoothing:antialiased;font-feature-settings:'tnum' 1}}
.abs{{position:absolute}}.tag{{font-size:22px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:{CLAY}}}
.h{{font-weight:800;letter-spacing:-0.02em}}.m{{color:{MUTED}}}"""
def ring(cx,cy,R,op=1,seat=True,col=INK,pot=CLAY):
    r=R/23*6; s=f'<svg class="abs" style="left:{cx-R*1.5}px;top:{cy-R*1.5}px;opacity:{op}" width="{R*3}" height="{R*3}" viewBox="{cx-R*1.5} {cy-R*1.5} {R*3} {R*3}">'
    s+=f'<circle cx="{cx}" cy="{cy}" r="{R/23*10.5}" fill="{pot}"/>'
    for i in range(6):
        a=math.radians(-90+60*i); s+=f'<circle cx="{cx+R*math.cos(a):.1f}" cy="{cy+R*math.sin(a):.1f}" r="{r*1.2 if (i==1 and seat) else r:.1f}" fill="{GOLD if (i==1 and seat) else col}"/>'
    return s+'</svg>'
def page(body,bg=BG): return f'<html><head><style>{CSS}</style></head><body style="background:{bg}">{body}</body></html>'
def phone(img=None,placeholder=True):
    inner=(f'<img src="file://{img}" style="width:100%;display:block">' if img else
           (f'<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:repeating-linear-gradient(45deg,{S2} 0 18px,#EFE5D5 18px 36px);color:{MUTED};font-size:22px;font-weight:700;text-align:center">'
            f'<div style="font-size:30px;color:{INK}">Drop recording here</div>420 × 909 px · x {SX} y {SY}<br>scale a 780×1688 capture to 53.85%</div>' if placeholder else ''))
    return (f'<div class="abs" style="left:{PX}px;top:{PY}px;width:{SW+2*BZ}px;height:{SH+2*BZ}px;border-radius:{SR+BZ}px;background:{INK};box-shadow:0 40px 80px -30px rgba(42,31,23,.45)"></div>'
            f'<div class="abs" style="left:{SX}px;top:{SY}px;width:{SW}px;height:{SH}px;border-radius:{SR}px;overflow:hidden;background:{BG}">{inner}</div>')
def chapters(cur,x,y,size=16,gap=18):
    s=f'<div class="abs" style="left:{x}px;top:{y}px;display:flex;align-items:center;gap:{gap}px">'
    for i in range(1,6):
        if i==cur: s+=f'<i style="display:block;width:{size*1.5}px;height:{size*1.5}px;border-radius:50%;background:{GOLD}"></i>'
        else: s+=f'<i style="display:block;width:{size}px;height:{size}px;border-radius:50%;background:{INK if i<cur else "transparent"};border:2.5px solid {INK if i<cur else BORDER}"></i>'
    return s+'</div>'
def scr(x,y): return SX+x*K, SY+y*K   # map 390-space screen point -> canvas
def callout(text,tag,lx,ly,tx,ty,w=470,tone=ACC,soft=ACCS,side="left"):
    # label card at (lx,ly) top-left, arrow to target (tx,ty)
    h=112; ax=lx if side=="left" else lx+w; ay=ly+h/2
    cx=(ax+tx)/2; cy=min(ay,ty)-60
    ang=math.atan2(ty-cy,tx-cx); L=22; ox,oy=tx,ty; tx=tx-62*math.cos(ang); ty=ty-62*math.sin(ang)
    p1=(tx-L*math.cos(ang-0.45),ty-L*math.sin(ang-0.45)); p2=(tx-L*math.cos(ang+0.45),ty-L*math.sin(ang+0.45))
    arrow=(f'<svg class="abs" style="left:0;top:0" width="1920" height="1080"><path d="M{ax} {ay} Q{cx} {cy} {tx} {ty}" fill="none" stroke="{CLAY}" stroke-width="5" stroke-linecap="round"/>'
           f'<path d="M{p1[0]:.1f} {p1[1]:.1f} L{tx} {ty} L{p2[0]:.1f} {p2[1]:.1f}" fill="none" stroke="{CLAY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
           f'<rect x="{ox-70}" y="{oy-26}" width="140" height="52" rx="26" fill="none" stroke="{CLAY}" stroke-width="3" stroke-dasharray="8 7"/></svg>')
    card=(f'<div class="abs" style="left:{lx}px;top:{ly}px;width:{w}px;min-height:{h}px;background:#fff;border:2px solid {BORDER};border-radius:22px;padding:18px 24px;box-shadow:0 18px 40px -18px rgba(42,31,23,.35);display:flex;gap:16px;align-items:center">'
          f'<img src="{MARK}" style="width:44px;height:44px;flex:none"><div><div style="font-size:16px;font-weight:800;letter-spacing:.12em;color:{tone};text-transform:uppercase">{tag}</div>'
          f'<div style="font-size:28px;font-weight:800;line-height:34px;margin-top:2px">{text}</div></div></div>')
    return arrow+card
def lower_third(text,tag="Good to know",x=96,y=900,w=None,tone=WARN,soft=WARNS):
    ws=f"width:{w}px;" if w else ""
    return (f'<div class="abs" style="left:{x}px;top:{y}px;{ws}display:flex;align-items:stretch;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(42,31,23,.4);border:2px solid {BORDER}">'
            f'<div style="background:{tone};color:#fff;font-size:18px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:0 22px;display:flex;align-items:center">{tag}</div>'
            f'<div style="background:#fff;font-size:30px;font-weight:700;padding:20px 28px">{text}</div></div>')
class R:
    def __enter__(self):
        self.p=sync_playwright().start(); self.b=self.p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--allow-file-access-from-files"])
        self.pg=self.b.new_page(viewport={"width":1920,"height":1080}); return self
    def shot(self,html,out,transparent=False,wait=250):
        f="/tmp/kv_page.html"; open(f,"w").write(html); self.pg.goto("file://"+f); self.pg.wait_for_timeout(wait)
        self.pg.screenshot(path=out,omit_background=transparent)
    def __exit__(self,*a): self.b.close(); self.p.stop()
