# Research patents, scans, defect data

## 依頼内容

You are a research assistant. Respond in Japanese. Context: we are building a RAG case study for an FMEA-support system (motor / motor driver / connector products). Data sources: product info, specs/drawings/BOM, past FMEA, defect/quality info (defect DB, claims, inspection records), standards/QMS (ISO/IEC), other (customer requirements, maintenance/service info). Research the following with REAL public sources:

1. Japanese patent documents (特許公報): exact structure (【請求項】【発明の詳細な説明】【図面の簡単な説明】【符号の説明】), how figures use reference numerals (符号) with arrows/lead lines and how numeral meanings are scattered in the body text or listed in 【符号の説明】. Find 1-2 concrete real JP patents about a motor, brushless motor driver, or electrical connector (give publication number and J-PlatPat or Google Patents URL) and describe how a question like "図3の符号23は何で、どんな故障に関係するか" would require linking figure ↔ numeral ↔ body text. Also find any research or tools on figure-reference / reference-numeral linking for patents (e.g., patent figure datasets like PatFig, DeepPatent, patent drawing description generation) and any RAG approaches for them.
2. Scanned PDF / printed-and-scanned test reports in Japanese: OCR difficulties (stamps/印影, handwriting, tables with ruled lines, vertical text, low-res), and current OCR/document-parsing options with Japanese support (NDLOCR / NDL古典籍? no—focus on modern: NDLOCR-Lite, PaddleOCR, Tesseract jpn, Azure Document Intelligence, Google Document AI, Docling, Surya, YomiToku (Japanese layout OCR)). Report reported accuracies where available and which handle tables.
3. Real public defect / quality data that resembles a 不具合DB: e.g., 国土交通省 自動車のリコール届出 data, NITE 製品事故情報 (事故情報データベース), 消費者庁 事故情報データバンク, NHTSA complaints / recalls (fields available: component, summary text). Describe fields, free-text style (abbreviations, 表記ゆれ), and download availability/format/licensing (e.g., 政府標準利用規約). Prefer ones involving motors/connectors/electrical failures.
4. Standards/QMS documents: structure of IEC 60812 (FMEA), ISO 14971 risk management, ISO 9001 clause structure, and typical company QMS document hierarchy (品質マニュアル→規程→手順書→帳票), and how clause numbers/cross-references are written.

Use WebSearch / tavily tools / WebFetch. Do not invent publication numbers or URLs — verify by fetching. Final report in Japanese, ~3000 characters, structured by the 4 items, with source URLs. No downloads to C: drive.

## 結果

# 公開ソース調査レポート：FMEA支援RAG向け4項目

URLはすべて実際に取得して確認しました。ただし ISO 9001 の箇条名、ISO 14971 の引用書式、5.2.5 の箇条名、NITE の結果フィールドだけは確認できていないので、該当箇所に書いています。C: ドライブには何もダウンロードしていません。IEC 60812 のサンプルPDF（約1.1MB）だけは、WebFetch ツールが自動で C: 上の Claude 作業領域に保存しました。

## 1. 日本の特許公報：図・符号・本文のつなぎ方

**明細書の書式（特許法施行規則 様式第29）**
- 見出しの順序：【技術分野】→【背景技術】→【先行技術文献】→【発明の概要】（その中に【発明が解決しようとする課題】【課題を解決するための手段】【発明の効果】）→【図面の簡単な説明】→【発明を実施するための形態】→【実施例】→【産業上の利用可能性】→【符号の説明】
- 段落には【0001】形式の4桁番号を振ります。【特許請求の範囲】の【請求項n】は明細書とは別書類です。
- 出典：https://laws.e-gov.go.jp/data/MinisterialOrdinance/335M50000400010/608806_1/pict/2JH00000226584.pdf

**具体例1：JPH0782887B2「コネクタの端子不完全挿入防止構造」（矢崎総業）**
- URL：https://patents.google.com/patent/JPH0782887B2/ja
- 【符号の説明】に載っているのは主要な9符号だけです（2 コネクタハウジング、9 端子係止アーム、18 端子、20 係止段部 など）。
- 1、5、11、26（ゴム栓）などは本文中にしか定義がありません。
- 故障との関係は本文に書かれています。例：「図６に端子挿入が不完全な状態を示す如く、端子１８は…係止段部２０に係合せず」
- つまり「図6の符号18は何で、どんな故障に関係するか」に答えるには、次の3つを結合する必要があります。
  1. 【図面の簡単な説明】の「図6＝不完全挿入時の縦断面図」
  2. 符号の説明の「18＝端子」
  3. 本文の不完全挿入（半嵌合）の記述。故障としては抜けや接触不良につながります。

**具体例2：JP2004304905A「センサレスブラシレスモータの駆動回路」（ミツバ）**
- URL：https://patents.google.com/patent/JP2004304905A/ja
- 符号：1 制御部、3 センシング部、3b CR移相回路、4 ブラシレスモータ
- 故障に関する語は「脱調」「始動失敗」です。「故障」という語は本文に出てきません。故障語の同義語展開が必要になります。

**符号の説明は網羅されていない**
- 日本弁理士会の『パテント』誌記事によると、特許庁の作成要領上【符号の説明】は主要部分だけを書く欄で、全符号は載らず、誤記もあります。
- 同記事では、図面画像から符号を抽出して本文と照合する誤記検出ソフトも評価されています。
- 出典：https://jpaa-patent.info/patents_files_old/201401/jpaapatent201401_070-079.pdf

**関連研究・データセット**
- **PatFig**（ICCVW 2023）：約3万図、1.1万特許。図ごとに符号と用語の組が付いています。docTR で図中の数字を抽出して説明文と照合した精度は72.08%でした。
  https://openaccess.thecvf.com/content/ICCV2023W/CLVL/papers/Aubakirova_PatFig_Generating_Short_and_Long_Captions_for_Patent_Figures_ICCVW_2023_paper.pdf
- **PatentDesc-355K / PatentLMM**（AAAI 2025）：図をまたいだ参照で幻覚が起きることを課題として挙げ、文書全体で図同士をつなぐことを提案しています。
  https://arxiv.org/html/2501.15074v1
- **DeepPatent**（WACV 2022）：米国意匠特許の図面35万枚以上を使った検索用データセットです。ラベルは付いていません。
  https://github.com/GoFigure-LANL/DeepPatent-dataset
- **DeepPatent2**：https://www.nature.com/articles/s41597-023-02653-7
- **サーベイ**（ACL 2025）：https://aclanthology.org/2025.acl-long.419.pdf
- 特許図面向けの RAG を直接扱った研究は見つかりませんでした。サーベイでも RAG は今後の方向性として触れられている程度です。

**示唆**：図OCRで得た符号と、符号の説明＋本文から正規表現で取り出した「名称＋符号」の辞書をつなぐ、符号のグラフを作ると有効です。

## 2. スキャンされた日本語試験報告書のOCR

**よくある難所**
- 印影の重なり：リコーは前処理で印影を除去しています。
  https://www.ricoh.co.jp/service/cloud-ocr/column/aiocr-digitalization
- 罫線の縦棒を「1」や「|」と誤認識する、手書き、傾き。推奨解像度は200〜300dpiです。
  https://business.ntt-east.co.jp/column/service/rpa_aiocr/ocr.html
- 表の罫線抽出やルビによる誤認識（JEITA の用語集）：https://home.jeita.or.jp/terminal/file/ocr_catalogue_202103.pdf

**日本語手書きメモ6枚での比較（NLS、高いほど良い）**
出典：https://github.com/nyosegawa/ocr-comparison

| ツール | NLS |
|---|---|
| Gemini 3.5 Flash | 0.927 |
| YomiToku | 0.842 |
| Azure AI Vision | 0.830 |
| Google Cloud Vision | 0.820 |
| NDLOCR-Lite | 0.443 |
| PaddleOCR | 0.353 |

6枚しかないので参考値です。Azure Document Intelligence と Google Document AI はこの比較に入っていません（入っているのは Azure AI Vision と Google Cloud Vision）。

**各ツールの状況**
- **YomiToku**：表構造の認識、縦書き、手書きに対応し、HTML・Markdown・JSON・CSV で出力できます。OSS版のライセンスは CC BY-NC-SA 4.0 で、商用利用には有償ライセンスが必要です。この CC BY-NC-SA 4.0 表記は上記の比較表から取ったもので、公式ページ側ではライセンス条文を確認できていません。
  https://kotaro-kinoshita.github.io/yomitoku
- **NDLOCR-Lite**：2026年2月公開、GPU不要、CC BY 4.0。手書きは実験的な対応です。
  https://lab.ndl.go.jp/news/2025/2026-02-24
- **PaddleOCR**：PP-OCRv5 の日本語シナリオで精度が向上しています（論文の表あり）。後継の PP-OCRv6（2026年6月）は1つのモデルで日本語を含む50言語に対応し、印影（seal）認識も強化されています。
  https://arxiv.org/html/2603.24373v1 、https://github.com/PADDLEPADDLE/PADDLEOCR
- **Surya 2**：日本語86.2%（社内評価）。表認識にも対応しています。
  https://www.datalab.to/blog/surya-2
- **Docling**：日本語の OCR 部分は Tesseract（jpn）が現実的です。CPU 上の TableFormer は罫線のない表が苦手です。
  https://github.com/docling-project/docling/issues/3451
- **Azure Document Intelligence**：Layout モデルが日本語の手書きと表に対応しています。
  https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/language-support/ocr?view=doc-intel-4.0.0
- **Google Document AI**：Enterprise OCR が手書きに対応し、Layout Parser が表と RAG 向けのチャンク分割に対応しています。
  https://cloud.google.com/document-ai/docs/layout-parse-chunk

## 3. 公開されている不具合データ

**国交省 自動車不具合情報（連ラクダ）**
- 項目：番号、受付日、車名、型式、原動機型式、不具合装置（例：制動装置）、発生時期、申告内容の要約（自由記述）
- 2008年以降のデータを Web で検索できます。
- 一括ダウンロードの公式窓口は見つかっていません。Qiita には JSON/CSV に変換して取得する例があります。
- 利用条件は国交省サイトの規約で、公共データ利用規約（PDL1.0）です。出典の明記と、加工した場合はその旨の記載が必要です。
- URL：https://renrakuda.mlit.go.jp/renrakuda/opn.html 、https://qiita.com/oyahiroki/items/82dfa40c036fa2aa7074 、https://www.mlit.go.jp/link.html
- リコール届出の分析PDF（装置別、原因別、設計／製造の区分）：https://renrakuda.mlit.go.jp/renrakuda/data.html

**NHTSA complaints（米国）**
- FLAT_CMPL.zip（359MB）、タブ区切り、パブリックドメイン
- 部品名は COMPDESC、自由記述の苦情本文は CDESCR（最大2048字）。そのほか CRASH、FIRE、INJURED、MILES などがあります。
- URL：https://www.nhtsa.gov/nhtsa-datasets-and-apis 、項目定義は https://static.nhtsa.gov/odi/ffdd/cmpl/CMPL.txt

**NITE SAFE-Lite**
- 1996年度以降の製品事故を、フリーワードや項目で検索できます。非重大事故には A〜G の事故原因区分が付いています。
- CSV 出力については記載が見当たりませんでした。
- URL：https://www.nite.go.jp/jiko/jikojohou/safe-lite.html

**経産省 重大製品事故検索**
- 自由記述の項目は「事故内容」「事故原因」「再発防止対策」の3つです。
- URL：https://www.meti.go.jp/product_safety/kensaku/index.html

**消費者庁 事故情報データバンク**
- 約17万件。政府資料自体が「同一企業名・商品名が異なる文言で入力されている」と表記ゆれを課題に挙げています。
- URL：https://www.cao.go.jp/consumer/history/04/kabusoshiki/anzen/doc/027_170123_sankou4_1_2.pdf

## 4. 規格とQMS文書

**IEC 60812:2018**（iTeh のサンプルの目次で確認）
- 1 適用範囲、2 引用規格、3 用語、4 概要
- 5 Methodology：5.2 Plan（目的と範囲、境界とシナリオ、処置の判断基準、文書化要件）、5.3 Perform（5.3.3 機能の特定、5.3.4 故障モード、5.3.5 検出方法と既存管理策、5.3.6 局所影響と最終影響、5.3.7 原因、5.3.8 重要度の評価、5.3.9 処置）、5.4 Document
- 附属書：A テーラリング、B 致命度分析（マトリクス、RPN）、C 報告書の例（データベースから生成する電源ユニットの例）、D 他の手法との関係、E ソフトウェア／プロセス FMEA、F 業界ごとの例
- URL：https://cdn.standards.iteh.ai/samples/21903/331059ef02794b548d049d58b18e456f/IEC-60812-2018.pdf

**ISO 14971:2019**
- 4 一般要求（4.5 リスクマネジメントファイル：ハザードごとのトレーサビリティ）、5 リスク分析、6 リスク評価、7 リスクコントロール、8 全体的な残留リスク、9 レビュー、10 製造・製造後の活動
- URL：https://simplerqms.com/iso-14971

**ISO 9001**
- 2026年9月16日に第6版 ISO 9001:2026 が発行されています。移行期間は約3年の見込みです。
- 箇条の骨格は4〜10の10箇条ですが、2015年版の名称（4 組織の状況 〜 10 改善）は一般知識に基づくもので、2026年版の目次は確認していません。
- URL：https://www.iso.org/standard/9001

**社内QMSの文書階層**
- 一次：品質マニュアル（2015年版以降は任意）→ 二次：規程 → 三次：手順書・要領 → 様式・記録
- 文書番号は「PR-01」のような体系で振り、相互参照は「参照主義」（コピーせず参照する）が推奨されています。
- 未記入の帳票は「文書」、記入済みは「記録」として区別されます。
- URL：https://ninsho-partner.com/iso9001/column/iso9001_documents_point 、https://jpn.nec.com/nsi/sl/procenter/column/iso_document_management.html
- 規格の引用は「7.5.1」のような箇条番号で行われます。

**示唆**：箇条番号をそのままメタデータにして階層型のチャンクに分け、品質マニュアルの箇条と ISO の箇条の対応表を相互参照のエッジとして持たせる設計が有効です。

## 未確認の点
- NITE と国交省の公式な一括ダウンロード窓口は見つかっていません。
- IEC 60812 の 5.2.5 の箇条名はPDFから文字を取り出せず、確認できていません。
