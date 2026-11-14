import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('src/features/admissionAnalysis/data/official')
fs.mkdirSync(outDir, { recursive: true })

const SOURCE_NAME = '대입정보포털 어디가 (한국대학교육협의회)'

function uid(...parts) {
  return parts
    .join('_')
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140)
}

function fieldTrack(dept) {
  if (/간호|물리치료|방사선|작업치료|안경광학|응급구조|보건|언어치료|식품영양|스포츠의학|한의/.test(dept))
    return '보건'
  if (/교육|유아|특수교육/.test(dept)) return '교육'
  if (/경영|회계|무역|세무|경제|금융|호텔관광|글로벌비즈니스/.test(dept)) return '상경'
  if (
    /영어|국문|행정|사회|상담|복지|경찰|군사|철학|사학|중국|독어|불어|일어|미디어|국제관계|법학|문예|도시계획|자유전공/.test(
      dept,
    )
  )
    return '인문'
  if (/수학|통계|화학|물리|생명|환경|식품|산림|조경/.test(dept)) return '자연'
  if (
    /공학|컴퓨터|전자|전기|기계|건축|토목|화공|반도체|로봇|항공|소재|정보|ICT|MSDE|스마트|디지털/.test(
      dept,
    )
  )
    return '공학'
  return '기타'
}

/** @type {any[]} */
const records = []

const seoultech = JSON.parse(
  fs.readFileSync('scripts/_seoultech_parsed.json', 'utf8'),
)
const seoulUrl =
  'https://m.adiga.kr/mob/ucp/uvt/uni/univDetailSelection.do?menuId=MOUVTINF1001&searchSyr=2026&unvCd=0000036'
for (const r of seoultech) {
  const g50 = Number(r.grade50)
  const g70 = Number(r.grade70)
  if (!(g70 >= 1 && g70 <= 9)) continue
  records.push({
    id: uid('seoultech', '2025', '고교추천', r.name),
    universityName: '서울과학기술대학교',
    departmentName: r.name,
    admissionYear: 2025,
    admissionType: '학생부교과(고교추천전형)',
    admissionCategory: '학생부교과',
    gradeSystem: '9-grade',
    dataType: 'actual_admission_result',
    scoreType: 'grade',
    cutoff50: Number.isFinite(g50) ? g50 : null,
    cutoff70: g70,
    reflectedSubjects: ['전과목'],
    calculationNote:
      '어디가 공개 환산등급(최종등록자 교과성적). 대학별 산출방식으로 타 대학과 단순비교 불가.',
    region: '서울',
    fieldTrack: fieldTrack(r.name),
    sourceName: SOURCE_NAME,
    sourceUrl: seoulUrl,
    sourceYear: 2025,
    officialData: true,
    note: '2025학년도 전형 결과 · 어디가 대학 상세 페이지에서 확인',
  })
}

function parseGradeTableRows(text, startMarker, endMarker, mapper) {
  const i = text.indexOf(startMarker)
  if (i < 0) return
  const j = endMarker ? text.indexOf(endMarker, i + 1) : -1
  const chunk = text.slice(i, j > i ? j : i + 25000)
  for (const line of chunk.split('\n')) {
    if (
      !line.startsWith('|') ||
      line.includes('모집단위') ||
      line.includes('---') ||
      line.includes('50% cut') ||
      line.includes('70% cut')
    )
      continue
    const cells = line
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    if (cells.length < 9) continue
    const dept = cells[0]
    const g50 = Number(cells[cells.length - 2])
    const g70 = Number(cells[cells.length - 1])
    if (!dept || !Number.isFinite(g70) || g70 < 1 || g70 > 9) continue
    if (!Number.isFinite(g50) || g50 < 1 || g50 > 9) continue
    mapper(dept, g50, g70)
  }
}

const dongshinPath =
  'C:/Users/관리자/.cursor/projects/c-Users-Desktop-hyperstudentcare/agent-tools/bcaf3d5e-3826-45ab-a59c-6ca0315c451e.txt'
const dongshinText = fs.readFileSync(dongshinPath, 'utf8')
const dongshinUrl =
  'https://m.adiga.kr/mob/ucp/uvt/uni/univDetailSelection.do?menuId=MOUVTINF1001&searchSyr=2026&unvCd=0000104'

const dongshinBlocks = [
  ['| 모집단위 | 일반전형 |', '| 모집단위 | 면접전형 |', '학생부교과(일반전형)'],
  ['| 모집단위 | 면접전형 |', '| 모집단위 | 지역학생전형 |', '학생부교과(면접전형)'],
  [
    '| 모집단위 | 지역학생전형 |',
    '| 모집단위 | 지역학생기회균형전형 |',
    '학생부교과(지역학생전형)',
  ],
  [
    '| 모집단위 | 지역학생기회균형전형 |',
    '| 모집단위 | 성인학습자전형 |',
    '학생부교과(지역학생기회균형전형)',
  ],
]

for (const [start, end, type] of dongshinBlocks) {
  parseGradeTableRows(dongshinText, start, end, (dept, g50, g70) => {
    records.push({
      id: uid('dongshin', '2025', type, dept),
      universityName: '동신대학교',
      departmentName: dept,
      admissionYear: 2025,
      admissionType: type,
      admissionCategory: '학생부교과',
      gradeSystem: '9-grade',
      dataType: 'actual_admission_result',
      scoreType: 'grade',
      cutoff50: g50,
      cutoff70: g70,
      reflectedSubjects: ['국어', '수학', '영어', '과학', '사회', '한국사'],
      calculationNote:
        '동신대 어디가 공개: 반영교과 국·수·영·과·사·한국사. 대학별 산출 차이로 타교와 단순비교 불가.',
      region: '지방',
      fieldTrack: fieldTrack(dept),
      sourceName: SOURCE_NAME,
      sourceUrl: dongshinUrl,
      sourceYear: 2025,
      officialData: true,
      note: '2025학년도 전형 결과 · Ⅲ-2 어디가 공개표',
    })
  })
}

records.push({
  id: uid('dongshin', '2026', '일반전형', '보건행정학과'),
  universityName: '동신대학교',
  departmentName: '보건행정학과',
  admissionYear: 2026,
  admissionType: '학생부교과(일반전형)',
  admissionCategory: '학생부교과',
  gradeSystem: '9-grade',
  dataType: 'actual_admission_result',
  scoreType: 'grade',
  cutoff50: 4.7,
  cutoff70: 5.17,
  reflectedSubjects: ['국어', '수학', '영어', '과학', '사회', '한국사'],
  region: '지방',
  fieldTrack: '보건',
  sourceName: SOURCE_NAME,
  sourceUrl:
    'https://www.adiga.kr/ucp/cls/uni/classUnivAdmssPopup.do?ruCd=0014422&searchSyr=2026&unvCd=0000104',
  sourceYear: 2026,
  officialData: true,
  note: '2026학년도 입시결과 팝업(환산등급 50%/70% cut)',
})
records.push({
  id: uid('dongshin', '2026', '면접전형', '보건행정학과'),
  universityName: '동신대학교',
  departmentName: '보건행정학과',
  admissionYear: 2026,
  admissionType: '학생부교과(면접전형)',
  admissionCategory: '학생부교과',
  gradeSystem: '9-grade',
  dataType: 'actual_admission_result',
  scoreType: 'grade',
  cutoff50: 6.3,
  cutoff70: 6.57,
  reflectedSubjects: ['국어', '수학', '영어', '과학', '사회', '한국사'],
  region: '지방',
  fieldTrack: '보건',
  sourceName: SOURCE_NAME,
  sourceUrl:
    'https://www.adiga.kr/ucp/cls/uni/classUnivAdmssPopup.do?ruCd=0014422&searchSyr=2026&unvCd=0000104',
  sourceYear: 2026,
  officialData: true,
  note: '2026학년도 입시결과 팝업(환산등급 50%/70% cut)',
})

const changwonText = fs.readFileSync(
  'C:/Users/관리자/.cursor/projects/c-Users-Desktop-hyperstudentcare/agent-tools/809fa094-2d1c-4ff1-80f4-83abdaa8ce3d.txt',
  'utf8',
)
const changwonUrl =
  'https://m.adiga.kr/mob/ucp/uvt/uni/univDetailSelection.do?menuId=MOUVTINF1001&searchSyr=2026&unvCd=0000028'
parseGradeTableRows(
  changwonText,
  '| 모집단위 | 학업성적우수자전형 |',
  '| 모집단위 | 취업자전형 |',
  (dept, g50, g70) => {
    records.push({
      id: uid('changwon', '2025', '학업성적우수자', dept),
      universityName: '국립창원대학교',
      departmentName: dept,
      admissionYear: 2025,
      admissionType: '학생부교과(학업성적우수자전형)',
      admissionCategory: '학생부교과',
      gradeSystem: '9-grade',
      dataType: 'actual_admission_result',
      scoreType: 'grade',
      cutoff50: g50,
      cutoff70: g70,
      region: '지방',
      fieldTrack: fieldTrack(dept),
      sourceName: SOURCE_NAME,
      sourceUrl: changwonUrl,
      sourceYear: 2025,
      officialData: true,
      note: '2025학년도 전형 결과 · Ⅲ-2 어디가 공개표',
    })
  },
)

// Gachon: 70%/90% only — parse from desktop dump with clearer structure
const gachonDesktop = fs.readFileSync(
  'C:/Users/관리자/.cursor/projects/c-Users-Desktop-hyperstudentcare/agent-tools/783b4cca-3ea7-4905-8a50-febad566672c.txt',
  'utf8',
)
const gachonUrl =
  'https://m.adiga.kr/mob/ucp/uvt/uni/univDetailSelection.do?menuId=MOUVTINF1001&searchSyr=2026&unvCd=0000063'
const gLines = gachonDesktop.split(/\r?\n/).map((l) => l.trim())
const gStart = gLines.findIndex((l) =>
  l.includes('지역균형 전형(2025학년도 1단계전형방법'),
)
let i = gStart + 1
while (i < gLines.length && gLines[i] !== '경영학부') i++
while (i < gLines.length) {
  const name = gLines[i]
  if (
    !name ||
    name.startsWith('모집단위') ||
    name.startsWith('학생부') ||
    name.startsWith('■') ||
    name.startsWith('※') ||
    name.startsWith('Q ') ||
    name.startsWith('[') ||
    name.includes('Cut') ||
    name.includes('인원') ||
    name.includes('순위') ||
    name.includes('경쟁')
  ) {
    if (name.startsWith('■') || name.startsWith('학생부우수') || name.startsWith('Q ')) break
    i++
    continue
  }
  const nums = []
  let j = i + 1
  while (j < gLines.length && nums.length < 5) {
    const t = gLines[j]
    if (t === '') {
      j++
      continue
    }
    if (/^[0-9]+(\.[0-9]+)?$/.test(t)) {
      nums.push(Number(t))
      j++
    } else break
  }
  // enroll, competition, waitlist, cut70, cut90
  if (nums.length >= 5) {
    const g70 = nums[3]
    if (g70 >= 1 && g70 <= 9) {
      records.push({
        id: uid('gachon', '2025', '지역균형', name),
        universityName: '가천대학교',
        departmentName: name,
        admissionYear: 2025,
        admissionType: '학생부교과(지역균형전형)',
        admissionCategory: '학생부교과',
        gradeSystem: '9-grade',
        dataType: 'actual_admission_result',
        scoreType: 'grade',
        cutoff50: null,
        cutoff70: g70,
        calculationNote:
          '어디가 공개 최종등록자 교과성적 학생부등급 70% cut. 50% cut 미공개. 가천대 산출방식으로 타교와 단순비교 불가.',
        region: '경기/인천',
        fieldTrack: fieldTrack(name),
        sourceName: SOURCE_NAME,
        sourceUrl: gachonUrl,
        sourceYear: 2025,
        officialData: true,
        note: '2025학년도 전형 결과 · 어디가(50%컷 미공개)',
      })
    }
  }
  i = Math.max(j, i + 1)
  if (records.filter((r) => r.universityName === '가천대학교').length > 120) break
}

const seen = new Set()
const unique = []
for (const r of records) {
  const key = [r.universityName, r.departmentName, r.admissionType, r.admissionYear].join('|')
  if (seen.has(key)) continue
  seen.add(key)
  unique.push(r)
}

const meta = {
  generatedAt: new Date().toISOString(),
  sourcePriority: [
    '대입정보포털 어디가',
    '대학 공식 입학처',
    '한국대학교육협의회',
    '교육부',
  ],
  universities: [...new Set(unique.map((r) => r.universityName))],
  recordCount: unique.length,
  withCutoff70: unique.filter((r) => r.cutoff70 != null).length,
  withCutoff50: unique.filter((r) => r.cutoff50 != null).length,
  note: '공식 출처에서 직접 확인한 레코드만 포함. AI 추정·학원 재가공 수치 없음.',
}

fs.writeFileSync(
  path.join(outDir, 'officialAdmissionResults.json'),
  JSON.stringify({ meta, records: unique }, null, 2),
  'utf8',
)
console.log(JSON.stringify(meta, null, 2))
