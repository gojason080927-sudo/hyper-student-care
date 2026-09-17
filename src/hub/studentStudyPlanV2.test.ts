/**
 * 실행: npx tsx src/hub/studentStudyPlanV2.test.ts
 *
 * My Study Plan V2 — 3-state · 48h KST auto-fail · weekly rate · isolation · HOME freeze.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import {
  canChangeStudyPlanResult,
  canDeleteStudyPlan,
  canMutateStudyPlan,
  computeWeeklyAchievement,
  effectiveStudyPlanResult,
  isStudyPlanResultLocked,
  isStudyPlanScheduleLocked,
  planDeadlineUtcMs,
  planEndAtUtcMs,
  rejectDeletedStudyPlan,
  roundedStudyPlanPercent,
  startOfWeekMonday,
  storedStudyPlanResult,
  studyPlanErrorMessage,
  studyPlanRateBand,
  todayInSeoul,
  weekDatesFromMonday,
  weeklyRateTitle,
} from './studyPlan.ts'
import type { StudentStudyPlan, StudyPlanResult } from './types.ts'

const v1Sql = readFileSync('supabase/student-study-plans-v1-migration.sql')
const v2Sql = readFileSync('supabase/student-study-plans-v2-status-weekly.sql', 'utf8')
const home = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const page = readFileSync('src/hub/HubStudyPlanPage.tsx', 'utf8')
const rpc = readFileSync('src/hub/hubRpc.ts', 'utf8')
const css = readFileSync('src/hub/hub.css', 'utf8')
const voice = readFileSync('api/voice-transcribe.ts', 'utf8')
const hubStorage = readFileSync('api/hub-storage.ts', 'utf8')
const voiceDir = readFileSync('src/utils/voiceInput/recordedStt.test.ts', 'utf8')

function plan(partial: Partial<StudentStudyPlan> & Pick<StudentStudyPlan, 'id' | 'result'>): StudentStudyPlan {
  return {
    planDate: '2026-09-17',
    subject: '수학',
    content: '본문',
    startTime: '19:00:00',
    endTime: '20:00:00',
    completed: partial.result === 'completed',
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
    ...partial,
    completed: partial.completed ?? (partial.result === 'completed'),
  }
}

function many(count: number, result: StudyPlanResult, date = '2026-09-17'): StudentStudyPlan[] {
  return Array.from({ length: count }, (_, index) =>
    plan({ id: `${result}-${date}-${index}`, result, planDate: date }),
  )
}

const noonKst = Date.parse('2026-09-17T12:00:00+09:00')
const weekStart = startOfWeekMonday('2026-09-17')

// ---------------------------------------------------------------------------
// V1 file must stay frozen. Additive V2 SQL only.
// ---------------------------------------------------------------------------
assert.equal(
  createHash('sha256').update(v1Sql).digest('hex'),
  '24370cb946c29b788675e7297ba526f14cfafae1560c8329b4aa83b3a0ace6f4',
)
assert.doesNotMatch(v2Sql, /^\s*DROP TABLE/im)
assert.doesNotMatch(v2Sql, /^\s*TRUNCATE/im)
assert.doesNotMatch(v2Sql, /CREATE OR REPLACE FUNCTION public\.get_parent_care_bundle/)
assert.doesNotMatch(v2Sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(v2Sql, /CREATE OR REPLACE FUNCTION public\.get_student_hub_bundle/)
assert.doesNotMatch(v2Sql, /CREATE OR REPLACE FUNCTION public\.get_student_hub_identity/)
assert.doesNotMatch(v2Sql, /\bp_student_id\b/)
assert.doesNotMatch(v2Sql, /GRANT SELECT[\s\S]{0,80}student_study_plans TO anon/)
assert.doesNotMatch(v2Sql, /GRANT SELECT[\s\S]{0,80}student_study_plans TO authenticated/)
assert.doesNotMatch(v2Sql, /CREATE POLICY[\s\S]{0,180}FOR INSERT\s+TO anon/)
assert.match(v2Sql, /ADD COLUMN IF NOT EXISTS result TEXT/)
assert.match(v2Sql, /WHEN completed THEN 'completed' ELSE 'pending'/)
assert.doesNotMatch(v2Sql, /WHEN completed THEN 'completed' ELSE 'failed'/)
assert.match(v2Sql, /AT TIME ZONE 'Asia\/Seoul'/)
assert.match(v2Sql, /interval '48 hours'/)
assert.match(v2Sql, /p_now >= public\._study_plan_deadline_at/)
assert.match(v2Sql, /GRANT EXECUTE ON FUNCTION public\.set_student_study_plan_result\(text, uuid, text\) TO anon/)
assert.match(v2Sql, /REVOKE ALL ON FUNCTION public\._study_plan_effective_result\(text, date, time, timestamptz\) FROM anon/)
assert.match(v2Sql, /REVOKE ALL ON FUNCTION public\._study_plan_deadline_at\(date, time\) FROM anon/)
assert.match(v2Sql, /REVOKE ALL ON TABLE public\.student_study_plans FROM anon/)
assert.match(v2Sql, /v_student_id := public\._parent_active_student_id\(p_access_key\)/)
assert.match(v2Sql, /SET search_path = public/)
assert.match(v2Sql, /SECURITY DEFINER/)
assert.match(v2Sql, /true → completed/)
assert.match(v2Sql, /RAISE EXCEPTION 'plan_not_deletable'/)
assert.match(v2Sql, /RAISE EXCEPTION 'schedule_locked'/)
assert.match(v2Sql, /_study_plan_is_deletable/)
assert.match(v2Sql, /_study_plan_schedule_locked/)
assert.match(v2Sql, /CREATE OR REPLACE FUNCTION public\.delete_student_study_plan/)
assert.doesNotMatch(v2Sql, /DELETE FROM public\.student_study_plans p\s+WHERE p\.plan_date/)
assert.equal(v2Sql.includes('pg_cron'), false)
assert.equal(v2Sql.includes('cron.schedule'), false)

assert.match(rpc, /set_student_study_plan_result/)
assert.match(rpc, /p_access_key: accessKey.trim\(\)/)
assert.doesNotMatch(rpc, /p_student_id/)
assert.doesNotMatch(page, /student_id/)
assert.match(page, /rpcSetStudentStudyPlanResult\(accessKey/)
assert.match(page, /data-result-completed/)
assert.match(page, /data-result-failed/)
assert.doesNotMatch(page, /미실행/)
assert.doesNotMatch(page, /보류/)
assert.doesNotMatch(page, /미정/)
assert.match(readFileSync('src/hub/studyPlan.ts', 'utf8'), /아직 평가할 계획이 없어요/)
assert.match(css, /\.hub-rate-card/)
assert.match(css, /\.hub-result-btn/)
assert.match(css, /\.hub-check\.is-on svg/)

assert.doesNotMatch(home, /hub-rate-card/)
assert.doesNotMatch(home, /set_student_study_plan_result/)
assert.doesNotMatch(home, /이러다 나락가요/)
assert.match(home, /hub-hero/)
assert.match(home, /grid-cols-3/)
assert.match(home, /hub-feature-card/)
assert.match(home, /HUB_ACADEMY_LOGO_WEBP/)

assert.equal(voice.includes('student_study_plans'), false)
assert.equal(hubStorage.includes('student_study_plans'), false)
assert.equal(voiceDir.includes('HubStudyPlanPage'), false)
assert.equal(voiceDir.includes('set_student_study_plan_result'), false)

assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'B', planId: 'p1', requestedPlanId: 'p1' }), false)
assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'A', planId: 'p1', requestedPlanId: 'p1' }), true)

assert.equal(startOfWeekMonday('2026-09-17'), '2026-09-14')
assert.deepEqual(weekDatesFromMonday('2026-09-14'), [
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
])
assert.equal(weeklyRateTitle('2026-09-14', '2026-09-17'), '이번 주 달성률')
assert.equal(weeklyRateTitle('2026-09-07', '2026-09-17'), '지난 주 달성률')
assert.equal(weeklyRateTitle('2026-09-21', '2026-09-17'), '다음 주 달성률')

// ---------------------------------------------------------------------------
// A. status
// ---------------------------------------------------------------------------
assert.equal(storedStudyPlanResult(plan({ id: 'a1', result: 'pending' })), 'pending')
assert.equal(storedStudyPlanResult(plan({ id: 'a2', result: 'completed' })), 'completed')
assert.equal(storedStudyPlanResult(plan({ id: 'a3', result: 'failed' })), 'failed')
assert.equal(effectiveStudyPlanResult(plan({ id: 'a4', result: 'completed' }), noonKst), 'completed')
assert.equal(effectiveStudyPlanResult(plan({ id: 'a5', result: 'failed' }), noonKst), 'failed')
assert.equal(effectiveStudyPlanResult(plan({ id: 'a6', result: 'pending' }), noonKst), 'pending')
assert.equal(
  storedStudyPlanResult({ result: undefined as unknown as StudyPlanResult, completed: true }),
  'completed',
)
assert.equal(
  storedStudyPlanResult({ result: undefined as unknown as StudyPlanResult, completed: false }),
  'pending',
)

// ---------------------------------------------------------------------------
// B. 48h boundary  C. timezone (KST, end_time not start_time)
// ---------------------------------------------------------------------------
const endMs = planEndAtUtcMs('2026-09-17', '20:00:00')
const deadline = planDeadlineUtcMs('2026-09-17', '20:00:00')
assert.equal(endMs, Date.parse('2026-09-17T20:00:00+09:00'))
assert.equal(deadline, Date.parse('2026-09-19T20:00:00+09:00'))
assert.equal(new Date(deadline ?? 0).toISOString(), '2026-09-19T11:00:00.000Z')
assert.equal(planDeadlineUtcMs('2026-09-17', '19:00:00'), Date.parse('2026-09-19T19:00:00+09:00'))

const pendingPlan = plan({ id: 'b1', result: 'pending', planDate: '2026-09-17', endTime: '20:00:00' })
assert.equal(effectiveStudyPlanResult(pendingPlan, (deadline ?? 0) - 60_000), 'pending')
assert.equal(isStudyPlanResultLocked(pendingPlan, (deadline ?? 0) - 60_000), false)
assert.equal(effectiveStudyPlanResult(pendingPlan, deadline ?? 0), 'failed')
assert.equal(isStudyPlanResultLocked(pendingPlan, deadline ?? 0), true)
assert.equal(effectiveStudyPlanResult(pendingPlan, (deadline ?? 0) + 60_000), 'failed')
assert.equal(effectiveStudyPlanResult(plan({ id: 'b2', result: 'completed', endTime: '20:00:00' }), (deadline ?? 0) + 60_000), 'completed')
assert.equal(effectiveStudyPlanResult(plan({ id: 'b3', result: 'failed', endTime: '20:00:00' }), (deadline ?? 0) - 60_000), 'failed')

assert.equal(todayInSeoul(Date.parse('2026-09-17T00:30:00+09:00')), '2026-09-17')
assert.equal(todayInSeoul(Date.parse('2026-09-16T23:30:00Z')), '2026-09-17')
assert.equal(todayInSeoul(Date.parse('2026-09-16T14:30:00Z')), '2026-09-16')

// ---------------------------------------------------------------------------
// D. weekly rate rounding + bands
// ---------------------------------------------------------------------------
assert.equal(roundedStudyPlanPercent(9, 10), 90)
assert.equal(studyPlanRateBand(90), 'great')
assert.equal(roundedStudyPlanPercent(8, 9), 89)
assert.equal(studyPlanRateBand(89), 'try_more')
assert.equal(roundedStudyPlanPercent(5, 10), 50)
assert.equal(studyPlanRateBand(50), 'danger')
assert.equal(roundedStudyPlanPercent(49, 100), 49)
assert.equal(studyPlanRateBand(49), 'fall')
assert.equal(studyPlanRateBand(100), 'great')
assert.equal(studyPlanRateBand(80), 'try_more')
assert.equal(studyPlanRateBand(79), 'lack')
assert.equal(studyPlanRateBand(70), 'lack')
assert.equal(studyPlanRateBand(69), 'trouble')
assert.equal(studyPlanRateBand(60), 'trouble')
assert.equal(studyPlanRateBand(59), 'danger')
assert.equal(studyPlanRateBand(0), 'fall')

const nineOfTen = computeWeeklyAchievement({
  plans: [...many(9, 'completed'), ...many(1, 'failed')],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(nineOfTen.percent, 90)
assert.equal(nineOfTen.band, 'great')
assert.equal(nineOfTen.message, '좋아요')

const eightOfNine = computeWeeklyAchievement({
  plans: [...many(8, 'completed'), ...many(1, 'failed')],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(eightOfNine.percent, 89)
assert.equal(eightOfNine.band, 'try_more')
assert.equal(eightOfNine.message, '좀 더 노력해요')

const fiveOfTen = computeWeeklyAchievement({
  plans: [...many(5, 'completed'), ...many(5, 'failed')],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(fiveOfTen.percent, 50)
assert.equal(fiveOfTen.band, 'danger')
assert.equal(fiveOfTen.message, '위험해요')

const fortyNine = computeWeeklyAchievement({
  plans: [...many(49, 'completed'), ...many(51, 'failed')],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(fortyNine.percent, 49)
assert.equal(fortyNine.band, 'fall')
assert.equal(fortyNine.message, '이러다 나락가요')

const empty = computeWeeklyAchievement({
  plans: [],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(empty.percent, null)
assert.equal(empty.band, 'neutral')
assert.equal(empty.message, '아직 평가할 계획이 없어요')
assert.equal(empty.judgedCount, 0)

const onlyPending = computeWeeklyAchievement({
  plans: many(3, 'pending'),
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(onlyPending.percent, null)
assert.equal(onlyPending.band, 'neutral')
assert.equal(onlyPending.pendingGraceCount, 3)

// ---------------------------------------------------------------------------
// E. pending exclusion  6 completed + 2 failed + 2 grace pending → 75%
// ---------------------------------------------------------------------------
const mixed = computeWeeklyAchievement({
  plans: [
    ...many(6, 'completed'),
    ...many(2, 'failed'),
    ...many(2, 'pending'),
  ],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(mixed.completedCount, 6)
assert.equal(mixed.failedCount, 2)
assert.equal(mixed.pendingGraceCount, 2)
assert.equal(mixed.judgedCount, 8)
assert.equal(mixed.percent, 75)
assert.equal(mixed.band, 'lack')
assert.equal(mixed.message, '부족해요')

const autoFailed = computeWeeklyAchievement({
  plans: [
    ...many(6, 'completed'),
    ...many(2, 'failed'),
    plan({ id: 'late-1', result: 'pending', planDate: '2026-09-14', endTime: '20:00:00' }),
    plan({ id: 'late-2', result: 'pending', planDate: '2026-09-14', endTime: '20:00:00' }),
  ],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(autoFailed.failedCount, 4)
assert.equal(autoFailed.judgedCount, 10)
assert.equal(autoFailed.percent, 60)
assert.equal(autoFailed.message, '곤란해요')

// ---------------------------------------------------------------------------
// F. unjudged future plans exclusion; judged later-in-week plans count immediately
// ---------------------------------------------------------------------------
const withFuturePending = computeWeeklyAchievement({
  plans: [
    ...many(2, 'completed', '2026-09-17'),
    ...many(2, 'pending', '2026-09-18'),
    ...many(2, 'pending', '2026-09-19'),
  ],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(withFuturePending.completedCount, 2)
assert.equal(withFuturePending.failedCount, 0)
assert.equal(withFuturePending.futureCount, 4)
assert.equal(withFuturePending.percent, 100)
assert.equal(withFuturePending.message, '좋아요')

const withJudgedLaterDays = computeWeeklyAchievement({
  plans: [
    ...many(2, 'completed', '2026-09-17'),
    ...many(2, 'completed', '2026-09-18'),
    ...many(2, 'failed', '2026-09-19'),
  ],
  weekStart,
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(withJudgedLaterDays.completedCount, 4)
assert.equal(withJudgedLaterDays.failedCount, 2)
assert.equal(withJudgedLaterDays.futureCount, 0)
assert.equal(withJudgedLaterDays.judgedCount, 6)
assert.equal(withJudgedLaterDays.percent, 67)
assert.equal(withJudgedLaterDays.message, '곤란해요')

assert.equal(studyPlanErrorMessage({ message: 'result_locked' }), '종료 후 48시간이 지나 결과를 바꿀 수 없습니다.')
assert.equal(studyPlanErrorMessage({ message: 'schedule_locked' }), '종료된 계획의 날짜와 시간은 바꿀 수 없습니다.')
assert.equal(studyPlanErrorMessage({ message: 'plan_not_deletable' }), '확정된 계획은 삭제할 수 없습니다.')
assert.equal(studyPlanErrorMessage({ message: 'invalid_result' }), '올바른 결과가 아닙니다.')

assert.match(page, /data-plan-delete/)
assert.match(page, /canDeleteStudyPlan/)
assert.match(page, /isStudyPlanScheduleLocked/)
assert.doesNotMatch(home, /plan_not_deletable/)

// ---------------------------------------------------------------------------
// Integrity: delete / schedule freeze / result transitions / past week
// ---------------------------------------------------------------------------
const beforeEnd = Date.parse('2026-09-17T19:59:00+09:00')
const afterEnd = Date.parse('2026-09-17T20:01:00+09:00')
const pendingLive = plan({ id: 'pend-live', result: 'pending' })
const completedLive = plan({ id: 'done-live', result: 'completed' })
const failedLive = plan({ id: 'fail-live', result: 'failed' })
const autoFail = plan({ id: 'auto-fail', result: 'pending' })

assert.equal(canDeleteStudyPlan(pendingLive, beforeEnd), true)
assert.equal(isStudyPlanScheduleLocked(pendingLive, beforeEnd), false)
assert.equal(canDeleteStudyPlan(completedLive, beforeEnd), false)
assert.equal(canDeleteStudyPlan(failedLive, beforeEnd), false)
assert.equal(canDeleteStudyPlan(autoFail, deadline ?? 0), false)
assert.equal(canDeleteStudyPlan(pendingLive, afterEnd), true)
assert.equal(isStudyPlanScheduleLocked(pendingLive, afterEnd), true)
assert.equal(isStudyPlanScheduleLocked(completedLive, beforeEnd), true)

assert.equal(canChangeStudyPlanResult(pendingLive, 'completed', beforeEnd), true)
assert.equal(canChangeStudyPlanResult(pendingLive, 'failed', beforeEnd), true)
assert.equal(canChangeStudyPlanResult(completedLive, 'failed', beforeEnd), true)
assert.equal(canChangeStudyPlanResult(failedLive, 'completed', beforeEnd), true)
assert.equal(canChangeStudyPlanResult(pendingLive, 'completed', afterEnd), true)
assert.equal(canChangeStudyPlanResult(autoFail, 'completed', deadline ?? 0), false)
assert.equal(canChangeStudyPlanResult(completedLive, 'failed', deadline ?? 0), false)

const judged = [...many(5, 'completed'), completedLive, failedLive, ...many(1, 'failed'), pendingLive]
const afterFailedDelete = rejectDeletedStudyPlan(judged, failedLive.id, noonKst)
assert.equal(afterFailedDelete.length, judged.length)
assert.equal(
  computeWeeklyAchievement({ plans: afterFailedDelete, weekStart, today: '2026-09-17', nowMs: noonKst }).judgedCount,
  computeWeeklyAchievement({ plans: judged, weekStart, today: '2026-09-17', nowMs: noonKst }).judgedCount,
)
const afterCompletedDelete = rejectDeletedStudyPlan(judged, completedLive.id, noonKst)
assert.equal(
  computeWeeklyAchievement({ plans: afterCompletedDelete, weekStart, today: '2026-09-17', nowMs: noonKst }).completedCount,
  computeWeeklyAchievement({ plans: judged, weekStart, today: '2026-09-17', nowMs: noonKst }).completedCount,
)
const afterPendingDelete = rejectDeletedStudyPlan(judged, pendingLive.id, noonKst)
assert.equal(afterPendingDelete.length, judged.length - 1)

const lastWeek = computeWeeklyAchievement({
  plans: [...many(3, 'completed', '2026-09-07'), ...many(1, 'failed', '2026-09-08')],
  weekStart: '2026-09-07',
  today: '2026-09-17',
  nowMs: noonKst,
})
assert.equal(lastWeek.title, '지난 주 달성률')
assert.equal(lastWeek.percent, 75)
assert.equal(lastWeek.message, '부족해요')
assert.equal(weeklyRateTitle('2026-09-07', '2026-09-17'), '지난 주 달성률')

assert.equal(canMutateStudyPlan({ actorStudentId: 'A', planOwnerStudentId: 'B', planId: 'p1', requestedPlanId: 'p1' }), false)

// ---------------------------------------------------------------------------
// Device repro: judge Mon/Thu, then add+judge next day in the same week.
// Weekly counts must update immediately without waiting for that date to become today.
// ---------------------------------------------------------------------------
const todayKst = '2026-09-17'
const sameWeek = startOfWeekMonday(todayKst)
assert.equal(sameWeek, '2026-09-14')
assert.deepEqual(weekDatesFromMonday(sameWeek), [
  '2026-09-14',
  '2026-09-15',
  '2026-09-16',
  '2026-09-17',
  '2026-09-18',
  '2026-09-19',
  '2026-09-20',
])

let livePlans: StudentStudyPlan[] = [
  ...many(2, 'completed', '2026-09-17'),
  ...many(1, 'failed', '2026-09-17'),
]
const afterThu = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: sameWeek,
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterThu.completedCount, 2)
assert.equal(afterThu.judgedCount, 3)
assert.equal(afterThu.percent, 67)

livePlans = [
  ...livePlans,
  plan({ id: 'fri-pending-1', result: 'pending', planDate: '2026-09-18' }),
  plan({ id: 'fri-pending-2', result: 'pending', planDate: '2026-09-18' }),
  plan({ id: 'fri-pending-3', result: 'pending', planDate: '2026-09-18' }),
]
assert.equal(
  computeWeeklyAchievement({ plans: livePlans, weekStart: sameWeek, today: todayKst, nowMs: noonKst }).judgedCount,
  3,
)

function applyStoredResult(
  rows: StudentStudyPlan[],
  id: string,
  result: Extract<StudyPlanResult, 'completed' | 'failed'>,
): StudentStudyPlan[] {
  return rows.map((item) =>
    item.id === id ? { ...item, result, completed: result === 'completed' } : item,
  )
}

livePlans = applyStoredResult(livePlans, 'fri-pending-1', 'completed')
const afterFirstFri = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: sameWeek,
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterFirstFri.completedCount, 3)
assert.equal(afterFirstFri.failedCount, 1)
assert.equal(afterFirstFri.judgedCount, 4)
assert.equal(afterFirstFri.percent, 75)

livePlans = applyStoredResult(livePlans, 'fri-pending-2', 'completed')
const afterSecondFri = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: sameWeek,
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterSecondFri.completedCount, 4)
assert.equal(afterSecondFri.judgedCount, 5)
assert.equal(afterSecondFri.percent, 80)

livePlans = applyStoredResult(livePlans, 'fri-pending-3', 'failed')
const afterFriJudged = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: sameWeek,
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterFriJudged.completedCount, 4)
assert.equal(afterFriJudged.failedCount, 2)
assert.equal(afterFriJudged.judgedCount, 6)
assert.equal(afterFriJudged.percent, 67)
assert.equal(afterFriJudged.futureCount, 0)
assert.equal(afterFriJudged.pendingGraceCount, 0)

assert.equal(startOfWeekMonday('2026-09-18'), sameWeek)
const afterNavToFri = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: startOfWeekMonday('2026-09-18'),
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterNavToFri.completedCount, 4)
assert.equal(afterNavToFri.judgedCount, 6)
assert.equal(afterNavToFri.percent, 67)

const afterRefresh = computeWeeklyAchievement({
  plans: livePlans,
  weekStart: sameWeek,
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(afterRefresh.percent, afterFriJudged.percent)
assert.equal(afterRefresh.completedCount, afterFriJudged.completedCount)
assert.equal(afterRefresh.judgedCount, afterFriJudged.judgedCount)

const nextWeekPlans = [
  ...livePlans,
  ...many(2, 'completed', '2026-09-21'),
  ...many(2, 'failed', '2026-09-22'),
]
const nextWeek = computeWeeklyAchievement({
  plans: nextWeekPlans,
  weekStart: '2026-09-21',
  today: todayKst,
  nowMs: noonKst,
})
assert.equal(nextWeek.title, '다음 주 달성률')
assert.equal(nextWeek.completedCount, 2)
assert.equal(nextWeek.failedCount, 2)
assert.equal(nextWeek.judgedCount, 4)
assert.equal(nextWeek.percent, 50)
assert.equal(
  computeWeeklyAchievement({
    plans: nextWeekPlans,
    weekStart: sameWeek,
    today: todayKst,
    nowMs: noonKst,
  }).judgedCount,
  6,
)

console.log('studentStudyPlanV2.test.ts passed')
