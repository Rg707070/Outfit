import type { Outfit, OutfitHistory, Season } from '@/types/database'
import { tempToSeasons } from './weather'

// "What to wear today" scoring. Pure functions so they're unit-testable and so a
// Claude-powered reasoning layer can later replace `scoreOutfit` without UI changes.
//
// We rank the user's saved outfits by:
//  - rotation: favour outfits not worn recently (variety, "wear what you own")
//  - season:   match the outfit's season to today's temperature
//  - occasion: match the outfit's occasion to the user's selected occasion
//  - favourite: a small tie-breaker bump

export type ReasonCode =
  | 'neverWorn'
  | 'notWornRecently'
  | 'seasonMatch'
  | 'occasionMatch'
  | 'favorite'

export interface ScoredOutfit {
  outfit: Outfit
  score: number
  reasons: ReasonCode[]
}

export interface RecommendInput {
  outfits: Outfit[]
  history: OutfitHistory[]
  temp: number | null
  occasion?: string | null
  today?: Date
}

export function daysSince(isoDate: string, today: Date): number {
  const d = new Date(`${isoDate}T00:00:00`)
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000)
}

/** Most recent worn date (ISO) for an outfit, or null if never logged. */
export function lastWorn(outfitId: string, history: OutfitHistory[]): string | null {
  const dates = history
    .filter((h) => h.outfit_id === outfitId)
    .map((h) => h.worn_date)
    .sort()
  return dates.length ? dates[dates.length - 1] : null
}

export function scoreOutfit(outfit: Outfit, input: RecommendInput): ScoredOutfit {
  const today = input.today ?? new Date()
  const reasons: ReasonCode[] = []
  let score = 0

  // Rotation — never-worn gets a flat boost; otherwise scale with days since worn.
  const lw = lastWorn(outfit.id, input.history)
  if (!lw) {
    score += 30
    reasons.push('neverWorn')
  } else {
    const d = daysSince(lw, today)
    score += Math.min(Math.max(d, 0), 30)
    if (d >= 14) reasons.push('notWornRecently')
  }

  // Season — reward a match to today's temperature, penalise a clear mismatch.
  if (input.temp != null && outfit.season && outfit.season !== 'all') {
    if (tempToSeasons(input.temp).includes(outfit.season as Season)) {
      score += 20
      reasons.push('seasonMatch')
    } else {
      score -= 15
    }
  }

  // Occasion — only when the user picked one.
  if (input.occasion && outfit.occasion) {
    if (outfit.occasion.toLowerCase().includes(input.occasion.toLowerCase())) {
      score += 25
      reasons.push('occasionMatch')
    } else {
      score -= 10
    }
  }

  if (outfit.is_favorite) {
    score += 5
    reasons.push('favorite')
  }

  return { outfit, score, reasons }
}

export function recommendOutfits(input: RecommendInput): ScoredOutfit[] {
  return input.outfits
    .map((o) => scoreOutfit(o, input))
    .sort((a, b) => b.score - a.score)
}
