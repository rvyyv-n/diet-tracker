"""
make-icons.py — regenerate the PWA icon set from the geometry in
public/assets/icon.svg.

Run:  python tools/make-icons.py

The app ships no build step, so this is not wired into anything: it is run by
hand when the mark changes, and its output is committed. Android and Windows
do not use these PNGs; their CI rasterises public/assets/icon.svg itself.

The mark is a sun rising over a horizon: a half disc with the sun gradient, a
line it rests on, a shorter line below, and a soft halo, on the dark canvas
tile. Everything is drawn at 4x and downsampled with LANCZOS — Pillow has no
antialiased vector drawing, so supersampling is what keeps the disc edge and
the tile corners clean. The gradients are built from Pillow's radial gradient
and a lookup table per channel, so there is no numpy dependency.

Geometry is the 512-unit viewBox of public/assets/icon.svg, kept in sync by
hand. If you change the SVG, change the constants below to match.
"""

from PIL import Image, ImageChops, ImageDraw

BOX = 512          # the SVG viewBox
SS = 4             # supersampling factor

TILE_RADIUS = 112  # rect rx
TILE = (11, 10, 9, 255)        # #0b0a09, the dark canvas
INK = (243, 237, 227, 255)     # #f3ede3, the dark ink

SUN_C = (256, 310)             # where the half disc sits on the horizon
SUN_R = 140
LINES = [((56, 310), (456, 310)), ((150, 364), (362, 364))]
LINE_W = 18

# The sun gradient: centre, radius, and stops (offset, colour).
SUN_GRAD = ((226, 224), 175)
SUN_STOPS = [
    (0.0, (255, 211, 146)),    # #ffd392
    (0.42, (248, 169, 89)),    # #f8a959
    (0.72, (235, 123, 73)),    # #eb7b49
    (1.0, (224, 103, 63)),     # #e0673f
]
# The halo: centre, radius, colour and the opacity at its centre.
HALO = ((256, 310), 240)
HALO_RGB = (248, 169, 89)
HALO_ALPHA = 0.42


def lerp(a, b, t):
    return a + (b - a) * t


def stop_at(stops, t):
    """Colour of a multi-stop gradient at t in 0..1."""
    if t <= stops[0][0]:
        return stops[0][1]
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            return tuple(lerp(a, b, u) for a, b in zip(c0, c1))
    return stops[-1][1]


def radial_layer(n, scale, centre, radius, channel_tables):
    """An n x n RGBA layer holding a radial gradient: t = 0 at `centre`, 1 at
    `radius` (both in 512-unit geometry, times `scale`), t >= 1 beyond. The
    four tables map t (0..255) to R, G, B and A."""
    side = max(2, round(2 * radius * scale))
    ramp = Image.radial_gradient("L").resize((side, side), Image.BICUBIC)
    chans = [ramp.point(tab) for tab in channel_tables]
    grad = Image.merge("RGBA", chans)
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    layer.paste(grad, (round(centre[0] * scale - side / 2), round(centre[1] * scale - side / 2)))
    return layer


def tables_for(color_at, alpha_at):
    """Per-channel lookup tables over the ramp value. Pillow's radial gradient
    reaches 255 at the corner, not at the edge of its circle, so a ramp value v
    is a distance of v / 255 * sqrt(2) of the radius."""
    ts = [min(1.0, i / 255 * 2 ** 0.5) for i in range(256)]
    rgb = [color_at(t) for t in ts]
    return [[round(c[k]) for c in rgb] for k in range(3)] + [
        [round(255 * alpha_at(t)) for t in ts]
    ]


def render(size, *, rounded, art_scale=1.0):
    """One PNG. `rounded` draws the tile's 112-unit corner radius; maskable and
    apple-touch icons want a full square instead, because the platform applies
    its own mask and a pre-rounded corner shows up as a double curve."""
    n = size * SS
    s = (n / BOX) * art_scale          # art units -> pixels
    off = n / 2 - (BOX / 2) * s        # art origin, so the art stays centred

    def at(pt):
        return (off + pt[0] * s, off + pt[1] * s)

    img = Image.new("RGBA", (n, n), TILE)

    halo_tabs = tables_for(lambda t: HALO_RGB, lambda t: HALO_ALPHA * max(0.0, 1 - t))
    halo = radial_layer(n, s, (HALO[0][0] + off / s, HALO[0][1] + off / s), HALO[1], halo_tabs)
    img = Image.alpha_composite(img, halo)

    sun_tabs = tables_for(lambda t: stop_at(SUN_STOPS, t), lambda t: 1.0)
    sun_centre = (SUN_GRAD[0][0] + off / s, SUN_GRAD[0][1] + off / s)
    sun = radial_layer(n, s, sun_centre, SUN_GRAD[1], sun_tabs)
    mask = Image.new("L", (n, n), 0)
    cx, cy = at(SUN_C)
    ImageDraw.Draw(mask).pieslice(
        [cx - SUN_R * s, cy - SUN_R * s, cx + SUN_R * s, cy + SUN_R * s], 180, 360, fill=255
    )
    img.paste(sun, (0, 0), ImageChops.multiply(mask, sun.getchannel("A")))

    d = ImageDraw.Draw(img)
    w = LINE_W * s
    for a, b in LINES:
        (x0, y0), (x1, y1) = at(a), at(b)
        d.line([x0, y0, x1, y1], fill=INK, width=round(w))
        for x, y in ((x0, y0), (x1, y1)):
            d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=INK)

    # The tile shape, applied last so the halo stays inside it.
    shape = Image.new("L", (n, n), 0)
    sd = ImageDraw.Draw(shape)
    if rounded:
        sd.rounded_rectangle([0, 0, n - 1, n - 1], radius=TILE_RADIUS * n / BOX, fill=255)
    else:
        sd.rectangle([0, 0, n - 1, n - 1], fill=255)
    img.putalpha(shape)
    return img.resize((size, size), Image.LANCZOS)


OUT = [
    # (filename, size, rounded, art scale)
    ("public/assets/icon-192.png", 192, True, 1.0),
    ("public/assets/icon-512.png", 512, True, 1.0),
    # Maskable: everything that must survive the mask sits inside the centre
    # 80% circle, so the art is drawn at 0.7 and the dark bleeds to the edge.
    ("public/assets/icon-maskable-512.png", 512, False, 0.7),
    # iOS rounds it itself and does not honour transparency.
    ("public/assets/apple-touch-icon.png", 180, False, 1.0),
]

if __name__ == "__main__":
    for name, size, rounded, scale in OUT:
        render(size, rounded=rounded, art_scale=scale).save(name)
        print("wrote", name)
