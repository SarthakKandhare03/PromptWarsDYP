import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, CheckCircle2, Loader2, Lock, Mic, Square, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { Report, ReportCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { TrustBadge } from '../components/TrustBadge'
import { deviceId } from '../identity'

const CATEGORIES: ReportCategory[] = ['waterlogging', 'pothole', 'traffic', 'accident', 'streetlight', 'accessibility', 'other']
const MAX_BYTES = 5 * 1024 * 1024
const PUNE = { minLat: 18.3, maxLat: 18.75, minLng: 73.65, maxLng: 74.1 }

type Step = 'details' | 'review' | 'done'

export function ReportPage() {
  const { reports, addReport, notify } = useApp()
  const { t } = useI18n()
  const [step, setStep] = useState<Step>('details')
  const [category, setCategory] = useState<ReportCategory>('waterlogging')
  const [description, setDescription] = useState('')
  const [point, setPoint] = useState<[number, number] | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [reviewedAt, setReviewedAt] = useState<Date | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])

  function onPhoto(f: File | undefined) {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setErrors((e) => ({ ...e, photo: t('rep.err.photoType') }))
      return
    }
    if (f.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, photo: t('rep.err.photoSize') }))
      return
    }
    setErrors(({ photo: _p, ...rest }) => rest)
    setPhoto(f)
    setPhotoUrl(URL.createObjectURL(f))
  }

  function setVoice(blob: Blob | null) {
    setAudio(blob)
    setAudioUrl(blob ? URL.createObjectURL(blob) : null)
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop()
      return
    }
    try {
      // Permission is requested only now, after an explicit tap.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunks, { type: rec.mimeType.split(';')[0] || 'audio/webm' })
        if (blob.size > MAX_BYTES) notify(t('rep.err.long'), 'error')
        setVoice(blob.size > MAX_BYTES ? null : blob)
        setRecording(false)
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setTimeout(() => { if (rec.state === 'recording') rec.stop() }, 30_000)
    } catch {
      notify(t('rep.err.mic'), 'error')
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (description.trim().length < 5) e.description = t('rep.err.desc')
    if (!point) e.point = t('rep.err.point')
    else if (point[0] < PUNE.minLat || point[0] > PUNE.maxLat || point[1] < PUNE.minLng || point[1] > PUNE.maxLng) e.point = t('rep.err.city')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate() || !point) return
    setSubmitting(true)
    const form = new FormData()
    form.append('category', category)
    form.append('description', description.trim())
    form.append('lat', String(point[0]))
    form.append('lng', String(point[1]))
    form.append('reporter_id', deviceId())
    if (photo) form.append('photo', photo)
    if (audio) form.append('audio', new File([audio], 'voice-note.webm', { type: audio.type }))
    try {
      const r = await api.submitReport(form)
      setResult(r)
      addReport(r)
      setStep('done')
      notify(t('rep.ok'), 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('rep.fail'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep('details'); setDescription(''); setPoint(null); setPhoto(null); setPhotoUrl(null); setVoice(null); setResult(null)
  }

  const stepIdx = { details: 0, review: 1, done: 2 }[step]

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow" style={{ color: 'var(--amber)' }}>{t('rep.eyebrow')}</span>
          <h1>{t('rep.title')}</h1>
          <p>{t('rep.sub')}</p>
        </div>
      </header>

      <div className="workspace">
        <div className="side">
          <div className="panel panel-pad">
            <ol className="steps" aria-label={t('rep.progress')}>
              {['rep.s1', 'rep.s2', 'rep.s3'].map((s, i) => (
                <li key={s} className={i < stepIdx ? 'done' : i === stepIdx ? 'current' : ''} aria-current={i === stepIdx ? 'step' : undefined}>{t(s)}</li>
              ))}
            </ol>

            {step === 'details' && (
              <form className="filters" onSubmit={(e) => { e.preventDefault(); if (validate()) { setReviewedAt(new Date()); setStep('review') } }} noValidate>
                <div className="field">
                  <label htmlFor="cat">{t('rep.category')}</label>
                  <select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="desc">{t('rep.desc')}</label>
                  <textarea id="desc" className="input" value={description} maxLength={1000}
                    aria-invalid={!!errors.description} aria-describedby={errors.description ? 'desc-err' : undefined}
                    onChange={(e) => setDescription(e.target.value)} placeholder={t('rep.descPh')} />
                  {errors.description && <span id="desc-err" className="error-text">{errors.description}</span>}
                </div>
                <div className="field">
                  <span className="label">{t('rep.location')}</span>
                  <span className="small" style={{ color: point ? 'var(--text)' : 'var(--slate)' }}>
                    {point ? `${point[0].toFixed(5)}, ${point[1].toFixed(5)}` : t('rep.tapMap')}
                  </span>
                  {errors.point && <span className="error-text" role="alert">{errors.point}</span>}
                </div>
                <label className="dropzone">
                  {photoUrl ? <img src={photoUrl} alt={t('rep.preview')} className="preview-img" /> : <Camera size={22} aria-hidden />}
                  <span className="small">{photo ? photo.name : t('rep.addPhoto')}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {errors.photo && <span className="error-text">{errors.photo}</span>}
                <div className="row">
                  <button type="button" className="btn sm" onClick={toggleRecording} aria-pressed={recording}>
                    {recording ? <><span className="rec-dot" aria-hidden /> <Square size={14} aria-hidden /> {t('rep.stop')}</> : <><Mic size={14} aria-hidden /> {t('rep.record')}</>}
                  </button>
                  {audioUrl && (
                    <>
                      <audio controls src={audioUrl} style={{ height: 32, maxWidth: 180 }} />
                      <button type="button" className="btn sm ghost icon" aria-label={t('rep.removeVoice')} onClick={() => setVoice(null)}><Trash2 size={14} aria-hidden /></button>
                    </>
                  )}
                </div>
                <div className="notice"><Lock size={14} aria-hidden /> {t('rep.privacy')}</div>
                <button className="btn primary" type="submit">{t('rep.reviewBtn')}</button>
              </form>
            )}

            {step === 'review' && (
              <div className="filters">
                <div><span className="eyebrow">{t('rep.category')}</span><p>{t(`cat.${category}`)}</p></div>
                <div><span className="eyebrow">{t('rep.desc')}</span><p>{description}</p></div>
                <div><span className="eyebrow">{t('rep.location')}</span><p className="small">{point?.map((n) => n.toFixed(5)).join(', ')}</p></div>
                <div><span className="eyebrow">{t('rep.evidence')}</span><p className="small">{[photo && t('rep.photo'), audio && t('rep.voice')].filter(Boolean).join(' + ') || t('rep.textOnly')}</p></div>
                <div><span className="eyebrow">{t('rep.timestamp')}</span><p className="small">{reviewedAt?.toLocaleString()}</p></div>
                <div className="row">
                  <button className="btn" onClick={() => setStep('details')}>{t('rep.edit')}</button>
                  <button className="btn primary" onClick={submit} disabled={submitting}>
                    {submitting ? <><Loader2 size={16} className="spin" aria-hidden /> {t('rep.analysing')}</> : t('rep.submit')}
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && result && (
              <motion.div className="filters" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
                <div className="row"><CheckCircle2 color="var(--lime)" aria-hidden /> <strong>{t('rep.live')}</strong></div>
                <div className="row between">
                  <TrustBadge label={result.trust_label} />
                  <span className="mono-num" style={{ fontSize: 28 }}>{result.trust_score}<span className="muted small">/100</span></span>
                </div>
                <div className="trust-meter"><i style={{ width: `${result.trust_score}%` }} /></div>
                {result.ai_summary && (
                  <div className="answer" style={{ marginTop: 0 }}>
                    <span className="eyebrow lav">{t('rep.geminiSummary')}{result.language ? t('rep.input', { l: result.language }) : ''}</span>
                    <p style={{ marginTop: 4 }}>{result.ai_summary}</p>
                  </div>
                )}
                {!result.ai_used && <p className="tiny muted">{t('rep.noAi')}</p>}
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                  {result.trust_reasons.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <p className="tiny muted">{t('rep.pending')}</p>
                <div className="row">
                  <button className="btn" onClick={reset}>{t('rep.another')}</button>
                  <Link className="btn primary" to={`/safety?report=${result.id}`}>{t('rep.seeMap')}</Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        <div className="map-col">
          <CityMap
            reports={reports}
            picked={point}
            onPick={step === 'details' ? (p) => { setPoint(p); setErrors(({ point: _x, ...rest }) => rest) } : undefined}
            focus={result ? [result.lat, result.lng] : null}
            label={t('rep.mapLabel')}
          />
          {step === 'details' && <div className="float-panel tl glass small">{t('rep.tapHint')}</div>}
        </div>
      </div>
    </div>
  )
}
