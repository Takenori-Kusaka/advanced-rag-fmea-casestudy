# -*- coding: utf-8 -*-
"""Render page images of the synthetic corpus for the deck."""
import fitz, glob, os, shutil
B = str(__import__('pathlib').Path(__file__).resolve().parents[1]); O = f'{B}/deck/img'

def page(pdf, pno, out, clip=None, dpi=130):
    d = fitz.open(pdf); p = d[pno]
    r = p.rect
    cl = fitz.Rect(r.x0 + clip[0] * r.width, r.y0 + clip[1] * r.height, r.x0 + clip[2] * r.width, r.y0 + clip[3] * r.height) if clip else None
    p.get_pixmap(dpi=dpi, clip=cl).save(f'{O}/{out}')

page(f'{O}/fmea.pdf', 0, 'fmea.png', (0, 0, 1, 0.55), 150)
page(f'{O}/drbfm.pdf', 0, 'drbfm.png', (0, 0, 1, 0.6), 150)
page(glob.glob(f'{B}/corpus/*TR-2023-118*.pdf')[0], 0, 'scan_tr.png', (0, 0, 1, 0.75), 110)
page(glob.glob(f'{B}/corpus/*8D-2024-021*.pdf')[0], 0, 'scan_8d.png', (0, 0, 1, 0.7), 110)
page(glob.glob(f'{B}/corpus/*MAN-COM-01*.pdf')[0], 0, 'comm_p1.png', (0, 0, 1, 1), 110)
d = fitz.open(glob.glob(f'{B}/corpus/*MAN-COM-01*.pdf')[0])
for i, p in enumerate(d):
    if 'タイムアウト初期値' in p.get_text(): page(glob.glob(f'{B}/corpus/*MAN-COM-01*.pdf')[0], i, 'comm_timeout.png', (0, 0, 1, 1), 110); break
page(glob.glob(f'{B}/corpus/*取扱説明書_MDA-200*.pdf')[0], 0, 'manual_p1.png', (0, 0, 1, 1), 110)
d = fitz.open(glob.glob(f'{B}/corpus/*特開2025-012345*.pdf')[0])
for i, p in enumerate(d):
    if '符号の説明' in p.get_text(): page(glob.glob(f'{B}/corpus/*特開2025-012345*.pdf')[0], i, 'patent_sign.png', (0, 0, 1, 1), 110); break
for f in glob.glob(f'{B}/build/patfig/*012345*img1*.png'): shutil.copy(f, f'{O}/patent_fig2.png')
print(os.listdir(O))
