// Integration Hub catalog — the advisor integration directory. Merges the
// Jump-parity baseline with the firm's full third-party target list, grouped by
// category with an explicit connection type (Read vs Read/Write). A handful are
// pre-wired to match the demo org (Salesforce FSC, Outlook, Zoom, Schwab, Slack)
// so the meeting AI and lifecycle stages have somewhere to sync.

export type IntegrationCategory =
  | 'CRM'
  | 'Email & Calendar'
  | 'Meeting Client'
  | 'Messaging'
  | 'Notes'
  | 'Document Management'
  | 'Financial Planning'
  | 'Portfolio Management'
  | 'Custodians'
  | 'Data Aggregation'
  | 'Market Data'
  | 'Risk'
  | 'Billing'
  | 'Prospecting'
  | 'Life Events'
  | 'Real Estate'
  | 'Research'
  | 'Philanthropy'
  | 'Core Banking'
  | 'Asset Management Data'
  | 'Marketing Collateral'
  | 'Market Share Data'
  | 'RFP'
  | 'Tax'
  | 'Workflow & Automation'

export type IntegrationStatus = 'connected' | 'available'
export type ConnectionType = 'Read' | 'Read/Write'

export interface Integration {
  id: string
  name: string
  category: IntegrationCategory
  status: IntegrationStatus
  /** Read vs Read/Write access the connector uses */
  connection: ConnectionType
  /** Brand domain — used to render the fintech's real logo/favicon */
  domain: string
  blurb: string
  /** What the two-way sync moves, shown when connected */
  syncs?: string
}

export const CATEGORY_ORDER: IntegrationCategory[] = [
  'CRM',
  'Email & Calendar',
  'Meeting Client',
  'Messaging',
  'Notes',
  'Document Management',
  'Financial Planning',
  'Portfolio Management',
  'Custodians',
  'Data Aggregation',
  'Market Data',
  'Risk',
  'Billing',
  'Prospecting',
  'Life Events',
  'Real Estate',
  'Research',
  'Philanthropy',
  'Core Banking',
  'Asset Management Data',
  'Marketing Collateral',
  'Market Share Data',
  'RFP',
  'Tax',
  'Workflow & Automation',
]

/** Real brand logo from the domain (falls back to a monogram if it 404s). */
export function logoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

const RW: ConnectionType = 'Read/Write'
const R: ConnectionType = 'Read'

export const integrations: Integration[] = [
  // ── CRM ──────────────────────────────────────────────────────
  {
    id: 'salesforce',
    name: 'Salesforce Financial Services Cloud',
    category: 'CRM',
    status: 'connected',
    connection: RW,
    domain: 'salesforce.com',
    blurb: 'Bidirectional sync with FSC Person Accounts, custom objects, and fields.',
    syncs: 'Meeting notes → Interaction Summary · Action items → Tasks · Fact Find → Person Account',
  },
  { id: 'wealthbox', name: 'Wealthbox', category: 'CRM', status: 'available', connection: RW, domain: 'wealthbox.com', blurb: 'Contacts, workflows, and notes sync for RIAs.' },
  { id: 'redtail', name: 'Redtail', category: 'CRM', status: 'available', connection: RW, domain: 'redtailtechnology.com', blurb: 'Notes, activities, and contact records.' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', status: 'available', connection: RW, domain: 'hubspot.com', blurb: 'Deals, contacts, and follow-up sequences.' },
  { id: 'dynamics', name: 'Dynamics 365 Sales', category: 'CRM', status: 'available', connection: RW, domain: 'microsoft.com', blurb: 'Microsoft CRM records and activities.' },
  { id: 'advisorengine', name: 'AdvisorEngine', category: 'CRM', status: 'available', connection: RW, domain: 'advisorengine.com', blurb: 'Wealth CRM contacts and workflows.' },
  { id: 'practifi', name: 'Practifi', category: 'CRM', status: 'available', connection: RW, domain: 'practifi.com', blurb: 'Business management platform on Salesforce.' },
  { id: 'xlr8', name: 'XLR8', category: 'CRM', status: 'available', connection: RW, domain: 'xlr8.io', blurb: 'Financial services CRM on Salesforce.' },
  { id: 'advyzon', name: 'Advyzon', category: 'CRM', status: 'available', connection: RW, domain: 'advyzon.com', blurb: 'All-in-one CRM and reporting.' },
  { id: 'zoho', name: 'Zoho CRM', category: 'CRM', status: 'available', connection: RW, domain: 'zoho.com', blurb: 'Contacts and pipeline.' },

  // ── Email & Calendar ─────────────────────────────────────────
  {
    id: 'outlook',
    name: 'Outlook / Exchange',
    category: 'Email & Calendar',
    status: 'connected',
    connection: RW,
    domain: 'outlook.com',
    blurb: 'Auto-schedule meetings, send reminders, and log email threads.',
    syncs: 'Calendar → auto-brief + notetaker join · Follow-ups → client timeline',
  },
  { id: 'gmail', name: 'Gmail', category: 'Email & Calendar', status: 'available', connection: RW, domain: 'gmail.com', blurb: 'Send follow-ups and log threads.' },
  { id: 'gcal', name: 'Google Calendar', category: 'Email & Calendar', status: 'available', connection: RW, domain: 'calendar.google.com', blurb: 'Meeting scheduling and reminders.' },

  // ── Meeting Client ───────────────────────────────────────────
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Meeting Client',
    status: 'connected',
    connection: R,
    domain: 'zoom.us',
    blurb: 'Join as a notetaker, capture the recording, and transcribe every call.',
    syncs: 'Recording + transcript → meeting record · AI Companion summary → notes',
  },
  { id: 'webex', name: 'Webex', category: 'Meeting Client', status: 'available', connection: R, domain: 'webex.com', blurb: 'Notetaker join + transcription.' },
  { id: 'teams-meeting', name: 'Microsoft Teams', category: 'Meeting Client', status: 'available', connection: R, domain: 'microsoft.com', blurb: 'Notetaker join + transcription for Teams calls.' },
  { id: 'meet', name: 'Google Meet', category: 'Meeting Client', status: 'available', connection: R, domain: 'meet.google.com', blurb: 'Notetaker join + transcription.' },
  { id: 'gotomeeting', name: 'GoTo Meeting', category: 'Meeting Client', status: 'available', connection: R, domain: 'goto.com', blurb: 'Meeting capture.' },
  { id: 'ringcentral', name: 'RingCentral', category: 'Meeting Client', status: 'available', connection: R, domain: 'ringcentral.com', blurb: 'Calls and meeting capture.' },
  { id: 'dialpad', name: 'Dialpad', category: 'Meeting Client', status: 'available', connection: R, domain: 'dialpad.com', blurb: 'Call capture and transcription.' },

  // ── Messaging ────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    category: 'Messaging',
    status: 'connected',
    connection: RW,
    domain: 'slack.com',
    blurb: 'Post meeting recaps and action items to the household channel.',
    syncs: 'Meeting summary → #household channel',
  },
  { id: 'teams-messaging', name: 'Microsoft Teams', category: 'Messaging', status: 'available', connection: RW, domain: 'microsoft.com', blurb: 'Chat, channels, and message capture.' },
  { id: 'whatsapp', name: 'WhatsApp', category: 'Messaging', status: 'available', connection: RW, domain: 'whatsapp.com', blurb: 'Client messaging with compliant capture.' },
  { id: 'vonage', name: 'Vonage', category: 'Messaging', status: 'available', connection: RW, domain: 'vonage.com', blurb: 'VoIP and SMS capture.' },

  // ── Notes ────────────────────────────────────────────────────
  { id: 'onenote', name: 'OneNote', category: 'Notes', status: 'available', connection: RW, domain: 'onenote.com', blurb: 'Two-way note capture and sync.' },

  // ── Document Management ──────────────────────────────────────
  { id: 'sharepoint', name: 'SharePoint', category: 'Document Management', status: 'available', connection: R, domain: 'microsoft.com', blurb: 'Read the compliance vault and shared libraries.' },
  { id: 'box', name: 'Box', category: 'Document Management', status: 'available', connection: R, domain: 'box.com', blurb: 'File the compliance vault and share packets.' },
  { id: 'gdrive', name: 'Google Drive', category: 'Document Management', status: 'available', connection: R, domain: 'drive.google.com', blurb: 'Store and share documents.' },

  // ── Financial Planning ───────────────────────────────────────
  { id: 'emoney', name: 'eMoney', category: 'Financial Planning', status: 'available', connection: RW, domain: 'emoneyadvisor.com', blurb: 'Planning inputs and client balance sheet.' },
  { id: 'moneyguide', name: 'MoneyGuide', category: 'Financial Planning', status: 'available', connection: RW, domain: 'moneyguidepro.com', blurb: 'Goal-based planning data.' },
  { id: 'wealthdotcom', name: 'Wealth.com', category: 'Financial Planning', status: 'available', connection: RW, domain: 'wealth.com', blurb: 'Estate documents and beneficiary map.' },
  { id: 'dynamicplanner', name: 'Dynamic Planner', category: 'Financial Planning', status: 'available', connection: RW, domain: 'dynamicplanner.com', blurb: 'Risk-based planning and reviews.' },
  { id: 'conquest', name: 'Conquest Planning', category: 'Financial Planning', status: 'available', connection: RW, domain: 'conquestplanning.com', blurb: 'AI-driven financial planning.' },
  { id: 'rightcapital', name: 'RightCapital', category: 'Financial Planning', status: 'available', connection: RW, domain: 'rightcapital.com', blurb: 'Plan data and goal tracking.' },
  { id: 'naviplan', name: 'NaviPlan', category: 'Financial Planning', status: 'available', connection: RW, domain: 'naviplan.com', blurb: 'Cash-flow and goal planning.' },
  { id: 'holistiplan', name: 'Holistiplan', category: 'Financial Planning', status: 'available', connection: RW, domain: 'holistiplan.com', blurb: 'Tax return read and planning scans.' },
  { id: 'voyant', name: 'Voyant', category: 'Financial Planning', status: 'available', connection: RW, domain: 'planwithvoyant.com', blurb: 'Cash-flow modeling.' },
  { id: 'ortec', name: 'Ortec Finance', category: 'Financial Planning', status: 'available', connection: RW, domain: 'ortec-finance.com', blurb: 'Goal-based scenario planning.' },

  // ── Portfolio Management ─────────────────────────────────────
  { id: 'orion', name: 'Orion', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'orion.com', blurb: 'Portfolio accounting and performance.' },
  { id: 'addepar', name: 'Addepar', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'addepar.com', blurb: 'Portfolio reporting and analytics.' },
  { id: 'tamarac', name: 'Tamarac', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'tamaracinc.com', blurb: 'Rebalancing and reporting.' },
  { id: 'blackdiamond', name: 'Black Diamond', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'advent.com', blurb: 'Performance reporting and billing.' },
  { id: 'vestmark', name: 'VestMark', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'vestmark.com', blurb: 'Managed accounts and trading.' },

  // ── Custodians ───────────────────────────────────────────────
  {
    id: 'schwab',
    name: 'Schwab',
    category: 'Custodians',
    status: 'connected',
    connection: RW,
    domain: 'schwab.com',
    blurb: 'Account status, ACAT progress, and NIGO reasons.',
    syncs: 'Account open + funding status → lifecycle stages',
  },
  { id: 'fidelity', name: 'Fidelity', category: 'Custodians', status: 'available', connection: RW, domain: 'fidelity.com', blurb: 'Held-away and ACAT source.' },
  { id: 'pershing', name: 'Pershing', category: 'Custodians', status: 'available', connection: RW, domain: 'pershing.com', blurb: 'Clearing and custody.' },
  { id: 'goldman', name: 'Goldman Sachs', category: 'Custodians', status: 'available', connection: RW, domain: 'goldmansachs.com', blurb: 'Custody and advisory solutions.' },
  { id: 'altruist', name: 'Altruist', category: 'Custodians', status: 'available', connection: RW, domain: 'altruist.com', blurb: 'Account open and custody events.' },
  { id: 'statestreet', name: 'State Street', category: 'Custodians', status: 'available', connection: RW, domain: 'statestreet.com', blurb: 'Custody and fund services.' },
  { id: 'apex', name: 'Apex', category: 'Custodians', status: 'available', connection: RW, domain: 'apexfintechsolutions.com', blurb: 'Custody and clearing APIs.' },
  { id: 'ssc-bluedoor', name: 'SS&C Blue Door', category: 'Custodians', status: 'available', connection: RW, domain: 'ssctech.com', blurb: 'Custody and wealth platform.' },
  { id: 'fnz', name: 'FNZ', category: 'Custodians', status: 'available', connection: RW, domain: 'fnz.com', blurb: 'Wealth platform and custody.' },

  // ── Data Aggregation ─────────────────────────────────────────
  { id: 'bridgeft', name: 'BridgeFT', category: 'Data Aggregation', status: 'available', connection: R, domain: 'bridgeft.com', blurb: 'Multi-custodial data aggregation.' },
  { id: 'onevest', name: 'OneVest', category: 'Data Aggregation', status: 'available', connection: RW, domain: 'onevest.com', blurb: 'Partner for custodian connections.' },

  // ── Market Data ──────────────────────────────────────────────
  { id: 'morningstar', name: 'Morningstar', category: 'Market Data', status: 'available', connection: R, domain: 'morningstar.com', blurb: 'Fund research and market data.' },
  { id: 'moodys', name: "Moody's", category: 'Market Data', status: 'available', connection: R, domain: 'moodys.com', blurb: 'Credit ratings and risk data.' },
  { id: 'lseg', name: 'LSEG', category: 'Market Data', status: 'available', connection: R, domain: 'lseg.com', blurb: 'Refinitiv market data.' },
  { id: 'factset-md', name: 'FactSet', category: 'Market Data', status: 'available', connection: R, domain: 'factset.com', blurb: 'Market data and analytics.' },
  { id: 'bloomberg', name: 'Bloomberg News', category: 'Market Data', status: 'available', connection: R, domain: 'bloomberg.com', blurb: 'Market news and data feeds.' },
  { id: 'wsj', name: 'WSJ', category: 'Market Data', status: 'available', connection: R, domain: 'wsj.com', blurb: 'Market news.' },
  { id: 'ixi', name: 'IXI', category: 'Market Data', status: 'available', connection: R, domain: 'equifax.com', blurb: 'Household wealth measures.' },

  // ── Risk ─────────────────────────────────────────────────────
  { id: 'nitrogen', name: 'Nitrogen / Riskalyze', category: 'Risk', status: 'available', connection: RW, domain: 'nitrogenwealth.com', blurb: 'Risk tolerance scoring and proposals.' },
  { id: 'blackrock', name: 'BlackRock', category: 'Risk', status: 'available', connection: RW, domain: 'blackrock.com', blurb: 'Aladdin risk analytics.' },

  // ── Billing ──────────────────────────────────────────────────
  { id: 'redi2', name: 'Redi2', category: 'Billing', status: 'available', connection: RW, domain: 'redi2.com', blurb: 'Fee billing and revenue management.' },

  // ── Prospecting ──────────────────────────────────────────────
  { id: 'wealthengine', name: 'WealthEngine', category: 'Prospecting', status: 'available', connection: R, domain: 'wealthengine.com', blurb: 'Net worth estimates and wealth scoring.' },
  { id: 'linkedin', name: 'LinkedIn', category: 'Prospecting', status: 'available', connection: R, domain: 'linkedin.com', blurb: 'Enrich prospect context.' },
  { id: 'pitchbook-prospect', name: 'PitchBook', category: 'Prospecting', status: 'available', connection: R, domain: 'pitchbook.com', blurb: 'M&A and liquidity signals.' },
  { id: 'boardex', name: 'BoardEx', category: 'Prospecting', status: 'available', connection: R, domain: 'boardex.com', blurb: 'Board affiliations and relationships.' },
  { id: 'mergermarket', name: 'Mergermarket', category: 'Prospecting', status: 'available', connection: R, domain: 'mergermarket.com', blurb: 'Deal intelligence.' },
  { id: 'discovery-data', name: 'Discovery Data', category: 'Prospecting', status: 'available', connection: R, domain: 'discoverydata.com', blurb: 'Advisor and firm intelligence.' },
  { id: 'zoominfo', name: 'ZoomInfo', category: 'Prospecting', status: 'available', connection: R, domain: 'zoominfo.com', blurb: 'B2B contact and company data.' },
  { id: 'rocketreach', name: 'RocketReach', category: 'Prospecting', status: 'available', connection: R, domain: 'rocketreach.co', blurb: 'Contact discovery.' },
  { id: 'hunter', name: 'Hunter.io', category: 'Prospecting', status: 'available', connection: R, domain: 'hunter.io', blurb: 'Email lookup and verification.' },

  // ── Life Events ──────────────────────────────────────────────
  { id: 'social-signals', name: 'Social Media Signals', category: 'Life Events', status: 'available', connection: R, domain: 'facebook.com', blurb: 'Life-event signals from social sites.' },
  { id: 'obituaries', name: 'Obituaries', category: 'Life Events', status: 'available', connection: RW, domain: 'legacy.com', blurb: 'Estate and bereavement triggers.' },
  { id: 'sos-filings', name: 'Secretary of State Filings', category: 'Life Events', status: 'available', connection: R, domain: 'opencorporates.com', blurb: 'Business changes and entity filings.' },

  // ── Real Estate ──────────────────────────────────────────────
  { id: 'zillow', name: 'Zillow', category: 'Real Estate', status: 'available', connection: R, domain: 'zillow.com', blurb: 'Property values and real-estate signals.' },

  // ── Research ─────────────────────────────────────────────────
  { id: 'google-search', name: 'Google', category: 'Research', status: 'available', connection: R, domain: 'google.com', blurb: 'Open-web research.' },

  // ── Philanthropy ─────────────────────────────────────────────
  { id: 'guidestar', name: 'GuideStar', category: 'Philanthropy', status: 'available', connection: RW, domain: 'guidestar.org', blurb: 'Nonprofit and charitable-giving data.' },

  // ── Core Banking ─────────────────────────────────────────────
  { id: 'fis', name: 'FIS', category: 'Core Banking', status: 'available', connection: RW, domain: 'fisglobal.com', blurb: 'Core banking platform.' },
  { id: 'fiserv', name: 'Fiserv', category: 'Core Banking', status: 'available', connection: RW, domain: 'fiserv.com', blurb: 'Core banking and payments.' },
  { id: 'thoughtmachine', name: 'Thought Machine', category: 'Core Banking', status: 'available', connection: RW, domain: 'thoughtmachine.net', blurb: 'Cloud-native core banking.' },
  { id: 'temenos', name: 'Temenos', category: 'Core Banking', status: 'available', connection: RW, domain: 'temenos.com', blurb: 'Core banking platform.' },

  // ── Asset Management Data ────────────────────────────────────
  { id: 'broadridge', name: 'Broadridge', category: 'Asset Management Data', status: 'available', connection: R, domain: 'broadridge.com', blurb: 'Asset-management data pack.' },
  { id: 'dst', name: 'DST', category: 'Asset Management Data', status: 'available', connection: R, domain: 'dstsystems.com', blurb: 'Fund and shareholder data.' },
  { id: 'morganstanley-amd', name: 'Morgan Stanley', category: 'Asset Management Data', status: 'available', connection: R, domain: 'morganstanley.com', blurb: 'Asset-management data pack.' },

  // ── Marketing Collateral ─────────────────────────────────────
  { id: 'mstar-collateral', name: 'M* (Morningstar)', category: 'Marketing Collateral', status: 'available', connection: R, domain: 'morningstar.com', blurb: 'Marketing collateral and fund cards.' },
  { id: 'seismic', name: 'Seismic', category: 'Marketing Collateral', status: 'available', connection: R, domain: 'seismic.com', blurb: 'Sales enablement collateral.' },

  // ── Market Share Data ────────────────────────────────────────
  { id: 'mars', name: 'Mars', category: 'Market Share Data', status: 'available', connection: R, domain: 'mars.invalid', blurb: 'Market-share intelligence.' },
  { id: 'brightscope', name: 'BrightScope', category: 'Market Share Data', status: 'available', connection: R, domain: 'brightscope.com', blurb: 'Retirement plan ratings and market share.' },
  { id: 'merrill-share', name: 'Merrill', category: 'Market Share Data', status: 'available', connection: R, domain: 'ml.com', blurb: 'Market-share data.' },
  { id: 'pitchbook-share', name: 'PitchBook', category: 'Market Share Data', status: 'available', connection: R, domain: 'pitchbook.com', blurb: 'Private-market share data.' },
  { id: 'factset-share', name: 'FactSet', category: 'Market Share Data', status: 'available', connection: R, domain: 'factset.com', blurb: 'Market-share analytics.' },
  { id: 'preqin', name: 'Preqin', category: 'Market Share Data', status: 'available', connection: R, domain: 'preqin.com', blurb: 'Alternative-assets market data.' },
  { id: 'spglobal', name: 'S&P Global', category: 'Market Share Data', status: 'available', connection: R, domain: 'spglobal.com', blurb: 'Market intelligence.' },
  { id: 'issmi', name: 'ISS Market Intelligence', category: 'Market Share Data', status: 'available', connection: R, domain: 'issmarketintelligence.com', blurb: 'Distribution and market-share data.' },

  // ── RFP ──────────────────────────────────────────────────────
  { id: 'responsive', name: 'Responsive', category: 'RFP', status: 'available', connection: RW, domain: 'responsive.io', blurb: 'RFP response automation.' },
  { id: 'loopio', name: 'Loopio', category: 'RFP', status: 'available', connection: RW, domain: 'loopio.com', blurb: 'RFP and proposal management.' },

  // ── Tax ──────────────────────────────────────────────────────
  { id: 'taxstatus', name: 'TaxStatus', category: 'Tax', status: 'available', connection: R, domain: 'taxstatus.com', blurb: 'IRS transcript and tax data.' },

  // ── Workflow & Automation ────────────────────────────────────
  { id: 'zapier', name: 'Zapier', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'zapier.com', blurb: 'Trigger downstream automations.' },
  { id: 'karbon', name: 'Karbon', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'karbonhq.com', blurb: 'Practice work management.' },
  { id: 'hubly', name: 'Hubly', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'myhubly.com', blurb: 'Workflow automation for advisors.' },
]

export function integrationsByCategory(list: Integration[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: list.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)
}
