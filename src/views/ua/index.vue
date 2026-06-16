<template>
  <div class="text-center mt-12">
    <div>{{ ua }}</div>
    <a-button class="mt-8" type="primary" @click="copy(ua)" size="small">复制</a-button>
  </div>
</template>

<script setup lang="ts">
import { copy } from '@/util/util'

const ua = navigator.userAgent
</script>

<style scoped></style>
