/// <reference types="vite/client" />

type FilePayload = {
  path: string
  content: string
}

interface Window {
  electronAPI: {
    openFile: () => Promise<FilePayload | null>
    openRecentFile: (filePath: string) => Promise<FilePayload>
    saveFile: (filePath: string, content: string) => Promise<string>
    saveFileAs: (content: string) => Promise<string | null>
    listRecentFiles: () => Promise<string[]>
  }
}
