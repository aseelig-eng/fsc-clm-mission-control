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
    aum: '$248K → funding',
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
