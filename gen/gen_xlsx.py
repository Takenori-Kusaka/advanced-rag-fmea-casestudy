# -*- coding: utf-8 -*-
"""Generate 'kami-Excel' FMEA / DRBFM workbooks, BOM and the defect DB CSV for the fictional corpus."""
import os, sys, csv, random
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Side, Font, PatternFill
sys.path.insert(0, os.path.dirname(__file__))
from master import MODELS, COMPANY

OUT = sys.argv[1] if len(sys.argv) > 1 else '../corpus'
thin = Side(style='thin'); B = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical='top')
CENTER = Alignment(horizontal='center', vertical='center', wrap_text=True)
HFILL = PatternFill('solid', fgColor='D9E1F2')

# ---------------------------------------------------------------- FMEA content model
ELEMENTS = {
    'CN1 電源・通信コネクタ': ('電源と RS-485 信号を確実に接続する', [
        ('端子', '低抵抗で通電する', [('端子接触抵抗の増大', ['振動による微摺動（フレッティング腐食）', '端子表面の酸化皮膜形成', 'めっき厚不足']),
                                    ('端子の抜け', ['ランス破損', '端子挿入不足'])]),
        ('ハウジング・ロック', '嵌合状態を保持する', [('半嵌合', ['ロックアーム根元の疲労き裂', '嵌合力過大による挿入不足', '作業者の確認漏れ']),
                                              ('ロック外れ', ['ロックアーム変形', '係止突起の摩耗'])])]),
    '制御基板': ('モーターを指令どおりに駆動する', [
        ('MOSFET', 'モーター電流をスイッチングする', [('MOSFET 短絡破壊', ['ゲート駆動電圧不足による発熱', 'サージ電圧']), ('MOSFET 過熱', ['放熱シート硬化', '周囲温度超過'])]),
        ('電解コンデンサ', '電源電圧を平滑する', [('容量抜け', ['高温による電解液ドライアップ', 'リプル電流過大'])]),
        ('ホールセンサ', 'ロータ位置を検出する', [('位置検出信号の異常', ['ノイズ混入', 'センサ配線断線'])])]),
    'ファームウェア（通信処理）': ('上位コントローラと通信する', [
        ('通信監視処理', '通信途絶を検出し安全に停止する', [('通信途絶の未検出', ['タイムアウト設定が 0（無効）', '監視タスクの優先度不足']),
                                                  ('通信途絶の誤検出', ['タイムアウト既定値が短すぎる', 'ノイズによる CRC エラー連続'])]),
        ('RS-485 ドライバ', '差動信号を送受信する', [('通信エラー多発', ['終端抵抗の設定漏れ', '配線長超過', 'コネクタ半嵌合による断続接触'])])]),
    'ケース・放熱': ('内部部品を保護し放熱する', [
        ('放熱ベース', '発熱を外部へ逃がす', [('放熱不足', ['取付姿勢不良', '熱伝導シートの経年硬化'])]),
        ('ケース', '異物侵入を防ぐ', [('防塵性能低下', ['パッキン劣化'])])]),
}
EFFECTS = {'CN1 電源・通信コネクタ': '通信断によりモーターが停止する（ALM-31）', '制御基板': 'モーターが回転しない／異常停止する',
           'ファームウェア（通信処理）': '通信断時にモーターが停止しない、または不要停止する', 'ケース・放熱': '過熱保護（ALM-21）により停止する'}

# explicitly specified gold rows: (model, FM, FC) -> dict
GOLD = {
    ('MDA-120', '端子接触抵抗の増大', '振動による微摺動（フレッティング腐食）'): dict(S=7, O=4, D=5, PC='端子めっき 金 0.2 µm（SK-001 付表3）', DC='振動試験（JIS C 60068-2-6）後の接触抵抗測定', act='ロック強化型ハウジングへの変更検討'),
    ('MDA-120', '端子接触抵抗の増大', '端子表面の酸化皮膜形成'): dict(S=7, O=3, D=6, PC='金めっき採用', DC='高温高湿試験後の接触抵抗測定', act='—'),
    ('MDA-120', '半嵌合', 'ロックアーム根元の疲労き裂'): dict(S=8, O=5, D=7, PC='ロックアーム根元 R0.3', DC='挿抜耐久試験 30 回', act='根元 R0.5 以上へ変更（SK-001 5.1）'),
    ('MDB-300', '通信エラー多発', '終端抵抗の設定漏れ'): dict(S=6, O=5, D=6, PC='取扱説明書に終端設定を記載', DC='出荷時通信テスト（終端あり条件のみ）', act='出荷検査に終端なし条件を追加'),
    ('MDB-300', '通信途絶の未検出', 'タイムアウト設定が 0（無効）'): dict(S=9, O=3, D=4, PC='パラメータ設定範囲の下限を 0.5 s に制限', DC='設定値読出し検査', act='—'),
    ('MDC-500', '位置検出信号の異常', 'ノイズ混入'): dict(S=6, O=4, D=3, PC='シールドケーブル指定', DC='EMC イミュニティ試験 IEC 61000-4-4', act='フィルタ定数の見直し'),
}

def ap(S, O, D):
    if (S >= 9 and O >= 4) or (S >= 7 and O >= 6): return 'H'
    if S >= 5 and O >= 4: return 'M'
    return 'L'

def build_rows(model, seed):
    r = random.Random(seed); rows = []
    for elem, (efunc, parts) in ELEMENTS.items():
        for part, pfunc, fms in parts:
            for fm, causes in fms:
                for fc in causes:
                    g = GOLD.get((model, fm, fc))
                    if g: S, O, D, PC, DC, act = g['S'], g['O'], g['D'], g['PC'], g['DC'], g['act']
                    else:
                        S, O, D = r.randint(4, 9), r.randint(2, 6), r.randint(2, 8)
                        PC = r.choice(['設計基準 SK-001 に準拠', '部品選定基準による', 'シミュレーションで確認', '類似機の実績'])
                        DC = r.choice(['DV 試験', '環境試験', '出荷検査', '設計レビュー', '信頼性試験（HALT）'])
                        act = r.choice(['—', '—', '設計見直し', '試験条件追加'])
                    rows.append(dict(elem=elem, efunc=efunc, part=f'{part}', pfunc=pfunc, fe=EFFECTS[elem], fm=fm, fc=fc,
                                     S=S, PC=PC, O=O, DC=DC, D=D, AP=ap(S, O, D), RPN=S * O * D, act=act,
                                     owner=r.choice(['設計1課 田中', '設計2課 佐藤', '品証 鈴木']), due=f'2025/{r.randint(1, 12)}/{r.randint(1, 28)}'))
    return rows

def gen_fmea(model, docno, seed):
    wb = Workbook(); ws = wb.active; ws.title = 'DFMEA'
    ws['A1'] = 'DFMEA（設計 FMEA）'; ws['A1'].font = Font(size=16, bold=True); ws.merge_cells('A1:F1')
    ws['A2'] = f'会社名: {COMPANY}'; ws.merge_cells('A2:F2')
    ws['G1'] = '製品名'; ws['H1'] = model; ws['G2'] = '図番'; ws['H2'] = f'DWG-{model}-001'; ws['G3'] = 'FMEA ID'; ws['H3'] = docno
    ws['J1'] = '作成'; ws['K1'] = '審査'; ws['L1'] = '承認'; ws['J2'] = '(印)'; ws['K2'] = '(印)'; ws['L2'] = '(印)'
    ws['A3'] = f'作成日: 2023/06/12　改訂: Rev.03'; ws.merge_cells('A3:F3')
    # 3-row hierarchical header (rows 5-7)
    top = [(1, 1, 'No.'), (2, 3, '構造分析（ステップ2）'), (4, 5, '機能分析（ステップ3）'), (6, 8, '故障分析（ステップ4）'),
           (9, 15, 'リスク分析（ステップ5）'), (16, 18, '最適化（ステップ6）')]
    mid = {2: 'システム要素', 3: '構成部品', 4: '要素の機能', 5: '部品の機能・要求', 6: '故障影響', 7: '故障モード', 8: '故障原因',
           9: '重大度', 10: '現行の予防管理', 11: '発生度', 12: '現行の検出管理', 13: '検出度', 14: '処置優先度', 15: '危険優先数',
           16: '推奨処置', 17: '責任者', 18: '完了予定'}
    low = {6: '(FE)', 7: '(FM)', 8: '(FC)', 9: '(S)', 10: '(PC)', 11: '(O)', 12: '(DC)', 13: '(D)', 14: '(AP)', 15: '(RPN)'}
    for c1, c2, t in top:
        ws.cell(5, c1, t)
        if c1 == c2 == 1: ws.merge_cells(start_row=5, start_column=1, end_row=7, end_column=1)
        elif c2 > c1: ws.merge_cells(start_row=5, start_column=c1, end_row=5, end_column=c2)
    for c, t in mid.items():
        ws.cell(6, c, t)
        if c not in low: ws.merge_cells(start_row=6, start_column=c, end_row=7, end_column=c)
    for c, t in low.items(): ws.cell(7, c, t)
    for rr in range(5, 8):
        for c in range(1, 19):
            ws.cell(rr, c).alignment = CENTER; ws.cell(rr, c).border = B; ws.cell(rr, c).fill = HFILL; ws.cell(rr, c).font = Font(bold=True)
    rows = build_rows(model, seed)
    r0 = 8; prev = {}
    spans = {'elem': [], 'efunc': [], 'part': [], 'pfunc': [], 'fe': [], 'fm': []}
    for i, row in enumerate(rows):
        rr = r0 + i
        ws.cell(rr, 1, i + 1)
        vals = [row['elem'], row['part'], row['efunc'], row['pfunc'], row['fe'], row['fm'], row['fc'], row['S'], row['PC'].replace('（', '\n（'),
                row['O'], row['DC'], row['D'], row['AP'], row['RPN'], row['act'], row['owner'], row['due']]
        for j, v in enumerate(vals):
            ws.cell(rr, j + 2, v).alignment = WRAP; ws.cell(rr, j + 2).border = B
        ws.cell(rr, 1).border = B
    # vertical merges for hierarchy columns (elem=2, part=3, efunc=4, pfunc=5, fe=6, fm=7)
    for col, key in [(2, 'elem'), (4, 'efunc'), (6, 'fe'), (3, 'part'), (5, 'pfunc'), (7, 'fm')]:
        start = 0
        for i in range(1, len(rows) + 1):
            same = i < len(rows) and rows[i][key] == rows[start][key] and (key in ('elem', 'efunc', 'fe') or rows[i]['elem'] == rows[start]['elem'])
            if not same:
                if i - start > 1: ws.merge_cells(start_row=r0 + start, start_column=col, end_row=r0 + i - 1, end_column=col)
                start = i
    widths = [5, 16, 12, 16, 16, 18, 16, 20, 6, 20, 6, 22, 6, 6, 7, 18, 10, 10]
    for i, w in enumerate(widths): ws.column_dimensions[chr(65 + i)].width = w
    ws2 = wb.create_sheet('改訂履歴'); ws2.append(['版', '日付', '内容']); ws2.append(['Rev.01', '2021/04/01', '新規作成']); ws2.append(['Rev.03', '2023/06/12', '市場不具合反映'])
    wb.save(os.path.join(OUT, f'3_過去FMEA_{docno}_{model}.xlsx'))

def gen_drbfm():
    wb = Workbook(); ws = wb.active; ws.title = 'DRBFM'
    ws['A1'] = 'DRBFM ワークシート'; ws['A1'].font = Font(size=16, bold=True)
    ws['A2'] = '対象: MDB-310（コネクタ変更 CN-4P-L → CN-6P-W 防水）　DR 実施日: 2024/02/20　文書番号: DRBFM-MDB310-01'
    hdr1 = [(1, 3, '設計者が事前に記入'), (4, 8, '変更による心配点と影響'), (9, 9, '設計対応'), (10, 12, 'DRBFM の結果（推奨事項）')]
    hdr2 = ['部品名', '変更点', '変更の目的', '変更に伴う心配点', 'どんな場合に心配点が生じるか', 'お客様への影響', '影響度', '心配点の既知度',
            '心配点を除くためにどんな設計をしたか', '設計へ反映', '評価へ反映', '工程へ反映']
    for c1, c2, t in hdr1:
        ws.cell(4, c1, t)
        if c2 > c1: ws.merge_cells(start_row=4, start_column=c1, end_row=4, end_column=c2)
    for i, t in enumerate(hdr2): ws.cell(5, i + 1, t)
    for rr in (4, 5):
        for c in range(1, 13): ws.cell(rr, c).alignment = CENTER; ws.cell(rr, c).border = B; ws.cell(rr, c).fill = HFILL; ws.cell(rr, c).font = Font(bold=True)
    data = [
        ['電源コネクタ', 'CN-4P-L → CN-6P-W（防水シール付）', '屋外搬送装置への対応（IP65）', '嵌合力増大による半嵌合', '防水シールの圧縮反力が大きく、作業者が押し込み不足のまま組み立てた場合', '通信断・停止（ALM-32）', '8', '既知（Q-2023-0217）',
         '嵌合力 60 N 以下を SK-001 5.3 で確認。半嵌合検知ばね構造（特開2025-012345）を採用', 'シール硬度の見直し', '嵌合力測定を DV 試験に追加', '嵌合確認治具による引張確認（20 N）を全数実施'],
        ['', '', '', 'シール材の圧縮永久ひずみ', '高温（55 ℃）で長期使用した場合', '防水性能低下・端子腐食', '6', '未知', 'シール材を EPDM からシリコーンに変更', '—', '高温放置 1000 h 試験', '—'],
        ['', '', '', '端子ピッチ変更による誤挿入', '旧型ハーネスを流用した場合', '電源誤印加で基板破損', '9', '未知', 'キー形状を旧型と非互換に設定', '—', '誤挿入試験', '旧型ハーネスの工程内識別'],
        ['ファームウェア', 'タイムアウト判定を 3.0 s 固定 → 可変（0.5〜30.0 s）', '顧客要求への対応', '設定ミスによる通信途絶の未検出', '設定値を 0 にした場合', '通信断時に停止しない', '9', '既知', '設定範囲の下限を 0.5 s に制限', '—', '境界値試験', '出荷時設定値読出し'],
    ]
    for i, row in enumerate(data):
        for j, v in enumerate(row):
            c = ws.cell(6 + i, j + 1, v); c.alignment = WRAP; c.border = B
    ws.merge_cells('A6:A8'); ws.merge_cells('B6:B8'); ws.merge_cells('C6:C8'); ws.cell(6, 1).value = '電源コネクタ'
    for i, w in enumerate([12, 22, 18, 20, 24, 16, 6, 10, 30, 14, 16, 22]): ws.column_dimensions[chr(65 + i)].width = w
    wb.save(os.path.join(OUT, '3_過去DRBFM_DRBFM-MDB310-01.xlsx'))

def gen_bom():
    wb = Workbook(); ws = wb.active; ws.title = 'BOM'
    ws.append(['部品表（BOM）　MDA-200 Rev.B　BOM-MDA200-B']); ws.append([])
    ws.append(['階層', '品番', '品名', '数量', 'メーカー', '備考'])
    for row in [[0, 'MDA-200-24-R-B', 'ブラシレスモータードライバ', 1, '自社', ''], [1, 'PCB-A200-B', '制御基板', 1, '自社', ''],
                [2, 'CN-4P-L2', '電源・通信コネクタ（4極）', 1, 'コネクタ社 X（架空）', 'Rev.B で CN-4P-L から変更。ロックアーム根元 R0.5'],
                [2, 'FET-60V-80A', 'MOSFET', 6, '半導体社 Y（架空）', ''], [2, 'CAP-35V-470U', '電解コンデンサ 470 µF', 2, '電子部品社 Z（架空）', '105 ℃品'],
                [1, 'HS-A200', '放熱ベース', 1, '自社', ''], [1, 'TS-15', '熱伝導シート', 1, '材料社 W（架空）', '特開2024-087654 構造']]:
        ws.append(row)
    wb.save(os.path.join(OUT, '2_BOM_MDA-200-B.xlsx'))

# ---------------------------------------------------------------- defect DB
VARIANTS = {'MDA-200': ['MDA-200', 'MDA200', 'ＭＤＡ－２００', 'A200', 'MDA-200-24-R'], 'MDA-120': ['MDA-120', 'MDA120', 'ＭＤＡ－１２０'],
            'MDB-300': ['MDB-300', 'MDB300', 'B300'], 'MDB-310': ['MDB-310', 'ＭＤＢ－３１０'], 'MDC-500': ['MDC-500', 'MDC500']}
GOLD_DEFECTS = [
    ['Q-2024-0137', '2024/03/18', 'MDA200', '市場', 'ｺﾈｸﾀ半ｶﾝｺﾞｳにより通信ｴﾗｰ多発（ALM31）。客先ﾗｲﾝ停止', 'ロック未係止のまま設置', 'コネクタ再嵌合、客先へ注意喚起', '接続', '完了'],
    ['Q-2024-0388', '2024/09/02', 'ＭＤＡ－２００', '市場', 'CN1 抜けかけ。振動で通信断→停止。ロックアーム根元に割れ', 'ロックアーム根元R寸法不足（金型摩耗）', '8D-2024-021 で恒久対策', '接続', '完了'],
    ['Q-2025-0052', '2025/02/14', 'A200', '工程', 'コネクター嵌合確認漏れ。出荷前検査で通信NG', '作業者の嵌合確認漏れ', '嵌合確認治具を導入', '接続', '完了'],
    ['Q-2023-0217', '2023/07/21', 'MDB300', '市場', '防水ｺﾈｸﾀ 押し込み不足 → 半嵌合 ALM-32', 'シール反力による挿入不足', 'DRBFM-MDB310-01 に反映', '接続', '完了'],
]
PHEN = [('ALM-21 過熱停止が頻発', '取付姿勢不良', '取付方向の指導', '熱'), ('起動時に異音', 'ベアリング潤滑不足', 'モーター交換', '機構'), ('速度ふらつき', 'ホール信号ノイズ', 'シールド処理', '制御'),
        ('ALM-11 過電流', 'モーター配線の短絡', '配線修理', '電気'), ('電源投入不可', 'ヒューズ溶断', '基板交換', '電気'), ('通信エラー（CRC）', '終端抵抗の設定漏れ', 'DIP スイッチ設定', '通信'),
        ('LED 不点灯', 'LED はんだクラック', '基板交換', '電気'), ('ケース変形', '輸送時の落下', '梱包見直し', '機構'), ('コンデンサ膨らみ', '高温環境での長期使用', '基板交換', '電気'),
        ('パラメータ消失', 'EEPROM 書込み中の電源断', '再設定', '制御'), ('コネクタ端子変色', '過電流による発熱', 'ハーネス交換', '接続')]

def gen_defects():
    r = random.Random(7); rows = []
    for i in range(420):
        model = r.choice(list(VARIANTS)); ph, cause, act, cat = r.choice(PHEN)
        yr = r.choice([2022, 2023, 2024, 2025]); no = f'Q-{yr}-{r.randint(1000, 1999):04d}'
        rows.append([no, f'{yr}/{r.randint(1, 12):02d}/{r.randint(1, 28):02d}', r.choice(VARIANTS[model]), r.choice(['市場', '工程', '受入']),
                     ph, cause, act, cat, r.choice(['完了', '対策中'])])
    for g in GOLD_DEFECTS: rows.insert(r.randint(0, len(rows)), g)
    with open(os.path.join(OUT, '4_不具合DB_export.csv'), 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(['管理No', '受付日', '製品型式', '発生場所', '現象', '推定原因', '処置', '分類', '状態']); w.writerows(rows)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    gen_fmea('MDA-120', 'FMEA-MDA120-03', 1); gen_fmea('MDB-300', 'FMEA-MDB300-02', 2); gen_fmea('MDC-500', 'FMEA-MDC500-01', 3)
    gen_drbfm(); gen_bom(); gen_defects(); print('xlsx done')
