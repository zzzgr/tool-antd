<template>
  <div class="uuid-page">
    <div class="opts">
      <span class="opt-label">版本</span>
      <a-radio-group v-model:value="version" size="small">
        <a-radio-button value="v4">v4 随机</a-radio-button>
        <a-radio-button value="nil">nil（全零）</a-radio-button>
      </a-radio-group>

      <span class="opt-label">数量</span>
      <a-input-number v-model:value="count" :min="1" :max="1000" size="small" />

      <a-checkbox v-model:checked="hyphenated">带连字符</a-checkbox>
      <a-checkbox v-model:checked="uppercase">大写</a-checkbox>

      <a-button type="primary" size="small" @click="generate">生成</a-button>
      <a-button size="small" :disabled="!list.length" @click="copyAll">复制全部</a-button>
      <a-button size="small" :disabled="!list.length" @click="list = []">清空</a-button>
    </div>

    <div class="io-block">
      <div class="io-label">
        结果<span v-if="list.length" class="count">（{{ list.length }} 条）</span>
      </div>
      <div class="io-output" :class="{ 'is-empty': !list.length }">
        <div v-for="(item, i) in list" :key="i" class="row">
          <span class="no">{{ i + 1 }}</span>
          <span class="val">{{ item }}</span>
          <a-button type="link" size="small" class="copy-one" @click="copy(item)">复制</a-button>
        </div>
        <span v-if="!list.length">点击「生成」按钮在此显示 UUID</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import { copy } from '@/util/util'

const version = ref<'v4' | 'nil'>('v4')
const count = ref<number>(1)
const hyphenated = ref<boolean>(true)
const uppercase = ref<boolean>(false)
const list = ref<string[]>([])

// 生成单个 UUID：v4 优先用原生 crypto.randomUUID()，无此 API 时手写
const genOne = (): string => {
  if (version.value === 'nil') return '00000000-0000-0000-0000-000000000000'
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // 兜底：手写 RFC4122 v4
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h
    .slice(6, 8)
    .join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`
}

const format = (raw: string): string => {
  let s = hyphenated.value ? raw : raw.replace(/-/g, '')
  if (uppercase.value) s = s.toUpperCase()
  return s
}

const generate = () => {
  const n = count.value || 1
  list.value = Array.from({ length: n }, () => format(genOne()))
  message.success(`已生成 ${n} 条`)
}

const copyAll = () => {
  copy(list.value.join('\n'))
}
</script>

<style scoped>
.uuid-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.opt-label {
  font-size: 12px;
  color: var(--app-muted);
}

.io-block {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.io-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.io-label .count {
  margin-left: 4px;
}

.io-output {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 6px 12px;
  border: 1px solid var(--app-card-border);
  border-radius: 4px;
  background: var(--app-card-bg);
  color: var(--app-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.io-output.is-empty {
  color: var(--app-muted);
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}

.no {
  flex: 0 0 auto;
  min-width: 2.5em;
  text-align: right;
  color: var(--app-muted);
  user-select: none;
}

.val {
  flex: 1 1 auto;
  word-break: break-all;
}

.copy-one {
  flex: 0 0 auto;
  padding: 0 4px;
  height: auto;
  opacity: 0;
}

.row:hover .copy-one {
  opacity: 1;
}
</style>
