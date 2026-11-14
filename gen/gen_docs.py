# -*- coding: utf-8 -*-
"""Generate Word documents (manuals, specs, standards, patents, customer reqs) for the fictional corpus."""
import os, sys
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(__file__))
from master import SERIES, MODELS, MODEL_SERIES, COMPANY

OUT = sys.argv[1] if len(sys.argv) > 1 else '../corpus'
FIG = os.path.join(OUT, '_fig')
os.makedirs(FIG, exist_ok=True)
FONT = '/mnt/c/Windows/Fonts/BIZ-UDGothicR.ttc'

def font(sz):
    return ImageFont.truetype(FONT, sz)

def new_doc(title, docno, rev='Rev.A'):
    d = Document()
    st = d.styles['Normal']; st.font.name = 'BIZ UDPGothic'; st.font.size = Pt(10.5)
    p = d.add_paragraph(); r = p.add_run(title); r.bold = True; r.font.size = Pt(18)
    d.add_paragraph(f'文書番号: {docno}　{rev}　発行: {COMPANY}')
    return d

def table(d, header, rows, widths=None):
    t = d.add_table(rows=1, cols=len(header)); t.style = 'Table Grid'
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]; c.text = h
        for r in c.paragraphs[0].runs: r.bold = True
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row): cells[i].text = str(v)
    d.add_paragraph('')
    return t

def caption(d, text):
    p = d.add_paragraph(text); p.alignment = WD_ALIGN_PARAGRAPH.CENTER

def H(d, text, lvl=1):
    d.add_heading(text, level=lvl)

def P(d, text):
    d.add_paragraph(text)

# ---------------------------------------------------------------- figures
def fig_block(path, model):
    im = Image.new('RGB', (1200, 520), 'white'); g = ImageDraw.Draw(im); f = font(26)
    boxes = [('電源入力\nCN1', 60, 200), ('平滑・保護回路', 300, 200), ('インバータ\n(MOSFET×6)', 560, 200), ('モーター\n出力 CN2', 860, 200)]
    for t, x, y in boxes:
        g.rectangle([x, y, x + 200, y + 120], outline='black', width=3); g.multiline_text((x + 15, y + 30), t, font=f, fill='black')
    for x in (260, 500, 760):
        g.line([x, 260, x + 40, 260], fill='black', width=3); g.polygon([(x + 40, 252), (x + 52, 260), (x + 40, 268)], fill='black')
    g.rectangle([560, 30, 760, 130], outline='black', width=3); g.multiline_text((575, 50), '制御MCU\nFW ' + MODELS[model]['fw'], font=f, fill='black')
    g.rectangle([860, 30, 1100, 130], outline='black', width=3); g.multiline_text((875, 50), 'RS-485\nトランシーバ CN3', font=f, fill='black')
    g.line([660, 130, 660, 200], fill='black', width=3); g.line([760, 80, 860, 80], fill='black', width=3)
    g.text((60, 420), f'{model} 機能ブロック図（通信条件の詳細は別冊 MAN-COM-01）', font=font(22), fill='black')
    im.save(path)

def fig_patent(path, kind, figno):
    """Patent-style line drawing: only reference numerals with leader lines (no names)."""
    im = Image.new('RGB', (1000, 700), 'white'); g = ImageDraw.Draw(im); f = font(30)
    if kind == 'conn':
        g.rectangle([150, 250, 650, 450], outline='black', width=4)          # housing 10
        g.rectangle([200, 300, 380, 420], outline='black', width=3)          # chamber 11
        g.line([650, 260, 820, 260], fill='black', width=4)                   # lock arm 21
        g.line([820, 260, 820, 230], fill='black', width=4)                   # protrusion 23
        g.arc([620, 240, 680, 300], 90, 270, fill='black', width=4)            # root 22
        g.rectangle([700, 330, 900, 450], outline='black', width=3)          # mating housing 30
        g.line([400, 360, 560, 360], fill='black', width=3)                   # terminal 34
        g.arc([520, 330, 600, 390], 0, 180, fill='black', width=3)            # spring 35
        nums = {2: [(10, (160, 470), (300, 450)), (11, (210, 520), (290, 420)), (21, (720, 180), (740, 258)), (22, (560, 180), (640, 270)),
                    (23, (860, 180), (822, 235)), (30, (920, 480), (880, 450)), (31, (920, 360), (902, 380)), (34, (430, 520), (470, 362)), (35, (600, 520), (560, 385))],
                3: [(21, (720, 180), (740, 258)), (23, (860, 180), (822, 235)), (25, (480, 180), (560, 300)), (30, (920, 480), (880, 450)), (31, (920, 360), (902, 380))]}[figno]
    else:
        for i in range(6):
            g.rectangle([200 + i * 80, 150, 240 + i * 80, 400], outline='black', width=3)  # fins 23
        g.rectangle([180, 400, 700, 460], outline='black', width=4)                         # base 21
        g.rectangle([300, 460, 560, 520], outline='black', width=3)                         # MOSFET 10
        g.rectangle([290, 520, 580, 560], outline='black', width=3)                         # PCB 34
        nums = {2: [(10, (650, 600), (540, 500)), (21, (760, 430), (700, 430)), (23, (150, 110), (215, 160)), (34, (240, 640), (320, 560)), (36, (650, 520), (560, 470))]}[figno]
    for n, (tx, ty), (px, py) in nums:
        g.line([tx + 20, ty + 15, px, py], fill='black', width=2)
        g.text((tx, ty), str(n), font=f, fill='black')
    g.text((430, 640), f'【図{figno}】', font=f, fill='black')
    im.save(path)

# ---------------------------------------------------------------- ① product / project
def gen_project():
    d = new_doc('製品企画書　MDA-200 Rev.B 改良開発', 'PJ-2025-018', 'Rev.C')
    H(d, '1. 開発の目的'); P(d, '搬送装置メーカー向けに MDA-200 の信頼性を改善した Rev.B を開発する。市場不具合（コネクタ半嵌合による通信断）の再発防止と、顧客要求仕様 CR-2025-07 への適合を目的とする。')
    H(d, '2. 主な変更点（DRBFM 対象）')
    table(d, ['No.', '変更区分', '変更前', '変更後', '理由'], [
        ['1', 'コネクタ', 'CN-4P-L（ロックアーム付）', 'CN-4P-L2（ロックアーム根元R0.5・半嵌合検知ばね付）', '市場不具合 Q-2024-0388 の再発防止'],
        ['2', '通信設定', '通信タイムアウト既定値 1.5 s', '通信タイムアウト既定値 1.0 s', '顧客要求 CR-2025-07 3.2項'],
        ['3', 'ファームウェア', 'Ver.2.3', 'Ver.2.4', 'タイムアウト既定値変更・ALM-31 判定見直し'],
    ])
    H(d, '3. 日程'); P(d, 'DR1: 2025年9月、DR2: 2025年12月、量産移行: 2026年4月。DFMEA は MDA-120 の過去 DFMEA（FMEA-MDA120-03）を流用して作成する。')
    H(d, '4. 型式の見方')
    P(d, '型式は「シリーズ記号-フレーム-電圧コード-インタフェース-改訂」で構成する。例: MDA-200-24-R-B')
    table(d, ['桁', '内容', 'コード', '意味'], [
        ['1〜3', 'シリーズ記号', 'MDA / MDB / MDC', 'MDA=Aシリーズ、MDB=Bシリーズ、MDC=Cシリーズ'],
        ['4〜6', 'フレーム（出力クラス）', '120 / 200 / 300 / 310 / 500', '定格出力の目安（W）'],
        ['7〜8', '電源電圧コード', '24 / 48', 'DC24V / DC48V'],
        ['9', 'インタフェース', 'R / C', 'R=RS-485（Modbus RTU）、C=CANopen（Cシリーズのみ）'],
        ['10', '改訂記号', '無記号 / B', 'B=Rev.B（2026年度量産品）'],
    ])
    d.save(os.path.join(OUT, '1_製品企画書_PJ-2025-018.docx'))

# ---------------------------------------------------------------- ② product manuals
def gen_product_manual(model):
    s = SERIES[MODEL_SERIES[model]]; m = MODELS[model]
    d = new_doc(f'{model} ブラシレスモータードライバ 取扱説明書', f'MAN-{model}', 'Rev.D')
    H(d, '1. 安全上の注意'); P(d, '本製品の設置・配線・保守は、電気の専門知識を有する者が行ってください。通電中はコネクタの抜き差しをしないでください。RS-485 通信線の配線を誤ると、通信異常や機器の破損の原因となります。')
    H(d, '2. 仕様')
    table(d, ['項目', '仕様'], [['定格出力', m['power']], ['電源電圧', s['voltage']], ['定格電流', m['current']], ['使用周囲温度', m['temp']],
                               ['保護等級', m['ip']], ['電源・通信コネクタ', m['conn']], ['通信インタフェース', s['iface'] + '（通信仕様の詳細は別冊「RS-485 通信ユーザーズマニュアル 共通編 MAN-COM-01」を参照）'], ['ファームウェア', m['fw']]])
    H(d, '3. 設置'); P(d, '本製品は垂直方向に取り付け、周囲に 25 mm 以上の空間を確保してください。放熱が不十分な場合、過熱保護（ALM-21）が動作します。')
    H(d, '4. 配線'); P(d, f'電源と RS-485 通信は {m["conn"]} にまとめて接続します。コネクタはロックが確実に掛かるまで挿入してください。RS-485 の終端処理・通信速度・ノードアドレスの設定方法は、MAN-COM-01 の該当シリーズの章を参照してください。')
    fp = os.path.join(FIG, f'block_{model}.png'); fig_block(fp, model)
    d.add_picture(fp, width=Cm(15)); caption(d, f'図4-1 {model} 機能ブロック図')
    H(d, '5. 運転'); P(d, '上位コントローラから RS-485 通信で運転指令を送信します。通信による運転指令・速度設定・アラームリセットの手順は MAN-COM-01 を参照してください。通信が途絶した場合の動作は、パラメータと通信タイムアウト設定に依存します。')
    H(d, '6. 保護機能とアラーム')
    table(d, ['アラームコード', '内容', '主な原因'], [['ALM-11', '過電流', 'モーター配線の短絡、過負荷'], ['ALM-21', '過熱', '周囲温度超過、放熱不足'],
                                         ['ALM-31', '通信異常（タイムアウト）', '通信線の断線、コネクタの接触不良・半嵌合。検出時間と停止動作は MAN-COM-01 を参照'], ['ALM-41', 'ホールセンサ異常', 'センサ配線の断線']])
    H(d, '7. 保守'); P(d, '定期点検では、コネクタのロック状態、端子の変色、通信線の被覆損傷を確認してください。通信エラーが頻発する場合は、コネクタの嵌合状態と終端抵抗の設定を確認してください。')
    d.save(os.path.join(OUT, f'2_取扱説明書_{model}.docx'))

def gen_comm_manual():
    d = new_doc('RS-485 通信ユーザーズマニュアル 共通編', 'MAN-COM-01', 'Rev.F')
    H(d, '1. 本書について'); P(d, '本書は、当社ブラシレスモータードライバ各シリーズに共通する RS-485（Modbus RTU）通信機能を説明します。シリーズによって仕様が異なる項目は、シリーズ別の表で示します。個別の機種名ではなくシリーズ名で記載している箇所は、そのシリーズの全機種に適用されます。')
    H(d, '2. 適用シリーズ'); P(d, '本書は Aシリーズ、Bシリーズ、Cシリーズに適用します。各機種がどのシリーズに属するかは、各製品の取扱説明書の型式の見方を参照してください。')
    H(d, '3. 通信仕様一覧')
    table(d, ['項目', 'Aシリーズ', 'Bシリーズ', 'Cシリーズ'], [
        ['通信速度（選択可能）', SERIES['A']['baud_list'], SERIES['B']['baud_list'], SERIES['C']['baud_list']],
        ['通信速度（工場出荷時）', SERIES['A']['baud_default'], SERIES['B']['baud_default'], SERIES['C']['baud_default']],
        ['データ形式', SERIES['A']['parity'], SERIES['B']['parity'], SERIES['C']['parity']],
        ['接続台数', SERIES['A']['nodes'], SERIES['B']['nodes'], SERIES['C']['nodes']],
        ['終端抵抗', SERIES['A']['term'], SERIES['B']['term'], SERIES['C']['term']],
        ['レジスタアドレス', SERIES['A']['reg_offset'], SERIES['B']['reg_offset'], SERIES['C']['reg_offset']],
    ])
    P(d, '※1 Aシリーズのうちフレーム200の機種は、ファームウェア Ver.2.1 以降で 230400 bps を選択できます。')
    P(d, '※2 Cシリーズの CANopen 通信については別冊 MAN-CAN-01 を参照してください。')
    H(d, '4. 配線と終端処理'); P(d, '通信線にはシールド付きツイストペア線を使用し、総延長は 500 m 以下としてください。終端抵抗の要否はシリーズにより異なります（3章の表を参照）。終端処理が不適切な場合、反射により通信エラーが発生します。')
    H(d, '5. 通信タイムアウトと異常時動作'); P(d, '上位コントローラからの受信が一定時間途絶すると、ドライバは通信タイムアウトを検出し、アラームを発生させます。検出時間（通信タイムアウト初期値）と異常時の停止動作はシリーズにより異なります。')
    table(d, ['シリーズ', '通信タイムアウト初期値', '設定範囲', '異常時の停止動作'], [
        ['Aシリーズ', SERIES['A']['timeout'], '0.1〜10.0 s', SERIES['A']['timeout_action']],
        ['Bシリーズ', SERIES['B']['timeout'], '0.5〜30.0 s', SERIES['B']['timeout_action']],
        ['Cシリーズ', SERIES['C']['timeout'], '0.1〜5.0 s', SERIES['C']['timeout_action']],
    ])
    P(d, '※ 通信タイムアウトを 0 に設定すると検出が無効になります。安全上、無効化は推奨しません。')
    H(d, '6. Modbus レジスタ（抜粋）')
    table(d, ['機能', 'アドレス（相対）', '内容'], [['運転指令', '+0x0010', '0: 停止 / 1: 正転 / 2: 逆転'], ['速度指令', '+0x0012', 'r/min'], ['通信タイムアウト', '+0x0030', '0.1 s 単位'], ['アラーム履歴', '+0x0100', '直近 8 件']])
    P(d, '実際のアドレスは、3章のシリーズ別レジスタアドレス起点に相対アドレスを加えた値です。')
    H(d, '7. 改訂履歴'); table(d, ['版', '内容'], [['Rev.E', 'Cシリーズ追加'], ['Rev.F', '※1 追記（フレーム200の 230400 bps 対応）']])
    d.save(os.path.join(OUT, '2_通信マニュアル共通編_MAN-COM-01.docx'))

def gen_can_manual():
    d = new_doc('CANopen 通信ユーザーズマニュアル', 'MAN-CAN-01', 'Rev.B')
    H(d, '1. 適用'); P(d, '本書は Cシリーズの CANopen 通信に適用します。RS-485 通信については MAN-COM-01 を参照してください。')
    H(d, '2. 通信仕様'); table(d, ['項目', '仕様'], [['ビットレート', '125 k / 250 k / 500 k / 1 Mbps'], ['ハートビート監視', '既定 500 ms'], ['ノードID', '1〜127']])
    H(d, '3. ハートビート異常時の動作'); P(d, 'ハートビートが途絶すると EMCY を送信し、オブジェクト 0x6007 の設定に従い停止します。通信タイムアウトとは独立して動作します。')
    d.save(os.path.join(OUT, '2_通信マニュアル_MAN-CAN-01.docx'))

def gen_design_spec():
    d = new_doc('設計仕様書　MDA-200 Rev.B', 'SPEC-MDA200-B', 'Rev.2')
    H(d, '1. 概要'); P(d, '本書は MDA-200 Rev.B の電気・機構設計仕様を定める。通信プロトコルの詳細仕様は MAN-COM-01 による。')
    H(d, '2. 電気定格'); table(d, ['項目', '最小', '標準', '最大', '単位'], [['電源電圧', '21.6', '24.0', '26.4', 'V'], ['定格電流', '—', '9.0', '—', 'A'], ['突入電流', '—', '—', '30', 'A'], ['待機電力', '—', '1.2', '—', 'W']])
    H(d, '3. コネクタ CN1（CN-4P-L2）ピン配置'); table(d, ['ピン', '信号', '定格'], [['1', '+24V', '9 A'], ['2', 'GND', '9 A'], ['3', 'RS-485 D+', '—'], ['4', 'RS-485 D−', '—']])
    H(d, '4. コネクタ許容電流のディレーティング')
    P(d, 'CN-4P-L2 の 1 ピンあたり許容電流は、周囲温度に応じて下表のとおり低減する。表の値を超えて使用してはならない。')
    table(d, ['周囲温度', '1ピンあたり許容電流（AWG18）', '1ピンあたり許容電流（AWG20）'], [['25 ℃', '10.0 A', '8.0 A'], ['40 ℃', '9.0 A', '7.2 A'], ['50 ℃', '7.6 A', '6.1 A'], ['60 ℃', '6.3 A', '5.0 A']])
    P(d, '注: MDA-200 Rev.B の定格電流 9.0 A は 40 ℃ を超える環境では AWG18 でも許容値を超えるため、使用周囲温度上限を 40 ℃ に制限するか、2 ピン並列とする（DR2 で決定）。')
    fp = os.path.join(FIG, 'block_MDA-200.png'); d.add_picture(fp, width=Cm(15)); caption(d, '図5-1 機能ブロック図（Rev.B で CN3 を CN1 に統合）')
    H(d, '5. 機構'); P(d, 'コネクタ CN-4P-L2 はロックアーム根元に R0.5 を設け、半嵌合検知ばねを備える（特開2025-012345 の構造を採用）。嵌合力は社内基準 SK-001 5.3項に従う。')
    d.save(os.path.join(OUT, '2_設計仕様書_SPEC-MDA200-B.docx'))

# ---------------------------------------------------------------- ⑤ standards / QMS
def gen_sk001():
    d = new_doc('社内設計基準　コネクタ設計基準', 'SK-001', '第4版')
    H(d, '1. 適用範囲'); P(d, '本基準は、当社モータードライバに使用する電源・信号用コネクタの設計に適用する。')
    H(d, '2. 引用規格'); P(d, 'JIS C 5402（電子機器用コネクタ試験方法）、IEC 60512 シリーズ。')
    H(d, '3. 用語'); P(d, '半嵌合: ロック機構が係止位置に達していないが、電気的に導通している状態をいう。')
    H(d, '4. 端子')
    H(d, '4.1 材質', 2); P(d, '端子母材はりん青銅または黄銅とする。')
    H(d, '4.2 めっき', 2); P(d, '端子のめっき仕様は付表3による。嵌合部と端子圧着部で仕様が異なることに注意すること。')
    H(d, '4.3 接触抵抗', 2); P(d, '初期接触抵抗は 20 mΩ 以下とする。環境試験後の判定基準は付表4による。')
    H(d, '5. ハウジング')
    H(d, '5.1 ロック機構', 2); P(d, 'ロックアームの根元には応力集中を避けるため R0.5 以上を設けること。')
    H(d, '5.2 保持力', 2); P(d, 'ロック状態での保持力は 50 N 以上とする。')
    H(d, '5.3 嵌合力', 2); P(d, '嵌合力は 60 N 以下とする。防水シールを有するコネクタも同様とする。')
    H(d, '5.4 半嵌合防止', 2); P(d, '半嵌合検知構造を備えること。確認方法は 6.2 項による。')
    H(d, '6. 検証')
    H(d, '6.1 試験項目', 2); table(d, ['試験', '条件', '判定'], [['振動', 'JIS C 60068-2-6 10〜500 Hz 2 h×3軸', '付表4'], ['温度サイクル', '−40/+85 ℃ 500 サイクル', '付表4'], ['挿抜耐久', '50 回', '付表4']])
    H(d, '6.2 嵌合確認方法', 2); P(d, '組立工程では嵌合確認治具による引張確認（20 N・2 s）を全数行う。')
    H(d, '付表3 端子めっき仕様')
    table(d, ['部位', 'めっき', '厚さ', '下地'], [['嵌合部（接点）', '金めっき', '0.2 µm 以上', 'ニッケル 1.0 µm 以上'], ['圧着部', 'すずめっき', '1.0 µm 以上', 'なし']])
    H(d, '付表4 環境試験後の判定基準')
    table(d, ['項目', '判定基準'], [['接触抵抗変化', 'ΔR ≦ 10 mΩ（かつ試験後 30 mΩ 以下）'], ['外観', '割れ・変形なきこと'], ['保持力', '50 N 以上']])
    d.save(os.path.join(OUT, '5_設計基準_SK-001_コネクタ.docx'))

def gen_qms():
    d = new_doc('品質保証規程　FMEA 実施手順', 'QP-07', '第6版')
    H(d, '1. 目的'); P(d, '本規程は、IEC 60812 および AIAG-VDA FMEA ハンドブックの考え方に基づき、当社の設計 FMEA（DFMEA）と DRBFM の実施手順を定める。')
    H(d, '2. 評価基準'); P(d, '重大度(S)・発生度(O)・検出度(D)は 1〜10 で評価する。処置優先度は AP（High/Medium/Low）で判定し、参考として RPN（S×O×D）を併記する。')
    table(d, ['判定', '条件', '処置'], [['AP=High', 'S≧9 かつ O≧4、または S≧7 かつ O≧6', '処置必須。DR で承認'], ['AP=Medium', '上記以外で S≧5 かつ O≧4', '処置を推奨'], ['AP=Low', 'その他', '必要に応じて処置']])
    H(d, '3. DRBFM'); P(d, '設計変更を伴う場合は DRBFM を実施する。変更点ごとに心配点を洗い出し、過去不具合（不具合 DB）および過去 FMEA を参照すること。')
    d.save(os.path.join(OUT, '5_品質保証規程_QP-07_FMEA手順.docx'))

# ---------------------------------------------------------------- ⑥ patents / customer / service
def gen_patent_conn():
    d = new_doc('【公開特許公報（架空）】特開2025-012345　電気コネクタ', '特開2025-012345', '')
    P(d, '（出願人）' + COMPANY + '　※本公報は RAG 検証用に作成した架空の文書です')
    H(d, '【請求項1】'); P(d, 'ハウジングと、前記ハウジングから延びるロックアームと、前記ロックアームの先端に設けられた係止突起と、半嵌合状態で相手側ハウジングを押し戻す検知ばねとを備えた電気コネクタ。')
    H(d, '【技術分野】'); P(d, '本発明は、半嵌合を検知できる電気コネクタに関する。')
    H(d, '【背景技術】'); P(d, '従来のコネクタでは、ロックが掛かっていない半嵌合状態でも端子が導通するため、組立時に半嵌合が見逃され、振動により市場で抜けが生じることがあった。')
    H(d, '【図面の簡単な説明】'); P(d, '【図1】実施形態に係る電気コネクタの斜視図である。'); P(d, '【図2】ロック機構の断面図である。'); P(d, '【図3】半嵌合状態を示す断面図である。')
    H(d, '【発明を実施するための形態】')
    P(d, '【0010】図2に示すように、ハウジング10は端子収容室11を有し、端子収容室11には雌端子34が収容される。雌端子34は接点ばね35により相手側端子に押圧される。')
    P(d, '【0011】ハウジング10の上面からはロックアーム21が延び、ロックアーム21の先端には係止突起23が設けられる。係止突起23が相手側ハウジング30の係止部31を乗り越えることで、ロック状態となる。')
    P(d, '【0012】ロックアーム21の根元部22には着脱のたびに曲げ応力が集中する。根元部22の曲率半径が小さいと、繰返しの着脱により根元部22に疲労き裂が生じ、ロックアーム21の保持力が低下して、振動によりコネクタが抜け、雌端子34の接触が不安定になる。そこで本実施形態では、根元部22に R0.5 以上の曲率を設ける。')
    P(d, '【0013】図3に示すように、係止突起23が係止部31に達していない半嵌合状態では、検知ばね25の反力により相手側ハウジング30が押し戻される。これにより、作業者は半嵌合に気付くことができる。')
    for n in (2, 3):
        fp = os.path.join(FIG, f'pat_conn_fig{n}.png'); fig_patent(fp, 'conn', n); d.add_picture(fp, width=Cm(12))
    H(d, '【符号の説明】')
    for n, name in [(10, 'ハウジング'), (21, 'ロックアーム'), (23, '係止突起'), (30, '相手側ハウジング'), (34, '雌端子')]:  # 実公報同様、主要符号のみ（22,25等は本文中のみで定義）
        P(d, f'{n}　{name}')
    d.save(os.path.join(OUT, '6_特許_特開2025-012345_コネクタ.docx'))

def gen_patent_heat():
    d = new_doc('【公開特許公報（架空）】特開2024-087654　モータードライバの放熱構造', '特開2024-087654', '')
    P(d, '（出願人）' + COMPANY + '　※本公報は RAG 検証用に作成した架空の文書です')
    H(d, '【図面の簡単な説明】'); P(d, '【図2】放熱構造の側面図である。')
    H(d, '【発明を実施するための形態】')
    P(d, '【0008】図2に示すように、スイッチング素子10は放熱ベース21に熱伝導シート36を介して接触し、放熱ベース21には複数の放熱フィン23が立設される。スイッチング素子10は基板34に実装される。')
    P(d, '【0009】熱伝導シート36が経年により硬化すると、スイッチング素子10と放熱ベース21の間に隙間が生じ、熱抵抗が増大して過熱保護が頻発する。')
    fp = os.path.join(FIG, 'pat_heat_fig2.png'); fig_patent(fp, 'heat', 2); d.add_picture(fp, width=Cm(12))
    H(d, '【符号の説明】')
    for n, name in [(10, 'スイッチング素子'), (21, '放熱ベース'), (23, '放熱フィン'), (34, '基板'), (36, '熱伝導シート')]:
        P(d, f'{n}　{name}')
    d.save(os.path.join(OUT, '6_特許_特開2024-087654_放熱.docx'))

def gen_customer():
    d = new_doc('顧客要求仕様書　搬送装置用モータードライバ', 'CR-2025-07', '第2版')
    P(d, '（発行: 搬送装置メーカー X 社（架空））')
    H(d, '1. 適用'); P(d, '本仕様書は、X 社搬送ライン向けに納入されるモータードライバ（MDA-200 Rev.B を想定）に適用する。')
    H(d, '2. 環境条件'); P(d, '使用周囲温度は 0〜45 ℃ とする。')
    H(d, '3. 安全要求')
    H(d, '3.1 非常停止', 2); P(d, '非常停止入力から 100 ms 以内に出力を遮断すること。')
    H(d, '3.2 通信断時の動作', 2); P(d, '上位 PLC との通信断を検出した場合、1.0 s 以内にモーターを停止させること。停止方法は減速停止とする。')
    H(d, '4. 構造要求'); P(d, 'コネクタは嵌合状態を目視または触感で確認できる構造とすること。')
    d.save(os.path.join(OUT, '6_顧客要求仕様書_CR-2025-07.docx'))

def gen_service():
    d = new_doc('サービスニュース', 'SN-2025-03', '')
    H(d, '件名: MDA-200 の通信エラー多発事例と点検ポイント')
    P(d, '市場で MDA-200 の ALM-31（通信異常）が多発する事例が報告されています。調査の結果、コネクタのロックが掛かっていない半嵌合状態で出荷・設置されたことが主因でした。点検時は、ロックアームの割れと係止状態を確認してください。なお、ファームウェア Ver.2.1 未満の MDA-200 では 230400 bps を設定できません。')
    d.save(os.path.join(OUT, '6_サービスニュース_SN-2025-03.docx'))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    gen_project()
    for m in MODELS: gen_product_manual(m)
    gen_comm_manual(); gen_can_manual(); gen_design_spec()
    gen_sk001(); gen_qms()
    gen_patent_conn(); gen_patent_heat(); gen_customer(); gen_service()
    print('docs done')
