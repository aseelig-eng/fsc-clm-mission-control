import { useState } from 'react'
import type { Household } from '../data/types'
import type { PlanState } from '../data/advice'
import { goalProgress } from '../data/advice'
import type { ClientOnboardingRecord } from '../data/onboardingFramework'
import {
  accountsFromPlaid,
  accountFromManual,
  plaidInstitutions,
  usd,
  type AccountType,
  type FinancialAccount,
  type PlaidOffer,
} from '../data/accounts'
import type { CoworkerContext } from '../coworker'
import { AccountBook } from './AccountBook'
import { CoworkerPanel } from './CoworkerPanel'

type PortalView = 'accounts' | 'ask' | 'vault' | 'facts'

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
}) {
  const household = households.find((item) => item.id === householdId) ?? households[0]
  const plan = plans[household.id]
  const record = records[household.id]
  const mine = accounts.filter((account) => account.householdId === household.id)
  const [view, setView] = useState<PortalView>('accounts')
  const [plaid, setPlaid] = useState<PlaidOffer | 'pick' | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [sent, setSent] = useState<Record<string, string>>({})

  const gaps =
    record?.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.status === 'missing' || field.status === 'partial' || field.status === 'blocked')
        .map((field) => ({
          id: `${section.id}-${field.key}`,
          sectionId: section.id,
          fieldKey: field.key,
          label: field.label,
          status: field.status,
          section: section.label,
        })),
    ) ?? []

  function addPlaid(offer: PlaidOffer) {
    onAddAccounts(accountsFromPlaid(household.id, offer))
    setPlaid(null)
  }

  return (
    <div className="portal">
      <header className="portal-top">
        <div>
          <div className="portal-kicker">Client portal</div>
          <h2>{household.name}</h2>
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
        <nav className="portal-nav">
          {(
            [
              ['accounts', 'Accounts'],
              ['ask', 'Ask'],
              ['vault', 'Documents'],
              ['facts', 'Update my information'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
              {id === 'facts' && gaps.length > 0 ? ` · ${gaps.length}` : ''}
            </button>
          ))}
        </nav>
        <main className={`portal-main ${view === 'ask' ? 'portal-main-ask' : ''}`}>
          {view === 'accounts' && (
            <>
              <div className="portal-account-head">
                <div>
                  <p className="muted">Managed accounts sit with your advisor. Held-away accounts stay at the other firm until you decide to move them.</p>
                </div>
                <div className="portal-add">
                  <button type="button" className="btn primary" onClick={() => setPlaid('pick')}>
                    Connect with Plaid
                  </button>
                  <button type="button" className="btn" onClick={() => setManualOpen(true)}>
                    Enter manually
                  </button>
                </div>
              </div>
              <AccountBook accounts={mine} />
              {plan.goals.length > 0 && (
                <div className="portal-goals">
                  {plan.goals.map((goal) => (
                    <div key={goal.id}>
                      <strong>{goal.name}</strong>
                      <span>{goalProgress(goal) == null ? 'No target yet' : `${goalProgress(goal)}% funded`}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {view === 'ask' && (
            <CoworkerPanel
              key={household.id}
              open
              embedded
              context={{ ...coworker, audience: 'client', scopeHouseholdId: household.id, accounts: mine, record }}
              onClose={() => setView('accounts')}
              onAction={(action) => {
                if (action.type === 'open-client' && action.tab === 'record') setView('facts')
                if (action.type === 'open-client' && action.tab !== 'record') setView('accounts')
              }}
            />
          )}
          {view === 'vault' && (
            <ul className="portal-docs">
              {(record?.documents ?? []).map((doc) => (
                <li key={doc.id}>
                  <div>
                    <strong>{doc.name}</strong>
                    <span className="muted">{doc.status === 'filed' ? 'Shared with you' : 'Not shared yet'}</span>
                  </div>
                  <button type="button" className="btn" disabled={doc.status !== 'filed'}>
                    {doc.status === 'filed' ? 'Open' : 'Waiting'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {view === 'facts' && (
            <div>
              <p>Your advisor only asks for what is missing, incomplete, or out of date. What you send is flagged for review and written onto your profile. It does not clear a compliance hold by itself.</p>
              {gaps.length === 0 && <p className="muted">Nothing to update. Your file is current.</p>}
              <ul className="portal-facts">
                {gaps.map((gap) => (
                  <li key={gap.id}>
                    <div>
                      <strong>{gap.label}</strong>
                      <span className="muted">
                        {gap.section} · {gap.status}
                      </span>
                    </div>
                    {sent[`${household.id}-${gap.id}`] ? (
                      <em>Sent to your advisor: {sent[`${household.id}-${gap.id}`]}</em>
                    ) : (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          const data = new FormData(event.currentTarget)
                          const value = String(data.get('answer') ?? '').trim()
                          if (!value) return
                          onUpdateField(household.id, gap.sectionId, gap.fieldKey, gap.label, value)
                          setSent((current) => ({ ...current, [`${household.id}-${gap.id}`]: value }))
                        }}
                      >
                        <input name="answer" placeholder="Your answer" aria-label={gap.label} />
                        <button type="submit" className="btn primary">
                          Send
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      </div>
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
