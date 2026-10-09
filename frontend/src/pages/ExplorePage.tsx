import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, Map as MapIcon, Search } from 'lucide-react'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { Place, PlaceCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { PlaceCard } from '../components/PlaceCard'
import { haversineKm } from '../geo'

const CATEGORIES: (PlaceCategory | 'all' | 'saved')[] = ['all', 'heritage', 'food', 'cafe', 'attraction', 'hotel', 'saved']

export function ExplorePage() {
  const { places, saved, setHighlight, city } = useApp()
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const category = (params.get('category') as PlaceCategory | 'all' | 'saved' | null) ?? 'all'
  const [q, setQ] = useState(() => params.get('q') ?? '')
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
          <span className="eyebrow lav">{t('exp.eyebrow')}</span>
          <h1>{t('exp.title')}</h1>
          <p>{t('exp.sub')}</p>
        </div>
        <div className="seg" role="group" aria-label={t('exp.view')}>
          <button aria-pressed={view === 'split'} onClick={() => setView('split')}><MapIcon size={14} aria-hidden /> {t('exp.split')}</button>
          <button aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={14} aria-hidden /> {t('exp.list')}</button>
          <button aria-pressed={view === 'map'} onClick={() => setView('map')}><MapIcon size={14} aria-hidden /> {t('exp.map')}</button>
        </div>
      </header>

      <div className="panel panel-pad filters" style={{ marginBottom: 16 }}>
        <div className="chips" role="group" aria-label={t('exp.category')}>
          {CATEGORIES.map((c) => (
            <button key={c} className="chip" aria-pressed={category === c} onClick={() => setParams(c === 'all' ? {} : { category: c })}>
              {t(`pcat.${c}`)}{c === 'saved' ? ` (${saved.length})` : ''}
            </button>
          ))}
        </div>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: '2 1 220px' }}>
            <label htmlFor="q">{t('exp.search')}</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--slate)' }} aria-hidden />
              <input id="q" className="input" style={{ paddingLeft: 34 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('exp.searchPh')} />
            </div>
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="price">{t('exp.maxPrice', { p: '₹'.repeat(maxPrice) })}</label>
            <input id="price" type="range" min={1} max={4} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="rating">{t('exp.minRating', { r: minRating.toFixed(1) })}</label>
            <input id="rating" type="range" min={0} max={4.8} step={0.1} value={minRating} onChange={(e) => setMinRating(+e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 140px' }}>
            <label htmlFor="km">{t('exp.within', { n: maxKm })}</label>
            <input id="km" type="range" min={1} max={25} value={maxKm} onChange={(e) => setMaxKm(+e.target.value)} />
          </div>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={accessible} onChange={(e) => setAccessible(e.target.checked)} /> {t('exp.wheelchair')}
          </label>
        </div>
        <p className="tiny muted" aria-live="polite">{t('exp.count', { a: filtered.length, b: places.length })}</p>
      </div>

      <div className="workspace" style={view !== 'split' ? { gridTemplateColumns: '1fr' } : undefined}>
        {view !== 'map' && (
          <div className="side">
            <div className="scroll-list" style={view === 'list' ? { maxHeight: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' } : undefined}>
              {filtered.map((p) => <PlaceCard key={p.id} place={p} onFocus={focusPlace} />)}
              {!filtered.length && <div className="empty"><div className="pati" style={{ ['--r' as string]: '-1.5deg', margin: '0 auto 12px', maxWidth: 340 }}><span className="pati-lead" lang="mr">इथे काहीही सापडले नाही.</span><span className="pati-rest" lang="mr">फिल्टर कमी करावेत. उगाच शोधत बसू नये.</span></div>{t('exp.empty')}</div>}
            </div>
          </div>
        )}
        {view !== 'list' && (
          <div className="map-col">
            <CityMap places={filtered} focus={focus} onPlaceSelect={(p) => setHighlight([p.id])} label={t('exp.mapLabel')} />
          </div>
        )}
      </div>
    </div>
  )
}
