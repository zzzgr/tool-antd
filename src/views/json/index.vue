<template>
  <div class="p-2">
    <a-row>
      <a-col>
        <!-- 按钮 -->
        <div class="mb-2">
          <a-button-group size="small">
            <a-button type="primary" @click="compress()">压缩</a-button>
            <a-button type="primary" @click="unEscape()">去除转义</a-button>
            <a-button type="primary" @click="escape()">转义</a-button>
          </a-button-group>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="16">
      <a-col :xs="24" :md="8">
        <!-- 源json-->
        <div ref="orgDivWrapper">
          <a-textarea
            style="height: 100%"
            v-model:value="data.org"
            placeholder="粘贴json到此处..."
            @input="trim()"
          />
        </div>
      </a-col>

      <!-- 右边 -->
      <a-col :md="16" :xs="24">
        <a-button
          type="link"
          style="position: absolute; top: 10px; right: 10px; z-index: 999"
          size="small"
          @click="onCopy()"
          >复制
        </a-button>
        <!-- json 预览 -->
        <a-row>
          <div ref="resDivWrapper" style="width: 100%">
            <div
              class="json-preview border border-solid rounded-md"
              style="height: 100%; overflow: scroll"
            >
              <Json-view
                :data="res"
                :deep="data.option.deep"
                :font-size="data.option.fontSize"
                :theme="jsonViewTheme"
                :icon-color="jsonIconColor"
              />
            </div>
          </div>
        </a-row>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import JsonView from '@/components/json-view/index.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import { copy } from '@/util/util'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const data = reactive({
  org: undefined,
  option: {
    deep: 999,
    fontSize: 12
  }
})
const orgDivWrapper = ref(null)
const resDivWrapper = ref(null)

const res = computed(() => {
  if (!data.org) {
    return {}
  }
  try {
    return JSON.parse(data.org)
  } catch (e) {
    return {}
  }
})

const jsonViewTheme = computed(() => (themeStore.isDark ? 'vs-code' : ''))
const jsonIconColor = computed(() =>
  themeStore.isDark ? ['#c6c6c6', '#c6c6c6'] : ['#409EFF', '#000']
)

const trim = () => {}

// 压缩
const compress = () => {
  if (data.org) {
    data.org = JSON.stringify(JSON.parse(data.org))
  }
}

// 转义
const escape = () => {
  data.org = data.org.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// 去除转义
const unEscape = () => {
  data.org = data.org.replace(/\\\\/g, '\\').replace(/\\"/g, '"')
}

//复制
const onCopy = () => {
  console.log(123)
  if (res.value) {
    copy(JSON.stringify(res.value, null, 2))
  }
}

onMounted(() => {
  const screenHeight = window.innerHeight
  if (window.innerWidth > 100) {
    orgDivWrapper.value.style.height = screenHeight - 120 + 'px'
    resDivWrapper.value.style.height = screenHeight - 120 + 'px'
  }
})
</script>

<style scoped>
.gutter-box {
  padding: 8px 0;
}

.json-preview {
  background: var(--app-card-bg);
  border-color: var(--app-card-border);
}
</style>
