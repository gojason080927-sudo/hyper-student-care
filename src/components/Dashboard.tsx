import {
  BookCheck,
  CalendarDays,
  HelpCircle,
  Mail,
  UserCheck,
  Users,
} from 'lucide-react'
import { StatCard } from './StatCard'

const stats = [
  {
    title: 'Total Students',
    value: '248',
    subtitle: 'Enrolled across 12 classes',
    icon: Users,
    trend: '+12 new',
    trendUp: true,
    accent: 'blue' as const,
  },
  {
    title: 'Present Today',
    value: '231',
    subtitle: '93.1% attendance rate',
    icon: UserCheck,
    trend: '+2.4%',
    trendUp: true,
    accent: 'emerald' as const,
  },
  {
    title: 'Homework Completed',
    value: '87%',
    subtitle: '216 of 248 submissions',
    icon: BookCheck,
    trend: '+5.2%',
    trendUp: true,
    accent: 'violet' as const,
  },
  {
    title: 'Questions Waiting',
    value: '12',
    subtitle: 'Pending teacher response',
    icon: HelpCircle,
    trend: '-3 resolved',
    trendUp: true,
    accent: 'amber' as const,
  },
  {
    title: 'Parent Messages',
    value: '8',
    subtitle: 'Unread feedback & inquiries',
    icon: Mail,
    trend: '2 urgent',
    trendUp: false,
    accent: 'rose' as const,
  },
  {
    title: 'Upcoming Tests',
    value: '3',
    subtitle: 'Scheduled this week',
    icon: CalendarDays,
    trend: 'Next: Wed',
    trendUp: true,
    accent: 'cyan' as const,
  },
]

export function Dashboard() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">
            Dashboard Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here&apos;s what&apos;s happening at your academy today.
          </p>
        </div>
        <p className="text-sm font-medium text-slate-400">{today}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900">
            Recent Activity
          </h3>
          <ul className="mt-4 space-y-3">
            {[
              '12 students submitted Math homework',
              'Parent feedback received from Kim family',
              'Attendance marked for Grade 8-A',
              'New question posted in Science forum',
            ].map((activity) => (
              <li
                key={activity}
                className="flex items-center gap-3 rounded-xl bg-navy-50 px-3 py-2.5 text-sm text-slate-600"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-navy-500" />
                {activity}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-navy-900">
            Quick Actions
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              'Mark Attendance',
              'Review Homework',
              'Reply to Parents',
              'Schedule Test',
            ].map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-xl border border-navy-100 bg-navy-50 px-3 py-3 text-sm font-medium text-navy-800 transition hover:border-navy-200 hover:bg-navy-100"
              >
                {action}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
