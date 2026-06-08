import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להיות לפחות 6 תווים'),
})

export const signupSchema = z.object({
  fullName: z.string().min(2, 'השם חייב להכיל לפחות 2 תווים').max(60),
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להיות לפחות 6 תווים').max(128),
})

export const wardrobeItemSchema = z.object({
  name: z.string().min(1, 'נדרש שם לפריט').max(100, 'השם ארוך מדי'),
  brand: z.string().max(60, 'שם המותג ארוך מדי').optional(),
})

export const outfitSchema = z.object({
  name: z.string().min(1, 'נדרש שם ללוק').max(100, 'השם ארוך מדי'),
  occasion: z.string().max(60).optional(),
})

export const shoppingItemSchema = z.object({
  name: z.string().min(1, 'נדרש שם לפריט').max(100, 'השם ארוך מדי'),
  brand: z.string().max(60).optional(),
  price: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) >= 0), 'מחיר לא תקין'),
  url: z.string().url('כתובת URL לא תקינה').optional().or(z.literal('')),
})

export const historyEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך לא תקין'),
  notes: z.string().max(500).optional(),
  categoryLabel: z.string().max(60).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type WardrobeItemInput = z.infer<typeof wardrobeItemSchema>
export type OutfitInput = z.infer<typeof outfitSchema>
export type ShoppingItemInput = z.infer<typeof shoppingItemSchema>
export type HistoryEntryInput = z.infer<typeof historyEntrySchema>

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return 'סוג קובץ לא נתמך — יש להעלות JPG, PNG, WEBP או GIF'
  if (file.size > MAX_UPLOAD_BYTES) return 'הקובץ גדול מדי — מקסימום 5 MB'
  return null
}
