import { useMemo } from 'react'
import {
  meetingAgenticActions,
  type Meeting,
  type MeetingActionItem,
} from '../data/meetings'
import type { ServiceCase } from '../data/serviceDesk'

/** A single open signal/exception distilled for the brief. */
export interface PrepSignal {
  id: string
  title: string
  priority: string
  recommended: string
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const OWNER_LABEL: Record<MeetingActionItem['owner'], string> = {
  advisor: 'You',
  paraplanner: 'Paraplanner',
  cra: 'Operations',
  client: 'Client',
  compliance: 'Compliance',
  specialist: 'Specialist',
}

/**
 * The pre-meeting prep brief popup. The Concierge assembled this from the
 * household file: what to open the call with, the open cases / signals / action
 * items that are still live, and what is still missing before the meeting.
 */
export function MeetingPrepBrief({
  meeting,
  householdName,
  openCases,
  openSignals,
  openActions,
  onClose,
  onFlash,
  onOpenWorkspace,
}: {
  meeting: Meeting
  householdName: string
  /** Open service cases for this household */
  openCases: ServiceCase[]
  /** Open exceptions / signals for this household */
  openSignals: PrepSignal[]
  /** Open action items pulled from this household's meetings */
  openActions: MeetingActionItem[]
  onClose: () => void
  onFlash: (msg: string) => void
  onOpenWorkspace: () => void
}) {
  const preActions = useMemo(
    () => meetingAgenticActions(meeting).filter((a) => a.phase === 'pre'),
    [meeting],
  )
  const gated = meeting.prepBriefReady === false

  // Lines the agent wrote reading the file; fall back to the agenda if none.
  const briefLines = meeting.preBrief ?? meeting.agenda.map((a) => `Plan to cover: ${a}`)
  // Split the agenda into "talk about" vs. "still need / missing" buckets.
  const missingHint = /(missing|still need|what we (still )?need|not yet|awaiting|outstanding|blank|held away)/i
  const agendaMissing = meeting.agenda.filter((a) => missingHint.test(a))
  const talkingPoints = meeting.agenda.filter((a) => !missingHint.test(a))
  const briefMissing = briefLines.filter((l) => missingHint.test(l))

  const hasOpenStuff = openCases.length > 0 || openSignals.length > 0 || openActions.length > 0
  const missingCount = agendaMissing.length + briefMissing.length

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card prep-brief"
        role="dialog"
        aria-modal="true"
        aria-label={`Prep brief — ${meeting.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="prep-brief-eyebrow">Pre-meeting brief · {meeting.playbookName ?? 'Meeting Concierge'}</span>
            <h2>{meeting.title}</h2>
            <p className="prep-brief-sub">
              {whenLabel(meeting.when)} · {householdName} · {meeting.channel.replace('_', ' ')}
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        {gated ? (
          <div className="prep-brief-gate">
            <strong>Prep is on hold.</strong> This meeting is blocked, so the Concierge has not assembled the
            brief yet. It will build automatically once the gate clears.
          </div>
        ) : (
          <div className="prep-brief-summary">
            The agent read the household file and drafted this brief. Review the open items and talking points,
            then run the pre-meeting actions below.
          </div>
        )}

        <div className="prep-brief-body">
          {/* What the agent wants you to know */}
          <section className="prep-brief-section">
            <h3>What the agent found in the file</h3>
            <ul className="prep-brief-list">
              {briefLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          {/* Important things to talk about */}
          {talkingPoints.length > 0 && (
            <section className="prep-brief-section">
              <h3>Important things to talk about</h3>
              <ul className="prep-brief-list agenda">
                {talkingPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Open cases + signals + action items */}
          <section className="prep-brief-section">
            <h3>Open items to resolve</h3>
            {!hasOpenStuff && (
              <p className="prep-brief-empty">Nothing open for this household — clean going into the meeting.</p>
            )}
            {openCases.length > 0 && (
              <div className="prep-brief-group">
                <span className="prep-brief-group-label">Cases ({openCases.length})</span>
                <ul className="prep-brief-open">
                  {openCases.map((c) => (
                    <li key={c.id}>
                      <div className="prep-open-head">
                        <span className={`badge ${c.priority.toLowerCase()}`}>{c.priority}</span>
                        <strong>{c.subject}</strong>
                        <span className="prep-open-status">{c.status}</span>
                      </div>
                      {c.step && <p className="prep-open-detail">Agent: {c.step.result}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {openSignals.length > 0 && (
              <div className="prep-brief-group">
                <span className="prep-brief-group-label">Signals ({openSignals.length})</span>
                <ul className="prep-brief-open">
                  {openSignals.map((s) => (
                    <li key={s.id}>
                      <div className="prep-open-head">
                        <span className={`badge ${s.priority.toLowerCase()}`}>{s.priority}</span>
                        <strong>{s.title}</strong>
                      </div>
                      <p className="prep-open-detail">Recommended: {s.recommended}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {openActions.length > 0 && (
              <div className="prep-brief-group">
                <span className="prep-brief-group-label">Action items ({openActions.length})</span>
                <ul className="prep-brief-open">
                  {openActions.map((a) => (
                    <li key={a.id}>
                      <div className="prep-open-head">
                        <span className={`badge ${a.status === 'blocked' ? 'critical' : 'high'}`}>
                          {a.status === 'blocked' ? 'Blocked' : 'Open'}
                        </span>
                        <strong>{a.title}</strong>
                        <span className="prep-open-status">{OWNER_LABEL[a.owner]} · due {a.due}</span>
                      </div>
                      <p className="prep-open-detail">{a.recommendedReview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* What is still missing */}
          {missingCount > 0 && (
            <section className="prep-brief-section prep-brief-missing">
              <h3>Still missing before the meeting</h3>
              <ul className="prep-brief-list">
                {[...briefMissing, ...agendaMissing].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Pre-meeting agentic actions */}
          <section className="prep-brief-section">
            <h3>Pre-meeting actions</h3>
            <ul className="prep-brief-actions">
              {preActions.map((a) => (
                <li key={a.id} className={a.state === 'blocked' ? 'is-blocked' : ''}>
                  <div className="prep-action-copy">
                    <strong>{a.label}</strong>
                    <span>{a.detail}</span>
                  </div>
                  <button
                    type="button"
                    className={`btn sm ${a.state === 'ready' ? 'primary' : ''}`}
                    disabled={a.state === 'blocked'}
                    onClick={() => onFlash(a.done)}
                  >
                    {a.state === 'blocked' ? 'Gated' : a.state === 'ready' ? 'Review' : 'Run'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="prep-brief-footer">
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              onClose()
              onOpenWorkspace()
            }}
          >
            Open meeting workspace
          </button>
        </div>
      </div>
    </div>
  )
}
