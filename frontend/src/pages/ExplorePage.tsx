import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, Map as MapIcon, Search } from 'lucide-react'
import { useApp } from '../state/AppState'
import type { Place, PlaceCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { PlaceCard } from '../components/PlaceCard'
import { haversineKm } from '../geo'

const CATEGORIES: { id: PlaceCategory | 'all' | 'saved'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'food', label: 'Food' },
  { id: 'cafe', label: 'Cafes' },
  { id: 'attraction', label: 'Attractions' },
  { id: 'hotel', label: 'Hotels' },
  { id: 'saved', label: 'Saved' },
]

export function ExplorePage() {
  const { places, saved, setHighlight, city } = useApp()
  const [params, setParams] = useSearchParams()
  const category = (params.get('category') as PlaceCategory | 'all' | 'saved' | null) ?? 'all'
  const [q, setQ] = useState('')
  const [maxPrice, setMaxPrice] = useState(4)
  const [minRating, setMinRating] = useState(0)
  const [maxKm, setMaxKm] = useState(25)
  const [accessible, setAccessible] = useState(false)
  const [view, setView] = useState<'split' | 'list' | 'map'>('split')
  const [focus, setFocus] = useState<[number, number] | null>(null)

  const center = useMemo<[number, number]>(() => city?.center ?? [18.5204, 73.8567], [city])
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return places.filter((p) =>
      (category === 'all' || (category === 'saved' ? saved.includes(p.id) : p.category === category))
      && (!ql || `${p.name} ${p.area} ${p.tags.join(' ')} ${p.summary}`.toLowerCase().includes(ql))
      && p.price_level <= maxPrice
      && (p.rating ?? 0) >= minRating
      && haversineKm(center, [p.lat, p.lng]) <= maxKm
      && (!accessible || p.wheelchair === true))
  }, [places, category, saved, q, maxPrice, minRating, maxKm, accessible, center])

  const focusPlace = (p: Place) => {
    setHighlight([p.id])
    setFocus([p.lat, p.lng])
    if (view === 'list') setView('split')
  }

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow lav">Explore & Hospitality · History & Culture</span>
          <h1>Find your Pune.</h1>
          <p>Heritage lanes, legendary snacks, quiet cafes. Every filter changes what you see. Distances are from the city centre.</p>
        </div>
        <div className="seg" role="group" aria-label="View mode">
          <button aria-pressed={view === 'split'} onClick={() => setView('split')}><MapIcon size={14} aria-hidden /> Split</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={14} aria-hidden /> List</button>
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon size={14} aria-hidden /> Map</button>
        </div>
      </header>

      <div className="panel panel-pad filters" style={{ marginBottom: 16 }}>
        <div className="chips" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c.id} className="chip" aria-pressed={category === c.id}
              onClick={() => setParams(c.id === 'all' ? {} : { category: c.id })}>
              {c.label}{c.id === 'saved' ? ` (${saved.length})` : ''}
            </button>
          ))}
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label htmlFor="q">Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--slate)' }} aria-hidden />
              <input id="q" className="input" style={{ paddingLeft: 34 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="misal, peshwa, bun maska..." />
            </div>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="price">Max price: {'₹'.repeat(maxPrice)}</label>
            <input id="price" type="range" min={1} max={4} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="rating">Min rating: {minRating.toFixed(1)}★</label>
            <input id="rating" type="range" min={0} max={4.8} step={0.1} value={minRating} onChange={(e) => setMinRating(+e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="km">Within {maxKm} km</label>
            <input id="km" type="range" min={1} max={25} value={maxKm} onChange={(e) => setMaxKm(+e.target.value)} />
          </div>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} /> Wheelchair access
          </label>
        </div>
        <p className="tiny muted" aria-live="polite">{filtered.length} of {places.length} places · ratings, prices and access are demo values · opening hours not available in this dataset</p>
      </div>

      <div className="workspace" style={view !== 'split' ? { gridTemplateColumns: '1fr' } : undefined}>
        {view !== 'map' && (
          <div className="side">
            <div className="scroll-list" style={view === 'list' ? { maxHeight: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' } : undefined}>
              {filtered.map((p) => <PlaceCard key={p.id} place={p} onFocus={focusPlace} />)}
              {!filtered.length && <div className="empty">Nothing matches these filters. Try widening price or distance.</div>}
            </div>
          </div>
        )}
        {view !== 'list' && (
          <div className="map-col">
            <CityMap places={filtered} focus={focus} onPlaceSelect={(p) => setHighlight([p.id])} label="Map of filtered places" />
          </div>
        )}
      </div>
    </div>
  )
}
