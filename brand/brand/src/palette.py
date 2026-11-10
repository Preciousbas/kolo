import json
P={"bg":"#FBF6EE","surface":"#FFFFFF","surface-2":"#F4ECDF","ink":"#2A1F17","muted":"#6E5F50","border":"#E6D9C6",
"primary":"#A9441C","primary-foreground":"#FFFFFF","primary-soft":"#F7E3D6",
"accent":"#2B4A7A","accent-foreground":"#FFFFFF","accent-soft":"#E4EAF4",
"success":"#2E7048","success-soft":"#E2F0E6","warning":"#9A5B00","warning-soft":"#FBEBCF","danger":"#B3261E","danger-soft":"#FBE3E0","gold":"#E2A93B"}
def L(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b):
    la,lb=sorted([L(P[a]),L(P[b])],reverse=True); return (la+0.05)/(lb+0.05)
pairs=[("ink","bg"),("ink","surface"),("muted","bg"),("muted","surface"),("muted","surface-2"),("primary-foreground","primary"),("primary","bg"),("primary","surface"),("primary","primary-soft"),
("accent-foreground","accent"),("accent","accent-soft"),("accent","surface"),("success","surface"),("success","success-soft"),("warning","surface"),("warning","warning-soft"),("danger","surface"),("danger","danger-soft"),("ink","gold"),("ink","surface-2")]
rows=[]
for a,b in pairs:
    r=cr(a,b); rows.append((a,b,round(r,2),"AA" if r>=4.5 else ("AA-large" if r>=3 else "FAIL")))
    print(f"{a:20} on {b:14} {r:5.2f} {rows[-1][3]}")
json.dump({"palette":P,"contrast":rows},open("../palette.json","w"),indent=1)
