#!/usr/bin/env python3
"""
Build the typeface JSON the carved department labels are extruded from.

    pip install fonttools brotli
    python3 scripts/make-typeface.py

Why this exists at all: the office plates carry their names as real relief
(design doc, "relief for the ground plane"), which means TextGeometry, which
means three's typeface JSON — a format nothing else in the toolchain speaks.
troika, which draws every *flat* label in the scene, reads the .woff instead.
Same Jost subset, two formats, because the two renderers want different
things.

Only the characters the plates actually use are emitted. The full face would
be ~40x larger for glyphs no plate will ever show.

Output is committed, so this does not run in CI or at build time. Re-run it
by hand if the department names ever need a character outside CHARS.
"""
import json
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

SRC = Path("public/fonts/jost-latin.woff2")
OUT = Path("public/fonts/jost-caps.typeface.json")
CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789&·-'.,/"


class OutlinePen(BasePen):
    """Emits three's outline command string.

    BasePen is doing the real work: TrueType stores runs of off-curve points
    with the on-curve points between them implied, and BasePen.qCurveTo
    expands those into one _qCurveToOne per segment so we do not have to.

    Note the argument order three expects — end point first, then controls:
      q  endX endY  ctrlX ctrlY
      b  endX endY  c1x c1y  c2x c2y
    which is the reverse of every other path API, and is the single easiest
    thing to get wrong here (FontLoader.js, createPath).
    """

    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.parts: list[str] = []

    def _moveTo(self, pt):
        self.parts.append("m %s %s" % _n(pt))

    def _lineTo(self, pt):
        self.parts.append("l %s %s" % _n(pt))

    def _qCurveToOne(self, bcp, pt):
        self.parts.append("q %s %s %s %s" % (*_n(pt), *_n(bcp)))

    def _curveToOne(self, bcp1, bcp2, pt):
        self.parts.append("b %s %s %s %s %s %s" % (*_n(pt), *_n(bcp1), *_n(bcp2)))

    def _closePath(self):
        pass


def _n(pt):
    """Trim 1.0 to 1 — across a few thousand coordinates it is real bytes."""
    return tuple(int(v) if float(v).is_integer() else round(float(v), 2) for v in pt)


def main() -> None:
    font = TTFont(SRC)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    upem = font["head"].unitsPerEm

    missing = [c for c in CHARS if ord(c) not in cmap]
    if missing:
        raise SystemExit(f"{SRC} has no glyph for: {missing}")

    glyphs = {}
    for ch in CHARS:
        g = glyph_set[cmap[ord(ch)]]
        pen = OutlinePen(glyph_set)
        g.draw(pen)
        glyphs[ch] = {
            "ha": round(g.width),
            "x_min": 0,
            "x_max": round(g.width),
            "o": " ".join(pen.parts),
        }

    head, hhea = font["head"], font["hhea"]
    data = {
        "glyphs": glyphs,
        "familyName": "Jost",
        "ascender": hhea.ascent,
        "descender": hhea.descent,
        "underlinePosition": -100,
        "underlineThickness": 50,
        "boundingBox": {
            "yMin": head.yMin, "xMin": head.xMin,
            "yMax": head.yMax, "xMax": head.xMax,
        },
        "resolution": upem,
        "original_font_information": {"full_font_name": "Jost Regular"},
        "cssFontWeight": "normal",
        "cssFontStyle": "normal",
    }

    OUT.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    print(f"{OUT}  {len(CHARS)} glyphs  {OUT.stat().st_size / 1024:.1f} KB  upem {upem}")


if __name__ == "__main__":
    main()
