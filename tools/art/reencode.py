"""Re-pack animated WebP sprites with a lossy alpha plane (the biggest share of their weight).

Usage: python3 -I tools/art/reencode.py out_dir file.webp [file.webp ...]
Frames, durations and loop count are kept; colour stays at quality 80, alpha drops to 50,
which is invisible on the painted map (the edges were checked at 2x) and saves about a third.
"""
import os
import sys
from PIL import Image


def main():
    out_dir, files = sys.argv[1], sys.argv[2:]
    for src in files:
        im = Image.open(src)
        frames, durations = [], []
        for i in range(im.n_frames):
            im.seek(i)
            frames.append(im.convert('RGBA').copy())
            durations.append(im.info.get('duration', 83))
        loop = im.info.get('loop', 0)
        kind = os.path.basename(os.path.dirname(src))
        dst = os.path.join(out_dir, kind, os.path.basename(src))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        frames[0].save(dst, save_all=True, append_images=frames[1:], duration=durations, loop=loop,
                       lossless=False, quality=80, alpha_quality=50, method=6)
        print(f'{kind}/{os.path.basename(src)}: {os.path.getsize(src) // 1024} -> {os.path.getsize(dst) // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
