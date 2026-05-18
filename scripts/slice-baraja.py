#!/usr/bin/env python3
"""
Recorta la hoja de sprites Baraja_española_completa.png en cartas individuales.
Baraja de 40 cartas: 1-7, 10 (sota), 11 (caballo), 12 (rey) — sin 8 ni 9.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "Baraja_española_completa.png"
OUTPUT_DIR = ROOT / "public" / "cards"

COLS = 12
ROWS = 5  # 4 palos + fila inferior (blanco + reverso)

SUITS = ["OROS", "COPAS", "ESPADAS", "BASTOS"]

# columna del sprite -> número en el juego (None = no se exporta)
COL_TO_NUMBER: dict[int, int | None] = {
    0: 1,
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 7,
    7: None,
    8: None,
    9: 10,
    10: 11,
    11: 12,
}


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"No se encuentra la imagen: {SOURCE}")

    img = Image.open(SOURCE).convert("RGBA")
    width, height = img.size
    card_w = width // COLS
    card_h = height // ROWS

    print(f"Imagen: {width}x{height} → carta {card_w}x{card_h}px")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    count = 0
    for row in range(4):
        suit = SUITS[row]
        for col in range(COLS):
            number = COL_TO_NUMBER.get(col)
            if number is None:
                continue
            left = col * card_w
            top = row * card_h
            card = img.crop((left, top, left + card_w, top + card_h))
            out_path = OUTPUT_DIR / f"{suit}_{number}.png"
            card.save(out_path, optimize=True)
            count += 1
            print(f"  {out_path.name}")

    back = img.crop((card_w, 4 * card_h, 2 * card_w, 5 * card_h))
    back_path = OUTPUT_DIR / "back.png"
    back.save(back_path, optimize=True)
    print(f"  {back_path.name}")
    count += 1

    print(f"\n✓ {count} archivos en {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
