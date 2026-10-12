import json, re, sys, render
from lib import *
rd = int(sys.argv[1]); txt = sys.argv[2]
P = load_passages(); rs = json.load(open("resolved.json", encoding="utf-8"))
_, nums = render.build_round(rd, rs, P)
solved = {int(a): CIRC.index(b)+1 for a, b in re.findall(r"(\d+):\s*([①-⑤])", txt)}
diff = []
for r in rs:
    if r["round"] != rd: continue
    n = nums[r["id"]]
    if solved.get(n) != r["answer_pos"]:
        diff.append((n, r["id"], r["type"], "정답지 " + CIRC[r["answer_pos"]-1], "풀이 " + (CIRC[solved[n]-1] if n in solved else "없음")))
print(rd, "회 풀이", len(solved), "개, 불일치", len(diff))
for d in diff: print(d)
