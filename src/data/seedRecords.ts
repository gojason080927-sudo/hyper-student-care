import type { Student } from '../types/student'
import type {
  AssignmentCompletionRecord,
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  MakeupPlanRecord,
  MonthlyEvaluationRecord,
  ProgressRecord,
  QuestionRecord,
} from '../types/records'
import {
  calcCompletionRate,
  calcPercentage,
  calcProgressRate,
  getAssignmentStatusFromRate,
} from '../utils/calc'
import { createId } from '../utils/id'

const today = new Date().toISOString().slice(0, 10)
const now = new Date().toISOString()

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function createSeedRecords(students: Student[]): {
  attendance: AttendanceRecord[]
  homework: HomeworkRecord[]
  assignments: AssignmentCompletionRecord[]
  dailyTests: DailyTestRecord[]
  monthlyEvaluations: MonthlyEvaluationRecord[]
  questions: QuestionRecord[]
  progress: ProgressRecord[]
  makeupPlans: MakeupPlanRecord[]
} {
  const [s1, s2, s3] = students
  if (!s1 || !s2 || !s3) {
    return {
      attendance: [],
      homework: [],
      assignments: [],
      dailyTests: [],
      monthlyEvaluations: [],
      questions: [],
      progress: [],
      makeupPlans: [],
    }
  }

  const attendance: AttendanceRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      date: today,
      status: '출석',
      reason: '',
      memo: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      date: today,
      status: '지각',
      reason: '교통 지연',
      memo: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s3.id,
      date: daysAgo(1),
      status: '결석',
      reason: '개인 사정',
      memo: '',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const homework: HomeworkRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      date: today,
      title: '',
      description: '수학 p.45~47\n유형 문제 20문항',
      status: '완료',
      teacherMemo: '잘 풀었습니다.',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      date: today,
      title: '',
      description: '영어 단어 시험 준비\nUnit 5~6',
      status: '부분 완료',
      teacherMemo: '미완료 부분 보충 필요',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s3.id,
      date: daysAgo(2),
      title: '',
      description: '영어 독해\n지문 3개',
      status: '미완료',
      teacherMemo: '',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const a1Rate = calcCompletionRate(20, 20)
  const a2Rate = calcCompletionRate(15, 20)
  const assignments: AssignmentCompletionRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      date: today,
      assignmentName: '수학 유형 문제',
      totalCount: 20,
      completedCount: 20,
      completionRate: a1Rate,
      status: getAssignmentStatusFromRate(a1Rate),
      memo: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      date: today,
      assignmentName: '영어·수학 종합',
      totalCount: 20,
      completedCount: 15,
      completionRate: a2Rate,
      status: getAssignmentStatusFromRate(a2Rate),
      memo: '오답 정리 필요',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const dailyTests: DailyTestRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      date: today,
      testName: '일일 수학 테스트',
      subject: '수학',
      score: 18,
      totalScore: 20,
      percentage: calcPercentage(18, 20),
      incorrectCount: 2,
      memo: '',
      sessionResults: [],
      learningDiagnosis: {
        wrongAnswerItems: [],
        questionTotal: 0,
        fridayRetestTotal: null,
        fridayRetestWrong: null,
        englishVocabResult: null,
        englishGrammarWrongCount: null,
        englishReadingWrongCount: null,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      date: daysAgo(1),
      testName: '일일 영어 테스트',
      subject: '영어',
      score: 14,
      totalScore: 20,
      percentage: calcPercentage(14, 20),
      incorrectCount: 6,
      memo: '어휘 부분 보완',
      sessionResults: [],
      learningDiagnosis: {
        wrongAnswerItems: [],
        questionTotal: 0,
        fridayRetestTotal: null,
        fridayRetestWrong: null,
        englishVocabResult: null,
        englishGrammarWrongCount: null,
        englishReadingWrongCount: null,
      },
      createdAt: now,
      updatedAt: now,
    },
  ]

  const monthlyEvaluations: MonthlyEvaluationRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      evaluationDate: '2026-05-30',
      year: 2026,
      month: 5,
      subject: '수학',
      score: 78,
      totalScore: 100,
      percentage: calcPercentage(78, 100),
      difficultyBreakdown: { highest: 4, high: 5, middle: 5, basic: 6 },
      teacherComment: '기본 개념은 안정적이나 고난도 적용에 시간이 필요합니다.',
      strengths: '기본 문제 정확도가 좋습니다.',
      improvements: '최상·상 난이도 풀이 연습이 필요합니다.',
      wrongAnswerItems: [],
      questionTotal: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s1.id,
      evaluationDate: '2026-06-27',
      year: 2026,
      month: 6,
      subject: '수학',
      score: 85,
      totalScore: 100,
      percentage: calcPercentage(85, 100),
      difficultyBreakdown: { highest: 4, high: 5, middle: 5, basic: 6 },
      teacherComment: '꾸준히 성실하게 학습하고 있습니다.',
      strengths: '계산 실수가 줄었습니다.',
      improvements: '서술형 문제 연습이 필요합니다.',
      wrongAnswerItems: [],
      questionTotal: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s1.id,
      evaluationDate: '2026-07-31',
      year: 2026,
      month: 7,
      subject: '수학',
      score: 92,
      totalScore: 100,
      percentage: calcPercentage(92, 100),
      difficultyBreakdown: { highest: 5, high: 5, middle: 4, basic: 6 },
      teacherComment:
        '개념 이해도와 기본 문제 해결력은 향상되었습니다. 고난도 문제에서 시간 배분과 풀이 정확도를 보완해야 합니다.',
      strengths: '개념 이해도가 높아졌습니다.',
      improvements: '시간 관리에 더 신경 써 주세요.',
      wrongAnswerItems: [],
      questionTotal: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      evaluationDate: '2025-07-25',
      year: 2025,
      month: 7,
      subject: '영어',
      score: 78,
      totalScore: 100,
      percentage: calcPercentage(78, 100),
      difficultyBreakdown: { highest: 0, high: 0, middle: 0, basic: 0 },
      teacherComment: '영어 실력이 점차 향상되고 있습니다.',
      strengths: '독해 속도가 빨라졌습니다.',
      improvements: '문법 기본기를 다져 주세요.',
      wrongAnswerItems: [],
      questionTotal: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const questions: QuestionRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      date: daysAgo(1),
      category: '숙제질문',
      title: '3번 문제 풀이 방법',
      content: '3번 문제에서 식을 어떻게 세워야 할지 모르겠어요.',
      answer: '주어진 조건을 x로 놓고 방정식을 세워 보세요.',
      questionImages: [],
      answerImages: [],
      status: '답변완료',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      date: today,
      category: '수업질문',
      title: '관계대명사 usage',
      content: '관계대명사 that과 which 차이가 궁금합니다.',
      answer: '',
      questionImages: [],
      answerImages: [],
      status: '답변대기',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const progress: ProgressRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      subject: '수학',
      slotNumber: 1,
      textbookName: '수학의 정석',
      currentProgress: '3단원 함수',
      currentPage: 156,
      totalPage: 200,
      progressRate: calcProgressRate(156, 200),
      lastStudyDate: today,
      teacherMemo: '함수 그래프 파트 진행 중',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      subject: '영어',
      slotNumber: 1,
      textbookName: 'EBS 수능특강 영어',
      currentProgress: '5단원',
      currentPage: 78,
      totalPage: 100,
      progressRate: calcProgressRate(78, 100),
      lastStudyDate: daysAgo(1),
      teacherMemo: '',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s3.id,
      subject: '영어',
      slotNumber: 1,
      textbookName: 'Reading Master',
      currentProgress: '2단원',
      currentPage: 45,
      totalPage: 120,
      progressRate: calcProgressRate(45, 120),
      lastStudyDate: daysAgo(3),
      teacherMemo: '휴원 중 — 진도 일시 중단',
      createdAt: now,
      updatedAt: now,
    },
  ]

  const makeupPlans: MakeupPlanRecord[] = [
    {
      id: createId(),
      studentId: s1.id,
      scheduledDate: daysAgo(-3),
      scheduledTime: '19:00',
      method: '학원 보강',
      subject: '수학',
      reason: '결석 수업 보충',
      memo: '',
      status: '예정',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      studentId: s2.id,
      scheduledDate: daysAgo(-5),
      scheduledTime: '18:30',
      method: '영상 대체',
      subject: '영어',
      reason: '개인 일정으로 학원 불가',
      memo: '영상 링크 학부모에게 전달 예정',
      status: '예정',
      createdAt: now,
      updatedAt: now,
    },
  ]

  return {
    attendance,
    homework,
    assignments,
    dailyTests,
    monthlyEvaluations,
    questions,
    progress,
    makeupPlans,
  }
}
