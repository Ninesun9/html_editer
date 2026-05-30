import { parse, type DefaultTreeAdapterTypes } from 'parse5'

export const SOURCE_NODE_ATTR = 'data-html-editor-source-id'
export const EDITABLE_TEXT_ATTR = 'data-html-editor-text-id'
export const SELECTED_SOURCE_ATTR = 'data-html-editor-selected'
export const EDITING_TEXT_ATTR = 'data-html-editor-editing'

export type SourceRange = {
  startOffset: number
  endOffset: number
  fullStartOffset: number
  fullEndOffset: number
  tagName: string
}

export type SourceMapping = Record<string, SourceRange>

export type EditableTextRange = {
  startOffset: number
  endOffset: number
  tagName: string
}

export type EditableTextMapping = Record<string, EditableTextRange>

export type PreviewDocument = {
  html: string
  mappings: SourceMapping
  textMappings: EditableTextMapping
}

type SourceElement = {
  tagName: string
  startOffset: number
  endOffset: number
  fullStartOffset: number
  fullEndOffset: number
  insertOffset: number
  textRange: EditableTextRange | null
}

type ParentNode = DefaultTreeAdapterTypes.ParentNode
type Node = DefaultTreeAdapterTypes.Node
type ElementNode = DefaultTreeAdapterTypes.Element

const previewStyle = `<style data-html-editor-preview-style>
[${SOURCE_NODE_ATTR}] {
  cursor: pointer;
}

[${EDITABLE_TEXT_ATTR}] {
  cursor: text;
}

[${SELECTED_SOURCE_ATTR}="true"] {
  outline: 2px solid #ffbf47 !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 4px rgba(255, 191, 71, 0.22) !important;
}

[${EDITING_TEXT_ATTR}="true"] {
  outline: 2px solid #4e8cff !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 4px rgba(78, 140, 255, 0.22) !important;
}
</style>`

function isElementNode(node: Node): node is ElementNode {
  return 'tagName' in node && 'attrs' in node
}

function hasChildNodes(node: Node): node is ParentNode {
  return 'childNodes' in node
}

function getInsertionOffset(source: string, startOffset: number, endOffset: number): number {
  const closeOffset = source.lastIndexOf('>', endOffset - 1)
  if (closeOffset < startOffset) {
    return endOffset
  }

  let beforeClose = closeOffset - 1
  while (beforeClose > startOffset && /\s/.test(source[beforeClose])) {
    beforeClose -= 1
  }

  return source[beforeClose] === '/' ? beforeClose : closeOffset
}

function getEditableTextRange(node: ElementNode): EditableTextRange | null {
  if (!node.sourceCodeLocation?.endTag) {
    return null
  }

  const textNodes = node.childNodes.filter((child): child is DefaultTreeAdapterTypes.TextNode => {
    return child.nodeName === '#text'
  })

  if (textNodes.length !== node.childNodes.length) {
    return null
  }

  const textContent = textNodes.map((child) => child.value).join('')
  if (!textContent.trim()) {
    return null
  }

  const firstTextLocation = textNodes[0]?.sourceCodeLocation
  const lastTextLocation = textNodes[textNodes.length - 1]?.sourceCodeLocation
  if (!firstTextLocation || !lastTextLocation) {
    return null
  }

  return {
    startOffset: firstTextLocation.startOffset,
    endOffset: lastTextLocation.endOffset,
    tagName: node.tagName
  }
}

function collectSourceElements(source: string): SourceElement[] {
  const document = parse(source, { sourceCodeLocationInfo: true })
  const elements: SourceElement[] = []

  function visit(node: Node): void {
    if (isElementNode(node)) {
      const startTag = node.sourceCodeLocation?.startTag
      const sourceLocation = node.sourceCodeLocation
      if (startTag && sourceLocation) {
        elements.push({
          tagName: node.tagName,
          startOffset: startTag.startOffset,
          endOffset: startTag.endOffset,
          fullStartOffset: sourceLocation.startOffset,
          fullEndOffset: sourceLocation.endOffset,
          insertOffset: getInsertionOffset(source, startTag.startOffset, startTag.endOffset),
          textRange: getEditableTextRange(node)
        })
      }

      if ('content' in node) {
        for (const child of node.content.childNodes) {
          visit(child)
        }
      }
    }

    if (hasChildNodes(node)) {
      for (const child of node.childNodes) {
        visit(child)
      }
    }
  }

  visit(document)

  return elements.sort((first, second) => first.startOffset - second.startOffset)
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function injectHeadContent(source: string, content: string): string {
  if (/<head(\s|>)/i.test(source)) {
    return source.replace(/<head(\s*.*?)>/i, (match) => `${match}${content}`)
  }

  return `<!doctype html><html><head>${content}</head><body>${source}</body></html>`
}

export function createPreviewDocument(
  source: string,
  baseHref: string | null
): PreviewDocument {
  const elements = collectSourceElements(source)
  const mappings: SourceMapping = {}
  const textMappings: EditableTextMapping = {}
  const insertions = elements.map((element, index) => {
    const nodeId = `node-${index + 1}`
    const textId = element.textRange ? `text-${index + 1}` : null

    mappings[nodeId] = {
      startOffset: element.startOffset,
      endOffset: element.endOffset,
      fullStartOffset: element.fullStartOffset,
      fullEndOffset: element.fullEndOffset,
      tagName: element.tagName
    }

    if (textId && element.textRange) {
      textMappings[textId] = element.textRange
    }

    return {
      offset: element.insertOffset,
      text: ` ${SOURCE_NODE_ATTR}="${nodeId}"${textId ? ` ${EDITABLE_TEXT_ATTR}="${textId}"` : ''}`
    }
  })

  let html = source
  for (const insertion of insertions.sort((first, second) => second.offset - first.offset)) {
    html = `${html.slice(0, insertion.offset)}${insertion.text}${html.slice(insertion.offset)}`
  }

  const baseTag = baseHref ? `<base href="${escapeAttribute(baseHref)}">` : ''

  return {
    html: injectHeadContent(html, `${baseTag}${previewStyle}`),
    mappings,
    textMappings
  }
}

export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function replaceSourceText(source: string, range: EditableTextRange, value: string): string {
  return `${source.slice(0, range.startOffset)}${escapeHtmlText(value)}${source.slice(range.endOffset)}`
}
