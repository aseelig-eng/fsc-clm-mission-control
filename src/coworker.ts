import type { ExceptionItem, Household } from './data/types'
import type { PlanState, PortfolioState } from './data/advice'
import { meetings } from './data/meetings'
import { allHandoffs, compositeScore, weakestPillar } from './data/generational'
import { metrics } from './data/content'

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

export function answerCoworker(question: string, ctx: CoworkerContext): CoworkerReply {
  const text = question.toLowerCase()
  const household = findHousehold(text, ctx.households)
  const open = wantsOpen(text)

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
