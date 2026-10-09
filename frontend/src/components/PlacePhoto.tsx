import { useState } from 'react'
import { Building2, Coffee, Landmark, Mountain, UtensilsCrossed } from 'lucide-react'
import type { Place, PlaceCategory } from '../types'

const ICON: Record<PlaceCategory, typeof Landmark> = {
  heritage: Landmark, food: UtensilsCrossed, cafe: Coffee, attraction: Mountain, hotel: Building2,
}

/** Wikimedia photo with lazy loading; falls back to category art if missing or broken. */
export function PlacePhoto({ place, className = '' }: { place: Place; className?: string }) {
  const [broken, setBroken] = useState(false)
  if (!place.image || broken) {
    const Icon = ICON[place.category]
    return (
      <div className={`photo art art-${place.category} ${className}`} aria-hidden>
        <Icon />
      </div>
    )
  }
  return (
    <div className={`photo ${className}`}>
      <img
        src={place.image}
        alt={place.image_note ? `${place.image_note} (illustrative)` : `Photo of ${place.name}`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
      {place.image_note && <span className="tag">{place.image_note}</span>}
    </div>
  )
}
