import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, BrainCircuit, Clock, ExternalLink, Loader2, Moon, Navigation, Sparkles, Sun } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { HotspotResponse, ReportCategory, RouteResponse } from '../types'
import { CityMap } from '../components/CityMap'
import { TrustBadge } from '../components/TrustBadge'
import { Counter } from '../components/Counter'
import { formatKm, formatMinutes } from '../geo'
import { VoteBar } from '../components/VoteBar'
import { directionsUrl } from '../gmaps'

const FILTERS: { id: ReportCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pothole', label: 'Road hazards' },
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'traffic', label: 'Traffic' },
  { id: 'accident', label: 'Accidents' },
  { id: 'streetlight', label: 'Streetlights' },
  { id: 'accessibility', label: 'Accessibility' },
]

export function SafetyPage() {
  const { places, reports, notify } = useApp()
  const [params] = useSearchParams()
  const [from, setFrom] = useState('vaishali')
  const [to, setTo] = useState('kasba-ganpati')
  const [hour, setHour] = useState(() => new Date().getHours())
  const [result, setResult] = useState<RouteResponse | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReportCategory | 'all'>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [learned, setLearned] = useState<HotspotResponse | null>(null)
  const [showHotspots, setShowHotspots] = useState(true)

  // Learned patterns for the chosen travel hour (re-fetched when the hour or reports change).
  useEffect(() => {
    const t = setTimeout(() => { api.hotspots(hour).then(setLearned).catch(() => setLearned(null)) }, 150)
    return () => clearTimeout(t)
  }, [hour, reports])

  const [picked, setPicked] = useState<{ id: string; at: [number, number] } | null>(null)
  // A report linked from elsewhere (?report=id) is focused until the user picks another.
  const linked = reports.find((x) => x.id === params.get('report'))
  const activeReport = picked?.id ?? linked?.id ?? null
  const focus = picked?.at ?? (linked && !result ? [linked.lat, linked.lng] as [number, number] : null)

  const visibleReports = useMemo(
    () => reports.filter((r) => (filter === 'all' || r.category === filter) && (!verifiedOnly || r.trust_score >= 40)),
    [reports, filter, verifiedOnly],
  )

  async function plan(e?: FormEvent) {
    e?.preventDefault()
    const a = places.find((p) => p.id === from)
    const b = places.find((p) => p.id === to)
    if (!a || !b) return
    if (a.id === b.id) {
      setError('Pick two different places.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await api.routes([a.lat, a.lng], [b.lat, b.lng], hour)
      setResult(res)
      const pick = res.routes.find((r) => r.is_safest) ?? res.routes[0]
      setSelected(pick.id)
      setPicked(null)
      if (res.routing_source === 'fallback') notify('Road router unreachable: showing a straight-line estimate', 'error')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Routing failed')
    } finally {
      setLoading(false)
    }
  }

  const fit = useMemo(() => {
    const r = result?.routes.find((x) => x.id === selected)
    return r ? r.geometry : null
  }, [result, selected])

  const night = hour >= 20 || hour < 6

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow cyan">Safety & Security</span>
          <h1>Fastest isn't always smartest.</h1>
          <p>Compare routes by the risks we actually know about at the hour you travel: accident-prone corridors, trusted community reports, and distance from help. No data? We say so.</p>
        </div>
      </header>

      <div className="workspace">
        <div className="side">
          <form className="panel panel-pad filters" onSubmit={plan} aria-label="Plan a route">
            <div className="field">
              <label htmlFor="from">From</label>
              <select id="from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>
                {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="to">To</label>
              <select id="to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>
                {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hour">
                Travel time: {String(hour).padStart(2, '0')}:00 {night ? <Moon size={12} aria-hidden /> : <Sun size={12} aria-hidden />} {night ? 'night' : 'day'}
              </label>
              <input id="hour" type="range" min={0} max={23} value={hour} onChange={(e) => setHour(+e.target.value)} />
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn primary" type="submit" disabled={loading || !places.length}>
              {loading ? <Loader2 size={16} aria-hidden /> : <Navigation size={16} aria-hidden />} Compare routes
            </button>
          </form>

          <div aria-live="polite">
            {loading && <div className="skeleton" style={{ height: 180 }} />}
            {result && !loading && (
              <div className="filters">
                <div className="answer" style={{ marginTop: 0 }}>
                  <span className="eyebrow lav"><Sparkles size={12} aria-hidden /> {result.explanation_source === 'gemini' ? 'Gemini explains' : 'Why (rule-based)'}</span>
                  <p style={{ marginTop: 6, fontSize: 14 }}>{result.explanation}</p>
                </div>
                {result.routes.map((r, i) => (
                  <button key={r.id} className="route-card" aria-pressed={selected === r.id} onClick={() => setSelected(r.id)}>
                    <div className="row between">
                      <div>
                        <div className="eyebrow">Route {String.fromCharCode(65 + i)}</div>
                        <div className="small"><Clock size={12} aria-hidden /> {formatMinutes(r.duration_s)} · {formatKm(r.distance_m)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="score-big" style={{ color: r.safety_score == null ? 'var(--slate)' : r.is_safest ? 'var(--lime)' : 'var(--white)' }}>
                          {r.safety_score == null ? '—' : <Counter value={r.safety_score} />}
                        </div>
                        <div className="tiny muted">{r.safety_score == null ? 'Insufficient data' : `known-risk score · ${r.confidence} confidence`}</div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {r.is_fastest && <span className="badge official">Fastest</span>}
                      {r.is_safest && <span className="badge corroborated">Fewest known risks</span>}
                    </div>
                    {selected === r.id && (
                      <div>
                        {r.factors.map((f) => (
                          <div key={f.label} className={`factor ${f.kind}`}>
                            <span>{f.label}</span>
                            <span>{f.impact > 0 ? `+${f.impact}` : f.impact < 0 ? f.impact : ''}</span>
                          </div>
                        ))}
                        <a
                          className="btn sm primary"
                          style={{ marginTop: 10 }}
                          href={directionsUrl(r.geometry)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} aria-hidden /> Navigate this route in Google Maps
                        </a>
                      </div>
                    )}
                  </button>
                ))}
                <p className="tiny muted">
                  Routing: {result.routing_source === 'osrm' ? 'OSRM public demo (driving)' : 'straight-line fallback'}. A higher score means fewer known risks, never "safe".
                  Google Maps navigation follows this route via waypoints.
                </p>
              </div>
            )}
          </div>

          {learned && (
            <div className="panel panel-pad filters" aria-live="polite">
              <div className="row between">
                <span className="eyebrow lav"><BrainCircuit size={14} aria-hidden /> Self-learning model</span>
                <label className="tiny row" style={{ gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showHotspots} onChange={(e) => setShowHotspots(e.target.checked)} /> Show on map
                </label>
              </div>
              <div className="row" style={{ gap: 20 }}>
                <div><div className="score-big" style={{ fontSize: 30 }}><Counter value={learned.model.samples} /></div><span className="tiny muted">reports learned from</span></div>
                <div><div className="score-big" style={{ fontSize: 30 }}><Counter value={learned.hotspots.length} /></div><span className="tiny muted">hotspots at {String(hour).padStart(2, '0')}:00</span></div>
              </div>
              {learned.hotspots.slice(0, 3).map((h) => (
                <div key={`${h.lat}${h.lng}`} className="factor risk">
                  <span>Recurring {h.top_category} · {h.reports} reports</span><span>w {h.weight}</span>
                </div>
              ))}
              {!learned.hotspots.length && <p className="tiny muted">No recurring pattern learned for this time of day.</p>}
              <p className="tiny muted">
                Retrained {learned.model.trained_at ? new Date(learned.model.trained_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'n/a'} on
                every report and vote · {learned.model.half_life_days}-day memory · community votes and reporter accuracy adjust trust. Includes labelled demo history.
              </p>
            </div>
          )}
        </div>

        <div className="map-col">
          <CityMap
            routes={result?.routes ?? []}
            selectedRouteId={selected}
            onRouteSelect={setSelected}
            reports={visibleReports}
            hotspots={showHotspots ? learned?.hotspots ?? [] : []}
            showZones
            focus={focus}
            fitTo={focus ? null : fit}
            label="Safety map with routes, reports and accident-prone corridors"
          />
          <div className="float-panel tl glass legend">
            <span><i style={{ background: '#1F9D4A' }} /> Selected · fewest known risks</span>
            <span><i style={{ background: '#111' }} /> Selected route</span>
            <span><i style={{ background: '#f59e0b' }} /> Community report</span>
            <span><i style={{ background: 'var(--red)' }} /> Severe / accident corridor</span>
            <span><i style={{ background: 'rgba(210,58,58,.25)', border: '1px solid #D23A3A' }} /> Learned hotspot (this hour)</span>
          </div>
        </div>
      </div>

      <section className="section" aria-labelledby="timeline-title">
        <div className="section-head">
          <div>
            <span className="eyebrow">Incident timeline</span>
            <h2 id="timeline-title">Evidence, not rumours.</h2>
          </div>
          <label className="chip" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Hide unverified
          </label>
        </div>
        <div className="chips" role="group" aria-label="Filter reports" style={{ marginBottom: 16 }}>
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div className="notice" style={{ marginBottom: 12 }}>
          <AlertTriangle size={14} aria-hidden />
          <span><b>Official</b> = published by an authority. <b>Corroborated / Partially verified / Unverified</b> = community reports scored by the Trust Engine (evidence, independent nearby reports, weather and corridor cross-checks). No reports in an area does not mean it is safe.</span>
        </div>
        <div className="report-list">
          {visibleReports.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              aria-pressed={activeReport === r.id}
              className={`report-row${activeReport === r.id ? ' active' : ''}`}
              onClick={() => { setPicked({ id: r.id, at: [r.lat, r.lng] }); window.scrollTo({ top: 200, behavior: 'smooth' }) }}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setPicked({ id: r.id, at: [r.lat, r.lng] }) } }}
            >
              <span className={`sev${r.severity >= 3 ? ' s3' : ''}${r.source === 'official' ? ' official' : ''}`} aria-hidden />
              <span>
                <h4>{r.category[0].toUpperCase() + r.category.slice(1)} · <span className="muted">{r.age}</span></h4>
                <p>{r.ai_summary ?? r.description}</p>
                <div className="trust-meter" style={{ margin: '8px 0 6px', maxWidth: 240 }}><i style={{ width: `${r.trust_score}%` }} /></div>
                <span className="tiny muted">
                  Trust {r.trust_score}/100 · {r.source}{r.has_photo ? ' · photo' : ''}{r.has_audio ? ' · voice' : ''}{r.demo ? ' · demo record' : ''}
                  {activeReport === r.id && <> · {r.trust_reasons.join(' · ')}</>}
                </span>
                {activeReport === r.id && <VoteBar report={r} />}
              </span>
              <TrustBadge label={r.trust_label} />
            </div>
          ))}
          {!visibleReports.length && <div className="empty">Insufficient data: no reports match these filters.</div>}
        </div>
      </section>
    </div>
  )
}
