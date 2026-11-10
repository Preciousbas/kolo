from kit import *
S={}
# ---------- 00 sign in
def signin_body():
    return status_bar()+f'''
<div class="px-6 pt-16 flex flex-col h-[800px]">
<img src="../brand/final/kolo_lockup_light.svg" class="h-14 self-start">
<h1 class="text-display mt-10">Save together.<br>Get paid on your turn.</h1>
<p class="text-body text-muted-foreground mt-4">Run your ajo, esusu or family contribution in one place. Kolo tracks who has paid, reminds people at the right time and pays out the pot when it's full.</p>
<div class="mt-8 space-y-3">
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}Everyone sees the same record</div>
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}The pot pays out automatically</div>
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}Kolo learns how your circle pays</div></div>
<div class="mt-auto mb-10 space-y-3">
{btn("Connect wallet", icon="wallet")}
<p class="text-small text-muted-foreground text-center">Use a wallet app you already have, like Slush. Your money stays in your wallet; Kolo can't move it without your OK.</p>
<p class="text-small text-center"><a class="font-bold text-primary underline underline-offset-4">I don't have a wallet yet</a></p></div></div>'''
S["00-signin"]=page("Kolo · Sign in", signin_body())
def wtile(letter, bg="bg-foreground text-background"):
    return f'<span class="w-11 h-11 rounded-xl {bg} grid place-items-center text-h3 font-extrabold shrink-0">{letter}</span>'
def wrow(letter, name, sub, right, bg="bg-foreground text-background", sel=False):
    b="border-2 border-primary bg-primary-soft/40" if sel else "border-2 border-border bg-card"
    return f'<div class="rounded-2xl {b} p-3 flex items-center gap-3">{wtile(letter,bg)}<div class="flex-1"><div class="text-body font-bold">{name}</div><div class="text-small text-muted-foreground">{sub}</div></div>{right}</div>'
found='<span class="text-[11px] font-bold uppercase tracking-wide text-success bg-success-soft rounded-full px-2 py-0.5">On this device</span>'
chev=ic("chevron-right","w-5 h-5 text-muted-foreground")
S["00a-wallet-sheet"]=page("Kolo · Connect wallet", sheet(f'''<p class="text-body text-muted-foreground -mt-1 mb-4">Pick the wallet you use. You'll approve in that app; Kolo never sees your recovery phrase.</p>
<div class="space-y-2">{wrow("S","Slush","Recommended",found+chev,sel=True)}</div>
<p class="text-small font-bold mt-5 mb-2">Other wallets</p>
<div class="space-y-2">{wrow("P","Phantom","On this device",chev,"bg-secondary text-foreground")}{wrow("N","Nightly","On this device",chev,"bg-secondary text-foreground")}</div>
<p class="text-small text-muted-foreground text-center mt-5">Don't see yours? <a class="font-bold text-primary underline underline-offset-4">Get Slush</a></p>''',"Connect a wallet", signin_body()))
S["00b-no-wallet"]=page("Kolo · No wallet found", sheet(f'''<div class="text-center pt-2">
<div class="mx-auto w-16 h-16 rounded-full bg-secondary grid place-items-center">{ic("wallet","w-8 h-8 text-muted-foreground")}</div>
<h3 class="text-h2 mt-4">You'll need a wallet app</h3>
<p class="text-body text-muted-foreground mt-2">Kolo keeps your savings in a wallet only you control. Slush is free and takes about 2 minutes to set up.</p></div>
<div class="mt-5 space-y-2">{btn("Get Slush", icon="external-link")}{btn("I've installed it · try again","outline",icon="rotate-cw")}</div>
<div class="mt-4 rounded-xl bg-secondary p-3 text-small text-muted-foreground flex gap-2">{ic("info","w-4 h-4 shrink-0 mt-0.5")}<span>Opens slush.app/download. Already use another wallet? Open Kolo in the browser where it's installed.</span></div>''',"No wallet found", signin_body()))
S["00c-wallet-connecting"]=page("Kolo · Connecting", sheet(f'''<div class="text-center pt-2">
<div class="mx-auto w-16 h-16 rounded-2xl bg-foreground text-background grid place-items-center text-h1 font-extrabold relative">S<span class="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-card grid place-items-center shadow-card">{spinner("w-5 h-5 text-primary")}</span></div>
<h3 class="text-h2 mt-5">Approve in Slush</h3>
<p class="text-body text-muted-foreground mt-2">Slush will ask you to connect to Kolo. This only shares your wallet address; it doesn't move any money.</p></div>
<div class="mt-6 space-y-2">{btn("Waiting for Slush…","disabled",icon="loader-circle")}{btn("Use a different wallet","ghost",size="h-11 text-[15px]")}</div>''',"Connecting", signin_body()))
# ---------- 01 create
def tabs(active):
    a="bg-card shadow-card text-foreground"; i="text-muted-foreground"
    return f'<div class="mx-5 p-1 rounded-2xl bg-secondary grid grid-cols-2 text-body font-bold"><div class="h-10 grid place-items-center rounded-xl {a if active=="create" else i}">Start a circle</div><div class="h-10 grid place-items-center rounded-xl {a if active=="join" else i}">Join with a code</div></div>'
def field(label, inner, help=""):
    h=f'<p class="text-small text-muted-foreground mt-1">{help}</p>' if help else ""
    return f'<label class="block"><span class="text-small font-bold">{label}</span><div class="mt-1.5">{inner}</div>{h}</label>'
inp=lambda v,pre="",suf="": f'<div class="h-11 px-4 rounded-xl border-2 border-border bg-card flex items-center gap-2 text-body font-semibold">{pre}<span class="flex-1">{v}</span>{suf}</div>'
seg=lambda opts,sel: '<div class="grid grid-cols-3 gap-2">'+"".join(f'<div class="h-11 rounded-xl grid place-items-center text-body font-bold {"bg-primary text-primary-foreground" if o==sel else "border-2 border-border bg-card"}">{o}</div>' for o in opts)+'</div>'
S["01-create"]=page("Kolo · Start a circle", status_bar()+top_bar("New circle", right='<span class="text-small text-muted-foreground flex items-center gap-1.5"><span class="w-6 h-6 rounded-full bg-success-soft text-success grid place-items-center text-[11px] font-bold">N</span>Ngozi</span>')+tabs("create")+f'''
<div class="px-5 pt-3 space-y-2.5">
{field("Circle name", inp("Balogun Street Ajo"))}
<div class="grid grid-cols-[1fr_120px] gap-3">
{field("Amount per person", inp("20,000", '<span class="text-muted-foreground font-bold">₦</span>'), "≈ $13.40 each round")}
{field("Members", '<div class="h-12 rounded-xl border-2 border-border bg-card flex items-center justify-between px-2"><span class="w-8 h-8 rounded-lg bg-secondary grid place-items-center">'+ic("minus","w-4 h-4")+'</span><span class="text-h3 tabular-nums">6</span><span class="w-8 h-8 rounded-lg bg-secondary grid place-items-center">'+ic("plus","w-4 h-4")+'</span></div>')}</div>
{field("How often", seg(["Weekly","Monthly","Every 2 wks"],"Monthly"))}
{field("First payment due", inp("Wed 25 Nov 2026", suf=ic("calendar-days","w-5 h-5 text-muted-foreground")))}
<div><span class="text-small font-bold">Who gets paid when</span>
<div class="mt-1.5 space-y-2">
<div class="rounded-xl border-2 border-primary bg-primary-soft/50 p-3 flex gap-3"><span class="mt-0.5 w-5 h-5 rounded-full border-[6px] border-primary bg-card shrink-0"></span><div><div class="text-body font-bold">Kolo suggests <span class="ml-1 text-[11px] font-bold uppercase tracking-wide text-primary">Recommended</span></div><div class="text-small text-muted-foreground">Kolo orders payouts from how people pay, and tells you when it changes anything.</div></div></div>
<div class="rounded-xl border-2 border-border bg-card p-3 flex gap-3"><span class="mt-0.5 w-5 h-5 rounded-full border-2 border-border shrink-0"></span><div><div class="text-body font-bold">Set it yourself</div><div class="text-small text-muted-foreground">Drag members into order after they join.</div></div></div></div></div>
</div>
<div class="absolute bottom-0 inset-x-0 px-5 pb-7 pt-3 bg-background border-t border-border/70">
<div class="flex justify-between text-small mb-2"><span class="text-muted-foreground">Each payout</span><span>{money("₦120,000","$80.40")}</span></div>
{btn("Create circle")}</div>''')
S["01b-join"]=page("Kolo · Join a circle", status_bar()+top_bar("Join a circle")+tabs("join")+f'''
<div class="px-5 pt-4 space-y-4">
{field("Invite code or link", inp('<span class="tracking-[0.18em]">KOLO-7Q4M</span>', suf=ic("circle-check","w-5 h-5 text-success")), "Ada shared this in your WhatsApp group.")}
{card(f"""<div class="flex items-center justify-between"><span class="text-micro uppercase text-muted-foreground">Preview · you haven't joined yet</span></div>
<h2 class="text-h1 mt-2">Balogun Street Ajo</h2>
<div class="flex items-center gap-2 mt-1 text-small text-muted-foreground">{avatar("Ada","w-6 h-6 text-[11px]")}Started by Ada Okafor</div>
<div class="grid grid-cols-2 gap-3 mt-4">
<div class="rounded-xl bg-secondary p-3"><div class="text-small text-muted-foreground">You pay</div><div class="text-h3 tabular-nums">₦20,000</div><div class="text-small text-muted-foreground">$13.40 · monthly</div></div>
<div class="rounded-xl bg-secondary p-3"><div class="text-small text-muted-foreground">You receive once</div><div class="text-h3 tabular-nums">₦120,000</div><div class="text-small text-muted-foreground">$80.40</div></div></div>
<div class="mt-4 flex items-center justify-between"><div class="flex -space-x-2">{"".join(avatar(n,"w-8 h-8 text-small","ring-2 ring-card") for n in ["Ada","Tunde","Emeka","Bisi","Femi"])}<div class="w-8 h-8 rounded-full ring-2 ring-card border-2 border-dashed border-border bg-card grid place-items-center text-small font-bold text-muted-foreground">+1</div></div><span class="text-small font-bold">5 of 6 joined</span></div>
<div class="mt-4 border-t border-border pt-3 space-y-2 text-small">
<div class="flex gap-2">{ic("calendar-days","w-4 h-4 mt-0.5 text-muted-foreground")}<span>First payment due <b>Wed 25 Nov</b>, then the 25th of each month for 6 months</span></div>
<div class="flex gap-2">{ic("list-ordered","w-4 h-4 mt-0.5 text-muted-foreground")}<span>Kolo suggests the payout order. You'll see your turn before round 1.</span></div>
<div class="flex gap-2">{ic("shield-check","w-4 h-4 mt-0.5 text-muted-foreground")}<span>The pot is held by Kolo and paid out automatically, not by any one member.</span></div></div>""")}
</div>
<div class="absolute bottom-0 inset-x-0 px-5 pb-7 pt-3 bg-background border-t border-border/70 space-y-2">{btn("Join Balogun Street Ajo")}{btn("Not now","ghost",size="h-11 text-[15px]")}</div>''')
S["01c-join-invalid"]=page("Kolo · Join, bad code", status_bar()+top_bar("Join a circle")+tabs("join")+f'''
<div class="px-5 pt-4">{field("Invite code or link", '<div class="h-12 px-4 rounded-xl border-2 border-destructive bg-card flex items-center text-body font-semibold tracking-[0.18em]">KOLO-7Q4N</div>')}
<p class="mt-2 text-small font-semibold text-destructive flex gap-1.5">{ic("circle-alert","w-4 h-4 mt-0.5")}We can't find a circle with that code. Check it with the person who sent it. Codes are 4 letters or numbers after KOLO-.</p></div>''')
# ---------- 02 home
ORDER=[("Ada","Sep","done"),("Emeka","Oct","done"),("Bisi","Nov","now"),("Ngozi","Dec","you"),("Femi","Jan",""),("Tunde","Feb","")]
def payout_order(now="Bisi", order=None):
    order=order or ORDER
    out='<div class="mt-3 pt-3 border-t border-border/70"><div class="flex items-center justify-between mb-2"><span class="text-micro uppercase text-muted-foreground">Payout order</span><span class="text-small font-bold text-primary">See all</span></div><div class="grid grid-cols-6 gap-1">'
    for n,m,st in order:
        nm="You" if st in("you","you_now") else n
        if st=="done": a=avatar(n,"w-10 h-10 text-small","opacity-60"); tag='<span class="text-[11px] font-bold text-success flex items-center">'+ic("check","w-3 h-3")+m+'</span>'
        elif st=="now": a=avatar(n,"w-10 h-10 text-small","ring-[3px] ring-turn ring-offset-2 ring-offset-card"); tag='<span class="text-[11px] font-extrabold uppercase px-1.5 rounded bg-turn text-foreground">Now</span>'
        elif st=="you": a=avatar(n,"w-10 h-10 text-small","ring-2 ring-primary ring-offset-2 ring-offset-card"); tag='<span class="text-[11px] font-extrabold uppercase text-primary">Next</span>'
        elif st=="you_now": a=avatar(n,"w-10 h-10 text-small","ring-[3px] ring-turn ring-offset-2 ring-offset-card"); tag='<span class="text-[11px] font-extrabold uppercase px-1.5 rounded bg-turn text-foreground">Now</span>'
        elif st=="skipped": a=avatar(n,"w-10 h-10 text-small","opacity-40 grayscale"); tag='<span class="text-[11px] font-bold text-muted-foreground flex items-center gap-0.5">'+ic("skip-forward","w-3 h-3")+'Skipped</span>'
        else: a=avatar(n,"w-10 h-10 text-small"); tag=f'<span class="text-[11px] font-semibold text-muted-foreground">{m}</span>'
        out+=f'<div class="flex flex-col items-center gap-1">{a}<span class="text-[12px] font-bold leading-4">{nm}</span>{tag}</div>'
    return out+'</div></div>'
def feed_item(name, what, amt, t, kind="paid", new=False):
    icn={"paid":('<span class="w-5 h-5 rounded-full bg-success text-white grid place-items-center absolute -bottom-0.5 -right-0.5 ring-2 ring-card">'+ic("check","w-3 h-3")+'</span>'),
         "late":('<span class="w-5 h-5 rounded-full bg-destructive text-white grid place-items-center absolute -bottom-0.5 -right-0.5 ring-2 ring-card">'+ic("clock","w-3 h-3")+'</span>'),
         "kolo":"", "pending":('<span class="w-5 h-5 rounded-full bg-card text-muted-foreground grid place-items-center absolute -bottom-0.5 -right-0.5 ring-2 ring-card border border-border">'+ic("clock","w-3 h-3")+'</span>')}[kind]
    av=avatar("Ngozi" if name=="You" else name) if kind!="kolo" else '<div class="w-9 h-9 rounded-full bg-accent-soft grid place-items-center"><img src="../brand/option_A/kolo_mark.svg" class="w-5 h-5"></div>'
    bg="bg-success-soft/60 -mx-2 px-2 rounded-xl" if new else ""
    if kind=="pending": bg="border-2 border-dashed border-border -mx-2 px-2 rounded-xl bg-secondary/50"
    return f'<li class="flex items-center gap-3 py-2.5 {bg}"><div class="relative">{av}{icn}</div><div class="flex-1 min-w-0"><div class="text-body"><b>{name}</b> {what}</div><div class="text-small text-muted-foreground">{t}</div></div><div class="text-right"><div class="text-body font-bold tabular-nums">{amt}</div>{'<div class="text-[12px] text-muted-foreground tabular-nums">$13.40</div>' if amt else ''}</div></li>'
def noticed_card(text, cta="See what Kolo learned"):
    return f'''<section class="rounded-[20px] bg-accent-soft border border-accent/20 p-4 flex gap-3"><div class="w-10 h-10 rounded-xl bg-accent text-accent-foreground grid place-items-center shrink-0">{ic("lightbulb","w-5 h-5")}</div>
<div class="flex-1"><div class="text-micro uppercase text-accent">Kolo noticed</div><p class="text-body mt-0.5">{text}</p><div class="mt-1.5 text-small font-bold text-accent flex items-center gap-1">{cta}{ic("arrow-right","w-4 h-4")}</div></div></section>'''
def noticed_strip(text):
    return f'<a class="flex items-center gap-3 rounded-2xl bg-accent-soft border border-accent/20 px-3 py-2.5"><span class="w-8 h-8 rounded-lg bg-accent text-accent-foreground grid place-items-center shrink-0">{ic("lightbulb","w-4 h-4")}</span><span class="flex-1 text-small"><b class="text-accent">Kolo noticed</b> {text}</span>{ic("chevron-right","w-5 h-5 text-accent")}</a>'
def home_header(sub="Round 3 of 6"):
    return f'''<header class="h-14 px-5 flex items-center gap-3"><img src="../brand/option_A/kolo_mark.svg" class="w-8 h-8"><div class="flex-1"><div class="text-h3 flex items-center gap-1">Balogun Street Ajo{ic("chevron-down","w-4 h-4")}</div><div class="text-small text-muted-foreground">{sub} · 6 members</div></div>
<span class="w-10 h-10 rounded-full bg-card border border-border grid place-items-center relative">{ic("bell","w-5 h-5")}<span class="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-primary"></span></span></header>'''
def pot_card(paid, of, ngn, usd, due, bar="bg-success", extra="", who="Bisi", order=True, porder=None):
    ticks="".join(f'<span class="flex-1 h-1.5 rounded-full {bar if i<paid else "bg-secondary"}"></span>' for i in range(of))
    return card(f'''<div class="flex items-center justify-between"><span class="text-micro uppercase text-muted-foreground">Pot this round</span><span class="text-small font-bold flex items-center gap-1">{ic("calendar-days","w-4 h-4 text-muted-foreground")}{due}</span></div>
<div class="mt-2 text-display tabular-nums">{ngn}<span class="text-h3 text-muted-foreground font-semibold"> of ₦120,000</span></div>
<div class="text-small text-muted-foreground tabular-nums">{usd} of $80.40</div>
<div class="mt-3">{progress(round(paid/of*100), bar)}</div>
<div class="mt-2 flex items-center justify-between text-small"><span class="font-bold">{paid} of {of} paid</span><span class="text-muted-foreground flex items-center gap-1.5">Goes to {avatar(who,"w-5 h-5 text-[10px]")} <b class="text-foreground">{who}</b></span></div>{payout_order(order=porder) if order else ""}{extra}''')
def pay_bar(label="Pay my ₦20,000", sub="$13.40 from your Kolo balance · due Wed 25 Nov", variant="primary"):
    b=btn(label,"outline",icon="circle-check",cls="text-success border-success/40") if variant=="paid" else (btn(label,"outline",icon="clock",cls="text-muted-foreground border-dashed") if variant=="pending" else btn(label,variant))
    return f'<div class="absolute bottom-[76px] inset-x-0 px-5 pt-3 pb-3 bg-gradient-to-t from-background via-background to-background/0">{b}<p class="text-center text-small text-muted-foreground mt-1.5">{sub}</p></div>'
def freshness(state, mins=3):
    rb=lambda spin=False: f'<span class="w-9 h-9 rounded-full border border-border bg-card grid place-items-center {"text-primary" if spin else ""}" aria-label="Refresh">{spinner("w-4 h-4") if spin else ic("refresh-cw","w-4 h-4")}</span>'
    if state=="live": return f'<span class="flex items-center gap-2"><span class="flex items-center gap-1.5 text-small font-bold text-success"><span class="w-2 h-2 rounded-full bg-success ring-4 ring-success/20"></span>Live</span>{rb()}</span>'
    if state=="refreshing": return f'<span class="flex items-center gap-2"><span class="text-small font-bold text-primary">Updating…</span>{rb(True)}</span>'
    return f'<span class="flex items-center gap-2"><span class="text-small font-semibold text-muted-foreground">Updated {mins} min ago</span>{rb()}</span>'
def activity(items, state="stale", mins=3):
    return card(f'<div class="flex items-center justify-between"><h3 class="text-h3">Activity</h3>{freshness(state,mins)}</div><ul class="mt-1 divide-y divide-border/60">'+items+'</ul>',"px-4 pt-3 pb-1")
FEED_TAIL=feed_item("Emeka","paid","₦20,000","1 hr ago")+feed_item("Kolo","sent Tunde a reminder","","Today, 8:00 · moved to the 27th for him",kind="kolo")+feed_item("Femi","paid","₦20,000","Yesterday, 19:12")
FEED_LIVE=feed_item("Ada","paid","₦20,000","20 sec ago",new=True)+FEED_TAIL
FEED_PENDING=feed_item("You","sent","₦20,000","Waiting to show up · sent 10:51",kind="pending")+feed_item("Ada","paid","₦20,000","14 min ago")+FEED_TAIL
FEED=feed_item("Ada","paid","₦20,000","14 min ago")+feed_item("Emeka","paid","₦20,000","1 hr ago")+feed_item("Kolo","sent Tunde a reminder","","Today, 8:00 · moved to the 27th for him",kind="kolo")+FEED_TAIL[len(feed_item("Emeka","paid","₦20,000","1 hr ago")+feed_item("Kolo","sent Tunde a reminder","","Today, 8:00 · moved to the 27th for him",kind="kolo")):]
S["02-home"]=page("Kolo · Circle home", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
{pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov")}
{noticed_strip("Tunde pays on the 27th, so his reminder moved there.")}
{activity(FEED,'stale')}
</main>{pay_bar()}{bottom_nav("circle")}''')
S["02d-home-live"]=page("Kolo · Circle home, live", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
{pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov")}
{noticed_strip("Tunde pays on the 27th, so his reminder moved there.")}
{activity(FEED_LIVE,'live')}
</main>{pay_bar()}{bottom_nav("circle")}''')
S["02e-home-pending"]=page("Kolo · Circle home, payment pending", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
{pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov")}
{noticed_strip("Tunde pays on the 27th, so his reminder moved there.")}
{activity(FEED_PENDING,'stale',1)}
</main>{pay_bar("Sent · waiting to show up","Your ₦20,000 left your balance at 10:51. You won't be charged twice.","pending")}{bottom_nav("circle")}''')
S["02f-home-refreshing"]=page("Kolo · Circle home, refreshing", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
{pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov")}
{noticed_strip("Tunde pays on the 27th, so his reminder moved there.")}
<div class="opacity-60">{activity(FEED,'refreshing')}</div>
</main>{pay_bar()}{bottom_nav("circle")}''')
S["02b-home-empty"]=page("Kolo · Circle home, empty", status_bar()+home_header("Starts Wed 25 Nov")+f'''<main class="px-5 space-y-3">
{pot_card(0,6,"₦0","$0.00","First due Wed 25 Nov", who="Ada", order=False)}
{card(f"""<div class="flex gap-3"><div class="w-10 h-10 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">{ic("user-plus","w-5 h-5")}</div><div class="flex-1"><h3 class="text-h3">1 seat still open</h3><p class="text-small text-muted-foreground">The circle starts when all 6 have joined. Share this code:</p>
<div class="mt-3 flex gap-2"><div class="flex-1 h-11 rounded-xl bg-secondary grid place-items-center text-h3 tracking-[0.2em]">KOLO-7Q4M</div><span class="w-11 h-11 rounded-xl border-2 border-border grid place-items-center">{ic("copy","w-5 h-5")}</span></div>
<button class="mt-2 w-full h-11 rounded-xl bg-[#1F7A4D] text-white font-bold flex items-center justify-center gap-2">{ic("message-circle","w-5 h-5")}Share on WhatsApp</button></div></div>""")}
<section class="rounded-[20px] border-2 border-dashed border-accent/30 bg-accent-soft/40 p-4 flex gap-3"><div class="w-10 h-10 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">{ic("lightbulb","w-5 h-5")}</div><div><div class="text-micro uppercase text-accent">Kolo is listening</div><p class="text-body mt-0.5">After round 1, Kolo will show what it noticed about how your circle pays, and anything it changed because of it.</p></div></section>
{card(f'<h3 class="text-h3">Activity</h3><div class="py-6 text-center"><div class="mx-auto w-12 h-12 rounded-full bg-secondary grid place-items-center text-muted-foreground">{ic("receipt","w-6 h-6")}</div><p class="text-body font-bold mt-2">No payments yet</p><p class="text-small text-muted-foreground">Payments show here when the circle updates.</p></div>')}
</main>{bottom_nav("circle")}''')
S["02c-home-late"]=page("Kolo · Circle home, late", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
<section class="rounded-[20px] bg-danger-soft border border-destructive/25 p-4"><div class="flex gap-3"><div class="w-10 h-10 rounded-xl bg-destructive text-white grid place-items-center shrink-0">{ic("clock-alert","w-5 h-5")}</div><div class="flex-1"><h3 class="text-h3 text-destructive">Tunde is 2 days late</h3><p class="text-small mt-0.5">₦20,000 · $13.40 still to pay. Bisi's payout waits until the pot is full.</p></div></div>
<div class="mt-3 grid grid-cols-2 gap-2"><button class="h-11 rounded-xl bg-card border-2 border-destructive/30 text-destructive font-bold text-small flex items-center justify-center gap-1.5">{ic("bell-ring","w-4 h-4")}Nudge Tunde</button><button class="h-11 rounded-xl bg-card border-2 border-border font-bold text-small flex items-center justify-center gap-1.5">{ic("phone","w-4 h-4")}Call</button></div>
<p class="mt-2 text-small text-muted-foreground">Kolo already reminded him today at 8:00. One more nudge is allowed today.</p></section>
{pot_card(5,6,"₦100,000","$67.00",'<span class="text-destructive">Was due Wed 25 Nov</span>', bar="bg-warning", order=False)}
{activity(feed_item("Tunde","hasn't paid yet","₦20,000","Due Wed 25 Nov · 2 days ago",kind="late")+feed_item("Kolo","sent Tunde a reminder","","Today, 8:00",kind="kolo")+feed_item("Ngozi","(you) paid","₦20,000","Wed 25 Nov, 09:14")+feed_item("Ada","paid","₦20,000","Tue 24 Nov"),'stale')}
</main>{pay_bar("You've paid this round","Next payment due Fri 25 Dec","paid")}{bottom_nav("circle")}''')
# ---------- pay states
def home_dim(): return '<div class="opacity-100">'+status_bar()+home_header()+'<main class="px-5 space-y-3">'+pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov",order=False)+noticed_card("Tunde usually pays on the 27th, so his reminder now goes out that morning instead of the 25th.")+'</main></div>'
def step(label, state, sub=""):
    m={"done":f'<span class="w-7 h-7 rounded-full bg-success text-white grid place-items-center">{ic("check","w-4 h-4")}</span>',
       "doing":f'<span class="w-7 h-7 rounded-full bg-primary-soft text-primary grid place-items-center">{spinner("w-4 h-4")}</span>',
       "todo":'<span class="w-7 h-7 rounded-full border-2 border-border"></span>',
       "fail":f'<span class="w-7 h-7 rounded-full bg-destructive text-white grid place-items-center">{ic("x","w-4 h-4")}</span>'}[state]
    s=f'<div class="text-small text-muted-foreground">{sub}</div>' if sub else ""
    return f'<li class="flex gap-3 items-start py-2">{m}<div><div class="text-body font-bold {"text-muted-foreground" if state=="todo" else ""}">{label}</div>{s}</div></li>'
S["s1-pay-progress"]=page("Kolo · Paying", sheet(f'''<div class="rounded-2xl bg-secondary p-4 flex items-center justify-between"><div><div class="text-small text-muted-foreground">To Balogun Street Ajo · round 3</div><div class="text-h1 tabular-nums">₦20,000</div><div class="text-small text-muted-foreground">$13.40 from your Kolo balance</div></div>{avatar("Bisi","w-12 h-12 text-h3")}</div>
<ul class="mt-3">{step("Checked your balance","done","$74.62 available")}{step("Paying the pot","doing","Usually a few seconds")}{step("Telling the circle","todo")}</ul>
{btn("Paying ₦20,000…","disabled",icon="loader-circle",cls="mt-3 [&_svg]:animate-spin")}<p class="text-center text-small text-muted-foreground mt-2">Keep this open. You won't be charged twice.</p>''',"Pay my share",home_dim()))
S["s2-pay-failed"]=page("Kolo · Pay failed", sheet(f'''<div class="rounded-2xl bg-danger-soft p-4 flex gap-3"><span class="w-10 h-10 rounded-xl bg-destructive text-white grid place-items-center shrink-0">{ic("circle-x","w-5 h-5")}</span><div><div class="text-h3 text-destructive">Payment didn't go through</div><p class="text-small mt-0.5">The network was busy and timed out. <b>Your ₦20,000 is still in your balance.</b> Nothing was taken.</p></div></div>
<ul class="mt-3">{step("Checked your balance","done","$74.62 available")}{step("Paying the pot","fail","Timed out after 30s · ref KL-PY-3F8A")}{step("Telling the circle","todo")}</ul>
{btn("Try again","primary",icon="rotate-cw",cls="mt-3")}{btn("Pay later","ghost",size="h-11 text-[15px]",cls="mt-1")}''',"Pay my share",home_dim()))
S["s3-feed-loading"]=page("Kolo · Feed loading", status_bar()+home_header()+f'''<main class="px-5 space-y-3">
{pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov")}
{card('<div class="flex items-center justify-between"><h3 class="text-h3">Activity</h3><span class="flex items-center gap-1.5 text-small font-bold text-muted-foreground">'+spinner("w-4 h-4")+'Loading…</span></div><ul class="mt-2 space-y-3">'+"".join(f'<li class="flex items-center gap-3 animate-pulse"><div class="w-9 h-9 rounded-full bg-secondary"></div><div class="flex-1 space-y-1.5">{skel("h-3.5 w-"+w)}{skel("h-3 w-20")}</div>{skel("h-3.5 w-14")}</li>' for w in ["40","32","44","36"])+'</ul><p class="mt-3 text-small text-muted-foreground">Getting the latest payments. Payments already made are safe.</p>')}
</main>{pay_bar()}{bottom_nav("circle")}''')
S["s4-pay-success"]=page("Kolo · Paid", sheet(f'''<div class="text-center py-2"><div class="mx-auto w-16 h-16 rounded-full bg-success text-white grid place-items-center">{ic("check","w-9 h-9")}</div>
<h3 class="text-h1 mt-3">Paid ₦20,000</h3><p class="text-body text-muted-foreground">$13.40 · round 3 of 6 · 27 Oct, 10:51</p>
<p class="text-body mt-3">It shows in the circle at the next update, usually within a few minutes.</p></div>
<div class="mt-3 flex justify-center">{proof_link("Saved securely · receipt")}</div>{btn("Done","primary",cls="mt-4")}''',"Pay my share",home_dim()))
