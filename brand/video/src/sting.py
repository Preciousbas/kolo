# Kolo logo sting, 2s @30fps: six seats gather round the pot, the gold seat lights, wordmark slides in.
# Same approach as certa-video sting_a.py: SVG per frame (cairosvg) -> ffmpeg H.264 yuv420p.
import sys, os, math, subprocess, shutil
sys.path.insert(0,"/workspace/kolo-design/brand/src")
import cairosvg
from brand import word, INK, CLAY, CREAM, GOLD
FPS=30; OUT="/workspace/kolo-design/video/mp4/"
def clamp(t): return max(0.,min(1.,t))
def seg(t,a,b): return clamp((t-a)/(b-a))
def outCubic(x): return 1-(1-x)**3
def outBack(x,s=1.7): x-=1; return 1+(s+1)*x**3+s*x**2
def lerp(a,b,t): return a+(b-a)*t
def mix(c1,c2,t):
    a=[int(c1[i:i+2],16) for i in (1,3,5)]; b=[int(c2[i:i+2],16) for i in (1,3,5)]
    return '#'+''.join(f'{round(lerp(x,y,t)):02x}' for x,y in zip(a,b))
WP,ADV=word("kolo",xh=30,x0=78,baseline=47); W=78+ADV; S=820/W
def mark(t):
    s=''
    pc=outBack(seg(t,0.22,0.62),1.6)
    if pc>0: s+=f'<circle cx="32" cy="32" r="{10.5*pc:.3f}" fill="{CLAY}"/>'
    for i in range(6):
        p=seg(t,0.04*i,0.04*i+0.5); 
        if p<=0: continue
        e=outBack(p,1.5); a=math.radians(-90+60*i - 40*(1-outCubic(p))); R=lerp(60,23,e)
        x=32+R*math.cos(a); y=32+R*math.sin(a); r=6; col=INK; op=min(1,p*3)
        if i==1:
            l=seg(t,0.72,0.98); col=mix(INK,GOLD,outCubic(l)); r=6+1.2*outCubic(l)+1.6*math.sin(math.pi*l)
            h=seg(t,0.80,1.25)
            if 0<h<1: s+=f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{7.2+14*outCubic(h):.2f}" fill="none" stroke="{GOLD}" stroke-width="{2.5*(1-h):.2f}" opacity="{1-h:.3f}"/>'
        s+=f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.3f}" fill="{col}" opacity="{op:.3f}"/>'
    return s
def frame(t):
    sl=outCubic(seg(t,0.98,1.45)); shift=(W/2-32)*(1-sl)
    wo=outCubic(seg(t,1.05,1.5)); wx=(1-wo)*50
    tx=960-W*S/2; ty=540-32*S
    g=f'<g transform="translate({tx:.2f} {ty:.2f}) scale({S:.4f})"><g transform="translate({shift:.3f} 0)">{mark(t)}</g>'
    if wo>0: g+=f'<g opacity="{wo:.3f}" transform="translate({wx:.2f} 0)"><path d="{WP}" fill="{INK}"/></g>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="{CREAM}"/>{g}</g></svg>'
def render(out,dur):
    d=f'/tmp/kv/{os.path.basename(out)}'; shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    for i in range(round(dur*FPS)): cairosvg.svg2png(bytestring=frame(i/FPS).encode(),write_to=f'{d}/{i:04d}.png')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),'-i',f'{d}/%04d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','14','-preset','slow','-movflags','+faststart',out],check=True)
    return d
if __name__=="__main__":
    d=render(OUT+'kolo_logo_sting.mp4',2.0)
    from PIL import Image
    fr=[5,12,20,26,34,59]; s=Image.new('RGB',(1920,720))
    for i,n in enumerate(fr): s.paste(Image.open(f'{d}/{n:04d}.png').resize((640,360)),((i%3)*640,(i//3)*360))
    s.save('/tmp/kv/sting_check.png'); shutil.copy(f'{d}/0026.png',OUT+'kolo_logo_sting_mid.png'); shutil.copy(f'{d}/0059.png',OUT+'kolo_logo_sting_final.png')
    print("ok")
