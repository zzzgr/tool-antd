<template>
  <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <g v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2" />
      <path d="M12 19.3v2.2" />
      <path d="m4.57 4.57 1.56 1.56" />
      <path d="m17.87 17.87 1.56 1.56" />
      <path d="M2.5 12h2.2" />
      <path d="M19.3 12h2.2" />
      <path d="m4.57 19.43 1.56-1.56" />
      <path d="m17.87 6.13 1.56-1.56" />
    </g>
    <path v-else d="M20.5 14.28A7.6 7.6 0 0 1 9.72 3.5a8.7 8.7 0 1 0 10.78 10.78Z" />
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  name: 'sun' | 'moon'
}>()
</script>

<style scoped>
.theme-icon {
  display: block;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.9;
}
</style>
