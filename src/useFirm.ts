import { useCallback, useState } from 'react'
import {
  COURSES,
  initialCompleted,
  initialPeer,
  initialRecruits,
  initialTickets,
  transitionPlan,
  type HelpTicket,
  type PeerThread,
  type Recruit,
  type RecruitStage,
} from './data/firm'

export interface AuditEntry { id: string; at: string; actor: string; area: string; subject: string; decision: string; note?: string }

const NOW = () => new Date().toISOString().slice(0, 16).replace('T', ' ')

export function useFirm(flash: (m: string) => void) {
  const [audit, setAudit] = useState<AuditEntry[]>([
    { id: 'au-0', at: '2026-10-05 16:40', actor: 'J. Hale (CCO)', area: 'Marketing', subject: 'Protection gaps campaign', decision: 'Approved' },
  ])
  const [reviewed, setReviewed] = useState<Set<string>>(new Set())
  const [recruits, setRecruits] = useState<Recruit[]>(() => structuredClone(initialRecruits))
  const [completed, setCompleted] = useState<Record<string, string[]>>(() => structuredClone(initialCompleted))
  const [tickets, setTickets] = useState<HelpTicket[]>(() => structuredClone(initialTickets))
  const [deflected, setDeflected] = useState(0)
  const [peer, setPeer] = useState<PeerThread[]>(() => structuredClone(initialPeer))

  const log = useCallback((area: string, subject: string, decision: string, note?: string, actor = 'J. Hale (CCO)') => {
    setAudit((prev) => [{ id: `au-${Date.now()}-${prev.length}`, at: NOW(), actor, area, subject, decision, note }, ...prev])
  }, [])

  const markReviewed = useCallback(
    (key: string, area: string, subject: string, decision: string, note?: string) => {
      setReviewed((prev) => new Set(prev).add(key))
      log(area, subject, decision, note)
    },
    [log],
  )

  const moveRecruit = useCallback((id: string, stage: RecruitStage) => setRecruits((prev) => prev.map((r) => (r.id === id ? { ...r, stage } : r))), [])
  const buildPlan = useCallback(
    (id: string) => {
      setRecruits((prev) => prev.map((r) => (r.id === id ? { ...r, plan: transitionPlan(r) } : r)))
      flash('Transition Agent drafted the plan.')
    },
    [flash],
  )

  const completeCourse = useCallback(
    (advisorId: string, courseId: string) => {
      setCompleted((prev) => ({ ...prev, [advisorId]: [...new Set([...(prev[advisorId] ?? []), courseId])] }))
      flash(`Completed: ${COURSES.find((c) => c.id === courseId)?.title}`)
    },
    [flash],
  )
  const hasCourse = useCallback((advisorId: string, courseId: string) => (completed[advisorId] ?? []).includes(courseId), [completed])

  const openTicket = useCallback(
    (advisorId: string, category: HelpTicket['category'], question: string) => {
      setTickets((prev) => [{ id: `hd-${Date.now()}`, advisorId, category, question, status: 'open', opened: '2026-10-06' }, ...prev])
      flash('Ticket sent to the home office.')
    },
    [flash],
  )
  const resolveTicket = useCallback((id: string, answer: string) => setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'resolved', answer } : t))), [])

  const startThread = useCallback((title: string, text: string, author: string, householdId?: string, expert?: string) => {
    setPeer((prev) => [{ id: `pt-${Date.now()}`, title, householdId, author, expert, posts: [{ by: author, text }], resolved: false }, ...prev])
  }, [])
  const replyThread = useCallback((id: string, by: string, text: string) => {
    setPeer((prev) => prev.map((t) => (t.id === id ? { ...t, posts: [...t.posts, { by, text }] } : t)))
  }, [])
  const resolveThread = useCallback((id: string) => setPeer((prev) => prev.map((t) => (t.id === id ? { ...t, resolved: true } : t))), [])

  return { audit, log, reviewed, markReviewed, recruits, moveRecruit, buildPlan, completed, completeCourse, hasCourse, tickets, openTicket, resolveTicket, deflected, deflect: () => setDeflected((n) => n + 1), peer, startThread, replyThread, resolveThread }
}
