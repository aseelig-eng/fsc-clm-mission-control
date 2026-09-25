import { useState } from 'react'
import type { Household } from '../data/types'
import type { PlanState, PortfolioState } from '../data/advice'
import { buildHoldings, fundedTotal, goalProgress, successOdds } from '../data/advice'
import type { ClientOnboardingRecord } from '../data/onboardingFramework'

type PortalView = 'holdings' | 'ask' | 'vault' | 'facts'

interface ChatLine {
  id: string
  role: 'you' | 'agent'
  text: string
}

function answerClient(question: string, household: Household, plan: PlanState, portfolio: PortfolioState) {
  const text = question.toLowerCase()
  const total = fundedTotal(plan)
  const odds = successOdds(plan, portfolio)
  if (/\b(holding|stock|bond|what do i own|portfolio)\b/.test(text)) {
    const lines = buildHoldings(portfolio, total).map((line) => `${line.name}: $${line.value.toLocaleString()}`)
    return lines.length ? `Here is what is invested.\n${lines.join('\n')}` : 'Nothing is funded yet. Your advisor is still opening the accounts.'
  }
  if (/\b(goal|plan|on track|success|retire)\b/.test(text)) {
    const goals = plan.goals.map((goal) => {
      const progress = goalProgress(goal)
      return progress == null ? goal.name : `${goal.name}: ${progress}% funded`
    })
    return `${goals.join('\n') || 'No goals yet.'}\n${odds == null ? 'A success score needs a risk score first.' : `Plan confidence is ${odds}%.`}`
  }
  if (/\b(document|statement|vault|tax)\b/.test(text)) {
    return 'Shared documents are in the vault. Your advisor can see the same files.'
  }
  return `I can explain ${household.name.split(' ')[0]}'s holdings, goals, or where to find a document.`
}

export function ClientPortal({
  households,
  householdId,
  plans,
  portfolios,
  records,
  onSwitch,
  onClose,
}: {
  households: Household[]
  householdId: string
  plans: Record<string, PlanState>
  portfolios: Record<string, PortfolioState>
  records: Record<string, ClientOnboardingRecord>
  onSwitch: (id: string) => void
  onClose: () => void
}) {
  const household = households.find((item) => item.id === householdId) ?? households[0]
  const plan = plans[household.id]
  const portfolio = portfolios[household.id]
  const record = records[household.id]
  const [view, setView] = useState<PortalView>('holdings')
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState<ChatLine[]>([
    { id: 'hi', role: 'agent', text: `Hi. Ask about your holdings, your goals, or a document.` },
  ])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const holdings = buildHoldings(portfolio, fundedTotal(plan))
  const total = holdings.reduce((sum, line) => sum + line.value, 0)
  const gaps =
    record?.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.status === 'missing' || field.status === 'partial' || field.status === 'blocked')
        .map((field) => ({
          id: `${section.id}-${field.key}`,
          label: field.label,
          status: field.status,
          section: section.label,
        })),
    ) ?? []

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    setChat((current) => [
      ...current,
      { id: `y-${Date.now()}`, role: 'you', text: trimmed },
      { id: `a-${Date.now()}`, role: 'agent', text: answerClient(trimmed, household, plan, portfolio) },
    ])
    setDraft('')
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
            Household
            <select value={household.id} onChange={(event) => onSwitch(event.target.value)}>
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
              ['holdings', 'Holdings'],
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
        <main className="portal-main">
          {view === 'holdings' && (
            <>
              <p className="portal-total">${total.toLocaleString()}</p>
              <p className="muted">Invested value across accounts. Cash and alternatives are included.</p>
              <ul className="holding-list portal-holdings">
                {holdings.map((line) => (
                  <li key={line.name}>
                    <span>{line.name}</span>
                    <span className="muted">{line.assetClass}</span>
                    <strong>${line.value.toLocaleString()}</strong>
                  </li>
                ))}
              </ul>
              {holdings.length === 0 && <p>No holdings yet. Your advisor is still funding the accounts.</p>}
              <div className="portal-goals">
                {plan.goals.map((goal) => (
                  <div key={goal.id}>
                    <strong>{goal.name}</strong>
                    <span>{goalProgress(goal) == null ? 'No target yet' : `${goalProgress(goal)}% funded`}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {view === 'ask' && (
            <div className="portal-ask">
              <div className="portal-chat">
                {chat.map((line) => (
                  <p key={line.id} className={line.role}>
                    {line.text}
                  </p>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  ask(draft)
                }}
              >
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Ask about your money"
                  aria-label="Ask the portal"
                />
                <button type="submit" className="btn primary">
                  Send
                </button>
              </form>
            </div>
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
              <p>Your advisor’s fact-find agent only asks for what is missing, incomplete, or out of date.</p>
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
                    {answers[gap.id] ? (
                      <em>Sent: {answers[gap.id]}</em>
                    ) : (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          const data = new FormData(event.currentTarget)
                          const value = String(data.get('answer') ?? '').trim()
                          if (!value) return
                          setAnswers((current) => ({ ...current, [gap.id]: value }))
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
    </div>
  )
}
