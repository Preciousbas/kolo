# Final brand assets for chosen logo A "Round the pot" -> brand/final/
import os, io, math, json, base64, shutil
from PIL import Image
from brand import *
F=os.path.join(OUT,"final"); os.makedirs(F,exist_ok=True)
def w(name,s): open(os.path.join(F,name),"w").write(s)
K="A"
# lockups
for mode in ("light","dark"):
    s,vw,vh=lockup_svg(K,mode); w(f"kolo_lockup_{mode}.svg",s); png(s,f"{F}/kolo_lockup_{mode}_1024.png",w=1024)
# wordmark only
wp,adv=word("kolo",xh=30,x0=0,baseline=47)
pad=6
w("kolo_wordmark.svg",f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {adv+2*pad:.2f} {64+2*pad}" width="{adv+2*pad:.2f}" height="{64+2*pad}"><path d="{wp}" fill="{INK}"/></svg>')
w("kolo_mark.svg",mark_svg(K,"light")); w("kolo_mark_dark.svg",mark_svg(K,"dark"))
# app icons
body=MARKS[K]().replace("INK",CREAM).replace("HI",CREAM).replace("GOLD",GOLD)
def tile(scale,rx=14,size=64):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">'
            f'<rect width="64" height="64" rx="{rx}" fill="{CLAY}"/><g transform="translate(32 32) scale({scale}) translate(-32 -32)">{body}</g></svg>')
icon=tile(0.8); w("icon.svg",icon)
png(icon,f"{F}/icon-512.png",512,512); png(icon,f"{F}/icon-192.png",192,192)
# apple: full-bleed opaque square (iOS applies its own mask)
png(tile(0.72,rx=0),"/tmp/apple.png",180,180)
Image.open("/tmp/apple.png").convert("RGB").save(f"{F}/apple-touch-icon.png")
# maskable: full bleed, mark radius 30.2*0.7=21.1u of 32u -> 66% of half-width (safe zone = 80% diameter)
png(tile(0.7,rx=0),"/tmp/mask.png",512,512); Image.open("/tmp/mask.png").convert("RGB").save(f"{F}/maskable-512.png")
# favicon: 16px simplified = pot + gold seat only; 32/48 full mark
simp=(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="{CLAY}"/>'
      f'<circle cx="28" cy="36" r="15" fill="{CREAM}"/><circle cx="46.5" cy="17.5" r="10" fill="{GOLD}"/></svg>')
w("favicon-16-simplified.svg",simp)
png(simp,"/tmp/f16.png",16,16); png(tile(0.84,rx=12),"/tmp/f32.png",32,32); png(tile(0.84,rx=12),"/tmp/f48.png",48,48)
shutil.copy("/tmp/f32.png",f"{F}/favicon-32.png")
ims=[Image.open(f"/tmp/f{n}.png").convert("RGBA") for n in (16,32,48)]
ims[2].save(f"{F}/favicon.ico",format="ICO",sizes=[(16,16),(32,32),(48,48)],append_images=ims[:2])
# manifest
w("site.webmanifest",json.dumps({"name":"Kolo","short_name":"Kolo","description":"Your savings circle, with a memory","start_url":"/","display":"standalone",
 "theme_color":CLAY,"background_color":CREAM,"icons":[{"src":"/icon-192.png","sizes":"192x192","type":"image/png"},
 {"src":"/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]},indent=2)+"\n")
print("ok")
