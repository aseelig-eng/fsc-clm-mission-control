// Integration Hub catalog — parity with Jump's advisor integration directory
// (jump.ai/integrations). Grouped the way Jump groups them, with a couple of
// connections pre-wired to match the demo org (Salesforce FSC + the video
// notetaker) so the meeting AI has somewhere to sync.

export type IntegrationCategory =
  | 'CRM'
  | 'Meetings & Video'
  | 'Financial Planning'
  | 'Portfolio Management'
  | 'Custodians'
  | 'Calendar & Email'
  | 'Documents'
  | 'Tax'
  | 'Communication'
  | 'Workflow & Automation'

export type IntegrationStatus = 'connected' | 'available'

export interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: IntegrationStatus
  blurb: string
  /** Brand domain — used to render the fintech's real logo/favicon */
  domain: string
  /** What the two-way sync moves, shown when connected */
  syncs?: string
}

/** Real brand logo from the domain (falls back to a monogram if it 404s). */
export function logoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

export const CATEGORY_ORDER: IntegrationCategory[] = [
  'CRM',
  'Meetings & Video',
  'Financial Planning',
  'Portfolio Management',
  'Custodians',
  'Calendar & Email',
  'Documents',
  'Tax',
  'Communication',
  'Workflow & Automation',
]

export const integrations: Integration[] = [
  // CRM
  {
    id: 'salesforce',
    name: 'Salesforce Financial Services Cloud',
    category: 'CRM',
    status: 'connected',
    domain: 'salesforce.com',
    blurb: 'Bidirectional sync with FSC Person Accounts, custom objects, and fields.',
    syncs: 'Meeting notes → Interaction Summary · Action items → Tasks · Fact Find → Person Account',
  },
  { id: 'wealthbox', name: 'Wealthbox', category: 'CRM', status: 'available', domain: 'wealthbox.com', blurb: 'Contacts, workflows, and notes sync for RIAs.' },
  { id: 'redtail', name: 'Redtail', category: 'CRM', status: 'available', domain: 'redtailtechnology.com', blurb: 'Notes, activities, and contact records.' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', status: 'available', domain: 'hubspot.com', blurb: 'Deals, contacts, and follow-up sequences.' },
  { id: 'dynamics', name: 'Dynamics 365 Sales', category: 'CRM', status: 'available', domain: 'microsoft.com', blurb: 'Microsoft CRM records and activities.' },
  { id: 'advisorengine', name: 'AdvisorEngine', category: 'CRM', status: 'available', domain: 'advisorengine.com', blurb: 'Wealth CRM contacts and workflows.' },
  { id: 'practifi', name: 'Practifi', category: 'CRM', status: 'available', domain: 'practifi.com', blurb: 'Business management platform on Salesforce.' },
  { id: 'xlr8', name: 'XLR8', category: 'CRM', status: 'available', domain: 'xlr8.io', blurb: 'Financial services CRM on Salesforce.' },
  { id: 'advyzon', name: 'Advyzon', category: 'CRM', status: 'available', domain: 'advyzon.com', blurb: 'All-in-one CRM and reporting.' },
  { id: 'zoho', name: 'Zoho CRM', category: 'CRM', status: 'available', domain: 'zoho.com', blurb: 'Contacts and pipeline.' },

  // Meetings & Video
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Meetings & Video',
    status: 'connected',
    domain: 'zoom.us',
    blurb: 'Join as a notetaker, capture the recording, and transcribe every call.',
    syncs: 'Recording + transcript → meeting record · AI Companion summary → notes',
  },
  { id: 'teams', name: 'Microsoft Teams', category: 'Meetings & Video', status: 'available', domain: 'microsoft.com', blurb: 'Notetaker join + transcription.' },
  { id: 'meet', name: 'Google Meet', category: 'Meetings & Video', status: 'available', domain: 'meet.google.com', blurb: 'Notetaker join + transcription.' },
  { id: 'webex', name: 'Webex', category: 'Meetings & Video', status: 'available', domain: 'webex.com', blurb: 'Notetaker join + transcription.' },
  { id: 'gotomeeting', name: 'GoTo Meeting', category: 'Meetings & Video', status: 'available', domain: 'goto.com', blurb: 'Meeting capture.' },
  { id: 'ringcentral', name: 'RingCentral', category: 'Meetings & Video', status: 'available', domain: 'ringcentral.com', blurb: 'Calls and meeting capture.' },
  { id: 'dialpad', name: 'Dialpad', category: 'Meetings & Video', status: 'available', domain: 'dialpad.com', blurb: 'Call capture and transcription.' },

  // Financial Planning
  { id: 'emoney', name: 'eMoney', category: 'Financial Planning', status: 'available', domain: 'emoneyadvisor.com', blurb: 'Planning inputs and client balance sheet.' },
  { id: 'rightcapital', name: 'RightCapital', category: 'Financial Planning', status: 'available', domain: 'rightcapital.com', blurb: 'Plan data and goal tracking.' },
  { id: 'assetmap', name: 'Asset-Map', category: 'Financial Planning', status: 'available', domain: 'asset-map.com', blurb: 'Household financial map.' },

  // Portfolio Management
  { id: 'orion', name: 'Orion', category: 'Portfolio Management', status: 'available', domain: 'orion.com', blurb: 'Portfolio accounting and performance.' },
  { id: 'blackdiamond', name: 'Black Diamond', category: 'Portfolio Management', status: 'available', domain: 'advent.com', blurb: 'Performance reporting and billing.' },

  // Custodians
  {
    id: 'schwab',
    name: 'Schwab',
    category: 'Custodians',
    status: 'connected',
    domain: 'schwab.com',
    blurb: 'Account status, ACAT progress, and NIGO reasons.',
    syncs: 'Account open + funding status → lifecycle stages',
  },
  { id: 'altruist', name: 'Altruist', category: 'Custodians', status: 'available', domain: 'altruist.com', blurb: 'Account open and custody events.' },
  { id: 'fidelity', name: 'Fidelity', category: 'Custodians', status: 'available', domain: 'fidelity.com', blurb: 'Held-away and ACAT source.' },

  // Calendar & Email
  {
    id: 'gcal',
    name: 'Google Calendar',
    category: 'Calendar & Email',
    status: 'connected',
    domain: 'calendar.google.com',
    blurb: 'Auto-schedule meetings, send reminders, and arm the notetaker.',
    syncs: 'Client meetings → auto-brief + notetaker join',
  },
  { id: 'mscal', name: 'Microsoft / Exchange Calendar', category: 'Calendar & Email', status: 'available', domain: 'outlook.com', blurb: 'Calendar sync and scheduling.' },
  { id: 'gmail', name: 'Gmail', category: 'Calendar & Email', status: 'available', domain: 'gmail.com', blurb: 'Send follow-ups and log threads.' },

  // Documents
  { id: 'box', name: 'Box', category: 'Documents', status: 'available', domain: 'box.com', blurb: 'File the compliance vault and share packets.' },
  { id: 'gdrive', name: 'Google Drive', category: 'Documents', status: 'available', domain: 'drive.google.com', blurb: 'Store and share documents.' },
  { id: 'wealthdotcom', name: 'Wealth.com', category: 'Documents', status: 'available', domain: 'wealth.com', blurb: 'Estate documents and beneficiary map.' },

  // Tax
  { id: 'holistiplan', name: 'Holistiplan', category: 'Tax', status: 'available', domain: 'holistiplan.com', blurb: 'Tax return read and planning scans.' },
  { id: 'taxstatus', name: 'TaxStatus', category: 'Tax', status: 'available', domain: 'taxstatus.com', blurb: 'IRS transcript and tax data.' },

  // Communication
  {
    id: 'slack',
    name: 'Slack',
    category: 'Communication',
    status: 'connected',
    domain: 'slack.com',
    blurb: 'Post meeting recaps and action items to the household channel.',
    syncs: 'Meeting summary → #household channel',
  },
  { id: 'linkedin', name: 'LinkedIn', category: 'Communication', status: 'available', domain: 'linkedin.com', blurb: 'Enrich prospect context.' },
  { id: 'vonage', name: 'Vonage', category: 'Communication', status: 'available', domain: 'vonage.com', blurb: 'VoIP call capture.' },

  // Workflow & Automation
  { id: 'zapier', name: 'Zapier', category: 'Workflow & Automation', status: 'available', domain: 'zapier.com', blurb: 'Trigger downstream automations.' },
  { id: 'karbon', name: 'Karbon', category: 'Workflow & Automation', status: 'available', domain: 'karbonhq.com', blurb: 'Practice work management.' },
  { id: 'hubly', name: 'Hubly', category: 'Workflow & Automation', status: 'available', domain: 'myhubly.com', blurb: 'Workflow automation for advisors.' },
]

export function integrationsByCategory(list: Integration[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: list.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)
}
