<template>
  <a-tabs
    v-model:activeKey="activeKey"
    size="small"
    type="editable-card"
    @change="handleTabChange"
    @edit="onEdit"
  >
    <a-tab-pane v-for="tab in tabs" :key="tab.key" :tab="tab.title" :closable="tab.closable">
      <slot name="tab-content" :tabKey="tab.key"></slot>
    </a-tab-pane>
  </a-tabs>

  <a-modal
    v-model:open="newTabModalOpen"
    title="请填写标签栏名称"
    ok-text="确认"
    cancel-text="取消"
    @ok="add"
  >
    <a-input v-model:value="newTabName" />
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'

interface Tab {
  key: string
  title: string
  closable: boolean
}

const tabs = ref<Tab[]>([{ key: 'default默认', title: '默认', closable: false }])
const activeKey = ref(tabs.value[0].key)
const newTabModalOpen = ref<boolean>(false)
const newTabName = ref<string>('')

const handleTabChange = (key: string) => {
  activeKey.value = key
}

const onEdit = (targetKey: string | MouseEvent, action: string) => {
  if (action === 'add') {
    newTabModalOpen.value = true
  } else {
    remove(targetKey as string)
  }
}

const add = () => {
  if (!newTabName.value) {
    message.warn('请填写标签栏名称')
    return
  }
  tabs.value.push({ key: newTabName.value, title: newTabName.value, closable: true })
  newTabModalOpen.value = false
  activeKey.value = newTabName.value
  newTabName.value = ''
}

const remove = (targetKey: string) => {
  let lastIndex = 0
  tabs.value.forEach((pane, i) => {
    if (pane.key === targetKey) {
      lastIndex = i - 1
    }
  })
  tabs.value = tabs.value.filter((pane) => pane.key !== targetKey)
  if (tabs.value.length && activeKey.value === targetKey) {
    if (lastIndex >= 0) {
      activeKey.value = tabs.value[lastIndex].key
    } else {
      activeKey.value = tabs.value[0].key
    }
  }
}
</script>

<style scoped></style>