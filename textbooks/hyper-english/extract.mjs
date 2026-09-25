/** Turn extracted textbook text into the existing book JSON. No new schema. */

const KINDS = {
  reading: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 독해' },
  grammar: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 문법편' },
  vocab: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 단어' },
  writing: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 영작' },
  math: { grade: 'g1', brandLine: 'MATH', series: '고1 수학' },
}

const MARK = /^(UNIT|단원|PASSAGE|지문|POINT|개념|공식|EXAMPLE|예제|Q|문제|WORD|단어|PROMPT|영작|정답)(?:\s+|$)(.*)$/i

function linesOf(body) {
  return body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function titleFrom(rows) {
  const head = []
  const rest = []
  for (const line of rows) {
    if (head.length < 2 && line.length <= 24 && !/[.?!。]$/.test(line) && !/^\d+[\.\)]/.test(line)) head.push(line)
    else rest.push(line)
  }
  return { title: head[0], subtitle: head[1] ?? '', rest }
}

function splitNumbered(rows) {
  const before = []
  const questions = []
  let current = null
  for (const line of rows) {
    const choice = line.match(/^[①②③④⑤]\s*(.+)$/)
    const numbered = line.match(/^(\d{1,2})[\.\)]\s+(.+)$/)
    const answer = line.match(/^정답\s+(.+)$/)
    if (numbered && !choice) {
      if (current) questions.push(current)
      current = { stem: numbered[2], choices: [] }
      continue
    }
    if (choice && current) {
      current.choices.push(choice[1])
      continue
    }
    if (answer && current) {
      current.answer = answer[1]
      continue
    }
    if (current && !current.choices.length) current.stem += ` ${line}`
    else if (!current) before.push(line)
  }
  if (current) questions.push(current)
  return { before, questions }
}

function wordLine(line) {
  const parts = line.split(/\s*(?:\||:|—|-)\s*/)
  if (parts.length >= 2 && /[A-Za-z]/.test(parts[0])) return { word: parts[0], meaning: parts.slice(1).join(' ') }
  const spaced = line.match(/^([A-Za-z][A-Za-z' -]{1,30})\s+(.+)$/)
  if (spaced && /[가-힣]/.test(spaced[2])) return { word: spaced[1].trim(), meaning: spaced[2].trim() }
  return null
}

function plainBook(body, kind, meta) {
  const rows = linesOf(body)
  const headed = titleFrom(rows)
  const { before, questions } = splitNumbered(headed.rest)
  const unit = {
    no: '01',
    title: headed.title || meta.series,
    subtitle: headed.subtitle,
    passage: [],
    points: [],
    questions: [],
    words: [],
  }
  if (kind === 'vocab') {
    for (const line of rows) {
      const word = wordLine(line)
      if (word) unit.words.push(word)
    }
  } else if (kind === 'writing') {
    unit.prompt = [...before, ...questions.map((q) => q.stem)].join(' ')
    unit.questions = questions
  } else if (kind === 'math') {
    const formula = before.filter((line) => /[=√^²³]/.test(line) || /[a-zA-Z]\d/.test(line))
    const prose = before.filter((line) => !formula.includes(line))
    if (formula.length || prose.length) {
      unit.points.push({ label: '공식', title: '', body: [...formula, ...prose].join(' ') })
    }
    unit.questions = questions
  } else if (kind === 'grammar') {
    const english = before.filter((line) => /[A-Za-z]/.test(line) && !/[가-힣]/.test(line))
    const korean = before.filter((line) => !english.includes(line))
    if (english[0]) unit.example = english[0]
    if (korean.length) unit.points.push({ label: '개념', title: '', body: korean.join(' ') })
    if (english.length > 1) unit.passage = english.slice(1)
    unit.questions = questions
  } else {
    unit.passage = before
    unit.questions = questions
  }
  return unit
}

function hasMarker(body) {
  return linesOf(body).some((line) => MARK.test(line) && !/^정답(?:\s|$)/.test(line) && !/^\d/.test(line))
}

export function extractBook(text, kind) {
  const body = String(text ?? '').replace(/\u0000/g, '').trim()
  if (body.replace(/\s/g, '').length < 20) {
    return { error: '텍스트 추출 불가/OCR 필요' }
  }
  const meta = KINDS[kind] ?? KINDS.grammar
  if (!hasMarker(body)) {
    const unit = plainBook(body, kind, meta)
    return finish(meta, kind, [unit])
  }
  const units = []
  let unit = null
  let mode = ''
  let question = null

  function ensureUnit() {
    if (!unit) {
      unit = { no: String(units.length + 1).padStart(2, '0'), title: meta.series, subtitle: '', passage: [], points: [], questions: [], words: [] }
      units.push(unit)
    }
    return unit
  }

  function closeQuestion() {
    if (question && unit) unit.questions.push(question)
    question = null
  }

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const mark = line.match(MARK)
    if (mark) {
      const tag = mark[1].toLowerCase()
      const rest = mark[2].trim()
      if (tag === 'unit' || tag === '단원') {
        closeQuestion()
        const numbered = rest.match(/^(\d+)\s+(.+)$/)
        const titlePart = numbered ? numbered[2] : rest
        const [title, subtitle = ''] = titlePart.split('|').map((part) => part.trim())
        unit = {
          no: numbered ? numbered[1].padStart(2, '0') : String(units.length + 1).padStart(2, '0'),
          title: title || meta.series,
          subtitle,
          passage: [],
          points: [],
          questions: [],
          words: [],
        }
        units.push(unit)
        mode = ''
        continue
      }
      ensureUnit()
      if (tag === 'passage' || tag === '지문') {
        closeQuestion()
        mode = 'passage'
        if (rest) unit.passage.push(rest)
        continue
      }
      if (tag === 'point' || tag === '개념' || tag === '공식') {
        closeQuestion()
        mode = 'point'
        unit.points.push({ label: tag === '공식' ? '공식' : '개념', title: '', body: rest })
        continue
      }
      if (tag === 'example' || tag === '예제') {
        closeQuestion()
        mode = 'example'
        unit.example = rest
        continue
      }
      if (tag === 'q' || tag === '문제') {
        closeQuestion()
        mode = 'q'
        question = { stem: rest, choices: [] }
        continue
      }
      if (tag === 'word' || tag === '단어') {
        closeQuestion()
        mode = 'word'
        const [word, meaning = ''] = rest.split(/\s*[|]\s*/)
        if (word) unit.words.push({ word, meaning })
        continue
      }
      if (tag === 'prompt' || tag === '영작') {
        closeQuestion()
        mode = 'prompt'
        unit.prompt = rest
        continue
      }
      if (tag === '정답') {
        if (question) question.answer = rest
        else if (unit.questions.length) unit.questions[unit.questions.length - 1].answer = rest
        mode = ''
        continue
      }
    }
    const current = ensureUnit()
    const choice = line.match(/^[①②③④⑤]\s*(.+)$/)
    if (choice && question) {
      question.choices.push(choice[1])
      continue
    }
    if (mode === 'passage') current.passage.push(line)
    else if (mode === 'point') current.points[current.points.length - 1].body += (current.points.at(-1).body ? ' ' : '') + line
    else if (mode === 'example') current.example = `${current.example ?? ''} ${line}`.trim()
    else if (mode === 'prompt') current.prompt = `${current.prompt ?? ''} ${line}`.trim()
    else if (mode === 'q' && question) question.stem = `${question.stem} ${line}`.trim()
    else if (mode === 'word') {
      const [word, meaning = ''] = line.split(/\s*[|]\s*/)
      if (word) current.words.push({ word, meaning })
    }
  }
  closeQuestion()
  if (!units.length) return { error: '본문에서 단원이나 문제를 나누지 못했습니다. 미리보기의 JSON을 확인해 주세요.' }

  return finish(meta, kind, units)
}

function finish(meta, kind, units) {
  return {
    grade: meta.grade,
    brand: 'HYPER',
    brandLine: meta.brandLine,
    series: meta.series,
    kind,
    units: units.map((item) => {
      const next = { ...item }
      if (!next.passage?.length) delete next.passage
      if (!next.points?.length) delete next.points
      if (!next.questions?.length) delete next.questions
      if (!next.words?.length) delete next.words
      if (!next.subtitle) delete next.subtitle
      for (const question of next.questions ?? []) {
        if (!question.answer) delete question.answer
      }
      return next
    }),
  }
}
