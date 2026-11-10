import sys
from PIL import Image
D="/workspace/kolo-design/screens/"
ims=[Image.open(D+n+".png") for n in sys.argv[2:]]
ims=[i.resize((i.width//2,i.height//2),Image.LANCZOS) for i in ims]
W=sum(i.width for i in ims)+10*(len(ims)-1); H=max(i.height for i in ims)
o=Image.new("RGB",(W,H),"#888"); x=0
for i in ims: o.paste(i,(x,0)); x+=i.width+10
o.save(sys.argv[1])
