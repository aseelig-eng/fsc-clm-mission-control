import { goalProgress, type PlanState } from './advice'
import type { Household } from './types'

export function nextConversation(input: {
  household: Household
  plan: PlanState
  lifeEvent?: string
  gaps: { field: string }[]
  notices: { title: string }[]
}) {
  const points: string[] = []
  const stage = [...input.household.stages].reverse().find((item) => item.status !== 'upcoming')

  if (stage?.status === 'blocked' && stage.humanAction) {
    points.push(`${stage.label} is blocked. ${stage.humanAction}.`)
  }
  if (input.notices[0]) {
    points.push(`${input.notices[0].title}. Confirm it before the next meeting so the file matches what they just sent.`)
  }
  if (input.lifeEvent) {
    points.push(input.lifeEvent)
  }
  if (input.plan.goals.length === 0) {
    points.push('There is no goal on the file. This meeting is discovery. Do not draft an IPS from a name and an email.')
  } else {
    const furthest = [...input.plan.goals].sort((a, b) => (goalProgress(a) ?? 0) - (goalProgress(b) ?? 0))[0]
    const progress = furthest ? goalProgress(furthest) : null
    if (furthest && progress != null && progress < 100) {
      points.push(`${furthest.name} is ${progress}% funded. Ask what changed before you talk about products.`)
    } else if (furthest) {
      points.push(`${furthest.name} is on the file. Ask whether the goal still describes the life they are living.`)
    }
  }
  if (input.gaps[0] && points.length < 3) {
    points.push(`${input.gaps[0].field} is still open. Ask for that before you add another topic.`)
  }
  if (points.length === 0 && stage?.humanAction) {
    points.push(stage.humanAction)
  }

  return {
    headline: stage?.label ? `Next conversation · ${stage.label}` : 'Next conversation',
    points: points.slice(0, 3),
  }
}
