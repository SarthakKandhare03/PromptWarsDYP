import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, MapPin, MessageCircle, Mic, MicOff, Minimize2, Send, Square, Volume2, X } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { AssistantAnswer } from '../types'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  meta?: Pick<AssistantAnswer, 'engine' | 'place_ids' | 'sources'>
}

const SUGGESTIONS = ['chat.s1', 'chat.s2', 'chat.s3', 'chat.s4']
const SPEECH_LANG = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' } as const

// Minimal typing for the (still prefixed in Chrome) Web Speech recognition API.
interface Recognizer {
  lang: string
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognizerCtor = new () => Recognizer
const RecognitionImpl: RecognizerCtor | undefined =
  (window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor }).SpeechRecognition
  ?? (window as unknown as { webkitSpeechRecognition?: RecognizerCtor }).webkitSpeechRecognition

function speak(text: string, lang: keyof typeof SPEECH_LANG, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.replace(/[•*#]/g, ''))
  const want = SPEECH_LANG[lang]
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === want) ?? voices.find((v) => v.lang.startsWith(want.slice(0, 2)))
    ?? (lang === 'mr' ? voices.find((v) => v.lang.startsWith('hi')) : undefined) ?? null
  u.lang = u.voice?.lang ?? want
  u.onend = () => onEnd?.()
  window.speechSynthesis.speak(u)
}
const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ')
const engineKey = (e: AssistantAnswer['engine']) => (e === 'rules' ? 'engine.rules' : e === 'gemini' ? 'engine.gemini' : 'engine.maps')

/** Floating city assistant (bottom-right). Multi-turn and answers in the selected UI language. */
export function ChatWidget() {
  const { places, setHighlight, aiEnabled } = useApp()
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [wide, setWide] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState<number | null>(null)
  const recRef = useRef<Recognizer | null>(null)
  const voiceTurn = useRef(false)
  const lenRef = useRef(0)
  lenRef.current = msgs.length
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  // Other parts of the app can open the assistant with a question: dispatch 'pk:ask'.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const q = (e as CustomEvent<string>).detail
      setOpen(true)
      if (typeof q === 'string') void sendRef.current(q)
    }
    window.addEventListener('pk:ask', onAsk)
    return () => window.removeEventListener('pk:ask', onAsk)
  }, [])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  function toggleSpeak(i: number, text: string) {
    if (speaking === i) {
      window.speechSynthesis?.cancel()
      setSpeaking(null)
      return
    }
    setSpeaking(i)
    speak(text, lang, () => setSpeaking(null))
  }

  function toggleMic() {
    if (!RecognitionImpl) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const rec = new RecognitionImpl()
    rec.lang = SPEECH_LANG[lang]
    rec.interimResults = true
    let finalText = ''
    rec.onresult = (e) => {
      const r = Array.from(e.results)
      setInput(r.map((x) => x[0].transcript).join(' '))
      finalText = r.filter((x) => x.isFinal).map((x) => x[0].transcript).join(' ')
    }
    rec.onend = () => {
      setListening(false)
      if (finalText.trim().length >= 2) {
        voiceTurn.current = true // answer this one out loud
        void sendRef.current(finalText)
      }
    }
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  async function send(text: string) {
    const q = text.trim()
    if (q.length < 2 || busy) return
    const history = msgs.map(({ role, text: m }) => ({ role, text: m }))
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    try {
      const res = await api.assistant(q, undefined, history, lang)
      const answer = clean(res.answer)
      const idx = lenRef.current // index the assistant message will get
      setMsgs((m) => [...m, { role: 'assistant', text: answer, meta: res }])
      if (voiceTurn.current) {
        voiceTurn.current = false
        setSpeaking(idx)
        speak(answer, lang, () => setSpeaking(null))
      }
      if (res.place_ids.length) setHighlight(res.place_ids)
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: e instanceof Error ? e.message : t('chat.error') }])
    } finally {
      setBusy(false)
    }
  }

  const sendRef = useRef(send)
  sendRef.current = send

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            className={`chat-panel${wide ? ' wide' : ''}`}
            role="dialog"
            aria-label="पुण्यात काय?"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          >
            <header className="chat-head">
              <div className="chat-avatar" aria-hidden><span lang="mr">पु</span><i /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong className="marathi" lang="mr">पुण्यात काय?</strong>
                <span className="tiny chat-status"><span className="live-dot" aria-hidden /> {t(aiEnabled ? 'chat.sub' : 'chat.subRules')}</span>
              </div>
              <button className="btn icon ghost chat-hbtn" onClick={() => setWide((w) => !w)} aria-label={t(wide ? 'chat.shrink' : 'chat.expand')}>
                {wide ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
              </button>
              <button className="btn icon ghost chat-hbtn" onClick={() => setOpen(false)} aria-label={t('chat.close')}><X size={18} aria-hidden /></button>
            </header>

            <div className="chat-list" ref={listRef} aria-live="polite">
              <div className="chat-msg assistant"><p>{t('chat.greeting')}</p></div>
              {msgs.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  <p>{m.text}</p>
                  {m.meta && m.meta.place_ids.length > 0 && (
                    <div className="chips" style={{ marginTop: 8, gap: 6 }}>
                      {m.meta.place_ids.slice(0, 4).map((id) => {
                        const p = places.find((x) => x.id === id)
                        return p ? (
                          <button key={id} className="chip" style={{ fontSize: 12, padding: '4px 10px' }}
                            onClick={() => { setHighlight([id]); navigate('/explore') }}>
                            <MapPin size={12} aria-hidden /> {p.name}
                          </button>
                        ) : null
                      })}
                    </div>
                  )}
                  {m.meta && (
                    <div className="chat-meta">
                      <span className="tiny muted">{t(engineKey(m.meta.engine))}</span>
                      <button className="chat-speak" onClick={() => toggleSpeak(i, m.text)} aria-pressed={speaking === i}
                        aria-label={t(speaking === i ? 'chat.stopRead' : 'chat.read')} title={t(speaking === i ? 'chat.stopRead' : 'chat.read')}>
                        {speaking === i ? <Square size={12} aria-hidden /> : <Volume2 size={13} aria-hidden />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {busy && <div className="chat-msg assistant typing" aria-label={t('chat.thinking')}><i /><i /><i /></div>}
            </div>

            {msgs.length === 0 && (
              <div className="chips" style={{ padding: '0 14px 10px', gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => void send(t(s))}>{t(s)}</button>
                ))}
              </div>
            )}

            <form className="chat-form" onSubmit={onSubmit}>
              <label htmlFor="chat-input" className="sr-only">{t('chat.msg')}</label>
              {RecognitionImpl && (
                <button type="button" className={`chat-mic${listening ? ' on' : ''}`} onClick={toggleMic} aria-pressed={listening}
                  aria-label={t(listening ? 'chat.micStop' : 'chat.mic')} title={t(listening ? 'chat.micStop' : 'chat.mic')}>
                  {listening ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />}
                </button>
              )}
              <input id="chat-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? t('chat.listening') : t('chat.ph')} maxLength={500} autoComplete="off" />
              <button className="btn primary icon" type="submit" disabled={busy || input.trim().length < 2} aria-label={t('chat.send')}>
                <Send size={16} aria-hidden />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t(open ? 'chat.close' : 'chat.open')}>
        {open ? <X size={22} aria-hidden /> : <MessageCircle size={22} aria-hidden />}
        {!open && <span className="marathi" lang="mr">काय?</span>}
      </button>
    </>
  )
}
