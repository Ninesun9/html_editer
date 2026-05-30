import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type FilePayload = {
  path: string
  content: string
}

const RECENT_FILES_LIMIT = 10
const RECENT_FILES_NAME = 'recent-files.json'

let mainWindow: BrowserWindow | null = null

function getRecentFilesPath(): string {
  return path.join(app.getPath('userData'), RECENT_FILES_NAME)
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

async function readHtmlFile(filePath: string): Promise<FilePayload> {
  const content = await readFile(filePath, 'utf-8')
  await trackRecentFile(filePath)
  return { path: filePath, content }
}

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
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
