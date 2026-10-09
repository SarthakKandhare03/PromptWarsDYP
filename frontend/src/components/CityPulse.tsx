import { useNavigate } from 'react-router-dom'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import { Counter } from './Counter'

const CATEGORY_COLOR: Record<string, string> = {
  waterlogging: '#3DB8D9', pothole: '#F59E0B', accident: '#E5484D', traffic: '#F59E0B',
  streetlight: '#8B7CF6', accessibility: '#3FA34D', other: '#94A3B8',
}

/** Orbital visualisation of current city signals. Every dot is a real report in app state. */
export function CityPulse() {
  const { pulse, reports } = useApp()
  const { t } = useI18n()
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
  const level = pulse.chaos_index >= 60 ? 'pulse.elevated' : pulse.chaos_index >= 30 ? 'pulse.moderate' : 'pulse.calm'
  const open = (id: string) => navigate(`/safety?report=${id}`)

  return (
    <section className="pulse-card panel panel-pad" aria-labelledby="pulse-title">
      <div className="orbit">
        <svg viewBox="0 0 220 220" role="img" aria-label={t('pulse.reports', { n: pulse.trusted_24h })}>
          <circle cx="110" cy="110" r={R} fill="none" stroke="var(--line-strong)" />
          <circle cx="110" cy="110" r={R - 26} fill="none" stroke="var(--line)" strokeDasharray="2 6" />
          <g className="orbit-ring"><circle cx="110" cy={110 - R} r="3" fill="var(--cyan)" opacity=".8" /></g>
          {recent.map((r, i) => {
            const a = (i / Math.max(recent.length, 1)) * Math.PI * 2 - Math.PI / 2
            const rr = r.trust_score >= 70 ? R : r.trust_score >= 40 ? R - 13 : R - 26
            const label = t('pulse.signal', { cat: t(`cat.${r.category}`), label: t(`trust.${r.trust_label}`), age: r.age })
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
                aria-label={label}
                onClick={() => open(r.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(r.id) }}
              >
                <title>{label}</title>
              </circle>
            )
          })}
        </svg>
        <div className="center">
          <div>
            <strong><Counter value={pulse.chaos_index} /></strong>
            <span className="eyebrow">{t('pulse.chaos')} · {t(level)}</span>
          </div>
        </div>
      </div>

      <div>
        <div className="eyebrow cyan" id="pulse-title">{t('pulse.title')}</div>
        <p className="muted small" style={{ margin: '6px 0 18px' }}>{t('pulse.hint')}</p>
        <div className="stat-grid">
          <div className="stat">
            <strong>{w.available ? `${Math.round(w.temperature_c ?? 0)}°C` : 'n/a'}</strong>
            <span className="tiny muted">{w.available ? t('pulse.rain', { a: w.recent_rain_mm ?? 0, b: w.next_6h_rain_mm ?? 0 }) : t('pulse.noWeather')}</span>
          </div>
          <div className="stat">
            <strong><Counter value={pulse.reports_24h} /></strong>
            <span className="tiny muted">{t('pulse.reports', { n: pulse.trusted_24h })}</span>
          </div>
          <div className="stat">
            <strong>{Object.keys(pulse.by_category).length}</strong>
            <span className="tiny muted">{t('pulse.types')}</span>
          </div>
          <div className="stat">
            <strong style={{ fontSize: 22 }}>
              {pulse.latest_report_at ? new Date(pulse.latest_report_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'n/a'}
            </strong>
            <span className="tiny muted">{t('pulse.latest')}</span>
          </div>
        </div>
        <p className="tiny muted" style={{ marginTop: 16 }}>
          {t('pulse.foot', { src: w.source, obs: w.observed_at ? t('pulse.observed', { t: w.observed_at.slice(11) }) : '', n: pulse.demo_reports })}
        </p>
      </div>
    </section>
  )
}
