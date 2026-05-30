import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'

type MonacoEnvironmentWindow = Window & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, label: string) => Worker
  }
}

const monacoEnvironmentWindow = window as MonacoEnvironmentWindow

if (!monacoEnvironmentWindow.MonacoEnvironment) {
  monacoEnvironmentWindow.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'html' || label === 'handlebars' || label === 'razor') {
        return new htmlWorker()
      }

      return new editorWorker()
    }
  }
}

export { monaco }
