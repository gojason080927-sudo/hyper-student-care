import katex from 'katex'
import { splitChoices, type BankProblem } from './questionBank'

// 문제지 인쇄용 HTML(브라우저 인쇄 → PDF 저장). 모양: hyper-claude-work/템플릿/기말_공식_템플릿.html
// (상단 밴드 없음, 좌우 상단 둥근 칸, 가운데 2단 실선, 하단 가운데 쪽번호, 오른쪽 학원명). 정답·해설은 넣지 않는다.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** 글 속 $…$, $$…$$, \(…\) 수식을 KaTeX로 그린다. 분수는 본문 안에서도 크게(\dfrac). */
export function mathHtml(text: string): string {
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\\(([\s\S]+?)\\\)/g
  let out = ''
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out += esc(text.slice(last, m.index)).replace(/\n/g, '<br>')
    const tex = (m[1] ?? m[2] ?? m[3]).replace(/\\frac/g, '\\dfrac')
    out += katex.renderToString(tex, { throwOnError: false, displayMode: false, strict: 'ignore' })
    last = re.lastIndex
  }
  return out + esc(text.slice(last)).replace(/\n/g, '<br>')
}

export function questionHtml(p: BankProblem, no: number): string {
  const { stem, choices } = splitChoices(p.text)
  const img = p.image ? `<img class="fig" src="${esc(p.image)}" alt="">` : ''
  const opts = choices.map((c, i) => `<div class="o"><span class="n">${'①②③④⑤'[i] ?? ''}</span><span class="t">${mathHtml(c)}</span></div>`).join('')
  return `<div class="q"><div class="qh"><span class="qn">${no}</span><div class="qs">${mathHtml(stem)}${img}${opts ? `<div class="os">${opts}</div>` : ''}</div></div></div>`
}

export type PrintInput = { left: string; right: string; meta: string; fileName: string; items: BankProblem[] }

const CSS = `
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--main:#F59E4C;--ink:#3a2410;--line:#F9C99A;--L:calc(10.5pt * 1.6)}
body{margin:0;font-family:"Malgun Gothic","맑은 고딕",sans-serif;color:#1b1b1b;background:#fff}
.page{width:210mm;height:297mm;position:relative;page-break-after:always;overflow:hidden}
.hd{position:absolute;top:9mm;left:12mm;right:12mm;height:8mm;display:flex;justify-content:space-between;align-items:center}
.hd:after{content:"";position:absolute;left:0;right:0;bottom:-3mm;border-bottom:.3mm solid var(--line)}
.pill{background:var(--main);color:var(--ink);font-weight:700;font-size:9pt;padding:1.6mm 5mm;border-radius:6mm;letter-spacing:.3mm;line-height:1.2;white-space:nowrap}
.meta{font-size:8pt;color:var(--ink);flex:1;text-align:center;padding:0 3mm;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.body{position:absolute;top:20mm;bottom:17mm;left:12mm;right:12mm;display:grid;grid-template-columns:1fr 1fr;padding-top:var(--L)}
.col{min-width:0;height:100%;font-size:10.5pt;line-height:1.6}
.col:first-child{padding-right:5mm;border-right:.25mm solid #d6c9bd}.col:last-child{padding-left:5mm}
.q{break-inside:avoid}
.qh{display:flex}.qn{flex:none;width:7mm;font-size:11pt;font-weight:700}
.qs{flex:1;min-width:0;word-break:keep-all;overflow-wrap:anywhere}
.os{margin-top:calc(var(--L) * .5)}
.o{display:flex}.o .n{flex:none;width:6mm}.o .t{flex:1;min-width:0;text-align:left}
.fig{display:block;max-width:100%;margin:2mm 0}
.katex{font-size:1em}
.ft{position:absolute;bottom:8mm;left:12mm;right:12mm;text-align:right;font-size:8pt;color:var(--ink)}
.ft:before{content:"";position:absolute;left:0;right:0;top:-3mm;border-top:.3mm solid var(--line)}
.ft .pg{position:absolute;left:0;right:0;text-align:center;font-size:8pt;color:#222}
.stage{position:absolute;left:-9999px;top:0;width:87.75mm;font-size:10.5pt;line-height:1.6}
@media screen{body{background:#eee}.page{margin:0 auto 6mm;background:#fff}}
`

// 문제를 칸·쪽 단위로 채운다: 문제 하나는 쪼개지 않고, 칸 첫 문제는 머릿말 아래 1줄(.body padding), 문제 사이 3줄
const PAGINATE = `
(async () => {
  await document.fonts.ready
  await Promise.all([...document.images].map((i) => i.complete || new Promise((r) => { i.onload = i.onerror = r })))
  const stage = document.querySelector('.stage'), tpl = document.getElementById('tpl'), pages = document.getElementById('pages')
  const L = parseFloat(getComputedStyle(stage).lineHeight)
  const qs = [...stage.children]
  let cols, ci = 0, used = 0, n = 0
  const newPage = () => { const p = tpl.content.firstElementChild.cloneNode(true); pages.append(p); p.querySelector('.pg').textContent = ++n; cols = [...p.querySelectorAll('.col')]; ci = 0; used = 0 }
  newPage()
  const H = cols[0].clientHeight
  for (const q of qs) {
    const h = q.getBoundingClientRect().height
    let gap = used ? 3 * L : 0
    if (used && used + gap + h > H) { if (++ci > 1) newPage(); used = 0; gap = 0 }
    q.style.marginTop = gap + 'px'
    cols[ci].append(q)
    used += gap + h
  }
  stage.remove()
  window.__ready = true
  if (location.hash === '#print') setTimeout(() => window.print(), 50)
})()
`

export function buildWorksheetHtml(input: PrintInput, opts: { katexCss: string; base?: string }): string {
  const qs = input.items.map((p, i) => questionHtml(p, i + 1)).join('')
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">${opts.base ? `<base href="${esc(opts.base)}">` : ''}<title>${esc(input.fileName)}</title>
<style>${opts.katexCss}</style><style>${CSS}</style></head><body>
<template id="tpl"><section class="page"><div class="hd"><span class="pill">${esc(input.left)}</span><span class="meta">${esc(input.meta)}</span><span class="pill">${esc(input.right)}</span></div>
<div class="body"><div class="col"></div><div class="col"></div></div><div class="ft"><span class="pg"></span><span>하이퍼 영수 전문학원</span></div></section></template>
<div id="pages"></div><div class="stage">${qs}</div><script>${PAGINATE}</script></body></html>`
}
