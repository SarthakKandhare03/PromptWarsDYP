import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState'
import { Counter } from './Counter'

const CATEGORY_COLOR: Record<string, string> = {
  waterlogging: '#48E5FF', pothole: '#FFB547', accident: '#FF5D6C', traffic: '#FFB547',
  streetlight: '#A99BFF', accessibility: '#C8FF55', other: '#94A3B8',
}

/** Orbital visualisation of current city signals. Every dot is a real report in app state. */
export function CityPulse() {
  const { pulse, reports } = useApp()
  const navigate = useNavigate()
  const recent = reports.slice(0, 12)
  const R = 88

  if (!pulse) {
    return (
      <div className="pulse-card panel panel-pad" aria-busy="true">
        <div className="skeleton" style={{ width: 220, height: 220, borderRadius: '50%' }} />
        <div className="skeleton" style={{ height: 160 }} />
      </div>
    )
  }

  const w = pulse.weather
  const level = pulse.chaos_index >= 60 ? 'Elevated' : pulse.chaos_index >= 30 ? 'Moderate' : 'Calm'

  return (
    <section className="pulse-card panel panel-pad" aria-labelledby="pulse-title">
      <div className="orbit">
        <svg viewBox="0 0 220 220" role="img" aria-label={`City Pulse: ${pulse.reports_24h} reports in the last 24 hours`}>
          <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(148,163,184,.18)" />
          <circle cx="110" cy="110" r={R - 26} fill="none" stroke="rgba(148,163,184,.1)" strokeDasharray="2 6" />
          <g className="orbit-ring">
            <circle cx="110" cy={110 - R} r="3" fill="#48E5FF" opacity=".8" />
          </g>
          {recent.map((r, i) => {
            const a = (i / Math.max(recent.length, 1)) * Math.PI * 2 - Math.PI / 2
            const rr = r.trust_score >= 70 ? R : r.trust_score >= 40 ? R - 13 : R - 26
            return (
              <circle
                key={r.id}
                className="orbit-signal"
                cx={110 + Math.cos(a) * rr}
                cy={110 + Math.sin(a) * rr}
                r={r.severity >= 3 ? 7 : 5}
                fill={CATEGORY_COLOR[r.category] ?? '#94A3B8'}
                tabIndex={0}
                role="button"
                aria-label={`${r.category} report, ${r.trust_label}, ${r.age}. Open on safety map`}
                onClick={() => navigate(`/safety?report=${r.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/safety?report=${r.id}`) }}
              >
                <title>{`${r.category} · ${r.trust_label} · ${r.age}`}</title>
              </circle>
            )
          })}
        </svg>
        <div className="center">
          <div>
            <strong><Counter value={pulse.chaos_index} /></strong>
            <span className="eyebrow">Chaos index · {level}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="eyebrow cyan" id="pulse-title">City Pulse · Pune</div>
        <p className="muted small" style={{ margin: '6px 0 18px' }}>
          Outer ring = corroborated, inner = unverified. Click a signal to inspect it.
        </p>
        <div className="stat-grid">
          <div className="stat">
            <strong>{w.available ? `${Math.round(w.temperature_c ?? 0)}°C` : 'n/a'}</strong>
            <span className="tiny muted">
              {w.available ? `Rain last 3 h: ${w.recent_rain_mm} mm · next 6 h: ${w.next_6h_rain_mm} mm` : 'Weather unavailable'}
            </span>
          </div>
          <div className="stat">
            <strong><Counter value={pulse.reports_24h} /></strong>
            <span className="tiny muted">Reports in 24 h ({pulse.trusted_24h} corroborated)</span>
          </div>
          <div className="stat">
            <strong>{Object.keys(pulse.by_category).length}</strong>
            <span className="tiny muted">Active issue types</span>
          </div>
          <div className="stat">
            <strong className="tiny" style={{ fontSize: 14 }}>
              {pulse.latest_report_at ? new Date(pulse.latest_report_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'n/a'}
            </strong>
            <span className="tiny muted">Latest report · traffic feed: not connected</span>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 16 }}>
          Weather: {w.source}{w.observed_at ? ` (observed ${w.observed_at.slice(11)})` : ''}. {pulse.demo_reports} of the 24 h reports are labelled demo records.
        </p>
      </div>
    </section>
  )
}
