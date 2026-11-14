# -*- coding: utf-8 -*-
"""Naive and structure-aware ingestion for the case-study corpus."""
import os, re, csv, json, unicodedata
import fitz
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from openpyxl import load_workbook

# ============================================================ naive (what a quick PoC usually does)
def naive_text(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.docx':  # docx2txt-like: paragraphs and table cells in order, one per line, images dropped
        d = Document(path); out = []
        for el in d.element.body.iterchildren():
            if el.tag.endswith('}p'): out.append(Paragraph(el, d).text)
            elif el.tag.endswith('}tbl'):
                for row in Table(el, d).rows:
                    for c in row.cells: out.append(c.text)
        return '\n'.join(out)
    if ext == '.pdf':  # text layer only (scans -> empty)
        return '\n'.join(p.get_text() for p in fitz.open(path))
    if ext == '.xlsx':  # cell values row by row, merged cells only in their top-left
        wb = load_workbook(path, data_only=True); out = []
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                vals = [str(v) for v in row if v is not None]
                if vals: out.append(' '.join(vals))
        return '\n'.join(out)
    if ext == '.csv':
        return open(path, encoding='utf-8-sig').read()
    return ''

def naive_chunks(text, size=500, overlap=50):
    seps = ['\n\n', '\n', '。']; chunks = []; buf = ''
    parts = re.split(r'(\n)', text)
    for p in parts:
        if len(buf) + len(p) > size and buf:
            chunks.append(buf); buf = buf[-overlap:]
        buf += p
    if buf.strip(): chunks.append(buf)
    return [c for c in chunks if c.strip()]

# ============================================================ structure-aware
HEAD_RE = re.compile(r'^(\d+(\.\d+)*\.?\s|【[^】]+】$|付表\d|D\d\s)')

def _rows_to_records(rows, title, footnotes=''):
    hdr = rows[0]; recs = []
    for r in rows[1:]:
        kv = ' / '.join(f'{h.strip()}: {v.strip()}' for h, v in zip(hdr, r) if v and v.strip())
        recs.append(f'【表】{title}｜{kv}' + (f'｜注記: {footnotes}' if footnotes else ''))
    return recs

def docx_struct(path):
    d = Document(path); units = []; path_stack = []; buf = []; title = ''; docno = ''
    body = list(d.element.body.iterchildren())
    def flush():
        if buf:
            units.append(dict(kind='text', section=' > '.join(path_stack), text='\n'.join(buf))); buf.clear()
    i = 0
    while i < len(body):
        el = body[i]
        if el.tag.endswith('}p'):
            p = Paragraph(el, d); t = p.text.strip(); st = p.style.name if p.style is not None else ''
            if not title and t: title = t
            m = re.search(r'文書番号:\s*(\S+)', t)
            if m and not docno: docno = m.group(1)
            if st.startswith('Heading'):
                flush(); lvl = int(st.split()[-1]) if st.split()[-1].isdigit() else 1
                path_stack[:] = path_stack[:lvl - 1] + [t]
            elif el.xpath('.//pic:pic'):
                cap = ''
                if i + 1 < len(body) and body[i + 1].tag.endswith('}p'):
                    cap = Paragraph(body[i + 1], d).text.strip()
                units.append(dict(kind='figure', section=' > '.join(path_stack), text=f'【図】{cap}（図そのものの文字は本文に含まれない）'))
            elif t:
                buf.append(t)
        elif el.tag.endswith('}tbl'):
            flush(); tb = Table(el, d)
            rows = [[c.text for c in r.cells] for r in tb.rows]
            notes = []; j = i + 1
            while j < len(body) and body[j].tag.endswith('}p'):
                tt = Paragraph(body[j], d).text.strip()
                if tt.startswith('※') or tt.startswith('注'): notes.append(tt); j += 1
                elif not tt: j += 1
                else: break
            tname = path_stack[-1] if path_stack else title
            for rec in _rows_to_records(rows, tname, ' '.join(notes)):
                units.append(dict(kind='table_row', section=' > '.join(path_stack), text=rec))
            for k in range(i + 1, j): body[k] = None
            i = j - 1
        i += 1
        while i < len(body) and body[i] is None: i += 1
    flush()
    return dict(title=title, docno=docno, units=units)

def pdf_struct(path, ocr_md=None):
    """Text PDFs: layout-aware (find_tables + heading detection). Scanned PDFs: use OCR markdown if provided."""
    doc = fitz.open(path); units = []; stack = []; buf = []; title = ''; docno = ''
    has_text = any(p.get_text().strip() for p in doc)
    if not has_text:
        if ocr_md is None:
            return dict(title=os.path.basename(path), docno='', units=[])
        return md_struct(ocr_md, os.path.basename(path))
    def flush():
        if buf: units.append(dict(kind='text', section=' > '.join(stack), text='\n'.join(buf))); buf.clear()
    for page in doc:
        tabs = page.find_tables(); tboxes = [fitz.Rect(t.bbox) for t in tabs.tables]
        blocks = page.get_text('dict')['blocks']; items = []
        for t in tabs.tables: items.append((t.bbox[1], 'tbl', t))
        for b in blocks:
            if b['type'] != 0: items.append((b['bbox'][1], 'img', None)); continue
            r = fitz.Rect(b['bbox'])
            if any(r.intersects(tb) for tb in tboxes): continue
            for ln in b['lines']:
                txt = ''.join(s['text'] for s in ln['spans']).strip(); size = max(s['size'] for s in ln['spans'])
                if txt: items.append((ln['bbox'][1], 'line', (txt, size)))
        items.sort(key=lambda x: x[0])
        for _, kind, obj in items:
            if kind == 'line':
                txt, size = obj
                if not title: title = txt
                m = re.search(r'文書番号:\s*(\S+)', txt)
                if m and not docno: docno = m.group(1)
                if size >= 12.5 or re.match(r'^(\d+(\.\d+)*\.\s|【[^】]{2,12}】$)', txt):
                    flush(); lvl = txt.split(' ')[0].count('.') if re.match(r'^\d', txt) else 1
                    stack[:] = stack[:max(lvl, 1) - 1] + [txt]
                else: buf.append(txt)
            elif kind == 'tbl':
                flush()
                # read each cell by clipping the page text to the cell box (keeps reading order of CJK spans)
                rows = [[(page.get_text('text', clip=fitz.Rect(cb)).replace('\n', '').strip() if cb else '') for cb in row.cells] for row in obj.rows]
                if len(rows) >= 2:
                    for rec in _rows_to_records(rows, stack[-1] if stack else title):
                        units.append(dict(kind='table_row', section=' > '.join(stack), text=rec))
            elif kind == 'img':
                units.append(dict(kind='figure', section=' > '.join(stack), text='【図】（画像。図中の文字は本文に含まれない）'))
    flush()
    # attach ※ notes that directly follow tables
    return dict(title=title, docno=docno, units=units)

def md_struct(md, name):
    units = []; stack = []; buf = []; title = ''; docno = ''
    lines = md.split('\n'); i = 0
    def flush():
        if buf: units.append(dict(kind='text', section=' > '.join(stack), text='\n'.join(buf))); buf.clear()
    while i < len(lines):
        ln = lines[i].strip()
        if ln.startswith('|'):
            flush(); rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) or c == '' for c in cells): rows.append(cells)
                i += 1
            if len(rows) >= 2:
                for rec in _rows_to_records(rows, stack[-1] if stack else title): units.append(dict(kind='table_row', section=' > '.join(stack), text=rec))
            continue
        if ln.startswith('#'):
            flush(); stack[:] = [ln.lstrip('# ')]
        elif ln:
            if not title: title = ln
            m = re.search(r'文書番号[:：]\s*(\S+)', ln)
            if m and not docno: docno = m.group(1)
            buf.append(ln)
        i += 1
    flush()
    return dict(title=title or name, docno=docno, units=units)

def xlsx_struct(path):
    """Detect header rows by formatting, build hierarchical header paths, forward-fill merged cells, 1 row = 1 record."""
    wb = load_workbook(path); units = []; title = ''; docno = ''
    for ws in wb.worksheets:
        merged = {}
        for mr in ws.merged_cells.ranges:
            v = ws.cell(mr.min_row, mr.min_col).value
            for r in range(mr.min_row, mr.max_row + 1):
                for c in range(mr.min_col, mr.max_col + 1): merged[(r, c)] = (v, mr.min_row, mr.max_row)
        def val(r, c):
            return merged[(r, c)][0] if (r, c) in merged else ws.cell(r, c).value
        def filled(r):  # header cue = background fill on any anchor cell of the row (formatting is the signal)
            return any(ws.cell(r, c).fill is not None and ws.cell(r, c).fill.fill_type == 'solid' for c in range(1, ws.max_column + 1))
        first = next((r for r in range(1, min(ws.max_row, 20) + 1) if filled(r)), None)
        hdr_rows = []
        if first:
            r = first
            while r <= ws.max_row and (filled(r) or any(merged.get((r, c), (None, 0, 0))[1] in hdr_rows for c in range(1, ws.max_column + 1))):
                hdr_rows.append(r); r += 1
        if not hdr_rows:  # plain list sheet (e.g. BOM / revision history): first row with >=3 values is header
            hr = next((r for r in range(1, ws.max_row + 1) if sum(1 for c in range(1, ws.max_column + 1) if ws.cell(r, c).value is not None) >= 3), None)
            if hr is None: continue
            hdr_rows = [hr]
        top = [' '.join(str(ws.cell(r, c).value) for c in range(1, ws.max_column + 1) if ws.cell(r, c).value is not None and str(ws.cell(r, c).value) != '(印)')
               for r in range(1, hdr_rows[0])]
        block = ' / '.join(t for t in top if t)
        if not title and block: title = block[:60]
        m = re.search(r'(FMEA-[A-Z0-9-]+|DRBFM-[A-Z0-9-]+|BOM-[A-Z0-9-]+)', block)
        if m and not docno: docno = m.group(1)
        labels = {}
        for c in range(1, ws.max_column + 1):
            parts = []
            for r in hdr_rows:
                v = val(r, c)
                if v is not None and (not parts or parts[-1] != str(v)): parts.append(str(v))
            if parts:  # leaf label; keep the parent when the leaf is only an abbreviation like "(O)"
                leaf = parts[-1]
                if re.fullmatch(r'[\(（].{1,5}[\)）]', leaf) and len(parts) >= 2: leaf = parts[-2] + leaf
                labels[c] = (parts[0] if len(parts) > 1 else '', leaf)
        for r in range(hdr_rows[-1] + 1, ws.max_row + 1):
            vals = []
            for c in range(1, ws.max_column + 1):
                v = val(r, c)
                if v is None or c not in labels: continue
                vals.append(f'{labels[c][1]}: {str(v).replace(chr(10), " ")}')
            if len(vals) >= 2:
                units.append(dict(kind='excel_row', section=f'{ws.title}', text=f'【{ws.title}】{block}｜' + ' / '.join(vals)))
    return dict(title=title, docno=docno, units=units)

def csv_struct(path):
    rows = list(csv.reader(open(path, encoding='utf-8-sig'))); hdr = rows[0]; units = []
    for r in rows[1:]:
        units.append(dict(kind='record', section='不具合DB', text='【不具合DB】' + ' / '.join(f'{h}: {v}' for h, v in zip(hdr, r))))
    return dict(title='不具合DB エクスポート', docno='不具合DB', units=units)

def struct(path, ocr_dir=None):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.docx': return docx_struct(path)
    if ext == '.pdf':
        md = None
        if ocr_dir:
            p = os.path.join(ocr_dir, os.path.basename(path) + '.md')
            if os.path.exists(p): md = open(p, encoding='utf-8').read()
        return pdf_struct(path, md)
    if ext == '.xlsx': return xlsx_struct(path)
    if ext == '.csv': return csv_struct(path)
    return dict(title='', docno='', units=[])

# ============================================================ entity normalisation (S4)
def nfkc(s): return unicodedata.normalize('NFKC', s)

MODEL_RE = re.compile(r'\bMD\s*([ABC])\s*-?\s*(\d{3})\b|(?<![A-Z0-9])([ABC])(\d{3})(?![0-9])')
def find_models(text):
    t = nfkc(text).upper(); out = []
    for m in MODEL_RE.finditer(t):
        s, n = (m.group(1), m.group(2)) if m.group(1) else (m.group(3), m.group(4))
        out.append(f'MD{s}-{n}')
    return sorted(set(out))
