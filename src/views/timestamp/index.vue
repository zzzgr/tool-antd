<template>
  <a-row>
    <a-col :xs="24" :md="8"></a-col>

    <a-col :xs="24" :md="8">
      <div class="mt-8">
        <current-time />
      </div>

      <div class="mt-8">
        <parse />
      </div>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import Parse from './components/parse.vue'
import CurrentTime from './components/currentTime.vue'
import { h, onMounted } from 'vue'
import { notification } from 'ant-design-vue'
import { SmileOutlined } from '@ant-design/icons-vue'

onMounted(() => {
  notification.open({
    message: '点击可以复制哦~',
    // description: '',
    icon: () => h(SmileOutlined, { style: 'color: #108ee9' }),
    duration: 1
  })
})
</script>

<style scoped></style>