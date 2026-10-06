# -*- coding: utf-8 -*-
"""HYPER ACADEMY 학교 시험 개인 분석 리포트 시안 (A4 2쪽, 입체형 시각화) — 예시 데이터"""
import math, os

P = '#5B348A'; PD = '#2E1A4F'; PG = '#8B5CC7'; PL = '#C9B3E8'; GOLD = '#F2B544'; GOLDD = '#C98A12'
CORAL = '#E35D6A'; MINT = '#2BB596'; INK = '#1B1530'; INK2 = '#4A4458'; MUTED = '#7A7387'
LAV = '#F4EFFA'; LINE = '#ECE6F2'

diffs = [('기본', 6, 6, '#C9B3E8'), ('중', 7, 7, '#A57FD8'), ('상', 5, 3, '#7A4AAD'), ('최상', 3, 2, '#4A2775')]
units = [('이차방정식', 26, '#4A2775'), ('나머지정리', 22, '#6B3FA0'), ('복소수', 20, '#8B5CC7'), ('다항식의 연산', 18, '#B394E0'), ('인수분해', 14, '#D9C8F0')]


def shade(hexc, f):
    h = hexc.lstrip('#'); r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    r, g, b = (max(0, min(255, int(c * f))) for c in (r, g, b))
    return f'#{r:02X}{g:02X}{b:02X}'


# ---------- 점수 링 (글로우) ----------
def score_ring(score=84, size=150):
    r = 58; c = size / 2; circ = 2 * math.pi * r
    return f'''<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}"><defs>
<linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{GOLD}"/><stop offset="1" stop-color="#FFE29A"/></linearGradient>
<filter id="gl"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="12"/>
<circle cx="{c}" cy="{c}" r="{r}" fill="none" stroke="url(#rg)" stroke-width="12" stroke-linecap="round" filter="url(#gl)"
 stroke-dasharray="{circ*score/100:.1f} {circ:.1f}" transform="rotate(-90 {c} {c})"/>
<text x="{c}" y="{c+6}" text-anchor="middle" font-size="44" font-weight="900" fill="#fff" letter-spacing="-2">{score}</text>
<text x="{c}" y="{c+28}" text-anchor="middle" font-size="11" fill="#E6DAF5">/ 100점</text></svg>'''


# ---------- 아이소메트릭 3D 막대 ----------
def iso_bars(w=330, h=222):
    base_y = h - 40; unit = 20; bw = 34; dx = 14; dy = 8; gap = 78; x0 = 30
    s = [f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#2E1A4F" flood-opacity=".18"/></filter></defs>']
    # 바닥판
    s.append(f'<polygon points="{x0-12},{base_y+4} {x0+gap*3+bw+12},{base_y+4} {x0+gap*3+bw+12+dx},{base_y+4-dy} {x0-12+dx},{base_y+4-dy}" fill="{LAV}"/>')
    for i, (name, tot, ok, col) in enumerate(diffs):
        x = x0 + gap * i
        def box(y_bot, hgt, color, op=1):
            y_top = y_bot - hgt
            return (f'<g opacity="{op}"><polygon points="{x},{y_bot} {x+bw},{y_bot} {x+bw},{y_top} {x},{y_top}" fill="{color}"/>'
                    f'<polygon points="{x+bw},{y_bot} {x+bw+dx},{y_bot-dy} {x+bw+dx},{y_top-dy} {x+bw},{y_top}" fill="{shade(color,.72)}"/>'
                    f'<polygon points="{x},{y_top} {x+bw},{y_top} {x+bw+dx},{y_top-dy} {x+dx},{y_top-dy}" fill="{shade(color,1.18)}"/></g>')
        s.append(f'<g filter="url(#sh)">')
        s.append(box(base_y, ok * unit, col))
        if tot > ok:
            # 틀린 문항: 코랄 반투명 블록
            s.append(box(base_y - ok * unit, (tot - ok) * unit, CORAL, .9))
        s.append('</g>')
        top = base_y - tot * unit - dy
        s.append(f'<text x="{x+bw/2+dx/2}" y="{top-6}" text-anchor="middle" font-size="11" font-weight="800" fill="{INK}">{ok}/{tot}</text>')
        s.append(f'<text x="{x+bw/2}" y="{base_y+22}" text-anchor="middle" font-size="11" font-weight="700" fill="{INK2}">{name}</text>')
    s.append('</svg>'); return ''.join(s)


# ---------- 3D 파이 ----------
def pie3d(w=300, h=190):
    cx, cy, rx, ry, depth = 110, 78, 92, 52, 22
    tot = sum(u[1] for u in units); ang = -math.pi / 2; segs = []
    for name, v, col in units:
        a2 = ang + 2 * math.pi * v / tot; segs.append((ang, a2, name, v, col)); ang = a2
    P_ = lambda a, dz=0: (cx + rx * math.cos(a), cy + ry * math.sin(a) + dz)
    s = [f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs><filter id="ps"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#2E1A4F" flood-opacity=".22"/></filter></defs><g filter="url(#ps)">']
    # 옆면 (앞쪽만)
    walls = []
    for a1, a2, name, v, col in segs:
        n = max(2, int((a2 - a1) / 0.05))
        for k in range(n):
            b1 = a1 + (a2 - a1) * k / n; b2 = a1 + (a2 - a1) * (k + 1) / n
            mid = (b1 + b2) / 2
            if math.sin(mid) > -0.02:
                p1, p2 = P_(b1), P_(b2); q1, q2 = P_(b1, depth), P_(b2, depth)
                walls.append((math.sin(mid), f'<polygon points="{p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {q2[0]:.1f},{q2[1]:.1f} {q1[0]:.1f},{q1[1]:.1f}" fill="{shade(col,.68)}" stroke="{shade(col,.68)}" stroke-width=".6"/>'))
    for _, poly in sorted(walls): s.append(poly)
    # 윗면
    for a1, a2, name, v, col in segs:
        n = max(2, int((a2 - a1) / 0.04)); pts = [f'{cx},{cy}'] + [f'{P_(a1+(a2-a1)*k/n)[0]:.1f},{P_(a1+(a2-a1)*k/n)[1]:.1f}' for k in range(n + 1)]
        s.append(f'<polygon points="{" ".join(pts)}" fill="{col}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>')
    s.append('</g>')
    # 범례 (오른쪽)
    for i, (a1, a2, name, v, col) in enumerate(segs):
        y = 26 + i * 30
        s.append(f'<rect x="{w-92}" y="{y-9}" width="11" height="11" rx="3" fill="{col}"/><text x="{w-76}" y="{y}" font-size="10" fill="{INK2}">{name}</text>'
                 f'<text x="{w-76}" y="{y+12}" font-size="10.5" font-weight="800" fill="{INK}">{v}%</text>')
    s.append('</svg>'); return ''.join(s)


# ---------- 시험지 캡처 모양 ----------
def capture(no, pts, body, fig=''):
    return f'''<div class="cap"><div class="cap-paper"><div class="cap-q"><b>{no}.</b> {body} <span class="pt">[{pts}점]</span></div>{fig}
<div class="cap-tag">시험지 캡처</div></div></div>'''


graph19 = '''<svg width="150" height="92" viewBox="0 0 150 92" style="display:block;margin:6px auto 0">
<line x1="10" y1="72" x2="142" y2="72" stroke="#333" stroke-width="1"/><line x1="40" y1="88" x2="40" y2="4" stroke="#333" stroke-width="1"/>
<path d="M18,10 Q75,140 132,10" fill="none" stroke="#222" stroke-width="1.4"/><line x1="16" y1="86" x2="140" y2="20" stroke="#222" stroke-width="1.2"/>
<text x="138" y="84" font-size="9" font-style="italic">x</text><text x="44" y="11" font-size="9" font-style="italic">y</text><text x="32" y="82" font-size="8">O</text></svg>'''

wrongs = [
    dict(no=14, pts=5, diff='상', unit='이차방정식', type='근의 판별 · 두 근의 부호 조건',
         body='이차방정식 <i>x</i><sup>2</sup> − 2<i>kx</i> + <i>k</i> + 6 = 0이 서로 다른 두 양의 실근을 갖도록 하는 정수 <i>k</i>의 최솟값을 구하시오.',
         cause=('개념 이해 부족', '#7A4AAD', '🧩'), note='판별식만 쓰고 "두 근의 합 > 0, 곱 > 0" 조건을 빠뜨렸습니다. 부호 조건 3가지를 한 세트로 외워야 합니다.'),
    dict(no=17, pts=6, diff='최상', unit='나머지정리', type='나머지정리 · 미정계수 결정',
         body='다항식 <i>P</i>(<i>x</i>)를 <i>x</i><sup>2</sup> − 1로 나눈 나머지는 2<i>x</i> + 3, <i>x</i> + 2로 나눈 나머지는 1이다. <i>P</i>(<i>x</i>)를 (<i>x</i><sup>2</sup> − 1)(<i>x</i> + 2)로 나눈 나머지를 <i>R</i>(<i>x</i>)라 할 때, <i>R</i>(0)의 값을 구하시오.',
         cause=('응용 능력 부족', '#C98A12', '🧠'), note='나머지를 a(x²−1)+2x+3 꼴로 세우는 아이디어가 필요했습니다. 개념은 알지만 연결이 안 된 경우입니다.'),
    dict(no=19, pts=5, diff='상', unit='이차방정식', type='이차함수와 직선의 위치 관계',
         body='이차함수 <i>y</i> = <i>x</i><sup>2</sup> − 4<i>x</i> + <i>a</i>의 그래프와 직선 <i>y</i> = 2<i>x</i> − 1이 만나지 않도록 하는 정수 <i>a</i>의 최솟값을 구하시오.',
         fig=graph19, cause=('계산 실수', CORAL, '✏️'), note='판별식까지 맞게 세웠지만 9 − (a+1) < 0에서 부등호 방향을 바꿔 답을 7로 썼습니다.'),
]


def wrong_card(w):
    dcol = {'기본': '#C9B3E8', '중': '#A57FD8', '상': '#7A4AAD', '최상': '#4A2775'}[w['diff']]
    c = w['cause']
    return f'''<div class="wc">{capture(w['no'], w['pts'], w['body'], w.get('fig', ''))}
<div class="wc-info"><div class="wc-row"><span class="badge" style="background:{dcol}">{w['diff']}</span><span class="unit">{w['unit']}</span><span class="pts">-{w['pts']}점</span></div>
<div class="wc-type"><small>문제 유형</small>{w['type']}</div>
<div class="cause" style="--c:{c[1]}"><span class="ci">{c[2]}</span><div><small>오답 원인</small><b>{c[0]}</b></div></div>
<p class="wc-note"><b>AI 분석</b> {w['note']}</p></div></div>'''


CSS = f'''
@page {{ size: A4; margin: 0; }} * {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: 'Noto Sans CJK KR','Noto Sans KR',sans-serif; color: {INK}; background: #fff; }}
.page {{ width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; background: #FBF9FE; }}
.hero {{ height: 78mm; background: radial-gradient(120% 140% at 85% 0%, {PG} 0%, {P} 38%, {PD} 100%); color: #fff; padding: 9mm 12mm 0; position: relative; overflow: hidden; }}
.hero::after {{ content: ''; position: absolute; width: 120mm; height: 120mm; border-radius: 50%; right: -40mm; bottom: -70mm; background: radial-gradient(circle, rgba(242,181,68,.28), transparent 65%); }}
.brand {{ display: flex; align-items: baseline; gap: 8px; font-size: 8pt; letter-spacing: 3px; opacity: .85; }} .brand b {{ font-size: 13pt; letter-spacing: 2px; }}
.hero h1 {{ font-size: 21pt; font-weight: 900; margin-top: 4mm; letter-spacing: -.5px; }}
.hero .sub {{ font-size: 9pt; color: #E6DAF5; margin-top: 1.5mm; }}
.hero .who {{ display: inline-flex; gap: 4mm; margin-top: 4mm; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.22); border-radius: 99px; padding: 5px 14px; font-size: 8.5pt; backdrop-filter: blur(6px); }}
.hero .who b {{ color: #fff; }} .hero .who span {{ color: #DCCBEF; }}
.ring {{ position: absolute; right: 12mm; top: 12mm; z-index: 2; text-align: center; }}
.ring small {{ display: block; font-size: 8pt; color: #E6DAF5; margin-top: -2mm; }}
.stats {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3.5mm; margin: -13mm 12mm 0; position: relative; z-index: 3; }}
.stat {{ background: rgba(255,255,255,.96); border-radius: 14px; padding: 3.5mm 4mm; box-shadow: 0 10px 28px rgba(46,26,79,.14), inset 0 1px 0 #fff; border: 1px solid #EFE8F7; }}
.stat small {{ font-size: 7.6pt; color: {MUTED}; font-weight: 700; }} .stat b {{ display: block; font-size: 19pt; font-weight: 900; margin-top: 1mm; letter-spacing: -.5px; }}
.stat b span {{ font-size: 9pt; color: {MUTED}; font-weight: 500; }} .stat i {{ font-style: normal; font-size: 7.4pt; color: {MUTED}; }}
.sec {{ padding: 0 12mm; }}
h2 {{ font-size: 11pt; font-weight: 800; display: flex; align-items: center; gap: 7px; margin: 0 0 2.5mm; }}
h2 .ic {{ width: 22px; height: 22px; border-radius: 7px; background: linear-gradient(135deg, {PG}, {P}); color: #fff; font-size: 10pt; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(91,52,138,.35); }}
h2 small {{ font-size: 7.6pt; color: {MUTED}; font-weight: 500; }}
.grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 5mm; }}
.card {{ background: #fff; border-radius: 16px; padding: 4mm 4.5mm; box-shadow: 0 8px 26px rgba(46,26,79,.08); border: 1px solid #F0EAF7; }}
.legend {{ display: flex; gap: 12px; font-size: 7.6pt; color: {INK2}; }} .legend i {{ display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; }}
.tip {{ font-size: 8pt; line-height: 1.55; color: {INK2}; background: {LAV}; border-radius: 10px; padding: 2.4mm 3mm; margin-top: 2mm; }} .tip b {{ color: {P}; }}
.top1 {{ margin-top: 5mm; border-radius: 18px; background: linear-gradient(135deg, #2E1A4F 0%, #4A2775 55%, #6B3FA0 100%); color: #fff; padding: 5mm 5.5mm; position: relative; overflow: hidden; box-shadow: 0 14px 34px rgba(46,26,79,.3); }}
.top1::before {{ content: ''; position: absolute; right: -20mm; top: -25mm; width: 70mm; height: 70mm; border-radius: 50%; background: radial-gradient(circle, rgba(242,181,68,.35), transparent 65%); }}
.top1 h2 {{ color: #fff; }} .top1 h2 .ic {{ background: linear-gradient(135deg, #FFE29A, {GOLD}); color: {PD}; }}
.crown {{ display: inline-block; font-size: 7.5pt; font-weight: 800; color: {PD}; background: linear-gradient(90deg, #FFE29A, {GOLD}); border-radius: 99px; padding: 2px 9px; margin-left: 4px; }}
.t1 {{ display: grid; grid-template-columns: 1.05fr 1fr; gap: 4mm; position: relative; }}
.t1 .cap-paper {{ min-height: 0; }}
.t1-body {{ font-size: 8.3pt; line-height: 1.6; color: #EDE4F8; }}
.t1-body h4 {{ font-size: 8.4pt; color: {GOLD}; margin: 1.6mm 0 .6mm; }} .t1-body h4:first-child {{ margin-top: 0; }}
.t1-body ol {{ padding-left: 4.5mm; }}
.cap {{ position: relative; }}
.cap-paper {{ background: #FFFEFB; border-radius: 6px; padding: 3.2mm 3.6mm 3mm; color: #111; font-family: 'Noto Serif CJK KR', serif; font-size: 8.8pt; line-height: 1.75;
  box-shadow: 0 1px 0 #e9e4da, 0 6px 16px rgba(0,0,0,.12); border: 1px solid #EAE5DA; position: relative; transform: rotate(-.35deg); }}
.cap-paper::before {{ content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.012) 3px 4px); border-radius: 6px; pointer-events: none; }}
.cap-q b {{ font-family: 'Noto Sans CJK KR', sans-serif; }} .pt {{ font-size: 7.5pt; color: #555; }}
.cap-tag {{ position: absolute; right: 6px; top: -9px; font-family: 'Noto Sans CJK KR',sans-serif; font-size: 6.6pt; font-weight: 700; color: #fff; background: {P}; border-radius: 99px; padding: 1px 7px; }}
.foot {{ position: absolute; left: 12mm; right: 12mm; bottom: 8mm; display: flex; justify-content: space-between; font-size: 7.6pt; font-weight: 700; color: {P}; border-top: .8pt solid {PL}; padding-top: 2mm; }}
/* page 2 */
.p2head {{ padding: 9mm 12mm 0; display: flex; justify-content: space-between; align-items: flex-end; }}
.p2head h1 {{ font-size: 15pt; font-weight: 900; }} .p2head h1 span {{ color: {P}; }}
.p2head p {{ font-size: 8pt; color: {MUTED}; }}
.chips {{ display: flex; gap: 2mm; margin: 3mm 12mm 0; }}
.chip {{ font-size: 7.8pt; font-weight: 700; padding: 3px 10px; border-radius: 99px; background: #fff; border: 1px solid #EDE5F6; box-shadow: 0 3px 10px rgba(46,26,79,.06); }}
.wlist {{ padding: 0 12mm; margin-top: 4mm; display: flex; flex-direction: column; gap: 3.6mm; }}
.wc {{ display: grid; grid-template-columns: 1.08fr 1fr; gap: 4mm; background: #fff; border-radius: 16px; padding: 4mm; box-shadow: 0 8px 24px rgba(46,26,79,.08); border: 1px solid #F0EAF7; }}
.wc-row {{ display: flex; align-items: center; gap: 6px; }}
.badge {{ color: #fff; font-size: 7.6pt; font-weight: 800; border-radius: 6px; padding: 2px 8px; }}
.unit {{ font-size: 8.4pt; font-weight: 700; color: {INK2}; }} .pts {{ margin-left: auto; font-size: 9pt; font-weight: 900; color: {CORAL}; }}
.wc-type {{ margin-top: 2mm; font-size: 9.2pt; font-weight: 800; }} .wc-type small, .cause small {{ display: block; font-size: 7pt; color: {MUTED}; font-weight: 500; }}
.cause {{ display: flex; align-items: center; gap: 8px; margin-top: 2.2mm; padding: 2mm 3mm; border-radius: 12px; background: color-mix(in srgb, var(--c) 10%, #fff); border: 1px solid color-mix(in srgb, var(--c) 30%, #fff); }}
.cause b {{ font-size: 10pt; color: var(--c); }} .ci {{ width: 26px; height: 26px; border-radius: 9px; background: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,.08); font-size: 11pt; }}
.wc-note {{ font-size: 8pt; line-height: 1.55; color: {INK2}; margin-top: 2mm; }} .wc-note b {{ color: {P}; margin-right: 3px; }}
.cm {{ margin: 4mm 12mm 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }}
.note-card {{ background: #fff; border-radius: 16px; padding: 3.8mm 4.5mm; box-shadow: 0 8px 24px rgba(46,26,79,.08); border: 1px solid #F0EAF7; font-size: 8.5pt; line-height: 1.62; color: {INK2}; }}
.note-card.plan {{ background: linear-gradient(160deg, #fff 0%, {LAV} 100%); }}
.plan ol {{ list-style: none; counter-reset: s; }} .plan li {{ counter-increment: s; display: flex; gap: 7px; margin: 1.3mm 0; }}
.plan li::before {{ content: counter(s); flex: none; width: 17px; height: 17px; border-radius: 50%; background: linear-gradient(135deg, {PG}, {P}); color: #fff; font-size: 7.6pt; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-top: 2px; }}
.sign {{ text-align: right; font-size: 7.6pt; color: {MUTED}; margin-top: 1.2mm; }}
'''

page1 = f'''<section class="page">
<div class="hero"><div class="brand"><b>HYPER</b>ACADEMY · 학교 시험 분석 리포트</div>
 <h1>2026 1학기 기말고사 · 수학</h1><div class="sub">하이고등학교 1학년 · 공통수학1 · 다항식 ~ 이차방정식 · 21문항</div>
 <div class="who"><span>학생</span><b>김하이</b><span>담당</span><b>이하이 선생님</b><span>분석일</span><b>2026. 7. 10.</b></div>
 <div class="ring">{score_ring()}<small>내 점수</small></div></div>
<div class="stats">
 <div class="stat"><small>맞힌 문항</small><b>18<span> / 21</span></b><i>정답률 86%</i></div>
 <div class="stat"><small>틀린 문항</small><b style="color:{CORAL}">3<span> 문항</span></b><i>-16점 (14·17·19번)</i></div>
 <div class="stat"><small>시험 난이도</small><b>상<span> · 어려움</span></b><i>상·최상 8문항 (38%)</i></div>
 <div class="stat"><small>최다 출제 단원</small><b style="font-size:15pt;margin-top:2mm">이차방정식</b><i>배점 26%</i></div>
</div>
<div class="sec"><div class="grid2">
 <div class="card"><h2><span class="ic">▤</span>난이도별 결과<small>맞힌 문항 / 전체</small></h2>{iso_bars()}
  <div class="legend"><span><i style="background:{P}"></i>맞힘</span><span><i style="background:{CORAL}"></i>틀림</span></div>
  <div class="tip">기본·중 문항은 <b>전부 정답</b>. 점수는 상·최상 문항에서 빠졌습니다.</div></div>
 <div class="card"><h2><span class="ic">◔</span>단원별 출제 비중<small>배점 기준</small></h2>{pie3d()}
  <div class="tip">이차방정식·나머지정리가 <b>절반(48%)</b>을 차지했습니다. 다음 시험도 이 두 단원이 핵심입니다.</div></div>
</div>
<div class="top1"><h2><span class="ic">★</span>1등급 완성 문제<span class="crown">이번 시험 최고난도 TOP 1</span></h2>
 <div class="t1"><div>{capture(21, 6, '이차방정식 <i>x</i><sup>2</sup> − <i>x</i> + 1 = 0의 한 근을 <i>ω</i>라 할 때, <i>ω</i><sup>2026</sup> + <span style="display:inline-block;vertical-align:middle;text-align:center;font-size:8pt;line-height:1.1"><span style="display:block;border-bottom:1px solid #111">1</span><i>ω</i><sup>2026</sup></span> 의 값을 구하시오.')}
   <p style="font-size:7.6pt;color:#D9C8F0;margin-top:2.4mm">✓ 김하이 학생 <b style="color:#FFE29A">정답</b> · 반에서 정답 2명</p></div>
  <div class="t1-body"><h4>왜 어려운가</h4>지수가 2026으로 커서 직접 계산이 불가능합니다. 주기를 찾아야 합니다.
   <h4>핵심 아이디어</h4>x² − x + 1 = 0의 양변에 (x+1)을 곱하면 <b>ω³ = −1</b>.
   <h4>풀이</h4><ol><li>2026 = 3×675 + 1 → ω²⁰²⁶ = (−1)⁶⁷⁵·ω = −ω</li><li>1/ω = <span style="text-decoration:overline">ω</span> (|ω| = 1) → 1/ω²⁰²⁶ = −<span style="text-decoration:overline">ω</span></li><li>합 = −(ω + <span style="text-decoration:overline">ω</span>) = −1 &nbsp;∴ <b style="color:{GOLD}">−1</b></li></ol></div></div></div>
</div>
<div class="foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div></section>'''

page2 = f'''<section class="page">
<div class="p2head"><div><p>김하이 · 2026 1학기 기말고사 수학</p><h1>틀린 문제 <span>정밀 분석</span></h1></div>
 <p style="text-align:right">AI가 시험지에서 문제를 찾아 캡처하고<br>유형·오답 원인을 분석했습니다.</p></div>
<div class="chips"><span class="chip">🧩 개념 이해 부족 1</span><span class="chip">🧠 응용 능력 부족 1</span><span class="chip">✏️ 계산 실수 1</span><span class="chip">⏱ 시간 부족 0</span></div>
<div class="wlist">{''.join(wrong_card(w) for w in wrongs)}</div>
<div class="cm">
 <div class="note-card"><h2><span class="ic">✎</span>선생님 총평</h2>기본·중 문항을 하나도 놓치지 않은 점이 이번 시험의 가장 큰 성과입니다. 틀린 3문항은 모두 상·최상 난이도로, 조건 정리와 응용력의 문제입니다. 1등급 완성 문제를 맞힌 만큼 실력은 충분합니다. 다음 시험은 "마지막 5점"을 지키는 연습이 목표입니다.<div class="sign">수학 이하이</div></div>
 <div class="note-card plan"><h2><span class="ic">➜</span>2학기 중간고사 대비 계획</h2><ol>
  <li>이차방정식 근의 부호 조건 3종 세트 암기 + 확인 문제 20개</li>
  <li>나머지정리 "나머지를 미지수로 세우기" 유형 주 5문제</li>
  <li>부등식 풀이 후 부등호 방향 되짚기 습관 (검산 체크리스트)</li>
  <li>시험 2주 전 학교 기출 3개년 실전 모의 3회</li></ol></div>
</div>
<div class="foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div></section>'''

open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'report_exam.html'), 'w', encoding='utf-8').write(
    f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{page1}{page2}</body></html>')
print('ok')
