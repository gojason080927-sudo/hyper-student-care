import { ImagePlus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { QuestionImageAttachment } from '../../types/records'
import {
  formatImageFileSize,
  processQuestionImageFiles,
  QUESTION_IMAGE_ACCEPT,
  QUESTION_IMAGE_MAX_COUNT,
  removeQuestionImage,
} from '../../utils/questionImages'
import { btnSecondary } from '../../utils/labels'
import { ImageLightbox } from './ImageLightbox'

type ImageAttachmentInputProps = {
  label: string
  buttonLabel?: string
  images: QuestionImageAttachment[]
  onChange: (images: QuestionImageAttachment[]) => void
  onError?: (message: string) => void
  disabled?: boolean
  /** 모바일: 카메라/갤러리 분리 버튼 (capture로 갤러리 차단 방지) */
  mobilePickers?: boolean
}

export function ImageAttachmentInput({
  label,
  buttonLabel = '사진 선택',
  images,
  onChange,
  onError,
  disabled = false,
  mobilePickers = false,
}: ImageAttachmentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState<QuestionImageAttachment | null>(null)

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target
    if (!files || files.length === 0) return

    setProcessing(true)
    const { attachments, errors } = await processQuestionImageFiles(files, images.length)
    setProcessing(false)
    event.target.value = ''

    if (errors.length > 0) {
      errors.forEach((message) => onError?.(message))
    }
    if (attachments.length > 0) {
      onChange([...images, ...attachments])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-xs text-slate-500">
          {images.length}/{QUESTION_IMAGE_MAX_COUNT}장
        </span>
      </div>

      {!disabled && images.length < QUESTION_IMAGE_MAX_COUNT && (
        <>
          {mobilePickers ? (
            <>
              <input
                ref={cameraInputRef}
                type="file"
                accept={QUESTION_IMAGE_ACCEPT}
                capture="environment"
                className="hidden"
                onChange={handleSelect}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept={QUESTION_IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={handleSelect}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => cameraInputRef.current?.click()}
                  className={`${btnSecondary} inline-flex min-h-11 flex-1 items-center justify-center gap-2`}
                >
                  <ImagePlus className="h-4 w-4" />
                  {processing ? '처리 중…' : '카메라'}
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => galleryInputRef.current?.click()}
                  className={`${btnSecondary} inline-flex min-h-11 flex-1 items-center justify-center gap-2`}
                >
                  <ImagePlus className="h-4 w-4" />
                  {processing ? '처리 중…' : '갤러리'}
                </button>
              </div>
            </>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={QUESTION_IMAGE_ACCEPT}
                multiple
                className="hidden"
                onChange={handleSelect}
              />
              <button
                type="button"
                disabled={processing}
                onClick={() => inputRef.current?.click()}
                className={`${btnSecondary} inline-flex items-center gap-2`}
              >
                <ImagePlus className="h-4 w-4" />
                {processing ? '처리 중…' : buttonLabel}
              </button>
            </>
          )}
        </>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <button
                type="button"
                onClick={() => setPreviewImage(image)}
                className="block h-[120px] w-full overflow-hidden"
              >
                <img
                  src={image.dataUrl}
                  alt={image.name}
                  className="h-[120px] w-full object-cover"
                />
              </button>
              <div className="flex items-start justify-between gap-2 p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-700">{image.name}</p>
                  <p className="text-xs text-slate-500">{formatImageFileSize(image.size)}</p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => onChange(removeQuestionImage(images, image.id))}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageLightbox
        open={!!previewImage}
        src={previewImage?.dataUrl ?? ''}
        alt={previewImage?.name ?? ''}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}
