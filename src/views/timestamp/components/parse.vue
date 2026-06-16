<template>
  <div>
    <div>请输入时间或时间戳:</div>
    <a-textarea class="mt-2" v-model:value="text" placeholder="YYYY-MM-DD HH:mm:ss、时间戳" />
  </div>

  <div class="mt-4 text-center h-12">
    <div v-show="result">
      <a-radio-group v-model:value="mode" size="small">
        <a-radio-button value="1000">秒</a-radio-button>
        <a-radio-button value="1">毫秒</a-radio-button>
      </a-radio-group>

      <div class="mt-2 cursor-pointer" @click="copy(result)">{{ result }}</div>
    </div>
  </div>

  <div class="mt-4">
    <div>快捷工具</div>

    <div class="mt-4">
      <span class="mr-4">今</span>
      <a-button-group size="small">
        <a-button @click="fast(moment(new Date()), 0, 'day')">当前</a-button>
        <a-button @click="fast(moment(new Date()), 1, 'day')">今始</a-button>
        <a-button @click="fast(moment(new Date()), 2, 'day')">今末</a-button>
        <a-button @click="fast(moment(new Date()), 1, 'week')">周始</a-button>
        <a-button @click="fast(moment(new Date()), 2, 'week')">周末</a-button>
        <a-button @click="fast(moment(new Date()), 1, 'month')">月始</a-button>
        <a-button @click="fast(moment(new Date()), 2, 'month')">月末</a-button>
      </a-button-group>
    </div>

    <div class="mt-2">
      <span class="mr-4">昨</span>
      <a-button-group size="small">
        <a-button @click="fast(moment(new Date()).subtract(1, 'day'), 0, 'day')">昨天</a-button>
        <a-button @click="fast(moment(new Date()).subtract(1, 'day'), 1, 'day')">昨始</a-button>
        <a-button @click="fast(moment(new Date()).subtract(1, 'day'), 2, 'day')">昨末</a-button>
      </a-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import moment from 'moment/moment'
import { copy } from '@/util/util'

const text = ref<string>('')
const mode = ref<string>('1000')

const result = computed(() => {
  let t = text.value
  if (!t) {
    return
  }

  if (t.match(/^\d{0,13}$/)) {
    return moment(Number(t) * Number(mode.value)).format('YYYY-MM-DD HH:mm:ss')
  } else {
    let ts = moment(t).valueOf()
    if (!ts) {
      return ''
    }
    return ts / Number(mode.value)
  }
})

const fast = (time, m, offsetType) => {
  console.log(time)
  mode.value = String(1)
  switch (m) {
    case 0: {
      text.value = String(time.toDate().getTime())
      break
    }
    case 1: {
      text.value = String(time.startOf(offsetType).toDate().getTime())
      break
    }
    case 2: {
      text.value = String(time.endOf(offsetType).toDate().getTime())
      break
    }
  }
}
</script>