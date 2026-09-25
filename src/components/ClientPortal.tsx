import { useEffect, useState } from 'react'
import { personsForHousehold } from '../data/portraits'
import type { Household } from '../data/types'
import type { PlanState } from '../data/advice'
import { goalProgress } from '../data/advice'
import type { ClientOnboardingRecord, ComplianceDocument } from '../data/onboardingFramework'
import { DOC_TYPE_LABEL, docStatusLabel } from '../data/onboardingFramework'
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

type PortalView = 'home' | 'activity' | 'move' | 'request' | 'vault' | 'facts' | 'ask'
type RangeId = '1D' | '1W' | '1M' | '1Y' | 'All'
type ActivityFilter = 'all' | 'transfer' | 'trade' | 'income'

const SERVICE_KINDS = [
  { id: 'address', label: 'Update my address', action: 'Update the address on the file' },
  { id: 'beneficiary', label: 'Change a beneficiary', action: 'Review the beneficiary change' },
  { id: 'statement', label: 'Send a statement or tax form', action: 'Send the requested document' },
  { id: 'transfer', label: 'Question about a transfer', action: 'Answer the transfer question' },
  { id: 'meeting', label: 'Schedule a meeting', action: 'Book the meeting' },
  { id: 'other', label: 'Something else', action: 'Respond to the request' },
] as const

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
  records,
  accounts,
  coworker,
  onSwitch,
  onClose,
  onAddAccounts,
  onUpdateField,
  onSignDocument,
  onClientRequest,
  onServiceRequest,
  serviceRequests,
}: {
  households: Household[]
  householdId: string
  plans: Record<string, PlanState>
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
}) {
  const household = households.find((item) => item.id === householdId) ?? households[0]
  const plan = plans[household.id]
  const record = records[household.id]
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
  const [moveSent, setMoveSent] = useState('')
  const [requestKind, setRequestKind] = useState<(typeof SERVICE_KINDS)[number]['id']>('address')
  const [requestDetail, setRequestDetail] = useState('')
  const [requestSent, setRequestSent] = useState('')

  useEffect(() => {
    setSigningId(null)
    setSignName('')
    setSignConsent(false)
    setSignError('')
    setMoveSent('')
    setRequestSent('')
    setRequestDetail('')
    setOpenAccountId(null)
  }, [household.id])

  const fileFields =
    record?.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.status !== 'n/a')
        .map((field) => ({
          id: `${section.id}-${field.key}`,
          sectionId: section.id,
          fieldKey: field.key,
          label: field.label,
          status: field.status,
          section: section.label,
          value: field.value,
        })),
    ) ?? []

  const gaps = fileFields.filter((field) => field.status === 'missing' || field.status === 'partial' || field.status === 'blocked')

  const toSign = (record?.documents ?? []).filter((doc) => doc.status === 'needs_signature').length
  const signing = record?.documents.find((doc) => doc.id === signingId) ?? null

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

  return (
    <div className="portal">
      <header className="portal-top">
        <div className="portal-identity">
          <img
            className="portal-logo"
            src={`${import.meta.env.BASE_URL}benificial-lockup.png`}
            alt="Benificial Wealth"
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
              ['activity', 'Activity'],
              ['move', 'Move'],
              ['request', 'Service'],
              ['vault', 'Documents'],
              ['facts', 'Profile'],
              ['ask', 'Ask'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
              {id === 'facts' && gaps.length > 0 ? ` (${gaps.length})` : ''}
              {id === 'vault' && toSign > 0 ? ` (${toSign})` : ''}
              {id === 'request' && serviceRequests.some((item) => item.status !== 'Closed')
                ? ` (${serviceRequests.filter((item) => item.status !== 'Closed').length})`
                : ''}
            </button>
          ))}
        </nav>
        <main className={`portal-main ${view === 'ask' ? 'portal-main-ask' : ''}`}>
          {view === 'home' && (
            <div className="portal-home">
              <section className={`portal-hero ${up ? 'up' : 'down'}`}>
                <p className="portal-hero-label">Household value</p>
                <p className="portal-total">{usd(totals.total)}</p>
                <p className={`portal-change ${up ? 'up' : 'down'}`}>
                  {up ? '+' : '−'}
                  {usd(Math.abs(change))} ({up ? '+' : '−'}
                  {Math.abs(changePct).toFixed(1)}%) · {range}
                </p>
                <svg className="portal-chart" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={`Portfolio value, ${range}`}>
                  <path d={chartPath(series)} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="portal-ranges" role="tablist" aria-label="Performance range">
                  {RANGES.map((item) => (
                    <button key={item} type="button" role="tab" aria-selected={range === item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="portal-split">
                  <div>
                    <span>With your advisor</span>
                    <strong>{usd(totals.managed)}</strong>
                  </div>
                  <div>
                    <span>Held away</span>
                    <strong>{usd(totals.heldAway)}</strong>
                  </div>
                  <div>
                    <span>Cash</span>
                    <strong>{usd(cash)}</strong>
                  </div>
                </div>
              </section>

              {blockedMove.length > 0 && (
                <button type="button" className="portal-spotlight" onClick={() => setView('move')}>
                  <strong>A transfer needs you</strong>
                  <span>{blockedMove[0].institution} ···{blockedMove[0].mask} · {blockedMove[0].status}</span>
                </button>
              )}

              <section className="portal-section">
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

              <section className="portal-section">
                <div className="portal-section-head">
                  <h3>Latest activity</h3>
                  <button type="button" className="btn" onClick={() => setView('activity')}>
                    See all
                  </button>
                </div>
                <ActivityList rows={activity.slice(0, 4)} />
              </section>
            </div>
          )}
          {view === 'activity' && (
            <div className="portal-home">
              <div className="portal-section-head">
                <h3>Activity</h3>
              </div>
              <div className="portal-ranges" role="tablist" aria-label="Activity type">
                {(
                  [
                    ['all', 'All'],
                    ['transfer', 'Transfers'],
                    ['trade', 'Trades'],
                    ['income', 'Income'],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" className={activityFilter === id ? 'active' : ''} onClick={() => setActivityFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <ActivityList rows={visibleActivity} />
              {visibleActivity.length === 0 && <p className="muted">Nothing in this view yet.</p>}
            </div>
          )}
          {view === 'move' && (
            <div className="portal-home">
              <section className="portal-section">
                <h3>Move money</h3>
                <p>This asks your advisor to move money. It does not send an order to the custodian or to the other firm.</p>
                {blockedMove.map((account) => (
                  <p key={account.id} className="portal-spotlight static">
                    <strong>{account.institution} ···{account.mask}</strong>
                    <span>{account.status}</span>
                  </p>
                ))}
                {moveSent ? (
                  <p className="portal-sent">{moveSent}</p>
                ) : (
                  <form
                    className="portal-move"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const account = mine.find((item) => item.id === moveFrom)
                      const amount = Number(moveAmount.replace(/[^0-9.]/g, ''))
                      if (!account || !Number.isFinite(amount) || amount <= 0) return
                      const detail = `${usd(amount)} from ${account.institution} ${account.name} ···${account.mask}${moveNote.trim() ? `. ${moveNote.trim()}` : ''}. Client request. Nothing was sent to the custodian.`
                      onClientRequest(household.id, 'Client asked to move money', detail)
                      setMoveSent(`Sent to your advisor: ${usd(amount)} from ···${account.mask}.`)
                      setMoveAmount('')
                      setMoveNote('')
                    }}
                  >
                    <label>
                      From
                      <select value={moveFrom} onChange={(event) => setMoveFrom(event.target.value)} required>
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
                      <input value={moveAmount} onChange={(event) => setMoveAmount(event.target.value)} inputMode="decimal" placeholder="5000" required />
                    </label>
                    <label>
                      Note for your advisor
                      <input value={moveNote} onChange={(event) => setMoveNote(event.target.value)} placeholder="Fund the Roth, or leave this blank" />
                    </label>
                    <button type="submit" className="btn primary">
                      Ask my advisor
                    </button>
                  </form>
                )}
                <div className="portal-add">
                  <button type="button" className="btn" onClick={() => setPlaid('pick')}>
                    Connect a held-away account
                  </button>
                  <button type="button" className="btn" onClick={() => setManualOpen(true)}>
                    Enter one manually
                  </button>
                </div>
              </section>
            </div>
          )}
          {view === 'request' && (
            <div className="portal-home">
              <section className="portal-section">
                <h3>Service request</h3>
                <p>Tell your advisor what you need. This opens a case on their work list. It does not move money or change the custodian by itself.</p>
                <form
                  className="portal-move"
                  onSubmit={(event) => {
                    event.preventDefault()
                    const kind = SERVICE_KINDS.find((item) => item.id === requestKind) ?? SERVICE_KINDS[0]
                    const detail = requestDetail.trim()
                    if (!detail) return
                    onServiceRequest(household.id, kind.label, detail, kind.action)
                    setRequestSent(`Sent. ${kind.label} is a new case for your advisor.`)
                    setRequestDetail('')
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
                  <label>
                    Details
                    <textarea
                      value={requestDetail}
                      onChange={(event) => setRequestDetail(event.target.value)}
                      placeholder="What should your advisor do?"
                      required
                      rows={4}
                    />
                  </label>
                  <button type="submit" className="btn primary">
                    Submit request
                  </button>
                </form>
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
            <div className="portal-vault">
              <h3>Documents</h3>
              <p>Statements from each custodian, plus anything still waiting on a signature.</p>
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
              <table className="portal-doc-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(record?.documents ?? []).map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.name}</strong>
                        {doc.notes && <span>{doc.notes}</span>}
                      </td>
                      <td>{DOC_TYPE_LABEL[doc.category]}</td>
                      <td>
                        <span className={`doc-status status-${doc.status}`}>{docStatusLabel(doc.status)}</span>
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
          )}
          {view === 'facts' && (
            <div>
              <p>Update any field on your file. What you send is flagged for your advisor and written onto your profile. It does not clear a compliance hold by itself.</p>
              <ul className="portal-facts">
                {fileFields.map((field) => (
                  <li key={field.id}>
                    <div>
                      <strong>{field.label}</strong>
                      <span className="muted">
                        {field.section} · {field.status}
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
