// Part 2: techniques
module.exports = (L) => {
  const { pres, C, SH, MUTED, HEX } = L;

  L.section('Part 2 手法各論');
  L.divider('PART 2', '手法各論', 'パイプラインの上流から順に、各手法の「仕組み・効く条件・限界・採用判断」を押さえる', ['取込とチャンクで何が失われ、どう補うか？', 'ハイブリッド検索と再ランキングはなぜ基本か？', 'GraphRAG・Agentic RAG はどんな質問に効くのか？', '学習・マルチモーダル・長文はいつ検討するか？'], 'Part 2は8つの章からなります。2-A 取込・チャンク、2-B 検索・再ランキング、2-C クエリ変換、2-D 階層・グラフ、2-E Agentic、2-F 学習、2-G マルチモーダル、2-H 長文・圧縮です。各章の最後に元レポートの採用判断を置いています。');

  // ===== 2-A Ingestion & chunking =====
  {
    const s = L.content('2-A 取込：構造を残すことが高度化の出発点', {
      stages: [0],
      lead: 'OCR で文字だけ抜くと、表の行列関係・図とキャプション・段組み・見出し階層が失われる',
      src: 'Scaling Beyond Context（ACL 2026 文書 Multimodal RAG サーベイ）、Thoughtworks Radar: Docling（2026年4月 Trial）',
      notes: '企業文書の多くはPDFやスライドで、表や図に重要情報があります。単純なテキスト抽出では、表のセルが一列に並んで「どの数字がどの行・列か」が分からなくなり、二段組みの文が交互に混ざり、見出しの階層が消えます。ACL 2026のサーベイは、OCRベース処理による構造情報の損失と、マルチモーダルモデルで直接扱う場合のコンテキスト処理の課題の両方を整理しています。Doclingは2026年4月にThoughtworks RadarでTrialになった文書変換ツールですが、比較可能な精度数値はないため、構造化取込を試す実務的根拠として扱います。',
    });
    L.T(s, 'テキスト化で失われるもの', { x: 0.6, y: 2.0, w: 5.8, h: 0.4, fontSize: 16, bold: true, color: C.accent3, margin: 0 });
    const lost = [['MdTableChart', '表の行列関係', '「どの値がどの行・列か」が消える'], ['MdImage', '図とキャプション', '図中の情報と説明の対応が切れる'], ['MdViewColumn', '段組み', '二段組みの文が交互に混ざる'], ['MdFormatListNumbered', '見出し階層', '「第3章 2節の例外規定」が分からない']];
    lost.forEach((r, i) => {
      const y = 2.5 + i * 0.9;
      L.icon(s, r[0], 0.6, y, 0.6, C.accent3);
      L.T(s, r[1], { x: 1.35, y, w: 2.0, h: 0.6, fontSize: 15, bold: true, valign: 'middle', margin: 0 });
      L.T(s, r[2], { x: 3.35, y, w: 3.1, h: 0.6, fontSize: 13, valign: 'middle', margin: 0 });
    });
    L.card(s, { x: 6.9, y: 2.0, w: 5.8, h: 2.55, icon: 'MdLayers', color: C.accent4, title: '残すべき構造と取込方式', titleSize: 16, body: ['レイアウト解析で見出し・段落・表・図を識別', '表は行列構造（HTML/Markdown 表等）で保持', '図表主体ならページ画像検索を併用（2-G）', '抽出方式とページ画像検索を用途で使い分ける'], bodySize: 13 });
    L.note(s, 'tip', 'Docling 等の構造化取込ツールは「試す価値がある」段階。自社の代表文書 20〜50 件で抽出結果を目視確認してから全量投入する', { x: 6.9, y: 4.75, w: 5.8, h: 1.25, size: 13, label: 'ポイント（実務の目安は補足）' });
  }

  {
    const s = L.content('2-A 共通メタデータ：原文に戻れる設計にする', {
      stages: [0, 5],
      lead: '本文だけを保存しない。検索用表現と実際に引用する原文を分離し、後段で原文・版・権限に戻れるようにする',
      src: '元レポート「構造を残すことを高度化の出発点にする」（本レポートの提案）',
      notes: '元レポートが提案する共通メタデータです。document_idとversionで「どの文書のどの版か」を、pageとsection_pathとオフセットで「その中のどこか」を特定できます。parent_idは親子検索で親チャンクを読むために使います。ACLと有効日は検索境界の制御に必須です。これらを最初のスキーマに入れておかないと、後から引用表示・削除反映・権限制御を実装する際に全件の再取込が必要になります。リーダーとしては、最初の設計レビューでこのスキーマを必ず確認してください。',
    });
    L.table(s, [
      ['フィールド', '用途', '無いと起きること'],
      ['document_id ／ version', 'どの文書のどの版か', '古い版の回答、削除が派生データに伝播しない'],
      ['page ／ section_path', '引用の表示、章節での絞込み', '「どこに書いてあるか」を示せない'],
      ['原文オフセット（start/end）', '文単位の引用・検証', '主張と原文の照合ができない'],
      ['parent_id', '親子検索で親チャンクを読む', '小さすぎるチャンクで文脈不足'],
      ['ACL（閲覧権限）', '検索前・返却前の権限制御', '権限外の情報が回答に混入'],
      ['有効日（施行・失効）', '質問時点に有効な情報を選ぶ', '廃止済み規程で回答'],
    ], { x: 0.6, y: 1.95, w: 8.1, colW: [2.7, 2.6, 2.8], fontSize: 13, rowH: 0.56 });
    L.card(s, { x: 9.0, y: 1.95, w: 3.7, h: 3.95, icon: 'MdDataObject', color: C.accent5, title: 'Evidence の型（例）', titleSize: 15, body: [{ text: 'sourceId\nversion\nlocator { page, start, end }\noriginalText\n\n// 生成した索引用説明や要約は\n// originalText に混ぜない', options: { fontFace: L.MONO, fontSize: 12 } }] });
    L.note(s, 'leader', '初期スキーマに入れ忘れると、後から全件再取込になる。最初の設計レビューの必須項目にする', { x: 0.6, y: 5.95, w: 12.1, h: 0.7, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-A 分割方法に普遍的な正解はない', {
      stages: [0, 1],
      lead: '最良の分割法はタスクで入れ替わった：コーパス検索は段落分割、文書内検索は LLM 話題分割',
      src: 'Beyond Chunk-Then-Embed（2026, arXiv:2602.16974）',
      notes: '2026年のBeyond Chunk-Then-Embedは、6種の分割法と4種の埋め込みモデルで、文書内検索（ある文書の中から該当箇所を探す）とコーパス検索（大量の文書から探す）を比較しました。コーパス検索では単純な段落分割が複数のモデルで強く、文書内検索ではLLMによる話題分割が強いという結果でした。つまり「Semantic Chunkingを入れれば精度が上がる」という一般論は支持されません。自社のタスクがどちらに近いかを見極め、構造ベースの分割をまず試し、比較で判断します。',
    });
    L.card(s, { x: 0.6, y: 2.0, w: 5.9, h: 2.4, icon: 'MdLibraryBooks', title: 'コーパス検索（大量の文書から探す）', titleSize: 15, body: [['強かった分割：', '単純な段落分割（複数モデルで）'], ['示唆：', '構造に沿った素直な分割が良い出発点']], bodySize: 14 });
    L.card(s, { x: 6.8, y: 2.0, w: 5.9, h: 2.4, icon: 'MdFindInPage', color: C.accent6, title: '文書内検索（1文書の中から探す）', titleSize: 15, body: [['強かった分割：', 'LLM による話題分割'], ['示唆：', '文書内の位置特定は意味的な境界が効く']], bodySize: 14 });
    L.note(s, 'warn', '「Semantic Chunking（意味の切れ目で分割）を入れれば改善する」という一般化は支持されない。タスク種別ごとに比較する', { x: 0.6, y: 4.6, w: 12.1, h: 0.8, size: 14, valign: 'middle' });
    L.note(s, 'decide', '構造ベース分割・見出し付加・親子検索をまず比較対象にする。特定のチャンク長を全用途に一律指定しない', { x: 0.6, y: 5.6, w: 12.1, h: 0.85, size: 14, valign: 'middle' });
  }

  {
    const s = L.content('2-A チャンク長：最適値はデータと質問の型で動く', {
      stages: [0, 1],
      lead: '最近の比較では、最適な長さは 64〜1024 トークンの間で動く。各社の既定値も 300〜1024 とばらばら',
      src: 'Rethinking Chunk Size for Long-Document Retrieval（arXiv:2505.21700）、NVIDIA Technical Blog「Finding the Best Chunking Strategy」、Chroma Research「Evaluating Chunking Strategies」、各社ドキュメント（AWS Bedrock、Azure AI Search、OpenAI file search、Vertex AI RAG Engine）',
      notes: 'チャンクの長さを系統的に比べた最近の研究です。2025 年の Rethinking Chunk Size は、64 から 1024 トークンの固定長を 6 つのデータセットで比べ、事実を短く答える質問（SQuAD など）では 64〜128 トークン、広い文脈が要る質問（NarrativeQA など）では 512〜1024 トークンが有利だと報告しました。NarrativeQA の Recall@1 は 64 トークンで 4.2%、1024 トークンで 10.7% でした。最適値は埋め込みモデルによっても変わりました。NVIDIA の自社パイプラインでの比較では、ページ単位の分割が平均精度 0.648 で最も良く、ばらつきも最小でした。事実型は 256〜512、分析型は 1024 かページ単位が良く、128 や 2048 のような極端な値は負けました。Chroma の比較では、重なりの多い設定は取得した文脈の無駄が増えると報告されています。各社の既定値も 300 から 1024 トークンまでばらついており、それ自体が「唯一の正解はない」ことを示しています。NVIDIA と Chroma はベンダー自身の計測です。',
    });
    L.table(s, [
      ['資料', '結論（条件）'],
      ['Rethinking Chunk Size（2025）', '事実を短く答える質問は 64〜128、広い文脈が要る質問は 512〜1024 トークンが有利。埋め込みモデルでも最適値が変わる'],
      ['NVIDIA（自社パイプライン）', 'ページ単位が平均 0.648 で最良・最も安定。事実型は 256〜512、分析型は 1024 かページ。128 と 2048 は負けた'],
      ['Chroma（自社評価）', '重なりを減らすと取得文脈の無駄が減る。OpenAI 既定 800/400 相当は多くの指標で下位'],
      ['Semantic Chunking の評価（2024）', '意味の切れ目で分割しても、計算コストに見合う一貫した改善はない'],
    ], { x: 0.6, y: 1.95, w: 7.6, colW: [2.5, 5.1], fontSize: 12, rowH: 0.78 });
    L.table(s, [
      ['サービス', '既定の長さ／重なり'],
      ['Amazon Bedrock KB', '300 トークン／20%'],
      ['Azure AI Search（推奨）', '512 トークン／25%'],
      ['OpenAI file search', '800 トークン／400'],
      ['Vertex AI RAG Engine', '1,024 トークン／256'],
    ], { x: 8.5, y: 1.95, w: 4.2, colW: [2.2, 2.0], fontSize: 12, rowH: 0.62 });
    L.note(s, 'leader', 'チャンク長は「評価で決めるパラメータ」。128〜1024 トークンを候補に、質問の型ごとに測る。既定値はただの出発点', { x: 8.5, y: 5.2, w: 4.2, h: 1.3, size: 12 });
  }

  {
    const s = L.content('2-A 長文コンテキスト時代の見直し：小さく検索して大きく読む', {
      stages: [0, 1, 3],
      lead: 'LLM は 128k〜1M 読めるようになったが、1 ベクトルに詰めるほど検索は粗くなる。検索単位と読取単位を分ける',
      src: 'Microsoft Tech Community「Azure AI Search: Outperforming vector search with hybrid retrieval and reranking」（自社評価）、LongRAG（arXiv:2406.15319）、Dense X Retrieval（arXiv:2312.06648）',
      notes: 'コンテキスト長が大きくなって変わったのは、LLM に読ませる単位と量です。検索の単位は今も小さめが有利です。Microsoft の評価では、1 つのベクトルに入れるトークン数を 512 から 1024、4096、8191 と増やすと、上位 50 件の再現率は 42.4 から 37.5、36.4、34.9 と下がりました。長い文章を 1 本のベクトルに平均すると、細かい意味がぼやけるためです。一方、LongRAG は、約 4,000 トークンの大きな単位で検索し、長文を読めるモデルに渡すと、NQ で上位 1 件の回答再現率が 52.24% から 71.69% に上がったと報告しています。ただしこれは読み手に長文モデルを使う前提で、少ない件数で済むという話です。Dense X Retrieval は逆に、命題という非常に小さな単位で検索すると、教師なし検索器で上位 20 件の再現率が平均 10.1 ポイント上がると報告しています。まとめると、小さな単位で正確に見つけ、親のセクションやページを長めに読ませる、という親子検索の形が、長文時代の標準的な答えです。',
    });
    L.bar(s, { x: 0.6, y: 1.95, w: 6.2, h: 4.1, labels: ['512', '1,024', '4,096', '8,191'], values: [42.4, 37.5, 36.4, 34.9], title: 'Microsoft（自社評価）：1 ベクトルのトークン数と Recall@50', min: 0, max: 50, colors: [HEX.accent5], fmt: '0.0' });
    L.T(s, '横軸：1 つのベクトルに入れたトークン数', { x: 0.6, y: 6.1, w: 6.2, h: 0.3, fontSize: 10, color: MUTED, margin: 0 });
    L.card(s, { x: 7.1, y: 1.95, w: 5.6, h: 2.2, icon: 'MdCallSplit', color: C.accent1, title: '小さく検索して大きく読む', titleSize: 15, body: ['検索：段落・100〜300 トークン程度の子チャンク', '読取：親のセクションやページを返す（2-A 親子検索）', '埋め込みの入力上限まで詰めない'], bodySize: 13 });
    L.stat(s, { x: 7.1, y: 4.3, w: 2.7, value: '52 → 72%', size: 26, vh: 0.6, label: 'LongRAG：約 4K トークン単位で検索し長文モデルで読む（NQ、上位 1 件）', lh: 0.95, lsize: 11 });
    L.stat(s, { x: 10.0, y: 4.3, w: 2.7, value: '+10.1pt', size: 26, vh: 0.6, color: C.accent6, label: 'Dense X：命題単位で検索（教師なし検索器、Recall@20）', lh: 0.95, lsize: 11 });
  }

  {
    const s = L.content('2-A 文脈は「件数 k × チャンク長」の予算：入れすぎると下がる', {
      stages: [1, 2, 3],
      lead: '取得を増やすと再現率は上がり続けるが、回答品質は途中で頭打ち・低下する。予算は使い切らない',
      src: 'Databricks Blog「Long Context RAG Performance of LLMs」（自社評価、2024）、OP-RAG（arXiv:2409.01666）、Self-Route（arXiv:2407.16833）、Anthropic「Contextual Retrieval」',
      notes: '文脈に入れる量は、取得件数とチャンク長の掛け算です。Databricks の測定では、512 トークンのチャンクを増やしていくと、再現率は 2k トークンで 0.468、8k で 0.788、32k で 0.894、128k で 0.950 と上がり続けました。一方で回答の正しさは、2024 年当時のモデルでは Llama-3.1-405B が 32k、GPT-4 が 64k を超えると下がりました。新しいモデルでは低下が小さくなっています。OP-RAG は、128 トークンのチャンクを原文の順序のまま並べて 16k トークン渡すと F1 が 44.43、全文の約 117k トークンを直接入れると 34.26 で、絞った方が良い結果でした。Self-Route は、全文を読ませる方法は平均では RAG を上回るが費用が高く、質問ごとに振り分けると費用を大きく削れると報告しています。Anthropic は、知識ベースが 20 万トークン未満なら、RAG を使わずに全部プロンプトに入れることも勧めています。まず RAG が要るかを判断し、要るなら k とチャンク長を合わせて予算として測ります。',
    });
    L.bar(s, { x: 0.6, y: 1.95, w: 6.0, h: 3.9, labels: ['2k', '8k', '32k', '128k'], values: [0.468, 0.788, 0.894, 0.950], title: 'Databricks（自社評価）：文脈トークン量と再現率', min: 0, max: 1, colors: [HEX.accent1], fmt: '0.00' });
    L.T(s, '再現率は上がり続けるが、回答品質は 2024 年のモデルで 32k〜64k を超えると低下', { x: 0.6, y: 5.9, w: 6.0, h: 0.5, fontSize: 11, color: C.accent3, margin: 0 });
    L.stat(s, { x: 6.9, y: 1.95, w: 5.8, value: 'F1 44.4 vs 34.3', size: 30, vh: 0.7, color: C.accent6, label: 'OP-RAG：128 トークン片を原文順に 16k 渡す vs 全文約 117k を直接入れる（Llama3.1-70B）', lh: 0.65, lsize: 12 });
    L.card(s, { x: 6.9, y: 3.5, w: 5.8, h: 3.0, icon: 'MdRule', color: C.accent2, title: '運用の目安', titleSize: 15, body: ['知識ベースが 20 万トークン未満なら、全文投入も候補（Anthropic）', '使うなら k とチャンク長を「予算」として一緒に測る', '重なりは 10〜25% から。増やすと文脈の無駄も増える', 'モデルを更新したら、頭打ちの点を測り直す'], bodySize: 13 });
  }

  {
    const s = L.content('2-A 親子検索：検索の粒度と読解の粒度を分ける', {
      stages: [1, 2],
      lead: '小さな単位で正確に見つけ、親セクションや近隣文を後から読む。ただし広げすぎない上限を設ける',
      src: '元レポート、A-RAG（文検索と親チャンク読取の分離）',
      notes: '小さなチャンクは埋め込みが焦点を持つので検索精度が上がりやすい一方、それだけを渡すと前後の条件や主語が欠けます。大きなチャンクは文脈が豊富ですが、検索時に意味がぼやけます。親子検索はこのジレンマを、検索は小さな単位、読解は親の単位で行うことで解消します。A-RAGも文単位の検索と親チャンクの読取を別のツールとして分けています。注意点は、親を無条件に広げるとトークン量とノイズが増えることで、親の最大長や件数に上限を設けます。',
    });
    // diagram: parent doc with children
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 0.6, y: 2.0, w: 5.6, h: 3.9, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 } });
    L.T(s, '親チャンク：第4章 2節「休暇の繰越」', { x: 0.8, y: 2.1, w: 5.2, h: 0.45, fontSize: 14, bold: true, color: C.accent5, margin: 0 });
    const kids = ['子1：繰越の対象となる休暇の種類…', '子2：繰越上限は20日とする。ただし…', '子3：前項の例外として、育児休業中は…', '子4：申請手続きは人事システムで…'];
    kids.forEach((k, i) => {
      const hit = i === 1;
      L.box(s, k, { x: 0.9, y: 2.65 + i * 0.78, w: 5.0, h: 0.6, fill: hit ? C.accent1 : C.background1, color: hit ? C.background1 : C.text1, lineColor: hit ? C.accent1 : L.BORDER, fontSize: 13, bold: hit, align: 'left' });
    });
    L.T(s, '① 子で検索してヒット', { x: 6.4, y: 3.25, w: 2.6, h: 0.4, fontSize: 13, bold: true, color: C.accent1, margin: 0 });
    L.T(s, '② 親（または近隣の子）を読む → 「ただし」「例外」の条件も文脈に入る', { x: 6.4, y: 3.7, w: 2.6, h: 1.4, fontSize: 13, margin: 0 });
    L.card(s, { x: 9.2, y: 2.0, w: 3.5, h: 3.9, icon: 'MdTune', color: C.accent2, title: '設計パラメータ', titleSize: 15, body: ['子の単位（文・段落）', '親の単位（節・ページ）', '親の最大トークン数', '同一親の重複排除', '近隣の何文まで読むか'], bodySize: 13 });
    L.note(s, 'warn', '親を無条件に広げると、トークン量とノイズが増えて Lost in the Middle（2-H）や費用増を招く', { x: 0.6, y: 6.0, w: 12.1, h: 0.62, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-A Contextual Retrieval：チャンクに文脈説明を前置する', {
      stages: [0, 1],
      lead: '文書全体とチャンクを LLM に渡し、50〜100 トークンの説明を生成してチャンクの前に付けてから索引化する',
      src: 'Anthropic, Introducing Contextual Retrieval（開発元評価）',
      notes: 'チャンク化で失われがちなのは「どの会社の」「いつの」「何についての」記述かという文脈です。例えば「前四半期比で売上が3%増加した」というチャンクだけでは、どの企業のどの期の話か分かりません。Contextual Retrievalは、文書全体とチャンクをLLMに渡して、そのチャンクの位置付けを説明する短い文を生成し、チャンクの前に付けてから埋め込みとBM25の両方に索引化します。注意点は、この説明文はLLMの生成物であり誤りを含み得ることです。原文とは別のフィールドに保存し、引用には原文だけを使います。',
    });
    L.box(s, '文書全体', { x: 0.6, y: 2.1, w: 2.0, h: 0.7, fill: C.accent5 });
    L.box(s, 'チャンク', { x: 0.6, y: 3.0, w: 2.0, h: 0.7, fill: C.accent5 });
    L.arrow(s, 2.65, 2.9, 0.55, 'r');
    L.box(s, 'LLM で文脈説明を生成', { x: 3.25, y: 2.5, w: 2.3, h: 0.8, fill: C.accent6, fontSize: 13 });
    L.arrow(s, 5.6, 2.9, 0.55, 'r');
    L.box(s, '説明＋チャンク', { x: 6.2, y: 2.5, w: 2.0, h: 0.8, fill: C.accent1 });
    L.arrow(s, 8.25, 2.75, 0.55, 'r'); L.arrow(s, 8.25, 3.1, 0.55, 'r');
    L.box(s, 'Contextual Embedding', { x: 8.85, y: 2.15, w: 3.85, h: 0.6, fill: C.accent1, fontSize: 13 });
    L.box(s, 'Contextual BM25', { x: 8.85, y: 2.95, w: 3.85, h: 0.6, fill: C.accent1, fontSize: 13 });
    // example
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 0.6, y: 4.05, w: 7.6, h: 2.45, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    L.T(s, '変換例（イメージ）', { x: 0.85, y: 4.15, w: 4, h: 0.4, fontSize: 13, bold: true, color: MUTED, margin: 0 });
    L.T(s, [{ text: '元のチャンク：', options: { bold: true, breakLine: true } }, { text: '「前四半期比で売上は3%増加した。」', options: { breakLine: true } }, { text: '前置後：', options: { bold: true, breakLine: true } }, { text: '「本チャンクは ACME 社の 2023年第2四半期決算報告の一部で、同期の売上動向を述べている。」＋元のチャンク', options: { color: C.accent1 } }], { x: 0.85, y: 4.55, w: 7.15, h: 1.9, fontSize: 14, margin: 0, paraSpaceAfter: 4 });
    L.note(s, 'warn', '説明文は LLM の生成物。原文と別フィールドに保存し、引用・検証には原文だけを使う。全チャンク分の LLM 呼出し費用と再索引時の再生成も見積もる', { x: 8.5, y: 4.05, w: 4.2, h: 2.45, size: 13 });
  }

  {
    const s = L.content('2-A Contextual Retrieval の効果をどう読むか', {
      stages: [1, 2, 4],
      lead: '上位20件の検索失敗率。基準は「埋め込みのみ」で、−49% には BM25 を足した効果も含まれる。開発元評価',
      src: 'Anthropic, Introducing Contextual Retrieval（開発元評価、1−Recall@20）',
      notes: 'Anthropicの開発元評価では、通常方式の上位20件の検索失敗率5.7%が、Contextual EmbeddingsとContextual BM25の併用で2.9%、さらに再ランキングを加えると1.9%になりました。相対で49%と67%の低下です。ただしこれは検索の失敗率であり、最終回答の正解率が同じ割合で改善することを示したものではありません。また開発元による評価なので、元レポートの採用レーダーではTrial扱いです。自社データで、見出し付加などの安価な方法と比較して効果を確認するのが筋です。',
    });
    L.bar(s, { x: 0.6, y: 1.95, w: 7.2, h: 4.6, labels: ['埋め込みのみ\n（基準）', '文脈付き\n埋め込み', '＋文脈付き\nBM25', '＋再ランキング'], values: [5.7, 3.7, 2.9, 1.9], title: '上位20件の検索失敗率（%、低いほど良い）', max: 7, fmt: '0.0"%"' });
    L.stat(s, { x: 8.2, y: 2.0, w: 4.5, value: '相対 −49%', size: 34, vh: 0.75, label: '文脈付き埋め込み＋文脈付き BM25（5.7%→2.9%）', lh: 0.4 });
    L.stat(s, { x: 8.2, y: 3.25, w: 4.5, value: '相対 −67%', size: 34, vh: 0.75, label: '再ランキング併用（5.7%→1.9%）', lh: 0.4 });
    L.note(s, 'decide', '本資料の採用レーダー（Part 5）では Trial＝実データで限定導入。主語・時点・主題が抜け落ちる文書に有望。見出し付加・親子検索と比較し、Late Chunking とは同時導入せず片方ずつ検証する', { x: 8.2, y: 4.6, w: 4.5, h: 1.95, size: 13 });
  }

  {
    const s = L.content('2-A 文脈は「何を付けるか」で選ぶ：LLM 生成か、機械的な見出しか', {
      stages: [0, 1],
      lead: 'LLM に説明を書かせなくても、文書名・会社名・年度・章のパスを機械的に前置するだけで大きく伸びた報告がある',
      src: 'Anthropic「Contextual Retrieval」（自社評価）、Utilizing Metadata for Better RAG（arXiv:2601.11863、ECIR 2026）、Summary-Augmented Chunking（arXiv:2510.06999）、dsRAG（Contextual Chunk Headers、自社評価）',
      notes: 'チャンクに付ける文脈には、大きく 3 種類あります。1 つ目は Anthropic の Contextual Retrieval のように、LLM が文書全体とチャンクを読んで、そのチャンクの位置づけを説明する文を書く方法です。2 つ目は、文書のタイトル、会社名、年度、章のパスなどのメタデータを、機械的にチャンクの先頭に付ける方法です。ECIR 2026 の論文は、SEC の 10-K 報告書で「会社名: ○○; 年: 2023;」のようなメタデータを前置すると、上位 5 件に正解が入る割合が 33.33% から 55.00% に、別に埋め込んで融合すると 63.33% に上がったと報告しています。特に会社名と年が効き、章の名前の効果は小さめでした。3 つ目は、文書全体の短い要約を各チャンクに付ける方法で、法律文書の評価では、別の文書を取ってしまう失敗が大きく減りました。似た文書がたくさんあるときに「どの文書のチャンクか」を補うのが効く、という点で共通しています。LLM 生成は効果が大きい一方、全チャンクぶんの LLM 呼び出しと、文書更新時の作り直しの費用がかかります。まず安い機械的な見出しから試すのが現実的です。',
    });
    const c = [['MdAutoAwesome', 'LLM が説明を書く', C.accent6, ['Anthropic：検索失敗 5.7% → 3.7%（文脈付き埋め込み）', '費用：全チャンクぶんの LLM 呼び出し、更新時は作り直し']],
      ['MdLabel', 'メタデータを機械的に前置', C.accent1, ['「会社名: ○○; 年: 2023;」を前置で Context@5 33 → 55%（融合で 63%）', '会社名・年が効き、章名の効果は小さい']],
      ['MdSummarize', '文書の短い要約を前置', C.accent5, ['約 150 文字の要約で、別文書を取る失敗が大幅に減少（法律文書）', '150 字の方が 300 字より良かった']]];
    c.forEach((x, i) => L.card(s, { x: 0.6 + i * 4.13, y: 1.95, w: 3.85, h: 3.1, icon: x[0], color: x[2], title: x[1], titleSize: 15, body: x[3], bodySize: 13 }));
    L.note(s, 'leader', '共通点は「このチャンクはどの文書の、どこか」を補うこと。似た文書が多いほど効く。まず安い機械的な見出しから試し、足りなければ LLM 生成へ', { x: 0.6, y: 5.25, w: 12.1, h: 0.95, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-A 表の文脈：ヘッダを毎回付ける、1 行を「列名: 値」に', {
      stages: [0, 1],
      lead: '表は分割すると列名が消え、数字の意味が分からない。ヘッダを繰り返すか、行を「列名: 値」に直す',
      src: 'Docling HybridChunker（repeat_table_header）、Unstructured chunking、AWS Bedrock Knowledge Bases（CSV）、TableRAG（arXiv:2410.04739）、Table Meets LLM（arXiv:2305.13062）、実践編ケーススタディ',
      notes: '表をそのままテキストにして分割すると、2 つ目以降のチャンクには列名がなく、「85」が硬度なのか点数なのか分かりません。対策は 2 つあります。1 つ目は、表を分割するときに表のタイトルとヘッダ行を各チャンクに繰り返すことで、Docling や Unstructured はこれを既定の動作にしています。2 つ目は、1 行を 1 レコードとして「列名: 値」の形に直すことで、AWS の CSV 取り込みや TableRAG の考え方と同じです。実践編では、結合セルのある FMEA の Excel をこの形にして、8 問中 2 問から 7 問に改善しました。ただし、Markdown、JSON、「列名: 値」のどの形式が最良かは、埋め込みモデルや評価データによって変わるという報告が多く、常に最良の形式はありません。LLM に表を読ませるときの比較（Table Meets LLM など）と、検索のときの比較は別物なので、混同しないでください。',
    });
    L.T(s, '変換前（2 つ目のチャンクに列名がない）', { x: 0.6, y: 1.95, w: 5.9, h: 0.35, fontSize: 13, bold: true, color: C.accent3, margin: 0 });
    L.box(s, '| A-12 | 2.4 | 85 | 合格 |\n| A-13 | 2.6 | 88 | 合格 |', { x: 0.6, y: 2.35, w: 5.9, h: 0.9, fill: C.background2, color: C.text1, fontSize: 13, align: 'left', bold: false, fontFace: L.MONO });
    L.T(s, '変換後①：表タイトルとヘッダを繰り返す', { x: 0.6, y: 3.4, w: 5.9, h: 0.35, fontSize: 13, bold: true, color: C.accent4, margin: 0 });
    L.box(s, '表3「受入試験の成績」（続き）\n| 型番 | 厚さ(mm) | 硬度 | 判定 |\n| A-12 | 2.4 | 85 | 合格 |', { x: 0.6, y: 3.8, w: 5.9, h: 1.15, fill: C.background2, color: C.text1, fontSize: 13, align: 'left', bold: false, fontFace: L.MONO });
    L.T(s, '変換後②：1 行 1 レコードを「列名: 値」で', { x: 6.8, y: 1.95, w: 5.9, h: 0.35, fontSize: 13, bold: true, color: C.accent4, margin: 0 });
    L.box(s, '[設計FMEA／故障モード一覧]\n部品: ポンプP-200\n故障モード: シール摩耗\n重大度(S): 7 ／ 発生度(O): 4\n対策: 定期交換', { x: 6.8, y: 2.35, w: 5.9, h: 1.75, fill: C.background2, color: C.text1, fontSize: 13, align: 'left', bold: false, fontFace: L.MONO });
    L.stat(s, { x: 6.8, y: 4.25, w: 5.9, value: '2/8 → 7/8', size: 30, vh: 0.65, label: '実践編：結合ヘッダの FMEA Excel を「列名: 値」の 1 行 1 レコードに（8 問）', lh: 0.45, lsize: 12 });
    L.note(s, 'warn', '検索で最良の直列化形式（Markdown／JSON／列名: 値）はモデルとデータで変わる。LLM が表を読む評価と、検索の評価を混同しない', { x: 0.6, y: 5.45, w: 12.1, h: 0.95, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-A 文脈の文量と、メタデータを「混ぜる／分ける」の判断', {
      stages: [0, 1],
      lead: '50〜100 トークンは実績値で最適値ではない。質問に出る語は本文に混ぜ、絞り込む値はフィルタに分ける',
      src: 'Anthropic「Contextual Retrieval」、Summary-Augmented Chunking（arXiv:2510.06999）、arXiv:2510.24402（FinanceBench）、LlamaIndex Documents/Nodes、AWS Bedrock（includeForEmbedding）、実践編ケーススタディ',
      notes: '文脈の文量について、Anthropic の「50〜100 トークン」は「ふつうこのくらいになった」という観察で、長さを変えて比べた根拠は示されていません。長さを比べた研究として確認できたのは、要約を約 150 文字と 300 文字で比べ、150 文字の方が良かったという 1 件だけです。長すぎる文脈は、埋め込みがチャンク本体より文脈に引っ張られるという懸念がありますが、実測は見つかっていません。また入力上限が 512 トークンの埋め込みモデルでは、文脈を足したぶんチャンクの末尾が切れます。目安としては、チャンクより十分短く、1〜2 割以下に抑え、自社のデータで評価します。メタデータを本文に混ぜるかフィルタに分けるかは、質問文に自然に出てくる語かどうかで判断します。会社名、製品名、年度、章名は混ぜると効きます。部門、言語、日付、文書種別のような絞り込む値はフィルタにします。ただしフィルタが強すぎると再現率が下がり、FinanceBench の実験ではファイルの事前フィルタを足すと F1 が 38.9 から 37.3 に下がりました。ファイル名は特に注意が必要で、実践編ではチャンク先頭の見出しにファイル名を使うと 34 問、本文のタイトルを使うと 38 問でした。ファイル名に型番が多く含まれ、型番の質問が答えのない取扱説明書に引き寄せられたためです。LlamaIndex も既定ではファイル名を埋め込みから外しています。',
    });
    L.card(s, { x: 0.6, y: 1.95, w: 4.6, h: 2.65, icon: 'MdShortText', color: C.accent2, title: '文量の目安', titleSize: 15, body: ['50〜100 トークンは観察値（比較の根拠なし）', '要約 150 字が 300 字より良かった（1 件）', 'チャンクの 1〜2 割以下。上限 512 のモデルは末尾が切れる'], bodySize: 13 });
    L.table(s, [
      ['', '本文に混ぜる（埋め込みに入れる）', 'フィルタに分ける'],
      ['判断', '質問文に自然に出る語', '絞り込みに使う値'],
      ['例', '会社名・製品名・年度・文書タイトル・章名', '部門・言語・日付・文書種別・ID'],
      ['注意', '型番の羅列は別文書を引き寄せる', '強すぎると再現率が下がる（F1 38.9 → 37.3）'],
    ], { x: 5.5, y: 1.95, w: 7.2, colW: [0.9, 3.3, 3.0], fontSize: 12, rowH: 0.62 });
    L.stat(s, { x: 0.6, y: 4.8, w: 4.6, value: '34 / 38 / 37 問', size: 30, vh: 0.7, color: C.accent6, label: '実践編（48 問）：見出しにファイル名／本文タイトル／両方。ファイル名の型番が別文書を引き寄せた', lh: 0.9, lsize: 12 });
    L.note(s, 'leader', 'ファイル名は埋め込みに入れず、出典表示とフィルタに回すのが安全。LlamaIndex も既定で file_name を埋め込みから外している', { x: 5.5, y: 4.85, w: 7.2, h: 1.6, size: 13 });
  }

  {
    const s = L.content('2-A Late Chunking：先に文脈化し、後で分割する', {
      stages: [0, 1],
      lead: '「分割→埋め込み」の順序を逆にし、文書全体を Transformer に通した後でチャンクごとにトークン表現を平均する',
      src: 'Late Chunking（arXiv:2409.04701）、Beyond Chunk-Then-Embed（2026）',
      notes: '通常は文書を分割してから各チャンクを独立に埋め込むため、チャンク内の「同社」「この制度」が何を指すかは埋め込みに反映されません。Late Chunkingは文書全体（またはモデルの最大長まで）をTransformerに通して各トークンの文脈付き表現を得た後、チャンク境界ごとにトークン表現を平均プーリングします。Contextual Retrievalと違いLLM生成は不要ですが、長文対応エンコーダとトークン単位の出力へのアクセスが必要で、一般的な「文を渡すとベクトルが返る」APIでは実現できません。原論文はnDCG@10で52.4から54.3の改善を報告していますが、2026年の比較では文書内検索で全条件において低下しました。',
    });
    L.T(s, '通常（Chunk-then-Embed）', { x: 0.6, y: 2.0, w: 5.8, h: 0.4, fontSize: 15, bold: true, color: MUTED, margin: 0 });
    ['チャンクA', 'チャンクB', 'チャンクC'].forEach((t, i) => {
      L.box(s, t, { x: 0.6 + i * 1.95, y: 2.5, w: 1.75, h: 0.55, fill: C.background2, color: C.text1, fontSize: 13 });
      L.arrow(s, 1.475 + i * 1.95, 3.1, 0.3, 'd');
      L.box(s, '個別に埋め込み', { x: 0.6 + i * 1.95, y: 3.45, w: 1.75, h: 0.55, fill: C.accent5, fontSize: 12 });
    });
    L.T(s, 'B の「同社」が何社かはベクトルに入らない', { x: 0.6, y: 4.1, w: 5.8, h: 0.4, fontSize: 13, color: C.accent3, margin: 0 });
    L.T(s, 'Late Chunking', { x: 6.9, y: 2.0, w: 5.8, h: 0.4, fontSize: 15, bold: true, color: C.accent1, margin: 0 });
    L.box(s, '文書全体を長文エンコーダで文脈化（トークン表現）', { x: 6.9, y: 2.5, w: 5.8, h: 0.55, fill: C.accent1, fontSize: 13 });
    ['A を平均', 'B を平均', 'C を平均'].forEach((t, i) => {
      L.arrow(s, 7.775 + i * 1.95, 3.1, 0.3, 'd');
      L.box(s, t, { x: 6.9 + i * 1.95, y: 3.45, w: 1.75, h: 0.55, fill: C.accent1, fontSize: 12, transparency: 20 });
    });
    L.T(s, '各チャンクのベクトルに文書全体の文脈が反映される', { x: 6.9, y: 4.1, w: 5.8, h: 0.4, fontSize: 13, color: C.accent4, margin: 0 });
    L.stat(s, { x: 0.6, y: 4.55, w: 3.6, value: '52.4 → 54.3', size: 30, vh: 0.65, label: '原論文：多数の文書から探すコーパス検索（BEIR）、nDCG@10', lh: 0.65, lsize: 12 });
    L.stat(s, { x: 4.4, y: 4.55, w: 3.6, value: '全条件で低下', size: 28, vh: 0.65, color: C.accent3, label: '2026年比較：1 冊の中を探す文書内検索（GutenQA）', lh: 0.65, lsize: 12 });
    L.note(s, 'warn', '長文対応エンコーダとトークン表現へのアクセスが必要。通常の「文書→ベクトル」API だけでは同じ処理にならない', { x: 8.2, y: 4.6, w: 4.5, h: 1.6, size: 13 });
  }

  {
    const s = L.content('2-A Late Chunking はどんな文書に使い、どんな文書でやめるか', {
      stages: [0, 1],
      lead: '効くのは「多数の文書からどの文書か」を探すとき。1 冊の中を探すとチャンク同士が似てしまう',
      src: 'Late Chunking（arXiv:2409.04701、BEIR のコーパス検索）、Beyond Chunk-Then-Embed（arXiv:2602.16974、GutenQA の文書内検索）。使い分けは 2 つの結果と仕組みからの推論',
      notes: '前のスライドの 2 つの結果は、測ったタスクが違います。原論文は BEIR、つまり多数の文書から関連する文書を探すコーパス検索で、改善しました。2026 年の比較は GutenQA、つまり 1 冊の長い本の中から該当箇所を探す文書内検索で、全条件で低下しました。仕組みから理由を考えると、Late Chunking は各チャンクのベクトルに文書全体の文脈を混ぜます。コーパス検索では「どの文書の話か」が加わるので他の文書と区別しやすくなりますが、文書内検索では同じ本のチャンクがみな同じ文脈を帯び、互いに似てしまうので区別しにくくなります。ここから、使う・やめるの目安を表にしました。ただし文書の種類ごとに直接検証した論文はなく、この表は 2 つの結果と仕組みからの推論です。採用するときは、評価セットを「どの文書かを探す質問」と「文書の中の箇所を探す質問」に分けて、両方で通常の分割と比べてください。',
    });
    L.table(s, [
      ['', '使う候補', 'やめる・慎重に'],
      ['探し方', '多数の文書から「どの文書か」を探す', '1 冊・1 ファイルの中で「どの箇所か」を探す'],
      ['文書の中身', '1 文書 1 主題で、「同社」「本制度」など前を指す語が多い（契約書、記事、報告書）', '独立した話題の寄せ集め（FAQ 集、議事録の束、ログ、Excel の行レコード）'],
      ['長さ', 'エンコーダの最大長に収まる（数千トークン程度）', '最大長を超える長大なマニュアル・書籍'],
      ['環境', 'トークン単位の出力を取れる埋め込みモデルを自前で動かせる', 'API で文を渡してベクトルを受け取るだけ'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [1.7, 5.2, 5.2], fontSize: 13, rowH: 0.7 });
    L.note(s, 'leader', '判断は評価で：質問を「どの文書か」型と「文書内のどこか」型に分け、両方で通常の分割と比べる。前者だけ良くなるなら、文書内検索には使わない', { x: 0.6, y: 5.6, w: 12.1, h: 0.95, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-A 3つの文脈補完手法の比較と採用判断', {
      stages: [0, 1, 2],
      lead: 'Contextual Retrieval と Late Chunking は「別の介入」。何を変えるかが違うので、効果の所在を分けて測る',
      src: '元レポート「Contextual Retrieval と Late Chunking は別の介入である」',
      notes: '3手法は似た問題（チャンク単体では文脈が足りない）を扱いますが、介入点が違います。Contextual Retrievalは索引化するテキストそのものを変え、Late Chunkingは埋め込み計算と分割の順序を変え、親子検索は検索単位と生成に渡す単位を分けます。同時に導入すると、どれが効いたのか、どれが悪影響を出したのかが分かりません。アブレーション（1つずつ外して効果を測る実験）で改善の所在を確認するのが元レポートの提案です。',
    });
    L.table(s, [
      ['手法', '何を変えるか', '実現方法', '主な注意点'],
      ['Contextual Retrieval', '索引化するテキスト', '文書全体＋チャンクから 50〜100 トークンの説明を生成し前置、Embedding と BM25 へ', '説明文は生成物。原文と区別して保存・検証'],
      ['Late Chunking', '埋め込み計算と分割の順序', '文書を文脈化した後、チャンクごとにトークン表現を平均プーリング', '長文エンコーダとトークン表現が必要。文書内検索で不利になり得る'],
      ['親子検索', '検索単位と生成へ渡す単位', '細粒度で検索後、対応する親チャンクを読む', '無条件に広げるとトークンとノイズ増。上限を設ける'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [2.4, 2.4, 4.0, 3.3], fontSize: 13, rowH: 0.85 });
    L.note(s, 'decide', '複雑な生成前処理に進む前に、構造ベース分割・見出し付加・親子検索を比較する。Contextual Retrieval と Late Chunking は同時導入せず、片方ずつアブレーションして改善の所在を確認する', { x: 0.6, y: 5.45, w: 12.1, h: 1.05, size: 14, valign: 'middle' });
  }

  // ===== 2-B Retrieval =====
  {
    const s = L.content('2-B なぜハイブリッド検索が基本になるのか', {
      stages: [1],
      lead: 'BM25 は強いゼロショットのベースライン。Dense はすべての分野で自動的に優位になるわけではない',
      src: 'BEIR（18 データセットの異種ベンチマーク）、元レポート「語彙と意味を補完させる」',
      notes: 'BEIRは18の異なる分野のデータセットで検索方式を比較したベンチマークで、BM25が学習なしでも強いこと、Denseモデルは学習分野から離れると性能差が大きく出ることを示しました。企業文書には型番、契約条項番号、製品名、社内略語のような文字列一致が重要なクエリと、「解約したい」のように文書側では「契約の終了」と書かれている言い換えクエリが混在します。どちらか一方に依存せず、BM25とDenseを並列に実行して統合するのが基本形です。',
    });
    L.table(s, [
      ['クエリの例', 'BM25（語彙）', 'Dense（意味）'],
      ['「XJ-4021 の保守期限」', { text: '◎ 型番が一致', options: { color: C.accent4, bold: true } }, { text: '△ 型番の意味は学習されにくい', options: { color: C.accent3 } }],
      ['「第12条2項の解除要件」', { text: '◎ 条項番号が一致', options: { color: C.accent4, bold: true } }, '○ 文脈次第'],
      ['「解約したいときの手続き」', { text: '△ 文書側は「契約の終了」', options: { color: C.accent3 } }, { text: '◎ 言い換えを吸収', options: { color: C.accent4, bold: true } }],
      ['「在宅勤務の通信費は出る？」', '○ 語の一致があれば', { text: '◎ 口語→規程表現', options: { color: C.accent4, bold: true } }],
      ['学習データにない専門領域', '○ 学習不要で安定', '△ 領域外で性能差が大きい'],
    ], { x: 0.6, y: 1.95, w: 7.6, colW: [3.0, 2.3, 2.3], fontSize: 13, rowH: 0.62 });
    L.card(s, { x: 8.5, y: 1.95, w: 4.2, h: 3.75, icon: 'MdMerge', title: '基本形', titleSize: 16, body: ['BM25 と Dense を並列実行', '文書 ID・チャンク ID で候補を統合', '順位ベースの RRF で融合（次頁）', 'メタデータ条件（ACL・版・有効日）を両方に適用'], bodySize: 14 });
    L.note(s, 'decide', 'BM25＋Dense の併用評価は Adopt。単一表現に依存させない', { x: 0.6, y: 5.9, w: 12.1, h: 0.65, size: 14, valign: 'middle' });
  }

  {
    const s = L.content('2-B RRF（Reciprocal Rank Fusion）を手で計算する', {
      stages: [1, 2],
      lead: 'スコアの尺度が違う検索器は「足せない」。順位だけを使って融合する',
      src: 'Cormack et al., Reciprocal Rank Fusion, SIGIR 2009',
      notes: 'BM25のスコアは12.3のような値、Denseのコサイン類似度は0.82のような値で、尺度が全く違うため単純に足すとBM25が支配的になります。RRFはスコアを捨て、各検索器での順位rだけを使い、1/(c+r)を合計します。cは定数で、60がよく使われます。この例ではDenseで1位、BM25で2位のBが最上位になり、両方に出たAが続きます。片方にしか出ない文書は、出ていない検索器の項が0になります。元レポートは、c、候補件数、重みを検証パラメータとし、検索器に現れない文書の扱いを固定するよう述べています。',
    });
    L.box(s, 'RRF(d) = Σ_i  1 ／ ( c + r_i(d) )　　c：定数（例 60）、r_i(d)：検索器 i での順位', { x: 0.6, y: 1.95, w: 12.1, h: 0.7, fill: C.text2, fontSize: 16 });
    L.table(s, [
      ['文書', 'BM25 順位', 'Dense 順位', 'RRF（c=60）', '融合後'],
      ['B', '2', '1', '1/62 + 1/61 = 0.03252', { text: '1位', options: { bold: true, color: C.accent1 } }],
      ['A', '1', '3', '1/61 + 1/63 = 0.03227', { text: '2位', options: { bold: true, color: C.accent1 } }],
      ['C', '—', '2', '0 + 1/62 = 0.01613', '3位'],
      ['D', '3', '—', '1/63 + 0 = 0.01587', '4位'],
    ], { x: 0.6, y: 2.85, w: 7.6, colW: [0.9, 1.3, 1.3, 2.9, 1.2], fontSize: 14, rowH: 0.55 });
    L.card(s, { x: 8.5, y: 2.85, w: 4.2, h: 2.75, icon: 'MdTune', color: C.accent2, title: '検証パラメータ', titleSize: 15, body: ['定数 c（小さいほど上位重視）', '各検索器の候補件数', '検索器ごとの重み', '片方にしか出ない文書の扱い'], bodySize: 14 });
    L.note(s, 'warn', 'BM25 スコア（例 12.3）とコサイン類似度（例 0.82）をそのまま足すと尺度の大きい側が支配する', { x: 0.6, y: 5.8, w: 12.1, h: 0.8, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-B 埋め込みモデルの選定：BGE-M3 と日本語の現実', {
      stages: [1],
      lead: '多言語・複数表現を1モデルで扱う選択肢がある。ただし公開ベンチマークは日本語業務での効果を保証しない',
      src: 'BGE-M3（arXiv:2402.03216）／補足：JMTEB、Ruri（arXiv:2409.07737）、cl-nagoya/ruri-v3 モデルカード',
      notes: 'BGE-M3は1つのエンコーダからDense、学習型Sparse、トークン単位のMulti-vectorの3種類の表現を出力できるモデルで、MIRACLの18言語平均nDCG@10で全機能併用70.0、比較対象のmE5-largeが65.4と報告されています。ただしこれは日本語の企業内文書での効果を保証しません。補足として、日本語ではJMTEBという日本語埋め込みベンチマークがあり、日本語特化のRuriシリーズなどが公開されています。モデルカードの数値は著者の自己報告で、別環境で再現しなかったという報告もあります。公開ベンチマークは候補を絞る道具であり、最終判断は自社の評価セットで行います。',
    });
    L.card(s, { x: 0.6, y: 2.0, w: 5.9, h: 2.4, icon: 'MdHub', title: 'BGE-M3：1モデル3表現', titleSize: 16, body: [['Dense：', '文全体の意味ベクトル'], ['学習型 Sparse：', '語ごとの重み（BM25 的）'], ['Multi-vector：', 'トークン単位（ColBERT 的）']], bodySize: 14 });
    L.stat(s, { x: 0.8, y: 4.6, w: 5.6, value: '70.0 vs 65.4', size: 32, vh: 0.7, label: 'MIRACL 18 言語の平均 nDCG@10（日本語単独ではない）。BGE-M3 の 3 表現併用 vs 多言語 E5（mE5-large）', lh: 0.6, lsize: 12 });
    L.note(s, 'add', [{ text: '日本語の候補絞り込みには JMTEB（日本語埋め込みベンチマーク）が使える。日本語特化の Ruri 系、多言語の multilingual-e5・BGE-M3 等が候補。', options: { breakLine: true } }, { text: 'ただしモデルカードの値は自己報告で、別環境で再現しなかった報告もある。プレフィックス指定など使用条件も確認する', options: {} }], { x: 6.8, y: 2.0, w: 5.9, h: 2.7, size: 13 });
    L.note(s, 'leader', '公開ベンチマーク＝候補を絞る道具。最終判断は自社評価セット（日英混在・社内略語・表記ゆれを含む）で行う', { x: 6.8, y: 4.9, w: 5.9, h: 1.6, size: 14 });
  }

  {
    const s = L.content('2-B バイエンコーダ・クロスエンコーダ・Late Interaction', {
      stages: [1, 2],
      lead: '「別々に符号化して速く広く」→「一緒に読んで精密に」。速度・精度・容量のトレードオフで役割を分ける',
      src: 'BEIR、ColBERTv2（arXiv:2112.01488）',
      notes: 'バイエンコーダ（通常のDense検索）は質問と文書を別々にベクトル化するので、文書側を事前計算でき高速ですが、1本のベクトルに圧縮されるため細かな一致を取りこぼします。クロスエンコーダは質問と文書を連結して一緒にモデルに入力し、関連度を直接判定するので精度が高い一方、質問ごとに候補すべてを計算し直すため大量の文書には使えません。そこで候補検索の後段で上位数十〜数百件にだけ使う、これが再ランキングです。ColBERTに代表されるLate Interactionはその中間で、質問と文書をトークンごとの複数ベクトルにし、質問トークンごとに最も似た文書トークンとの類似度を合計します（MaxSim）。細粒度の一致を扱えますが、索引容量が大きくなります。',
    });
    const cols = [
      ['バイエンコーダ', 'Dense 検索', C.accent1, '質問と文書を別々に1ベクトル化 → 類似度', ['◎ 文書側を事前計算・高速', '△ 細かな一致を取りこぼす'], '候補検索（広く）'],
      ['Late Interaction', 'ColBERT 系', C.accent6, 'トークンごとの複数ベクトル。質問トークンごとに最大類似度を合計（MaxSim）', ['○ 細粒度の一致', '△ 索引容量が大きい'], '候補検索／再順位'],
      ['クロスエンコーダ', '再ランキング', C.accent2, '質問と文書を連結して一緒に入力し関連度を直接判定', ['◎ 高精度', '✕ 候補ごとに推論・大量文書に不向き'], '上位候補の再順位（精密に）'],
    ];
    cols.forEach((c, i) => {
      const x = 0.6 + i * 4.13;
      L.box(s, [{ text: c[0], options: { fontSize: 17, breakLine: true } }, { text: c[1], options: { fontSize: 12, bold: false } }], { x, y: 2.0, w: 3.85, h: 0.85, fill: c[2], color: i === 2 ? C.text1 : C.background1 });
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 2.95, w: 3.85, h: 3.6, rectRadius: 0.06, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.T(s, c[3], { x: x + 0.2, y: 3.05, w: 3.45, h: 1.1, fontSize: 13, margin: 0 });
      L.bullets(s, c[4], { x: x + 0.2, y: 4.2, w: 3.45, h: 1.1, fontSize: 13, bullet: false });
      L.T(s, [{ text: '主な役割', options: { bold: true, fontSize: 11, color: MUTED, breakLine: true } }, { text: c[5], options: { bold: true, fontSize: 14, color: C.accent1 } }], { x: x + 0.2, y: 5.55, w: 3.45, h: 0.85, margin: 0 });
    });
  }

  {
    const s = L.content('2-B Late Interaction の代償：索引容量', {
      stages: [1, 5],
      lead: 'ColBERTv2 は残差圧縮で容量を約 1/6〜1/10 に削減。それでも圧縮後の索引容量とメモリは実測が必須',
      src: 'ColBERTv2（MS MARCO 条件）',
      notes: 'Late Interactionはトークン数だけベクトルを持つので、単一ベクトル方式より索引が大きくなります。ColBERTv2は残差圧縮と教師モデルによる学習改善を組み合わせ、MS MARCO条件で従来ColBERTの154GiBを16〜25GiBに削減しました。それでも、採用時には品質だけでなく、索引サイズ、メモリ、検索実装の複雑さ、更新時間を測る必要があります。リーダーは「精度が上がる」だけでなく「インフラ費用と運用負荷がいくら増えるか」をセットで提示できるようにしてください。',
    });
    L.bar(s, { x: 0.6, y: 1.95, w: 6.4, h: 4.6, labels: ['ColBERT（従来）', 'ColBERTv2\n（1 bit 圧縮）', 'ColBERTv2\n（2 bit 圧縮）'], values: [154, 16, 25], title: 'MS MARCO の索引容量（GiB）', max: 180, colors: [HEX.accent6], fmt: '0' });
    L.card(s, { x: 7.4, y: 2.0, w: 5.3, h: 2.65, icon: 'MdStorage', color: C.accent6, title: '採用時に測るもの', titleSize: 16, body: ['索引サイズとメモリ常駐量', '検索遅延（p95）と同時実行数', '索引の更新・削除反映時間', '実装・運用の複雑さ（専用エンジンの要否）'], bodySize: 14 });
    L.note(s, 'leader', '「精度 +X」の提案には必ず「容量・費用・運用負荷 +Y」を並べて示す', { x: 7.4, y: 4.85, w: 5.3, h: 1.0, size: 14, valign: 'middle' });
  }

  {
    const s = L.content('2-B 再ランキングは「足せば必ず効く」部品ではない', {
      stages: [2, 4],
      lead: 'BEIR では 18 中 16 で改善。だが推論が要る BRIGHT では、話題の一致で学んだ小型モデルが逆効果',
      src: 'BEIR、BRIGHT（arXiv:2407.12883）',
      notes: 'BEIRでは、BM25の候補をクロスエンコーダで再ランキングすると18データセット中16で改善しました。再ランキングが強力な部品であることは確かです。しかしBRIGHTという推論を要する検索ベンチマークでは、MS MARCOで学習した小型のMiniLM再ランキングが、BM25の平均nDCG@10を14.3から13.1に下げました。一方、GPT-4による再ランキングでは17.4に改善しています。学習した領域と評価する領域が合っているかが重要で、自社データでの回帰評価で逆効果を検出する仕組みが必要です。',
    });
    L.stat(s, { x: 0.6, y: 2.0, w: 3.6, value: '16 / 18', size: 54, vh: 1.05, label: 'BEIR：BM25＋クロスエンコーダが BM25 を上回ったデータセット数', lh: 0.75 });
    L.note(s, 'tip', 'BRIGHT＝関連の判定に推論が要る検索。GPT-4 は推論できるので改善した。効くかは「関連の性質」とモデル次第', { x: 0.6, y: 3.95, w: 3.6, h: 1.7, size: 12 });
    L.bar(s, { x: 4.5, y: 1.95, w: 8.2, h: 3.75, labels: ['BM25 のみ', '＋MiniLM 再ランキング\n（MS MARCO 学習）', '＋GPT-4 再ランキング'], values: [14.3, 13.1, 17.4], title: 'BRIGHT：平均 nDCG@10', max: 20, colors: [HEX.accent2], fmt: '0.0' });
    L.note(s, 'decide', '候補検索の Recall と、再ランキング後の nDCG を別々に測る。候補に必要文書がなければ再ランキングでは救えないので、候補生成の失敗を先に直す', { x: 0.6, y: 5.8, w: 12.1, h: 0.85, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-B 検索段の設計：2段構えのファネル', {
      stages: [1, 2, 3],
      lead: '検索は 2 段（候補検索→再ランキング）で、後の 2 段は生成側。件数例：候補 100 件→10 件→文脈に 5 件',
      src: '元レポート「候補検索・ハイブリッド・再ランキング」',
      notes: '検索段は2段構えで考えます。第1段の候補検索はBM25とDenseで広く集め、Recall@kで評価します。ここで正解文書が候補に入っていなければ、後段の再ランキングでは救えません。第2段の再ランキングは候補の中から精密に並べ替え、nDCGやMRRで評価します。その後、親チャンクへの拡張や重複除去を行い、トークン予算内で生成に渡します。各段の件数（候補何件、再ランキング後何件）は普遍値ではなく、評価で決めるパラメータです。',
    });
    const fun = [['候補検索', 'BM25 と Dense を並列 → RRF 融合', 'Recall@k', 12.1, C.accent1], ['再ランキング', 'クロスエンコーダ等で精密に並べ替え', 'nDCG@k・MRR', 10.1, C.accent6], ['文脈構成', '親チャンク拡張・重複除去・予算内選択', '必要な根拠が文脈に入った割合', 8.1, C.accent2], ['生成', '引用付き回答', 'EM・忠実性・引用', 6.1, C.accent4]];
    fun.forEach((f, i) => {
      const w = f[3], x = 0.6 + (12.1 - w) / 2, y = 1.95 + i * 1.0;
      L.box(s, [{ text: f[0] + '　', options: { fontSize: 16, bold: true } }, { text: f[1], options: { fontSize: 13, bold: false, breakLine: true } }, { text: '指標：' + f[2], options: { fontSize: 12, bold: false } }], { x, y, w, h: 0.9, fill: f[4], color: i === 2 ? C.text1 : C.background1 });
    });
    L.note(s, 'leader', '各段の件数（何件集め、何件に絞るか）は普遍値ではなく評価で決めるパラメータ。「なぜその件数か」を説明できるようにする', { x: 0.6, y: 5.95, w: 12.1, h: 0.68, size: 13, valign: 'middle' });
  }

  // ===== 2-C Query transformation =====
  {
    const s = L.content('2-C HyDE：質問を「仮想的な回答文書」に写像する', {
      stages: [1],
      lead: 'LLM に仮想文書を書かせ、それを埋め込んで実コーパスを検索する。最終回答の根拠は実文書から取る',
      src: 'HyDE（arXiv:2212.10496）、TREC DL19',
      notes: '短い質問と、答えが書かれた長い文書とでは、表現の形が大きく違います。HyDEはLLMに「この質問に答える文書」を仮に書かせ、その仮想文書を埋め込みとして検索に使います。仮想文書の内容が事実として正しい必要はなく、関連文書の表現へ橋渡しする役割です。原論文のTREC DL19では、ゼロショットのContriever 44.5に対しHyDEは61.3でしたが、関連性ラベルで微調整したContrieverの62.1には届いていません。つまり、学習データがないゼロショット状況での改善策であり、既に領域最適化された検索器に同じ効果があるとは限りません。',
    });
    L.box(s, '質問', { x: 0.6, y: 2.2, w: 1.4, h: 0.75, fill: C.text2 });
    L.arrow(s, 2.05, 2.575, 0.4, 'r');
    L.box(s, 'LLM が仮想文書を生成', { x: 2.5, y: 2.2, w: 2.2, h: 0.75, fill: C.accent6, fontSize: 13 });
    L.arrow(s, 4.75, 2.575, 0.4, 'r');
    L.box(s, '仮想文書を埋め込み', { x: 5.2, y: 2.2, w: 2.0, h: 0.75, fill: C.accent5, fontSize: 13 });
    L.arrow(s, 7.25, 2.575, 0.4, 'r');
    L.box(s, '実コーパスを検索', { x: 7.7, y: 2.2, w: 2.0, h: 0.75, fill: C.accent1, fontSize: 13 });
    L.arrow(s, 9.75, 2.575, 0.4, 'r');
    L.box(s, '実文書を根拠に回答', { x: 10.2, y: 2.2, w: 2.5, h: 0.75, fill: C.accent4, fontSize: 13 });
    L.T(s, '仮想文書は「検索の橋渡し」。内容が事実である必要はないが、証拠として使ってはならない', { x: 2.5, y: 3.05, w: 7.5, h: 0.4, fontSize: 13, color: C.accent3, margin: 0 });
    L.bar(s, { x: 0.6, y: 3.55, w: 7.4, h: 3.05, labels: ['Contriever\n（ラベルなし学習）', 'Contriever\n＋HyDE', '参考：MS MARCO\nで教師あり学習'], values: [44.5, 61.3, 62.1], title: 'TREC DL19：nDCG@10', max: 70, colors: [HEX.accent6], fmt: '0.0' });
    L.note(s, 'tip', 'ゼロショット（学習データなし）での改善策。微調整済みの検索器を上回ったわけではない。既に領域最適化した検索器に同じ効果があるとはみなさない', { x: 8.3, y: 3.6, w: 4.4, h: 2.95, size: 14 });
  }

  {
    const s = L.content('2-C 質問分解と推論による検索拡張', {
      stages: [1],
      lead: '多段の質問では、最終回答と同じ表現の文書が最初から存在するとは限らない。中間事実を順に調べる',
      src: 'BRIGHT（LLM の推論ステップでクエリ拡張し最大 12.2pt 改善）',
      notes: '「主力製品Xの主要部品のサプライヤーが所在する国で、2026年に施行された輸出規制は何か」という質問を考えます。この答えが1つの文書にまとまっていることはまれで、まず部品とサプライヤーを特定し、その所在国を調べ、その国の規制を調べるという中間事実の連鎖が必要です。これが多段（マルチホップ）検索です。BRIGHTは推論が必要な検索課題で、LLMの推論ステップでクエリを拡張すると最大12.2ポイント改善したと報告しています。注意点は、サブ質問の答えを順に使うため、前のステップの誤りが後に伝播することです。',
    });
    L.box(s, '元の質問：「主力製品 X の主要部品のサプライヤー所在国で、2026年に施行された輸出規制は？」', { x: 0.6, y: 2.0, w: 12.1, h: 0.7, fill: C.text2, fontSize: 14 });
    const sq = [['Q1', '製品 X の主要部品は？', '→ 部品 P'], ['Q2', '部品 P のサプライヤーは？', '→ S 社'], ['Q3', 'S 社の所在国は？', '→ 国 N'], ['Q4', '国 N で 2026年施行の輸出規制は？', '→ 回答']];
    sq.forEach((q, i) => {
      const x = 0.6 + i * 3.1;
      L.box(s, [{ text: q[0] + '　', options: { bold: true } }, { text: q[1], options: { bold: false, breakLine: true } }, { text: q[2], options: { bold: true, color: C.accent2 } }], { x, y: 3.0, w: 2.8, h: 1.2, fill: C.accent1, fontSize: 13 });
      if (i < 3) L.arrow(s, x + 2.82, 3.6, 0.26, 'r');
    });
    L.T(s, '前のサブ質問の答えが、次の検索語になる（順序依存）', { x: 0.6, y: 4.3, w: 8, h: 0.4, fontSize: 13, color: MUTED, margin: 0 });
    L.stat(s, { x: 0.6, y: 4.8, w: 3.8, value: '最大 +12.2pt', size: 34, vh: 0.75, label: 'BRIGHT：LLM の推論ステップでクエリ拡張した場合', lh: 0.6, lsize: 12 });
    L.note(s, 'warn', '前段の誤り（部品 P の取り違え）は後段にすべて伝播する。各ホップで根拠を記録し、途中の到達率を評価する（Part 3）', { x: 4.7, y: 4.85, w: 8.0, h: 1.4, size: 14 });
  }

  {
    const s = L.content('2-C クエリ系の実装原則と採用判断', {
      stages: [1, 3, 5],
      lead: '元質問・書換質問・サブ質問・仮説を別々の型として保持し、生成した仮説を証拠に混ぜない',
      src: '元レポート「質問分解と推論拡張」',
      notes: 'クエリ書換やHyDEでは、LLMが生成したテキストがシステム内を流れます。これを型として区別しておかないと、仮説として生成した文が「確認済みの事実」として証拠ストアに混入し、それを根拠に回答するという捏造の経路ができてしまいます。また書換の過程で、元の質問にあった年・対象・除外条件が落ちることがあるため、検索結果を元の質問に再照合します。観測ログには、どのクエリがどの候補を生み、どれが採用されたかを残し、生成による検索語改善と事実の捏造を切り分けられるようにします。',
    });
    const ty = [['元質問', 'ユーザー入力そのもの。最終照合の基準', C.text2], ['書換質問', '語彙のずれを埋めた検索用表現', C.accent1], ['サブ質問', '多段質問の分解単位。順序と依存を持つ', C.accent6], ['仮説（HyDE 等）', '検索の橋渡し専用。証拠ストアに入れない', C.accent3]];
    ty.forEach((t, i) => {
      const y = 2.0 + i * 0.9;
      L.box(s, t[0], { x: 0.6, y, w: 2.4, h: 0.72, fill: t[2], fontSize: 14 });
      L.T(s, t[1], { x: 3.15, y, w: 3.6, h: 0.72, fontSize: 13, valign: 'middle', margin: 0 });
    });
    L.card(s, { x: 7.0, y: 2.0, w: 5.7, h: 3.5, icon: 'MdRule', color: C.accent2, title: '実装ルール', titleSize: 16, body: ['元の年・対象・除外条件を失わないよう、検索結果を元質問に再照合', '仮説を「確認済みの事実」として証拠ストアへ混入させない', 'どのクエリがどの候補を生み、どれを採用したかをログに残す'], bodySize: 14 });
    L.note(s, 'decide', '語彙のずれには書換・HyDE、未確定の中間事実を順に調べる質問には分解・反復検索を使い分ける（Trial）', { x: 0.6, y: 5.7, w: 12.1, h: 0.85, size: 14, valign: 'middle' });
  }

  // ===== 2-D Hierarchy & graph =====
  {
    const s = L.content('2-D RAPTOR：抽象度をまたいで検索する', {
      stages: [0, 1],
      lead: 'チャンクの埋め込み・クラスタリング・要約を再帰的に行い、原文と複数階層の要約から検索する',
      src: 'RAPTOR（arXiv:2401.18059）、QuALITY 開発セット',
      notes: 'RAPTORは、チャンクを埋め込んで似たもの同士をクラスタにまとめ、各クラスタをLLMで要約し、その要約をさらにクラスタリングして要約する、という処理を繰り返して木構造を作ります。検索時は葉の原文だけでなく、上位の要約ノードも検索対象になるため、「この報告書全体の主張は何か」のような抽象的な質問にも答えやすくなります。同じGPT-3でQuALITYの正解率はBM25 57.3%、DPR 60.4%、RAPTOR 62.4%でした。なお、GPT-4利用時の82.6%と別モデルの既存手法の差（20.3ポイント）は、モデル差を含むため検索構造だけの効果としては引用できません。',
    });
    // tree
    L.box(s, 'ルート要約', { x: 2.35, y: 2.0, w: 2.2, h: 0.6, fill: C.accent6, fontSize: 13 });
    L.box(s, '要約 1', { x: 0.9, y: 3.05, w: 1.8, h: 0.6, fill: C.accent5, fontSize: 13 });
    L.box(s, '要約 2', { x: 4.2, y: 3.05, w: 1.8, h: 0.6, fill: C.accent5, fontSize: 13 });
    ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach((c, i) => L.box(s, c, { x: 0.6 + i * 0.95, y: 4.1, w: 0.8, h: 0.55, fill: C.accent1, fontSize: 12 }));
    s.addShape(SH.LINE, { x: 1.8, y: 2.6, w: 1.65, h: 0.45, line: { color: MUTED, width: 1.25 }, flipH: true });
    s.addShape(SH.LINE, { x: 3.45, y: 2.6, w: 1.65, h: 0.45, line: { color: MUTED, width: 1.25 } });
    [[1.0, 1.8], [1.95, 1.8], [2.9, 1.8], [3.85, 5.1], [4.8, 5.1], [5.75, 5.1]].forEach(([cx, px]) => {
      s.addShape(SH.LINE, { x: Math.min(cx, px), y: 3.65, w: Math.max(Math.abs(cx - px), 0.001), h: 0.45, line: { color: MUTED, width: 1 }, flipH: cx < px });
    });
    L.T(s, '原文チャンク（葉）→ クラスタ要約 → さらに要約。全ノードが検索対象', { x: 0.6, y: 4.75, w: 5.9, h: 0.5, fontSize: 12, color: MUTED, margin: 0 });
    L.bar(s, { x: 6.8, y: 1.95, w: 5.9, h: 3.4, labels: ['BM25', 'DPR', 'RAPTOR'], values: [57.3, 60.4, 62.4], title: 'QuALITY 正解率（%）：読解は GPT-3 に固定し、検索方式だけ比較', min: 0, max: 70, colors: [HEX.accent6], fmt: '0.0' });
    L.note(s, 'warn', '要約は誤りを含み得る。要約ノード→原文リンクを保持し最終引用は原文へ戻す。原文更新時の要約の再生成範囲（更新波及）を管理し、数値・例外条件を要約だけで確定しない', { x: 0.6, y: 5.4, w: 12.1, h: 1.15, size: 13 });
  }

  {
    const s = L.content('2-D 「GraphRAG」は単一の手法ではない', {
      stages: [0, 1],
      lead: '同じ名称で、グラフの中身も検索方法も向く質問も異なる。目的を決めてから系統を選ぶ',
      src: 'GraphRAG（arXiv:2404.16130）・公式 Global Search 仕様、LightRAG、HippoRAG 2、HopRAG',
      notes: '「GraphRAGを導入したい」という要望が来たら、まず「何を辿りたいのか」を聞いてください。Microsoft GraphRAGのGlobal Searchは、エンティティと関係を抽出してコミュニティに分け、コミュニティごとの要約からmap-reduceで全体回答を作る方式で、「コーパス全体でどんなテーマが議論されているか」のような全体把握に向きます。LightRAGは低レベル・高レベルのキーワードと近傍情報を組み合わせます。HippoRAG 2は三つ組とPersonalized PageRankで原文を順位付けし、複数文書にまたがる事実の探索に向きます。HopRAGはパッセージ同士をLLMが生成した疑似質問でつなぎ、論理的な関連を辿ります。',
    });
    L.table(s, [
      ['系統', 'グラフ・索引の内容', '検索・推論方法', '向く質問'],
      ['Microsoft GraphRAG Global Search', 'エンティティ・関係、コミュニティ、階層要約', 'コミュニティ要約から部分回答を作り map-reduce で統合', 'コーパス全体のテーマ・論点・傾向'],
      ['LightRAG', 'エンティティ・関係とその説明、ベクトル索引', '低レベル・高レベルのキーワード検索と近傍情報を統合', '個別対象と広い概念を併用する探索'],
      ['HippoRAG 2', '句・三つ組・パッセージの接続', '三つ組検索、LLM による選別、Personalized PageRank で原文を順位付け', '複数文書にまたがる事実・関連性の探索'],
      ['HopRAG', 'パッセージと LLM 生成疑似質問の論理的接続', 'retrieve–reason–prune で関連パッセージを辿る', '語彙・意味類似だけでは辿れない多段 QA'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [2.7, 3.0, 3.6, 2.8], fontSize: 12, rowH: 0.74 });
    L.note(s, 'leader', '「GraphRAG を入れたい」と言われたら「何を辿りたいのか（全体の論点か、文書間の関係か）」を最初に問う', { x: 0.6, y: 6.0, w: 12.1, h: 0.62, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-D Microsoft GraphRAG Global Search の仕組み', {
      stages: [0, 1, 3],
      lead: 'コーパス全体の「論点把握」向け。勝率 72〜83% は LLM 判定の包括性比較であり、事実 QA の正解率ではない',
      src: 'GraphRAG（arXiv:2404.16130）、GraphRAG 公式仕様 Global Search',
      notes: 'GraphRAGの索引作成では、LLMでテキストからエンティティと関係を抽出してグラフを作り、コミュニティ検出アルゴリズムでまとまりに分け、コミュニティごとに要約を作ります。これを階層的に行います。質問時には、各コミュニティ要約から部分回答を作り（map）、それらを統合して最終回答にします（reduce）。原論文では約100万・170万トークンの2コーパスのグローバルな質問で、通常の意味検索に対する包括性のLLM判定勝率が72〜83%でした。これは全体要約タスクでの回答比較であり、一般的な事実QAの正解率が72〜83%という意味ではありません。公式仕様も、どの階層のコミュニティを使うかで詳細さと時間・LLM資源が変わると説明しています。',
    });
    L.flow(s, [{ t: 'エンティティ・関係抽出', d: 'LLM でテキストから' }, { t: 'コミュニティ検出', d: '関連の強いまとまり' }, { t: 'コミュニティ要約', d: '階層的に作成' }, { t: 'map', d: '各要約から部分回答' }, { t: 'reduce', d: '部分回答を統合' }], { x: 0.6, y: 2.0, w: 12.1, h: 1.15, fill: C.accent6, tSize: 14 });
    L.T(s, '索引作成（事前・高コスト）', { x: 0.6, y: 3.2, w: 7, h: 0.35, fontSize: 12, color: MUTED, margin: 0 });
    L.T(s, '質問時', { x: 8.0, y: 3.2, w: 4, h: 0.35, fontSize: 12, color: MUTED, margin: 0 });
    L.stat(s, { x: 0.6, y: 3.75, w: 4.2, value: '72〜83%', size: 48, vh: 0.95, color: C.accent6, label: '意味検索に対する「包括性」の LLM 判定勝率（約100万・170万トークンの2コーパス、全体質問）', lh: 1.0, lsize: 12 });
    L.card(s, { x: 5.1, y: 3.75, w: 3.7, h: 2.8, icon: 'MdCheckCircle', color: C.accent4, title: '向く質問', titleSize: 15, body: ['「この1年の障害報告の主なテーマは？」', '「顧客の声で多い論点は？」'], bodySize: 13 });
    L.card(s, { x: 9.0, y: 3.75, w: 3.7, h: 2.8, icon: 'MdCancel', color: C.accent3, title: '向かない・注意', titleSize: 15, body: ['特定の事実を1つ答える QA', '更新頻度が高いコーパス（再構築費用）', '階層の選択で詳細さ・費用が変化'], bodySize: 13 });
  }

  {
    const s = L.content('2-D HippoRAG 2：得るものと払うもの', {
      stages: [1, 5],
      lead: 'HippoRAG 2 vs 標準 RAG（NV-Embed-v2）。多段の Recall は大幅改善、F1 は +2.8。費用は別データの値',
      src: 'HippoRAG 2（arXiv:2502.14802）、同一回答モデル Llama-3.3-70B-Instruct',
      notes: 'HippoRAG 2は、同じ回答モデルを使った7データセット平均のQA F1で、NV-Embed-v2による標準RAGの57.0に対し59.8でした。特に多段検索では2WikiのRecall@5が76.5から90.4に大きく改善しています。一方で、MuSiQue条件では索引時間が12.1分から99.5分、QA時間が0.3秒から1.2秒に増えています。全体平均の改善は数ポイントでも、多段質問という特定カテゴリでは大きく効く、という典型例です。カテゴリ別の評価と、費用・遅延の比較をセットで行う必要があります。',
    });
    L.T(s, '得るもの', { x: 0.6, y: 2.0, w: 5.9, h: 0.45, fontSize: 18, bold: true, color: C.accent4, margin: 0 });
    L.T(s, '払うもの', { x: 6.8, y: 2.0, w: 5.9, h: 0.45, fontSize: 18, bold: true, color: C.accent3, margin: 0 });
    const g = [['59.8 vs 57.0', '7データセット平均 QA F1（標準 RAG 比 +2.8）', C.accent4, 0.6, 2.6], ['90.4 vs 76.5', '2Wiki の Recall@5（多段検索）', C.accent4, 0.6, 4.2], ['99.5 分 vs 12.1 分', 'MuSiQue 条件の索引時間', C.accent3, 6.8, 2.6], ['1.2 秒 vs 0.3 秒', 'MuSiQue 条件の QA 時間', C.accent3, 6.8, 4.2]];
    g.forEach((v) => {
      s.addShape(SH.ROUNDED_RECTANGLE, { x: v[3], y: v[4], w: 5.9, h: 1.45, rectRadius: 0.08, fill: { color: v[2], transparency: 90 }, line: { color: v[2], width: 0.75 } });
      L.stat(s, { x: v[3] + 0.25, y: v[4] + 0.05, w: 5.4, value: v[0], size: 32, vh: 0.8, color: v[2], label: v[1], lh: 0.45, lsize: 13 });
    });
    L.note(s, 'leader', '全体平均の差が小さくても、特定カテゴリ（多段質問）では大きく効くことがある。カテゴリ別評価と費用・遅延の比較をセットで示す', { x: 0.6, y: 5.85, w: 12.1, h: 0.75, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-D 2026年の比較研究が示すことと採用判断', {
      stages: [1, 4],
      lead: 'Agentic 化で Dense も伸び差は縮む。複雑な多段ではグラフ有利が残るが、一般 QA で一貫した優位はない',
      src: 'RAGSearch（arXiv:2604.09666）、LightRAG',
      notes: 'RAGSearchは、LLM・検索条件・推論プロトコルを共通化して、Dense RAGと複数のGraphRAG方式をAgentic検索の基盤として比較しました。Agentic化によってDense側の性能が上がり差が縮まる一方、複雑なマルチホップではグラフ側が有利な場面が残り、一般的なQAでは一貫した優位はないという結果です。ただし一部の比較は、データセットごとに複数のグラフ手法の最良値を取る形式で、単一構成の実運用性能とは異なります。LightRAGの好成績も、LLMが質問を作りLLMが評価する開放的な比較で、EMやF1と同じ尺度では並べられません。',
    });
    L.card(s, { x: 0.6, y: 2.0, w: 3.85, h: 2.6, icon: 'MdTrendingUp', title: 'Agentic 化の効果', titleSize: 15, body: 'Dense RAG を Agentic にすると性能が上がり、グラフとの差が縮まる', bodySize: 14 });
    L.card(s, { x: 4.73, y: 2.0, w: 3.85, h: 2.6, icon: 'MdHub', color: C.accent6, title: 'グラフが残る場面', titleSize: 15, body: '複雑なマルチホップ質問では、グラフ側が有利な場面が残る', bodySize: 14 });
    L.card(s, { x: 8.86, y: 2.0, w: 3.85, h: 2.6, icon: 'MdBalance', color: C.accent5, title: '一般 QA', titleSize: 15, body: '一貫した優位はない。「一律優位」も「不要」も言えない', bodySize: 14 });
    L.note(s, 'warn', '一部比較は「データセットごとに複数グラフ手法の最良値」を取る形式で単一構成の実運用性能ではない。LightRAG 等の LLM 選好勝率は EM・F1 と同じ尺度で並べられない', { x: 0.6, y: 4.8, w: 12.1, h: 0.85, size: 13 });
    L.note(s, 'decide', 'グラフを先に構築しない。「何を辿る必要があるか」を定義してから選ぶ。抽出した関係は確認済みの因果とは限らないので、原文・版・抽出方法の追跡を必須とする（Trial：用途限定 GraphRAG）', { x: 0.6, y: 5.75, w: 12.1, h: 0.85, size: 13, valign: 'middle' });
  }

  // ===== 2-E Agentic =====
  {
    const s = L.content('2-E Self-RAG・CRAG・Agentic RAG を区別する', {
      stages: [1, 3],
      lead: '「自己反省ループ」と一括りにしない。学習による制御／評価器による分岐／ツールを選ぶエージェントは別物',
      src: 'Self-RAG（ICLR 2024）、Corrective RAG（arXiv:2401.15884）、A-RAG（arXiv:2602.03442）',
      notes: 'Self-RAGは、検索が必要か、取得文書が関連するか、生成文が支持されているかを特殊なreflection tokenとして出力するようモデルを学習する方式です。プロンプトで「自己反省して」と指示するループとは別物で、論文の効果には学習済みモデルの能力が含まれます。CRAGは検索評価器の信頼度に応じて、取得文書をそのまま使う、分解・選別する、外部検索するといった処理を切り替えます。A-RAGに代表されるAgentic RAGは、複数の検索ツールをモデルに公開し、何をどの粒度で検索し、何を読み、いつ止めるかをモデルが選びます。',
    });
    const cols = [
      ['Self-RAG', '学習による制御', C.accent5, '検索要否・文書の関連性・生成文の支持を reflection token として出力するよう学習', 'プロンプトで「自己反省せよ」と指示するループとは別物。効果には学習済みモデルの能力が含まれる'],
      ['CRAG', '評価器による分岐', C.accent6, '検索評価器の信頼度に応じ、利用／分解・選別／外部検索を切り替える', 'Self-RAG に CRAG を足すと PopQA で 54.9→61.8 だが、選択式の ARC では 67.3→67.2。全タスクで有効ではない'],
      ['Agentic RAG', 'ツールを選ぶ', C.accent1, '検索語・粒度・読取範囲・停止条件をモデルが選ぶ（例：A-RAG）', '本質は検索回数ではなく「選択」。停止判断の評価が不可欠'],
    ];
    cols.forEach((c, i) => {
      const x = 0.6 + i * 4.13;
      L.box(s, [{ text: c[0], options: { fontSize: 18, breakLine: true } }, { text: c[1], options: { fontSize: 12, bold: false } }], { x, y: 2.0, w: 3.85, h: 0.9, fill: c[2] });
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 3.0, w: 3.85, h: 3.55, rectRadius: 0.06, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.T(s, [{ text: '仕組み', options: { bold: true, fontSize: 12, color: MUTED, breakLine: true } }, { text: c[3], options: { fontSize: 14 } }], { x: x + 0.2, y: 3.12, w: 3.45, h: 1.65, margin: 0 });
      L.T(s, [{ text: '注意点', options: { bold: true, fontSize: 12, color: MUTED, breakLine: true } }, { text: c[4], options: { fontSize: 13 } }], { x: x + 0.2, y: 4.85, w: 3.45, h: 1.6, margin: 0 });
    });
  }

  {
    const s = L.content('2-E 企業内で CRAG 型を使うときの分岐設計', {
      stages: [1, 5],
      lead: '「不足時に Web 検索」をそのまま採用しない。外部検索の許可・機密漏洩・情報の優先順位を明示する',
      src: '元レポート「自己評価とエージェント制御を区別する」',
      notes: 'CRAGの原論文は、検索結果の信頼度が低いときにWeb検索で補う設計です。しかし企業内用途でこれをそのまま採用すると、社員の質問文に含まれる顧客名や未公開情報が外部検索エンジンに送信されるリスクがあります。また社内規程と外部の一般情報が矛盾した場合、どちらを優先するかも決まっていません。元レポートは、外部検索の許可、質問からの機密漏洩、社内ルールと外部一般情報の優先順位を明示し、不許可の場合は社内の別データ源か棄権に分岐させることを提案しています。',
    });
    L.box(s, '検索評価器の信頼度', { x: 0.6, y: 3.3, w: 2.6, h: 0.9, fill: C.text2, fontSize: 15 });
    const br = [['高', '取得文書をそのまま利用', C.accent4, 2.0], ['曖昧', '分解・選別して利用、追加検索', C.accent2, 3.35], ['低', '許可された社内の別データ源 → それでも不足なら棄権', C.accent3, 4.7]];
    s.addShape(SH.LINE, { x: 3.2, y: 3.75, w: 0.4, h: 0, line: { color: MUTED, width: 1.75 } });
    s.addShape(SH.LINE, { x: 3.6, y: 2.4, w: 0, h: 2.7, line: { color: MUTED, width: 1.75 } });
    br.forEach((b) => {
      L.arrow(s, 3.6, b[3] + 0.4, 0.45, 'r');
      L.box(s, [{ text: b[0] + '：', options: { bold: true } }, { text: b[1], options: { bold: false } }], { x: 4.1, y: b[3], w: 4.2, h: 0.8, fill: b[2], color: b[2] === C.accent2 ? C.text1 : C.background1, fontSize: 14, align: 'left' });
    });
    L.card(s, { x: 8.7, y: 2.0, w: 4.0, h: 3.6, icon: 'MdPublicOff', color: C.accent3, title: '外部検索の前に決めること', titleSize: 15, body: ['外部検索を許可するか（データ分類ごと）', '質問文の機密（顧客名・未公開情報）の送信可否', '社内ルールと外部一般情報が矛盾した時の優先順位', '外部情報を使った回答の明示'], bodySize: 13 });
    L.note(s, 'leader', '論文の設計を社内にそのまま持ち込まない。セキュリティ・法務と「外部に出してよい情報」を先に合意する', { x: 0.6, y: 5.8, w: 12.1, h: 0.75, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-E A-RAG：検索ツールの粒度をモデルに公開する', {
      stages: [1, 2, 3],
      lead: 'キーワード検索・意味検索・チャンク読取を別ツールとして渡し、必要な親チャンクだけを読ませる',
      src: 'A-RAG（arXiv:2602.03442、MuSiQue、回答モデル GPT-5-mini、LLM-Acc は著者評価器による意味的一致）',
      notes: 'A-RAGは、キーワード検索、意味検索、チャンク読取という粒度の異なる操作をツールとしてモデルに公開します。モデルは文単位で検索して当たりをつけ、必要な親チャンクだけを読み、既読管理で同じ文書の再読を抑えます。毎ターン同じtop-k文書を大量に投入する単純なAgentic構成とは異なります。MuSiQueでのLLM-AccはNaive RAG 52.8、単純なAgentic構成66.2、Full構成74.1で、取得トークンは単純Agenticの56,360に対しFullは5,663でした。ただしこれは取得トークンの比較で、推論トークンや金額・遅延が同じ割合で減るわけではありません。またモデルの推論能力に依存する著者評価として読みます。',
    });
    const tools = [['MdAbc', 'キーワード検索', '型番・固有名詞を正確に'], ['MdManageSearch', '意味検索', '文単位で当たりをつける'], ['MdChromeReaderMode', 'チャンク読取', '必要な親チャンクだけ読む']];
    tools.forEach((t, i) => {
      const y = 2.0 + i * 1.05;
      L.icon(s, t[0], 0.6, y + 0.1, 0.62, C.accent1);
      L.T(s, t[1], { x: 1.35, y, w: 2.2, h: 0.4, fontSize: 15, bold: true, margin: 0, valign: 'bottom' });
      L.T(s, t[2], { x: 1.35, y: y + 0.45, w: 3.0, h: 0.4, fontSize: 13, margin: 0 });
    });
    L.T(s, '＋ 既読管理で再読を抑制', { x: 0.6, y: 5.2, w: 4, h: 0.4, fontSize: 13, bold: true, color: C.accent1, margin: 0 });
    L.bar(s, { x: 4.5, y: 1.95, w: 4.3, h: 4.3, labels: ['Naive RAG', '単純 Agentic\n（毎回 top-k 投入）', 'A-RAG Full\n（必要箇所だけ読む）'], values: [52.8, 66.2, 74.1], title: 'MuSiQue LLM-Acc', min: 0, max: 85, fmt: '0.0' });
    L.bar(s, { x: 8.9, y: 1.95, w: 3.8, h: 4.3, labels: ['単純 Agentic', 'A-RAG Full'], values: [56.36, 5.663], title: '取得トークン数（千）', colors: [HEX.accent5], fmt: '0.0', min: 0, max: 65 });
    L.T(s, '※ 取得トークンの比較。総推論トークン・金額・遅延が同率で減る意味ではない', { x: 4.5, y: 6.35, w: 8.2, h: 0.3, fontSize: 10, color: MUTED, margin: 0 });
  }

  {
    const s = L.content('2-E 停止は検索そのものと同じくらい重要', {
      stages: [1, 3, 4],
      lead: '多段ベンチマークの最も難しい質問群では GPT-5 でも EM 22.6%。主な失敗は「早すぎる終了」と「過剰な延長」',
      src: 'AgenticRAGTracer（Findings of ACL 2026、中間ホップ付き 1,305 件）',
      notes: 'AgenticRAGTracerは中間ホップの正解を持つ1,305件のベンチマークで、最難関部分ではGPT-5でもEMが22.6%でした。診断の結果、推論の連鎖を早く終わらせすぎること、逆に必要以上に引き延ばすことが主な失敗要因でした。つまり、検索と思考ステップをどう配分し、いつ止めるかそのものが評価対象になります。元レポートは、回答モデルの自己申告だけで終了を決めず、必要なサブ質問と取得済みの証拠を照合する状態機械を提案しています。予算上限に達したことと、証拠が充足したことは別の終了理由として扱います。',
    });
    L.stat(s, { x: 0.6, y: 2.0, w: 3.5, value: '22.6%', size: 60, vh: 1.1, color: C.accent3, label: '最も難しい質問群での GPT-5 の EM（完全一致率）', lh: 0.45 });
    L.card(s, { x: 0.6, y: 3.75, w: 3.5, h: 1.25, icon: 'MdFastForward', color: C.accent3, title: '早期終了', titleSize: 15, titleH: 0.5, body: '証拠不足のまま回答', bodySize: 13 });
    L.card(s, { x: 0.6, y: 5.15, w: 3.5, h: 1.25, icon: 'MdLoop', color: C.accent2, title: '過剰な延長', titleSize: 15, titleH: 0.5, body: '充足後も探索を続け迷走', bodySize: 13 });
    // state machine
    L.T(s, '提案：証拠照合に基づく状態機械', { x: 4.5, y: 2.0, w: 8, h: 0.4, fontSize: 15, bold: true, margin: 0 });
    L.box(s, '計画（サブ質問）', { x: 4.5, y: 2.6, w: 2.1, h: 0.7, fill: C.text2, fontSize: 13 });
    L.arrow(s, 6.65, 2.95, 0.35, 'r');
    L.box(s, '検索・読取', { x: 7.05, y: 2.6, w: 1.9, h: 0.7, fill: C.accent1, fontSize: 13 });
    L.arrow(s, 9.0, 2.95, 0.35, 'r');
    L.box(s, '証拠照合', { x: 9.4, y: 2.6, w: 1.6, h: 0.7, fill: C.accent2, color: C.text1, fontSize: 13 });
    L.T(s, '不足', { x: 8.0, y: 3.35, w: 1.2, h: 0.3, fontSize: 11, color: MUTED, margin: 0, align: 'center' });
    s.addShape(SH.LINE, { x: 10.2, y: 3.3, w: 0, h: 0.4, line: { color: MUTED, width: 1.5 } });
    s.addShape(SH.LINE, { x: 8.0, y: 3.7, w: 2.2, h: 0, line: { color: MUTED, width: 1.5 } });
    L.arrow(s, 8.0, 3.7, 0.4, 'u');
    L.arrow(s, 11.05, 2.95, 0.3, 'r');
    L.box(s, '終了判定', { x: 11.4, y: 2.6, w: 1.3, h: 0.7, fill: C.text2, fontSize: 13 });
    const ends = [['充足', '引用付き生成へ', C.accent4], ['予算超過', '回答範囲を限定', C.accent2], ['権限不足', '理由を示して棄権', C.accent3], ['根拠不存在', '「見つからない」と回答', C.accent3], ['矛盾未解消', '両論併記か確認依頼', C.accent5]];
    ends.forEach((e, i) => {
      const y = 4.0 + i * 0.5;
      L.box(s, e[0], { x: 9.0, y, w: 1.5, h: 0.42, fill: e[2], color: e[2] === C.accent2 ? C.text1 : C.background1, fontSize: 12 });
      L.T(s, e[1], { x: 10.6, y, w: 2.1, h: 0.42, fontSize: 12, valign: 'middle', margin: 0 });
    });
    L.T(s, '終了理由を区別して記録する（評価・監査に使う）', { x: 4.5, y: 4.0, w: 4.2, h: 0.7, fontSize: 13, margin: 0 });
    L.note(s, 'tip', '回答モデルの自己申告（「十分です」）だけで終了を決めない。必要なサブ質問と取得済み証拠を外部で照合する', { x: 4.5, y: 4.8, w: 4.2, h: 1.6, size: 13 });
  }

  {
    const s = L.content('2-E Agentic RAG の制御項目', {
      stages: [1, 3, 4, 5],
      lead: '予算・状態・終了理由は LLM の判断だけに任せず、外部のオーケストレータで決定的に管理する',
      src: '元レポート「停止は検索そのものと同じくらい重要」（本レポートの提案する実装）',
      notes: 'Agentic RAGを本番で運用するには、LLMに自由に検索させるだけでは不十分で、外側のオーケストレータが予算と状態を管理する必要があります。ステップ予算は最大ツール回数・経過時間・推論量で制限し、証拠の増分を記録して「新しい情報が増えていないのに検索を続けている」状態を検出します。検索状態には、どのクエリでどの対象をどのACL・時点で検索し、何を採用したかを保存し、監査と失敗分析に使います。並列化は独立したサブ質問だけに限り、前提に依存する検索は順序を守ります。',
    });
    L.table(s, [
      ['制御項目', '提案する実装'],
      ['ステップ予算', '最大ツール回数・経過時間・推論量を外部オーケストレータで制限'],
      ['証拠の増分', '新規文書、未解決主張の解消、既読重複を記録（進捗のない探索を検出）'],
      ['検索状態', 'クエリ、検索対象、ACL、時点、候補、採用根拠を保存'],
      ['終了状態', '充足、予算超過、権限不足、根拠不存在、矛盾未解消を区別'],
      ['非同期・並列', '独立したサブ質問のみ並列化し、前提依存の検索は順序を守る'],
      ['回答品質', '最終正解率に加え、ホップごとの根拠到達率と停止の適切さを測定'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [2.6, 9.5], fontSize: 14, rowH: 0.53 });
    L.note(s, 'leader', 'Agent の失敗は「最終回答が違う」だけでは原因が分からない。検索状態と終了理由のトレースを初期実装から残す', { x: 0.6, y: 6.0, w: 12.1, h: 0.62, size: 13, valign: 'middle' });
  }

  {
    const s = L.content('2-E ルーティング：全質問を Agentic にしない', {
      stages: [1, 4, 5],
      lead: '通常検索で解ける質問は短い経路に保ち、複合質問だけを Agentic 経路へ振り分ける',
      src: '元レポート「Adaptive・Corrective・Agentic RAG」採用判断、採用レーダー（Hold：全問への無制限な反復検索）',
      notes: '実際の問い合わせの多くは、1回の検索で答えられる単純な質問です。これらまでAgentic経路に流すと、遅延と費用が数倍になり、過剰探索による迷走リスクも増えます。元レポートは、タスク分類で通常経路とAgentic経路を振り分けることを提案し、全問への無制限な反復検索はHoldとしています。注意点は、ルータ自体も誤分類することです。複雑な質問を単純経路に回すと答えられず、単純な質問をAgenticに回すと無駄なコストがかかります。ルータの精度も評価し、複雑な方式の成功率だけでなく、全トラフィックでの費用対効果を測ります。',
    });
    L.box(s, '全問い合わせ', { x: 0.6, y: 3.2, w: 2.0, h: 1.0, fill: C.text2, fontSize: 15 });
    L.arrow(s, 2.65, 3.7, 0.4, 'r');
    L.box(s, 'タスク分類（ルータ）', { x: 3.1, y: 3.2, w: 2.3, h: 1.0, fill: C.accent2, color: C.text1, fontSize: 14 });
    s.addShape(SH.LINE, { x: 5.4, y: 3.7, w: 0.35, h: 0, line: { color: MUTED, width: 1.75 } });
    s.addShape(SH.LINE, { x: 5.75, y: 2.35, w: 0, h: 2.75, line: { color: MUTED, width: 1.75 } });
    const rt = [['単純・単一ホップ', '通常経路：ハイブリッド＋再ランキング', C.accent1, 2.0], ['全体要約', 'コミュニティ要約等', C.accent6, 3.3], ['多段・複合', '予算付き Agentic 経路', C.accent5, 4.6]];
    rt.forEach((r) => {
      L.arrow(s, 5.75, r[3] + 0.35, 0.4, 'r');
      L.box(s, [{ text: r[0] + '\n', options: { bold: true } }, { text: r[1], options: { bold: false, fontSize: 12 } }], { x: 6.2, y: r[3], w: 3.2, h: 0.85, fill: r[2], fontSize: 14 });
    });
    L.card(s, { x: 9.7, y: 2.0, w: 3.0, h: 3.45, icon: 'MdRoute', color: C.accent2, title: '評価すること', titleSize: 15, body: ['ルータの誤分類率', '経路別の成功率', '全トラフィックの費用・p95 遅延', '経路ごとの失敗内訳'], bodySize: 13 });
    L.note(s, 'decide', '通常検索で解ける問いは短い経路に保ち、複合質問のみ Agentic 経路へ。ルータ自体の誤分類も評価し、全トラフィックでの費用対効果を測る', { x: 0.6, y: 5.75, w: 12.1, h: 0.85, size: 13, valign: 'middle' });
  }

  // ===== 2-F Training =====
  {
    const s = L.content('2-F RAFT：検索文脈の「使い方」を学習する', {
      stages: [3],
      lead: '正解文書と無関係文書を混ぜた訓練例で、根拠から引用して答える力と、ノイズを無視する力を学習させる',
      src: 'RAFT（arXiv:2403.10131）',
      notes: 'RAFTは、知識そのものをモデルのパラメータに覚えさせる通常の微調整とは異なり、「検索された文書をどう使うか」という振る舞いを学習させます。訓練例には正解を含む文書と、無関係な文書（ディストラクタ）を混ぜ、正解文書から該当箇所を引用して推論する回答を教師にします。これにより、根拠を渡しても誤答する（利用失敗）問題に効く可能性があります。ただし主な対象は同一ドメイン・同一資料群での利用で、別の専門領域や大幅に更新されたコーパスへの一般化は保証されません。',
    });
    L.T(s, '訓練例の構成', { x: 0.6, y: 2.0, w: 6, h: 0.4, fontSize: 15, bold: true, margin: 0 });
    L.box(s, '質問', { x: 0.6, y: 2.5, w: 1.6, h: 0.65, fill: C.text2, fontSize: 14 });
    L.box(s, '正解文書', { x: 2.4, y: 2.5, w: 1.6, h: 0.65, fill: C.accent4, fontSize: 14 });
    ['無関係文書', '無関係文書', '無関係文書'].forEach((t, i) => L.box(s, t, { x: 4.2 + i * 1.5, y: 2.5, w: 1.35, h: 0.65, fill: C.background2, color: MUTED, fontSize: 12, lineColor: L.BORDER }));
    L.arrow(s, 4.2, 3.25, 0.4, 'd');
    L.box(s, '教師：正解文書から引用して推論する回答', { x: 0.6, y: 3.75, w: 7.5, h: 0.7, fill: C.accent1, fontSize: 14 });
    L.card(s, { x: 0.6, y: 4.7, w: 3.6, h: 1.85, icon: 'MdCheckCircle', color: C.accent4, title: '効く場面', titleSize: 15, body: '固定的な専門領域で、文書を与えてもモデルが使いこなせない場合', bodySize: 13 });
    L.card(s, { x: 4.5, y: 4.7, w: 3.6, h: 1.85, icon: 'MdWarning', color: C.accent3, title: '限界', titleSize: 15, body: '別領域・大幅に更新されたコーパスへの一般化は保証されない', bodySize: 13 });
    L.card(s, { x: 8.5, y: 2.0, w: 4.2, h: 4.55, icon: 'MdSchedule', color: C.accent5, title: '運用で必要なこと', titleSize: 15, body: ['文書や回答形式の変化を含む時系列テストを設ける', '索引更新だけで済む部分と、再学習が必要な部分を分ける', '学習データの作成・更新体制', 'ベースモデル更新時の再学習費用'], bodySize: 13 });
  }

  {
    const s = L.content('2-F Search-R1：検索の方策を強化学習する', {
      stages: [1, 3],
      lead: '推論・検索・回答を交互に行う軌跡を、最終回答の正しさを報酬に強化学習で最適化する',
      src: 'Search-R1（arXiv:2503.09516、E5 検索器・2018年 Wikipedia 等、7B モデル）',
      notes: 'Search-R1は、モデルが推論し、必要に応じて検索クエリを発行し、結果を読んでまた推論し、最後に回答するという一連の軌跡を強化学習で最適化します。重要な工夫は、検索で得たトークンを学習損失からマスクし、モデル自身が生成した行動だけを最適化する点と、最終回答の正しさを報酬にする点です。論文条件では7Bモデルの7つのQAデータセット平均EMが、RAGベースライン0.304から0.431になりました。差は12.7ポイント、相対約41.8%です。ただし最新の商用モデルや企業内コーパスで同じ改善が出るとは解釈できません。',
    });
    L.flow(s, [{ t: '推論', d: '何が必要か考える' }, { t: '検索', d: 'クエリを発行' }, { t: '読む', d: '検索結果は自分の出力でないので学習対象外' }, { t: '…繰り返し' }, { t: '回答', d: '正しさ＝報酬' }], { x: 0.6, y: 2.0, w: 12.1, h: 1.1, fill: C.accent5, tSize: 15 });
    L.stat(s, { x: 0.6, y: 3.4, w: 4.5, value: '0.304 → 0.431', size: 36, vh: 0.8, label: '7 QA データセット平均 EM（RAG ベースライン → Search-R1、7B）\n+12.7pt、相対約 41.8%', lh: 0.85, lsize: 12 });
    L.note(s, 'warn', [{ text: '報酬設計の落とし穴：', options: { bold: true, breakLine: true } }, { text: '正解文字列だけの報酬は「正解だが権限外の根拠を使用」「引用が誤り」「古い回答」を区別できない。これらを検証項目として報酬・評価に含める', options: {} }], { x: 5.4, y: 3.4, w: 7.3, h: 1.6, size: 14 });
    L.note(s, 'decide', '独自モデルの訓練（RAFT は Trial、検索方策 RL は Assess）は、検索器・評価セット・報酬定義・更新検知を整えた後に検討する。学習投資は基盤が固まってからの最後の手段', { x: 0.6, y: 5.3, w: 12.1, h: 1.2, size: 14, valign: 'middle' });
  }

  // ===== 2-G Multimodal =====
  {
    const s = L.content('2-G 視覚文書検索：OCR 中心とページ画像中心', {
      stages: [0, 1, 5],
      lead: 'ColPali はページ画像を VLM で複数ベクトル化し、テキストクエリと Late Interaction で照合する',
      src: 'ColPali（arXiv:2407.01449、ViDoRe ベンチマーク）',
      notes: 'ColPaliは文書ページを画像のままVision Language Modelに入力し、ページ内の領域ごとの複数ベクトルを作ります。検索時はテキストクエリのトークンとページのベクトルをColBERTと同じLate Interactionで照合します。OCRテキストだけの索引では失われる図表や配置を検索対象に含められるのが利点です。ViDoReでの平均nDCG@5はColPali 81.3、ColQwen2の掲載構成86.6で、視覚検索モデルの中でも差があります。一方、float16表現で1ページ257.5KBと報告されており、100万ページなら単純計算で約258GBになります。ページ数が多い環境では容量が主要な検証項目です。',
    });
    L.card(s, { x: 0.6, y: 2.0, w: 3.85, h: 2.6, icon: 'MdTextSnippet', color: C.accent5, title: 'OCR・テキスト中心', titleSize: 15, body: ['軽量・既存の検索基盤を流用', '図表・配置の情報が欠落しやすい'], bodySize: 13 });
    L.card(s, { x: 4.73, y: 2.0, w: 3.85, h: 2.6, icon: 'MdImageSearch', color: C.accent6, title: 'ページ画像中心（ColPali 系）', titleSize: 15, body: ['図表・スライド・スキャン PDF に強い', '索引容量が大きい・引用箇所の特定が課題'], bodySize: 13 });
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 8.86, y: 2.0, w: 3.85, h: 2.6, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    L.stat(s, { x: 9.05, y: 2.05, w: 3.5, value: '81.3 / 86.6', size: 30, vh: 0.7, label: 'ViDoRe 平均 nDCG@5（ColPali / ColQwen2）', lh: 0.4, lsize: 12 });
    L.stat(s, { x: 9.05, y: 3.25, w: 3.5, value: '257.5 KB/頁', size: 28, vh: 0.65, color: C.accent3, label: 'ColPali float16 表現の容量', lh: 0.4, lsize: 12 });
    L.note(s, 'add', '容量の概算：100万ページ × 257.5 KB ≈ 258 GB（単純計算。圧縮・量子化・プーリングで変わる）。ページ数 × 1頁容量で事前に見積もる', { x: 0.6, y: 4.8, w: 6.0, h: 1.75, size: 13 });
    L.note(s, 'decide', '画像検索か OCR かを二者択一にしない。本文検索・表の構造化・ページ画像検索を同じページ ID に紐づけ、必要なページ・領域だけを視覚モデルへ送り、引用は元ページと箇所を提示する（Trial）', { x: 6.8, y: 4.8, w: 5.9, h: 1.75, size: 13 });
  }

  {
    const s = L.content('2-G 表と数値：検索と計算を分離する', {
      stages: [0, 3, 4],
      lead: '表を含む QA は「正しい表を探す」と「正しく計算する」の2つの失敗を持つ。別々にテストする',
      src: 'T²-RAGBench（EACL 2026、23,088 件）、MLPerf End-to-End RAG（MLCommons 2026）',
      notes: 'T²-RAGBenchは、テキストと表を含む23,088件の質問・文脈・回答の組で、正しい文脈を検索してから数値推論する設定を扱います。公式抄録はDenseとSparseを組み合わせたHybrid BM25が有効と報告していますが、詳細スコアは確認できないため効果量は記載していません。MLPerfの参照RAG構成では、数値と表に関する回答精度がいずれも31%と報告され、表の分割や数値の読み違い・計算が課題として挙げられています。これは当該参照構成の値であり、RAG全般の上限ではありません。監査可能な数値回答には、使った行・列・単位・期間・計算式を明示し、計算はLLMではなく決定的なツールに任せます。',
    });
    L.stat(s, { x: 0.6, y: 2.0, w: 3.6, value: '31%', size: 60, vh: 1.1, color: C.accent3, label: 'MLPerf 参照 RAG：数値の質問・表の質問とも正答率 31%。検索と計算のどちらの失敗か分からない', lh: 0.7 });
    L.T(s, '※ 当該参照構成の値であって、RAG 全般や最新モデルの上限ではない', { x: 0.6, y: 3.9, w: 3.6, h: 0.65, fontSize: 11, color: MUTED, margin: 0 });
    L.flow(s, [{ t: '表の検索', d: 'Hybrid（Dense＋Sparse）で正しい表・行を探す' }, { t: '値の抽出', d: '行・列・単位・期間を特定' }, { t: '計算', d: '決定的なツールで実行' }, { t: '回答', d: '使った行列・式を明示' }], { x: 4.5, y: 2.0, w: 8.2, h: 1.6, tSize: 15, dSize: 12 });
    L.T(s, '← 検索成功のテスト →', { x: 4.5, y: 3.7, w: 4.0, h: 0.35, fontSize: 12, color: MUTED, align: 'center', margin: 0 });
    L.T(s, '← 計算成功のテスト →', { x: 8.7, y: 3.7, w: 4.0, h: 0.35, fontSize: 12, color: MUTED, align: 'center', margin: 0 });
    L.note(s, 'decide', '監査可能な数値回答では、取得した行・列、単位、期間、計算式を明示する。計算は可能な限り決定的なツールに分離し、検索成功と計算成功を別のテストで検証する', { x: 4.5, y: 4.3, w: 8.2, h: 1.3, size: 14 });
    L.note(s, 'tip', 'T²-RAGBench の抄録は BM25＋Dense のハイブリッドの有効性を報告（詳細スコアは未確認のため効果量は示さない）', { x: 0.6, y: 5.8, w: 12.1, h: 0.75, size: 13, valign: 'middle' });
  }

  // ===== 2-H Long context & compression =====
  {
    const s = L.content('2-H 長文コンテキスト：「RAG か長文か」ではなく組み合わせ', {
      stages: [2, 3],
      lead: '検索で対象文書を絞り、必要な文書はセクションや全文を長めに読む。長文読解は RAG の「読取段階」として使える',
      src: 'Lost in the Middle（arXiv:2307.03172）、Long Context vs. RAG（2025, arXiv:2501.01880）',
      notes: 'Lost in the Middleは、関連情報が入力の最初や最後にあるときより、中央にあるときに性能が下がる傾向を示しました。ただし対象は当時のモデルで、同じ劣化が2026年のすべてのモデルに残るとは限らないため、採用候補のモデルで位置依存性を測ります。2025年の再評価では、外部文脈が必要な質問に絞ると全体としては長文コンテキストが優位でしたが、RAGだけが正答する質問もありました。結論はモデル・コーパス・検索単位・質問の性質に依存します。元レポートは、検索で文書を絞ってから長めに読む構成を比較対象にすることを提案しています。',
    });
    // conceptual U curve using bars
    L.bar(s, { x: 0.6, y: 1.95, w: 5.6, h: 3.6, labels: ['先頭', '前半', '中央', '後半', '末尾'], values: [75, 62, 55, 63, 72], title: '概念図：関連情報の位置と性能（数値は説明用の模式値）', min: 40, max: 80, colors: [HEX.accent5], fmt: '0' });
    L.T(s, '※ Lost in the Middle の傾向を示す模式図。実測値ではない。最新モデルでの劣化量は採用候補で測る', { x: 0.6, y: 5.6, w: 5.6, h: 0.6, fontSize: 11, color: MUTED, margin: 0 });
    L.card(s, { x: 6.5, y: 2.0, w: 6.2, h: 2.0, icon: 'MdBalance', title: '2025年の再評価', titleSize: 15, body: '外部文脈が必要な質問に絞ると全体では長文が優位。それでも絞るのは、全社文書は窓に入らず、権限・費用・遅延でも有利だから。RAG のみ正答する質問もある', bodySize: 13 });
    L.flow(s, [{ t: '検索で絞る', d: '対象文書を数件に' }, { t: '長めに読む', d: 'セクション・全文' }, { t: '引用付き生成' }], { x: 6.5, y: 4.25, w: 6.2, h: 1.1, tSize: 14, dSize: 12 });
    L.note(s, 'tip', '位置依存性・長文読解力はモデル世代で変わる。モデル更新のたびに再測定する', { x: 6.5, y: 5.55, w: 6.2, h: 0.95, size: 13 });
  }

  {
    const s = L.content('2-H コンテキスト圧縮は根拠を改変するリスクも持つ', {
      stages: [2, 3],
      lead: '圧縮でノイズが減り EM は上がった（英語会議録）。だが否定・条件が 1 語落ちれば意味が逆転する',
      src: 'LLMLingua-2（arXiv:2403.12968、MeetingBank・Mistral-7B 条件）',
      notes: 'LLMLingua-2は、教師モデルから得た圧縮例を使って、各トークンを残すか削るかを分類するモデルを学習します。MeetingBankとMistral-7Bの条件では、3,003トークンを970トークンに圧縮し、QAのEMが66.95から76.22に上がりました。ノイズが減ることで読解が改善する場合があることを示していますが、英語の会議録中心の結果で、法務や数値中心の専門文書にそのまま一般化はできません。圧縮で「しない」「を除く」「以上」などの否定・条件が落ちると、意味が逆転します。元レポートは高度な圧縮をAssessとし、まず重複除去や親チャンクの読取範囲制御などの安全な方法を試すよう勧めています。',
    });
    L.bar(s, { x: 0.6, y: 1.95, w: 4.0, h: 3.7, labels: ['原文', '圧縮後'], values: [3003, 970], title: 'トークン数', colors: [HEX.accent5], fmt: '#,##0', max: 3500 });
    L.bar(s, { x: 4.7, y: 1.95, w: 4.0, h: 3.7, labels: ['原文', '圧縮後'], values: [66.95, 76.22], title: 'QA EM', colors: [HEX.accent1], fmt: '0.00', min: 0, max: 90 });
    L.card(s, { x: 9.0, y: 1.95, w: 3.7, h: 3.7, icon: 'MdShield', color: C.accent3, title: '保護すべき要素', titleSize: 15, body: ['否定語（〜しない）', '数値・単位', '条件節（ただし・を除く）', '出典 ID', '→ 圧縮前後の回答差を測る'], bodySize: 13 });
    L.note(s, 'decide', '圧縮前に重複除去・親チャンクの読取範囲制御・不要文書の除外を試す。高度な圧縮（Assess）は、コスト削減と証拠保持を同時に評価できる用途に限定。最終引用用の原文は失わない', { x: 0.6, y: 5.8, w: 12.1, h: 0.85, size: 13, valign: 'middle' });
  }

  // ===== Evidence ledger =====
  {
    const s = L.content('定量エビデンス台帳①：検索・前処理系', {
      stages: [4],
      lead: '効果の種類と比較条件を残した抜粋。行をまたいだスコアの大小は手法のランキングを意味しない',
      src: '元レポート「定量エビデンスの比較台帳」（各論文・記事）',
      notes: 'この台帳は、ステークホルダーやベンダーとの議論で「その数字は何を測ったものか」を確認するための早見表です。例えばLate Chunkingの+1.9ポイントとHyDEの+16.8ポイントは、データセットも指標の意味も違うので比較できません。各行の「解釈・限界」列を必ずセットで引用してください。',
    });
    L.table(s, [
      ['手法・資料', '条件・指標', '比較結果', '解釈・限界'],
      ['BEIR 再ランキング', '18 データセット、nDCG@10', 'BM25＋クロスエンコーダ（CE）が 16/18 で BM25 超え', '検索順位の改善。回答効果ではない'],
      ['Contextual Retrieval', '開発元評価、1−Recall@20', '埋め込みのみ 5.7% → 文脈付与＋BM25 2.9% → ＋再ランク 1.9%', '失敗率の相対 49%・67% 減。正解率の改善率ではない'],
      ['Late Chunking', '3モデル・4 BEIR、5文単位', '平均 nDCG@10 52.4 → 54.3', 'コーパス検索で +1.9pt。文書内検索では逆効果（チャンク同士が似る）'],
      ['BGE-M3', 'MIRACL 18言語、nDCG@10', 'mE5-large 65.4 ／ BGE-M3 70.0（別モデル）', '別モデル間の比較。日本語業務精度ではない'],
      ['HyDE', 'TREC DL19、nDCG@10', 'Contriever 44.5 → 61.3（参考：教師あり 62.1）', 'ゼロショット改善。教師ありを上回ってはいない'],
      ['RAPTOR', 'QuALITY 開発、同一 GPT-3、正解率', 'BM25 57.3、DPR 60.4、RAPTOR 62.4', '読解モデルを揃えた比較を採用'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [2.3, 3.0, 3.6, 3.2], fontSize: 12, rowH: 0.62 });
  }

  {
    const s = L.content('定量エビデンス台帳②：グラフ・Agent・学習・引用', {
      stages: [4],
      lead: '指標が EM・F1・LLM-Acc・LLM 選好・引用再現率とバラバラ。同じ「精度」として並べない',
      src: '元レポート「定量エビデンスの比較台帳」（各論文）',
      notes: '後半の台帳です。GraphRAGの72〜83%はLLM選好勝率、A-RAGの74.1はLLM-Acc、Search-R1の0.431はEMと、指標の種類がすべて違います。HopRAGは強い比較相手との差が+1.17/+0.57ポイントと小さく、探索呼び出しのコストも確認が必要です。ALCEは、引用品質の改善が正確性の改善と同義ではないことを示す重要な例です。',
    });
    L.table(s, [
      ['手法・資料', '条件・指標', '比較結果', '解釈・限界'],
      ['GraphRAG', '2コーパスの全体質問、LLM 選好', '意味検索に対する包括性勝率 72〜83%', '正解率ではない。全体要約タスクでの証拠'],
      ['HippoRAG 2', '同一 Llama-3.3-70B、7データセット平均 QA F1', 'NV-Embed-v2 RAG 57.0 → 59.8', '絶対 +2.8。多段検索の改善と全体平均を区別'],
      ['HopRAG', '3多段 QA 平均、GPT-4o、EM/F1', 'SiReRAG 53.93/65.83 → 55.10/66.40', '強い比較相手との差は +1.17/+0.57pt。探索呼出しも要確認'],
      ['A-RAG', 'MuSiQue、GPT-5-mini、LLM-Acc', 'Naive RAG 52.8 → Full 74.1', '著者の評価器による意味的一致。EM ではない'],
      ['Search-R1', 'E5＋2018 Wikipedia、7B、7 QA 平均 EM', 'RAG 0.304 → 0.431', '+12.7pt、相対約 41.8%。学習込みの比較'],
      ['ALCE', 'ASQA、ChatGPT、引用再現率', '引用の良い回答を選び直すと 73.6 → 84.8、正確性 40.4 → 40.2', '引用改善が正確性改善と同義でない'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [1.9, 3.4, 3.5, 3.3], fontSize: 12, rowH: 0.62 });
  }
};
