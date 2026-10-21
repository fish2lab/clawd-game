"""Subset ZCOOL QingKe HuangYou to the characters the game actually draws.

The full font is 8 MB; the subset is a few dozen KB. The font has no
Reserved Font Name, so a subset may keep its name (SIL OFL 1.1).

    pip install fonttools brotli
    python tools/subset_zcool.py path/to/ZCOOLQingKeHuangYou-Regular.ttf
"""
import pathlib
import sys

from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCES = ["src/keyframes/*.js", "src/diorama/*.js", "*.html"]
OUT = ROOT / "assets/fonts/zcool-subset.woff2"


def wanted_text():
    chars = set(chr(c) for c in range(0x20, 0x7F))
    for pattern in SOURCES:
        for p in ROOT.glob(pattern):
            chars.update(ch for ch in p.read_text(encoding="utf-8") if ord(ch) > 0x7F)
    return "".join(sorted(chars))


def main():
    src = sys.argv[1]
    text = wanted_text()
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    subset.save_font(font, str(OUT), opts)
    print(f"{OUT.relative_to(ROOT)}: {len(text)} chars, {OUT.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
