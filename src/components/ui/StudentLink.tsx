import { Link } from 'react-router-dom'

type StudentLinkProps = {
  studentId: string
  name: string
  className?: string
}

export function StudentLink({ studentId, name, className = '' }: StudentLinkProps) {
  return (
    <Link
      to={`/students/${studentId}`}
      className={`font-semibold text-navy-700 underline-offset-2 hover:text-navy-900 hover:underline ${className}`}
    >
      {name}
    </Link>
  )
}
