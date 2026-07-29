import { useState } from 'react'
import type { QuestionImageAttachment } from '../../types/records'
import { QUESTION_IMAGE_LIST_THUMBNAIL_LIMIT } from '../../utils/questionImages'
import { ImageLightbox } from './ImageLightbox'

type QuestionImageGalleryProps = {
  title: string
  images: QuestionImageAttachment[]
  compact?: boolean
  /** 학부모 화면: 이미지를 화면 너비에 맞게 표시 */
  fullWidth?: boolean
}

export function QuestionImageGallery({
  title,
  images,
  compact = false,
  fullWidth = false,
}: QuestionImageGalleryProps) {
  const [previewImage, setPreviewImage] = useState<QuestionImageAttachment | null>(null)

  if (images.length === 0) return null

  const visibleImages = compact
    ? images.slice(0, QUESTION_IMAGE_LIST_THUMBNAIL_LIMIT)
    : images
  const hiddenCount = compact ? Math.max(0, images.length - visibleImages.length) : 0

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">
        {compact ? `📷 ${title} ${images.length}장` : title}
      </p>

      <div className={fullWidth ? 'space-y-3' : 'flex flex-wrap gap-2'}>
        {visibleImages.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setPreviewImage(image)}
            className={
              fullWidth
                ? 'block w-full overflow-hidden rounded-lg border border-slate-200'
                : 'overflow-hidden rounded-lg border border-slate-200'
            }
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className={
                fullWidth
                  ? 'max-h-[480px] w-full object-contain'
                  : 'h-[72px] w-[72px] object-cover sm:h-[80px] sm:w-[80px]'
              }
            />
          </button>
        ))}
        {hiddenCount > 0 && (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs font-medium text-slate-500 sm:h-[80px] sm:w-[80px]">
            +{hiddenCount}
          </div>
        )}
      </div>

      <ImageLightbox
        open={!!previewImage}
        src={previewImage?.dataUrl ?? ''}
        alt={previewImage?.name ?? ''}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}
