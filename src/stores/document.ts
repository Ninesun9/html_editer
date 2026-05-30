import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { defaultHtml } from '../services/defaultHtml'

export type DeviceMode = 'desktop' | 'mobile'

export const useDocumentStore = defineStore('document', () => {
  const filePath = ref<string | null>(null)
  const html = ref(defaultHtml)
  const dirty = ref(false)
  const recentFiles = ref<string[]>([])
  const deviceMode = ref<DeviceMode>('desktop')
  const statusMessage = ref('Ready')
  const errorMessage = ref<string | null>(null)

  const fileName = computed(() => {
    if (!filePath.value) {
      return 'Untitled.html'
    }

    const parts = filePath.value.split(/[/\\]/)
    return parts[parts.length - 1] || 'Untitled.html'
  })

  function setDocument(payload: { filePath: string | null; html: string }): void {
    filePath.value = payload.filePath
    html.value = payload.html
    dirty.value = false
    errorMessage.value = null
  }

  function updateHtml(nextHtml: string): void {
    html.value = nextHtml
    dirty.value = true
  }

  function markSaved(nextPath?: string | null): void {
    if (typeof nextPath !== 'undefined') {
      filePath.value = nextPath
    }
    dirty.value = false
  }

  function setRecentFiles(files: string[]): void {
    recentFiles.value = files
  }

  function setDeviceMode(mode: DeviceMode): void {
    deviceMode.value = mode
  }

  function setStatus(message: string): void {
    statusMessage.value = message
  }

  function setError(message: string | null): void {
    errorMessage.value = message
  }

  return {
    filePath,
    fileName,
    html,
    dirty,
    recentFiles,
    deviceMode,
    statusMessage,
    errorMessage,
    setDocument,
    updateHtml,
    markSaved,
    setRecentFiles,
    setDeviceMode,
    setStatus,
    setError
  }
})
