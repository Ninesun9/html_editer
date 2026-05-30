export type AppLanguage = 'en' | 'zh'

export const LANGUAGE_STORAGE_KEY = 'html-editor-language'

export const messages = {
  en: {
    'app.html': 'HTML',
    'app.preview': 'Preview',
    'common.dismiss': 'Dismiss',
    'confirm.newDocument': 'Discard unsaved changes and create a new document?',
    'device.desktop': 'Desktop',
    'device.mobile': 'Mobile',
    'error.format': 'Unable to format the document.',
    'error.open': 'Unable to open the file.',
    'error.openRecent': 'Unable to open the recent file.',
    'error.save': 'Unable to save the file.',
    'language.english': 'English',
    'language.label': 'Language',
    'language.switchToEnglish': 'Switch to English',
    'language.switchToChinese': 'Switch to Chinese',
    'language.zh': '中文',
    'sidebar.currentFile': 'Current file',
    'sidebar.emptyRecent': 'Open an HTML file to build your list.',
    'sidebar.recentFiles': 'Recent files',
    'sidebar.workingDocument': 'Working document',
    'status.editedText': 'Edited <{tag}> text from preview',
    'status.fileOpened': 'File opened',
    'status.fileSaved': 'File saved',
    'status.fileSavedAs': 'File saved as new document',
    'status.formatted': 'HTML formatted',
    'status.newDocument': 'New document',
    'status.ready': 'Ready',
    'status.recentOpened': 'Recent file opened',
    'status.selectedPreview': 'Selected <{tag}> from preview',
    'toolbar.format': 'Format',
    'toolbar.formatTitle': 'Format HTML',
    'toolbar.new': 'New',
    'toolbar.newTitle': 'New document',
    'toolbar.open': 'Open',
    'toolbar.openTitle': 'Open HTML file',
    'toolbar.save': 'Save',
    'toolbar.saveAs': 'Save As',
    'toolbar.saveAsTitle': 'Save as',
    'toolbar.saveTitle': 'Save',
    'toolbar.unsavedTitle': 'Unsaved changes'
  },
  zh: {
    'app.html': 'HTML',
    'app.preview': '预览',
    'common.dismiss': '关闭',
    'confirm.newDocument': '放弃未保存的修改并新建文档吗？',
    'device.desktop': '桌面',
    'device.mobile': '移动端',
    'error.format': '无法格式化当前文档。',
    'error.open': '无法打开文件。',
    'error.openRecent': '无法打开最近文件。',
    'error.save': '无法保存文件。',
    'language.english': 'English',
    'language.label': '语言',
    'language.switchToEnglish': '切换到英文',
    'language.switchToChinese': '切换到中文',
    'language.zh': '中文',
    'sidebar.currentFile': '当前文件',
    'sidebar.emptyRecent': '打开 HTML 文件后会显示在这里。',
    'sidebar.recentFiles': '最近文件',
    'sidebar.workingDocument': '工作文档',
    'status.editedText': '已从预览编辑 <{tag}> 文本',
    'status.fileOpened': '文件已打开',
    'status.fileSaved': '文件已保存',
    'status.fileSavedAs': '已另存为新文档',
    'status.formatted': 'HTML 已格式化',
    'status.newDocument': '新建文档',
    'status.ready': '就绪',
    'status.recentOpened': '最近文件已打开',
    'status.selectedPreview': '已从预览选中 <{tag}>',
    'toolbar.format': '格式化',
    'toolbar.formatTitle': '格式化 HTML',
    'toolbar.new': '新建',
    'toolbar.newTitle': '新建文档',
    'toolbar.open': '打开',
    'toolbar.openTitle': '打开 HTML 文件',
    'toolbar.save': '保存',
    'toolbar.saveAs': '另存为',
    'toolbar.saveAsTitle': '另存为',
    'toolbar.saveTitle': '保存',
    'toolbar.unsavedTitle': '未保存的修改'
  }
} as const

export type TranslationKey = keyof typeof messages.en

export function isAppLanguage(value: string | null): value is AppLanguage {
  return value === 'en' || value === 'zh'
}

export function translate(
  language: AppLanguage,
  key: TranslationKey,
  params: Record<string, string> = {}
): string {
  return messages[language][key].replace(/\{(\w+)\}/g, (_match, name: string) => params[name] ?? '')
}
