# FSC Client Lifecycle Mission Control

Clickable Lightning-look React prototype for **agentic Client Lifecycle Management** in Financial Services Cloud (US RIA / hybrid).

## Live demo (share this)

**https://aseelig-eng.github.io/fsc-clm-mission-control/**

Anyone with the link can open the interactive experience in the browser (no install).

## Run locally

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Views

1. **Advisor Cockpit** — exception-first mission control; **household pulse**; full lifecycle rail; agent feed; Needs you signals with recommended actions; blocked process cards with unblock popup.
2. **Paraplanner Workbench** — agent-drafted IPS / proposals / annual reviews / estate memos with human polish.
3. **Persona Value & Comps** — value by persona (Advisor, Paraplanner, CRA, Specialist, Leadership/CCO, Client) + competitive map — including multi-gen / heir retention and likeness maturity.

### Household pulse

Per household: status visual (Engage · Lifecycle · Likeness maturity · Heirs · Custodian) with attention usage, progress, and impact. Node clicks open the same one-click recommended review (or stage unblock popup) as Needs you signals.

### One-click-down review

Click any exception, stage, form section/field, document, meeting, meeting action, likeness facet, or maturity → **Recommended review** panel shows why it needs you, what the agent already did, a review checklist, and primary CTAs.

### Meeting management

Per household: **scheduled** meetings, **meetings held** (summary + decisions), and **actions from meetings** with owner/due and recommended review text.

### CLM framework embedded in the cockpit

Per household (mission-control, not a separate wizard):

- **4-phase map** — Intake & Legal → KYC/AML → Custodial & Funding → Orientation & Cadence
- **Data & forms** — Person Account field model (Client & Details through Legal & Alts) with completeness + gap signals
- **Document vault** — IAA, CRS, ADV 2A/2B, IPS, Fee Schedule A, custodial app, tax form, e-sign trail
- **Lifecycle Monitor Agent** — activation decision, annual KYC refresh, life-event listener, Meeting Concierge playbook IDs, portal/welcome/billing flags

## Scope choices baked in

- Segment: US RIA / hybrid (EP Wealth–style)
- Lifecycle: prospect → death/estate
- Interaction: mission control (agents work; humans decide)
- Metrics: TTC, NIGO, advisor hours, consolidation, audit, transition AUM, **estate/heir AUM retained**