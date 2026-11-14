# Advanced RAG 適用指針書 ― FMEA 作成支援ケーススタディ

FMEA 作成支援 RAG を題材に、「どのデータに、どの Advanced RAG の打ち手が、どれだけ効くか」を、WSL2 上の OpenSearch で段階的に実測したケーススタディです。

- Web スライド（76 枚）: https://takenori-kusaka.github.io/advanced-rag-fmea-casestudy/
- スライド（PDF / PPTX）: [`slides/`](slides/)

> 本リポジトリのコード・文章・スライドは、生成AI（Claude）を使って作成し、筆者が確認して公開しています。

## 結果の要約

48 問の評価用質問について、回答に必要な事実（値と列名の結び付きまで含む）が検索結果の上位 5 件に揃った問数です。

| 段階 | 変えたもの | 上位 5 件 | 上位 10 件 |
| --- | --- | --- | --- |
| S0 | 1 ファイルを丸ごと渡す | 19 | 19 |
| S1 | 素朴 RAG（固定長 500 字・Dense） | 18 | 20 |
| S2 | 構造化取込（Excel ヘッダ階層・表の行・OCR） | 24 | 27 |
| S3 | ハイブリッド（BM25＋Dense、RRF） | 28 | 31 |
| S4 | 文脈ヘッダ・型番→シリーズの関係付け | 37 | 42 |
| S5 | 参照グラフ（特許の符号・付表） | 40 | 42 |
| S6 | 再ランキング | 44 | 46 |
| S7 / S8 | 親子展開／参照追跡 | 43 / 43 | 45 / 44 |

データ特性別の結果、効かなかった打ち手の分析、残った失敗の仮説演習、OpenSearch の設計はスライドを参照してください。

## 前提と限界

- コーパスは架空企業「ミナト精機（架空）」の合成データです。実在企業の公開文書の**構造**（分冊マニュアル、AIAG-VDA 形式の FMEA、特許の符号、表記ゆれのある不具合 DB など）を参考に作り、内容は複製していません。社名・製品・特許番号・数値はすべて架空です。
- 評価は検索結果に必要事実が揃うかだけを見ています。LLM の回答の正しさは測っていません。
- 48 問・各構成 1 回の実行です。1 問の差は誤差の範囲を含みます。
- 題材の FMEA 支援の入力①〜⑥の分類は、公開されているソリューションページの入出力図を参考にしました。当該製品の実装・性能とは無関係です。

## 構成

```text
corpus/   合成コーパス（Word・PDF・スキャン PDF・Excel・CSV、24 ファイル）
gen/      生成・取込・チャンク化・索引・評価のスクリプトと評価セット（gold.json）
results/  実測結果（JSON）とカテゴリ別の集計
deck/     スライドの生成スクリプト（pptxgenjs）と図
slides/   スライド（PPTX / PDF）
docs/     Web スライド（GitHub Pages）
docker/   kuromoji・ICU 入りの OpenSearch イメージ
tools/    Web スライドの生成
```

## 再現手順

Windows（Word / Excel による PDF 化）と WSL2（Ubuntu）上の Docker・Python 3.12 を想定しています。

```bash
pip install -r requirements.txt            # torch は事前に CUDA 版を入れる
# 1) 合成コーパスの生成（生成済みのものは corpus/ にあります）
python gen/gen_docs.py build/docx && python gen/gen_xlsx.py corpus && python gen/gen_scan_src.py build/scan_src
#    Word で PDF 化（Windows PowerShell）: gen/convert.ps1、スキャン化: python gen/scanify.py build/scan_pdf corpus
# 2) OCR（任意。YomiToku は CC BY-NC-SA 4.0 の非商用ライセンス）
bash gen/ocr.sh
# 3) OpenSearch の起動
docker build -t os-ja:2.19.1 docker/ && bash gen/start_os.sh
# 4) チャンク化・索引・評価
bash gen/run_all.sh                        # results/results_k5.json, results_k10.json
python gen/analyze.py 5                    # カテゴリ別・質問別の結果
```

モデル: 埋め込み `cl-nagoya/ruri-v3-310m`、再ランキング `cl-nagoya/ruri-v3-reranker-310m`（いずれも Apache-2.0）。

## ライセンス

- コード（`gen/`、`deck/*.js`、`tools/`、`docker/`）: [MIT](LICENSE)
- スライド・文章・合成コーパス・結果データ: [CC BY 4.0](LICENSE-CONTENT.md)
