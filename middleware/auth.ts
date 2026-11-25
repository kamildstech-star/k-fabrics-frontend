import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Account data is fetched in the browser. The SSR process never receives
  // or forwards the API's session cookie, so only redirect after hydration.
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.initAuth()

  if (!auth.isAuthenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.path },
    })
  }
})
