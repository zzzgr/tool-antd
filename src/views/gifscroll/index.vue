<template>
  <div class="gif-page">
    <div class="gif-layout">
      <!-- 左：控制区 -->
      <section class="panel control-panel">
        <a-upload-dragger
          class="uploader"
          :before-upload="handleUpload"
          :show-upload-list="false"
          accept="image/*"
          @drop="handleDrop"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined />
          </p>
          <p class="ant-upload-text">点击或拖拽图片到此</p>
          <p class="ant-upload-hint">支持 Ctrl+V 粘贴</p>
        </a-upload-dragger>

        <div class="field">
          <span class="field-label">滚动速度</span>
          <a-radio-group v-model:value="speed" button-style="solid" class="speed-group">
            <a-radio-button value="low">低速</a-radio-button>
            <a-radio-button value="medium">中速</a-radio-button>
            <a-radio-button value="high">高速</a-radio-button>
          </a-radio-group>
        </div>

        <div class="actions">
          <a-button v-if="sourceImage" block @click="openCrop">
            <template #icon><scissor-outlined /></template>
            裁剪图片
          </a-button>

          <a-button v-if="sourceImage && sourceImage !== originalImage" block @click="resetCrop">
            重置为原图
          </a-button>

          <a-button
            type="primary"
            block
            :loading="generating"
            :disabled="!sourceImage"
            @click="generateGif"
          >
            <template v-if="!generating" #icon><thunderbolt-outlined /></template>
            {{ generating ? '生成中…' : generatedGif ? '重新生成' : '生成 GIF' }}
          </a-button>

          <a-button v-if="generatedGif && !generating" block @click="downloadGif">
            <template #icon><download-outlined /></template>
            下载 GIF
          </a-button>
        </div>

        <div v-if="generating" class="progress-wrap">
          <a-progress :percent="progress" :status="progress === 100 ? 'success' : 'active'" />
        </div>
      </section>

      <!-- 右：预览区 -->
      <section class="panel preview-panel">
        <div class="preview-stage">
          <template v-if="generatedGif">
            <img :src="generatedGif" alt="GIF 预览" class="stage-img" />
            <span class="stage-tag">GIF</span>
          </template>
          <template v-else-if="sourceImage">
            <img :src="sourceImage" alt="原图预览" class="stage-img" />
            <span class="stage-tag is-muted">原图</span>
          </template>
          <div v-else class="stage-empty">
            <file-image-outlined class="stage-empty-icon" />
            <span>在左侧上传图片后，这里显示预览</span>
          </div>
        </div>

        <div v-if="sourceImage" class="preview-footer">
          <template v-if="generatedGif">
            <img :src="sourceImage" alt="原图" class="thumb" />
            <div class="footer-meta">
              <div class="footer-title">原图对比</div>
              <div v-if="gifInfo" class="footer-text">
                {{ gifInfo.width }} × {{ gifInfo.height }} · {{ gifInfo.size }}
              </div>
            </div>
          </template>
          <span v-else class="footer-text">原图预览 · 点击「生成 GIF」查看滚动效果</span>
        </div>
      </section>
    </div>

    <!-- 裁剪弹窗 -->
    <a-modal
      v-model:open="cropVisible"
      title="裁剪图片"
      width="760px"
      :destroy-on-close="true"
      ok-text="确认裁剪"
      cancel-text="取消"
      @ok="confirmCrop"
    >
      <div class="crop-wrap">
        <VueCropper
          ref="cropper"
          :img="originalImage"
          :auto-crop="true"
          :fixed="false"
          :center-box="true"
          :full="true"
          output-type="png"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  DownloadOutlined,
  FileImageOutlined,
  InboxOutlined,
  ScissorOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue'
import { VueCropper } from 'vue-cropper'
import 'vue-cropper/dist/index.css'
import GIF from 'gif.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 上传图片大小上限 5MB

const originalImage = ref<string>('') // 上传的原图（裁剪基于它）
const sourceImage = ref<string>('') // 当前用于预览/生成的图（可能已裁剪）
const speed = ref<'low' | 'medium' | 'high'>('medium')
const generating = ref<boolean>(false)
const progress = ref<number>(0)
const generatedGif = ref<string>('')
const gifInfo = ref<{ width: number; height: number; size: string } | null>(null)

// 裁剪
const cropVisible = ref<boolean>(false)
const cropper = ref<any>(null)

// 速度配置 (每秒滚动的像素数)
const speedConfig = {
  low: 50,
  medium: 150,
  high: 300
}

const formatSize = (bytes: number): string => {
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}

// 回收已生成的 blob URL，避免内存泄漏
const revokeGif = () => {
  if (generatedGif.value) {
    URL.revokeObjectURL(generatedGif.value)
    generatedGif.value = ''
  }
}

// 处理文件上传
const handleUpload = (file: File) => {
  if (file.size > MAX_FILE_SIZE) {
    message.error('图片大小不能超过 5MB')
    return false
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    originalImage.value = e.target?.result as string
    sourceImage.value = originalImage.value
    revokeGif()
    gifInfo.value = null
    message.success('图片上传成功')
  }
  reader.readAsDataURL(file)
  return false
}

// 打开裁剪
const openCrop = () => {
  cropVisible.value = true
}

// 确认裁剪
const confirmCrop = () => {
  cropper.value?.getCropData((data: string) => {
    sourceImage.value = data
    revokeGif()
    gifInfo.value = null
    cropVisible.value = false
    message.success('裁剪完成')
  })
}

// 重置为原图
const resetCrop = () => {
  sourceImage.value = originalImage.value
  revokeGif()
  gifInfo.value = null
}

// 处理拖拽
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
}

// 处理粘贴
const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        handleUpload(file)
      }
      break
    }
  }
}

// 生成GIF
const generateGif = async () => {
  if (!sourceImage.value) {
    message.error('请先上传图片')
    return
  }

  generating.value = true
  progress.value = 0
  revokeGif()
  gifInfo.value = null

  try {
    const img = new Image()
    img.src = sourceImage.value

    await new Promise((resolve) => {
      img.onload = resolve
    })

    // gif.js 会缓存每一帧像素，帧数过多会 OOM，故设上限（仅影响流畅度，不损画质）
    const MAX_FRAMES = 150

    const scaledWidth = img.width
    const scaledHeight = img.height

    const canvas = document.createElement('canvas')
    canvas.width = scaledWidth
    canvas.height = scaledHeight
    const ctx = canvas.getContext('2d')!

    // 计算滚动参数
    const fps = 30 // 固定30帧每秒，保证流畅度
    const pixelsPerSecond = speedConfig[speed.value]
    let pixelsPerFrame = pixelsPerSecond / fps // 每帧移动的像素数
    let totalFrames = Math.ceil(scaledHeight / pixelsPerFrame) // 总帧数
    let delay = Math.round(1000 / fps) // 每帧延迟（毫秒）

    // 帧数超限时降帧：保持滚动速度观感不变，仅降低帧率
    if (totalFrames > MAX_FRAMES) {
      totalFrames = MAX_FRAMES
      pixelsPerFrame = scaledHeight / totalFrames
      const loopSeconds = scaledHeight / pixelsPerSecond
      delay = Math.round((loopSeconds * 1000) / totalFrames)
    }

    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: scaledWidth,
      height: scaledHeight,
      workerScript: '/gif.worker.js'
    })

    gif.on('progress', (p: number) => {
      progress.value = Math.floor(p * 100)
    })

    // 生成每一帧
    for (let i = 0; i < totalFrames; i++) {
      ctx.clearRect(0, 0, scaledWidth, scaledHeight)

      // 计算当前偏移量（精确到小数，避免跳跃）
      const offset = (i * pixelsPerFrame) % scaledHeight

      // 绘制主体部分（从offset开始往下）
      const remainingHeight = scaledHeight - offset
      ctx.drawImage(img, 0, offset, img.width, remainingHeight, 0, 0, scaledWidth, remainingHeight)

      // 绘制循环部分（从顶部开始，填充剩余空间）
      if (offset > 0) {
        ctx.drawImage(img, 0, 0, img.width, offset, 0, remainingHeight, scaledWidth, offset)
      }

      gif.addFrame(ctx, { copy: true, delay })
    }

    gif.on('finished', (blob: Blob) => {
      generatedGif.value = URL.createObjectURL(blob)
      gifInfo.value = {
        width: scaledWidth,
        height: scaledHeight,
        size: formatSize(blob.size)
      }
      generating.value = false
      message.success('GIF 生成成功！')
    })

    gif.render()
  } catch (error) {
    console.error('生成GIF失败:', error)
    message.error('生成 GIF 失败，请重试')
    generating.value = false
  }
}

// 下载GIF
const downloadGif = () => {
  if (!generatedGif.value) return

  const a = document.createElement('a')
  a.href = generatedGif.value
  a.download = `scroll-${Date.now()}.gif`
  a.click()
  message.success('开始下载')
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
  revokeGif()
})
</script>

<style scoped lang="less">
.gif-page {
  padding: 24px;
  max-width: 1080px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--app-title);
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: 0.875rem;
  color: var(--app-muted);
}

.gif-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.panel {
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: 8px;
  padding: 16px;
}

/* 左：控制区 */
.control-panel {
  flex: 0 0 296px;
  width: 296px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--app-muted);
}

.speed-group {
  display: flex;
  width: 100%;

  :deep(.ant-radio-button-wrapper) {
    flex: 1;
    text-align: center;
  }
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-wrap {
  margin-top: -4px;
}

/* 右：预览区 */
.preview-panel {
  flex: 1 1 auto;
  min-width: 0;
}

.preview-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
  max-height: 72vh;
  padding: 16px;
  background: var(--app-bg);
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
  overflow: hidden;
}

.stage-img {
  max-width: 100%;
  max-height: 460px;
  object-fit: contain;
  border-radius: 4px;
  animation: fadeIn 0.3s ease;
}

.stage-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 18px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 4px;

  &.is-muted {
    background: rgba(0, 0, 0, 0.4);
  }
}

.stage-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  color: var(--app-muted);
}

.stage-empty-icon {
  font-size: 40px;
  opacity: 0.6;
}

.preview-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  min-height: 24px;
}

.thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  background: var(--app-bg);
  border: 1px solid var(--app-card-border);
  border-radius: 6px;
}

.footer-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.footer-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--app-text);
}

.footer-text {
  font-size: 0.8125rem;
  color: var(--app-muted);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 裁剪弹窗 */
.crop-wrap {
  width: 100%;
  height: 60vh;
  max-height: 520px;
}

/* 上传框 */
.uploader :deep(.ant-upload-drag) {
  border-radius: 8px;

  .ant-upload-drag-icon {
    margin-bottom: 4px;

    .anticon {
      font-size: 28px;
    }
  }

  .ant-upload-text {
    font-size: 13px;
  }

  .ant-upload-hint {
    font-size: 12px;
  }
}

/* 平板 / 窄屏：上下堆叠 */
@media (max-width: 768px) {
  .gif-page {
    padding: 16px;
  }

  .gif-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .control-panel {
    flex-basis: auto;
    width: 100%;
  }

  .preview-panel {
    width: 100%;
  }
}

/* 手机端：进一步收紧高度与字号 */
@media (max-width: 480px) {
  .gif-page {
    padding: 12px;
  }

  .page-title {
    font-size: 1.25rem;
  }

  .preview-stage {
    min-height: 240px;
    max-height: 60vh;
    padding: 12px;
  }

  .stage-img {
    max-height: 52vh;
  }
}
</style>
