import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Compass, GitCompareArrows, Home, Info, Megaphone, ShieldAlert, XCircle } from 'lucide-react'
import { useApp } from '../state/AppState'
import { ChatWidget } from './ChatWidget'

const LINKS = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/explore', label: 'Explore', Icon: Compass },
  { to: '/safety', label: 'Safe Route', Icon: ShieldAlert },
  { to: '/report', label: 'Report', Icon: Megaphone },
  { to: '/compare', label: 'Compare', Icon: GitCompareArrows },
]

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z" fill="#111" />
      <circle cx="12" cy="9" r="2.6" fill="#FFE14D" />
    </svg>
  )
}

export function Layout() {
  const { aiEnabled, toasts, error } = useApp()
  const location = useLocation()

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="nav">
        <div className="container">
          <NavLink to="/" className="brand" aria-label="पुण्यात काय? home" lang="mr">
            <BrandMark />
            <span><span className="marathi">पुण्यात काय?</span><small lang="en">Pune city intelligence</small></span>
          </NavLink>
          <nav className="nav-links" aria-label="Primary">
            {LINKS.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={15} aria-hidden /> {label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <span className={`ai-chip${aiEnabled ? ' on' : ''}`} title={aiEnabled ? 'Gemini connected' : 'No AI key configured: rule-based mode'}>
              <span className="dot" aria-hidden /> {aiEnabled ? 'Gemini live' : 'Rules mode'}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="container" role="alert" style={{ marginTop: 16 }}>
          <div className="notice"><XCircle size={16} color="var(--red)" aria-hidden /> {error}. Start the API server and refresh.</div>
        </div>
      )}

      <main id="main" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="footer">
        <div className="container">
          <div>
            <strong className="marathi" lang="mr" style={{ fontSize: 24 }}>पुण्यात काय?</strong>
            <p style={{ marginTop: 6, maxWidth: 420 }}>"What's happening in Pune?" Feel the city. Read the signals. Move smarter. Built for PromptWars x BRAIN DYPCOEI.</p>
          </div>
          <div style={{ maxWidth: 520 }}>
            Data: places are real, but ratings, prices and accessibility are illustrative demo values. Seed incidents are labelled demo records.
            Weather from Open-Meteo, routing from OSRM, map tiles © OpenStreetMap contributors. Photos: Wikimedia Commons contributors (via Wikipedia); dish and area photos are representative and labelled. No score here ever means "safe".
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {LINKS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={20} aria-hidden /> {label}
          </NavLink>
        ))}
      </nav>

      <ChatWidget />

      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast ${t.tone}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
            >
              {t.tone === 'success' ? <CheckCircle2 size={16} color="var(--lime)" aria-hidden />
                : t.tone === 'error' ? <XCircle size={16} color="var(--red)" aria-hidden />
                  : <Info size={16} color="var(--cyan)" aria-hidden />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
