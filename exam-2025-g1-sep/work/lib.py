import json, re, glob, html, os
HERE = os.path.dirname(os.path.abspath(__file__))
CIRC = "①②③④⑤"
ORDER_OPTS = ["(A) - (C) - (B)", "(B) - (A) - (C)", "(B) - (C) - (A)", "(C) - (A) - (B)", "(C) - (B) - (A)"]
SHUFFLE_TYPES = {"제목","주제","요지","빈칸","연결사","요약","지칭"}
FIXED_TYPES = {"어법","어휘","순서","삽입"}
ALL_TYPES = SHUFFLE_TYPES | FIXED_TYPES
STEM = {
 "제목": "다음 글의 제목으로 가장 적절한 것은?",
 "주제": "다음 글의 주제로 가장 적절한 것은?",
 "요지": "다음 글의 요지로 가장 적절한 것은?",
 "어법": "다음 글의 밑줄 친 부분 중, 어법상 틀린 것은?",
 "어휘": "다음 글의 밑줄 친 부분 중, 문맥상 낱말의 쓰임이 적절하지 않은 것은?",
 "빈칸": "다음 빈칸에 들어갈 말로 가장 적절한 것은?",
 "순서": "주어진 글 다음에 이어질 글의 순서로 가장 적절한 것은?",
 "삽입": "글의 흐름으로 보아, 주어진 문장이 들어가기에 가장 적절한 곳은?",
 "요약": "다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?",
 "연결사": "다음 글의 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?",
 "지칭": None,  # 밑줄 단어에 따라 생성
}
MK = re.compile(r"\{(\d)\|([^}]*)\}")

def load_passages():
    return json.load(open(os.path.join(HERE, "passages.json"), encoding="utf-8"))

def load_questions():
    qs = []
    for f in sorted(glob.glob(os.path.join(HERE, "q", "p*.json"))):
        qs += json.load(open(f, encoding="utf-8"))
    return qs

def strip_markup(t):
    t = MK.sub(lambda m: m.group(2), t)
    return t.replace("{BLANK}", "____").replace("{A}", "(A)").replace("{B}", "(B)")

def sentence_list(q, P):
    """변형 적용 후 (원문 인덱스, 텍스트) 목록. 삭제 문장 제외."""
    base = P[q["passage"]]
    src = q
    if q.get("shared_with"):
        src = SHARED[q["shared_with"]]
    mods = {int(k): v for k, v in src.get("mods", {}).items()}
    dels = set(src.get("del", []))
    out = []
    for i, s in enumerate(base["sentences"]):
        if i in dels:
            continue
        out.append((i, mods.get(i, s)))
    return out

SHARED = {}
def register_shared(qs):
    for q in qs:
        SHARED[q["id"]] = q
