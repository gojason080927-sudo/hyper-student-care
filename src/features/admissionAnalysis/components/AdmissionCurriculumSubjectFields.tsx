import { inputClass } from '../../../utils/labels'
import {
  HIGH_SCHOOL_2022_ENGLISH,
  HIGH_SCHOOL_2022_INQUIRY_TRACKS,
  HIGH_SCHOOL_2022_KOREAN,
  HIGH_SCHOOL_2022_MATH,
  HIGH_SCHOOL_2022_SCIENCE,
  HIGH_SCHOOL_2022_SOCIAL,
  HIGH_SCHOOL_2022_SUBJECT_GROUPS,
  formatCurriculum2022GroupLabel,
  inferInquiryTrackFromSubject,
  inquiryGroupsForTrack,
  type Curriculum2022Category,
  type HighSchool2022InquiryTrack,
} from '../../../data/curriculum/highSchool2022Subjects'
import type { AdmissionSubjectSlot } from '../types'

const OFFICIAL_CATEGORIES: readonly Curriculum2022Category[] = [
  '공통과목',
  '일반선택',
  '진로선택',
  '융합선택',
]

type OfficialSubjectTable = {
  공통과목: readonly string[]
  일반선택: readonly string[]
  진로선택: readonly string[]
  융합선택: readonly string[]
}

export function subjectSlotLabel(slot: AdmissionSubjectSlot | undefined): string {
  if (slot === 'math') return '수학'
  if (slot === 'inquiry1') return '사회'
  if (slot === 'inquiry2') return '과학'
  if (slot === 'korean') return '국어'
  if (slot === 'english') return '영어'
  return '과목'
}

function isListedInTable(table: OfficialSubjectTable, name: string): boolean {
  return OFFICIAL_CATEGORIES.some((category) =>
    table[category].some((subjectName) => subjectName === name),
  )
}

export function OfficialSubjectSelect({
  id,
  name,
  table,
  dataSource,
  dataSlot,
  error,
  disabled,
  onChange,
}: {
  id: string
  name: string
  table: OfficialSubjectTable
  dataSource: string
  dataSlot?: string
  error?: string
  disabled?: boolean
  onChange: (name: string) => void
}) {
  const value = isListedInTable(table, name) ? name : ''

  return (
    <select
      id={id}
      className={inputClass(error)}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      data-curriculum="2022"
      data-source={dataSource}
      data-slot={dataSlot}
    >
      <option value="">선택</option>
      {OFFICIAL_CATEGORIES.map((category) => (
        <optgroup key={category} label={category}>
          {table[category].map((subjectName) => (
            <option key={subjectName} value={subjectName}>
              {subjectName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export function KoreanSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  return (
    <OfficialSubjectSelect
      id={id}
      name={name}
      table={HIGH_SCHOOL_2022_KOREAN}
      dataSource="HIGH_SCHOOL_2022_KOREAN"
      dataSlot="korean"
      error={error}
      onChange={onChange}
    />
  )
}

export function EnglishSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  return (
    <OfficialSubjectSelect
      id={id}
      name={name}
      table={HIGH_SCHOOL_2022_ENGLISH}
      dataSource="HIGH_SCHOOL_2022_ENGLISH"
      dataSlot="english"
      error={error}
      onChange={onChange}
    />
  )
}

export function OfficialNamesSelect({
  id,
  name,
  names,
  dataSource,
  dataSlot,
  disabled,
  onChange,
}: {
  id?: string
  name: string
  names: readonly string[]
  dataSource: string
  dataSlot?: string
  disabled?: boolean
  onChange: (name: string) => void
}) {
  const value = names.includes(name) ? name : ''
  return (
    <select
      id={id}
      className={inputClass()}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      data-curriculum="2022"
      data-source={dataSource}
      data-slot={dataSlot}
    >
      <option value="">선택</option>
      {names.map((subjectName) => (
        <option key={subjectName} value={subjectName}>
          {subjectName}
        </option>
      ))}
    </select>
  )
}

export function MathSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  return (
    <OfficialSubjectSelect
      id={id}
      name={name}
      table={HIGH_SCHOOL_2022_MATH}
      dataSource="HIGH_SCHOOL_2022_MATH"
      dataSlot="math"
      error={error}
      onChange={onChange}
    />
  )
}

export function SocialSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  return (
    <OfficialSubjectSelect
      id={id}
      name={name}
      table={HIGH_SCHOOL_2022_SOCIAL}
      dataSource="HIGH_SCHOOL_2022_SOCIAL"
      dataSlot="inquiry1"
      error={error}
      onChange={onChange}
    />
  )
}

export function ScienceSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  return (
    <OfficialSubjectSelect
      id={id}
      name={name}
      table={HIGH_SCHOOL_2022_SCIENCE}
      dataSource="HIGH_SCHOOL_2022_SCIENCE"
      dataSlot="inquiry2"
      error={error}
      onChange={onChange}
    />
  )
}

export function InquirySubjectFields({
  idPrefix,
  slot,
  name,
  track,
  error,
  onTrackChange,
  onNameChange,
}: {
  idPrefix: string
  slot: 'inquiry1' | 'inquiry2'
  name: string
  track: HighSchool2022InquiryTrack | ''
  error?: string
  onTrackChange: (track: HighSchool2022InquiryTrack | '') => void
  onNameChange: (name: string) => void
}) {
  const resolvedTrack = track || inferInquiryTrackFromSubject(name)
  const table =
    resolvedTrack === '사회'
      ? HIGH_SCHOOL_2022_SOCIAL
      : resolvedTrack === '과학'
        ? HIGH_SCHOOL_2022_SCIENCE
        : HIGH_SCHOOL_2022_SOCIAL
  const dataSource =
    resolvedTrack === '사회'
      ? 'HIGH_SCHOOL_2022_SOCIAL'
      : resolvedTrack === '과학'
        ? 'HIGH_SCHOOL_2022_SCIENCE'
        : ''

  return (
    <div className="flex min-w-[14rem] flex-1 flex-wrap items-end gap-2">
      <label className="block min-w-[6.5rem] space-y-1.5">
        <span className="text-sm font-medium text-slate-700">계열</span>
        <select
          id={`${idPrefix}-track`}
          className={inputClass()}
          value={resolvedTrack}
          onChange={(e) => {
            const next = e.target.value as HighSchool2022InquiryTrack | ''
            onTrackChange(next)
          }}
          data-slot={`${slot}-track`}
          data-source="HIGH_SCHOOL_2022_INQUIRY_TRACKS"
        >
          <option value="">선택</option>
          {HIGH_SCHOOL_2022_INQUIRY_TRACKS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[10rem] flex-1 space-y-1.5">
        <span className="text-sm font-medium text-slate-700">과목</span>
        <OfficialSubjectSelect
          id={`${idPrefix}-name`}
          name={name}
          table={table}
          dataSource={dataSource}
          dataSlot={slot}
          error={error}
          disabled={!resolvedTrack}
          onChange={onNameChange}
        />
      </label>
    </div>
  )
}

export function ExtraOfficialSubjectSelect({
  id,
  name,
  error,
  onChange,
}: {
  id: string
  name: string
  error?: string
  onChange: (name: string) => void
}) {
  const listed = HIGH_SCHOOL_2022_SUBJECT_GROUPS.some((group) =>
    group.subjects.some((subjectName) => subjectName === name),
  )
  const keepSavedName = name !== '' && !listed

  return (
    <select
      id={id}
      className={inputClass(error)}
      value={name}
      onChange={(e) => onChange(e.target.value)}
      data-curriculum="2022"
      data-source="HIGH_SCHOOL_2022_SUBJECT_GROUPS"
      data-slot="extra"
    >
      <option value="">선택</option>
      {keepSavedName ? <option value={name}>{name}</option> : null}
      {HIGH_SCHOOL_2022_SUBJECT_GROUPS.map((group) => (
        <optgroup
          key={`${group.area}-${group.category}`}
          label={formatCurriculum2022GroupLabel(group)}
        >
          {group.subjects.map((subjectName) => (
            <option key={subjectName} value={subjectName}>
              {subjectName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export function subjectNameInInquiryTrack(
  name: string,
  track: HighSchool2022InquiryTrack | '',
): boolean {
  return inquiryGroupsForTrack(track).some((group) =>
    group.subjects.some((subjectName) => subjectName === name),
  )
}
