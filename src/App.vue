<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppToolbar from './components/AppToolbar.vue'
import FileSidebar from './components/FileSidebar.vue'
import MonacoEditor from './components/MonacoEditor.vue'
import PreviewPane from './components/PreviewPane.vue'
import { defaultHtml } from './services/defaultHtml'
import { formatHtml } from './services/formatHtml'
import {
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  translate,
  type AppLanguage,
  type TranslationKey
} from './services/i18n'
import { createPreviewDocument, replaceSourceText } from './services/sourceMapping'
import { useDocumentStore } from './stores/document'

const store = useDocumentStore()
const previewHtml = ref('')
const selectedSourceId = ref<string | null>(null)
const language = ref<AppLanguage>(loadInitialLanguage())
const currentStatus = ref<{ key: TranslationKey; params?: Record<string, string> }>({ key: 'status.ready' })
const currentError = ref<{ key: TranslationKey; params?: Record<string, string> } | null>(null)

let previewTimer: ReturnType<typeof setTimeout> | null = null

const baseHref = computed(() => {
  if (!store.filePath) {
    return null
  }

  const normalized = store.filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) {
    return null
  }

  const directory = normalized.slice(0, lastSlash + 1)
  return encodeURI(`file:///${directory}`)
})

const previewDocument = computed(() => createPreviewDocument(previewHtml.value, baseHref.value))

const selectedSourceRange = computed(() => {
  if (!selectedSourceId.value) {
    return null
  }

  return previewDocument.value.mappings[selectedSourceId.value] ?? null
})

const copy = computed(() => ({
  dismiss: t('common.dismiss'),
  html: t('app.html'),
  preview: t('app.preview'),
  previewDevice: t(store.deviceMode === 'desktop' ? 'device.desktop' : 'device.mobile')
}))

function loadInitialLanguage(): AppLanguage {
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return isAppLanguage(savedLanguage) ? savedLanguage : 'en'
}

function t(key: TranslationKey, params?: Record<string, string>): string {
  return translate(language.value, key, params)
}

function setStatus(key: TranslationKey, params?: Record<string, string>): void {
  currentStatus.value = { key, params }
  store.setStatus(t(key, params))
}

function setError(key: TranslationKey | null, params?: Record<string, string>): void {
  currentError.value = key ? { key, params } : null
  store.setError(key ? t(key, params) : null)
}

function switchLanguage(nextLanguage: AppLanguage): void {
  language.value = nextLanguage
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  store.setStatus(t(currentStatus.value.key, currentStatus.value.params))

  if (currentError.value) {
    store.setError(t(currentError.value.key, currentError.value.params))
  }
}

function schedulePreviewRefresh(html: string): void {
  if (previewTimer) {
    clearTimeout(previewTimer)
  }

  previewTimer = setTimeout(() => {
    previewHtml.value = html
  }, 300)
}

async function refreshRecentFiles(): Promise<void> {
  const recentFiles = await window.electronAPI.listRecentFiles()
  store.setRecentFiles(recentFiles)
}

function createDocument(): void {
  if (store.dirty && !window.confirm(t('confirm.newDocument'))) {
    return
  }

  store.setDocument({ filePath: null, html: defaultHtml })
  selectedSourceId.value = null
  previewHtml.value = defaultHtml
  setStatus('status.newDocument')
  setError(null)
}

async function openFile(): Promise<void> {
  try {
    const result = await window.electronAPI.openFile()
    if (!result) {
      return
    }

    store.setDocument({ filePath: result.path, html: result.content })
    selectedSourceId.value = null
    previewHtml.value = result.content
    setStatus('status.fileOpened')
    setError(null)
    await refreshRecentFiles()
  } catch (error) {
    setError('error.open')
  }
}

async function openRecent(filePath: string): Promise<void> {
  try {
    const result = await window.electronAPI.openRecentFile(filePath)
    store.setDocument({ filePath: result.path, html: result.content })
    selectedSourceId.value = null
    previewHtml.value = result.content
    setStatus('status.recentOpened')
    setError(null)
    await refreshRecentFiles()
  } catch (error) {
    setError('error.openRecent')
  }
}

async function saveFile(): Promise<void> {
  try {
    if (store.filePath) {
      await window.electronAPI.saveFile(store.filePath, store.html)
      store.markSaved()
      setStatus('status.fileSaved')
      setError(null)
      await refreshRecentFiles()
      return
    }

    await saveFileAs()
  } catch (error) {
    setError('error.save')
  }
}

async function saveFileAs(): Promise<void> {
  try {
    const filePath = await window.electronAPI.saveFileAs(store.html)
    if (!filePath) {
      return
    }

    store.markSaved(filePath)
    setStatus('status.fileSavedAs')
    setError(null)
    await refreshRecentFiles()
  } catch (error) {
    setError('error.save')
  }
}

async function runFormat(): Promise<void> {
  try {
    const formatted = await formatHtml(store.html)
    store.updateHtml(formatted)
    selectedSourceId.value = null
    previewHtml.value = formatted
    setStatus('status.formatted')
    setError(null)
  } catch (error) {
    setError('error.format')
  }
}

function updateHtml(nextHtml: string): void {
  store.updateHtml(nextHtml)
}

function selectPreviewSource(nodeId: string): void {
  const range = previewDocument.value.mappings[nodeId]
  if (!range) {
    return
  }

  selectedSourceId.value = nodeId
  setStatus('status.selectedPreview', { tag: range.tagName })
  setError(null)
}

function editPreviewText(textId: string, value: string): void {
  const range = previewDocument.value.textMappings[textId]
  if (!range) {
    return
  }

  const nextHtml = replaceSourceText(previewHtml.value, range, value)
  store.updateHtml(nextHtml)
  previewHtml.value = nextHtml
  selectedSourceId.value = textId.replace(/^text-/, 'node-')
  setStatus('status.editedText', { tag: range.tagName })
  setError(null)
}

watch(
  () => store.html,
  (html) => {
    schedulePreviewRefresh(html)
  }
)

onMounted(async () => {
  if (!store.html) {
    store.setDocument({ filePath: null, html: defaultHtml })
  }

  previewHtml.value = store.html
  setStatus('status.ready')
  await refreshRecentFiles()
})
</script>

<template>
  <div class="app-shell">
    <AppToolbar
      :file-name="store.fileName"
      :dirty="store.dirty"
      :device-mode="store.deviceMode"
      :language="language"
      @create="createDocument"
      @open="openFile"
      @save="saveFile"
      @save-as="saveFileAs"
      @format="runFormat"
      @switch-device="store.setDeviceMode"
      @switch-language="switchLanguage"
    />

    <div v-if="store.errorMessage" class="error-banner">
      <span>{{ store.errorMessage }}</span>
      <button class="error-banner__dismiss" @click="setError(null)">{{ copy.dismiss }}</button>
    </div>

    <main class="workspace">
      <FileSidebar
        :current-file="store.fileName"
        :recent-files="store.recentFiles"
        :language="language"
        @open-recent="openRecent"
      />

      <section class="editor-pane">
        <div class="pane-header">
          <span>{{ copy.html }}</span>
          <span class="pane-header__meta">{{ store.statusMessage }}</span>
        </div>
        <MonacoEditor
          :model-value="store.html"
          :selection-range="selectedSourceRange"
          @update:model-value="updateHtml"
        />
      </section>

      <section class="preview-column">
        <div class="pane-header">
          <span>{{ copy.preview }}</span>
          <span class="pane-header__meta">{{ copy.previewDevice }}</span>
        </div>
        <PreviewPane
          :html="previewDocument.html"
          :device-mode="store.deviceMode"
          :selected-source-id="selectedSourceId"
          @select-source="selectPreviewSource"
          @edit-text="editPreviewText"
        />
      </section>
    </main>
  </div>
</template>
