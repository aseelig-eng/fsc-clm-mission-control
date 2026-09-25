import { casesFor, checklistFor, goalsFor, tasksFor } from '../data/serviceDesk'

function goalLabel(status: string) {
  return status === 'IN_PROGRESS' ? 'In progress' : 'Not started'
}

export function ServiceDesk({
  householdId,
  mode,
  signals = [],
}: {
  householdId: string
  mode: 'queue' | 'file'
  signals?: { id: string; title: string; meta: string }[]
}) {
  const cases = casesFor(householdId).filter((item) => item.status !== 'Closed')
  const tasks = tasksFor(householdId).filter((item) => item.status !== 'Completed')
  const checklist = checklistFor(householdId)
  const goals = goalsFor(householdId)

  if (mode === 'queue') {
    const rows = [
      ...signals.map((item) => ({ id: item.id, type: 'Signal', title: item.title, meta: item.meta })),
      ...cases.map((item) => ({ id: item.id, type: 'Case', title: item.subject, meta: `${item.status} · ${item.priority}` })),
      ...tasks.map((item) => ({ id: item.id, type: 'Task', title: item.subject, meta: `${item.status} · due ${item.due}` })),
    ]
    return (
      <table className="desk-table">
        <caption>One queue for this household. Cases, tasks, and signals together.</caption>
        <thead>
          <tr>
            <th>Type</th>
            <th>Item</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.type}</td>
              <td>{row.title}</td>
              <td>{row.meta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="service-desk">
      <section>
        <h3>Still to collect</h3>
        <table className="desk-table">
          <caption>Document checklist, separate from the filed vault</caption>
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {checklist.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Financial goals</h3>
        {goals.length === 0 ? (
          <p className="muted">No goal on the file yet.</p>
        ) : (
          <table className="desk-table">
            <caption>Financial goals and their status</caption>
            <thead>
              <tr>
                <th>Goal</th>
                <th>Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.type}</td>
                  <td>{goalLabel(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

