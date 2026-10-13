# -*- coding: utf-8 -*-
"""2학기 중간고사 실전 모의고사(경안고 1학년) — round{n}.json → 문제지·정답지 PDF (B4, 2단)
사용법:  py build.py check        (원문 대조·유형 수·정답 분포·회차 중복 대조만)
         py build.py verify       (정답 없이 문제만 텍스트로 출력: verify_r{n}.txt)
         py build.py pdf          (PDF 4개 조립)
공식 템플릿(시험대비_템플릿.html)의 CSS·스크립트(꼬릿말)를 그대로 쓰고, 용지·2단·배너 위치만 이 시험지용으로 정한다."""
import json, os, re, sys, html
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
HERE = os.path.dirname(os.path.abspath(__file__))
EXAM = os.path.dirname(HERE)
SCRIPTS = r'C:\Users\관리자\Desktop\CLAUDE변형\스크립트'
sys.path.insert(0, SCRIPTS)
import 교재_조립 as jc
from pdf_출력 import finalize_pdf

TEMPLATE = os.path.join(EXAM, '시험대비_템플릿.html')   # 저장소에 올려 둔 공식 템플릿
OUT = os.path.join(EXAM, '결과')
C = '①②③④⑤'
ORDER_OPTS = ['(A) - (C) - (B)', '(B) - (A) - (C)', '(B) - (C) - (A)', '(C) - (A) - (B)', '(C) - (B) - (A)']
TITLE = '2학기 중간고사 실전 모의고사'
SCHOOL = '경안고 1학년'
NEED = {'빈칸': 4, '제목': 1, '주제': 1, '요지': 1, '삽입': 2, '순서': 2, '어법': 2, '어휘': 2,
        '일치': 1, '불일치': 1, '연결사': 1, '함축': 1, '지칭': 1, '요약': 2, '무관': 1}
NEED_MOD = {1: 10, 2: 15}
TYPE_KO = {'빈칸': '빈칸 추론', '제목': '글의 제목', '주제': '글의 주제', '요지': '글의 요지', '삽입': '문장 삽입',
           '순서': '글의 순서', '어법': '어법', '어휘': '어휘', '일치': '내용 일치', '불일치': '내용 불일치',
           '연결사': '연결사', '함축': '함축 의미', '지칭': '지칭 추론', '요약': '요약문', '무관': '무관한 문장'}

P = json.load(open(os.path.join(HERE, 'passages_hwp.json'), encoding='utf-8'))
def load(rd): return json.load(open(os.path.join(HERE, f'round{rd}.json'), encoding='utf-8'))

# ---------------- 지문 표시 만들기 ----------------
def find_span(sent, t, n=None):
    pat = (r'(?<![A-Za-z])' if t[0].isalpha() else '') + re.escape(t) + (r'(?![A-Za-z])' if t[-1].isalpha() else '')
    ms = list(re.finditer(pat, sent))
    if n is None:
        assert len(ms) == 1, f'"{t}"가 문장에 {len(ms)}번 나옴: {sent}'
        return ms[0].span()
    assert len(ms) >= n, f'"{t}" {n}번째 없음: {sent}'
    return ms[n - 1].span()

def tag_for(op):
    t = op.get('rep') or op['t']
    k = op['op']
    if k == 'mark':
        return f'[u{op["lab"]}:{t}]' if op['lab'].isdigit() else f'[{op["lab"]}:{t}]'
    if k == 'ul': return f'[ul:{t}]'
    if k == 'ko': return f'<b>({op["lab"]})</b> [ko:{op["ko"]}]'
    if k == 'blank': return f'[blank:{op.get("w", 40)}]' + op.get('after', '')
    if k == 'ab': return f'[{op["lab"]}]'
    raise ValueError(k)

def sentences(rd_data, pid):
    mods = rd_data['mods'].get(pid, {})
    return [mods.get(str(i), s) for i, s in enumerate(P[pid]['sentences'])]

def marked(rd_data, s_):
    """mods 적용 + 단어 단위 표시(mark/ul/ko/blank/ab)를 넣은 문장 목록(표기법 문자열)"""
    pid, ops = s_['passage'], s_['ops']
    sents = sentences(rd_data, pid)
    spans = {}
    for op in ops:
        if op['op'] in ('mark', 'ul', 'ko', 'blank', 'ab'):
            a, b = find_span(sents[op['s']], op['t'], op.get('n'))
            spans.setdefault(op['s'], []).append((a, b, tag_for(op)))
    out = []
    for i, s in enumerate(sents):
        sp = sorted(spans.get(i, []))
        for (a1, b1, _), (a2, b2, _) in zip(sp, sp[1:]):
            assert b1 <= a2, f'{pid} {i}번 문장 표시가 겹침'
        for a, b, tg in reversed(sp):
            s = s[:a] + tg + s[b:]
        out.append(s)
    return out

def structure(rd_data, s_):
    """('plain', [문단...]) / ('insert', 주어진 문장, 본문) / ('order', 주어진 글, {A,B,C}) — 표기법 문자열. 정답도 계산."""
    ms = marked(rd_data, s_)
    pid = s_['passage']
    op = next((o for o in s_['ops'] if o['op'] in ('insert', 'order', 'irrelevant')), None)
    breaks = set(P[pid].get('breaks', []))
    if op is None:
        paras, cur = [], []
        for i, s in enumerate(ms):
            if i in breaks and cur: paras.append(cur); cur = []
            cur.append(s)
        paras.append(cur)
        return ('plain', [' '.join(p) for p in paras]), None
    if op['op'] == 'insert':
        g, gaps = op['given'], op['gaps']
        assert len(gaps) == 5 and g not in gaps
        parts = []
        for i, s in enumerate(ms):
            if i == g: continue
            if i in gaps: parts.append(f'[m{gaps.index(i)+1}]')
            parts.append(s)
        if len(ms) in gaps: parts.append(f'[m{gaps.index(len(ms))+1}]')
        nxt = g + 1                                  # 정답 = 원래 자리(빠진 문장 바로 다음 문장 앞)
        return ('insert', ms[g], ' '.join(parts)), gaps.index(nxt) + 1
    if op['op'] == 'order':
        given = ' '.join(ms[i] for i in op['given'])
        seg = {k: ' '.join(ms[i] for i in op[k]) for k in 'ABC'}
        allidx = op['given'] + op['A'] + op['B'] + op['C']
        assert sorted(allidx) == list(range(len(ms))), f'{pid} 순서 문장 누락'
        seq = ''.join(sorted('ABC', key=lambda k: op[k][0]))
        return ('order', given, seg), ORDER_OPTS.index(' - '.join(f'({k})' for k in seq)) + 1
    if op['op'] == 'irrelevant':
        items = []
        for i, s in enumerate(ms):
            if i == op['before']: items.append(('X', op['text']))
            items.append((i, s))
        nums = op['nums']
        txt = []
        for k, s in items:
            txt.append((f'<span class="cn">{C[nums.index(k)]}</span> ' if k in nums else '') + s)
        return ('plain', [' '.join(txt)]), nums.index('X') + 1

def foot_html(pid, shown_text):
    f = P[pid].get('foot', '').strip()
    if not f: return ''
    items = re.findall(r'(\*+)\s*([^:*]+?):\s*([^*]+)', f)
    low = re.sub(r'\[[^\]:]+:|\]', ' ', shown_text).lower()
    keep = []
    for stars, w, m in items:
        k = w.strip().lower(); k2 = k[:-1] if len(k) >= 6 else k
        if re.search(r'\b' + re.escape(k2), low): keep.append(f'{stars}{w.strip()}: {m.strip()}')
    return f'<div class="foot">{"&nbsp;&nbsp;".join(keep)}</div>' if keep else ''

def display_html(st):
    kind = st[0]
    if kind == 'plain':
        return '<div class="passage">' + ''.join(f'<p>{jc.mk(p)}</p>' for p in st[1]) + '</div>', ' '.join(st[1])
    if kind == 'insert':
        return f'<div class="given">{jc.mk(st[1])}</div><div class="passage"><p>{jc.mk(st[2])}</p></div>', st[1] + ' ' + st[2]
    if kind == 'order':
        h = f'<div class="given">{jc.mk(st[1])}</div>' + ''.join(f'<div class="order-box"><p><span class="tag">({k})</span> {jc.mk(st[2][k])}</p></div>' for k in 'ABC')
        return h, st[1] + ' ' + ' '.join(st[2].values())

# ---------------- 문항 ----------------
def mark_kind(s_):
    labs = [o['lab'] for o in s_['ops'] if o['op'] == 'mark']
    return any(l.isdigit() for l in labs), any(l.isalpha() for l in labs)

def stem(q, s_, group):
    G = '윗글' if group else '다음 글'
    t = q['type']; dig, let = mark_kind(s_)
    if t in ('어법', '어휘'):
        rng = '①~⑤ 중' if (dig and let) else ('부분 중' if dig else '(a)~(e) 중')
        what = '어법상 틀린 것은?' if t == '어법' else '문맥상 낱말의 쓰임이 적절하지 않은 것은?'
        return f'{G}의 밑줄 친 {rng}, {what}'
    return {
        '제목': f'{G}의 제목으로 가장 적절한 것은?', '주제': f'{G}의 주제로 가장 적절한 것은?', '요지': f'{G}의 요지로 가장 적절한 것은?',
        '빈칸': ('윗글의 빈칸에' if group else '다음 빈칸에') + ' 들어갈 말로 가장 적절한 것은?',
        '삽입': '글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?',
        '순서': '주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?',
        '요약': f'{G}의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?',
        '연결사': f'{G}의 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?',
        '함축': f'밑줄 친 <span class="u">{q.get("phrase", "")}</span>가 {G}에서 의미하는 바로 가장 적절한 것은?',
        '지칭': f'{G}의 밑줄 친 (a)~(e) 중에서 가리키는 대상이 나머지 넷과 다른 것은?',
        '무관': f'{G}에서 전체 흐름과 관계 없는 문장은?',
        '일치': f'{G}의 내용과 일치하는 것은?', '불일치': f'{G}의 내용과 일치하지 않는 것은?',
    }[t]

def options_html(q, s_):
    t = q['type']; dig, let = mark_kind(s_)
    if 'pairs' in q:
        rows = ''.join(f'<tr><td>{C[i]} {a}</td><td>……</td><td>{b}</td></tr>' for i, (a, b) in enumerate(q['pairs']))
        return f'<table class="choice-table"><tr><th>(A)</th><th></th><th>(B)</th></tr>{rows}</table>'
    if 'options' in q:
        cls = 'choices' if q.get('lang') == 'ko' else 'choices en'
        return f'<ol class="{cls}">' + ''.join(f'<li>{C[i]} {o}</li>' for i, o in enumerate(q['options'])) + '</ol>'
    if t == '순서':
        return '<ol class="choices row">' + ''.join(f'<li>{C[i]} {o}</li>' for i, o in enumerate(ORDER_OPTS)) + '</ol>'
    if t == '지칭' or (t in ('어법', '어휘') and not dig):
        return '<ol class="choices row">' + ''.join(f'<li>{C[i]} ({x})</li>' for i, x in enumerate('abcde')) + '</ol>'
    return '<ol class="choices row">' + ''.join(f'<li>{c}</li>' for c in C) + '</ol>'

def summary_html(q):
    return f'<div class="sum-arrow">↓</div><div class="summary">{jc.mk(q["summary"])}</div>' if 'summary' in q else ''

def number(rd_data):
    """객관식 번호(세트 순서대로 1~23)와 서술형 번호(서술형 1~4), 세트별 참조 표기"""
    n = 0; nums = []; subj = []
    for k, s_ in enumerate(rd_data['sets']):
        ns = []
        for q in s_['qs']: n += 1; ns.append(n)
        nums.append(ns)
    m = 0
    for k, s_ in enumerate(rd_data['sets']):
        ref = f'{nums[k][0]}번' if len(nums[k]) == 1 else f'{nums[k][0]}~{nums[k][-1]}번'
        for q in s_.get('subj', []):
            m += 1; subj.append((m, k, q, ref))
    return nums, subj

def computed_answers(rd_data):
    """순서·삽입·무관은 표시 구조에서 계산한 정답과 JSON 정답이 같은지 확인"""
    for s_ in rd_data['sets']:
        st, ans = structure(rd_data, s_)
        if ans is not None:
            q = next(q for q in s_['qs'] if q['type'] in ('삽입', '순서', '무관'))
            assert q['answer'] == ans, f'{rd_data["round"]}회 {s_["passage"]} {q["type"]}: JSON {q["answer"]} ≠ 계산 {ans}'

def set_html(rd_data, k, s_, nums):
    st, _ = structure(rd_data, s_)
    disp, plain = display_html(st)
    foot = foot_html(s_['passage'], plain)
    group = len(s_['qs']) > 1
    if not group:
        q = s_['qs'][0]
        return (f'<div class="q"><div class="q-head"><span class="q-no">{nums[k][0]}</span><span class="q-stem">{stem(q, s_, False)}</span></div>'
                f'{disp}{foot}{summary_html(q)}{options_html(q, s_)}</div>')
    h = f'<div class="grp-head">[{nums[k][0]}~{nums[k][-1]}] 다음 글을 읽고, 물음에 답하시오.</div>{disp}{foot}'
    for q, n in zip(s_['qs'], nums[k]):
        h += (f'<div class="q"><div class="q-head"><span class="q-no">{n}</span><span class="q-stem">{stem(q, s_, True)}</span></div>'
              f'{summary_html(q)}{options_html(q, s_)}</div>')
    return h

def subj_html(m, q, ref):
    h = f'<div class="q"><div class="q-head"><span class="q-no">서술형 {m}</span><span class="q-stem">{q["stem"].replace("{ref}", ref)}</span></div>'
    if q.get('prompt'): h += f'<div class="bogi"><span class="bogi-label">우리말</span> {q["prompt"]}</div>'
    if q.get('bogi'): h += '<div class="bogi"><span class="bogi-label">&lt;보기&gt;</span> ' + ' / '.join(q['bogi']) + '</div>'
    if q.get('cond'): h += '<div class="cond"><span class="bogi-label">&lt;조건&gt;</span><ul>' + ''.join(f'<li>{c}</li>' for c in q['cond']) + '</ul></div>'
    if q.get('summary'):
        h += f'<div class="summary">{jc.mk(q["summary"])}</div><div class="fix-row">(A) <span class="fl"></span>&nbsp;&nbsp;(B) <span class="fl"></span></div>'
    elif q.get('fix'):
        h += '<div class="fix">' + ''.join(f'<div class="fix-row">({i+1}) 기호 ____ : <span class="fl"></span> → <span class="fl"></span></div>' for i in range(q['fix'])) + '</div>'
    else:
        h += ''.join('<div class="wline"></div>' for _ in range(q.get('lines', 1) + 1))
    return h + '</div>'

def question_items(rd_data):
    nums, subj = number(rd_data)
    items = [set_html(rd_data, k, s_, nums) for k, s_ in enumerate(rd_data['sets'])]
    for i, (m, k, q, ref) in enumerate(subj):
        head = '<div class="sec-head">서술형</div>' if i == 0 else ''
        items.append(head + subj_html(m, q, ref))
    return items

# ---------------- 정답지 ----------------
def answer_items(rd_data):
    nums, subj = number(rd_data)
    objs = [(n, q, s_) for k, s_ in enumerate(rd_data['sets']) for n, q in zip(nums[k], s_['qs'])]
    mods = rd_data['mods']
    items = []
    for r in range(0, len(objs), 12):
        ch = objs[r:r + 12]
        items.append('<table class="ans-grid"><tr>' + ''.join(f'<th>{n}</th>' for n, _, _ in ch) + '</tr><tr>'
                     + ''.join(f'<td>{C[q["answer"]-1]}</td>' for _, q, _ in ch) + '</tr></table>')
    for n, q, s_ in objs:
        mod = ' <span class="modtag">변형 지문</span>' if s_['passage'] in mods else ''
        items.append(f'<div class="exp"><div class="exp-head">{n}번 · {TYPE_KO[q["type"]]} · {s_["passage"].replace("-", "~")}번 지문{mod} '
                     f'<span class="ans">정답 {C[q["answer"]-1]}</span></div><dl><dt>해설</dt><dd>{q["explain"]}</dd></dl></div>')
    for m, k, q, ref in subj:
        s_ = rd_data['sets'][k]
        items.append(f'<div class="exp"><div class="exp-head">서술형 {m} · {q["type"]} · {s_["passage"].replace("-", "~")}번 지문</div>'
                     f'<dl><dt>모범답안</dt><dd class="model">{q["model"]}</dd><dt>허용답안</dt><dd>{q["allow"]}</dd>'
                     f'<dt>감점 기준</dt><dd>{q["deduct"]}</dd><dt>해설</dt><dd>{q["explain"]}</dd></dl></div>')
    items.append('<div class="sec-head">변형 문장 (원문 → 변형)</div>' + ''.join(
        f'<div class="exp"><div class="exp-head">{pid.replace("-", "~")}번 지문</div>' + ''.join(
            f'<div class="mod"><b>[{int(i)+1}번째 문장]</b> 원문: {P[pid]["sentences"][int(i)]}<br><span class="modnew">변형: {t}</span></div>'
            for i, t in sorted(mods[pid].items(), key=lambda x: int(x[0]))) + '</div>'
        for pid in [s_['passage'] for s_ in rd_data['sets'] if s_['passage'] in mods]))
    return items

# ---------------- 쪽 배치 (B4 · 2단 · 배너는 첫 쪽만) ----------------
PAGE_H = 354.0        # B4 364mm - @page 상하 5mm
FOOT_MM = jc.FOOT_MM  # 꼬릿말 자리(템플릿 .ft-space 13mm)
BAND_MM = jc.BAND_MM  # 배너 16mm + 아래 여백 5mm
COL_W = 114.0         # (237mm - 가운데 여백·구분선 9mm) / 2
GAP = 6.0             # 문항 사이 간격
CSS = f'''
@page {{ size: 257mm 364mm; margin: 5mm 5mm; }}
@media print {{ body {{ padding: 0 5mm; }} }}
.pg {{ height: {PAGE_H}mm; overflow: hidden; break-after: page; }}
.pg:last-child {{ break-after: auto; }}
.pg .band {{ margin-bottom: 5mm; }}
.band-no {{ padding: 0 4mm; }}
.band-no .num {{ font-size: 15pt; white-space: nowrap; }}
.cols {{ display: flex; align-items: flex-start; }}
.col {{ width: {COL_W}mm; flex: none; }}
.col + .col {{ border-left: .8pt solid var(--main); margin-left: 4.5mm; padding-left: 4.5mm; width: {COL_W + 4.5}mm; align-self: stretch; }}
.item {{ margin-bottom: {GAP}mm; }}
.item .q:last-child {{ margin-bottom: 0; }}
.grp-head {{ font-weight: 700; margin-bottom: 1.5mm; }}
.sec-head {{ font-weight: 700; color: var(--main); font-size: 10.5pt; border-left: 3px solid var(--accent); padding-left: 2mm; margin: 0 0 2mm; }}
.choices.row {{ column-gap: 6mm; }}
.fix-row .fl {{ width: 32mm; }}
.ans-grid {{ margin-bottom: 2mm; }}
.ans-grid th, .ans-grid td {{ padding: .8mm .3mm; }}
.exp {{ margin-bottom: 0; font-size: 9.5pt; line-height: 1.5; }}
.exp .modtag {{ font-size: 8pt; color: #fff; background: var(--accent); border-radius: 1mm; padding: 0 1.2mm; font-weight: 700; }}
.mod {{ font-size: 8.8pt; line-height: 1.45; margin-bottom: 1.2mm; }}
.mod .modnew {{ color: var(--main); font-weight: 500; }}
'''

def band_html(sub, right):
    return (f'<div class="band"><div class="band-academy"><span class="hyper">HYPER</span><span class="academy">ACADEMY</span></div>'
            f'<div class="band-title"><div class="book">{TITLE}</div><div class="sub">{sub}</div></div>'
            f'<div class="band-no"><span class="num">{right}</span></div></div>')

def head_html(title):
    tpl = open(TEMPLATE, encoding='utf-8').read()
    head = tpl.split('<body>')[0].replace('</style>', jc.EXTRA_CSS + CSS + '</style>')
    head = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', head)
    script = tpl[tpl.index('<script>'):tpl.index('</script>') + 9]
    return head, script

def measure(head, items):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page()
        pg.set_content(head + '<body></body></html>', wait_until='networkidle')
        pg.emulate_media(media='print')
        hs = pg.evaluate('''async (args) => { const [items, w] = args;
            document.body.innerHTML = items.map(h => `<div class="col" style="width:${w}mm"><div class="item">${h}</div></div>`).join('');
            await document.fonts.ready; document.body.offsetHeight;
            return [...document.querySelectorAll('.item')].map(e => e.getBoundingClientRect().height); }''', [items, COL_W])
        b.close()
    return [h / jc.MM for h in hs]

def paginate(items, hs):
    pages = []; cur = [[], []]; col = 0; used = 0.0
    def cap(): return PAGE_H - FOOT_MM - (BAND_MM if not pages else 0) - 2
    for it, h in zip(items, hs):
        assert h <= cap(), f'한 문항이 한 단보다 김 ({h:.0f}mm)'
        if used + h > cap():
            if col == 0: col = 1
            else: pages.append(cur); cur = [[], []]; col = 0
            used = 0.0
        cur[col].append(it); used += h + GAP
    pages.append(cur)
    return pages

def write(name, items, title, sub, right, forbid=()):
    head, script = head_html(title)
    hs = measure(head, items)
    pages = paginate(items, hs)
    body = []
    for i, (c1, c2) in enumerate(pages):
        band = band_html(sub, right) if i == 0 else ''
        cols = ''.join('<div class="col">' + ''.join(f'<div class="item">{x}</div>' for x in c) + '</div>' for c in (c1, c2))
        body.append(f'<div class="pg">{band}<div class="cols">{cols}</div></div>')
    os.makedirs(OUT, exist_ok=True)
    h = os.path.join(OUT, name + '__작업중.html')
    open(h, 'w', encoding='utf-8').write(head + '<body>\n' + '\n'.join(body) + '\n' + script + '\n</body>\n</html>\n')
    ok, probs, pdf = finalize_pdf(h, os.path.join(OUT, name + '.pdf'), expected_pages=len(pages), forbid=forbid)
    print(f'{name}.pdf  {len(pages)}쪽', '' if ok else probs)

# ---------------- 확인(원문 대조·유형 수·중복) ----------------
def plain(t):
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'\[u(\d):([^\]]*)\]', lambda m: f'{C[int(m.group(1))-1]}<{m.group(2)}>', t)
    t = re.sub(r'\[([a-e]):([^\]]*)\]', r'(\1)<\2>', t)
    t = re.sub(r'\[ul:([^\]]*)\]', r'<<\1>>', t)
    t = re.sub(r'\[ko:([^\]]*)\]', r'<\1>', t)
    t = re.sub(r'\[blank(?::\d+)?\]', '__________', t)
    t = re.sub(r'\[([AB])\]', r'(\1) ______', t)
    t = re.sub(r'\[m(\d)\]', lambda m: f'( {C[int(m.group(1))-1]} )', t)
    return html.unescape(t)

def check():
    R = {rd: load(rd) for rd in (1, 2)}
    ok = True
    for rd, d in R.items():
        computed_answers(d)
        for s_ in d['sets']: structure(d, s_)          # 표시 위치가 모두 원문에서 찾아지는지
        objs = [q for s_ in d['sets'] for q in s_['qs']]
        subj = [q for s_ in d['sets'] for q in s_.get('subj', [])]
        tc = Counter(q['type'] for q in objs)
        per = Counter(s_['passage'] for s_ in d['sets'] for _ in s_['qs'] + s_.get('subj', []))
        dist = Counter(q['answer'] for q in objs)
        good = (tc == Counter(NEED) and len(subj) == 4 and len({q['type'] for q in subj}) == 4
                and max(per.values()) <= 2 and len(d['mods']) == NEED_MOD[rd])
        ok &= good
        print(f'[{rd}회] 객관식 {len(objs)} / 서술형 {len(subj)} ({", ".join(q["type"] for q in subj)}) — 유형 개수 {"일치" if tc == Counter(NEED) else "불일치 " + str(tc)}')
        print(f'   지문별 최대 {max(per.values())}문항, 사용 지문 {len(per)}개 / 변형 지문 {len(d["mods"])}개: {", ".join(d["mods"])}')
        print('   정답 분포: ' + ', '.join(f'{C[k-1]} {dist[k]}' for k in range(1, 6)))
        for s_ in d['sets']:
            for q in s_['qs']:
                if 'options' in q: assert len(q['options']) == 5
                if 'pairs' in q: assert len(q['pairs']) == 5
        # 변형 문장이 원문과 실제로 다른지
        for pid, m in d['mods'].items():
            for i, t in m.items(): assert t != P[pid]['sentences'][int(i)], f'{rd}회 {pid} {i} 변형이 원문과 같음'
    # 회차 간 대조
    print('[회차 대조]')
    issues = []
    def info(d):
        out = {}
        for s_ in d['sets']:
            pid = s_['passage']
            e = out.setdefault(pid, {'types': set(), 'opts': set(), 'pos': set()})
            for q in s_['qs'] + s_.get('subj', []):
                e['types'].add(q['type'])
                for o in q.get('options', []) + [' / '.join(p) for p in q.get('pairs', [])]: e['opts'].add(o.lower())
                if q.get('summary'): e['opts'].add(q['summary'].lower())
                if q.get('model'): e['opts'].add(q['model'].lower())
            for op in s_['ops']:
                if op['op'] in ('mark', 'ul', 'ko', 'blank', 'ab'): e['pos'].add((op['s'], op['t']))
                if op['op'] == 'insert': e['pos'].add(('삽입', op['given']))
                if op['op'] == 'irrelevant': e['pos'].add(('무관', op['text']))
                if op['op'] == 'order': e['pos'].add(('순서', tuple(op['given']), tuple(sorted([tuple(op[k]) for k in 'ABC']))))
        return out
    a, b = info(R[1]), info(R[2])
    both = sorted(set(a) & set(b), key=lambda x: int(x.split('-')[0]))
    for pid in both:
        for key, label in (('types', '같은 유형'), ('opts', '같은 보기·답'), ('pos', '같은 빈칸·밑줄·삽입 위치')):
            same = a[pid][key] & b[pid][key]
            if same: issues.append(f'{pid}번: {label} {sorted(map(str, same))[:3]}')
        m1, m2 = R[1]['mods'].get(pid, {}), R[2]['mods'].get(pid, {})
        for i in set(m1) & set(m2):
            if m1[i] == m2[i]: issues.append(f'{pid}번 {int(i)+1}번째 문장: 두 회차 변형 문장이 같음')
    print(f'   두 회차 공통 지문 {len(both)}개 대조 — ' + ('중복 없음' if not issues else '중복 ' + str(len(issues)) + '건'))
    for x in issues: print('   -', x)
    return ok and not issues

def verify_dump():
    """정답·해설 없이 문제만 텍스트로 (다시 풀기용)"""
    for rd in (1, 2):
        d = load(rd); nums, subj = number(d); out = []
        for k, s_ in enumerate(d['sets']):
            st, _ = structure(d, s_)
            out.append('=' * 70)
            if len(s_['qs']) > 1: out.append(f'[{nums[k][0]}~{nums[k][-1]}] 다음 글을 읽고, 물음에 답하시오.')
            if st[0] == 'plain': out += [plain(p) for p in st[1]]
            elif st[0] == 'insert': out += ['[주어진 문장] ' + plain(st[1]), plain(st[2])]
            else: out += ['[주어진 글] ' + plain(st[1])] + [f'({x}) ' + plain(st[2][x]) for x in 'ABC']
            for q, n in zip(s_['qs'], nums[k]):
                out.append(f'\n{n}. ' + plain(stem(q, s_, len(s_['qs']) > 1)))
                if q.get('summary'): out.append('   [요약] ' + plain(q['summary']))
                if 'options' in q: out += [f'   {C[i]} {o}' for i, o in enumerate(q['options'])]
                elif 'pairs' in q: out += [f'   {C[i]} {x} … {y}' for i, (x, y) in enumerate(q['pairs'])]
                elif q['type'] == '순서': out.append('   ' + '  '.join(f'{C[i]} {o}' for i, o in enumerate(ORDER_OPTS)))
        for m, k, q, ref in subj:
            out.append(f'\n서술형 {m}. ' + q['stem'].replace('{ref}', ref))
            for f in ('prompt', 'bogi', 'cond', 'summary'):
                if q.get(f): out.append(f'   {f}: ' + (plain(q[f]) if isinstance(q[f], str) else ' / '.join(q[f])))
        p = os.path.join(HERE, f'verify_r{rd}.txt')
        open(p, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
        print(p)

def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    if cmd == 'check':
        print('결과:', '통과' if check() else '문제 있음')
    elif cmd == 'verify':
        verify_dump()
    elif cmd == 'pdf':
        assert check(), '확인 단계 실패'
        for rd in (1, 2):
            d = load(rd)
            base = f'2025_고1_9월_2학기중간_실전모의고사_{rd}회'
            write(base + '_문제지', question_items(d), f'{TITLE} {rd}회', f'{rd}회 · 객관식 23문항 · 서술형 4문항', SCHOOL,
                  forbid=('정답 및 해설', '모범답안', '해설'))
            write(base + '_정답지', answer_items(d), f'{TITLE} {rd}회 정답지', f'{rd}회 정답 및 해설 · {SCHOOL}', '정답')

if __name__ == '__main__':
    main()
