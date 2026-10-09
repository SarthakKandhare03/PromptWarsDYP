import { Bookmark, BookmarkCheck, ExternalLink, MapPin, Star } from 'lucide-react'
import { placeUrl, streetViewUrl } from '../gmaps'
import type { Place } from '../types'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import { PlacePhoto } from './PlacePhoto'

export function PlaceCard({ place, onFocus }: { place: Place; onFocus?: (p: Place) => void }) {
  const { saved, toggleSaved, highlight, notify } = useApp()
  const { t } = useI18n()
  const isSaved = saved.includes(place.id)
  const access = place.wheelchair === true ? 'pc.wheelYes' : place.wheelchair === false ? 'pc.wheelNo' : 'pc.wheelUnknown'

  return (
    <article className={`place-card${highlight.includes(place.id) ? ' hl' : ''}`}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <h3>{place.name}</h3>
        <button
          className="btn sm ghost icon"
          aria-pressed={isSaved}
          aria-label={t(isSaved ? 'pc.unsave' : 'pc.save', { name: place.name })}
          onClick={() => {
            toggleSaved(place.id)
            notify(t(isSaved ? 'pc.removed' : 'pc.saved', { name: place.name }), 'success')
          }}
        >
          {isSaved ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}
        </button>
      </div>
      <PlacePhoto place={place} />
      <p className="muted small">{place.summary}</p>
      <div className="place-meta">
        <span className="pill" aria-label={t('pc.price', { n: place.price_level })}>{'₹'.repeat(place.price_level)}</span>
        {place.rating != null && (
          <span className="pill"><Star size={12} aria-hidden /> {place.rating} · {place.review_count?.toLocaleString()}</span>
        )}
        <span className="pill">{t(access)}</span>
        <span>{place.area} · {t('common.demoValues')}</span>
      </div>
      <div className="place-actions" style={{ flexWrap: 'wrap' }}>
        {onFocus && (
          <button className="btn sm" onClick={() => onFocus(place)}>
            <MapPin size={14} aria-hidden /> {t('pc.showMap')}
          </button>
        )}
        <a className="btn sm" href={placeUrl(place.name, place.lat, place.lng)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} aria-hidden /> {t('gm.open')}
        </a>
        <a className="btn sm ghost" href={streetViewUrl(place.lat, place.lng)} target="_blank" rel="noopener noreferrer">{t('gm.street')}</a>
      </div>
    </article>
  )
}
