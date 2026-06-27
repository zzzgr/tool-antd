<template>
  <div class="tool-icon" :style="{ width: size, height: size, color: color }" v-html="iconSvg"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import timestampIcon from '@/assets/icons/timestamp.svg?raw'
import jsonIcon from '@/assets/icons/json.svg?raw'
import imageIcon from '@/assets/icons/image.svg?raw'
import codecIcon from '@/assets/icons/codec.svg?raw'
import qrcodeIcon from '@/assets/icons/qrcode.svg?raw'
import textIcon from '@/assets/icons/text.svg?raw'
import videoIcon from '@/assets/icons/video.svg?raw'
import diffIcon from '@/assets/icons/diff.svg?raw'
import uaIcon from '@/assets/icons/ua.svg?raw'
import gifIcon from '@/assets/icons/gif.svg?raw'
import textprocIcon from '@/assets/icons/textproc.svg?raw'
import uuidIcon from '@/assets/icons/uuid.svg?raw'
import regexIcon from '@/assets/icons/regex.svg?raw'
import imgbase64Icon from '@/assets/icons/imgbase64.svg?raw'
import jwtIcon from '@/assets/icons/jwt.svg?raw'

const props = withDefaults(
  defineProps<{
    name: string
    size?: string
    color?: string
  }>(),
  {
    size: '48px',
    color: 'var(--app-icon-color)'
  }
)

const iconMap: Record<string, string> = {
  timestamp: timestampIcon,
  json: jsonIcon,
  image: imageIcon,
  codec: codecIcon,
  qrcode: qrcodeIcon,
  text: textIcon,
  video: videoIcon,
  diff: diffIcon,
  ua: uaIcon,
  gif: gifIcon,
  textproc: textprocIcon,
  uuid: uuidIcon,
  regex: regexIcon,
  imgbase64: imgbase64Icon,
  jwt: jwtIcon
}

const iconSvg = computed(() => {
  return iconMap[props.name] || ''
})
</script>

<style scoped>
.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.tool-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}
</style>
