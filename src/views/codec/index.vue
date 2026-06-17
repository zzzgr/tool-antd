<template>
  <a-tabs v-model:activeKey="activeKey">
    <a-tab-pane key="url" tab="URL">
      <URL />
    </a-tab-pane>
    <a-tab-pane key="base64" tab="Base64" force-render>
      <Base64 />
    </a-tab-pane>
    <a-tab-pane key="unicode" tab="Unicode">
      <Unicode />
    </a-tab-pane>
  </a-tabs>
</template>

<script setup lang="ts">
import URL from './url/index.vue'
import Base64 from './base64/index.vue'
import Unicode from './unicode/index.vue'
import { useStorageRef } from '@/util/util'

const activeKey = useStorageRef('codec:active-tab', 'url')
</script>

<style scoped></style>