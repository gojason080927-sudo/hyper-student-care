import { useState } from 'react'
import type { QuestionImageAttachment } from '../../types/records'
import { QUESTION_IMAGE_LIST_THUMBNAIL_LIMIT } from '../../utils/questionImages'
import { ImageLightbox } from './ImageLightbox'

type QuestionImageGalleryProps = {
  title: string
  images: QuestionImageAttachment[]
  compact?: boolean
}

export function QuestionImageGallery({
  title,
  images,
  compact = false,
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

      <div className="flex flex-wrap gap-2">
        {visibleImages.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setPreviewImage(image)}
            className="overflow-hidden rounded-lg border border-slate-200"
          >
            <img
              src={image.dataUrl}
              alt={image.name}
              className="h-[72px] w-[72px] object-cover sm:h-[80px] sm:w-[80px]"
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
