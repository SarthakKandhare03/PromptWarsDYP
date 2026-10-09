import { useState } from 'react'
import { CheckCircle2, CircleSlash, ThumbsDown } from 'lucide-react'
import { api } from '../api'
import { deviceId } from '../identity'
import { useApp } from '../state/AppState'
import { useI18n } from '../i18n'
import type { Report } from '../types'

const VOTES = [
  { id: 'confirm', key: 'vote.confirm', Icon: CheckCircle2 },
  { id: 'dispute', key: 'vote.dispute', Icon: ThumbsDown },
  { id: 'resolved', key: 'vote.resolved', Icon: CircleSlash },
] as const

/** Community verification: every vote re-scores trust and retrains the hotspot model server-side. */
export function VoteBar({ report }: { report: Report }) {
  const { replaceReport, notify } = useApp()
  const { t } = useI18n()
  const [busy, setBusy] = useState<string | null>(null)
  if (report.source === 'official') return null

  async function cast(vote: (typeof VOTES)[number]['id']) {
    setBusy(vote)
    try {
      const updated = await api.vote(report.id, vote, deviceId())
      replaceReport(updated)
      notify(updated.status === 'resolved' ? t('vote.closed') : t('vote.thanks', { n: updated.trust_score }), 'success')
    } catch (e) {
      notify(e instanceof Error ? e.message : t('vote.fail'), 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="row" style={{ gap: 6, marginTop: 8 }} role="group" aria-label={t('vote.aria')}>
      <span className="tiny muted">{t('vote.nearby')}</span>
      {VOTES.map(({ id, key, Icon }) => (
        <button key={id} type="button" className="btn sm" disabled={busy !== null}
          onClick={(e) => { e.stopPropagation(); void cast(id) }}>
          <Icon size={13} aria-hidden /> {t(key)}
          {id === 'confirm' && report.confirmations > 0 && ` · ${report.confirmations}`}
          {id === 'dispute' && report.disputes > 0 && ` · ${report.disputes}`}
        </button>
      ))}
    </div>
  )
}
