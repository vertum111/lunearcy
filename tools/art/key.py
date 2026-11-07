"""Chroma-key flat magenta (#FF00FF) backgrounds from generated art into trimmed RGBA sprites.

Usage:
  python3 -I tools/art/key.py in.png out.webp [--split N] [--width W]
--split N cuts the keyed image into N sprites at the emptiest columns near each 1/N
(outputs out-1.webp ... out-N.webp, left to right).
"""
import sys
import numpy as np
from PIL import Image


def key(rgb):
    a = rgb.astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Magenta-ness: red and blue high, green low.
    m = np.clip(np.minimum(r, b) - g, 0, 1)
    alpha = 1 - np.clip((m - 0.18) / (0.55 - 0.18), 0, 1)
    # Despill: pull the magenta cast out of semi-transparent edges.
    spill = np.clip(np.minimum(r, b) - g, 0, None) * (1 - alpha) ** 0.5
    out = a.copy()
    out[..., 0] = r - spill * 0.9
    out[..., 2] = b - spill * 0.9
    out = np.clip(out, 0, 1)
    return np.dstack([out, alpha])


def trim(rgba, pad=6):
    ys, xs = np.where(rgba[..., 3] > 0.08)
    y0, y1, x0, x1 = max(ys.min() - pad, 0), ys.max() + pad, max(xs.min() - pad, 0), xs.max() + pad
    return rgba[y0:y1 + 1, x0:x1 + 1]


def save(rgba, path, width=None):
    im = Image.fromarray((rgba * 255).round().astype(np.uint8))
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(path, 'WEBP', quality=92, method=6)
    print(path, im.size)


def main():
    args = sys.argv[1:]
    src, dst = args[0], args[1]
    split = int(args[args.index('--split') + 1]) if '--split' in args else 1
    width = int(args[args.index('--width') + 1]) if '--width' in args else None
    rgba = key(np.asarray(Image.open(src).convert('RGB')))
    if split == 1:
        save(trim(rgba), dst, width)
        return
    # Cut where the fewest opaque pixels are, near each 1/N of the width (sprites may overlap slightly).
    cover = (rgba[..., 3] > 0.08).sum(axis=0)
    w = len(cover)
    cuts = [0]
    for k in range(1, split):
        lo, hi = int(w * (k / split - 0.08)), int(w * (k / split + 0.08))
        cuts.append(lo + int(np.argmin(cover[lo:hi])))
    cuts.append(w)
    stem = dst.rsplit('.', 1)[0]
    for i in range(split):
        save(trim(rgba[:, cuts[i]:cuts[i + 1]]), f'{stem}-{i + 1}.webp', width)


if __name__ == '__main__':
    main()
