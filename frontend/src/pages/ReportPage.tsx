import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, CheckCircle2, Loader2, Lock, Mic, Square, Trash2 } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { Report, ReportCategory } from '../types'
import { CityMap } from '../components/CityMap'
import { TrustBadge } from '../components/TrustBadge'
import { deviceId } from '../identity'

const CATEGORIES: { id: ReportCategory; label: string }[] = [
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'pothole', label: 'Pothole / road hazard' },
  { id: 'traffic', label: 'Traffic disruption' },
  { id: 'accident', label: 'Accident' },
  { id: 'streetlight', label: 'Streetlight out' },
  { id: 'accessibility', label: 'Accessibility barrier' },
  { id: 'other', label: 'Other' },
]
const MAX_BYTES = 5 * 1024 * 1024
const PUNE = { minLat: 18.3, maxLat: 18.75, minLng: 73.65, maxLng: 74.1 }

type Step = 'details' | 'review' | 'done'

export function ReportPage() {
  const { reports, addReport, notify } = useApp()
  const [step, setStep] = useState<Step>('details')
  const [category, setCategory] = useState<ReportCategory>('waterlogging')
  const [description, setDescription] = useState('')
  const [point, setPoint] = useState<[number, number] | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [audio, setAudio] = useState<Blob | null>(null)
  const [recording, setRecording] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Report | null>(null)
  const [reviewedAt, setReviewedAt] = useState<Date | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  function onPhoto(f: File | undefined) {
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setErrors((e) => ({ ...e, photo: 'Use a JPEG, PNG or WebP image.' }))
      return
    }
    if (f.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, photo: 'Image must be under 5 MB.' }))
      return
    }
    setErrors(({ photo: _p, ...rest }) => rest)
    setPhoto(f)
    setPhotoUrl(URL.createObjectURL(f))
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
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunks, { type: rec.mimeType.split(';')[0] || 'audio/webm' })
        setAudio(blob.size > MAX_BYTES ? null : blob)
        if (blob.size > MAX_BYTES) notify('Recording too long (over 5 MB)', 'error')
        setRecording(false)
      }
      recorder.current = rec
      rec.start()
      setRecording(true)
      setTimeout(() => { if (rec.state === 'recording') rec.stop() }, 30_000)
    } catch {
      notify('Microphone unavailable or permission denied', 'error')
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (description.trim().length < 5) e.description = 'Describe the issue in at least 5 characters.'
    if (!point) e.point = 'Tap the map to mark where it is.'
    else if (point[0] < PUNE.minLat || point[0] > PUNE.maxLat || point[1] < PUNE.minLng || point[1] > PUNE.maxLng) e.point = 'Location must be within Pune.'
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
      notify('Report received and scored by the Trust Engine', 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setStep('details'); setDescription(''); setPoint(null); setPhoto(null); setPhotoUrl(null); setAudio(null); setResult(null)
  }

  const stepIdx = { details: 0, review: 1, done: 2 }[step]

  return (
    <div className="container">
      <header className="page-head">
        <div>
          <span className="eyebrow" style={{ color: 'var(--amber)' }}>Smart City Signals</span>
          <h1>Report what you see.</h1>
          <p>Text, photo or voice in English, Marathi or Hindi. AI structures it, the Trust Engine checks it against other reports and live weather, and it's on the map instantly.</p>
        </div>
      </header>

      <div className="workspace">
        <div className="side">
          <div className="panel panel-pad">
            <ol className="steps" aria-label="Progress">
              {['Details', 'Review', 'Verification'].map((s, i) => (
                <li key={s} className={i < stepIdx ? 'done' : i === stepIdx ? 'current' : ''} aria-current={i === stepIdx ? 'step' : undefined}>{s}</li>
              ))}
            </ol>

            {step === 'details' && (
              <form className="filters" onSubmit={(e) => { e.preventDefault(); if (validate()) { setReviewedAt(new Date()); setStep('review') } }} noValidate>
                <div className="field">
                  <label htmlFor="cat">Issue category</label>
                  <select id="cat" className="input" value={category} onChange={(e) => setCategory(e.target.value as ReportCategory)}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="desc">Description</label>
                  <textarea id="desc" className="input" value={description} maxLength={1000}
                    aria-invalid={!!errors.description} aria-describedby={errors.description ? 'desc-err' : undefined}
                    onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Water above the ankle near the bus stop, two-wheelers stuck" />
                  {errors.description && <span id="desc-err" className="error-text">{errors.description}</span>}
                </div>
                <div className="field">
                  <span className="label">Location</span>
                  <span className="small" style={{ color: point ? 'var(--white)' : 'var(--slate)' }}>
                    {point ? `${point[0].toFixed(5)}, ${point[1].toFixed(5)}` : 'Tap the map to drop a pin'}
                  </span>
                  {errors.point && <span className="error-text" role="alert">{errors.point}</span>}
                </div>
                <label className="dropzone">
                  {photoUrl ? <img src={photoUrl} alt="Selected evidence preview" className="preview-img" /> : <Camera size={22} aria-hidden />}
                  <span className="small">{photo ? photo.name : 'Add a photo (optional, under 5 MB)'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {errors.photo && <span className="error-text">{errors.photo}</span>}
                <div className="row">
                  <button type="button" className="btn sm" onClick={toggleRecording} aria-pressed={recording}>
                    {recording ? <><span className="rec-dot" aria-hidden /> <Square size={14} aria-hidden /> Stop</> : <><Mic size={14} aria-hidden /> Record voice note</>}
                  </button>
                  {audio && (
                    <>
                      <audio controls src={URL.createObjectURL(audio)} style={{ height: 32, maxWidth: 180 }} />
                      <button type="button" className="btn sm ghost icon" aria-label="Remove voice note" onClick={() => setAudio(null)}><Trash2 size={14} aria-hidden /></button>
                    </>
                  )}
                </div>
                <div className="notice"><Lock size={14} aria-hidden /> We store only the category, text, pin, whether media was attached, and an anonymous device id (so your accuracy can earn trust). Photos and audio are analysed once and not kept. No account, no name.</div>
                <button className="btn primary" type="submit">Review report</button>
              </form>
            )}

            {step === 'review' && (
              <div className="filters">
                <div><span className="eyebrow">Category</span><p>{CATEGORIES.find((c) => c.id === category)?.label}</p></div>
                <div><span className="eyebrow">Description</span><p>{description}</p></div>
                <div><span className="eyebrow">Location</span><p className="small">{point?.map((n) => n.toFixed(5)).join(', ')}</p></div>
                <div><span className="eyebrow">Evidence</span><p className="small">{[photo && 'Photo', audio && 'Voice note'].filter(Boolean).join(' + ') || 'Text only (lower starting trust)'}</p></div>
                <div><span className="eyebrow">Timestamp</span><p className="small">{reviewedAt?.toLocaleString()}</p></div>
                <div className="row">
                  <button className="btn" onClick={() => setStep('details')}>Edit</button>
                  <button className="btn primary" onClick={submit} disabled={submitting}>
                    {submitting ? <><Loader2 size={16} aria-hidden /> Analysing…</> : 'Submit report'}
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && result && (
              <motion.div className="filters" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} aria-live="polite">
                <div className="row"><CheckCircle2 color="var(--lime)" aria-hidden /> <strong>Report live on the map</strong></div>
                <div className="row between">
                  <TrustBadge label={result.trust_label} />
                  <span className="mono-num" style={{ fontSize: 28 }}>{result.trust_score}<span className="muted small">/100</span></span>
                </div>
                <div className="trust-meter"><i style={{ width: `${result.trust_score}%` }} /></div>
                {result.ai_summary && (
                  <div className="answer" style={{ marginTop: 0 }}>
                    <span className="eyebrow lav">Gemini summary{result.language ? ` · input: ${result.language}` : ''}</span>
                    <p style={{ marginTop: 4 }}>{result.ai_summary}</p>
                  </div>
                )}
                {!result.ai_used && <p className="tiny muted">AI analysis unavailable: scored on evidence and corroboration only.</p>}
                <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
                  {result.trust_reasons.map((t) => <li key={t}>{t}</li>)}
                </ul>
                <p className="tiny muted">Verification pending: trust rises automatically if others report the same issue nearby or weather data confirms it.</p>
                <div className="row">
                  <button className="btn" onClick={reset}>Report another</button>
                  <Link className="btn primary" to={`/safety?report=${result.id}`}>See it on the safety map</Link>
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
            label="Tap to choose report location"
          />
          {step === 'details' && <div className="float-panel tl glass small">Tap the map to pin the issue</div>}
        </div>
      </div>
    </div>
  )
}
