import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Clock, Loader2, Moon, Navigation, Sparkles, Sun } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { ReportCategory, RouteResponse } from '../types'
import { CityMap } from '../components/CityMap'
import { TrustBadge } from '../components/TrustBadge'
import { Counter } from '../components/Counter'
import { formatKm, formatMinutes } from '../geo'

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
                      </div>
                    )}
                  </button>
                ))}
                <p className="tiny muted">
                  Routing: {result.routing_source === 'osrm' ? 'OSRM public demo (driving)' : 'straight-line fallback'}. A higher score means fewer known risks, never "safe".
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="map-col">
          <CityMap
            routes={result?.routes ?? []}
            selectedRouteId={selected}
            onRouteSelect={setSelected}
            reports={visibleReports}
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
            <button
              key={r.id}
              className={`report-row${activeReport === r.id ? ' active' : ''}`}
              onClick={() => { setPicked({ id: r.id, at: [r.lat, r.lng] }); window.scrollTo({ top: 200, behavior: 'smooth' }) }}
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
              </span>
              <TrustBadge label={r.trust_label} />
            </button>
          ))}
          {!visibleReports.length && <div className="empty">Insufficient data: no reports match these filters.</div>}
        </div>
      </section>
    </div>
  )
}
