import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  /** 유효한 숫자가 입력될 때만 호출된다. 칸을 비워도 0이 남지 않고, 칸을 벗어나면 현재 값으로 돌아간다. */
  onValue: (value: number) => void
}

/** 지우고 다시 입력할 수 있는 숫자 칸 */
export function NumInput({ value, onValue, ...rest }: Props) {
  const [text, setText] = useState<string | null>(null)
  return (
    <input
      {...rest}
      type="number"
      value={text ?? value}
      onChange={(e) => {
        setText(e.target.value)
        const n = Number(e.target.value)
        if (e.target.value !== '' && Number.isFinite(n)) onValue(n)
      }}
      onBlur={() => setText(null)}
    />
  )
}
