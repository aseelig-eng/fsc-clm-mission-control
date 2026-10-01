// Integration Hub catalog — the advisor integration directory. Merges the
// Jump-parity baseline with the firm's full third-party target list, grouped by
// category with an explicit connection type (Read vs Read/Write). A handful are
// pre-wired to match the demo org (Salesforce FSC, Outlook, Zoom, Schwab, Slack)
// so the meeting AI and lifecycle stages have somewhere to sync.

export type IntegrationCategory =
  | 'AI Tools & Services'
  | 'CRM'
  | 'Wealth Practice Management'
  | 'Email & Calendar'
  | 'Meeting Client'
  | 'Messaging'
  | 'Notes'
  | 'Client Portals'
  | 'Document Management'
  | 'Report Generation'
  | 'Financial Planning'
  | 'Portfolio Management'
  | 'Wealth Management Systems'
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
  | 'Estate Planning'
  | 'Core Banking'
  | 'Asset Management Data'
  | 'Marketing Collateral'
  | 'Marketing & Client Engagement'
  | 'Market Share Data'
  | 'RFP'
  | 'Tax'
  | 'Workflow & Automation'
  | 'RegTech & Compliance'
  | 'Mortgage & Equity Release'
  | 'Protection & Retirement Solutions'

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
  'AI Tools & Services',
  'Asset Management Data',
  'Billing',
  'Client Portals',
  'Core Banking',
  'CRM',
  'Custodians',
  'Data Aggregation',
  'Document Management',
  'Email & Calendar',
  'Estate Planning',
  'Financial Planning',
  'Life Events',
  'Market Data',
  'Market Share Data',
  'Marketing & Client Engagement',
  'Marketing Collateral',
  'Meeting Client',
  'Messaging',
  'Mortgage & Equity Release',
  'Notes',
  'Philanthropy',
  'Portfolio Management',
  'Prospecting',
  'Protection & Retirement Solutions',
  'Real Estate',
  'RegTech & Compliance',
  'Report Generation',
  'Research',
  'RFP',
  'Risk',
  'Tax',
  'Wealth Management Systems',
  'Wealth Practice Management',
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
  { id: 'catalyst', name: 'Catalyst', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'catalyst-op.com', blurb: 'Operations workflow for advice firms.' },
  { id: 'go-automation', name: 'Go Automation', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'goautomation.co.uk', blurb: 'Process automation for advice firm back offices.' },
  { id: 'hub-financial-solutions', name: 'HUB Financial Solutions', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'hubfinancialsolutions.co.uk', blurb: 'Protection and retirement sourcing operations platform.' },
  { id: 'ifadash', name: 'ifaDASH', category: 'Workflow & Automation', status: 'available', connection: R, domain: 'ifadash.co.uk', blurb: 'Operational dashboard and MI reporting for IFAs.' },
  { id: 'octopus-money', name: 'Octopus Money', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'octopusmoney.com', blurb: 'Workplace financial wellbeing and advice workflow.' },
  { id: 'open-advice', name: 'Open Advice', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'openadvice.co.uk', blurb: 'Advice process and workflow platform.' },
  { id: 'pensionlab', name: 'pensionlab', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'pensionlab.co.uk', blurb: 'Pension transfer and process automation.' },
  { id: 'rabbit-software', name: 'Rabbit Software', category: 'Workflow & Automation', status: 'available', connection: RW, domain: 'rabbit-software.com', blurb: 'Compliance and workflow automation for advice firms.' },

  // ── AI Tools & Services (UK adviser-tech, Sept 2026 report) ──
  { id: '4admin', name: '4admin', category: 'AI Tools & Services', status: 'available', connection: RW, domain: '4admin.co.uk', blurb: 'Workflow and admin automation for advice firms.' },
  { id: 'advisoryai', name: 'advisoryai', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'advisory.ai', blurb: 'AI drafting for suitability reports.' },
  { id: 'advizorpro', name: 'ADVIZORPRO', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'advizorpro.com', blurb: 'Advisor and wealth-industry contact intelligence.' },
  { id: 'afternoon', name: 'afternoon', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'afternoon.ai', blurb: 'AI meeting notes and report drafting for advisers.' },
  { id: 'ammonite', name: 'ammonite (Planbot)', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'ammonite.ai', blurb: 'AI planning assistant that drafts advice journeys.' },
  { id: 'automwrite', name: 'Automwrite', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'automwrite.com', blurb: 'AI report-writing automation for advisers.' },
  { id: 'aveni', name: 'aveni', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'aveni.ai', blurb: 'AI compliance monitoring and call analytics.' },
  { id: 'avenir', name: 'Avenir', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'avenir.ai', blurb: 'AI-driven planning insights for advisers.' },
  { id: 'bat', name: 'BAT', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'bat-apps.co.uk', blurb: 'Back-office automation toolkit for advice firms.' },
  { id: 'couplr', name: 'couplr.ai', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'couplr.ai', blurb: 'AI matching and client engagement tool.' },
  { id: 'digipro', name: 'digipro.ai', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'digipro.ai', blurb: 'AI digital advice tooling.' },
  { id: 'engage-smarter', name: 'Engage Smarter', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'engagesmarter.ai', blurb: 'AI-driven client engagement content.' },
  { id: 'finny', name: 'FINNY', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'finny.ai', blurb: 'AI chat-based financial guidance.' },
  { id: 'fintello', name: 'fintello', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'fintello.co.uk', blurb: 'AI engagement and lead-nurture platform.' },
  { id: 'halio', name: 'halio.ai', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'halio.ai', blurb: 'AI engagement and marketing analytics.' },
  { id: 'intellectai', name: 'intellectAI', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'intellectai.com', blurb: 'AI-driven wealth and risk analytics.' },
  { id: 'intelliflo-iq', name: 'intelliflo IQ', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'intelliflo.com', blurb: 'AI add-on surfacing insights across the intelliflo suite.' },
  { id: 'knomee', name: 'knomee', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'knomee.com', blurb: 'AI knowledge and client-insight tool.' },
  { id: 'marloo', name: 'Marloo', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'marloo.ai', blurb: 'AI meeting and compliance capture for advisers.' },
  { id: 'model-office', name: 'Model Office', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'model-office.co.uk', blurb: 'RegTech compliance monitoring and MI reporting.' },
  { id: 'multiply', name: 'Multiply', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'multiply.ai', blurb: 'AI financial wellbeing and advice platform.' },
  { id: 'ningi', name: 'ningi', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'ningi.com', blurb: 'AI practice management copilot.' },
  { id: 'noxai', name: 'noxai', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'noxai.co', blurb: 'AI portfolio and research assistant.' },
  { id: 'otto', name: 'Otto', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'otto.ai', blurb: 'AI assistant for advice firms.' },
  { id: 'paradino', name: 'Paradino', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'paradino.ai', blurb: 'AI advice generation platform.' },
  { id: 'plannerpal', name: 'PlannerPal', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'plannerpal.ai', blurb: 'AI meeting notes and suitability report drafting.' },
  { id: 'posterity', name: 'Posterity', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'posterity.ai', blurb: 'AI legacy and estate planning assistant.' },
  { id: 'reloa', name: 're:loa', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'reloa.co.uk', blurb: 'AI relationship and loyalty insights.' },
  { id: 'saturn', name: 'saturn', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'saturn.tech', blurb: 'AI-driven adviser productivity tool.' },
  { id: 'templi', name: 'templi.ai', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'templi.ai', blurb: 'AI report and document templating.' },
  { id: 'unitifi', name: 'Unitifi', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'unitifi.com', blurb: 'Behavioral finance and client-matching AI.' },
  { id: 'wealth-mgmt-gpt', name: 'Wealth Management GPT', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'wealthmanagementgpt.com', blurb: 'Custom GPT assistant for wealth management.' },
  { id: 'wealth-ai', name: 'WealthAi', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'wealth-ai.co.uk', blurb: 'AI advice-generation assistant for wealth firms.' },
  { id: 'yainvest', name: 'Yainvest', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'yainvest.com', blurb: 'AI investment research assistant.' },
  { id: 'yourstake', name: 'YourStake', category: 'AI Tools & Services', status: 'available', connection: R, domain: 'yourstake.org', blurb: 'AI-powered values-based portfolio alignment.' },
  { id: 'zeplyn', name: 'Zeplyn', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'zeplyn.ai', blurb: 'AI meeting copilot for advisers.' },
  { id: 'zocks', name: 'zocks', category: 'AI Tools & Services', status: 'available', connection: RW, domain: 'zocks.com', blurb: 'AI meeting intelligence for advisers.' },

  // ── Wealth Practice Management (UK adviser-tech, Sept 2026 report) ──
  { id: 'adviceobjects', name: 'AdviceObjects', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'adviceobjects.co.uk', blurb: 'End-to-end wealth practice management platform.' },
  { id: 'advisercloud', name: 'Adviser Cloud', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'advisercloud.co.uk', blurb: 'Cloud practice and client management for advisers.' },
  { id: 'aixigo', name: 'aixigo', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'aixigo.com', blurb: 'Wealth management core engine and advisory platform.' },
  { id: 'benchmark', name: 'Benchmark', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'benchmarkcapital.co.uk', blurb: 'Wealth management and advice network platform.' },
  { id: 'centology', name: 'Centology', category: 'Wealth Practice Management', status: 'available', connection: R, domain: 'centology.com', blurb: 'Compliance-first practice management content library.' },
  { id: 'dataview-wealth', name: 'Dataview Wealth', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'dataviewwealth.com', blurb: 'Wealth practice data and reporting platform.' },
  { id: 'digi', name: 'DIGI', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'digi.co.uk', blurb: 'Digital wealth practice management toolkit.' },
  { id: 'fluido', name: 'Fluido', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'fluido.app', blurb: 'Salesforce-based wealth practice implementation.' },
  { id: 'focus', name: 'Focus', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'focus-solutions.co.uk', blurb: 'Wealth practice management and client portal platform.' },
  { id: 'futureform', name: 'futureform', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'futureform.co.uk', blurb: 'Digital fact-find and onboarding forms.' },
  { id: 'hourglass', name: 'Hourglass', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'hourglass.co.uk', blurb: 'Retirement-focused practice management tooling.' },
  { id: 'intelliflo', name: 'intelliflo', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'intelliflo.com', blurb: 'Practice management platform for financial advisers.' },
  { id: 'iress', name: 'iress', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'iress.com', blurb: 'Wealth management and practice software suite.' },
  { id: 'pilot', name: 'pilot', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'pilotapp.co.uk', blurb: 'Cashflow and planning tool for advisers.' },
  { id: 'planhappy', name: 'PlanHappy', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'planhappy.co.uk', blurb: 'Practice and client management for financial planners.' },
  { id: 'plannr', name: 'plannr', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'plannr.com', blurb: 'Cloud-based adviser practice management CRM.' },
  { id: 'rq', name: 'RQ', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'rquk.net', blurb: 'Compliance and practice management for advice firms.' },
  { id: 'savvy-wealth', name: 'Savvy Wealth', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'savvywealth.com', blurb: 'AI-native practice platform for RIAs.' },
  { id: 'steppl', name: 'Steppl', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'steppl.co.uk', blurb: 'Digital advice journey and practice tooling.' },
  { id: 'time4advice', name: 'Time4Advice', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'time4advice.co.uk', blurb: 'CURO practice management platform for advisers.' },
  { id: 'twenty7tec', name: 'Twenty7tec', category: 'Wealth Practice Management', status: 'available', connection: RW, domain: 'twenty7tec.com', blurb: 'Mortgage, protection sourcing, and FinPlan practice tools.' },
  { id: 'wealthcraft', name: 'Wealthcraft', category: 'Wealth Practice Management', status: 'available', connection: R, domain: 'wealthcraft.com', blurb: 'Research and analytics platform for wealth managers.' },

  // ── Client Portals (UK adviser-tech, Sept 2026 report) ──
  { id: '360lifecycle', name: '360 lifecycle', category: 'Client Portals', status: 'available', connection: RW, domain: '360lifecycle.co.uk', blurb: 'Mortgage and protection client portal and lifecycle tracking.' },
  { id: 'acre', name: 'acre', category: 'Client Portals', status: 'available', connection: RW, domain: 'myacre.com', blurb: 'Compliance and client journey platform for mortgage advisers.' },
  { id: 'cashcalc', name: 'FE CashCalc', category: 'Client Portals', status: 'available', connection: RW, domain: 'cashcalc.com', blurb: 'Cashflow modeling and client portal.' },
  { id: 'contengo', name: 'Contengo', category: 'Client Portals', status: 'available', connection: RW, domain: 'contengo.co.uk', blurb: 'Secure client portal and document exchange.' },
  { id: 'digital-wealth-solutions', name: 'Digital Wealth Solutions', category: 'Client Portals', status: 'available', connection: RW, domain: 'digitalwealthsolutions.co.uk', blurb: 'White-label digital wealth client portal.' },
  { id: 'fincalc', name: 'FinCalc', category: 'Client Portals', status: 'available', connection: R, domain: 'fincalc.co.uk', blurb: 'Financial calculators and client portal tools.' },
  { id: 'finova', name: 'Finova', category: 'Client Portals', status: 'available', connection: RW, domain: 'finova.tech', blurb: 'Mortgage and savings client portal platform.' },
  { id: 'keychain', name: 'Keychain', category: 'Client Portals', status: 'available', connection: RW, domain: 'keychain.app', blurb: 'Secure client document and e-sign portal.' },
  { id: 'moneyinfo', name: 'moneyinfo', category: 'Client Portals', status: 'available', connection: RW, domain: 'moneyinfo.com', blurb: 'Client portal and app for wealth management firms.' },
  { id: 'mortgage-brain', name: 'Mortgage Brain', category: 'Client Portals', status: 'available', connection: RW, domain: 'mortgagebrain.co.uk', blurb: 'Mortgage sourcing and client portal technology.' },
  { id: 'myprosperity', name: 'myprosperity', category: 'Client Portals', status: 'available', connection: RW, domain: 'myprosperity.com.au', blurb: 'Client wealth portal and net-worth dashboard.' },
  { id: 'nivo', name: 'Nivo', category: 'Client Portals', status: 'available', connection: RW, domain: 'nivo.cloud', blurb: 'Digital onboarding and video identity verification portal.' },
  { id: 'qwil-messenger', name: 'Qwil Messenger', category: 'Client Portals', status: 'available', connection: RW, domain: 'qwilmessenger.com', blurb: 'Secure compliant messaging and client portal.' },
  { id: 'sprint', name: 'Sprint', category: 'Client Portals', status: 'available', connection: RW, domain: 'sprint.co.uk', blurb: 'Portfolio and client portal technology.' },
  { id: 'wps-advisory', name: 'WPS Advisory', category: 'Client Portals', status: 'available', connection: RW, domain: 'wpsadvisory.co.uk', blurb: 'Protection and client engagement portal.' },

  // ── Report Generation (UK adviser-tech, Sept 2026 report) ──
  { id: 'ateb-suitability', name: 'ateb suitability', category: 'Report Generation', status: 'available', connection: RW, domain: 'atebsuitability.co.uk', blurb: 'Suitability report drafting and compliance checking.' },
  { id: 'confidante', name: 'confidante', category: 'Report Generation', status: 'available', connection: RW, domain: 'confidante.co.uk', blurb: 'Estate and later-life report generation.' },
  { id: 'genovo', name: 'Genovo', category: 'Report Generation', status: 'available', connection: RW, domain: 'genovo.ai', blurb: 'AI suitability report generation platform.' },

  // ── Research (UK adviser-tech, Sept 2026 report) ──
  { id: 'ada-fintech', name: 'ada fintech', category: 'Research', status: 'available', connection: R, domain: 'adafintech.co.uk', blurb: 'Fund research and adviser due-diligence platform.' },
  { id: 'ddhub', name: 'DDhub', category: 'Research', status: 'available', connection: R, domain: 'ddhub.co.uk', blurb: 'Due-diligence and research hub for advice firms.' },
  { id: 'defaqto', name: 'defaqto', category: 'Research', status: 'available', connection: R, domain: 'defaqto.com', blurb: 'Product research, ratings, and comparison data.' },
  { id: 'synaptic', name: 'Synaptic', category: 'Research', status: 'available', connection: R, domain: 'synaptic.co.uk', blurb: 'Research, risk profiling, and product comparison tools.' },
  { id: 'fe-fundinfo', name: 'FE fundinfo', category: 'Research', status: 'available', connection: R, domain: 'fefundinfo.com', blurb: 'Fund data, factsheets, and research.' },
  { id: 'lang-cat', name: 'the lang cat', category: 'Research', status: 'available', connection: R, domain: 'langcatfinancial.co.uk', blurb: 'Independent adviser-market research and commentary.' },

  // ── Portfolio Management (UK adviser-tech, Sept 2026 report) ──
  { id: 'clever', name: 'Clever', category: 'Portfolio Management', status: 'available', connection: R, domain: 'clever-adviser.com', blurb: 'Portfolio analytics for advisers.' },
  { id: 'collidr', name: 'collidr', category: 'Portfolio Management', status: 'available', connection: R, domain: 'collidr.com', blurb: 'AI-driven portfolio analytics and insights.' },
  { id: 'financial-simplicity', name: 'financial/simplicity', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'financialsimplicity.com', blurb: 'Portfolio modeling and rebalancing platform.' },
  { id: 'finominal', name: 'Finominal', category: 'Portfolio Management', status: 'available', connection: R, domain: 'finominal.com', blurb: 'Multi-asset portfolio analytics.' },
  { id: 'fintegrate', name: 'Fintegrate', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'fintegrate.co.uk', blurb: 'Portfolio analysis and rebalancing integration layer.' },
  { id: 'greengrowth', name: 'GreenGrowth', category: 'Portfolio Management', status: 'available', connection: R, domain: 'greengrowth.co', blurb: 'ESG portfolio analytics.' },
  { id: 'indexone', name: 'indexone', category: 'Portfolio Management', status: 'available', connection: R, domain: 'indexone.io', blurb: 'Index-based portfolio analytics.' },
  { id: 'portfoliocloud', name: 'PortfolioCloud', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'portfoliocloud.io', blurb: 'Cloud portfolio analysis and rebalancing.' },
  { id: 'selectapension', name: 'SelectAPension', category: 'Portfolio Management', status: 'available', connection: R, domain: 'selectapension.com', blurb: 'Pension and portfolio comparison analytics.' },
  { id: 'fe-analytics', name: 'FE Analytics', category: 'Portfolio Management', status: 'available', connection: R, domain: 'fefundinfo.com', blurb: 'Fund and portfolio analytics.' },
  { id: 'envestnet', name: 'Envestnet', category: 'Portfolio Management', status: 'available', connection: RW, domain: 'envestnet.com', blurb: 'Portfolio and data aggregation platform.' },

  // ── Marketing & Client Engagement (UK adviser-tech, Sept 2026 report) ──
  { id: 'advisorstream', name: 'advisorstream', category: 'Marketing & Client Engagement', status: 'available', connection: R, domain: 'advisorstream.com', blurb: 'Content marketing and newsletters for advisers.' },
  { id: 'dna-behavior', name: 'DNA Behavior', category: 'Marketing & Client Engagement', status: 'available', connection: R, domain: 'dnabehavior.com', blurb: 'Behavioral insights for client engagement.' },
  { id: 'elements', name: 'Elements', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'elements.app', blurb: 'Visual financial planning and engagement tool.' },
  { id: 'eligible', name: 'eligible', category: 'Marketing & Client Engagement', status: 'available', connection: R, domain: 'eligible.io', blurb: 'Client engagement and eligibility matching.' },
  { id: 'feedsy', name: 'Feedsy', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'feedsy.com', blurb: 'Content marketing automation for advisers.' },
  { id: 'inzuzo', name: 'inzuzo', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'inzuzo.com', blurb: 'Client engagement and financial wellbeing app.' },
  { id: 'iwant2know', name: 'Iwant2know', category: 'Marketing & Client Engagement', status: 'available', connection: R, domain: 'iwant2know.co.uk', blurb: 'Client engagement and education content.' },
  { id: 'lumiant-halo', name: 'Lumiant HALO', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'lumiant.io', blurb: 'Life-centred client engagement platform.' },
  { id: 'mortgage-wallet', name: 'Mortgage Wallet', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'mortgagewallet.co.uk', blurb: 'Mortgage client engagement app.' },
  { id: 'wealth-io', name: 'Wealth I/O', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'wealth.io', blurb: 'Client engagement and reporting platform.' },
  { id: 'wealthtender', name: 'wealthtender', category: 'Marketing & Client Engagement', status: 'available', connection: R, domain: 'wealthtender.com', blurb: 'Adviser marketing and discovery platform.' },
  { id: 'yavia', name: 'Yavia', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'yavia.co.uk', blurb: 'Client engagement and marketing automation.' },
  { id: 'asset-map', name: 'asset+map', category: 'Marketing & Client Engagement', status: 'available', connection: RW, domain: 'assetmap.com', blurb: 'Visual household asset mapping for client meetings.' },

  // ── Risk (UK adviser-tech, Sept 2026 report) ──
  { id: 'a2risk', name: 'A2Risk', category: 'Risk', status: 'available', connection: R, domain: 'a2risk.com', blurb: 'Risk profiling and suitability tooling.' },
  { id: 'be-iq', name: 'Be.IQ', category: 'Risk', status: 'available', connection: R, domain: 'be-iq.com', blurb: 'Behavioral risk profiling platform.' },
  { id: 'finametrica', name: 'FinaMetrica', category: 'Risk', status: 'available', connection: R, domain: 'finametrica.com', blurb: 'Psychometric risk tolerance profiling.' },
  { id: 'oxford-risk', name: 'Oxford Risk', category: 'Risk', status: 'available', connection: R, domain: 'oxfordrisk.com', blurb: 'Behavioral finance risk profiling.' },
  { id: 'pocket-risk', name: 'Pocket Risk', category: 'Risk', status: 'available', connection: R, domain: 'pocketrisk.com', blurb: 'Risk tolerance questionnaires for advisers.' },
  { id: 'tolerisk', name: 'Tolerisk', category: 'Risk', status: 'available', connection: R, domain: 'tolerisk.com', blurb: 'Dynamic risk tolerance and capacity analysis.' },
  { id: 'ev', name: 'eV', category: 'Risk', status: 'available', connection: RW, domain: 'ev.co.uk', blurb: 'Risk and cashflow analytics engine.' },

  // ── RegTech & Compliance (UK adviser-tech, Sept 2026 report) ──
  { id: 'actus', name: 'Actus', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'actus.co.uk', blurb: 'Compliance monitoring and T&C for advice firms.' },
  { id: 'apricity', name: 'apricity', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'apricity.io', blurb: 'RegTech compliance automation.' },
  { id: 'click2check', name: 'C2C Click2Check', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'click2check.co.uk', blurb: 'Automated compliance file checking.' },
  { id: 'i-agree', name: 'i agree', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'iagree.co.uk', blurb: 'E-sign and consent compliance tooling.' },
  { id: 'money-alive', name: 'Money Alive', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'moneyalive.com', blurb: 'Interactive video explainers for compliance disclosures.' },
  { id: 'trailblazer', name: 'Trailblazer', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'trailblazer-tech.com', blurb: 'Compliance workflow and MI reporting.' },
  { id: 'vouchedfor', name: 'Vouchedfor', category: 'RegTech & Compliance', status: 'available', connection: R, domain: 'vouchedfor.co.uk', blurb: 'Adviser reviews and compliance-vetted directory.' },
  { id: 'surely', name: 'Surely', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'surely.app', blurb: 'Automated suitability and compliance checks.' },
  { id: 'curvestone', name: 'Curvestone', category: 'RegTech & Compliance', status: 'available', connection: RW, domain: 'curvestone.co.uk', blurb: 'Call recording and communications compliance.' },

  // ── Document Management (UK adviser-tech, Sept 2026 report) ──
  { id: 'futurevault', name: 'FutureVault', category: 'Document Management', status: 'available', connection: RW, domain: 'futurevault.com', blurb: 'Secure digital vault for client documents.' },
  { id: 'keylu', name: 'Keylu', category: 'Document Management', status: 'available', connection: RW, domain: 'keylu.com', blurb: 'Digital estate and document vault.' },
  { id: 'kinherit', name: 'kinherit', category: 'Document Management', status: 'available', connection: RW, domain: 'kinherit.co.uk', blurb: 'Will writing and estate document platform.' },
  { id: 'legado', name: 'Legado', category: 'Document Management', status: 'available', connection: RW, domain: 'legado.io', blurb: 'Digital vault and estate document exchange.' },
  { id: 'lifeafterme', name: 'lifeafterme', category: 'Document Management', status: 'available', connection: RW, domain: 'lifeafterme.co.uk', blurb: 'Digital legacy and document planning.' },
  { id: 'umlaut', name: 'umlaut', category: 'Document Management', status: 'available', connection: RW, domain: 'umlaut.com', blurb: 'Document processing automation.' },
  { id: 'videosign', name: 'videosign', category: 'Document Management', status: 'available', connection: RW, domain: 'videosign.co.uk', blurb: 'Video identity verification and e-signature.' },
  { id: 'ipipeline', name: 'iPipeline', category: 'Document Management', status: 'available', connection: RW, domain: 'ipipeline.com', blurb: 'Life and protection e-application and e-sign processing.' },

  // ── Messaging (UK adviser-tech, Sept 2026 report) ──
  { id: 'egress', name: 'egress', category: 'Messaging', status: 'available', connection: RW, domain: 'egress.com', blurb: 'Secure email and data-loss prevention.' },
  { id: 'hushmail', name: 'Hushmail', category: 'Messaging', status: 'available', connection: RW, domain: 'hushmail.com', blurb: 'Encrypted email for client communications.' },
  { id: 'mailock', name: 'mailock', category: 'Messaging', status: 'available', connection: RW, domain: 'mailock.com', blurb: 'Secure encrypted email for advice firms.' },
  { id: 'microfocus', name: 'Micro Focus', category: 'Messaging', status: 'available', connection: RW, domain: 'microfocus.com', blurb: 'Secure communications and data protection.' },
  { id: 'protonmail', name: 'ProtonMail', category: 'Messaging', status: 'available', connection: RW, domain: 'proton.me', blurb: 'Encrypted email service.' },

  // ── Estate Planning (UK adviser-tech, Sept 2026 report) ──
  { id: 'heirwealth', name: 'HeirWealth', category: 'Estate Planning', status: 'available', connection: RW, domain: 'heirwealth.com', blurb: 'Estate and legacy planning platform.' },
  { id: 'honeypro', name: 'HoneyPro', category: 'Estate Planning', status: 'available', connection: RW, domain: 'honeypro.io', blurb: 'Estate and inheritance planning tooling.' },
  { id: 'philanthpro', name: 'PhilanthPro', category: 'Estate Planning', status: 'available', connection: RW, domain: 'philanthpro.com', blurb: 'Philanthropic and legacy giving planning tool.' },
  { id: 'fp-alpha', name: 'fp alpha', category: 'Estate Planning', status: 'available', connection: RW, domain: 'fpalpha.com', blurb: 'AI-driven estate, tax, and insurance planning analysis.' },

  // ── Data Aggregation / Integration Hubs (UK adviser-tech, Sept 2026 report) ──
  { id: 'finio', name: 'Finio', category: 'Data Aggregation', status: 'available', connection: RW, domain: 'finio.co.uk', blurb: 'Integration hub connecting adviser systems and data sources.' },
  { id: 'origo', name: 'Origo', category: 'Data Aggregation', status: 'available', connection: RW, domain: 'origo.com', blurb: 'Platform-to-platform data exchange and integration hub.' },
  { id: 'zerokey', name: 'zerokey', category: 'Data Aggregation', status: 'available', connection: RW, domain: 'zerokey.io', blurb: 'Integration hub automating data flows between adviser systems.' },
  { id: 'clearscore', name: 'ClearScore', category: 'Data Aggregation', status: 'available', connection: R, domain: 'clearscore.com', blurb: 'Open-banking credit data and affordability checks.' },

  // ── Wealth Management Systems (UK adviser-tech, Sept 2026 report) ──
  { id: 'advantra', name: 'Advantra', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'advantra.com', blurb: 'Wealth management platform for advisory firms.' },
  { id: 'akoni', name: 'akoni', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'akoni.co.uk', blurb: 'Business cash deposit and treasury platform.' },
  { id: 'd1g1t', name: 'd1g1t', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'd1g1t.com', blurb: 'Enterprise wealth management and risk platform.' },
  { id: 'flagstone', name: 'Flagstone', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'flagstoneim.com', blurb: 'Cash deposit and savings platform for wealth managers.' },
  { id: 'investcloud', name: 'investcloud', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'investcloud.com', blurb: 'Digital wealth management platform.' },
  { id: 'justfa', name: 'JustFA', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'justfa.io', blurb: 'Wealth management back-office platform.' },
  { id: 'logdin', name: 'LOGDIN', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'logdin.io', blurb: 'Wealth management client login and portal infrastructure.' },
  { id: 'third-financial', name: 'Third Financial', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'thirdfinancial.com', blurb: 'Multi-asset wealth management platform.' },
  { id: 'wealth-dynamix', name: 'Wealth Dynamix', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'wealthdynamix.com', blurb: 'CRM and client lifecycle platform for wealth managers.' },
  { id: 'true-potential', name: 'true potential', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'tpllp.com', blurb: 'Wealth platform with AI-enabled planning tools.' },
  { id: 'netwealth', name: 'Netwealth', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'netwealth.com', blurb: 'Digital wealth management platform.' },
  { id: 'wealthtime', name: 'Wealthtime', category: 'Wealth Management Systems', status: 'available', connection: RW, domain: 'wealthtime.com', blurb: 'UK investment and wealth management platform.' },

  // ── Mortgage & Equity Release (UK adviser-tech, Sept 2026 report) ──
  { id: 'oms-one-mortgage-system', name: 'OMS (One Mortgage System)', category: 'Mortgage & Equity Release', status: 'available', connection: RW, domain: 'onemortgagesystem.co.uk', blurb: 'Mortgage practice management system.' },
  { id: 'smartr365', name: 'smartr365', category: 'Mortgage & Equity Release', status: 'available', connection: RW, domain: 'smartr365.com', blurb: 'Mortgage and protection sourcing CRM.' },
  { id: 'surecase', name: 'Surecase', category: 'Mortgage & Equity Release', status: 'available', connection: RW, domain: 'surecase.io', blurb: 'Mortgage case tracking platform.' },
  { id: 'advise-wise', name: 'Advise Wise', category: 'Mortgage & Equity Release', status: 'available', connection: RW, domain: 'advisewise.co.uk', blurb: 'Equity release sourcing and advice platform.' },
  { id: 'air-sourcing', name: 'Air Sourcing', category: 'Mortgage & Equity Release', status: 'available', connection: RW, domain: 'airsourcing.co.uk', blurb: 'Equity release sourcing system.' },

  // ── Protection & Retirement Solutions (UK adviser-tech, Sept 2026 report) ──
  { id: 'novium', name: 'novium', category: 'Protection & Retirement Solutions', status: 'available', connection: RW, domain: 'novium.co.uk', blurb: 'Protection new-business and underwriting platform.' },
  { id: 'pgp', name: 'PGP', category: 'Protection & Retirement Solutions', status: 'available', connection: R, domain: 'pgp.uk.com', blurb: 'Protection and group risk comparison tooling.' },
  { id: 'source-insurance', name: 'Source', category: 'Protection & Retirement Solutions', status: 'available', connection: R, domain: 'source.co.uk', blurb: 'Protection quote and comparison system.' },
  { id: 'underwriteme', name: 'underwriteme', category: 'Protection & Retirement Solutions', status: 'available', connection: RW, domain: 'underwriteme.co.uk', blurb: 'Protection underwriting rules engine.' },
  { id: 'ciexpert', name: 'CIExpert', category: 'Protection & Retirement Solutions', status: 'available', connection: R, domain: 'ciexpert.co.uk', blurb: 'Critical illness research and comparison tool.' },
  { id: 'certua-life', name: 'Certua Life', category: 'Protection & Retirement Solutions', status: 'available', connection: RW, domain: 'certua.com', blurb: 'Protection platform for income and life cover.' },
  { id: 'protectix', name: 'Protectix', category: 'Protection & Retirement Solutions', status: 'available', connection: R, domain: 'protectix.co.uk', blurb: 'Protection research and comparison tool.' },
]

export function integrationsByCategory(list: Integration[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: list.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0)
}
