import type {
  AssistantAnswer, CityInfo, CompareDims, CompareResult, HotspotResponse, Place, Pulse, Report, RouteResponse,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    let detail = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) detail = body.detail.map((d: { msg: string }) => d.msg).join('; ')
    } catch { /* non-JSON error */ }
    throw new Error(detail)
  }
  return res.json() as Promise<T>
}

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const api = {
  health: () => request<{ ai_enabled: boolean; model: string | null }>('/health'),
  city: () => request<CityInfo>('/city'),
  places: () => request<Place[]>('/places'),
  reports: () => request<Report[]>('/reports'),
  pulse: () => request<Pulse>('/pulse'),
  routes: (origin: [number, number], destination: [number, number], hour: number, lang = 'en') =>
    postJson<RouteResponse>('/routes', {
      origin: { lat: origin[0], lng: origin[1] },
      destination: { lat: destination[0], lng: destination[1] },
      hour,
      lang,
    }),
  compare: (placeIds: string[], weights: Record<CompareDims, number>) =>
    postJson<CompareResult[]>('/compare', { place_ids: placeIds, weights }),
  assistant: (query: string, location?: [number, number], history: { role: 'user' | 'assistant'; text: string }[] = [], lang = 'en') =>
    postJson<AssistantAnswer>('/assistant', {
      query,
      location: location ? { lat: location[0], lng: location[1] } : null,
      history: history.slice(-8),
      lang,
    }),
  submitReport: (form: FormData) => request<Report>('/reports', { method: 'POST', body: form }),
  vote: (reportId: string, vote: 'confirm' | 'dispute' | 'resolved', voterId: string) =>
    postJson<Report>(`/reports/${encodeURIComponent(reportId)}/vote`, { vote, voter_id: voterId }),
  hotspots: (hour?: number) => request<HotspotResponse>(`/insights/hotspots${hour == null ? '' : `?hour=${hour}`}`),
  config: () => request<{ google_maps_key: string | null }>('/config'),
}
