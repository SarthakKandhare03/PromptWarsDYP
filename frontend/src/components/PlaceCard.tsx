import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Star } from 'lucide-react'
import { placeUrl, streetViewUrl } from '../gmaps'
import type { Place } from '../types'
import { useApp } from '../state/AppState'
import { PlacePhoto } from './PlacePhoto'

export function PlaceCard({ place, onFocus }: { place: Place; onFocus?: (p: Place) => void }) {
  const { saved, toggleSaved, highlight, notify } = useApp()
  const isSaved = saved.includes(place.id)

  return (
    <article className={`place-card${highlight.includes(place.id) ? ' hl' : ''}`}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <h3>{place.name}</h3>
        <button
          className="btn sm ghost icon"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
          onClick={() => {
            toggleSaved(place.id)
            notify(isSaved ? `Removed ${place.name}` : `Saved ${place.name}`, 'success')
          }}
        >
          {isSaved ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}
        </button>
      </div>
      <PlacePhoto place={place} />
      <p className="muted small">{place.summary}</p>
      <div className="place-meta">
        <span className="pill" aria-label={`Price level ${place.price_level} of 4`}>{'₹'.repeat(place.price_level)}</span>
        {place.rating != null && (
          <span className="pill"><Star size={12} aria-hidden /> {place.rating} · {place.review_count?.toLocaleString()}</span>
        )}
        <span className="pill">{place.wheelchair === true ? 'Wheelchair access' : place.wheelchair === false ? 'Steps / no ramp' : 'Access unknown'}</span>
        <span>{place.area} · demo values</span>
      </div>
      <div className="place-actions" style={{ flexWrap: 'wrap' }}>
        {onFocus && (
          <button className="btn sm" onClick={() => onFocus(place)}>
            <MapPin size={14} aria-hidden /> Show on map
          </button>
        )}
        <a className="btn sm" href={placeUrl(place.name, place.lat, place.lng)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} aria-hidden /> Google Maps
        </a>
        <a className="btn sm ghost" href={streetViewUrl(place.lat, place.lng)} target="_blank" rel="noopener noreferrer">Street View</a>
      </div>
    </article>
  )
}
