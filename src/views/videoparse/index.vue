<template>
  <a-row>
    <a-col :xs="24" :md="8"></a-col>
    <a-col :xs="24" :md="8">
      <a-textarea
        class="mt-2"
        v-model:value="form.s"
        placeholder="请输入分享链接或视频短连接"
        :rows="5"
      />

      <div class="text-center mt-2">
        <a-button type="primary" size="small" @click="doParseVideo">解析</a-button>
      </div>

      <div class="my-2 text-xs">
        <div v-for="p in platforms" :key="p.name">
          <div class="my-2">
            <span class="font-bold">{{ p.name }}: </span>
            <span>{{ p.types }}</span>
          </div>
        </div>
      </div>

      <div class="mt-8">
        <!-- 图片 -->
        <div v-if="data.type == 1">
          <div v-for="item in data.urls" :key="item" class="my-2">
            <a-input :value="item" disabled>
              <template #addonBefore>图片</template>
              <template #addonAfter>
                <span @click="copy(item)" class="cursor-pointer">复制</span>
                |
                <a-tooltip>
                  <template #title>
                    <a-image :width="200" :src="item" />
                  </template>
                  <span class="cursor-pointer">预览</span>
                </a-tooltip>
              </template>
            </a-input>
          </div>
        </div>

        <!-- 视频 -->
        <div v-if="data.type == 2">
          <a-input v-model:value="data.urls[0]" disabled>
            <template #addonBefore>视频</template>
            <template #addonAfter>
              <span @click="copy(data.urls[0])" class="cursor-pointer">复制</span>
              |
              <span @click="openUrl(data.urls[0], true)" class="cursor-pointer"> 播放 </span>
            </template>
          </a-input>
        </div>
      </div>
    </a-col>
  </a-row>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import type { VideoParseRequest, VideoParseResponse } from '@/api/videoparse/model'
import { videoParse } from '@/api/videoparse/videooarse'
import { message } from 'ant-design-vue'
import { copy, openUrl } from '@/util/util'

const platforms = [
  { name: '抖音', types: '视频 / 图文' },
  { name: '快手', types: '视频 / 图文' },
  { name: '哔哩哔哩', types: 'bv视频' }
]

const form = reactive<VideoParseRequest>({
  s: ''
})

const data = ref<VideoParseResponse>({
  type: 3,
  nickname: '',
  title: '',
  cover: '',
  urls: []
})

const resetData = () => {
  data.value = {
    type: 3,
    nickname: '',
    title: '',
    cover: '',
    urls: []
  }
}

const doParseVideo = () => {
  if (!form.s) {
    message.warn('请输入分享链接或视频短连接')
    return
  }

  resetData()

  videoParse(form).then((res) => {
    Object.assign(data.value, res.data)
  })
}
</script>

<style scoped></style>