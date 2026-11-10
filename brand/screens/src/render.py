import os, sys, glob, re
from playwright.sync_api import sync_playwright
D=os.path.abspath(os.path.join(os.path.dirname(__file__),".."))
only=sys.argv[1:]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome")
    for f in sorted(glob.glob(f"{D}/*.html")):
        n=os.path.basename(f)[:-5]
        if only and n not in only: continue
        h=int(re.search(r'height:(\d+)px;overflow',open(f).read()).group(1))
        pg=b.new_page(viewport={"width":390,"height":h},device_scale_factor=2)
        pg.goto("file://"+f); pg.wait_for_timeout(700)
        pg.evaluate("document.fonts.ready")
        pg.add_style_tag(content="*{animation:none!important}")
        pg.screenshot(path=f"{D}/{n}.png",clip={"x":0,"y":0,"width":390,"height":h}); pg.close()
        print(n)
    b.close()
