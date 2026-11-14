# Research manuals and spec docs

## 依頼内容

You are a research assistant. Respond in Japanese. Goal: find REAL, publicly available documents from Japanese (or global) manufacturers that show a specific structure that breaks naive RAG, so we can model a realistic synthetic corpus for a RAG case study (FMEA-support system for a motor / motor driver / connector product line).

Research these patterns and give concrete examples with URLs, document titles, and a precise description of the structure (how the info is split, how applicability per model/series is expressed, typical table layouts, how cross-references are written):

1. "Product manual does not contain the communication spec; a separate communication manual covers a whole series/product family with per-series/per-model applicability tables" — e.g., Oriental Motor (AZ series / RS-485 / Modbus manuals, "機能編" vs "取扱説明書"), Mitsubishi Electric inverter (FR-E800 / FR-A800 取扱説明書 vs 通信 / PLC network manuals), Omron, Keyence, Yaskawa, Panasonic servo (MINAS A6 communication spec). For 2-3 good examples, describe exactly: what the product's own manual says (e.g., "詳細は別冊○○を参照"), how the common manual identifies applicable models (model-number patterns like "AZD-*", tables of 対応機種, footnotes like "※AZD-KDのみ"), and what kind of question would fail if you only search the product manual.
2. Design specifications / technical docs in Word/PDF with many embedded figures and tables where key values live only inside tables or figure captions (e.g., public specification documents, datasheets with derating curves, connector datasheets from JST / Hirose / Molex showing contact resistance, mating cycles, current rating tables by wire gauge).
3. How BOM / parts lists and product numbering schemes (型式の見方 / 品番構成) are presented (e.g., "型式の見方" tables where each character position encodes options) — this matters for entity resolution.

Use web search (WebSearch / tavily tools) and WebFetch. Read actual pages/PDF index pages where possible; do not invent document names or URLs — if unsure, say so. Keep the final report concise but specific (~800-1200 Japanese characters per pattern), and end with a list of source URLs. Do not download large files to C: drive; no need to download at all.

## 結果

## 実在メーカー文書に見る、素朴なRAGを壊す構造（調査報告）

要点：3パターンとも、パナソニック・三菱電機・オリエンタルモーター・Molex・JST の公開文書で実際に確認できました。ただし多くはPDFの抽出テキストから読み取ったもので、ページ番号や図の位置は確認していません。

### パターン1：製品マニュアルに通信仕様がなく、シリーズ共通の別冊が持っている

**例A　オリエンタルモーター AZシリーズ**
- 本体同梱のマニュアル（Motor Edition / Driver Edition）には「機能編（Function Edition）は製品に付属しません。Webでダウンロードしてください」とだけ書かれ、詳細は外に出されています。
- 機能編 HM-60262 が、AC入力とDC入力の全ドライバ共通で Modbus RTU（RS-485通信）の章、産業ネットワークの章、アドレス一覧を持っています。
- 機能編の適用範囲は、品名の列挙ではなくラベルで表されます。例：「“PULSE-I/F”と記載がある場合、以下のドライバに適用」。スイッチ設定には「(only for pulse-input type)」の注記が付き、AC用とDC用のスイッチ図が並んでいます。
- 型式専用マニュアル（miniドライバ RS-485通信タイプ HM-60440）は差分だけを持つ構成です。冒頭で「本書はこの型式固有の内容、共通の内容は機能編」と宣言し、アドレス一覧の章でも「本章にないアドレスは機能編を参照」としています。つまり1つの表が2冊に分かれています。
- カタログ側でも、ドライバ形式は AZD-□D（□＝A/C/K＝電源電圧）のようなワイルドカードで書かれ、機能比較表は ○ と脚注（例：✽1 はAZD-KX限定）で表されています。
- 製品マニュアルだけを検索すると失敗する質問の例：「AZD-KD の Modbus で運転データNo.を書き込むレジスタアドレスは？」。答えは機能編のアドレス一覧にしかなく、しかもその表には「AZD-KD」という文字列が出てきません。

**例B　三菱電機 FR-E800**
- マニュアルが用途別に分かれています：接続編 IB-0600864、機能編 IB-0600867、通信編 IB-0600870、保守編 IB-0600873、機能安全編。
- 保守編のアラーム説明には「参照資料：FR-E800 取扱説明書（機能編）・（通信編）」という書き方で参照先が載っています。
- 適用範囲は、パラメータ1行ごとの角括弧タグで示されます。例：「N600 Pr.1434 IP address 1 [E800-(SC)E]」「[E800-(SC)EPA]」。
- 記号の定義は冒頭の略語表にあります。E800＝標準仕様品（RS-485）、E800-E＝Ethernet、E800-SCE＝安全通信、EPA/EPB/EPC＝プロトコルグループ。
- 初期値も形名の末尾で変わります。Gr.1 は -1・-5・EPA、Gr.2 は -4・EPB です。
- 失敗する質問の例：「FR-E820-0.75K-1 で Modbus RTU は使える？ 局番の初期値は？」。正しく答えるには、形名の末尾 → 略語表 → 通信編のタグ、と3段階たどる必要があります。

**例C　パナソニック MINAS A6**
- 英語の技術資料「Modbus communication and Block operation Specification」が、A6／A6L（リニア・DD）／DC24/48V品の3シリーズを1冊で扱っています。
- 冒頭の「Function comparison」表は、行がシリーズ、列が型式、セルが ○ / × です。型式は品番の末尾文字（E/G/F/L/M）と CPU1/CPU2 のファームウェア版数 Ver1.13 で特定されます。
- 例として、A6SE（末尾E）はModbus経由のブロック動作が × です。さらに脚注で「feedback scale が serial absolute rotary の場合は使用不可」という条件が付きます。

### パターン2：重要な数値が表や図の中にしかない

- **JST XHコネクタ（日本語カタログ XH.pdf）**
  - 本文の「一般仕様」は「定格電流 3A（AWG#22使用時）」「接触抵抗 初期10mΩ以下／環境試験後20mΩ以下」と条件付きで書かれています。
  - 適用電線は表にしかありません。コンタクト形番（SXH-001T-P0.6 / -P0.6N / SXH-002T-P0.6）ごとに、AWG範囲・被覆外径・リール数量が並びます。
  - 注3に「-P0.6Nは嵌合力を低く設定、振動の少ない環境で使用」とあります。これは振動に関するFMEAに直結する情報ですが、脚注の中にしかありません。
- **Molex Micro-Fit 3.0（PS-43045 / PS-43650）**
  - §4.3 Current Derating の表は二次元です。行がAWG 18〜30、列が回路数（2/6/12/24）×W-W/W-B です。例：22AWG・24極・W-W は 3A、2極・W-B は 6A。
  - 注記が値の意味を変えます：「REFERENCE ONLY」「30°C温度上昇基準」「全回路通電」「補間値マーク」。
  - 加えて「Current Derating Curve」の図があり、破線部分は30°C超を意味します。
  - 試験シーケンス（EIA-364-23 接触抵抗、-09 耐久）はフローチャートの図になっています。
- **Hirose DF13**：嵌合回数（Sn 30回／Au 50回）、1A、AWG26–30 といった数値は確認しました。ただし公式の仕様書PDFはMouser経由で取得できず、詳細は未確認です。
- **FR-E800カタログ**：「50℃超は定格電流のディレーティングが必要」とだけ書かれ、具体的な曲線は別の図にあります。曲線が接続編のどのページにあるかは確認していません。

### パターン3：型式の見方（品番構成）

- **オリエンタルモーター（V-184カタログ）**：「AZD-K D」を ①種類 ②電源入力（K＝DC24/48V）③タイプ（D＝位置決め内蔵、X＝RS-485付パルス列、なし＝パルス列、EP/ED/PN＝各ネットワーク）に分解する表があります。ケーブル「CC050VZ□FB2」は8桁を分解し、④Z＝AZシリーズ用です。
- **パナソニック A6アンプ**：「M A D L N 1 5 S E ＊＊＊」を ①外形枠（MAD＝A枠…MFD＝F枠）②シリーズ（L）③セーフティ機能（N/T）④最大電流（0＝6A…B＝120A）⑤電源電圧（1/3/5）⑥I/F（S）⑦機能区分（E/F…）に分けています。モータ構造（C5…H8）は軸・ブレーキ・オイルシール・コネクタの ● マトリクスです。適用周辺機器表は「MFECA0＊＊0ETE（＊＊＝ケーブル長）」のようにワイルドカードを使っています。
- **三菱 FR-E800**：電圧クラス、構造（0＝標準）、容量（K表記と定格電流表記の2系統、例：0.75K＝0050）、末尾（-1/-4/-5/E/EPA/SCEPA）、-60/-06、基板コーティングを分解しています。末尾記号によって適用できる組合せが ＊注で制限されます。
- **JST**：「XH S-001 T P-0.6」は S＝連鎖状、001＝AWG#28–22、T＝すずめっき、P＝りん青銅です。「XHP-2」はハウジングで、2が極数です。

**合成コーパスへの示唆**：再現すべき要素は次の4つです。
- 製品マニュアルから共通別冊への「参照のみ」の記述
- 型式記号ではなくタグやラベルで書かれた適用範囲
- 末尾文字やワイルドカードを含む型式と、その分解表
- 表の脚注に置かれた条件や例外

### 情報源
- https://www.orientalmotor.com/products/pdfs/opmanuals/HM-60440-4E.pdf
- https://www.orientalmotor.com/products/pdfs/opmanuals/HM-60262E.pdf
- https://www.orientalmotor.com/products/pdfs/opmanuals/HM-60262-5E.pdf
- https://www.orimvexta.co.jp/files/OM/Document/ST/V-184.pdf
- https://www.orientalmotor.co.jp/ja/system/files?file=product_detail%2Fmanual%2FHM-60423J.pdf（AZ miniドライバ RS-485通信タイプの日本語版。資料番号と内容の対応は未確認）
- https://www.mitsubishielectric.co.jp/fa/download/search.do?q=&mode=manual&kisyu=%2Finv&category1=FREQROL-E800
- https://www.fapro.com.tw/DB/download/Mitsubishi_INV_MANUAL/E800-JP/ib0600873j.pdf（第三者ミラーの保守編）
- https://dl.mitsubishielectric.com/dl/fa/document/manual/inv/ib0600871eng/ib0600871engq.pdf
- https://www.lcautomation.com/wb_documents/Mitsubishi/Mitsubishi%20E800%20Manual%20-%20Function.pdf（第三者ミラーの機能編）
- https://dl.mitsubishielectric.co.jp/dl/fa/document/catalog/inv/l-06130/l06130g.pdf
- https://mediap.industry.panasonic.eu/assets/custom-upload/Factory%20&%20Automation/Industrial%20Motors/Manuals/mn_minas_a6_a6l_modbus_communication_pidsx_en.pdf
- https://ssi-robot.co.jp/assets/img/servo/ac-a6/minas-a6_ctlg.pdf（代理店が掲載しているパナソニックのカタログ）
- https://industry.panasonic.com/jp/ja/products/motor/fa-motor/ac-servo/a6s
- https://www.jst-mfg.com/product/pdf/jpn/XH.pdf
- https://akizukidenshi.com/goodsaffix/xh.pdf
- https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/productspecificationpdf/430/43045/PS-43045-001.pdf
- https://www.molex.com/content/dam/molex/molex-dot-com/products/automated/en-us/productspecificationpdf/436/43650/PS-43650-001.pdf
- https://www.hirose.com/eu/additional/pressreleases/df13.html
