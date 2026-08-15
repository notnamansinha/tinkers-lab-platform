import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/lib/firebase'

// ============================================================
// CONSTANTS
// ============================================================
export const MAX_IMAGE_SIZE  = 5 * 1024 * 1024  // 5 MB
export const MAX_IMAGES      = 5
export const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/webp'] as const

// ============================================================
// TYPES
// ============================================================
export interface UploadProgress {
  progress: number  // 0–100
  url: string | null
  error: string | null
}

// ============================================================
// VALIDATION
// ============================================================
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type as typeof ALLOWED_TYPES[number])) {
    return `Invalid file type "${file.type}". Allowed: JPEG, PNG, WebP.`
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 5 MB.`
  }
  return null
}

// ============================================================
// UPLOAD
// Uploads a single image under equipment/{equipmentId}/{timestamp}_{sanitizedName}
// Returns a Promise that resolves to the public download URL.
// ============================================================
export async function uploadEquipmentImage(
  equipmentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const error = validateImageFile(file)
  if (error) throw new Error(error)

  const sanitized  = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const fileName   = `${Date.now()}_${sanitized}`
  const storageRef = ref(storage, `equipment/${equipmentId}/${fileName}`)

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
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          resolve(url)
        } catch (e) {
          reject(e)
        }
      },
    )
  })
}

// ============================================================
// DELETE
// Deletes a single image from Storage by its full download URL.
// Silently ignores 404 (already deleted).
// ============================================================
export async function deleteEquipmentImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl)
    await deleteObject(storageRef)
  } catch (e: unknown) {
    // Ignore "object-not-found" — image may already be gone
    if ((e as { code?: string }).code !== 'storage/object-not-found') throw e
  }
}

// ============================================================
// DELETE ALL
// Convenience helper to remove all images for a given equipment item.
// ============================================================
export async function deleteAllEquipmentImages(imageUrls: string[]): Promise<void> {
  await Promise.allSettled(imageUrls.map(deleteEquipmentImage))
}
