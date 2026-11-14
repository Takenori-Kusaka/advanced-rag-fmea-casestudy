# Research FMEA/DRBFM Excel structure

## 依頼内容

You are a research assistant. Respond in Japanese. Goal: characterize REAL FMEA / DRBFM spreadsheet formats used in industry ("神エクセル" style, Excel used as a printed form rather than a queryable table) so we can build a realistic synthetic FMEA workbook for a RAG case study (motor / motor driver / connector products), and find the state of the art for retrieving from such tables.

Research and report concretely:
1. AIAG-VDA DFMEA (2019) form: exact column structure (Structure Analysis step 2 / Function Analysis step 3 / Failure Analysis step 4 / Risk Analysis step 5 / Optimization step 6), the multi-row, merged, hierarchical header layout (e.g., "故障分析(ステップ4)" spanning 故障影響(FE)/S/故障モード(FM)/故障原因(FC)), AP (Action Priority) vs RPN. Also the classic RPN-style FMEA form (IEC 60812 / older AIAG 4th) columns. Give Japanese column names commonly used in Japanese companies.
2. DRBFM worksheet (Toyota / GD3, Tatsuhiko Yoshimura): columns (変更点, 変更に伴う心配点, どんな場合に心配点が生じるか, 影響, 重要度, 心配点を除くためにどんな設計をしたか, DRでの推奨事項 etc.) and how merged cells are used (one 変更点 spans many 心配点 rows).
3. Real public examples or templates (Japanese government / JIS / companies / universities / quality consultancies publishing FMEA Excel templates or sample sheets), and typical "帳票" practices: header block at top (製品名, 図番, 作成者, 承認印), merged cells carried down vertically (one function spanning many failure modes), blank cells meaning "same as above", line-breaks inside cells, print areas, multiple sheets per subsystem, revision history sheet.
4. Research on RAG/LLM for complex spreadsheets with merged cells and hierarchical headers: e.g., Microsoft SpreadsheetLLM (SheetCompressor), TableRAG (Google/2024), "Table meets LLM", hierarchical-table QA datasets (HiTab, AIT-QA, MultiHiertt), row-serialization strategies ("header path: value"), and any guidance from vendors (Azure Document Intelligence, Docling, Unstructured) about merged-cell handling. Summarize which techniques work and their reported effects (with numbers if available, and the conditions).

Use WebSearch / tavily tools / WebFetch. Do not invent URLs; mark uncertainty. Final report: structured, specific, ~2500-4000 Japanese characters, with a source URL list. No file downloads to C: drive needed.

## 結果

# FMEA／DRBFM「神エクセル」帳票の実態と、表RAGの最新手法：調査報告

## 結論
- 実際の帳票は、多段の結合ヘッダ、左側の階層列を縦に結合したもの、空白セルを「同上」として使う書き方の組み合わせが基本です。
- 合成ワークブックでは、AIAG-VDA形式とDRBFM形式の2種類を用意し、上の3要素を必ず入れると実物に近くなります。
- 検索側では、結合を展開して埋め戻したうえで、ヘッダの階層パス付きで行単位に直列化する前処理が最も効く、というのが最近の研究の共通した結論です。

## 1. FMEAの様式

### AIAG-VDA DFMEA（2019）
日科技連出版社の解説書（岩波好夫著、第3版、図4.7）に、日本語の様式がそのまま載っています。ヘッダは2段で、1段目が各ステップ名の結合セル、2段目が個別の列です。

| 1段目（結合） | 2段目の列 |
|---|---|
| 構造分析（ステップ2） | 上位レベル／分析対象／下位レベル |
| 機能分析（ステップ3） | 上位レベルの機能・要求事項／分析対象の機能・要求事項／下位レベルの機能・要求事項 |
| 故障分析（ステップ4） | 上位レベルの故障影響FE／影響度S／分析対象の故障モードFM／下位レベルの故障原因FC |
| DFMEAリスク分析（ステップ5） | 現在の予防管理PC／発生度O／現在の検出管理DC／検出度D／処置優先度AP／フィルターコード |
| DFMEA最適化（ステップ6） | 追加の予防処置／追加の検出処置／責任者／完了予定日／処置状態／処置内容と証拠／完了日／S／O／D／AP／備考 |

- PFMEAでは、構造分析が「プロセス項目／プロセスステップ／作業要素（4M）」になり、「特殊特性」の列が加わります。
- DFMEAでは特殊特性の列が削除されています（SMMTのAIAG-VDA整合資料に明記）。
- ステップ1のヘッダブロックには、会社名、技術所在地、顧客名、モデル年／プログラム、対象、開始日・改訂日、部門横断チーム、FMEA ID、設計責任、機密レベルが並びます。これは記憶に基づく内容で、一次資料では未確認です。
- 故障連鎖は「下位の故障原因（FC）→分析対象の故障モード（FM）→上位の故障影響（FE）」です。ExcelではFEとFMを結合して縦に伸ばし、FCを1行ずつ並べる形になります。

### APとRPNの違い
- 従来のRPNはS×O×Dの掛け算です（1〜1000）。「S=10でもO=1、D=1ならRPN=10」となり、重大なリスクが低く見えます。また、閾値を下回るように数字合わせをする温床にもなっていました。
- APは、S・O・Dの組み合わせを固定の表で引き、高（H）／中（M）／低（L）を決める方式で、影響度Sに最も大きな重みがあります。
  - Hは「処置を取る」か「現状の管理で十分な理由を文書化する」ことが求められます。
  - S=1は常にLです。
- 実際の現場では、APとRPNの両方の列を残している社内様式も多いようです（ソフトウェアベンダーのコラムからの推測）。

### 従来型の様式
- **IEC 60812:2006 図A.1**
  - ヘッダ：最終品目、運用期間、品目、改訂、作成者、日付
  - 列：品目番号、品目の説明と機能、故障モード、故障モードコード、推定原因、局所影響、最終影響、検出方法、補償手段、重大度区分、発生頻度、備考
  - 附属書Bの自動車電子の例は、AIAG第4版と同じ型のRPN方式です（サブシステム／組立品／部品の3列、局所影響／最終影響、分類（Class）など）。
  - JIS C 5750-4-3はIEC 60812の翻訳規格ですが、本文は未確認です。
- **AIAG第4版**：項目／機能、要求事項、潜在的故障モード、潜在的影響、S、クラス、潜在的原因、現行設計管理（予防）、O、現行設計管理（検出）、D、RPN、推奨処置、責任者と目標完了日、処置結果（実施処置・完了日・S・O・D・RPN）。
- **日本企業でよく見る列名**：部品名／機能、故障モード、推定原因（故障メカニズム）、上位（システム）への影響、影響度（重大度）、発生頻度（発生度）、検出難易度（検出度）、RPN（危険優先数）、推奨処置（是正処置）、担当、期限、処置結果、再評価。

## 2. DRBFMワークシート（トヨタ／GD3、吉村達彦）
豊田合成技報 Vol.44 No.2（2002）の図3と、九州大学の英語論文から列構成が確認できます。

| 誰が書くか | 列 |
|---|---|
| 設計者が事前に記入 | 部品名、変更点、機能、変更による心配点（故障モード）、どんな場合に心配点が生じるか（要因・原因）、お客様への影響、影響度（重要度）、心配点を除くためにどんな設計をしたか（設計ルール・設計基準・チェック項目を含む） |
| DRでの議論で追記 | 他に心配点はないか、他に考えるべき要因はないか、優先度 |
| DRBFMの結果（推奨事項） | 設計へ反映すべき項目、評価へ反映すべき項目、工程へ反映すべき項目（それぞれに担当・期限）、対策の結果 |

- 「DRBFM」と書かれた列群は、議論で埋める欄として色分けされます（トヨタ様式では青が設計者、黄がレビュー時という説明あり）。
- 結合セルの典型的な使い方は、「部品名・変更点」が多数の心配点行にまたがり、さらに心配点1件が複数の要因行にまたがる二重入れ子です。これは一般的な運用からの推測で、様式として決められたものではありません。
- KKE社のコラムに、モーターのギア材質を金属からPA66に変えたときの記入例があり、合成データの種として使えます（-20℃での歯元破損、歯元Rの拡大、1000サイクル試験など）。

## 3. 公開されている例と帳票の慣行
- **公的資料**
  - 海上技術安全研究所「FMEA実施手順」：ヘッダに番号・日付・解析者、右側に参照ブロック線図・図面・検討／修正／最終確認欄。同じ機器で複数の故障モードを縦に並べる例があります。
  - 国立保健医療科学院の田中論文：輸血業務のFMEAとHFMEAシートの例。
  - IPA「ソフトウェアFMEA」、JAXA JMR-004D（FMEA／FMECAを要求）。
- **テンプレート**：MENTENA（工程FMEA、Excel）、i-Reporter（FMEAテンプレート）。中身は未確認です。
- **帳票の慣行**
  - 上部にヘッダブロック（製品名、図番、作成・審査・承認の印欄、改訂日）。
  - 左側の階層列（部品、機能、故障モード）は縦結合。結合しない場合は空白にして「同上」の意味にする。
  - セル内で改行して「予防：…／検出：…」と書く（KKE社の例）。
  - サブシステムごとにシートを分け、印刷範囲を設定し、改訂履歴は別シートにする。
  - 「影響度」「発生度」の列名は1文字ずつ改行した縦書きにする。上の解説書PDFから抽出したテキストにその形跡が見えます。
- **アンチパターンの公式リスト**：総務省「統計表における機械判読可能なデータ作成に関する表記方法」（2020）のチェック項目（セル結合、空白・改行で体裁を整える、項目名の省略など）が、そのまま合成時に入れるべき「汚し方」の一覧になります。デジタル庁は2026年10月に、これを採点するツール「Harunobu」をGitHubで公開しています。Classmethodの検証記事では、結合セルやタイトル行の多い帳票では表の範囲推定（レイアウト検出）の段階で精度が落ちたと報告されています。

## 4. 結合セル・階層ヘッダを持つ表からの検索・QAの最新手法
| 手法・データ | 要点（数値は報告値） |
|---|---|
| SpreadsheetLLM（Microsoft、2024） | SheetCompressor（構造の目印になる行列を残して圧縮、値→セル番地の逆引き索引、書式ごとの集約）でトークンを96%削減（約25倍圧縮）。表検出F1はGPT-4の文脈内学習で素の方式比+25.6%、微調整で78.9%（従来SOTAのTableSense-CNNは66.6%）。条件は「シート内の表検出」タスク。 |
| TableRAG（Google、NeurIPS 2024） | 質問を展開し、スキーマ（列）とセル値を別々に検索。約8万行規模のArcadeQAで、GPT-3.5の正答率が表全体を読ませると4.6%、行列検索で37.7%、TableRAGで49.2%。巨大でフラットな表が前提。 |
| Table Meets LLM（WSDM 2024） | 結合セル検出を含む7タスクで比較。HTML＋書式の説明＋役割プロンプトが全体最高の65.43%。結合セル検出はMarkdownで78%前後。 |
| 階層表ベンチマーク | HiTab（3,597表、10,686問）、AIT-QA（116表、515問、航空会社）、MultiHiertt（10,440問、金融、1文書平均3.89表）、RealHiTBench（ACL 2025、708表、3,752問）。RealHiTBenchのTreeThinkerは、ヘッダを木構造にしてプロンプトに入れると改善すると報告（具体的な数値は未確認）。 |
| 行単位の構造保持チャンク（STC、arXiv 2605.00318） | 各行を「列名: 値」のブロックにして行境界で分割。MAUDデータでBM25のR@1が0.366→0.754、ハイブリッド検索で0.347→0.539。ただし正解判定は文字列一致の簡易判定で、回答精度は未評価。 |

- **ベンダー各社の扱い**
  - Azure Document Intelligence：rowSpan、columnSpan、kind=columnHeaderを返します。Markdown出力では、結合セルを持つ表をHTMLの表（rowspan／colspan付き）で出すように変わりました（2024-07-31-preview以降）。
  - Docling：HTMLとJSONでは結合が保持されますが、Markdown出力では値が複製されて平坦化されます（GitHub issue #3830）。
  - Unstructured：partition_xlsxのfind_subtableで、空行に囲まれたブロックを別々の表として切り出し、text_as_htmlでHTMLを付けます。
- **日本の実務報告**：ExStruct（結合範囲・色・図形・印刷範囲をJSON化）が、PDF化や画像化よりQAの精度が高かったという報告があります。ソフトバンクの検証でも、構造化してから渡すと全問正解でした。ただし、どちらも少数問題での検証です。

## 合成ワークブックとRAG評価への示唆
1. **合成データに入れるもの**
   - 2段ヘッダ（ステップ名の結合＋個別の列）
   - 部品→機能→故障モードの縦結合と、空白の「同上」
   - セル内の改行と縦書きの見出し
   - 上部のヘッダブロック、承認印欄、改訂履歴シート
   - モーター／ドライバ／コネクタでシートを分ける
   - APとRPNの併記
   - DRBFMシートを別に作る（変更点→心配点→要因の二重結合）
2. **比較すべき前処理**：①素のMarkdown（結合は複製）、②HTML（rowspanあり）、③結合を展開・埋め戻してから「ヘッダ階層パス: 値」で1行1チャンク、④ ③にシート名・ヘッダブロック（製品名・図番）を各チャンクの先頭に付けたもの。③と④が最も有望というのが文献の示唆です。
3. **評価する質問の種類**：結合セルにまたがる質問（例：「機能Xの故障モードのうちAP=Hのもの」）、ヘッダブロックへの参照、DRBFMの「DRBFMで示された」列の取り出し。

## 出典
- https://www.juse-p.co.jp/filemanager/source/Trial_Reading/2022/trial9784817197481.pdf
- https://www.smmtqm.co.uk/wp-content/uploads/sites/6/2018/11/20181120_SMMT-AQMS-FMEA-Alignment-AIAG-and-VDA_en.pdf
- https://qms.kke.co.jp/column/aiag-vda-fmea
- https://qms.kke.co.jp/column/fmea-1
- https://qms.kke.co.jp/column/drbfm
- https://publicacoes.riqual.org/wp-content/uploads/2021/06/icqem_20_514_525.pdf
- https://law.resource.org/pub/in/bis/S04/is.11137.2.1984.pdf （IEC 60812:2006の全文を含むPDF）
- https://www.toyoda-gosei.co.jp/seihin/technology/report/vol44_2/pdf/vol44_2_001.pdf
- https://catalog.lib.kyushu-u.ac.jp/opac_download_md/26064/2915_1547.pdf
- https://quality-one.com/drbfm
- https://www.nmri.go.jp/service/repository_data/PNM23060201-00.pdf
- https://www.niph.go.jp/journal/data/51-3/200251030010.pdf
- https://www.soumu.go.jp/main_content/000723626.pdf
- https://www.digital.go.jp/resources/machine-readability-rule/harunobu
- https://dev.classmethod.jp/articles/harunobu-machine-readability-excel-check
- https://arxiv.org/html/2407.09025v1
- https://arxiv.org/abs/2410.04739
- https://arxiv.org/html/2305.13062v5
- https://zmy.io/files/wsdm24-SUC.pdf
- https://arxiv.org/html/2506.13405v1
- https://aclanthology.org/2022.acl-long.454.pdf
- https://www.microsoft.com/en-us/research/publication/hitab-a-hierarchical-table-dataset-for-question-answering-and-natural-language-generation
- https://arxiv.org/html/2605.00318v1
- https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/layout?view=doc-intel-4.0.0
- https://github.com/Azure/azure-sdk-for-python/issues/36834
- https://github.com/docling-project/docling/issues/3830
- https://github.com/Unstructured-IO/unstructured/blob/main/unstructured/partition/xlsx.py
- https://qiita.com/harumiWeb/items/7e68af1d777113a981b2
- https://www.softbank.jp/biz/blog/cloud-technology/articles/202512/genai-excel

**確認できていないもの**：AIAG-VDAのヘッダ項目の正確な日本語訳、AP表の全行、JIS C 5750-4-3の本文、テンプレートの中身、TreeThinkerの改善幅。
