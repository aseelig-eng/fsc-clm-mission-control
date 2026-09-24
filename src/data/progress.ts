import type { Household, LifecycleStage, StageStatus } from './types'

const STAGE_WEIGHT: Record<StageStatus, number> = {
  complete: 1,
  active: 0.55,
  'agent-running': 0.55,
  blocked: 0.4,
  upcoming: 0,
}

export function stageProgress(stages: LifecycleStage[]) {
  if (stages.length === 0) return { pct: 0, complete: 0, total: 0, inFlight: 0 }
  const total = stages.length
  const complete = stages.filter((s) => s.status === 'complete').length
  const inFlight = stages.filter((s) =>
    s.status === 'active' || s.status === 'blocked' || s.status === 'agent-running',
  ).length
  const weighted = stages.reduce((sum, s) => sum + STAGE_WEIGHT[s.status], 0)
  const pct = Math.round((weighted / total) * 100)
  return { pct, complete, total, inFlight }
}

export function householdProgress(h: Household) {
  return stageProgress(h.stages)
}

export function overallProgress(list: Household[]) {
  if (list.length === 0) return { pct: 0, completeClients: 0, totalClients: 0, stagesComplete: 0, stagesTotal: 0 }
  const perClient = list.map(householdProgress)
  const pct = Math.round(perClient.reduce((s, p) => s + p.pct, 0) / list.length)
  const completeClients = perClient.filter((p) => p.pct >= 100).length
  const stagesComplete = perClient.reduce((s, p) => s + p.complete, 0)
  const stagesTotal = perClient.reduce((s, p) => s + p.total, 0)
  return { pct, completeClients, totalClients: list.length, stagesComplete, stagesTotal }
}

export function progressTone(pct: number): 'good' | 'warn' | 'blocked' | 'neutral' {
  if (pct >= 85) return 'good'
  if (pct >= 40) return 'neutral'
  return 'warn'
}
