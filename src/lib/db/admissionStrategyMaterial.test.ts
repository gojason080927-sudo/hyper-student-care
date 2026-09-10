/**
 * 실행: node --experimental-strip-types src/lib/db/admissionStrategyMaterial.test.ts
 */
import assert from 'node:assert/strict'
import {
  admissionStrategyMaterialFromRow,
  canPublishMaterial,
  conversionStatusLabel,
  hasMaterialTrack,
  hasUnreadAdmissionStrategyMaterials,
  isParentVisibleMaterial,
  materialStatusLabel,
  nextDisplayOrder,
  parseParentAdmissionStrategyMaterial,
  parseParentAdmissionStrategyMaterials,
  sortMaterialsByDisplayOrder,
  swappedDisplayOrders,
  needsPageConversion,
  type AdmissionStrategyMaterialRow,
} from './admissionStrategyMaterialModel.ts'
import {
  detectUploadKind,
  extensionForKind,
  isPageAssetPath,
  isSourceAssetPath,
  materialIdFromStoragePath,
  padPageNumber,
  pageObjectPath,
  sourceObjectPath,
  teacherFacingError,
} from '../admissionStrategy/storagePaths.ts'

const row: AdmissionStrategyMaterialRow = {
  id: '11111111-1111-4111-8111-111111111111',
  track: '대입',
  title: '2028 대입 완전정리',
  description: '학부모 상담자료',
  material_type: 'pdf',
  source_file_path: '11111111-1111-4111-8111-111111111111/source/abc.pdf',
  original_file_name: 'v13.pdf',
  status: 'PUBLISHED',
  conversion_status: 'ready',
  conversion_error: null,
  display_order: 2,
  page_count: 3,
  published_at: '2026-09-10T00:00:00Z',
  created_by: null,
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
}

const mapped = admissionStrategyMaterialFromRow(row, [
  {
    id: 'p1',
    material_id: row.id,
    page_number: 2,
    asset_path: `${row.id}/pages/x-002.webp`,
    width: 800,
    height: 600,
    created_at: row.created_at,
  },
  {
    id: 'p0',
    material_id: row.id,
    page_number: 1,
    asset_path: `${row.id}/pages/x-001.webp`,
    width: 800,
    height: 600,
    created_at: row.created_at,
  },
])

assert.equal(mapped.title, '2028 대입 완전정리')
assert.equal(mapped.track, '대입')
assert.equal(mapped.pages.length, 2)
assert.equal(mapped.pages[0]?.pageNumber, 1)
assert.equal(isParentVisibleMaterial(mapped), true)
assert.equal(canPublishMaterial(mapped), true)
assert.equal(materialStatusLabel('DRAFT'), '초안')
assert.equal(conversionStatusLabel('needs_pdf'), 'PDF 필요')

const draft = { ...mapped, status: 'DRAFT' as const }
const hidden = { ...mapped, status: 'HIDDEN' as const }
assert.equal(isParentVisibleMaterial(draft), false)
assert.equal(isParentVisibleMaterial(hidden), false)
assert.equal(isParentVisibleMaterial({ ...mapped, conversionStatus: 'failed', pageCount: 3 }), false)
assert.equal(canPublishMaterial({ conversionStatus: 'needs_pdf', pageCount: 0 }), false)
assert.equal(hasMaterialTrack(mapped), true)
assert.equal(hasMaterialTrack({ track: null }), false)
assert.equal(
  hasUnreadAdmissionStrategyMaterials([
    { isUnread: false },
    { isUnread: true },
  ]),
  true,
)
assert.equal(
  hasUnreadAdmissionStrategyMaterials([{ isUnread: false }, { isUnread: false }]),
  false,
)
assert.equal(hasUnreadAdmissionStrategyMaterials([]), false)
assert.equal(
  needsPageConversion({
    materialType: 'pdf',
    sourceFilePath: row.source_file_path,
    conversionStatus: 'pending',
    pageCount: 0,
  }),
  true,
)
assert.equal(
  needsPageConversion({
    materialType: 'pdf',
    sourceFilePath: row.source_file_path,
    conversionStatus: 'ready',
    pageCount: 3,
  }),
  false,
)
assert.equal(
  needsPageConversion({
    materialType: 'pdf',
    sourceFilePath: null,
    conversionStatus: 'pending',
    pageCount: 0,
  }),
  false,
)

const ordered = sortMaterialsByDisplayOrder([
  { ...mapped, id: 'b', displayOrder: 2, createdAt: '2026-09-02T00:00:00Z' },
  { ...mapped, id: 'a', displayOrder: 1, createdAt: '2026-09-03T00:00:00Z' },
  { ...mapped, id: 'c', displayOrder: 2, createdAt: '2026-09-01T00:00:00Z' },
])
assert.deepEqual(
  ordered.map((item) => item.id),
  ['a', 'c', 'b'],
)

const swapped = swappedDisplayOrders(
  [
    { id: 'a', displayOrder: 1 },
    { id: 'b', displayOrder: 2 },
    { id: 'c', displayOrder: 3 },
  ],
  'b',
  'up',
)
assert.deepEqual(swapped, [
  { id: 'b', displayOrder: 1 },
  { id: 'a', displayOrder: 2 },
])
assert.equal(swappedDisplayOrders([{ id: 'a', displayOrder: 1 }], 'a', 'up'), null)
assert.equal(nextDisplayOrder([]), 1)
assert.equal(nextDisplayOrder([{ displayOrder: 4 }, { displayOrder: 1 }]), 5)

const parsed = parseParentAdmissionStrategyMaterials([
  {
    id: 'm1',
    track: '고입',
    title: '고교학점제 안내',
    description: '',
    page_count: 2,
    display_order: 1,
    published_at: '2026-09-10T00:00:00Z',
    is_unread: true,
    pages: [
      { page_number: 1, asset_path: 'm1/pages/a-001.webp', width: 100, height: 200 },
      { page_number: 2, asset_path: 'm1/pages/a-002.webp', width: 100, height: 200 },
    ],
    status: 'DRAFT',
  },
  { id: 'm2', title: '분류 없는 자료' },
  { id: '', title: '무시' },
])
assert.equal(parsed.length, 1)
assert.equal(parsed[0]?.title, '고교학점제 안내')
assert.equal(parsed[0]?.track, '고입')
assert.equal(parsed[0]?.isUnread, true)
assert.equal(parsed[0]?.pages.length, 2)
assert.ok(!('status' in parsed[0]!))
assert.equal(
  parseParentAdmissionStrategyMaterial({
    id: 'm3',
    track: '대입',
    title: '2028 대입 핵심전략 가이드',
    page_count: 20,
    is_unread: false,
  })?.isUnread,
  false,
)
assert.equal(
  parseParentAdmissionStrategyMaterial({
    id: 'm4',
    track: '대입',
    title: '확인 필드 없는 자료',
    page_count: 1,
  })?.isUnread,
  false,
)
assert.equal(parseParentAdmissionStrategyMaterial(null), null)
assert.deepEqual(parseParentAdmissionStrategyMaterials(null), [])

assert.equal(padPageNumber(7), '007')
assert.equal(sourceObjectPath(row.id, 'abc', 'pdf'), `${row.id}/source/abc.pdf`)
assert.equal(pageObjectPath(row.id, 'abc', 12, 'webp'), `${row.id}/pages/abc-012.webp`)
assert.equal(materialIdFromStoragePath(`${row.id}/pages/x.webp`), row.id)
assert.equal(isPageAssetPath(`${row.id}/pages/x.webp`), true)
assert.equal(isSourceAssetPath(`${row.id}/source/x.pdf`), true)
assert.equal(isPageAssetPath(`${row.id}/source/x.pdf`), false)
assert.equal(detectUploadKind({ name: 'a.PDF', type: '' }), 'pdf')
assert.equal(detectUploadKind({ name: 'a.pptx', type: '' }), 'pptx')
assert.equal(detectUploadKind({ name: 'a.ppt', type: '' }), null)
assert.equal(extensionForKind('pptx'), 'pptx')
assert.equal(
  teacherFacingError(new Error('new row violates row-level security policy'), '실패'),
  '권한이 없습니다. 강사 로그인 상태를 확인해 주세요.',
)

console.log('admissionStrategyMaterial OK')
