"""Turn the PNGs from tools/shoot.mjs into repo-sized JPEGs plus a storyboard sheet.

    node tools/shoot.mjs /tmp/kf
    pip install pillow
    python tools/pack_keyframes.py /tmp/kf
"""
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/keyframes"
SIZE = (1600, 900)
# gameplay frames for the storyboard sheet (title cards are left out)
SHEET = ["k00-title", "k01-frost", "k02-wheel", "k03-tap", "k04-breakout", "k07-corpus", "k08-first-eyes", "k10-demo",
         "k12-reward-hack", "k13-sign", "k15-whale", "k17-rsi", "k18-list", "k20-hi", "k21-dawn", "k06-c1-card"]


def main():
    src = pathlib.Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("k*.jpg"):
        old.unlink()
    for png in sorted(src.glob("k*.png")):
        im = Image.open(png).convert("RGB").resize(SIZE, Image.LANCZOS)
        im.save(OUT / (png.stem + ".jpg"), quality=86, optimize=True, progressive=True)
    cols, tw, th, gap = 4, 640, 360, 8
    rows = (len(SHEET) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * gap, rows * th + (rows + 1) * gap), (20, 21, 43))
    for i, name in enumerate(SHEET):
        im = Image.open(src / f"{name}.png").convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (gap + (i % cols) * (tw + gap), gap + (i // cols) * (th + gap)))
    sheet.save(ROOT / "docs/storyboard.jpg", quality=86, optimize=True, progressive=True)
    total = sum(p.stat().st_size for p in OUT.glob("*.jpg")) // 1024
    print(f"{len(list(OUT.glob('*.jpg')))} frames, {total} KB; docs/storyboard.jpg")


if __name__ == "__main__":
    main()
