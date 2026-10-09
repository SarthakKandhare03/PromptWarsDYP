import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BrainCircuit, GitCompareArrows, Landmark, Languages, Navigation, ShieldCheck } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import { Counter } from '../components/Counter'
import { TrustBadge } from '../components/TrustBadge'
import { PATYA, PuneriPati } from '../components/PuneriPati'

const AREAS = ['कसबा पेठ', 'शनिवार वाडा', 'स्वारगेट', 'सिंहगड', 'तांबट आळी', 'पर्वती', 'डेक्कन', 'कोथरूड', 'कॅम्प', 'फर्ग्युसन रोड']
const AREAS_EN = ['Koregaon Park', 'FC Road', 'Camp', 'Aundh', 'Baner', 'Hadapsar', 'Kothrud', 'Viman Nagar', 'Katraj', 'Shivajinagar']
const QUESTIONS = ['land.q1', 'land.q2', 'land.q3', 'land.q4']

const rise = {
  hidden: { opacity: 0, y: 60, filter: 'blur(12px)' },
  show: (i: number) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 0.15 + i * 0.18, duration: 0.9, ease: [0.16, 1, 0.3, 1] as const } }),
}
const fade = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.6 + i * 0.1, duration: 0.6 } }),
}

function Marquee({ items, alt = false }: { items: string[]; alt?: boolean }) {
  const row = (k: string) => (
    <span key={k} aria-hidden={k === 'b'}>
      {items.map((a) => <span key={a + k}>{a} <b aria-hidden>✦</b></span>)}
    </span>
  )
  return (
    <div className={`marquee${alt ? ' alt' : ''}`}>
      <div className="marquee-track">{row('a')}{row('b')}</div>
    </div>
  )
}

export function LandingPage() {
  const { t, utsav, toggleUtsav } = useI18n()
  const { places, reports, city } = useApp()
  const [samples, setSamples] = useState(0)
  const [qi, setQi] = useState(0)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => { api.hotspots().then((h) => setSamples(h.model.samples)).catch(() => undefined) }, [])
  useEffect(() => {
    const id = setInterval(() => setQi((i) => (i + 1) % QUESTIONS.length), 2800)
    return () => clearInterval(id)
  }, [])

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const photo = (id: string) => places.find((p) => p.id === id)
  const polaroids = [
    { p: photo('shaniwar-wada'), style: { top: '6%', right: '4%', rotate: 6 } },
    { p: photo('dagdusheth'), style: { top: '40%', right: '17%', rotate: -8 } },
    { p: photo('sinhagad'), style: { top: '58%', right: '-1%', rotate: 4 } },
  ]
  const latest = reports[0]
  const strip = ['lal-mahal', 'pataleshwar', 'kelkar-museum', 'aga-khan-palace'].map(photo).filter(Boolean)

  return (
    <div className="land">
      {/* ---------- HERO ---------- */}
      <section className="land-hero" ref={heroRef} onPointerMove={onMove}>
        <div className="land-grid" aria-hidden />
        <div className="land-spot" aria-hidden />

        {polaroids.map(({ p, style }, i) => p?.image && (
          <motion.figure
            key={p.id}
            className="polaroid"
            style={{ top: style.top, right: style.right, margin: 0 }}
            initial={{ opacity: 0, y: 40, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: style.rotate }}
            transition={{ delay: 0.8 + i * 0.15, type: 'spring', stiffness: 80, damping: 14 }}
            whileHover={{ scale: 1.06, rotate: 0, zIndex: 5 }}
          >
            <img src={p.image} alt={p.name} loading="eager" referrerPolicy="no-referrer" />
            <span>{p.name}</span>
          </motion.figure>
        ))}

        <div className="container land-inner">
          <motion.span className="land-kicker" variants={fade} initial="hidden" animate="show" custom={-4}>
            <span className="live-dot" aria-hidden /> {t('land.kicker')}
          </motion.span>

          <h1 className="land-title" lang="mr" aria-label="पुण्यात काय?">
            <motion.span className="w" variants={rise} initial="hidden" animate="show" custom={0} aria-hidden>पुण्यात</motion.span>
            <motion.span
              className="w w2"
              variants={rise} initial="hidden" animate="show" custom={1} aria-hidden
              whileHover={{ rotate: -4, scale: 1.04 }}
            >
              काय?
            </motion.span>
          </h1>

          <motion.p className="land-meaning" variants={fade} initial="hidden" animate="show" custom={1}>{t('land.meaning')}</motion.p>

          <motion.div className="land-ask" variants={fade} initial="hidden" animate="show" custom={2} aria-live="polite">
            <span className="muted">{t('land.ask')}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={qi}
                className="q"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35 }}
              >
                {t(QUESTIONS[qi])}
              </motion.span>
            </AnimatePresence>
          </motion.div>

          <motion.p className="land-lede" variants={fade} initial="hidden" animate="show" custom={3}>{t('land.lede')}</motion.p>

          <motion.div className="land-ctas" variants={fade} initial="hidden" animate="show" custom={4}>
            <Link to="/city" className="btn primary xl">{t('land.cta')} <ArrowRight size={18} aria-hidden /></Link>
            <Link to="/safety" className="btn xl">{t('land.cta2')}</Link>
          </motion.div>
        </div>

        <Link to="/city" className="badge-spin" aria-label={t('land.cta')}>
          <svg viewBox="0 0 150 150" aria-hidden>
            <defs><path id="circ" d="M75,75 m-58,0 a58,58 0 1,1 116,0 a58,58 0 1,1 -116,0" /></defs>
            <text fontSize="13" fontWeight="600" letterSpacing="3" fill="currentColor">
              <textPath href="#circ">PUNE ✦ पुणे ✦ VERIFIED ✦ सुरक्षित ✦ LIVE ✦ </textPath>
            </text>
          </svg>
          <span className="core"><ArrowUpRight size={26} aria-hidden /></span>
        </Link>

        <div className="scroll-cue" aria-hidden>{t('land.scroll')}<i /></div>
      </section>

      {/* ---------- MARQUEES ---------- */}
      <Marquee items={AREAS} />
      <Marquee items={AREAS_EN} alt />

      <div className="container">
        {/* ---------- STATS ---------- */}
        <section className="land-section" aria-label="Key numbers">
          <div className="stats-row">
            {[
              { n: places.length, label: t('land.stat.places') },
              { n: samples, label: t('land.stat.learned') },
              { n: city?.accident_zones.length ?? 0, label: t('land.stat.corridors') },
              { n: 3, label: t('land.stat.langs') },
            ].map((s, i) => (
              <motion.div key={i} className="stat-big" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <strong><Counter value={s.n} duration={1400} /></strong>
                <span>{s.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- BENTO ---------- */}
        <section className="land-section" aria-labelledby="bento-title">
          <div className="land-head">
            <div>
              <span className="eyebrow">{t('land.bento.k')}</span>
              <h2 id="bento-title">{t('land.bento.t')}</h2>
            </div>
          </div>
          <div className="bento">
            <Link to="/safety" className="tile t-a sun">
              <div className="row between">
                <span className="ico"><ShieldCheck size={22} aria-hidden /></span>
                <ArrowUpRight size={22} aria-hidden />
              </div>
              <div>
                <h3 style={{ fontSize: 'clamp(30px, 3.4vw, 48px)' }}>{t('land.b1.t')}</h3>
                <p style={{ marginTop: 8 }}>{t('land.b1.d')}</p>
              </div>
              {latest && (
                <div className="mini-meter" style={{ background: 'rgba(255,255,255,.55)', padding: 16, borderRadius: 16 }}>
                  <div className="row1"><strong>{latest.ai_summary ?? latest.description}</strong><TrustBadge label={latest.trust_label} /></div>
                  <div className="trust-meter" style={{ height: 8, background: 'rgba(17,17,17,.1)' }}>
                    <motion.i initial={{ width: 0 }} whileInView={{ width: `${latest.trust_score}%` }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeOut' }} />
                  </div>
                  <span className="tiny">{t('common.trust', { n: latest.trust_score })} · {latest.age}</span>
                </div>
              )}
            </Link>

            <Link to="/safety" className="tile t-b ink">
              <span className="ico"><Navigation size={20} aria-hidden /></span>
              <svg className="mini-route" viewBox="0 0 300 90" aria-hidden>
                <motion.path d="M10 70 C 80 70, 90 20, 160 30 S 260 70, 290 20" stroke="#8A8F98" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
                <motion.path d="M10 70 C 70 90, 150 85, 200 60 S 270 40, 290 20" stroke="#FFE14D" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.4 }} />
                <circle cx="10" cy="70" r="6" fill="#f4f1e8" /><circle cx="290" cy="20" r="6" fill="#FFE14D" />
              </svg>
              <div><h3>{t('land.b2.t')}</h3><p style={{ marginTop: 6 }}>{t('land.b2.d')}</p></div>
            </Link>

            <Link to="/report" className="tile t-c">
              <span className="ico"><Languages size={20} aria-hidden /></span>
              <div className="lang-pills" style={{ color: 'var(--text)' }}>
                <span style={{ borderColor: 'var(--text)' }}>English</span><span style={{ borderColor: 'var(--text)' }}>हिंदी</span><span style={{ borderColor: 'var(--text)', background: 'var(--sun)', color: '#111' }}>मराठी</span>
              </div>
              <div><h3>{t('land.b3.t')}</h3><p style={{ marginTop: 6 }}>{t('land.b3.d')}</p></div>
            </Link>

            <Link to="/safety" className="tile t-d">
              <span className="ico"><BrainCircuit size={20} aria-hidden /></span>
              <div className="big-num"><Counter value={samples} duration={1600} /></div>
              <div><h3>{t('land.b4.t')}</h3><p style={{ marginTop: 6 }}>{t('land.b4.d')}</p></div>
            </Link>

            <Link to="/compare" className="tile t-e ink">
              <span className="ico"><GitCompareArrows size={20} aria-hidden /></span>
              <div style={{ display: 'grid', gap: 8 }} aria-hidden>
                {[92, 74, 51].map((w, i) => (
                  <div key={w} className="bar" style={{ background: 'rgba(255,255,255,.1)', height: 10 }}>
                    <motion.i style={{ background: i === 0 ? '#FFE14D' : '#f4f1e8' }} initial={{ width: 0 }} whileInView={{ width: `${w}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.15 }} />
                  </div>
                ))}
              </div>
              <div><h3>{t('land.b5.t')}</h3><p style={{ marginTop: 6 }}>{t('land.b5.d')}</p></div>
            </Link>

            <Link to="/explore?category=heritage" className="tile t-f">
              <div className="row between">
                <span className="ico"><Landmark size={20} aria-hidden /></span>
                <ArrowUpRight size={22} aria-hidden />
              </div>
              <div className="photo-strip">
                {strip.map((p) => p?.image && <img key={p.id} src={p.image} alt={p.name} loading="lazy" referrerPolicy="no-referrer" />)}
              </div>
              <div><h3>{t('land.b6.t')}</h3><p style={{ marginTop: 6 }}>{t('land.b6.d')}</p></div>
            </Link>
          </div>
        </section>

        {/* ---------- PUNERI PATYA ---------- */}
        <section className="land-section" aria-labelledby="pati-title">
          <div className="land-head">
            <div>
              <span className="eyebrow" lang="mr">{t('pati.k')}</span>
              <h2 id="pati-title">{t('pati.t')}</h2>
              <p className="muted" style={{ marginTop: 10, maxWidth: 560 }}>{t('pati.sub')}</p>
            </div>
          </div>
          <div className="pati-wall">
            {PATYA.map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30, rotate: 0 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 90, damping: 14 }}>
                <PuneriPati i={i} tilt={[-2.5, 1.8, -1.2, 2.4, -1.8, 1.2][i]} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- GANESHOTSAV ---------- */}
        <motion.section className="utsav-block" aria-labelledby="utsav-title" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <div className="utsav-toran" aria-hidden />
          <span className="eyebrow" style={{ color: '#5a2a00' }}>{t('utsav.k')}</span>
          <h2 id="utsav-title" lang="mr">गणपती बाप्पा मोरया!</h2>
          <p>{t('utsav.d')}</p>
          <ol className="utsav-steps" lang="mr">
            {(city?.manache_ganpati ?? []).map((g) => (
              <li key={g.order}><span>{g.order}</span>{g.name_mr}</li>
            ))}
          </ol>
          <div className="row" style={{ marginTop: 22 }}>
            <Link to="/city?layer=festival" className="btn primary xl">{t('utsav.cta')} <ArrowRight size={18} aria-hidden /></Link>
            {!utsav && <button className="btn xl" onClick={toggleUtsav}>{t('utsav.toggle')}</button>}
          </div>
        </motion.section>

        {/* ---------- HOW IT WORKS ---------- */}
        <section className="land-section" aria-labelledby="how-title">
          <div className="land-head">
            <div>
              <span className="eyebrow">{t('land.how.k')}</span>
              <h2 id="how-title">{t('land.how.t')}</h2>
            </div>
          </div>
          <div className="how">
            <motion.div className="how-line" aria-hidden initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: 'easeInOut' }} />
            {[1, 2, 3, 4, 5].map((n) => (
              <motion.div key={n} className="how-step" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + n * 0.15 }}>
                <span className="n">0{n}</span>
                <h4>{t(`land.how.${n}`)}</h4>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ---------- LIVE TICKER ---------- */}
        {reports.length > 0 && (
          <section className="land-section" aria-labelledby="live-title">
            <div className="land-head">
              <div>
                <span className="eyebrow"><span className="live-dot" aria-hidden /> {t('land.live')}</span>
              </div>
            </div>
            <h2 id="live-title" className="sr-only">{t('land.live')}</h2>
            <div className="ticker">
              <div className="ticker-track">
                {['a', 'b'].map((k) => (
                  <div key={k} aria-hidden={k === 'b'}>
                    {reports.slice(0, 8).map((r) => (
                      <Link key={r.id + k} to={`/safety?report=${r.id}`} className="tick" tabIndex={k === 'b' ? -1 : 0}>
                        <strong>{t(`cat.${r.category}`)}</strong>
                        <span className="muted">{r.age}</span>
                        <TrustBadge label={r.trust_label} />
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- FINAL CTA ---------- */}
        <motion.section className="final" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
          <h2 lang="mr">चला, पुणे शोधूया.</h2>
          <p>{t('land.finalSub')}</p>
          <Link to="/city" className="btn sun xl">{t('land.cta')} <ArrowRight size={18} aria-hidden /></Link>
        </motion.section>
      </div>
    </div>
  )
}
