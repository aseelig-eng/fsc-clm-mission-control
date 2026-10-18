import { useEffect, useState } from 'react'
import type { AccountOpeningResult, CheckStatus } from '../data/accountOpening'

// Live view of the Account Opening Agent: the pre-submission checks tick
// through one by one, then the submit + account numbers land. The record is
// only written when the run finishes (onComplete), so what the advisor watches
// is what gets saved.

const STEP_MS = 850

const MARK: Record<CheckStatus, string> = { pass: '✓', fixed: '✎', warn: '!', fail: '✕' }
const TAG: Record<CheckStatus, string> = { pass: 'In good order', fixed: 'Agent filled', warn: 'Carried forward', fail: 'Blocks submit' }

export function AccountOpeningRun({
  householdName,
  result,
  onComplete,
  onClose,
  onOpenRecord,
}: {
  householdName: string
  result: AccountOpeningResult
  onComplete: () => void
  onClose: () => void
  onOpenRecord: () => void
}) {
  // Steps: each check, then (if in good order) submit, then accounts issued.
  const total = result.checks.length + (result.submitted ? 2 : 0)
  const [shown, setShown] = useState(0)
  const done = shown >= total

  useEffect(() => {
    if (done) return
    const timer = window.setTimeout(() => setShown((n) => n + 1), STEP_MS)
    return () => window.clearTimeout(timer)
  }, [shown, done])

  useEffect(() => {
    if (done) onComplete()
    // onComplete fires once, when the run lands
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done])

  const checksShown = result.checks.slice(0, shown)
  const submitShown = result.submitted && shown > result.checks.length
  const issuedShown = result.submitted && shown > result.checks.length + 1

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card ao-run" role="dialog" aria-modal="true" aria-labelledby="ao-run-title">
        <div className="modal-header">
          <div>
            <div className="muted">Agent run · Account Opening Agent</div>
            <h2 id="ao-run-title">Opening accounts for {householdName}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose} disabled={!done}>
            Close
          </button>
        </div>

        <div className="modal-actions-title">Pre-submission check · catch NIGO before the custodian does</div>
        <ul className="ao-checks">
          {checksShown.map((check) => (
            <li key={check.id} className={`ao-check is-${check.status}`}>
              <span className="ao-mark" aria-hidden="true">{MARK[check.status]}</span>
              <span className="ao-body">
                <span className="ao-label">{check.label}</span>
                <span className="ao-detail">{check.detail}</span>
              </span>
              <span className="ao-tag">{TAG[check.status]}</span>
            </li>
          ))}
          {!done && <li className="ao-check is-running"><span className="ao-mark" aria-hidden="true">…</span><span className="ao-body"><span className="ao-label">Working</span></span></li>}
        </ul>

        {submitShown && (
          <div className="callout ao-callout">
            <strong>Submitted to {result.custodian}</strong>
            Sent {result.opened.length} account application{result.opened.length === 1 ? '' : 's'} by API in good order. No re-keying and no new forms: every value came from the onboarding record.
          </div>
        )}

        {issuedShown && (
          <div className="callout ao-callout ao-issued">
            <strong>Account opened · numbers issued</strong>
            <ul className="ao-accounts">
              {result.opened.map((o) => (
                <li key={o.mask}>
                  {result.custodian} · {o.registration} <b>···{o.mask}</b>
                </li>
              ))}
            </ul>
            {result.acatNumber && (
              <div className="ao-next">
                Handed to the Funding Agent: ACAT #{result.acatNumber} submitted to DTCC from {result.deliveringFirm}. {result.custodian} sent the account agreement to the owners for e-signature.
              </div>
            )}
          </div>
        )}

        {done && !result.submitted && (
          <div className="callout ao-callout ao-held">
            <strong>Held before submit</strong>
            {result.summary}
          </div>
        )}

        {done && (
          <div className="ao-actions">
            <button type="button" className="btn primary" onClick={onOpenRecord}>
              Open the record
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
