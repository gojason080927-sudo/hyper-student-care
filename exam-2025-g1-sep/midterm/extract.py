# 추출: 입력/2025_고1_9월.hwp 에서 뽑은 지문(작업/2025고1_9월_지문.json, hwp_추출.py 결과)을 문장 단위로 나눠 저장
import json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
W = os.environ['WT']
H = json.load(open(r'C:\Users\관리자\Desktop\CLAUDE변형\작업\2025고1_9월_지문.json', encoding='utf-8'))
OLD = json.load(open(os.path.join(W, 'work', 'passages.json'), encoding='utf-8'))
IDS = ["20","21","22","23","24","29","30","31","32","33","34","35","36","37","38","39","40","41-42"]
SPLIT = re.compile(r'(?<=[.?!”"])\s+(?=[A-Z“‘"(])')
out = {}
for pid in IDS:
    k = pid.replace('-', '~')
    d = H[k]
    paras = [SPLIT.split(p.strip()) for p in d['paragraphs']]
    sents, breaks = [], []
    for p in paras:
        if sents: breaks.append(len(sents))
        sents += p
    assert ' '.join(sents) == ' '.join(x.strip() for x in d['paragraphs']), pid
    out[pid] = dict(id=pid, sentences=sents, breaks=breaks, foot=d.get('foot', ''))
    old = ' '.join(OLD[pid]['sentences']) if pid in OLD else ''
    same = old.replace(' ― ', '—') == ' '.join(sents)
    print(f'== {pid} ({len(sents)}문장) passages.json과 {"동일" if same else "다름"}  foot: {out[pid]["foot"]}')
    for i, s in enumerate(sents): print(f'  [{i}] {s}')
json.dump(out, open(os.path.join(W, 'midterm', 'passages_hwp.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
