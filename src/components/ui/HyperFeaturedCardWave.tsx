/** Navy→mint featured card 하단 민트 웨이브 (강사·학부모 공통) */
export function HyperFeaturedCardWave() {
  return (
    <svg
      className="tm-featured-wave"
      viewBox="0 0 400 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        fillOpacity={0.28}
        d="M0,28 C80,44 160,12 240,28 S360,40 400,24 L400,48 L0,48 Z"
      />
      <path
        fill="currentColor"
        fillOpacity={0.18}
        d="M0,36 C100,20 200,44 300,30 S380,16 400,32 L400,48 L0,48 Z"
      />
    </svg>
  )
}
