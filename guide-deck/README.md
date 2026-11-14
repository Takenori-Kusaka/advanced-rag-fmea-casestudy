# 前提編「Advanced RAG 実践ガイド」の生成元

[pptxgenjs](https://github.com/gitbrent/PptxGenJS) で `slides/AdvancedRAG_実践ガイド.pptx` を生成するスクリプトです。テーマの適用には、実践編と同じ [deck/theme.js](../deck/theme.js) を使います。

| ファイル | 内容 |
| --- | --- |
| `lib.js` | テーマ、スライドの型、部品（カード、表、グラフ、注記など） |
| `part1.js` | 導入、Part 0〜1（基礎、全体像と証拠の読み方） |
| `part2.js` | Part 2（手法各論） |
| `part3.js` | Part 3〜6（評価、安全・運用、設計とロードマップ、テックリーダーの実務）、付録 |
| `part4.js` | Part 7（アンチパターン大全と全社横断 RAG の事例） |
| `qa.ps1` | PowerPoint でスライド画像を書き出し、文字のはみ出しを検出する（Windows） |

## 生成

```bash
cd deck && npm ci && cd ../guide-deck
NODE_PATH=../deck/node_modules node build.js ../build/AdvancedRAG_実践ガイド.pptx
```

本文のフォントは BIZ UDPGothic です。入っていない環境では、PowerPoint が別のフォントで表示します。
