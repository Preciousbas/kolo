# v2.3 sign-up: wallet or Google, profile, create/join. Overrides 00*, 01* from screens_a.
from kit import *
from screens_a import wrow, wtile, found, chev, tabs, field, inp, seg, S as A, home_header, pot_card, noticed_strip
S={}
G_TILE='<span class="w-6 h-6 rounded-full bg-card border border-border grid place-items-center text-[13px] font-extrabold text-foreground">G</span>'
ADDR="0x7a3f…c91e"
def invite_banner():
    return f'<div class="rounded-2xl bg-accent-soft border border-accent/20 p-3 flex gap-3 items-center">{avatar("Ada","w-10 h-10 text-body")}<div class="text-small"><b>Ada invited you to Balogun Street Ajo.</b><br><span class="text-muted-foreground">Sign in and we\'ll take you straight back to the invite.</span></div></div>'
def signin_body(invite=False):
    top = f'<div class="mt-6">{invite_banner()}</div>' if invite else f'''<p class="text-body text-muted-foreground mt-4">Run your ajo, esusu or family contribution in one place. Kolo tracks who has paid, reminds people at the right time and pays out the pot when it's full.</p>
<div class="mt-6 space-y-3">
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}Everyone sees the same record</div>
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}The pot pays out automatically</div>
 <div class="flex items-center gap-3 text-body">{ic("check","w-5 h-5 text-success")}Kolo learns how your circle pays</div></div>'''
    return status_bar()+f'''
<div class="px-6 pt-10 flex flex-col h-[800px]">
<img src="../brand/final/kolo_lockup_light.svg" class="h-12 self-start">
<h1 class="text-display mt-8">Save together.<br>Get paid on your turn.</h1>
{top}
<div class="mt-auto mb-8 space-y-3">
{btn("Connect a wallet", "outline", icon="wallet")}
<button class="w-full h-14 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 border-border bg-card text-foreground text-[16px]">{G_TILE}Continue with Google</button>
<p class="text-small text-muted-foreground text-center px-2">No wallet yet? Continue with Google and Kolo sets one up for you. Your money stays yours either way.</p>
<p class="text-[12px] text-muted-foreground text-center">By continuing you agree to Kolo's <a class="underline">terms</a> and <a class="underline">privacy notice</a>.</p></div></div>'''
S["00-signin"]=page("Kolo · Sign in", signin_body())
SB=signin_body()
S["00a-wallet-sheet"]=page("Kolo · Connect wallet", sheet(f'''<p class="text-body text-muted-foreground -mt-1 mb-4">Pick the wallet you use. You'll approve in that app. Kolo never sees your recovery phrase.</p>
<div class="space-y-2">{wrow("S","Slush","Recommended",found+chev,sel=True)}</div>
<p class="text-small font-bold mt-5 mb-2">Other wallets</p>
<div class="space-y-2">{wrow("P","Phantom","On this device",chev,"bg-secondary text-foreground")}{wrow("N","Nightly","On this device",chev,"bg-secondary text-foreground")}</div>
<p class="text-small text-muted-foreground text-center mt-5">Don't see yours? <a class="font-bold text-primary underline underline-offset-4">Get Slush</a> or <a class="font-bold text-primary underline underline-offset-4">continue with Google</a></p>''',"Connect a wallet", SB))
S["00b-no-wallet"]=page("Kolo · No wallet found", sheet(f'''<div class="text-center pt-2">
<div class="mx-auto w-16 h-16 rounded-full bg-secondary grid place-items-center">{ic("wallet","w-8 h-8 text-muted-foreground")}</div>
<h3 class="text-h2 mt-4">No wallet app found</h3>
<p class="text-body text-muted-foreground mt-2">You can get Slush (free, about 2 minutes), or skip it and continue with Google. Kolo will set up a wallet for you.</p></div>
<div class="mt-5 space-y-2">{btn("Continue with Google","primary",icon="")}{btn("Get Slush","outline",icon="external-link")}{btn("I've installed it · try again","ghost",icon="rotate-cw",size="h-11 text-[15px]")}</div>''',"No wallet found", SB))
def wait_tile(icon_inner, spin=True, badge=None):
    b = badge or (f'<span class="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-card grid place-items-center shadow-card">{spinner("w-5 h-5 text-primary")}</span>' if spin else "")
    return f'<div class="mx-auto w-16 h-16 rounded-2xl bg-foreground text-background grid place-items-center text-h1 font-extrabold relative">{icon_inner}{b}</div>'
S["00c-wallet-connecting"]=page("Kolo · Connecting", sheet(f'''<div class="text-center pt-2">{wait_tile("S")}
<p class="text-micro uppercase text-muted-foreground mt-5">Step 1 of 2 · Connect</p>
<h3 class="text-h2 mt-1">Approve in Slush</h3>
<p class="text-body text-muted-foreground mt-2">Slush will ask to connect to Kolo. This only shares your wallet address. It doesn't move any money.</p></div>
<div class="mt-6 space-y-2">{btn("Waiting for Slush…","disabled",icon="loader-circle")}{btn("Use a different wallet","ghost",size="h-11 text-[15px]")}</div>''',"Connecting", SB))
S["00d-sign-message"]=page("Kolo · Sign to prove it's you", sheet(f'''<div class="text-center pt-2">{wait_tile("S")}
<p class="text-micro uppercase text-muted-foreground mt-5">Step 2 of 2 · Prove it's you</p>
<h3 class="text-h2 mt-1">Sign in Slush to finish</h3>
<p class="text-body text-muted-foreground mt-2">Slush will show a short message from Kolo. Signing it proves this wallet is yours.</p></div>
<div class="mt-4 rounded-2xl bg-secondary p-4 text-small space-y-2">
<div class="flex gap-2">{ic("badge-check","w-4 h-4 mt-0.5 text-success shrink-0")}<span><b>Free.</b> No fee, no payment, no money moves.</span></div>
<div class="flex gap-2">{ic("file-text","w-4 h-4 mt-0.5 text-muted-foreground shrink-0")}<span>The message reads <b>"Sign in to Kolo"</b> with today's date and a one-time code.</span></div></div>
<div class="mt-5 space-y-2">{btn("Waiting for your signature…","disabled",icon="loader-circle")}{btn("Cancel","ghost",size="h-11 text-[15px]")}</div>''',"Prove it's you", SB))
S["00e-sign-rejected"]=page("Kolo · Signature declined", sheet(f'''<div class="rounded-2xl bg-danger-soft p-4 flex gap-3"><span class="w-10 h-10 rounded-xl bg-destructive text-destructive-foreground grid place-items-center shrink-0">{ic("x","w-5 h-5")}</span><div><div class="text-h3 text-destructive">You didn't sign, so you're not signed in</div><p class="text-small mt-0.5">That's fine. Nothing was shared and no money moved. Kolo needs the signature once to know the wallet is yours.</p></div></div>
<div class="mt-5 space-y-2">{btn("Sign again",icon="rotate-cw")}{btn("Use a different wallet","outline")}{btn("Continue with Google instead","ghost",size="h-11 text-[15px]")}</div>''',"Not signed in", SB))
def gsheet(inner,title): return page("Kolo · "+title, sheet(inner,title,SB))
S["00f-google-redirect"]=gsheet(f'''<div class="text-center pt-2"><div class="mx-auto w-16 h-16 rounded-2xl bg-card border-2 border-border grid place-items-center text-h1 font-extrabold relative">G<span class="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-card grid place-items-center shadow-card">{spinner("w-5 h-5 text-primary")}</span></div>
<h3 class="text-h2 mt-5">Opening Google…</h3>
<p class="text-body text-muted-foreground mt-2">Pick your Google account in the window that opens. Kolo only gets your name and email to set up your wallet.</p></div>
<div class="mt-6 space-y-2">{btn("Waiting for Google…","disabled",icon="loader-circle")}{btn("Cancel","ghost",size="h-11 text-[15px]")}</div>
<p class="mt-3 text-small text-muted-foreground text-center">Nothing opened? <a class="font-bold text-primary underline underline-offset-4">Open Google sign-in</a></p>''',"Continue with Google")
def stp(label,state):
    i={"done":ic("circle-check","w-5 h-5 text-success"),"now":spinner("w-5 h-5 text-primary"),"todo":'<span class="w-5 h-5 rounded-full border-2 border-border"></span>'}[state]
    return f'<div class="flex items-center gap-3 py-2 text-body {"text-muted-foreground" if state=="todo" else ""} {"font-bold" if state=="now" else ""}">{i}{label}</div>'
S["00g-google-wallet-setup"]=gsheet(f'''<div class="text-center pt-1"><div class="mx-auto w-16 h-16 rounded-2xl bg-primary-soft grid place-items-center">{ic("wallet","w-8 h-8 text-primary")}</div>
<h3 class="text-h2 mt-4">Setting up your Kolo wallet</h3>
<p class="text-body text-muted-foreground mt-2">This takes a few seconds. You won't need a recovery phrase. Your Google account is how you get back in.</p></div>
<div class="mt-4 rounded-2xl bg-secondary px-4 py-2">{stp("Signed in with Google","done")}{stp("Creating your wallet","now")}{stp("Done","todo")}</div>
<p class="mt-4 text-small text-muted-foreground text-center">Keep this page open.</p>''',"Almost there")
S["00h-google-failed"]=gsheet(f'''<div class="rounded-2xl bg-danger-soft p-4 flex gap-3"><span class="w-10 h-10 rounded-xl bg-destructive text-destructive-foreground grid place-items-center shrink-0">{ic("circle-alert","w-5 h-5")}</span><div><div class="text-h3 text-destructive">Google sign-in didn't finish</div><p class="text-small mt-0.5">The window was closed or Google said no. No wallet was created and nothing was saved.</p></div></div>
<div class="mt-4 rounded-xl bg-secondary p-3 text-small text-muted-foreground flex gap-2">{ic("info","w-4 h-4 shrink-0 mt-0.5")}<span>If no window opened, your browser may have blocked it. Allow pop-ups for Kolo, or tap Try again and we'll open Google in this tab.</span></div>
<div class="mt-5 space-y-2">{btn("Try again",icon="rotate-cw")}{btn("Connect a wallet instead","outline",icon="wallet")}</div>''',"Not signed in")
# ---------- profile
def pfield(label, val, help="", state="ok", ph=""):
    bc={"ok":"border-border","focus":"border-primary ring-4 ring-primary/15","err":"border-destructive"}[state]
    v = f'<span class="text-muted-foreground font-medium">{ph}</span>' if not val else val
    h=""
    if help: h=f'<p class="text-small mt-1 {"text-destructive font-semibold flex gap-1.5" if state=="err" else "text-muted-foreground"}">{ic("circle-alert","w-4 h-4 mt-0.5 shrink-0") if state=="err" else ""}<span>{help}</span></p>'
    return f'<label class="block"><span class="text-small font-bold">{label}</span><div class="mt-1.5 h-12 px-4 rounded-xl border-2 {bc} bg-card flex items-center text-body font-semibold">{v}</div>{h}</label>'
def profile(state):
    g = state!="empty"
    f,l,d = ("Ngozi","Eze","Ngozi E.") if g else ("","","")
    st = lambda s: s
    if state=="error":
        fields = pfield("First name","Ngozi")+pfield("Last name","","Add your last name. Only you and Kolo see it.","err")+pfield("Display name","N","Use 2 to 24 characters.","err")
    elif state=="empty":
        fields = pfield("First name","",ph="e.g. Ngozi",state="focus")+pfield("Last name","",ph="e.g. Eze")+pfield("Display name","","Members of your circles see this. 2 to 24 characters.",ph="e.g. Ngozi E.")
    else:
        fields = pfield("First name",f)+pfield("Last name",l)+pfield("Display name",d,"Members of your circles see this.")
    chip = f'<div class="rounded-2xl bg-secondary p-3 flex items-center gap-3"><span class="w-10 h-10 rounded-xl bg-card grid place-items-center">{ic("wallet","w-5 h-5 text-primary")}</span><div class="flex-1 text-small"><b>Signed in with Google</b><br><span class="text-muted-foreground">Your Kolo wallet is ready · <span class="tabular-nums">{ADDR}</span></span></div>{ic("circle-check","w-5 h-5 text-success")}</div>'
    preview = f'<div class="flex items-center gap-2 text-small text-muted-foreground">{ic("eye","w-4 h-4")}Circle members will see: {avatar("Ngozi","w-6 h-6 text-[11px]")}<b class="text-foreground">{("N" if state=="error" else d) or "your display name"}</b></div>'
    b = {"empty":btn("Continue","disabled"),"filled":btn("Continue",icon="arrow-right"),"error":btn("Continue","disabled"),"saving":btn("Saving…","disabled",icon="loader-circle")}[state]
    err_banner = f'<div class="rounded-xl bg-danger-soft text-destructive p-3 text-small font-semibold flex gap-2">{ic("circle-alert","w-4 h-4 mt-0.5 shrink-0")}Fix 2 things to continue.</div>' if state=="error" else ""
    return page("Kolo · Your profile ("+state+")", status_bar()+top_bar("About you","",sub="Step 1 of 1 · takes 20 seconds")+f'''
<div class="px-5 pt-2 space-y-4 {"opacity-60" if state=="saving" else ""}">{chip}{err_banner}
<p class="text-body text-muted-foreground">Tell your circle who you are. We don't copy anything from Google, so type it how you want it.</p>
{fields}{preview}</div>
<div class="absolute bottom-0 inset-x-0 px-5 pb-7 pt-3 bg-background border-t border-border/70">{b}</div>''')
for s in ["empty","filled","error","saving"]: S[f"01p{['empty','filled','error','saving'].index(s)+1}-profile-{s}"]=profile(s)
# ---------- signed-in header + chip
def chip(name="Ngozi E.", google=False):
    gb = f'<span class="absolute -right-1 -bottom-1">{G_TILE.replace("w-6 h-6","w-4 h-4").replace("text-[13px]","text-[9px]")}</span>' if google else ""
    return f'<button class="h-11 pl-1 pr-3 rounded-full bg-card border border-border flex items-center gap-2 max-w-[170px]"><span class="relative">{avatar("Ngozi","w-9 h-9 text-small")}{gb}</span><span class="text-left leading-tight min-w-0"><span class="block text-small font-bold truncate">{name}</span><span class="block text-[12px] text-muted-foreground tabular-nums">{ADDR}</span></span></button>'
def signed_header(google=False):
    return f'<header class="h-16 px-5 flex items-center gap-3"><img src="../brand/option_A/kolo_mark.svg" class="w-8 h-8"><div class="flex-1 text-h3">Kolo</div>{chip(google=google)}</header>'
def home_under(google=False):
    return status_bar()+signed_header(google)+'<main class="px-5 space-y-3">'+pot_card(4,6,"₦80,000","$53.60","Due Wed 25 Nov",order=False)+noticed_strip("Tunde pays on the 27th, so his reminder moved there.")+'</main>'
S["00i-signed-in-header"]=page("Kolo · Signed in", home_under()+bottom_nav("circle"))
def menu(google):
    sub = f'<div class="flex items-center gap-1.5 text-small text-muted-foreground">{G_TILE.replace("w-6 h-6","w-4 h-4").replace("text-[13px]","text-[9px]")}Signed in with Google</div>' if google else f'<div class="text-small text-muted-foreground flex items-center gap-1.5">{ic("wallet","w-4 h-4")}Slush wallet</div>'
    item=lambda i,t,cls="": f'<div class="h-12 px-3 rounded-xl flex items-center gap-3 text-body font-semibold {cls}">{ic(i,"w-5 h-5")}{t}</div>'
    return f'''<div class="absolute inset-0 bg-foreground/20"></div><div class="absolute right-4 top-[104px] w-[290px] rounded-2xl bg-popover shadow-sheet border border-border p-2">
<div class="p-3 flex items-center gap-3 border-b border-border/70 mb-1">{avatar("Ngozi","w-11 h-11 text-body")}<div><div class="text-body font-bold">Ngozi E.</div>{sub}<div class="text-[12px] text-muted-foreground tabular-nums">{ADDR}</div></div></div>
{item("copy","Copy wallet address")}{item("external-link","View on explorer")}{item("user-round-pen","Edit profile")}
<div class="border-t border-border/70 my-1"></div>{item("log-out","Sign out","text-destructive")}</div>'''
S["00j-chip-menu"]=page("Kolo · Account menu", home_under(True)+bottom_nav("circle")+menu(True))
S["00k-signout-confirm"]=page("Kolo · Sign out?", home_under(True)+bottom_nav("circle")+f'''<div class="absolute inset-0 bg-foreground/55"></div>
<div class="absolute inset-x-6 top-[260px] rounded-[24px] bg-card p-6 shadow-sheet"><h2 class="text-h2">Sign out of Kolo?</h2>
<p class="text-body text-muted-foreground mt-2">Your circles and money stay as they are. To get back in, continue with the same Google account.</p>
<div class="mt-5 space-y-2">{btn("Sign out","danger",icon="log-out")}{btn("Stay signed in","outline")}</div></div>''')
# ---------- create / join (updated: signed-in header chip, invite return)
def swap_header(html):
    old='<span class="text-small text-muted-foreground flex items-center gap-1.5"><span class="w-6 h-6 rounded-full bg-success-soft text-success grid place-items-center text-[11px] font-bold">N</span>Ngozi</span>'
    return html.replace(old,"")
S["01-create"]=swap_header(A["01-create"]).replace('<header class="h-14','<header class="h-14').replace(">New circle<",">New circle<",1)
# welcome strip for first-run create: replace title sub
S["01-create"]=S["01-create"].replace('<div class="text-h3 truncate">New circle</div>','<div class="text-h3 truncate">New circle</div><div class="text-small text-muted-foreground">Signed in as Ngozi E.</div>')
S["01b-join"]=A["01b-join"].replace('<div class="text-h3 truncate">Join a circle</div>','<div class="text-h3 truncate">Join a circle</div><div class="text-small text-muted-foreground">Signed in as Ngozi E.</div>').replace('Join with a code','Join with a code').replace('btn','btn')
S["01b-join"]=S["01b-join"].replace("Ada shared this in your WhatsApp group.","From Ada's invite link. You'll join as <b>Ngozi E.</b>")
S["01c-join-invalid"]=A["01c-join-invalid"].replace("We can't find a circle with that code. Check it with the person who sent it. Codes are 4 letters or numbers after KOLO-.","We can't find a circle with that code. Check it with the person who sent it. Codes look like KOLO- and 4 letters or numbers.")
S["01c-join-invalid"]=S["01c-join-invalid"].replace("</p></div>",f'''</p>
<div class="mt-6 rounded-2xl bg-secondary p-4 text-small"><b>Opened an old link?</b><p class="text-muted-foreground mt-1">Invites stop working when a circle is full or the organiser turns the link off. Ask for a new one.</p></div></div>''',1)
S["01d-invite-signed-out"]=page("Kolo · Invite, signed out", signin_body(invite=True))
S["01e-invite-return"]=S["01b-join"].replace('<div class="px-5 pt-4 space-y-4">',f'<div class="px-5 pt-4 space-y-4"><div class="rounded-xl bg-success-soft text-success p-3 text-small font-semibold flex gap-2">{ic("circle-check","w-4 h-4 mt-0.5 shrink-0")}You\'re signed in. Here\'s the invite you opened.</div>',1).replace("Kolo · Join a circle","Kolo · Back to your invite")
