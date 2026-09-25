import type { LifecycleStageId } from './types'

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled'
export type MeetingType =
  | 'prospect'
  | 'discovery'
  | 'proposal'
  | 'orientation'
  | 'annual_review'
  | 'service'
  | 'estate'
  | 'compliance'

export interface MeetingActionItem {
  id: string
  title: string
  owner: 'advisor' | 'paraplanner' | 'cra' | 'client' | 'compliance' | 'specialist'
  due: string
  status: 'open' | 'done' | 'blocked'
  /** One-click-down: what the user should review / decide */
  recommendedReview: string
  relatedStage?: LifecycleStageId
}

export interface Meeting {
  id: string
  householdId: string
  title: string
  when: string
  status: MeetingStatus
  type: MeetingType
  attendees: string[]
  channel: 'video' | 'in_person' | 'phone'
  agenda: string[]
  summary?: string
  decisions?: string[]
  actions: MeetingActionItem[]
  playbookId?: string
  prepBriefReady?: boolean
}

export const meetings: Meeting[] = [
  // Elena Vasquez — prospect
  {
    id: 'm-elena-1',
    householdId: 'h0',
    title: 'Prospect intro — fit and first goals',
    when: '2026-09-29T11:00:00',
    status: 'scheduled',
    type: 'prospect',
    attendees: ['Elena Vasquez', 'A. Rivera'],
    channel: 'video',
    agenda: ['How she found us', 'What she wants help with', 'Whether to book discovery', 'What we still need: phone, assets, goal'],
    actions: [
      {
        id: 'ma-e1',
        title: 'Use the thin file — do not invent a plan',
        owner: 'advisor',
        due: '2026-09-29',
        status: 'open',
        recommendedReview:
          'Person Account has name and email only. Open the call by confirming those, then capture phone, a goal, and whether there is money to move. Do not run a risk quiz yet.',
        relatedStage: 'prospect',
      },
    ],
    playbookId: 'a0Cfn00001fPROS01',
    prepBriefReady: true,
  },

  // Maya Chen
  {
    id: 'm-chen-1',
    householdId: 'h1',
    title: 'Discovery — goals & Moments that Matter',
    when: '2026-09-12T10:00:00',
    status: 'completed',
    type: 'discovery',
    attendees: ['Maya Chen', 'A. Rivera', 'Paraplanner J. Lee'],
    channel: 'video',
    agenda: ['Goals & horizon', 'Balance sheet intake', 'Risk conversation', 'Next steps to proposal'],
    summary:
      'Client confirmed growth objective, 25yr horizon, Roth + taxable. Jump notes synced to Fact Find. IPS path agreed.',
    decisions: ['Pursue Schwab DAIM open', 'Roth IRA + Individual brokerage', 'Sibling as TOD beneficiary'],
    actions: [
      {
        id: 'ma-c1',
        title: 'Finalize IPS narrative for Growth 80/20',
        owner: 'paraplanner',
        due: '2026-09-15',
        status: 'done',
        recommendedReview: 'Confirm risk score 71 aligns with IPS language before client send.',
        relatedStage: 'proposal',
      },
    ],
    playbookId: 'a0Cfn00001fDISC01',
    prepBriefReady: true,
  },
  {
    id: 'm-chen-2',
    householdId: 'h1',
    title: 'Funding status — ACAT NIGO resolution',
    when: '2026-09-24T15:30:00',
    status: 'scheduled',
    type: 'service',
    attendees: ['Maya Chen', 'A. Rivera'],
    channel: 'phone',
    agenda: ['Explain TOD NIGO', 'Approve DocuSign resend', 'Confirm ACAT restart timing'],
    actions: [
      {
        id: 'ma-c2',
        title: 'Approve corrected TOD DocuSign before call',
        owner: 'advisor',
        due: '2026-09-24',
        status: 'open',
        recommendedReview:
          'Open agent-drafted envelope: verify TOD designation matches discovery notes (sibling), then Approve & send. Do not re-key forms.',
        relatedStage: 'funding',
      },
    ],
    playbookId: 'a0Cfn00001fFUND01',
    prepBriefReady: true,
  },
  {
    id: 'm-chen-3',
    householdId: 'h1',
    title: 'Welcome orientation (hold — post funding)',
    when: '2026-10-08T10:00:00',
    status: 'scheduled',
    type: 'orientation',
    attendees: ['Maya Chen', 'A. Rivera', 'CRA M. Ortiz'],
    channel: 'video',
    agenda: ['Portal walkthrough', '30/60/90 cadence', 'Billing & statements', 'Q&A'],
    actions: [
      {
        id: 'ma-c3',
        title: 'Confirm orientation date once ACAT settles',
        owner: 'cra',
        due: '2026-09-26',
        status: 'blocked',
        recommendedReview:
          'Blocked on funding. After ACAT clears, review portal provisioning checklist and keep 10/8 slot or reschedule.',
        relatedStage: 'welcome',
      },
    ],
    playbookId: 'a0Cfn00001fMN4iEAG',
    prepBriefReady: false,
  },

  // Whitfield
  {
    id: 'm-whit-1',
    householdId: 'h2',
    title: 'Proposal & trust structure walkthrough',
    when: '2026-09-18T14:00:00',
    status: 'completed',
    type: 'proposal',
    attendees: ['Robert Whitfield', 'Eleanor Whitfield', 'A. Rivera', 'Estate specialist'],
    channel: 'in_person',
    agenda: ['Trust / UBO map', 'Conservative-Balanced IPS', 'Altruist custody', 'EDD expectations'],
    summary:
      'Household agreed to Altruist + $3.1M ACAT from Fidelity. EDD triggered on $5.2M. Granddaughter named trusted contact.',
    decisions: ['Proceed to EDD / principal', 'Trust as primary beneficiary', 'Fee schedule hold until principal'],
    actions: [
      {
        id: 'ma-w1',
        title: 'Assemble EDD packet for principal',
        owner: 'compliance',
        due: '2026-09-22',
        status: 'done',
        recommendedReview: 'Packet complete — advisor should spot-check SOW narrative vs CPA letter.',
        relatedStage: 'kyc',
      },
    ],
    playbookId: 'a0Cfn00001fPROP01',
    prepBriefReady: true,
  },
  {
    id: 'm-whit-2',
    householdId: 'h2',
    title: 'Trust structure — US beneficiary implications',
    when: '2026-09-25T15:00:00',
    status: 'scheduled',
    type: 'compliance',
    attendees: ['Robert Whitfield', 'Eleanor Whitfield', 'A. Rivera', 'Compliance', 'Estate specialist'],
    channel: 'video',
    agenda: ['US beneficiary / FATCA', 'W-9 cascade across related accounts', 'Principal EDD decision'],
    actions: [
      {
        id: 'ma-w2',
        title: 'Principal approve EDD before meeting',
        owner: 'compliance',
        due: '2026-09-25',
        status: 'open',
        recommendedReview:
          'Review SOW evidence links + risk score 3/5. Approve principal gate or request more docs. Meeting cannot advance custody without this.',
        relatedStage: 'kyc',
      },
      {
        id: 'ma-w3',
        title: 'Confirm W-9 / FATCA checklist with client',
        owner: 'advisor',
        due: '2026-09-25',
        status: 'open',
        recommendedReview:
          'Agent pre-built document checklist for US person beneficiary. Confirm list with client on the call; do not invent extra forms.',
        relatedStage: 'life_event',
      },
    ],
    playbookId: 'a0Cfn00001fTRUST01',
    prepBriefReady: true,
  },

  // Adams
  {
    id: 'm-adam-1',
    householdId: 'h3',
    title: 'Annual Review 2026',
    when: '2026-09-26T10:00:00',
    status: 'scheduled',
    type: 'annual_review',
    attendees: ['Adams Household', 'A. Rivera', 'Tax specialist'],
    channel: 'video',
    agenda: ['Net worth & goals', 'Drift / rebalance', 'RMD timeline', 'Roth conversion options', 'Tax specialist handoff'],
    actions: [
      {
        id: 'ma-a1',
        title: 'Approve annual review agenda & deck',
        owner: 'advisor',
        due: '2026-09-25',
        status: 'open',
        recommendedReview:
          'Paraplanner draft is ready. Review RMD / Roth pages with tax specialist notes; approve agenda for Friday send.',
        relatedStage: 'annual_review',
      },
      {
        id: 'ma-a2',
        title: 'Book joint tax specialist segment',
        owner: 'advisor',
        due: '2026-09-25',
        status: 'open',
        recommendedReview:
          'Agent proposes 20-min specialist block at end of AR. Confirm calendar and talking points in prep brief.',
        relatedStage: 'annual_review',
      },
    ],
    playbookId: 'a0Cfn00001fADAMS01',
    prepBriefReady: true,
  },
  {
    id: 'm-adam-2',
    householdId: 'h3',
    title: 'Q2 service check-in',
    when: '2026-06-11T11:00:00',
    status: 'completed',
    type: 'service',
    attendees: ['Adams Household', 'A. Rivera'],
    channel: 'video',
    agenda: ['Performance', 'Cash need', 'Life updates'],
    summary: 'No material life changes. Client asked about Roth conversion window in 2026–27. Flagged for AR.',
    decisions: ['Keep 60/40', 'Park Roth conversion for annual review'],
    actions: [
      {
        id: 'ma-a3',
        title: 'Carry Roth conversion analysis into AR deck',
        owner: 'paraplanner',
        due: '2026-09-20',
        status: 'done',
        recommendedReview: 'Already in AR draft — advisor to validate tax numbers.',
        relatedStage: 'annual_review',
      },
    ],
    prepBriefReady: true,
  },

  // Okonkwo estate
  {
    id: 'm-ok-1',
    householdId: 'h4',
    title: 'Surviving spouse intro & estate path',
    when: '2026-09-30T14:00:00',
    status: 'scheduled',
    type: 'estate',
    attendees: ['Surviving spouse', 'Estate counsel', 'A. Rivera', 'CRA'],
    channel: 'in_person',
    agenda: ['Condolences & process overview', 'Retitle sequence', 'Successor KYC', 'Portal / authority'],
    actions: [
      {
        id: 'ma-o1',
        title: 'Review estate memo before spouse meeting',
        owner: 'advisor',
        due: '2026-09-29',
        status: 'open',
        recommendedReview:
          'Paraplanner estate memo lists retitle order + beneficiary notices. Confirm counsel alignment; use as talk track — do not improvise legal steps.',
        relatedStage: 'estate',
      },
      {
        id: 'ma-o2',
        title: 'Prepare successor KYC packet',
        owner: 'cra',
        due: '2026-09-29',
        status: 'open',
        recommendedReview:
          'Agent drafted next-of-kin KYC packet. Verify ID requirements and bring print + DocuSign links to meeting.',
        relatedStage: 'estate',
      },
    ],
    playbookId: 'a0Cfn00001fESTATE01',
    prepBriefReady: true,
  },
  {
    id: 'm-ok-2',
    householdId: 'h4',
    title: 'Internal estate huddle',
    when: '2026-09-10T09:00:00',
    status: 'completed',
    type: 'estate',
    attendees: ['A. Rivera', 'CRA', 'Estate specialist'],
    channel: 'video',
    agenda: ['Freeze accounts', 'Document intake', 'Spouse outreach plan'],
    summary: 'Death certificate + letters testamentary ingested. Account freeze confirmed at custodian.',
    decisions: ['Open estate Action Plan', 'Schedule spouse intro for 9/30'],
    actions: [
      {
        id: 'ma-o3',
        title: 'File letters testamentary to vault',
        owner: 'cra',
        due: '2026-09-11',
        status: 'done',
        recommendedReview: 'Already filed — available under compliance vault.',
        relatedStage: 'estate',
      },
    ],
    prepBriefReady: true,
  },
]

export function meetingsForHousehold(householdId: string) {
  return meetings.filter((m) => m.householdId === householdId)
}

export function openMeetingActions(householdId: string) {
  return meetingsForHousehold(householdId)
    .flatMap((m) => m.actions.map((a) => ({ meeting: m, action: a })))
    .filter((x) => x.action.status === 'open' || x.action.status === 'blocked')
}
