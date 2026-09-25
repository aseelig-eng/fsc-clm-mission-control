export type MaturityTier = 'emerging' | 'forming' | 'clear' | 'vivid' | 'exam_ready'

export type FacetId =
  | 'risk'
  | 'engagement'
  | 'channel'
  | 'goals'
  | 'complexity'
  | 'wallet'
  | 'tax_estate'
  | 'heir_readiness'
  | 'trust'

export interface BehavioralFacet {
  id: FacetId
  label: string
  /** 0–100 signal strength */
  score: number
  blurb: string
  evidence: string[]
  inferredBy: 'advisor' | 'agent' | 'mixed'
  /** What advisor should review when clicked */
  recommendedReview: string
}

export interface MaturityBreakdown {
  dataCompleteness: number
  recency: number
  sourceDiversity: number
  advisorConfirmed: number
  /** Composite 0–100 */
  score: number
  tier: MaturityTier
  lastTouched: string
  sources: string[]
}

export type Sex = 'female' | 'male' | 'unspecified'
export type Interest = 'tech' | 'travel' | 'family' | 'markets' | 'garden' | 'art'
export type Occasion = 'birthday' | 'wedding'

export interface LifeEventNote {
  when: string
  label: string
}

export type ContactChannel = 'text' | 'email' | 'whatsapp' | 'phone' | 'video' | 'in_person'

export interface PersonProfile {
  sex: Sex
  interests: Interest[]
  occasion?: Occasion
  deceased?: boolean
  email?: string
  phone?: string
  address?: string
  preferredContact?: ContactChannel[]
  sentiment?: string
  lifeEvents?: LifeEventNote[]
}

export interface PersonLikeness {
  id: string
  householdId: string
  name: string
  role: string
  age?: number
  initials: string
  accent: string
  tagline: string
  profile: PersonProfile
  facets: BehavioralFacet[]
  maturity: MaturityBreakdown
}

export const FACET_META: { id: FacetId; short: string; angle: number }[] = [
  { id: 'risk', short: 'Risk', angle: -90 },
  { id: 'engagement', short: 'Engage', angle: -50 },
  { id: 'channel', short: 'Channel', angle: -10 },
  { id: 'goals', short: 'Goals', angle: 30 },
  { id: 'complexity', short: 'Life', angle: 70 },
  { id: 'wallet', short: 'Wallet', angle: 110 },
  { id: 'tax_estate', short: 'Tax/Est', angle: 150 },
  { id: 'heir_readiness', short: 'Heirs', angle: 190 },
  { id: 'trust', short: 'Trust', angle: 230 },
]

export const MATURITY_LABELS: Record<MaturityTier, { title: string; hint: string }> = {
  emerging: { title: 'Emerging', hint: 'Thin picture — mostly first impressions' },
  forming: { title: 'Forming', hint: 'Skeleton in place; still guessing in places' },
  clear: { title: 'Clear', hint: 'Advisor can act with confidence on most topics' },
  vivid: { title: 'Vivid', hint: 'Rich, multi-source likeness — ready for nuanced advice' },
  exam_ready: {
    title: 'Confirmed',
    hint: 'Complete, recent, and advisor-confirmed. This is what “exam-ready” means: the likeness can be defended in an exam.',
  },
}

function tierFromScore(score: number): MaturityTier {
  if (score >= 90) return 'exam_ready'
  if (score >= 75) return 'vivid'
  if (score >= 55) return 'clear'
  if (score >= 35) return 'forming'
  return 'emerging'
}

function maturity(
  dataCompleteness: number,
  recency: number,
  sourceDiversity: number,
  advisorConfirmed: number,
  lastTouched: string,
  sources: string[],
): MaturityBreakdown {
  const score = Math.round(
    dataCompleteness * 0.35 + recency * 0.2 + sourceDiversity * 0.2 + advisorConfirmed * 0.25,
  )
  return {
    dataCompleteness,
    recency,
    sourceDiversity,
    advisorConfirmed,
    score,
    tier: tierFromScore(score),
    lastTouched,
    sources,
  }
}

export const personsByHousehold: Record<string, PersonLikeness[]> = {
  h0: [
    {
      id: 'p-elena',
      householdId: 'h0',
      name: 'Elena Vasquez',
      role: 'Prospect · thin Person Account',
      initials: 'EV',
      accent: '#706e6b',
      tagline: 'Name and email only. Too early to describe how she decides or who inherits.',
      profile: {
        sex: 'female',
        interests: [],
        email: 'elena.vasquez@example.com',
        address: 'Not on file',
        preferredContact: ['email'],
        sentiment: 'Unknown — one form, no conversation yet',
        lifeEvents: [],
      },
      facets: (
        [
          ['risk', 'Risk posture', 8, 'No score. Nothing to confirm.'],
          ['engagement', 'Engagement', 18, 'One intro on the calendar and a short email thread. Nothing before the web form.'],
          ['channel', 'Digital ↔ high-touch', 15, 'Arrived digitally. Channel preference unknown.'],
          ['goals', 'Goals & horizon', 0, 'No goal or time horizon on file.'],
          ['complexity', 'Life complexity', 5, 'Household structure unknown.'],
          ['wallet', 'Share-of-wallet signal', 0, 'No assets mentioned.'],
          ['tax_estate', 'Tax & estate sensitivity', 0, 'No tax or estate facts.'],
          ['heir_readiness', 'Heir readiness', 0, 'No family or beneficiary information.'],
          ['trust', 'Relationship trust', 10, 'No relationship yet — only a form.'],
        ] as const
      ).map(([id, label, score, blurb]) => ({
        id,
        label,
        score,
        blurb,
        evidence: ['Website form'],
        inferredBy: 'agent' as const,
        recommendedReview: 'Do not infer. Collect this in the intro call.',
      })),
      maturity: maturity(18, 40, 12, 8, 'This morning · Lead Agent', ['Website form']),
    },
  ],
  h1: [
    {
      id: 'p-maya',
      householdId: 'h1',
      name: 'Maya Chen',
      role: 'Primary · Person Account',
      age: 34,
      initials: 'MC',
      accent: '#0176d3',
      tagline: 'Growth-minded builder who wants speed without losing the human touch at key gates.',
      profile: {
        sex: 'female',
        interests: ['tech'],
        email: 'maya.chen@example.com',
        phone: '+1 415-555-0142',
        address: '88 Folsom St, San Francisco, CA',
        preferredContact: ['text', 'email', 'whatsapp'],
        sentiment: 'Warm, and watching whether funding is handled well',
        lifeEvents: [{ when: 'Ahead', label: 'Home purchase is a later moment, not this quarter' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 78,
          blurb: 'High tolerance, strong capacity — Growth 80/20 feels native, not sold.',
          evidence: ['Nitrogen-style score 71', 'IPS Growth signed', 'No drawdown anxiety in discovery'],
          inferredBy: 'mixed',
          recommendedReview: 'Confirm capacity still holds if RSU concentration rises this vest cycle.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 46,
          blurb: 'Early book: one discovery held, a funding call this week, and a short email and DocuSign thread.',
          evidence: ['1 meeting held (discovery)', '2 on the calendar (funding call, orientation on hold)', 'About 8 emails and 2 envelopes'],
          inferredBy: 'agent',
          recommendedReview: 'Keep asks atomic — bundle TOD fix into one envelope, not three emails.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 70,
          blurb: 'Digital-first for ops; wants a human on money-in-motion and life decisions.',
          evidence: ['Chose video discovery', 'Self-serve portal OK', 'Asked for phone on ACAT NIGO'],
          inferredBy: 'mixed',
          recommendedReview: 'Use phone for today’s funding call; keep orientation on video once funded.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 88,
          blurb: 'Clear 25-year growth arc; Moments that Matter = career + eventual home.',
          evidence: ['Primary goal: long-term growth', 'Horizon 25y', 'Jump notes → Fact Find'],
          inferredBy: 'advisor',
          recommendedReview: 'No change needed — carry goal language into welcome kit verbatim.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 28,
          blurb: 'Single household, clean CIP — low structural drag.',
          evidence: ['Individual Person Account', 'US citizen', 'No trust/entity graph'],
          inferredBy: 'agent',
          recommendedReview: 'Watch for future joint / beneficiary complexity only; no action now.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 64,
          blurb: 'Likely to consolidate residual Fidelity cash after smooth funding.',
          evidence: ['Partial ACAT in flight', 'Employer RSU held-away mentioned'],
          inferredBy: 'agent',
          recommendedReview: 'After ACAT clears, agent should propose held-away RSU plan — you approve timing.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 40,
          blurb: 'Light estate posture today; TOD sibling is the only live thread.',
          evidence: ['TOD designation', 'W-9 on file', 'No estate specialist engaged'],
          inferredBy: 'mixed',
          recommendedReview: 'Validate sibling TOD matches discovery intent before DocuSign resend.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 18,
          blurb: 'Early-career — no next-gen cultivation yet; sibling TOD is paperwork, not a relationship.',
          evidence: ['No adult children', 'Sibling TOD only', 'No family meeting on file'],
          inferredBy: 'agent',
          recommendedReview: 'Park heir work for now; revisit if household expands or TOD becomes multi-party.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 74,
          blurb: 'Warm referral trust; still proving ops excellence on first funding.',
          evidence: ['Schwab referral', 'Positive discovery sentiment', 'NIGO is first friction'],
          inferredBy: 'advisor',
          recommendedReview: 'Own the NIGO apology personally — agent drafts, you send.',
        },
      ],
      maturity: maturity(78, 92, 70, 62, '2h ago · Funding Agent', [
        'Discovery meeting',
        'Risk assessment',
        'Portal',
        'Custodian feed',
        'DocuSign lineage',
      ]),
    },
  ],
  h2: [
    {
      id: 'p-robert',
      householdId: 'h2',
      name: 'Robert Whitfield',
      role: 'Co-primary · Decision lead',
      age: 68,
      initials: 'RW',
      accent: '#014486',
      tagline: 'Preserver who wants control, clarity on trusts, and no surprises from compliance.',
      profile: {
        sex: 'male',
        interests: ['markets'],
        email: 'r.whitfield@example.com',
        phone: '+1 212-555-0199',
        address: '12 Gramercy Park, New York, NY',
        preferredContact: ['email', 'in_person'],
        sentiment: 'Exacting. Trust is personal, and he reads every packet',
        lifeEvents: [{ when: 'This week', label: 'US beneficiary added on the trust' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 38,
          blurb: 'Conservative-balanced; allergic to unexplained volatility narratives.',
          evidence: ['Score 44', 'IPS conservative-balanced', 'Asked for downside framing twice'],
          inferredBy: 'advisor',
          recommendedReview: 'Keep principal/EDD language calm and factual — he reads every packet.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 44,
          blurb: 'One deep in-person proposal and Thursday’s follow-up. Email is batched, not a long trail.',
          evidence: ['1 meeting held (in-person proposal)', '1 scheduled (EDD and beneficiary)', 'A handful of batched emails'],
          inferredBy: 'mixed',
          recommendedReview: 'Bundle EDD/principal outcomes into one Thursday briefing, not drip alerts.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 32,
          blurb: 'High-touch default; digital is for signatures, not advice.',
          evidence: ['In-person meetings', 'Assistant manages calendar', 'Paper comfort noted'],
          inferredBy: 'advisor',
          recommendedReview: 'Lead with human on trust/FATCA; use DocuSign only after verbal map.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 80,
          blurb: 'Preserve and transfer — 12-year planning window with legacy intent.',
          evidence: ['Goal: preserve & transfer', 'Horizon 12y', 'Trust primary beneficiary'],
          inferredBy: 'advisor',
          recommendedReview: 'Align fee schedule story to legacy goals once principal clears.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 92,
          blurb: 'Trust + holdcos + UBOs — structural load is the job.',
          evidence: ['Flexible Hierarchy mapped', 'EDD triggered', 'Multi-entity graph'],
          inferredBy: 'agent',
          recommendedReview: 'Walk UBO graph live Thursday; don’t flatten it in email.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 85,
          blurb: '$3.1M ACAT is the wedge; more may follow if transition feels safe.',
          evidence: ['Fidelity ACAT queued', 'External PE interest'],
          inferredBy: 'agent',
          recommendedReview: 'Do not pitch alts until EDD/principal is green.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 95,
          blurb: 'Estate/tax is the emotional and legal center of gravity.',
          evidence: ['US beneficiary cascade', 'CPA letter', 'Estate specialist engaged'],
          inferredBy: 'mixed',
          recommendedReview: 'Confirm W-9/FATCA checklist with him personally on the call.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 42,
          blurb: 'Docs point to transfer; next-gen barely knows the firm — retention risk at legacy event.',
          evidence: ['Trust primary beneficiary', 'No heir intro meeting', 'Counsel knows kids; we do not'],
          inferredBy: 'mixed',
          recommendedReview: 'Propose a soft next-gen intro after principal clears — Eleanor owns the invite.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 70,
          blurb: 'Personal-network trust; will test ops through the EDD gate.',
          evidence: ['Personal referral', 'Brought spouse + counsel'],
          inferredBy: 'advisor',
          recommendedReview: 'CC Eleanor on principal outcome — household trust is joint.',
        },
      ],
      maturity: maturity(88, 75, 90, 78, 'Yesterday · Disclosure Agent', [
        'In-person proposal',
        'Trust documents',
        'CPA letter',
        'Hierarchy graph',
        'EDD packet',
      ]),
    },
    {
      id: 'p-eleanor',
      householdId: 'h2',
      name: 'Eleanor Whitfield',
      role: 'Co-primary · Values & family',
      age: 65,
      initials: 'EW',
      accent: '#2e844a',
      tagline: 'Family steward — less market talk, more “will this take care of our people?”',
      profile: {
        sex: 'female',
        interests: ['family', 'garden'],
        email: 'e.whitfield@example.com',
        phone: '+1 212-555-0199',
        address: '12 Gramercy Park, New York, NY',
        preferredContact: ['text', 'whatsapp', 'in_person'],
        sentiment: 'Caring. She engages when the topic is family, not markets',
        lifeEvents: [{ when: 'Ongoing', label: 'Granddaughter is the trusted contact' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 42,
          blurb: 'Slightly more cautious than Robert on narrative risk, aligned on policy.',
          evidence: ['Softened IPS language requested', 'Joint IPS signed'],
          inferredBy: 'advisor',
          recommendedReview: 'Use “safety / preserve / create” framing in Thursday walkthrough.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 40,
          blurb: 'In the room for the proposal and Thursday. Few emails of her own.',
          evidence: ['1 meeting held with Robert', 'On Thursday’s video', 'Opens family items, skims the rest'],
          inferredBy: 'mixed',
          recommendedReview: 'Lead with trusted-contact + beneficiary story, not ACAT mechanics.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 35,
          blurb: 'Prefers in-person / video with faces; low portal affinity.',
          evidence: ['Attended in-person proposal', 'Portal invite unopened'],
          inferredBy: 'agent',
          recommendedReview: 'Don’t rely on portal for FATCA asks — advisor-led collection.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 86,
          blurb: 'Legacy and family continuity dominate over return maximization.',
          evidence: ['Moments that Matter: family', 'Trust beneficiary'],
          inferredBy: 'advisor',
          recommendedReview: 'Keep granddaughter as trusted contact visible in briefs.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 88,
          blurb: 'Understands trust roles emotionally; leans on Robert for structure detail.',
          evidence: ['Present for UBO discussion', 'Defers legal detail to counsel'],
          inferredBy: 'advisor',
          recommendedReview: 'Pair her with estate specialist for the human path, Robert for graph.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 72,
          blurb: 'Will consolidate if family feels protected — not if process feels cold.',
          evidence: ['Joint decision maker on move'],
          inferredBy: 'agent',
          recommendedReview: 'After funding, invite her to orientation personally.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 90,
          blurb: 'High sensitivity — estate outcomes are personal, not abstract.',
          evidence: ['US beneficiary questions', 'Counsel present'],
          inferredBy: 'mixed',
          recommendedReview: 'Avoid jargon; agent can draft plain-language FATCA explainer for you to own.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 58,
          blurb: 'Family thread started (granddaughter trusted contact) but heirs are not yet firm clients.',
          evidence: ['Granddaughter as trusted contact', 'Asked about family continuity', 'No adult-child IPS'],
          inferredBy: 'advisor',
          recommendedReview: 'Offer a family wealth-meeting after funding — she will champion it if framed as care.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 76,
          blurb: 'Trust is earned through care cues more than portal polish.',
          evidence: ['Positive sentiment in notes', 'Brought family context early'],
          inferredBy: 'advisor',
          recommendedReview: 'Send a short human note after principal decision — agent drafts, you personalize.',
        },
      ],
      maturity: maturity(70, 75, 65, 80, '3d ago · Proposal meeting', [
        'In-person proposal',
        'Meeting notes',
        'Trusted contact form',
      ]),
    },
  ],
  h3: [
    {
      id: 'p-jordan',
      householdId: 'h3',
      name: 'Jordan Adams',
      role: 'Primary · Person Account',
      age: 58,
      initials: 'JA',
      accent: '#0176d3',
      tagline: 'Seasoned client — wants tax craft and calm annual rhythm, not product theater.',
      profile: {
        sex: 'male',
        interests: ['markets'],
        email: 'jordan.adams@example.com',
        phone: '+1 650-555-0177',
        address: '400 University Ave, Palo Alto, CA',
        preferredContact: ['email', 'video'],
        sentiment: 'Steady and loyal. Wants tax craft, not a new pitch',
        lifeEvents: [{ when: 'This year', label: 'RMD window opening' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 55,
          blurb: 'Balanced 60/40; steady through cycles.',
          evidence: ['Risk 55', 'No IPS change 18 months'],
          inferredBy: 'advisor',
          recommendedReview: 'AR deck should show drift vs policy, not new risk quiz.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 88,
          blurb: 'Multi-year book: annual reviews, quarterly check-ins, and a steady email and portal trail.',
          evidence: ['Annual reviews across tenure', 'Q2 service check-in held', 'Portal prep opened; many email threads'],
          inferredBy: 'agent',
          recommendedReview: 'Open with their portal flags — proves we listened.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 58,
          blurb: 'Hybrid: digital prep, human decisions on tax moves.',
          evidence: ['Portal prep', 'Video AR preferred'],
          inferredBy: 'mixed',
          recommendedReview: 'Keep tax specialist on the live segment Friday.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 84,
          blurb: 'Tax-efficient retirement income over 20 years.',
          evidence: ['Goal on file', 'RMD window flagged'],
          inferredBy: 'advisor',
          recommendedReview: 'Approve Roth conversion pages before Friday.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 62,
          blurb: 'Joint + IRA + trust — moderate, well-mapped.',
          evidence: ['Multi-account household', 'Prior funding complete'],
          inferredBy: 'agent',
          recommendedReview: 'No structure change expected this AR.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 70,
          blurb: 'Most investable already here; upside is tax alpha not new AUM.',
          evidence: ['Funded $3.8M', 'Held-away small'],
          inferredBy: 'agent',
          recommendedReview: 'Don’t pitch consolidation; pitch tax craft.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 88,
          blurb: 'High — RMD and Roth conversion are the live plot.',
          evidence: ['Lifecycle Monitor KYC refresh', 'Tax specialist queued'],
          inferredBy: 'mixed',
          recommendedReview: 'Validate tax numbers with specialist before you voice them.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 48,
          blurb: 'Daughter is trusted contact only — not yet oriented to the firm or transfer plan.',
          evidence: ['Daughter trusted contact', 'No next-gen meeting', 'Estate docs stale vs AR depth'],
          inferredBy: 'mixed',
          recommendedReview: 'Use AR close to propose a 30-min family continuity touch this quarter — retention hedge.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 90,
          blurb: 'Deep, multi-year trust — protect it with exam-ready prep.',
          evidence: ['Activated monitoring', 'NPS history strong (demo)'],
          inferredBy: 'advisor',
          recommendedReview: 'Show Portrait maturity “vivid” casually — they like knowing we know them.',
        },
      ],
      maturity: maturity(96, 88, 92, 90, 'This morning · Review Agent', [
        'Annual prep portal',
        'Meeting history',
        'Custodian',
        'Tax notes',
        '9 filed docs',
        'Lifecycle Monitor',
      ]),
    },
    {
      id: 'p-sam',
      householdId: 'h3',
      name: 'Sam Adams',
      role: 'Spouse · Joint decision',
      age: 56,
      initials: 'SA',
      accent: '#dd7a01',
      tagline: 'Quieter voice in meetings — decisive on lifestyle cash and family milestones.',
      profile: {
        sex: 'female',
        interests: ['travel', 'family'],
        occasion: 'birthday',
        email: 'sam.adams@example.com',
        phone: '+1 650-555-0188',
        address: '400 University Ave, Palo Alto, CA',
        preferredContact: ['text', 'whatsapp'],
        sentiment: 'Quiet in meetings, decisive about lifestyle cash',
        lifeEvents: [{ when: 'This month', label: 'Birthday — family gifts and travel cash' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 52,
          blurb: 'Aligned to balanced policy; dislikes technical jargon.',
          evidence: ['Joint IPS', 'Prefers plain language'],
          inferredBy: 'advisor',
          recommendedReview: 'Have Jordan lead markets; you translate lifestyle impact.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 70,
          blurb: 'Shows up for the meetings that matter. Fewer emails than Jordan, and a real history.',
          evidence: ['Attends annual review', 'Q2 check-in', 'Light email, consistent in the room'],
          inferredBy: 'agent',
          recommendedReview: 'Put lifestyle cash need on agenda slide 2.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 48,
          blurb: 'Will use portal if prompted; prefers hearing it live.',
          evidence: ['Did not open prep report'],
          inferredBy: 'agent',
          recommendedReview: 'Verbal summary of portal flags for Sam at start.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 78,
          blurb: 'Travel and family gifts sit beside retirement income.',
          evidence: ['Moments that Matter notes'],
          inferredBy: 'advisor',
          recommendedReview: 'Confirm gift/travel cash need before rebalance talk.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 58,
          blurb: 'Comfortable with joint structure; defers trust detail.',
          evidence: ['Joint accounts', 'Daughter trusted contact'],
          inferredBy: 'mixed',
          recommendedReview: 'No action — keep daughter trusted contact current.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 60,
          blurb: 'Stable — not the growth lever.',
          evidence: ['Household fully funded'],
          inferredBy: 'agent',
          recommendedReview: 'Skip wallet pitch.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 70,
          blurb: 'Cares about after-tax lifestyle more than estate engineering.',
          evidence: ['Asked about taxes in Q2'],
          inferredBy: 'advisor',
          recommendedReview: 'Frame Roth conversion as lifestyle tax bill, not strategy jargon.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 52,
          blurb: 'Family milestones matter to her — natural bridge to introduce next-gen without “estate talk.”',
          evidence: ['Daughter trusted contact', 'Gift/travel goals', 'No heir education session'],
          inferredBy: 'advisor',
          recommendedReview: 'Ask Sam to host a short intro of daughter after AR — she will make it warm.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 86,
          blurb: 'High trust, lower airtime — don’t mistake quiet for disengagement.',
          evidence: ['Long tenure', 'Positive meeting sentiment'],
          inferredBy: 'advisor',
          recommendedReview: 'Invite Sam’s questions explicitly in AR close.',
        },
      ],
      maturity: maturity(72, 70, 55, 75, 'Q2 service check-in', [
        'Meeting notes',
        'Joint IPS',
        'Trusted contact',
      ]),
    },
  ],
  h4: [
    {
      id: 'p-james',
      householdId: 'h4',
      name: 'James Okonkwo (decedent)',
      role: 'Original Person Account · Estate path',
      initials: 'JO',
      accent: '#706e6b',
      tagline: 'Historical likeness — locked for audit; guides retitle and successor care.',
      profile: {
        sex: 'male',
        interests: [],
        deceased: true,
        address: 'Chicago, IL',
        sentiment: 'Historical. The relationship now belongs to Amara',
        lifeEvents: [{ when: '2026-08-02', label: 'Death — estate path opened' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 50,
          blurb: 'Historical balanced posture; accounts frozen pending retitle.',
          evidence: ['Prior IPS', 'Account freeze'],
          inferredBy: 'agent',
          recommendedReview: 'Do not re-risk until successor IPS exists.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 0,
          blurb: 'N/A — estate path.',
          evidence: ['Status: deceased'],
          inferredBy: 'agent',
          recommendedReview: 'Focus engagement model on surviving spouse.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 20,
          blurb: 'Estate work is high-touch by nature.',
          evidence: ['Counsel-led', 'In-person spouse intro'],
          inferredBy: 'advisor',
          recommendedReview: 'Keep digital limited to document vault + e-sign.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 40,
          blurb: 'Goals supersede to estate settlement objectives.',
          evidence: ['Estate Action Plan'],
          inferredBy: 'mixed',
          recommendedReview: 'Use estate memo as the goal proxy in spouse meeting.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 85,
          blurb: 'Probate / retitle complexity is elevated.',
          evidence: ['Letters testamentary', 'Retitle NIGO'],
          inferredBy: 'agent',
          recommendedReview: 'Follow estate memo sequence — no improvisation.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 30,
          blurb: 'Retention of household relationship matters more than wallet expand.',
          evidence: ['$1.1M in transition'],
          inferredBy: 'advisor',
          recommendedReview: 'Measure success as spouse continuity, not AUM upsell.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 98,
          blurb: 'Maximum — this is the work.',
          evidence: ['Estate counsel', 'Tax ID pending'],
          inferredBy: 'mixed',
          recommendedReview: 'Bring counsel-aligned talk track Tuesday.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 35,
          blurb: 'Transfer in motion; surviving spouse not yet firm-ready — classic AUM attrition window.',
          evidence: ['Spouse intro pending', 'No successor IPS', 'Letters testamentary in flight'],
          inferredBy: 'agent',
          recommendedReview: 'Treat Tuesday as heir-readiness work: care + path clarity, not portfolio.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 80,
          blurb: 'Legacy trust with firm — fragile in transition.',
          evidence: ['Multi-year history', 'Spouse intro scheduled'],
          inferredBy: 'advisor',
          recommendedReview: 'Lead with care; agent drafts, you deliver.',
        },
      ],
      maturity: maturity(90, 40, 80, 85, 'Yesterday · Estate Agent', [
        'Historical CRM',
        'Vault docs',
        'Custodian freeze',
        'Estate filings',
      ]),
    },
    {
      id: 'p-amara',
      householdId: 'h4',
      name: 'Amara Okonkwo',
      role: 'Surviving spouse · Successor',
      age: 61,
      initials: 'AO',
      accent: '#ba0517',
      tagline: 'New relationship chapter — high care need, low tolerance for process fog.',
      profile: {
        sex: 'female',
        interests: ['family'],
        phone: '+1 312-555-0160',
        address: 'Chicago, IL',
        preferredContact: ['text', 'in_person'],
        sentiment: 'Fragile. Borrowed trust from James, not yet her own',
        lifeEvents: [{ when: '2026-08', label: 'Death of spouse — first formal intro still ahead' }],
      },
      facets: [
        {
          id: 'risk',
          label: 'Risk posture',
          score: 35,
          blurb: 'Unknown formal score — emotionally risk-off right now.',
          evidence: ['No successor IPS yet'],
          inferredBy: 'agent',
          recommendedReview: 'Do not run a full risk quiz Tuesday — listen first.',
        },
        {
          id: 'engagement',
          label: 'Engagement',
          score: 22,
          blurb: 'One intro accepted and not yet held. A few emails, mostly with counsel copied.',
          evidence: ['1 meeting scheduled (spouse intro)', 'A few emails', 'No prior meetings with the firm'],
          inferredBy: 'advisor',
          recommendedReview: 'Send agenda 24h prior in plain language.',
        },
        {
          id: 'channel',
          label: 'Digital ↔ high-touch',
          score: 25,
          blurb: 'Needs high-touch; portal later.',
          evidence: ['In-person intro', 'Portal invite pending'],
          inferredBy: 'agent',
          recommendedReview: 'Hold portal until after trust is rebuilt in person.',
        },
        {
          id: 'goals',
          label: 'Goals & horizon',
          score: 30,
          blurb: 'Goals forming — security and simplicity first.',
          evidence: ['Successor welcome draft'],
          inferredBy: 'agent',
          recommendedReview: 'Capture goals live; don’t prefill from decedent IPS.',
        },
        {
          id: 'complexity',
          label: 'Life complexity',
          score: 80,
          blurb: 'Life complexity spiked — grief + probate.',
          evidence: ['Estate path', 'KYC packet pending'],
          inferredBy: 'mixed',
          recommendedReview: 'CRA brings KYC packet; you run the human conversation.',
        },
        {
          id: 'wallet',
          label: 'Share-of-wallet signal',
          score: 50,
          blurb: 'Continuity unknown — earn the right to advise.',
          evidence: ['Transition AUM at risk industry-wide'],
          inferredBy: 'agent',
          recommendedReview: 'No consolidation ask in first meeting.',
        },
        {
          id: 'tax_estate',
          label: 'Tax & estate sensitivity',
          score: 92,
          blurb: 'Everything is estate/tax-colored.',
          evidence: ['Counsel attending', 'Retitle checklist'],
          inferredBy: 'mixed',
          recommendedReview: 'Defer legal answers to counsel; you own relationship + next steps.',
        },
        {
          id: 'heir_readiness',
          label: 'Heir readiness',
          score: 28,
          blurb: 'She is the heir — low readiness to stay means household AUM is at risk this quarter.',
          evidence: ['First formal intro pending', 'No goals captured', 'Industry attrition spike at death'],
          inferredBy: 'mixed',
          recommendedReview: 'Primary job Tuesday: make her feel known and safe — readiness before advice.',
        },
        {
          id: 'trust',
          label: 'Relationship trust',
          score: 40,
          blurb: 'Borrowed trust from James — must be re-earned.',
          evidence: ['First formal intro pending'],
          inferredBy: 'advisor',
          recommendedReview: 'Open with care and process map; agent talk track is ready.',
        },
      ],
      maturity: maturity(28, 55, 35, 40, 'Relationship Agent draft', [
        'Estate memo',
        'Counsel notes',
        'Meeting invite',
      ]),
    },
  ],
}

export function personsForHousehold(householdId: string) {
  return personsByHousehold[householdId] ?? []
}
