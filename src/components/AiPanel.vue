<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Bot, KeyRound, LoaderCircle, MessageSquareText, Settings2, X } from 'lucide-vue-next'
import { translate, type AppLanguage } from '../services/i18n'
import type { AiConversationMessage, AiEditScope, AiSettingsInput } from '../services/aiTypes'

const DEFAULT_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'

const props = defineProps<{
  open: boolean
  language: AppLanguage
  hasSelection: boolean
  selectionLabel: string | null
  messages: AiConversationMessage[]
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  run: [payload: { instruction: string; scope: AiEditScope; settings: AiSettingsInput }]
  clearConversation: []
  settingsSaved: []
}>()

const baseUrl = ref(DEFAULT_BASE_URL)
const model = ref(DEFAULT_MODEL)
const apiKey = ref('')
const hasSavedApiKey = ref(false)
const instruction = ref('')
const scope = ref<AiEditScope>('document')
const settingsLoading = ref(false)
const settingsSaving = ref(false)
const settingsTesting = ref(false)
const settingsMessage = ref('')
const settingsError = ref('')

const copy = computed(() => ({
  apiKey: translate(props.language, 'ai.apiKey'),
  apiKeyPlaceholder: translate(props.language, 'ai.apiKeyPlaceholder'),
  apiKeySaved: translate(props.language, 'ai.apiKeySaved'),
  apply: translate(props.language, 'ai.apply'),
  baseUrl: translate(props.language, 'ai.baseUrl'),
  clearConversation: translate(props.language, 'ai.clearConversation'),
  close: translate(props.language, 'ai.close'),
  conversation: translate(props.language, 'ai.conversation'),
  documentTarget: translate(props.language, 'ai.documentTarget'),
  documentScope: translate(props.language, 'ai.scopeDocument'),
  emptyConversation: translate(props.language, 'ai.emptyConversation'),
  instruction: translate(props.language, 'ai.instruction'),
  instructionPlaceholder: translate(props.language, 'ai.instructionPlaceholder'),
  loading: translate(props.language, 'ai.loading'),
  model: translate(props.language, 'ai.model'),
  noSelection: translate(props.language, 'ai.noSelection'),
  saveSettings: translate(props.language, 'ai.saveSettings'),
  saving: translate(props.language, 'ai.saving'),
  scope: translate(props.language, 'ai.scope'),
  selectionScope: translate(props.language, 'ai.scopeSelection'),
  settingsSaved: translate(props.language, 'ai.settingsSaved'),
  subtitle: translate(props.language, 'ai.subtitle'),
  testConnection: translate(props.language, 'ai.testConnection'),
  testingConnection: translate(props.language, 'ai.testingConnection'),
  title: translate(props.language, 'ai.title'),
  you: translate(props.language, 'ai.you')
}))

const selectedScopeLabel = computed(() => props.selectionLabel ?? copy.value.noSelection)

const targetLabel = computed(() => (scope.value === 'selection' ? selectedScopeLabel.value : copy.value.documentTarget))

const visibleMessages = computed(() =>
  props.messages.map((message) => ({
    ...message,
    content:
      message.content.length > 1600 ? `${message.content.slice(0, 1600).trimEnd()}\n...` : message.content
  }))
)

const canRun = computed(() => {
  return !props.loading && !settingsLoading.value && instruction.value.trim().length > 0
})

async function loadSettings(): Promise<void> {
  settingsLoading.value = true
  settingsMessage.value = ''
  settingsError.value = ''

  try {
    const settings = await window.electronAPI.loadAiSettings()
    baseUrl.value = settings.baseUrl || DEFAULT_BASE_URL
    model.value = settings.model || DEFAULT_MODEL
    hasSavedApiKey.value = settings.hasApiKey
  } catch {
    settingsError.value = translate(props.language, 'error.aiSettings')
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings(): Promise<void> {
  settingsSaving.value = true
  settingsMessage.value = ''
  settingsError.value = ''

  try {
    const settings = await window.electronAPI.saveAiSettings({
      baseUrl: baseUrl.value,
      model: model.value,
      apiKey: apiKey.value
    })
    baseUrl.value = settings.baseUrl
    model.value = settings.model
    hasSavedApiKey.value = settings.hasApiKey
    apiKey.value = ''
    settingsMessage.value = copy.value.settingsSaved
    emit('settingsSaved')
  } catch {
    settingsError.value = translate(props.language, 'error.aiSettings')
  } finally {
    settingsSaving.value = false
  }
}

async function testConnection(): Promise<void> {
  settingsTesting.value = true
  settingsMessage.value = ''
  settingsError.value = ''

  try {
    const result = await window.electronAPI.testAiConnection({
      baseUrl: baseUrl.value,
      model: model.value,
      apiKey: apiKey.value
    })

    if (result.ok) {
      settingsMessage.value = translate(props.language, 'ai.connectionOk', { message: result.message })
      hasSavedApiKey.value = true
      apiKey.value = ''
      return
    }

    settingsError.value = translate(props.language, 'ai.connectionFailed', { message: result.message })
  } catch {
    settingsError.value = translate(props.language, 'error.aiSettings')
  } finally {
    settingsTesting.value = false
  }
}

function runAiEdit(): void {
  if (!canRun.value) {
    return
  }

  emit('run', {
    instruction: instruction.value,
    scope: scope.value,
    settings: {
      baseUrl: baseUrl.value,
      model: model.value,
      apiKey: apiKey.value
    }
  })
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.hasSelection) {
        scope.value = 'selection'
      }
      void loadSettings()
    }
  },
  { immediate: true }
)

watch(
  () => props.hasSelection,
  (hasSelection) => {
    if (!hasSelection && scope.value === 'selection') {
      scope.value = 'document'
      return
    }

    if (hasSelection && props.open) {
      scope.value = 'selection'
    }
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="open" class="ai-panel-backdrop" @click.self="$emit('close')">
    <aside class="ai-panel" aria-label="HtmlFox AI">
      <header class="ai-panel__header">
        <div class="ai-panel__title-block">
          <span class="ai-panel__eyebrow">
            <Bot :size="16" />
            {{ copy.title }}
          </span>
          <p>{{ copy.subtitle }}</p>
        </div>
        <button class="ai-panel__icon-button" :title="copy.close" @click="$emit('close')">
          <X :size="18" />
        </button>
      </header>

      <section class="ai-panel__section">
        <div class="ai-panel__section-title">
          <Settings2 :size="15" />
          <span>{{ copy.saveSettings }}</span>
        </div>

        <label class="ai-panel__field">
          <span>{{ copy.baseUrl }}</span>
          <input v-model="baseUrl" type="text" spellcheck="false" placeholder="https://api.openai.com/v1" />
        </label>

        <label class="ai-panel__field">
          <span>{{ copy.model }}</span>
          <input v-model="model" type="text" spellcheck="false" placeholder="gpt-4o-mini" />
        </label>

        <label class="ai-panel__field">
          <span>{{ copy.apiKey }}</span>
          <input v-model="apiKey" type="password" spellcheck="false" :placeholder="copy.apiKeyPlaceholder" />
        </label>

        <p v-if="hasSavedApiKey && !apiKey" class="ai-panel__hint">
          <KeyRound :size="14" />
          {{ copy.apiKeySaved }}
        </p>

        <div class="ai-panel__settings-actions">
          <button class="ai-panel__secondary-button" :disabled="settingsSaving || settingsLoading" @click="saveSettings">
            <LoaderCircle v-if="settingsSaving" class="ai-panel__spin" :size="15" />
            <span>{{ settingsSaving ? copy.saving : copy.saveSettings }}</span>
          </button>
          <button
            class="ai-panel__secondary-button"
            :disabled="settingsTesting || settingsLoading"
            @click="testConnection"
          >
            <LoaderCircle v-if="settingsTesting" class="ai-panel__spin" :size="15" />
            <span>{{ settingsTesting ? copy.testingConnection : copy.testConnection }}</span>
          </button>
        </div>

        <p v-if="settingsMessage" class="ai-panel__success">{{ settingsMessage }}</p>
        <p v-if="settingsError" class="ai-panel__error">{{ settingsError }}</p>
      </section>

      <section class="ai-panel__section ai-panel__section--grow">
        <label class="ai-panel__field">
          <span>{{ copy.scope }}</span>
          <div class="ai-panel__scope-toggle">
            <button
              :class="{ 'ai-panel__scope-button--active': scope === 'document' }"
              class="ai-panel__scope-button"
              @click="scope = 'document'"
            >
              {{ copy.documentScope }}
            </button>
            <button
              :class="{ 'ai-panel__scope-button--active': scope === 'selection' }"
              :disabled="!hasSelection"
              class="ai-panel__scope-button"
              @click="scope = 'selection'"
            >
              {{ copy.selectionScope }}
            </button>
          </div>
        </label>

        <p class="ai-panel__hint">{{ targetLabel }}</p>

        <div class="ai-panel__conversation-header">
          <span>
            <MessageSquareText :size="15" />
            {{ copy.conversation }}
          </span>
          <button class="ai-panel__ghost-button" :disabled="messages.length === 0" @click="$emit('clearConversation')">
            {{ copy.clearConversation }}
          </button>
        </div>

        <div class="ai-panel__conversation">
          <p v-if="visibleMessages.length === 0" class="ai-panel__empty-conversation">
            {{ copy.emptyConversation }}
          </p>
          <article
            v-for="(message, index) in visibleMessages"
            :key="`${message.role}-${index}`"
            class="ai-panel__message"
            :class="`ai-panel__message--${message.role}`"
          >
            <span class="ai-panel__message-role">
              {{ message.role === 'user' ? copy.you : copy.title }}
            </span>
            <p>{{ message.content }}</p>
          </article>
        </div>

        <label class="ai-panel__field ai-panel__field--fill">
          <span>{{ copy.instruction }}</span>
          <textarea
            v-model="instruction"
            :placeholder="copy.instructionPlaceholder"
            @keydown.ctrl.enter.prevent="runAiEdit"
            @keydown.meta.enter.prevent="runAiEdit"
          ></textarea>
        </label>

        <button class="ai-panel__primary-button" :disabled="!canRun" @click="runAiEdit">
          <LoaderCircle v-if="loading" class="ai-panel__spin" :size="16" />
          <span>{{ loading ? copy.loading : copy.apply }}</span>
        </button>
      </section>
    </aside>
  </div>
</template>
