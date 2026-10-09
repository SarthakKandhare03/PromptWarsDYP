import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Compass, GitCompareArrows, Landmark, Loader2, Radar, Search, ShieldAlert,
  SlidersHorizontal, Sparkles, Star,
} from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { AssistantAnswer, Place, PlaceCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { CityPulse } from '../components/CityPulse'
import { PlacePhoto } from '../components/PlacePhoto'
import { TrustBadge } from '../components/TrustBadge'
import { placeUrl, streetViewUrl } from '../gmaps'

const EXAMPLES = [
  'Best street food under ₹200 near FC Road',
  'Plan a three-hour Pune heritage walk',
  'Show recent road hazards near my route',
  'Find wheelchair-accessible cafes',
]

const FILTERS: { id: PlaceCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'heritage', label: 'Heritage' },
  { id: 'food', label: 'Food' },
  { id: 'cafe', label: 'Cafes' },
  { id: 'attraction', label: 'Views & forts' },
]

const PILLARS = [
  { to: '/explore', title: 'Explore & Hospitality', text: 'Food, cafes, stays and budget finds, filtered by what matters to you.', Icon: Compass, bg: '#fff6c7' },
  { to: '/explore?category=heritage', title: 'History & Culture', text: 'Peshwa wadas, rock-cut caves and living craft lanes like Tambat Ali.', Icon: Landmark, bg: '#ece8ff' },
  { to: '/safety', title: 'Safety & Security', text: 'Fastest vs fewest-known-risks route, scored for the hour you travel.', Icon: ShieldAlert, bg: '#e0f2f8' },
  { to: '/compare', title: 'Best vs Worst', text: 'Your priorities, transparent dimensions, no black-box "best".', Icon: GitCompareArrows, bg: '#e4f5e1' },
  { to: '/report', title: 'Smart City Signals', text: 'Photo, voice or text reports, verified by the Trust Engine.', Icon: Radar, bg: '#fff1d6' },
]

type MapLayer = 'places' | 'reports' | 'corridors'

const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.55, ease: [0.2, 0.7, 0.2, 1] as const } }),
}

/** Line-art globe with orbiting pins, an editorial nod to "exploring the city". */
function GlobeArt() {
  return (
    <svg className="globe-art" viewBox="0 0 230 230" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="115" cy="115" r="62" />
      <ellipse cx="115" cy="115" rx="26" ry="62" />
      <ellipse cx="115" cy="115" rx="48" ry="62" />
      <path d="M53 115h124M60 85h110M60 145h110M74 62h82M74 168h82" />
      <g className="spin">
        <ellipse cx="115" cy="115" rx="104" ry="40" transform="rotate(-22 115 115)" strokeDasharray="2 0" />
        <g transform="translate(205 70)"><path d="M0 -9a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7z" fill="#111" /><circle cy="-2" r="2.4" fill="#FFE14D" stroke="none" /></g>
        <g transform="translate(22 160)"><path d="M0 -9a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7z" fill="#111" /><circle cy="-2" r="2.4" fill="#FFE14D" stroke="none" /></g>
      </g>
      <path d="M30 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#111" stroke="none" />
      <path d="M196 182l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#111" stroke="none" />
      <path d="M178 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#111" stroke="none" />
    </svg>
  )
}

export function HomePage() {
  const { places, reports, city, loading, setHighlight } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PlaceCategory | 'all'>('all')
  const [featuredId, setFeaturedId] = useState('shaniwar-wada')
  const [layer, setLayer] = useState<MapLayer>('places')
  const [focus, setFocus] = useState<[number, number] | null>(null)

  const cards = useMemo(
    () => places.filter((p) => p.image && (filter === 'all' || p.category === filter)).slice(0, 4),
    [places, filter],
  )
  const featured = places.find((p) => p.id === featuredId) ?? places[0]

  function feature(p: Place) {
    setFeaturedId(p.id)
    setHighlight([p.id])
    setLayer('places')
    setFocus([p.lat, p.lng])
  }

  async function ask(q: string) {
    const text = q.trim()
    if (text.length < 2) {
      setAskError('Type at least two characters.')
      return
    }
    setQuery(text)
    setAsking(true)
    setAskError(null)
    try {
      const res = await api.assistant(text)
      setAnswer(res)
      setHighlight(res.place_ids)
      const first = places.find((p) => p.id === res.place_ids[0])
      if (first) {
        setFeaturedId(first.id)
        setLayer('places')
        setFocus([first.lat, first.lng])
      } else if (res.report_ids.length) {
        setLayer('reports')
      }
    } catch (e) {
      setAskError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setAsking(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void ask(query)
  }

  const recent = reports.slice(0, 5)
  const zoneCount = city?.accident_zones.length ?? 0

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          {/* ---------- left: editorial headline + destination cards ---------- */}
          <div className="hero-copy">
            <div className="hero-title">
              <motion.h1 variants={reveal} initial="hidden" animate="show" custom={0}>
                Your city has <em>another side.</em>
              </motion.h1>
              <GlobeArt />
            </div>
            <motion.p className="hero-sub" variants={reveal} initial="hidden" animate="show" custom={1}>
              Hidden places, verified city signals and smarter routes across Pune, all in one place.
            </motion.p>
            <motion.div className="chips" role="group" aria-label="Filter places" variants={reveal} initial="hidden" animate="show" custom={2}>
              {FILTERS.map((f) => (
                <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
              ))}
            </motion.div>

            <div className="dest-grid" aria-live="polite">
              {loading && [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}
              {cards.map((p, i) => (
                <motion.button
                  key={p.id}
                  className="dest-card"
                  aria-pressed={featured?.id === p.id}
                  onClick={() => feature(p)}
                  variants={reveal} initial="hidden" animate="show" custom={3 + i}
                >
                  <span className="row1"><h3>{p.name}</h3><ArrowRight size={18} aria-hidden /></span>
                  <PlacePhoto place={p} />
                  <span className="meta">
                    {'₹'.repeat(p.price_level)} · {p.area}<br />
                    <span className="muted">{p.rating}★ · {p.review_count?.toLocaleString()} reviews (demo)</span>
                  </span>
                </motion.button>
              ))}
            </div>
            <Link to="/explore" className="btn" style={{ alignSelf: 'flex-start' }}>See all {places.length} places <ArrowRight size={16} aria-hidden /></Link>
          </div>

          {/* ---------- right: search, featured place, live map ---------- */}
          <div className="hero-copy">
            <motion.div className="search-box" variants={reveal} initial="hidden" animate="show" custom={1}>
              <form onSubmit={onSubmit} role="search">
                <Search size={18} aria-hidden />
                <label htmlFor="ask" className="sr-only">Ask पुण्यात काय?</label>
                <input
                  id="ask"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a place, plan a trip, or ask about your city..."
                  maxLength={500}
                  autoComplete="off"
                />
                <button className="btn primary icon" type="submit" disabled={asking} aria-label="Ask">
                  {asking ? <Loader2 size={18} aria-hidden /> : <SlidersHorizontal size={18} aria-hidden />}
                </button>
              </form>
              <div className="examples" aria-label="Example questions">
                {EXAMPLES.map((ex) => <button key={ex} type="button" onClick={() => void ask(ex)}>{ex}</button>)}
              </div>
              {askError && <p className="error-text" role="alert" style={{ marginTop: 8 }}>{askError}</p>}
              <div aria-live="polite">
                {asking && <div className="skeleton" style={{ height: 110, marginTop: 16 }} />}
                {answer && !asking && (
                  <div className="answer">
                    <div className="row between">
                      <span className="eyebrow lav"><Sparkles size={13} aria-hidden /> पुण्यात काय? answer</span>
                      <span className={`badge ${answer.engine === 'rules' ? 'demo' : 'ai'}`}>
                        {answer.engine === 'rules' ? 'Rule-based (AI unavailable)' : answer.engine === 'gemini' ? 'Gemini · Pune dataset' : 'Gemini · grounded in Google Maps'}
                      </span>
                    </div>
                    <pre>{answer.answer.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ')}</pre>
                    <div className="meta">
                      <span>Answered {new Date(answer.answered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {answer.sources.filter((s) => s.uri).map((s) => (
                        <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer">{s.title}</a>
                      ))}
                      {answer.place_ids.length > 0 && <span>{answer.place_ids.length} place(s) highlighted on the map</span>}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {featured && (
              <motion.article key={featured.id} className="featured" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <PlacePhoto place={featured} />
                <div className="body">
                  <div className="row between" style={{ flexWrap: 'nowrap' }}>
                    <h2>{featured.name}</h2>
                    <Link to={`/explore?category=${featured.category}`} aria-label={`Explore more ${featured.category}`} className="btn ghost icon"><ArrowUpRight size={20} aria-hidden /></Link>
                  </div>
                  <span className="eyebrow">{featured.category} · {featured.area}</span>
                  <p className="small">{featured.summary}</p>
                  <div className="stats">
                    <div><strong>{'₹'.repeat(featured.price_level)}</strong><span className="tiny muted">Price level (demo)</span></div>
                    <div><strong><Star size={16} aria-hidden /> {featured.rating ?? 'n/a'}</strong><span className="tiny muted">{featured.review_count?.toLocaleString() ?? 0} reviews (demo)</span></div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="btn sm primary" to="/safety">Plan a route</Link>
                    <a className="btn sm" href={placeUrl(featured.name, featured.lat, featured.lng)} target="_blank" rel="noopener noreferrer">Google Maps ↗</a>
                    <a className="btn sm ghost" href={streetViewUrl(featured.lat, featured.lng)} target="_blank" rel="noopener noreferrer">Street View</a>
                  </div>
                </div>
              </motion.article>
            )}

            <div className="tabs" role="group" aria-label="Map layer">
              <button className="chip" aria-pressed={layer === 'places'} onClick={() => setLayer('places')}>Places ({places.length})</button>
              <button className="chip" aria-pressed={layer === 'reports'} onClick={() => setLayer('reports')}>City reports ({reports.length})</button>
              <button className="chip" aria-pressed={layer === 'corridors'} onClick={() => setLayer('corridors')}>Accident corridors ({zoneCount})</button>
              <Link className="chip" to="/safety">Safe routes <ArrowRight size={13} aria-hidden /></Link>
            </div>

            <div className="hero-map">
              {loading ? <div className="skeleton" style={{ position: 'absolute', inset: 0 }} /> : (
                <CityMap
                  places={layer === 'places' ? places : []}
                  reports={layer === 'reports' ? reports : []}
                  showZones={layer === 'corridors'}
                  focus={focus}
                  label="Pune map"
                  onPlaceSelect={feature}
                />
              )}
              {layer === 'reports' && recent[0] && (
                <button
                  type="button"
                  className="float-panel br glass"
                  style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
                  onClick={() => navigate(`/safety?report=${recent[0].id}`)}
                >
                  <div className="row between"><span className="eyebrow">Latest signal · {recent[0].age}</span><TrustBadge label={recent[0].trust_label} /></div>
                  <div style={{ marginTop: 6, fontWeight: 500, fontSize: 14 }}>{recent[0].ai_summary ?? recent[0].description}</div>
                  <div className="trust-meter" style={{ marginTop: 8 }}><i style={{ width: `${recent[0].trust_score}%` }} /></div>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <CityPulse />

        <section className="section" aria-labelledby="pillars-title">
          <div className="section-head">
            <div>
              <span className="eyebrow">Five lenses on one city</span>
              <h2 id="pillars-title">Everything the chaos hides.</h2>
            </div>
          </div>
          <div className="pillars">
            {PILLARS.map(({ to, title, text, Icon, bg }) => (
              <Link key={title} to={to} className="pillar">
                <span className="num"><ArrowUpRight size={20} aria-hidden /></span>
                <span className="accent" style={{ background: bg }}><Icon size={18} aria-hidden /></span>
                <div>
                  <h3>{title}</h3>
                  <p style={{ marginTop: 6 }}>{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" aria-labelledby="reports-title">
          <div className="section-head">
            <div>
              <span className="eyebrow">Community signals</span>
              <h2 id="reports-title">What people report, and how much to trust it.</h2>
            </div>
            <Link to="/report" className="btn primary">Report an issue</Link>
          </div>
          <div className="report-list">
            {recent.map((r) => (
              <button key={r.id} className="report-row" onClick={() => navigate(`/safety?report=${r.id}`)}>
                <span className={`sev${r.severity >= 3 ? ' s3' : ''}${r.source === 'official' ? ' official' : ''}`} aria-hidden />
                <span>
                  <h4>{r.category[0].toUpperCase() + r.category.slice(1)} <span className="muted" style={{ fontWeight: 400 }}>· {r.age}</span></h4>
                  <p>{r.ai_summary ?? r.description}</p>
                  <span className="tiny muted">Trust {r.trust_score}/100{r.demo ? ' · demo record' : ''}</span>
                </span>
                <TrustBadge label={r.trust_label} />
              </button>
            ))}
            {!recent.length && <div className="empty">No reports yet.</div>}
          </div>
        </section>
      </div>
    </>
  )
}
