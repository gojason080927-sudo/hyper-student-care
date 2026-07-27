import { X } from 'lucide-react'
import { useEffect } from 'react'

type ImageLightboxProps = {
  open: boolean
  src: string
  alt: string
  onClose: () => void
}

export function ImageLightbox({ open, src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] max-w-[min(100%,900px)]">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 text-slate-600 shadow-lg hover:bg-slate-50 sm:-right-3 sm:-top-3"
        >
          <X className="h-5 w-5" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
      </div>
    </div>
  )
}
