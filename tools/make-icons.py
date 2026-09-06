"""
make-icons.py — regenerate the PWA icon set from the geometry in
public/assets/icon.svg.

Run:  python tools/make-icons.py

The app ships no build step, so this is not wired into anything: it is run by
hand when the mark changes, and its output is committed. It exists because the
icon is four shapes, which is cheap to redraw exactly in code and much cheaper
than carrying an SVG rasteriser as a dependency.

Everything is drawn at 4x and downsampled with LANCZOS — Pillow has no
antialiased vector drawing, so supersampling is what keeps the ellipse edge and
the tile corners clean.

Geometry is the 512-unit viewBox of public/assets/icon.svg, kept in sync by
hand. If you change the SVG, change the constants below to match.
"""

from PIL import Image, ImageDraw

BOX = 512          # the SVG viewBox
SS = 4             # supersampling factor

TILE_RADIUS = 112  # rect rx
TILE = (0, 0, 0, 255)          # #000000
WHITE = (255, 255, 255, 255)   # #FFFFFF
SHELL = (230, 223, 216, 255)   # #E6DFD8, the egg-white edge
YOLK = (232, 165, 90, 255)     # #E8A55A
YOLK_CORE = (224, 145, 63, 255)  # #E0913F

EGG_C = (256, 258)
EGG_R = (158, 190)
EGG_STROKE = 14
YOLK_C = (256, 286)
YOLK_R = 92
YOLK_CORE_R = 60


def draw_art(d, cx, cy, scale):
    """The egg, centred on (cx, cy) at `scale` x the 512-unit geometry."""

    def ell(c, rx, ry, **kw):
        x, y = c
        x = cx + (x - BOX / 2) * scale
        y = cy + (y - BOX / 2) * scale
        d.ellipse(
            [x - rx * scale, y - ry * scale, x + rx * scale, y + ry * scale], **kw
        )

    ell(EGG_C, *EGG_R, fill=WHITE, outline=SHELL, width=max(1, round(EGG_STROKE * scale)))
    ell(YOLK_C, YOLK_R, YOLK_R, fill=YOLK)
    ell(YOLK_C, YOLK_CORE_R, YOLK_CORE_R, fill=YOLK_CORE)


def render(size, *, rounded, art_scale=1.0):
    """One PNG. `rounded` draws the tile's 112-unit corner radius; maskable and
    apple-touch icons want a full square instead, because the platform applies
    its own mask and a pre-rounded corner shows up as a double curve."""
    n = size * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=TILE_RADIUS * n / BOX, fill=TILE)
    else:
        d.rectangle([0, 0, n - 1, n - 1], fill=TILE)
    draw_art(d, n / 2, n / 2, (n / BOX) * art_scale)
    return img.resize((size, size), Image.LANCZOS)


OUT = [
    # (filename, size, rounded, art scale)
    ("public/assets/icon-192.png", 192, True, 1.0),
    ("public/assets/icon-512.png", 512, True, 1.0),
    # Maskable: everything that must survive the mask sits inside the centre
    # 80% circle, so the art is drawn at 0.7 and the black bleeds to the edge.
    ("public/assets/icon-maskable-512.png", 512, False, 0.7),
    # iOS rounds it itself and does not honour transparency.
    ("public/assets/apple-touch-icon.png", 180, False, 1.0),
]

if __name__ == "__main__":
    for name, size, rounded, scale in OUT:
        render(size, rounded=rounded, art_scale=scale).save(name)
        print("wrote", name)
