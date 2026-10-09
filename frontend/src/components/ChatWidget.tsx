import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, MapPin, MessageCircle, Send, X } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import type { AssistantAnswer } from '../types'

interface Msg {
  role: 'user' | 'assistant'
  text: string
  meta?: Pick<AssistantAnswer, 'engine' | 'place_ids' | 'sources'>
}

const SUGGESTIONS = ['Misal under ₹150?', 'Evening heritage walk', 'Any waterlogging now?', 'Quiet cafe near Deccan']
const GREETING: Msg = {
  role: 'assistant',
  text: 'नमस्कार! Ask me about places, food, heritage, or what people are reporting around Pune right now.',
}
const clean = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\s*[*-]\s+/gm, '• ')

/** Floating city assistant (bottom-right). Multi-turn: recent turns are sent as context. */
export function ChatWidget() {
  const { places, setHighlight, aiEnabled } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  async function send(text: string) {
    const q = text.trim()
    if (q.length < 2 || busy) return
    const history = msgs.filter((m) => m !== GREETING).map(({ role, text: t }) => ({ role, text: t }))
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    try {
      const res = await api.assistant(q, undefined, history)
      setMsgs((m) => [...m, { role: 'assistant', text: clean(res.answer), meta: res }])
      if (res.place_ids.length) setHighlight(res.place_ids)
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', text: e instanceof Error ? e.message : 'Something went wrong. Try again.' }])
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(input)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            className="chat-panel"
            role="dialog"
            aria-label="पुण्यात काय? city assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}
          >
            <header className="chat-head">
              <div>
                <strong className="marathi">पुण्यात काय?</strong>
                <span className="tiny" style={{ color: '#bdbdbd', display: 'block' }}>
                  {aiEnabled ? 'Gemini city assistant' : 'Rule-based assistant (no AI key)'}
                </span>
              </div>
              <button className="btn icon ghost" style={{ color: '#fff' }} onClick={() => setOpen(false)} aria-label="Close assistant"><X size={18} aria-hidden /></button>
            </header>

            <div className="chat-list" ref={listRef} aria-live="polite">
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
                    <span className="tiny muted" style={{ display: 'block', marginTop: 6 }}>
                      {m.meta.engine === 'rules' ? 'Rule-based' : m.meta.engine === 'gemini' ? 'Gemini · Pune dataset' : 'Gemini · Google Maps grounded'}
                    </span>
                  )}
                </div>
              ))}
              {busy && <div className="chat-msg assistant"><Loader2 size={16} className="spin" aria-label="Thinking" /></div>}
            </div>

            {msgs.length <= 1 && (
              <div className="chips" style={{ padding: '0 14px 10px', gap: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => void send(s)}>{s}</button>
                ))}
              </div>
            )}

            <form className="chat-form" onSubmit={onSubmit}>
              <label htmlFor="chat-input" className="sr-only">Message</label>
              <input id="chat-input" ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about Pune…" maxLength={500} autoComplete="off" />
              <button className="btn primary icon" type="submit" disabled={busy || input.trim().length < 2} aria-label="Send">
                <Send size={16} aria-hidden />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Close city assistant' : 'Open city assistant'}>
        {open ? <X size={22} aria-hidden /> : <MessageCircle size={22} aria-hidden />}
        {!open && <span className="marathi">काय?</span>}
      </button>
    </>
  )
}
