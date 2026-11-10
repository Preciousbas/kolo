# Hero before->after insert (4s) and animated end card (4s). HTML driven by set(t), screenshot per frame -> ffmpeg.
from common import *
import subprocess, shutil, math
FPS=30; OUT=V+"/mp4/"
JS="""<script>
const c=x=>Math.max(0,Math.min(1,x)), seg=(t,a,b)=>c((t-a)/(b-a)), oc=x=>1-Math.pow(1-x,3), ob=(x,s=1.7)=>{x-=1;return 1+(s+1)*x*x*x+s*x*x};
const $=id=>document.getElementById(id);
function fade(id,t,a,b,dy=24){const p=oc(seg(t,a,b));$(id).style.opacity=p;$(id).style.transform=`translateY(${(1-p)*dy}px)`}
</script>"""
def hero():
    body=(f'<div class="abs tag" style="left:120px;top:90px">03 · What Kolo learned</div>'+chapters(3,120,50,14,14)+
      f'<img class="abs" src="{LOCK}" style="right:96px;top:72px;height:52px">'
      f'<div id="card" class="abs" style="left:310px;top:200px;width:1300px;background:#fff;border:3px solid {BORDER};border-radius:40px;box-shadow:0 40px 80px -40px rgba(42,31,23,.45);overflow:hidden">'
      f'<div style="padding:44px 56px 36px"><div style="display:flex;justify-content:space-between;font-size:24px;font-weight:800;letter-spacing:.12em;color:{ACC}"><span>KOLO NOTICED</span><span style="color:{MUTED};letter-spacing:0">28 Oct · round 3</span></div>'
      f'<div class="h" style="font-size:56px;line-height:66px;margin-top:14px">Tunde paid late 3 rounds running, always on the 27th</div>'
      f'<div class="m" style="font-size:26px;font-weight:600;margin-top:12px">From Tunde’s payments, rounds 1–3</div></div>'
      f'<div style="background:{S2};padding:36px 56px 40px;border-top:2px solid {BORDER}">'
      f'<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:24px;font-weight:800;letter-spacing:.12em;color:{MUTED}">SO KOLO CHANGED</span>'
      f'<span id="pill" style="font-size:24px;font-weight:800;color:{CLAY};background:{SOFT};border:2px solid #EBC3AA;border-radius:99px;padding:8px 20px">Reminder moved</span></div>'
      f'<div style="display:flex;align-items:center;gap:40px;margin-top:30px">'
      f'<div id="before" style="position:relative;flex:1;height:120px;border-radius:99px;background:#EFE5D5;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:800">25th · 9:00'
      f'<div id="strike" style="position:absolute;left:12%;top:50%;height:7px;border-radius:4px;background:{CLAY};width:0"></div></div>'
      f'<svg id="arrow" width="90" height="60" viewBox="0 0 90 60"><path id="ap" d="M6 30 H78 M58 10 L80 30 L58 50" fill="none" stroke="{CLAY}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1"/></svg>'
      f'<div style="position:relative;flex:1;height:120px"><div id="slot" style="position:absolute;inset:0;border-radius:99px;border:4px dashed {BORDER}"></div>'
      f'<div id="after" style="position:absolute;inset:0;border-radius:99px;background:{CLAY};color:#fff;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:800;opacity:0">27th · 8:00</div></div></div>'
      f'<div id="cap" style="font-size:30px;font-weight:700;margin-top:28px;opacity:0">Tunde’s reminder now lands on his payday.</div></div>'
      f'<div id="foot" style="display:flex;justify-content:space-between;align-items:center;padding:24px 56px;border-top:2px solid {BORDER};opacity:0">'
      f'<span style="font-size:26px;font-weight:700;color:{ACC};text-decoration:underline;text-underline-offset:6px">Saved securely ↗</span>'
      f'<span style="font-size:26px;font-weight:700;border:2px solid {BORDER};border-radius:99px;padding:8px 24px">↶ Undo</span></div></div>'
      +JS+"""<script>function set(t){
fade('card',t,0,0.45,40);
const s=oc(seg(t,0.9,1.4)); $('strike').style.width=(76*s)+'%'; $('before').style.color=`rgba(42,31,23,${1-0.55*s})`;
$('ap').style.strokeDashoffset=1-oc(seg(t,1.35,1.75));
const a=seg(t,1.7,2.15); $('after').style.opacity=Math.min(1,a*3); $('after').style.transform=`scale(${a>0?0.6+0.4*ob(a,2.2):0.6})`;
$('slot').style.opacity=1-a; const g=seg(t,2.1,2.6); $('after').style.boxShadow=`0 0 0 ${18*Math.sin(Math.PI*g)}px rgba(226,169,59,.45)`;
fade('cap',t,2.3,2.75,14); fade('foot',t,2.6,3.0,10); $('pill').style.opacity=0.35+0.65*oc(seg(t,1.7,2.1));
}</script>""")
    return page(body)
def endcard(mem="memories saved on Walrus"):
    ringsvg=f'<svg width="200" height="200" viewBox="0 0 64 64">'+f'<circle id="pot" cx="32" cy="32" r="10.5" fill="{CLAY}"/>'
    for i in range(6):
        a=math.radians(-90+60*i); ringsvg+=f'<circle id="d{i}" cx="{32+23*math.cos(a):.2f}" cy="{32+23*math.sin(a):.2f}" r="{7.2 if i==1 else 6}" fill="{INK}"/>'
    ringsvg+='</svg>'
    body=(f'<div id="lk" class="abs" style="left:0;right:0;top:250px;display:flex;justify-content:center"><img src="{LOCK}" style="height:220px"></div>'
      f'<div id="tg" class="abs h" style="left:0;right:0;text-align:center;top:530px;font-size:60px">Your savings circle<span style="margin-left:-.14em">,</span> with a memory</div>'
      f'<div id="gh" class="abs" style="left:0;right:0;top:650px;display:flex;justify-content:center"><div style="font-size:42px;font-weight:800;color:{CLAY};background:{SOFT};border-radius:99px;padding:16px 40px">github.com/Preciousbas/kolo</div></div>'
      f'<div id="bf" class="abs tag" style="left:0;right:0;text-align:center;top:790px;color:{INK};font-size:26px">Built for Total Recall · Tatum × Walrus</div>'
      f'<div id="tm" class="abs m" style="left:0;right:0;text-align:center;top:970px;font-size:22px;font-weight:600">Demo in test mode: test USDC on Sui testnet · naira simulated · '+mem+'</div>'
      +JS+"""<script>function set(t){fade('lk',t,0,0.6,30);fade('tg',t,0.45,1.0);fade('gh',t,0.8,1.3);fade('bf',t,1.1,1.6);fade('tm',t,1.3,1.8,8)}</script>""")
    return page(body)
def render(html,out,dur,keep=()):
    d=f'/tmp/kv/{os.path.basename(out)}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    with R() as r:
        open('/tmp/kv_anim.html','w').write(html); r.pg.goto('file:///tmp/kv_anim.html'); r.pg.wait_for_timeout(400)
        for i in range(round(dur*FPS)):
            r.pg.evaluate(f'set({i/FPS})'); r.pg.screenshot(path=f'{d}/{i:04d}.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{d}/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','14','-preset','slow','-movflags','+faststart',out],check=True)
    for n,name in keep: shutil.copy(f'{d}/{n:04d}.png',OUT+name)
import sys
if "end" not in sys.argv[1:]: render(hero(),OUT+'kolo_hero_swap_insert.mp4',4.0,[(48,'kolo_hero_swap_mid.png'),(119,'kolo_hero_swap_final.png')])
render(endcard(),OUT+'kolo_end_card.mp4',4.0,[(119,'kolo_end_card_final.png')])
render(endcard("memories saved on Walrus Mainnet"),OUT+'kolo_end_card_mainnet.mp4',4.0,[(119,'kolo_end_card_mainnet_final.png')])
print("ok")
