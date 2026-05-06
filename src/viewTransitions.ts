import { startTransition } from 'react'
import { flushSync } from 'react-dom'

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { finished: Promise<void> }
}

export function runViewTransition(update: () => void) {
  const transitionDocument = document as ViewTransitionDocument
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!transitionDocument.startViewTransition || prefersReducedMotion) {
    startTransition(update)
    return
  }

  transitionDocument.startViewTransition(() => {
    startTransition(() => {
      flushSync(update)
    })
  })
}

export function taskIconTransitionName(itemId: number) {
  return `task-icon-${itemId}`
}

export function taskRowTransitionName(itemId: number) {
  return `task-row-${itemId}`
}
