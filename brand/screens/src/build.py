import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import screens_a, screens_b, screens_c, screens_d, screens_e
OUT=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
ALL={**screens_a.S, **screens_b.S, **screens_c.S, **screens_d.S, **screens_e.S}
for k,v in ALL.items(): open(f"{OUT}/{k}.html","w").write(v)
print(len(ALL), "html")
