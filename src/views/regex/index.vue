<template>
  <div class="regex-page">
    <div class="opts">
      <span class="opt-label">正则</span>
      <span class="delim">/</span>
      <a-input
        v-model:value="pattern"
        class="pattern-input"
        size="small"
        placeholder="输入正则表达式，如 \d+"
        @keydown.enter="run"
      />
      <span class="delim">/</span>
      <a-input v-model:value="flags" class="flags-input" size="small" placeholder="gim" />
      <a-button type="primary" size="small" @click="run">匹配</a-button>
      <a-checkbox v-model:checked="autoRun">实时</a-checkbox>
    </div>

    <div v-if="error" class="error">正则错误：{{ error }}</div>
    <div v-else class="summary">
      <a-tag>命中 {{ matches.length }} 处</a-tag>
      <a-tag v-if="groups.length" color="blue">分组 {{ groups.length }} 个</a-tag>
    </div>

    <div class="io-block">
      <div class="io-label">待测文本</div>
      <a-textarea
        v-model:value="text"
        class="io-input"
        placeholder="在此输入待匹配文本"
      />
    </div>

    <div class="io-block">
      <div class="io-label">匹配高亮<span v-if="matches.length" class="count">（共 {{ matches.length }} 处）</span></div>
      <div class="io-output" :class="{ 'is-empty': !text }">
        <template v-if="text">
          <span v-for="(seg, i) in segments" :key="i">
            <mark v-if="seg.match" class="hit">{{ seg.text }}</mark>
            <span v-else>{{ seg.text }}</span>
          </span>
        </template>
        <span v-else>匹配结果将高亮显示在这里</span>
      </div>
    </div>

    <div v-if="matches.length" class="io-block matches">
      <div class="io-label">命中详情</div>
      <div class="io-output">
        <div v-for="(m, i) in matches" :key="i" class="match-row">
          <span class="m-no">#{{ i + 1 }}</span>
          <span class="m-pos">@{{ m.index }}</span>
          <span class="m-text">{{ m.full }}</span>
          <span v-for="(g, gi) in m.groups" :key="gi" class="m-group">
            <span class="g-name">${{ gi + 1 }}</span>
            <span class="g-val">{{ g ?? '(空)' }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Match {
  index: number
  full: string
  groups: (string | undefined)[]
}

const pattern = ref<string>('')
const flags = ref<string>('g')
const text = ref<string>('')
const autoRun = ref<boolean>(true)
const error = ref<string>('')
const matches = ref<Match[]>([])

const buildRegExp = (): RegExp | null => {
  if (!pattern.value) return null
  try {
    // 去掉用户可能误带的字面量斜杠与末尾 flags，保持以字符串构造
    const f = flags.value.replace(/[^gimsuy]/g, '')
    const re = new RegExp(pattern.value, f)
    error.value = ''
    return re
  } catch (e: any) {
    error.value = e?.message || '正则非法'
    return null
  }
}

const run = () => {
  const re = buildRegExp()
  if (!re || !text.value) {
    matches.value = []
    return
  }
  const result: Match[] = []
  // 非 global 模式只取第一个匹配；global 模式遍历全部
  if (re.global) {
    let m: RegExpExecArray | null
    const reCopy = new RegExp(re.source, re.flags)
    while ((m = reCopy.exec(text.value)) !== null) {
      result.push({ index: m.index, full: m[0], groups: m.slice(1) })
      if (m[0] === '') reCopy.lastIndex++ // 避免零宽匹配死循环
    }
  } else {
    const m = re.exec(text.value)
    if (m) result.push({ index: m.index, full: m[0], groups: m.slice(1) })
  }
  matches.value = result
}

// 把文本切成「普通段 / 命中段」用于高亮渲染
const segments = computed(() => {
  if (!matches.value.length) return [{ match: false, text: text.value }]
  const segs: { match: boolean; text: string }[] = []
  let cursor = 0
  for (const m of matches.value) {
    if (m.index > cursor) segs.push({ match: false, text: text.value.slice(cursor, m.index) })
    segs.push({ match: true, text: m.full })
    cursor = m.index + m.full.length
  }
  if (cursor < text.value.length) segs.push({ match: false, text: text.value.slice(cursor) })
  return segs
})

// 所有出现过的分组数量上限（用于顶部统计）
const groups = computed(() => {
  let max = 0
  for (const m of matches.value) max = Math.max(max, m.groups.length)
  return max ? Array(max).fill(0) : []
})

watch([pattern, flags, text], () => {
  if (autoRun.value) run()
}, { immediate: true })
</script>

<style scoped>
.regex-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.opt-label {
  font-size: 12px;
  color: var(--app-muted);
}

.delim {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  color: var(--app-muted);
}

.pattern-input {
  flex: 1 1 200px;
  min-width: 120px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.flags-input {
  width: 70px;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.error {
  color: #ef4444;
  font-size: 12px;
}

.summary {
  display: flex;
  gap: 8px;
}

.io-block {
  flex: 1 1 0;
  min-height: 80px;
  display: flex;
  flex-direction: column;
}

.io-block.matches {
  flex: 0 0 auto;
  max-height: 220px;
}

.io-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.io-label .count {
  margin-left: 4px;
}

.io-input {
  flex: 1;
  min-height: 0;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.io-output {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px;
  border: 1px solid var(--app-card-border);
  border-radius: 4px;
  background: var(--app-card-bg);
  color: var(--app-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.io-output.is-empty {
  color: var(--app-muted);
}

.hit {
  background: color-mix(in srgb, #f59e0b 32%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.match-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  border-bottom: 1px dashed color-mix(in srgb, var(--app-card-border) 60%, transparent);
}

.match-row:last-child {
  border-bottom: none;
}

.m-no {
  color: #f59e0b;
  font-weight: 600;
}

.m-pos {
  color: var(--app-muted);
  font-size: 12px;
}

.m-text {
  color: var(--app-text);
}

.m-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  font-size: 12px;
  background: color-mix(in srgb, #3b82f6 14%, transparent);
  border-radius: 3px;
}

.g-name {
  color: #3b82f6;
  font-weight: 600;
}

.g-val {
  color: var(--app-text);
}
</style>
