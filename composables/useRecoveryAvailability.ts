import { useAuthStore } from '~/stores/auth'

export function useRecoveryAvailability() {
  const auth = useAuthStore()
  const available = ref<boolean | null>(null)

  onMounted(async () => {
    try {
      const response = await auth.apiFetch<{ data: { email_recovery_available: boolean } }>('/recovery/options')
      available.value = response.data.email_recovery_available === true
    } catch {
      available.value = false
    }
  })

  return available
}
