# Research enterprise-wide RAG cases

## 依頼内容

You are a research assistant. Respond in Japanese. Today is 2026-11-14.

Question: How have real organizations built company-wide / general-purpose enterprise RAG (search + LLM answers over many heterogeneous internal data sources), and how did they overcome the problem that "one uniform index schema + one reranker + one chunking strategy for all data sources" does not work? We want concrete, verifiable case studies with architecture decisions and, where published, numbers.

Cover (verify each with primary sources: engineering blogs, papers, official docs; give URLs; do not invent):
1. Product/platform architectures: Glean (connectors per source, permission-aware index, knowledge graph / personalization signals, hybrid ranking), Microsoft 365 Copilot (semantic index, Microsoft Graph, grounding), Dropbox Dash, Atlassian Rovo, Amazon Q Business, Google Agentspace / Vertex AI Search, Notion AI, Slack AI. Focus: per-source handling, federated vs centralized index, query routing, ACL, freshness, ranking/personalization.
2. In-house engineering case studies with published details: e.g. Uber (Genie, Enhanced Agentic RAG / EAg-RAG), LinkedIn (knowledge-graph RAG for customer service, SIGIR 2024 paper with reported resolution-time reduction), DoorDash, Ramp, Thomson Reuters CoCounsel, Bloomberg, Vimeo, Shopify, Instacart, Pinterest (text-to-SQL / table retrieval), Airbnb, Grab, Spotify, Stripe. Japanese companies if public: e.g. NTT Data, Fujitsu (knowledge graph enhanced RAG), Hitachi, LayerX, Mercari, Sansan, Ricoh, Panasonic Connect (ConnectAI), Kakaku.com, SmartHR. Prioritize those that explain how they handled heterogeneous data (tables, manuals, tickets, code, PDFs), routing between specialized indexes/tools, evaluation per domain, and feedback loops.
3. The shift toward agentic / federated retrieval: agents calling specialized search tools per source (MCP servers, per-source APIs) instead of one central vector index; e.g. coding agents using grep/file tools instead of embeddings (Anthropic Claude Code, Cursor statements), Glean/Microsoft agent frameworks. What tradeoffs are reported (latency, cost, recall, permission handling)?

Output: a structured report (~4000-6000 Japanese characters): for each case: who, what problem, architecture choices relevant to "使い分け" (per-source indexes, routing, rerankers, metadata/ACL, knowledge graphs, evaluation), reported results with numbers and conditions, and source URL. End with a synthesis: recurring patterns that let organizations succeed with company-wide RAG (e.g., domain-scoped "verticals" first, router + specialized retrievers, permission-aware ingestion, evaluation per use case), plus clearly-labeled uncertainties. Mark anything you could not verify.

## 結果

# 全社横断RAG：データソース別の扱い方（事例調査、2026-11-14時点）

## 要約
今回確認できた事例は、「全ソースを1つのスキーマ・1つのリランカー・1つのチャンク戦略で扱う」設計をそのまま本番に出していません。各社の解決策は次の4つに収束しています。

- **取り込み側をソース別に作る**：コネクタ、ACL、鮮度管理、パーサをソースごとに用意する。
- **用途を絞った「縦割り」から始める**：ドメインごとにゴールデンセットを作って評価する。
- **検索を多段にする**：クエリ書き換え → ソース選択 → ハイブリッド検索 → 後処理。
- **索引の持ち方をソースごとに決める**：「中央索引（synced）」と「連合検索（federated、MCPやソースのAPIで都度取得）」を、ソースごとに使い分ける。

---

## 1. 製品・プラットフォーム

**Glean**
- **ソース別の扱い**：100以上のコネクタ（最新の自社記述では250以上）がソースごとに内容・アクティビティ・ID・権限を取り込み、Enterprise Graph（人・コンテンツ・活動の関係）に統合する。アクセス方式は「indexed / live-retrieval / hybrid」から選べる。
- **ランキング**：ベクトル＋キーワード＋パーソナライズのハイブリッド。キーワード検索はSlackのタイトルなし短文向けに作り直したとしている。顧客ごとに社内用語へ適応した言語モデルを作る。
- **数値（ベンダー自己申告）**：「導入6か月で検索品質が通常20%向上」。エージェント型推論（plan → permission-awareな検索 → 生成＋自己評価）で「応答・アクションの関連度が24%向上（初期研究）」。
- 出典
  - https://docs.glean.com/connectors/connectors-power-glean
  - https://www.glean.com/blog/enterprise-ai-search-rag
  - https://www.glean.com/blog/unlocking-the-power-of-vector-search-in-enterprise
  - https://www.glean.com/blog/a-complete-guide-to-agentic-reasoning

**Microsoft 365 Copilot**
- **2層の意味索引**：テナント層（SharePoint）と、ユーザー個別層（メール、共有・コメント・メンションされた文書）。Graphの活動シグナルで関連度を補正する。Graphへの問い合わせは利用者の権限内に限られる。
- **外部データは2方式**：
  - Synced connectors：Graphに取り込み、意味索引の対象にする。スキーマはexternalItemで定義。
  - Federated connectors：MCPで都度取得する。索引はなく、ユーザー資格情報で動き、スキーマはMCPツール側で決まる。用途は「動的なデータ、またはソースに留めるべき規制対象データ」とされている。
- **Retrieval API**：Copilotと同じハイブリッド索引からチャンクを返す。KQLでURL・日付・ファイル種別に絞り込める。
- **注意点**：federated MCPコネクタが呼ばれるかどうかはCopilotのオーケストレーション次第で、確実には呼ばれないという報告がQ&Aにある。
- 出典
  - https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/overview-copilot-connector
  - https://learn.microsoft.com/en-us/microsoft-365/copilot/connectors/federated-connectors-overview
  - https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/api/ai-services/retrieval/overview
  - 2層索引の説明（Microsoft公式動画）：https://www.youtube.com/watch?v=Ii3l13nx9n4

**Google Gemini Enterprise（旧Agentspace）/ Vertex AI Search（現Agent Search）**
- 公式ドキュメントが方式ごとのトレードオフを明記している。
  - federation：コピー不要だが、索引がないため検索品質は下がりうる。
  - ingestion：品質は上がるが、容量と時間を消費する。
- ソースのエンティティ種別ごとに別のデータストアを作る（例：Jiraのissue / comment / worklog）。異種データを1スキーマに押し込まない設計が、製品仕様になっている。
- 連合検索では、クエリ文字列が第三者のバックエンドに送られる点がプライバシー上の注意事項として書かれている。
- 出典：https://docs.cloud.google.com/gemini/enterprise/docs/connectors/introduction-to-connectors-and-data-stores

**Amazon Q Business**
- 40以上のコネクタ。ACLは文書と一緒に索引化され、回答時にフィルタされる。ACLなしで索引化した文書は「公開」扱いになる。一度有効にしたACLクロールは原則として無効化できない。
- 2025年8月にAgentic RAGを追加（クエリ分解、並列検索、検索ツール呼び出し、自己批評と再検索）。
- 精度課題の原因はコネクタで、Intuitがカスタムメタデータで関連度を調整できなかった例などがあったとBusiness Insiderが報道している（二次情報）。
- 出典
  - https://docs.aws.amazon.com/amazonq/latest/qbusiness-ug/connector-concepts.html
  - https://aws.amazon.com/blogs/machine-learning/bringing-agentic-retrieval-augmented-generation-to-amazon-q-business
  - https://www.businessinsider.com/amazon-q-significantly-behind-rivals-accuracy-first-year-2025-10

**Dropbox Dash**
- 当初は、複数ソースを1つの統合索引にまとめ、その上にナレッジグラフ（人・活動・コンテンツ）を重ねて順位付けする構成だった。
- **数値**：95%超のクエリを1〜2秒以内に返すために、従来型IR＋オンザフライのチャンキング＋リランキングを採用。鮮度は定期同期とwebhookで保つ。
- **MCPの教訓**：ツールを足すほどツール定義がトークンを消費し、長時間ジョブで精度が落ちた（context rot）。そこで検索ツールをDashの検索システム1本に統合し、Dash MCPサーバーも「ツール1つ」で公開している。
- 出典
  - https://dropbox.tech/machine-learning/building-dash-rag-multi-step-ai-agents-business-users
  - https://www.dropbox.jobs/en/our-blog/tech-blog/how-dash-uses-context-engineering-for-smarter-ai

**Slack（AI / enterprise search）**
- 外部ソースのデータはSlack側に保存しない。パートナーの検索APIを使う「連合・リアルタイム」方式を選んでいる。
- 利点：最新の結果と、その時点の正しい権限がそのまま反映される。
- 社内データは、要求ユーザーのACLを使い、既存の取得ライブラリを再利用してLLMに渡す。
- 出典：https://slack.engineering/how-we-built-enterprise-search-to-be-secure-and-private

**Notion AI**
- 中央索引型。Q&Aの索引化は2経路。
  - オフライン：Sparkでチャンク化・埋め込み・一括投入。
  - オンライン：Kafkaでページ編集を1分以内に反映。
- Slack / Drive等のコネクタ分も、turbopufferに埋め込みとして保存する。
- **数値**：2年で規模10倍、コストは90%削減。
- 出典：https://www.notion.com/blog/two-years-of-vector-search-at-notion

**Atlassian Rovo**
- Teamwork Graphコネクタで外部データを「権限を保ったまま」グラフに取り込む。Forgeで自作コネクタも作れる。
- 権限同期の詳細や、ランキングの内部構造を説明した一次情報は見つからず、**未確認**。
- 出典：https://www.atlassian.com/blog/company-news/teamwork-graph-team-26

## 2. 社内構築の事例

**Uber Genie → EAg-RAG（セキュリティ・プライバシー領域）**
- **課題**：40以上のポリシー文書（主にPDF）で、SMEが作った100問以上のゴールデンセットに対して精度が不足した。
- **対策**
  - 取り込み：PDFパーサをやめてHTML化したGoogle Docsを使い、表を正しく抽出する。チャンクごとに要約・FAQ・キーワードのメタデータを付ける。
  - 検索前：Query Optimizer（曖昧なクエリの補完・分解）と、Source Identifier（対象文書群を絞り込む＝ルーティング）。
  - 検索：ベクトル検索と、メタデータを使うBM25の和集合。
  - 後処理：重複除去と、元文書内の順序での並べ替え。
- **数値**：許容回答率が相対27%増、誤った助言が相対60%減。
- 部品は他ドメインでも使えるよう、設定可能なコンポーネントにしてある。
- 出典：https://www.uber.com/us/en/blog/enhanced-agentic-rag

**LinkedIn（カスタマーサービス、SIGIR '24）**
- 過去チケットをフラットなテキストとして切らず、「チケット内部の構造＋チケット間の関係」を持つKGにする。
- 質問を解析してグラフクエリに変換し、部分グラフを取得する。うまくいかなければテキスト検索にフォールバックする。
- **数値**：MRRがベースライン比77.6%改善、BLEUが+0.32。約6か月の運用で、1件あたりの解決時間の中央値が28.6%短縮。
- 平均40h→15hという数値は二次まとめで確認したもので、論文本文では未照合。
- 出典：https://arxiv.org/abs/2404.17723

**Pinterest（Text-to-SQL：表データの検索）**
- 文書RAGとは別に、テーブル要約と過去クエリ要約の専用ベクトル索引を作る。索引化するのはtop-tierテーブルのみ。
- 検索で上位N件の候補を出し、LLMが上位K件を選ぶ。
- **数値**
  - テーブルのドキュメントを埋め込みに含めないと検索ヒット率40%、ドキュメントの重みを上げるとほぼ比例して最大90%。
  - 初回採用率は20%→40%超。
  - SQL作成タスクの速度は35%改善（タスク差を統制していない実データ）。
- 後年は社内のVector DB as a Serviceと、Analytics Agentに発展している。
- 出典
  - https://medium.com/pinterest-engineering/how-we-built-text-to-sql-at-pinterest-30bad30dabff
  - https://medium.com/pinterest-engineering/unified-context-intent-embeddings-for-scalable-text-to-sql-793635e60aac

**Grab（Hubble：データカタログ）**
- 検索を4種類に分けた。完全一致・部分一致が75%で、これはElasticsearchのままで十分。残り25%の曖昧な検索だけをLLM（HubbleIQ、Glean上に構築）に回す。
- GPT-4で表のドキュメントを生成してコンテキストストアを作った。
- **数値**：クリック率が82%→94%。
- 出典：https://engineering.grab.com/hubble-data-discovery

**DoorDash（Dasherサポート）**
- KB記事を使うRAGに、3つの仕組みを加えた。
  - 2段のガードレール：安価な浅いチェックの後にLLM評価。高度なモデルはコストと遅延が理由で不採用。
  - LLM Judge：5つの観点で品質を監視。
  - 改善パイプライン。
- **数値**：ハルシネーション90%減、重大なコンプライアンス問題99%減。
- 出典：https://careersatdoordash.com/blog/large-language-modules-based-dasher-support-automation

**Thomson Reuters（CoCounsel / Westlaw Deep Research）**
- 判例・法令・二次資料など文書種別ごとの専門エージェントを使い、計画・並列検索・停止基準を持つ。
- **二次情報のみ**（ZenMLのまとめ）。TRの一次技術記事は未確認。
- 出典：https://www.zenml.io/llmops-database/agentic-ai-for-legal-research-building-deep-research-in-westlaw-and-cocounsel

**国内**
- **パナソニック コネクト ConnectAI**
  - 段階的に対象を広げた：公開情報（約3,700ページ等）で試験運用 → 2024年4月から社外秘の品質管理文書（630件、11,743ページ）。引用元を表示し、社員評価は3.5/5。
  - 2026年7月発表：2025年度の削減時間は78.8万時間（総労働時間の3.4%）。今後はSFA/ERPの構造化データと連携するエージェントに進める。
  - 出典：https://news.panasonic.com/jp/press/jn240625-1 、 https://news.panasonic.com/jp/press/jn260729-1
- **富士通 ナレッジグラフ拡張RAG**
  - 規則・法令・マニュアル・映像からKGを自動生成し、LLMが参照できる量を1,000万トークン以上に広げると説明している。ログ分析版（KG拡張RAG for LA）もある。
  - 実運用での数値は未確認。
  - 出典：https://info.archives.global.fujitsu/jp/news/2024/06/4.html 、 https://blog.fltech.dev/entry/2025/06/02/kgla-ja
- **DeNA 社内AIヘルプデスク「Findout」**
  - LLMが0〜4点で採点し、3点以上を合格とする自動評価。本運用と実験を分けて管理している。
  - **数値**：検索件数5件/10件/20件で精度54%/61%/69%。最終構成は、上位100件をCohere Rerank 3.5で20件に絞り、階層チャンク（300/1200字）を使う。
  - 出典：https://engineering.dena.com/blog/2025/11/its-ai-journey-rag-tech
- **メルカリ**：GitHubとConfluenceのエンジニアリング知識をRAG化し、日英をまたいで回答させている。定量結果はなし。
  - 出典：https://engineering.mercari.com/en/blog/entry/20241202-6c83b3dd89

## 3. エージェント型・連合型の検索への移行とトレードオフ

- **Claude Code**：Boris Cherny氏（X、2026-02-01）の発言。「初期はRAG＋ローカルvector DBだったが、agentic search（grep/glob/read）のほうが概ね良く、よりシンプル。セキュリティ、プライバシー、鮮度、信頼性の問題もない」。
  - 出典：https://x.com/bcherny/status/2017824286489383315
- **Cursorの反論データ**：自社学習した埋め込みによる意味検索をgrepと併用すると、質問応答の精度が平均12.5%向上（モデルにより6.5〜23.5%）。差は大規模コードベースで大きい。
  - オンラインでのコード保持率+0.3〜2.6%という数値は二次まとめ経由。
  - 出典：https://cursor.com/blog/semsearch
  - 解釈：「埋め込みは不要」ではなく「規模と問いの種類で使い分ける」が妥当。
- **コスト**：Anthropicのマルチエージェント研究システムは、単一エージェント比で社内評価90.2%向上。一方、トークン消費はチャットの約15倍（単一エージェントは約4倍）。
  - 出典：https://www.anthropic.com/research/multi-agent-research-system
- **報告されているトレードオフ**
  - 連合型（MCPやソースAPI）：
    - 長所：鮮度が高く、権限がソース側でそのまま効き、データを複製しない（Slack、MS federated）。
    - 短所：
      - 横断ランキングが難しく品質が下がりうる（Google）。
      - 遅延が出やすい（Dropbox：外部API呼び出しで数秒超）。
      - ツール定義がコンテキストを圧迫する（Dropbox）。
      - クエリが第三者に流れる（Google）。
  - 中央索引型：
    - 長所：統合ランキングとグラフ由来のシグナルが使える（Glean、Dash）。
    - 短所：ACL同期と再索引化の運用負荷が重い。

## 4. 統合：全社RAGがうまくいく共通パターン

1. **ドメインを絞った縦割りから始める**：Uberはセキュリティ領域、パナソニックは品質管理、LinkedInはCSから始めた。ゴールデンセットとSMEの評価で関門を作り、その後に部品を横展開する。
2. **ルーター＋専門検索器**：ソース選択（Uber）、クエリ種別による振り分け（Grab）、表専用の索引（Pinterest）、エンティティ別データストア（Google）、文書種別エージェント（TR）。
3. **ソース別の取り込み品質が最大の効き所**：表の抽出（Uber）、表ドキュメントの有無でヒット率40%↔90%（Pinterest）、ドキュメント生成（Grab）。リランカーより前の段階が支配的。
4. **権限を考慮した取り込み**：ACLを索引時に持つ（Q、Glean、Rovo）か、問い合わせ時にユーザー資格情報で取得する（Slack、MS federated）。
5. **索引方式のハイブリッド**：静的な知識はsynced、動的・規制対象のデータはfederated。エージェントに渡すツールは少数に統合する（Dash）。
6. **評価とフィードバックの常設**：LLM Judge（DoorDash、DeNA）、ユースケース別の指標、利用データによる継続学習（Glean）。

## 5. 不確実性・未確認事項
- **未調査・未確認**：Ramp、Bloomberg、Vimeo、Shopify、Instacart、Airbnb、Spotify、Stripe、NTTデータ、日立、LayerX（Temporal KGのPoC記事のみ確認）、Sansan、リコー、価格.com、SmartHR については、今回の調査範囲では一次情報を確認できていない。
- **ベンダー自己申告**：Glean（20%、24%）、富士通、パナソニックのACL 2024関連技術の数値は、評価条件が公開されていない。
- **二次情報**：Thomson Reuters、LinkedInの平均解決時間、Cursorのオンライン指標、Amazon Qの初期精度問題は二次情報で、一次ソースでは照合していない。
- **評価条件の違い**：各社の改善率は、ベースライン・評価セット・期間がそれぞれ異なり、横並びで比較できない。
