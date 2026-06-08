'use client'
import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { WardrobeItem, ClothingCategory } from '@/types/database'
import { CLOTHING_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/dialog'
import {
  useWardrobe,
  useWardrobeStats,
  useToggleWardrobeFavorite,
  useDeleteWardrobeItem,
  WARDROBE_PAGE_SIZE,
} from '@/hooks/use-wardrobe'
import { useAuth } from '@/contexts/auth-context'
import { useDebounce } from '@/hooks/use-debounce'
import { validateImageFile } from '@/lib/validations'
import { wardrobeItemSchema } from '@/lib/validations'
import { Plus, Search, Heart, Upload, Trash2 } from 'lucide-react'

export default function WardrobePage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<ClothingCategory | 'all'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [limit, setLimit] = useState(WARDROBE_PAGE_SIZE)
  const { toast } = useToast()

  const debouncedSearch = useDebounce(search)

  const { data: statsData = [] } = useWardrobeStats()
  const {
    data,
    isLoading: loading,
    error,
  } = useWardrobe({
    search: debouncedSearch,
    category: activeCategory,
    limit,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const hasMore = items.length < total

  const toggleFavoriteMutation = useToggleWardrobeFavorite()
  const deleteMutation = useDeleteWardrobeItem()

  async function toggleFavorite(item: WardrobeItem) {
    try {
      await toggleFavoriteMutation.mutateAsync({
        id: item.id,
        isFavorite: item.is_favorite ?? false,
      })
      toast(item.is_favorite ? 'הוסר מהמועדפים' : 'נוסף למועדפים ❤️')
    } catch {
      toast('שגיאה בעדכון המועדף', 'error')
    }
  }

  async function confirmDelete(item: WardrobeItem) {
    try {
      await deleteMutation.mutateAsync(item.id)
      setDeletingId(null)
      toast('הפריט הוסר מהארון', 'info')
    } catch {
      toast('שגיאה במחיקת הפריט', 'error')
    }
  }

  const counts = CLOTHING_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value] = statsData.filter((i) => i.category === cat.value).length
      return acc
    },
    {} as Record<string, number>
  )
  const totalCount = statsData.length

  const deletingItem = deletingId ? items.find((i) => i.id === deletingId) : null

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">שגיאה בטעינת הארון. אנא נסה לרענן את הדף.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ארון בגדים</h1>
          <p className="text-gray-500 text-sm mt-1">{totalCount} פריטים</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          הוסף פריט
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-6 pb-2">
        <button
          onClick={() => {
            setActiveCategory('all')
            setLimit(WARDROBE_PAGE_SIZE)
          }}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-black text-white'
              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          הכל ({totalCount})
        </button>
        {CLOTHING_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setActiveCategory(cat.value as ClothingCategory)
              setLimit(WARDROBE_PAGE_SIZE)
            }}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-black text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
            {counts[cat.value] > 0 && (
              <span
                className={`text-xs rounded-full px-1.5 ${activeCategory === cat.value ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}
              >
                {counts[cat.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="חפש לפי שם או מותג…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl">👗</span>
          <p className="text-gray-500 mt-4 text-lg font-medium">הארון שלך ריק</p>
          <p className="text-gray-400 text-sm mt-1">
            הוסף פריטי לבוש כאן — לאחר מכן תוכל לבנות לוקים מהם
          </p>
          <Button className="mt-6" onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            הוסף פריט ראשון
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <p className="text-gray-500 mt-3 font-medium">אין פריטים תואמים לחיפוש</p>
          <button
            onClick={() => {
              setSearch('')
              setActiveCategory('all')
              setLimit(WARDROBE_PAGE_SIZE)
            }}
            className="text-sm text-gray-400 underline mt-2"
          >
            נקה סינון
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-50 dark:bg-gray-800 relative">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl">
                        {CLOTHING_CATEGORIES.find((c) => c.value === item.category)?.emoji ?? '👗'}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => toggleFavorite(item)}
                      className="p-1.5 bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
                      aria-label={item.is_favorite ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                    >
                      <Heart
                        size={12}
                        className={item.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}
                      />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50 hover:scale-110 transition-all"
                      aria-label="הסר פריט"
                    >
                      <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                  {item.is_favorite && (
                    <div className="absolute top-2 left-2">
                      <Heart size={14} className="fill-red-500 text-red-500" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
                  {item.color && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-400 truncate">{item.color}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button variant="secondary" onClick={() => setLimit((l) => l + WARDROBE_PAGE_SIZE)}>
                טען עוד ({total - items.length} נוספים)
              </Button>
            </div>
          )}
        </>
      )}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onAdded={() => toast('הפריט נוסף לארון! 🎉')}
        />
      )}

      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null)
        }}
        title="הסרת פריט?"
        description={deletingItem ? `"${deletingItem.name}" יוסר מהארון שלך.` : undefined}
        confirmLabel="הסר"
        cancelLabel="ביטול"
        onConfirm={() => deletingItem && confirmDelete(deletingItem)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

function AddItemModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('tops')
  const [brand, setBrand] = useState('')
  const [color, setColor] = useState('#000000')
  const [hasColor, setHasColor] = useState(false)
  const [imageFile, setImageFile] = useState<File | Blob | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [removeBgEnabled, setRemoveBgEnabled] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processMsg, setProcessMsg] = useState('')
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = createClient()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      setFileError(validationError)
      return
    }
    setFileError('')
    setOriginalFile(file)
    if (removeBgEnabled) {
      processBg(file)
    } else {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  async function processBg(file: File) {
    setProcessing(true)
    setProcessMsg('טוען מודל…')
    try {
      const { removeBg } = await import('@/lib/remove-bg')
      const result = await removeBg(file, (msg) => setProcessMsg(msg))
      setImageFile(result)
      setImagePreview(URL.createObjectURL(result))
    } catch {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    } finally {
      setProcessing(false)
      setProcessMsg('')
    }
  }

  function toggleRemoveBg() {
    const next = !removeBgEnabled
    setRemoveBgEnabled(next)
    if (originalFile) {
      if (next) processBg(originalFile)
      else {
        setImageFile(originalFile)
        setImagePreview(URL.createObjectURL(originalFile))
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = wardrobeItemSchema.safeParse({ name, brand: brand || undefined })
    if (!result.success) {
      setNameError(result.error.issues[0]?.message ?? 'שגיאה')
      return
    }
    setNameError('')

    if (!user) return
    setLoading(true)

    try {
      let image_url: string | null = null
      if (imageFile) {
        const ext =
          imageFile.type === 'image/png' ? 'png' : (originalFile?.name.split('.').pop() ?? 'jpg')
        const path = `${user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('wardrobe')
          .upload(path, imageFile, { contentType: imageFile.type || 'image/jpeg' })
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('wardrobe').getPublicUrl(path)
        image_url = data.publicUrl
      }

      const { error: insertError } = await supabase.from('wardrobe_items').insert({
        user_id: user.id,
        name,
        category,
        brand: brand || null,
        color: hasColor ? color : null,
        image_url,
      })
      if (insertError) throw insertError

      onAdded()
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'שגיאה בהוספת הפריט', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="text-lg font-semibold dark:text-white">הוסף פריט לבוש</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Image upload */}
          <label className="block">
            <div
              className={`border-2 border-dashed rounded-2xl flex items-center justify-center cursor-pointer transition-colors relative overflow-hidden ${
                imagePreview ? 'border-transparent' : 'border-gray-200 hover:border-gray-300 h-40'
              }`}
              style={
                imagePreview
                  ? {
                      backgroundImage:
                        'linear-gradient(45deg,#f3f4f6 25%,transparent 25%),linear-gradient(-45deg,#f3f4f6 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f3f4f6 75%),linear-gradient(-45deg,transparent 75%,#f3f4f6 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
                    }
                  : undefined
              }
            >
              {imagePreview ? (
                <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-40 object-contain" />
              ) : (
                <div className="text-center">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">לחץ להעלאת תמונה</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · מקסימום 5 MB</p>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center">
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-600 mt-2">{processMsg || 'מסיר רקע…'}</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFile}
              className="sr-only"
              disabled={processing}
            />
          </label>
          {fileError && <p className="text-xs text-red-500">{fileError}</p>}

          {/* Background removal toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              onClick={toggleRemoveBg}
              disabled={processing}
              className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 ${removeBgEnabled ? 'bg-black' : 'bg-gray-200'}`}
              aria-label="הסרת רקע אוטומטית"
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${removeBgEnabled ? 'translate-x-4' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">✂️ הסר רקע אוטומטית</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              שם <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוג׳ חולצה לבנה מכותנה"
              required
            />
            {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              קטגוריה <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ClothingCategory)}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:text-white"
            >
              {CLOTHING_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              מותג
            </label>
            <Input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="לדוג׳ Zara, H&M…"
            />
          </div>

          {/* Color picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">צבע</label>
              <button
                type="button"
                onClick={() => setHasColor(!hasColor)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {hasColor ? 'הסר צבע' : '+ הוסף צבע'}
              </button>
            </div>
            {hasColor && (
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <span className="text-sm text-gray-600 font-mono">{color}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              ביטול
            </Button>
            <Button type="submit" disabled={loading || processing || !name} className="flex-1">
              {loading ? 'מוסיף…' : 'הוסף פריט'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
