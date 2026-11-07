"""Turn a magenta-screen idle video into a looping, transparent animated WebP sprite.

Usage:
  python3 -I tools/art/animate.py in.mp4 out.webp [--width 560] [--fps 12] [--mirror] [--once] [--speed 1.5]
--once makes a play-once clip (e.g. waking up): no crossfade, every frame kept, loop count 1.
--normalize undoes a camera zoom inside the clip (Kling often pulls back towards its end keyframe): every frame
is rescaled about the character's feet so it keeps the size it has at the end of the clip.
Frames are keyed with tools/art/key.py, cropped to the union of all frames (so the
character never jitters), resized and packed with img2webp. Also writes out.png:
the first frame, used as the static poster / reduced-motion image.
"""
import os
import subprocess
import sys
import tempfile
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from key import key  # noqa: E402


def normalize(frames):
    # Character size per frame = sqrt of its opaque area. Before the zoom it sits on one plateau, after it on
    # another; frames in between use their own measured size. Poses (a wing stretch) barely move the plateaus.
    size = np.array([np.sqrt((f[..., 3] > .5).sum()) for f in frames])
    post = np.median(size[-8:])
    pre = np.median(size[:max(8, len(size) // 3)])
    smooth = np.convolve(np.pad(size, 2, mode='edge'), np.ones(5) / 5, mode='valid')
    start = next((i for i, v in enumerate(smooth) if v < pre * .93), len(size))
    end = next((i for i in range(start, len(size)) if smooth[i] <= post * 1.04), len(size))
    out = []
    for i, f in enumerate(frames):
        z = pre if i < start else post if i >= end else size[i]
        s = post / z
        if abs(s - 1) < .01:
            out.append(f)
            continue
        ys, xs = np.where(f[..., 3] > .5)
        ax, ay = (xs.min() + xs.max()) / 2, ys.max()
        h, w = f.shape[:2]
        im = Image.fromarray((f * 255).round().astype(np.uint8)).resize((round(w * s), round(h * s)), Image.LANCZOS)
        canvas = Image.new('RGBA', (w, h))
        canvas.paste(im, (round(ax - ax * s), round(ay - ay * s)))
        out.append(np.asarray(canvas).astype(np.float32) / 255)
    print(f'normalize: pre {pre:.0f} post {post:.0f} zoom frames {start}-{end}')
    return out


def main():
    args = sys.argv[1:]
    src, dst = args[0], args[1]
    width = int(args[args.index('--width') + 1]) if '--width' in args else 560
    fps = int(args[args.index('--fps') + 1]) if '--fps' in args else 12
    speed = float(args[args.index('--speed') + 1]) if '--speed' in args else 1.0
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', src, '-vf', f'fps={fps}', f'{tmp}/f%04d.png'], check=True)
        names = sorted(n for n in os.listdir(tmp) if n.endswith('.png'))
        frames = [key(np.asarray(Image.open(f'{tmp}/{n}').convert('RGB'))) for n in names]
        once = '--once' in args
        # Kling's last frame repeats the first; drop it so the loop does not stutter.
        if len(frames) > 2 and not once:
            frames = frames[:-1]
        # Crossfade loop: blend the tail into the head and drop the tail, so the last
        # kept frame flows straight into frame 0 with no jump.
        k = 0 if once else min(8, len(frames) // 6)
        n = len(frames)
        head = [frames[n - k + i] * (1 - (i + 1) / (k + 1)) + frames[i] * ((i + 1) / (k + 1)) for i in range(k)]
        frames = head + frames[k:n - k]
        if '--normalize' in args:
            frames = normalize(frames)
        mask = np.zeros(frames[0].shape[:2], bool)
        for f in frames:
            mask |= f[..., 3] > 0.08
        ys, xs = np.where(mask)
        y0, y1, x0, x1 = max(ys.min() - 4, 0), ys.max() + 5, max(xs.min() - 4, 0), xs.max() + 5
        out = []
        for i, f in enumerate(frames):
            im = Image.fromarray((f[y0:y1, x0:x1] * 255).round().astype(np.uint8))
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
            path = f'{tmp}/o{i:04d}.png'
            im.save(path)
            out.append(path)
        Image.open(out[0]).save(dst.rsplit('.', 1)[0] + '.png')
        delay = round(1000 / fps / speed)
        # Lossy alpha (quality 50) is invisible on the map and saves about a third over img2webp's lossless alpha.
        ims = [Image.open(p) for p in out]
        ims[0].save(dst, save_all=True, append_images=ims[1:], duration=delay, loop=1 if once else 0,
                    lossless=False, quality=80, alpha_quality=50, method=6)
        print(dst, f'{len(out)} frames', Image.open(out[0]).size, f'{os.path.getsize(dst) // 1024} KB')


if __name__ == '__main__':
    main()
