/**
 * 2022 개정 공식 과목명 · 입학연도 구분
 * 실행: npx tsx src/data/curriculum/highSchool2022Subjects.test.ts
 */
import assert from 'node:assert/strict'
import {
  HIGH_SCHOOL_2022_ENGLISH,
  HIGH_SCHOOL_2022_ENGLISH_GROUPS,
  HIGH_SCHOOL_2022_KOREAN,
  HIGH_SCHOOL_2022_MATH,
  HIGH_SCHOOL_2022_OFFICIAL_SUBJECTS,
  HIGH_SCHOOL_2022_SCIENCE,
  HIGH_SCHOOL_2022_SOCIAL,
  HIGH_SCHOOL_2022_INQUIRY_TRACKS,
  HIGH_SCHOOL_2022_KOREAN_GROUPS,
  HIGH_SCHOOL_2022_MATH_GROUPS,
  HIGH_SCHOOL_2022_SCIENCE_GROUPS,
  HIGH_SCHOOL_2022_SOCIAL_GROUPS,
  HIGH_SCHOOL_2022_SUBJECT_GROUPS,
  REGULAR_ADMISSION_ENGLISH_SUBJECTS,
  REGULAR_ADMISSION_KOREAN_SUBJECTS,
  REGULAR_ADMISSION_MATH_SUBJECTS,
  isAdmissionInputSelectableSubject,
  isOfficial2022HighSchoolSubject,
} from './highSchool2022Subjects'
import {
  CURRICULUM_2022_FIRST_ENTRANCE_YEAR,
  inferHighSchoolEntranceYear,
  uses2022RevisedCurriculum,
} from './curriculumYear'
import {
  SCIENCE_INQUIRY_SUBJECTS,
  SOCIAL_INQUIRY_SUBJECTS,
} from '../../lib/admissions/regular/types'

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

section('국어 공식 과목명')
assert.deepEqual([...HIGH_SCHOOL_2022_KOREAN.공통과목], ['공통국어1', '공통국어2'])
assert.deepEqual([...HIGH_SCHOOL_2022_KOREAN.일반선택], ['화법과 언어', '독서와 작문', '문학'])
assert.deepEqual([...HIGH_SCHOOL_2022_KOREAN.진로선택], [
  '주제 탐구 독서',
  '문학과 영상',
  '직무 의사소통',
])
assert.deepEqual([...HIGH_SCHOOL_2022_KOREAN.융합선택], [
  '독서 토론과 글쓰기',
  '매체 의사소통',
  '언어생활 탐구',
])

section('수학 공식 과목명')
assert.deepEqual([...HIGH_SCHOOL_2022_MATH.공통과목], [
  '공통수학1',
  '공통수학2',
  '기본수학1',
  '기본수학2',
])
assert.deepEqual([...HIGH_SCHOOL_2022_MATH.일반선택], ['대수', '미적분Ⅰ', '확률과 통계'])
assert.deepEqual([...HIGH_SCHOOL_2022_MATH.진로선택], [
  '기하',
  '미적분Ⅱ',
  '경제 수학',
  '인공지능 수학',
  '직무 수학',
])
assert.deepEqual([...HIGH_SCHOOL_2022_MATH.융합선택], [
  '수학과 문화',
  '실용 통계',
  '수학과제 탐구',
])

section('영어 공식 과목명')
assert.deepEqual([...HIGH_SCHOOL_2022_ENGLISH.공통과목], [
  '공통영어1',
  '공통영어2',
  '기본영어1',
  '기본영어2',
])
assert.deepEqual([...HIGH_SCHOOL_2022_ENGLISH.일반선택], [
  '영어Ⅰ',
  '영어Ⅱ',
  '영어 독해와 작문',
])
assert.deepEqual([...HIGH_SCHOOL_2022_ENGLISH.진로선택], [
  '영미 문학 읽기',
  '영어 발표와 토론',
  '심화 영어',
  '심화 영어 독해와 작문',
  '직무 영어',
])
assert.deepEqual([...HIGH_SCHOOL_2022_ENGLISH.융합선택], [
  '실생활 영어 회화',
  '미디어 영어',
  '세계 문화와 영어',
])

section('사회 공식 과목명')
assert.deepEqual([...HIGH_SCHOOL_2022_SOCIAL.공통과목], [
  '한국사1',
  '한국사2',
  '통합사회1',
  '통합사회2',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SOCIAL.일반선택], [
  '세계시민과 지리',
  '세계사',
  '사회와 문화',
  '현대사회와 윤리',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SOCIAL.진로선택], [
  '한국지리 탐구',
  '도시의 미래 탐구',
  '동아시아 역사 기행',
  '정치',
  '법과 사회',
  '경제',
  '윤리와 사상',
  '인문학과 윤리',
  '국제 관계의 이해',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SOCIAL.융합선택], [
  '여행지리',
  '역사로 탐구하는 현대 세계',
  '사회문제 탐구',
  '금융과 경제생활',
  '윤리문제 탐구',
  '기후변화와 지속가능한 세계',
])

section('과학 공식 과목명')
assert.deepEqual([...HIGH_SCHOOL_2022_SCIENCE.공통과목], [
  '통합과학1',
  '통합과학2',
  '과학탐구실험1',
  '과학탐구실험2',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SCIENCE.일반선택], [
  '물리학',
  '화학',
  '생명과학',
  '지구과학',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SCIENCE.진로선택], [
  '역학과 에너지',
  '전자기와 양자',
  '물질과 에너지',
  '화학 반응의 세계',
  '세포와 물질대사',
  '생물의 유전',
  '지구시스템과학',
  '행성우주과학',
])
assert.deepEqual([...HIGH_SCHOOL_2022_SCIENCE.융합선택], [
  '과학의 역사와 문화',
  '기후변화와 환경생태',
  '융합과학 탐구',
])

section('2015 과목명은 2022 선택지에 없음')
const forbidden2015 = [
  '수학Ⅰ',
  '수학Ⅱ',
  '수학 I',
  '수학 II',
  '미적분',
  '생활과 윤리',
  '정치와 법',
  '사회·문화',
  '사회문화',
  '한국지리',
  '세계지리',
  '동아시아사',
  '물리학Ⅰ',
  '화학Ⅰ',
  '생명과학Ⅰ',
  '지구과학Ⅰ',
  '물리학Ⅱ',
  '화학Ⅱ',
  '생명과학Ⅱ',
  '지구과학Ⅱ',
  '수학',
  '사회',
  '과학',
]
for (const name of forbidden2015) {
  assert.equal(isOfficial2022HighSchoolSubject(name), false, name)
}

section('그룹·조회')
assert.equal(HIGH_SCHOOL_2022_KOREAN_GROUPS.length, 4)
assert.equal(HIGH_SCHOOL_2022_MATH_GROUPS.length, 4)
assert.equal(HIGH_SCHOOL_2022_ENGLISH_GROUPS.length, 4)
assert.equal(HIGH_SCHOOL_2022_SOCIAL_GROUPS.length, 4)
assert.equal(HIGH_SCHOOL_2022_SCIENCE_GROUPS.length, 4)
assert.deepEqual([...HIGH_SCHOOL_2022_INQUIRY_TRACKS], ['사회', '과학'])
assert.equal(HIGH_SCHOOL_2022_SUBJECT_GROUPS.length, 20)
assert.equal(HIGH_SCHOOL_2022_OFFICIAL_SUBJECTS.length, 83)
assert.equal(isOfficial2022HighSchoolSubject('공통국어1'), true)
assert.equal(isOfficial2022HighSchoolSubject('공통수학1'), true)
assert.equal(isOfficial2022HighSchoolSubject('공통영어1'), true)
assert.equal(isOfficial2022HighSchoolSubject('통합사회1'), true)
assert.equal(isOfficial2022HighSchoolSubject('통합과학1'), true)
assert.equal(isOfficial2022HighSchoolSubject('국어'), false)
assert.equal(isOfficial2022HighSchoolSubject('영어'), false)
assert.equal(isAdmissionInputSelectableSubject('공통국어1'), true)
assert.equal(isAdmissionInputSelectableSubject('공통영어1'), true)
assert.equal(isAdmissionInputSelectableSubject('영어'), false)
assert.deepEqual([...REGULAR_ADMISSION_KOREAN_SUBJECTS], [
  '공통국어1',
  '공통국어2',
  '화법과 언어',
  '독서와 작문',
  '문학',
])
assert.deepEqual([...REGULAR_ADMISSION_MATH_SUBJECTS], [
  '공통수학1',
  '공통수학2',
  '대수',
  '미적분Ⅰ',
  '확률과 통계',
  '기하',
  '미적분Ⅱ',
])
assert.deepEqual([...REGULAR_ADMISSION_ENGLISH_SUBJECTS], [
  '공통영어1',
  '공통영어2',
  '영어Ⅰ',
  '영어Ⅱ',
  '영어 독해와 작문',
])

section('2025 입학부터 2022 개정')
assert.equal(CURRICULUM_2022_FIRST_ENTRANCE_YEAR, 2025)
const sept2026 = new Date(2026, 8, 2)
assert.equal(inferHighSchoolEntranceYear('고1', sept2026), 2026)
assert.equal(inferHighSchoolEntranceYear('고2', sept2026), 2025)
assert.equal(inferHighSchoolEntranceYear('고3', sept2026), 2024)
assert.equal(uses2022RevisedCurriculum('', sept2026), true)
assert.equal(uses2022RevisedCurriculum('고1', sept2026), true)
assert.equal(uses2022RevisedCurriculum('고2', sept2026), true)
assert.equal(uses2022RevisedCurriculum('고3', sept2026), false)

section('정시 2025 수능 선택과목은 변경하지 않음')
assert.deepEqual([...SOCIAL_INQUIRY_SUBJECTS], [
  '생활과윤리',
  '윤리와사상',
  '한국지리',
  '세계지리',
  '동아시아사',
  '세계사',
  '경제',
  '정치와법',
  '사회문화',
])
assert.deepEqual([...SCIENCE_INQUIRY_SUBJECTS], [
  '물리학Ⅰ',
  '화학Ⅰ',
  '생명과학Ⅰ',
  '지구과학Ⅰ',
  '물리학Ⅱ',
  '화학Ⅱ',
  '생명과학Ⅱ',
  '지구과학Ⅱ',
])

console.log('\ncurriculum 2022 subjects OK')
