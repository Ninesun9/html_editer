<script setup lang="ts">
import { computed } from 'vue'
import { Clock3, FileCode2, FolderOpen } from 'lucide-vue-next'
import { translate, type AppLanguage } from '../services/i18n'

const props = defineProps<{
  currentFile: string
  recentFiles: string[]
  language: AppLanguage
}>()

defineEmits<{
  openRecent: [filePath: string]
}>()

function getFileName(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  return parts[parts.length - 1] || filePath
}

function getDirectory(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? '' : normalized.slice(0, lastSlash)
}

const recentFileItems = computed(() =>
  props.recentFiles.map((filePath) => ({
    path: filePath,
    name: getFileName(filePath),
    directory: getDirectory(filePath)
  }))
)

const copy = computed(() => ({
  currentFile: translate(props.language, 'sidebar.currentFile'),
  emptyRecent: translate(props.language, 'sidebar.emptyRecent'),
  recentFiles: translate(props.language, 'sidebar.recentFiles'),
  workingDocument: translate(props.language, 'sidebar.workingDocument')
}))
</script>

<template>
  <aside class="sidebar">
    <section class="sidebar__section">
      <div class="sidebar__section-title">
        <FileCode2 :size="16" />
        <span>{{ copy.currentFile }}</span>
      </div>
      <div class="sidebar__current-file">
        <span class="sidebar__file-name">{{ currentFile }}</span>
        <span class="sidebar__file-meta">{{ copy.workingDocument }}</span>
      </div>
    </section>

    <section class="sidebar__section">
      <div class="sidebar__section-title">
        <Clock3 :size="16" />
        <span>{{ copy.recentFiles }}</span>
      </div>
      <div v-if="recentFiles.length === 0" class="sidebar__empty">
        <FolderOpen :size="18" />
        <span>{{ copy.emptyRecent }}</span>
      </div>
      <button
        v-for="file in recentFileItems"
        :key="file.path"
        class="sidebar__recent-file"
        :title="file.path"
        @click="$emit('openRecent', file.path)"
      >
        <span class="sidebar__file-name">{{ file.name }}</span>
        <span class="sidebar__file-meta">{{ file.directory }}</span>
      </button>
    </section>
  </aside>
</template>
