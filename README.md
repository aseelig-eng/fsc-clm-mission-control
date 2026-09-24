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

1. **Advisor Cockpit** — exception-first mission control; full lifecycle rail (prospect → estate); agent feed; one-click approve.
2. **Paraplanner Workbench** — agent-drafted IPS / proposals / annual reviews / estate memos with human polish.
3. **Persona Value & Comps** — value by persona (Advisor, Paraplanner, CRA, Specialist, Leadership/CCO, Client) + competitive map.

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
- Metrics: TTC, NIGO, advisor hours, consolidation, audit, transition AUM
