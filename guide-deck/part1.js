// Opening, Part 0 (fundamentals), Part 1 (big picture & reading evidence)
module.exports = (L) => {
  const { pres, C, SH, MUTED } = L;

  // ---------- Title ----------
  L.section('はじめに');
  {
    const s = pres.addSlide({ masterName: 'TITLE', sectionTitle: 'はじめに' });
    L.T(s, 'ADVANCED RAG', { x: 0.8, y: 1.3, w: 8, h: 0.5, fontSize: 18, bold: true, color: C.accent2, charSpacing: 6, margin: 0 });
    L.T(s, 'Advanced RAG 実践ガイド', { x: 0.8, y: 1.9, w: 11.5, h: 1.1, fontSize: 48, bold: true, color: C.background1, margin: 0 });
    L.T(s, 'Naive RAG の次へ ― 失敗原因から設計する検索拡張生成', { x: 0.8, y: 3.05, w: 11.5, h: 0.6, fontSize: 24, color: C.background2, margin: 0 });
    // pipeline motif
    const st = ['取込', '検索', '順位付け', '生成', '評価', '運用・安全'];
    st.forEach((t, i) => {
      s.addText(t, { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.2, x: 0.8 + i * 1.75, y: 4.35, w: 1.45, h: 0.45, fill: { color: i === 0 ? C.accent2 : C.background1, transparency: i === 0 ? 0 : 85 }, line: { color: i === 0 ? C.accent2 : 'A9BCC2' }, fontSize: 13, bold: true, color: i === 0 ? C.text1 : C.background1, align: 'center', valign: 'middle', margin: 0 });
      if (i < st.length - 1) L.arrow(s, 0.8 + i * 1.75 + 1.5, 4.575, 0.22, 'r', 'A9BCC2', 1.5);
    });
    L.T(s, '対象: Naive RAG を理解し始めた技術者 ／ Advanced RAG 導入プロジェクトの新任テックリーダー', { x: 0.8, y: 5.5, w: 11.5, h: 0.4, fontSize: 14, color: C.background2, margin: 0 });
    L.T(s, '原典「Advanced RAG技術レポート」（調査基準日 2026-11-13）を再構成し、基礎解説・リーダー実務を補足', { x: 0.8, y: 5.95, w: 11.5, h: 0.4, fontSize: 14, color: 'A9BCC2', margin: 0 });
    s.addNotes('本資料は「Advanced RAG技術レポート」（調査基準日2026年11月13日）をもとに、Naive RAGを学び始めた技術者がAdvanced RAG導入プロジェクトをリードできる水準まで理解を引き上げることを目的に再構成したものです。元レポートにない基礎解説やリーダー実務は「補足」と明示しています。各スライドのノート欄に、口頭説明用の詳しい解説を入れています。');
  }

  // ---------- How to read ----------
  {
    const s = L.content('この資料のゴールと読み方', {
      lead: '「どの手法が最強か」ではなく「どの失敗に、何が、どの条件で効くか」を説明できる状態を目指す',
      notes: 'ゴールは用語を覚えることではなく、プロジェクトの技術判断を自分の言葉で説明できることです。各スライド上部の6つのステージ表示は、その話題がRAGパイプラインのどこに関係するかを示します。黄色の「リーダーの視点」は、技術リーダーとして判断・説明するときの観点です。紫の「補足」は元レポートにない一般知識で、出典の確度が元レポートと同じではない点に注意してください。',
    });
    const cw = 3.83, y = 2.05, h = 2.55;
    L.card(s, { x: 0.6, y, w: cw, h, icon: 'MdSchool', title: '理解のゴール', body: ['RAGの失敗を段階別に診断できる', '主要手法の仕組み・効く条件・コストを説明できる', '論文やベンダーの数字を正しく読める'] });
    L.card(s, { x: 4.73, y, w: cw, h, icon: 'MdFlag', color: C.accent2, title: 'リーダーとしてのゴール', body: ['評価基盤を先に作り、改善を実測で判断できる', '採用・不採用を根拠付きで合意形成できる', '権限・鮮度・コストのリスクを先回りできる'] });
    L.card(s, { x: 8.87, y, w: cw, h, icon: 'MdMenuBook', color: C.accent5, title: 'この資料の使い方', body: ['本文スライド＝要点、ノート欄＝詳しい解説', '各Partは前のPartの用語を前提に進む', '付録に用語集と出典一覧を収録'] });
    // legend
    L.T(s, '凡例', { x: 0.6, y: 4.85, w: 1.0, h: 0.35, fontSize: 14, bold: true, margin: 0 });
    s.addText('検索', { shape: SH.ROUNDED_RECTANGLE, rectRadius: 0.14, x: 0.6, y: 5.3, w: 0.98, h: 0.28, fill: { color: C.accent1 }, line: { color: C.accent1 }, fontSize: 10, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0 });
    L.T(s, '上部のステージ表示：その話題がRAGパイプラインのどこに関わるか', { x: 1.7, y: 5.22, w: 5, h: 0.45, fontSize: 13, margin: 0, valign: 'middle' });
    L.icon(s, 'MdFlag', 7.0, 5.2, 0.42, C.accent2);
    L.T(s, 'リーダーの視点：判断・説明の観点', { x: 7.55, y: 5.2, w: 5, h: 0.42, fontSize: 13, margin: 0, valign: 'middle' });
    L.icon(s, 'MdLibraryAdd', 0.6, 5.85, 0.42, C.accent5);
    L.T(s, '補足：元レポート外の一般知識による解説（確度は出典ごとに確認）', { x: 1.15, y: 5.85, w: 5.7, h: 0.42, fontSize: 13, margin: 0, valign: 'middle' });
    L.icon(s, 'MdGavel', 7.0, 5.85, 0.42, C.accent4);
    L.T(s, '採用判断：元レポートの推奨する判断', { x: 7.55, y: 5.85, w: 5, h: 0.42, fontSize: 13, margin: 0, valign: 'middle' });
  }

  // ---------- Agenda ----------
  {
    const s = L.content('全体の構成', { lead: '基礎 → 全体像 → 手法各論 → 評価 → 安全・運用 → 設計 → リーダー実務 → アンチパターン大全', notes: '前半で共通言語（指標・失敗の分類）を固め、手法各論はパイプラインの上流から下流へ順に進みます。評価と安全・運用は「後で考えるもの」ではなく、手法選定より先に設計すべきものとして独立したPartにしています。続いてテックリーダーとしての実務（最初の90日、合意形成）を扱い、最後の Part 7 で、データ・検索・システムと規模のアンチパターンと、全社横断 RAG の事例をまとめます。' });
    const parts = [
      ['Part 0', '基礎の総点検', 'Naive RAG・埋め込み・BM25・失敗点', 'MdSchool'],
      ['Part 1', '全体像と証拠の読み方', '4段階の整理・診断表・指標', 'MdInsights'],
      ['Part 2', '手法各論', '取込・検索・クエリ・構造・Agentic・学習・長文', 'MdTune'],
      ['Part 3', '評価', '層別指標・実験手順・評価セット', 'MdFactCheck'],
      ['Part 4', 'セキュリティ・運用・費用', '権限・汚染・鮮度・コストモデル', 'MdShield'],
      ['Part 5', '参照設計とロードマップ', 'コンポーネント・採用レーダー・導入段階', 'MdAccountTree'],
      ['Part 6', 'テックリーダーの実践', '90日計画・合意形成・アンチパターン集', 'MdFlag'],
      ['Part 7', 'アンチパターン大全', '3 層の失敗・規模の罠・全社横断 RAG の事例', 'MdReportProblem'],
      ['付録', '用語集・出典', '用語の定義と一次資料', 'MdMenuBook'],
    ];
    parts.forEach((p, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = 0.6 + col * 6.15, y = 1.95 + row * 0.98;
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y, w: 5.95, h: 0.86, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.icon(s, p[3], x + 0.18, y + 0.14, 0.58, i >= 6 && i <= 7 ? C.accent2 : C.accent1);
      L.T(s, p[0], { x: x + 0.95, y: y + 0.12, w: 0.9, h: 0.35, fontSize: 13, bold: true, color: C.accent1, margin: 0 });
      L.T(s, p[1], { x: x + 1.85, y: y + 0.1, w: 4.0, h: 0.38, fontSize: 16, bold: true, margin: 0 });
      L.T(s, p[2], { x: x + 0.95, y: y + 0.46, w: 4.9, h: 0.36, fontSize: 12, color: MUTED, margin: 0 });
    });
  }

  // ---------- Executive summary ----------
  {
    const s = L.content('結論を先に：Advanced RAG で押さえるべき5点', {
      lead: '基盤（構造保持の取込・権限付きハイブリッド検索・再ランキング・原文引用・評価）が先、高度化は後',
      src: 'Huang & Huang (ACM CSUR)、BEIR、BRIGHT、Anthropic Contextual Retrieval、Beyond Chunk-Then-Embed、GraphRAG、HippoRAG 2、A-RAG、AgenticRAGTracer、MLPerf',
      notes: '元レポートの結論です。1つ目、Dense検索だけを標準解にせず、BM25などの語彙検索と組み合わせ、再ランキングを評価する。ただし再ランキングが逆効果になる領域もある。2つ目、Contextual RetrievalやLate Chunkingはチャンク単体で失われる文脈を補うが万能ではない。3つ目、GraphRAGという名前で括られる手法は目的が全く異なる。4つ目、Agentic RAGの本質は検索回数ではなく、検索語・粒度・読取範囲・停止条件をモデルに選ばせること。5つ目、評価はエンドツーエンドかつ途中段階まで測る方向に進んでいる。',
    });
    const rows = [
      ['MdSearch', '検索品質の基盤', 'Dense 単独を標準解にしない。BM25等との補完＋再ランキングを評価。ただし再ランキングが性能を下げる領域もある（2-B）'],
      ['MdDescription', '文脈欠落への対策', 'Contextual Retrieval / Late Chunking はチャンク単体で失われる意味を補うが、1 文書の中を探す検索では不利になる結果もある（2-A）'],
      ['MdHub', 'グラフの使い分け', 'コーパス全体の論点把握（コミュニティ要約）と、多段の関連探索（HippoRAG 2 等）は別物。「GraphRAG」で一括評価しない（2-D）'],
      ['MdRoute', 'Agentic RAG の本質', '検索回数を増やすことではない。検索語・粒度・読取範囲・停止条件をモデルに選ばせ、停止の適切さも評価する'],
      ['MdFactCheck', '評価の重心', '検索単体の指標に加え、多段検索の途中の各段と、取込から回答までの通し（E2E）を測る。非公開評価と公開ベンチマークは区別（Part 3）'],
    ];
    rows.forEach((r, i) => {
      const y = 2.0 + i * 0.92;
      L.icon(s, r[0], 0.6, y + 0.08, 0.56, i === 0 ? C.accent2 : C.accent1);
      L.T(s, r[1], { x: 1.35, y, w: 2.9, h: 0.72, fontSize: 16, bold: true, valign: 'middle', margin: 0 });
      L.T(s, r[2], { x: 4.3, y, w: 8.4, h: 0.72, fontSize: 14, valign: 'middle', margin: 0 });
    });
  }

  // ---------- Core principle ----------
  {
    const s = L.content('中心原則：手法のランキングではなく「失敗原因 → 対策」の対応', {
      lead: '最も高度な方式を選ぶのではなく、実測した失敗原因に対して最小限の追加機構を選ぶ',
      src: '元レポート「エグゼクティブサマリー」「総括」',
      notes: '新任リーダーが最初に陥りがちなのは「最新でスコアの高い手法を入れれば精度が上がる」という発想です。しかし論文の数字は特定データ・特定モデル・特定指標での結果で、組み合わせ効果も加算できません。リーダーの仕事は、まず失敗を測って分類し、その原因に効く最小の手を打ち、効果を同じ条件で測ることです。この資料全体がこの原則に沿って構成されています。',
    });
    // left: misconception
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 0.6, y: 2.0, w: 5.7, h: 3.7, rectRadius: 0.08, fill: { color: C.accent3, transparency: 90 }, line: { color: C.accent3, width: 1 } });
    L.icon(s, 'MdCancel', 0.85, 2.2, 0.55, C.accent3);
    L.T(s, 'よくある誤解の進め方', { x: 1.55, y: 2.2, w: 4.6, h: 0.55, fontSize: 18, bold: true, valign: 'middle', margin: 0 });
    L.bullets(s, ['「最新手法トップ10」から強そうなものを選ぶ', 'GraphRAG・Agent・圧縮を全部重ねる', '論文の改善率を足し算して効果を見積もる', '平均スコアだけを見て採用を決める'], { x: 0.9, y: 3.0, w: 5.2, h: 2.5, fontSize: 17, space: 12 });
    // arrow
    L.arrow(s, 6.4, 3.85, 0.5, 'r', C.accent1, 2.5);
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 7.0, y: 2.0, w: 5.7, h: 3.7, rectRadius: 0.08, fill: { color: C.accent4, transparency: 88 }, line: { color: C.accent4, width: 1 } });
    L.icon(s, 'MdCheckCircle', 7.25, 2.2, 0.55, C.accent4);
    L.T(s, 'Advanced RAG の正しい進め方', { x: 7.95, y: 2.2, w: 4.6, h: 0.55, fontSize: 18, bold: true, valign: 'middle', margin: 0 });
    L.bullets(s, ['評価セットとベースラインを先に作る', '失敗を「根拠不在／検索失敗／利用失敗」に分類', '原因に効く最小の追加機構を1つずつ試す', '同一条件で層別に測り、コストと新たな故障も確認'], { x: 7.3, y: 3.0, w: 5.2, h: 2.5, fontSize: 17, space: 12 });
    L.note(s, 'leader', '「どの手法を入れるか」ではなく「どの失敗を、どれだけ減らすか」でロードマップを語る', { x: 0.6, y: 5.85, w: 12.1, h: 0.75, valign: 'middle' });
  }

  // =================== Part 0 ===================
  L.section('Part 0 基礎の総点検');
  L.divider('PART 0', '基礎の総点検', 'Advanced RAG を学ぶ前に、Naive RAG の構成要素と「どこで壊れるか」を正確に押さえる', ['RAG はなぜ必要で、何を解決するのか？', '埋め込み・ベクトル検索・BM25 はそれぞれ何をしているのか？', 'Naive RAG はどこで、どのように失敗するのか？', '「精度が悪い」をどう分解して議論するか？'], 'Part 0は新人向けの基礎固めです。既に知っている内容でも、用語の定義を揃えることが後半の議論の前提になります。');

  {
    const s = L.content('RAG とは何か：なぜ LLM に検索を足すのか', {
      tag: '補足', stages: [1, 3],
      lead: 'RAG ＝ 質問に関係する文書を検索し、その原文を根拠として LLM に回答させる構成',
      notes: 'LLMは学習時点までの公開情報をパラメータに持ちますが、社内文書・最新情報は持たず、どの文書に基づくかも示せません。RAGは推論時に外部知識を検索して入力に加えることで、この4つの限界を補います。重要なのは、RAGが「LLMを賢くする」技術ではなく「LLMに正しい根拠を渡す」技術だという点です。根拠を渡せなければ、どんなに強いLLMでも正しく答えられません。',
    });
    const items = [
      ['MdUpdate', '鮮度', '学習時点以降の情報を持たない → 最新文書を検索して渡す'],
      ['MdBusiness', '社内知識', '非公開の規程・設計書を知らない → 社内コーパスを検索'],
      ['MdLink', '根拠の提示', 'どこに書いてあるかを示せない → 原文に紐づく引用'],
      ['MdLock', '権限', '利用者ごとに見せてよい情報が違う → 検索境界で制御'],
    ];
    items.forEach((it, i) => {
      L.card(s, { x: 0.6 + i * 3.08, y: 2.0, w: 2.9, h: 2.45, icon: it[0], title: it[1], titleSize: 17, body: 'LLM 単体の限界：' + it[2], bodySize: 14 });
    });
    L.flow(s, [{ t: '質問' }, { t: '検索', d: '関連文書を探す' }, { t: '文脈構成', d: '原文をプロンプトへ' }, { t: '生成', d: '根拠付きで回答' }], { x: 0.6, y: 4.75, w: 8.2, h: 1.1, tSize: 15, dSize: 12 });
    L.note(s, 'tip', 'RAG は LLM を賢くする技術ではなく、正しい根拠を渡す技術', { x: 9.1, y: 4.75, w: 3.6, h: 1.1, size: 13 });
  }

  {
    const s = L.content('Naive RAG の基本パイプライン', {
      tag: '補足', stages: [0, 1, 3],
      lead: '索引フェーズ（事前）と質問フェーズ（実行時）に分かれる。Advanced RAG はこの各箱を改良する',
      notes: '索引フェーズでは、文書をテキスト化し、一定長のチャンクに分割し、各チャンクを埋め込みベクトルに変換してベクトルDBに保存します。質問フェーズでは、質問も同じモデルでベクトル化し、近いチャンクを上位k件取り出してプロンプトに詰め、LLMに回答させます。Advanced RAGの各手法は、この図のどの箱を置き換える・追加するかで整理できます。例えば取込の改善は左上、再ランキングは右下の検索と生成の間に入ります。',
    });
    L.T(s, '索引フェーズ（事前処理）', { x: 0.6, y: 2.0, w: 6, h: 0.4, fontSize: 15, bold: true, color: C.accent1, margin: 0 });
    L.flow(s, [{ t: '文書', d: 'PDF・Wiki・規程' }, { t: 'テキスト化', d: 'OCR・抽出' }, { t: 'チャンク分割', d: '例: 数百トークン単位' }, { t: '埋め込み', d: 'テキスト→ベクトル' }, { t: 'ベクトルDB', d: '索引として保存' }], { x: 0.6, y: 2.45, w: 12.1, h: 1.05, fill: C.accent5 });
    L.T(s, '質問フェーズ（実行時）', { x: 0.6, y: 3.85, w: 6, h: 0.4, fontSize: 15, bold: true, color: C.accent1, margin: 0 });
    L.flow(s, [{ t: '質問' }, { t: '質問の埋め込み', d: '同じモデルでベクトル化' }, { t: '近傍検索', d: '類似度上位 k 件' }, { t: 'プロンプト構成', d: '上位チャンクを連結' }, { t: 'LLM 生成', d: '回答を出力' }], { x: 0.6, y: 4.3, w: 12.1, h: 1.05 });
    L.note(s, 'tip', 'Naive RAG の弱点：①構造を捨てたテキスト化 ②固定長分割で文脈が切れる ③ベクトル類似度だけで選ぶ ④上位 k 件をそのまま詰める ⑤根拠の検証・棄権がない', { x: 0.6, y: 5.6, w: 12.1, h: 0.95, size: 13 });
  }

  {
    const s = L.content('埋め込み（Embedding）とベクトル類似度', {
      tag: '補足', stages: [1],
      lead: '意味の近い文ほど近い位置に来るよう、文を数百〜千次元のベクトルに写像する',
      notes: '埋め込みモデルは文をベクトル（例えば768次元や1024次元）に変換します。学習によって、意味が近い文ほどベクトルの向きが近くなるように調整されています。類似度にはコサイン類似度がよく使われます。質問と文書を別々にエンコードする構成をバイエンコーダと呼び、文書側のベクトルを事前計算しておけるので大規模でも高速です。一方で、質問と文書の細かな相互作用は見られないため、後で出てくるクロスエンコーダによる再ランキングとの役割分担が生まれます。また、型番や固有名詞のような「意味」より「文字列一致」が重要な検索は苦手になりがちです。',
    });
    // diagram
    L.box(s, '質問「有給休暇の繰越上限は？」', { x: 0.6, y: 2.1, w: 3.4, h: 0.8, fill: C.background2, color: C.text1, fontSize: 13 });
    L.box(s, 'チャンク「年次休暇は最大20日まで翌年度へ…」', { x: 0.6, y: 3.6, w: 3.4, h: 0.8, fill: C.background2, color: C.text1, fontSize: 13 });
    L.arrow(s, 4.05, 2.5, 0.5, 'r'); L.arrow(s, 4.05, 4.0, 0.5, 'r');
    L.box(s, 'エンコーダ', { x: 4.6, y: 2.15, w: 1.5, h: 0.7, fill: C.accent5 });
    L.box(s, 'エンコーダ', { x: 4.6, y: 3.65, w: 1.5, h: 0.7, fill: C.accent5 });
    L.arrow(s, 6.15, 2.5, 0.45, 'r'); L.arrow(s, 6.15, 4.0, 0.45, 'r');
    L.box(s, 'q = [0.12, −0.48, …]', { x: 6.65, y: 2.15, w: 2.3, h: 0.7, fill: C.accent1, fontSize: 13 });
    L.box(s, 'd = [0.10, −0.51, …]', { x: 6.65, y: 3.65, w: 2.3, h: 0.7, fill: C.accent1, fontSize: 13 });
    L.box(s, [{ text: 'cos(q, d) = 0.87', options: { fontSize: 20, bold: true, breakLine: true } }, { text: 'q·d ／ (|q||d|)', options: { fontSize: 13, bold: false, breakLine: true } }, { text: '1 に近いほど意味が近い', options: { fontSize: 13, bold: false } }], { x: 9.4, y: 2.15, w: 3.3, h: 2.2, fill: C.accent2, color: C.text1 });
    L.arrow(s, 8.95, 2.5, 0.45, 'r'); L.arrow(s, 8.95, 4.0, 0.45, 'r');
    L.card(s, { x: 0.6, y: 4.8, w: 5.95, h: 1.75, icon: 'MdCheckCircle', color: C.accent4, title: '得意', titleSize: 15, body: '言い換え・同義表現（「有給」と「年次休暇」）、文意の近さ。文書側ベクトルを事前計算できるので大規模でも高速（バイエンコーダ）', bodySize: 13 });
    L.card(s, { x: 6.75, y: 4.8, w: 5.95, h: 1.75, icon: 'MdCancel', color: C.accent3, title: '苦手', titleSize: 15, body: '型番・品番・条項番号など文字列一致が重要な検索、学習領域外の専門語、質問と文書の細かな対応関係（1本のベクトルに圧縮されるため）', bodySize: 13 });
  }

  {
    const s = L.content('近似最近傍探索（ANN）とベクトル DB の勘所', {
      tag: '補足', stages: [1, 5],
      lead: '数百万件を全件比較せず「だいたい最も近い」候補を高速に返す。速度と再現率はトレードオフ',
      notes: '全チャンクと総当たりで類似度を計算するとコストが件数に比例するため、実運用ではHNSW（階層的なグラフ）やIVF（クラスタ分割）などの近似最近傍探索を使います。パラメータで速度と再現率のバランスを調整でき、真の最近傍を取りこぼすことがあります。リーダーとして特に注意すべきは権限フィルタとの組み合わせです。上位k件を取ってから権限で絞るポストフィルタでは、権限のある文書が候補に残らず件数不足になったり、検索性能が利用者によって大きく変わったりします。権限は検索条件として最初から組み込む設計を検討してください。',
    });
    L.card(s, { x: 0.6, y: 2.0, w: 3.85, h: 2.6, icon: 'MdHub', title: 'HNSW', body: '近いベクトル同士をつないだ多層グラフを上層から辿る。高速・高再現率だがメモリ消費が大きい', bodySize: 13 });
    L.card(s, { x: 4.73, y: 2.0, w: 3.85, h: 2.6, icon: 'MdGridView', title: 'IVF・量子化', body: 'ベクトル空間をクラスタに分け、近いクラスタだけ探す。量子化（PQ等）で容量を削減するが精度は低下し得る', bodySize: 13 });
    L.card(s, { x: 8.86, y: 2.0, w: 3.85, h: 2.6, icon: 'MdTune', title: '調整パラメータ', body: '探索幅（ef・nprobe 等）を上げると再現率↑・遅延↑。「ANN の取りこぼし」は Recall 低下として現れる', bodySize: 13 });
    L.note(s, 'warn', [{ text: '権限フィルタの落とし穴：', options: { bold: true } }, { text: '上位 k 件を取ってから ACL で絞る「ポストフィルタ」は、権限のある文書が候補から消え件数不足や利用者間の品質差を生む。ACL・版・有効日はメタデータ条件として検索時に組み込む（Part 4 参照）' }], { x: 0.6, y: 4.85, w: 12.1, h: 1.2 });
    L.T(s, '検証観点：再現率（厳密検索との一致率）／p95 遅延／索引サイズ／更新・削除の反映時間／フィルタ併用時の性能', { x: 0.6, y: 6.15, w: 12.1, h: 0.4, fontSize: 13, color: MUTED, margin: 0 });
  }

  {
    const s = L.content('BM25（語彙検索）：古いが強いベースライン', {
      tag: '補足', stages: [1],
      lead: '「質問の単語が、その文書で何回・どれだけ珍しく出るか」で順位付けする。型番や固有名詞に強い',
      src: 'BEIR（BM25 は強いゼロショットのベースライン）',
      notes: 'BM25は単語の出現頻度（TF）、単語の珍しさ（IDF）、文書の長さの補正の3要素でスコアを計算します。「の」「は」のようにどこにでも出る語の重みは小さく、「XJ-4021」のような珍しい語が一致すると大きく効きます。学習不要で領域を選ばず、BEIRでも強いゼロショットのベースラインとされています。日本語では単語の区切りがないため、形態素解析やn-gramでの分割が必須で、この前処理の品質が検索品質を直接左右します。表記ゆれ（全角半角、長音、旧字体、略称）の正規化も同様に重要です。',
    });
    L.T(s, 'スコアを決める3要素', { x: 0.6, y: 2.0, w: 6, h: 0.4, fontSize: 16, bold: true, margin: 0 });
    const f = [['TF（単語頻度）', 'その文書に質問語が多く出るほど高い。ただし頻度が増えるほど効果は飽和する'], ['IDF（逆文書頻度）', 'コーパス全体で珍しい語ほど重い。「の」「規程」より「XJ-4021」が効く'], ['文書長の正規化', '長い文書が単語を多く含むだけで有利にならないよう補正する']];
    f.forEach((r, i) => {
      L.box(s, r[0], { x: 0.6, y: 2.5 + i * 0.95, w: 2.4, h: 0.78, fill: C.accent1, fontSize: 14 });
      L.T(s, r[1], { x: 3.15, y: 2.5 + i * 0.95, w: 3.6, h: 0.78, fontSize: 13, valign: 'middle', margin: 0 });
    });
    L.card(s, { x: 7.1, y: 2.0, w: 5.6, h: 2.65, icon: 'MdTranslate', color: C.accent5, title: '日本語での注意点', titleSize: 16, body: [['単語分割が必須：', '形態素解析（Sudachi・MeCab 等）か文字 n-gram。辞書にない社内用語・型番の分割を確認'], ['表記ゆれ正規化：', '全角/半角、長音、カタカナ/英字、略称'], ['同義語：', '辞書で補うか Dense 検索と併用']], bodySize: 13 });
    L.note(s, 'tip', 'BM25 は「意味」を理解しないが、文字列一致が重要な企業文書（型番・条項番号・製品名・人名）で Dense の弱点を補う。だからハイブリッドが基本になる', { x: 0.6, y: 5.45, w: 12.1, h: 1.0, size: 14 });
  }

  {
    const s = L.content('Naive RAG はどこで壊れるか：7つの失敗点', {
      tag: '補足', stages: [0, 1, 2, 3],
      lead: '3つの実案件から抽出された失敗点。3つは生成より前の段階で、生成段の失敗も文脈の質が原因のことが多い',
      src: 'Barnett et al., "Seven Failure Points When Engineering a RAG System", CAIN 2024（arXiv:2401.05856）',
      notes: 'Barnettらは研究・教育・医療の3つのRAG事例から7つの失敗点を整理しました。1 必要な内容がそもそもコーパスにない、2 正解文書が上位k件に入らない、3 取得はしたが文脈に詰める段階で落ちる、4 文脈にあるのにLLMが抽出できない、5 出力形式が誤る、6 具体性が質問に合わない、7 回答が不完全。彼らはRAGの検証は運用中にしか十分にできず、堅牢性は最初から設計するより運用で育つと述べています。だからこそ、失敗を観測できる仕組みが重要です。',
    });
    const fp = [
      ['FP1', '内容の欠落', 'コーパスに答えがない', '取込'],
      ['FP2', '上位を逃す', '正解文書が top-k 外', '検索'],
      ['FP3', '文脈に入らない', '統合段階で切り落とし', '順位付け'],
      ['FP4', '抽出できない', 'ノイズに埋もれ読めない', '生成'],
      ['FP5', '形式の誤り', '表・リスト等の指定違反', '生成'],
      ['FP6', '具体性の不一致', '粗すぎ／細かすぎ', '生成'],
      ['FP7', '不完全な回答', '一部の根拠しか使わない', '生成'],
    ];
    const colors = { '取込': C.accent5, '検索': C.accent1, '順位付け': C.accent6, '生成': C.accent2 };
    fp.forEach((r, i) => {
      const x = 0.6 + i * 1.75;
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 2.05, w: 1.6, h: 3.1, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.box(s, r[0], { x: x + 0.3, y: 2.2, w: 1.0, h: 0.42, fill: colors[r[3]], color: r[3] === '生成' ? C.text1 : C.background1, fontSize: 13 });
      L.T(s, r[1], { x: x + 0.1, y: 2.8, w: 1.4, h: 0.75, fontSize: 15, bold: true, align: 'center', valign: 'middle', margin: 0 });
      L.T(s, r[2], { x: x + 0.1, y: 3.6, w: 1.4, h: 0.95, fontSize: 13, align: 'center', margin: 0 });
      L.T(s, r[3], { x: x + 0.1, y: 4.6, w: 1.4, h: 0.4, fontSize: 12, color: MUTED, align: 'center', margin: 0 });
    });
    L.note(s, 'leader', '論文の教訓：RAG の検証は運用中にしか十分にできず、堅牢性は運用で育つ。→ 失敗を段階別に観測できるログと評価基盤を初日から用意する', { x: 0.6, y: 5.4, w: 12.1, h: 1.05 });
  }

  {
    const s = L.content('「精度が悪い」を分解する：3つの根本原因', {
      stages: [0, 1, 2, 3, 4],
      lead: '切り分け順：①正解は索引にあるか ②候補に入ったか ③正解文書を直接渡せば答えられるか（Oracle Context）',
      src: '元レポート「全体像：失敗箇所から手法を選ぶ」',
      notes: 'これは元レポートが「実装上の要点」と強調している点です。例えば回答の正答率が70%だったとき、残り30%の内訳が「そもそも答えが文書にない」「文書はあるが検索で取れていない」「取れているのにLLMが誤読した」のどれかで、打ち手は全く異なります。根拠不在なら取込・データ整備か棄権、検索失敗なら検索・ランキング、利用失敗なら文脈構成やモデルの問題です。Oracle Context（正解根拠を直接与える条件）で読解側の上限を測ると、検索側と生成側の責任を分離できます。',
    });
    const cols = [
      ['MdSearchOff', '根拠不在', C.accent5, '答えが索引にない', ['原本にない（棄権が正解）', '取込で表・注記が欠落', '権限・版で対象外（棄権が正解）'], '取込改善・データ整備・正しく棄権'],
      ['MdTravelExplore', '検索失敗', C.accent1, '索引にあるが取れない', ['候補に入らない（Recall）', '候補の下位に沈む（順位）', '多段で辿れない'], 'ハイブリッド・再ランキング・質問分解'],
      ['MdPsychologyAlt', '利用失敗', C.accent2, '取れたのに使えない', ['読解・計算の誤り', '引用が主張と不一致', '文脈ノイズで抽出失敗'], '文脈構成・計算ツール・検証・モデル比較'],
    ];
    cols.forEach((c, i) => {
      const x = 0.6 + i * 4.13;
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 2.0, w: 3.85, h: 4.5, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.icon(s, c[0], x + 0.25, 2.2, 0.62, c[2]);
      L.T(s, c[1], { x: x + 1.0, y: 2.2, w: 2.7, h: 0.62, fontSize: 22, bold: true, valign: 'middle', margin: 0 });
      L.T(s, c[3], { x: x + 0.25, y: 3.0, w: 3.4, h: 0.4, fontSize: 14, bold: true, color: C.accent1, margin: 0 });
      L.bullets(s, c[4], { x: x + 0.25, y: 3.45, w: 3.4, h: 1.5, fontSize: 14 });
      s.addShape(SH.ROUNDED_RECTANGLE, { x: x + 0.2, y: 5.15, w: 3.45, h: 1.15, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: L.BORDER } });
      L.T(s, [{ text: '主な打ち手', options: { bold: true, fontSize: 12, color: MUTED, breakLine: true } }, { text: c[5], options: { fontSize: 14 } }], { x: x + 0.32, y: 5.22, w: 3.2, h: 1.0, margin: 0 });
    });
  }

  // =================== Part 1 ===================
  L.section('Part 1 全体像と証拠の読み方');
  L.divider('PART 1', '全体像と証拠の読み方', 'Advanced RAG を「段階」と「失敗」の地図として捉え、論文の数字を誤読しない読み方を身につける', ['Advanced RAG は何を改善する手法群か？', '症状からどこを疑い、何を試すか？', '論文・ベンダーの数字をどう読むべきか？', 'Recall・nDCG・EM・F1 は何を測っているか？'], 'Part 1では、以降の手法各論を読むための地図と物差しを用意します。');

  {
    const s = L.content('Advanced RAG の定義：段階ごとの改善手法群', {
      stages: [0, 1, 2, 3, 4, 5],
      lead: '特定の製品や単一アルゴリズムではない。「質問を埋め込み上位チャンクを渡す」構成を各段階で改善する手法の総称',
      src: 'Huang & Huang, ACM Computing Surveys（検索前・検索・検索後・生成の4段階整理）、A-RAG（推論中の検索制御）',
      notes: '2026年刊行のサーベイはRAGを検索前・検索・検索後・生成の4段階で整理しています。元レポートはこれを実装上のボトルネックに対応させ、さらに推論制御（Agentic）、学習、評価・運用を加えています。どの段階の手法かを意識すると、「この手法は何の失敗を減らすのか」が明確になります。下段の横断領域は、どの段階の手法を選んでも必要になる共通基盤です。',
    });
    const st = [
      ['検索前', 'Pre-retrieval', C.accent5, ['構造保持の取込', 'チャンク設計・親子', 'Contextual / Late Chunking', 'クエリ書換・HyDE・分解']],
      ['検索', 'Retrieval', C.accent1, ['BM25＋Dense ハイブリッド', 'RRF による融合', 'Multi-vector / ColBERT', 'グラフ・階層索引']],
      ['検索後', 'Post-retrieval', C.accent6, ['再ランキング', '重複除去・多様性', '親チャンク拡張', 'コンテキスト圧縮']],
      ['生成', 'Generation', C.accent2, ['引用付き生成', '主張・引用の検証', '計算ツール分離', '棄権・回答範囲限定']],
    ];
    st.forEach((c, i) => {
      const x = 0.6 + i * 3.08;
      L.box(s, [{ text: c[0], options: { fontSize: 18, bold: true, breakLine: true } }, { text: c[1], options: { fontSize: 11, bold: false } }], { x, y: 2.0, w: 2.9, h: 0.85, fill: c[2], color: i === 3 ? C.text1 : C.background1 });
      s.addShape(SH.ROUNDED_RECTANGLE, { x, y: 2.95, w: 2.9, h: 2.0, rectRadius: 0.06, fill: { color: C.background2 }, line: { color: C.background2 } });
      L.bullets(s, c[3], { x: x + 0.15, y: 3.05, w: 2.65, h: 1.85, fontSize: 13 });
    });
    L.box(s, '推論制御（Agentic）：検索語・粒度・読取範囲・停止条件をモデルが選ぶ ／ 学習：RAFT・Search-R1', { x: 0.6, y: 5.1, w: 12.1, h: 0.62, fill: C.text2, fontSize: 14 });
    L.box(s, '横断：評価 ／ 監査 ／ コスト ／ 削除反映 ／ 攻撃耐性 ／ 観測性', { x: 0.6, y: 5.85, w: 12.1, h: 0.62, fill: C.background2, color: C.text1, fontSize: 14 });
  }

  {
    const s = L.content('参照処理フロー①：取り込み側', {
      stages: [0, 1],
      lead: '原文・権限・版を起点に、検索用の複数の索引を派生させる。全経路の実装は不要、必要な分岐だけ足す',
      src: '元レポート「処理レイヤーの対応関係」（本レポート独自の整理・設計モデル）',
      notes: '取り込み側の要点は2つです。1つ目は、原本・権限・版・有効日を最初に確定させること。後段で作るすべての派生データ（チャンク、埋め込み、要約、グラフ）がここに紐づくことで、削除や権限変更を正しく伝播できます。2つ目は、チャンクを原文の位置（文書ID・ページ・文字オフセット）と結びつけて保存すること。これにより、検索用の表現と引用する原文を分離できます。階層要約やグラフは「任意」であり、必要性が確認できてから追加します。',
    });
    const y0 = 2.0;
    L.box(s, '原本・権限（ACL）・版・有効日', { x: 0.6, y: y0, w: 4.2, h: 0.75, fill: C.text2 });
    L.arrow(s, 2.7, y0 + 0.78, 0.3, 'd');
    L.box(s, 'レイアウト解析 ／ OCR ／ ページ画像 ／ 表・コード構造', { x: 0.6, y: y0 + 1.12, w: 4.2, h: 0.75, fill: C.accent5 });
    L.arrow(s, 2.7, y0 + 1.9, 0.3, 'd');
    L.box(s, '原文チャンク＋親文書＋文・ページ位置', { x: 0.6, y: y0 + 2.24, w: 4.2, h: 0.75, fill: C.accent1 });
    // branches
    const br = [['語彙索引 ／ Sparse 索引', C.accent1, false], ['Dense ／ Multi-vector 索引', C.accent1, false], ['任意：階層要約 ／ エンティティ・関係グラフ', C.background2, true]];
    br.forEach((b, i) => {
      const y = y0 + 1.15 + i * 0.95;
      L.box(s, b[0], { x: 5.8, y, w: 4.0, h: 0.7, fill: b[1], color: b[2] ? C.text1 : C.background1, fontSize: 13, lineColor: b[2] ? C.accent1 : b[1] });
    });
    s.addShape(SH.LINE, { x: 4.8, y: y0 + 2.6, w: 0.5, h: 0, line: { color: MUTED, width: 1.75 } });
    s.addShape(SH.LINE, { x: 5.3, y: y0 + 1.5, w: 0, h: 1.9, line: { color: MUTED, width: 1.75 } });
    [0, 1, 2].forEach((i) => L.arrow(s, 5.3, y0 + 1.5 + i * 0.95, 0.48, 'r'));
    L.card(s, { x: 10.1, y: 2.0, w: 2.6, h: 3.0, icon: 'MdKey', color: C.accent2, title: '設計の鍵', titleSize: 15, body: ['派生データはすべて原本の版・ACL に紐づける', '検索用表現と引用原文を分離', '索引は交換可能に'], bodySize: 12 });
    L.note(s, 'leader', '取込は「地味な前処理」ではなく品質と安全の起点。ここで落ちた情報は、後段のどんな高度化でも取り戻せない', { x: 0.6, y: 5.95, w: 12.1, h: 0.68, valign: 'middle' });
  }

  {
    const s = L.content('参照処理フロー②：質問側', {
      stages: [1, 2, 3],
      lead: '権限と時点を確定してから検索し、証拠が足りるかを判定してから答える。足りなければ再検索か棄権',
      src: '元レポート「処理レイヤーの対応関係」',
      notes: 'Naive RAGとの最大の違いは「証拠選択・充足判定」の箱があることです。取得したものをそのまま生成に回すのではなく、質問に答えるのに十分な証拠が揃っているかを判定し、不足なら再検索・許可された別データ源・棄権に分岐します。充足していても、引用付きで生成した後に主張と引用の整合を検証します。最初の「タスク分類」は、短い通常経路で済む質問と、質問分解やAgenticループが必要な質問を振り分けるルータです。',
    });
    const steps = [['認証・権限・時点・タスク分類（単純／多段）', C.text2], ['通常検索 ／ 質問分解 ／ Agentic ループ', C.accent1], ['候補統合 → 再ランキング → 原文拡張 → 重複除去', C.accent6], ['証拠選択・充足判定', C.accent2]];
    steps.forEach((st, i) => {
      L.box(s, st[0], { x: 0.6, y: 2.0 + i * 0.95, w: 5.6, h: 0.7, fill: st[1], color: i === 3 ? C.text1 : C.background1, fontSize: 14 });
      if (i < 3) L.arrow(s, 3.4, 2.72 + i * 0.95, 0.2, 'd');
    });
    // branches from judgement
    L.arrow(s, 6.25, 5.2, 0.6, 'r', C.accent3);
    L.box(s, '不足 → 2 段目に戻り再検索 ／ 別データ源 ／ 棄権', { x: 6.9, y: 4.85, w: 5.8, h: 0.7, fill: C.accent3, fontSize: 14 });
    s.addShape(SH.LINE, { x: 3.4, y: 5.55, w: 0, h: 0.5, line: { color: C.accent4, width: 1.75 } });
    L.arrow(s, 3.4, 6.05, 3.45, 'r', C.accent4);
    L.box(s, '充足 → 引用付き生成 → 主張・引用検証 → 回答', { x: 6.9, y: 5.7, w: 5.8, h: 0.7, fill: C.accent4, fontSize: 14 });
    L.card(s, { x: 6.9, y: 2.0, w: 5.8, h: 2.55, icon: 'MdCompareArrows', color: C.accent5, title: 'Naive RAG との違い', titleSize: 16, body: ['検索前に権限・時点を確定（後付けしない）', '取得結果をそのまま詰めず、統合・再順位・拡張', '「答えられるか」を判定し、不足なら再検索か棄権', '生成後に主張と引用の整合を検証'], bodySize: 13 });
  }

  {
    const s = L.content('診断表：症状 → 疑う箇所 → 優先的に試す手段', {
      stages: [0, 1, 2, 3, 5],
      lead: '観測された失敗から逆算して手法を選ぶ。この表は「診断の仮説」であり、検証して確定させる',
      src: '元レポート「全体像：失敗箇所から手法を選ぶ」',
      notes: 'この表は、プロジェクトで最も頻繁に参照することになる表です。例えば「型番で検索しても見つからない」という報告があれば、まず候補検索段階を疑い、BM25やSparse検索の併用、メタデータ条件を試します。「文書はあるが主語や時点がわからない」のは、チャンク化で文脈が切れた典型例で、見出し付加や親子検索、Contextual Retrievalが候補になります。重要なのは、これが仮説であることです。失敗事例を集め、どの行に当たるかを分類し、件数の多い行から手を打ちます。',
    });
    L.table(s, [
      ['観測される失敗', '先に疑う箇所', '優先的に試す手段'],
      ['原本の表・注記が索引にない', '文書取り込み', 'レイアウト解析、表の構造保持、ページ画像検索'],
      ['型番や契約条項を探せない', '候補検索', 'BM25・Sparse 併用、メタデータ条件'],
      ['文書はあるが主語・時点が不明', '表現・粒度', '見出し付加、親子検索、Contextual Retrieval'],
      ['必要文書が候補内の下位にある', '順位付け', '領域に合う再ランキング、学習負例の改善'],
      ['文書 A から文書 B へ辿れない', '探索', '質問分解、グラフ探索、Agentic RAG'],
      ['根拠を渡しても誤答する', '読解・計算・生成', '原文配置改善、計算ツール、回答モデル比較、RAFT'],
      ['回答は正しそうだが引用が違う', '主張と証拠の整合', 'ALCE 型の引用評価、文単位の証拠照合'],
      ['更新前や権限外の内容が出る', '検索境界・派生データ管理', '版・ACL を含む索引／キャッシュの失効設計'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [4.0, 3.0, 5.1], fontSize: 13, rowH: 0.5 });
  }

  {
    const s = L.content('エビデンスの種類：出所で読み方を変える', {
      stages: [4],
      lead: '査読・掲載は有用な品質シグナルだが、自社データでの効果や独立再現性を保証しない',
      src: '元レポート「根拠の種類」、Thoughtworks Technology Radar（RAG 項目）',
      notes: '元レポートは情報源を4種類に分けています。学会・論文誌掲載の論文、arXiv等の論文本体、企業・開発者自身の評価、公式仕様や実務報告です。これは優劣の序列ではなく、読み方の違いです。開発元評価は自社製品に有利な条件になっていないか、データが公開されているかを点検します。Thoughtworks Radarのような実務報告は採用判断の表現形式として参考になりますが、統制実験の数値ではないため性能の根拠には使いません。リーダーがベンダーと話すときは、この表を頭に入れておくと冷静に判断できます。',
    });
    L.table(s, [
      ['表記', '根拠の性質', '読み方'],
      ['学会・論文誌掲載', '公式の掲載先を確認できた論文', '査読は品質シグナルだが、外的妥当性・独立再現性は保証しない'],
      ['論文本体', 'arXiv 等で本文・実験を確認', '著者による報告として扱う。掲載先未確認でも未査読と断定しない'],
      ['開発元評価', '企業・開発者による実験', '再現条件、データ公開、分布上の有利さ、利益相反を点検'],
      ['公式仕様・実務報告', '実装ドキュメント、導入経験', '実現方法・運用知見の根拠。性能優位の証明には用いない'],
    ], { x: 0.6, y: 2.0, w: 12.1, colW: [2.6, 3.6, 5.9], fontSize: 14, rowH: 0.62 });
    L.note(s, 'leader', 'ベンダー提案の「精度◯%向上」は、①誰が測ったか ②どのデータか ③何の指標か ④比較相手は何か ― の4点を必ず確認する', { x: 0.6, y: 5.35, w: 12.1, h: 1.0, valign: 'middle' });
  }

  {
    const s = L.content('数字を比較する際の5原則', {
      stages: [4],
      lead: '同じ「精度」という言葉でも、測っているものが違えば比較できない',
      src: '元レポート「数字を比較する際の原則」、Anthropic Contextual Retrieval',
      notes: '最も誤読されやすいのが相対改善と絶対差です。Contextual Retrievalでは上位20件の検索失敗率が5.7%から1.9%に下がりました。これは絶対差3.8ポイント、相対では約67%の削減ですが、「回答精度が67%向上」したわけではありません。そもそも測っているのは検索の失敗率であって回答の正しさではありません。また、LLM選好勝率は2つの回答を比較した好みの割合であって正解率ではない点、条件の違う数値を並べてランキングにしてはいけない点も重要です。',
    });
    const pr = [
      ['Recall・nDCG', '必要文書が候補に入るか・順位が適切か。回答の正しさそのものではない'],
      ['EM・F1・正解率', '評価条件依存。Contain Accuracy や LLM 判定を厳密な EM と混同しない'],
      ['LLM 選好勝率', '2回答の比較結果であり事実正解率ではない。生成と評価の両方が LLM なら偏りも疑う'],
      ['相対改善とポイント差', '失敗率 5.7%→1.9% は絶対 −3.8pt・相対 −67%。「精度67%向上」ではない'],
      ['実験条件', 'モデル・コーパス・件数・トークン予算・プロンプト・評価器が違う値は並べない'],
    ];
    pr.forEach((p, i) => {
      const y = 2.0 + i * 0.86;
      L.box(s, String(i + 1), { x: 0.6, y: y + 0.1, w: 0.5, h: 0.5, fill: C.accent1, fontSize: 16 });
      L.T(s, p[0], { x: 1.25, y, w: 2.4, h: 0.7, fontSize: 15, bold: true, valign: 'middle', margin: 0 });
      L.T(s, p[1], { x: 3.65, y, w: 4.6, h: 0.7, fontSize: 13, valign: 'middle', margin: 0 });
    });
    s.addShape(SH.ROUNDED_RECTANGLE, { x: 8.6, y: 2.0, w: 4.1, h: 4.3, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 } });
    L.T(s, '例：Contextual Retrieval', { x: 8.85, y: 2.15, w: 3.6, h: 0.4, fontSize: 14, bold: true, margin: 0 });
    L.stat(s, { x: 8.85, y: 2.5, w: 3.6, value: '5.7% → 1.9%', size: 30, vh: 0.7, label: '上位20件の検索失敗率（1−Recall@20）', lh: 0.45, lsize: 12 });
    L.stat(s, { x: 8.85, y: 3.75, w: 1.75, value: '−3.8pt', size: 24, vh: 0.55, color: C.accent5, label: '絶対差', lh: 0.35, lsize: 12 });
    L.stat(s, { x: 10.7, y: 3.75, w: 1.75, value: '−67%', size: 24, vh: 0.55, color: C.accent5, label: '相対減少', lh: 0.35, lsize: 12 });
    L.T(s, [{ text: '✕ ', options: { bold: true, color: C.accent3 } }, { text: '「回答精度が67%向上」は誤読', options: {} }], { x: 8.85, y: 4.85, w: 3.6, h: 0.4, fontSize: 13, margin: 0 });
    L.T(s, '検索の失敗率の変化であり、最終回答の正しさを直接示すものではない', { x: 8.85, y: 5.3, w: 3.6, h: 0.85, fontSize: 12, color: MUTED, margin: 0 });
  }

  {
    const s = L.content('指標の基礎①：検索の指標を手で計算してみる', {
      tag: '補足', stages: [1, 2, 4],
      lead: '正解文書が2件（D2・D7）の質問で、検索結果の上位5件が下の順だった場合',
      notes: 'Recall@kは正解文書のうち上位k件に入った割合で、候補検索の網羅性を測ります。この例では上位5件に2件とも入っているのでRecall@5は1.0ですが、1位は不正解なのでRecall@1は0です。MRRは最初の正解が何位に出たかの逆数で、2位なので0.5です。nDCGは順位が下がるほど価値を割り引くDCGを、理想的な並び（正解が1位・2位）のDCGで割ったもので、0.65になります。つまり「候補には全部入っているが、順位はまだ改善の余地がある」ことが数字で分かります。候補検索の評価にはRecall、再ランキングの評価にはnDCGやMRRを使うのが基本です。',
    });
    const res = [['1位', 'D5', false], ['2位', 'D2', true], ['3位', 'D9', false], ['4位', 'D7', true], ['5位', 'D1', false]];
    L.T(s, '検索結果（上位5件）', { x: 0.6, y: 1.95, w: 3.5, h: 0.4, fontSize: 14, bold: true, margin: 0 });
    res.forEach((r, i) => {
      const y = 2.4 + i * 0.68;
      L.box(s, r[0], { x: 0.6, y, w: 0.8, h: 0.55, fill: C.background2, color: C.text1, fontSize: 13 });
      L.box(s, r[1] + (r[2] ? '  ✔ 正解' : '  ✕'), { x: 1.5, y, w: 2.3, h: 0.55, fill: r[2] ? C.accent4 : C.background2, color: r[2] ? C.background1 : MUTED, fontSize: 14, align: 'left' });
    });
    L.table(s, [
      ['指標', '定義（直感）', 'この例の値'],
      ['Recall@5', '正解のうち上位5件に入った割合', '2/2 = 1.00'],
      ['Recall@1', '正解のうち1位に入った割合', '0/2 = 0.00'],
      ['Precision@5', '上位5件のうち正解の割合', '2/5 = 0.40'],
      ['MRR', '最初の正解の順位の逆数（平均）', '1/2 = 0.50'],
      ['nDCG@5', '順位で割り引いた利得 ÷ 理想の並びの利得', '1.062 / 1.631 ≈ 0.65'],
    ], { x: 4.2, y: 1.95, w: 8.5, colW: [1.6, 4.3, 2.6], fontSize: 13, rowH: 0.5 });
    L.T(s, 'DCG = Σ rel_i ／ log2(i+1) → 0.631 + 0.431 = 1.062、理想の並び（1・2位）= 1 + 0.631 = 1.631', { x: 4.2, y: 5.1, w: 8.5, h: 0.6, fontSize: 12, color: MUTED, margin: 0 });
    L.note(s, 'tip', '候補検索は Recall@k（取りこぼさないか）、再ランキング後は nDCG・MRR（上位に来るか）で測る。目的が違う段階を同じ指標で評価しない', { x: 4.2, y: 5.7, w: 8.5, h: 0.85, size: 13 });
  }

  {
    const s = L.content('指標の基礎②：回答・引用の指標', {
      tag: '補足', stages: [3, 4],
      lead: '「正しく答えた」「正しく引用した」「根拠に忠実だった」は別々に測る',
      src: 'ALCE、Ragas、ARES、A-RAG（LLM-Acc）、GraphRAG（LLM 選好勝率）',
      notes: 'EM（完全一致）は正規化した回答文字列が正解と完全一致するかを見る厳しい指標で、F1は単語（トークン）の重なりで部分一致を評価します。Contain Accuracyは正解文字列が回答に含まれていればよいとする緩い指標で、LLM-AccはLLMに意味的一致を判定させる指標です。同じ「正解率」でもこれらは大きく値が変わります。忠実性（Faithfulness）は回答が渡した根拠に支えられているかで、正解かどうかとは別です。引用再現率・適合率は回答中の主張が引用で支持されているか、引用が適切かを測ります。',
    });
    L.table(s, [
      ['指標', '何を測るか', '注意点'],
      ['EM（Exact Match）', '正規化後の回答が正解と完全一致', '言い換えに厳しい。短答 QA 向き'],
      ['F1（トークン）', '回答と正解の単語の重なり', '部分点が出る。長文回答には不向き'],
      ['Contain Accuracy', '正解文字列が回答に含まれるか', 'EM より緩い。同列に比較しない'],
      ['LLM 判定（LLM-Acc 等）', 'LLM による意味的一致の判定', '評価器・プロンプトで値が変わる。人手で較正'],
      ['LLM 選好勝率', '2回答のどちらが良いか', '正解率ではない。包括性など観点依存'],
      ['忠実性（Faithfulness）', '回答が渡した根拠に支持されるか', '根拠自体が誤りなら忠実でも誤答'],
      ['引用再現率・適合率', '主張が引用で支持されるか・引用が適切か', '引用品質と回答の正しさは別に動く'],
    ], { x: 0.6, y: 1.95, w: 12.1, colW: [3.1, 4.6, 4.4], fontSize: 13, rowH: 0.46 });
    L.note(s, 'warn', 'ALCE（ASQA、ChatGPT）：引用の良い回答を選び直す方式で引用再現率は 73.6→84.8 に上がったが、正確性（EM 再現率）は 40.4→40.2 とほぼ不変。「引用付き＝正しい」ではない', { x: 0.6, y: 5.75, w: 12.1, h: 0.88, size: 13, valign: 'middle', label: '注意（ALCE）' });
  }
};
