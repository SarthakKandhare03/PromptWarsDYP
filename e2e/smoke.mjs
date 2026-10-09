// End-to-end smoke test for पुण्यात काय?: every page on mobile + desktop, plus the core user flows.
// Usage:  node smoke.mjs [baseUrl]          (default http://127.0.0.1:8000)
// Env:    CHROME_PATH, SHOTS_DIR (write mobile full-page screenshots there)
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = (process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SHOTS = process.env.SHOTS_DIR || ''
const ROUTES = ['/', '/city', '/explore', '/safety', '/report', '/compare']
const DEVICES = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
}
const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36'
// Third-party hosts can be slow or rate-limited during a demo; they are not app bugs.
const IGNORED = [/openstreetmap/, /fonts\.g/, /wikimedia/, /router\.project-osrm/, /Failed to load resource/]

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(browser, device, path) {
  const page = await browser.newPage()
  await page.setViewport(DEVICES[device])
  if (device === 'mobile') await page.setUserAgent(MOBILE_UA)
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORED.some((r) => r.test(m.text()))) errors.push(`console: ${m.text()}`) })
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(BASE)) errors.push(`HTTP ${r.status()} ${r.url()}`) })
  const sep = path.includes('?') ? '&' : '?'
  await page.goto(`${BASE}${path}${sep}lang=en&theme=light&utsav=on`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForSelector('main', { timeout: 15000 })
  await page.waitForNetworkIdle({ idleTime: 600, timeout: 12000 }).catch(() => undefined)
  await sleep(1200) // let entrance animations settle
  return { page, errors }
}

// Elements that stick out of the viewport and are NOT intentionally clipped by an ancestor.
function overflowAudit() {
  const vw = document.documentElement.clientWidth
  const clipped = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(p).overflowX)) return true
    }
    return false
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el)
    if (s.position === 'fixed' || s.display === 'none' || s.visibility === 'hidden') continue
    if (el.matches('.skip-link, .sr-only')) continue // intentionally off-screen until focused
    if (el.closest('.leaflet-container, svg')) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if ((r.right > vw + 2 || r.left < -2) && !clipped(el)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} [${Math.round(r.left)}..${Math.round(r.right)}]`)
  }
  return { vw, count: out.length, sample: out.slice(0, 5) }
}

// Buttons/links/inputs that a screen reader could not name.
function a11yAudit() {
  const unnamed = []
  for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
    const name = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim()
    if (!name && !el.querySelector('img[alt]:not([alt=""])')) unnamed.push(el.outerHTML.slice(0, 70))
  }
  for (const el of document.querySelectorAll('input:not([type=hidden]):not(.sr-only), select, textarea')) {
    const labelled = el.getAttribute('aria-label') || el.closest('label') || (el.id && document.querySelector(`label[for="${el.id}"]`))
    if (!labelled) unnamed.push(el.outerHTML.slice(0, 70))
  }
  const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length
  return { unnamed: unnamed.slice(0, 5), count: unnamed.length, imgsNoAlt }
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] })
if (SHOTS) mkdirSync(SHOTS, { recursive: true })
console.log(`\nपुण्यात काय? e2e smoke against ${BASE}\n`)

try {
  // ---------- 1. every page, both form factors ----------
  for (const device of Object.keys(DEVICES)) {
    for (const route of ROUTES) {
      const { page, errors } = await open(browser, device, route)
      const ov = await page.evaluate(overflowAudit)
      const a11y = await page.evaluate(a11yAudit)
      check(`[${device}] ${route} renders without errors`, errors.length === 0, errors.slice(0, 3).join(' | '))
      check(`[${device}] ${route} no horizontal overflow`, ov.count === 0, ov.sample.join(', '))
      check(`[${device}] ${route} controls have accessible names`, a11y.count === 0 && a11y.imgsNoAlt === 0, `${a11y.unnamed.join(' | ')} imgsNoAlt=${a11y.imgsNoAlt}`)
      if (device === 'mobile') {
        const nav = await page.evaluate(() => ({
          bottom: getComputedStyle(document.querySelector('.bottom-nav')).display !== 'none',
          top: getComputedStyle(document.querySelector('.nav-links')).display === 'none',
        }))
        check(`[mobile] ${route} uses bottom navigation`, nav.bottom && nav.top)
        if (SHOTS) await page.screenshot({ path: join(SHOTS, `m${route === '/' ? '-landing' : route.replace('/', '-')}.png`), fullPage: true })
      }
      await page.close()
    }
  }

  // ---------- 2. flows (mobile) ----------
  {
    const { page } = await open(browser, 'mobile', '/')
    const before = await page.evaluate(() => document.documentElement.dataset.theme)
    await page.click('button.icon-btn[aria-label^="Switch to"]')
    const after = await page.evaluate(() => document.documentElement.dataset.theme)
    check('theme toggle switches light/dark', before !== after, `${before} -> ${after}`)
    await page.click('.lang-seg button[lang="mr"]')
    await sleep(300)
    const mr = await page.evaluate(() => document.querySelector('.bottom-nav').textContent)
    check('language switch to Marathi translates navigation', mr.includes('शोधा'), mr.slice(0, 40))
    await page.click('.lang-seg button[lang="en"]')
    const assets = await page.evaluate(async () => {
      const m = await (await fetch('/manifest.json')).json()
      const ico = await fetch('/favicon.ico')
      const wav = await fetch('/audio/namaskar.wav')
      return { icons: m.icons.length, ico: ico.status, wav: wav.status, wavType: wav.headers.get('content-type') }
    })
    check('PWA manifest + favicon + welcome audio served', assets.icons >= 3 && assets.ico === 200 && assets.wav === 200, JSON.stringify(assets))
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/safety')
    await page.click('form[aria-label] button[type="submit"]')
    await page.waitForSelector('.route-card', { timeout: 30000 })
    const r = await page.evaluate(() => ({
      routes: document.querySelectorAll('.route-card').length,
      explain: document.querySelector('.answer p')?.textContent?.length ?? 0,
      gmaps: !!document.querySelector('a[href^="https://www.google.com/maps/dir/"]'),
    }))
    check('safe route: alternatives scored + explained + Google Maps handoff', r.routes >= 1 && r.explain > 20 && r.gmaps, JSON.stringify(r))
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/report')
    await page.type('#desc', 'Water above the ankle near the bus stop (e2e test)')
    const map = await page.$('.map-col .leaflet-container')
    await map.scrollIntoView()
    const box = await map.boundingBox()
    await page.touchscreen.tap(box.x + box.width * 0.22, box.y + box.height * 0.8) // open area, away from markers
    await sleep(300)
    await page.click('form.filters button[type="submit"]')
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.includes('Submit report')), { timeout: 8000 })
    await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.includes('Submit report')).click())
    await page.waitForFunction(() => document.body.innerText.includes('Report live on the map'), { timeout: 40000 })
    const score = await page.evaluate(() => document.querySelector('.mono-num')?.textContent)
    check('report flow: pin on map -> review -> submit -> trust-scored', !!score, `trust ${score}`)
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/')
    await page.click('.chat-fab')
    await page.waitForSelector('.chat-panel .chips .chip', { timeout: 5000 })
    await page.click('.chat-panel .chips .chip')
    await page.waitForSelector('.chat-panel .chat-meta', { timeout: 45000 })
    const ans = await page.evaluate(() => {
      const msgs = document.querySelectorAll('.chat-panel .chat-msg.assistant p')
      return msgs[msgs.length - 1]?.textContent ?? ''
    })
    check('chat assistant answers a suggested question', ans.length > 20, ans.slice(0, 80))
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/compare')
    await page.waitForSelector('.cmp-row:not(.head)', { timeout: 15000 })
    const n1 = await page.$$eval('.cmp-row:not(.head)', (r) => r.length)
    await page.click('.chips .chip')
    await sleep(900)
    const n2 = await page.$$eval('.cmp-row:not(.head)', (r) => r.length)
    check('compare ranks places and reacts to removal', n1 >= 2 && n2 === n1 - 1, `${n1} -> ${n2}`)
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/explore')
    const all = await page.$$eval('.place-card', (c) => c.length)
    await page.type('#q', 'misal')
    await sleep(400)
    const some = await page.$$eval('.place-card', (c) => c.length)
    check('explore search filters places', all > some && some >= 1, `${all} -> ${some}`)
    await page.close()
  }
  {
    const { page } = await open(browser, 'mobile', '/city?layer=festival')
    await page.waitForSelector('.trail-dot', { timeout: 10000 }).catch(() => undefined)
    const dots = await page.$$eval('.trail-dot', (d) => d.length)
    check('Ganeshotsav darshan route draws the 6 stops', dots === 6, `${dots} stops`)
    await page.close()
  }
} finally {
  await browser.close()
}

console.log(`\n${failures === 0 ? 'ALL PASSED' : `${failures} FAILED`}\n`)
process.exit(failures === 0 ? 0 : 1)
