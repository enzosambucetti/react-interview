import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import {
  ApiError,
  createTodoItem,
  createTodoList,
  deleteTodoItem,
  deleteTodoList,
  getTodoLists,
  updateTodoItem,
  updateTodoList,
} from '../api'
import type { TodoItem, TodoList } from '../types'
import {
  createTodoUpdatesConnection,
  type TodoRealtimeEvent,
  type TodoRealtimeStatus,
} from '../realtime'
import { runViewTransition } from '../viewTransitions'
import { TodoContext } from './TodoContext'

type TodoState = {
  lists: TodoList[]
  selectedListId: number | null
  selectedItemId: number | null
  newListTitle: string
  newItemTitle: string
  editingListId: number | null
  editingItemId: number | null
  draftTitle: string
  isLoading: boolean
  isSaving: boolean
  errorMessage: string | null
  realtimeStatus: TodoRealtimeStatus
  lastRealtimeEvent: TodoRealtimeEvent | null
}

type TodoAction =
  | { type: 'load-start' }
  | { type: 'load-success'; lists: TodoList[] }
  | { type: 'request-failed'; message: string }
  | { type: 'realtime-event'; event: TodoRealtimeEvent }
  | { type: 'realtime-status'; status: TodoRealtimeStatus }
  | { type: 'save-start' }
  | { type: 'save-end' }
  | { type: 'set-new-list-title'; value: string }
  | { type: 'set-new-item-title'; value: string }
  | { type: 'set-draft-title'; value: string }
  | { type: 'select-list'; id: number }
  | { type: 'select-item'; id: number | null }
  | { type: 'list-created'; list: TodoList }
  | { type: 'list-deleted'; id: number }
  | { type: 'list-edit-start'; list: TodoList }
  | { type: 'list-updated'; list: TodoList }
  | { type: 'item-created'; listId: number; item: TodoItem }
  | { type: 'item-edit-start'; item: TodoItem }
  | { type: 'item-updated'; listId: number; item: TodoItem }
  | { type: 'item-deleted'; listId: number; id: number }

type TodoActions = {
  addItem: (event: FormEvent<HTMLFormElement>) => void
  addList: (event: FormEvent<HTMLFormElement>) => void
  deleteItem: (id: number) => void
  deleteList: (id: number) => void
  refresh: () => void
  saveItemTitle: (item: TodoItem) => void
  saveListTitle: (id: number) => void
  selectItemDetail: (id: number | null) => void
  selectList: (id: number) => void
  setDraftTitle: (value: string) => void
  setNewItemTitle: (value: string) => void
  setNewListTitle: (value: string) => void
  startItemEdit: (item: TodoItem) => void
  startListEdit: (list: TodoList) => void
  toggleItem: (item: TodoItem) => void
}

export type TodoContextValue = {
  actions: TodoActions
  selectedItem?: TodoItem
  selectedList?: TodoList
  state: TodoState
  totals: {
    completedCount: number
    itemCount: number
    pendingCount: number
  }
}

const initialState: TodoState = {
  lists: [],
  selectedListId: null,
  selectedItemId: null,
  newListTitle: '',
  newItemTitle: '',
  editingListId: null,
  editingItemId: null,
  draftTitle: '',
  isLoading: true,
  isSaving: false,
  errorMessage: null,
  realtimeStatus: 'disconnected',
  lastRealtimeEvent: null,
}

export function TodoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, initialState)
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedList = state.lists.find((list) => list.id === state.selectedListId) ?? state.lists[0]
  const selectedItem = selectedList?.items.find((item) => item.id === state.selectedItemId)

  const totals = useMemo(() => {
    const itemCount = state.lists.reduce((count, list) => count + list.items.length, 0)
    const completedCount = state.lists.reduce(
      (count, list) => count + list.items.filter((item) => item.completed).length,
      0,
    )

    return { itemCount, completedCount, pendingCount: itemCount - completedCount }
  }, [state.lists])

  const refresh = useCallback(async () => {
    dispatch({ type: 'load-start' })

    try {
      const lists = await getTodoLists()
      dispatch({ type: 'load-success', lists })
    } catch (error) {
      dispatch({ type: 'request-failed', message: getErrorMessage(error) })
    }
  }, [])

  const refreshFromRealtime = useCallback(async () => {
    try {
      const lists = await getTodoLists()
      runViewTransition(() => {
        dispatch({ type: 'load-success', lists })
      })
    } catch (error) {
      dispatch({ type: 'request-failed', message: getErrorMessage(error) })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const connection = createTodoUpdatesConnection({
      onStatusChange: (status) => dispatch({ type: 'realtime-status', status }),
      onTodoUpdated: (event) => {
        dispatch({ type: 'realtime-event', event })

        if (realtimeRefreshTimeout.current) {
          clearTimeout(realtimeRefreshTimeout.current)
        }

        realtimeRefreshTimeout.current = setTimeout(() => {
          realtimeRefreshTimeout.current = null
          void refreshFromRealtime()
        }, 250)
      },
    })

    void connection.start().catch(() => {
      dispatch({ type: 'realtime-status', status: 'disconnected' })
    })

    return () => {
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current)
      }

      void connection.stop()
    }
  }, [refreshFromRealtime])

  const saveChanges = useCallback(async (action: () => Promise<void>) => {
    dispatch({ type: 'save-start' })

    try {
      await action()
    } catch (error) {
      dispatch({ type: 'request-failed', message: getErrorMessage(error) })
    } finally {
      dispatch({ type: 'save-end' })
    }
  }, [])

  const setNewListTitle = useCallback((value: string) => {
    dispatch({ type: 'set-new-list-title', value })
  }, [])

  const setNewItemTitle = useCallback((value: string) => {
    dispatch({ type: 'set-new-item-title', value })
  }, [])

  const setDraftTitle = useCallback((value: string) => {
    dispatch({ type: 'set-draft-title', value })
  }, [])

  const selectList = useCallback((id: number) => {
    dispatch({ type: 'select-list', id })
  }, [])

  const selectItemDetail = useCallback((id: number | null) => {
    runViewTransition(() => {
      dispatch({ type: 'select-item', id })
    })
  }, [])

  const addList = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const name = state.newListTitle.trim()
      if (!name || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        const list = await createTodoList({ name })
        runViewTransition(() => {
          dispatch({ type: 'list-created', list })
        })
      })
    },
    [saveChanges, state.isSaving, state.newListTitle],
  )

  const deleteList = useCallback(
    (id: number) => {
      if (state.isSaving) {
        return
      }

      void saveChanges(async () => {
        await deleteTodoList(id)
        runViewTransition(() => {
          dispatch({ type: 'list-deleted', id })
        })
      })
    },
    [saveChanges, state.isSaving],
  )

  const startListEdit = useCallback((list: TodoList) => {
    dispatch({ type: 'list-edit-start', list })
  }, [])

  const saveListTitle = useCallback(
    (id: number) => {
      const name = state.draftTitle.trim()
      if (!name || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        const list = await updateTodoList(id, { name })
        runViewTransition(() => {
          dispatch({ type: 'list-updated', list })
        })
      })
    },
    [saveChanges, state.draftTitle, state.isSaving],
  )

  const addItem = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()

      const name = state.newItemTitle.trim()
      if (!name || !selectedList || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        const item = await createTodoItem(selectedList.id, { name, isCompleted: false })
        runViewTransition(() => {
          dispatch({ type: 'item-created', listId: selectedList.id, item })
        })
      })
    },
    [saveChanges, selectedList, state.isSaving, state.newItemTitle],
  )

  const toggleItem = useCallback(
    (item: TodoItem) => {
      if (!selectedList || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        const updatedItem = await updateTodoItem(selectedList.id, item.id, {
          name: item.title,
          isCompleted: !item.completed,
        })

        runViewTransition(() => {
          dispatch({ type: 'item-updated', listId: selectedList.id, item: updatedItem })
        })
      })
    },
    [saveChanges, selectedList, state.isSaving],
  )

  const startItemEdit = useCallback((item: TodoItem) => {
    dispatch({ type: 'item-edit-start', item })
  }, [])

  const saveItemTitle = useCallback(
    (item: TodoItem) => {
      const name = state.draftTitle.trim()
      if (!name || !selectedList || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        const updatedItem = await updateTodoItem(selectedList.id, item.id, {
          name,
          isCompleted: item.completed,
        })

        runViewTransition(() => {
          dispatch({ type: 'item-updated', listId: selectedList.id, item: updatedItem })
        })
      })
    },
    [saveChanges, selectedList, state.draftTitle, state.isSaving],
  )

  const deleteItem = useCallback(
    (id: number) => {
      if (!selectedList || state.isSaving) {
        return
      }

      void saveChanges(async () => {
        await deleteTodoItem(selectedList.id, id)
        runViewTransition(() => {
          dispatch({ type: 'item-deleted', listId: selectedList.id, id })
        })
      })
    },
    [saveChanges, selectedList, state.isSaving],
  )

  const actions = useMemo<TodoActions>(
    () => ({
      addItem,
      addList,
      deleteItem,
      deleteList,
      refresh,
      saveItemTitle,
      saveListTitle,
      selectItemDetail,
      selectList,
      setDraftTitle,
      setNewItemTitle,
      setNewListTitle,
      startItemEdit,
      startListEdit,
      toggleItem,
    }),
    [
      addItem,
      addList,
      deleteItem,
      deleteList,
      refresh,
      saveItemTitle,
      saveListTitle,
      selectItemDetail,
      selectList,
      setDraftTitle,
      setNewItemTitle,
      setNewListTitle,
      startItemEdit,
      startListEdit,
      toggleItem,
    ],
  )

  const value = useMemo<TodoContextValue>(
    () => ({ actions, selectedItem, selectedList, state, totals }),
    [actions, selectedItem, selectedList, state, totals],
  )

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
}

function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case 'load-start':
      return { ...state, errorMessage: null, isLoading: true }
    case 'load-success':
      return {
        ...state,
        errorMessage: null,
        isLoading: false,
        lists: action.lists,
        selectedItemId: keepSelectedItem(action.lists, state.selectedItemId),
        selectedListId: keepSelectedList(action.lists, state.selectedListId),
      }
    case 'request-failed':
      return { ...state, errorMessage: action.message, isLoading: false }
    case 'realtime-event':
      return { ...state, lastRealtimeEvent: action.event }
    case 'realtime-status':
      return { ...state, realtimeStatus: action.status }
    case 'save-start':
      return { ...state, errorMessage: null, isSaving: true }
    case 'save-end':
      return { ...state, isSaving: false }
    case 'set-new-list-title':
      return { ...state, newListTitle: action.value }
    case 'set-new-item-title':
      return { ...state, newItemTitle: action.value }
    case 'set-draft-title':
      return { ...state, draftTitle: action.value }
    case 'select-list':
      return { ...state, editingItemId: null, editingListId: null, selectedItemId: null, selectedListId: action.id }
    case 'select-item':
      return { ...state, selectedItemId: action.id }
    case 'list-created':
      return {
        ...state,
        lists: upsertList(state.lists, action.list),
        newListTitle: '',
        selectedItemId: null,
        selectedListId: action.list.id,
      }
    case 'list-deleted': {
      const lists = state.lists.filter((list) => list.id !== action.id)
      return {
        ...state,
        lists,
        selectedItemId: null,
        selectedListId: state.selectedListId === action.id ? lists[0]?.id ?? null : state.selectedListId,
      }
    }
    case 'list-edit-start':
      return {
        ...state,
        draftTitle: action.list.title,
        editingItemId: null,
        editingListId: action.list.id,
      }
    case 'list-updated':
      return {
        ...state,
        draftTitle: '',
        editingListId: null,
        lists: upsertList(state.lists, action.list),
      }
    case 'item-created':
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId ? { ...list, items: [...list.items, action.item] } : list,
        ),
        newItemTitle: '',
      }
    case 'item-edit-start':
      return {
        ...state,
        draftTitle: action.item.title,
        editingItemId: action.item.id,
        editingListId: null,
      }
    case 'item-updated':
      return {
        ...state,
        draftTitle: '',
        editingItemId: null,
        lists: replaceItem(state.lists, action.listId, action.item),
      }
    case 'item-deleted':
      return {
        ...state,
        lists: state.lists.map((list) =>
          list.id === action.listId
            ? { ...list, items: list.items.filter((item) => item.id !== action.id) }
            : list,
        ),
        selectedItemId: state.selectedItemId === action.id ? null : state.selectedItemId,
      }
    default:
      return state
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.code ? `${error.message} (${error.code})` : error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo completar la operacion.'
}

function keepSelectedList(lists: TodoList[], selectedListId: number | null) {
  if (selectedListId && lists.some((list) => list.id === selectedListId)) {
    return selectedListId
  }

  return lists[0]?.id ?? null
}

function keepSelectedItem(lists: TodoList[], selectedItemId: number | null) {
  if (!selectedItemId) {
    return null
  }

  return lists.some((list) => list.items.some((item) => item.id === selectedItemId))
    ? selectedItemId
    : null
}

function replaceItem(lists: TodoList[], listId: number, updatedItem: TodoItem) {
  return lists.map((list) =>
    list.id === listId
      ? {
          ...list,
          items: list.items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        }
      : list,
  )
}

function upsertList(lists: TodoList[], updatedList: TodoList) {
  const exists = lists.some((list) => list.id === updatedList.id)

  if (!exists) {
    return [...lists, updatedList]
  }

  return lists.map((list) => (list.id === updatedList.id ? updatedList : list))
}
