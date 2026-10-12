"""3회 전체 중복 대조: 같은 지문 6문항끼리 유형/보기/변형문장/밑줄·빈칸 위치/해설 근거가 겹치는지 검사."""
import json, re, itertools, difflib, sys
from lib import *

def toks(s): return re.findall(r"[a-z’']+", s.lower())
def ngrams(s, n=3):
    t = toks(s); return {tuple(t[i:i+n]) for i in range(len(t)-n+1)}

def opts_of(r):
    if r["type"] in ("연결사","요약"): return [" / ".join(p) for p in r["pairs"]]
    return r.get("options", [])

def marked_idx(r, mods):
    return {int(k) for k,v in mods.items() if MK.search(v) or "{BLANK}" in v or "{A}" in v or "{B}" in v}

def main():
    rs = json.load(open("resolved.json", encoding="utf-8"))
    P = load_passages()
    by = {}
    for r in rs: by.setdefault(r["passage"], []).append(r)
    problems = []; pairs = 0
    for pid, qs in by.items():
        if len(qs) != 6: problems.append(f"[{pid}] 문항 수 {len(qs)}")
        types = [q["type"] for q in qs]
        if len(set(types)) < 6 and pid != "41-42": problems.append(f"[{pid}] 유형 중복: {types}")
        if pid == "41-42" and len(set(types)) < 6: problems.append(f"[{pid}] 유형 중복: {types}")
        for a, b in itertools.combinations(qs, 2):
            pairs += 1
            tag = f"[{pid}] {a['id']} vs {b['id']}"
            if a["type"] == b["type"]: problems.append(f"{tag}: 같은 유형 {a['type']}")
            oa, ob = opts_of(a), opts_of(b)
            sa = set(x.lower().strip() for x in oa); sb = set(x.lower().strip() for x in ob)
            if sa & sb: problems.append(f"{tag}: 같은 보기 {sa & sb}")
            for x in oa:
                for y in ob:
                    if x and y and difflib.SequenceMatcher(None, x.lower(), y.lower()).ratio() > 0.85 and len(x) > 15:
                        problems.append(f"{tag}: 거의 같은 보기 '{x}' ~ '{y}'")
            ma = (SHARED_MODS(a, rs)); mb = SHARED_MODS(b, rs)
            for k in set(ma) & set(mb):
                if strip_markup(ma[k]) == strip_markup(mb[k]) and (a.get("para") and k in map(str, a["para"])) and (b.get("para") and k in map(str, b["para"])):
                    problems.append(f"{tag}: 변형 문장 {k}번이 동일")
                elif difflib.SequenceMatcher(None, strip_markup(ma[k]), strip_markup(mb[k])).ratio() > 0.9 and k in map(str, a.get("para", [])) and k in map(str, b.get("para", [])):
                    problems.append(f"{tag}: 변형 문장 {k}번이 거의 동일")
            ia, ib = marked_idx(a, ma), marked_idx(b, mb)
            if a["type"] in ("어법","어휘","빈칸","연결사","지칭") and b["type"] in ("어법","어휘","빈칸","연결사","지칭"):
                if ia and ia == ib: problems.append(f"{tag}: 밑줄/빈칸 문장 위치 동일 {ia}")
            if a.get("explain") and b.get("explain") and difflib.SequenceMatcher(None, a["explain"], b["explain"]).ratio() > 0.8:
                problems.append(f"{tag}: 해설(정답 근거)이 거의 동일")
            if a["type"] == "요약" and b["type"] == "요약": problems.append(f"{tag}: 요약 중복")
    # 전체(지문 간) 보기 중복
    allopts = {}
    for r in rs:
        for o in opts_of(r):
            allopts.setdefault(o.lower().strip(), []).append(r["id"])
    for o, ids in allopts.items():
        if len(set(i.split("-r")[0] for i in ids)) < len(ids) and len(o) > 12:
            problems.append(f"같은 보기 재사용 '{o}': {ids}")
    print(f"대조 문항쌍 {pairs}쌍(지문 {len(by)}개 × 15쌍), 문항 {len(rs)}개")
    print("중복/겹침 발견:", len(problems))
    for p in problems: print(" -", p)
    return problems

def SHARED_MODS(r, rs):
    if r.get("shared_with"):
        r = next(x for x in rs if x["id"] == r["shared_with"])
    return r.get("mods", {})

if __name__ == "__main__":
    main()
