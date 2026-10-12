"""작업 JSON(q/*.json) -> 해석된 문항(정답 배치, 형식 검증). 결과: resolved.json"""
import json, random, sys, re
from lib import *

def validate_and_resolve(q, P):
    t = q["type"]; errs = []
    assert t in ALL_TYPES, f"{q['id']}: 알 수 없는 유형 {t}"
    base = P[q["passage"]]
    n = len(base["sentences"])
    sents = sentence_list(q, P)
    texts = [s for _, s in sents]
    joined = " ".join(texts)
    r = dict(q)
    r["sents"] = sents
    if t in ("제목","주제","요지","빈칸","지칭"):
        if len(q["options"]) != 5: errs.append("보기 5개 아님")
    if t in ("연결사","요약"):
        if len(q["pairs"]) != 5: errs.append("쌍 5개 아님")
    if t in ("어법","어휘"):
        ms = [int(m.group(1)) for m in MK.finditer(joined)]
        if ms != [1,2,3,4,5]: errs.append(f"밑줄 표시가 1~5 순서가 아님: {ms}")
        if q["answer"] not in (1,2,3,4,5): errs.append("answer 오류")
        r["answer_pos"] = q["answer"]
    if t == "지칭":
        ms = [m.group(2) for m in MK.finditer(joined)]
        if len(ms) != 1: errs.append("지칭은 밑줄 1개")
        else: r["ref_word"] = ms[0]
    if t == "빈칸" and joined.count("{BLANK}") != 1: errs.append("{BLANK} 1개 필요")
    if t in ("연결사","요약"):
        if t == "연결사" and not ("{A}" in joined and "{B}" in joined): errs.append("{A},{B} 필요")
        if t == "요약":
            if not ("{A}" in q["summary"] and "{B}" in q["summary"]): errs.append("summary에 {A},{B} 필요")
    if t == "순서":
        segs = q["segs"]; lab = q["labels"]
        if sorted(lab) != ["A","B","C"] or lab == ["A","B","C"]: errs.append("labels 오류")
        allidx = list(q["given"]) + [i for s in segs for i in s]
        remain = [i for i,_ in sents]
        if allidx != remain: errs.append(f"순서 구성 문장이 지문과 다름: {allidx} vs {remain}")
        ans = " - ".join(f"({x})" for x in lab)
        if ans not in ORDER_OPTS: errs.append("정답 순서가 보기에 없음")
        else: r["answer_pos"] = ORDER_OPTS.index(ans) + 1
    if t == "삽입":
        ins = q["ins"]
        gaps = sorted(q["gaps"])
        if len(gaps) != 5 or (ins+1) not in gaps: errs.append("gaps 5개이고 ins+1 포함 필요")
        if ins in gaps: errs.append("gaps에 ins 포함 금지")
        r["answer_pos"] = gaps.index(ins+1) + 1
        r["gaps"] = gaps
    srcq = SHARED[q["shared_with"]] if q.get("shared_with") else q
    for i in q.get("para", []):
        if str(i) not in srcq.get("mods", {}): errs.append(f"para {i}가 mods에 없음")
        elif strip_markup(srcq["mods"][str(i)]) == base["sentences"][i]: errs.append(f"para {i}가 원문과 동일")
    if errs:
        raise ValueError(f"{q['id']}: " + "; ".join(errs))
    return r

def assign(rs, seed=7):
    """회차별 정답 번호 분산: 고정 유형의 정답을 먼저 세고, 보기 섞기 가능 유형에 부족한 번호를 배정."""
    rng = random.Random(seed)
    for rd in (1,2,3):
        grp = [r for r in rs if r["round"] == rd]
        total = len(grp)
        target = [total // 5 + (1 if i < total % 5 else 0) for i in range(5)]
        cnt = [0]*5
        for r in grp:
            if r["type"] in FIXED_TYPES:
                cnt[r["answer_pos"]-1] += 1
        free = [r for r in grp if r["type"] in SHUFFLE_TYPES]
        rng.shuffle(free)
        need = []
        for i in range(5):
            need += [i+1] * max(0, target[i]-cnt[i])
        # 고정 유형이 쏠려 need가 모자라면 남는 번호로 채움
        k = 0
        while len(need) < len(free):
            need.append(rng.choice([1,2,3,4,5]))
        rng.shuffle(need)
        for r, pos in zip(free, need):
            opts = r["options"] if "options" in r else r["pairs"]
            correct, wrongs = opts[0], list(opts[1:])
            rng.shuffle(wrongs)
            wrongs.insert(pos-1, correct)
            r["shown"] = wrongs
            r["answer_pos"] = pos

def main():
    P = load_passages()
    qs = load_questions()
    if len(sys.argv) > 2 and sys.argv[1] == "--check":
        qs_all = qs; register_shared(qs_all)
        mine = json.load(open(sys.argv[2], encoding="utf-8"))
        register_shared(mine)
        for q in mine: validate_and_resolve(q, P)
        print("OK", len(mine), "문항 형식 통과"); return
    register_shared(qs)
    register_shared(qs)
    rs = [validate_and_resolve(q, P) for q in qs]
    assign(rs)
    json.dump(rs, open("resolved.json","w"), ensure_ascii=False, indent=1)
    from collections import Counter
    for rd in (1,2,3):
        c = Counter(r["answer_pos"] for r in rs if r["round"]==rd)
        print("회차",rd,"문항",sum(c.values()),"정답분포",[c[i] for i in range(1,6)])

if __name__ == "__main__":
    main()
