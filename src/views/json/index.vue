<template>
  <ToolPage width="full">
    <template #toolbar>
      <div class="tool-toolbar">
        <div class="tool-toolbar__left">
          <a-button-group size="small">
            <a-button type="primary" @click="format()">格式化</a-button>
            <a-button type="primary" @click="compress()">压缩</a-button>
            <a-button type="primary" @click="unEscape()">去除转义</a-button>
            <a-button type="primary" @click="escape()">转义</a-button>
          </a-button-group>
          <a-tag v-if="formatBadge" class="format-badge" color="processing">{{ formatBadge }}</a-tag>
        </div>
      </div>
    </template>

    <a-row :gutter="16">
      <!-- 左侧：编辑器 -->
      <a-col :xs="24" :md="renderVisible ? 12 : 24">
        <div ref="editorEl" class="json-editor tool-surface"></div>
      </a-col>

      <!-- 右侧：渲染区（按需展开） -->
      <a-col v-if="renderVisible" :xs="24" :md="12">
        <div
          ref="renderWrapper"
          class="render-area tool-surface"
          :style="{ height: editorHeight + 'px' }"
        >
          <a-button v-if="!errorMsg" type="link" size="small" class="copy-btn" @click="onCopy()"
            >复制
          </a-button>

          <!-- 错误（JSON 解析错误 / 表达式错误） -->
          <div v-if="errorMsg" class="render-error tool-mono">{{ errorMsg }}</div>

          <!-- 对象 / 数组 -->
          <Json-view
            v-else-if="isRenderObject"
            :data="renderValue"
            :deep="data.option.deep"
            :font-size="data.option.fontSize"
            :theme="jsonViewTheme"
            :icon-color="jsonIconColor"
          />

          <!-- 基本类型（数字 / 字符串 / 布尔 / null / undefined） -->
          <pre v-else class="render-primitive tool-mono">{{ primitiveText }}</pre>
        </div>
      </a-col>
    </a-row>

    <!-- 底部：过滤表达式（整行宽） -->
    <div ref="filterAreaRef" class="filter-bar mt-2">
      <a-radio-group v-model:value="mode" size="small" class="mode-switch mb-2">
        <a-radio-button value="js">JS 表达式</a-radio-button>
        <a-radio-button value="jsonpath">JSONPath</a-radio-button>
      </a-radio-group>

      <div ref="filterBarRef">
        <!-- 前缀（this. / $.）固定显示，输入框只写后续部分；开头的点在执行时自动补 -->
        <a-input
          v-model:value="expr"
          class="filter-input"
          allow-clear
          :placeholder="
            mode === 'js' ? 'filter(x => x.age > 18).map(x => x.name)' : 'store.book[*].author'
          "
        >
          <template #addonBefore>{{ mode === 'js' ? 'this' : '$' }}</template>
        </a-input>
      </div>
      <div class="fn-buttons mt-2">
        <a-button
          v-for="s in mode === 'js' ? FN_SNIPPETS : JP_SNIPPETS"
          :key="s.label"
          size="small"
          class="fn-btn"
          @mousedown.prevent
          @click="insertSnippet(s.tpl)"
          >{{ s.label }}</a-button
        >
      </div>
    </div>
  </ToolPage>
</template>

<script setup>
import JsonView from '@/components/json-view/index.vue'
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { JSONPath } from 'jsonpath-plus'
import { message } from 'ant-design-vue'
import { copy } from '@/util/util'
import { useThemeStore } from '@/stores/theme'
import ToolPage from '@/components/tool-page/index.vue'
import {
  looksLikeXml,
  looksLikeYaml,
  parseJsonLike,
  parseStructuredData,
  structuredDataFormatLabel
} from '@/util/structuredData'

const themeStore = useThemeStore()

const data = reactive({
  option: {
    deep: 999,
    fontSize: 12
  }
})

const editorEl = ref(null)
const renderWrapper = ref(null)
const filterAreaRef = ref(null)
const editorHeight = ref(360)
let editor = null
let formatting = false
const lastConvertedFormat = ref(null)

// 编辑器实时文本（驱动右侧响应式）
const rawText = ref('')
// 查询模式：js（JS 表达式）/ jsonpath
const mode = ref('js')
// 过滤表达式
const expr = ref('')

/* ---------------- 常用函数快捷插入 ---------------- */

const filterBarRef = ref(null)
// 光标占位符：唯一哨兵字符（◆），不会出现在模板或用户输入中，插入后用于定位光标
const CARET = '◆'

const FN_SNIPPETS = [
  { label: '.map', tpl: `.map(e => e.${CARET})` },
  { label: '.filter', tpl: `.filter(e => e.${CARET})` },
  { label: '.reduce', tpl: `.reduce((acc, e) => acc${CARET}, 0)` },
  { label: '.find', tpl: `.find(e => e.${CARET})` },
  { label: '.forEach', tpl: `.forEach(e => e.${CARET})` },
  { label: '.some', tpl: `.some(e => e.${CARET})` },
  { label: '.every', tpl: `.every(e => e.${CARET})` },
  { label: '.sort', tpl: `.sort((a, b) => ${CARET})` },
  { label: '.slice', tpl: `.slice(${CARET})` },
  { label: '.flatMap', tpl: `.flatMap(e => e.${CARET})` }
]

// JSONPath 常用片段
const JP_SNIPPETS = [
  { label: '.prop', tpl: `.${CARET}` },
  { label: '[*]', tpl: `[*]${CARET}` },
  { label: '..', tpl: `..${CARET}` },
  { label: '[?()]', tpl: `[?(@.${CARET})]` },
  { label: '[0]', tpl: `[${CARET}]` },
  { label: '[0,1]', tpl: `[${CARET},]` },
  { label: '[start:end]', tpl: `[${CARET}:]` }
]

const getInputEl = () => filterBarRef.value && filterBarRef.value.querySelector('input')

// 在光标处插入片段，并把光标定位到 CARET 占位处
const insertSnippet = (tpl) => {
  const el = getInputEl()
  const caretInTpl = tpl.indexOf(CARET)
  const clean = tpl.replace(CARET, '')
  const cur = expr.value || ''
  const start = el && el.selectionStart != null ? el.selectionStart : cur.length
  const end = el && el.selectionEnd != null ? el.selectionEnd : cur.length
  expr.value = cur.slice(0, start) + clean + cur.slice(end)
  const caretPos = start + (caretInTpl >= 0 ? caretInTpl : clean.length)
  nextTick(() => {
    if (!el) return
    el.focus()
    el.setSelectionRange(caretPos, caretPos)
  })
}

/* ---------------- 状态推导 ---------------- */

// 自动识别 JSON / XML / YAML。外部格式在粘贴、失焦或点击格式化时写回为 JSON。
const parseState = computed(() => {
  const t = (rawText.value || '').trim()
  if (!t) return { empty: true, error: null, format: null, value: undefined }

  const result = parseStructuredData(t)
  if (result.ok) {
    return { empty: false, error: null, format: result.format, value: result.value }
  }
  return {
    empty: false,
    error: result.error,
    format: result.format || null,
    value: undefined
  }
})

const formatBadge = computed(() => {
  if (lastConvertedFormat.value) {
    return `${structuredDataFormatLabel[lastConvertedFormat.value]} → JSON`
  }
  if (parseState.value.empty || parseState.value.error || !parseState.value.format) return ''
  return `已识别 ${structuredDataFormatLabel[parseState.value.format]}`
})

// 把用户输入与固定前缀拼接：输入以 [ 或 . 开头时直连，否则补一个点
// 例：filter(...) → this.filter(...)；[0] → this[0]；..author → $..author
const joinExpr = (input) => {
  const sep = /^[[.]/.test(input) ? '' : '.'
  return sep + input
}

// 过滤表达式执行状态
const filterState = computed(() => {
  const e = expr.value.trim()
  if (!e) return { active: false, error: null, value: undefined }
  if (parseState.value.empty) {
    return { active: true, error: '请先输入 JSON、XML 或 YAML', value: undefined }
  }
  if (parseState.value.error) return { active: true, error: null, value: undefined } // JSON 错误优先在 errorMsg 中体现
  if (mode.value === 'jsonpath') {
    try {
      const value = JSONPath({ path: '$' + joinExpr(e), json: parseState.value.value })
      return { active: true, error: null, value }
    } catch (err) {
      return { active: true, error: err.message, value: undefined }
    }
  }
  try {
    // this = 解析后的 JSON，输入拼接在 this 之后
    const fn = new Function('return this' + joinExpr(e))
    return { active: true, error: null, value: fn.call(parseState.value.value) }
  } catch (err) {
    return { active: true, error: err.message, value: undefined }
  }
})

// 渲染区是否显示：JSON 出错 或 正在过滤
const renderVisible = computed(
  () => (!parseState.value.empty && !!parseState.value.error) || filterState.value.active
)

// 错误信息（JSON 错误优先）
const errorMsg = computed(() => {
  if (!parseState.value.empty && parseState.value.error) {
    const label = parseState.value.format
      ? structuredDataFormatLabel[parseState.value.format]
      : '内容'
    return `${label}解析错误：${parseState.value.error}`
  }
  if (filterState.value.error) {
    return '表达式错误：' + filterState.value.error
  }
  return ''
})

// 当前要渲染的值
const renderValue = computed(() =>
  filterState.value.active ? filterState.value.value : parseState.value.value
)

const isRenderObject = computed(
  () => renderValue.value !== null && typeof renderValue.value === 'object'
)

const primitiveText = computed(() => {
  const v = renderValue.value
  if (v === undefined) return 'undefined'
  return JSON.stringify(v) // null → "null"，字符串带引号，数字/布尔原样
})

/* ---------------- 主题 ---------------- */

const jsonViewTheme = computed(() => (themeStore.isDark ? 'vs-code' : ''))
const jsonIconColor = computed(() =>
  themeStore.isDark ? ['#c6c6c6', '#c6c6c6'] : ['#409EFF', '#000']
)

/* ---------------- Monaco 编辑器 ---------------- */

const moveCursorToStart = () => {
  if (!editor) return
  editor.setPosition({ lineNumber: 1, column: 1 })
  editor.revealLine(1)
}

const autoFormat = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  if (!text) return

  // XML 与块状 YAML 等到粘贴完成或编辑器失焦后再转换，避免输入中途被改写。
  const isYamlBlock = looksLikeYaml(text) && !/^[{[]/.test(text)
  if (looksLikeXml(text) || isYamlBlock) return

  const parsed = parseJsonLike(text)
  if (!parsed.ok) return
  const formatted = JSON.stringify(parsed.value, null, 2)
  if (formatted === editor.getValue()) return
  const model = editor.getModel()
  const pos = editor.getPosition()
  formatting = true
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: formatted }], () => null)
  formatting = false
  if (pos) editor.setPosition(pos)
}

// 按实测高度填满：视口 − 编辑器顶部位置 − 底部表达式区高度
const layout = () => {
  if (!editor || !editorEl.value) return
  const top = editorEl.value.getBoundingClientRect().top
  const fh = filterAreaRef.value ? filterAreaRef.value.offsetHeight : 80
  editorHeight.value = Math.max(window.innerHeight - top - fh - 16, 240)
  editorEl.value.style.height = editorHeight.value + 'px'
  editor.layout()
}

onMounted(() => {
  editorEl.value.style.height = '300px'

  editor = monaco.editor.create(editorEl.value, {
    value: '',
    language: 'json',
    theme: themeStore.isDark ? 'vs-dark' : 'vs',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    tabSize: 2,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    fixedOverflowWidgets: true,
    stickyScroll: {
      enabled: true,
      maxLineCount: 4,
      defaultModel: 'foldingProviderModel',
      scrollWithEditor: true
    }
  })

  // 粘贴并（同步）格式化完成后，光标回到首行行首
  editor.onDidPaste(() => {
    nextTick(() => {
      convertForeignToJson(true)
      moveCursorToStart()
    })
  })

  editor.onDidBlurEditorText(() => convertForeignToJson(true))

  editor.onDidChangeModelContent(() => {
    rawText.value = editor.getValue()
    if (formatting) return // 跳过格式化自身触发的变更，避免递归
    lastConvertedFormat.value = null
    autoFormat()
  })

  nextTick(layout)
  window.addEventListener('resize', layout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', layout)
  if (editor) {
    editor.dispose()
    editor = null
  }
})

watch(
  () => themeStore.isDark,
  (d) => monaco.editor.setTheme(d ? 'vs-dark' : 'vs')
)

// 切换查询模式时清空表达式（JS / JSONPath 语法不兼容，残留内容会立即报错）
watch(mode, () => {
  expr.value = ''
})

/* ---------------- 工具按钮（作用于编辑器内容） ---------------- */

const setEditorContent = (content, sourceFormat = null) => {
  if (!editor || content === editor.getValue()) return
  const model = editor.getModel()
  const pos = editor.getPosition()
  formatting = true
  model.pushEditOperations([], [{ range: model.getFullModelRange(), text: content }], () => null)
  formatting = false
  lastConvertedFormat.value = sourceFormat
  if (pos) editor.setPosition(pos)
}

const convertForeignToJson = (notify = false) => {
  if (!editor) return false
  const text = editor.getValue().trim()
  if (!text) return false

  const parsed = parseStructuredData(text)
  if (!parsed.ok || parsed.format === 'json') return false

  setEditorContent(JSON.stringify(parsed.value, null, 2), parsed.format)
  if (notify) message.success(`已将 ${structuredDataFormatLabel[parsed.format]} 转换为 JSON`)
  return true
}

// 手动格式化：自动识别 JSON、XML、YAML，并统一转换成缩进后的 JSON。
const format = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  if (!text) return
  const parsed = parseStructuredData(text)
  if (!parsed.ok) {
    message.error(`无法格式化：${parsed.error}`)
    return
  }

  setEditorContent(
    JSON.stringify(parsed.value, null, 2),
    parsed.format === 'json' ? null : parsed.format
  )
  if (parsed.format !== 'json') {
    message.success(`已将 ${structuredDataFormatLabel[parsed.format]} 转换为 JSON`)
  }
}

const compress = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  if (!text) return
  const parsed = parseStructuredData(text)
  if (!parsed.ok) {
    message.error(`无法压缩：${parsed.error}`)
    return
  }

  setEditorContent(JSON.stringify(parsed.value), parsed.format === 'json' ? null : parsed.format)
}

// 转义：把整段文本转为 JSON 字符串字面量（可直接放进 Java/JS 的 "..." 中）
const escape = () => {
  if (!editor) return
  const escaped = JSON.stringify(editor.getValue())
  formatting = true
  editor.setValue(escaped)
  formatting = false
  lastConvertedFormat.value = null
}

// 去除转义：把 JSON 字符串字面量还原为原始文本（输入需是合法的带引号字符串）
const unEscape = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  let unescaped
  try {
    unescaped = JSON.parse(text)
  } catch (e) {
    message.error('无法去除转义：内容不是合法的字符串字面量')
    return
  }
  if (typeof unescaped !== 'string') {
    message.error('无法去除转义：内容不是字符串（而是 ' + typeof unescaped + '）')
    return
  }
  formatting = true
  editor.setValue(unescaped)
  formatting = false
  lastConvertedFormat.value = null
}

/* ---------------- 复制 ---------------- */

const onCopy = () => {
  if (errorMsg.value) return
  if (isRenderObject.value) {
    copy(JSON.stringify(renderValue.value, null, 2))
  } else {
    copy(primitiveText.value)
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.format-badge {
  margin-inline-end: 0;
}

.json-editor {
  width: 100%;
  overflow: hidden;
}

.filter-input :deep(.ant-input-group-addon) {
  font-family: var(--app-mono);
  font-weight: 600;
  color: var(--app-muted);
}

.filter-input :deep(input) {
  font-family: var(--app-mono);
}

.fn-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fn-btn {
  font-family: var(--app-mono);
}

.render-area {
  position: relative;
  height: 100%;
  min-height: 240px;
  overflow: auto;
  padding: 8px 12px;
}

.copy-btn {
  position: absolute;
  top: 4px;
  right: 8px;
  z-index: 9;
}

.render-error {
  color: #ef4444;
  font-family: var(--app-mono);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  padding-right: 48px;
}

.render-primitive {
  margin: 0;
  color: var(--app-text);
  font-family: var(--app-mono);
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
