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

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserProfile | null,
    token: null as string | null,
    isLoading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.token && state.user),
    userName: (state): string => state.user?.name || '',
    userEmail: (state): string => state.user?.email || '',
  },

  actions: {
    async initAuth() {
      if (this.initialized) return

      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
      const tokenCookie = useCookie<string | null>('k_auth_token', {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      })

      let storedToken = tokenCookie.value
      if (!storedToken && import.meta.client) {
        storedToken = localStorage.getItem('k_auth_token')
      }

      if (storedToken) {
        this.token = storedToken
        tokenCookie.value = storedToken
        if (import.meta.client) {
          localStorage.setItem('k_auth_token', storedToken)
        }

        try {
          this.isLoading = true
          const userRes = await $fetch<any>(`${apiBase}/user`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              Accept: 'application/json',
            },
          })
          this.user = userRes.data || userRes
        } catch (e: any) {
          // Token is invalid or expired
          this.token = null
          this.user = null
          tokenCookie.value = null
          if (import.meta.client) {
            localStorage.removeItem('k_auth_token')
          }
        } finally {
          this.isLoading = false
        }
      }

      this.initialized = true
    },

    async login(credentials: { email: string; password: string }) {
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
      const tokenCookie = useCookie<string | null>('k_auth_token', {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      this.isLoading = true
      try {
        const response = await $fetch<any>(`${apiBase}/login`, {
          method: 'POST',
          body: credentials,
          headers: {
            Accept: 'application/json',
          },
        })

        this.token = response.token
        this.user = response.user?.data || response.user

        tokenCookie.value = response.token
        if (import.meta.client) {
          localStorage.setItem('k_auth_token', response.token)
        }

        // Sync wishlist
        const wishlist = useWishlistStore()
        wishlist.syncWithBackend()

        return { success: true, message: response.message }
      } catch (err: any) {
        const message = err.data?.message || err.data?.errors?.email?.[0] || 'Invalid credentials.'
        throw new Error(message)
      } finally {
        this.isLoading = false
      }
    },

    async register(data: {
      name: string
      email: string
      phone?: string
      password: string
      password_confirmation: string
    }) {
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
      const tokenCookie = useCookie<string | null>('k_auth_token', {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: 'lax',
      })

      this.isLoading = true
      try {
        const response = await $fetch<any>(`${apiBase}/register`, {
          method: 'POST',
          body: data,
          headers: {
            Accept: 'application/json',
          },
        })

        this.token = response.token
        this.user = response.user?.data || response.user

        tokenCookie.value = response.token
        if (import.meta.client) {
          localStorage.setItem('k_auth_token', response.token)
        }

        // Sync wishlist
        const wishlist = useWishlistStore()
        wishlist.syncWithBackend()

        return { success: true, message: response.message }
      } catch (err: any) {
        const firstErrorKey = err.data?.errors ? Object.keys(err.data.errors)[0] : null
        const message = firstErrorKey
          ? err.data.errors[firstErrorKey][0]
          : err.data?.message || 'Registration failed.'
        throw new Error(message)
      } finally {
        this.isLoading = false
      }
    },

    async logout() {
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
      const tokenCookie = useCookie<string | null>('k_auth_token')

      if (this.token) {
        try {
          await $fetch<any>(`${apiBase}/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/json',
            },
          })
        } catch (e) {
          // ignore error on logout
        }
      }

      this.token = null
      this.user = null
      tokenCookie.value = null
      if (import.meta.client) {
        localStorage.removeItem('k_auth_token')
      }
    },

    async fetchUser() {
      if (!this.token) return
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

      try {
        const res = await $fetch<any>(`${apiBase}/user`, {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
        })
        this.user = res.data || res
      } catch (e) {
        this.logout()
      }
    },
  },
})
