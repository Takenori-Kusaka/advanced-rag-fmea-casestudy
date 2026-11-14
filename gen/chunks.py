# -*- coding: utf-8 -*-
"""Build chunk sets: NAIVE / STRUCT(S2) / CTX(S4: context+entity) / XREF(S5: cross-reference graph)."""
import os, re, json, glob, html
from ingest import naive_text, naive_chunks, struct, find_models, nfkc

B = str(__import__('pathlib').Path(__file__).resolve().parents[1])
CORPUS = f'{B}/corpus'; OCR = f'{B}/build/ocr'; OCRFIG = f'{B}/build/ocr_fig2'
OUT = f'{B}/build/chunks'; os.makedirs(OUT, exist_ok=True)
DOCNO_RE = re.compile(r'(MAN-COM-01|MAN-CAN-01|MAN-MD[ABC]-\d{3}|SK-001|QP-07|CR-2025-07|PJ-2025-018|SPEC-MDA200-B|SN-2025-03|BOM-MDA200-B|8D-\d{4}-\d{3}|TR-\d{4}-\d{3}|特開\d{4}-\d{6}|DRBFM-MDB310-01|FMEA-MD[ABC]\d{3}-\d{2})')

def files():
    return sorted(f for f in glob.glob(CORPUS + '/*') if os.path.isfile(f))

def docno_of(path):
    m = DOCNO_RE.search(os.path.basename(path))
    if m: return m.group(1)
    if '不具合DB' in path: return '不具合DB'
    m = re.search(r'取扱説明書_(MD[ABC]-\d{3})', path)
    return f'MAN-{m.group(1)}' if m else os.path.basename(path)

def unmd(t):
    t = html.unescape(t).replace('<br>', '')
    return re.sub(r'\\([\-\(\)\[\]\~\+\.\*_#|])', r'\1', t)

def ocr_md(path):
    base = os.path.basename(path)[:-4]
    fs = sorted(glob.glob(f'{OCR}/*{base}*_p*.md'))
    return '\n\n'.join(unmd(open(f, encoding='utf-8').read()) for f in fs) if fs else None

# ------------------------------------------------------------ NAIVE
def build_naive():
    out = []
    for f in files():
        t = naive_text(f)
        for i, c in enumerate(naive_chunks(t)):
            out.append(dict(id=f'{os.path.basename(f)}#n{i}', file=os.path.basename(f), doc_no=docno_of(f), text=c))
    return out

def whole_files():
    return [dict(file=os.path.basename(f), doc_no=docno_of(f), text=naive_text(f)) for f in files()]

# ------------------------------------------------------------ STRUCT
def split_long(t, n=700):
    if len(t) <= n: return [t]
    parts, buf = [], ''
    for s in re.split(r'(?<=。)', t):
        if len(buf) + len(s) > n and buf: parts.append(buf); buf = ''
        buf += s
    if buf: parts.append(buf)
    return parts

def parse_all():
    docs = []
    for f in files():
        md = ocr_md(f) if f.endswith('.pdf') else None
        d = struct(f) if md is None else __import__('ingest').md_struct(md, os.path.basename(f))
        d['file'] = os.path.basename(f); d['doc_no'] = docno_of(f)
        if not d.get('title') or len(d['title']) < 3: d['title'] = os.path.basename(f)
        docs.append(d)
    return docs

def build_struct(docs):
    out = []; parents = {}
    for d in docs:
        tno = 0; prev = None
        for i, u in enumerate(d['units']):
            pid = None
            if u['kind'] == 'table_row':  # consecutive rows of one table share a parent (small-to-big)
                key = (u['section'], u['text'].split('｜')[0])
                if prev != key: tno += 1
                prev = key; pid = f"{d['file']}#T{tno}"
                parents.setdefault(pid, []).append(u['text'] if pid not in parents else u['text'].split('｜', 1)[-1])
            else: prev = None
            for j, t in enumerate(split_long(u['text'])):
                out.append(dict(id=f"{d['file']}#s{i}.{j}", file=d['file'], doc_no=d['doc_no'], kind=u['kind'], section=u['section'], text=t, parent=pid))
    json.dump({k: ' ／ '.join(v) for k, v in parents.items() if len(' ／ '.join(v)) <= 1500}, open(f'{OUT}/parents.json', 'w', encoding='utf-8'), ensure_ascii=False)
    return out

def register_title(f):
    """Document register (台帳) title derived from the managed file name, not from the parsed body."""
    return re.sub(r'^\d_', '', os.path.splitext(f)[0]).replace('_', ' ')

# ------------------------------------------------------------ S4: contextual header + entity enrichment
def series_map(docs):
    """Derive series -> models from the corpus itself (型式の見方 table + model numbers seen anywhere)."""
    code = {}
    for d in docs:
        for u in d['units']:
            for m in re.finditer(r'(MD[ABC])=([ABC])シリーズ', nfkc(u['text'])): code[m.group(1)] = m.group(2) + 'シリーズ'
    models = set()
    for d in docs:
        for u in d['units']: models.update(find_models(u['text']))
    sm = {}
    for mdl in sorted(models):
        s = code.get(mdl[:3])
        if s: sm.setdefault(s, []).append(mdl)
    return sm, code

def enrich(text, sm, code):
    add = []
    compact = re.sub(r'\s', '', text)
    for s, mdls in sm.items():
        if s in compact: add.append(f'{s}の適用機種: {", ".join(mdls)}')
    ms = find_models(text)
    if ms:
        add.append('正規化型式: ' + ', '.join(f'{m}（{code.get(m[:3], "")}）' for m in ms))
    return text + ('\n［付与情報］' + ' / '.join(add) if add else '')

def build_ctx(docs, struct_chunks):
    sm, code = series_map(docs); title = {d['file']: d['title'] for d in docs}; out = []
    for c in struct_chunks:
        rt = register_title(c['file']); pt = title[c['file']][:40]
        # OCR documents: parsed title is unreliable -> register title only; otherwise register + parsed title
        doc_title = rt if 'スキャン' in c['file'] or pt.startswith(('所見', '発行')) else f'{rt} / {pt}'
        head = f"［文書: {doc_title}（{c['doc_no']}）> {c['section'][:60]}］\n"
        out.append(dict(c, text=head + enrich(c['text'], sm, code)))
    return out, sm, code

# ------------------------------------------------------------ S5: cross-reference graph
PARTICLES = set('のはがをにでともりるたてへやかばなら、。')

def numeral_names(text):
    pairs = {}
    for m in re.finditer(r'([ァ-ヶー一-龥ぁ-ん]{1,14})(\d{2})(?!\d)', text):
        run = m.group(1); cut = 0
        for i in range(len(run) - 1):
            if run[i] in PARTICLES and re.match(r'[ァ-ヶー一-龥]', run[i + 1]): cut = i + 1
        name = run[cut:]
        if len(name) >= 2: pairs.setdefault(m.group(2), {}); pairs[m.group(2)][name] = pairs[m.group(2)].get(name, 0) + 1
    return {n: max(v, key=v.get) for n, v in pairs.items()}

def patent_graph(docs):
    out = []
    for d in docs:
        if not d['doc_no'].startswith('特開'): continue
        body = '\n'.join(u['text'] for u in d['units'])
        names = numeral_names(body)
        for m in re.finditer(r'(?m)^(\d{2})\s+(\S+)$', body): names[m.group(1)] = m.group(2)   # 符号の説明
        figdesc = dict(re.findall(r'【図(\d)】([^【\n]+)', body))
        figs = {}
        for f in glob.glob(f"{OCRFIG}/*{d['doc_no']}*.json"):
            words = [w['content'] for w in json.load(open(f))['words']]
            fig = next((re.search(r'\d', w).group(0) for w in words if '図' in w), '?')
            figs[fig] = sorted({re.sub(r'\D', '', w) for w in words if re.fullmatch(r'-?\d{2}', w)})
        paras = re.findall(r'【\d{4}】[^【]+', body)
        for fig, nums in figs.items():
            lst = ' / '.join(f'{n} {names.get(n, "（名称未特定）")}' for n in nums)
            out.append(dict(id=f"{d['file']}#fig{fig}", file=d['file'], doc_no=d['doc_no'], kind='xref', section=f'図{fig}',
                            text=f"［符号グラフ］{d['doc_no']} 図{fig}（{figdesc.get(fig, '').strip()}）に現れる符号: {lst}"))
        for n, name in names.items():
            in_figs = [f'図{k}' for k, v in figs.items() if n in v]
            sents = [p.strip() for p in paras if re.search(rf'{re.escape(name)}{n}(?!\d)', p)]
            out.append(dict(id=f"{d['file']}#num{n}", file=d['file'], doc_no=d['doc_no'], kind='xref', section=f'符号{n}',
                            text=f"［符号グラフ］{d['doc_no']} 符号{n} = {name}（登場図: {', '.join(in_figs) or '図中で未検出'}）\n本文の記述: " + ' '.join(sents)[:600]))
    return out

def inline_tables(chunks):
    """'付表N による/参照' -> append rows of 付表N from the same document."""
    tables = {}
    for c in chunks:
        m = re.match(r'付表(\d)', c['section'].split(' > ')[0]) if c.get('section') else None
        if m and c['kind'] == 'table_row': tables.setdefault((c['doc_no'], m.group(1)), []).append(re.sub(r'^.*?｜', '', c['text'].split('\n［付与')[0].split('］\n')[-1]))
    out = []
    for c in chunks:
        t = c['text']
        for n in set(re.findall(r'付表(\d)(?:による|を参照|参照)', t)):
            rows = tables.get((c['doc_no'], n))
            if rows and not c['section'].startswith('付表'): t += f'\n［参照先 付表{n} の内容］' + ' ／ '.join(rows)[:400]
        out.append(dict(c, text=t))
    return out

def build_all():
    docs = parse_all()
    naive = build_naive(); st = build_struct(docs)
    ctx, sm, code = build_ctx(docs, st)
    xref = inline_tables(ctx) + patent_graph(docs)
    for name, data in [('naive', naive), ('struct', st), ('ctx', ctx), ('xref', xref)]:
        with open(f'{OUT}/{name}.jsonl', 'w', encoding='utf-8') as f:
            for c in data: f.write(json.dumps(c, ensure_ascii=False) + '\n')
        print(name, len(data))
    json.dump(whole_files(), open(f'{OUT}/whole.json', 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(dict(series=sm, code=code), open(f'{OUT}/entities.json', 'w', encoding='utf-8'), ensure_ascii=False)

if __name__ == '__main__':
    build_all()
