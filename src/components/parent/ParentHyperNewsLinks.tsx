import { ExternalLink } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { INSTAGRAM_URL, NAVER_BLOG_URL } from '../../constants/hyperSocialLinks'

type SocialLinkCardProps = {
  href: string
  title: string
  subtitle: string
  accent: ReactNode
}

function SocialLinkCard({ href, title, subtitle, accent }: SocialLinkCardProps) {
  const url = href.trim()
  const hasUrl = url.length > 0

  return (
    <a
      href={hasUrl ? url : undefined}
      target={hasUrl ? '_blank' : undefined}
      rel={hasUrl ? 'noopener noreferrer' : undefined}
      aria-disabled={!hasUrl}
      onClick={(event) => {
        if (!hasUrl) {
          event.preventDefault()
          return
        }
        // 카카오톡 인앱 브라우저는 target=_blank 이동이 막히는 경우가 있어 동일 창으로 이동
        if (/KAKAOTALK/i.test(navigator.userAgent)) {
          event.preventDefault()
          window.location.assign(url)
        }
      }}
      className="group flex min-w-0 items-center gap-2.5 rounded-2xl border border-[rgba(22,58,112,0.06)] bg-white px-3 py-2.5 shadow-[var(--tm-shadow-soft)] transition-[transform,box-shadow,border-color] duration-[180ms] active:scale-[0.98] hover:border-[rgba(40,199,183,0.35)] hover:shadow-[var(--tm-shadow-card)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center" aria-hidden>
        {accent}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[13px] font-semibold leading-tight text-[var(--tm-navy)]">
          <span className="truncate">{title}</span>
          <ExternalLink
            className="h-3 w-3 shrink-0 text-[var(--tm-text-muted)] opacity-70"
            strokeWidth={2.25}
            aria-hidden
          />
        </span>
        <span className="mt-0.5 block truncate text-[11px] leading-snug text-[var(--tm-text-muted)]">
          {subtitle}
        </span>
      </span>
    </a>
  )
}

function NaverAccent() {
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(40,199,183,0.12)]">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#03C75A] text-[11px] font-bold leading-none text-white">
        N
      </span>
    </span>
  )
}

function InstagramAccent() {
  // React useId() includes ":" which breaks SVG url(#…) references in many browsers
  const gradId = `ig-icon-grad-${useId().replace(/:/g, '')}`

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(22,58,112,0.06)]">
      <svg
        className="h-6 w-6 overflow-visible"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <radialGradient
            id={gradId}
            cx="30%"
            cy="107%"
            r="150%"
            fx="30%"
            fy="107%"
          >
            <stop offset="0%" stopColor="#FFDC80" />
            <stop offset="25%" stopColor="#FCAF45" />
            <stop offset="50%" stopColor="#F77737" />
            <stop offset="70%" stopColor="#F56040" />
            <stop offset="85%" stopColor="#C13584" />
            <stop offset="100%" stopColor="#833AB4" />
          </radialGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5.5" fill={`url(#${gradId})`} />
        <circle
          cx="12"
          cy="12"
          r="4.2"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.75"
        />
        <circle cx="17.2" cy="6.8" r="1.2" fill="#FFFFFF" />
      </svg>
    </span>
  )
}

/** 학부모 홈 상단 — 네이버 블로그 / Instagram 바로가기 */
export function ParentHyperNewsLinks() {
  return (
    <section aria-label="HYPER 소식" className="mb-3 sm:mb-4">
      <div className="grid grid-cols-2 gap-2">
        <SocialLinkCard
          href={NAVER_BLOG_URL}
          title="네이버 블로그"
          subtitle="학원 소식 · 학습 정보"
          accent={<NaverAccent />}
        />
        <SocialLinkCard
          href={INSTAGRAM_URL}
          title="Instagram"
          subtitle="HYPER 일상 · 새로운 소식"
          accent={<InstagramAccent />}
        />
      </div>
    </section>
  )
}
