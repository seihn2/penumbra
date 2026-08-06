import { useEffect } from 'react'

/** Whether focus should be returned to `target` when a modal closes: only when
   there is a target and it's still attached to the document (a detached node
   can't meaningfully receive focus). Pure so it's unit-testable without a DOM.
   `contains` is injected (document.contains in the hook) to keep it pure. */
export function shouldRestoreFocus(
  target: Element | null,
  contains: (node: Element) => boolean
): boolean {
  return target !== null && contains(target)
}

/** Keyboard behavior for custom modal overlays (WCAG 2.1.2 + 2.4.3).

   The app's custom overlays (not the shadcn Dialog, which already handles this)
   are plain `fixed inset-0` divs. Without help, a keyboard / screen-reader user
   (a) can't dismiss them except by finding the close button, and (b) is stranded
   on `<body>` after they close because focus is never returned. This hook:

   - closes on Escape (capture-phase, so it beats other Escape handlers), and
   - on unmount, restores focus to whatever element was focused when the modal
     opened (the trigger), so keyboard navigation resumes where it left off.

   Call it unconditionally at the top of a modal component — it's only mounted
   while the modal is open, so its lifetime matches the modal's. */
export function useModalDismiss(onClose: () => void): void {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      // Return focus to the trigger if it's still in the document and focusable.
      if (shouldRestoreFocus(previouslyFocused, (n) => document.contains(n))) {
        previouslyFocused?.focus()
      }
    }
  }, [onClose])
}
