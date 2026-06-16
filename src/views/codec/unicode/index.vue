<template>
  <!-- 按钮 -->
  <div class="mb-2">
    <a-button-group size="small">
      <a-button type="primary" @click="text = encode(text)">编码</a-button>
      <a-button type="primary" @click="text = decode(text)">解码</a-button>
      <a-button type="primary" @click="copy(text)">复制结果</a-button>
    </a-button-group>
  </div>

  <div ref="inputDiv">
    <a-textarea v-model:value="text" style="height: 100%" />
  </div>
</template>

<script setup lang="ts">
import { encode } from '@/util/unicode'
import { onMounted, ref } from 'vue'
import { copy } from '@/util/util'
import { decode } from 'js-base64'

const text = ref('')
const inputDiv = ref()

onMounted(() => {
  const screenHeight = window.innerHeight
  if (window.innerWidth > 100) {
    inputDiv.value.style.height = screenHeight - 128 + 'px'
  }
})
</script>

<style scoped></style>