<template>
  <a-form :label-col="{ span: 2 }">
    <a-form-item label="文本">
      <a-textarea :rows="8" v-model:value="text" />
    </a-form-item>

    <a-form-item label="标题">
      <a-input v-model:value="title" placeholder="可选，显示在二维码上方" allow-clear />
    </a-form-item>

    <a-form-item label="宽高">
      <a-input-number id="inputNumber" v-model:value="size" step="32" />
    </a-form-item>
  </a-form>

  <!-- 合成后的图片：复制/保存即带标题 -->
  <div class="mt-2 text-center" v-if="text.length > 0 && composedUrl">
    <img :src="composedUrl" class="qr-img" alt="二维码" />
  </div>

  <!-- 隐藏的 vue-qr，仅用于生成二维码图源 -->
  <div v-if="text.length > 0" class="qr-hidden">
    <vue-qr :size="size" :text="text" :margin="16" :callback="onQrReady" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import vueQr from 'vue-qr/src/packages/vue-qr.vue'
// import VueQr from 'vue-qr'

const text = ref<string>('')
const title = ref<string>('')
const size = ref<number>(256)

const qrDataUrl = ref<string>('') // vue-qr 生成的二维码图源
const composedUrl = ref<string>('') // 合成标题后的最终图片

// 按宽度逐字折行（兼容中英文）
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

// 圆角矩形路径（兼容无 roundRect 的环境）
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

// 把标题栏 + 二维码合成为一张图片
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

    // 先用临时字体测量折行
    ctx.font = `600 ${fontSize}px sans-serif`
    const lines = hasTitle ? wrapText(ctx, title.value, w - padding * 2) : []
    const titleH = hasTitle ? lines.length * lineHeight + padding * 2 : 0

    canvas.width = w
    canvas.height = w + titleH

    // 圆角裁剪：圆角外保持透明，复制/保存的图片即带圆角
    const radius = Math.max(8, Math.round(w * 0.03))
    roundRectPath(ctx, 0, 0, canvas.width, canvas.height, radius)
    ctx.clip()

    // 白底
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 标题栏（蓝底白字）
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

    // 二维码
    ctx.drawImage(img, 0, titleH, w, w)
    composedUrl.value = canvas.toDataURL('image/png')
  }
  img.src = qrDataUrl.value
}

const onQrReady = (dataUrl: string) => {
  qrDataUrl.value = dataUrl
  compose()
}

// 仅标题变化时不会触发 vue-qr 重渲染，需手动重新合成
watch(title, compose)
</script>

<style scoped>
.qr-img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 12px var(--app-shadow);
}

.qr-hidden {
  position: absolute;
  left: -99999px;
  top: 0;
}
</style>
