import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

// ============================================================
// GENERIC STORAGE UPLOADS
// Shared helpers for project images/documents and workshop
// materials. Equipment images keep their own module
// (equipmentImages.ts) for backwards compatibility.
// Path layout: {folder}/{entityId}/{timestamp}_{sanitizedName}
// ============================================================

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5 MB
export const MAX_DOC_SIZE = 10 * 1024 * 1024 // 10 MB
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const

export interface UploadOptions {
  /** Storage folder, e.g. 'projects' or 'workshops' */
  folder: string
  /** Entity ID used as the folder key, e.g. project doc ID */
  entityId: string
  /** Allowed MIME types; defaults to images */
  allowedTypes?: readonly string[]
  /** Max file size in bytes; defaults to 5 MB */
  maxSize?: number
  /** Project subfolder; workshop materials stay directly under the workshop. */
  kind?: 'images' | 'documents'
}

export function validateUpload(
  file: File,
  allowedTypes: readonly string[] = IMAGE_TYPES,
  maxSize: number = MAX_IMAGE_SIZE,
): string | null {
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file type "${file.type}". Allowed: ${allowedTypes.join(', ')}.`
  }
  if (file.size > maxSize) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is ${(maxSize / 1024 / 1024).toFixed(0)} MB.`
  }
  return null
}

export async function uploadFile(
  options: UploadOptions,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const allowed = options.allowedTypes ?? IMAGE_TYPES
  const maxSize = options.maxSize ?? MAX_IMAGE_SIZE
  const error = validateUpload(file, allowed, maxSize)
  if (error) throw new Error(error)

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName = `${Date.now()}_${sanitized}`
  const segment = options.folder === 'projects' && options.kind ? `/${options.kind}` : ''
  const storageRef = ref(storage, `${options.folder}/${options.entityId}${segment}/${fileName}`)

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.(pct)
      },
      (err) => reject(new Error(err.message)),
      async () => {
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref))
        } catch (e) {
          reject(e)
        }
      },
    )
  })
}

export async function deleteFile(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url)
    await deleteObject(storageRef)
  } catch (e: unknown) {
    // Ignore "object-not-found" — the file may already be gone.
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e
  }
}

export async function deleteAllFiles(urls: string[]): Promise<void> {
  await Promise.allSettled(urls.map(deleteFile))
}
