import { useMemo, useState } from 'react'
import {
  meetingAI,
  meetingAgenticActions,
  type Meeting,
  type MeetingAgenticAction,
  type NotetakerStatus,
} from '../data/meetings'

type Tab = 'brief' | 'agent' | 'notes' | 'actions' | 'followup' | 'ask'

const AGENTIC_STATE_TONE: Record<MeetingAgenticAction['state'], string> = {
  ready: 'done',
  suggested: 'needs',
  blocked: 'critical',
}

const AGENTIC_STATE_LABEL: Record<MeetingAgenticAction['state'], string> = {
  ready: 'Agent ready',
  suggested: 'One click',
  blocked: 'Blocked',
}

const NOTETAKER_LABEL: Record<NotetakerStatus, string> = {
  armed: 'Notetaker armed',
  recording: 'Recording',
  processing: 'Processing',
  ready: 'Notes ready',
  off: 'Notetaker off',
}

const NOTETAKER_TONE: Record<NotetakerStatus, string> = {
  armed: 'needs',
  recording: 'critical',
  processing: 'medium',
  ready: 'done',
  off: 'medium',
}

export function MeetingWorkspace({
  meeting,
  crmConnected,
  onClose,
  onFlash,
  onSyncActions,
}: {
  meeting: Meeting
  crmConnected: boolean
  onClose: () => void
  onFlash: (msg: string) => void
  /** Push the meeting's action items into the work queue as tasks */
  onSyncActions: (meeting: Meeting) => void
}) {
  const ai = useMemo(() => meetingAI(meeting), [meeting])
  const agenticActions = useMemo(() => meetingAgenticActions(meeting), [meeting])
  const completed = meeting.status === 'completed'
  const [tab, setTab] = useState<Tab>(completed ? 'notes' : 'agent')
  const [notetaker, setNotetaker] = useState<NotetakerStatus>(ai.notetaker)
  const [synced, setSynced] = useState(!!ai.syncedToCrm)
  const [askLog, setAskLog] = useState<{ q: string; a: string }[]>([])
  const [doneActions, setDoneActions] = useState<Set<string>>(new Set())

  const phaseLabel = completed ? 'Post-meeting' : 'Pre-meeting'

  function runAgenticAction(action: MeetingAgenticAction) {
    if (action.state === 'blocked') {
      onFlash('This meeting is held — the agent step is blocked until it clears.')
      return
    }
    setDoneActions((prev) => new Set(prev).add(action.id))
    // The "open next steps as tasks" action reuses the existing task sync.
    if (action.id.endsWith('-post-tasks')) onSyncActions(meeting)
    else onFlash(action.done)
    if (action.id.endsWith('-pre-notetaker')) setNotetaker('armed')
  }

  function askAI(question: string) {
    const answer = completed
      ? `Based on the transcript: ${ai.takeaways?.[0] ?? ai.summary ?? 'the meeting is captured and summarized above.'}`
      : `From the file: ${(ai.takeaways ?? [])[0] ?? 'review the pre-meeting brief before the call.'}`
    setAskLog((prev) => [...prev, { q: question, a: answer }])
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'brief', label: 'Prep brief' },
    { id: 'agent', label: `${phaseLabel} actions · ${agenticActions.length}` },
    { id: 'notes', label: 'AI notes' },
    { id: 'actions', label: `Action items · ${meeting.actions.length}` },
    { id: 'followup', label: 'Follow-up' },
    { id: 'ask', label: 'Ask AI' },
  ]

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="meeting-workspace"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-ws-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="meeting-ws-head">
          <div>
            <div className="portal-kicker">{meeting.playbookName ?? 'Meeting'}</div>
            <h3 id="meeting-ws-title">{meeting.title}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {meeting.when.replace('T', ' · ')} · {meeting.channel.replace('_', ' ')} · {meeting.attendees.join(', ')}
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="meeting-ws-status">
          <span className={`badge ${NOTETAKER_TONE[notetaker]}`}>{NOTETAKER_LABEL[notetaker]}</span>
          {ai.source && <span className="muted">via {ai.source}</span>}
          {ai.recorded && <span className="muted">Recorded</span>}
          {ai.transcriptMinutes ? <span className="muted">{ai.transcriptMinutes} min transcript</span> : null}
          {!completed && (
            <button
              type="button"
              className="btn primary meeting-ws-arm"
              onClick={() => {
                const next: NotetakerStatus = notetaker === 'off' || notetaker === 'armed' ? 'recording' : 'armed'
                setNotetaker(next)
                onFlash(next === 'recording' ? `Notetaker joining via ${ai.source}.` : 'Notetaker armed for this meeting.')
              }}
            >
              {notetaker === 'recording' ? 'Stop notetaker' : notetaker === 'off' ? 'Arm notetaker' : 'Start recording'}
            </button>
          )}
        </div>

        <div className="meeting-ws-tabs" role="tablist" aria-label="Meeting sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="meeting-ws-body">
          {tab === 'brief' && (
            <>
              <h4>Auto-generated meeting brief</h4>
              <ul className="brief-lines">
                {(meeting.preBrief ?? meeting.agenda.map((a) => `Plan to cover: ${a}`)).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <h4>Agenda</h4>
              <ul className="brief-lines">
                {meeting.agenda.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {tab === 'agent' && (
            <>
              <h4>{phaseLabel} agentic actions</h4>
              <p className="muted" style={{ marginTop: 0 }}>
                {completed
                  ? 'The meeting is captured. These are the one-click moves to publish and follow up.'
                  : 'The Concierge prepped these before the call. Review what the agent did, then approve.'}
              </p>
              <ul className="meeting-agentic-list">
                {agenticActions.map((action) => {
                  const done = doneActions.has(action.id)
                  return (
                    <li key={action.id} className={`meeting-agentic-item ${done ? 'is-done' : ''}`}>
                      <div className="meeting-agentic-head">
                        <span className={`badge ${done ? 'done' : AGENTIC_STATE_TONE[action.state]}`}>
                          {done ? 'Done ✓' : AGENTIC_STATE_LABEL[action.state]}
                        </span>
                        <strong>{action.label}</strong>
                      </div>
                      <div className="muted">{action.detail}</div>
                      <button
                        type="button"
                        className={`btn ${action.state === 'blocked' ? '' : 'primary'} meeting-agentic-btn`}
                        disabled={done || action.state === 'blocked'}
                        onClick={() => runAgenticAction(action)}
                      >
                        {done
                          ? 'Completed'
                          : action.state === 'blocked'
                            ? 'Blocked'
                            : action.state === 'ready'
                              ? 'Review & approve'
                              : 'Run action'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          {tab === 'notes' && (
            <>
              <h4>AI summary</h4>
              <p className="meeting-ws-summary">{ai.summary}</p>
              {ai.takeaways && ai.takeaways.length > 0 && (
                <>
                  <h4>Key takeaways</h4>
                  <ul className="brief-lines">
                    {ai.takeaways.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
              {ai.transcript && ai.transcript.length > 0 && (
                <>
                  <h4>Transcript · speaker-attributed</h4>
                  <ul className="transcript-list">
                    {ai.transcript.map((line, i) => (
                      <li key={i}>
                        <span className="transcript-meta">
                          <strong>{line.speaker}</strong> · {line.at}
                        </span>
                        <span className="transcript-text">{line.text}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {meeting.decisions && meeting.decisions.length > 0 && (
                <>
                  <h4>Decisions</h4>
                  <ul className="brief-lines">
                    {meeting.decisions.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </>
              )}
              {completed && (
                <button
                  type="button"
                  className={`btn ${synced ? '' : 'primary'} meeting-ws-sync`}
                  disabled={synced || !crmConnected}
                  onClick={() => {
                    setSynced(true)
                    onFlash('Summary + notes synced to the Salesforce Interaction Summary.')
                  }}
                >
                  {synced ? 'Synced to CRM ✓' : crmConnected ? 'Sync notes to CRM' : 'Connect a CRM to sync'}
                </button>
              )}
            </>
          )}

          {tab === 'actions' && (
            <>
              <h4>Action items {completed ? 'extracted from the call' : 'from this meeting'}</h4>
              {meeting.actions.length === 0 && <p className="muted">No action items yet.</p>}
              <ul className="brief-lines">
                {meeting.actions.map((action) => (
                  <li key={action.id}>
                    <span className={`badge ${action.status === 'done' ? 'done' : action.status === 'blocked' ? 'critical' : 'needs'}`}>
                      {action.status}
                    </span>{' '}
                    <strong>{action.title}</strong> · {action.owner} · due {action.due}
                    <div className="muted">{action.recommendedReview}</div>
                  </li>
                ))}
              </ul>
              {meeting.actions.length > 0 && (
                <button
                  type="button"
                  className="btn primary meeting-ws-sync"
                  onClick={() => {
                    onSyncActions(meeting)
                    onFlash(`Pushed ${meeting.actions.length} action item${meeting.actions.length === 1 ? '' : 's'} to the work queue.`)
                  }}
                >
                  Create tasks in the work queue
                </button>
              )}
            </>
          )}

          {tab === 'followup' && (
            <>
              <h4>Follow-up email · AI draft</h4>
              {ai.followupEmail ? (
                <div className="followup-card">
                  <div className="followup-subject">
                    <span className="muted">Subject</span> {ai.followupEmail.subject}
                  </div>
                  <pre className="followup-body">{ai.followupEmail.body}</pre>
                  <div className="actions">
                    <button type="button" className="btn success" onClick={() => onFlash('Follow-up email sent and logged to the client timeline.')}>
                      Approve &amp; send
                    </button>
                    <button type="button" className="btn" onClick={() => onFlash('Opened the follow-up draft for editing.')}>
                      Edit draft
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">A follow-up email drafts automatically once the meeting is captured.</p>
              )}
            </>
          )}

          {tab === 'ask' && (
            <>
              <h4>Ask about this meeting</h4>
              <div className="ask-suggestions">
                {(ai.askSuggestions ?? []).map((s) => (
                  <button key={s} type="button" className="integration-chip" onClick={() => askAI(s)}>
                    {s}
                  </button>
                ))}
              </div>
              <ul className="ask-log">
                {askLog.map((entry, i) => (
                  <li key={i}>
                    <div className="ask-q">{entry.q}</div>
                    <div className="ask-a">{entry.a}</div>
                  </li>
                ))}
                {askLog.length === 0 && <li className="muted">Pick a prompt to query the meeting.</li>}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
