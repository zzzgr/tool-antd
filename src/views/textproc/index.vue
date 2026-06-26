<template>
  <div class="textproc-page">
    <div class="toolbar">
      <!-- 分隔 / 分行 -->
      <div class="tool-group">
        <span class="group-label">分隔/分行</span>
        <a-button-group size="small">
          <a-button @click="commaToLines">逗号→换行</a-button>
          <a-button @click="linesToComma">换行→逗号</a-button>
        </a-button-group>
        <a-input v-model:value="delimiter" size="small" class="delim-input" placeholder="分隔符" />
        <a-button-group size="small">
          <a-button @click="splitByDelim">拆分为多行</a-button>
          <a-button @click="joinByDelim">合并为一行</a-button>
        </a-button-group>
      </div>

      <!-- 查找替换 -->
      <div class="tool-group">
        <span class="group-label">查找替换</span>
        <a-input v-model:value="findText" size="small" class="rep-input" placeholder="查找" />
        <a-input
          v-model:value="replaceText"
          size="small"
          class="rep-input"
          placeholder="替换为(空=删除)"
        />
        <a-checkbox v-model:checked="useRegex">正则</a-checkbox>
        <a-button size="small" @click="doReplace">替换</a-button>
      </div>

      <!-- 整理 -->
      <div class="tool-group">
        <span class="group-label">整理</span>
        <a-button-group size="small">
          <a-button @click="sortAsc">升序</a-button>
          <a-button @click="sortDesc">降序</a-button>
          <a-button @click="showDuplicatePreview">标记重复</a-button>
          <a-button @click="dedupe">去重</a-button>
          <a-button @click="removeEmptyLines">去空行</a-button>
          <a-button @click="trimLines">去首尾空格</a-button>
          <a-button @click="removeInlineSpaces">去行内空格</a-button>
        </a-button-group>
      </div>

      <!-- 对比 -->
      <div class="tool-group">
        <span class="group-label">对比</span>
        <a-button-group size="small">
          <a-button @click="saveLeft">存为左侧</a-button>
          <a-button @click="saveRight">存为右侧</a-button>
        </a-button-group>
        <a-button type="primary" size="small" @click="goDiff">对比</a-button>
      </div>
    </div>

    <div class="io-block">
      <a-textarea
        v-model:value="text"
        class="io-input"
        placeholder="在此粘贴 / 输入文本，使用上方按钮处理（操作可撤销）"
      />
    </div>

    <div class="statusbar">
      <span>{{ lineCount }} 行 · {{ charCount }} 字符</span>
      <span class="slot-info">暂存：左 {{ bridge.left.length }} 字 / 右 {{ bridge.right.length }} 字</span>
    </div>

    <!-- 标记重复预览：按行高亮重复项，所见即所得（判定规则与 dedupe 同源） -->
    <a-modal v-model:open="dupModalOpen" title="标记重复" :width="720" class="dup-modal">
      <div class="dup-summary">
        <a-tag>共 {{ dupLines.length }} 行</a-tag>
        <a-tag color="warning">重复 {{ dupDuplicateCount }} 行</a-tag>
        <a-tag color="error">涉及 {{ dupValueCount }} 个值</a-tag>
        <span v-if="dupDuplicateCount === 0" class="dup-empty">未发现重复行</span>
      </div>
      <div class="dup-list">
        <div
          v-for="item in dupLines"
          :key="item.index"
          class="dup-line"
          :class="{ 'is-dup': item.dup }"
        >
          <span class="dup-no">{{ item.index + 1 }}</span>
          <span class="dup-text">{{ item.text }}</span>
          <span v-if="item.dup" class="dup-count">×{{ item.occurrence }}</span>
        </div>
      </div>
      <template #footer>
        <a-button @click="dupModalOpen = false">取消</a-button>
        <a-button type="primary" :disabled="dupDuplicateCount === 0" @click="confirmDedupe">
          去重
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useStorageRef } from '@/util/util'
import { useDiffBridgeStore } from '@/stores/diffBridge'

const router = useRouter()
const bridge = useDiffBridgeStore()

// 输入框内容，持久化（刷新保留）
const text = useStorageRef('textproc:input', '')

// 自定义分隔符 / 查找替换的输入
const delimiter = ref<string>(',')
const findText = ref<string>('')
const replaceText = ref<string>('')
const useRegex = ref<boolean>(false)

// 撤销 / 重做双栈：按钮操作与手动输入统一进栈，支持 Ctrl+Z / Ctrl+Shift+Z(Ctrl+Y)
const undoStack = ref<string[]>([])
const redoStack = ref<string[]>([])
const MAX_HISTORY = 100

// 区分文本变化来源：撤销/重做引起的变化不再入栈；按钮变化已在 mutate 里记录
let restoring = false
let buttonMutation = false
// 手动输入合并：记录一段连续输入的起点 baseline，停顿后固化为一个撤销点
let manualBaseline: string | null = null
let manualTimer: ReturnType<typeof setTimeout> | null = null

const pushUndo = (val: string) => {
  undoStack.value.push(val)
  if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
  redoStack.value = []
}

// 固化当前未提交的手动输入段
const flushManual = () => {
  if (manualTimer) {
    clearTimeout(manualTimer)
    manualTimer = null
  }
  if (manualBaseline !== null && manualBaseline !== text.value) {
    pushUndo(manualBaseline)
  }
  manualBaseline = null
}

// 程序化修改文本（按钮操作 / 清空）：先固化手动段，再记录撤销点
const mutate = (next: string) => {
  if (next === text.value) return
  flushManual()
  pushUndo(text.value)
  buttonMutation = true
  text.value = next
}

// 统一换行符为 \n，避免 \r\n 干扰按行处理
const normalize = (s: string) => s.replace(/\r\n?/g, '\n')
const toLines = (s: string) => s.split('\n')

// 执行一次变换：读当前文本 → fn 处理 → 写回（mutate 负责记录撤销点）
const apply = (fn: (s: string) => string) => {
  let next: string
  try {
    next = fn(normalize(text.value))
  } catch (e: any) {
    message.error(e?.message || '处理失败')
    return
  }
  mutate(next)
}

// —— 分隔符转换 ——
const commaToLines = () =>
  apply((s) =>
    s
      .split(/[，,]/)
      .map((x) => x.trim())
      .join('\n')
  )
const linesToComma = () =>
  apply((s) =>
    toLines(s)
      .map((x) => x.trim())
      .filter((x) => x !== '')
      .join(',')
  )
const splitByDelim = () => {
  if (!delimiter.value) {
    message.warning('请先填写分隔符')
    return
  }
  apply((s) =>
    s
      .split(delimiter.value)
      .map((x) => x.trim())
      .join('\n')
  )
}
const joinByDelim = () => {
  if (!delimiter.value) {
    message.warning('请先填写分隔符')
    return
  }
  apply((s) =>
    toLines(s)
      .map((x) => x.trim())
      .filter((x) => x !== '')
      .join(delimiter.value)
  )
}

// —— 查找替换 ——
const doReplace = () => {
  if (!findText.value) {
    message.warning('请先填写查找内容')
    return
  }
  if (useRegex.value) {
    try {
      // eslint-disable-next-line no-new
      new RegExp(findText.value)
    } catch {
      message.error('正则表达式非法')
      return
    }
  }
  apply((s) => {
    if (useRegex.value) {
      return s.replace(new RegExp(findText.value, 'g'), replaceText.value)
    }
    return s.split(findText.value).join(replaceText.value)
  })
}

// —— 整理 ——
const sortAsc = () => apply((s) => toLines(s).sort((a, b) => a.localeCompare(b)).join('\n'))
const sortDesc = () =>
  apply((s) =>
    toLines(s)
      .sort((a, b) => a.localeCompare(b))
      .reverse()
      .join('\n')
  )
const dedupe = () => apply((s) => [...new Set(toLines(s))].join('\n'))
const removeEmptyLines = () => apply((s) => toLines(s).filter((x) => x.trim() !== '').join('\n'))
const trimLines = () => apply((s) => toLines(s).map((x) => x.trim()).join('\n'))
const removeInlineSpaces = () =>
  apply((s) => toLines(s).map((x) => x.replace(/[ \t]+/g, '')).join('\n'))

// —— 标记重复预览 ——
// 判定规则与 dedupe 同源：以原始行文本为 key（不 trim、大小写敏感），
// 首次出现保留，第 2 次及以后标记为重复，保证"高亮的行 = 去重会删的行"
const dupModalOpen = ref(false)
const dupAnalysis = computed(() => {
  const normalized = normalize(text.value)
  const lines = normalized === '' ? [] : toLines(normalized)
  const seen = new Map<string, number>()
  const result = lines.map((text, index) => {
    const occurrence = (seen.get(text) ?? 0) + 1
    seen.set(text, occurrence)
    return { index, text, occurrence, dup: occurrence > 1 }
  })
  const dupItems = result.filter((x) => x.dup)
  return {
    lines: result,
    duplicateCount: dupItems.length,
    valueCount: dupItems.length ? new Set(dupItems.map((x) => x.text)).size : 0,
  }
})
const dupLines = computed(() => dupAnalysis.value.lines)
const dupDuplicateCount = computed(() => dupAnalysis.value.duplicateCount)
const dupValueCount = computed(() => dupAnalysis.value.valueCount)
const showDuplicatePreview = () => {
  dupModalOpen.value = true
}
const confirmDedupe = () => {
  dupModalOpen.value = false
  dedupe()
}

// —— 操作 ——
const undo = () => {
  flushManual()
  if (undoStack.value.length === 0) return
  restoring = true
  redoStack.value.push(text.value)
  text.value = undoStack.value.pop() as string
  nextTick(() => (restoring = false))
}
const redo = () => {
  if (redoStack.value.length === 0) return
  restoring = true
  undoStack.value.push(text.value)
  text.value = redoStack.value.pop() as string
  nextTick(() => (restoring = false))
}

// 监听文本变化：手动输入按防抖合并成一个撤销点；按钮/撤销引起的变化不重复记录
watch(text, (_newVal, oldVal) => {
  if (restoring) return
  if (buttonMutation) {
    buttonMutation = false
    return
  }
  if (manualBaseline === null) manualBaseline = oldVal
  if (manualTimer) clearTimeout(manualTimer)
  manualTimer = setTimeout(flushManual, 600)
})

// Ctrl+Z 撤销 / Ctrl+Shift+Z、Ctrl+Y 重做；查找等单行输入框内放行原生撤销
const onKeydown = (e: KeyboardEvent) => {
  if (!e.ctrlKey && !e.metaKey) return
  const key = e.key.toLowerCase()
  if (key !== 'z' && key !== 'y') return
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return
  e.preventDefault()
  if (key === 'y' || e.shiftKey) redo()
  else undo()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (manualTimer) clearTimeout(manualTimer)
})

// —— 暂存对比 ——
const saveLeft = () => {
  bridge.setLeft(text.value)
  message.success('已存为左侧')
}
const saveRight = () => {
  bridge.setRight(text.value)
  message.success('已存为右侧')
}
const goDiff = () => {
  if (!bridge.left && !bridge.right) {
    message.warning('请先「存为左侧」或「存为右侧」')
    return
  }
  bridge.requestDiff()
  router.push('/diff')
}

// —— 状态栏 ——
const charCount = computed(() => text.value.length)
const lineCount = computed(() => (text.value === '' ? 0 : normalize(text.value).split('\n').length))
</script>

<style scoped>
.textproc-page {
  position: relative;
  height: calc(100vh - 16px);
  height: calc(100dvh - 16px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 10px;
}

.tool-group {
  --group-accent: #2563eb;

  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--app-card-hover-border);
  border-color: color-mix(in srgb, var(--group-accent) 38%, var(--app-card-border));
  border-radius: 8px;
  background: var(--app-card-bg);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--group-accent) 10%, var(--app-card-bg)) 0%,
    var(--app-card-bg) 58%
  );
  box-shadow:
    0 4px 12px var(--app-shadow),
    inset 0 1px 0 color-mix(in srgb, #ffffff 64%, transparent);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.tool-group:nth-child(2) {
  --group-accent: #d97706;
}

.tool-group:nth-child(3) {
  --group-accent: #059669;
}

.tool-group:nth-child(4) {
  --group-accent: #7c3aed;
}

.tool-group:hover,
.tool-group:focus-within {
  border-color: color-mix(in srgb, var(--group-accent) 72%, var(--app-card-border));
  box-shadow:
    0 4px 12px var(--app-shadow),
    inset 0 0 0 1px color-mix(in srgb, var(--group-accent) 28%, transparent);
}

.group-label {
  font-weight: 600;
  font-size: 11px;
  color: var(--group-accent);
  white-space: nowrap;
  user-select: none;
}

.delim-input {
  width: 90px;
}

.rep-input {
  width: 140px;
}

.io-block {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.io-input {
  flex: 1;
  min-height: 0;
  padding-bottom: 34px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.statusbar {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--app-muted);
  background: color-mix(in srgb, var(--app-card-bg) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--app-card-border) 76%, transparent);
  border-radius: 6px;
  pointer-events: none;
  backdrop-filter: blur(6px);
}

.slot-info {
  margin-left: auto;
}

/* —— 标记重复弹窗 —— */
.dup-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.dup-empty {
  color: var(--app-muted);
  font-size: 12px;
}
.dup-list {
  max-height: 56vh;
  overflow: auto;
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
}
.dup-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 10px;
}
.dup-line.is-dup {
  background: color-mix(in srgb, #f59e0b 16%, var(--app-card-bg));
  border-inline-start: 3px solid #f59e0b;
}
.dup-no {
  flex: 0 0 auto;
  min-width: 3em;
  text-align: right;
  color: var(--app-muted);
  user-select: none;
}
.dup-text {
  flex: 1 1 auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.dup-count {
  flex: 0 0 auto;
  color: #f59e0b;
  font-size: 12px;
  opacity: 0.85;
}
</style>
