#!/usr/bin/env python3
"""Crop Conrad's character icon and eight faces from the status emote sheet."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path("/workspace")
MEDIA = Path("/cursor/stores/bc-0e98f8ce-42bd-4e39-8473-664939fa27a4/media")
PHOTO = MEDIA / "conrad-icon.png"
SHEET = MEDIA / "status-emotes.png"
EMOTE_DIR = ROOT / "public" / "emotes"
CONRAD_OUT = ROOT / "public" / "conrad.png"

# Tight boxes from connected components on the 10×4 sheet (minx, miny, maxx, maxy).
EMOTE_BOXES: dict[str, tuple[int, int, int, int]] = {
    "waiting": (272, 14, 322, 50),
    "hopeful": (138, 80, 193, 116),
    "worried": (340, 14, 386, 50),
    "happy": (207, 13, 256, 50),
    "shocked": (340, 143, 389, 182),
    "sad": (472, 81, 520, 116),
    "smug": (608, 15, 647, 50),
    "thinking": (142, 208, 189, 248),
}


def export_face(sheet: Image.Image, box: tuple[int, int, int, int], dest: Path) -> None:
    x0, y0, x1, y1 = box
    pad = 3
    w, h = sheet.size
    cell = sheet.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + 1 + pad), min(h, y1 + 1 + pad)))
    cw, ch = cell.size
    side = max(cw, ch)
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.paste(cell, ((side - cw) // 2, (side - ch) // 2), cell)
    sq.resize((96, 96), Image.Resampling.NEAREST).save(dest, "PNG")


def main() -> None:
    if not PHOTO.exists() or not SHEET.exists():
        raise SystemExit(f"missing sources photo={PHOTO.exists()} sheet={SHEET.exists()}")
    EMOTE_DIR.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET).convert("RGBA")
    for name, box in EMOTE_BOXES.items():
        export_face(sheet, box, EMOTE_DIR / f"{name}.png")
        print("emote", name)
    icon = Image.open(PHOTO).convert("RGBA")
    icon.crop((229, 0, 771, 542)).resize((128, 128), Image.Resampling.LANCZOS).save(CONRAD_OUT, "PNG")
    print("conrad", CONRAD_OUT)


if __name__ == "__main__":
    main()
