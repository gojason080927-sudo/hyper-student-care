/**
 * Production Grid 시간표 저장·DB·학부모 RPC 검증
 */
const SUPABASE_URL = 'https://pwuswjauzdxewmtgoitf.supabase.co'
const ANON_KEY = 'sb_publishable_KgfRTgnug7PXAzdZ9a7z0g_CfDpFwWZ'

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const TEST_GRID = {
  grade: '고1',
  class_name: '고1 수학A',
  template_type: 'mon-wed-fri-sat',
  time_labels: ['18:00', '', '', '', '', '', '', ''],
  cells: {
    '0:월': '18:00~20:00\n수학A\n김선영\n2강의실',
    '0:수': '18:00~20:00\n수학A',
    '0:금': '18:00~20:00\n수학A',
  },
  is_active: true,
  updated_at: new Date().toISOString(),
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers, ...options })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

async function rpc(name, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

function fail(msg) {
  console.error('FAIL:', msg)
  process.exitCode = 1
}

function pass(msg) {
  console.log('OK:', msg)
}

console.log('=== 1. Production 시간표 upsert (고1 수학A) ===')
const upsert = await rest('class_schedule_grids?on_conflict=grade,class_name', {
  method: 'POST',
  headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify(TEST_GRID),
})
if (!upsert.ok) {
  fail(`upsert failed: ${upsert.status} ${JSON.stringify(upsert.data)}`)
  process.exit(1)
}
pass(`upsert success id=${upsert.data?.[0]?.id}`)

console.log('\n=== 2. DB 저장 확인 ===')
const select = await rest(
  "class_schedule_grids?grade=eq.고1&class_name=eq.고1%20수학A&select=id,grade,class_name,template_type,time_labels,cells,is_active",
)
if (!select.ok || !Array.isArray(select.data) || select.data.length === 0) {
  fail(`select failed: ${select.status} ${JSON.stringify(select.data)}`)
} else {
  const row = select.data[0]
  if (row.template_type !== 'mon-wed-fri-sat') fail('template_type mismatch')
  else pass('template_type = mon-wed-fri-sat')
  if (row.cells?.['0:월']?.includes('수학A')) pass('cells[0:월] saved')
  else fail('cells content missing')
}

console.log('\n=== 3. 학부모 RPC — 고1 수학A 학생 ===')
const students = await rest(
  "students?grade=eq.고1&class_name=eq.고1%20수학A&status=eq.재원&access_key_active=eq.true&select=id,name,student_access_key,grade,class_name&limit=5",
)
if (!students.ok || !students.data?.length) {
  fail(`no active student found: ${JSON.stringify(students.data)}`)
} else {
  const student = students.data[0]
  pass(`student: ${student.name} (${student.id.slice(0, 8)}…)`)

  const bundle = await rpc('get_parent_care_bundle', {
    p_access_key: student.student_access_key,
  })
  if (!bundle.ok) {
    fail(`RPC failed: ${bundle.status} ${JSON.stringify(bundle.data)}`)
  } else {
    const grids = bundle.data?.class_schedule_grids ?? []
    const match = grids.find((g) => g.class_name === '고1 수학A')
    if (match) {
      pass(`RPC returned 고1 수학A grid (template=${match.template_type})`)
      if (match.cells?.['0:월']?.includes('수학A')) pass('RPC cells match saved data')
      else fail('RPC cells mismatch')
    } else {
      fail(`RPC grids: ${JSON.stringify(grids.map((g) => g.class_name))}`)
    }
  }
}

console.log('\n=== 4. 차단 확인 — 고1 수학B 학생 ===')
const studentB = await rest(
  "students?grade=eq.고1&class_name=eq.고1%20수학B&status=eq.재원&access_key_active=eq.true&select=id,name,student_access_key&limit=1",
)
if (studentB.data?.[0]) {
  const bundleB = await rpc('get_parent_care_bundle', {
    p_access_key: studentB.data[0].student_access_key,
  })
  const hasMathA = (bundleB.data?.class_schedule_grids ?? []).some(
    (g) => g.class_name === '고1 수학A',
  )
  if (hasMathA) fail('수학B student should NOT see 수학A grid')
  else pass('수학B student blocked from 수학A grid')
}

console.log('\nDone.', process.exitCode ? 'SOME TESTS FAILED' : 'ALL TESTS PASSED')
