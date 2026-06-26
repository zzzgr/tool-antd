<template>
  <div class="img-page">
    <div class="panes">
      <!-- 图片 → Base64 -->
      <div class="pane">
        <div class="pane-title">图片 → Base64</div>
        <div
          class="dropzone"
          :class="{ dragging }"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <img v-if="imgSrc" :src="imgSrc" class="preview" alt="预览" />
          <div v-else class="placeholder">点击选择 / 拖入 / Ctrl+V 粘贴图片</div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
        <div class="pane-actions">
          <a-button size="small" :disabled="!imgBase64" @click="copy(imgBase64)">复制 Base64</a-button>
          <a-button size="small" :disabled="!imgBase64" @click="copy(imgDataUrl)">复制 DataURL</a-button>
          <a-button size="small" :disabled="!imgBase64" @click="clearImg">清空</a-button>
          <span v-if="imgMeta" class="meta">{{ imgMeta }}</span>
        </div>
      </div>

      <!-- Base64 → 图片 -->
      <div class="pane">
        <div class="pane-title">Base64 → 图片</div>
        <a-textarea
          v-model:value="b64Input"
          class="b64-input"
          placeholder="粘贴图片 Base64 或 DataURL，自动预览"
          :rows="6"
        />
        <div class="preview-wrap">
          <img v-if="b64Preview" :src="b64Preview" class="preview" alt="预览" />
          <div v-else class="placeholder">{{ b64Error || '输入 Base64 后在此预览' }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { copy } from '@/util/util'

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const imgSrc = ref<string>('') // 原图预览 src
const imgBase64 = ref<string>('') // 不含 data:前缀 的纯 base64
const imgDataUrl = ref<string>('') // 含前缀
const imgMeta = ref<string>('')

const b64Input = ref<string>('')
const b64Error = ref<string>('')

// 读取文件为 base64
const readImage = (file: File) => {
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件')
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    imgDataUrl.value = dataUrl
    imgBase64.value = dataUrl.slice(dataUrl.indexOf(',') + 1)
    imgSrc.value = dataUrl
    imgMeta.value = `${file.name} · ${file.type} · ${formatSize(file.size)}`
  }
  reader.onerror = () => message.error('读取失败')
  reader.readAsDataURL(file)
}

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) readImage(file)
  ;(e.target as HTMLInputElement).value = ''
}

const onDrop = (e: DragEvent) => {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) readImage(file)
}

const clearImg = () => {
  imgSrc.value = ''
  imgBase64.value = ''
  imgDataUrl.value = ''
  imgMeta.value = ''
}

// Base64 → 图片预览：自动补全 DataURL 前缀
const b64Preview = computed(() => {
  const raw = b64Input.value.trim()
  if (!raw) {
    b64Error.value = ''
    return ''
  }
  // 已是完整 dataURL
  if (/^data:image\/[a-zA-Z+]+;base64,/.test(raw)) {
    b64Error.value = ''
    return raw
  }
  // 纯 base64：尝试补一个 png 前缀预览（浏览器会按实际数据识别格式）
  if (/^[A-Za-z0-9+/=\s]+$/.test(raw)) {
    b64Error.value = ''
    return `data:image/png;base64,${raw.replace(/\s/g, '')}`
  }
  b64Error.value = '不是合法的 Base64 图片数据'
  return ''
})

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

// Ctrl+V 粘贴图片
const onPaste = (e: ClipboardEvent) => {
  const item = Array.from(e.clipboardData?.items || []).find((i) => i.type.startsWith('image/'))
  const file = item?.getAsFile()
  if (file) readImage(file)
}

onMounted(() => window.addEventListener('paste', onPaste))
onUnmounted(() => window.removeEventListener('paste', onPaste))
</script>

<style scoped>
.img-page {
  height: calc(100vh - 100px);
}

.panes {
  display: flex;
  gap: 16px;
  height: 100%;
}

.pane {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pane-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}

.dropzone {
  flex: 1 1 0;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.dropzone.dragging {
  border-color: #f97316;
}

.preview {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.placeholder {
  color: var(--app-muted);
  font-size: 13px;
  padding: 16px;
  text-align: center;
}

.pane-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.meta {
  margin-left: auto;
  font-size: 12px;
  color: var(--app-muted);
}

.b64-input {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}

.preview-wrap {
  flex: 1 1 0;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  background: var(--app-card-bg);
  overflow: hidden;
  padding: 8px;
}

@media (max-width: 768px) {
  .panes {
    flex-direction: column;
  }
}
</style>
