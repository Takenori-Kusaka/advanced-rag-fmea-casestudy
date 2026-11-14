# -*- coding: utf-8 -*-
"""Source docx for documents that will be printed & scanned (8D report, test reports, inspection record)."""
import os, sys
from docx import Document
from docx.shared import Pt
sys.path.insert(0, os.path.dirname(__file__))
from gen_docs import new_doc, table, H, P

OUT = sys.argv[1] if len(sys.argv) > 1 else '../corpus_src'
os.makedirs(OUT, exist_ok=True)

def gen_8d():
    d = new_doc('不具合報告書（8D レポート）', '8D-2024-021', '')
    table(d, ['項目', '内容'], [['関連不具合', 'Q-2024-0388（MDA-200 CN1 抜けかけ・通信断）'], ['発行日', '2024/10/15'], ['作成', '品質保証部 鈴木']])
    H(d, 'D2 問題の記述'); P(d, '客先搬送ラインで MDA-200 が ALM-31 で停止。回収品 3 台中 3 台でロックアーム根元に割れを確認。')
    H(d, 'D4 根本原因'); P(d, 'ロックアーム根元の R 寸法が図面指示 R0.5 に対し実測 R0.2 であった。成形金型の摩耗により R 部が鋭角化し、着脱時の応力集中で疲労き裂が進展した。流出原因は、受入検査に R 寸法の確認項目がなかったこと。')
    H(d, 'D5 恒久対策'); P(d, '金型修正（R0.5 復元）。受入検査に R 寸法測定（抜取 n=5）を追加。設計基準 SK-001 5.1 に R0.5 以上を明記。')
    H(d, 'D7 再発防止'); P(d, 'MDA-200 Rev.B で CN-4P-L2（根元 R0.5・半嵌合検知ばね付）へ変更する。')
    d.save(os.path.join(OUT, '4_不具合報告書_8D-2024-021.docx'))

def gen_tr():
    d = new_doc('試験報告書　温度サイクル試験（CN-4P-L）', 'TR-2023-118', '')
    table(d, ['項目', '内容'], [['試験品', 'CN-4P-L（MDA-200 用）'], ['試験条件', '−40 ℃ / +85 ℃ 各 30 分　500 サイクル'], ['判定基準', 'SK-001 付表4'], ['試験日', '2023/11/06〜2023/12/01']])
    H(d, '試験結果')
    rows = []
    for i in range(1, 11):
        init = [12, 13, 11, 14, 12, 13, 15, 12, 11, 13][i - 1]
        after = [18, 19, 17, 21, 18, 20, 210, 19, 16, 22][i - 1]
        rows.append([f'S-{i:02d}', f'{init} mΩ', f'{after} mΩ', '不合格' if after > 30 else '合格'])
    table(d, ['サンプル No.', '初期接触抵抗', '試験後接触抵抗', '判定'], rows)
    P(d, '所見: S-07 は試験後に接触抵抗が著しく増大。解析の結果、端子嵌合部の金めっき厚が 0.08 µm と規格（0.2 µm 以上）未満であった。ロット LT-2311 の端子を全数調査する。')
    d.save(os.path.join(OUT, '4_試験報告書_TR-2023-118.docx'))

def gen_tr2():
    d = new_doc('試験報告書　振動試験（CN-6P-W）', 'TR-2024-033', '')
    table(d, ['項目', '内容'], [['試験品', 'CN-6P-W（MDB-310 用）'], ['試験条件', 'JIS C 60068-2-6　10〜500 Hz　2 h×3 軸'], ['判定基準', 'SK-001 付表4']])
    H(d, '試験結果')
    table(d, ['サンプル No.', '初期接触抵抗', '試験後接触抵抗', '判定'], [[f'V-{i:02d}', f'{10 + i % 3} mΩ', f'{14 + i % 4} mΩ', '合格'] for i in range(1, 9)])
    P(d, '所見: 全数合格。瞬断（1 µs 以上）の発生なし。')
    d.save(os.path.join(OUT, '4_試験報告書_TR-2024-033.docx'))

if __name__ == '__main__':
    gen_8d(); gen_tr(); gen_tr2(); print('scan src done')
