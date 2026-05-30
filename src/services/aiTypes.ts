export type AiEditScope = 'document' | 'selection'

export type AiConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiSourceSelection = {
  startOffset: number
  endOffset: number
  text: string
}

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
  conversation: AiConversationMessage[]
  settings: AiSettingsInput
}

export type AiEditResult = {
  content: string
  scope: AiEditScope
}

export type AiTestResult = {
  ok: boolean
  message: string
}
