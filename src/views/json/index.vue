<template>
  <div class="json-tool p-2">
    <!-- 工具按钮 -->
    <div class="mb-2">
      <a-button-group size="small">
        <a-button type="primary" @click="compress()">压缩</a-button>
        <a-button type="primary" @click="unEscape()">去除转义</a-button>
        <a-button type="primary" @click="escape()">转义</a-button>
      </a-button-group>
    </div>

    <a-row :gutter="16">
      <!-- 左侧：编辑器 -->
      <a-col :xs="24" :md="renderVisible ? 12 : 24">
        <div ref="editorEl" class="json-editor border border-solid rounded-md"></div>
      </a-col>

      <!-- 右侧：渲染区（按需展开） -->
      <a-col v-if="renderVisible" :xs="24" :md="12">
        <div
          ref="renderWrapper"
          class="render-area border border-solid rounded-md"
          :style="{ height: editorHeight + 'px' }"
        >
          <a-button
            v-if="!errorMsg"
            type="link"
            size="small"
            class="copy-btn"
            @click="onCopy()"
            >复制
          </a-button>

          <!-- 错误（JSON 解析错误 / 表达式错误） -->
          <div v-if="errorMsg" class="render-error">{{ errorMsg }}</div>

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
          <pre v-else class="render-primitive">{{ primitiveText }}</pre>
        </div>
      </a-col>
    </a-row>

    <!-- 底部：过滤表达式（整行宽） -->
    <div ref="filterAreaRef" class="filter-bar mt-2">
      <div ref="filterBarRef">
        <a-input
          v-model:value="expr"
          class="filter-input"
          allow-clear
          placeholder=".filter(x => x.age > 18).map(x => x.name)"
        >
          <template #addonBefore>this</template>
        </a-input>
      </div>
      <div class="fn-buttons mt-2">
        <a-button
          v-for="s in FN_SNIPPETS"
          :key="s.label"
          size="small"
          class="fn-btn"
          @mousedown.prevent
          @click="insertSnippet(s.tpl)"
          >{{ s.label }}</a-button
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import JsonView from '@/components/json-view/index.vue'
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { copy } from '@/util/util'
import { useThemeStore } from '@/stores/theme'

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

// 编辑器实时文本（驱动右侧响应式）
const rawText = ref('')
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

// JSON 解析状态
const parseState = computed(() => {
  const t = (rawText.value || '').trim()
  if (!t) return { empty: true, error: null, value: undefined }
  try {
    return { empty: false, error: null, value: JSON.parse(t) }
  } catch (e) {
    return { empty: false, error: e.message, value: undefined }
  }
})

// 过滤表达式执行状态
const filterState = computed(() => {
  const e = expr.value.trim()
  if (!e) return { active: false, error: null, value: undefined }
  if (parseState.value.empty) return { active: true, error: '请先输入 JSON', value: undefined }
  if (parseState.value.error) return { active: true, error: null, value: undefined } // JSON 错误优先在 errorMsg 中体现
  try {
    // this = 解析后的 JSON，表达式拼接在 this 之后
    const fn = new Function('return this' + e)
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
    return 'JSON 解析错误：' + parseState.value.error
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
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return // 非法 JSON 不格式化，仅在右侧报错
  }
  const formatted = JSON.stringify(parsed, null, 2)
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
    fixedOverflowWidgets: true
  })

  // 粘贴并（同步）格式化完成后，光标回到首行行首
  editor.onDidPaste(() => {
    nextTick(() => moveCursorToStart())
  })

  editor.onDidChangeModelContent(() => {
    rawText.value = editor.getValue()
    if (formatting) return // 跳过格式化自身触发的变更，避免递归
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

/* ---------------- 工具按钮（作用于编辑器内容） ---------------- */

const compress = () => {
  if (!editor) return
  const text = editor.getValue().trim()
  if (!text) return
  try {
    editor.setValue(JSON.stringify(JSON.parse(text)))
  } catch {
    /* 非法 JSON 时忽略，右侧已报错 */
  }
}

const escape = () => {
  if (!editor) return
  editor.setValue(editor.getValue().replace(/\\/g, '\\\\').replace(/"/g, '\\"'))
}

const unEscape = () => {
  if (!editor) return
  editor.setValue(editor.getValue().replace(/\\\\/g, '\\').replace(/\\"/g, '"'))
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
.json-editor {
  width: 100%;
  overflow: hidden;
  border-color: var(--app-card-border);
}

.filter-input :deep(.ant-input-group-addon) {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-weight: 600;
  color: var(--app-muted);
}

.filter-input :deep(input) {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
}

.fn-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.fn-btn {
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
}

.render-area {
  position: relative;
  height: 100%;
  min-height: 240px;
  overflow: auto;
  padding: 8px 12px;
  background: var(--app-card-bg);
  border-color: var(--app-card-border);
}

.copy-btn {
  position: absolute;
  top: 4px;
  right: 8px;
  z-index: 9;
}

.render-error {
  color: #ef4444;
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  padding-right: 48px;
}

.render-primitive {
  margin: 0;
  color: var(--app-text);
  font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
