export type PlaceCategory = 'heritage' | 'food' | 'cafe' | 'attraction' | 'hotel'

export interface Place {
  id: string
  name: string
  category: PlaceCategory
  lat: number
  lng: number
  area: string
  summary: string
  price_level: number
  rating: number | null
  review_count: number | null
  wheelchair: boolean | null
  cleanliness: number | null
  tags: string[]
  demo: boolean
}

export type ReportCategory =
  | 'waterlogging' | 'pothole' | 'accident' | 'traffic' | 'streetlight' | 'accessibility' | 'other'

export interface Report {
  id: string
  category: ReportCategory
  description: string
  lat: number
  lng: number
  created_at: string
  source: 'community' | 'official'
  severity: number
  has_photo: boolean
  has_audio: boolean
  ai_summary: string | null
  ai_consistency: number | null
  trust_score: number
  trust_label: string
  trust_reasons: string[]
  demo: boolean
  age: string
  ai_used?: boolean
  language?: string | null
}

export interface RouteFactor {
  label: string
  impact: number
  kind: 'risk' | 'support' | 'missing'
}

export interface ScoredRoute {
  id: string
  geometry: [number, number][]
  distance_m: number
  duration_s: number
  safety_score: number | null
  confidence: 'low' | 'medium' | 'high'
  factors: RouteFactor[]
  is_fastest: boolean
  is_safest: boolean
}

export interface RouteResponse {
  routes: ScoredRoute[]
  explanation: string
  explanation_source: 'gemini' | 'rules'
  routing_source: 'osrm' | 'fallback'
  is_night: boolean
}

export interface Weather {
  available: boolean
  source: string
  temperature_c?: number
  humidity?: number
  wind_kmh?: number
  weather_code?: number
  recent_rain_mm: number | null
  next_6h_rain_mm?: number
  observed_at?: string
}

export interface Pulse {
  weather: Weather
  reports_24h: number
  trusted_24h: number
  by_category: Record<string, number>
  chaos_index: number
  latest_report_at: string | null
  demo_reports: number
  generated_at: string
}

export interface CityInfo {
  name: string
  center: [number, number]
  zoom: number
  accident_zones: { name: string; lat: number; lng: number }[]
  support_points: { name: string; kind: string; lat: number; lng: number }[]
  data_notice: string
}

export type CompareDims = 'affordability' | 'rating' | 'accessibility' | 'cleanliness' | 'safety'

export interface CompareResult {
  place: Place
  dimensions: Record<CompareDims, number | null>
  missing: CompareDims[]
  weighted_score: number | null
  bayesian_rating: number | null
  flags: string[]
  rank: number
}

export interface AssistantAnswer {
  answer: string
  sources: { title: string; uri: string }[]
  place_ids: string[]
  report_ids: string[]
  engine: 'gemini+maps' | 'rules'
  answered_at: string
}
