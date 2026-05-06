import { FormEvent } from 'react'
import type { TodoList } from '../types'

type SidebarProps = {
  lists: TodoList[]
  selectedListId: number | null
  newListTitle: string
  isSaving: boolean
  onCreateList: (event: FormEvent<HTMLFormElement>) => void
  onNewListTitleChange: (value: string) => void
  onSelectList: (id: number) => void
}

export function Sidebar({
  lists,
  selectedListId,
  newListTitle,
  isSaving,
  onCreateList,
  onNewListTitleChange,
  onSelectList,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Todo lists">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          TD
        </span>
        <div>
          <h1>TodoList</h1>
          <p>API REST local</p>
        </div>
      </div>

      <form className="compact-form" onSubmit={onCreateList}>
        <input
          aria-label="Nombre de nueva lista"
          disabled={isSaving}
          onChange={(event) => onNewListTitleChange(event.target.value)}
          placeholder="Nueva lista"
          value={newListTitle}
        />
        <button disabled={isSaving || !newListTitle.trim()} type="submit">
          Add
        </button>
      </form>

      <nav className="list-nav">
        {lists.map((list) => (
          <button
            aria-current={list.id === selectedListId ? 'page' : undefined}
            className={list.id === selectedListId ? 'list-link active' : 'list-link'}
            key={list.id}
            onClick={() => onSelectList(list.id)}
            type="button"
          >
            <span>{list.title}</span>
            <small>{list.items.length}</small>
          </button>
        ))}
      </nav>
    </aside>
  )
}
