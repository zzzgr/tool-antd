<template>
  <div class="gif-page">
    <div class="gif-layout">
      <!-- 左：控制区 -->
      <section class="panel control-panel">
        <a-upload-dragger
          class="uploader"
          :before-upload="handleUpload"
          :show-upload-list="false"
          accept="image/*,.gif"
          @drop="handleDrop"
        >
          <p class="ant-upload-drag-icon">
            <inbox-outlined />
          </p>
          <p class="ant-upload-text">点击或拖拽图片 / GIF 到此</p>
          <p class="ant-upload-hint">支持 Ctrl+V 粘贴 · 最大 10MB</p>
        </a-upload-dragger>

        <div v-if="sourceMeta" class="source-meta">
          <span>{{ sourceMeta }}</span>
          <a-button type="link" size="small" class="clear-btn" @click="clearSource">清除</a-button>
        </div>

        <div class="field">
          <span class="field-label">制作模式</span>
          <a-radio-group v-model:value="mode" button-style="solid" class="mode-group">
            <a-radio-button value="scroll">滚动</a-radio-button>
            <a-radio-button value="grid">宫格</a-radio-button>
          </a-radio-group>
        </div>

        <div v-if="mode === 'scroll'" class="field">
          <span class="field-label">滚动速度</span>
          <a-radio-group v-model:value="speed" button-style="solid" class="speed-group">
            <a-radio-button value="low">低速</a-radio-button>
            <a-radio-button value="medium">中速</a-radio-button>
            <a-radio-button value="high">高速</a-radio-button>
          </a-radio-group>
        </div>

        <div v-else class="field">
          <span class="field-label">宫格 n × n（1–10）</span>
          <div class="grid-n-row">
            <a-slider v-model:value="gridN" :min="1" :max="10" :marks="gridMarks" />
            <a-input-number v-model:value="gridN" :min="1" :max="10" class="grid-n-input" />
          </div>
          <p class="field-hint">将原图/GIF 重复铺成 {{ gridN }}×{{ gridN }} 大图，GIF 保持动态</p>
        </div>

        <div class="actions">
          <a-button v-if="sourceImage && mode === 'scroll'" block @click="openCrop">
            <template #icon><scissor-outlined /></template>
            裁剪图片
          </a-button>

          <a-button
            v-if="sourceImage && sourceImage !== originalImage && mode === 'scroll'"
            block
            @click="resetCrop"
          >
            重置为原图
          </a-button>

          <a-button
            type="primary"
            block
            :loading="generating"
            :disabled="!sourceImage"
            @click="generate"
          >
            <template v-if="!generating" #icon><thunderbolt-outlined /></template>
            {{ generateButtonText }}
          </a-button>

          <a-button
            v-if="resultUrl && !generating && !resultIsGif"
            block
            :loading="copying"
            @click="copyResult"
          >
            <template v-if="!copying" #icon><copy-outlined /></template>
            复制到剪贴板
          </a-button>

          <a-button
            v-if="resultUrl && !generating && resultIsGif"
            block
            :loading="copying"
            @click="copyResult"
          >
            <template v-if="!copying" #icon><copy-outlined /></template>
            {{ canShareFile ? '分享 / 发送 GIF' : '获取 GIF（下载）' }}
          </a-button>

          <a-button v-if="resultUrl && !generating" block type="primary" ghost @click="downloadResult">
            <template #icon><download-outlined /></template>
            下载{{ resultIsGif ? ' GIF' : ' 图片' }}
          </a-button>
        </div>

        <div v-if="generating" class="progress-wrap">
          <a-progress :percent="progress" :status="progress === 100 ? 'success' : 'active'" />
        </div>
      </section>

      <!-- 右：预览区 -->
      <section class="panel preview-panel">
        <div class="preview-stage">
          <template v-if="resultUrl">
            <img
              :src="resultUrl"
              alt="生成结果"
              class="stage-img"
              :class="{ 'is-draggable': resultIsGif }"
              :draggable="resultIsGif"
              @dragstart="onResultDragStart"
            />
            <span class="stage-tag">{{ resultIsGif ? 'GIF' : 'JPG' }}</span>
          </template>
          <template v-else-if="sourceImage">
            <img :src="sourceImage" alt="原图预览" class="stage-img" />
            <span class="stage-tag is-muted">{{ isSourceGif ? '原 GIF' : '原图' }}</span>
          </template>
          <div v-else class="stage-empty">
            <file-image-outlined class="stage-empty-icon" />
            <span>在左侧上传图片或 GIF 后，这里显示预览</span>
          </div>
        </div>

        <div v-if="sourceImage" class="preview-footer">
          <template v-if="resultUrl">
            <img :src="sourceImage" alt="原图" class="thumb" />
            <div class="footer-meta">
              <div class="footer-title">原图对比</div>
              <div v-if="resultInfo" class="footer-text">
                {{ resultInfo.width }} × {{ resultInfo.height }} · {{ resultInfo.size }}
              </div>
              <div v-if="resultIsGif" class="footer-text footer-tip">
                Chrome 无法把动态 GIF 写进剪贴板 · 可下载，或把预览图拖到微信/聊天框
              </div>
            </div>
          </template>
          <span v-else class="footer-text">
            {{
              mode === 'scroll'
                ? '原图预览 · 点击「生成」查看滚动效果'
                : `原图预览 · 点击「生成」得到 ${gridN}×${gridN} 宫格`
            }}
          </span>
        </div>
      </section>
    </div>

    <!-- 裁剪弹窗（仅滚动模式） -->
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  CopyOutlined,
  DownloadOutlined,
  FileImageOutlined,
  InboxOutlined,
  ScissorOutlined,
  ThunderboltOutlined
} from '@ant-design/icons-vue'
import { VueCropper } from 'vue-cropper'
import 'vue-cropper/dist/index.css'
import GIF from 'gif.js'
import { decompressFrames, parseGIF } from 'gifuct-js'
import type { ParsedFrame } from 'gifuct-js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
/** 编码帧数上限：帧多 = 体积大 + 内存高 */
const MAX_FRAMES = 48
/** 滚动输出最长边（表情包够用，过大体积爆炸） */
const SCROLL_MAX_SIDE = 480
/** 宫格输出最长边 */
const GRID_MAX_SIDE = 720
/** gif.js quality：数值越大采样越稀、文件越小（画质略降） */
const GIF_QUALITY = 20

type Mode = 'scroll' | 'grid'
type Speed = 'low' | 'medium' | 'high'

const mode = ref<Mode>('scroll')
const speed = ref<Speed>('medium')
const gridN = ref(3)
const gridMarks: Record<number, string> = { 1: '1', 3: '3', 5: '5', 10: '10' }

const originalImage = ref('') // 上传原图 dataURL / objectURL 预览
const sourceImage = ref('') // 当前用于生成的图（滚动可裁剪）
const sourceFile = ref<File | null>(null)
const sourceBuffer = ref<ArrayBuffer | null>(null) // GIF 原始二进制
const isSourceGif = ref(false)
const sourceMeta = ref('')

const generating = ref(false)
const copying = ref(false)
const progress = ref(0)
const resultUrl = ref('')
const resultBlob = ref<Blob | null>(null)
const resultIsGif = ref(false)
const resultInfo = ref<{ width: number; height: number; size: string } | null>(null)

const cropVisible = ref(false)
const cropper = ref<any>(null)

const speedConfig: Record<Speed, number> = {
  low: 50,
  medium: 150,
  high: 300
}

const generateButtonText = computed(() => {
  if (generating.value) return '生成中…'
  if (resultUrl.value) return '重新生成'
  return mode.value === 'scroll' ? '生成滚动 GIF' : '生成宫格'
})

const formatSize = (bytes: number): string => {
  const kb = bytes / 1024
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`
}

const revokeResult = () => {
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
  }
  resultBlob.value = null
  resultInfo.value = null
  resultIsGif.value = false
}

/** 等比缩放到最长边不超过 maxSide */
const fitSize = (w: number, h: number, maxSide: number) => {
  const max = Math.max(w, h)
  if (max <= maxSide) return { width: w, height: h }
  const scale = maxSide / max
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale))
  }
}

const clearSource = () => {
  originalImage.value = ''
  sourceImage.value = ''
  sourceFile.value = null
  sourceBuffer.value = null
  isSourceGif.value = false
  sourceMeta.value = ''
  revokeResult()
}

const isGifFile = (file: File) =>
  file.type === 'image/gif' || /\.gif$/i.test(file.name)

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })

// 处理文件上传
const handleUpload = (file: File) => {
  if (!file.type.startsWith('image/') && !isGifFile(file)) {
    message.error('请上传图片或 GIF 文件')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    message.error('文件大小不能超过 10MB')
    return false
  }

  const gif = isGifFile(file)
  isSourceGif.value = gif
  sourceFile.value = file
  sourceMeta.value = `${file.name || '未命名'} · ${formatSize(file.size)}${gif ? ' · GIF' : ''}`

  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string
    originalImage.value = dataUrl
    sourceImage.value = dataUrl
    revokeResult()

    if (gif) {
      try {
        sourceBuffer.value = await file.arrayBuffer()
      } catch {
        sourceBuffer.value = null
        message.warning('GIF 读取失败，将按静态图处理')
        isSourceGif.value = false
      }
    } else {
      sourceBuffer.value = null
    }
    message.success('上传成功')
  }
  reader.onerror = () => message.error('读取文件失败')
  reader.readAsDataURL(file)
  return false
}

const openCrop = () => {
  cropVisible.value = true
}

const confirmCrop = () => {
  cropper.value?.getCropData((data: string) => {
    sourceImage.value = data
    // 裁剪后按静态图处理
    isSourceGif.value = false
    sourceBuffer.value = null
    revokeResult()
    cropVisible.value = false
    message.success('裁剪完成')
  })
}

const resetCrop = () => {
  sourceImage.value = originalImage.value
  isSourceGif.value = !!(sourceFile.value && isGifFile(sourceFile.value))
  if (isSourceGif.value && sourceFile.value) {
    sourceFile.value.arrayBuffer().then((buf) => {
      sourceBuffer.value = buf
    })
  }
  revokeResult()
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
}

const handlePaste = (e: ClipboardEvent) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) handleUpload(file)
      break
    }
  }
}

watch(mode, () => {
  revokeResult()
})

watch(gridN, () => {
  if (mode.value === 'grid') revokeResult()
})

// ---------- 公共：用 gif.js 编码（边画边 addFrame，copy:true 拷像素） ----------
const encodeGif = (
  width: number,
  height: number,
  totalFrames: number,
  drawFrame: (index: number, ctx: CanvasRenderingContext2D) => number,
  onProgress?: (p: number) => void
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const gif = new GIF({
      workers: 2,
      quality: GIF_QUALITY,
      width,
      height,
      workerScript: '/gif.worker.js'
    })
    if (onProgress) {
      gif.on('progress', (p: number) => onProgress(Math.floor(p * 100)))
    }
    gif.on('finished', (blob: Blob) => resolve(blob))
    gif.on('abort', () => reject(new Error('GIF 编码已中止')))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    try {
      for (let i = 0; i < totalFrames; i++) {
        ctx.clearRect(0, 0, width, height)
        const delay = drawFrame(i, ctx)
        gif.addFrame(ctx, { copy: true, delay: Math.max(40, delay || 100) })
      }
      gif.render()
    } catch (err) {
      reject(err)
    }
  })

const finishWithBlob = (blob: Blob, width: number, height: number, asGif: boolean) => {
  revokeResult()
  resultBlob.value = blob
  resultUrl.value = URL.createObjectURL(blob)
  resultIsGif.value = asGif
  resultInfo.value = { width, height, size: formatSize(blob.size) }
  generating.value = false
  progress.value = 100
  message.success('生成成功！可下载或复制到剪贴板')
}

// ---------- 滚动模式 ----------
const generateScrollGif = async () => {
  const img = await loadImage(sourceImage.value)
  // 先缩输出尺寸，再算帧数（体积 ≈ 宽×高×帧数）
  const { width: scaledWidth, height: scaledHeight } = fitSize(
    img.width,
    img.height,
    SCROLL_MAX_SIDE
  )

  // 表情包帧率不必 30fps；12fps 观感足够且体积小很多
  const fps = 12
  const pixelsPerSecond = speedConfig[speed.value]
  let pixelsPerFrame = pixelsPerSecond / fps
  let totalFrames = Math.ceil(scaledHeight / pixelsPerFrame)
  let delay = Math.round(1000 / fps)

  // 帧数超限时降帧：保持滚动速度观感不变，仅降低帧率
  if (totalFrames > MAX_FRAMES) {
    totalFrames = MAX_FRAMES
    pixelsPerFrame = scaledHeight / totalFrames
    const loopSeconds = scaledHeight / pixelsPerSecond
    delay = Math.round((loopSeconds * 1000) / totalFrames)
  }

  const blob = await encodeGif(
    scaledWidth,
    scaledHeight,
    totalFrames,
    (i, ctx) => {
      const offset = (i * pixelsPerFrame) % scaledHeight
      // 源图按输出尺寸拉伸绘制（与缩放后的画布一致）
      const srcOffset = (offset / scaledHeight) * img.height
      const srcRemain = img.height - srcOffset
      const dstRemain = scaledHeight - offset
      ctx.drawImage(
        img,
        0,
        srcOffset,
        img.width,
        srcRemain,
        0,
        0,
        scaledWidth,
        dstRemain
      )
      if (offset > 0 && srcOffset > 0) {
        ctx.drawImage(img, 0, 0, img.width, srcOffset, 0, dstRemain, scaledWidth, offset)
      }
      return delay
    },
    (p) => {
      progress.value = p
    }
  )
  finishWithBlob(blob, scaledWidth, scaledHeight, true)
}

// ---------- 宫格：解码 GIF 全帧（合成 disposal） ----------
type FullFrame = { imageData: ImageData; delay: number }

const decodeGifFullFrames = (buffer: ArrayBuffer): FullFrame[] => {
  const parsed = parseGIF(buffer)
  const frames = decompressFrames(parsed, true) as ParsedFrame[]
  if (!frames.length) throw new Error('GIF 无有效帧')

  const width = parsed.lsd.width
  const height = parsed.lsd.height
  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = width
  fullCanvas.height = height
  const fullCtx = fullCanvas.getContext('2d')!
  const patchCanvas = document.createElement('canvas')
  const patchCtx = patchCanvas.getContext('2d')!

  // 与 gifuct demo 一致：disposal=2 在画下一帧前清屏；disposal=3 恢复到画本帧前
  let restorePrev: ImageData | null = null
  let clearBeforeNext = false
  const result: FullFrame[] = []

  for (const frame of frames) {
    if (clearBeforeNext) {
      fullCtx.clearRect(0, 0, width, height)
      clearBeforeNext = false
    }
    if (restorePrev) {
      fullCtx.putImageData(restorePrev, 0, 0)
      restorePrev = null
    }

    if (frame.disposalType === 3) {
      restorePrev = fullCtx.getImageData(0, 0, width, height)
    }

    const dims = frame.dims
    if (
      patchCanvas.width !== dims.width ||
      patchCanvas.height !== dims.height
    ) {
      patchCanvas.width = dims.width
      patchCanvas.height = dims.height
    }
    const patchData = patchCtx.createImageData(dims.width, dims.height)
    patchData.data.set(frame.patch)
    patchCtx.putImageData(patchData, 0, 0)
    fullCtx.drawImage(patchCanvas, dims.left, dims.top)

    result.push({
      imageData: fullCtx.getImageData(0, 0, width, height),
      delay: frame.delay > 0 ? frame.delay : 100
    })

    if (frame.disposalType === 2) {
      // 下一帧开始前清整画布（与 demo 行为一致）
      clearBeforeNext = true
      restorePrev = null
    }
  }

  return result
}

/** 计算宫格输出尺寸（等比缩放，最长边不超过 GRID_MAX_SIDE） */
const calcGridSize = (srcW: number, srcH: number, n: number) => {
  let cellW = srcW
  let cellH = srcH
  const outW0 = cellW * n
  const outH0 = cellH * n
  const maxSide = Math.max(outW0, outH0)
  if (maxSide > GRID_MAX_SIDE) {
    const scale = GRID_MAX_SIDE / maxSide
    cellW = Math.max(1, Math.floor(cellW * scale))
    cellH = Math.max(1, Math.floor(cellH * scale))
  }
  return { cellW, cellH, outW: cellW * n, outH: cellH * n }
}

const drawGridFromImage = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  n: number,
  cellW: number,
  cellH: number,
  srcW: number,
  srcH: number
) => {
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      ctx.drawImage(source, 0, 0, srcW, srcH, col * cellW, row * cellH, cellW, cellH)
    }
  }
}

const generateGridStatic = async () => {
  const img = await loadImage(sourceImage.value)
  const n = gridN.value
  const { cellW, cellH, outW, outH } = calcGridSize(img.width, img.height, n)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!
  drawGridFromImage(ctx, img, n, cellW, cellH, img.width, img.height)

  progress.value = 70
  // JPEG 体积远小于 PNG；透明图可再改回 png，表情包一般不需要
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('导出图片失败'))),
      'image/jpeg',
      0.82
    )
  })
  finishWithBlob(blob, outW, outH, false)
}

const generateGridGif = async () => {
  if (!sourceBuffer.value) {
    await generateGridStatic()
    return
  }

  progress.value = 5
  let frames = decodeGifFullFrames(sourceBuffer.value)
  progress.value = 25

  const srcW = frames[0].imageData.width
  const srcH = frames[0].imageData.height
  const n = gridN.value
  const { cellW, cellH, outW, outH } = calcGridSize(srcW, srcH, n)

  // 帧过多时均匀采样，delay 合并，避免体积/内存爆炸
  if (frames.length > MAX_FRAMES) {
    const step = frames.length / MAX_FRAMES
    const sampled: FullFrame[] = []
    for (let i = 0; i < MAX_FRAMES; i++) {
      const idx = Math.min(frames.length - 1, Math.floor(i * step))
      const nextIdx = Math.min(frames.length, Math.floor((i + 1) * step))
      let delay = 0
      for (let j = idx; j < nextIdx; j++) delay += frames[j].delay
      if (delay <= 0) delay = frames[idx].delay || 100
      sampled.push({ imageData: frames[idx].imageData, delay })
    }
    frames = sampled
  }

  // 先缩到 cell 尺寸再 putImageData 会失真；用中间 canvas 缩放
  const cellCanvas = document.createElement('canvas')
  cellCanvas.width = srcW
  cellCanvas.height = srcH
  const cellCtx = cellCanvas.getContext('2d')!

  const blob = await encodeGif(
    outW,
    outH,
    frames.length,
    (i, ctx) => {
      cellCtx.putImageData(frames[i].imageData, 0, 0)
      drawGridFromImage(ctx, cellCanvas, n, cellW, cellH, srcW, srcH)
      progress.value = 25 + Math.floor(((i + 1) / frames.length) * 25)
      return frames[i].delay
    },
    (p) => {
      progress.value = 50 + Math.floor(p * 0.5)
    }
  )
  finishWithBlob(blob, outW, outH, true)
}

// ---------- 入口 ----------
const generate = async () => {
  if (!sourceImage.value) {
    message.error('请先上传图片或 GIF')
    return
  }
  generating.value = true
  progress.value = 0
  revokeResult()

  try {
    if (mode.value === 'scroll') {
      await generateScrollGif()
    } else if (isSourceGif.value && sourceBuffer.value) {
      await generateGridGif()
    } else {
      await generateGridStatic()
    }
  } catch (error) {
    console.error('生成失败:', error)
    message.error(error instanceof Error ? error.message : '生成失败，请重试')
    generating.value = false
  }
}

const buildResultFilename = () => {
  const mime = resultBlob.value?.type || ''
  const ext = resultIsGif.value
    ? 'gif'
    : mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : 'png'
  const prefix = mode.value === 'scroll' ? 'scroll' : `grid-${gridN.value}x${gridN.value}`
  return `${prefix}-${Date.now()}.${ext}`
}

const downloadResult = (silent = false) => {
  if (!resultUrl.value || !resultBlob.value) return
  const a = document.createElement('a')
  a.href = resultUrl.value
  a.download = buildResultFilename()
  a.click()
  if (!silent) message.success('开始下载')
}

/** Chrome 桌面端几乎只允许剪贴板写 image/png，动态 GIF 走分享或下载 */
const canShareFile = computed(() => {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false
    if (typeof navigator.canShare !== 'function') return true
    const probe = new File([new Uint8Array([0])], 'probe.gif', { type: 'image/gif' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
})

const shareOrDownloadGif = async () => {
  if (!resultBlob.value) return
  const file = new File([resultBlob.value], buildResultFilename(), {
    type: resultBlob.value.type || 'image/gif'
  })

  // 1) Web Share（部分 Chrome / 移动端可把文件发给微信等）
  if (typeof navigator.share === 'function') {
    try {
      const payload: ShareData = { files: [file], title: file.name }
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload)
        message.success('已打开系统分享')
        return
      }
    } catch (err: any) {
      // 用户取消不算失败
      if (err?.name === 'AbortError') return
      console.warn('系统分享失败，回退下载', err)
    }
  }

  // 2) 自动下载：Chrome 剪贴板不支持 image/gif，这是桌面端最稳的路径
  downloadResult(true)
  message.info({
    content: 'Chrome 不能复制动态 GIF 到剪贴板，已为你下载。也可直接把右侧预览拖到微信/聊天框。',
    duration: 5
  })
}

/**
 * 复制 / 获取结果：
 * - 静图：Clipboard API 写 image/png（Chrome 支持）
 * - GIF：Chrome 不支持 image/gif 写入剪贴板 → 系统分享，否则自动下载 + 提示拖拽
 */
const copyResult = async () => {
  if (!resultBlob.value || copying.value) return
  copying.value = true
  try {
    if (resultIsGif.value) {
      await shareOrDownloadGif()
      return
    }

    if (
      !window.isSecureContext ||
      !navigator.clipboard?.write ||
      typeof ClipboardItem === 'undefined'
    ) {
      throw new Error('当前环境不支持复制，请改用下载')
    }

    const blob = resultBlob.value
    // Chrome 对图片剪贴板最稳的是 image/png
    const pngBlob =
      blob.type === 'image/png' ? blob : await blobToPngBlob(blob)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error(error)
    message.error(error instanceof Error ? error.message : '操作失败，请改用下载')
  } finally {
    copying.value = false
  }
}

const blobToPngBlob = (blob: Blob): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.naturalWidth
        c.height = img.naturalHeight
        c.getContext('2d')!.drawImage(img, 0, 0)
        c.toBlob((b) => {
          URL.revokeObjectURL(url)
          b ? resolve(b) : reject(new Error('转换 PNG 失败'))
        }, 'image/png')
      } catch (e) {
        URL.revokeObjectURL(url)
        reject(e)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })

/** 拖拽预览 GIF 到外部应用（微信等）时带上真实文件 */
const onResultDragStart = (e: DragEvent) => {
  if (!resultIsGif.value || !resultBlob.value || !e.dataTransfer) return
  const name = buildResultFilename()
  const file = new File([resultBlob.value], name, {
    type: resultBlob.value.type || 'image/gif'
  })
  try {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('DownloadURL', `image/gif:${name}:${resultUrl.value}`)
    e.dataTransfer.setData('text/uri-list', resultUrl.value)
    e.dataTransfer.items?.add?.(file)
  } catch (err) {
    console.warn('设置拖拽数据失败', err)
  }
}

onMounted(() => {
  document.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
  revokeResult()
})
</script>

<style scoped lang="less">
.gif-page {
  padding: 24px;
  max-width: 1080px;
  margin: 0 auto;
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

.field-hint {
  margin: 0;
  font-size: 12px;
  color: var(--app-muted);
  line-height: 1.4;
}

.mode-group,
.speed-group {
  display: flex;
  width: 100%;

  :deep(.ant-radio-button-wrapper) {
    flex: 1;
    text-align: center;
  }
}

.grid-n-row {
  display: flex;
  align-items: center;
  gap: 12px;

  :deep(.ant-slider) {
    flex: 1;
    margin: 8px 6px 12px;
  }
}

.grid-n-input {
  width: 64px;
  flex-shrink: 0;
}

.source-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: -8px;
  font-size: 12px;
  color: var(--app-muted);
  word-break: break-all;
}

.clear-btn {
  flex-shrink: 0;
  padding: 0;
  height: auto;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-wrap {
  margin-top: -4px;
}

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

  &.is-draggable {
    cursor: grab;
  }

  &.is-draggable:active {
    cursor: grabbing;
  }
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

.footer-tip {
  margin-top: 2px;
  line-height: 1.4;
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

.crop-wrap {
  width: 100%;
  height: 60vh;
  max-height: 520px;
}

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

@media (max-width: 480px) {
  .gif-page {
    padding: 12px;
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
