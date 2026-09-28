import type { Household, LifecycleStage, LifecycleStageId } from './types'

export interface StageFacts {
  aum: string
  risk: string
  nextTouch: string
}

const NOT_REACHED: StageFacts = {
  aum: 'Not reached',
  risk: 'Not assessed',
  nextTouch: 'Not scheduled',
}

const FACTS: Record<string, StageFacts> = {
  'h0:prospect': {
    aum: 'Not stated',
    risk: 'Not assessed',
    nextTouch: 'Mon 11:00a — prospect intro',
  },

  'h1:prospect': {
    aum: 'None on file',
    risk: 'Not scored',
    nextTouch: 'Discovery was held',
  },
  'h1:discovery': {
    aum: '$248K discussed',
    risk: 'Growth, not yet an IPS',
    nextTouch: 'IPS meeting was held',
  },
  'h1:proposal': {
    aum: '$248K',
    risk: 'Growth · Score 71 · IPS signed',
    nextTouch: 'Disclosures were delivered',
  },
  'h1:disclosures': {
    aum: '$248K',
    risk: 'IPS on file',
    nextTouch: 'KYC was cleared',
  },
  'h1:kyc': {
    aum: '$248K',
    risk: 'Score 71 · CIP clear',
    nextTouch: 'Accounts were opened',
  },
  'h1:account_open': {
    aum: 'Accounts open · $0 funded',
    risk: 'Growth · Score 71',
    nextTouch: 'Funding was started',
  },
  'h1:funding': {
    aum: '$496K · $248K managed',
    risk: 'Growth · Score 71',
    nextTouch: 'You: Approve resend',
  },
  'h1:welcome': {
    aum: 'Waiting on funding',
    risk: 'IPS stands',
    nextTouch: 'Orientation not scheduled',
  },

  'h2:prospect': {
    aum: 'Introduced',
    risk: 'Not scored',
    nextTouch: 'Discovery was held',
  },
  'h2:discovery': {
    aum: '$5.2M mapped',
    risk: 'Not scored · Moments map',
    nextTouch: 'Proposal was held',
  },
  'h2:proposal': {
    aum: '$5.2M',
    risk: 'Conservative-Balanced drafted',
    nextTouch: 'Disclosures were filed',
  },
  'h2:disclosures': {
    aum: '$5.2M',
    risk: 'IPS pending principal lock',
    nextTouch: 'EDD was opened',
  },
  'h2:kyc': {
    aum: '$5.2M',
    risk: 'Conservative-Balanced · Score 44',
    nextTouch: 'You: Principal approve',
  },
  'h2:account_open': {
    aum: 'Not opened',
    risk: 'Blocked on principal',
    nextTouch: 'Not scheduled',
  },
  'h2:funding': {
    aum: '$3.1M ACAT not started',
    risk: 'IPS not locked',
    nextTouch: 'Not scheduled',
  },
  'h2:life_event': {
    aum: '$5.2M trust',
    risk: 'US beneficiary added',
    nextTouch: 'You: Confirm on Thursday call',
  },

  'h3:prospect': {
    aum: 'Originated',
    risk: 'Not this stage',
    nextTouch: 'Discovery was held',
  },
  'h3:discovery': {
    aum: 'Fact-find complete',
    risk: 'Balanced direction',
    nextTouch: 'IPS was signed',
  },
  'h3:proposal': {
    aum: 'Proposed book',
    risk: 'Balanced · Score 55 · 60/40',
    nextTouch: 'Disclosures were filed',
  },
  'h3:disclosures': {
    aum: 'Same book',
    risk: 'IPS on file',
    nextTouch: 'KYC was cleared',
  },
  'h3:kyc': {
    aum: 'Cleared to open',
    risk: 'Score 55',
    nextTouch: 'Accounts were opened',
  },
  'h3:account_open': {
    aum: 'Accounts open',
    risk: '60/40 IPS',
    nextTouch: 'Funding completed',
  },
  'h3:funding': {
    aum: '$3.8M funded',
    risk: 'Balanced · Score 55',
    nextTouch: 'Welcome was completed',
  },
  'h3:welcome': {
    aum: '$3.8M',
    risk: 'IPS in force',
    nextTouch: 'Moved to ongoing',
  },
  'h3:ongoing': {
    aum: '$3.8M',
    risk: '60/40 · monitoring on',
    nextTouch: 'Annual review was queued',
  },
  'h3:annual_review': {
    aum: '$3.8M',
    risk: 'Balanced · Score 55 · drift',
    nextTouch: 'Fri 10:00a — Annual Review',
  },
  'h3:life_event': {
    aum: '$3.8M',
    risk: 'Birthday noted, no case opened',
    nextTouch: 'Not scheduled',
  },

  'h4:prospect': {
    aum: 'James originated',
    risk: 'Historical',
    nextTouch: 'Relationship was established',
  },
  'h4:discovery': {
    aum: 'Fact-find on file',
    risk: 'Decedent IPS',
    nextTouch: 'Completed in prior years',
  },
  'h4:proposal': {
    aum: 'Prior IPS',
    risk: 'Decedent policy',
    nextTouch: 'Completed in prior years',
  },
  'h4:disclosures': {
    aum: 'Prior book',
    risk: 'On file',
    nextTouch: 'Completed in prior years',
  },
  'h4:kyc': {
    aum: 'Decedent cleared',
    risk: 'Historical CIP',
    nextTouch: 'Completed in prior years',
  },
  'h4:account_open': {
    aum: 'Individual accounts',
    risk: 'Decedent IPS',
    nextTouch: 'Completed in prior years',
  },
  'h4:funding': {
    aum: '$1.1M was funded',
    risk: 'Decedent IPS',
    nextTouch: 'Completed in prior years',
  },
  'h4:welcome': {
    aum: '$1.1M',
    risk: 'IPS in force',
    nextTouch: 'Completed in prior years',
  },
  'h4:ongoing': {
    aum: '$1.1M',
    risk: 'Monitoring was on',
    nextTouch: 'Last review was completed',
  },
  'h4:annual_review': {
    aum: '$1.1M',
    risk: 'Last decedent review',
    nextTouch: 'Completed before the death',
  },
  'h4:life_event': {
    aum: 'Accounts frozen',
    risk: 'Decedent record',
    nextTouch: 'Spouse intro was set',
  },
  'h4:estate': {
    aum: '$1.1M in transition',
    risk: 'Successor not scored',
    nextTouch: 'Tue — surviving spouse intro',
  },
}

const UPCOMING_IDS = new Set<LifecycleStageId>([
  'welcome',
  'ongoing',
  'annual_review',
  'life_event',
  'estate',
])

export function factsForStage(household: Household, stage: LifecycleStage): StageFacts {
  const row = FACTS[`${household.id}:${stage.id}`]
  if (row) return row
  if (stage.status === 'upcoming' || UPCOMING_IDS.has(stage.id)) return NOT_REACHED
  return {
    aum: household.aum,
    risk: household.risk,
    nextTouch: stage.humanAction ? `You: ${stage.humanAction}` : household.nextClientTouch,
  }
}

// ── Stage-specific measurable categories ──────────────────────────
// Every lifecycle stage measures different things. These definitions drive the
// summary tiles under the progress bar so the categories change as the advisor
// clicks through the rail. Values resolve from the client's onboarding record
// (field key) when available, then fall back to stage facts / a static string.

export interface StageMetric {
  label: string
  value: string
}

interface FieldLike {
  value: string
  status: string
}

interface MetricDef {
  label: string
  /** Record field key(s) to source the value from (first non-empty wins) */
  key?: string | string[]
  /** Fallback when no field value is present */
  fallback?: (facts: StageFacts, household: Household) => string
  /** Format the resolved value */
  format?: (raw: string) => string
}

const currency = (raw: string) => (/^[\d$]/.test(raw) && !raw.includes('$') ? `$${raw}` : raw)

const STAGE_METRIC_DEFS: Record<LifecycleStageId, MetricDef[]> = {
  prospect: [
    { label: 'Lead source', key: 'source', fallback: () => 'Inbound' },
    { label: 'Prospect owner', key: 'advisor', fallback: (_f, h) => h.name },
    { label: 'Lead status', fallback: (f) => f.risk },
    { label: 'Intro meeting', fallback: (f) => f.nextTouch },
  ],
  discovery: [
    { label: 'Primary goal', key: 'goal', fallback: () => 'Not captured' },
    { label: 'Time horizon', key: 'horizon', format: (v) => (/^\d/.test(v) ? `${v} yrs` : v), fallback: () => 'Not captured' },
    { label: 'Investable assets', key: ['investable', 'netWorth'], format: currency, fallback: (f) => f.aum },
    { label: 'Discovery meeting', fallback: (f) => f.nextTouch },
  ],
  proposal: [
    { label: 'Proposed AUM', fallback: (f) => f.aum },
    { label: 'Model / allocation', key: ['allocation', 'model'], fallback: () => 'Drafting' },
    { label: 'IPS status', fallback: (f) => f.risk },
    { label: 'Fee schedule', key: 'feeSchedule', fallback: () => 'Not set' },
  ],
  disclosures: [
    { label: 'Form CRS', key: 'crsAck', fallback: () => 'Pending' },
    { label: 'ADV 2A / 2B', key: 'advAck', fallback: () => 'Pending' },
    { label: 'Reg BI rationale', key: 'regBi', fallback: () => 'Pending' },
    { label: 'Next step', fallback: (f) => f.nextTouch },
  ],
  kyc: [
    { label: 'CIP / ID', key: ['cip', 'idType'], fallback: () => 'Pending' },
    { label: 'OFAC / PEP', key: ['ofac', 'pep'], fallback: () => 'Screening' },
    { label: 'Source of wealth', key: 'sow', fallback: () => 'Not documented' },
    { label: 'Principal approval', key: 'principal', fallback: (f) => f.nextTouch },
  ],
  account_open: [
    { label: 'Custodian', key: 'custodian', fallback: () => 'TBD' },
    { label: 'Account types', key: 'acctTypes', fallback: () => 'Not selected' },
    { label: 'Registration', key: 'registration', fallback: () => 'Not set' },
    { label: 'Account #', key: 'custAcct', fallback: () => 'Not issued' },
  ],
  funding: [
    { label: 'Funding method', key: 'fundMethod', fallback: () => 'Not selected' },
    { label: 'ACAT status', key: 'acat', fallback: (f) => f.nextTouch },
    { label: 'Amount funded', key: 'fundAmt', format: currency, fallback: (f) => f.aum },
    { label: 'Managed AUM', fallback: (f) => f.aum },
  ],
  welcome: [
    { label: 'Client portal', key: 'portal', fallback: () => 'Not provisioned' },
    { label: 'Welcome kit', key: 'welcome', fallback: () => 'Pending' },
    { label: 'Orientation', key: 'orientDate', fallback: (f) => f.nextTouch },
    { label: 'Billing engine', key: 'billing', fallback: () => 'Not initialized' },
  ],
  ongoing: [
    { label: 'Managed AUM', fallback: (f) => f.aum },
    { label: 'Allocation', key: 'allocation', fallback: (f) => f.risk },
    { label: 'Monitoring', fallback: (f) => f.risk },
    { label: 'Next review', fallback: (f) => f.nextTouch },
  ],
  annual_review: [
    { label: 'Review date', fallback: (f) => f.nextTouch },
    { label: 'AUM under review', fallback: (f) => f.aum },
    { label: 'Risk / drift', fallback: (f) => f.risk },
    { label: 'Fee schedule', key: 'feeSchedule', fallback: () => 'On file' },
  ],
  life_event: [
    { label: 'Event', fallback: (f) => f.risk },
    { label: 'Impacted AUM', fallback: (f) => f.aum },
    { label: 'Beneficiary', key: 'beneficiary', fallback: () => 'Under review' },
    { label: 'Next action', fallback: (f) => f.nextTouch },
  ],
  estate: [
    { label: 'Estate value', fallback: (f) => f.aum },
    { label: 'Settlement', fallback: (f) => f.risk },
    { label: 'Beneficiary', key: 'beneficiary', fallback: () => 'Successor TBD' },
    { label: 'Successor contact', fallback: (f) => f.nextTouch },
  ],
}

function resolveField(keys: string | string[] | undefined, fields: Record<string, FieldLike>): string {
  if (!keys) return ''
  const list = Array.isArray(keys) ? keys : [keys]
  // Fallback chain: first key with a usable value wins.
  for (const k of list) {
    const f = fields[k]
    if (f && f.value && f.status !== 'missing' && f.status !== 'blocked' && f.status !== 'n/a') {
      return f.value
    }
  }
  return ''
}

export function stageMetrics(
  household: Household,
  stage: LifecycleStage,
  fields: Record<string, FieldLike> = {},
): StageMetric[] {
  const facts = factsForStage(household, stage)
  const notReached = stage.status === 'upcoming'
  const defs = STAGE_METRIC_DEFS[stage.id] ?? []
  return defs.map((def) => {
    if (notReached) return { label: def.label, value: 'Upcoming' }
    const sourced = resolveField(def.key, fields)
    let value = sourced || (def.fallback ? def.fallback(facts, household) : '—')
    if (sourced && def.format) value = def.format(sourced)
    return { label: def.label, value: value || '—' }
  })
}
