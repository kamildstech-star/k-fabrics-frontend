import { defineStore } from 'pinia'
import { useWishlistStore } from './wishlist'

export interface UserProfile {
  id: number
  name: string
  email: string
  phone?: string | null
  role: string
  created_at?: string
}

type LoginInput = { email: string; password: string }
type RegisterInput = LoginInput & { name: string; phone?: string; password_confirmation: string }
type AuthResponse = { user: UserProfile; message: string }

function authError(error: unknown, fallback: string): string {
  const response = error as { data?: { errors?: Record<string, string[]>; message?: string }; message?: string }
  return Object.values(response.data?.errors ?? {})[0]?.[0] ?? response.data?.message ?? response.message ?? fallback
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserProfile | null>(null)
  const isLoading = ref(false)
  const initialized = ref(false)
  const isAuthenticated = computed(() => !!user.value)
  const isLoggedIn = computed(() => !!user.value)
  const userName = computed(() => user.value?.name ?? '')
  const userEmail = computed(() => user.value?.email ?? '')
  const apiFetch = useStorefrontApi()

  let initialization: Promise<void> | undefined
  let sessionVersion = 0

  async function fetchUser() {
    const version = sessionVersion
    try {
      const response = await apiFetch<{ data: UserProfile }>('/user/me')
      if (version === sessionVersion) user.value = response.data
    } catch (error: unknown) {
      if (version !== sessionVersion) return
      if ((error as { statusCode?: number })?.statusCode === 401) {
        if (user.value) useWishlistStore().resetForGuest()
        user.value = null
      } else {
        throw error
      }
    }
  }

  async function initAuth() {
    if (initialized.value || !import.meta.client) return
    initialization ??= (async () => {
      // Retire the pre-session credentials without reading/sending them.
      document.cookie = 'k_auth_token=; Max-Age=0; path=/; SameSite=Lax'
      try {
        localStorage.removeItem('k_auth_token')
        localStorage.removeItem('k_fabrics_wishlist_ids')
        localStorage.removeItem('k_fabrics_wishlist_items')
      } catch { /* Storage can be disabled by browser settings. */ }

      try {
        await fetchUser()
        initialized.value = true
      } catch {
        // Leave initialization retryable after connectivity is restored.
      }
    })().finally(() => { initialization = undefined })
    return initialization
  }

  async function startSession(endpoint: '/login' | '/register', data: LoginInput | RegisterInput) {
    const version = ++sessionVersion
    isLoading.value = true
    try {
      const response = await apiFetch<AuthResponse>(endpoint, { method: 'POST', body: data })
      if (version !== sessionVersion) throw new Error('The session changed. Please try again.')
      const previousUser = user.value
      user.value = response.user
      initialized.value = true
      const wishlist = useWishlistStore()
      if (previousUser && previousUser.id !== response.user.id) wishlist.resetForGuest()
      void wishlist.syncWithBackend()
      return { success: true, message: response.message }
    } catch (error: unknown) {
      throw new Error(authError(error, 'Unable to start your session. Please try again.'))
    } finally {
      if (version === sessionVersion) isLoading.value = false
    }
  }

  function login(data: LoginInput) {
    return startSession('/login', data)
  }

  function register(data: RegisterInput) {
    return startSession('/register', data)
  }

  async function logout() {
    const version = ++sessionVersion
    isLoading.value = false
    try {
      await apiFetch('/logout', { method: 'POST' })
    } catch (error: unknown) {
      if ((error as { statusCode?: number })?.statusCode !== 401) {
        throw new Error('Could not sign out. Check your connection and try again.')
      }
    }
    if (version !== sessionVersion) return
    user.value = null
    useWishlistStore().resetForGuest()
  }

  return {
    user, isLoading, initialized, isAuthenticated, isLoggedIn, userName, userEmail,
    apiFetch, initAuth, fetchUser, login, register, logout,
  }
})
