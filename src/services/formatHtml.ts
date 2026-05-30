import prettier from 'prettier/standalone'
import htmlPlugin from 'prettier/plugins/html'

export async function formatHtml(source: string): Promise<string> {
  return prettier.format(source, {
    parser: 'html',
    plugins: [htmlPlugin],
    tabWidth: 2,
    printWidth: 100,
    htmlWhitespaceSensitivity: 'ignore'
  })
}
