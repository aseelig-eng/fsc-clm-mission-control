// Growth (#14–17): lead pipeline with scoring, content + campaigns with a
// FINRA 2210 review gate, book-wide opportunities, and predictive nudges.

import type { FinancialAccount } from './accounts'
import { accountBalance } from './accounts'
import { fmtK, protectionAnalysis, type FinancialProfile } from './financialProfile'
import { distributionPlan } from './distribution'
import type { PortfolioState } from './advice'

export const TODAY = '2026-10-06'

// ── Leads ────────────────────────────────────────────────────────────────
export type LeadStage = 'new' | 'contacted' | 'intro' | 'proposal' | 'won' | 'lost'
export const LEAD_STAGES: { id: LeadStage; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'intro', label: 'Intro set' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
]
export type LeadSource = 'campaign' | 'referral' | 'website' | 'coi'
export const SOURCE_LABEL: Record<LeadSource, string> = {
  campaign: 'Campaign',
  referral: 'Client referral',
  website: 'Website',
  coi: 'Center of influence',
}

export interface Lead {
  id: string
  name: string
  source: LeadSource
  sourceDetail: string
  stage: LeadStage
  estAssets: number
  /** Engagement signals the score reads. */
  signals: { opened: number; visits: number; replied: boolean; referredByClient: boolean; wealthEvent: boolean }
  note: string
  householdId?: string
  owner: string
}

export const initialLeads: Lead[] = [
  { id: 'ld-1', name: 'Elena Vasquez', source: 'referral', sourceDetail: 'Referred by Maya Chen', stage: 'proposal', estAssets: 2400000, signals: { opened: 5, visits: 4, replied: true, referredByClient: true, wealthEvent: true }, note: 'Business sale closing Q4; proposal out.', householdId: 'h0', owner: 'A. Rivera' },
  { id: 'ld-2', name: 'Dr. Priya Raman', source: 'campaign', sourceDetail: 'Roth window webinar', stage: 'contacted', estAssets: 1800000, signals: { opened: 4, visits: 3, replied: true, referredByClient: false, wealthEvent: false }, note: 'Replied asking about backdoor Roth.', owner: 'A. Rivera' },
  { id: 'ld-3', name: 'Tom & Gail Hendricks', source: 'coi', sourceDetail: 'CPA: Alvarez & Co', stage: 'intro', estAssets: 3100000, signals: { opened: 2, visits: 1, replied: true, referredByClient: false, wealthEvent: true }, note: 'Retiring from a family firm; intro set Oct 14.', owner: 'D. Okafor' },
  { id: 'ld-4', name: 'Marcus Webb', source: 'website', sourceDetail: 'Retirement calculator', stage: 'new', estAssets: 650000, signals: { opened: 1, visits: 5, replied: false, referredByClient: false, wealthEvent: false }, note: 'Ran the calculator three times.', owner: 'A. Rivera' },
  { id: 'ld-5', name: 'Sofia Lindgren', source: 'referral', sourceDetail: 'Referred by Whitfield family', stage: 'new', estAssets: 4200000, signals: { opened: 0, visits: 1, replied: false, referredByClient: true, wealthEvent: true }, note: 'Inherited an estate; no contact yet.', owner: 'M. Lindqvist' },
  { id: 'ld-6', name: 'Bright Path Dental (owner)', source: 'coi', sourceDetail: 'Attorney: R. Osei', stage: 'contacted', estAssets: 1200000, signals: { opened: 1, visits: 0, replied: false, referredByClient: false, wealthEvent: false }, note: 'Exploring a succession plan.', owner: 'D. Okafor' },
]

export function scoreLead(lead: Lead) {
  const reasons: string[] = []
  let score = 20
  const a = lead.estAssets
  const assetPts = a >= 3000000 ? 30 : a >= 1500000 ? 22 : a >= 750000 ? 14 : 6
  score += assetPts
  reasons.push(`${fmtK(a)} est. assets (+${assetPts})`)
  if (lead.signals.referredByClient) { score += 15; reasons.push('Warm client referral (+15)') }
  if (lead.signals.wealthEvent) { score += 12; reasons.push('Wealth event (+12)') }
  if (lead.signals.replied) { score += 10; reasons.push('Replied to outreach (+10)') }
  const eng = Math.min(10, lead.signals.opened * 2 + lead.signals.visits * 2)
  if (eng > 0) { score += eng; reasons.push(`Engagement (+${eng})`) }
  return { score: Math.min(99, score), reasons }
}

// ── Content & campaigns ──────────────────────────────────────────────────
export interface ContentItem { id: string; title: string; topic: string; kind: 'Article' | 'Checklist' | 'Webinar'; summary: string }
export const CONTENT: ContentItem[] = [
  { id: 'ct-roth', title: 'The 2026 Roth conversion window', topic: 'Roth window', kind: 'Article', summary: 'Why the years between retirement and RMDs can be the cheapest time to convert.' },
  { id: 'ct-consol', title: 'One view of everything you own', topic: 'Consolidation', kind: 'Checklist', summary: 'A checklist for bringing scattered accounts under one plan.' },
  { id: 'ct-nextgen', title: 'Talking with the next generation about wealth', topic: 'Next-gen', kind: 'Webinar', summary: 'How families prepare heirs and keep the relationship through a transfer.' },
  { id: 'ct-protect', title: 'Is your family protected if income stops?', topic: 'Protection', kind: 'Article', summary: 'Life, disability and long-term-care gaps, in plain language.' },
]

export interface Segment { id: string; label: string; householdIds: string[]; why: string }

export function buildSegments(
  households: { id: string; name: string }[],
  accounts: FinancialAccount[],
  profiles: Record<string, FinancialProfile>,
  portfolios: Record<string, PortfolioState>,
): Segment[] {
  const clients = households.filter((h) => h.id !== 'h0')
  const roth = clients.filter((h) => {
    const p = profiles[h.id]
    const deferred = accounts.some((a) => a.householdId === h.id && (a.type === 'ira' || a.type === '401k'))
    return p && deferred && p.primaryAge >= 55 && p.primaryAge < 73
  })
  const away = clients.filter((h) => accounts.some((a) => a.householdId === h.id && a.custody === 'held-away'))
  const prot = clients.filter((h) => profiles[h.id] && protectionAnalysis(profiles[h.id]).some((l) => l.status === 'gap'))
  const nextgen = clients.filter((h) => profiles[h.id] && profiles[h.id].primaryAge >= 60)
  void portfolios
  return [
    { id: 'seg-roth', label: 'Pre-RMD with tax-deferred accounts', householdIds: roth.map((h) => h.id), why: 'Age 55–72 with IRA/401(k) money' },
    { id: 'seg-away', label: 'Assets held away', householdIds: away.map((h) => h.id), why: 'At least one held-away account' },
    { id: 'seg-prot', label: 'Protection gaps', householdIds: prot.map((h) => h.id), why: 'Open life, disability, LTC or umbrella gap' },
    { id: 'seg-next', label: 'Age 60+ families', householdIds: nextgen.map((h) => h.id), why: 'Likely transfer-of-wealth conversations' },
  ]
}

export const SEGMENT_FOR_CONTENT: Record<string, string> = { 'ct-roth': 'seg-roth', 'ct-consol': 'seg-away', 'ct-nextgen': 'seg-next', 'ct-protect': 'seg-prot' }

export type CampaignStatus = 'draft' | 'pending_compliance' | 'approved' | 'sent' | 'rejected'
export interface Campaign {
  id: string
  contentId: string
  segmentId: string
  audience: string[]
  subject: string
  body: string
  status: CampaignStatus
  flags: string[]
  reviewNote?: string
  createdAt: string
  stats: { sent: number; opens: number; replies: number; meetings: number }
}

/** FINRA 2210 lexicon: promissory, guaranteed or misleading wording. */
const LEXICON: [RegExp, string][] = [
  [/guarantee[ds]?/i, '“guarantee” (2210(d)(1): no promises of results)'],
  [/risk[- ]free/i, '“risk-free” (misleading)'],
  [/\bwill (earn|outperform|beat|grow)/i, 'Predicts performance (2210(d)(1)(F))'],
  [/best|top[- ]rated|#1/i, 'Superlative claim needs substantiation'],
  [/no[- ]brainer|can'?t lose/i, 'Promissory language'],
]
export function reviewCopy(text: string) {
  return LEXICON.filter(([re]) => re.test(text)).map(([, label]) => label)
}

export function draftCampaign(content: ContentItem, segment: Segment): Pick<Campaign, 'subject' | 'body'> {
  return {
    subject: content.title,
    body: `Hi {first_name},\n\n${content.summary} We put together a short ${content.kind.toLowerCase()} for ${segment.label.toLowerCase()} households, and thought of you.\n\nIf it would help to see how this applies to your own plan, reply here or grab 20 minutes on my calendar.\n\nInvesting involves risk, including loss of principal. This is educational and not a recommendation.`,
  }
}

export const initialCampaigns: Campaign[] = [
  { id: 'cp-seed-1', contentId: 'ct-protect', segmentId: 'seg-prot', audience: [], subject: 'Is your family protected if income stops?', body: 'Hi {first_name},\n\nLife, disability and long-term-care gaps are easy to miss. Here is a short plain-language guide.\n\nInvesting involves risk. This is educational and not a recommendation.', status: 'sent', flags: [], createdAt: '2026-09-10', stats: { sent: 18, opens: 11, replies: 3, meetings: 2 } },
]

// ── Opportunities ────────────────────────────────────────────────────────
export type OpportunityKind = 'consolidate' | 'protection' | 'roth' | 'nextgen' | 'cash'
export interface Opportunity {
  id: string
  kind: OpportunityKind
  householdId: string
  title: string
  detail: string
  /** Estimated annual revenue or lifetime client benefit, in dollars. */
  value: number
  valueLabel: string
  action: string
}

export function findOpportunities(
  households: { id: string; name: string }[],
  accounts: FinancialAccount[],
  profiles: Record<string, FinancialProfile>,
  portfolios: Record<string, PortfolioState>,
): Opportunity[] {
  const out: Opportunity[] = []
  for (const h of households) {
    if (h.id === 'h0') continue
    const mine = accounts.filter((a) => a.householdId === h.id)
    const away = mine.filter((a) => a.custody === 'held-away')
    const awayTotal = away.reduce((s, a) => s + accountBalance(a), 0)
    if (awayTotal > 0)
      out.push({ id: `op-cons-${h.id}`, kind: 'consolidate', householdId: h.id, title: `Consolidate ${fmtK(awayTotal)} held away`, detail: `${away.map((a) => a.institution).join(', ')}. About ${fmtK(awayTotal * 0.01)}/yr advisory revenue at 1%.`, value: Math.round(awayTotal * 0.01), valueLabel: 'per year revenue', action: 'Open Accounts' })
    const p = profiles[h.id]
    if (p) {
      const gaps = protectionAnalysis(p).filter((l) => l.status === 'gap')
      if (gaps.length)
        out.push({ id: `op-prot-${h.id}`, kind: 'protection', householdId: h.id, title: `${gaps.length} protection gap${gaps.length > 1 ? 's' : ''}`, detail: gaps.map((g) => g.label).join(', ') + '. Refer to the Insurance Desk.', value: 0, valueLabel: 'client risk reduced', action: 'Open Planning' })
      const portfolio = portfolios[h.id]
      if (portfolio) {
        const plan = distributionPlan(p, portfolio, mine)
        if (plan && plan.taxSaved > 5000 && plan.conversionTotal > 0)
          out.push({ id: `op-roth-${h.id}`, kind: 'roth', householdId: h.id, title: `Roth conversion window · ${fmtK(plan.conversionTotal)}`, detail: `Bracket-filling saves about ${fmtK(plan.taxSaved)} lifetime tax.`, value: Math.round(plan.taxSaved), valueLabel: 'lifetime tax saved', action: 'Open Distribution' })
      }
      if (p.primaryAge >= 60)
        out.push({ id: `op-next-${h.id}`, kind: 'nextgen', householdId: h.id, title: 'Meet the next generation', detail: `Primary client is ${p.primaryAge}. Heirs are a retention risk at transfer.`, value: 0, valueLabel: 'retention', action: 'Open Status' })
    }
  }
  return out.sort((a, b) => b.value - a.value)
}

// ── Predictive nudges ────────────────────────────────────────────────────
export interface Nudge {
  id: string
  householdId: string
  kind: 'cash' | 'rmd' | 'attrition'
  title: string
  reasoning: string
  action: string
}

export function predictNudges(
  households: { id: string; name: string }[],
  accounts: FinancialAccount[],
  profiles: Record<string, FinancialProfile>,
  unreadClientHouseholds: Set<string>,
): Nudge[] {
  const out: Nudge[] = []
  for (const h of households) {
    if (h.id === 'h0') continue
    const managed = accounts.filter((a) => a.householdId === h.id && a.custody === 'managed' && a.holdings.length > 0)
    const total = managed.reduce((s, a) => s + accountBalance(a), 0)
    const cash = managed.reduce((s, a) => s + a.holdings.filter((p) => p.assetClass === 'Cash').reduce((x, p) => x + p.value, 0), 0)
    if (total > 0 && cash / total > 0.1)
      out.push({ id: `nd-cash-${h.id}`, householdId: h.id, kind: 'cash', title: `Cash drag · ${Math.round((cash / total) * 100)}% in cash`, reasoning: `${fmtK(cash)} sits uninvested. At a 4% opportunity cost that is about ${fmtK(cash * 0.04)}/yr foregone, versus a 2% cash target.`, action: 'Draft a rebalance ticket' })
    const p = profiles[h.id]
    if (p && p.primaryAge >= 71 && p.primaryAge <= 73)
      out.push({ id: `nd-rmd-${h.id}`, householdId: h.id, kind: 'rmd', title: `RMD deadline approaching (age ${p.primaryAge})`, reasoning: 'Required minimum distributions begin at 73. Plan the first withdrawal and any Roth conversions before then.', action: 'Open Distribution' })
    if (unreadClientHouseholds.has(h.id))
      out.push({ id: `nd-attr-${h.id}`, householdId: h.id, kind: 'attrition', title: 'Attrition risk: client waiting on a reply', reasoning: 'Unanswered client messages are the strongest early predictor of a client leaving. Reply before the next review.', action: 'Open Messages' })
  }
  return out
}
