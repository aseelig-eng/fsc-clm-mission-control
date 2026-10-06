// State + actions for the Phase 1 client-experience capabilities (messaging,
// identity protection, planning profile, protection referrals, well-being steps,
// performance reports). Kept out of App.tsx so App only does the wiring.

import { useCallback, useState } from 'react'
import { initialThreads, newMessageId, type MessageChannel, type MessageThread } from './data/messages'
import { initialSecurity, type SecurityProfile } from './data/security'
import { fmtK, initialProfiles, type FinancialProfile, type ProtectionLine } from './data/financialProfile'
import type { WorkTask } from './data/serviceDesk'
import type { ComplianceDocument } from './data/onboardingFramework'
import type { PublishedReport } from './components/PerformancePanel'

export interface SecurityAlert {
  id: string
  householdId: string
  amount: number
  accountLabel: string
  reasons: string[]
  opened: string
  status: 'open' | 'released' | 'held'
}

const NOW = () => new Date().toISOString().slice(0, 19)
const TODAY = () => new Date().toISOString().slice(0, 10)

export function useEngagement(deps: {
  householdName: (id: string) => string
  flash: (message: string) => void
  addTask: (task: WorkTask) => void
  setMoveCaseStatus: (householdId: string, status: 'Working' | 'Escalated') => void
  publishDocument: (householdId: string, doc: ComplianceDocument) => void
}) {
  const { householdName, flash, addTask, setMoveCaseStatus, publishDocument } = deps
  const [threads, setThreads] = useState<MessageThread[]>(() => structuredClone(initialThreads))
  const [security, setSecurity] = useState<Record<string, SecurityProfile>>(() => structuredClone(initialSecurity))
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [profiles, setProfiles] = useState<Record<string, FinancialProfile>>(() => structuredClone(initialProfiles))
  const [referred, setReferred] = useState<Set<string>>(new Set())
  const [stepsTaken, setStepsTaken] = useState<Set<string>>(new Set())
  const [published, setPublished] = useState<Set<string>>(new Set())

  // ── Messaging ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (threadId: string, body: string, from: 'advisor' | 'client', meta: { agentDrafted?: boolean; flags?: string[] } = {}) => {
      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) return thread
          const name = from === 'advisor' ? 'A. Rivera' : (initialProfiles[thread.householdId]?.primaryName ?? householdName(thread.householdId))
          return {
            ...thread,
            advisorRead: from === 'advisor',
            clientRead: from === 'client',
            messages: [
              ...thread.messages,
              { id: newMessageId(), author: from, name, body, at: NOW(), channel: thread.channel, agentDrafted: meta.agentDrafted, flags: meta.flags },
            ],
          }
        }),
      )
      if (from === 'advisor') {
        flash(meta.flags && meta.flags.length > 0 ? 'Sent. Archived and routed to your supervisor for lexicon review.' : 'Sent. Archived to books-and-records.')
      }
    },
    [flash, householdName],
  )

  const markRead = useCallback((threadId: string, audience: 'advisor' | 'client') => {
    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === threadId ? { ...thread, ...(audience === 'advisor' ? { advisorRead: true } : { clientRead: true }) } : thread,
      ),
    )
  }, [])

  const newClientThread = useCallback(
    (householdId: string, subject: string, body: string, channel: MessageChannel) => {
      const name = initialProfiles[householdId]?.primaryName ?? householdName(householdId)
      setThreads((prev) => [
        {
          id: `th-${Date.now()}`,
          householdId,
          subject,
          channel,
          advisorRead: false,
          clientRead: true,
          messages: [{ id: newMessageId(), author: 'client', name, body, at: NOW(), channel }],
        },
        ...prev,
      ])
    },
    [householdName],
  )

  // ── Identity protection ─────────────────────────────────────────────────
  const updateSecurity = useCallback((householdId: string, patch: Partial<SecurityProfile>) => {
    setSecurity((prev) => ({ ...prev, [householdId]: { ...prev[householdId], ...patch } }))
  }, [])

  const raiseMoveAlert = useCallback(
    (householdId: string, amount: number, accountLabel: string, reasons: string[]) => {
      setSecurityAlerts((prev) => [
        { id: `sa-${Date.now()}`, householdId, amount, accountLabel, reasons, opened: NOW(), status: 'open' },
        ...prev,
      ])
    },
    [],
  )

  const resolveAlert = useCallback(
    (alertId: string, outcome: 'released' | 'held') => {
      const alert = securityAlerts.find((item) => item.id === alertId)
      if (!alert || alert.status !== 'open') return
      setSecurityAlerts((prev) => prev.map((item) => (item.id === alertId ? { ...item, status: outcome } : item)))
      setMoveCaseStatus(alert.householdId, outcome === 'released' ? 'Working' : 'Escalated')
      flash(
        outcome === 'released'
          ? `Callback verified with ${householdName(alert.householdId)}. ${fmtK(alert.amount)} move released to operations.`
          : `${fmtK(alert.amount)} move held. Escalated to Compliance; trusted contact may be notified (FINRA 2165).`,
      )
    },
    [securityAlerts, flash, householdName, setMoveCaseStatus],
  )

  // ── Planning profile + protection + well-being ─────────────────────────
  const updateProfile = useCallback((householdId: string, patch: Partial<FinancialProfile>) => {
    setProfiles((prev) => ({ ...prev, [householdId]: { ...prev[householdId], ...patch } }))
  }, [])

  const refer = useCallback(
    (householdId: string, line: ProtectionLine) => {
      const key = `${householdId}-${line.id}`
      setReferred((prev) => new Set(prev).add(key))
      addTask({
        id: `t-ins-${key}-${Date.now()}`,
        householdId,
        subject: `Insurance Desk referral · ${line.label} gap ${fmtK(line.gap)}${line.id === 'disability' ? '/mo' : ''}`,
        status: 'Not Started',
        priority: 'Normal',
        due: '2026-10-15',
        opened: TODAY(),
      })
      flash(`Referred ${householdName(householdId)} to the Insurance Desk for ${line.label.toLowerCase()}. Task created.`)
    },
    [addTask, flash, householdName],
  )

  const takeStep = useCallback(
    (householdId: string, pillarId: string, pillarLabel: string, step: string, audience: 'advisor' | 'client') => {
      setStepsTaken((prev) => new Set(prev).add(`${householdId}-${pillarId}`))
      if (audience === 'advisor') {
        addTask({
          id: `t-wb-${householdId}-${pillarId}-${Date.now()}`,
          householdId,
          subject: `Well-being · ${pillarLabel}: ${step}`,
          status: 'Not Started',
          priority: 'Normal',
          due: '2026-10-31',
          opened: TODAY(),
        })
        flash(`Task created for ${householdName(householdId)}: ${step}`)
      } else {
        newClientThread(householdId, `Question about my ${pillarLabel.toLowerCase()}`, `I saw this suggestion in my portal: “${step}” Can we talk about it?`, 'secure')
      }
    },
    [addTask, flash, householdName, newClientThread],
  )

  // ── Performance reports ─────────────────────────────────────────────────
  const publishReport = useCallback(
    (householdId: string, report: PublishedReport) => {
      setPublished((prev) => new Set(prev).add(`${householdId}-${report.id}`))
      publishDocument(householdId, {
        id: report.id,
        name: report.name,
        category: 'report',
        status: 'filed',
        filedOn: TODAY(),
        notes: report.notes,
        body: report.body,
      })
      flash(`${report.name} published to ${householdName(householdId)}’s vault and portal.`)
    },
    [flash, householdName, publishDocument],
  )

  return {
    threads,
    sendMessage,
    markRead,
    newClientThread,
    security,
    updateSecurity,
    securityAlerts,
    raiseMoveAlert,
    resolveAlert,
    profiles,
    updateProfile,
    referred,
    refer,
    stepsTaken,
    takeStep,
    published,
    publishReport,
  }
}
