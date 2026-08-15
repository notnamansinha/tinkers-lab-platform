import React, { useCallback, useRef, useState } from 'react'
import { Upload, X, ImagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  uploadEquipmentImage,
  deleteEquipmentImage,
  validateImageFile,
  MAX_IMAGES,
  ALLOWED_TYPES,
} from '@/services/firebase/equipmentImages'
import { toast } from 'sonner'

interface ImageUploaderProps {
  /** The Firestore / Storage equipment ID used as the storage folder key. */
  equipmentId: string
  /** Current image URLs saved in Firestore. */
  existingUrls: string[]
  /** Called whenever the URL list changes (upload or delete). */
  onChange: (urls: string[]) => void
  /** Override the maximum number of images (default = MAX_IMAGES = 5). */
  maxImages?: number
  disabled?: boolean
}

interface UploadState {
  file: File
  progress: number  // 0–100
  done: boolean
  error: string | null
}

export function ImageUploader({
  equipmentId,
  existingUrls,
  onChange,
  maxImages = MAX_IMAGES,
  disabled = false,
}: ImageUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep internal state in sync when parent resets the form (e.g. on edit load)
  React.useEffect(() => {
    setUrls(existingUrls)
  }, [existingUrls.join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = maxImages - urls.length
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed.`)
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)

    // Client-side validate before starting any uploads
    for (const f of toUpload) {
      const err = validateImageFile(f)
      if (err) {
        toast.error(err)
        return
      }
    }

    // Initialise upload states
    const newUploads: UploadState[] = toUpload.map(f => ({
      file: f, progress: 0, done: false, error: null,
    }))
    setUploads(prev => [...prev, ...newUploads])

    const newUrls: string[] = []
    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]
      const uploadIdx = uploads.length + i

      try {
        const url = await uploadEquipmentImage(equipmentId, file, (pct) => {
          setUploads(prev => {
            const copy = [...prev]
            copy[uploadIdx] = { ...copy[uploadIdx], progress: pct }
            return copy
          })
        })
        newUrls.push(url)
        setUploads(prev => {
          const copy = [...prev]
          copy[uploadIdx] = { ...copy[uploadIdx], progress: 100, done: true }
          return copy
        })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        setUploads(prev => {
          const copy = [...prev]
          copy[uploadIdx] = { ...copy[uploadIdx], error: msg }
          return copy
        })
        toast.error(msg)
      }
    }

    if (newUrls.length > 0) {
      setUrls(prev => {
        const updated = [...prev, ...newUrls]
        onChange(updated)
        return updated
      })
    }

    // Clear completed/errored uploads after a short delay
    setTimeout(() => {
      setUploads(prev => prev.filter(u => !u.done && !u.error))
    }, 1500)
  }, [urls, uploads, equipmentId, maxImages, onChange])

  const handleDelete = useCallback(async (url: string) => {
    try {
      await deleteEquipmentImage(url)
    } catch {
      // Non-fatal — remove from list even if Storage delete fails
    }
    setUrls(prev => {
      const updated = prev.filter(u => u !== url)
      onChange(updated)
      return updated
    })
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)

  const activeUploads = uploads.filter(u => !u.done && !u.error)
  const isFull = urls.length >= maxImages

  return (
    <div className="space-y-4">
      {/* Existing image thumbnails */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {urls.map((url, idx) => (
            <div
              key={url}
              className="relative group w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-black shadow-md"
            >
              <img
                src={url}
                alt={`Equipment image ${idx + 1}`}
                className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
              />
              {/* Primary badge */}
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] font-bold uppercase tracking-wider bg-lime text-black px-1.5 py-0.5 rounded-full leading-none">
                  Primary
                </span>
              )}
              {/* Delete button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleDelete(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active upload progress bars */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((u, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 size={12} className="animate-spin text-lime" />
                <span className="text-xs text-white/60 truncate">{u.file.name}</span>
                <span className="text-xs text-lime ml-auto">{u.progress}%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime rounded-full transition-all duration-150"
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — hidden when at max */}
      {!isFull && !disabled && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200',
            isDragging
              ? 'border-lime bg-lime/10 shadow-[0_0_0_4px_rgba(224,239,74,0.12)]'
              : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]',
          )}
        >
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-lime/20' : 'bg-white/5',
          )}>
            {isDragging ? (
              <Upload size={22} className="text-lime" />
            ) : (
              <ImagePlus size={22} className="text-white/40" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              {isDragging ? 'Drop to upload' : 'Drag & drop images here'}
            </p>
            <p className="text-xs text-white/40 mt-1">
              or <span className="text-lime underline underline-offset-2">browse files</span>
            </p>
            <p className="text-[10px] text-white/25 mt-2 uppercase tracking-wider">
              JPEG · PNG · WebP · max 5 MB each · {urls.length}/{maxImages} used
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            className="sr-only"
            onChange={e => handleFiles(e.target.files)}
            aria-label="Upload equipment images"
          />
        </div>
      )}

      {isFull && (
        <p className="text-xs text-white/40 text-center py-2">
          Maximum {maxImages} images reached. Remove one to add another.
        </p>
      )}
    </div>
  )
}
