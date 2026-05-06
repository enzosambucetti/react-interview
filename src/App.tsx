import { Inspector } from './components/Inspector'
import { Sidebar } from './components/Sidebar'
import { Workspace } from './components/Workspace'
import { useTodoStore } from './state/TodoContext'
import { TodoProvider } from './state/TodoStore'

function App() {
  return (
    <TodoProvider>
      <TodoApp />
    </TodoProvider>
  )
}

function TodoApp() {
  const { actions, selectedItem, selectedList, state, totals } = useTodoStore()
  const selectedCompleted = selectedList?.items.filter((item) => item.completed).length ?? 0
  const selectedPending = selectedList ? selectedList.items.length - selectedCompleted : 0

  return (
    <main className={state.isSaving ? 'app-shell saving' : 'app-shell'}>
      <Sidebar
        isSaving={state.isSaving}
        lists={state.lists}
        newListTitle={state.newListTitle}
        onCreateList={actions.addList}
        onNewListTitleChange={actions.setNewListTitle}
        onSelectList={actions.selectList}
        selectedListId={selectedList?.id ?? null}
      />

      <Workspace
        draftTitle={state.draftTitle}
        editingItemId={state.editingItemId}
        editingListId={state.editingListId}
        errorMessage={state.errorMessage}
        isLoading={state.isLoading}
        isSaving={state.isSaving}
        newItemTitle={state.newItemTitle}
        onAddItem={actions.addItem}
        onDeleteItem={actions.deleteItem}
        onDeleteList={actions.deleteList}
        onDraftTitleChange={actions.setDraftTitle}
        onEditItem={actions.startItemEdit}
        onEditList={actions.startListEdit}
        onNewItemTitleChange={actions.setNewItemTitle}
        onRefresh={actions.refresh}
        onSaveItemTitle={actions.saveItemTitle}
        onSaveListTitle={actions.saveListTitle}
        onSelectItemDetail={actions.selectItemDetail}
        onToggleItem={actions.toggleItem}
        realtimeStatus={state.realtimeStatus}
        selectedItem={selectedItem}
        selectedItemId={state.selectedItemId}
        selectedList={selectedList}
      />

      <Inspector
        lists={state.lists}
        selectedCompleted={selectedCompleted}
        selectedList={selectedList}
        selectedPending={selectedPending}
        totals={totals}
      />
    </main>
  )
}

export default App
