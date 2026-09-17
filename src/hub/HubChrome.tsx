import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useHub } from './HubContext'

export function HubPageHeader({ title }: { title: string }) {
  const { accessKey } = useHub()
  return (
    <header className="mb-4 flex items-center gap-3">
      <Link
        to={`/hub/${accessKey}`}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#163A70] shadow-sm"
        aria-label="홈"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="min-w-0 text-lg font-bold leading-tight text-[#163A70]">{title}</h1>
    </header>
  )
}

export function HubEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}
