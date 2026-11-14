# -*- coding: utf-8 -*-
"""Turn Word-rendered PDFs into realistic 'printed and scanned' image-only PDFs."""
import sys, os, random
import fitz
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONT = '/mnt/c/Windows/Fonts/BIZ-UDGothicR.ttc'

def scan(src, dst, seed=0):
    r = random.Random(seed); pages = []
    doc = fitz.open(src)
    for pno, page in enumerate(doc):
        pix = page.get_pixmap(dpi=150)
        im = Image.frombytes('RGB', [pix.width, pix.height], pix.samples).convert('L').convert('RGB')
        im = im.rotate(r.uniform(-0.9, 0.9), expand=False, fillcolor='white', resample=Image.BICUBIC)
        # red approval stamp overlapping the header area
        if pno == 0:
            g = ImageDraw.Draw(im, 'RGBA'); x, y = int(im.width * 0.72), int(im.height * 0.06)
            g.ellipse([x, y, x + 150, y + 150], outline=(200, 30, 30, 200), width=6)
            g.text((x + 30, y + 40), '品証\n承認', font=ImageFont.truetype(FONT, 36), fill=(200, 30, 30, 190))
        # speckle noise
        px = im.load()
        for _ in range(int(im.width * im.height * 0.0015)):
            xx, yy = r.randrange(im.width), r.randrange(im.height); v = r.randint(60, 160); px[xx, yy] = (v, v, v)
        im = im.filter(ImageFilter.GaussianBlur(0.6))
        pages.append(im)
    pages[0].save(dst, save_all=True, append_images=pages[1:], resolution=150)

if __name__ == '__main__':
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    for i, f in enumerate(sorted(os.listdir(src_dir))):
        if f.endswith('.pdf'):
            scan(os.path.join(src_dir, f), os.path.join(dst_dir, f.replace('.pdf', '（スキャン）.pdf')), seed=i)
            print('scanned', f)
