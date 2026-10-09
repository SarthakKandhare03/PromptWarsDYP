import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Compass, GitCompareArrows, Landmark, Loader2, Radar, Search, ShieldAlert, Sparkles } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { AssistantAnswer } from '../types'
import { CityMap } from '../components/CityMap'
import { CityPulse } from '../components/CityPulse'
import { PlaceCard } from '../components/PlaceCard'
import { TrustBadge } from '../components/TrustBadge'

const EXAMPLES = [
  'Best street food under ₹200 near FC Road',
  'Plan a three-hour Pune heritage walk',
  'Show recent road hazards near my route',
  'Find wheelchair-accessible cafes',
]

const PILLARS = [
  { to: '/explore', title: 'Explore & Hospitality', text: 'Food, cafes, stays and budget finds, filtered by what matters to you.', Icon: Compass, color: 'var(--lavender)' },
  { to: '/explore?category=heritage', title: 'History & Culture', text: 'Peshwa wadas, rock-cut caves and living craft lanes like Tambat Ali.', Icon: Landmark, color: 'var(--lavender)' },
  { to: '/safety', title: 'Safety & Security', text: 'Fastest vs safest route, scored for the hour you travel.', Icon: ShieldAlert, color: 'var(--cyan)' },
  { to: '/compare', title: 'Best vs Worst', text: 'Your priorities, transparent dimensions, no black-box "best".', Icon: GitCompareArrows, color: 'var(--lime)' },
  { to: '/report', title: 'Smart City Signals', text: 'Photo, voice or text reports, verified by the Trust Engine.', Icon: Radar, color: 'var(--amber)' },
]

const reveal = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.12 * i, duration: 0.6, ease: [0.2, 0.7, 0.2, 1] as const } }),
}

export function HomePage() {
  const { places, reports, loading, setHighlight } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [focus, setFocus] = useState<[number, number] | null>(null)

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
      if (first) setFocus([first.lat, first.lng])
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

  const featured = places.filter((p) => ['tambat-ali', 'pataleshwar', 'goodluck-cafe', 'bedekar-misal'].includes(p.id))
  const recent = reports.slice(0, 5)

  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden />
        <div className="container hero-grid">
          <div className="hero-copy">
            <motion.span className="eyebrow cyan" variants={reveal} initial="hidden" animate="show" custom={0}>
              Pune · Context-aware city intelligence
            </motion.span>
            <motion.h1 variants={reveal} initial="hidden" animate="show" custom={1}>
              Your city has<br /><span className="gradient-text">another side.</span>
            </motion.h1>
            <motion.p variants={reveal} initial="hidden" animate="show" custom={2}>
              Discover hidden places, understand what's happening around you, and find smarter ways to move through the city.
            </motion.p>

            <motion.div className="search-box" variants={reveal} initial="hidden" animate="show" custom={3}>
              <form onSubmit={onSubmit} role="search">
                <label htmlFor="ask" className="sr-only">Ask CityPulse</label>
                <input
                  id="ask"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a place, plan a trip, or ask about your city..."
                  maxLength={500}
                  autoComplete="off"
                />
                <button className="btn primary" type="submit" disabled={asking} aria-label="Ask">
                  {asking ? <Loader2 size={16} className="spin" aria-hidden /> : <Search size={16} aria-hidden />}
                </button>
              </form>
              <div className="examples" aria-label="Example questions">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => void ask(ex)}>{ex}</button>
                ))}
              </div>
              {askError && <p className="error-text" role="alert" style={{ marginTop: 8 }}>{askError}</p>}
              <div aria-live="polite">
                {asking && <div className="skeleton" style={{ height: 96, marginTop: 16 }} />}
                {answer && !asking && (
                  <div className="answer">
                    <div className="row between">
                      <span className="eyebrow lav"><Sparkles size={12} aria-hidden /> CityPulse answer</span>
                      <span className={`badge ${answer.engine === 'rules' ? 'demo' : 'ai'}`}>
                        {answer.engine === 'rules' ? 'Rule-based (AI unavailable)' : answer.engine === 'gemini' ? 'Gemini · CityPulse dataset' : 'Gemini · grounded in Google Maps'}
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

            <motion.div className="hero-ctas" variants={reveal} initial="hidden" animate="show" custom={4}>
              <Link to="/explore" className="btn primary">Explore the city <ArrowRight size={16} aria-hidden /></Link>
              <Link to="/safety" className="btn">Open city intelligence</Link>
            </motion.div>
          </div>

          <motion.div
            className="hero-map"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {loading ? <div className="skeleton" style={{ position: 'absolute', inset: 0 }} /> : (
              <CityMap
                places={places}
                reports={reports}
                focus={focus}
                label="Pune map with places and community reports"
                onPlaceSelect={(p) => setHighlight([p.id])}
              />
            )}
            <div className="float-panel tl glass legend" aria-label="Map legend">
              <span><i style={{ background: 'var(--lavender)' }} /> Heritage</span>
              <span><i style={{ background: 'var(--lime)' }} /> Food</span>
              <span><i style={{ background: '#ffd27a' }} /> Cafe</span>
              <span><i style={{ background: 'var(--cyan)' }} /> Attraction</span>
              <span><i style={{ background: 'var(--amber)' }} /> Report (pulse = last 6 h)</span>
            </div>
            {recent[0] && (
              <button
                type="button"
                className="float-panel br glass"
                style={{ textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
                onClick={() => navigate(`/safety?report=${recent[0].id}`)}
              >
                <div className="row between"><span className="eyebrow">Latest signal · {recent[0].age}</span><TrustBadge label={recent[0].trust_label} /></div>
                <div style={{ marginTop: 6, fontWeight: 600, fontSize: 14 }}>{recent[0].ai_summary ?? recent[0].description}</div>
                <div className="trust-meter" style={{ marginTop: 8 }}><i style={{ width: `${recent[0].trust_score}%` }} /></div>
              </button>
            )}
          </motion.div>
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
            {PILLARS.map(({ to, title, text, Icon, color }, i) => (
              <Link key={title} to={to} className="pillar">
                <span className="num">0{i + 1}</span>
                <span className="accent" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}><Icon size={18} aria-hidden /></span>
                <div>
                  <h3>{title}</h3>
                  <p style={{ marginTop: 6 }}>{text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section split">
          <div>
            <div className="section-head">
              <div>
                <span className="eyebrow lav">Hidden gems</span>
                <h2>Off the obvious path.</h2>
              </div>
              <Link to="/explore" className="btn sm">All places <ArrowRight size={14} aria-hidden /></Link>
            </div>
            <div className="place-strip" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {featured.map((p) => <PlaceCard key={p.id} place={p} onFocus={(pl) => { setHighlight([pl.id]); setFocus([pl.lat, pl.lng]); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />)}
            </div>
          </div>
          <div>
            <div className="section-head">
              <div>
                <span className="eyebrow">Community signals</span>
                <h2>What people report.</h2>
              </div>
              <Link to="/report" className="btn sm">Report</Link>
            </div>
            <div className="report-list">
              {recent.map((r) => (
                <button key={r.id} className="report-row" onClick={() => navigate(`/safety?report=${r.id}`)}>
                  <span className={`sev${r.severity >= 3 ? ' s3' : ''}${r.source === 'official' ? ' official' : ''}`} aria-hidden />
                  <span>
                    <h4>{r.category[0].toUpperCase() + r.category.slice(1)}</h4>
                    <p>{r.ai_summary ?? r.description}</p>
                    <span className="tiny muted">{r.age} · trust {r.trust_score}/100{r.demo ? ' · demo record' : ''}</span>
                  </span>
                  <TrustBadge label={r.trust_label} />
                </button>
              ))}
              {!recent.length && <div className="empty">No reports yet.</div>}
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
