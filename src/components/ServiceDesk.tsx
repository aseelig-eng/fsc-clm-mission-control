import type { ChecklistStatus, CollectItem, GoalRecord, GoalRecordStatus } from '../data/serviceDesk'

function goalLabel(status: string) {
  return status === 'IN_PROGRESS' ? 'In progress' : 'Not started'
}

export function ServiceDesk({
  checklist,
  goals,
  onChecklist,
  onGoal,
}: {
  checklist: CollectItem[]
  goals: GoalRecord[]
  onChecklist: (id: string, status: ChecklistStatus) => void
  onGoal: (id: string, status: GoalRecordStatus) => void
}) {
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
                <td>
                  <select
                    className="field-edit"
                    aria-label={`${item.name} status`}
                    value={item.status}
                    onChange={(event) => onChecklist(item.id, event.target.value as ChecklistStatus)}
                  >
                    <option>New</option>
                    <option>Collected</option>
                  </select>
                </td>
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
                  <td>
                    <select
                      className="field-edit"
                      aria-label={`${item.name} status`}
                      value={item.status}
                      onChange={(event) => onGoal(item.id, event.target.value as GoalRecordStatus)}
                    >
                      <option value="IN_PROGRESS">{goalLabel('IN_PROGRESS')}</option>
                      <option value="NOT_STARTED">{goalLabel('NOT_STARTED')}</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
