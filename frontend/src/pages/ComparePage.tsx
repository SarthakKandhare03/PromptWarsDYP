import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { CompareDims, CompareResult } from '../types'

const DIMS: { id: CompareDims; label: string }[] = [
  { id: 'affordability', label: 'Affordability' },
  { id: 'rating', label: 'Rating (Bayesian)' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'cleanliness', label: 'Cleanliness' },
  { id: 'safety', label: 'Nearby reports' },
]

export function ComparePage() {
  const { places } = useApp()
  const [ids, setIds] = useState<string[]>(['vaishali', 'roopali', 'goodluck-cafe'])
  const [weights, setWeights] = useState<Record<CompareDims, number>>({ affordability: 2, rating: 3, accessibility: 1, cleanliness: 2, safety: 2 })
  const [results, setResults] = useState<CompareResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ids.length < 2) return
    const t = setTimeout(() => {
      setLoading(true)
      api.compare(ids, weights)
        .then((r) => { setResults(r); setError(null) })
        .catch((e) => setError(e instanceof Error ? e.message : 'Compare failed'))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(t)
  }, [ids, weights])

  const add = (id: string) => { if (id && !ids.includes(id) && ids.length < 4) setIds([...ids, id]) }

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow lime">Best vs Worst</span>
          <h1>Your priorities. Your ranking.</h1>
          <p>Pick 2–4 places and tell us what matters. Ratings are Bayesian-adjusted so a handful of glowing reviews can't beat thousands of honest ones. Missing data is shown as missing, never guessed.</p>
        </div>
      </header>

      <div className="split" style={{ gridTemplateColumns: '1fr 1.6fr', alignItems: 'start' }}>
        <div className="panel panel-pad filters">
          <div className="field">
            <label htmlFor="add">Add a place ({ids.length}/4)</label>
            <select id="add" className="input" value="" onChange={(e) => add(e.target.value)} disabled={ids.length >= 4}>
              <option value="">Choose…</option>
              {places.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="chips">
            {ids.map((id) => (
              <button key={id} className="chip" aria-pressed="true" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label={`Remove ${places.find((p) => p.id === id)?.name}`}>
                {places.find((p) => p.id === id)?.name ?? id} <X size={12} aria-hidden />
              </button>
            ))}
          </div>
          <div className="eyebrow" style={{ marginTop: 8 }}>What matters to you</div>
          {DIMS.map((d) => (
            <div key={d.id} className="field">
              <label htmlFor={`w-${d.id}`}>{d.label}: {weights[d.id] === 0 ? 'ignore' : '●'.repeat(weights[d.id])}</label>
              <input id={`w-${d.id}`} type="range" min={0} max={5} value={weights[d.id]}
                onChange={(e) => setWeights({ ...weights, [d.id]: +e.target.value })} />
            </div>
          ))}
          <p className="tiny muted">"Nearby reports" counts verified community reports within 400 m. It is not a crime or safety rating.</p>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {error && <p className="error-text" role="alert">{error}</p>}
          {ids.length < 2 && <div className="empty">Add at least two places to compare.</div>}
          {ids.length >= 2 && results.length > 0 && (
            <div className="cmp-grid">
              <div className="cmp-row head" aria-hidden>
                <span>#</span><span>Place</span>{DIMS.map((d) => <span key={d.id}>{d.label.split(' ')[0]}</span>)}<span>Weighted</span>
              </div>
              {results.map((r) => (
                <article key={r.place.id} className="cmp-row" aria-label={`Rank ${r.rank}: ${r.place.name}`}>
                  <span className={`rank${r.rank === 1 ? ' first' : ''}`}>{r.rank}</span>
                  <div>
                    <strong style={{ fontFamily: 'var(--font-display)' }}>{r.place.name}</strong>
                    <div className="tiny muted">{r.place.area} · {r.place.rating}★ raw → {r.bayesian_rating ?? 'n/a'} adjusted</div>
                    {r.flags.map((f) => <div key={f} className="tiny" style={{ color: 'var(--amber)' }}><AlertTriangle size={11} aria-hidden /> {f}</div>)}
                  </div>
                  {DIMS.map((d) => {
                    const v = r.dimensions[d.id]
                    return (
                      <div key={d.id} title={d.label}>
                        <span className="tiny">{v == null ? 'Insufficient data' : Math.round(v)}</span>
                        {v != null && <div className="bar"><i style={{ width: `${v}%`, opacity: weights[d.id] === 0 ? 0.3 : 1 }} /></div>}
                      </div>
                    )
                  })}
                  <span className="mono-num" style={{ fontSize: 22, color: r.rank === 1 ? 'var(--lime)' : 'var(--white)' }}>
                    {r.weighted_score ?? 'n/a'}
                  </span>
                </article>
              ))}
              <p className="tiny muted">
                Weighted = average of available dimensions using your weights. Missing dimensions are excluded and listed, not filled in. All values are demo data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
