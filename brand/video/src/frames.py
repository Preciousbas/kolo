from common import *
from PIL import Image, ImageDraw
F=V+"/frames/"; O=V+"/overlays/"; P=V+"/previews/"; SCR=ROOT+"/screens/"
BEATS=[ # id, chapter, tag, headline, body
 ("b1-signin",1,"01 · Start a circle","Sign in with your wallet","Tap Connect wallet and pick the one you use, like Slush. Nothing new to remember."),
 ("b2-create",1,"01 · Start a circle","Set the amount and the turns","Six friends. ₦20,000 a month. Everyone agrees who collects when."),
 ("b3-pay",2,"02 · Everyone pays","Pay your share","It shows as “Sent · waiting to show up” until the circle updates."),
 ("b4-feed",2,"02 · Everyone pays","One record everyone trusts","Who paid, who’s late, whose turn. Updated every few minutes."),
 ("b8-payout",2,"02 · Everyone pays","The pot pays out by itself","When the last share is in, the pot goes straight to whoever’s turn it is."),
 ("b5-learned",3,"03 · What Kolo learned","Kolo learns how each person pays","Then it changes what it does. Every change shows why, and can be undone."),
 ("b6-lender",4,"04 · A lender asks first","Your savings record, only with your OK","A lender pays $0.01 per check. No OK, no score."),
 ("b7-wallet",5,"05 · Money in and out","Add naira, save in dollars","Test mode: the naira top-up is simulated in this demo."),
]
def panel(ch,tag,head,body):
    return (chapters(ch,840,190,14,14)+f'<div class="abs" style="left:840px;top:250px;width:960px"><div class="tag">{tag}</div>'
            f'<div class="h" style="margin-top:22px;font-size:76px;line-height:86px">{head}</div>'
            f'<div class="m" style="margin-top:30px;width:880px;font-size:36px;line-height:50px;font-weight:600">{body}</div></div>'
            f'<img class="abs" src="{LOCK}" style="right:96px;top:62px;height:52px">')
def punch(src,dst):
    im=Image.open(src).convert("RGBA"); m=Image.new("L",im.size,255)
    ImageDraw.Draw(m).rounded_rectangle([SX,SY,SX+SW-1,SY+SH-1],radius=SR,fill=0)
    im.putalpha(m); im.save(dst)
def main():
    with R() as r:
        # title
        r.shot(page(ring(1560,540,230,1)+
            f'<img class="abs" src="{LOCK}" style="left:150px;top:300px;height:190px">'
            f'<div class="abs h" style="left:160px;top:540px;font-size:84px;line-height:96px;width:1100px">Your savings circle<span style="margin-left:-.14em">,</span><br>with a memory</div>'
            f'<div class="abs m" style="left:162px;top:760px;font-size:34px;font-weight:600">Ajo, esusu and family contributions that learn how your circle pays.</div>'
            f'<div class="abs tag" style="left:162px;top:930px;color:{MUTED};font-size:20px">Total Recall · Tatum × Walrus · Consumer Finance</div>'),F+"01_title.png")
        # hook (3 builds)
        L=[("Every month, six friends put ₦20,000 into a pot.",INK),("They run it on WhatsApp: who’s paid, whose turn, who’s always late.",INK),
           ("The group chat forgets. <span style='color:"+CLAY+"'>Kolo remembers.</span>",INK)]
        for n in range(1,4):
            body=f'<div class="abs" style="left:160px;top:230px;width:1500px"><div class="tag">The problem</div>'
            for i,(t,c) in enumerate(L[:n]):
                big=i==2
                body+=f'<div class="h" style="margin-top:{40 if i==0 else 56}px;font-size:{80 if big else 64}px;line-height:{90 if big else 76}px;color:{c}">{t}</div>'
            body+='</div>'
            body+=ring(1700,960,90,.18,True)
            r.shot(page(body),F+f"02_hook_{'abc'[n-1]}.png")
        # chapters
        CH=[("Start a circle","Sign in, set the amount, agree the turns."),("Everyone pays","One shared record, and the pot pays out by itself."),
            ("What Kolo learned","Memories that change what the app does."),("A lender asks first","A paid score check, only with your OK."),("Money in and out","Naira in, dollars saved. Test mode in this demo.")]
        for i,(t,s) in enumerate(CH,1):
            r.shot(page(ring(1500,540,300,.12,True,INK,CLAY)+
                f'<div class="abs h" style="left:160px;top:300px;font-size:200px;line-height:200px;color:{CLAY}">0{i}</div>'
                f'<div class="abs h" style="left:160px;top:540px;font-size:110px;line-height:120px">{t}</div>'
                f'<div class="abs m" style="left:164px;top:690px;font-size:40px;font-weight:600">{s}</div>'+chapters(i,164,820,22,26)+
                f'<img class="abs" src="{LOCK}" style="right:96px;bottom:60px;height:56px">'),F+f"03_chapter_{i}.png")
        # phone templates
        r.shot(page(panel(3,"00 · Chapter","Headline goes here","One plain line that says what the viewer should notice.")+phone()),F+"04_phone_template.png")
        r.shot(page(panel(3,"00 · Chapter","Headline goes here","One plain line that says what the viewer should notice.")+phone(placeholder=False)),"/tmp/t.png"); punch("/tmp/t.png",O+"phone_template_overlay.png")
        for bid,ch,tag,h,b in BEATS:
            r.shot(page(panel(ch,tag,h,b)+phone(placeholder=False)),"/tmp/t.png"); punch("/tmp/t.png",O+f"phone_{bid}.png")
        PRE={"02-home":"b4-feed","02g-home-payout-done":"b8-payout","02h-payout-received":"b8-payout","04-learned":"b5-learned","05c-lender-result":"b6-lender","06e-deposit-receipt":"b7-wallet"}
        BB={b[0]:b for b in BEATS}
        for s,bid in PRE.items():
            _,ch,tag,h,b=BB[bid]; r.shot(page(panel(ch,tag,h,b)+phone(SCR+s+".png")),P+f"preview_{s}.png")
        # callouts aligned to the phone template (targets from the static screens)
        CO={"callout_hero_reminder":("Kolo moved Tunde’s reminder","Kolo changed",*scr(239+54,380+12),"b5-learned","04-learned"),
            "callout_feed_updated":("Not live: it says when it last checked","Freshness",*scr(191+59,503+9),"b4-feed","02-home"),
            "callout_feed_live":("Live only right after a refresh","Freshness",*scr(269+20,503+9),"b4-feed","02d-home-live"),
            "callout_pending":("Your payment, waiting for the next update","Pending",*scr(87+95,568+9),"b3-pay","02e-home-pending"),
            "callout_hero_saved":("Each memory is saved securely","Proof",*scr(71+68,464+9),"b5-learned","04-learned"),
            "callout_lender_paid":("The lender paid $0.01 for this check","Pay-per-call",*scr(178+87,439+9),"b6-lender","05c-lender-result"),
            "callout_payout_auto":("No one pressed pay out: Kolo did it when the last member paid","Automatic",*scr(150,163),"b8-payout","02g-home-payout-done"),
            "callout_payout_manual":("Pot full: one tap released it to Bisi","Manual fallback",*scr(195,672),"b8-payout","02i-release-payout"),
            "callout_receipt_simulated":("Simulated: no real naira moved","Test mode",*scr(76+118,297+13),"b7-wallet","06e-deposit-receipt")}
        for name,(txt,tag,tx,ty,bid,s) in CO.items():
            c=callout(txt,tag,840,760,tx,ty,w=560)
            r.shot(page(c,bg="transparent"),O+name+".png",transparent=True)
            if name.startswith("callout_payout"):
                _,ch,tg,h,b=BB[bid]; r.shot(page(panel(ch,tg,h,b)+phone(SCR+s+".png")+c),P+f"preview_{name}.png")
            if name=="callout_hero_reminder":
                _,ch,tg,h,b=BB[bid]; r.shot(page(panel(ch,tg,h,b)+phone(SCR+s+".png")+c),F+"05_callout_example.png")
        # lower thirds
        LT={"lt_test_mode":("Test mode · test USDC on Sui testnet · naira is simulated","Honest note"),
            "lt_saved_securely":("“Saved securely” = memories saved on Walrus","Under the hood"),
            "lt_saved_securely_mainnet":("“Saved securely” = memories on Walrus Mainnet","Under the hood"),
            "lt_tatum_prices":("Rates from Tatum price data","Under the hood"),
            "lt_live_recording":("Feed refreshed just now, so it shows Live","Recording note")}
        for n,(t,tag) in LT.items():
            tone,soft=(WARN,WARNS) if "test" in n or "Recording" in tag else (ACC,ACCS)
            r.shot(page(lower_third(t,tag,840,930,tone=tone),bg="transparent"),O+n+".png",transparent=True)
        r.shot(page(panel(5,"05 · Money in and out","Add naira, save in dollars","Test mode: the naira top-up is simulated in this demo.")+phone(SCR+"06e-deposit-receipt.png")+lower_third(*LT["lt_test_mode"],840,930,tone=WARN)),F+"05_lower_third_example.png")
        # architecture
        def box(x,y,w,h,title,sub,fill="#fff",bd=BORDER,tc=INK,icon=""):
            return (f'<div class="abs" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:{fill};border:3px solid {bd};border-radius:28px;padding:26px 30px;box-shadow:0 18px 40px -24px rgba(42,31,23,.35)">'
                    f'<div style="display:flex;align-items:center;gap:14px">{icon}<div class="h" style="font-size:38px;line-height:44px;color:{tc}">{title}</div></div><div style="font-size:24px;line-height:32px;font-weight:600;color:{MUTED};margin-top:10px">{sub}</div></div>')
        def arr(x1,y1,x2,y2,label,lx,ly,both=False):
            a=math.atan2(y2-y1,x2-x1); L=20
            hd=lambda x,y,a:f'<path d="M{x-L*math.cos(a-.5):.1f} {y-L*math.sin(a-.5):.1f} L{x} {y} L{x-L*math.cos(a+.5):.1f} {y-L*math.sin(a+.5):.1f}" fill="none" stroke="{CLAY}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
            s=f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{CLAY}" stroke-width="5" stroke-linecap="round"/>'+hd(x2,y2,a)+(hd(x1,y1,a+math.pi) if both else "")
            return f'<svg class="abs" style="left:0;top:0" width="1920" height="1080">{s}</svg><div class="abs" style="left:{lx}px;top:{ly}px;font-size:22px;font-weight:700;color:{INK};background:{BG};padding:4px 10px;border-radius:10px">{label}</div>'
        mk=f'<img src="{MARK}" style="width:46px;height:46px">'
        body=(f'<div class="abs tag" style="left:110px;top:70px">How it works</div><div class="abs h" style="left:110px;top:110px;font-size:64px">Kolo, in plain words</div>'
              f'<img class="abs" src="{LOCK}" style="right:96px;top:70px;height:52px">'
              +box(110,400,330,250,"App","What members see: the circle, payments, what Kolo learned.")
              +box(700,400,420,250,"Kolo agent","Watches payments, decides reminders and payout order, answers score checks.",fill=SOFT,bd=CLAY,icon=mk)
              +box(1360,200,450,250,"Walrus Memory","<b style='color:"+INK+"'>What Kolo remembers.</b> Each habit it learns, saved securely, with proof.",fill=ACCS,bd=ACC,tc=ACC)
              +box(1360,520,450,220,"Tatum","Sui data + prices. Reads payments and balances, sends payouts, gives naira rates.",fill=OKS,bd=OK,tc=OK)
              +box(1360,800,450,180,"Sui","The savings pot. Holds the money, pays out each turn.",fill="#fff",bd=INK)
              +arr(440,525,700,525,"payments, choices",500,480,True)
              +arr(1120,460,1360,330,"remember · recall",1190,445,True)
              +arr(1120,590,1360,630,"read · send",1180,560,True)
              +arr(1585,742,1585,798,"",0,-100,True)
              +box(110,760,1010,190,"Lender agent  →  pays $0.01 per check","Pay-per-call, $0.01 USDC on Sui. Only with the member’s OK.",fill="#fff",bd=BORDER)
              +arr(615,760,820,650,"",0,-100)
              +'{FOOT}')
        for suf,mem in (("","Memories saved on Walrus."),("_mainnet","Memories saved on Walrus Mainnet.")):
            r.shot(page(body.replace('{FOOT}',f'<div class="abs" style="left:110px;top:990px;font-size:22px;font-weight:700;color:{WARN}">Demo runs in test mode: test USDC on Sui testnet, naira simulated. {mem}</div>')),F+f"06_architecture{suf}.png")
        # end card
        for suf,mem in (("","memories saved on Walrus"),("_mainnet","memories saved on Walrus Mainnet")):
          r.shot(page(ring(960,300,0,0)+
            f'<img class="abs" src="{LOCK}" style="left:50%;transform:translateX(-50%);top:280px;height:200px">'
            f'<div class="abs h" style="left:0;right:0;text-align:center;top:540px;font-size:56px">Your savings circle<span style="margin-left:-.14em">,</span> with a memory</div>'
            f'<div class="abs" style="left:0;right:0;text-align:center;top:660px;font-size:40px;font-weight:800;color:{CLAY}">github.com/Preciousbas/kolo</div>'
            f'<div class="abs tag" style="left:0;right:0;text-align:center;top:760px;color:{MUTED}">Built for Total Recall · Tatum × Walrus</div>'
            f'<div class="abs m" style="left:0;right:0;text-align:center;top:960px;font-size:22px;font-weight:600">Demo in test mode: test USDC on Sui testnet · naira simulated · {mem}</div>'),F+f"07_end_card{suf}.png")
main(); print("ok")
