# -*- coding: utf-8 -*-
"""Master data for the fictional company "ミナト精機（架空）" BLDC motor-driver product line.
All companies, products, patents and numbers are fictional and generated for a RAG case study."""
import random

COMPANY = 'ミナト精機株式会社（架空）'

SERIES = {
    'A': dict(name='Aシリーズ', prefix='MDA', models=['MDA-120', 'MDA-200'], voltage='DC24V', iface='RS-485（Modbus RTU）',
              baud_list='9600 / 19200 / 38400 / 57600 / 115200 bps', baud_default='19200 bps', timeout='1.5 s',
              timeout_action='減速停止（ALM-31）', nodes='最大 31 台', term='内蔵なし（外付け 120 Ω を推奨）',
              reg_offset='0x0000 起点', parity='偶数パリティ'),
    'B': dict(name='Bシリーズ', prefix='MDB', models=['MDB-300', 'MDB-310'], voltage='DC48V', iface='RS-485（Modbus RTU）',
              baud_list='9600 / 19200 / 38400 / 57600 / 115200 / 230400 bps', baud_default='38400 bps', timeout='3.0 s',
              timeout_action='即時停止（ALM-32）', nodes='最大 31 台', term='内蔵（DIP スイッチ SW2-4 で有効化）',
              reg_offset='0x1000 起点', parity='パリティなし・ストップビット 2'),
    'C': dict(name='Cシリーズ', prefix='MDC', models=['MDC-500'], voltage='DC48V', iface='RS-485（Modbus RTU）／CANopen',
              baud_list='9600 〜 230400 bps', baud_default='115200 bps', timeout='0.8 s',
              timeout_action='パラメータ P-210 で選択（既定: 惰性停止）', nodes='最大 63 台', term='内蔵（パラメータ P-205 で有効化）',
              reg_offset='0x2000 起点', parity='偶数パリティ'),
}
MODEL_SERIES = {m: k for k, s in SERIES.items() for m in s['models']}

MODELS = {
    'MDA-120': dict(power='120 W', current='6.0 A', temp='0〜+50 ℃', ip='IP20', conn='CN-2P-H（2極・ハウジングロック）', fw='Ver.1.8'),
    'MDA-200': dict(power='200 W', current='9.0 A', temp='0〜+50 ℃', ip='IP20', conn='CN-4P-L（4極・ロックアーム付）', fw='Ver.2.3'),
    'MDB-300': dict(power='300 W', current='7.5 A', temp='0〜+55 ℃', ip='IP54', conn='CN-4P-L（4極・ロックアーム付）', fw='Ver.3.0'),
    'MDB-310': dict(power='310 W', current='7.8 A', temp='-10〜+55 ℃', ip='IP54', conn='CN-6P-W（6極・防水）', fw='Ver.3.2'),
    'MDC-500': dict(power='500 W', current='12.0 A', temp='-10〜+60 ℃', ip='IP65', conn='CN-6P-W（6極・防水）', fw='Ver.4.1'),
}

def rng(seed):
    return random.Random(seed)
