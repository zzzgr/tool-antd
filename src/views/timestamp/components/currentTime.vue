<template>
  <div class="text-center text-xl" @click="copy(text)">{{ text }}</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import moment from 'moment/moment'
import { copy } from '@/util/util'

const text = ref<string>('')
const interval = ref()

onMounted(() => {
  interval.value = setInterval(() => {
    let ts = moment().toDate().getTime()
    text.value = moment(ts).format('YYYY-MM-DD HH:mm:ss.SSS')
  }, 50)
})
</script>

<style scoped></style>