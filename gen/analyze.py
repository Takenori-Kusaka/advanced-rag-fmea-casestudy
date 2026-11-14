# -*- coding: utf-8 -*-
import json, sys, collections
k = sys.argv[1] if len(sys.argv) > 1 else '5'
R = json.load(open(str(__import__('pathlib').Path(__file__).resolve().parents[1] / 'results' / f'results_k{k}.json'), encoding='utf-8'))
cats = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8']
print('config'.ljust(36), ' '.join(c.rjust(5) for c in cats), ' ALL')
for name, rows in R.items():
    by = collections.defaultdict(list)
    for r in rows: by[r['cat']].append(r['ok'])
    print(name[:34].ljust(36), ' '.join(f'{sum(by[c])}/{len(by[c])}'.rjust(5) for c in cats), f"{sum(r['ok'] for r in rows)}/{len(rows)}")
names = list(R)
print('\n-- per-question answerable (1/0) --')
ids = [r['id'] for r in R[names[0]]]
for i, q in enumerate(ids):
    print(q.ljust(6), ''.join('o' if R[n][i]['ok'] else ('-' if R[n][i]['score'] == 0 else '~') for n in names))
print('\n-- C6 vs C7 changes --')
a, b = R[names[-2]], R[names[-1]]
for x, y in zip(a, b):
    if x['ok'] != y['ok']: print(x['id'], 'C6', x['ok'], x['docs'], '| C7', y['ok'], y['docs'])
print('\n-- C0 chosen files --')
for r in R[names[0]]: print(r['id'], r['ok'], r['files'], r.get('chars'))
print('\n-- C6 failures --')
for r in R[names[-2]]:
    if not r['ok']: print(r['id'], r['hit'], r['docs'])
