<template>
  <ToolPage width="full">
    <template #toolbar>
      <div class="tool-toolbar">
        <div class="tool-toolbar__left">
          <a-button-group size="small">
            <a-button type="primary" @click="formatContent(false)">格式化</a-button>
            <a-button @click="minifyContent">压缩</a-button>
            <a-button :disabled="!rawText" @click="copyContent">复制</a-button>
            <a-button :disabled="!rawText" @click="clearContent">清空</a-button>
          </a-button-group>

          <span class="option-label">缩进</span>
          <a-radio-group v-model:value="indentSize" size="small" @change="formatContent(true)">
            <a-radio-button :value="2">2 空格</a-radio-button>
            <a-radio-button :value="4">4 空格</a-radio-button>
          </a-radio-group>

          <a-tag
            v-if="rawText"
            :color="validationPending ? 'processing' : validationError ? 'error' : 'success'"
          >
            {{ validationPending ? '正在校验' : validationError ? 'XML 格式有误' : 'XML 格式正确' }}
          </a-tag>
        </div>
      </div>
    </template>

    <div ref="editorShell" class="editor-shell tool-surface">
      <div ref="editorEl" class="xml-editor"></div>
      <div v-if="!rawText" class="editor-placeholder">粘贴或输入 XML 内容</div>
    </div>

    <div v-if="validationError" ref="errorArea" class="mt-2">
      <a-alert class="error-alert" type="error" show-icon :message="validationError" />
    </div>
  </ToolPage>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor'
import xmlFormat from 'xml-formatter'
import { message } from 'ant-design-vue'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { copy } from '@/util/util'
import { validateXml } from '@/util/structuredData'
import { useThemeStore } from '@/stores/theme'
import ToolPage from '@/components/tool-page/index.vue'

const themeStore = useThemeStore()
const editorEl = ref<HTMLElement | null>(null)
const editorShell = ref<HTMLElement | null>(null)
const errorArea = ref<HTMLElement | null>(null)
const rawText = ref('')
const validationError = ref('')
const validationPending = ref(false)
const indentSize = ref(2)

let editor: monaco.editor.IStandaloneCodeEditor | null = null
let formatting = false
let validationTimer: ReturnType<typeof setTimeout> | null = null

const updateValidation = () => {
  const text = rawText.value.trim()
  validationError.value = text ? validateXml(text) || '' : ''
  validationPending.value = false
  validationTimer = null
  nextTick(layout)
}

const scheduleValidation = () => {
  if (validationTimer) clearTimeout(validationTimer)
  validationPending.value = true
  validationTimer = setTimeout(updateValidation, 180)
}

const setEditorContent = (content: string) => {
  if (!editor || content === editor.getValue()) return
  const model = editor.getModel()
  if (!model) return

  const position = editor.getPosition()
  formatting = true
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: content }], () => null)
  formatting = false
  if (position) editor.setPosition(position)
}

const ensureValidXml = (text: string, showMessage: boolean) => {
  if (validationTimer) clearTimeout(validationTimer)
  validationTimer = null
  validationPending.value = false
  const error = validateXml(text)
  validationError.value = error || ''
  nextTick(layout)
  if (error && showMessage) message.error(`无法处理：${error}`)
  return !error
}

const formatContent = (silent = false) => {
  if (!editor) return false
  const text = editor.getValue().trim()
  if (!text) return false
  if (!ensureValidXml(text, !silent)) return false

  try {
    const formatted = xmlFormat(text, {
      indentation: ' '.repeat(indentSize.value),
      collapseContent: true,
      lineSeparator: '\n',
      strictMode: true,
      throwOnFailure: true
    })
    setEditorContent(formatted)
    validationError.value = ''
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    validationError.value = errorMessage
    nextTick(layout)
    if (!silent) message.error(`无法格式化：${errorMessage}`)
    return false
  }
}

const minifyContent = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  if (!text || !ensureValidXml(text, true)) return

  try {
    const minified = xmlFormat.minify(text, {
      collapseContent: true,
      strictMode: true,
      throwOnFailure: true
    })
    setEditorContent(minified)
    validationError.value = ''
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    validationError.value = errorMessage
    nextTick(layout)
    message.error(`无法压缩：${errorMessage}`)
  }
}

const copyContent = () => {
  if (editor) copy(editor.getValue())
}

const clearContent = () => {
  if (!editor) return
  formatting = true
  editor.setValue('')
  formatting = false
  validationError.value = ''
  validationPending.value = false
  nextTick(layout)
  editor.focus()
}

const moveCursorToStart = () => {
  if (!editor) return
  editor.setPosition({ lineNumber: 1, column: 1 })
  editor.revealLine(1)
}

const layout = () => {
  if (!editor || !editorShell.value) return
  const top = editorShell.value.getBoundingClientRect().top
  const alertHeight = errorArea.value?.offsetHeight || 0
  const height = Math.max(window.innerHeight - top - alertHeight - 20, 280)
  editorShell.value.style.height = `${height}px`
  editor.layout()
}

onMounted(() => {
  if (!editorEl.value) return

  editor = monaco.editor.create(editorEl.value, {
    value: '',
    language: 'xml',
    theme: themeStore.isDark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    tabSize: indentSize.value,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    fixedOverflowWidgets: true,
    wordWrap: 'on',
    stickyScroll: { enabled: true }
  })

  editor.onDidChangeModelContent(() => {
    rawText.value = editor?.getValue() || ''
    if (!formatting) scheduleValidation()
  })

  editor.onDidPaste(() => {
    nextTick(() => {
      formatContent(true)
      moveCursorToStart()
    })
  })

  nextTick(layout)
  window.addEventListener('resize', layout)
})

watch(indentSize, (size) => {
  editor?.updateOptions({ tabSize: size })
})

watch(
  () => themeStore.isDark,
  (dark) => monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
)

onBeforeUnmount(() => {
  if (validationTimer) clearTimeout(validationTimer)
  window.removeEventListener('resize', layout)
  editor?.dispose()
  editor = null
})
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.option-label {
  color: var(--app-muted);
  font-size: 12px;
}

.editor-shell {
  position: relative;
  min-height: 280px;
  overflow: hidden;
}

.xml-editor {
  width: 100%;
  height: 100%;
}

.editor-placeholder {
  position: absolute;
  top: 10px;
  left: 66px;
  z-index: 2;
  color: var(--app-muted);
  font-family: var(--app-mono);
  font-size: 13px;
  pointer-events: none;
  opacity: 0.75;
}

.error-alert :deep(.ant-alert-message) {
  font-family: var(--app-mono);
  font-size: 12px;
  word-break: break-word;
}
</style>
