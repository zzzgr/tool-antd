<template>
  <div class="markdown-tool p-2">
    <div class="toolbar mb-2">
      <div class="toolbar-left">
        <a-radio-group v-model:value="layoutMode" size="small" button-style="solid">
          <a-radio-button value="edit">仅编辑</a-radio-button>
          <a-radio-button value="split">分屏</a-radio-button>
          <a-radio-button value="preview">仅渲染</a-radio-button>
        </a-radio-group>

        <a-divider type="vertical" class="toolbar-divider" />

        <div class="format-bar">
          <a-tooltip title="加粗">
            <button type="button" class="fmt-btn" @click="wrapSelection('**', '**')">
              <BoldOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="斜体">
            <button type="button" class="fmt-btn" @click="wrapSelection('*', '*')">
              <ItalicOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="删除线">
            <button type="button" class="fmt-btn" @click="wrapSelection('~~', '~~')">
              <StrikethroughOutlined />
            </button>
          </a-tooltip>

          <span class="fmt-sep" />

          <a-dropdown :trigger="['click']" :get-popup-container="getPopupContainer">
            <button type="button" class="fmt-btn">
              <FontSizeOutlined />
            </button>
            <template #overlay>
              <a-menu @click="onHeadingMenu">
                <a-menu-item key="1">一级标题 #</a-menu-item>
                <a-menu-item key="2">二级标题 ##</a-menu-item>
                <a-menu-item key="3">三级标题 ###</a-menu-item>
                <a-menu-item key="4">四级标题 ####</a-menu-item>
                <a-menu-item key="5">五级标题 #####</a-menu-item>
                <a-menu-item key="6">六级标题 ######</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>

          <a-tooltip title="无序列表">
            <button type="button" class="fmt-btn" @click="toggleLinePrefix('- ')">
              <UnorderedListOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="有序列表">
            <button type="button" class="fmt-btn" @click="toggleLinePrefix('1. ')">
              <OrderedListOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="任务列表">
            <button type="button" class="fmt-btn" @click="toggleLinePrefix('- [ ] ')">
              <CheckSquareOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="引用">
            <button type="button" class="fmt-btn" @click="toggleLinePrefix('> ')">
              <FontColorsOutlined />
            </button>
          </a-tooltip>

          <span class="fmt-sep" />

          <a-tooltip title="行内代码">
            <button type="button" class="fmt-btn" @click="wrapSelection('`', '`')">
              <CodeOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="代码块">
            <button type="button" class="fmt-btn" @click="insertCodeBlock">
              <ConsoleSqlOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="链接">
            <button type="button" class="fmt-btn" @click="insertLink">
              <LinkOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="图片">
            <button type="button" class="fmt-btn" @click="insertImage">
              <PictureOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="表格">
            <button type="button" class="fmt-btn" @click="insertTable">
              <TableOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="分隔线">
            <button type="button" class="fmt-btn" @click="insertHr">
              <MinusOutlined />
            </button>
          </a-tooltip>

          <span class="fmt-sep" />

          <a-tooltip title="撤销">
            <button type="button" class="fmt-btn" @click="undo">
              <UndoOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="重做">
            <button type="button" class="fmt-btn" @click="redo">
              <RedoOutlined />
            </button>
          </a-tooltip>
          <a-tooltip title="清空">
            <button type="button" class="fmt-btn danger" :disabled="!text" @click="clearContent">
              <ClearOutlined />
            </button>
          </a-tooltip>
        </div>

        <a-divider type="vertical" class="toolbar-divider" />

        <a-select
          v-model:value="previewTheme"
          size="small"
          class="theme-select"
          :options="previewThemeOptions"
          :get-popup-container="getPopupContainer"
        />

        <a-checkbox v-if="layoutMode === 'split'" v-model:checked="scrollSync" class="scroll-check">
          同步滚动
        </a-checkbox>

        <span v-if="text" class="char-count">{{ charCount }} 字</span>
      </div>

      <div class="toolbar-right">
        <a-button size="small" :disabled="!text" :loading="exporting" @click="copyImage">
          <template #icon><CameraOutlined /></template>
          复制图片
        </a-button>
        <a-button size="small" :disabled="!text" :loading="exporting" @click="exportImage">
          <template #icon><DownloadOutlined /></template>
          导出图片
        </a-button>
        <a-button size="small" :disabled="!text" @click="copyMarkdown">
          <template #icon><CopyOutlined /></template>
          复制 MD
        </a-button>
        <a-button size="small" :disabled="!html" @click="copyHtml">
          <template #icon><Html5Outlined /></template>
          复制 HTML
        </a-button>
      </div>
    </div>

    <div ref="workspaceRef" class="workspace" :style="{ height: workspaceHeight + 'px' }">
      <div
        v-show="layoutMode !== 'preview'"
        ref="editorPaneRef"
        class="pane editor-pane"
        :style="editorPaneStyle"
      >
        <div ref="editorEl" class="monaco-host"></div>
      </div>

      <div
        v-if="layoutMode === 'split'"
        class="splitter"
        title="拖拽调整宽度"
        @mousedown.prevent="onSplitterDown"
      />

      <div
        v-show="layoutMode !== 'edit'"
        ref="previewPaneRef"
        class="pane preview-pane"
        :style="previewPaneStyle"
      >
        <MdPreview
          :key="`preview-${previewTheme}-${editorTheme}`"
          editor-id="markdown-tool-preview"
          class="preview-surface"
          language="zh-CN"
          :model-value="text"
          :theme="editorTheme"
          :preview-theme="previewTheme"
          style="height: 100%"
          :on-html-changed="onHtmlChanged"
        />
      </div>
    </div>

    <!-- 离屏导出节点：用已渲染 HTML 生成干净 DOM，避免截取 MdPreview 时踩 CDN/字体 -->
    <div ref="captureHostRef" class="capture-host" aria-hidden="true">
      <div
        class="capture-sheet md-editor"
        :class="editorTheme === 'dark' ? 'md-editor-dark' : ''"
      >
        <div class="md-editor-preview-wrapper">
          <div
            class="md-editor-preview capture-preview-body"
            :class="[`${previewTheme}-theme`, 'md-editor-scrn']"
            v-html="captureHtml"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import * as monaco from 'monaco-editor'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import {
  BoldOutlined,
  CameraOutlined,
  CheckSquareOutlined,
  ClearOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
  CopyOutlined,
  DownloadOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  Html5Outlined,
  ItalicOutlined,
  LinkOutlined,
  MinusOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UndoOutlined,
  UnorderedListOutlined
} from '@ant-design/icons-vue'
import html2canvas from 'html2canvas'
import { copy } from '@/util/util'
import { useThemeStore } from '@/stores/theme'

type LayoutMode = 'edit' | 'split' | 'preview'

const STORAGE_CONTENT = 'tool.markdown.content'
const STORAGE_WIDTH = 'tool.markdown.splitRatio'
const STORAGE_THEME = 'tool.markdown.previewTheme'
const STORAGE_SCROLL = 'tool.markdown.scrollSync'
const STORAGE_LAYOUT = 'tool.markdown.layoutMode'

const themeStore = useThemeStore()
const workspaceRef = ref<HTMLElement | null>(null)
const editorPaneRef = ref<HTMLElement | null>(null)
const previewPaneRef = ref<HTMLElement | null>(null)
const editorEl = ref<HTMLElement | null>(null)
const captureHostRef = ref<HTMLElement | null>(null)

const text = ref(localStorage.getItem(STORAGE_CONTENT) || '')
const layoutMode = ref<LayoutMode>(readLayoutMode())
const previewTheme = ref(localStorage.getItem(STORAGE_THEME) || 'github')
const scrollSync = ref(localStorage.getItem(STORAGE_SCROLL) !== '0')
const html = ref('')
const workspaceHeight = ref(560)
const splitRatio = ref(readSplitRatio())
const exporting = ref(false)
const captureHtml = ref('')

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let applyingExternal = false
let previewScrollEl: HTMLElement | null = null
let bindTimer: ReturnType<typeof setTimeout> | null = null
let syncingScroll = false
let editorScrollDisposable: monaco.IDisposable | null = null

const editorTheme = computed(() => (themeStore.isDark ? 'dark' : 'light'))
const charCount = computed(() => text.value.length)

const editorPaneStyle = computed(() => {
  if (layoutMode.value === 'edit') return { width: '100%', flex: '1 1 auto' }
  if (layoutMode.value === 'split') return { width: `${splitRatio.value * 100}%`, flex: '0 0 auto' }
  return { width: '0', flex: '0 0 auto' }
})

const previewPaneStyle = computed(() => {
  if (layoutMode.value === 'preview') return { width: '100%', flex: '1 1 auto' }
  if (layoutMode.value === 'split') return { flex: '1 1 auto', minWidth: 0 }
  return { width: '0', flex: '0 0 auto' }
})

const previewThemeOptions = [
  { label: 'GitHub', value: 'github' },
  { label: 'Default', value: 'default' },
  { label: 'VuePress', value: 'vuepress' },
  { label: 'MK Cute', value: 'mk-cute' },
  { label: 'Smart Blue', value: 'smart-blue' },
  { label: 'Cyanosis', value: 'cyanosis' }
]

function readLayoutMode(): LayoutMode {
  const raw = localStorage.getItem(STORAGE_LAYOUT)
  if (raw === 'edit' || raw === 'split' || raw === 'preview') return raw
  return 'split'
}

function readSplitRatio() {
  const raw = Number(localStorage.getItem(STORAGE_WIDTH))
  if (!Number.isFinite(raw) || raw < 0.2 || raw > 0.8) return 0.5
  return raw
}

function getPopupContainer() {
  return document.body
}

const onHtmlChanged = (value: string) => {
  html.value = value
}

const setEditorValue = (value: string, moveToStart = false) => {
  if (!editor) {
    text.value = value
    return
  }
  applyingExternal = true
  editor.setValue(value)
  applyingExternal = false
  text.value = value
  if (moveToStart) {
    editor.setPosition({ lineNumber: 1, column: 1 })
    editor.revealLine(1)
  }
  editor.focus()
}

const getSelectionInfo = () => {
  if (!editor) return null
  const selection = editor.getSelection()
  const model = editor.getModel()
  if (!selection || !model) return null
  return { selection, model }
}

const wrapSelection = (before: string, after: string) => {
  const info = getSelectionInfo()
  if (!info || !editor) return
  const { selection, model } = info
  const selected = model.getValueInRange(selection)
  const body = selected || 'text'
  const replacement = `${before}${body}${after}`

  editor.executeEdits('markdown-toolbar', [
    { range: selection, text: replacement, forceMoveMarkers: true }
  ])

  if (!selected) {
    const start = selection.getStartPosition()
    const from = {
      lineNumber: start.lineNumber,
      column: start.column + before.length
    }
    const to = {
      lineNumber: start.lineNumber,
      column: start.column + before.length + body.length
    }
    editor.setSelection(monaco.Selection.fromPositions(from, to))
  }
  editor.focus()
}

const applyLinePrefix = (prefix: string, remove: boolean) => {
  const info = getSelectionInfo()
  if (!info || !editor) return
  const { selection, model } = info
  const startLine = selection.startLineNumber
  const endLine = selection.endLineNumber
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []

  for (let line = startLine; line <= endLine; line++) {
    const content = model.getLineContent(line)
    if (remove) {
      if (content.startsWith(prefix)) {
        edits.push({
          range: new monaco.Range(line, 1, line, 1 + prefix.length),
          text: '',
          forceMoveMarkers: true
        })
      } else if (prefix === '1. ' && /^\d+\.\s+/.test(content)) {
        const matched = content.match(/^\d+\.\s+/)
        if (matched) {
          edits.push({
            range: new monaco.Range(line, 1, line, 1 + matched[0].length),
            text: '',
            forceMoveMarkers: true
          })
        }
      } else if (prefix === '- [ ] ' && /^- \[[ xX]\]\s+/.test(content)) {
        const matched = content.match(/^- \[[ xX]\]\s+/)
        if (matched) {
          edits.push({
            range: new monaco.Range(line, 1, line, 1 + matched[0].length),
            text: '',
            forceMoveMarkers: true
          })
        }
      }
    } else if (!content.startsWith(prefix)) {
      let insert = prefix
      if (prefix === '1. ') insert = `${line - startLine + 1}. `
      edits.push({
        range: new monaco.Range(line, 1, line, 1),
        text: insert,
        forceMoveMarkers: true
      })
    }
  }

  if (edits.length) editor.executeEdits('markdown-toolbar', edits)
  editor.focus()
}

const toggleLinePrefix = (prefix: string) => {
  const info = getSelectionInfo()
  if (!info) return
  const { selection, model } = info
  const first = model.getLineContent(selection.startLineNumber)
  const shouldRemove =
    first.startsWith(prefix) ||
    (prefix === '1. ' && /^\d+\.\s+/.test(first)) ||
    (prefix === '- [ ] ' && /^- \[[ xX]\]\s+/.test(first))
  applyLinePrefix(prefix, shouldRemove)
}

const setHeading = (level: number) => {
  const info = getSelectionInfo()
  if (!info || !editor) return
  const { selection, model } = info
  const startLine = selection.startLineNumber
  const endLine = selection.endLineNumber
  const prefix = `${'#'.repeat(level)} `
  const edits: monaco.editor.IIdentifiedSingleEditOperation[] = []

  for (let line = startLine; line <= endLine; line++) {
    const content = model.getLineContent(line)
    const stripped = content.replace(/^#{1,6}\s+/, '')
    edits.push({
      range: new monaco.Range(line, 1, line, content.length + 1),
      text: prefix + stripped,
      forceMoveMarkers: true
    })
  }

  editor.executeEdits('markdown-toolbar', edits)
  editor.focus()
}

const onHeadingMenu = ({ key }: { key: string | number }) => {
  setHeading(Number(key))
}

const insertSnippet = (snippet: string, selectPlaceholder?: string) => {
  const info = getSelectionInfo()
  if (!info || !editor) return
  const { selection } = info
  editor.executeEdits('markdown-toolbar', [
    { range: selection, text: snippet, forceMoveMarkers: true }
  ])

  if (selectPlaceholder) {
    const start = selection.getStartPosition()
    const model = editor.getModel()
    const full = model?.getValue() || ''
    if (model) {
      const offset = model.getOffsetAt(start)
      const idx = full.indexOf(selectPlaceholder, offset)
      if (idx >= 0) {
        const from = model.getPositionAt(idx)
        const to = model.getPositionAt(idx + selectPlaceholder.length)
        editor.setSelection(monaco.Selection.fromPositions(from, to))
      }
    }
  }
  editor.focus()
}

const insertCodeBlock = () => {
  const info = getSelectionInfo()
  if (!info || !editor) return
  const selected = info.model.getValueInRange(info.selection) || 'code'
  insertSnippet(`\n\`\`\`ts\n${selected}\n\`\`\`\n`, selected === 'code' ? 'code' : undefined)
}

const insertLink = () => {
  const info = getSelectionInfo()
  if (!info) return
  const selected = info.model.getValueInRange(info.selection) || '链接文字'
  insertSnippet(`[${selected}](https://)`, selected === '链接文字' ? '链接文字' : 'https://')
}

const insertImage = () => {
  const info = getSelectionInfo()
  if (!info) return
  const selected = info.model.getValueInRange(info.selection) || '图片描述'
  insertSnippet(`![${selected}](https://)`, selected === '图片描述' ? '图片描述' : 'https://')
}

const insertTable = () => {
  insertSnippet(
    `\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n| 内容 | 内容 | 内容 |\n`
  )
}

const insertHr = () => {
  insertSnippet('\n---\n')
}

const undo = () => {
  editor?.trigger('toolbar', 'undo', null)
  editor?.focus()
}

const redo = () => {
  editor?.trigger('toolbar', 'redo', null)
  editor?.focus()
}

const copyMarkdown = () => {
  if (!text.value) return
  copy(text.value)
}

const copyHtml = () => {
  if (!html.value) {
    message.warning('暂无渲染结果')
    return
  }
  copy(html.value)
}

const clearContent = () => {
  setEditorValue('')
  html.value = ''
}

/* ---------------- 导出 / 复制图片 ---------------- */

const waitFrames = (count = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve()
        return
      }
      requestAnimationFrame(() => step(left - 1))
    }
    step(count)
  })

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5W7tUAAAAASUVORK5CYII='

const sanitizeCaptureHtml = (raw: string) =>
  raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/<img\b([^>]*?)>/gi, (_m, attrs: string) => {
      const srcMatch = attrs.match(/\bsrc\s*=\s*(['"])(.*?)\1/i)
      const src = srcMatch?.[2] || ''
      if (src.startsWith('data:image/')) return `<img${attrs}>`
      return `<img src="${TRANSPARENT_PIXEL}" alt="" style="display:inline-block;width:1px;height:1px;opacity:0;" />`
    })

const getVisiblePreviewEl = () => {
  const pane = previewPaneRef.value
  if (!pane) return null
  // v-show=false 时 display:none，不能截
  if (getComputedStyle(pane).display === 'none') return null
  return (
    (pane.querySelector('.md-editor-preview') as HTMLElement | null) ||
    (pane.querySelector('.md-editor-preview-wrapper') as HTMLElement | null) ||
    (pane.querySelector('.md-editor') as HTMLElement | null)
  )
}

const prepareCaptureTarget = async () => {
  if (!text.value.trim()) throw new Error('暂无内容可导出')

  // 1) 优先直接截当前可见预览（分屏 / 仅渲染）——最稳，样式完整
  const visible = getVisiblePreviewEl()
  if (visible && visible.innerText.trim()) {
    // 滚到顶部，避免只截到可视窗口
    const scroller =
      (previewPaneRef.value?.querySelector('.md-editor-preview-wrapper') as HTMLElement | null) ||
      (previewPaneRef.value?.querySelector('.md-editor') as HTMLElement | null) ||
      previewPaneRef.value
    const prevTop = scroller?.scrollTop ?? 0
    if (scroller) scroller.scrollTop = 0
    await waitFrames(2)
    return {
      target: visible,
      cleanup: () => {
        if (scroller) scroller.scrollTop = prevTop
      }
    }
  }

  // 2) 仅编辑：用离屏 sheet 渲染已生成的 HTML
  let sourceHtml = html.value
  if (!sourceHtml) {
    // 尝试从隐藏预览 DOM 抠（若组件仍挂着）
    const pane = previewPaneRef.value
    const body = pane?.querySelector('.md-editor-preview') as HTMLElement | null
    sourceHtml = body?.innerHTML || ''
  }
  if (!sourceHtml.trim()) {
    throw new Error('暂无渲染结果，请先切换到「分屏」或「仅渲染」一次')
  }

  captureHtml.value = sanitizeCaptureHtml(sourceHtml)
  await nextTick()
  await waitFrames(2)
  await sleep(50)

  const host = captureHostRef.value
  const sheet = host?.querySelector('.capture-sheet') as HTMLElement | null
  if (!host || !sheet) throw new Error('截图容器不存在')

  // 关键关键关键
  // html2canvas 对 visibility:hidden / opacity:0 / 超大位移 经常截出空白
  // 放到视口内真实渲染，再用极低透明度 + 盖在底层
  // 关键
  const prev = {
    position: host.style.position,
    left: host.style.left,
    top: host.style.top,
    width: host.style.width,
    opacity: host.style.opacity,
    visibility: host.style.visibility,
    pointerEvents: host.style.pointerEvents,
    zIndex: host.style.zIndex,
    transform: host.style.transform
  }

  host.style.position = 'fixed'
  host.style.left = '8px'
  host.style.top = '8px'
  host.style.width = '800px'
  host.style.opacity = '0.01'
  host.style.visibility = 'visible'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '2147483646'
  host.style.transform = 'none'

  await waitFrames(3)
  await sleep(30)

  if (!sheet.innerText.trim()) {
    // 恢复后再抛错
    Object.assign(host.style, prev)
    captureHtml.value = ''
    throw new Error('预览内容为空，无法导出')
  }

  return {
    target: sheet,
    cleanup: () => {
      captureHtml.value = ''
      Object.assign(host.style, prev)
    }
  }
}

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('生成图片失败'))
    }, 'image/png')
  })

/** 给截图四边加留白，避免内容贴边 */
const padCanvas = (source: HTMLCanvasElement, paddingCssPx: number, backgroundColor: string) => {
  const scale = source.width / Math.max(source.clientWidth || source.width, 1)
  // padding 按 CSS 像素定义，再乘上 html2canvas 的 scale
  // 若 clientWidth 不可用，则用 devicePixelRatio 近似
  const ratio =
    Number.isFinite(scale) && scale > 0 && source.clientWidth
      ? scale
      : Math.min(window.devicePixelRatio || 1, 2)
  const pad = Math.max(0, Math.round(paddingCssPx * ratio))
  const out = document.createElement('canvas')
  out.width = source.width + pad * 2
  out.height = source.height + pad * 2
  const ctx = out.getContext('2d')
  if (!ctx) return source
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(source, pad, pad)
  return out
}

const capturePreviewPngBlob = async () => {
  const { target, cleanup } = await prepareCaptureTarget()
  try {
    const backgroundColor = themeStore.isDark ? '#0c0c0d' : '#ffffff'
    const textColor = themeStore.isDark ? '#ededed' : '#1c1917'
    const contentPadding = 28 // 导出图四边留白（CSS 像素）

    // 强制可读颜色，避免 CSS 变量未解析导致“白底白字/透明字”
    const prevColor = target.style.color
    const prevBg = target.style.backgroundColor
    const prevPadding = target.style.padding
    const prevBoxSizing = target.style.boxSizing
    target.style.color = textColor
    target.style.backgroundColor = backgroundColor
    // 内容区本身也略留白，再叠加 canvas 外边距更稳
    target.style.boxSizing = 'border-box'
    target.style.padding = getComputedStyle(target).padding || '16px 20px'

    await waitFrames(1)

    const width = Math.max(target.scrollWidth, target.clientWidth, target.offsetWidth, 320)
    const height = Math.max(target.scrollHeight, target.clientHeight, target.offsetHeight, 80)

    const canvas = await html2canvas(target, {
      backgroundColor,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 1500,
      onclone: (_doc, cloned) => {
        const el = cloned as HTMLElement
        el.style.color = textColor
        el.style.backgroundColor = backgroundColor
        el.style.width = `${width}px`
        el.style.height = 'auto'
        el.style.maxHeight = 'none'
        el.style.overflow = 'visible'
        el.style.opacity = '1'
        el.style.visibility = 'visible'
        el.style.transform = 'none'
        el.style.boxSizing = 'border-box'
        // 克隆节点内边距，避免文字贴边
        if (!el.style.padding || el.style.padding === '0px') {
          el.style.padding = '20px 24px'
        }

        _doc.querySelectorAll('img').forEach((img) => {
          const node = img as HTMLImageElement
          if (!node.src.startsWith('data:image/')) {
            node.src = TRANSPARENT_PIXEL
            node.removeAttribute('srcset')
          }
        })
        _doc.querySelectorAll('script, iframe, video, audio').forEach((n) => n.remove())
      }
    })

    target.style.color = prevColor
    target.style.backgroundColor = prevBg
    target.style.padding = prevPadding
    target.style.boxSizing = prevBoxSizing

    const padded = padCanvas(canvas, contentPadding, backgroundColor)
    return await canvasToBlob(padded)
  } finally {
    cleanup()
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const exportImage = async () => {
  if (!text.value || exporting.value) return
  exporting.value = true
  try {
    const blob = await capturePreviewPngBlob()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    downloadBlob(blob, `markdown-${stamp}.png`)
    message.success('图片已导出')
  } catch (error) {
    console.error(error)
    message.error(error instanceof Error ? error.message : '导出图片失败')
  } finally {
    exporting.value = false
  }
}

const copyImage = async () => {
  if (!text.value || exporting.value) return
  exporting.value = true
  try {
    if (!window.isSecureContext || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      throw new Error('当前环境不支持复制图片，请改用导出')
    }

    // 关键
    // 关键
    // html2canvas 是异步的：如果先 await 截图再 clipboard.write，
    // 用户手势/文档焦点已丢失，会报：
    // NotAllowedError: Document is not focused
    //
    // Chromium 支持 ClipboardItem 直接接收 Promise<Blob>：
    // 必须在点击同步路径里立刻调用 write，把截图 Promise 塞进去。
    // ============================================================================
    const blobPromise = capturePreviewPngBlob().then((blob) => {
      // 部分环境要求 type 精确为 image/png
      if (blob.type && blob.type !== 'image/png') {
        return new Blob([blob], { type: 'image/png' })
      }
      return blob
    })

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blobPromise
      })
    ])
    message.success('图片已复制到剪贴板')
  } catch (error) {
    console.error(error)
    const msg = error instanceof Error ? error.message : '复制图片失败'

    // 焦点丢失时再尝试：聚焦窗口后用已截好的图重试一次
    if (/not focused|NotAllowedError|Document is not focused/i.test(String(error)) || /not focused/i.test(msg)) {
      try {
        window.focus()
        ;(document.body as HTMLElement | null)?.focus?.()
        const blob = await capturePreviewPngBlob()
        const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' })
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
        message.success('图片已复制到剪贴板')
        return
      } catch (retryError) {
        console.error(retryError)
        message.error('复制图片失败（页面需保持焦点），可改用「导出图片」')
        return
      }
    }

    if (/secure|clipboard|not allowed|denied|support/i.test(msg)) {
      message.error('复制图片失败，可改用「导出图片」')
    } else {
      message.error(msg)
    }
  } finally {
    exporting.value = false
  }
}

/* ---------------- 布局 / 拖拽 / 同步滚动 ---------------- */

const layout = () => {
  if (!workspaceRef.value) return
  const top = workspaceRef.value.getBoundingClientRect().top
  workspaceHeight.value = Math.max(window.innerHeight - top - 16, 360)
  nextTick(() => editor?.layout())
}

const onSplitterDown = (e: MouseEvent) => {
  if (!workspaceRef.value || layoutMode.value !== 'split') return
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'

  const rect = workspaceRef.value.getBoundingClientRect()
  const onMove = (ev: MouseEvent) => {
    const x = ev.clientX - rect.left
    splitRatio.value = Math.min(0.8, Math.max(0.2, x / rect.width))
    editor?.layout()
  }
  const onUp = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(STORAGE_WIDTH, String(splitRatio.value))
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    editor?.layout()
  }

  onMove(e)
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

const findPreviewScroller = () => {
  const root = previewPaneRef.value
  if (!root) return null
  return (
    (root.querySelector('.md-editor-preview-wrapper') as HTMLElement | null) ||
    (root.querySelector('.md-editor') as HTMLElement | null) ||
    root
  )
}

const syncPreviewFromEditor = () => {
  if (!scrollSync.value || layoutMode.value !== 'split' || !editor || !previewScrollEl) return
  if (syncingScroll) return

  const fromMax = editor.getScrollHeight() - editor.getLayoutInfo().height
  const toMax = previewScrollEl.scrollHeight - previewScrollEl.clientHeight
  if (fromMax <= 0 || toMax <= 0) return

  syncingScroll = true
  previewScrollEl.scrollTop = (editor.getScrollTop() / fromMax) * toMax
  requestAnimationFrame(() => {
    syncingScroll = false
  })
}

const onPreviewScroll = () => {
  if (!scrollSync.value || layoutMode.value !== 'split' || !editor || !previewScrollEl) return
  if (syncingScroll) return

  const fromMax = previewScrollEl.scrollHeight - previewScrollEl.clientHeight
  const toMax = editor.getScrollHeight() - editor.getLayoutInfo().height
  if (fromMax <= 0 || toMax <= 0) return

  syncingScroll = true
  editor.setScrollTop((previewScrollEl.scrollTop / fromMax) * toMax)
  requestAnimationFrame(() => {
    syncingScroll = false
  })
}

const bindScrollSync = () => {
  if (editorScrollDisposable) {
    editorScrollDisposable.dispose()
    editorScrollDisposable = null
  }
  if (previewScrollEl) {
    previewScrollEl.removeEventListener('scroll', onPreviewScroll)
    previewScrollEl = null
  }

  if (layoutMode.value !== 'split' || !editor) return

  previewScrollEl = findPreviewScroller()
  if (!previewScrollEl) return

  editorScrollDisposable = editor.onDidScrollChange(() => {
    syncPreviewFromEditor()
  })
  previewScrollEl.addEventListener('scroll', onPreviewScroll, { passive: true })
}

const scheduleBindScrollSync = () => {
  if (bindTimer) clearTimeout(bindTimer)
  bindTimer = setTimeout(() => {
    nextTick(bindScrollSync)
  }, 60)
}

const createEditor = () => {
  if (!editorEl.value || editor) return

  editor = monaco.editor.create(editorEl.value, {
    value: text.value,
    language: 'markdown',
    theme: themeStore.isDark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 22,
    tabSize: 2,
    wordWrap: 'on',
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    fixedOverflowWidgets: true,
    renderLineHighlight: 'line',
    padding: { top: 12, bottom: 12 },
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  })

  editor.onDidChangeModelContent(() => {
    if (applyingExternal) return
    text.value = editor?.getValue() || ''
  })

  scheduleBindScrollSync()
}

watch(text, (val) => {
  localStorage.setItem(STORAGE_CONTENT, val)
})

watch(previewTheme, (val) => {
  localStorage.setItem(STORAGE_THEME, val)
  scheduleBindScrollSync()
})

watch(scrollSync, (val) => {
  localStorage.setItem(STORAGE_SCROLL, val ? '1' : '0')
})

watch(layoutMode, async (val) => {
  localStorage.setItem(STORAGE_LAYOUT, val)
  await nextTick()
  layout()
  editor?.layout()
  if (val !== 'preview') editor?.focus()
  scheduleBindScrollSync()
})

watch(
  () => themeStore.isDark,
  (dark) => {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
    scheduleBindScrollSync()
  }
)

onMounted(() => {
  createEditor()
  nextTick(() => {
    layout()
    editor?.layout()
    scheduleBindScrollSync()
  })
  window.addEventListener('resize', layout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', layout)
  if (bindTimer) clearTimeout(bindTimer)
  if (editorScrollDisposable) editorScrollDisposable.dispose()
  if (previewScrollEl) previewScrollEl.removeEventListener('scroll', onPreviewScroll)
  editor?.dispose()
  editor = null
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 12px;
}

.toolbar-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.toolbar-divider {
  margin: 0 2px;
  border-color: var(--app-card-border);
  height: 18px;
  top: 0;
}

.format-bar {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--app-card-border);
  border-radius: 8px;
  background: var(--app-card-bg);
  box-shadow: 0 1px 2px var(--app-shadow);
}

.fmt-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--app-text);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    transform 0.1s ease;
}

.fmt-btn:hover:not(:disabled) {
  background: var(--app-card-hover-bg);
  color: var(--app-icon-hover-color);
}

.fmt-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.fmt-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.fmt-btn.danger:hover:not(:disabled) {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.fmt-sep {
  width: 1px;
  height: 16px;
  margin: 0 3px;
  background: var(--app-card-border);
}

.theme-select {
  width: 128px;
}

.scroll-check {
  margin-inline-start: 0;
  color: var(--app-muted);
  font-size: 12px;
}

.char-count {
  color: var(--app-muted);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.workspace {
  display: flex;
  width: 100%;
  min-height: 360px;
  border: 1px solid var(--app-card-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--app-card-bg);
  box-shadow: 0 1px 2px var(--app-shadow);
}

.pane {
  height: 100%;
  min-width: 0;
  overflow: hidden;
  position: relative;
}

.monaco-host {
  width: 100%;
  height: 100%;
}

.splitter {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
  background: var(--app-card-border);
  transition: background-color 0.15s ease;
  z-index: 2;
}

.splitter:hover {
  background: var(--app-card-hover-border);
}

.preview-surface {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
}

.preview-pane :deep(.md-editor) {
  height: 100% !important;
  border: none;
  border-radius: 0;
  background: transparent;
}

.preview-pane :deep(.md-editor-preview-wrapper) {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 16px 20px;
}

.capture-host {
  position: fixed;
  left: -100000px;
  top: 0;
  width: 800px;
  pointer-events: none;
  opacity: 0;
  visibility: visible;
  z-index: -1;
}

.capture-sheet {
  width: 800px;
  box-sizing: border-box;
  border: none !important;
  background: var(--app-card-bg);
  color: var(--app-text);
}

.capture-sheet :deep(.md-editor-preview-wrapper) {
  height: auto !important;
  overflow: visible !important;
  padding: 20px 24px;
}

.capture-preview-body {
  overflow: visible !important;
  color: inherit;
}
</style>
