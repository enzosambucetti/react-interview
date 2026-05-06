# Repository Guidelines

## Project Structure & Module Organization

This is a Vite + React + TypeScript frontend for the Todo API in `C:\Dev\dotnet-interview`.

- `src/main.tsx`: React entry point.
- `src/App.tsx`: layout shell, composes Sidebar + Workspace + Inspector inside TodoProvider.
- `src/api.ts`: REST client, DTO mapping, and API error handling.
- `src/types.ts`: frontend models and backend contract types.
- `src/realtime.ts`: SignalR connection factory with initial-start retry loop.
- `src/viewTransitions.ts`: View Transitions API helper with reduced-motion fallback.
- `src/state/TodoStore.tsx`: useReducer-based state provider (TodoProvider) and all CRUD actions.
- `src/state/TodoContext.ts`: context definition and `useTodoStore` hook.
- `src/components/Sidebar.tsx`: list navigation and creation form.
- `src/components/Workspace.tsx`: selected list header, item list, inline editing, item detail overlay.
- `src/components/Inspector.tsx`: global and per-list summary statistics.
- `src/App.css`: minimal app styling (~600 lines, no framework).
- `vite.config.ts`: Vite config and local API proxy (`/api` + `/hubs`).
- `NOTES.md`: architecture and design decision log.

## Build, Test, and Development Commands

- `npm install`: install frontend dependencies.
- `npm run dev`: start Vite, preferably open it at `http://localhost:5173` because the backend realtime CORS configuration allows that origin.
- `npm run build`: run TypeScript checks and production build.
- `npm run lint`: run ESLint.
- `npm run preview`: preview the production build.

On Windows PowerShell, use `npm.cmd`, for example `npm.cmd run dev`.

Backend commands, from `C:\Dev\dotnet-interview`:

- `dotnet run --project TodoApi\TodoApi.csproj --launch-profile TodoApi`: start TodoApi.
- `dotnet run --project ExternalApi\ExternalApi.csproj --launch-profile http`: start the fake ExternalApi used by inbound/outbound sync.
- `dotnet test`: run backend tests.

## Running With Dev Containers

The frontend is fully functional using a VS Code dev container alongside the backend dev container.

Prerequisites: Docker Desktop running, and the backend dev container already started from `dotnet-interview`.

Steps:

1. Start the backend dev container first and run both `TodoApi` and `ExternalApi` inside it.
2. Open `react-interview-enzosambucetti` in a separate VS Code window.
3. Accept **"Reopen in Container"** or run `Dev Containers: Reopen in Container` from the command palette.
4. Wait for `postCreateCommand` to finish (`npm install`).
5. Run the frontend dev server:

```bash
npm run dev
```

6. Open `http://localhost:5173` from the host browser.

How the frontend reaches the backend:

- `.devcontainer/devcontainer.json` sets `VITE_API_TARGET=http://host.docker.internal:5083`.
- `vite.config.ts` proxies `/api` and `/hubs` to that target.
- The `/hubs` proxy has WebSocket support for SignalR.
- Outside dev containers, `VITE_API_TARGET` is unset and the proxy falls back to `http://localhost:5083`.

Expected local topology:

```text
Backend dev container -> TodoApi :5083, ExternalApi :5090, SQL Server :1433
Frontend dev container -> Vite :5173
Frontend proxy -> host.docker.internal:5083 -> TodoApi
Browser -> http://localhost:5173
```

## API URLs & Protocols

Frontend calls use `VITE_API_BASE_URL` when set; otherwise they use `/api`. In development, Vite proxies `/api` to:

```text
http://localhost:5083
```

Operational backend URLs:

- TodoApi base URL: `http://localhost:5083`
- Swagger: `http://localhost:5083/swagger`
- Hangfire dashboard: `http://localhost:5083/hangfire`
- Realtime hub present in backend: `/hubs/todo-updates`

The frontend uses HTTP REST with JSON and SignalR for realtime refreshes. In development, Vite proxies both REST and hubs:

- `/api` -> `http://localhost:5083/api`
- `/hubs` -> `http://localhost:5083/hubs` with WebSocket support

Connect the frontend SignalR client to `/hubs/todo-updates` unless `VITE_SIGNALR_URL` is explicitly configured.

## REST Contracts

TodoLists:

- `GET /api/todolists`: list non-deleted lists.
- `GET /api/todolists/{id}`: get one list with `items`.
- `POST /api/todolists`: create list.
- `PUT /api/todolists/{id}`: update list.
- `DELETE /api/todolists/{id}`: soft-delete list; returns `204`.

List create/update body:

```json
{ "name": "New list" }
```

Optional sync metadata may include `source_id`, `created_at`, and `updated_at`.

Items:

- `GET /api/todolists/{todoListId}/items`
- `GET /api/todolists/{todoListId}/items/{id}`
- `POST /api/todolists/{todoListId}/items`
- `PUT /api/todolists/{todoListId}/items/{id}`
- `DELETE /api/todolists/{todoListId}/items/{id}`; returns `204`.

Item create/update body for the current .NET backend:

```json
{ "name": "Task", "isCompleted": false }
```

The user-facing contract may mention `is_completed` and `todo_list_id`, but the current backend models serialize items as `isCompleted` and `todoListId`. The frontend mapper accepts both read formats and sends `isCompleted`.

## API Error Handling

Not found responses are `application/problem+json` with fields such as `title`, `detail`, `status`, `traceId`, and `errorCode`. Known codes:

- `todo_list_not_found`
- `todo_item_not_found`

Surface `detail` to users when available. Do not assume deleted records are returned; deletes are soft-delete internally but normal endpoints omit deleted data.

## Sync Notes

Creating, updating, or deleting local data can enqueue outbound sync in Hangfire. Inbound changes from `ExternalApi` may appear later after polling.

`TodoApi` polls inbound changes through Hangfire every minute and publishes SignalR events to `/hubs/todo-updates`. Subscribe to the client event `todoUpdated`. Payload fields include `eventType`, `entityType`, `entityId`, `todoListId`, `source`, `occurredAt`, `payload`, and `correlation_id`.

SignalR connection startup uses `connection.start()` from `@microsoft/signalr`. `withAutomaticReconnect()` only handles reconnects after a connection was established, so the frontend also implements an initial-start retry loop with backoff for cases where TodoApi is not running when Vite starts.

When a record is created or updated directly in `ExternalApi`, the frontend does not see it immediately from that POST. The flow is:

1. Hangfire inbound polling runs in `TodoApi`.
2. `TodoApi` imports/updates local SQL data from `ExternalApi`.
3. `TodoApi` publishes `todoUpdated` through SignalR.
4. The frontend receives the event and refreshes data from REST.

If local TodoApi application data is cleared while `ExternalApi` still has records, the next inbound polling run can reimport those external records after the local schema exists. If the local database itself was dropped, run EF migrations first.

Known `eventType` values:

- `TodoListCreated`
- `TodoListUpdated`
- `TodoListDeleted`
- `ItemCreated`
- `ItemUpdated`
- `ItemDeleted`
- `InboundSyncCompleted`

Known `source` values are `LocalApi` and `InboundSync`. The frontend currently debounces realtime events and refreshes list data from REST instead of applying granular payload patches. Keep the manual refresh action available as a fallback.

## Coding Style & Naming Conventions

Use TypeScript `.tsx` for components and `.ts` for shared types/API helpers. Prefer function components, hooks, PascalCase component names, and camelCase variables. Keep backend DTO shapes in `types.ts`; map them to UI models in `api.ts` instead of spreading API naming through the UI.

Run `npm run lint` before submitting changes.

## React Design Skills

For any request related to frontend design implementation in React, consult and apply these local skills before editing UI code:

- `vercel-composition-patterns`: use for component architecture, reusable component APIs, compound components, context providers, and avoiding boolean-prop-heavy designs. Apply it when a design change starts creating repeated layout logic, mode flags, or component variants.
- `vercel-react-view-transitions`: use for animated UI state changes, route-like transitions, list reorder/identity animations, enter/exit effects, and shared-element transitions. Only add motion when it communicates continuity or hierarchy; include reduced-motion behavior when transitions are implemented.

These skills are installed at:

- `C:\Users\Usuario\.codex\skills\vercel-composition-patterns\SKILL.md`
- `C:\Users\Usuario\.codex\skills\vercel-react-view-transitions\SKILL.md`

Use them alongside this repository's existing minimal, operational UI direction: restrained layout, clear hierarchy, limited color, and no unnecessary decorative chrome.

## Testing Guidelines

No frontend test framework is configured yet. If adding tests, prefer Vitest + React Testing Library and add an `npm test` script. Backend behavior can be verified with `dotnet test` in `C:\Dev\dotnet-interview`.

## Commit & Pull Request Guidelines

Follow the existing conventional-style history, for example `setup: Setup repo`, `feat: connect todo api`, or `fix: handle empty lists`.

Pull requests should include a short description, verification commands, screenshots for UI changes, and any API or contract assumptions.
