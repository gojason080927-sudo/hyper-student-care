"""resolved.json -> HTML -> PDF (문제지 3 + 정답지 3). Chrome headless 사용."""
import json, html, re, os, subprocess, sys
from lib import *

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
SCRATCH = "/tmp/claude-0/-home-user-hyper-student-care/70a8927f-e259-5866-bfd9-99c80bd4226f/scratchpad/build"
OUT = os.path.join(os.path.dirname(HERE), "결과")
BOOK = "2025 고1 9월 파이널 모의고사 {r}회"

CSS = """
:root{--font-sans:"Noto Sans CJK KR","Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo","WenQuanYi Zen Hei",sans-serif;
--font-serif:"Noto Serif CJK KR","Noto Serif","DejaVu Serif",Georgia,"WenQuanYi Zen Hei",serif;
--ink:#1a2333;--ink-soft:#4b5563;--ink-faint:#8a94a6;--rule:#c9cfd9;--rule-strong:#9aa3b2;--paper:#fff;
--accent:#2e7d57;--accent-line:#7fbf9b;--band:#dcefe2;--box-bg:#f1f8f3}
*{box-sizing:border-box} html,body{margin:0;padding:0;color:var(--ink);font-family:var(--font-sans);background:#fff}
@page{size:A4;margin:0}
.page{width:210mm;height:297mm;padding:0 14mm 10mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden;position:relative}
.page:last-child{page-break-after:auto}
.band{background:var(--band);margin:0 -14mm 4mm;padding:5mm 14mm 4mm;display:flex;align-items:baseline;justify-content:space-between;border-bottom:1pt solid var(--accent-line)}
.brand{font-weight:800;font-size:12pt;letter-spacing:.06em}.brand small{font-size:7pt;font-weight:600;letter-spacing:.3em;color:var(--accent);margin-left:2mm}
.btitle{font-weight:800;font-size:12.5pt}.bpid{font-size:9pt;font-weight:700;color:var(--accent)}
.slots{flex:1;display:flex;flex-direction:column;min-height:0}
.slot{--fs:10pt;flex:1;min-height:0;overflow:hidden;padding:1mm 0 2mm}
.slot+.slot{border-top:.5pt dashed var(--rule-strong);padding-top:3mm}
.q-head{display:grid;grid-template-columns:9mm 1fr;gap:2mm;align-items:start;margin-bottom:1.8mm}
.q-num{font-size:15pt;font-weight:800;line-height:1.05;color:var(--accent)}
.q-stem{font-size:10.2pt;font-weight:700;line-height:1.5}
.pt{font-size:8pt;font-weight:600;color:var(--ink-soft)}
.passage{font-family:var(--font-serif);font-size:var(--fs);line-height:1.72;border:.6pt solid var(--accent);padding:2.4mm 3.2mm;margin:0 0 2.2mm 0;text-align:justify}
.passage p{margin:0 0 1.6mm}.passage p:last-child{margin-bottom:0}
.given{font-family:var(--font-serif);font-size:var(--fs);line-height:1.7;border:.6pt solid var(--accent);background:var(--box-bg);padding:2mm 3.2mm;margin:0 0 2mm}
.seg{font-family:var(--font-serif);font-size:var(--fs);line-height:1.7;margin:0 0 1.4mm;padding-left:0}
.seg b{font-family:var(--font-sans)}
.gloss{font-size:7.6pt;color:var(--ink-soft);margin:-1mm 0 2mm}
.mk{font-family:var(--font-sans);font-size:8.6pt;margin-right:.3mm}
u{text-underline-offset:1.2pt}
.blank{display:inline-block;min-width:34mm;border-bottom:.7pt solid var(--ink);height:1em;vertical-align:baseline;text-align:center;font-family:var(--font-sans);font-size:8pt;color:var(--ink-soft)}
.blank.ab{min-width:16mm}
.mark{font-family:var(--font-sans);font-size:8.4pt;font-weight:700;color:var(--accent);padding:0 .6mm}
.sumbox{border:.6pt solid var(--accent-line);background:var(--box-bg);padding:2mm 3.2mm;margin:0 0 2mm;font-family:var(--font-serif);font-size:var(--fs);line-height:1.75}
ol.opts{list-style:none;margin:0;padding:0 0 0 7mm;font-size:calc(var(--fs) - .2pt);line-height:1.55}
ol.opts li{margin-bottom:.8mm;text-indent:-4.4mm;padding-left:4.4mm}
.opts.en li{font-family:var(--font-serif)}
table.pairs{border-collapse:collapse;margin:0 0 0 7mm;font-size:calc(var(--fs) - .3pt);font-family:var(--font-serif)}
table.pairs th,table.pairs td{padding:.5mm 6mm .5mm 1mm;text-align:left;font-weight:500}
table.pairs th{font-family:var(--font-sans);font-size:8pt;color:var(--ink-soft);border-bottom:.4pt solid var(--rule)}
.foot{display:flex;justify-content:space-between;font-size:8pt;color:var(--ink-faint);border-top:.6pt solid var(--rule-strong);padding-top:1.5mm;margin-top:1mm}
/* answer sheet */
.arow{display:grid;grid-template-columns:11mm 14mm 1fr;gap:2mm;padding:1.8mm 0;border-bottom:.4pt dotted var(--rule);font-size:8.4pt;line-height:1.5;break-inside:avoid}
.arow .n{font-weight:800;color:var(--accent);font-size:10pt}.arow .a{font-weight:800;font-size:10pt}
.arow .ty{font-size:7.6pt;color:var(--ink-soft);font-weight:600}
.arow .mod{margin-top:.8mm;font-size:7.8pt;color:var(--ink-soft);font-family:var(--font-serif);line-height:1.45}
.arow .mod b{font-family:var(--font-sans);color:var(--accent)}
.atitle{font-size:13pt;font-weight:800;margin:1mm 0 2mm}
"""
JS = """
document.querySelectorAll('.slot').forEach(s=>{let f=10;while(s.scrollHeight>s.clientHeight+1&&f>7.2){f-=0.1;s.style.setProperty('--fs',f+'pt');}});
"""

def esc(t): return html.escape(t, quote=False)

def fmt(text, single=False):
    t = esc(text)
    t = MK.sub(lambda m: (f"<u>{m.group(2)}</u>" if single else f"<span class='mk'>{CIRC[int(m.group(1))-1]}</span><u>{m.group(2)}</u>"), t)
    t = t.replace("{BLANK}", "<span class='blank'></span>")
    t = t.replace("{A}", "<span class='blank ab'>(A)</span>").replace("{B}", "<span class='blank ab'>(B)</span>")
    return t

def gloss_html(base, text):
    low = text.lower(); items = []
    for w, m in base["gloss"]:
        key = w.lower()
        k2 = key[:-1] if len(key) >= 6 else key
        if re.search(r"\b" + re.escape(k2), low): items.append(f"{w}: {m}")
    return ("<div class='gloss'>* " + " &nbsp; ".join(items) + "</div>") if items else ""

def passage_html(r, base):
    t = r["type"]; sents = r["sents"]
    single = (t == "지칭")
    if r.get("shared_with"):
        pass
    if t == "순서":
        d = {i: s for i, s in sents}
        g = " ".join(d[i] for i in r["given"])
        out = f"<div class='given'>{fmt(g)}</div>"
        by = {}
        for seg, lab in zip(r["segs"], r["labels"]):
            by[lab] = " ".join(d[i] for i in seg)
        for lab in "ABC":
            out += f"<div class='seg'><b>({lab})</b> {fmt(by[lab])}</div>"
        return out, " ".join(d.values())
    if t == "삽입":
        ins = r["ins"]; gaps = r["gaps"]
        given = dict(sents)[ins]
        out = f"<div class='given'>{fmt(given)}</div>"
        parts = []
        for i, s in sents:
            if i == ins: continue
            if i in gaps:
                parts.append(f"<span class='mark'>( {CIRC[gaps.index(i)]} )</span>")
            parts.append(fmt(s))
        nn = len(base["sentences"])
        if nn in gaps: parts.append(f"<span class='mark'>( {CIRC[gaps.index(nn)]} )</span>")
        out += "<div class='passage'><p>" + " ".join(parts) + "</p></div>"
        return out, " ".join(s for _, s in sents)
    breaks = set(base.get("breaks", []))
    paras, cur = [], []
    for i, s in sents:
        if i in breaks and cur:
            paras.append(cur); cur = []
        cur.append(fmt(s, single))
    paras.append(cur)
    body = "".join("<p>" + " ".join(p) + "</p>" for p in paras)
    return f"<div class='passage'>{body}</div>", " ".join(s for _, s in sents)

def options_html(r):
    t = r["type"]; pos = r["answer_pos"]
    if t in ("연결사", "요약"):
        rows = "".join(f"<tr><td>{CIRC[i]}</td><td>{esc(a)}</td><td>{esc(b)}</td></tr>" for i, (a, b) in enumerate(r["shown"]))
        return f"<table class='pairs'><tr><th></th><th>(A)</th><th>(B)</th></tr>{rows}</table>"
    if t in SHUFFLE_TYPES:
        opts = r["shown"]; cls = "en" if t != "지칭" else "en"
    elif t == "순서":
        opts = ORDER_OPTS; cls = ""
    elif t == "삽입":
        opts = [f"{CIRC[i]}" for i in range(5)]; cls = ""
        return "<ol class='opts' style='display:flex;gap:6mm;padding-left:7mm'>" + "".join(f"<li style='text-indent:0;padding:0'>{c}</li>" for c in opts) + "</ol>"
    else:
        return ""
    return f"<ol class='opts {cls}'>" + "".join(f"<li>{CIRC[i]} {esc(o)}</li>" for i, o in enumerate(opts)) + "</ol>"

def stem_text(r):
    if r["type"] == "지칭":
        return f"밑줄 친 {r['ref_word']}이(가) 가리키는 것으로 가장 적절한 것은?"
    return STEM[r["type"]]

def question_html(r, num, P, show_passage=True):
    base = P[r["passage"]]
    pbody, ptext = passage_html(r, base)
    score = ""
    head = f"<div class='q-head'><div class='q-num'>{num}</div><div class='q-stem'>{esc(stem_text(r))}</div></div>"
    out = head
    if show_passage: out += pbody + gloss_html(base, ptext)
    if r["type"] == "요약":
        out += f"<div class='sumbox'>{fmt(r['summary'])}</div>"
    out += options_html(r)
    return out

def build_round(rd, rs, P):
    items = sorted([r for r in rs if r["round"] == rd], key=lambda r: (P_ORDER.index(r["passage"]), r["slot"]))
    title = BOOK.format(r=rd)
    pages = []; num = 0
    by_p = {}
    for r in items: by_p.setdefault(r["passage"], []).append(r)
    nums = {}
    for pid in P_ORDER:
        for r in by_p[pid]:
            num += 1; nums[r["id"]] = num
    pno = 0
    for pid in P_ORDER:
        qs = by_p[pid]; pno += 1
        label = {"41-42": "41~42번 지문"}.get(pid, f"{pid}번 지문")
        a, b = nums[qs[0]["id"]], nums[qs[1]["id"]]
        band = f"<div class='band'><div class='brand'>HYPER ENGLISH<small>FINAL</small></div><div class='btitle'>{title}</div><div class='bpid'>{label} · {a}~{b}번</div></div>"
        if pid == "41-42":
            q1, q2 = qs
            src = q1 if not q1.get("shared_with") else q2
            base = P[pid]
            pbody, ptext = passage_html(src, base)
            h1 = f"<div class='q-head'><div class='q-num'>{a}~{b}</div><div class='q-stem'>다음 글을 읽고, 물음에 답하시오.</div></div>"
            body = h1 + pbody + gloss_html(base, ptext)
            for q, nn in ((q1, a), (q2, b)):
                body += f"<div style='margin-top:2.5mm'>" + question_html(q, nn, P, show_passage=False) + "</div>"
            slots = f"<div class='slots'><div class='slot' style='flex:1'>{body}</div></div>"
        else:
            slots = "<div class='slots'>" + "".join(f"<div class='slot'>{question_html(q, nums[q['id']], P)}</div>" for q in qs) + "</div>"
        foot = f"<div class='foot'><span>{title} · 문제지</span><span>{pno} / 18</span></div>"
        pages.append(f"<div class='page'>{band}{slots}{foot}</div>")
    return pages, nums

def answer_pages(rd, rs, P, nums):
    title = BOOK.format(r=rd)
    items = sorted([r for r in rs if r["round"] == rd], key=lambda r: nums[r["id"]])
    rows = []
    for r in items:
        base = P[r["passage"]]
        mods = r.get("mods", {})
        if r.get("shared_with"):
            mods = next(x for x in rs if x["id"] == r["shared_with"]).get("mods", {})
        mod_html = ""
        for i in r.get("para", []):
            k = str(i)
            if k in mods:
                mod_html += f"<div>{r['passage']}번 지문 [{i+1}번째 문장] <b>변형</b> ▸ {esc(strip_markup(mods[k]))}<br><span style='color:var(--ink-faint)'>원문: {esc(base['sentences'][i])}</span></div>"
        if r["type"] == "삽입":
            mod_html += f"<div>주어진 문장: {esc(strip_markup(mods.get(str(r['ins']), base['sentences'][r['ins']])))}</div>"
        mk_sets = ""
        pos = r["answer_pos"]
        rows.append(f"<div class='arow'><div class='n'>{nums[r['id']]}</div><div><div class='a'>{CIRC[pos-1]}</div><div class='ty'>{r['type']}</div></div><div>{esc(r['explain'])}<div class='mod'>{mod_html or '변형 문장: (표시 없음)'}</div></div></div>")
    per = 9
    pages = []
    for k in range(0, len(rows), per):
        chunk = "".join(rows[k:k+per])
        band = f"<div class='band'><div class='brand'>HYPER ENGLISH<small>ANSWER</small></div><div class='btitle'>{title} 정답 및 해설</div><div class='bpid'>{k+1}~{min(k+per,len(rows))}번</div></div>"
        pages.append(f"<div class='page'>{band}<div class='slots' style='display:block'>{chunk}</div><div class='foot'><span>{title} · 정답지</span><span>{k//per+1} / {-(-len(rows)//per)}</span></div></div>")
    return pages

P_ORDER = ["20","21","22","23","24","29","30","31","32","33","34","35","36","37","38","39","40","41-42"]

def to_pdf(pages, name):
    os.makedirs(SCRATCH, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    f = os.path.join(SCRATCH, name + ".html")
    open(f, "w", encoding="utf-8").write(f"<!doctype html><html lang='ko'><head><meta charset='utf-8'><style>{CSS}</style></head><body>{''.join(pages)}<script>{JS}</script></body></html>")
    pdf = os.path.join(OUT, name + ".pdf")
    subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", f"--user-data-dir={SCRATCH}/prof", f"--print-to-pdf={pdf}", "--no-pdf-header-footer", "--virtual-time-budget=3000", "file://" + f], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return pdf

def main(rounds=(1,2,3)):
    P = load_passages(); rs = json.load(open(os.path.join(HERE, "resolved.json"), encoding="utf-8"))
    for rd in rounds:
        pages, nums = build_round(rd, rs, P)
        print(to_pdf(pages, f"2025_고1_9월_파이널_모의고사_{rd}회_문제지"))
        print(to_pdf(answer_pages(rd, rs, P, nums), f"2025_고1_9월_파이널_모의고사_{rd}회_정답지"))

if __name__ == "__main__":
    main()
