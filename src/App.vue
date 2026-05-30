<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AiPanel from './components/AiPanel.vue'
import AppToolbar from './components/AppToolbar.vue'
import FileSidebar from './components/FileSidebar.vue'
import MonacoEditor from './components/MonacoEditor.vue'
import PreviewPane from './components/PreviewPane.vue'
import type { AiConversationMessage, AiEditScope, AiSettingsInput, AiSourceSelection } from './services/aiTypes'
import { defaultHtml } from './services/defaultHtml'
import { formatHtml } from './services/formatHtml'
import {
  isAppLanguage,
  LANGUAGE_STORAGE_KEY,
  translate,
  type AppLanguage,
  type TranslationKey
} from './services/i18n'
import { createPreviewDocument, replaceSourceText, type SourceRange } from './services/sourceMapping'
import { useDocumentStore } from './stores/document'

const store = useDocumentStore()
const previewHtml = ref('')
const selectedSourceId = ref<string | null>(null)
const language = ref<AppLanguage>(loadInitialLanguage())
const currentStatus = ref<{ key: TranslationKey; params?: Record<string, string> }>({ key: 'status.ready' })
const currentError = ref<{ key: TranslationKey; params?: Record<string, string> } | null>(null)
const aiPanelOpen = ref(false)
const aiLoading = ref(false)
const aiSourceSelection = ref<AiSourceSelection | null>(null)
const aiConversation = ref<AiConversationMessage[]>([])

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

const selectedSourceTag = computed(() => selectedSourceRange.value?.tagName ?? null)

const selectedSourceSnippet = computed(() => {
  const range = selectedSourceRange.value
  if (!range) {
    return null
  }

  const { start, end } = getFullSourceOffsets(range)
  return store.html.slice(start, end)
})

const activeSourceSelectionSnippet = computed(() => {
  const selection = aiSourceSelection.value
  if (!selection) {
    return null
  }

  const { start, end } = getSourceSelectionOffsets(selection)
  return store.html.slice(start, end)
})

const hasAiSelection = computed(() => aiSourceSelection.value !== null || selectedSourceRange.value !== null)

const aiSelectionLabel = computed(() => {
  const sourceSelection = aiSourceSelection.value
  if (sourceSelection) {
    const count = String(activeSourceSelectionSnippet.value?.length ?? sourceSelection.text.length)
    return t('ai.sourceSelectionLabel', { count })
  }

  if (selectedSourceTag.value) {
    return t('ai.previewSelectionLabel', { tag: selectedSourceTag.value })
  }

  return null
})

const copy = computed(() => ({
  aiEditorAction: t('editor.aiModifySelection'),
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

function getFullSourceOffsets(range: SourceRange): { start: number; end: number } {
  const valueLength = store.html.length
  const start = Math.max(0, Math.min(range.fullStartOffset, valueLength))
  const end = Math.max(start, Math.min(range.fullEndOffset, valueLength))
  return { start, end }
}

function getSourceSelectionOffsets(selection: AiSourceSelection): { start: number; end: number } {
  const valueLength = store.html.length
  const start = Math.max(0, Math.min(selection.startOffset, valueLength))
  const end = Math.max(start, Math.min(selection.endOffset, valueLength))
  return { start, end }
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
  aiSourceSelection.value = null
  aiConversation.value = []
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
    aiSourceSelection.value = null
    aiConversation.value = []
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
    aiSourceSelection.value = null
    aiConversation.value = []
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
    aiSourceSelection.value = null
    aiConversation.value = []
    previewHtml.value = formatted
    setStatus('status.formatted')
    setError(null)
  } catch (error) {
    setError('error.format')
  }
}

function updateHtml(nextHtml: string): void {
  store.updateHtml(nextHtml)
  if (!aiLoading.value) {
    aiSourceSelection.value = null
  }
}

function selectPreviewSource(nodeId: string): void {
  const range = previewDocument.value.mappings[nodeId]
  if (!range) {
    return
  }

  aiSourceSelection.value = null
  aiConversation.value = []
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
  aiSourceSelection.value = null
  aiConversation.value = []
  selectedSourceId.value = textId.replace(/^text-/, 'node-')
  setStatus('status.editedText', { tag: range.tagName })
  setError(null)
}

function toggleAiPanel(): void {
  aiPanelOpen.value = !aiPanelOpen.value
}

function startAiSourceEdit(selection: AiSourceSelection): void {
  aiSourceSelection.value = selection
  selectedSourceId.value = null
  aiConversation.value = []
  aiPanelOpen.value = true
  setStatus('status.aiSourceSelection')
  setError(null)
}

function handleAiSettingsSaved(): void {
  setStatus('status.aiSettingsSaved')
  setError(null)
}

function clearAiConversation(): void {
  aiConversation.value = []
}

async function runAiEdit(payload: {
  instruction: string
  scope: AiEditScope
  settings: AiSettingsInput
}): Promise<void> {
  const instruction = payload.instruction.trim()

  if (!instruction) {
    setError('error.aiEmptyInstruction')
    return
  }

  const selectedRange = selectedSourceRange.value
  const sourceSelection = aiSourceSelection.value
  const selectedHtml =
    payload.scope === 'selection'
      ? sourceSelection
        ? activeSourceSelectionSnippet.value
        : selectedSourceSnippet.value
      : null

  if (payload.scope === 'selection' && !selectedHtml) {
    setError('error.aiNoSelection')
    return
  }

  aiLoading.value = true
  const previousConversation = aiConversation.value.slice(-8)
  aiConversation.value = [...aiConversation.value, { role: 'user', content: instruction }]

  try {
    const result = await window.electronAPI.runAiEdit({
      instruction,
      scope: payload.scope,
      html: store.html,
      selectedHtml,
      conversation: previousConversation,
      settings: payload.settings
    })

    let nextHtml = result.content
    if (result.scope === 'selection' && sourceSelection) {
      const { start, end } = getSourceSelectionOffsets(sourceSelection)
      nextHtml = `${store.html.slice(0, start)}${result.content}${store.html.slice(end)}`
      aiSourceSelection.value = {
        startOffset: start,
        endOffset: start + result.content.length,
        text: result.content
      }
      setStatus('status.aiAppliedSelection')
    } else if (result.scope === 'selection' && selectedRange) {
      const { start, end } = getFullSourceOffsets(selectedRange)
      nextHtml = `${store.html.slice(0, start)}${result.content}${store.html.slice(end)}`
      aiSourceSelection.value = {
        startOffset: start,
        endOffset: start + result.content.length,
        text: result.content
      }
      setStatus('status.aiAppliedSelection')
    } else {
      aiSourceSelection.value = null
      setStatus('status.aiAppliedDocument')
    }

    store.updateHtml(nextHtml)
    previewHtml.value = nextHtml
    selectedSourceId.value = null
    aiConversation.value = [...aiConversation.value, { role: 'assistant', content: result.content }]
    setError(null)
  } catch (error) {
    aiConversation.value = [
      ...aiConversation.value,
      { role: 'assistant', content: t('error.aiRequest') }
    ]
    setError('error.aiRequest')
  } finally {
    aiLoading.value = false
  }
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
      :ai-open="aiPanelOpen"
      @create="createDocument"
      @open="openFile"
      @save="saveFile"
      @save-as="saveFileAs"
      @format="runFormat"
      @toggle-ai="toggleAiPanel"
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
          :ai-action-label="copy.aiEditorAction"
          @update:model-value="updateHtml"
          @ai-edit-selection="startAiSourceEdit"
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

    <AiPanel
      :open="aiPanelOpen"
      :language="language"
      :has-selection="hasAiSelection"
      :selection-label="aiSelectionLabel"
      :messages="aiConversation"
      :loading="aiLoading"
      @close="aiPanelOpen = false"
      @run="runAiEdit"
      @clear-conversation="clearAiConversation"
      @settings-saved="handleAiSettingsSaved"
    />
  </div>
</template>
