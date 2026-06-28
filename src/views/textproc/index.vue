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
          <a-button @click="showDuplicatePreview">查看重复</a-button>
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
      <v-ace-editor
        v-model:value="text"
        lang="text"
        :theme="aceTheme"
        :options="aceOptions"
        class="ace"
        @init="onAceInit"
      />
    </div>

    <div class="statusbar">
      <span>{{ lineCount }} 行 · {{ charCount }} 字符</span>
      <span class="slot-info"
        >暂存：左 {{ bridge.left.length }} 字 / 右 {{ bridge.right.length }} 字</span
      >
    </div>

    <!-- 查看重复：按"重复的值"聚合，点条目用 Ace 高亮全部出现行并跳转；行号可展开 -->
    <a-modal v-model:open="dupModalOpen" title="重复项" :width="720" class="dup-modal">
      <div class="dup-summary">
        <a-tag>共 {{ lineCount }} 行</a-tag>
        <a-tag color="warning">{{ dupGroups.length }} 组重复</a-tag>
        <a-tag color="error">重复合计 {{ dupTotalLines }} 行</a-tag>
        <span v-if="dupGroups.length === 0" class="dup-empty">未发现重复内容</span>
      </div>
      <div v-if="dupGroups.length" class="dup-list">
        <div v-for="g in dupGroups" :key="g.value" class="dup-group">
          <div class="dup-head" @click="locateDup(g)">
            <span class="dup-count">×{{ g.count }}</span>
            <span class="dup-value" :title="g.value">{{ g.value }}</span>
            <span class="dup-act">定位</span>
            <span class="dup-toggle" @click.stop="toggleDup(g.value)">{{
              expandedDup.has(g.value) ? '收起' : '行号'
            }}</span>
          </div>
          <div v-if="expandedDup.has(g.value)" class="dup-lines">
            行
            <span v-for="(n, i) in g.lines" :key="n"
              >{{ n }}<template v-if="i < g.lines.length - 1"> · </template></span
            >
          </div>
        </div>
      </div>
      <template #footer>
        <a-button @click="dupModalOpen = false">关闭</a-button>
        <a-button type="primary" :disabled="dupGroups.length === 0" @click="confirmDedupe">
          去重
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { VAceEditor } from '@/views/ace/ace.config'
import * as aceBuilds from 'ace-builds'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useStorageRef } from '@/util/util'
import { useDiffBridgeStore } from '@/stores/diffBridge'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const bridge = useDiffBridgeStore()
const themeStore = useThemeStore()

// 输入内容，持久化（刷新保留）
const text = useStorageRef('textproc:input', '')

// 自定义分隔符 / 查找替换的输入
const delimiter = useStorageRef('textproc:delimiter', ',')
const findText = ref<string>('')
const replaceText = ref<string>('')
// 「正则」勾选持久化（useStorageRef 仅支持字符串，用 computed 暴露为布尔）
const useRegexRaw = useStorageRef('textproc:useRegex', '0')
const useRegex = computed({
  get: () => useRegexRaw.value === '1',
  set: (v) => (useRegexRaw.value = v ? '1' : '0')
})

// —— Ace 编辑器 ——
// 撤销 / 重做交给 Ace 内置（Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y）
const aceTheme = computed(() => (themeStore.isDark ? 'tomorrow_night' : 'chrome'))
const aceOptions = {
  useWorker: false,
  showPrintMargin: false,
  highlightActiveLine: true,
  fontSize: 13,
  wrap: false,
  tabSize: 2
}
const aceLib = aceBuilds as any
const AceRange = aceLib.Range ?? aceLib.require('ace/range').Range
let aceEditor: any = null
let dupMarkerIds: number[] = []
let findMarkerIds: number[] = []
const onAceInit = (editor: any) => {
  aceEditor = editor
}
const clearDupMarkers = () => {
  if (!aceEditor) return
  const session = aceEditor.getSession()
  dupMarkerIds.forEach((id) => session.removeMarker(id))
  dupMarkerIds = []
}

// —— 查找高亮：随「查找替换」的查找框实时高亮编辑器里命中的文本 ——
// 未勾「正则」按字面查找，勾选后按正则查找；上限保护避免超大量 marker 卡顿
const FIND_LIMIT = 2000
const clearFindMarkers = () => {
  if (!aceEditor) return
  const session = aceEditor.getSession()
  findMarkerIds.forEach((id) => session.removeMarker(id))
  findMarkerIds = []
}
const highlightFind = () => {
  if (!aceEditor) return
  clearFindMarkers()
  const needle = findText.value
  if (!needle) return
  const src = aceEditor.getValue()
  const ranges: [number, number][] = []
  if (useRegex.value) {
    let re: RegExp
    try {
      re = new RegExp(needle, 'g')
    } catch {
      return // 正则非法时不高亮
    }
    let m: RegExpExecArray | null
    while ((m = re.exec(src)) !== null) {
      if (m[0] !== '') ranges.push([m.index, m.index + m[0].length])
      if (m[0] === '') re.lastIndex++
      if (ranges.length >= FIND_LIMIT) break
    }
  } else {
    let pos = 0
    for (;;) {
      const idx = src.indexOf(needle, pos)
      if (idx === -1) break
      ranges.push([idx, idx + needle.length])
      pos = idx + needle.length
      if (ranges.length >= FIND_LIMIT) break
    }
  }
  const session = aceEditor.getSession()
  const doc = session.getDocument()
  for (const [s, e] of ranges) {
    const sp = doc.indexToPosition(s, 0)
    const ep = doc.indexToPosition(e, 0)
    findMarkerIds.push(
      session.addMarker(new AceRange(sp.row, sp.column, ep.row, ep.column), 'find-hl', 'text')
    )
  }
}

// 查找框 / 正则开关 / 文本变化时，防抖重算查找高亮（nextTick 等 Ace 内容同步后再算位置）
let findTimer: ReturnType<typeof setTimeout> | null = null
watch([findText, useRegex, text], () => {
  if (findTimer) clearTimeout(findTimer)
  findTimer = setTimeout(() => nextTick(highlightFind), 150)
})
onUnmounted(() => {
  if (findTimer) clearTimeout(findTimer)
})

// 统一换行符为 \n，避免 \r\n 干扰按行处理
const normalize = (s: string) => s.replace(/\r\n?/g, '\n')
const toLines = (s: string) => s.split('\n')

// 执行一次变换：读当前文本 → fn 处理 → 写回（撤销/重做交给 Ace）
const apply = (fn: (s: string) => string) => {
  let next: string
  try {
    next = fn(normalize(text.value))
  } catch (e: any) {
    message.error(e?.message || '处理失败')
    return
  }
  if (next !== text.value) text.value = next
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

// —— 查看重复 ——
// 按"重复的值"聚合：排除纯空白行，仅保留出现 ≥2 次的值，按次数降序。
interface DupGroup {
  value: string
  count: number
  lines: number[]
}
const dupModalOpen = ref(false)
const expandedDup = ref<Set<string>>(new Set())
const dupGroups = computed<DupGroup[]>(() => {
  const normalized = normalize(text.value)
  const lines = normalized === '' ? [] : toLines(normalized)
  const map = new Map<string, number[]>()
  lines.forEach((line, i) => {
    if (line.trim() === '') return
    const arr = map.get(line)
    if (arr) arr.push(i + 1)
    else map.set(line, [i + 1])
  })
  const groups: DupGroup[] = []
  map.forEach((lineNos, value) => {
    if (lineNos.length > 1) groups.push({ value, count: lineNos.length, lines: lineNos })
  })
  groups.sort((a, b) => b.count - a.count || a.lines[0] - b.lines[0])
  return groups
})
const dupTotalLines = computed(() => dupGroups.value.reduce((sum, g) => sum + g.count, 0))
const toggleDup = (value: string) => {
  const s = new Set(expandedDup.value)
  if (s.has(value)) s.delete(value)
  else s.add(value)
  expandedDup.value = s
}
const showDuplicatePreview = () => {
  expandedDup.value = new Set()
  dupModalOpen.value = true
}
const confirmDedupe = () => {
  dupModalOpen.value = false
  dedupe()
}
// 在 Ace 里整行高亮某重复值的全部出现行，并跳到第一处
const locateDup = (g: DupGroup) => {
  if (!aceEditor) return
  clearDupMarkers()
  const session = aceEditor.getSession()
  g.lines.forEach((n) => {
    const id = session.addMarker(new AceRange(n - 1, 0, n - 1, 1), 'dup-hl', 'fullLine')
    dupMarkerIds.push(id)
  })
  dupModalOpen.value = false
  aceEditor.gotoLine(g.lines[0], 0, true)
  aceEditor.focus()
}

// 文本被编辑后旧的重复高亮已失效，清除
watch(text, clearDupMarkers)

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
  padding-bottom: 34px; /* 给底部 statusbar 让位 */
}

.ace {
  flex: 1;
  min-height: 0;
  border: 1px solid var(--app-card-border);
  border-radius: 4px;
}

/* Ace 内整行高亮重复行（蓝，区别于查找高亮的黄） */
:deep(.dup-hl) {
  position: absolute;
  z-index: 4;
  background: color-mix(in srgb, #3b82f6 20%, transparent);
}

/* Ace 内高亮「查找」命中的文本片段 */
:deep(.find-hl) {
  position: absolute;
  z-index: 4;
  background: color-mix(in srgb, #fde047 55%, transparent);
  border-radius: 2px;
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

/* —— 查看重复弹窗 —— */
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
.dup-group {
  border-bottom: 1px dashed color-mix(in srgb, var(--app-card-border) 60%, transparent);
}
.dup-group:last-child {
  border-bottom: none;
}
.dup-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px;
  cursor: pointer;
}
.dup-head:hover {
  background: color-mix(in srgb, var(--app-card-border) 25%, transparent);
}
.dup-count {
  flex: 0 0 auto;
  min-width: 2.5em;
  text-align: center;
  padding: 0 6px;
  color: #f59e0b;
  font-weight: 600;
  background: color-mix(in srgb, #f59e0b 16%, transparent);
  border-radius: 10px;
}
.dup-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dup-act {
  flex: 0 0 auto;
  font-size: 12px;
  color: #3b82f6;
  user-select: none;
}
.dup-toggle {
  flex: 0 0 auto;
  font-size: 12px;
  color: #3b82f6;
  user-select: none;
}
.dup-lines {
  padding: 2px 10px 6px 10px;
  color: var(--app-muted);
  word-break: break-all;
}
</style>
