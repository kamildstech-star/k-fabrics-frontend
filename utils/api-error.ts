type ApiFailure = {
  status?: number
  statusCode?: number
  data?: { message?: string; errors?: Record<string, string[]> }
}

export function apiError(error: unknown, fallback: string, field?: string) {
  const failure = error as ApiFailure | undefined
  const errors = failure?.data?.errors
  if (field && errors?.[field]?.[0]) return errors[field][0]
  if (errors) {
    const first = Object.values(errors).find(errors => Boolean(errors?.[0]))
    if (first?.[0]) return first[0]
  }
  return failure?.data?.message || fallback
}

export const apiStatus = (error: unknown) => {
  const failure = error as ApiFailure | undefined
  return failure?.statusCode || failure?.status
}
