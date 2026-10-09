// Capture README screenshots (desktop + mobile) into docs/screenshots.  Usage: node screenshots.mjs [baseUrl]
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const BASE = (process.argv[2] || 'http://127.0.0.1:8000').replace(/\/$/, '')
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
mkdirSync(OUT, { recursive: true })

const SHOTS = [
  { name: 'landing', path: '/?lang=en&theme=light&utsav=on', vp: { width: 1440, height: 900 } },
  { name: 'landing-marathi-dark', path: '/?lang=mr&theme=dark&utsav=on', vp: { width: 1440, height: 900 } },
  { name: 'city-hindi-festival', path: '/city?layer=festival&lang=hi&theme=light&utsav=on', vp: { width: 1440, height: 900 } },
  { name: 'safety', path: '/safety?lang=en&theme=light&utsav=on', vp: { width: 1440, height: 900 }, plan: true },
  { name: 'mobile-landing', path: '/?lang=en&theme=light&utsav=on', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'mobile-city', path: '/city?lang=mr&theme=light&utsav=on', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'mobile-safety', path: '/safety?lang=en&theme=dark&utsav=on', vp: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, plan: true },
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true })
for (const s of SHOTS) {
  const page = await browser.newPage()
  await page.setViewport(s.vp)
  await page.evaluateOnNewDocument(() => sessionStorage.setItem('pk.greeted', '1')) // no greeting toast in shots
  await page.goto(`${BASE}${s.path}`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => undefined)
  await new Promise((r) => setTimeout(r, 2600))
  if (s.plan) {
    await page.click('form[aria-label] button[type="submit"]')
    await page.waitForSelector('.route-card', { timeout: 30000 }).catch(() => undefined)
    await new Promise((r) => setTimeout(r, 2200))
    await page.evaluate(() => window.scrollTo(0, 0))
  }
  await page.screenshot({ path: `${OUT}${s.name}.png` })
  console.log('shot', s.name)
  await page.close()
}
await browser.close()
