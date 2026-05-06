export type TodoItem = {
  id: number
  title: string
  completed: boolean
  todoListId: number
  externalId: string | null
  updatedAt: string
}

export type TodoList = {
  id: number
  title: string
  description: string
  items: TodoItem[]
  externalId: string | null
  updatedAt: string
}

export type ApiProblem = {
  title?: string
  detail?: string
  status?: number
  code?: string
  errorCode?: string
  traceId?: string
}

export type ApiTodoList = {
  id: number
  source_id: string | null
  external_id: string | null
  name: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at: string | null
}

export type ApiTodoItem = {
  id: number
  source_id: string | null
  external_id: string | null
  name: string
  is_completed?: boolean
  isCompleted?: boolean
  todo_list_id?: number
  todoListId?: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at: string | null
}

export type ApiTodoListDetail = ApiTodoList & {
  items: ApiTodoItem[]
}

export type SaveTodoListPayload = {
  name: string
}

export type SaveTodoItemPayload = {
  name: string
  isCompleted: boolean
}
