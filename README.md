# FSC Client Lifecycle Mission Control

Clickable Lightning-look React prototype for **agentic Client Lifecycle Management** in Financial Services Cloud (US RIA / hybrid).

## Run

```bash
cd "fsc-clm-mission-control"
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`).

## Views

1. **Advisor Cockpit** — exception-first mission control; full lifecycle rail (prospect → estate); agent feed; one-click approve.
2. **Paraplanner Workbench** — agent-drafted IPS / proposals / annual reviews / estate memos with human polish.
3. **Persona Value & Comps** — value by persona (Advisor, Paraplanner, CRA, Specialist, Leadership/CCO, Client) + competitive map.

## Scope choices baked in

- Segment: US RIA / hybrid (EP Wealth–style)
- Lifecycle: prospect → death/estate
- Interaction: mission control (agents work; humans decide)
- Metrics: TTC, NIGO, advisor hours, consolidation, audit, transition AUM
