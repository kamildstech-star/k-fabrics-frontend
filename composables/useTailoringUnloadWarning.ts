export function useTailoringUnloadWarning(hasUnsubmittedTailoring: () => boolean) {
  if (!import.meta.client) return

  function warn(event: BeforeUnloadEvent) {
    event.preventDefault()
    event.returnValue = ''
  }

  watch(hasUnsubmittedTailoring, (pending) => {
    if (pending) window.addEventListener('beforeunload', warn)
    else window.removeEventListener('beforeunload', warn)
  }, { immediate: true })

  onScopeDispose(() => window.removeEventListener('beforeunload', warn))
}
