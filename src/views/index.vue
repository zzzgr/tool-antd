<template>
  <div class="home-page">
    <div class="home-header">
      <h1 class="home-title">工具箱</h1>
      <a-input v-model:value="searchKey" class="home-search" placeholder="搜索工具…" allow-clear>
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
    </div>

    <div class="home-section">
      <div class="section-head">
        <div class="section-title">{{ searchKey.trim() ? '搜索结果' : '全部工具' }}</div>
        <a-radio-group
          v-if="!searchKey.trim()"
          v-model:value="activeCategory"
          size="small"
          button-style="solid"
          class="category-switch"
        >
          <a-radio-button v-for="c in categories" :key="c.key" :value="c.key">
            {{ c.label }}
          </a-radio-button>
        </a-radio-group>
      </div>

      <a-row :key="listRenderKey" :gutter="[16, 16]" align="stretch" class="tool-grid">
        <a-col
          v-for="(t, idx) in filteredTool"
          :key="`${listRenderKey}-${t.path}`"
          :xs="24"
          :md="8"
          :lg="6"
          class="tool-col"
          :style="{ '--stagger': idx }"
        >
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import ToolIcon from '@/components/tool-icon/index.vue'

type ToolItem = {
  path: string
  title: string
  icon: string
  iconColor: string
  desc: string
  category: 'data' | 'text' | 'image' | 'codec' | 'other'
}

const allTool: ToolItem[] = [
  {
    path: '/timestamp',
    title: '时间戳',
    icon: 'timestamp',
    iconColor: '#10b981',
    desc: '时间格式化、解析',
    category: 'data'
  },
  {
    path: '/json',
    title: 'JSON格式化',
    icon: 'json',
    iconColor: '#f59e0b',
    desc: 'JSON、XML、YAML 自动转换与格式化',
    category: 'data'
  },
  {
    path: '/xml',
    title: 'XML格式化',
    icon: 'xml',
    iconColor: '#a855f7',
    desc: 'XML 格式化、压缩与校验',
    category: 'data'
  },
  {
    path: '/markdown',
    title: 'Markdown',
    icon: 'markdown',
    iconColor: '#64748b',
    desc: 'Markdown 分屏编辑与实时渲染',
    category: 'text'
  },
  {
    path: '/codec',
    title: '编码 / 安全',
    icon: 'codec',
    iconColor: '#ef4444',
    desc: 'URL、Base64、Unicode、Hash、JWT',
    category: 'codec'
  },
  {
    path: '/qr',
    title: '二维码',
    icon: 'qrcode',
    iconColor: '#06b6d4',
    desc: '二维码生成与图片识别',
    category: 'image'
  },
  {
    path: '/textShare',
    title: '文本分享',
    icon: 'text',
    iconColor: '#3b82f6',
    desc: '文本分享，支持markdown~',
    category: 'text'
  },
  {
    path: '/textproc',
    title: '文本处理',
    icon: 'textproc',
    iconColor: '#8b5cf6',
    desc: '分隔符转换、查找替换、排序去重',
    category: 'text'
  },
  {
    path: '/diff',
    title: '文本比较',
    icon: 'diff',
    iconColor: '#14b8a6',
    desc: '文本代码对比',
    category: 'text'
  },
  {
    path: '/ua',
    title: 'UA',
    icon: 'ua',
    iconColor: '#6366f1',
    desc: '获取当前环境的User Agent',
    category: 'other'
  },
  {
    path: '/gifscroll',
    title: 'GIF滚动',
    icon: 'gif',
    iconColor: '#ec4899',
    desc: '图片转滚动GIF表情包',
    category: 'image'
  },
  {
    path: '/uuid',
    title: 'UUID',
    icon: 'uuid',
    iconColor: '#0ea5e9',
    desc: '批量生成 UUID',
    category: 'data'
  },
  {
    path: '/regex',
    title: '正则测试',
    icon: 'regex',
    iconColor: '#22c55e',
    desc: '正则匹配、分组高亮',
    category: 'text'
  },
  {
    path: '/imgbase64',
    title: '图片Base64',
    icon: 'imgbase64',
    iconColor: '#f97316',
    desc: '图片与 Base64 互转',
    category: 'image'
  }
]

const categories = [
  { key: 'all', label: '全部' },
  { key: 'data', label: '数据' },
  { key: 'text', label: '文本' },
  { key: 'image', label: '图片' },
  { key: 'codec', label: '编码' },
  { key: 'other', label: '其他' }
] as const

const searchKey = ref('')
const activeCategory = ref<(typeof categories)[number]['key']>('all')
const hoveredPath = ref<string | null>(null)

// 分类/搜索切换时强制重建列表，避免复用 DOM 导致入场动画只重播新增项
const listRenderKey = computed(
  () => `${activeCategory.value}::${searchKey.value.trim().toLowerCase()}`
)

const filteredTool = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  let list = allTool
  if (!k && activeCategory.value !== 'all') {
    list = list.filter((t) => t.category === activeCategory.value)
  }
  if (!k) return list
  return list.filter(
    (t) => t.title.toLowerCase().includes(k) || t.desc.toLowerCase().includes(k)
  )
})
</script>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 24px;
}

.home-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 0.5rem 1.25rem;
}

.home-search {
  width: 100%;
  max-width: 420px;
  transition: transform 0.2s ease;
}

.home-search:focus-within {
  transform: translateY(-1px);
}

.home-search :deep(.ant-input-affix-wrapper),
.home-search :deep(.ant-input) {
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.home-search :deep(.ant-input-affix-wrapper-focused),
.home-search :deep(.ant-input:focus) {
  box-shadow: 0 0 0 3px color-mix(in srgb, #3b82f6 18%, transparent);
}

.home-section {
  margin-top: 8px;
  margin-bottom: 20px;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-muted);
  letter-spacing: 0.04em;
  margin-bottom: 0;
}

.category-switch {
  flex-wrap: wrap;
}

.category-switch :deep(.ant-radio-button-wrapper) {
  transition:
    transform 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease;
}

.category-switch :deep(.ant-radio-button-wrapper-checked) {
  transform: translateY(-1px);
}

.tool-col {
  animation: card-enter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--stagger, 0) * 35ms);
  will-change: opacity, transform;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.empty-tip {
  text-align: center;
  color: var(--app-muted);
  padding: 2rem 0;
  font-size: 0.95rem;
  animation: empty-in 0.25s ease both;
}

@keyframes empty-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

  .tool-col,
  .empty-tip,
  .tool-card,
  .tool-card::before,
  .tool-icon-wrapper,
  .home-search,
  .category-switch :deep(.ant-radio-button-wrapper) {
    animation: none !important;
    transition: none !important;
  }

  .tool-card.is-hovered {
    transform: none;
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
    transparent 0%,
    transparent 72%,
    color-mix(in srgb, var(--tool-accent, #60a5fa) 80%, white) 86%,
    var(--tool-accent, #60a5fa) 92%,
    transparent 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.tool-card.is-hovered {
  border-color: transparent;
  background: var(--app-card-hover-bg);
  box-shadow: 0 8px 24px var(--app-shadow-hover);
  transform: translateY(-2px);
}

.tool-card.is-hovered::before {
  opacity: 1;
  animation: beam-spin 2.4s linear infinite;
}

@keyframes beam-spin {
  to {
    --beam-angle: 360deg;
  }
}

.tool-card-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 100%;
}

.tool-info {
  min-width: 0;
  flex: 1;
}

.tool-title {
  font-size: 1rem;
  font-weight: 650;
  margin-bottom: 4px;
  color: var(--app-title);
}

.tool-desc {
  font-size: 0.8rem;
  color: var(--app-muted);
  line-height: 1.4;
}

.tool-icon-wrapper {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: color-mix(in srgb, var(--tool-accent, #60a5fa) 12%, transparent);
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s ease,
    background-color 0.25s ease;
}

.tool-icon-wrapper.is-hovered {
  transform: scale(1.08) rotate(-3deg);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--tool-accent, #60a5fa) 28%, transparent);
  background: color-mix(in srgb, var(--tool-accent, #60a5fa) 18%, transparent);
}
</style>
