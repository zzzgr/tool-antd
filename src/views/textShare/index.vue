<template>
  <div>
    <div class="cursor-auto" :class="[{ 'cursor-not-allowed	': key.length > 0 }]">
      <md-editor
        v-model="data.text"
        :on-upload-img="onUploadImg"
        :preview="false"
        :toolbars="[
          'bold',
          'underline',
          'italic',
          '-',
          'title',
          'strikeThrough',
          'sub',
          'sup',
          'quote',
          'unorderedList',
          'orderedList',
          'task',
          '-',
          'codeRow',
          'code',
          'link',
          'image',
          'table',
          'mermaid',
          'katex',
          '-',
          'revoke',
          'next',
          'pageFullscreen',
          'fullscreen',
          'preview',
          'htmlPreview'
        ]"
        no-upload-img
        :theme="themeStore.isDark ? 'dark' : 'light'"
        :auto-focus="true"
        :disabled="key.length > 0"
        :read-only="key.length > 0"
      />
    </div>
    <div class="mt-2 text-center" v-if="key.length == 0">
      <div class="text-sm inline">
        有效期
        <a-input-number id="inputNumber" size="small" v-model:value="data.hour" step="1" />
        小时
      </div>
      <a-button
        class="ml-4"
        size="small"
        type="primary"
        @click="share"
        :disabled="data.text.length == 0"
      >
        分 享
      </a-button>
    </div>

    <a-row v-if="key.length > 0">
      <a-col :xs="24" :md="4"></a-col>

      <a-col :xs="24" :md="16">
        <a-alert class="mt-4" :message="link" type="info">
          <template #action>
            <a-space direction="vertical">
              <a-button size="small" type="primary" @click="copy(link)"> 复 制</a-button>
            </a-space>
          </template>
        </a-alert>
      </a-col>
    </a-row>

    <div class="text-center mt-4" v-if="key.length > 0">
      <a-button size="small" type="primary" @click="reset()"> 再来一个</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import type { TextShareRequest } from '@/api/textShare/model'
import { textShareApi, textShareGetApi } from '@/api/textShare/textShare'
import { copy } from '@/util/util'
import router from '@/router'
import { useThemeStore } from '@/stores/theme'

const route = useRoute()
const themeStore = useThemeStore()
const data = reactive<TextShareRequest>({
  text: '',
  hour: 24
})
const key = ref<string>('')
const link = computed(() => `${window.location.origin}/#/textShare?key=${key.value}`)

// 不支持图片上传
const onUploadImg = () => {
  message.warn(`暂不支持图片上传，请使用图片外链~`)
}

const share = async () => {
  let result = await textShareApi(data)
  key.value = result.data.key

  router.push({ path: route.path, query: { key: key.value } })
}

const reset = () => {
  key.value = ''
  data.text = ''
  data.hour = 24

  let newQuery = JSON.parse(JSON.stringify(route.query))
  delete newQuery.key
  router.replace({ query: newQuery })
}

onMounted(async () => {
  const queryKey = route.query.key as string
  if (queryKey) {
    let { text } = (await textShareGetApi(queryKey)).data
    console.log(text)
    if (text.length > 0) {
      data.text = text
      key.value = queryKey as string
    } else {
      message.warn('分享已失效，立即创建自己的分享吧~')
      setTimeout(() => {
        reset()
      }, 500)
    }
  }
})
</script>

<style scoped></style>
