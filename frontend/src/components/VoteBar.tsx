import { useState } from 'react'
import { CheckCircle2, CircleSlash, ThumbsDown } from 'lucide-react'
import { api } from '../api'
import { deviceId } from '../identity'
import { useApp } from '../state/AppState'
import type { Report } from '../types'

const VOTES = [
  { id: 'confirm', label: 'Still there', Icon: CheckCircle2 },
  { id: 'dispute', label: 'Not there', Icon: ThumbsDown },
  { id: 'resolved', label: 'Resolved', Icon: CircleSlash },
] as const

/** Community verification: every vote re-scores trust and retrains the hotspot model server-side. */
export function VoteBar({ report }: { report: Report }) {
  const { replaceReport, notify } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  if (report.source === 'official') return null

  async function cast(vote: (typeof VOTES)[number]['id']) {
    setBusy(vote)
    try {
      const updated = await api.vote(report.id, vote, deviceId())
      replaceReport(updated)
      notify(
        updated.status === 'resolved' ? 'Marked resolved by the community' : `Thanks! Trust is now ${updated.trust_score}/100`,
        'success',
      )
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Vote failed', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="row" style={{ gap: 6, marginTop: 8 }} role="group" aria-label="Verify this report">
      <span className="tiny muted">Are you nearby?</span>
      {VOTES.map(({ id, label, Icon }) => (
        <button key={id} type="button" className="btn sm" disabled={busy !== null}
          onClick={(e) => { e.stopPropagation(); void cast(id) }}>
          <Icon size={13} aria-hidden /> {label}
          {id === 'confirm' && report.confirmations > 0 && ` · ${report.confirmations}`}
          {id === 'dispute' && report.disputes > 0 && ` · ${report.disputes}`}
        </button>
      ))}
    </div>
  )
}
