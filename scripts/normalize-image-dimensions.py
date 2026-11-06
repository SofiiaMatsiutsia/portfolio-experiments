"""Set real intrinsic dimensions so unloaded media reserves its final ratio."""
from pathlib import Path
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
changed = 0
for page in [*root.glob('*.html'), *root.glob('work/*.html')]:
    def normalize(match):
        global changed
        tag = match[0]
        source = re.search(r'\bsrc="([^"]+)"', tag)
        if not source:
            return tag
        asset = root / source[1].lstrip('/') if source[1].startswith('/') else page.parent / source[1]
        if asset.suffix not in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
            return tag
        width, height = Image.open(asset).size
        result = re.sub(r'\bwidth="\d+"', f'width="{width}"', tag)
        result = re.sub(r'\bheight="\d+"', f'height="{height}"', result)
        if result != tag:
            changed += 1
        return result
    original = page.read_text()
    updated = re.sub(r'<img\b[^>]*>', normalize, original)
    if updated != original:
        page.write_text(updated)
print(f'Updated {changed} image dimension pairs.')
