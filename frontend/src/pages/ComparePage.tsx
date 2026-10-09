import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { CompareDims, CompareResult } from '../types'

const DIMS: CompareDims[] = ['affordability', 'rating', 'accessibility', 'cleanliness', 'safety']

export function ComparePage() {
  const { places } = useApp()
  const { t } = useI18n()
  const [ids, setIds] = useState<string[]>(['vaishali', 'roopali', 'goodluck-cafe'])
  const [weights, setWeights] = useState<Record<CompareDims, number>>({ affordability: 2, rating: 3, accessibility: 1, cleanliness: 2, safety: 2 })
  const [results, setResults] = useState<CompareResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (ids.length < 2) return
    const id = setTimeout(() => {
      setLoading(true)
      api.compare(ids, weights)
        .then((r) => { setResults(r); setError(null) })
        .catch((e) => setError(e instanceof Error ? e.message : t('cmp.fail')))
        .finally(() => setLoading(false))
    }, 200)
    return () => clearTimeout(id)
  }, [ids, weights, t])

  const add = (id: string) => { if (id && !ids.includes(id) && ids.length < 4) setIds([...ids, id]) }
  const nameOf = (id: string) => places.find((p) => p.id === id)?.name ?? id

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow lime">{t('cmp.eyebrow')}</span>
          <h1>{t('cmp.title')}</h1>
          <p>{t('cmp.sub')}</p>
        </div>
      </header>

      <div className="split" style={{ gridTemplateColumns: '1fr 1.6fr', alignItems: 'start' }}>
        <div className="panel panel-pad filters">
          <div className="field">
            <label htmlFor="add">{t('cmp.add', { n: ids.length })}</label>
            <select id="add" className="input" value="" onChange={(e) => add(e.target.value)} disabled={ids.length >= 4}>
              <option value="">{t('cmp.choose')}</option>
              {places.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="chips">
            {ids.map((id) => (
              <button key={id} className="chip" aria-pressed="true" onClick={() => setIds(ids.filter((x) => x !== id))} aria-label={t('cmp.remove', { name: nameOf(id) })}>
                {nameOf(id)} <X size={12} aria-hidden />
              </button>
            ))}
          </div>
          <div className="eyebrow" style={{ marginTop: 8 }}>{t('cmp.matters')}</div>
          {DIMS.map((d) => (
            <div key={d} className="field">
              <label htmlFor={`w-${d}`}>{t(`dim.${d}`)}: {weights[d] === 0 ? t('cmp.ignore') : '●'.repeat(weights[d])}</label>
              <input id={`w-${d}`} type="range" min={0} max={5} value={weights[d]} onChange={(e) => setWeights({ ...weights, [d]: +e.target.value })} />
            </div>
          ))}
          <p className="tiny muted">{t('cmp.nearbyNote')}</p>
        </div>

        <div aria-live="polite" aria-busy={loading}>
          {error && <p className="error-text" role="alert">{error}</p>}
          {ids.length < 2 && <div className="empty">{t('cmp.needTwo')}</div>}
          {ids.length >= 2 && results.length > 0 && (
            <div className="cmp-grid">
              <div className="cmp-row head" aria-hidden>
                <span>#</span><span>{t('cmp.place')}</span>{DIMS.map((d) => <span key={d}>{t(`dim.${d}`).split(' ')[0]}</span>)}<span>{t('cmp.weighted')}</span>
              </div>
              {results.map((r) => (
                <article key={r.place.id} className="cmp-row" aria-label={t('cmp.rank', { n: r.rank, name: r.place.name })}>
                  <span className={`rank${r.rank === 1 ? ' first' : ''}`}>{r.rank}</span>
                  <div>
                    <strong style={{ fontFamily: 'var(--font-display)' }}>{r.place.name}</strong>
                    <div className="tiny muted">{r.place.area} · {t('cmp.adjusted', { a: r.place.rating ?? 'n/a', b: r.bayesian_rating ?? 'n/a' })}</div>
                    {r.flags.map((f) => <div key={f} className="tiny" style={{ color: 'var(--amber)' }}><AlertTriangle size={11} aria-hidden /> {f}</div>)}
                  </div>
                  {DIMS.map((d) => {
                    const v = r.dimensions[d]
                    return (
                      <div key={d} title={t(`dim.${d}`)}>
                        <span className="tiny">{v == null ? t('saf.insufficient') : Math.round(v)}</span>
                        {v != null && <div className="bar"><i style={{ width: `${v}%`, opacity: weights[d] === 0 ? 0.3 : 1 }} /></div>}
                      </div>
                    )
                  })}
                  <span className="mono-num" style={{ fontSize: 22, color: r.rank === 1 ? 'var(--lime)' : 'var(--text)' }}>{r.weighted_score ?? 'n/a'}</span>
                </article>
              ))}
              <p className="tiny muted">{t('cmp.foot')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
