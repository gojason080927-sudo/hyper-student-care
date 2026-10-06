# -*- coding: utf-8 -*-
"""HYPER ACADEMY 수학 월말평가 결과 보고서 시안 (A4 2쪽) — 학부모 앱 퍼플 테마, 예시 데이터"""
import math, os

P = '#5B348A'; PD = '#3D2463'; PG = '#7A4AAD'; INK = '#161B3A'; INK2 = '#4A4458'; MUTED = '#6B6574'
LAV = '#F3EEF8'; LAV2 = '#E7DCF3'; SURF = '#F8F5FB'; LINE = '#ECE6F2'; AVG = '#A79FB3'
GOOD = '#16A34A'; GOODBG = '#EAF7EF'; WARN = '#B45309'; WARNBG = '#FFF4E5'; BAD = '#DC2626'; BADBG = '#FDECEC'

months = ['5월', '6월', '7월', '8월', '9월', '10월']
me = [62, 66, 65, 68, 70, 72]; avg = [66, 67, 66, 68, 68, 69]
# 단원, 문항 범위, 맞힌 수, 반 평균 정답률
units = [('다항식의 연산', (1, 5), 5, 92), ('나머지정리', (6, 10), 4, 78), ('인수분해', (11, 15), 4, 74),
         ('복소수', (16, 20), 3, 58), ('이차방정식', (21, 25), 2, 61)]
diff = [('기본', 6, 6, 95), ('중', 7, 6, 78), ('상', 6, 4, 55), ('최상', 6, 2, 25)]
wrong_q = {9, 14, 17, 20, 22, 24, 25}
qdiff = ['기본'] * 6 + ['중'] * 7 + ['상'] * 6 + ['최상'] * 6
causes = [('계산 실수', 3, P), ('개념 이해 부족', 2, '#B794E0'), ('문제 해석', 1, '#E0A43A'), ('시간 부족', 1, AVG)]


def trend_svg(w=330, h=205):
    l, r, t, b = 34, 50, 14, 26
    pw, ph = w - l - r, h - t - b; lo, hi = 50, 90
    X = lambda i: l + pw * i / (len(months) - 1); Y = lambda v: t + ph * (1 - (v - lo) / (hi - lo))
    s = [f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">'
         f'<stop offset="0" stop-color="{P}" stop-opacity=".18"/><stop offset="1" stop-color="{P}" stop-opacity="0"/></linearGradient></defs>']
    for v in (50, 60, 70, 80, 90):
        s.append(f'<line x1="{l}" x2="{l+pw}" y1="{Y(v)}" y2="{Y(v)}" stroke="{LINE}"/><text x="{l-6}" y="{Y(v)+3.5}" text-anchor="end" font-size="9" fill="{MUTED}">{v}</text>')
    for i, m in enumerate(months):
        s.append(f'<text x="{X(i)}" y="{h-8}" text-anchor="middle" font-size="9.5" fill="{MUTED}">{m}</text>')
    pth = lambda vals: ' '.join(f'{"M" if i == 0 else "L"}{X(i):.1f},{Y(v):.1f}' for i, v in enumerate(vals))
    s.append(f'<path d="{pth(me)} L{X(5):.1f},{Y(lo)} L{X(0):.1f},{Y(lo)} Z" fill="url(#ar)"/>')
    s.append(f'<path d="{pth(avg)}" fill="none" stroke="{AVG}" stroke-width="1.6" stroke-dasharray="4 3"/>')
    s.append(f'<path d="{pth(me)}" fill="none" stroke="{P}" stroke-width="2.6" stroke-linejoin="round"/>')
    for i, v in enumerate(me):
        s.append(f'<circle cx="{X(i):.1f}" cy="{Y(v):.1f}" r="{5 if i == 5 else 3.2}" fill="{P}" stroke="#fff" stroke-width="2"/>')
    s.append(f'<text x="{X(5)+9}" y="{Y(me[-1])+4}" font-size="10.5" font-weight="800" fill="{INK}">72점</text>')
    s.append(f'<text x="{X(5)+9}" y="{Y(avg[-1])+12}" font-size="9" fill="{MUTED}">반 69</text>')
    s.append('</svg>'); return ''.join(s)


def radar_svg(size=226):
    n = len(units); W = size + 90; cx = W / 2; cy = size / 2; R = size / 2 - 48
    def pt(i, v):
        a = -math.pi / 2 + 2 * math.pi * i / n
        return cx + R * v / 100 * math.cos(a), cy + R * v / 100 * math.sin(a)
    rate = lambda u: round(u[2] / (u[1][1] - u[1][0] + 1) * 100)
    s = [f'<svg width="{W}" height="{size}" viewBox="0 0 {W} {size}">']
    for lv in (25, 50, 75, 100):
        s.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, lv) for i in range(n)))}" fill="{SURF if lv == 100 else "none"}" stroke="{LINE}"/>')
    for i in range(n):
        x, y = pt(i, 100); s.append(f'<line x1="{cx}" y1="{cy}" x2="{x:.1f}" y2="{y:.1f}" stroke="{LINE}"/>')
    s.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, u[3]) for i, u in enumerate(units)))}" fill="none" stroke="{AVG}" stroke-width="1.5" stroke-dasharray="4 3"/>')
    s.append(f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in (pt(i, rate(u)) for i, u in enumerate(units)))}" fill="{P}" fill-opacity=".16" stroke="{P}" stroke-width="2.2" stroke-linejoin="round"/>')
    for i, u in enumerate(units):
        x, y = pt(i, rate(u)); s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3.2" fill="{P}" stroke="#fff" stroke-width="1.5"/>')
        lx, ly = pt(i, 128); anc = 'middle' if abs(lx - cx) < 8 else ('start' if lx > cx else 'end')
        s.append(f'<text x="{lx:.1f}" y="{ly-2:.1f}" text-anchor="{anc}" font-size="9.5" fill="{INK2}">{u[0]}</text>'
                 f'<text x="{lx:.1f}" y="{ly+9:.1f}" text-anchor="{anc}" font-size="10" font-weight="800" fill="{INK}">{rate(u)}%</text>')
    s.append('</svg>'); return ''.join(s)


def unit_rows():
    out = []
    for name, (a, b), ok, av in units:
        n = b - a + 1; pct = round(ok / n * 100); diffv = pct - av
        tag = (f'<span class="st good">강점</span>' if diffv >= 5 else f'<span class="st bad">보강</span>' if diffv <= -5 else f'<span class="st mid">보통</span>')
        out.append(f'<tr><td><b>{name}</b><small>{a}~{b}번</small></td><td class="r">{ok}/{n}</td><td class="r b">{pct}%</td>'
                   f'<td class="r m">{av}%</td><td class="r {"up" if diffv >= 0 else "dn"}">{"+" if diffv >= 0 else ""}{diffv}</td><td class="c">{tag}</td></tr>')
    return ''.join(out)


def diff_bars():
    out = []
    for name, n, ok, av in diff:
        pct = round(ok / n * 100)
        out.append(f'<div class="db-row"><span class="db-l">{name}<small>{n}문항</small></span><div class="db-track"><div class="db-fill" style="width:{pct}%"></div>'
                   f'<div class="db-avg" style="left:{av}%"></div></div><span class="db-v">{pct}%<small>{ok}/{n} · 반 {av}%</small></span></div>')
    return ''.join(out)


def qgrid():
    return ''.join(f'<div class="q {"x" if i in wrong_q else "o"}"><b>{i}</b><span>{"✕" if i in wrong_q else "○"}</span><i>{qdiff[i-1]}</i></div>' for i in range(1, 26))


def donut_svg(size=100):
    tot = sum(c[1] for c in causes); r = 37; c0 = size / 2; circ = 2 * math.pi * r; off = 0
    s = [f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}"><g transform="rotate(-90 {c0} {c0})">']
    for _, v, col in causes:
        ln = circ * v / tot
        s.append(f'<circle cx="{c0}" cy="{c0}" r="{r}" fill="none" stroke="{col}" stroke-width="15" stroke-dasharray="{ln-2:.2f} {circ-ln+2:.2f}" stroke-dashoffset="{-off:.2f}"/>'); off += ln
    s.append(f'</g><text x="{c0}" y="{c0-1}" text-anchor="middle" font-size="20" font-weight="800" fill="{INK}">{tot}</text><text x="{c0}" y="{c0+14}" text-anchor="middle" font-size="9" fill="{MUTED}">오답 문항</text></svg>')
    return ''.join(s)


def gauge(label, val, note):
    r = 30; circ = 2 * math.pi * r; col = GOOD if val >= 90 else (P if val >= 80 else WARN)
    return (f'<div class="gauge"><svg width="62" height="62" viewBox="0 0 78 78"><circle cx="39" cy="39" r="{r}" fill="none" stroke="{LAV2}" stroke-width="7"/>'
            f'<circle cx="39" cy="39" r="{r}" fill="none" stroke="{col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="{circ*val/100:.1f} {circ:.1f}" transform="rotate(-90 39 39)"/>'
            f'<text x="39" y="44" text-anchor="middle" font-size="15" font-weight="800" fill="{INK}">{val}%</text></svg><b>{label}</b><small>{note}</small></div>')


CSS = f'''
@page {{ size: A4; margin: 0; }} * {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Noto Sans CJK KR','Noto Sans KR',sans-serif; color: {INK}; background: #fff; }}
.page {{ width: 210mm; height: 297mm; padding: 11mm 12mm 0; position: relative; overflow: hidden; page-break-after: always; }}
.band {{ display: flex; height: 23mm; border-radius: 10px; overflow: hidden; background: linear-gradient(120deg, {PD} 0%, {P} 62%, {PG} 100%); color: #fff; align-items: center; padding: 0 7mm; position: relative; }}
.band .brand {{ display: flex; flex-direction: column; padding-right: 6mm; margin-right: 6mm; border-right: 1px solid rgba(255,255,255,.3); }}
.band .brand b {{ font-size: 16pt; letter-spacing: 2px; line-height: 1; }} .band .brand span {{ font-size: 6.8pt; letter-spacing: 3.2px; margin-top: 3px; opacity: .8; }}
.band .title b {{ font-size: 15pt; display: block; }} .band .title span {{ font-size: 8pt; opacity: .85; }}
.band .pill {{ margin-left: auto; background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.35); border-radius: 99px; padding: 4px 12px; font-size: 9pt; font-weight: 700; }}
.who {{ margin: 4mm 0; font-size: 8.5pt; color: {MUTED}; }} .who b {{ color: {INK}; margin: 0 9px 0 4px; }}
h2 {{ font-size: 10.5pt; color: {INK}; display: flex; align-items: center; gap: 6px; margin: 0 0 2.5mm; }}
h2::before {{ content: ''; width: 4px; height: 13px; background: {P}; border-radius: 2px; }}
h2 small {{ font-size: 7.5pt; color: {MUTED}; font-weight: 400; margin-left: 3px; }}
.cards {{ display: grid; grid-template-columns: 1.1fr 1fr 1fr 1.25fr; gap: 3mm; }}
.card {{ border: 1px solid {LINE}; border-radius: 12px; padding: 3.6mm 4mm; background: #fff; box-shadow: 0 4px 18px rgba(91,52,138,.07); }}
.card .sub {{ font-size: 8pt; color: {MUTED}; font-weight: 700; }}
.card .big {{ font-size: 27pt; font-weight: 800; line-height: 1.05; margin-top: 1.5mm; letter-spacing: -1px; color: {INK}; }}
.card .big small {{ font-size: 9.5pt; color: {MUTED}; font-weight: 500; letter-spacing: 0; margin-left: 2px; }}
.chip {{ display: inline-block; font-size: 7.6pt; padding: 2px 8px; border-radius: 99px; margin-top: 2mm; background: {LAV}; color: {P}; font-weight: 700; }}
.chip.up {{ background: {GOODBG}; color: {GOOD}; }}
.card.sum {{ background: linear-gradient(140deg, {P}, {PD}); color: #fff; border: none; }}
.card.sum .sub {{ color: #DCCBEF; }}
.grade {{ font-size: 18pt; font-weight: 800; margin-top: 1mm; }} .stars {{ color: #F5C451; font-size: 10pt; margin-left: 4px; letter-spacing: 1px; }}
.card.sum p {{ font-size: 7.6pt; color: #EADFF6; margin-top: 1.2mm; line-height: 1.5; }}
.row2 {{ display: grid; grid-template-columns: 1.12fr 1fr; gap: 4mm; margin-top: 4mm; }}
.box {{ border: 1px solid {LINE}; border-radius: 12px; padding: 4mm 4.5mm 3mm; background: #fff; }}
.legend {{ display: flex; gap: 10px; font-size: 7.6pt; color: {INK2}; margin-top: 1mm; flex-wrap: wrap; }}
.legend i {{ display: inline-block; width: 14px; border-top: 2.6px solid {P}; vertical-align: middle; margin-right: 4px; }}
.legend i.d {{ border-top: 1.6px dashed {AVG}; }}
.insight {{ background: {LAV}; border-radius: 8px; padding: 2.2mm 3mm; font-size: 8pt; line-height: 1.55; color: {INK2}; margin-top: 2mm; }} .insight b {{ color: {P}; }}
table.t {{ width: 100%; border-collapse: collapse; font-size: 8.3pt; }}
table.t th {{ font-size: 7.4pt; color: {MUTED}; font-weight: 500; text-align: right; padding: 1.4mm 0; border-bottom: 1px solid {LINE}; }}
table.t th:first-child {{ text-align: left; }}
table.t td {{ padding: 1.7mm 0; border-bottom: 1px solid {LINE}; }}
table.t td.r {{ text-align: right; }} table.t td.c {{ text-align: center; }} table.t td.b {{ font-weight: 800; color: {P}; }} table.t td.m {{ color: {MUTED}; }}
table.t td small {{ display: block; font-size: 6.8pt; color: {MUTED}; font-weight: 400; }}
table.t tr.now td {{ background: {LAV}; font-weight: 800; }}
td.up {{ color: {GOOD}; font-weight: 700; }} td.dn {{ color: {BAD}; font-weight: 700; }}
.st {{ font-size: 7pt; font-weight: 700; padding: 1.5px 6px; border-radius: 99px; }}
.st.good {{ background: {GOODBG}; color: {GOOD}; }} .st.bad {{ background: {BADBG}; color: {BAD}; }} .st.mid {{ background: {LAV}; color: {P}; }}
.unit {{ display: grid; grid-template-columns: 1fr 1.05fr; gap: 4mm; margin-top: 4mm; }}
.unit .box:first-child {{ display: flex; flex-direction: column; align-items: center; }} .unit .box:first-child h2 {{ align-self: flex-start; }}
.foot {{ position: absolute; left: 12mm; right: 12mm; bottom: 9mm; border-top: .8pt solid {P}; padding-top: 2mm; display: flex; justify-content: space-between; font-size: 7.8pt; font-weight: 700; color: {P}; }}
.pno {{ position: absolute; right: 12mm; top: 4.5mm; font-size: 7pt; color: {MUTED}; }}
.run {{ display: flex; justify-content: space-between; align-items: flex-end; border-bottom: .8pt solid {P}; padding-bottom: 1.5mm; margin-bottom: 4mm; position: relative; font-size: 8.5pt; font-weight: 700; color: {P}; }}
.run::after {{ content: ''; position: absolute; right: 0; bottom: -1.2pt; width: 14mm; height: 1.8pt; background: {PG}; }}
.run span {{ color: {MUTED}; font-weight: 500; }}
.p2a {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }}
.db-row {{ display: grid; grid-template-columns: 13mm 1fr 19mm; align-items: center; gap: 3mm; margin: 1.9mm 0; }}
.db-l {{ font-size: 9pt; font-weight: 700; }} .db-l small, .db-v small {{ display: block; font-size: 6.8pt; color: {MUTED}; font-weight: 400; }}
.db-track {{ height: 11px; background: {LAV}; border-radius: 6px; position: relative; }}
.db-fill {{ height: 100%; background: linear-gradient(90deg, {PG}, {P}); border-radius: 6px; }}
.db-avg {{ position: absolute; top: -4px; bottom: -4px; width: 2px; background: {INK}; }}
.db-v {{ font-size: 10pt; font-weight: 800; text-align: right; }}
.qgrid {{ display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; }}
.q {{ border-radius: 6px; text-align: center; padding: 3px 0 2px; background: {SURF}; }}
.q b {{ display: block; font-size: 7pt; color: {MUTED}; font-weight: 500; }} .q span {{ display: block; font-size: 10pt; font-weight: 800; line-height: 1.2; }}
.q i {{ display: block; font-size: 6pt; color: {MUTED}; font-style: normal; }}
.q.o span {{ color: {P}; }} .q.x {{ background: {BADBG}; }} .q.x span {{ color: {BAD}; }}
.cause {{ display: flex; align-items: center; gap: 5mm; }} .cause ul {{ list-style: none; font-size: 8.5pt; }}
.cause li {{ margin: 1.5mm 0; display: flex; align-items: center; gap: 6px; }} .cause li b {{ margin-left: auto; padding-left: 10px; }}
.sw {{ width: 10px; height: 10px; border-radius: 3px; display: inline-block; }}
.gauges {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }}
.gauge {{ display: flex; flex-direction: column; align-items: center; text-align: center; }} .gauge b {{ font-size: 8.5pt; margin-top: 1mm; }} .gauge small {{ font-size: 7pt; color: {MUTED}; margin-top: .5mm; }}
.att {{ display: flex; align-items: center; justify-content: space-between; background: {LAV}; border-radius: 8px; padding: 1.8mm 4mm; margin-top: 2mm; font-size: 8.5pt; }} .att b {{ font-size: 12pt; color: {GOOD}; }}
.comments {{ display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }}
.cm {{ border-radius: 10px; padding: 2.6mm 4mm; font-size: 8.4pt; line-height: 1.55; }} .cm h3 {{ font-size: 9pt; margin-bottom: 1mm; }}
.cm.good {{ background: {GOODBG}; }} .cm.good h3 {{ color: {GOOD}; }} .cm.imp {{ background: {WARNBG}; }} .cm.imp h3 {{ color: {WARN}; }}
.cm.all {{ grid-column: 1 / 3; border: 1px solid {LINE}; }} .cm.all h3 {{ color: {P}; }} .sign {{ text-align: right; font-size: 7.8pt; color: {MUTED}; }}
.plan {{ border-radius: 12px; padding: 3mm 4.5mm; margin-top: 3mm; background: linear-gradient(180deg, {LAV} 0%, #fff 85%); border: 1.2pt solid {P}; }}
.plan h2 small {{ color: {P}; }}
.plan li {{ list-style: none; display: grid; grid-template-columns: 7mm 1fr 26mm; gap: 2.5mm; align-items: center; font-size: 8.6pt; padding: 1.3mm 0; border-bottom: 1px dashed {LAV2}; }}
.plan li:last-child {{ border-bottom: none; }}
.num {{ width: 6mm; height: 6mm; border-radius: 50%; background: {P}; color: #fff; font-size: 8pt; font-weight: 800; display: flex; align-items: center; justify-content: center; }}
.plan small.goal {{ text-align: right; font-size: 7.6pt; color: {P}; font-weight: 700; background: #fff; border: 1px solid {LAV2}; border-radius: 99px; padding: 1px 0; text-align: center; }}
.note {{ font-size: 7pt; color: {MUTED}; margin-top: 2.2mm; line-height: 1.5; }}
'''

rate = lambda u: round(u[2] / (u[1][1] - u[1][0] + 1) * 100)
page1 = f'''<section class="page"><div class="pno">1 / 2</div>
<div class="band"><div class="brand"><b>HYPER</b><span>ACADEMY</span></div>
 <div class="title"><b>수학 월말평가 결과 보고서</b><span>2026년 10월 · 공통수학1 · 다항식 ~ 이차방정식</span></div><div class="pill">10월</div></div>
<div class="who">학생<b>김하이</b>학년<b>고1</b>반<b>고1 수학 A반</b>평가일<b>2026. 10. 31.</b>담당<b>이하이 선생님</b></div>
<h2>이번 달 한눈에 보기</h2>
<div class="cards">
 <div class="card"><div class="sub">점수</div><div class="big">72<small>/ 100</small></div><span class="chip up">▲ 2점 (지난달 70)</span></div>
 <div class="card"><div class="sub">반 평균 대비</div><div class="big">+3<small>점</small></div><span class="chip">반 평균 69점</span></div>
 <div class="card"><div class="sub">정답 문항</div><div class="big">18<small>/ 25</small></div><span class="chip">정답률 72%</span></div>
 <div class="card sum"><div class="sub">종합 평가</div><div class="grade">양호<span class="stars">★★★☆☆</span></div>
  <p>5월보다 10점 올랐고 8월부터 반 평균 이상입니다. 기본·중 문항은 안정적이고, 이차방정식 보강이 다음 목표입니다.</p></div>
</div>
<div class="row2">
 <div class="box"><h2>성적 추이<small>최근 6개월</small></h2>{trend_svg()}
  <div class="legend"><span><i></i>김하이</span><span><i class="d"></i>반 평균</span></div></div>
 <div class="box"><h2>월별 기록</h2>
  <table class="t"><tr><th>월</th><th>점수</th><th>반 평균</th><th>차이</th></tr>
  {''.join(f'<tr class="{"now" if i == 5 else ""}"><td style="padding-left:1mm">{m}</td><td class="r" style="color:{P};font-weight:700">{me[i]}</td><td class="r m">{avg[i]}</td><td class="r {"up" if me[i]-avg[i] >= 0 else "dn"}" style="padding-right:1mm">{"+" if me[i]-avg[i] > 0 else ""}{me[i]-avg[i]}</td></tr>' for i, m in enumerate(months))}
  </table>
  <div class="insight"><b>성장 포인트</b> · 5월 대비 <b>+10점</b>. 8월부터 반 평균을 넘어섰습니다.</div></div>
</div>
<div class="unit">
 <div class="box"><h2>단원별 성취도</h2>{radar_svg()}
  <div class="legend"><span><i></i>김하이 정답률</span><span><i class="d"></i>반 평균</span></div></div>
 <div class="box"><h2>단원별 결과</h2>
  <table class="t"><tr><th>단원</th><th>맞힘</th><th>정답률</th><th>반 평균</th><th>차이</th><th style="text-align:center">진단</th></tr>{unit_rows()}</table>
  <div class="insight"><b>강점</b> 다항식의 연산 100% &nbsp;·&nbsp; <b>보강</b> 이차방정식 40% — 반 평균(61%)보다 21%p 낮습니다.</div></div>
</div>
<div class="foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div></section>'''

page2 = f'''<section class="page"><div class="pno">2 / 2</div>
<div class="run">김하이 · 2026년 10월 수학 월말평가<span>문항 분석 · 학습 태도 · 선생님 의견 · 다음 달 계획</span></div>
<div class="p2a">
 <div class="box"><h2>난이도별 정답률</h2>{diff_bars()}
  <div class="legend"><span><i></i>김하이</span><span><i style="width:2px;height:10px;border-top:none;border-left:2px solid {INK}"></i>반 평균</span></div>
  <div class="insight">기본·중 문항은 반 평균 이상입니다. <b>상·최상 문항</b>에서 점수 차이가 납니다.</div></div>
 <div class="box"><h2>문항별 결과<small>25문항 · 정답 18</small></h2><div class="qgrid">{qgrid()}</div>
  <h2 style="margin-top:2.6mm">오답 원인</h2><div class="cause">{donut_svg()}<ul>{''.join(f'<li><span class="sw" style="background:{c}"></span>{n}<b>{v}문항</b></li>' for n, v, c in causes)}</ul></div></div>
</div>
<div class="box" style="margin-top:3mm;padding-bottom:2.5mm"><h2>이번 달 학습 태도<small>출결·과제·일일테스트 기록에서 자동 집계</small></h2>
 <div class="gauges">{gauge('출석', 100, '결석 0 · 지각 1')}{gauge('과제 완료', 92, '24회 중 22회')}{gauge('일일테스트 1차 통과', 85, '20회 중 17회')}{gauge('오답 재시험 통과', 90, '30문항 중 27문항')}</div>
 <div class="att"><span>학습 태도 종합 <span style="color:{MUTED};font-size:7.5pt">(지각·과제·재시험 감점 기준)</span></span><span><b>94점</b> &nbsp;매우 우수</span></div></div>
<h2 style="margin-top:3mm">선생님 의견</h2>
<div class="comments">
 <div class="cm good"><h3>👍 잘한 점</h3>다항식의 연산 5문항을 모두 맞혔습니다. 기본 문항 실수가 사라졌고, 숙제 완료율도 꾸준히 높습니다.</div>
 <div class="cm imp"><h3>✏️ 보완할 점</h3>이차방정식 판별식과 근과 계수의 관계 활용이 부족합니다. 계산 실수 3문항은 풀이를 끝까지 쓰는 습관으로 줄일 수 있습니다.</div>
 <div class="cm all" style="display:flex;gap:4mm;align-items:baseline"><h3 style="white-space:nowrap">총평</h3><span style="flex:1">꾸준히 올라 8월부터 반 평균을 넘어섰습니다. 11월은 이차방정식 단원 보강과 상·최상 문항 훈련에 집중하겠습니다.</span><span class="sign" style="white-space:nowrap">수학 이하이</span></div>
</div>
<div class="plan"><h2>11월 학습 계획<small>담당 선생님 작성</small></h2><ul>
 <li><span class="num">1</span>이차방정식 판별식·근과 계수의 관계 개념 재정리 + 확인 테스트 (주 2회)<small class="goal">단원 정답률 80%</small></li>
 <li><span class="num">2</span>복소수 연산 유형별 드릴, 틀린 유형만 모아 다시 풀기<small class="goal">단원 정답률 80%</small></li>
 <li><span class="num">3</span>상·최상 난이도 문항 주 3문제, 풀이 과정 첨삭<small class="goal">상 문항 80%</small></li>
 <li><span class="num">4</span>오답 노트 매주 금요일 제출 → 재시험<small class="goal">재시험 통과 95%</small></li></ul></div>
<p class="note">※ 학생 개인의 성장을 보기 위한 자료로 석차는 표시하지 않습니다. 반 평균은 같은 반 학생들의 평균입니다.</p>
<div class="foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div></section>'''

open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report_math.html'), 'w', encoding='utf-8').write(
    f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{page1}{page2}</body></html>')
print('ok')
