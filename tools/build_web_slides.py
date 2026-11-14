# -*- coding: utf-8 -*-
"""Build a static web-slide viewer (GitHub Pages: /docs) from exported slide PNGs and the PPTX speaker notes."""
import os, sys, json, html, glob
from PIL import Image
from pptx import Presentation

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = 'https://github.com/Takenori-Kusaka/advanced-rag-fmea-casestudy'

def build(pptx_name, docs_rel, title, lead, og_desc, other):
  PPTX = os.path.join(ROOT, 'slides', pptx_name)
  DOCS = os.path.join(ROOT, 'docs', docs_rel); SL = os.path.join(DOCS, 'slides')
  base = pptx_name[:-5]

  # 1) PNG -> WebP (smaller pages)
  imgs = sorted(glob.glob(os.path.join(SL, 's*.png')))
  for p in imgs:
      Image.open(p).convert('RGB').save(p[:-4] + '.webp', 'WEBP', quality=82, method=6); os.remove(p)

  # 2) text and notes per slide
  prs = Presentation(PPTX); slides = []
  for i, s in enumerate(prs.slides, 1):
      texts = []
      for sh in s.shapes:
          if sh.has_text_frame and sh.text_frame.text.strip(): texts.append(sh.text_frame.text.strip())
          if getattr(sh, 'has_table', False) and sh.has_table:
              for row in sh.table.rows: texts.append(' | '.join(c.text for c in row.cells))
      stitle = texts[0].split('\n')[0] if texts else f'Slide {i}'
      for t in texts:
          if s.shapes.title is not None and s.shapes.title.has_text_frame and s.shapes.title.text_frame.text.strip():
              stitle = s.shapes.title.text_frame.text.strip(); break
      notes = s.notes_slide.notes_text_frame.text.strip() if s.has_notes_slide else ''
      slides.append(dict(n=i, title=stitle, text='\n'.join(texts), notes=notes))
  json.dump(slides, open(os.path.join(DOCS, 'slides.json'), 'w', encoding='utf-8'), ensure_ascii=False)

  # 3) viewer page
  items = '\n'.join(
      f'<section class="slide" id="s{d["n"]}" data-n="{d["n"]}"><img src="slides/s{d["n"]:03d}.webp" loading="{"eager" if d["n"] <= 2 else "lazy"}" width="1920" height="1080" alt="{html.escape(d["title"])}">'
      f'<details><summary>スライド {d["n"]} のテキストと解説</summary><div class="tx">{html.escape(d["text"])}</div>'
      + (f'<div class="nt"><b>解説</b><p>{html.escape(d["notes"])}</p></div>' if d['notes'] else '') + '</details></section>'
      for d in slides)
  toc = ''.join(f'<li><a href="#s{d["n"]}">{d["n"]}. {html.escape(d["title"])}</a></li>' for d in slides)
  page = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{og_desc}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{og_desc}">
  <meta property="og:image" content="slides/s001.webp">
  <style>
  :root{{--bg:#f4f7f8;--fg:#1a2230;--muted:#5b6872;--card:#fff;--acc:#0e7c86}}
  @media (prefers-color-scheme:dark){{:root{{--bg:#0f1a20;--fg:#e6edf0;--muted:#9fb0b8;--card:#17252d;--acc:#5cc3cb}}}}
  *{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--fg);font-family:"BIZ UDPGothic","Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.7}}
  header,main,footer{{max-width:1100px;margin:0 auto;padding:16px}}h1{{font-size:1.5rem;margin:.4em 0}}a{{color:var(--acc)}}
  .bar{{position:sticky;top:0;z-index:2;background:var(--bg);display:flex;gap:8px;align-items:center;padding:8px 16px;border-bottom:1px solid #8883}}
  .bar button{{font:inherit;padding:4px 12px;border-radius:6px;border:1px solid #8886;background:var(--card);color:var(--fg);cursor:pointer}}
  .slide{{background:var(--card);border-radius:10px;margin:0 0 20px;box-shadow:0 1px 4px #0002;overflow:hidden}}
  .slide img{{display:block;width:100%;height:auto}}details{{padding:8px 14px}}summary{{cursor:pointer;color:var(--muted)}}
  .tx{{white-space:pre-wrap;font-size:.85rem;color:var(--muted)}}.nt p{{margin:.3em 0;font-size:.95rem}}
  body.present{{overflow:hidden}}body.present header,body.present footer,body.present details{{display:none}}
  body.present main{{max-width:none;padding:0}}body.present .slide{{display:none;margin:0;border-radius:0;box-shadow:none;background:#000}}
  body.present .slide.on{{display:flex;align-items:center;justify-content:center;height:calc(100vh - 49px)}}
  body.present .slide.on img{{max-height:100%;width:auto;max-width:100%}}
  ol{{columns:2;font-size:.9rem}}@media (max-width:700px){{ol{{columns:1}}}}
  </style></head><body>
  <div class="bar"><button id="mode">プレゼン表示</button><button id="prev" aria-label="前のスライド">←</button><button id="next" aria-label="次のスライド">→</button><span id="pos"></span></div>
  <header><h1>{title}</h1>
  <p>{lead}（全 {len(slides)} 枚）。<a href="{REPO}">GitHub リポジトリ</a>／<a href="{REPO}/raw/main/slides/{base}.pdf">PDF</a>／<a href="{REPO}/raw/main/slides/{base}.pptx">PPTX</a>／{other}</p>
  <details><summary>目次</summary><ol>{toc}</ol></details></header>
  <main>{items}</main>
  <footer><p>本資料と合成コーパスは CC BY 4.0、コードは MIT ライセンスです。本資料は生成AI（Claude）を使って作成し、筆者が確認して公開しています。</p></footer>
  <script>
  const S=[...document.querySelectorAll('.slide')];let i=0;const pos=document.getElementById('pos');
  function show(n){{i=Math.max(0,Math.min(S.length-1,n));S.forEach((s,k)=>s.classList.toggle('on',k===i));pos.textContent=(i+1)+' / '+S.length;
   if(!document.body.classList.contains('present'))S[i].scrollIntoView({{behavior:'smooth'}});history.replaceState(null,'','#s'+(i+1));}}
  document.getElementById('mode').onclick=()=>{{document.body.classList.toggle('present');show(i);}};
  document.getElementById('prev').onclick=()=>show(i-1);document.getElementById('next').onclick=()=>show(i+1);
  addEventListener('keydown',e=>{{if(['ArrowRight','PageDown',' '].includes(e.key)){{e.preventDefault();show(i+1)}}if(['ArrowLeft','PageUp'].includes(e.key)){{e.preventDefault();show(i-1)}}if(e.key==='Escape')document.body.classList.remove('present')}});
  let x0=null;addEventListener('touchstart',e=>x0=e.touches[0].clientX);addEventListener('touchend',e=>{{if(x0===null)return;const d=e.changedTouches[0].clientX-x0;if(Math.abs(d)>50)show(i+(d<0?1:-1));x0=null}});
  const h=parseInt((location.hash||'#s1').slice(2))||1;i=h-1;pos.textContent=h+' / '+S.length;S[i]&&S[i].classList.add('on');
  </script></body></html>'''
  open(os.path.join(DOCS, 'index.html'), 'w', encoding='utf-8', newline='\n').write(page)
  open(os.path.join(DOCS, '.nojekyll'), 'w').close()
  print('slides', len(slides), 'size MB', round(sum(os.path.getsize(f) for f in glob.glob(SL + '/*')) / 1e6, 1))

build('AdvancedRAG_適用指針書_FMEAケーススタディ.pptx', '', 'Advanced RAG 適用指針書 ― FMEA 作成支援ケーススタディ',
      'FMEA 作成支援 RAG を題材に、分冊マニュアル・神エクセル・特許の図と符号・スキャン PDF などのデータ特性ごとに、どの Advanced RAG の打ち手がどれだけ効くかを WSL2 上の OpenSearch で実測した資料です。データは実在企業の公開文書の構造だけを再現した架空の合成コーパスです',
      '素朴RAG 18/48 から、構造化取込・ハイブリッド・型式正規化・参照グラフ・再ランキングで 44/48。データ特性ごとの効き方を OpenSearch で実測したスライド',
      '<a href="guide/">前提編：Advanced RAG 実践ガイド</a>')
build('AdvancedRAG_実践ガイド.pptx', 'guide', 'Advanced RAG 実践ガイド ― Naive RAG の次へ',
      'Naive RAG を理解し始めた技術者が、Advanced RAG の導入プロジェクトをリードできる水準まで理解を引き上げるための解説資料です。失敗原因から手法を選ぶ考え方、評価、安全・運用、テックリーダーの実務、アンチパターンと全社横断 RAG の事例までを扱います',
      'Advanced RAG を「失敗原因 → 対策」の対応で整理し、評価・安全・運用・テックリーダーの実務、アンチパターン大全までをまとめた解説スライド',
      '<a href="../">実践編：FMEA 作成支援ケーススタディ</a>')
