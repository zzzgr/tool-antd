<template>
  <ToolPage width="narrow">
    <div class="timestamp-stack">
      <current-time />
      <parse />
    </div>
  </ToolPage>
</template>

<script setup lang="ts">
import Parse from './components/parse.vue'
import CurrentTime from './components/currentTime.vue'
import { h, onMounted } from 'vue'
import { notification } from 'ant-design-vue'
import { SmileOutlined } from '@ant-design/icons-vue'
import ToolPage from '@/components/tool-page/index.vue'

onMounted(() => {
  notification.open({
    message: '点击可以复制哦~',
    icon: () => h(SmileOutlined, { style: 'color: #108ee9' }),
    duration: 1
  })
})
</script>

<style scoped>
.timestamp-stack {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-top: 8px;
}
</style>
