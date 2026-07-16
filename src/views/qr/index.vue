<template>
  <ToolPage width="narrow">
    <div class="toolbar tool-toolbar mb-3" style="justify-content: center">
      <a-radio-group v-model:value="mode" size="small" button-style="solid">
        <a-radio-button value="generate">生成</a-radio-button>
        <a-radio-button value="decode">识别</a-radio-button>
      </a-radio-group>
    </div>

    <!-- 生成 -->
    <div v-show="mode === 'generate'" class="panel generate-panel">
      <a-form layout="vertical" class="generate-form">
        <a-form-item label="文本">
          <a-textarea v-model:value="text" :rows="6" placeholder="输入要生成二维码的文本 / 链接" />
        </a-form-item>

        <a-form-item label="标题">
          <a-input v-model:value="title" placeholder="可选，显示在二维码上方" allow-clear />
        </a-form-item>

        <a-form-item label="宽高">
          <a-input-number v-model:value="size" :min="96" :max="1024" :step="32" class="size-input" />
        </a-form-item>
      </a-form>

      <div v-if="text.length > 0 && composedUrl" class="preview-wrap">
        <img :src="composedUrl" class="qr-img" alt="二维码" />
      </div>

      <div v-if="text.length > 0" class="qr-hidden">
        <vue-qr :size="size" :text="text" :margin="16" :callback="onQrReady" />
      </div>
    </div>

    <!-- 识别 -->
    <div v-show="mode === 'decode'" class="panel decode-panel">
      <div
        class="drop-zone"
        :class="{ 'is-dragover': dragOver, 'has-preview': !!previewUrl }"
        @dragenter.prevent="dragOver = true"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
        @click="openFilePicker"
        @paste="onPaste"
        tabindex="0"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="file-input"
          @change="onFileChange"
        />

        <img v-if="previewUrl" :src="previewUrl" class="decode-preview" alt="待识别图片" />

        <div v-else class="drop-placeholder">
          <QrcodeOutlined class="drop-icon" />
          <div class="drop-title">点击选择 / 拖拽图片 / 粘贴截图</div>
          <div class="drop-desc">支持常见图片格式，本地识别不上传</div>
        </div>
      </div>

      <div class="decode-actions">
        <a-button
          size="small"
          :disabled="!previewUrl || decoding"
          :loading="decoding"
          @click="decodeCurrent"
        >
          重新识别
        </a-button>
        <a-button size="small" :disabled="!previewUrl" @click="clearDecode">清空</a-button>
      </div>

      <div v-if="decodeError" class="mt-2 result-block">
        <a-alert type="error" show-icon :message="decodeError" />
      </div>

      <div v-if="decodeResult !== null" class="mt-2 result-block">
        <div class="result-header">
          <span class="result-label">识别结果</span>
          <a-button type="link" size="small" :disabled="!decodeResult" @click="copyResult">
            复制
          </a-button>
        </div>
        <a-textarea :value="decodeResult" :rows="5" readonly class="result-box tool-mono" />
        <div v-if="isLikelyUrl(decodeResult)" class="mt-2 open-link-row">
          <a-button size="small" type="primary" @click="openResultUrl">打开链接</a-button>
        </div>
      </div>
    </div>
  </ToolPage>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { QrcodeOutlined } from '@ant-design/icons-vue'
import vueQr from 'vue-qr/src/packages/vue-qr.vue'
import jsQR from 'jsqr'
import { copy } from '@/util/util'
import ToolPage from '@/components/tool-page/index.vue'

type Mode = 'generate' | 'decode'

const mode = ref<Mode>('generate')

/* ---------------- 生成 ---------------- */

const text = ref('')
const title = ref('')
const size = ref(256)
const qrDataUrl = ref('')
const composedUrl = ref('')

const wrapText = (ctx: CanvasRenderingContext2D, str: string, maxWidth: number) => {
  const lines: string[] = []
  let line = ''
  for (const ch of str) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line)
      line = ch
    } else {
      line += ch
    }
  }
  if (line) lines.push(line)
  return lines
}

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const compose = () => {
  if (!qrDataUrl.value) return
  const img = new Image()
  img.onload = () => {
    const w = size.value
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const hasTitle = !!title.value
    const fontSize = Math.max(14, Math.round(w * 0.07))
    const padding = Math.round(fontSize * 0.7)
    const lineHeight = Math.round(fontSize * 1.35)

    ctx.font = `600 ${fontSize}px sans-serif`
    const lines = hasTitle ? wrapText(ctx, title.value, w - padding * 2) : []
    const titleH = hasTitle ? lines.length * lineHeight + padding * 2 : 0

    canvas.width = w
    canvas.height = w + titleH

    const radius = Math.max(8, Math.round(w * 0.03))
    roundRectPath(ctx, 0, 0, canvas.width, canvas.height, radius)
    ctx.clip()

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (hasTitle) {
      ctx.fillStyle = '#1677ff'
      ctx.fillRect(0, 0, w, titleH)
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 ${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      lines.forEach((ln, i) => {
        ctx.fillText(ln, w / 2, padding + lineHeight * i + lineHeight / 2)
      })
    }

    ctx.drawImage(img, 0, titleH, w, w)
    composedUrl.value = canvas.toDataURL('image/png')
  }
  img.src = qrDataUrl.value
}

const onQrReady = (dataUrl: string) => {
  qrDataUrl.value = dataUrl
  compose()
}

watch(title, compose)

/* ---------------- 识别 ---------------- */

const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const decodeResult = ref<string | null>(null)
const decodeError = ref('')
const decoding = ref(false)
const dragOver = ref(false)

let objectUrl: string | null = null

const revokePreview = () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = null
  }
}

const openFilePicker = () => {
  fileInputRef.value?.click()
}

const clearDecode = () => {
  revokePreview()
  previewUrl.value = ''
  decodeResult.value = null
  decodeError.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const isLikelyUrl = (value: string) => {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const loadImageFromUrl = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })

const getImageData = async (img: HTMLImageElement) => {
  const canvas = document.createElement('canvas')
  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight, 1))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 不可用')
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

const tryDecodeImageData = (imageData: ImageData) => {
  const normal = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  })
  return normal?.data ?? null
}

const decodeFromUrl = async (url: string) => {
  decoding.value = true
  decodeError.value = ''
  decodeResult.value = null
  try {
    const img = await loadImageFromUrl(url)
    const imageData = await getImageData(img)
    const result = tryDecodeImageData(imageData)
    if (!result) {
      decodeError.value = '未识别到二维码，请换更清晰的图片试试'
      return
    }
    decodeResult.value = result
  } catch (error) {
    console.error(error)
    decodeError.value = error instanceof Error ? error.message : '识别失败'
  } finally {
    decoding.value = false
  }
}

const setPreviewAndDecode = async (url: string, isObjectUrl = false) => {
  revokePreview()
  if (isObjectUrl) objectUrl = url
  previewUrl.value = url
  await nextTick()
  await decodeFromUrl(url)
}

const handleFile = async (file: File) => {
  if (!file.type.startsWith('image/')) {
    message.warning('请选择图片文件')
    return
  }
  const url = URL.createObjectURL(file)
  await setPreviewAndDecode(url, true)
}

const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) await handleFile(file)
}

const onDrop = async (e: DragEvent) => {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) await handleFile(file)
}

const onPaste = async (e: ClipboardEvent) => {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItem = items.find((i) => i.type.startsWith('image/'))
  if (!imageItem) return
  const file = imageItem.getAsFile()
  if (file) {
    e.preventDefault()
    await handleFile(file)
  }
}

const decodeCurrent = async () => {
  if (!previewUrl.value) return
  await decodeFromUrl(previewUrl.value)
}

const copyResult = () => {
  if (!decodeResult.value) return
  copy(decodeResult.value)
}

const openResultUrl = () => {
  if (!decodeResult.value || !isLikelyUrl(decodeResult.value)) return
  window.open(decodeResult.value, '_blank', 'noopener,noreferrer')
}

watch(mode, (m) => {
  if (m === 'decode') {
    nextTick(() => {
      const el = document.querySelector('.drop-zone') as HTMLElement | null
      el?.focus()
    })
  }
})
</script>

<style scoped>
.panel {
  width: 100%;
}

.generate-form {
  width: 100%;
}

.size-input {
  width: 160px;
}

.preview-wrap {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.qr-img {
  max-width: 100%;
  border-radius: var(--app-radius-sm);
  box-shadow: 0 2px 12px var(--app-shadow);
}

.qr-hidden {
  position: absolute;
  left: -99999px;
  top: 0;
}

.drop-zone {
  position: relative;
  min-height: 240px;
  border: 1.5px dashed var(--app-card-border);
  border-radius: var(--app-radius);
  background: var(--app-card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
  outline: none;
}

.drop-zone:hover,
.drop-zone:focus-visible {
  border-color: var(--app-card-hover-border);
  box-shadow: 0 2px 10px var(--app-shadow);
}

.drop-zone.is-dragover {
  border-color: #1677ff;
  background: rgba(22, 119, 255, 0.04);
}

.drop-zone.has-preview {
  min-height: 300px;
  padding: 16px;
}

.file-input {
  display: none;
}

.drop-placeholder {
  text-align: center;
  color: var(--app-muted);
  padding: 28px 20px;
}

.drop-icon {
  font-size: 40px;
  color: var(--app-icon-color);
  margin-bottom: 12px;
}

.drop-title {
  font-size: 14px;
  color: var(--app-text);
  margin-bottom: 6px;
}

.drop-desc {
  font-size: 12px;
}

.decode-preview {
  max-width: 100%;
  max-height: 360px;
  object-fit: contain;
  border-radius: 6px;
}

.decode-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.result-block {
  width: 100%;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.result-label {
  font-size: 13px;
  color: var(--app-muted);
}

.result-box :deep(textarea) {
  font-family: var(--app-mono);
  font-size: 13px;
}

.open-link-row {
  display: flex;
  justify-content: center;
}
</style>
