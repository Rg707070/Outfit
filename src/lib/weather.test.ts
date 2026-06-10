import { describe, it, expect } from 'vitest'
import { tempBand, tempToSeasons } from './weather'

describe('tempBand', () => {
  it('classifies temperatures into bands', () => {
    expect(tempBand(0)).toBe('cold')
    expect(tempBand(8)).toBe('cold')
    expect(tempBand(12)).toBe('cool')
    expect(tempBand(20)).toBe('mild')
    expect(tempBand(27)).toBe('warm')
    expect(tempBand(35)).toBe('hot')
  })
})

describe('tempToSeasons', () => {
  it('maps cold weather to winter', () => {
    expect(tempToSeasons(2)).toEqual(['winter'])
  })
  it('maps hot weather to summer', () => {
    expect(tempToSeasons(33)).toEqual(['summer'])
  })
  it('maps mild weather to spring/autumn', () => {
    expect(tempToSeasons(20)).toContain('spring')
    expect(tempToSeasons(20)).toContain('autumn')
  })
})
