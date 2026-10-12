"""검증용: 정답·해설 없이 문제만 텍스트로 출력."""
import json, re, sys, os
import render
from lib import *
P = load_passages(); rs = json.load(open("resolved.json", encoding="utf-8"))
D = "/tmp/claude-0/-home-user-hyper-student-care/70a8927f-e259-5866-bfd9-99c80bd4226f/scratchpad/verify"
os.makedirs(D, exist_ok=True)
def plain(h):
    h = re.sub(r"<span class='blank ab'>\((.)\)</span>", r"(\1)____", h)
    h = h.replace("<span class='blank'></span>", "________")
    h = re.sub(r"<span class='mk'>(.)</span><u>(.*?)</u>", r"\1[\2]", h)
    h = re.sub(r"<u>(.*?)</u>", r"[\1]", h)
    h = re.sub(r"<b>(.*?)</b>", r"\1", h)
    h = re.sub(r"</?(div|p|span)[^>]*>", "\n", h)
    h = re.sub(r"<[^>]+>", "", h)
    import html
    return re.sub(r"\n\s*\n+", "\n", html.unescape(h)).strip()
for rd in (1,2,3):
    pages, nums = render.build_round(rd, rs, P)
    out = []
    for r in sorted([x for x in rs if x["round"] == rd], key=lambda x: nums[x["id"]]):
        base = P[r["passage"]]
        n = nums[r["id"]]
        src = next(x for x in rs if x["id"] == r["shared_with"]) if r.get("shared_with") else r
        pb, pt = render.passage_html(src, base)
        s = f"=== 문제 {n} ===\n{render.stem_text(r)}\n{plain(pb)}\n"
        if r["type"] == "요약": s += "[요약문] " + plain(render.fmt(r["summary"])) + "\n"
        if r["type"] in ("연결사","요약"):
            s += "\n".join(f"{CIRC[i]} (A) {a} / (B) {b}" for i,(a,b) in enumerate(r["shown"]))
        elif r["type"] in SHUFFLE_TYPES:
            s += "\n".join(f"{CIRC[i]} {o}" for i,o in enumerate(r["shown"]))
        elif r["type"] == "순서":
            s += "\n".join(f"{CIRC[i]} {o}" for i,o in enumerate(ORDER_OPTS))
        elif r["type"] == "삽입":
            s += "보기: ①~⑤ (지문 속 ( ① )~( ⑤ ) 위치)"
        else:
            s += "보기: 밑줄 ①~⑤ 중 선택"
        out.append(s + "\n")
    open(f"{D}/round{rd}_questions.txt","w",encoding="utf-8").write("\n".join(out))
print(D)
