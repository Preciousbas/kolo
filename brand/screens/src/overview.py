from PIL import Image, ImageDraw, ImageFont
import json
D="/workspace/kolo-design/screens/"
F="/workspace/kolo-design/brand/src/pjs800.ttf"
fb=lambda s: ImageFont.truetype(F,s)
fm=lambda s: ImageFont.truetype("/usr/share/fonts/truetype/sand-box/google/Plus Jakarta Sans/PlusJakartaSans-VariableFont_wght.ttf",s)
R1=[("00-signin","0 · Sign in (v2.3)"),("00a-wallet-sheet","0a · Pick a wallet"),("01-create","1 · Start a circle"),("01b-join","1b · Join with a code"),("02-home","2 · Home · updated 3 min ago"),("02d-home-live","2d · Home · live (<30s)"),("02e-home-pending","2e · Sent, waiting to show"),("02c-home-late","2c · Someone's late"),("02g-home-payout-done","2g · Round done · auto payout"),("02h-payout-received","2h · Recipient: your turn came")]
R2=[("03-profile","3 · Savings profile"),("05a-lender-consent","5a · Lender: consent"),("05b-lender-paying","5b · Paying $0.01"),("05c-lender-result","5c · Score revealed"),("05d-lender-denied","5d · Not allowed"),("06a-wallet","6a · Balance + rate"),("06b-deposit-sheet","6b · Add money (test)"),("06c-ramp-confirming","6c · Confirming quote"),("06e-deposit-receipt","6e · Receipt · simulated"),("07e-withdraw-receipt","7e · Withdraw receipt")]
R0=[("00-signin","0 · Sign in · wallet or Google"),("00d-sign-message","0d · Sign to prove it's you"),("00e-sign-rejected","0e · Signature declined"),("00g-google-wallet-setup","0g · Google · wallet setup"),("00h-google-failed","0h · Google failed / blocked"),("01p2-profile-filled","1p · About you"),("01p3-profile-error","1p · Profile errors"),("00j-chip-menu","0j · Account menu"),("01d-invite-signed-out","1d · Invite, signed out"),("01e-invite-return","1e · Back to invite")]
TW,TH,G,LAB=390,844,28,44; M=60; TOP=170
HERO_W=int(390*1.25)
N=10; W=M*2+N*TW+(N-1)*G+60+HERO_W; H=TOP+3*(LAB+TH)+2*G+M
o=Image.new("RGB",(W,H),"#EFE6D8"); d=ImageDraw.Draw(o)
logo=Image.open("/workspace/kolo-design/brand/final/kolo_lockup_light_1024.png"); logo=logo.resize((int(logo.width*80/logo.height),80),Image.LANCZOS)
o.paste(logo,(M,48),logo)
d.text((M+logo.width+40,58),"Savings circles that learn how your people pay",font=fb(40),fill="#2A1F17")
d.text((M+logo.width+40,110),"Design direction v2.3 · logo A final · 390×844 mobile · demo data · Studio for Forge · 3 Nov 2026",font=fm(24),fill="#6E5F50")
P=json.load(open("/workspace/kolo-design/brand/palette.json"))["palette"]
x=W-M-9*70
for k in ["bg","surface-2","ink","muted","primary","primary-soft","accent","success","gold"]:
    d.rounded_rectangle((x,60,x+56,116),12,fill=P[k],outline="#D6C8B4",width=2); d.text((x,124),k.replace("surface-2","surf-2").replace("primary-soft","p-soft"),font=fm(15),fill="#6E5F50"); x+=70
def tile(name,label,x,y,w=TW,h=TH,hero=False):
    im=Image.open(D+name+".png").convert("RGB"); im=im.resize((w,int(im.height*w/im.width)),Image.LANCZOS)
    if im.height>h: im=im.crop((0,0,w,h))
    d.text((x,y),label,font=fb(26 if hero else 22),fill="#A9441C" if hero else "#2A1F17")
    sh=Image.new("RGB",(w+4,im.height+4),"#D6C8B4"); o.paste(sh,(x-2,y+LAB-2)); o.paste(im,(x,y+LAB))
for r,row in enumerate([R1,R2,R0]):
    for i,(n,l) in enumerate(row): tile(n,l,M+i*(TW+G),TOP+r*(LAB+TH+G))
hx=M+N*TW+(N-1)*G+60
tile("04-learned-full","4 · HERO · What Kolo learned",hx,TOP,HERO_W,2*TH+G+LAB-0,True)
o.save("/workspace/kolo-design/overview.png"); print(o.size)
