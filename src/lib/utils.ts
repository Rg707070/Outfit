import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CLOTHING_CATEGORIES = [
  { value: 'tops', label: 'חולצות', emoji: '👕' },
  { value: 'bottoms', label: 'מכנסיים', emoji: '👖' },
  { value: 'dresses', label: 'שמלות', emoji: '👗' },
  { value: 'outerwear', label: 'מעילים', emoji: '🧥' },
  { value: 'shoes', label: 'נעליים', emoji: '👟' },
  { value: 'accessories', label: 'אביזרים', emoji: '👒' },
  { value: 'bags', label: 'תיקים', emoji: '👜' },
  { value: 'underwear', label: 'הלבשה תחתונה', emoji: '🩲' },
  { value: 'activewear', label: 'בגדי ספורט', emoji: '🏃' },
  { value: 'other', label: 'אחר', emoji: '🎁' },
] as const

export const SEASONS = [
  { value: 'spring', label: 'אביב', emoji: '🌸' },
  { value: 'summer', label: 'קיץ', emoji: '☀️' },
  { value: 'autumn', label: 'סתיו', emoji: '🍂' },
  { value: 'winter', label: 'חורף', emoji: '❄️' },
  { value: 'all', label: 'כל העונות', emoji: '🌍' },
] as const
