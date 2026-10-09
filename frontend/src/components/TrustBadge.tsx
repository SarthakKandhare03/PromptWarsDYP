import { BadgeCheck, CircleDashed, ShieldCheck, ShieldHalf } from 'lucide-react'

const MAP: Record<string, { cls: string; Icon: typeof BadgeCheck }> = {
  Corroborated: { cls: 'corroborated', Icon: ShieldCheck },
  'Partially verified': { cls: 'partial', Icon: ShieldHalf },
  Official: { cls: 'official', Icon: BadgeCheck },
  Unverified: { cls: 'unverified', Icon: CircleDashed },
}

export function TrustBadge({ label }: { label: string }) {
  const { cls, Icon } = MAP[label] ?? MAP.Unverified
  return (
    <span className={`badge ${cls}`}>
      <Icon size={12} aria-hidden /> {label}
    </span>
  )
}
