// In-browser background removal — runs client-side, free, no server cost.
// The model is lazy-loaded from CDN only when first used to keep the bundle light.

export async function removeBg(
  file: File | Blob,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(file, {
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
