import type { ContentPost } from '../types/records'
import { createId } from '../utils/id'

const now = new Date().toISOString()
const today = now.slice(0, 10)

export function createSeedContentPosts(): ContentPost[] {
  return [
    {
      id: createId(),
      category: '공지사항',
      title: '8월 학원 운영 안내',
      content:
        '8월 학원 운영 일정을 안내드립니다.\n\n자세한 일정은 아래 내용을 확인해 주세요.\n\n- 8월 15일: 임시 휴원\n- 8월 20일~22일: 여름 특강\n- 상담 일정은 개별 안내',
      summary: '8월 수업 일정과 휴원일을 안내합니다.',
      sourceName: '',
      originalArticleTitle: '',
      authorName: '하이퍼 영수학원',
      isPinned: true,
      isPublished: true,
      publishedAt: today,
      audienceType: 'all',
      targetGrade: '',
      targetClassName: '',
      targetStudentId: '',
      publishStartDate: '',
      publishEndDate: '',
      isImportant: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: createId(),
      category: '학습정보',
      title: '수학 오답노트 작성법',
      content:
        '오답노트는 틀린 문제를 단순히 다시 적는 것이 아니라,\n틀린 이유와 다시 풀 때 주의할 점을 기록하는 것이 중요합니다.\n\n1. 왜 틀렸는지 한 줄로 정리\n2. 핵심 개념 다시 적기\n3. 비슷한 유형 한 문제 더 풀기',
      summary: '오답노트를 효과적으로 작성하는 방법을 안내합니다.',
      sourceName: '',
      originalArticleTitle: '',
      authorName: '수학 담당 강사',
      isPinned: false,
      isPublished: true,
      publishedAt: today,
      audienceType: 'all',
      targetGrade: '',
      targetClassName: '',
      targetStudentId: '',
      publishStartDate: '',
      publishEndDate: '',
      isImportant: false,
      createdAt: now,
      updatedAt: now,
    },
  ]
}
