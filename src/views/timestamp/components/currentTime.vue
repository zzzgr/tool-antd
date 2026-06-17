<template>
  <div class="clock" @click="copy(full)">
    <span>{{ date }} {{ time }}</span
    ><span class="clock-ms">.{{ ms }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import moment from 'moment/moment'
import { copy } from '@/util/util'

const date = ref<string>('')
const time = ref<string>('')
const ms = ref<string>('')
let timer: ReturnType<typeof setInterval>

const full = computed(() => `${date.value} ${time.value}.${ms.value}`)

const tick = () => {
  const m = moment()
  date.value = m.format('YYYY-MM-DD')
  time.value = m.format('HH:mm:ss')
  ms.value = m.format('SSS')
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 50)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<style scoped>
.clock {
  text-align: center;
  font-size: 1.25rem;
  cursor: pointer;
  /* 等宽数字，避免毫秒刷新时整体宽度变化造成抖动 */
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.clock-ms {
  margin-left: 1px;
  font-size: 0.8em;
  color: var(--app-muted);
}
</style>
