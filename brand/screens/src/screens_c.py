from kit import *
S={}
def wallet_body(cur="ngn"):
    tg=lambda k,l: f'<span class="h-8 px-3 rounded-full grid place-items-center text-small font-bold {"bg-card text-foreground shadow-card" if k==cur else "text-muted-foreground"}">{l}</span>'
    big="₦111,370" if cur=="ngn" else "$74.62"; small="$74.62 USDC" if cur=="ngn" else "≈ ₦111,370"
    act=lambda i,t,s,a,c="": f'<li class="flex items-center gap-3 py-2.5"><span class="w-9 h-9 rounded-full bg-secondary grid place-items-center">{ic(i,"w-4 h-4")}</span><div class="flex-1"><div class="text-body font-bold">{t}</div><div class="text-small text-muted-foreground">{s}</div></div><span class="text-body font-bold tabular-nums {c}">{a}</span></li>'
    return status_bar()+top_bar("Wallet",left="")+f'''<div class="px-5 pb-3">{mode_badge("test")}</div><main class="px-5 space-y-3">
{card(f"""<div class="flex items-center justify-between"><span class="text-micro uppercase text-muted-foreground">Kolo balance</span><div class="p-1 rounded-full bg-secondary flex">{tg("ngn","₦ Naira")}{tg("usd","$ USDC")}</div></div>
<div class="mt-2 text-display tabular-nums">{big}</div><div class="text-small text-muted-foreground tabular-nums">{small}</div>
<div class="mt-3 rounded-xl bg-secondary px-3 py-2 text-small flex items-start gap-2">{ic("refresh-cw","w-4 h-4 mt-0.5 text-muted-foreground shrink-0")}<div><div><b class="tabular-nums">$1 = ₦1,492.50</b> <span class="text-muted-foreground">· shown for reference</span></div><div class="text-muted-foreground">Rate source: Tatum price data · updated 10:42 today</div></div></div>
<div class="mt-4 grid grid-cols-2 gap-2">{btn("Add money","primary",icon="plus",size="h-12 text-[15px]")}{btn("Withdraw","outline",icon="arrow-up-right",size="h-12 text-[15px]")}</div>""")}
{card('<h3 class="text-h3">Recent</h3><ul class="divide-y divide-border/60 mt-1">'+act("arrow-down-left","Added from naira","Today, 10:44 · ₦50,000 · simulated","+$33.50","text-success")+act("users-round","Paid Balogun Street Ajo","Round 3 · Wed 25 Nov","−$13.40")+act("gift","Payout from Office Ajo","Sun 1 Nov","+$134.00","text-success")+act("search-check","Tally Desk checked your score","You allowed lender checks · Tue 27 Oct","Free")+'</ul>')}
</main>{bottom_nav("wallet")}'''
S["06a-wallet"]=page("Kolo · Wallet", wallet_body("ngn"))
S["06a2-wallet-usdc"]=page("Kolo · Wallet USDC", wallet_body("usd"))
def opt(sel, icon, t, s, tag=""):
    tg=f'<span class="ml-1 text-[11px] font-bold uppercase tracking-wide text-primary">{tag}</span>' if tag else ""
    return f'<div class="rounded-xl border-2 {"border-primary bg-primary-soft/50" if sel else "border-border bg-card"} p-3 flex gap-3 items-center"><span class="w-10 h-10 rounded-xl {"bg-primary text-primary-foreground" if sel else "bg-secondary"} grid place-items-center shrink-0 text-h3 font-extrabold">{icon}</span><div class="flex-1"><div class="text-body font-bold">{t}{tg}</div><div class="text-small text-muted-foreground">{s}</div></div><span class="w-5 h-5 rounded-full {"border-[6px] border-primary bg-card" if sel else "border-2 border-border"} shrink-0"></span></div>'
def amount_box(pre, v):
    return f'<div class="h-16 px-4 rounded-2xl border-2 border-primary bg-card flex items-center gap-2"><span class="text-h1 text-muted-foreground">{pre}</span><span class="text-[30px] font-extrabold tabular-nums">{v}</span></div>'
S["06b-deposit-sheet"]=page("Kolo · Add money", sheet(f'''{mode_badge("test")}
<p class="text-small font-bold mt-4 mb-2">Pay in with</p><div class="space-y-2">{opt(True,"₦","Naira","Simulated top-up at today's rate","Most people")}{opt(False,"$","USDC","Send from another wallet you own")}</div>
<p class="text-small font-bold mt-4 mb-2">Amount</p>{amount_box("₦","50,000")}
<div class="mt-3 rounded-xl bg-secondary p-3 text-small space-y-1">
<div class="flex justify-between"><span class="text-muted-foreground">Rate</span><b class="tabular-nums">$1 = ₦1,492.50</b></div>
<div class="flex justify-between"><span class="text-muted-foreground">Fee</span><b class="tabular-nums">₦0 · test mode</b></div>
<div class="flex justify-between"><span class="text-muted-foreground">You'll get</span><b class="tabular-nums text-success">$33.50</b></div>
<div class="text-muted-foreground pt-1 border-t border-border">Rate source: Tatum price data · updated 10:42 · held for 10 min</div></div>
{btn("Add ₦50,000",cls="mt-4")}''',"Add money", wallet_body()))
S["07a-withdraw-sheet"]=page("Kolo · Withdraw", sheet(f'''{mode_badge("test")}
<p class="text-small font-bold mt-4 mb-2">Get it as</p><div class="space-y-2">{opt(True,"₦","Naira to your bank","GTBank ••4821 · simulated in test mode")}{opt(False,"$","USDC","To another wallet you own")}</div>
<p class="text-small font-bold mt-4 mb-2">Amount <span class="font-medium text-muted-foreground">· $74.62 available</span></p>{amount_box("$","20.00")}
<div class="mt-3 rounded-xl bg-secondary p-3 text-small space-y-1">
<div class="flex justify-between"><span class="text-muted-foreground">Rate</span><b class="tabular-nums">$1 = ₦1,492.50</b></div>
<div class="flex justify-between"><span class="text-muted-foreground">Fee</span><b class="tabular-nums">₦0 · test mode</b></div>
<div class="flex justify-between"><span class="text-muted-foreground">Arrives in your bank</span><b class="tabular-nums text-success">₦29,850</b></div>
<div class="text-muted-foreground pt-1 border-t border-border">Rate source: Tatum price data · updated 10:42 · held for 10 min</div></div>
{btn("Withdraw $20.00",cls="mt-4")}''',"Withdraw", wallet_body()))
from screens_a import step
def amount_pair(a,b):
    return f'<div class="rounded-2xl bg-card border border-border/70 shadow-card p-4 flex items-center justify-between"><div><div class="text-small text-muted-foreground">You add</div><div class="text-h1 tabular-nums">{a}</div></div>{ic("arrow-right","w-6 h-6 text-primary")}<div class="text-right"><div class="text-small text-muted-foreground">Balance gets</div><div class="text-h1 tabular-nums text-success">{b}</div></div></div>'
QUOTE_SUB="$1 = ₦1,492.50 · Tatum price data · 10:42"
DEP_STEPS=lambda a,b,c3: '<ul>'+step("Confirming your quote" + ("…" if a=="doing" else ""),a,QUOTE_SUB)+step("Adding ₦50,000 to your Kolo balance"+("…" if b=="doing" else ""),b,"Usually a few seconds" if b=="doing" else ("Couldn't finish · ref KL-DP-7Q4M2" if b=="fail" else ("$33.50 added · 10:44" if b=="done" else "")))+step("Receipt ready",c3)+'</ul>'
WD_STEPS=lambda a,b,c3: '<ul>'+step("Confirming your quote"+("…" if a=="doing" else ""),a,QUOTE_SUB)+step("Sending ₦29,850 to GTBank ••4821"+("…" if b=="doing" else ""),b,"Usually a few seconds" if b=="doing" else "")+step("Receipt ready",c3)+'</ul>'
def ramp(title, head, pair, steps, buttons, icon, tone, body="", hdr="Add money"):
    return page(title, status_bar()+top_bar(hdr,left="close")+f'''<div class="px-5">{mode_badge("test")}</div><main class="px-5 pt-5">
<div class="text-center"><div class="mx-auto w-16 h-16 rounded-full {tone} grid place-items-center">{icon}</div><h1 class="text-h1 mt-3">{head}</h1>{f'<p class="text-body text-muted-foreground mt-1">{body}</p>' if body else ""}</div>
<div class="mt-5">{pair}</div><div class="mt-3">{card(steps)}</div></main><div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 space-y-2">{buttons}</div>''')
S["06c-ramp-confirming"]=ramp("Kolo · Confirming quote","Confirming your quote…",amount_pair("₦50,000","$33.50"),DEP_STEPS("doing","todo","todo"),btn("Confirming…","disabled",icon="loader-circle"),spinner("w-8 h-8"),"bg-primary-soft text-primary","Locking today's rate for this top-up.")
S["06c2-quote-changed"]=ramp("Kolo · Quote changed","The rate moved",amount_pair("₦50,000","$33.37"),'<ul>'+step("Your quote expired","fail","Held 10 min · was $1 = ₦1,492.50")+step("New quote","done","$1 = ₦1,498.20 · Tatum price data · 10:53")+'</ul>',btn("Add ₦50,000 at the new rate")+btn("Cancel","ghost",size="h-11 text-[15px]"),ic("refresh-cw","w-8 h-8"),"bg-warning-soft text-warning","Quotes hold for 10 minutes. Here's today's rate again.")
S["06d1-ramp-pending"]=ramp("Kolo · Ramp pending","Adding ₦50,000 to your Kolo balance…",amount_pair("₦50,000","$33.50"),DEP_STEPS("done","doing","todo"),btn("Back to wallet","outline"),spinner("w-8 h-8"),"bg-primary-soft text-primary","You can leave this screen; we'll tell you when it's in.")
S["06d2-ramp-converted"]=ramp("Kolo · Ramp converted","$33.50 added",amount_pair("₦50,000","$33.50"),DEP_STEPS("done","done","done"),btn("View receipt")+btn("Back to wallet","ghost",size="h-11 text-[15px]"),ic("check","w-9 h-9"),"bg-success text-white","Ready for your next round.")
S["06d3-ramp-failed"]=ramp("Kolo · Ramp failed","We couldn't add your ₦50,000",amount_pair("₦50,000","$0.00"),DEP_STEPS("done","fail","todo"),btn("Try again",icon="rotate-cw")+btn("Back to wallet","ghost",size="h-11 text-[15px]"),ic("x","w-9 h-9"),"bg-destructive text-white","Nothing changed in your balance. This is a simulated top-up, so no naira left your bank.")
S["07b-withdraw-confirming"]=ramp("Kolo · Withdraw confirming","Confirming your quote…",amount_pair("$20.00","₦29,850").replace("You add","You withdraw").replace("Balance gets","Bank gets"),WD_STEPS("doing","todo","todo"),btn("Confirming…","disabled",icon="loader-circle"),spinner("w-8 h-8"),"bg-primary-soft text-primary","Locking today's rate for this withdrawal.",hdr="Withdraw")
def receipt(title, kind, open_=False):
    if kind=="dep":
        rows=row("Naira paid in","₦50,000.00")+row("Fee","₦0.00 · test mode")+row("Rate","$1 = ₦1,492.50")+row("Rate source","Tatum price data")+row("Rate updated","27 Oct 2026, 10:42")
        hero=('USDC credited','$33.50'); sub="Added to your Kolo balance"; ref="KL-DP-20261027-7Q4M"; ts="27 Oct 2026, 10:44"
    else:
        rows=row("USDC withdrawn","$20.00")+row("Rate","$1 = ₦1,492.50")+row("Rate source","Tatum price data")+row("Rate updated","27 Oct 2026, 10:42")+row("Fee","₦0.00 · test mode")
        hero=('Naira sent','₦29,850.00'); sub="To GTBank ••4821 · Ngozi Eze"; ref="KL-WD-20261027-3K8P"; ts="27 Oct 2026, 10:58"
    det=f'''<div class="mt-1 rounded-xl bg-secondary px-3">{row("Network","Sui testnet")}{row("Asset","Test USDC")}{row("Transaction", '<span class="text-accent underline">0x8f3a…c21e ↗</span>')}{row("Your account",'0x4b2e…9d27')}</div>''' if open_ else ""
    return page(title, status_bar()+top_bar("Receipt",right=f'<span class="w-10 h-10 grid place-items-center">{ic("share-2","w-5 h-5")}</span>')+f'''<div class="px-5">{mode_badge("test")}</div><main class="px-5 pt-3 space-y-3">
{card(f"""<div class="text-center pb-3 border-b border-dashed border-border"><div class="mx-auto w-12 h-12 rounded-full bg-success text-white grid place-items-center">{ic("check","w-7 h-7")}</div><div class="text-micro uppercase text-muted-foreground mt-3">{hero[0]}</div><div class="text-display tabular-nums text-success">{hero[1]}</div><div class="text-small text-muted-foreground">{sub}</div><div class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-warning-soft text-warning px-2.5 py-1 text-small font-bold">{ic("flask-conical","w-4 h-4")}Simulated · no real naira moved</div></div>
<div class="mt-1">{rows}{row("Reference",ref)}{row("Time",ts)}</div>
<div class="mt-2 flex items-center justify-between h-10 text-body font-bold">View details{ic("chevron-up" if open_ else "chevron-down","w-5 h-5")}</div>{det}""","p-4")}
<div class="flex justify-center">{proof_link("Saved securely")}</div></main>''')
S["06e-deposit-receipt"]=receipt("Kolo · Deposit receipt","dep")
S["06e2-deposit-receipt-details"]=receipt("Kolo · Deposit receipt details","dep",True).replace("height:844px;overflow","height:1000px;overflow")
S["07e-withdraw-receipt"]=receipt("Kolo · Withdraw receipt","wd")

S["c1-mode-badges"]=page("Kolo · ModeBadge variants", f'''<div class="p-5 space-y-4"><div class="text-micro uppercase text-muted-foreground">ModeBadge · one component, two variants</div>
<div><div class="text-small font-bold mb-1">variant="test"</div>{mode_badge("test")}<p class="text-small text-muted-foreground mt-1">In use now: every wallet, add-money and withdraw screen (06a–07e).</p></div>
<div><div class="text-small font-bold mb-1">variant="sandbox" · later, for a real ramp partner</div>{mode_badge("sandbox")}<p class="text-small text-muted-foreground mt-1">Not used on current screens. Reserved for when a real partner's sandbox is wired in.</p></div>
<div><div class="text-small font-bold mb-1">Later, if both apply (test chain + real-partner sandbox)</div><div class="flex flex-col items-start gap-1.5">{mode_badge("test")}{mode_badge("sandbox")}</div><p class="text-small text-muted-foreground mt-1">Stack them, test first. Never merge them into one string.</p></div></div>''', 470)
