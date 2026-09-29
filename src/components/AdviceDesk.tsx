import { useState } from 'react'
import {
  adviceFlags,
  buildHoldings,
  fundedTotal,
  GOAL_OPTIONS,
  goalProgress,
  planActivityFor,
  proposedPortfolio,
  rankedStrategy,
  RISK_LEVELS,
  SCENARIOS,
  successOdds,
  type PlanGoal,
  type PlanState,
  type PortfolioState,
  type RiskLevel,
  type ScenarioId,
} from '../data/advice'
import { GoalMark } from './GoalMark'

function money(value: number | null) {
  if (value == null) return ''
  return String(value)
}

function parseMoney(raw: string) {
  if (raw.trim() === '') return null
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

function parseYears(raw: string) {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

const ACTIVITY_LABEL: Record<string, string> = {
  plan: 'Plan update',
  task: 'Action needed',
  milestone: 'Milestone',
  market: 'Market',
}

export function AdviceDesk({
  plan,
  portfolio,
  showPlan,
  showPortfolio,
  onPlan,
  onPortfolio,
  audience = 'advisor',
  householdId,
}: {
  plan: PlanState
  portfolio: PortfolioState
  showPlan: boolean
  showPortfolio: boolean
  onPlan: (patch: Partial<PlanState>) => void
  onPortfolio: (patch: Partial<PortfolioState>) => void
  audience?: 'advisor' | 'investor'
  householdId?: string
}) {
  const flags = adviceFlags(plan, portfolio).filter((flag) => {
    if (showPlan && showPortfolio) return true
    if (showPlan) return flag.scope === 'plan' || flag.scope === 'both'
    return flag.scope === 'portfolio' || flag.scope === 'both'
  })
  const sum = portfolio.equity + portfolio.fixed + portfolio.cash + portfolio.alts
  const [openGoalId, setOpenGoalId] = useState<string | null>(plan.goals[0]?.id ?? null)
  const [extraAnnual, setExtraAnnual] = useState(0)
  const [scenarios, setScenarios] = useState<ScenarioId[]>([])
  const [proposed, setProposed] = useState(false)
  // Advisor can preview exactly what the investor sees.
  const [previewClient, setPreviewClient] = useState(false)
  const openGoal = plan.goals.find((goal) => goal.id === openGoalId) ?? null

  // The "client participation zone" is a sandbox: the investor (or the advisor
  // in preview) adjusts a bounded set of assumptions and sees the impact, but
  // the advisor's plan is never overwritten.
  const clientView = audience === 'investor' || previewClient
  const whatIf = { extraAnnual, scenarios }
  const baseOdds = successOdds(plan, portfolio)
  const odds = successOdds(plan, portfolio, whatIf)

  const proposedBook = proposedPortfolio(portfolio)
  const funded = fundedTotal(plan)
  const currentOdds = successOdds(plan, portfolio)
  const proposedOdds = successOdds(plan, proposedBook)
  const hasProposal =
    portfolio.targetEquity != null && proposedBook.equity !== portfolio.equity

  function updateGoal(id: string, patch: Partial<PlanGoal>) {
    onPlan({
      goals: plan.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
    })
  }

  function toggleScenario(id: ScenarioId) {
    setScenarios((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const activity = householdId ? planActivityFor(householdId) : []

  // ---------- Bounded what-if / participation zone (shared) ----------
  const participationZone = (
    <div className={`participation-zone ${clientView ? 'client' : ''}`}>
      <div className="pz-head">
        <strong>What-if — your participation zone</strong>
        {clientView && (
          <span className="pz-badge">Sandbox · does not change your advisor's plan</span>
        )}
      </div>
      {odds != null ? (
        <div className="advice-progress">
          <span>
            Probability of success {odds}%
            {baseOdds != null && odds !== baseOdds && (
              <span className={`pz-delta ${odds >= baseOdds ? 'up' : 'down'}`}>
                {odds >= baseOdds ? '▲' : '▼'} {Math.abs(odds - baseOdds)} vs plan
              </span>
            )}
          </span>
          <div className="book-meter-track">
            <div
              className={`book-meter-fill ${odds >= 70 ? 'tone-ok' : odds >= 45 ? 'tone-neutral' : 'tone-warn'}`}
              style={{ width: `${odds}%` }}
            />
          </div>
          <p className="muted">Straight-line funding with a light stress. Adjust the levers below to see the plan move.</p>
        </div>
      ) : (
        <p className="muted">Add a goal target and a risk score to see the probability of success.</p>
      )}
      <label>
        Extra savings per year · ${extraAnnual.toLocaleString()}
        <input
          type="range"
          min={0}
          max={50000}
          step={1000}
          value={extraAnnual}
          onChange={(event) => setExtraAnnual(Number(event.target.value))}
        />
      </label>
      <div className="scenario-row">
        <span className="scenario-label">Stress scenarios</span>
        <div className="scenario-chips">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={`scenario-chip ${scenarios.includes(scenario.id) ? 'active' : ''}`}
              aria-pressed={scenarios.includes(scenario.id)}
              title={scenario.blurb}
              onClick={() => toggleScenario(scenario.id)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>
      {(extraAnnual > 0 || scenarios.length > 0) && (
        <button type="button" className="btn ghost pz-reset" onClick={() => { setExtraAnnual(0); setScenarios([]) }}>
          Reset to advisor's plan
        </button>
      )}
    </div>
  )

  // ---------- Investor / presentation client view ----------
  if (clientView) {
    return (
      <div className="advice-desk client-view">
        {audience === 'advisor' && (
          <div className="present-bar">
            <span className="present-bar-dot" aria-hidden />
            <div className="present-bar-text">
              <strong>Presenting to your client</strong>
              <span>This is exactly what they see in their portal — nothing here is editable.</span>
            </div>
            <button type="button" className="btn present-bar-exit" onClick={() => setPreviewClient(false)}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="present-icon">
                <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to editing
            </button>
          </div>
        )}
        <section className="advice-card">
          <header>
            <h3>Your plan at a glance</h3>
            <p>Where each goal stands, and how choices change your odds.</p>
          </header>
          <div className="goal-progress-grid">
            {plan.goals.length === 0 && <p className="muted">Your advisor is still building your goals.</p>}
            {plan.goals.map((goal) => {
              const progress = goalProgress(goal)
              return (
                <div key={goal.id} className="goal-progress-card">
                  <div className="goal-progress-head">
                    <GoalMark name={goal.name} />
                    <span>{goal.name}</span>
                  </div>
                  {progress != null ? (
                    <>
                      <div className="book-meter-track">
                        <div
                          className="book-meter-fill tone-ok"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="goal-progress-pct">{progress}% funded</span>
                    </>
                  ) : (
                    <span className="muted">Tracking — no target set yet.</span>
                  )}
                  {goal.horizonYears != null && (
                    <span className="muted goal-progress-horizon">{goal.horizonYears}-year horizon</span>
                  )}
                </div>
              )
            })}
          </div>
          {participationZone}
        </section>

        {showPortfolio && hasProposal && (
          <section className="advice-card">
            <header>
              <h3>Current vs. proposed</h3>
              <p>Your advisor's proposed model, side by side with today.</p>
            </header>
            <div className="compare-grid">
              <CompareColumn title="Current" book={portfolio} odds={currentOdds} />
              <CompareColumn title="Proposed" book={proposedBook} odds={proposedOdds} highlight />
            </div>
          </section>
        )}

        {activity.length > 0 && (
          <section className="advice-card">
            <header>
              <h3>Recent activity</h3>
              <p>Plan updates, tasks, and milestones.</p>
            </header>
            <ul className="activity-feed">
              {activity.map((item) => (
                <li key={item.id} className={`activity-item kind-${item.kind}`}>
                  <span className="activity-tag">{ACTIVITY_LABEL[item.kind] ?? item.kind}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span className="muted">{item.detail}</span>
                  </div>
                  <span className="muted activity-date">{item.date}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  // ---------- Advisor full-edit view ----------
  return (
    <div className="advice-desk">
      <div className="advice-desk-bar">
        <div className="advice-desk-bar-text">
          <span className="advice-desk-kicker">Planning workspace</span>
          <span className="muted">Edit the plan, then present it to your client.</span>
        </div>
        <div className="view-switch" role="tablist" aria-label="Plan view">
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="active"
            onClick={() => setPreviewClient(false)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="view-switch-icon">
              <path d="M4 6h11M4 12h16M4 18h11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Advisor
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="false"
            onClick={() => setPreviewClient(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="view-switch-icon">
              <circle cx="12" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
              <path d="M6 19c1-3 3.2-4.5 6-4.5s5 1.5 6 4.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            Client
          </button>
        </div>
      </div>
      {showPlan && (
        <section className="advice-card">
          <header>
            <h3>Financial Plan</h3>
            <p>Discovery, proposal, annual review, and life events.</p>
          </header>
          <div className="goal-row">
            {plan.goals.length === 0 && <p className="muted">No goals yet.</p>}
            {plan.goals.map((goal) => {
              const progress = goalProgress(goal)
              return (
                <button
                  key={goal.id}
                  type="button"
                  className={`goal-chip ${openGoalId === goal.id ? 'active' : ''}`}
                  onClick={() => setOpenGoalId(goal.id)}
                >
                  <GoalMark name={goal.name} />
                  <span>{goal.name}</span>
                  {progress != null && <strong>{progress}%</strong>}
                </button>
              )
            })}
          </div>
          <label>
            Add a goal
            <select
              value=""
              onChange={(event) => {
                const name = event.target.value
                if (!name) return
                const id = `${name}-${plan.goals.length}`
                onPlan({
                  goals: [
                    ...plan.goals,
                    { id, name, targetUsd: null, fundedUsd: null, horizonYears: null, note: '' },
                  ],
                })
                setOpenGoalId(id)
              }}
            >
              <option value="">Choose</option>
              {GOAL_OPTIONS.filter((name) => !plan.goals.some((goal) => goal.name === name)).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          {openGoal && (
            <div className="goal-detail">
              <div className="advice-grid">
                <label>
                  Target
                  <input
                    inputMode="numeric"
                    value={money(openGoal.targetUsd)}
                    onChange={(event) => updateGoal(openGoal.id, { targetUsd: parseMoney(event.target.value) })}
                  />
                </label>
                <label>
                  Funded
                  <input
                    inputMode="numeric"
                    value={money(openGoal.fundedUsd)}
                    onChange={(event) => updateGoal(openGoal.id, { fundedUsd: parseMoney(event.target.value) })}
                  />
                </label>
                <label>
                  Horizon (years)
                  <input
                    type="number"
                    min={0}
                    value={openGoal.horizonYears ?? ''}
                    onChange={(event) => updateGoal(openGoal.id, { horizonYears: parseYears(event.target.value) })}
                  />
                </label>
              </div>
              <label>
                Detail
                <input
                  value={openGoal.note}
                  onChange={(event) => updateGoal(openGoal.id, { note: event.target.value })}
                />
              </label>
              {goalProgress(openGoal) != null && (
                <div className="advice-progress">
                  <span>
                    {openGoal.name} funding {goalProgress(openGoal)}%
                  </span>
                  <div className="book-meter-track">
                    <div
                      className="book-meter-fill tone-neutral"
                      style={{ width: `${Math.min(goalProgress(openGoal) ?? 0, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="advice-grid">
            <label>
              Annual need
              <input
                inputMode="numeric"
                value={money(plan.annualNeedUsd)}
                onChange={(event) => onPlan({ annualNeedUsd: parseMoney(event.target.value) })}
              />
            </label>
            <label>
              Liquidity (years)
              <input
                type="number"
                min={0}
                value={plan.liquidityYears ?? ''}
                onChange={(event) => onPlan({ liquidityYears: parseYears(event.target.value) })}
              />
            </label>
            <label>
              Risk tolerance
              <select
                value={plan.riskTolerance}
                onChange={(event) => onPlan({ riskTolerance: event.target.value as RiskLevel | '' })}
              >
                <option value="">Not scored</option>
                {RISK_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
            <label>
              Risk capacity
              <select
                value={plan.riskCapacity}
                onChange={(event) => onPlan({ riskCapacity: event.target.value as RiskLevel | '' })}
              >
                <option value="">Not scored</option>
                {RISK_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </label>
          </div>
          {participationZone}
          <p className="strategy-line">
            <strong>Next strategy.</strong> {rankedStrategy(plan, portfolio)}
          </p>
        </section>
      )}

      {showPortfolio && (
        <section className="advice-card">
          <header>
            <h3>Portfolio</h3>
            <p>Proposal through funding, reviews, and estate.</p>
          </header>
          {portfolio.targetEquity != null && (
            <p className="muted">IPS equity target {portfolio.targetEquity}%. Move the sleeves to test the book.</p>
          )}
          <div className="advice-grid">
            {(
              [
                ['equity', 'Equity'],
                ['fixed', 'Fixed income'],
                ['cash', 'Cash'],
                ['alts', 'Alternatives'],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label} {portfolio[key]}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={portfolio[key]}
                  onChange={(event) => {
                    setProposed(false)
                    const next = Number(event.target.value)
                    if (key === 'cash') {
                      onPortfolio({ cash: next })
                      return
                    }
                    const rest =
                      (key === 'equity' ? next : portfolio.equity) +
                      (key === 'fixed' ? next : portfolio.fixed) +
                      (key === 'alts' ? next : portfolio.alts)
                    onPortfolio({ [key]: next, cash: Math.max(0, 100 - rest) })
                  }}
                />
              </label>
            ))}
          </div>
          <p className={sum === 100 ? 'muted' : 'advice-sum'}>Sleeves sum to {sum}%.</p>
          {hasProposal && (
            <div className="compare-grid">
              <CompareColumn title="Current" book={portfolio} odds={currentOdds} />
              <CompareColumn title="Proposed (IPS model)" book={proposedBook} odds={proposedOdds} highlight />
            </div>
          )}
          {portfolio.targetEquity != null && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                onPortfolio({ equity: proposedBook.equity, cash: proposedBook.cash })
                setProposed(true)
              }}
            >
              Propose rebalance to the {portfolio.targetEquity}% IPS model
            </button>
          )}
          {proposed && (
            <p className="advice-propose">
              Proposed for you to confirm. Nothing was sent to the client or the custodian.
            </p>
          )}
          <ul className="holding-list">
            {buildHoldings(portfolio, funded).map((line) => (
              <li key={line.name}>
                <span>{line.name}</span>
                <span className="muted">{line.assetClass}</span>
                <strong>${line.value.toLocaleString()}</strong>
              </li>
            ))}
          </ul>
          {buildHoldings(portfolio, funded).length === 0 && (
            <p className="muted">No funded holdings yet. The model is a proposal until money arrives.</p>
          )}
        </section>
      )}

      {flags.length > 0 && (
        <ul className="advice-flags">
          {flags.map((flag) => (
            <li key={flag.title} className={flag.severity}>
              <strong>{flag.severity === 'block' ? 'Anti-pattern' : 'Watch'}</strong>
              <span>
                {flag.title}. {flag.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CompareColumn({
  title,
  book,
  odds,
  highlight,
}: {
  title: string
  book: PortfolioState
  odds: number | null
  highlight?: boolean
}) {
  const rows = [
    ['Equity', book.equity],
    ['Fixed income', book.fixed],
    ['Cash', book.cash],
    ['Alternatives', book.alts],
  ] as const
  return (
    <div className={`compare-col ${highlight ? 'proposed' : ''}`}>
      <div className="compare-title">{title}</div>
      <ul className="compare-sleeves">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span>{label}</span>
            <span className="compare-bar-track">
              <span className="compare-bar-fill" style={{ width: `${value}%` }} />
            </span>
            <strong>{value}%</strong>
          </li>
        ))}
      </ul>
      {odds != null && <div className="compare-odds">Success {odds}%</div>}
    </div>
  )
}
