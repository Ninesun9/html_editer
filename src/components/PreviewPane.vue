<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import {
  EDITABLE_TEXT_ATTR,
  EDITING_TEXT_ATTR,
  SELECTED_SOURCE_ATTR,
  SOURCE_NODE_ATTR
} from '../services/sourceMapping'
import type { DeviceMode } from '../stores/document'

const props = defineProps<{
  html: string
  deviceMode: DeviceMode
  selectedSourceId: string | null
}>()

const emit = defineEmits<{
  selectSource: [nodeId: string]
  editText: [textId: string, value: string]
}>()

const frameRef = ref<HTMLIFrameElement | null>(null)

let attachedDocument: Document | null = null
let activeEdit:
  | {
      element: HTMLElement
      originalText: string
      textId: string
    }
  | null = null

function clearSelectedMarker(document: Document): void {
  document.querySelectorAll(`[${SELECTED_SOURCE_ATTR}]`).forEach((element) => {
    element.removeAttribute(SELECTED_SOURCE_ATTR)
  })
}

function markSelectedSource(document: Document, nodeId: string | null): void {
  clearSelectedMarker(document)

  if (!nodeId) {
    return
  }

  const selectedElement = document.querySelector(`[${SOURCE_NODE_ATTR}="${nodeId}"]`)
  selectedElement?.setAttribute(SELECTED_SOURCE_ATTR, 'true')
}

function getElementTarget(target: EventTarget | null): Element | null {
  const frameWindow = frameRef.value?.contentWindow
  if (!frameWindow || !(target instanceof frameWindow.Node)) {
    return null
  }

  return target instanceof frameWindow.Element ? target : target.parentElement
}

function getHTMLElementTarget(target: EventTarget | null): HTMLElement | null {
  const frameWindow = frameRef.value?.contentWindow
  if (!frameWindow || !(target instanceof frameWindow.Node)) {
    return null
  }

  const element = target instanceof frameWindow.Element ? target : target.parentElement
  return element instanceof frameWindow.HTMLElement ? element : null
}

function clearTextSelection(document: Document): void {
  document.defaultView?.getSelection()?.removeAllRanges()
}

function selectElementText(element: HTMLElement): void {
  const document = element.ownerDocument
  const selection = document.defaultView?.getSelection()
  if (!selection) {
    return
  }

  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

function finishTextEdit(shouldCommit: boolean): void {
  if (!activeEdit) {
    return
  }

  const { element, originalText, textId } = activeEdit
  activeEdit = null
  element.removeAttribute(EDITING_TEXT_ATTR)
  element.removeAttribute('contenteditable')

  const nextText = element.textContent ?? ''
  if (!shouldCommit) {
    element.textContent = originalText
  } else if (nextText !== originalText) {
    emit('editText', textId, nextText)
  }

  clearTextSelection(element.ownerDocument)
}

function beginTextEdit(element: HTMLElement, textId: string): void {
  if (activeEdit?.element === element) {
    return
  }

  finishTextEdit(true)

  activeEdit = {
    element,
    originalText: element.textContent ?? '',
    textId
  }

  element.setAttribute(EDITING_TEXT_ATTR, 'true')
  element.setAttribute('contenteditable', 'plaintext-only')
  element.focus({ preventScroll: true })
  selectElementText(element)
}

function handlePreviewClick(event: MouseEvent): void {
  const element = getElementTarget(event.target)

  if (activeEdit) {
    if (element && activeEdit.element.contains(element)) {
      return
    }

    finishTextEdit(true)
  }

  const sourceElement = element?.closest(`[${SOURCE_NODE_ATTR}]`)
  const nodeId = sourceElement?.getAttribute(SOURCE_NODE_ATTR)

  if (!nodeId) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  markSelectedSource(sourceElement.ownerDocument, nodeId)
  emit('selectSource', nodeId)
}

function handlePreviewDoubleClick(event: MouseEvent): void {
  const frameWindow = frameRef.value?.contentWindow
  const element = getHTMLElementTarget(event.target)
  const editableElement = element?.closest(`[${EDITABLE_TEXT_ATTR}]`)

  if (!frameWindow || !editableElement || !(editableElement instanceof frameWindow.HTMLElement)) {
    return
  }

  const textId = editableElement.getAttribute(EDITABLE_TEXT_ATTR)
  if (!textId) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  beginTextEdit(editableElement, textId)
}

function handlePreviewFocusOut(event: FocusEvent): void {
  if (!activeEdit) {
    return
  }

  const nextFocus = event.relatedTarget
  const frameWindow = frameRef.value?.contentWindow
  if (frameWindow && nextFocus instanceof frameWindow.Node && activeEdit.element.contains(nextFocus)) {
    return
  }

  finishTextEdit(true)
}

function handlePreviewKeyDown(event: KeyboardEvent): void {
  if (!activeEdit) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    finishTextEdit(false)
    return
  }

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    event.stopPropagation()
    finishTextEdit(true)
  }
}

function detachPreviewListener(): void {
  if (attachedDocument) {
    attachedDocument.removeEventListener('click', handlePreviewClick, true)
    attachedDocument.removeEventListener('dblclick', handlePreviewDoubleClick, true)
    attachedDocument.removeEventListener('focusout', handlePreviewFocusOut, true)
    attachedDocument.removeEventListener('keydown', handlePreviewKeyDown, true)
  }

  finishTextEdit(true)
  attachedDocument = null
}

function handleFrameLoad(): void {
  detachPreviewListener()

  const document = frameRef.value?.contentDocument
  if (!document) {
    return
  }

  document.addEventListener('click', handlePreviewClick, true)
  document.addEventListener('dblclick', handlePreviewDoubleClick, true)
  document.addEventListener('focusout', handlePreviewFocusOut, true)
  document.addEventListener('keydown', handlePreviewKeyDown, true)
  attachedDocument = document
  markSelectedSource(document, props.selectedSourceId)
}

watch(
  () => props.selectedSourceId,
  (nodeId) => {
    const document = frameRef.value?.contentDocument
    if (document) {
      markSelectedSource(document, nodeId)
    }
  }
)

onBeforeUnmount(() => {
  detachPreviewListener()
})
</script>

<template>
  <section class="preview-pane">
    <div class="preview-pane__frame-shell" :class="`preview-pane__frame-shell--${deviceMode}`">
      <iframe
        ref="frameRef"
        class="preview-pane__frame"
        :srcdoc="html"
        sandbox="allow-scripts allow-same-origin"
        @load="handleFrameLoad"
      ></iframe>
    </div>
  </section>
</template>
