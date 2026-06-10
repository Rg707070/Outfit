import { describe, it, expect } from 'vitest'
import { daysSince, lastWorn, scoreOutfit, recommendOutfits, type RecommendInput } from './recommend'
import type { Outfit, OutfitHistory } from '@/types/database'

function makeOutfit(p: Partial<Outfit>): Outfit {
  return {
    id: 'o1', user_id: 'u', name: 'Test', created_at: null, updated_at: null,
    description: null, image_url: null, is_favorite: null, is_public: null,
    occasion: null, season: null, share_token: null, tags: null, ...p,
  }
}

function worn(outfit_id: string, worn_date: string): OutfitHistory {
  return {
    id: `${outfit_id}-${worn_date}`, user_id: 'u', outfit_id, worn_date,
    category_label: null, notes: null, created_at: null,
  }
}

const TODAY = new Date('2026-06-09T12:00:00')
const base: Omit<RecommendInput, 'outfits'> = { history: [], temp: null, today: TODAY }

describe('daysSince', () => {
  it('counts whole days between dates', () => {
    expect(daysSince('2026-06-09', TODAY)).toBe(0)
    expect(daysSince('2026-06-02', TODAY)).toBe(7)
  })
})

describe('lastWorn', () => {
  it('returns the most recent worn date', () => {
    const history = [worn('o1', '2026-05-01'), worn('o1', '2026-06-01'), worn('o2', '2026-06-05')]
    expect(lastWorn('o1', history)).toBe('2026-06-01')
    expect(lastWorn('o2', history)).toBe('2026-06-05')
    expect(lastWorn('o3', history)).toBeNull()
  })
})

describe('scoreOutfit', () => {
  it('flags a never-worn outfit', () => {
    const r = scoreOutfit(makeOutfit({ id: 'o1' }), { ...base, outfits: [] })
    expect(r.reasons).toContain('neverWorn')
    expect(r.score).toBeGreaterThanOrEqual(30)
  })

  it('rewards a season match to the current temperature', () => {
    const summer = scoreOutfit(makeOutfit({ season: 'summer' }), { ...base, outfits: [], temp: 32 })
    const winter = scoreOutfit(makeOutfit({ season: 'winter' }), { ...base, outfits: [], temp: 32 })
    expect(summer.reasons).toContain('seasonMatch')
    expect(summer.score).toBeGreaterThan(winter.score)
  })

  it('rewards an occasion match', () => {
    const r = scoreOutfit(makeOutfit({ occasion: 'Work meeting' }), { ...base, outfits: [], occasion: 'work' })
    expect(r.reasons).toContain('occasionMatch')
  })
})

describe('recommendOutfits', () => {
  it('ranks an unworn outfit above one worn today', () => {
    const outfits = [
      makeOutfit({ id: 'fresh' }),
      makeOutfit({ id: 'worn-today' }),
    ]
    const ranked = recommendOutfits({
      ...base,
      outfits,
      history: [worn('worn-today', '2026-06-09')],
    })
    expect(ranked[0].outfit.id).toBe('fresh')
  })
})
