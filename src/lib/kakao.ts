import type { Student } from '../types/student'
import { getPublicAssetUrl, getStudentCareUrl } from '../utils/studentCareUrl'
import { isValidStudentAccessKey } from '../utils/studentAccessKey'

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js'

export type KakaoShareResult =
  | { ok: true }
  | { ok: false; message: string; hint?: string }

function getKakaoJavaScriptKey(): string {
  return import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY?.trim() ?? ''
}

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경에서만 카카오톡 공유를 사용할 수 있습니다.'))
  }

  if (window.Kakao) {
    return Promise.resolve()
  }

  const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk="true"]')
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('카카오 SDK를 불러오지 못했습니다.')),
        { once: true },
      )
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = KAKAO_SDK_URL
    script.async = true
    script.defer = true
    script.dataset.kakaoSdk = 'true'
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('카카오 SDK를 불러오지 못했습니다.'))
    document.head.appendChild(script)
  })
}

async function ensureKakaoReady(): Promise<KakaoShareResult | null> {
  const key = getKakaoJavaScriptKey()
  if (!key) {
    return {
      ok: false,
      message: '카카오톡 공유 설정이 완료되지 않았습니다.',
      hint: '확인 항목: VITE_KAKAO_JAVASCRIPT_KEY, VITE_PUBLIC_APP_URL, 카카오디벨로퍼스 웹 도메인 등록. 개인 링크 복사 기능은 계속 사용할 수 있습니다.',
    }
  }

  try {
    await loadScript()
  } catch (error) {
    console.error('[Kakao] SDK load failed', error)
    return {
      ok: false,
      message: '카카오톡 공유 설정을 확인해 주세요.',
      hint: 'JavaScript 키와 등록된 웹 도메인이 필요합니다. 개인 링크 복사 기능은 계속 사용할 수 있습니다.',
    }
  }

  const kakao = window.Kakao
  if (!kakao) {
    console.error('[Kakao] window.Kakao is undefined after script load')
    return {
      ok: false,
      message: '카카오톡 공유 설정을 확인해 주세요.',
      hint: 'JavaScript 키와 등록된 웹 도메인이 필요합니다. 개인 링크 복사 기능은 계속 사용할 수 있습니다.',
    }
  }

  if (!kakao.isInitialized()) {
    kakao.init(key)
  }

  return null
}

function buildShareDescription(studentName: string): string {
  return `${studentName} 학생의 학습관리 페이지입니다.\n출결, 진도, 숙제, 테스트 및 평가 기록을 확인해 주세요.`
}

/** 카카오 피드형 공유 — 버튼명은 반드시 "HYPER CARE" */
export async function shareStudentCareToKakao(student: Student): Promise<KakaoShareResult> {
  if (!student) {
    return { ok: false, message: '학생 정보를 찾을 수 없습니다.' }
  }

  if (!isValidStudentAccessKey(student.studentAccessKey)) {
    return { ok: false, message: '학생 개인 링크를 생성할 수 없습니다. 링크 재발급 후 다시 시도해 주세요.' }
  }

  const setupError = await ensureKakaoReady()
  if (setupError) {
    return setupError
  }

  let studentCareUrl: string
  try {
    studentCareUrl = getStudentCareUrl(student.studentAccessKey)
  } catch (error) {
    console.error('[Kakao] invalid care url', error)
    return { ok: false, message: '학생 개인 링크를 만들 수 없습니다.' }
  }

  const shareImageUrl = getPublicAssetUrl('/hyper-care-share.png')
  const link = {
    mobileWebUrl: studentCareUrl,
    webUrl: studentCareUrl,
  }

  try {
    window.Kakao!.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: 'HYPER STUDENT CARE',
        description: buildShareDescription(student.name),
        imageUrl: shareImageUrl,
        link,
      },
      buttons: [
        {
          title: 'HYPER CARE',
          link,
        },
      ],
    })
    return { ok: true }
  } catch (error) {
    console.error('[Kakao] Share.sendDefault failed', error)
    return {
      ok: false,
      message: '카카오톡 공유 설정을 확인해 주세요.',
      hint: 'JavaScript 키와 등록된 웹 도메인이 필요합니다. 개인 링크 복사 기능은 계속 사용할 수 있습니다.',
    }
  }
}
