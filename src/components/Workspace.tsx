import { CSSProperties, FormEvent, useMemo } from 'react'
import type { TodoRealtimeStatus } from '../realtime'
import type { TodoItem, TodoList } from '../types'
import { taskIconTransitionName, taskRowTransitionName } from '../viewTransitions'

type WorkspaceProps = {
  selectedList?: TodoList
  selectedItem?: TodoItem
  selectedItemId: number | null
  editingListId: number | null
  editingItemId: number | null
  draftTitle: string
  errorMessage: string | null
  isLoading: boolean
  isSaving: boolean
  newItemTitle: string
  onAddItem: (event: FormEvent<HTMLFormElement>) => void
  onDeleteItem: (id: number) => void
  onDeleteList: (id: number) => void
  onDraftTitleChange: (value: string) => void
  onEditItem: (item: TodoItem) => void
  onEditList: (list: TodoList) => void
  onNewItemTitleChange: (value: string) => void
  onRefresh: () => void
  onSaveItemTitle: (item: TodoItem) => void
  onSaveListTitle: (id: number) => void
  onSelectItemDetail: (id: number | null) => void
  onToggleItem: (item: TodoItem) => void
  realtimeStatus: TodoRealtimeStatus
}

export function Workspace({
  selectedList,
  selectedItem,
  selectedItemId,
  editingListId,
  editingItemId,
  draftTitle,
  errorMessage,
  isLoading,
  isSaving,
  newItemTitle,
  onAddItem,
  onDeleteItem,
  onDeleteList,
  onDraftTitleChange,
  onEditItem,
  onEditList,
  onNewItemTitleChange,
  onRefresh,
  onSaveItemTitle,
  onSaveListTitle,
  onSelectItemDetail,
  onToggleItem,
  realtimeStatus,
}: WorkspaceProps) {
  return (
    <section className="workspace" aria-label="Selected todo list">
      <div className="status-row" aria-live="polite">
        <span>{getStatusText(isLoading, isSaving)}</span>
        <div className="status-actions">
          <span className={`realtime-status ${realtimeStatus}`}>{getRealtimeText(realtimeStatus)}</span>
          <button disabled={isLoading || isSaving} onClick={onRefresh} type="button">
            Refresh
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {!selectedList && !isLoading ? (
        <div className="empty-state">
          <strong>No hay listas</strong>
          <span>Crea una lista para empezar a gestionar items.</span>
        </div>
      ) : null}

      {selectedList ? (
        <>
          <header className="workspace-header">
            <div>
              {editingListId === selectedList.id ? (
                <div className="edit-row">
                  <input
                    aria-label="Editar nombre de lista"
                    autoFocus
                    disabled={isSaving}
                    onChange={(event) => onDraftTitleChange(event.target.value)}
                    value={draftTitle}
                  />
                  <button
                    disabled={isSaving || !draftTitle.trim()}
                    onClick={() => onSaveListTitle(selectedList.id)}
                    type="button"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <h2>{selectedList.title}</h2>
              )}
              <p>{selectedList.description}</p>
            </div>

            <div className="header-actions">
              <button disabled={isSaving} onClick={() => onEditList(selectedList)} type="button">
                Edit
              </button>
              <button
                className="danger"
                disabled={isSaving}
                onClick={() => onDeleteList(selectedList.id)}
                type="button"
              >
                Delete
              </button>
            </div>
          </header>

          <form className="item-form" onSubmit={onAddItem}>
            <input
              aria-label="Nuevo item"
              disabled={isSaving}
              onChange={(event) => onNewItemTitleChange(event.target.value)}
              placeholder="Agregar item a esta lista"
              value={newItemTitle}
            />
            <button disabled={isSaving || !newItemTitle.trim()} type="submit">
              Add item
            </button>
          </form>

          <div className="workspace-content">
            <TodoItems
              draftTitle={draftTitle}
              editingItemId={editingItemId}
              isSaving={isSaving}
              items={selectedList.items}
              onDeleteItem={onDeleteItem}
              onDraftTitleChange={onDraftTitleChange}
              onEditItem={onEditItem}
              onSaveItemTitle={onSaveItemTitle}
              onSelectItemDetail={onSelectItemDetail}
              onToggleItem={onToggleItem}
              selectedItemId={selectedItemId}
            />
            <ItemDetail
              item={selectedItem}
              onDeleteItem={onDeleteItem}
              onSelectItemDetail={onSelectItemDetail}
              onToggleItem={onToggleItem}
            />
          </div>
        </>
      ) : null}
    </section>
  )
}

type TodoItemsProps = {
  draftTitle: string
  editingItemId: number | null
  isSaving: boolean
  items: TodoItem[]
  onDeleteItem: (id: number) => void
  onDraftTitleChange: (value: string) => void
  onEditItem: (item: TodoItem) => void
  onSaveItemTitle: (item: TodoItem) => void
  onSelectItemDetail: (id: number | null) => void
  onToggleItem: (item: TodoItem) => void
  selectedItemId: number | null
}

function TodoItems({
  draftTitle,
  editingItemId,
  isSaving,
  items,
  onDeleteItem,
  onDraftTitleChange,
  onEditItem,
  onSaveItemTitle,
  onSelectItemDetail,
  selectedItemId,
}: TodoItemsProps) {
  const sortedItems = useMemo(() => sortItemsForDisplay(items), [items])

  if (sortedItems.length === 0) {
    return (
      <div className="empty-state">
        <strong>No hay items</strong>
        <span>Agrega el primer item para empezar a trabajar esta lista.</span>
      </div>
    )
  }

  return (
    <div className="item-list">
      {sortedItems.map((item) => (
        <article
          className={item.completed ? 'todo-item completed' : 'todo-item'}
          key={item.id}
          style={getTaskRowStyle(item.id)}
        >
          <div className="todo-main">
            <button
              aria-label={
                selectedItemId === item.id
                  ? `Cerrar detalle de ${item.title}`
                  : `Ver detalle de ${item.title}`
              }
              className="task-icon-button"
              disabled={isSaving}
              onClick={() => onSelectItemDetail(selectedItemId === item.id ? null : item.id)}
              type="button"
            >
              <TaskIcon item={item} viewTransitionEnabled={selectedItemId !== item.id} />
            </button>
            {editingItemId === item.id ? (
              <input
                aria-label="Editar item"
                autoFocus
                className="inline-input"
                disabled={isSaving}
                onChange={(event) => onDraftTitleChange(event.target.value)}
                value={draftTitle}
              />
            ) : (
              <span>{item.title}</span>
            )}
          </div>

          <div className="row-actions">
            {editingItemId === item.id ? (
              <button
                disabled={isSaving || !draftTitle.trim()}
                onClick={() => onSaveItemTitle(item)}
                type="button"
              >
                Save
              </button>
            ) : (
              <button disabled={isSaving} onClick={() => onEditItem(item)} type="button">
                Edit
              </button>
            )}
            <button
              className="danger"
              disabled={isSaving}
              onClick={() => onDeleteItem(item.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

type ItemDetailProps = {
  item?: TodoItem
  onDeleteItem: (id: number) => void
  onSelectItemDetail: (id: number | null) => void
  onToggleItem: (item: TodoItem) => void
}

function ItemDetail({ item, onDeleteItem, onSelectItemDetail, onToggleItem }: ItemDetailProps) {
  if (!item) {
    return null
  }

  return (
    <div className="item-detail-backdrop" onClick={() => onSelectItemDetail(null)}>
      <aside className="item-detail" aria-label="Task detail" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label={`Cerrar detalle de ${item.title}`}
          className="detail-icon-button"
          onClick={() => onSelectItemDetail(null)}
          type="button"
        >
          <TaskIcon item={item} size="large" viewTransitionEnabled />
        </button>
        <div>
          <span className="detail-kicker">Task detail</span>
          <h3>{item.title}</h3>
          <p>{item.completed ? 'Completada' : 'Pendiente'}</p>
        </div>
        <div className="detail-actions">
          <button onClick={() => onToggleItem(item)} type="button">
            {item.completed ? 'Mark pending' : 'Mark done'}
          </button>
          <button className="danger" onClick={() => onDeleteItem(item.id)} type="button">
            Delete
          </button>
        </div>
      </aside>
    </div>
  )
}

type TaskIconProps = {
  item: TodoItem
  size?: 'default' | 'large'
  viewTransitionEnabled: boolean
}

function TaskIcon({ item, size = 'default', viewTransitionEnabled }: TaskIconProps) {
  return (
    <span
      className={size === 'large' ? 'task-icon large' : 'task-icon'}
      style={viewTransitionEnabled ? getTaskIconStyle(item.id) : undefined}
    />
  )
}

function getStatusText(isLoading: boolean, isSaving: boolean) {
  if (isLoading) {
    return 'Cargando datos...'
  }

  if (isSaving) {
    return 'Guardando cambios...'
  }

  return 'Conectado a TodoApi'
}

function getRealtimeText(status: TodoRealtimeStatus) {
  if (status === 'connected') {
    return 'Realtime on'
  }

  if (status === 'connecting') {
    return 'Realtime connecting'
  }

  return 'Realtime off'
}

function sortItemsForDisplay(items: TodoItem[]) {
  return [...items].sort((first, second) => {
    if (first.completed !== second.completed) {
      return Number(first.completed) - Number(second.completed)
    }

    return first.id - second.id
  })
}

function getTaskIconStyle(itemId: number) {
  return { viewTransitionName: taskIconTransitionName(itemId) } as CSSProperties
}

function getTaskRowStyle(itemId: number) {
  return { viewTransitionName: taskRowTransitionName(itemId) } as CSSProperties
}
