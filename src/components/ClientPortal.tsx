import { useEffect, useState } from 'react'
import { personsForHousehold } from '../data/portraits'
import type { Household } from '../data/types'
import type { PlanState, PortfolioState } from '../data/advice'
import { goalProgress } from '../data/advice'
import { AdviceDesk } from './AdviceDesk'
import type { ClientOnboardingRecord, ComplianceDocument, FormSection } from '../data/onboardingFramework'
import {
  DOC_TYPE_LABEL,
  documentsByStage,
  docProvenance,
  fieldUpdate,
  recordCompleteness,
  PHASE_LABELS,
  UPDATED_BY_LABEL,
} from '../data/onboardingFramework'
import {
  accountBalance,
  accountTotals,
  accountsFromPlaid,
  accountFromManual,
  plaidInstitutions,
  usd,
  type AccountType,
  type FinancialAccount,
  type LedgerTxn,
  type PlaidOffer,
} from '../data/accounts'
import type { ServiceCase } from '../data/serviceDesk'
import type { CoworkerContext } from '../coworker'
import { AccountBook } from './AccountBook'
import { CoworkerPanel } from './CoworkerPanel'
import { FileDrop, type UploadedFile } from './FileDrop'
import { MessageCenter } from './MessageCenter'
import { SecurityCenter } from './SecurityCenter'
import { CashFlowPanel } from './PlanningSuite'
import { GoalsReport, WellbeingCard } from './ClientOutcomes'
import { PerformancePanel } from './PerformancePanel'
import { assessMoveRisk, oneTimeCode } from '../data/security'
import type { useEngagement } from '../useEngagement'

type PortalView = 'home' | 'plan' | 'portfolio' | 'messages' | 'security' | 'request' | 'vault' | 'facts' | 'ask'
type RangeId = '1D' | '1W' | '1M' | '1Y' | 'All'
type ActivityFilter = 'all' | 'transfer' | 'trade' | 'income'

// ── Client-facing language (portal-local; never touches advisor views) ──────
// Warm, plain-language phase names. The internal `ongoing` phase is intentionally
// omitted — the client's onboarding never surfaces it.
const PORTAL_PHASE_LABEL: Partial<Record<FormSection['phase'], string>> = {
  '1_intake': 'Welcome & agreements',
  '2_kyc': 'Verifying your details',
  '3_custody': 'Opening & funding',
  '4_orientation': "You're all set",
}

// Fields the client can actually provide themselves. Everything else (compliance
// screens, principal approval, custodian/back-office, billing) is internal and is
// hidden from the "what we still need from you" list.
const CLIENT_ACTIONABLE_FIELDS = new Set<string>([
  // personal details
  'firstName', 'lastName', 'dob', 'ssn', 'email', 'phone', 'address',
  'employer', 'title', 'citizenship',
  // financial picture the client answers
  'goal', 'horizon', 'netWorth', 'income', 'liquidity', 'investable',
  'riskTol', 'experience', 'objective',
  // beneficiaries & trusted contact
  'beneficiary', 'benShare', 'contingent', 'tod', 'trusted',
  // funding / bank details the client supplies
  'fundMethod', 'fundAmt', 'bankName', 'routing', 'bankTitle',
  // orientation scheduling
  'orientDate',
])

// Warm status chips for profile fields — no raw enum text like "missing"/"blocked".
function clientFieldChip(status: string): { label: string; tone: string } {
  if (status === 'missing') return { label: 'Needs your info', tone: 'needs' }
  if (status === 'partial') return { label: 'Almost there', tone: 'progress' }
  if (status === 'blocked') return { label: 'With your advisor', tone: 'advisor' }
  return { label: 'Done', tone: 'done' }
}

// Warm status chips for documents — mirrors the field chips, client-friendly.
function clientDocChip(status: ComplianceDocument['status']): { label: string; tone: string } {
  if (status === 'needs_signature') return { label: 'Ready to sign', tone: 'sign' }
  if (status === 'pending' || status === 'nigo') return { label: 'In review', tone: 'progress' }
  if (status === 'filed') return { label: 'Done', tone: 'done' }
  return { label: 'Coming soon', tone: 'upcoming' }
}

const SERVICE_KINDS = [
  { id: 'beneficiary', label: 'Change a beneficiary', action: 'Review the beneficiary change' },
  { id: 'move', label: 'Move money', action: 'Review the money movement request' },
  { id: 'transfer', label: 'Question about a transfer', action: 'Answer the transfer question' },
  { id: 'meeting', label: 'Schedule a meeting', action: 'Book the meeting' },
  { id: 'statement', label: 'Send a statement or tax form', action: 'Send the requested document' },
  { id: 'other', label: 'Something else', action: 'Respond to the request' },
  { id: 'address', label: 'Update my address', action: 'Update the address on the file' },
] as const

// Client-facing meeting types, mirroring the advisor Meeting Concierge.
const MEETING_TYPES = [
  { id: 'discovery', label: 'Discovery / planning' },
  { id: 'annual_review', label: 'Annual review' },
  { id: 'proposal', label: 'Proposal / IPS review' },
  { id: 'service', label: 'Service check-in' },
  { id: 'estate', label: 'Estate / beneficiary' },
] as const

// Channels mirror ScheduleMeeting (video → Zoom, phone → RingCentral, in person).
const MEETING_CHANNELS = [
  { id: 'video', label: 'Video', via: 'Zoom' },
  { id: 'phone', label: 'Phone', via: 'RingCentral' },
  { id: 'in_person', label: 'In person', via: 'Mobile notetaker' },
] as const

// Mock address book for the type-ahead. In production this would be a
// geocoding / address-autocomplete provider (e.g. Google Places, Smarty).
const ADDRESS_SUGGESTIONS = [
  '400 University Ave, Palo Alto, CA 94301',
  '2100 Broadway, Oakland, CA 94612',
  '88 Folsom St, San Francisco, CA 94105',
  '1 Market St, San Francisco, CA 94105',
  '350 Mission St, San Francisco, CA 94105',
  '12 Gramercy Park, New York, NY 10003',
  '1600 Amphitheatre Pkwy, Mountain View, CA 94043',
  '500 Terry A Francois Blvd, San Francisco, CA 94158',
  '233 S Wacker Dr, Chicago, IL 60606',
  '1101 Pennsylvania Ave NW, Washington, DC 20004',
]

type BeneficiaryRow = {
  name: string
  addressPhone: string
  birthDate: string
  ssn: string
  relationship: string
  percent: string
  type: 'primary' | 'contingent'
}

const EMPTY_BENEFICIARY: BeneficiaryRow = {
  name: '',
  addressPhone: '',
  birthDate: '',
  ssn: '',
  relationship: '',
  percent: '',
  type: 'primary',
}

const RANGES: RangeId[] = ['1D', '1W', '1M', '1Y', 'All']

function clientName(householdId: string, fallback: string) {
  const people = personsForHousehold(householdId)
  const client = people.find((person) => !person.profile.deceased) ?? people[0]
  return client?.name ?? fallback
}

function dayPart() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function performanceSeries(total: number, range: RangeId) {
  const points = range === '1D' ? 16 : range === '1W' ? 7 : range === '1M' ? 18 : range === '1Y' ? 12 : 20
  const drift = range === '1D' ? 0.006 : range === '1W' ? 0.014 : range === '1M' ? 0.028 : range === '1Y' ? 0.08 : 0.18
  const values: number[] = []
  for (let i = 0; i < points; i += 1) {
    const t = points <= 1 ? 1 : i / (points - 1)
    const wave = Math.sin(i * 1.3 + total / 100000) * total * 0.006
    values.push(Math.max(0, total * (1 - drift + drift * t) + wave))
  }
  if (values.length > 0) values[values.length - 1] = total
  return values
}

function chartPath(values: number[]) {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 32 - ((value - min) / span) * 26
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function activityBucket(type: LedgerTxn['type']): ActivityFilter {
  if (type === 'Transfer' || type === 'Contribution') return 'transfer'
  if (type === 'Buy' || type === 'Sell' || type === 'Fee') return 'trade'
  return 'income'
}

function ActivityList({
  rows,
}: {
  rows: { id: string; date: string; type: string; description: string; amount: number; account: FinancialAccount }[]
}) {
  if (rows.length === 0) return null
  return (
    <ul className="portal-activity">
      {rows.map((row) => (
        <li key={row.id}>
          <span>
            <strong>{row.description}</strong>
            <em>
              {row.date} · {row.account.institution} ···{row.account.mask} · {row.type}
            </em>
          </span>
          <strong className={row.amount >= 0 ? 'up' : 'down'}>
            {row.amount >= 0 ? '+' : '−'}
            {usd(Math.abs(row.amount))}
          </strong>
        </li>
      ))}
    </ul>
  )
}

export function ClientPortal({
  households,
  householdId,
  plans,
  portfolios,
  records,
  accounts,
  coworker,
  onSwitch,
  onClose,
  onAddAccounts,
  onUpdateField,
  onSignDocument,
  onServiceRequest,
  serviceRequests,
  engagement,
}: {
  households: Household[]
  householdId: string
  plans: Record<string, PlanState>
  portfolios: Record<string, PortfolioState>
  records: Record<string, ClientOnboardingRecord>
  accounts: FinancialAccount[]
  coworker: CoworkerContext
  onSwitch: (id: string) => void
  onClose: () => void
  onAddAccounts: (accounts: FinancialAccount[]) => void
  onUpdateField: (householdId: string, sectionId: string, fieldKey: string, label: string, value: string) => void
  onSignDocument: (householdId: string, documentId: string, signedName: string) => void
  onClientRequest: (householdId: string, title: string, detail: string) => void
  onServiceRequest: (householdId: string, kind: string, detail: string, actionLabel: string) => void
  serviceRequests: ServiceCase[]
  engagement: ReturnType<typeof useEngagement>
}) {
  const household = households.find((item) => item.id === householdId) ?? households[0]
  const plan = plans[household.id]
  const portfolio = portfolios[household.id]
  const record = records[household.id]
  const currentAddress =
    record?.sections
      .find((section) => section.id === 'client_details')
      ?.fields.find((field) => field.key === 'address')?.value ||
    personsForHousehold(household.id).find((person) => !person.profile.deceased)?.profile.address ||
    'Not on file'
  const mine = accounts.filter((account) => account.householdId === household.id)
  const totals = accountTotals(mine)
  const [view, setView] = useState<PortalView>('home')
  const [range, setRange] = useState<RangeId>('1M')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [openAccountId, setOpenAccountId] = useState<string | null>(null)
  const [plaid, setPlaid] = useState<PlaidOffer | 'pick' | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [sent, setSent] = useState<Record<string, string>>({})
  const [signingId, setSigningId] = useState<string | null>(null)
  const [signName, setSignName] = useState('')
  const [signConsent, setSignConsent] = useState(false)
  const [signError, setSignError] = useState('')
  const [moveFrom, setMoveFrom] = useState('')
  const [moveAmount, setMoveAmount] = useState('')
  const [moveNote, setMoveNote] = useState('')
  const [stepUp, setStepUp] = useState<{ amount: number; accountId: string; reasons: string[]; callback: boolean } | null>(null)
  const [stepCode, setStepCode] = useState('')
  const [stepError, setStepError] = useState('')
  const securityProfile = engagement.security[household.id]
  const clientThreads = engagement.threads.filter((thread) => thread.householdId === household.id)
  const unreadMessages = clientThreads.filter((thread) => !thread.clientRead).length
  const [requestKind, setRequestKind] = useState<(typeof SERVICE_KINDS)[number]['id']>('address')
  const [requestDetail, setRequestDetail] = useState('')
  const [requestSent, setRequestSent] = useState('')
  const [meetingType, setMeetingType] = useState<(typeof MEETING_TYPES)[number]['id']>('discovery')
  const [meetingDate, setMeetingDate] = useState('2026-10-01')
  const [meetingTime, setMeetingTime] = useState('10:00')
  const [meetingChannel, setMeetingChannel] = useState<(typeof MEETING_CHANNELS)[number]['id']>('video')
  const [meetingNote, setMeetingNote] = useState('')
  const [requestFiles, setRequestFiles] = useState<UploadedFile[]>([])
  const [vaultFiles, setVaultFiles] = useState<UploadedFile[]>([])
  const [vaultUploaded, setVaultUploaded] = useState('')
  const [addressQuery, setAddressQuery] = useState('')
  const [addressPicked, setAddressPicked] = useState('')
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([{ ...EMPTY_BENEFICIARY }])

  useEffect(() => {
    setSigningId(null)
    setSignName('')
    setSignConsent(false)
    setSignError('')
    setRequestSent('')
    setRequestDetail('')
    setMeetingNote('')
    setRequestFiles([])
    setVaultFiles([])
    setVaultUploaded('')
    setOpenAccountId(null)
    setAddressQuery('')
    setAddressPicked('')
    setBeneficiaries([{ ...EMPTY_BENEFICIARY }])
  }, [household.id])

  const fileFields =
    record?.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.status !== 'n/a')
        .map((field) => {
          const update = fieldUpdate(field, household.id)
          return {
            id: `${section.id}-${field.key}`,
            sectionId: section.id,
            fieldKey: field.key,
            label: field.label,
            status: field.status,
            section: section.label,
            value: field.value,
            updatedOn: update.on,
            updatedBy: update.by,
          }
        }),
    ) ?? []

  const gaps = fileFields.filter((field) => field.status === 'missing' || field.status === 'partial' || field.status === 'blocked')
  // Only the gaps the client can act on — internal compliance/back-office items
  // (EDD, principal approval, CIP/OFAC, custodian ops, billing) are hidden.
  const clientGaps = gaps.filter((field) => CLIENT_ACTIONABLE_FIELDS.has(field.fieldKey))

  const toSign = (record?.documents ?? []).filter((doc) => doc.status === 'needs_signature').length
  const signing = record?.documents.find((doc) => doc.id === signingId) ?? null

  // ── Onboarding progress (client-facing view of where they are) ──────────
  const completeness = record ? recordCompleteness(record) : null
  const onboardingActive = !!(record && completeness && completeness.pct < 100)
  // Client tracker shows only the four onboarding phases in plain language; the
  // internal `ongoing` phase is never surfaced to the client.
  const phaseOrder: FormSection['phase'][] = ['1_intake', '2_kyc', '3_custody', '4_orientation']
  const onboardingPhases = record
    ? phaseOrder
        .map((phase) => {
          const sections = record.sections.filter((section) => section.phase === phase)
          if (sections.length === 0) return null
          const stats = (completeness?.sectionStats ?? []).filter((s) => s.phase === phase)
          const avg = stats.length ? Math.round(stats.reduce((sum, s) => sum + s.pct, 0) / stats.length) : 100
          return { phase, label: PORTAL_PHASE_LABEL[phase] ?? PHASE_LABELS[phase], sections, pct: avg }
        })
        .filter((entry): entry is { phase: FormSection['phase']; label: string; sections: FormSection[]; pct: number } => entry != null)
    : []
  // The active phase is the one the client's current lifecycle stage lives in
  // (mapped via each section's stageIds), not merely the first phase under 100%.
  // A near-complete earlier phase (e.g. 98%) should not steal the highlight from
  // the phase the client is genuinely in. Fall back to first-incomplete if the
  // current stage can't be located in any phase.
  const phaseForCurrentStage = onboardingPhases.find((entry) =>
    entry.sections.some((section) => section.stageIds.includes(household.stage)),
  )
  const activePhase =
    phaseForCurrentStage ??
    onboardingPhases.find((entry) => entry.pct < 100) ??
    onboardingPhases[onboardingPhases.length - 1] ??
    null
  // Outstanding docs the client can see, signature-required first.
  const outstandingDocs = (record?.documents ?? [])
    .filter((doc) => doc.status !== 'filed')
    .sort((a, b) => (a.status === 'needs_signature' ? 0 : 1) - (b.status === 'needs_signature' ? 0 : 1))
  const nextSteps: { id: string; label: string; go: () => void }[] = []
  if (record) {
    if (toSign > 0) nextSteps.push({ id: 'sign', label: `Sign ${toSign} document${toSign === 1 ? '' : 's'} waiting on you`, go: () => setView('vault') })
    if (clientGaps.length > 0) nextSteps.push({ id: 'facts', label: `Confirm ${clientGaps.length} detail${clientGaps.length === 1 ? '' : 's'} your advisor needs`, go: () => setView('facts') })
    if (mine.length === 0) nextSteps.push({ id: 'fund', label: 'Connect or fund an account to get invested', go: () => setView('home') })
    if (nextSteps.length === 0) nextSteps.push({ id: 'wait', label: 'Nothing needed right now — your advisor is preparing the next step', go: () => setView('ask') })
  }

  function addPlaid(offer: PlaidOffer) {
    onAddAccounts(accountsFromPlaid(household.id, offer))
    setPlaid(null)
  }

  function submitSignature(doc: ComplianceDocument) {
    const expected = doc.signerName ?? ''
    if (!signConsent) {
      setSignError('Confirm that you agree to sign electronically.')
      return
    }
    if (signName.trim().toLowerCase() !== expected.toLowerCase()) {
      setSignError(`Type ${expected} to match the account registration.`)
      return
    }
    onSignDocument(household.id, doc.id, signName.trim())
    setSigningId(null)
    setSignName('')
    setSignConsent(false)
    setSignError('')
  }

  const series = performanceSeries(totals.total, range)
  const seriesStart = series[0] ?? totals.total
  const change = totals.total - seriesStart
  const changePct = seriesStart === 0 ? 0 : (change / seriesStart) * 100
  const up = change >= 0
  const cash = mine.reduce(
    (sum, account) =>
      sum + account.holdings.filter((holding) => holding.symbol === 'CASH').reduce((inner, holding) => inner + holding.value, 0),
    0,
  )
  const positions = [
    ...mine
      .reduce((map, account) => {
        for (const holding of account.holdings) {
          if (holding.symbol === 'CASH') continue
          const row = map.get(holding.symbol) ?? { symbol: holding.symbol, name: holding.name, value: 0, shares: 0 }
          row.value += holding.value
          row.shares += holding.shares
          map.set(holding.symbol, row)
        }
        return map
      }, new Map<string, { symbol: string; name: string; value: number; shares: number }>())
      .values(),
  ].sort((a, b) => b.value - a.value)
  const activity = mine
    .flatMap((account) => account.transactions.map((txn) => ({ ...txn, account })))
    .sort((a, b) => b.date.localeCompare(a.date))
  const visibleActivity = activity.filter((item) => activityFilter === 'all' || activityBucket(item.type) === activityFilter)
  const openAccount = mine.find((account) => account.id === openAccountId) ?? null
  const blockedMove = mine.filter((account) => /nigo|reject|still open|acat #/i.test(account.status))

  // ── Asset allocation by class (leverages holdings' assetClass) ──────────
  const investedTotal = mine.reduce((sum, account) => sum + account.holdings.reduce((inner, holding) => inner + holding.value, 0), 0)
  const allocation = [
    ...mine
      .reduce((map, account) => {
        for (const holding of account.holdings) {
          const key = holding.assetClass || 'Other'
          map.set(key, (map.get(key) ?? 0) + holding.value)
        }
        return map
      }, new Map<string, number>())
      .entries(),
  ]
    .map(([label, value]) => ({ label, value, pct: investedTotal > 0 ? (value / investedTotal) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
  const equityPct = allocation
    .filter((slice) => /equity|stock/i.test(slice.label))
    .reduce((sum, slice) => sum + slice.pct, 0)
  const targetEquity = coworker.portfolios?.[household.id]?.targetEquity ?? null
  const drift = targetEquity == null ? null : Math.round(equityPct - targetEquity)

  // ── Advisory team (advisor + household contacts) ────────────────────────
  const contacts = personsForHousehold(household.id).filter((person) => !person.profile.deceased)
  const advisoryTeam = [
    { name: 'A. Rivera', role: 'Your advisor', detail: 'Lead advisor · CFP®', channel: 'Video or phone', kind: 'advisor' as const },
    { name: 'J. Okafor', role: 'Client service', detail: 'Service & operations', channel: 'Email · same-day', kind: 'service' as const },
  ]

  // ── Action center: everything that needs the client, ranked ─────────────
  type PortalAction = { id: string; title: string; detail: string; tone: 'critical' | 'warn' | 'info'; cta: string; go: () => void }
  const actionItems: PortalAction[] = []
  for (const doc of (record?.documents ?? []).filter((doc) => doc.status === 'needs_signature')) {
    actionItems.push({
      id: `sign-${doc.id}`,
      title: `Sign ${doc.name}`,
      detail: doc.signerName ? `Sign as ${doc.signerName} to keep onboarding moving.` : 'A signature is required to proceed.',
      tone: 'critical',
      cta: 'Review & sign',
      go: () => {
        setView('vault')
        setSigningId(doc.id)
      },
    })
  }
  for (const account of blockedMove) {
    actionItems.push({
      id: `move-${account.id}`,
      title: 'A transfer needs you',
      detail: `${account.institution} ···${account.mask} · ${account.status}`,
      tone: 'warn',
      cta: 'Open a request',
      go: () => {
        setRequestKind('transfer')
        setView('request')
      },
    })
  }
  if (gaps.length > 0) {
    actionItems.push({
      id: 'profile-gaps',
      title: `Confirm ${gaps.length} profile detail${gaps.length === 1 ? '' : 's'}`,
      detail: gaps.slice(0, 3).map((gap) => gap.label).join(', ') + (gaps.length > 3 ? '…' : ''),
      tone: 'warn',
      cta: 'Update profile',
      go: () => setView('facts'),
    })
  }
  for (const item of serviceRequests.filter((request) => request.status !== 'Closed')) {
    actionItems.push({
      id: `case-${item.id}`,
      title: item.subject,
      detail: `Your advisor is on it · ${item.status}`,
      tone: 'info',
      cta: 'View request',
      go: () => setView('request'),
    })
  }

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-identity">
          <img
            className="portal-logo"
            src={`${import.meta.env.BASE_URL}benificial-lockup.png`}
            alt="BENiFICIAL WEALTH"
          />
          <div>
            <h2>
              {dayPart()}, {clientName(household.id, household.name)}
            </h2>
          </div>
        </div>
        <div className="portal-top-actions">
          <label>
            Preview as
            <select
              value={household.id}
              aria-label="Preview as household"
              title="Demo control. A signed-in client sees only their household."
              onChange={(event) => onSwitch(event.target.value)}
            >
              {households.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      <div className="portal-body">
        <nav className="portal-nav" aria-label="Client portal">
          {(
            [
              ['home', 'Home'],
              ['plan', 'Plan'],
              ['portfolio', 'Portfolio Overview'],
              ['messages', 'Messages'],
              ['security', 'Security'],
              ['request', 'Service'],
              ['vault', 'Documents'],
              ['facts', 'Profile'],
              ['ask', 'Ask'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
              {id === 'facts' && clientGaps.length > 0 ? ` (${clientGaps.length})` : ''}
              {id === 'vault' && toSign > 0 ? ` (${toSign})` : ''}
              {id === 'messages' && unreadMessages > 0 ? ` (${unreadMessages})` : ''}
              {id === 'request' && serviceRequests.some((item) => item.status !== 'Closed')
                ? ` (${serviceRequests.filter((item) => item.status !== 'Closed').length})`
                : ''}
            </button>
          ))}
        </nav>
        <main className={`portal-main ${view === 'ask' ? 'portal-main-ask' : ''}`}>
          {view === 'home' && (
            <div className="portal-home juniper">
              <div className="portal-stats">
                <div className="portal-stat wide">
                  <strong>{usd(totals.total)}</strong>
                  <span>Total household value</span>
                </div>
                <div className="portal-stat">
                  <strong>{usd(totals.managed)}</strong>
                  <span>With your advisor</span>
                </div>
                <div className="portal-stat">
                  <strong>{usd(totals.heldAway)}</strong>
                  <span>Held away</span>
                </div>
                <div className="portal-stat">
                  <strong>{usd(cash)}</strong>
                  <span>Cash</span>
                </div>
                <div className="portal-stat">
                  <strong>{mine.length}</strong>
                  <span>Account{mine.length === 1 ? '' : 's'}</span>
                </div>
                <div className="portal-stat">
                  <strong>{positions.length}</strong>
                  <span>Position{positions.length === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="portal-splitrow">
                <section className="portal-section portal-actioncenter">
                  <div className="portal-section-head">
                    <h3>Needs your attention</h3>
                    <span className="portal-count">{actionItems.length}</span>
                  </div>
                  {actionItems.length === 0 ? (
                    <p className="muted">You’re all caught up. Nothing needs you right now.</p>
                  ) : (
                    <ul className="portal-actionlist">
                      {actionItems.map((item) => (
                        <li key={item.id} className={`portal-action tone-${item.tone}`}>
                          <span className="portal-action-dot" aria-hidden="true" />
                          <span className="portal-action-body">
                            <strong>{item.title}</strong>
                            <em>{item.detail}</em>
                          </span>
                          <button type="button" className="btn primary" onClick={item.go}>
                            {item.cta}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="portal-section portal-team">
                  <div className="portal-section-head">
                    <h3>Your advisory team</h3>
                    <button type="button" className="btn" onClick={() => setView('ask')}>
                      Ask a question
                    </button>
                  </div>
                  <ul className="portal-teamlist">
                    {advisoryTeam.map((member) => (
                      <li key={member.name}>
                        <span className={`portal-avatar ${member.kind}`} aria-hidden="true">
                          {member.name.split(' ').map((part) => part[0]).join('')}
                        </span>
                        <span className="portal-team-body">
                          <strong>{member.name}</strong>
                          <em>{member.role} · {member.detail}</em>
                          <span className="portal-team-channel">Best reached: {member.channel}</span>
                        </span>
                        <button type="button" className="btn" onClick={() => setView('request')}>
                          Message
                        </button>
                      </li>
                    ))}
                  </ul>
                  {contacts.length > 0 && (
                    <p className="muted portal-team-note">
                      On file for this household: {contacts.map((person) => person.name).join(', ')}.
                    </p>
                  )}
                </section>
              </div>

              {onboardingActive && completeness && (
                <section className="portal-section portal-onboard">
                  <div className="portal-section-head">
                    <div>
                      <div className="portal-kicker">Getting you set up</div>
                      <h3>Let's finish setting up your accounts</h3>
                    </div>
                    <span className="portal-onboard-pct">{completeness.pct}% complete</span>
                  </div>
                  <div className="portal-onboard-bar" role="img" aria-label={`Onboarding ${completeness.pct}% complete`}>
                    <span style={{ width: `${completeness.pct}%` }} />
                  </div>
                  <ol className="portal-onboard-phases">
                    {onboardingPhases.map((entry) => {
                      const state = entry.pct >= 100 ? 'done' : entry.phase === activePhase?.phase ? 'active' : 'upcoming'
                      return (
                        <li key={entry.phase} className={`portal-onboard-phase is-${state}`}>
                          <span className="portal-onboard-dot" aria-hidden="true">{state === 'done' ? '✓' : ''}</span>
                          <span className="portal-onboard-phase-body">
                            <strong>{entry.label}</strong>
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                  <div className="portal-onboard-grid">
                    <div className="portal-onboard-col">
                      <h4>What we still need from you</h4>
                      {clientGaps.length === 0 ? (
                        <p className="muted">You're all caught up — nothing needed from you right now.</p>
                      ) : (
                        <ul className="portal-onboard-list">
                          {clientGaps.slice(0, 6).map((gap) => {
                            const chip = clientFieldChip(gap.status)
                            return (
                              <li key={gap.id}>
                                <span className={`portal-onboard-flag flag-${chip.tone}`}>{chip.label}</span>
                                <span className="portal-onboard-need">
                                  <strong>{gap.label}</strong>
                                </span>
                              </li>
                            )
                          })}
                          {clientGaps.length > 6 && (
                            <li className="muted">+{clientGaps.length - 6} more on your Profile tab</li>
                          )}
                        </ul>
                      )}
                      <button type="button" className="btn primary" onClick={() => setView('facts')}>
                        Update my profile
                      </button>
                    </div>
                    <div className="portal-onboard-col">
                      <h4>Your documents</h4>
                      {outstandingDocs.length === 0 ? (
                        <p className="muted">Nothing to sign right now.</p>
                      ) : (
                        <ul className="portal-onboard-list">
                          {outstandingDocs.slice(0, 6).map((doc) => {
                            const chip = clientDocChip(doc.status)
                            return (
                              <li key={doc.id}>
                                <span className={`doc-status chip-${chip.tone}`}>{chip.label}</span>
                                <span className="portal-onboard-need">
                                  <strong>{doc.name}</strong>
                                </span>
                              </li>
                            )
                          })}
                          {outstandingDocs.length > 6 && (
                            <li className="muted">+{outstandingDocs.length - 6} more in Documents</li>
                          )}
                        </ul>
                      )}
                      <button type="button" className="btn" onClick={() => setView('vault')}>
                        Go to documents
                      </button>
                    </div>
                  </div>
                  <div className="portal-onboard-next">
                    <h4>Your next steps</h4>
                    <ul className="portal-onboard-steps">
                      {nextSteps.map((step) => (
                        <li key={step.id}>
                          <button type="button" onClick={step.go}>
                            <span className="portal-onboard-step-dot" aria-hidden="true" />
                            {step.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </div>
          )}
          {view === 'portfolio' && (
            <div className="portal-home juniper">
              <div className="portal-grid">
              <section className="portal-section portal-perf span-2">
                <div className="portal-section-head">
                  <div>
                    <h3>Portfolio value over time</h3>
                    <p className={`portal-change ${up ? 'up' : 'down'}`}>
                      {usd(totals.total)} · {up ? '+' : '−'}
                      {usd(Math.abs(change))} ({up ? '+' : '−'}
                      {Math.abs(changePct).toFixed(1)}%) · {range}
                    </p>
                  </div>
                  <div className="portal-ranges" role="tablist" aria-label="Performance range">
                    {RANGES.map((item) => (
                      <button key={item} type="button" role="tab" aria-selected={range === item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <svg className={`portal-chart ${up ? 'up' : 'down'}`} viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={`Portfolio value, ${range}`}>
                  <defs>
                    <linearGradient id="portal-perf-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`${chartPath(series)} L100,36 L0,36 Z`} fill="url(#portal-perf-fill)" stroke="none" />
                  <path d={chartPath(series)} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
              </section>

              <section className="portal-section span-2">
                <div className="portal-section-head">
                  <h3>Accounts</h3>
                  <div className="portal-add">
                    <button type="button" className="btn" onClick={() => setPlaid('pick')}>
                      Connect
                    </button>
                    <button type="button" className="btn" onClick={() => setManualOpen(true)}>
                      Add manually
                    </button>
                  </div>
                </div>
                {mine.length === 0 && <p className="muted">No accounts yet. Connect one you hold elsewhere, or add it by hand.</p>}
                <div className="portal-account-grid">
                  {mine.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      className={`portal-account-card ${openAccountId === account.id ? 'open' : ''} ${account.custody}`}
                      onClick={() => setOpenAccountId((current) => (current === account.id ? null : account.id))}
                    >
                      <span>{account.institution} ···{account.mask}</span>
                      <strong>{usd(accountBalance(account))}</strong>
                      <em>
                        {account.custody === 'managed' ? 'Managed' : 'Held away'} · {account.name}
                        {account.review === 'pending' ? ' · waiting on your advisor' : ''}
                      </em>
                    </button>
                  ))}
                </div>
                {openAccount && <AccountBook accounts={[openAccount]} />}
              </section>

              {positions.length > 0 && (
                <section className="portal-section">
                  <h3>Positions</h3>
                  <ul className="portal-positions">
                    {positions.map((position) => (
                      <li key={position.symbol}>
                        <span className="sym">{position.symbol}</span>
                        <span>
                          <strong>{position.name}</strong>
                          <em>
                            {position.shares.toLocaleString()} shares
                            {totals.total > 0 ? ` · ${Math.round((position.value / totals.total) * 100)}%` : ''}
                          </em>
                        </span>
                        <strong>{usd(position.value)}</strong>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {allocation.length > 0 && (
                <section className="portal-section">
                  <div className="portal-section-head">
                    <h3>Asset allocation</h3>
                    {drift != null && (
                      <span className={`portal-drift ${Math.abs(drift) >= 5 ? 'off' : 'on'}`}>
                        {Math.abs(drift) < 1
                          ? 'On your target mix'
                          : `${Math.abs(drift)}% ${drift > 0 ? 'over' : 'under'} target equity`}
                      </span>
                    )}
                  </div>
                  <div className="portal-allocbar" role="img" aria-label="Asset allocation by class">
                    {allocation.map((slice) => (
                      <span
                        key={slice.label}
                        className={`portal-allocseg alloc-${slice.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                        style={{ width: `${slice.pct}%` }}
                        title={`${slice.label} · ${Math.round(slice.pct)}%`}
                      />
                    ))}
                  </div>
                  <ul className="portal-alloclist">
                    {allocation.map((slice) => (
                      <li key={slice.label}>
                        <span className={`portal-allocdot alloc-${slice.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} aria-hidden="true" />
                        <span className="portal-alloclabel">{slice.label}</span>
                        <span className="portal-allocpct">{Math.round(slice.pct)}%</span>
                        <strong>{usd(slice.value)}</strong>
                      </li>
                    ))}
                  </ul>
                  {targetEquity != null && (
                    <p className="muted portal-alloc-note">
                      Your investment policy targets {targetEquity}% equity. Your advisor rebalances when the mix drifts past the guardrail.
                    </p>
                  )}
                </section>
              )}

              {plan.goals.length > 0 && (
                <section className="portal-section">
                  <h3>Goals</h3>
                  <div className="portal-goals">
                    {plan.goals.map((goal) => {
                      const progress = goalProgress(goal)
                      return (
                        <div key={goal.id}>
                          <strong>{goal.name}</strong>
                          <span>{progress == null ? 'No target yet' : `${progress}% funded`}</span>
                          {progress != null && (
                            <div className="portal-pot">
                              <span style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <section className="portal-section span-2">
                <div className="portal-section-head">
                  <h3>Activity</h3>
                  <div className="portal-ranges" role="tablist" aria-label="Activity type">
                    {(
                      [
                        ['all', 'All'],
                        ['transfer', 'Transfers'],
                        ['trade', 'Trades'],
                        ['income', 'Income'],
                      ] as const
                    ).map(([id, label]) => (
                      <button key={id} type="button" role="tab" aria-selected={activityFilter === id} className={activityFilter === id ? 'active' : ''} onClick={() => setActivityFilter(id)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <ActivityList rows={visibleActivity} />
                {visibleActivity.length === 0 && <p className="muted">Nothing in this view yet.</p>}
              </section>
              <section className="portal-section">
                <h3>How your investments are doing</h3>
                <PerformancePanel accounts={mine} householdName={household.name} audience="client" />
              </section>
              </div>
            </div>
          )}
          {view === 'messages' && (
            <div className="portal-home">
              <div className="portal-section-head">
                <h3>Messages</h3>
                <p className="muted">Secure messages and texts with your advisor team. Everything is kept on record.</p>
              </div>
              <MessageCenter
                audience="client"
                threads={clientThreads}
                onSend={(threadId, body, meta) => engagement.sendMessage(threadId, body, 'client', meta)}
                onRead={(threadId) => engagement.markRead(threadId, 'client')}
                onNewThread={(subject, body, channel) => engagement.newClientThread(household.id, subject, body, channel)}
              />
            </div>
          )}
          {view === 'security' && (
            <div className="portal-home">
              <div className="portal-section-head">
                <h3>Security</h3>
                <p className="muted">Protect your accounts and tell us who to call if we cannot reach you.</p>
              </div>
              {securityProfile ? (
                <SecurityCenter profile={securityProfile} audience="client" onChange={(patch) => engagement.updateSecurity(household.id, patch)} />
              ) : (
                <p className="muted">Security settings are not available yet.</p>
              )}
            </div>
          )}
          {view === 'plan' && (
            <div className="portal-home">
              <div className="portal-section-head">
                <h3>Your plan</h3>
              </div>
              {plan && portfolio ? (
                <AdviceDesk
                  audience="investor"
                  householdId={household.id}
                  plan={plan}
                  portfolio={portfolio}
                  showPlan
                  showPortfolio
                  onPlan={() => {}}
                  onPortfolio={() => {}}
                />
              ) : (
                <p className="muted">Your advisor is still preparing your plan.</p>
              )}
              {plan && portfolio && engagement.profiles[household.id] && (
                <>
                  <section className="portal-section">
                    <h3>Are you on track?</h3>
                    <GoalsReport plan={plan} portfolio={portfolio} profile={engagement.profiles[household.id]} audience="client" />
                  </section>
                  <section className="portal-section">
                    <h3>Your money over time</h3>
                    <CashFlowPanel profile={engagement.profiles[household.id]} portfolio={portfolio} compact />
                  </section>
                  <section className="portal-section">
                    <h3>Financial well-being</h3>
                    <WellbeingCard
                      profile={engagement.profiles[household.id]}
                      audience="client"
                      stepsTaken={new Set([...engagement.stepsTaken].filter((key) => key.startsWith(`${household.id}-`)).map((key) => key.slice(household.id.length + 1)))}
                      onStep={(pillarId, pillarLabel, step) => engagement.takeStep(household.id, pillarId, pillarLabel, step, 'client')}
                    />
                  </section>
                </>
              )}
            </div>
          )}
          {view === 'request' && (
            <div className="portal-home">
              <section className="portal-section">
                <h3>Service request</h3>
                <p>Tell your advisor what you need. This opens a case on their work list. It does not move money or change the custodian by itself.</p>
                {requestKind === 'move' && blockedMove.length > 0 && (
                  <div className="portal-sign-row">
                    {blockedMove.map((account) => (
                      <p key={account.id} className="portal-spotlight static">
                        <strong>{account.institution} ···{account.mask}</strong>
                        <span>{account.status}</span>
                      </p>
                    ))}
                  </div>
                )}
                <form
                  className="portal-move"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const kind = SERVICE_KINDS.find((item) => item.id === requestKind) ?? SERVICE_KINDS[0]
                    const attachSuffix =
                      requestFiles.length > 0
                        ? ` Attached: ${requestFiles.map((f) => f.name).join(', ')} (${requestFiles.length} file${requestFiles.length === 1 ? '' : 's'}).`
                        : ''
                    const attachSent =
                      requestFiles.length > 0
                        ? ` ${requestFiles.length} document${requestFiles.length === 1 ? '' : 's'} attached.`
                        : ''
                    if (kind.id === 'move') {
                      const account = mine.find((item) => item.id === moveFrom)
                      const amount = Number(moveAmount.replace(/[^0-9.]/g, ''))
                      if (!account || !Number.isFinite(amount) || amount <= 0) return
                      const risk = securityProfile ? assessMoveRisk(securityProfile, amount, accountBalance(account)) : null
                      if (risk?.stepUp && !stepUp) {
                        setStepUp({ amount, accountId: account.id, reasons: risk.reasons, callback: risk.callback })
                        setStepCode('')
                        setStepError('')
                        return
                      }
                      if (stepUp && stepCode.trim() !== oneTimeCode(household.id)) {
                        setStepError('That code does not match. Check the code we sent and try again.')
                        return
                      }
                      const verifiedNote = stepUp ? ' Identity verified with a one-time code.' : ''
                      const callbackNote = stepUp?.callback ? ' Flagged for a callback before release.' : ''
                      const detail = `${usd(amount)} from ${account.institution} ${account.name} ···${account.mask}${moveNote.trim() ? `. ${moveNote.trim()}` : ''}. Client request. Nothing was sent to the custodian.${verifiedNote}${callbackNote}${attachSuffix}`
                      onServiceRequest(household.id, kind.label, detail, kind.action)
                      if (stepUp?.callback) engagement.raiseMoveAlert(household.id, amount, `${account.institution} ···${account.mask}`, stepUp.reasons)
                      setStepUp(null)
                      setStepCode('')
                      setRequestSent(`Sent. Move money is a new case for your advisor: ${usd(amount)} from ···${account.mask}.${stepUp?.callback ? ' Because of the size, your advisor will call you to confirm before anything moves.' : ''}${attachSent}`)
                      setMoveAmount('')
                      setMoveNote('')
                      setRequestFiles([])
                      return
                    }
                    if (kind.id === 'meeting') {
                      if (!meetingDate || !meetingTime) return
                      const typeLabel = MEETING_TYPES.find((item) => item.id === meetingType)?.label ?? 'Meeting'
                      const channel = MEETING_CHANNELS.find((item) => item.id === meetingChannel) ?? MEETING_CHANNELS[0]
                      const when = `${meetingDate} at ${meetingTime}`
                      const detail = `${typeLabel} · ${when} · ${channel.label} (${channel.via})${meetingNote.trim() ? `. ${meetingNote.trim()}` : ''}. Client-requested meeting. The Concierge will prep a brief and arm the notetaker.${attachSuffix}`
                      onServiceRequest(household.id, kind.label, detail, kind.action)
                      setRequestSent(`Sent. Your advisor will confirm a ${typeLabel.toLowerCase()} on ${when} via ${channel.label}.${attachSent}`)
                      setMeetingNote('')
                      setRequestFiles([])
                      return
                    }
                    if (kind.id === 'address') {
                      const next = (addressPicked || addressQuery).trim()
                      if (!next) return
                      const detail = `Change of address. From: ${currentAddress}. To: ${next}. Client request via the portal — nothing was changed at the custodian yet.${attachSuffix}`
                      onServiceRequest(household.id, kind.label, detail, kind.action)
                      setRequestSent(`Sent. Your advisor will update your address to ${next}.${attachSent}`)
                      setAddressQuery('')
                      setAddressPicked('')
                      setRequestFiles([])
                      return
                    }
                    if (kind.id === 'beneficiary') {
                      const filled = beneficiaries.filter((row) => row.name.trim())
                      if (filled.length === 0) return
                      const lines = filled
                        .map(
                          (row, index) =>
                            `${index + 1}. ${row.name} (${row.type === 'primary' ? 'Primary' : 'Contingent'})` +
                            `${row.relationship ? ` · ${row.relationship}` : ''}` +
                            `${row.percent ? ` · ${row.percent}%` : ''}` +
                            `${row.birthDate ? ` · DOB ${row.birthDate}` : ''}` +
                            `${row.ssn ? ` · SSN/TIN ${row.ssn}` : ''}` +
                            `${row.addressPhone ? ` · ${row.addressPhone}` : ''}`,
                        )
                        .join(' | ')
                      const detail = `Beneficiary designation change. ${filled.length} beneficiar${filled.length === 1 ? 'y' : 'ies'}: ${lines}. Client request via the portal — advisor to prepare the ReliaStar 7384w and route for signature. Nothing was filed yet.${attachSuffix}`
                      onServiceRequest(household.id, kind.label, detail, kind.action)
                      setRequestSent(`Sent. Your advisor will prepare the beneficiary change for ${filled.map((row) => row.name).join(', ')}.${attachSent}`)
                      setBeneficiaries([{ ...EMPTY_BENEFICIARY }])
                      setRequestFiles([])
                      return
                    }
                    const detail = requestDetail.trim()
                    if (!detail && requestFiles.length === 0) return
                    const fullDetail = `${detail || 'See attached document(s).'}${attachSuffix}`
                    onServiceRequest(household.id, kind.label, fullDetail, kind.action)
                    setRequestSent(`Sent. ${kind.label} is a new case for your advisor.${attachSent}`)
                    setRequestDetail('')
                    setRequestFiles([])
                  }}
                >
                  <label>
                    What do you need?
                    <select value={requestKind} onChange={(event) => setRequestKind(event.target.value as (typeof SERVICE_KINDS)[number]['id'])}>
                      {SERVICE_KINDS.map((kind) => (
                        <option key={kind.id} value={kind.id}>
                          {kind.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {requestKind === 'move' ? (
                    <>
                      <label>
                        From
                        <select value={moveFrom} onChange={(event) => { setMoveFrom(event.target.value); setStepUp(null) }} required>
                          <option value="">Choose an account</option>
                          {mine.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.institution} ···{account.mask} · {usd(accountBalance(account))}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Amount
                        <input value={moveAmount} onChange={(event) => { setMoveAmount(event.target.value); setStepUp(null) }} inputMode="decimal" placeholder="5000" required />
                      </label>
                      <label>
                        Note for your advisor
                        <input value={moveNote} onChange={(event) => setMoveNote(event.target.value)} placeholder="Fund the Roth, or leave this blank" />
                      </label>
                      {stepUp && (
                        <div className="sec-stepup" role="group" aria-label="Verify it is you">
                          <strong>Extra check for this request</strong>
                          <ul>
                            {stepUp.reasons.map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                          <p className="muted">We sent a 6-digit code to your phone. (Demo code: <code>{oneTimeCode(household.id)}</code>)</p>
                          <label>
                            Enter the code
                            <input value={stepCode} onChange={(event) => setStepCode(event.target.value)} inputMode="numeric" maxLength={6} autoFocus />
                          </label>
                          {stepError && <p className="sec-error">{stepError}</p>}
                          <button type="button" className="btn sm" onClick={() => setStepUp(null)}>
                            Cancel
                          </button>
                        </div>
                      )}
                    </>
                  ) : requestKind === 'meeting' ? (
                    <>
                      <div className="portal-meeting-grid">
                        <label>
                          Meeting type
                          <select value={meetingType} onChange={(event) => setMeetingType(event.target.value as (typeof MEETING_TYPES)[number]['id'])}>
                            {MEETING_TYPES.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Channel
                          <select value={meetingChannel} onChange={(event) => setMeetingChannel(event.target.value as (typeof MEETING_CHANNELS)[number]['id'])}>
                            {MEETING_CHANNELS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label} · {item.via}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Preferred date
                          <input type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required />
                        </label>
                        <label>
                          Preferred time
                          <input type="time" value={meetingTime} onChange={(event) => setMeetingTime(event.target.value)} required />
                        </label>
                      </div>
                      <label>
                        What would you like to cover?
                        <textarea
                          value={meetingNote}
                          onChange={(event) => setMeetingNote(event.target.value)}
                          placeholder="A topic or question — optional"
                          rows={3}
                        />
                      </label>
                      <div className="callout portal-concierge">
                        <strong>Your advisor’s Concierge will prep this meeting</strong>
                        <ul>
                          <li>Assemble a prep brief from your household file.</li>
                          <li>Arm the AI notetaker to join via {MEETING_CHANNELS.find((item) => item.id === meetingChannel)?.via}.</li>
                          <li>Send you an agenda confirmation once the time is set.</li>
                        </ul>
                      </div>
                    </>
                  ) : requestKind === 'address' ? (
                    <>
                      <div className="portal-address-current">
                        <span className="portal-address-label">Current address on file</span>
                        <strong>{currentAddress}</strong>
                      </div>
                      <label className="portal-typeahead">
                        New address
                        <input
                          value={addressQuery}
                          onChange={(event) => {
                            setAddressQuery(event.target.value)
                            setAddressPicked('')
                          }}
                          placeholder="Start typing your new address"
                          autoComplete="off"
                        />
                        {addressQuery.trim().length >= 2 && !addressPicked && (
                          <ul className="portal-typeahead-list">
                            {ADDRESS_SUGGESTIONS.filter((item) =>
                              item.toLowerCase().includes(addressQuery.trim().toLowerCase()),
                            )
                              .slice(0, 5)
                              .map((item) => (
                                <li key={item}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddressPicked(item)
                                      setAddressQuery(item)
                                    }}
                                  >
                                    {item}
                                  </button>
                                </li>
                              ))}
                            {ADDRESS_SUGGESTIONS.filter((item) =>
                              item.toLowerCase().includes(addressQuery.trim().toLowerCase()),
                            ).length === 0 && (
                              <li className="portal-typeahead-empty">
                                No match — your advisor will verify “{addressQuery.trim()}”.
                              </li>
                            )}
                          </ul>
                        )}
                      </label>
                      <p className="muted">Pick a suggestion or type the full address. Your advisor confirms it before anything changes at the custodian.</p>
                    </>
                  ) : requestKind === 'beneficiary' ? (
                    <div className="portal-beneficiaries">
                      <p className="muted">
                        Add each beneficiary as it appears on the policy. Percentages across primary beneficiaries should total 100%.
                      </p>
                      {beneficiaries.map((row, index) => (
                        <fieldset key={index} className="portal-beneficiary-row">
                          <legend>Beneficiary {index + 1}</legend>
                          <label>
                            Full name (First, MI, Last)
                            <input
                              value={row.name}
                              onChange={(event) =>
                                setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, name: event.target.value } : r)))
                              }
                            />
                          </label>
                          <label>
                            Address &amp; phone
                            <input
                              value={row.addressPhone}
                              onChange={(event) =>
                                setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, addressPhone: event.target.value } : r)))
                              }
                              placeholder="Street, city, state, ZIP · phone"
                            />
                          </label>
                          <div className="portal-beneficiary-grid">
                            <label>
                              Birth date
                              <input
                                type="date"
                                value={row.birthDate}
                                onChange={(event) =>
                                  setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, birthDate: event.target.value } : r)))
                                }
                              />
                            </label>
                            <label>
                              SSN / TIN
                              <input
                                value={row.ssn}
                                onChange={(event) =>
                                  setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, ssn: event.target.value } : r)))
                                }
                                placeholder="•••-••-••••"
                              />
                            </label>
                            <label>
                              Relationship
                              <input
                                value={row.relationship}
                                onChange={(event) =>
                                  setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, relationship: event.target.value } : r)))
                                }
                                placeholder="Spouse, child…"
                              />
                            </label>
                            <label>
                              %
                              <input
                                value={row.percent}
                                inputMode="numeric"
                                onChange={(event) =>
                                  setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, percent: event.target.value.replace(/[^0-9]/g, '') } : r)))
                                }
                                placeholder="100"
                              />
                            </label>
                            <label>
                              Beneficiary type
                              <select
                                value={row.type}
                                onChange={(event) =>
                                  setBeneficiaries((prev) => prev.map((r, i) => (i === index ? { ...r, type: event.target.value as BeneficiaryRow['type'] } : r)))
                                }
                              >
                                <option value="primary">Primary</option>
                                <option value="contingent">Contingent</option>
                              </select>
                            </label>
                          </div>
                          {beneficiaries.length > 1 && (
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => setBeneficiaries((prev) => prev.filter((_, i) => i !== index))}
                            >
                              Remove beneficiary {index + 1}
                            </button>
                          )}
                        </fieldset>
                      ))}
                      {beneficiaries.length < 3 && (
                        <button type="button" className="btn" onClick={() => setBeneficiaries((prev) => [...prev, { ...EMPTY_BENEFICIARY }])}>
                          Add another beneficiary
                        </button>
                      )}
                    </div>
                  ) : (
                    <label>
                      Details
                      <textarea
                        value={requestDetail}
                        onChange={(event) => setRequestDetail(event.target.value)}
                        placeholder="What should your advisor do?"
                        rows={4}
                      />
                    </label>
                  )}
                  <FileDrop
                    files={requestFiles}
                    onChange={setRequestFiles}
                    label={requestKind === 'meeting' ? 'Attach anything for the meeting (optional)' : 'Attach supporting documents (optional)'}
                    hint="Drag files here, or browse. PDF, images, or Office docs up to 25 MB."
                    compact
                  />
                  <button type="submit" className="btn primary">
                    {requestKind === 'meeting' ? 'Request meeting' : 'Submit request'}
                  </button>
                </form>
                {requestKind === 'move' && (
                  <p className="muted">This asks your advisor to move money. It does not send an order to the custodian or to the other firm.</p>
                )}
                {requestKind === 'meeting' && (
                  <p className="muted">This sends a meeting request to your advisor. They’ll confirm the exact time — nothing is on the calendar until they accept.</p>
                )}
                {requestSent && <p className="portal-sent">{requestSent}</p>}
                {serviceRequests.length > 0 && (
                  <ul className="portal-activity">
                    {serviceRequests.map((item) => (
                      <li key={item.id}>
                        <span>
                          <strong>{item.subject}</strong>
                          <em>{item.status}</em>
                        </span>
                        <strong>{item.status === 'Closed' ? 'Closed' : 'With your advisor'}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
          {view === 'ask' && (
            <CoworkerPanel
              key={household.id}
              open
              embedded
              context={{ ...coworker, audience: 'client', scopeHouseholdId: household.id, accounts: mine, record }}
              onClose={() => setView('home')}
              onAction={(action) => {
                if (action.type === 'open-client' && action.tab === 'record') setView('facts')
                if (action.type === 'open-client' && action.tab !== 'record') setView('home')
              }}
            />
          )}
          {view === 'vault' && (
            <div className="portal-home portal-vault">
              <h3>Documents</h3>
              <p>Statements from each custodian, plus anything still waiting on a signature.</p>
              <section className="portal-upload">
                <div className="portal-upload-head">
                  <h4>Upload a document</h4>
                  <span className="muted">Send a statement, ID, or form to your advisor. They'll file it to your record.</span>
                </div>
                <FileDrop
                  files={vaultFiles}
                  onChange={(next) => {
                    setVaultFiles(next)
                    setVaultUploaded('')
                  }}
                  label="Upload documents to your advisor"
                  hint="Drag files here, or browse. PDF, images, or Office docs up to 25 MB."
                />
                {vaultFiles.length > 0 && (
                  <div className="portal-upload-actions">
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => {
                        const names = vaultFiles.map((f) => f.name).join(', ')
                        onServiceRequest(
                          household.id,
                          'Client uploaded documents',
                          `${vaultFiles.length} file${vaultFiles.length === 1 ? '' : 's'} uploaded via the portal: ${names}. Ready to review and file to the record.`,
                          'Review and file the uploaded documents',
                        )
                        setVaultUploaded(`Sent ${vaultFiles.length} document${vaultFiles.length === 1 ? '' : 's'} to your advisor. They'll confirm once filed.`)
                        setVaultFiles([])
                      }}
                    >
                      Send {vaultFiles.length} to advisor
                    </button>
                  </div>
                )}
                {vaultUploaded && <p className="portal-sent">{vaultUploaded}</p>}
              </section>
              {toSign > 0 && (
                <div className="portal-sign-row">
                  {(record?.documents ?? [])
                    .filter((doc) => doc.status === 'needs_signature')
                    .map((doc) => (
                      <button key={doc.id} type="button" className="portal-spotlight" onClick={() => setSigningId(doc.id)}>
                        <strong>Sign {doc.name}</strong>
                        <span>{doc.signerName ? `Sign as ${doc.signerName}` : 'Signature required'}</span>
                      </button>
                    ))}
                </div>
              )}
              {mine.length > 0 && (
                <ul className="portal-statements">
                  {mine.map((account) => (
                    <li key={account.id}>
                      <span>
                        <strong>{account.institution} statement</strong>
                        <em>
                          ···{account.mask} · posted {account.asOf}
                        </em>
                      </span>
                      <span className="doc-status status-filed">Posted</span>
                    </li>
                  ))}
                </ul>
              )}
              {documentsByStage(record?.documents ?? []).map((group) => (
                <div key={group.stage} className="portal-doc-stage">
                  <div className="portal-doc-stage-head">
                    <h4>{group.label}</h4>
                    <span className="muted">{group.documents.length} item{group.documents.length === 1 ? '' : 's'}</span>
                  </div>
                  <table className="portal-doc-table">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Type</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.documents.map((doc) => (
                        <tr key={doc.id}>
                          <td>
                            <strong>{doc.name}</strong>
                            {doc.notes && <span>{doc.notes}</span>}
                          </td>
                          <td>{DOC_TYPE_LABEL[doc.category]}</td>
                          <td>
                            <span className="doc-source">{docProvenance(doc.id).source}</span>
                          </td>
                          <td>
                            {(() => {
                              const chip = clientDocChip(doc.status)
                              return <span className={`doc-status chip-${chip.tone}`}>{chip.label}</span>
                            })()}
                          </td>
                          <td>
                            {doc.status === 'needs_signature' ? (
                              <button type="button" className="btn primary" onClick={() => setSigningId(doc.id)}>
                                Sign
                              </button>
                            ) : (
                              <button type="button" className="btn" disabled={doc.status !== 'filed'}>
                                {doc.status === 'filed' ? 'Open' : 'Waiting'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          {view === 'facts' && (
            <div className="portal-home">
              <p>Update any field on your file. What you send is flagged for your advisor and written onto your profile. It does not clear a compliance hold by itself. Each field shows when it was last updated and by whom.</p>
              <ul className="portal-facts">
                {fileFields.map((field) => (
                  <li key={field.id}>
                    <div>
                      <strong>{field.label}</strong>
                      <span className="muted">{field.section}</span>
                      {(() => {
                        const chip = clientFieldChip(field.status)
                        return <span className={`portal-onboard-flag flag-${chip.tone}`}>{chip.label}</span>
                      })()}
                      <span className={`facts-updated by-${field.updatedBy}`}>
                        Last updated {field.updatedOn} · {UPDATED_BY_LABEL[field.updatedBy]}
                      </span>
                    </div>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const data = new FormData(event.currentTarget)
                        const value = String(data.get('answer') ?? '').trim()
                        if (!value) return
                        onUpdateField(household.id, field.sectionId, field.fieldKey, field.label, value)
                        setSent((current) => ({ ...current, [`${household.id}-${field.id}`]: value }))
                      }}
                    >
                      <input name="answer" defaultValue={field.value} placeholder="Your update" aria-label={field.label} />
                      <button type="submit" className="btn primary">
                        Update
                      </button>
                    </form>
                    {sent[`${household.id}-${field.id}`] && (
                      <em>Sent to your advisor: {sent[`${household.id}-${field.id}`]}</em>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
      {signing && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSigningId(null)}>
          <form
            className="plaid-modal esign-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="esign-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              submitSignature(signing)
            }}
          >
            <div className="plaid-brand">E-sign</div>
            <h3 id="esign-title">{signing.name}</h3>
            <p>Sign as {signing.signerName}. The custodian matches this name to the account registration.</p>
            <ul className="esign-packet">
              {(signing.packet ?? []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <label className="esign-consent">
              <input type="checkbox" checked={signConsent} onChange={(event) => setSignConsent(event.target.checked)} />
              I agree to sign this document electronically.
            </label>
            <label>
              Full legal name
              <input
                value={signName}
                onChange={(event) => setSignName(event.target.value)}
                placeholder={signing.signerName}
                aria-label="Full legal name"
                autoComplete="name"
              />
            </label>
            <div className={`esign-line ${signName.trim() ? 'signed' : ''}`} aria-hidden="true">
              {signName.trim() || 'Signature'}
            </div>
            {signError && <p className="esign-error">{signError}</p>}
            <div className="actions">
              <button type="button" className="btn" onClick={() => setSigningId(null)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Sign document
              </button>
            </div>
          </form>
        </div>
      )}
      {plaid && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPlaid(null)}>
          <div className="plaid-modal" role="dialog" aria-modal="true" aria-labelledby="plaid-title" onClick={(event) => event.stopPropagation()}>
            <div className="plaid-brand">Plaid</div>
            {plaid === 'pick' ? (
              <>
                <h3 id="plaid-title">Connect a held-away account</h3>
                <p>Choose the institution. This preview links sample balances into your household. Your advisor is flagged to review them.</p>
                <ul>
                  {plaidInstitutions.map((offer) => (
                    <li key={offer.id}>
                      <button type="button" onClick={() => setPlaid(offer)}>
                        <strong>{offer.institution}</strong>
                        <span>
                          {offer.accounts.length} account · {usd(offer.accounts.reduce((sum, account) => sum + account.balance, 0))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h3 id="plaid-title">{plaid.institution}</h3>
                <p>These accounts will be added as held-away. Nothing moves to your advisor’s custodian.</p>
                <ul>
                  {plaid.accounts.map((account) => (
                    <li key={account.name}>
                      <span>
                        {account.name}
                        <em>{usd(account.balance)}</em>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => setPlaid('pick')}>
                    Back
                  </button>
                  <button type="button" className="btn primary" onClick={() => addPlaid(plaid)}>
                    Add to my household
                  </button>
                </div>
              </>
            )}
            <button type="button" className="btn plaid-close" onClick={() => setPlaid(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {manualOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setManualOpen(false)}>
          <form
            className="plaid-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-title"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const institution = String(data.get('institution') ?? '').trim()
              const name = String(data.get('name') ?? '').trim()
              const type = String(data.get('type') ?? 'brokerage') as AccountType
              const balance = Number(String(data.get('balance') ?? '').replace(/[^0-9.]/g, ''))
              if (!institution || !name || !Number.isFinite(balance)) return
              onAddAccounts([accountFromManual({ householdId: household.id, institution, name, type, balance })])
              setManualOpen(false)
            }}
          >
            <h3 id="manual-title">Enter a held-away account</h3>
            <p>Use this when the institution is not on Plaid. Your advisor reviews the balance before it is treated as fact.</p>
            <label>
              Institution
              <input name="institution" required placeholder="Credit union, 401(k) provider, bank" />
            </label>
            <label>
              Account name
              <input name="name" required placeholder="Brokerage, IRA, checking" />
            </label>
            <label>
              Type
              <select name="type" defaultValue="brokerage">
                <option value="brokerage">Brokerage</option>
                <option value="ira">IRA</option>
                <option value="roth">Roth IRA</option>
                <option value="401k">401(k)</option>
                <option value="trust">Trust</option>
                <option value="checking">Bank</option>
                <option value="joint">Joint</option>
              </select>
            </label>
            <label>
              Balance
              <input name="balance" required inputMode="decimal" placeholder="25000" />
            </label>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setManualOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Add account
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
