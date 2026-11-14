# 調査資料とまとめ

このリポジトリの 2 つのスライド（前提編「Advanced RAG 実践ガイド」と実践編「FMEA 作成支援ケーススタディ」）を作るときに使った調査資料、調査のまとめ、査読の記録です。

## 作り方と注意

- 調査は、生成AI（Claude Code）が Web 検索と一次資料の確認で行い、筆者が結果を確認してスライドに反映しました。各ファイルの「依頼内容」は調査を頼んだときの指示、「結果」はその回答です。
- 回答の中の数値は、スライドに載せる前に原典で確認しています。訂正した数値はスライドの側に反映しています。たとえば GraphRAG の包括性勝率は 72〜83%、Lost in the Middle の掲載は TACL 2024 です。調査メモの記述とスライドが食い違う場合は、スライドの方を優先してください。
- 引用している論文・記事・製品資料の権利は、それぞれの著者と発行元にあります。

## 一覧

### source/：出発点にした資料

| ファイル | 内容 |
| --- | --- |
| [Advanced RAG技術レポート.md](source/Advanced%20RAG技術レポート.md) | 前提編の元にした技術レポートです。手法、評価、安全・運用、採用レーダー、ロードマップをまとめています。 |

### notes/：調査のまとめ

| ファイル | 使った先 | 内容 |
| --- | --- | --- |
| [01_opensearch-japanese-hybrid.md](notes/01_opensearch-japanese-hybrid.md) | 実践編 | OpenSearch での日本語ハイブリッド検索（kuromoji、k-NN、RRF）、日本語の埋め込みと再ランキングのモデル |
| [02_real-manuals-and-specs.md](notes/02_real-manuals-and-specs.md) | 実践編 | 実在する分冊マニュアル・仕様書の構造（合成コーパスの形を借りるため） |
| [03_fmea-drbfm-excel-structure.md](notes/03_fmea-drbfm-excel-structure.md) | 実践編 | FMEA・DRBFM の Excel 帳票の構造（結合ヘッダ、AIAG-VDA の列） |
| [04_patents-scans-defect-data.md](notes/04_patents-scans-defect-data.md) | 実践編 | 特許の図と符号、スキャン PDF、不具合データ・8D レポートの構造 |
| [05_rag-antipatterns-evidence.md](notes/05_rag-antipatterns-evidence.md) | 前提編 Part 7 | RAG のアンチパターンと、その根拠になる論文・実務報告 |
| [06_enterprise-wide-rag-cases.md](notes/06_enterprise-wide-rag-cases.md) | 前提編 Part 7 | 全社横断 RAG の製品設計と自社構築の事例（国内外） |
| [07_chunk-size-long-context.md](notes/07_chunk-size-long-context.md) | 前提編 2-A | チャンク長の評価（2024〜2026）と、長文コンテキスト時代の見直し、各社の既定値 |

### reviews/：スライドの査読記録

前提編の全スライドを 3 つに分け、作成時の文脈を持たない査読者（生成AI）に「新人がスライドだけでは読み解けない箇所」を探させた記録です。指摘を受けた約 45 か所を直して、118 枚から 119 枚にしました。

| ファイル | 範囲 |
| --- | --- |
| [review_slides-001-040.md](reviews/review_slides-001-040.md) | スライド 1〜40 |
| [review_slides-041-080.md](reviews/review_slides-041-080.md) | スライド 41〜80 |
| [review_slides-081-118.md](reviews/review_slides-081-118.md) | スライド 81〜118（Part 7 を重点的に） |

査読記録のスライド番号は、修正前（118 枚）の番号です。

## スライドの生成元

- 前提編：[guide-deck/](../guide-deck/)
- 実践編：[deck/](../deck/)
