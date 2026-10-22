"""Generate browser assets from preserved PNGs; requires Python Pillow with WebP.

Run: python3 scripts/optimize-assets.py
Arena: quality 90. Sprites: lossless, including alpha. Dimensions stay unchanged.
"""

from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
sources = ROOT / "asset-sources"
original_bytes = 0
optimized_bytes = 0

for source in sorted(sources.rglob("*.png")):
    relative = source.relative_to(sources)
    destination = (ROOT / "public" / relative).with_suffix(".webp")
    destination.parent.mkdir(parents=True, exist_ok=True)
    sprite = relative.parts[0] == "character-sprites"
    with Image.open(source) as original:
        options = {"lossless": True} if sprite else {"quality": 90}
        original.save(destination, "WEBP", method=6, **options)
        with Image.open(destination) as optimized:
            assert optimized.size == original.size, source
            if sprite:
                before = original.convert("RGBA")
                after = optimized.convert("RGBA")
                assert before.getchannel("A").tobytes() == after.getchannel("A").tobytes(), source
                # WebP may discard RGB under fully transparent pixels. All
                # visible RGB, including partially transparent edges, must match.
                visible = before.getchannel("A").point(lambda alpha: 255 if alpha else 0)
                difference = ImageChops.difference(before.convert("RGB"), after.convert("RGB"))
                assert ImageChops.multiply(difference, visible.convert("RGB")).getbbox() is None, source
    original_bytes += source.stat().st_size
    optimized_bytes += destination.stat().st_size
    print(f"{relative}: {source.stat().st_size:,} -> {destination.stat().st_size:,} bytes")

print(f"Total: {original_bytes / 1e6:.2f} -> {optimized_bytes / 1e6:.2f} MB "
      f"({100 * (1 - optimized_bytes / original_bytes):.1f}% smaller)")
