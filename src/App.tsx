import { useEffect, useMemo, useRef, useState } from 'react'
import {
  advisors,
  competitors,
  exceptions,
  households as initialHouseholds,
  metrics,
  paraplannerQueue,
  personaValues,
  portalPlayers,
} from './data/content'
import {
  PHASE_LABELS,
  onboardingByHousehold,
  recordCompleteness,
  documentsByStage,
  docProvenance,
  type ClientOnboardingRecord,
  type FieldStatus,
  type FormSection,
  type UpdatedBy,
} from './data/onboardingFramework'
import { buildDrillItems, type DrillItem } from './data/drilldown'
import {
  meetings as meetingSeed,
  meetingsForHousehold,
  openMeetingActions,
  createMeeting,
  meetingAgenticActions,
  type Meeting,
  type NewMeetingInput,
} from './data/meetings'
import {
  integrations as integrationCatalog,
  type Integration,
  type IntegrationStatus,
} from './data/integrations'
import { IntegrationHub } from './components/IntegrationHub'
import { MeetingWorkspace } from './components/MeetingWorkspace'
import { MeetingPrepBrief, type PrepSignal } from './components/MeetingPrepBrief'
import { ScheduleMeeting } from './components/ScheduleMeeting'
import { DocumentPreview } from './components/DocumentPreview'
import type { ComplianceDocument } from './data/onboardingFramework'
import { LIKENESS_FACET_IDS, MATURITY_LABELS, likenessScore, personsForHousehold, type ContactChannel } from './data/portraits'
import { exceptionsForHousehold, HouseholdPulse, type PulseNodeId } from './components/HouseholdPulse'
import { BookPulse } from './components/BookPulse'
import { ClientDossier } from './components/ClientDossier'
import { AdviceDesk } from './components/AdviceDesk'
import { initialPlans, initialPortfolios, PLAN_STAGES, type PlanState, type PortfolioState } from './data/advice'
import { GenerationalHandoff } from './components/GenerationalHandoff'
import { handoffFor } from './data/generational'
import { stageMetrics } from './data/stageFacts'
import { recordFieldMap } from './data/documentTemplates'
import { ClientPortal } from './components/ClientPortal'
import { PortalSetup } from './components/PortalSetup'
import { FirmBusiness } from './components/FirmBusiness'
import {
  caseSteps,
  collectItems,
  serviceCases,
  taskSteps,
  workTasks,
  type AgenticStep,
  type CaseStatus,
  type TaskStatus,
} from './data/serviceDesk'
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
import type { AdvisorAction, ExceptionItem, Household, LifecycleStage, LifecycleStageId, Role } from './data/types'
import './App.css'

// Persist only each integration's connected/available status by id, keyed off the
// live catalog so new/removed sources still flow through on the next load.
const INTEGRATION_STATUS_KEY = 'fsc-clm.integration-status.v1'

function loadIntegrationList(): Integration[] {
  let saved: Record<string, IntegrationStatus> = {}
  try {
    const raw = localStorage.getItem(INTEGRATION_STATUS_KEY)
    if (raw) saved = JSON.parse(raw) as Record<string, IntegrationStatus>
  } catch {
    saved = {}
  }
  return integrationCatalog.map((item) =>
    saved[item.id] && saved[item.id] !== item.status
      ? { ...item, status: saved[item.id] }
      : item,
  )
}

function saveIntegrationList(list: Integration[]) {
  try {
    const map: Record<string, IntegrationStatus> = {}
    for (const item of list) map[item.id] = item.status
    localStorage.setItem(INTEGRATION_STATUS_KEY, JSON.stringify(map))
  } catch {
    // storage unavailable (private mode / quota) — connection stays session-local
  }
}

function dayPart() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function chipStage(household: Household) {
  const blocked = household.stages.find((stage) => stage.status === 'blocked')
  if (blocked) return `${blocked.label.split('/')[0].trim()} blocked`
  const current = [...household.stages].reverse().find((stage) => stage.status !== 'upcoming')
  return current?.label ?? household.stageLabel
}

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

function docStatusClass(status: string) {
  if (status === 'filed' || status === 'current') return 'done'
  if (status === 'nigo' || status === 'needs_signature') return 'critical'
  if (status === 'pending' || status === 'stale') return 'needs'
  if (status === 'missing') return 'medium'
  return 'medium'
}

function meetingWhen(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
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
  onAct: (action: AdvisorAction) => void
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
              <button type="button" className="advisor-action-btn" onClick={() => onAct(a)}>
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

function splitActions(actions: AdvisorAction[]) {
  const rank: AdvisorAction['type'][] = [
    'schedule',
    'approve_send',
    'escalate',
    'review_docs',
    'review_inputs',
    'update_account',
    'call_client',
    'delegate',
  ]
  if (actions.length === 0) return { primary: undefined as AdvisorAction | undefined, rest: [] as AdvisorAction[] }
  const primary = [...actions].sort((a, b) => rank.indexOf(a.type) - rank.indexOf(b.type))[0]
  return { primary, rest: actions.filter((action) => action !== primary) }
}

function NeedsYouCard({
  selected,
  priority,
  title,
  meta,
  recommended,
  actions,
  queueType = 'Signal',
  onOpen,
  onAct,
}: {
  selected: boolean
  priority: string
  title: string
  meta: string
  recommended: string
  actions: AdvisorAction[]
  queueType?: string
  onOpen: () => void
  onAct: (action: AdvisorAction) => void
}) {
  const [more, setMore] = useState(false)
  const { primary, rest } = splitActions(actions)
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        className={`exception-item ${selected ? 'selected' : ''}`}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
      >
        <div className="title">
          <span className="queue-type">{queueType}</span>
          <span className={`badge ${priority}`}>{priority}</span>
          {title}
        </div>
        <div className="meta">{meta}</div>
        <div className="signal-recommend">
          <span className="signal-recommend-label">Recommended</span>
          <span className="signal-recommend-text">{recommended}</span>
        </div>
        {primary && (
          <div className="advisor-action-chips" onClick={(e) => e.stopPropagation()}>
            <button type="button" className={`action-chip type-${primary.type} primary-action`} onClick={() => onAct(primary)}>
              {primary.label}
            </button>
            {rest.length > 0 && (
              <button type="button" className="action-chip more-action" onClick={() => setMore((open) => !open)}>
                {more ? 'Fewer' : 'More'}
              </button>
            )}
          </div>
        )}
        {more && rest.length > 0 && (
          <div className="more-actions" onClick={(e) => e.stopPropagation()}>
            {rest.map((action) => (
              <button key={action.label} type="button" className="more-action-row" onClick={() => onAct(action)}>
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>
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
      <div className="review-headline">{r.headline}</div>
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
  const [recordTab, setRecordTab] = useState<'accounts' | 'planning' | 'data' | 'documents'>('accounts')
  const [showingBook, setShowingBook] = useState(true)
  const [households, setHouseholds] = useState<Household[]>(() => structuredClone(initialHouseholds))
  const [selectedHhId, setSelectedHhId] = useState(initialHouseholds[0].id)
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [clientQuery, setClientQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchIndex, setSearchIndex] = useState(0)
  const clientSearchRef = useRef<HTMLDivElement>(null)
  const [selectedExId, setSelectedExId] = useState(exceptions[0].id)
  const [selectedParaId, setSelectedParaId] = useState(paraplannerQueue[0].id)
  const [advisorFilter, setAdvisorFilter] = useState<Set<string>>(new Set())
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
  const [portalSetupOpen, setPortalSetupOpen] = useState(false)
  const [playbookMeeting, setPlaybookMeeting] = useState<Meeting | null>(null)
  const [prepBriefMeeting, setPrepBriefMeeting] = useState<Meeting | null>(null)
  const [meetingList, setMeetingList] = useState<Meeting[]>(() => structuredClone(meetingSeed))
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [integrationHubOpen, setIntegrationHubOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ComplianceDocument | null>(null)
  const [integrationList, setIntegrationList] = useState(() => loadIntegrationList())
  const [portalHouseholdId, setPortalHouseholdId] = useState(households[0].id)
  const [plans, setPlans] = useState<Record<string, PlanState>>(() => initialPlans)
  const [portfolios, setPortfolios] = useState<Record<string, PortfolioState>>(() => initialPortfolios)
  const [accounts, setAccounts] = useState<FinancialAccount[]>(() => initialAccounts)
  const [records, setRecords] = useState<Record<string, ClientOnboardingRecord>>(() => structuredClone(onboardingByHousehold))
  const [deskCases, setDeskCases] = useState(() => structuredClone(serviceCases))
  const [deskTasks, setDeskTasks] = useState(() => structuredClone(workTasks))
  // Checklist state is written by agentic steps (runAgenticStep) but no longer
  // rendered (the Record-page "Checklist and goals" panel was removed).
  const [, setDeskChecklist] = useState(() => structuredClone(collectItems))
  const [profileEdits, setProfileEdits] = useState<
    Record<string, { sentiment?: string; preferredContact?: ContactChannel[] }>
  >({})
  const [clientNotices, setClientNotices] = useState<ClientNotice[]>([])

  const household = useMemo(
    () => households.find((h) => h.id === selectedHhId) as Household,
    [households, selectedHhId],
  )

  const onboarding = records[household.id]
  const completeness = useMemo(
    () => (onboarding ? recordCompleteness(onboarding) : null),
    [onboarding],
  )

  const clientProgress = useMemo(() => householdProgress(household), [household])
  const bookProgress = useMemo(() => overallProgress(households), [households])
  const householdName = (id: string) => households.find((h) => h.id === id)?.name ?? 'Household'
  // Book-wide upcoming meetings, soonest first, each with its lead pre-meeting agent action.
  const upcomingMeetings = useMemo(
    () =>
      meetingList
        .filter((m) => m.status === 'scheduled')
        .slice()
        .sort((a, b) => a.when.localeCompare(b.when))
        .map((m) => ({
          meeting: m,
          preAction: meetingAgenticActions(m).find((a) => a.phase === 'pre' && a.state !== 'blocked'),
        })),
    [meetingList],
  )
  const drillItems = useMemo(() => buildDrillItems(household), [household])
  const drillItem = drillItems.find((d) => d.id === drillId) ?? drillItems[0] ?? null
  const hhMeetings = useMemo(() => meetingsForHousehold(household.id, meetingList), [household, meetingList])
  const hhMeetingActions = useMemo(() => openMeetingActions(household.id, meetingList), [household, meetingList])
  const hhOpenCases = useMemo(
    () => deskCases.filter((item) => item.householdId === household.id && item.status !== 'Closed'),
    [deskCases, household.id],
  )
  const hhOpenTasks = useMemo(
    () => deskTasks.filter((item) => item.householdId === household.id && item.status !== 'Completed'),
    [deskTasks, household.id],
  )
  const persons = useMemo(() => personsForHousehold(household.id), [household])
  const selectedPerson =
    persons.find((p) => p.id === selectedPersonId) ?? persons[0] ?? null
  const hhExceptions = useMemo(
    () => exceptionsForHousehold(household, exceptions.filter((e) => !resolved.has(e.id))),
    [household, resolved],
  )

  const openExceptions = exceptions.filter((e) => !resolved.has(e.id))
  const pendingNotices = clientNotices.filter((notice) => !notice.reviewed)
  // Book-wide prioritized to-do list: open exceptions (signals) + open meeting
  // actions, each carrying a recommended action, ranked by urgency then due date.
  const prioritizedTasks = useMemo(() => {
    const rank: Record<string, number> = { critical: 0, high: 1, blocked: 1, medium: 2, open: 2, low: 3 }
    const fromCases = deskCases
      .filter((item) => item.status !== 'Closed')
      .map((item) => ({
        id: `pt-case-${item.id}`,
        kind: 'case' as const,
        priority: item.priority.toLowerCase(),
        title: item.subject,
        who: `${householdName(item.householdId)}${item.origin === 'Portal' ? ' · from client portal' : ` · ${item.origin}`}`,
        recommended: item.step?.label ?? `Work the ${item.type.toLowerCase()}`,
        due: '',
        actions: (item.step
          ? [{ type: 'review_inputs', label: item.step.label, detail: item.step.result }]
          : [{ type: 'call_client', label: `Work the ${item.type.toLowerCase()}`, detail: `Open ${householdName(item.householdId)} in the work view.` }]) as AdvisorAction[],
        onOpen: () => {
          selectHousehold(item.householdId)
          setCockpitView('work')
        },
      }))
    const fromExceptions = openExceptions.map((ex) => ({
      id: `pt-ex-${ex.id}`,
      kind: 'signal' as const,
      priority: ex.priority,
      title: ex.title,
      who: ex.household,
      recommended: ex.recommendedAction,
      due: '',
      actions: ex.advisorActions,
      onOpen: () => {
        const match = households.find(
          (h) => ex.household.includes(h.name.split(' ')[0]) || h.name.includes(ex.household.split(' ')[0]),
        )
        if (match) selectHousehold(match.id)
      },
    }))
    const fromMeetings = households
      .flatMap((h) => openMeetingActions(h.id, meetingList))
      .map(({ meeting, action }) => ({
        id: `pt-ma-${action.id}`,
        kind: 'meeting' as const,
        priority: action.status === 'blocked' ? 'blocked' : 'high',
        title: action.title,
        who: `${householdName(meeting.householdId)} · from “${meeting.title}”`,
        recommended: action.recommendedReview,
        due: action.due,
        actions: [{ type: 'schedule', label: action.title, detail: action.recommendedReview }] as AdvisorAction[],
        onOpen: () => setPlaybookMeeting(meeting),
      }))
    return [...fromCases, ...fromExceptions, ...fromMeetings]
      .sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || a.due.localeCompare(b.due))
      .slice(0, 10)
  }, [households, openExceptions, meetingList, deskCases])
  const clientMatches = useMemo(() => {
    const query = clientQuery.trim().toLowerCase()
    const ranked = households
      .map((household) => {
        const people = personsForHousehold(household.id).map((person) => person.name).join(' ')
        const stage = chipStage(household)
        const text = `${household.name} ${stage} ${household.stageLabel} ${people}`.toLowerCase()
        const urgent = pendingNotices.some((notice) => notice.householdId === household.id) || household.stages.some((stageItem) => stageItem.status === 'blocked')
        return { household, stage, text, urgent }
      })
      .filter((item) => (query ? item.text.includes(query) : true))
      .sort((a, b) => Number(b.urgent) - Number(a.urgent) || a.household.name.localeCompare(b.household.name))
    return { shown: ranked.slice(0, 8), total: ranked.length }
  }, [households, clientQuery, pendingNotices])
  const activeSearchIndex = Math.min(searchIndex, Math.max(clientMatches.shown.length - 1, 0))

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!clientSearchRef.current?.contains(event.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])
  const hhNotices = pendingNotices.filter((notice) => notice.householdId === household.id)
  const selectedStage =
    household.stages.find((s) => s.id === selectedStageId) ??
    [...household.stages].reverse().find((s) => s.status !== 'upcoming') ??
    household.stages[0]
  const stageBar = selectedStage ? selectedStageProgress(household.stages, selectedStage) : null
  const selectedEx = openExceptions.find((e) => e.id === selectedExId) ?? openExceptions[0]
  const filteredParaQueue =
    advisorFilter.size === 0
      ? paraplannerQueue
      : paraplannerQueue.filter((p) => advisorFilter.has(p.advisorId))
  const selectedPara =
    filteredParaQueue.find((p) => p.id === selectedParaId) ?? filteredParaQueue[0] ?? paraplannerQueue[0]
  const advisorName = (id: string) => advisors.find((a) => a.id === id)?.name ?? id
  const advisorForHousehold = (householdId: string): string =>
    householdId === 'h2' ? 'adv-okafor' : householdId === 'h4' ? 'adv-lindqvist' : 'adv-rivera'
  // Portal-originated cases + onboarding data-gaps the paraplanner can action.
  const paraCases = useMemo(
    () =>
      deskCases
        .filter((item) => item.status !== 'Closed')
        .map((item) => ({
          id: `para-case-${item.id}`,
          caseId: item.id,
          householdId: item.householdId,
          household: householdName(item.householdId),
          advisorId: advisorForHousehold(item.householdId),
          subject: item.subject,
          origin: item.origin,
          status: item.status,
          priority: item.priority,
          action: item.step?.label ?? `Prep the ${item.type.toLowerCase()}`,
        })),
    [deskCases],
  )
  const filteredParaCases =
    advisorFilter.size === 0 ? paraCases : paraCases.filter((c) => advisorFilter.has(c.advisorId))
  function toggleAdvisorFilter(id: string) {
    setAdvisorFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const persona = personaValues[personaIdx]
  const openSection: FormSection | undefined = onboarding?.sections.find((s) => s.id === openSectionId)

  const scheduledMeetings = hhMeetings
    .filter((m) => m.status === 'scheduled')
    .slice()
    .sort((a, b) => a.when.localeCompare(b.when))
  const completedMeetings = hhMeetings.filter((m) => m.status === 'completed')

  function updateRecordField(
    householdId: string,
    sectionId: string,
    fieldKey: string,
    value: string,
    status?: FieldStatus,
    updatedBy: UpdatedBy = 'advisor',
  ) {
    setRecords((prev) => {
      const next = structuredClone(prev)
      const record = next[householdId]
      const field = record?.sections.find((section) => section.id === sectionId)?.fields.find((item) => item.key === fieldKey)
      if (!record || !field || field.status === 'n/a') return prev
      field.value = value
      if (status) field.status = status
      else if (field.status === 'missing' && value.trim()) field.status = 'partial'
      field.updatedOn = todayISO()
      field.updatedBy = updatedBy
      if (fieldKey === 'goal') record.primaryGoal = value
      if (fieldKey === 'horizon') {
        const years = Number(value.replace(/[^0-9.]/g, ''))
        record.timeHorizonYears = Number.isFinite(years) && years > 0 ? years : null
      }
      return next
    })
  }

  function runAgenticStep(step: AgenticStep, householdId: string, close: () => void) {
    for (const item of step.effects?.checklist ?? []) {
      setDeskChecklist((prev) => prev.map((row) => (row.id === item.id ? { ...row, status: item.status } : row)))
    }
    for (const field of step.effects?.records ?? []) {
      updateRecordField(householdId, field.sectionId, field.fieldKey, field.value, field.status)
    }
    const taskIds = step.effects?.completeTasks ?? []
    if (taskIds.length > 0) {
      setDeskTasks((prev) => prev.map((row) => (taskIds.includes(row.id) ? { ...row, status: 'Completed' } : row)))
    }
    close()
    flash(step.result)
  }

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
    const weakest = [...selectedPerson.facets]
      .filter((f) => LIKENESS_FACET_IDS.includes(f.id))
      .sort((a, b) => a.score - b.score)[0]
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
      const likeness = likenessScore(selectedPerson)
      setPulseDialog({
        kicker: 'Likeness',
        title: `Likeness ${likeness} · Confidence ${MATURITY_LABELS[m.tier].title} ${m.score}`,
        why: `Likeness (${likeness}) is how much we know about ${selectedPerson.name.split(' ')[0]} — the average across ${LIKENESS_FACET_IDS.length} topics (risk, goals, household complexity, tax/estate, generational readiness, share-of-wallet). Confidence (${MATURITY_LABELS[m.tier].title} · ${m.score}) is a separate measure of how fresh and verified that picture is. ${MATURITY_LABELS[m.tier].hint}`,
        agentDid: `Confidence breakdown — completeness ${m.dataCompleteness} · recency ${m.recency} · source diversity ${m.sourceDiversity} · advisor-confirmed ${m.advisorConfirmed}. Last touched ${m.lastTouched}.`,
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
            detail: 'Do not treat a thin or unconfirmed likeness as exam-ready.',
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

  /**
   * Advisor approval on a gated stage: clear this stage (complete), hand it off
   * to the agent on the next stage (active, no unblock yet), and log an audit
   * event — the human-in-the-loop release that lets the orchestrator continue.
   */
  function advanceStage(householdId: string, stageId: LifecycleStageId, approvalLabel: string) {
    let clearedLabel = ''
    let nextLabel: string | null = null
    setHouseholds((prev) =>
      prev.map((h) => {
        if (h.id !== householdId) return h
        const index = h.stages.findIndex((s) => s.id === stageId)
        if (index === -1) return h
        const stages = h.stages.map((s, i) => {
          if (i === index) {
            clearedLabel = s.label
            const { unblock, ...cleared } = s
            return { ...cleared, status: 'complete' as const, humanAction: undefined }
          }
          if (i === index + 1 && s.status === 'upcoming') {
            nextLabel = s.label
            return { ...s, status: 'active' as const }
          }
          return s
        })
        const current = stages.find((s) => s.status === 'active' || s.status === 'agent-running' || s.status === 'blocked')
        const event = {
          id: `adv-${h.id}-${stageId}-${stages.filter((s) => s.status === 'complete').length}`,
          time: 'Just now',
          agent: 'Orchestrator',
          action: `${approvalLabel} — ${clearedLabel} cleared`,
          detail: nextLabel
            ? `You approved: ${approvalLabel}. ${clearedLabel} is marked complete and the agent moved the household into ${nextLabel}.`
            : `You approved: ${approvalLabel}. ${clearedLabel} is marked complete.`,
          outcome: 'done' as const,
          stage: stageId,
        }
        return {
          ...h,
          stages,
          stage: current?.id ?? h.stage,
          stageLabel: current?.label ?? h.stageLabel,
          events: [event, ...h.events],
        }
      }),
    )
    flash(nextLabel ? `${approvalLabel} — advanced to ${nextLabel}` : `${approvalLabel} — stage complete`)
  }

  function focusException(ex: ExceptionItem, stayOnClient = false) {
    setSelectedExId(ex.id)
    const match = households.find((h) => ex.household.includes(h.name.split(' ')[0]) || h.name.includes(ex.household.split(' ')[0]))
    if (match) {
      setSelectedHhId(match.id)
      if (stayOnClient) pinHousehold(match.id)
    }
    if (stayOnClient) {
      setShowingBook(false)
      setCockpitView('work')
    } else {
      setShowingBook(true)
    }
    openDrill(`ex-${ex.id}`)
  }

  function pinHousehold(id: string) {
    setOpenTabs((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }

  function selectHousehold(id: string) {
    pinHousehold(id)
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

  function closeHouseholdTab(id: string) {
    const remaining = openTabs.filter((item) => item !== id)
    setOpenTabs(remaining)
    if (showingBook || selectedHhId !== id) return
    const index = openTabs.indexOf(id)
    const fallback = remaining[index - 1] ?? remaining[index]
    if (fallback) selectHousehold(fallback)
    else setShowingBook(true)
  }

  function toggleClient(id: string) {
    // Multi-select: toggle a client in/out of the open tabs without closing the
    // dropdown, so several can be opened from one search.
    if (openTabs.includes(id)) closeHouseholdTab(id)
    else selectHousehold(id)
  }

  function openAllMatches() {
    // Bulk companion to multi-select: open every client currently shown in the
    // dropdown at once, then focus the first one that wasn't already open.
    const ids = clientMatches.shown.map((item) => item.household.id)
    const toOpen = ids.filter((id) => !openTabs.includes(id))
    if (toOpen.length === 0) return
    setOpenTabs((prev) => [...prev, ...toOpen.filter((id) => !prev.includes(id))])
    selectHousehold(toOpen[0])
    flash(`Opened ${toOpen.length} client${toOpen.length === 1 ? '' : 's'} from this search.`)
  }

  function confirmNotice(notice: ClientNotice) {
    const next = structuredClone(records)
    const record = next[notice.householdId]
    for (const touch of notice.touched) {
      const field = record?.sections.find((section) => section.id === touch.sectionId)?.fields.find((item) => item.key === touch.fieldKey)
      if (field?.status === 'partial') {
        field.status = 'complete'
        field.updatedOn = todayISO()
        field.updatedBy = 'advisor'
      }
    }
    setRecords(next)
    setClientNotices((prev) => prev.map((item) => (item.id === notice.id ? { ...item, reviewed: true } : item)))
    flash(`Confirmed on ${notice.householdName}. The profile now treats it as reviewed.`)
  }

  function openNotice(notice: ClientNotice, confirm: boolean) {
    pinHousehold(notice.householdId)
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
      field.updatedOn = todayISO()
      field.updatedBy = 'client'
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

  function acceptServiceRequest(householdId: string, kind: string, detail: string, actionLabel: string) {
    const name = households.find((item) => item.id === householdId)?.name ?? 'Client'
    const id = `c-sr-${Date.now()}`
    setDeskCases((prev) => [
      {
        id,
        householdId,
        subject: kind,
        status: 'New',
        priority: 'High',
        origin: 'Portal',
        type: 'Service request',
        step: {
          label: actionLabel,
          result: `${name}: ${kind} is done. The case is closed.`,
        },
      },
      ...prev,
    ])
    setClientNotices((prev) => [
      {
        id: `n-${Date.now()}`,
        householdId,
        householdName: name,
        title: `Service request · ${kind}`,
        detail,
        touched: [],
        reviewed: false,
      },
      ...prev,
    ])
    pinHousehold(householdId)
    setSelectedHhId(householdId)
    setShowingBook(false)
    setCockpitView('work')
    flash(`${name} opened a case: ${kind}`)
  }

  function acceptClientRequest(householdId: string, title: string, detail: string) {
    const name = households.find((item) => item.id === householdId)?.name ?? 'Client'
    setClientNotices((prev) => [
      {
        id: `n-${Date.now()}`,
        householdId,
        householdName: name,
        title,
        detail,
        touched: [],
        reviewed: false,
      },
      ...prev,
    ])
    flash(`${name}: ${title}`)
  }

  function acceptEsign(householdId: string, documentId: string, signedName: string) {
    const householdName = households.find((item) => item.id === householdId)?.name ?? 'Client'
    const next = structuredClone(records)
    const record = next[householdId]
    const doc = record?.documents.find((item) => item.id === documentId)
    if (!record || !doc) return
    doc.status = 'filed'
    doc.filedOn = '2026-09-24'
    doc.notes = `E-signed by ${signedName}`
    const trail = record.documents.find((item) => item.id === 'esign')
    if (trail) {
      trail.status = 'filed'
      trail.filedOn = '2026-09-24'
      trail.notes = `${signedName} e-signed ${doc.name}`
    }
    const touched: ClientNotice['touched'] = []
    const setField = (sectionId: string, fieldKey: string, value: string, status: 'complete' | 'partial') => {
      const field = record.sections.find((section) => section.id === sectionId)?.fields.find((item) => item.key === fieldKey)
      if (!field || field.status === 'n/a') return
      field.value = value
      field.status = status
      field.updatedOn = '2026-09-24'
      field.updatedBy = 'client'
      touched.push({ sectionId, fieldKey })
    }
    if (documentId === 'tod') {
      setField('beneficiary', 'beneficiary', 'Jordan Chen, sibling', 'complete')
      setField('beneficiary', 'tod', 'Jordan Chen, sibling, 100% · e-signed 2026-09-24', 'complete')
      setField('custody', 'acat', 'In good order · resubmit ACAT #48291', 'complete')
      setField('funding', 'fundStatus', 'Ready to resubmit', 'partial')
      const transfer = record.documents.find((item) => item.id === 'acatForm')
      if (transfer && transfer.status !== 'filed') {
        transfer.status = 'filed'
        transfer.filedOn = '2026-09-24'
        transfer.notes = 'Released with the TOD signature. Registration matches.'
      }
    }
    if (documentId === 'custodial') {
      setField('custody', 'custAcct', `Retitle e-signed by ${signedName}`, 'partial')
    }
    setRecords(next)
    setClientNotices((prev) => [
      {
        id: `n-${Date.now()}`,
        householdId,
        householdName,
        title: `${signedName} e-signed ${doc.name}`,
        detail: 'The signature matches the registration. Resubmit the packet. The custodian had rejected it for the missing signature.',
        sectionId: 'custody',
        touched,
        reviewed: false,
      },
      ...prev,
    ])
    flash(`${signedName} signed ${doc.name}. The packet is in good order for resubmit.`)
  }

  useEffect(() => {
    saveIntegrationList(integrationList)
  }, [integrationList])

  function toggleIntegration(id: string) {
    setIntegrationList((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'connected' ? 'available' : 'connected' }
          : item,
      ),
    )
  }

  const crmConnected = integrationList.some(
    (item) => item.category === 'CRM' && item.status === 'connected',
  )

  function scheduleMeeting(input: NewMeetingInput) {
    const meeting = createMeeting(input)
    setMeetingList((prev) => [...prev, meeting])
    setScheduleOpen(false)
    pinHousehold(meeting.householdId)
    setSelectedHhId(meeting.householdId)
    setShowingBook(false)
    setCockpitView('status')
    setPlaybookMeeting(meeting)
    flash(`Scheduled “${meeting.title}” — Concierge is prepping the brief.`)
  }

  function syncMeetingActions(meeting: Meeting) {
    // Turn AI-extracted action items into tasks in the household work queue,
    // the way Jump/Zoom push follow-ups into the CRM.
    const householdId = meeting.householdId
    const newTasks = meeting.actions
      .filter((action) => action.status !== 'done')
      .map((action) => ({
        id: `t-mtg-${action.id}`,
        householdId,
        subject: action.title,
        status: (action.status === 'blocked' ? 'On Hold' : 'Not Started') as TaskStatus,
        priority: 'High' as const,
        due: action.due,
      }))
    if (newTasks.length === 0) return
    setDeskTasks((prev) => {
      const existing = new Set(prev.map((row) => row.id))
      const additions = newTasks.filter((task) => !existing.has(task.id))
      return additions.length > 0 ? [...additions, ...prev] : prev
    })
    pinHousehold(householdId)
    setSelectedHhId(householdId)
    setShowingBook(false)
    setCockpitView('work')
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
        <div className="header-top">
          <div className="version-stamp">Version: Project Mars - Initial Concept</div>
          <button type="button" className={`header-persona ${role === 'value' ? 'active' : ''}`} onClick={() => setRole('value')}>
            Persona Value &amp; Comps
          </button>
        </div>
        <div className="header-main">
        <div className="brand">
          <img
            className="brand-logo"
            src={`${import.meta.env.BASE_URL}benificial-lockup.png`}
            alt="BENiFICIAL WEALTH"
          />
          {role === 'advisor' && <span className="advisor-greet">{dayPart()}, Drew</span>}
        </div>
        <div className="header-cluster">
          <nav className="header-pills" aria-label="Role views">
            <button type="button" className={`header-pill ${role === 'advisor' ? 'active' : ''}`} onClick={() => setRole('advisor')}>
              Advisor Cockpit
            </button>
            <button type="button" className={`header-pill ${role === 'paraplanner' ? 'active' : ''}`} onClick={() => setRole('paraplanner')}>
              Paraplanner Workbench
            </button>
          </nav>
          <button
            type="button"
            className="header-pill"
            onClick={() => {
              setPortalHouseholdId(selectedHhId)
              setPortalOpen(true)
            }}
          >
            Client portal
          </button>
          <button
            type="button"
            className="header-pill"
            onClick={() => setIntegrationHubOpen(true)}
          >
            Integration Hub · {integrationList.filter((item) => item.status === 'connected').length}
          </button>
          <button
            type="button"
            className={`header-pill ${coworkerOpen ? 'active' : ''}`}
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
        </div>
        </div>
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
              <div className="client-search" ref={clientSearchRef}>
                <input
                  className="client-search-input"
                  role="combobox"
                  aria-expanded={searchOpen}
                  aria-controls="client-search-list"
                  aria-autocomplete="list"
                  aria-activedescendant={searchOpen && clientMatches.shown[activeSearchIndex] ? `client-opt-${clientMatches.shown[activeSearchIndex].household.id}` : undefined}
                  placeholder={`Find a client · ${households.length} in the book`}
                  value={clientQuery}
                  onChange={(event) => {
                    setClientQuery(event.target.value)
                    setSearchOpen(true)
                    setSearchIndex(0)
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      setSearchOpen(true)
                      setSearchIndex((index) => Math.min(index + 1, clientMatches.shown.length - 1))
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault()
                      setSearchIndex((index) => Math.max(index - 1, 0))
                    } else if (event.key === 'Enter') {
                      event.preventDefault()
                      const hit = clientMatches.shown[activeSearchIndex]
                      if (hit) toggleClient(hit.household.id)
                    } else if (event.key === 'Escape') {
                      setSearchOpen(false)
                    }
                  }}
                />
                {searchOpen && (
                  <ul className="client-search-list" id="client-search-list" role="listbox" aria-multiselectable="true" aria-label="Clients">
                    {clientMatches.shown.length === 0 && <li className="client-search-empty">No clients match.</li>}
                    {clientMatches.shown.map((item, index) => {
                      const progress = householdProgress(item.household)
                      const open = openTabs.includes(item.household.id)
                      return (
                        <li key={item.household.id}>
                          <button
                            type="button"
                            role="option"
                            id={`client-opt-${item.household.id}`}
                            aria-selected={open}
                            className={`client-search-option ${index === activeSearchIndex ? 'active' : ''} ${open ? 'selected' : ''}`}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              toggleClient(item.household.id)
                            }}
                            onMouseEnter={() => setSearchIndex(index)}
                          >
                            <span className="client-search-check" aria-hidden="true">
                              {open ? '✓' : ''}
                            </span>
                            <span className="client-search-text">
                              <strong>{item.household.name}</strong>
                              <span>
                                {item.stage} · {progress.pct}%{open ? ' · open' : ''}
                              </span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                    <li className="client-search-foot">
                      <span className="client-search-foot-text">
                        {clientQuery.trim()
                          ? `${clientMatches.shown.length} of ${clientMatches.total} · tap to open several`
                          : `${households.length} clients. Tap to open several at once.`}
                      </span>
                      {(() => {
                        const unopened = clientMatches.shown.filter((item) => !openTabs.includes(item.household.id)).length
                        if (unopened === 0) return null
                        return (
                          <button
                            type="button"
                            className="client-search-open-all"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              openAllMatches()
                            }}
                          >
                            Open all {unopened}
                          </button>
                        )
                      })()}
                    </li>
                  </ul>
                )}
              </div>
              <div className="hh-tabs" role="tablist" aria-label="Open clients">
              {openTabs.map((id) => {
                const h = households.find((item) => item.id === id)
                if (!h) return null
                const progress = householdProgress(h)
                const hasUpdate = pendingNotices.some((notice) => notice.householdId === h.id)
                const barTone = h.stages.some((stage) => stage.status === 'blocked') ? 'blocked' : progressTone(progress.pct)
                const active = !showingBook && selectedHhId === h.id
                return (
                  <div key={h.id} className={`hh-chip hh-tab ${active ? 'active' : ''}`}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className="hh-tab-open"
                      onClick={() => selectHousehold(h.id)}
                    >
                      <span className="hh-chip-name">
                        {h.name} · {chipStage(h)}
                        {hasUpdate ? ' · update' : ''}
                      </span>
                      <span className="hh-chip-progress">
                        <span className="hh-chip-track" aria-hidden="true">
                          <span className={`hh-chip-fill tone-${barTone}`} style={{ width: `${progress.pct}%` }} />
                        </span>
                        <span className="hh-chip-pct">{progress.pct}%</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hh-tab-close"
                      aria-label={`Close ${h.name}`}
                      onClick={() => closeHouseholdTab(h.id)}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              </div>
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
            <button type="button" className="portal-launch" onClick={() => setPortalSetupOpen(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M3 9h18M8 14h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Launch client portal
            </button>
            </div>
            )}

            <div className="cockpit-split no-review">
              <div className="main-col">
          {showingBook && (
            <>
              <BookPulse households={households} exceptions={openExceptions} onOpenHousehold={selectHousehold} />

              <div className="book-agenda">
                <aside className="panel book-meetings">
                  <div className="panel-header">
                    <span>Upcoming Meetings</span>
                    <button type="button" className="btn primary sm" onClick={() => setScheduleOpen(true)}>
                      + Schedule meeting
                    </button>
                  </div>
                  <ul className="book-meeting-list">
                    {upcomingMeetings.length === 0 && (
                      <li className="panel-body muted">No meetings scheduled. Use “Schedule meeting” to book one.</li>
                    )}
                    {upcomingMeetings.map(({ meeting, preAction }) => (
                      <li key={meeting.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="book-meeting-card"
                          onClick={() => setPlaybookMeeting(meeting)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setPlaybookMeeting(meeting)
                            }
                          }}
                        >
                          <div className="book-meeting-when">{meetingWhen(meeting.when)}</div>
                          <div className="book-meeting-title">{meeting.title}</div>
                          <div className="muted">
                            {householdName(meeting.householdId)} · {meeting.channel.replace('_', ' ')} · {meeting.playbookName ?? 'Meeting'}
                          </div>
                          {preAction && (
                            <>
                              <div className="book-meeting-agentic">
                                <span className="signal-recommend-label">Pre-meeting agent</span>
                                <span className="signal-recommend-text">{preAction.label} — {preAction.detail}</span>
                              </div>
                              <button
                                type="button"
                                className="action-chip type-schedule primary-action book-meeting-run"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPrepBriefMeeting(meeting)
                                }}
                              >
                                {preAction.state === 'ready' ? 'Review prep' : 'Run pre-meeting prep'}
                              </button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </aside>

                <aside className="panel book-tasks">
                  <div className="panel-header">
                    <span>Needs You</span>
                    <span className="muted">{prioritizedTasks.length + pendingNotices.length} to do</span>
                  </div>
                  <ul className="exception-list needs-you-board">
                    {pendingNotices.map((notice) => (
                      <NeedsYouCard
                        key={notice.id}
                        selected={false}
                        queueType="Portal"
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
                    {prioritizedTasks.map((task) => (
                      <NeedsYouCard
                        key={task.id}
                        selected={false}
                        queueType={task.kind === 'signal' ? 'Signal' : task.kind === 'case' ? 'Case' : 'Meeting'}
                        priority={task.priority}
                        title={task.title}
                        meta={`${task.who}${task.due ? ` · due ${task.due}` : ''}`}
                        recommended={task.recommended}
                        actions={task.actions}
                        onOpen={task.onOpen}
                        onAct={(a) => {
                          task.onOpen()
                          flash(`${actionTypeLabel(a.type)}: ${a.label}`)
                        }}
                      />
                    ))}
                    {prioritizedTasks.length === 0 && pendingNotices.length === 0 && (
                      <li className="panel-body muted">All clear — nothing needs you right now.</li>
                    )}
                  </ul>
                </aside>
              </div>
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
                    firmBusiness={
                      <FirmBusiness householdId={household.id} householdName={household.name} />
                    }
                  />
                )}

                <div className="lifecycle-block">
                  <div className="lifecycle-block-title">{household.name} — Lifecycle Stage</div>
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
                  label={`${selectedStage?.label ?? household.stageLabel} Stage Progress`}
                  detail={
                    stageBar?.detail ??
                    `${clientProgress.complete} complete · ${clientProgress.inFlight} in flight · current: ${household.stageLabel}`
                  }
                  tone={stageBar?.tone ?? progressTone(clientProgress.pct)}
                />

                <div className="hh-summary" style={{ marginTop: 12 }}>
                  {(selectedStage
                    ? stageMetrics(household, selectedStage, recordFieldMap(onboarding))
                    : []
                  ).map((m) => (
                    <div key={m.label}>
                      <div className="k">{m.label}</div>
                      <div className="v">{m.value}</div>
                    </div>
                  ))}
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

                {PLAN_STAGES.includes(selectedStage?.id ?? '') && (
                  <AdviceDesk
                    key={household.id}
                    householdId={household.id}
                    plan={plans[household.id]}
                    portfolio={portfolios[household.id]}
                    showPlan
                    showPortfolio={false}
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
              <div className="record-subtabs" role="tablist" aria-label="Record sections">
                {(
                  [
                    { id: 'accounts', label: 'Financial Accounts' },
                    { id: 'planning', label: 'Planning & Portfolio' },
                    { id: 'data', label: 'Data & Forms' },
                    { id: 'documents', label: 'Document Vault' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={recordTab === tab.id}
                    className={`record-subtab ${recordTab === tab.id ? 'active' : ''}`}
                    onClick={() => setRecordTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {recordTab === 'accounts' && (
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
              )}
              {recordTab === 'planning' && (
              <AdviceDesk
                key={`${household.id}-record`}
                householdId={household.id}
                plan={plans[household.id]}
                portfolio={portfolios[household.id]}
                showPlan
                showPortfolio
                onPlan={(patch) => setPlans((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))}
                onPortfolio={(patch) =>
                  setPortfolios((prev) => ({ ...prev, [household.id]: { ...prev[household.id], ...patch } }))
                }
              />
              )}
              {recordTab === 'data' && (
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
                      {(
                        [
                          '1_intake',
                          '2_kyc',
                          '3_custody',
                          '4_orientation',
                          'ongoing',
                        ] as const
                      )
                        .map((phase) => ({
                          phase,
                          sections: onboarding.sections.filter((s) => s.phase === phase),
                        }))
                        .filter((group) => group.sections.length > 0)
                        .map((group) => {
                          const phaseSections = group.sections
                          const avgPct = Math.round(
                            phaseSections.reduce(
                              (sum, s) =>
                                sum + (completeness.sectionStats.find((x) => x.id === s.id)?.pct ?? 0),
                              0,
                            ) / phaseSections.length,
                          )
                          return (
                            <div key={group.phase} className="section-phase">
                              <div className="section-phase-head">
                                <span>{PHASE_LABELS[group.phase]}</span>
                                <span className="section-phase-pct">{avgPct}%</span>
                              </div>
                              {phaseSections.map((s) => {
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
                                <td>
                                  {f.status === 'n/a' ? (
                                    f.value || '—'
                                  ) : (
                                    <input
                                      className="field-edit"
                                      aria-label={f.label}
                                      value={f.value}
                                      onChange={(event) =>
                                        updateRecordField(household.id, openSection.id, f.key, event.target.value)
                                      }
                                    />
                                  )}
                                </td>
                                <td>
                                  {f.status === 'n/a' ? (
                                    <span className="badge medium">n/a</span>
                                  ) : (
                                    <select
                                      className="field-edit"
                                      aria-label={`${f.label} status`}
                                      value={f.status}
                                      onChange={(event) =>
                                        updateRecordField(
                                          household.id,
                                          openSection.id,
                                          f.key,
                                          f.value,
                                          event.target.value as FieldStatus,
                                        )
                                      }
                                    >
                                      <option value="complete">complete</option>
                                      <option value="partial">partial</option>
                                      <option value="missing">missing</option>
                                      <option value="blocked">blocked</option>
                                    </select>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {recordTab === 'documents' && (
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
                    {documentsByStage(onboarding.documents).map((group) => (
                      <div key={group.stage} className="doc-stage-group">
                        <div className="doc-stage-label">
                          <span>{group.label}</span>
                          <span className="muted">{group.documents.length}</span>
                        </div>
                        <ul className="doc-list">
                          {group.documents.map((d) => {
                            const prov = docProvenance(d.id)
                            return (
                              <li key={d.id}>
                                <button
                                  type="button"
                                  className="doc-btn"
                                  onClick={() => {
                                    setPreviewDoc(d)
                                    openDrill(`doc-${d.id}`)
                                  }}
                                >
                                  <div className="doc-name">
                                    {d.name}
                                    <span className="doc-preview-hint">
                                      {d.status === 'filed' ? 'View filed copy' : 'Preview draft'} →
                                    </span>
                                  </div>
                                  <div className="doc-meta">
                                    <span className={`badge ${docStatusClass(d.status)}`}>{d.status}</span>
                                    <span className="doc-source-tag">Source · {prov.source}</span>
                                    {d.filedOn && <span className="muted">Filed {d.filedOn}</span>}
                                    {d.notes && <span className="muted">{d.notes}</span>}
                                  </div>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            )}

            {!showingBook && cockpitView === 'status' && (
            <div className="panel">
              <div className="panel-header">
                <span>Meeting Management</span>
                <span className="panel-header-tail">
                  <span className="muted">
                    {scheduledMeetings.length} upcoming · {hhMeetingActions.length} open actions
                  </span>
                  <button type="button" className="btn primary sm" onClick={() => setScheduleOpen(true)}>
                    + Schedule
                  </button>
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
                        onClick={() => setPlaybookMeeting(m)}
                      >
                        <div className="meeting-title">{m.title}</div>
                        <div className="muted">
                          {m.when.replace('T', ' · ')} · {m.channel.replace('_', ' ')}
                        </div>
                        <div className="muted">{m.playbookName ?? 'Meeting playbook'}</div>
                        {m.preBrief && (
                          <ul className="brief-lines">
                            {m.preBrief.slice(0, 4).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                        {hhOpenCases[0] && <div className="muted">Case · {hhOpenCases[0].subject}</div>}
                        {hhOpenTasks[0] && <div className="muted">Task · {hhOpenTasks[0].subject}</div>}
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
                        onClick={() => setPlaybookMeeting(m)}
                      >
                        <div className="meeting-title">{m.title}</div>
                        <div className="muted">{m.when.replace('T', ' · ')}</div>
                        <div className="muted">{m.playbookName ?? 'Meeting playbook'}</div>
                        {m.nextSteps && (
                          <ul className="brief-lines">
                            {m.nextSteps.slice(0, 4).map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                        {hhOpenCases[0] && <div className="muted">Case · {hhOpenCases[0].subject}</div>}
                        {hhOpenTasks[0] && <div className="muted">Task · {hhOpenTasks[0].subject}</div>}
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
              <>
              <div className="work-split">
                <div className="panel">
                  <div className="panel-header">
                    <span>What the agents did</span>
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
                    <span>Work queue</span>
                    <span className="muted">
                      {hhExceptions.length +
                        hhNotices.length +
                        household.events.filter(
                          (ev) => ev.outcome === 'needs_you' && !hhExceptions.some((ex) => ex.stage === ev.stage),
                        ).length +
                        hhOpenCases.length +
                        hhOpenTasks.length}{' '}
                      open
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
                        .filter((ev) => ev.outcome === 'needs_you' && !hhExceptions.some((ex) => ex.stage === ev.stage))
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
                        household.events.every((ev) => ev.outcome !== 'needs_you') &&
                        hhOpenCases.length === 0 &&
                        hhOpenTasks.length === 0 && (
                          <li className="panel-body muted">No open work for this household.</li>
                        )}
                      {hhOpenCases.map((item) => {
                        const step = item.step ?? caseSteps[item.id]
                        return (
                          <li key={item.id} className="queue-row">
                            <span className="queue-type">Case</span>
                            <span className="queue-title">{item.subject}</span>
                            <select
                              className="field-edit queue-edit"
                              aria-label={`${item.subject} status`}
                              value={item.status}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                setDeskCases((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id ? { ...row, status: event.target.value as CaseStatus } : row,
                                  ),
                                )
                              }
                            >
                              <option>New</option>
                              <option>Working</option>
                              <option>Waiting on client</option>
                              <option>Escalated</option>
                              <option>Closed</option>
                            </select>
                            {step && (
                              <div className="queue-recommend">
                                <span className="signal-recommend-label">Agent recommends</span>
                                <button
                                  type="button"
                                  className="action-chip primary-action"
                                  onClick={() =>
                                    runAgenticStep(step, item.householdId, () =>
                                      setDeskCases((prev) =>
                                        prev.map((row) => (row.id === item.id ? { ...row, status: 'Closed' } : row)),
                                      ),
                                    )
                                  }
                                >
                                  {step.label}
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                      {hhOpenTasks.map((item) => {
                        const step = taskSteps[item.id]
                        return (
                          <li key={item.id} className="queue-row">
                            <span className="queue-type">Task</span>
                            <span className="queue-title">{item.subject}</span>
                            <select
                              className="field-edit queue-edit"
                              aria-label={`${item.subject} status`}
                              value={item.status}
                              onChange={(event) =>
                                setDeskTasks((prev) =>
                                  prev.map((row) =>
                                    row.id === item.id ? { ...row, status: event.target.value as TaskStatus } : row,
                                  ),
                                )
                              }
                            >
                              <option>Not Started</option>
                              <option>In Progress</option>
                              <option>On Hold</option>
                              <option>Completed</option>
                            </select>
                            {step && (
                              <div className="queue-recommend">
                                <span className="signal-recommend-label">Agent recommends</span>
                                <button
                                  type="button"
                                  className="action-chip primary-action"
                                  onClick={() =>
                                    runAgenticStep(step, item.householdId, () =>
                                      setDeskTasks((prev) =>
                                        prev.map((row) => (row.id === item.id ? { ...row, status: 'Completed' } : row)),
                                      ),
                                    )
                                  }
                                >
                                  {step.label}
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
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
                            const weakest = [...selectedPerson.facets]
                              .filter((f) => LIKENESS_FACET_IDS.includes(f.id))
                              .sort((a, b) => a.score - b.score)[0]
                            openDrill(`likeness-${selectedPerson.id}-${weakest.id}`)
                            return
                          }
                          if (selectedEx && drillItem?.kind === 'exception' && label.includes('Approve')) {
                            approveException(selectedEx)
                            return
                          }
                          if (
                            drillItem?.kind === 'stage' &&
                            drillItem.stage?.humanAction &&
                            (drillItem.stage.status === 'blocked' ||
                              drillItem.stage.status === 'active' ||
                              drillItem.stage.status === 'agent-running') &&
                            label === drillItem.stage.humanAction
                          ) {
                            advanceStage(household.id, drillItem.stage.id, label)
                            return
                          }
                          flash(label)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              </>
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
              <div className="para-toolbar">
                <div className="advisor-filter">
                  <span className="advisor-filter-label">Supporting advisor</span>
                  <div className="advisor-chips">
                    <button
                      type="button"
                      className={`advisor-chip ${advisorFilter.size === 0 ? 'active' : ''}`}
                      onClick={() => setAdvisorFilter(new Set())}
                    >
                      All advisors
                      <span className="advisor-chip-count">{paraplannerQueue.length}</span>
                    </button>
                    {advisors.map((adv) => {
                      const count = paraplannerQueue.filter((p) => p.advisorId === adv.id).length
                      const active = advisorFilter.has(adv.id)
                      return (
                        <button
                          key={adv.id}
                          type="button"
                          className={`advisor-chip ${active ? 'active' : ''}`}
                          onClick={() => toggleAdvisorFilter(adv.id)}
                          title={adv.book}
                        >
                          <span className="advisor-avatar" aria-hidden="true">{adv.initials}</span>
                          {adv.name}
                          <span className="advisor-chip-count">{count}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="para-quick-create">
                  <span className="muted">Draft with agent:</span>
                  {(['IPS', 'Proposal', 'Annual Review', 'Estate Memo'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="btn ghost sm"
                      onClick={() =>
                        flash(
                          `Agent is drafting a new ${t}${
                            advisorFilter.size === 1
                              ? ` for ${advisorName([...advisorFilter][0])}’s book`
                              : ''
                          } — citations pulled from the fact-find.`,
                        )
                      }
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              {filteredParaCases.length > 0 && (
                <div className="para-cases">
                  <div className="para-cases-head">
                    <strong>Client requests from the portal</strong>
                    <span className="muted">{filteredParaCases.length} open · shared with the advisor’s work list</span>
                  </div>
                  <ul className="para-cases-list">
                    {filteredParaCases.map((c) => (
                      <li key={c.id} className="para-case-row">
                        <span className={`badge ${c.priority.toLowerCase()}`}>{c.priority}</span>
                        <span className="para-case-body">
                          <strong>{c.subject}</strong>
                          <em>
                            {c.household} · {advisorName(c.advisorId)} · {c.origin === 'Portal' ? 'from client portal' : c.origin} · {c.status}
                          </em>
                        </span>
                        <span className="para-case-actions">
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => {
                              setDeskCases((prev) =>
                                prev.map((row) => (row.id === c.caseId ? { ...row, status: 'Working' } : row)),
                              )
                              flash(`${c.action} — ${c.household}. Marked Working for ${advisorName(c.advisorId)}.`)
                            }}
                          >
                            {c.action}
                          </button>
                          <button
                            type="button"
                            className="btn success sm"
                            onClick={() => {
                              setDeskCases((prev) =>
                                prev.map((row) => (row.id === c.caseId ? { ...row, status: 'Waiting on client' } : row)),
                              )
                              flash(`Prepped ${c.subject} for ${c.household} — handed back to ${advisorName(c.advisorId)}.`)
                            }}
                          >
                            Ready for advisor
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <table className="para-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Household</th>
                    <th>Advisor</th>
                    <th>Status</th>
                    <th>Est. Time Saved</th>
                    <th aria-label="Quick actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredParaQueue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted" style={{ textAlign: 'center', padding: '18px' }}>
                        No deliverables for the selected advisor.
                      </td>
                    </tr>
                  )}
                  {filteredParaQueue.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedPara.id === row.id ? 'selected' : ''}
                      onClick={() => setSelectedParaId(row.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <strong>{row.type}</strong>
                      </td>
                      <td>{row.household}</td>
                      <td>
                        <span className="para-advisor">
                          <span className="advisor-avatar sm" aria-hidden="true">
                            {advisors.find((a) => a.id === row.advisorId)?.initials ?? '—'}
                          </span>
                          {advisorName(row.advisorId)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${row.status === 'approved' ? 'done' : row.status === 'needs_review' ? 'needs' : 'medium'}`}>
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{row.estMinutesSaved} min</td>
                      <td className="para-row-actions" onClick={(e) => e.stopPropagation()}>
                        {row.status === 'awaiting_data' ? (
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => flash(`Requested missing data for ${row.household}`)}
                          >
                            Request data
                          </button>
                        ) : row.status === 'approved' ? (
                          <button
                            type="button"
                            className="btn ghost sm"
                            onClick={() => flash(`Opened filed ${row.type} for ${row.household}`)}
                          >
                            Open filed
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => flash(`Opened ${row.type} draft for ${row.household}`)}
                            >
                              Open draft
                            </button>
                            <button
                              type="button"
                              className="btn success sm"
                              onClick={() => flash(`Marked ${row.type} ready for advisor`)}
                            >
                              Ready
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="para-detail" style={{ marginTop: 16 }}>
                <div className="para-detail-head">
                  <strong>{selectedPara.type} · {selectedPara.household}</strong>
                  <span className="para-advisor">
                    <span className="advisor-avatar sm" aria-hidden="true">
                      {advisors.find((a) => a.id === selectedPara.advisorId)?.initials ?? '—'}
                    </span>
                    {advisorName(selectedPara.advisorId)}
                  </span>
                </div>
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
              (including generational readiness), signal-only recommended actions, and unblock paths on blocked stages —
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
                <strong className="eyebrow">Today’s Pain</strong>
                <ul>
                  {persona.pains.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong className="eyebrow">CLM Value</strong>
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
                  <div style={{ color: 'var(--sf-green)', fontWeight: 600 }}>{m.after}</div>
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

          <div className="panel" style={{ margin: '0 12px 12px' }}>
            <div className="panel-header">
              <span>Investor Portals — Client-Facing Experience</span>
              <span className="muted">Portal players FSC CLM must match & surpass</span>
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
                  {portalPlayers.map((c) => (
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
          edits={profileEdits}
          onContact={(key, value) => {
            if (onboarding) updateRecordField(household.id, 'client_details', key, value)
          }}
          onProfile={(personId, patch) => setProfileEdits((prev) => ({ ...prev, [personId]: { ...prev[personId], ...patch } }))}
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
          onAct={(action) => {
            if (action.resolves) advanceStage(household.id, stageModal.id, action.label)
            else flash(action.label)
            setStageModal(null)
          }}
        />
      )}

      {playbookMeeting && (
        <MeetingWorkspace
          meeting={playbookMeeting}
          crmConnected={crmConnected}
          onClose={() => setPlaybookMeeting(null)}
          onFlash={flash}
          onSyncActions={(meeting) => {
            syncMeetingActions(meeting)
            setPlaybookMeeting(null)
          }}
        />
      )}

      {prepBriefMeeting && (
        <MeetingPrepBrief
          meeting={prepBriefMeeting}
          householdName={householdName(prepBriefMeeting.householdId)}
          openCases={deskCases.filter(
            (c) => c.householdId === prepBriefMeeting.householdId && c.status !== 'Closed',
          )}
          openSignals={exceptionsForHousehold(
            households.find((h) => h.id === prepBriefMeeting.householdId) ?? household,
            openExceptions,
          ).map<PrepSignal>((ex) => ({
            id: ex.id,
            title: ex.title,
            priority: ex.priority,
            recommended: ex.recommendedAction,
          }))}
          openActions={openMeetingActions(prepBriefMeeting.householdId, meetingList).map((x) => x.action)}
          onClose={() => setPrepBriefMeeting(null)}
          onFlash={flash}
          onOpenWorkspace={() => setPlaybookMeeting(prepBriefMeeting)}
        />
      )}

      {scheduleOpen && (
        <ScheduleMeeting
          households={households}
          defaultHouseholdId={showingBook ? households[0].id : household.id}
          onClose={() => setScheduleOpen(false)}
          onCreate={scheduleMeeting}
        />
      )}

      {integrationHubOpen && (
        <IntegrationHub
          integrations={integrationList}
          onToggle={toggleIntegration}
          onClose={() => setIntegrationHubOpen(false)}
          onFlash={flash}
        />
      )}
      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          record={onboarding}
          householdName={household.name}
          onClose={() => setPreviewDoc(null)}
          onFlash={flash}
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
          portfolios={portfolios}
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
          onSignDocument={acceptEsign}
          onClientRequest={acceptClientRequest}
          onServiceRequest={acceptServiceRequest}
          serviceRequests={deskCases.filter((item) => item.householdId === portalHouseholdId && item.type === 'Service request')}
        />
      )}
      {portalSetupOpen && <PortalSetup household={household} onClose={() => setPortalSetupOpen(false)} />}
    </div>
  )
}
