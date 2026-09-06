"""Parite chiffree WebGL / WebGPU : ecart moyen absolu par capture et par bande."""
import sys
from PIL import Image, ImageChops, ImageStat

S = "C:/Users/sylva/AppData/Local/Temp/claude/C--Windows-System32/86ddb9fc-c7f5-4872-9d73-b603ad93d9cf/scratchpad/"
names = sys.argv[1:] or ["p_centre", "p_nord", "p_sud_jour", "p_sud_nuit", "p_services", "p_contact"]
bands = {"ciel": (0, 80, 1280, 300), "milieu": (0, 300, 1280, 560), "sol": (0, 560, 1280, 720)}
print(f"{'capture':12} {'luma gl':>8} {'luma gpu':>9} {'diff':>6}  " + "  ".join(f"{b:>7}" for b in bands))
for n in names:
    try:
        a = Image.open(S + f"{n}_gpu0.png").convert("RGB").crop((0, 80, 1280, 720))
        b = Image.open(S + f"{n}_gpu1.png").convert("RGB").crop((0, 80, 1280, 720))
    except FileNotFoundError as e:
        print(n, "manquant", e.filename); continue
    la = ImageStat.Stat(a.convert("L")).mean[0]; lb = ImageStat.Stat(b.convert("L")).mean[0]
    d = ImageChops.difference(a, b).convert("L")
    tot = ImageStat.Stat(d).mean[0]
    per = []
    for box in bands.values():
        x0, y0, x1, y1 = box
        per.append(ImageStat.Stat(d.crop((x0, y0 - 80, x1, y1 - 80))).mean[0])
    print(f"{n:12} {la:8.1f} {lb:9.1f} {tot:6.1f}  " + "  ".join(f"{v:7.1f}" for v in per))
