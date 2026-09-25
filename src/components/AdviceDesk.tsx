import { useState } from 'react'
import {
  adviceFlags,
  GOAL_OPTIONS,
  goalProgress,
  RISK_LEVELS,
  type PlanGoal,
  type PlanState,
  type PortfolioState,
  type RiskLevel,
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

export function AdviceDesk({
  plan,
  portfolio,
  showPlan,
  showPortfolio,
  onPlan,
  onPortfolio,
}: {
  plan: PlanState
  portfolio: PortfolioState
  showPlan: boolean
  showPortfolio: boolean
  onPlan: (patch: Partial<PlanState>) => void
  onPortfolio: (patch: Partial<PortfolioState>) => void
}) {
  const flags = adviceFlags(plan, portfolio).filter((flag) => {
    if (showPlan && showPortfolio) return true
    if (showPlan) return flag.scope === 'plan' || flag.scope === 'both'
    return flag.scope === 'portfolio' || flag.scope === 'both'
  })
  const sum = portfolio.equity + portfolio.fixed + portfolio.cash + portfolio.alts
  const [openGoalId, setOpenGoalId] = useState<string | null>(plan.goals[0]?.id ?? null)
  const openGoal = plan.goals.find((goal) => goal.id === openGoalId) ?? null

  function updateGoal(id: string, patch: Partial<PlanGoal>) {
    onPlan({
      goals: plan.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
    })
  }

  return (
    <div className="advice-desk">
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
