<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()
const router = useRouter()

useSeoMeta({ title: 'Sign in | K. Fabrics', robots: 'noindex, nofollow' })

const form = reactive({
  email: '',
  password: '',
})

const errorMsg = ref('')
const isSubmitting = ref(false)

const handleLogin = async () => {
  if (!form.email || !form.password) {
    errorMsg.value = 'Please provide both your email and password.'
    return
  }

  errorMsg.value = ''
  isSubmitting.value = true

  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
    })

    await router.push('/account')
  } catch (err: any) {
    errorMsg.value = err.message || 'Login failed. Please check your credentials.'
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
          Atelier Member Portal
        </span>
        <h1 class="font-serif text-3xl font-bold text-brand-charcoal">
          Sign In
        </h1>
        <p class="text-xs text-brand-muted mt-2 font-light">
          Access your saved measurements, track order progress, and reorder bespoke pieces.
        </p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" role="alert" class="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
        {{ errorMsg }}
      </div>

      <!-- Login Form -->
      <form class="space-y-5" @submit.prevent="handleLogin">
        <div>
          <label for="login-email" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1.5">
            Email Address *
          </label>
          <input
            id="login-email"
            v-model="form.email"
            autocomplete="username"
            type="email"
            required
            placeholder="e.g. ayesha@example.com"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label for="login-password" class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block">
              Password *
            </label>
            <NuxtLink to="/forgot-password" class="text-sm font-semibold underline">Forgot password?</NuxtLink>
          </div>
          <input
            id="login-password"
            v-model="form.password"
            autocomplete="current-password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
          >
        </div>

        <button
          type="submit"
          :disabled="isSubmitting"
          class="w-full py-4 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200 disabled:opacity-50 shadow-md"
        >
          <span v-if="isSubmitting">Authenticating...</span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <!-- Registration Link -->
      <div class="mt-8 pt-6 border-t border-brand-border space-y-4 text-center text-xs">
        <p class="text-brand-muted">
          New to K. Fabrics?
          <NuxtLink
            to="/register"
            class="text-brand-charcoal font-semibold hover:text-brand-gold ml-1 underline underline-offset-4"
          >
            Create an Account
          </NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>
