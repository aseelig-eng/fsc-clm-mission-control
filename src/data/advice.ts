export type RiskLevel = 'Conservative' | 'Moderate' | 'Growth' | 'Aggressive'

export interface PlanGoal {
  id: string
  name: string
  targetUsd: number | null
  fundedUsd: number | null
  horizonYears: number | null
  note: string
}

export interface PlanState {
  goals: PlanGoal[]
  annualNeedUsd: number | null
  liquidityYears: number | null
  riskTolerance: RiskLevel | ''
  riskCapacity: RiskLevel | ''
}

export interface PortfolioState {
  equity: number
  fixed: number
  cash: number
  alts: number
  /** IPS target equity. Drift is measured against this. */
  targetEquity: number | null
  accountFunded: boolean
  estateSettlement: boolean
}

export interface AdviceFlag {
  severity: 'block' | 'warn'
  scope: 'plan' | 'portfolio' | 'both'
  title: string
  detail: string
}

export const RISK_LEVELS: RiskLevel[] = ['Conservative', 'Moderate', 'Growth', 'Aggressive']

const RANK: Record<RiskLevel, number> = {
  Conservative: 1,
  Moderate: 2,
  Growth: 3,
  Aggressive: 4,
}

const EQUITY_BAND: Record<RiskLevel, { min: number; max: number }> = {
  Conservative: { min: 15, max: 40 },
  Moderate: { min: 35, max: 60 },
  Growth: { min: 55, max: 80 },
  Aggressive: { min: 70, max: 95 },
}

export const GOAL_OPTIONS = [
  'Long-term growth',
  'Tax-efficient retirement income',
  'Preserve and transfer wealth',
  'Estate settlement and spouse income',
  'Home purchase',
  'Not chosen',
]

export function goalText(plan: PlanState) {
  return plan.goals
    .map((goal) => goal.name)
    .filter((name) => name && name !== 'Not chosen')
    .join(' ')
}

export function goalProgress(goal: { targetUsd: number | null; fundedUsd: number | null }) {
  if (!goal.targetUsd || goal.fundedUsd == null || goal.targetUsd <= 0) return null
  return Math.round((goal.fundedUsd / goal.targetUsd) * 100)
}

export function adviceFlags(plan: PlanState, portfolio: PortfolioState): AdviceFlag[] {
  const flags: AdviceFlag[] = []
  const sleeves = portfolio.equity + portfolio.fixed + portfolio.cash + portfolio.alts
  const hasAllocation = sleeves > 0
  const goal = goalText(plan).toLowerCase()
  const incomeOrPreserve = /preserve|transfer|income|estate|settlement/.test(goal)
  const progress = plan.goals
    .map((item) => goalProgress(item))
    .filter((value): value is number => value != null)
    .sort((a, b) => a - b)[0]

  if (hasAllocation && sleeves !== 100) {
    flags.push({
      severity: 'warn',
      scope: 'portfolio',
      title: 'Allocation does not add to 100%',
      detail: `The sleeves sum to ${sleeves}%. A book that does not add up cannot be implemented.`,
    })
  }

  if (hasAllocation && !plan.riskTolerance) {
    flags.push({
      severity: 'block',
      scope: 'portfolio',
      title: 'Model chosen before suitability',
      detail: 'An allocation without a risk tolerance is an anti-pattern. Score suitability before the portfolio.',
    })
  }

  if (plan.riskTolerance && plan.riskCapacity && RANK[plan.riskTolerance] > RANK[plan.riskCapacity]) {
    flags.push({
      severity: 'block',
      scope: 'both',
      title: 'Tolerance is above capacity',
      detail: `${plan.riskTolerance} willingness with ${plan.riskCapacity} capacity. Suitability follows the lower of the two.`,
    })
  }

  if (plan.riskTolerance && portfolio.equity > EQUITY_BAND[plan.riskTolerance].max) {
    flags.push({
      severity: 'block',
      scope: 'portfolio',
      title: 'Equity is outside the suitability band',
      detail: `${plan.riskTolerance} supports about ${EQUITY_BAND[plan.riskTolerance].min}–${EQUITY_BAND[plan.riskTolerance].max}% equity. This book is ${portfolio.equity}%.`,
    })
  }

  if (plan.riskTolerance && portfolio.equity + 10 < EQUITY_BAND[plan.riskTolerance].min && /growth/.test(goal)) {
    flags.push({
      severity: 'warn',
      scope: 'both',
      title: 'Allocation is too conservative for the goal',
      detail: `The goal is growth, and equity sits below the ${plan.riskTolerance} band.`,
    })
  }

  const shortHorizon = plan.goals
    .filter((item) => item.targetUsd != null)
    .map((item) => item.horizonYears)
    .filter((years): years is number => years != null)
    .sort((a, b) => a - b)[0]
  if (shortHorizon != null && shortHorizon <= 7 && portfolio.equity > 50) {
    flags.push({
      severity: 'warn',
      scope: 'both',
      title: 'Short horizon, growth allocation',
      detail: `${shortHorizon} years is a short path for ${portfolio.equity}% equity.`,
    })
  }

  if (incomeOrPreserve && portfolio.equity > 65) {
    flags.push({
      severity: 'block',
      scope: 'both',
      title: 'Growth equity fights the goal',
      detail: 'Preserve, income, and estate goals need a calmer book than this equity weight.',
    })
  }

  const funded = plan.goals.reduce((sum, goal) => sum + (goal.fundedUsd ?? 0), 0)
  if (plan.annualNeedUsd && funded > 0 && plan.annualNeedUsd / funded > 0.04 && portfolio.cash < 10) {
    flags.push({
      severity: 'warn',
      scope: 'both',
      title: 'Spending need is ahead of cash',
      detail: 'The annual need is more than 4% of what is funded, and cash is under 10%.',
    })
  }

  if (plan.liquidityYears != null && plan.liquidityYears >= 2 && portfolio.cash < plan.liquidityYears * 4) {
    flags.push({
      severity: 'warn',
      scope: 'both',
      title: 'Cash does not cover the liquidity need',
      detail: `${plan.liquidityYears} years of reserves need more cash than ${portfolio.cash}% of the book.`,
    })
  }

  for (const item of plan.goals) {
    const itemProgress = goalProgress(item)
    if (itemProgress != null && item.horizonYears != null && item.horizonYears <= 8 && itemProgress < 80) {
      flags.push({
        severity: 'warn',
        scope: 'plan',
        title: `${item.name} is not close to funded`,
        detail: `${itemProgress}% of the target is in hand, with ${item.horizonYears} years left.`,
      })
    }
  }

  if (portfolio.alts > 10 && (portfolio.accountFunded === false || (progress != null && progress < 40))) {
    flags.push({
      severity: 'warn',
      scope: 'portfolio',
      title: 'Illiquids before the goal is funded',
      detail: 'Alternatives above 10% while the account is unfunded, or the goal is still far away.',
    })
  }

  if (portfolio.targetEquity != null && Math.abs(portfolio.equity - portfolio.targetEquity) >= 5) {
    flags.push({
      severity: 'warn',
      scope: 'portfolio',
      title: 'Drift versus the IPS',
      detail: `Equity is ${portfolio.equity}% against an IPS target of ${portfolio.targetEquity}%.`,
    })
  }

  if (portfolio.estateSettlement && portfolio.equity > 40) {
    flags.push({
      severity: 'block',
      scope: 'portfolio',
      title: 'Growth book during estate settlement',
      detail: 'Retitle, taxes, and a successor who has not confirmed risk need liquidity, not a growth sleeve.',
    })
  }

  if (portfolio.estateSettlement && portfolio.cash < 15) {
    flags.push({
      severity: 'warn',
      scope: 'portfolio',
      title: 'Estate cash is thin',
      detail: 'Settlement expenses need a larger cash sleeve than this book holds.',
    })
  }

  return flags
}

export const initialPlans: Record<string, PlanState> = {
  h0: {
    goals: [],
    annualNeedUsd: null,
    liquidityYears: null,
    riskTolerance: '',
    riskCapacity: '',
  },
  h1: {
    goals: [
      {
        id: 'maya-growth',
        name: 'Long-term growth',
        targetUsd: 2500000,
        fundedUsd: 248000,
        horizonYears: 25,
        note: 'Roth IRA and taxable brokerage. The account is not funded yet.',
      },
      {
        id: 'maya-home',
        name: 'Home purchase',
        targetUsd: 200000,
        fundedUsd: 0,
        horizonYears: 8,
        note: 'Later. Not a funding need this quarter.',
      },
    ],
    annualNeedUsd: 0,
    liquidityYears: 1,
    riskTolerance: 'Growth',
    riskCapacity: 'Growth',
  },
  h2: {
    goals: [
      {
        id: 'whit-preserve',
        name: 'Preserve wealth',
        targetUsd: 5200000,
        fundedUsd: 0,
        horizonYears: 12,
        note: 'The ACAT has not arrived. The book should stay conservative.',
      },
      {
        id: 'whit-transfer',
        name: 'Transfer to the next generation',
        targetUsd: 5200000,
        fundedUsd: 0,
        horizonYears: 12,
        note: 'Counsel knows the children. The firm has not met them.',
      },
    ],
    annualNeedUsd: 180000,
    liquidityYears: 3,
    riskTolerance: 'Conservative',
    riskCapacity: 'Moderate',
  },
  h3: {
    goals: [
      {
        id: 'adams-income',
        name: 'Tax-efficient retirement income',
        targetUsd: 3800000,
        fundedUsd: 3800000,
        horizonYears: 20,
        note: 'The portfolio is funded. The work is the income and the tax window.',
      },
      {
        id: 'adams-roth',
        name: 'Roth conversion',
        targetUsd: null,
        fundedUsd: null,
        horizonYears: 2,
        note: 'Parked for the annual review. Tax specialist owns the numbers.',
      },
    ],
    annualNeedUsd: 152000,
    liquidityYears: 2,
    riskTolerance: 'Moderate',
    riskCapacity: 'Moderate',
  },
  h4: {
    goals: [
      {
        id: 'oko-estate',
        name: 'Estate settlement',
        targetUsd: 1100000,
        fundedUsd: 1100000,
        horizonYears: 1,
        note: 'Retitle and the estate tax ID are still open.',
      },
      {
        id: 'oko-income',
        name: 'Spouse income',
        targetUsd: 1100000,
        fundedUsd: 1100000,
        horizonYears: 3,
        note: 'Amara has not confirmed a risk score or a spending plan.',
      },
    ],
    annualNeedUsd: 70000,
    liquidityYears: 2,
    riskTolerance: '',
    riskCapacity: '',
  },
}

export const initialPortfolios: Record<string, PortfolioState> = {
  h0: { equity: 0, fixed: 0, cash: 0, alts: 0, targetEquity: null, accountFunded: false, estateSettlement: false },
  h1: { equity: 80, fixed: 15, cash: 5, alts: 0, targetEquity: 80, accountFunded: false, estateSettlement: false },
  h2: { equity: 62, fixed: 28, cash: 8, alts: 2, targetEquity: 40, accountFunded: false, estateSettlement: false },
  h3: { equity: 68, fixed: 27, cash: 5, alts: 0, targetEquity: 60, accountFunded: true, estateSettlement: false },
  h4: { equity: 70, fixed: 20, cash: 6, alts: 4, targetEquity: 30, accountFunded: true, estateSettlement: true },
}

export const PLAN_STAGES = ['discovery', 'proposal', 'annual_review', 'life_event', 'estate']
export const PORTFOLIO_STAGES = ['proposal', 'account_open', 'funding', 'ongoing', 'annual_review', 'life_event', 'estate']
