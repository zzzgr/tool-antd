<template>
  <div class="tool-page" :class="[`tool-page--${width}`]">
    <div v-if="$slots.toolbar" class="tool-page__toolbar tool-toolbar">
      <slot name="toolbar" />
    </div>

    <div class="tool-page__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 兼容旧调用，已不再展示 */
    title?: string
    desc?: string
    /** narrow=表单 640 | wide=中等 960 | full=编辑器全宽 */
    width?: 'narrow' | 'wide' | 'full'
  }>(),
  {
    width: 'full'
  }
)
</script>

<style scoped>
.tool-page {
  width: 100%;
  min-height: calc(100vh - 1rem);
  box-sizing: border-box;
  padding: 4px 4px 16px;
  animation: tool-page-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.tool-page__toolbar {
  margin-bottom: 12px;
  animation: tool-page-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.tool-page__body {
  width: 100%;
  animation: tool-page-in 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes tool-page-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-page,
  .tool-page__toolbar,
  .tool-page__body {
    animation: none;
  }
}

.tool-page--narrow .tool-page__body,
.tool-page--narrow .tool-page__toolbar {
  max-width: var(--app-content-narrow);
  margin-inline: auto;
}

.tool-page--wide .tool-page__body,
.tool-page--wide .tool-page__toolbar {
  max-width: var(--app-content-wide);
  margin-inline: auto;
}

.tool-page--full .tool-page__body,
.tool-page--full .tool-page__toolbar {
  max-width: none;
}
</style>
