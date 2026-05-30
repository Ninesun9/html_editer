import { app, BrowserWindow, dialog, ipcMain, safeStorage } from 'electron'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type FilePayload = {
  path: string
  content: string
}

type AiEditScope = 'document' | 'selection'

type AiSettings = {
  baseUrl: string
  model: string
  apiKey: string
}

type StoredAiSettings = {
  baseUrl?: string
  model?: string
  apiKey?: string
  apiKeyEncrypted?: string
}

type AiSettingsInput = {
  baseUrl: string
  model: string
  apiKey?: string
}

type AiSettingsView = {
  baseUrl: string
  model: string
  hasApiKey: boolean
}

type AiEditPayload = {
  instruction: string
  scope: AiEditScope
  html: string
  selectedHtml: string | null
  conversation: AiConversationMessage[]
  settings: AiSettingsInput
}

type AiConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

type AiTestResult = {
  ok: boolean
  message: string
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

const RECENT_FILES_LIMIT = 10
const RECENT_FILES_NAME = 'recent-files.json'
const AI_SETTINGS_NAME = 'ai-settings.json'
const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_AI_MODEL = 'gpt-4o-mini'

let mainWindow: BrowserWindow | null = null

function getRecentFilesPath(): string {
  return path.join(app.getPath('userData'), RECENT_FILES_NAME)
}

function getAiSettingsPath(): string {
  return path.join(app.getPath('userData'), AI_SETTINGS_NAME)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function toAiSettingsView(settings: AiSettings): AiSettingsView {
  return {
    baseUrl: settings.baseUrl,
    model: settings.model,
    hasApiKey: settings.apiKey.length > 0
  }
}

function mergeAiSettings(input: AiSettingsInput, previous: AiSettings): AiSettings {
  const apiKey = input.apiKey?.trim()

  return {
    baseUrl: input.baseUrl.trim() || previous.baseUrl || DEFAULT_AI_BASE_URL,
    model: input.model.trim() || previous.model || DEFAULT_AI_MODEL,
    apiKey: apiKey || previous.apiKey
  }
}

function decryptStoredApiKey(value: Record<string, unknown>): string {
  const encryptedApiKey = getString(value.apiKeyEncrypted)
  if (encryptedApiKey && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(encryptedApiKey, 'base64')).trim()
    } catch {
      return ''
    }
  }

  return getString(value.apiKey).trim()
}

async function readRecentFiles(): Promise<string[]> {
  const recentFilesPath = getRecentFilesPath()
  if (!existsSync(recentFilesPath)) {
    return []
  }

  try {
    const raw = await readFile(recentFilesPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

async function writeRecentFiles(filePaths: string[]): Promise<void> {
  await writeFile(
    getRecentFilesPath(),
    JSON.stringify(filePaths.slice(0, RECENT_FILES_LIMIT), null, 2),
    'utf-8'
  )
}

async function trackRecentFile(filePath: string): Promise<void> {
  const previous = await readRecentFiles()
  const normalized = [filePath, ...previous.filter((item) => item !== filePath)]
  await writeRecentFiles(normalized)
}

async function readAiSettings(): Promise<AiSettings> {
  const settingsPath = getAiSettingsPath()
  if (!existsSync(settingsPath)) {
    return {
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL,
      apiKey: ''
    }
  }

  try {
    const raw = await readFile(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw)

    if (!isRecord(parsed)) {
      throw new Error('Invalid AI settings')
    }

    return {
      baseUrl: getString(parsed.baseUrl, DEFAULT_AI_BASE_URL).trim() || DEFAULT_AI_BASE_URL,
      model: getString(parsed.model, DEFAULT_AI_MODEL).trim() || DEFAULT_AI_MODEL,
      apiKey: decryptStoredApiKey(parsed)
    }
  } catch {
    return {
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL,
      apiKey: ''
    }
  }
}

async function writeAiSettings(settings: AiSettings): Promise<void> {
  const storedSettings: StoredAiSettings = {
    baseUrl: settings.baseUrl,
    model: settings.model
  }

  if (settings.apiKey) {
    if (safeStorage.isEncryptionAvailable()) {
      storedSettings.apiKeyEncrypted = safeStorage.encryptString(settings.apiKey).toString('base64')
    } else {
      storedSettings.apiKey = settings.apiKey
    }
  }

  await writeFile(getAiSettingsPath(), JSON.stringify(storedSettings, null, 2), 'utf-8')
}

function normalizeAiSettingsInput(value: unknown): AiSettingsInput {
  if (!isRecord(value)) {
    return {
      baseUrl: DEFAULT_AI_BASE_URL,
      model: DEFAULT_AI_MODEL
    }
  }

  return {
    baseUrl: getString(value.baseUrl, DEFAULT_AI_BASE_URL),
    model: getString(value.model, DEFAULT_AI_MODEL),
    apiKey: getString(value.apiKey)
  }
}

function normalizeAiConversation(value: unknown): AiConversationMessage[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map(
      (item): AiConversationMessage => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: getString(item.content).trim()
      })
    )
    .filter((item) => item.content.length > 0)
    .slice(-8)
}

function normalizeAiEditPayload(value: unknown): AiEditPayload {
  if (!isRecord(value)) {
    throw new Error('Invalid AI edit payload')
  }

  const scope = value.scope === 'selection' ? 'selection' : 'document'
  const selectedHtml = typeof value.selectedHtml === 'string' ? value.selectedHtml : null

  return {
    instruction: getString(value.instruction).trim(),
    scope,
    html: getString(value.html),
    selectedHtml,
    conversation: normalizeAiConversation(value.conversation),
    settings: normalizeAiSettingsInput(value.settings)
  }
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '')
  if (/\/chat\/completions$/i.test(normalizedBaseUrl)) {
    return normalizedBaseUrl
  }

  return `${normalizedBaseUrl}/chat/completions`
}

function stripMarkdownFence(value: string): string {
  const trimmed = value.trim()
  const fullFence = trimmed.match(/^```(?:html|xml)?\s*([\s\S]*?)\s*```$/i)
  if (fullFence?.[1]) {
    return fullFence[1].trim()
  }

  const firstFence = trimmed.match(/```(?:html|xml)?\s*([\s\S]*?)\s*```/i)
  return firstFence?.[1] ? firstFence[1].trim() : trimmed
}

function getChatCompletionContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? '').join('')
  }

  return ''
}

function trimStatusMessage(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 240)
}

function createAiMessages(payload: AiEditPayload): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const selectionInstruction =
    payload.scope === 'selection'
      ? 'Return only the replacement content for the selected source range. Do not return the full document.'
      : 'Return the complete updated HTML document.'

  const selectedBlock = payload.selectedHtml
    ? `Selected HTML:\n${payload.selectedHtml}`
    : 'Selected HTML: none'

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: [
        'You are HtmlFox AI, an expert HTML editing assistant.',
        'Follow the user request while preserving the original intent, local file references, and existing content unless a change is requested.',
        selectionInstruction,
        'Return raw HTML only. Do not include Markdown fences, explanations, comments about the edit, or JSON.'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        'Editing context:',
        `Edit scope: ${payload.scope}`,
        selectedBlock,
        `Current full HTML document:\n${payload.html}`
      ].join('\n\n')
    }
  ]

  messages.push(...payload.conversation)
  messages.push({
    role: 'user',
    content: `User request:\n${payload.instruction}`
  })

  return messages
}

async function testAiConnection(value: unknown): Promise<AiTestResult> {
  const previousSettings = await readAiSettings()
  const settings = mergeAiSettings(normalizeAiSettingsInput(value), previousSettings)

  if (!settings.apiKey) {
    return {
      ok: false,
      message: 'Missing API key'
    }
  }

  await writeAiSettings(settings)

  try {
    const response = await fetch(buildChatCompletionsUrl(settings.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: 'system',
            content: 'You are a connectivity test. Reply with OK only.'
          },
          {
            role: 'user',
            content: 'Reply OK if this request reached the model.'
          }
        ]
      })
    })

    const responseText = await response.text()
    if (!response.ok) {
      return {
        ok: false,
        message: `HTTP ${response.status}: ${trimStatusMessage(responseText)}`
      }
    }

    const data = JSON.parse(responseText) as ChatCompletionResponse
    const content = trimStatusMessage(getChatCompletionContent(data)) || 'OK'

    return {
      ok: true,
      message: content
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? trimStatusMessage(error.message) : 'Unknown error'
    }
  }
}

async function runAiHtmlEdit(payload: AiEditPayload): Promise<{ content: string; scope: AiEditScope }> {
  if (!payload.instruction) {
    throw new Error('AI instruction is required')
  }

  if (payload.scope === 'selection' && !payload.selectedHtml) {
    throw new Error('Selected HTML is required')
  }

  const previousSettings = await readAiSettings()
  const settings = mergeAiSettings(payload.settings, previousSettings)

  if (!settings.apiKey) {
    throw new Error('AI API key is required')
  }

  await writeAiSettings(settings)

  const response = await fetch(buildChatCompletionsUrl(settings.baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.model,
      messages: createAiMessages(payload)
    })
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`AI request failed (${response.status}): ${responseText.slice(0, 500)}`)
  }

  let data: ChatCompletionResponse
  try {
    data = JSON.parse(responseText) as ChatCompletionResponse
  } catch {
    throw new Error('AI response is not valid JSON')
  }

  const content = stripMarkdownFence(getChatCompletionContent(data))
  if (!content) {
    throw new Error('AI response did not include HTML')
  }

  return {
    content,
    scope: payload.scope
  }
}

async function readHtmlFile(filePath: string): Promise<FilePayload> {
  const content = await readFile(filePath, 'utf-8')
  await trackRecentFile(filePath)
  return { path: filePath, content }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    title: 'HtmlFox',
    width: 1500,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: '#10131a',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'HTML files', extensions: ['html', 'htm'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return readHtmlFile(result.filePaths[0])
  })

  ipcMain.handle('file:openRecent', async (_event, filePath: string) => {
    return readHtmlFile(filePath)
  })

  ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
    await writeFile(filePath, content, 'utf-8')
    await trackRecentFile(filePath)
    return filePath
  })

  ipcMain.handle('file:saveAs', async (_event, content: string) => {
    const result = await dialog.showSaveDialog({
      filters: [{ name: 'HTML files', extensions: ['html'] }],
      defaultPath: 'index.html'
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    await writeFile(result.filePath, content, 'utf-8')
    await trackRecentFile(result.filePath)
    return result.filePath
  })

  ipcMain.handle('file:listRecent', async () => {
    return readRecentFiles()
  })

  ipcMain.handle('ai:loadSettings', async () => {
    return toAiSettingsView(await readAiSettings())
  })

  ipcMain.handle('ai:saveSettings', async (_event, value: unknown) => {
    const previousSettings = await readAiSettings()
    const settings = mergeAiSettings(normalizeAiSettingsInput(value), previousSettings)
    await writeAiSettings(settings)
    return toAiSettingsView(settings)
  })

  ipcMain.handle('ai:testConnection', async (_event, value: unknown) => {
    return testAiConnection(value)
  })

  ipcMain.handle('ai:editHtml', async (_event, value: unknown) => {
    return runAiHtmlEdit(normalizeAiEditPayload(value))
  })

  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
