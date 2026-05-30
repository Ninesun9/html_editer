export type AiEditScope = 'document' | 'selection'

export type AiSettingsView = {
  baseUrl: string
  model: string
  hasApiKey: boolean
}

export type AiSettingsInput = {
  baseUrl: string
  model: string
  apiKey?: string
}

export type AiEditPayload = {
  instruction: string
  scope: AiEditScope
  html: string
  selectedHtml: string | null
  settings: AiSettingsInput
}

export type AiEditResult = {
  content: string
  scope: AiEditScope
}

