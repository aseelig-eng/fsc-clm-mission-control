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

/** AI notetaker state, matching Zoom AI Companion / Jump Notetaker / Granola */
export type NotetakerStatus = 'armed' | 'recording' | 'processing' | 'ready' | 'off'

export interface TranscriptLine {
  speaker: string
  /** mm:ss offset into the call */
  at: string
  text: string
}

export interface MeetingAI {
  notetaker: NotetakerStatus
  /** Which connected platform captured it (Zoom, Teams, Meet…) */
  source?: string
  recorded?: boolean
  transcriptMinutes?: number
  /** AI-generated summary paragraph (Zoom AI Companion style) */
  summary?: string
  /** Bulleted key takeaways / highlights */
  takeaways?: string[]
  /** Speaker-attributed transcript excerpt */
  transcript?: TranscriptLine[]
  /** Drafted follow-up email the advisor approves and sends */
  followupEmail?: { subject: string; body: string }
  /** Suggested "Ask AI about this meeting" prompts */
  askSuggestions?: string[]
  /** Whether the AI output has been pushed to the CRM interaction summary */
  syncedToCrm?: boolean
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
  /** Meeting Concierge template, matching the org playbooks */
  playbookName?: string
  /** Pre-meeting brief written from the household file */
  preBrief?: string[]
  /** Post-meeting next steps, the way an interaction summary publishes them */
  nextSteps?: string[]
  prepBriefReady?: boolean
  /** AI notetaker + assistant output */
  ai?: MeetingAI
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
    playbookName: 'Prospect Pre Meeting',
    preBrief: [
      'The file is a name and an email. Do not draft an IPS.',
      'Ask for a phone number, one goal, and whether any account would move.',
      'Ask who would receive an account only if she offers a name.',
    ],
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
    playbookName: 'Prospect Post Meeting',
    nextSteps: [
      'Open the Schwab Roth IRA and the individual brokerage.',
      'Draft the IPS at Growth, score 71.',
      'Name the sibling on the TOD, then add a contingent.',
    ],
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
    playbookName: 'Wealth — Financial Goal Funding & Execution',
    preBrief: [
      'Schwab Roth ···8821 and brokerage ···8822 are open. Managed book is $248,000.',
      'Fidelity Roth ···3391 is still held away. ACAT #48291 was rejected for the TOD signature.',
      'Primary beneficiary is Jordan Chen, sibling, 100%. Contingent is blank.',
      'Resolve that case before you talk about the home goal. The home is not this quarter.',
    ],
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
    playbookName: 'Advisor 30/60/90',
    preBrief: ['Hold this meeting. The ACAT has not settled, so the welcome cadence is not armed.'],
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
    playbookName: 'Prospect Post Meeting',
    nextSteps: [
      'Send the EDD packet to the principal. Do not open the custodian account yet.',
      'Keep the fee schedule locked until that approval.',
      'Eleanor hosts a next-generation intro only after the gate clears.',
    ],
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
    playbookName: 'Life event — beneficiary',
    preBrief: [
      'A US person was added on the trust this week. The contingent path is still open.',
      'Nothing is at the firm. Northern Trust, Goldman, and JPMorgan still hold the $5.2M.',
      'Risk score is 44, conservative. The outside book is 62% equity against a 40% IPS.',
      'Principal has not approved EDD. Do not talk about opening the account until that case is clear.',
    ],
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
    playbookName: 'Annual Review Pre Meeting',
    preBrief: [
      'Income goal is funded at $3.8M. The Roth conversion has no dollar target and a two-year window.',
      'Equity is 68% against an IPS target of 60%. Risk score is 55.',
      'About 90% of known assets are here. The Empower 401(k) is the piece still outside.',
      'Open cases: reallocation, and a missing IRA contingent. The daughter is a trusted contact, not a client.',
      'Close with a 30-minute family touch. Sam can host.',
    ],
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
    nextSteps: [
      'Carry the Roth conversion into the annual review deck.',
      'Leave the 60/40 policy in place until Friday.',
    ],
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
    playbookName: 'Estate intro',
    preBrief: [
      'James died 2 Aug 2026. The $1.1M is still at Schwab and frozen.',
      'Letters testamentary are on file. The retitle still needs Amara’s signature.',
      'Estate EIN and the successor W-9 are not in. Do not run a risk quiz.',
      'She is the heir. The first meeting has not happened. Lead with the path, not a portfolio.',
    ],
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
    nextSteps: [
      'File the letters testamentary.',
      'Hold Tuesday for Amara. Counsel attends.',
      'Do not send anything in her name until the retitle signature is on the packet.',
    ],
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

const CHANNEL_SOURCE: Record<Meeting['channel'], string> = {
  video: 'Zoom',
  phone: 'RingCentral',
  in_person: 'Mobile notetaker',
}

function firstName(attendee: string) {
  return attendee.split(' ')[0]
}

/**
 * Synthesize the AI notetaker + assistant output for a meeting from what the
 * meeting already knows (agenda, summary, decisions, actions, next steps).
 * Completed meetings get a full recording + transcript + summary; scheduled
 * meetings get an armed notetaker and a prep-brief posture. This mirrors the
 * Zoom AI Companion / Jump Notetaker / Granola experience without hand-authoring
 * every field on every meeting.
 */
export function meetingAI(m: Meeting): MeetingAI {
  if (m.ai) return m.ai
  const client = m.attendees.find((a) => !/rivera|lee|ortiz|specialist|compliance|counsel|cra|paraplanner/i.test(a)) ?? m.attendees[0]
  const clientFirst = firstName(client ?? 'the client')

  if (m.status === 'completed') {
    const minutes = m.channel === 'in_person' ? 45 : 38
    const takeaways = [
      ...(m.decisions ?? []).map((d) => `Decision: ${d}`),
      ...(m.nextSteps ?? []).slice(0, 3).map((n) => `Next: ${n}`),
    ].slice(0, 5)
    const transcript: TranscriptLine[] = [
      { speaker: 'A. Rivera', at: '00:42', text: `Thanks for the time today — I want to make sure we land ${m.agenda[0]?.toLowerCase() ?? 'the agenda'}.` },
      { speaker: clientFirst, at: '01:15', text: m.summary?.split('.')[0] ?? 'That works for me, and here is where I stand.' },
      { speaker: 'A. Rivera', at: '04:03', text: (m.decisions?.[0] ? `So we are agreed to ${m.decisions[0].toLowerCase()}.` : 'Let me recap what we agreed.') },
      { speaker: clientFirst, at: '04:20', text: 'Yes, that reflects what we discussed.' },
    ]
    return {
      notetaker: 'ready',
      source: CHANNEL_SOURCE[m.channel],
      recorded: m.channel !== 'in_person',
      transcriptMinutes: minutes,
      summary:
        m.summary ??
        `${m.title} with ${client}. The conversation covered ${m.agenda.slice(0, 3).join(', ').toLowerCase()}. Decisions and next steps were captured and synced to the household file.`,
      takeaways: takeaways.length > 0 ? takeaways : m.agenda.map((a) => `Covered: ${a}`),
      transcript,
      followupEmail: {
        subject: `Recap — ${m.title}`,
        body: [
          `Hi ${clientFirst},`,
          '',
          `Thank you for the time today. Here is a quick recap of what we covered and the next steps.`,
          '',
          ...(m.decisions ?? []).map((d) => `• ${d}`),
          ...(m.nextSteps ?? []).map((n) => `• Next: ${n}`),
          '',
          'I will keep the file updated and follow up as these progress. Let me know if I missed anything.',
          '',
          'Best,',
          'A. Rivera',
        ].join('\n'),
      },
      askSuggestions: [
        'What did the client commit to?',
        'List every open action item and owner.',
        'Draft a note for the compliance file.',
      ],
      syncedToCrm: true,
    }
  }

  // Scheduled / upcoming — notetaker armed, brief posture.
  return {
    notetaker: m.prepBriefReady ? 'armed' : 'off',
    source: CHANNEL_SOURCE[m.channel],
    recorded: false,
    summary: m.prepBriefReady
      ? `Notetaker is armed to join this ${m.channel.replace('_', ' ')} meeting. It will record, transcribe, and draft a summary + action items when the call ends.`
      : 'Notetaker is held until this meeting is unblocked. No capture will run.',
    takeaways: m.preBrief ?? m.agenda.map((a) => `Plan to cover: ${a}`),
    askSuggestions: [
      `What should I open with for ${clientFirst}?`,
      'What is still missing from the file before this meeting?',
      'Summarize the last meeting with this household.',
    ],
    syncedToCrm: false,
  }
}

export function meetingsForHousehold(householdId: string, list: Meeting[] = meetings) {
  return list.filter((m) => m.householdId === householdId)
}

export function openMeetingActions(householdId: string, list: Meeting[] = meetings) {
  return meetingsForHousehold(householdId, list)
    .flatMap((m) => m.actions.map((a) => ({ meeting: m, action: a })))
    .filter((x) => x.action.status === 'open' || x.action.status === 'blocked')
}

// ── Agentic pre / post-meeting actions ─────────────────────────────
// The Meeting Concierge runs a set of one-click agent moves before and after
// a meeting. Pre-meeting actions assemble the brief, pull the file, and prep
// the notetaker; post-meeting actions publish notes, push follow-ups, and open
// the next steps. Each action mirrors the AdvisorAction "one-click-down" idea:
// the agent already did the work; the human approves / reviews.

export type MeetingPhase = 'pre' | 'post'

export interface MeetingAgenticAction {
  id: string
  phase: MeetingPhase
  /** Verb-first label the human clicks */
  label: string
  /** What the agent already did / will do */
  detail: string
  /** 'ready' = agent finished, awaiting your review; 'suggested' = one click to run; 'blocked' = gated */
  state: 'ready' | 'suggested' | 'blocked'
  /** Toast copy when the action is taken */
  done: string
}

function firstNameOf(m: Meeting) {
  const client = m.attendees.find((a) => !/rivera|lee|ortiz|specialist|compliance|counsel|cra|paraplanner/i.test(a)) ?? m.attendees[0]
  return firstName(client ?? 'the client')
}

/**
 * Derive the pre/post agentic actions for a meeting from what it already knows.
 * Scheduled meetings get pre-meeting prep actions; completed meetings get
 * post-meeting publish/follow-up actions. Blocked prep (prepBriefReady === false)
 * surfaces its actions as 'blocked'.
 */
export function meetingAgenticActions(m: Meeting): MeetingAgenticAction[] {
  const who = firstNameOf(m)
  const source = CHANNEL_SOURCE[m.channel]
  const gated = m.prepBriefReady === false

  if (m.status === 'completed') {
    const post: MeetingAgenticAction[] = [
      {
        id: `${m.id}-post-summary`,
        phase: 'post',
        label: 'Publish AI summary to the file',
        detail: 'Notetaker transcribed the call and drafted a summary, takeaways, and decisions. Review and post to the household timeline.',
        state: 'ready',
        done: 'Summary + takeaways posted to the household timeline.',
      },
      {
        id: `${m.id}-post-followup`,
        phase: 'post',
        label: `Send follow-up email to ${who}`,
        detail: 'A recap email is drafted from the decisions and next steps. Approve to send and log it to the client timeline.',
        state: 'ready',
        done: `Follow-up email sent to ${who} and logged.`,
      },
      {
        id: `${m.id}-post-tasks`,
        phase: 'post',
        label: 'Open next steps as tasks',
        detail: `${m.actions.length} action item${m.actions.length === 1 ? '' : 's'} were extracted. Push them into the work queue with owners and due dates.`,
        state: m.actions.length > 0 ? 'ready' : 'suggested',
        done: 'Next steps opened in the work queue.',
      },
      {
        id: `${m.id}-post-crm`,
        phase: 'post',
        label: 'Sync interaction summary to CRM',
        detail: 'Write the meeting outcome to the Salesforce Interaction Summary so the record stays audit-ready.',
        state: 'suggested',
        done: 'Interaction summary synced to CRM.',
      },
    ]
    return post
  }

  const pre: MeetingAgenticAction[] = [
    {
      id: `${m.id}-pre-brief`,
      phase: 'pre',
      label: 'Generate the prep brief',
      detail: gated
        ? 'Prep is held until this meeting is unblocked. The brief will assemble once the gate clears.'
        : 'Agent read the household file and drafted a brief with the agenda, open cases, and what is still missing.',
      state: gated ? 'blocked' : 'ready',
      done: 'Prep brief generated from the household file.',
    },
    {
      id: `${m.id}-pre-pull`,
      phase: 'pre',
      label: 'Pull latest file + open cases',
      detail: 'Refresh accounts, balances, documents, and any open cases so nothing on the call is stale.',
      state: gated ? 'blocked' : 'suggested',
      done: 'Latest file and open cases pulled into the brief.',
    },
    {
      id: `${m.id}-pre-notetaker`,
      phase: 'pre',
      label: `Arm notetaker via ${source}`,
      detail: `The AI notetaker will join the ${m.channel.replace('_', ' ')} call, record, transcribe, and draft notes + action items at the end.`,
      state: gated ? 'blocked' : 'suggested',
      done: `Notetaker armed to join via ${source}.`,
    },
    {
      id: `${m.id}-pre-agenda`,
      phase: 'pre',
      label: `Send agenda to ${who}`,
      detail: 'A confirmation email with the agenda and join link is drafted. Approve to send ahead of the meeting.',
      state: gated ? 'blocked' : 'suggested',
      done: `Agenda sent to ${who}.`,
    },
  ]
  return pre
}

// ── New meeting factory ────────────────────────────────────────────

export interface NewMeetingInput {
  householdId: string
  title: string
  type: MeetingType
  when: string
  channel: Meeting['channel']
  attendees: string[]
  agenda?: string[]
}

const PLAYBOOK_BY_TYPE: Record<MeetingType, string> = {
  prospect: 'Prospect Pre Meeting',
  discovery: 'Discovery Pre Meeting',
  proposal: 'Proposal Pre Meeting',
  orientation: 'Advisor 30/60/90',
  annual_review: 'Annual Review Pre Meeting',
  service: 'Service Check-in',
  estate: 'Estate intro',
  compliance: 'Compliance Review',
}

const DEFAULT_AGENDA: Record<MeetingType, string[]> = {
  prospect: ['How they found us', 'What they want help with', 'Whether to book discovery'],
  discovery: ['Goals & horizon', 'Balance sheet intake', 'Risk conversation', 'Next steps to proposal'],
  proposal: ['Proposed allocation & IPS', 'Fee schedule', 'Custody & funding path'],
  orientation: ['Portal walkthrough', '30/60/90 cadence', 'Billing & statements', 'Q&A'],
  annual_review: ['Net worth & goals', 'Drift / rebalance', 'Tax planning', 'Next-year plan'],
  service: ['Performance', 'Cash need', 'Life updates'],
  estate: ['Condolences & process overview', 'Retitle sequence', 'Successor KYC'],
  compliance: ['Disclosure review', 'KYC / AML refresh', 'Principal decision'],
}

let newMeetingSeq = 0

/** Build a new scheduled meeting from the schedule form. */
export function createMeeting(input: NewMeetingInput): Meeting {
  newMeetingSeq += 1
  const agenda = input.agenda?.filter(Boolean).length ? input.agenda.filter(Boolean) : DEFAULT_AGENDA[input.type]
  return {
    id: `m-new-${newMeetingSeq}-${input.householdId}`,
    householdId: input.householdId,
    title: input.title.trim() || `${input.type.replace('_', ' ')} meeting`,
    when: input.when,
    status: 'scheduled',
    type: input.type,
    attendees: input.attendees.filter(Boolean).length ? input.attendees.filter(Boolean) : ['A. Rivera'],
    channel: input.channel,
    agenda,
    actions: [],
    playbookName: PLAYBOOK_BY_TYPE[input.type],
    preBrief: [
      'New meeting — the agent will assemble the brief from the household file.',
      'Confirm the agenda and attendees before the call.',
    ],
    prepBriefReady: true,
  }
}
