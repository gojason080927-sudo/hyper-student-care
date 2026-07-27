interface KakaoShareLink {
  mobileWebUrl: string
  webUrl: string
}

interface KakaoShareButton {
  title: string
  link: KakaoShareLink
}

interface KakaoFeedContent {
  title: string
  description: string
  imageUrl: string
  link: KakaoShareLink
}

interface KakaoFeedTemplate {
  objectType: 'feed'
  content: KakaoFeedContent
  buttons: KakaoShareButton[]
}

interface KakaoSdk {
  init: (key: string) => void
  isInitialized: () => boolean
  Share: {
    sendDefault: (options: KakaoFeedTemplate) => void
  }
}

declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

export type { KakaoFeedTemplate, KakaoSdk }
