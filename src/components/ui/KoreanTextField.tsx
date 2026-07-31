import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

/** 일반 텍스트 입력 — 한글 IME 조합을 방해하지 않도록 브라우저 속성을 고정 */
const koreanTextAttrs = {
  type: 'text' as const,
  lang: 'ko',
  inputMode: 'text' as const,
  autoCapitalize: 'off' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
}

export function KoreanTextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...koreanTextAttrs} {...props} className={className} />
}

export function KoreanTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...koreanTextAttrs} {...props} className={className} />
}
