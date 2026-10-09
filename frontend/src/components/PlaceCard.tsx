import { Bookmark, BookmarkCheck, Building2, Coffee, Landmark, MapPin, Mountain, Star, UtensilsCrossed } from 'lucide-react'
import type { Place, PlaceCategory } from '../types'
import { useApp } from '../state/AppState'

export const CATEGORY_ICON: Record<PlaceCategory, typeof Landmark> = {
  heritage: Landmark, food: UtensilsCrossed, cafe: Coffee, attraction: Mountain, hotel: Building2,
}

export function PlaceCard({ place, onFocus }: { place: Place; onFocus?: (p: Place) => void }) {
  const { saved, toggleSaved, highlight, notify } = useApp()
  const Icon = CATEGORY_ICON[place.category]
  const isSaved = saved.includes(place.id)

  return (
    <article className={`place-card${highlight.includes(place.id) ? ' hl' : ''}`}>
      <div className={`place-art art-${place.category}`} aria-hidden>
        <Icon />
      </div>
      <div className="eyebrow lav">{place.category} · {place.area}</div>
      <h3>{place.name}</h3>
      <p className="muted small">{place.summary}</p>
      <div className="place-meta">
        <span aria-label={`Price level ${place.price_level} of 4`}>{'₹'.repeat(place.price_level)}</span>
        {place.rating != null && (
          <span><Star size={12} aria-hidden /> {place.rating} ({place.review_count?.toLocaleString()})</span>
        )}
        {place.wheelchair === true && <span>Wheelchair access</span>}
        {place.wheelchair == null && <span>Access: unknown</span>}
        <span className="badge demo">demo values</span>
      </div>
      <div className="place-actions">
        {onFocus && (
          <button className="btn sm" onClick={() => onFocus(place)}>
            <MapPin size={14} aria-hidden /> Show on map
          </button>
        )}
        <button
          className="btn sm ghost"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          onClick={() => {
            toggleSaved(place.id)
            notify(isSaved ? `Removed ${place.name}` : `Saved ${place.name}`, 'success')
          }}
        >
          {isSaved ? <BookmarkCheck size={16} color="var(--lime)" aria-hidden /> : <Bookmark size={16} aria-hidden />}
        </button>
      </div>
    </article>
  )
}
