// In-browser background removal — runs client-side, free, no server cost.
// The model is lazy-loaded from CDN only when first used to keep the bundle light.

const MAX_DIM = 1024

// Resize to at most MAX_DIM on the longest side before ML processing or upload.
// Dramatically reduces background-removal time on high-res camera photos.
export function resizeImage(file: File | Blob, maxDim = MAX_DIM): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      const scale = Math.min(1, maxDim / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
    }
    img.onerror = reject
    img.src = url
  })
}

export async function removeBg(
  file: File | Blob,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const resized = await resizeImage(file)
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(resized, {
    output: { format: 'image/png', quality: 0.8 },
    progress: (key: string, current: number, total: number) => {
      if (onProgress) {
        const pct = total ? Math.round((current / total) * 100) : 0
        onProgress(key.startsWith('fetch') ? `Loading model… ${pct}%` : `Processing… ${pct}%`)
      }
    },
  })
  return blob
}
