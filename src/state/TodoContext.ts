import { createContext, useContext } from 'react'
import type { TodoContextValue } from './TodoStore'

export const TodoContext = createContext<TodoContextValue | null>(null)

export function useTodoStore() {
  const context = useContext(TodoContext)

  if (!context) {
    throw new Error('useTodoStore must be used within TodoProvider')
  }

  return context
}
