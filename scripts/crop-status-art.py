#!/usr/bin/env python3
"""Crop Conrad's full character and eight faces from the status emote sheet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
MEDIA = Path("/cursor/stores/bc-0e98f8ce-42bd-4e39-8473-664939fa27a4/media")
PHOTO = MEDIA / "conrad-icon.png"
SHEET = MEDIA / "status-emotes.png"
EMOTE_DIR = ROOT / "public" / "emotes"
CONRAD_OUT = ROOT / "public" / "conrad.png"

# Connected-component boxes on the 10×4 sheet (minx, miny, maxx, maxy).
# sad is the crying face; thinking includes the thought bubble.
EMOTE_BOXES: dict[str, tuple[int, int, int, int]] = {
    "waiting": (272, 14, 322, 50),
    "hopeful": (138, 80, 193, 116),
    "worried": (340, 14, 386, 50),
    "happy": (207, 13, 256, 50),
    "shocked": (340, 143, 389, 182),
    "sad": (406, 213, 454, 248),
    "smug": (608, 15, 647, 50),
    "thinking": (142, 208, 189, 248),
}


def alpha_centroid(im: Image.Image) -> tuple[float, float]:
    w, h = im.size
    px = im.load()
    mass = 0
    cx = 0.0
    cy = 0.0
    for y in range(h):
        for x in range(w):
            a = px[x, y][3]
            if a < 24:
                continue
            mass += a
            cx += x * a
            cy += y * a
    if mass <= 0:
        return (w / 2, h / 2)
    return (cx / mass, cy / mass)


def export_face(sheet: Image.Image, box: tuple[int, int, int, int], dest: Path) -> None:
    x0, y0, x1, y1 = box
    w, h = sheet.size
    pad = 6
    cell = sheet.crop(
        (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + 1 + pad), min(h, y1 + 1 + pad))
    )
    cw, ch = cell.size
    cx, cy = alpha_centroid(cell)
    margin = 18
    left = cx + margin
    right = cw - cx + margin
    top = cy + margin
    bottom = ch - cy + margin
    half = int(max(left, right, top, bottom) + 0.999)
    canvas = half * 2
    sq = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    paste = (half - int(round(cx)), half - int(round(cy)))
    sq.paste(cell, paste, cell)
    sq.resize((128, 128), Image.Resampling.LANCZOS).save(dest, "PNG")


def main() -> None:
    if not PHOTO.exists() or not SHEET.exists():
        raise SystemExit(f"missing sources photo={PHOTO.exists()} sheet={SHEET.exists()}")
    EMOTE_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET).convert("RGBA")
    for name, box in EMOTE_BOXES.items():
        export_face(sheet, box, EMOTE_DIR / f"{name}.png")
        print("emote", name)
    icon = Image.open(PHOTO).convert("RGBA")
    icon.resize((256, 256), Image.Resampling.LANCZOS).save(CONRAD_OUT, "PNG")
    print("conrad", CONRAD_OUT, icon.size)


if __name__ == "__main__":
    main()
