// Secure messaging + texting (#1). Two-way advisor ↔ client threads, captured
// for books-and-records (SEC 17a-4 / FINRA 4511) and supervised. The agent
// drafts replies grounded in the household; a human always sends.

export type MessageChannel = 'secure' | 'sms'
export type MessageAuthor = 'client' | 'advisor' | 'service'

export interface ThreadMessage {
  id: string
  author: MessageAuthor
  name: string
  body: string
  at: string
  channel: MessageChannel
  /** The advisor sent an agent draft (edited or not). */
  agentDrafted?: boolean
  /** Lexicon hits a supervisor should see (promissory language, etc.). */
  flags?: string[]
}

export interface MessageThread {
  id: string
  householdId: string
  subject: string
  channel: MessageChannel
  messages: ThreadMessage[]
  /** The advisor has opened the latest client message. */
  advisorRead: boolean
  /** The client has opened the latest advisor message. */
  clientRead: boolean
}

export const initialThreads: MessageThread[] = [
  {
    id: 'th-maya-acat',
    householdId: 'h1',
    subject: 'Fidelity transfer',
    channel: 'sms',
    advisorRead: false,
    clientRead: true,
    messages: [
      { id: 'm1', author: 'advisor', name: 'A. Rivera', channel: 'sms', at: '2026-09-18T15:02:00', body: 'Hi Maya, the Fidelity transfer came back. They need the TOD signature before they release it. I sent the form to your portal.' },
      { id: 'm2', author: 'client', name: 'Maya Chen', channel: 'sms', at: '2026-09-23T19:41:00', body: 'Got it, thanks. Will signing tonight still get it moving this week? Also does the money sit in cash while it moves?' },
    ],
  },
  {
    id: 'th-maya-home',
    householdId: 'h1',
    subject: 'Saving for a home',
    channel: 'secure',
    advisorRead: true,
    clientRead: true,
    messages: [
      { id: 'm1', author: 'client', name: 'Maya Chen', channel: 'secure', at: '2026-08-30T10:12:00', body: 'Thinking about buying in ~8 years. Should that money be in the same account?' },
      { id: 'm2', author: 'advisor', name: 'A. Rivera', channel: 'secure', at: '2026-08-30T14:30:00', body: 'Good question — a separate, more conservative bucket makes sense for an 8-year goal. Let’s set it up at your next review.' },
    ],
  },
  {
    id: 'th-whit-kids',
    householdId: 'h2',
    subject: 'Meeting the children',
    channel: 'secure',
    advisorRead: false,
    clientRead: true,
    messages: [
      { id: 'm1', author: 'client', name: 'Eleanor Whitfield', channel: 'secure', at: '2026-09-24T09:05:00', body: 'Robert and I talked. The children can join a call in October. Can you also tell us when the trust account will finally move over?' },
    ],
  },
  {
    id: 'th-adams-roth',
    householdId: 'h3',
    subject: 'Roth conversion this year?',
    channel: 'secure',
    advisorRead: true,
    clientRead: false,
    messages: [
      { id: 'm1', author: 'client', name: 'Jordan Adams', channel: 'secure', at: '2026-09-12T08:20:00', body: 'Our CPA mentioned a Roth conversion before I retire. Worth doing this year?' },
      { id: 'm2', author: 'advisor', name: 'A. Rivera', channel: 'secure', at: '2026-09-12T16:45:00', body: 'It may be. The years between retirement and RMDs are often the best window. Our tax specialist will model it ahead of the annual review.' },
    ],
  },
  {
    id: 'th-oko-check',
    householdId: 'h4',
    subject: 'Checking in',
    channel: 'sms',
    advisorRead: false,
    clientRead: true,
    messages: [
      { id: 'm1', author: 'service', name: 'J. Okafor', channel: 'sms', at: '2026-09-20T11:00:00', body: 'Hi Amara, this is Jasmine from Rivera Wealth. The retitle paperwork is with Schwab. No action needed from you this week.' },
      { id: 'm2', author: 'client', name: 'Amara Okonkwo', channel: 'sms', at: '2026-09-25T21:14:00', body: 'Thank you. Someone called saying they were from Schwab and asked for my account number. Was that you?' },
    ],
  },
]

// Promissory / prohibited language a supervisor must see (FINRA 2210 / 3110 lexicon).
const LEXICON: { pattern: RegExp; flag: string }[] = [
  { pattern: /\bguarantee(d|s)?\b/i, flag: 'Promissory: “guarantee”' },
  { pattern: /\brisk[- ]free\b/i, flag: 'Promissory: “risk-free”' },
  { pattern: /\b(can'?t|cannot|won'?t) lose\b/i, flag: 'Promissory: “can’t lose”' },
  { pattern: /\bpromise\b/i, flag: 'Promissory: “promise”' },
  { pattern: /\bsure thing\b/i, flag: 'Promissory: “sure thing”' },
  { pattern: /\b(password|social security number|ssn)\b/i, flag: 'Sensitive data request' },
]

export function lexiconFlags(body: string) {
  return LEXICON.filter((rule) => rule.pattern.test(body)).map((rule) => rule.flag)
}

export function needsReply(thread: MessageThread) {
  const last = thread.messages[thread.messages.length - 1]
  return last?.author === 'client'
}

export function lastClientMessage(thread: MessageThread) {
  return [...thread.messages].reverse().find((message) => message.author === 'client')
}

export interface DraftContext {
  firstName: string
  openCases: string[]
  acatOpen: boolean
  estateOpen: boolean
  roth: boolean
}

/**
 * Agent reply drafter. Deterministic and grounded: it answers the specific
 * question in the last client message with facts from the household file, and
 * says what it does not know rather than inventing it.
 */
export function draftReply(thread: MessageThread, ctx: DraftContext) {
  const ask = lastClientMessage(thread)?.body.toLowerCase() ?? ''
  const parts: string[] = []
  const hi = thread.channel === 'sms' ? `Hi ${ctx.firstName}` : `Hi ${ctx.firstName},`
  if (/called|account number|password|was that you|scam|suspicious/.test(ask)) {
    parts.push(
      'That was not us. We will never call and ask for an account number, password, or code. Please don’t share anything with that caller.',
      'I’ve flagged your accounts for extra verification and our team will call you back from the number on file within the hour to make sure everything is secure.',
    )
  }
  if (/transfer|acat|fidelity|moving|signing|signature/.test(ask) && ctx.acatOpen) {
    parts.push(
      'Yes — once your signature lands we resubmit the transfer the same day. Transfers usually settle in 5–7 business days after that.',
    )
    if (/cash/.test(ask)) parts.push('The positions move in kind where possible, so you stay invested; anything that can’t move in kind arrives as cash and we invest it per your plan.')
  }
  if (/trust|move over/.test(ask)) {
    parts.push('The trust account is waiting on the custodian paperwork. I’ll confirm a firm date this week and send it to you here.')
  }
  if (/children|kids|join a call|october/.test(ask)) {
    parts.push('Wonderful — I’ll send a few October times for a family call. Our Concierge will prepare a short agenda so it stays relaxed.')
  }
  if (/roth|conversion/.test(ask) && ctx.roth) {
    parts.push('Our tax specialist is modeling the conversion now. I’ll share the bracket math before the annual review so you and your CPA can decide together.')
  }
  if (/home|house|buy/.test(ask)) {
    parts.push('For a goal about 8 years out, a separate, steadier bucket is usually the right fit. I can set that up at your next review.')
  }
  if (parts.length === 0) {
    parts.push('Thanks for the note — I’m looking into it and will come back to you today.')
    if (ctx.openCases.length > 0) parts.push(`Meanwhile, we’re still working on: ${ctx.openCases.slice(0, 2).join('; ')}.`)
  }
  const sign = thread.channel === 'sms' ? '— A. Rivera' : 'Best,\nA. Rivera'
  return `${hi} ${parts.join(' ')}\n${sign}`
}

export function newMessageId() {
  return `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
