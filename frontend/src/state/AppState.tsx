import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { CityInfo, Place, Pulse, Report } from '../types'

export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

interface AppState {
  city: CityInfo | null
  places: Place[]
  reports: Report[]
  pulse: Pulse | null
  aiEnabled: boolean
  loading: boolean
  error: string | null
  saved: string[]
  toggleSaved: (id: string) => void
  highlight: string[]
  setHighlight: (ids: string[]) => void
  addReport: (r: Report) => void
  refresh: () => Promise<void>
  toasts: Toast[]
  notify: (message: string, tone?: Toast['tone']) => void
}

const Ctx = createContext<AppState | null>(null)
const SAVED_KEY = 'citypulse.saved'

function readSaved(): string[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<CityInfo | null>(null)
  const [places, setPlaces] = useState<Place[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string[]>(readSaved)
  const [highlight, setHighlight] = useState<string[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [c, p, r, h] = await Promise.all([api.city(), api.places(), api.reports(), api.health()])
      setCity(c)
      setPlaces(p)
      setReports(r)
      setAiEnabled(h.ai_enabled)
      setError(null)
      api.pulse().then(setPulse).catch(() => setPulse(null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the CityPulse API')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const toggleSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      } catch { /* storage unavailable: keep in memory */ }
      return next
    })
  }, [])

  const addReport = useCallback((r: Report) => {
    // Re-fetch so corroboration re-scores neighbouring reports too.
    setReports((prev) => [r, ...prev])
    api.reports().then(setReports).catch(() => undefined)
    api.pulse().then(setPulse).catch(() => undefined)
  }, [])

  const value = useMemo(
    () => ({
      city, places, reports, pulse, aiEnabled, loading, error, saved, toggleSaved,
      highlight, setHighlight, addReport, refresh, toasts, notify,
    }),
    [city, places, reports, pulse, aiEnabled, loading, error, saved, toggleSaved, highlight, addReport, refresh, toasts, notify],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppStateProvider')
  return v
}
