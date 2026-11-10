# Kolo screen kit: tiny HTML component helpers that mirror the shadcn components named in HANDOFF.md.
HEAD = """<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=390">
<title>{title}</title>
<link rel="stylesheet" href="../brand/tokens/kolo-tokens.css">
<script src="vendor/tailwind.js"></script><!-- prod: https://cdn.tailwindcss.com -->
<script src="../brand/tokens/tailwind.kolo.js"></script>
<script src="vendor/lucide.min.js"></script>
<style>body{{margin:0;background:#d9cfc0}} .phone{{width:390px;height:{h}px;overflow:hidden;position:relative}}
.chip-before{{text-decoration:line-through;text-decoration-thickness:2px;text-decoration-color:hsl(var(--muted-foreground)/.6)}}
.no-scrollbar::-webkit-scrollbar{{display:none}}</style></head>
<body><div class="phone bg-background text-foreground font-sans">"""
TAIL = """</div><script>lucide.createIcons({attrs:{'stroke-width':2.2}})</script></body></html>"""
def page(title, body, h=844): return HEAD.format(title=title, h=h) + body + TAIL
def ic(name, cls="w-5 h-5"): return f'<i data-lucide="{name}" class="{cls}"></i>'
AV = {"Ada":"bg-primary-soft text-primary","Tunde":"bg-accent-soft text-accent","Ngozi":"bg-success-soft text-success",
      "Emeka":"bg-warning-soft text-warning","Bisi":"bg-[#F6E6C4] text-foreground","Femi":"bg-secondary text-foreground"}
def avatar(name, size="w-9 h-9 text-small", ring=""):
    return f'<div class="{size} {AV.get(name,"bg-secondary")} {ring} rounded-full grid place-items-center font-bold shrink-0">{name[0]}</div>'
def status_bar(dark=False):
    c = "text-foreground"
    return f'''<div class="h-11 px-6 flex items-center justify-between text-[15px] font-bold {c}"><span>9:41</span>
<span class="flex gap-1.5 items-center">{ic("signal","w-4 h-4")}{ic("wifi","w-4 h-4")}{ic("battery-full","w-5 h-5")}</span></div>'''
def top_bar(title, left="back", right="", sub=""):
    l = {"back": f'<button class="w-10 h-10 -ml-2 grid place-items-center rounded-full">{ic("arrow-left","w-6 h-6")}</button>',
         "logo": '<img src="../brand/option_A/kolo_mark.svg" class="w-8 h-8">',
         "close": f'<button class="w-10 h-10 -ml-2 grid place-items-center rounded-full">{ic("x","w-6 h-6")}</button>', "": ""}[left]
    s = f'<div class="text-small text-muted-foreground">{sub}</div>' if sub else ""
    return f'''<header class="h-14 px-5 flex items-center gap-3">{l}<div class="flex-1 min-w-0"><div class="text-h3 truncate">{title}</div>{s}</div>{right}</header>'''
def mode_badge(kind="sandbox", cls=""):
    # ModeBadge: ONE component, two variants. test = chain test mode, sandbox = simulated naira ramp
    txt = {"sandbox":"Sandbox · simulated, no real naira moves", "test":"Test mode · not real money"}[kind]
    return f'<div class="inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning/60 bg-warning-soft text-warning px-3 py-1 text-[12px] font-bold {cls}">{ic("flask-conical","w-3.5 h-3.5")}{txt}</div>'
def btn(label, variant="primary", icon="", cls="", size="h-14 text-[16px]"):
    v = {"primary":"bg-primary text-primary-foreground", "outline":"border-2 border-border bg-card text-foreground",
         "ghost":"text-primary", "accent":"bg-accent text-accent-foreground", "disabled":"bg-primary/60 text-primary-foreground",
         "danger":"bg-destructive text-destructive-foreground", "soft":"bg-primary-soft text-primary"}[variant]
    i = ic(icon, "w-5 h-5") if icon else ""
    return f'<button class="w-full {size} rounded-2xl font-bold flex items-center justify-center gap-2 {v} {cls}">{i}{label}</button>'
def card(inner, cls="p-4"): return f'<section class="rounded-[20px] bg-card shadow-card border border-border/60 {cls}">{inner}</section>'
def money(ngn, usd, big=False):
    if big: return f'<span class="tabular-nums">{ngn}</span><span class="text-muted-foreground font-semibold"> · {usd}</span>'
    return f'<span class="tabular-nums font-bold">{ngn}</span><span class="tabular-nums text-muted-foreground"> · {usd}</span>'
def progress(pct, color="bg-success"):
    return f'<div class="h-3 rounded-full bg-secondary overflow-hidden"><div class="h-full rounded-full {color}" style="width:{pct}%"></div></div>'
def bottom_nav(active="circle"):
    items=[("circle","users-round","Circle"),("learned","lightbulb","Learned"),("wallet","wallet","Wallet"),("me","circle-user-round","Me")]
    out='<nav class="absolute bottom-0 inset-x-0 h-[76px] pb-4 bg-card border-t border-border flex">'
    for k,i,l in items:
        a = k==active
        out+=f'<div class="flex-1 flex flex-col items-center justify-center gap-0.5 {"text-primary" if a else "text-muted-foreground"}">{ic(i,"w-6 h-6")}<span class="text-[12px] {"font-bold" if a else "font-semibold"}">{l}</span></div>'
    return out+'</nav>'
def sheet(inner, title, scrim_under=""):
    return f'''<div class="absolute inset-0">{scrim_under}</div><div class="absolute inset-0 bg-foreground/55"></div>
<div class="absolute bottom-0 inset-x-0 bg-card rounded-t-[28px] shadow-sheet px-5 pt-3 pb-8">
<div class="mx-auto w-10 h-1.5 rounded-full bg-border mb-4"></div>
<div class="flex items-center justify-between mb-3"><h2 class="text-h2">{title}</h2><span class="w-9 h-9 grid place-items-center rounded-full bg-secondary">{ic("x","w-5 h-5")}</span></div>{inner}</div>'''
def spinner(cls="w-5 h-5"): return ic("loader-circle", cls + " animate-spin")
def skel(cls): return f'<div class="rounded-lg bg-secondary {cls}"></div>'
def proof_link(label="Saved securely"):
    return f'<a class="inline-flex items-center gap-1 text-small font-bold text-accent underline underline-offset-4 decoration-accent/40">{ic("shield-check","w-4 h-4")}{label}{ic("arrow-up-right","w-4 h-4")}</a>'
def row(label, value, cls=""):
    return f'<div class="flex items-start justify-between gap-4 py-2.5 border-b border-border/70 last:border-0 {cls}"><span class="text-small text-muted-foreground pt-0.5">{label}</span><span class="text-body font-bold text-right tabular-nums">{value}</span></div>'
