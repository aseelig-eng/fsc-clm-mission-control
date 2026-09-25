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
  type ClientOnboardingRecord,
  type FormSection,
} from './data/onboardingFramework'
import { buildDrillItems, type DrillItem } from './data/drilldown'
import { meetingsForHousehold, openMeetingActions } from './data/meetings'
import { MATURITY_LABELS, personsForHousehold } from './data/portraits'
import { exceptionsForHousehold, HouseholdPulse, type PulseNodeId } from './components/HouseholdPulse'
import { BookPulse } from './components/BookPulse'
import { ClientDossier } from './components/ClientDossier'
import { AdviceDesk } from './components/AdviceDesk'
import { initialPlans, initialPortfolios, PLAN_STAGES, PORTFOLIO_STAGES, type PlanState, type PortfolioState } from './data/advice'
import { GenerationalHandoff } from './components/GenerationalHandoff'
import { handoffFor } from './data/generational'
import { factsForStage } from './data/stageFacts'
import { ClientPortal } from './components/ClientPortal'
import { AccountBook } from './components/AccountBook'
import { CoworkerPanel } from './components/CoworkerPanel'
import type { CoworkerAction } from './coworker'
import { initialAccounts, usd, type ClientNotice, type FinancialAccount } from './data/accounts'
import { nextConversation } from './data/nextTalk'
import {
  householdProgress,
  overallProgress,
  progressTone,
  selectedStageProgress,
} from './data/progress'
import type { AdvisorAction, ExceptionItem, Household, LifecycleStage, Role } from './data/types'
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

function actionTypeLabel(type: AdvisorAction['type']) {
  switch (type) {
    case 'review_docs':
      return 'Review docs'
    case 'review_inputs':
      return 'Review inputs'
    case 'update_account':
      return 'Update account'
    case 'approve_send':
      return 'Approve / send'
    case 'escalate':
      return 'Escalate'
    case 'call_client':
      return 'Call client'
    case 'delegate':
      return 'Delegate'
    case 'schedule':
      return 'Schedule'
    default:
      return type
  }
}

function StageUnblockModal({
  stage,
  onClose,
  onAct,
}: {
  stage: LifecycleStage
  onClose: () => void
  onAct: (label: string) => void
}) {
  const unblock = stage.unblock
  if (!unblock) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unblock-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="muted">Process Card · Needs Resolution</div>
            <h2 id="unblock-title">{unblock.title}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="callout" style={{ marginBottom: 12 }}>
          <strong>Why This Is Blocked</strong>
          {unblock.whyBlocked}
        </div>
        {stage.agentSummary && (
          <div className="callout" style={{ marginBottom: 12 }}>
            <strong>Agent Already Did</strong>
            {stage.agentSummary}
            {stage.humanAction ? ` · Waiting on: ${stage.humanAction}` : ''}
          </div>
        )}
        <div className="modal-actions-title">Recommended Actions to Unblock</div>
        <ul className="advisor-action-list modal">
          {unblock.recommendedActions.map((a) => (
            <li key={a.label}>
              <button type="button" className="advisor-action-btn" onClick={() => onAct(a.label)}>
                <span className="action-type">{actionTypeLabel(a.type)}</span>
                <span className="action-label">{a.label}</span>
                <span className="action-detail">{a.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function PulseNodeModal({
  dialog,
  onClose,
  onAct,
}: {
  dialog: {
    kicker: string
    title: string
    why: string
    agentDid?: string
    actionsTitle: string
    actions: AdvisorAction[]
  }
  onClose: () => void
  onAct: (label: string) => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pulse-node-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="muted">{dialog.kicker}</div>
            <h2 id="pulse-node-title">{dialog.title}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="callout" style={{ marginBottom: 12 }}>
          <strong>What This Means</strong>
          {dialog.why}
        </div>
        {dialog.agentDid && (
          <div className="callout" style={{ marginBottom: 12 }}>
            <strong>Agent Already Did</strong>
            {dialog.agentDid}
          </div>
        )}
        {dialog.actions.length > 0 && (
          <>
            <div className="modal-actions-title">{dialog.actionsTitle}</div>
            <ul className="advisor-action-list modal">
              {dialog.actions.map((a) => (
                <li key={a.label}>
                  <button type="button" className="advisor-action-btn" onClick={() => onAct(a.label)}>
                    <span className="action-type">{actionTypeLabel(a.type)}</span>
                    <span className="action-label">{a.label}</span>
                    <span className="action-detail">{a.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function priorityClass(p: string) {
  if (p === 'critical') return 'critical'
  if (p === 'high') return 'high'
  if (p === 'info') return 'done'
  return 'medium'
}

function NeedsYouCard({
  selected,
  priority,
  title,
  meta,
  recommended,
  actions,
  onOpen,
  onAct,
}: {
  selected: boolean
  priority: string
  title: string
  meta: string
  recommended: string
  actions: AdvisorAction[]
  onOpen: () => void
  onAct: (action: AdvisorAction) => void
}) {
  return (
    <li>
      <button
        type="button"
        className={`exception-item ${selected ? 'selected' : ''}`}
        onClick={onOpen}
      >
        <div className="title">
          <span className={`badge ${priority}`}>{priority}</span>
          {title}
        </div>
        <div className="meta">{meta}</div>
        <div className="signal-recommend">
          <span className="signal-recommend-label">Recommended</span>
          <span className="signal-recommend-text">{recommended}</span>
        </div>
        {actions.length > 0 && (
          <div className="advisor-action-chips" onClick={(e) => e.stopPropagation()}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                className={`action-chip type-${a.type}`}
                title={a.detail}
                onClick={() => onAct(a)}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </button>
    </li>
  )
}

function ReviewPanel({
  item,
  advisorActions,
  onAct,
}: {
  item: DrillItem | null
  advisorActions?: AdvisorAction[]
  onAct: (label: string) => void
}) {
  if (!item) {
    return <p className="muted">Click any signal, stage, document, meeting, or action — recommended review appears here.</p>
  }
  const r = item.recommended
  return (
    <>
      <div className="review-kicker">
        <span className={`badge ${priorityClass(item.priority)}`}>{item.priority}</span>
        <span className="muted">{item.kind.replace('_', ' ')} · One Click Down</span>
      </div>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 15 }}>{r.headline}</div>
      <p className="muted" style={{ marginTop: 0 }}>
        {item.subtitle}
      </p>
      <div className="callout" style={{ marginBottom: 10 }}>
        <strong>Why This Needs You</strong>
        {r.why}
      </div>
      <div className="callout" style={{ marginBottom: 10 }}>
        <strong>Agent already did</strong>
        {r.agentAlreadyDid}
      </div>
      <div className="callout">
        <strong>Recommended for You to Review</strong>
        <ul className="review-checklist">
          {r.reviewChecklist.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      {advisorActions && advisorActions.length > 0 && (
        <div className="callout" style={{ marginTop: 10 }}>
          <strong>Advisor Actions</strong>
          <ul className="advisor-action-list">
            {advisorActions.map((a) => (
              <li key={a.label}>
                <button type="button" className="advisor-action-btn compact" onClick={() => onAct(a.label)}>
                  <span className="action-type">{actionTypeLabel(a.type)}</span>
                  <span className="action-label">{a.label}</span>
                  <span className="action-detail">{a.detail}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions">
        <button type="button" className="btn success" onClick={() => onAct(r.primaryCta)}>
          {r.primaryCta}
        </button>
        {r.secondaryCta && (
          <button type="button" className="btn primary" onClick={() => onAct(r.secondaryCta!)}>
            {r.secondaryCta}
          </button>
        )}
        <button type="button" className="btn" onClick={() => onAct('Delegated with context')}>
          Delegate
        </button>
      </div>
    </>
  )
}

export default function App() {
  const [role, setRole] = useState<Role>('advisor')
  const [cockpitView, setCockpitView] = useState<'status' | 'work' | 'record'>('status')
  const [showingBook, setShowingBook] = useState(true)
  const [selectedHhId, setSelectedHhId] = useState(households[0].id)
  const [selectedExId, setSelectedExId] = useState(exceptions[0].id)
  const [selectedParaId, setSelectedParaId] = useState(paraplannerQueue[0].id)
  const [personaIdx, setPersonaIdx] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [resolved, setResolved] = useState<Set<string>>(new Set())
  const [openSectionId, setOpenSectionId] = useState<string | null>('funding')
  const [drillId, setDrillId] = useState<string | null>('ex-ex1')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [pulseNodeId, setPulseNodeId] = useState<PulseNodeId | null>('custodian')
  const [selectedFacetId, setSelectedFacetId] = useState<string | null>(null)
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null)
  const [stageModal, setStageModal] = useState<LifecycleStage | null>(null)
  const [pulseDialog, setPulseDialog] = useState<{
    kicker: string
    title: string
    why: string
    agentDid?: string
    actionsTitle: string
    actions: AdvisorAction[]
  } | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [handoffOpen, setHandoffOpen] = useState(false)
  const [coworkerOpen, setCoworkerOpen] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const [portalHouseholdId, setPortalHouseholdId] = useState(households[0].id)
  const [plans, setPlans] = useState<Record<string, PlanState>>(() => initialPlans)
  const [portfolios, setPortfolios] = useState<Record<string, PortfolioState>>(() => initialPortfolios)
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => initialAccounts)
  const [records, setRecords] = useState<Record<string, ClientOnboardingRecord>>(() => structuredClone(onboardingByHousehold))
  const [clientNotices, setClientNotices] = useState<ClientNotice[]>([])

  const household = useMemo(
    () => households.find((h) => h.id === selectedHhId) as Household,
    [selectedHhId],
  )

  const onboarding = records[household.id]
  const completeness = useMemo(
    () => (onboarding ? recordCompleteness(onboarding) : null),
    [onboarding],
  )

  const bookProgress = useMemo(() => overallProgress(households), [])
  const clientProgress = useMemo(() => householdProgress(household), [household])
  const drillItems = useMemo(() => buildDrillItems(household), [household])
  const drillItem = drillItems.find((d) => d.id === drillId) ?? drillItems[0] ?? null
  const hhMeetings = useMemo(() => meetingsForHousehold(household.id), [household])
  const hhMeetingActions = useMemo(() => openMeetingActions(household.id), [household])
  const persons = useMemo(() => personsForHousehold(household.id), [household])
  const selectedPerson =
    persons.find((p) => p.id === selectedPersonId) ?? persons[0] ?? null
  const hhExceptions = useMemo(
    () => exceptionsForHousehold(household, exceptions.filter((e) => !resolved.has(e.id))),
    [household, resolved],
  )

  const openExceptions = exceptions.filter((e) => !resolved.has(e.id))
  const pendingNotices = clientNotices.filter((notice) => !notice.reviewed)
  const hhNotices = pendingNotices.filter((notice) => notice.householdId === household.id)
  const selectedStage =
    household.stages.find((s) => s.id === selectedStageId) ??
    [...household.stages].reverse().find((s) => s.status !== 'upcoming') ??
    household.stages[0]
  const stageBar = selectedStage ? selectedStageProgress(household.stages, selectedStage) : null
  const selectedEx = openExceptions.find((e) => e.id === selectedExId) ?? openExceptions[0]
  const selectedPara = paraplannerQueue.find((p) => p.id === selectedParaId) ?? paraplannerQueue[0]
  const persona = personaValues[personaIdx]
  const openSection: FormSection | undefined = onboarding?.sections.find((s) => s.id === openSectionId)

  const scheduledMeetings = hhMeetings.filter((m) => m.status === 'scheduled')
  const completedMeetings = hhMeetings.filter((m) => m.status === 'completed')

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }

  function openDrill(id: string) {
    setDrillId(id)
    if (id.startsWith('ex-')) setCockpitView('work')
    else if (
      id.startsWith('meeting-') ||
      id.startsWith('ma-') ||
      id.startsWith('likeness')
    )
      setCockpitView('status')
    else if (id.startsWith('field-') || id.startsWith('section-') || id.startsWith('doc-'))
      setCockpitView('record')
    if (id.startsWith('likeness-mat-')) {
      setSelectedPersonId(id.replace('likeness-mat-', ''))
      setPulseNodeId('likeness')
      return
    }
    if (id.startsWith('ex-')) {
      setPulseNodeId('custodian')
      return
    }
    if (id.startsWith('stage-')) {
      setPulseNodeId('lifecycle')
      return
    }
    if (id.startsWith('likeness-')) {
      const rest = id.slice('likeness-'.length)
      const facetIds = [
        'risk',
        'engagement',
        'channel',
        'goals',
        'complexity',
        'wallet',
        'tax_estate',
        'heir_readiness',
        'trust',
      ]
      const facetId = facetIds.find((f) => rest.endsWith(`-${f}`))
      if (facetId) {
        setSelectedPersonId(rest.slice(0, -(facetId.length + 1)))
        setSelectedFacetId(facetId)
        if (facetId === 'engagement') setPulseNodeId('engage')
        else if (facetId === 'heir_readiness') setPulseNodeId('heirs')
        else setPulseNodeId('likeness')
      }
    }
  }

  function selectPulseNode(nodeId: PulseNodeId) {
    setPulseNodeId(nodeId)
    if (!selectedPerson) return
    const engageFacet = selectedPerson.facets.find((f) => f.id === 'engagement')
    const weakest = [...selectedPerson.facets].sort((a, b) => a.score - b.score)[0]
    const stage =
      household.stages.find((s) => s.status === 'blocked') ||
      household.stages.find((s) => s.status === 'active' || s.status === 'agent-running') ||
      household.stages.find((s) => s.id === household.stage)

    if (nodeId === 'engage' && engageFacet) {
      setPulseDialog({
        kicker: 'Engage',
        title: `Engagement score · ${engageFacet.score}`,
        why: engageFacet.blurb,
        agentDid: engageFacet.evidence.join(' · '),
        actionsTitle: 'Actions to Take',
        actions: [
          {
            type: 'review_inputs',
            label: engageFacet.recommendedReview,
            detail: 'Use this before the next client touch.',
          },
        ],
      })
      return
    }
    if (nodeId === 'heirs') {
      setHandoffOpen(true)
      return
    }
    if (nodeId === 'likeness') {
      const m = selectedPerson.maturity
      setPulseDialog({
        kicker: 'Likeness',
        title: `${MATURITY_LABELS[m.tier].title} · ${m.score}`,
        why: MATURITY_LABELS[m.tier].hint,
        agentDid: `Completeness ${m.dataCompleteness} · Recency ${m.recency} · Sources ${m.sourceDiversity} · Advisor-confirmed ${m.advisorConfirmed}. Last touched ${m.lastTouched}.`,
        actionsTitle: 'Actions to Take',
        actions: [
          {
            type: 'review_inputs',
            label: weakest ? `Review ${weakest.label.toLowerCase()}` : 'Review likeness',
            detail: weakest?.recommendedReview ?? 'Confirm the thinnest part of the picture.',
          },
          {
            type: 'schedule',
            label: 'Schedule a confirmation touch',
            detail: 'Do not treat a thin likeness as exam-ready.',
          },
        ],
      })
      return
    }
    if (nodeId === 'lifecycle' && stage) {
      setSelectedStageId(stage.id)
      if (stage.unblock) {
        setPulseDialog({
          kicker: 'Stage',
          title: stage.unblock.title,
          why: stage.unblock.whyBlocked,
          agentDid: [stage.agentSummary, stage.humanAction ? `Waiting on: ${stage.humanAction}` : '']
            .filter(Boolean)
            .join(' · '),
          actionsTitle: 'Actions to Take',
          actions: stage.unblock.recommendedActions,
        })
      } else {
        setPulseDialog({
          kicker: 'Stage',
          title: stage.label,
          why: stage.agentSummary ?? 'This stage has no open agent note.',
          agentDid: stage.humanAction,
          actionsTitle: 'Actions to Take',
          actions: stage.humanAction
            ? [{ type: 'review_inputs', label: stage.humanAction, detail: stage.agentSummary ?? stage.label }]
            : [],
        })
      }
      return
    }
    if (nodeId === 'custodian') {
      const ex = hhExceptions[0]
      if (ex) {
        setSelectedExId(ex.id)
        setPulseDialog({
          kicker: 'Custodian',
          title: ex.title,
          why: ex.reason,
          agentDid: ex.agentContext,
          actionsTitle: 'Actions to Take',
          actions: ex.advisorActions,
        })
      } else {
        setPulseDialog({
          kicker: 'Custodian',
          title: 'STP Clear',
          why: 'No custodian rejection or NIGO is open for this household.',
          actionsTitle: 'Actions to Take',
          actions: [],
        })
      }
    }
  }

  function approveException(ex: ExceptionItem) {
    setResolved((prev) => new Set(prev).add(ex.id))
    flash(`Agent continuing: ${ex.recommendedAction}`)
    const next = openExceptions.find((e) => e.id !== ex.id)
    if (next) {
      setSelectedExId(next.id)
      openDrill(`ex-${next.id}`)
    }
  }

  function focusException(ex: ExceptionItem, stayOnClient = false) {
    setSelectedExId(ex.id)
    const match = households.find((h) => ex.household.includes(h.name.split(' ')[0]) || h.name.includes(ex.household.split(' ')[0]))
    if (match) setSelectedHhId(match.id)
    if (stayOnClient) {
      setShowingBook(false)
      setCockpitView('work')
    } else {
      setShowingBook(true)
    }
    openDrill(`ex-${ex.id}`)
  }

  function selectHousehold(id: string) {
    setShowingBook(false)
    setCockpitView('status')
    setSelectedHhId(id)
    const rec = records[id]
    const gapSection = rec?.sections.find((s) =>
      s.fields.some((f) => f.status === 'blocked' || f.status === 'missing' || f.status === 'partial'),
    )
    setOpenSectionId(gapSection?.id ?? rec?.sections[0]?.id ?? null)
    const hh = households.find((h) => h.id === id)!
    const items = buildDrillItems(hh)
    setDrillId(items[0]?.id ?? null)
    const firstPerson = personsForHousehold(id)[0]
    setSelectedPersonId(firstPerson?.id ?? null)
    const hhEx = exceptionsForHousehold(hh, exceptions.filter((e) => !resolved.has(e.id)))
    setPulseNodeId(hhEx[0] ? 'custodian' : 'lifecycle')
    const latest = [...hh.stages].reverse().find((s) => s.status !== 'upcoming') ?? hh.stages[0]
    setSelectedStageId(latest?.id ?? null)
  }

  function confirmNotice(notice: ClientNotice) {
    const next = structuredClone(records)
    const record = next[notice.householdId]
    for (const touch of notice.touched) {
      const field = record?.sections.find((section) => section.id === touch.sectionId)?.fields.find((item) => item.key === touch.fieldKey)
      if (field?.status === 'partial') field.status = 'complete'
    }
    setRecords(next)
    setClientNotices((prev) => prev.map((item) => (item.id === notice.id ? { ...item, reviewed: true } : item)))
    flash(`Confirmed on ${notice.householdName}. The profile now treats it as reviewed.`)
  }

  function openNotice(notice: ClientNotice, confirm: boolean) {
    setShowingBook(false)
    setRole('advisor')
    setSelectedHhId(notice.householdId)
    setCockpitView('record')
    if (notice.sectionId) setOpenSectionId(notice.sectionId)
    if (confirm) confirmNotice(notice)
  }

  function acceptProfileAnswer(householdId: string, sectionId: string, fieldKey: string, label: string, value: string) {
    const name = households.find((item) => item.id === householdId)?.name ?? 'Client'
    const next = structuredClone(records)
    const record = next[householdId]
    const field = record?.sections.find((section) => section.id === sectionId)?.fields.find((item) => item.key === fieldKey)
    const touched: ClientNotice['touched'] = []
    if (field && field.status !== 'n/a') {
      if (field.status === 'blocked') {
        const note = `Client: ${value}`
        if (!field.value.includes(value)) field.value = field.value ? `${field.value} · ${note}` : note
      } else {
        field.value = value
        field.status = 'partial'
        touched.push({ sectionId, fieldKey })
      }
    }
    if (record && fieldKey === 'goal') record.primaryGoal = value
    if (record && fieldKey === 'horizon') {
      const years = Number(value.replace(/[^0-9.]/g, ''))
      if (Number.isFinite(years) && years > 0) record.timeHorizonYears = years
    }
    setRecords(next)
    setClientNotices((prev) => [
      {
        id: `n-${Date.now()}`,
        householdId,
        householdName: name,
        title: `Client updated ${label}`,
        detail: value,
        sectionId,
        touched,
        reviewed: false,
      },
      ...prev,
    ])
  }

  function acceptClientAccounts(added: FinancialAccount[]) {
    if (added.length === 0) return
    const householdId = added[0].householdId
    const name = households.find((item) => item.id === householdId)?.name ?? 'Client'
    const summary = added.map((account) => `${account.institution} ${account.name} ···${account.mask} ${usd(account.balance)}`).join('; ')
    const next = structuredClone(records)
    const record = next[householdId]
    const touched: ClientNotice['touched'] = []
    const delivering = record?.sections.find((section) => section.id === 'custody')?.fields.find((item) => item.key === 'delivering')
    if (delivering && delivering.status !== 'blocked' && delivering.status !== 'n/a') {
      delivering.value = delivering.value ? `${delivering.value}; ${summary}` : summary
      delivering.status = 'partial'
      touched.push({ sectionId: 'custody', fieldKey: 'delivering' })
    }
    const investable = record?.sections.find((section) => section.id === 'financial_profile')?.fields.find((item) => item.key === 'investable')
    if (investable && (investable.status === 'missing' || !investable.value)) {
      investable.value = usd(added.reduce((sum, account) => sum + account.balance, 0))
      investable.status = 'partial'
      touched.push({ sectionId: 'financial_profile', fieldKey: 'investable' })
    }
    setAccounts((prev) => [...prev, ...added])
    setRecords(next)
    setClientNotices((prev) => [
      {
        id: `n-${Date.now()}`,
        householdId,
        householdName: name,
        title: added.length === 1 ? `Client linked ${added[0].institution} ···${added[0].mask}` : `Client linked ${added.length} held-away accounts`,
        detail: `${summary}. ${added[0].link === 'plaid' ? 'Linked with Plaid' : 'Entered by hand'}. Not a transfer and not advice.`,
        sectionId: 'custody',
        touched,
        reviewed: false,
      },
      ...prev,
    ])
  }

  function runCoworker(action: CoworkerAction) {
    setRole('advisor')
    if (action.type === 'show-book') {
      setShowingBook(true)
      return
    }
    selectHousehold(action.householdId)
    setCockpitView(action.tab)
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
        <button
          type="button"
          className="portal-launch"
          onClick={() => {
            setPortalHouseholdId(selectedHhId)
            setPortalOpen(true)
          }}
        >
          Client portal
        </button>
        <button
          type="button"
          className={`coworker-launch ${coworkerOpen ? 'active' : ''}`}
          aria-label="Ask"
          aria-pressed={coworkerOpen}
          onClick={() => setCoworkerOpen((open) => !open)}
        >
          <svg className="ask-spark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3.2l.7 2.1L9.8 6l-2.1.7L7 8.8l-.7-2.1L4.2 6l2.1-.7z" fill="currentColor" />
            <path d="M16 8l1.1 3.2L20.4 12.3l-3.3 1.1L16 16.6l-1.1-3.2-3.3-1.1 3.3-1.1z" fill="currentColor" />
          </svg>
          Ask
        </button>
        <div className="header-meta">V Initial Concept</div>
      </header>

      <div className={`workspace ${coworkerOpen ? 'open' : ''}`}>
      <div className="workspace-main">
      {role === 'paraplanner' && (
        <div className="metrics-strip" aria-label="Firm CLM metrics">
            {metrics.map((m) => (
              <div className="metric-card" key={m.label}>
                <div className="label">{m.label}</div>
                <div className="value">{m.value}</div>
                <div className={`delta ${m.tone === 'neutral' ? 'neutral' : ''}`}>{m.delta}</div>
              </div>
            ))}
          </div>
      )}

      {role === 'advisor' && (
        <div className="app-body single">
          <div className="main-col">
            <div className="household-bar">
              <button
                type="button"
                className={`hh-chip book-chip ${showingBook ? 'active' : ''}`}
                onClick={() => setShowingBook(true)}
              >
                <span className="hh-chip-name">
                  <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h7v12H4zM13 6h7v5h-7zM13 13h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                  Book
                </span>
                <span className="hh-chip-progress">
                  <span className="hh-chip-track" aria-hidden="true">
                    <span
                      className={`hh-chip-fill tone-${households.some((h) => h.stages.some((s) => s.status === 'blocked')) ? 'blocked' : progressTone(bookProgress.pct)}`}
                      style={{ width: `${bookProgress.pct}%` }}
                    />
                  </span>
                  <span className="hh-chip-pct">{bookProgress.pct}%</span>
                </span>
              </button>
              {households.map((h) => {
                const p = householdProgress(h)
                return (
                  <button
                    key={h.id}
                    type="button"
                    className={`hh-chip ${!showingBook && selectedHhId === h.id ? 'active' : ''}`}
                    onClick={() => {
                      selectHousehold(h.id)
                    }}
                  >
                    <span className="hh-chip-name">
                      {h.name}
                      {pendingNotices.some((notice) => notice.householdId === h.id) ? ' · update' : ''}
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

            {!showingBook && (
            <div className="client-toolbar">
            <div className="view-tabs" role="tablist" aria-label="Cockpit views">
              <button
                type="button"
                role="tab"
                aria-selected={cockpitView === 'status'}
                className={cockpitView === 'status' ? 'active' : ''}
                onClick={() => setCockpitView('status')}
              >
                <strong>
                  <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M6 19c1.2-3 3.2-4.5 6-4.5s4.8 1.5 6 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Status
                </strong>
                <span>Who They Are</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cockpitView === 'work'}
                className={cockpitView === 'work' ? 'active' : ''}
                onClick={() => setCockpitView('work')}
              >
                <strong>
                  <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                  Work
                </strong>
                <span>What Has Been Done and What Needs You</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={cockpitView === 'record'}
                className={cockpitView === 'record' ? 'active' : ''}
                onClick={() => setCockpitView('record')}
              >
                <strong>
                  <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 7h6l2 2h8v10H4z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  Record
                </strong>
                <span>What’s On File</span>
              </button>
            </div>
            <button type="button" className="profile-entry" onClick={() => setProfileOpen(true)}>
              Relationship File
            </button>
            </div>
            )}

            <div className="cockpit-split no-review">
              <div className="main-col">
          {showingBook && (
            <>
              <BookPulse households={households} exceptions={openExceptions} />
              <aside className="panel" style={{ overflow: 'auto' }}>
                <div className="panel-header">
                  <span>Needs You — Signal Only</span>
                  <span className="muted">{openExceptions.length + pendingNotices.length} open</span>
                </div>
                <ul className="exception-list">
                  {pendingNotices.map((notice) => (
                    <NeedsYouCard
                      key={notice.id}
                      selected={false}
                      priority="high"
                      title={notice.title}
                      meta={`${notice.householdName} · Client portal`}
                      recommended="Confirm it on the client profile. This is client-reported, not advice."
                      actions={[
                        {
                          type: 'review_inputs',
                          label: 'Review and confirm',
                          detail: notice.detail,
                        },
                      ]}
                      onOpen={() => openNotice(notice, false)}
                      onAct={() => openNotice(notice, true)}
                    />
                  ))}
                  {openExceptions.map((ex) => (
                    <NeedsYouCard
                      key={ex.id}
                      selected={selectedEx?.id === ex.id}
                      priority={ex.priority}
                      title={ex.title}
                      meta={`${ex.household} · Owner: ${ex.owner}`}
                      recommended={ex.recommendedAction}
                      actions={ex.advisorActions}
                      onOpen={() => focusException(ex)}
                      onAct={(a) => {
                        focusException(ex)
                        flash(`${actionTypeLabel(a.type)}: ${a.label}`)
                      }}
                    />
                  ))}
                  {openExceptions.length === 0 && pendingNotices.length === 0 && (
                    <li className="panel-body muted">All clear — agents are running. Time for clients.</li>
                  )}
                </ul>
              </aside>
            </>
          )}

            {!showingBook && cockpitView === 'status' && (
            <div className="panel">
              <div className="panel-header">
                <span>{household.name} — Household Pulse</span>
                <span className="muted">{household.activeAgents.length} agents active</span>
              </div>
              <div className="panel-body">
                {persons.length > 0 && selectedPerson && (
                  <HouseholdPulse
                    household={household}
                    person={selectedPerson}
                    persons={persons}
                    exceptions={hhExceptions}
                    selectedNodeId={pulseNodeId}
                    selectedFacetId={selectedFacetId}
                    onSelectPerson={(id) => {
                      setSelectedPersonId(id)
                      setSelectedFacetId(null)
                      openDrill(`likeness-mat-${id}`)
                    }}
                    onSelectNode={selectPulseNode}
                    onSelectFacet={(facet) => {
                      setSelectedFacetId(facet.id)
                      openDrill(`likeness-${selectedPerson.id}-${facet.id}`)
                    }}
                    plan={plans[household.id]}
                    portfolio={portfolios[household.id]}
                  />
                )}

                <div className="lifecycle-block">
                  <div className="lifecycle-block-title">{household.name} — Lifecycle</div>
                <div className="lifecycle-rail">
                  {household.stages.map((s) => {
                    const needsResolution =
                      s.status === 'blocked' ||
                      ((s.status === 'active' || s.status === 'agent-running') && !!s.unblock)
                    const selected = selectedStage?.id === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`stage-card ${s.status} clickable ${selected ? 'selected' : ''} ${needsResolution ? 'needs-resolution' : ''}`}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedStageId(s.id)
                          openDrill(`stage-${s.id}`)
                          if (needsResolution && s.unblock) setStageModal(s)
                        }}
                      >
                        <div className="name">{s.label}</div>
                        <div className="status">{statusLabel(s.status)}</div>
                        {s.agentSummary && <div>{s.agentSummary}</div>}
                        {s.humanAction && <div style={{ fontWeight: 700, marginTop: 4 }}>You: {s.humanAction}</div>}
                        {needsResolution && <div className="stage-cta">Click for Unblock Actions</div>}
                      </button>
                    )
                  })}
                </div>
                </div>

                <ProgressBar
                  size="md"
                  pct={stageBar?.pct ?? clientProgress.pct}
                  label="Client Lifecycle Progress"
                  detail={
                    stageBar?.detail ??
                    `${clientProgress.complete} complete · ${clientProgress.inFlight} in flight · current: ${household.stageLabel}`
                  }
                  tone={stageBar?.tone ?? progressTone(clientProgress.pct)}
                />

                <div className="hh-summary" style={{ marginTop: 12 }}>
                  <div>
                    <div className="k">AUM / stage</div>
                    <div className="v">{selectedStage ? factsForStage(household, selectedStage).aum : '—'}</div>
                  </div>
                  <div>
                    <div className="k">Current stage</div>
                    <div className="v">{selectedStage?.label ?? household.stageLabel}</div>
                  </div>
                  <div>
                    <div className="k">Risk / IPS</div>
                    <div className="v">{selectedStage ? factsForStage(household, selectedStage).risk : '—'}</div>
                  </div>
                  <div>
                    <div className="k">Next client touch</div>
                    <div className="v">{selectedStage ? factsForStage(household, selectedStage).nextTouch : '—'}</div>
                  </div>
                </div>

                {(() => {
                  const talk = nextConversation({
                    household,
                    plan: plans[household.id],
                    lifeEvent: selectedPerson?.profile.lifeEvents?.[0]
                      ? `${selectedPerson.profile.lifeEvents[0].when}: ${selectedPerson.profile.lifeEvents[0].label}`
                      : undefined,
                    gaps: (completeness?.gaps ?? []).map((gap) => ({ field: gap.field })),
                    notices: hhNotices,
                  })
                  if (talk.points.length === 0) return null
                  return (
                    <section className="next-talk" aria-label="Next conversation">
                      <h3>{talk.headline}</h3>
                      <ul>
                        {talk.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </section>
                  )
                })()}

                {(PLAN_STAGES.includes(selectedStage?.id ?? '') ||
                  PORTFOLIO_STAGES.includes(selectedStage?.id ?? '')) && (
                  <AdviceDesk
                    key={household.id}
                    plan={plans[household.id]}
                    portfolio={portfolios[household.id]}
                    showPlan={PLAN_STAGES.includes(selectedStage?.id ?? '')}
                    showPortfolio={PORTFOLIO_STAGES.includes(selectedStage?.id ?? '')}
                    onPlan={(patch) =>
                      setPlans((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))
                    }
                    onPortfolio={(patch) =>
                      setPortfolios((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))
                    }
                  />
                )}
              </div>
            </div>
            )}

            {!showingBook && cockpitView === 'record' && onboarding && completeness && (
              <>
              <div className="panel">
                <div className="panel-header">
                  <span>Financial Accounts</span>
                  <span className="muted">
                    {accounts.filter((account) => account.householdId === household.id && account.review === 'pending').length > 0
                      ? 'Client addition waiting on you'
                      : 'Managed and held-away'}
                  </span>
                </div>
                <div className="panel-body">
                  <AccountBook accounts={accounts.filter((account) => account.householdId === household.id)} />
                </div>
              </div>
              <AdviceDesk
                key={`${household.id}-record`}
                plan={plans[household.id]}
                portfolio={portfolios[household.id]}
                showPlan
                showPortfolio
                onPlan={(patch) => setPlans((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))}
                onPortfolio={(patch) =>
                  setPortfolios((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))
                }
              />
              <div className="framework-grid">
                <div className="panel">
                  <div className="panel-header">
                    <span>Data &amp; Forms — Person Account</span>
                    <span className="muted">{onboarding.personAccountId}</span>
                  </div>
                  <div className="panel-body">
                    <ProgressBar
                      size="md"
                      pct={completeness.pct}
                      label="Field Completeness"
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
                            onClick={() => {
                              setOpenSectionId(s.id === openSectionId ? null : s.id)
                              openDrill(`section-${s.id}`)
                            }}
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
                              <tr
                                key={f.key}
                                className={
                                  f.status === 'blocked' || f.status === 'missing' || f.status === 'partial'
                                    ? 'clickable-row'
                                    : undefined
                                }
                                onClick={() => {
                                  if (f.status === 'blocked' || f.status === 'missing' || f.status === 'partial') {
                                    openDrill(`field-${openSection.id}-${f.key}`)
                                  }
                                }}
                              >
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
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <span>Compliance Document Vault</span>
                    <span className="muted">
                      {completeness.docsFiled}/{completeness.docsTotal} filed
                    </span>
                  </div>
                  <div className="panel-body">
                    <ProgressBar
                      size="md"
                      pct={completeness.docsPct}
                      label="Document Pack"
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
                          <button type="button" className="doc-btn" onClick={() => openDrill(`doc-${d.id}`)}>
                            <div className="doc-name">{d.name}</div>
                            <div className="doc-meta">
                              <span className={`badge ${docStatusClass(d.status)}`}>{d.status}</span>
                              {d.filedOn && <span className="muted">Filed {d.filedOn}</span>}
                              {d.notes && <span className="muted">{d.notes}</span>}
                            </div>
                          </button>
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
              </>
            )}

            {!showingBook && cockpitView === 'status' && (
            <div className="panel">
              <div className="panel-header">
                <span>Meeting Management</span>
                <span className="muted">
                  {scheduledMeetings.length} upcoming · {hhMeetingActions.length} open actions
                </span>
              </div>
              <div className="panel-body">
                <div className="meeting-cols">
                  <div>
                    <div className="meeting-col-title">Scheduled</div>
                    {scheduledMeetings.length === 0 && <p className="muted">None</p>}
                    {scheduledMeetings.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`meeting-card ${drillId === `meeting-${m.id}` ? 'active' : ''}`}
                        onClick={() => openDrill(`meeting-${m.id}`)}
                      >
                        <div className="meeting-title">{m.title}</div>
                        <div className="muted">
                          {m.when.replace('T', ' · ')} · {m.channel.replace('_', ' ')}
                        </div>
                        <div className="muted">
                          {m.prepBriefReady ? 'Prep brief ready' : 'Prep blocked'}
                          {m.playbookId ? ` · ${m.playbookId}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="meeting-col-title">Meetings Held</div>
                    {completedMeetings.length === 0 && <p className="muted">None</p>}
                    {completedMeetings.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`meeting-card ${drillId === `meeting-${m.id}` ? 'active' : ''}`}
                        onClick={() => openDrill(`meeting-${m.id}`)}
                      >
                        <div className="meeting-title">{m.title}</div>
                        <div className="muted">{m.when.replace('T', ' · ')}</div>
                        {m.summary && <div className="meeting-summary">{m.summary}</div>}
                        {m.decisions && m.decisions.length > 0 && (
                          <div className="muted">Decisions: {m.decisions.join('; ')}</div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="meeting-col-title">Actions From Meetings</div>
                    {hhMeetingActions.length === 0 && <p className="muted">No open actions</p>}
                    {hhMeetingActions.map(({ meeting, action }) => (
                      <button
                        key={action.id}
                        type="button"
                        className={`meeting-card action ${drillId === `ma-${action.id}` ? 'active' : ''}`}
                        onClick={() => openDrill(`ma-${action.id}`)}
                      >
                        <div className="meeting-title">
                          <span className={`badge ${action.status === 'blocked' ? 'critical' : 'needs'}`}>
                            {action.status}
                          </span>{' '}
                          {action.title}
                        </div>
                        <div className="muted">
                          {action.owner} · due {action.due} · from “{meeting.title}”
                        </div>
                        <div className="meeting-summary">{action.recommendedReview}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            )}

            {!showingBook && cockpitView === 'work' && (
              <div className="work-split">
                <div className="panel">
                  <div className="panel-header">
                    <span>Agents Have Done</span>
                    <span className="muted">
                      {household.events.filter((ev) => ev.outcome !== 'needs_you').length} complete or running
                    </span>
                  </div>
                  <div className="panel-body">
                    <div className="active-agents">
                      <div className="active-agents-label">Active now · {household.activeAgents.length}</div>
                      <ul>
                        {household.activeAgents.map((agent) => (
                          <li key={agent.name}>
                            <span className="agent">{agent.name}</span>
                            <span>{agent.doing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ul className="feed">
                      {household.events
                        .filter((ev) => ev.outcome !== 'needs_you')
                        .map((ev) => (
                          <li key={ev.id}>
                            <div className="time">{ev.time}</div>
                            <div>
                              <span className="agent">{ev.agent}</span>{' '}
                              <span className={`badge ${ev.outcome === 'done' ? 'done' : 'running'}`}>
                                {ev.outcome}
                              </span>
                            </div>
                            <div className="feed-action">{ev.action}</div>
                            <p className="feed-detail">{ev.detail}</p>
                          </li>
                        ))}
                      {household.events.every((ev) => ev.outcome === 'needs_you') && (
                        <li className="muted">Nothing completed yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <span>Needs You</span>
                    <span className="muted">
                      {hhExceptions.length + hhNotices.length + household.events.filter((ev) => ev.outcome === 'needs_you').length} open
                    </span>
                  </div>
                  <div className="panel-body">
                    <ul className="exception-list">
                      {hhNotices.map((notice) => (
                        <NeedsYouCard
                          key={notice.id}
                          selected={false}
                          priority="high"
                          title={notice.title}
                          meta="Client portal"
                          recommended="Confirm it on the client profile. This is client-reported, not advice."
                          actions={[
                            {
                              type: 'review_inputs',
                              label: 'Review and confirm',
                              detail: notice.detail,
                            },
                          ]}
                          onOpen={() => openNotice(notice, false)}
                          onAct={() => openNotice(notice, true)}
                        />
                      ))}
                      {hhExceptions.map((ex) => (
                        <NeedsYouCard
                          key={ex.id}
                          selected={selectedEx?.id === ex.id}
                          priority={ex.priority}
                          title={ex.title}
                          meta={`Owner: ${ex.owner}`}
                          recommended={ex.recommendedAction}
                          actions={ex.advisorActions}
                          onOpen={() => focusException(ex, true)}
                          onAct={(a) => {
                            focusException(ex, true)
                            flash(`${actionTypeLabel(a.type)}: ${a.label}`)
                          }}
                        />
                      ))}
                      {household.events
                        .filter((ev) => ev.outcome === 'needs_you')
                        .map((ev) => {
                          const stage = household.stages.find((s) => s.id === ev.stage)
                          const match = hhExceptions.find((ex) => ex.stage === ev.stage)
                          const actions = match?.advisorActions ?? stage?.unblock?.recommendedActions ?? [
                            {
                              type: 'review_docs' as const,
                              label: 'Review what the agent did',
                              detail: ev.action,
                            },
                            {
                              type: 'escalate' as const,
                              label: 'Escalate if you cannot clear it',
                              detail: 'Hand off with the agent lineage.',
                            },
                          ]
                          return (
                            <NeedsYouCard
                              key={ev.id}
                              selected={match ? selectedEx?.id === match.id : drillId === `stage-${ev.stage}`}
                              priority={match?.priority ?? 'high'}
                              title={ev.action}
                              meta={`${ev.agent} · ${ev.time}`}
                              recommended={
                                match?.recommendedAction ??
                                stage?.humanAction ??
                                stage?.unblock?.title ??
                                'Decide so the agent can continue'
                              }
                              actions={actions}
                              onOpen={() => {
                                if (match) focusException(match, true)
                                else {
                                  openDrill(`stage-${ev.stage}`)
                                  if (stage?.unblock) setStageModal(stage)
                                }
                              }}
                              onAct={(a) => {
                                if (match) focusException(match, true)
                                else {
                                  openDrill(`stage-${ev.stage}`)
                                  if (stage?.unblock) setStageModal(stage)
                                }
                                flash(`${actionTypeLabel(a.type)}: ${a.label}`)
                              }}
                            />
                          )
                        })}
                      {hhExceptions.length === 0 &&
                        hhNotices.length === 0 &&
                        household.events.every((ev) => ev.outcome !== 'needs_you') && (
                          <li className="panel-body muted">No open signals for this household.</li>
                        )}
                    </ul>
                    <div className="needs-you-review">
                      <div className="needs-you-review-title">Recommended Review</div>
                      <ReviewPanel
                        item={drillItem}
                        advisorActions={
                          drillItem?.kind === 'exception' && selectedEx ? selectedEx.advisorActions : undefined
                        }
                        onAct={(label) => {
                          if (label === 'Open weakest facet' && selectedPerson) {
                            const weakest = [...selectedPerson.facets].sort((a, b) => a.score - b.score)[0]
                            openDrill(`likeness-${selectedPerson.id}-${weakest.id}`)
                            return
                          }
                          if (selectedEx && drillItem?.kind === 'exception' && label.includes('Approve')) {
                            approveException(selectedEx)
                          } else {
                            flash(label)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'paraplanner' && (
        <div className="app-body single">
          <div className="panel">
            <div className="panel-header">
              <span>Deliverable Queue — Agent Drafts, You Polish</span>
              <span className="muted">Template-Faithful · Cited · Gated</span>
            </div>
            <div className="panel-body">
              <table className="para-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Household</th>
                    <th>Status</th>
                    <th>Est. Time Saved</th>
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
                  <strong>Why This Needs You</strong>
                  {selectedPara.status === 'awaiting_data'
                    ? 'This draft is gated. It should not be written until the missing facts exist.'
                    : selectedPara.status === 'approved'
                      ? 'Already polished and filed. Open it only to pull exam evidence.'
                      : 'This draft needs fiduciary polish before it goes to the advisor or the client.'}
                </div>
                <div className="callout">
                  <strong>Agent Already Did</strong>
                  {selectedPara.agentDid}
                </div>
                <div className="callout">
                  <strong>Recommended for You to Review</strong>
                  <ul className="review-checklist">
                    <li>{selectedPara.yourJob}</li>
                    {selectedPara.status !== 'awaiting_data' && <li>Check citations and source lineage before you approve.</li>}
                    {selectedPara.status === 'needs_review' || selectedPara.status === 'draft_ready' ? (
                      <li>Edit the agent draft. Do not start over.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
              <div className="actions">
                {selectedPara.status === 'awaiting_data' ? (
                  <button type="button" className="btn primary" onClick={() => flash('Requested missing data from Discovery Agent')}>
                    Request data
                  </button>
                ) : selectedPara.status === 'approved' ? (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => flash(`Opened filed ${selectedPara.type} for ${selectedPara.household}`)}
                  >
                    Open filed copy
                  </button>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {role === 'value' && (
        <>
          <div className="hero-banner">
            <h1>FSC Client Lifecycle Management — Value by Persona</h1>
            <p>
              Agents orchestrate prospect → funded → annual review → life events → estate. Humans stay in a
              mission-control seat for judgment, relationships, and fiduciary polish — with household pulse
              (including heir readiness), signal-only recommended actions, and unblock paths on blocked stages —
              not swivel-chair admin.
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
                <strong style={{ fontSize: 12, color: 'var(--sf-gray-3)', textTransform: 'uppercase' }}>Today’s Pain</strong>
                <ul>
                  {persona.pains.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong style={{ fontSize: 12, color: 'var(--sf-gray-3)', textTransform: 'uppercase' }}>CLM Value</strong>
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
                <div>With Agentic CLM</div>
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
              <span>Competitive Landscape — Where FSC CLM Wins</span>
              <span className="muted">US RIA / Hybrid Focus</span>
            </div>
            <div className="panel-body" style={{ overflowX: 'auto' }}>
              <table className="comp-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Lane</th>
                    <th>Strength</th>
                    <th>Gap</th>
                    <th>FSC Angle</th>
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
      </div>
      <CoworkerPanel
        open={coworkerOpen}
        context={{
          households,
          exceptions: exceptions.filter((item) => !resolved.has(item.id)),
          plans,
          portfolios,
          accounts,
          notices: clientNotices,
          audience: 'advisor',
        }}
        onClose={() => setCoworkerOpen(false)}
        onAction={runCoworker}
      />
      </div>

      {handoffOpen && (
        <GenerationalHandoff
          profile={handoffFor(household.id)}
          onClose={() => setHandoffOpen(false)}
          onAct={(label) => {
            flash(label)
            setHandoffOpen(false)
          }}
        />
      )}

      {profileOpen && selectedPerson && (
        <ClientDossier
          householdName={household.name}
          persons={persons}
          initialPersonId={selectedPerson.id}
          contact={{
            email: onboarding?.sections.find((section) => section.id === 'client_details')?.fields.find((field) => field.key === 'email')?.value,
            phone: onboarding?.sections.find((section) => section.id === 'client_details')?.fields.find((field) => field.key === 'phone')?.value,
            address: onboarding?.sections.find((section) => section.id === 'client_details')?.fields.find((field) => field.key === 'address')?.value,
          }}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {pulseDialog && (
        <PulseNodeModal
          dialog={pulseDialog}
          onClose={() => setPulseDialog(null)}
          onAct={(label) => {
            flash(label)
            setPulseDialog(null)
          }}
        />
      )}

      {stageModal && (
        <StageUnblockModal
          stage={stageModal}
          onClose={() => setStageModal(null)}
          onAct={(label) => {
            flash(label)
            setStageModal(null)
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {portalOpen && (
        <ClientPortal
          households={households}
          householdId={portalHouseholdId}
          plans={plans}
          records={records}
          accounts={accounts}
          coworker={{
            households,
            exceptions: openExceptions,
            plans,
            portfolios,
            accounts,
            notices: clientNotices,
            audience: 'advisor',
          }}
          onSwitch={setPortalHouseholdId}
          onClose={() => setPortalOpen(false)}
          onAddAccounts={acceptClientAccounts}
          onUpdateField={acceptProfileAnswer}
        />
      )}
    </div>
  )
}
