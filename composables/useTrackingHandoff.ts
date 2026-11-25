export const useTrackingHandoff = () => useState<{ orderNumber: string; token: string } | null>(
  'guest-tracking-handoff', () => null,
)
