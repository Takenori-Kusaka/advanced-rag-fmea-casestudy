# Research OpenSearch Japanese hybrid

## 依頼内容

You are a research assistant. Respond in Japanese. We will build and actually run (in Docker on WSL Ubuntu, RTX 4060 8GB, ~9GB RAM for WSL) an OpenSearch-based Japanese RAG retrieval experiment. Provide precise, verified, implementation-level facts (with doc URLs) on:

1. OpenSearch version choice: which version (2.19.x or 3.x) supports the hybrid query + search pipeline with RRF (score-ranker-processor), normalization-processor (min_max, l2) combination; exact JSON for creating the search pipeline and a hybrid query combining a `match` (BM25) query and a `knn` query on a knn_vector field with externally computed embeddings (no ML Commons model). Note pagination/size limits of hybrid query and any gotchas.
2. Japanese analysis: analysis-kuromoji plugin (install command inside the official Docker image; kuromoji_tokenizer modes, kuromoji_baseform, kuromoji_part_of_speech, ja_stop, kuromoji_stemmer, icu_normalizer/NFKC needs analysis-icu), user dictionary format for custom terms (model numbers like "BX-A120"), synonym_graph filter usage with Japanese; also Sudachi plugin (WorksApplications analysis-sudachi) availability for OpenSearch and its version compatibility. Recommend a concrete analyzer definition for technical Japanese with model numbers (e.g., combining kuromoji + ngram subfield, or a keyword subfield for 型番).
3. knn_vector mapping: engine (faiss/lucene) choice, hnsw params, space_type cosinesimil vs innerproduct, filtering with efficient filters (pre-filter) for ACL/metadata, dimension for the embedding models below.
4. Index design patterns: nested fields vs join (parent/child) vs separate indices; collapse on parent_id; multi-index search with index aliases; storing parent text for small-to-big.
5. Neural sparse search in OpenSearch: does it support Japanese (models like opensearch-neural-sparse-encoding-multilingual-v1)? If not practical, say so.
6. Japanese embedding and reranker models usable locally via sentence-transformers / transformers in 2025-2026: cl-nagoya/ruri-v3 family (dims, max length, required prefixes like "検索クエリ: " / "検索文書: "), BAAI/bge-m3 (dense dim 1024, sparse output via FlagEmbedding), intfloat/multilingual-e5 (prefix "query: "/"passage: "), and Japanese rerankers (cl-nagoya/ruri-v3-reranker-310m? hotchpotch/japanese-reranker-cross-encoder-*, BAAI/bge-reranker-v2-m3). Verify exact Hugging Face model IDs exist and note license and VRAM/speed suitability for an 8GB GPU.

Use WebSearch / tavily / WebFetch, verify on official docs (opensearch.org docs, GitHub, Hugging Face model cards). Do not invent APIs; flag uncertainty. Final report in Japanese, implementation-oriented with exact JSON snippets, ~3000-4000 characters, with source URLs.

## 結果

## OpenSearch 日本語RAG検索実験：実装向け調査結果（2026-11時点）

### 1. バージョン選定とハイブリッド検索
- RRF（`score-ranker-processor`）と `pagination_depth` は **2.19 で導入**されました。`normalization-processor`（min_max / l2 / z_score）はそれより前からあります。RRF の `parameters.weights` は GitHub issue #1152 が 2025年5月に merge されているため、**3.x 系（3.1前後と推定、未確認）** から使えるはずです。
- 現在の最新は 3.8.0（2026-08）です。ただし **Sudachi プラグインの最新ビルドは OpenSearch 3.5.0 まで**しかありません。プラグインはバージョンが完全一致していないと入りません。
- **推奨は `opensearchproject/opensearch:3.5.0`** です。kuromoji と Sudachi を両方試せ、RRF の重み付けも使えます。

```json
PUT /_search/pipeline/rrf
{"phase_results_processors":[{"score-ranker-processor":
  {"combination":{"technique":"rrf","rank_constant":60,
   "parameters":{"weights":[0.5,0.5]}}}}]}

PUT /_search/pipeline/minmax
{"phase_results_processors":[{"normalization-processor":{
  "normalization":{"technique":"min_max"},
  "combination":{"technique":"arithmetic_mean","parameters":{"weights":[0.3,0.7]}}}}]}

GET /chunks/_search?search_pipeline=rrf
{"size":20,"_source":{"excludes":["emb"]},
 "query":{"hybrid":{"pagination_depth":100,"queries":[
   {"match":{"body":"BX-A120 の電源仕様"}},
   {"knn":{"emb":{"vector":[...],"k":100,
     "filter":{"bool":{"filter":[{"terms":{"acl":["grpA"]}}]}}}}}]}}}
```

注意点:
- `hybrid` はトップレベル専用です。`function_score` などで包むとエラーになるか、正規化が素通りされます。
- `from > 0` のときは `pagination_depth` が必須で、上限は `index.max_result_window`（既定 10000）です。省略すると各サブクエリが返すのはシャードごとに `size` 件だけになり、融合に使える候補が足りなくなります。
- rescore の `window_size` はサブクエリごとに適用されます。sort と rescore は併用できません。
- 2.19 未満では、ページングすると「number of documents after fetch phase is different」エラーが出ます。
- ML Commons を使わない構成では、`neural` ではなく `knn` クエリにベクトルを直接渡します。
- 出典:
  - https://docs.opensearch.org/latest/query-dsl/compound/hybrid/
  - https://docs.opensearch.org/latest/search-plugins/search-pipelines/score-ranker-processor/
  - https://docs.opensearch.org/latest/search-plugins/search-pipelines/normalization-processor/
  - https://opensearch.org/blog/navigating-pagination-in-hybrid-queries-with-the-pagination_depth-parameter

### 2. 日本語の形態素解析
Dockerfile でプラグインを入れます。

```dockerfile
FROM opensearchproject/opensearch:3.5.0
RUN bin/opensearch-plugin install --batch analysis-kuromoji analysis-icu && \
    bin/opensearch-plugin install --batch https://github.com/WorksApplications/elasticsearch-sudachi/releases/download/v3.6.0/opensearch-3.5.0-analysis-sudachi-3.6.0.zip
```

- Sudachi の zip ファイル名は v3.6.0 の asset 一覧で確認済みです（`opensearch-2.19.4-…` から `opensearch-3.5.0-…` まであります）。
- ダウンロード URL のパス形式は GitHub の慣例どおりと想定しています（未検証）。
- Sudachi は辞書（`system_core.dic`）を別途 config に置く必要があります。
- kuromoji_tokenizer の `mode` は `normal` / `search`（既定）/ `extended` の3種類です。`user_dictionary` と `user_dictionary_rules` は同時に使えません。
- ユーザー辞書の CSV 形式は `表層形,分割後(空白区切り),読み,品詞` です。

推奨 analyzer（型番は keyword と ngram のサブフィールドで別途拾います）:

```json
"analysis":{
 "char_filter":{"nfkc":{"type":"icu_normalizer","name":"nfkc_cf"}},
 "tokenizer":{"ja":{"type":"kuromoji_tokenizer","mode":"search","discard_punctuation":true,
   "user_dictionary_rules":["BX-A120,BX-A120,ビーエックスエー120,型番"]},
   "ng":{"type":"ngram","min_gram":2,"max_gram":3,"token_chars":["letter","digit"]}},
 "filter":{"syn":{"type":"synonym_graph","synonyms":["電源,パワーサプライ","PC,パソコン"]}},
 "normalizer":{"pn":{"type":"custom","char_filter":["nfkc"],"filter":["lowercase"]}},
 "analyzer":{
  "ja_index":{"char_filter":["nfkc"],"tokenizer":"ja",
   "filter":["kuromoji_baseform","kuromoji_part_of_speech","cjk_width","ja_stop","kuromoji_stemmer","lowercase"]},
  "ja_search":{"char_filter":["nfkc"],"tokenizer":"ja",
   "filter":["kuromoji_baseform","kuromoji_part_of_speech","cjk_width","ja_stop","kuromoji_stemmer","lowercase","syn"]},
  "ja_ngram":{"char_filter":["nfkc"],"tokenizer":"ng","filter":["lowercase"]}}}
```

```json
"body":{"type":"text","analyzer":"ja_index","search_analyzer":"ja_search",
 "fields":{"ng":{"type":"text","analyzer":"ja_ngram"}}},
"model_no":{"type":"keyword","normalizer":"pn"}
```

- `synonym_graph` は検索時専用にしてください。インデックス時に使うと複数語の同義語が正しく扱われません。
- 検索時は `body`・`body.ng`・`model_no`（term）を `bool.should` でまとめると、型番の完全一致と部分一致の両方を拾えます。
- 出典:
  - https://docs.opensearch.org/latest/analyzers/language-analyzers/kuromoji
  - https://github.com/WorksApplications/elasticsearch-sudachi

### 3. knn_vector のマッピング
```json
"settings":{"index.knn":true},
"emb":{"type":"knn_vector","dimension":768,"space_type":"innerproduct",
 "method":{"name":"hnsw","engine":"faiss","parameters":{"m":16,"ef_construction":128}}}
```

- 効率的フィルタ（`knn.filter`）は lucene / faiss / jvector で使えます。faiss の HNSW は 2.9 から対応しています。件数に応じて「事前フィルタ＋厳密検索」と「近似検索」を自動で切り替えます。
- 埋め込みを L2 正規化しておけば、`innerproduct` と `cosinesimil` は同じ順位になります。小規模な実験なら `engine:lucene` + `cosinesimil` でも十分です。
- faiss のグラフは JVM ヒープの外のメモリに載ります。WSL の RAM が約 9GB なので、`-Xms2g -Xmx2g` 程度に抑えて残りを空けておくのが安全です。
- コンテナ起動前に `vm.max_map_count=262144` の設定が必要です。
- 2.12 以降は `OPENSEARCH_INITIAL_ADMIN_PASSWORD` が必須です。実験用途なら `DISABLE_SECURITY_PLUGIN=true` で無効化できます。
- 出典: https://docs.opensearch.org/latest/vector-search/filter-search-knn/efficient-knn-filtering/

### 4. インデックス設計
- **推奨構成は「チャンクを1ドキュメント」とするフラットなインデックス**です。各ドキュメントに `parent_id`、`parent_text`（`"index":false` で保存のみ）、`acl`、メタデータを持たせます。
  - 親子の束ね: 取得後に `collapse: {"field":"parent_id"}` で親単位にまとめるか、アプリ側で dedup します。
  - small-to-big: `parent_text` を返すか、別の `parents` インデックスを mget して親文書を取ります。
- hybrid と collapse の併用、hybrid と nested の inner_hits の併用は 3.x で順次対応された記憶がありますが、**未確認です。3.5 で実地確認してください**。
- nested はベクトルを nested 内に入れられますが、ヒットした子の特定に inner_hits が要り、hybrid と組み合わせると複雑になります。
- join（parent/child）は has_child と knn の組み合わせが扱いにくく、RAG 用途では非推奨です。
- 複数インデックスを横断する場合は alias（`POST _aliases`）で束ねます。ただしインデックスごとに analyzer が違うと BM25 スコアは比較できないので、融合は RRF に寄せるのが安全です。

### 5. Neural sparse 検索の日本語対応
- `opensearch-project/opensearch-neural-sparse-encoding-multilingual-v1`（mBERT ベース、約160M、語彙 105,879 次元）は **日本語に対応**しています。MIRACL の ja で 0.669（BM25 は 0.312）です。
- doc-only 方式なので、クエリ側は tokenizer と重みテーブルだけで済みます。
- 外部で sentence-transformers の `SparseEncoder` を使ってエンコードし、`rank_features` フィールドに投入すれば ML Commons なしでも組めます。クエリ側で `neural_sparse` にトークン重みを直接渡す `query_tokens` 指定は、記憶ベースで未検証です。
- ルートとしては使えますが、まずは BM25 + dense を優先し、追加比較枠にするのが妥当です。BGE-M3 の sparse 出力（`lexical_weights`）も同じ形で投入できます。
- 出典:
  - https://huggingface.co/opensearch-project/opensearch-neural-sparse-encoding-multilingual-v1
  - https://docs.opensearch.org/latest/vector-search/ai-search/neural-sparse-custom

### 6. ローカル用モデル（8GB GPU を想定）
| モデル | 次元 / 最大長 | 前置き（prefix） | ライセンス | 8GB での適性 |
|---|---|---|---|---|
| cl-nagoya/ruri-v3-30m / 70m / 130m / 310m | 256 / 384 / 512 / 768、8192 tok | 検索クエリ側 `"検索クエリ: "`、文書側 `"検索文書: "`（他に `"トピック: "`、空文字） | Apache-2.0 | 310m を fp16 で余裕。transformers ≥ 4.48（ModernBERT）が必要 |
| BAAI/bge-m3 | 1024、8192 | 不要 | MIT（記憶ベース） | fp16 で可。`BGEM3FlagModel(...).encode(return_dense=True, return_sparse=True)` |
| intfloat/multilingual-e5-large | 1024、512 | `"query: "` / `"passage: "` は必須 | MIT（記憶ベース） | 可 |
| cl-nagoya/ruri-v3-reranker-310m | cross-encoder | — | Apache-2.0 | JQaRA nDCG@10 86.9 で最良。推奨 |
| hotchpotch/japanese-reranker-cross-encoder-{xsmall,small,base,large}-v1 | max_length 512 | — | MIT | 後継として hotchpotch/japanese-reranker-base-v2 がある |
| BAAI/bge-reranker-v2-m3 | 568M | — | Apache-2.0（記憶ベース） | fp16 で可。JQaRA 67.3 |

- 推奨構成: 埋め込みは ruri-v3-310m（768次元、prefix 必須）、比較対象に bge-m3、リランカーは ruri-v3-reranker-310m（候補は上位50〜100件）。
- 長い文書をバッチで処理すると VRAM を食うので、max_seq_length を 512〜1024 に制限してください。
- 出典:
  - https://huggingface.co/cl-nagoya/ruri-v3-310m
  - https://huggingface.co/cl-nagoya/ruri-v3-reranker-310m
  - https://huggingface.co/BAAI/bge-m3
  - https://huggingface.co/intfloat/multilingual-e5-large
  - https://huggingface.co/hotchpotch/japanese-reranker-cross-encoder-large-v1

### 未確認の点
- RRF の weights が使える正確なバージョン
- hybrid と collapse / inner_hits を併用できるか
- `neural_sparse` で `query_tokens` を直接指定できるか
- bge-m3 / e5 / bge-reranker のライセンス
- Sudachi zip のダウンロード URL のパス

これらは 3.5.0 の環境で実機確認するか、モデルカードを見て確定させてください。
