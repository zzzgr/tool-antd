<template>
  <AConfigProvider :locale="zhCN" :theme="antTheme" :componentSize="'small'">
    <a-spin :indicator="indicator" :spinning="store.loading" tip="loading">
      <div class="app-shell p-2">
        <a-tooltip :title="themeToggleLabel" placement="left">
          <a-button
            class="theme-toggle"
            shape="circle"
            size="large"
            :aria-label="themeToggleLabel"
            @click="themeStore.toggleTheme()"
          >
            <template #icon>
              <ThemeIcon :name="themeStore.isDark ? 'sun' : 'moon'" />
            </template>
          </a-button>
        </a-tooltip>
        <RouterView />
      </div>
    </a-spin>
  </AConfigProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useLoadingStore } from '@/stores/loading'
import { useThemeStore } from '@/stores/theme'
import { computed, h, watch } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { theme } from 'ant-design-vue'
import ThemeIcon from '@/components/theme-icon/index.vue'

const store = useLoadingStore()
const themeStore = useThemeStore()
const themeToggleLabel = computed(() => (themeStore.isDark ? '切换明亮模式' : '切换暗黑模式'))

const antTheme = computed(() => {
  const isDark = themeStore.isDark
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      borderRadius: 4,
      // OLED 纯黑：仅暗色下把 AntD 各层背景/边框压到接近 #000
      ...(isDark
        ? {
            colorBgBase: '#000000',
            colorBgLayout: '#000000',
            colorBgContainer: '#0c0c0d',
            colorBgElevated: '#141416',
            colorBorder: '#1f1f22',
            colorBorderSecondary: '#1a1a1c'
          }
        : {})
    }
  }
})

const indicator = h(LoadingOutlined, {
  style: {
    fontSize: '24px'
  },
  spin: true
})

watch(
  () => themeStore.mode,
  (mode) => {
    document.documentElement.dataset.theme = mode
    document.documentElement.classList.toggle('dark', mode === 'dark')
    document.documentElement.style.colorScheme = mode
  },
  { immediate: true }
)
</script>

<style>
.app-shell {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
  transition:
    background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle {
  position: fixed;
  right: calc(24px + env(safe-area-inset-right));
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 1050;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--app-card-bg) !important;
  border: 1px solid var(--app-card-border) !important;
  box-shadow: 0 4px 12px var(--app-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--app-shadow-hover);
  border-color: var(--app-card-hover-border) !important;
}

.theme-toggle .anticon {
  line-height: 0;
}

textarea {
  resize: none !important;
}
</style>
