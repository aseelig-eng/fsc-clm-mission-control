// Firm structure and business management (#19–26): hierarchy, practice
// management, compensation, recruiting, training, help desk, peer threads.
// Revenue types are advisory fees and planning/subscription/hourly fees only.

import { aumQuarterlyFee, type Invoice } from './billing'

// ── Hierarchy ────────────────────────────────────────────────────────────
export interface Branch { id: string; name: string; manager: string }
export interface Ensemble { id: string; name: string; branchId: string; leadId: string; leadPct: number }
export interface AdvisorRec {
  id: string
  name: string
  branchId: string
  ensembleId: string | null
  role: 'Lead' | 'Associate' | 'Solo'
  /** Synthetic book beyond the demo households. */
  baseAum: number
  baseClients: number
  baseFeeRevenue: number
  capacity: number
  /** Share of this advisor's revenue booked on ensemble-shared households. */
  sharedPct: number
}

export const FIRM = 'Beneficial Wealth'
export const BRANCHES: Branch[] = [
  { id: 'br-sf', name: 'San Francisco OSJ', manager: 'Jordan Hale' },
  { id: 'br-atx', name: 'Austin', manager: 'Sam Ortega' },
]
export const ENSEMBLES: Ensemble[] = [
  { id: 'en-rivera', name: 'Rivera Ensemble', branchId: 'br-sf', leadId: 'adv-rivera', leadPct: 60 },
  { id: 'en-okafor', name: 'Okafor Ensemble', branchId: 'br-sf', leadId: 'adv-okafor', leadPct: 55 },
  { id: 'en-soto', name: 'Soto Ensemble', branchId: 'br-atx', leadId: 'adv-soto', leadPct: 60 },
]
export const ADVISORS: AdvisorRec[] = [
  { id: 'adv-rivera', name: 'Ana Rivera', branchId: 'br-sf', ensembleId: 'en-rivera', role: 'Lead', baseAum: 118_000_000, baseClients: 52, baseFeeRevenue: 38000, capacity: 70, sharedPct: 0.3 },
  { id: 'adv-doyle', name: 'Chris Doyle', branchId: 'br-sf', ensembleId: 'en-rivera', role: 'Associate', baseAum: 41_000_000, baseClients: 33, baseFeeRevenue: 12000, capacity: 40, sharedPct: 0.5 },
  { id: 'adv-okafor', name: 'David Okafor', branchId: 'br-sf', ensembleId: 'en-okafor', role: 'Lead', baseAum: 164_000_000, baseClients: 41, baseFeeRevenue: 61000, capacity: 55, sharedPct: 0.25 },
  { id: 'adv-nair', name: 'Priya Nair', branchId: 'br-sf', ensembleId: 'en-okafor', role: 'Associate', baseAum: 29_000_000, baseClients: 22, baseFeeRevenue: 9000, capacity: 40, sharedPct: 0.6 },
  { id: 'adv-lindqvist', name: 'Mia Lindqvist', branchId: 'br-sf', ensembleId: null, role: 'Solo', baseAum: 96_000_000, baseClients: 37, baseFeeRevenue: 27000, capacity: 45, sharedPct: 0 },
  { id: 'adv-soto', name: 'Elena Soto', branchId: 'br-atx', ensembleId: 'en-soto', role: 'Lead', baseAum: 88_000_000, baseClients: 44, baseFeeRevenue: 21000, capacity: 60, sharedPct: 0.3 },
  { id: 'adv-park', name: 'Daniel Park', branchId: 'br-atx', ensembleId: 'en-soto', role: 'Associate', baseAum: 24_000_000, baseClients: 26, baseFeeRevenue: 6000, capacity: 32, sharedPct: 0.5 },
]

/** Which advisor owns each seed household. */
export const HOUSEHOLD_ADVISOR: Record<string, string> = { h0: 'adv-rivera', h1: 'adv-rivera', h2: 'adv-okafor', h3: 'adv-lindqvist', h4: 'adv-lindqvist' }

export interface HouseholdFacts { id: string; name: string; managedAum: number; heldAway: number }

export interface AdvisorLive {
  advisor: AdvisorRec
  clients: number
  aum: number
  advisoryRevenue: number
  feeRevenue: number
  revenue: number
  utilization: number
}

export function advisorRollup(facts: HouseholdFacts[], invoices: Invoice[]): AdvisorLive[] {
  return ADVISORS.map((advisor) => {
    const mine = facts.filter((f) => f.id !== 'h0' && HOUSEHOLD_ADVISOR[f.id] === advisor.id)
    const liveAum = mine.reduce((s, f) => s + f.managedAum, 0)
    const aum = advisor.baseAum + liveAum
    const advisoryRevenue = Math.round((advisor.baseAum * 0.0078) + aumQuarterlyFee(liveAum) * 4)
    const paid = invoices
      .filter((i) => i.status === 'paid' && i.type !== 'aum' && mine.some((f) => f.id === i.householdId))
      .reduce((s, i) => s + i.amount, 0)
    const feeRevenue = advisor.baseFeeRevenue + paid
    const clients = advisor.baseClients + mine.length
    return { advisor, clients, aum, advisoryRevenue, feeRevenue, revenue: advisoryRevenue + feeRevenue, utilization: clients / advisor.capacity }
  })
}

// ── Practice management ──────────────────────────────────────────────────
export type Segment = 'A' | 'B' | 'C'
export const SERVICE_MODEL: Record<Segment, { touches: number; label: string; hours: number }> = {
  A: { touches: 4, label: 'Quarterly reviews + proactive planning', hours: 28 },
  B: { touches: 2, label: 'Semi-annual reviews', hours: 14 },
  C: { touches: 1, label: 'Annual review + digital service', hours: 6 },
}
export const HOURLY_COST = 150

export function segmentOf(aum: number): Segment {
  return aum >= 2_000_000 ? 'A' : aum >= 750_000 ? 'B' : 'C'
}

/** Client touches completed in the last 12 months (seed). */
export const TOUCHES_DONE: Record<string, number> = { h1: 2, h2: 4, h3: 1, h4: 2 }

export function householdEconomics(f: HouseholdFacts, invoices: Invoice[]) {
  const total = f.managedAum + f.heldAway
  const seg = segmentOf(total)
  const model = SERVICE_MODEL[seg]
  const done = TOUCHES_DONE[f.id] ?? 0
  const fees = invoices.filter((i) => i.householdId === f.id && i.status === 'paid' && i.type !== 'aum').reduce((s, i) => s + i.amount, 0)
  const revenue = Math.round(aumQuarterlyFee(f.managedAum) * 4 + fees)
  const cost = model.hours * HOURLY_COST
  return { seg, model, done, onModel: done >= model.touches, revenue, cost, margin: revenue - cost }
}

// ── Compensation ─────────────────────────────────────────────────────────
export const PAYOUT_GRID = [
  { from: 0, rate: 0.7 },
  { from: 500_000, rate: 0.75 },
  { from: 1_000_000, rate: 0.8 },
  { from: 2_000_000, rate: 0.85 },
]
export const payoutRate = (annualCredited: number) => [...PAYOUT_GRID].reverse().find((t) => annualCredited >= t.from)?.rate ?? 0.7

export interface Statement {
  advisor: AdvisorRec
  month: string
  advisory: number
  planning: number
  gross: number
  sharedOut: number
  sharedIn: number
  credited: number
  rate: number
  payout: number
}

export function statementFor(advisor: AdvisorRec, all: AdvisorLive[]): Statement {
  const me = all.find((a) => a.advisor.id === advisor.id)!
  const monthly = (n: number) => Math.round(n / 12)
  const advisory = monthly(me.advisoryRevenue)
  const planning = monthly(me.feeRevenue)
  const gross = advisory + planning
  const ens = ENSEMBLES.find((e) => e.id === advisor.ensembleId)
  const sharedOut = advisor.role === 'Associate' && ens ? Math.round(gross * advisor.sharedPct * (ens.leadPct / 100)) : 0
  const sharedIn =
    advisor.role === 'Lead' && ens
      ? all
          .filter((a) => a.advisor.ensembleId === ens.id && a.advisor.role === 'Associate')
          .reduce((s, a) => s + Math.round(monthly(a.revenue) * a.advisor.sharedPct * (ens.leadPct / 100)), 0)
      : 0
  const credited = gross - sharedOut + sharedIn
  const rate = payoutRate(credited * 12)
  return { advisor, month: 'September 2026', advisory, planning, gross, sharedOut, sharedIn, credited, rate, payout: Math.round(credited * rate) }
}

// ── Recruiting ───────────────────────────────────────────────────────────
export type RecruitStage = 'prospect' | 'meeting' | 'offer' | 'signed' | 'onboarding'
export const RECRUIT_STAGES: { id: RecruitStage; label: string }[] = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'meeting', label: 'Meeting' },
  { id: 'offer', label: 'Offer' },
  { id: 'signed', label: 'Signed' },
  { id: 'onboarding', label: 'Onboarding' },
]
export interface Recruit {
  id: string
  name: string
  from: string
  bookAum: number
  estTransition: number
  stage: RecruitStage
  protocol: boolean
  plan?: { step: string; owner: string }[]
}
export const initialRecruits: Recruit[] = [
  { id: 'rc-1', name: 'Karen Whitaker', from: 'Wells Fargo Advisors', bookAum: 140_000_000, estTransition: 98_000_000, stage: 'offer', protocol: true },
  { id: 'rc-2', name: 'Luis Ferreira', from: 'Independent RIA', bookAum: 62_000_000, estTransition: 52_000_000, stage: 'meeting', protocol: false },
  { id: 'rc-3', name: 'Naomi Brandt', from: 'Merrill', bookAum: 205_000_000, estTransition: 140_000_000, stage: 'prospect', protocol: true },
  { id: 'rc-4', name: 'Greg Tanaka', from: 'Edward Jones', bookAum: 78_000_000, estTransition: 61_000_000, stage: 'onboarding', protocol: true },
]
export function transitionPlan(r: Recruit) {
  return [
    { step: `Confirm Broker Protocol status with ${r.from}`, owner: 'Compliance' },
    { step: 'Build the client list limited to protocol-permitted data', owner: 'Transition Agent' },
    { step: 'Pre-fill new-account paperwork and ACAT forms for the top 40 households', owner: 'Transition Agent' },
    { step: 'Draft the client announcement letter for compliance review (FINRA 2210)', owner: 'Marketing agent' },
    { step: 'Schedule 1:1 calls in order of household size', owner: r.name },
    { step: 'Track funded vs pending ACATs daily; escalate stalls after 5 days', owner: 'Operations' },
  ]
}
export const retentionEstimate = (r: Recruit) => Math.round(r.estTransition * (r.plan ? 1.0 : 0.85))

// ── Training & CE ────────────────────────────────────────────────────────
export interface Course { id: string; title: string; kind: 'Required' | 'CE' | 'Tool certification'; hours: number; due: string; unlocks?: string }
export const COURSES: Course[] = [
  { id: 'co-aml', title: 'Annual AML & identity-theft training', kind: 'Required', hours: 1, due: '2026-12-31' },
  { id: 'co-reg', title: 'Reg BI & communications (FINRA 2210)', kind: 'Required', hours: 2, due: '2026-11-30' },
  { id: 'co-cfp', title: 'CFP continuing education: tax planning', kind: 'CE', hours: 4, due: '2026-12-31' },
  { id: 'co-tamp', title: 'TAMP / UMA program certification', kind: 'Tool certification', hours: 2, due: '2026-10-31', unlocks: 'Assigning accounts to the model marketplace' },
  { id: 'co-trade', title: 'Trading platform certification', kind: 'Tool certification', hours: 1, due: '2026-10-31', unlocks: 'Approving rebalance tickets' },
]
export const CE_REQUIRED_HOURS = 8
/** advisorId -> completed course ids (seed). */
export const initialCompleted: Record<string, string[]> = {
  'adv-rivera': ['co-aml', 'co-trade'],
  'adv-doyle': ['co-aml', 'co-reg', 'co-trade', 'co-tamp'],
  'adv-okafor': ['co-aml', 'co-reg', 'co-cfp', 'co-trade', 'co-tamp'],
  'adv-nair': ['co-aml'],
  'adv-lindqvist': ['co-aml', 'co-reg', 'co-trade'],
  'adv-soto': ['co-aml', 'co-reg', 'co-cfp', 'co-trade'],
  'adv-park': [],
}
export const CURRENT_ADVISOR = 'adv-rivera'

// ── Help desk ────────────────────────────────────────────────────────────
export interface KbEntry { id: string; category: 'NIGO' | 'Billing' | 'Trading' | 'Transfers'; keywords: string[]; question: string; answer: string }
export const KB: KbEntry[] = [
  { id: 'kb-1', category: 'NIGO', keywords: ['nigo', 'rejected', 'paperwork', 'signature', 'incomplete'], question: 'Why was my account paperwork returned NIGO?', answer: 'The top three causes are a missing signature on the account agreement, a mismatched name versus the SSA record, and an unchecked beneficiary section. Open the case, fix the highlighted field and re-submit. Resubmissions are reviewed within one business day.' },
  { id: 'kb-2', category: 'Billing', keywords: ['fee', 'billing', 'invoice', 'refund', 'tier'], question: 'How are AUM fees tiered and billed?', answer: 'Fees bill quarterly in advance on quarter-end value: 100 bps to $1M, 80 bps to $3M, 60 bps above. Planning, subscription and hourly engagements bill separately from the Billing panel on the Accounts tab.' },
  { id: 'kb-3', category: 'Trading', keywords: ['restricted', 'wash', 'trade', 'rebalance', 'blocked'], question: 'Why is a security blocked on my rebalance ticket?', answer: 'Securities on the firm restricted list are excluded from tickets automatically. Wash-sale warnings appear when a loss sale follows a purchase within 30 days. Review and acknowledge before approving.' },
  { id: 'kb-4', category: 'Transfers', keywords: ['acat', 'transfer', 'rollover', 'stalled', 'custodian'], question: 'An ACAT transfer has been pending more than five business days.', answer: 'Check the delivering firm’s response code in the case. Most stalls are a name mismatch or a missing medallion. If the code is unclear, open a ticket with the account number and the delivering firm.' },
]
export function searchKb(query: string) {
  const q = query.toLowerCase()
  const scored = KB.map((e) => ({ e, score: e.keywords.filter((k) => q.includes(k)).length })).filter((x) => x.score > 0)
  return scored.sort((a, b) => b.score - a.score)[0]?.e
}
export interface HelpTicket { id: string; advisorId: string; category: KbEntry['category'] | 'Other'; question: string; status: 'open' | 'resolved'; answer?: string; opened: string }
export const initialTickets: HelpTicket[] = [
  { id: 'hd-1', advisorId: 'adv-okafor', category: 'Billing', question: 'Can an hourly engagement convert to a subscription mid-year?', status: 'open', opened: '2026-10-05' },
]

// ── Peer collaboration ───────────────────────────────────────────────────
export interface PeerThread {
  id: string
  title: string
  householdId?: string
  author: string
  expert?: string
  posts: { by: string; text: string }[]
  resolved: boolean
}
export const initialPeer: PeerThread[] = [
  { id: 'pt-1', title: 'Roth ladder when the spouse is still working?', householdId: 'h3', author: 'Mia Lindqvist', expert: 'Tax specialist', posts: [{ by: 'Mia Lindqvist', text: '@Tax specialist: Adams are 68/65 with one still earning. Does a ladder start now or after both retire?' }, { by: 'Tax specialist', text: 'Convert in the years the working spouse’s income drops under the 24% bracket; the Distribution tab shows the fill.' }], resolved: true },
  { id: 'pt-2', title: 'Held-away 401(k) with no rollover option', author: 'Chris Doyle', posts: [{ by: 'Chris Doyle', text: 'Has anyone handled a plan that only allows in-service rollovers after 59½? Client is 57.' }], resolved: false },
]
export const CASE_STUDIES = [
  { id: 'cs-1', title: 'Consolidating $1.4M held away in 90 days', by: 'Ensemble Rivera', lesson: 'Start with the spouse’s IRA, use the Roth account as the first ACAT.' },
  { id: 'cs-2', title: 'Retaining heirs through an estate settlement', by: 'Okafor Ensemble', lesson: 'Meet the heirs before the transfer, not after.' },
]
