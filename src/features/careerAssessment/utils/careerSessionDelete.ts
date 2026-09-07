import type { CareerSessionStatus } from '../types'
import { deriveCareerListProgress } from './careerListProgress'

export const CAREER_ENDED_LINK_MESSAGE = '유효하지 않거나 종료된 검사 링크입니다.'

export function isCareerLinkEndedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const payload = error as { error?: string; message?: string }
  const code = payload.error ?? payload.message ?? ''
  return code === 'invalid_token' || code === 'subject_not_found' || code === 'session_not_found'
}

export function careerSessionDeleteCopy(input: {
  name: string
  status?: string | null
  answeredCount?: number | null
  latestResultId?: string | null
}): { title: string; message: string; confirmLabel: string } {
  const progress = deriveCareerListProgress(input)
  const name = input.name.trim() || '학생'
  if (progress.status === 'in_progress') {
    return {
      title: '진행 중인 검사 삭제',
      message: [
        `${name} 학생의 진행 중인 진로적성검사를 삭제하시겠습니까?`,
        `현재까지 입력한 ${progress.answeredCount}개의 응답도 함께 삭제됩니다.`,
        '학생 정보와 다른 학습 데이터는 삭제되지 않습니다.',
        '삭제 후에는 복구할 수 없습니다.',
      ].join('\n'),
      confirmLabel: '검사 삭제',
    }
  }
  if (progress.status === 'completed') {
    return {
      title: '완료된 검사 삭제',
      message: [
        `${name} 학생의 완료된 진로적성검사와 검사 결과를 삭제하시겠습니까?`,
        '검사 응답과 결과가 함께 삭제되며 복구할 수 없습니다.',
        '학생 정보와 다른 학습 데이터는 삭제되지 않습니다.',
      ].join('\n'),
      confirmLabel: '검사 삭제',
    }
  }
  return {
    title: '검사 삭제',
    message: [
      `${name} 학생의 진로적성검사를 삭제하시겠습니까?`,
      '아직 시작하지 않은 검사 링크가 삭제됩니다.',
      '학생 정보와 다른 학습 데이터는 삭제되지 않습니다.',
      '삭제 후에는 복구할 수 없습니다.',
    ].join('\n'),
    confirmLabel: '검사 삭제',
  }
}

export function listRowHasDeletableSession(session?: {
  id?: string | null
  status?: CareerSessionStatus | string | null
}): boolean {
  return Boolean(session?.id)
}
