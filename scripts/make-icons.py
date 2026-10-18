#!/usr/bin/env python3
"""
Builds the app icons from the orange-cat logo:  art-source/logo.png  ->  public/icons/*.png

Run after changing the logo:  python3 scripts/make-icons.py   (needs Pillow: pip install pillow)

Files written (all referenced by index.html and public/manifest.webmanifest):
  icon-192.png, icon-512.png     "any" icons (phones, desktop install, Chrome's install dialog)
  icon-maskable-512.png          Android round / squircle icons: the cat is shrunk into the safe zone so nothing is cut off
  apple-touch-icon.png           iPhone / iPad home screen (180x180, no transparency)
  favicon-32.png                 browser tab (a tighter crop on the cat's face, so it stays readable when tiny)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "art-source" / "logo.png"
OUT = ROOT / "public" / "icons"

# Maskable icons: the platform may cut everything outside a circle of 80% of the width. The logo content reaches ~304 px from its
# center (the milk drops), so this scale keeps the farthest point inside that circle (0.4 * size).
MASKABLE_CONTENT_SHARE = 0.86  # share of the icon width taken by the square logo crop
FAVICON_BOX = (150, 60, 570, 480)  # tight crop on the head, in logo pixels


def square_crop(logo: Image.Image) -> Image.Image:
    """The logo is a little wider than tall: cut a square from the middle (keeps the whole cat, belt and drops)."""
    w, h = logo.size
    side = min(w, h)
    left = (w - side) // 2
    return logo.crop((left, 0, left + side, side))


def main() -> None:
    logo = Image.open(SOURCE).convert("RGB")
    background = logo.getpixel((2, 2))  # the logo's flat yellow, used to pad the maskable icon
    square = square_crop(logo)
    OUT.mkdir(parents=True, exist_ok=True)

    def save(image: Image.Image, name: str, size: int) -> None:
        image.resize((size, size), Image.LANCZOS).save(OUT / name, optimize=True)
        print(f"wrote public/icons/{name} ({size}x{size})")

    save(square, "icon-192.png", 192)
    save(square, "icon-512.png", 512)
    save(square, "apple-touch-icon.png", 180)
    save(logo.crop(FAVICON_BOX), "favicon-32.png", 32)

    maskable = Image.new("RGB", (512, 512), background)
    content = round(512 * MASKABLE_CONTENT_SHARE * 0.78)  # 0.78: stays inside the 80% circle even at the corners of the crop
    shrunk = square.resize((content, content), Image.LANCZOS)
    maskable.paste(shrunk, ((512 - content) // 2, (512 - content) // 2))
    maskable.save(OUT / "icon-maskable-512.png", optimize=True)
    print("wrote public/icons/icon-maskable-512.png (512x512)")


if __name__ == "__main__":
    main()
