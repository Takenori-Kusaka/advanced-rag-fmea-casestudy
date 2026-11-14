# Advanced RAG技術レポート

調査基準日：2026年11月13日  
対象：企業内文書・技術文書を中心としたRetrieval-Augmented Generationの設計、実装、評価、採用判断  
読者：ソフトウェアアーキテクト、検索・機械学習エンジニア、AIプロダクトの技術責任者

## エグゼクティブサマリー

Advanced RAGを理解するうえで重要なのは、「高度な検索方式のランキング」ではなく、失敗原因と対策の対応関係である。2026年刊行のサーベイはRAGを検索前・検索・検索後・生成の4段階で整理しており、2026年のAgentic RAG研究は、検索を推論中に制御する設計まで対象を拡張している。([Huang & Huang, ACM Computing Surveys](https://dl.acm.org/doi/10.1145/3805774)、[A-RAG](https://arxiv.org/html/2602.03442v1))

**本レポートの推奨は、構造を保つ文書取り込み、権限付きハイブリッド検索、再ランキング、原文に紐づく引用、評価基盤を先に整え、その後に用途別の高度化を加えることである。** この判断は、BM25と再ランキングの強いベースライン、GraphRAGのタスク依存性、高度なチャンク分割の非一貫な効果という異なる研究結果を総合したものだが、全組み合わせの優位性が単一実験で証明されているわけではない。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663)、[RAGSearch](https://arxiv.org/html/2604.09666)、[Beyond Chunk-Then-Embed](https://arxiv.org/html/2602.16974v1))

主要な結論は次のとおりである。以下の「推奨」は、引用した実験・文書を踏まえた本レポートの技術判断であり、Thoughtworks自身の判定ではない。

- **検索品質の基盤：** Dense検索のみを標準解とせず、語彙検索との補完と再ランキングを評価する。BEIRではBM25＋クロスエンコーダが18データセット中16でBM25を上回る一方、BRIGHTでは既存再ランキングモデルが性能を下げる例もあり、領域ごとの検証が必要である。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663)、[BRIGHT](https://arxiv.org/html/2407.12883))
- **文脈欠落への対策：** Contextual RetrievalやLate Chunkingは、チャンク単独では失われる意味を補える。ただし、2026年の比較研究では、文脈付き埋め込みがコーパス検索では有効でも文書内検索では不利になる結果があり、万能な前処理とはいえない。([Anthropic Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval)、[Late Chunking](https://arxiv.org/html/2409.04701)、[Beyond Chunk-Then-Embed](https://arxiv.org/html/2602.16974v1))
- **グラフの使い分け：** Microsoft GraphRAGのコミュニティ要約はコーパス全体の論点把握、HippoRAG 2やHopRAGは複数文書にまたがる関連経路の探索に向く。同じ「GraphRAG」という名称で、対象タスクもアルゴリズムも異なるものを一括評価しないことが重要である。([GraphRAG原論文](https://arxiv.org/html/2404.16130)、[HippoRAG 2](https://arxiv.org/html/2502.14802)、[HopRAG](https://arxiv.org/html/2502.12442))
- **Agentic RAGの本質：** 検索回数を増やすことではなく、検索語、粒度、読取範囲、停止条件をモデルに選ばせることにある。2026年のA-RAGは階層的な検索インターフェースを示し、AgenticRAGTracerは推論の早期終了と過剰延長を失敗原因として報告している。([A-RAG](https://arxiv.org/html/2602.03442v1)、[AgenticRAGTracer](https://aclanthology.org/2026.findings-acl.66/))
- **評価の重心：** 検索単体のベンチマークに加え、機械生成クエリ、大規模コーパス、途中ホップ、文書取り込みから回答までのエンドツーエンド測定が重視され始めている。ただし、ベンダーの非公開データ評価と、独立再現可能な公開ベンチマークは区別する必要がある。([Q2D-Web](https://www.perplexity.ai/hub/blog/q2d-web)、[AgenticRAGTracer](https://aclanthology.org/2026.findings-acl.66/)、[MLPerf End-to-End RAG](https://mlcommons.org/2026/08/endtoend-inference/))

## 調査範囲とエビデンスの読み方

### 対象と調査方法

本稿ではAdvanced RAGを、基本的な「質問を埋め込み、上位チャンクを渡して回答する」構成に対して、データ処理、検索、コンテキスト構成、推論制御、学習、評価・運用を改善する手法群と定義する。特定の製品カテゴリや単一アルゴリズムを指す用語としては扱わず、最新サーベイの段階別整理を、実装上のボトルネックに対応する形へ組み替えている。([ACM Computing Surveys](https://dl.acm.org/doi/10.1145/3805774))

調査では2026年を含む検索で候補を探索し、論文本文、学会掲載ページ、研究機関・開発元の一次資料の計38ページを取得した。本文取得後の要約と、抄録・公式紹介ページのみを確認できた資料を区別し、未確認の実験設定を補完していない。これは選択的な技術レビューであり、網羅的なシステマティックレビューや全手法の再実験ではない。

Thoughtworks Radarは「採用判断の表現形式」の参考とする一方、掲載されているという理由だけで性能の根拠にはしない。同社のRAG項目は2024年にAdoptとなり、再ランキングやハイブリッド検索にも言及しているが、記述は実務経験に基づくもので、統制実験の数値を提示したものではない。([Thoughtworks RAG](https://www.thoughtworks.com/radar/techniques/retrieval-augmented-generation-rag))

### 根拠の種類

| 表記 | 根拠の性質 | 読み方 |
|---|---|---|
| 学会・論文誌掲載 | 公式の掲載先を今回確認できた論文 | 査読・編集プロセスは有用な品質シグナルだが、実験の外的妥当性や独立再現性を保証しない |
| 論文本体 | arXiv等で本文・実験を確認 | 著者による報告として扱う。今回掲載先を確認できていないものを未査読と断定しない |
| 開発元評価 | 企業・開発者による実験 | 再現条件、データ公開、分布上の有利さ、利益相反を点検する |
| 公式仕様・実務報告 | 実装ドキュメント、導入経験 | 実現方法・運用知見の根拠。性能優位の証明には用いない |

この区分は情報の出所を示すもので、研究の優劣を自動的に序列化するものではない。掲載先の確認と、本文で実験条件まで確認できたかどうかも別の軸として扱う。

### 数字を比較する際の原則

- **Recall・nDCG：** 必要文書が候補に入るか、順位が適切かを測る。回答の正しさそのものではない。
- **EM・F1・回答正解率：** 指定された回答評価条件での性能である。Contain AccuracyやLLMによる意味的一致判定を、厳密なExact Matchと混同しない。
- **LLM選好勝率：** 2つの回答を評価者が比較した結果であり、事実正解率ではない。質問生成と評価の両方にLLMを使う場合は、その偏りも検討する。
- **相対改善とポイント差：** 失敗率5.7%から1.9%への変化は、絶対差3.8ポイント、相対減少約67%である。「回答精度67%向上」とは異なる。([Anthropic Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval))
- **実験条件：** 同じモデル・コーパス・検索件数・トークン予算・プロンプト・評価器で比較していない値を、単純な総合ランキングには使わない。

## 技術採用レーダー

以下は、企業内の権限制御された文書QAを標準的な想定用途とした本レポート独自の判定である。Adoptは標準設計に組み込む価値が高いもの、Trialは実データで限定導入すべきもの、Assessは投資対効果を研究・検証すべきもの、Holdは標準方針として避けるものを意味する。

| 判定 | 手法・設計 | 効果を期待する条件と根拠 |
|---|---|---|
| Adopt | 構造を保つ文書取り込み＋原文追跡 | 表・図・レイアウトを無視したテキスト化では失われる情報がある。抽出方式とページ画像検索を用途で分ける。([ACL 2026文書Multimodal RAGサーベイ](https://aclanthology.org/2026.acl-long.204/)) |
| Adopt | BM25＋Denseの併用評価 | 型番、固有名詞、自然言語の言い換えを含む検索を、単一表現に依存させない。実装候補として多機能検索を統合するBGE-M3もある。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663)、[BGE-M3](https://arxiv.org/html/2402.03216v2)) |
| Adopt | 候補検索と再ランキングの分離 | 広い候補集合から精密に選ぶ。ただし特定領域での逆効果を回帰評価で検出する。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663)、[BRIGHT](https://arxiv.org/html/2407.12883)) |
| Adopt | 引用検証と検索・回答の分離評価 | 正しく答えることと正しく引用することは別に測る。自動評価は人手ラベルで較正する。([ALCE](https://arxiv.org/html/2305.14627v1)、[ARES](https://arxiv.org/html/2311.09476)) |
| Adopt | ACL・出所・版を検索境界に組み込む | RAGには知識汚染の攻撃面があり、権限を無視した索引設計は避けるべきという設計判断。([PoisonedRAG](https://www.usenix.org/conference/usenixsecurity25/presentation/zou-poisonedrag)、[RAGセキュリティサーベイ](https://arxiv.org/abs/2608.24977)) |
| Trial | Contextual Retrieval | チャンクの企業名・時点・主題などが抜け落ちる文書に有望。改善値は開発元評価として扱う。([Anthropic](https://www.anthropic.com/research/contextual-retrieval)) |
| Trial | Late Chunking | コーパス検索でチャンク文脈を補いたい場合。文書内検索には不利になり得る。([Late Chunking](https://arxiv.org/html/2409.04701)、[2026年比較](https://arxiv.org/html/2602.16974v1)) |
| Trial | クエリ書換・HyDE・質問分解 | 質問と根拠文書の表現が離れる場合。生成した仮説は証拠と分離する。([HyDE](https://arxiv.org/html/2212.10496)、[BRIGHT](https://arxiv.org/html/2407.12883)) |
| Trial | RAPTOR／階層要約 | 長文の抽象的理解と具体的な根拠を両立したい場合。要約の誤りと更新波及に注意する。([RAPTOR](https://ar5iv.labs.arxiv.org/html/2401.18059)) |
| Trial | 用途限定GraphRAG | 全体要約ならコミュニティ要約、多段QAなら経路探索など、目的に合うグラフを選ぶ。([GraphRAG](https://arxiv.org/html/2404.16130)、[HippoRAG 2](https://arxiv.org/html/2502.14802)) |
| Trial | 予算制御付きAgentic RAG | 複数段の探索や読取粒度の選択が必要な質問。停止判断も評価対象にする。([A-RAG](https://arxiv.org/html/2602.03442v1)、[AgenticRAGTracer](https://aclanthology.org/2026.findings-acl.66/)) |
| Trial | ColPali系の視覚検索 | 図表・スライド・スキャンPDFが主対象。画像索引の容量も測る。([ColPali](https://arxiv.org/html/2407.01449)) |
| Trial | RAFT等の検索文脈利用学習 | 固定的な専門領域で、文書を与えてもモデルが使いこなせない場合。([RAFT](https://arxiv.org/html/2403.10131v1)) |
| Assess | Search-R1等のRL学習 | 独自の検索方策を学習する便益が、学習・更新費用を上回る場合。([Search-R1](https://ar5iv.labs.arxiv.org/html/2503.09516)) |
| Assess | 強いコンテキスト圧縮 | トークン削減が必要で、数値・否定・条件の脱落を検出できる場合。([LLMLingua-2](https://arxiv.org/html/2403.12968)) |
| Hold | 全問への無制限な反復検索・グラフ化 | 反復や構造化自体を目的にしない。一般QAでの非一貫な効果、前処理費用、停止失敗を考慮する。([RAGSearch](https://arxiv.org/html/2604.09666)、[AgenticRAGTracer](https://aclanthology.org/2026.findings-acl.66/)) |

## 全体像：失敗箇所から手法を選ぶ

### 処理レイヤーの対応関係

次の図は、本レポートの整理・設計モデルである。すべての経路を実装することを推奨するものではなく、基盤を共有したうえで必要な分岐だけを追加する考え方を示す。

```text
取り込み
  原本・権限・版・有効日
      ↓
  レイアウト解析 / OCR / ページ画像 / 表・コード構造
      ↓
  原文チャンク + 親文書 + 文・ページ位置
      ├─ 語彙索引 / Sparse索引
      ├─ Dense / Multi-vector索引
      └─ 任意: 階層要約 / エンティティ・関係グラフ

質問
  認証・権限・時点・タスク分類
      ↓
  通常検索 / 質問分解 / Agenticループ
      ↓
  候補統合 → 再ランキング → 原文拡張 → 重複除去
      ↓
  証拠選択・充足判定
      ├─ 不足: 再検索 / 許可された別データ源 / 棄権
      └─ 充足: 引用付き生成 → 主張・引用検証 → 回答

横断: 評価 / 監査 / コスト / 削除反映 / 攻撃耐性 / 観測性
```

| 観測される失敗 | 先に疑う箇所 | 優先的に試す手段 |
|---|---|---|
| 原本の表・注記が索引にない | 文書取り込み | レイアウト解析、表の構造保持、ページ画像検索 |
| 型番や契約条項を探せない | 候補検索 | BM25・Sparse併用、メタデータ条件 |
| 文書はあるが主語・時点が不明 | 表現・粒度 | 見出し付加、親子検索、Contextual Retrieval |
| 必要文書が候補内の下位にある | 順位付け | 領域に合う再ランキング、学習負例の改善 |
| 文書Aから文書Bへ辿れない | 探索 | 質問分解、グラフ探索、Agentic RAG |
| 根拠を渡しても誤答する | 読解・計算・生成 | 原文配置改善、計算ツール、回答モデル比較、RAFT |
| 回答は正しそうだが引用が違う | 主張と証拠の整合 | ALCE型の引用評価、文単位の証拠照合 |
| 更新前や権限外の内容が出る | 検索境界・派生データ管理 | 版・ACLを含む索引／キャッシュの失効設計 |

この表は診断のための仮説である。根拠が存在しない場合と、検索に失敗した場合と、取得済みの根拠を使えなかった場合を、同じ「RAG精度不足」にまとめないことが実装上の要点となる。

## 文書取り込み・チャンク・文脈表現

### 構造を残すことを高度化の出発点にする

文書RAGでは、OCRによる文字認識だけでなく、表の行列関係、図表とキャプション、段組み、見出しの階層が検索・読解に影響する。ACL 2026の文書Multimodal RAGサーベイは、OCRベース処理の構造情報損失と、ネイティブなマルチモーダルモデルのコンテキスト処理の課題を整理している。([Scaling Beyond Context](https://aclanthology.org/2026.acl-long.204/))

実務資料では、ThoughtworksはDoclingを2025年のAssessから2026年4月のTrialへ移し、デジタル・スキャンPDFの本番規模処理の経験を記している。ただし、同ページには比較可能な精度・遅延の数値がないため、本稿では製品の性能優位ではなく、構造化取り込みを試す実務的根拠として扱う。([Thoughtworks Docling](https://www.thoughtworks.com/en-cl/radar/languages-and-frameworks/docling))

実装上は、本文だけを保存するのでなく、`document_id`、`version`、`page`、`section_path`、`parent_id`、原文オフセット、ACL、有効日を共通メタデータにすることを提案する。これにより、検索用表現と実際に引用する原文を分離し、後段で原文に戻れる構成にする。

### チャンクサイズに普遍的な正解はない

2026年のBeyond Chunk-Then-Embedは、6種の分割法、4種の埋め込みモデル、文書内検索とコーパス検索を比較している。コーパス検索では単純な段落分割が複数モデルで強く、文書内検索ではLLMによる話題分割が強いという異なる結果になり、「Semantic Chunkingを導入すれば改善する」という一般化を支持しない。([Beyond Chunk-Then-Embed](https://arxiv.org/html/2602.16974v1))

設計としては、小さな単位で候補を探し、親セクションや近隣文を後から読む親子検索を優先的な比較対象にする。これは検索粒度と読解粒度を分ける提案であり、特定のチャンク長を全用途に指定するものではない。

### Contextual RetrievalとLate Chunkingは別の介入である

| 手法 | 何を変えるか | 実現方法 | 主な注意点 |
|---|---|---|---|
| Contextual Retrieval | 索引化するテキスト | 文書全体とチャンクから50〜100トークン程度の説明を生成し、チャンクに前置してEmbeddingとBM25へ入れる。([Anthropic](https://www.anthropic.com/research/contextual-retrieval)) | 説明文自体が生成物であり、原文と区別して保存・検証する |
| Late Chunking | 埋め込み計算と分割の順序 | 文書をTransformerで文脈化した後、チャンクごとにトークン表現を平均プーリングする。([Late Chunking](https://arxiv.org/html/2409.04701)) | 長文対応エンコーダとトークン表現へのアクセスが必要で、通常の文書ベクトルAPIだけでは同じ処理にならない |
| 親子検索 | 検索単位と生成へ渡す単位 | 細粒度で検索後、対応する親チャンクを読む。A-RAGも文検索と親チャンク読取を分離する。([A-RAG](https://arxiv.org/html/2602.03442v1)) | 親を無条件に広げるとトークン量とノイズが増えるため上限を設ける |

Anthropicの開発元評価では、上位20件の検索失敗率は通常方式5.7%に対し、Contextual Embeddings＋Contextual BM25で2.9%、再ランキングも加えると1.9%だった。これは検索失敗率の相対49%・67%低下であり、最終回答精度の同率改善を実証した数値ではない。([Anthropic Contextual Retrieval](https://www.anthropic.com/research/contextual-retrieval))

Late Chunking原論文は、3モデルと4つのBEIRデータセットで、5文単位の平均nDCG@10が52.4から54.3へ改善したと報告する。一方、2026年の比較では、文脈付き埋め込みがGutenQAの文書内検索で全モデル・全分割法において低下しており、タスクを区別した再評価が必要である。([Late Chunking](https://arxiv.org/html/2409.04701)、[Beyond Chunk-Then-Embed](https://arxiv.org/html/2602.16974v1))

**採用判断：** 複雑な生成前処理に進む前に、構造ベース分割、見出し付加、親子検索を比較する。Contextual RetrievalとLate Chunkingは同時導入せず、片方ずつアブレーションして改善の所在を確認することを提案する。

## 候補検索・ハイブリッド・再ランキング

### 語彙と意味を補完させる

BM25は強いゼロショットのベースラインであり、Dense検索はすべての分野で自動的に優位になるわけではない。BEIRは18の異種データセットで検索方式を比較し、再ランキングとLate Interactionの強さとともに、領域を跨ぐDenseモデルの性能差を報告している。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663))

実装では、BM25とDenseを並列実行し、文書ID・チャンクIDで候補を統合する構成を提案する。融合には順位ベースのRRFを候補とし、スコアの尺度が異なる検索器をそのまま足す実装との違いを比較する。RRFは既存の順位リストを融合する手法としてSIGIR 2009に発表されている。([Cormackほか, RRF](https://research.google/pubs/reciprocal-rank-fusion-outperforms-condorcet-and-individual-rank-learning-methods/))

RRFの実装上の形は、文書 \(d\) について検索器ごとの順位 \(r_i(d)\) を使う \(\mathrm{RRF}(d)=\sum_i 1/(c+r_i(d))\) である。採用時には定数 \(c\)、候補件数、重みを検証パラメータとし、検索器に現れない文書の扱いを固定する。

多言語・複数表現を統合する実装例としてBGE-M3がある。同モデルはDense、学習型Sparse、トークン単位Multi-vectorの3機能を同じエンコーダから生成し、MIRACLの18言語平均nDCG@10では全機能併用70.0、mE5-large 65.4と報告するが、これは日本語企業内文書での同等効果を保証しない。([BGE-M3](https://arxiv.org/html/2402.03216v2))

### 再ランキングとLate Interactionを区別する

クロスエンコーダは質問と候補文書を一緒に入力して関連性を判定する。一方、ColBERT系は質問・文書をそれぞれ複数ベクトルにし、質問トークンごとに文書トークンとの最大類似度を集計するため、単一ベクトルより細粒度の一致を扱える。([BEIR](https://ar5iv.labs.arxiv.org/html/2104.08663)、[ColBERTv2](https://ar5iv.arxiv.org/html/2112.01488))

ColBERTv2は、残差圧縮と教師モデルによる学習改善を組み合わせ、論文のMS MARCO条件ではLate Interactionの索引容量を従来ColBERTの154 GiBから16〜25 GiBへ削減した。それでも単一ベクトル索引と同じ容量特性とは限らず、採用時には品質だけでなく索引・検索実装の負担を測る必要がある。([ColBERTv2](https://ar5iv.arxiv.org/html/2112.01488))

再ランキングは「常に足すと改善する」部品ではない。BRIGHTでは、MS MARCOで学習したMiniLM再ランキングがBM25の平均nDCG@10を14.3から13.1へ下げ、GPT-4再ランキングでは17.4へ改善した例があり、学習領域と評価領域の整合が重要となる。([BRIGHT](https://arxiv.org/html/2407.12883))

**採用判断：** 候補検索のRecallと再ランキング後のnDCGを別々に測る。候補に必要文書がない場合は再ランキングでは救えないため、候補生成の失敗を先に直す設計を提案する。

## クエリ変換・分解・推論を使った検索

### HyDE：質問を仮想的な回答文書へ写像する

HyDEは、LLMに仮想文書を生成させ、その文書を埋め込んで実コーパスを検索する。生成文が事実として正しいことを前提にするのではなく、質問から関連文書の表現へ橋渡しする仕組みであり、最終回答の証拠は検索で得た実文書から取る。([HyDE](https://arxiv.org/html/2212.10496))

原論文のTREC DL19ではnDCG@10がContriever 44.5に対しHyDE 61.3だったが、関連性ラベルで微調整したContrieverの62.1には届いていない。したがって、ゼロショット検索の改善という文脈で解釈し、すでに領域最適化された検索器に同じ効果があるとはみなさない。([HyDE](https://arxiv.org/html/2212.10496))

### 質問分解と推論拡張

複数ホップの質問では、最初から最終回答と同じ表現の文書が存在するとは限らない。BRIGHTは、正しい検索対象を見つけるまでに推論を必要とする検索課題を提示し、LLMの推論ステップでクエリを拡張した場合に最大12.2ポイントの改善を報告している。([BRIGHT](https://arxiv.org/html/2407.12883))

実装上は、元質問、書換質問、サブ質問、仮説を別々の型として保持することを提案する。元の年・対象・除外条件を失わないよう検索結果を元質問に再照合し、生成した仮説を「確認済みの事実」として証拠ストアへ混入させない。

**採用判断：** ユーザーの語彙と資料の語彙のずれには書換・HyDEを、未確定の中間事実を順に調べる必要がある質問には分解・反復検索を使い分ける。生成による検索語改善と、生成による事実の捏造を切り分けられる観測ログを残す。

## 階層検索・GraphRAG・長期記憶

### RAPTOR：抽象度を跨いで検索する

RAPTORは、チャンクの埋め込み・クラスタリング・要約を再帰的に行い、原文と複数階層の要約から検索する。原文の局所情報だけでは答えにくい質問に対して、より広い意味単位の検索対象を用意する方法である。([RAPTOR](https://ar5iv.labs.arxiv.org/html/2401.18059))

同じGPT-3を使ったQuALITY開発セットの比較ではRAPTOR 62.4%、DPR 60.4%、BM25 57.3%だった。別のGPT-4利用結果82.6%と異なるモデルの既存方式62.3%との差20.3ポイントは、検索構造だけの効果として引用すべきではない。([RAPTOR](https://ar5iv.labs.arxiv.org/html/2401.18059))

実装では要約ノードから原文へのリンクを保持し、最終引用は原文へ戻す構成を提案する。要約の更新範囲と削除波及を管理し、要約だけで細かな数値・例外条件を確定しないようにする。

### 「GraphRAG」は単一の手法ではない

| 系統 | グラフ・索引の内容 | 検索・推論方法 | 向く質問 |
|---|---|---|---|
| Microsoft GraphRAG Global Search | エンティティ・関係、コミュニティ、階層要約 | コミュニティ要約から部分回答を作りmap-reduceで統合する。([原論文](https://arxiv.org/html/2404.16130)、[公式仕様](https://microsoft.github.io/graphrag/query/global_search/)) | コーパス全体のテーマ、論点、傾向 |
| LightRAG | エンティティ・関係とその説明、ベクトル索引 | 低レベル・高レベルのキーワード検索と近傍情報を統合する。([LightRAG](https://arxiv.org/html/2410.05779)) | 個別対象と広い概念を併用する探索 |
| HippoRAG 2 | 句・三つ組・パッセージの接続 | 三つ組検索、LLMによる選別、Personalized PageRankで原文を順位付けする。([HippoRAG 2](https://arxiv.org/html/2502.14802)) | 複数文書にまたがる事実・関連性の探索 |
| HopRAG | パッセージとLLM生成疑似質問の論理的接続 | retrieve–reason–pruneで関連パッセージを辿る。([HopRAG](https://arxiv.org/html/2502.12442)) | 語彙・意味類似だけでは辿れない多段QA |

Microsoft GraphRAG原論文では、約100万・170万トークンの2コーパスのグローバル質問で、意味検索に対する包括性のLLM判定勝率が72〜79%と報告されている。これはグローバル要約課題の回答比較であり、一般的な事実QAの正解率が72〜79%という意味ではない。([GraphRAG](https://arxiv.org/html/2404.16130))

HippoRAG 2では、同じ回答モデルLlama-3.3-70B-Instructを用いた7データセット平均QA F1が59.8、NV-Embed-v2による標準RAGが57.0だった。多段検索では2WikiのRecall@5が90.4対76.5と大きく改善する一方、MuSiQue条件で索引時間は99.5分対12.1分、QA時間は1.2秒対0.3秒となり、追加コストもある。([HippoRAG 2](https://arxiv.org/html/2502.14802))

LightRAGの論文は、UltraDomainの4領域でGraphRAGに近い、または上回るLLM選好勝率と、検索時の効率性を報告する。ただし、質問・評価にLLMを用いた開放的な回答比較であり、標準QAのEMやF1と同じ尺度で他のグラフ手法を順位付けできない。([LightRAG](https://arxiv.org/html/2410.05779))

### 2026年の比較から何がいえるか

RAGSearchは、Agentic検索の基盤としてDense RAGと複数のGraphRAG方式を、LLM・検索条件・推論プロトコルを共通化して比較している。論文は、Agentic化によってDense側の性能が上がり差が縮まる一方、複雑なマルチホップではグラフ側が有利な場面が残り、一般QAでは一貫した優位がないと報告する。([RAGSearch](https://arxiv.org/html/2604.09666))

ただし、同論文の一部の要約比較は、複数グラフ手法からデータセットごとの最良値を取る形式であり、単一構成の実運用性能とは異なる。また、Contain EMとF1の差もあるため、本稿ではこの結果を「GraphRAGの一律優位／不要」の証拠にせず、用途別比較を要するという方向性の根拠に留める。([RAGSearch](https://arxiv.org/html/2604.09666))

**採用判断：** グラフを先に構築するのでなく、「何を辿る必要があるか」を定義する。抽出した関係は、現実世界で確認済みの因果関係とは限らないため、原文・版・抽出方法の追跡を必須とする設計を提案する。

## Adaptive・Corrective・Agentic RAG

### 自己評価とエージェント制御を区別する

Self-RAGは、検索要否、検索文書・生成文の評価を特殊なreflection tokenとして学習する方式である。単にプロンプトで「自己反省せよ」と指示するループと同一ではなく、論文が報告する効果には学習済みモデルの能力が含まれる。([Self-RAG, ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/25f7be9694d7b32d5cc670927b8091e1-Abstract-Conference.html))

CRAGは検索評価器の信頼度に応じて、取得文書の利用、分解・選別、外部検索などを切り替える。原論文ではSelf-CRAGがSelf-RAGをPopQAで54.9から61.8へ改善する一方、ARCでは67.3から67.2であり、修正機構の追加が全タスクで有効なわけではない。([Corrective RAG](https://arxiv.org/html/2401.15884))

企業内用途では、CRAG型の「不足時にWeb検索」という方針をそのまま採用しないことを提案する。外部検索の許可、質問からの機密漏洩、社内ルールと外部一般情報の優先順位を明示し、不許可の場合は社内の別データ源や棄権に分岐させる。

### A-RAG：検索ツールの粒度をモデルに公開する

A-RAGは、キーワード検索、意味検索、チャンク読取という異なる粒度の操作をモデルへ公開する。文を検索して必要な親チャンクだけ読み、既読管理で再読を抑えるため、「毎ターン同じtop-k文書を大量投入する」構成とは異なる。([A-RAG](https://arxiv.org/html/2602.03442v1))

GPT-5-miniを回答モデルとする論文条件では、MuSiQueのLLM-AccはFull構成74.1、Naive RAG 52.8で、同論文内の単純なAgentic構成66.2も上回る。Full構成の取得トークンは5,663、単純なAgentic構成は56,360だったが、これは取得トークンの比較であり、総推論トークン・金額・遅延が同率に削減される意味ではない。([A-RAG](https://arxiv.org/html/2602.03442v1))

同資料のarXiv v1表示日と本文の日付には不一致があるため、本稿は2026年の手法として扱い、厳密な初公開日の比較には使わない。性能についても、モデルの推論能力・努力量に依存する著者評価として読み、取得インターフェースだけの独立した普遍的効果とはみなさない。([A-RAG](https://arxiv.org/html/2602.03442v1))

### 停止は検索そのものと同じくらい重要

AgenticRAGTracerは、中間ホップを持つ1,305件のベンチマークを提示し、最難関部分でGPT-5のEMが22.6%と報告する。診断では推論連鎖の早期終了と過剰な延長が失敗要因となり、検索・思考ステップの配分自体が評価対象になる。([AgenticRAGTracer, Findings ACL 2026](https://aclanthology.org/2026.findings-acl.66/))

実装上は、回答モデルの自己申告だけで終了を決めず、必要なサブ質問と取得済み証拠を照合する状態機械を提案する。上限到達と「証拠が充足した」ことを別の終了理由にし、未解決の主張が残る場合は回答範囲の限定または棄権へ移す。

| 制御項目 | 提案する実装 |
|---|---|
| ステップ予算 | 最大ツール回数・経過時間・推論量を外部オーケストレータで制限 |
| 証拠の増分 | 新規文書、未解決主張の解消、既読重複を記録 |
| 検索状態 | クエリ、検索対象、ACL、時点、候補、採用根拠を保存 |
| 終了状態 | 充足、予算超過、権限不足、根拠不存在、矛盾未解消を区別 |
| 非同期・並列 | 独立したサブ質問のみ並列化し、前提依存の検索は順序を守る |
| 回答品質 | 最終正解率に加え、ホップごとの根拠到達率と停止の適切さを測定 |

**採用判断：** 通常検索で解ける問いは短い経路に保ち、複合質問のみAgentic経路へ振り分ける。ルータ自体の誤分類も評価し、複雑な方式の成功率だけでなく、全トラフィックでの費用対効果を測る。

## 推論と検索を学習する：RAFT・Search-R1

### RAFT：検索文脈の使い方を学習する

RAFTは、正解を含む文書と無関係文書を混ぜた訓練例を使い、根拠から引用して答える能力と、無関係文書を無視する能力を学習する。知識をパラメータへ記憶させるだけの微調整ではなく、検索された情報を利用する振る舞いの学習として位置付けられる。([RAFT](https://arxiv.org/html/2403.10131v1))

同論文の主対象はドメイン内・同一資料群での利用であり、別の専門領域や大幅に更新されたコーパスへの一般化が保証されるわけではない。運用では文書や回答形式の変化を含む時系列テストを設け、索引更新だけで済む部分と再学習が必要な部分を分けることを提案する。([RAFT](https://arxiv.org/html/2403.10131v1))

### Search-R1：検索方策を強化学習する

Search-R1は、推論・検索・回答を交互に行う軌跡を強化学習で最適化する。検索で得たトークンを学習損失からマスクし、モデルが生成した行動を最適化する点と、最終回答の正しさを報酬にする点が重要である。([Search-R1](https://ar5iv.labs.arxiv.org/html/2503.09516))

E5検索器・2018年Wikipedia等の論文条件で、7Bモデルの7 QAデータセット平均EMは0.431、RAGベースラインは0.304だった。差は12.7ポイント、相対約41.8%であり、最新商用モデルや企業内コーパスでも同じ改善が出るとは解釈できない。([Search-R1](https://ar5iv.labs.arxiv.org/html/2503.09516))

**採用判断：** 独自モデルの訓練は、検索器、評価セット、報酬定義、更新検知を整えた後に検討する。特に「正解だが権限外の根拠を使用」「引用が誤り」「古い回答」といったケースを、正解文字列だけの報酬が区別できるかを設計上の検証項目にする。

## Multimodal RAG：画像・表・レイアウト

### OCR中心とページ画像中心を使い分ける

ColPaliは文書ページの画像をVision Language Modelで複数ベクトルへ変換し、テキストクエリとLate Interactionで照合する。OCRテキストだけの索引とは異なり、視覚的な配置や図表を検索対象に含められる。([ColPali](https://arxiv.org/html/2407.01449))

論文のViDoRe結果ではColPaliの平均nDCG@5が81.3、ColQwen2の掲載構成が86.6であり、視覚検索モデル内でも品質差がある。一方、ColPaliのfloat16表現は257.5 KB/ページと報告されており、ページ数の多い環境では索引容量が主要な検証項目になる。([ColPali](https://arxiv.org/html/2407.01449))

提案する実装は、画像検索かOCRかを二者択一にせず、本文検索、表の構造化、ページ画像検索を同じページIDに紐づける方式である。必要なページ・領域だけを視覚モデルへ送り、引用は元ページと対象箇所を提示する。

### 表の検索と数値推論を分離する

T²-RAGBenchは、テキストと表を含む23,088件の質問・文脈・回答の組を提示し、正しい文脈を検索してから数値推論する設定を扱う。公式抄録はDenseとSparseを組み合わせるHybrid BM25が有効と報告するが、取得した紹介ページだけでは指標別の詳細スコアまで確認できないため、効果量は記載しない。([T²-RAGBench, EACL 2026](https://aclanthology.org/2026.eacl-long.8/))

MLPerfの参照RAGでも、数値・表に関する回答精度はそれぞれ31%と報告され、表の分割や数値の読み違い・計算が課題として挙げられる。これは当該参照構成の値であって、RAG全般や最新モデルの上限ではない。([MLPerf End-to-End RAG](https://mlcommons.org/2026/08/endtoend-inference/))

**採用判断：** 監査可能な数値回答では、取得した行・列、単位、期間、計算式を明示する。計算は可能な限り決定的なツールに分離し、検索成功と計算成功を別のテストで検証する設計を提案する。

## 長文コンテキスト・証拠選択・圧縮

### 「RAGか長文か」ではなく組み合わせを評価する

Lost in the Middleは、入力中の関連情報の位置によって性能が変わり、中央にある場合に低下する傾向を示した。ただし対象は当時のモデルであり、同じ劣化量が2026年のすべてのモデルに残るとは限らないため、現在の採用候補で位置依存性を測ることが重要となる。([Lost in the Middle](https://arxiv.org/abs/2307.03172))

2025年のLong Context vs. RAG再評価は、外部文脈が必要な質問に絞った比較で、全体ではLong Contextが優位な一方、RAGのみ正答する質問もあると報告する。最適解はモデル、コーパス、検索単位、質問特性に依存し、過去の一つの比較からRAG不要・長文不要を結論することはできない。([Long Context vs. RAG](https://ar5iv.labs.arxiv.org/html/2501.01880))

本レポートでは、検索で対象文書を絞り、必要な文書はセクションや全文を長めに読む構成も比較対象にすることを提案する。長文読解をRAGの代替としてだけでなく、RAGの読取段階として使う考え方である。

### 圧縮は根拠の改変リスクも持つ

LLMLingua-2は、教師モデルから得た圧縮例を使い、トークンを保存・削除する分類器を学習する。MeetingBank・Mistral-7Bの報告条件では原文3,003トークンに対し970トークンへ圧縮し、QA EMが66.95から76.22へ上がったが、英語会議録中心の結果を専門的な法務・数値文書へ直接一般化できない。([LLMLingua-2](https://arxiv.org/html/2403.12968))

実装では、否定語、数値、単位、条件節、出典IDを保護したうえで、圧縮前後の回答差を測ることを提案する。圧縮文を検索上の補助表現として使う場合でも、最終引用を確認するための原文は失わないようにする。

**採用判断：** 圧縮前に重複除去、親チャンクの読取範囲制御、不要文書の除外を試す。高度な圧縮は、コスト削減と証拠保持を同時に評価できる用途に限定する。

## 定量エビデンスの比較台帳

以下は、効果の種類と比較条件を残した主要結果の抜粋である。行を跨ぐスコアの大小は、手法全体のランキングを意味しない。

| 手法・資料 | 条件・指標 | 比較結果 | 解釈・限界 |
|---|---|---|---|
| BEIRの再ランキング | 18データセット、nDCG@10 | BM25＋CEは16/18でBM25超え。([論文](https://ar5iv.labs.arxiv.org/html/2104.08663)) | 検索順位の改善。現行モデルでの回答効果ではない |
| Contextual Retrieval | 開発元評価、1−Recall@20 | 通常5.7% → Contextual両方式2.9% → 再ランキング併用1.9%。([記事](https://www.anthropic.com/research/contextual-retrieval)) | 失敗率の相対49%・67%減。正解率の改善率ではない |
| Late Chunking | 3モデル・4 BEIRデータセット、5文単位 | 平均nDCG@10 52.4 → 54.3。([論文](https://arxiv.org/html/2409.04701)) | 絶対+1.9ポイント。文書内検索には逆の結果がある |
| BGE-M3 | MIRACL 18言語、nDCG@10 | mE5-large 65.4 → 全機能併用70.0。([論文](https://arxiv.org/html/2402.03216v2)) | 別モデル・表現構成間の比較。日本語業務精度ではない |
| HyDE | TREC DL19、nDCG@10 | Contriever 44.5 → HyDE 61.3、微調整Contriever 62.1。([論文](https://arxiv.org/html/2212.10496)) | ゼロショット改善。教師ありモデルを上回ったとはいえない |
| RAPTOR | QuALITY開発、同一GPT-3、正解率 | BM25 57.3、DPR 60.4、RAPTOR 62.4。([論文](https://ar5iv.labs.arxiv.org/html/2401.18059)) | 読解モデルを揃えた比較を採用 |
| GraphRAG | 2コーパスの全体質問、LLM選好 | 意味検索に対する包括性勝率72〜79%。([論文](https://arxiv.org/html/2404.16130)) | 正解率ではない。全体要約タスクでの証拠 |
| HippoRAG 2 | 同一Llama-3.3-70B、7データセット平均QA F1 | NV-Embed-v2 RAG 57.0 → 59.8。([論文](https://arxiv.org/html/2502.14802)) | 絶対+2.8。多段検索の改善と全体平均を区別 |
| HopRAG | 3多段QA平均、GPT-4o、EM/F1 | SiReRAG 53.93/65.83 → 55.10/66.40。([論文](https://arxiv.org/html/2502.12442)) | 強い比較相手との差は+1.17/+0.57ポイント。探索呼出しも要確認 |
| A-RAG | MuSiQue、GPT-5-mini、LLM-Acc | Naive RAG 52.8 → Full 74.1。([論文](https://arxiv.org/html/2602.03442v1)) | 著者の評価器による意味的一致。EMではない |
| Search-R1 | E5＋2018 Wikipedia、7B、7 QA平均EM | RAG 0.304 → 0.431。([論文](https://ar5iv.labs.arxiv.org/html/2503.09516)) | +12.7ポイント、相対約41.8%。学習込みの比較 |
| ALCE | ASQA、ChatGPT、引用再現率 | Vanilla 73.6 → 複数回答選別84.8、正確性EM再現率40.4 → 40.2。([論文](https://arxiv.org/html/2305.14627v1)) | 引用改善が正確性改善と同義でないことを示す |

## 評価：何を測れば効果を判定できるか

### 自動評価を人手評価の代用品ではなく増幅器にする

Ragasは、Faithfulness、Answer Relevance、Context Relevanceなどを参照回答なしで測る枠組みを提案した。原論文のWikiEvalでは人手二者比較との一致が指標ごとに異なり、Faithfulness 0.95に対してContext Relevance 0.70で、指標の信頼性も一様ではない。([Ragas](https://ar5iv.labs.arxiv.org/html/2309.15217))

ARESは合成データで軽量評価器を訓練し、人手ラベルとPrediction-Powered Inferenceで推定を較正する方式を示す。ただし、論文でも大きな領域移行時に評価器の性能が落ちるため、英語の一般タスクで得た一致率を日本語の専門業務へそのまま持ち込まないことが重要である。([ARES](https://arxiv.org/html/2311.09476))

ALCEは、流暢さ・正しさ・引用品質を分けて評価する。引用再現率を高める回答選択によって、回答の正確性が同時には改善しない結果もあり、「引用付きだから正しい」という判定は不十分である。([ALCE](https://arxiv.org/html/2305.14627v1))

### 2026年の評価動向

| 評価対象の拡張 | 確認した動き | 実務への示唆 |
|---|---|---|
| Agent生成クエリと大規模候補集合 | Q2D-Webは約1.9億文書、69,721クエリ、10言語を扱う。([開発元資料](https://www.perplexity.ai/hub/blog/q2d-web)) | 人間が直接入力した短い質問だけで検索器を評価しない |
| 多段探索の途中失敗 | AgenticRAGTracerはホップ単位の診断を扱う。([ACL 2026](https://aclanthology.org/2026.findings-acl.66/)) | 最終EMだけでなく、どこで証拠探索が途切れたかを測る |
| 取り込みから推論まで | MLPerfは取り込みと複数ホップQAを別ワークロードとして測定する。([MLCommons](https://mlcommons.org/2026/08/endtoend-inference/)) | Embedding速度やLLM tokens/sだけで総体性能を判断しない |
| テキストと表 | T²-RAGBenchは検索後の数値推論まで扱う。([EACL 2026](https://aclanthology.org/2026.eacl-long.8/)) | Oracle文脈のQAだけでは、実際の検索失敗を評価できない |

Q2D-Webは非公開ベンチマークと公開リーダーボードの組み合わせであり、Perplexityの本番トラフィック由来という分布上の有利さを開発元自身も明記する。高いスケールの評価として有用だが、独立に完全再現できる公開コーパス評価や企業内文書評価と同一視しない。([Q2D-Web](https://www.perplexity.ai/hub/blog/q2d-web))

MLPerfの性能計測では、記録された各ホップの入力を用いて、ホップ数と取得文書を固定する仕組みが採用されている。ハードウェア・システム比較の再現性には有用だが、本番エージェントが動的に何回探索するかの分布をそのまま測るものではない。([MLPerf End-to-End RAG](https://mlcommons.org/2026/08/endtoend-inference/))

### 推奨する評価設計

以下は、上記研究を踏まえた実装・実験プロトコルの提案である。件数、閾値、許容コストは業務リスクと実データに合わせて定め、ここで普遍値は設定しない。

| 層 | 主な指標 | 分離したい失敗 |
|---|---|---|
| 取り込み | 表構造・見出し・原文位置の保持、抽出漏れ | そもそも索引化されていない |
| 候補検索 | Recall@k、根拠文書の完全被覆率 | 重要文書が候補に入らない |
| 順位付け | nDCG@k、MRR、予算内の根拠被覆 | 候補にはあるが採用されない |
| 生成 | EM/F1、専門家正解率、計算正確性 | 根拠を渡しても誤る |
| 引用 | 支持される主張の割合、引用の適切さ、原文追跡 | 正しい回答と誤った引用の混在 |
| 棄権 | 回答率対エラー率、根拠不存在時の誤答率 | 無理に回答する／答えられるのに棄権する |
| Agent | ホップ成功率、停止適切性、重複探索率 | 早期終了・過剰検索・迷走 |
| 運用 | p50/p95/p99、費用/問、索引更新・削除反映時間 | 平均値で隠れる長尾・古いデータ |
| 安全性 | 権限外露出、注入耐性、汚染成功率 | 品質向上と引き換えの情報漏洩 |

実験では、まず「正解根拠を直接与えるOracle Context」条件を設け、読解側の上限を確認する。次にDense、BM25、Hybrid、Hybrid＋Reranker、必要な高度化を同じ評価器・モデルで段階比較し、モデルや推論努力量を変える実験は別軸にする。

データ分割は、質問だけでなく文書・版・時点のリークを避けて行う。単一ホップ、多段、全体要約、図表、数値、否定・例外条件、古い情報、回答不能、権限不足、日本語・英語混在を分け、全体平均と重要カテゴリの劣化を同時に確認する。

同じ質問を用いた対応のある比較と信頼区間を基本にし、LLM評価器のプロンプト・モデル版・順序を固定する。改善が統計的に小さい場合でも、重大誤答の減少や長尾遅延の悪化を別途評価して採用を決める。

## セキュリティ・権限・鮮度・運用費用

### 検索結果は信頼境界の外側から来るデータである

PoisonedRAGは、RAGの知識データベースに悪性テキストを少数注入することで、指定した誤回答を誘導する攻撃を示した。USENIX Security 2025の公式紹介は、数百万テキストを含むDBへ標的質問あたり5件を注入し、90%の攻撃成功率という結果を報告するが、これは論文の攻撃条件での値であり、あらゆるRAGに適用される一般値ではない。([PoisonedRAG](https://www.usenix.org/conference/usenixsecurity25/presentation/zou-poisonedrag))

2026年のRAGセキュリティサーベイは、コーパス、検索器、生成器を跨ぐ攻撃面を整理し、正確性だけでなくプライバシーや公平性も含めた防御を扱う。したがって、生成器への注意文だけを安全対策の全体とみなさず、取り込み・検索・再ランキング・生成・追跡の各段階を設計する必要がある。([Retrieved But Not Reliable](https://arxiv.org/abs/2608.24977))

以下は本レポートが提案する運用要件であり、引用論文がすべての対策の完全性を証明したものではない。

- **権限：** 検索前に利用者・テナント・文書権限で候補を制限し、本文を返す直前にも権限を確認する。権限境界を跨いだ要約やグラフには、元データ由来の機密情報が残る可能性を想定する。
- **派生データ：** 要約、Contextual説明、グラフのノード・エッジ、Embedding、検索キャッシュ、回答キャッシュを原文の版・ACLに紐づける。原文削除で検索結果だけが消え、派生情報が残る状態をテストする。
- **命令の分離：** 取得文書の中の命令を、システム指示やツール実行権限として扱わない。Agentへ公開するツールは最小権限とし、検索・読取と外部送信・更新を区別する。
- **鮮度：** 取得日時、索引日時、文書更新日、施行日・有効日を区別する。質問時点に有効な情報と、単に新しく書かれた情報を混同しない。
- **検証：** 悪性文書、偽の引用、古いが関連性の高い文書、権限変更直後のキャッシュを含む攻撃・回帰セットを持つ。ログ自体の機密性と保存期間も制御する。

### コストは検索・生成だけでなく再構築を含める

HippoRAG 2のようなグラフ方式は検索性能を改善しても、索引構築・QA時間・メモリに追加費用がある。GraphRAG公式仕様も、コミュニティ階層の選択により詳細さと時間・LLM資源が変わると説明している。([HippoRAG 2](https://arxiv.org/html/2502.14802)、[GraphRAG Global Search](https://microsoft.github.io/graphrag/query/global_search/))

設計上の総費用は、次のように分解して測ることを提案する。金額単位を揃えたうえで、更新頻度、再構築、評価、運用監視も含める。

\[
C_{\mathrm{period}}
=C_{\mathrm{ingest}}+C_{\mathrm{reindex}}+C_{\mathrm{storage}}
+N_{\mathrm{queries}}\bigl(C_{\mathrm{retrieve}}+C_{\mathrm{rerank}}
+C_{\mathrm{agent}}+C_{\mathrm{generate}}+C_{\mathrm{verify}}\bigr)
+C_{\mathrm{evaluation}}+C_{\mathrm{operations}}
\]

AgenticやGraph方式を追加する際は、成功した少数ケースだけでなく、問い合わせ分布全体の費用と長尾遅延を確認する。データ更新が多い用途では、問い合わせ時の節約よりも、索引・要約・グラフの再計算が支配的になっていないかを測る。

## 参照アーキテクチャと実装例

### 推奨する責務分離

以下は、論文実装の転載ではなく、本レポート独自の参照設計である。通常経路を短く保ち、高度な検索を交換可能にし、安全性・評価・版管理を全経路で共通化する。

| コンポーネント | 責務 |
|---|---|
| Source Registry | 原本、版、ACL、有効期間、削除状態の管理 |
| Document Processor | 構造解析、表・画像・原文位置の保持 |
| Index Builder | Sparse/Dense、任意の階層・グラフ索引と派生関係の管理 |
| Retrieval Gateway | 認証済みの検索・読取、時点制約、再認可 |
| Candidate Ranker | 候補融合、再ランキング、重複・多様性制御 |
| Evidence Store | 取得済み証拠、主張との対応、未解決項目 |
| Query Orchestrator | 通常・全体要約・多段・画像等の経路選択と予算制御 |
| Answer & Verifier | 引用付き回答、主張支持・数値・引用先の検証 |
| Evaluation & Trace | バージョン固定、比較実験、コスト・失敗分析 |

### TypeScript風の制御例

以下は実行可能な完成コードではなく、インターフェースと制御責務を示す疑似コードである。`verify`や`assessCoverage`の正しさを前提にせず、それ自体を人手ラベルで評価・較正する必要がある。

```typescript
type QueryContext = {
  tenantId: string;
  principalId: string;
  asOf: string;
  deadlineMs: number;
  maxToolCalls: number;
};

type Evidence = {
  sourceId: string;
  version: string;
  locator: { page?: number; start?: number; end?: number };
  originalText: string;
  // 生成された索引用説明・要約はoriginalTextへ混ぜない
};

async function answer(question: string, ctx: QueryContext) {
  const plan = await classifyTask(question);
  const state = createEvidenceState(question);
  const budget = createBudget(ctx);

  while (budget.canContinue()) {
    // ループごとに次の行動を選ぶ。並列化は独立サブ質問に限る。
    const action = await chooseAction(plan, state);
    if (action.kind === "stop") break;

    if (action.kind === "read") {
      const evidence = await gateway.authorizedRead(action.ids, ctx);
      state.add(evidence);
    } else {
      const candidates = await gateway.authorizedSearch({
        query: action.query,
        strategy: action.strategy,
        context: ctx
      });
      const ranked = await rerank(question, candidates);
      const evidence = await gateway.authorizedRead(
        selectUnderTokenBudget(ranked, budget), ctx
      );
      state.add(evidence);
    }

    budget.recordActualUsage();
    const coverage = await assessCoverage(question, state);
    state.updateCoverage(coverage);

    if (coverage.sufficient) break;
    if (state.noUsefulProgress()) break;
  }

  if (!state.canSupportAnswer()) {
    return abstainWithReason(state, budget);
  }

  const draft = await generateWithCitations(question, state.evidence);
  const result = await verifyClaimsAndCitations(draft, state.evidence);
  if (!result.passed) return restrictOrAbstain(draft, result);

  // 長い処理中に権限が失効した場合も考慮する
  await gateway.reauthorize(state.evidence, ctx);
  return finalize(draft, state, budget);
}
```

### 実装上の重要な区別

- **検索用表現と根拠：** HyDE文、要約、Contextual説明は検索補助であり、原文と同じ証拠として扱わない。
- **モデル推論と決定的制約：** ACL、予算、外部アクセス許可、削除状態はLLMの判断だけに任せない。
- **索引更新と回答更新：** 新しい文書を追加しただけで、古いキャッシュや階層要約が無効化されたとみなさない。
- **回答生成と検証：** 検証器の同意は保証ではない。評価器・回答器が同じ誤解を共有する場合を、人手確認と反例で検出する。

## 導入ロードマップと選定指針

以下は順序の提案であり、期間や必要人数を一律に設定するものではない。既存の検索品質・データ品質・リスクに応じて、不要な段階は省略してよい。

| 段階 | 実装・実験 | 次へ進む条件 |
|---|---|---|
| 基準づくり | 文書品質、評価セット、Oracle Context、Dense/BM25比較 | 原本不存在・検索失敗・読解失敗を分離できる |
| 検索改善 | Hybrid、再ランキング、メタデータ、親子検索 | 同一条件で重要カテゴリとコストの改善を確認 |
| 文脈改善 | Contextual Retrieval、Late Chunking、長めの読取 | 文脈欠落が主要原因と確認され、負の結果も監視できる |
| 用途別分岐 | RAPTOR、用途限定GraphRAG、視覚検索、予算付きAgent | 対象質問群で単純方式を上回る便益を確認 |
| 学習投資 | RAFT、検索方策RL、専門評価器 | 学習データ・更新運用・報酬品質を継続管理できる |
| 本番最適化 | キャッシュ、圧縮、並列化、配置最適化 | 品質・権限・鮮度を保って総費用または長尾遅延を改善 |

用途別の初期方針としては、社内規程やFAQは権限・時点付きHybrid＋再ランキング、技術文書は階層構造と親子検索、調査横断の全体要約はコミュニティ要約、多段の事実QAは質問分解と限定的Agent、図表主体のPDFは画像とテキストの併用を提案する。これは各手法の対象課題に基づく設計仮説であり、本番採用前に自社データで検証する。

### 未解決点と証拠の限界

- **日本語の専門業務：** 本稿で扱う英語中心のQA・検索ベンチマークだけでは、日本語の省略表現、社内語彙、表記揺れ、法令の時点差に対する効果量は確定できない。多言語モデルの結果も、そのまま業務精度の証明にはならない。([BGE-M3](https://arxiv.org/html/2402.03216v2)、[ARES](https://arxiv.org/html/2311.09476))
- **方式の合成効果：** Hybrid、再ランキング、グラフ、Agent、圧縮をすべて重ねた場合の効果は、個別論文の改善率の加算では推定できない。2026年の比較でも、タスク・バックエンド・推論方式の相互作用が残る。([RAGSearch](https://arxiv.org/html/2604.09666))
- **最新モデルへの移行：** 過去モデルで有効だった前処理や自己評価が、新モデルでも同じ効果を持つとは限らない。A-RAGでもモデルと推論努力量による差が報告されるため、検索方式と回答モデルを直交させた評価が必要となる。([A-RAG](https://arxiv.org/html/2602.03442v1))
- **安全性保証：** 攻撃耐性や自動検証の研究は進んでいるが、引用を付けること、自己評価を追加すること、グラフ化することだけで正確性や安全性が保証されるという根拠は確認できない。([ALCE](https://arxiv.org/html/2305.14627v1)、[PoisonedRAG](https://www.usenix.org/conference/usenixsecurity25/presentation/zou-poisonedrag)、[RAGセキュリティサーベイ](https://arxiv.org/abs/2608.24977))

## 総括

Advanced RAGの技術的な進展は、検索器を強化するだけでなく、検索対象の表現、読取粒度、探索順序、停止判断、評価範囲を拡張する方向にある。一方、最新の比較研究は、高度な分割・グラフ化・反復検索がすべての質問で有利になるわけではないことも示している。([Beyond Chunk-Then-Embed](https://arxiv.org/html/2602.16974v1)、[RAGSearch](https://arxiv.org/html/2604.09666)、[AgenticRAGTracer](https://aclanthology.org/2026.findings-acl.66/))

採用の中心原則は、「最も高度な方式を選ぶ」ことではなく、実測した失敗原因に対して最小限の追加機構を選ぶことである。検索・読解・引用・権限・鮮度を分離して測り、改善と引き換えのコストや新たな故障モードまで確認できる設計を、本レポートの最終的な推奨とする。
