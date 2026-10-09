import { describe, expect, it } from 'vitest'
import { haversineKm, formatKm, formatMinutes } from '../geo'
import { directionsUrl, placeUrl, streetViewUrl } from '../gmaps'
import { LANGS, TRANSLATIONS } from '../i18n'
import { PATYA } from '../components/PuneriPati'

describe('geo helpers', () => {
  it('measures great-circle distance (Shaniwar Wada → Aga Khan Palace ≈ 6 km)', () => {
    const d = haversineKm([18.5195, 73.8553], [18.5524, 73.9015])
    expect(d).toBeGreaterThan(5.5)
    expect(d).toBeLessThan(6.5)
  })
  it('is zero for the same point and symmetric', () => {
    expect(haversineKm([18.5, 73.8], [18.5, 73.8])).toBe(0)
    expect(haversineKm([18.5, 73.8], [18.6, 73.9])).toBeCloseTo(haversineKm([18.6, 73.9], [18.5, 73.8]), 9)
  })
  it('formats durations and distances for humans', () => {
    expect(formatMinutes(20)).toBe('1 min') // never shows "0 min"
    expect(formatMinutes(600)).toBe('10 min')
    expect(formatKm(1234)).toBe('1.2 km')
  })
})

describe('Google Maps URL builders (official Maps URLs, no key)', () => {
  const route: [number, number][] = Array.from({ length: 12 }, (_, i) => [18.5 + i * 0.001, 73.85 + i * 0.001])

  it('hands the chosen route to Google Maps with waypoints so turn-by-turn follows it', () => {
    const url = new URL(directionsUrl(route))
    expect(url.origin + url.pathname).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('origin')).toBe('18.500000,73.850000')
    expect(url.searchParams.get('destination')).toBe('18.511000,73.861000')
    expect(url.searchParams.get('travelmode')).toBe('driving')
    expect(url.searchParams.get('waypoints')?.split('|')).toHaveLength(4)
  })
  it('omits waypoints for a two-point route', () => {
    const url = new URL(directionsUrl([[18.5, 73.8], [18.6, 73.9]]))
    expect(url.searchParams.has('waypoints')).toBe(false)
  })
  it('encodes place searches and Street View viewpoints', () => {
    expect(placeUrl('Cafe Goodluck', 18.5, 73.8)).toContain(encodeURIComponent('Cafe Goodluck, Pune'))
    expect(streetViewUrl(18.5, 73.8)).toContain('map_action=pano&viewpoint=18.5,73.8')
  })
})

describe('translations (English / हिंदी / मराठी)', () => {
  const entries = Object.entries(TRANSLATIONS)
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
  const devanagari = /[ऀ-ॿ]/

  it('offers exactly three languages', () => {
    expect(LANGS.map((l) => l.id)).toEqual(['en', 'hi', 'mr'])
  })
  it('has a non-empty string for every key in every language', () => {
    for (const [key, row] of entries) {
      expect(row, key).toHaveLength(3)
      // Sentence tails (e.g. home.t.post) are legitimately empty in English word order.
      row.forEach((s, i) => { if (!(i === 0 && key.endsWith('.post'))) expect(s.trim().length, `${key}[${i}]`).toBeGreaterThan(0) })
    }
  })
  it('keeps the same {placeholders} in every language', () => {
    for (const [key, [en, hi, mr]] of entries) {
      expect(vars(hi), key).toBe(vars(en))
      expect(vars(mr), key).toBe(vars(en))
    }
  })
  it('actually translates: most Hindi and Marathi strings use Devanagari', () => {
    const translated = (i: number) => entries.filter(([, row]) => devanagari.test(row[i])).length / entries.length
    expect(translated(1)).toBeGreaterThan(0.85)
    expect(translated(2)).toBeGreaterThan(0.85)
  })
})

describe('Puneri Patya signboards', () => {
  it('each board is Marathi, glossed in English + Hindi, and links to a real feature', () => {
    for (const p of PATYA) {
      expect(p.lead).toMatch(/[ऀ-ॿ]/)
      expect(p.en.length).toBeGreaterThan(10)
      expect(p.hi).toMatch(/[ऀ-ॿ]/)
      expect(p.to).toMatch(/^\/(city|explore|safety|report|compare)/)
    }
  })
})
