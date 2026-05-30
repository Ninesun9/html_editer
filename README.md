# HtmlFox / HtmlFox HTML 编辑器

HtmlFox is a lightweight AI-assisted desktop HTML editor for opening, editing, previewing, formatting, and saving local HTML files. It is built with Electron, Vue 3, TypeScript, Monaco Editor, and Vite.

HtmlFox 是一款轻量级 AI 辅助桌面 HTML 编辑器，用于打开、编辑、预览、格式化并保存本地 HTML 文件。项目基于 Electron、Vue 3、TypeScript、Monaco Editor 和 Vite 构建。

## 中文说明

### 功能特性

- 打开本地 `.html` / `.htm` 文件。
- 使用 Monaco Editor 编辑 HTML 源码。
- 在右侧 iframe 中实时预览 HTML。
- 新建文档时提供内置示例 HTML。
- 支持保存和另存为。
- 使用 Prettier 格式化 HTML。
- 支持桌面端和移动端预览宽度切换。
- 记录并重新打开最近使用的文件。
- 点击预览区域中的元素，可在左侧源码中定位到对应标签。
- 双击预览区域中的叶子文本，可直接进行 inline edit。
- 通过 HtmlFox AI 面板调用 OpenAI-compatible 接口，按自然语言修改整页或当前选中的元素。
- 支持中英文界面切换，并持久化保存语言偏好。

### 技术栈

- Electron：桌面应用外壳、文件选择与本地文件读写。
- Vue 3 + TypeScript：渲染进程 UI。
- Vite + electron-vite：开发服务器与构建流程。
- Monaco Editor：HTML 源码编辑器。
- Prettier：HTML 格式化。
- parse5：预览 DOM 与源码位置映射。
- lucide-vue-next：界面图标。

### 推荐环境

- Node.js 20+
- npm 10+
- Windows 环境优先验证

### 安装依赖

```powershell
npm install
```

如果在国内网络环境中安装 Electron 较慢，可以临时设置 Electron 镜像后再安装：

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

### 开发运行

```powershell
npm run dev
```

### 类型检查

```powershell
npm run typecheck
```

### 构建

```powershell
npm run build
```

构建产物默认输出到 `out/` 目录。

### 使用说明

- `New` / `新建`：创建一个新的示例 HTML 文档。
- `Open` / `打开`：选择本地 `.html` 或 `.htm` 文件。
- `Save` / `保存`：保存到当前文件路径。
- `Save As` / `另存为`：选择新路径保存 HTML。
- `Format` / `格式化`：调用 Prettier 重新排版当前 HTML，让缩进和换行更清晰。
- `Desktop` / `Mobile`：切换预览区域宽度，快速检查响应式效果。
- 预览定位：单击右侧预览中的元素，左侧 Monaco 会自动选中并滚动到对应 HTML 标签。
- 预览文本编辑：双击右侧预览中的纯文本叶子节点，直接修改文本；按 `Enter` 或失焦提交，按 `Esc` 取消。
- 语言切换：点击工具栏语言按钮，在中文和英文界面之间切换。
- AI 修改：点击工具栏 `AI` 打开 HtmlFox AI，填写 Base URL、Model 和 API Key 后，可以用自然语言修改整个文档或预览区选中的元素。

### 项目结构

```text
electron/
  main/        Electron 主进程，负责窗口、文件对话框、本地读写、最近文件
  preload/     安全的渲染进程桥接 API
src/
  components/  Vue 组件，包括工具栏、侧栏、编辑器、预览区
  services/    格式化、国际化、Monaco、源码映射等逻辑
  stores/      Pinia 文档状态
```

### 当前限制

- 预览到源码定位依赖 `parse5` 的源码位置映射，适合普通静态 HTML；如果 HTML 结构严重不完整、由脚本动态生成，定位可能不完全准确。
- inline edit 目前聚焦在“叶子文本”场景，也就是元素内部主要是纯文本的情况。
- 当前 npm 脚本优先面向 Windows 验证；如果需要 macOS/Linux 通用脚本，后续可以引入 `cross-env`。
- 尚未加入应用打包发布配置，如安装包、自动更新、代码签名等。

### 许可证

暂未指定许可证。开源发布前建议补充 `LICENSE` 文件。

## English

### Features

- Open local `.html` / `.htm` files.
- Edit HTML source code with Monaco Editor.
- Preview HTML live in an isolated iframe.
- Start from a built-in sample document.
- Save and Save As local files.
- Format HTML with Prettier.
- Switch preview width between desktop and mobile modes.
- Keep and reopen recent files.
- Click an element in the preview to reveal the matching source tag in Monaco.
- Double-click leaf text in the preview to edit it inline.
- Use the HtmlFox AI panel with an OpenAI-compatible endpoint to edit the whole document or the selected preview element using natural language.
- Switch between English and Chinese UI, with the preference persisted locally.

### Tech Stack

- Electron for the desktop shell, file dialogs, and local file access.
- Vue 3 + TypeScript for the renderer UI.
- Vite + electron-vite for development and builds.
- Monaco Editor for HTML source editing.
- Prettier for HTML formatting.
- parse5 for source-location based preview mapping.
- lucide-vue-next for UI icons.

### Requirements

- Node.js 20+
- npm 10+
- Primarily verified on Windows

### Install

```powershell
npm install
```

If Electron downloads slowly in mainland China, set an Electron mirror before installing:

```powershell
$env:ELECTRON_MIRROR='https://npmmirror.com/mirrors/electron/'
npm install
```

### Run in Development

```powershell
npm run dev
```

### Type Check

```powershell
npm run typecheck
```

### Build

```powershell
npm run build
```

Build output is written to `out/` by default.

### Usage

- `New`: create a new sample HTML document.
- `Open`: choose a local `.html` or `.htm` file.
- `Save`: save to the current file path.
- `Save As`: save the current HTML to a new path.
- `Format`: run Prettier on the current HTML to normalize indentation and line breaks.
- `Desktop` / `Mobile`: switch the preview width for quick responsive checks.
- Preview source selection: click an element in the preview, and Monaco selects the corresponding HTML tag.
- Inline preview editing: double-click editable leaf text in the preview, edit it directly, press `Enter` or blur to commit, or press `Esc` to cancel.
- Language switch: use the toolbar language button to switch between English and Chinese.
- AI editing: click `AI` in the toolbar, configure Base URL, Model, and API key, then describe the change you want for the whole document or selected preview element.

### Project Structure

```text
electron/
  main/        Electron main process: window, dialogs, local file IO, recent files
  preload/     Safe renderer bridge API
src/
  components/  Vue components for toolbar, sidebar, editor, and preview
  services/    Formatting, i18n, Monaco setup, source mapping
  stores/      Pinia document state
```

### Current Limitations

- Preview-to-source mapping is based on `parse5` source locations. It works best with normal static HTML; heavily malformed or script-generated DOM may not map perfectly.
- Inline editing currently targets leaf-text cases where an element mainly contains plain text.
- The npm scripts are currently verified first on Windows. For macOS/Linux-friendly scripts, `cross-env` can be added later.
- App packaging, installers, auto-update, and code signing are not configured yet.

### License

No license has been specified yet. Add a `LICENSE` file before publishing as an open-source project.
