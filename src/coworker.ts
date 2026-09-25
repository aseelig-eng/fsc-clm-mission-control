import type { ExceptionItem, Household } from './data/types'
import { goalProgress, successOdds, type PlanState, type PortfolioState } from './data/advice'
import { accountTotals, usd, type ClientNotice, type FinancialAccount } from './data/accounts'
import { meetings } from './data/meetings'
import { allHandoffs, compositeScore, weakestPillar } from './data/generational'
import { metrics } from './data/content'
import type { ClientOnboardingRecord } from './data/onboardingFramework'

export type CoworkerAction =
  | { type: 'show-book' }
  | { type: 'open-client'; householdId: string; tab: 'status' | 'work' | 'record' }

export interface CoworkerReply {
  text: string
  did?: string
  action?: CoworkerAction
}

export interface CoworkerContext {
  households: Household[]
  exceptions: ExceptionItem[]
  plans: Record<string, PlanState>
  portfolios: Record<string, PortfolioState>
  accounts?: FinancialAccount[]
  notices?: ClientNotice[]
  record?: ClientOnboardingRecord
  audience?: 'advisor' | 'client'
  scopeHouseholdId?: string
}

function findHousehold(text: string, households: Household[]) {
  const q = text.toLowerCase()
  return households.find((household) =>
    household.name
      .toLowerCase()
      .split(/[^a-z]+/)
      .some((part) => part.length > 3 && q.includes(part)),
  )
}

function wantsOpen(text: string) {
  return /\b(open|show|go to|take me|pull up|switch to)\b/.test(text)
}

function tabFor(text: string): 'status' | 'work' | 'record' {
  if (/\b(record|form|forms|file|data)\b/.test(text)) return 'record'
  if (/\b(work|agent|agents|done)\b/.test(text)) return 'work'
  return 'status'
}

function exceptionsFor(household: Household, items: ExceptionItem[]) {
  const tokens = household.name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((part) => part.length > 3)
  return items.filter((item) => {
    const label = item.household.toLowerCase()
    return tokens.some((token) => label.includes(token))
  })
}

function accountBrief(accounts: FinancialAccount[]) {
  if (accounts.length === 0) return 'No financial accounts are on file yet.'
  const totals = accountTotals(accounts)
  const lines = accounts.map(
    (account) =>
      `${account.custody === 'managed' ? 'Managed' : 'Held-away'} · ${account.institution} ${account.name} ···${account.mask}: ${usd(account.balance)} (${account.status})`,
  )
  return `Total ${usd(totals.total)}. Managed ${usd(totals.managed)}. Held-away ${usd(totals.heldAway)}.\n${lines.join('\n')}`
}

function answerAsClient(question: string, ctx: CoworkerContext): CoworkerReply {
  const household = ctx.households.find((item) => item.id === ctx.scopeHouseholdId) ?? ctx.households[0]
  const text = question.toLowerCase()
  const others = ctx.households.filter((item) => item.id !== household.id)
  if (findHousehold(text, others)) {
    return {
      text: 'This portal only includes your household. I will not open another client.',
    }
  }
  const accounts = (ctx.accounts ?? []).filter((account) => account.householdId === household.id)
  const plan = ctx.plans[household.id]
  const stage = [...household.stages].reverse().find((item) => item.status !== 'upcoming') ?? household.stages[0]
  const gaps =
    ctx.record?.sections.flatMap((section) =>
      section.fields.filter((field) => field.status === 'missing' || field.status === 'partial' || field.status === 'blocked').map((field) => field.label),
    ) ?? []

  if (/\b(account|balance|holding|transaction|held-away|held away|plaid|managed|what do i own)\b/.test(text)) {
    const recent = accounts
      .flatMap((account) => account.transactions.map((txn) => `${txn.date} · ${account.institution} · ${txn.description} · ${usd(txn.amount)}`))
      .slice(0, 4)
    const positions = accounts
      .flatMap((account) => account.holdings.map((position) => `${position.symbol} · ${position.name} · ${usd(position.value)} · ${position.assetClass}`))
      .slice(0, 5)
    return {
      text: `${accountBrief(accounts)}${positions.length ? `\nHoldings:\n${positions.join('\n')}` : ''}${recent.length ? `\nRecent transactions:\n${recent.join('\n')}` : ''}`,
      did: 'From your financial accounts. I do not move money.',
      action: { type: 'open-client', householdId: household.id, tab: 'status' },
    }
  }

  if (/\b(heir|heirs|handoff|transfer|generational)\b/.test(text)) {
    const handoff = allHandoffs().find((item) => item.householdId === household.id)
    return {
      text: handoff
        ? `Your handoff readiness is ${compositeScore(handoff)}. Weakest area: ${weakestPillar(handoff).label}. ${handoff.risk}`
        : 'There is no heir record on your household yet.',
      did: 'From your household record.',
    }
  }

  if (/\b(goal|plan|planning|on track|retire)\b/.test(text)) {
    const odds = plan ? successOdds(plan, ctx.portfolios[household.id]) : null
    const goals =
      plan?.goals
        .map((goal) => {
          const progress = goalProgress(goal)
          return progress == null ? goal.name : `${goal.name}: ${progress}% funded`
        })
        .join('\n') || 'No goals on file yet.'
    return {
      text: `${goals}\n${odds == null ? 'A success score needs a risk score first.' : `Plan confidence is ${odds}%. Your advisor confirms any change.`}`,
      did: 'From your plan. This is not a trade recommendation.',
    }
  }

  if (/\b(document|statement|vault|tax form)\b/.test(text)) {
    return {
      text: 'Shared documents are in the vault. Your advisor sees the same files.',
      did: 'Opened your documents.',
      action: { type: 'open-client', householdId: household.id, tab: 'record' },
    }
  }

  if (/\b(who needs|needs me|catch up|what happened|radar|what needs|waiting)\b/.test(text)) {
    const waiting = exceptionsFor(household, ctx.exceptions).map((item) => `${item.priority}: ${item.title}`)
    const gapLine = gaps.length ? `Still open on your profile:\n${gaps.slice(0, 4).join('\n')}` : 'Your profile has no open fact-find gaps.'
    return {
      text: `${waiting.length ? `Your advisor is still deciding:\n${waiting.join('\n')}` : 'Your advisor has no open decision on your file.'}\n${gapLine}\n${accountBrief(accounts)}\nI will not clear a compliance hold or place a trade.`,
      did: 'From your household record only.',
    }
  }

  return {
    text: `${household.name.split(' ')[0]}, you are in ${stage?.label ?? household.stageLabel}. Next touch: ${household.nextClientTouch}.\n${accountBrief(accounts)}`,
    did: 'Answered from this household only.',
  }
}

export function answerCoworker(question: string, ctx: CoworkerContext): CoworkerReply {
  if (ctx.audience === 'client') return answerAsClient(question, ctx)
  const text = question.toLowerCase()
  const household = findHousehold(text, ctx.households)
  const open = wantsOpen(text)

  if (/\b(client update|client portal|what did the client|plaid)\b/.test(text) && !household) {
    const openNotices = (ctx.notices ?? []).filter((notice) => !notice.reviewed)
    return {
      text: openNotices.length
        ? `Clients sent this. It is on the profile and still needs you.\n${openNotices.map((notice) => `${notice.householdName}: ${notice.title} — ${notice.detail}`).join('\n')}`
        : 'No unreviewed client updates. The profiles match the portal.',
      did: 'Opened the book queue.',
      action: { type: 'show-book' },
    }
  }

  if (/\b(catch up|what happened|radar)\b/.test(text)) {
    const lines = ctx.exceptions.slice(0, 3).map((item) => `${item.priority}: ${item.title}`)
    return {
      text: lines.length
        ? `Here is what is on your radar.\n${lines.join('\n')}`
        : 'Nothing new is waiting. The book is clear.',
      did: 'Opened the book queue.',
      action: { type: 'show-book' },
    }
  }

  if (/\b(who needs|needs me|signal|nigo|blocked|what needs)\b/.test(text)) {
    const lines = ctx.exceptions.slice(0, 4).map((item) => `${item.priority}: ${item.title}`)
    return {
      text: lines.length
        ? `These are the open signals.\n${lines.join('\n')}`
        : 'Nothing is waiting on you. The book is clear.',
      did: 'Opened the book queue.',
      action: { type: 'show-book' },
    }
  }

  if (/\b(meeting|calendar|this week)\b/.test(text) && !household) {
    const upcoming = meetings
      .filter((meeting) => meeting.status === 'scheduled' && meeting.when >= '2026-09-24' && meeting.when <= '2026-09-30T23:59')
      .map((meeting) => {
        const name = ctx.households.find((item) => item.id === meeting.householdId)?.name ?? 'Household'
        return `${meeting.when.slice(0, 10)} · ${name} · ${meeting.title}`
      })
    return {
      text: upcoming.length ? `Meetings still on the calendar this week:\n${upcoming.join('\n')}` : 'No meetings left this week.',
      action: { type: 'show-book' },
      did: 'Opened the book.',
    }
  }

  if (/\b(heir|heirs|handoff|transfer|generational)\b/.test(text) && !household) {
    const lines = allHandoffs().map((profile) => {
      const name = ctx.households.find((item) => item.id === profile.householdId)?.name ?? profile.principal
      const weak = weakestPillar(profile)
      return `${name}: ${compositeScore(profile)} · weakest ${weak.label}`
    })
    return {
      text: `Handoff readiness across the book. Above 80 is when the relationship usually survives a transfer.\n${lines.join('\n')}`,
      action: { type: 'show-book' },
      did: 'Opened the book.',
    }
  }

  if (/\b(metric|pipeline|hours|saved|nigo rate|aum)\b/.test(text) && !household) {
    const lines = metrics.map((metric) => `${metric.label}: ${metric.value}`)
    return { text: lines.join('\n'), action: { type: 'show-book' }, did: 'Opened the book.' }
  }

  if (household) {
    const plan = ctx.plans[household.id]
    const book = ctx.portfolios[household.id]
    const stage = [...household.stages].reverse().find((item) => item.status !== 'upcoming') ?? household.stages[0]
    const goals = plan?.goals.map((goal) => goal.name).join(', ') || 'No goals yet'
    const handoff = allHandoffs().find((item) => item.householdId === household.id)
    const tab = tabFor(text)

    if (/\b(account|balance|holding|transaction|held-away|held away|managed)\b/.test(text)) {
      const rows = (ctx.accounts ?? []).filter((account) => account.householdId === household.id)
      const pending = (ctx.notices ?? []).filter((notice) => notice.householdId === household.id && !notice.reviewed)
      return {
        text: `${accountBrief(rows)}${pending.length ? `\nWaiting on you:\n${pending.map((notice) => notice.title).join('\n')}` : ''}`,
        action: { type: 'open-client', householdId: household.id, tab: 'record' },
        did: `Opened ${household.name} on the financial accounts.`,
      }
    }

    if (/\b(goal|plan|planning)\b/.test(text)) {
      return {
        text: `${household.name} goals: ${goals}. Risk tolerance is ${plan?.riskTolerance || 'not scored'}.`,
        action: { type: 'open-client', householdId: household.id, tab: 'status' },
        did: `Opened ${household.name} so you can see the plan.`,
      }
    }

    if (/\b(portfolio|allocation|drift|equity|sleeve)\b/.test(text)) {
      return {
        text: `${household.name} portfolio is ${book?.equity ?? 0}% equity, ${book?.fixed ?? 0}% fixed income, ${book?.cash ?? 0}% cash. IPS equity target is ${book?.targetEquity ?? 'not set'}.`,
        action: { type: 'open-client', householdId: household.id, tab: 'status' },
        did: `Opened ${household.name} on the portfolio.`,
      }
    }

    if (/\b(heir|handoff|transfer)\b/.test(text) && handoff) {
      return {
        text: `${household.name} handoff is ${compositeScore(handoff)}. ${handoff.risk}`,
        action: { type: 'open-client', householdId: household.id, tab: 'status' },
        did: `Opened ${household.name}. Select Heirs for the handoff.`,
      }
    }

    const summary = `${household.name} is in ${stage?.label ?? household.stageLabel} (${stage?.status ?? 'active'}). ${household.aum}. ${household.risk}. Next touch: ${household.nextClientTouch}.`
    return {
      text: open || /\b(why|what|how|status|blocked|where)\b/.test(text) ? summary : summary,
      action: { type: 'open-client', householdId: household.id, tab },
      did: `Opened ${household.name} on ${tab === 'status' ? 'Status' : tab === 'work' ? 'Work' : 'Record'}.`,
    }
  }

  if (/\b(book|home)\b/.test(text)) {
    return {
      text: 'Back on the book. Pipeline, this week, and what is kept are on the scoreboard.',
      action: { type: 'show-book' },
      did: 'Opened the book.',
    }
  }

  return {
    text: 'Ask me who needs you, why a household is blocked, what their goals or portfolio look like, or tell me to open a client.',
  }
}
