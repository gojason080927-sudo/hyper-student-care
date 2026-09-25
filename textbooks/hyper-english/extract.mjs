/** Turn extracted textbook text into the existing book JSON. No new schema. */

const KINDS = {
  reading: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 독해' },
  grammar: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 문법편' },
  vocab: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 단어' },
  writing: { grade: 'g3', brandLine: 'ENGLISH', series: '고3 영작' },
  math: { grade: 'g1', brandLine: 'MATH', series: '고1 수학' },
}

const MARK = /^(UNIT|단원|PASSAGE|지문|POINT|개념|공식|EXAMPLE|예제|Q|문제|WORD|단어|PROMPT|영작|정답)(?:\s+|$)(.*)$/i

export function extractBook(text, kind) {
  const body = String(text ?? '').replace(/\u0000/g, '').trim()
  if (body.replace(/\s/g, '').length < 20) {
    return { error: '텍스트 추출 불가/OCR 필요' }
  }
  const meta = KINDS[kind] ?? KINDS.grammar
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
  if (!units.length) return { error: '단원이나 문제를 찾지 못했습니다. UNIT / Q 표시를 확인해 주세요.' }

  return {
    grade: meta.grade,
    brand: 'HYPER',
    brandLine: meta.brandLine,
    series: meta.series,
    kind,
    units: units.map((item) => {
      const next = { ...item }
      if (!next.passage.length) delete next.passage
      if (!next.points.length) delete next.points
      if (!next.questions.length) delete next.questions
      if (!next.words.length) delete next.words
      if (!next.subtitle) delete next.subtitle
      return next
    }),
  }
}
