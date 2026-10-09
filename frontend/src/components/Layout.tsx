import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Compass, Flower2, GitCompareArrows, Info, LayoutGrid, Megaphone, Moon, ShieldAlert, Sun, XCircle } from 'lucide-react'
import { useApp } from '../state/AppState'
import { LANGS, useI18n } from '../i18n'
import { ChatWidget } from './ChatWidget'
import { WelcomeSound } from './WelcomeSound'

const LINKS = [
  { to: '/city', key: 'nav.city', Icon: LayoutGrid },
  { to: '/explore', key: 'nav.explore', Icon: Compass },
  { to: '/safety', key: 'nav.safety', Icon: ShieldAlert },
  { to: '/report', key: 'nav.report', Icon: Megaphone },
  { to: '/compare', key: 'nav.compare', Icon: GitCompareArrows },
]

export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z" fill="currentColor" />
      <circle cx="12" cy="9" r="2.6" fill="#FFE14D" />
    </svg>
  )
}

export function Layout() {
  const { aiEnabled, toasts, error } = useApp()
  const { t, lang, setLang, theme, toggleTheme, utsav, toggleUtsav } = useI18n()
  const location = useLocation()

  return (
    <div className="shell">
      <a className="skip-link" href="#main">{t('skip')}</a>
      <header className="nav">
        <div className="container">
          <NavLink to="/" className="brand" aria-label="पुण्यात काय?">
            <BrandMark />
            <span><span className="marathi" lang="mr">पुण्यात काय?</span><small>{t('brand.sub')}</small></span>
          </NavLink>
          <nav className="nav-links" aria-label="Primary">
            {LINKS.map(({ to, key, Icon }) => (
              <NavLink key={to} to={to}>
                <Icon size={15} aria-hidden /> {t(key)}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <span className={`ai-chip${aiEnabled ? ' on' : ''}`} title={t(aiEnabled ? 'ai.liveTitle' : 'ai.rulesTitle')}>
              <span className="dot" aria-hidden /> {t(aiEnabled ? 'ai.live' : 'ai.rules')}
            </span>
            <div className="prefs">
              <div className="lang-seg" role="group" aria-label={t('lang.label')}>
                {LANGS.map((l) => (
                  <button key={l.id} lang={l.id} aria-pressed={lang === l.id} title={l.name} onClick={() => setLang(l.id)}>{l.short}</button>
                ))}
              </div>
              <WelcomeSound />
              <button className={`icon-btn${utsav ? ' utsav-on' : ''}`} onClick={toggleUtsav} aria-pressed={utsav} aria-label={t(utsav ? 'utsav.on' : 'utsav.off')} title={t(utsav ? 'utsav.on' : 'utsav.off')}>
                <Flower2 size={16} aria-hidden />
              </button>
              <button className="icon-btn" onClick={toggleTheme} aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}>
                {theme === 'dark' ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="container" role="alert" style={{ marginTop: 16 }}>
          <div className="notice"><XCircle size={16} color="var(--red)" aria-hidden /> {t('err.api', { msg: error })}</div>
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
            <strong className="marathi" lang="mr" style={{ fontSize: 26 }}>पुण्यात काय?</strong>
            <p style={{ marginTop: 6, maxWidth: 420 }}>{t('footer.tagline')} {t('footer.event')}</p>
          </div>
          <div style={{ maxWidth: 560 }}>{t('footer.data')}</div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Primary mobile">
        {LINKS.map(({ to, key, Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={20} aria-hidden /> {t(key)}
          </NavLink>
        ))}
      </nav>

      <ChatWidget />

      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div key={x.id} className={`toast ${x.tone}`} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}>
              {x.tone === 'success' ? <CheckCircle2 size={16} color="#7bd88f" aria-hidden />
                : x.tone === 'error' ? <XCircle size={16} color="#ff6b6b" aria-hidden />
                  : <Info size={16} color="#5cc8e8" aria-hidden />}
              {x.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
