import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

/** 한 줄 입력 — input에만 type/inputMode를 둔다. textarea에 넣으면 모바일에서 Space가 먹히지 않을 수 있다. */
export function KoreanTextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      lang="ko"
      inputMode="text"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      {...props}
      className={className}
    />
  )
}

export function KoreanTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea lang="ko" {...props} className={className} />
}
