import { exceptions } from './content'
import { onboardingByHousehold, recordCompleteness } from './onboardingFramework'
import { openMeetingActions, meetingsForHousehold } from './meetings'
import { personsForHousehold } from './portraits'
import type { LifecycleStage, Household } from './types'
import type { ComplianceDocument, FormField, FormSection } from './onboardingFramework'
import type { Meeting, MeetingActionItem } from './meetings'
import type { BehavioralFacet, PersonLikeness } from './portraits'

export type DrillKind =
  | 'exception'
  | 'stage'
  | 'section'
  | 'field'
  | 'document'
  | 'meeting'
  | 'meeting_action'
  | 'likeness_facet'
  | 'likeness_maturity'

export interface RecommendedReview {
  headline: string
  why: string
  agentAlreadyDid: string
  reviewChecklist: string[]
  primaryCta: string
  secondaryCta?: string
}

export interface DrillItem {
  id: string
  kind: DrillKind
  title: string
  subtitle: string
  priority: 'critical' | 'high' | 'medium' | 'info'
  householdId: string
  recommended: RecommendedReview
  /** Optional raw refs for UI */
  meeting?: Meeting
  action?: MeetingActionItem
  section?: FormSection
  field?: FormField
  document?: ComplianceDocument
  stage?: LifecycleStage
  person?: PersonLikeness
  facet?: BehavioralFacet
}

function fieldReview(section: FormSection, field: FormField): RecommendedReview {
  if (field.status === 'blocked') {
    return {
      headline: `Unblock: ${field.label}`,
      why: `${section.label} is blocked on “${field.value || field.label}”. Downstream stages cannot STP.`,
      agentAlreadyDid: 'Agent flagged the blocker, attached evidence, and queued the next compliant step.',
      reviewChecklist: [
        `Confirm the field value / evidence for ${field.label}`,
        'Approve the agent-proposed remediation (do not re-key unless wrong)',
        'Let the orchestrator advance the stage when clear',
      ],
      primaryCta: 'Approve remediation',
      secondaryCta: 'Edit value manually',
    }
  }
  if (field.status === 'missing') {
    return {
      headline: `Collect: ${field.label}`,
      why: `Required for ${section.label} / ${section.phase.replace('_', ' ')}.`,
      agentAlreadyDid: 'Agent listed the gap and drafted client/CRA ask where possible.',
      reviewChecklist: [
        `Decide source: client portal ask vs CRA collection vs meeting agenda`,
        `Review agent-drafted request for ${field.label}`,
        'Send or assign — avoid duplicate outreach',
      ],
      primaryCta: 'Send agent-drafted request',
      secondaryCta: 'Assign to CRA',
    }
  }
  return {
    headline: `Review: ${field.label}`,
    why: `Partial / needs human judgment in ${section.label}.`,
    agentAlreadyDid: `Current value: ${field.value || '—'}. Agent marked partial.`,
    reviewChecklist: [
      'Validate accuracy against source documents',
      'Complete missing nuance',
      'Mark complete when confident',
    ],
    primaryCta: 'Mark reviewed',
    secondaryCta: 'Request more data',
  }
}

function docReview(doc: ComplianceDocument): RecommendedReview {
  if (doc.status === 'nigo') {
    return {
      headline: `Fix NIGO: ${doc.name}`,
      why: doc.notes || 'Custodian or compliance rejected this document pack item.',
      agentAlreadyDid: 'Agent matched the NIGO reason and drafted the corrected package / envelope.',
      reviewChecklist: [
        'Read NIGO reason (do not guess)',
        'Open agent-corrected document / DocuSign',
        'Approve send — avoid creating a parallel packet',
      ],
      primaryCta: 'Approve corrected packet',
      secondaryCta: 'Escalate to CRA',
    }
  }
  if (doc.status === 'pending') {
    return {
      headline: `Pending: ${doc.name}`,
      why: doc.notes || 'Waiting on signature, approval, or upstream gate.',
      agentAlreadyDid: 'Agent is tracking status and will nudge when the gate clears.',
      reviewChecklist: [
        'Confirm upstream gate (principal, funding, client signature)',
        'If stalled > SLA, approve nudge',
      ],
      primaryCta: 'Send reminder',
      secondaryCta: 'View lineage',
    }
  }
  return {
    headline: doc.name,
    why: doc.filedOn ? `Filed ${doc.filedOn}` : 'Not started',
    agentAlreadyDid: doc.notes || 'Stored on Person Account with audit trail.',
    reviewChecklist: ['Open for exam / client share if needed'],
    primaryCta: 'Open document',
  }
}

function stageReview(stage: LifecycleStage): RecommendedReview {
  if (stage.status === 'blocked') {
    return {
      headline: `Stage blocked: ${stage.label}`,
      why: stage.agentSummary || 'Stage cannot advance.',
      agentAlreadyDid: stage.agentSummary || 'Agent diagnosed the blocker.',
      reviewChecklist: [
        stage.humanAction ? `Your action: ${stage.humanAction}` : 'Review exception queue for this stage',
        'Approve agent remediation or delegate',
      ],
      primaryCta: stage.humanAction || 'Open exception',
      secondaryCta: 'View stage lineage',
    }
  }
  if (stage.status === 'active' || stage.status === 'agent-running') {
    return {
      headline: `In flight: ${stage.label}`,
      why: stage.agentSummary || 'Agents are working this stage.',
      agentAlreadyDid: stage.agentSummary || 'Orchestrator owns progression.',
      reviewChecklist: [
        'Skim agent feed for this stage',
        stage.humanAction ? `Only intervene for: ${stage.humanAction}` : 'No action unless an exception appears',
      ],
      primaryCta: stage.humanAction || 'Monitor only',
    }
  }
  return {
    headline: stage.label,
    why: `Status: ${stage.status}`,
    agentAlreadyDid: stage.agentSummary || '—',
    reviewChecklist: ['No action required'],
    primaryCta: 'Close',
  }
}

export function buildDrillItems(household: Household): DrillItem[] {
  const items: DrillItem[] = []
  const rec = onboardingByHousehold[household.id]
  const hhExceptions = exceptions.filter(
    (e) =>
      e.household.includes(household.name.split(' ')[0]) ||
      household.name.includes(e.household.split(' ')[0]),
  )

  for (const ex of hhExceptions) {
    items.push({
      id: `ex-${ex.id}`,
      kind: 'exception',
      title: ex.title,
      subtitle: `${ex.owner} · ${ex.stage}`,
      priority: ex.priority,
      householdId: household.id,
      recommended: {
        headline: ex.title,
        why: ex.reason,
        agentAlreadyDid: ex.agentContext,
        reviewChecklist: [
          `Recommended: ${ex.recommendedAction}`,
          'Confirm evidence matches client intent',
          'Approve to let the agent continue — or talk to client if relationship-sensitive',
        ],
        primaryCta: ex.recommendedAction,
        secondaryCta: 'Talk to client instead',
      },
    })
  }

  for (const stage of household.stages) {
    items.push({
      id: `stage-${stage.id}`,
      kind: 'stage',
      title: stage.label,
      subtitle: stage.status,
      priority:
        stage.status === 'blocked'
          ? 'critical'
          : stage.status === 'active' || stage.status === 'agent-running'
            ? 'high'
            : 'info',
      householdId: household.id,
      stage,
      recommended: stageReview(stage),
    })
  }

  if (rec) {
    const completeness = recordCompleteness(rec)
    for (const section of rec.sections) {
      const gapFields = section.fields.filter(
        (f) => f.status === 'blocked' || f.status === 'missing' || f.status === 'partial',
      )
      if (gapFields.length === 0) continue
      items.push({
        id: `section-${section.id}`,
        kind: 'section',
        title: section.label,
        subtitle: `${gapFields.length} fields need attention`,
        priority: gapFields.some((f) => f.status === 'blocked')
          ? 'critical'
          : gapFields.some((f) => f.status === 'missing')
            ? 'high'
            : 'medium',
        householdId: household.id,
        section,
        recommended: {
          headline: `Review section: ${section.label}`,
          why: `${gapFields.length} gap(s). Phase: ${section.phase}.`,
          agentAlreadyDid: 'Section mapped to lifecycle stages; gaps ranked in signal list.',
          reviewChecklist: gapFields.map(
            (f) => `${f.label}: ${f.status}${f.value ? ` — ${f.value}` : ''}`,
          ),
          primaryCta: 'Open first gap field',
          secondaryCta: 'Assign section to CRA',
        },
      })
      for (const field of gapFields) {
        items.push({
          id: `field-${section.id}-${field.key}`,
          kind: 'field',
          title: field.label,
          subtitle: section.label,
          priority:
            field.status === 'blocked' ? 'critical' : field.status === 'missing' ? 'high' : 'medium',
          householdId: household.id,
          section,
          field,
          recommended: fieldReview(section, field),
        })
      }
    }

    for (const doc of rec.documents) {
      items.push({
        id: `doc-${doc.id}`,
        kind: 'document',
        title: doc.name,
        subtitle: doc.status,
        priority:
          doc.status === 'nigo' ? 'critical' : doc.status === 'pending' ? 'high' : doc.status === 'not_started' ? 'medium' : 'info',
        householdId: household.id,
        document: doc,
        recommended: docReview(doc),
      })
    }

    // silence unused
    void completeness
  }

  for (const meeting of meetingsForHousehold(household.id)) {
    items.push({
      id: `meeting-${meeting.id}`,
      kind: 'meeting',
      title: meeting.title,
      subtitle: `${meeting.status} · ${meeting.when.replace('T', ' · ')}`,
      priority: meeting.status === 'scheduled' ? 'high' : 'info',
      householdId: household.id,
      meeting,
      recommended: {
        headline: meeting.title,
        why:
          meeting.status === 'scheduled'
            ? `Upcoming ${meeting.type.replace('_', ' ')} meeting via ${meeting.channel}.`
            : meeting.summary || 'Completed meeting on file.',
        agentAlreadyDid: meeting.prepBriefReady
          ? `Prep brief ready${meeting.playbookId ? ` · Playbook ${meeting.playbookId}` : ''}`
          : 'Prep brief not ready — blocked on upstream stage.',
        reviewChecklist: [
          ...(meeting.agenda.map((a) => `Agenda: ${a}`) || []),
          ...(meeting.decisions?.map((d) => `Decision: ${d}`) || []),
          ...meeting.actions
            .filter((a) => a.status !== 'done')
            .map((a) => `Open action (${a.owner}): ${a.title}`),
        ],
        primaryCta:
          meeting.status === 'scheduled'
            ? meeting.prepBriefReady
              ? 'Open prep brief'
              : 'Unblock prep brief'
            : 'View transcript / notes',
        secondaryCta: 'Open action items',
      },
    })
  }

  for (const { meeting, action } of openMeetingActions(household.id)) {
    items.push({
      id: `ma-${action.id}`,
      kind: 'meeting_action',
      title: action.title,
      subtitle: `${meeting.title} · due ${action.due}`,
      priority: action.status === 'blocked' ? 'critical' : 'high',
      householdId: household.id,
      meeting,
      action,
      recommended: {
        headline: action.title,
        why: `From meeting “${meeting.title}”. Owner: ${action.owner}.`,
        agentAlreadyDid: 'Action extracted from meeting notes / playbook and queued here.',
        reviewChecklist: [
          action.recommendedReview,
          'Complete or reassign — do not leave in email',
        ],
        primaryCta: 'Mark reviewed / complete',
        secondaryCta: 'Reassign',
      },
    })
  }

  for (const person of personsForHousehold(household.id)) {
    const m = person.maturity
    items.push({
      id: `likeness-mat-${person.id}`,
      kind: 'likeness_maturity',
      title: `${person.name} — likeness maturity`,
      subtitle: `${m.tier.replace('_', ' ')} · ${m.score}`,
      priority: m.score < 45 ? 'high' : 'info',
      householdId: household.id,
      person,
      recommended: {
        headline: `How sharp is our picture of ${person.name}?`,
        why: `Maturity blends data completeness (${m.dataCompleteness}), recency (${m.recency}), source diversity (${m.sourceDiversity}), and advisor-confirmed share (${m.advisorConfirmed}). Last touched: ${m.lastTouched}.`,
        agentAlreadyDid: `Sources in the likeness: ${m.sources.join(', ')}.`,
        reviewChecklist: [
          m.score < 55
            ? 'Prioritize a discovery or confirmation pass on weakest facets'
            : 'Maintain freshness — confirm any agent-inferred facets before high-stakes advice',
          (() => {
            const heirs = person.facets.find((f) => f.id === 'heir_readiness')
            if (!heirs) return 'Review heir readiness for wealth-transfer retention'
            if (heirs.score < 45)
              return `Heir readiness is low (${heirs.score}) — plan next-gen intro before transfer events to keep the household`
            if (heirs.score < 70)
              return `Heir readiness is forming (${heirs.score}) — deepen next-gen engagement this quarter`
            return `Heir readiness looks solid (${heirs.score}) — keep next-gen touches on the calendar`
          })(),
          'Click Household Pulse nodes (Engage, Lifecycle, Likeness, Heirs, Custodian) for evidence',
          'Do not treat low-maturity likenesses as exam-ready',
        ],
        primaryCta: 'Open weakest facet',
        secondaryCta: 'Schedule confirmation touch',
      },
    })

    for (const facet of person.facets) {
      items.push({
        id: `likeness-${person.id}-${facet.id}`,
        kind: 'likeness_facet',
        title: `${person.name} · ${facet.label}`,
        subtitle: `Signal ${facet.score} · ${facet.inferredBy}`,
        priority:
          facet.id === 'heir_readiness' && facet.score < 50
            ? 'high'
            : facet.score < 40 || facet.inferredBy === 'agent'
              ? 'medium'
              : 'info',
        householdId: household.id,
        person,
        facet,
        recommended: {
          headline: facet.label,
          why: facet.blurb,
          agentAlreadyDid: `Evidence: ${facet.evidence.join(' · ')}. Inferred by: ${facet.inferredBy}.`,
          reviewChecklist: [
            facet.recommendedReview,
            facet.inferredBy === 'agent'
              ? 'Confirm or correct — this is still agent-inferred'
              : 'Advisor-confirmed — spot-check only if life changed',
          ],
          primaryCta: 'Confirm likeness',
          secondaryCta: 'Flag for re-discovery',
        },
      })
    }
  }

  const order = { critical: 0, high: 1, medium: 2, info: 3 }
  return items.sort((a, b) => order[a.priority] - order[b.priority])
}
