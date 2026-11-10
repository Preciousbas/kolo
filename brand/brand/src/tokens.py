import json, colorsys, os
P=json.load(open('../palette.json'))['palette']
def hsl(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    H,L,S=colorsys.rgb_to_hls(r,g,b); return f"{H*360:.0f} {S*100:.0f}% {L*100:.0f}%"
# shadcn names -> kolo palette
M={"background":"bg","foreground":"ink","card":"surface","card-foreground":"ink","popover":"surface","popover-foreground":"ink",
"primary":"primary","primary-foreground":"primary-foreground","primary-soft":"primary-soft",
"secondary":"surface-2","secondary-foreground":"ink","muted":"surface-2","muted-foreground":"muted",
"accent":"accent","accent-foreground":"accent-foreground","accent-soft":"accent-soft",
"success":"success","success-soft":"success-soft","warning":"warning","warning-soft":"warning-soft",
"destructive":"danger","destructive-foreground":"primary-foreground","danger-soft":"danger-soft",
"turn":"gold","border":"border","input":"border","ring":"primary"}
css=["/* Kolo design tokens: shadcn/ui-compatible HSL channels. Hex in comments. Single source for screens + app. */",
"@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');",":root{"]
for k,v in M.items(): css.append(f"  --{k}: {hsl(P[v])}; /* {P[v]} {v} */")
css+=["  --radius: 1rem;","  --font-sans: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;","}",
"html{font-family:var(--font-sans);font-feature-settings:'tnum' 1;-webkit-font-smoothing:antialiased;}"]
open('../tokens/kolo-tokens.css','w').write("\n".join(css)+"\n")
colors={}
for k in M:
    if "-" in k and k.split("-")[0] in ("card","popover","primary","secondary","muted","accent","destructive","success","warning","danger"):
        base,sub=k.split("-",1); colors.setdefault(base,{})[sub]=f"hsl(var(--{k}) / <alpha-value>)"
    else: colors.setdefault(k,{})["DEFAULT"]=f"hsl(var(--{k}) / <alpha-value>)"
colors={k:(v["DEFAULT"] if list(v)==["DEFAULT"] else v) for k,v in colors.items()}
theme={"extend":{"colors":colors,
 "borderRadius":{"lg":"var(--radius)","md":"calc(var(--radius) - 4px)","sm":"calc(var(--radius) - 8px)","xl":"calc(var(--radius) + 4px)"},
 "fontFamily":{"sans":["var(--font-sans)"]},
 "fontSize":{"display":["32px",{"lineHeight":"38px","fontWeight":"800","letterSpacing":"-0.02em"}],
  "h1":["24px",{"lineHeight":"30px","fontWeight":"800","letterSpacing":"-0.015em"}],
  "h2":["20px",{"lineHeight":"26px","fontWeight":"700","letterSpacing":"-0.01em"}],
  "h3":["17px",{"lineHeight":"24px","fontWeight":"700"}],
  "body":["15px",{"lineHeight":"22px","fontWeight":"500"}],
  "small":["13px",{"lineHeight":"18px","fontWeight":"500"}],
  "micro":["12px",{"lineHeight":"16px","fontWeight":"700","letterSpacing":"0.04em"}]},
 "boxShadow":{"card":"0 1px 2px rgba(42,31,23,.06), 0 2px 8px rgba(42,31,23,.05)","sheet":"0 -8px 32px rgba(42,31,23,.18)"}}}
open('../tokens/tailwind.kolo.js','w').write("// Kolo Tailwind theme. CDN usage: load after cdn.tailwindcss.com.\nwindow.KOLO_THEME="+json.dumps(theme,indent=1)+";\nif(window.tailwind) tailwind.config={theme:window.KOLO_THEME};\n")
open('../tokens/tailwind.config.snippet.ts','w').write("// Paste into tailwind.config.ts (shadcn/ui project). Pair with kolo-tokens.css in app/globals.css.\nimport type { Config } from 'tailwindcss'\nexport default {\n  darkMode: ['class'],\n  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],\n  theme: "+json.dumps(theme,indent=2).replace("\n","\n  ")+",\n  plugins: [require('tailwindcss-animate')],\n} satisfies Config\n")
open('../tokens/font.md','w').write("""# Font: Plus Jakarta Sans (Google Fonts, OFL)
One family, weights 500/600/700/800. Chosen over Inter because its rounder bowls read warmer at display sizes and it ships the naira sign (U+20A6) natively, so `₦20,000` never falls back to a system font.
Next.js: `import { Plus_Jakarta_Sans } from 'next/font/google'; const font = Plus_Jakarta_Sans({ subsets:['latin','latin-ext'], weight:['500','600','700','800'], variable:'--font-sans' })`.
All amounts use tabular figures (`font-feature-settings:'tnum'` or Tailwind `tabular-nums`).

| Token | Size/line | Weight | Use |
|---|---|---|---|
| text-display | 32/38 | 800 | Pot amount, score number |
| text-h1 | 24/30 | 800 | Screen title |
| text-h2 | 20/26 | 700 | Section title, before/after chips on 04 |
| text-h3 | 17/24 | 700 | Card title, member name |
| text-body | 15/22 | 500 | Default copy |
| text-small | 13/18 | 500 | Meta: time, source |
| text-micro | 12/16 | 700, +0.04em, uppercase | Labels: "NOTICED", "CHANGED" |
Wordmark: Plus Jakarta Sans 800, converted to paths (never typeset the logo live).
""")
print(open('../tokens/kolo-tokens.css').read())
