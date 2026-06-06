import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CLOTHING_CATEGORIES = [
  { value: 'tops', label: 'Tops', emoji: '👕' },
  { value: 'bottoms', label: 'Bottoms', emoji: '👖' },
  { value: 'dresses', label: 'Dresses', emoji: '👗' },
  { value: 'outerwear', label: 'Outerwear', emoji: '🧥' },
  { value: 'shoes', label: 'Shoes', emoji: '👟' },
  { value: 'accessories', label: 'Accessories', emoji: '👒' },
  { value: 'bags', label: 'Bags', emoji: '👜' },
  { value: 'underwear', label: 'Underwear', emoji: '🩲' },
  { value: 'activewear', label: 'Activewear', emoji: '🏃' },
  { value: 'other', label: 'Other', emoji: '🎁' },
] as const

export const SEASONS = [
  { value: 'spring', label: 'Spring', emoji: '🌸' },
  { value: 'summer', label: 'Summer', emoji: '☀️' },
  { value: 'autumn', label: 'Autumn', emoji: '🍂' },
  { value: 'winter', label: 'Winter', emoji: '❄️' },
  { value: 'all', label: 'All seasons', emoji: '🌍' },
] as const
