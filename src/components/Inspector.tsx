import type { TodoList } from '../types'

type Totals = {
  itemCount: number
  pendingCount: number
  completedCount: number
}

type InspectorProps = {
  lists: TodoList[]
  selectedList?: TodoList
  selectedCompleted: number
  selectedPending: number
  totals: Totals
}

export function Inspector({
  lists,
  selectedList,
  selectedCompleted,
  selectedPending,
  totals,
}: InspectorProps) {
  return (
    <aside className="inspector" aria-label="Summary">
      <h2>Resumen</h2>
      <dl>
        <div>
          <dt>Listas</dt>
          <dd>{lists.length}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{totals.itemCount}</dd>
        </div>
        <div>
          <dt>Pendientes</dt>
          <dd>{totals.pendingCount}</dd>
        </div>
        <div>
          <dt>Completados</dt>
          <dd>{totals.completedCount}</dd>
        </div>
      </dl>

      <div className="selected-summary">
        <span>Lista actual</span>
        <strong>{selectedList?.title ?? 'Sin seleccion'}</strong>
        <p>
          {selectedPending} pendientes, {selectedCompleted} completados.
        </p>
      </div>
    </aside>
  )
}
