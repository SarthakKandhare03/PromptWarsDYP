import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'

const SRC = '/audio/namaskar.wav' // generated once with Gemini 3.8 Flash TTS (Marathi), verified by transcription
const PHRASE = 'नमस्कार पुणे! पुण्यामध्ये आपले स्वागत आहे.'
const SOUND_KEY = 'pk.sound'
const GREETED_KEY = 'pk.greeted'

function store(kind: 'local' | 'session', key: string, value?: string): string | null {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage
    if (value !== undefined) s.setItem(key, value)
    return s.getItem(key)
  } catch {
    return null
  }
}

/** Speech-synthesis fallback if the audio file cannot play (Marathi voice, else Hindi, else default). */
function speakFallback() {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(PHRASE)
  const voices = window.speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang.startsWith('mr')) ?? voices.find((v) => v.lang.startsWith('hi')) ?? null
  u.lang = u.voice?.lang ?? 'mr-IN'
  window.speechSynthesis.speak(u)
}

/**
 * Plays the Marathi welcome once per visit. Browsers block audio before a user gesture,
 * so if autoplay is refused it waits for the first click/tap/key. Muting is remembered,
 * and a caption toast shows the words for people who cannot hear them (WCAG 1.4.2 / 1.2).
 */
export function WelcomeSound() {
  const { notify } = useApp()
  const { t, lang } = useI18n()
  const [enabled, setEnabled] = useState(() => store('local', SOUND_KEY) !== 'off')
  const audio = useRef<HTMLAudioElement | null>(null)

  const caption = useCallback(() => {
    const gloss = lang === 'en' ? ' · "Hello Pune! Welcome to Pune."' : lang === 'hi' ? ' · "नमस्ते पुणे! पुणे में आपका स्वागत है।"' : ''
    notify(`🔊 ${PHRASE}${gloss}`, 'info')
  }, [lang, notify])

  const play = useCallback(async (): Promise<boolean> => {
    audio.current ??= new Audio(SRC)
    audio.current.currentTime = 0
    audio.current.volume = 0.9
    try {
      await audio.current.play()
      caption()
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotAllowedError') return false // autoplay blocked: wait for a gesture
      speakFallback()
      caption()
      return true
    }
  }, [caption])

  // Greet once per session when the site opens.
  useEffect(() => {
    if (!enabled || store('session', GREETED_KEY)) return
    let armed = false
    const onGesture = () => {
      cleanup()
      void play().then(() => store('session', GREETED_KEY, '1'))
    }
    const cleanup = () => {
      if (!armed) return
      armed = false
      window.removeEventListener('pointerdown', onGesture)
      window.removeEventListener('keydown', onGesture)
    }
    void play().then((ok) => {
      if (ok) {
        store('session', GREETED_KEY, '1')
      } else {
        armed = true
        window.addEventListener('pointerdown', onGesture, { once: true })
        window.addEventListener('keydown', onGesture, { once: true })
      }
    })
    return cleanup
    // Run once on mount; later toggles are handled by the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    store('local', SOUND_KEY, next ? 'on' : 'off')
    if (next) void play() // the click itself is a user gesture, so this always plays
    else audio.current?.pause()
  }

  return (
    <button className="icon-btn" onClick={toggle} aria-pressed={enabled}
      aria-label={t(enabled ? 'sound.on' : 'sound.off')} title={t(enabled ? 'sound.on' : 'sound.off')}>
      {enabled ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
    </button>
  )
}
