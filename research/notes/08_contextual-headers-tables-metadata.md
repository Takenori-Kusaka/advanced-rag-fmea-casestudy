# Research contextual headers for chunks

## 依頼内容

日本語で回答してください。新人テックリード向け「Advanced RAG 実践ガイド」スライドに 2〜3 枚追加するための調査です。ファイルは編集しないでください（調査のみ）。

テーマ：チャンクに付ける「文脈（Contextual）」の作り方。Anthropic の Contextual Retrieval（LLM が 50〜100 トークンの説明を生成してチャンクに前置）を出発点に、次の 3 点を一次資料で調べてください。

1. 表形式データ（CSV・Excel・DB の行、PDF の表）で、列ヘッダや表タイトルをチャンクの文脈として付ける手法の例
   - 行を「列名: 値」で直列化する方法、表を分割するときにヘッダを各チャンクに繰り返す方法（例：Unstructured、LlamaIndex、Azure AI Document Intelligence＋Azure AI Search の表チャンク、Docling の表チャンカー、AWS Bedrock Knowledge Bases の CSV メタデータ）
   - 表の直列化形式（Markdown / JSON / 「列名: 値」）を比較した研究（例："Table Meets LLM"（arXiv:2305.13062）、TableRAG、表の直列化比較の論文など。要確認）
2. 文脈の文量はどれくらいが良いか
   - Anthropic の推奨（50〜100 トークン）とその根拠の有無、他の評価（文脈が長すぎると埋め込みがチャンク本体より文脈に引っ張られる、等の報告があるか）
   - 埋め込みモデルの入力長との関係
3. ファイル名・作成者・日付・章のパス・文書タイトルなどのメタデータを文脈として本文に前置する手法
   - LLM 生成の説明 vs 機械的なメタデータ前置（document title / section heading prepend）を比較した評価（例：「contextual chunk headers」を提唱した dsRAG の評価、LlamaIndex の metadata の埋め込み・LLM への渡し分け〔excluded_embed_metadata_keys 等〕、Pinecone・Weaviate・Elastic の推奨）
   - メタデータを本文に混ぜる（埋め込みに入れる）か、フィルタ用の別フィールドにするかの使い分け
   - 注意点：筆者の自前実測（架空企業の合成コーパス 48 問）では、チャンク先頭の見出しにファイル名を使うと 34 問、本文のタイトルを使うと 38 問、両方を並べると 37 問だった。ファイル名に型番が強く入るため、型番の質問が答えのない取扱説明書に引き寄せられた。また Excel の FMEA は「列名: 値」の 1 行 1 レコード化で 2/8 → 7/8 問に改善した。これと整合／矛盾する外部報告があれば挙げてください。

記憶だけで数値を書かず、確認できたものだけを書き、確認できないものは「未確認」と明記してください。ベンダーの自己申告は区別してください。

出力形式：
- A. 手法・資料の要約表（資料名／何を文脈として付けるか／条件／結果・数値／限界）8〜12 件
- B. 表データの文脈付けの具体例（変換前→変換後のテキスト例を 2 つ程度）
- C. 文量の目安と根拠（根拠が弱いならそう書く）
- D. メタデータの「本文に混ぜる／フィルタに分ける」判断基準
- E. スライド 2〜3 枚分の構成案（タイトル、lead 1 文、本体要素、グラフ化できる数値）
- F. 未確認・注意点

## 結果

# チャンクに付ける「文脈」の作り方：一次資料の調査結果

ファイルは編集していません。数値は、取得した一次資料の本文で確認できたものだけを書いています。【ベンダー】は製品・手法の提供元が自分で測った値、【第三者】は学術論文や独立した検証です。

結論を先に書きます。
- 50〜100 トークンという長さは、Anthropic が「ふつうこのくらいになった」と書いた結果で、長さを変えて比べた根拠は示されていません。
- 表は、ヘッダを各チャンクに繰り返す仕組みが主要ツールで既定になっています。ただし、どの直列化形式が良いかは、モデルや評価データによって変わります。
- 筆者の「ファイル名を見出しにすると型番の質問が別文書に引き寄せられる」という結果を直接測った外部報告は見つかりませんでした。考え方として整合する報告はあります（F 節）。

---

## A. 手法・資料の要約表（12件）

| # | 資料名 | 何を文脈として付けるか | 条件 | 結果・数値 | 限界 |
|---|---|---|---|---|---|
| 1 | Anthropic「Contextual Retrieval」(2024)【ベンダー】 | LLM（Claude 3 Haiku）が文書全体とチャンクから作る短い説明を、埋め込みと BM25 の両方の前に付ける | チャンクは「数百トークン以下」（例は 800）。指標は 1−recall@20 | 失敗率 5.7% → 3.7%（35%減）。BM25 併用で 2.9%（49%減）。リランク併用で 1.9%（67%減） | 文脈の長さは「usually 50-100 tokens」と書かれているだけで、長さを変えた比較はない。文書要約を付ける方法は「very limited gains」 |
| 2 | dsRAG / RAG_Techniques の CCH ノートブック【ベンダー】 | 文書タイトル（LLM が生成）と文書要約。セクション名も付けられる | KITE（4データセット・50問、0〜10点）。Cohere リランカー、GPT-4o | 平均 4.72 → 6.04（+27.9%）。10-K データでは 2.6 → 6.3。RSE（関連区間の抽出）と組み合わせると 8.42。単一例でリランク関連度 0.106 → 0.922 | 50問と少ない。採点は LLM。FinanceBench の数値は RSE と分離されていない |
| 3 | Yousuf ら「Utilizing Metadata for Better RAG」arXiv:2601.11863（ECIR 2026）【第三者】 | 会社名・年・書式種別・セクション名などを `key:value;` 形式で前に付ける（prefix）、後ろに付ける（suffix）、または別に埋め込んで融合（unified） | SEC 10-K 25本、350トークン チャンク、120問。text-embedding-3-small と bge-m3 | 3-small・一般質問の Context@5：メタデータなし 33.33、prefix 55.00、unified 63.33。bge-m3：26.67 → prefix 61.67 | 会社名と年が効き、セクション名の効果は小さい（数値は図のみ）。フィルタとの比較はしていない |
| 4 | Dadopoulos ら arXiv:2510.24402（FinanceBench）【第三者】 | LLM が作るチャンク単位のメタデータ（クラスタ、答えられる質問など）を本文に前置 | text-embedding-3-large、ハイブリッド検索 + Cohere リランク | F1：標準チャンク 38.9 → 前置あり 44.1。ファイルの事前フィルタを足すと、標準チャンクでは F1 38.9 → 37.3 に下がった | 著者自身が「ファイルフィルタが強すぎる可能性」と書いている |
| 5 | Reuter ら「Summary-Augmented Chunking」arXiv:2510.06999【第三者】 | 文書単位の要約（約150文字）を各チャンクに前置 | LegalBench-RAG。500文字チャンク、gte-large | 別文書を取ってしまう失敗率（DRM）：ContractNLI では前置なしで 95% 超。前置ありでは平均 19.29%（「ほぼ半減」）。150文字と300文字を比べ、150文字が精度と再現率のバランス最良。汎用的な要約が専門家向け要約より良かった | 「要約の信号がチャンク固有の関連性を覆い隠しうる」と著者が懸念を述べている（測定はしていない） |
| 6 | LlamaIndex Document/Node【ベンダー】 | metadata を `{key}: {value}` 形式で本文の前に付ける。埋め込み用と LLM 用で除外キーを別々に指定できる | 既定では埋め込み・LLM の両方に入る | SimpleDirectoryReader は既定で file_name と日付類を両方から除外し、file_path は残す（main ブランチのソースで確認） | 効果の評価はない |
| 7 | AWS Bedrock KB の CSV メタデータ【ベンダー】 | 1行を1レコードとして扱い、本文は1列（contentFields）だけ。他の列はフィルタ用メタデータ | S3 の `.metadata.json` では `includeForEmbedding:true` を付けると `key: value\n\nチャンク` の形で埋め込みに入る | 精度の評価はない | 本文に指定できるのは1列だけ。CSV の値はすべて文字列として扱われる |
| 8 | Docling HybridChunker【ベンダー／OSS】 | `repeat_table_header=True`（既定）で表ヘッダを各チャンクに繰り返す。表の既定の直列化はトリプレット形式 | `contextualize()` が見出しなどを足した文字列を返し、それを埋め込みに使う想定 | 評価はない | 既定の直列化は2列以上の表が前提で、1列の表ではチャンクが空になる不具合が Issue で報告されている |
| 9 | Unstructured chunking【ベンダー／OSS】 | 表は他の要素と混ぜずに単独チャンクにする。大きい表は TableChunk に分割。main ブランチのソースでは `repeat_table_headers` が既定 True | text_as_html を保持 | 評価はない | 公開ドキュメントにヘッダ繰り返しの記載は確認できず、どのバージョンから入ったかは未確認 |
| 10 | Azure（Document Intelligence Layout、AI Search Document Layout skill、Architecture Center）【ベンダー】 | 表を Markdown で出力。h1〜h3 の見出しを別フィールドに出す。title・summary・keywords を付与 | keywords と language はフィルタやキーワード検索用、要約は全文検索・ベクトル検索用、と用途を書き分け | 評価はない | 分割した表チャンクにヘッダを繰り返すかの記述は見つからなかった（未確認） |
| 11 | Sui ら「Table Meets LLM」arXiv:2305.13062（WSDM 2024）【第三者】 | LLM が表を読むときの入力形式：NL+Sep / Markdown / JSON / XML / HTML | GPT-3.5 と GPT-4、7種の構造タスク | HTML などのマークアップが NL+Sep を 6.76% 上回る。ただしタスクごとに最良の形式が違う | 検索（埋め込み）ではなく、LLM の読解の評価 |
| 12 | 表の直列化と検索の研究群【第三者中心】 | Markdown / CSV / JSON / TSV、key-value 形式、メタデータの有無 | arXiv:2604.24040：形式の違いで Recall@1 が最大 0.26 程度ぶれる。TEmBed-T（2607.24130）：常に最良の形式はない。TableRAG：列名と値の組を検索単位にし、GPT-3.5 で ArcadeQA 49.2 / BirdQA 45.5 | ImprovingAgents ブログ（LLM 読解、GPT-4.1-nano）：Markdown-KV 60.7%、CSV 44.3% | 埋め込み検索では、形式の良し悪しがモデルとデータセットに依存する |

---

## B. 表データの文脈付けの具体例（どちらも説明用に作った例）

**例1：Excel の FMEA を「列名: 値」で1行1レコードにする**

変換前（ヘッダ行と離れたデータ行だけがチャンクになった状態）：
```
| 3 | ポンプP-200 | シール摩耗 | 液漏れ | 7 | 4 | 5 | 140 | 定期交換 |
```
変換後（表タイトル＋列名: 値）：
```
[FMEA_ポンプ系.xlsx / シート: 設計FMEA / 表: 故障モード一覧]
項目番号: 3
部品: ポンプP-200
故障モード: シール摩耗
影響: 液漏れ
重大度(S): 7
発生度(O): 4
検出度(D): 5
RPN: 140
対策: 定期交換
```
外部資料との対応は次のとおりです。
- 1行1レコードは AWS の CSV 取り込みと同じ考え方
- 列名と値の組を単位にするのは TableRAG のセル検索と同じ発想
- 「key: value」形式が LLM 読解で最良だった報告（ImprovingAgents）がある。ただしこれは検索ではなく読解の評価

**例2：PDF の長い表を分割し、ヘッダを各チャンクに繰り返す（Docling・Unstructured の既定動作）**

変換前（2つ目のチャンクに列名がない）：
```
chunk2: | A-12 | 2.4 | 85 | 合格 |
        | A-13 | 2.6 | 88 | 合格 |
```
変換後：
```
chunk2: 表3「試験成績一覧（第4章 受入試験）」（続き）
        | 型番 | 厚さ(mm) | 硬度 | 判定 |
        |---|---|---|---|
        | A-12 | 2.4 | 85 | 合格 |
        | A-13 | 2.6 | 88 | 合格 |
```
Azure の Layout が出す Markdown の表や Unstructured の text_as_html を、行の区切りで分けるときにこの形にします。

---

## C. 文量の目安と根拠

**Anthropic の 50〜100 トークンは、根拠として弱い。** ブログにあるのは「usually 50-100 tokens」という観察だけです。長さを変えて比べた結果も、なぜその長さなのかの説明もありません。チャンクを 800 トークンとすると、文脈は全体の 6〜11% 程度になります（この割合は私の計算です）。

**長さを変えた比較で確認できたのは1件だけです。** SAC 論文は、前置する要約を約150文字と300文字で比べ、150文字を採用しました。150文字は英語でおおよそ30〜40トークンです（この換算は概算で、未確認）。

**文脈が長すぎると埋め込みが文脈に引っ張られる、という懸念は複数ありますが、どれも実測ではありません。**
- SAC の著者は、要約の信号がチャンク固有の関連性を覆い隠しうると述べている
- 2601.11863 の late fusion の実験では、メタデータ側の重みが大きすぎても小さすぎても性能が落ち、0.3〜0.6 程度が最良だった（重みの実験で、文の長さの実験ではない）
- 文脈の長さだけを変えて評価した研究は見つかっていない（未確認）

**埋め込みモデルの入力上限との関係**
- OpenAI の text-embedding-3 は 8192 トークン（公式文書で確認）。bge-large-en-v1.5 は 512 トークン（Databricks の文書の引用で確認）
- 上限が 512 のモデルでは、文脈を足したぶんだけチャンクの末尾が切り捨てられる
- Gomm らの表検索の実験では、行を増やすと jina-v2-base の性能が落ち、gte-large は上がり続けた。入力が長いときに強いかどうかはモデルで違う

**スライドでの言い方の提案**：「50〜100トークンは実績値であって最適値ではない。チャンクより十分短く（目安として1〜2割以下）、上限 512 のモデルでは特に注意。最終的には自分のデータで評価する」

---

## D. メタデータを「本文に混ぜる」か「フィルタに分ける」かの判断基準

| 判断軸 | 本文に混ぜる（埋め込みに入れる） | フィルタ用の別フィールドにする |
|---|---|---|
| 質問文に自然に出てくるか | 出てくる（会社名、製品名、年度、章名）。2601.11863 では会社名と年が最も効いた | 出てこない（ファイルサイズ、更新日時、ID） |
| 値の性質 | 意味のある語（文書タイトル、セクションのパス） | 列挙値や範囲で絞る値（部門、言語、日付、文書種別） |
| 似た文書の取り違え | 多いなら文書を識別する文脈を足す（SAC、CCH） | 確実に分けられるなら事前フィルタ。ただしフィルタが強すぎると再現率が下がる（2510.24402 で F1 が 38.9 → 37.3） |
| 誤った手がかりになる恐れ | ファイル名や型番の羅列は、質問中の型番と表面的に一致して別文書を引き寄せやすい | ファイル名はフィルタ用か、表示・出典用に回す |
| ツールでの設定 | LlamaIndex は `excluded_embed_metadata_keys` から外す。Bedrock は `includeForEmbedding:true` | LlamaIndex は除外キーに入れる。Bedrock は既定の簡略形式（フィルタのみ） |
| LLM に渡すか | 埋め込みと LLM への入力を分けて考える。LlamaIndex は `excluded_llm_metadata_keys`、Bedrock は前置した文字列を検索結果の本文に含めない | 出典表示に使う |

---

## E. スライド構成案（3枚）

**スライド1「文脈は“何を付けるか”で効き方が変わる」**
- lead：Anthropic は LLM 生成の文脈で検索失敗率を最大67%減らしたが、タイトルなど機械的に付けるヘッダでも大きく伸びる例がある
- 本体：
  - 左：LLM 生成の説明（Anthropic）
  - 右：機械的なヘッダ（dsRAG の CCH、Bedrock の includeForEmbedding、LlamaIndex の metadata_template）
  - 下：コストと適用範囲の比較
- グラフ化できる数値：
  - Anthropic の失敗率 5.7 → 3.7 → 2.9 → 1.9%（棒グラフ）
  - KITE 平均 4.72 → 6.04 → 8.42（ベンダー値と明記）
  - 2601.11863 の Context@5 33.33 → 55.00 / 63.33（第三者）

**スライド2「表は“ヘッダを毎回付ける”“1行1レコード”」**
- lead：表は分割すると列名が消える。ヘッダを繰り返すか、「列名: 値」に直すと、各チャンクが単独で読める
- 本体：B 節の変換前・変換後の例2つ。主要ツールの既定動作（Docling と Unstructured はヘッダ繰り返し、AWS は1行1レコード、Azure は Markdown の表）
- グラフ化できる数値：
  - 筆者の FMEA 実測 2/8 → 7/8
  - 参考：Markdown-KV 60.7% と CSV 44.3%（LLM 読解の値と注記）
  - 注記：「埋め込み検索では形式の優劣がモデルに依存する（2604.24040、TEmBed-T）」

**スライド3「メタデータは“混ぜる／分ける”を選ぶ。ファイル名は要注意」**
- lead：見出しにファイル名を使うと逆効果になることがある。質問に出る語は本文へ、絞り込む値はフィルタへ
- 本体：D 節の判断表を簡略化したもの。筆者の実測（ファイル名 34 / タイトル 38 / 両方 37 問、全48問）。外部の傍証（LlamaIndex は file_name を既定で埋め込みから除外、dsRAG はファイル名ではなく LLM 生成のタイトルを使う、SAC の注意点）
- グラフ化できる数値：
  - 筆者の 34 / 38 / 37
  - 2510.24402 の F1：標準 38.9、前置 44.1、フィルタ追加 37.3（標準チャンク）
  - SAC の DRM：95%超 → 19.29%

---

## F. 未確認・注意点

**筆者の実測と外部報告の関係**
- ファイル名と文書タイトルを見出しとして比べた外部の実測は見つからなかった（未確認）
- 整合する傍証は3つある：
  - LlamaIndex の既定は file_name を埋め込みから除外する（ただし file_path は残るので、パスに型番が含まれていれば同じ問題が起こりうる）
  - dsRAG は LLM にタイトルを生成させている
  - 2601.11863 は、識別力の強い項目（会社名・年）が検索を左右すると示している
- FMEA の改善（2/8 → 7/8）は、「列名と値の組を単位にする」方向（TableRAG、Docling のトリプレット、AWS）と整合する。一方、埋め込み検索での形式比較は「常に最良の形式はない」という結果が多い。8問という小さい評価での結果だと明記するのがよい

**資料ごとの注意**
- Anthropic・dsRAG・各ツールの値はすべてベンダーの自己申告。KITE は50問、筆者の実測は48問で、どちらも小規模
- Table Meets LLM と ImprovingAgents は LLM の読解の評価で、埋め込み検索の評価ではない。スライドでは区別すること
- 確認できなかったこと：
  - Docling のトリプレット形式の正確な文字列
  - Unstructured の repeat_table_headers が入ったバージョン
  - Azure の表チャンクでヘッダが繰り返されるか
  - Pinecone・Weaviate・Elastic が「タイトルを前置せよ」と明言しているか（Pinecone の chunking 記事は Anthropic 方式の紹介のみで、メタデータは主にフィルタ用と説明）
- Gomm らの「メタデータを入れると recall@3 が 0.42 上がる」（FeTaQA）は、基準値が書かれておらず、絶対値の差か比率かが不明。使わないのが無難
- 文脈の長さだけを変えた検索評価は、SAC の 150文字と300文字の比較以外に見つからなかった。「長すぎると文脈に引っ張られる」は仮説として扱う

**主な出典**：[Anthropic](https://www.anthropic.com/news/contextual-retrieval)、[dsRAG](https://github.com/D-Star-AI/dsRAG)、[CCH ノートブック](https://github.com/NirDiamant/RAG_Techniques/blob/main/all_rag_techniques/contextual_chunk_headers.ipynb)、[arXiv:2601.11863](https://arxiv.org/html/2601.11863)、[arXiv:2510.24402](https://arxiv.org/html/2510.24402v1)、[arXiv:2510.06999](https://arxiv.org/html/2510.06999v1)、[LlamaIndex](https://developers.llamaindex.ai/python/framework/module_guides/loading/documents_and_nodes/usage_documents/)、[AWS CSV](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-metadata.html)、[AWS S3 metadata](https://docs.aws.amazon.com/bedrock/latest/userguide/s3-data-source-connector.html)、[Docling](https://docling-project.github.io/docling/concepts/chunking/)、[Unstructured ソース](https://github.com/Unstructured-IO/unstructured/blob/main/unstructured/chunking/dispatch.py)、[Azure DI](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/concept/retrieval-augmented-generation)、[Azure Enrichment](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/rag/rag-enrichment-phase)、[Table Meets LLM](https://arxiv.org/html/2305.13062v5)、[TableRAG](https://arxiv.org/html/2410.04739v3)、[arXiv:2604.24040](https://arxiv.org/html/2604.24040v1)、[TEmBed-T](https://arxiv.org/html/2607.24130v1)、[ImprovingAgents](https://www.improvingagents.com/blog/best-input-data-format-for-llms)、[Gomm](https://www.daniel-gomm.com/blog/2025/Table-Serialization-Kitchen)、[OpenAI Embeddings](https://developers.openai.com/api/docs/guides/embeddings)
