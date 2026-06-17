<template>
  <div>
    <div>请输入时间或时间戳:</div>
    <a-textarea
      class="mt-2"
      v-model:value="text"
      placeholder="YYYY-MM-DD HH:mm:ss、时间戳"
      @input="active = ''"
    />
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
        <a-button
          :type="active === 'now' ? 'primary' : 'default'"
          @click="onFast('now', moment(new Date()), 0, 'day')"
          >当前</a-button
        >
        <a-button
          :type="active === 'todayStart' ? 'primary' : 'default'"
          @click="onFast('todayStart', moment(new Date()), 1, 'day')"
          >今始</a-button
        >
        <a-button
          :type="active === 'todayEnd' ? 'primary' : 'default'"
          @click="onFast('todayEnd', moment(new Date()), 2, 'day')"
          >今末</a-button
        >
        <a-button
          :type="active === 'weekStart' ? 'primary' : 'default'"
          @click="onFast('weekStart', moment(new Date()), 1, 'week')"
          >周始</a-button
        >
        <a-button
          :type="active === 'weekEnd' ? 'primary' : 'default'"
          @click="onFast('weekEnd', moment(new Date()), 2, 'week')"
          >周末</a-button
        >
        <a-button
          :type="active === 'monthStart' ? 'primary' : 'default'"
          @click="onFast('monthStart', moment(new Date()), 1, 'month')"
          >月始</a-button
        >
        <a-button
          :type="active === 'monthEnd' ? 'primary' : 'default'"
          @click="onFast('monthEnd', moment(new Date()), 2, 'month')"
          >月末</a-button
        >
      </a-button-group>
    </div>

    <div class="mt-2">
      <span class="mr-4">昨</span>
      <a-button-group size="small">
        <a-button
          :type="active === 'yesterday' ? 'primary' : 'default'"
          @click="onFast('yesterday', moment(new Date()).subtract(1, 'day'), 0, 'day')"
          >昨天</a-button
        >
        <a-button
          :type="active === 'yesterdayStart' ? 'primary' : 'default'"
          @click="onFast('yesterdayStart', moment(new Date()).subtract(1, 'day'), 1, 'day')"
          >昨始</a-button
        >
        <a-button
          :type="active === 'yesterdayEnd' ? 'primary' : 'default'"
          @click="onFast('yesterdayEnd', moment(new Date()).subtract(1, 'day'), 2, 'day')"
          >昨末</a-button
        >
      </a-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import moment from 'moment/moment'
import { copy, useStorageRef } from '@/util/util'

const text = ref<string>('')
const mode = useStorageRef('timestamp:parse-mode', '1000')
const active = ref<string>('now') // 当前选中的快捷工具

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
  let ms: number
  switch (m) {
    case 1:
      ms = time.startOf(offsetType).toDate().getTime()
      break
    case 2:
      ms = time.endOf(offsetType).toDate().getTime()
      break
    default:
      ms = time.toDate().getTime()
  }
  // 按当前选择的单位生成时间戳，不覆盖用户的秒/毫秒选择
  text.value = String(mode.value === '1000' ? Math.floor(ms / 1000) : ms)
}

// 点击快捷工具：记录选中项并生成时间戳
const onFast = (key: string, time, m, offsetType) => {
  active.value = key
  fast(time, m, offsetType)
}

// 进入页面默认填入当前时间，并选中「当前」
onMounted(() => {
  onFast('now', moment(new Date()), 0, 'day')
})
</script>