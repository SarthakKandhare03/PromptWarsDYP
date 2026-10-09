"""Build favicon / PWA icon set from design/logo-512.png (rendered from design/logo.html)."""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "design" / "logo-512.png"
OUT = ROOT / "frontend" / "public"
YELLOW = (255, 225, 77, 255)


def main() -> None:
    logo = Image.open(SRC).convert("RGBA")
    icons = OUT / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 64, 192, 512):
        logo.resize((size, size), Image.LANCZOS).save(icons / f"icon-{size}.png", optimize=True)
    logo.resize((32, 32), Image.LANCZOS).save(icons / "favicon-32.png", optimize=True)
    # iOS: no transparency (it adds black), so flatten onto brand yellow.
    flat = Image.new("RGBA", (512, 512), YELLOW)
    flat.alpha_composite(logo)
    flat.convert("RGB").resize((180, 180), Image.LANCZOS).save(icons / "apple-touch-icon.png", optimize=True)
    # Android maskable: keep the mark inside the 80% safe zone.
    mask = Image.new("RGBA", (512, 512), YELLOW)
    mask.alpha_composite(logo.resize((410, 410), Image.LANCZOS), (51, 51))
    mask.save(icons / "icon-maskable-512.png", optimize=True)
    logo.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("icons written:", sorted(p.name for p in icons.iterdir()), "+ favicon.ico")


if __name__ == "__main__":
    main()
