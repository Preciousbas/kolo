# Payout screens: automatic payout (02g, 02h) and the manual fallback (02i, 02i2). Payout badge sheet c2.
from kit import *
from screens_a import (home_header, pot_card, activity, feed_item, pay_bar, payout_order, step, ORDER)
S={}
PAID_AT="Fri 27 Nov, 08:14"
ORDER_R4=[("Ada","Sep","done"),("Emeka","Oct","done"),("Bisi","Nov","done"),("Ngozi","Dec","you_now"),("Femi","Jan",""),("Tunde","Feb","")]
def round_pot(paid, ngn, usd, due, who, porder, order=True, bar="bg-success"):
    h=pot_card(paid,6,ngn,usd,due,bar=bar,who=who,porder=porder,order=order)
    return h.replace(f'<b class="text-foreground">Ngozi</b>','<b class="text-foreground">You</b>')
def payout_item(mode="auto", new=True):
    sub="Fri 27 Nov, 08:14 · automatic" if mode=="auto" else "Fri 27 Nov, 08:20 · released by you"
    bg="bg-success-soft/60 -mx-2 px-2 rounded-xl" if new else ""
    return (f'<li class="flex items-center gap-3 py-2.5 {bg}"><div class="relative"><div class="w-9 h-9 rounded-full bg-turn/25 grid place-items-center"><img src="../brand/option_A/kolo_mark.svg" class="w-5 h-5"></div>'
            f'<span class="w-5 h-5 rounded-full bg-success text-white grid place-items-center absolute -bottom-0.5 -right-0.5 ring-2 ring-card">{ic("check","w-3 h-3")}</span></div>'
            f'<div class="flex-1 min-w-0"><div class="text-body"><b>Round 3 complete</b> · pot paid to Bisi</div><div class="text-small text-muted-foreground">{sub}</div></div>'
            f'<div class="text-right"><div class="text-body font-bold tabular-nums">₦120,000</div><div class="text-[12px] text-muted-foreground tabular-nums">$80.40</div></div></li>')
def done_card(mode="auto"):
    how=("Paid automatically the moment Tunde's share came in." if mode=="auto"
         else "You released it after the last share came in.")
    return f'''<section class="rounded-[20px] bg-card border-2 border-success/40 shadow-card p-4">
<div class="flex items-center justify-between"><span class="text-micro uppercase text-success flex items-center gap-1.5">{ic("circle-check","w-4 h-4")}Round 3 complete</span><span class="text-small text-muted-foreground">{PAID_AT}</span></div>
<div class="mt-3 flex items-center gap-3">{avatar("Bisi","w-12 h-12 text-h3","ring-[3px] ring-turn ring-offset-2 ring-offset-card")}
<div class="flex-1"><div class="text-h3">Pot paid to Bisi · <span class="tabular-nums">₦120,000</span></div><div class="text-small text-muted-foreground tabular-nums">$80.40 · 6 of 6 paid</div></div></div>
<p class="mt-2 text-small">{how}</p>
<div class="mt-1.5 flex items-center justify-between"><span class="text-small text-muted-foreground">Ref KL-PO-7C21</span>{proof_link("View receipt")}</div></section>'''
FEED_DONE=(payout_item()+feed_item("Tunde","paid","₦20,000",PAID_AT)+feed_item("Kolo","sent Tunde a reminder","","Fri 27 Nov, 8:00 · on his payday",kind="kolo"))
S["02g-home-payout-done"]=page("Kolo · Round complete, pot paid out", status_bar()+home_header("Round 4 of 6")+f'''<main class="px-5 space-y-3 pb-24">
{done_card()}
{round_pot(0,"₦0","$0.00","Due Fri 25 Dec","Ngozi",ORDER_R4)}
{activity(FEED_DONE,'live')}
</main>{bottom_nav("circle")}''')
# 02h · Bisi's own view
dots="".join(f'<span class="absolute w-3.5 h-3.5 rounded-full {"bg-turn" if i==0 else "bg-foreground/80"}" style="left:calc(50% + {round(70*__import__("math").cos(__import__("math").radians(-90+60*i)))}px - 7px);top:calc(50% + {round(70*__import__("math").sin(__import__("math").radians(-90+60*i)))}px - 7px)"></span>' for i in range(6))
S["02h-payout-received"]=page("Kolo · Your payout arrived", status_bar()+top_bar("",left="close",right=mode_badge("test"))+f'''<main class="px-6 pt-4 text-center">
<div class="relative mx-auto w-44 h-44">{dots}<div class="absolute inset-0 m-auto w-24 h-24 rounded-full bg-primary text-white grid place-items-center shadow-card">{ic("check","w-12 h-12")}</div></div>
<div class="text-micro uppercase text-primary mt-4">Round 3 · Balogun Street Ajo</div>
<h1 class="text-display mt-2">Your turn came<span style="margin-left:-.1em">.</span></h1>
<p class="text-h3 mt-2"><span class="tabular-nums">₦120,000</span> is in your Kolo balance</p>
<p class="text-body text-muted-foreground tabular-nums">$80.40 test USDC</p>
<div class="mt-6 text-left">{card(row("From","All 6 members · round 3")+row("Arrived",PAID_AT)+row("How","Paid automatically when the last share came in")+row("Ref","KL-PO-7C21"),"px-4 py-1")}</div>
</main>
<div class="absolute bottom-0 inset-x-0 px-6 pb-10 space-y-2">{btn("See my balance",icon="wallet")}{btn("Back to the circle","ghost",size="h-11 text-[15px]")}</div>''')
# 02i · manual fallback (only if auto payout can't ship)
S["02i-release-payout"]=page("Kolo · Pot full, release payout", status_bar()+home_header()+f'''<main class="px-5 space-y-3 pb-48">
<section class="rounded-[20px] bg-success-soft border border-success/30 p-4 flex gap-3"><div class="w-10 h-10 rounded-xl bg-success text-white grid place-items-center shrink-0">{ic("circle-check","w-5 h-5")}</div><div class="flex-1"><h3 class="text-h3 text-success">The pot is full</h3><p class="text-small mt-0.5">Everyone has paid round 3. One tap sends ₦120,000 · $80.40 to Bisi.</p></div></section>
{round_pot(6,"₦120,000","$80.40","Full · Fri 27 Nov","Bisi",ORDER)}
{activity(feed_item("Tunde","paid","₦20,000",PAID_AT,new=True)+feed_item("Kolo","sent Tunde a reminder","","Fri 27 Nov, 8:00 · on his payday",kind="kolo")+feed_item("Ngozi","(you) paid","₦20,000","Wed 25 Nov, 09:14"),'stale',1)}
</main>
<div class="absolute bottom-[76px] inset-x-0 px-5 pt-3 pb-3 bg-gradient-to-t from-background via-background to-background/0">{btn("Release payout to Bisi",icon="hand-coins")}<p class="text-center text-small text-muted-foreground mt-1.5">Only you, as organiser, can release it. Kolo reminds you at 18:00 if it's still waiting.</p></div>{bottom_nav("circle")}''')
def dim_full(): return status_bar()+home_header()+'<main class="px-5 space-y-3">'+round_pot(6,"₦120,000","$80.40","Full · Fri 27 Nov","Bisi",ORDER,order=False)+'</main>'
S["02i2-release-confirming"]=page("Kolo · Releasing payout", sheet(f'''<div class="rounded-2xl bg-secondary p-4 flex items-center justify-between"><div><div class="text-small text-muted-foreground">Round 3 pot to Bisi</div><div class="text-h1 tabular-nums">₦120,000</div><div class="text-small text-muted-foreground">$80.40 · 6 of 6 paid</div></div>{avatar("Bisi","w-12 h-12 text-h3","ring-[3px] ring-turn ring-offset-2 ring-offset-card")}</div>
<ul class="mt-3">{step("Checked the pot is full","done","6 of 6 shares in")}{step("Sending the pot to Bisi","doing","Usually a few seconds")}{step("Telling the circle","todo")}</ul>
{btn("Releasing…","disabled",icon="loader-circle",cls="mt-3 [&_svg]:animate-spin")}<p class="text-center text-small text-muted-foreground mt-2">Keep this open. The pot can only be paid out once.</p>''',"Release payout",dim_full()))
# c2 · payout badge states (existing PayoutStrip tag, mapped to the data statuses)
def strip(order): return payout_order(order=order).replace('mt-3 pt-3 border-t border-border/70','')
S["c2-payout-badges"]=page("Kolo · Payout status badges", f'''<div class="p-5 space-y-4"><div class="text-micro uppercase text-muted-foreground">PayoutStrip · status badges (same component)</div>
{card(strip([("Ada","Sep","done"),("Emeka","Oct","done"),("Bisi","Nov","now"),("Ngozi","Dec","you"),("Femi","Jan",""),("Tunde","Feb","skipped")]))}
<ul class="space-y-2 text-small">
<li class="flex gap-2"><b class="w-24 shrink-0">paid</b><span>Dimmed avatar + ✓ month. Set the moment the payout lands (auto or manual).</span></li>
<li class="flex gap-2"><b class="w-24 shrink-0">scheduled</b><span>Gold "Now" if it's this round; terracotta "Next" if it's you next; otherwise the month.</span></li>
<li class="flex gap-2"><b class="w-24 shrink-0">skipped</b><span>Faded avatar + "Skipped". The turn moved (member left or asked to wait). Tap shows why.</span></li></ul></div>''', 400)
