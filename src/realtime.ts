import * as signalR from '@microsoft/signalr'

const TODO_UPDATES_HUB_URL = import.meta.env.VITE_SIGNALR_URL ?? '/hubs/todo-updates'
const INITIAL_RECONNECT_DELAYS_MS = [0, 2_000, 5_000, 10_000, 30_000]
export const TODO_UPDATED_EVENT = 'todoUpdated'

export type TodoRealtimeStatus = 'connecting' | 'connected' | 'disconnected'

export type TodoRealtimeEvent = {
  eventType:
    | 'TodoListCreated'
    | 'TodoListUpdated'
    | 'TodoListDeleted'
    | 'ItemCreated'
    | 'ItemUpdated'
    | 'ItemDeleted'
    | 'InboundSyncCompleted'
  entityType: 'TodoList' | 'Item' | 'Sync'
  entityId?: number | null
  todoListId?: number | null
  source: 'LocalApi' | 'InboundSync'
  occurredAt: string
  payload?: unknown
  correlation_id?: string | null
}

type TodoUpdatesConnectionOptions = {
  onStatusChange: (status: TodoRealtimeStatus) => void
  onTodoUpdated: (event: TodoRealtimeEvent) => void
}

export function createTodoUpdatesConnection({
  onStatusChange,
  onTodoUpdated,
}: TodoUpdatesConnectionOptions) {
  let shouldStop = false
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(TODO_UPDATES_HUB_URL)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build()

  connection.on(TODO_UPDATED_EVENT, onTodoUpdated)
  connection.onreconnecting(() => onStatusChange('connecting'))
  connection.onreconnected(() => onStatusChange('connected'))
  connection.onclose(() => onStatusChange('disconnected'))

  return {
    async start() {
      shouldStop = false

      for (let attempt = 0; !shouldStop; attempt += 1) {
        const delay = getInitialReconnectDelay(attempt)

        if (delay > 0) {
          await wait(delay)
        }

        if (shouldStop || connection.state !== signalR.HubConnectionState.Disconnected) {
          return
        }

        try {
          onStatusChange('connecting')
          await connection.start()
          onStatusChange('connected')
          return
        } catch {
          onStatusChange('disconnected')
        }
      }
    },
    async stop() {
      shouldStop = true
      connection.off(TODO_UPDATED_EVENT, onTodoUpdated)
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        await connection.stop()
      }
      onStatusChange('disconnected')
    },
  }
}

function getInitialReconnectDelay(attempt: number) {
  return INITIAL_RECONNECT_DELAYS_MS[Math.min(attempt, INITIAL_RECONNECT_DELAYS_MS.length - 1)]
}

function wait(delayMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}
