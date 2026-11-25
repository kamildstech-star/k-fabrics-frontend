const focusable = [
  'a[href]', 'area[href]', 'button', 'input:not([type="hidden"])',
  'select', 'textarea', 'summary', '[contenteditable="true"]', '[tabindex]',
].join(',')

/**
 * A native modal provides an inert page and an accessible top layer.
 * Explicit keyboard wrapping and focus restoration keep repeated openings predictable.
 */
export function useStorefrontDialog(
  isOpen: () => boolean,
  onRequestClose: () => void,
  fallbackSelector: string,
) {
  const dialog = shallowRef<HTMLDialogElement | null>(null)
  let opener: HTMLElement | null = null

  const listTabStops = () => dialog.value
    ? Array.from(dialog.value.querySelectorAll<HTMLElement>(focusable)).filter(element =>
        !element.matches(':disabled')
        && !element.closest('[inert]')
        && element.tabIndex >= 0
        && element.getClientRects().length > 0
        && getComputedStyle(element).visibility === 'visible',
      )
    : []

  const focusInitial = () => {
    const preferred = dialog.value?.querySelector<HTMLElement>('[data-dialog-initial-focus]')
    const target = preferred || listTabStops()[0]
    target?.focus({ preventScroll: true })
  }

  const closeDialog = (panel: HTMLDialogElement) => {
    const shouldRestore = !document.activeElement
      || document.activeElement === document.body
      || panel.contains(document.activeElement)
    panel.close()
    const returnTarget = opener?.isConnected && opener.getClientRects().length > 0
      ? opener
      : document.querySelector<HTMLElement>(fallbackSelector)
    if (shouldRestore) returnTarget?.focus({ preventScroll: true })
    opener = null
  }

  watch([isOpen, dialog], ([open, panel]) => {
    if (!import.meta.client || !panel) return
    if (open && !panel.open) {
      const active = document.activeElement
      opener = active instanceof HTMLElement && active !== document.body && !panel.contains(active)
        ? active
        : null
      panel.showModal()
      focusInitial()
    } else if (!open && panel.open) {
      closeDialog(panel)
    }
  }, { flush: 'post' })

  onBeforeUnmount(() => {
    if (import.meta.client && dialog.value?.open) closeDialog(dialog.value)
  })

  function onCancel(event: Event) {
    event.preventDefault()
    onRequestClose()
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !event.isComposing) {
      event.preventDefault()
      event.stopPropagation()
      onRequestClose()
      return
    }
    if (event.key !== 'Tab') return
    const stops = listTabStops()
    const first = stops[0]
    const last = stops.at(-1)
    if (!first || !last) {
      event.preventDefault()
      return
    }
    const active = document.activeElement
    const atBoundary = event.shiftKey ? active === first : active === last
    if (atBoundary || !stops.some(element => active === element)) {
      event.preventDefault()
      const target = event.shiftKey ? last : first
      target.focus({ preventScroll: true })
    }
  }

  return { dialog, focusInitial, onCancel, onKeydown }
}
