# Decision Notes - React Frontend

## Context

The original repository (`react-interview`) was an empty Vite + React + TypeScript scaffold with a placeholder `App.tsx`. The goal was to build a Todo List UI consuming the REST API from `TodoApi` (.NET project in `dotnet-interview`).

## Architecture Decisions

### Stack

- **Vite + React 19 + TypeScript**: kept the original scaffold without adding meta-frameworks. No SSR or routing needed, so plain Vite was enough.
- **SWC**: the `@vitejs/plugin-react-swc` plugin was already configured; kept it for fast compilation.
- **No external component library**: custom lightweight CSS (~600 lines). No Tailwind, MUI, or styling framework to keep complexity low.
- **No router**: the app is a single view with a three-panel layout (Sidebar, Workspace, Inspector). No need for routes.

### File Structure

Kept flat and straightforward:

```
src/
  components/   -> Sidebar, Workspace, Inspector (presentational components)
  state/        -> TodoStore (reducer + provider), TodoContext (context + hook)
  api.ts        -> REST client, DTO-to-model mappers, error handling
  types.ts      -> UI models and API contract types
  realtime.ts   -> SignalR connection and event types
  viewTransitions.ts -> View Transitions API helper
  App.tsx        -> main layout composition
  App.css        -> global styles
```

No separate `hooks/`, `utils/`, or `services/` folders. Each file has a clear responsibility and the project didn't grow enough to justify more nesting.

### State: useReducer + Context

Used `useReducer` with an explicit reducer (`todoReducer`) instead of multiple `useState` calls. Reasons:

- State has ~13 interrelated fields (lists, selection, inline editing, loading/saving flags, realtime status).
- Reducer actions document every possible state transition.
- A single `TodoProvider` exposes state + actions through Context, and child components receive explicit props rather than consuming context directly. This keeps presentational components testable and decoupled from the store.

No external state library (Zustand, Redux, etc.) was introduced. The state volume doesn't justify it.

### Separate API Layer with Mapping

`api.ts` encapsulates all HTTP access. API models (`ApiTodoList`, `ApiTodoItem`) are mapped to UI models (`TodoList`, `TodoItem`) at the entry point. The rest of the app works with clean camelCase names and never sees backend DTOs.

This also absorbs backend inconsistencies (e.g., `isCompleted` vs `is_completed`) in a single place.

### Error Handling with ApiError

The API returns `application/problem+json` with fields like `detail` and `errorCode`. An `ApiError` class parses this and exposes a readable message. The reducer displays it as an error banner in the UI, with no silent failures.

## UI/UX Decisions

### Three-Panel Layout

- **Sidebar**: list navigation + creation form.
- **Workspace**: selected list content, items, inline editing, add-item form.
- **Inspector**: summary statistics (global and per-list counters).

The layout collapses responsively: Inspector hides at <=1020px, and everything stacks into a single column at <=760px.

### Inline Editing

Both lists and items are edited inline where they are displayed, without modals or separate routes. A `draftTitle` + `editingListId`/`editingItemId` in state controls which entity is being edited.

### Item Detail as Overlay

Clicking an item's icon opens a centered detail panel (fixed position) with options to toggle completion or delete. It's a simple overlay, not a modal with backdrop, to keep interactions fast.

## Applied React Skills

### View Transitions API (`vercel-react-view-transitions`)

Implemented `viewTransitions.ts` as a helper using native `document.startViewTransition()`. Applied in:

- **Item detail selection**: the transition animates the task icon between the list and the detail panel using per-item `view-transition-name`.
- **Realtime state changes**: when SignalR events arrive and lists are refreshed, the dispatch is wrapped in `runViewTransition` to smooth the update.
- **CRUD operations**: create, delete, and toggle use transitions so changes aren't abrupt.

Respects `prefers-reduced-motion`: if the user has that preference, React's `startTransition` is used without visual animation. CSS also includes a `@media (prefers-reduced-motion: reduce)` rule forcing 1ms durations.

`::view-transition-group`, `::view-transition-old`, and `::view-transition-new` styles are defined in `App.css` with fast cubic-bezier curves (240ms max).

### Composition Patterns (`vercel-composition-patterns`)

- **Provider pattern**: `TodoProvider` encapsulates all state and actions; child components (`Sidebar`, `Workspace`, `Inspector`) are purely presentational with explicit props.
- **Context split**: Context is defined in `TodoContext.ts` separate from the Provider in `TodoStore.tsx`. This avoids circular re-imports and allows the `useTodoStore` hook to be imported without pulling in the implementation.
- **Explicit props over direct context**: although context exists, `TodoApp` consumes it once and passes discrete props to each child component. This keeps components reusable and predictable without depending on the context tree.

## Realtime with SignalR

Added `@microsoft/signalr` as the only new dependency. The connection:

- Uses `withAutomaticReconnect()` for reconnections after connection loss.
- Implements an initial-start retry loop with backoff (0s, 2s, 5s, 10s, 30s) for when the backend isn't ready at app load.
- Debounces realtime events (250ms) before refreshing full data via REST, instead of applying granular payload patches. This simplifies logic and guarantees consistency with the backend.

Connection status (`connected`, `connecting`, `disconnected`) is shown as a visual indicator in the status bar.

## Development Proxy

`vite.config.ts` proxies `/api` and `/hubs` to `http://localhost:5083` (TodoApi). The `/hubs` proxy has `ws: true` enabled for SignalR WebSockets. This avoids CORS issues in development without extra configuration.

## What Was Left Out (Scope Decisions)

- **No test framework added**: Vitest wasn't configured in the scaffold and the challenge scope didn't require it.
- **No routing added**: a single view covers the entire use case.
- **No styling library**: plain CSS with variables and media queries. Simple, readable, no extra build overhead.
- **No local cache or complex optimistic updates**: operations wait for the server response before updating the UI. The `isSaving` flag provides sufficient feedback.
- **No external state library**: `useReducer` + Context was enough for the project's scale.
