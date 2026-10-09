import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, ArrowUpRight, Compass, GitCompareArrows, Landmark, Loader2, Radar, Search, ShieldAlert,
  SlidersHorizontal, Sparkles, Star,
} from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { AssistantAnswer, Place, PlaceCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { CityPulse } from '../components/CityPulse'
import { PlacePhoto } from '../components/PlacePhoto'
import { TrustBadge } from '../components/TrustBadge'
import { placeUrl, streetViewUrl } from '../gmaps'
import { haversineKm } from '../geo'
import { PuneriPati } from '../components/PuneriPati'

const EXAMPLES = ['home.ex1', 'home.ex2', 'home.ex3', 'home.ex4']
const FILTERS: { id: PlaceCategory | 'all'; key: string }[] = [
  { id: 'all', key: 'pcat.all' },
  { id: 'heritage', key: 'pcat.heritage' },
  { id: 'food', key: 'pcat.food' },
  { id: 'cafe', key: 'pcat.cafe' },
  { id: 'attraction', key: 'pcat.views' },
]
const PILLARS = [
  { to: '/explore', n: 1, Icon: Compass, bg: '#fff6c7' },
  { to: '/explore?category=heritage', n: 2, Icon: Landmark, bg: '#ece8ff' },
  { to: '/safety', n: 3, Icon: ShieldAlert, bg: '#e0f2f8' },
  { to: '/compare', n: 4, Icon: GitCompareArrows, bg: '#e4f5e1' },
  { to: '/report', n: 5, Icon: Radar, bg: '#fff1d6' },
]

type MapLayer = 'places' | 'reports' | 'corridors' | 'festival'

const istHour = () => Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })) % 24

const reveal = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.55, ease: [0.2, 0.7, 0.2, 1] as const } }),
}
const engineKey = (e: AssistantAnswer['engine']) => (e === 'rules' ? 'engine.rules' : e === 'gemini' ? 'engine.gemini' : 'engine.maps')

/** Line-art globe with orbiting pins, an editorial nod to "exploring the city". */
function GlobeArt() {
  return (
    <svg className="globe-art" viewBox="0 0 230 230" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="115" cy="115" r="62" />
      <ellipse cx="115" cy="115" rx="26" ry="62" />
      <ellipse cx="115" cy="115" rx="48" ry="62" />
      <path d="M53 115h124M60 85h110M60 145h110M74 62h82M74 168h82" />
      <g className="spin">
        <ellipse cx="115" cy="115" rx="104" ry="40" transform="rotate(-22 115 115)" />
        <g transform="translate(205 70)"><path d="M0 -9a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7z" fill="currentColor" /><circle cy="-2" r="2.4" fill="#FFE14D" stroke="none" /></g>
        <g transform="translate(22 160)"><path d="M0 -9a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7z" fill="currentColor" /><circle cy="-2" r="2.4" fill="#FFE14D" stroke="none" /></g>
      </g>
      <path d="M30 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="currentColor" stroke="none" />
      <path d="M196 182l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="currentColor" stroke="none" />
      <path d="M178 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function HomePage() {
  const { places, reports, city, loading, setHighlight } = useApp()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [filter, setFilter] = useState<PlaceCategory | 'all'>('all')
  const [featuredId, setFeaturedId] = useState('shaniwar-wada')
  const [layer, setLayer] = useState<MapLayer>(() => (params.get('layer') === 'festival' ? 'festival' : 'places'))
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
      setAskError(t('home.minChars'))
      return
    }
    setQuery(text)
    setAsking(true)
    setAskError(null)
    try {
      const res = await api.assistant(text, undefined, [], lang)
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
      setAskError(e instanceof Error ? e.message : t('chat.error'))
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
  const trail = city?.manache_ganpati ?? []
  const trailKm = trail.slice(1).reduce((sum, s, i) => sum + haversineKm([trail[i].lat, trail[i].lng], [s.lat, s.lng]), 0)
  const hourNow = istHour()
  const napTime = hourNow >= 13 && hourNow < 16

  return (
    <>
      <section className="hero">
        {napTime && (
          <div className="container" style={{ marginBottom: 20 }}>
            <div className="nap-banner" role="note">
              <strong lang="mr">दुपारी १ ते ४</strong>
              <span>{t('nap.d')}</span>
            </div>
          </div>
        )}
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-title">
              <motion.h1 variants={reveal} initial="hidden" animate="show" custom={0}>
                {t('home.t.pre')}<em>{t('home.t.em')}</em>{t('home.t.post')}
              </motion.h1>
              <GlobeArt />
            </div>
            <motion.p className="hero-sub" variants={reveal} initial="hidden" animate="show" custom={1}>{t('home.sub')}</motion.p>
            <motion.div className="chips" role="group" aria-label={t('exp.category')} variants={reveal} initial="hidden" animate="show" custom={2}>
              {FILTERS.map((f) => (
                <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{t(f.key)}</button>
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
                    <span className="muted">{p.rating}★ · {t('home.reviewsDemo', { n: p.review_count?.toLocaleString() ?? 0 })}</span>
                  </span>
                </motion.button>
              ))}
            </div>
            <Link to="/explore" className="btn" style={{ alignSelf: 'flex-start' }}>{t('home.seeAll', { n: places.length })} <ArrowRight size={16} aria-hidden /></Link>
          </div>

          <div className="hero-copy">
            <motion.div className="search-box" variants={reveal} initial="hidden" animate="show" custom={1}>
              <form onSubmit={onSubmit} role="search">
                <Search size={18} aria-hidden />
                <label htmlFor="ask" className="sr-only">{t('home.ask')}</label>
                <input id="ask" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('home.search.ph')} maxLength={500} autoComplete="off" />
                <button className="btn primary icon" type="submit" disabled={asking} aria-label={t('home.ask')}>
                  {asking ? <Loader2 size={18} className="spin" aria-hidden /> : <SlidersHorizontal size={18} aria-hidden />}
                </button>
              </form>
              <div className="examples">
                {EXAMPLES.map((ex) => <button key={ex} type="button" onClick={() => void ask(t(ex))}>{t(ex)}</button>)}
              </div>
              {askError && <p className="error-text" role="alert" style={{ marginTop: 8 }}>{askError}</p>}
              <div aria-live="polite">
                {asking && <div className="skeleton" style={{ height: 110, marginTop: 16 }} />}
                {answer && !asking && (
                  <div className="answer">
                    <div className="row between">
                      <span className="eyebrow lav"><Sparkles size={13} aria-hidden /> {t('home.answer')}</span>
                      <span className={`badge ${answer.engine === 'rules' ? 'demo' : 'ai'}`}>{t(engineKey(answer.engine))}</span>
                    </div>
                    <pre>{answer.answer.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ')}</pre>
                    <div className="meta">
                      <span>{t('home.answered', { time: new Date(answer.answered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</span>
                      {answer.sources.filter((s) => s.uri).map((s) => (
                        <a key={s.uri} href={s.uri} target="_blank" rel="noopener noreferrer">{s.title}</a>
                      ))}
                      {answer.place_ids.length > 0 && <span>{t('home.highlighted', { n: answer.place_ids.length })}</span>}
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
                    <Link to={`/explore?category=${featured.category}`} aria-label={t(`pcat.${featured.category}`)} className="btn ghost icon"><ArrowUpRight size={20} aria-hidden /></Link>
                  </div>
                  <span className="eyebrow">{t(`pcat.${featured.category}`)} · {featured.area}</span>
                  <p className="small">{featured.summary}</p>
                  <div className="stats">
                    <div><strong>{'₹'.repeat(featured.price_level)}</strong><span className="tiny muted">{t('home.priceDemo')}</span></div>
                    <div><strong><Star size={16} aria-hidden /> {featured.rating ?? 'n/a'}</strong><span className="tiny muted">{t('home.reviewsDemo', { n: featured.review_count?.toLocaleString() ?? 0 })}</span></div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="btn sm primary" to="/safety">{t('home.planRoute')}</Link>
                    <a className="btn sm" href={placeUrl(featured.name, featured.lat, featured.lng)} target="_blank" rel="noopener noreferrer">{t('gm.open')} ↗</a>
                    <a className="btn sm ghost" href={streetViewUrl(featured.lat, featured.lng)} target="_blank" rel="noopener noreferrer">{t('gm.street')}</a>
                  </div>
                </div>
              </motion.article>
            )}

            <div className="tabs" role="group" aria-label={t('home.layer')}>
              <button className="chip" aria-pressed={layer === 'places'} onClick={() => setLayer('places')}>{t('home.tab.places', { n: places.length })}</button>
              <button className="chip" aria-pressed={layer === 'reports'} onClick={() => setLayer('reports')}>{t('home.tab.reports', { n: reports.length })}</button>
              <button className="chip" aria-pressed={layer === 'corridors'} onClick={() => setLayer('corridors')}>{t('home.tab.corridors', { n: zoneCount })}</button>
              <button className="chip utsav-chip" aria-pressed={layer === 'festival'} onClick={() => setLayer('festival')}>{t('home.tab.festival')}</button>
              <Link className="chip" to="/safety">{t('home.tab.routes')} <ArrowRight size={13} aria-hidden /></Link>
            </div>

            <div className="hero-map">
              {loading ? <div className="skeleton" style={{ position: 'absolute', inset: 0 }} /> : (
                <CityMap
                  places={layer === 'places' ? places : []}
                  reports={layer === 'reports' ? reports : []}
                  showZones={layer === 'corridors'}
                  trail={layer === 'festival' ? trail : []}
                  fitTo={layer === 'festival' ? trail.map((s) => [s.lat, s.lng] as [number, number]) : null}
                  focus={layer === 'festival' ? null : focus}
                  label={t('exp.mapLabel')}
                  onPlaceSelect={feature}
                />
              )}
              {layer === 'festival' && (
                <div className="float-panel br glass" style={{ maxWidth: 320 }}>
                  <strong lang="mr" className="marathi" style={{ fontSize: 20, color: '#FF7A00' }}>गणपती बाप्पा मोरया!</strong>
                  <ol className="tiny" style={{ margin: '6px 0', paddingLeft: 18 }} lang="mr">
                    {trail.map((s) => <li key={s.order}>{s.name_mr}</li>)}
                  </ol>
                  <span className="tiny muted">{t('utsav.panel', { km: trailKm.toFixed(1) })}</span>
                </div>
              )}
              {layer === 'reports' && recent[0] && (
                <button type="button" className="float-panel br glass" style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit' }} onClick={() => navigate(`/safety?report=${recent[0].id}`)}>
                  <div className="row between"><span className="eyebrow">{t('home.latest', { age: recent[0].age })}</span><TrustBadge label={recent[0].trust_label} /></div>
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
              <span className="eyebrow">{t('home.lenses')}</span>
              <h2 id="pillars-title">{t('home.chaos')}</h2>
            </div>
          </div>
          <div className="pillars">
            {PILLARS.map(({ to, n, Icon, bg }) => (
              <Link key={n} to={to} className="pillar">
                <span className="num"><ArrowUpRight size={20} aria-hidden /></span>
                <span className="accent" style={{ background: bg }}><Icon size={18} aria-hidden /></span>
                <div>
                  <h3>{t(`home.p${n}.t`)}</h3>
                  <p style={{ marginTop: 6 }}>{t(`home.p${n}.d`)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section" aria-label={t('pati.k')}>
          <div className="pati-wall compact">
            <PuneriPati i={0} tilt={-2} />
            <PuneriPati i={2} tilt={1.5} />
            <PuneriPati i={4} tilt={-1} />
          </div>
        </section>

        <section className="section" aria-labelledby="reports-title">
          <div className="section-head">
            <div>
              <span className="eyebrow">{t('home.signals')}</span>
              <h2 id="reports-title">{t('home.signalsTitle')}</h2>
            </div>
            <Link to="/report" className="btn primary">{t('home.reportBtn')}</Link>
          </div>
          <div className="report-list">
            {recent.map((r) => (
              <button key={r.id} className="report-row" onClick={() => navigate(`/safety?report=${r.id}`)}>
                <span className={`sev${r.severity >= 3 ? ' s3' : ''}${r.source === 'official' ? ' official' : ''}`} aria-hidden />
                <span>
                  <h4>{t(`cat.${r.category}`)} <span className="muted" style={{ fontWeight: 400 }}>· {r.age}</span></h4>
                  <p>{r.ai_summary ?? r.description}</p>
                  <span className="tiny muted">{t('common.trust', { n: r.trust_score })}{r.demo ? ` · ${t('common.demo')}` : ''}</span>
                </span>
                <TrustBadge label={r.trust_label} />
              </button>
            ))}
            {!recent.length && <div className="empty">{t('common.noReports')}</div>}
          </div>
        </section>
      </div>
    </>
  )
}
