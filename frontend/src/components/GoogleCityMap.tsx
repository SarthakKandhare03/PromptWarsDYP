import { useEffect, useRef, useState } from 'react'
import type { CityMapProps } from './CityMap'
import { useApp } from '../state/AppState'

/* Google Maps JavaScript API view. Loaded only when the server provides a Maps key.
   Uses textContent-built info windows (no HTML injection from report text). */

declare global {
  interface Window {
    google?: any // eslint-disable-line @typescript-eslint/no-explicit-any
    __cpGmapsReady?: () => void
  }
}

let loader: Promise<void> | null = null
function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve()
  if (loader) return loader
  loader = new Promise((resolve, reject) => {
    window.__cpGmapsReady = () => resolve()
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__cpGmapsReady`
    s.async = true
    s.onerror = () => { loader = null; reject(new Error('Google Maps failed to load')) }
    document.head.appendChild(s)
  })
  return loader
}

const CAT_COLOR: Record<string, string> = {
  heritage: '#8B7CF6', food: '#7CC74A', cafe: '#F2B33D', attraction: '#3DB8D9', hotel: '#9CA3AF',
}

function info(title: string, lines: string[]): HTMLElement {
  const root = document.createElement('div')
  root.style.maxWidth = '240px'
  const h = document.createElement('strong')
  h.textContent = title
  root.appendChild(h)
  for (const l of lines) {
    const p = document.createElement('div')
    p.textContent = l
    p.style.cssText = 'font-size:12px;color:#5f6368;margin-top:4px'
    root.appendChild(p)
  }
  return root
}

export function GoogleCityMap({
  places = [], reports = [], routes = [], selectedRouteId, onRouteSelect, showZones = false, hotspots = [],
  picked, onPick, focus, fitTo, label = 'Google map of Pune', onPlaceSelect,
}: CityMapProps) {
  const { city, mapsKey, highlight, setMapEngine, notify } = useApp()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const overlays = useRef<any[]>([]) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!mapsKey || !el.current) return
    let cancelled = false
    loadGoogleMaps(mapsKey).then(async () => {
      if (cancelled || !el.current) return
      const { Map } = await window.google.maps.importLibrary('maps')
      map.current = new Map(el.current, {
        center: { lat: city?.center[0] ?? 18.5204, lng: city?.center[1] ?? 73.8567 },
        zoom: city?.zoom ?? 13, mapTypeControl: false, streetViewControl: true, fullscreenControl: false,
        clickableIcons: false,
      })
      if (onPick) map.current.addListener('click', (e: any) => onPick([e.latLng.lat(), e.latLng.lng()])) // eslint-disable-line @typescript-eslint/no-explicit-any
      setReady(true)
    }).catch(() => {
      notify('Google Maps unavailable: switched to OpenStreetMap', 'error')
      setMapEngine('osm')
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey])

  // Redraw overlays whenever data changes.
  useEffect(() => {
    const g = window.google?.maps
    if (!ready || !g || !map.current) return
    overlays.current.forEach((o) => o.setMap(null))
    overlays.current = []
    const iw = new g.InfoWindow()
    const add = (o: any) => { overlays.current.push(o); return o } // eslint-disable-line @typescript-eslint/no-explicit-any

    for (const h of hotspots) {
      add(new g.Circle({ map: map.current, center: { lat: h.lat, lng: h.lng }, radius: 220 + h.weight * 60,
        strokeColor: '#D23A3A', strokeOpacity: 0.5, strokeWeight: 1, fillColor: '#D23A3A', fillOpacity: 0.12 }))
    }
    const ordered = [...routes].sort((a, b) => Number(a.id === selectedRouteId) - Number(b.id === selectedRouteId))
    for (const r of ordered) {
      const sel = r.id === selectedRouteId
      const line = add(new g.Polyline({ map: map.current, path: r.geometry.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: sel ? (r.is_safest ? '#1F9D4A' : '#111111') : '#8A8F98', strokeOpacity: sel ? 0.95 : 0.5, strokeWeight: sel ? 6 : 5 }))
      line.addListener('click', () => onRouteSelect?.(r.id))
    }
    if (showZones) {
      for (const z of city?.accident_zones ?? []) {
        const m = add(new g.Marker({ map: map.current, position: { lat: z.lat, lng: z.lng }, title: z.name,
          icon: { path: g.SymbolPath.CIRCLE, scale: 7, fillColor: '#D23A3A', fillOpacity: 0.3, strokeColor: '#D23A3A', strokeWeight: 1.5 } }))
        m.addListener('click', () => { iw.setContent(info(z.name, ['Approximate point on a publicly reported accident-prone corridor.'])); iw.open(map.current, m) })
      }
    }
    for (const p of places) {
      const hl = highlight.includes(p.id)
      const m = add(new g.Marker({ map: map.current, position: { lat: p.lat, lng: p.lng }, title: p.name,
        icon: { path: g.SymbolPath.CIRCLE, scale: hl ? 11 : 8, fillColor: hl ? '#FFE14D' : CAT_COLOR[p.category], fillOpacity: 1,
          strokeColor: hl ? '#111' : '#fff', strokeWeight: hl ? 3 : 2 } }))
      m.addListener('click', () => {
        iw.setContent(info(p.name, [`${p.category} · ${p.area}`, p.summary]))
        iw.open(map.current, m)
        onPlaceSelect?.(p)
      })
    }
    for (const r of reports) {
      const color = r.source === 'official' ? '#0A7EA4' : r.severity >= 3 ? '#D23A3A' : '#F59E0B'
      const m = add(new g.Marker({ map: map.current, position: { lat: r.lat, lng: r.lng }, title: `${r.category} report`,
        icon: { path: g.SymbolPath.CIRCLE, scale: 6, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } }))
      m.addListener('click', () => {
        iw.setContent(info(r.ai_summary ?? r.description, [`${r.category} · ${r.trust_label} · trust ${r.trust_score}/100`, `${r.age} · ${r.source}${r.demo ? ' · demo' : ''}`]))
        iw.open(map.current, m)
      })
    }
    if (picked) add(new g.Marker({ map: map.current, position: { lat: picked[0], lng: picked[1] } }))
  }, [ready, places, reports, routes, selectedRouteId, showZones, hotspots, picked, highlight, city, onRouteSelect, onPlaceSelect])

  useEffect(() => {
    const g = window.google?.maps
    if (!ready || !g || !map.current) return
    if (fitTo && fitTo.length > 1) {
      const b = new g.LatLngBounds()
      fitTo.forEach(([lat, lng]) => b.extend({ lat, lng }))
      map.current.fitBounds(b, 40)
    } else if (focus) {
      map.current.panTo({ lat: focus[0], lng: focus[1] })
      if (map.current.getZoom() < 15) map.current.setZoom(15)
    }
  }, [ready, focus, fitTo])

  return <div ref={el} className="map-wrap" role="region" aria-label={label} />
}
