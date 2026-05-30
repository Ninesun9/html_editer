<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { monaco } from '../services/monaco'
import type { SourceRange } from '../services/sourceMapping'

const props = defineProps<{
  modelValue: string
  selectionRange: SourceRange | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let sourceSelectionDecorations: monaco.editor.IEditorDecorationsCollection | null = null
let isApplyingExternalUpdate = false

function clearSourceSelection(): void {
  sourceSelectionDecorations?.clear()
}

function revealSourceRange(range: SourceRange | null): void {
  if (!editor || !range) {
    clearSourceSelection()
    return
  }

  const model = editor.getModel()
  if (!model) {
    return
  }

  const valueLength = model.getValueLength()
  const startOffset = Math.max(0, Math.min(range.startOffset, valueLength))
  const endOffset = Math.max(startOffset, Math.min(range.endOffset, valueLength))
  const start = model.getPositionAt(startOffset)
  const end = model.getPositionAt(endOffset)
  const selection = new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column)

  editor.setSelection(selection)
  editor.revealRangeInCenter(selection, monaco.editor.ScrollType.Smooth)
  editor.focus()
  sourceSelectionDecorations?.set([
    {
      range: selection,
      options: {
        inlineClassName: 'monaco-source-selection',
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  ])
}

onMounted(() => {
  if (!rootRef.value) {
    return
  }

  editor = monaco.editor.create(rootRef.value, {
    value: props.modelValue,
    language: 'html',
    automaticLayout: true,
    minimap: { enabled: false },
    theme: 'vs-dark',
    fontSize: 14,
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    wordWrap: 'on'
  })
  sourceSelectionDecorations = editor.createDecorationsCollection()

  editor.onDidChangeModelContent(() => {
    if (!editor || isApplyingExternalUpdate) {
      return
    }

    emit('update:modelValue', editor.getValue())
  })

  revealSourceRange(props.selectionRange)
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor || value === editor.getValue()) {
      return
    }

    isApplyingExternalUpdate = true
    editor.setValue(value)
    isApplyingExternalUpdate = false

    void nextTick(() => {
      revealSourceRange(props.selectionRange)
    })
  }
)

watch(
  () => props.selectionRange,
  (range) => {
    revealSourceRange(range)
  }
)

onBeforeUnmount(() => {
  sourceSelectionDecorations?.clear()
  editor?.dispose()
})
</script>

<template>
  <div ref="rootRef" class="editor-root"></div>
</template>
