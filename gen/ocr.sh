#!/bin/bash
# OCR scanned PDFs and patent figure images with YomiToku (CC BY-NC-SA 4.0: non-commercial verification use)
set -e
B="$(cd "$(dirname "$0")/.." && pwd)"
PY="${PYTHON:-python3}"
YT="${YOMITOKU:-yomitoku}"
mkdir -p $B/build/ocr $B/build/patfig $B/build/ocr_fig
for f in $B/corpus/*スキャン*.pdf; do
  $YT "$f" -f md -o $B/build/ocr -d cuda > /dev/null 2>&1 || echo "fail $f"
done
# extract figure images from patent PDFs
B="$B" $PY - <<'EOF'
import fitz, glob, os
B=os.environ['B']
for f in glob.glob(B+'/corpus/6_特許_*.pdf'):
    d=fitz.open(f); n=0
    for p in d:
        for img in p.get_images(full=True):
            pix=fitz.Pixmap(d, img[0]); n+=1
            if pix.n>4: pix=fitz.Pixmap(fitz.csRGB, pix)
            pix.save(f"{B}/build/patfig/{os.path.basename(f)[:-4]}__img{n}.png")
print('figs', len(glob.glob(B+'/build/patfig/*.png')))
EOF
for f in $B/build/patfig/*.png; do
  $YT "$f" -f md -o $B/build/ocr_fig -d cuda > /dev/null 2>&1 || echo "fail $f"
done
ls $B/build/ocr $B/build/ocr_fig
