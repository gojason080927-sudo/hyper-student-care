# -*- coding: utf-8 -*-
"""2학기 중간고사 실전 모의고사 3·4회 — build.py(1·2회용)의 조립 함수를 그대로 쓰고, 1~4회 전체 중복 대조를 더한다.
사용법:  py build34.py check | verify | pdf      (1·2회 JSON·PDF는 읽기만 한다)"""
import json, os, re, sys
from collections import Counter
from itertools import combinations
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build as B

NEW = (3, 4)
NEED_MOD = {3: 10, 4: 15}
POS_OPS = ('mark', 'ul', 'ko', 'blank', 'ab')

def round_ok(rd, d):
    B.computed_answers(d)
    for s_ in d['sets']: B.structure(d, s_)
    objs = [q for s_ in d['sets'] for q in s_['qs']]
    subj = [q for s_ in d['sets'] for q in s_.get('subj', [])]
    tc = Counter(q['type'] for q in objs)
    per = Counter(s_['passage'] for s_ in d['sets'] for _ in s_['qs'] + s_.get('subj', []))
    dist = Counter(q['answer'] for q in objs)
    for s_ in d['sets']:
        for q in s_['qs']:
            if 'options' in q: assert len(q['options']) == 5
            if 'pairs' in q: assert len(q['pairs']) == 5
    for pid, m in d['mods'].items():
        for i, t in m.items(): assert t != B.P[pid]['sentences'][int(i)], f'{rd}회 {pid} {i} 변형이 원문과 같음'
    good = (tc == Counter(B.NEED) and len(subj) == 4 and len({q['type'] for q in subj}) == 4
            and max(per.values()) <= 2 and len(d['mods']) == NEED_MOD[rd])
    print(f'[{rd}회] 객관식 {len(objs)} / 서술형 {len(subj)} ({", ".join(q["type"] for q in subj)}) — 유형 개수 {"일치" if tc == Counter(B.NEED) else "불일치 " + str(tc - Counter(B.NEED)) + str(Counter(B.NEED) - tc)}')
    print(f'   지문별 최대 {max(per.values())}문항, 사용 지문 {len(per)}개 / 변형 지문 {len(d["mods"])}개: {", ".join(d["mods"])}')
    print('   정답 분포: ' + ', '.join(f'{B.C[k-1]} {dist[k]}' for k in range(1, 6)))
    return good

def info(d):
    out = {}
    for s_ in d['sets']:
        pid = s_['passage']
        e = out.setdefault(pid, {'types': set(), 'opts': set(), 'pos': [], 'struct': set()})
        for q in s_['qs'] + s_.get('subj', []):
            e['types'].add(q['type'])
            for o in q.get('options', []) + [' / '.join(p) for p in q.get('pairs', [])]: e['opts'].add(o.lower())
            for f in ('summary', 'model', 'prompt'):
                if q.get(f): e['opts'].add(q[f].lower())
        for op in s_['ops']:
            if op['op'] in POS_OPS: e['pos'].append((op['s'], op['t']))
            if op['op'] == 'insert': e['struct'].add(('구조', op['given']))
            if op['op'] == 'order':
                for k in 'ABC': e['struct'].add(('구조', op[k][0]))
            if op['op'] == 'irrelevant': e['opts'].add(op['text'].lower())
    return out

def overlap(t1, t2):
    a, b = t1.lower(), t2.lower()
    has = lambda x, y: re.search(r'(?<![a-z])' + re.escape(x) + r'(?![a-z])', y) is not None
    return has(a, b) or has(b, a)

def all_options(d):
    return {o.lower(): (d['round'], s_['passage']) for s_ in d['sets'] for q in s_['qs'] for o in q.get('options', [])}

def check():
    R = {rd: B.load(rd) for rd in (1, 2, 3, 4)}
    ok = all([round_ok(rd, R[rd]) for rd in NEW])
    issues = []
    I = {rd: info(R[rd]) for rd in R}
    for r1, r2 in combinations(R, 2):
        a, b = I[r1], I[r2]
        for pid in set(a) & set(b):
            tag = f'{r1}회↔{r2}회 {pid}번'
            same = a[pid]['types'] & b[pid]['types']
            if same: issues.append(f'{tag}: 같은 유형 {sorted(same)}')
            same = a[pid]['opts'] & b[pid]['opts']
            if same: issues.append(f'{tag}: 같은 보기·답·요약문 {sorted(same)[:2]}')
            for (s1, t1) in a[pid]['pos']:
                for (s2, t2) in b[pid]['pos']:
                    if s1 == s2 and overlap(t1, t2): issues.append(f'{tag}: {s1+1}번째 문장 같은 위치 "{t1}" / "{t2}"')
            same = a[pid]['struct'] & b[pid]['struct']
            if same: issues.append(f'{tag}: 삽입 문장·순서 단락 경계가 같음 {sorted(same)}')
            m1, m2 = R[r1]['mods'].get(pid, {}), R[r2]['mods'].get(pid, {})
            for i in set(m1) & set(m2):
                if m1[i] == m2[i]: issues.append(f'{tag} {int(i)+1}번째 문장: 변형 문장이 같음')
        # 제목·주제·요지 등 보기 문장은 지문이 달라도 회차 간 재사용 금지
        oa, ob = all_options(R[r1]), all_options(R[r2])
        for o in set(oa) & set(ob): issues.append(f'{r1}회↔{r2}회: 같은 보기 문장 "{o[:50]}"')
    print(f'[1~4회 대조] 회차 쌍 6개, 공통 지문 전부 대조 — ' + ('중복 없음' if not issues else f'중복 {len(issues)}건'))
    for x in issues: print('   -', x)
    return ok and not issues

def verify_dump():
    for rd in NEW:
        d = B.load(rd); nums, subj = B.number(d); out = []
        for k, s_ in enumerate(d['sets']):
            st, _ = B.structure(d, s_)
            out.append('=' * 70)
            if len(s_['qs']) > 1: out.append(f'[{nums[k][0]}~{nums[k][-1]}] 다음 글을 읽고, 물음에 답하시오.')
            if st[0] == 'plain': out += [B.plain(p) for p in st[1]]
            elif st[0] == 'insert': out += ['[주어진 문장] ' + B.plain(st[1]), B.plain(st[2])]
            else: out += ['[주어진 글] ' + B.plain(st[1])] + [f'({x}) ' + B.plain(st[2][x]) for x in 'ABC']
            for q, n in zip(s_['qs'], nums[k]):
                out.append(f'\n{n}. ' + B.plain(B.stem(q, s_, len(s_['qs']) > 1)))
                if q.get('summary'): out.append('   [요약] ' + B.plain(q['summary']))
                if 'options' in q: out += [f'   {B.C[i]} {o}' for i, o in enumerate(q['options'])]
                elif 'pairs' in q: out += [f'   {B.C[i]} {x} … {y}' for i, (x, y) in enumerate(q['pairs'])]
                elif q['type'] == '순서': out.append('   ' + '  '.join(f'{B.C[i]} {o}' for i, o in enumerate(B.ORDER_OPTS)))
        for m, k, q, ref in subj:
            out.append(f'\n서술형 {m}. ' + B.plain(q['stem'].replace('{ref}', ref).replace('<br>', '\n   ')))
            for f in ('prompt', 'bogi', 'cond', 'summary'):
                if q.get(f): out.append(f'   {f}: ' + (B.plain(q[f]) if isinstance(q[f], str) else ' / '.join(q[f])))
        p = os.path.join(B.HERE, f'verify_r{rd}.txt')
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
        for rd in NEW:
            d = B.load(rd)
            base = f'2025_고1_9월_2학기중간_실전모의고사_{rd}회'
            B.write(base + '_문제지', B.question_items(d), f'{B.TITLE} {rd}회', f'{rd}회 · 객관식 23문항 · 서술형 4문항', B.SCHOOL,
                    forbid=('정답 및 해설', '모범답안', '해설'))
            B.write(base + '_정답지', B.answer_items(d), f'{B.TITLE} {rd}회 정답지', f'{rd}회 정답 및 해설 · {B.SCHOOL}', '정답')

if __name__ == '__main__':
    main()
