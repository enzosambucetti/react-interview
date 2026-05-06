import type {
  ApiProblem,
  ApiTodoItem,
  ApiTodoList,
  ApiTodoListDetail,
  SaveTodoItemPayload,
  SaveTodoListPayload,
  TodoItem,
  TodoList,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class ApiError extends Error {
  status: number
  code?: string
  detail?: string

  constructor(status: number, problem?: ApiProblem) {
    super(problem?.detail ?? problem?.title ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = problem?.code ?? problem?.errorCode
    this.detail = problem?.detail
  }
}

function buildUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`
}

async function parseProblem(response: Response) {
  try {
    return (await response.json()) as ApiProblem
  } catch {
    return undefined
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new ApiError(response.status, await parseProblem(response))
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function mapItem(item: ApiTodoItem): TodoItem {
  return {
    id: item.id,
    title: item.name,
    completed: item.is_completed ?? item.isCompleted ?? false,
    todoListId: item.todo_list_id ?? item.todoListId ?? 0,
    externalId: item.external_id,
    updatedAt: item.updated_at,
  }
}

function mapList(list: ApiTodoListDetail): TodoList {
  return {
    id: list.id,
    title: list.name,
    description: list.external_id ? `External: ${list.external_id}` : 'Lista local',
    items: list.items.map(mapItem),
    externalId: list.external_id,
    updatedAt: list.updated_at,
  }
}

export async function getTodoLists() {
  const lists = await request<ApiTodoList[]>('/todolists')
  const details = await Promise.all(lists.map((list) => getTodoList(list.id)))

  return details
}

export async function getTodoList(id: number) {
  return mapList(await request<ApiTodoListDetail>(`/todolists/${id}`))
}

export async function createTodoList(payload: SaveTodoListPayload) {
  const list = await request<ApiTodoList>('/todolists', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return getTodoList(list.id)
}

export async function updateTodoList(id: number, payload: SaveTodoListPayload) {
  const list = await request<ApiTodoList>(`/todolists/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  return getTodoList(list.id)
}

export async function deleteTodoList(id: number) {
  await request<void>(`/todolists/${id}`, { method: 'DELETE' })
}

export async function createTodoItem(todoListId: number, payload: SaveTodoItemPayload) {
  const item = await request<ApiTodoItem>(`/todolists/${todoListId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapItem(item)
}

export async function updateTodoItem(
  todoListId: number,
  id: number,
  payload: SaveTodoItemPayload,
) {
  const item = await request<ApiTodoItem>(`/todolists/${todoListId}/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

  return mapItem(item)
}

export async function deleteTodoItem(todoListId: number, id: number) {
  await request<void>(`/todolists/${todoListId}/items/${id}`, { method: 'DELETE' })
}
