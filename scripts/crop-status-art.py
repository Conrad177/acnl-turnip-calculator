#!/usr/bin/env python3
"""Crop Conrad's photo and split the villager emote sheet into named faces."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
PHOTO = Path("/home/ubuntu/.cursor/projects/workspace/assets/1f1b08d1-ab25-4dca-8de9-15335cf827f0.png")
SHEET = Path("/home/ubuntu/.cursor/projects/workspace/assets/4c5bff9d-b463-42fe-b532-efbc7a1b166a.png")
EMOTE_DIR = ROOT / "public" / "emotes"
CONRAD_OUT = ROOT / "public" / "conrad.png"

# Named after src/lib/emote.ts. Filled in after reading the sheet.
EMOTE_CELLS: dict[str, tuple[int, int]] = {}


def square_portrait(im: Image.Image, size: int = 96) -> Image.Image:
    rgb = im.convert("RGB")
    w, h = rgb.size
    side = min(w, h)
    left = (w - side) // 2
    top = max(0, (h - side) // 5) if h > w else 0
    crop = rgb.crop((left, top, left + side, top + side))
    return crop.resize((size, size), Image.Resampling.LANCZOS)


def split_sheet(im: Image.Image, cols: int, rows: int, inset: float = 0.06) -> list[Image.Image]:
    w, h = im.size
    cw, ch = w / cols, h / rows
    faces: list[Image.Image] = []
    for row in range(rows):
        for col in range(cols):
            x0 = col * cw + cw * inset
            y0 = row * ch + ch * inset
            x1 = (col + 1) * cw - cw * inset
            y1 = (row + 1) * ch - ch * inset
            faces.append(im.crop((int(x0), int(y0), int(x1), int(y1))))
    return faces


def guess_grid(im: Image.Image) -> tuple[int, int]:
    w, h = im.size
    ratio = w / h
    candidates = [
        (4, 2),
        (4, 3),
        (4, 4),
        (5, 2),
        (5, 3),
        (6, 2),
        (6, 3),
        (8, 2),
        (3, 3),
        (3, 2),
    ]
    best = min(candidates, key=lambda c: abs(ratio - (c[0] / c[1])))
    return best


def main() -> None:
    EMOTE_DIR.mkdir(parents=True, exist_ok=True)
    if not PHOTO.exists() or not SHEET.exists():
        raise SystemExit(f"missing sources photo={PHOTO.exists()} sheet={SHEET.exists()}")

    photo = Image.open(PHOTO)
    square_portrait(photo).save(CONRAD_OUT, "PNG")
    print("wrote", CONRAD_OUT, "from", photo.size)

    sheet = Image.open(SHEET).convert("RGBA")
    cols, rows = guess_grid(sheet)
    faces = split_sheet(sheet, cols, rows)
    preview = EMOTE_DIR / "_preview"
    preview.mkdir(exist_ok=True)
    for index, face in enumerate(faces):
        out = preview / f"{index:02d}.png"
        face.resize((96, 96), Image.Resampling.LANCZOS).save(out, "PNG")
    print("sheet", sheet.size, "grid", f"{cols}x{rows}", "faces", len(faces), "preview", preview)

    if EMOTE_CELLS:
        for name, (col, row) in EMOTE_CELLS.items():
            index = row * cols + col
            faces[index].resize((96, 96), Image.Resampling.LANCZOS).save(EMOTE_DIR / f"{name}.png", "PNG")
            print("named", name, "cell", col, row)


if __name__ == "__main__":
    main()
