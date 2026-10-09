/** Official Google Maps URLs (no API key needed). https://developers.google.com/maps/documentation/urls */

const ll = ([lat, lng]: [number, number]) => `${lat.toFixed(6)},${lng.toFixed(6)}`

export function placeUrl(name: string, lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, Pune`)}&center=${lat},${lng}`
}

export function streetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
}

/**
 * Directions that follow OUR chosen route: a few evenly spaced waypoints from the
 * route geometry pin Google's routing to the safer path instead of its own fastest.
 */
export function directionsUrl(geometry: [number, number][], waypoints = 4): string {
  const origin = geometry[0]
  const destination = geometry[geometry.length - 1]
  const inner = geometry.slice(1, -1)
  const picks: [number, number][] = []
  for (let i = 1; i <= waypoints && inner.length; i++) {
    picks.push(inner[Math.floor((i * inner.length) / (waypoints + 1))])
  }
  const params = new URLSearchParams({ api: '1', origin: ll(origin), destination: ll(destination), travelmode: 'driving' })
  if (picks.length) params.set('waypoints', picks.map(ll).join('|'))
  return `https://www.google.com/maps/dir/?${params.toString()}`
}
