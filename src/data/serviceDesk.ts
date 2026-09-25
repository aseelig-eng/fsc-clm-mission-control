export type CaseStatus = 'New' | 'Working' | 'Waiting on client' | 'Escalated' | 'Closed'
export type TaskStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Completed'
export type ChecklistStatus = 'New' | 'Collected'
export type GoalRecordStatus = 'IN_PROGRESS' | 'NOT_STARTED'

export interface ServiceCase {
  id: string
  householdId: string
  subject: string
  status: CaseStatus
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  origin: 'Phone' | 'Email' | 'Portal' | 'Website'
  type: string
}

export interface WorkTask {
  id: string
  householdId: string
  subject: string
  status: TaskStatus
  priority: 'Low' | 'Normal' | 'High'
  due: string
}

export interface CollectItem {
  id: string
  householdId: string
  name: string
  status: ChecklistStatus
}

export interface GoalRecord {
  id: string
  householdId: string
  name: string
  type: string
  status: GoalRecordStatus
}

export const serviceCases: ServiceCase[] = [
  {
    id: 'c-elena',
    householdId: 'h0',
    subject: 'Prospect form — phone and goal still missing',
    status: 'New',
    priority: 'Medium',
    origin: 'Website',
    type: 'Account support',
  },
  {
    id: 'c-maya-tod',
    householdId: 'h1',
    subject: 'TOD addendum — signature required for ACAT #48291',
    status: 'Working',
    priority: 'High',
    origin: 'Phone',
    type: 'Account support',
  },
  {
    id: 'c-maya-ben',
    householdId: 'h1',
    subject: 'Beneficiary designation — sibling named, contingent blank',
    status: 'New',
    priority: 'Medium',
    origin: 'Portal',
    type: 'Account support',
  },
  {
    id: 'c-whit',
    householdId: 'h2',
    subject: 'US beneficiary on the trust — FATCA checklist',
    status: 'Working',
    priority: 'High',
    origin: 'Phone',
    type: 'Account support',
  },
  {
    id: 'c-adams-realloc',
    householdId: 'h3',
    subject: 'Discuss investment reallocation',
    status: 'Working',
    priority: 'High',
    origin: 'Phone',
    type: 'Account support',
  },
  {
    id: 'c-adams-ben',
    householdId: 'h3',
    subject: 'IRA contingent beneficiary',
    status: 'New',
    priority: 'Medium',
    origin: 'Email',
    type: 'Account support',
  },
  {
    id: 'c-oko-retitle',
    householdId: 'h4',
    subject: 'Retitle — surviving spouse signature',
    status: 'Working',
    priority: 'High',
    origin: 'Phone',
    type: 'Account support',
  },
  {
    id: 'c-oko-ein',
    householdId: 'h4',
    subject: 'Estate EIN and successor W-9',
    status: 'Waiting on client',
    priority: 'Medium',
    origin: 'Email',
    type: 'Information request',
  },
]

export const workTasks: WorkTask[] = [
  { id: 't-e1', householdId: 'h0', subject: 'Confirm Monday’s intro with Elena', status: 'Not Started', priority: 'High', due: '2026-09-28' },
  { id: 't-e2', householdId: 'h0', subject: 'Capture a phone number, one goal, and whether assets will move', status: 'Not Started', priority: 'High', due: '2026-09-29' },
  { id: 't-m1', householdId: 'h1', subject: 'Resolve the TOD case before the funding call', status: 'Not Started', priority: 'High', due: '2026-09-24' },
  { id: 't-m2', householdId: 'h1', subject: 'Confirm the 3:30 funding call', status: 'Not Started', priority: 'Normal', due: '2026-09-24' },
  { id: 't-m3', householdId: 'h1', subject: 'Gather the signed TOD addendum', status: 'In Progress', priority: 'High', due: '2026-09-24' },
  { id: 't-w1', householdId: 'h2', subject: 'Principal approves EDD before Thursday', status: 'Not Started', priority: 'High', due: '2026-09-25' },
  { id: 't-w2', householdId: 'h2', subject: 'Confirm the W-9 and FATCA list with the client', status: 'Not Started', priority: 'High', due: '2026-09-25' },
  { id: 't-w3', householdId: 'h2', subject: 'Gather more trust pages only if the principal asks', status: 'On Hold', priority: 'Normal', due: '2026-09-26' },
  { id: 't-a1', householdId: 'h3', subject: 'Prepare the retirement income projection', status: 'In Progress', priority: 'High', due: '2026-09-25' },
  { id: 't-a2', householdId: 'h3', subject: 'Review open cases before the annual review', status: 'Not Started', priority: 'High', due: '2026-09-25' },
  { id: 't-a3', householdId: 'h3', subject: 'Send the annual review reminder', status: 'Not Started', priority: 'Normal', due: '2026-09-25' },
  { id: 't-o1', householdId: 'h4', subject: 'Confirm Tuesday’s intro with Amara', status: 'Not Started', priority: 'High', due: '2026-09-29' },
  { id: 't-o2', householdId: 'h4', subject: 'Review the retitle packet before the meeting', status: 'Not Started', priority: 'High', due: '2026-09-29' },
  { id: 't-o3', householdId: 'h4', subject: 'Collect the estate EIN and successor W-9', status: 'Not Started', priority: 'Normal', due: '2026-09-30' },
]

export const collectItems: CollectItem[] = [
  { id: 'k-e1', householdId: 'h0', name: 'Phone number', status: 'New' },
  { id: 'k-e2', householdId: 'h0', name: 'A goal', status: 'New' },
  { id: 'k-e3', householdId: 'h0', name: 'Whether any account would move', status: 'New' },
  { id: 'k-m1', householdId: 'h1', name: 'TOD / beneficiary designation', status: 'New' },
  { id: 'k-m2', householdId: 'h1', name: 'Contingent beneficiary', status: 'New' },
  { id: 'k-m3', householdId: 'h1', name: 'W-9', status: 'Collected' },
  { id: 'k-w1', householdId: 'h2', name: 'CPA letter', status: 'Collected' },
  { id: 'k-w2', householdId: 'h2', name: 'Trust deed', status: 'Collected' },
  { id: 'k-w3', householdId: 'h2', name: 'US beneficiary form', status: 'New' },
  { id: 'k-a1', householdId: 'h3', name: 'Annual review deck', status: 'New' },
  { id: 'k-a2', householdId: 'h3', name: 'Tax brief', status: 'New' },
  { id: 'k-a3', householdId: 'h3', name: 'IRA contingent form', status: 'New' },
  { id: 'k-o1', householdId: 'h4', name: 'Letters testamentary', status: 'Collected' },
  { id: 'k-o2', householdId: 'h4', name: 'Retitle authorization', status: 'New' },
  { id: 'k-o3', householdId: 'h4', name: 'Estate EIN', status: 'New' },
]

export const goalRecords: GoalRecord[] = [
  { id: 'g-m1', householdId: 'h1', name: 'Long-term growth', type: 'Retirement', status: 'IN_PROGRESS' },
  { id: 'g-m2', householdId: 'h1', name: 'Home purchase', type: 'Home', status: 'NOT_STARTED' },
  { id: 'g-w1', householdId: 'h2', name: 'Preserve wealth', type: 'Other', status: 'IN_PROGRESS' },
  { id: 'g-w2', householdId: 'h2', name: 'Transfer to the next generation', type: 'Other', status: 'IN_PROGRESS' },
  { id: 'g-a1', householdId: 'h3', name: 'Tax-efficient retirement income', type: 'Retirement', status: 'IN_PROGRESS' },
  { id: 'g-a2', householdId: 'h3', name: 'Roth conversion', type: 'Other', status: 'IN_PROGRESS' },
  { id: 'g-o1', householdId: 'h4', name: 'Estate settlement', type: 'Other', status: 'IN_PROGRESS' },
  { id: 'g-o2', householdId: 'h4', name: 'Spouse income', type: 'Retirement', status: 'NOT_STARTED' },
]

export function casesFor(householdId: string) {
  return serviceCases.filter((item) => item.householdId === householdId)
}

export function tasksFor(householdId: string) {
  return workTasks.filter((item) => item.householdId === householdId)
}

export function checklistFor(householdId: string) {
  return collectItems.filter((item) => item.householdId === householdId)
}

export function goalsFor(householdId: string) {
  return goalRecords.filter((item) => item.householdId === householdId)
}
