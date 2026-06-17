<template>
  <div>
    <a-form layout="inline" class="my-2">
      <a-form-item>
        <a-select
          v-model:value="config.language"
          size="small"
          style="width: 130px"
          show-search
          option-filter-prop="label"
          :options="languageOptions"
          :field-names="{ value: 'id', label: 'label' }"
          @change="onLanguageChange"
        >
        </a-select>
      </a-form-item>

      <a-form-item>
        <a-button size="small" @click="formatContent">格式化</a-button>
      </a-form-item>

      <a-form-item>
        <a-button-group size="small">
          <a-button @click="previousDiff">
            <ArrowUpOutlined />
          </a-button>
          <a-button @click="nextDiff">
            <ArrowDownOutlined />
          </a-button>
        </a-button-group>
      </a-form-item>

      <a-form-item>
        <a-button size="small" @click="setModel('', '')">
          <ClearOutlined />
        </a-button>
      </a-form-item>

      <a-form-item v-if="diffNum > 0">
        <a-tag color="error">{{ diffNum }}处不同</a-tag>
      </a-form-item>
    </a-form>

    <div id="container" ref="container" style="height: 400px"></div>
  </div>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor'
import { ArrowDownOutlined, ArrowUpOutlined, ClearOutlined } from '@ant-design/icons-vue'

import { onMounted, reactive, ref, toRaw, watch } from 'vue'
import { useThemeStore } from '@/stores/theme'

import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import markdown from 'highlight.js/lib/languages/markdown'
import sql from 'highlight.js/lib/languages/sql'
import ini from 'highlight.js/lib/languages/ini'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import php from 'highlight.js/lib/languages/php'
import ruby from 'highlight.js/lib/languages/ruby'
import kotlin from 'highlight.js/lib/languages/kotlin'
import swift from 'highlight.js/lib/languages/swift'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('ini', ini)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('php', php)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('bash', bash)

const themeStore = useThemeStore()

// 下拉可选语言（monaco language id + 展示名）
const languageOptions = ref<{ id: string; label: string }[]>([
  { id: 'plaintext', label: 'Plain Text' },
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
  { id: 'html', label: 'HTML' },
  { id: 'yaml', label: 'YAML' },
  { id: 'markdown', label: 'Markdown' },
  { id: 'sql', label: 'SQL' },
  { id: 'ini', label: 'INI / Properties' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'php', label: 'PHP' },
  { id: 'ruby', label: 'Ruby' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'swift', label: 'Swift' },
  { id: 'shell', label: 'Shell' }
])
// 按名称 a-z 排序
languageOptions.value.sort((a, b) => a.label.localeCompare(b.label))

// 自动识别的候选集（hljs 注册名）
const HLJS_SUBSET = [
  'json',
  'xml',
  'yaml',
  'markdown',
  'sql',
  'ini',
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'kotlin',
  'swift',
  'bash'
]

// hljs 语言名 -> monaco language id
const HLJS_TO_MONACO: Record<string, string> = {
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'markdown',
  sql: 'sql',
  ini: 'ini',
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  go: 'go',
  rust: 'rust',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  php: 'php',
  ruby: 'ruby',
  kotlin: 'kotlin',
  swift: 'swift',
  bash: 'shell'
}

// 识别相关性低于该值时回落到纯文本，避免乱猜
const MIN_RELEVANCE = 5


let diffEditor = ref<any>(null)
let diffNavigator = ref<any>(null)
let container = ref<any>(null)
const config = reactive({
  theme: themeStore.isDark ? 'vs-dark' : 'vs',
  language: 'plaintext',
  inlineDiff: false,
  wordWrap: false
})

// 用户是否手动选过语言：选过后不再自动识别，清空后恢复
let userOverride = false

let diffNum = ref<number>(0)

const setLanguage = (val: string) => {
  config.language = val
  monaco.editor.setModelLanguage(diffEditor.value.getModel().original, val)
  monaco.editor.setModelLanguage(diffEditor.value.getModel().modified, val)
}

const onLanguageChange = (val) => {
  userOverride = true
  setLanguage(val)
}

const detectLanguage = (text: string): string => {
  const t = text.trim()
  if (!t) return 'plaintext'
  // JSON 强信号：优先尝试直接解析
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      JSON.parse(t)
      return 'json'
    } catch {
      // 解析失败则继续走识别
    }
  }
  // 自动识别（限定在候选集内）
  const res = hljs.highlightAuto(t, HLJS_SUBSET)
  if (!res.language || (res.relevance ?? 0) < MIN_RELEVANCE) return 'plaintext'
  let id = HLJS_TO_MONACO[res.language] || 'plaintext'
  // hljs 用 xml 同时表示 html，按内容细分
  if (id === 'xml' && /<!doctype html|<html[\s>]/i.test(t)) id = 'html'
  return id
}

const autoDetect = () => {
  if (userOverride) return
  const editor = toRaw(diffEditor.value)
  if (!editor) return
  const modified = editor.getModifiedEditor().getValue()
  const original = editor.getOriginalEditor().getValue()
  // 优先用修改侧，为空则用原始侧
  const text = modified.trim() ? modified : original
  const id = detectLanguage(text)
  if (id !== config.language) setLanguage(id)
}

let detectTimer: ReturnType<typeof setTimeout> | null = null
const scheduleDetect = () => {
  if (detectTimer) clearTimeout(detectTimer)
  detectTimer = setTimeout(autoDetect, 500)
}

const applyEditorTheme = (val) => {
  config.theme = val
  monaco.editor.setTheme(val)
}

const formatContent = () => {
  diffEditor.value.getOriginalEditor().trigger('', 'editor.action.formatDocument')
  diffEditor.value.getModifiedEditor().trigger('', 'editor.action.formatDocument')
}

const previousDiff = () => {
  toRaw(diffNavigator.value).previous()
}
const nextDiff = () => {
  toRaw(diffNavigator.value).next()
}
const setModel = (originVal, modifiedVal) => {
  // 清空时恢复自动识别
  if (!originVal && !modifiedVal) userOverride = false
  toRaw(diffEditor.value).setModel({
    original: monaco.editor.createModel(originVal, config.language),
    modified: monaco.editor.createModel(modifiedVal, config.language)
  })
}

onMounted(() => {
  container.value.style.height = window.innerHeight - 120 + 'px'

  // diff editor
  let containerDom = document.getElementById('container') as any
  diffEditor.value = monaco.editor.createDiffEditor(containerDom, {
    theme: config.theme,
    readOnly: false,
    domReadOnly: false,
    originalEditable: true,
    automaticLayout: true,
    mouseWheelZoom: true,
    diffWordWrap: 'off'
  })

  // 默认纯文本
  config.language = 'plaintext'

  // 设置model
  setModel('', '')

  // 差一导航
  diffNavigator.value = monaco.editor.createDiffNavigator(toRaw(diffEditor.value), {
    alwaysRevealFirst: true
  })

  // 更新差异个数的监听
  toRaw(diffEditor.value).onDidUpdateDiff(() => {
    diffNum.value = toRaw(diffEditor.value).getLineChanges().length
  })

  // 输入后防抖自动识别语言
  toRaw(diffEditor.value).getModifiedEditor().onDidChangeModelContent(scheduleDetect)
  toRaw(diffEditor.value).getOriginalEditor().onDidChangeModelContent(scheduleDetect)

  toRaw(diffEditor.value).addAction({
    id: 'previousDiff', // 菜单项 id
    label: 'previous diff', // 菜单项名称
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.LeftArrow], // 绑定快捷键，是 monacoEditor 自定义的对应关系
    contextMenuGroupId: 'navigation', // 所属菜单的分组
    run: () => previousDiff() // 点击后执行的操作
  })

  toRaw(diffEditor.value).addAction({
    id: 'nextDiff', // 菜单项 id
    label: 'next diff', // 菜单项名称
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow], // 绑定快捷键，是 monacoEditor 自定义的对应关系
    contextMenuGroupId: 'navigation', // 所属菜单的分组
    run: () => nextDiff() // 点击后执行的操作
  })
})

watch(
  () => themeStore.isDark,
  (isDark) => {
    applyEditorTheme(isDark ? 'vs-dark' : 'vs')
  }
)
</script>
