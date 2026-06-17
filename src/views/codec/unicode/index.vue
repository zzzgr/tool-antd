<template>
  <div class="codec-page">
    <div class="io-block">
      <div class="io-label">输入</div>
      <a-textarea v-model:value="text" class="io-input" placeholder="在此输入要编码 / 解码的内容" />
    </div>

    <div class="toolbar">
      <a-button-group size="small">
        <a-button type="primary" @click="onEncode">编码</a-button>
        <a-button type="primary" @click="onDecode">解码</a-button>
        <a-button @click="onSwap">交换</a-button>
        <a-button @click="copy(result)">复制结果</a-button>
      </a-button-group>
    </div>

    <div class="io-block">
      <div class="io-label">输出</div>
      <div class="io-output" :class="{ 'is-empty': !result }">
        {{ result || '编码 / 解码结果将显示在这里' }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { encode, decode } from '@/util/unicode'
import { copy } from '@/util/util'

const text = ref<string>('')
const result = ref<string>('')

const onEncode = () => {
  result.value = encode(text.value)
}
const onDecode = () => {
  result.value = decode(text.value) ?? ''
}
const onSwap = () => {
  ;[text.value, result.value] = [result.value, text.value]
}
</script>

<style scoped>
.codec-page {
  height: calc(100vh - 100px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.io-block {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.io-label {
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--app-muted);
}

.io-input {
  flex: 1;
  min-height: 0;
}

.io-output {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 12px;
  border: 1px solid var(--app-card-border);
  border-radius: 4px;
  background: var(--app-card-bg);
  color: var(--app-text);
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
}

.io-output.is-empty {
  color: var(--app-muted);
}

.toolbar {
  display: flex;
  justify-content: center;
}
</style>
