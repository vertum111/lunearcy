"""Measure the wake-up clips against the idle loop and the sleep loop, and print the layer numbers for src/creatures.js.

Usage: python3 -I tools/art/calibrate_wake.py [wake_dir]
The wake clip must end exactly on the idle (same width, feet, centre) and start exactly on the sleep pose, so
selecting a sleeping dragon never jumps. For each species it prints:
  WAKE  [layer width, foot drop, end drift x]   (drift moves the clip from the sleep spot to the idle spot)
  SLEEP [layer width, foot drop, shift x]
Widths are world pixels; x values are in the art's own facing (the world mirrors them like the sprites).
"""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'art', 'dragons')
# Keep in sync with src/creatures.js: idle width and paw, which way each layer is drawn.
IDLE = {'moss': (280, .945), 'ember': (220, .997), 'stone': (244, .875), 'mist': (288, .99), 'crystal': (264, .99)}
FACE = {'moss': 1, 'ember': -1, 'stone': 1, 'mist': 1, 'crystal': 1}
WAKE_FACING = {'moss': 1, 'ember': -1, 'stone': 1, 'mist': 1, 'crystal': 1}
SLEEP_FACING = {**WAKE_FACING, 'stone': -1}


def frame(path, index):
    im = Image.open(path)
    im.seek(index if index >= 0 else im.n_frames + index)
    return np.asarray(im.convert('RGBA'))[..., 3] > 128


def box(mask):
    rows = np.where(mask.sum(1) > 6)[0]
    cols = np.where(mask.sum(0) > 6)[0]
    h, w = mask.shape
    # left, right, top, bottom, width, height of the picture
    return cols[0], cols[-1], rows[0], rows[-1], w, h


def place(b, width, drop=0.0):
    """Screen-space numbers of a layer `width` px wide sitting on the nest floor, pushed down by `drop`."""
    l, r, t, bot, w, h = b
    s = width / w
    return {'w': (r - l) * s, 'feet': (h - 1 - bot) * s - drop, 'cx': ((l + r) / 2 - w / 2) * s}


def main():
    wake_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'wake')
    for k, (iw, paw) in IDLE.items():
        ib = box(frame(os.path.join(ROOT, 'anim2', f'{k}.webp'), 0))
        idle = place(ib, iw, (1 - paw) * ib[5] * iw / ib[4])
        last = box(frame(os.path.join(wake_dir, f'{k}.webp'), -1))
        first = box(frame(os.path.join(wake_dir, f'{k}.webp'), 0))
        # Wake layer: last frame as wide as the idle, feet on the idle's feet.
        ww = idle['w'] / (last[1] - last[0]) * last[4]
        end = place(last, ww)
        drop = end['feet'] - idle['feet']
        dx = idle['cx'] * FACE[k] * WAKE_FACING[k] - end['cx']
        # Sleep layer: as big as the clip's first frame and in the same spot (the clip starts undrifted).
        start = place(first, ww, drop)
        sb = box(frame(os.path.join(ROOT, 'sleep', f'{k}.webp'), 0))
        sw = start['w'] / (sb[1] - sb[0]) * sb[4]
        sleep = place(sb, sw)
        sdrop = sleep['feet'] - start['feet']
        sdx = start['cx'] * WAKE_FACING[k] * SLEEP_FACING[k] - sleep['cx']
        print(f"{k}: WAKE [{ww:.0f},{drop:.0f},{dx * WAKE_FACING[k]:.0f}]  SLEEP [{sw:.0f},{sdrop:.0f},{sdx * SLEEP_FACING[k]:.0f}]")


if __name__ == '__main__':
    main()
