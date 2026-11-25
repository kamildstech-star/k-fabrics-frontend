type StorefrontMethod = 'GET' | 'HEAD' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
type StorefrontOptions = {
  method?: StorefrontMethod
  headers?: HeadersInit
  body?: BodyInit | Record<string, unknown> | null
  query?: Record<string, unknown>
  signal?: AbortSignal
  timeout?: number
  retry?: 0 | false
}

function readXsrfCookie(): string | null {
  const value = document.cookie.split('; ').find(cookie => cookie.startsWith('XSRF-TOKEN='))
  if (!value) return null
  try {
    return decodeURIComponent(value.slice('XSRF-TOKEN='.length))
  } catch {
    return null
  }
}

export function useStorefrontApi() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase.replace(/\/+$/, '')
  const csrfEndpoint = base.replace(/\/api\/v1$/, '') + '/sanctum/csrf-cookie'
  let csrfRefresh: Promise<unknown> | undefined

  function refreshCsrf() {
    csrfRefresh ??= $fetch(csrfEndpoint, {
      credentials: 'include',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      retry: 0,
    }).finally(() => { csrfRefresh = undefined })
    return csrfRefresh
  }

  return async function apiFetch<T>(path: string, options: StorefrontOptions = {}): Promise<T> {
    if (!/^\/(?!\/)[^\\]*$/.test(path)) throw new Error('Expected a relative storefront API path.')

    const method = String(options.method ?? 'GET').toUpperCase()
    const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(method)
    if (requiresCsrf && !import.meta.client) {
      throw new Error('Storefront API mutations must originate in the browser.')
    }

    async function fetchWithHeaders() {
      const headers = new Headers(options.headers)
      headers.set('Accept', 'application/json')
      headers.delete('Authorization')

      if (requiresCsrf) {
        let token = readXsrfCookie()
        if (!token) {
          await refreshCsrf()
          token = readXsrfCookie()
        }
        if (!token) {
          throw new Error('Unable to start a secure session. Check that cookies are enabled and try again.')
        }
        headers.set('X-XSRF-TOKEN', token)
      }

      return $fetch<T>(base + path, {
        ...options,
        headers,
        credentials: 'include',
        redirect: 'error',
        retry: 0,
      })
    }

    try {
      return await fetchWithHeaders()
    } catch (error: unknown) {
      // A 419 means middleware prevented the mutation. Refresh an expired
      // session once; do not automatically retry server or network errors.
      if (!requiresCsrf || (error as { statusCode?: number })?.statusCode !== 419) throw error
      await refreshCsrf()
      return fetchWithHeaders()
    }
  }
}
