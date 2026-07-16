<template>
  <AConfigProvider :locale="zhCN" :theme="antTheme" :componentSize="'small'">
    <a-spin :indicator="indicator" :spinning="store.loading" tip="loading">
      <div class="app-shell p-2">
        <a-tooltip :title="themeToggleLabel" placement="left">
          <a-button
            class="theme-toggle"
            :class="{ 'is-toggling': themeAnimating }"
            shape="circle"
            size="large"
            :aria-label="themeToggleLabel"
            @click="onToggleTheme"
          >
            <template #icon>
              <ThemeIcon :name="themeStore.isDark ? 'sun' : 'moon'" />
            </template>
          </a-button>
        </a-tooltip>
        <RouterView v-slot="{ Component, route }">
          <Transition name="view-fade" mode="out-in">
            <div :key="route.path" class="route-view">
              <component :is="Component" />
            </div>
          </Transition>
        </RouterView>
      </div>
    </a-spin>
  </AConfigProvider>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useLoadingStore } from '@/stores/loading'
import { useThemeStore } from '@/stores/theme'
import { computed, h, ref, watch } from 'vue'
import { LoadingOutlined } from '@ant-design/icons-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import { theme } from 'ant-design-vue'
import ThemeIcon from '@/components/theme-icon/index.vue'

const store = useLoadingStore()
const themeStore = useThemeStore()
const themeToggleLabel = computed(() => (themeStore.isDark ? '切换明亮模式' : '切换暗黑模式'))
const themeAnimating = ref(false)
let themeAnimTimer: ReturnType<typeof setTimeout> | null = null

const onToggleTheme = () => {
  themeStore.toggleTheme()
  themeAnimating.value = false
  requestAnimationFrame(() => {
    themeAnimating.value = true
    if (themeAnimTimer) clearTimeout(themeAnimTimer)
    themeAnimTimer = setTimeout(() => {
      themeAnimating.value = false
    }, 450)
  })
}

const antTheme = computed(() => {
  const isDark = themeStore.isDark
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      borderRadius: 4,
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
  position: relative;
  min-height: 100vh;
  background:
    radial-gradient(900px 420px at 12% -8%, color-mix(in srgb, #3b82f6 10%, transparent), transparent 60%),
    radial-gradient(700px 360px at 92% 0%, color-mix(in srgb, #a855f7 8%, transparent), transparent 55%),
    var(--app-bg);
  color: var(--app-text);
  transition:
    background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.route-view {
  min-height: calc(100vh - 1rem);
}

.view-fade-enter-active,
.view-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.view-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.theme-toggle {
  position: fixed;
  right: calc(16px + env(safe-area-inset-right));
  top: calc(16px + env(safe-area-inset-top));
  bottom: auto;
  z-index: 1050;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--app-card-bg) 88%, transparent) !important;
  border: 1px solid var(--app-card-border) !important;
  box-shadow: 0 4px 12px var(--app-shadow);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(8px);
}

.theme-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px var(--app-shadow-hover);
  border-color: var(--app-card-hover-border) !important;
}

.theme-toggle.is-toggling {
  animation: theme-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-toggle.is-toggling .anticon,
.theme-toggle.is-toggling svg {
  animation: theme-spin 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes theme-pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes theme-spin {
  from {
    transform: rotate(-90deg) scale(0.85);
    opacity: 0.4;
  }
  to {
    transform: rotate(0deg) scale(1);
    opacity: 1;
  }
}

.theme-toggle .anticon {
  line-height: 0;
}

textarea {
  resize: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .view-fade-enter-active,
  .view-fade-leave-active,
  .theme-toggle.is-toggling,
  .theme-toggle.is-toggling .anticon,
  .theme-toggle.is-toggling svg {
    animation: none !important;
    transition: none !important;
  }
}
</style>
