# -*- coding: utf-8 -*-
"""Index chunk sets into OpenSearch (kuromoji BM25 + ruri-v3 dense), run retrieval configs, evaluate against gold facts."""
import os, re, json, sys, time, unicodedata
import numpy as np
from opensearchpy import OpenSearch, helpers

B = str(__import__('pathlib').Path(__file__).resolve().parents[1]); CH = f'{B}/build/chunks'; RES = f'{B}/results'; os.makedirs(RES, exist_ok=True)
os_ = OpenSearch(os.environ.get('OPENSEARCH_URL', 'http://localhost:9200'), timeout=120)
K = int(os.environ.get('TOPK', 5))
EMB = 'cl-nagoya/ruri-v3-310m'; RR = 'cl-nagoya/ruri-v3-reranker-310m'

def norm(t): return re.sub(r'\s', '', unicodedata.normalize('NFKC', t))

_enc = None
def enc():
    global _enc
    if _enc is None:
        from sentence_transformers import SentenceTransformer
        _enc = SentenceTransformer(EMB, device='cuda'); _enc.max_seq_length = 1024
    return _enc

_rr = None
def reranker():
    global _rr
    if _rr is None:
        from sentence_transformers import CrossEncoder
        _rr = CrossEncoder(RR, device='cuda', max_length=1024)
    return _rr

SETTINGS = {"index": {"knn": True, "number_of_shards": 1, "number_of_replicas": 0},
  "analysis": {
    "char_filter": {"nfkc": {"type": "icu_normalizer", "name": "nfkc_cf"}},
    "tokenizer": {"ja": {"type": "kuromoji_tokenizer", "mode": "search"},
                  "ng": {"type": "ngram", "min_gram": 2, "max_gram": 3, "token_chars": ["letter", "digit"]}},
    "analyzer": {"ja": {"char_filter": ["nfkc"], "tokenizer": "ja", "filter": ["kuromoji_baseform", "kuromoji_part_of_speech", "cjk_width", "ja_stop", "lowercase"]},
                 "ja_ng": {"char_filter": ["nfkc"], "tokenizer": "ng", "filter": ["lowercase"]}}}}
MAP = {"properties": {"text": {"type": "text", "analyzer": "ja", "fields": {"ng": {"type": "text", "analyzer": "ja_ng"}}},
                      "doc_no": {"type": "keyword"}, "file": {"type": "keyword"}, "kind": {"type": "keyword"},
                      "emb": {"type": "knn_vector", "dimension": 768, "method": {"name": "hnsw", "engine": "lucene", "space_type": "cosinesimil"}}}}

def load(name): return [json.loads(l) for l in open(f'{CH}/{name}.jsonl', encoding='utf-8')]

def build_index(name):
    docs = load(name); idx = f'idx_{name}'
    if os_.indices.exists(index=idx): os_.indices.delete(index=idx)
    os_.indices.create(index=idx, body={"settings": SETTINGS, "mappings": MAP})
    vecs = enc().encode(['検索文書: ' + d['text'] for d in docs], batch_size=16, normalize_embeddings=True, show_progress_bar=False)
    helpers.bulk(os_, ({"_index": idx, "_id": d['id'], "_source": dict(d, emb=v.tolist())} for d, v in zip(docs, vecs)), refresh=True)
    print('indexed', idx, len(docs))

def ensure_pipeline():
    os_.transport.perform_request('PUT', '/_search/pipeline/rrf', body={"phase_results_processors": [{"score-ranker-processor": {"combination": {"technique": "rrf", "rank_constant": 60}}}]})

def qvec(q): return enc().encode(['検索クエリ: ' + q], normalize_embeddings=True)[0].tolist()

ENT = None
def expand(q):
    """S4 query side: normalise model numbers and add the series they belong to."""
    global ENT
    if ENT is None: ENT = json.load(open(f'{CH}/entities.json', encoding='utf-8'))
    sys.path.insert(0, os.path.dirname(__file__)); from ingest import find_models
    add = []
    for m in find_models(q):
        s = ENT['code'].get(m[:3])
        add.append(m + (f' {s}' if s else ''))
    return q + (' ' + ' '.join(add) if add else '')

def search(idx, q, mode, n=50, doc_filter=None):
    v = qvec(q); flt = [{"term": {"doc_no": doc_filter}}] if doc_filter else []
    lex = {"bool": {"should": [{"match": {"text": q}}, {"match": {"text.ng": q}}], "filter": flt}}
    knn = {"knn": {"emb": {"vector": v, "k": n, **({"filter": {"bool": {"filter": flt}}} if flt else {})}}}
    if mode == 'dense': body = {"size": n, "query": knn}; params = {}
    elif mode == 'bm25': body = {"size": n, "query": lex}; params = {}
    else: body = {"size": n, "query": {"hybrid": {"queries": [lex, knn]}}}; params = {"search_pipeline": "rrf"}
    body["_source"] = {"excludes": ["emb"]}
    hits = os_.search(index=idx, body=body, params=params)['hits']['hits']
    return [h['_source'] for h in hits]

def rerank(q, cands):
    if not cands: return cands
    sc = reranker().predict([(q, c['text']) for c in cands], batch_size=16, show_progress_bar=False)
    return [c for _, c in sorted(zip(sc, cands), key=lambda x: -x[0])]

REF = re.compile(r'(MAN-COM-01|MAN-CAN-01|SK-001|CR-2025-07|8D-\d{4}-\d{3}|TR-\d{4}-\d{3}|特開\d{4}-\d{6}|DRBFM-MDB310-01|FMEA-MD[ABC]\d{3}-\d{2}|SN-2025-03|QP-07|PJ-2025-018)')
def follow_refs(idx, q, top, mode):
    """S8: if a retrieved chunk points to another document, pull the best chunk of that document (max 2)."""
    have = {c['doc_no'] for c in top}; extra = []
    for c in top:
        for ref in REF.findall(c['text']):
            if ref not in have and len(extra) < 2:
                r = rerank(q, search(idx, q, 'hybrid', n=10, doc_filter=ref))
                if r: extra.append(r[0]); have.add(ref)
    if not extra: return top
    return top[:K - len(extra)] + extra if mode == 1 else top + extra

CONFIGS = [  # label, chunkset, mode, query-expansion, rerank, parent(small-to-big), follow(0 none/1 replace/2 append)
    ('C1 素朴RAG（固定長・Dense）', 'naive', 'dense', False, False, False, 0),
    ('C1b 素朴チャンク＋ハイブリッド', 'naive', 'hybrid', False, False, False, 0),
    ('C2 構造化取込（Dense）', 'struct', 'dense', False, False, False, 0),
    ('C3 ＋ハイブリッド（BM25+Dense, RRF）', 'struct', 'hybrid', False, False, False, 0),
    ('C4 ＋文脈付与・型式正規化', 'ctx', 'hybrid', True, False, False, 0),
    ('C5 ＋参照グラフ（符号・付表）', 'xref', 'hybrid', True, False, False, 0),
    ('C6 ＋再ランキング', 'xref', 'hybrid', True, True, False, 0),
    ('C7 ＋親子展開（表は表ごと読む）', 'xref', 'hybrid', True, True, True, 0),
    ('C8 ＋参照追跡（枠内で置換）', 'xref', 'hybrid', True, True, True, 1),
    ('C8b ＋参照追跡（枠を+2拡張）', 'xref', 'hybrid', True, True, True, 2),
]

PARENTS = None
def small_to_big(ranked):
    """Replace a table-row hit by its whole table (parent); skip duplicate parents and keep k units."""
    global PARENTS
    if PARENTS is None: PARENTS = json.load(open(f'{CH}/parents.json', encoding='utf-8'))
    out, seen = [], set()
    for c in ranked:
        pid = c.get('parent')
        if pid and pid in PARENTS:
            if pid in seen: continue
            seen.add(pid); c = dict(c, text=c['text'].split('］\n')[0] + '］\n' + PARENTS[pid])
        out.append(c)
        if len(out) >= K: break
    return out

def score(facts, chunks):
    texts = [norm(c['text']) for c in chunks]
    hit = [any(re.search(f, t, re.S) for t in texts) for f in facts]
    return sum(hit) / len(facts), all(hit), hit

def file_reference(gold):
    """C0: 'just attach the file' - pick the single best file by BM25 over whole files, give the LLM its first 20k chars."""
    files = json.load(open(f'{CH}/whole.json', encoding='utf-8')); idx = 'idx_files'
    if not os_.indices.exists(index=idx):
        os_.indices.create(index=idx, body={"settings": {k: v for k, v in SETTINGS.items()}, "mappings": {"properties": {"text": MAP['properties']['text'], "file": {"type": "keyword"}}}})
        helpers.bulk(os_, ({"_index": idx, "_source": f} for f in files), refresh=True)
    out = []
    for g in gold:
        h = os_.search(index=idx, body={"size": 1, "query": {"match": {"text": g['q']}}})['hits']['hits']
        f = h[0]['_source'] if h else dict(file='', text='')
        s, ok, hit = score(g['facts'], [dict(text=f['text'][:20000])])
        out.append(dict(id=g['id'], cat=g['cat'], score=s, ok=ok, hit=hit, files=[f['file']], chars=len(f['text'])))
    return out

def run(gold):
    ensure_pipeline(); results = {}
    results['C0 ファイル参照（1ファイル丸ごと）'] = file_reference(gold)
    for label, cs, mode, qx, rr, p2b, fol in CONFIGS:
        rows = []
        for g in gold:
            q = expand(g['q']) if qx else g['q']
            cands = search(f'idx_{cs}', q, mode, n=50)
            ranked = rerank(g['q'], cands[:50]) if rr else cands
            top = small_to_big(ranked) if p2b else ranked[:K]
            if fol: top = follow_refs(f'idx_{cs}', g['q'], top, fol)
            s, ok, hit = score(g['facts'], top)
            rows.append(dict(id=g['id'], cat=g['cat'], score=s, ok=ok, hit=hit, ids=[c['id'] for c in top], docs=[c['doc_no'] for c in top],
                             ctx_chars=sum(len(c['text']) for c in top), top=[c['text'][:400] for c in top]))
        results[label] = rows
        print(label, 'answerable', sum(r['ok'] for r in rows), '/', len(rows), 'fact-recall', round(np.mean([r['score'] for r in rows]), 3))
    json.dump(results, open(f'{RES}/results_k{K}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def ceiling(gold):
    """Is each fact present anywhere in a chunk set? (upper bound of each ingestion)"""
    for name in ['naive', 'struct', 'ctx', 'xref']:
        ch = load(name); n_ok = 0; miss = []
        for g in gold:
            s, ok, hit = score(g['facts'], ch)
            n_ok += ok
            if not ok: miss.append(g['id'])
        print('ceiling', name, n_ok, '/', len(gold), 'missing:', miss)

if __name__ == '__main__':
    gold = json.load(open(os.path.join(os.path.dirname(__file__), 'gold.json'), encoding='utf-8'))
    cmd = sys.argv[1]
    if cmd == 'ceiling': ceiling(gold)
    if cmd == 'index':
        for n in ['naive', 'struct', 'ctx', 'xref']: build_index(n)
    if cmd == 'run': run(gold)
