import { useCallback, useState } from 'react'
import {
  CONTENT,
  draftCampaign,
  initialCampaigns,
  initialLeads,
  reviewCopy,
  TODAY,
  type Campaign,
  type Lead,
  type LeadStage,
  type Segment,
} from './data/growth'

export function useGrowth(deps: { flash: (message: string) => void; addTask: (householdId: string, subject: string) => void }) {
  const { flash, addTask } = deps
  const [leads, setLeads] = useState<Lead[]>(() => structuredClone(initialLeads))
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => structuredClone(initialCampaigns))
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const moveLead = useCallback(
    (id: string, stage: LeadStage) => {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)))
    },
    [],
  )

  const convertLead = useCallback(
    (lead: Lead) => {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, stage: 'won' } : l)))
      if (!lead.householdId) {
        addTask('h0', `Open household and start onboarding for ${lead.name} (${lead.sourceDetail})`)
        flash(`${lead.name} won. Onboarding task added to the queue.`)
      } else flash(`${lead.name} won. Onboarding continues on the existing household.`)
    },
    [addTask, flash],
  )

  const createCampaign = useCallback(
    (contentId: string, segment: Segment) => {
      const content = CONTENT.find((c) => c.id === contentId)
      if (!content) return
      const copy = draftCampaign(content, segment)
      setCampaigns((prev) => [
        { id: `cp-${Date.now()}`, contentId, segmentId: segment.id, audience: segment.householdIds, ...copy, status: 'draft', flags: reviewCopy(copy.body), createdAt: TODAY, stats: { sent: 0, opens: 0, replies: 0, meetings: 0 } },
        ...prev,
      ])
      flash('Marketing agent drafted the campaign. Edit it, then submit for compliance review.')
    },
    [flash],
  )

  const editCampaign = useCallback((id: string, body: string) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id && (c.status === 'draft' || c.status === 'rejected') ? { ...c, body, flags: reviewCopy(body) } : c)))
  }, [])

  const submitCampaign = useCallback(
    (id: string) => {
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'pending_compliance', reviewNote: undefined } : c)))
      flash('Submitted to Compliance for FINRA 2210 review.')
    },
    [],
  )

  const decideCampaign = useCallback(
    (id: string, approve: boolean, note?: string) => {
      setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, status: approve ? 'approved' : 'rejected', reviewNote: note } : c)))
      flash(approve ? 'Campaign approved by Compliance.' : 'Campaign returned with comments.')
    },
    [flash],
  )

  const sendCampaign = useCallback(
    (id: string) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== id || c.status !== 'approved') return c
          const n = c.audience.length
          return { ...c, status: 'sent', stats: { sent: n, opens: Math.round(n * 0.62), replies: Math.round(n * 0.2), meetings: Math.max(n > 0 ? 1 : 0, Math.round(n * 0.1)) } }
        }),
      )
      flash('Campaign sent. Archived for books-and-records.')
    },
    [flash],
  )

  const dismissNudge = useCallback((id: string) => setDismissed((prev) => new Set(prev).add(id)), [])

  return { leads, moveLead, convertLead, campaigns, createCampaign, editCampaign, submitCampaign, decideCampaign, sendCampaign, dismissed, dismissNudge }
}
