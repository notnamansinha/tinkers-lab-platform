import React, { useCallback, useRef, useState } from 'react'
import { Upload, X, Loader2, FileText, ImagePlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadFile, deleteFile, IMAGE_TYPES, DOC_TYPES, MAX_IMAGE_SIZE, MAX_DOC_SIZE } from '@/services/firebase/uploads'
import { toast } from 'sonner'

interface FileUploaderProps {
  /** Storage folder + entity ID → {folder}/{entityId}/{fileName} */
  folder: 'projects' | 'workshops'
  entityId: string
  /** Current URLs saved in Firestore */
  existingUrls: string[]
  /** Called whenever the URL list changes (upload or delete) */
  onChange: (urls: string[]) => void
  /** 'images' = pictures only; 'documents' = PDFs/docs; 'materials' = both */
  kind?: 'images' | 'documents' | 'materials'
  maxFiles?: number
  disabled?: boolean
  label?: string
}

const ALLOWED_BY_KIND: Record<NonNullable<FileUploaderProps['kind']>, readonly string[]> = {
  images: IMAGE_TYPES,
  documents: DOC_TYPES,
  materials: [...IMAGE_TYPES, ...DOC_TYPES],
}

const MAX_BY_KIND: Record<NonNullable<FileUploaderProps['kind']>, number> = {
  images: MAX_IMAGE_SIZE,
  documents: MAX_DOC_SIZE,
  materials: MAX_IMAGE_SIZE,
}

interface UploadState {
  file: File
  progress: number
  done: boolean
  error: string | null
}

export function FileUploader({
  folder,
  entityId,
  existingUrls,
  onChange,
  kind = 'images',
  maxFiles = 5,
  disabled = false,
  label,
}: FileUploaderProps) {
  const [urls, setUrls] = useState<string[]>(existingUrls)
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setUrls(existingUrls)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingUrls.join(',')])

  const allowedTypes = ALLOWED_BY_KIND[kind]
  const maxSize = MAX_BY_KIND[kind]

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const remaining = maxFiles - urls.length
      if (remaining <= 0) {
        toast.error(`Maximum ${maxFiles} files allowed.`)
        return
      }

      const toUpload = Array.from(files).slice(0, remaining)
      for (const file of toUpload) {
        setUploads((prev) => [...prev, { file, progress: 0, done: false, error: null }])
        try {
          const url = await uploadFile(
            { folder, entityId, allowedTypes, maxSize, kind: kind === 'images' || kind === 'documents' ? kind : undefined },
            file,
            (pct) => {
              setUploads((prev) =>
                prev.map((u) => (u.file.name === file.name ? { ...u, progress: pct } : u)),
              )
            },
          )
          setUploads((prev) =>
            prev.map((u) => (u.file.name === file.name ? { ...u, done: true, progress: 100 } : u)),
          )
          setUrls((previous) => {
            const next = [...previous, url]
            onChange(next)
            return next
          })
        } catch (e) {
          setUploads((prev) =>
            prev.map((u) => (u.file.name === file.name ? { ...u, error: e instanceof Error ? e.message : 'Upload failed' } : u)),
          )
        }
      }
    },
    [allowedTypes, entityId, folder, kind, maxFiles, maxSize, onChange, urls],
  )

  const handleDelete = async (url: string) => {
    const next = urls.filter((u) => u !== url)
    setUrls(next)
    onChange(next)
    try {
      await deleteFile(url)
    } catch {
      toast.error('Failed to delete file from storage.')
    }
  }

  const accept = allowedTypes.join(',')

  return (
    <div>
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-white/20 bg-black/20 px-4 py-6 text-center transition-colors',
          isDragging && 'border-pink bg-pink/10',
          disabled && 'pointer-events-none opacity-50',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo/25 text-white/70">
          {kind === 'documents' ? <FileText className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        </span>
        <p className="text-sm font-semibold text-white/70">
          {label ?? (kind === 'documents' ? 'Upload documents' : 'Upload images')}
        </p>
        <p className="text-[11px] text-white/40">
          {allowedTypes.map((t) => t.split('/')[1]?.toUpperCase()).join(', ')} · max {(maxSize / 1024 / 1024).toFixed(0)} MB · up to {maxFiles}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-2">
          {uploads.map((u, idx) => (
            <li key={`${u.file.name}-${idx}`} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs">
              <Loader2 className={cn('h-3.5 w-3.5 text-white/40', !u.done && !u.error && 'animate-spin')} />
              <span className="flex-1 truncate text-white/70">{u.file.name}</span>
              {u.error ? (
                <span className="text-red-400">{u.error}</span>
              ) : (
                <span className="text-white/40">{u.progress}%</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {urls.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {urls.map((url) => {
            const isImage = /\.(jpe?g|png|webp)(\?|$)/i.test(url)
            return (
              <li key={url} className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                {isImage ? (
                  <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-white/50" />
                )}
                <a href={url} target="_blank" rel="noreferrer" className="flex-1 truncate text-xs text-indigo-300 underline-offset-2 hover:underline">
                  {decodeURIComponent(url.split('/').pop() ?? url)}
                </a>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void handleDelete(url)}
                  className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <span className="sr-only">
        <Upload className="h-0 w-0" />
      </span>
    </div>
  )
}
