<template>
  <v-ace-editor v-model:value="content" lang="html" :theme="aceTheme" style="height: 300px" />
</template>

<script setup>
import './ace.config'
import { computed, markRaw, onMounted, ref } from 'vue'

import { VAceEditor } from 'vue3-ace-editor'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const aceTheme = computed(() => (themeStore.isDark ? 'tomorrow_night' : 'chrome'))

const content = ref(
  JSON.stringify(
    {
      data: [],
      success: true
    },
    null,
    2
  )
)

onMounted(async () => {
  VAceEditor.value = markRaw((await import('./ace.config')).VAceEditor)
})
</script>
