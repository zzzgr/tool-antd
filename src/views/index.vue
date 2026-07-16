<template>
  <div class="home-header">
    <h1 class="home-title">工具箱</h1>
    <a-input v-model:value="searchKey" class="home-search" placeholder="搜索工具…" allow-clear>
      <template #prefix>
        <SearchOutlined />
      </template>
    </a-input>
  </div>
  <a-row :gutter="[16, 16]" align="stretch">
    <a-col v-for="t in filteredTool" :key="t.path" :xs="24" :md="8" :lg="6">
      <router-link class="tool-link" :to="t.path">
        <div
          class="tool-card"
          :class="{ 'is-hovered': hoveredPath === t.path }"
          :style="{ '--tool-accent': t.iconColor }"
          @mouseenter="hoveredPath = t.path"
          @mouseleave="hoveredPath = null"
        >
          <div class="tool-card-content">
            <div class="tool-info">
              <div class="tool-title">{{ t.title }}</div>
              <div class="tool-desc">{{ t.desc }}</div>
            </div>
            <div class="tool-icon-wrapper" :class="{ 'is-hovered': hoveredPath === t.path }">
              <ToolIcon :name="t.icon" size="32px" :color="t.iconColor" />
            </div>
          </div>
        </div>
      </router-link>
    </a-col>
  </a-row>
  <div v-if="!filteredTool.length" class="empty-tip">没有匹配的工具</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import ToolIcon from '@/components/tool-icon/index.vue'

const allTool = [
  {
    path: '/timestamp',
    title: '时间戳',
    icon: 'timestamp',
    iconColor: '#10b981',
    desc: '时间格式化、解析'
  },
  {
    path: '/json',
    title: 'JSON格式化',
    icon: 'json',
    iconColor: '#f59e0b',
    desc: 'JSON、XML、YAML 自动转换与格式化'
  },
  {
    path: '/xml',
    title: 'XML格式化',
    icon: 'xml',
    iconColor: '#a855f7',
    desc: 'XML 格式化、压缩与校验'
  },
  {
    path: '/codec',
    title: '编码 / 安全',
    icon: 'codec',
    iconColor: '#ef4444',
    desc: 'URL、Base64、Unicode、Hash、JWT'
  },
  {
    path: '/qr',
    title: '二维码制作',
    icon: 'qrcode',
    iconColor: '#06b6d4',
    desc: '在线生成静态二维码'
  },
  {
    path: '/textShare',
    title: '文本分享',
    icon: 'text',
    iconColor: '#3b82f6',
    desc: '文本分享，支持markdown~'
  },
  {
    path: '/textproc',
    title: '文本处理',
    icon: 'textproc',
    iconColor: '#8b5cf6',
    desc: '分隔符转换、查找替换、排序去重'
  },
  {
    path: '/diff',
    title: '文本比较',
    icon: 'diff',
    iconColor: '#14b8a6',
    desc: '文本代码对比'
  },
  {
    path: '/ua',
    title: 'UA',
    icon: 'ua',
    iconColor: '#6366f1',
    desc: '获取当前环境的User Agent'
  },
  {
    path: '/gifscroll',
    title: 'GIF滚动',
    icon: 'gif',
    iconColor: '#ec4899',
    desc: '图片转滚动GIF表情包'
  },
  {
    path: '/uuid',
    title: 'UUID',
    icon: 'uuid',
    iconColor: '#0ea5e9',
    desc: '批量生成 UUID'
  },
  {
    path: '/regex',
    title: '正则测试',
    icon: 'regex',
    iconColor: '#22c55e',
    desc: '正则匹配、分组高亮'
  },
  {
    path: '/imgbase64',
    title: '图片Base64',
    icon: 'imgbase64',
    iconColor: '#f97316',
    desc: '图片与 Base64 互转'
  }
]

const searchKey = ref('')

const filteredTool = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  if (!k) return allTool
  return allTool.filter(
    (t) => t.title.toLowerCase().includes(k) || t.desc.toLowerCase().includes(k)
  )
})

const hoveredPath = ref<string | null>(null)
</script>

<style scoped>
.home-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 0.5rem 1.5rem;
}

.home-search {
  width: 100%;
  max-width: 420px;
}

.empty-tip {
  text-align: center;
  color: var(--app-muted);
  padding: 2rem 0;
  font-size: 0.95rem;
}

.home-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  cursor: default;
  background-image: linear-gradient(
    100deg,
    var(--title-base) 0%,
    var(--title-base) 36%,
    var(--title-shimmer) 50%,
    var(--title-base) 64%,
    var(--title-base) 100%
  );
  background-size: 300% 100%;
  background-position: 100% 0;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  animation:
    title-enter 0.6s cubic-bezier(0.4, 0, 0.2, 1) both,
    title-shimmer 4s ease-in-out 0.7s infinite;
}

@keyframes title-enter {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes title-shimmer {
  0% {
    background-position: 100% 0;
  }
  24% {
    background-position: 0% 0;
  }
  100% {
    background-position: 0% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-title {
    animation: none;
    background-position: 0% 0;
  }
}

.tool-link {
  text-decoration: none;
  color: var(--app-link);
  display: block;
  height: 100%;
}

.tool-card {
  position: relative;
  background: var(--app-card-bg);
  border: 1px solid var(--app-card-border);
  border-radius: 12px;
  padding: 1.25rem;
  min-height: 96px;
  height: 100%;
  cursor: pointer;
  box-shadow: 0 1px 2px var(--app-shadow);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 沿边框奔跑的光效（hover 触发） */
@property --beam-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.tool-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--beam-angle),
    transparent 0deg,
    transparent 25deg,
    var(--tool-accent, var(--app-icon-hover-color)) 60deg,
    #ffffff 75deg,
    var(--tool-accent, var(--app-icon-hover-color)) 90deg,
    transparent 125deg,
    transparent 360deg
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.tool-card:hover::before {
  opacity: 1;
  animation: beam-run 2.4s linear infinite;
}

@keyframes beam-run {
  to {
    --beam-angle: 360deg;
  }
}

.tool-card:hover {
  border-color: var(--tool-accent, var(--app-card-hover-border));
  background: var(--app-card-hover-bg);
  box-shadow: 0 6px 16px var(--app-shadow-hover);
}

:root[data-theme='dark'] .tool-card:hover {
  box-shadow: 0 8px 20px var(--app-shadow-hover);
}

@media (prefers-reduced-motion: reduce) {
  .tool-card:hover::before {
    animation: none;
    opacity: 0;
  }
}

.tool-card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  height: 100%;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--app-text);
  margin-bottom: 0.5rem;
  transition: color 0.2s ease;
}

.tool-desc {
  font-size: 0.875rem;
  color: var(--app-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s ease;
}

.tool-icon-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--tool-accent, var(--app-icon-color)) 12%, transparent);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-icon-wrapper.is-hovered {
  transform: scale(1.08);
  background: color-mix(in srgb, var(--tool-accent, var(--app-icon-color)) 18%, transparent);
}
</style>
