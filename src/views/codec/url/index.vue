<template>
  <!-- 按钮 -->
  <div class="mb-2">
    <a-button-group size="small">
      <a-button type="primary" @click="text = encodeURIComponent(text)">编码</a-button>
      <a-button type="primary" @click="text = decodeURIComponent(text)">解码</a-button>
      <a-button type="primary" @click="copy(text)">复制结果</a-button>
    </a-button-group>
  </div>

  <div ref="inputDiv">
    <a-textarea v-model:value="text" style="height: 100%" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { copy } from '@/util/util'

const text = ref<string>('')

const inputDiv = ref()
onMounted(() => {
  const screenHeight = window.innerHeight
  if (window.innerWidth > 100) {
    inputDiv.value.style.height = screenHeight - 128 + 'px'
  }
})
</script>

<style scoped></style>