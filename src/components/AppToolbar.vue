<script setup lang="ts">
import { computed } from 'vue'
import {
  FilePlus2,
  FolderOpen,
  Languages,
  Monitor,
  Save,
  SaveAll,
  Smartphone,
  WandSparkles
} from 'lucide-vue-next'
import { translate, type AppLanguage } from '../services/i18n'
import type { DeviceMode } from '../stores/document'

const props = defineProps<{
  fileName: string
  dirty: boolean
  deviceMode: DeviceMode
  language: AppLanguage
}>()

defineEmits<{
  create: []
  open: []
  save: []
  saveAs: []
  format: []
  switchDevice: [mode: DeviceMode]
  switchLanguage: [language: AppLanguage]
}>()

const copy = computed(() => ({
  desktop: translate(props.language, 'device.desktop'),
  format: translate(props.language, 'toolbar.format'),
  formatTitle: translate(props.language, 'toolbar.formatTitle'),
  languageLabel: translate(props.language, 'language.label'),
  mobile: translate(props.language, 'device.mobile'),
  new: translate(props.language, 'toolbar.new'),
  newTitle: translate(props.language, 'toolbar.newTitle'),
  open: translate(props.language, 'toolbar.open'),
  openTitle: translate(props.language, 'toolbar.openTitle'),
  save: translate(props.language, 'toolbar.save'),
  saveAs: translate(props.language, 'toolbar.saveAs'),
  saveAsTitle: translate(props.language, 'toolbar.saveAsTitle'),
  saveTitle: translate(props.language, 'toolbar.saveTitle'),
  switchLanguageTitle: translate(
    props.language,
    props.language === 'en' ? 'language.switchToChinese' : 'language.switchToEnglish'
  ),
  unsavedTitle: translate(props.language, 'toolbar.unsavedTitle')
}))

const nextLanguage = computed<AppLanguage>(() => (props.language === 'en' ? 'zh' : 'en'))
const nextLanguageLabel = computed(() =>
  props.language === 'en' ? translate(props.language, 'language.zh') : translate(props.language, 'language.english')
)
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__group">
      <button class="toolbar__button" :title="copy.newTitle" @click="$emit('create')">
        <FilePlus2 :size="16" />
        <span>{{ copy.new }}</span>
      </button>
      <button class="toolbar__button toolbar__button--primary" :title="copy.openTitle" @click="$emit('open')">
        <FolderOpen :size="16" />
        <span>{{ copy.open }}</span>
      </button>
      <button class="toolbar__button" :title="copy.saveTitle" @click="$emit('save')">
        <Save :size="16" />
        <span>{{ copy.save }}</span>
      </button>
      <button class="toolbar__button" :title="copy.saveAsTitle" @click="$emit('saveAs')">
        <SaveAll :size="16" />
        <span>{{ copy.saveAs }}</span>
      </button>
      <button class="toolbar__button" :title="copy.formatTitle" @click="$emit('format')">
        <WandSparkles :size="16" />
        <span>{{ copy.format }}</span>
      </button>
    </div>

    <div class="toolbar__title">
      <span class="toolbar__file-name">{{ fileName }}</span>
      <span v-if="dirty" class="toolbar__dirty-dot" :title="copy.unsavedTitle"></span>
    </div>

    <div class="toolbar__right-group">
      <div class="toolbar__device-toggle" aria-label="Preview device mode">
        <button
          class="toolbar__device-button"
          :class="{ 'toolbar__device-button--active': deviceMode === 'desktop' }"
          :title="copy.desktop"
          @click="$emit('switchDevice', 'desktop')"
        >
          <Monitor :size="16" />
          <span>{{ copy.desktop }}</span>
        </button>
        <button
          class="toolbar__device-button"
          :class="{ 'toolbar__device-button--active': deviceMode === 'mobile' }"
          :title="copy.mobile"
          @click="$emit('switchDevice', 'mobile')"
        >
          <Smartphone :size="16" />
          <span>{{ copy.mobile }}</span>
        </button>
      </div>

      <button
        class="toolbar__language-button"
        :title="copy.switchLanguageTitle"
        :aria-label="copy.switchLanguageTitle"
        @click="$emit('switchLanguage', nextLanguage)"
      >
        <Languages :size="16" />
        <span>{{ nextLanguageLabel }}</span>
      </button>
    </div>
  </header>
</template>
