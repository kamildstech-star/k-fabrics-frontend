<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
  password_confirmation: '',
})

const errorMsg = ref('')
const isSubmitting = ref(false)

const handleRegister = async () => {
  if (!form.name || !form.email || !form.password) {
    errorMsg.value = 'Please fill in all required fields.'
    return
  }

  if (form.password !== form.password_confirmation) {
    errorMsg.value = 'Passwords do not match.'
    return
  }

  errorMsg.value = ''
  isSubmitting.value = true

  try {
    await auth.register({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })

    router.push('/account')
  } catch (err: any) {
    errorMsg.value = err.message || 'Registration failed. Please check your information.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="bg-brand-white min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full border border-brand-border bg-brand-cream/40 p-8 sm:p-10 shadow-sm">
      <!-- Header -->
      <div class="text-center mb-8">
        <span class="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-semibold block mb-1">
          {{ $tr("Join the Atelier") }}
        </span>
        <h1 class="font-serif text-3xl font-bold text-brand-charcoal">
          {{ $tr("Create Account") }}
        </h1>
        <p class="text-xs text-brand-muted mt-2 font-light">
          {{ $tr("Enjoy faster checkout, saved body measurement profiles, and order status notifications.") }}
        </p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" role="alert" class="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
        {{ $tr(errorMsg) }}
      </div>

      <!-- Register Form -->
      <form class="space-y-4" @submit.prevent="handleRegister">
        <div>
          <label for="signup-name" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1">
            {{ $tr("Full Name *") }}
          </label>
          <input
            id="signup-name"
            v-model="form.name"
            autocomplete="name"
            type="text"
            required
            :placeholder="$tr('e.g. Mahnoor Tariq')"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <div>
          <label for="signup-email" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1">
            {{ $tr("Email Address *") }}
          </label>
          <input dir="ltr"
            id="signup-email"
            v-model="form.email"
            autocomplete="email"
            type="email"
            required
            placeholder="e.g. mahnoor@example.com"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <div>
          <label for="signup-phone" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1">
            {{ $tr("Phone Number (WhatsApp)") }}
          </label>
          <input dir="ltr"
            id="signup-phone"
            v-model="form.phone"
            autocomplete="tel"
            type="tel"
            placeholder="e.g. 0300 1234567"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <div>
          <label for="signup-password" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1">
            {{ $tr("Password *") }}
          </label>
          <input dir="ltr"
            id="signup-password"
            v-model="form.password"
            autocomplete="new-password"
            type="password"
            required
            minlength="12"
            maxlength="72"
            :placeholder="$tr('Minimum 12 characters')"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <div>
          <label for="signup-password_confirmation" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1">
            {{ $tr("Confirm Password *") }}
          </label>
          <input dir="ltr"
            id="signup-password_confirmation"
            v-model="form.password_confirmation"
            autocomplete="new-password"
            type="password"
            required
            :placeholder="$tr('Re-type password')"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full py-4 mt-2 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200 disabled:opacity-50 shadow-md"
        >
          <span v-if="isSubmitting">{{ $tr("Creating Account...") }}</span>
          <span v-else>{{ $tr("Register Profile") }}</span>
        </button>
      </form>

      <!-- Login Link -->
      <div class="mt-8 pt-6 border-t border-brand-border text-center text-xs text-brand-muted">
        {{ $tr("Already have an account?") }}
        <NuxtLink
          to="/login"
          class="text-brand-charcoal font-semibold hover:text-brand-gold ms-1 underline underline-offset-4"
        >
          {{ $tr("Sign In") }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
