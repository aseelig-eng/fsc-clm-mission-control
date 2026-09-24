import { useMemo, useState } from 'react'
import {
  competitors,
  exceptions,
  households,
  metrics,
  paraplannerQueue,
  personaValues,
} from './data/content'
import {
  PHASE_LABELS,
  onboardingByHousehold,
  recordCompleteness,
  type FormSection,
} from './data/onboardingFramework'
import {
  householdProgress,
  overallProgress,
  progressTone,
} from './data/progress'
import type { ExceptionItem, Household, Role } from './data/types'
import './App.css'

function statusLabel(s: string) {
  return s.replace('-', ' ')
}

function ProgressBar({
  pct,
  label,
  detail,
  size = 'md',
  tone,
}: {
  pct: number
  label: string
  detail?: string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'good' | 'warn' | 'blocked' | 'neutral'
}) {
  const resolvedTone = tone ?? progressTone(pct)
  return (
    <div className={`progress-block size-${size}`} role="group" aria-label={label}>
      <div className="progress-meta">
        <span className="progress-label">{label}</span>
        <span className="progress-pct">{pct}%</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`progress-fill tone-${resolvedTone}`} style={{ width: `${pct}%` }} />
      </div>
      {detail && <div className="progress-detail">{detail}</div>}
    </div>
  )
}

function fieldStatusClass(status: string) {
  if (status === 'complete') return 'done'
  if (status === 'blocked') return 'critical'
  if (status === 'missing') return 'needs'
  if (status === 'partial') return 'high'
  return 'medium'
}

function docStatusClass(status: string) {
  if (status === 'filed') return 'done'
  if (status === 'nigo') return 'critical'
  if (status === 'pending') return 'needs'
  return 'medium'
}

export default function App() {
  const [role, setRole] = useState<Role>('advisor')
  const [selectedHhId, setSelectedHhId] = useState(households[0].id)
  const [selectedExId, setSelectedExId] = useState(exceptions[0].id)
  const [selectedParaId, setSelectedParaId] = useState(paraplannerQueue[0].id)
  const [personaIdx, setPersonaIdx] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [openSectionId, setOpenSectionId] = useState<string | null>('funding')

  const household = useMemo(
    () => households.find((h) => h.id === selectedHhId) as Household,
    [selectedHhId],
  )

  const onboarding = onboardingByHousehold[household.id]
  const completeness = useMemo(
    () => (onboarding ? recordCompleteness(onboarding) : null),
    [onboarding],
  )

  const bookProgress = useMemo(() => overallProgress(households), [])
  const clientProgress = useMemo(() => householdProgress(household), [household])

  const openExceptions = exceptions.filter((e) => !resolved.has(e.id))
  const selectedEx = openExceptions.find((e) => e.id === selectedExId) ?? openExceptions[0]
  const selectedPara = paraplannerQueue.find((p) => p.id === selectedParaId) ?? paraplannerQueue[0]
  const persona = personaValues[personaIdx]
  const openSection: FormSection | undefined = onboarding?.sections.find((s) => s.id === openSectionId)

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  function approveException(ex: ExceptionItem) {
    setResolved((prev) => new Set(prev).add(ex.id))
    flash(`Agent continuing: ${ex.recommendedAction}`)
    const next = openExceptions.find((e) => e.id !== ex.id)
    if (next) setSelectedExId(next.id)
  }

  function focusException(ex: ExceptionItem) {
    setSelectedExId(ex.id)
    const match = households.find((h) => ex.household.includes(h.name.split(' ')[0]) || h.name.includes(ex.household.split(' ')[0]))
    if (match) setSelectedHhId(match.id)
  }

  return (
    <div className="app-shell">
      <header className="global-header">
        <div className="brand">
          <div className="brand-mark">SF</div>
          <span>FSC · Client Lifecycle Mission Control</span>
        </div>
        <nav className="header-tabs" aria-label="Role views">
          <button type="button" className={role === 'advisor' ? 'active' : ''} onClick={() => setRole('advisor')}>
            Advisor Cockpit
          </button>
          <button
            type="button"
            className={role === 'paraplanner' ? 'active' : ''}
            onClick={() => setRole('paraplanner')}
          >
            Paraplanner Workbench
          </button>
          <button type="button" className={role === 'value' ? 'active' : ''} onClick={() => setRole('value')}>
            Persona Value &amp; Comps
          </button>
        </nav>
        <div className="header-spacer" />
        <div className="header-meta">Agentforce · Prospect → Estate · US RIA</div>
      </header>

      {role !== 'value' && (
        <>
          <div className="progress-strip" aria-label="Lifecycle progress">
            <div className="panel progress-overall-panel">
              <div className="panel-body">
                <ProgressBar
                  size="lg"
                  pct={bookProgress.pct}
                  label="Overall book — lifecycle progress"
                  detail={`${bookProgress.stagesComplete}/${bookProgress.stagesTotal} stages complete · ${bookProgress.completeClients}/${bookProgress.totalClients} clients at 100%`}
                  tone={
                    households.some((h) => h.stages.some((s) => s.status === 'blocked'))
                      ? 'warn'
                      : progressTone(bookProgress.pct)
                  }
                />
              </div>
            </div>
          </div>
          <div className="metrics-strip" aria-label="Firm CLM metrics">
            {metrics.map((m) => (
              <div className="metric-card" key={m.label}>
                <div className="label">{m.label}</div>
                <div className="value">{m.value}</div>
                <div className={`delta ${m.tone === 'neutral' ? 'neutral' : ''}`}>{m.delta}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {role === 'advisor' && (
        <div className="app-body">
          <aside className="panel" style={{ overflow: 'auto' }}>
            <div className="panel-header">
              <span>Needs you — signal only</span>
              <span className="muted">{openExceptions.length} open</span>
            </div>
            <ul className="exception-list">
              {openExceptions.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    className={`exception-item ${selectedEx?.id === ex.id ? 'selected' : ''}`}
                    onClick={() => focusException(ex)}
                  >
                    <div className="title">
                      <span className={`badge ${ex.priority}`}>{ex.priority}</span>
                      {ex.title}
                    </div>
                    <div className="meta">
                      {ex.household} · Owner: {ex.owner}
                    </div>
                  </button>
                </li>
              ))}
              {openExceptions.length === 0 && (
                <li className="panel-body muted">All clear — agents are running. Time for clients.</li>
              )}
            </ul>
          </aside>

          <div className="main-col">
            <div className="household-bar">
              {households.map((h) => {
                const p = householdProgress(h)
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`hh-chip ${selectedHhId === h.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedHhId(h.id)
                      const rec = onboardingByHousehold[h.id]
                      const gapSection = rec?.sections.find((s) =>
                        s.fields.some((f) => f.status === 'blocked' || f.status === 'missing' || f.status === 'partial'),
                      )
                      setOpenSectionId(gapSection?.id ?? rec?.sections[0]?.id ?? null)
                    }}
                  >
                    <span className="hh-chip-name">
                      {h.name}
                      {h.exceptions > 0 ? ` · ${h.exceptions}` : ''}
                    </span>
                    <span className="hh-chip-progress">
                      <span className="hh-chip-track" aria-hidden="true">
                        <span
                          className={`hh-chip-fill tone-${h.stages.some((s) => s.status === 'blocked') ? 'blocked' : progressTone(p.pct)}`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </span>
                      <span className="hh-chip-pct">{p.pct}%</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="panel">
              <div className="panel-header">
                <span>{household.name} — lifecycle rail</span>
                <span className="muted">{household.agentsActive} agents active</span>
              </div>
              <div className="panel-body">
                <ProgressBar
                  size="md"
                  pct={clientProgress.pct}
                  label="Client lifecycle progress"
                  detail={`${clientProgress.complete} complete · ${clientProgress.inFlight} in flight · ${clientProgress.total - clientProgress.complete - clientProgress.inFlight} upcoming · current: ${household.stageLabel}`}
                  tone={
                    household.stages.some((s) => s.status === 'blocked')
                      ? 'blocked'
                      : progressTone(clientProgress.pct)
                  }
                />

                <div className="hh-summary" style={{ marginTop: 12 }}>
                  <div>
                    <div className="k">AUM / stage</div>
                    <div className="v">{household.aum}</div>
                  </div>
                  <div>
                    <div className="k">Current stage</div>
                    <div className="v">{household.stageLabel}</div>
                  </div>
                  <div>
                    <div className="k">Risk / IPS</div>
                    <div className="v">{household.risk}</div>
                  </div>
                  <div>
                    <div className="k">Next client touch</div>
                    <div className="v">{household.nextClientTouch}</div>
                  </div>
                </div>

                <div className="lifecycle-rail">
                  {household.stages.map((s) => (
                    <div key={s.id} className={`stage-card ${s.status}`}>
                      <div className="name">{s.label}</div>
                      <div className="status">{statusLabel(s.status)}</div>
                      {s.agentSummary && <div>{s.agentSummary}</div>}
                      {s.humanAction && <div style={{ fontWeight: 700, marginTop: 4 }}>You: {s.humanAction}</div>}
                    </div>
                  ))}
                </div>

                {onboarding && completeness && (
                  <div className="phase-map" aria-label="Four-phase CLM map">
                    {(['1_intake', '2_kyc', '3_custody', '4_orientation'] as const).map((phase) => {
                      const secs = completeness.sectionStats.filter((s) => s.phase === phase)
                      const avg = secs.length
                        ? Math.round(secs.reduce((a, s) => a + s.pct, 0) / secs.length)
                        : 0
                      return (
                        <div key={phase} className="phase-chip">
                          <div className="phase-chip-title">{PHASE_LABELS[phase]}</div>
                          <ProgressBar size="sm" pct={avg} label="Phase completeness" tone={progressTone(avg)} />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {onboarding && completeness && (
              <div className="framework-grid">
                <div className="panel">
                  <div className="panel-header">
                    <span>Data &amp; forms — Person Account</span>
                    <span className="muted">{onboarding.personAccountId}</span>
                  </div>
                  <div className="panel-body">
                    <ProgressBar
                      size="md"
                      pct={completeness.pct}
                      label="Field completeness"
                      detail={`${completeness.gaps.length} gaps · goal: ${onboarding.primaryGoal} · horizon: ${onboarding.timeHorizonYears ?? '—'} yrs`}
                      tone={completeness.gaps.some((g) => g.status === 'blocked') ? 'blocked' : progressTone(completeness.pct)}
                    />
                    <div className="section-list">
                      {onboarding.sections.map((s) => {
                        const stat = completeness.sectionStats.find((x) => x.id === s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={`section-row ${openSectionId === s.id ? 'active' : ''}`}
                            onClick={() => setOpenSectionId(s.id === openSectionId ? null : s.id)}
                          >
                            <span className="section-name">{s.label}</span>
                            <span className="section-pct">{stat?.pct ?? 0}%</span>
                          </button>
                        )
                      })}
                    </div>
                    {openSection && (
                      <div className="field-panel">
                        <div className="field-panel-title">
                          {openSection.label}
                          <span className="muted"> · {PHASE_LABELS[openSection.phase]}</span>
                        </div>
                        <table className="field-table">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Value</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {openSection.fields.map((f) => (
                              <tr key={f.key}>
                                <td>{f.label}</td>
                                <td>{f.value || '—'}</td>
                                <td>
                                  <span className={`badge ${fieldStatusClass(f.status)}`}>{f.status}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {completeness.gaps.length > 0 && (
                      <div className="gap-list">
                        <strong>Signal — data gaps</strong>
                        <ul>
                          {completeness.gaps.slice(0, 6).map((g) => (
                            <li key={`${g.section}-${g.field}`}>
                              <span className={`badge ${fieldStatusClass(g.status)}`}>{g.status}</span>
                              {g.section}: {g.field}
                              {g.value ? ` — ${g.value}` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span>Compliance document vault</span>
                    <span className="muted">
                      {completeness.docsFiled}/{completeness.docsTotal} filed
                    </span>
                  </div>
                  <div className="panel-body">
                    <ProgressBar
                      size="md"
                      pct={completeness.docsPct}
                      label="Document pack"
                      detail="IAA · CRS · ADV 2A/2B · IPS · Fee Schedule A · Custodial · Tax · E-sign trail"
                      tone={
                        onboarding.documents.some((d) => d.status === 'nigo')
                          ? 'blocked'
                          : progressTone(completeness.docsPct)
                      }
                    />
                    <ul className="doc-list">
                      {onboarding.documents.map((d) => (
                        <li key={d.id}>
                          <div className="doc-name">{d.name}</div>
                          <div className="doc-meta">
                            <span className={`badge ${docStatusClass(d.status)}`}>{d.status}</span>
                            {d.filedOn && <span className="muted">Filed {d.filedOn}</span>}
                            {d.notes && <span className="muted">{d.notes}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span>Lifecycle Monitor Agent</span>
                    <span className={`badge ${onboarding.monitor.status === 'monitoring' || onboarding.monitor.status === 'activated' ? 'done' : 'needs'}`}>
                      {statusLabel(onboarding.monitor.status)}
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="callout" style={{ marginBottom: 10 }}>
                      <strong>Decision</strong>
                      {onboarding.monitor.decision}
                    </div>
                    <ul className="monitor-list">
                      <li>
                        Annual KYC refresh:{' '}
                        {onboarding.monitor.annualKycRefreshScheduled
                          ? `scheduled ${onboarding.monitor.annualKycRefreshDate ?? ''}`
                          : 'not scheduled'}
                      </li>
                      <li>
                        Life-event listener:{' '}
                        {onboarding.monitor.lifeEventListenerArmed ? 'armed' : 'not armed'}
                      </li>
                      <li>Reminders scheduled: {onboarding.monitor.remindersScheduled}</li>
                      <li>Portal provisioned: {onboarding.monitor.portalProvisioned ? 'yes' : 'no'}</li>
                      <li>Welcome kit / 30-60-90: {onboarding.monitor.cadence30_60_90 ? 'active' : 'pending'}</li>
                      <li>Billing initialized: {onboarding.monitor.billingInitialized ? 'yes' : 'no'}</li>
                    </ul>
                    {onboarding.monitor.orientation && (
                      <div className="callout" style={{ marginTop: 10 }}>
                        <strong>Orientation / Meeting Concierge</strong>
                        {onboarding.monitor.orientation.datetime.replace('T', ' · ')}
                        <br />
                        Playbook {onboarding.monitor.orientation.playbookId}
                        {onboarding.monitor.orientation.filedOnPersonAccount
                          ? ' · filed on Person Account'
                          : ''}
                      </div>
                    )}
                    <div className="intake-keys">
                      <div>
                        <span className="k">Gov ID</span>
                        <span className="v">{onboarding.governmentIdType}</span>
                      </div>
                      <div>
                        <span className="k">Source of wealth</span>
                        <span className="v">{onboarding.sourceOfWealth}</span>
                      </div>
                      <div>
                        <span className="k">Funding method</span>
                        <span className="v">{onboarding.fundingMethod}</span>
                      </div>
                      <div>
                        <span className="k">Funding amount</span>
                        <span className="v">
                          {onboarding.fundingAmountUsd != null
                            ? `$${onboarding.fundingAmountUsd.toLocaleString()}`
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="detail-grid">
              <div className="panel">
                <div className="panel-header">
                  <span>What agents did</span>
                  <span className="muted">Audit-ready lineage</span>
                </div>
                <div className="panel-body">
                  <ul className="feed">
                    {household.events.map((ev) => (
                      <li key={ev.id}>
                        <div className="time">{ev.time}</div>
                        <div>
                          <span className="agent">{ev.agent}</span>{' '}
                          <span className={`badge ${ev.outcome === 'done' ? 'done' : ev.outcome === 'running' ? 'running' : 'needs'}`}>
                            {ev.outcome === 'needs_you' ? 'needs you' : ev.outcome}
                          </span>
                        </div>
                        <div>{ev.action}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <span>Exception detail</span>
                </div>
                <div className="panel-body">
                  {selectedEx ? (
                    <>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{selectedEx.title}</div>
                      <p className="muted" style={{ marginTop: 0 }}>
                        {selectedEx.household}
                      </p>
                      <div className="callout" style={{ marginBottom: 10 }}>
                        <strong>Why it surfaced</strong>
                        {selectedEx.reason}
                      </div>
                      <div className="callout" style={{ marginBottom: 10 }}>
                        <strong>Agent already did</strong>
                        {selectedEx.agentContext}
                      </div>
                      <div className="callout">
                        <strong>Your move</strong>
                        {selectedEx.recommendedAction}
                      </div>
                      <div className="actions">
                        <button type="button" className="btn success" onClick={() => approveException(selectedEx)}>
                          Approve &amp; let agent continue
                        </button>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={() => flash('Opening client talk track — agents keep working in background')}
                        >
                          Talk to client instead
                        </button>
                        <button type="button" className="btn" onClick={() => flash('Routed to CRA / compliance queue')}>
                          Delegate
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="muted">No open exceptions. Grow the practice.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'paraplanner' && (
        <div className="app-body single">
          <div className="panel">
            <div className="panel-header">
              <span>Deliverable queue — agent drafts, you polish</span>
              <span className="muted">Template-faithful · cited · gated</span>
            </div>
            <div className="panel-body">
              <table className="para-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Household</th>
                    <th>Status</th>
                    <th>Est. time saved</th>
                  </tr>
                </thead>
                <tbody>
                  {paraplannerQueue.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedParaId === row.id ? 'selected' : ''}
                      onClick={() => setSelectedParaId(row.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>{row.type}</strong>
                      </td>
                      <td>{row.household}</td>
                      <td>
                        <span className={`badge ${row.status === 'approved' ? 'done' : row.status === 'needs_review' ? 'needs' : 'medium'}`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{row.estMinutesSaved} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="para-detail" style={{ marginTop: 16 }}>
                <div className="callout">
                  <strong>Agent already did</strong>
                  {selectedPara.agentDid}
                </div>
                <div className="callout">
                  <strong>Your job</strong>
                  {selectedPara.yourJob}
                </div>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => flash(`Opened ${selectedPara.type} editor with citations for ${selectedPara.household}`)}
                >
                  Open draft in firm template
                </button>
                <button type="button" className="btn success" onClick={() => flash('Sent to advisor for voice + client delivery')}>
                  Mark ready for advisor
                </button>
                <button type="button" className="btn" onClick={() => flash('Requested missing data from Discovery Agent')}>
                  Request data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'value' && (
        <>
          <div className="hero-banner">
            <h1>FSC Client Lifecycle Management — value by persona</h1>
            <p>
              Agents orchestrate prospect → funded → annual review → life events → estate. Humans stay in a
              mission-control seat for judgment, relationships, and fiduciary polish — not swivel-chair admin.
            </p>
          </div>

          <div className="value-grid">
            {personaValues.map((p, i) => (
              <button
                key={p.persona}
                type="button"
                className={`value-card ${personaIdx === i ? 'active' : ''}`}
                onClick={() => setPersonaIdx(i)}
              >
                <h3>{p.persona}</h3>
                <p>{p.tagline}</p>
              </button>
            ))}
          </div>

          <div className="value-detail">
            <h2>{persona.persona}</h2>
            <p style={{ margin: 0, color: 'var(--sf-gray-2)' }}>{persona.tagline}</p>
            <div className="columns-2">
              <div>
                <strong style={{ fontSize: 12, color: 'var(--sf-gray-3)', textTransform: 'uppercase' }}>Today’s pain</strong>
                <ul>
                  {persona.pains.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: 12, color: 'var(--sf-gray-3)', textTransform: 'uppercase' }}>CLM value</strong>
                <ul>
                  {persona.valueProps.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="metric-row head">
                <div>Metric</div>
                <div>Before</div>
                <div>With agentic CLM</div>
              </div>
              {persona.metrics.map((m) => (
                <div className="metric-row" key={m.label}>
                  <div>{m.label}</div>
                  <div>{m.before}</div>
                  <div style={{ color: 'var(--sf-green)', fontWeight: 650 }}>{m.after}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ margin: '0 12px 12px' }}>
            <div className="panel-header">
              <span>Competitive landscape — where FSC CLM wins</span>
              <span className="muted">US RIA / hybrid focus</span>
            </div>
            <div className="panel-body" style={{ overflowX: 'auto' }}>
              <table className="comp-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Lane</th>
                    <th>Strength</th>
                    <th>Gap</th>
                    <th>FSC angle</th>
                  </tr>
                </thead>
                <tbody>
                  {competitors.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{c.lane}</td>
                      <td>{c.strength}</td>
                      <td>{c.gap}</td>
                      <td>{c.fscAngle}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
