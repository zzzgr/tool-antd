<template>
  <div>
    <a-textarea v-model:value="text" :rows="8" />
  </div>

  <!-- 按钮 -->
  <div class="mt-2 text-center">
    <a-button-group size="small">
      <a-button type="primary" @click="result = Base64.encode(text)">编码</a-button>
      <a-button type="primary" @click="result = Base64.decode(text)">解码</a-button>
      <a-button type="primary" @click="[text, result] = [result, text]">交换</a-button>
      <a-button type="primary" @click="copy(result)">复制结果</a-button>
    </a-button-group>
  </div>

  <div class="mt-2">
    <a-textarea v-model:value="result" :rows="8" />
  </div>
</template>

<script setup lang="ts">
import { copy } from '@/util/util'
import { Base64 } from 'js-base64'
import { ref } from 'vue'

const text = ref<string>('')
const result = ref<string>('')
</script>

<style scoped></style>