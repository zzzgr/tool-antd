<template>
  <div class="hash-page">
    <div class="mode-bar">
      <a-radio-group v-model:value="mode" button-style="solid" size="small">
        <a-radio-button value="text">文本</a-radio-button>
        <a-radio-button value="file">文件</a-radio-button>
      </a-radio-group>
      <a-checkbox v-model:checked="upper">大写</a-checkbox>
      <span v-if="computing" class="computing">计算中…</span>
    </div>

    <!-- 文本输入 -->
    <div v-if="mode === 'text'" class="io-block">
      <div class="io-label">输入文本</div>
      <a-textarea
        v-model:value="text"
        class="io-input"
        placeholder="输入文本，实时计算哈希"
        allow-clear
      />
    </div>

    <!-- 文件输入 -->
    <div v-else class="io-block">
      <div class="io-label">选择文件</div>
      <div
        class="dropzone"
        :class="{ dragging }"
        @click="fileInput?.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <div class="placeholder">{{ fileInfo || '点击选择 / 拖入文件' }}</div>
      </div>
      <input ref="fileInput" type="file" hidden @change="onFileChange" />
      <div class="hint">大文件需整体读入内存计算（浏览器 SHA 不支持流式），过大可能较慢</div>
    </div>

    <!-- 结果 -->
    <div class="results">
      <div v-for="a in algos" :key="a" class="hash-row">
        <span class="algo">{{ a }}</span>
        <span class="val" :class="{ empty: !results[a] }">{{
          results[a] ? display(results[a]) : '—'
        }}</span>
        <a-button
          type="link"
          size="small"
          class="copy"
          :disabled="!results[a]"
          @click="copy(display(results[a]))"
          >复制</a-button
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { copy, useStorageRef } from '@/util/util'
import { md5 } from '@/util/md5'

const algos = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

const mode = useStorageRef('hash:mode', 'text')
const text = useStorageRef('hash:text', '')
// 「大写」开关持久化（useStorageRef 仅支持字符串，用 computed 暴露为布尔）
const upperRaw = useStorageRef('hash:upper', '0')
const upper = computed({
  get: () => upperRaw.value === '1',
  set: (v) => (upperRaw.value = v ? '1' : '0')
})

const results = ref<Record<string, string>>({})
const computing = ref(false)
const fileInfo = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

// 自增序号：异步计算返回时只有最新一次生效，丢弃过期结果
let seq = 0

const bufToHex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const digest = async (algo: string, data: BufferSource): Promise<string> =>
  bufToHex(await crypto.subtle.digest(algo, data))

// md5Input 接受字符串(UTF-8) 或 ArrayBuffer；shaData 用于原生 SHA 计算
const compute = async (md5Input: string | ArrayBuffer, shaData: BufferSource) => {
  const my = ++seq
  computing.value = true
  try {
    const md5hex = md5(md5Input)
    const [s1, s256, s512] = await Promise.all([
      digest('SHA-1', shaData),
      digest('SHA-256', shaData),
      digest('SHA-512', shaData)
    ])
    if (my !== seq) return // 已有更新的计算，丢弃
    results.value = { MD5: md5hex, 'SHA-1': s1, 'SHA-256': s256, 'SHA-512': s512 }
  } catch (e) {
    if (my === seq) {
      results.value = {}
      message.error('计算失败')
    }
  } finally {
    if (my === seq) computing.value = false
  }
}

const computeText = () => {
  if (!text.value) {
    results.value = {}
    return
  }
  compute(text.value, new TextEncoder().encode(text.value))
}

const readFile = async (file: File) => {
  fileInfo.value = `${file.name} · ${formatSize(file.size)}`
  if (file.size > 50 * 1024 * 1024) {
    message.warning('文件较大，计算可能较慢并占用内存')
  }
  const buf = await file.arrayBuffer()
  await compute(buf, buf)
}

const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) readFile(f)
  ;(e.target as HTMLInputElement).value = ''
}

const onDrop = (e: DragEvent) => {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) readFile(f)
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

const display = (v: string): string => (upper.value ? v.toUpperCase() : v)

// 文本模式下实时计算
watch(text, computeText, { immediate: true })

// 切换输入模式：清空结果与进行中的计算；切回文本则重算
watch(mode, () => {
  seq++
  results.value = {}
  fileInfo.value = ''
  if (mode.value === 'text') computeText()
})
</script>

<style scoped>
.hash-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.mode-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.computing {
  font-size: 12px;
  color: var(--app-muted);
}

.io-block {
  display: flex;
  flex-direction: column;
}

.io-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.io-input {
  min-height: 120px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
}

.dropzone {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.dropzone.dragging {
  border-color: #64748b;
}

.placeholder {
  color: var(--app-muted);
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.results {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  overflow: hidden;
  background: var(--app-card-bg);
}

.hash-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px dashed color-mix(in srgb, var(--app-card-border) 60%, transparent);
}

.hash-row:last-child {
  border-bottom: none;
}

.algo {
  flex: 0 0 auto;
  width: 72px;
  font-weight: 600;
  color: #64748b;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.val {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  color: var(--app-text);
}

.val.empty {
  color: var(--app-muted);
}

.copy {
  flex: 0 0 auto;
  padding: 0;
}
</style>
