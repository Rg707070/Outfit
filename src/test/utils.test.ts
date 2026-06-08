import { describe, it, expect } from 'vitest'
import { cn, CLOTHING_CATEGORIES, SEASONS } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('deduplicates tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'end')).toBe('base end')
  })
})

describe('CLOTHING_CATEGORIES', () => {
  it('has correct structure', () => {
    expect(CLOTHING_CATEGORIES.length).toBeGreaterThan(0)
    for (const cat of CLOTHING_CATEGORIES) {
      expect(cat).toHaveProperty('value')
      expect(cat).toHaveProperty('label')
      expect(cat).toHaveProperty('emoji')
    }
  })

  it('includes tops and bottoms', () => {
    const values = CLOTHING_CATEGORIES.map((c) => c.value)
    expect(values).toContain('tops')
    expect(values).toContain('bottoms')
  })
})

describe('SEASONS', () => {
  it('includes all four seasons', () => {
    const values = SEASONS.map((s) => s.value)
    expect(values).toContain('spring')
    expect(values).toContain('summer')
    expect(values).toContain('autumn')
    expect(values).toContain('winter')
  })
})
