export type Role = 'advisor' | 'paraplanner' | 'value'

export type StageStatus = 'complete' | 'active' | 'blocked' | 'upcoming' | 'agent-running'

export type LifecycleStageId =
  | 'prospect'
  | 'discovery'
  | 'proposal'
  | 'disclosures'
  | 'kyc'
  | 'account_open'
  | 'funding'
  | 'welcome'
  | 'ongoing'
  | 'annual_review'
  | 'life_event'
  | 'estate'

export interface LifecycleStage {
  id: LifecycleStageId
  label: string
  status: StageStatus
  agentSummary?: string
  humanAction?: string
}

export interface AgentEvent {
  id: string
  time: string
  agent: string
  action: string
  outcome: 'done' | 'needs_you' | 'running'
  stage: LifecycleStageId
}

export interface ExceptionItem {
  id: string
  priority: 'critical' | 'high' | 'medium'
  title: string
  household: string
  reason: string
  recommendedAction: string
  agentContext: string
  stage: LifecycleStageId
  owner: 'advisor' | 'paraplanner' | 'cra' | 'compliance'
}

export interface ParaplannerDeliverable {
  id: string
  type: 'IPS' | 'Proposal' | 'Suitability' | 'Annual Review' | 'Estate Memo'
  household: string
  status: 'draft_ready' | 'needs_review' | 'awaiting_data' | 'approved'
  agentDid: string
  yourJob: string
  estMinutesSaved: number
}

export interface Household {
  id: string
  name: string
  aum: string
  stage: LifecycleStageId
  stageLabel: string
  risk: string
  nextClientTouch: string
  agentsActive: number
  exceptions: number
  stages: LifecycleStage[]
  events: AgentEvent[]
}

export interface PersonaValue {
  persona: string
  tagline: string
  pains: string[]
  valueProps: string[]
  metrics: { label: string; before: string; after: string }[]
}

export interface Competitor {
  name: string
  lane: string
  strength: string
  gap: string
  fscAngle: string
}
