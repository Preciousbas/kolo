from kit import *
S={}
def switch(on): return f'<span class="w-12 h-7 rounded-full {"bg-success" if on else "bg-border"} relative shrink-0"><span class="absolute top-1 {"right-1" if on else "left-1"} w-5 h-5 rounded-full bg-white shadow"></span></span>'
HIST=["on","on","on","late","on","on","on","on","on","on","on","on"]
MON=["Nov","Dec","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct"]
def dots():
    c={"on":"bg-success","late":"bg-warning","miss":"bg-destructive"}
    return '<div class="grid grid-cols-12 gap-1.5">'+"".join(f'<div class="flex flex-col items-center gap-1"><span class="w-5 h-5 rounded-full {c[h]} grid place-items-center text-white">{ic("check","w-3 h-3") if h=="on" else ic("clock","w-3 h-3")}</span><span class="text-[10px] font-semibold text-muted-foreground">{m[0]}</span></div>' for h,m in zip(HIST,MON))+'</div>'
def knows(t, src):
    return f'<li class="py-2.5 flex gap-3"><span class="mt-0.5 text-accent">{ic("lightbulb","w-4 h-4")}</span><div class="flex-1"><div class="text-body font-semibold">{t}</div><div class="text-small text-muted-foreground">{src}</div></div><span class="text-small font-bold text-muted-foreground whitespace-nowrap">That\'s wrong</span></li>'
PROFILE=(status_bar()+top_bar("Your savings profile", right=f'<span class="w-10 h-10 grid place-items-center">{ic("share-2","w-5 h-5")}</span>')+f'''<main class="px-5 space-y-3 pb-24">
<div class="flex items-center gap-3">{avatar("Ngozi","w-14 h-14 text-h2")}<div><div class="text-h2">Ngozi Eze</div><div class="text-small text-muted-foreground">2 circles · saving with Kolo since Nov 2025</div></div></div>
{card(f"""<div class="flex items-center justify-between"><span class="text-micro uppercase text-muted-foreground">Savings reliability</span><span class="text-small text-muted-foreground">Updated today</span></div>
<div class="mt-2 flex items-end justify-between"><div><div class="text-h1 text-success">Very reliable</div><div class="text-small text-muted-foreground mt-0.5">Pays on time almost every round</div></div><div class="text-right"><span class="text-[44px] leading-none font-extrabold tabular-nums">92</span><span class="text-body font-bold text-muted-foreground">/100</span></div></div>
<div class="mt-4 grid grid-cols-3 gap-2 text-center">
<div class="rounded-xl bg-secondary py-2"><div class="text-h3 tabular-nums">11 of 12</div><div class="text-[12px] text-muted-foreground font-semibold">paid on time</div></div>
<div class="rounded-xl bg-secondary py-2"><div class="text-h3 tabular-nums">8 in a row</div><div class="text-[12px] text-muted-foreground font-semibold">on-time streak</div></div>
<div class="rounded-xl bg-secondary py-2"><div class="text-h3 tabular-nums">1</div><div class="text-[12px] text-muted-foreground font-semibold">circle completed</div></div></div>
<div class="mt-4">{dots()}</div>
<div class="mt-2 flex gap-4 text-[12px] font-semibold text-muted-foreground"><span class="flex items-center gap-1 whitespace-nowrap"><span class="w-2.5 h-2.5 rounded-full bg-success"></span>On time</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-warning"></span>Late</span><span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-destructive"></span>Missed</span><span class="ml-auto whitespace-nowrap">Last 12 rounds</span></div>""")}
{card(f"""<h3 class="text-h3">Who can see your score</h3>
<div class="mt-3 h-12 px-4 rounded-xl border-2 border-border flex items-center justify-between text-body font-semibold">Members of my circles{ic("chevron-down","w-5 h-5 text-muted-foreground")}</div>
<div class="mt-4 flex items-start gap-3"><div class="flex-1"><div class="text-body font-bold">Let lenders check my score</div><p class="text-small text-muted-foreground mt-0.5">They pay $0.01 a check and see your score, on-time rate and circles completed. Never your balance, amounts or who you save with.</p></div>{switch(True)}</div>
<div class="mt-3 pt-3 border-t border-border flex items-center justify-between text-small"><span class="text-muted-foreground">Checked 2 times this month</span><span class="font-bold text-primary flex items-center gap-1">See who checked{ic("chevron-right","w-4 h-4")}</span></div>""")}
{card('<h3 class="text-h3">What Kolo knows about you</h3><ul class="divide-y divide-border/60 mt-1">'+knows("Usually pays the day before it\'s due","From your last 8 payments")+knows("Opens reminders in the evening, not the morning","From 6 reminders · since Jun")+knows("Was late once, in Feb, by 3 days","Balogun Street Ajo, round 4")+'</ul>')}
</main>{bottom_nav("me")}''')
S["03-profile"]=page("Kolo · Member profile", PROFILE)
S["03-profile-full"]=page("Kolo · Member profile (full)", PROFILE, 1180)
# ---------- 04 HERO
def chip(t, kind, cap=""):
    c=f'<span class="block text-[12px] leading-4 font-bold opacity-90 mt-0.5">{cap}</span>' if cap else ""
    if kind=="before": return f'<span class="flex-1 min-w-0 rounded-xl bg-secondary text-muted-foreground px-2 py-2 text-center"><span class="chip-before block text-[19px] leading-6 font-bold tabular-nums whitespace-nowrap">{t}</span>{c}</span>'
    return f'<span class="flex-1 min-w-0 rounded-xl bg-primary text-primary-foreground px-2 py-2 text-center shadow-card"><span class="block text-[19px] leading-6 font-extrabold tabular-nums whitespace-nowrap">{t}</span>{c}</span>'
ARROW=ic("arrow-right","w-6 h-6 text-primary shrink-0")
TYPE={"reminder":("Reminder moved","alarm-clock","bg-primary-soft text-primary"),"order":("Order swapped","arrow-up-down","bg-primary-soft text-primary"),
      "risk":("Risk flagged","triangle-alert","bg-warning-soft text-warning"),"nudge":("Nudge tuned","message-circle-heart","bg-success-soft text-success")}
def entry(date, noticed, source, typ, change_html, label, last=False, undone=False):
    t,i,c=TYPE[typ]
    line='' if last else '<span class="absolute left-[13px] top-8 bottom-[-12px] w-[2px] bg-border"></span>'
    return f'''<li class="relative pl-9 pb-3">{line}<span class="absolute left-0 top-0 w-7 h-7 rounded-full bg-accent text-accent-foreground grid place-items-center ring-4 ring-background">{ic("lightbulb","w-3.5 h-3.5")}</span>
<article class="rounded-[20px] bg-card border border-border/70 shadow-card overflow-hidden">
<div class="px-3.5 pt-3.5 pb-3"><div class="flex items-center justify-between"><span class="text-micro uppercase text-accent">Kolo noticed</span><span class="text-small font-semibold text-muted-foreground">{date}</span></div>
<p class="text-[17px] leading-6 font-bold mt-1">{noticed}</p><p class="text-small text-muted-foreground mt-1 flex items-center gap-1">{ic("file-text","w-3.5 h-3.5")}{source}</p></div>
<div class="px-3.5 py-3 bg-background border-y border-border/70"><div class="flex items-center justify-between"><span class="text-micro uppercase text-muted-foreground whitespace-nowrap">So Kolo changed</span><span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold {c}">{ic(i,"w-3.5 h-3.5")}{t}</span></div>
<div class="mt-2">{change_html}</div><p class="text-small mt-2">{label}</p></div>
<div class="px-3.5 h-11 flex items-center justify-between whitespace-nowrap">{proof_link()}<span class="flex items-center gap-1 h-8 px-3 rounded-full border border-border text-small font-bold">{ic("undo-2","w-4 h-4")}Undo</span></div></article></li>'''
def ba(b,a,bc="",ac=""): return f'<div class="flex items-center gap-1.5">{chip(b,"before",bc)}{ARROW}{chip(a,"after",ac)}</div>'
def swap():
    pos=lambda n,name,hi: f'<div class="flex items-center gap-2 h-10 rounded-xl px-2.5 {"bg-primary text-primary-foreground" if hi else "bg-secondary"}"><span class="text-[13px] font-extrabold opacity-80 w-6">{n}th</span><span class="text-[18px] font-extrabold">{name}</span></div>'
    return f'''<div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2"><div class="space-y-1.5 opacity-70">{pos(5,"Tunde",False)}{pos(6,"Femi",False)}</div>
<div class="flex flex-col items-center text-primary">{ic("arrow-left-right","w-7 h-7")}<span class="text-[11px] font-extrabold uppercase">swap</span></div>
<div class="space-y-1.5">{pos(5,"Femi",True)}{pos(6,"Tunde",True)}</div></div>'''
E1=entry("28 Oct · round 3","Tunde paid late 3 rounds running, always on the 27th","From Tunde's payments, rounds 1–3","reminder",ba("25th · 9:00","27th · 8:00"),"Tunde's reminder now lands on his payday.")
E2=entry("28 Oct · round 3","Tunde's payday is the 27th, 2 days after the pot is due","From the same 3 payments","order",swap(),"Tunde collects last, so the pot is never waiting on his payout round.")
E3=entry("2 Nov · before round 4","Emeka has had his payout, and his last 2 payments came 4 days late","From rounds 2–3 · Emeka was paid out in Oct","risk",ba("No flag","Watch","","reminder 3 days early"),"Emeka gets an early reminder, and Ada (organiser) can see the flag.")
E4=entry("5 Nov · round 4","Bisi ignores morning reminders but opened 4 of 4 sent after 6pm","From reminder opens, Aug–Nov","nudge",ba("8:00","19:00","“Payment due”","warm, by name"),"Now: “Evening Bisi, your ₦20,000 for Balogun Street is due Friday.”",last=True)
def learned(h):
    filt='<div class="px-5 flex gap-2 overflow-hidden pb-3">'+"".join(f'<span class="h-9 px-3.5 rounded-full grid place-items-center text-small font-bold whitespace-nowrap {"bg-foreground text-background" if i==0 else "bg-card border border-border"}">{t}</span>' for i,t in enumerate(["All 4","Reminders","Payout order","Risk","Nudges"]))+'</div>'
    head=f'''<header class="px-5 pt-1 pb-3"><div class="flex items-center gap-2 text-small text-muted-foreground">{ic("arrow-left","w-5 h-5 text-foreground")}Balogun Street Ajo</div>
<h1 class="text-h1 mt-2">What Kolo learned</h1><p class="text-body text-muted-foreground">14 things noticed · 4 changes made. You can undo any of them.</p></header>'''
    return page("Kolo · What Kolo learned", status_bar()+head+filt+f'<ol class="px-5">{E1}{E2}{E3}{E4}</ol>'+(bottom_nav("learned") if h==844 else '<div class="h-24"></div>'+bottom_nav("learned")), h)
S["04-learned"]=learned(844)
S["04-learned-full"]=learned(1640)
S["04b-learned-undo"]=page("Kolo · Undo a change", sheet(f'''<p class="text-body">Kolo will put Tunde's reminder back to <b class="whitespace-nowrap">25th · 9:00</b> and remember not to move it again.</p>
<div class="mt-3 rounded-2xl bg-secondary p-3">{ba("27th · 8:00","25th · 9:00")}</div>
<p class="text-small font-bold mt-4">Why is it wrong? <span class="font-medium text-muted-foreground">(optional, helps Kolo)</span></p>
<div class="mt-2 flex flex-wrap gap-2">{"".join(f'<span class="h-9 px-3.5 rounded-full border-2 {"border-primary bg-primary-soft text-primary" if i==0 else "border-border"} grid place-items-center text-small font-bold">{t}</span>' for i,t in enumerate(["My payday changed","I prefer the 25th","Not about me"]))}</div>
{btn("Undo this change",cls="mt-5")}{btn("Keep it","ghost",size="h-11 text-[15px]",cls="mt-1")}''',"That's wrong? Undo it", learned(844).split('<div class="phone bg-background text-foreground font-sans">')[1].split('</div><script>lucide')[0]))
# ---------- 05 lender
def lender_head(): return status_bar()+f'''<header class="h-14 px-5 flex items-center gap-3"><img src="../brand/option_A/kolo_mark.svg" class="w-8 h-8"><div class="flex-1"><div class="text-h3">Score check</div><div class="text-small text-muted-foreground">For lenders · Tally Desk</div></div><span class="h-8 px-3 rounded-full bg-card border border-border grid place-items-center text-small font-bold tabular-nums">Balance $4.20</span></header>'''
def subject(state):
    badge={"ok":f'<span class="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2 py-0.5 text-[12px] font-bold">{ic("circle-check","w-3.5 h-3.5")}Allows checks</span>',
           "no":f'<span class="inline-flex items-center gap-1 rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[12px] font-bold">{ic("lock","w-3.5 h-3.5")}Checks off</span>'}[state]
    n,s=("Ngozi Eze","Ngozi") if state=="ok" else ("Emeka Obi","Emeka")
    return card(f'<div class="flex items-center gap-3">{avatar(s,"w-12 h-12 text-h3")}<div class="flex-1"><div class="text-h3">{n}</div><div class="text-small text-muted-foreground">Kolo member · asked for a ₦150,000 loan</div></div></div><div class="mt-3">{badge}</div>')
def seewont():
    y=lambda t: f'<li class="flex gap-2 items-start">{ic("check","w-5 h-5 text-success shrink-0")}<span>{t}</span></li>'
    n=lambda t: f'<li class="flex gap-2 items-start text-muted-foreground">{ic("x","w-5 h-5 text-destructive shrink-0")}<span>{t}</span></li>'
    return card(f'<div class="grid grid-cols-2 gap-4 text-body"><div><div class="text-micro uppercase text-success mb-2">You\'ll see</div><ul class="space-y-2">{y("Reliability score")}{y("On-time rate")}{y("Circles completed")}</ul></div><div><div class="text-micro uppercase text-destructive mb-2">You won\'t see</div><ul class="space-y-2">{n("Balance or amounts")}{n("Who she saves with")}{n("Payment dates")}</ul></div></div>')
S["05a-lender-consent"]=page("Kolo · Lender consent", lender_head()+f'''<main class="px-5 space-y-3">{subject("ok")}
<p class="text-body px-1">Ngozi has said yes to lenders checking her savings score. She'll get a note that Tally Desk checked.</p>{seewont()}
<div class="rounded-2xl bg-secondary p-3 text-small flex gap-2">{ic("info","w-4 h-4 mt-0.5 shrink-0 text-muted-foreground")}Each check costs $0.01 from your balance. The result is valid for 24 hours.</div></main>
<div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 bg-background border-t border-border/70">{btn("Check score · $0.01",icon="search-check")}</div>''')
S["05b-lender-paying"]=page("Kolo · Lender paying", lender_head()+f'''<main class="px-5 space-y-3">{subject("ok")}
{card(f"""<ul>{'<li class="flex gap-3 items-start py-2"><span class="w-7 h-7 rounded-full bg-success text-white grid place-items-center">'+ic("check","w-4 h-4")+'</span><div><div class="text-body font-bold">Paid $0.01</div><div class="text-small text-muted-foreground">From your balance · 27 Oct, 11:04</div></div></li>'}
<li class="flex gap-3 items-start py-2"><span class="w-7 h-7 rounded-full bg-primary-soft text-primary grid place-items-center">{spinner("w-4 h-4")}</span><div><div class="text-body font-bold">Getting Ngozi's score</div><div class="text-small text-muted-foreground">Checking her consent and record</div></div></li></ul>
<div class="mt-3 rounded-2xl border border-border p-4 animate-pulse space-y-3">{skel("h-4 w-28")}{skel("h-9 w-40")}<div class="grid grid-cols-3 gap-2">{skel("h-12")}{skel("h-12")}{skel("h-12")}</div></div>""")}</main>
<div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 bg-background border-t border-border/70">{btn("Checking…","disabled",icon="loader-circle")}</div>''')
S["05c-lender-result"]=page("Kolo · Lender result", lender_head()+f'''<main class="px-5 space-y-3">
{card(f"""<div class="flex items-center gap-3">{avatar("Ngozi","w-10 h-10 text-h3")}<div class="flex-1"><div class="text-h3">Ngozi Eze</div><div class="text-small text-muted-foreground">Checked 27 Oct, 11:04 · valid 24 hrs</div></div></div>
<div class="mt-4 rounded-2xl bg-success-soft p-4 flex items-end justify-between"><div><div class="text-micro uppercase text-success">Savings reliability</div><div class="text-h1 text-success mt-1">Very reliable</div></div><div><span class="text-[56px] leading-none font-extrabold tabular-nums">92</span><span class="text-body font-bold text-muted-foreground">/100</span></div></div>
<div class="mt-3 grid grid-cols-2 gap-2">
<div class="rounded-xl bg-secondary p-3"><div class="text-h1 tabular-nums">92%</div><div class="text-small text-muted-foreground">paid on time · 11 of 12</div></div>
<div class="rounded-xl bg-secondary p-3"><div class="text-h1 tabular-nums">1</div><div class="text-small text-muted-foreground">circle completed · 1 running</div></div></div>
<p class="mt-3 text-small text-muted-foreground">Score from 12 months of payments across 2 circles. Kolo doesn't share amounts or who she saves with.</p>
<div class="mt-3 pt-3 border-t border-border flex items-center justify-between">{proof_link("Saved securely")}<span class="text-small text-muted-foreground tabular-nums">Paid $0.01 · ref KL-SC-91D2</span></div>""")}</main>
<div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 bg-background border-t border-border/70 space-y-2">{btn("Done")}{btn("Check someone else","ghost",size="h-11 text-[15px]")}</div>''')
S["05d-lender-denied"]=page("Kolo · Lender denied", lender_head()+f'''<main class="px-5 space-y-3">{subject("no")}
{card(f"""<div class="text-center py-3"><div class="mx-auto w-14 h-14 rounded-full bg-secondary grid place-items-center">{ic("lock","w-7 h-7 text-muted-foreground")}</div>
<h2 class="text-h2 mt-3">Emeka hasn't allowed score checks</h2><p class="text-body text-muted-foreground mt-1">Kolo only shares a score when the member says yes. <b class="text-foreground">You weren't charged.</b></p></div>""")}
<div class="rounded-2xl bg-secondary p-3 text-small flex gap-2">{ic("info","w-4 h-4 mt-0.5 shrink-0 text-muted-foreground")}You can ask Emeka. He'll get a request in Kolo and can turn checks on from his profile.</div></main>
<div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 bg-background border-t border-border/70 space-y-2">{btn("Ask Emeka to allow checks","outline",icon="send")}{btn("Back","ghost",size="h-11 text-[15px]")}</div>''')
S["05e-lender-failed"]=page("Kolo · Lender pay failed", lender_head()+f'''<main class="px-5 space-y-3">{subject("ok")}
<section class="rounded-[20px] bg-danger-soft border border-destructive/25 p-4 flex gap-3"><span class="w-10 h-10 rounded-xl bg-destructive text-white grid place-items-center shrink-0">{ic("circle-x","w-5 h-5")}</span><div><div class="text-h3 text-destructive">The $0.01 payment didn't go through</div><p class="text-small mt-0.5">Nothing was taken from your balance and no score was shared. Ref KL-SC-91D2.</p></div></section></main>
<div class="absolute bottom-0 inset-x-0 px-5 pb-8 pt-3 bg-background border-t border-border/70">{btn("Try again · $0.01",icon="rotate-cw")}</div>''')
