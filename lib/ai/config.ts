export function configuredModel(value: string | undefined) {
  if (!value?.trim() || value.length > 150) throw new Error('AI model is not configured')
  return value.trim()
}
