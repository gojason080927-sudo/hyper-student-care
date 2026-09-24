/**
 * 실행: npx tsx src/lib/makeupPlanPush.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { uniqueMakeupPushStudentIds } from './hubPushEvents.ts'

const dataHook = readFileSync('src/hooks/useData.tsx', 'utf8')
const invokeSrc = readFileSync('src/lib/hubPushInvoke.ts', 'utf8')
const edge = readFileSync('supabase/functions/send-hub-push-notification/index.ts', 'utf8')
const page = readFileSync('src/pages/MakeupPlanPage.tsx', 'utf8')
const audience = readFileSync('src/utils/makeupPlanAudience.ts', 'utf8')

assert.deepEqual(uniqueMakeupPushStudentIds(['A', 'B', 'C']), ['A', 'B', 'C'])
assert.deepEqual(uniqueMakeupPushStudentIds(['A', 'A', 'B']), ['A', 'B'])
assert.deepEqual(uniqueMakeupPushStudentIds([]), [])

const createStart = dataHook.indexOf('const saveMakeupPlanRecords')
const createEnd = dataHook.indexOf('const deleteMakeupPlanRecord')
const createBlock = dataHook.slice(createStart, createEnd)
assert.match(createBlock, /await upsertMakeupPlans\(records\)/)
assert.match(createBlock, /notifyHubPush\(\{\s*event: 'makeup_plan_saved'/)
assert.match(createBlock, /studentIds: uniqueIds/)
assert.ok(createBlock.indexOf('await upsertMakeupPlans(records)') < createBlock.indexOf('makeup_plan_saved'))

const editBlock = dataHook.slice(
  dataHook.indexOf('const saveMakeupPlanRecord'),
  dataHook.indexOf('const saveMakeupPlanRecords'),
)
assert.doesNotMatch(editBlock, /notifyHubPush/)
assert.doesNotMatch(editBlock, /makeup_plan_saved/)

const deleteBlock = dataHook.slice(
  dataHook.indexOf('const deleteMakeupPlanRecord'),
  dataHook.indexOf('const saveContentPost'),
)
assert.doesNotMatch(deleteBlock, /notifyHubPush/)
assert.doesNotMatch(deleteBlock, /makeup_plan_saved/)

assert.match(invokeSrc, /makeup_plan_saved/)
assert.match(invokeSrc, /studentIds\?: string\[\]/)
assert.match(invokeSrc, /export function notifyHubPush[\s\S]*void invokeHubPush\(body\)/)

assert.match(edge, /event === 'makeup_plan_saved'/)
assert.match(edge, /handleMakeupPlanSaved/)
assert.match(edge, /loadParentSubscriptions/)
assert.match(edge, /parent_push_subscriptions/)
assert.match(edge, /student_push_subscriptions/)
assert.match(edge, /makeup_plan:\$\{entityId\}:created/)
assert.doesNotMatch(edge, /resolveMakeupPlanTargetStudentIds/)
assert.doesNotMatch(edge, /audienceType/)
assert.match(edge, /HYPER 보강계획 안내/)
assert.match(edge, /notices-makeup\?tab=makeup/)

const assignmentHandler = edge.slice(edge.indexOf('async function handleAssignmentSaved'), edge.indexOf('async function handleInboxReplied'))
assert.doesNotMatch(assignmentHandler, /parent_push_subscriptions/)
assert.doesNotMatch(assignmentHandler, /makeup_plan/)

assert.doesNotMatch(page, /notifyHubPush/)
assert.doesNotMatch(audience, /notifyHubPush/)
assert.match(page, /saveMakeupPlanRecords\(target\.studentIds/)

console.log('makeupPlanPush tests passed')
