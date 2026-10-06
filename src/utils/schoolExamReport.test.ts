/**
 * 실행: npx tsx src/utils/schoolExamReport.test.ts
 * 학교 시험 리포트 — 패키지 가져오기·점수·요약 분할·쪽 나누기·SQL 이미지 공개 가드
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildSchoolReportView,
  calcSchoolScore,
  examLevel,
  imageNoFromFileName,
  paginateCards,
  parseAnalysisPackage,
  splitForSummary,
  type SchoolReportData,
} from './schoolExamReport'

const pkgRaw = JSON.parse(readFileSync('src/dev/schoolExamSample/analysis-package.json', 'utf8'))
const pkg = parseAnalysisPackage(pkgRaw)

// 패키지: 30문항, 균등 배점 → 총점 100 으로 보정
assert.equal(pkg.items.length, 30)
assert.equal(Math.round(pkg.items.reduce((s, i) => s + i.points, 0)), 100)
assert.equal(pkg.items[0].recommendedCause, 'calc')
assert.equal(pkg.items[1].recommendedCause, 'concept')
assert.equal(pkg.school, '')

// 점수: 맞힌 문항 배점 합계 — 샘플 채점(18오답=12정답)은 40점
const wrong = pkgRaw.student_sample.wrong as number[]
assert.equal(calcSchoolScore(pkg.items, wrong), 40)
assert.equal(calcSchoolScore(pkg.items, []), 100)

// 이미지 파일명 매칭
assert.equal(imageNoFromFileName('q01.jpg'), 1)
assert.equal(imageNoFromFileName('C:\\x\\q30.JPG'), 30)
assert.equal(imageNoFromFileName('cover.jpg'), null)

// 통계
const data: SchoolReportData = {
  exam: {
    id: 'x', grade: pkg.grade, schoolName: '', title: pkg.title, subject: pkg.subject, examDate: pkg.date, author: '',
    rangeText: '', totalPoints: 100, items: pkg.items, units: pkg.units, topProblems: pkg.topProblems,
    sourceStudentId: null, imagesClean: false, packageImportedAt: null,
  },
  result: { score: 40, wrongItems: wrong.map((no) => ({ no, cause: 'calc', note: '' })), teacherComment: '', nextPlan: [], sentAt: null },
}
const view = buildSchoolReportView(data)
assert.equal(view.correctCount, 12)
assert.equal(view.wrongCount, 18)
assert.equal(view.hardCount, 9)
assert.equal(view.levelLabel, '중상')
assert.equal(examLevel(40).label, '상')
assert.equal(view.units.reduce((s, u) => s + u.percent, 0) >= 99, true)

// 요약: 난이도 높은 오답 6개만 카드, 나머지 표
const sum = splitForSummary(data.result.wrongItems, pkg.items)
assert.equal(sum.cards.length, 6)
assert.equal(sum.rest.length, 12)
const rank = (no: number) => ['하', '중', '상', '최상'].indexOf(pkg.items.find((i) => i.no === no)!.difficulty)
assert.ok(Math.min(...sum.cards.map((c) => rank(c.no))) >= Math.max(...sum.rest.map((c) => rank(c.no))))

// 쪽 나누기: 카드는 쪽을 넘지 않고, 쪽당 최대 4개, 총평은 항상 마지막 쪽
const opt = { firstCap: 242, laterCap: 256, gap: 3.6, maxPerPage: 4 }
const pages = paginateCards(Array(10).fill(60), 55, opt)
assert.ok(pages.every((p) => p.cardIdx.length <= 4))
assert.equal(pages.flatMap((p) => p.cardIdx).length, 10)
assert.equal(pages.filter((p) => p.notes).length, 1)
assert.ok(pages[pages.length - 1].notes)
// 큰 카드(95mm)는 쪽당 2개, 경계에서 쪼개지 않음
const big = paginateCards(Array(5).fill(95), 55, opt)
assert.ok(big.every((p) => p.cardIdx.length <= 2))
// 틀린 문항 0개 → 총평 쪽 1개
assert.deepEqual(paginateCards([], 55, opt), [{ cardIdx: [], notes: true, first: true }])
// 마지막 카드 쪽에 총평이 안 들어가면 새 쪽
const tight = paginateCards([200], 60, opt)
assert.equal(tight.length, 2)
assert.equal(tight[1].notes, true)

// SQL: 이미지는 clean 이거나 본인 시험지일 때만, 표는 anon 차단, 이미지 RPC는 오답+1등급 번호만
const sql = readFileSync('supabase/school-exam-report-v1-migration.sql', 'utf8')
assert.match(sql, /images_clean OR v_exam\.source_student_id = v_student_id/)
assert.match(sql, /REVOKE ALL ON public\.school_exam_images FROM PUBLIC, anon/)
assert.match(sql, /REVOKE ALL ON public\.school_exams FROM PUBLIC, anon/)
assert.match(sql, /REVOKE ALL ON public\.school_exam_results FROM PUBLIC, anon/)
assert.match(sql, /_parent_active_student_id\(p_access_key\)/)
assert.match(sql, /NOT r\.cause_confirmed/)
assert.ok(!/DROP TABLE|ALTER TABLE public\.(math_|students|monthly_)/.test(sql))
assert.ok(!/\bAI\b/.test(readFileSync('src/components/schoolExam/SchoolExamReport.tsx', 'utf8').replace(/AI 분석을/g, '')))

console.log('schoolExamReport tests passed')
