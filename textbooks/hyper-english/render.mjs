/** Fill the fixed HYPER masters. Visual rules stay in master.css. */

const TOC_PER_PAGE = 8
const QUESTIONS_PER_PAGE = 6
const WORDS_PER_PAGE = 16

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function pad(n) {
  return String(n).padStart(3, '0')
}

function chunk(list, size) {
  const pages = []
  for (let i = 0; i < list.length; i += size) pages.push(list.slice(i, i + size))
  return pages
}

function questionHtml(q) {
  const choices = (q.choices ?? [])
    .map((choice, index) => {
      const text = `${'①②③④⑤'[index] ?? `${index + 1}.`} ${choice}`
      const long = text.length > 28 ? ' class="long"' : ''
      return `<li${long}>${esc(text)}</li>`
    })
    .join('')
  const english = q.english
    ? `<p class="q-english">${esc(q.english)}</p>`
    : ''
  return `<div class="q">
    <div class="q-head"><span class="q-num">${q.no}</span><span class="q-stem">${esc(q.stem)}</span></div>
    ${english}
    <ol class="q-choices">${choices}</ol>
  </div>`
}

function columnsHtml(items) {
  const mid = Math.ceil(items.length / 2)
  const left = items.slice(0, mid).join('')
  const right = items.slice(mid).join('')
  return `<div class="cols"><div class="col">${left}</div><div class="col">${right}</div></div>`
}

function foot(side, series, label, folio) {
  if (side === 'left') {
    return `<div class="page-foot"><span>${esc(series)}</span><span class="folio">${pad(folio)}</span></div>`
  }
  return `<div class="page-foot"><span class="folio">${pad(folio)}</span><span>${esc(label)}</span></div>`
}

function sheet(side, inner, series, label, folio, head) {
  const running = head ? `<div class="running-head">${esc(head)}</div>` : ''
  return `<section class="page ${side}">${running}${inner}${foot(side, series, label, folio)}</section>`
}

function openingHtml(unit, hidePassage) {
  const paras = hidePassage ? '' : (unit.passage ?? []).map((p) => `<p>${esc(p)}</p>`).join('')
  const points = (unit.points ?? [])
    .map(
      (point) => `<div class="box${point.plain ? ' plain' : ''}">
        <h4>${esc(point.label)}${point.title ? ` · ${esc(point.title)}` : ''}</h4>
        <p>${esc(point.body)}</p>
      </div>`,
    )
    .join('')
  const example = unit.example
    ? `<div class="box plain"><h4>예제</h4><p>${esc(unit.example)}</p></div>`
    : ''
  const prompt = unit.prompt
    ? `<div class="box"><h4>영작</h4><p>${esc(unit.prompt)}</p></div>
       ${'<p style="border-bottom:0.4pt solid var(--rule);height:9mm;margin:0 0 3mm"></p>'.repeat(unit.lines ?? 8)}`
    : ''
  return `<div class="unit-kicker">UNIT</div>
    <div class="unit-no">${esc(unit.no)}</div>
    <h2 class="unit-title">${esc(unit.title)}</h2>
    <p class="unit-sub">${esc(unit.subtitle ?? '')}</p>
    <hr class="unit-rule">
    ${paras ? `<div class="passage">${paras}</div>` : ''}
    ${points}${example}${prompt}`
}

function needsOpening(unit) {
  return Boolean(
    (unit.passage && unit.passage.length) ||
      (unit.points && unit.points.length) ||
      unit.example ||
      unit.prompt,
  )
}

export function planBook(book) {
  const units = book.units ?? []
  const content = []
  for (const unit of units) {
    const head = `UNIT ${unit.no} · ${unit.title}`
    if (needsOpening(unit)) content.push({ kind: 'open', unit, head, hidePassage: book.kind === 'reading' })
    if (book.kind === 'reading') {
      for (const group of chunk(unit.passage ?? [], 2)) {
        content.push({ kind: 'reading', unit, head, passages: group })
      }
    }
    const questions = (unit.questions ?? []).map((q, index) => ({ ...q, no: index + 1 }))
    for (const group of chunk(questions, QUESTIONS_PER_PAGE)) {
      content.push({ kind: 'questions', unit, head, questions: group })
    }
    const words = unit.words ?? []
    for (const group of chunk(words, WORDS_PER_PAGE)) {
      content.push({ kind: 'words', unit, head, words: group })
    }
  }
  const answers = []
  for (const unit of units) {
    for (const [index, q] of (unit.questions ?? []).entries()) {
      if (q.answer) answers.push({ unit, no: index + 1, answer: q.answer })
    }
  }
  for (const group of chunk(answers, 12)) content.push({ kind: 'answers', answers: group })

  const tocCount = Math.max(1, Math.ceil(units.length / TOC_PER_PAGE))
  const pages = []
  units.forEach((unit, index) => {
    const start = content.findIndex((page) => page.unit === unit)
    unit._page = tocCount + (start < 0 ? content.length : start) + 1
    void index
  })
  for (let i = 0; i < tocCount; i += 1) {
    pages.push({ kind: 'toc', units: units.slice(i * TOC_PER_PAGE, (i + 1) * TOC_PER_PAGE) })
  }
  return pages.concat(content)
}

export function renderBook(book, { css = './' } = {}) {
  const schoolLabel = book.school === 'middle' ? '중학교' : book.school === 'high' ? '고등학교' : ''
  const seriesName = [schoolLabel, book.series].filter(Boolean).join(' · ')
  const series = `${book.brand ?? 'HYPER'} · ${seriesName}`
  const pages = planBook(book)
  const body = pages
    .map((page, index) => {
      const side = index % 2 === 0 ? 'left' : 'right'
      const folio = index + 1
      if (page.kind === 'toc') {
        const items = page.units
          .map(
            (unit) => `<div class="toc-item"><span class="toc-no">${esc(unit.no)}</span><span class="toc-name">${esc(unit.title)} <span>${esc(unit.subtitle ?? '')}</span></span><span class="toc-page">${pad(unit._page)}</span></div>`,
          )
          .join('')
        const inner = `<div class="toc-band"><div class="brand">HYPER<small>${esc(book.brandLine ?? 'ENGLISH')}</small></div><div class="toc-title">차례</div></div>
          <h3 class="toc-section">${esc(seriesName)}</h3>${items}`
        return sheet(side, inner, series, seriesName, folio, '')
      }
      if (page.kind === 'open') {
        return sheet(side, openingHtml(page.unit, page.hidePassage), series, page.head, folio, page.head)
      }
      if (page.kind === 'reading') {
        const blocks = page.passages.map(
          (paragraph) => `<div class="passage passage-frame"><p>${esc(paragraph)}</p></div>`,
        )
        return sheet(side, columnsHtml(blocks), series, page.head, folio, page.head)
      }
      if (page.kind === 'questions') {
        return sheet(side, columnsHtml(page.questions.map(questionHtml)), series, page.head, folio, page.head)
      }
      if (page.kind === 'words') {
        const items = page.words.map(
          (word) => `<div class="toc-item"><span class="toc-no">${esc(word.word)}</span><span class="toc-name">${esc(word.meaning)}</span><span class="toc-page"></span></div>`,
        )
        return sheet(side, columnsHtml(items), series, page.head, folio, page.head)
      }
      const lines = page.answers
        .map((item) => `<div class="toc-item"><span class="toc-no">${item.no}</span><span class="toc-name">${esc(item.unit.title)} <span>${esc(item.answer)}</span></span><span class="toc-page"></span></div>`)
        .join('')
      const inner = `<h3 class="toc-section">정답과 해설</h3>${lines}`
      return sheet(side, inner, series, '정답과 해설', folio, '정답과 해설')
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>${esc(book.brand ?? 'HYPER')} ${esc(book.series ?? '')}</title>
<link rel="stylesheet" href="${css}tokens.css">
<link rel="stylesheet" href="${css}master.css">
</head>
<body data-grade="${esc(book.grade ?? 'g3')}">
<div class="screen-wrap">
${body}
</div>
</body>
</html>`
}
