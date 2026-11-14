# Research RAG anti-patterns evidence

## 依頼内容

You are a research assistant. Respond in Japanese. Today is 2026-11-14.

Goal: build an evidence-backed catalogue of ANTI-PATTERNS in RAG / Advanced RAG, for a training deck aimed at a new tech lead. We need anti-patterns at three levels, each with (a) the anti-pattern, (b) why it fails (mechanism), (c) evidence (paper, engineering blog, practitioner report, Thoughtworks Technology Radar "Hold" items, vendor docs) with URLs, (d) the recommended alternative. Do not invent sources; verify by fetching; mark uncertainty.

Levels:
1. Data / ingestion / index design: e.g. one uniform schema/index for all heterogeneous sources; uniform fixed-size chunking; vector-only search; embedding tables/spreadsheets as text; ignoring document structure and metadata; mixing generated summaries with evidence; no versioning/ACL in index; treating aggregation/enumeration questions as top-k retrieval (text-to-SQL vs RAG); ignoring OCR quality.
2. Retrieval / ranking / generation: e.g. one general-purpose reranker for all domains (domain mismatch; BRIGHT benchmark showing rerankers can hurt), too large/small top-k, stuffing long context (lost in the middle), LLM-as-judge without calibration, agentic loops for every query, query rewriting that drops constraints, GraphRAG for everything (cost of indexing).
3. System / organization / scale: e.g. "build one company-wide RAG platform first" big-bang; centralizing all data into one vector DB vs federated/agentic retrieval; no per-use-case evaluation set; optimizing average metrics; ignoring cost of re-indexing at scale; multi-tenant ACL post-filtering; no feedback loop; choosing vector DB before understanding queries; prompt injection via retrieved docs (PoisonedRAG etc.); treating RAG as a model problem rather than a search/data problem.
Also look for scale-related evidence: how retrieval quality degrades as corpus size grows (e.g., papers on retrieval performance vs corpus size, "the more documents the worse" findings, ANN recall at scale, distractor effects), and reports like "RAG Does Not Work for Enterprises" (arXiv 2406.04369), NVIDIA "FACTS About Building Retrieval Augmented Generation-based Chatbots" (arXiv 2407.07858), "Seven Failure Points" (CAIN 2024), Google "Sufficient Context" (ICLR 2025), Databricks/Anyscale/Pinecone/Vespa/Elastic engineering posts on enterprise RAG lessons, Thoughtworks Radar entries about RAG (e.g., "naive RAG", "vector databases as default", "GraphRAG"), and statements from vendors about moving from embeddings to agentic search for code (e.g., Anthropic Claude Code, Cline, Cursor).

Output a structured report (~5000-7000 Japanese characters) grouped by the three levels, each anti-pattern in the (a)-(d) format with source URLs and any numbers with their conditions. End with 5-7 "rules of thumb" that a tech lead can state confidently, each tied to evidence.

## 結果

# RAG / Advanced RAG アンチパターン集（新任テックリード研修用）

調査日は 2026-11-14 です。URL はすべて実際に取得して中身を確認しました。【未検証】【二次情報】と付けた箇所は根拠が弱いという意味です。

**先に要点:** 確認できた範囲では、Thoughtworks Radar に「naive RAG」「vector DB をデフォルトにする」という Hold 項目はありませんでした。RAG 関連で見つかった Hold は Vol.33 の **Text to SQL** だけです。「GraphRAG = Hold」も誤りで、GraphRAG は Vol.32（2025年4月）で **Trial** です。研修資料にこの3つを Hold として載せないでください。

---

## レベル1: データ・取り込み・インデックス設計

### 1-1. 性質の違うソースを、1つのスキーマ・1つのインデックス・1つの埋め込みに押し込む
- **(b) なぜ失敗するか:** 表・スライド・コード・FAQ はそれぞれ「何を関連とみなすか」が違います。単一の埋め込み空間で扱うと、ある種類には効いても別の種類では崩れます。
- **(c) 根拠:**
  - NVIDIA FACTS（3つの社内チャットボット構築経験）は「構造化・非構造化・半構造化（スライド、表など）のデータにはマルチモーダルなリトリーバが必要」と書いています。https://arxiv.org/html/2407.07858v1
  - Seven Failure Points は「マッチの質はドメイン依存」と述べています。https://arxiv.org/html/2401.05856v1
- **(d) 代替案:** ソースの種類ごとにパイプラインを分けます（パーサ、分割方法、検索方式）。その上にルーティング層を置きます。

### 1-2. どの文書も固定長で一律に分割し、それで終わりにする
- **(b) なぜ失敗するか:** 分割すると、文書のどこにある話か（見出し・ファイル名など）が失われ、チャンク単体では意味を取り違えます。逆に「意味単位で分割すれば良くなる」とも限りません。
- **(c) 根拠:**
  - Anthropic Contextual Retrieval：各チャンクに前後の文脈を付けて埋め込むと、top-20 の検索失敗率が 5.7%→3.7%（35%減）。BM25 を併用すると 2.9%（49%減）、さらに rerank を足すと 67%減。条件は Anthropic 社内の評価セット。https://www.anthropic.com/news/contextual-retrieval
  - 一方で「Is Semantic Chunking Worth the Computational Cost?」は、意味単位分割の計算コストに見合う一貫した改善はないと結論しています。https://arxiv.org/abs/2410.13070
  - NVIDIA FACTS は、品質への影響が最も大きい工程として「メタデータ付与・分割・クエリ言い換え・rerank」を挙げ、チャンクサイズはグリッドサーチで決めたと報告しています。
- **(d) 代替案:** 分割方式を凝るより、チャンクに見出しや文脈を付ける方が効きます。チャンクサイズは評価セットで探索して決めます。

### 1-3. ベクトル検索だけに頼る（BM25 を持たない）
- **(b) なぜ失敗するか:** 型番・固有名詞・完全一致が必要なクエリに弱いです。埋め込みの次元数によって、表現できる top-k の組み合わせに理論上の上限もあります。
- **(c) 根拠:**
  - Google DeepMind の LIMIT 論文：単純なクエリでも最先端の埋め込みモデルが失敗します。https://arxiv.org/abs/2508.21038
  - Thoughtworks Radar Vol.30 の ESRE の項目：全文検索とベクトル検索を組み合わせたハイブリッドの方が良い結果になりうる、と書かれています。https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2024/04/tr_technology_radar_vol_30_en.pdf
- **(d) 代替案:** ハイブリッド検索（BM25 ＋ dense）＋ rerank を初期構成にします。

### 1-4. 集計・列挙系の質問（「件数は？」「全部挙げて」）を top-k 検索で答えようとする
- **(b) なぜ失敗するか:** top-k は「上位 k 件の抜き出し」なので、網羅性が必要な質問には構造的に答えられません。ただし、直すために text-to-SQL を無監督で使うのも危険です。
- **(c) 根拠:**
  - GraphRAG 論文：コーパス全体を問う「global」な質問では RAG は失敗する、と明記しています。https://arxiv.org/abs/2404.16130
  - Thoughtworks Vol.33（2025年11月）は **Text to SQL を Hold** にしました。監督のない用途では誤った SQL を生成しやすいためで、生成したクエリはすべて人がレビューすること、セマンティックレイヤー（Cube、dbt）経由にすることを推奨しています。https://www.thoughtworks.com/content/dam/thoughtworks/documents/radar/2025/11/tr_technology_radar_vol_33_en.pdf
- **(d) 代替案:** 質問をまず分類します。集計系はセマンティックレイヤーや構造化 API へ、要約系は GraphRAG / LazyGraphRAG へ、事実の参照は RAG へ振り分けます。

### 1-5. 表やスキャン PDF をそのまま OCR してテキストとして埋め込む
- **(b) なぜ失敗するか:** OCR の誤り（意味のノイズ）と、表の構造が崩れること（書式のノイズ）が、検索と生成の両方に連鎖して効きます。
- **(c) 根拠:** OHRBench（8,561 の文書画像、7ドメイン）：知識ベース構築に十分な品質の OCR は1つもありませんでした。ノイズが増えるほど RAG の性能は下がります。https://arxiv.org/abs/2412.02592
- **(d) 代替案:** 取り込み時に品質ゲートを設けます。構造を保つパーサを使うか、ページ画像のまま検索する方式（ColPali 系）を使います。目次構造をたどる検索（Thoughtworks Vol.34 の PageIndex、Assess）も選択肢です。

### 1-6. メタデータ・バージョン・有効期間をインデックスに持たない
- **(b) なぜ失敗するか:** 古い規程と新しい規程を区別できず、両方を根拠にして矛盾した回答を出します。
- **(c) 根拠:**
  - Seven Failure Points：ファイル名とチャンク番号をコンテキストに加えたら精度が上がった、と報告しています。
  - Thoughtworks Vol.34 は Graphiti を Trial にしました。理由は「フラットなベクトルストアは事実の変化を追えない」ことで、Graphiti は古い事実を上書きせず無効化します。
  - OWASP LLM08:2025 は「複数ソースの矛盾」をリスクとして挙げています。https://genai.owasp.org/llmrisk/llm082025-vector-and-embedding-weaknesses/
- **(d) 代替案:** 版・有効期間・所有者・機密区分を必須のメタデータにします。古い版は削除せず、無効フラグを立てる方式にします。

### 1-7. LLM が生成した要約と原文の根拠を、区別せず同じインデックスに混ぜる 【根拠は間接的】
- **(b) なぜ失敗するか:** 要約を引用元として返すと、要約時の誤りがそのまま「根拠」として扱われ、出典をたどれなくなります。
- **(c) 根拠:** これを直接検証した論文は見つかっていません。GraphRAG はコミュニティ要約を事前生成する設計で、要約層と原文層を分けています。そこからの推論です。
- **(d) 代替案:** 要約は「探すための入口」として使い、引用は必ず原文のチャンクにします。

---

## レベル2: 検索・ランキング・生成

### 2-1. 汎用の reranker を1つ、全ドメインで使い回す
- **(b) なぜ失敗するか:** MS MARCO（一般的な Web 検索データ）で学習した cross-encoder は、推論が必要な検索や専門ドメインに転移しません。
- **(c) 根拠:**
  - BRIGHT（ICLR 2025、12データセット）：MiniLM cross-encoder で rerank すると性能が**下がりました**。nDCG@10 は BM25 単体 14.3 → rerank k=10 で 13.1、k=100 で 8.3。GPT-4 による rerank は +3.1 改善。また MTEB 首位の SFR-Embedding-Mistral（MTEB 上 59.0）が BRIGHT では 18.3 でした。https://arxiv.org/abs/2407.12883
  - Drowning in Documents（Databricks 系の著者ら、SIGIR 2025 ReNeuIR）：rerank する文書数を増やすと最初は改善し、やがて悪化します。https://arxiv.org/abs/2411.11767
- **(d) 代替案:** reranker はドメインごとの評価セットで比較して選びます。何件を rerank するかもチューニング対象にします。

### 2-2. top-k を大きくするほど良い、長いコンテキストに詰め込めば良いと考える
- **(b) なぜ失敗するか:** 中央に置かれた情報は読まれにくく（lost in the middle）、正解を含まないのに関連しそうに見える文書（hard negative）が LLM を誤らせます。
- **(c) 根拠:**
  - Lost in the Middle（TACL 2023）：関連情報が入力の中央にあると性能が大きく下がります。https://arxiv.org/abs/2307.03172
  - Google（Jin ら 2024）：取得する文章数を増やすと、生成品質はいったん上がってから下がります。主因は hard negative です。https://arxiv.org/abs/2410.05983
  - Power of Noise：スコアは高いが答えを含まない文書が精度を下げます。逆に、ランダムな文書を加えると最大 35% 改善した、という直感に反する結果もあります。https://arxiv.org/abs/2401.14887
  - Databricks：性能のピークは gpt-4-turbo で 16k、Llama-3.1-405b で 32k 付近で、そこを超えると下がります。新しいモデルほど劣化は小さくなっています。https://www.databricks.com/blog/long-context-rag-performance-llms
  - Chroma「Context Rot」：18 モデルすべてで、入力が長くなるほど信頼性が下がりました。https://research.trychroma.com/context-rot
- **(d) 代替案:** k はモデル × タスクごとに評価して決めます。rerank で絞ってから渡し、重要な文書は先頭か末尾に置き直します。

### 2-3. 検索で十分な情報が取れなくても、LLM に答えさせる
- **(b) なぜ失敗するか:** 大きなモデルほど、情報が足りないときに「わかりません」と言わず、誤答を出します。
- **(c) 根拠:** Google「Sufficient Context」（ICLR 2025）：Gemini 1.5 Pro / GPT-4o / Claude 3.5 は、コンテキストが不十分なときに回答を控えず誤答しがちでした。コンテキストの十分性を使って回答を控える方式で、回答したケースのうちの正答率が 2〜10% 改善しました。https://arxiv.org/abs/2411.06037
- **(d) 代替案:** コンテキストが十分かを判定するステップと、回答を控える経路を設計に入れます。

### 2-4. LLM-as-judge を、人の評価と突き合わせずに使う
- **(b) なぜ失敗するか:** LLM の評価には、提示順（position）、回答の長さ（verbosity）、自分の出力を好む（self-enhancement）といったバイアスがあります。
- **(c) 根拠:** Zheng ら（NeurIPS 2023）：GPT-4 は人間と 80% 超で一致しましたが、上記バイアスがあると明記しています。https://arxiv.org/abs/2306.05685 ここでの「80%」は MT-Bench・Chatbot Arena という条件での数値です。
- **(d) 代替案:** 人がラベルを付けた少数のサンプルで judge との一致率を測ってから使います。回答の提示順を入れ替える評価も併用します。

### 2-5. どんなクエリにもエージェントの反復ループを使う
- **(b) なぜ失敗するか:** 単純な質問にもループを回すと、計算コストと遅延が無駄に増えます。
- **(c) 根拠:** Adaptive-RAG（NAACL 2024）：質問の複雑さを分類器で判定し、「検索なし／1回検索／反復検索」を切り替えると、効率と精度の両方が改善しました。https://arxiv.org/abs/2403.14403
- **(d) 代替案:** 複雑さでルーティングし、エージェントは複雑な質問だけに使います。

### 2-6. クエリ書き換えで、日付・否定・型番などの制約が落ちる 【未検証】
- **(b) なぜ失敗するか:** 言い換えの過程で条件が消えると、条件に合わない文書が検索されます。
- **(c) 根拠:** これを定量的に示した一次資料は見つかっていません。間接的な根拠として、NVIDIA FACTS がクエリ言い換えを品質に最も効く工程の1つに挙げ、Seven Failure Points が「否定や曖昧さを含むクエリの扱いが性能に大きく影響する」と述べています。
- **(d) 代替案:** 制約は自然文ではなく構造化フィルタとして抜き出して保持します。書き換え前後でクエリの差分を評価します。

### 2-7. 何にでも GraphRAG を使う
- **(b) なぜ失敗するか:** インデックス構築時に LLM でエンティティ抽出と要約を行うため、構築コストが非常に大きく、構築はバッチ処理で更新に弱いです。
- **(c) 根拠:**
  - Microsoft LazyGraphRAG：インデックス構築コストはベクトル RAG と同等で、**フル GraphRAG の 0.1%**。https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/
  - GraphRAG 論文で改善が示されたのは、約 100 万トークン規模のコーパスに対する「全体を俯瞰する質問」での網羅性・多様性です。
  - Thoughtworks Fast GraphRAG 記事：多くのユースケースでは複雑さに見合わない可能性がある、と書いています。https://www.thoughtworks.com/en-us/insights/blog/generative-ai/four-retrieval-techniques-improve-rag
  - 補足：GraphRAG は Radar Vol.32 で Trial であり、Hold ではありません。
- **(d) 代替案:** 全体要約の質問や関係をたどる質問に限って使います。まず LazyGraphRAG 型を検討します。

---

## レベル3: システム・組織・スケール

### 3-1. 「全社共通の RAG 基盤を最初に作る」ビッグバン方式
- **(b) なぜ失敗するか:** RAG の頑健性は運用しながら育つものです。ユースケースを特定しないと評価もできません。
- **(c) 根拠:**
  - Seven Failure Points（CAIN 2024）の2大教訓：「RAG システムの検証は運用中にしかできない」「頑健性は最初に設計し込むものではなく、育っていくもの」。https://arxiv.org/abs/2401.05856
  - Microsoft の Copilot 導入ガイダンス：まず小規模なパイロットから始め、ユースケースと成功指標を先に決めることを推奨しています。
- **(d) 代替案:** 価値の高いユースケースを 1〜2 個選んで縦に作り切り、そこで共通部品を見つけて切り出します。

### 3-2. 全データを1つのベクトル DB に集める（複製型の中央集約）
- **(b) なぜ失敗するか:** データの鮮度が落ち、再インデックスが必要になり、権限の二重管理やセキュリティ面の負担が生じます。
- **(c) 根拠:**
  - Boris Cherny（Claude Code 責任者）：「初期の Claude Code は RAG ＋ローカル vector DB だったが、agentic search の方が概して良かった。シンプルで、セキュリティ・プライバシー・鮮度・信頼性の問題もない」（2026年2月の X 投稿）。https://x.com/bcherny/status/2017824286489383315
  - Cline も「コードベースをインデックスしない」方針を公表しています。https://cline.bot/blog/why-cline-doesnt-index-your-codebase-and-why-thats-a-good-thing
  - Thoughtworks Vol.35 は、Microsoft Copilot Retrieval API（ユーザー権限に応じた検索結果の絞り込みを Microsoft 側が担う）を Trial にしています。
  - **反証:** Cursor は「grep だけでは不十分」として、grep に semantic search を加えると全フロンティアモデルでエージェントの精度が上がり、特に大規模コードベースで効くと報告しています（二次情報では平均 +12.5%）。https://cursor.com/blog/semsearch
- **(d) 代替案:** データは元のシステムに置いたまま検索するフェデレーション型や、エージェントによる検索を基本にします。インデックスは効果が測定で示された箇所に限って作ります。コード領域では「grep 系＋必要な所だけ semantic」のハイブリッドが妥当です。

### 3-3. 権限チェックを、検索結果に対する後段フィルタ（post-filter）だけで行う
- **(b) なぜ失敗するか:** 漏洩のリスクがあるうえ、条件が厳しいフィルタでは結果がほとんど残らず、recall が急落します。
- **(c) 根拠:**
  - OWASP LLM08:2025：マルチテナント環境で他グループの埋め込みが検索されるリスクを挙げ、権限を理解するベクトルストアと論理的なパーティション分割を推奨しています。
  - Weaviate ドキュメント：post-filter しかできないシステムには欠点があると説明しています。https://docs.weaviate.io/weaviate/concepts/filtering
  - Thoughtworks Vol.34：Role-based contextual isolation（インデックス時に権限タグを付け、検索段階で絞る）を Assess にしています。
  - Microsoft：Copilot は既存の権限を尊重するため、導入前に過剰共有の棚卸しが必要だとしています。https://learn.microsoft.com/en-us/sharepoint/data-access-governance-site-permissions-report
- **(d) 代替案:** 権限による絞り込みは、検索前（pre-filter）か検索中（in-graph）に行います。導入前に権限を棚卸しします。

### 3-4. ユースケースごとの評価セットを持たず、平均指標だけを見る
- **(b) なぜ失敗するか:** 平均値では、特定の種類の質問での大きな失敗が見えなくなります。
- **(c) 根拠:**
  - BRIGHT：MTEB 首位でも推論が必要な検索では 18.3 しか出ません。つまり公開ベンチの平均値は自社のクエリに当てはまらない可能性があります。
  - Sufficient Context：誤答を「コンテキストが十分だったか」で層別すると原因の切り分けができ、平均値ではそれが見えません。
  - NVIDIA FACTS は Testing を5本柱の1つにしています。
- **(d) 代替案:** ユースケース × 質問タイプ別のゴールデンセットを作り、層別の指標と最悪ケースを監視します。

### 3-5. コーパスが増えても品質が保てると考える
- **(b) なぜ失敗するか:** 文書が増えるほど、似ているが無関係な文書が上位に入り込みます。
- **(c) 根拠:**
  - Reimers & Gurevych（ACL 2021）：dense 検索は sparse 検索より速いペースでインデックス規模とともに劣化し、ある規模で BM25 に逆転されます（MS MARCO 880万件で 128 次元モデル MRR@10 15.71 対 BM25 17.56。この数値は二次サマリ経由）。https://arxiv.org/abs/2012.14210
  - Onyx（ベンダーブログ、単一データセット）：コーパスを 5k→510k に増やすと、Recall@10 は BM25 で 85.0→55.7%、dense で 81.3→40.7% に低下。recall は k/N で決まると主張しています。https://onyx.app/blog/retrieval-corpus-scaling
  - PoisonedRAG：数百万件の知識ベースに、1つの質問あたり 5 件の悪意あるテキストを入れるだけで、攻撃成功率 90%。https://arxiv.org/abs/2402.07867
- **(d) 代替案:** コーパスの一部で劣化曲線を測り、本番規模での品質を予測します。コーパス規模に応じて k を広げ、ハイブリッド検索にします。ソースの性質に応じてインデックスを分割します。

### 3-6. 検索された文書を「信頼できるデータ」として扱う
- **(b) なぜ失敗するか:** 取得した文書に紛れ込んだ命令文（間接プロンプトインジェクション）が、ツール呼び出しやデータ漏洩につながります。
- **(c) 根拠:**
  - Greshake ら：Bing Chat などの実システムで、取得データ経由の間接プロンプトインジェクションを実証しました。https://arxiv.org/abs/2302.12173
  - PoisonedRAG：既存の防御策では不十分と報告しています。
- **(d) 代替案:** 取り込むソースを認証します。取得した文書は権限を持たないデータとして扱い、ツール権限を最小にし、重要な操作には人の承認を挟みます。

### 3-7. クエリを理解する前に vector DB を選ぶ／RAG を「モデルの問題」とみなす
- **(b) なぜ失敗するか:** 失敗の多くは、検索とデータの問題です。
- **(c) 根拠:**
  - NVIDIA FACTS：「生成品質は検索の関連度に大きく依存し、検索の関連度はメタデータ・分割・言い換えに依存する」。
  - Thoughtworks Vol.32 は「RAG の R（検索）」を主要テーマにしています。
- **(d) 代替案:** まず実際のクエリログを分類します。そのうえで検索方式と保存基盤を決めます。

### 3-8. フィードバックループを持たない
- **(c) 根拠:** Seven Failure Points は「RAG は継続的な調整が必要」と述べ、Thoughtworks Vol.34 は Feedback flywheel を Techniques に載せています。
- **(d) 代替案:** 低評価の回答、検索ログ、回答を控えた件数を評価セットに戻す運用を回します。

### 参考：「RAG Does Not Work for Enterprises」（arXiv 2406.04369）
https://arxiv.org/abs/2406.04369 は、ベンダー（Strative.ai）に所属する著者1名による立場表明の論文です。実証データはないので、根拠としては弱い扱いにしてください。

---

## テックリードが自信を持って言える経験則

1. **「RAG の失敗は、まず検索とデータを疑う」** — NVIDIA FACTS、Seven Failure Points、BRIGHT。
2. **「初期構成はハイブリッド（BM25 ＋ dense）＋ドメイン別に検証した rerank」** — LIMIT、Reimers 2021、BRIGHT（汎用 cross-encoder は性能を下げた）、Anthropic（49%→67% の失敗削減）。
3. **「コンテキストは多いほど良いわけではない。k はモデル × タスクで測って決める」** — Lost in the Middle、Jin 2024、Databricks、Chroma。
4. **「質問タイプでルーティングする：集計は統制されたセマンティックレイヤー、全体要約は GraphRAG 系、事実参照は RAG、単純な質問にエージェントは使わない」** — GraphRAG 論文、Thoughtworks の Text to SQL Hold、Adaptive-RAG、LazyGraphRAG（構築コストはフル GraphRAG の 0.1%）。
5. **「権限は検索前に効かせ、取得した文書は信頼しない」** — OWASP LLM08、Thoughtworks Vol.34、Microsoft の過剰共有ガイダンス、PoisonedRAG（5件で成功率 90%）。
6. **「コーパスは育つほど劣化する。規模を変えて劣化を測ってから全量を投入する」** — Reimers 2021、Onyx。
7. **「全社基盤ではなく、1ユースケースの評価セットから始める。品質は運用で育てる」** — Seven Failure Points、Microsoft のパイロット推奨、Sufficient Context（層別評価）。

---

### 残っている不確実性
- 2-6（クエリ書き換えで制約が落ちる）と 1-7（要約と原文の混在）には、定量的な一次資料が見つかっていません。
- Cat Wu（Anthropic）の「継続的な再インデックスが大変」という発言は、GitHub の二次まとめでしか確認できていません。
- Cursor の +12.5% は二次情報で、ブログ本文の数値は未確認です。
- コード検索については、Anthropic・Cline（インデックス不要派）と Cursor（semantic 併用派）で見解が分かれています。研修では「論争中」と提示するのが正確です。
