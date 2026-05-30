/// <reference types="vite/client" />
import type { AiEditPayload, AiEditResult, AiSettingsInput, AiSettingsView } from './services/aiTypes'

type FilePayload = {
  path: string
  content: string
}

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<FilePayload | null>
      openRecentFile: (filePath: string) => Promise<FilePayload>
      saveFile: (filePath: string, content: string) => Promise<string>
      saveFileAs: (content: string) => Promise<string | null>
      listRecentFiles: () => Promise<string[]>
      loadAiSettings: () => Promise<AiSettingsView>
      saveAiSettings: (settings: AiSettingsInput) => Promise<AiSettingsView>
      runAiEdit: (payload: AiEditPayload) => Promise<AiEditResult>
    }
  }
}

export {}
