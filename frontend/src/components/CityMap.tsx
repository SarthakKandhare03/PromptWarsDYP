import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Hotspot, Place, PlaceCategory, Report, ScoredRoute, TrailStop } from '../types'
import { useApp } from '../state/AppState'
import { TrustBadge } from './TrustBadge'
import { GoogleCityMap } from './GoogleCityMap'
import { streetViewUrl } from '../gmaps'

const SVG = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`

// Minimal glyphs (no runtime renderer needed): temple, fork-knife, cup, peak, bed.
const ICONS: Record<PlaceCategory, string> = {
  heritage: SVG('<path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M2 10l10-7 10 7"/>'),
  food: SVG('<path d="M7 2v20M4 2v6a3 3 0 0 0 6 0V2M17 2c-2 2-3 5-3 8h6c0-3-1-6-3-8zM17 10v12"/>'),
  cafe: SVG('<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8zM17 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3"/>'),
  attraction: SVG('<path d="M3 20l6-11 4 6 3-4 5 9z"/>'),
  hotel: SVG('<path d="M3 20V6M3 14h18v6M7 10h4v4M21 14v-2a3 3 0 0 0-3-3h-7"/>'),
}

const iconCache = new Map<string, L.DivIcon>()

function placeIcon(cat: PlaceCategory, highlighted: boolean): L.DivIcon {
  const key = `${cat}-${highlighted}`
  const hit = iconCache.get(key)
  if (hit) return hit
  const html = `<div class="mk ${cat}${highlighted ? ' hl' : ''}"><span>${ICONS[cat]}</span></div>`
  const icon = L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -26] })
  iconCache.set(key, icon)
  return icon
}

function reportIcon(r: Report): L.DivIcon {
  const fresh = Date.now() - new Date(r.created_at).getTime() < 6 * 3600_000
  const cls = ['incident', r.source === 'official' ? 'official' : '', r.severity >= 3 ? 'sev3' : '', fresh ? 'fresh' : ''].join(' ')
  return L.divIcon({ html: `<div class="${cls}"><div class="core"></div></div>`, className: '', iconSize: [22, 22], iconAnchor: [11, 11] })
}

const zoneIcon = L.divIcon({ html: '<div class="zone-dot"></div>', className: '', iconSize: [14, 14], iconAnchor: [7, 7] })
const pickIcon = L.divIcon({ html: '<div class="pick-dot"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] })

export interface CityMapProps {
  places?: Place[]
  reports?: Report[]
  routes?: ScoredRoute[]
  selectedRouteId?: string | null
  onRouteSelect?: (id: string) => void
  showZones?: boolean
  picked?: [number, number] | null
  onPick?: (latlng: [number, number]) => void
  focus?: [number, number] | null
  fitTo?: [number, number][] | null
  label?: string
  onPlaceSelect?: (p: Place) => void
  hotspots?: Hotspot[]
  trail?: TrailStop[]
}

function ClickPicker({ onPick }: { onPick: (latlng: [number, number]) => void }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

function Focus({ focus, fitTo }: { focus?: [number, number] | null; fitTo?: [number, number][] | null }) {
  const map = useMap()
  useEffect(() => {
    if (fitTo && fitTo.length > 1) map.fitBounds(L.latLngBounds(fitTo), { padding: [40, 40] })
    else if (focus) map.flyTo(focus, Math.max(map.getZoom(), 15), { duration: 0.8 })
  }, [map, focus, fitTo])
  return null
}

/** Map switcher: Google Maps JS when a Maps key is configured, otherwise OpenStreetMap/Leaflet. */
export function CityMap(props: CityMapProps) {
  const { mapsKey, mapEngine, setMapEngine } = useApp()
  const google = Boolean(mapsKey) && mapEngine === 'google'
  return (
    <>
      {google ? <GoogleCityMap {...props} /> : <LeafletCityMap {...props} />}
      {mapsKey && (
        <div className="seg engine-toggle" role="group" aria-label="Map engine">
          <button aria-pressed={google} onClick={() => setMapEngine('google')}>Google</button>
          <button aria-pressed={!google} onClick={() => setMapEngine('osm')}>OSM</button>
        </div>
      )}
    </>
  )
}

function LeafletCityMap({
  places = [], reports = [], routes = [], selectedRouteId, onRouteSelect, showZones = false, hotspots = [], trail = [],
  picked, onPick, focus, fitTo, label = 'Interactive map of Pune', onPlaceSelect,
}: CityMapProps) {
  const { city, highlight } = useApp()
  const center = city?.center ?? [18.5204, 73.8567]
  const ordered = useMemo(
    () => [...routes].sort((a, b) => Number(a.id === selectedRouteId) - Number(b.id === selectedRouteId)),
    [routes, selectedRouteId],
  )

  return (
    <div className="map-wrap" role="region" aria-label={label}>
      <MapContainer center={center} zoom={city?.zoom ?? 13} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {onPick && <ClickPicker onPick={onPick} />}
        <Focus focus={focus} fitTo={fitTo} />

        {ordered.map((r) => {
          const selected = r.id === selectedRouteId
          return (
            <Polyline
              key={`${r.id}-${selected}`}
              positions={r.geometry}
              pathOptions={{
                color: selected ? (r.is_safest ? '#1F9D4A' : '#111111') : '#8A8F98',
                weight: selected ? 6 : 5,
                opacity: selected ? 0.95 : 0.5,
                className: selected ? 'route-line' : undefined,
              }}
              eventHandlers={{ click: () => onRouteSelect?.(r.id) }}
            />
          )
        })}

        {trail.length > 1 && (
          <Polyline positions={trail.map((s) => [s.lat, s.lng] as [number, number])}
            pathOptions={{ color: '#FF7A00', weight: 5, opacity: 0.9, dashArray: '2 10', lineCap: 'round', className: 'route-line' }} />
        )}
        {trail.map((s) => (
          <Marker key={s.order} position={[s.lat, s.lng]} title={s.name}
            icon={L.divIcon({ html: `<div class="trail-dot">${s.order}</div>`, className: '', iconSize: [30, 30], iconAnchor: [15, 15] })}>
            <Popup>
              <div className="popup-title" lang="mr">{s.name_mr}</div>
              <div className="muted">{s.name}{s.order <= 5 ? ` · मानाचा गणपती #${s.order}` : ''}</div>
            </Popup>
          </Marker>
        ))}

        {hotspots.map((h) => (
          <Circle
            key={`${h.lat}-${h.lng}-${h.band}`}
            center={[h.lat, h.lng]}
            radius={220 + h.weight * 60}
            pathOptions={{ color: '#D23A3A', weight: 1, opacity: 0.5, fillColor: '#D23A3A', fillOpacity: 0.12 }}
          >
            <Tooltip>{`Learned hotspot · recurring ${h.top_category} in the ${h.band} · ${h.reports} past reports`}</Tooltip>
          </Circle>
        ))}

        {showZones && city?.accident_zones.map((z) => (
          <Marker key={z.name} position={[z.lat, z.lng]} icon={zoneIcon} keyboard={false}>
            <Popup>
              <div className="popup-title">{z.name}</div>
              <div className="muted">Approximate point on a publicly reported accident-prone corridor. Not an official list.</div>
            </Popup>
          </Marker>
        ))}

        {places.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={placeIcon(p.category, highlight.includes(p.id))}
            title={p.name}
            eventHandlers={{ click: () => onPlaceSelect?.(p) }}
          >
            <Popup>
              <div className="eyebrow lav">{p.category} · {p.area}</div>
              <div className="popup-title">{p.name}</div>
              <div className="muted">{p.summary}</div>
              <div style={{ marginTop: 6 }} className="tiny muted">
                {'₹'.repeat(p.price_level)} · {p.rating ?? 'n/a'}★ ({p.review_count?.toLocaleString() ?? 0}) · demo values
              </div>
            </Popup>
          </Marker>
        ))}

        {reports.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={reportIcon(r)} title={`${r.category} report`}>
            <Popup>
              <div className="row between" style={{ gap: 8 }}>
                <span className="eyebrow" style={{ color: r.severity >= 3 ? 'var(--red)' : 'var(--amber)' }}>{r.category}</span>
                <TrustBadge label={r.trust_label} />
              </div>
              <div className="popup-title" style={{ marginTop: 6 }}>{r.ai_summary ?? r.description}</div>
              <div className="tiny muted">
                {r.age} · {r.source} source · trust {r.trust_score}/100
                {r.has_photo ? ' · photo' : ''}{r.has_audio ? ' · voice' : ''}{r.demo ? ' · demo record' : ''}
              </div>
              <ul style={{ margin: '8px 0 0', paddingLeft: 16 }} className="tiny muted">
                {r.trust_reasons.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <a className="tiny" href={streetViewUrl(r.lat, r.lng)} target="_blank" rel="noopener noreferrer">Check in Street View ↗</a>
            </Popup>
          </Marker>
        ))}

        {picked && <Marker position={picked} icon={pickIcon} />}
      </MapContainer>
    </div>
  )
}
