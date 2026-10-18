#!/usr/bin/env python3
"""Builds the scene art (ground, planks, fence, decorations) from art-source/*.png.

Run:  python3 scripts/build-scene-art.py        (needs: pillow, numpy, scipy)
Writes:
  public/assets/grass.png        seamless grass tile (Tex.Grass): menu backgrounds + arena backdrop
  public/assets/campus_text.png  the "Campus!" lettering alone on a transparent background (Tex.CampusText), drawn once on the arena grass
  public/assets/arena_tiles.png  the Tiled tileset (name arena_tiles), tiles extruded by 1px (see TILESET)

Only the scene is real art. Cats, bosses, Varu, projectiles and pickups stay drawn in code (assets/placeholders.ts).
Tile ids come from src/config/arena.ts (TILES, OBJECTS): this script reads that file, so they cannot drift apart.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-source"
OUT = ROOT / "public" / "assets"

# ---------------------------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------------------------
NAVY = (27, 35, 64)  # COLORS.navy in src/config/style.ts: the outline color of the whole game

GRASS = {
    "size": 256,        # px, repeats seamlessly
    "scale": 0.6,       # art px -> game px
    "seed": 7,
    "counts": {"blob": 4, "tuft": 6, "flowers": 5},
    "text_band": (262, 466),  # rows of the source image that hold the "Campus!" lettering
}

TEXT_MASK = {"min_blob": 25, "max_red": 190}  # dirt letters = reddish/dark pixels; cream flowers are brighter and get dropped

TILE = 40
TILESET = {"columns": 8, "margin": 1, "spacing": 2}  # 1px extruded border around every tile (no seams when the game scales)


# ---------------------------------------------------------------------------------------------
# Small image helpers
# ---------------------------------------------------------------------------------------------
def load_rgb(name: str) -> np.ndarray:
    return np.array(Image.open(SRC / name).convert("RGB")).astype(np.float32)


def resize_rgba(img: Image.Image, size: tuple[int, int], box: tuple[float, float, float, float] | None = None) -> Image.Image:
    """Resize RGBA without dark/white halos: resize premultiplied, then un-premultiply. `box` = source region (may be fractional)."""
    a = np.array(img.convert("RGBA")).astype(np.float32) / 255.0
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]
    chans = [Image.fromarray(pm[..., i]).resize(size, Image.LANCZOS, box=box) for i in range(4)]
    out = np.stack([np.array(c) for c in chans], axis=-1)
    alpha = np.clip(out[..., 3:4], 0, 1)
    rgb = np.where(alpha > 1e-4, out[..., :3] / np.maximum(alpha, 1e-4), 0)
    out = np.concatenate([np.clip(rgb, 0, 1), alpha], axis=-1)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA")


def paste_wrapped(canvas: np.ndarray, stamp: Image.Image, cx: int, cy: int) -> None:
    """Alpha-composite `stamp` centred at (cx, cy) on a canvas that wraps around (so the tile repeats seamlessly)."""
    s = np.array(stamp).astype(np.float32) / 255.0
    h, w = s.shape[:2]
    size = canvas.shape[0]
    ys = (np.arange(h) + cy - h // 2) % size
    xs = (np.arange(w) + cx - w // 2) % size
    a = s[..., 3:4]
    region = canvas[np.ix_(ys, xs)]
    canvas[np.ix_(ys, xs)] = region * (1 - a) + s[..., :3] * 255 * a


# ---------------------------------------------------------------------------------------------
# Grass: stamps cut out of the "Campus!" ground, scattered on a wrapping canvas
# ---------------------------------------------------------------------------------------------
def grass_stamps() -> dict[str, list[Image.Image]]:
    """Cuts blobs, tufts and flower clusters out of the ground art (skipping the lettering and the image edges)."""
    rgb = load_rgb("campus-ground.png")
    base = np.median(rgb.reshape(-1, 3), axis=0)
    diff = np.abs(rgb - base).max(-1)
    mask = diff > 5
    labels, count = ndi.label(ndi.binary_dilation(mask, iterations=8))
    height, width = diff.shape
    top, bottom = GRASS["text_band"]
    found: dict[str, list[Image.Image]] = {"blob": [], "tuft": [], "flowers": []}
    for i, box in enumerate(ndi.find_objects(labels), start=1):
        y, x = box
        if y.start < 3 or x.start < 3 or y.stop > height - 3 or x.stop > width - 3:
            continue  # cut by the image edge
        if y.stop > top and y.start < bottom:
            continue  # touches the lettering
        own = (labels[box] == i) & mask[box]
        if own.sum() < 200:
            continue
        pad = 3
        ys, xs = slice(max(0, y.start - pad), y.stop + pad), slice(max(0, x.start - pad), x.stop + pad)
        m = (labels[ys, xs] == i) & mask[ys, xs]
        alpha = ndi.gaussian_filter(m.astype(np.float32), 0.7)
        alpha = np.clip(alpha * 1.4, 0, 1)
        stamp = np.dstack([rgb[ys, xs], alpha * 255]).astype(np.uint8)
        mean = rgb[ys, xs][m].mean(0)
        w = x.stop - x.start
        kind = "flowers" if mean[0] > 165 else "blob" if w >= 80 else "tuft"
        found[kind].append(Image.fromarray(stamp, "RGBA"))
    return found


def build_grass() -> np.ndarray:
    rng = np.random.default_rng(GRASS["seed"])
    size, scale = GRASS["size"], GRASS["scale"]
    rgb = load_rgb("campus-ground.png")
    base = np.median(rgb.reshape(-1, 3), axis=0)
    canvas = np.zeros((size, size, 3), np.float32) + base
    stamps = grass_stamps()
    placed: list[tuple[int, int, float]] = []

    def far_enough(x: int, y: int, r: float) -> bool:
        for px, py, pr in placed:
            dx, dy = abs(x - px), abs(y - py)
            dx, dy = min(dx, size - dx), min(dy, size - dy)
            if (dx * dx + dy * dy) ** 0.5 < (r + pr) * 0.95:
                return False
        return True

    # biggest first, so the blobs get their space before the small details
    for kind in ("blob", "flowers", "tuft"):
        pool = stamps[kind]
        for n in range(GRASS["counts"][kind]):
            src = pool[int(rng.integers(len(pool)))]
            w, h = max(2, round(src.width * scale)), max(2, round(src.height * scale))
            stamp = resize_rgba(src, (w, h))
            r = max(w, h) / 2
            for _ in range(400):
                x, y = int(rng.integers(size)), int(rng.integers(size))
                if far_enough(x, y, r):
                    paste_wrapped(canvas, stamp, x, y)
                    placed.append((x, y, r))
                    break
    return np.clip(canvas + 0.5, 0, 255).astype(np.uint8)


def write_campus_text() -> None:
    """Cut the dirt lettering out of the source so it can lie on the arena as one image (the grass tile has no text)."""
    top, bottom = GRASS["text_band"]
    band = load_rgb("campus-ground.png")[top:bottom]
    red, green = band[..., 0], band[..., 1]
    mask = ((red - green) > -4) & (red < TEXT_MASK["max_red"])
    mask = ndi.binary_opening(mask, iterations=1)
    labels, count = ndi.label(mask)
    sizes = ndi.sum(mask, labels, range(1, count + 1))
    keep = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > TEXT_MASK["min_blob"]])
    alpha = np.clip((ndi.gaussian_filter(keep.astype(np.float32), 0.8) - 0.25) / 0.5, 0, 1)
    ys, xs = np.where(alpha > 0.05)
    pad = 6
    y0, y1, x0, x1 = max(ys.min() - pad, 0), ys.max() + pad, max(xs.min() - pad, 0), xs.max() + pad
    rgba = np.dstack([band, alpha * 255])[y0:y1, x0:x1].astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / "campus_text.png", optimize=True)
    print(f"campus_text.png {rgba.shape[1]}x{rgba.shape[0]}")


def write_grass() -> None:
    tile = build_grass()
    Image.fromarray(tile, "RGB").save(OUT / "grass.png", optimize=True)
    print(f"grass.png {tile.shape[1]}x{tile.shape[0]}")


# ---------------------------------------------------------------------------------------------
# Cut-outs: the objects are drawn on a white sheet, so remove the sheet without eating the white inside them
# ---------------------------------------------------------------------------------------------
def cutout(rgb: np.ndarray) -> Image.Image:
    """White background (connected to the image border) -> transparent. The object's own outline is navy, so the
    anti-aliased edge pixels are rebuilt as navy with the right coverage (no white fringe)."""
    white = (rgb > 238).all(-1)
    labels, _ = ndi.label(white)
    edge_labels = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    outside = np.isin(labels, list(edge_labels))
    fringe = ndi.binary_dilation(outside, iterations=2) & ~outside
    lum = rgb.mean(-1)
    coverage = np.clip((255 - lum) / (255 - float(np.mean(NAVY))), 0, 1)
    alpha = np.where(outside, 0.0, 1.0)
    alpha[fringe] = coverage[fringe]
    color = rgb.copy()
    color[fringe] = NAVY
    return Image.fromarray(np.dstack([color, alpha * 255]).astype(np.uint8), "RGBA")


def tight_crop(img: Image.Image) -> Image.Image:
    box = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop(box) if box else img


def fit_within(img: Image.Image, max_w: int, max_h: int) -> Image.Image:
    s = min(max_w / img.width, max_h / img.height)
    return resize_rgba(img, (max(1, round(img.width * s)), max(1, round(img.height * s))))


def soft_shadow(size: tuple[int, int], cx: float, cy: float, rx: float, ry: float, alpha: float = 0.22) -> Image.Image:
    layer = Image.new("L", size, 0)
    from PIL import ImageDraw

    ImageDraw.Draw(layer).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=int(255 * alpha))
    layer = layer.filter(ImageFilter.GaussianBlur(1.6))
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.putalpha(layer)
    return out


def place_object(art: Image.Image, tiles_w: int, tiles_h: int, max_w: int, max_h: int) -> Image.Image:
    """An object standing on the grass inside a block of tiles: bottom-centred, with a soft ground shadow."""
    w, h = tiles_w * TILE, tiles_h * TILE
    obj = fit_within(tight_crop(art), max_w, max_h)
    base_y = h - 6
    canvas = soft_shadow((w, h), w / 2, base_y - 1, obj.width * 0.38, max(3.0, obj.height * 0.09))
    canvas.alpha_composite(obj, ((w - obj.width) // 2, base_y - obj.height))
    return canvas


# ---------------------------------------------------------------------------------------------
# Decorations (solid 2x2 objects + walk-over 1x1 props)
# ---------------------------------------------------------------------------------------------
# name -> (source box in decorations.png: x0, y0, x1, y1), tiles (w, h), max drawn size in px
DECOR_SHEET = {
    "bush": ((30, 56, 236, 256), (2, 2), (76, 70)),
    "box": ((464, 66, 684, 246), (2, 2), (72, 62)),
    "rock": ((256, 72, 452, 240), (2, 2), (76, 60)),
    "ball": ((486, 274, 662, 452), (1, 1), (30, 30)),
    "bed": ((256, 276, 452, 450), (2, 2), (68, 68)),
    "cans3": ((42, 288, 226, 440), (1, 1), (34, 28)),
    "scratcher": ((490, 461, 661, 672), (2, 2), (56, 74)),
    "bedCushion": ((256, 480, 452, 668), (2, 2), (72, 68)),
    "cans2": ((66, 488, 200, 664), (1, 1), (26, 34)),
}
SOLID_OBJECT_ART = {"bush": "bush", "box": "box", "rock": "rock", "scratcher": "scratcher", "bed": "bed", "bedCushion": "bedCushion"}


def decor_pieces() -> dict[str, Image.Image]:
    rgb = load_rgb("decorations.png")
    pieces = {}
    for name, ((x0, y0, x1, y1), (tw, th), (mw, mh)) in DECOR_SHEET.items():
        pieces[name] = place_object(cutout(rgb[y0:y1, x0:x1]), tw, th, mw, mh)
    return pieces


# ---------------------------------------------------------------------------------------------
# Plank floor: the weave repeats every 182 source px, shown as a 2x2 block of tiles
# ---------------------------------------------------------------------------------------------
PLANK_PERIOD = 182


def plank_tiles() -> list[Image.Image]:
    """[plank00, plank10, plank01, plank11] = tile at (column % 2, row % 2). Tiles seamlessly in both directions."""
    rgb = load_rgb("planks.png")[8:736, 3:726]  # the source has a black border: drop it
    P = PLANK_PERIOD
    best = (1e9, 0, 0)
    for oy in range(0, 80, 2):
        for ox in range(0, 80, 2):
            horizontal = np.abs(rgb[oy : oy + P, ox] - rgb[oy : oy + P, ox + P]).mean()
            vertical = np.abs(rgb[oy, ox : ox + P] - rgb[oy + P, ox : ox + P]).mean()
            best = min(best, (horizontal + vertical, ox, oy))
    _, ox, oy = best
    cell = rgb[oy : oy + P, ox : ox + P].astype(np.uint8)
    big = np.tile(cell, (3, 3, 1))  # wrap-around padding: no edge artefacts when resizing
    size = 2 * TILE
    resized = Image.fromarray(big, "RGB").resize((size * 3, size * 3), Image.LANCZOS).crop((size, size, size * 2, size * 2))
    out = []
    for row in range(2):
        for col in range(2):
            out.append(resized.crop((col * TILE, row * TILE, (col + 1) * TILE, (row + 1) * TILE)).convert("RGBA"))
    return out


# ---------------------------------------------------------------------------------------------
# Fence: 6 pickets per tile, a post every few tiles; the left/right edges use the same pieces turned
# ---------------------------------------------------------------------------------------------
FENCE_PERIOD = 35.6875  # one picket (and one post) in source px
FENCE_BOX = (33, 119, 605, 335)  # x0, y0, x1, y1 of the whole fence in fence.png (post, 14 pickets, post)


def fence_tiles() -> dict[str, Image.Image]:
    art = cutout(load_rgb("fence.png"))
    x0, y0, _, y1 = FENCE_BOX
    run_x0 = x0 + FENCE_PERIOD  # first picket starts right after the left post
    run_w = 6 * FENCE_PERIOD
    # a plain run of 6 pickets
    run = art.crop((round(run_x0), y0, round(run_x0 + run_w) + 1, y1))
    plain = resize_rgba(art, (TILE, TILE), box=(run_x0, y0, run_x0 + run_w, y1))
    # the same run with a post standing in the middle: paste the real post over the third picket
    post = art.crop((x0, y0, round(x0 + FENCE_PERIOD), y1))
    with_post = run.copy()
    with_post.alpha_composite(post.resize((round(FENCE_PERIOD), post.height)), (round(2 * FENCE_PERIOD), 0))
    posted = resize_rgba(with_post, (TILE, TILE), box=(0, 0, run_w, with_post.height))
    return {
        "fence": plain,
        "fencePost": posted,
        "fenceSide": plain.rotate(90, expand=True),
        "fencePostSide": posted.rotate(90, expand=True),
    }


# ---------------------------------------------------------------------------------------------
# Tileset sheet (with extruded borders)
# ---------------------------------------------------------------------------------------------
def read_config() -> dict:
    code = "import('./src/config/arena.ts').then(m=>console.log(JSON.stringify({ARENA:m.ARENA,TILES:m.TILES,OBJECTS:m.OBJECTS})))"
    out = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", code], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def build_tiles(cfg: dict) -> dict[int, Image.Image]:
    """tile id -> 40x40 RGBA."""
    T, O, cols = cfg["TILES"], cfg["OBJECTS"], cfg["ARENA"]["tilesetColumns"]
    tiles: dict[int, Image.Image] = {}
    planks = plank_tiles()
    for key, img in zip(("plank00", "plank10", "plank01", "plank11"), planks):
        tiles[T[key]] = img
    for key, img in fence_tiles().items():
        tiles[T[key]] = img
    pieces = decor_pieces()
    for key in ("cans3", "cans2", "ball"):
        tiles[T[key]] = pieces[key]
    for key, art in SOLID_OBJECT_ART.items():
        block = pieces[art]
        for r in range(2):
            for c in range(2):
                tiles[O[key] + c + r * cols] = block.crop((c * TILE, r * TILE, (c + 1) * TILE, (r + 1) * TILE))
    return tiles


def write_tileset(cfg: dict) -> None:
    a = cfg["ARENA"]
    cols, rows, margin, spacing = a["tilesetColumns"], a["tilesetRows"], a["tilesetMargin"], a["tilesetSpacing"]
    assert (margin, spacing) == (TILESET["margin"], TILESET["spacing"]) and margin * 2 == spacing and margin == 1, "extrude is 1px: margin 1, spacing 2"
    width = margin * 2 + cols * TILE + (cols - 1) * spacing
    height = margin * 2 + rows * TILE + (rows - 1) * spacing
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    tiles = build_tiles(cfg)
    for tid, img in tiles.items():
        assert tid < cols * rows, f"tile id {tid} is outside the {cols}x{rows} tileset"
        pad = np.pad(np.array(img.convert("RGBA")), ((1, 1), (1, 1), (0, 0)), mode="edge")  # extrude by 1px
        x = margin + (tid % cols) * (TILE + spacing) - 1
        y = margin + (tid // cols) * (TILE + spacing) - 1
        sheet.alpha_composite(Image.fromarray(pad, "RGBA"), (x, y))
    sheet.save(OUT / "arena_tiles.png", optimize=True)
    print(f"arena_tiles.png {width}x{height}, {len(tiles)} tiles")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    write_grass()
    write_campus_text()
    write_tileset(read_config())
