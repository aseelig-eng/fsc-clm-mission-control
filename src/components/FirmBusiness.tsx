import { useState } from 'react'
import { firmBusinessFor, type LineOfBusinessId } from '../data/firmBusiness'

type Props = {
  householdId: string
  householdName: string
}

// Compact glyphs per line of business, keyed so each tile reads at a glance.
const LOB_GLYPH: Record<LineOfBusinessId, string> = {
  banking: '🏦',
  insurance: '🛡',
  asset_mgmt: '📈',
  lending: '💳',
  trust: '⚖',
}

// One-line headline shown on an engaged tile — the first detail value, or the
// relationship owner if there is no dollar figure.
function headline(relationshipOwner: string | undefined, details: { value: string }[]): string {
  return details[0]?.value ?? relationshipOwner ?? 'Engaged'
}

export function FirmBusiness({ householdId, householdName }: Props) {
  const [openLine, setOpenLine] = useState<LineOfBusinessId | null>(null)

  const profile = firmBusinessFor(householdId)
  const lines = profile.lines
  const active = openLine ? lines.find((l) => l.id === openLine) ?? null : null
  const engagedCount = lines.filter((l) => l.hasBusiness).length

  return (
    <div className="firm-map">
      <div className="firm-map-head">
        <span className="firm-map-kicker">Across the firm</span>
        <span className="firm-map-count">
          <strong>{engagedCount}</strong> of {lines.length} lines engaged
        </span>
      </div>

      <div className="firm-map-grid" role="list">
        {lines.map((lob) => {
          const clickable = lob.hasBusiness
          const isOpen = openLine === lob.id
          return (
            <button
              key={lob.id}
              type="button"
              role="listitem"
              className={`firm-tile ${lob.hasBusiness ? 'has' : 'none'} ${isOpen ? 'open' : ''}`}
              aria-pressed={isOpen}
              disabled={!clickable}
              title={
                lob.hasBusiness
                  ? `View ${lob.label} relationship`
                  : `${lob.label} — no business on file`
              }
              onClick={() => clickable && setOpenLine(isOpen ? null : lob.id)}
            >
              <span className="firm-tile-glyph" aria-hidden>
                {LOB_GLYPH[lob.id]}
              </span>
              <span className="firm-tile-label">{lob.label}</span>
              <span className="firm-tile-state">
                {lob.hasBusiness ? headline(lob.relationshipOwner, lob.details) : 'No business'}
              </span>
            </button>
          )
        })}
      </div>

      {active && active.hasBusiness && (
        <div className="firm-detail">
          <div className="firm-detail-head">
            <span className="firm-detail-glyph" aria-hidden>
              {LOB_GLYPH[active.id]}
            </span>
            <div>
              <strong>{active.label}</strong>
              {active.relationshipOwner && <span className="muted"> · {active.relationshipOwner}</span>}
            </div>
            <button type="button" className="firm-detail-close" onClick={() => setOpenLine(null)}>
              Close
            </button>
          </div>
          <ul className="firm-detail-list">
            {active.details.map((row, index) => (
              <li key={`${active.id}-${index}`}>
                <span className="firm-detail-label">{row.label}</span>
                <span className="firm-detail-value">{row.value}</span>
                <span className="muted firm-detail-owner">{row.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <span className="sr-only">{householdName} business across the firm</span>
    </div>
  )
}
