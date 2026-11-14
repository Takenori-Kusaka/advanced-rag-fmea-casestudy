# -*- coding: utf-8 -*-
"""Demo: enumeration question (C5-1) solved by structured filter instead of top-k similarity."""
import json
from opensearchpy import OpenSearch
import os
os_ = OpenSearch(os.environ.get('OPENSEARCH_URL', 'http://localhost:9200'))
q = {"size": 50, "_source": ["id", "text"], "query": {"bool": {
    "filter": [{"term": {"doc_no": "不具合DB"}}, {"match_phrase": {"text": "正規化型式: MDA-200"}}],
    "must": [{"bool": {"should": [{"match": {"text.ng": "コネクタ"}}, {"match": {"text.ng": "半嵌合"}}, {"match": {"text.ng": "抜け"}}, {"match": {"text": "分類: 接続"}}], "minimum_should_match": 1}}]}}}
hits = os_.search(index='idx_xref', body=q)['hits']['hits']
gold = ['Q-2024-0137', 'Q-2024-0388', 'Q-2025-0052']
print('hits', len(hits))
for g in gold: print(g, any(g in h['_source']['text'] for h in hits))
for h in hits[:12]: print(h['_source']['text'].split('\n')[1][:140])
